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
  onStartAnother: () => void;
  onViewLedger: () => void;
  onBackToDashboard: () => void;
}

export function TaskFinishedState({
  taskName,
  projectName,
  clientName,
  sessionDurationSeconds,
  totalLoggedSeconds,
  notesCount = 0,
  onStartAnother,
  onViewLedger,
  onBackToDashboard,
}: TaskFinishedStateProps) {
  const projectClient = [projectName, clientName].filter(Boolean).join(" / ") || "No project";

  return (
    <section
      className="task-finished-state mx-auto flex min-h-[520px] w-full max-w-[760px] items-center justify-center px-4 py-10"
      aria-labelledby="task-finished-title"
      role="status"
      aria-live="polite"
    >
      <div
        className="task-finished-card relative flex w-full flex-col items-center gap-6 overflow-hidden rounded-lg px-5 py-8 text-center sm:px-8"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="task-finished-glow absolute left-1/2 top-12 h-24 w-24 -translate-x-1/2 rounded-full" aria-hidden />

        <div className="task-finished-seal relative flex h-14 w-14 items-center justify-center" aria-hidden>
          <svg className="h-14 w-14" viewBox="0 0 56 56" fill="none">
            <circle
              className="task-finished-ring"
              cx="28"
              cy="28"
              r="21"
              stroke="var(--accent)"
              strokeWidth="1.5"
            />
            <path
              className="task-finished-check"
              d="M19.5 28.5L25.5 34.5L37 22.5"
              stroke="var(--accent-hover)"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h1 id="task-finished-title" className="text-[26px] font-semibold leading-tight text-text-primary">
            Task completed.
          </h1>
          <p className="text-[14px] text-text-muted">
            Your work has been saved to the ledger.
          </p>
        </div>

        <dl
          className="task-finished-summary grid w-full max-w-[560px] grid-cols-1 gap-2 rounded-lg p-3 text-left sm:grid-cols-2"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
        >
          <SummaryItem label="Task" value={taskName} />
          <SummaryItem label="Project / client" value={projectClient} />
          <SummaryItem label="Session duration" value={formatHMS(sessionDurationSeconds)} mono />
          <SummaryItem label="Total logged time" value={formatDuration(totalLoggedSeconds)} mono />
          {notesCount > 0 && <SummaryItem label="Notes" value={`${notesCount} note${notesCount === 1 ? "" : "s"}`} />}
        </dl>

        <div className="flex w-full flex-col-reverse items-stretch justify-center gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button variant="ghost" onClick={onBackToDashboard}>
            Back to dashboard
          </Button>
          <Button variant="secondary" onClick={onViewLedger}>
            View ledger entry
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
    <div className="min-w-0 rounded-md px-3 py-2" style={{ background: "var(--surface-mid)" }}>
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">{label}</dt>
      <dd className={`mt-1 truncate text-[13px] font-medium text-text-primary ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
