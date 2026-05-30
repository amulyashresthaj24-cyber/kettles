#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (!key?.startsWith("--") || !value) {
    usage();
  }
  args.set(key.slice(2), value);
}

const atlasPath = args.get("atlas");
const configPath = args.get("config");
if (!atlasPath || !configPath) usage();

const expected = {
  cell: { width: 192, height: 208 },
  sheet: { cols: 8, rows: 9 },
};
const expectedWidth = expected.cell.width * expected.sheet.cols;
const expectedHeight = expected.cell.height * expected.sheet.rows;

const atlas = readImageSize(atlasPath);
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const errors = [];

if (atlas.width !== expectedWidth || atlas.height !== expectedHeight) {
  errors.push(`Atlas must be ${expectedWidth}x${expectedHeight}; got ${atlas.width}x${atlas.height}.`);
}

if (config.cell?.width !== expected.cell.width || config.cell?.height !== expected.cell.height) {
  errors.push(`Config cell must be ${expected.cell.width}x${expected.cell.height}.`);
}

if (config.sheet?.cols !== expected.sheet.cols || config.sheet?.rows !== expected.sheet.rows) {
  errors.push(`Config sheet must be ${expected.sheet.cols}x${expected.sheet.rows}.`);
}

if (typeof config.spritesheet !== "string" || config.spritesheet.length === 0) {
  errors.push("Config needs a non-empty spritesheet path.");
}

for (const [stateName, state] of Object.entries(config.states || {})) {
  const row = numberOrDefault(state.row, 0);
  const col = numberOrDefault(state.col, 0);
  const frames = numberOrDefault(state.frames, 1);
  if (row < 0 || row >= expected.sheet.rows) {
    errors.push(`State "${stateName}" uses invalid row ${row}.`);
  }
  if (col < 0 || col >= expected.sheet.cols) {
    errors.push(`State "${stateName}" uses invalid col ${col}.`);
  }
  if (frames < 1 || col + frames > expected.sheet.cols) {
    errors.push(`State "${stateName}" frames overflow row: col ${col}, frames ${frames}.`);
  }
}

if (errors.length > 0) {
  console.error("Pet atlas validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Pet atlas validation passed.");
console.log(`Atlas: ${path.normalize(atlasPath)} (${atlas.type}, ${atlas.width}x${atlas.height})`);
console.log(`Config: ${path.normalize(configPath)}`);

function usage() {
  console.error("Usage: node scripts/pet/validate-pet-atlas.mjs --atlas <path> --config <path>");
  process.exit(2);
}

function numberOrDefault(value, fallback) {
  return typeof value === "number" ? value : fallback;
}

function readImageSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 16) throw new Error(`Image file is too small: ${filePath}`);

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return {
      type: "png",
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return readWebpSize(buffer, filePath);
  }

  throw new Error(`Unsupported image format for ${filePath}. Use PNG or WebP.`);
}

function readWebpSize(buffer, filePath) {
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      type: "webp",
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunk === "VP8 ") {
    return {
      type: "webp",
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return {
      type: "webp",
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  throw new Error(`Unsupported WebP chunk in ${filePath}: ${chunk}`);
}

