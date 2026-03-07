// Smooth scrolling for anchor links
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const targetId = anchor.getAttribute("href");
    if (!targetId || targetId === "#" || !document.querySelector(targetId)) return;

    event.preventDefault();
    
    const targetElement = document.querySelector(targetId);
    if (!targetElement) return;

    const offsetTop = targetElement.offsetTop - 64; // Account for fixed header height
    
    window.scrollTo({
      top: offsetTop,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  });
});

// Navigation highlighting based on scroll position
const sectionIds = ["ai", "microsoft", "cloud", "contact"];
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
    link.classList.toggle("is-active", target === activeId);
    
    // Apple-style active state: adjust opacity
    if (target === activeId) {
      link.style.opacity = "1";
    } else {
      link.style.opacity = "0.7";
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

// Pre-fill service selection from data attributes
document.querySelectorAll("[data-service]").forEach((cta) => {
  cta.addEventListener("click", (e) => {
    const serviceValue = cta.getAttribute("data-service");
    const serviceSelect = document.getElementById("service-select");
    
    if (serviceValue && serviceSelect) {
      serviceSelect.value = serviceValue;
    }
  });
});

// Header scroll effect (add border/shadow when scrolled)
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) {
    header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.05)';
    header.style.borderBottom = '1px solid rgba(0, 0, 0, 0.05)';
  } else {
    header.style.boxShadow = 'none';
    header.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
  }
}, { passive: true });
