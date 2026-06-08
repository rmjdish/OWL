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
    <h1>Welcome to the National Survey of Health and Development (NSHD) Data Dictionary</h1>
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
  <!-- 3. SEARCH METHODS         -->
  <!-- ========================= -->
  <div class="home-section" id="search">
    <h2>Search Methods</h2>

    <section class="search-methods">

      <!-- 1. DATA DICTIONARY SEARCH -->
      <h2>1. Data Dictionary Search</h2>
      <p>
        The Data Dictionary search is designed specifically for exploring NSHD variables and their associated metadata. 
		Unlike the global site search, which scans documentation pages, this search operates directly on the structured dataset. 
		It examines variable names, labels, descriptions, categories, and all metadata fields, making it highly effective for 
		identifying variables based on keywords or partial matches. This method is ideal for researchers who need to locate variables 
		related to a specific concept, measurement, or domain. Because the search is applied to the dataset itself, it can surface 
		variables that may not be mentioned explicitly in the written documentation.
      </p>
      <p>
        One of the strengths of the Data Dictionary search is its ability to work in combination with the filter panel. Users can apply 
		topic or subtopic filters and then refine the results further using text search. This layered approach allows for precise narrowing 
		of the dataset, ensuring that only variables matching all criteria are displayed. The search updates instantly as you type, 
		providing immediate feedback and helping you explore the dataset interactively. This makes it especially valuable when working with 
		large variable collections, where manual browsing would be time‑consuming. Overall, the Data Dictionary search is the most powerful 
		method for detailed variable‑level exploration.
      </p>

      <!-- 2. CATEGORY BROWSING -->
      <h2>2. Category‑Based Browsing</h2>
      <p>
        Category‑based browsing provides a structured, hierarchical way to explore the dataset without relying on keywords. Variables are grouped 
		into meaningful themes such as demographics, lifestyle, clinical measures, and biological markers. This method is ideal for users who prefer 
		to navigate conceptually, especially when they are not searching for a specific variable name but instead want to understand the broader 
		structure of the dataset. By expanding categories and subcategories, users can quickly see which variables belong to each domain and how 
		different areas of the dataset relate to one another.
      </p>
      <p>
        This browsing method is particularly helpful for new users who are still learning how the dataset is organised. It allows them to explore 
		related variables within a domain, identify patterns, and gain a clearer understanding of the dataset’s thematic structure. Category‑based 
		browsing also supports exploratory research, where users may not yet know which variables are relevant but want to scan the available options. 
		Because it presents variables in a logical, curated order, it reduces the cognitive load compared to keyword search and helps users discover 
		variables they might not have known to search for directly.
      </p>

      <!-- 3. POPULAR VARIABLES -->
      <h2>3. Popular Variables</h2>
      <p>
        The Popular Variables tool provides a data‑driven way to explore the variables most frequently selected by researchers across recent projects. Instead of relying on keywords or categories, this method highlights variables that have been added to baskets most often, offering insight into which measures are commonly used, trusted, or considered essential within the research community. This can be especially useful for new users who want to understand which variables are widely adopted or for experienced users who want to ensure they are not overlooking commonly used measures. The Popular Variables table includes counts, labels, and direct links to metadata pages, making it easy to explore each variable in more detail.
      </p>
      <p>
        Because the Popular Variables list is generated from real usage patterns, it serves as a practical guide for identifying high‑value variables. Users can sort the table, adjust page size, and filter results to focus on specific areas of interest. This method is particularly helpful when planning a new project, as it provides a quick overview of variables that are frequently included in analyses. It also complements the other search methods by offering a usage‑based perspective rather than a structural or keyword‑based one. For many users, the Popular Variables tool becomes a starting point for exploring the dataset, helping them quickly identify reliable and widely used measures.
      </p>
	  
      <!-- 4. Explore NSHD Questionnaires -->
      <h2>4. Explore NSHD Questionnaires</h2>
      <p>
        The NSHD Questionnaires section provides a comprehensive, easy-to-navigate archive of survey instruments used throughout the National Survey of 
		Health and Development — Britain's longest-running birth cohort study, spanning from 1946 to the present day.
      </p>
      <p>
        The homepage allows visitors to browse questionnaires by decade, from the original 1946 maternity survey through to the most recent 2025 wave, 
		with colour-coded pills distinguishing general surveys, Women's Health studies, and Covid-era questionnaires. Researchers can also filter by 
		respondent type — including study members, mothers, school doctors, and teachers — making it straightforward to locate the exact instruments 
		relevant to their work.
      </p>
      <p>
        Each detailed questionnaire page provides full context including responding population figures, data collection methods, topics covered, and 
		downloadable PDF versions of every questionnaire used. Variable names are annotated directly on the PDFs, linking survey questions to the data 
		held in the NSHD Data Dictionary.
      </p>

      <!-- 5. GLOBAL SITE SEARCH -->
      <h2>5. Global Site Search</h2>
      <p>
        The global site search is the fastest way to navigate the entire documentation set when you are looking for a specific concept, page, or keyword. Located in the site header, this search bar uses a pre‑built Lunr.js index to scan all page titles, headings, and body text across the whole Just the Docs site. This makes it ideal for broad discovery, especially when you are unsure which section contains the information you need. Because the search index is generated automatically during site build, results appear instantly as you type, without requiring any server‑side processing. This ensures consistently fast performance, even on large documentation sites.
      </p>
      <p>
        Global search is particularly useful when you want to jump directly to a known topic or when you need to explore multiple areas of the documentation at once. For example, searching for “blood pressure” will return pages from the Data Dictionary, variable metadata, methodology notes, and any related guidance pages. This makes it a powerful tool for users who prefer a keyword‑driven approach rather than navigating through menus or categories. Because it searches the entire site, it is the best method for locating high‑level explanations, conceptual overviews, and cross‑cutting documentation that may not appear in dataset‑specific tools.
      </p>

    </section>
  </div>

  <!-- ========================= -->
  <!-- 4. ACCESS & PERMISSIONS   -->
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