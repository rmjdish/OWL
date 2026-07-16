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
  var resultsEl = document.getElementById('docSearchResults');
  var countEl = document.getElementById('docSearchCount');
  var emptyEl = document.getElementById('docSearchEmpty');
  var errorEl = document.getElementById('docSearchError');
  var sortableHeaders = document.querySelectorAll('.doc-th-sortable');

  var allDocs = [];
  // Which documents currently have their full category list expanded —
  // a Set of doc_id, kept outside render() so toggling one row's
  // categories survives a re-render triggered by typing in the search
  // box or clicking a different column header.
  var expandedIds = new Set();
  var sortState = { column: null, direction: 'asc' };

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

  function topCount(doc) {
    if (doc.high) return { n: doc.high, tier: 'high' };
    if (doc.medium) return { n: doc.medium, tier: 'medium' };
    if (doc.low) return { n: doc.low, tier: 'low' };
    return null;
  }

  // A single numeric score so 'sort by confidence' has one consistent
  // ordering across tiers — a document with any high-confidence matches
  // always ranks above one with only medium or low, and ties within a
  // tier break by count.
  function confidenceScore(doc) {
    return (doc.high || 0) * 1e6 + (doc.medium || 0) * 1e3 + (doc.low || 0);
  }

  function docTopics(doc) {
    return doc.topics && doc.topics.length ? doc.topics : (doc.topic ? [doc.topic] : []);
  }

  function renderRow(doc, rowIndex) {
    var meta = typeMeta(doc.doc_type);
    var count = topCount(doc);
    var countHtml = count
      ? '<span class="doc-count-badge doc-count-' + count.tier + '">' + count.n + ' ' + count.tier + '</span>'
      : '';

    var topics = docTopics(doc);
    var isExpanded = expandedIds.has(doc.doc_id);
    var moreCount = topics.length - 1;

    var topicCellHtml;
    if (!topics.length) {
      topicCellHtml = '';
    } else if (moreCount <= 0) {
      topicCellHtml = '<span class="doc-topic-primary">' + esc(topics[0]) + '</span>';
    } else if (isExpanded) {
      topicCellHtml =
        '<button type="button" class="doc-topic-toggle" data-doc-id="' + esc(doc.doc_id) + '">' +
        '<i class="ti ti-chevron-up" aria-hidden="true"></i>hide</button>' +
        '<div class="doc-topic-expanded">' +
        topics.map(function (t) { return '<span class="doc-topic-chip">' + esc(t) + '</span>'; }).join('') +
        '</div>';
    } else {
      topicCellHtml =
        '<span class="doc-topic-primary">' + esc(topics[0]) +
        '<button type="button" class="doc-topic-toggle" data-doc-id="' + esc(doc.doc_id) + '">' +
        '<i class="ti ti-chevron-down" aria-hidden="true"></i>+' + moreCount + '</button></span>';
    }

    var tr = document.createElement('tr');
    tr.className = 'doc-result-row' + (rowIndex % 2 === 1 ? ' doc-row-odd' : '');
    tr.innerHTML =
      '<td class="doc-result-title-cell"><i class="ti ' + meta.icon + ' doc-result-icon" aria-hidden="true"></i>' +
      '<span class="doc-result-title">' + esc(doc.title) + '</span></td>' +
      '<td class="doc-topic-cell">' + topicCellHtml + '</td>' +
      '<td>' + countHtml + '</td>' +
      '<td><span class="doc-result-type doc-type-' + esc(doc.doc_type) + '">' + esc(meta.label) + '</span></td>';

    tr.addEventListener('click', function (e) {
      if (e.target.closest('.doc-topic-toggle')) return; // handled separately below
      window.location.href = doc.permalink;
    });

    var toggle = tr.querySelector('.doc-topic-toggle');
    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        if (expandedIds.has(doc.doc_id)) expandedIds.delete(doc.doc_id);
        else expandedIds.add(doc.doc_id);
        render();
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
    topic: function (doc) { return (doc.topic || '').toLowerCase(); },
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

  function render() {
    var query = input.value.trim().toLowerCase();
    var typeValue = typeFilter.value;

    var matches = allDocs.filter(function (doc) {
      if (!matchesType(doc, typeValue)) return false;
      if (!query) return true;
      return doc._haystack.indexOf(query) !== -1;
    });
    matches = applySort(matches);

    resultsEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    matches.forEach(function (doc, i) { frag.appendChild(renderRow(doc, i)); });
    resultsEl.appendChild(frag);

    countEl.textContent = matches.length + (matches.length === 1 ? ' document' : ' documents');
    emptyEl.style.display = matches.length === 0 ? '' : 'none';
    updateSortHeaderUI();
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

  input.addEventListener('input', render);
  typeFilter.addEventListener('change', render);
  sortableHeaders.forEach(function (th) {
    th.addEventListener('click', function () {
      var col = th.getAttribute('data-sort');
      if (sortState.column === col) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
      } else {
        sortState.column = col;
        sortState.direction = 'asc';
      }
      render();
    });
  });
})();