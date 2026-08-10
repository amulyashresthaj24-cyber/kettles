#!/usr/bin/env node
/**
 * Flowmate / Kettles agent-bridge hook.
 *
 * Reads agent-bridge.json from the desktop app data dir, then POSTs
 * start / beat / done. Fail silent + exit 0 when the app is not running —
 * a hook that breaks the agent because the tracker is closed is worse than
 * the idle bug this exists to fix.
 *
 * Usage:
 *   node hook.mjs start|beat|done [agentName]
 *   node hook-claude.mjs start
 *
 * Optional env:
 *   AGENT_BRIDGE_DISCOVERY  — absolute path to agent-bridge.json
 *   AGENT_RUN_ID            — override run id
 *   AGENT_NAME              — default "claude-code"
 *   AGENT_LABEL / AGENT_TASK_ID / AGENT_STATUS
 *   AGENT_BRIDGE_DEBUG=1    — log to stderr
 *
 * Always appends a short trail to:
 *   %APPDATA%/com.flowmate.app/agent-bridge-hook.log  (Windows)
 * so "hooks silent" is diagnosable without DEBUG.
 */

import { readFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const VALID = new Set(["start", "beat", "done"]);
const DEBUG = process.env.AGENT_BRIDGE_DEBUG === "1";
/** Max wait for hook JSON on stdin. Claude may leave stdin open with no data. */
const STDIN_TIMEOUT_MS = 400;

function silentExit(code = 0) {
  process.exit(code);
}

function debug(...args) {
  if (DEBUG) console.error("[agent-bridge]", ...args);
}

function trail(msg) {
  debug(msg);
  try {
    const dir =
      process.platform === "win32"
        ? join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "com.flowmate.app")
        : process.platform === "darwin"
          ? join(homedir(), "Library", "Application Support", "com.flowmate.app")
          : join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "com.flowmate.app");
    mkdirSync(dir, { recursive: true });
    appendFileSync(
      join(dir, "agent-bridge-hook.log"),
      `${new Date().toISOString()} ${msg}\n`,
      "utf8"
    );
  } catch {
    /* never break the agent */
  }
}

function discoveryCandidates() {
  if (process.env.AGENT_BRIDGE_DISCOVERY) {
    return [process.env.AGENT_BRIDGE_DISCOVERY];
  }
  const home = homedir();
  const file = "agent-bridge.json";
  const identifiers = ["com.flowmate.app", "com.kettles.app"];
  const dirs = [];
  if (process.platform === "win32") {
    const roaming = process.env.APPDATA || join(home, "AppData", "Roaming");
    for (const id of identifiers) dirs.push(join(roaming, id));
  } else if (process.platform === "darwin") {
    for (const id of identifiers) {
      dirs.push(join(home, "Library", "Application Support", id));
    }
  } else {
    const xdg = process.env.XDG_DATA_HOME || join(home, ".local", "share");
    for (const id of identifiers) dirs.push(join(xdg, id));
  }
  return dirs.map((d) => join(d, file));
}

function loadDiscovery() {
  for (const p of discoveryCandidates()) {
    try {
      if (!existsSync(p)) continue;
      const raw = readFileSync(p, "utf8");
      const j = JSON.parse(raw);
      if (j && typeof j.port === "number" && typeof j.token === "string") {
        return { ...j, _path: p };
      }
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Agent hooks often pipe JSON on stdin. Must not hang: Claude (and others)
 * may leave stdin open with zero bytes, and a forever-wait means start/beat
 * never POST — sessions never register.
 */
async function readStdinJson() {
  if (process.stdin.isTTY) return {};
  if (process.stdin.readableEnded) return {};

  return new Promise((resolve) => {
    const chunks = [];
    let settled = false;
    let gotData = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        process.stdin.removeListener("data", onData);
        process.stdin.removeListener("end", onEnd);
        process.stdin.removeListener("error", onEnd);
        if (typeof process.stdin.pause === "function") process.stdin.pause();
      } catch {
        /* ignore */
      }
      const text = Buffer.concat(chunks).toString("utf8").trim();
      if (!text) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch (e) {
        trail(`stdin JSON parse failed: ${e?.message || e}`);
        resolve({});
      }
    };

    const onData = (c) => {
      gotData = true;
      chunks.push(c);
      // Reset short grace after last chunk so multi-chunk JSON still works.
      clearTimeout(timer);
      timer = setTimeout(finish, STDIN_TIMEOUT_MS);
    };
    const onEnd = () => finish();

    let timer = setTimeout(finish, STDIN_TIMEOUT_MS);
    process.stdin.on("data", onData);
    process.stdin.on("end", onEnd);
    process.stdin.on("error", onEnd);
    if (typeof process.stdin.resume === "function") process.stdin.resume();
    void gotData;
  });
}

function pickSessionId(stdin) {
  const keys = [
    "session_id",
    "sessionId",
    "conversation_id",
    "conversationId",
    "thread_id",
    "threadId",
    "generation_id",
    "generationId",
    "transcript_path",
    "transcriptPath",
  ];
  for (const k of keys) {
    if (stdin[k] != null && String(stdin[k]).length > 0) {
      if (k === "transcript_path" || k === "transcriptPath") {
        return createHash("sha256").update(String(stdin[k])).digest("hex").slice(0, 24);
      }
      return String(stdin[k]);
    }
  }
  if (stdin.session && typeof stdin.session === "object") {
    for (const k of ["id", "session_id", "sessionId"]) {
      if (stdin.session[k] != null) return String(stdin.session[k]);
    }
  }
  // Do not use bare tool-use `id` — fragments the lease across beats.
  return null;
}

function defaultRunId(stdin, agent) {
  if (process.env.AGENT_RUN_ID) return process.env.AGENT_RUN_ID;
  const fromStdin = pickSessionId(stdin);
  if (fromStdin) return fromStdin;
  const basis =
    process.env.CLAUDE_SESSION_ID
    || process.env.CODEX_SESSION_ID
    || process.env.CURSOR_SESSION_ID
    || process.env.GROK_SESSION_ID
    || `${agent}:${process.cwd() || "default"}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 24);
}

function cwdFromStdin(stdin) {
  return (
    stdin.cwd
    || stdin.workspace_root
    || stdin.workspaceRoot
    || stdin.project_dir
    || stdin.projectDir
    || process.cwd()
  );
}

/** Map Claude (and similar) event names → start|beat|done when argv is missing. */
function actionFromEvent(stdin) {
  // Separators stripped: hosts spell the same event `SubagentStop`,
  // `subagentStop` and `subagent_stop`. Without this, grok's snake_case
  // `subagent_stop` misses the subagent branch and falls through to the
  // `stop` branch — closing the lease while the parent run is still working.
  const event = String(
    stdin.hook_event_name
      || stdin.hookEventName
      || process.env.GROK_HOOK_EVENT
      || process.env.CLAUDE_HOOK_EVENT
      || process.env.HOOK_EVENT_NAME
      || ""
  )
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!event) return "";
  if (
    event.includes("sessionstart")
    || event === "session_start"
    || event === "start"
    || event.includes("submitprompt")
  ) {
    return "start";
  }
  // Ordered before the stop check: `subagentstop` contains "stop" but the
  // parent run is still working — closing there ends the lease early and the
  // remaining minutes get billed as idle.
  if (
    event.includes("subagent")
    || event.includes("posttooluse")
    || event.includes("pretooluse")
    || event.includes("tool")
    || event.includes("fileedit")
    || event.includes("shellexecution")
    || event.includes("notification")
    || event.includes("userpromptsubmit")
    || event === "beat"
  ) {
    return "beat";
  }
  if (
    event.includes("stop")
    || event.includes("sessionend")
    || event === "done"
    || event === "end"
  ) {
    return "done";
  }
  return "";
}

/**
 * Real status for `done`. A run that errored out and one that succeeded must
 * not read identically — the pet says which, and "everything is fine" on a
 * failed run is how a user learns to ignore the notifier.
 */
function doneStatus(stdin) {
  if (process.env.AGENT_STATUS) return process.env.AGENT_STATUS;
  const raw = String(
    stdin.status ?? stdin.result ?? stdin.outcome ?? stdin.reason ?? ""
  ).toLowerCase();
  if (stdin.error || raw.includes("error") || raw.includes("fail")) return "error";
  if (raw.includes("cancel") || raw.includes("abort") || raw.includes("interrupt")) {
    return "cancelled";
  }
  return "ok";
}

/**
 * The host actually running this hook, when it identifies itself through a
 * variable only its own runner injects.
 *
 * This outranks the `hook-<agent>.mjs` wrapper on purpose: Grok also loads
 * `~/.claude/settings.json` and `~/.cursor/hooks.json` for compatibility, so
 * `hook-claude.mjs` fires inside Grok sessions and every one of those runs
 * would otherwise be reported as Claude.
 */
function runnerAgent() {
  if (process.env.GROK_HOOK_EVENT || process.env.GROK_WORKSPACE_ROOT) return "grok";
  return "";
}

/**
 * Guess the host from its own env when the generic hook.mjs is wired without
 * a name. Wrong-but-plausible beats "claude-code" on every row of the report.
 */
function detectAgent() {
  const env = process.env;
  if (env.CODEX_SESSION_ID || env.CODEX_HOME || env.CODEX_VERSION) return "codex";
  if (env.CURSOR_SESSION_ID || env.CURSOR_TRACE_ID || env.CURSOR_AGENT) return "cursor";
  if (env.GROK_SESSION_ID || env.GROK_API_KEY) return "grok";
  if (env.CLAUDE_SESSION_ID || env.CLAUDE_CODE || env.CLAUDECODE) return "claude-code";
  return "";
}

function resolveAction(opts, stdin) {
  const fromOpts = (opts.action || "").toLowerCase();
  if (VALID.has(fromOpts)) return fromOpts;
  const fromArg = (process.argv[2] || "").toLowerCase();
  if (VALID.has(fromArg)) return fromArg;
  const fromEvent = actionFromEvent(stdin);
  if (VALID.has(fromEvent)) return fromEvent;
  return "";
}

async function post(discovery, path, body) {
  const url = `http://127.0.0.1:${discovery.port}${path}`;
  debug("POST", url, body);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${discovery.token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(2000),
  });
  const text = await res.text().catch(() => "");
  debug("response", res.status, text);
  if (!res.ok) {
    trail(`POST ${path} → ${res.status} ${text.slice(0, 120)}`);
  } else {
    trail(`POST ${path} ok runId=${body.runId || body.run_id || "?"}`);
  }
  return res.status;
}

/**
 * @param {{ action?: string, agent?: string }} [opts]
 */
export async function runHook(opts = {}) {
  // Read stdin first so we can infer action from hook_event_name if needed.
  const stdin = await readStdinJson();
  const action = resolveAction(opts, stdin);
  if (!VALID.has(action)) {
    trail(`invalid action argv=${JSON.stringify(process.argv.slice(2))} event=${stdin.hook_event_name || ""}`);
    silentExit();
  }

  const discovery = loadDiscovery();
  if (!discovery) {
    trail(`no discovery file; looked in: ${discoveryCandidates().join(" | ")}`);
    silentExit();
  }

  const agent =
    process.env.AGENT_NAME
    || runnerAgent()
    || opts.agent
    || (VALID.has((process.argv[3] || "").toLowerCase()) ? undefined : process.argv[3])
    || detectAgent()
    || "claude-code";
  const runId = defaultRunId(stdin, agent);
  const cwd = cwdFromStdin(stdin);
  const label =
    process.env.AGENT_LABEL
    || (cwd ? String(cwd).split(/[/\\]/).filter(Boolean).pop() : undefined)
    || undefined;
  const taskId = process.env.AGENT_TASK_ID || undefined;

  trail(`${action} agent=${agent} runId=${runId} port=${discovery.port}`);

  try {
    if (action === "start") {
      await post(discovery, "/v1/agent/start", {
        runId,
        agent,
        label,
        cwd,
        taskId,
      });
    } else if (action === "beat") {
      // Server /beat is a no-op for unknown runIds (T6). SessionStart often
      // does not fire (resume, some hosts), so PostToolUse would never open a
      // lease and the UI never shows "detected". Open-or-renew via /start
      // instead — same TTL renewal, creates the lease if missing.
      await post(discovery, "/v1/agent/start", {
        runId,
        agent,
        label,
        cwd,
        taskId,
      });
    } else if (action === "done") {
      const status = doneStatus(stdin);
      // Ensure something was open first so endAgentRun has a segment to close
      // when only PostToolUse ever fired.
      await post(discovery, "/v1/agent/start", {
        runId,
        agent,
        label,
        cwd,
        taskId,
      });
      await post(discovery, "/v1/agent/done", {
        runId,
        status,
        summary: stdin.summary ? String(stdin.summary) : undefined,
      });
    }
  } catch (e) {
    // Most common: desktop app closed — discovery file is stale.
    trail(
      `POST failed (${e?.message || e}). Is Flowmate/Kettles desktop running? discovery=${discovery._path || "?"}`
    );
  }
  silentExit();
}

const thisFile = fileURLToPath(import.meta.url);
const invokedAs =
  process.argv[1] && existsSync(process.argv[1])
    ? pathToFileURL(process.argv[1]).href
    : null;
const isMain = invokedAs === pathToFileURL(thisFile).href;

if (isMain) {
  runHook().catch((e) => {
    trail(`fatal ${e?.message || e}`);
    silentExit();
  });
}

export { loadDiscovery, discoveryCandidates, actionFromEvent, doneStatus };
