#!/usr/bin/env node
/**
 * Free a TCP port by killing whatever is listening on it (Windows + Unix).
 * Usage: node scripts/free-port.mjs [port]
 */
import { execSync } from "node:child_process";

const port = Number(process.argv[2] || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${process.argv[2]}`);
  process.exit(1);
}

function pidsOnPortWindows(p) {
  try {
    const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      // e.g. TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
      const m = line.match(
        new RegExp(`^\\s*TCP\\s+\\S+:${p}\\s+\\S+\\s+LISTENING\\s+(\\d+)\\s*$`, "i"),
      );
      if (m) pids.add(m[1]);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function pidsOnPortUnix(p) {
  try {
    const out = execSync(`lsof -tiTCP:${p} -sTCP:LISTEN`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const pids =
  process.platform === "win32" ? pidsOnPortWindows(port) : pidsOnPortUnix(port);

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
    console.log(`Freed port ${port} (killed PID ${pid})`);
  } catch (err) {
    console.warn(`Could not kill PID ${pid} on port ${port}: ${err.message}`);
  }
}
