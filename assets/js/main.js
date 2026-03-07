// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const targetId = anchor.getAttribute("href");
    if (!targetId || targetId === "#") return;

    const targetElement = document.querySelector(targetId);
    if (!targetElement) return;

    event.preventDefault();
    
    // Account for fixed navbar (70px)
    const offsetTop = targetElement.getBoundingClientRect().top + window.scrollY - 70;
    
    window.scrollTo({
      top: offsetTop,
      behavior: "smooth"
    });
  });
});

// Navigation highlighting based on scroll position
const sectionIds = ["licensing", "architecture", "security", "about", "contact"];
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
    const target = link.getAttribute("href")?.substring(1);
    if (target === activeId) {
      link.style.color = "var(--fg)";
    } else {
      link.style.color = "var(--fg-muted)";
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
