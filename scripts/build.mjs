import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProjectImages } from "./project-images.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildRoot = path.join(root, "dist");
const output = path.join(buildRoot, "client");
const siteUrl = "https://kpdprojects.com.au";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const categoriesData = await readJson(path.join(root, "content/categories.json"));
const categoryFiles = categoriesData.categories || [];
const projectFiles = (await readdir(path.join(root, "content/projects")))
  .filter((file) => file.endsWith(".json"))
  .sort();
const projects = await Promise.all(
  projectFiles.map((file) => readJson(path.join(root, "content/projects", file))),
);

const errors = [];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const categorySlugs = new Set();
const projectSlugs = new Set();

for (const category of categoryFiles) {
  if (!category.slug || !slugPattern.test(category.slug)) errors.push(`Invalid category slug: ${category.slug || "(missing)"}`);
  if (categorySlugs.has(category.slug)) errors.push(`Duplicate category slug: ${category.slug}`);
  categorySlugs.add(category.slug);
  if (!category.name) errors.push(`Category ${category.slug} is missing a name.`);
}

for (const project of projects) {
  if (!project.slug || !slugPattern.test(project.slug)) errors.push(`Invalid project slug: ${project.slug || "(missing)"}`);
  if (projectSlugs.has(project.slug)) errors.push(`Duplicate project slug: ${project.slug}`);
  projectSlugs.add(project.slug);
  if (!project.title) errors.push(`Project ${project.slug} is missing a title.`);
  if (!["draft", "published"].includes(project.status)) errors.push(`Project ${project.slug} has an invalid status.`);
  if (!categorySlugs.has(project.primary_category)) errors.push(`Project ${project.slug} has an unknown primary category.`);
  for (const category of project.categories || []) {
    if (!categorySlugs.has(category)) errors.push(`Project ${project.slug} uses unknown category ${category}.`);
  }
  if (!project.cover_image || !project.cover_alt) errors.push(`Project ${project.slug} needs a cover image and alternative text.`);
  for (const image of project.gallery || []) {
    if (!image.image || !image.alt) errors.push(`Project ${project.slug} has a gallery image without descriptive alternative text.`);
  }
  for (const pair of project.before_after || []) {
    if (!pair.before_image || !pair.before_alt || !pair.after_image || !pair.after_alt) {
      errors.push(`Project ${project.slug} has an incomplete before-and-after pair.`);
    }
  }
}

if (errors.length) throw new Error(`Content validation failed:\n- ${errors.join("\n- ")}`);

const publishedProjects = projects
  .filter((project) => project.status === "published")
  .map((project) => ({
    ...project,
    categories: Array.from(new Set([project.primary_category, ...(project.categories || [])])),
  }))
  .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999) || a.title.localeCompare(b.title));

const usedCategorySlugs = new Set(publishedProjects.flatMap((project) => project.categories));
const visibleCategories = categoryFiles
  .filter((category) => category.visible !== false && usedCategorySlugs.has(category.slug))
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
const categoryBySlug = new Map(categoryFiles.map((category) => [category.slug, category]));

const projectImages = createProjectImages({ root });
for (const project of publishedProjects) {
  const sources = [project.cover_image, ...(project.gallery || []).map((item) => item.image),
    ...(project.before_after || []).flatMap((pair) => [pair.before_image, pair.after_image])];
  try { await Promise.all(sources.map((src) => projectImages.prepare(src))); } catch (error) {
    throw new Error(`Photo processing failed for "${project.title}": ${error.message}`);
  }
}

const imageMarkup = async ({ src, alt, className = "", loading = "lazy", sizes = "(max-width: 760px) 100vw, 50vw", fetchPriority = "auto" }) => {
  const { variants, largest } = await projectImages.prepare(src);
  const fallback = variants.find((variant) => variant.width >= 800) || largest;
  const escapedSrc = escapeHtml(fallback.src);
  const srcset = ` srcset="${variants.map((variant) => `${escapeHtml(variant.src)} ${variant.width}w`).join(", ")}" sizes="${escapeHtml(sizes)}"`;
  const sizeAttributes = ` width="${largest.width}" height="${largest.height}"`;
  const priorityAttribute = fetchPriority !== "auto" ? ` fetchpriority="${fetchPriority}"` : "";
  const photoStyle = `--photo-ratio:${largest.width / largest.height};--photo-width:${largest.width}px;aspect-ratio:${largest.width}/${largest.height}`;
  return `<img${className ? ` class="${escapeHtml(className)}"` : ""} src="${escapedSrc}"${srcset}${sizeAttributes} style="${photoStyle}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async"${priorityAttribute}>`;
};

const categoryName = (slug) => categoryBySlug.get(slug)?.name || slug;
const projectUrl = (project) => `/projects/${project.slug}/`;

const renderHeader = () => `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header" data-elevate>
    <a class="brand" href="/" aria-label="KPD Projects home">
      <img class="brand-logo" src="/assets/kpd-logo-dark.jpeg" alt="" width="1254" height="1254">
      <span class="brand-lines"><span>KPD Projects</span><small>Sydney renovation</small></span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu">
      <span></span><span></span><span></span><span class="sr-only">Menu</span>
    </button>
    <nav class="site-nav" id="site-nav" aria-label="Primary navigation">
      <a href="/">Home</a>
      <a href="/#services">Services</a>
      <a href="/projects/">Projects</a>
      <a href="/#about">About</a>
      <a class="nav-cta" href="/#contact">Send photos for a quote</a>
    </nav>
  </header>`;

const renderFooter = () => `
  <footer class="site-footer">
    <div class="section-inner footer-grid">
      <a class="brand footer-brand" href="/"><img class="brand-logo" src="/assets/kpd-logo-dark.jpeg" alt="" width="1254" height="1254"><span class="brand-lines"><span>KPD Projects</span><small>Renovation &amp; property maintenance</small></span></a>
      <div><p>Reliable property improvement work across Sydney's North Shore.</p><a href="mailto:kpdprojectsau@gmail.com">kpdprojectsau@gmail.com</a></div>
    </div>
  </footer>`;

const renderDocument = ({ title, description, body, canonical, image = "", bodyClass = "", extraScript = "" }) => {
  const absoluteCanonical = `${siteUrl}${canonical}`;
  const socialImage = image ? `${siteUrl}${image}` : `${siteUrl}/assets/kpd-projects-hero.png`;
  return `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="theme-color" content="#071528">
    <link rel="canonical" href="${escapeHtml(absoluteCanonical)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeHtml(absoluteCanonical)}">
    <meta property="og:image" content="${escapeHtml(socialImage)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(socialImage)}">
    <link rel="icon" href="/assets/kpd-logo-dark.jpeg">
    <link rel="stylesheet" href="/styles.css?v=4">
    <script src="/script.js?v=4" defer></script>${extraScript ? `\n    <script src="${extraScript}?v=4" defer></script>` : ""}
  </head>
  <body${bodyClass ? ` class="${escapeHtml(bodyClass)}"` : ""}>
    ${renderHeader()}
    ${body}
    ${renderFooter()}
  </body>
</html>\n`;
};

const renderCategoryLinks = () => visibleCategories.map((category) => {
  const count = publishedProjects.filter((project) => project.categories.includes(category.slug)).length;
  return `<a class="category-link-card" href="/projects/?category=${encodeURIComponent(category.slug)}">
    <span>${escapeHtml(String(count).padStart(2, "0"))} project${count === 1 ? "" : "s"}</span>
    <h3>${escapeHtml(category.name)}</h3>
    <p>${escapeHtml(category.description || "Browse completed work in this category.")}</p>
    <strong>View projects <span aria-hidden="true">→</span></strong>
  </a>`;
}).join("\n");

const renderProjectCard = async (project) => {
  const image = await imageMarkup({ src: project.cover_image, alt: project.cover_alt, className: "project-card-image", sizes: "(max-width: 760px) 100vw, 33vw" });
  const categoryLabels = project.categories.map((slug) => categoryName(slug));
  return `<article class="project-card" data-project-card data-categories="${escapeHtml(project.categories.join(" "))}">
    <a class="project-card-media" data-project-link href="${projectUrl(project)}" aria-label="View ${escapeHtml(project.title)}">${image}</a>
    <div class="project-card-copy">
      <p class="project-kicker">${escapeHtml(categoryName(project.primary_category))} · ${escapeHtml(project.location)}</p>
      <h3><a data-project-link href="${projectUrl(project)}">${escapeHtml(project.title)}</a></h3>
      <p>${escapeHtml(project.summary)}</p>
      <div class="project-card-footer">
        <span class="sr-only">Categories: ${escapeHtml(categoryLabels.join(", "))}</span>
        <a data-project-link href="${projectUrl(project)}">View project <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </article>`;
};

const chooseFeatured = () => {
  const featured = publishedProjects.filter((project) => project.featured);
  const selected = [];
  for (const category of visibleCategories) {
    const match = featured.find((project) => project.primary_category === category.slug && !selected.includes(project));
    if (match) selected.push(match);
    if (selected.length === 3) return selected;
  }
  for (const project of featured) {
    if (!selected.includes(project)) selected.push(project);
    if (selected.length === 3) break;
  }
  return selected;
};

const featuredCards = (await Promise.all(chooseFeatured().map(renderProjectCard))).join("\n");
const allProjectCards = (await Promise.all(publishedProjects.map(renderProjectCard))).join("\n");

const homeBody = `
  <main id="main">
    <section class="hero" id="home" aria-labelledby="hero-title">
      <img class="hero-image" src="/assets/kpd-projects-hero-960.jpg" srcset="/assets/kpd-projects-hero-960.jpg 960w, /assets/kpd-projects-hero.jpg 1774w" sizes="100vw" alt="KPD Projects residential renovation and outdoor improvement work" width="1774" height="887" fetchpriority="high" decoding="async">
      <div class="hero-shade" aria-hidden="true"></div>
      <div class="section-inner hero-inner">
        <div class="hero-copy">
          <p class="eyebrow">Sydney property improvements</p>
          <h1 id="hero-title">KPD Projects</h1>
          <p class="hero-support">Reliable renovation, repair and property maintenance work across Sydney's North Shore.</p>
          <div class="hero-actions" aria-label="Primary actions">
            <a class="button button-primary" href="#contact">Send Photos for a Quote</a>
            <a class="button button-secondary" href="/projects/">View Completed Work</a>
          </div>
        </div>
      </div>
    </section>

    <section class="section featured-work" id="featured-work" aria-labelledby="featured-title">
      <div class="section-inner">
        <div class="section-heading section-heading-split">
          <div><p class="eyebrow">Featured projects</p><h2 id="featured-title">Recent work across our services</h2></div>
          <p>A curated selection of completed jobs, balanced across the types of work we do.</p>
        </div>
        <div class="project-card-grid project-card-grid-featured" data-masonry>${featuredCards}</div>
        <div class="section-actions"><a class="button button-dark" href="/projects/">Browse all projects</a></div>
      </div>
    </section>

    <section class="section services band" id="services" aria-labelledby="services-title">
      <div class="section-inner">
        <div class="section-heading"><p class="eyebrow">Services</p><h2 id="services-title">Practical help for improving and maintaining your property</h2></div>
        <div class="service-grid">
          <article><span>01</span><h3>Renovations &amp; improvements</h3><p>Bathroom, kitchen, laundry and general home upgrades.</p></article>
          <article><span>02</span><h3>Outdoor works</h3><p>Pergolas, carports, fencing, landscaping support and small concrete works.</p></article>
          <article><span>03</span><h3>Property maintenance</h3><p>Repairs, patching, sealing, grouting, fixtures and small building works.</p></article>
          <article><span>04</span><h3>Pre-sale &amp; rental fix-ups</h3><p>Targeted repairs and presentation improvements before sale, lease or handover.</p></article>
        </div>
      </div>
    </section>

    <section class="section portfolio-categories" id="projects" aria-labelledby="projects-title">
      <div class="section-inner">
        <div class="section-heading"><p class="eyebrow">Completed jobs</p><h2 id="projects-title">Browse work by category</h2><p>Each job appears once, even when it belongs to more than one category.</p></div>
        <div class="category-link-grid">${renderCategoryLinks()}</div>
      </div>
    </section>

    <section class="section about band" id="about" aria-labelledby="about-title">
      <div class="section-inner about-grid">
        <div><p class="eyebrow">About KPD</p><h2 id="about-title">Local support for repairs, renovations and property improvements</h2></div>
        <div><p>KPD Projects supports homeowners, landlords and agents with practical residential and commercial property work across Sydney’s North Shore and nearby suburbs.</p></div>
      </div>
    </section>

    <section class="section contact" id="contact" aria-labelledby="contact-title">
      <div class="section-inner contact-grid">
        <div class="contact-copy">
          <p class="eyebrow">Get a quote</p>
          <h2 id="contact-title">Tell us about the job</h2>
          <p>Share the job details here, then send clear photos by email so KPD Projects can understand the work.</p>
          <a href="mailto:kpdprojectsau@gmail.com">kpdprojectsau@gmail.com</a>
        </div>
        <form class="quote-form" data-kpd-form method="POST" aria-label="Quote request form">
          <input type="hidden" name="form_type" value="quote">
          <input type="hidden" name="source" value="KPD Projects Website">
          <div class="form-grid">
            <div class="form-row"><label for="name">Name <span>Required</span></label><input id="name" name="name" type="text" autocomplete="name" required><p class="field-error" id="name-error"></p></div>
            <div class="form-row"><label for="phone">Phone <span>Required</span></label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required><p class="field-error" id="phone-error"></p></div>
            <div class="form-row"><label for="email">Email <span>Required</span></label><input id="email" name="email" type="email" inputmode="email" autocomplete="email" required><p class="field-error" id="email-error"></p></div>
            <div class="form-row"><label for="suburb">Suburb <span>Required</span></label><input id="suburb" name="suburb" type="text" autocomplete="address-level2" required><p class="field-error" id="suburb-error"></p></div>
            <div class="form-row"><label for="property-type">Property type <span>Required</span></label><select id="property-type" name="property_type" required><option value="">Select one</option><option>House</option><option>Apartment or unit</option><option>Commercial property</option><option>Other</option></select><p class="field-error" id="property-type-error"></p></div>
            <div class="form-row"><label for="job-type">Job type <span>Required</span></label><select id="job-type" name="job_type" required><option value="">Select one</option><option>Renovations &amp; Improvements</option><option>Outdoor Works</option><option>Property Maintenance</option><option>Pre-Sale &amp; Rental Property Fix-Ups</option><option>Small Projects &amp; Odd Jobs</option><option>Commercial Demolition</option><option>Other</option></select><p class="field-error" id="job-type-error"></p></div>
            <div class="form-row full"><label for="description">Brief job description <span>Required</span></label><textarea id="description" name="brief_description" rows="5" required></textarea><p class="field-error" id="description-error"></p></div>
            <div class="form-row"><label for="timeframe">Preferred timeframe <span>Required</span></label><select id="timeframe" name="preferred_timeframe" required><option value="">Select one</option><option>As soon as practical</option><option>Next 2–4 weeks</option><option>Next 1–3 months</option><option>Flexible timing</option></select><p class="field-error" id="timeframe-error"></p></div>
            <div class="form-row"><label for="urgency">Urgency <span>Required</span></label><select id="urgency" name="urgency" required><option value="">Select one</option><option>Urgent safety or access issue</option><option>Time-sensitive</option><option>Routine</option><option>Just planning</option></select><p class="field-error" id="urgency-error"></p></div>
            <div class="form-row"><label for="budget">Budget range <span>Optional</span></label><select id="budget" name="budget_range"><option value="">No budget selected</option><option>Under $1,000</option><option>$1,000–$5,000</option><option>$5,000–$15,000</option><option>$15,000+</option><option>Unsure</option></select></div>
            <div class="form-row"><label for="contact-method">Preferred contact method <span>Required</span></label><select id="contact-method" name="preferred_contact_method" required><option value="">Select one</option><option>Phone</option><option>Email</option><option>Text message</option></select><p class="field-error" id="contact-method-error"></p></div>
            <div class="form-row full upload-row">
              <label for="photos">Photos <span>Optional</span></label>
              <input id="photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple aria-describedby="photo-help photo-delivery photos-error">
              <p class="form-help" id="photo-help">Clear photos help us understand the job and prepare a faster estimate.</p>
              <p class="form-help" id="photo-delivery">The current enquiry service cannot attach files. Submit your job details, then email the selected photos separately.</p>
              <a class="photo-email-link" href="mailto:kpdprojectsau@gmail.com?subject=Photos%20for%20KPD%20Projects%20quote">Email photos separately</a>
              <p class="field-error" id="photos-error"></p>
              <ul class="selected-files" data-selected-files aria-live="polite"></ul>
            </div>
          </div>
          <button class="button button-primary form-submit" type="submit">Request a Quote</button>
          <p class="form-status" data-form-status role="alert" hidden></p>
          <p class="form-note">Your request is delivered to the KPD Projects enquiry inbox. You can also email <a href="mailto:kpdprojectsau@gmail.com">kpdprojectsau@gmail.com</a>.</p>
        </form>
      </div>
    </section>
  </main>`;

const portfolioFilters = [
  `<button type="button" class="filter-button is-active" data-filter="all" aria-pressed="true">All projects <span>${publishedProjects.length}</span></button>`,
  ...visibleCategories.map((category) => {
    const count = publishedProjects.filter((project) => project.categories.includes(category.slug)).length;
    return `<button type="button" class="filter-button" data-filter="${escapeHtml(category.slug)}" aria-pressed="false">${escapeHtml(category.name)} <span>${count}</span></button>`;
  }),
].join("\n");

const portfolioBody = `
  <main id="main">
    <section class="inner-hero portfolio-hero" aria-labelledby="portfolio-title">
      <div class="section-inner">
        <p class="eyebrow">Completed work</p>
        <h1 id="portfolio-title">Projects built around the job at hand</h1>
        <p>Browse all completed projects or narrow the list by service. Projects can appear in more than one category without being duplicated.</p>
      </div>
    </section>
    <section class="section portfolio-listing" aria-labelledby="portfolio-list-title">
      <div class="section-inner">
        <h2 class="sr-only" id="portfolio-list-title">All completed projects</h2>
        <div class="project-filters" role="group" aria-label="Filter projects by category">${portfolioFilters}</div>
        <p class="filter-status" data-filter-status aria-live="polite">Showing all ${publishedProjects.length} projects</p>
        <div class="project-card-grid" data-project-grid data-page-size="6" data-masonry>${allProjectCards}</div>
        <div class="load-more-wrap"><button class="button button-dark" type="button" data-load-more hidden>Load more projects</button></div>
        <p class="empty-state" data-empty-state hidden>No published projects are available in this category yet.</p>
      </div>
    </section>
    <section class="project-cta"><div class="section-inner"><div><p class="eyebrow">Planning a project?</p><h2>Show us what needs doing.</h2></div><a class="button button-primary" href="/#contact">Send photos for a quote</a></div></section>
  </main>`;

const renderBeforeAfter = async (pair, index) => {
  const before = await imageMarkup({ src: pair.before_image, alt: pair.before_alt, className: "comparison-image comparison-before", sizes: "(max-width: 760px) calc(100vw - 48px), 760px" });
  const after = await imageMarkup({ src: pair.after_image, alt: pair.after_alt, className: "comparison-image comparison-after", sizes: "(max-width: 760px) calc(100vw - 48px), 760px" });
  const label = pair.label || `Comparison ${index + 1}`;
  return `<figure class="detail-comparison"><div class="comparison" data-comparison style="--position: 50%"><div class="comparison-frame">${before}${after}<span class="comparison-label comparison-label-before">${escapeHtml(pair.before_caption || "Before")}</span><span class="comparison-label comparison-label-after">${escapeHtml(pair.after_caption || "After")}</span><span class="comparison-divider" aria-hidden="true"><span>↔</span></span><input class="comparison-range" type="range" min="0" max="100" value="50" step="1" aria-label="Compare before and after photos for ${escapeHtml(label)}" aria-valuetext="50% before and 50% after visible"></div></div><figcaption>${escapeHtml(label)}</figcaption></figure>`;
};

const renderProjectPage = async (project) => {
  const primary = categoryBySlug.get(project.primary_category);
  const cover = await imageMarkup({ src: project.cover_image, alt: project.cover_alt, className: "project-detail-cover", loading: "eager", sizes: "(max-width: 760px) 100vw, 1180px", fetchPriority: "high" });
  const facts = [
    project.location ? ["Location", project.location] : null,
    primary ? ["Primary category", primary.name] : null,
    project.completion_date ? ["Completed", new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${project.completion_date}T00:00:00Z`))] : null,
  ].filter(Boolean).map(([term, value]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  const scope = (project.scope || []).length ? `<section class="project-scope" aria-labelledby="scope-title"><p class="eyebrow">Scope of work</p><h2 id="scope-title">Key improvements</h2><ul>${project.scope.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : "";
  const comparisons = (await Promise.all((project.before_after || []).map(renderBeforeAfter))).join("");
  const comparisonSection = comparisons ? `<section class="detail-section" aria-labelledby="comparison-title"><div class="section-heading"><p class="eyebrow">Before &amp; after</p><h2 id="comparison-title">See the change</h2><p>Drag the handle or use the arrow keys to compare the project stages.</p></div><div class="detail-comparison-grid">${comparisons}</div></section>` : "";
  const galleryItems = await Promise.all((project.gallery || []).map(async (item, index) => {
    const label = item.caption || item.alt;
    const fullImage = (await projectImages.prepare(item.image)).largest.src;
    return `<figure><button class="gallery-trigger" type="button" data-gallery-index="${index}" data-gallery-src="${escapeHtml(fullImage)}" data-gallery-alt="${escapeHtml(item.alt)}" data-gallery-caption="${escapeHtml(item.caption || "")}" aria-label="Enlarge photo: ${escapeHtml(label)}">${await imageMarkup({ src: item.image, alt: item.alt, sizes: "(max-width: 700px) calc(100vw - 28px), (max-width: 980px) 50vw, 33vw" })}<span class="gallery-zoom" aria-hidden="true">View photo</span></button>${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ""}</figure>`;
  }));
  const galleryDialog = galleryItems.length ? `<dialog class="gallery-lightbox" data-gallery-dialog aria-labelledby="gallery-dialog-title"><div class="gallery-lightbox-shell"><header><p id="gallery-dialog-title" data-gallery-count aria-live="polite">Project photo</p><button class="gallery-close" type="button" data-gallery-close aria-label="Close enlarged photo">Close <span aria-hidden="true">×</span></button></header><div class="gallery-lightbox-stage" data-gallery-stage><button class="gallery-nav gallery-previous" type="button" data-gallery-previous aria-label="Previous photo"><span aria-hidden="true">←</span></button><figure><p class="gallery-status" data-gallery-status role="status" hidden></p><img data-gallery-full alt=""><figcaption data-gallery-full-caption></figcaption></figure><button class="gallery-nav gallery-next" type="button" data-gallery-next aria-label="Next photo"><span aria-hidden="true">→</span></button></div></div></dialog>` : "";
  const gallery = galleryItems.length ? `<section class="detail-section" aria-labelledby="gallery-title"><div class="section-heading"><p class="eyebrow">Project gallery</p><h2 id="gallery-title">Work from the job</h2><p>Tap any photo to view it larger.</p></div><div class="detail-gallery" data-masonry>${galleryItems.join("")}</div></section>${galleryDialog}` : "";
  const review = project.review?.quote ? `<figure class="detail-review"><div class="review-stars" aria-hidden="true">${"★".repeat(project.review.rating || 5)}</div><span class="sr-only">${escapeHtml(project.review.rating || 5)} out of 5 stars</span><blockquote>“${escapeHtml(project.review.quote)}”</blockquote><figcaption><strong>${escapeHtml(project.review.name || "Customer")}</strong>${project.review.context ? `<span>${escapeHtml(project.review.context)}</span>` : ""}</figcaption></figure>` : "";
  const body = `
    <main id="main">
      <article class="project-detail">
        <header class="project-detail-header" data-primary-category="${escapeHtml(project.primary_category)}" data-primary-category-name="${escapeHtml(categoryName(project.primary_category))}"><div class="section-inner"><a class="project-back" data-project-back href="/projects/?category=${encodeURIComponent(project.primary_category)}"><span aria-hidden="true">←</span> Back to ${escapeHtml(categoryName(project.primary_category))} projects</a><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/projects/">Projects</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(project.title)}</span></nav><p class="project-kicker">${escapeHtml(categoryName(project.primary_category))}</p><h1>${escapeHtml(project.title)}</h1><p class="project-detail-summary">${escapeHtml(project.summary)}</p><dl class="project-detail-facts">${facts}</dl></div></header>
        <figure class="project-cover">${cover}${project.cover_caption ? `<figcaption>${escapeHtml(project.cover_caption)}</figcaption>` : ""}</figure>
        <div class="section-inner project-detail-body">
          <div class="project-intro"><div><p class="eyebrow">The project</p><h2>Practical work, clearly finished</h2></div><p>${escapeHtml(project.description || project.summary)}</p></div>
          ${scope}
          ${comparisonSection}
          ${gallery}
          ${review}
        </div>
      </article>
      <section class="project-cta"><div class="section-inner"><div><p class="eyebrow">Have a similar job?</p><h2>Tell us what you need.</h2></div><a class="button button-primary" href="/#contact">Send photos for a quote</a></div></section>
    </main>`;
  return renderDocument({
    title: `${project.title} | KPD Projects`,
    description: project.summary,
    canonical: projectUrl(project),
    image: project.cover_image,
    body,
    bodyClass: "inner-page",
  });
};

await rm(buildRoot, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const copyTargets = ["assets", "admin", "styles.css", "script.js", "portfolio.js", "thanks.html", "review-thank-you.html", "CNAME", ".nojekyll"];
for (const target of copyTargets) await cp(path.join(root, target), path.join(output, target), { recursive: true });

await writeFile(path.join(output, "index.html"), renderDocument({
  title: "KPD Projects | Renovation & Property Maintenance Sydney",
  description: "KPD Projects provides renovation, repair and property maintenance work across Sydney's North Shore.",
  canonical: "/",
  body: homeBody,
}));

await mkdir(path.join(output, "projects"), { recursive: true });
await writeFile(path.join(output, "projects/index.html"), renderDocument({
  title: "Completed Projects | KPD Projects Sydney",
  description: "Browse completed KPD Projects work by category, including outdoor works, tiling and commercial projects around Sydney.",
  canonical: "/projects/",
  body: portfolioBody,
  bodyClass: "inner-page",
  extraScript: "/portfolio.js",
}));

for (const project of publishedProjects) {
  const directory = path.join(output, "projects", project.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), await renderProjectPage(project));
  for (const oldPath of project.redirect_from || []) {
    const cleanPath = String(oldPath).replace(/^\/+|\/+$/g, "");
    if (!cleanPath) continue;
    const redirectDirectory = path.join(output, cleanPath);
    await mkdir(redirectDirectory, { recursive: true });
    await writeFile(path.join(redirectDirectory, "index.html"), `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${projectUrl(project)}"><link rel="canonical" href="${siteUrl}${projectUrl(project)}"><title>Redirecting…</title></head><body><p><a href="${projectUrl(project)}">Continue to ${escapeHtml(project.title)}</a></p></body></html>`);
  }
}

const sitemapUrls = ["/", "/projects/", ...publishedProjects.map(projectUrl)];
await writeFile(path.join(output, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls.map((url) => `\n  <url><loc>${siteUrl}${url}</loc></url>`).join("")}\n</urlset>\n`);

await mkdir(path.join(buildRoot, "server"), { recursive: true });
await cp(path.join(root, "worker/index.js"), path.join(buildRoot, "server/index.js"));

const imageCount = await projectImages.writeTo(output);
console.log(`Built ${publishedProjects.length} published projects across ${visibleCategories.length} visible categories with ${imageCount} optimised photo variants.`);
