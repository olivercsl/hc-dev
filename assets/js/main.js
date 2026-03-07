// Add scrolled class to navbar
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}, { passive: true });

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const targetId = anchor.getAttribute("href");
    if (!targetId || targetId === "#") return;

    const targetElement = document.querySelector(targetId);
    if (!targetElement) return;

    event.preventDefault();
    
    // Account for fixed navbar (80px)
    const offsetTop = targetElement.getBoundingClientRect().top + window.scrollY - 80;
    
    window.scrollTo({
      top: offsetTop,
      behavior: "smooth"
    });
  });
});

// Navigation highlighting based on scroll position
const sectionIds = ["licensing", "architecture", "security", "about", "contact"];
const navLinks = Array.from(document.querySelectorAll(".nav-links a:not(.nav-cta)"));

const setActiveNav = () => {
  const fromTop = window.scrollY + 120;
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
    const target = link.getAttribute("href")?.substring(1);
    if (target === activeId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
};

window.addEventListener("scroll", setActiveNav, { passive: true });
document.addEventListener("DOMContentLoaded", setActiveNav);

// Set current year in footer
document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
});

// Intersection Observer for fade-in animations
const fadeElements = document.querySelectorAll('.fade-in');
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

fadeElements.forEach(el => observer.observe(el));