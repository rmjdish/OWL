document.addEventListener('DOMContentLoaded', function () {

  /* Accordion logic — "How the site is organised" page */
  document.querySelectorAll('.gs-acc-trigger').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      this.nextElementSibling.classList.toggle('open', !expanded);
    });
  });

  /* Jargon glossary — search + A-Z jump + category grouping, no pagination */
  var jargonList = document.getElementById('gs-jargon-list');
  if (!jargonList) return;

  var terms = [
    { term: "Sweep", cat: "Study design", icon: "ti-repeat",
      def: "A single round of data collection from study members at a particular age or year. For example, the 1989 sweep collected data when study members were 43. The NSHD has had 36 sweeps spanning birth to age 76\u201377, each with its own questionnaire and set of variables." },
    { term: "Cohort", cat: "Study design", icon: "ti-users",
      def: "The group of individuals followed by the study, in this case everyone born in England, Scotland, and Wales during one week of March 1946. A birth cohort study follows the same people from birth, distinguishing it from studies that recruit at a later age." },
    { term: "Birth cohort study", cat: "Study design", icon: "ti-baby-carriage",
      def: "A study design that follows the same group of people from birth onward, rather than recruiting participants at a later age or following different people at each time point." },
    { term: "Attrition", cat: "Study design", icon: "ti-trending-down",
      def: "The loss of study members from the cohort over time, whether through death, withdrawal, or loss of contact. Attrition is common in long-running studies and is one reason sample sizes shrink in later sweeps compared to earlier ones." },
    { term: "Variable name", cat: "Variables & data", icon: "ti-tag",
      def: "The short, coded identifier used in the dataset, e.g. WIC82, usually combining an abbreviation with the sweep year. Variable names are often reused with different suffixes across sweeps to show the same question asked repeatedly over time." },
    { term: "Variable label", cat: "Variables & data", icon: "ti-label",
      def: "The plain-English description of what a variable measures, paired with its coded variable name in the data dictionary." },
    { term: "Derived variable", cat: "Variables & data", icon: "ti-calculator",
      def: "A variable calculated from one or more raw measurements rather than collected directly, for example Body Mass Index derived from separately measured height and weight, or a summary score combining several questionnaire items." },
    { term: "Restricted variable", cat: "Access & governance", icon: "ti-lock",
      def: "Some variables aren't publicly displayed in full due to data sensitivity, identifiability, or governance restrictions. If you believe you need access to a restricted variable for a project, contact the NSHD data access team directly." }
  ];

  var filtered = terms.slice();

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

  renderAZ();
  render();
});