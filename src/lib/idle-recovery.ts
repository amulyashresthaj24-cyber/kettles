/**
 * What each answer to an idle gap does to the ledger.
 *
 * Kept out of the store on purpose. These four branches decide how much time
 * gets billed, and burying that arithmetic inside a Zustand action makes the
 * one thing that must be right the one thing that cannot be tested.
 *
 * Pure — no store, no network, no `Date.now()`.
 */

import { formatDuration } from "./format";
import { idleGapSeconds } from "./session-timeline";
import { TIMELINE_VERSION } from "./session-timeline";
import type { IdleRecovery, IdleRecoveryAction, Session } from "./types";

/** Terminal status recorded against the recovery for each answer. */
const RESOLVED_STATUS: Record<IdleRecoveryAction, IdleRecovery["status"]> = {
  resume_trimmed: "trimmed",
  count_as_work: "counted",
  save_as_draft: "drafted",
  finish_at_idle: "finished",
};

/**
 * What the pet says once the answer has been applied.
 *
 * A ledger tool that edits time and then goes quiet is asking to be distrusted.
 * Every answer states the resulting number, so the user never has to open the
 * report to find out whether the click did what they meant.
 */
export function describeIdleResolution(
  resolution: IdleResolution,
  session: Session,
  recovery: IdleRecovery,
  now: number
): string {
  const gap = formatDuration(idleGapSeconds(recovery, now));
  const total = formatDuration(
    resolution.patch.durationSeconds ?? session.durationSeconds ?? 0
  );

  switch (resolution.patch.pendingIdleRecovery?.status) {
    case "counted":
      return `Counted ${gap} as work. Now at ${total}.`;
    case "drafted":
      return `Saved ${gap} as a draft to classify. Back at ${total}.`;
    case "finished":
      return `Finished at ${clockTime(recovery.idleStartedAt)}. ${total} logged.`;
    case "trimmed":
    default:
      return `Trimmed ${gap}. Back at ${total}.`;
  }
}

/** Local `HH:MM`, matching how the pet states the pause boundary. */
export function clockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export interface IdleResolution {
  /** Patch for the session that owned the gap. */
  patch: Partial<Session>;
  /**
   * A new unclassified entry covering the gap itself, for `save_as_draft`.
   * The user was doing *something* — a meeting, a call — and it should be
   * attributable later rather than deleted.
   */
  draft: Omit<Session, "id"> | null;
  /** True when the session is no longer the active one afterwards. */
  clearsActiveSession: boolean;
}

/**
 * True when this gap still needs an answer.
 *
 * Every caller checks this first, which is what makes resolution idempotent: a
 * duplicate `idle-resumed`, a double-click, or the pet and the in-app card both
 * firing must not move time twice.
 */
export function isResolvable(recovery: IdleRecovery | undefined): recovery is IdleRecovery {
  return !!recovery && recovery.status === "pending";
}

export function resolveIdleRecovery(
  session: Session,
  recovery: IdleRecovery,
  action: IdleRecoveryAction,
  now: number
): IdleResolution {
  const gapSeconds = idleGapSeconds(recovery, now);
  const banked = Math.max(0, session.durationSeconds ?? 0);
  const returnedAt = recovery.returnedAt ?? now;
  const resolved: IdleRecovery = {
    ...recovery,
    returnedAt,
    status: RESOLVED_STATUS[action],
  };

  // Resuming always opens a new stretch. `startedAt` stays immutable — see
  // session-timeline.ts — so the resume point goes in `resumedAt`.
  const resumePatch: Partial<Session> = {
    state: "running",
    paused: false,
    resumedAt: now,
    frozenAt: undefined,
    pendingIdleRecovery: resolved,
    updatedAt: now,
  };

  switch (action) {
    case "count_as_work":
      // Away from the keyboard but still working: reading, a call, a whiteboard.
      // Give the time back exactly once and carry on.
      return {
        patch: { ...resumePatch, durationSeconds: banked + gapSeconds },
        draft: null,
        clearsActiveSession: false,
      };

    case "save_as_draft":
      return {
        patch: resumePatch,
        draft:
          gapSeconds > 0
            ? {
                taskId: "",
                projectId: session.projectId,
                billable: false,
                startedAt: recovery.idleStartedAt,
                endedAt: returnedAt,
                durationSeconds: gapSeconds,
                paused: true,
                state: "draft",
                isDraft: true,
                notes: [],
                source: "idle_recovery",
                timelineVersion: TIMELINE_VERSION,
                updatedAt: now,
              }
            : null,
        clearsActiveSession: false,
      };

    case "finish_at_idle":
      // The session really ended when the user walked away, so that is the end.
      return {
        patch: {
          state: "confirmed",
          paused: true,
          endedAt: recovery.idleStartedAt,
          durationSeconds: banked,
          isDraft: false,
          frozenAt: undefined,
          pendingIdleRecovery: resolved,
          updatedAt: now,
        },
        draft: null,
        clearsActiveSession: true,
      };

    case "resume_trimmed":
    default:
      // The default, and the honest one: idle time was not work. The duration
      // was already frozen at the idle boundary, so nothing is added back.
      return { patch: resumePatch, draft: null, clearsActiveSession: false };
  }
}
