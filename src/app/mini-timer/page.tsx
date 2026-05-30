"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store-supabase";
import { formatHMS } from "@/lib/format";
import { invoke, isDesktop } from "@/lib/desktop";

/**
 * Mini-timer widget page.
 * Designed for the always-on-top compact window (300x120px).
 * Shows: task name, client badge, countdown, play/pause, and restore button.
 */
export default function MiniTimerPage() {
  const router = useRouter();
  const activeSessionId = useApp((s) => s.activeSessionId);
  const sessions = useApp((s) => s.sessions);
  const tasks = useApp((s) => s.tasks);
  const projects = useApp((s) => s.projects);
  const pauseSession = useApp((s) => s.pauseSession);
  const resumeSession = useApp((s) => s.resumeSession);

  const session = sessions.find((s) => s.id === activeSessionId);
  const task = session ? tasks.find((t) => t.id === session.taskId) : null;
  const project = session ? projects.find((p) => p.id === session.projectId) : null;

  const [elapsed, setElapsed] = useState(0);

  // Timer tick
  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const base = session.durationSeconds || 0;
      if (session.state === "running" && !session.paused) {
        const sinceStart = Math.floor((Date.now() - session.startedAt) / 1000);
        setElapsed(base + sinceStart);
      } else {
        setElapsed(base);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  const isRunning = session?.state === "running" && !session?.paused;

  const handleToggle = async () => {
    if (isRunning) {
      await pauseSession();
    } else {
      await resumeSession();
    }
  };

  const handleRestore = async () => {
    if (isDesktop()) {
      await invoke("exit_mini_mode");
    }
    router.push("/timer");
  };

  if (!session) {
    return (
      <div className="mini-timer-drag mini-timer-empty">
        No active session
      </div>
    );
  }

  return (
    <div className="no-shell-padding mini-timer-drag mini-timer-main">
      {/* Top row: task + project */}
      <div className="mini-timer-top">
        {project && (
          <span className="mini-timer-project-badge">
            {project.name}
          </span>
        )}
        <span className="mini-timer-task-name">
          {task?.title || "Untitled task"}
        </span>
      </div>

      {/* Bottom row: timer + controls */}
      <div className="mini-timer-nodrag mini-timer-bottom">
        {/* Timer display */}
        <span
          className="mini-timer-clock"
          style={{
            color: isRunning ? "var(--accent, #6c63ff)" : "var(--text-primary, #fff)",
          }}
        >
          {formatHMS(elapsed)}
        </span>

        {/* Controls */}
        <div className="mini-timer-controls">
          {/* Play / Pause button */}
          <button
            onClick={handleToggle}
            className="mini-timer-btn"
            style={{
              background: isRunning ? "rgba(255,255,255,0.08)" : "var(--accent, #6c63ff)",
            }}
            title={isRunning ? "Pause" : "Resume"}
          >
            {isRunning ? "⏸" : "▶"}
          </button>

          {/* Restore to full window */}
          <button
            onClick={handleRestore}
            className="mini-timer-btn mini-timer-btn-outline"
            title="Restore full window"
          >
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
}
