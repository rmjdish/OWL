let rawData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 15;
let sortColumn = null;
let sortDirection = 1; // 1 = asc, -1 = desc

const filterColumns = [
  "Topic",
  "Subtopic 1",
  "Subtopic 2",
  "Subtopic 3",
  "Subtopic 4"
];

let tableColumns = [];

fetch("NSHD_Data_Dictionary_Public.json")
  .then(r => r.json())
  .then(data => {
    rawData = data;
    filteredData = [...rawData];

    tableColumns = Object.keys(rawData[0]).slice(5);
	// ⭐ REMOVE ORDER COLUMN
	tableColumns = tableColumns.filter(col => col !== "Order");

    buildFilters();
    buildTableHeader();
    applyFilters();

    // ⭐ NEW: hide loading screen, show UI
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("dataUI").style.display = "block";
  });

/* ---------------------------------------------------
   BUILD FILTERS
--------------------------------------------------- */
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

    // ⭐ NEW: cascading filters
    select.addEventListener("change", () => {
      applyFilters();
      updateAllFilters();
    });

    bar.appendChild(select);
  });
}

/* ---------------------------------------------------
   APPLY FILTERS
--------------------------------------------------- */
function applyFilters() {
  const activeFilters = {};
  document.querySelectorAll("#filter-bar select").forEach(sel => {
    if (sel.value !== "") activeFilters[sel.dataset.column] = sel.value;
  });

  filteredData = rawData.filter(row =>
    Object.entries(activeFilters).every(([col, val]) => row[col] === val)
  );

  currentPage = 1;
  renderTable();
  renderPagination();
  updateResultsCount();   // ⭐ NEW
}

/* ---------------------------------------------------
   UPDATE FILTER OPTIONS (CASCADING)
--------------------------------------------------- */
function updateAllFilters() {
  const rows = filteredData;

  filterColumns.forEach(col => {
    const select = document.querySelector(`#filter-bar select[data-column="${col}"]`);
    const currentValue = select.value;

    const values = [...new Set(rows.map(r => r[col]).filter(v => v && v !== ""))].sort();

    // Rebuild dropdown
    select.innerHTML = `<option value="">${col}</option>`;
    values.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });

    // Restore previously selected value if still valid
    if (values.includes(currentValue)) {
      select.value = currentValue;
    }
  });
}


/* ---------------------------------------------------
   SORTING LOGIC
--------------------------------------------------- */
function sortData() {
  if (!sortColumn) return;

  filteredData.sort((a, b) => {
    const valA = a[sortColumn] ?? "";
    const valB = b[sortColumn] ?? "";

    // Numeric sort
    if (!isNaN(valA) && !isNaN(valB)) {
      return (Number(valA) - Number(valB)) * sortDirection;
    }

    // Text sort
    return String(valA).localeCompare(String(valB)) * sortDirection;
  });
}

/* ---------------------------------------------------
   SORT ICONS
--------------------------------------------------- */
function updateSortIcons() {
  document.querySelectorAll("#table-header th").forEach(th => {
    const label = th.querySelector(".header-label").textContent;
    const icon = th.querySelector(".sort-icon");

    if (label === sortColumn) {
      icon.textContent = sortDirection === 1 ? "▲" : "▼";
      icon.style.opacity = 1;
    } else {
      icon.textContent = "⇅";
      icon.style.opacity = 0.3;
    }
  });
}



/* ---------------------------------------------------
   GLOBAL SEARCH
--------------------------------------------------- */
document.getElementById("globalSearch").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();

  filteredData = rawData.filter(row =>
    Object.values(row).some(v => String(v).toLowerCase().includes(q))
  );

  currentPage = 1;
  renderTable();
  renderPagination();
  updateResultsCount();   // ⭐ NEW
});

/* ---------------------------------------------------
   PAGE SIZE CHANGE
--------------------------------------------------- */
document.getElementById("pageSize").addEventListener("change", e => {
  pageSize = Number(e.target.value);
  currentPage = 1;
  renderTable();
  renderPagination();
  updateResultsCount();   // ⭐ NEW
});

/* ---------------------------------------------------
   RESET FILTERS BUTTON
--------------------------------------------------- */
document.getElementById("resetFiltersBtn").addEventListener("click", resetAllFilters);

function resetAllFilters() {
  // Reset dropdowns
  document.querySelectorAll("#filter-bar select").forEach(sel => {
    sel.value = "";
  });

  // Reset search
  document.getElementById("globalSearch").value = "";

  // Reset data
  filteredData = [...rawData];

  // Reset pagination
  currentPage = 1;

  // Rebuild filters to full lists
  updateAllFilters();

  // Re-render table + pagination
  renderTable();
  renderPagination();
  updateResultsCount();   // ⭐ NEW
}

/* ---------------------------------------------------
   BUILD TABLE HEADER
--------------------------------------------------- */
function buildTableHeader() {
  const headerRow = document.getElementById("table-header");
  headerRow.innerHTML = "";

  const table = document.getElementById("myTable");
  const colgroup = document.createElement("colgroup");

  colgroup.innerHTML = tableColumns
    .map((_, i) => `<col class="col-${i+1}">`)
    .join("");

  table.prepend(colgroup);

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

/* ---------------------------------------------------
   RENDER TABLE
--------------------------------------------------- */
function renderTable() {
  sortData(); // ⭐ NEW
  const body = document.getElementById("table-body");
  body.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  filteredData.slice(start, end).forEach(row => {
    const tr = document.createElement("tr");

	tableColumns.forEach(col => {
	  const td = document.createElement("td");
	  const value = row[col] ?? "";

	  /* ⭐ 1. MAKE SHOWCASE FIELD ID INTO A LINK */
	  if (col === "Showcase Field ID" && value !== "") {
		td.innerHTML = `
		  <a href="https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=${value}"
			 target="_blank"
			 class="field-link">
			 ${value}
		  </a>
		`;
	  }

	  /* ⭐ 2. MAKE NSHD VARIABLE NAME INTO A LINK */
	  else if (col === "NSHD Variable Name" && value !== "") {
		td.innerHTML = `
		  <a href="https://rmjdish.github.io/data_dict/docs/variable_metadata/${value}"
			 target="_blank"
			 class="field-link">
			 ${value}
		  </a>
		`;
	  }

	  /* ⭐ 3. DEFAULT CELL */
	  else {
		td.textContent = value;
	  }

	  tr.appendChild(td);
	});

    body.appendChild(tr);
  });

  document.getElementById("myTable").style.tableLayout = "fixed";
}

/* ---------------------------------------------------
   PAGINATION
--------------------------------------------------- */
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
  updateResultsCount();   // ⭐ NEW
}

/* ---------------------------------------------------
   RESULTS COUNTER
--------------------------------------------------- */
function updateResultsCount() {
  const total = rawData.length;
  const filtered = filteredData.length;

  document.getElementById("resultsCount").textContent =
    `Showing ${filtered} of ${total} results`;
}


function downloadFilteredCSV() {
    if (!filteredData || filteredData.length === 0) {
        alert("No data to download");
        return;
    }

    // Extract column headers from the table
    const headers = Object.keys(filteredData[0]);

    // Build CSV content
    let csvContent = headers.join(",") + "\n";

    filteredData.forEach(row => {
        const line = headers.map(h => {
            const value = row[h] ?? "";
            // Escape quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(",");
        csvContent += line + "\n";
    });

    // Trigger download
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