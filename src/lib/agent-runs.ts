/**
 * Agent-run ledger arithmetic.
 *
 * Kept out of the store on purpose — same reason as idle-recovery.ts: the
 * branches that decide what time is offered (segment vs draft) must be pure
 * and unit-tested. No store, no network, no `Date.now()`.
 */

import { formatDuration } from "./format";
import { TIMELINE_VERSION } from "./session-timeline";
import type { AgentSegment, Session } from "./types";

/** Minimum closed-run length (seconds) before we offer a draft. */
export const MIN_DRAFT_SECONDS = 60;

/** Synthetic runId for the in-app "AI running" toggle (M2). Matches Rust MANUAL_RUN_ID. */
export const MANUAL_AGENT_RUN_ID = "manual";

export interface AgentRunStart {
  runId: string;
  agent: string;
  label?: string;
  taskId?: string;
  /** Wall-clock ms. Prefer the bridge timestamp when present. */
  startedAt?: number;
}

export function openSegment(run: AgentRunStart, now: number): AgentSegment {
  return {
    runId: run.runId,
    agent: run.agent,
    label: run.label,
    startedAt: run.startedAt ?? now,
    status: "running",
  };
}

export function closeSegment(
  seg: AgentSegment,
  status: AgentSegment["status"],
  now: number
): AgentSegment {
  const closedStatus = status === "running" ? "ok" : status;
  return {
    ...seg,
    endedAt: now,
    status: closedStatus,
  };
}

/**
 * Append a closed (or still-running) segment. Idempotent on `runId` — a
 * duplicate replaces rather than doubles (T6). Always returns a full array so
 * callers can send the whole list on every write (T7 / F2).
 */
export function appendSegment(
  existing: AgentSegment[] | undefined,
  seg: AgentSegment
): AgentSegment[] {
  const list = existing ?? [];
  const idx = list.findIndex((s) => s.runId === seg.runId);
  if (idx === -1) return [...list, seg];
  const next = list.slice();
  next[idx] = seg;
  return next;
}

/**
 * Unclassified draft covering a finished agent run when no timer was running.
 * Returns null under 60s so short probes do not flood drafts.
 */
export function draftFromRun(
  seg: AgentSegment,
  now: number
): Omit<Session, "id"> | null {
  const endedAt = seg.endedAt ?? now;
  const startedAt = seg.startedAt;
  const durationSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
  if (durationSeconds < MIN_DRAFT_SECONDS) return null;

  return {
    taskId: "",
    projectId: "",
    billable: false,
    startedAt,
    endedAt,
    durationSeconds,
    paused: true,
    state: "draft",
    isDraft: true,
    notes: [],
    source: "agent_run",
    timelineVersion: TIMELINE_VERSION,
    updatedAt: now,
    agentSegments: [{ ...seg, endedAt, status: seg.status === "running" ? "ok" : seg.status }],
  };
}

// ─── M3: attribution ─────────────────────────────────────────────────────────

/**
 * Union of the agent segments inside a session, in seconds.
 *
 * Two agents running at once is one stretch of supervised time, not two, so
 * overlapping segments are merged before summing — otherwise a session could
 * report more agent time than it has time. Segments are clamped to the
 * session's own window: a run that outlived the timer only counts for the part
 * that overlapped it, and an unclosed run counts to the session's end.
 *
 * Result never exceeds `durationSeconds` — the ledger's wall clock can be wider
 * than its billed duration (pauses), and attribution must not exceed the total
 * it is being split out of.
 */
export function agentSecondsIn(session: Session): number {
  const segs = session.agentSegments;
  if (!segs?.length) return 0;

  const total = Math.max(0, session.durationSeconds ?? 0);
  if (total === 0) return 0;

  const windowStart = session.startedAt;
  const windowEnd = session.endedAt ?? session.frozenAt ?? Infinity;

  const spans = segs
    .map((seg) => ({
      start: Math.max(seg.startedAt, windowStart),
      end: Math.min(seg.endedAt ?? windowEnd, windowEnd),
    }))
    .filter((sp) => Number.isFinite(sp.start) && Number.isFinite(sp.end) && sp.end > sp.start)
    .sort((a, b) => a.start - b.start);

  if (!spans.length) return 0;

  let merged = 0;
  let cur = spans[0];
  for (const sp of spans.slice(1)) {
    if (sp.start <= cur.end) {
      cur = { start: cur.start, end: Math.max(cur.end, sp.end) };
    } else {
      merged += cur.end - cur.start;
      cur = sp;
    }
  }
  merged += cur.end - cur.start;

  return Math.min(total, Math.floor(merged / 1000));
}

export interface AgentSplit {
  /** Seconds with at least one agent running. */
  agentSeconds: number;
  /** Seconds worked with no agent running. */
  soloSeconds: number;
  /** Share of the total that was supervised, 0–100. */
  agentPct: number;
}

/** Split one session's billed duration into supervised vs solo. */
export function splitSessionTime(session: Session): AgentSplit {
  const total = Math.max(0, session.durationSeconds ?? 0);
  const agentSeconds = agentSecondsIn(session);
  return {
    agentSeconds,
    soloSeconds: Math.max(0, total - agentSeconds),
    agentPct: total > 0 ? (agentSeconds / total) * 100 : 0,
  };
}

/** Distinct agents that touched a session, as display names, in first-seen order. */
export function agentNamesIn(session: Session): string[] {
  const seen = new Set<string>();
  for (const seg of session.agentSegments ?? []) {
    seen.add(agentDisplayName(seg.agent));
  }
  return Array.from(seen);
}

/** Pretty agent label for pet copy. */
export function agentDisplayName(agent: string): string {
  const map: Record<string, string> = {
    "claude-code": "Claude",
    claude: "Claude",
    codex: "Codex",
    cursor: "Cursor",
    grok: "Grok",
    manual: "AI",
  };
  return map[agent] ?? agent;
}

/** Live segments from the in-memory agentRuns map, oldest first. */
export function listLiveAgents(
  agentRuns: Record<string, AgentSegment>
): AgentSegment[] {
  return Object.values(agentRuns).filter((s) => s.status === "running");
}

/** Live agents from hooks/bridge only — excludes the manual toggle lease. */
export function listDetectedAgents(
  agentRuns: Record<string, AgentSegment>
): AgentSegment[] {
  return listLiveAgents(agentRuns).filter(
    (s) => s.runId !== MANUAL_AGENT_RUN_ID && s.agent !== "manual"
  );
}

export function isManualAgentActive(
  agentRuns: Record<string, AgentSegment>
): boolean {
  return agentRuns[MANUAL_AGENT_RUN_ID]?.status === "running";
}

/** One row per concurrent run, for surfaces that show them side by side. */
export interface LiveAgentLine {
  runId: string;
  agent: string;
  /** "Claude", "Codex" — display name, not the raw agent id. */
  name: string;
  label?: string;
  startedAt: number;
  elapsedSeconds: number;
  manual: boolean;
}

/**
 * Every live run as its own row, oldest first — the deferred M2 UI call
 * (§7: "N concurrent segments or one merged span"), resolved as N.
 *
 * Merged reads fine at a glance and lies under concurrency: two agents in two
 * repos are two spans of billable supervision with different clocks, and one
 * of them finishing is not the end of the stretch. Ordering is by `startedAt`
 * so a row does not jump position when another run ends.
 */
export function listLiveAgentLines(
  agentRuns: Record<string, AgentSegment>,
  now: number
): LiveAgentLine[] {
  return listLiveAgents(agentRuns)
    .slice()
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((r) => ({
      runId: r.runId,
      agent: r.agent,
      name: agentDisplayName(r.agent),
      label: r.label,
      startedAt: r.startedAt,
      elapsedSeconds: Math.max(0, Math.floor((now - r.startedAt) / 1000)),
      manual: r.runId === MANUAL_AGENT_RUN_ID || r.agent === "manual",
    }));
}

/**
 * One-line summary for timer / mini / pet detail.
 * Concurrent runs: count, not N separate chips (M2 UI call — plan deferred merge).
 * Prefers hook-detected agents; falls back to manual only if that is all there is.
 */
export function summarizeLiveAgents(
  agentRuns: Record<string, AgentSegment>
): string {
  const detected = listDetectedAgents(agentRuns);
  const live = detected.length > 0 ? detected : listLiveAgents(agentRuns);
  if (live.length === 0) return "";
  if (live.length === 1) {
    const r = live[0];
    const name = agentDisplayName(r.agent);
    if (r.agent === "manual") return "AI running";
    return r.label ? `${name}: ${r.label}` : `${name} running`;
  }
  const names = Array.from(
    new Set(live.map((r) => agentDisplayName(r.agent)))
  );
  if (names.length <= 2) return `${names.join(" + ")} running`;
  return `${live.length} agents running`;
}

/**
 * Every live run on one line, each with its own clock — for the pet card and
 * mini widget, where a list is not an option but "2 agents running" loses the
 * detail that makes it actionable.
 *
 * Capped at three: past that the line stops being readable at overlay size,
 * and the count carries the rest rather than truncating silently.
 */
export function describeLiveAgents(
  agentRuns: Record<string, AgentSegment>,
  now: number,
  max = 3
): string {
  const lines = listLiveAgentLines(agentRuns, now);
  if (lines.length === 0) return "";
  const shown = lines.slice(0, max).map((l) => {
    const what = l.label ? `${l.name}: ${l.label}` : l.name;
    return l.elapsedSeconds > 0 ? `${what} ${formatDuration(l.elapsedSeconds)}` : what;
  });
  const rest = lines.length - shown.length;
  return rest > 0 ? `${shown.join(" · ")} · +${rest} more` : shown.join(" · ");
}

/**
 * What the pet says when a run finishes.
 * Failed/stale must say so — silent failure trains users to ignore the notifier.
 */
export function describeRunFinish(seg: AgentSegment, now?: number): string {
  const name = agentDisplayName(seg.agent);
  const label = seg.label ? `"${seg.label}"` : "a run";
  const end = seg.endedAt ?? now ?? seg.startedAt;
  const secs = Math.max(0, Math.floor((end - seg.startedAt) / 1000));
  const dur = formatDuration(secs);

  switch (seg.status) {
    case "error":
      return `${name} hit an error on ${label} — ${dur} recorded.`;
    case "cancelled":
      return `${name} cancelled ${label} — ${dur} recorded.`;
    case "stale":
      return `${name}'s run ended without reporting back — ${dur} recorded.`;
    case "ok":
    case "running":
    default:
      return `${name} finished ${label} — ${dur}.`;
  }
}

/**
 * Clamp an OS idle reading so it cannot reach back through a closed lease (T3).
 * Mirrors the Rust idle-thread clamp; pure so the invariant is unit-tested.
 *
 * @param osIdleSecs — GetLastInputInfo (or equivalent) reading
 * @param leaseEndedAtUnixSecs — unix seconds when the last lease went empty; 0 = never
 * @param nowUnixSecs — current unix seconds
 */
export function clampIdleSeconds(
  osIdleSecs: number,
  leaseEndedAtUnixSecs: number,
  nowUnixSecs: number
): number {
  if (leaseEndedAtUnixSecs === 0) return osIdleSecs;
  const sinceLease = Math.max(0, nowUnixSecs - leaseEndedAtUnixSecs);
  return Math.min(osIdleSecs, sinceLease);
}

/** Bridge may send unix seconds; session ledger uses ms. */
export function toMillis(ts: number): number {
  // < 1e12 ≈ year 2001 in ms, or year ~33658 in seconds — treat as seconds.
  return ts > 0 && ts < 1e12 ? ts * 1000 : ts;
}
