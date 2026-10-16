import { createHash } from "node:crypto";
import { cp, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const widths = [400, 800, 1200, 1600];
const preset = "sharp-0.35.5-webp82-auto-orient-max2400-v1";

export const createProjectImages = ({ root, cacheDirectory = path.join(root, ".cache/project-images") }) => {
  const images = new Map();
  const processing = new Map();

  const processImage = async (src) => {
    const sourcePath = path.resolve(root, String(src).replace(/^\//, ""));
    const allowedRoot = `${path.resolve(root, "assets/projects")}${path.sep}`;
    if (!sourcePath.startsWith(allowedRoot)) throw new Error(`Project photo must be inside assets/projects: ${src}`);
    const input = await readFile(sourcePath).catch(() => { throw new Error(`Project photo not found: ${src}`); });
    let metadata;
    try { metadata = await sharp(input).metadata(); } catch {
      throw new Error(`Cannot read project photo ${src}. Use JPEG, PNG or WebP; export HEIC photos as JPEG first.`);
    }
    if (!["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages || 1) > 1) {
      throw new Error(`Unsupported project photo ${src}. Use a still JPEG, PNG or WebP; export HEIC photos as JPEG first.`);
    }
    const rotated = metadata.orientation >= 5 && metadata.orientation <= 8;
    const original = { width: rotated ? metadata.height : metadata.width, height: rotated ? metadata.width : metadata.height };
    const hash = createHash("sha256").update(input).update(preset).digest("hex").slice(0, 20);
    if (processing.has(hash)) return processing.get(hash);
    const task = createVariants(input, original, hash);
    processing.set(hash, task);
    return task;
  };

  const createVariants = async (input, original, hash) => {
    const targetWidths = [...new Set(widths.map((width) => Math.max(1, Math.round(original.width * Math.min(1, width / original.width, 2400 / original.height)))))];
    await mkdir(cacheDirectory, { recursive: true });
    const variants = [];
    for (const width of targetWidths) {
      const file = path.join(cacheDirectory, `${hash}-${width}.webp`);
      let info;
      try {
        await stat(file);
        info = await sharp(file).metadata();
      } catch {
        info = await sharp(input).autoOrient().resize({ width, height: 2400, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 }).toFile(file);
      }
      if (!variants.some((variant) => variant.width === info.width)) {
        variants.push({ src: `/assets/generated/${path.basename(file)}`, width: info.width, height: info.height, file });
      }
    }
    variants.sort((a, b) => a.width - b.width);
    return { original, variants, largest: variants.at(-1) };
  };

  return {
    prepare(src) {
      if (!images.has(src)) images.set(src, processImage(src));
      return images.get(src);
    },
    async writeTo(output) {
      const directory = path.join(output, "assets/generated");
      await mkdir(directory, { recursive: true });
      const files = new Set();
      for (const result of images.values()) {
        for (const variant of (await result).variants) {
          if (files.has(variant.src)) continue;
          files.add(variant.src);
          await cp(variant.file, path.join(directory, path.basename(variant.file)));
        }
      }
      return files.size;
    },
  };
};
