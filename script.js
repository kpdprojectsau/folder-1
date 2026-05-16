// Google Apps Script Web App endpoint for KPD Projects quote and review forms.
const KPD_FORMS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzA3az56j9lRvLDlpcrxlF9M-aUMuABvEtdxTaozl9eAbjdH4l0iQA_J-U4NZ00EyQx/exec";
const KPD_CONTACT_EMAIL = "kpdprojectsau@gmail.com";
const header = document.querySelector("[data-elevate]");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#site-nav");
const managedForms = document.querySelectorAll("[data-kpd-form]");
const modalTriggers = document.querySelectorAll("[data-modal-open]");
const modals = document.querySelectorAll("[data-modal]");
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");
let activeModal = null;
let previousFocus = null;

const updateHeader = () => {
  header?.classList.toggle("is-elevated", window.scrollY > 20);
};

const getFocusableElements = (modal) =>
  Array.from(modal.querySelectorAll(focusableSelector)).filter(
    (element) => element instanceof HTMLElement && element.offsetParent !== null,
  );

const openModal = (modal) => {
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  activeModal = modal;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  const focusable = getFocusableElements(modal);
  requestAnimationFrame(() => {
    focusable[0]?.focus();
  });
};

const closeModal = (modal = activeModal) => {
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");

  if (activeModal === modal) {
    activeModal = null;
  }

  if (!document.querySelector("[data-modal].is-open")) {
    document.body.classList.remove("modal-open");
  }

  previousFocus?.focus();
  previousFocus = null;
};

const isFormsEndpointConfigured = () =>
  KPD_FORMS_ENDPOINT.startsWith("https://script.google.com/") &&
  KPD_FORMS_ENDPOINT.endsWith("/exec");

const setFormStatus = (formElement, message) => {
  const status = formElement.querySelector("[data-form-status]");

  if (!status) {
    return;
  }

  status.textContent = message;
  status.hidden = false;
};

const getSubmittingText = (formElement) => {
  const formType = new FormData(formElement).get("form_type");
  return formType === "review" ? "Sending Review..." : "Sending Quote Request...";
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

modalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const modalId = trigger.getAttribute("data-modal-open");
    const modal = modalId ? document.getElementById(modalId) : null;
    openModal(modal);
  });
});

modals.forEach((modal) => {
  modal.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const closeTrigger = target?.closest("[data-modal-close]");
    const clickedOutsideCard = target && !target.closest(".modal-card");

    if (closeTrigger || clickedOutsideCard) {
      closeModal(modal);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    navToggle?.setAttribute("aria-expanded", "false");
    nav?.classList.remove("is-open");
    closeModal();
  }

  if (event.key === "Tab" && activeModal) {
    const focusable = getFocusableElements(activeModal);

    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
    } else if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  }
});

managedForms.forEach((formElement) => {
  if (isFormsEndpointConfigured()) {
    formElement.action = KPD_FORMS_ENDPOINT;
  }

  formElement.addEventListener("submit", (event) => {
    if (!isFormsEndpointConfigured()) {
      event.preventDefault();
      setFormStatus(
        formElement,
        `Form service is not connected yet. Please email ${KPD_CONTACT_EMAIL} directly.`,
      );
      return;
    }

    formElement.action = KPD_FORMS_ENDPOINT;

    const button = formElement.querySelector("button[type='submit']");

    if (button) {
      button.textContent = getSubmittingText(formElement);
      button.setAttribute("aria-busy", "true");
    }
  });
});
