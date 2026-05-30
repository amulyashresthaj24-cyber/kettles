"use client";

import { ArrowRight } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { formatDuration, formatHMS } from "@/lib/format";

interface TaskFinishedStateProps {
  taskName: string;
  projectName?: string;
  clientName?: string;
  sessionDurationSeconds: number;
  totalLoggedSeconds: number;
  notesCount?: number;
  sessionCount?: number;
  projectProgressLabel?: string;
  reflection?: string;
  isCompleted?: boolean;
  onStartAnother: () => void;
  onViewWorkLog: () => void;
  onBackToDashboard: () => void;
}

export function TaskFinishedState({
  taskName,
  projectName,
  clientName,
  sessionDurationSeconds,
  totalLoggedSeconds,
  notesCount = 0,
  sessionCount = 1,
  projectProgressLabel,
  reflection,
  isCompleted = false,
  onStartAnother,
  onViewWorkLog,
  onBackToDashboard,
}: TaskFinishedStateProps) {
  const projectClient = [projectName, clientName].filter(Boolean).join(" / ") || "No project";
  const headline = isCompleted ? "Task completed" : "Session logged";
  const subline = isCompleted
    ? (projectName ? `${taskName} is done for ${projectName}. Nice work.` : `${taskName} is done. Nice work.`)
    : (projectName ? `Progress logged on ${taskName} for ${projectName}.` : `Progress logged on ${taskName}.`);

  return (
    <section
      className="task-finished-state mx-auto flex min-h-[560px] w-full max-w-[640px] items-center justify-center px-4 py-10"
      aria-labelledby="task-finished-title"
      role="status"
      aria-live="polite"
    >
      <div
        className="task-finished-card relative flex w-full flex-col items-center gap-7 overflow-hidden rounded-2xl px-6 py-12 text-center sm:px-12"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="task-finished-glow absolute left-1/2 top-6 h-44 w-44 -translate-x-1/2 rounded-full" aria-hidden />

        <div className="task-finished-seal relative flex h-20 w-20 items-center justify-center" aria-hidden>
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: "var(--accent-dim)" }}
          />
          <svg className="relative h-20 w-20" viewBox="0 0 56 56" fill="none">
            <circle
              className="task-finished-ring"
              cx="28"
              cy="28"
              r="21"
              stroke="var(--accent)"
              strokeWidth="2"
            />
            <path
              className="task-finished-check"
              d="M19.5 28.5L25.5 34.5L37 22.5"
              stroke="var(--accent-hover)"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="relative flex flex-col gap-2">
          <h1 id="task-finished-title" className="text-[32px] font-semibold leading-tight text-text-primary">
            {headline}
          </h1>
          <p className="text-[15px] text-text-secondary">{subline}</p>
        </div>

        <dl
          className="task-finished-summary relative grid w-full max-w-[440px] grid-cols-2 gap-2.5"
        >
          <SummaryItem label="This session" value={formatHMS(sessionDurationSeconds)} mono />
          <SummaryItem label="Total logged" value={formatDuration(totalLoggedSeconds)} mono />
          <SummaryItem label="Sessions" value={`${sessionCount}`} mono />
          <SummaryItem
            label={notesCount > 0 ? "Notes captured" : "Project / client"}
            value={notesCount > 0 ? `${notesCount} note${notesCount === 1 ? "" : "s"}` : projectClient}
          />
          {projectProgressLabel && (
            <div className="col-span-2">
              <SummaryItem label="Project progress" value={projectProgressLabel} />
            </div>
          )}
        </dl>

        {reflection && (
          <p className="relative max-w-[440px] text-[13px] italic text-text-muted">{reflection}</p>
        )}

        <div className="relative flex w-full flex-col-reverse items-stretch justify-center gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button variant="ghost" onClick={onBackToDashboard}>
            Back to dashboard
          </Button>
          <Button variant="secondary" onClick={onViewWorkLog}>
            View work log
          </Button>
          <Button variant="primary" onClick={onStartAnother}>
            Start another session <ArrowRight size={14} aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}

function SummaryItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      className="min-w-0 rounded-lg px-4 py-3 text-left"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
    >
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">{label}</dt>
      <dd className={`mt-1 truncate text-[15px] font-semibold text-text-primary ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
