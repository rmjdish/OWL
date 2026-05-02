---
layout: default
title: Basket
nav_order: 0
nav_exclude: true
classes: page-baskets
---

<div class="page-baskets">


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

<script src="/OWL/assets/js/baskets.js"></script>

</div>