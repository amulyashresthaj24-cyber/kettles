"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Square, Zap, Clock, Search, ChevronDown, ChevronUp, Plus, AtSign } from "lucide-react";
import { useApp } from "@/lib/store-supabase";
import { formatHMS, formatDuration } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { UrgencyDot } from "@/components/UrgencyDot";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import type { Task } from "@/lib/types";

const URGENCY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;


const FOCUS_RING_SIZE = 280;
const FOCUS_RING_R = 130;
const FOCUS_RING_CIRC = 2 * Math.PI * FOCUS_RING_R;

export default function TimerPage() {
  const router = useRouter();
  const user = useApp((s) => s.user);
  const tasks = useApp((s) => s.tasks);
  const projects = useApp((s) => s.projects);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const session = useApp((s) =>
    activeSessionId ? s.sessions.find((x) => x.id === activeSessionId) : undefined
  );
  const startSession = useApp((s) => s.startSession);
  const pauseSession = useApp((s) => s.pauseSession);
  const resumeSession = useApp((s) => s.resumeSession);
  const stopSession = useApp((s) => s.stopSession);
  const adjust = useApp((s) => s.adjustSessionDuration);

  const [taskId, setTaskId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [billable, setBillable] = useState(true);
  const [estimateMin, setEstimateMin] = useState<string>("");
  const [completed, setCompleted] = useState<{ id: string; seconds: number } | null>(null);
  const [, setTick] = useState(0);

  const activeTask = session
    ? tasks.find((t) => t.id === session.taskId)
    : tasks.find((t) => t.id === taskId);
  const activeProject = session
    ? projects.find((p) => p.id === session.projectId)
    : projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (taskId) {
      const t = tasks.find((x) => x.id === taskId);
      if (t && !projectId) setProjectId(t.projectId);
      if (t?.estimateMinutes && !estimateMin)
        setEstimateMin(String(t.estimateMinutes));
    }
  }, [taskId, tasks, projectId, estimateMin]);

  useEffect(() => {
    if (!session || session.paused) return;
    const i = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [session]);

  const elapsed = session
    ? session.durationSeconds +
      (session.paused ? 0 : Math.floor((Date.now() - session.startedAt) / 1000))
    : 0;

  const estimateSec = estimateMin ? Number(estimateMin) * 60 : 0;
  const progress = estimateSec > 0 ? Math.min(elapsed / estimateSec, 1) : 0;
  const isOvertime = estimateSec > 0 && elapsed > estimateSec;
  const remaining = estimateSec > 0 ? Math.max(estimateSec - elapsed, 0) : null;

const focusRingOffset = FOCUS_RING_CIRC * (1 - progress);

  const quickPick = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "done")
        .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency])
        .slice(0, 6),
    [tasks]
  );

  const handleStart = async () => {
    if (!taskId) return;
    await startSession(taskId, billable);
  };

  const handleStop = async () => {
    const s = await stopSession();
    if (s) setCompleted({ id: s.id, seconds: s.durationSeconds });
  };

  const handleQuickStart = async (t: Task) => {
    setTaskId(t.id);
    setProjectId(t.projectId);
    if (t.estimateMinutes) setEstimateMin(String(t.estimateMinutes));
    await startSession(t.id);
  };

  const isRunning = session && !session.paused;

  return (
    <div className="flex w-full flex-col gap-10">
      {/* Header — only before start */}
      {!session && (
        <header className="flex flex-col gap-1.5">
          <h1 className="text-[32px] font-semibold leading-[1.25] tracking-[-0.01em] text-text-primary">
            Focus Mode
          </h1>
          <p className="text-[14px] text-text-muted">
            Pick a task, set an estimate, start the timer.
          </p>
        </header>
      )}

      {!session ? (
        /* ─── BEFORE TIMER STARTS ─── */
        <section
          className="relative rounded-2xl p-12 flex flex-col items-center gap-10"
          style={{ background: "var(--surface)" }}
        >
          {/* Centered sentence */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-[16px] text-text-secondary">
            <span className="font-semibold text-text-primary">{user?.name ?? "User"}</span>
            <span className="text-text-muted">is working on</span>
            <TaskTokenPicker
              tasks={tasks.filter((t) => t.status !== "done")}
              value={taskId}
              onChange={setTaskId}
              projectId={projectId}
            />
            <span className="text-text-muted">from</span>
            <ProjectTokenPicker
              projects={projects}
              value={projectId}
              onChange={setProjectId}
            />
            <BillingToggle
              billable={billable}
              onToggle={() => setBillable((b) => !b)}
            />
          </div>

          {/* Estimate selector */}
          <div className="flex flex-col items-center gap-4 w-full">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted flex items-center gap-1.5">
              <Clock size={11} />
              How long?
            </label>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {[15, 30, 45, 60, 90].map((m) => {
                const active = estimateMin === String(m);
                return (
                  <button
                    key={m}
                    onClick={() => setEstimateMin(active ? "" : String(m))}
                    className={`h-9 px-5 rounded-full text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-accent text-white"
                        : "bg-surface-raised text-text-secondary hover:bg-surface-mid hover:text-text-primary"
                    }`}
                  >
                    {m}m
                  </button>
                );
              })}
              <StepInput
                value={[15, 30, 45, 60, 90].includes(Number(estimateMin)) ? "" : estimateMin}
                onChange={setEstimateMin}
                min={1}
                max={480}
                active={!!(estimateMin && ![15, 30, 45, 60, 90].includes(Number(estimateMin)))}
              />
            </div>
          </div>

          {/* Start CTA */}
          <Button
            disabled={!taskId}
            onClick={handleStart}
            variant="primary"
            className=""
          >
            <Play size={16} />
            Start Focus
          </Button>
        </section>
      ) : (
        /* ─── AFTER TIMER STARTS — FOCUS ZONE ─── */
        <section
          className="relative rounded-2xl flex flex-col items-center justify-center gap-6"
          style={{
            padding: "2rem",
          }}
        >
          {/* Permanent sentence */}
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-[11px] uppercase tracking-[0.14em] text-text-muted font-medium">
              {user?.name ?? "User"} is working on
            </span>
            <h2
              className="font-semibold text-text-primary tracking-[-0.01em] leading-tight"
              style={{ fontSize: 22 }}
            >
              {activeTask?.title ?? "—"}
            </h2>
            {activeProject && (
              <span className="text-[12px] text-text-faint">
                from {activeProject.name}
              </span>
            )}
          </div>

          {/* Ring + timer */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: FOCUS_RING_SIZE, height: FOCUS_RING_SIZE }}
          >
            <svg width={FOCUS_RING_SIZE} height={FOCUS_RING_SIZE} className="absolute inset-0 -rotate-90">
              <defs>
                <linearGradient id="ringGradFocus" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-hover)" />
                  <stop offset="100%" stopColor="var(--accent)" />
                </linearGradient>
              </defs>
              <circle
                cx={FOCUS_RING_SIZE / 2}
                cy={FOCUS_RING_SIZE / 2}
                r={FOCUS_RING_R}
                fill="none"
                strokeWidth="3"
                stroke="var(--surface-raised)"
              />
              <circle
                cx={FOCUS_RING_SIZE / 2}
                cy={FOCUS_RING_SIZE / 2}
                r={FOCUS_RING_R}
                fill="none"
                strokeWidth="6"
                stroke={isOvertime ? "var(--error)" : "url(#ringGradFocus)"}
                strokeLinecap="round"
                strokeDasharray={FOCUS_RING_CIRC}
                strokeDashoffset={estimateSec > 0 ? focusRingOffset : FOCUS_RING_CIRC}
                style={{
                  transition: "stroke-dashoffset 1s linear, stroke 0.4s ease",
                }}
              />
            </svg>

            {isRunning && (
              <span
                className="absolute top-[4px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                style={{
                  background: isOvertime ? "var(--error)" : "var(--accent)",
                  animation: "pulse 1.4s ease-in-out infinite",
                }}
              />
            )}

            <div className="flex flex-col items-center gap-1.5 z-10">
              <span
                className="font-mono font-semibold tabular-nums leading-none"
                style={{
                  fontSize: 52,
                  letterSpacing: "-0.02em",
                  color: isOvertime ? "var(--error)" : "var(--text-primary)",
                  transition: "color 0.4s ease",
                }}
              >
                {formatHMS(elapsed)}
              </span>
              {remaining !== null ? (
                <span
                  className="text-[12px] tabular-nums font-medium"
                  style={{ color: isOvertime ? "var(--error)" : "var(--text-muted)" }}
                >
                  {remaining > 0
                    ? `${formatHMS(remaining)} left`
                    : `+${formatHMS(elapsed - estimateSec)} over`}
                </span>
              ) : (
                <span className="text-[11px] text-text-faint">
                  No estimate set
                </span>
              )}
              {estimateSec > 0 && (
                <span className="text-[10px] text-text-faint uppercase tracking-[0.08em]">
                  of {estimateMin}m
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!session.paused ? (
              <Button variant="secondary" onClick={pauseSession}>
                <Pause size={14} /> Pause
              </Button>
            ) : (
              <Button variant="primary" onClick={resumeSession}>
                <Play size={14} /> Resume
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleStop}
              className="text-error border-error/30 hover:border-error/60"
            >
              <Square size={14} /> Stop
            </Button>
          </div>
        </section>
      )}

      {/* Quick pick — only before start */}
      {!session && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">
            Or pick from your tasks
          </h2>
          <div className="flex flex-col rounded-xl overflow-hidden" style={{ background: "var(--surface)" }}>
            {quickPick.length === 0 && (
              <p className="px-5 py-4 text-[13px] text-text-muted">
                No tasks. Create one in the Tasks tab.
              </p>
            )}
            {quickPick.map((t, i) => {
              const proj = projects.find((p) => p.id === t.projectId);
              return (
                <div key={t.id}>
                  <div
                    className="group flex items-center gap-4 px-5 py-3.5 transition-colors"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-raised)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <UrgencyDot urgency={t.urgency} />
                    <span className="flex-1 truncate text-[14px] text-text-primary">
                      {t.title}
                    </span>
                    {t.estimateMinutes && (
                      <span className="text-[11px] text-text-faint tabular-nums">
                        {t.estimateMinutes}m
                      </span>
                    )}
                    <span className="text-[12px] text-text-muted">{proj?.name}</span>
                    <button
                      onClick={() => handleQuickStart(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      <Zap size={11} /> Start
                    </button>
                  </div>
                  {i < quickPick.length - 1 && (
                    <div className="mx-5 h-px" style={{ background: "var(--border-subtle)" }} />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Session complete modal */}
      {completed && (
        <SessionCompleteModal
          sessionId={completed.id}
          seconds={completed.seconds}
          onClose={() => {
            setCompleted(null);
            router.push("/");
          }}
          onAdjust={(s) => adjust(completed.id, s)}
        />
      )}
    </div>
  );
}


function StepInput({
  value, onChange, min = 1, max = 480, active,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  active?: boolean;
}) {
  const num = Number(value);

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, (num || 0) + delta));
    onChange(String(next));
  };

  return (
    <div
      className="inline-flex items-center rounded-full border overflow-hidden ml-1 transition-all"
      style={{
        background: "var(--surface-raised)",
        borderColor: active ? "var(--accent)" : "var(--border)",
        height: 40,
      }}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        className="flex items-center justify-center transition-colors"
        style={{
          width: 28,
          color: "var(--text-muted)",
          borderRight: "1px solid var(--border-subtle)",
          height: "100%",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
      >
        <ChevronDown size={12} strokeWidth={2.5} />
      </button>

      <input
        type="number"
        min={min}
        max={max}
        placeholder="custom"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-14 bg-transparent text-[13px] text-center outline-none"
        style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}
      />

      <button
        type="button"
        onClick={() => step(1)}
        className="flex items-center justify-center transition-colors"
        style={{
          width: 28,
          color: "var(--text-muted)",
          borderLeft: "1px solid var(--border-subtle)",
          height: "100%",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
      >
        <ChevronUp size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function TaskTokenPicker({
  tasks, value, onChange, projectId,
}: {
  tasks: Task[];
  value: string;
  onChange: (v: string) => void;
  projectId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = tasks.find((t) => t.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const base = projectId ? tasks.filter((t) => t.projectId === projectId) : tasks;
  const filtered = base.filter((t) =>
    !query || t.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all"
        style={{
          background: open ? "var(--accent)" : "var(--surface-raised)",
          color: open ? "#fff" : selected ? "var(--text-primary)" : "var(--text-muted)",
          borderColor: open ? "var(--accent)" : "var(--border-subtle)",
        }}
      >
        <AtSign size={12} style={{ opacity: 0.7 }} />
        <span className="max-w-[160px] truncate">
          {selected ? selected.title : "pick task…"}
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-[200] flex flex-col overflow-hidden rounded-xl border shadow-2xl"
          style={{
            minWidth: 260,
            background: "var(--surface-raised)",
            borderColor: "var(--border)",
          }}
        >
          {/* Search */}
          <div className="px-2 pt-2 pb-1">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "var(--surface-mid)", border: "1px solid var(--border-subtle)" }}
            >
              <Search size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                placeholder="Find or create a task"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-[13px] outline-none"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* List */}
          <div className="flex flex-col max-h-[220px] overflow-y-auto">
            {filtered.length > 0 && (
              <div
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "var(--text-faint)" }}
              >
                Tasks
              </div>
            )}
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.id); setOpen(false); setQuery(""); }}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors"
                style={{
                  background: t.id === value ? "var(--accent-dim)" : "transparent",
                  color: t.id === value ? "var(--accent-hover)" : "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  if (t.id !== value) (e.currentTarget as HTMLElement).style.background = "var(--surface-mid)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = t.id === value ? "var(--accent-dim)" : "transparent";
                }}
              >
                <span className="w-3.5 h-3.5 shrink-0 opacity-60">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="2" width="5" height="5" rx="1" />
                    <rect x="9" y="2" width="5" height="5" rx="1" />
                    <rect x="2" y="9" width="5" height="5" rx="1" />
                    <rect x="9" y="9" width="5" height="5" rx="1" />
                  </svg>
                </span>
                <span className="truncate">{t.title}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
                No tasks found.
              </p>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] font-medium transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-mid)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              onClick={() => setOpen(false)}
            >
              <Plus size={13} style={{ color: "var(--text-muted)" }} />
              Create task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectTokenPicker({
  projects, value, onChange,
}: {
  projects: { id: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = projects.find((p) => p.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = projects.filter((p) =>
    !query || p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all"
        style={{
          background: "var(--surface-raised)",
          color: selected ? "var(--text-primary)" : "var(--text-muted)",
          borderColor: open ? "var(--border)" : "var(--border-subtle)",
        }}
      >
        <AtSign size={12} style={{ opacity: 0.7 }} />
        <span className="max-w-[140px] truncate">
          {selected ? selected.name : "pick project…"}
        </span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-[200] flex flex-col overflow-hidden rounded-xl border shadow-2xl"
          style={{
            minWidth: 220,
            background: "var(--surface-raised)",
            borderColor: "var(--border)",
          }}
        >
          <div className="px-2 pt-2 pb-1">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "var(--surface-mid)", border: "1px solid var(--border-subtle)" }}
            >
              <Search size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                placeholder="Find project…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-[13px] outline-none"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div className="flex flex-col max-h-[200px] overflow-y-auto">
            {filtered.length > 0 && (
              <div
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "var(--text-faint)" }}
              >
                Projects
              </div>
            )}
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
              className="flex items-center px-3 py-2 text-[13px] text-left transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-mid)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              None
            </button>
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); setQuery(""); }}
                className="flex items-center px-3 py-2 text-[13px] text-left transition-colors"
                style={{
                  background: p.id === value ? "var(--accent-dim)" : "transparent",
                  color: p.id === value ? "var(--accent-hover)" : "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  if (p.id !== value) (e.currentTarget as HTMLElement).style.background = "var(--surface-mid)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = p.id === value ? "var(--accent-dim)" : "transparent";
                }}
              >
                {p.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
                No projects found.
              </p>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] font-medium transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-mid)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              onClick={() => setOpen(false)}
            >
              <Plus size={13} style={{ color: "var(--text-muted)" }} />
              Create project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BillingToggle({
  billable, onToggle, disabled,
}: {
  billable: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
        billable ? "bg-status-success/15 text-status-success" : "bg-surface-mid text-text-muted"
      } ${disabled ? "cursor-default" : "hover:opacity-80"}`}
    >
      {billable ? "$ billable" : "internal"}
    </button>
  );
}

function SessionCompleteModal({
  seconds, onClose, onAdjust,
}: {
  sessionId: string;
  seconds: number;
  onClose: () => void;
  onAdjust: (newSeconds: number) => void;
}) {
  const [showAdjust, setShowAdjust] = useState(false);
  const [minutes, setMinutes] = useState(Math.max(1, Math.round(seconds / 60)).toString());

  return (
    <Modal open onClose={onClose} title="✓ Session Logged">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl p-4" style={{ background: "var(--surface-mid)" }}>
          <p className="text-[11px] uppercase tracking-[0.06em] text-text-muted">Duration</p>
          <p className="font-mono text-[32px] font-semibold tabular-nums text-text-primary">
            {formatHMS(seconds)}
          </p>
          <p className="mt-1 text-[12px] text-text-muted">{formatDuration(seconds)}</p>
        </div>

        {!showAdjust ? (
          <div className="flex flex-col gap-2">
            <Button variant="primary" size="sm" onClick={onClose}>
              Yes — log {formatDuration(seconds)}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAdjust(true)}>
              I worked less
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] uppercase tracking-[0.04em] text-text-muted">
                Actual minutes worked
              </span>
              <Input
                type="number"
                min="1"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </label>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onAdjust(Math.max(0, Number(minutes)) * 60);
                onClose();
              }}
            >
              Log and continue
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
