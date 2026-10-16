// Local visual/geometry regression checks; fixtures are intercepted, never published.
async (page) => {
  const origin = "http://127.0.0.1:4173";
  const verify = (condition, message) => { if (!condition) throw new Error(message); };
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const viewports = [[320, 568], [375, 667], [390, 844], [430, 932], [667, 375], [844, 390], [768, 1024], [1024, 768], [1440, 900]];
  const paths = ["/", "/projects/", "/projects/side-access-path-upgrade-gordon/", "/projects/garden-shed-installation-willoughby/", "/projects/commercial-demolition-removal-newtown/", "/projects/outdoor-staircase-tile-repair-epping/", "/projects/floating-concrete-step-tiling-marsden-park/"];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    for (const path of paths) {
      await page.goto(`${origin}${path}`);
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        photos: [...document.querySelectorAll(".project-card-image, .detail-gallery img")].map((img) => {
          const r = img.getBoundingClientRect();
          return { width: r.width, height: r.height, ratio: Number(img.getAttribute("width")) / Number(img.getAttribute("height")) };
        }),
        cover: document.querySelector(".project-detail-cover")?.getBoundingClientRect().height,
        columns: [...document.querySelectorAll("[data-masonry]")].map((grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length),
      }));
      verify(geometry.overflow <= 1, `${width} ${path}: overflow`);
      for (const photo of geometry.photos) {
        verify(photo.height <= (width <= 700 ? 320 : 360) + 1, `${width} ${path}: oversized photo`);
        verify(Math.abs(photo.width / photo.height - photo.ratio) < 0.02, `${width} ${path}: distorted photo`);
      }
      if (geometry.cover) verify(geometry.cover <= (width <= 700 ? Math.min(480, height * 0.6) : 600) + 1, "Oversized project cover");
      geometry.columns.forEach((count) => verify(count === (width <= 700 ? 1 : width <= 980 ? 2 : 3), "Wrong column count"));
    }
  }

  const shapes = [[700, 1500], [1500, 900], [900, 900], [2400, 300], [100, 70], [700, 1300], [1400, 800]];
  const fixtureHtml = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"><script defer src="/script.js"></script><main class="section-inner"><h1>Local photo layout fixtures</h1><div class="project-card-grid" data-masonry>${shapes.map(([width, height], index) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${index % 2 ? "#8ec5dd" : "#315e7c"}"/></svg>`;
    return `<article class="project-card" data-fixture="${index}"><a class="project-card-media" href="#fixture-${index}"><img class="project-card-image" width="${width}" height="${height}" style="--photo-width:${width}px;--photo-ratio:${width / height};aspect-ratio:${width}/${height}" src="data:image/svg+xml,${encodeURIComponent(svg)}" alt="Synthetic ${width} by ${height} fixture"></a><div class="project-card-copy"><h3><a href="#fixture-${index}">Test fixture ${index + 1}</a></h3><p>Local test only.</p></div></article>`;
  }).join("")}</div></main>`;
  await page.route("**/__photo-fixtures", (route) => route.fulfill({ contentType: "text/html", body: fixtureHtml }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/__photo-fixtures`);
  await page.waitForFunction(() => document.querySelector("[data-masonry]").classList.contains("is-masonry"));
  const fixtureRects = await page.locator(".project-card").evaluateAll((cards) => cards.map((card) => {
    const r = card.getBoundingClientRect(); const img = card.querySelector("img"); const ir = img.getBoundingClientRect();
    return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, photoWidth: ir.width, photoHeight: ir.height, naturalWidth: img.naturalWidth };
  }));
  for (let a = 0; a < fixtureRects.length; a++) {
    const r = fixtureRects[a];
    verify(r.photoWidth <= r.naturalWidth + 1, "Small fixture was enlarged");
    for (let b = a + 1; b < fixtureRects.length; b++) {
      const s = fixtureRects[b];
      verify(!(r.x < s.right - 1 && r.right > s.x + 1 && r.y < s.bottom - 1 && r.bottom > s.y + 1), "Staggered cards overlap");
    }
  }
  verify(new Set(fixtureRects.slice(3).map((r) => Math.round(r.y))).size > 1, "Cards are not staggered");
  verify((await page.locator("[data-fixture]").evaluateAll((cards) => cards.map((card) => card.dataset.fixture).join(","))) === "0,1,2,3,4,5,6", "Content order changed");
  await page.screenshot({ path: "output/playwright/kpd-mixed-shape-fixtures.png", fullPage: true });

  const fallbackContext = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const fallback = await fallbackContext.newPage();
  await fallback.route("**/__photo-fixtures", (route) => route.fulfill({ contentType: "text/html", body: fixtureHtml }));
  await fallback.goto(`${origin}/__photo-fixtures`);
  verify(await fallback.locator(".project-card").count() === shapes.length, "No-script cards missing");
  verify(await fallback.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No-script fallback overflows");
  await fallbackContext.close();
  await page.unroute("**/__photo-fixtures");

  await page.route(`${origin}/projects/`, async (route) => {
    const response = await route.fetch();
    let html = await response.text();
    const card = html.match(/<article class="project-card"[\s\S]*?<\/article>/)[0];
    html = html.replace(/(<div class="project-card-grid"[^>]*>)([\s\S]*?)(<\/div>\s*<div class="load-more-wrap">)/, (_, start, body, end) => start + body + card.repeat(4) + end);
    await route.fulfill({ response, body: html });
  });
  await page.goto(`${origin}/projects/`);
  verify(await page.locator("[data-project-card]:visible").count() === 6, "Initial pagination limit failed");
  await page.locator("[data-load-more]").click();
  verify(await page.locator("[data-project-card]:visible").count() === 9, "Load more did not show new cards");
  verify(await page.locator("[data-project-card]:visible").evaluateAll((cards) => cards.every((card) => Number(card.style.gridRowEnd.replace("span ", "")) > 1)), "New cards were not laid out");
  await page.unroute(`${origin}/projects/`);

  await page.goto(origin);
  for (const img of await page.locator("#featured-work img").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((element) => element.decode());
  }
  await page.locator("#featured-work").screenshot({ path: "output/playwright/kpd-compact-cards-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  for (const img of await page.locator("#featured-work img").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((element) => element.decode());
  }
  await page.locator(".project-card").first().scrollIntoViewIfNeeded();
  await page.evaluate(() => document.activeElement?.blur());
  await page.screenshot({ path: "output/playwright/kpd-compact-cards-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/projects/commercial-demolition-removal-newtown/`);
  for (const img of await page.locator(".detail-gallery img").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((element) => element.decode());
  }
  await page.locator(".detail-gallery").screenshot({ path: "output/playwright/kpd-compact-gallery-desktop.png" });
  verify(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  return { pageViewportChecks: paths.length * viewports.length, mixedShapeFixtures: shapes.length, noScriptFallback: "passed", loadMore: "passed", errors };
}
