/**
 * Billed-through cutoff: the last local calendar day a project has already
 * been invoiced. Orthogonal to session.billable — a non-billable hour in a
 * closed period is still "billed" in the ledger sense (it was on that invoice
 * cycle), it just earned nothing.
 *
 * Pure. No store, no network. Pass `nowMs` when a test needs a frozen clock.
 */

import { earningsCents, resolveHourlyRate } from "./rates";
import type { Client, Project, Session } from "./types";

function isConfirmedSession(session: Session): boolean {
  return !!session.endedAt && (session.state ?? "confirmed") === "confirmed";
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type BilledFilter = "all" | "billed" | "unbilled";

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayLocalDateString(nowMs = Date.now()): string {
  return toLocalDateString(new Date(nowMs));
}

/** Valid `YYYY-MM-DD`, or null when missing / garbage. */
export function parseBilledThrough(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = DATE_RE.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return trimmed;
}

/** Local start of the billed-through day, or null if unset. */
export function billedThroughStartMs(value: unknown): number | null {
  const date = parseBilledThrough(value);
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
}

/**
 * Exclusive end of the billed-through day (local midnight of the next day).
 * A session is billed when `endedAt < this`.
 */
export function billedThroughEndMs(value: unknown): number | null {
  const start = billedThroughStartMs(value);
  if (start == null) return null;
  const next = new Date(start);
  next.setDate(next.getDate() + 1);
  return next.getTime();
}

export function isTimestampBilled(ts: number, billedThrough?: string | null): boolean {
  if (!Number.isFinite(ts)) return false;
  const end = billedThroughEndMs(billedThrough);
  return end != null && ts < end;
}

export function isSessionBilled(
  session: Pick<Session, "endedAt">,
  billedThrough?: string | null
): boolean {
  return session.endedAt != null && isTimestampBilled(session.endedAt, billedThrough);
}

export function formatBilledThroughLabel(value: unknown): string | null {
  const date = parseBilledThrough(value);
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  const formatted = new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Billed through ${formatted}`;
}

export function formatBilledThroughShort(value: unknown): string | null {
  const date = parseBilledThrough(value);
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export interface ProjectBilledSummary {
  billedThrough: string | null;
  cutoffEndMs: number | null;
  firstStartedAt: number | null;
  lastEndedAt: number | null;
  billedSeconds: number;
  billedBillableSeconds: number;
  billedEarningsCents: number;
  unbilledSeconds: number;
  unbilledBillableSeconds: number;
  unbilledEarningsCents: number;
  nonBillableSeconds: number;
  sessionCount: number;
  billedSessionCount: number;
}

const EMPTY_SUMMARY: ProjectBilledSummary = {
  billedThrough: null,
  cutoffEndMs: null,
  firstStartedAt: null,
  lastEndedAt: null,
  billedSeconds: 0,
  billedBillableSeconds: 0,
  billedEarningsCents: 0,
  unbilledSeconds: 0,
  unbilledBillableSeconds: 0,
  unbilledEarningsCents: 0,
  nonBillableSeconds: 0,
  sessionCount: 0,
  billedSessionCount: 0,
};

/**
 * Confirmed sessions on this project, split by the billed-through date.
 * Running / draft / discarded rows stay out — same rule as the report.
 */
export function summarizeProjectBilled(
  sessions: Session[],
  project: Project,
  client?: Client | null
): ProjectBilledSummary {
  const billedThrough = parseBilledThrough(project.billedThrough);
  const cutoffEndMs = billedThroughEndMs(billedThrough);
  const rate = resolveHourlyRate(project, client);
  const summary: ProjectBilledSummary = {
    ...EMPTY_SUMMARY,
    billedThrough,
    cutoffEndMs,
  };

  for (const session of sessions) {
    if (session.projectId !== project.id) continue;
    if (!isConfirmedSession(session) || session.endedAt == null) continue;

    const seconds = Math.max(0, session.durationSeconds);
    const billable = !!session.billable;
    const cents = earningsCents(seconds, rate.dollarsPerHour, billable);
    const billed = isTimestampBilled(session.endedAt, billedThrough);

    summary.sessionCount += 1;
    if (!billable) summary.nonBillableSeconds += seconds;
    if (summary.firstStartedAt == null || session.startedAt < summary.firstStartedAt) {
      summary.firstStartedAt = session.startedAt;
    }
    if (summary.lastEndedAt == null || session.endedAt > summary.lastEndedAt) {
      summary.lastEndedAt = session.endedAt;
    }

    if (billed) {
      summary.billedSessionCount += 1;
      summary.billedSeconds += seconds;
      if (billable) summary.billedBillableSeconds += seconds;
      summary.billedEarningsCents += cents;
    } else {
      summary.unbilledSeconds += seconds;
      if (billable) summary.unbilledBillableSeconds += seconds;
      summary.unbilledEarningsCents += cents;
    }
  }

  return summary;
}

export interface BilledTimelineLayout {
  /** 0–100, exclusive end of the billed period along the span. Null when unset. */
  cutoffPct: number | null;
  startMs: number;
  endMs: number;
}

/**
 * Place the cutoff on a bar from the first session (or the cutoff day) to
 * the last session or `nowMs`, whichever is later.
 */
export function billedTimelineLayout(
  summary: ProjectBilledSummary,
  nowMs = Date.now()
): BilledTimelineLayout | null {
  const points: number[] = [];
  if (summary.firstStartedAt != null) points.push(summary.firstStartedAt);
  if (summary.lastEndedAt != null) points.push(summary.lastEndedAt);
  if (summary.cutoffEndMs != null) {
    const start = billedThroughStartMs(summary.billedThrough);
    if (start != null) points.push(start);
    points.push(summary.cutoffEndMs);
  }
  if (points.length === 0) return null;

  const startMs = Math.min(...points);
  const endMs = Math.max(nowMs, ...points);
  const span = Math.max(1, endMs - startMs);
  const cutoffPct =
    summary.cutoffEndMs == null
      ? null
      : Math.min(100, Math.max(0, ((summary.cutoffEndMs - startMs) / span) * 100));

  return { cutoffPct, startMs, endMs };
}
