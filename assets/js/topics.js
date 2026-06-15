/* ============================================================
   NSHD Topic Sub-page — shared JavaScript
   Active section highlighting in the sidebar-summary box.

   Approach: the active section is whichever .home-section has
   its vertical MIDPOINT closest to a reference line near the
   top of the viewport. This is deterministic regardless of
   page length or how close sections are together — exactly
   one section "wins" at any scroll position.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  const DEBUG = false;

  const sections = Array.from(document.querySelectorAll('.home-section[id]'));
  const links    = Array.from(document.querySelectorAll('.sidebar-summary a[href^="#"]'));

  if (DEBUG) {
    console.log('[topics-sidebar] sections:', sections.map(s => s.id));
    console.log('[topics-sidebar] links:', links.map(l => l.getAttribute('href')));
  }

  if (!sections.length || !links.length) {
    if (DEBUG) console.warn('[topics-sidebar] No sections or links found — aborting.');
    return;
  }

  /* ── Safety-net CSS so the active state is visible even if
     topics.css doesn't already style it. Remove this block
     once you've confirmed your own CSS handles .active. ── */
  const style = document.createElement('style');
  style.textContent = `
    .sidebar-summary ul li a.active {
      font-weight: 700 !important;
      color: #800020 !important;
    }
  `;
  document.head.appendChild(style);

  /* Build a quick id → link map */
  const map = {};
  links.forEach(link => {
    const id = link.getAttribute('href').replace('#', '');
    map[id] = link;
  });

  function setActive(id) {
    if (DEBUG) console.log('[topics-sidebar] setActive ->', id);
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

  /* ── Reference line: how far from the top of the viewport
     do we consider "where the reader's attention is"? ── */
  const REFERENCE_LINE_RATIO = 0.3; // 30% down the viewport

  function updateActive() {
    if (scrollLock) return;

    const referenceY = window.innerHeight * REFERENCE_LINE_RATIO;

    let best = sections[0].id;
    let bestDist = Infinity;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const dist = Math.abs(midpoint - referenceY);

      if (DEBUG) {
        console.log(`[topics-sidebar] ${section.id} midpoint=${midpoint.toFixed(0)} dist=${dist.toFixed(0)}`);
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
});