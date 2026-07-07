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
import { checkForDesktopUpdate } from "@/lib/updater";
import { formatHMS } from "@/lib/format";
import { createAlarmLooper } from "@/lib/alarm";
import type { AlarmSound } from "@/lib/constants";

/** Coarse timer phase used to drive pet overlay animations. */
type PetPhase = "none" | "running" | "paused" | "finishing";

function petPhase(s: Session | undefined, alarmActive: boolean): PetPhase {
  if (!s) return "none";
  if (s.state === "finishing") return "finishing";
  // Paused-at-estimate with the completion alarm ringing presents as finished
  // so the pet centers itself and shows the extend chips.
  if (alarmActive) return "finishing";
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
  const completionAlarmSessionId = useApp((s) => s.completionAlarmSessionId);
  const unlistenRefs = useRef<Array<() => void>>([]);
  const prevPhaseRef = useRef<PetPhase>("none");

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // -----------------------------------------------------------------------
  // Global timer completion — single owner of detection, auto-pause, alarm
  // audio, and pet signaling. Runs on web too (nothing desktop-gated except
  // the pet signal itself).
  // -----------------------------------------------------------------------
  const lastMessageTriggerTimeRef = useRef<number>(Date.now());
  const customMessageRef = useRef<string | null>(null);
  const messageTimeRef = useRef<number>(0);
  const lastBreakTriggerTimeRef = useRef<number>(0);
  const breakEndTimeoutRef = useRef<number | null>(null);
  const snoozeTimeoutRef = useRef<number | null>(null);
  // The watcher only dismisses a "running" alarm session after it has been
  // observed paused once — distinguishes a user resume from the brief window
  // while the auto-pause API call is still in flight.
  const alarmEngagedRef = useRef(false);

  useEffect(() => {
    if (!activeSession || activeSession.state !== "running" || activeSession.paused) return;

    const task = activeSession.taskId ? tasks.find((t) => t.id === activeSession.taskId) : undefined;
    const estimateMinutes = activeSession.estimateMinutes ?? task?.estimateMinutes;
    if (!estimateMinutes || estimateMinutes <= 0) return;
    // Latch: this target already alarmed (e.g. user chose "Keep going").
    if (estimateMinutes <= (activeSession.completionAckMinutes ?? 0)) return;

    const estimateSec = estimateMinutes * 60;
    let fired = false;

    const checkCompletion = async () => {
      if (fired || sessionElapsed(activeSession) < estimateSec) return;
      fired = true;

      // Mark first so the phase-transition effect presents "finishing" without
      // an intermediate timerPause emit while the pause request is in flight.
      useApp.getState().markCompletionAlarm(activeSession.id, estimateMinutes);

      const taskTitle = task?.title || "Focus session";
      const name = useApp.getState().user?.name ?? "there";
      const title = "Focus session complete!";
      const body = `Incredible job, ${name}! Your ${estimateMinutes}m on "${taskTitle}" is done — let's stand up and stretch together!`;

      if (isDesktop()) {
        petSignal({
          event: "timerFinish",
          phase: "finished",
          source: taskTitle,
          detail: `${estimateMinutes}m complete`,
          showExtend: true,
          notify: { title, body },
        });
      } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(title, { body });
      }

      // Global auto-pause: freezes durationSeconds at the estimate.
      await pauseSession();
    };

    checkCompletion();
    const intervalId = window.setInterval(checkCompletion, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeSession, tasks, pauseSession]);

  // Looping alarm audio — rings until the alarm is dismissed from any surface.
  useEffect(() => {
    if (!completionAlarmSessionId) return;
    const prefs = useApp.getState().preferences;
    if (prefs?.whistleSoundEnabled === false) return;
    const looper = createAlarmLooper();
    looper.start((prefs?.alarmSound ?? "kettle") as AlarmSound);
    return () => looper.stop();
  }, [completionAlarmSessionId]);

  // Auto-dismiss watcher — the single kill-switch. Clears the ringing alarm
  // whenever its session is resumed, finished, discarded, or swapped out,
  // regardless of which surface (timer page, pet, shortcut) changed the state.
  useEffect(() => {
    if (!completionAlarmSessionId) {
      alarmEngagedRef.current = false;
      return;
    }
    const s = sessions.find((x) => x.id === completionAlarmSessionId);
    const isActive = !!s && activeSessionId === completionAlarmSessionId;

    if (isActive && s!.state === "paused") {
      alarmEngagedRef.current = true; // ringing legitimately
      return;
    }
    if (isActive && s!.state === "running" && !alarmEngagedRef.current) {
      return; // auto-pause still in flight — not a user resume
    }
    alarmEngagedRef.current = false;
    useApp.getState().dismissCompletionAlarm();
  }, [completionAlarmSessionId, sessions, activeSessionId]);

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

      const unControl = await onPetControl(async (payload) => {
        switch (payload.action) {
          case "toggle":
            await handleShortcut("toggle_timer");
            break;
          case "extend":
            await useApp.getState().extendSession(payload.minutes ?? 5);
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
          case "snoozeBreak": {
            // Cancel the stale "Break's over!" nudge and re-fire the break
            // reminder in 5 minutes if a session is still alive.
            if (breakEndTimeoutRef.current) {
              window.clearTimeout(breakEndTimeoutRef.current);
              breakEndTimeoutRef.current = null;
            }
            if (snoozeTimeoutRef.current) window.clearTimeout(snoozeTimeoutRef.current);
            snoozeTimeoutRef.current = window.setTimeout(() => {
              snoozeTimeoutRef.current = null;
              const state = useApp.getState();
              const session = state.sessions.find((s) => s.id === state.activeSessionId);
              if (!session || session.state !== "running") return;
              petSignal({
                event: "timerBreak",
                phase: session.paused ? "paused" : "running",
                quote: "Snooze is up — time for that stretch break!",
                quoteKind: "break",
                notify: { title: "Break Reminder", body: "Snooze is up — let's take that stretch break!" },
              });
            }, 5 * 60 * 1000);
            break;
          }
          default:
            break;
        }
      });
      if (cancelled) { unControl(); return; }
      unlistenRefs.current.push(unControl);

      const unNote = await listen<{ text: string }>("pet://new-note", async (event) => {
        const text = event?.text;
        if (!text) return;
        
        const currentActive = useApp.getState().activeSessionId;
        if (currentActive) {
          useApp.getState().addSessionNote(text);
          petSignal({
            event: "hover" as any,
            quote: "Note saved to active session!",
            notify: { title: "Note Captured", body: `"${text}" added to focus session.` }
          });
        } else {
          const activeProj = useApp.getState().projects[0]?.id || "unassigned";
          await useApp.getState().addTask({
            title: text,
            projectId: activeProj,
            urgency: "normal",
            status: "todo"
          });
          petSignal({
            event: "hover" as any,
            quote: "Note saved as a new task!",
            notify: { title: "Task Created", body: `"${text}" saved as a new task.` }
          });
        }
      });
      if (cancelled) { unNote(); return; }
      unlistenRefs.current.push(unNote);
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
  // Auto-update: check the release feed once on launch, install silently
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop()) return;
    checkForDesktopUpdate();
  }, []);

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
    const alarmActive = !!activeSession && completionAlarmSessionId === activeSession.id;
    const next = petPhase(activeSession, alarmActive);
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
      // Alarm-driven completion already signalled timerFinish (with the
      // extend chips) from the detector — don't double-fire the animation.
      if (!alarmActive) {
        petSignal({ event: "timerFinish", phase: "finished", source: taskTitle || "Focus session", detail: taskTitle });
      }
    } else if (next === "none" && (prev === "running" || prev === "paused")) {
      petSignal({ event: "timerAbandon", phase: "idle" });
    }
    // finishing → none: silent — timerFinish already signalled

    prevPhaseRef.current = next;
  }, [activeSession, tasks, completionAlarmSessionId]);

  // -----------------------------------------------------------------------
  // Keep the compact pet status bubble live while mini mode is open
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop()) return;

    const syncPetStatus = () => {
      const now = Date.now();
      const isRunning = activeSession && activeSession.state === "running" && !activeSession.paused;
      const intervalMs = isRunning ? 180000 : 120000; // 3 mins (running), 2 mins (idle)
      const prefs = useApp.getState().preferences;
      let triggerWave = false;

      // 1. Break Reminders Trigger Check
      if (prefs?.petBreakRemindersEnabled && isRunning && activeSession) {
        const elapsed = sessionElapsed(activeSession);
        // Guard against a 0/NaN preference silently killing reminders, and use
        // a 2s fire window so a skipped tick can't miss the exact second.
        const intervalMin = Number(prefs.petBreakIntervalMinutes);
        const breakIntervalSec = (Number.isFinite(intervalMin) && intervalMin >= 1 ? intervalMin : 45) * 60;
        if (elapsed > 0 && elapsed % breakIntervalSec < 2 && now - lastBreakTriggerTimeRef.current > 60000) {
          lastBreakTriggerTimeRef.current = now;
          customMessageRef.current = "Time to stretch and take a break!";
          messageTimeRef.current = now;
          triggerWave = true;
          petSignal({
            event: "timerBreak",
            phase: activeSession.paused ? "paused" : "running",
            quote: "Time to stretch and take a break!",
            quoteKind: "break",
            notify: { title: "Break Reminder", body: "You have been focusing for a while. Let's take a quick stretch break!" }
          });
          // Standard 5-minute stretch break, then the pet calls the user back —
          // but only if the session is still alive when the break is over.
          if (breakEndTimeoutRef.current) window.clearTimeout(breakEndTimeoutRef.current);
          breakEndTimeoutRef.current = window.setTimeout(() => {
            breakEndTimeoutRef.current = null;
            const state = useApp.getState();
            const session = state.sessions.find((s) => s.id === state.activeSessionId);
            if (!session || session.state !== "running") return;
            customMessageRef.current = "Break's over! Ready to dive back in?";
            messageTimeRef.current = Date.now();
            petSignal({
              event: "breakEnd",
              phase: session.paused ? "paused" : "running",
              quote: "Break's over! Ready to dive back in?",
              quoteKind: "reminder",
              notify: { title: "Break Over", body: "Break's done — let's dive back into the task!" }
            });
          }, 5 * 60 * 1000);
        }
      }

      // Custom scheduled reminders now fire from ReminderAgent (all surfaces).

      let activeMsg = customMessageRef.current;

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
      const alarmRinging = completionAlarmSessionId === activeSession.id;
      const isComplete = activeSession.state === "finishing" || alarmRinging;
      const isPaused = activeSession.paused || activeSession.state === "paused";

      const elapsed = sessionElapsed(activeSession);
      const estimateMinutes = activeSession.estimateMinutes ?? task?.estimateMinutes ?? 0;
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
        // Self-healing every second: a pet opened mid-alarm gets the chips,
        // and after Finish/extend they're hidden again.
        showExtend: alarmRinging,
        event: triggerWave ? ("hover" as any) : undefined,
      });
    };

    syncPetStatus();
    const intervalId = window.setInterval(syncPetStatus, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeSession, tasks, completionAlarmSessionId]);

  // Pending break-end/snooze nudges survive session re-renders; clear on unmount.
  useEffect(() => () => {
    if (breakEndTimeoutRef.current) window.clearTimeout(breakEndTimeoutRef.current);
    if (snoozeTimeoutRef.current) window.clearTimeout(snoozeTimeoutRef.current);
  }, []);

  // This component renders nothing
  return null;
}
