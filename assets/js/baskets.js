window.addEventListener("load", function () {

  let basketPage = 1;
  let basketPageSize = 10;

  let basketSortColumn = null;
  let basketSortDirection = "asc";

  // Path to the full OWL data dictionary, published as a static JSON asset.
  // Update this if the file is hosted somewhere else on the site.
  const DATA_DICTIONARY_URL = "/OWL/assets/data/NSHD_Data_Dictionary_Public.json";

  // CDN build of ExcelJS, used to produce a real, styled .xlsx client-side.
  const EXCELJS_CDN_URL = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";

  // Cached in memory after first fetch/load so repeat downloads are instant.
  let dictionaryCache = null;
  let exceljsLoadPromise = null;

  // Column widths taken from the original Data Dictionary workbook
  // (character-width units, same scale openpyxl/Excel use).
  const COLUMN_WIDTHS = {
    "NSHD Library File": 15,
    "Topic": 19.5,
    "Subtopic 1": 19.5,
    "Subtopic 2": 19.5,
    "Subtopic 3": 19.5,
    "Subtopic 4": 19.5,
    "NSHD Variable Name": 15.43,
    "Showcase Field ID": 15.43,
    "UKLLC Dataset Name(s)": 18.14,
    "Variable Label": 55,
    "Value labels": 34,
    "Units": 13.57,
    "Form": 20,
    "Question Number": 13.57,
    "Year of collection": 12.57,
    "Is variable derived?": 12.57,
    "Is variable sensitive?": 12.57,
    "Reason variable is sensitive": 15.14,
    "Notes": 34.7,
    "Request variable": 16,
    "Variable Role": 26,
    "Researcher's Notes": 34
  };

  // Header fill colours taken from the original workbook, grouped by
  // column meaning. New "Request variable" column gets its own colour
  // so it stands out as the added field.
  const HEADER_FILLS = {
    "NSHD Library File": "FFF7C6D0",
    "Topic": "FFC0C0C0",
    "Subtopic 1": "FFC0C0C0",
    "Subtopic 2": "FFC0C0C0",
    "Subtopic 3": "FFC0C0C0",
    "Subtopic 4": "FFC0C0C0",
    "NSHD Variable Name": "FFC1E1C1",
    "Showcase Field ID": "FFC1E1C1",
    "UKLLC Dataset Name(s)": "FFC1E1C1",
    "Variable Label": "FFADD8E6",
    "Value labels": "FFADD8E6",
    "Units": "FFADD8E6",
    "Form": "FFADD8E6",
    "Question Number": "FFADD8E6",
    "Year of collection": "FFADD8E6",
    "Is variable derived?": "FFADD8E6",
    "Is variable sensitive?": "FFADD8E6",
    "Reason variable is sensitive": "FFADD8E6",
    "Notes": "FFADD8E6",
    "Request variable": "FFFFD966",
    "Variable Role": "FFD9CEF5",
    "Researcher's Notes": "FFD9CEF5"
  };

  // Fixed set of options offered in the Role dropdown on export.
  const ROLE_OPTIONS = ["Exposure", "Outcome", "Covariate", "Other"];

  function sortBasketData(data) {
    if (!basketSortColumn) return data;

    return data.slice().sort((a, b) => {
      let valA = a[basketSortColumn] || "";
      let valB = b[basketSortColumn] || "";

      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();

      if (valA < valB) return basketSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return basketSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  const pageSizeSelect = document.getElementById("basketPageSize");
  if (pageSizeSelect) {
    pageSizeSelect.value = basketPageSize;
    pageSizeSelect.addEventListener("change", function (e) {
      basketPageSize = Number(e.target.value);
      basketPage = 1;
      renderBasket();
      renderBasketPagination();
      updateBasketResultsCount();
    });
  }

  // ── Toggles the "over 500 variables" banner on the basket page ─────
  // Called any time the basket's contents might have changed, so the
  // warning stays in sync with the actual count at all times.
  function updateBasketLimitWarning() {
    const basket = loadBasket();
    const warningEl = document.getElementById("basketLimitWarning");
    if (!warningEl) return;
    warningEl.classList.toggle("show", basket.length > 500);
  }

  function updateBasketResultsCount() {
    const basket = loadBasket();
    const total = basket.length;

    const start = (basketPage - 1) * basketPageSize;
    const end = Math.min(start + basketPageSize, total);

    document.getElementById("basketResultsCount").textContent =
      `Showing ${total === 0 ? 0 : start + 1}-${end} of ${total} results`;
  }

  function renderBasketPagination() {
    const basket = loadBasket();
    const totalPages = Math.ceil(basket.length / basketPageSize) || 1;

    const html = `
      <button ${basketPage === 1 ? "disabled" : ""} onclick="changeBasketPage(-1)">Prev</button>
      <span>Page ${basketPage} of ${totalPages}</span>
      <button ${basketPage === totalPages ? "disabled" : ""} onclick="changeBasketPage(1)">Next</button>
    `;

    document.getElementById("basketPaginationTop").innerHTML = html;
    document.getElementById("basketPaginationBottom").innerHTML = html;
  }

  window.changeBasketPage = function (delta) {
    basketPage += delta;
    renderBasket();
    renderBasketPagination();
    updateBasketResultsCount();
  };

  function renderBasket() {
    let basket = loadBasket();
    basket = sortBasketData(basket);

    const tbody = document.querySelector("#basketTable tbody");
    const countEl = document.getElementById("basketCountPage");

    tbody.innerHTML = "";
    countEl.textContent = basket.length;

    updateBasketLimitWarning();

    const start = (basketPage - 1) * basketPageSize;
    const end = start + basketPageSize;

    basket.slice(start, end).forEach(function (item) {
      const tr = document.createElement("tr");

      // ============================================================
      // ⭐ REMOVE BUTTON — now uses global removeFromBasket()
      // ============================================================
      const tdRemove = document.createElement("td");
      const btn = document.createElement("button");
      btn.textContent = "Remove";

      btn.addEventListener("click", function () {

        // ⭐ Use global remove function (this triggers shake animation)
        removeFromBasket(item.varName);

        // Recalculate pagination if needed
        const b = loadBasket();
        const maxPage = Math.ceil(b.length / basketPageSize) || 1;
        if (basketPage > maxPage) basketPage = maxPage;

        // Refresh UI
        renderBasket();
        renderBasketPagination();
        updateBasketResultsCount();

        // ⭐ Ensure glow + shake + count update runs
        updateBasketCountUI();
      });

      tdRemove.appendChild(btn);
      tr.appendChild(tdRemove);

	// ⭐ Variable name as link to metadata page
	const tdName = document.createElement("td");
	const link = document.createElement("a");

	link.textContent = item.varName;
	link.href = `https://rmjdish.github.io/OWL/assets/variable_metadata/${item.varName}.html`;
	link.target = "_blank";  // optional: open in new tab

	tdName.appendChild(link);
	tr.appendChild(tdName);

      // Label
      const tdLabel = document.createElement("td");
      tdLabel.textContent = item.label || "";
      tr.appendChild(tdLabel);

      tbody.appendChild(tr);
    });

    renderBasketPagination();
    updateBasketResultsCount();
  }

  function clearBasket() {
    const confirmed = confirm("Are you sure you want to clear your basket?");
    if (!confirmed) return;

    saveBasket([]);
    basketPage = 1;
    renderBasket();
    renderBasketPagination();
    updateBasketResultsCount();
    updateBasketCountUI();
    updateBasketLimitWarning();
  }

  // ── Lazy-load ExcelJS from CDN, only when a download or upload is requested ──
  function loadExcelJS() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (exceljsLoadPromise) return exceljsLoadPromise;

    exceljsLoadPromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = EXCELJS_CDN_URL;
      script.onload = function () {
        if (window.ExcelJS) resolve(window.ExcelJS);
        else reject(new Error("ExcelJS failed to initialise after loading."));
      };
      script.onerror = function () {
        reject(new Error("Failed to load ExcelJS from CDN."));
      };
      document.head.appendChild(script);
    });

    return exceljsLoadPromise;
  }

  // ── Load the full data dictionary (cached after first fetch) ───────
  async function loadDataDictionary() {
    if (dictionaryCache) return dictionaryCache;
    const resp = await fetch(DATA_DICTIONARY_URL);
    if (!resp.ok) {
      throw new Error(`Failed to fetch data dictionary: ${resp.status}`);
    }
    dictionaryCache = await resp.json();
    return dictionaryCache;
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Ask the user where to save, up front, before any slow work ────
  // ── (fetching the dictionary, building the workbook). Browsers    ─
  // ── only allow showSaveFilePicker within a few seconds of the     ─
  // ── actual click — asking for it after several seconds of async   ─
  // ── work causes it to silently fail and fall back to a plain      ─
  // ── download, which is why the picker seemed to "disappear".      ─
  // ── Returns { handle } on success, { cancelled: true } if the     ─
  // ── user closed the dialog, or { handle: null } if unsupported.   ─
  async function requestSaveHandle(suggestedName) {
    if (!window.showSaveFilePicker) {
      return { handle: null };
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: suggestedName,
        types: [
          {
            description: "Excel Workbook",
            accept: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
            }
          }
        ]
      });
      return { handle };
    } catch (err) {
      if (err && err.name === "AbortError") {
        return { cancelled: true };
      }
      console.warn("showSaveFilePicker unavailable, will fall back to a standard download:", err);
      return { handle: null };
    }
  }

  // ── Write the finished blob to an already-obtained file handle,  ──
  // ── or fall back to a normal browser download if none was given. ──
  async function writeBlobToHandle(blob, handle, suggestedName) {
    if (handle) {
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }
    triggerBlobDownload(blob, suggestedName);
  }

  // ── Build and download the full Data Dictionary as .xlsx, with a ──
  // ── "Request variable" column: Y for basket variables, blank for ──
  // ── every other row. Formatting mirrors the original workbook.   ──
  async function downloadBasketCSV() {
    const basket = loadBasket();
    if (!basket.length) {
      alert("Basket is empty");
      return;
    }

    // ── Reminder at the point of download: Condor only accepts 500 ──
    // ── variables per upload, so anything over that must be split  ──
    // ── into batches manually after this file downloads. Shown as  ──
    // ── a confirm() so the user can back out and trim the basket   ──
    // ── first instead, if they'd rather do that before downloading.──
    if (basket.length > 500) {
      const proceed = confirm(
        `Your basket has ${basket.length} variables. Condor only accepts uploads of 500 variables or fewer at a time.\n\n` +
        `After this downloads, split it into groups of 500 (or fewer) before uploading each group to Condor separately. ` +
        `Continue with the download?`
      );
      if (!proceed) return;
    }

    const suggestedName = "NSHD_Data_Dictionary_Saved.xlsx";

    // Ask where to save FIRST, while the click's user activation is
    // still fresh — before any fetching or workbook building begins.
    const saveTarget = await requestSaveHandle(suggestedName);
    if (saveTarget.cancelled) {
      // User closed the save dialog — nothing more to do.
      return;
    }

    const downloadBtn = document.getElementById("downloadBasketCsvBtn");
    const originalBtnText = downloadBtn ? downloadBtn.textContent : null;
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.textContent = "Preparing download…";
    }

    try {
      const [ExcelJS, dictionary] = await Promise.all([
        loadExcelJS(),
        loadDataDictionary()
      ]);

      const requestedByName = new Map(basket.map(item => [item.varName, item]));

      const baseColumns = dictionary.length
        ? Object.keys(dictionary[0])
        : ["NSHD Variable Name", "Variable Label"];
      const columns = baseColumns.concat(["Request variable", "Variable Role", "Researcher's Notes"]);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Data_dictionary", {
        views: [{ state: "frozen", ySplit: 1 }]
      });

      // Dropdown column shows its actual options directly in the header
      // text (on a second line) so they're visible at a glance, without
      // needing to click into a cell or hover a comment to find them.
      const ROLE_HEADER_TEXT = "Variable Role \u25BE\n(" + ROLE_OPTIONS.join(" / ") + ")";
      sheet.columns = columns.map(function (colName) {
        const displayHeader = colName === "Variable Role" ? ROLE_HEADER_TEXT : colName;
        return { header: displayHeader, key: colName, width: COLUMN_WIDTHS[colName] || 18 };
      });

      // ── Column-level highlight for the Request variable column: ────
      // ── bold, centered, filled for every row (header keeps its own ─
      // ── distinct colour below, since cell-level style wins there). ─
      const reqColIndex = columns.indexOf("Request variable") + 1;
      const reqColumn = sheet.getColumn(reqColIndex);
      reqColumn.font = { bold: true };
      reqColumn.alignment = { horizontal: "center", vertical: "middle" };
      reqColumn.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF2CC" }
      };

      // ── Role column: dropdown list, applied to the whole data range ─
      // ── in one call rather than per-cell (fast even at 28k+ rows). ──
      const roleColIndex = columns.indexOf("Variable Role") + 1;
      const roleColLetter = sheet.getColumn(roleColIndex).letter;
      sheet.dataValidations.add(
        `${roleColLetter}2:${roleColLetter}${dictionary.length + 1}`,
        {
          type: "list",
          allowBlank: true,
          formulae: [`"${ROLE_OPTIONS.join(",")}"`],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid role",
          error: `Please choose a value from the list: ${ROLE_OPTIONS.join(", ")}.`
        }
      );

      // ── Header row styling, matching the original workbook ──────────
      const headerRow = sheet.getRow(1);
      headerRow.height = 56;
      columns.forEach(function (colName, idx) {
        const cell = headerRow.getCell(idx + 1);
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "bottom", wrapText: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: HEADER_FILLS[colName] || "FFD9D9D9" }
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };

        if (colName === "Variable Role") {
          cell.note = {
            texts: [{
              text: `Optional — fill in yourself. Choose how this variable is used in your analysis: ${ROLE_OPTIONS.join(", ")}.`
            }]
          };
        } else if (colName === "Researcher's Notes") {
          cell.note = {
            texts: [{
              text: "Optional — fill in yourself. Add any free-text notes about how you plan to use this variable."
            }]
          };
        }
      });

      // ── Data rows: every dictionary row, Request variable = Y only ──
      // ── for basket matches, blank for everything else.             ──
      dictionary.forEach(function (dictRow) {
        const rowValues = {};
        baseColumns.forEach(function (col) {
          rowValues[col] = dictRow[col];
        });
        const matchedItem = requestedByName.get(dictRow["NSHD Variable Name"]);
        rowValues["Request variable"] = matchedItem ? "Y" : "";
        rowValues["Variable Role"] = matchedItem ? (matchedItem.role || "") : "";
        rowValues["Researcher's Notes"] = matchedItem ? (matchedItem.note || "") : "";
        sheet.addRow(rowValues);
      });

      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: dictionary.length + 1, column: columns.length }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      await writeBlobToHandle(blob, saveTarget.handle, suggestedName);

      const savedName = (saveTarget.handle && saveTarget.handle.name) || suggestedName;
      if (saveTarget.handle) {
        alert(`Done! "${savedName}" has been saved to the location you chose.`);
      } else {
        alert(`Done! "${savedName}" has been downloaded — check your browser's downloads bar or your default Downloads folder.`);
      }
    } catch (err) {
      console.error("Could not build the full data dictionary export:", err);
      alert("Something went wrong preparing your download. Please try again.");
    } finally {
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = originalBtnText;
      }
    }
  }

  // ================================================================
  // ── UPLOAD BASKET ────────────────────────────────────────────────
  // Restore a previous basket from either:
  //  (a) a basket file downloaded earlier from OWL (the full Data
  //      Dictionary .xlsx, with "Request variable" = Y for saved items), or
  //  (b) a plain CSV with NSHD Variable Name (+ optional label) columns.
  // Auto-detected by file extension and by whether a "Request variable"
  // column is present. Nothing is written to the basket until the user
  // reviews the preview list and clicks "Confirm & Add to Basket".
  // OWL itself has no hard basket-size limit — unlike downloadBasketCSV(),
  // this only *warns* if the resulting basket would exceed Condor's
  // 500-variable upload limit; it never blocks adding here.
  // ================================================================

  const CONDOR_BASKET_LIMIT = 500;
  const NAME_COL = "nshd variable name";
  const REQUEST_COL = "request variable";
  const LABEL_COL_CANDIDATES = ["variable label", "variable_label", "label"];

  let uploadParsedItems = []; // { name, label, isNew }
  let uploadLinkedSiblings = []; // [{ varName, label }, ...] — computed per file, before confirm

  function normCell(v) {
    return (v === null || v === undefined) ? "" : String(v).trim();
  }

  function findColIndex(headerRow, targetLower) {
    for (let i = 0; i < headerRow.length; i++) {
      if (normCell(headerRow[i]).toLowerCase() === targetLower) return i;
    }
    return -1;
  }

  function findFirstColIndex(headerRow, candidatesLower) {
    for (const c of candidatesLower) {
      const idx = findColIndex(headerRow, c);
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function showUploadProgress(pct, label, indeterminate) {
    const container = document.getElementById("uploadProgressContainer");
    const fill = document.getElementById("uploadProgressFill");
    const labelEl = document.getElementById("uploadProgressLabel");
    container.style.display = "block";
    labelEl.style.display = "block";
    labelEl.textContent = label;
    if (indeterminate) {
      fill.classList.add("indeterminate");
      fill.textContent = "";
    } else {
      fill.classList.remove("indeterminate");
      fill.style.width = pct + "%";
      fill.textContent = pct + "%";
    }
  }

  function hideUploadProgress() {
    document.getElementById("uploadProgressContainer").style.display = "none";
    document.getElementById("uploadProgressLabel").style.display = "none";
    const fill = document.getElementById("uploadProgressFill");
    fill.classList.remove("indeterminate");
    fill.style.width = "0%";
    fill.textContent = "0%";
  }

  function resetUploadPanel() {
    document.getElementById("uploadStatus").textContent = "";
    document.getElementById("uploadMissingNameBox").style.display = "none";
    document.getElementById("uploadInvalidValueBox").style.display = "none";
    document.getElementById("uploadDuplicateBox").style.display = "none";
    document.getElementById("uploadLimitWarningBox").style.display = "none";
    document.getElementById("uploadPreview").style.display = "none";
    document.getElementById("uploadDone").innerHTML = "";
    uploadLinkedSiblings = [];
    const linkedRow = document.getElementById("uploadIncludeLinkedRow");
    if (linkedRow) linkedRow.style.display = "none";
  }

  function closeUploadPanel() {
    document.getElementById("uploadBasketPanel").style.display = "none";
    const fileInput = document.getElementById("uploadBasketFile");
    if (fileInput) fileInput.value = "";
    uploadParsedItems = [];
    resetUploadPanel();
    hideUploadProgress();
  }

  function handleUploadFile(file, uploadBtn) {
    resetUploadPanel();
    document.getElementById("uploadBasketPanel").style.display = "block";
    uploadBtn.disabled = true;
    showUploadProgress(0, "Reading file... 0%", false);

    const isCsv = /\.csv$/i.test(file.name);
    const reader = new FileReader();

    reader.onprogress = function (e) {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        showUploadProgress(pct, "Reading file... " + pct + "%", false);
      }
    };

    reader.onerror = function () {
      hideUploadProgress();
      document.getElementById("uploadStatus").textContent = "Could not read the file.";
      uploadBtn.disabled = false;
    };

    reader.onload = function (e) {
      showUploadProgress(100, "Parsing file, please wait...", true);
      setTimeout(function () {
        if (isCsv) {
          parseUploadCsv(e.target.result, uploadBtn);
        } else {
          parseUploadXlsx(e.target.result, uploadBtn);
        }
      }, 30);
    };

    if (isCsv) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  function parseUploadCsv(text, uploadBtn) {
    const rows = text.split(/\r?\n/)
      .filter(l => l.trim() !== "")
      .map(l => l.split(",").map(c => c.replace(/^"|"$/g, "").trim()));
    processUploadRows(rows, uploadBtn);
  }

  async function parseUploadXlsx(arrayBuffer, uploadBtn) {
    function fail(msg) {
      hideUploadProgress();
      document.getElementById("uploadStatus").textContent = msg;
      uploadBtn.disabled = false;
    }

    let ExcelJS;
    try {
      ExcelJS = await loadExcelJS();
    } catch (err) {
      fail("Could not load the spreadsheet reader. Check your connection and try again.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(arrayBuffer);
    } catch (err) {
      fail("Could not parse this file as a spreadsheet.");
      return;
    }

    const sheet = workbook.getWorksheet("Data_dictionary") || workbook.worksheets[0];
    if (!sheet) {
      fail("No sheet found in this spreadsheet.");
      return;
    }

    const rows = [];
    sheet.eachRow({ includeEmpty: false }, function (row) {
      const values = row.values.slice(1); // ExcelJS rows are 1-indexed; drop the leading undefined
      rows.push(values.map(function (v) {
        if (v === null || v === undefined) return "";
        if (typeof v === "object" && v.text !== undefined) return v.text; // rich text cells
        return v;
      }));
    });

    if (rows.length < 2) {
      fail("No data rows found in the spreadsheet.");
      return;
    }

    processUploadRows(rows, uploadBtn);
  }

  function renderUploadLinkedOption(count) {
    let row = document.getElementById("uploadIncludeLinkedRow");
    if (count === 0) {
      if (row) row.style.display = "none";
      return;
    }
    if (!row) {
      row = document.createElement("label");
      row.id = "uploadIncludeLinkedRow";
      Object.assign(row.style, {
        display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px",
        background: "#F3E5F5", borderRadius: "6px", fontSize: "13px",
        margin: "10px 0", cursor: "pointer"
      });
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = "uploadIncludeLinkedCheckbox";
      input.checked = true;
      const text = document.createElement("span");
      text.id = "uploadIncludeLinkedLabel";
      row.appendChild(input);
      row.appendChild(text);

      const previewBody = document.getElementById("uploadPreviewBody");
      const table = previewBody ? previewBody.closest("table") : null;
      if (table && table.parentNode) {
        table.parentNode.insertBefore(row, table);
      } else {
        document.getElementById("uploadPreview").insertBefore(row, document.getElementById("uploadPreview").firstChild);
      }
    }
    row.style.display = "flex";
    document.getElementById("uploadIncludeLinkedLabel").textContent =
      `Also include ${count} linked sweep${count === 1 ? "" : "s"} of longitudinal variables in this file`;
  }

  function processUploadRows(rows, uploadBtn) {
    function fail(msg) {
      hideUploadProgress();
      document.getElementById("uploadStatus").textContent = msg;
      uploadBtn.disabled = false;
    }

    const headerRow = rows[0];
    const nameIdx = findColIndex(headerRow, NAME_COL);
    const labelIdx = findFirstColIndex(headerRow, LABEL_COL_CANDIDATES);
    const reqIdx = findColIndex(headerRow, REQUEST_COL);

    if (nameIdx === -1) {
      fail('Could not find a "NSHD Variable Name" column. Check the column headers in the file.');
      return;
    }

    const requireY = reqIdx !== -1;
    const existingBasket = loadBasket();
    const existingSet = new Set(existingBasket.map(item => item.varName));

    uploadParsedItems = [];
    let previewRows = "";
    const invalidRequestValues = [];
    const missingNameRows = [];
    const duplicateNames = [];
    const seen = new Set();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const name = normCell(row[nameIdx]);
      const reqVal = requireY ? normCell(row[reqIdx]) : "";

      if (requireY) {
        if (reqVal === "") continue; // not requested, skip silently
        if (reqVal !== "Y") {
          invalidRequestValues.push({ row: i + 1, name: name, value: reqVal });
          continue;
        }
        if (name === "") {
          missingNameRows.push(i + 1);
          continue;
        }
      } else {
        if (name === "") continue; // blank row in a plain basket file, skip silently
      }

      if (seen.has(name)) {
        duplicateNames.push(name);
        continue;
      }
      seen.add(name);

      const label = labelIdx !== -1 ? normCell(row[labelIdx]) : "";
      const isNew = !existingSet.has(name);
      uploadParsedItems.push({ name: name, label: label, isNew: isNew });

      previewRows += "<tr><td>" + uploadParsedItems.length + "</td><td>" + name + "</td><td>" + label + "</td>" +
        '<td class="' + (isNew ? 'status-new">New' : 'status-existing">Already in basket') + "</td></tr>";
    }

    if (missingNameRows.length > 0) {
      document.getElementById("uploadMissingNameSummary").textContent =
        missingNameRows.length + " row(s) marked Y have no NSHD Variable Name (skipped):";
      document.getElementById("uploadMissingNameDetail").textContent =
        "Rows: " + missingNameRows.slice(0, 50).join(", ") +
        (missingNameRows.length > 50 ? ", ...and " + (missingNameRows.length - 50) + " more" : "");
      document.getElementById("uploadMissingNameBox").style.display = "block";
    }

    if (invalidRequestValues.length > 0) {
      document.getElementById("uploadInvalidValueSummary").textContent =
        invalidRequestValues.length + ' variable(s) have something other than Y in "Request variable" (skipped):';
      const list = invalidRequestValues.slice(0, 50).map(function (r) {
        return (r.name !== "" ? r.name : "row " + r.row + " (no name)") + " \u2192 \"" + r.value + "\"";
      });
      document.getElementById("uploadInvalidValueDetail").textContent =
        list.join(", ") + (invalidRequestValues.length > 50 ? ", ...and " + (invalidRequestValues.length - 50) + " more" : "");
      document.getElementById("uploadInvalidValueBox").style.display = "block";
    }

    if (duplicateNames.length > 0) {
      document.getElementById("uploadDuplicateSummary").textContent =
        duplicateNames.length + " duplicate variable name(s) in the file were skipped after the first occurrence:";
      document.getElementById("uploadDuplicateDetail").textContent =
        duplicateNames.slice(0, 50).join(", ") +
        (duplicateNames.length > 50 ? ", ...and " + (duplicateNames.length - 50) + " more" : "");
      document.getElementById("uploadDuplicateBox").style.display = "block";
    }

    hideUploadProgress();
    uploadBtn.disabled = false;

    if (uploadParsedItems.length === 0) {
      document.getElementById("uploadStatus").textContent = requireY
        ? 'No valid rows marked "Y" with a variable name were found.'
        : "No variable names were found in this file.";
      return;
    }

    const newCount = uploadParsedItems.filter(v => v.isNew).length;
    const projectedTotal = existingBasket.length + newCount;

    // Non-blocking: OWL itself has no hard basket-size limit. This is
    // purely a heads-up that Condor will reject anything over 500 when
    // this basket is eventually uploaded there.
    if (projectedTotal > CONDOR_BASKET_LIMIT) {
      document.getElementById("uploadLimitSummary").textContent =
        "Heads up: adding these would bring your basket to " + projectedTotal + " variables.";
      document.getElementById("uploadLimitDetail").textContent =
        "That's fine here on OWL, but Condor only accepts baskets of " + CONDOR_BASKET_LIMIT +
        " variables or fewer per upload. You can still add these now, and split the basket into batches of " +
        CONDOR_BASKET_LIMIT + " when you come to upload it to Condor.";
      document.getElementById("uploadLimitWarningBox").style.display = "block";
    }

    document.getElementById("uploadVarCount").textContent = uploadParsedItems.length;
    document.getElementById("uploadNewCount").textContent = newCount;
    document.getElementById("uploadAlreadyCount").textContent = uploadParsedItems.length - newCount;
    document.getElementById("uploadCurrentCount").textContent = existingBasket.length;
    document.getElementById("uploadPreviewBody").innerHTML = previewRows;

    uploadLinkedSiblings = [];
    renderUploadLinkedOption(0);
    document.getElementById("uploadPreview").style.display = "block";

    const previewItems = uploadParsedItems.map(v => ({ varName: v.name, label: v.label }));
    expandBasketItemsWithSiblings(previewItems).then(function (siblings) {
      uploadLinkedSiblings = siblings;
      renderUploadLinkedOption(siblings.length);
    });
  }

  const uploadBtn = document.getElementById("uploadBasketBtn");
  const uploadFileInput = document.getElementById("uploadBasketFile");

  if (uploadBtn && uploadFileInput) {
    uploadBtn.addEventListener("click", function () {
      document.getElementById("uploadBasketPanel").style.display = "block";
      resetUploadPanel();
      uploadFileInput.click();
    });

    uploadFileInput.addEventListener("change", function () {
      if (uploadFileInput.files[0]) {
        handleUploadFile(uploadFileInput.files[0], uploadBtn);
      }
    });
  }

  const confirmUploadBtn = document.getElementById("confirmUploadBtn");
  if (confirmUploadBtn) {
    confirmUploadBtn.addEventListener("click", function () {
      if (uploadParsedItems.length === 0) return;

      const items = uploadParsedItems.map(v => ({ varName: v.name, label: v.label }));
      const includeLinkedEl = document.getElementById("uploadIncludeLinkedCheckbox");
      const includeLinked = includeLinkedEl ? includeLinkedEl.checked : false;
      const finalItems = includeLinked ? items.concat(uploadLinkedSiblings) : items;

      // expandSiblings: false — we've already decided inclusion above via the checkbox
      const addedNames = batchAddToBasket(finalItems, { expandSiblings: false });

      document.getElementById("uploadPreview").style.display = "none";
      document.getElementById("uploadDone").innerHTML =
        "<b>" + addedNames.length + " new variable(s) added to your basket.</b> Your basket now has " +
        loadBasket().length + " variable(s).";

      uploadParsedItems = [];
      uploadLinkedSiblings = [];
      if (uploadFileInput) uploadFileInput.value = "";

      basketPage = 1;
      renderBasket();
      renderBasketPagination();
      updateBasketResultsCount();
      updateBasketCountUI();
      updateBasketLimitWarning();
    });
  }

  const cancelUploadBtn = document.getElementById("cancelUploadBtn");
  if (cancelUploadBtn) {
    cancelUploadBtn.addEventListener("click", closeUploadPanel);
  }

  document.getElementById("clearBasketBtn").addEventListener("click", clearBasket);
  document.getElementById("downloadBasketCsvBtn").addEventListener("click", downloadBasketCSV);

  document.querySelectorAll("th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-sort");

      if (basketSortColumn === col) {
        basketSortDirection = basketSortDirection === "asc" ? "desc" : "asc";
      } else {
        basketSortColumn = col;
        basketSortDirection = "asc";
      }

      document.querySelectorAll("th[data-sort]").forEach(h => {
        h.classList.remove("asc", "desc");
      });
      th.classList.add(basketSortDirection);

      renderBasket();
      renderBasketPagination();
      updateBasketResultsCount();
    });
  });

  renderBasket();
  updateBasketLimitWarning();

  // ── Keep the visible list in sync with async basket changes ─────────────
  // The Remove button above calls renderBasket() synchronously right after
  // removeFromBasket() — but sibling removal (when Sync linked sweeps is
  // on) happens asynchronously afterward, once the dictionary lookup in
  // basket_header.js resolves. That's why the toast and header counter
  // updated correctly (they're driven directly by that same async code)
  // while this page's own table kept showing rows that were already gone
  // from storage. This listener re-renders once that async step lands,
  // for removals, additions (e.g. an upload's linked-sweeps expansion),
  // or a toast's Undo — any of which can change the basket after this
  // page's own handlers have already finished running.
  window.addEventListener("nshd-basket-changed", () => {
    const b = loadBasket();
    const maxPage = Math.ceil(b.length / basketPageSize) || 1;
    if (basketPage > maxPage) basketPage = maxPage;
    renderBasket();
    renderBasketPagination();
    updateBasketResultsCount();
  });

});