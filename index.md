---
layout: default
title: Home
nav_order: 1
classes: home-page
---

<div class="home-page">

  <h2>About This Resource</h2>
  <p>
    The NSHD Data Dictionary is a comprehensive metadata browser for the 1946 British birth cohort study.
    It provides researchers with detailed information about the variables, assays, and data collected
    across decades of longitudinal follow-up, serving as a comprehensive reference for all data held within the cohort.
  </p>

  <h2>Data Coverage</h2>
  <p>
    The dictionary spans a wide range of domains including clinical assessments, cognitive testing,
    biological assays, lifestyle questionnaires, and socioeconomic measures. Variables are organised
    into categories and subcategories, making it straightforward to locate data from specific sweeps
    or topic areas across the cohort's history.
  </p>

  <h2>How to Use This Site</h2>
  <p>
	Use the navigation panel on the left to browse categories of variables. Each category contains 
	detailed metadata including variable labels, field IDs, and links to further documentation. 
	You can search and filter within any category to find the variables most relevant to your research, 
	or use the Data Dictionary search tool to query the entire metadata repository at once, allowing you 
	to quickly locate specific variables, concepts, or keywords across all topics and sweeps.
  </p>

<section class="search-methods">

  <!-- ========================================================= -->
  <!-- 1. GLOBAL SITE SEARCH -->
  <!-- ========================================================= -->
  <h2>1. Global Site Search</h2>
  <p>
    The global site search is the fastest way to navigate the entire documentation set when you are looking for a specific concept, page, or keyword. Located in the site header, this search bar uses a pre‑built Lunr.js index to scan all page titles, headings, and body text across the whole Just the Docs site. This makes it ideal for broad discovery, especially when you are unsure which section contains the information you need. Because the search index is generated automatically during site build, results appear instantly as you type, without requiring any server‑side processing. This ensures consistently fast performance, even on large documentation sites.
  </p>
  <p>
    Global search is particularly useful when you want to jump directly to a known topic or when you need to explore multiple areas of the documentation at once. For example, searching for “blood pressure” will return pages from the Data Dictionary, variable metadata, methodology notes, and any related guidance pages. This makes it a powerful tool for users who prefer a keyword‑driven approach rather than navigating through menus or categories. Because it searches the entire site, it is the best method for locating high‑level explanations, conceptual overviews, and cross‑cutting documentation that may not appear in dataset‑specific tools.
  </p>

  <!-- ========================================================= -->
  <!-- 2. DATA DICTIONARY SEARCH -->
  <!-- ========================================================= -->
  <h2>2. Data Dictionary Search</h2>
  <p>
    The Data Dictionary search is designed specifically for exploring NSHD variables and their associated metadata. Unlike the global site search, which scans documentation pages, this search operates directly on the structured dataset. It examines variable names, labels, descriptions, categories, and all metadata fields, making it highly effective for identifying variables based on keywords or partial matches. This method is ideal for researchers who need to locate variables related to a specific concept, measurement, or domain. Because the search is applied to the dataset itself, it can surface variables that may not be mentioned explicitly in the written documentation.
  </p>
  <p>
    One of the strengths of the Data Dictionary search is its ability to work in combination with the filter panel. Users can apply topic or subtopic filters and then refine the results further using text search. This layered approach allows for precise narrowing of the dataset, ensuring that only variables matching all criteria are displayed. The search updates instantly as you type, providing immediate feedback and helping you explore the dataset interactively. This makes it especially valuable when working with large variable collections, where manual browsing would be time‑consuming. Overall, the Data Dictionary search is the most powerful method for detailed variable‑level exploration.
  </p>

  <!-- ========================================================= -->
  <!-- 3. CATEGORY‑BASED BROWSING -->
  <!-- ========================================================= -->
  <h2>3. Category‑Based Browsing</h2>
  <p>
    Category‑based browsing provides a structured, hierarchical way to explore the dataset without relying on keywords. Variables are grouped into meaningful themes such as demographics, lifestyle, clinical measures, and biological markers. This method is ideal for users who prefer to navigate conceptually, especially when they are not searching for a specific variable name but instead want to understand the broader structure of the dataset. By expanding categories and subcategories, users can quickly see which variables belong to each domain and how different areas of the dataset relate to one another.
  </p>
  <p>
    This browsing method is particularly helpful for new users who are still learning how the dataset is organised. It allows them to explore related variables within a domain, identify patterns, and gain a clearer understanding of the dataset’s thematic structure. Category‑based browsing also supports exploratory research, where users may not yet know which variables are relevant but want to scan the available options. Because it presents variables in a logical, curated order, it reduces the cognitive load compared to keyword search and helps users discover variables they might not have known to search for directly.
  </p>

  <!-- ========================================================= -->
  <!-- 4. POPULAR VARIABLES -->
  <!-- ========================================================= -->
  <h2>4. Popular Variables</h2>
  <p>
    The Popular Variables tool provides a data‑driven way to explore the variables most frequently selected by researchers across recent projects. Instead of relying on keywords or categories, this method highlights variables that have been added to baskets most often, offering insight into which measures are commonly used, trusted, or considered essential within the research community. This can be especially useful for new users who want to understand which variables are widely adopted or for experienced users who want to ensure they are not overlooking commonly used measures. The Popular Variables table includes counts, labels, and direct links to metadata pages, making it easy to explore each variable in more detail.
  </p>
  <p>
    Because the Popular Variables list is generated from real usage patterns, it serves as a practical guide for identifying high‑value variables. Users can sort the table, adjust page size, and filter results to focus on specific areas of interest. This method is particularly helpful when planning a new project, as it provides a quick overview of variables that are frequently included in analyses. It also complements the other search methods by offering a usage‑based perspective rather than a structural or keyword‑based one. For many users, the Popular Variables tool becomes a starting point for exploring the dataset, helping them quickly identify reliable and widely used measures.
  </p>

</section>



  <h2>Access and Permissions</h2>
  <p>
    Some variables may not be publicly displayed due to data sensitivity or access restrictions.
    If you believe a variable should be visible or require access to restricted data, please contact
    the NSHD data access team directly for further guidance.
  </p>

</div>

<style>
/* -----------------------------------------
   HOME PAGE — SCOPED STYLING ONLY FOR THIS PAGE
   ----------------------------------------- */

.home-page h1 {
  font-size: 28px !important;
  font-weight: bold !important;
  color: #333 !important;
  margin-top: 10px !important;
  text-decoration: underline !important;
  text-underline-offset: 4px !important;
}

.home-page h2 {
  font-size: 22px !important;
  font-weight: bold !important;
  color: #444 !important;
  margin-top: 30px !important;
}

.home-page p {
  max-width: 750px !important;
  line-height: 1.65 !important;
  margin-bottom: 15px !important;
  color: #333 !important;
}

.home-page {
  padding-bottom: 20px !important;
}
</style>

<script src="/OWL/assets/js/basket_header.js"></script>