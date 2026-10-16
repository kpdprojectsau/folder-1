// Run with playwright-cli run-code --filename scripts/mobile-browser-checks.js
// Start the built site on port 4173 first. Every form POST is intercepted locally.
async (page) => {
  const origin = "http://127.0.0.1:4173";
  const results = [];
  const verify = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  let submissionMode = "success";
  const submissions = [];
  await page.route("https://script.google.com/macros/**", async (route) => {
    submissions.push(new URLSearchParams(route.request().postData() || ""));
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: submissionMode === "success" ? 200 : 503,
      contentType: "text/html",
      body: submissionMode === "success"
        ? `<script>location.href=${JSON.stringify(`${origin}/thanks.html`)}</script>`
        : '<h1>Test service unavailable</h1><p>Return to the form and try again.</p>',
    });
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const paths = [
    "/", "/projects/", "/projects/?category=outdoor-works", "/projects/?category=tiling",
    "/projects/?category=commercial-works", "/projects/side-access-path-upgrade-gordon/",
    "/projects/garden-shed-installation-willoughby/", "/projects/commercial-demolition-removal-newtown/",
    "/projects/outdoor-staircase-tile-repair-epping/", "/projects/floating-concrete-step-tiling-marsden-park/",
    "/review-thank-you.html",
  ];
  const viewports = [
    [320, 568], [375, 667], [390, 844], [430, 932], [667, 375],
    [844, 390], [768, 1024], [1024, 768], [1440, 900],
  ];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    for (const path of paths) {
      await page.goto(`${origin}${path}`);
      const layout = await page.evaluate(() => ({
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
        heading: document.querySelector("h1")?.textContent,
        font: getComputedStyle(document.body).fontFamily,
      }));
      verify(layout.overflow <= 1, `${width}×${height} ${path}: horizontal overflow ${layout.overflow}`);
      verify(layout.heading, `${path}: missing heading`);
      verify(!layout.font.includes("Times"), `${path}: branding font failed`);
    }
  }
  results.push(`${viewports.length * paths.length} page/viewport combinations without horizontal overflow`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await page.getByRole("button", { name: "Open menu" }).click();
  verify(await page.locator(".nav-toggle").getAttribute("aria-expanded") === "true", "Menu did not open");
  await page.keyboard.press("Escape");
  verify(await page.locator(".nav-toggle").getAttribute("aria-expanded") === "false", "Escape did not close menu");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator(".hero-support").click();
  verify(await page.locator(".nav-toggle").getAttribute("aria-expanded") === "false", "Outside tap did not close menu");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#site-nav").getByRole("link", { name: "Services", exact: true }).click();
  verify(await page.locator(".nav-toggle").getAttribute("aria-expanded") === "false", "Menu link did not close menu");
  await page.waitForFunction(() => location.hash === "#services");
  results.push("Menu open, Escape, outside tap and section navigation");

  await page.goto(`${origin}/projects/`);
  for (const [filter, count] of [["outdoor-works", 4], ["commercial-works", 1], ["tiling", 2], ["all", 5]]) {
    await page.locator(`[data-filter="${filter}"]`).click();
    verify(await page.locator("[data-project-card]:visible").count() === count, `${filter}: wrong project count`);
    verify(await page.locator(`[data-filter="${filter}"]`).getAttribute("aria-pressed") === "true", `${filter}: active state missing`);
  }
  await page.locator('[data-filter="outdoor-works"]').click();
  const projectLink = page.getByRole("link", { name: "Outdoor Staircase Tile Repair", exact: true });
  await projectLink.scrollIntoViewIfNeeded();
  const portfolioY = await page.evaluate(() => scrollY);
  await projectLink.click();
  verify(page.url().includes("from=outdoor-works"), "Category context was lost");
  await page.locator("[data-project-back]").click();
  await page.waitForURL("**/projects/?category=outdoor-works");
  await page.waitForTimeout(100);
  await page.waitForFunction((expected) => Math.abs(scrollY - expected) < 80, portfolioY, { timeout: 3000 });
  results.push("All category filters, active state, category and scroll restoration");
  verify(!(await page.locator("[data-load-more]").isVisible()), "Load more should be hidden when all matches fit");

  await page.goto(`${origin}/projects/outdoor-staircase-tile-repair-epping/`);
  const slider = page.getByRole("slider");
  await slider.scrollIntoViewIfNeeded();
  await slider.press("ArrowRight");
  verify(await slider.inputValue() === "51", "Comparison keyboard control failed");
  const sliderRect = await slider.boundingBox();
  await page.mouse.move(sliderRect.x + sliderRect.width * 0.25, sliderRect.y + sliderRect.height / 2);
  await page.mouse.down();
  await page.mouse.move(sliderRect.x + sliderRect.width * 0.8, sliderRect.y + sliderRect.height / 2);
  await page.mouse.up();
  verify(Number(await slider.inputValue()) > 70, "Comparison pointer drag failed");
  verify(await slider.evaluate((el) => getComputedStyle(el).touchAction) === "pan-y", "Comparison prevents vertical scrolling");
  await page.locator("[data-gallery-index]").first().click();
  verify(await page.locator("dialog").evaluate((el) => el.open), "Gallery did not open");
  await page.getByRole("button", { name: "Next photo", exact: true }).click();
  verify(await page.locator("[data-gallery-count]").textContent() === "Photo 2 of 2", "Gallery next failed");
  await page.keyboard.press("ArrowLeft");
  verify(await page.locator("[data-gallery-count]").textContent() === "Photo 1 of 2", "Gallery previous failed");
  await page.keyboard.press("Escape");
  verify(!(await page.locator("dialog").evaluate((el) => el.open)), "Gallery Escape close failed");
  verify(await page.locator("[data-gallery-index]").first().evaluate((el) => document.activeElement === el), "Gallery focus did not return");
  results.push("Comparison keyboard/pointer control; gallery next, previous, Escape and focus return");

  const failedPhotoRoute = `**${await page.locator("[data-gallery-index]").first().getAttribute("data-gallery-src")}`;
  await page.route(failedPhotoRoute, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.abort("failed");
  });
  await page.reload();
  await page.locator("[data-gallery-index]").first().click();
  await page.waitForFunction(() => document.querySelector("[data-gallery-status]")?.textContent.includes("could not load"), null, { timeout: 5000 });
  await page.getByRole("button", { name: "Close enlarged photo" }).click();
  await page.unroute(failedPhotoRoute);
  results.push("Slow/failed gallery image gives a clear message and can still close");

  await page.goto(`${origin}/#contact`);
  await page.locator("#name").fill("Mobile test");
  await page.locator("#phone").fill("0400000000");
  await page.locator('button[type="submit"]').click();
  verify(await page.locator("#email").getAttribute("aria-invalid") === "true", "Required validation failed");
  verify(await page.locator("#name").inputValue() === "Mobile test", "Validation lost entered data");
  verify(submissions.length === 0, "Invalid form sent a request");
  await page.locator("#email").fill("mobile-test@example.invalid");
  await page.locator("#suburb").fill("Test suburb");
  await page.locator("#property-type").selectOption({ label: "House" });
  await page.locator("#job-type").selectOption({ label: "Outdoor Works" });
  await page.locator("#description").fill("Automated local test. No live enquiry.");
  await page.locator("#timeframe").selectOption({ label: "Flexible timing" });
  await page.locator("#urgency").selectOption({ label: "Just planning" });
  await page.locator("#contact-method").selectOption({ label: "Email" });
  await page.reload();
  verify(await page.locator("#phone").inputValue() === "0400000000", "Draft recovery lost phone");
  verify(await page.locator("#description").inputValue() === "Automated local test. No live enquiry.", "Draft recovery lost description");
  await page.locator('button[type="submit"]').evaluate((button) => {
    button.form.requestSubmit();
    button.form.requestSubmit();
  });
  await page.waitForURL(`${origin}/thanks.html`);
  verify(submissions.length === 1, "Duplicate submission was not prevented");
  verify(submissions[0].get("property_type") === "House", "Form field mapping failed");
  verify(submissions[0].get("brief_description").includes("Preferred contact method: Email"), "Form details missing");
  verify(await page.locator("[data-thanks-card]").isVisible(), "Success message missing");
  results.push("Required validation, draft recovery, payload, duplicate prevention and mocked success");

  submissionMode = "failure";
  await page.goto(`${origin}/#contact`);
  await page.locator("#name").fill("Retry test");
  await page.locator("#phone").fill("0400000000");
  await page.locator("#email").fill("mobile-test@example.invalid");
  await page.locator("#suburb").fill("Test suburb");
  await page.locator("#property-type").selectOption({ label: "House" });
  await page.locator("#job-type").selectOption({ label: "Outdoor Works" });
  await page.locator("#description").fill("Local failure recovery test");
  await page.locator("#timeframe").selectOption({ label: "Flexible timing" });
  await page.locator("#urgency").selectOption({ label: "Just planning" });
  await page.locator("#contact-method").selectOption({ label: "Email" });
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("https://script.google.com/macros/**");
  await page.goBack();
  verify(await page.locator("#name").inputValue() === "Retry test", "Failure recovery lost entered data");
  verify(await page.locator('button[type="submit"]').isEnabled(), "Retry button remains disabled");
  results.push("Mocked service failure: Back restores entered details and enables retry");
  verify(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  await page.unroute("https://script.google.com/macros/**");
  await page.evaluate(() => { sessionStorage.removeItem("kpdQuoteDraft"); sessionStorage.removeItem("kpdQuoteSubmittedAt"); });
  await page.goto(origin);
  return { results, interceptedPosts: submissions.length, livePosts: 0 };
}
