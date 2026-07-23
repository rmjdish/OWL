/*
 * OWL — Sidebar summary section-colour highlighting
 * /OWL/assets/js/doc-sidebar-highlight.js
 *
 * Generic, page-agnostic script: colours each "On this page" sidebar
 * link to match its target section's own colour, and highlights
 * whichever section is currently scrolled into view.
 *
 * Unlike the hub pages (Getting Started, Search Overview, etc.), where
 * each sidebar link's colour is a hand-written CSS rule tied to that
 * page's own fixed, small set of section names, a generated
 * documentation page has no fixed set of section names at all — there
 * could be hundreds of these pages, each with completely different,
 * dynamically-titled sections. Hand-writing a colour rule per section
 * name isn't just more work here, it isn't really possible to maintain.
 *
 * Instead, this reads something that already exists on every one of
 * these pages regardless of what its sections are actually called: each
 * <div class="home-section"> already carries one of six gs-card-*
 * classes (search/explore/sidebar/basket/blue/lavender), cycling
 * automatically per section — visible today as that section's card
 * background colour. This script just looks up the matching sidebar
 * link for each section, reads which gs-card-* class that section has,
 * and applies the same colour family to the link — entirely generically,
 * with no per-document or per-section data needed anywhere.
 *
 * Include once, site-wide, via _includes/head_custom.html:
 *   <link rel="stylesheet" href="{{ '/assets/css/doc-sidebar-highlight.css' | relative_url }}">
 *   <script src="/OWL/assets/js/doc-sidebar-highlight.js"></script>
 *
 * No-ops harmlessly on any page without a .sidebar-summary or matching
 * .home-section elements.
 */
(function () {
  // Same six colours as getting-started.css's own gs-card-* rules,
  // darkened for text and lightened for the active-state background —
  // matching the exact convention already used throughout the site's
  // hand-written per-section sidebar colours (e.g. .so-toc-which,
  // .gs-toc-search), just derived generically here instead of hardcoded
  // per page.
  var COLOR_MAP = {
    'gs-card-search':   { text: 'hsl(180 45% 20%)', bg: 'hsl(180 45% 94%)', border: 'hsl(180 45% 45%)' },
    'gs-card-explore':  { text: 'hsl(35 60% 25%)',  bg: 'hsl(35 60% 94%)',  border: 'hsl(35 60% 45%)'  },
    'gs-card-sidebar':  { text: 'hsl(340 45% 28%)', bg: 'hsl(340 45% 95%)', border: 'hsl(340 45% 50%)' },
    'gs-card-basket':   { text: 'hsl(125 35% 20%)', bg: 'hsl(125 35% 93%)', border: 'hsl(125 35% 45%)' },
    'gs-card-blue':     { text: 'hsl(210 45% 22%)', bg: 'hsl(210 45% 94%)', border: 'hsl(210 45% 45%)' },
    'gs-card-lavender': { text: 'hsl(270 35% 25%)', bg: 'hsl(270 35% 95%)', border: 'hsl(270 35% 50%)' },
  };
  var COLOR_CLASSES = Object.keys(COLOR_MAP);

  function colorSidebarLinks() {
    var links = document.querySelectorAll('.page-topics .sidebar-summary a[href^="#"]');
    var pairs = [];
    links.forEach(function (link) {
      var id = decodeURIComponent(link.getAttribute('href').slice(1));
      var section = document.getElementById(id);
      if (!section) return;

      var colorClass = COLOR_CLASSES.filter(function (c) { return section.classList.contains(c); })[0];
      if (!colorClass) return;

      var colors = COLOR_MAP[colorClass];
      link.style.setProperty('--doc-section-color', colors.text);
      link.style.setProperty('--doc-section-bg-active', colors.bg);
      link.style.setProperty('--doc-section-border-active', colors.border);
      pairs.push({ link: link, section: section });
    });
    return pairs;
  }

  function setupScrollTracking(pairs) {
    if (!pairs.length || !('IntersectionObserver' in window)) return;

    // A thin trigger band near the top of the viewport, rather than the
    // whole viewport, so "active" reflects whichever section is right
    // under the reader's eye — not just "on screen somewhere" (which
    // would often mean two or three sections lighting up at once on a
    // tall page).
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var match = pairs.filter(function (p) { return p.section === entry.target; })[0];
        if (!match) return;
        pairs.forEach(function (p) { p.link.classList.remove('active'); });
        match.link.classList.add('active');
      });
    }, { rootMargin: '-15% 0px -75% 0px', threshold: 0 });

    pairs.forEach(function (p) { observer.observe(p.section); });
  }

  function run() {
    setupScrollTracking(colorSidebarLinks());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();