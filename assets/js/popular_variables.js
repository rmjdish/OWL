document.addEventListener("DOMContentLoaded", () => {

console.log("Popular vars table script starting…");

// Load BOTH datasets
Promise.all([
  fetch("popular_vars_all.json").then(r => {
    console.log("popular_vars_all.json status:", r.status);
    return r.json();
  }),
  fetch("NSHD_Data_Dictionary_Public.json").then(r => {
    console.log("NSHD_Data_Dictionary_Public.json status:", r.status);
    return r.json();
  })
])
.then(([popular, labels]) => {

  console.log("Popular loaded:", popular);
  console.log("Labels loaded:", labels);

  const labelMap = {};
  labels.forEach(row => {
    labelMap[row["NSHD Variable Name"]] = row["Variable Label"];
  });

  const merged = popular.map(row => ({
    name: row.name,
    label: labelMap[row.name] || "(no label found)",
    count: row.count
  }));

  buildTable(merged.slice(0, 1000));
})
.catch(err => {
  console.error("Error loading JSON:", err);
  document.getElementById("table-container").innerHTML =
    "<p>Failed to load data.</p>";
});

function buildTable(data) {
  const container = document.getElementById("table-container");

  container.innerHTML = `
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

    <div class="pagination-controls">
      <div>
        Show 
        <select id="page-size">
          <option value="15">15</option>
          <option value="30">30</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        rows
      </div>
      <div id="pagination-buttons"></div>
    </div>
  `;

  let sortColumn = null;
  let sortAsc = true;
  let pageSize = 15;
  let currentPage = 1;

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

    const start = (currentPage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);

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

    renderPagination(sorted.length);
    attachBasketEvents();
  }

  function renderPagination(totalRows) {
    const totalPages = Math.ceil(totalRows / pageSize);
    const buttons = [];

    for (let i = 1; i <= totalPages; i++) {
      buttons.push(`<button class="page-btn" data-page="${i}">${i}</button>`);
    }

    document.getElementById("pagination-buttons").innerHTML = buttons.join("");

    document.querySelectorAll(".page-btn").forEach(btn => {
      btn.onclick = () => {
        currentPage = parseInt(btn.dataset.page);
        renderTable();
      };
    });
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

  document.getElementById("page-size").onchange = e => {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
  };

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