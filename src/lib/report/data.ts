// Single aggregation pipeline for the report page AND the PDF/Excel exporters.
// Pure functions over store arrays — no React, no server calls. Keeping the UI
// and the exports on this one pipeline guarantees they show identical numbers.

import type { Client, Project, Session, Task, TaskStatus } from "@/lib/types";
import type { DateRange } from "@/lib/report-dates";
import { eachDayOf } from "@/lib/report-dates";
import { earningsCents, resolveHourlyRate, type RateSource } from "@/lib/rates";
import { hasTruthfulTimeline } from "@/lib/session-timeline";

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface ReportSource {
  sessions: Session[];
  projects: Project[];
  tasks: Task[];
  clients: Client[];
}

export type BillableFilter = "all" | "billable" | "non-billable";

export interface ReportFilters {
  range: DateRange;
  projectId: string | null;
  clientId: string | null;
  tag: string | null;
  billable: BillableFilter;
}

export function isReportableSession(s: Session): boolean {
  return !!s.endedAt && (s.state ?? "confirmed") === "confirmed";
}

/**
 * Align the wall-clock range with durationSeconds when they disagree.
 *
 * Legacy pause → late confirm left startedAt at the real start but set endedAt
 * to the confirm moment, so TIME looked longer than DURATION. After resume,
 * startedAt is the last segment while durationSeconds is the full total.
 *
 * Only call this for legacy rows. Sessions at TIMELINE_VERSION 2+ keep a
 * truthful startedAt across pauses, so a wall-clock range longer than the
 * duration is the paused time and reconciling it would invent a fake block.
 */
export function reconcileSessionBounds(
  startedAt: number,
  endedAt: number,
  durationSeconds: number
): { startedAt: number; endedAt: number } {
  const seconds = Math.max(0, Math.round(durationSeconds));
  if (seconds <= 0 || !Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt <= startedAt) {
    return { startedAt, endedAt };
  }
  const wallSec = Math.max(0, Math.round((endedAt - startedAt) / 1000));
  const slack = 45; // ignore sub-minute noise from rounding / clock skew
  if (wallSec > seconds + slack) {
    return { startedAt, endedAt: startedAt + seconds * 1000 };
  }
  if (seconds > wallSec + slack) {
    return { startedAt: endedAt - seconds * 1000, endedAt };
  }
  return { startedAt, endedAt };
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const FALLBACK_PALETTE = [
  "#a855f7", "#3b82f6", "#ec4899", "#10b981",
  "#0066ff", "#ef4444", "#06b6d4", "#8b5cf6",
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** project.color when set; otherwise a palette color stable for the given id. */
export function colorForProject(project: Project | undefined, id: string): string {
  if (project?.color) return project.color;
  return FALLBACK_PALETTE[hashString(id) % FALLBACK_PALETTE.length];
}

export function colorForKey(key: string): string {
  return FALLBACK_PALETTE[hashString(key) % FALLBACK_PALETTE.length];
}

// ─── Enrichment ──────────────────────────────────────────────────────────────

export const UNTAGGED = "Untagged";

export interface EnrichedSession {
  session: Session;
  task?: Task;
  project?: Project;
  client?: Client;
  /** Inherited from the session's task at report time. */
  tags: string[];
  color: string;
  seconds: number;
  billable: boolean;
  earningsCents: number;
  /** Effective rate applied to this session, in dollars per hour. */
  hourlyRate: number;
  rateSource: RateSource;
  endedAt: number;
  startedAt: number;
}

/**
 * Filter to reportable sessions inside the range, resolve task/project/client
 * joins once, and compute per-session earnings (cents).
 * Sessions are attributed to the period containing their endedAt.
 */
export function selectSessions(src: ReportSource, filters: ReportFilters): EnrichedSession[] {
  const taskById = new Map(src.tasks.map((t) => [t.id, t]));
  const projectById = new Map(src.projects.map((p) => [p.id, p]));
  const clientById = new Map(src.clients.map((c) => [c.id, c]));
  const startMs = filters.range.start.getTime();
  const endMs = filters.range.end.getTime();

  const rows: EnrichedSession[] = [];
  for (const s of src.sessions) {
    if (!isReportableSession(s)) continue;
    const endedAt = s.endedAt!;
    if (endedAt < startMs || endedAt > endMs) continue;

    const project = s.projectId ? projectById.get(s.projectId) : undefined;
    if (filters.projectId && project?.id !== filters.projectId) continue;
    const client = project?.clientId ? clientById.get(project.clientId) : undefined;
    if (filters.clientId && client?.id !== filters.clientId) continue;

    const billable = !!s.billable;
    if (filters.billable === "billable" && !billable) continue;
    if (filters.billable === "non-billable" && billable) continue;

    const task = s.taskId ? taskById.get(s.taskId) : undefined;
    const tags = task?.tags ?? [];
    if (filters.tag && !tags.includes(filters.tag)) continue;

    const seconds = s.durationSeconds;
    const bounds = hasTruthfulTimeline(s)
      ? { startedAt: s.startedAt, endedAt }
      : reconcileSessionBounds(s.startedAt, endedAt, seconds);
    const rate = resolveHourlyRate(project, client);

    rows.push({
      session: s,
      task,
      project,
      client,
      tags,
      color: colorForProject(project, s.projectId || "_none"),
      seconds,
      billable,
      earningsCents: earningsCents(seconds, rate.dollarsPerHour, billable),
      hourlyRate: rate.dollarsPerHour,
      rateSource: rate.source,
      endedAt: bounds.endedAt,
      startedAt: bounds.startedAt,
    });
  }
  return rows;
}

// ─── Totals ──────────────────────────────────────────────────────────────────

export interface ReportTotals {
  totalSeconds: number;
  billableSeconds: number;
  nonBillableSeconds: number;
  earningsCents: number;
  sessionCount: number;
  activeDays: number;
  avgDailySeconds: number;
  avgSessionSeconds: number;
  billablePct: number;
  tasksCompleted: number;
}

export function computeTotals(rows: EnrichedSession[]): ReportTotals {
  let totalSeconds = 0;
  let billableSeconds = 0;
  let earningsCents = 0;
  const days = new Set<string>();
  const doneTasks = new Set<string>();

  for (const r of rows) {
    totalSeconds += r.seconds;
    if (r.billable) billableSeconds += r.seconds;
    earningsCents += r.earningsCents;
    days.add(new Date(r.endedAt).toDateString());
    if (r.task?.status === "done") doneTasks.add(r.task.id);
  }

  const sessionCount = rows.length;
  const activeDays = days.size;
  return {
    totalSeconds,
    billableSeconds,
    nonBillableSeconds: totalSeconds - billableSeconds,
    earningsCents,
    sessionCount,
    activeDays,
    avgDailySeconds: activeDays > 0 ? totalSeconds / activeDays : 0,
    avgSessionSeconds: sessionCount > 0 ? totalSeconds / sessionCount : 0,
    billablePct: totalSeconds > 0 ? (billableSeconds / totalSeconds) * 100 : 0,
    tasksCompleted: doneTasks.size,
  };
}

// ─── Rollups ─────────────────────────────────────────────────────────────────

export interface TaskRollup {
  id: string;
  title: string;
  status: TaskStatus;
  seconds: number;
  billableSeconds: number;
  earningsCents: number;
  sessionCount: number;
}

export interface ProjectRollup {
  id: string;
  name: string;
  color: string;
  clientName?: string;
  seconds: number;
  billableSeconds: number;
  earningsCents: number;
  sessionCount: number;
  tasksCompleted: number;
  /** Effective rate in dollars per hour; 0 when no project or client rate is set. */
  hourlyRate: number;
  rateSource: RateSource;
  budgetDollars?: number;
  budgetUsedPct?: number;
  tasks: TaskRollup[];
}

export function rollupByProject(rows: EnrichedSession[]): ProjectRollup[] {
  const map = new Map<string, ProjectRollup & { _tasks: Map<string, TaskRollup>; _done: Set<string> }>();

  for (const r of rows) {
    const key = r.project?.id ?? "_none";
    let entry = map.get(key);
    if (!entry) {
      entry = {
        id: key,
        name: r.project?.name ?? "Without project",
        color: r.color,
        clientName: r.client?.name,
        seconds: 0,
        billableSeconds: 0,
        earningsCents: 0,
        sessionCount: 0,
        tasksCompleted: 0,
        hourlyRate: r.hourlyRate,
        rateSource: r.rateSource,
        budgetDollars: r.project?.budget ?? undefined,
        tasks: [],
        _tasks: new Map(),
        _done: new Set(),
      };
      map.set(key, entry);
    }
    entry.seconds += r.seconds;
    if (r.billable) entry.billableSeconds += r.seconds;
    entry.earningsCents += r.earningsCents;
    entry.sessionCount += 1;
    if (r.task?.status === "done") entry._done.add(r.task.id);

    const tKey = r.session.taskId || "_none";
    let tEntry = entry._tasks.get(tKey);
    if (!tEntry) {
      tEntry = {
        id: tKey,
        title: r.task?.title ?? "Unknown task",
        status: r.task?.status ?? "todo",
        seconds: 0,
        billableSeconds: 0,
        earningsCents: 0,
        sessionCount: 0,
      };
      entry._tasks.set(tKey, tEntry);
    }
    tEntry.seconds += r.seconds;
    if (r.billable) tEntry.billableSeconds += r.seconds;
    tEntry.earningsCents += r.earningsCents;
    tEntry.sessionCount += 1;
  }

  const result = Array.from(map.values()).map((e) => {
    const { _tasks, _done, ...rest } = e;
    return {
      ...rest,
      tasksCompleted: _done.size,
      budgetUsedPct:
        e.budgetDollars && e.budgetDollars > 0
          ? (e.earningsCents / 100 / e.budgetDollars) * 100
          : undefined,
      tasks: Array.from(_tasks.values()).sort((a, b) => b.seconds - a.seconds),
    };
  });

  // Largest first; "Without project" always last.
  return result.sort((a, b) => {
    if (a.id === "_none") return 1;
    if (b.id === "_none") return -1;
    return b.seconds - a.seconds;
  });
}

export interface ClientRollup {
  id: string;
  name: string;
  color: string;
  seconds: number;
  billableSeconds: number;
  earningsCents: number;
  sessionCount: number;
}

export function rollupByClient(rows: EnrichedSession[]): ClientRollup[] {
  const map = new Map<string, ClientRollup>();
  for (const r of rows) {
    const key = r.client?.id ?? "_none";
    let entry = map.get(key);
    if (!entry) {
      entry = {
        id: key,
        name: r.client?.name ?? "No client",
        color: colorForKey(key),
        seconds: 0,
        billableSeconds: 0,
        earningsCents: 0,
        sessionCount: 0,
      };
      map.set(key, entry);
    }
    entry.seconds += r.seconds;
    if (r.billable) entry.billableSeconds += r.seconds;
    entry.earningsCents += r.earningsCents;
    entry.sessionCount += 1;
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.id === "_none") return 1;
    if (b.id === "_none") return -1;
    return b.seconds - a.seconds;
  });
}

export interface TagRollup {
  tag: string;
  seconds: number;
  billableSeconds: number;
  earningsCents: number;
  sessionCount: number;
}

/** A session counts once under each of its tags; tagless time lands in "Untagged". */
export function rollupByTag(rows: EnrichedSession[]): TagRollup[] {
  const map = new Map<string, TagRollup>();
  const bump = (tag: string, r: EnrichedSession) => {
    let entry = map.get(tag);
    if (!entry) {
      entry = { tag, seconds: 0, billableSeconds: 0, earningsCents: 0, sessionCount: 0 };
      map.set(tag, entry);
    }
    entry.seconds += r.seconds;
    if (r.billable) entry.billableSeconds += r.seconds;
    entry.earningsCents += r.earningsCents;
    entry.sessionCount += 1;
  };

  for (const r of rows) {
    if (r.tags.length === 0) bump(UNTAGGED, r);
    else for (const tag of r.tags) bump(tag, r);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.tag === UNTAGGED) return 1;
    if (b.tag === UNTAGGED) return -1;
    return b.seconds - a.seconds;
  });
}

// ─── Time series ─────────────────────────────────────────────────────────────

export interface TimeBucket {
  key: string;
  label: string;
  seconds: number;
  billableSeconds: number;
  earningsCents: number;
}

function emptyBucket(key: string, label: string): TimeBucket {
  return { key, label, seconds: 0, billableSeconds: 0, earningsCents: 0 };
}

function addToBucket(b: TimeBucket, r: EnrichedSession): void {
  b.seconds += r.seconds;
  if (r.billable) b.billableSeconds += r.seconds;
  b.earningsCents += r.earningsCents;
}

/** Zero-filled bucket per day in the range; sessions land on their endedAt day. */
export function bucketByDay(rows: EnrichedSession[], range: DateRange): TimeBucket[] {
  const days = eachDayOf(range);
  const buckets = days.map((d) =>
    emptyBucket(
      d.toDateString(),
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    )
  );
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const r of rows) {
    const b = byKey.get(new Date(r.endedAt).toDateString());
    if (b) addToBucket(b, r);
  }
  return buckets;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Zero-filled bucket per calendar month intersecting the range. */
export function bucketByMonth(rows: EnrichedSession[], range: DateRange): TimeBucket[] {
  const buckets: TimeBucket[] = [];
  const byKey = new Map<string, TimeBucket>();
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  while (cursor.getTime() <= range.end.getTime()) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    const b = emptyBucket(key, MONTH_LABELS[cursor.getMonth()]);
    buckets.push(b);
    byKey.set(key, b);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  for (const r of rows) {
    const d = new Date(r.endedAt);
    const b = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (b) addToBucket(b, r);
  }
  return buckets;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday-first weekday buckets. Weekend = indices 5 (Sat) and 6 (Sun). */
export function bucketByWeekday(rows: EnrichedSession[]): TimeBucket[] {
  const buckets = WEEKDAY_LABELS.map((l, i) => emptyBucket(String(i), l));
  for (const r of rows) {
    const idx = (new Date(r.endedAt).getDay() + 6) % 7; // Sun(0)→6, Mon(1)→0
    addToBucket(buckets[idx], r);
  }
  return buckets;
}

/** 24 hour-of-day buckets; a session's full duration is attributed to its start hour. */
export function bucketByHourOfDay(rows: EnrichedSession[]): TimeBucket[] {
  const buckets = Array.from({ length: 24 }, (_, h) => {
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const suffix = h < 12 ? "am" : "pm";
    return emptyBucket(String(h), `${hour12}${suffix}`);
  });
  for (const r of rows) {
    addToBucket(buckets[new Date(r.startedAt).getHours()], r);
  }
  return buckets;
}

// ─── Time log ────────────────────────────────────────────────────────────────

export type TimeLogSort = "date_desc" | "date_asc" | "dur_desc";

export interface TimeLogRow {
  id: string;
  taskId: string;
  projectId: string;
  startedAt: number;
  endedAt: number;
  taskTitle: string;
  taskStatus: TaskStatus;
  projectName: string;
  clientName: string;
  tags: string[];
  seconds: number;
  billable: boolean;
  earningsCents: number;
  color: string;
  /** Session notes joined — maps to timesheet Description column. */
  description: string;
}

export function buildTimeLog(rows: EnrichedSession[], sort: TimeLogSort): TimeLogRow[] {
  const logs: TimeLogRow[] = rows.map((r) => ({
    id: r.session.id,
    taskId: r.session.taskId ?? r.task?.id ?? "",
    projectId: r.session.projectId ?? r.project?.id ?? "",
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    taskTitle: r.task?.title ?? "Unknown task",
    taskStatus: r.task?.status ?? "todo",
    projectName: r.project?.name ?? "—",
    clientName: r.client?.name ?? "—",
    tags: r.tags,
    seconds: r.seconds,
    billable: r.billable,
    earningsCents: r.earningsCents,
    color: r.color,
    description: (r.session.notes ?? [])
      .map((n) => n.text?.trim())
      .filter(Boolean)
      .join("; "),
  }));

  if (sort === "date_asc") return logs.sort((a, b) => a.startedAt - b.startedAt);
  if (sort === "dur_desc") return logs.sort((a, b) => b.seconds - a.seconds);
  return logs.sort((a, b) => b.startedAt - a.startedAt);
}

// ─── One-call bundle ─────────────────────────────────────────────────────────

export interface ReportData {
  filters: ReportFilters;
  rows: EnrichedSession[];
  totals: ReportTotals;
  projects: ProjectRollup[];
  clients: ClientRollup[];
  tags: TagRollup[];
  /** Day buckets for week/month ranges, month buckets for longer spans. */
  series: TimeBucket[];
  seriesUnit: "day" | "month";
  weekday: TimeBucket[];
  hourOfDay: TimeBucket[];
  timeLog: TimeLogRow[];
}

const MAX_DAY_BUCKETS = 62; // beyond ~2 months, switch the series to monthly

export function buildReportData(
  src: ReportSource,
  filters: ReportFilters,
  timeLogSort: TimeLogSort = "date_desc"
): ReportData {
  const rows = selectSessions(src, filters);
  const spanDays = Math.round(
    (filters.range.end.getTime() - filters.range.start.getTime()) / 86_400_000
  );
  const seriesUnit: "day" | "month" = spanDays > MAX_DAY_BUCKETS ? "month" : "day";

  return {
    filters,
    rows,
    totals: computeTotals(rows),
    projects: rollupByProject(rows),
    clients: rollupByClient(rows),
    tags: rollupByTag(rows),
    series:
      seriesUnit === "month"
        ? bucketByMonth(rows, filters.range)
        : bucketByDay(rows, filters.range),
    seriesUnit,
    weekday: bucketByWeekday(rows),
    hourOfDay: bucketByHourOfDay(rows),
    timeLog: buildTimeLog(rows, timeLogSort),
  };
}
