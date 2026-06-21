/* ============================================================
   OWL — Home page
   /OWL/assets/js/home.js
   Drives the two-level accordion (sections + nested tools) and
   the right-hand sidebar summary that expands/scrolls to them,
   including highlighting whichever sidebar link is currently open.
   Kept as an external file (rather than inline <script>) so
   Jekyll/kramdown's markdown processing can never touch or
   mangle the JS content.
   ============================================================ */

(function () {

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {

    /* ----------------------------------------------------------
       OUTER ACCORDION
       ---------------------------------------------------------- */
    try {
      document.querySelectorAll('.sections-accordion .sec-trigger').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var expanded = this.getAttribute('aria-expanded') === 'true';
          this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
          var body = this.parentElement.querySelector('.sec-body');
          if (body) body.classList.toggle('open', !expanded);
          syncSidebarActiveStates();
        });
      });
    } catch (err) {
      console.error('Outer accordion init failed:', err);
    }

    /* ----------------------------------------------------------
       INNER ACCORDION
       ---------------------------------------------------------- */
    try {
      document.querySelectorAll('.inner-accordion .inner-trigger').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var expanded = this.getAttribute('aria-expanded') === 'true';
          this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
          var body = this.parentElement.querySelector('.inner-body');
          if (body) body.classList.toggle('open', !expanded);
          syncSidebarActiveStates();
        });
      });
    } catch (err) {
      console.error('Inner accordion init failed:', err);
    }

    /* ----------------------------------------------------------
       SIDEBAR ACTIVE-STATE SYNC
       Adds/removes the .active class on every sidebar link so it
       reflects whether its target section/sub-item is currently
       expanded. Called after any accordion or sidebar interaction.
       ---------------------------------------------------------- */
    function syncSidebarActiveStates() {
      document.querySelectorAll('.sidebar-summary a[data-sec]').forEach(function (link) {
        var secId = link.dataset.sec;
        var innerId = link.dataset.inner;
        var isActive;

        if (innerId) {
          // Sub-item link: active only if that specific inner item is open
          var item = document.getElementById(innerId);
          var innerTrigger = item ? item.querySelector('.inner-trigger') : null;
          isActive = !!innerTrigger && innerTrigger.getAttribute('aria-expanded') === 'true';
        } else {
          // Top-level link: active if its section is open
          var row = document.getElementById(secId);
          var trigger = row ? row.querySelector('.sec-trigger') : null;
          isActive = !!trigger && trigger.getAttribute('aria-expanded') === 'true';
        }

        link.classList.toggle('active', isActive);
      });
    }

    /* ----------------------------------------------------------
       SIDEBAR SUMMARY NAVIGATION
       ---------------------------------------------------------- */
    try {

      function isOuterOpen(id) {
        var row = document.getElementById(id);
        if (!row) return false;
        var trigger = row.querySelector('.sec-trigger');
        return !!trigger && trigger.getAttribute('aria-expanded') === 'true';
      }

      function setOuter(id, open) {
        var row = document.getElementById(id);
        if (!row) return;
        var trigger = row.querySelector('.sec-trigger');
        var body = row.querySelector('.sec-body');
        if (!trigger || !body) return;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        body.classList.toggle('open', open);
      }

      function setInner(id, open) {
        var item = document.getElementById(id);
        if (!item) return;
        var trigger = item.querySelector('.inner-trigger');
        var body = item.querySelector('.inner-body');
        if (!trigger || !body) return;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        body.classList.toggle('open', open);
      }

      document.querySelectorAll('.sidebar-summary a[data-sec]').forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var secId = this.dataset.sec;
          var innerId = this.dataset.inner;

          if (innerId) {
            if (!isOuterOpen(secId)) setOuter(secId, true);
            var item = document.getElementById(innerId);
            var innerTrigger = item ? item.querySelector('.inner-trigger') : null;
            var innerOpen = innerTrigger && innerTrigger.getAttribute('aria-expanded') === 'true';
            setInner(innerId, !innerOpen);
          } else {
            var open = isOuterOpen(secId);
            setOuter(secId, !open);
          }

          syncSidebarActiveStates();

          var targetId = innerId || secId;
          var target = document.getElementById(targetId);
          if (!target) return;

          setTimeout(function () {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        });
      });

    } catch (err) {
      console.error('Sidebar nav init failed:', err);
    }

    // Run once on load in case anything is pre-expanded
    syncSidebarActiveStates();

  });

})();