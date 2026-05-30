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
  let currentPage = 1;
  let pageSize = 15;

  // ⭐ Sorting state
  let sortColumn = "Order";
  let sortAsc = true;

  /* ============================================================
     RENDER TABLE
     ============================================================ */
  function renderTable() {
    let data = [...filteredData];

    // ⭐ Apply sorting
    data.sort((a, b) => {
      const A = a[sortColumn];
      const B = b[sortColumn];

      if (!isNaN(A) && !isNaN(B)) {
        return sortAsc ? A - B : B - A;
      }

      return sortAsc
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });

    const totalRows = data.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
	resultsCount.textContent = `Showing ${filteredData.length} of ${allData.length} results`;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const pageRows = data.slice(start, start + pageSize);

    tbody.innerHTML = pageRows.map(row => {
      const name = row["NSHD Variable Name"];
      const label = row["Variable Label"] || "";
      const checked = isInBasket(name);

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
            <a href="https://rmjdish.github.io/OWL/docs/variable_metadata/${name}.html"
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
	  const end = start + pageSize;
	  const visibleRows = filteredData.slice(start, end);

	  if (visibleRows.length === 0) return false; 

	  return visibleRows.every(row => {
		const varName = row["NSHD Variable Name"];
		return varName && isInBasket(varName);
	  });
	}

	function updateAddAllButtonLabel2() {
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
	  } else if (allVisibleRowsSelected2()) {
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
  
	const addBtn = document.getElementById("addAllBtn");
	if (addBtn) {
		addBtn.onclick = () => {
			const start = (currentPage - 1) * pageSize;
			const end = start + pageSize;
			const visibleRows = filteredData.slice(start, end);

			if (allVisibleRowsSelected2()) {
				visibleRows.forEach(row =>
					removeFromBasket(row["NSHD Variable Name"])
				);
			} else {
				visibleRows.forEach(row => {
					const name = row["NSHD Variable Name"];
					const label = row["Variable Label"] || "";
					addToBasket(name, label);
				});
			}

			updateBasketCountUI();
			renderTable(); // refresh table + button state
		};
	}
  }


	// ⭐ Reattach Add/Remove All button handler after pagination renders
	const addBtn = document.getElementById("addAllBtn");
	if (addBtn) {
		addBtn.onclick = () => {
			const start = (currentPage - 1) * pageSize;
			const end = start + pageSize;
			const visibleRows = filteredData.slice(start, end);

			if (allVisibleRowsSelected2()) {
				visibleRows.forEach(row =>
					removeFromBasket(row["NSHD Variable Name"])
				);
			} else {
				visibleRows.forEach(row => {
					const name = row["NSHD Variable Name"];
					const label = row["Variable Label"] || "";
					addToBasket(name, label);
				});
			}

			updateBasketCountUI();
			renderTable(); // refresh table + button state
		};
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
        icon.textContent = "⇅";
        icon.style.opacity = 0.4;
      } else {
        icon.textContent = sortAsc ? "▲" : "▼";
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
        sortAsc = true;
      }

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
        else removeFromBasket(name);

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
    pageSize = parseInt(pageSizeControl.value);
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

      // ⭐ Build label dropdown
      const labels = [...new Set(data.map(r => r["Variable Label"] || ""))]
        .filter(x => x.trim() !== "")
        .sort();

      labels.forEach(l => {
        const opt = document.createElement("option");
        opt.value       = l;
        opt.textContent = l;
        labelFilter.appendChild(opt);
      });

      // ⭐ Reposition select if it would overflow right edge
      const rect = labelFilter.getBoundingClientRect();
      if (rect.right > window.innerWidth - 20) {
        labelFilter.style.position = "absolute";
        labelFilter.style.right    = "0";
        labelFilter.style.left     = "auto";
      }

      loading.style.display  = "none";
      ui.style.visibility    = "visible";

      renderTable();
    });

});