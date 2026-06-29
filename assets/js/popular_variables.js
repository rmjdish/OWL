document.addEventListener("DOMContentLoaded", () => {

  console.log("Popular vars table script starting…");

  // Load BOTH datasets
  Promise.all([
    fetch("popular_vars_all.json").then(r => r.json()),
    fetch("/OWL/docs/data_dictionary/NSHD_Data_Dictionary_Public.json").then(r => r.json())
  ])
  .then(([popular, labels]) => {

    // ⭐ HIDE LOADER + SHOW UI
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("popularUI").style.display = "block";

    // Build label + Field ID lookups
    const labelMap   = {};
    const fieldIdMap = {};
    labels.forEach(row => {
      const vn = row["NSHD Variable Name"];
      labelMap[vn]   = row["Variable Label"];
      fieldIdMap[vn] = row["Showcase Field ID"];   // numeric or undefined
    });

    // ⭐ Build a fast lookup set of valid NSHD variable names
    const dictionaryNames = new Set(labels.map(r => r["NSHD Variable Name"]));

    // Merge popular vars with labels + Field IDs
    const merged = popular.map(row => ({
      name:    row.name,
      label:   labelMap[row.name]   || "(no label found)",
      fieldId: fieldIdMap[row.name] || null,
      count:   row.count
    }));

    // ⭐ Only show variables with count > 15 AND that exist in the Data Dictionary
    const filtered = merged
      .filter(row => row.count > 15)
      .filter(row => dictionaryNames.has(row.name));

    initUI(filtered);
  })
  .catch(err => {
    console.error("Error loading JSON:", err);
    const container = document.getElementById("table-container");
    if (container) {
      container.innerHTML = "<p>Failed to load data.</p>";
    }
  });


  // ⭐ MAIN UI SETUP
  function initUI(data) {
    let sortColumn = null;
    let sortAsc    = true;
    let pageSize   = 15;
    let currentPage = 1;

    const tbody          = document.querySelector("#vars-table tbody");
    const resultsCount   = document.getElementById("resultsCount");
    const pageSizeControl = document.getElementById("pageSize");
    const searchBox      = document.getElementById("globalSearch");
    const addAllBtn      = document.getElementById("addAllBtn");

    let filteredData = [...data];

    // ⭐ SEARCH
    searchBox.oninput = () => {
      const q = searchBox.value.toLowerCase();
      filteredData = data.filter(row =>
        row.name.toLowerCase().includes(q)    ||
        row.label.toLowerCase().includes(q)   ||
        String(row.fieldId || "").includes(q)
      );
      currentPage = 1;
      renderTable();
    };

    // ⭐ PAGE SIZE
    pageSizeControl.onchange = () => {
      pageSize = parseInt(pageSizeControl.value);
      currentPage = 1;
      renderTable();
    };

    // ⭐ CHECK IF ALL VISIBLE ARE SELECTED
    function allVisibleRowsSelected() {
      const start = (currentPage - 1) * pageSize;
      const end   = start + pageSize;
      const visibleRows = filteredData.slice(start, end);
      if (visibleRows.length === 0) return false;
      return visibleRows.every(row => isInBasket(row.name));
    }

    // ⭐ UPDATE BUTTON LABEL
    function updateAddAllButtonLabel() {
      const start = (currentPage - 1) * pageSize;
      const end   = start + pageSize;
      const visibleRows = filteredData.slice(start, end);

      if (visibleRows.length === 0) {
        addAllBtn.textContent = "No visible variables to add";
        addAllBtn.classList.remove("remove-mode");
        addAllBtn.disabled = true;
        return;
      }

      addAllBtn.disabled = false;

      if (allVisibleRowsSelected()) {
        addAllBtn.textContent = "Remove all visible variables";
        addAllBtn.classList.add("remove-mode");
      } else {
        addAllBtn.textContent = "Add all visible variables";
        addAllBtn.classList.remove("remove-mode");
      }
    }

    // ⭐ ADD / REMOVE ALL BUTTON
    addAllBtn.onclick = () => {
      const start = (currentPage - 1) * pageSize;
      const end   = start + pageSize;
      const visibleRows = filteredData.slice(start, end);

      if (allVisibleRowsSelected()) {
        visibleRows.forEach(row => removeFromBasket(row.name));
      } else {
        visibleRows.forEach(row => addToBasket(row.name, row.label));
      }

      updateBasketCountUI();
      renderTable();
    };

    // ⭐ RENDER TABLE
    function renderTable() {
      let sorted = [...filteredData];

      if (sortColumn) {
        sorted.sort((a, b) => {
          const av = a[sortColumn] ?? "";
          const bv = b[sortColumn] ?? "";
          if (av < bv) return sortAsc ? -1 : 1;
          if (av > bv) return sortAsc ?  1 : -1;
          return 0;
        });
      }

      const totalRows  = sorted.length;
      const totalPages = Math.ceil(totalRows / pageSize);
      const start      = (currentPage - 1) * pageSize;
      const pageRows   = sorted.slice(start, start + pageSize);

      resultsCount.textContent = `Showing ${totalRows} results`;

      // Build rows
      tbody.innerHTML = pageRows.map(row => {
        const checked = isInBasket(row.name);

        // Field ID cell — link to Showcase if available, otherwise "Not available"
        const fieldIdCell = row.fieldId
          ? `<a href="https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=${row.fieldId}"
                target="_blank"
                class="field-link">${row.fieldId}</a>`
          : `<span class="not-available">Not available</span>`;

        return `
          <tr>
            <td class="check-col">
              <input type="checkbox"
                     class="add-to-basket"
                     data-name="${row.name}"
                     data-label="${row.label}"
                     ${checked ? "checked" : ""}>
            </td>

            <td class="name-col">
              <a href="https://rmjdish.github.io/OWL/assets/variable_metadata/${row.name}"
                 target="_blank"
                 class="field-link">
                 ${row.name}
              </a>
            </td>

            <td class="fieldid-col">${fieldIdCell}</td>

            <td class="label-col">${row.label}</td>
            <td class="count-col">${row.count}</td>
          </tr>
        `;
      }).join("");

      updateSortIcons();
      renderPagination(totalPages);
      attachBasketEvents();
      updateAddAllButtonLabel();
    }

    // ⭐ PAGINATION
    function renderPagination(totalPages) {
      const top    = document.getElementById("paginationTop");
      const bottom = document.getElementById("paginationBottom");

      const html = `
        <button ${currentPage === 1         ? "disabled" : ""} data-dir="-1">Prev</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button ${currentPage === totalPages ? "disabled" : ""} data-dir="1">Next</button>
      `;

      top.innerHTML    = html;
      bottom.innerHTML = html;

      document.querySelectorAll("#paginationTop button, #paginationBottom button")
        .forEach(btn => {
          btn.onclick = () => {
            currentPage += parseInt(btn.dataset.dir);
            renderTable();
          };
        });
    }

    // ⭐ SORTING EVENTS
    document.querySelectorAll("#vars-table th[data-sort]").forEach(th => {
      const label = th.textContent;

      th.innerHTML = `
        <span class="header-label">${label}</span>
        <span class="sort-icon">⇅</span>
      `;

      th.onclick = () => {
        const col = th.dataset.sort;
        if (sortColumn === col) {
          sortAsc = !sortAsc;
        } else {
          sortColumn = col;
          sortAsc    = true;
        }
        currentPage = 1;
        renderTable();
      };
    });

    // ⭐ UPDATE SORT ICONS
    function updateSortIcons() {
      document.querySelectorAll("#vars-table th[data-sort]").forEach(th => {
        const col  = th.dataset.sort;
        const icon = th.querySelector(".sort-icon");
        if (col !== sortColumn) {
          icon.textContent = "⇅";
          icon.style.opacity = 0.4;
          return;
        }
        icon.style.opacity = 1;
        icon.textContent   = sortAsc ? "▲" : "▼";
      });
    }

    // ⭐ BASKET EVENTS
    function attachBasketEvents() {
      document.querySelectorAll(".add-to-basket").forEach(cb => {
        cb.onclick = () => {
          const name  = cb.dataset.name;
          const label = cb.dataset.label;
          if (cb.checked) addToBasket(name, label);
          else            removeFromBasket(name);
          updateBasketCountUI();
          updateAddAllButtonLabel();
        };
      });
    }

    // ============================================================
    // Download filtered CSV
    // ============================================================
    function downloadFilteredCSV() {
      if (!filteredData || filteredData.length === 0) {
        alert("No data to download");
        return;
      }

      const headers = ["name", "fieldId", "label", "count"];
      const displayHeaders = ["NSHD Variable Name", "Showcase Field ID", "Variable Label", "Count"];

      let csvContent = displayHeaders.join(",") + "\n";

      filteredData.forEach(row => {
        const line = headers.map(h => {
          const value = row[h] ?? "Not available";
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(",");
        csvContent += line + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = "Popular_Variables_filtered_results.csv";
      link.click();
      URL.revokeObjectURL(url);
    }

    document.getElementById("downloadCsvBtn")
      .addEventListener("click", downloadFilteredCSV);

    renderTable();
  } // end initUI

}); // end DOMContentLoaded