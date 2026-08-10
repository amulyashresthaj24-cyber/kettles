# AI Agent Tracking — Implementation Spec

> **Audience: the model implementing this.** Not a discussion document. Decisions are made.
> Written 2026-08-02
> Conventions: [`CLAUDE.md`](../CLAUDE.md) · Ledger contract: [`system.md`](system.md)

---

## 0. How to use this document

1. Read §1 (context) and §2 (verified facts) **before opening any file**.
2. Read §3 (locked decisions). Do not re-litigate them. If you believe one is wrong, say so
   in one line and implement it anyway unless it is unsafe — see §9.
3. §4 lists the **eight places where pattern-matching produces a wrong answer.** Each is a
   defect that ships silently and corrupts billable time. Read all eight before writing code.
4. Implement milestones in order. Each has a file allowlist, a contract, a done-when, and
   named traps. Touching a file outside the allowlist requires a one-line justification.
5. §8 is the gate. Do not report completion without running it.

**Ground rule for this codebase:** it is a billing ledger. Every defect here becomes a
wrong number on an invoice. Failing loudly beats degrading quietly, every time.

---

## 1. Context — what exists and why it breaks

The desktop shell runs an idle-detection thread at
[`lib.rs:298`](../src-tauri/src/lib.rs#L298). Every 30s it calls Windows
`GetLastInputInfo` and compares against `IDLE_THRESHOLD_SECS` (default 300). Crossing the
threshold emits `idle-detected`; input returning emits `idle-resumed` with the high-water
idle reading.

`DesktopShell` listens ([`DesktopShell.tsx:290`](../src/components/DesktopShell.tsx#L290)),
calls `pauseSessionForIdle` ([`store-supabase.ts:967`](../src/lib/store-supabase.ts#L967)),
which freezes the session **at the moment input stopped** and attaches a pending
`IdleRecovery`. On return, the pet asks which of four answers applies
([`idle-recovery.ts:84`](../src/lib/idle-recovery.ts#L84)). The default,
`resume_trimmed`, deletes the gap.

**The defect.** `GetLastInputInfo` measures keyboard and mouse. That was a valid proxy for
"working" when typing was the only way to work. It is not valid when a 20-minute refactor is
delegated to Claude Code and the user reads diffs as they land. That stretch is classified
as idle, frozen, and trimmed by default.

**Kettles currently bills agent-supervised work at zero.** This feature is the idle detector
learning a second kind of evidence — not a new product surface bolted on the side.

Three deliverables, one mechanism:

| Ask | Mechanism |
|---|---|
| Know an agent is working | Loopback HTTP bridge fed by agent hooks (M0) |
| Timer does not stop | Lease-gated suppression of the idle thread (M0) |
| Notification when done | `agent-run-finished` → existing pet + native fallback path (M1) |

---

## 2. Verified facts — do not re-derive, do not assume otherwise

Every row below was confirmed by reading the file named. They are the facts most likely to
be guessed wrong.

| # | Fact | Source |
|---|---|---|
| F1 | Sessions persist through an edge function that merges the request body into a **`data` JSONB column** (`mergedData = {...currentData.data, ...sanitizeData(body)}`). New `Session` fields ride it with **zero schema and zero edge-function change.** | [`supabase/functions/sessions/index.ts`](../supabase/functions/sessions/index.ts) PUT branch |
| F2 | That merge is **shallow**. Sending `agentSegments: [x]` **replaces** the stored array. Always send the complete array. | same, `mergedData` |
| F3 | `sanitizeData()` strips only `id, created_at, updated_at, user_id, client_id, project_id, task_id`. camelCase fields pass through untouched. | [`_shared/validators.ts:15`](../supabase/functions/_shared/validators.ts#L15) |
| F4 | There is **no schema doc** for the `sessions` table — the old `Docs/database.md` was stale (documented a `notes text` column and no `data` column) and has been deleted. Trust the edge function and the migrations. | `supabase/migrations/` + F1 |
| F5 | `queueMutation` is **module-private** in `store-supabase.ts:54`. It is not exported and must not be imported elsewhere. | [`store-supabase.ts:54`](../src/lib/store-supabase.ts#L54) |
| F6 | `isRemoteId(id)` is `id.length >= 20`. Local ids from `uid()` are shorter. This is how the store decides direct API call vs offline queue. | `store-supabase.ts:77` |
| F7 | Tests: `npm test` → `vitest run`, `environment: "node"`, include `src/**/*.test.ts`, alias `@` → `./src`. **No jsdom.** Pure modules only; do not write component tests. | [`vitest.config.ts`](../vitest.config.ts) |
| F8 | `src-tauri/Cargo.toml` has **no async runtime** — no tokio, no hyper, no axum. Do not add one. | [`Cargo.toml`](../src-tauri/Cargo.toml) |
| F9 | Idle detection is inside `#[cfg(target_os = "windows")]`. `get_system_idle_seconds()` exists on Windows only. | `lib.rs:308`, `lib.rs:380` |
| F10 | Tauri commands are registered in an `invoke_handler` list near `lib.rs:348`. A new command not added there fails at runtime, not compile time. | `lib.rs:348` |
| F11 | `capabilities/default.json` grants `core:default` to the `main` window. `listen("idle-detected")` already works there, so **listening to new Rust→JS events needs no capability change.** | [`capabilities/default.json`](../src-tauri/capabilities/default.json) |
| F12 | `normalizeSession()` (`store-supabase.ts:63`) spreads the session and does **not** drop unknown fields. `agentSegments` survives it. | `store-supabase.ts:63` |
| F13 | `SessionSource` is `"timer" \| "manual" \| "idle_recovery"`. `Session.pendingIdleRecovery` is documented as "Rides the sessions JSONB payload" — the precedent for F1. | [`types.ts:14`](../src/lib/types.ts#L14), `types.ts:131` |
| F14 | Sync queue entities are `"clients" \| "projects" \| "tasks" \| "sessions"`. There is no fifth entity and adding one is out of scope through M3. | `store-supabase.ts:45` |

---

## 3. Locked decisions

Each row states the decision, the reason, and what was rejected. **Implement as written.**

### D1 — Signal source: loopback HTTP bridge fed by agent hooks

Rejected, with reasons you should not need to rediscover:

- **Process-list polling** (`claude`, `codex`, `cursor-agent`): cannot distinguish "agent is
  thinking" from "terminal is open." No run label, no task link, no truthful end — a process
  sits at a prompt for an hour. It would suppress idle detection for the entire workday,
  which is strictly worse than the current bug.
- **Manual UI toggle as primary**: requires the user to remember at exactly the moment they
  delegated the work and stopped paying attention. Retained as an M2 fallback only.

The bridge is the only option that knows the run's identity, its task, and its actual end.

### D2 — Agent presence is a lease with a TTL, not a boolean

Non-negotiable. See **T1** in §4.

### D3 — Suppression uses its own atomic, never `IDLE_DETECTION_ENABLED`

See **T2**. Reusing the existing flag introduces a race with the preference effect.

### D4 — Idle readings are clamped to the lease end

See **T3**. Without this, the feature steals the exact time it was built to protect.

### D5 — Timer running → count agent time and annotate the session

Agent stretches append to `Session.agentSegments`, riding the `data` JSONB payload (F1) the
same way `pendingIdleRecovery` does. **No migration. No edge function change.**

### D6 — No timer running → write an unclassified draft, never auto-start a timer

See **T4**. This is the single most important product constraint in the spec.

### D7 — HTTP server crate is `tiny_http`

Synchronous, one thread, no runtime. `axum` drags tokio + hyper for four endpoints (F8).
The idle thread is already a plain `std::thread`; the bridge sits beside it in that style.

### D8 — Desktop only through M3

Web has no local listener. Agent data reaches web through normal sync, so `/report` shows
it everywhere. Do not attempt a web bridge.

### D9 — Milestones ship independently

M0 is the bug fix and is valuable with no UI at all. Do not merge milestones to "save time."

---

## 4. Reasoning checkpoints — where pattern-matching gets this wrong

**Read all eight before writing code.** Each describes a defect that compiles, passes a
naive test, demos correctly, and silently produces wrong invoices.

---

### T1 — The lease must expire on its own

**The obvious implementation is wrong.** `start` sets `AGENT_ACTIVE = true`, `done` sets it
false. Now enumerate the ways `done` never arrives: terminal killed, laptop lid closed,
agent OOMs, hook misconfigured, machine sleeps, user `Ctrl-C`s mid-run.

In every one of those, idle suppression stays on **forever**. The timer runs all night. The
ledger is then wrong in the same direction the entire idle-recovery system exists to
prevent, and wrong by more.

**Required design:** a run holds a lease. Renewal or death, no third state.

| Event | Effect |
|---|---|
| `POST /start` | Open lease, TTL **90s** |
| `POST /beat` | Renew TTL |
| `POST /done` | Close immediately, `status` from body |
| No beat for 90s | **Lease expires on its own.** Run closes with `status: "stale"` |

`PostToolUse` is the heartbeat and it is free — an agent that is actually working calls
tools constantly; an agent sitting at a prompt does not.

**An expired lease is a normal outcome, not an error.** Ship it as such: no error toast, no
red state. The ledger's resting state is honest.

**Ask yourself before moving on:** if the machine hard-powers-off mid-run, what is the state
on next launch? Correct answer: no lease exists, because leases live in memory only and are
never persisted. If you find yourself persisting leases, stop — you have reintroduced the
bug in a durable form.

---

### T2 — Suppression needs its own flag

`setIdleDetectionEnabled` already exists and is tempting to reuse. It is wrong.

[`DesktopShell.tsx:511`](../src/components/DesktopShell.tsx#L511) re-asserts it from the
`autoPauseOnIdle` preference whenever that effect re-runs. If an agent lease turned detection
off, any unrelated preference re-render flips it back on **mid-agent-run**, and the user gets
an idle card for work they were supervising. Intermittent, unreproducible, blamed on
something else.

Two independent reasons must be two independent flags:

```rust
// lib.rs — near IDLE_DETECTION_ENABLED
static AGENT_LEASE_ACTIVE: AtomicBool = AtomicBool::new(false);
static AGENT_LEASE_ENDED_AT: AtomicU64 = AtomicU64::new(0); // unix secs

// inside the poll loop, before reading the idle counter
if !IDLE_DETECTION_ENABLED.load(Ordering::Relaxed)
    || AGENT_LEASE_ACTIVE.load(Ordering::Relaxed)
{
    // Suppressing mid-idle must not later read as a return.
    IDLE_NOTIFIED.store(false, Ordering::Relaxed);
    LAST_IDLE_SECS.store(0, Ordering::Relaxed);
    continue;
}
```

The two `store` calls are copied from the existing disable path at `lib.rs:310` for the
reason stated in that comment. Do not drop them.

---

### T3 — The clamp, or the feature steals the time it was built to protect

Walk the scenario before you write the code:

1. User starts a timer, hands a task to Claude Code, walks away.
2. Agent works 40 minutes. Lease active, suppression on, timer keeps running. **Correct.**
3. Agent finishes. Lease closes. Suppression off.
4. User is still away for another **2 hours**.
5. Idle thread resumes. `GetLastInputInfo` reports **160 minutes** — the OS counter never
   stopped, because suppression only made *us* stop looking.
6. `pauseSessionForIdle` computes `idleStartedAt = now - idleSeconds`, reaching back to
   **before the agent run began**.
7. `durationAtIdleStart` rewinds `durationSeconds` past the agent stretch. Default answer
   `resume_trimmed` deletes it.

The feature deletes exactly the 40 minutes it existed to preserve, and it does so silently.

**Required fix** — clamp the reading at the source:

```rust
let now_secs = /* unix seconds */;
let lease_ended = AGENT_LEASE_ENDED_AT.load(Ordering::Relaxed);
let since_lease = if lease_ended == 0 { u64::MAX } else { now_secs.saturating_sub(lease_ended) };
let idle_secs = get_system_idle_seconds().min(since_lease);
```

Invariant, and it belongs in a test: **idle time can never be attributed to a stretch an
agent was demonstrably working through.**

`AGENT_LEASE_ENDED_AT` must be set on *every* path that closes a lease — `done`, TTL expiry,
and app shutdown. Missing the expiry path is the likely mistake, because that is the path
with no request to hang the code on.

---

### T4 — Never auto-start billable time from a background HTTP call

When `/start` arrives and **no session is running**, the tempting move is to start one. Do
not.

A timer that starts itself because a process on the machine made an HTTP call is the same
defect class as a timer that silently bills idle hours: the user discovers it at invoice
time, and by then they cannot reconstruct what was real. It also converts the bridge's local
attack surface from "annoying" into "fraudulent invoice."

**Required behavior:** record the run as an unclassified draft, reusing machinery that
already exists for precisely this shape of "you were doing *something*, tell me what" — see
the `save_as_draft` branch at [`idle-recovery.ts:120`](../src/lib/idle-recovery.ts#L120):

```ts
{
  taskId: "",
  projectId: "",
  billable: false,
  startedAt: run.startedAt,
  endedAt: run.endedAt,
  durationSeconds: /* run length */,
  paused: true,
  state: "draft",
  isDraft: true,
  notes: [],
  source: "agent_run",
  timelineVersion: TIMELINE_VERSION,
  updatedAt: now,
}
```

Time is **offered, never assumed**. One click assigns it to a task; ignoring it costs
nothing and bills nothing.

---

### T5 — Concurrency is a refcount, not a boolean

Two agents can run at once — a Claude Code session in one repo, a Codex run in another. A
boolean set by the first `start` and cleared by the first `done` **unsuppresses while the
second agent is still working.**

Keep a `HashMap<String /* runId */, Lease>` behind a `Mutex`. Derive the atomic:

```rust
AGENT_LEASE_ACTIVE.store(!leases.is_empty(), Ordering::Relaxed);
```

Set `AGENT_LEASE_ENDED_AT` only on the transition to empty — not on every individual close.
An agent finishing while another still runs has not ended the suppressed stretch.

---

### T6 — Idempotency: duplicate `start` and `done` must be safe

Hooks fire more than once. `SessionStart` can repeat on resume; a wrapper may retry a failed
POST; the user may run two agents that share a `runId` if the hook derives it badly.

- Duplicate `start` with the same `runId` → **renew the lease, do not open a second.**
- `done` for an unknown or already-closed `runId` → **200, no-op.** Not a 404, not an error.
- `beat` for an unknown `runId` → **200, no-op.** Do not implicitly create a lease from a
  beat; that resurrects runs the TTL deliberately killed.

This mirrors the idempotency already enforced on the ledger side by `isResolvable()`
([`idle-recovery.ts:80`](../src/lib/idle-recovery.ts#L80)) — read that comment, it explains
the same class of problem.

---

### T7 — Send the whole `agentSegments` array, every time

F2: the edge function merge is shallow. `{...currentData.data, ...body}` means a body
carrying one segment **replaces** the stored array of five.

Every write must send the full array read from current store state:

```ts
const agentSegments = [...(session.agentSegments ?? []), segment];
queueMutation("sessions", "update", id, { agentSegments } as Record<string, unknown>);
```

Never `{ agentSegments: [segment] }`. Never a partial or a diff.

---

### T8 — Ledger arithmetic goes in a pure module, not the store

`idle-recovery.ts` exists as a separate pure module for a stated reason — read its header
comment ([`idle-recovery.ts:1`](../src/lib/idle-recovery.ts#L1)):

> These four branches decide how much time gets billed, and burying that arithmetic inside a
> Zustand action makes the one thing that must be right the one thing that cannot be tested.

The same applies here. `src/lib/agent-runs.ts` must be **pure**: no store, no network, **no
`Date.now()`** — `now` is a parameter. F7 means vitest runs in `node` with no DOM, so a pure
module is also the only thing that is testable at all.

The store calls the pure module. The store does not do the arithmetic.

---

## 5. M0 — Bridge + lease (the bug fix)

Timer stops auto-pausing during agent work. Nothing persisted, nothing in the UI. Ships
alone.

### File allowlist

| File | Change |
|---|---|
| `src-tauri/Cargo.toml` | `+ tiny_http = "0.12"`, `+ rand = "0.8"` |
| `src-tauri/src/agent_bridge.rs` | **new** — server, auth, lease table, TTL sweep |
| `src-tauri/src/lib.rs` | `mod agent_bridge;` · two new atomics · gate + clamp in the poll loop · spawn bridge in `setup` |
| `scripts/agent-bridge/hook.mjs` | **new** — discovery + start/beat/done |
| `Docs/agent-hooks.md` | **new** — `.claude/settings.json` wiring, curl recipes |

Nothing in `src/` changes in M0. If you are editing a `.tsx` file, you have left the
milestone.

### Wire protocol

```
POST /v1/agent/start  { runId, agent, label?, cwd?, taskId? }  -> 200 { ok: true, leaseSeconds: 90 }
POST /v1/agent/beat   { runId }                                -> 200 { ok: true }
POST /v1/agent/done   { runId, status, summary? }              -> 200 { ok: true }
GET  /v1/health                                                -> 200 { ok: true, version }
```

`status`: `"ok" | "error" | "cancelled"`. Server-generated on TTL expiry: `"stale"`.

### Discovery file

Written on startup to the app data dir as `agent-bridge.json`:

```json
{ "port": 41999, "token": "<32 random bytes, hex>", "version": "1" }
```

Bind `127.0.0.1:41999`; on `EADDRINUSE` scan upward to 42010 and write the port actually
bound. Regenerate the token on every app launch — a stale token in a shell somewhere should
stop working, and hooks re-read the file each invocation anyway.

### Security requirements

This opens a listening socket that gates a billing ledger. All of these are required, not
best-effort.

| Control | Why |
|---|---|
| Bind `127.0.0.1` explicitly, never `0.0.0.0` | Otherwise the bridge is reachable from the whole LAN. |
| `Authorization: Bearer <token>` on all `/v1/agent/*` | Any local process can reach the port; only ones that can read the discovery file are authorized. |
| Constant-time token compare | A naive `==` on a short-circuiting comparison leaks the token to a local timing attack. |
| Reject any request carrying an `Origin` header | Browsers can issue cross-origin POSTs to localhost without preflight. A page the user visits must not be able to drive this. |
| Require `Content-Type: application/json` | Blocks simple-form CSRF, which cannot set this header. |
| Reject bodies over 8 KB | No parser to overrun. |
| Discovery file in the app data dir with a restrictive ACL | Not the repo, not shell history, not an env dump. **Windows: ACL via `icacls`-equivalent, not `chmod`** — a Unix permission call is a silent no-op here. |
| No read endpoints beyond `/v1/health`, which returns no session state | The bridge is write-only by design. |

Worst case on local token leak: an attacker suppresses idle detection and injects draft time
entries. Both are visible and correctable in the UI. Nothing reads user data back out.

### Implementation sketch

`tiny_http`'s API surface is **not** verified in this document — check the crate docs. The
structure and the invariants are what matter:

```rust
struct Lease { agent: String, label: Option<String>, task_id: Option<String>,
               started_at: u64, expires_at: u64 }

// One Mutex<HashMap<String, Lease>>, one server thread, one sweep thread (tick 5s).
// After ANY mutation of the map, in this order:
//   1. if map went non-empty -> AGENT_LEASE_ACTIVE = true
//   2. if map went empty     -> AGENT_LEASE_ENDED_AT = now_secs; AGENT_LEASE_ACTIVE = false
// Emit to the frontend on open and on close (done OR expiry):
//   app.emit("agent-run-started",  payload)
//   app.emit("agent-run-finished", payload)   // includes status, incl. "stale"
```

Use a monotonic base for TTL arithmetic (`Instant`) and wall-clock only for the timestamps
sent to the frontend. A user changing the system clock, or DST, must not extend or kill a
lease.

### Hook wiring (documented in `Docs/agent-hooks.md`)

| Claude Code hook | Call |
|---|---|
| `SessionStart` | `start` — `runId` from the session id, `label` from cwd basename |
| `PostToolUse` | `beat` |
| `Stop` | `done` with `status: "ok"` |
| `SubagentStop` | ignored in M0 — `PostToolUse` already carries the heartbeat |

`hook.mjs` must **fail silently and exit 0** when `agent-bridge.json` is missing or the app
is not running. A hook that breaks the user's agent because the time tracker is closed is a
worse bug than the one being fixed.

### Done when

- [ ] `npm run tauri:build` succeeds
- [ ] Timer running + 10-minute agent task with no keyboard input → **no idle recovery card**
- [ ] Kill the terminal mid-run → lease expires within 90s, idle detection resumes,
      `agent-run-finished` fires with `status: "stale"`
- [ ] Two concurrent agents → suppression persists until **both** close (T5)
- [ ] `curl` without the bearer token → **401**
- [ ] `curl` with an `Origin` header → **403**
- [ ] Clock-change during a lease does not extend or kill it

### Traps

- Adding `tokio`/`axum` (F8) — violates D7 and drags a runtime into a four-endpoint server.
- Putting the server inside `#[cfg(target_os = "windows")]`. Idle detection is Windows-only
  (F9); **the bridge is not.** Gate only the clamp and the poll-loop changes.
- Forgetting to set `AGENT_LEASE_ENDED_AT` on the **expiry** path (T3).
- Registering a Tauri command and not adding it to `invoke_handler` (F10) — runtime failure,
  not a compile error. M0 needs no new command, but M2 will.
- Editing `capabilities/*.json`. Not needed (F11).

---

## 6. M1 — Model, ledger writes, notification

### File allowlist

| File | Change |
|---|---|
| `src/lib/types.ts` | `AgentSegment`; `Session.agentSegments?`; `SessionSource \|= "agent_run"` |
| `src/lib/agent-runs.ts` | **new, pure** — segment/draft/clamp arithmetic |
| `src/lib/agent-runs.test.ts` | **new** — vitest |
| `src/lib/store-supabase.ts` | `agentRuns` live map; `beginAgentRun` / `endAgentRun` |
| `src/components/DesktopShell.tsx` | listen for the two events; deliver the notification |

### Types

```ts
/** A stretch of a session an AI agent was demonstrably working through. */
export interface AgentSegment {
  runId: string;
  agent: string;            // "claude-code" | "codex" | ...
  label?: string;           // "refactor sync-engine"
  startedAt: number;
  endedAt?: number;
  status: "running" | "ok" | "error" | "cancelled" | "stale";
}
```

`Session.agentSegments?: AgentSegment[]` rides the `data` JSONB payload (F1). Comment it the
way `pendingIdleRecovery` is commented at `types.ts:130`, so the next reader knows it is
payload-borne and not a column.

### `src/lib/agent-runs.ts` — pure, exported surface

```ts
export function openSegment(run: AgentRunStart, now: number): AgentSegment;
export function closeSegment(seg: AgentSegment, status: AgentSegment["status"], now: number): AgentSegment;
export function appendSegment(existing: AgentSegment[] | undefined, seg: AgentSegment): AgentSegment[];
export function draftFromRun(seg: AgentSegment, now: number): Omit<Session, "id"> | null;
export function describeRunFinish(seg: AgentSegment): string;
```

No store, no network, **no `Date.now()`** (T8). `appendSegment` must be idempotent on
`runId` — a duplicate open replaces rather than duplicates (T6). `draftFromRun` returns
`null` for runs under 60s; a 12-second agent call is not a billable draft and a stream of
them turns the drafts list into noise.

### Store actions

```ts
beginAgentRun: (run: AgentRunStart) => void;
endAgentRun:   (runId: string, status: AgentSegment["status"]) => void;
agentRuns: Record<string, AgentSegment>;  // live, in-memory only, NOT persisted
```

Branching, per D5/D6:

- **Active running session** → append the closed segment to `session.agentSegments`, send
  the **whole array** (T7), persist via the existing `isRemoteId(id) && isOnline()` /
  `queueMutation` pattern at `store-supabase.ts:1003`. Do not touch `durationSeconds` — the
  timer was never paused, so the time is already banked.
- **No active session** → `draftFromRun` → append as a new draft session. **Never start a
  timer** (T4).

`agentRuns` is in-memory (T1). Do not add it to `persist`, do not sync it, do not add a
sync entity (F14).

### Notification

Reuse the delivery path from `handleIdleResumed`
([`DesktopShell.tsx:234`](../src/components/DesktopShell.tsx#L234)) — pet first, native
notification when the overlay is hidden. Do not invent a third route.

```ts
const delivered = await petSignal({
  quote: describeRunFinish(seg),           // `Claude finished "refactor sync-engine" — 8m.`
  quoteKind: "chat",
  state: seg.status === "ok" ? "waving" : "failed",
  actions: [
    { label: "Log to task", action: "agentRunAssign",  payload: { runId: seg.runId } },
    { label: "Dismiss",     action: "agentRunDismiss", payload: { runId: seg.runId } },
  ],
});
if (!delivered) await showDesktopNotification("Agent finished", describeRunFinish(seg));
```

A failed or stale run **says so**. Silent failure is how a user learns to stop trusting a
notifier. `status: "stale"` reads as "Claude's run ended without reporting back — 22m
recorded," which is true and is not an error message.

### Tests — mirror `idle-recovery.test.ts`

Required cases, and they are the spec:

1. Segment opened then closed produces correct `startedAt`/`endedAt`/`status`.
2. Duplicate `runId` append does not duplicate (T6).
3. Run under 60s → `draftFromRun` returns `null`.
4. Run over 60s with no session → draft has `source: "agent_run"`, `isDraft: true`,
   `taskId: ""`.
5. **Clamp invariant (T3):** given a lease that ended at `t`, an idle reading longer than
   `now - t` is reduced to `now - t`.
6. Appending to a session with existing segments returns **all** of them (T7).

### Done when

- [ ] `npm test` green
- [ ] `npm run lint` clean
- [ ] `npm run build` succeeds
- [ ] Agent finishing during a live session → pet speaks, segment on the session, duration
      unchanged
- [ ] Agent finishing with no session → draft appears, **no timer started** (T4)
- [ ] Second segment on the same session → both present after reload (T7 / F2)

### Traps

- Importing `queueMutation` into `agent-runs.ts` — it is module-private (F5) and the module
  must stay pure (T8).
- Writing a component test. F7: node environment, no jsdom.
- Adding a migration for a `data` column. F4 — the ledger is already correct; the doc that
  said otherwise is gone. Do not chase it.
- Calling `Date.now()` inside `agent-runs.ts`.

---

## 7. M2 / M3 — deferred, specified only to fix the boundary

**M2 — visible state.** Running agents shown on `/timer`, in the mini widget, and in the pet
card `detail` line. Manual "AI running" toggle as the fallback for agents that cannot be
hooked (D1). New Tauri command → remember `invoke_handler` (F10). Icons come from
`src/components/ui/icon.tsx`; do not import an icon library.

**M3 — report attribution.** Human vs agent hours split in `/report` and on shared report
links, read from `agentSegments`. **No new tables** — M1's payload already carries it.

---

## 8. Verification gate — run before reporting completion

```bash
npm run lint
npm test
npm run build
npm run tauri:build      # M0 and any Rust change
```

Then grep your own diff for:

- hardcoded hex, `#000`, emojis in UI, `lucide-react`
- `Date.now()` in `src/lib/agent-runs.ts`
- `{ agentSegments: [` — a single-element write (T7)
- `tokio` / `axum` in `Cargo.toml` (F8)
- files outside the milestone's allowlist

Then answer these in your report. Each maps to a checkpoint; a wrong answer means the defect
is in the branch:

1. If the machine power-cuts mid-run, what is the lease state on next launch? *(T1)*
2. Which flag gates suppression, and why not `IDLE_DETECTION_ENABLED`? *(T2)*
3. Name every code path that sets `AGENT_LEASE_ENDED_AT`. *(T3)*
4. `/start` arrives with no session running — what gets written? *(T4)*
5. Two agents run; the first finishes. Is suppression still on? *(T5)*
6. Second segment on a session — what exactly goes in the PUT body? *(T7 / F2)*

---

## 9. Scope and escalation

**Out of scope. Do not build:**

- Agent orchestration. Kettles *observes* agents; it does not launch, queue, or supervise.
- Agent output capture. The bridge takes a label and a status — no transcripts, no diffs,
  no prompts.
- Auto-billing unattended agent time (D6/T4).
- A web bridge (D8).
- A new sync entity or a schema migration (F14, F1).

**Stop and ask** only if one of these is true — otherwise state your assumption in one line
and continue:

- A locked decision in §3 cannot be implemented without changing the ledger's meaning.
- `tiny_http` cannot satisfy the §5 security table, and the alternative needs an async
  runtime (D7 vs F8 conflict).
- A verified fact in §2 turns out to be false in the code you are reading. **The code wins —
  fix this document and say so.**

**Known open items, decided but worth instrumenting:**

- 90s TTL is a starting value, not a measurement. Log lease lifetimes in M0 and tune before
  M2.
- `SubagentStop` is ignored in M0. Revisit if long single-tool subagent runs trip the TTL.
- Whether M2 renders N concurrent segments or one merged span is a UI call, deferred.
