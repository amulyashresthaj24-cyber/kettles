"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CalendarBlank,
  CheckCircle,
  CurrencyDollar,
  Plus,
  Timer,
  CaretRight,
  Circle,
  ArrowUpRight,
  Lightning,
  CalendarBlank as CalendarIcon,
} from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import { formatDuration, formatCurrency } from "@/lib/format";
import { isTaskOnDay } from "@/lib/task-dates";
import { AddTaskModal } from "./AddTaskModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageLayout, PageHeader, PageContent } from "@/components/layout";
import type { Task, Urgency, ProjectColor } from "@/lib/types";
import { getProjectColor } from "@/lib/constants";
import { getWeekRange } from "@/lib/report-dates";

const URGENCY_ORDER: Record<Urgency, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const URGENCY_COLOR: Record<Urgency, string> = {
  urgent: "var(--error)",
  high: "var(--warning)",
  normal: "var(--success)",
  low: "var(--text-faint)",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

function todayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86_400_000;
  return { start, end };
}

function weekBounds() {
  // ISO week (Monday-first), shared with the report page.
  const range = getWeekRange(0);
  return { start: range.start.getTime(), end: range.end.getTime() + 1 };
}

function sessionReferenceTime(session: { startedAt: number; endedAt?: number; frozenAt?: number }) {
  return session.endedAt ?? session.frozenAt ?? session.startedAt;
}

export default function Dashboard() {
  const router = useRouter();
  const user = useApp((s) => s.user);
  const tasks = useApp((s) => s.tasks);
  const sessions = useApp((s) => s.sessions);
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const setTaskStatus = useApp((s) => s.setTaskStatus);
  const startSession = useApp((s) => s.startSession);
  const preferences = useApp((s) => s.preferences);

  const [openAdd, setOpenAdd] = useState(false);
  const [completingTasks, setCompletingTasks] = useState<Record<string, boolean>>({});
  const [reopeningTasks, setReopeningTasks] = useState<Record<string, boolean>>({});

  const handleFocusTask = async (task: Task) => {
    if (activeSessionId) {
      router.push("/timer");
      return;
    }
    const planned =
      task.estimateMinutes && task.estimateMinutes > 0
        ? task.estimateMinutes
        : preferences?.defaultFocusDuration && preferences.defaultFocusDuration > 0
          ? preferences.defaultFocusDuration
          : undefined;
    await startSession(task.id, undefined, planned);
    router.push("/timer");
  };

  const handleCompleteTask = (taskId: string) => {
    setCompletingTasks((prev) => ({ ...prev, [taskId]: true }));
    setTimeout(() => {
      setTaskStatus(taskId, "done");
      setCompletingTasks((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }, 350);
  };

  const handleReopenTask = (taskId: string) => {
    setReopeningTasks((prev) => ({ ...prev, [taskId]: true }));
    setTimeout(() => {
      setTaskStatus(taskId, "todo");
      setReopeningTasks((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }, 350);
  };

  const { start: todayStart, end: todayEnd } = todayBounds();
  const { start: weekStart, end: weekEnd } = weekBounds();

  const todaySessions = useMemo(
    () => sessions.filter((s) => s.endedAt && (s.state ?? "confirmed") === "confirmed" && s.endedAt >= todayStart && s.endedAt < todayEnd),
    [sessions, todayStart, todayEnd]
  );

  const todayDraftSessions = useMemo(
    () => sessions.filter((s) => s.state === "draft" && sessionReferenceTime(s) >= todayStart && sessionReferenceTime(s) < todayEnd),
    [sessions, todayStart, todayEnd]
  );

  const weekSessions = useMemo(
    () => sessions.filter((s) => s.endedAt && (s.state ?? "confirmed") === "confirmed" && s.endedAt >= weekStart && s.endedAt < weekEnd),
    [sessions, weekStart, weekEnd]
  );

  const todayTracked = useMemo(
    () => todaySessions.reduce((a, s) => a + s.durationSeconds, 0),
    [todaySessions]
  );

  const todayBillableCents = useMemo(() => {
    let cents = 0;
    for (const s of todaySessions) {
      if (!s.billable) continue;
      const proj = projects.find((p) => p.id === s.projectId);
      const rate =
        proj?.hourlyRate != null && proj.hourlyRate > 0
          ? proj.hourlyRate
          : proj?.clientId
            ? clients.find((c) => c.id === proj.clientId)?.hourlyRate ?? 0
            : 0;
      if (rate <= 0) continue;
      cents += Math.round((rate * s.durationSeconds * 100) / 3600);
    }
    return cents;
  }, [todaySessions, projects, clients]);

  const weekTracked = useMemo(
    () => weekSessions.reduce((a, s) => a + s.durationSeconds, 0),
    [weekSessions]
  );

  const weekEarnings = useMemo(() => {
    let cents = 0;
    for (const s of weekSessions) {
      if (!s.billable) continue;
      const proj = projects.find((p) => p.id === s.projectId);
      const rate =
        proj?.hourlyRate != null && proj.hourlyRate > 0
          ? proj.hourlyRate
          : proj?.clientId
            ? clients.find((c) => c.id === proj.clientId)?.hourlyRate ?? 0
            : 0;
      if (rate <= 0) continue;
      cents += Math.round((rate * s.durationSeconds * 100) / 3600);
    }
    return cents;
  }, [weekSessions, projects, clients]);

  const tasksDone = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks]
  );

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.archived && !t.deletedAt && t.status !== "done" && isTaskOnDay(t, todayStart, todayEnd))
        .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]),
    [tasks, todayStart, todayEnd]
  );

  const doneTasks = useMemo(
    () => tasks.filter((t) => !t.archived && !t.deletedAt && t.status === "done" && isTaskOnDay(t, todayStart, todayEnd)),
    [tasks, todayStart, todayEnd]
  );

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const activeTask = activeSession ? tasks.find((t) => t.id === activeSession.taskId) : null;
  const activeProject = activeTask
    ? projects.find((p) => p.id === activeTask.projectId)
    : null;

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <PageLayout>
      <div style={{ maxWidth: "var(--content-max-width)", marginLeft: "auto", marginRight: "auto", width: "100%" }}>
        {/* Header */}
        <PageHeader
          title={`${greeting}, ${user?.name ?? "User"}`}
          subtitle={dateStr}
          action={
            <div className="flex items-center gap-2.5">
              <Button variant="secondary" size="default" onClick={() => setOpenAdd(true)}>
                <Plus size={15} />
                New Task
              </Button>
              <Link
                href="/timer"
                className="btn-interactive flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[13px] font-medium"
                style={{
                  background: "var(--accent)",
                  color: "var(--text-primary)",
                }}
              >
                <Timer size={15} />
                Start Timer
              </Link>
            </div>
          }
        />

        <div style={{ marginTop: "var(--content-gap)" }}>
          <PageContent>
            {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
          {[
            { icon: <Clock size={16} className="text-accent opacity-75" aria-hidden />, label: "Today Tracked", value: formatDuration(todayTracked), sub: `${todaySessions.length} session${todaySessions.length === 1 ? "" : "s"}` },
            { icon: <CalendarBlank size={16} className="text-accent opacity-75" aria-hidden />, label: "This Week", value: formatDuration(weekTracked), sub: `${weekSessions.length} session${weekSessions.length === 1 ? "" : "s"}` },
            { icon: <CheckCircle size={16} className="text-accent opacity-75" aria-hidden />, label: "Tasks Done", value: String(tasksDone), sub: `${tasks.length} total` },
            { icon: <CurrencyDollar size={16} className="text-accent opacity-75" aria-hidden />, label: "Billable This Week", value: formatCurrency(weekEarnings), sub: "Across all clients" },
          ].map((card, i) => (
            <StatCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              value={card.value}
              sub={card.sub}
              index={i + 1}
            />
          ))}
        </div>

        {/* Active session banner */}
        {activeSession && activeTask && (
          <div
            className="animate-fade-up stagger flex items-center justify-between px-5 py-4 rounded-xl animate-banner-glow"
            style={{ background: "linear-gradient(135deg, var(--card-gradient-start) 0%, var(--card-gradient-mid) 100%)", "--index": 5 } as React.CSSProperties}
          >
            <div className="flex items-center gap-3">
              <span className="relative flex shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-40 animate-ping" />
                <span className="relative w-2 h-2 rounded-full bg-accent" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-text-primary truncate max-w-[320px]">
                  {activeTask.title}
                </span>
                {activeProject && (
                  <span className="text-[12px] text-text-muted">
                    {activeProject.name} · Timer running
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/timer"
              className="btn-interactive flex items-center gap-1.5 text-[13px] font-medium text-accent hover:text-accent-hover shrink-0 ml-4"
            >
              Open timer <ArrowUpRight size={13} />
            </Link>
          </div>
        )}

        {/* Main content */}
        <div
          className="grid grid-cols-[1fr_320px] gap-4 animate-fade-up stagger"
          style={{ "--index": 6 } as React.CSSProperties}
        >

          {/* Today's Tasks */}
          <section className="rounded-lg flex flex-col overflow-hidden" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-text-primary">
                  Today&apos;s Tasks
                </h2>
                {todayTasks.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium text-text-muted" style={{ background: "var(--border-subtle)" }}>
                    {todayTasks.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpenAdd(true)}
                className="flex items-center gap-1.5 text-[13px] transition-colors text-text-muted hover:text-text-primary"
              >
                <Plus size={14} />
                Add task
              </button>
            </div>

            <div className="flex flex-col">
              {todayTasks.length === 0 && doneTasks.length === 0 && (
                <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--border-subtle)" }}>
                    <CheckCircle size={18} className="text-text-faint" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-text-secondary">No tasks for today</p>
                    <p className="text-[12px] text-text-faint mt-1">Add a task to start tracking your work.</p>
                  </div>
                </div>
              )}

              {todayTasks.map((task, i) => {
                const proj = projects.find((p) => p.id === task.projectId);
                const isCompleting = completingTasks[task.id];
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "animate-fade-up stagger",
                      isCompleting && "task-row-completing"
                    )}
                    style={{ "--index": i } as React.CSSProperties}
                  >
                    <div className="card-interactive flex items-start gap-3 px-5 py-3.5 group hover:bg-surface-mid rounded-[8px] mx-1">
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={isCompleting}
                        className={cn(
                          "mt-0.5 shrink-0 flex items-center justify-center w-[18px] h-[18px] rounded-[5px] border-2 transition-all duration-150",
                          isCompleting
                            ? "bg-success border-success shadow-sm animate-checkbox-pop"
                            : "border-border hover:border-text-secondary bg-surface text-text-faint hover:text-success"
                        )}
                        aria-label="Mark done"
                      >
                        {isCompleting && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className={cn(
                          "text-[14px] font-medium truncate text-text-primary transition-all duration-300",
                          isCompleting && "text-text-muted line-through"
                        )}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2">
                          {proj && (
                            <span className="text-[12px] text-text-muted">
                              {proj.name}
                            </span>
                          )}
                          {task.estimateMinutes && (
                            <span className="text-[11px] text-text-faint">
                              · {task.estimateMinutes}m
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: URGENCY_COLOR[task.urgency] }}
                          title={URGENCY_LABEL[task.urgency]}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleFocusTask(task);
                          }}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[12px] px-2 py-1 rounded-[8px] bg-surface-raised text-text-muted hover:text-text-primary btn-interactive"
                          style={{ transition: `opacity var(--motion-fast) var(--ease-out), background var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out)` }}
                        >
                          <Timer size={12} />
                          Focus
                        </button>
                      </div>
                    </div>
                    {i < todayTasks.length - 1 && (
                      <div className="mx-5 h-px border-t border-border-subtle" />
                    )}
                  </div>
                );
              })}

              {doneTasks.length > 0 && (
                <>
                  {todayTasks.length > 0 && (
                    <div className="mx-5 h-px border-t border-border-subtle" />
                  )}
                  <div className="px-5 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-text-faint">
                    Completed ({doneTasks.length})
                  </div>
                  {doneTasks.slice(0, 3).map((task, i) => {
                    const proj = projects.find((p) => p.id === task.projectId);
                    const isReopening = reopeningTasks[task.id];
                    return (
                      <div key={task.id} className={cn(isReopening && "opacity-50 transition-opacity duration-300")}>
                        <div className="flex items-start gap-3 px-5 py-3">
                          <button
                            onClick={() => handleReopenTask(task.id)}
                            disabled={isReopening}
                            className={cn(
                              "mt-0.5 shrink-0 flex items-center justify-center w-[18px] h-[18px] rounded-[5px] border-2 transition-all duration-150",
                              isReopening
                                ? "border-border bg-surface"
                                : "border-success bg-success animate-checkbox-pop"
                            )}
                            aria-label="Mark undone"
                          >
                            {!isReopening && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <p className={cn(
                              "text-[14px] truncate text-text-faint",
                              !isReopening && "line-through"
                            )}>
                              {task.title}
                            </p>
                            {proj && (
                              <span className="text-[12px] text-text-faint">
                                {proj.name}
                              </span>
                            )}
                          </div>
                        </div>
                        {i < Math.min(doneTasks.length, 3) - 1 && (
                          <div className="mx-5 h-px border-t border-border-subtle" />
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="mt-auto px-5 py-3 border-t border-border-subtle">
              <Link
                href="/tasks"
                className="flex items-center justify-between text-[13px] transition-colors text-text-muted hover:text-text-primary"
              >
                View all tasks
                <CaretRight size={14} aria-hidden />
              </Link>
            </div>
          </section>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            <TodayWorkLogCard
              confirmedCount={todaySessions.length}
              draftCount={todayDraftSessions.length}
              billableCents={todayBillableCents}
            />

            {/* Quick actions */}
            <section className="rounded-lg p-5 flex flex-col gap-3" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint">
                Quick Actions
              </h2>
              <div className="flex flex-col gap-2">
                <QuickAction
                  icon={<Plus size={15} />}
                  label="New Task"
                  onClick={() => setOpenAdd(true)}
                />
                <QuickAction
                  icon={<Timer size={15} />}
                  label="Start Focus Session"
                  href="/timer"
                />
                <QuickAction
                  icon={<CalendarIcon size={15} aria-hidden />}
                  label="View Reports"
                  href="/report"
                />
                <QuickAction
                  icon={<Lightning size={15} aria-hidden />}
                  label="Manage Projects"
                  href="/projects"
                />
              </div>
            </section>

            {/* Project breakdown */}
            <section className="rounded-lg p-5 flex flex-col gap-4" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint">
                  Projects
                </h2>
                <Link
                  href="/report"
                  className="text-[12px] transition-colors text-text-faint hover:text-text-muted"
                >
                  See report
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                {projects.filter((proj) => !(proj.archived || proj.status === "archived")).map((proj) => {
                  const projTasks = tasks.filter((t) => t.projectId === proj.id);
                  const done = projTasks.filter((t) => t.status === "done").length;
                  const pct = projTasks.length > 0 ? (done / projTasks.length) * 100 : 0;
                  const client = proj.clientId
                    ? clients.find((c) => c.id === proj.clientId)
                    : undefined;
                  return (
                    <div key={proj.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: getProjectColor(proj.color).hex }}
                          />
                          <span className="text-[13px] font-medium text-text-primary">
                            {proj.name}
                          </span>
                        </div>
                        <span className="text-[12px] text-text-muted">
                          {done}/{projTasks.length}
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden bg-surface-mid">
                        <div
                          className="h-full rounded-full progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: getProjectColor(proj.color).hex,
                          }}
                        />
                      </div>
                      {client && (
                        <span className="text-[11px] text-text-faint">
                          {client.name}
                        </span>
                      )}
                    </div>
                  );
                })}
                {projects.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <p className="text-[12px] text-text-faint">No projects yet.</p>
                    <Link href="/projects" className="text-[12px] text-accent hover:text-accent-hover transition-colors">
                      Create your first project
                    </Link>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
        </PageContent>
        </div>
      </div>

      <AddTaskModal open={openAdd} onClose={() => setOpenAdd(false)} />
    </PageLayout>
  );
}


function TodayWorkLogCard({
  confirmedCount,
  draftCount,
  billableCents,
}: {
  confirmedCount: number;
  draftCount: number;
  billableCents: number;
}) {
  const isClean = draftCount === 0;
  const hasWork = confirmedCount > 0 || draftCount > 0;
  const status = isClean && hasWork ? "Work log clean" : draftCount > 0 ? "Almost closed" : "Ready to start";
  const detail = isClean
    ? hasWork
      ? "Today's work is ready for reports."
      : "Confirmed sessions will appear here."
    : `${draftCount} draft${draftCount === 1 ? "" : "s"} need confirmation before they count.`;

  return (
    <section className="rounded-lg p-5 flex flex-col gap-4" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint">
            Today&apos;s Work Log
          </h2>
          <p className="mt-2 text-[18px] font-semibold leading-tight text-text-primary">{status}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-text-muted">{detail}</p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: isClean && hasWork ? "color-mix(in srgb, var(--success) 12%, transparent)" : "var(--accent-dim)", color: isClean && hasWork ? "var(--success)" : "var(--accent)" }}
          aria-hidden
        >
          {isClean && hasWork ? <CheckCircle size={18} /> : <Clock size={18} />}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <WorkLogMiniStat label="Confirmed" value={String(confirmedCount)} />
        <WorkLogMiniStat label="Drafts" value={String(draftCount)} />
        <WorkLogMiniStat label="Billable" value={formatCurrency(billableCents)} />
      </div>

      <div className="flex items-center gap-2">
        {draftCount > 0 && (
          <Link
            href="/timer"
            className="btn-interactive flex h-8 items-center justify-center rounded-lg px-3 text-[12px] font-medium"
            style={{ background: "var(--accent)", color: "var(--text-primary)" }}
          >
            Review drafts
          </Link>
        )}
        <Link
          href="/report"
          className="btn-interactive flex h-8 items-center justify-center rounded-lg px-3 text-[12px] font-medium bg-surface-mid text-text-secondary hover:text-text-primary"
        >
          View report
        </Link>
      </div>
    </section>
  );
}

function WorkLogMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md px-3 py-2" style={{ background: "var(--surface-mid)" }}>
      <p className="truncate text-[11px] text-text-faint">{label}</p>
      <p className="mt-1 truncate text-[13px] font-semibold tabular-nums text-text-primary">{value}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  index = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  index?: number;
}) {
  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-2.5 relative animate-fade-up stagger card-interactive"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", "--index": index } as React.CSSProperties}
    >
      <div
        className="absolute top-4 right-4 p-1.5 rounded-[7px]"
        style={{ background: "var(--accent-dim)" }}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1 pr-10">
        <span
          className="text-[22px] font-semibold leading-none tracking-[-0.03em]"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </span>
        <span className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
      </div>
      <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
        {sub}
      </span>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls =
    "btn-interactive flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium w-full text-left bg-surface-mid text-text-secondary hover:text-text-primary hover:bg-surface";

  if (href) {
    return (
      <Link href={href} className={cls}>
        <span className="text-text-muted">{icon}</span>
        {label}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      <span className="text-text-muted">{icon}</span>
      {label}
    </button>
  );
}
