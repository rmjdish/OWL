/* ============================================================
   OWL — Explore Topics
   /OWL/assets/js/topics.js
   Shared script: active-section sidebar highlighting,
   variable-code table linking, and table alignment fixes.

   Supports two sidebar markup styles used across the site:
     - .sidebar-link                  (older question/year pages)
     - .sidebar-summary a[href^="#"]  (topic sub-pages)

   Sections are identified by .home-section elements containing
   an h2[id] (the id lives on the heading, not the wrapper div).

   Active section = whichever .home-section's vertical midpoint
   is closest to a reference line near the top of the viewport.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  const DEBUG = true;

  /* ── Find sections: .home-section elements with an h2[id] inside ── */
  const sections = Array.from(document.querySelectorAll('.home-section'))
    .map(el => {
      const heading = el.querySelector('h2[id], h3[id]');
      return heading ? { el: el, id: heading.id } : null;
    })
    .filter(Boolean);

  /* ── Find links: prefer .sidebar-summary if present, else .sidebar-link ── */
  let links;
  if (document.querySelector('.sidebar-summary')) {
    links = Array.from(document.querySelectorAll('.sidebar-summary a[href^="#"]'));
  } else {
    links = Array.from(document.querySelectorAll('.sidebar-link'));
  }

  if (DEBUG) {
    console.log('[topics] sections:', sections.map(s => s.id));
    console.log('[topics] links:', links.map(l => l.getAttribute('href')));
  }

  if (!sections.length || !links.length) {
    if (DEBUG) console.warn('[topics] No sections or links found — aborting.');
  } else {

    /* Build a quick id → link map */
    const map = {};
    links.forEach(link => {
      const id = link.getAttribute('href').replace('#', '');
      map[id] = link;
    });

    function setActive(id) {
      if (DEBUG) console.log('[topics] setActive ->', id);
      links.forEach(l => l.classList.remove('active'));
      if (map[id]) map[id].classList.add('active');
    }

    /* ── Click: lock the clicked item immediately ── */
    let scrollLock = false;
    let lockTimer  = null;

    links.forEach(link => {
      link.addEventListener('click', function () {
        const id = this.getAttribute('href').replace('#', '');
        setActive(id);

        scrollLock = true;
        clearTimeout(lockTimer);
        lockTimer = setTimeout(() => { scrollLock = false; }, 1000);
      });
    });

    /* ── Reference line: how far down the viewport do we consider
       "where the reader's attention is"? ── */
    const REFERENCE_LINE_RATIO = 0.3; // 30% down the viewport

    function updateActive() {
      if (scrollLock) return;

      /* If scrolled (at or near) the bottom of the page, force the
         last section active — its midpoint may never be able to
         reach the reference line if the page doesn't scroll far
         enough past it. */
      const atBottom = (window.innerHeight + window.scrollY)
        >= (document.documentElement.scrollHeight - 2);

      if (atBottom) {
        if (DEBUG) console.log('[topics] at bottom of page, forcing last section');
        setActive(sections[sections.length - 1].id);
        return;
      }

      /* Similarly, if at the very top of the page, force the first
         section active. */
      if (window.scrollY <= 2) {
        setActive(sections[0].id);
        return;
      }

      const referenceY = window.innerHeight * REFERENCE_LINE_RATIO;

      let best = sections[0].id;
      let bestDist = Infinity;

      sections.forEach(section => {
        const rect = section.el.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const dist = Math.abs(midpoint - referenceY);

        if (DEBUG) {
          console.log(`[topics] ${section.id} midpoint=${midpoint.toFixed(0)} dist=${dist.toFixed(0)}`);
        }

        if (dist < bestDist) {
          bestDist = dist;
          best = section.id;
        }
      });

      setActive(best);
    }

    let ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          updateActive();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', updateActive);

    /* Initial state on load */
    updateActive();
  }

  /* ============================================================
     Variable-code linking
     Turns any table cell in .topic-table whose full text is a
     single alphanumeric token (e.g. WIC66, BRONC09) into a link
     pointing at the variable metadata page, lowercased.
     Cells with spaces, punctuation, or "—" are left untouched.
     ============================================================ */
  (function linkVariableCodes() {
    const baseUrl = 'https://rmjdish.github.io/OWL/docs/variable_metadata/';
    const cells = document.querySelectorAll('.topic-table tbody td');

    cells.forEach(function (cell) {
      const text = cell.textContent.trim();
      if (/^[a-zA-Z0-9]+$/.test(text)) {
        const link = document.createElement('a');
        link.href = baseUrl + text.toLowerCase();
        link.textContent = text;
        cell.innerHTML = '';
        cell.appendChild(link);
      }
    });
  })();

});