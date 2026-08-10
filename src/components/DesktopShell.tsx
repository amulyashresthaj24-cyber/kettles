"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  isDesktop,
  listen,
  invoke,
  setIdleDetectionEnabled,
  setIdleThresholdSeconds,
  showDesktopNotification,
} from "@/lib/desktop";
import { useApp } from "@/lib/store-supabase";
import type { AgentSegment, IdleRecoveryAction, Session } from "@/lib/types";
import { petSignal, onPetPoke, onPetControl, petTracking } from "@/lib/pet";
import { formatDuration, formatHMS } from "@/lib/format";
import { getSyncEngine } from "@/lib/sync-engine";
import { elapsedSecondsFor, idleGapSeconds } from "@/lib/session-timeline";
import {
  agentDisplayName,
  closeSegment,
  describeLiveAgents,
  describeRunFinish,
  listLiveAgents,
  openSegment,
  summarizeLiveAgents,
  toMillis,
} from "@/lib/agent-runs";
import { useNotification } from "@/components/ui/notification";
import {
  DEFAULT_PET_POLICY,
  derivePetContext,
  describePetCoverage,
  localDayParts,
  recordPetIntervention,
  resolvePetIntervention,
  selectPetIntervention,
  type PetInterventionRecord,
} from "@/lib/pet-context";
import { loadPetHistory, savePetHistory } from "@/lib/pet-history-store";
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
  if (s.paused) return s.durationSeconds || 0;
  return elapsedSecondsFor(s);
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
  const { notify } = useNotification();
  const activeSessionId = useApp((s) => s.activeSessionId);
  const sessions = useApp((s) => s.sessions);
  const tasks = useApp((s) => s.tasks);
  const agentRuns = useApp((s) => s.agentRuns);
  const pauseSession = useApp((s) => s.pauseSession);
  const resumeSession = useApp((s) => s.resumeSession);
  const finishSession = useApp((s) => s.finishSession);
  const confirmSession = useApp((s) => s.confirmSession);
  const discardSession = useApp((s) => s.discardSession);
  const autoPauseOnIdleEnabled = useApp((s) => s.preferences?.autoPauseOnIdleEnabled !== false);
  const idleThresholdMinutes = useApp((s) => {
    const raw = Number(s.preferences?.idleThresholdMinutes);
    // A 0 or NaN preference must not turn every reading pause into an idle gap.
    return Number.isFinite(raw) && raw > 0 ? raw : 5;
  });
  const completionAlarmSessionId = useApp((s) => s.completionAlarmSessionId);
  const unlistenRefs = useRef<Array<() => void>>([]);
  const prevPhaseRef = useRef<PetPhase>("none");

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // -----------------------------------------------------------------------
  // Global timer completion — single owner of detection, auto-pause, alarm
  // audio, and pet signaling. Runs on web too (nothing desktop-gated except
  // the pet signal itself).
  // -----------------------------------------------------------------------
  const customMessageRef = useRef<string | null>(null);
  const messageTimeRef = useRef<number>(0);
  // Device-local record of what the pet has already said today. Held in a ref so
  // the 1s status tick can write it synchronously before signalling.
  const petHistoryRef = useRef<PetInterventionRecord[]>([]);
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
      const title = "Session complete";
      // States the result. Praise for a timer reaching its own target is noise,
      // and it makes the warnings that do matter read as the same kind of thing.
      const body = `${estimateMinutes}m on "${taskTitle}". Extend or finish.`;

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

        // No "toggle_mini_mode" case: Rust calls the command directly on
        // Alt+Shift+T and never emits that action.
        // No "quick_capture" case either — answering it by invoking
        // show_quick_capture re-emitted the same action, looping forever.

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

      // Pause at the moment input stopped, not at detection, and leave the gap
      // open. The old behavior froze the timer at `now` and told the user after
      // the fact — which silently billed the idle stretch as work and gave them
      // nothing to correct.
      await useApp.getState().pauseSessionForIdle(idleSeconds);
    },
    [activeSession, autoPauseOnIdleEnabled]
  );

  /**
   * Input came back. Close the gap and ask what it was.
   *
   * The four answers are the only ones that produce a defensible number, and
   * every one of them is a single click. The copy states the boundary as fact —
   * no "you were slacking", no guilt.
   */
  const handleIdleResumed = useCallback(
    async (awaySeconds: number) => {
      const store = useApp.getState();
      store.markIdleReturn(awaySeconds);

      const sessionId = useApp.getState().pendingIdleRecoverySessionId;
      if (!sessionId) return;
      const session = useApp.getState().sessions.find((s) => s.id === sessionId);
      const recovery = session?.pendingIdleRecovery;
      if (!recovery || recovery.status !== "pending") return;

      const awayMinutes = Math.max(1, Math.round(idleGapSeconds(recovery, Date.now()) / 60));
      const pausedAt = new Date(recovery.idleStartedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const quote = `You were away for ${awayMinutes}m. I paused at ${pausedAt}. What should happen?`;

      const delivered = await petSignal({
        quote,
        quoteKind: "reminder",
        state: "review",
        actions: [
          { label: "Trim idle", action: "idleResumeTrimmed" },
          { label: "Count as work", action: "idleCountAsWork" },
          { label: "Save as draft", action: "idleSaveAsDraft" },
          { label: "Finish there", action: "idleFinishAtIdle" },
        ],
      });

      // A return must always leave something behind. If the overlay was closed,
      // fall back to a notification — the in-app card on the timer page stays
      // reachable either way.
      // Windows toasts from tauri-plugin-notification have no click callback
      // (its desktop backend only supports title/body/icon/sound), so the copy
      // must not imply the toast itself is actionable. Point at the tray, which
      // does restore the window on click.
      if (!delivered) {
        await showDesktopNotification(
          "Timer paused while you were away",
          `${awayMinutes}m unaccounted for since ${pausedAt}. Open Kettles from the tray to sort it out.`
        );
      }
    },
    []
  );

  // -----------------------------------------------------------------------
  // Agent run bridge events (from Rust agent_bridge)
  // -----------------------------------------------------------------------
  type AgentRunPayload = {
    runId: string;
    agent: string;
    label?: string;
    taskId?: string;
    startedAt: number;
    endedAt?: number;
    status?: string;
    summary?: string;
  };

  /** Process each runId once per app lifetime — hooks can double-fire Stop. */
  const finishedAgentRunIdsRef = useRef(new Set<string>());

  const handleAgentRunStarted = useCallback((payload: AgentRunPayload) => {
    if (!payload?.runId || !payload?.agent) return;
    // A new start after finish re-arms the run id.
    finishedAgentRunIdsRef.current.delete(payload.runId);
    useApp.getState().beginAgentRun({
      runId: payload.runId,
      agent: payload.agent,
      label: payload.label,
      taskId: payload.taskId,
      startedAt: toMillis(payload.startedAt),
    });
    // Notify only — glow AI tab + seed status line. No log UI, no forced speak.
    const line = summarizeLiveAgents(useApp.getState().agentRuns);
    void petSignal({
      agentActive: true,
      agentSummary: line || `${agentDisplayName(payload.agent)} running`,
      state: "working",
    });
  }, []);

  const handleAgentRunFinished = useCallback(async (payload: AgentRunPayload) => {
    if (!payload?.runId) return;
    if (finishedAgentRunIdsRef.current.has(payload.runId)) return;
    finishedAgentRunIdsRef.current.add(payload.runId);

    const status = (payload.status ?? "ok") as AgentSegment["status"];
    const store = useApp.getState();
    const endedAt =
      payload.endedAt != null ? toMillis(payload.endedAt) : Date.now();
    const startedAt = toMillis(payload.startedAt || endedAt);

    // Open if we never saw start (e.g. only finish arrived).
    if (!store.agentRuns[payload.runId]) {
      store.beginAgentRun({
        runId: payload.runId,
        agent: payload.agent || "agent",
        label: payload.label,
        taskId: payload.taskId,
        startedAt,
      });
    }

    const prior = useApp.getState().agentRuns[payload.runId];
    store.endAgentRun(payload.runId, status);

    const closed: AgentSegment = closeSegment(
      prior ??
        openSegment(
          {
            runId: payload.runId,
            agent: payload.agent || "agent",
            label: payload.label,
            startedAt,
          },
          startedAt
        ),
      status,
      endedAt
    );

    const quote = describeRunFinish(closed);
    const name = agentDisplayName(closed.agent);
    const stillActive =
      Object.keys(useApp.getState().agentRuns).length > 0;
    const tone =
      closed.status === "ok"
        ? "success"
        : closed.status === "stale" || closed.status === "cancelled"
          ? "warning"
          : "error";

    // Light in-app toast — no log-to-task chips.
    notify({
      title:
        closed.status === "ok"
          ? `${name} finished`
          : closed.status === "stale"
            ? `${name} ended without reporting`
            : `${name} · ${closed.status}`,
      description: quote,
      tone,
      durationMs: 4000,
    });

    // Pet: short status message, then auto-return to timer after 3s.
    // Empty actions = no chips; user does not need to tap the pet again.
    const remaining = stillActive
      ? summarizeLiveAgents(useApp.getState().agentRuns)
      : undefined;
    // Celebration: jump + cheer on a clean finish, a two-note alert otherwise.
    // Only on the last run closing — a jump per agent while others still work
    // reads as noise, not as "your task is done".
    const celebrate =
      useApp.getState().preferences?.agentFinishCelebrationEnabled !== false
      && !stillActive;
    const delivered = await petSignal({
      quote,
      quoteKind: "chat",
      speechMs: 3000,
      actions: [],
      agentActive: stillActive,
      agentSummary: remaining,
      state:
        closed.status === "ok"
          ? celebrate
            ? "jumping"
            : "waving"
          : "failed",
      sound: celebrate ? (closed.status === "ok" ? "cheer" : "alert") : undefined,
    });
    if (!delivered) {
      await showDesktopNotification("Agent finished", quote);
    }
  }, [notify]);

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

      const unIdleResumed = await listen<number>("idle-resumed", handleIdleResumed);
      if (cancelled) { unIdleResumed(); return; }
      unlistenRefs.current.push(unIdleResumed);

      const unAgentStart = await listen<AgentRunPayload>(
        "agent-run-started",
        handleAgentRunStarted
      );
      if (cancelled) {
        unAgentStart();
        return;
      }
      unlistenRefs.current.push(unAgentStart);

      const unAgentFinish = await listen<AgentRunPayload>(
        "agent-run-finished",
        (p) => {
          void handleAgentRunFinished(p);
        }
      );
      if (cancelled) {
        unAgentFinish();
        return;
      }
      unlistenRefs.current.push(unAgentFinish);

      /** Deterministic pet reply for the Clock/AI panel (no LLM). */
      const sendPetReply = (chatRequestId?: string) => {
        const state = useApp.getState();
        const now = Date.now();
        const { dayStartMs, minuteOfDay, dateKey } = localDayParts(now);
        const contextInput = {
          now,
          dayStartMs,
          minuteOfDay,
          dateKey,
          activeSessionId: state.activeSessionId,
          sessions: state.sessions,
          tasks: state.tasks,
          projects: state.projects,
          clients: state.clients,
          petIntelligenceEnabled:
            state.preferences?.petIntelligenceEnabled !== false,
        };
        const ctx = derivePetContext(contextInput);
        const agentLine = summarizeLiveAgents(state.agentRuns);
        let quote = describePetCoverage(ctx, contextInput);
        // Prefer agent presence when an agent is live — keep it to ~2 sentences.
        if (agentLine) {
          quote = `${agentLine}. ${quote}`;
        }
        // Clamp length for the 225px bubble.
        if (quote.length > 160) {
          quote = quote.slice(0, 157).trimEnd() + "…";
        }

        const actions: { label: string; action: string }[] = [
          { label: "Open timer", action: "openApp" },
        ];
        if (state.activeSessionId) {
          const live = state.sessions.find((s) => s.id === state.activeSessionId);
          if (live?.state === "running") {
            actions.push({ label: "Pause", action: "toggle" });
          } else if (live?.state === "paused") {
            actions.push({ label: "Resume", action: "toggle" });
          }
        }

        void petSignal({
          quote,
          quoteKind: "chat",
          state: agentLine ? "working" : "review",
          actions,
          chatRequestId,
          agentActive: Boolean(agentLine),
          agentSummary: agentLine || undefined,
        });
      };

      // Explicit Open/double-click restores the main app. A legacy bare poke
      // still gets the deterministic chat response for older overlays.
      const unPoke = await onPetPoke((payload) => {
        if (payload?.action === "openApp") {
          void invoke("exit_mini_mode");
          return;
        }
        sendPetReply();
      });
      if (cancelled) { unPoke(); return; }
      unlistenRefs.current.push(unPoke);

      // Records what the user did with a warning, so dismissals accumulate as
      // evidence of notification tolerance rather than being thrown away.
      const resolveOutcome = (
        key: string | undefined,
        outcome: NonNullable<PetInterventionRecord["outcome"]>
      ) => {
        if (!key) return;
        const now = Date.now();
        const state = useApp.getState();
        petHistoryRef.current = resolvePetIntervention(
          petHistoryRef.current,
          key,
          outcome,
          now
        );
        savePetHistory(petHistoryRef.current, now, state.user?.email);
      };

      /** Apply an idle answer and say what it did. */
      const confirmIdle = async (action: IdleRecoveryAction) => {
        const summary = await useApp.getState().resolveIdleRecovery(action);
        if (!summary) return; // already resolved — stay quiet rather than lie
        void petSignal({ quote: summary, quoteKind: "chat", state: "review" });
      };

      const unControl = await onPetControl(async (payload) => {
        switch (payload.action) {
          case "requestPetReply":
            sendPetReply(
              typeof payload.requestId === "string" ? payload.requestId : undefined
            );
            break;
          case "dismissPetReply":
            // UI handled in the overlay; host has nothing to clear.
            break;
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
          case "openApp":
            await invoke("exit_mini_mode");
            break;
          case "finishEstimateSession": {
            // From the store, not the render closure: this effect must not
            // re-register every listener each time the session ticks.
            const live = useApp.getState();
            const current = live.sessions.find((s) => s.id === live.activeSessionId);
            const logged = current ? sessionElapsed(current) : 0;
            await finishSession();
            resolveOutcome(payload.interventionKey, "acted");
            void petSignal({
              quote: `Finished. ${formatDuration(logged)} logged.`,
              quoteKind: "chat",
              state: "review",
            });
            break;
          }
          case "reestimateTask": {
            const state = useApp.getState();
            const taskId = payload.taskId;
            const estimateMinutes = Number(payload.estimateMinutes);

            if (
              !taskId ||
              !state.tasks.some((task) => task.id === taskId) ||
              !Number.isFinite(estimateMinutes) ||
              estimateMinutes <= 0
            ) {
              break;
            }

            const next = Math.round(estimateMinutes);
            await state.updateTask(taskId, { estimateMinutes: next });
            resolveOutcome(payload.interventionKey, "acted");
            void petSignal({
              quote: `Estimate is now ${next}m.`,
              quoteKind: "chat",
              state: "review",
            });
            break;
          }
          case "dismissPetIntervention":
            resolveOutcome(payload.interventionKey, "dismissed");
            break;
          // Idle-gap repair. Every branch is idempotent in the store, so a
          // double-click or a duplicate event cannot move time twice. Each one
          // reports the resulting number back — editing the ledger and then
          // going silent is how a tool loses trust.
          case "idleResumeTrimmed":
            await confirmIdle("resume_trimmed");
            break;
          case "idleCountAsWork":
            await confirmIdle("count_as_work");
            break;
          case "idleSaveAsDraft":
            await confirmIdle("save_as_draft");
            break;
          case "idleFinishAtIdle":
            await confirmIdle("finish_at_idle");
            break;
          case "agentRunAssign": {
            // M1: open the newest unclassified agent draft so the user can
            // attach it to a task. Full assign UI is M2.
            // Pet merges action.payload onto the control event (see pet.js).
            const runId =
              typeof payload.runId === "string" ? payload.runId : undefined;
            const state = useApp.getState();
            const draft = [...state.sessions]
              .reverse()
              .find(
                (s) =>
                  s.source === "agent_run" &&
                  s.isDraft &&
                  (!runId || s.agentSegments?.some((g) => g.runId === runId))
              );
            if (draft) {
              state.reviewDraftSession(draft.id);
              await invoke("exit_mini_mode");
            }
            break;
          }
          case "agentRunDismiss":
            // Acknowledgement only — draft/segment already written.
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
                quote: "Snooze is up. Break time.",
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
            quote: "Note saved to this session.",
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
            quote: "Saved as a new task.",
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
  }, [
    handleShortcut,
    handleIdle,
    handleIdleResumed,
    handleAgentRunStarted,
    handleAgentRunFinished,
    finishSession,
    confirmSession,
    discardSession,
  ]);

  // -----------------------------------------------------------------------
  // Sync desktop idle preference to the native idle detection loop
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop()) return;
    setIdleDetectionEnabled(autoPauseOnIdleEnabled);
  }, [autoPauseOnIdleEnabled]);

  useEffect(() => {
    if (!isDesktop()) return;
    void setIdleThresholdSeconds(idleThresholdMinutes * 60);
  }, [idleThresholdMinutes]);

  // Updates are handled by DesktopUpdatePrompt, which offers rather than
  // forces — installing terminates the process on Windows NSIS, so it must not
  // land in the middle of a session.

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
  // The tray now carries the task name and elapsed time, so it answers "what am
  // I tracking?" without opening the window. Elapsed ticks, so this runs on a
  // timer rather than only on session identity changes — but only while a
  // session is live, and only when the value actually changed.
  const lastTrayRef = useRef<string>("");
  useEffect(() => {
    if (!isDesktop()) return;

    const push = () => {
      const state =
        activeSession?.state === "running"
          ? "running"
          : activeSession && (activeSession.paused || activeSession.state === "paused")
            ? "paused"
            : "idle";

      const task =
        state === "idle"
          ? undefined
          : tasks.find((t) => t.id === activeSession?.taskId)?.title ?? "Focus session";
      const elapsed =
        state === "idle" || !activeSession ? undefined : formatHMS(sessionElapsed(activeSession));

      // Rebuilding a native menu item every second for an unchanged string is
      // pointless IPC.
      const key = `${state}|${task ?? ""}|${elapsed ?? ""}`;
      if (key === lastTrayRef.current) return;
      lastTrayRef.current = key;

      invoke("set_tray_state", { state, task, elapsed });
    };

    push();
    if (!activeSession || activeSession.state === "confirmed") return;
    const id = window.setInterval(push, 1000);
    return () => window.clearInterval(id);
  }, [activeSession, tasks]);

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
  // Proactive ledger warnings.
  //
  // Its own loop, deliberately: mount-only so history is never reloaded
  // mid-session, and on a 10s cadence because "this task passed its estimate"
  // does not need one-second precision and the derivation scans every session.
  // The status tick below stays at 1s for the countdown and owns nothing else.
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop()) return;
    petHistoryRef.current = loadPetHistory(Date.now(), useApp.getState().user?.email);

    let cancelled = false;
    let sending = false;

    const considerIntervention = async () => {
      if (cancelled || sending) return;
      const state = useApp.getState();
      const prefs = state.preferences;

      // Nothing else may own the bubble. `say()` sets data-speaking, which hides
      // the timer card and its extend/finish controls for 15s — a coaching line
      // must never cover the controls used to end a session.
      const session = state.sessions.find((s) => s.id === state.activeSessionId);
      const alarmOwnsPet =
        !!session &&
        (state.completionAlarmSessionId === session.id || session.state === "finishing");
      if (customMessageRef.current || alarmOwnsPet) return;

      const now = Date.now();
      const { dayStartMs, minuteOfDay, dateKey } = localDayParts(now);
      const ctx = derivePetContext({
        now,
        dayStartMs,
        minuteOfDay,
        dateKey,
        activeSessionId: state.activeSessionId,
        sessions: state.sessions,
        tasks: state.tasks,
        projects: state.projects,
        clients: state.clients,
        petIntelligenceEnabled: prefs?.petIntelligenceEnabled !== false,
      });
      const intervention = selectPetIntervention(
        ctx,
        { ...DEFAULT_PET_POLICY, enabled: prefs?.petIntelligenceEnabled !== false },
        petHistoryRef.current
      );
      if (!intervention) return;

      // `sending` latches for the round trip. Recording after the await would
      // otherwise let the next tick select the same key again.
      sending = true;
      try {
        const delivered = await petSignal({
          quote: intervention.quote,
          quoteKind: "reminder",
          state: intervention.state,
          actions: intervention.actions,
        });
        // Only a message the user could actually see counts against the budget.
        // The overlay exists only in mini mode, and the emit succeeds either way.
        if (delivered && !cancelled) {
          petHistoryRef.current = recordPetIntervention(petHistoryRef.current, intervention, ctx);
          savePetHistory(petHistoryRef.current, now, state.user?.email);
        }
      } finally {
        sending = false;
      }
    };

    void considerIntervention();
    const timer = window.setInterval(considerIntervention, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Keep the compact pet status bubble live while mini mode is open
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop()) return;

    const syncPetStatus = () => {
      const now = Date.now();
      const isRunning = activeSession && activeSession.state === "running" && !activeSession.paused;
      const prefs = useApp.getState().preferences;
      let triggerWave = false;
      /** Set only on the tick an intervention fires — never re-sent. */

      // 1. Break Reminders Trigger Check
      if (prefs?.petBreakRemindersEnabled && isRunning && activeSession) {
        const elapsed = sessionElapsed(activeSession);
        // Guard against a 0/NaN preference silently killing reminders, and use
        // a 2s fire window so a skipped tick can't miss the exact second.
        const intervalMin = Number(prefs.petBreakIntervalMinutes);
        const breakIntervalSec = (Number.isFinite(intervalMin) && intervalMin >= 1 ? intervalMin : 45) * 60;
        if (elapsed > 0 && elapsed % breakIntervalSec < 2 && now - lastBreakTriggerTimeRef.current > 60000) {
          lastBreakTriggerTimeRef.current = now;
          customMessageRef.current = "Break time. Back in 5m.";
          messageTimeRef.current = now;
          triggerWave = true;
          petSignal({
            event: "timerBreak",
            phase: activeSession.paused ? "paused" : "running",
            quote: "Break time. Back in 5m.",
            quoteKind: "break",
            notify: { title: "Break Reminder", body: "You have been focusing for a while. Time for a break." }
          });
          // Standard 5-minute stretch break, then the pet calls the user back —
          // but only if the session is still alive when the break is over.
          if (breakEndTimeoutRef.current) window.clearTimeout(breakEndTimeoutRef.current);
          breakEndTimeoutRef.current = window.setTimeout(() => {
            breakEndTimeoutRef.current = null;
            const state = useApp.getState();
            const session = state.sessions.find((s) => s.id === state.activeSessionId);
            if (!session || session.state !== "running") return;
            customMessageRef.current = "Break's done.";
            messageTimeRef.current = Date.now();
            petSignal({
              event: "breakEnd",
              phase: session.paused ? "paused" : "running",
              quote: "Break's done.",
              quoteKind: "reminder",
              notify: { title: "Break Over", body: "Break's done." }
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

      // Proactive warnings are not selected here. They live in their own effect
      // above so this tick stays a pure status refresh.

      const liveAgents = useApp.getState().agentRuns;
      const liveList = listLiveAgents(liveAgents);
      const agentActive = liveList.length > 0;
      // Card title stays merged — it is one short line above the clock.
      const agentLine = agentActive ? summarizeLiveAgents(liveAgents) : "";
      // One run → the merged line reads best. Concurrent runs get one entry
      // each with their own clock; a single elapsed number across two agents
      // is not a number that means anything.
      const agentElapsed = agentActive
        ? Math.max(
            ...liveList.map((r) =>
              Math.max(0, Math.floor((now - r.startedAt) / 1000))
            )
          )
        : 0;
      const agentSummary = !agentActive
        ? undefined
        : liveList.length > 1
          ? describeLiveAgents(liveAgents, now)
          : `${agentLine}${agentElapsed > 0 ? ` · ${formatDuration(agentElapsed)}` : ""}`;

      // Pet mode hides the main window and its SyncStatusBadge, so carry sync
      // state onto the pet card — otherwise a blocked queue is invisible for
      // exactly as long as the user is focusing.
      const engine = getSyncEngine();
      const rawStatus = engine.getStatus();
      const pendingWrites = engine.getPendingCount();
      const syncState =
        engine.getDeadLetters().length > 0
          ? "blocked"
          : rawStatus === "offline"
            ? "offline"
            : rawStatus === "syncing" || (rawStatus === "error" && pendingWrites > 0)
              ? "syncing"
              : "ok";

      if (!activeSession) {
        const doingCount = tasks.filter((task) => task.status === "doing").length;
        // M2: with no session, surface agent presence on the clock card.
        petSignal({
          phase: agentActive ? "running" : "idle",
          source:
            activeMsg ||
            (agentLine
              ? agentLine
              : doingCount > 0
                ? `${doingCount} task${doingCount === 1 ? "" : "s"} in progress`
                : "Ready to focus"),
          detail: agentActive ? formatHMS(agentElapsed) : "00:00:00",
          agentActive,
          agentSummary,
          syncState,
          syncPending: pendingWrites,
          state: agentActive ? "working" : undefined,
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
        agentActive,
        agentSummary,
        syncState,
        syncPending: pendingWrites,
        // Self-healing every second: a pet opened mid-alarm gets the chips,
        // and after Finish/extend they're hidden again.
        showExtend: alarmRinging,
        state: agentActive && !isComplete && !isPaused ? "working" : undefined,
        event: triggerWave ? ("hover" as any) : undefined,
      });
    };

    syncPetStatus();
    const intervalId = window.setInterval(syncPetStatus, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeSession, tasks, completionAlarmSessionId, agentRuns]);

  // Pending break-end/snooze nudges survive session re-renders; clear on unmount.
  useEffect(() => () => {
    if (breakEndTimeoutRef.current) window.clearTimeout(breakEndTimeoutRef.current);
    if (snoozeTimeoutRef.current) window.clearTimeout(snoozeTimeoutRef.current);
  }, []);

  // This component renders nothing
  return null;
}
