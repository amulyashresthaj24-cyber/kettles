# Agent bridge hooks

The desktop app listens on **loopback only** (`127.0.0.1:41999`–`42010`) for agent
presence. While a lease is open, idle auto-pause is suppressed so supervised agent
work is not billed as absence.

The bridge does **not** discover agents. Anything that can POST start/beat/done
(or run `hook.mjs`) works. Labels come from the free-form `agent` field
(`claude-code`, `codex`, `cursor`, `grok`, …).

Hooks never break the agent: if Flowmate/Kettles is closed or the discovery file
is missing, the hook exits **0** silently.

### If “detected” never lights up

1. **Desktop app must be running** (not browser-only). Hooks POST to the local bridge.
2. Check discovery: `%APPDATA%\com.flowmate.app\agent-bridge.json` (or `com.kettles.app`).
3. Read the hook trail log: `%APPDATA%\com.flowmate.app\agent-bridge-hook.log`  
   - `POST failed … fetch failed` → app not listening / stale discovery  
   - `no discovery file` → app never wrote the file  
   - `POST … ok` → bridge got it; if UI still blank, restart desktop so JS listeners attach  
4. Debug one shot:  
   `set AGENT_BRIDGE_DEBUG=1`  
   then `node …/hook-claude.mjs start` and watch stderr.

## One-command install (recommended)

```bash
npm run agent:hooks                      # user scope — Claude, Codex, Cursor, Grok
npm run agent:hooks -- --agents claude   # one host only
npm run agent:hooks -- --project         # write ./.claude, ./.codex, ./.cursor
npm run agent:hooks -- --dry-run         # print resulting configs, write nothing
npm run agent:hooks:remove               # strip Kettles hooks back out
```

Merges into existing hook configs (never replaces), backs the old file up to
`<file>.kettles-backup`, and is idempotent — re-running replaces the Kettles
entries rather than stacking them. Codex still needs its feature flag
(`[features] codex_hooks = true` in `~/.codex/config.toml`).

Events wired by the installer:

| Host | start | beat | done |
|---|---|---|---|
| Claude Code | `SessionStart` | `UserPromptSubmit`, `PostToolUse`, `Notification`, `SubagentStop` | `Stop`, `SessionEnd` |
| Codex CLI | `SessionStart` | `PostToolUse` | `Stop` |
| Cursor | `beforeSubmitPrompt` | `afterFileEdit`, `before/afterShellExecution` | `stop` |
| Grok CLI | `SessionStart` | `UserPromptSubmit`, `PostToolUse(+Failure)`, `Notification`, `SubagentStart/Stop` | `Stop`, `StopFailure`, `SessionEnd` |

Grok gets its own file (`~/.grok/hooks/kettles.json`) because Grok merges every
`*.json` in that directory; `--remove` deletes it outright. Project-scope Grok
hooks need folder trust — run `/hooks-trust` in the repo, or they are silently
skipped.

The extra beats exist to cover long stretches with no tool call (reasoning,
waiting on a permission prompt) that would otherwise trip the 90s TTL and close
the run as `stale`. `SubagentStop` is a **beat**, not a `done` — the parent run
is still working.

## Scripts

| Script | Sets `agent` to |
|---|---|
| `scripts/agent-bridge/hook.mjs` | `AGENT_NAME` env, or argv `[3]`, or `claude-code` |
| `scripts/agent-bridge/hook-claude.mjs` | `claude-code` |
| `scripts/agent-bridge/hook-codex.mjs` | `codex` |
| `scripts/agent-bridge/hook-cursor.mjs` | `cursor` |
| `scripts/agent-bridge/hook-grok.mjs` | `grok` |

```text
node …/hook.mjs start|beat|done [agentName]
node …/hook-codex.mjs start
```

Replace `HOOK_ROOT` below with your absolute clone path, e.g.
`C:/Users/<you>/Projects/Kettles/scripts/agent-bridge`.

## Coverage at a glance

| Agent | Lifecycle hooks? | Best mapping | Heartbeat quality |
|---|---|---|---|
| **Claude Code** | Yes — first-class | SessionStart / PostToolUse / Stop | Excellent (tool-use beats) |
| **Codex CLI** | Yes (opt-in feature flag) | SessionStart / PostToolUse / Stop | Good when hooks enabled |
| **Cursor** | Yes (hooks.json) | session start / after edit / stop | Good if after-edit is wired as beat |
| **Grok CLI** | Yes — first-class (`~/.grok/hooks/*.json`) | SessionStart / PostToolUse / Stop | Excellent (tool + prompt + notification beats) |
| **Grok Build / other surfaces** | Product-dependent | same three calls if hooks exist; else wrapper | Varies — use manual start/done if needed |

Process-list polling is **not** used (cannot tell “thinking” vs “terminal open”).
Agents without hooks: call the scripts manually, or wait for the M2 “AI running” toggle.

---

## Discovery file

Written on every app launch to the Tauri app data dir:

| Build | Path (Windows) |
|---|---|
| Dev (`com.flowmate.app`) | `%APPDATA%\com.flowmate.app\agent-bridge.json` |
| Stable (`com.kettles.app`) | `%APPDATA%\com.kettles.app\agent-bridge.json` |

```json
{ "port": 41999, "token": "<64 hex chars>", "version": "1" }
```

- Token is regenerated every launch. Hooks re-read the file each invocation.
- File is ACL-restricted to the current user (Windows `icacls`, Unix `0600`).
- Override path with `AGENT_BRIDGE_DISCOVERY`.

## Wire protocol

```
POST /v1/agent/start  { runId, agent, label?, cwd?, taskId? }  → 200 { ok, leaseSeconds: 90 }
POST /v1/agent/beat   { runId }                                  → 200 { ok: true }
POST /v1/agent/done   { runId, status, summary? }                → 200 { ok: true }
GET  /v1/health                                                  → 200 { ok, version, port }
```

`status`: `"ok" | "error" | "cancelled"`. Server may emit `"stale"` when the
90s TTL expires without a beat.

Auth: `Authorization: Bearer <token>` on all `/v1/agent/*`.  
Rejects requests with an `Origin` header (403). Requires `Content-Type: application/json`.

### Env (all scripts)

| Env | Purpose |
|---|---|
| `AGENT_BRIDGE_DISCOVERY` | Path to `agent-bridge.json` |
| `AGENT_RUN_ID` | Force a run id |
| `AGENT_NAME` | Override agent label (wrappers already set this) |
| `AGENT_LABEL` | Human label (else cwd basename) |
| `AGENT_TASK_ID` | Flowmate task id |
| `AGENT_STATUS` | done status (`ok` / `error` / `cancelled`). Omitted: inferred from the hook's stdin payload (`status` / `result` / `error`), else `ok` |

**Grok also loads `~/.claude/settings.json` and `~/.cursor/hooks.json`** for
compatibility, so a Grok session fires the Claude wrapper too. Both POSTs carry
the same `sessionId` → same `runId` → one lease renewed, not two. The label
stays correct because `GROK_HOOK_EVENT` (injected by Grok's own runner)
outranks the wrapper's hardcoded name. To stop the double-fire entirely, set
`[compat.claude] hooks = false` in `~/.grok/config.toml`.

Event names are matched with separators stripped, so `SubagentStop`,
`subagentStop` and Grok's `subagent_stop` all resolve the same — a subagent
ending is a **beat**, never a `done`.

Without `AGENT_NAME`, `hook.mjs` guesses the host from its own env
(`CODEX_*`, `CURSOR_*`, `GROK_*`, `CLAUDE_*`) before falling back to
`claude-code`. The `hook-<agent>.mjs` wrappers still set it explicitly.

## What finishing does

When the last open lease closes, the desktop app shows a toast and the pet
speaks the run summary. If **Settings → Pet → Celebrate AI Runs** is on
(default), a clean finish also jumps the mascot, throws confetti and plays a
short synthesised cue; failures play a lower two-note alert. Nothing fires
while another agent is still running — the celebration means "your work is
done", not "one of several runs ended".

---

## Claude Code

Config: `.claude/settings.json` (project) or `~/.claude/settings.json` (user).

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node HOOK_ROOT/hook-claude.mjs start"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node HOOK_ROOT/hook-claude.mjs beat"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node HOOK_ROOT/hook-claude.mjs done"
          }
        ]
      }
    ]
  }
}
```

| Claude event | Call | Notes |
|---|---|---|
| `SessionStart` | `start` | `runId` from session id on stdin when present |
| `PostToolUse` | `beat` | Free heartbeat; keeps the 90s lease alive |
| `Stop` | `done` | `status: "ok"` by default |
| `SubagentStop` | ignored in M0 | `PostToolUse` already heartbeats |

On Windows, use forward slashes or a quoted absolute path in `command`.

---

## OpenAI Codex CLI

Codex hooks are a **separate** registration from Claude’s (similar event names,
different files). They are often **off by default** — enable the feature flag first.

### 1. Enable hooks

`~/.codex/config.toml` (or project `.codex/config.toml`):

```toml
[features]
codex_hooks = true
```

(Exact flag name can change between Codex versions; if hooks never fire, check
`codex /hooks` or current docs for the enable switch.)

### 2. Register hooks

Project or user: `.codex/hooks.json` or `~/.codex/hooks.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node HOOK_ROOT/hook-codex.mjs start",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node HOOK_ROOT/hook-codex.mjs beat",
            "timeout": 10
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node HOOK_ROOT/hook-codex.mjs done",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

| Codex event (typical) | Call |
|---|---|
| `SessionStart` | `start` |
| `PostToolUse` (or after-tool equivalent) | `beat` |
| `Stop` | `done` |

If your Codex build only exposes Pre/Post tool hooks without `SessionStart`, map
**first** `PostToolUse` as beat only after a manual or shell `start`, or call
`start` from a shell alias that launches Codex.

---

## Cursor

Cursor uses `.cursor/hooks.json` (project) and/or `~/.cursor/hooks.json` (user).
Event names are **not** Claude’s PascalCase set — they use camelCase lifecycle
hooks such as `stop`, `afterFileEdit`, `beforeShellExecution`, etc.

Recommended mapping for the lease:

| Cursor event | Call | Why |
|---|---|---|
| Session / agent start (if available in your version, e.g. session start hook) | `start` | Open the lease |
| `afterFileEdit` (and/or before shell / MCP if you want denser beats) | `beat` | Heartbeat while the agent is actually working |
| `stop` | `done` | Close the lease |

Example `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      {
        "command": "node HOOK_ROOT/hook-cursor.mjs beat"
      }
    ],
    "stop": [
      {
        "command": "node HOOK_ROOT/hook-cursor.mjs done"
      }
    ]
  }
}
```

**Start without a session-start event:** either

1. Add a start hook if your Cursor version documents one, or  
2. Call start once when you open an agent chat (task / alias), or  
3. Rely on the first `beat` only after an explicit `start` — **beats never create a lease** (by design; prevents resurrecting TTL-killed runs).

So for Cursor, prefer an explicit `start` path. Minimal shell before a long agent run:

```bash
node HOOK_ROOT/hook-cursor.mjs start
```

If `afterFileEdit` is sparse (long pure-reasoning stretches), the 90s TTL may
expire → `stale`. That is correct behaviour; bump heartbeats or re-`start` if needed.
Long stretches without tool/file activity are a known open item (same as Claude
`SubagentStop` in M0).

---

## Grok / Grok Build

Grok CLI has first-class hooks (`~/.grok/docs/user-guide/10-hooks.md`):
`npm run agent:hooks -- --agents grok` writes `~/.grok/hooks/kettles.json`.
Manual equivalent:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node HOOK_ROOT/hook-grok.mjs start", "timeout": 10 }] }
    ],
    "PostToolUse": [
      { "hooks": [{ "type": "command", "command": "node HOOK_ROOT/hook-grok.mjs beat", "timeout": 10 }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node HOOK_ROOT/hook-grok.mjs done", "timeout": 10 }] }
    ]
  }
}
```

Notes specific to Grok:

- Hook files live in `~/.grok/hooks/*.json` (global, always trusted) or
  `<project>/.grok/hooks/*.json` (needs `/hooks-trust`). Hooks can also be
  declared in `~/.grok/config.toml`.
- `Stop` fires again at session end (`reason: "channel_closed"`) — harmless, a
  `done` on a closed run is a 200 no-op.
- `StopFailure` (API error) maps to `done` with `status: "error"`, so the pet
  says the run failed instead of congratulating it.
- Stop-gate hooks can block the turn; ours never writes to stdout and exits 0,
  so it can't hold your agent hostage.
- Grok surfaces without hooks (Grok Build, IDE): use the wrapper below.

### Shell wrapper (any Grok surface)

```bash
# Windows PowerShell
function Invoke-GrokTracked {
  node HOOK_ROOT/hook-grok.mjs start
  try {
    # your usual grok / grok build invocation
    grok @args
  } finally {
    node HOOK_ROOT/hook-grok.mjs done
  }
}
```

For long runs, add a background beat (optional) or re-issue `start` every ~60s
from a second process — simplest is to beat from any tool-complete callback
the product offers.

### Manual

```bash
node HOOK_ROOT/hook-grok.mjs start
# …work…
node HOOK_ROOT/hook-grok.mjs beat   # optional, every ~60s if idle
node HOOK_ROOT/hook-grok.mjs done
```

---

## Concurrent agents

Two leases (e.g. Claude in one repo, Codex in another) are fine. Suppression
stays on until **both** close. Use distinct `runId`s (session ids from each host);
do not force the same `AGENT_RUN_ID` across tools.

---

## curl recipes

Replace `$PORT` and `$TOKEN` from the discovery file.

```bash
# Health (no auth)
curl -s http://127.0.0.1:$PORT/v1/health

# Start a lease
curl -s -X POST http://127.0.0.1:$PORT/v1/agent/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"runId":"demo-1","agent":"curl","label":"manual test"}'

# Heartbeat
curl -s -X POST http://127.0.0.1:$PORT/v1/agent/beat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"runId":"demo-1"}'

# Finish
curl -s -X POST http://127.0.0.1:$PORT/v1/agent/done \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"runId":"demo-1","status":"ok"}'

# Expect 401 (no token)
curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:$PORT/v1/agent/start \
  -H "Content-Type: application/json" \
  -d '{"runId":"x","agent":"curl"}'

# Expect 403 (Origin header)
curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:$PORT/v1/agent/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil.example" \
  -d '{"runId":"x","agent":"curl"}'
```

## Lease semantics (M0)

- TTL **90s**, renewed by `beat` (and duplicate `start`).
- No beat for 90s → lease expires as `stale`; idle detection resumes.
- Multiple concurrent `runId`s: suppression stays on until **all** close.
- Leases are memory-only — power cut / restart → no lease on next launch.
- M0 does **not** write sessions or show UI. That is M1.
- Manual “AI running” UI for unhookable agents is **M2**.
