(function () {
  'use strict';

  var DOC_TYPE_META = {
    topsheet: { label: 'Topsheet', icon: 'ti-table' },
    variable_note: { label: 'Variable note', icon: 'ti-file-text' },
    templated_variable_note: { label: 'Multi-sweep', icon: 'ti-repeat' },
    narrative: { label: 'Narrative', icon: 'ti-align-left' },
    other: { label: 'Other', icon: 'ti-file-description' },
  };

  // Order controls both the type filter dropdown and the badge/icon
  // fallback below — any doc_type not listed here (an unexpected value
  // in search_index.json) is treated as 'other' rather than breaking.
  var DOC_TYPE_ORDER = ['topsheet', 'variable_note', 'templated_variable_note', 'narrative'];

  var input = document.getElementById('docSearchInput');
  var typeFilter = document.getElementById('docTypeFilter');
  var pageSizeSelect = document.getElementById('docPageSize');
  var resultsEl = document.getElementById('docSearchResults');
  var countEl = document.getElementById('docSearchCount');
  var paginationEl = document.getElementById('docPagination');
  var emptyEl = document.getElementById('docSearchEmpty');
  var errorEl = document.getElementById('docSearchError');
  var sortableHeaders = document.querySelectorAll('.doc-th-sortable');

  var allDocs = [];
  var sortState = { column: 'title', direction: 'asc' };
  var currentPage = 1;
  // Which documents currently have their category list expanded — a Set
  // of doc_id, kept outside render() so re-opening a <details> element
  // survives a re-render triggered by typing in the search box, changing
  // the type filter, or clicking a column header.
  var expandedIds = new Set();

  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function typeMeta(docType) {
    return DOC_TYPE_META[docType] || DOC_TYPE_META.other;
  }

  // One lowercased search blob per document, built once at load time
  // rather than re-concatenated on every keystroke — with a few hundred
  // documents this is the difference between a snappy filter and a
  // noticeable stutter as someone types.
  function buildHaystack(doc) {
    var parts = [
      doc.title, doc.topic, (doc.topics || []).join(' '), doc.categories,
      doc.summary_of_work, doc.papers_used, doc.source_variable_names,
      doc.output_variables, (doc.variable_names || []).join(' '),
      (doc.variable_labels || []).join(' '),
    ];
    return parts.filter(Boolean).join(' \u2022 ').toLowerCase();
  }

  // All three tiers, not just the highest — a document with 6 high and
  // 2 medium should show both, not silently drop the medium count just
  // because a higher tier exists.
  function confidenceBadgesHtml(doc) {
    var tiers = [['high', doc.high], ['medium', doc.medium], ['low', doc.low]];
    var badges = tiers
      .filter(function (t) { return t[1] > 0; })
      .map(function (t) { return '<span class="doc-count-badge doc-count-' + t[0] + '">' + t[1] + ' ' + t[0] + '</span>'; });
    return badges.length ? badges.join('') : '<span class="doc-count-empty">No variables detected</span>';
  }

  // A single numeric score so 'sort by variables found' has one
  // consistent ordering across tiers — a document with any high-
  // confidence matches always ranks above one with only medium or low,
  // and ties within a tier break by count.
  function confidenceScore(doc) {
    return (doc.high || 0) * 1e6 + (doc.medium || 0) * 1e3 + (doc.low || 0);
  }

  function docTopics(doc) {
    return doc.topics && doc.topics.length ? doc.topics : (doc.topic ? [doc.topic] : []);
  }

  function renderRow(doc, rowIndex) {
    var meta = typeMeta(doc.doc_type);
    var topics = docTopics(doc);

    var categoriesHtml;
    if (!topics.length) {
      categoriesHtml = '';
    } else {
      var isOpen = expandedIds.has(doc.doc_id);
      var label = topics.length === 1 ? '1 category' : topics.length + ' categories';
      categoriesHtml =
        '<details class="doc-category-details"' + (isOpen ? ' open' : '') + '>' +
        '<summary><i class="ti ti-chevron-right" aria-hidden="true"></i>' + label + '</summary>' +
        '<div class="doc-result-categories">' +
        topics.map(function (t) { return '<span class="doc-category-chip">' + esc(t) + '</span>'; }).join('') +
        '</div></details>';
    }

    var tr = document.createElement('tr');
    tr.className = 'doc-result-row' + (rowIndex % 2 === 1 ? ' doc-row-odd' : '');
    tr.innerHTML =
      '<td><i class="ti ' + meta.icon + ' doc-result-icon" aria-hidden="true"></i>' +
      '<span class="doc-result-title">' + esc(doc.title) + '</span>' + categoriesHtml + '</td>' +
      '<td><div class="doc-conf-cell">' + confidenceBadgesHtml(doc) + '</div></td>' +
      '<td><span class="doc-result-type doc-type-' + esc(doc.doc_type) + '">' + esc(meta.label) + '</span></td>';

    // Zebra striping and hover are set as inline styles with 'important'
    // priority on BOTH the row and every cell in it, rather than left to
    // an external stylesheet rule. This site's Just the Docs theme ships
    // its own baseline table CSS; row-only styling kept being invisible
    // even after using !important there too, which points to the theme
    // (or another rule) giving table cells their own explicit
    // background — a cell's own background always paints over its
    // parent row's background in the box-stacking order, regardless of
    // !important on the row, so the fix has to apply at the cell level
    // too, not just the row.
    var cells = tr.querySelectorAll('td');
    function setRowBg(color) {
      if (color) {
        tr.style.setProperty('background-color', color, 'important');
        cells.forEach(function (td) { td.style.setProperty('background-color', color, 'important'); });
      } else {
        tr.style.removeProperty('background-color');
        cells.forEach(function (td) { td.style.removeProperty('background-color'); });
      }
    }
    var baseBg = rowIndex % 2 === 1 ? 'rgba(0,0,0,0.035)' : '';
    setRowBg(baseBg);
    tr.addEventListener('mouseenter', function () { setRowBg('hsl(180, 45%, 94%)'); });
    tr.addEventListener('mouseleave', function () { setRowBg(baseBg); });

    tr.addEventListener('click', function (e) {
      // Clicking the categories disclosure (or a chip inside it once
      // open) should expand/collapse it, never navigate away.
      if (e.target.closest('details')) return;
      window.location.href = doc.permalink;
    });

    var details = tr.querySelector('.doc-category-details');
    if (details) {
      details.addEventListener('toggle', function () {
        if (details.open) expandedIds.add(doc.doc_id);
        else expandedIds.delete(doc.doc_id);
      });
    }

    return tr;
  }

  function populateTypeFilter(docs) {
    var present = {};
    docs.forEach(function (d) { present[d.doc_type] = true; });

    var orderedTypes = DOC_TYPE_ORDER.filter(function (t) { return present[t]; });
    var hasOther = Object.keys(present).some(function (t) { return DOC_TYPE_ORDER.indexOf(t) === -1; });
    if (hasOther) orderedTypes.push('other');

    orderedTypes.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t;
      opt.textContent = typeMeta(t).label;
      typeFilter.appendChild(opt);
    });
  }

  function matchesType(doc, filterValue) {
    if (!filterValue) return true;
    if (filterValue === 'other') return DOC_TYPE_ORDER.indexOf(doc.doc_type) === -1;
    return doc.doc_type === filterValue;
  }

  var SORT_KEYS = {
    title: function (doc) { return (doc.title || '').toLowerCase(); },
    confidence: function (doc) { return confidenceScore(doc); },
    type: function (doc) { return typeMeta(doc.doc_type).label.toLowerCase(); },
  };

  function applySort(docs) {
    if (!sortState.column) return docs;
    var keyFn = SORT_KEYS[sortState.column];
    var dir = sortState.direction === 'asc' ? 1 : -1;
    return docs.slice().sort(function (a, b) {
      var ka = keyFn(a), kb = keyFn(b);
      if (ka < kb) return -1 * dir;
      if (ka > kb) return 1 * dir;
      return 0;
    });
  }

  function updateSortHeaderUI() {
    sortableHeaders.forEach(function (th) {
      var col = th.getAttribute('data-sort');
      var icon = th.querySelector('.doc-sort-icon');
      var active = col === sortState.column;
      th.classList.toggle('doc-sort-active', active);
      icon.className = 'ti doc-sort-icon ' + (
        !active ? 'ti-selector' : sortState.direction === 'asc' ? 'ti-sort-ascending' : 'ti-sort-descending'
      );
    });
  }

  function getPageSize() {
    var v = pageSizeSelect.value;
    return v === 'all' ? Infinity : parseInt(v, 10);
  }

  function renderPagination(totalItems, pageSize) {
    paginationEl.innerHTML = '';
    if (pageSize === Infinity || totalItems <= pageSize) return;

    var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    var prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'doc-page-btn';
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.addEventListener('click', function () {
      currentPage = Math.max(1, currentPage - 1);
      render();
    });

    var label = document.createElement('span');
    label.textContent = 'Page ' + currentPage + ' of ' + totalPages;

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'doc-page-btn';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.addEventListener('click', function () {
      currentPage = Math.min(totalPages, currentPage + 1);
      render();
    });

    paginationEl.appendChild(prevBtn);
    paginationEl.appendChild(label);
    paginationEl.appendChild(nextBtn);
  }

  function resetToFirstPage() {
    currentPage = 1;
    render();
  }

  function render() {
    var query = input.value.trim().toLowerCase();
    var typeValue = typeFilter.value;

    var matches = allDocs.filter(function (doc) {
      if (!matchesType(doc, typeValue)) return false;
      if (!query) return true;
      return doc._haystack.indexOf(query) !== -1;
    });
    matches = applySort(matches);

    var pageSize = getPageSize();
    var totalPages = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(matches.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    var startIdx = pageSize === Infinity ? 0 : (currentPage - 1) * pageSize;
    var pageItems = pageSize === Infinity ? matches : matches.slice(startIdx, startIdx + pageSize);

    resultsEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    pageItems.forEach(function (doc, i) { frag.appendChild(renderRow(doc, i)); });
    resultsEl.appendChild(frag);

    countEl.textContent = 'Showing ' + matches.length + ' of ' + allDocs.length + ' documents';
    emptyEl.style.display = matches.length === 0 ? '' : 'none';
    updateSortHeaderUI();
    renderPagination(matches.length, pageSize);
  }

  fetch((window.SITE_BASEURL || '') + '/assets/data/search_index.json')
    .then(function (res) {
      if (!res.ok) throw new Error('search_index.json request failed: ' + res.status);
      return res.json();
    })
    .then(function (docs) {
      allDocs = docs.map(function (d) {
        d._haystack = buildHaystack(d);
        return d;
      });
      populateTypeFilter(allDocs);
      render();
    })
    .catch(function (err) {
      errorEl.style.display = '';
      console.error('Failed to load documentation search index:', err);
    });

  input.addEventListener('input', resetToFirstPage);
  typeFilter.addEventListener('change', resetToFirstPage);
  pageSizeSelect.addEventListener('change', resetToFirstPage);
  sortableHeaders.forEach(function (th) {
    th.addEventListener('click', function () {
      var col = th.getAttribute('data-sort');
      if (sortState.column === col) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
      } else {
        sortState.column = col;
        sortState.direction = 'asc';
      }
      resetToFirstPage();
    });
  });
})();