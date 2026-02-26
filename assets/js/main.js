// Smooth scrolling for anchor links
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const targetId = anchor.getAttribute("href");
    if (!targetId || targetId === "#" || !document.querySelector(targetId)) return;

    event.preventDefault();
    
    const targetElement = document.querySelector(targetId);
    if (!targetElement) return;

    const offsetTop = targetElement.offsetTop - 80; // Account for fixed header
    
    window.scrollTo({
      top: offsetTop,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  });
});

// Navigation highlighting based on scroll position
const sectionIds = ["services", "process", "results", "contact"];
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
  });
};

window.addEventListener("scroll", setActiveNav, { passive: true });
document.addEventListener("DOMContentLoaded", setActiveNav);

// Intersection Observer for reveal animations
const revealElements = document.querySelectorAll(".reveal");

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target); // Stop observing after animation
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
  // Fallback for browsers without IntersectionObserver or if user prefers reduced motion
  revealElements.forEach((el) => el.classList.add("is-visible"));
}

// Set current year in footer
document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
});

// Pre-fill service selection when service cards are clicked
document.querySelectorAll("[data-service]").forEach((cta) => {
  cta.addEventListener("click", (e) => {
    const serviceValue = cta.getAttribute("data-service");
    const serviceSelect = document.getElementById("service-select");
    
    if (serviceValue && serviceSelect) {
      serviceSelect.value = serviceValue;
      
      // Scroll to contact form
      const contactSection = document.getElementById("contact");
      if (contactSection) {
        contactSection.scrollIntoView({ 
          behavior: prefersReducedMotion ? "auto" : "smooth" 
        });
      }
    }
  });
});

// Handle form submission feedback (optional enhancement)
document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      // Optional: Add loading state or validation
      console.log('Form submitted');
    });
  }
});

// Mobile menu toggle (if needed in future)
// Currently not implemented as the navigation is simple enough to remain visible