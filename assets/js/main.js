const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const targetId = anchor.getAttribute("href");
    if (!targetId || targetId === "#") return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  });
});

const sectionIds = ["services", "process", "proof", "faq", "contact"];
const navLinks = Array.from(document.querySelectorAll(".nav-links a"));

const setActiveNav = () => {
  const fromTop = window.scrollY + 120;
  let activeId = sectionIds[0];

  for (const id of sectionIds) {
    const section = document.getElementById(id);
    if (section && section.offsetTop <= fromTop) activeId = id;
  }

  navLinks.forEach((link) => {
    const target = link.getAttribute("href")?.replace("#", "");
    link.classList.toggle("is-active", target === activeId);
  });
};

window.addEventListener("scroll", setActiveNav, { passive: true });
setActiveNav();

const revealItems = document.querySelectorAll(".reveal");

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const yearNode = document.getElementById("year");
if (yearNode) yearNode.textContent = new Date().getFullYear();

const serviceSelect = document.getElementById("service-select");
if (serviceSelect) {
  document.querySelectorAll("[data-service]").forEach((cta) => {
    cta.addEventListener("click", () => {
      const value = cta.getAttribute("data-service");
      if (value) serviceSelect.value = value;
    });
  });
}
