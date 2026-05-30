// ============================================================
// NSHD Data Dictionary – Search, Filters, Table, Basket
// Production‑ready, cleaned, single‑source JS
// ============================================================

// BASKET_KEY is defined globally in basket_header.js

let rawData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 15;
let sortColumn = null;
let sortDirection = 1; // 1 = asc, -1 = desc
let currentSearch = ""; // 🔹 track current text search
let searchDebounce;

const filterColumns = [
  "Topic",
  "Subtopic 1",
  "Subtopic 2",
  "Subtopic 3",
  "Subtopic 4"
];

let tableColumns = [];

// ============================================================
// Data load
// ============================================================

fetch("NSHD_Data_Dictionary_Public.json")
  .then(r => r.json())
  .then(data => {
    rawData = data;
    filteredData = [...rawData];

    // Drop first 5 metadata fields, then remove Order
    tableColumns = Object.keys(rawData[0]).slice(5).filter(col => col !== "Order");

    buildFilters();
    buildTableHeader();
    applyFilters(); // 🔹 initial filter + search pass

    // Hide loading, show UI
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("dataUI").style.display = "block";

    updateBasketCountUI(); // global glow logic now runs
  });

// ============================================================
// Filters
// ============================================================

function buildFilters() {
  const bar = document.getElementById("filter-bar");
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
  const activeFilters = {};
  document.querySelectorAll("#filter-bar select").forEach(sel => {
    if (sel.value !== "") activeFilters[sel.dataset.column] = sel.value;
  });

  // 1) Apply dropdown filters to rawData
  let base = rawData.filter(row =>
    Object.entries(activeFilters).every(([col, val]) => row[col] === val)
  );

  // 2) Apply current text search on top of filtered subset
  const q = currentSearch.toLowerCase().trim();
  if (q !== "") {
    base = base.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(q))
    );
  }

  filteredData = base;

  currentPage = 1;
  renderTable();
  renderPagination();
  updateResultsCount();
}

function updateAllFilters() {
  const rows = filteredData;

  filterColumns.forEach(col => {
    const select = document.querySelector(`#filter-bar select[data-column="${col}"]`);
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

  filteredData.sort((a, b) => {
    const valA = a[sortColumn] ?? "";
    const valB = b[sortColumn] ?? "";

    if (!isNaN(valA) && !isNaN(valB)) {
      return (Number(valA) - Number(valB)) * sortDirection;
    }

    return String(valA).localeCompare(String(valB)) * sortDirection;
  });
}

function updateSortIcons() {
  document.querySelectorAll("#table-header th").forEach(th => {
    const labelEl = th.querySelector(".header-label");
    const icon = th.querySelector(".sort-icon");
    if (!labelEl || !icon) return;

    const label = labelEl.textContent;

    if (label === sortColumn) {
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
  applyFilters();      // 🔹 re-run filters + search together
  // updateAllFilters();  // 🔹 keep dropdown options in sync with current subset

  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    updateAllFilters();   // ⭐ update filters AFTER user stops typing
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
  document.querySelectorAll("#filter-bar select").forEach(sel => {
    sel.value = "";
  });

  document.getElementById("globalSearch").value = "";
  currentSearch = ""; // 🔹 clear search state

  filteredData = [...rawData];
  currentPage = 1;

  updateAllFilters();
  renderTable();
  renderPagination();
  updateResultsCount();
}

// ============================================================
// Table header (with checkbox column)
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
    tableColumns.map((_, i) => `<col class="col-${i + 1}">`).join("");
  table.prepend(colgroup);

  // Checkbox header
  const thSelect = document.createElement("th");
  thSelect.classList.add("select-header");
  thSelect.innerHTML = `
    <div class="th-inner">
      <span class="header-label">Add variable</span>
    </div>
  `;
  headerRow.appendChild(thSelect); // ⭐ FIXED duplicate append

  // Sortable headers
  tableColumns.forEach(col => {
    const th = document.createElement("th");
    th.classList.add("sortable-header");

    th.innerHTML = `
      <div class="th-inner">
        <span class="header-label">${col}</span>
        <span class="sort-icon">⇅</span>
      </div>
    `;

    th.addEventListener("click", () => {
      if (sortColumn === col) {
        sortDirection *= -1;
      } else {
        sortColumn = col;
        sortDirection = 1;
      }

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
    return varName && isInBasket(varName);
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
	btn.style.color = "";
	btn.disabled = true;
  } else if (allVisibleRowsSelected()) {
	btn.textContent = "Remove all visible variables";
	btn.classList.add("remove-mode");
	btn.style.color = "";
	btn.disabled = false;
  } else {
	btn.textContent = "Add all visible variables";
	btn.classList.remove("remove-mode");
	btn.style.color = "";
	btn.disabled = false;
  }
}


// ============================================================
// Render table
// ============================================================

function renderTable() {
  sortData();
  const body = document.getElementById("table-body");
  body.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  filteredData.slice(start, end).forEach(row => {
    const tr = document.createElement("tr");

    // Checkbox cell
    const tdSelect = document.createElement("td");
    tdSelect.classList.add("select-cell");
    const varName = row["NSHD Variable Name"];
    const label = (row["Variable Label"] || "").toString();
    const checked = varName && isInBasket(varName);

    tdSelect.innerHTML = `
      <input type="checkbox" class="row-select"
             data-var-name="${varName || ""}"
             data-label="${label.replace(/"/g, "&quot;")}"
             ${checked ? "checked" : ""}>
    `;
    tr.appendChild(tdSelect);

    // Data cells
    tableColumns.forEach(col => {
      const td = document.createElement("td");
      const value = row[col] ?? "";

      if (col === "Showcase Field ID" && value !== "") {
        td.innerHTML = `
          <a href="https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=${value}"
             target="_blank"
             class="field-link">
             ${value}
          </a>
        `;
      } else if (col === "NSHD Variable Name" && value !== "") {
        td.innerHTML = `
          <a href="https://rmjdish.github.io/OWL/docs/variable_metadata/${value}"
             target="_blank"
             class="field-link">
             ${value}
          </a>
        `;
      } else {
        td.textContent = value;
      }

      tr.appendChild(td);
    });

    body.appendChild(tr);
  });

  // ⭐ ensure glow updates after add/remove
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

      updateBasketCountUI(); // ⭐ global glow logic
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
  link.download = "NSHD_Data_Dictionary_filtered_results.csv";
  link.click();

  URL.revokeObjectURL(url);
}

document.getElementById("downloadCsvBtn")
  .addEventListener("click", downloadFilteredCSV);
  

// ============================================================
// Add/Remove All Visible Rows
// ============================================================

document.getElementById("addAllBtn").addEventListener("click", () => {
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const visibleRows = filteredData.slice(start, end);

  if (allVisibleRowsSelected()) {
    // ⭐ REMOVE ALL VISIBLE
    visibleRows.forEach(row => {
      const varName = row["NSHD Variable Name"];
      if (varName) removeFromBasket(varName);
    });
  } else {
    // ⭐ ADD ALL VISIBLE
    visibleRows.forEach(row => {
      const varName = row["NSHD Variable Name"];
      const label = row["Variable Label"] || "";
      if (varName) addToBasket(varName, label);
    });
  }

  updateBasketCountUI();
  renderTable(); // refresh checkboxes + button label
});