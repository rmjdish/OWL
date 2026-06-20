document.addEventListener('DOMContentLoaded', function () {

  /* Accordion logic — "How the site is organised" page */
  document.querySelectorAll('.gs-acc-trigger').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      this.nextElementSibling.classList.toggle('open', !expanded);
    });
  });

  /* Jargon glossary — fetched from JSON, alphabetical, grouped, searchable */
  var jargonList = document.getElementById('gs-jargon-list');
  if (!jargonList) return;

  var terms = [];
  var filtered = [];

  function lettersAvailable() {
    var set = {};
    terms.forEach(function (t) { set[t.term[0].toUpperCase()] = true; });
    return Object.keys(set).sort();
  }

  function renderAZ() {
    var az = document.getElementById('gs-az');
    if (!az) return;
    az.innerHTML = lettersAvailable().map(function (l) {
      return '<button type="button" class="gs-az-btn" data-letter="' + l + '">' + l + '</button>';
    }).join('');

    az.querySelectorAll('.gs-az-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var letter = this.dataset.letter;
        var target = jargonList.querySelector('[data-term-letter="' + letter + '"]');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function groupByCategory(items) {
    var groups = {};
    var order = [];
    items.forEach(function (i) {
      if (!groups[i.cat]) {
        groups[i.cat] = [];
        order.push(i.cat);
      }
      groups[i.cat].push(i);
    });
    order.sort();
    return { groups: groups, order: order };
  }

  function render() {
    if (filtered.length === 0) {
      jargonList.innerHTML = '<p class="gs-jargon-empty">No terms match your search.</p>';
      return;
    }

    var grouped = groupByCategory(filtered);

    jargonList.innerHTML = grouped.order.map(function (cat) {
      var items = grouped.groups[cat];
      return (
        '<div>' +
          '<p class="gs-jargon-cat-label">' + cat + '</p>' +
          items.map(function (t) {
            return (
              '<div class="gs-jargon-entry" data-term-letter="' + t.term[0].toUpperCase() + '">' +
                '<div class="gs-jargon-icon"><i class="ti ' + t.icon + '" aria-hidden="true"></i></div>' +
                '<div>' +
                  '<p class="gs-jargon-term">' + t.term + '</p>' +
                  '<p class="gs-jargon-def">' + t.def + '</p>' +
                '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>'
      );
    }).join('');
  }

  function sortAlphabetically(arr) {
    return arr.slice().sort(function (a, b) {
      return a.term.localeCompare(b.term);
    });
  }

  var search = document.getElementById('gs-jargon-search');
  if (search) {
    search.addEventListener('input', function (e) {
      var f = e.target.value.trim().toLowerCase();
      filtered = terms.filter(function (t) {
        return t.term.toLowerCase().indexOf(f) !== -1 || t.def.toLowerCase().indexOf(f) !== -1;
      });
      render();
    });
  }

  fetch('/OWL/assets/data/jargon-terms.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      terms = sortAlphabetically(data);
      filtered = terms;
      renderAZ();
      render();
    })
    .catch(function () {
      jargonList.innerHTML = '<p class="gs-jargon-empty">Couldn\'t load the glossary right now.</p>';
    });
});