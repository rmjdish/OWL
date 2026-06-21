/* ============================================================
   OWL — Home page
   /OWL/assets/js/home.js
   Drives the two-level accordion (sections + nested tools) and
   the right-hand sidebar summary that expands/scrolls to them.
   Kept as an external file (rather than inline <script>) so
   Jekyll/kramdown's markdown processing can never touch or
   mangle the JS content.
   ============================================================ */

(function () {

  // Run fn once the DOM is ready, whether or not DOMContentLoaded
  // has already fired by the time this script executes.
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {

    /* ----------------------------------------------------------
       OUTER ACCORDION
       Top-level rows: About, Getting Started, Data Coverage,
       Search Methods, Explore Documentation, Access.
       Clicking a .sec-trigger toggles its own .sec-body open/closed.
       ---------------------------------------------------------- */
    try {
      document.querySelectorAll('.sections-accordion .sec-trigger').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var expanded = this.getAttribute('aria-expanded') === 'true';
          // Flip the expanded state on the trigger itself (drives the
          // chevron rotation and background colour via CSS attribute selectors)
          this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
          // Find this row's body and toggle the class that shows/hides it
          var body = this.parentElement.querySelector('.sec-body');
          if (body) body.classList.toggle('open', !expanded);
        });
      });
    } catch (err) {
      // Isolated in its own try/catch so a failure here doesn't
      // prevent the inner accordion or sidebar nav from initialising
      console.error('Outer accordion init failed:', err);
    }

    /* ----------------------------------------------------------
       INNER ACCORDION
       Nested tool/page items inside Getting Started, Search
       Methods, and Explore Documentation. Same open/close pattern
       as the outer accordion, just one level deeper.
       ---------------------------------------------------------- */
    try {
      document.querySelectorAll('.inner-accordion .inner-trigger').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var expanded = this.getAttribute('aria-expanded') === 'true';
          this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
          var body = this.parentElement.querySelector('.inner-body');
          if (body) body.classList.toggle('open', !expanded);
        });
      });
    } catch (err) {
      console.error('Inner accordion init failed:', err);
    }

    /* ----------------------------------------------------------
       SIDEBAR SUMMARY NAVIGATION
       Clicking a link in .sidebar-summary should:
         1. Open (or close, if already open) the relevant section
         2. If it's a sub-item link, open/close that inner item too
         3. Smooth-scroll to the section/item once it's expanded
       ---------------------------------------------------------- */
    try {

      // Is the outer accordion row with this id currently expanded?
      function isOuterOpen(id) {
        var row = document.getElementById(id);
        if (!row) return false;
        var trigger = row.querySelector('.sec-trigger');
        return !!trigger && trigger.getAttribute('aria-expanded') === 'true';
      }

      // Force the outer row with this id open or closed
      function setOuter(id, open) {
        var row = document.getElementById(id);
        if (!row) return;
        var trigger = row.querySelector('.sec-trigger');
        var body = row.querySelector('.sec-body');
        if (!trigger || !body) return;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        body.classList.toggle('open', open);
      }

      // Force the inner item with this id open or closed
      function setInner(id, open) {
        var item = document.getElementById(id);
        if (!item) return;
        var trigger = item.querySelector('.inner-trigger');
        var body = item.querySelector('.inner-body');
        if (!trigger || !body) return;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        body.classList.toggle('open', open);
      }

      // Every sidebar link carries data-sec (always) and data-inner
      // (only on sub-item links) — see index.md for the markup
      document.querySelectorAll('.sidebar-summary a[data-sec]').forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault(); // stop the default #anchor jump; we handle scrolling ourselves
          var secId = this.dataset.sec;
          var innerId = this.dataset.inner;

          if (innerId) {
            // SUB-ITEM LINK (e.g. "Where should I start?")
            // Always make sure its parent section is open first...
            if (!isOuterOpen(secId)) setOuter(secId, true);
            // ...then toggle just this inner item open/closed
            var item = document.getElementById(innerId);
            var innerTrigger = item ? item.querySelector('.inner-trigger') : null;
            var innerOpen = innerTrigger && innerTrigger.getAttribute('aria-expanded') === 'true';
            setInner(innerId, !innerOpen);
          } else {
            // TOP-LEVEL LINK (e.g. "Getting Started")
            // Simple toggle: open if closed, close if already open
            var open = isOuterOpen(secId);
            setOuter(secId, !open);
          }

          // Scroll to whichever element was just acted on
          var targetId = innerId || secId;
          var target = document.getElementById(targetId);
          if (!target) return;

          // Small delay so the browser has reflowed the now-expanded
          // section before we measure its position — without this,
          // scrollIntoView can target where the element used to be
          setTimeout(function () {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        });
      });

    } catch (err) {
      console.error('Sidebar nav init failed:', err);
    }

  });

})();