/**
 * Deterministic pet intelligence.
 *
 * The pet used to pick from a hardcoded list of motivational strings on a timer
 * (`runningMsgs` / `idleMsgs` in DesktopShell). Those messages carried no
 * information, so the only thing they could do was train the user to ignore the
 * overlay. This module replaces them: the pet speaks when the ledger is about to
 * become wrong, and stays silent otherwise.
 *
 * Nothing here is AI. It is product logic over data the store already holds.
 *
 * Pure functions only — no store, no network, no `Date.now()`. Every
 * time-dependent input (`now`, `dayStartMs`, `minuteOfDay`, `dateKey`) is passed
 * in so quiet hours and day boundaries are testable without mocking the clock or
 * the host timezone. Use `localDayParts()` at the call site to build them.
 */

import { formatDuration } from "./format";
import { resolveHourlyRate } from "./rates";
import { elapsedSecondsFor } from "./session-timeline";
import type { PetAction, PetAnimationState as OverlayPetAnimationState } from "./pet";
import type { Client, Project, Session, Task } from "./types";

// ---------------------------------------------------------------------------
// Animation vocabulary
// ---------------------------------------------------------------------------

/**
 * Shared overlay state vocabulary. The v2 look cells remain renderer-owned;
 * the host only requests named standard animation states.
 */
export type PetAnimationState = OverlayPetAnimationState;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** Effort recorded against a single task, split by how trustworthy each part is. */
export interface TaskActuals {
  /** Billed and billable-ready time. */
  confirmedSeconds: number;
  /** Classified but unconfirmed time. */
  draftSeconds: number;
  /** The live session's elapsed time, counted once. */
  activeSeconds: number;
  /**
   * confirmed + draft + active. The estimate coach uses this rather than
   * `confirmedSeconds`: overrun is a planning signal, and warning only after the
   * user confirms means warning after the time is already spent.
   */
  observedSeconds: number;
  /** Sessions for this task whose `startedAt` falls inside the local day. */
  sessionsStartedToday: number;
  /** Sessions for this task confirmed during the local day. */
  confirmedToday: number;
}

export interface PetContextInput {
  now: number;
  /** Local midnight in ms — the boundary for every "today" figure. */
  dayStartMs: number;
  /** Local minutes since midnight, 0-1439. Drives quiet hours. */
  minuteOfDay: number;
  /** Local `YYYY-MM-DD`. Scopes the per-day intervention budget. */
  dateKey: string;
  activeSessionId: string | null;
  sessions: Session[];
  tasks: Task[];
  projects: Project[];
  clients: Client[];
  /** Optional because existing pure callers default to intelligence enabled. */
  petIntelligenceEnabled?: boolean;
}

export interface PetContext {
  now: number;
  dateKey: string;
  minuteOfDay: number;

  activeSessionId: string | null;
  activeTaskId: string | null;
  activeTaskTitle: string | null;
  activeProjectId: string | null;
  activeProjectName: string | null;
  /** Elapsed seconds on the live session only. */
  activeSessionSeconds: number;

  todayConfirmedSeconds: number;
  todayBillableSeconds: number;
  todayDraftSeconds: number;
  /** Sessions still needing classification or confirmation. */
  draftCount: number;
  /** Drafts unresolved for 30 minutes or carried across local midnight. */
  staleDraftCount: number;
  /** Recorded duration across stale drafts. */
  staleDraftSeconds: number;
  /**
   * Stable identity of the oldest stale draft.
   *
   * Based on startedAt instead of the entity id so a local→remote id remap does
   * not make the same untouched draft appear new.
   */
  oldestStaleDraftKey: string | null;

  taskActuals: TaskActuals | null;
  /** Task-level estimate in seconds. `null` when the task carries no usable estimate. */
  taskEstimateSeconds: number | null;
  /** `observedSeconds / taskEstimateSeconds`, or `null` when there is no estimate. */
  taskEstimateRatio: number | null;

  /** True when the live session is billable but no project or client rate resolves. */
  missingRateOnBillable: boolean;

  projectDaysRemaining: number | null;
  /** True while the live session is actually accruing time. */
  activeSessionRunning: boolean;
}

// ---------------------------------------------------------------------------
// Interventions
// ---------------------------------------------------------------------------

export type PetInterventionKind =
  | "missing_rate"
  | "estimate_overrun"
  | "stale_drafts"
  | "estimate_warning";

export type PetInterventionSeverity = "info" | "warning" | "risk";

export interface PetIntervention {
  /** Stable identity for per-day deduplication. */
  key: string;
  kind: PetInterventionKind;
  severity: PetInterventionSeverity;
  state: PetAnimationState;
  quote: string;
  actions?: PetAction[];
}

export interface ChannelBudget {
  maxPerDay: number;
  minimumGapMs: number;
}

export interface PetInterventionPolicy {
  enabled: boolean;
  channels: Record<PetInterventionSeverity, ChannelBudget>;
  /**
   * Severities exempt from channel budgets. A flat "three per day" cap lets two
   * low-value messages suppress the one that says the money is wrong, so risk
   * bypasses the budget. It still obeys quiet hours and the per-key daily
   * cooldown, so it cannot repeat.
   */
  bypassBudget: PetInterventionSeverity[];
  /**
   * Floor on the gap between any two messages, applied even to severities that
   * bypass their channel budget.
   *
   * Without it, two risk candidates fire on consecutive one-second ticks: the
   * first is marked shown, the second immediately replaces it on screen, and the
   * first is suppressed for the rest of the day having been visible for one
   * second. Bypassing the daily quota is the point; bypassing the collision gap
   * is a bug.
   */
  collisionGapMs: number;
  /** Local `HH:MM`. A window crossing midnight is supported. */
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface PetInterventionRecord {
  key: string;
  kind: PetInterventionKind;
  severity: PetInterventionSeverity;
  shownAt: number;
  dateKey: string;
  outcome?: "acted" | "dismissed" | "expired";
  respondedAt?: number;
}

export const DEFAULT_PET_POLICY: PetInterventionPolicy = {
  enabled: true,
  channels: {
    risk: { maxPerDay: 3, minimumGapMs: 15 * 60_000 },
    warning: { maxPerDay: 2, minimumGapMs: 30 * 60_000 },
    info: { maxPerDay: 1, minimumGapMs: 60 * 60_000 },
  },
  bypassBudget: ["risk"],
  collisionGapMs: 2 * 60_000,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

/** Warn once the task passes this share of its estimate. */
export const ESTIMATE_WARNING_RATIO = 0.8;
/** Escalate once the task passes this share of its estimate. */
export const ESTIMATE_OVERRUN_RATIO = 1.25;
/**
 * A missing rate is only raised near the start of a session. Interrupting an
 * hour into focus to report a setup problem is noise; catching it at the action
 * boundary is a correction the user can act on.
 */
export const MISSING_RATE_GRACE_SECONDS = 5 * 60;
/** A same-day draft becomes ledger debt after this long unresolved. */
export const STALE_DRAFT_AFTER_MS = 30 * 60_000;

const HISTORY_MAX_RECORDS = 100;
const HISTORY_MAX_AGE_MS = 7 * 24 * 60 * 60_000;

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

/**
 * Local day boundaries for a timestamp. The only timezone-dependent function
 * here — call it once at the edge and pass the result into `derivePetContext()`.
 */
export function localDayParts(now: number): {
  dayStartMs: number;
  minuteOfDay: number;
  dateKey: string;
} {
  const d = new Date(now);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    dayStartMs: dayStart.getTime(),
    minuteOfDay: d.getHours() * 60 + d.getMinutes(),
    dateKey: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  };
}

/** `"HH:MM"` to minutes since midnight. Returns `null` for unparseable input. */
export function parseClockMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Quiet-hours test that handles a window crossing midnight (22:00 → 08:00). */
export function inQuietHours(
  minuteOfDay: number,
  start: string,
  end: string
): boolean {
  const from = parseClockMinutes(start);
  const to = parseClockMinutes(end);
  // An unparseable window must not silence the pet forever.
  if (from == null || to == null || from === to) return false;
  return from < to
    ? minuteOfDay >= from && minuteOfDay < to
    : minuteOfDay >= from || minuteOfDay < to;
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

function positiveEstimateSeconds(minutes: unknown): number | null {
  const num = typeof minutes === "string" ? Number(minutes) : minutes;
  if (typeof num !== "number" || !Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 60);
}

function sessionSeconds(session: Session, activeSessionId: string | null, now: number): number {
  if (session.id !== activeSessionId) return Math.max(0, session.durationSeconds ?? 0);
  // `elapsedSecondsFor` keys off `state` alone. A transitional row can carry
  // `state: "running"` with `paused: true` while a pause call is in flight, and
  // accruing time there would drift against what the timer UI shows.
  if (session.paused === true) return Math.max(0, session.durationSeconds ?? 0);
  return Math.max(0, elapsedSecondsFor(session, now));
}

/**
 * Effort recorded against one task, in a single pass keyed by session id.
 *
 * States are mutually exclusive, so a session is counted exactly once.
 * `discarded` never counts. A `running`/`paused`/`finishing` row that is not the
 * active session is a leftover from a crash or a stale device and is skipped —
 * counting it would inflate the task by however long that row has been open.
 */
export function taskActuals(
  sessions: Session[],
  taskId: string,
  activeSessionId: string | null,
  now: number,
  dayStartMs: number
): TaskActuals {
  const actuals: TaskActuals = {
    confirmedSeconds: 0,
    draftSeconds: 0,
    activeSeconds: 0,
    observedSeconds: 0,
    sessionsStartedToday: 0,
    confirmedToday: 0,
  };
  if (!taskId) return actuals;

  const seen = new Set<string>();
  for (const session of sessions) {
    if (session.taskId !== taskId) continue;
    if (seen.has(session.id)) continue;
    seen.add(session.id);

    const state = session.state ?? (session.endedAt ? "confirmed" : "running");
    if (state === "discarded") continue;

    const seconds = sessionSeconds(session, activeSessionId, now);

    if (state === "confirmed") {
      actuals.confirmedSeconds += seconds;
      if ((session.endedAt ?? session.startedAt) >= dayStartMs) actuals.confirmedToday += 1;
    } else if (state === "draft") {
      actuals.draftSeconds += seconds;
    } else if (session.id === activeSessionId) {
      actuals.activeSeconds += seconds;
    } else {
      continue; // stale open row — not evidence of work
    }

    if (session.startedAt >= dayStartMs) actuals.sessionsStartedToday += 1;
  }

  actuals.observedSeconds =
    actuals.confirmedSeconds + actuals.draftSeconds + actuals.activeSeconds;
  return actuals;
}

/**
 * Lifetime billable earnings against the project's dollar budget, as a
 * percentage.
 *
 * Deliberately not part of `PetContext`. It scans every session, and nothing
 * consumes it yet — no budget intervention ships until sessions carry rate
 * snapshots, because earnings recompute from the project's *current* rate and a
 * warning built on that is rewritten the moment a rate is edited. Kept and
 * tested here so the milestone that needs it has a verified starting point.
 */
export function projectBudgetUsedPct(
  sessions: Session[],
  project: Project | undefined,
  clients: Client[]
): number | null {
  // `Project.budget` is dollars — see the "Project budget in dollars" input in
  // ProjectBillingSection and the cents/100 division in report/data.ts.
  const budget = project?.budget;
  if (!project || typeof budget !== "number" || !Number.isFinite(budget) || budget <= 0) {
    return null;
  }
  const client = clients.find((c) => c.id === project.clientId);
  const rate = resolveHourlyRate(project, client);
  if (rate.dollarsPerHour <= 0) return null;

  let billableSeconds = 0;
  for (const session of sessions) {
    if (session.projectId !== project.id) continue;
    if (!session.billable) continue;
    if ((session.state ?? "confirmed") !== "confirmed") continue;
    billableSeconds += Math.max(0, session.durationSeconds ?? 0);
  }
  const earnedDollars = rate.dollarsPerHour * (billableSeconds / 3600);
  return (earnedDollars / budget) * 100;
}

export function derivePetContext(input: PetContextInput): PetContext {
  const { now, dayStartMs, minuteOfDay, dateKey, activeSessionId, sessions, tasks, projects, clients } =
    input;

  const activeSession = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId) ?? null
    : null;
  const activeTaskId = activeSession?.taskId || null;
  const activeProjectId = activeSession?.projectId || null;
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null;
  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId) ?? null
    : null;

  let todayConfirmedSeconds = 0;
  let todayBillableSeconds = 0;
  let todayDraftSeconds = 0;
  let draftCount = 0;
  let staleDraftCount = 0;
  let staleDraftSeconds = 0;
  let oldestStaleDraftSince = Number.POSITIVE_INFINITY;
  let oldestStaleDraftKey: string | null = null;

  for (const session of sessions) {
    const state = session.state ?? (session.endedAt ? "confirmed" : "running");
    if (state === "discarded") continue;
    const seconds = sessionSeconds(session, activeSessionId, now);

    if (state === "draft") {
      // Only an explicit `state:"draft"` counts. `startDraftSession()` creates
      // an active `state:"running", isDraft:true` session; warning about that
      // would treat legitimate unclassified live tracking as abandoned work.
      draftCount += 1;
      if (session.startedAt >= dayStartMs) todayDraftSeconds += seconds;

      // saveSessionAsDraft() stamps frozenAt, which is the truthful start of the
      // unresolved period. The fallbacks cover legacy rows.
      const unresolvedSince =
        session.frozenAt ??
        session.endedAt ??
        session.updatedAt ??
        session.startedAt;
      const isStale =
        Number.isFinite(unresolvedSince) &&
        (
          now - unresolvedSince >= STALE_DRAFT_AFTER_MS ||
          unresolvedSince < dayStartMs
        );

      if (isStale) {
        staleDraftCount += 1;
        staleDraftSeconds += seconds;

        if (unresolvedSince < oldestStaleDraftSince) {
          oldestStaleDraftSince = unresolvedSince;
          oldestStaleDraftKey = Number.isFinite(session.startedAt)
            ? String(session.startedAt)
            : session.id;
        }
      }
      continue;
    }
    if (state !== "confirmed") continue;
    if ((session.endedAt ?? session.startedAt) < dayStartMs) continue;

    todayConfirmedSeconds += seconds;
    if (session.billable) todayBillableSeconds += seconds;
  }

  const actuals = activeTaskId
    ? taskActuals(sessions, activeTaskId, activeSessionId, now, dayStartMs)
    : null;

  // The task estimate is authoritative for total-task overrun. A session's own
  // `estimateMinutes` is a Pomodoro target: extending one must not silently
  // redefine how long the whole task was supposed to take.
  const taskEstimateSeconds = positiveEstimateSeconds(activeTask?.estimateMinutes);
  const taskEstimateRatio =
    actuals && taskEstimateSeconds ? actuals.observedSeconds / taskEstimateSeconds : null;

  const activeClient = activeProject
    ? clients.find((c) => c.id === activeProject.clientId)
    : undefined;
  const missingRateOnBillable =
    !!activeSession &&
    activeSession.billable === true &&
    resolveHourlyRate(activeProject, activeClient).source === "none";

  const projectDaysRemaining =
    activeProject?.endDate && Number.isFinite(activeProject.endDate)
      ? Math.ceil((activeProject.endDate - now) / 86_400_000)
      : null;

  return {
    now,
    dateKey,
    minuteOfDay,
    activeSessionId: activeSessionId ?? null,
    activeTaskId,
    activeTaskTitle: activeTask?.title ?? null,
    activeProjectId,
    activeProjectName: activeProject?.name ?? null,
    activeSessionSeconds: activeSession ? Math.max(0, elapsedSecondsFor(activeSession, now)) : 0,
    todayConfirmedSeconds,
    todayBillableSeconds,
    todayDraftSeconds,
    draftCount,
    staleDraftCount,
    staleDraftSeconds,
    oldestStaleDraftKey,
    taskActuals: actuals,
    taskEstimateSeconds,
    taskEstimateRatio,
    missingRateOnBillable,
    projectDaysRemaining,
    activeSessionRunning:
      !!activeSession && activeSession.state === "running" && activeSession.paused !== true,
  };
}

function activeTasksForCoverage(tasks: Task[]): Task[] {
  return tasks.filter(
    (task) =>
      task.status !== "done" &&
      task.archived !== true &&
      task.deletedAt == null
  );
}

/**
 * Passive explanation of what the pet can currently evaluate.
 *
 * This is user-requested status, not an intervention: callers must not record
 * it in intervention history or pass it through intervention rate limits.
 */
export function describePetCoverage(
  ctx: PetContext,
  input: PetContextInput
): string {
  if (input.petIntelligenceEnabled === false) return "Warnings are off.";
  if (!ctx.activeSessionId) return "Not tracking anything.";

  const activeTasks = activeTasksForCoverage(input.tasks);
  const withEstimates = activeTasks.filter(
    (task) => positiveEstimateSeconds(task.estimateMinutes) != null
  ).length;

  // Two clauses, never more. The bubble is 300px wide — the four-clause version
  // this replaced wrapped to three lines and read as a wall.
  const status = candidateInterventions(ctx).length > 0
    ? "Something needs review"
    : !ctx.activeTaskId
      ? "No task on this session"
      : ctx.taskEstimateSeconds == null
        ? `No estimate on ${ctx.activeTaskTitle ?? "this task"}`
        : "All clear";

  return `${status}. Estimates on ${withEstimates}/${activeTasks.length} tasks.`;
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * Minutes for display.
 *
 * Time spent rounds up and the estimate rounds down, so the printed numbers can
 * never contradict the threshold that produced them. Rounding both to nearest
 * turns 75s against a 60s estimate — a genuine 125% overrun — into the sentence
 * "1m against a 1m estimate".
 */
function spentMinutes(seconds: number): number {
  return Math.ceil(seconds / 60);
}

function plannedMinutes(seconds: number): number {
  return Math.max(1, Math.floor(seconds / 60));
}

/**
 * One-click re-estimation is explicit in the chip label. The next five-minute
 * boundary strictly above observed time provides a small amount of headroom
 * without silently rewriting the session target.
 */
/**
 * Pick one phrasing from a set, keyed off the intervention's own identity.
 *
 * Deliberately not random. The same warning about the same task must read the
 * same way every time it appears — a message that rewords itself looks like a
 * different problem. Different tasks get different phrasings, which is enough
 * to stop the pet sounding like one canned alert on a loop.
 */
function phrasingFor<T>(key: string, options: readonly T[]): T {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return options[Math.abs(hash) % options.length];
}

function nextEstimateMinutes(observedSeconds: number): number {
  const observedMinutes = spentMinutes(observedSeconds);
  return Math.max(5, Math.ceil((observedMinutes + 1) / 5) * 5);
}

/**
 * Every intervention the current context justifies, highest priority first.
 *
 * Exported for testing: the ordering is the product decision, and it should be
 * assertable without going through the whole budget machinery.
 */
export function candidateInterventions(ctx: PetContext): PetIntervention[] {
  const candidates: PetIntervention[] = [];

  // 1. The money is wrong right now, and it is wrong for every second that
  //    passes. Nothing outranks this.
  //
  //    A billable session with no project at all has the same problem and no
  //    project to key on, so it falls back to the session id.
  //
  //    Only while the clock is actually running. A paused session is not
  //    accruing anything to misprice, and a paused one that never passes the
  //    grace window would otherwise re-raise this every single day.
  if (
    ctx.missingRateOnBillable &&
    ctx.activeSessionRunning &&
    ctx.activeSessionSeconds <= MISSING_RATE_GRACE_SECONDS
  ) {
    const subject = ctx.activeProjectId
      ? `${ctx.activeProjectName ?? "This project"} is billable but has no rate`
      : "This billable session has no project, so no rate applies";
    candidates.push({
      key: `missing_rate:${ctx.activeProjectId ?? ctx.activeSessionId ?? "none"}`,
      kind: "missing_rate",
      severity: "risk",
      state: "review",
      // Not "logs at $0" — earnings are recomputed from the current rate, so
      // setting one later does fill this time in. Only the display is zero now.
      quote: `${subject}. Earnings show $0 until you set one.`,
    });
  }

  const ratio = ctx.taskEstimateRatio;
  const actuals = ctx.taskActuals;
  const estimateSeconds = ctx.taskEstimateSeconds;

  if (
    ratio != null &&
    actuals &&
    estimateSeconds &&
    ctx.activeTaskId &&
    ratio >= ESTIMATE_OVERRUN_RATIO
  ) {
    const title = ctx.activeTaskTitle ?? "This task";
    const spent = spentMinutes(actuals.observedSeconds);
    const planned = plannedMinutes(estimateSeconds);
    const key = `estimate_overrun:${ctx.activeTaskId}`;
    const suggestedEstimate = nextEstimateMinutes(actuals.observedSeconds);

    // 2. Past the point where the estimate is recoverable. State the gap and
    //    let the user decide — no guilt, no performance judgment.
    //
    //    No "Extend": extending moves the *session* target, which is not the
    //    thing that is wrong. The task estimate is.
    candidates.push({
      key,
      kind: "estimate_overrun",
      severity: "risk",
      state: "review",
      // No "worth re-estimating" — the chip below already offers exactly that,
      // so the sentence only needs to carry the number.
      quote: phrasingFor(key, [
        `${title} is at ${spent}m against a ${planned}m estimate.`,
        `${title}: ${spent}m spent, ${planned}m planned.`,
        `${spent}m on ${title}. The estimate was ${planned}m.`,
      ]),
      actions: [
        {
          label: "Finish session",
          action: "finishEstimateSession",
          payload: { interventionKey: key },
        },
        {
          label: `Re-estimate to ${suggestedEstimate}m`,
          action: "reestimateTask",
          payload: {
            taskId: ctx.activeTaskId,
            estimateMinutes: suggestedEstimate,
            interventionKey: key,
          },
        },
        {
          label: "Dismiss today",
          action: "dismissPetIntervention",
          payload: { interventionKey: key },
        },
      ],
    });
  }

  if (ctx.staleDraftCount > 0 && ctx.oldestStaleDraftKey) {
    const count = ctx.staleDraftCount;
    // formatDuration everywhere, so "47m" and "1h 5m" never sit next to a
    // hand-rolled "47 minutes" in the same bubble.
    const spent = formatDuration(ctx.staleDraftSeconds);

    // 3. Already-recorded time awaiting review outranks an early estimate
    //    warning, but it is "warning", not "risk": the clock is no longer
    //    accruing and this must not bypass the interruption quota.
    //
    //    The oldest draft anchors the key across local dates. The same untouched
    //    draft therefore cannot re-fire every morning; resolving it advances the
    //    anchor to the next unresolved draft.
    candidates.push({
      key: `stale_drafts:${ctx.oldestStaleDraftKey}`,
      kind: "stale_drafts",
      severity: "warning",
      state: "review",
      quote: `${count} ${count === 1 ? "session" : "sessions"} waiting for review. ${spent} unclassified.`,
    });
  }

  if (
    ratio != null &&
    actuals &&
    estimateSeconds &&
    ctx.activeTaskId &&
    ratio >= ESTIMATE_WARNING_RATIO &&
    ratio < ESTIMATE_OVERRUN_RATIO
  ) {
    const title = ctx.activeTaskTitle ?? "This task";
    const spent = spentMinutes(actuals.observedSeconds);
    const planned = plannedMinutes(estimateSeconds);
    const key = `estimate_warning:${ctx.activeTaskId}`;

    // 4. Still recoverable — one factual heads-up, once per task per day.
    candidates.push({
      key,
      kind: "estimate_warning",
      severity: "warning",
      state: "review",
      quote: phrasingFor(key, [
        `${Math.max(0, planned - spent)}m left on the ${planned}m estimate for ${title}.`,
        `${title} has ${Math.max(0, planned - spent)}m left of ${planned}m.`,
      ]),
      actions: [
        {
          label: "Finish session",
          action: "finishEstimateSession",
          payload: { interventionKey: key },
        },
        {
          label: "Dismiss today",
          action: "dismissPetIntervention",
          payload: { interventionKey: key },
        },
      ],
    });
  }

  return candidates;
}

/**
 * The single intervention the pet may show right now, or `null` for silence.
 *
 * Silence is the default and the common case. Every gate below exists to make
 * the pet cheaper to keep enabled than to turn off.
 */
export function selectPetIntervention(
  ctx: PetContext,
  policy: PetInterventionPolicy = DEFAULT_PET_POLICY,
  history: PetInterventionRecord[] = []
): PetIntervention | null {
  if (!policy.enabled) return null;
  if (inQuietHours(ctx.minuteOfDay, policy.quietHoursStart, policy.quietHoursEnd)) return null;

  const today = history.filter((r) => r.dateKey === ctx.dateKey);
  const shownKeysToday = new Set(today.map((r) => r.key));
  const shownKeysAcrossHistory = new Set(history.map((r) => r.key));
  const lastShownAt = today.reduce((max, r) => Math.max(max, r.shownAt), 0);

  for (const candidate of candidateInterventions(ctx)) {
    // Ordinary coaching may re-arm on a new local day. A stale-draft key is
    // anchored to the oldest unresolved draft and remains suppressed across
    // days until resolving that draft changes the anchor.
    const alreadyShown =
      candidate.kind === "stale_drafts"
        ? shownKeysAcrossHistory.has(candidate.key)
        : shownKeysToday.has(candidate.key);
    if (alreadyShown) continue;

    // The collision gap applies to every severity, including the ones that skip
    // their channel budget. Otherwise two risk candidates fire a second apart
    // and the first is burned for the day after being visible for one tick.
    const gapMs = policy.bypassBudget.includes(candidate.severity)
      ? policy.collisionGapMs
      : Math.max(policy.channels[candidate.severity].minimumGapMs, policy.collisionGapMs);

    // The gap is measured against the last message of any severity — the user
    // experiences interruptions as one stream, not three.
    if (lastShownAt > 0 && ctx.now - lastShownAt < gapMs) continue;

    if (!policy.bypassBudget.includes(candidate.severity)) {
      const budget = policy.channels[candidate.severity];
      const shownInChannel = today.filter((r) => r.severity === candidate.severity).length;
      if (shownInChannel >= budget.maxPerDay) continue;
    }

    return candidate;
  }

  return null;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

/**
 * Newest-first and count-bounded.
 *
 * Ordinary daily coaching expires after seven days. Stale-draft markers remain
 * until displaced by the 100-record cap because they suppress the same
 * untouched draft across local dates.
 */
export function prunePetHistory(
  history: PetInterventionRecord[],
  now: number
): PetInterventionRecord[] {
  return history
    .filter(
      (record) =>
        record.kind === "stale_drafts" ||
        now - record.shownAt <= HISTORY_MAX_AGE_MS
    )
    .sort((a, b) => b.shownAt - a.shownAt)
    .slice(0, HISTORY_MAX_RECORDS);
}

/**
 * Append a shown intervention.
 *
 * The caller must do this *before* signalling the pet. The selector is driven by
 * a repeating tick, so recording after the signal leaves a window where the same
 * intervention is selected again.
 */
export function recordPetIntervention(
  history: PetInterventionRecord[],
  intervention: PetIntervention,
  ctx: Pick<PetContext, "now" | "dateKey">
): PetInterventionRecord[] {
  return prunePetHistory(
    [
      ...history,
      {
        key: intervention.key,
        kind: intervention.kind,
        severity: intervention.severity,
        shownAt: ctx.now,
        dateKey: ctx.dateKey,
      },
    ],
    ctx.now
  );
}

/** Attach an outcome to the most recent record for a key. */
export function resolvePetIntervention(
  history: PetInterventionRecord[],
  key: string,
  outcome: NonNullable<PetInterventionRecord["outcome"]>,
  now: number
): PetInterventionRecord[] {
  let newestIndex = -1;
  history.forEach((record, index) => {
    if (record.key !== key) return;
    if (newestIndex === -1 || record.shownAt > history[newestIndex].shownAt) newestIndex = index;
  });
  if (newestIndex === -1) return history;
  return history.map((record, index) =>
    index === newestIndex ? { ...record, outcome, respondedAt: now } : record
  );
}
