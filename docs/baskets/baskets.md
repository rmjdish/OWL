---
layout: default
title: Basket
nav_order: 0
nav_exclude: true
classes: page-baskets
---

<h1>Variable Basket</h1>

<p>
  You have <span id="basketCountPage">0</span> variables in your basket.
</p>

<!-- Results count box -->
<div id="basketResultsCount" class="results-count-box"></div>

<div id="basketPaginationTop" class="basket-pagination"></div>

<div style="margin-bottom: 12px;">
  <label for="basketPageSize">Results per page:</label>
  <select id="basketPageSize">
    <option value="10">10</option>
    <option value="30">30</option>
    <option value="50">50</option>
    <option value="100">100</option>
  </select>

  <button id="clearBasketBtn">Clear Basket</button>
  <button id="downloadBasketCsvBtn">Download Basket (CSV)</button>
</div>


<table id="basketTable">
	<thead>
	  <tr>
		<th>Remove</th>	
		<th data-sort="varName">NSHD Variable Name</th>
		<th data-sort="label">Variable label</th>
	  </tr>
	</thead>
  <tbody></tbody>
</table>

<!-- Pagination (bottom) -->
<div id="basketPaginationBottom" class="basket-pagination"></div>


<script>
if (typeof loadBasket === "undefined") {
  document.write('<script src="/OWL/assets/js/basket_header.js"><\/script>');
}
</script>

<script>
{% raw %}
window.addEventListener("load", function () {

  let basketPage = 1;
  let basketPageSize = 10;

  let basketSortColumn = null;
  let basketSortDirection = "asc";

  function sortBasketData(data) {
    if (!basketSortColumn) return data;

    return data.slice().sort((a, b) => {
      let valA = a[basketSortColumn] || "";
      let valB = b[basketSortColumn] || "";

      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();

      if (valA < valB) return basketSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return basketSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  const pageSizeSelect = document.getElementById("basketPageSize");
  if (pageSizeSelect) {
    pageSizeSelect.value = basketPageSize;
    pageSizeSelect.addEventListener("change", function (e) {
      basketPageSize = Number(e.target.value);
      basketPage = 1;
      renderBasket();
      renderBasketPagination();
      updateBasketResultsCount();
    });
  }

  function updateBasketResultsCount() {
    const basket = loadBasket();
    const total = basket.length;

    const start = (basketPage - 1) * basketPageSize;
    const end = Math.min(start + basketPageSize, total);

    document.getElementById("basketResultsCount").textContent =
      `Showing ${total === 0 ? 0 : start + 1}-${end} of ${total} results`;
  }

  function renderBasketPagination() {
    const basket = loadBasket();
    const totalPages = Math.ceil(basket.length / basketPageSize) || 1;

    const html = `
      <button ${basketPage === 1 ? "disabled" : ""} onclick="changeBasketPage(-1)">Prev</button>
      <span>Page ${basketPage} of ${totalPages}</span>
      <button ${basketPage === totalPages ? "disabled" : ""} onclick="changeBasketPage(1)">Next</button>
    `;

    document.getElementById("basketPaginationTop").innerHTML = html;
    document.getElementById("basketPaginationBottom").innerHTML = html;
  }

  window.changeBasketPage = function (delta) {
    basketPage += delta;
    renderBasket();
    renderBasketPagination();
    updateBasketResultsCount();
  };

  function renderBasket() {
    let basket = loadBasket();
    basket = sortBasketData(basket);

    const tbody = document.querySelector("#basketTable tbody");
    const countEl = document.getElementById("basketCountPage");

    tbody.innerHTML = "";
    countEl.textContent = basket.length;

    const start = (basketPage - 1) * basketPageSize;
    const end = start + basketPageSize;

    basket.slice(start, end).forEach(function (item) {
      const tr = document.createElement("tr");

      const tdRemove = document.createElement("td");
      const btn = document.createElement("button");
      btn.textContent = "Remove";
      btn.addEventListener("click", function () {
        let b = loadBasket();
        b = b.filter(x => x.varName !== item.varName);
        saveBasket(b);

        const maxPage = Math.ceil(b.length / basketPageSize) || 1;
        if (basketPage > maxPage) basketPage = maxPage;

        renderBasket();
        renderBasketPagination();
        updateBasketResultsCount();
        updateBasketCountUI();
      });
      tdRemove.appendChild(btn);
      tr.appendChild(tdRemove);

      const tdName = document.createElement("td");
      tdName.textContent = item.varName;
      tr.appendChild(tdName);

      const tdLabel = document.createElement("td");
      tdLabel.textContent = item.label || "";
      tr.appendChild(tdLabel);

      tbody.appendChild(tr);
    });

    renderBasketPagination();
    updateBasketResultsCount();
  }

	function clearBasket() {
	  const confirmed = confirm("Are you sure you want to clear your basket?");

	  if (!confirmed) return;

	  saveBasket([]);
	  basketPage = 1;
	  renderBasket();
	  renderBasketPagination();
	  updateBasketResultsCount();
	  updateBasketCountUI();
	}

  function downloadBasketCSV() {
    const basket = loadBasket();
    if (!basket.length) {
      alert("Basket is empty");
      return;
    }

    const headers = ["NSHD Variable Name", "Variable label"];
    let csvContent = headers.join(",") + "\n";

    basket.forEach(function (item) {
      const row = [
        `"${String(item.varName).replace(/"/g, '""')}"`,
        `"${String(item.label || "").replace(/"/g, '""')}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "NSHD_Variable_Basket.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  document.getElementById("clearBasketBtn").addEventListener("click", clearBasket);
  document.getElementById("downloadBasketCsvBtn").addEventListener("click", downloadBasketCSV);

  document.querySelectorAll("th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-sort");

      if (basketSortColumn === col) {
        basketSortDirection = basketSortDirection === "asc" ? "desc" : "asc";
      } else {
        basketSortColumn = col;
        basketSortDirection = "asc";
      }

      document.querySelectorAll("th[data-sort]").forEach(h => {
        h.classList.remove("asc", "desc");
      });
      th.classList.add(basketSortDirection);

      renderBasket();
      renderBasketPagination();
      updateBasketResultsCount();
    });
  });

  renderBasket();

});
{% endraw %}
</script>