const header = document.querySelector("[data-elevate]");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#site-nav");
const form = document.querySelector(".quote-form");

const updateHeader = () => {
  header?.classList.toggle("is-elevated", window.scrollY > 20);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  nav?.classList.toggle("is-open", !isOpen);
});

nav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    navToggle?.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    navToggle?.setAttribute("aria-expanded", "false");
    nav?.classList.remove("is-open");
  }
});

form?.addEventListener("submit", () => {
  const button = form.querySelector("button[type='submit']");
  if (button) {
    button.textContent = "Sending Quote Request...";
    button.setAttribute("aria-busy", "true");
  }
});
