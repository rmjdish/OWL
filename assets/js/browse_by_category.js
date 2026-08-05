document.addEventListener("DOMContentLoaded", () => {

  console.log("Browse-by-category script starting…");

  const loading = document.getElementById("loadingScreen");
  const ui = document.getElementById("browseUI");

  const tbody = document.querySelector("#myTable2 tbody");
  const searchBox = document.getElementById("globalSearch");
  const pageSizeControl = document.getElementById("pageSize");
  const labelFilter = document.getElementById("labelFilterHeader");

  let allData = [];
  let filteredData = [];
  let sortedData = [];      // ← cached sort result, only recomputed when sort changes
  let currentPage = 1;
  let pageSize = 15;

  // ⭐ Sorting state
  let sortColumn = "Order";
  let sortAsc = true;
  let sortDirty = true;     // ← true when sortedData needs recomputing

  // ── Basket cache ───────────────────────────────────────────────────────────
  // Load basket ONCE per render into a Set — O(1) lookups, single
  // localStorage read per renderTable() call instead of one per row.
  let _basketCache = new Set();

  function refreshBasketCache() {
    _basketCache = new Set(loadBasket().map(item => item.varName));
  }

  function inBasketFast(varName) {
    return _basketCache.has(varName);
  }

  /* ============================================================
     RENDER TABLE
     ============================================================ */
  function renderTable() {

    // Recompute sort only when sort state actually changed — not on every render
    if (sortDirty) {
      sortedData = [...filteredData].sort((a, b) => {
        const A = a[sortColumn];
        const B = b[sortColumn];
        if (!isNaN(A) && !isNaN(B)) return sortAsc ? A - B : B - A;
        return sortAsc
          ? String(A).localeCompare(String(B))
          : String(B).localeCompare(String(A));
      });
      sortDirty = false;
    }

    // Single localStorage read for all row checkbox states
    refreshBasketCache();

    const totalRows  = sortedData.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    resultsCount.textContent = `Showing ${filteredData.length} of ${allData.length} results`;
    if (currentPage > totalPages) currentPage = totalPages;

    const start    = (currentPage - 1) * pageSize;
    const pageRows = sortedData.slice(start, start + pageSize);

    tbody.innerHTML = pageRows.map(row => {
      const name    = row["NSHD Variable Name"];
      const label   = row["Variable Label"] || "";
      const checked = inBasketFast(name);   // ← O(1) Set lookup, no localStorage read

      return `
        <tr>
          <td class="check-col" style="width:40px;">
            <input type="checkbox"
                   class="add-to-basket"
                   data-name="${name}"
                   data-label="${label.replace(/"/g, "&quot;")}"
                   ${checked ? "checked" : ""}>
          </td>
          <td style="width:40px;">${row["Order"]}</td>
          <td style="width:95px;">
            <a href="https://rmjdish.github.io/OWL/assets/variable_metadata/${name}.html"
               target="_blank">${name}</a>
          </td>
          <td class="dt-center" style="width:55px;">
            <a href="https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=${row["Showcase Field ID"]}"
               target="_blank">${row["Showcase Field ID"]}</a>
          </td>
          <td style="width:400px; overflow:hidden; text-overflow:ellipsis;">
            ${label}
          </td>
        </tr>
      `;
    }).join("");

    attachBasketEvents();
    updateSortIcons();
    updateAddAllButtonLabel2();
    renderPagination(totalPages);
  }


  /* ============================================================
     ADD/REMOVE ALL HELPERS
     ============================================================ */
  function allVisibleRowsSelected2() {
    const start = (currentPage - 1) * pageSize;
    const end   = start + pageSize;
    const visibleRows = sortedData.slice(start, end);
    if (visibleRows.length === 0) return false;
    // Uses the cache — no extra localStorage reads
    return visibleRows.every(row => {
      const varName = row["NSHD Variable Name"];
      return varName && inBasketFast(varName);
    });
  }

  function updateAddAllButtonLabel2() {
    const btn = document.getElementById("addAllBtn");
    if (!btn) return;

    const start = (currentPage - 1) * pageSize;
    const end   = start + pageSize;
    const visibleRows = sortedData.slice(start, end);

    if (visibleRows.length === 0) {
      btn.textContent = "No visible variables to add";
      btn.classList.remove("remove-mode");
      btn.disabled = true;
    } else if (allVisibleRowsSelected2()) {
      btn.textContent = "Remove all visible variables";
      btn.classList.add("remove-mode");
      btn.disabled = false;
    } else {
      btn.textContent = "Add all visible variables";
      btn.classList.remove("remove-mode");
      btn.disabled = false;
    }
  }

  // ── Add/Remove All button — registered ONCE here, never inside renderPagination
  const addBtn = document.getElementById("addAllBtn");
  if (addBtn) {
    addBtn.onclick = () => {
      const start      = (currentPage - 1) * pageSize;
      const end        = start + pageSize;
      const visibleRows = sortedData.slice(start, end);

      if (allVisibleRowsSelected2()) {
        // REMOVE ALL — single read+write via batch function
        const varNames = visibleRows
          .map(row => row["NSHD Variable Name"])
          .filter(Boolean);
        batchRemoveFromBasket(varNames);
      } else {
        // ADD ALL — single read+write via batch function
        const items = visibleRows
          .filter(row => row["NSHD Variable Name"])
          .map(row => ({
            varName: row["NSHD Variable Name"],
            label:   row["Variable Label"] || ""
          }));
        batchAddToBasket(items);
      }

      refreshBasketCache();
      renderTable();
    };
  }


  /* ============================================================
     PAGINATION
     ============================================================ */
  function renderPagination(totalPages) {
    const top    = document.getElementById("paginationTop");
    const bottom = document.getElementById("paginationBottom");
    if (!top || !bottom) return;

    const html = `
      <button ${currentPage === 1 ? "disabled" : ""} data-dir="-1">Prev</button>
      <span>Page ${currentPage} of ${totalPages}</span>
      <button ${currentPage === totalPages ? "disabled" : ""} data-dir="1">Next</button>
    `;

    top.innerHTML = html;
    bottom.querySelector(".pagination-controls").innerHTML = html;

    document.querySelectorAll("#paginationTop button, #paginationBottom button")
      .forEach(btn => {
        btn.onclick = () => {
          currentPage += parseInt(btn.dataset.dir);
          renderTable();
        };
      });
  }


  /* ============================================================
     DOWNLOAD CSV
     ============================================================ */
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
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = "Browse_By_Category_filtered_results.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  document.getElementById("downloadCsvBtn")
    .addEventListener("click", downloadFilteredCSV);


  /* ============================================================
     SORT ICONS
     ============================================================ */
  function updateSortIcons() {
    document.querySelectorAll("#myTable2 th[data-sort]").forEach(th => {
      const col  = th.dataset.sort;
      const icon = th.querySelector(".sort-icon");
      if (!icon) return;
      if (col !== sortColumn) {
        icon.textContent  = "⇅";
        icon.style.opacity = 0.4;
      } else {
        icon.textContent  = sortAsc ? "▲" : "▼";
        icon.style.opacity = 1;
      }
    });
  }


  /* ============================================================
     CLICK TO SORT
     ============================================================ */
  document.querySelectorAll("#myTable2 th[data-sort]").forEach(th => {
    th.addEventListener("click", (e) => {
      if (e.target.closest("select")) return;
      const col = th.dataset.sort;
      if (sortColumn === col) {
        sortAsc = !sortAsc;
      } else {
        sortColumn = col;
        sortAsc    = true;
      }
      sortDirty  = true;  // ← mark for recompute on next render
      currentPage = 1;
      renderTable();
    });
  });

  labelFilter.addEventListener("click", (e) => e.stopPropagation());


  /* ============================================================
     BASKET EVENTS
     ============================================================ */
  function attachBasketEvents() {
    document.querySelectorAll(".add-to-basket").forEach(cb => {
      cb.onclick = () => {
        const name  = cb.dataset.name;
        const label = cb.dataset.label;
        if (cb.checked) addToBasket(name, label);
        else            removeFromBasket(name);
        refreshBasketCache();
        updateBasketCountUI();
        updateAddAllButtonLabel2();
      };
    });
  }


  /* ============================================================
     SEARCH + PAGE SIZE + LABEL FILTER
     ============================================================ */
  searchBox.onkeyup = () => applyFilters();

  pageSizeControl.onchange = () => {
    pageSize    = parseInt(pageSizeControl.value);
    currentPage = 1;
    renderTable();
  };

  labelFilter.onchange = () => applyFilters();


  /* ============================================================
     APPLY ALL FILTERS
     ============================================================ */
  function applyFilters() {
    const q             = searchBox.value.toLowerCase();
    const selectedLabel = labelFilter.value;

    filteredData = allData.filter(row => {
      const matchesLabel =
        selectedLabel === "" || row["Variable Label"] === selectedLabel;
      const matchesSearch =
        row["NSHD Variable Name"].toLowerCase().includes(q) ||
        (row["Variable Label"] || "").toLowerCase().includes(q) ||
        String(row["Showcase Field ID"]).toLowerCase().includes(q);
      return matchesLabel && matchesSearch;
    });

    sortDirty   = true;   // ← filtered data changed, re-sort needed
    currentPage = 1;
    renderTable();
  }


  /* ============================================================
     LOAD JSON + BUILD LABEL FILTER
     ============================================================ */
  const htmlFile = window.location.pathname.split("/").pop();
  const baseName = htmlFile.replace(/\.html$/, "");
  const jsonFile = `${baseName}.json`;

  fetch(jsonFile)
    .then(r => r.json())
    .then(data => {
      allData      = data;
      filteredData = data;
      sortDirty    = true;

      // Build label dropdown using a DocumentFragment — single DOM insertion
      // instead of 1,200 individual appendChild() calls which each trigger
      // a browser reflow. This is the main cause of the slow spinner.
      const labels = [...new Set(data.map(r => r["Variable Label"] || ""))]
        .filter(x => x.trim() !== "")
        .sort();

      const fragment = document.createDocumentFragment();
      labels.forEach(l => {
        const opt       = document.createElement("option");
        opt.value       = l;
        opt.textContent = l;
        fragment.appendChild(opt);
      });
      labelFilter.appendChild(fragment);   // single DOM operation

      // Reposition select if it would overflow right edge
      const rect = labelFilter.getBoundingClientRect();
      if (rect.right > window.innerWidth - 20) {
        labelFilter.style.position = "absolute";
        labelFilter.style.right    = "0";
        labelFilter.style.left     = "auto";
      }

      loading.style.display = "none";
      ui.style.visibility   = "visible";

      renderTable();
    });

  /* ============================================================
     Keep "Add all" button + basket cache in sync with changes made
     elsewhere — e.g. linked longitudinal sweeps auto-added/removed via
     basket_header.js after this page's own handlers have already run.
     Checkbox .checked state itself is handled by
     refreshBasketCheckboxesUI() in basket_header.js (data-name is one
     of the conventions it recognizes).
     ============================================================ */
  window.addEventListener("nshd-basket-changed", () => {
    refreshBasketCache();
    updateAddAllButtonLabel2();
  });

});