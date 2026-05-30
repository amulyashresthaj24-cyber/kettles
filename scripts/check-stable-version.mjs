import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "package.json");
const lockPath = path.join(root, "package-lock.json");
const tauriPath = path.join(root, "src-tauri", "tauri.conf.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const packageJson = readJson(packagePath);
const packageLock = fs.existsSync(lockPath) ? readJson(lockPath) : null;
const tauriConfig = readJson(tauriPath);

const expected = packageJson.version;
const checks = [
  ["package.json", packageJson.version],
  ["src-tauri/tauri.conf.json", tauriConfig.version],
];

if (packageLock?.version) {
  checks.push(["package-lock.json", packageLock.version]);
}

if (packageLock?.packages?.[""]?.version) {
  checks.push(["package-lock.json packages[\"\"]", packageLock.packages[""].version]);
}

const mismatches = checks.filter(([, version]) => version !== expected);

if (!expected) {
  console.error("Stable version check failed: package.json has no version.");
  process.exit(1);
}

if (mismatches.length > 0) {
  console.error(`Stable version check failed. Expected ${expected}.`);
  for (const [source, version] of mismatches) {
    console.error(`- ${source}: ${version || "(missing)"}`);
  }
  process.exit(1);
}

console.log(`Stable version check passed: ${expected}`);
