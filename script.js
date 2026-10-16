const KPD_FORMS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzA3az56j9lRvLDlpcrxlF9M-aUMuABvEtdxTaozl9eAbjdH4l0iQA_J-U4NZ00EyQx/exec";
const KPD_CONTACT_EMAIL = "kpdprojectsau@gmail.com";

const readSession = (key) => {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
};
const writeSession = (key, value) => {
  try { window.sessionStorage.setItem(key, value); } catch { /* Storage is optional. */ }
};
const removeSession = (key) => {
  try { window.sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
};

// Enhance ordinary responsive rows without moving cards or changing focus order.
document.querySelectorAll("[data-masonry]").forEach((grid) => {
  if (!("ResizeObserver" in window)) return;
  let frame = 0;
  const layout = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    const gap = parseFloat(getComputedStyle(grid).getPropertyValue("--masonry-gap")) || 24;
    const measurements = Array.from(grid.children).map((item) => ({
      item, span: item.hidden ? null : Math.ceil(item.getBoundingClientRect().height + gap),
    }));
    measurements.forEach(({ item, span }) => {
      const value = span ? `span ${span}` : "";
      if (item.style.gridRowEnd !== value) item.style.gridRowEnd = value;
    });
    grid.classList.add("is-masonry");
  };
  const scheduleLayout = () => {
    if (!frame) frame = requestAnimationFrame(layout);
  };
  const observer = new ResizeObserver(scheduleLayout);
  observer.observe(grid);
  Array.from(grid.children).forEach((item) => observer.observe(item));
  grid.addEventListener("load", scheduleLayout, true);
  grid.addEventListener("error", scheduleLayout, true);
  // Finish filter changes before another card can be clicked or its position saved.
  grid.addEventListener("kpd:portfolio-updated", layout);
  document.fonts?.ready.then(scheduleLayout);
  scheduleLayout();
});

const header = document.querySelector("[data-elevate]");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#site-nav");
const form = document.querySelector("[data-kpd-form]");
const mobileNavigation = window.matchMedia("(max-width: 980px)");

const updateHeader = () => {
  header?.classList.toggle("is-elevated", window.scrollY > 20);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const setNavigationOpen = (open, restoreFocus = false) => {
  navToggle?.setAttribute("aria-expanded", String(open));
  navToggle?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  nav?.classList.toggle("is-open", open);
  document.body.classList.toggle("nav-open", open && mobileNavigation.matches);
  if (!open && restoreFocus) navToggle?.focus();
};

navToggle?.addEventListener("click", () => {
  setNavigationOpen(navToggle.getAttribute("aria-expanded") !== "true");
});

nav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    setNavigationOpen(false);
  }
});

document.addEventListener("pointerdown", (event) => {
  if (navToggle?.getAttribute("aria-expanded") === "true" && !header?.contains(event.target)) {
    setNavigationOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navToggle?.getAttribute("aria-expanded") === "true") {
    setNavigationOpen(false, true);
  }
});

mobileNavigation.addEventListener?.("change", () => setNavigationOpen(false));

const projectBack = document.querySelector("[data-project-back]");
if (projectBack instanceof HTMLAnchorElement) {
  const primaryCategory = projectBack.closest("[data-primary-category]")?.dataset.primaryCategory || "all";
  const primaryName = projectBack.closest("[data-primary-category]")?.dataset.primaryCategoryName || "projects";
  const params = new URLSearchParams(window.location.search);
  const from = /^[a-z0-9-]+$/.test(params.get("from") || "") ? params.get("from") : primaryCategory;
  projectBack.href = from === "all" ? "/projects/" : `/projects/?category=${encodeURIComponent(from)}`;
  projectBack.lastChild.textContent = from === primaryCategory ? ` Back to ${primaryName} projects` : from === "all" ? " Back to all projects" : " Back to projects";

  projectBack.addEventListener("click", (event) => {
    try {
      const previous = new URL(document.referrer);
      if (previous.origin === window.location.origin && previous.pathname === "/projects/") {
        event.preventDefault();
        window.history.back();
      }
    } catch {
      // Keep the category fallback link when no usable referrer is available.
    }
  });
}

const galleryDialog = document.querySelector("[data-gallery-dialog]");
const galleryTriggers = Array.from(document.querySelectorAll("[data-gallery-index]"));
if (galleryDialog instanceof HTMLDialogElement && galleryTriggers.length) {
  const fullImage = galleryDialog.querySelector("[data-gallery-full]");
  const caption = galleryDialog.querySelector("[data-gallery-full-caption]");
  const counter = galleryDialog.querySelector("[data-gallery-count]");
  const galleryStatus = galleryDialog.querySelector("[data-gallery-status]");
  const stage = galleryDialog.querySelector("[data-gallery-stage]");
  let currentIndex = 0;
  let triggerToRestore = null;
  let swipeStart = null;

  const showGalleryImage = (index) => {
    currentIndex = (index + galleryTriggers.length) % galleryTriggers.length;
    const trigger = galleryTriggers[currentIndex];
    if (fullImage instanceof HTMLImageElement) {
      fullImage.hidden = false;
      if (galleryStatus) {
        galleryStatus.textContent = "Loading photo…";
        galleryStatus.hidden = false;
      }
      fullImage.src = trigger.dataset.gallerySrc || "";
      fullImage.alt = trigger.dataset.galleryAlt || "Project photo";
    }
    if (caption) {
      caption.textContent = trigger.dataset.galleryCaption || trigger.dataset.galleryAlt || "";
      caption.hidden = !caption.textContent;
    }
    if (counter) counter.textContent = `Photo ${currentIndex + 1} of ${galleryTriggers.length}`;
  };

  fullImage?.addEventListener("load", () => {
    if (galleryStatus) galleryStatus.hidden = true;
  });
  fullImage?.addEventListener("error", () => {
    fullImage.hidden = true;
    if (galleryStatus) {
      galleryStatus.textContent = "This photo could not load. Try another photo or close the gallery and try again.";
      galleryStatus.hidden = false;
    }
  });

  const closeGallery = () => galleryDialog.close();
  const openGallery = (index, trigger) => {
    triggerToRestore = trigger;
    showGalleryImage(index);
    galleryDialog.showModal();
    document.body.classList.add("lightbox-open");
    galleryDialog.querySelector("[data-gallery-close]")?.focus();
  };

  galleryTriggers.forEach((trigger, index) => trigger.addEventListener("click", () => openGallery(index, trigger)));
  galleryDialog.querySelector("[data-gallery-close]")?.addEventListener("click", closeGallery);
  galleryDialog.querySelector("[data-gallery-previous]")?.addEventListener("click", () => showGalleryImage(currentIndex - 1));
  galleryDialog.querySelector("[data-gallery-next]")?.addEventListener("click", () => showGalleryImage(currentIndex + 1));
  galleryDialog.addEventListener("click", (event) => {
    if (event.target === galleryDialog) closeGallery();
  });
  galleryDialog.addEventListener("close", () => {
    document.body.classList.remove("lightbox-open");
    triggerToRestore?.focus();
  });
  galleryDialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showGalleryImage(currentIndex - 1);
    if (event.key === "ArrowRight") showGalleryImage(currentIndex + 1);
  });
  stage?.addEventListener("pointerdown", (event) => {
    swipeStart = { x: event.clientX, y: event.clientY };
  });
  stage?.addEventListener("pointerup", (event) => {
    if (!swipeStart) return;
    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      showGalleryImage(currentIndex + (deltaX < 0 ? 1 : -1));
    }
  });
  stage?.addEventListener("pointercancel", () => { swipeStart = null; });
}

document.querySelectorAll("[data-comparison]").forEach((comparison) => {
  const range = comparison.querySelector(".comparison-range");

  if (!(range instanceof HTMLInputElement)) {
    return;
  }

  const updateComparison = () => {
    const value = Math.min(100, Math.max(0, Number(range.value)));
    const afterValue = 100 - value;
    comparison.style.setProperty("--position", `${value}%`);
    range.setAttribute(
      "aria-valuetext",
      `${value}% before and ${afterValue}% after visible`,
    );
  };

  const updateFromPointer = (event) => {
    const bounds = range.getBoundingClientRect();

    if (!bounds.width) {
      return;
    }

    const value = ((event.clientX - bounds.left) / bounds.width) * 100;
    range.value = String(Math.round(Math.min(100, Math.max(0, value))));
    updateComparison();
  };

  let activePointerId = null;

  range.addEventListener("pointerdown", (event) => {
    if (event.isPrimary === false) {
      return;
    }

    activePointerId = event.pointerId;

    if (range.setPointerCapture) {
      range.setPointerCapture(event.pointerId);
    }

    updateFromPointer(event);
  });

  range.addEventListener("pointermove", (event) => {
    if (event.isPrimary === false || event.pointerId !== activePointerId) {
      return;
    }

    updateFromPointer(event);
  });

  const releasePointer = (event) => {
    if (range.hasPointerCapture?.(event.pointerId)) {
      range.releasePointerCapture(event.pointerId);
    }

    if (event.pointerId === activePointerId) {
      activePointerId = null;
    }
  };

  range.addEventListener("pointerup", releasePointer);
  range.addEventListener("pointercancel", releasePointer);

  range.addEventListener("input", updateComparison);
  range.addEventListener("change", updateComparison);
  range.addEventListener("keydown", (event) => {
    const currentValue = Number(range.value);
    const valuesByKey = {
      ArrowLeft: currentValue - 1,
      ArrowDown: currentValue - 1,
      ArrowRight: currentValue + 1,
      ArrowUp: currentValue + 1,
      Home: 0,
      End: 100,
    };

    if (!(event.key in valuesByKey)) {
      return;
    }

    event.preventDefault();
    range.value = String(Math.min(100, Math.max(0, valuesByKey[event.key])));
    updateComparison();
  });
  updateComparison();
});

const fieldMessages = {
  name: "Enter your name.",
  phone: "Enter a phone number.",
  email: "Enter an email address.",
  suburb: "Enter the job suburb.",
  "property-type": "Select the property type.",
  "job-type": "Select the job type.",
  description: "Add a brief description of the job.",
  timeframe: "Select your preferred timeframe.",
  urgency: "Select the job urgency.",
  "contact-method": "Select how you would prefer to be contacted.",
};

const getErrorElement = (field) => document.getElementById(`${field.id}-error`);

const setFieldError = (field, message) => {
  const error = getErrorElement(field);

  if (error) {
    error.textContent = message;
  }

  if (message) {
    field.setAttribute("aria-invalid", "true");
  } else {
    field.removeAttribute("aria-invalid");
  }

  const describedBy = [
    field.id === "photos" ? "photo-help photo-delivery" : "",
    message ? error?.id : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (describedBy) field.setAttribute("aria-describedby", describedBy);
  else field.removeAttribute("aria-describedby");
};

const validateField = (field) => {
  let message = "";

  if (field.validity.valueMissing) {
    message = fieldMessages[field.id] || "Complete this field.";
  } else if (field.validity.typeMismatch && field.type === "email") {
    message = "Enter an email address in the format name@example.com.";
  }

  setFieldError(field, message);
  return !message;
};

const isSupportedPhoto = (file) => {
  const supportedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ]);
  const supportedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  return supportedMimeTypes.has(file.type) || (!file.type && supportedExtension);
};

const validatePhotos = (photoInput) => {
  const unsupported = Array.from(photoInput.files || []).find((file) => !isSupportedPhoto(file));
  const message = unsupported
    ? `${unsupported.name} is not a supported image. Choose a JPG, PNG, WebP or HEIC photo.`
    : "";

  photoInput.setCustomValidity(message);
  setFieldError(photoInput, message);
  return !message;
};

const renderSelectedFiles = (photoInput) => {
  const list = form?.querySelector("[data-selected-files]");

  if (!(list instanceof HTMLUListElement)) {
    return;
  }

  list.replaceChildren();

  Array.from(photoInput.files || []).forEach((file, index) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const remove = document.createElement("button");

    name.textContent = file.name;
    name.title = file.name;
    remove.type = "button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${file.name}`);

    remove.addEventListener("click", () => {
      const transfer = new DataTransfer();

      Array.from(photoInput.files || []).forEach((selectedFile, selectedIndex) => {
        if (selectedIndex !== index) {
          transfer.items.add(selectedFile);
        }
      });

      photoInput.files = transfer.files;
      validatePhotos(photoInput);
      renderSelectedFiles(photoInput);
      photoInput.focus();
    });

    item.append(name, remove);
    list.append(item);
  });
};

if (form instanceof HTMLFormElement) {
  const draftStorageKey = "kpdQuoteDraft";
  const requiredFields = Array.from(form.querySelectorAll("[required]"));
  const photoInput = form.querySelector("#photos");
  const submitButton = form.querySelector("button[type='submit']");
  const status = form.querySelector("[data-form-status]");

  form.noValidate = true;
  form.action = KPD_FORMS_ENDPOINT;

  try {
    const draft = JSON.parse(readSession(draftStorageKey) || "{}");
    Array.from(form.elements).forEach((field) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
      if (!field.name || field.type === "file" || field.type === "hidden" || !(field.name in draft)) return;
      field.value = draft[field.name];
    });
  } catch {
    removeSession(draftStorageKey);
  }

  const saveDraft = () => {
    const draft = {};
    Array.from(form.elements).forEach((field) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
      if (!field.name || field.type === "file" || field.type === "hidden") return;
      draft[field.name] = field.value;
    });
    writeSession(draftStorageKey, JSON.stringify(draft));
  };

  form.addEventListener("input", saveDraft);
  form.addEventListener("change", saveDraft);

  requiredFields.forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") {
        validateField(field);
      }
      if (status && !status.hidden) status.hidden = true;
    });
    field.addEventListener("change", () => validateField(field));
  });

  if (photoInput instanceof HTMLInputElement) {
    photoInput.addEventListener("change", () => {
      validatePhotos(photoInput);
      renderSelectedFiles(photoInput);
    });
  }

  form.addEventListener("formdata", (event) => {
    const description = form.querySelector("#description");
    const detailLines = [
      ["Property type", form.querySelector("#property-type")?.value],
      ["Urgency", form.querySelector("#urgency")?.value],
      ["Preferred contact method", form.querySelector("#contact-method")?.value],
    ];

    if (photoInput instanceof HTMLInputElement && photoInput.files.length) {
      detailLines.push([
        "Photos",
        `${photoInput.files.length} selected for separate email: ${Array.from(photoInput.files)
          .map((file) => file.name)
          .join(", ")}`,
      ]);
    }

    const extraDetails = detailLines
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n");
    const jobDescription = description instanceof HTMLTextAreaElement ? description.value : "";

    event.formData.set(
      "brief_description",
      [jobDescription, extraDetails].filter(Boolean).join("\n\n"),
    );
  });

  form.addEventListener("submit", (event) => {
    if (form.dataset.submitting === "true") {
      event.preventDefault();
      return;
    }

    const fieldsValid = requiredFields.map((field) => validateField(field)).every(Boolean);
    const photosValid =
      !(photoInput instanceof HTMLInputElement) || validatePhotos(photoInput);

    if (!fieldsValid || !photosValid) {
      event.preventDefault();
      const firstInvalid = form.querySelector("[aria-invalid='true']");
      firstInvalid?.focus({ preventScroll: true });
      firstInvalid?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });

      if (status) {
        status.textContent = "Check the highlighted fields and try again.";
        status.hidden = false;
      }
      return;
    }

    if (!KPD_FORMS_ENDPOINT.startsWith("https://script.google.com/") || !KPD_FORMS_ENDPOINT.endsWith("/exec")) {
      event.preventDefault();

      if (status) {
        status.textContent = `The form service is unavailable. Please email ${KPD_CONTACT_EMAIL}.`;
        status.hidden = false;
      }
      return;
    }

    form.dataset.submitting = "true";
    writeSession("kpdQuoteSubmittedAt", String(Date.now()));

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.textContent = "Sending quote request…";
    }

    if (status) {
      status.textContent = "Sending your quote request securely…";
      status.hidden = false;
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted || form.dataset.submitting !== "true") return;
    form.dataset.submitting = "false";
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      submitButton.textContent = "Request a Quote";
    }
  });
}
