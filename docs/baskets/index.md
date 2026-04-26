---
layout: default
title: Basket
nav_order: 0
---

<h1>Variable Basket</h1>

<p>
  You have <span id="basketCountPage">0</span> variables in your basket.
</p>

<button id="clearBasketBtn">Clear Basket</button>
<button id="downloadBasketCsvBtn">Download Basket (CSV)</button>

<table id="basketTable">
  <thead>
    <tr>
      <th>NSHD Variable Name</th>
      <th>Variable label</th>
      <th>Remove</th>
    </tr>
  </thead>
  <tbody></tbody>
</table>

<script>
// Use global BASKET_KEY, loadBasket(), saveBasket(), updateBasketCountUI()

function renderBasket() {
  const basket = loadBasket();
  const tbody = document.querySelector("#basketTable tbody");
  const countEl = document.getElementById("basketCountPage");
  tbody.innerHTML = "";
  countEl.textContent = basket.length;

  basket.forEach(item => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = item.varName;
    tr.appendChild(tdName);

    const tdLabel = document.createElement("td");
    tdLabel.textContent = item.label || "";
    tr.appendChild(tdLabel);

    const tdRemove = document.createElement("td");
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.addEventListener("click", () => {
      let b = loadBasket();
      b = b.filter(x => x.varName !== item.varName);
      saveBasket(b);
      renderBasket();
      updateBasketCountUI();
    });
    tdRemove.appendChild(btn);
    tr.appendChild(tdRemove);

    tbody.appendChild(tr);
  });
}

function clearBasket() {
  saveBasket([]);
  renderBasket();
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

  basket.forEach(item => {
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
</script>