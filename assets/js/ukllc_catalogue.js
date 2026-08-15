/* ukllc_catalogue.js
 * Fully client-side: no Python build step, no pre-generated datasets.json.
 * On page load this:
 *   1. Fetches the File 2 Documentation Master spreadsheet (.xlsx) and
 *      parses it with SheetJS (https://sheetjs.com).
 *   2. Fetches the Data Dictionary JSON export (the same one
 *      data_dictionary.js uses on the Search page).
 *   3. Links each dataset to the variables that list it, by normalising
 *      file names (case, whitespace, extension).
 *   4. Renders an expandable-row catalogue table with basket integration.
 *
 * Configure the two source paths as data-attributes on the page's own
 * wrapper element (deliberately NOT an inline <script> block — some CSP
 * setups silently block inline scripts while still allowing external
 * <script src>, which is why a previous version of this page failed with
 * "UKLLC_XLSX_URL is not set"; plain HTML attributes sidestep that):
 *   <div class="page-ukllc-catalogue"
 *        data-xlsx-url="..."
 *        data-dictionary-url="...">
 *
 * Preview pages with no web server can instead set these globals directly
 * (see preview_standalone.html), which take priority over the attributes:
 *   window.UKLLC_XLSX_INLINE_BASE64  -> base64 of the .xlsx file
 *   window.UKLLC_DICTIONARY_INLINE   -> the dictionary JSON as a JS array
 */
(function () {
  "use strict";

  // Columns we pull from the spreadsheet. Keys are our output field names;
  // values are how the header text starts in row 5 of the sheet (matched
  // with startsWith so trailing spaces/typos in the header don't break it).
  const FIELD_MAP = {
    file_name: "2. Dataset File Name",
    doc_name: "3. Dataset Name for Documentation",
    long_description: "4.  Long Description",
    short_description: "5. Short Description",
    collection_start: "10a. Timepoint: Collection Start",
    collection_end: "10b. Timepoint: Collection End",
    n_included: "12. Number of Participants Included",
    keywords: "14. Keywords",
    sensitivity: "15. Sensitivity",
    documentation_link: "16. Link To Key Dataset Documentation",
  };

  let allDatasets = [];
  let filtered = [];
  let currentPage = 1;
  let pageSize = 30;
  let expandedKeys = new Set();
  let openVariableSearch = {};
  let variableSortState = {}; // file_name -> { key: 'variable_name'|'variable_label'|'topic'|'year_of_collection', dir: 1|-1 }

  // ── Basket cache ───────────────────────────────────────────────────────
  // Same pattern as data_dictionary.js: one localStorage read per render via
  // the shared loadBasket() (from basket_header.js, already loaded site-wide
  // by the layout), O(1) lookups per row after that.
  let _basketCache = new Set();
  function refreshBasketCache() {
    _basketCache = new Set(loadBasket().map((item) => item.varName));
  }
  function inBasketFast(varName) {
    return _basketCache.has(varName);
  }

  function el(id) {
    return document.getElementById(id);
  }

  // ── Link targets ──────────────────────────────────────────────────────
  // Variable metadata page: matches the convention data_dictionary.js and
  // basket_header.js both use (no ".html"). Note: baskets.js's basket table
  // appends ".html" to the same base URL — that's an inconsistency in the
  // existing site, not something introduced here; worth checking which one
  // actually resolves before relying on it.
  const VARIABLE_METADATA_BASE_URL = "https://rmjdish.github.io/OWL/assets/variable_metadata/";

  // Category / "Browse by Category" pages, e.g.:
  //   https://rmjdish.github.io/OWL/docs/search_methods/browse_by_category/cat_pages/Blood_biochemistry_2011.html
  // Reverse-engineered from that one confirmed example as:
  //   <slug>_<CAT code>.html
  // where <slug> is the dataset's documentation name with only the first
  // word capitalised (rest lowercase, spaces -> underscores), and <CAT code>
  // is the numeric code embedded in the dataset file name (…_CAT-2011_…).
  // This is inferred from a single example, not confirmed for every
  // category — if a link 404s for a dataset whose file name has no CAT-code
  // segment, or whose real page uses different capitalisation, that's this
  // heuristic breaking down; a full slug list from the site would let this
  // be a direct lookup instead of a guess.
  const CATEGORY_PAGE_BASE_URL = "/OWL/docs/search_methods/browse_by_category/cat_pages";

  function variableMetadataUrl(varName) {
    return VARIABLE_METADATA_BASE_URL + encodeURIComponent(varName);
  }

  function toCategorySlug(label) {
    const words = String(label || "").trim().split(/\s+/).filter(Boolean);
    return words
      .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
      .join("_");
  }

  function categoryPageUrl(v, dataset) {
    const label = (dataset && dataset.doc_name) || lastSubtopic(v) || v.topic || "";
    const slug = toCategorySlug(label);
    const catMatch = dataset && dataset.file_name ? String(dataset.file_name).match(/CAT-(\d+)/i) : null;
    const suffix = catMatch ? "_" + catMatch[1] : "";
    return CATEGORY_PAGE_BASE_URL + "/" + slug + suffix + ".html";
  }

  // Deepest non-empty subtopic (falls back up the chain to Topic itself if
  // every subtopic level is blank), for the compact column display.
  function lastSubtopic(v) {
    const chain = [v.subtopic_4, v.subtopic_3, v.subtopic_2, v.subtopic_1, v.topic];
    return chain.find((x) => x && String(x).trim()) || "";
  }

  function normalise(name) {
    if (!name) return "";
    return String(name)
      .trim()
      .replace(/\.(csv|sav|dta|tsv|xlsx?)$/i, "")
      .toLowerCase();
  }

  // ── Config resolution ────────────────────────────────────────────────
  // Reads data-xlsx-url / data-dictionary-url off .page-ukllc-catalogue.
  // Throws a clear, specific error rather than letting a missing value
  // reach fetch() as undefined (which is what produced the cryptic
  // "e[0] is undefined" crash inside ucl-consent-blocker.js previously).
  function resolveUrl(datasetKey, attrName) {
    const container = document.querySelector(".page-ukllc-catalogue");
    const raw = container && container.dataset[datasetKey];
    if (!raw || !raw.trim()) {
      throw new Error(
        attrName + ' is not set on <div class="page-ukllc-catalogue"> (got ' + JSON.stringify(raw) + "). " +
        "Check the front-matter-rendered value in the page's HTML source."
      );
    }
    // Resolve to a fully-qualified absolute URL. A root-relative path like
    // "/OWL/assets/..." is valid on its own, but some fetch-wrapping
    // scripts (cookie consent blockers etc.) handle relative paths poorly —
    // passing an absolute URL sidesteps that.
    return new URL(raw, window.location.origin).href;
  }

  // ---------- Loading & linking ----------

  function base64ToWorkbookRows(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const wb = XLSX.read(bytes, { type: "array", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
  }

  function loadWorkbook(url) {
    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Could not fetch spreadsheet (HTTP " + r.status + ")");
        return r.arrayBuffer();
      })
      .then((buf) => {
        const wb = XLSX.read(buf, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
      });
  }

  function parseDatasets(rows) {
    const headerRowIdx = rows.findIndex(
      (row) => row && row.some((c) => c && String(c).trim().startsWith(FIELD_MAP.file_name))
    );
    if (headerRowIdx === -1) {
      throw new Error('Could not find the header row ("2. Dataset File Name") in the spreadsheet.');
    }
    const headers = rows[headerRowIdx].map((c) => (c ? String(c).trim() : ""));
    const colIdx = {};
    Object.keys(FIELD_MAP).forEach((key) => {
      const target = FIELD_MAP[key];
      colIdx[key] = headers.findIndex((h) => h.startsWith(target));
    });

    const datasets = [];
    // +2 to skip the header row itself and the instructions row beneath it
    for (let i = headerRowIdx + 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const fileName = colIdx.file_name >= 0 ? row[colIdx.file_name] : null;
      if (!fileName || !String(fileName).trim()) continue;

      const entry = { variables: [] };
      Object.keys(FIELD_MAP).forEach((key) => {
        const idx = colIdx[key];
        entry[key] = idx >= 0 ? row[idx] : null;
      });
      entry._key = normalise(entry.file_name);
      datasets.push(entry);
    }
    return datasets;
  }

  function linkVariables(datasets, variables) {
    const byKey = new Map(datasets.map((d) => [d._key, d]));
    const unmatched = new Map(); // dataset name referenced by a variable but absent from the spreadsheet

    variables.forEach((v) => {
      const raw = (v["UKLLC Dataset Name(s)"] || "").trim();
      if (!raw) return;
      raw.split(",").forEach((rawName) => {
        const name = rawName.trim();
        if (!name) return;
        const key = normalise(name);
        const target = byKey.get(key);
        const record = {
          variable_name: v["NSHD Variable Name"],
          variable_label: v["Variable Label"],
          showcase_field_id: v["Showcase Field ID"],
          topic: v["Topic"],
          subtopic_1: v["Subtopic 1"],
          subtopic_2: v["Subtopic 2"],
          subtopic_3: v["Subtopic 3"],
          subtopic_4: v["Subtopic 4"],
          form: v["Form"],
          year_of_collection: v["Year of collection"],
        };
        if (target) {
          target.variables.push(record);
        } else {
          if (!unmatched.has(name)) unmatched.set(name, new Set());
          unmatched.get(name).add(v["NSHD Variable Name"]);
        }
      });
    });

    datasets.forEach((d) => {
      d.variable_count = d.variables.length;
    });

    return unmatched;
  }

  function logQaReport(datasets, unmatched) {
    const zeroVar = datasets.filter((d) => d.variable_count === 0).map((d) => d.file_name);
    if (zeroVar.length) {
      console.warn("[UKLLC Catalogue] Datasets with no variables linked:", zeroVar);
    }
    if (unmatched.size) {
      const detail = {};
      unmatched.forEach((vars, name) => (detail[name] = Array.from(vars).slice(0, 3)));
      console.warn(
        "[UKLLC Catalogue] Dataset names referenced in the dictionary but not found in the spreadsheet " +
          "(check for typos or mismatched version/date suffixes):",
        detail
      );
    }
  }

  // ---------- Boot ----------

  function init() {
    let xlsxRowsPromise, variablesPromise;
    try {
      xlsxRowsPromise = window.UKLLC_XLSX_INLINE_BASE64
        ? Promise.resolve(base64ToWorkbookRows(window.UKLLC_XLSX_INLINE_BASE64))
        : loadWorkbook(resolveUrl("xlsxUrl", "data-xlsx-url"));

      variablesPromise = window.UKLLC_DICTIONARY_INLINE
        ? Promise.resolve(window.UKLLC_DICTIONARY_INLINE)
        : fetch(resolveUrl("dictionaryUrl", "data-dictionary-url")).then((r) => {
            if (!r.ok) throw new Error("Could not fetch dictionary JSON (HTTP " + r.status + ")");
            return r.json();
          });
    } catch (err) {
      el("loadingScreen").innerHTML = "<div>" + err.message + "</div>";
      console.error(err);
      return;
    }

    Promise.all([xlsxRowsPromise, variablesPromise])
      .then(([xlsxRows, variables]) => {
        const datasets = parseDatasets(xlsxRows);
        const unmatched = linkVariables(datasets, variables);
        logQaReport(datasets, unmatched);
        datasets.forEach((d) => delete d._key);

        allDatasets = datasets;
        filtered = datasets;
        el("loadingScreen").style.display = "none";
        el("dataUI").style.display = "block";
        bindControls();
        render();
      })
      .catch((err) => {
        el("loadingScreen").innerHTML =
          "<div>Could not build the catalogue (" +
          err.message +
          "). Check the data-xlsx-url / data-dictionary-url attributes on .page-ukllc-catalogue, and open the console for details.</div>";
        console.error(err);
      });
  }

  // ---------- Rendering ----------

  function bindControls() {
    el("globalSearch").addEventListener("input", (e) => applySearch(e.target.value));
    el("pageSize").addEventListener("change", (e) => {
      pageSize = parseInt(e.target.value, 10);
      currentPage = 1;
      render();
    });
    el("resetFiltersBtn").addEventListener("click", () => {
      el("globalSearch").value = "";
      filtered = allDatasets;
      currentPage = 1;
      render();
    });
    el("downloadCsvBtn").addEventListener("click", downloadCsv);
  }

  function applySearch(term) {
    term = term.trim().toLowerCase();
    if (!term) {
      filtered = allDatasets;
    } else {
      filtered = allDatasets.filter((d) => {
        const haystack = [d.file_name, d.doc_name, d.long_description, d.short_description, d.keywords]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (haystack.includes(term)) return true;
        return (d.variables || []).some(
          (v) =>
            (v.variable_name || "").toLowerCase().includes(term) ||
            (v.variable_label || "").toLowerCase().includes(term)
        );
      });
    }
    currentPage = 1;
    render();
  }

  function render() {
    // Load basket ONCE per render, same as renderTable() in data_dictionary.js
    refreshBasketCache();

    const start = (currentPage - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);

    el("resultsCount").textContent =
      filtered.length + " dataset" + (filtered.length === 1 ? "" : "s") + " (of " + allDatasets.length + ")";

    const tbody = el("catalogue-body");
    tbody.innerHTML = "";

    pageRows.forEach((d) => {
      tbody.appendChild(buildDatasetRow(d));
      if (expandedKeys.has(d.file_name)) {
        tbody.appendChild(buildVariablePanelRow(d));
      }
    });

    renderPagination();
  }

  function buildDatasetRow(d) {
    const tr = document.createElement("tr");
    tr.className = "dataset-row" + (expandedKeys.has(d.file_name) ? " is-open" : "");
    tr.dataset.key = d.file_name;

    const isOpen = expandedKeys.has(d.file_name);
    const count = d.variable_count || 0;

    tr.innerHTML =
      '<td class="col-expand"><button class="expand-btn" aria-expanded="' +
      isOpen +
      '" aria-label="Toggle variable list">' +
      (isOpen ? "&#9662;" : "&#9656;") +
      "</button></td>" +
      '<td class="col-docname" title="' + escapeAttr(d.file_name) + '">' + escapeHtml(d.doc_name || "") + "</td>" +
      '<td class="col-desc">' + escapeHtml(d.long_description || "") + "</td>" +
      '<td class="col-vars">' +
      '<button class="var-count-badge' + (count === 0 ? " is-empty" : "") + '">' +
      count + (count === 1 ? " variable" : " variables") +
      "</button></td>";

    tr.querySelector(".expand-btn").addEventListener("click", () => toggleRow(d.file_name));
    tr.querySelector(".var-count-badge").addEventListener("click", () => toggleRow(d.file_name));

    return tr;
  }

  function toggleRow(key) {
    if (expandedKeys.has(key)) expandedKeys.delete(key);
    else expandedKeys.add(key);
    render();
  }

  function buildVariablePanelRow(d) {
    const tr = document.createElement("tr");
    tr.className = "variable-panel-row";
    const td = document.createElement("td");
    td.colSpan = 4; // matches the outer table's 4 columns (expand, name, description, variables)

    if (!d.variables || d.variables.length === 0) {
      td.innerHTML =
        '<div class="variable-panel empty-state">No variables in the Data Dictionary currently list this file. ' +
        "If this dataset was recently deposited it may not be indexed yet — check the dataset name matches exactly (including version/date) in both sources. See the browser console for a full mismatch report.</div>";
      tr.appendChild(td);
      return tr;
    }

    const searchVal = openVariableSearch[d.file_name] || "";
    let vars = d.variables;
    if (searchVal) {
      const t = searchVal.toLowerCase();
      vars = vars.filter(
        (v) =>
          (v.variable_name || "").toLowerCase().includes(t) ||
          (v.variable_label || "").toLowerCase().includes(t) ||
          (v.topic || "").toLowerCase().includes(t)
      );
    }
    const sortState = variableSortState[d.file_name];
    vars = sortVars(vars, sortState);

    const allInBasket = vars.length > 0 && vars.every((v) => inBasketFast(v.variable_name));

    const rowsHtml = vars
      .map((v) => {
        const checked = v.variable_name && inBasketFast(v.variable_name);
        const varUrl = variableMetadataUrl(v.variable_name || "");
        const catUrl = categoryPageUrl(v, d);
        const lastTopic = lastSubtopic(v);
        const fullPath = topicPath(v);
        return (
          "<tr>" +
          '<td class="col-check"><input type="checkbox" class="row-select" ' +
          'data-var-name="' + escapeAttr(v.variable_name || "") + '" ' +
          'data-label="' + escapeAttr(v.variable_label || "") + '" ' +
          'aria-label="Add variable" ' +
          (checked ? "checked" : "") + "></td>" +
          "<td><a class=\"var-link\" href=\"" + escapeAttr(varUrl) + "\" target=\"_blank\" rel=\"noopener\"><code>" +
          escapeHtml(v.variable_name || "") + "</code></a></td>" +
          "<td>" + escapeHtml(v.variable_label || "") + "</td>" +
          '<td class="var-topic" title="' + escapeAttr(fullPath) + '">' +
          '<a class="topic-link" href="' + escapeAttr(catUrl) + '" target="_blank" rel="noopener">' +
          escapeHtml(lastTopic) + "</a></td>" +
          "<td>" + escapeHtml(v.year_of_collection || "") + "</td>" +
          "</tr>"
        );
      })
      .join("");

    function sortHeader(label, key) {
      const active = sortState && sortState.key === key;
      const arrow = active ? (sortState.dir === 1 ? "&#9650;" : "&#9660;") : "&#8645;";
      return (
        '<th class="sortable-header" data-sort-key="' + key + '">' +
        '<span class="header-label">' + label + "</span>" +
        '<span class="sort-icon' + (active ? " is-active" : "") + '">' + arrow + "</span>" +
        "</th>"
      );
    }

    td.innerHTML =
      '<div class="variable-panel">' +
      '<div class="variable-panel-toolbar">' +
      "<strong>" + d.variables.length + " variable" + (d.variables.length === 1 ? "" : "s") + " in this file</strong>" +
      '<input class="variable-search" type="text" placeholder="Filter these variables…" value="' +
      escapeHtml(searchVal) +
      '" />' +
      '<button class="add-all-variables-btn' + (allInBasket ? " remove-mode" : "") + '">' +
      (allInBasket ? "Remove all from basket" : "Add all to basket") +
      "</button>" +
      '<button class="var-download-btn" type="button">Download variable list (CSV)</button>' +
      "</div>" +
      '<table class="variable-table"><thead><tr><th>Add variable</th>' +
      sortHeader("Variable Name", "variable_name") +
      sortHeader("Variable Label", "variable_label") +
      sortHeader("Topic", "topic") +
      sortHeader("Year", "year_of_collection") +
      "</tr></thead>" +
      "<tbody>" + (rowsHtml || '<tr><td colspan="5" class="empty-state">No variables match that filter.</td></tr>') + "</tbody></table>" +
      "</div>";

    tr.appendChild(td);

    // ── Column sorting ───────────────────────────────────────────────────
    td.querySelectorAll(".sortable-header").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sortKey;
        const current = variableSortState[d.file_name];
        const dir = current && current.key === key ? current.dir * -1 : 1;
        variableSortState[d.file_name] = { key, dir };
        render();
      });
    });

    // ── Individual basket checkboxes ────────────────────────────────────
    // data-var-name + data-label match the convention refreshBasketCheckboxesUI()
    // in basket_header.js already recognises, so these also stay in sync when
    // a variable is added/removed from the Data Dictionary page or elsewhere.
    td.querySelectorAll(".row-select").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const varName = e.target.dataset.varName;
        const label = e.target.dataset.label || "";
        if (!varName) return;
        if (e.target.checked) {
          addToBasket(varName, label);
        } else {
          removeFromBasket(varName);
        }
        refreshBasketCache();
        render();
      });
    });

    // ── Per-dataset "add all / remove all" ──────────────────────────────
    td.querySelector(".add-all-variables-btn").addEventListener("click", () => {
      const varNames = vars.map((v) => v.variable_name).filter(Boolean);
      if (allInBasket) {
        batchRemoveFromBasket(varNames);
      } else {
        const items = vars
          .filter((v) => v.variable_name)
          .map((v) => ({ varName: v.variable_name, label: v.variable_label || "" }));
        batchAddToBasket(items);
      }
      refreshBasketCache();
      render();
    });

    const input = td.querySelector(".variable-search");
    input.addEventListener("input", (e) => {
      openVariableSearch[d.file_name] = e.target.value;
      render();
      const again = document.querySelector(
        '.dataset-row[data-key="' + cssEscape(d.file_name) + '"] + .variable-panel-row .variable-search'
      );
      if (again) {
        again.focus();
        again.setSelectionRange(again.value.length, again.value.length);
      }
    });

    td.querySelector(".var-download-btn").addEventListener("click", (e) => {
      e.preventDefault();
      downloadVariablesCsv(d);
    });

    return tr;
  }

  function topicPath(v) {
    return [v.topic, v.subtopic_1, v.subtopic_2, v.subtopic_3, v.subtopic_4].filter(Boolean).join(" > ");
  }

  function sortVars(vars, sortState) {
    if (!sortState || !sortState.key) return vars;
    const { key, dir } = sortState;
    const valueOf = (v) => (key === "topic" ? lastSubtopic(v) : v[key]) || "";
    return vars.slice().sort((a, b) => {
      const av = String(valueOf(a)).toLowerCase();
      const bv = String(valueOf(b)).toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const html =
      '<button ' + (currentPage <= 1 ? "disabled" : "") + ' id="prevPage">Prev</button>' +
      " Page " + currentPage + " of " + totalPages + " " +
      '<button ' + (currentPage >= totalPages ? "disabled" : "") + ' id="nextPage">Next</button>';
    el("paginationTop").innerHTML = html;
    el("paginationBottom").innerHTML = html;

    document.querySelectorAll("#prevPage").forEach((b) =>
      b.addEventListener("click", () => {
        currentPage = Math.max(1, currentPage - 1);
        render();
      })
    );
    document.querySelectorAll("#nextPage").forEach((b) =>
      b.addEventListener("click", () => {
        currentPage = Math.min(totalPages, currentPage + 1);
        render();
      })
    );
  }

  function downloadCsv() {
    // Keeps Dataset File Name in the export even though it's now only shown
    // as a hover tooltip in the table itself — still useful metadata once downloaded.
    const header = ["Dataset File Name", "Dataset Name", "Dataset Description", "Variable Count"];
    const lines = [header.join(",")].concat(
      filtered.map((d) => [d.file_name, d.doc_name, d.long_description, d.variable_count].map(csvCell).join(","))
    );
    triggerDownload(lines.join("\n"), "ukllc_catalogue.csv");
  }

  function downloadVariablesCsv(d) {
    const header = ["Variable Name", "Variable Label", "Topic", "Year of Collection"];
    const lines = [header.join(",")].concat(
      (d.variables || []).map((v) => [v.variable_name, v.variable_label, topicPath(v), v.year_of_collection].map(csvCell).join(","))
    );
    triggerDownload(lines.join("\n"), d.file_name.replace(/\.[^.]+$/, "") + "_variables.csv");
  }

  function csvCell(val) {
    val = val === null || val === undefined ? "" : String(val);
    if (/[",\n]/.test(val)) val = '"' + val.replace(/"/g, '""') + '"';
    return val;
  }

  function triggerDownload(text, filename) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  function cssEscape(str) {
    return String(str).replace(/["\\]/g, "\\$&");
  }

  document.addEventListener("DOMContentLoaded", init);

  // ── Keep in sync with basket changes made elsewhere ─────────────────────
  window.addEventListener("nshd-basket-changed", () => {
    if (!allDatasets.length) return; // catalogue hasn't finished loading yet
    refreshBasketCache();
    render();
  });
})();