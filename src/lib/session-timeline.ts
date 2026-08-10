/**
 * Session timeline math.
 *
 * Historically `resumeSession()` overwrote `startedAt` with the resume moment
 * and kept the accumulated `durationSeconds`. Duration stayed correct, but the
 * real start of the session was destroyed, so reports could only reconstruct a
 * fake contiguous block ending at `endedAt`. Hour-of-day attribution and any
 * future session timeline were wrong by however long the user paused.
 *
 * Sessions created from TIMELINE_VERSION onward keep `startedAt` immutable and
 * track the current running stretch in `resumedAt` instead. Those rows are
 * truthful and must never be "repaired" by the report layer.
 *
 * Pure functions only — no store, no network. Safe to unit test.
 */

import type { Session } from "./types";

/** Bumped when the meaning of a session's wall-clock bounds changes. */
export const TIMELINE_VERSION = 2;

type TimelineFields = Pick<Session, "startedAt" | "resumedAt" | "state" | "durationSeconds">;

/**
 * True when `startedAt` is the genuine first start and the wall-clock range is
 * allowed to exceed `durationSeconds` (the difference being paused time).
 * Legacy rows return false and stay subject to the reconciliation heuristics.
 */
export function hasTruthfulTimeline(session: Pick<Session, "timelineVersion">): boolean {
  return (session.timelineVersion ?? 1) >= TIMELINE_VERSION;
}

/**
 * Instant the current running stretch began — the resume point if the session
 * has been resumed, otherwise the original start.
 *
 * Legacy rows have no `resumedAt`, so they fall back to `startedAt`, which for
 * them already *is* the last resume. Behavior is unchanged for old data.
 */
export function activeSince(session: Pick<Session, "startedAt" | "resumedAt">): number {
  return session.resumedAt ?? session.startedAt;
}

/**
 * Accumulated duration plus the current stretch when running.
 * Only a running session accrues time; paused/finished ones are already banked.
 */
export function elapsedSecondsFor(session: TimelineFields, now: number = Date.now()): number {
  const banked = session.durationSeconds ?? 0;
  if (session.state !== "running") return banked;
  return banked + Math.floor((now - activeSince(session)) / 1000);
}

/**
 * Wall-clock seconds the session has been open, ignoring pauses.
 * Used to decide whether a "running" row is stale enough to freeze.
 */
export function runningStretchMs(
  session: Pick<Session, "startedAt" | "resumedAt">,
  now: number = Date.now()
): number {
  return now - activeSince(session);
}

// ---------------------------------------------------------------------------
// Idle recovery
// ---------------------------------------------------------------------------

/**
 * The instant input actually stopped.
 *
 * The OS reports idle *duration*, and the app only hears about it once the
 * threshold is crossed. The user stopped working `idleSeconds` ago, not now, so
 * pausing at `now` bills the whole idle stretch.
 */
export function idleStartedAt(now: number, idleSeconds: number): number {
  return now - Math.max(0, idleSeconds) * 1000;
}

/**
 * What `durationSeconds` should be frozen at when idle began.
 *
 * Only the current running stretch is trimmed. Time banked by earlier stretches
 * is never touched — an idle period longer than the current stretch would
 * otherwise subtract work the user really did before the last resume.
 */
export function durationAtIdleStart(
  session: TimelineFields,
  now: number,
  idleSeconds: number
): number {
  const banked = session.durationSeconds ?? 0;
  if (session.state !== "running") return banked;
  const stretchMs = Math.max(0, idleStartedAt(now, idleSeconds) - activeSince(session));
  return banked + Math.floor(stretchMs / 1000);
}

/**
 * Length of the gap, measured to the return if there is one.
 *
 * The idle duration seen at detection is a floor, not the total: the user may
 * stay away far longer than the threshold that triggered the pause.
 */
export function idleGapSeconds(
  recovery: { idleStartedAt: number; returnedAt?: number },
  now: number = Date.now()
): number {
  const end = recovery.returnedAt ?? now;
  return Math.max(0, Math.floor((end - recovery.idleStartedAt) / 1000));
}
