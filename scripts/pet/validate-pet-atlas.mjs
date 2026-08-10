#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const expected = {
  cell: config.cell ?? { width: 192, height: 208 },
  sheet: config.sheet ?? { cols: 8, rows: 9 },
};
const expectedWidth = expected.cell.width * expected.sheet.cols;
const expectedHeight = expected.cell.height * expected.sheet.rows;
const atlas = readImageSize(atlasPath);
const errors = [];

if (expected.cell.width !== 192 || expected.cell.height !== 208) {
  errors.push(`Config cell must be 192x208; got ${expected.cell.width}x${expected.cell.height}.`);
}
if (expected.sheet.cols !== 8 || ![9, 11].includes(expected.sheet.rows)) {
  errors.push(`Config sheet must be 8x9 or 8x11; got ${expected.sheet.cols}x${expected.sheet.rows}.`);
}

// 9 rows = v1, the user-generated tier. 11 rows = v2, stock mascots, which add
// the 16-cell look grid on rows 9-10. See Docs/pet-design-system.md.
const tier = expected.sheet.rows === 11 ? "v2" : "v1";
const stateNames = Object.keys(config.states || {});
const declaredLookStates = stateNames.filter((name) => name.startsWith("look_"));

// The vocabulary is read out of the TypeScript union rather than duplicated
// here. A state name that exists in only one of the two places is exactly the
// bug this script is for: the renderer guards every lookup, so a missing name
// silently falls back to idle instead of failing.
const vocabulary = readVocabulary();
const missing = vocabulary.filter((name) => !stateNames.includes(name));
if (missing.length > 0) {
  errors.push(
    `Config is missing ${missing.length} required state(s): ${missing.join(", ")}. ` +
      `Every name in PetAnimationState must resolve or it falls back to idle at runtime.`
  );
}

const unknown = stateNames.filter(
  (name) => !name.startsWith("look_") && !vocabulary.includes(name)
);
if (unknown.length > 0) {
  errors.push(
    `Config declares state(s) outside PetAnimationState: ${unknown.join(", ")}. ` +
      `The host can never request these.`
  );
}

if (tier === "v1" && declaredLookStates.length > 0) {
  errors.push(
    `v1 (8x9) configs must not declare look_* states; got ${declaredLookStates.length}. ` +
      `Cursor-following is a v2 stock-mascot feature.`
  );
}
if (tier === "v2" && declaredLookStates.length !== 16) {
  errors.push(
    `v2 (8x11) configs must declare all 16 look_* states; got ${declaredLookStates.length}.`
  );
}
if (tier === "v1" && config.lookDirections?.enabled === true) {
  errors.push("v1 configs must not enable lookDirections — there is no look grid to point at.");
}

if (atlas.width !== expectedWidth || atlas.height !== expectedHeight) {
  errors.push(`Atlas must be ${expectedWidth}x${expectedHeight}; got ${atlas.width}x${atlas.height}.`);
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

// events and phaseStates are resolved renderer-side against this config's own
// `states`. A dangling reference is silent at runtime — the event simply does
// nothing — so it has to fail here.
for (const [event, mapping] of Object.entries(config.events || {})) {
  const referenced =
    typeof mapping === "string"
      ? [mapping]
      : [mapping?.play, mapping?.then].filter(Boolean);
  for (const name of referenced) {
    if (!stateNames.includes(name)) {
      errors.push(`Event "${event}" references undefined state "${name}".`);
    }
  }
}
for (const [phase, name] of Object.entries(config.phaseStates || {})) {
  if (!stateNames.includes(name)) {
    errors.push(`Phase "${phase}" references undefined state "${name}".`);
  }
}

if (errors.length > 0) {
  console.error("Pet atlas validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Pet atlas validation passed (tier ${tier}).`);
console.log(`Atlas: ${path.normalize(atlasPath)} (${atlas.type}, ${atlas.width}x${atlas.height})`);
console.log(`Config: ${path.normalize(configPath)}`);
console.log(`States: ${vocabulary.length} vocabulary + ${declaredLookStates.length} look cells.`);

function usage() {
  console.error("Usage: node scripts/pet/validate-pet-atlas.mjs --atlas <path> --config <path>");
  process.exit(2);
}

function numberOrDefault(value, fallback) {
  return typeof value === "number" ? value : fallback;
}

/**
 * The `PetAnimationState` union from src/lib/pet.ts, minus the renderer-owned
 * `look_*` cells. Parsed rather than duplicated so the two cannot drift.
 */
function readVocabulary() {
  const petTsPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "src",
    "lib",
    "pet.ts"
  );
  const source = fs.readFileSync(petTsPath, "utf8");
  const union = /export type PetAnimationState\s*=([\s\S]*?);/.exec(source);
  if (!union) {
    throw new Error(`Could not find the PetAnimationState union in ${petTsPath}.`);
  }
  const names = [...union[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (names.length === 0) {
    throw new Error(`PetAnimationState in ${petTsPath} parsed to zero states.`);
  }
  return names.filter((name) => !name.startsWith("look_"));
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
