---
layout: default
title: Search Data Dictionary
nav_order: 2
classes: page-search-data-dictionary
---

<div class="page-search-data-dictionary">

<!-- ⭐ LOADING SCREEN (shown before data loads) -->
<div id="loadingScreen" class="loading-screen">
  <div class="spinner"></div>
  <div>Loading data…</div>
</div>

<!-- ⭐ MAIN UI (hidden until data loads) -->
<div id="dataUI" style="display:none;">

<div id="data-dictionary-app">

  <!-- FILTER BAR -->
<div id="filter-box" class="filter-box">
  <div class="filter-box-inner">
    <div class="filter-title">Filters</div>
    <div id="filter-bar" class="filter-bar"></div>
  </div>
</div>

  <!-- SEARCH + PAGE SIZE + RESET + PAGINATION -->
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
	<a href="NSHD_Data_Dictionary-Public.xlsx" download class="download-excel-btn">Download Data Dictionary</a>	<div id="paginationTop"></div>
  </div>

  <!-- TABLE WRAPPER -->
  <div id="table-wrapper">
    <table id="myTable">
      <thead>
        <tr id="table-header"></tr>
      </thead>
      <tbody id="table-body"></tbody>
    </table>
  </div>

  <!-- BOTTOM PAGINATION -->
  <div id="paginationBottom"></div>

</div>
</div> <!-- end dataUI -->

<style>

/* ⭐ LOADING SCREEN */
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  font-size: 18px;
  color: #4b067a;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #ddd;
  border-top-color: #4b067a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* TABLE BASE */
.page-search-data-dictionary #myTable {
  width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-family: Arial, sans-serif;
  font-size: 14px;
}

/* This allows the table to compress even further on small screens. */
@media (max-width: 700px) {
  #myTable col {
    width: auto !important;
  }
}


/* ⭐ FILTER BOX CONTAINER */
.page-search-data-dictionary .filter-box {
  background: #ffffff;          /* white box */
  border: 1px solid #ccc;       /* subtle border */
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08); /* soft shadow */
}

/* ⭐ FILTER BOX TITLE */
.page-search-data-dictionary .filter-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #4b067a;               /* matches your theme */
}

/* ⭐ FILTER BAR INSIDE THE BOX */
.page-search-data-dictionary .filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: nowrap;
}

/* ⭐ FILTER BOX RESPONSIVE */
.page-search-data-dictionary .filter-box {
  background: linear-gradient(
    90deg,
    #F3E5F5,
    #E8F5E9,
    #E3F2FD,
    #FFF3E0,
    #FCE4EC,
    #EDE7F6
  );
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 20px;
  border: 3px solid transparent;
  border-image: linear-gradient(
    90deg,
    #F3E5F5,
    #E8F5E9,
    #E3F2FD,
    #FFF3E0,
    #FCE4EC,
    #EDE7F6
  ) 1;
}

/* ⭐ FILTER BAR SHRINKS + WRAPS */
.page-search-data-dictionary .filter-bar {
  display: flex;
  flex-wrap: wrap;     /* <-- THIS FIXES SHRINKING */
  gap: 10px;
}

.page-search-data-dictionary .filter-bar select {
  flex: 1 1 200px;     /* <-- SHRINKS DOWN TO 200px */
  min-width: 150px;    /* <-- NEVER gets too small */
}



/* RESET BUTTON */
#resetFiltersBtn {
  margin-left: 30px;
  padding: 6px 12px;
  font-size: 14px;
  background: #4b067a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.page-search-data-dictionary .download-btn {
    margin-left: 10px;
    padding: 6px 14px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.page-search-data-dictionary .download-btn:hover {
    background: #45a049;
}


.page-search-data-dictionary .download-excel-btn {
  margin-left: 10px;
  padding: 6px 14px;
  background: #1976D2; /* blue to differentiate, or choose your colour */
  color: white;
  border-radius: 4px;
  text-decoration: none;
  font-size: 14px;
}

.page-search-data-dictionary .download-excel-btn:hover {
  background: #0F5BA5;
}



#resetFiltersBtn:hover {
  background: #36045a;
}

/* TABLE WRAPPER */
.page-search-data-dictionary #table-wrapper {
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
}

/* ⭐ STICKY HEADER */
.page-search-data-dictionary #myTable thead th {
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 0; /* padding moved into .th-inner */
  border-bottom: 2px solid #4b067a;
}

/* ⭐ HEADER INNER WRAPPER — TRANSPARENT (so pastel shows fully) */
#myTable thead th .th-inner {
  width: 100%;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  background: transparent !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* SORT ICONS */
.sort-icon {
  font-size: 12px;
  margin-left: 6px;
  opacity: 0.4;
  transition: opacity 0.2s ease;
}

.sortable-header:hover .sort-icon {
  opacity: 0.9;
}

/* BODY ROW SHADING */
.page-search-data-dictionary #myTable tbody tr:nth-child(odd) {
  background-color: #f7f7f7 !important;
}
.page-search-data-dictionary #myTable tbody tr:nth-child(even) {
  background-color: #ececec !important;
}

/* BODY CELL PADDING */
.page-search-data-dictionary #myTable td {
  padding: 6px 10px;
  vertical-align: top;
  word-wrap: break-word;
}

/* ALLOW SHRINKING */
.page-search-data-dictionary #myTable th,
.page-search-data-dictionary #myTable td {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: normal;
}

/* ⭐ RESPONSIVE COLUMN WIDTHS */
#myTable col.col-1 { width: 11%; }
#myTable col.col-2 { width: 9%; }
#myTable col.col-3 { width: 10%; }
#myTable col.col-4 { width: 50%; }
#myTable col.col-5 { width: 10%; }
#myTable col.col-6 { width: 10%; }


/* ⭐ COLUMN COLOURS — APPLY TO BOTH HEADER + BODY */
#myTable th:nth-child(1), #myTable tbody td:nth-child(1) { background: #F3E5F5 !important; }
#myTable th:nth-child(2), #myTable tbody td:nth-child(2) { background: #E8F5E9 !important; }
#myTable th:nth-child(3), #myTable tbody td:nth-child(3) { background: #E3F2FD !important; }
#myTable th:nth-child(4), #myTable tbody td:nth-child(4) { background: #FFF3E0 !important; }
#myTable th:nth-child(5), #myTable tbody td:nth-child(5) { background: #FCE4EC !important; }
#myTable th:nth-child(6), #myTable tbody td:nth-child(6) { background: #EDE7F6 !important; }


/* ⭐ HEADER TEXT + ICONS = BLACK */
#myTable thead th .header-label,
#myTable thead th .sort-icon {
  color: black !important;
}

/* ALIGNMENT */
#myTable th:nth-child(1), #myTable td:nth-child(1),
#myTable th:nth-child(3), #myTable td:nth-child(3),
#myTable th:nth-child(4), #myTable td:nth-child(4),  
#myTable th:nth-child(4), #myTable td:nth-child(5) { 
  text-align: left !important; 
}

#myTable th:nth-child(2), #myTable td:nth-child(2),
#myTable th:nth-child(6), #myTable td:nth-child(6) {
  text-align: center !important;
}

/* ⭐ GLOBAL RESPONSIVE SHRINKING */
.page-search-data-dictionary {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

.page-search-data-dictionary * {
  box-sizing: border-box;
}


</style>

<script src="/data_dict/assets/js/data_dictionary.js"></script>

</div>

