#!/usr/bin/env node
/**
 * Wire every AI agent on this machine into the Kettles agent bridge.
 *
 * Coverage was the weak point, not the protocol: the bridge has always
 * accepted anything that can POST, but each host needed its hooks
 * hand-written into a different file. A run that is never registered is a
 * run billed as idle — so the install is one command, idempotent, and
 * merges into existing config rather than replacing it.
 *
 * Usage:
 *   node scripts/agent-bridge/install-hooks.mjs [options]
 *
 *   --agents claude,codex,cursor   default: all
 *   --project                      write to ./.claude etc. instead of ~/
 *   --dry-run                      print the resulting files, write nothing
 *   --remove                       strip Kettles hooks back out
 *
 * Every entry is tagged with MARKER, which is how re-runs and --remove
 * find previously written hooks instead of duplicating them.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const HOOK_ROOT = dirname(fileURLToPath(import.meta.url));
/** Hook commands carry this token so re-runs replace instead of stacking. */
const MARKER = "agent-bridge";

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? null : argv[i + 1];
};

const DRY = has("--dry-run");
const REMOVE = has("--remove");
const PROJECT = has("--project");
const ONLY = (valueOf("--agents") || "claude,codex,cursor,grok")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** Forward slashes: Windows JSON configs choke on unescaped backslashes. */
const cmd = (script, action) =>
  `node "${join(HOOK_ROOT, script).replace(/\\/g, "/")}" ${action}`;

const base = PROJECT ? process.cwd() : homedir();

/**
 * Claude Code and Codex share a shape: { hooks: { Event: [{ hooks: [...] }] } }.
 * Cursor uses { hooks: { event: [{ command }] } }.
 */
const TARGETS = [
  {
    id: "claude",
    label: "Claude Code",
    file: join(base, ".claude", "settings.json"),
    shape: "nested",
    script: "hook-claude.mjs",
    events: {
      SessionStart: "start",
      UserPromptSubmit: "beat",
      PostToolUse: "beat",
      Notification: "beat",
      SubagentStop: "beat",
      Stop: "done",
      SessionEnd: "done",
    },
  },
  {
    id: "codex",
    label: "Codex CLI",
    file: join(base, ".codex", "hooks.json"),
    shape: "nested",
    script: "hook-codex.mjs",
    events: {
      SessionStart: "start",
      PostToolUse: "beat",
      Stop: "done",
    },
    note: "Codex hooks are often behind a feature flag — set `[features] codex_hooks = true` in ~/.codex/config.toml.",
  },
  {
    id: "grok",
    label: "Grok CLI",
    // Grok merges every ~/.grok/hooks/*.json, so ours gets its own file
    // instead of sharing one — install and remove stay surgical.
    file: join(base, ".grok", "hooks", "kettles.json"),
    dedicated: true,
    shape: "nested",
    script: "hook-grok.mjs",
    events: {
      SessionStart: "start",
      UserPromptSubmit: "beat",
      PostToolUse: "beat",
      PostToolUseFailure: "beat",
      Notification: "beat",
      SubagentStart: "beat",
      SubagentStop: "beat",
      Stop: "done",
      StopFailure: "done",
      SessionEnd: "done",
    },
    note: "Project-scope hooks need folder trust — run /hooks-trust in the repo.",
  },
  {
    id: "cursor",
    label: "Cursor",
    file: join(base, ".cursor", "hooks.json"),
    shape: "flat",
    script: "hook-cursor.mjs",
    events: {
      beforeSubmitPrompt: "start",
      afterFileEdit: "beat",
      beforeShellExecution: "beat",
      afterShellExecution: "beat",
      stop: "done",
    },
    extra: { version: 1 },
  },
];

function readJson(file) {
  if (!existsSync(file)) return {};
  try {
    const raw = readFileSync(file, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return { __unparsed: String(e?.message || e) };
  }
}

/**
 * Drop any previously-installed Kettles entry from one event's list.
 *
 * Prunes at the inner-hook level, not the group level: a hand-written config
 * commonly puts our command in the same group as an unrelated one, and
 * dropping only whole groups leaves a duplicate behind on re-run.
 */
function stripOurs(list, shape) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") {
      out.push(entry);
      continue;
    }
    if (shape === "flat") {
      if (!String(entry.command || "").includes(MARKER)) out.push(entry);
      continue;
    }
    if (!Array.isArray(entry.hooks)) {
      out.push(entry);
      continue;
    }
    const kept = entry.hooks.filter(
      (h) => !String(h?.command || "").includes(MARKER)
    );
    // A group that held only our hook disappears; anything else is preserved.
    if (kept.length > 0) out.push({ ...entry, hooks: kept });
  }
  return out;
}

function entryFor(target, action) {
  const command = cmd(target.script, action);
  return target.shape === "flat"
    ? { command }
    : { hooks: [{ type: "command", command, timeout: 10 }] };
}

function applyTarget(target) {
  const config = readJson(target.file);
  if (config.__unparsed) {
    return { target, skipped: `existing file is not valid JSON (${config.__unparsed})` };
  }

  const hooks = { ...(config.hooks || {}) };
  for (const [event, action] of Object.entries(target.events)) {
    const cleaned = stripOurs(hooks[event], target.shape);
    hooks[event] = REMOVE ? cleaned : [...cleaned, entryFor(target, action)];
    if (hooks[event].length === 0) delete hooks[event];
  }

  const next = { ...(target.extra || {}), ...config, hooks };
  if (Object.keys(hooks).length === 0) delete next.hooks;

  return { target, next, existed: existsSync(target.file) };
}

function write(result) {
  const { target, next, existed } = result;
  // A file that holds nothing but our hooks is removed outright, not left as
  // an empty husk the host still parses on every launch.
  if (REMOVE && target.dedicated) {
    if (DRY) {
      console.log(`\n--- ${target.file} --- (delete)`);
      return;
    }
    if (existed) {
      try {
        rmSync(target.file);
      } catch {
        /* best effort */
      }
    }
    return;
  }
  const text = `${JSON.stringify(next, null, 2)}\n`;
  if (DRY) {
    console.log(`\n--- ${target.file} ---\n${text}`);
    return;
  }
  mkdirSync(dirname(target.file), { recursive: true });
  // One backup per install; the config may hold hooks we did not write.
  if (existed) {
    try {
      copyFileSync(target.file, `${target.file}.kettles-backup`);
    } catch {
      /* best effort */
    }
  }
  writeFileSync(target.file, text, "utf8");
}

const selected = TARGETS.filter((t) => ONLY.includes(t.id));
if (selected.length === 0) {
  console.error(`No known agents in --agents. Known: ${TARGETS.map((t) => t.id).join(", ")}`);
  process.exit(1);
}

console.log(
  `${REMOVE ? "Removing" : "Installing"} Kettles agent hooks (${PROJECT ? "project" : "user"} scope)${DRY ? " — dry run" : ""}`
);
console.log(`Hook scripts: ${resolve(HOOK_ROOT)}\n`);

for (const target of selected) {
  const result = applyTarget(target);
  if (result.skipped) {
    console.log(`  ✗ ${target.label}: ${result.skipped}`);
    continue;
  }
  write(result);
  const events = Object.keys(target.events).join(", ");
  console.log(`  ✓ ${target.label} → ${target.file}`);
  console.log(`      ${REMOVE ? "removed" : events}`);
  if (!REMOVE && target.note) console.log(`      note: ${target.note}`);
}

if (!REMOVE) {
  console.log(
    "\nDesktop app must be running for hooks to register a lease; when it is not, hooks exit 0 silently."
  );
  console.log("Verify: run an agent, then check the AI panel or agent-bridge-hook.log.");
}
