(function () {
  // Nicer labels/icons for the four structurally auto-detected types.
  // Anything else — most notably a Document_type value straight from the
  // documents index spreadsheet, like "Full documentation" — falls back
  // to humanizeType() below rather than needing to be listed here by
  // hand. The dropdown itself is always built from whatever doc_type
  // values actually appear in search_index.json, never a fixed list, so
  // a new spreadsheet-supplied type shows up automatically next build.
  var DOC_TYPE_LABELS = {
    topsheet: 'Topsheet',
    variable_note: 'Variable note',
    templated_variable_note: 'Templated variable note',
    narrative: 'Narrative / data note',
  };
  var DOC_TYPE_ICONS = {
    topsheet: 'ti-table',
    variable_note: 'ti-file-text',
    templated_variable_note: 'ti-repeat',
    narrative: 'ti-align-left',
  };
  var KNOWN_TYPES = Object.keys(DOC_TYPE_LABELS);

  function humanizeType(type) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function typeClass(type) {
    // doc_type values from the spreadsheet are normalized to
    // lowercase-with-underscores in build_docs.py, but sanitize again
    // here defensively so an unexpected character can't break the CSS
    // class name.
    return 'doc-type-' + (KNOWN_TYPES.indexOf(type) !== -1 ? type : 'other');
  }

  var allDocs = [];
  var input = document.getElementById('docSearchInput');
  var typeFilter = document.getElementById('docTypeFilter');
  var resultsEl = document.getElementById('docSearchResults');
  var countEl = document.getElementById('docSearchCount');
  var emptyEl = document.getElementById('docSearchEmpty');
  var errorEl = document.getElementById('docSearchError');

  function populateTypeFilter(docs) {
    var counts = {};
    docs.forEach(function (doc) {
      counts[doc.doc_type] = (counts[doc.doc_type] || 0) + 1;
    });
    var types = Object.keys(counts).sort(function (a, b) {
      return humanizeType(a).localeCompare(humanizeType(b));
    });
    types.forEach(function (type) {
      var opt = document.createElement('option');
      opt.value = type;
      opt.textContent = (DOC_TYPE_LABELS[type] || humanizeType(type)) + ' (' + counts[type] + ')';
      typeFilter.appendChild(opt);
    });
  }

  function countBadges(doc) {
    var parts = [];
    if (doc.high) parts.push('<span class="doc-count-badge doc-count-high">' + doc.high + ' high</span>');
    if (doc.medium) parts.push('<span class="doc-count-badge doc-count-medium">' + doc.medium + ' medium</span>');
    if (doc.low) parts.push('<span class="doc-count-badge doc-count-low">' + doc.low + ' low</span>');
    return parts.join('');
  }

  function renderCard(doc) {
    var typeLabel = DOC_TYPE_LABELS[doc.doc_type] || humanizeType(doc.doc_type || '');
    var typeIcon = DOC_TYPE_ICONS[doc.doc_type] || 'ti-file-description';
    var metaParts = [
      '<span class="doc-result-type ' + typeClass(doc.doc_type) + '">' + typeLabel + '</span>',
    ];
    if (doc.topic) metaParts.push('<span>' + doc.topic.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>');
    metaParts.push('<span class="doc-result-counts">' + countBadges(doc) + '</span>');

    return (
      '<a class="doc-result-card" href="' + doc.permalink + '">' +
      '<i class="ti ' + typeIcon + ' doc-result-icon" aria-hidden="true"></i>' +
      '<div class="doc-result-body">' +
      '<p class="doc-result-title">' + doc.title.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</p>' +
      '<div class="doc-result-meta">' + metaParts.join('') + '</div>' +
      '</div>' +
      '</a>'
    );
  }

  function render() {
    var query = input.value.trim().toLowerCase();
    var typeVal = typeFilter.value;

    var filtered = allDocs.filter(function (doc) {
      if (typeVal && doc.doc_type !== typeVal) return false;
      if (!query) return true;
      var haystack = [
        doc.title, doc.topic, doc.doc_id, doc.categories,
        doc.summary_of_work, doc.source_variable_names, doc.output_variables,
        doc.papers_used, (doc.variable_names || []).join(' '), (doc.variable_labels || []).join(' '),
      ].join(' ').toLowerCase();
      return haystack.indexOf(query) !== -1;
    });

    countEl.textContent = filtered.length + (filtered.length === 1 ? ' document' : ' documents');
    resultsEl.innerHTML = filtered.map(renderCard).join('');
    emptyEl.style.display = filtered.length === 0 ? 'block' : 'none';
  }

  fetch('/OWL/assets/data/search_index.json')
    .then(function (res) {
      if (!res.ok) throw new Error('failed to load search index');
      return res.json();
    })
    .then(function (data) {
      allDocs = data;
      populateTypeFilter(data);
      render();
    })
    .catch(function () {
      errorEl.style.display = 'block';
      countEl.textContent = '';
    });

  input.addEventListener('input', render);
  typeFilter.addEventListener('change', render);
})();