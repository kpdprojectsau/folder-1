import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(process.execPath, [path.join(root, "scripts/build.mjs")], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);

const output = path.join(root, "dist/client");
const htmlFiles = [];

const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.name.endsWith(".html")) htmlFiles.push(target);
  }
};

await walk(output);
const broken = [];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const attributes = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const [, srcset] of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const candidate of srcset.split(",")) {
      const [url, descriptor] = candidate.trim().split(/\s+/);
      attributes.push(url);
      if (url.startsWith("/assets/generated/")) {
        const metadata = await sharp(path.join(output, url)).metadata();
        if (`${metadata.width}w` !== descriptor) broken.push(`${path.relative(output, file)} -> incorrect responsive width for ${url}`);
      }
    }
  }
  for (const url of attributes) {
    if (!url.startsWith("/") || url.startsWith("//")) continue;
    const clean = url.split(/[?#]/)[0];
    if (!clean) continue;
    let target = path.join(output, clean);
    if (clean.endsWith("/")) target = path.join(target, "index.html");
    try {
      await access(target);
    } catch {
      broken.push(`${path.relative(output, file)} -> ${url}`);
    }
  }
}

if (broken.length) {
  console.error(`Broken internal references:\n- ${broken.join("\n- ")}`);
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML pages with no broken internal references.`);
