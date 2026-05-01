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

  /* ============================================================
     RENDER TABLE (same mechanism as popular_variables.js)
     ============================================================ */

  function renderTable() {
    let data = [...filteredData];

    // Always sort by Order ascending
    data.sort((a, b) => {
      const ao = Number(a["Order"]) || 0;
      const bo = Number(b["Order"]) || 0;
      return ao - bo;
    });

    const totalRows = data.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const pageRows = data.slice(start, start + pageSize);

    tbody.innerHTML = pageRows.map(row => {
      const name = row["NSHD Variable Name"];      // basket ID
      const label = row["Variable Label"] || "";
      const checked = isInBasket(name);            // ⭐ use GLOBAL isInBasket

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
               target="_blank">
               ${name}
            </a>
          </td>

          <td class="dt-center">
            <a href="https://datashare.ndph.ox.ac.uk/nshd46/field.cgi?id=${row["Showcase Field ID"]}"
               target="_blank">
               ${row["Showcase Field ID"]}
            </a>
          </td>

          <td>${label}</td>
        </tr>
      `;
    }).join("");

    attachBasketEvents();
  }

  /* ============================================================
     BASKET EVENTS (identical semantics to popular_variables.js)
     ============================================================ */

  function attachBasketEvents() {
    document.querySelectorAll(".add-to-basket").forEach(cb => {
      cb.onclick = () => {
        const name = cb.dataset.name;
        const label = cb.dataset.label;

        if (!name) return;

        if (cb.checked) {
          addToBasket(name, label);
        } else {
          removeFromBasket(name);
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

  /* ============================================================
     SEARCH + PAGE SIZE
     ============================================================ */

  searchBox.onkeyup = () => {
    const q = searchBox.value.toLowerCase();
    filteredData = allData.filter(row =>
      (row["NSHD Variable Name"] || "").toLowerCase().includes(q) ||
      (row["Variable Label"] || "").toLowerCase().includes(q) ||
      String(row["Showcase Field ID"] || "").toLowerCase().includes(q)
    );
    currentPage = 1;
    renderTable();
  };

  pageSizeControl.onchange = () => {
    pageSize = parseInt(pageSizeControl.value);
    currentPage = 1;
    renderTable();
  };

  /* ============================================================
     LOAD JSON + START
     ============================================================ */

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
    })
    .catch(err => {
      console.error("JSON load error:", err);
      loading.style.display = "none";
      ui.style.visibility = "visible";
    });

});