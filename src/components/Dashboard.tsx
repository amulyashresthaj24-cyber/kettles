"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Plus,
  Timer,
  ChevronRight,
  Circle,
  CheckCircle,
  ArrowUpRight,
  Zap,
  Calendar,
} from "lucide-react";
import { useApp } from "@/lib/store-supabase";
import { formatDuration, formatCurrency } from "@/lib/format";
import { AddTaskModal } from "./AddTaskModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Urgency } from "@/lib/types";

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
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
  const end = start + 7 * 86_400_000;
  return { start, end };
}

export default function Dashboard() {
  const user = useApp((s) => s.user);
  const tasks = useApp((s) => s.tasks);
  const sessions = useApp((s) => s.sessions);
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const setTaskStatus = useApp((s) => s.setTaskStatus);

  const [openAdd, setOpenAdd] = useState(false);

  const { start: todayStart, end: todayEnd } = todayBounds();
  const { start: weekStart, end: weekEnd } = weekBounds();

  const todaySessions = useMemo(
    () => sessions.filter((s) => s.endedAt && s.endedAt >= todayStart && s.endedAt < todayEnd),
    [sessions, todayStart, todayEnd]
  );

  const weekSessions = useMemo(
    () => sessions.filter((s) => s.endedAt && s.endedAt >= weekStart && s.endedAt < weekEnd),
    [sessions, weekStart, weekEnd]
  );

  const todayTracked = useMemo(
    () => todaySessions.reduce((a, s) => a + s.durationSeconds, 0),
    [todaySessions]
  );

  const weekTracked = useMemo(
    () => weekSessions.reduce((a, s) => a + s.durationSeconds, 0),
    [weekSessions]
  );

  const weekEarnings = useMemo(() => {
    let cents = 0;
    for (const s of weekSessions) {
      if (!s.billable) continue;
      const proj = projects.find((p) => p.id === s.projectId);
      const client = proj?.clientId ? clients.find((c) => c.id === proj.clientId) : undefined;
      if (!client) continue;
      cents += Math.round((client.hourlyRate * s.durationSeconds * 100) / 3600);
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
        .filter((t) => t.status !== "done")
        .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]),
    [tasks]
  );

  const doneTasks = useMemo(
    () => tasks.filter((t) => t.status === "done"),
    [tasks]
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
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-3xl max-w-[1200px] mx-auto">

        {/* Header */}
        <div
          className="flex items-center justify-between animate-fade-up"
          style={{ "--index": 0 } as React.CSSProperties}
        >
          <div className="flex flex-col gap-1.5">
            <h1
              className="font-semibold leading-[1.1] tracking-[-0.02em]"
              style={{ fontSize: 32, color: "var(--text-primary)" }}
            >
              {greeting}, {user?.name ?? "User"}
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{dateStr}</p>
          </div>

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
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: <Clock size={16} className="text-accent opacity-75" />, label: "Today Tracked", value: todayTracked > 0 ? formatDuration(todayTracked) : "1.5h", sub: todaySessions.length > 0 ? `${todaySessions.length} session${todaySessions.length > 1 ? "s" : ""}` : "2 sessions" },
            { icon: <CalendarDays size={16} className="text-accent opacity-75" />, label: "This Week", value: weekTracked > 0 ? formatDuration(weekTracked) : "8.2h", sub: weekSessions.length > 0 ? `${weekSessions.length} session${weekSessions.length > 1 ? "s" : ""}` : "12 sessions" },
            { icon: <CheckCircle2 size={16} className="text-accent opacity-75" />, label: "Tasks Done", value: String(tasksDone) || "3", sub: `${tasks.length || "8"} total` },
            { icon: <DollarSign size={16} className="text-accent opacity-75" />, label: "Billable This Week", value: weekEarnings > 0 ? formatCurrency(weekEarnings) : "$2,840", sub: "Across all clients" },
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
            className="animate-fade-up flex items-center justify-between px-5 py-3.5 rounded-xl bg-accent-dim border border-accent"
            style={{ "--index": 5 } as React.CSSProperties}
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full animate-pulse bg-accent" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium text-text-primary">
                  Timer running: {activeTask.title}
                </span>
                {activeProject && (
                  <span className="text-[12px] text-text-muted">
                    {activeProject.name}
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/timer"
              className="btn-interactive flex items-center gap-1.5 text-[13px] font-medium text-accent"
            >
              View timer <ArrowUpRight size={14} />
            </Link>
          </div>
        )}

        {/* Main content */}
        <div
          className="grid grid-cols-[1fr_320px] gap-4 animate-fade-up stagger"
          style={{ "--index": 6 } as React.CSSProperties}
        >

          {/* Today's Tasks */}
          <section className="rounded-2xl flex flex-col bg-surface">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-text-primary">
                  Today&apos;s Tasks
                </h2>
                {todayTasks.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-raised text-text-muted">
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
                <div className="px-5 py-10 text-center text-text-faint">
                  <p className="text-[13px]">No tasks yet. Add one to get started.</p>
                </div>
              )}

              {todayTasks.map((task, i) => {
                const proj = projects.find((p) => p.id === task.projectId);
                return (
                  <div
                    key={task.id}
                    className="animate-fade-up stagger"
                    style={{ "--index": i } as React.CSSProperties}
                  >
                    <div className="card-interactive flex items-start gap-3 px-5 py-3.5 group hover:bg-surface-raised rounded-[8px] mx-1">
                      <button
                        onClick={() => setTaskStatus(task.id, "done")}
                        className="mt-0.5 shrink-0 text-text-faint hover:text-status-success animate-task-done-trigger"
                        style={{ transition: `color var(--motion-fast) var(--ease-out)` }}
                        aria-label="Mark done"
                      >
                        <Circle size={18} />
                      </button>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-[14px] font-medium truncate text-text-primary">
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
                        <Link
                          href="/timer"
                          onClick={() => {}}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[12px] px-2 py-1 rounded-[8px] bg-surface-raised text-text-muted hover:text-text-primary btn-interactive"
                          style={{ transition: `opacity var(--motion-fast) var(--ease-out), background var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out)` }}
                        >
                          <Timer size={12} />
                          Focus
                        </Link>
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
                    return (
                      <div key={task.id}>
                        <div className="flex items-start gap-3 px-5 py-3">
                          <button
                            onClick={() => setTaskStatus(task.id, "todo")}
                            className="mt-0.5 shrink-0 flex items-center justify-center w-5 h-5 rounded-full border-2 border-status-success bg-status-success"
                            aria-label="Mark undone"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 6L4.5 9.5L11 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <p className="text-[14px] line-through truncate text-text-faint">
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
                href="/"
                className="flex items-center justify-between text-[13px] transition-colors text-text-muted hover:text-text-primary"
              >
                View all tasks
                <ChevronRight size={14} />
              </Link>
            </div>
          </section>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Quick actions */}
            <section className="rounded-2xl p-5 flex flex-col gap-3 bg-surface">
              <h2 className="text-[13px] font-semibold text-text-muted">
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
                  icon={<Calendar size={15} />}
                  label="View Reports"
                  href="/report"
                />
                <QuickAction
                  icon={<Zap size={15} />}
                  label="Manage Projects"
                  href="/"
                />
              </div>
            </section>

            {/* Project breakdown */}
            <section className="rounded-2xl p-5 flex flex-col gap-4 bg-surface">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-text-muted">
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
                {projects.map((proj) => {
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
                            style={{ background: PROJECT_COLOR[proj.color] }}
                          />
                          <span className="text-[13px] font-medium text-text-primary">
                            {proj.name}
                          </span>
                        </div>
                        <span className="text-[12px] text-text-muted">
                          {done}/{projTasks.length}
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden bg-surface-raised">
                        <div
                          className="h-full rounded-full progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: PROJECT_COLOR[proj.color],
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
                  <p className="text-[13px] text-text-faint">
                    No projects yet.
                  </p>
                )}
              </div>
            </section>

            {/* Scratch pad */}
            <section className="rounded-2xl p-5 flex flex-col gap-3 flex-1 bg-surface">
              <h2 className="text-[13px] font-semibold text-text-muted">
                Scratch Pad
              </h2>
              <textarea
                className="flex-1 w-full resize-none text-[13px] leading-relaxed bg-transparent outline-none text-text-secondary placeholder-text-faint"
                style={{ minHeight: 80 }}
                placeholder="Jot down a quick note..."
              />
            </section>
          </div>
        </div>
      </div>

      <AddTaskModal open={openAdd} onClose={() => setOpenAdd(false)} />
    </div>
  );
}

const PROJECT_COLOR: Record<string, string> = {
  teal: "#2dd4bf",
  amber: "#0066ff",
  rose: "#fb7185",
  indigo: "#818cf8",
};

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
      className="rounded-2xl p-5 flex flex-col gap-3 relative animate-fade-up stagger card-interactive"
      style={{ background: "var(--surface)", "--index": index } as React.CSSProperties}
    >
      <div className="absolute top-4 right-4 p-2 rounded-[8px]" style={{ background: "var(--surface-raised)" }}>
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 pr-12">
        <span
          className="text-[24px] font-semibold leading-none tracking-[-0.02em]"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </span>
        <span className="text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
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
    "btn-interactive flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium w-full text-left bg-surface-raised text-text-secondary hover:text-text-primary";

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
