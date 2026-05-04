---
layout: default
title: Home
nav_order: 1
classes: home-page
---

<div class="home-page">

  <!-- ========================= -->
  <!-- HERO BANNER               -->
  <!-- ========================= -->
  <div class="hero-banner">
    <h1>Welcome to the NSHD Data Dictionary</h1>
    <p>Explore variables, metadata, and documentation for the NSHD study.</p>
  </div>

  <!-- ========================= -->
  <!-- SIDEBAR SUMMARY           -->
  <!-- ========================= -->
  <aside class="sidebar-summary">
    <h3>On this page</h3>
    <ul>
      <li><a href="#about"   class="sidebar-link">📘 About This Resource</a></li>
      <li><a href="#coverage" class="sidebar-link">📊 Data Coverage</a></li>
      <li><a href="#howto"   class="sidebar-link">🧭 How to Use This Site</a></li>
      <li><a href="#search"  class="sidebar-link">🔍 Search Methods</a></li>
      <li><a href="#access"  class="sidebar-link">🔐 Access & Permissions</a></li>
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
      across decades of longitudinal follow-up.
    </p>
  </div>

  <!-- ========================= -->
  <!-- 2. DATA COVERAGE          -->
  <!-- ========================= -->
  <div class="home-section" id="coverage">
    <h2>Data Coverage</h2>
    <p>
      The dictionary spans a wide range of domains including clinical assessments, cognitive testing,
      biological assays, lifestyle questionnaires, and socioeconomic measures.
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
    </p>
  </div>

  <!-- ========================= -->
  <!-- 4. SEARCH METHODS         -->
  <!-- ========================= -->
  <div class="home-section" id="search">
    <h2>Search Methods</h2>

    <section class="search-methods">

      <h2>1. Data Dictionary Search</h2>
      <p>
        The Data Dictionary search is designed specifically for exploring NSHD variables and their associated metadata.
      </p>

      <h2>2. Category‑Based Browsing</h2>
      <p>
        Category‑based browsing provides a structured, hierarchical way to explore the dataset without relying on keywords.
      </p>

      <h2>3. Popular Variables</h2>
      <p>
        The Popular Variables tool highlights variables most frequently selected by researchers.
      </p>

      <h2>4. Global Site Search</h2>
      <p>
        The global site search scans all documentation pages using a Lunr.js index.
      </p>

    </section>
  </div>

  <!-- ========================= -->
  <!-- 5. ACCESS & PERMISSIONS   -->
  <!-- ========================= -->
  <div class="home-section" id="access">
    <h2>Access & Permissions</h2>
    <p>
      Some variables may not be publicly displayed due to data sensitivity or access restrictions.
      If you believe a variable should be visible or require access to restricted data, please contact
      the NSHD data access team directly for further guidance.
    </p>
  </div>

</div>

<style>
/* -----------------------------------------
   HOME PAGE — FIXED LAYOUT + THEME
   ----------------------------------------- */

.home-page {
  max-width: 900px;
  margin-left: 0;
  margin-right: 0;
  padding-right: 0px;
  position: relative;
}

/* HERO BANNER */
.hero-banner {
  background: linear-gradient(135deg,
    #E8F5E9,
    #F3E5F5,
    #FFF3E0,
    #E0F7FA
  );
  border-radius: 12px;
  padding: 26px 30px;
  margin-bottom: 28px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.hero-banner h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 800;
  color: #2b004d;
}

.hero-banner p {
  margin: 0;
  font-size: 16px;
  color: #333;
}

/* SIDEBAR SUMMARY */
.sidebar-summary {
  position: fixed;
  right: 40px;
  top: 140px;
  width: 230px;
  background: linear-gradient(135deg,
    #E8F5E9,
    #F3E5F5,
    #FFF3E0,
    #E0F7FA
  );
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  padding: 16px 18px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
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
  display: block;
  padding: 4px 8px;
  border-radius: 6px;
  color: #4b067a;
  text-decoration: none;
  font-size: 14px;
}

.sidebar-summary a:hover {
  background: rgba(255,255,255,0.6);
  text-decoration: underline;
}

.sidebar-summary a.active {
  background: rgba(255,255,255,0.9);
  border-left: 3px solid #6a0dad;
  font-weight: 700;
}

/* Hide sidebar on mobile */
@media (max-width: 1100px) {
  .sidebar-summary {
    display: none;
  }
  .home-page {
    padding-right: 0 !important;
  }
}

/* SECTION CARDS */
.home-section {
  background: #faf7ff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 8px;
  padding: 1px 20px;
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
  max-width: 860px !important;
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

<script>
// Active section highlighting
document.addEventListener('DOMContentLoaded', function () {
  const sections = document.querySelectorAll('.home-section[id]');
  const links = document.querySelectorAll('.sidebar-link');

  const map = {};
  links.forEach(link => {
    const id = link.getAttribute('href').substring(1);
    map[id] = link;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        map[id].classList.add('active');
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(section => observer.observe(section));
});
</script>

<script src="/OWL/assets/js/basket_header.js"></script>