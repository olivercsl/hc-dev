// Smooth scrolling for anchor links
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const targetId = anchor.getAttribute("href");
    if (!targetId || targetId === "#" || !document.querySelector(targetId)) return;

    event.preventDefault();
    
    const targetElement = document.querySelector(targetId);
    if (!targetElement) return;

    const offsetTop = targetElement.offsetTop - 72; // Account for fixed header height
    
    window.scrollTo({
      top: offsetTop,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  });
});

// Navigation highlighting based on scroll position
const sectionIds = ["ai", "microsoft", "solutions", "contact"];
const navLinks = Array.from(document.querySelectorAll(".nav-links a"));

const setActiveNav = () => {
  const fromTop = window.scrollY + 100;
  let activeId = "";

  for (const id of sectionIds) {
    const element = document.getElementById(id);
    if (element) {
      const offsetTop = element.offsetTop;
      const height = element.offsetHeight;
      
      if (fromTop >= offsetTop && fromTop < offsetTop + height) {
        activeId = id;
        break;
      }
    }
  }

  navLinks.forEach((link) => {
    const target = link.getAttribute("href")?.substring(1); // Remove # prefix
    if (target === activeId) {
      link.style.color = "white";
    } else {
      link.style.color = "var(--text-secondary)";
    }
  });
};

window.addEventListener("scroll", setActiveNav, { passive: true });
document.addEventListener("DOMContentLoaded", setActiveNav);

// Intersection Observer for "reveal" animations
const revealElements = document.querySelectorAll(".reveal");

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
    { 
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    }
  );

  revealElements.forEach((el) => observer.observe(el));
} else {
  // Fallback
  revealElements.forEach((el) => el.classList.add("is-visible"));
}

// Set current year in footer
document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
});

// Header scroll effect (add border/shadow when scrolled)
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    header.style.background = 'rgba(8, 10, 15, 0.95)';
    header.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
  } else {
    header.style.background = 'var(--glass-bg)';
    header.style.boxShadow = 'none';
  }
}, { passive: true });
