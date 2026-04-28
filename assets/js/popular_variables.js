document.addEventListener("DOMContentLoaded", () => {

console.log("Popular vars table script starting…");

// Load BOTH datasets
Promise.all([
  fetch("popular_vars_all.json").then(r => r.json()),
  fetch("NSHD_Data_Dictionary_Public.json").then(r => r.json())
])
.then(([popular, labels]) => {

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
  document.getElementById("table-container").innerHTML =
    "<p>Failed to load data.</p>";
});


// ⭐ MAIN UI SETUP
function initUI(data) {
  const container = document.getElementById("table-container");

  container.innerHTML = `
    <div id="paginationTop" class="pagination-bar"></div>

    <table id="vars-table">
      <thead>
        <tr>
          <th class="check-col"></th>
          <th class="name-col" data-sort="name">Variable Name</th>
          <th class="label-col" data-sort="label">Variable Label</th>
          <th class="count-col" data-sort="count">Count</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>

    <div id="paginationBottom" class="pagination-bar"></div>
  `;

  let sortColumn = null;
  let sortAsc = true;
  let pageSize = 15;
  let currentPage = 1;

  const pageSizeControl = document.createElement("select");
  pageSizeControl.id = "pageSize";
  [15, 30, 50, 100].forEach(n => {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    pageSizeControl.appendChild(opt);
  });

  const resultsCount = document.createElement("div");
  resultsCount.id = "resultsCount";

  // Insert into top pagination bar
  const paginationTop = document.getElementById("paginationTop");
  paginationTop.appendChild(resultsCount);
  paginationTop.appendChild(pageSizeControl);

  pageSizeControl.onchange = () => {
    pageSize = parseInt(pageSizeControl.value);
    currentPage = 1;
    renderTable();
  };

  function renderTable() {
    const tbody = document.querySelector("#vars-table tbody");

    let sorted = [...data];
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

    resultsCount.textContent = `${totalRows} results`;

    tbody.innerHTML = pageRows.map(row => `
      <tr>
        <td class="check-col">
          <input type="checkbox" class="add-to-basket" data-name="${row.name}" data-label="${row.label}">
        </td>
        <td class="name-col">${row.name}</td>
        <td class="label-col">${row.label}</td>
        <td class="count-col">${row.count}</td>
      </tr>
    `).join("");

    renderPagination(totalPages);
    attachBasketEvents();
  }

  function renderPagination(totalPages) {
    const top = document.getElementById("paginationTop");
    const bottom = document.getElementById("paginationBottom");

    const html = buildPaginationButtons(totalPages);
    top.innerHTML = resultsCount.outerHTML + pageSizeControl.outerHTML + html;
    bottom.innerHTML = html;

    // Reattach event listeners
    document.querySelectorAll(".page-btn").forEach(btn => {
      btn.onclick = () => {
        currentPage = parseInt(btn.dataset.page);
        renderTable();
      };
    });
  }

  function buildPaginationButtons(totalPages) {
    let buttons = "";

    for (let i = 1; i <= totalPages; i++) {
      buttons += `
        <button class="page-btn ${i === currentPage ? "active" : ""}" data-page="${i}">
          ${i}
        </button>
      `;
    }

    return `<div class="pagination-buttons">${buttons}</div>`;
  }

  document.querySelectorAll("#vars-table th[data-sort]").forEach(th => {
    th.onclick = () => {
      const col = th.dataset.sort;
      if (sortColumn === col) {
        sortAsc = !sortAsc;
      } else {
        sortColumn = col;
        sortAsc = true;
      }
      renderTable();
    };
  });

  function attachBasketEvents() {
    document.querySelectorAll(".add-to-basket").forEach(cb => {
      cb.onclick = () => {
        const name = cb.dataset.name;
        const label = cb.dataset.label;

        window.basket = window.basket || [];
        window.basket.push({ name, label });

        const icon = document.getElementById("basket-icon");
        if (icon) {
          icon.classList.add("basket-pulse");
          setTimeout(() => icon.classList.remove("basket-pulse"), 300);
        }
      };
    });
  }

  renderTable();
}

});