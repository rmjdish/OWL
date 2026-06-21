/* ============================================================
   OWL — Explore Topics
   /OWL/assets/js/topics.js

   1. Loads Tabler Icons webfont from CDN
   2. Injects data-nav-icon on every sidebar nav link by
      matching the link text to an icon map
   3. Injects <i class="ti ti-X"> into h2 headings that have
      a data-icon attribute (set in the markdown via HTML)
   4. Sidebar summary scroll-spy — highlights active section
   ============================================================ */

(function () {
  "use strict";

  /* ── 1. Load Tabler Icons webfont ────────────────────────── */
  var TABLER_CDN =
    "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css";
  if (!document.querySelector('link[href*="tabler-icons"]')) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = TABLER_CDN;
    document.head.appendChild(link);
  }

  /* ── 2. Nav icon map ─────────────────────────────────────── */
  /* Keys are lowercase fragments of the link text.
     Values are Tabler icon names (outline set). */
  var NAV_ICONS = {
    /* Top-level pages */
    "home":                         "ti-home",
    "getting started":              "ti-compass",
    "where should i start":         "ti-traffic-cone",
    "how the site is organised":    "ti-map",
    "basket management":            "ti-basket-cog",
    "cohort jargon":                "ti-book-2",
    "search data dictionary":       "ti-search",
    "browse by category":           "ti-layout-grid",
    "view popular variables":       "ti-star",
    /* Section labels handled separately */
    /* Questionnaire waves */
    "explore nshd questionnaires":  "ti-clipboard-list",
    "1946":                         "ti-calendar",
    "1947":                         "ti-calendar",
    "1948":                         "ti-calendar",
    "1950":                         "ti-calendar",
    "1952":                         "ti-calendar",
    "1953":                         "ti-calendar",
    "1954":                         "ti-calendar",
    "1955":                         "ti-calendar",
    "1956":                         "ti-calendar",
    "1957":                         "ti-calendar",
    "1959":                         "ti-calendar",
    "1961":                         "ti-calendar",
    "1962":                         "ti-calendar",
    "1963":                         "ti-calendar",
    "1964":                         "ti-calendar",
    "1965":                         "ti-calendar",
    "1954":                         "ti-calendar",
    "1966-67":                      "ti-calendar",
    "1968":                         "ti-calendar",
    "1969":                         "ti-calendar",
    "1970":                         "ti-calendar",
    "1971":                         "ti-calendar",
    "1972":                         "ti-calendar",
    "1977":                         "ti-calendar",
    "1982":                         "ti-calendar",
    "1985":                         "ti-calendar",
    "1989":                         "ti-calendar",
    "1993":                         "ti-calendar",
    "1994":                         "ti-calendar",
    "1995":                         "ti-calendar",
    "1996":                         "ti-calendar",
    "1997":                         "ti-calendar",
    "1998":                         "ti-calendar",
    "1999":                         "ti-calendar",
    "1993":                         "ti-calendar",
    "2000":                         "ti-calendar",
    "2003":                         "ti-calendar",
    "2005":                         "ti-calendar",
    "2008":                         "ti-calendar",
    "2010":                         "ti-calendar",
    "2014":                         "ti-calendar",
    "2015":                         "ti-calendar",
    "2018":                         "ti-calendar",
    "2019":                         "ti-calendar",
    "2020":                         "ti-calendar",
    "2022":                         "ti-calendar",
    /* Topic pages */
    "explore topics":               "ti-tags",
    "childhood health":             "ti-baby-carriage",
    "adult physical health":        "ti-heart-rate-monitor",
    "adult mental health":          "ti-brain",
    "adult health behaviours":      "ti-activity",
    "anthropometry":                "ti-ruler-measure",
    "lifetime social":              "ti-users",
    "biological samples":           "ti-test-pipe",
    "dna":                          "ti-dna",
    "structural assessments":       "ti-scan",
    "insight 46":                   "ti-microscope",
    "clinic visit":                 "ti-stethoscope",
    /* Sub-topics */
    "smoking":                      "ti-smoking-no",
    "drinking":                     "ti-beer-off",
    "alcohol":                      "ti-beer-off",
    "diet and nutrition":           "ti-salad",
    "physical activity":            "ti-run",
    "childhood cognitive":          "ti-bulb",
    "developmental milestones":     "ti-chart-line",
    "parental bonding":             "ti-heart-handshake",
    "parental information":         "ti-user-heart",
    "childhood diet":               "ti-apple",
    "puberty":                      "ti-arrows-vertical",
    "childhood mental":             "ti-mood-happy",
    "general health":               "ti-shield-heart",
    "respiratory":                  "ti-lungs",
    "cardiovascular":               "ti-heart",
    "diabetes":                     "ti-droplet",
    "physical capability":          "ti-barbell",
    "urinary":                      "ti-droplet-half-2",
    "medication":                   "ti-pill",
    "cognitive function":           "ti-brain",
    "mental health and wellbeing":  "ti-mood-smile",
    "education":                    "ti-school",
    "employment":                   "ti-briefcase",
    "housing":                      "ti-home-2",
    "marital":                      "ti-rings-wedding",
    "social networks":              "ti-network",
    "fertility":                    "ti-baby",
    "household":                    "ti-building-community",
    "life events":                  "ti-calendar-event",
    "menopause":                    "ti-gender-female",
    "social class":                 "ti-award",
	"nursery": 					    "ti-lego",
	"bedwetting":     				"ti-bed",
	"early-indicators":				"ti-gauge",
	"marital":      				"ti-rings",
	};

  /* ── 3. Section heading icon map ─────────────────────────── */
  /* Maps h2 text fragments → Tabler icon class */
  var HEADING_ICONS = {
    "main topics":              "ti-list",
    "sub-topics":               "ti-list-tree",
    "research visit":           "ti-building-hospital",
    "protocol papers":          "ti-file-description",
    "accessing insight":        "ti-database",
    "physical growth":          "ti-trending-up",
    "height and weight":        "ti-ruler",
    "body size":                "ti-body-scan",
    "parental height":          "ti-users",
    "selected publications":    "ti-books",
    "blood":                    "ti-test-pipe",
    "urine":                    "ti-flask",
    "saliva":                   "ti-droplet",
    "biomarkers":               "ti-chart-dots",
    "age 53":                   "ti-calendar-stats",
    "age 60":                   "ti-calendar-stats",
    "age 68":                   "ti-calendar-stats",
    "age 76":                   "ti-calendar-stats",
    "background":               "ti-info-circle",
    "dna":                      "ti-dna",
    "about":                    "ti-info-circle",
    "default":                  "ti-chevron-right",
  };

  /* helper: find best icon for a string */
  function findIcon(map, text) {
    var t = (text || "").toLowerCase().trim();
    for (var key in map) {
      if (t.indexOf(key) !== -1) return map[key];
    }
    return null;
  }

  /* ── 4. Inject icons into sidebar nav links ──────────────── */
  function injectNavIcons() {
    var links = document.querySelectorAll(".site-nav .nav-list-link");
    links.forEach(function (a) {
      var text = a.textContent || "";
      var icon = findIcon(NAV_ICONS, text);
      if (!icon) return;
      /* avoid double injection */
      if (a.querySelector("i.ti")) return;
      var i = document.createElement("i");
      i.className = "ti " + icon;
      i.setAttribute("aria-hidden", "true");
      i.style.cssText =
        "font-size:14px;vertical-align:-2px;margin-right:6px;opacity:0.8;";
      a.insertBefore(i, a.firstChild);
    });
  }

  /* ── 5. Inject icons into h2 section headings ────────────── */
  function injectHeadingIcons() {
    var headings = document.querySelectorAll(
      ".page-topics .main-content h2, .page-topics .page-content h2"
    );
    headings.forEach(function (h) {
      if (h.querySelector("i.ti")) return;
      var text = h.textContent || "";
      var icon = findIcon(HEADING_ICONS, text) || "ti-chevron-right";
      var i = document.createElement("i");
      i.className = "ti " + icon;
      i.setAttribute("aria-hidden", "true");
      i.style.cssText =
        "font-size:18px;vertical-align:-3px;margin-right:6px;color:#6a0dad;opacity:0.85;";
      h.insertBefore(i, h.firstChild);
    });
  }

  /* ── 6. Hero banner icon ─────────────────────────────────── */
  function injectHeroIcon() {
    var h1 = document.querySelector(".page-topics .hero-banner h1");
    if (!h1 || h1.querySelector("i.ti")) return;
    var page = document.body.className || "";
    var icon = "ti-tags"; /* default for topics parent */
    if (page.indexOf("insight") !== -1)      icon = "ti-microscope";
    else if (page.indexOf("anthropo") !== -1) icon = "ti-ruler-measure";
    else if (page.indexOf("biological") !== -1) icon = "ti-test-pipe";
    else if (page.indexOf("childhood") !== -1) icon = "ti-baby-carriage";
    else if (page.indexOf("adult-physical") !== -1) icon = "ti-heart-rate-monitor";
    else if (page.indexOf("mental") !== -1)   icon = "ti-brain";
    else if (page.indexOf("behaviour") !== -1) icon = "ti-activity";
    else if (page.indexOf("lifetime") !== -1) icon = "ti-users";
    /* also try h1 text */
    var txt = (h1.textContent || "").toLowerCase();
    var mapped = findIcon(NAV_ICONS, txt);
    if (mapped) icon = mapped;

    var i = document.createElement("i");
    i.className = "ti " + icon;
    i.setAttribute("aria-hidden", "true");
    i.style.cssText =
      "font-size:28px;vertical-align:-4px;margin-right:8px;color:#6a0dad;opacity:0.85;";
    h1.insertBefore(i, h1.firstChild);
  }


  /* ── 7. Run everything ───────────────────────────────────── */
  function run() {
    injectNavIcons();
    injectHeadingIcons();
    injectHeroIcon();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  /* Re-run if JtD loads content dynamically */
  var obs = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      if (m.addedNodes.length) {
        injectNavIcons();
        injectHeadingIcons();
      }
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();
