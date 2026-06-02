/* ============================================================
   NSHD Questionnaire Sub-page — shared JavaScript
   Active section highlighting in the fixed sidebar
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  const sections = document.querySelectorAll('.home-section[id]');
  const links    = document.querySelectorAll('.sidebar-link');

  /* Build a quick id → link map */
  const map = {};
  links.forEach(link => {
    const id = link.getAttribute('href').replace('#', '');
    map[id] = link;
  });

  /* Highlight whichever section is most visible in the viewport */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const id = entry.target.id;
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        if (map[id]) map[id].classList.add('active');
      }
    });
  }, { threshold: 0.25 });

  sections.forEach(section => observer.observe(section));

});
