#!/usr/bin/env node
/**
 * Kill leftover Flowmate desktop processes so `tauri:dev` can become the
 * single instance. Without this, an orphaned flowmate-desktop from a prior
 * session holds the single-instance lock and the new cargo run exits 0
 * immediately — taking `tauri:dev` (and Next) down with it.
 *
 * Usage: node scripts/free-desktop.mjs
 */
import { execSync } from "node:child_process";

const NAMES =
  process.platform === "win32"
    ? ["flowmate-desktop.exe", "Flowmate.exe"]
    : ["flowmate-desktop", "Flowmate"];

function pidsWindows() {
  const found = new Set();
  for (const name of NAMES) {
    try {
      const out = execSync(
        `tasklist /FI "IMAGENAME eq ${name}" /FO CSV /NH`,
        { encoding: "utf8" },
      );
      for (const line of out.split(/\r?\n/)) {
        // "flowmate-desktop.exe","12345","Session Name","1","12,345 K"
        const m = line.match(/^"[^"]+","(\d+)"/);
        if (m) found.add(m[1]);
      }
    } catch {
      // tasklist exits non-zero when nothing matches
    }
  }
  return [...found];
}

function pidsUnix() {
  const found = new Set();
  for (const name of NAMES) {
    try {
      const out = execSync(`pgrep -x ${name}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      for (const line of out.split(/\r?\n/)) {
        const pid = line.trim();
        if (pid) found.add(pid);
      }
    } catch {
      // pgrep exits 1 when no match
    }
  }
  return [...found];
}

const pids = process.platform === "win32" ? pidsWindows() : pidsUnix();

if (pids.length === 0) {
  process.exit(0);
}

for (const pid of pids) {
  if (pid === "0" || pid === String(process.pid)) continue;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    } else {
      process.kill(Number(pid), "SIGKILL");
    }
    console.log(`Freed desktop instance (killed PID ${pid})`);
  } catch (err) {
    console.warn(`Could not kill PID ${pid}: ${err.message}`);
  }
}
