/*
 * variable-doc-badges.js
 *
 * Drop-in, page-agnostic script that adds a small "N documented" badge
 * next to every variable-name link on ANY page — Search Data Dictionary,
 * Browse by Category, Popular Variables, Search by Year, Longitudinal
 * Search, the Basket page, wherever. It needs zero changes to any of
 * those pages' own generators: it works purely by scanning the page's
 * already-rendered HTML for links matching the variable metadata page's
 * known URL pattern (/assets/variable_metadata/{name}.html — the same
 * pattern every one of those pages already uses to make a variable name
 * clickable), then looking each one up in variable_documents_index.json.
 *
 * Include once, site-wide, e.g. in the shared layout's footer next to
 * jargon-linker.js:
 *   <script src="{{ site.baseurl }}/assets/js/variable-doc-badges.js"></script>
 *
 * ASSUMPTION worth checking against your actual variable metadata page:
 * the badge links to {variable page URL}#documents, intended to jump to
 * (and ideally auto-open) that page's Documents tab. If the tab
 * component doesn't already respond to a #documents URL hash on load,
 * that's a small addition needed there — see the note at the bottom of
 * this file for the minimal JS that tab component would need.
 */
(function () {
  var INDEX_URL = '/OWL/assets/data/variable_documents_index.json';
  var LINK_PATTERN = /\/assets\/variable_metadata\/([^/?#]+)\.html/;

  function extractVarName(href) {
    var m = href.match(LINK_PATTERN);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildBadge(varName, entries) {
    var badge = document.createElement('a');
    badge.className = 'var-doc-badge';
    badge.href = '/OWL/assets/variable_metadata/' + encodeURIComponent(varName) + '.html#documents';
    var titles = entries.map(function (e) { return e.title; });
    badge.title = titles.join('\n');
    badge.innerHTML =
      '<span class="var-doc-badge-count">' + entries.length + '</span>' +
      '<span class="var-doc-badge-label">' + (entries.length === 1 ? 'documented' : 'documented') + '</span>';
    return badge;
  }

  function decorate(index) {
    var handled = new WeakSet();
    document.querySelectorAll('a[href*="/assets/variable_metadata/"]').forEach(function (link) {
      if (handled.has(link)) return;
      handled.add(link);

      // Don't double up if this script already ran (e.g. content loaded twice).
      if (link.nextElementSibling && link.nextElementSibling.classList &&
          link.nextElementSibling.classList.contains('var-doc-badge')) {
        return;
      }

      var varName = extractVarName(link.getAttribute('href') || '');
      if (!varName) return;

      var entries = index[varName];
      if (!entries || !entries.length) return;

      link.insertAdjacentElement('afterend', buildBadge(varName, entries));
    });
  }

  function run() {
    fetch(INDEX_URL)
      .then(function (res) { return res.ok ? res.json() : {}; })
      .then(decorate)
      .catch(function () {
        // If the index isn't available yet (not copied into place, or a
        // network hiccup), fail silently — the page still works exactly
        // as it did before this script existed, just without badges.
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();

/*
 * ---------------------------------------------------------------------
 * If your variable metadata page's tab component doesn't yet respond to
 * a #documents URL hash by auto-opening that tab, add this alongside its
 * existing tab-click handling (adapted from the tab-switching JS your
 * variable metadata page generator already emits):
 *
 *   var hash = window.location.hash.replace('#', '');
 *   if (hash) {
 *     var tab = document.querySelector('.vm-tab[data-tab="' + hash + '"]');
 *     if (tab) tab.click();
 *   }
 * ---------------------------------------------------------------------
 */