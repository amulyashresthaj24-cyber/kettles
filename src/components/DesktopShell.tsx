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
import { petSignal, onPetPoke, onPetControl, petTracking } from "@/lib/pet";
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
  // Global timer completion (Sound + Notification)
  // -----------------------------------------------------------------------
  const notifiedSessionIdRef = useRef<string | null>(null);
  const notifiedCompletedRef = useRef<boolean>(false);
  const lastMessageTriggerTimeRef = useRef<number>(Date.now());
  const customMessageRef = useRef<string | null>(null);
  const messageTimeRef = useRef<number>(0);

  const playKettleWhistle = useCallback(() => {
    const enabled = useApp.getState().preferences?.whistleSoundEnabled !== false;
    if (!enabled) return;
    try {
      const audio = new Audio("/sounds/kettle-whistle.ogg");
      audio.volume = 0.22;
      void audio.play();
      window.setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 1800);
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }, []);

  useEffect(() => {
    if (!activeSession || activeSession.state !== "running" || activeSession.paused) {
      notifiedCompletedRef.current = false;
      return;
    }

    if (notifiedSessionIdRef.current !== activeSession.id) {
      notifiedSessionIdRef.current = activeSession.id;
      notifiedCompletedRef.current = false;
    }

    const task = tasks.find((t) => t.id === activeSession.taskId);
    if (!task || !task.estimateMinutes) return;

    const estimateSec = task.estimateMinutes * 60;

    const checkCompletion = () => {
      const elapsed = sessionElapsed(activeSession);
      if (elapsed >= estimateSec && !notifiedCompletedRef.current) {
        notifiedCompletedRef.current = true;
        playKettleWhistle();

        const taskTitle = task.title || "Focus session";
        const name = useApp.getState().user?.name ?? "there";
        const title = "Focus session complete!";
        const body = `Incredible job, ${name}! Your ${task.estimateMinutes}m on "${taskTitle}" is done — let's stand up and stretch together!`;

        if (isDesktop()) {
          showDesktopNotification(title, body);
        } else {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(title, { body });
          }
        }
      }
    };

    checkCompletion();
    const intervalId = window.setInterval(checkCompletion, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeSession, tasks, playKettleWhistle]);

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

    let cancelled = false;

    const setup = async () => {
      const unShortcut = await listen<string>("shortcut-action", handleShortcut);
      if (cancelled) { unShortcut(); return; }
      unlistenRefs.current.push(unShortcut);

      const unIdle = await listen<number>("idle-detected", handleIdle);
      if (cancelled) { unIdle(); return; }
      unlistenRefs.current.push(unIdle);

      const unPoke = await onPetPoke(() => {
        invoke("exit_mini_mode");
      });
      if (cancelled) { unPoke(); return; }
      unlistenRefs.current.push(unPoke);

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
      if (cancelled) { unControl(); return; }
      unlistenRefs.current.push(unControl);
    };

    setup();

    return () => {
      cancelled = true;
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
  // Global cursor tracking — drives the pet's sightline + click-through gate
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop()) return;
    petTracking(true);
    return () => {
      petTracking(false);
    };
  }, []);

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
      const now = Date.now();
      const isRunning = activeSession && activeSession.state === "running" && !activeSession.paused;
      const intervalMs = isRunning ? 180000 : 120000; // 3 mins (running), 2 mins (idle)

      let activeMsg = customMessageRef.current;
      let triggerWave = false;

      if (activeMsg && now - messageTimeRef.current > 8000) {
        customMessageRef.current = null;
        activeMsg = null;
      }

      if (!customMessageRef.current && now - lastMessageTriggerTimeRef.current > intervalMs) {
        lastMessageTriggerTimeRef.current = now;
        messageTimeRef.current = now;

        const name = useApp.getState().user?.name ?? "there";

        const runningMsgs = [
          `Time to focus, ${name}!`,
          `You're doing great, ${name} — keep going!`,
          "Stay focused!",
          `You got this, ${name}!`,
          "Remember to sit straight!",
          `Let's smash this goal, ${name}!`,
          "Every second counts!",
          "Deep breath, you're in control.",
          "Focus mode: activated!"
        ];
        const idleMsgs = [
          `Ready when you are, ${name}!`,
          `Let's start a session, ${name}!`,
          "What's our next goal?",
          `${name}, are you still there?`,
          "Ready for the next challenge?",
          `Let's do some work, ${name}!`
        ];

        const msgs = isRunning ? runningMsgs : idleMsgs;
        const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
        customMessageRef.current = randomMsg;
        activeMsg = randomMsg;
        triggerWave = true;
      }

      if (!activeSession) {
        const doingCount = tasks.filter((task) => task.status === "doing").length;
        petSignal({
          phase: "idle",
          source: activeMsg || (doingCount > 0
            ? `${doingCount} task${doingCount === 1 ? "" : "s"} in progress`
            : "Ready to focus"),
          detail: "00:00:00",
          event: triggerWave ? ("hover" as any) : undefined,
        });
        return;
      }

      const task = tasks.find((t) => t.id === activeSession.taskId);
      const isComplete = activeSession.state === "finishing";
      const isPaused = activeSession.paused || activeSession.state === "paused";

      const elapsed = sessionElapsed(activeSession);
      const estimateMinutes = task?.estimateMinutes || 0;
      const estimateSec = estimateMinutes * 60;

      let detailStr = "";
      if (estimateSec > 0) {
        if (elapsed > estimateSec) {
          detailStr = `+${formatHMS(elapsed - estimateSec)}`;
        } else {
          detailStr = formatHMS(estimateSec - elapsed);
        }
      } else {
        detailStr = formatHMS(elapsed);
      }

      petSignal({
        phase: isComplete ? "finished" : isPaused ? "paused" : "running",
        source: activeMsg || (task?.title || "Focus session"),
        detail: detailStr,
        event: triggerWave ? ("hover" as any) : undefined,
      });
    };

    syncPetStatus();
    const intervalId = window.setInterval(syncPetStatus, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeSession, tasks]);

  // This component renders nothing
  return null;
}
