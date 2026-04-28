document.addEventListener("DOMContentLoaded", () => {

  console.log("Popular vars table script starting…");

  // Load BOTH datasets
  Promise.all([
    fetch("popular_vars_all.json").then(r => r.json()),
    fetch("NSHD_Data_Dictionary_Public.json").then(r => r.json())
  ])
  .then(([popular, labels]) => {

    // ⭐ HIDE LOADER + SHOW UI
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("popularUI").style.display = "block";

    const labelMap = {};
    labels.forEach(row => {
      labelMap[row["NSHD Variable Name"]] = row["Variable Label"];
    });

    const merged = popular.map(row => ({
      name: row.name,
      label: labelMap[row.name] || "(no label found)",
      count: row.count
    }));

    initUI(merged);
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
    let sortAsc = true;
    let pageSize = 15;
    let currentPage = 1;

    const tbody = document.querySelector("#vars-table tbody");
    const resultsCount = document.getElementById("resultsCount");
    const pageSizeControl = document.getElementById("pageSize");

    // Page size change
    pageSizeControl.onchange = () => {
      pageSize = parseInt(pageSizeControl.value);
      currentPage = 1;
      renderTable();
    };

    // ⭐ RENDER TABLE
    function renderTable() {
      let sorted = [...data];

      // Sorting
      if (sortColumn) {
        sorted.sort((a, b) => {
          if (a[sortColumn] < b[sortColumn]) return sortAsc ? -1 : 1;
          if (a[sortColumn] > b[sortColumn]) return sortAsc ? 1 : -1;
          return 0;
        });
      }

      const totalRows = sorted.length;
      const totalPages = Math.ceil(totalRows / pageSize);

      const start = (currentPage - 1) * pageSize;
      const pageRows = sorted.slice(start, start + pageSize);

      resultsCount.textContent = `Showing ${totalRows} results`;

      // Build rows (respect basket state)
      tbody.innerHTML = pageRows.map(row => {
        const checked = typeof isInBasket === "function" && isInBasket(row.name);
        return `
          <tr>
            <td class="check-col">
              <input type="checkbox"
                     class="add-to-basket"
                     data-name="${row.name}"
                     data-label="${row.label}"
                     ${checked ? "checked" : ""}>
            </td>
            <td class="name-col">${row.name}</td>
            <td class="label-col">${row.label}</td>
            <td class="count-col">${row.count}</td>
          </tr>
        `;
      }).join("");

      updateSortIcons();
      renderPagination(totalPages);
      attachBasketEvents();
    }

    // ⭐ PAGINATION
    function renderPagination(totalPages) {
      const top = document.getElementById("paginationTop");
      const bottom = document.getElementById("paginationBottom");

      const html = `
        <button ${currentPage === 1 ? "disabled" : ""} data-dir="-1">Prev</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button ${currentPage === totalPages ? "disabled" : ""} data-dir="1">Next</button>
      `;

      top.innerHTML = html;
      bottom.innerHTML = html;

      // Attach events
      document.querySelectorAll("#paginationTop button, #paginationBottom button")
        .forEach(btn => {
          btn.onclick = () => {
            const delta = parseInt(btn.dataset.dir);
            currentPage += delta;
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
          sortAsc = true;
        }

        currentPage = 1;
        renderTable();
      };
    });

    // ⭐ UPDATE SORT ICONS
    function updateSortIcons() {
      document.querySelectorAll("#vars-table th[data-sort]").forEach(th => {
        const col = th.dataset.sort;
        const icon = th.querySelector(".sort-icon");

        if (col !== sortColumn) {
          icon.textContent = "⇅";
          icon.style.opacity = 0.4;
          return;
        }

        icon.style.opacity = 1;
        icon.textContent = sortAsc ? "▲" : "▼";
      });
    }

    // ⭐ BASKET EVENTS (shared with Data Dictionary)
    function attachBasketEvents() {
      document.querySelectorAll(".add-to-basket").forEach(cb => {
        cb.onclick = () => {
          const name = cb.dataset.name;
          const label = cb.dataset.label;

          if (!name) return;

          if (cb.checked) {
            if (typeof addToBasket === "function") {
              addToBasket(name, label);
            }
          } else {
            if (typeof removeFromBasket === "function") {
              removeFromBasket(name);
            }
          }

          if (typeof updateBasketCountUI === "function") {
            updateBasketCountUI();
          }

          const icon = document.getElementById("basket-icon");
          if (icon) {
            icon.classList.add("basket-pulse");
            setTimeout(() => icon.classList.remove("basket-pulse"), 300);
          }
        };
      });
    }

    renderTable();
  } // end initUI

}); // end DOMContentLoaded