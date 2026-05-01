document.addEventListener("DOMContentLoaded", () => {

  console.log("Browse-by-category script starting…");

  const loading = document.getElementById("loadingScreen");
  const ui = document.getElementById("browseUI");

  const tbody = document.querySelector("#myTable2 tbody");
  const searchBox = document.getElementById("manualSearch");
  const pageSizeControl = document.getElementById("manualPageSize");

  let allData = [];
  let filteredData = [];
  let currentPage = 1;
  let pageSize = 15;

  // ⭐ Sorting state
  let sortColumn = "Order";
  let sortAsc = true;

  function renderTable() {
    let data = [...filteredData];

    // ⭐ Apply sorting
    data.sort((a, b) => {
      const A = a[sortColumn];
      const B = b[sortColumn];

      // Numeric sort for Order + Showcase Field ID
      if (!isNaN(A) && !isNaN(B)) {
        return sortAsc ? A - B : B - A;
      }

      // String sort
      return sortAsc
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });

    const totalRows = data.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const pageRows = data.slice(start, start + pageSize);

    tbody.innerHTML = pageRows.map(row => {
      const name = row["NSHD Variable Name"];
      const label = row["Variable Label"] || "";
      const checked = isInBasket(name);

      return `
        <tr>
          <td class="check-col">
            <input type="checkbox"
                   class="add-to-basket"
                   data-name="${name}"
                   data-label="${label.replace(/"/g, "&quot;")}"
                   ${checked ? "checked" : ""}>
          </td>

          <td>${row["Order"]}</td>

          <td>
            <a href="https://rmjdish.github.io/data_dict/docs/variable_metadata/${name}.html"
               target="_blank">${name}</a>
          </td>

          <td class="dt-center">
            <a href="https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=${row["Showcase Field ID"]}"
               target="_blank">${row["Showcase Field ID"]}</a>
          </td>

          <td>${label}</td>
        </tr>
      `;
    }).join("");

    attachBasketEvents();
    updateSortIcons();
  }

  /* ⭐ SORT ICONS (same behaviour as popular page) */
  function updateSortIcons() {
    document.querySelectorAll("#myTable2 th[data-sort]").forEach(th => {
      const col = th.dataset.sort;

      if (!th.querySelector(".sort-icon")) {
        th.innerHTML = `
          <span class="header-label">${th.textContent}</span>
          <span class="sort-icon">⇅</span>
        `;
      }

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

  /* ⭐ CLICK TO SORT */
  document.querySelectorAll("#myTable2 th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
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

  /* ⭐ BASKET EVENTS */
  function attachBasketEvents() {
    document.querySelectorAll(".add-to-basket").forEach(cb => {
      cb.onclick = () => {
        const name = cb.dataset.name;
        const label = cb.dataset.label;

        if (cb.checked) addToBasket(name, label);
        else removeFromBasket(name);

        updateBasketCountUI();
      };
    });
  }

  /* ⭐ SEARCH */
  searchBox.onkeyup = () => {
    const q = searchBox.value.toLowerCase();
    filteredData = allData.filter(row =>
      row["NSHD Variable Name"].toLowerCase().includes(q) ||
      (row["Variable Label"] || "").toLowerCase().includes(q) ||
      String(row["Showcase Field ID"]).toLowerCase().includes(q)
    );
    currentPage = 1;
    renderTable();
  };

  /* ⭐ PAGE SIZE */
  pageSizeControl.onchange = () => {
    pageSize = parseInt(pageSizeControl.value);
    currentPage = 1;
    renderTable();
  };

  /* ⭐ LOAD JSON */
  const htmlFile = window.location.pathname.split("/").pop();
  const baseName = htmlFile.replace(/\.html$/, "");
  const jsonFile = `${baseName}.json`;

  fetch(jsonFile)
    .then(r => r.json())
    .then(data => {
      allData = data;
      filteredData = data;

      loading.style.display = "none";
      ui.style.visibility = "visible";

      renderTable();
    });

});