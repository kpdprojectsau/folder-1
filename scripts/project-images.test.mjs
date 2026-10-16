import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import sharp from "sharp";
import { createProjectImages } from "./project-images.mjs";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let fixtureRoot;
let processor;
const fixtures = [
  ["portrait.jpg", 1500, 3200], ["landscape.jpg", 3000, 1800],
  ["square.png", 1800, 1800], ["panorama.webp", 5000, 700],
  ["small.jpg", 120, 80], ["rotated.jpg", 800, 1200],
];

test("optional editor photo groups start empty instead of creating incomplete pairs", async () => {
  const config = await readFile(path.join(repository, "admin/config.yml"), "utf8");
  for (const field of ["scope", "gallery", "before_after", "redirect_from"]) {
    assert.match(config, new RegExp(`name: ${field}\\n\\s+widget: list\\n\\s+required: false\\n\\s+default: \\[\\]\\n\\s+min: 0`));
  }
});

test("an unused optional review does not require a rating", async () => {
  const config = await readFile(path.join(repository, "admin/config.yml"), "utf8");
  assert.match(config, /name: rating\n\s+widget: select\n\s+required: false/);
  assert.doesNotMatch(config, /name: rating, widget: number/);
});

before(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "kpd-photo-tests-"));
  await mkdir(path.join(fixtureRoot, "assets/projects/uploads"), { recursive: true });
  for (const [name, width, height] of fixtures) {
    const rotated = name === "rotated.jpg";
    let image = sharp({ create: { width: rotated ? height : width, height: rotated ? width : height, channels: 3, background: "#447a96" } });
    if (rotated) image = image.withMetadata({ orientation: 6 });
    await image.toFile(path.join(fixtureRoot, "assets/projects/uploads", name));
  }
  processor = createProjectImages({ root: fixtureRoot });
});

after(async () => {
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
});

for (const [name, width, height] of fixtures) {
  test(`${name}: proportional responsive copies, no enlargement or metadata`, async () => {
    const result = await processor.prepare(`/assets/projects/uploads/${name}`);
    assert.deepEqual(result.original, { width, height });
    assert.ok(result.variants.length >= 1 && result.variants.length <= 4);
    assert.equal(new Set(result.variants.map((item) => item.width)).size, result.variants.length);
    for (const variant of result.variants) {
      assert.ok(variant.width <= width && variant.height <= height);
      assert.ok(Math.max(variant.width, variant.height) <= 2400);
      assert.ok(variant.width <= 1600);
      assert.ok(Math.abs(variant.height - variant.width * height / width) <= 1.5);
      const metadata = await sharp(variant.file).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.orientation, undefined);
      assert.equal(metadata.exif, undefined);
      assert.equal(metadata.width, variant.width);
      assert.equal(metadata.height, variant.height);
    }
  });
}

test("identical uploads reuse generated URLs and cached files", async () => {
  await cp(path.join(fixtureRoot, "assets/projects/uploads/small.jpg"), path.join(fixtureRoot, "assets/projects/uploads/copy.jpg"));
  const concurrent = createProjectImages({ root: fixtureRoot, cacheDirectory: path.join(fixtureRoot, ".cache/concurrent") });
  const [original, copy] = await Promise.all([concurrent.prepare("/assets/projects/uploads/small.jpg"), concurrent.prepare("/assets/projects/uploads/copy.jpg")]);
  assert.deepEqual(copy.variants.map((item) => item.src), original.variants.map((item) => item.src));
  const beforeTime = (await stat(original.largest.file)).mtimeMs;
  await createProjectImages({ root: fixtureRoot, cacheDirectory: path.join(fixtureRoot, ".cache/concurrent") }).prepare("/assets/projects/uploads/small.jpg");
  assert.equal((await stat(original.largest.file)).mtimeMs, beforeTime);
});

test("unsupported, missing and invalid paths produce useful errors", async () => {
  await writeFile(path.join(fixtureRoot, "assets/projects/uploads/phone.heic"), "unsupported test file");
  await assert.rejects(processor.prepare("/assets/projects/uploads/phone.heic"), /HEIC photos as JPEG/);
  await assert.rejects(processor.prepare("/assets/projects/uploads/missing.jpg"), /not found/);
  await assert.rejects(processor.prepare("/../outside.jpg"), /inside assets\/projects/);
});

test("a newly added job with mixed photos builds without template edits", async () => {
  const site = await mkdtemp(path.join(os.tmpdir(), "kpd-job-fixture-"));
  try {
    for (const directory of ["scripts", "content/projects"]) await mkdir(path.join(site, directory), { recursive: true });
    for (const file of ["build.mjs", "project-images.mjs"]) await cp(path.join(repository, "scripts", file), path.join(site, "scripts", file));
    await cp(path.join(repository, "worker"), path.join(site, "worker"), { recursive: true });
    for (const file of ["package.json", "admin", "styles.css", "script.js", "portfolio.js", "thanks.html", "review-thank-you.html", "CNAME", ".nojekyll"]) {
      await cp(path.join(repository, file), path.join(site, file), { recursive: true });
    }
    await symlink(path.join(repository, "node_modules"), path.join(site, "node_modules"), "dir");
    await cp(path.join(fixtureRoot, "assets"), path.join(site, "assets"), { recursive: true });
    for (const file of ["kpd-logo-dark.jpeg", "kpd-projects-hero.png", "kpd-projects-hero.jpg", "kpd-projects-hero-960.jpg"]) {
      await cp(path.join(repository, "assets", file), path.join(site, "assets", file));
    }
    await writeFile(path.join(site, "content/categories.json"), JSON.stringify({ categories: [{ name: "Test category", slug: "test", order: 1, visible: true }] }));
    const project = {
      title: "Isolated mixed-photo test", slug: "isolated-test", status: "published", primary_category: "test", categories: ["test"],
      location: "Test fixture", summary: "Test content only", featured: true,
      cover_image: "/assets/projects/uploads/portrait.jpg", cover_alt: "Portrait fixture",
      gallery: fixtures.map(([name]) => ({ image: `/assets/projects/uploads/${name}`, alt: name })),
      before_after: [{ before_image: "/assets/projects/uploads/landscape.jpg", before_alt: "Before fixture", after_image: "/assets/projects/uploads/square.png", after_alt: "After fixture" }],
    };
    await writeFile(path.join(site, "content/projects/new-job.json"), JSON.stringify(project));
    execFileSync(process.execPath, [path.join(site, "scripts/build.mjs")]);
    const html = await readFile(path.join(site, "dist/client/projects/isolated-test/index.html"), "utf8");
    assert.equal((html.match(/data-gallery-index=/g) || []).length, fixtures.length);
    assert.ok(html.includes("/assets/generated/") && html.includes("srcset="));
    assert.ok(!html.includes('data-gallery-src="/assets/projects/uploads/'));
    assert.ok((await readdir(path.join(site, "dist/client/assets/generated"))).length > fixtures.length);
    assert.deepEqual(JSON.parse(await readFile(path.join(site, "content/projects/new-job.json"), "utf8")), project);
    let preview;
    vm.runInNewContext(await readFile(path.join(repository, "admin/preview.js"), "utf8"), {
      CMS: { registerPreviewTemplate: (_, template) => { preview = template; }, registerPreviewStyle: () => {} },
      createClass: (definition) => definition,
      h: (tag, props, ...children) => ({ tag, props, children }),
    });
    const entry = { getIn: ([, field]) => field === "gallery" ? { toArray: () => project.gallery.map((photo) => ({ get: (key) => photo[key] })) } : project[field] };
    const tree = preview.render.call({ props: { entry, getAsset: (image) => image } });
    const countImages = (node) => !node || typeof node !== "object" ? 0 : (node.tag === "img" ? 1 : 0) + (node.children || []).reduce((sum, child) => sum + countImages(child), 0);
    assert.equal(countImages(tree), fixtures.length + 1, "Editor preview includes cover and every gallery photo");
  } finally {
    await rm(site, { recursive: true, force: true });
  }
});
