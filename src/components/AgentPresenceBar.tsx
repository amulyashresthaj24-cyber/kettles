"use client";

/**
 * M2 — agent presence on /timer.
 *
 * When an agent is working: simple timer-like card with task name (if known),
 * elapsed time, and an "AI working" chip.
 * When idle: compact row + manual toggle for tools without hooks.
 */

import { useCallback, useEffect, useState } from "react";
import { Robot } from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import {
  MANUAL_AGENT_RUN_ID,
  agentDisplayName,
  isManualAgentActive,
  listDetectedAgents,
  listLiveAgentLines,
  listLiveAgents,
  summarizeLiveAgents,
} from "@/lib/agent-runs";
import { isDesktop, setManualAgentActive } from "@/lib/desktop";
import { formatHMS } from "@/lib/format";
import { elapsedSecondsFor } from "@/lib/session-timeline";

export function AgentPresenceBar() {
  const agentRuns = useApp((s) => s.agentRuns);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const sessions = useApp((s) => s.sessions);
  const tasks = useApp((s) => s.tasks);
  const beginAgentRun = useApp((s) => s.beginAgentRun);
  const endAgentRun = useApp((s) => s.endAgentRun);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  const live = listLiveAgents(agentRuns);
  const detected = listDetectedAgents(agentRuns);
  const hookDetected = detected.length > 0;
  const manualOn = isManualAgentActive(agentRuns);
  const aiWorking = live.length > 0;
  const summary = summarizeLiveAgents(agentRuns);

  const session = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId)
    : undefined;
  const task = session?.taskId
    ? tasks.find((t) => t.id === session.taskId)
    : undefined;
  // Prefer live session task; fall back to agent label / first detected label.
  const taskTitle =
    task?.title
    || detected[0]?.label
    || live[0]?.label
    || undefined;

  // Tick while AI is working so clocks stay live.
  useEffect(() => {
    if (!aiWorking) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [aiWorking]);

  const now = Date.now();
  const sessionElapsed =
    session && (session.state === "running" || session.state === "paused" || session.state === "finishing")
      ? session.paused || session.state === "paused"
        ? session.durationSeconds || 0
        : elapsedSecondsFor(session)
      : null;

  // Primary clock: session timer if one is open, else longest live agent span.
  const agentElapsed = live.length
    ? Math.max(
        ...live.map((r) => Math.max(0, Math.floor((now - r.startedAt) / 1000)))
      )
    : 0;
  const clockSecs = sessionElapsed != null ? sessionElapsed : agentElapsed;

  // One row per concurrent run. Two agents in two repos have two clocks; a
  // merged "2 agents running" hides which one is which and when each started.
  const lines = listLiveAgentLines(agentRuns, now);
  const multi = lines.length > 1;

  const toggleManual = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const next = !manualOn;
    try {
      if (isDesktop()) {
        await setManualAgentActive(next);
      } else if (next) {
        beginAgentRun({
          runId: MANUAL_AGENT_RUN_ID,
          agent: "manual",
          label: "AI running",
        });
      } else {
        endAgentRun(MANUAL_AGENT_RUN_ID, "ok");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, manualOn, beginAgentRun, endAgentRun]);

  // ── AI working: simple timer-like surface ──────────────────────────────
  if (aiWorking) {
    return (
      <section
        className="flex w-full flex-col gap-4 rounded-xl px-5 py-5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "var(--accent-soft, var(--surface-raised))",
                color: "var(--accent)",
              }}
            >
              <Robot size={20} weight="fill" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
                  style={{
                    background: "var(--accent)",
                    color: "var(--text-primary)",
                  }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: "var(--text-primary)" }}
                    aria-hidden
                  />
                  {multi ? `${lines.length} AI working` : "AI working"}
                </span>
                {hookDetected ? (
                  <span className="text-[11px] text-text-muted">detected</span>
                ) : manualOn ? (
                  <span className="text-[11px] text-text-muted">manual</span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-[15px] font-semibold text-text-primary">
                {taskTitle || summary || "Agent run"}
              </p>
              {taskTitle && summary ? (
                <p className="truncate text-[12px] text-text-muted">{summary}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <p
              className="font-mono text-[28px] font-semibold tabular-nums leading-none tracking-tight text-text-primary"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatHMS(clockSecs)}
            </p>
            <p className="text-[11px] text-text-muted">
              {sessionElapsed != null ? "session timer" : "agent time"}
            </p>
          </div>
        </div>

        {multi ? (
          <ul className="flex flex-col gap-1.5 border-t border-border pt-3">
            {lines.map((l) => (
              <li
                key={l.runId}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                style={{ background: "var(--surface-raised)" }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full"
                    style={{ background: "var(--accent)" }}
                    aria-hidden
                  />
                  <span className="truncate text-[13px] font-semibold text-text-primary">
                    {l.name}
                  </span>
                  {l.label ? (
                    <span className="truncate text-[12px] text-text-muted">
                      {l.label}
                    </span>
                  ) : null}
                  {l.manual ? (
                    <span className="shrink-0 text-[11px] text-text-muted">
                      manual
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-[13px] tabular-nums text-text-secondary">
                    {formatHMS(l.elapsedSeconds)}
                  </span>
                  {l.manual ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleManual()}
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary transition-colors disabled:opacity-60"
                      style={{ border: "1px solid var(--border)" }}
                    >
                      End
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-[11px] text-text-muted">
            Idle auto-pause is off while AI is working
          </p>
          {manualOn && !multi ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleManual()}
              className="rounded-full px-3 py-1 text-[11px] font-semibold text-text-secondary transition-colors disabled:opacity-60"
              style={{ border: "1px solid var(--border)" }}
            >
              End manual
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  // ── Idle: compact debug + manual toggle ────────────────────────────────
  return (
    <div
      className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "var(--surface-raised)",
            color: "var(--text-muted)",
          }}
        >
          <Robot size={16} weight="regular" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-text-primary">
            No AI working
          </p>
          <p className="text-[11px] text-text-muted">
            Hooks light this up automatically · or use manual for unhooked tools
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void toggleManual()}
        className="shrink-0 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-60"
        style={{
          background: "var(--surface-raised)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
        }}
        title="Mark AI running without hooks"
      >
        Manual AI
      </button>
    </div>
  );
}
