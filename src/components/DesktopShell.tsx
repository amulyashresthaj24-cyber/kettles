"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  isDesktop,
  listen,
  invoke,
  setIdleDetectionEnabled,
  showDesktopNotification,
} from "@/lib/desktop";
import { useApp } from "@/lib/store-supabase";
import type { Session } from "@/lib/types";
import { petSignal, onPetPoke, onPetControl } from "@/lib/pet";
import { formatHMS } from "@/lib/format";

/** Coarse timer phase used to drive pet overlay animations. */
type PetPhase = "none" | "running" | "paused" | "finishing";

function petPhase(s?: Session): PetPhase {
  if (!s) return "none";
  if (s.state === "finishing") return "finishing";
  if (s.paused || s.state === "paused") return "paused";
  if (s.state === "running") return "running";
  return "none"; // confirmed / draft
}

function sessionElapsed(s: Session): number {
  const base = s.durationSeconds || 0;
  if (s.state === "running" && !s.paused) {
    return base + Math.floor((Date.now() - s.startedAt) / 1000);
  }
  return base;
}

/**
 * DesktopShell – Hooks into Tauri desktop features:
 *   • Global shortcut events from Rust
 *   • Idle detection events
 *   • System tray timer sync
 *   • Pet overlay animations + click-to-restore
 *
 * Renders nothing visible; purely side-effect driven.
 */
export function DesktopShell() {
  const activeSessionId = useApp((s) => s.activeSessionId);
  const sessions = useApp((s) => s.sessions);
  const tasks = useApp((s) => s.tasks);
  const pauseSession = useApp((s) => s.pauseSession);
  const resumeSession = useApp((s) => s.resumeSession);
  const finishSession = useApp((s) => s.finishSession);
  const confirmSession = useApp((s) => s.confirmSession);
  const discardSession = useApp((s) => s.discardSession);
  const autoPauseOnIdleEnabled = useApp((s) => s.preferences?.autoPauseOnIdleEnabled !== false);
  const unlistenRefs = useRef<Array<() => void>>([]);
  const prevPhaseRef = useRef<PetPhase>("none");

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // -----------------------------------------------------------------------
  // Global shortcut handler (from Rust backend)
  // -----------------------------------------------------------------------
  const handleShortcut = useCallback(
    async (action: string) => {
      switch (action) {
        case "toggle_timer":
          if (!activeSession) return;
          if (activeSession.paused || activeSession.state === "paused") {
            await resumeSession();
          } else {
            await pauseSession();
          }
          break;

        case "toggle_mini_mode":
          await invoke("toggle_mini_mode");
          break;

        case "quick_capture":
          await invoke("show_quick_capture");
          break;

        default:
          break;
      }
    },
    [activeSession, pauseSession, resumeSession]
  );

  // -----------------------------------------------------------------------
  // Idle detection handler (from Rust backend)
  // -----------------------------------------------------------------------
  const handleIdle = useCallback(
    async (idleSeconds: number) => {
      if (!autoPauseOnIdleEnabled) return;
      if (!activeSession) return;
      if (activeSession.state !== "running") return;

      // Auto-pause the session when idle threshold is reached
      await pauseSession();

      // Notify user via Rust notification
      await showDesktopNotification(
        "Timer Paused",
        `You've been inactive for ${Math.floor(idleSeconds / 60)} minutes. Your timer has been paused.`
      );
    },
    [activeSession, autoPauseOnIdleEnabled, pauseSession]
  );

  // -----------------------------------------------------------------------
  // Set up event listeners
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop()) return;

    const setup = async () => {
      // Listen for global shortcut events from Rust
      const unShortcut = await listen<string>("shortcut-action", handleShortcut);
      unlistenRefs.current.push(unShortcut);

      // Listen for idle detection events from Rust
      const unIdle = await listen<number>("idle-detected", handleIdle);
      unlistenRefs.current.push(unIdle);

      // Pet click → restore the full window from mini mode
      const unPoke = await onPetPoke(() => {
        invoke("exit_mini_mode");
      });
      unlistenRefs.current.push(unPoke);

      // Pet controls (play/pause, complete/done, save/confirm, discard)
      const unControl = await onPetControl(async (action) => {
        switch (action) {
          case "toggle":
            await handleShortcut("toggle_timer");
            break;
          case "complete":
            await finishSession();
            break;
          case "confirm":
            await confirmSession();
            break;
          case "discard":
            await discardSession();
            break;
          default:
            break;
        }
      });
      unlistenRefs.current.push(unControl);
    };

    setup();

    return () => {
      unlistenRefs.current.forEach((fn) => fn());
      unlistenRefs.current = [];
    };
  }, [handleShortcut, handleIdle, finishSession, confirmSession, discardSession]);

  // -----------------------------------------------------------------------
  // Sync desktop idle preference to the native idle detection loop
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop()) return;
    setIdleDetectionEnabled(autoPauseOnIdleEnabled);
  }, [autoPauseOnIdleEnabled]);

  // -----------------------------------------------------------------------
  // Sync active session state to tray icon (Rust backend)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop()) return;

    if (activeSession && activeSession.state === "running") {
      invoke("set_tray_state", { state: "running" });
    } else if (activeSession && (activeSession.paused || activeSession.state === "paused")) {
      invoke("set_tray_state", { state: "paused" });
    } else {
      invoke("set_tray_state", { state: "idle" });
    }
  }, [activeSession]);

  // -----------------------------------------------------------------------
  // Drive pet overlay animations from timer state transitions
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop()) return;
    const next = petPhase(activeSession);
    const prev = prevPhaseRef.current;
    if (next === prev) return;

    const taskTitle = tasks.find((t) => t.id === activeSession?.taskId)?.title;

    if (prev === "none" && next === "running") {
      petSignal({ event: "timerStart", phase: "running", source: taskTitle || "Focus session", detail: "00:00:00" });
    } else if (next === "running" && (prev === "paused" || prev === "finishing")) {
      petSignal({ event: "timerResume", phase: "running" });
    } else if (prev === "running" && next === "paused") {
      petSignal({ event: "timerPause", phase: "paused" });
    } else if (next === "finishing" && (prev === "running" || prev === "paused")) {
      petSignal({ event: "timerFinish", phase: "finished", source: taskTitle || "Focus session", detail: taskTitle });
    } else if (next === "none" && (prev === "running" || prev === "paused")) {
      petSignal({ event: "timerAbandon", phase: "idle" });
    }
    // finishing → none: silent — timerFinish already signalled

    prevPhaseRef.current = next;
  }, [activeSession, tasks]);

  // -----------------------------------------------------------------------
  // Keep the compact pet status bubble live while mini mode is open
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop()) return;

    const syncPetStatus = () => {
      if (!activeSession) {
        const doingCount = tasks.filter((task) => task.status === "doing").length;
        petSignal({
          phase: "idle",
          source: doingCount > 0
            ? `${doingCount} task${doingCount === 1 ? "" : "s"} in progress`
            : "Ready to focus",
          detail: "00:00:00",
        });
        return;
      }

      const task = tasks.find((t) => t.id === activeSession.taskId);
      const isComplete = activeSession.state === "finishing";
      const isPaused = activeSession.paused || activeSession.state === "paused";

      petSignal({
        phase: isComplete ? "finished" : isPaused ? "paused" : "running",
        source: task?.title || "Focus session",
        detail: formatHMS(sessionElapsed(activeSession)),
      });
    };

    syncPetStatus();
    const intervalId = window.setInterval(syncPetStatus, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeSession, tasks]);

  // This component renders nothing
  return null;
}
