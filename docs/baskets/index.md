---
layout: default
title: Basket
nav_order: 0
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
      <th>NSHD Variable Name</th>
      <th>Variable label</th>
    </tr>
  </thead>
  <tbody></tbody>
</table>

<!-- Pagination (bottom) -->
<div id="basketPaginationBottom" class="basket-pagination"></div>


<style>
/* Basket results count box */
#basketResultsCount {
  background: #f3f4f6;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 10px;
  display: inline-block;
  color: #333;
}

/* Pagination styling (same as Data Dictionary) */
.basket-pagination {
  margin: 10px 0;
}

.basket-pagination button {
  background: #e5e7eb;
  border: 1px solid #d1d5db;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.basket-pagination button:disabled {
  opacity: 0.5;
  cursor: default;
}

</style>



<script>
window.addEventListener("load", function () {

  let basketPage = 1;
  let basketPageSize = 10; // default page size

  // Handle page size dropdown
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
      `Showing ${total === 0 ? 0 : start + 1}–${end} of ${total} results`;
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
    const basket = loadBasket();
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

  renderBasket();

}); 
</script>