#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { decodeBuffer, processBuffer } from "next/dist/server/lib/squoosh/main.js";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (!key?.startsWith("--") || !value) usage();
  args.set(key.slice(2), value);
}

const sourcePath = args.get("source");
const outDir = args.get("out-dir");
if (!sourcePath || !outDir) usage();

const poseRows = [
  ["cheese-pose", "Cheese pose"],
  ["flying-kiss-pose", "Flying kiss pose"],
  ["all-the-best-pose", "All the best pose"],
  ["you-can-do-it-pose", "You can do it pose"],
];

fs.mkdirSync(outDir, { recursive: true });

const source = fs.readFileSync(sourcePath);
const image = await decodeBuffer(source);
const page = chromaKeyToAlpha(image);
const pagePng = await encodePngLike(page);
const pageWebp = await processBuffer(pagePng, [], "webp", 95);
const pagePath = path.join(outDir, "sprite-sheet-page.webp");
fs.writeFileSync(pagePath, pageWebp);

const rowHeight = Math.floor(image.height / poseRows.length);
const outputs = [pagePath];

for (let row = 0; row < poseRows.length; row++) {
  const [slug] = poseRows[row];
  const cropHeight = row === poseRows.length - 1 ? image.height - rowHeight * row : rowHeight;
  const strip = cropImage(page, 0, row * rowHeight, image.width, cropHeight);
  const stripPng = await encodePngLike(strip);
  const stripWebp = await processBuffer(stripPng, [], "webp", 95);
  const outPath = path.join(outDir, `${slug}.webp`);
  fs.writeFileSync(outPath, stripWebp);
  outputs.push(outPath);
}

console.log("Exported pose WebP assets:");
for (const output of outputs) console.log(`- ${path.normalize(output)}`);

function usage() {
  console.error("Usage: node scripts/pet/export-pose-webps.mjs --source <pose-sheet.png> --out-dir <output-dir>");
  process.exit(2);
}

function chromaKeyToAlpha(image) {
  const sourceData = image.data || image._data || image.bitmap || image.buffer;
  if (!sourceData) {
    throw new Error(`Decoded image did not expose pixel data. Keys: ${Object.keys(image).join(", ")}`);
  }
  const data = Buffer.from(sourceData);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightGreen = g > 150 && r < 150 && b < 150 && g - r > 45 && g - b > 45;
    const greenFringe = g > 70 && g > r * 1.25 && g > b * 1.25 && g - Math.max(r, b) > 20;
    if (brightGreen || greenFringe) {
      data[i + 3] = 0;
    }
  }
  return { data, width: image.width, height: image.height };
}

function cropImage(image, x, y, width, height) {
  const out = Buffer.alloc(width * height * 4);
  const input = image.data;
  for (let row = 0; row < height; row++) {
    const sourceStart = ((y + row) * image.width + x) * 4;
    const targetStart = row * width * 4;
    input.copy(out, targetStart, sourceStart, sourceStart + width * 4);
  }
  return { data: out, width, height };
}

async function encodePngLike(image) {
  const { codecs } = await import("next/dist/server/lib/squoosh/codecs.js");
  const encoder = await codecs.oxipng.enc();
  return Buffer.from(encoder.encode(image.data, image.width, image.height, codecs.oxipng.defaultEncoderOptions));
}
