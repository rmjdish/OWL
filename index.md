---
layout: default
title: Home
nav_order: 1
classes: home-page
---

<div class="home-page">

  <!-- ========================= -->
  <!-- SIDEBAR SUMMARY           -->
  <!-- ========================= -->
  <aside class="sidebar-summary">
    <h3>On this page</h3>
    <ul>
      <li><a href="#about">About This Resource</a></li>
      <li><a href="#coverage">Data Coverage</a></li>
      <li><a href="#howto">How to Use This Site</a></li>
      <li><a href="#search">Search Methods</a></li>
      <li><a href="#access">Access & Permissions</a></li>
    </ul>
  </aside>

  <!-- ========================= -->
  <!-- 1. ABOUT THIS RESOURCE    -->
  <!-- ========================= -->
  <div class="home-section" id="about">
    <h2>About This Resource</h2>
    <p>
      The NSHD Data Dictionary is a comprehensive metadata browser for the 1946 British birth cohort study.
      It provides researchers with detailed information about the variables, assays, and data collected
      across decades of longitudinal follow-up, serving as a comprehensive reference for all data held within the cohort.
    </p>
  </div>

  <!-- ========================= -->
  <!-- 2. DATA COVERAGE          -->
  <!-- ========================= -->
  <div class="home-section" id="coverage">
    <h2>Data Coverage</h2>
    <p>
      The dictionary spans a wide range of domains including clinical assessments, cognitive testing,
      biological assays, lifestyle questionnaires, and socioeconomic measures. Variables are organised
      into categories and subcategories, making it straightforward to locate data from specific sweeps
      or topic areas across the cohort's history.
    </p>
  </div>

  <!-- ========================= -->
  <!-- 3. HOW TO USE THIS SITE   -->
  <!-- ========================= -->
  <div class="home-section" id="howto">
    <h2>How to Use This Site</h2>
    <p>
      Use the navigation panel on the left to browse categories of variables. Each category contains 
      detailed metadata including variable labels, field IDs, and links to further documentation. 
      You can search and filter within any category to find the variables most relevant to your research, 
      or use the Data Dictionary search tool to query the entire metadata repository at once, allowing you 
      to quickly locate specific variables, concepts, or keywords across all topics and sweeps.
    </p>
  </div>

  <!-- ========================= -->
  <!-- 4. SEARCH METHODS         -->
  <!-- ========================= -->
  <div class="home-section" id="search">
    <h2>Search Methods</h2>

    <section class="search-methods">

      <h2>1. Global Site Search</h2>
      <p>… your text …</p>
      <p>… your text …</p>

      <h2>2. Data Dictionary Search</h2>
      <p>… your text …</p>
      <p>… your text …</p>

      <h2>3. Category‑Based Browsing</h2>
      <p>… your text …</p>
      <p>… your text …</p>

      <h2>4. Popular Variables</h2>
      <p>… your text …</p>
      <p>… your text …</p>

    </section>
  </div>

  <!-- ========================= -->
  <!-- 5. ACCESS & PERMISSIONS   -->
  <!-- ========================= -->
  <div class="home-section" id="access">
    <h2>Access and Permissions</h2>
    <p>
      Some variables may not be publicly displayed due to data sensitivity or access restrictions.
      If you believe a variable should be visible or require access to restricted data, please contact
      the NSHD data access team directly for further guidance.
    </p>
  </div>

</div>

<style>
/* -----------------------------------------
   HOME PAGE — THEME MATCHED STYLING
   ----------------------------------------- */

.home-page {
  padding-bottom: 30px !important;
  max-width: 900px;
  position: relative;
}

/* ========================= */
/* SIDEBAR SUMMARY           */
/* ========================= */
.sidebar-summary {
  position: fixed;
  right: 40px;
  top: 140px;
  width: 220px;
  background: #faf7ff;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  padding: 16px 18px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.sidebar-summary h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #3a0066;
  border-bottom: 2px solid #6a0dad;
  padding-bottom: 4px;
}

.sidebar-summary ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

.sidebar-summary li {
  margin-bottom: 8px;
}

.sidebar-summary a {
  color: #4b067a;
  text-decoration: none;
  font-size: 14px;
}

.sidebar-summary a:hover {
  text-decoration: underline;
}

/* Hide sidebar on mobile */
@media (max-width: 1100px) {
  .sidebar-summary {
    display: none;
  }
}

/* ========================= */
/* SECTION CARDS             */
/* ========================= */
.home-section {
  background: #faf7ff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 8px;
  padding: 22px 26px;
  margin-bottom: 28px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.home-section h2 {
  font-size: 24px !important;
  font-weight: 700 !important;
  color: #3a0066 !important;
  margin-top: 0 !important;
  margin-bottom: 14px !important;
  border-bottom: 2px solid #6a0dad !important;
  padding-bottom: 6px !important;
}

.home-section p {
  max-width: 780px !important;
  line-height: 1.65 !important;
  margin-bottom: 14px !important;
  color: #333 !important;
}

/* Search methods sub‑headers */
.search-methods h2 {
  font-size: 20px !important;
  margin-top: 22px !important;
  color: #4b067a !important;
  border-bottom: 1px solid rgba(0,0,0,0.1) !important;
  padding-bottom: 4px !important;
}

.search-methods p {
  margin-bottom: 14px !important;
  color: #333 !important;
}
</style>

<script src="/OWL/assets/js/basket_header.js"></script>