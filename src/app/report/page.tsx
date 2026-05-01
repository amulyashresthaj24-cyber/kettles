"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Link2,
  MoreHorizontal,
  ChevronDown,
  Plus,
  User,
  Briefcase,
  FolderOpen,
  Tag,
  AlignLeft,
  Filter,
  Clock,
  TrendingUp,
  DollarSign,
  Target,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useApp } from "@/lib/store-supabase";
import { formatDuration, formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────
type ReportTab = "summary" | "utilization" | "workload" | "time-logs";
type PeriodMode = "week" | "month" | "year";

// ─── Constants ──────────────────────────────────────────────────────────────
const TABS: { id: ReportTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "utilization", label: "Utilization" },
  { id: "workload", label: "Workload" },
  { id: "time-logs", label: "Time logs" },
];

const PROJECT_COLORS = [
  "#a855f7", "#3b82f6", "#ec4899", "#10b981",
  "#0066ff", "#ef4444", "#06b6d4", "#8b5cf6",
];

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WORK_HOURS_PER_WEEK = 40;

// ─── Date helpers ────────────────────────────────────────────────────────────
function getWeekRange(offset: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const label =
    offset === 0
      ? "This week"
      : offset === -1
      ? "Last week"
      : `${fmt(monday)} – ${fmt(sunday)}`;
  return { start: monday, end: sunday, label };
}

function getMonthRange(offset: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  const label =
    offset === 0
      ? "This month"
      : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { start, end, label };
}

function getYearRange(year: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  const label = year === now.getFullYear() ? "This year" : String(year);
  return { start, end, label };
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ReportPage() {
  const sessions  = useApp((s) => s.sessions);
  const projects  = useApp((s) => s.projects);
  const clients   = useApp((s) => s.clients);
  const tasks     = useApp((s) => s.tasks);
  const userName  = useApp((s) => s.user?.name ?? "User");

  const [activeTab,       setActiveTab]       = useState<ReportTab>("summary");
  const [periodMode,      setPeriodMode]       = useState<PeriodMode>("year");
  const [cursor,          setCursor]           = useState(0); // offset for week/month, year value for year
  const [yearCursor,      setYearCursor]       = useState(() => new Date().getFullYear());
  const [expandedRows,    setExpandedRows]     = useState<Set<string>>(new Set());
  const [sliceBy,         setSliceBy]         = useState<"Projects" | "Clients">("Projects");
  const [filterClientId,  setFilterClientId]   = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId]  = useState<string | null>(null);
  const [timeLogSort,     setTimeLogSort]      = useState<"date_desc" | "date_asc" | "dur_desc">("date_desc");
  const [openClientMenu,  setOpenClientMenu]   = useState(false);
  const [openProjectMenu, setOpenProjectMenu]  = useState(false);

  // Close menus on outside click
  React.useEffect(() => {
    const handleClickOutside = () => {
      setOpenClientMenu(false);
      setOpenProjectMenu(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ── Period range ────────────────────────────────────────────────────────
  const period = useMemo(() => {
    if (periodMode === "week")  return getWeekRange(cursor);
    if (periodMode === "month") return getMonthRange(cursor);
    return getYearRange(yearCursor);
  }, [periodMode, cursor, yearCursor]);

  const periodLabel = period.label;

  const handlePrev = () => {
    if (periodMode === "year") setYearCursor((y) => y - 1);
    else setCursor((c) => c - 1);
  };
  const handleNext = () => {
    if (periodMode === "year") setYearCursor((y) => y + 1);
    else setCursor((c) => c + 1);
  };

  // ── Filter sessions to period + optional client/project ─────────────────
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (!s.endedAt) return false;
      const t = s.endedAt;
      if (t < period.start.getTime() || t > period.end.getTime()) return false;
      if (filterClientId) {
        const proj = projects.find((p) => p.id === s.projectId);
        if (!proj || proj.clientId !== filterClientId) return false;
      }
      if (filterProjectId && s.projectId !== filterProjectId) return false;
      return true;
    });
  }, [sessions, period, filterClientId, filterProjectId, projects]);

  // ── Core aggregates ──────────────────────────────────────────────────────
  const totalSeconds = useMemo(
    () => filteredSessions.reduce((a, s) => a + s.durationSeconds, 0),
    [filteredSessions]
  );

  const billableSeconds = useMemo(
    () => filteredSessions.filter((s) => s.billable).reduce((a, s) => a + s.durationSeconds, 0),
    [filteredSessions]
  );

  const nonBillableSeconds = totalSeconds - billableSeconds;

  const earnings = useMemo(() => {
    let total = 0;
    for (const s of filteredSessions) {
      if (!s.billable) continue;
      const proj   = projects.find((p) => p.id === s.projectId);
      const client = proj?.clientId ? clients.find((c) => c.id === proj.clientId) : undefined;
      if (!client) continue;
      total += (client.hourlyRate * s.durationSeconds) / 3600;
    }
    return total;
  }, [filteredSessions, projects, clients]);

  const activeDays = useMemo(
    () => new Set(filteredSessions.map((s) => new Date(s.endedAt!).toDateString())).size,
    [filteredSessions]
  );

  const avgDailySeconds = activeDays > 0 ? totalSeconds / activeDays : 0;

  const completedTasks = useMemo(() => {
    const taskIds = new Set(filteredSessions.map((s) => s.taskId));
    return tasks.filter((t) => taskIds.has(t.id) && t.status === "done").length;
  }, [filteredSessions, tasks]);

  const sessionCount = filteredSessions.length;

  // ── Project breakdown ────────────────────────────────────────────────────
  const projectBreakdown = useMemo(() => {
    const map = new Map<string, {
      id: string; name: string; seconds: number; billableSeconds: number;
      color: string; clientId?: string;
      tasks: Map<string, { title: string; seconds: number; status: string }>;
    }>();

    for (const s of filteredSessions) {
      const proj = projects.find((p) => p.id === s.projectId);
      const key  = proj?.id ?? "_none";
      const name = proj?.name ?? "Without project";
      if (!map.has(key)) {
        const idx = map.size % PROJECT_COLORS.length;
        map.set(key, {
          id: key, name, seconds: 0, billableSeconds: 0,
          color: PROJECT_COLORS[idx], clientId: proj?.clientId,
          tasks: new Map(),
        });
      }
      const entry = map.get(key)!;
      entry.seconds += s.durationSeconds;
      if (s.billable) entry.billableSeconds += s.durationSeconds;

      const task = tasks.find((t) => t.id === s.taskId);
      const tKey = s.taskId;
      const existing = entry.tasks.get(tKey) ?? { title: task?.title ?? "Unknown task", seconds: 0, status: task?.status ?? "todo" };
      existing.seconds += s.durationSeconds;
      entry.tasks.set(tKey, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.seconds - a.seconds);
  }, [filteredSessions, projects, tasks]);

  // ── Client breakdown (for Utilization + donut slice) ────────────────────
  const clientBreakdown = useMemo(() => {
    const map = new Map<string, { id: string; name: string; seconds: number; billableSeconds: number; color: string }>();
    for (const s of filteredSessions) {
      const proj   = projects.find((p) => p.id === s.projectId);
      const client = proj?.clientId ? clients.find((c) => c.id === proj.clientId) : undefined;
      const key    = client?.id ?? "_none";
      const name   = client?.name ?? "No client";
      if (!map.has(key)) {
        const idx = map.size % PROJECT_COLORS.length;
        map.set(key, { id: key, name, seconds: 0, billableSeconds: 0, color: PROJECT_COLORS[idx] });
      }
      const entry = map.get(key)!;
      entry.seconds += s.durationSeconds;
      if (s.billable) entry.billableSeconds += s.durationSeconds;
    }
    return Array.from(map.values()).sort((a, b) => b.seconds - a.seconds);
  }, [filteredSessions, projects, clients]);

  const donutData = sliceBy === "Clients" ? clientBreakdown : projectBreakdown;

  // ── Monthly data for bar chart ────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (periodMode === "year") {
      const map = Array(12).fill(0);
      for (const s of filteredSessions) {
        map[new Date(s.endedAt!).getMonth()] += s.durationSeconds;
      }
      return { points: map, labels: MONTH_LABELS };
    }
    if (periodMode === "month") {
      const daysInMonth = new Date(period.end.getFullYear(), period.end.getMonth() + 1, 0).getDate();
      const map = Array(daysInMonth).fill(0);
      for (const s of filteredSessions) {
        const d = new Date(s.endedAt!).getDate() - 1;
        if (d >= 0 && d < daysInMonth) map[d] += s.durationSeconds;
      }
      return { points: map, labels: map.map((_, i) => String(i + 1)) };
    }
    // week
    const map = Array(7).fill(0);
    for (const s of filteredSessions) {
      map[new Date(s.endedAt!).getDay()] += s.durationSeconds;
    }
    return { points: map, labels: DAY_LABELS };
  }, [filteredSessions, periodMode, period]);

  const maxChart = Math.max(1, ...chartData.points);

  // ── Workload: current week per-day ────────────────────────────────────────
  const currentWeek = useMemo(() => getWeekRange(0), []);
  const workDays = useMemo(() => {
    const days: { label: string; date: Date; seconds: number; overtime: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeek.start);
      d.setDate(d.getDate() + i);
      const dayStr = d.toDateString();
      const secs = sessions
        .filter((s) => s.endedAt && new Date(s.endedAt).toDateString() === dayStr)
        .reduce((a, s) => a + s.durationSeconds, 0);
      const workSecsPerDay = (WORK_HOURS_PER_WEEK / 5) * 3600;
      days.push({
        label: DAY_LABELS[(i + 1) % 7],
        date: d,
        seconds: secs,
        overtime: secs > workSecsPerDay,
      });
    }
    return days;
  }, [sessions, currentWeek]);

  const weekLoggedSeconds = workDays.reduce((a, d) => a + d.seconds, 0);
  const weekWorkSeconds   = WORK_HOURS_PER_WEEK * 3600;
  const weekRemainingSeconds = Math.max(0, weekWorkSeconds - weekLoggedSeconds);
  const workloadMax = Math.max((WORK_HOURS_PER_WEEK / 5) * 3600, ...workDays.map((d) => d.seconds));

  // ── Time logs ────────────────────────────────────────────────────────────
  const timeLogs = useMemo(() => {
    const logs = filteredSessions
      .filter((s) => s.endedAt)
      .map((s) => {
        const task    = tasks.find((t) => t.id === s.taskId);
        const proj    = projects.find((p) => p.id === s.projectId);
        const client  = proj?.clientId ? clients.find((c) => c.id === proj.clientId) : undefined;
        return {
          id: s.id,
          taskTitle:   task?.title ?? "Unknown task",
          projectName: proj?.name  ?? "—",
          clientName:  client?.name ?? "—",
          projectColor: PROJECT_COLORS[projects.indexOf(proj!) % PROJECT_COLORS.length] ?? "#8a8f98",
          startedAt:   s.startedAt,
          endedAt:     s.endedAt!,
          duration:    s.durationSeconds,
          billable:    s.billable,
          status:      task?.status ?? "todo",
        };
      });

    if (timeLogSort === "date_asc")  return logs.sort((a, b) => a.startedAt - b.startedAt);
    if (timeLogSort === "dur_desc")  return logs.sort((a, b) => b.duration  - a.duration);
    return logs.sort((a, b) => b.startedAt - a.startedAt);
  }, [filteredSessions, tasks, projects, clients, timeLogSort]);

  // ── Utilization metrics ───────────────────────────────────────────────────
  const billablePct   = totalSeconds > 0 ? (billableSeconds / totalSeconds) * 100 : 0;
  const utilizationRate = weekWorkSeconds > 0 ? Math.min(100, (weekLoggedSeconds / weekWorkSeconds) * 100) : 0;
  const avgSessionMins = sessionCount > 0 ? Math.round(totalSeconds / sessionCount / 60) : 0;

  // ─── Helpers ───────────────────────────────────────────────────────────
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(20);
    doc.text("Kettles Report", 40, 50);
    doc.setFontSize(12);
    doc.text(`Period: ${periodLabel}`, 40, 80);
    doc.text(`Total Hours: ${formatDuration(totalSeconds)}`, 40, 100);
    doc.text(`Billable Hours: ${formatDuration(billableSeconds)}`, 40, 120);
    doc.text(`Earnings: ${formatCurrency(earnings * 100)}`, 40, 140);
    doc.save(`kettles-report-${periodLabel.replace(/\s/g, "-")}.pdf`);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      {/* Page Header */}
      <div className="flex flex-col pb-0 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.01em]">Reports</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" aria-label="Export PDF" onClick={handleExportPDF} title="Export PDF">
              <Download size={15} />
            </Button>
            <Button size="sm" variant="ghost" aria-label="Copy link" onClick={handleShare} title="Copy link">
              <Link2 size={15} />
            </Button>
            <Button size="sm" variant="ghost" aria-label="More options">
              <MoreHorizontal size={15} />
            </Button>
            <Button size="sm" variant="primary" className="gap-1.5 text-[13px] ml-1" onClick={handleShare}>
              Save and share
            </Button>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-2 py-3 text-[13px] font-medium transition-colors relative flex items-center gap-1.5",
                activeTab === tab.id
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#10b981] rounded-t-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 py-3 border-b border-border-subtle overflow-x-auto overflow-y-visible scrollbar-hide">
        {/* Period mode pills */}
        <div className="flex items-center gap-0 rounded-md border border-border bg-surface-raised overflow-hidden shrink-0">
          {(["week", "month", "year"] as PeriodMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setPeriodMode(m); setCursor(0); }}
              className={cn(
                "px-3 py-1.5 text-[12px] font-medium transition-colors capitalize",
                periodMode === m
                  ? "bg-surface-mid text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Period navigator */}
        <div className="flex items-center gap-0 rounded-md border border-border bg-surface-raised overflow-hidden shrink-0">
          <button
            onClick={handlePrev}
            className="px-2.5 py-1.5 text-text-muted hover:text-text-primary hover:bg-surface-mid transition-colors"
            aria-label="Previous period"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-x border-border min-w-[120px] justify-center">
            <span className="text-[13px] font-medium text-text-primary">{periodLabel}</span>
          </div>
          <button
            onClick={handleNext}
            className="px-2.5 py-1.5 text-text-muted hover:text-text-primary hover:bg-surface-mid transition-colors"
            aria-label="Next period"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Filter chips */}
        <FilterChip icon={<User size={13} />} label={`Member: ${userName}`} active />

        {/* Client filter */}
        <div className="relative shrink-0 z-50" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenClientMenu(!openClientMenu)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] border transition-colors shrink-0",
              filterClientId || openClientMenu
                ? "border-accent bg-accent-dim text-text-primary"
                : "border-border bg-surface-raised text-text-secondary hover:text-text-primary hover:border-border"
            )}
          >
            <Briefcase size={13} />
            {filterClientId ? (clients.find((c) => c.id === filterClientId)?.name ?? "Client") : "Client"}
          </button>
          {clients.length > 0 && openClientMenu && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-surface-raised border border-border rounded-lg shadow-xl z-50">
              <button
                className="w-full text-left px-3 py-2 text-[12px] text-text-secondary hover:bg-surface-mid transition-colors"
                onClick={() => { setFilterClientId(null); setOpenClientMenu(false); }}
              >
                All clients
              </button>
              {clients.map((c) => (
                <button
                  key={c.id}
                  className={cn(
                    "w-full text-left px-3 py-2 text-[12px] hover:bg-surface-mid transition-colors",
                    filterClientId === c.id ? "text-accent" : "text-text-secondary"
                  )}
                  onClick={() => { setFilterClientId(c.id); setOpenClientMenu(false); }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project filter */}
        <div className="relative shrink-0 z-50" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenProjectMenu(!openProjectMenu)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] border transition-colors shrink-0",
              filterProjectId || openProjectMenu
                ? "border-accent bg-accent-dim text-text-primary"
                : "border-border bg-surface-raised text-text-secondary hover:text-text-primary hover:border-border"
            )}
          >
            <FolderOpen size={13} />
            {filterProjectId ? (projects.find((p) => p.id === filterProjectId)?.name ?? "Project") : "Project"}
          </button>
          {projects.length > 0 && openProjectMenu && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-surface-raised border border-border rounded-lg shadow-xl z-50">
              <button
                className="w-full text-left px-3 py-2 text-[12px] text-text-secondary hover:bg-surface-mid transition-colors"
                onClick={() => { setFilterProjectId(null); setOpenProjectMenu(false); }}
              >
                All projects
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  className={cn(
                    "w-full text-left px-3 py-2 text-[12px] hover:bg-surface-mid transition-colors",
                    filterProjectId === p.id ? "text-accent" : "text-text-secondary"
                  )}
                  onClick={() => { setFilterProjectId(p.id); setOpenProjectMenu(false); }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {(filterClientId || filterProjectId) && (
          <button
            className="text-[12px] text-error hover:opacity-80 shrink-0"
            onClick={() => { setFilterClientId(null); setFilterProjectId(null); }}
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto shrink-0 pl-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface-raised text-[13px] text-text-secondary hover:text-text-primary transition-colors">
            <Filter size={13} />
            Filters
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-5 py-5">

        {/* ── SUMMARY ──────────────────────────────────────────────────────── */}
        {activeTab === "summary" && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-3">
              <KpiCard
                icon={<Clock size={14} className="text-text-faint" />}
                label="Total Hours"
                value={totalSeconds > 0 ? formatDuration(totalSeconds) : "–"}
                sub={`${activeDays} active day${activeDays !== 1 ? "s" : ""}`}
              />
              <KpiCard
                icon={<DollarSign size={14} className="text-[#10b981]" />}
                label="Billable Hours"
                value={billableSeconds > 0 ? formatDuration(billableSeconds) : "–"}
                sub={billablePct > 0 ? `${billablePct.toFixed(0)}% of total` : "No billable time"}
                highlight={billableSeconds > 0}
              />
              <KpiCard
                icon={<TrendingUp size={14} className="text-accent" />}
                label="Earnings"
                value={earnings > 0 ? formatCurrency(earnings * 100) : "–"}
                sub={earnings > 0 ? `${formatDuration(billableSeconds)} logged` : "Set hourly rates on clients"}
              />
              <KpiCard
                icon={<Target size={14} className="text-text-faint" />}
                label="Avg. Daily Hours"
                value={avgDailySeconds > 0 ? `${(avgDailySeconds / 3600).toFixed(1)}h` : "–"}
                sub={`${sessionCount} session${sessionCount !== 1 ? "s" : ""} logged`}
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-[1fr_320px] gap-3">
              {/* Bar chart */}
              <div className="rounded-lg bg-surface border border-border-subtle p-5 flex flex-col gap-4">
                <h2 className="text-[13px] font-semibold text-text-primary">
                  Duration by {periodMode === "year" ? "month" : periodMode === "month" ? "day" : "day of week"}
                </h2>
                <BarChart data={chartData.points} labels={chartData.labels} max={maxChart} />
                <div className="flex items-center gap-2 pt-1">
                  <span className="w-3 h-3 rounded-full bg-[#10b981] inline-block" />
                  <span className="text-[12px] text-text-muted">Hours logged</span>
                </div>
              </div>

              {/* Donut chart */}
              <div className="rounded-lg bg-surface border border-border-subtle p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[13px] font-semibold text-text-primary">
                    {sliceBy === "Clients" ? "Client" : "Project"} distribution
                  </h2>
                  <button
                    onClick={() => setSliceBy((s) => s === "Projects" ? "Clients" : "Projects")}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-[12px] text-text-secondary hover:bg-surface-raised transition-colors"
                  >
                    Slice by: {sliceBy}
                    <ChevronDown size={12} />
                  </button>
                </div>
                <DonutChart data={donutData} total={totalSeconds} />
              </div>
            </div>

            {/* Breakdown table */}
            <div className="rounded-lg bg-surface border border-border-subtle overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
                <h2 className="text-[13px] font-semibold text-text-primary">Project and task breakdown</h2>
              </div>

              <div className="grid grid-cols-[1fr_140px_140px_100px] items-center px-5 py-2 border-b border-border-subtle bg-surface-raised">
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Project / Task</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Duration</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Duration %</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Billable</span>
              </div>

              {projectBreakdown.length === 0 ? (
                <EmptyState message="No sessions logged for this period." />
              ) : (
                <div className="flex flex-col">
                  {projectBreakdown.map((proj) => {
                    const pct        = totalSeconds > 0 ? ((proj.seconds / totalSeconds) * 100).toFixed(1) : "0";
                    const isExpanded = expandedRows.has(proj.id);
                    const taskList   = Array.from(proj.tasks.entries());

                    return (
                      <div key={proj.id}>
                        <button
                          onClick={() => toggleRow(proj.id)}
                          className="grid grid-cols-[1fr_140px_140px_100px] items-center w-full px-5 py-3 border-b border-border-subtle hover:bg-surface-raised transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <ChevronDown
                              size={14}
                              className={cn("text-text-faint transition-transform duration-200 shrink-0", isExpanded ? "rotate-0" : "-rotate-90")}
                            />
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                            <span className="text-[13px] font-medium text-text-primary">{proj.name}</span>
                            <span className="text-[12px] text-text-faint">({taskList.length})</span>
                          </div>
                          <span className="text-[13px] tabular-nums text-text-secondary">{formatDuration(proj.seconds)}</span>
                          <span className="text-[13px] tabular-nums text-text-secondary">{pct}%</span>
                          <span className="text-[12px] text-text-muted tabular-nums">
                            {proj.billableSeconds > 0 ? formatDuration(proj.billableSeconds) : "–"}
                          </span>
                        </button>

                        {isExpanded && taskList.map(([tKey, task]) => (
                          <div
                            key={tKey}
                            className="grid grid-cols-[1fr_140px_140px_100px] items-center px-5 py-2.5 border-b border-border-subtle bg-base"
                          >
                            <div className="flex items-center gap-3 pl-8">
                              {task.status === "done"
                                ? <CheckCircle2 size={13} className="text-[#10b981] shrink-0" />
                                : <Circle size={13} className="text-text-faint shrink-0" />
                              }
                              <span className="text-[13px] text-text-secondary truncate">{task.title}</span>
                            </div>
                            <span className="text-[13px] tabular-nums text-text-muted">{formatDuration(task.seconds)}</span>
                            <span className="text-[13px] tabular-nums text-text-muted">
                              {totalSeconds > 0 ? ((task.seconds / totalSeconds) * 100).toFixed(1) : "0"}%
                            </span>
                            <span />
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  <div className="grid grid-cols-[1fr_140px_140px_100px] items-center px-5 py-3 border-t border-border-subtle">
                    <span className="text-[12px] uppercase tracking-[0.04em] font-semibold text-text-faint">Total</span>
                    <span className="text-[13px] tabular-nums font-semibold text-text-primary">{formatDuration(totalSeconds)}</span>
                    <span className="text-[13px] tabular-nums font-semibold text-text-primary">100%</span>
                    <span className="text-[13px] tabular-nums font-semibold text-text-primary">
                      {billableSeconds > 0 ? formatDuration(billableSeconds) : "–"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── UTILIZATION ──────────────────────────────────────────────────── */}
        {activeTab === "utilization" && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-3">
              <KpiCard
                icon={<TrendingUp size={14} className="text-[#10b981]" />}
                label="Billable %"
                value={totalSeconds > 0 ? `${billablePct.toFixed(0)}%` : "–"}
                sub="of total tracked time"
                highlight={billablePct > 50}
              />
              <KpiCard
                icon={<Clock size={14} className="text-accent" />}
                label="Utilization Rate"
                value={`${utilizationRate.toFixed(0)}%`}
                sub={`vs ${WORK_HOURS_PER_WEEK}h/week target`}
                highlight={utilizationRate >= 80}
              />
              <KpiCard
                icon={<Target size={14} className="text-text-faint" />}
                label="Avg. Session"
                value={avgSessionMins > 0 ? `${avgSessionMins}m` : "–"}
                sub={`${sessionCount} total session${sessionCount !== 1 ? "s" : ""}`}
              />
              <KpiCard
                icon={<DollarSign size={14} className="text-[#10b981]" />}
                label="Non-Billable"
                value={nonBillableSeconds > 0 ? formatDuration(nonBillableSeconds) : "–"}
                sub={totalSeconds > 0 ? `${((nonBillableSeconds / totalSeconds) * 100).toFixed(0)}% of total` : ""}
              />
            </div>

            {/* Billable vs Non-billable by project */}
            <div className="rounded-lg bg-surface border border-border-subtle p-5 flex flex-col gap-5">
              <h2 className="text-[13px] font-semibold text-text-primary">Billable vs Non-billable by project</h2>
              {projectBreakdown.length === 0 ? (
                <EmptyState message="No sessions logged for this period." />
              ) : (
                <div className="flex flex-col gap-4">
                  {projectBreakdown.map((proj) => {
                    const bPct = proj.seconds > 0 ? (proj.billableSeconds / proj.seconds) * 100 : 0;
                    const nbPct = 100 - bPct;
                    return (
                      <div key={proj.id} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                            <span className="text-[13px] text-text-primary">{proj.name}</span>
                          </div>
                          <span className="text-[12px] text-text-muted tabular-nums">{formatDuration(proj.seconds)}</span>
                        </div>
                        <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-raised">
                          {proj.billableSeconds > 0 && (
                            <div
                              className="h-full bg-[#10b981] transition-all duration-500"
                              style={{ width: `${bPct}%` }}
                              title={`Billable: ${formatDuration(proj.billableSeconds)}`}
                            />
                          )}
                          {proj.seconds - proj.billableSeconds > 0 && (
                            <div
                              className="h-full bg-surface-mid transition-all duration-500"
                              style={{ width: `${nbPct}%` }}
                              title={`Non-billable: ${formatDuration(proj.seconds - proj.billableSeconds)}`}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-text-faint">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                            Billable {bPct.toFixed(0)}%
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-surface-mid border border-border" />
                            Non-billable {nbPct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Client breakdown table */}
            <div className="rounded-lg bg-surface border border-border-subtle overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
                <h2 className="text-[13px] font-semibold text-text-primary">Hours by client</h2>
              </div>
              <div className="grid grid-cols-[1fr_120px_120px_120px_100px] items-center px-5 py-2 border-b border-border-subtle bg-surface-raised">
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Client</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Total</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Billable</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Non-billable</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Billable %</span>
              </div>
              {clientBreakdown.length === 0 ? (
                <EmptyState message="No sessions logged for this period." />
              ) : (
                <div className="flex flex-col">
                  {clientBreakdown.map((c) => {
                    const bPct = c.seconds > 0 ? ((c.billableSeconds / c.seconds) * 100).toFixed(0) : "0";
                    return (
                      <div key={c.id} className="grid grid-cols-[1fr_120px_120px_120px_100px] items-center px-5 py-3 border-b border-border-subtle hover:bg-surface-raised transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-[13px] text-text-primary">{c.name}</span>
                        </div>
                        <span className="text-[13px] tabular-nums text-text-secondary">{formatDuration(c.seconds)}</span>
                        <span className="text-[13px] tabular-nums text-[#10b981]">{formatDuration(c.billableSeconds)}</span>
                        <span className="text-[13px] tabular-nums text-text-muted">{formatDuration(c.seconds - c.billableSeconds)}</span>
                        <span className="text-[13px] tabular-nums text-text-secondary">{bPct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── WORKLOAD ─────────────────────────────────────────────────────── */}
        {activeTab === "workload" && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-3 rounded-lg bg-surface border border-border-subtle divide-x divide-border-subtle">
              <div className="p-5 flex flex-col gap-1.5">
                <span className="text-[12px] text-text-muted font-medium">Target hours / week</span>
                <span className="text-[22px] font-semibold text-text-primary tracking-tight tabular-nums">
                  {WORK_HOURS_PER_WEEK}h
                </span>
              </div>
              <div className="p-5 flex flex-col gap-1.5">
                <span className="text-[12px] text-text-muted font-medium">Logged this week</span>
                <span className="text-[22px] font-semibold text-text-primary tracking-tight tabular-nums">
                  {weekLoggedSeconds > 0 ? formatDuration(weekLoggedSeconds) : "0h"}
                </span>
              </div>
              <div className="p-5 flex flex-col gap-1.5">
                <span className="text-[12px] text-text-muted font-medium">Remaining</span>
                <span className={cn(
                  "text-[22px] font-semibold tracking-tight tabular-nums",
                  weekRemainingSeconds === 0 ? "text-[#10b981]" : "text-text-primary"
                )}>
                  {weekRemainingSeconds === 0 ? "Done ✓" : formatDuration(weekRemainingSeconds)}
                </span>
              </div>
            </div>

            {/* Daily workload chart */}
            <div className="rounded-lg bg-surface border border-border-subtle p-5 flex flex-col gap-5">
              <h2 className="text-[13px] font-semibold text-text-primary">Daily logged time — this week</h2>
              <WorkloadChart days={workDays} max={workloadMax} workPerDay={(WORK_HOURS_PER_WEEK / 5) * 3600} />
              <div className="flex items-center justify-center gap-6 text-[12px] text-text-primary">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-[3px] bg-text-muted rounded-full" />
                  Target ({WORK_HOURS_PER_WEEK / 5}h/day)
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-[3px] bg-[#3b82f6] rounded-full" />
                  Logged time
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-[3px] bg-[#ef4444] opacity-70 rounded-full" />
                  Overtime (&gt;target)
                </div>
              </div>
            </div>

            {/* Per-day table */}
            <div className="rounded-lg bg-surface border border-border-subtle overflow-hidden">
              <div className="px-5 py-3 border-b border-border-subtle">
                <h2 className="text-[13px] font-semibold text-text-primary">Week breakdown</h2>
              </div>
              <table className="w-full text-[12px]">
                <thead className="border-b border-border-subtle bg-surface-raised">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium text-text-muted uppercase tracking-wider">Day</th>
                    <th className="px-5 py-2.5 text-left font-medium text-text-muted uppercase tracking-wider">Date</th>
                    <th className="px-5 py-2.5 text-left font-medium text-text-muted uppercase tracking-wider">Logged</th>
                    <th className="px-5 py-2.5 text-left font-medium text-text-muted uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {workDays.map((d, i) => {
                    const isToday = d.date.toDateString() === new Date().toDateString();
                    const workPerDay = (WORK_HOURS_PER_WEEK / 5) * 3600;
                    const isWeekend = i === 0 || i === 6;
                    return (
                      <tr key={i} className={cn("hover:bg-surface-raised transition-colors", isToday && "bg-accent-dim")}>
                        <td className={cn("px-5 py-3 font-medium", isToday ? "text-accent" : "text-text-primary")}>
                          {d.label} {isToday && <span className="text-[10px] ml-1 text-accent">(today)</span>}
                        </td>
                        <td className="px-5 py-3 text-text-muted">
                          {d.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-text-primary font-medium">
                          {d.seconds > 0 ? formatDuration(d.seconds) : isWeekend ? "—" : "0h"}
                        </td>
                        <td className="px-5 py-3">
                          {isWeekend ? (
                            <span className="text-text-faint text-[11px]">Weekend</span>
                          ) : d.seconds === 0 ? (
                            <span className="text-[11px] text-text-faint">No sessions</span>
                          ) : d.overtime ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(239,68,68,0.12)] text-[#ef4444] text-[11px] font-medium">
                              Overtime
                            </span>
                          ) : d.seconds >= workPerDay * 0.8 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.12)] text-[#10b981] text-[11px] font-medium">
                              On track
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-raised text-text-muted text-[11px]">
                              Partial
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── TIME LOGS ────────────────────────────────────────────────────── */}
        {activeTab === "time-logs" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text-muted">
                {timeLogs.length} session{timeLogs.length !== 1 ? "s" : ""} · {formatDuration(totalSeconds)} total
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-faint">Sort:</span>
                {(["date_desc","date_asc","dur_desc"] as const).map((s) => (
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

            <div className="rounded-lg bg-surface border border-border-subtle overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_140px_140px_80px] items-center px-5 py-2 border-b border-border-subtle bg-surface-raised">
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Task</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Project</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Date</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Time</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">Duration</span>
              </div>

              {timeLogs.length === 0 ? (
                <EmptyState message="No sessions logged for this period. Start a focus session to track time." />
              ) : (
                <div className="flex flex-col divide-y divide-border-subtle">
                  {timeLogs.map((log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-[1fr_120px_140px_140px_80px] items-center px-5 py-3 hover:bg-surface-raised transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {log.status === "done"
                          ? <CheckCircle2 size={13} className="text-[#10b981] shrink-0" />
                          : <Circle size={13} className="text-text-faint shrink-0" />
                        }
                        <span className="text-[13px] text-text-primary truncate">{log.taskTitle}</span>
                        {log.billable && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[rgba(16,185,129,0.12)] text-[#10b981]">$</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: log.projectColor }} />
                        <span className="text-[12px] text-text-secondary truncate">{log.projectName}</span>
                      </div>
                      <span className="text-[12px] text-text-muted tabular-nums">{fmtDate(log.startedAt)}</span>
                      <span className="text-[12px] text-text-muted tabular-nums">
                        {fmtTime(log.startedAt)} – {fmtTime(log.endedAt)}
                      </span>
                      <span className="text-[13px] tabular-nums font-medium text-text-primary">{formatDuration(log.duration)}</span>
                    </div>
                  ))}

                  <div className="grid grid-cols-[1fr_120px_140px_140px_80px] items-center px-5 py-3 bg-surface-raised">
                    <span className="text-[12px] font-semibold text-text-faint uppercase tracking-[0.04em]">Total</span>
                    <span />
                    <span />
                    <span />
                    <span className="text-[13px] tabular-nums font-semibold text-text-primary">{formatDuration(totalSeconds)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface border border-border-subtle p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-text-muted font-medium">{label}</span>
        {icon}
      </div>
      <span className={cn(
        "text-[22px] font-semibold tabular-nums tracking-[-0.02em] leading-none",
        highlight ? "text-[#10b981]" : "text-text-primary"
      )}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-text-faint">{sub}</span>}
    </div>
  );
}

function FilterChip({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] border transition-colors shrink-0",
        active
          ? "border-accent bg-accent-dim text-text-primary"
          : "border-border bg-surface-raised text-text-secondary hover:text-text-primary hover:border-border"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-12 text-center text-[13px] text-text-muted">{message}</div>
  );
}

function BarChart({ data, labels, max }: { data: number[]; labels: string[]; max: number }) {
  const maxH    = 160;
  const maxHours = Math.ceil((max / 3600) / 5) * 5 || 10;
  const yTicks  = [maxHours, Math.round(maxHours * 0.75), Math.round(maxHours * 0.5), Math.round(maxHours * 0.25), 0];

  return (
    <div className="flex gap-3">
      <div className="flex flex-col justify-between items-end pr-1" style={{ height: maxH }}>
        {yTicks.map((t, i) => (
          <span key={i} className="text-[10px] text-text-faint tabular-nums">{t}h</span>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-1">
        <div className="relative" style={{ height: maxH }}>
          {[0, 25, 50, 75, 100].map((pct) => (
            <div
              key={pct}
              className="absolute left-0 right-0 border-t border-border-subtle"
              style={{ bottom: `${pct}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[3px] px-0.5">
            {data.map((sec, i) => {
              const heightPct = max > 0 ? (sec / max) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex items-end group/bar relative">
                  <div
                    className="w-full rounded-t-sm bg-[#10b981] transition-all duration-300 hover:opacity-80 cursor-pointer"
                    style={{ height: `${heightPct}%`, minHeight: sec > 0 ? 3 : 0 }}
                  />
                  {sec > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-surface-raised border border-border rounded-md text-[11px] text-text-primary whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10">
                      {formatDuration(sec)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-[3px] px-0.5">
          {labels.map((l, i) => (
            <div key={i} className="flex-1 text-center">
              <span className="text-[10px] text-text-faint">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkloadChart({
  days,
  max,
  workPerDay,
}: {
  days: { label: string; date: Date; seconds: number; overtime: boolean }[];
  max: number;
  workPerDay: number;
}) {
  const maxH = 180;
  const targetPct = max > 0 ? (workPerDay / max) * 100 : 50;

  return (
    <div className="relative" style={{ height: maxH + 24 }}>
      {/* Target line */}
      <div
        className="absolute left-0 right-0 border-t-2 border-dashed border-text-muted z-10"
        style={{ bottom: 24 + (targetPct / 100) * maxH }}
      />

      {/* Bars */}
      <div className="absolute inset-x-0 bottom-6 flex gap-2 items-end" style={{ height: maxH }}>
        {days.map((d, i) => {
          const heightPct = max > 0 ? (d.seconds / max) * 100 : 0;
          const isToday   = d.date.toDateString() === new Date().toDateString();
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group/bar relative gap-1">
              {d.seconds > 0 && (
                <div
                  className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-raised border border-border rounded text-[11px] text-text-primary whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-20"
                >
                  {formatDuration(d.seconds)}
                </div>
              )}
              <div
                className={cn(
                  "w-full rounded-t-sm transition-all duration-300",
                  d.overtime ? "bg-[#ef4444] opacity-70" : isToday ? "bg-accent" : "bg-[#3b82f6]"
                )}
                style={{ height: `${Math.max(heightPct, d.seconds > 0 ? 2 : 0)}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* X labels */}
      <div className="absolute inset-x-0 bottom-0 flex gap-2 h-6">
        {days.map((d, i) => {
          const isToday = d.date.toDateString() === new Date().toDateString();
          return (
            <div key={i} className="flex-1 text-center">
              <span className={cn("text-[11px]", isToday ? "text-accent font-medium" : "text-text-muted")}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutChart({
  data,
  total,
}: {
  data: { id: string; name: string; seconds: number; color: string }[];
  total: number;
}) {
  const size    = 160;
  const strokeW = 28;
  const r       = (size - strokeW) / 2;
  const circ    = 2 * Math.PI * r;
  const cx      = size / 2;
  const cy      = size / 2;

  let offset = 0;
  const segments = data.map((d) => {
    const pct  = total > 0 ? d.seconds / total : 0;
    const dash = pct * circ;
    const gap  = circ - dash;
    const seg  = { ...d, dash, gap, offset };
    offset += dash;
    return seg;
  });

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-raised)" strokeWidth={strokeW} />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeW}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={-seg.offset}
              className="transition-all duration-300"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[16px] font-bold tabular-nums tracking-[-0.02em] text-text-primary leading-none">
            {total > 0 ? formatDuration(total) : "–"}
          </span>
          <span className="text-[10px] uppercase tracking-[0.06em] text-text-faint mt-0.5">Total</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        {data.slice(0, 6).map((d) => {
          const pct = total > 0 ? ((d.seconds / total) * 100).toFixed(1) : "0";
          return (
            <div key={d.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[12px] text-text-secondary truncate">{d.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[12px] text-text-faint tabular-nums">{formatDuration(d.seconds)}</span>
                <span className="text-[12px] text-text-muted tabular-nums w-10 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
