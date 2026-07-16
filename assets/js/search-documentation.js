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

  var allDocs = [];

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

  function renderRow(doc) {
    var meta = typeMeta(doc.doc_type);
    var count = topCount(doc);
    var countHtml = count
      ? '<span class="doc-count-badge doc-count-' + count.tier + '">' + count.n + ' ' + count.tier + '</span>'
      : '';

    var topics = doc.topics && doc.topics.length ? doc.topics : (doc.topic ? [doc.topic] : []);
    var topicText = topics.length ? esc(topics[0]) : '';
    var moreCount = topics.length - 1;
    var moreHtml = moreCount > 0
      ? '<span class="doc-result-topic-more">+' + moreCount + '</span>'
      : '';
    var topicTitleAttr = topics.length ? ' title="' + esc(topics.join(', ')) + '"' : '';

    var row = document.createElement('a');
    row.className = 'doc-result-row';
    row.href = doc.permalink;
    row.innerHTML =
      '<i class="ti ' + meta.icon + ' doc-result-icon" aria-hidden="true"></i>' +
      '<span class="doc-result-title">' + esc(doc.title) + '</span>' +
      '<span class="doc-result-topic"' + topicTitleAttr + '>' + topicText + moreHtml + '</span>' +
      countHtml +
      '<span class="doc-result-type doc-type-' + esc(doc.doc_type) + '">' + esc(meta.label) + '</span>';
    return row;
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

  function render() {
    var query = input.value.trim().toLowerCase();
    var typeValue = typeFilter.value;

    var matches = allDocs.filter(function (doc) {
      if (!matchesType(doc, typeValue)) return false;
      if (!query) return true;
      return doc._haystack.indexOf(query) !== -1;
    });

    resultsEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    matches.forEach(function (doc) { frag.appendChild(renderRow(doc)); });
    resultsEl.appendChild(frag);

    countEl.textContent = matches.length + (matches.length === 1 ? ' document' : ' documents');
    emptyEl.style.display = matches.length === 0 ? '' : 'none';
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
})();