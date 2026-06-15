/* ============================================================
   NSHD Topic Sub-page — shared JavaScript
   Active section highlighting in the sidebar-summary box.
   Works for pages with few/short sections as well as long ones.
   Click locks the highlight; scroll updates it once settled.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  const sections = Array.from(document.querySelectorAll('.home-section[id]'));
  const links    = Array.from(document.querySelectorAll('.sidebar-summary a[href^="#"]'));

  if (!sections.length || !links.length) return;

  /* Build a quick id → link map */
  const map = {};
  links.forEach(link => {
    const id = link.getAttribute('href').replace('#', '');
    map[id] = link;
  });

  function setActive(id) {
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

  /* ── Scroll: "active line" near the top of the viewport.
     The active section is the LAST one (in document order)
     whose top has crossed above the line. If none have,
     default to the first section. ── */
  const OFFSET = 150; // px from top of viewport

  function updateActive() {
    if (scrollLock) return;

    let current = sections[0].id;

    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top - OFFSET <= 0) {
        current = section.id;
      } else {
        break;
      }
    }

    setActive(current);
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