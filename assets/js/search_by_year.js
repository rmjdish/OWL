// ============================================================
// NSHD Search by Year of Data Collection – Search, Filters,
// Table, Basket. Mirrors data_dictionary.js patterns.
// ============================================================

// BASKET_KEY, loadBasket, addToBasket, removeFromBasket,
// batchAddToBasket, batchRemoveFromBasket, updateBasketCountUI
// are all defined globally in basket_header.js — reused as-is.

// ============================================================
// CONFIG — CONFIRM THESE AGAINST YOUR ACTUAL JSON KEYS
// ============================================================

const YEAR_FIELD = "Year of collection";      // raw year/range field, e.g. "2006-10"
const FORM_FIELD = "Form";

// Rows are identified as Women's health by their Form value, not by
// year alone — the study spans 1993-2005 and its 1999 rows would
// otherwise look identical to the general 1999 sweep. Confirm this
// matches your actual Form text (case-insensitive substring match).
const WOMENS_HEALTH_FORM_KEYWORDS = ["women's health", "womens health"];

// Columns shown in the table, in this exact order.
// type: "varlink" | "fieldlink" | "text" | "yearbadge"
const COLUMNS_CONFIG = [
  { key: "NSHD Variable Name", label: "Variable name",   type: "varlink" },
  { key: "Showcase Field ID",  label: "Field ID",        type: "fieldlink" },
  { key: "Variable Label",     label: "Label",           type: "text" },
  { key: "Units",              label: "Units",           type: "text" },
  { key: "Form",               label: "Form",            type: "text" },
  { key: "Question Number",    label: "Question number", type: "text" },
  { key: YEAR_FIELD,           label: "Year",            type: "yearbadge" }
];

// Same 5-level topic hierarchy as the Search Data Dictionary page.
const filterColumns = [
  "Topic",
  "Subtopic 1",
  "Subtopic 2",
  "Subtopic 3",
  "Subtopic 4"
];

// Every pill on the year bar. Women's health is identified by Form
// text (it spans many actual collection years, 1993-2005), so it's
// checked first — any row matching it is claimed before the general
// age-based waves below get a chance to match on year alone.
const WAVE_DEFINITIONS = [
  { id: "whs", label1: "1993–2005", label2: "Women's health", formIncludes: WOMENS_HEALTH_FORM_KEYWORDS, color: "wave-womens" },
  { id: "1946",      label1: "1946",     label2: "Birth",     ranges: [{ start: 1946, end: 1946 }] },
  { id: "1950",      label1: "1950",     label2: "Age 4",     ranges: [{ start: 1950, end: 1950 }] },
  { id: "1957",      label1: "1957",     label2: "Age 11",    ranges: [{ start: 1957, end: 1957 }] },
  { id: "1972",      label1: "1972",     label2: "Age 26",    ranges: [{ start: 1972, end: 1972 }] },
  { id: "1989",      label1: "1989",     label2: "Age 43",    ranges: [{ start: 1989, end: 1989 }] },
  {
    id: "1999", label1: "1999", label2: "General survey",
    ranges: [{ start: 1999, end: 1999 }],
    formExcludes: WOMENS_HEALTH_FORM_KEYWORDS
  },
  { id: "2006-10",   label1: "2006–10",  label2: "Age 60–64", ranges: [{ start: 2006, end: 2010 }] },
  { id: "insight46", label1: "2015–21",  label2: "Insight46", ranges: [{ start: 2015, end: 2018 }, { start: 2018, end: 2021 }], color: "wave-insight" },
  { id: "myofit",    label1: "2020–25",  label2: "MyoFit",    ranges: [{ start: 2020, end: 2025 }], color: "wave-myofit" },
  { id: "covid",     label1: "2020–21",  label2: "Covid",     ranges: [{ start: 2020, end: 2021 }], color: "wave-covid" },
  { id: "2025",      label1: "2025",     label2: "Age 79",    ranges: [{ start: 2025, end: 2025 }] }
];

// ============================================================
// State
// ============================================================

let rawData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 15;
let sortColumn = null;
let sortDirection = 1;
let currentSearch = "";
let searchDebounce;
let sortDirty = true;
let activeWaveId = "all";

let _basketCache = new Set();
function refreshBasketCache() {
  _basketCache = new Set(loadBasket().map(item => item.varName));
}
function inBasketFast(varName) {
  return _basketCache.has(varName);
}

// ============================================================
// Year normalisation + wave matching
// ============================================================

// Parses "2006", "2006-10", or "2006-2010" into { start, end }.
// A two-digit end year is expanded using the century of the start year.
function parseYearField(raw) {
  const s = String(raw || "").trim().replace(/–/g, "-");
  if (!s) return null;

  const parts = s.split("-").map(p => p.trim()).filter(Boolean);
  if (parts.length === 1) {
    const y = parseInt(parts[0], 10);
    return isNaN(y) ? null : { start: y, end: y };
  }

  const startY = parseInt(parts[0], 10);
  let endY;
  if (parts[1].length <= 2) {
    const century = Math.floor(startY / 100) * 100;
    endY = century + parseInt(parts[1], 10);
    if (endY < startY) endY += 100;
  } else {
    endY = parseInt(parts[1], 10);
  }

  if (isNaN(startY) || isNaN(endY)) return null;
  return { start: startY, end: endY };
}

function waveMatchesRow(wave, row) {
  // Form-based wave (e.g. Women's health) — matched purely on Form
  // text, regardless of which specific year that row was collected in.
  if (wave.formIncludes) {
    const formVal = String(row[FORM_FIELD] || "").toLowerCase();
    return wave.formIncludes.some(k => formVal.includes(k.toLowerCase()));
  }

  // Year-range-based wave — matched on the parsed year, with an
  // optional formExcludes safety net (e.g. keeping Women's health
  // rows out of the general 1999 pill even if checked out of order).
  const parsed = parseYearField(row[YEAR_FIELD]);
  if (!parsed) return false;

  const rangeMatch = wave.ranges.some(r => r.start === parsed.start && r.end === parsed.end);
  if (!rangeMatch) return false;

  if (wave.formExcludes) {
    const formVal = String(row[FORM_FIELD] || "").toLowerCase();
    if (wave.formExcludes.some(k => formVal.includes(k.toLowerCase()))) return false;
  }
  return true;
}

function getWaveForRow(row) {
  return WAVE_DEFINITIONS.find(w => waveMatchesRow(w, row)) || null;
}

// Debug helper — run logUniqueYears() in the browser console to see
// every raw value in YEAR_FIELD, so you can confirm WAVE_DEFINITIONS
// covers everything correctly.
function logUniqueYears() {
  const vals = [...new Set(rawData.map(r => r[YEAR_FIELD]).filter(Boolean))].sort();
  console.log("Unique raw year values:", vals);
}
window.logUniqueYears = logUniqueYears;

// ============================================================
// Data load
// ============================================================

fetch("/OWL/assets/data/NSHD_Data_Dictionary_Public.json")
  .then(r => r.json())
  .then(data => {
    rawData = data;
    filteredData = [...rawData];
    sortDirty = true;

    buildWaveBar();
    buildTopicFilters();
    buildTableHeader();
    applyFilters();

    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("dataUI").style.display = "block";

    updateBasketCountUI();
  });

// ============================================================
// Year pill bar
// ============================================================

function buildWaveBar() {
  const bar = document.getElementById("year-pill-bar");
  bar.innerHTML = "";

  const allPill = document.createElement("button");
  allPill.type = "button";
  allPill.className = "year-pill year-pill-all active";
  allPill.dataset.waveId = "all";
  allPill.innerHTML = `<span class="pill-line1">All</span>`;
  allPill.addEventListener("click", () => selectWave("all"));
  bar.appendChild(allPill);

  WAVE_DEFINITIONS.forEach(wave => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "year-pill" + (wave.color ? " " + wave.color : "");
    pill.dataset.waveId = wave.id;
    pill.innerHTML = `
      <span class="pill-line1">${wave.label1}</span>
      <span class="pill-line2">${wave.label2}</span>
    `;
    pill.addEventListener("click", () => selectWave(wave.id));
    bar.appendChild(pill);
  });
}

function selectWave(waveId) {
  activeWaveId = waveId;

  document.querySelectorAll(".year-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.waveId === waveId);
  });

  applyFilters();
  updateAllFilters();
}

// ============================================================
// Topic filters (5 levels, same pattern as Search Data Dictionary)
// ============================================================

function buildTopicFilters() {
  const bar = document.getElementById("topic-filter-bar");
  bar.innerHTML = "";

  filterColumns.forEach(col => {
    const select = document.createElement("select");
    select.dataset.column = col;
    select.innerHTML = `<option value="">${col}</option>`;

    const uniqueValues = [...new Set(rawData.map(r => r[col]).filter(v => v))];
    uniqueValues.forEach(v => {
      select.innerHTML += `<option value="${v}">${v}</option>`;
    });

    select.addEventListener("change", () => {
      applyFilters();
      updateAllFilters();
    });

    bar.appendChild(select);
  });
}

function applyFilters() {
  const activeTopicFilters = {};
  document.querySelectorAll("#topic-filter-bar select").forEach(sel => {
    if (sel.value !== "") activeTopicFilters[sel.dataset.column] = sel.value;
  });

  // 1) Filter by selected wave/year
  let base = rawData;
  if (activeWaveId !== "all") {
    const wave = WAVE_DEFINITIONS.find(w => w.id === activeWaveId);
    if (wave) base = base.filter(row => waveMatchesRow(wave, row));
  }

  // 2) Filter by topic levels
  base = base.filter(row =>
    Object.entries(activeTopicFilters).every(([col, val]) => row[col] === val)
  );

  // 3) Filter by search text
  const q = currentSearch.toLowerCase().trim();
  if (q !== "") {
    base = base.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(q))
    );
  }

  filteredData = base;
  sortDirty = true;
  currentPage = 1;

  renderTable();
  renderPagination();
  updateResultsCount();
}

// Recompute each topic dropdown's options from the currently
// wave-and-search-filtered subset, so filters cascade the same way
// as on the Search Data Dictionary page.
function updateAllFilters() {
  const rows = filteredData;

  filterColumns.forEach(col => {
    const select = document.querySelector(`#topic-filter-bar select[data-column="${col}"]`);
    const currentValue = select.value;

    const values = [...new Set(rows.map(r => r[col]).filter(v => v && v !== ""))].sort();

    select.innerHTML = `<option value="">${col}</option>`;
    values.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });

    if (values.includes(currentValue)) {
      select.value = currentValue;
    }
  });
}

// ============================================================
// Sorting
// ============================================================

function sortData() {
  if (!sortColumn) return;
  if (!sortDirty) return;

  filteredData.sort((a, b) => {
    const valA = a[sortColumn] ?? "";
    const valB = b[sortColumn] ?? "";

    if (!isNaN(valA) && !isNaN(valB) && valA !== "" && valB !== "") {
      return (Number(valA) - Number(valB)) * sortDirection;
    }
    return String(valA).localeCompare(String(valB)) * sortDirection;
  });

  sortDirty = false;
}

function updateSortIcons() {
  document.querySelectorAll("#table-header th").forEach(th => {
    const labelEl = th.querySelector(".header-label");
    const icon = th.querySelector(".sort-icon");
    if (!labelEl || !icon) return;

    if (th.dataset.key === sortColumn) {
      icon.textContent = sortDirection === 1 ? "▲" : "▼";
      icon.style.opacity = 1;
    } else {
      icon.textContent = "⇅";
      icon.style.opacity = 0.3;
    }
  });
}

// ============================================================
// Global search, page size, reset
// ============================================================

document.getElementById("globalSearch").addEventListener("input", e => {
  currentSearch = e.target.value || "";
  applyFilters();

  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    updateAllFilters();
  }, 300);
});

document.getElementById("pageSize").addEventListener("change", e => {
  pageSize = Number(e.target.value);
  currentPage = 1;
  renderTable();
  renderPagination();
  updateResultsCount();
});

document.getElementById("resetFiltersBtn").addEventListener("click", resetAllFilters);

function resetAllFilters() {
  document.querySelectorAll("#topic-filter-bar select").forEach(sel => {
    sel.value = "";
  });
  document.getElementById("globalSearch").value = "";
  currentSearch = "";

  activeWaveId = "all";
  document.querySelectorAll(".year-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.waveId === "all");
  });

  filteredData = [...rawData];
  sortDirty = true;
  currentPage = 1;

  updateAllFilters();
  renderTable();
  renderPagination();
  updateResultsCount();
}

// ============================================================
// Table header
// ============================================================

function buildTableHeader() {
  const headerRow = document.getElementById("table-header");
  headerRow.innerHTML = "";

  const table = document.getElementById("myTable");
  const existingColgroup = table.querySelector("colgroup");
  if (existingColgroup) existingColgroup.remove();

  const colgroup = document.createElement("colgroup");
  colgroup.innerHTML =
    `<col class="col-select">` +
    COLUMNS_CONFIG.map((_, i) => `<col class="col-${i + 1}">`).join("");
  table.prepend(colgroup);

  const thSelect = document.createElement("th");
  thSelect.classList.add("select-header");
  thSelect.innerHTML = `<div class="th-inner"><span class="header-label">Add variable</span></div>`;
  headerRow.appendChild(thSelect);

  COLUMNS_CONFIG.forEach(cfg => {
    const th = document.createElement("th");
    th.classList.add("sortable-header");
    th.dataset.key = cfg.key;

    th.innerHTML = `
      <div class="th-inner">
        <span class="header-label">${cfg.label}</span>
        <span class="sort-icon">⇅</span>
      </div>
    `;

    th.addEventListener("click", () => {
      if (sortColumn === cfg.key) {
        sortDirection *= -1;
      } else {
        sortColumn = cfg.key;
        sortDirection = 1;
      }
      sortDirty = true;
      updateSortIcons();
      currentPage = 1;
      renderTable();
      renderPagination();
    });

    headerRow.appendChild(th);
  });
}

// ============================================================
// Add/Remove All Helpers
// ============================================================

function allVisibleRowsSelected() {
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const visibleRows = filteredData.slice(start, end);
  if (visibleRows.length === 0) return false;

  return visibleRows.every(row => {
    const varName = row["NSHD Variable Name"];
    return varName && inBasketFast(varName);
  });
}

function updateAddAllButtonLabel() {
  const btn = document.getElementById("addAllBtn");
  if (!btn) return;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const visibleRows = filteredData.slice(start, end);

  if (visibleRows.length === 0) {
    btn.textContent = "No visible variables to add";
    btn.classList.remove("remove-mode");
    btn.disabled = true;
  } else if (allVisibleRowsSelected()) {
    btn.textContent = "Remove all visible variables";
    btn.classList.add("remove-mode");
    btn.disabled = false;
  } else {
    btn.textContent = "Add all visible variables";
    btn.classList.remove("remove-mode");
    btn.disabled = false;
  }
}

// ============================================================
// Render table
// ============================================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderYearBadge(row) {
  const rawVal = row[YEAR_FIELD] ?? "";
  const wave = getWaveForRow(row);
  const cls = wave && wave.color ? wave.color : "wave-general";
  return `<span class="year-badge ${cls}">${escapeHtml(rawVal)}</span>`;
}

function renderTable() {
  sortData();
  refreshBasketCache();

  const body = document.getElementById("table-body");
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const rowsHtml = filteredData.slice(start, end).map(row => {
    const varName = row["NSHD Variable Name"];
    const label = (row["Variable Label"] || "").toString();
    const checked = varName && inBasketFast(varName);

    const selectCell = `
      <td class="select-cell">
        <input type="checkbox" class="row-select"
               data-var-name="${varName || ""}"
               data-label="${label.replace(/"/g, "&quot;")}"
               ${checked ? "checked" : ""}>
      </td>
    `;

    const dataCells = COLUMNS_CONFIG.map(cfg => {
      const value = row[cfg.key] ?? "";

      if (cfg.type === "fieldlink" && value !== "" && value !== null) {
        return `<td><a href="https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=${value}" target="_blank" class="field-link">${value}</a></td>`;
      }
      if (cfg.type === "varlink" && value !== "") {
        return `<td><a href="https://rmjdish.github.io/OWL/assets/variable_metadata/${value}" target="_blank" class="field-link">${value}</a></td>`;
      }
      if (cfg.type === "yearbadge") {
        return `<td>${renderYearBadge(row)}</td>`;
      }
      return `<td>${escapeHtml(value)}</td>`;
    }).join("");

    return `<tr>${selectCell}${dataCells}</tr>`;
  }).join("");

  body.innerHTML = rowsHtml;

  document.querySelectorAll(".row-select").forEach(cb => {
    cb.addEventListener("change", e => {
      const varName = e.target.dataset.varName;
      const label = e.target.dataset.label || "";
      if (!varName) return;

      if (e.target.checked) {
        addToBasket(varName, label);
      } else {
        removeFromBasket(varName);
      }

      refreshBasketCache();
      updateBasketCountUI();
      updateAddAllButtonLabel();
    });
  });

  updateAddAllButtonLabel();
  document.getElementById("myTable").style.tableLayout = "fixed";
}

// ============================================================
// Pagination
// ============================================================

function renderPagination() {
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const top = document.getElementById("paginationTop");
  const bottom = document.getElementById("paginationBottom");

  const html = `
    <button ${currentPage === 1 ? "disabled" : ""} onclick="changePage(-1)">Prev</button>
    <span>Page ${currentPage} of ${totalPages}</span>
    <button ${currentPage === totalPages ? "disabled" : ""} onclick="changePage(1)">Next</button>
  `;

  top.innerHTML = html;
  bottom.innerHTML = html;
}

function changePage(delta) {
  currentPage += delta;
  renderTable();
  renderPagination();
  updateResultsCount();
}

// ============================================================
// Results counter
// ============================================================

function updateResultsCount() {
  const total = rawData.length;
  const filtered = filteredData.length;
  document.getElementById("resultsCount").textContent =
    `Showing ${filtered} of ${total} results`;
}

// ============================================================
// Download filtered CSV
// ============================================================

function downloadFilteredCSV() {
  if (!filteredData || filteredData.length === 0) {
    alert("No data to download");
    return;
  }

  const headers = Object.keys(filteredData[0]);
  let csvContent = headers.join(",") + "\n";

  filteredData.forEach(row => {
    const line = headers.map(h => {
      const value = row[h] ?? "";
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(",");
    csvContent += line + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "NSHD_Search_by_Year_filtered_results.csv";
  link.click();

  URL.revokeObjectURL(url);
}

document.getElementById("downloadCsvBtn").addEventListener("click", downloadFilteredCSV);

// ============================================================
// Add/Remove All Visible Rows
// ============================================================

document.getElementById("addAllBtn").addEventListener("click", () => {
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const visibleRows = filteredData.slice(start, end);

  if (allVisibleRowsSelected()) {
    const varNames = visibleRows.map(row => row["NSHD Variable Name"]).filter(Boolean);
    batchRemoveFromBasket(varNames);
  } else {
    const items = visibleRows
      .filter(row => row["NSHD Variable Name"])
      .map(row => ({
        varName: row["NSHD Variable Name"],
        label: row["Variable Label"] || ""
      }));
    batchAddToBasket(items);
  }

  refreshBasketCache();
  renderTable();
});

// ============================================================
// Nav highlight
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.nav-list-link.active').forEach(function (link) {
    if (link.textContent.trim() === 'Search by Year') {
      const item = link.closest('.nav-list-item');
      if (item) item.setAttribute('data-year-active', 'true');
    }
  });
});