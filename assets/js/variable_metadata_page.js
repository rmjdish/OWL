/* Scroll spy */
function updateActiveSection() {
  const sections = document.querySelectorAll("h2[id]");
  const midpoint = window.innerHeight / 2;
  let current = "";

  sections.forEach(sec => {
    const rect = sec.getBoundingClientRect();
    if (rect.top <= midpoint && rect.bottom >= midpoint) {
      current = sec.id;
    }
  });

  document.querySelectorAll(".sidebar-summary a").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === "#" + current);
  });
}

/* Back to top button */
window.addEventListener("scroll", () => {
  const btn = document.getElementById("back-to-top");
  btn.style.display = window.scrollY > 300 ? "block" : "none";
});
document.getElementById("back-to-top").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

document.addEventListener("scroll", updateActiveSection);
document.addEventListener("DOMContentLoaded", updateActiveSection);
window.addEventListener("resize", updateActiveSection);