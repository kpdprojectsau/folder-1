const KPD_FORMS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzA3az56j9lRvLDlpcrxlF9M-aUMuABvEtdxTaozl9eAbjdH4l0iQA_J-U4NZ00EyQx/exec";
const KPD_CONTACT_EMAIL = "kpdprojectsau@gmail.com";

const header = document.querySelector("[data-elevate]");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#site-nav");
const form = document.querySelector("[data-kpd-form]");

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

document.querySelectorAll("[data-comparison]").forEach((comparison) => {
  const range = comparison.querySelector(".comparison-range");

  if (!(range instanceof HTMLInputElement)) {
    return;
  }

  const updateComparison = () => {
    const value = Math.min(100, Math.max(0, Number(range.value)));
    comparison.style.setProperty("--position", `${value}%`);
    range.setAttribute("aria-valuetext", `${value}% after photo revealed`);
  };

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
  const requiredFields = Array.from(form.querySelectorAll("[required]"));
  const photoInput = form.querySelector("#photos");
  const submitButton = form.querySelector("button[type='submit']");
  const status = form.querySelector("[data-form-status]");

  form.noValidate = true;
  form.action = KPD_FORMS_ENDPOINT;

  requiredFields.forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") {
        validateField(field);
      }
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
      form.querySelector("[aria-invalid='true']")?.focus();

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
    window.sessionStorage.setItem("kpdQuoteSubmittedAt", String(Date.now()));

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
}
