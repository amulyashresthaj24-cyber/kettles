#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { processBuffer } from "next/dist/server/lib/squoosh/main.js";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (!key?.startsWith("--") || !value) usage();
  args.set(key.slice(2), value);
}

const inputPath = args.get("input");
const outputPath = args.get("output");
const quality = Number(args.get("quality") || 95);

if (!inputPath || !outputPath || !Number.isFinite(quality)) usage();

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const source = fs.readFileSync(inputPath);
const webp = await processBuffer(source, [], "webp", quality);
fs.writeFileSync(outputPath, webp);

console.log(`Created WebP: ${path.normalize(outputPath)}`);
console.log(`Quality: ${quality}`);

function usage() {
  console.error("Usage: node scripts/pet/convert-to-webp.mjs --input <image.png> --output <image.webp> [--quality 95]");
  process.exit(2);
}
