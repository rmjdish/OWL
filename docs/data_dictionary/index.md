---
layout: default
title: Search Data Dictionary
nav_order: 2
classes: page-search-data-dictionary
---

<div class="page-search-data-dictionary">

<!-- ⭐ LOADING SCREEN -->
<div id="loadingScreen" class="loading-screen">
  <div class="spinner"></div>
  <div>Loading data…</div>
</div>

<!-- ⭐ MAIN UI -->
<div id="dataUI" style="display:none;">

<div id="data-dictionary-app">

  <!-- FILTER BOX -->
  <div id="filter-box" class="filter-box">
    <div class="filter-box-inner">
      <div class="filter-title">Filters</div>
      <div id="filter-bar" class="filter-bar"></div>
    </div>
  </div>

  <!-- SEARCH + PAGE SIZE + RESET -->
  <div id="search-pagination-top" class="search-pagination-top">
    <div id="resultsCount"></div>
    <input id="globalSearch" type="text" placeholder="Search…" />
    <select id="pageSize">
      <option value="15">15</option>
      <option value="30">30</option>
      <option value="50">50</option>
      <option value="100">100</option>
    </select>
    <button id="resetFiltersBtn">Reset Filters</button>
    <button id="downloadCsvBtn" class="download-btn">Download Results (CSV)</button>
    <a href="NSHD_Data_Dictionary-Public.xlsx" download class="download-excel-btn">Download Data Dictionary</a>
    <div id="paginationTop"></div>
  </div>

  <!-- TABLE -->
  <div id="table-wrapper">
    <table id="myTable">
      <thead>
        <tr id="table-header"></tr>
      </thead>
      <tbody id="table-body"></tbody>
    </table>
  </div>

  <!-- PAGINATION BOTTOM -->
  <div id="paginationBottom"></div>

  <!-- ⭐ BASKET PANEL -->
  <div id="basketPanel" class="basket-panel" style="margin-top:30px; padding:15px; border:2px solid #4b067a; border-radius:8px; background:#fafafa;">
    <h3 style="margin-top:0;">Basket (<span id="basketCount">0</span>)</h3>
    <ul id="basketList" style="padding-left:20px;"></ul>

    <button id="clearBasketBtn" style="margin-right:10px; padding:6px 12px; background:#4b067a; color:white; border:none; border-radius:4px; cursor:pointer;">
      Clear Basket
    </button>

    <button id="downloadBasketBtn" style="padding:6px 12px; background:#2e7d32; color:white; border:none; border-radius:4px; cursor:pointer;">
      Download Basket (CSV)
    </button>
  </div>

</div>
</div>

<style>

/* ============================================================
   FIX: Remove duplicate <style> tags and conflicting rules
   ============================================================ */

/* Checkbox column */
#myTable th:nth-child(1),
#myTable td:nth-child(1) {
  width: 40px;
  min-width: 40px;
  max-width: 40px;
  background: white !important;
  text-align: center;
}

/* Topic */
#myTable th:nth-child(2),
#myTable td:nth-child(2) {
  width: 11%;
  background: #F3E5F5 !important;
  text-align: left;
}

/* Subtopic 1 */
#myTable th:nth-child(3),
#myTable td:nth-child(3) {
  width: 9%;
  background: #E8F5E9 !important;
  text-align: left;
}

/* Subtopic 2 */
#myTable th:nth-child(4),
#myTable td:nth-child(4) {
  width: 10%;
  background: #E3F2FD !important;
  text-align: left;
}

/* Description */
#myTable th:nth-child(5),
#myTable td:nth-child(5) {
  width: 50%;
  background: #FFF3E0 !important;
  text-align: left;
}

/* Subtopic 4 */
#myTable th:nth-child(6),
#myTable td:nth-child(6) {
  width: 10%;
  background: #FCE4EC !important;
  text-align: center;
}

/* NSHD Variable Name */
#myTable th:nth-child(7),
#myTable td:nth-child(7) {
  width: 10%;
  background: #EDE7F6 !important;
  text-align: center;
}

/* Header text */
#myTable thead th .header-label,
#myTable thead th .sort-icon {
  color: black !important;
}

/* Sticky header */
#myTable thead th {
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 2px solid #4b067a;
}

/* Row striping */
#myTable tbody tr:nth-child(odd) { background: #f7f7f7 !important; }
#myTable tbody tr:nth-child(even) { background: #ececec !important; }

/* Base table */
#myTable {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

#myTable td, #myTable th {
  padding: 6px 10px;
  word-break: break-word;
}

</style>

<script src="/OWL/assets/js/data_dictionary.js"></script>

</div>