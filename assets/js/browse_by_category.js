document.addEventListener("DOMContentLoaded", () => {

  const loading = document.getElementById("loadingScreen");
  const ui = document.getElementById("browseUI");

  const tbody = document.querySelector("#myTable2 tbody");
  const searchBox = document.getElementById("manualSearch");
  const pageSizeControl = document.getElementById("manualPageSize");

  let allData = [];
  let filteredData = [];
  let currentPage = 1;
  let pageSize = 15;

  // ⭐ Normalise IDs everywhere
  function norm(x) {
    return String(x || "").trim().toUpperCase();
  }

  function isInBasket(id) {
    const nid = norm(id);
    try {
      return loadBasket().some(item => norm(item.id) === nid);
    } catch {
      return false;
    }
  }

  function renderTable() {
    let data = [...filteredData];

    // Sort by Order
    data.sort((a, b) => (Number(a.Order) || 0) - (Number(b.Order) || 0));

    const totalRows = data.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const pageRows = data.slice(start, start + pageSize);

    tbody.innerHTML = pageRows.map(row => {
      const id = norm(row["NSHD Variable Name"]);
      const label = row["Variable Label"] || "";
      const checked = isInBasket(id);

      return `
        <tr>
          <td class="check-col">
            <input type="checkbox"
                   class="add-to-basket"
                   data-name="${id}"
                   data-label="${label.replace(/"/g, "&quot;")}"
                   ${checked ? "checked" : ""}>
          </td>

          <td>${row["Order"]}</td>

          <td>
            <a href="https://rmjdish.github.io/data_dict/docs/variable_metadata/${id}.html"
               target="_blank">${id}</a>
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
  }

  function attachBasketEvents() {
    document.querySelectorAll(".add-to-basket").forEach(cb => {
      cb.onclick = () => {
        const id = norm(cb.dataset.name);
        const label = cb.dataset.label;

        if (cb.checked) {
          addToBasket(id, label);
        } else {
          removeFromBasket(id);
        }

        updateBasketCountUI();
      };
    });
  }

  searchBox.onkeyup = () => {
    const q = searchBox.value.toLowerCase();
    filteredData = allData.filter(row =>
      norm(row["NSHD Variable Name"]).includes(q.toUpperCase()) ||
      (row["Variable Label"] || "").toLowerCase().includes(q)
    );
    currentPage = 1;
    renderTable();
  };

  pageSizeControl.onchange = () => {
    pageSize = parseInt(pageSizeControl.value);
    currentPage = 1;
    renderTable();
  };

  const htmlFile = window.location.pathname.split("/").pop();
  const baseName = htmlFile.replace(/\.html$/, "");
  const jsonFile = `${baseName}.json`;

  fetch(jsonFile)
    .then(r => r.json())
    .then(data => {
      // ⭐ Normalise IDs immediately
      data.forEach(row => {
        row["NSHD Variable Name"] = norm(row["NSHD Variable Name"]);
      });

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