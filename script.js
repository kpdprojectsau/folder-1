const INSTAGRAM_URL =
  "https://www.instagram.com/kpd.projects?igsh=OG82MW1veHdzdWIy&utm_source=qr";
const TIKTOK_URL = "https://www.tiktok.com/@kpd.projects?_r=1&_t=ZS-96GnorOEDYo";

const header = document.querySelector("[data-elevate]");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#site-nav");
const form = document.querySelector(".quote-form");
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

const ensureModalStyles = () => {
  if (document.getElementById("kpd-modal-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "kpd-modal-styles";
  style.textContent = `
    .review-actions .button {
      appearance: none;
    }

    .modal-open {
      overflow: hidden;
    }

    .modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: none;
      place-items: center;
      padding: 18px;
    }

    .modal.is-open {
      display: grid;
    }

    .modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(7, 21, 40, 0.74);
      backdrop-filter: blur(4px);
    }

    .modal-card {
      position: relative;
      z-index: 1;
      width: min(680px, 100%);
      max-height: calc(100vh - 36px);
      overflow: auto;
      padding: 26px;
      border: 1px solid rgba(7, 21, 40, 0.12);
      border-radius: 8px;
      background: var(--white);
      box-shadow: 0 24px 70px rgba(7, 21, 40, 0.32);
    }

    .modal-card-small {
      width: min(520px, 100%);
    }

    .modal-close {
      position: absolute;
      top: 14px;
      right: 14px;
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border: 1px solid rgba(7, 21, 40, 0.14);
      border-radius: 6px;
      background: var(--soft);
      color: var(--navy);
      font-size: 1.55rem;
      line-height: 1;
      cursor: pointer;
    }

    .modal-close:hover,
    .modal-close:focus-visible {
      border-color: rgba(43, 120, 194, 0.45);
      background: var(--white);
      outline: 3px solid rgba(43, 120, 194, 0.16);
    }

    .modal-heading {
      display: grid;
      gap: 8px;
      padding-right: 48px;
      margin-bottom: 20px;
    }

    .modal-heading h2 {
      font-size: clamp(1.8rem, 5vw, 2.8rem);
    }

    .modal-heading p:last-child {
      margin: 0;
      color: var(--slate);
    }

    .optional-label {
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 800;
    }

    .star-rating {
      display: grid;
      gap: 9px;
      min-width: 0;
      padding: 0;
      border: 0;
    }

    .star-rating legend {
      padding: 0;
      color: var(--navy);
      font-size: 0.92rem;
      font-weight: 850;
    }

    .star-rating-options {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
    }

    .star-rating-options label {
      position: relative;
      min-width: 0;
      cursor: pointer;
    }

    .star-rating-options input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .star-rating-options span {
      display: grid;
      place-items: center;
      min-height: 48px;
      padding: 10px 8px;
      border: 1px solid #c8d1dc;
      border-radius: 6px;
      background: var(--white);
      color: var(--navy);
      font-size: 0.9rem;
      font-weight: 850;
      text-align: center;
      transition:
        border-color 160ms ease,
        background 160ms ease,
        color 160ms ease,
        box-shadow 160ms ease;
    }

    .star-rating-options input:checked + span {
      border-color: var(--blue);
      background: var(--navy);
      color: var(--white);
      box-shadow: 0 12px 24px rgba(7, 21, 40, 0.14);
    }

    .star-rating-options input:focus-visible + span {
      outline: 3px solid rgba(43, 120, 194, 0.18);
      outline-offset: 2px;
    }

    .social-modal-links {
      display: grid;
      gap: 12px;
    }

    .social-modal-link {
      display: grid;
      gap: 3px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--soft);
      color: var(--navy);
      text-decoration: none;
      transition:
        border-color 160ms ease,
        background 160ms ease,
        transform 160ms ease;
    }

    .social-modal-link:hover,
    .social-modal-link:focus-visible {
      border-color: rgba(43, 120, 194, 0.45);
      background: var(--white);
      outline: none;
      transform: translateY(-1px);
    }

    .social-modal-link span {
      font-size: 1.04rem;
      font-weight: 900;
    }

    .social-modal-link small {
      color: var(--muted);
      font-weight: 750;
      overflow-wrap: anywhere;
    }

    @media (max-width: 560px) {
      .modal-card {
        padding: 22px 18px;
      }

      .modal-heading {
        padding-right: 40px;
      }

      .star-rating-options {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.append(style);
};

const ensureReviewModal = () => {
  if (document.getElementById("review-modal")) {
    return;
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div class="modal" id="review-modal" data-modal aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
        <div class="modal-backdrop" data-modal-close></div>
        <div class="modal-card" role="document">
          <button class="modal-close" type="button" data-modal-close aria-label="Close review form">&times;</button>
          <div class="modal-heading">
            <p class="eyebrow">Leave A Review</p>
            <h2 id="review-modal-title">Share Your KPD Projects Experience</h2>
            <p>Your review is emailed to KPD Projects first and is not published automatically.</p>
          </div>

          <form class="review-form" action="https://formsubmit.co/kpdprojectsau@gmail.com" method="POST" aria-label="Review submission form">
            <input type="hidden" name="_subject" value="New KPD Projects Review Submission">
            <input type="hidden" name="_template" value="table">
            <input type="hidden" name="_captcha" value="false">
            <input type="hidden" name="_next" value="https://kpdprojects.com.au/thanks.html">

            <div class="form-grid">
              <div class="form-row">
                <label for="review-name">Name</label>
                <input id="review-name" name="name" type="text" autocomplete="name" required>
              </div>
              <div class="form-row">
                <label for="review-email">Email Address</label>
                <input id="review-email" name="email" type="email" autocomplete="email" required>
              </div>
              <fieldset class="star-rating full">
                <legend>Star Rating</legend>
                <div class="star-rating-options" role="radiogroup" aria-label="Star rating">
                  <label>
                    <input type="radio" name="star_rating" value="1 Star" required>
                    <span>1 Star</span>
                  </label>
                  <label>
                    <input type="radio" name="star_rating" value="2 Stars" required>
                    <span>2 Stars</span>
                  </label>
                  <label>
                    <input type="radio" name="star_rating" value="3 Stars" required>
                    <span>3 Stars</span>
                  </label>
                  <label>
                    <input type="radio" name="star_rating" value="4 Stars" required>
                    <span>4 Stars</span>
                  </label>
                  <label>
                    <input type="radio" name="star_rating" value="5 Stars" required checked>
                    <span>5 Stars</span>
                  </label>
                </div>
              </fieldset>
              <div class="form-row full">
                <label for="review-description">Review Description <span class="optional-label">Optional</span></label>
                <textarea id="review-description" name="review_description" rows="5" placeholder="Share a short note about your experience."></textarea>
              </div>
            </div>

            <button class="button button-primary form-submit" type="submit">Send Review</button>
          </form>
        </div>
      </div>
    `,
  );
};

const ensureSocialsModal = () => {
  if (document.getElementById("socials-modal")) {
    return;
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div class="modal" id="socials-modal" data-modal aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="socials-modal-title">
        <div class="modal-backdrop" data-modal-close></div>
        <div class="modal-card modal-card-small" role="document">
          <button class="modal-close" type="button" data-modal-close aria-label="Close socials">&times;</button>
          <div class="modal-heading">
            <p class="eyebrow">Socials</p>
            <h2 id="socials-modal-title">Follow KPD Projects</h2>
            <p>See recent work, updates and project activity from KPD Projects.</p>
          </div>

          <div class="social-modal-links" aria-label="KPD Projects social links">
            <a class="social-modal-link" href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer">
              <span>Instagram</span>
              <small>${INSTAGRAM_URL}</small>
            </a>
            <a class="social-modal-link" href="${TIKTOK_URL}" target="_blank" rel="noopener noreferrer">
              <span>TikTok</span>
              <small>${TIKTOK_URL}</small>
            </a>
          </div>
        </div>
      </div>
    `,
  );
};

const convertReviewAction = (selectorText, modalId) => {
  const action = Array.from(document.querySelectorAll(".review-actions .button")).find(
    (element) => element.textContent.trim() === selectorText,
  );

  if (!action) {
    return;
  }

  if (action instanceof HTMLAnchorElement) {
    const button = document.createElement("button");
    button.className = action.className;
    button.type = "button";
    button.textContent = action.textContent;
    button.setAttribute("data-modal-open", modalId);
    action.replaceWith(button);
    return;
  }

  if (action instanceof HTMLButtonElement) {
    action.type = "button";
    action.setAttribute("data-modal-open", modalId);
  }
};

const prepareModals = () => {
  ensureModalStyles();
  ensureReviewModal();
  ensureSocialsModal();
  convertReviewAction("Leave A Review", "review-modal");
  convertReviewAction("Check Out Our Socials", "socials-modal");
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

const bindModalTriggers = () => {
  document.querySelectorAll("[data-modal-open]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const modalId = trigger.getAttribute("data-modal-open");
      const modal = modalId ? document.getElementById(modalId) : null;
      openModal(modal);
    });
  });

  document.querySelectorAll("[data-modal]").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      const closeTrigger = event.target instanceof HTMLElement
        ? event.target.closest("[data-modal-close]")
        : null;

      if (closeTrigger) {
        closeModal(modal);
      }
    });
  });
};

prepareModals();
updateHeader();
bindModalTriggers();

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

form?.addEventListener("submit", () => {
  const button = form.querySelector("button[type='submit']");
  if (button) {
    button.textContent = "Sending Quote Request...";
    button.setAttribute("aria-busy", "true");
  }
});
