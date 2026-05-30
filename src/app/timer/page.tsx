"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Lightning,
  Clock,
  Plus,
  CaretDown,
  PencilSimple,
  X,
  Trash,
  CheckCircle,
} from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import { formatDuration, formatHMS, formatMinSec, formatMSS, formatWallTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UrgencyDot } from "@/components/UrgencyDot";
import { AddTaskModal } from "@/components/AddTaskModal";
import { AddProjectModal } from "@/components/AddProjectModal";
import { TaskFinishedState } from "@/components/TaskFinishedState";
import type { Project, Session, Task } from "@/lib/types";

const URGENCY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
const FOCUS_RING_SIZE = 320;
const FOCUS_RING_R = 150;
const FOCUS_RING_CIRC = 2 * Math.PI * FOCUS_RING_R;

function toTimeInput(ms: number) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function timeInputToToday(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(hours || 0, minutes || 0, 0, 0);
  return d.getTime();
}

function elapsedForSession(session: Session) {
  return session.durationSeconds + (session.state === "running"
    ? Math.floor((Date.now() - session.startedAt) / 1000)
    : 0);
}

function dayBoundsFor(timestamp: number) {
  const day = new Date(timestamp);
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  return { start, end: start + 86_400_000 };
}

function sessionReferenceTime(session: Session) {
  return session.endedAt ?? session.frozenAt ?? session.startedAt;
}

function projectProgressLabel(projectId: string | undefined, allTasks: Task[]) {
  if (!projectId) return undefined;
  const projectTasks = allTasks.filter((task) => task.projectId === projectId && !task.archived && !task.deletedAt);
  if (projectTasks.length === 0) return undefined;
  const done = projectTasks.filter((task) => task.status === "done").length;
  return `${done} of ${projectTasks.length} tasks complete`;
}

function buildSessionReflection({
  logged,
  sessions,
  task,
  project,
  notesCount,
  includeCleanDraftReflection = false,
}: {
  logged: Session;
  sessions: Session[];
  task: Task;
  project?: Project;
  notesCount: number;
  includeCleanDraftReflection?: boolean;
}) {
  const { start, end } = dayBoundsFor(logged.endedAt ?? Date.now());
  const todaySessions = sessions.filter((item) => {
    const ref = sessionReferenceTime(item);
    return ref >= start && ref < end;
  });
  const todayDrafts = todaySessions.filter((item) => item.state === "draft");
  if (includeCleanDraftReflection && todayDrafts.length === 0) return "No drafts left today.";

  if (notesCount > 0) {
    return `You captured ${notesCount} note${notesCount === 1 ? "" : "s"} for your report.`;
  }

  const confirmedToday = todaySessions.filter((item) => (item.state ?? "confirmed") === "confirmed");
  const longestToday = Math.max(...confirmedToday.map((item) => item.durationSeconds), 0);
  if (logged.durationSeconds >= longestToday && confirmedToday.length > 1) {
    return "This was your longest session today.";
  }

  if (project) {
    const projectSeconds = sessions
      .filter((item) => item.projectId === project.id && (item.state ?? "confirmed") === "confirmed")
      .reduce((total, item) => total + item.durationSeconds, 0);
    if (projectSeconds >= 10 * 3600 && projectSeconds - logged.durationSeconds < 10 * 3600) {
      return `${project.name} crossed 10 logged hours.`;
    }
  }

  const taskSessions = sessions.filter((item) => item.taskId === task.id && (item.state ?? "confirmed") === "confirmed");
  if (taskSessions.length > 1) {
    return `This task was completed after ${taskSessions.length} sessions.`;
  }

  return undefined;
}

export default function TimerPage() {
  const router = useRouter();
  const user = useApp((s) => s.user);
  const tasks = useApp((s) => s.tasks);
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const sessions = useApp((s) => s.sessions);
  const preferences = useApp((s) => s.preferences);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const session = useApp((s) =>
    activeSessionId ? s.sessions.find((x) => x.id === activeSessionId) : undefined
  );

  const startSession = useApp((s) => s.startSession);
  const startDraftSession = useApp((s) => s.startDraftSession);
  const pauseSession = useApp((s) => s.pauseSession);
  const resumeSession = useApp((s) => s.resumeSession);
  const finishSession = useApp((s) => s.finishSession);
  const resumeFromFinishing = useApp((s) => s.resumeFromFinishing);
  const confirmSession = useApp((s) => s.confirmSession);
  const saveSessionAsDraft = useApp((s) => s.saveSessionAsDraft);
  const reviewDraftSession = useApp((s) => s.reviewDraftSession);
  const discardSession = useApp((s) => s.discardSession);
  const classifyDraftSession = useApp((s) => s.classifyDraftSession);
  const addSessionNote = useApp((s) => s.addSessionNote);
  const updateSessionNote = useApp((s) => s.updateSessionNote);
  const deleteSessionNote = useApp((s) => s.deleteSessionNote);
  const addTask = useApp((s) => s.addTask);
  const setTaskStatus = useApp((s) => s.setTaskStatus);

  const [taskId, setTaskId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [billable, setBillable] = useState(true);
  const [estimateMin, setEstimateMin] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [noteWarning, setNoteWarning] = useState("");
  const [estimateJustComplete, setEstimateJustComplete] = useState(false);
  const [adjustEditing, setAdjustEditing] = useState(false);
  const [adjustStart, setAdjustStart] = useState("");
  const [adjustEnd, setAdjustEnd] = useState("");
  const [adjustDuration, setAdjustDuration] = useState("");
  const [idleVisible, setIdleVisible] = useState(false);
  const [savedDraft, setSavedDraft] = useState(false);
  const [loggedSession, setLoggedSession] = useState<{
    seconds: number;
    taskId?: string;
    taskTitle: string;
    projectName?: string;
    clientName?: string;
    totalLoggedSeconds: number;
    notesCount: number;
    sessionCount: number;
    projectProgressLabel?: string;
    reflection?: string;
    isCompleted?: boolean;
  } | null>(null);
  const [draftTaskTitle, setDraftTaskTitle] = useState("");
  const [draftProjectId, setDraftProjectId] = useState("");
  const [draftBillable, setDraftBillable] = useState<boolean | null>(null);
  const [draftErrors, setDraftErrors] = useState<string[]>([]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [, setTick] = useState(0);
  const audioReady = useRef(false);
  const kettleAudio = useRef<HTMLAudioElement | null>(null);
  const estimateCompletedRef = useRef(false);
  const idleWarningShown = useRef(false);
  const processedFinishParam = useRef(false);

  const activeTask = session ? tasks.find((t) => t.id === session.taskId) : tasks.find((t) => t.id === taskId);
  const activeProject = session ? projects.find((p) => p.id === session.projectId) : projects.find((p) => p.id === projectId);
  const activeClient = activeProject?.clientId ? clients.find((c) => c.id === activeProject.clientId) : undefined;
  const sessionId = session?.id;
  const sessionStartedAt = session?.startedAt;

  useEffect(() => {
    if (!taskId) {
      if (preferences?.defaultFocusDuration && !estimateMin) {
        setEstimateMin(String(preferences.defaultFocusDuration));
      }
      return;
    }
    const t = tasks.find((x) => x.id === taskId);
    if (t && !projectId) setProjectId(t.projectId);
    if (t?.estimateMinutes) {
      if (!estimateMin) setEstimateMin(String(t.estimateMinutes));
    } else if (!estimateMin && preferences?.defaultFocusDuration) {
      setEstimateMin(String(preferences.defaultFocusDuration));
    }
  }, [taskId, tasks, projectId, estimateMin, preferences?.defaultFocusDuration]);

  useEffect(() => {
    if (!session || session.state !== "running") return;
    const i = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [session]);

  useEffect(() => {
    if (!session || typeof window === "undefined" || processedFinishParam.current) return;
    if (window.location.search.includes("finish=1") && session.state !== "finishing") {
      processedFinishParam.current = true;
      finishSession();
      const url = new URL(window.location.href);
      url.searchParams.delete("finish");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [finishSession, session]);

  const elapsed = session ? elapsedForSession(session) : 0;
  const estimateSec = Number(estimateMin || activeTask?.estimateMinutes || 0) * 60;
  const isFinishing = session?.state === "finishing";
  const isPaused = session?.state === "paused";
  const isDraft = !!session?.isDraft || !session?.taskId || !session?.projectId;
  const isOvertime = estimateSec > 0 && elapsed > estimateSec;
  const remaining = estimateSec > 0 ? Math.max(estimateSec - elapsed, 0) : null;
  const progress = estimateSec > 0 ? Math.min(elapsed / estimateSec, 1) : 0;
  const focusRingOffset = FOCUS_RING_CIRC * (1 - progress);
  const noteCount = session?.notes?.length ?? 0;
  const draftSessions = sessions.filter((item) => item.state === "draft");

  const playKettleWhistle = () => {
    if (!audioReady.current || preferences?.whistleSoundEnabled === false) return;
    try {
      const audio = kettleAudio.current ?? new Audio("/sounds/kettle-whistle.ogg");
      kettleAudio.current = audio;
      audio.currentTime = 0;
      audio.volume = 0.22;
      void audio.play();
      window.setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 1800);
    } catch {
      // Notification state should not depend on audio support.
    }
  };

  useEffect(() => {
    if (!session || estimateSec <= 0 || estimateCompletedRef.current) return;
    if (remaining === 0 && session.state === "running") {
      estimateCompletedRef.current = true;
      setEstimateJustComplete(true);
      playKettleWhistle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateSec, remaining, session]);

  useEffect(() => {
    if (!session || session.state !== "running") return;
    if (elapsed > 3600 && !idleWarningShown.current) {
      idleWarningShown.current = true;
      setIdleVisible(true);
    }
  }, [elapsed, session]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (!session) return;
      if (e.key === " ") {
        e.preventDefault();
        session.state === "running" ? pauseSession() : resumeSession();
      }
      if (e.key.toLowerCase() === "f" && (session.state === "running" || session.state === "paused")) handleFinish();
      if (e.key.toLowerCase() === "n") setShowQuickNote(true);
      if (e.key === "Escape") {
        setShowNotes(false);
        setShowQuickNote(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

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
    audioReady.current = true;
    await startSession(taskId, billable);
  };

  const handleStartDraft = async () => {
    audioReady.current = true;
    await startDraftSession(projectId, billable);
  };

  const handleQuickStart = async (t: Task) => {
    setTaskId(t.id);
    setProjectId(t.projectId);
    if (t.estimateMinutes) setEstimateMin(String(t.estimateMinutes));
    audioReady.current = true;
    await startSession(t.id);
  };

  const handleFinish = () => {
    if (noteInput.trim()) {
      setNoteWarning("You have an unsaved note. Save it or it will be discarded.");
      setShowNotes(true);
      return;
    }
    setEstimateJustComplete(false);
    finishSession();
  };

  const handleKnownLog = async ({
    seconds = elapsed,
    completed = false,
    celebrate = true,
  }: { seconds?: number; completed?: boolean; celebrate?: boolean } = {}) => {
    if (!activeTask) return;
    const taskSnapshot = activeTask;
    const projectSnapshot = activeProject;
    const clientSnapshot = activeClient;
    const notesCountSnapshot = session?.notes?.length ?? 0;
    const logged = await confirmSession(seconds);
    if (logged) {
      if (completed) {
        await setTaskStatus(taskSnapshot.id, "done");
      }
      if (!celebrate) {
        router.push("/timer");
        return;
      }
      const updatedSessions = useApp.getState().sessions;
      const taskSessions = updatedSessions.filter((item) => item.taskId === taskSnapshot.id && (item.state ?? "confirmed") === "confirmed");
      const totalLoggedSeconds = taskSessions
        .reduce((total, item) => total + item.durationSeconds, 0);
      const reflection = buildSessionReflection({
        logged,
        sessions: updatedSessions,
        task: taskSnapshot,
        project: projectSnapshot,
        notesCount: notesCountSnapshot,
      });
      setLoggedSession({
        seconds: logged.durationSeconds,
        taskId: taskSnapshot.id,
        taskTitle: taskSnapshot.title,
        projectName: projectSnapshot?.name,
        clientName: clientSnapshot?.name,
        totalLoggedSeconds,
        notesCount: notesCountSnapshot,
        sessionCount: taskSessions.length,
        projectProgressLabel: projectProgressLabel(taskSnapshot.projectId, useApp.getState().tasks),
        reflection,
        isCompleted: completed,
      });
    }
  };

  const handleDraftConfirm = async ({
    completed = false,
    celebrate = true,
  }: { completed?: boolean; celebrate?: boolean } = {}) => {
    const errors: string[] = [];
    if (!draftProjectId) errors.push("Choose a client before confirming.");
    if (!draftTaskTitle.trim()) errors.push("Add a task name before this counts in your work log.");
    if (draftBillable === null) errors.push("Choose billable or non-billable.");
    setDraftErrors(errors);
    if (errors.length > 0) return;
    const task = await addTask({
      title: draftTaskTitle.trim(),
      projectId: draftProjectId,
      urgency: "normal",
      estimateMinutes: estimateSec > 0 ? Math.round(estimateSec / 60) : undefined,
    });
    classifyDraftSession(task.id, draftProjectId, draftBillable ?? false);
    const projectSnapshot = projects.find((project) => project.id === draftProjectId);
    const clientSnapshot = projectSnapshot?.clientId ? clients.find((client) => client.id === projectSnapshot.clientId) : undefined;
    const notesCountSnapshot = session?.notes?.length ?? 0;
    const logged = await confirmSession(elapsed);
    if (logged) {
      if (completed) {
        await setTaskStatus(task.id, "done");
      }
      if (!celebrate) {
        router.push("/timer");
        return;
      }
      const updatedSessions = useApp.getState().sessions;
      const taskSessions = updatedSessions.filter((item) => item.taskId === task.id && (item.state ?? "confirmed") === "confirmed");
      const totalLoggedSeconds = taskSessions
        .reduce((total, item) => total + item.durationSeconds, 0);
      const reflection = buildSessionReflection({
        logged,
        sessions: updatedSessions,
        task,
        project: projectSnapshot,
        notesCount: notesCountSnapshot,
        includeCleanDraftReflection: true,
      });
      setLoggedSession({
        seconds: logged.durationSeconds,
        taskTitle: task.title,
        taskId: task.id,
        projectName: projectSnapshot?.name,
        clientName: clientSnapshot?.name,
        totalLoggedSeconds,
        notesCount: notesCountSnapshot,
        sessionCount: taskSessions.length,
        projectProgressLabel: projectProgressLabel(task.projectId, useApp.getState().tasks),
        reflection,
        isCompleted: completed,
      });
    }
  };

  const openAdjust = () => {
    if (!session) return;
    const start = session.startedAt;
    const end = session.frozenAt ?? Date.now();
    setAdjustStart(toTimeInput(start));
    setAdjustEnd(toTimeInput(end));
    setAdjustDuration(String(Math.max(1, Math.round(elapsed / 60))));
    setAdjustEditing(true);
  };

  const saveAdjust = async () => {
    const start = timeInputToToday(adjustStart);
    const end = timeInputToToday(adjustEnd);
    const computed = Math.max(0, Math.round((end - start) / 1000));
    await handleKnownLog({ seconds: Number(adjustDuration) > 0 ? Number(adjustDuration) * 60 : computed });
    setAdjustEditing(false);
  };

  if (loggedSession) {
    return (
      <TaskFinishedState
        taskName={loggedSession.taskTitle}
        projectName={loggedSession.projectName}
        clientName={loggedSession.clientName}
        sessionDurationSeconds={loggedSession.seconds}
        totalLoggedSeconds={loggedSession.totalLoggedSeconds}
        notesCount={loggedSession.notesCount}
        sessionCount={loggedSession.sessionCount}
        projectProgressLabel={loggedSession.projectProgressLabel}
        reflection={loggedSession.reflection}
        isCompleted={loggedSession.isCompleted}
        onStartAnother={() => {
          setLoggedSession(null);
          setTaskId("");
          setProjectId("");
          setEstimateMin("");
          estimateCompletedRef.current = false;
          router.push("/timer");
        }}
        onViewWorkLog={() => router.push("/report")}
        onBackToDashboard={() => router.push("/")}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-10">
      {!session && (
        <header className="flex flex-col gap-1.5">
          <h1 className="text-[32px] font-semibold leading-[1.25] text-text-primary">Focus Mode</h1>
          <p className="text-[14px] text-text-muted">Pick a task, set an estimate, start the timer.</p>
        </header>
      )}

      {!session ? (
        <section className="relative flex flex-col items-center gap-8 rounded-lg p-12" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[16px] text-text-secondary">
            <span className="font-semibold text-text-primary">{user?.name ?? "User"}</span>
            <span className="text-text-muted">is working on</span>
            <EntitySelectPill
              value={taskId}
              onChange={setTaskId}
              placeholder="pick task"
              items={tasks.filter((t) => t.status !== "done").map((t) => ({
                value: t.id,
                label: t.title,
                meta: t.estimateMinutes ? `${t.estimateMinutes}m` : undefined,
              }))}
              createLabel="Create task"
              onCreate={() => setTaskModalOpen(true)}
            />
            <span className="text-text-muted">from</span>
            <EntitySelectPill
              value={projectId}
              onChange={setProjectId}
              placeholder="pick project"
              items={projects.map((p) => ({
                value: p.id,
                label: p.name,
                meta: p.billable ? "Billable" : "Internal",
              }))}
              createLabel="Create project"
              onCreate={() => setProjectModalOpen(true)}
            />
            <BillingToggle billable={billable} onToggle={() => setBillable((b) => !b)} />
          </div>

          <div className="flex flex-col items-center gap-4">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              <Clock size={11} /> How long?
            </label>
            <div className="flex flex-wrap justify-center gap-2">
              {[15, 30, 45, 60, 90].map((m) => (
                <button
                  key={m}
                  onClick={() => setEstimateMin(estimateMin === String(m) ? "" : String(m))}
                  className="h-9 rounded-full px-5 text-[13px] font-medium transition-colors"
                  style={{ background: estimateMin === String(m) ? "var(--accent)" : "var(--surface-raised)", color: estimateMin === String(m) ? "var(--text-primary)" : "var(--text-secondary)" }}
                >
                  {m}m
                </button>
              ))}
              <Input className="h-9 w-24 rounded-full text-center text-[13px]" type="number" min="1" max="480" placeholder="custom" value={[15, 30, 45, 60, 90].includes(Number(estimateMin)) ? "" : estimateMin} onChange={(e) => setEstimateMin(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={handleStartDraft} variant="secondary"><Plus size={16} />Without task</Button>
            <Button disabled={!taskId} onClick={handleStart} variant="primary"><Play size={16} />Start Focus</Button>
          </div>
        </section>
      ) : (
        <>
        <section className="relative flex min-h-[560px] flex-col items-center justify-center gap-6 p-8">
          {idleVisible && (
            <div className="flex w-full items-center justify-between gap-4 rounded-lg px-4 py-3" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
              <div>
                <p className="text-[13px] font-semibold text-text-primary">Still working?</p>
                <p className="text-[12px] text-text-muted">This timer has been running for {formatDuration(elapsed)}.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setIdleVisible(false)}>Yes, keep tracking</Button>
                <Button size="sm" variant="secondary" onClick={openAdjust}>I stopped earlier</Button>
                <Button size="sm" variant="ghost" onClick={() => { saveSessionAsDraft(); setSavedDraft(true); }}>Save as draft</Button>
              </div>
            </div>
          )}

          <ActiveSentence
            userName={user?.name ?? "User"}
            task={activeTask}
            project={activeProject}
            clientName={activeClient?.name}
            billable={session.billable}
            isDraft={isDraft}
            projects={projects}
            tasks={tasks}
            onClassify={classifyDraftSession}
          />

          <div className={`relative flex items-center justify-center transition-all duration-300 hover:scale-[1.02] ${isFinishing ? "opacity-45" : ""}`} style={{ width: FOCUS_RING_SIZE, height: FOCUS_RING_SIZE }}>
            <svg width={FOCUS_RING_SIZE} height={FOCUS_RING_SIZE} className="absolute inset-0 -rotate-90">
              <circle cx={FOCUS_RING_SIZE / 2} cy={FOCUS_RING_SIZE / 2} r={FOCUS_RING_R} fill="none" strokeWidth="3" stroke="var(--surface-raised)" className={estimateSec === 0 && session.state === "running" ? "animate-slow-pulse" : ""} />
              {estimateSec > 0 && (
                <circle
                  cx={FOCUS_RING_SIZE / 2}
                  cy={FOCUS_RING_SIZE / 2}
                  r={FOCUS_RING_R}
                  fill="none"
                  strokeWidth="6"
                  stroke={isOvertime ? "var(--error)" : "var(--accent)"}
                  strokeLinecap="round"
                  strokeDasharray={FOCUS_RING_CIRC}
                  strokeDashoffset={focusRingOffset}
                  style={{ transition: isPaused || isFinishing ? "none" : "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
                />
              )}
              {isOvertime && <circle cx={FOCUS_RING_SIZE / 2} cy={FOCUS_RING_SIZE / 2} r={FOCUS_RING_R + 9} fill="none" strokeWidth="2" stroke="var(--error)" className="animate-slow-pulse" />}
            </svg>

            {estimateJustComplete ? (
              <div className="z-10 flex max-w-[260px] flex-col items-center gap-3 text-center animate-modal-in">
                <div>
                  <p className="text-[18px] font-semibold text-text-primary">Nice work — {Math.round(estimateSec / 60)}m complete</p>
                  <p className="mt-1 text-[13px] text-text-muted">You can finish this session or keep going.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEstimateJustComplete(false)}>Continue timer</Button>
                  <Button size="sm" variant="primary" onClick={handleFinish}>Finish session</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNotes(true)}>Add note</Button>
                </div>
              </div>
            ) : (
              <TimerCenter elapsed={elapsed} estimateSec={estimateSec} remaining={remaining} isOvertime={isOvertime} isPaused={isPaused} />
            )}
          </div>

          {!isFinishing && (
            <div className="flex flex-col items-center gap-3">
              {isPaused && confirmDiscard ? (
                <div className="flex flex-col items-center gap-2 rounded-lg px-4 py-3" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                  <p className="text-[13px] font-medium text-text-primary">Discard this session? Time worked won&apos;t be logged.</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDiscard(false)}>Cancel</Button>
                    <Button size="sm" variant="primary" className="text-error" onClick={async () => { await discardSession(); router.push("/timer"); }}><Trash size={14} />Discard</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {session.state === "running" ? (
                    <Button variant="secondary" onClick={pauseSession}><Pause size={14} />Pause</Button>
                  ) : (
                    <Button variant="primary" onClick={() => { setConfirmDiscard(false); resumeSession(); }}><Play size={14} />Resume</Button>
                  )}
                  <Button variant="secondary" onClick={handleFinish}><CheckCircle size={14} />Finish</Button>
                  {isPaused && (
                    <Button variant="ghost" className="text-error" onClick={() => setConfirmDiscard(true)}><Trash size={14} />Discard</Button>
                  )}
                </div>
              )}
              <p className="text-[11px] text-text-faint">Space pause · F finish · N note</p>
            </div>
          )}

          {adjustEditing && (
            <div className="w-full max-w-[520px] rounded-lg p-4" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
              <div className="grid grid-cols-3 gap-3">
                <LabelInput label="Started" type="time" value={adjustStart} onChange={(v) => { setAdjustStart(v); const diff = Math.max(0, timeInputToToday(adjustEnd) - timeInputToToday(v)); setAdjustDuration(String(Math.round(diff / 60000))); }} />
                <LabelInput label="Ended" type="time" value={adjustEnd} onChange={(v) => { setAdjustEnd(v); const diff = Math.max(0, timeInputToToday(v) - timeInputToToday(adjustStart)); setAdjustDuration(String(Math.round(diff / 60000))); }} />
                <LabelInput label="Duration" type="number" value={adjustDuration} onChange={setAdjustDuration} suffix="min" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setAdjustEditing(false)}>Cancel</Button>
                <Button size="sm" variant="primary" onClick={saveAdjust}>Save</Button>
              </div>
            </div>
          )}

          {showQuickNote && (
            <form
              className="fixed bottom-20 right-6 z-[80] flex w-[280px] gap-2 rounded-lg p-2"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
              onSubmit={(e) => { e.preventDefault(); addSessionNote(noteInput); setNoteInput(""); setShowQuickNote(false); }}
            >
              <Input autoFocus placeholder="Add note..." value={noteInput} onChange={(e) => setNoteInput(e.target.value)} />
              <Button size="sm" variant="primary">Save</Button>
            </form>
          )}

          <button
            aria-label={noteCount > 0 ? `${noteCount} session notes` : "Add note"}
            title={noteCount > 0 ? `${noteCount} session notes` : "Add note"}
            onClick={() => setShowNotes(true)}
            className="fixed bottom-6 right-6 z-[70] flex h-12 max-w-[300px] items-center gap-2.5 rounded-full px-4 shadow-2xl transition-all hover:scale-[1.03]"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--accent-dim)" }}>
              <PencilSimple size={15} />
            </span>
            <span className="flex min-w-0 flex-col items-start">
              <span className="text-[12px] font-semibold text-text-primary">Notes{noteCount > 0 ? ` · ${noteCount}` : ""}</span>
              <span className="max-w-[200px] truncate text-[11px] text-text-muted">
                {noteCount > 0 ? session.notes![noteCount - 1].text : "Add a note while you work"}
              </span>
            </span>
          </button>

          <SessionNotesPanel
            open={showNotes}
            notes={session.notes ?? []}
            noteInput={noteInput}
            noteWarning={noteWarning}
            onChangeNote={(v) => { setNoteInput(v); setNoteWarning(""); }}
            onClose={() => setShowNotes(false)}
            onSubmit={() => { addSessionNote(noteInput); setNoteInput(""); setNoteWarning(""); }}
            onEdit={updateSessionNote}
            onDelete={deleteSessionNote}
          />
        </section>
        <ModalShell open={isFinishing}>
          <FinishOverlay
            isDraft={isDraft}
            elapsed={elapsed}
            sessionStartedAt={session.startedAt}
            sessionEndedAt={session.frozenAt ?? Date.now()}
            task={activeTask}
            project={activeProject}
            billable={session.billable}
            projects={projects}
            draftProjectId={draftProjectId}
            setDraftProjectId={setDraftProjectId}
            draftTaskTitle={draftTaskTitle}
            setDraftTaskTitle={setDraftTaskTitle}
            draftBillable={draftBillable}
            setDraftBillable={setDraftBillable}
            draftErrors={draftErrors}
            savedDraft={savedDraft}
            onFinished={() =>
              isDraft
                ? handleDraftConfirm({ completed: true, celebrate: true })
                : handleKnownLog({ completed: true, celebrate: true })
            }
            onContinueLater={() =>
              isDraft
                ? handleDraftConfirm({ completed: false, celebrate: false })
                : handleKnownLog({ completed: false, celebrate: false })
            }
            onSaveDraft={async () => {
              await saveSessionAsDraft();
              setSavedDraft(true);
            }}
            onDiscard={async () => { await discardSession(); router.push("/timer"); }}
            onContinue={() => { setSavedDraft(false); resumeFromFinishing(); }}
            onAdjust={openAdjust}
          />
        </ModalShell>
        </>
      )}

      {!session && (
        <>
          <DraftLedger drafts={draftSessions} projects={projects} tasks={tasks} onReview={reviewDraftSession} />
          <QuickPick tasks={quickPick} projects={projects} onStart={handleQuickStart} />
          <AddTaskModal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} defaultProjectId={projectId || undefined} />
          <AddProjectModal open={projectModalOpen} onClose={() => setProjectModalOpen(false)} />
        </>
      )}
    </div>
  );
}

function TimerCenter({ elapsed, estimateSec, remaining, isOvertime, isPaused }: { elapsed: number; estimateSec: number; remaining: number | null; isOvertime: boolean; isPaused: boolean }) {
  if (isPaused) {
    return (
      <div className="z-10 flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-[56px] font-semibold tabular-nums leading-none text-text-primary">Paused</span>
        <span className="text-[14px] font-medium text-text-secondary">Paused at {formatHMS(elapsed)}</span>
        <span className="text-[13px] text-text-faint">Paused time is not counted</span>
      </div>
    );
  }
  if (estimateSec === 0) {
    return (
      <div className="z-10 flex flex-col items-center gap-2">
        <span className="font-mono text-[68px] font-semibold tabular-nums leading-none text-text-primary">{formatHMS(elapsed)}</span>
        <span className="text-[14px] text-text-muted">Counting up · No estimate set</span>
      </div>
    );
  }
  return (
    <div className="z-10 flex flex-col items-center gap-2">
      <span className="font-mono text-[68px] font-semibold tabular-nums leading-none" style={{ color: isOvertime ? "var(--error)" : "var(--text-primary)" }}>
        {isOvertime ? `+${formatMSS(elapsed - estimateSec)}` : `${formatMSS(remaining ?? 0)}`}
      </span>
      <span className="text-[14px] font-medium text-text-muted">{isOvertime ? "overtime" : "left"}</span>
      <span className="text-[13px] text-text-faint">{isOvertime ? `${formatMinSec(elapsed)} total` : `${formatMinSec(elapsed)} worked`} · {Math.round(estimateSec / 60)}m planned</span>
    </div>
  );
}

function ModalShell({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-base/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-[620px] animate-modal-in">{children}</div>
    </div>
  );
}

function ActiveSentence({ userName, task, project, clientName, billable, isDraft, projects, tasks, onClassify }: { userName: string; task?: Task; project?: Project; clientName?: string; billable: boolean; isDraft: boolean; projects: Project[]; tasks: Task[]; onClassify: (taskId: string, projectId: string, billable: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState("");
  const [projectId, setProjectId] = useState("");
  const selectedTask = tasks.find((t) => t.id === taskId);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">{userName} is working on</span>
      <h2 className="text-[22px] font-semibold leading-tight text-text-primary">{isDraft ? "Draft session" : task?.title ?? "Untitled task"}</h2>
      <span className="text-[12px] text-text-faint">
        {isDraft ? "Classify before it counts in your report" : `for ${project?.name ?? clientName ?? "No project"} · ${billable ? "Billable" : "Non-billable"}`}
      </span>
      {isDraft && (
        <>
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>+ Add task / client</Button>
          {open && (
            <div className="flex flex-wrap justify-center gap-2 rounded-lg p-3" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
              <SelectPill value={taskId} onChange={(v) => { setTaskId(v); const t = tasks.find((item) => item.id === v); if (t) setProjectId(t.projectId); }} placeholder="task">
                {tasks.filter((t) => t.status !== "done").map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </SelectPill>
              <SelectPill value={projectId || selectedTask?.projectId || ""} onChange={setProjectId} placeholder="client">
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SelectPill>
              <Button size="sm" variant="primary" disabled={!taskId || !(projectId || selectedTask?.projectId)} onClick={() => onClassify(taskId, projectId || selectedTask!.projectId, selectedTask ? projects.find((p) => p.id === selectedTask.projectId)?.billable ?? false : false)}>Apply</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FinishOverlay(props: {
  isDraft: boolean;
  elapsed: number;
  sessionStartedAt: number;
  sessionEndedAt: number;
  task?: Task;
  project?: Project;
  billable: boolean;
  projects: Project[];
  draftProjectId: string;
  setDraftProjectId: (v: string) => void;
  draftTaskTitle: string;
  setDraftTaskTitle: (v: string) => void;
  draftBillable: boolean | null;
  setDraftBillable: (v: boolean | null) => void;
  draftErrors: string[];
  savedDraft: boolean;
  onFinished: () => void;
  onContinueLater: () => void;
  onSaveDraft: () => void;
  onDiscard: () => void;
  onContinue: () => void;
  onAdjust: () => void;
}) {
  if (props.savedDraft) {
    return (
      <div className="animate-modal-in mx-auto flex w-full max-w-[480px] flex-col items-center gap-4 rounded-2xl p-6 text-center shadow-2xl" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
        <h3 className="text-[18px] font-semibold text-text-primary">Saved to Draft Work Log</h3>
        <p className="text-[13px] text-text-muted">Confirm it later before it counts in reports.</p>
        <Button variant="primary" onClick={() => window.location.reload()}>Start another session</Button>
      </div>
    );
  }

  const finishButtons = (
    <>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button variant="primary" className="flex-1 justify-center" onClick={props.onFinished}>
          <CheckCircle size={16} />Yes, I finished
        </Button>
        <Button variant="secondary" className="flex-1 justify-center" onClick={props.onContinueLater}>
          I&apos;ll continue later
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
        <button className="text-[12px] text-text-muted transition-colors hover:text-text-primary" onClick={props.onAdjust}>Adjust time</button>
        <button className="text-[12px] text-text-muted transition-colors hover:text-text-primary" onClick={props.onContinue}>Back to timer</button>
        {props.isDraft && (
          <button className="text-[12px] text-text-muted transition-colors hover:text-text-primary" onClick={props.onSaveDraft}>Save as draft</button>
        )}
        <button className="text-[12px] text-error/80 transition-colors hover:text-error" onClick={props.onDiscard}>Discard</button>
      </div>
    </>
  );

  return (
    <div className="animate-modal-in mx-auto flex w-full max-w-[480px] flex-col gap-5 rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
      <div className="flex flex-col gap-1.5 text-center">
        <h3 className="text-[22px] font-semibold text-text-primary">Did you finish this task?</h3>
        <p className="text-[13px] text-text-muted">
          You worked {formatDuration(props.elapsed)}
          {!props.isDraft && props.task?.title ? ` on ${props.task.title}` : ""}.
        </p>
      </div>

      {!props.isDraft ? (
        <>
          <div className="rounded-lg p-4 text-center" style={{ background: "var(--surface-mid)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-[14px] font-semibold text-text-primary">{props.task?.title ?? "Untitled task"}</p>
            <p className="mt-1 text-[12px] text-text-muted">{props.project?.name ?? "No project"} · {props.billable ? "Billable" : "Non-billable"}</p>
            <p className="mt-1 text-[12px] text-text-faint">Today, {formatWallTime(props.sessionStartedAt)} – {formatWallTime(props.sessionEndedAt)}</p>
          </div>
          {finishButtons}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5"><span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Client</span><select className="h-10 rounded-md border border-border bg-surface px-3 text-[13px] text-text-primary" value={props.draftProjectId} onChange={(e) => props.setDraftProjectId(e.target.value)}><option value="">Choose client</option>{props.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <LabelInput label="Task name" value={props.draftTaskTitle} onChange={props.setDraftTaskTitle} />
          </div>
          <div className="flex gap-2">
            <Button variant={props.draftBillable === true ? "primary" : "secondary"} className="flex-1 justify-center" onClick={() => props.setDraftBillable(true)}>Billable</Button>
            <Button variant={props.draftBillable === false ? "primary" : "secondary"} className="flex-1 justify-center" onClick={() => props.setDraftBillable(false)}>Non-billable</Button>
          </div>
          {props.draftErrors.length > 0 && <div className="flex flex-col gap-1 text-[12px] text-error">{props.draftErrors.map((e) => <p key={e}>{e}</p>)}</div>}
          {finishButtons}
        </>
      )}
    </div>
  );
}

function SessionNotesPanel({ open, notes, noteInput, noteWarning, onChangeNote, onClose, onSubmit, onEdit, onDelete }: { open: boolean; notes: { id: string; timestamp: number; text: string }[]; noteInput: string; noteWarning: string; onChangeNote: (v: string) => void; onClose: () => void; onSubmit: () => void; onEdit: (id: string, text: string) => void; onDelete: (id: string) => void }) {
  if (!open) return null;
  return (
    <aside className="fixed bottom-0 right-0 top-0 z-[85] flex w-[320px] animate-slide-in-right flex-col gap-4 p-5" style={{ background: "var(--surface-raised)", borderLeft: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-[16px] font-semibold text-text-primary">Session notes</h3><p className="text-[12px] text-text-muted">Notes are timestamped while your timer is running.</p></div>
        <button onClick={onClose} aria-label="Close notes" className="text-text-muted hover:text-text-primary"><X size={16} /></button>
      </div>
      {noteWarning && <p className="rounded-md px-3 py-2 text-[12px] text-text-muted" style={{ background: "var(--surface-mid)", border: "1px solid var(--border-subtle)" }}>{noteWarning}</p>}
      <div className="flex flex-wrap gap-2">{["Blocker", "Decision", "Follow-up", "Client feedback"].map((chip) => <button key={chip} className="rounded-full px-2.5 py-1 text-[11px] text-text-muted" style={{ background: "var(--surface-mid)" }} onClick={() => onChangeNote(noteInput ? `${chip}: ${noteInput}` : `${chip}: `)}>{chip}</button>)}</div>
      <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <Textarea placeholder="Add a note..." value={noteInput} onChange={(e) => onChangeNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit(); }} />
        <Button size="sm" variant="primary" disabled={!noteInput.trim()}>Save note</Button>
      </form>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {notes.length === 0 ? <p className="text-[12px] text-text-faint">No notes yet.</p> : notes.map((note) => (
          <div key={note.id} className="group rounded-lg p-3" style={{ background: "var(--surface-mid)", border: "1px solid var(--border-subtle)" }}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] text-text-primary"><span className="font-mono text-text-faint">{formatHMS(note.timestamp)}</span> — {note.text}</p>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="text-text-muted hover:text-text-primary" onClick={() => { const next = window.prompt("Edit note", note.text); if (next !== null) onEdit(note.id, next); }} aria-label="Edit note"><PencilSimple size={13} /></button>
                <button className="text-text-muted hover:text-error" onClick={() => onDelete(note.id)} aria-label="Delete note"><Trash size={13} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function DraftLedger({ drafts, projects, tasks, onReview }: { drafts: Session[]; projects: Project[]; tasks: Task[]; onReview: (id: string) => void }) {
  if (drafts.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">Draft Work Log</h2>
        <div className="flex items-center justify-between rounded-xl px-5 py-4" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
          <div>
            <p className="text-[14px] font-medium text-text-primary">All drafts cleared.</p>
            <p className="mt-1 text-[12px] text-text-muted">Your work log is clean.</p>
          </div>
          <CheckCircle size={18} className="text-success" aria-hidden />
        </div>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">Draft Work Log</h2>
          <p className="mt-1 text-[12px] text-text-faint">
            {drafts.length} session{drafts.length === 1 ? "" : "s"} need confirmation before they count.
          </p>
        </div>
      </div>
      <div className="flex flex-col overflow-hidden rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
        {drafts.map((draft, index) => {
          const task = tasks.find((t) => t.id === draft.taskId);
          const project = projects.find((p) => p.id === draft.projectId);
          return (
            <div key={draft.id}>
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-text-primary">{task?.title ?? "Needs confirmation"}</p>
                  <p className="text-[12px] text-text-muted">{project?.name ?? "Add client"} · {formatDuration(draft.durationSeconds)} · Not in reports</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => onReview(draft.id)}>Confirm session</Button>
              </div>
              {index < drafts.length - 1 && <div className="mx-5 h-px" style={{ background: "var(--border-subtle)" }} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuickPick({ tasks, projects, onStart }: { tasks: Task[]; projects: Project[]; onStart: (task: Task) => void }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">Or pick from your tasks</h2>
      <div className="flex flex-col overflow-hidden rounded-xl" style={{ background: "var(--surface)" }}>
        {tasks.length === 0 && <p className="px-5 py-4 text-[13px] text-text-muted">No tasks. Create one in the Tasks tab.</p>}
        {tasks.map((t, i) => {
          const proj = projects.find((p) => p.id === t.projectId);
          return (
            <div key={t.id}>
              <div className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-raised">
                <UrgencyDot urgency={t.urgency} />
                <span className="flex-1 truncate text-[14px] text-text-primary">{t.title}</span>
                {t.estimateMinutes && <span className="text-[11px] text-text-faint tabular-nums">{t.estimateMinutes}m</span>}
                <span className="text-[12px] text-text-muted">{proj?.name}</span>
                <button onClick={() => onStart(t)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium opacity-0 transition-all group-hover:opacity-100" style={{ background: "var(--accent)", color: "var(--text-primary)" }}><Lightning size={11} />Start</button>
              </div>
              {i < tasks.length - 1 && <div className="mx-5 h-px" style={{ background: "var(--border-subtle)" }} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SelectPill({ value, onChange, placeholder, children }: { value: string; onChange: (value: string) => void; placeholder: string; children: React.ReactNode }) {
  return (
    <select className="h-9 max-w-[220px] rounded-full border border-border-subtle bg-surface-raised px-3 text-[13px] font-medium text-text-primary outline-none" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

function EntitySelectPill({
  value,
  onChange,
  placeholder,
  items,
  createLabel,
  onCreate,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  items: { value: string; label: string; meta?: string }[];
  createLabel: string;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = items.find((item) => item.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 min-w-[180px] items-center justify-between gap-2 rounded-full border border-border-subtle bg-surface-raised px-3 text-[13px] font-medium text-text-primary transition-all duration-150 hover:bg-surface-mid active:scale-[0.98] btn-interactive focus-ring"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <CaretDown
          size={12}
          className={`shrink-0 text-text-faint transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[70] min-w-[260px] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2xl animate-dropdown-in">
          <div className="max-h-[280px] overflow-y-auto py-1">
            {items.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-text-muted">No options yet.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                    item.value === value
                      ? "bg-surface-mid text-text-primary"
                      : "text-text-secondary hover:bg-surface-mid hover:text-text-primary"
                  }`}
                >
                  <span className="truncate text-[13px]">{item.label}</span>
                  {item.meta && <span className="shrink-0 text-[11px] text-text-faint">{item.meta}</span>}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-border-subtle p-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreate();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-mid hover:text-text-primary"
            >
              <Plus size={13} />
              {createLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BillingToggle({ billable, onToggle }: { billable: boolean; onToggle: () => void }) {
  return <button type="button" onClick={onToggle} className="rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-150 active:scale-[0.98] btn-interactive focus-ring border border-border-subtle hover:border-text-secondary" style={{ background: billable ? "var(--accent-dim)" : "var(--surface-mid)", color: billable ? "var(--accent-hover)" : "var(--text-muted)" }}>{billable ? "$ billable" : "internal"}</button>;
}

function LabelInput({ label, value, onChange, type = "text", suffix }: { label: string; value: string; onChange: (v: string) => void; type?: string; suffix?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="text-[12px] text-text-muted">{suffix}</span>}
      </div>
    </label>
  );
}
