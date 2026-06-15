/* ============================================================
   OWL — Explore Topics
   /OWL/assets/js/topics.js
   Shared script: active-section sidebar highlighting.
 
   Supports two sidebar markup styles used across the site:
     - .sidebar-link            (older question/year pages)
     - .sidebar-summary a[href^="#"]  (topic sub-pages)
 
   Active section = whichever .home-section's vertical midpoint
   is closest to a reference line near the top of the viewport.
   Deterministic regardless of page length or section spacing.
   ============================================================ */
 
document.addEventListener('DOMContentLoaded', function () {
 
  const DEBUG = false;
 
  const sections = Array.from(document.querySelectorAll('.home-section[id]'));
 
  // Prefer .sidebar-link if present, otherwise fall back to .sidebar-summary links
  let links = Array.from(document.querySelectorAll('.sidebar-link'));
  if (!links.length) {
    links = Array.from(document.querySelectorAll('.sidebar-summary a[href^="#"]'));
  }
 
  if (DEBUG) {
    console.log('[topics] sections:', sections.map(s => s.id));
    console.log('[topics] links:', links.map(l => l.getAttribute('href')));
  }
 
  if (!sections.length || !links.length) {
    if (DEBUG) console.warn('[topics] No sections or links found — aborting.');
    return;
  }
 
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
 
    const referenceY = window.innerHeight * REFERENCE_LINE_RATIO;
 
    let best = sections[0].id;
    let bestDist = Infinity;
 
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
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
});
 