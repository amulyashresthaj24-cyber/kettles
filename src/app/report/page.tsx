"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  CurrencyDollar,
  Download,
  Plus,
  Robot,
  ShareNetwork,
  Target,
  TrendUp,
} from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import { formatCurrency, formatDuration } from "@/lib/format";
import { formatHourlyRate } from "@/lib/rates";
import { Button } from "@/components/ui/button";
import { useNotification } from "@/components/ui/notification";
import { cn } from "@/lib/utils";
import { PageLayout, PageHeader } from "@/components/layout";
import type { DateRange } from "@/lib/report-dates";
import { getMonthRange, getWeekRange, getYearRange } from "@/lib/report-dates";
import type { ReportFilters, TimeLogSort } from "@/lib/report/data";
import { buildReportData, UNTAGGED } from "@/lib/report/data";
import { DEFAULT_WEEKLY_TARGET_HOURS } from "@/lib/report/constants";
import type { ReportFilterState } from "@/components/report/ReportFilterBar";
import { ReportFilterBar } from "@/components/report/ReportFilterBar";
import { KpiCard } from "@/components/report/KpiCard";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { ReportCard, ReportEmptyState } from "@/components/report/ReportCard";
import { ProjectsTable } from "@/components/report/ProjectsTable";
import { TimeLogTable } from "@/components/report/TimeLogTable";
import { ExportDialog } from "@/components/report/ExportDialog";
import { ShareReportDialog } from "@/components/report/ShareReportDialog";
import { AddTimeLogDialog } from "@/components/report/AddTimeLogDialog";
import { TimeSeriesChart } from "@/components/report/charts/TimeSeriesChart";
import { DistributionDonut } from "@/components/report/charts/DistributionDonut";
import { HourOfDayChart } from "@/components/report/charts/HourOfDayChart";
import { WeekdayChart } from "@/components/report/charts/WeekdayChart";
import { getPublicShareOrigin } from "@/lib/supabase";

type ReportTab = "overview" | "projects" | "tags" | "logs";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "tags", label: "Tags & Productivity" },
  { id: "logs", label: "Time Logs" },
];

const DAY_MS = 86_400_000;

export default function ReportPage() {
  const sessions = useApp((s) => s.sessions);
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const tasks = useApp((s) => s.tasks);
  const initialLoadComplete = useApp((s) => s.initialLoadComplete);
  const weeklyTargetHours = useApp(
    (s) => s.preferences?.weeklyTargetHours ?? DEFAULT_WEEKLY_TARGET_HOURS
  );
  const { notify } = useNotification();

  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [filters, setFilters] = useState<ReportFilterState>(() => ({
    periodMode: "month",
    cursors: { week: 0, month: 0, year: new Date().getFullYear() },
    projectId: null,
    clientId: null,
    tag: null,
    billable: "all",
  }));
  const [timeLogSort, setTimeLogSort] = useState<TimeLogSort>("date_desc");
  const [sliceBy, setSliceBy] = useState<"projects" | "clients">("projects");
  const [groupByClient, setGroupByClient] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [addLogOpen, setAddLogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<import("@/lib/report/data").TimeLogRow | null>(null);

  // Hydrate filters from a shared URL. window.location is used instead of
  // useSearchParams because the app builds with `output: "export"`.
  useEffect(() => {
    if (!window.location.search) return;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const cursor = Number(params.get("cursor") ?? "0");
    const tab = params.get("tab");
    setFilters((f) => ({
      ...f,
      periodMode: mode === "week" || mode === "month" || mode === "year" ? mode : f.periodMode,
      cursors: {
        ...f.cursors,
        ...(mode === "week" || mode === "month" ? { [mode]: cursor } : {}),
        ...(mode === "year" && cursor > 2000 ? { year: cursor } : {}),
      },
      projectId: params.get("project"),
      clientId: params.get("client"),
      tag: params.get("tag"),
      billable:
        params.get("billable") === "billable" || params.get("billable") === "non-billable"
          ? (params.get("billable") as "billable" | "non-billable")
          : "all",
    }));
    if (tab && TABS.some((t) => t.id === tab)) setActiveTab(tab as ReportTab);
  }, []);

  // ── Data pipeline (single source for every tab AND exports) ──────────────
  const range = useMemo<DateRange>(() => {
    if (filters.periodMode === "week") return getWeekRange(filters.cursors.week);
    if (filters.periodMode === "month") return getMonthRange(filters.cursors.month);
    return getYearRange(filters.cursors.year);
  }, [filters.periodMode, filters.cursors]);

  const source = useMemo(
    () => ({ sessions, projects, tasks, clients }),
    [sessions, projects, tasks, clients]
  );

  const reportFilters = useMemo<ReportFilters>(
    () => ({
      range,
      projectId: filters.projectId,
      clientId: filters.clientId,
      tag: filters.tag,
      billable: filters.billable,
    }),
    [range, filters.projectId, filters.clientId, filters.tag, filters.billable]
  );

  const data = useMemo(
    () => buildReportData(source, reportFilters, timeLogSort),
    [source, reportFilters, timeLogSort]
  );

  const tagOptions = useMemo(
    () => Array.from(new Set(tasks.flatMap((t) => t.tags ?? []))).sort(),
    [tasks]
  );

  const totals = data.totals;

  // Utilization: tracked time vs the weekly target scaled to the period length.
  const weeksInRange = Math.max(
    1 / 7,
    (range.end.getTime() - range.start.getTime()) / (7 * DAY_MS)
  );
  const targetSeconds = weeklyTargetHours * 3600 * weeksInRange;
  const utilizationPct = targetSeconds > 0 ? (totals.totalSeconds / targetSeconds) * 100 : 0;

  const donutData = useMemo(() => {
    const rollups = sliceBy === "clients" ? data.clients : data.projects;
    return rollups.map((r) => ({ id: r.id, name: r.name, seconds: r.seconds, color: r.color }));
  }, [data.clients, data.projects, sliceBy]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const getExportData = (overrideRange: DateRange | null) =>
    buildReportData(source, {
      ...reportFilters,
      range: overrideRange ?? range,
    });

  const handleShare = () => setShareOpen(true);

  const getInternalFilterUrl = () => {
    const params = new URLSearchParams();
    params.set("mode", filters.periodMode);
    params.set("cursor", String(filters.cursors[filters.periodMode]));
    params.set("tab", activeTab);
    if (filters.projectId) params.set("project", filters.projectId);
    if (filters.clientId) params.set("client", filters.clientId);
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.billable !== "all") params.set("billable", filters.billable);
    return `${getPublicShareOrigin()}/report?${params.toString()}`;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageLayout>
      <div className="flex flex-col">
        <PageHeader
          title="Reports"
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={handleShare}>
                <ShareNetwork size={14} />
                Share
              </Button>
              <Button size="sm" variant="primary" className="gap-1.5" onClick={() => setExportOpen(true)}>
                <Download size={14} />
                Export
              </Button>
            </div>
          }
        />

        <nav className="flex items-center gap-2 border-b border-border-subtle mt-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-2 py-3 text-[13px] font-medium transition-colors relative",
                activeTab === tab.id
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t-full" />
              )}
            </button>
          ))}
        </nav>

        <ReportFilterBar
          state={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          periodLabel={range.label}
          projects={projects}
          clients={clients}
          tagOptions={tagOptions}
        />
      </div>

      {/* Until the first load lands, every aggregate is zero — and a report of
          0h / $0 reads as real data rather than as "not loaded yet". */}
      {!initialLoadComplete ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[280px] rounded-xl" />
          <SkeletonRows rows={5} rowClassName="h-12" />
        </div>
      ) : (
      <div className="flex flex-col gap-4">
        {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            <div className={cn("grid gap-3", totals.agentSeconds > 0 ? "grid-cols-6" : "grid-cols-5")}>
              <KpiCard
                icon={<Clock size={14} className="text-text-faint" />}
                label="Total Hours"
                value={totals.totalSeconds > 0 ? formatDuration(totals.totalSeconds) : "–"}
                sub={`${totals.activeDays} active day${totals.activeDays !== 1 ? "s" : ""}`}
              />
              <KpiCard
                icon={<CurrencyDollar size={14} className="text-success" />}
                label="Billable Hours"
                value={totals.billableSeconds > 0 ? formatDuration(totals.billableSeconds) : "–"}
                sub={totals.billablePct > 0 ? `${totals.billablePct.toFixed(0)}% of total` : "No billable time"}
                highlight={totals.billableSeconds > 0}
              />
              <KpiCard
                icon={<TrendUp size={14} className="text-accent" />}
                label="Earnings"
                value={totals.earningsCents > 0 ? formatCurrency(totals.earningsCents) : "–"}
                sub={
                  totals.earningsCents > 0
                    ? `${formatDuration(totals.billableSeconds)} billed`
                    : "Set hourly rate on project or client"
                }
              />
              <KpiCard
                icon={<Target size={14} className="text-text-faint" />}
                label="Avg. Daily Hours"
                value={totals.avgDailySeconds > 0 ? `${(totals.avgDailySeconds / 3600).toFixed(1)}h` : "–"}
                sub={`${totals.sessionCount} session${totals.sessionCount !== 1 ? "s" : ""} logged`}
              />
              <KpiCard
                icon={<CheckCircle size={14} className="text-success" />}
                label="Tasks Completed"
                value={totals.tasksCompleted > 0 ? String(totals.tasksCompleted) : "–"}
                sub="worked on in this period"
              />
              {/* Only shown once an agent has actually run — an always-present
                  "0h" card is noise for anyone not working with AI. */}
              {totals.agentSeconds > 0 && (
                <KpiCard
                  icon={<Robot size={14} className="text-accent" />}
                  label="AI-Assisted"
                  value={formatDuration(totals.agentSeconds)}
                  sub={`${totals.agentPct.toFixed(0)}% of total · ${formatDuration(totals.soloSeconds)} solo`}
                />
              )}
            </div>

            <div className="grid grid-cols-[1fr_320px] gap-3">
              <ReportCard title={`Tracked time by ${data.seriesUnit}`}>
                <TimeSeriesChart data={data.series} />
                <div className="flex items-center gap-5 pt-3">
                  <LegendDot color="var(--success)" label="Billable" />
                  <LegendDot color="var(--text-faint)" label="Non-billable" faded />
                </div>
              </ReportCard>

              <ReportCard
                title={sliceBy === "clients" ? "Client distribution" : "Project distribution"}
                action={
                  <button
                    onClick={() => setSliceBy((s) => (s === "projects" ? "clients" : "projects"))}
                    className="px-2.5 py-1 rounded-md border border-border-subtle bg-surface-mid/40 text-[12px] text-text-secondary hover:text-text-primary hover:bg-surface-mid/60 transition-colors"
                  >
                    Slice by: {sliceBy === "projects" ? "Projects" : "Clients"}
                  </button>
                }
              >
                <DistributionDonut data={donutData} totalSeconds={totals.totalSeconds} />
              </ReportCard>
            </div>

            <ReportCard title="Top projects" flush>
              {data.projects.length === 0 ? (
                <ReportEmptyState message="No sessions logged for this period." />
              ) : (
                <div className="flex flex-col">
                  {data.projects.slice(0, 5).map((p) => {
                    const pct = totals.totalSeconds > 0 ? (p.seconds / totals.totalSeconds) * 100 : 0;
                    return (
                      <div
                        key={p.id}
                        className="grid grid-cols-[minmax(0,1fr)_240px_110px_110px] items-center gap-3 px-5 py-3"
                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="text-[13px] font-medium text-text-primary truncate">{p.name}</span>
                          {p.clientName && (
                            <span className="text-[12px] text-text-faint truncate shrink-0">· {p.clientName}</span>
                          )}
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-mid)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: p.color }}
                          />
                        </div>
                        <span className="text-[13px] tabular-nums text-text-secondary text-right">
                          {formatDuration(p.seconds)}
                        </span>
                        <span className="text-[13px] tabular-nums text-text-secondary text-right">
                          {p.earningsCents > 0 ? formatCurrency(p.earningsCents) : "–"}
                          {p.hourlyRate > 0 && (
                            <span className="block text-[11px] text-text-faint">
                              {formatHourlyRate(p.hourlyRate)}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </ReportCard>
          </>
        )}

        {/* ── PROJECTS ─────────────────────────────────────────────────────── */}
        {activeTab === "projects" && (
          <ReportCard
            title="Project and task breakdown"
            action={
              <button
                onClick={() => setGroupByClient((g) => !g)}
                className={cn(
                  "px-2.5 py-1 rounded-md border text-[12px] transition-colors",
                  groupByClient
                    ? "border-accent bg-accent-dim text-text-primary font-medium"
                    : "border-border-subtle bg-surface-mid/40 text-text-secondary hover:text-text-primary"
                )}
              >
                Group by client
              </button>
            }
            flush
          >
            <ProjectsTable projects={data.projects} totals={totals} groupByClient={groupByClient} />
          </ReportCard>
        )}

        {/* ── TAGS & PRODUCTIVITY ──────────────────────────────────────────── */}
        {activeTab === "tags" && (
          <>
            <div className="grid grid-cols-4 gap-3">
              <KpiCard
                icon={<Clock size={14} className="text-accent" />}
                label="Utilization"
                value={totals.totalSeconds > 0 ? `${Math.min(999, utilizationPct).toFixed(0)}%` : "–"}
                sub={`vs ${weeklyTargetHours}h/week target`}
                highlight={utilizationPct >= 80 && utilizationPct <= 120}
              />
              <KpiCard
                icon={<TrendUp size={14} className="text-success" />}
                label="Billable %"
                value={totals.totalSeconds > 0 ? `${totals.billablePct.toFixed(0)}%` : "–"}
                sub="of total tracked time"
                highlight={totals.billablePct > 50}
              />
              <KpiCard
                icon={<Target size={14} className="text-text-faint" />}
                label="Avg. Session"
                value={
                  totals.avgSessionSeconds > 0
                    ? `${Math.round(totals.avgSessionSeconds / 60)}m`
                    : "–"
                }
                sub={`${totals.sessionCount} total session${totals.sessionCount !== 1 ? "s" : ""}`}
              />
              <KpiCard
                icon={<CurrencyDollar size={14} className="text-text-faint" />}
                label="Non-Billable"
                value={totals.nonBillableSeconds > 0 ? formatDuration(totals.nonBillableSeconds) : "–"}
                sub={
                  totals.totalSeconds > 0
                    ? `${((totals.nonBillableSeconds / totals.totalSeconds) * 100).toFixed(0)}% of total`
                    : ""
                }
              />
            </div>

            {filters.periodMode === "week" && (
              <ReportCard title="Weekly target">
                <WeeklyTargetStrip
                  loggedSeconds={totals.totalSeconds}
                  targetSeconds={weeklyTargetHours * 3600}
                />
              </ReportCard>
            )}

            <ReportCard title="Time by tag">
              {data.tags.length === 0 ? (
                <ReportEmptyState message="No sessions logged for this period." />
              ) : (
                <div className="flex flex-col gap-3">
                  {data.tags.map((t) => {
                    const pct = totals.totalSeconds > 0 ? (t.seconds / totals.totalSeconds) * 100 : 0;
                    const bPct = t.seconds > 0 ? (t.billableSeconds / t.seconds) * 100 : 0;
                    const isUntagged = t.tag === UNTAGGED;
                    return (
                      <div key={t.tag} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className={cn("text-[13px]", isUntagged ? "text-text-faint" : "text-text-primary")}>
                            {t.tag}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] text-text-faint tabular-nums">{pct.toFixed(1)}%</span>
                            <span className="text-[12px] text-text-muted tabular-nums w-16 text-right">
                              {formatDuration(t.seconds)}
                            </span>
                          </div>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-mid)" }}>
                          <div
                            className="h-full bg-success"
                            style={{ width: `${(pct * bPct) / 100}%` }}
                            title={`Billable: ${formatDuration(t.billableSeconds)}`}
                          />
                          <div
                            className={cn("h-full", isUntagged ? "bg-text-faint/40" : "bg-accent/60")}
                            style={{ width: `${(pct * (100 - bPct)) / 100}%` }}
                            title={`Non-billable: ${formatDuration(t.seconds - t.billableSeconds)}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-5 pt-1">
                    <LegendDot color="var(--success)" label="Billable" />
                    <LegendDot color="var(--accent)" label="Non-billable" faded />
                  </div>
                </div>
              )}
            </ReportCard>

            <div className="grid grid-cols-2 gap-3">
              <ReportCard title="When you work">
                <HourOfDayChart data={data.hourOfDay} />
              </ReportCard>
              <ReportCard title="Days of the week">
                <WeekdayChart data={data.weekday} />
              </ReportCard>
            </div>
          </>
        )}

        {/* ── TIME LOGS ────────────────────────────────────────────────────── */}
        {activeTab === "logs" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text-muted">
                {data.timeLog.length} session{data.timeLog.length !== 1 ? "s" : ""} ·{" "}
                {formatDuration(totals.totalSeconds)} total
                {totals.earningsCents > 0 && <> · {formatCurrency(totals.earningsCents)}</>}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => {
                    setEditingLog(null);
                    setAddLogOpen(true);
                  }}
                >
                  <Plus size={14} />
                  Add entry
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={async () => {
                    try {
                      const { exportExcel } = await import("@/lib/report/export-excel");
                      const result = await exportExcel(data, { scope: "timesheet" });
                      if (!result.ok) {
                        if (!result.cancelled) {
                          notify({ title: "Download failed", description: result.error, tone: "error" });
                        }
                        return;
                      }
                      notify({
                        title: result.method === "picker" ? "Timesheet saved" : "Download started",
                        description:
                          result.method === "picker"
                            ? `Saved ${result.filename}`
                            : `${result.filename} — check your Downloads folder.`,
                        tone: "success",
                      });
                    } catch (err) {
                      notify({
                        title: "Download failed",
                        description: err instanceof Error ? err.message : "Could not export timesheet.",
                        tone: "error",
                      });
                    }
                  }}
                >
                  <Download size={14} />
                  Download
                </Button>
                <span className="text-[12px] text-text-faint ml-1">Sort:</span>
                {(["date_desc", "date_asc", "dur_desc"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setTimeLogSort(s)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[12px] border transition-colors",
                      timeLogSort === s
                        ? "border-accent bg-accent-dim text-text-primary"
                        : "border-border text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {s === "date_desc" ? "Newest" : s === "date_asc" ? "Oldest" : "Longest"}
                  </button>
                ))}
              </div>
            </div>

            <ReportCard flush>
              <TimeLogTable
                logs={data.timeLog}
                totalSeconds={totals.totalSeconds}
                totalEarningsCents={totals.earningsCents}
                groupByDay={timeLogSort !== "dur_desc"}
                onEdit={(log) => {
                  setEditingLog(log);
                  setAddLogOpen(true);
                }}
              />
            </ReportCard>
          </>
        )}
      </div>
      )}

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} getData={getExportData} />
      <ShareReportDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        filters={filters}
        periodKey={range.key}
        periodLabel={range.label}
        projects={projects}
        clients={clients}
        getInternalFilterUrl={getInternalFilterUrl}
      />
      <AddTimeLogDialog
        open={addLogOpen}
        onClose={() => {
          setAddLogOpen(false);
          setEditingLog(null);
        }}
        defaultProjectId={filters.projectId}
        editing={editingLog}
      />
    </PageLayout>
  );
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function LegendDot({ color, label, faded }: { color: string; label: string; faded?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-text-muted">
      <span
        className="w-2.5 h-2.5 rounded-full inline-block"
        style={{ backgroundColor: color, opacity: faded ? 0.4 : 1 }}
      />
      {label}
    </span>
  );
}

function WeeklyTargetStrip({ loggedSeconds, targetSeconds }: { loggedSeconds: number; targetSeconds: number }) {
  const pct = targetSeconds > 0 ? Math.min(100, (loggedSeconds / targetSeconds) * 100) : 0;
  const remaining = Math.max(0, targetSeconds - loggedSeconds);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-secondary tabular-nums">
          {formatDuration(loggedSeconds)} of {formatDuration(targetSeconds)} logged
        </span>
        <span className={cn("text-[13px] tabular-nums font-medium", remaining === 0 ? "text-success" : "text-text-muted")}>
          {remaining === 0 ? "Target reached ✓" : `${formatDuration(remaining)} remaining`}
        </span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface-mid)" }}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", pct >= 100 ? "bg-success" : "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
