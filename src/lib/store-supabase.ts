"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, getAppOrigin, GoogleCalendarReconnectError } from "./supabase";
import type {
  AgentSegment,
  Client,
  GoogleCalendarConnection,
  GoogleCalendarEvent,
  IdleRecovery,
  IdleRecoveryAction,
  Project,
  Task,
  Session,
  Urgency,
  TaskStatus,
  UserPreferences,
  UserProfile,
  UserProfilePatch,
} from "./types";
import type {
  CreateReportShareInput,
  CreateReportShareResult,
  ReportShare,
  UpdateReportShareInput,
} from "./report/share-types";
import { uid } from "./format";
import { getSyncEngine } from "./sync-engine";
import { isOnline } from "./desktop";
import {
  applyProjectClientPatch,
  findClientByNormalizedName,
  planProjectClientLink,
} from "./clients";
import {
  activeSince,
  durationAtIdleStart,
  elapsedSecondsFor,
  idleStartedAt,
  TIMELINE_VERSION,
} from "./session-timeline";
import {
  describeIdleResolution,
  isResolvable,
  resolveIdleRecovery as resolveIdleRecoveryPatch,
} from "./idle-recovery";
import {
  appendSegment,
  closeSegment,
  draftFromRun,
  openSegment,
  type AgentRunStart,
} from "./agent-runs";

/**
 * Single source of defaults. Previously the initial state and setPreferences
 * each declared their own copy, and they had already drifted — setPreferences
 * omitted alarmSound, so changing any preference silently dropped it.
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  /** 0 = open-ended (count up from zero). Only apply when user sets a real default. */
  defaultFocusDuration: 0,
  weeklyTargetHours: 40,
  whistleSoundEnabled: true,
  alarmSound: "kettle",
  autoBreakEnabled: false,
  autoPauseOnIdleEnabled: true,
  activeMascot: "kettle",
  mascotAnimationFrequency: "normal",
  mascotDefaultAnimation: "waiting",
  petBreakRemindersEnabled: false,
  petBreakIntervalMinutes: 45,
  petCustomRemindersEnabled: false,
  petCustomReminders: [],
  petNotesIntegrationEnabled: false,
  petIntelligenceEnabled: true,
  agentFinishCelebrationEnabled: true,
  idleThresholdMinutes: 5,
};

/** Debounce window for preference writes (ms). */
/**
 * Where Google sends the user back after consent. Must appear verbatim in the
 * edge function's GOOGLE_OAUTH_REDIRECT_URIS allowlist *and* in the Google
 * Cloud console's authorised redirect URIs — Google compares it byte for byte.
 *
 * getAppOrigin() rather than window.location.origin: the Tauri desktop build
 * runs on a tauri.localhost origin that Google will not accept as a redirect
 * target, and getAppOrigin already resolves that to the public site URL for
 * exactly this reason (see src/lib/supabase.ts).
 */
function googleCalendarRedirectUri(): string {
  return `${getAppOrigin()}/settings/google-calendar/callback`;
}

const PREFERENCES_PUSH_DELAY = 800;

let preferencesPushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePreferencesPush(run: () => void) {
  cancelPreferencesPush();
  preferencesPushTimer = setTimeout(() => {
    preferencesPushTimer = null;
    run();
  }, PREFERENCES_PUSH_DELAY);
}

function cancelPreferencesPush() {
  if (preferencesPushTimer) {
    clearTimeout(preferencesPushTimer);
    preferencesPushTimer = null;
  }
}

type SyncEntity = "clients" | "projects" | "tasks" | "sessions";
type SyncAction = "create" | "update" | "delete";
type TaskPatch = Omit<Partial<Task>, "completedAt" | "archivedAt" | "deletedAt"> & {
  completedAt?: number | null;
  archivedAt?: number | null;
  deletedAt?: number | null;
};

/** Push a mutation onto the offline sync queue (replayed when back online). */
function queueMutation(
  entity: SyncEntity,
  action: SyncAction,
  entityId: string,
  payload: Record<string, unknown>
) {
  getSyncEngine().enqueue({ entity, action, entityId, payload });
}

function normalizeSession(session: Session): Session {
  const state = session.state ?? (session.endedAt ? "confirmed" : session.paused ? "paused" : "running");
  return {
    ...session,
    taskId: session.taskId ?? "",
    projectId: session.projectId ?? "",
    paused: state === "paused" || state === "finishing" || session.paused === true,
    state,
    notes: session.notes ?? [],
    isDraft: session.isDraft ?? (state === "draft" || !session.taskId || !session.projectId),
    estimateMinutes: session.estimateMinutes,
  };
}

/**
 * True when the server minted this id. Local rows come from `uid()` (16 chars);
 * Postgres mints 36-char uuids. The threshold is asserted by a test in
 * store-sessions.test.ts so a change to `uid()` can't silently reroute writes.
 */
function isRemoteId(id: string): boolean {
  return id.length >= 20;
}

function handleSessionApiError(
  id: string,
  error: unknown,
  defaultMessage: string,
  set: (patch: Partial<State>) => void,
  get: () => State
) {
  const msg = error instanceof Error ? error.message : String(error);
  const isNotFound = msg.includes('404') ||
                     msg.toLowerCase().includes('not found') ||
                     msg.includes('PGRST116') ||
                     msg.includes('no rows returned') ||
                     msg.includes('multiple or no rows');
  if (isNotFound) {
    set({
      sessions: get().sessions.filter((s: Session) => s.id !== id),
      activeSessionId: null,
      error: "Session not found on server. Cleared locally.",
    });
  } else {
    set({ error: msg || defaultMessage });
  }
}

/**
 * Persist a session patch. Local-only rows have nothing to update remotely;
 * offline rows go on the sync queue instead of throwing and losing the change.
 */
async function persistSessionPatch(id: string, patch: Partial<Session>) {
  if (!isRemoteId(id)) return;
  if (!isOnline()) {
    queueMutation("sessions", "update", id, patch as Record<string, unknown>);
    return;
  }
  await api.sessions.update(id, patch);
}

function elapsedFor(session: Session) {
  return elapsedSecondsFor(normalizeSession(session));
}

// If a "running" session's startedAt is older than this, treat it as stale
// (app was killed / machine slept) and freeze it instead of letting elapsed
// balloon into hours or days on the next open.
const STALE_RUNNING_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

function freezeStaleRunning(sessions: Session[]): Session[] {
  const now = Date.now();
  return sessions.map((s) => {
    if (s.state !== "running" || s.endedAt) return s;
    // Measure the *current running stretch*, not the original start — a session
    // started this morning and resumed a minute ago is not stale.
    if (now - activeSince(s) <= STALE_RUNNING_THRESHOLD_MS) return s;
    // Cap only the untrusted stretch. Time banked by earlier stretches is real
    // work and must survive the freeze.
    const banked = s.durationSeconds ?? 0;
    const capped = banked + Math.min(
      Math.max(0, Math.floor((now - activeSince(s)) / 1000)),
      Math.floor(STALE_RUNNING_THRESHOLD_MS / 1000)
    );
    return {
      ...s,
      state: "paused" as const,
      paused: true,
      durationSeconds: capped,
      frozenAt: s.frozenAt ?? activeSince(s) + (capped - banked) * 1000,
    };
  });
}

/**
 * One-off repair for rows written by the old resume path.
 *
 * That path stamped `startedAt` with the resume moment and left an older
 * `resumedAt` from idle recovery in place. `activeSince` prefers `resumedAt`,
 * so those rows measure elapsed from a stamp that predates their own start and
 * bill the gap between the two. Under the old semantics `startedAt` *was* the
 * last resume, so it is the trustworthy value — drop the stale stamp.
 *
 * Correct rows have `resumedAt >= startedAt` and are left untouched.
 */
export function repairStaleResumedAt(sessions: Session[]): Session[] {
  return sessions.map((s) => {
    if (s.resumedAt == null || s.resumedAt >= s.startedAt) return s;
    const { resumedAt: _stale, ...rest } = s;
    return rest as Session;
  });
}

function mergeSessionLists(remoteSessions: Session[], localSessions: Session[]) {
  const localSessionsMap = new Map(localSessions.map((s) => [s.id, s]));
  const remoteIds = new Set(remoteSessions.map((session) => session.id));
  const pendingUpdates = getSyncEngine().getPendingUpdates("sessions");

  const mergedRemote = remoteSessions.map((remote) => {
    const pending = pendingUpdates.get(remote.id);
    if (pending) {
      return normalizeSession({ ...remote, ...(pending as Partial<Session>) });
    }

    const local = localSessionsMap.get(remote.id);
    if (!local) return remote;

    // Prefer a newer local edit (offline / pre-sync) over a stale remote row.
    const localUpdated = local.updatedAt ?? 0;
    const remoteUpdated = remote.updatedAt ?? 0;
    if (localUpdated > remoteUpdated) {
      return normalizeSession({
        ...remote,
        ...local,
        estimateMinutes: local.estimateMinutes ?? remote.estimateMinutes,
        completionAckMinutes: local.completionAckMinutes ?? remote.completionAckMinutes,
      });
    }

    if (local.estimateMinutes || local.completionAckMinutes) {
      return {
        ...remote,
        estimateMinutes: local.estimateMinutes ?? remote.estimateMinutes,
        completionAckMinutes: local.completionAckMinutes ?? remote.completionAckMinutes,
      };
    }
    return remote;
  });

  // Keep local-only sessions (including confirmed offline entries) until the
  // server list includes them. Dropping confirmed locals made time logs vanish.
  const localOnly = localSessions.filter(
    (session) => !remoteIds.has(session.id) && !getSyncEngine().getPendingDeletes("sessions").has(session.id)
  );
  return [...mergedRemote, ...localOnly].map(normalizeSession);
}

function applyPendingTaskUpdates(tasks: Task[]): Task[] {
  const pending = getSyncEngine().getPendingUpdates("tasks");
  if (pending.size === 0) return tasks;
  return tasks.map((task) => {
    const patch = pending.get(task.id);
    return patch ? ({ ...task, ...(patch as Partial<Task>) } as Task) : task;
  });
}

function withTaskDisplayFallbacks(tasks: Task[]) {
  return tasks.map((task) => ({
    ...task,
    title: task.title?.trim() || `New test task ${task.id.slice(0, 8)}`,
    projectId: task.projectId || null,
    urgency: task.urgency || "normal",
    status: task.status || "todo",
  }));
}

function withProjectDisplayFallbacks(projects: Project[]) {
  return projects.map((project) => ({
    ...project,
    name: project.name?.trim() || `New test project ${project.id.slice(0, 8)}`,
    color: project.color || "indigo",
    billable: project.billable ?? false,
    status: project.status || "active",
  }));
}

function reconcileSessionTasks(tasks: Task[], sessions: Session[]) {
  const taskIds = new Set(tasks.map((task) => task.id));
  const missingTasks = sessions
    .filter((session) => session.taskId && !taskIds.has(session.taskId))
    .map((session) => {
      const sessionData = session as Session & { taskTitle?: string; title?: string };
      return {
        id: session.taskId,
        title: sessionData.taskTitle?.trim() || sessionData.title?.trim() || `New test task ${session.taskId.slice(0, 8)}`,
        projectId: session.projectId,
        urgency: "normal" as Urgency,
        status: "todo" as TaskStatus,
        dateRange: new Date(session.startedAt).toISOString().split("T")[0],
        createdAt: session.startedAt,
        updatedAt: session.endedAt ?? session.startedAt,
      };
    });

  return missingTasks.length > 0 ? [...tasks, ...missingTasks] : tasks;
}

function taskUpdatePayload(current: Task | undefined, patch: TaskPatch) {
  return current ? { ...current, ...patch } : patch;
}

interface State {
  user: { name: string; email?: string } | null;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  sessions: Session[];
  activeSessionId: string | null;
  selectedProjectId: string | null;
  selectedUrgency: Urgency | "all";
  isLoading: boolean;
  error: string | null;
  lastDailyArchiveDate?: string;
  initialLoadComplete: boolean;
  reportShares: ReportShare[];
  reportSharesLoaded: boolean;
  /** `user_profiles` row for the signed-in user. null = not loaded, or none yet. */
  profile: UserProfile | null;
  profileLoaded: boolean;

  // Actions
  setUser: (user: { name: string; email?: string } | null) => void;
  clearError: () => void;
  
  addClient: (c: Omit<Client, "id">) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Omit<Client, "id">>) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;
  /**
   * Resolve a project form’s client name field into a clientId.
   * Edits the linked client in place; empty name clears. Never opens a picker.
   */
  resolveProjectClientLink: (input: {
    linkedClientId?: string | null;
    clientName: string;
  }) => Promise<string | null>;
  addProject: (p: Omit<Project, "id">) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Omit<Project, "id">>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  
  addTask: (t: Omit<Task, "id" | "createdAt" | "status"> & { status?: TaskStatus }) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>;

  startSession: (taskId: string, billable?: boolean, estimateMinutes?: number) => Promise<Session | null>;
  startDraftSession: (projectId?: string, billable?: boolean, estimateMinutes?: number) => Promise<Session | null>;
  pauseSession: () => Promise<void>;
  /** Auto-pause at the moment input stopped, leaving a gap to resolve. */
  pauseSessionForIdle: (idleSeconds: number) => Promise<void>;
  /** Stamp the return so the gap has a real end. */
  markIdleReturn: (awaySeconds: number) => void;
  /**
   * Apply the user's decision about an idle gap. Idempotent per recovery id.
   * Resolves to a short confirmation of what changed, or `null` when there was
   * nothing left to resolve.
   */
  resolveIdleRecovery: (action: IdleRecoveryAction) => Promise<string | null>;
  /** The session holding an unresolved idle gap, if any. */
  pendingIdleRecoverySessionId: string | null;
  /**
   * Live agent runs (in-memory only — not persisted, not synced).
   * Keyed by runId. Opened by the desktop bridge; closed into a session
   * segment or a draft when the run ends.
   */
  agentRuns: Record<string, AgentSegment>;
  /** Open a live agent segment. Does not start a timer. */
  beginAgentRun: (run: AgentRunStart) => void;
  /**
   * Close a live agent run. With an active session, appends to agentSegments
   * (full array). With no session, may create an unclassified draft. Never
   * auto-starts a timer.
   */
  endAgentRun: (runId: string, status: AgentSegment["status"]) => void;
  resumeSession: () => Promise<void>;
  finishSession: () => Promise<void>;
  resumeFromFinishing: () => Promise<void>;
  confirmSession: (adjustedSeconds?: number) => Promise<Session | null>;
  saveSessionAsDraft: () => Promise<void>;
  reviewDraftSession: (id: string) => void;
  discardSession: () => Promise<void>;
  classifyDraftSession: (taskId: string, projectId: string, billable: boolean) => void;
  addSessionNote: (text: string) => void;
  updateSessionNote: (noteId: string, text: string) => void;
  deleteSessionNote: (noteId: string) => void;
  stopSession: () => Promise<Session | null>;
  adjustSessionDuration: (id: string, seconds: number) => Promise<void>;
  /** Create a confirmed past time entry without running the timer. */
  addManualSession: (input: {
    taskId?: string;
    taskTitle?: string;
    projectId: string;
    startedAt: number;
    endedAt: number;
    billable?: boolean;
    description?: string;
  }) => Promise<Session | null>;
  /** Edit an existing confirmed time log. */
  updateManualSession: (
    id: string,
    input: {
      taskId?: string;
      taskTitle?: string;
      projectId: string;
      startedAt: number;
      endedAt: number;
      billable?: boolean;
      description?: string;
    }
  ) => Promise<Session | null>;

  /** Session id whose completion alarm is currently ringing (transient). */
  completionAlarmSessionId: string | null;
  markCompletionAlarm: (sessionId: string, estimateMinutes: number) => void;
  dismissCompletionAlarm: () => void;
  extendSession: (minutes: number) => Promise<void>;

  setSelectedProject: (id: string | null) => void;
  setSelectedUrgency: (u: Urgency | "all") => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Data loading
  loadClients: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadTasks: () => Promise<void>;
  loadSessions: () => Promise<void>;
  loadAll: () => Promise<void>;
  clearAll: () => void;
  performDailyArchive: () => Promise<void>;

  loadReportShares: () => Promise<void>;
  createReportShare: (input: CreateReportShareInput) => Promise<CreateReportShareResult>;
  updateReportShare: (id: string, input: UpdateReportShareInput) => Promise<ReportShare>;
  revokeReportShare: (id: string) => Promise<ReportShare>;
  rotateReportShareToken: (id: string) => Promise<CreateReportShareResult>;
  deleteReportShare: (id: string) => Promise<void>;

  loadProfile: () => Promise<UserProfile | null>;
  saveProfile: (patch: UserProfilePatch) => Promise<UserProfile>;

  preferences?: UserPreferences;
  /** Last local preference edit (ms). Compared against the server clock on load. */
  preferencesUpdatedAt?: number;
  /** Local edits not yet accepted by the server. Retried on next edit or load. */
  preferencesDirty: boolean;
  setPreferences: (patch: Partial<UserPreferences>) => void;
  /** Push pending preferences now, bypassing the debounce. */
  flushPreferences: () => Promise<void>;

  /**
   * Google Calendar overlay. Status is cheap and persisted to avoid a flash of
   * "not connected"; events are view-window caches and stay in memory only.
   */
  googleCalendar?: GoogleCalendarConnection;
  googleCalendarLoaded: boolean;
  googleEvents: GoogleCalendarEvent[];
  /** Window currently covered by `googleEvents` — skip refetch when the view is inside it. */
  googleEventsRange?: { start: number; end: number };
  googleEventsLoading: boolean;
  googleCalendarError?: "reconnect_required" | "failed";

  loadGoogleCalendarStatus: () => Promise<void>;
  loadGoogleEvents: (startMs: number, endMs: number) => Promise<void>;
  /** Returns the OAuth URL; the caller performs the redirect. */
  connectGoogleCalendar: () => Promise<string>;
  completeGoogleCalendarConnect: (code: string, state: string) => Promise<void>;
  setGoogleCalendars: (ids: string[]) => Promise<void>;
  disconnectGoogleCalendar: () => Promise<void>;
}

export const useApp = create<State>()(
persist((set, get) => ({
  user: null,
  clients: [],
  projects: [],
  tasks: [],
  sessions: [],
  activeSessionId: null,
  pendingIdleRecoverySessionId: null,
  agentRuns: {},
  completionAlarmSessionId: null,
  selectedProjectId: null,
  selectedTaskId: null,
  selectedUrgency: "all",
  isLoading: false,
  error: null,
  lastDailyArchiveDate: undefined,
  initialLoadComplete: false,
  reportShares: [],
  reportSharesLoaded: false,
  profile: null,
  profileLoaded: false,

  preferences: { ...DEFAULT_PREFERENCES },
  preferencesUpdatedAt: undefined,
  preferencesDirty: false,

  googleCalendar: undefined,
  googleCalendarLoaded: false,
  googleEvents: [],
  googleEventsRange: undefined,
  googleEventsLoading: false,
  googleCalendarError: undefined,

  setPreferences: (patch) => {
    set({
      preferences: { ...DEFAULT_PREFERENCES, ...(get().preferences ?? {}), ...patch },
      // Date.now() only has millisecond granularity. Two edits inside one tick
      // would share a stamp, and flushPreferences' `> stamp` check would then
      // clear the dirty flag for an edit it never pushed — a silently lost
      // setting. Force the stamp strictly upward instead.
      preferencesUpdatedAt: Math.max(Date.now(), (get().preferencesUpdatedAt ?? 0) + 1),
      preferencesDirty: true,
    });
    // Settings fires this per keystroke (weekly target is a number input), so
    // coalesce rather than issuing a write per character.
    schedulePreferencesPush(() => {
      void get().flushPreferences();
    });
  },

  flushPreferences: async () => {
    cancelPreferencesPush();
    if (!get().preferencesDirty) return;

    const preferences = get().preferences;
    if (!preferences) return;
    const stamp = get().preferencesUpdatedAt ?? Date.now();

    try {
      const profile = await api.profile.upsert({
        preferences,
        preferencesUpdatedAt: stamp,
      });
      // Only clear the flag if no newer edit landed while the write was in
      // flight — otherwise that edit would never be pushed.
      set({
        profile,
        profileLoaded: true,
        preferencesDirty: (get().preferencesUpdatedAt ?? 0) > stamp,
      });
    } catch (error) {
      console.error("Failed to sync preferences:", error);
      // Stays dirty. Retried on the next edit or the next loadProfile.
    }
  },

  loadGoogleCalendarStatus: async () => {
    try {
      const connection = await api.googleCalendar.status();
      // Revoked at Google still returns a status row — surface reconnect, not silence.
      if (connection.revokedAt) {
        set({
          googleCalendar: connection,
          googleCalendarLoaded: true,
          googleCalendarError: "reconnect_required",
          googleEvents: [],
          googleEventsRange: undefined,
        });
      } else {
        set({
          googleCalendar: connection,
          googleCalendarLoaded: true,
          googleCalendarError: undefined,
        });
      }
    } catch (error) {
      console.error("Failed to load Google Calendar status:", error);
      // Always flip loaded so settings/calendar stop spinning on a dead endpoint.
      if (error instanceof GoogleCalendarReconnectError) {
        set({
          googleCalendarLoaded: true,
          googleCalendarError: "reconnect_required",
          googleEvents: [],
          googleEventsRange: undefined,
        });
      } else {
        set({
          googleCalendarLoaded: true,
          googleCalendarError: "failed",
        });
      }
    }
  },

  loadGoogleEvents: async (startMs, endMs) => {
    const connection = get().googleCalendar;
    // Calendar page mounts either way — never hit the API when not connected.
    if (!connection?.connected) return;

    const range = get().googleEventsRange;
    // View changes re-render often; only fetch when the requested window is new
    // or extends past what we already hold.
    if (range && range.start <= startMs && range.end >= endMs) return;

    set({ googleEventsLoading: true });
    try {
      const { events } = await api.googleCalendar.listEvents(startMs, endMs);
      set({
        googleEvents: events ?? [],
        googleEventsRange: { start: startMs, end: endMs },
        googleEventsLoading: false,
        googleCalendarError: undefined,
      });
    } catch (error) {
      console.error("Failed to load Google Calendar events:", error);
      if (error instanceof GoogleCalendarReconnectError) {
        set({
          googleEvents: [],
          googleEventsRange: undefined,
          googleEventsLoading: false,
          googleCalendarError: "reconnect_required",
        });
      } else {
        set({
          googleEventsLoading: false,
          googleCalendarError: "failed",
        });
      }
    }
  },

  connectGoogleCalendar: async () => {
    try {
      const { url } = await api.googleCalendar.authUrl(googleCalendarRedirectUri());
      return url;
    } catch (error) {
      console.error("Failed to get Google Calendar auth URL:", error);
      set({ googleCalendarError: "failed" });
      // Empty string: caller must not redirect; outage must not throw into the app shell.
      return "";
    }
  },

  completeGoogleCalendarConnect: async (code, state) => {
    try {
      const connection = await api.googleCalendar.completeConnect(
        code,
        state,
        googleCalendarRedirectUri()
      );
      set({
        googleCalendar: connection,
        googleCalendarLoaded: true,
        googleCalendarError: undefined,
        // Fresh link — any pre-connect event cache is meaningless.
        googleEvents: [],
        googleEventsRange: undefined,
      });
    } catch (error) {
      console.error("Failed to complete Google Calendar connect:", error);
      if (error instanceof GoogleCalendarReconnectError) {
        set({ googleCalendarError: "reconnect_required" });
      } else {
        set({ googleCalendarError: "failed" });
      }
    }
  },

  setGoogleCalendars: async (ids) => {
    try {
      const connection = await api.googleCalendar.setSelectedCalendars(ids);
      set({
        googleCalendar: connection,
        googleCalendarError: undefined,
        // Selection changed — cached events may be from calendars no longer selected.
        googleEvents: [],
        googleEventsRange: undefined,
      });
    } catch (error) {
      console.error("Failed to update Google Calendar selection:", error);
      if (error instanceof GoogleCalendarReconnectError) {
        set({
          googleCalendarError: "reconnect_required",
          googleEvents: [],
          googleEventsRange: undefined,
        });
      } else {
        set({ googleCalendarError: "failed" });
      }
    }
  },

  disconnectGoogleCalendar: async () => {
    try {
      await api.googleCalendar.disconnect();
      set({
        googleCalendar: { connected: false, selectedCalendarIds: [] },
        googleCalendarLoaded: true,
        googleEvents: [],
        googleEventsRange: undefined,
        googleEventsLoading: false,
        googleCalendarError: undefined,
      });
    } catch (error) {
      console.error("Failed to disconnect Google Calendar:", error);
      // Still clear local state — the user asked to disconnect; a flaky DELETE
      // must not leave the UI looking connected.
      set({
        googleCalendar: { connected: false, selectedCalendarIds: [] },
        googleEvents: [],
        googleEventsRange: undefined,
        googleEventsLoading: false,
        googleCalendarError: "failed",
      });
    }
  },

  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),

  addClient: async (c) => {
    set({ isLoading: true, error: null });
    try {
      // Prevent duplicates: normalized name match returns the existing client.
      const existing = findClientByNormalizedName(get().clients, c.name);
      if (existing) return existing;

      const payload = { ...c, name: c.name.trim() };
      if (!isOnline()) {
        const local = { ...payload, id: uid() } as Client;
        set({ clients: [...get().clients, local] });
        queueMutation("clients", "create", local.id, { ...payload });
        return local;
      }
      const created = await api.clients.create(payload);
      // Race-safe: if server/another path returned a name we already hold, reuse it.
      const again = findClientByNormalizedName(get().clients, created.name);
      if (again && again.id !== created.id) return again;
      if (!get().clients.some((x) => x.id === created.id)) {
        set({ clients: [...get().clients, created] });
      }
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create client' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateClient: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        set({ clients: get().clients.map((c) => c.id === id ? { ...c, ...updates } : c) });
        queueMutation("clients", "update", id, { ...updates });
        return get().clients.find((c) => c.id === id) as Client;
      }
      const updated = await api.clients.update(id, updates);
      set({ clients: get().clients.map((c) => c.id === id ? { ...c, ...updated } : c) });
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update client' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteClient: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const clearProjects = (projects: Project[]) =>
        projects.map((p) => {
          if (p.clientId !== id) return p;
          const next = { ...p };
          delete (next as { clientId?: string | null }).clientId;
          return next;
        });

      if (!isOnline()) {
        set({
          clients: get().clients.filter((c) => c.id !== id),
          projects: clearProjects(get().projects),
        });
        queueMutation("clients", "delete", id, {});
        return;
      }
      await api.clients.delete(id);
      set({
        clients: get().clients.filter((c) => c.id !== id),
        projects: clearProjects(get().projects),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete client' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  resolveProjectClientLink: async ({ linkedClientId, clientName }) => {
    const plan = planProjectClientLink({
      linkedClientId,
      clientName,
      clients: get().clients,
    });

    switch (plan.action) {
      case "clear":
        return null;
      case "keep":
      case "assignExisting":
        return plan.clientId;
      case "rename": {
        await get().updateClient(plan.clientId, { name: plan.name });
        return plan.clientId;
      }
      case "create": {
        const created = await get().addClient({ name: plan.name, hourlyRate: 0 });
        return created.id;
      }
    }
  },

  addProject: async (p) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        const local = { ...p, id: uid() } as Project;
        set({ projects: [...get().projects, local] });
        queueMutation("projects", "create", local.id, { ...p });
        return local;
      }
      const created = await api.projects.create(p);
      set({ projects: [...get().projects, created] });
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProject: async (id, patch) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        set({
          projects: get().projects.map((p) =>
            p.id === id ? applyProjectClientPatch(p, patch) : p
          ),
        });
        queueMutation("projects", "update", id, { ...patch });
        return;
      }
      const updated = await api.projects.update(id, patch);
      // Apply patch first so cleared fields (null clientId / rates) stick when
      // the server response omits them; then layer server fields on top and
      // re-clear client when the patch explicitly unassigned.
      set({
        projects: get().projects.map((p) => {
          if (p.id !== id) return p;
          let next = applyProjectClientPatch(p, patch);
          next = { ...next, ...updated };
          if (patch.clientId === null || patch.clientId === "") {
            next = applyProjectClientPatch(next, { clientId: null });
          } else if (patch.clientId) {
            next = { ...next, clientId: patch.clientId };
          }
          return next;
        }),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        set({ projects: get().projects.filter((p) => p.id !== id) });
        queueMutation("projects", "delete", id, {});
        return;
      }
      await api.projects.delete(id);
      set({ projects: get().projects.filter((p) => p.id !== id) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  archiveProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const now = Date.now();
      await api.projects.update(id, { archived: true, archivedAt: now, status: "archived" });
      set({
        projects: get().projects.map((p) => (p.id === id ? { ...p, archived: true, archivedAt: now, status: "archived" } : p)),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to archive project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  restoreProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.projects.update(id, { archived: false, archivedAt: null, status: "active" });
      set({
        projects: get().projects.map((p) => {
          if (p.id === id) {
            const nextProj = { ...p, archived: false, status: "active" as const };
            delete nextProj.archivedAt;
            return nextProj;
          }
          return p;
        }),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to restore project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addTask: async (t) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        const local = {
          ...t,
          id: uid(),
          status: t.status ?? "todo",
          createdAt: Date.now(),
        } as Task;
        set({ tasks: [...get().tasks, local] });
        queueMutation("tasks", "create", local.id, { ...t, status: t.status ?? "todo" });
        return local;
      }
      const created = await api.tasks.create({
        ...t,
        status: t.status ?? "todo",
      });
      set({ tasks: [...get().tasks, created] });
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateTask: async (id, patch) => {
    set({ isLoading: true, error: null });
    try {
      const current = get().tasks.find((t) => t.id === id);
      if (!isOnline()) {
        set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
        queueMutation("tasks", "update", id, taskUpdatePayload(current, patch));
        return;
      }
      const updated = await api.tasks.update(id, taskUpdatePayload(current, patch));
      set({
        tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (!isOnline()) {
        set({ tasks: get().tasks.filter((t) => t.id !== id) });
        queueMutation("tasks", "delete", id, {});
        return;
      }
      await api.tasks.delete(id);
      set({ tasks: get().tasks.filter((t) => t.id !== id) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  archiveTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const now = Date.now();
      const task = get().tasks.find((t) => t.id === id);
      await api.tasks.update(id, taskUpdatePayload(task, { archived: true, archivedAt: now }));
      set({
        tasks: get().tasks.map((t) => (t.id === id ? { ...t, archived: true, archivedAt: now } : t)),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to archive task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  restoreTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const task = get().tasks.find((t) => t.id === id);
      await api.tasks.update(id, taskUpdatePayload(task, { archived: false, archivedAt: null }));
      set({
        tasks: get().tasks.map((t) => {
          if (t.id === id) {
            const nextTask = { ...t, archived: false };
            delete nextTask.archivedAt;
            return nextTask;
          }
          return t;
        }),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to restore task' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setTaskStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const task = get().tasks.find((t) => t.id === id);
      // Include the full task payload so the edge function merge never loses the title,
      // even if the DB JSONB is incomplete or stale.
      const patch: TaskPatch = { ...(task ?? {}), status };
      if (status === "done") {
        patch.completedAt = Date.now();
      } else {
        patch.completedAt = null;
      }
      const updated = await api.tasks.update(id, patch);
      set({
        tasks: get().tasks.map((t) => {
          if (t.id === id) {
            const nextTask = { ...t, ...updated };
            if (status !== "done") {
              delete nextTask.completedAt;
            }
            return nextTask;
          }
          return t;
        }),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update task status' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  startSession: async (taskId, billable, estimateMinutes) => {
    if (get().activeSessionId) return null;
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return null;
    
    const project = get().projects.find((p) => p.id === task.projectId);
    
    set({ isLoading: true, error: null });
    try {
      const payload = {
        taskId,
        projectId: task.projectId,
        billable: billable ?? project?.billable ?? false,
        startedAt: Date.now(),
        durationSeconds: 0,
        paused: false,
        state: "running" as const,
        isDraft: false,
        notes: [],
        timelineVersion: TIMELINE_VERSION,
      };

      // Offline start must still produce a running timer — the create replays
      // on reconnect like every other entity.
      const session = isOnline()
        ? await api.sessions.create(payload)
        : (() => {
            const local = normalizeSession({ ...payload, projectId: payload.projectId ?? "", id: uid() });
            queueMutation("sessions", "create", local.id, { ...payload });
            return local;
          })();

      const sessionWithEstimate = {
        ...session,
        estimateMinutes: estimateMinutes ?? task.estimateMinutes,
      };

      set({
        sessions: [...get().sessions, sessionWithEstimate],
        activeSessionId: sessionWithEstimate.id,
      });
      
      // Auto-update task status to doing if it was todo
      if (task.status === "todo") {
        await get().setTaskStatus(taskId, "doing");
      }
      
      return sessionWithEstimate;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to start session' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  startDraftSession: async (projectId = "", billable = false, estimateMinutes) => {
    if (get().activeSessionId) return null;
    const session: Session = {
      id: uid(),
      taskId: "",
      projectId,
      billable,
      startedAt: Date.now(),
      durationSeconds: 0,
      paused: false,
      state: "running",
      isDraft: true,
      notes: [],
      estimateMinutes,
      timelineVersion: TIMELINE_VERSION,
    };
    set({
      sessions: [...get().sessions, session],
      activeSessionId: session.id,
    });
    return session;
  },

  beginAgentRun: (run) => {
    if (!run.runId || !run.agent) return;
    const now = Date.now();
    // Duplicate start with same runId renews the open segment, no second row.
    const existing = get().agentRuns[run.runId];
    const opened = existing
      ? {
          ...existing,
          agent: run.agent || existing.agent,
          label: run.label ?? existing.label,
          status: "running" as const,
        }
      : openSegment(run, now);
    set({
      agentRuns: { ...get().agentRuns, [run.runId]: opened },
    });
  },

  endAgentRun: (runId, status) => {
    if (!runId) return;
    const live = get().agentRuns[runId];
    if (!live) return;

    const now = Date.now();
    const closed = closeSegment(live, status, now);

    const { [runId]: _removed, ...rest } = get().agentRuns;
    set({ agentRuns: rest });

    const activeId = get().activeSessionId;
    const active = activeId
      ? get().sessions.find((s) => s.id === activeId)
      : undefined;
    const activeState = active ? normalizeSession(active).state : null;
    const attachToSession =
      !!active &&
      !!activeId &&
      (activeState === "running" ||
        activeState === "paused" ||
        activeState === "finishing");

    if (attachToSession && active && activeId) {
      const agentSegments = appendSegment(active.agentSegments, closed);
      const patch: Partial<Session> = {
        agentSegments,
        updatedAt: now,
      };
      set({
        sessions: get().sessions.map((s) =>
          s.id === activeId ? { ...s, ...patch } : s
        ),
      });
      void (async () => {
        try {
          if (isRemoteId(activeId) && isOnline()) {
            await api.sessions.update(activeId, { agentSegments });
          } else {
            queueMutation("sessions", "update", activeId, {
              agentSegments,
            } as Record<string, unknown>);
          }
        } catch (error) {
          handleSessionApiError(
            activeId,
            error,
            "Failed to save agent segment",
            set,
            get
          );
        }
      })();
      return;
    }

    const draftBody = draftFromRun(closed, now);
    if (!draftBody) return;

    const draft: Session = { ...draftBody, id: uid() };
    set({ sessions: [...get().sessions, draft] });

    void (async () => {
      try {
        if (isOnline()) {
          const created = await api.sessions.create({ ...draft, id: undefined });
          set({
            sessions: get().sessions.map((s) =>
              s.id === draft.id ? { ...draft, ...created } : s
            ),
          });
        } else {
          queueMutation(
            "sessions",
            "create",
            draft.id,
            draft as unknown as Record<string, unknown>
          );
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to save agent draft",
        });
      }
    })();
  },

  pauseSessionForIdle: async (idleSeconds) => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    if (normalized.state !== "running") return;
    if (normalized.pendingIdleRecovery?.status === "pending") return;

    const now = Date.now();
    const startedIdleAt = idleStartedAt(now, idleSeconds);
    const durationSeconds = durationAtIdleStart(normalized, now, idleSeconds);
    const recovery: IdleRecovery = {
      id: uid(),
      detectedAt: now,
      idleStartedAt: startedIdleAt,
      idleSeconds,
      status: "pending",
    };
    const patch: Partial<Session> = {
      paused: true,
      state: "paused",
      durationSeconds,
      frozenAt: startedIdleAt,
      pendingIdleRecovery: recovery,
    };

    set({
      sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      pendingIdleRecoverySessionId: id,
    });
    try {
      if (isRemoteId(id) && isOnline()) await api.sessions.update(id, patch);
      else queueMutation("sessions", "update", id, patch as Record<string, unknown>);
    } catch (error) {
      handleSessionApiError(id, error, "Failed to pause for idle", set, get);
    }
  },

  markIdleReturn: (awaySeconds) => {
    const id = get().pendingIdleRecoverySessionId ?? get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    const recovery = session?.pendingIdleRecovery;
    if (!isResolvable(recovery) || recovery.returnedAt) return;

    const now = Date.now();
    const byReading = recovery.idleStartedAt + Math.max(0, awaySeconds) * 1000;
    const returnedAt = Math.max(now, byReading);
    const pendingIdleRecovery = { ...recovery, returnedAt };

    set({
      sessions: get().sessions.map((s) =>
        s.id === id ? { ...s, pendingIdleRecovery } : s
      ),
      pendingIdleRecoverySessionId: id,
    });
    queueMutation("sessions", "update", id, { pendingIdleRecovery } as Record<string, unknown>);
  },

  resolveIdleRecovery: async (action: IdleRecoveryAction) => {
    const id = get().pendingIdleRecoverySessionId;
    if (!id) return null;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) {
      set({ pendingIdleRecoverySessionId: null });
      return null;
    }
    const normalized = normalizeSession(session);
    const recovery = normalized.pendingIdleRecovery;
    if (!isResolvable(recovery)) {
      set({ pendingIdleRecoverySessionId: null });
      return null;
    }

    const now = Date.now();
    const resolution = resolveIdleRecoveryPatch(normalized, recovery, action, now);
    const { patch, clearsActiveSession: clearActive } = resolution;
    const draft: Session | null = resolution.draft
      ? { ...resolution.draft, id: uid() }
      : null;

    set({
      sessions: [
        ...get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        ...(draft ? [draft] : []),
      ],
      pendingIdleRecoverySessionId: null,
      ...(clearActive ? { activeSessionId: null } : {}),
    });

    try {
      if (isRemoteId(id) && isOnline()) await api.sessions.update(id, patch);
      else queueMutation("sessions", "update", id, patch as Record<string, unknown>);

      if (draft) {
        if (isOnline()) {
          const created = await api.sessions.create({ ...draft, id: undefined });
          set({
            sessions: get().sessions.map((s) => (s.id === draft.id ? { ...draft, ...created } : s)),
          });
        } else {
          queueMutation("sessions", "create", draft.id, draft as unknown as Record<string, unknown>);
        }
      }
    } catch (error) {
      handleSessionApiError(id, error, "Failed to resolve idle time", set, get);
    }

    return describeIdleResolution(resolution, normalized, recovery, now);
  },

  pauseSession: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    if (!normalized || normalized.state !== "running") return;

    const duration = elapsedFor(normalized);
    // Stamp when active work stopped so reports don't use a later confirm time as endedAt.
    const frozenAt = Date.now();
    const patch = { paused: true as const, state: "paused" as const, durationSeconds: duration, frozenAt };

    set({ isLoading: true, error: null });
    try {
      await persistSessionPatch(id, patch);
      set({
        sessions: get().sessions.map((s) =>
          s.id === id ? { ...s, ...patch } : s
        ),
      });
    } catch (error) {
      handleSessionApiError(id, error, 'Failed to pause session', set, get);
    } finally {
      set({ isLoading: false });
    }
  },

  markCompletionAlarm: (sessionId, estimateMinutes) => {
    set({
      sessions: get().sessions.map((s) =>
        s.id === sessionId ? { ...s, completionAckMinutes: estimateMinutes } : s
      ),
      completionAlarmSessionId: sessionId,
    });
  },

  dismissCompletionAlarm: () => {
    if (get().completionAlarmSessionId) set({ completionAlarmSessionId: null });
  },

  extendSession: async (minutes) => {
    const id = get().activeSessionId;
    if (!id || !minutes || minutes <= 0) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    if (normalized.state !== "running" && normalized.state !== "paused") return;

    const task = get().tasks.find((t) => t.id === normalized.taskId);
    const base =
      normalized.estimateMinutes ??
      task?.estimateMinutes ??
      Math.ceil(elapsedFor(normalized) / 60);

    // estimateMinutes stays local-only (matches startSession); the new target
    // exceeds completionAckMinutes, so the completion detector re-arms.
    set({
      sessions: get().sessions.map((s) =>
        s.id === id ? { ...s, estimateMinutes: base + minutes } : s
      ),
      completionAlarmSessionId: null,
    });

    if (normalized.state === "paused") await get().resumeSession();
  },

  resumeSession: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    if (normalized.state !== "paused") return;
    // `startedAt` is the immutable first start (session-timeline.ts). The new
    // running stretch goes in `resumedAt`, or elapsed re-counts the pause.
    const patch = {
      paused: false as const,
      state: "running" as const,
      resumedAt: Date.now(),
      frozenAt: undefined,
    };
    set({ isLoading: true, error: null });
    try {
      await persistSessionPatch(id, patch);
      set({
        sessions: get().sessions.map((s) =>
          s.id === id ? { ...s, ...patch } : s
        ),
      });
    } catch (error) {
      handleSessionApiError(id, error, 'Failed to resume session', set, get);
    } finally {
      set({ isLoading: false });
    }
  },

  finishSession: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    if (normalized.state !== "running" && normalized.state !== "paused") return;
    // If already paused, keep the pause timestamp — don't stretch endedAt to "now".
    const durationSeconds =
      normalized.state === "paused" ? normalized.durationSeconds : elapsedFor(normalized);
    const frozenAt =
      normalized.state === "paused"
        ? (normalized.frozenAt ??
            Math.min(Date.now(), normalized.startedAt + durationSeconds * 1000))
        : Date.now();
    const patch: Partial<Session> = {
      state: "finishing",
      paused: true,
      frozenAt,
      durationSeconds,
    };

    set({ isLoading: true, error: null });
    try {
      await persistSessionPatch(id, patch);
      set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    } catch (error) {
      handleSessionApiError(id, error, 'Failed to finish session', set, get);
    } finally {
      set({ isLoading: false });
    }
  },

  resumeFromFinishing: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    if (normalized.state !== "finishing") return;
    const patch: Partial<Session> = {
      state: "running",
      paused: false,
      resumedAt: Date.now(),
      frozenAt: undefined,
    };

    set({ isLoading: true, error: null });
    try {
      await persistSessionPatch(id, patch);
      set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    } catch (error) {
      handleSessionApiError(id, error, 'Failed to resume session', set, get);
    } finally {
      set({ isLoading: false });
    }
  },

  confirmSession: async (adjustedSeconds) => {
    const id = get().activeSessionId;
    if (!id) return null;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return null;
    const normalized = normalizeSession(session);
    const durationSeconds = Math.max(0, adjustedSeconds ?? normalized.durationSeconds);
    // Prefer freeze/pause time; never keep an endedAt that stretches past active work.
    const rawEndedAt = normalized.frozenAt ?? Date.now();
    const wallSec = Math.max(0, Math.round((rawEndedAt - normalized.startedAt) / 1000));
    const endedAt =
      wallSec > durationSeconds + 45
        ? Math.max(normalized.startedAt + 1000, normalized.startedAt + durationSeconds * 1000)
        : rawEndedAt;
    const patch: Partial<Session> = {
      state: "confirmed",
      paused: true,
      endedAt,
      durationSeconds,
      isDraft: false,
      frozenAt: undefined,
    };

    set({ isLoading: true, error: null });
    try {
      let updated: Session = { ...normalized, ...patch };
      if (normalized.taskId && normalized.projectId) {
        const isLocal = !isRemoteId(normalized.id);
        if (!isOnline()) {
          // Confirming is the moment the work is banked — never lose it to a
          // dead network. Replay the create/update when the queue flushes.
          queueMutation(
            "sessions",
            isLocal ? "create" : "update",
            id,
            (isLocal ? { ...updated, id: undefined } : patch) as Record<string, unknown>
          );
        } else {
          updated = isLocal
            ? await api.sessions.create({ ...updated, id: undefined })
            : await api.sessions.update(id, patch);
          updated = normalizeSession({ ...updated, state: "confirmed", paused: true, isDraft: false, notes: normalized.notes });
        }
      }
      set({
        sessions: get().sessions.map((s) => (s.id === id ? updated : s)),
        activeSessionId: null,
      });
      return updated;
    } catch (error) {
      handleSessionApiError(id, error, "Failed to confirm session", set, get);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  saveSessionAsDraft: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const normalized = normalizeSession(session);
    const patch: Partial<Session> = {
      state: "draft",
      isDraft: true,
      paused: true,
      durationSeconds: elapsedFor(normalized),
      frozenAt: normalized.frozenAt ?? Date.now(),
    };
    set({ isLoading: true, error: null });
    try {
      await persistSessionPatch(id, patch);
      set({
        sessions: get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        activeSessionId: null,
      });
    } catch (error) {
      handleSessionApiError(id, error, "Failed to save session as draft", set, get);
    } finally {
      set({ isLoading: false });
    }
  },

  reviewDraftSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    set({
      sessions: get().sessions.map((s) =>
        s.id === id
          ? { ...s, state: "finishing", paused: true, isDraft: true, frozenAt: s.frozenAt ?? Date.now() }
          : s
      ),
      activeSessionId: id,
    });
  },

  discardSession: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    set({ sessions: get().sessions.filter((s) => s.id !== id), activeSessionId: null });
    if (session && isRemoteId(id)) {
      set({ isLoading: true, error: null });
      try {
        if (!isOnline()) {
          queueMutation("sessions", "delete", id, {});
          return;
        }
        await api.sessions.delete(id);
      } catch (error) {
        queueMutation("sessions", "delete", id, {});
        set({ error: error instanceof Error ? error.message : "Failed to discard session" });
      } finally {
        set({ isLoading: false });
      }
    }
  },

  classifyDraftSession: (taskId, projectId, billable) => {
    const id = get().activeSessionId;
    if (!id) return;
    set({
      sessions: get().sessions.map((s) =>
        s.id === id ? { ...s, taskId, projectId, billable, isDraft: false } : s
      ),
    });
  },

  addSessionNote: (text) => {
    const trimmed = text.trim();
    const id = get().activeSessionId;
    if (!id || !trimmed) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const note = { id: uid(), timestamp: elapsedFor(session), text: trimmed };
    const notes = [...(session.notes ?? []), note];
    set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, notes } : s)) });
    if (isRemoteId(id)) {
      api.sessions.update(id, { notes }).catch(() => undefined);
    }
  },

  updateSessionNote: (noteId, text) => {
    const trimmed = text.trim();
    const id = get().activeSessionId;
    if (!id || !trimmed) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const notes = (session.notes ?? []).map((note) => (note.id === noteId ? { ...note, text: trimmed } : note));
    set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, notes } : s)) });
    if (isRemoteId(id)) {
      api.sessions.update(id, { notes }).catch(() => undefined);
    }
  },

  deleteSessionNote: (noteId) => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const notes = (session.notes ?? []).filter((note) => note.id !== noteId);
    set({ sessions: get().sessions.map((s) => (s.id === id ? { ...s, notes } : s)) });
    if (isRemoteId(id)) {
      api.sessions.update(id, { notes }).catch(() => undefined);
    }
  },

  stopSession: async () => {
    const id = get().activeSessionId;
    if (!id) return null;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return null;

    const normalized = normalizeSession(session);
    const final = elapsedFor(normalized);

    const patch: Partial<Session> = {
      durationSeconds: final,
      endedAt: Date.now(),
      paused: true,
      state: "confirmed",
      isDraft: false,
    };

    set({ isLoading: true, error: null });
    try {
      // Local-only and offline rows still have to be closed locally, or the row
      // stays "running" with no endedAt and gets re-adopted as active on reload.
      let updated = normalizeSession({ ...normalized, ...patch });
      if (isRemoteId(id) && isOnline()) {
        updated = normalizeSession({ ...(await api.sessions.update(id, patch)) });
      } else if (isRemoteId(id)) {
        queueMutation("sessions", "update", id, patch as Record<string, unknown>);
      }

      set({
        sessions: get().sessions.map((s) => (s.id === id ? updated : s)),
        activeSessionId: null,
      });

      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to stop session' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  adjustSessionDuration: async (id, seconds) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await api.sessions.update(id, { durationSeconds: seconds });
      set({
        sessions: get().sessions.map((s) => (s.id === id ? updated : s)),
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to adjust session' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addManualSession: async (input) => {
    const project = get().projects.find((p) => p.id === input.projectId);
    if (!project) {
      set({ error: "Project not found" });
      return null;
    }
    if (!input.startedAt || !input.endedAt || input.endedAt <= input.startedAt) {
      set({ error: "End time must be after start time" });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      let taskId = input.taskId ?? "";
      if (!taskId) {
        const title = (input.taskTitle ?? "").trim();
        if (!title) {
          set({ error: "Task is required" });
          return null;
        }
        const task = await get().addTask({
          title,
          projectId: input.projectId,
          urgency: "normal",
        });
        taskId = task.id;
      } else {
        const existing = get().tasks.find((t) => t.id === taskId);
        if (!existing) {
          set({ error: "Task not found" });
          return null;
        }
        const nextTitle = input.taskTitle?.trim();
        if (nextTitle && nextTitle !== existing.title) {
          await get().updateTask(taskId, { title: nextTitle });
        }
      }

      const durationSeconds = Math.max(1, Math.round((input.endedAt - input.startedAt) / 1000));
      const notes =
        input.description?.trim()
          ? [{ id: uid(), timestamp: input.startedAt, text: input.description.trim() }]
          : [];
      const payload = {
        taskId,
        projectId: input.projectId,
        billable: input.billable ?? project.billable ?? false,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        durationSeconds,
        paused: true,
        state: "confirmed" as const,
        isDraft: false,
        notes,
        updatedAt: Date.now(),
      };

      if (!isOnline()) {
        const local = normalizeSession({ ...payload, id: uid() });
        set({ sessions: [...get().sessions, local] });
        queueMutation("sessions", "create", local.id, { ...payload });
        return local;
      }

      const created = await api.sessions.create(payload);
      const session = normalizeSession({
        ...created,
        state: "confirmed",
        paused: true,
        isDraft: false,
        notes: created.notes?.length ? created.notes : notes,
        endedAt: created.endedAt ?? input.endedAt,
        durationSeconds: created.durationSeconds || durationSeconds,
      });
      set({ sessions: [...get().sessions, session] });
      return session;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to add time entry" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  updateManualSession: async (id, input) => {
    const existing = get().sessions.find((s) => s.id === id);
    if (!existing) {
      set({ error: "Session not found" });
      return null;
    }
    const project = get().projects.find((p) => p.id === input.projectId);
    if (!project) {
      set({ error: "Project not found" });
      return null;
    }
    if (!input.startedAt || !input.endedAt || input.endedAt <= input.startedAt) {
      set({ error: "End time must be after start time" });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      let taskId = input.taskId ?? existing.taskId ?? "";
      if (input.taskTitle?.trim() && !input.taskId) {
        const task = await get().addTask({
          title: input.taskTitle.trim(),
          projectId: input.projectId,
          urgency: "normal",
        });
        taskId = task.id;
      } else if (taskId) {
        const t = get().tasks.find((x) => x.id === taskId);
        if (!t) {
          set({ error: "Task not found" });
          return null;
        }
        const nextTitle = input.taskTitle?.trim();
        const taskPatch: { title?: string; projectId?: string } = {};
        if (nextTitle && nextTitle !== t.title) taskPatch.title = nextTitle;
        // Keep task ↔ project consistent when the entry moves projects.
        if (t.projectId !== input.projectId) taskPatch.projectId = input.projectId;
        if (Object.keys(taskPatch).length > 0) {
          await get().updateTask(taskId, taskPatch);
        }
      } else {
        set({ error: "Task is required" });
        return null;
      }

      const durationSeconds = Math.max(1, Math.round((input.endedAt - input.startedAt) / 1000));
      const notes =
        input.description !== undefined
          ? input.description.trim()
            ? [{ id: uid(), timestamp: input.startedAt, text: input.description.trim() }]
            : []
          : existing.notes ?? [];

      const patch = {
        taskId,
        projectId: input.projectId,
        billable: input.billable ?? existing.billable,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        durationSeconds,
        paused: true,
        state: "confirmed" as const,
        isDraft: false,
        notes,
        updatedAt: Date.now(),
      };

      // Local-only ids must be created on the server (same as confirmSession),
      // otherwise edits only live in memory and vanish after restart.
      if (!isRemoteId(id)) {
        if (isOnline()) {
          const created = await api.sessions.create({ ...patch, id: undefined });
          const session = normalizeSession({
            ...created,
            ...patch,
            notes: created.notes?.length ? created.notes : notes,
          });
          set({ sessions: get().sessions.map((s) => (s.id === id ? session : s)) });
          return session;
        }
        const updated = normalizeSession({ ...existing, ...patch, id });
        set({ sessions: get().sessions.map((s) => (s.id === id ? updated : s)) });
        queueMutation("sessions", "create", id, { ...patch });
        return updated;
      }

      if (!isOnline()) {
        const updated = normalizeSession({ ...existing, ...patch, id });
        set({ sessions: get().sessions.map((s) => (s.id === id ? updated : s)) });
        queueMutation("sessions", "update", id, { ...patch });
        return updated;
      }

      const remote = await api.sessions.update(id, patch);
      // Trust what the server actually stored — overlaying `patch` last hid
      // partial writes (e.g. startedAt only in JSONB) until the next reload.
      const session = normalizeSession({
        ...existing,
        ...remote,
        // Keep client-only latches the API does not round-trip.
        estimateMinutes: existing.estimateMinutes,
        completionAckMinutes: existing.completionAckMinutes,
        notes: Array.isArray(remote.notes) && remote.notes.length ? remote.notes : notes,
        state: "confirmed",
        paused: true,
        isDraft: false,
      });

      const startedDrift =
        typeof session.startedAt === "number" &&
        Math.abs(session.startedAt - patch.startedAt) > 60_000;
      const endedDrift =
        typeof session.endedAt === "number" &&
        Math.abs((session.endedAt ?? 0) - patch.endedAt) > 60_000;
      if (startedDrift || endedDrift) {
        set({
          error:
            "Server did not persist the new time range. Redeploy the sessions edge function, then try again.",
        });
        return null;
      }

      set({ sessions: get().sessions.map((s) => (s.id === id ? session : s)) });
      return session;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update time entry" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setSelectedUrgency: (u) => set({ selectedUrgency: u }),

  loadClients: async () => {
    try {
      const { clients } = await api.clients.list();
      const deletedClients = getSyncEngine().getPendingDeletes("clients");
      set({ clients: (clients || []).filter((c) => !deletedClients.has(c.id)) });
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  },

  loadProjects: async () => {
    try {
      const { projects } = await api.projects.list();
      const deletedProjects = getSyncEngine().getPendingDeletes("projects");
      set({ projects: withProjectDisplayFallbacks(projects || []).filter((p) => !deletedProjects.has(p.id)) });
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  },

  loadTasks: async () => {
    try {
      const { tasks } = await api.tasks.list();
      const deletedTasks = getSyncEngine().getPendingDeletes("tasks");
      set({ tasks: withTaskDisplayFallbacks(tasks || []).filter((t) => !deletedTasks.has(t.id)) });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  },

  loadSessions: async () => {
    try {
      // Push queued edits before reading so a restart cannot reload stale rows.
      try {
        await getSyncEngine().flush();
      } catch (error) {
        console.warn("Sync flush before loadSessions failed:", error);
      }

      const { sessions } = await api.sessions.list();
      const deletedSessions = getSyncEngine().getPendingDeletes("sessions");
      const remoteSessionsFiltered = (sessions || [])
        .map(normalizeSession)
        .filter((s) => !deletedSessions.has(s.id));
      const merged = mergeSessionLists(remoteSessionsFiltered, get().sessions.filter((s) => !deletedSessions.has(s.id)));
      const mergedSessions = freezeStaleRunning(repairStaleResumedAt(merged));
      set({ sessions: mergedSessions });

      // Check for active session (not ended)
      const activeSession = mergedSessions.find((s: Session) => !s.endedAt && ["running", "paused", "finishing"].includes(normalizeSession(s).state));
      set({ activeSessionId: activeSession?.id ?? null });
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  },

  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      // Flush offline edits first — otherwise loadAll overwrites them with
      // stale server data and time-entry changes look like they "reverted".
      try {
        await getSyncEngine().flush();
      } catch (error) {
        console.warn("Sync flush before loadAll failed:", error);
      }

      // Profile carries preferences, which must reconcile on every sign-in so
      // settings follow the user across devices. Kept off the destructured
      // results because loadProfile handles its own failure and returns null.
      void get().loadProfile();

      const [clientsResult, projectsResult, tasksResult, sessionsResult] = await Promise.all([
        api.clients.list(),
        api.projects.list(),
        api.tasks.list(),
        api.sessions.list(),
      ]);

      const syncEngine = getSyncEngine();
      const deletedSessions = syncEngine.getPendingDeletes("sessions");
      const deletedTasks = syncEngine.getPendingDeletes("tasks");
      const deletedProjects = syncEngine.getPendingDeletes("projects");
      const deletedClients = syncEngine.getPendingDeletes("clients");

      const remoteSessionsFiltered = (sessionsResult.sessions || [])
        .map(normalizeSession)
        .filter((s) => !deletedSessions.has(s.id));

      const sessions = freezeStaleRunning(
        repairStaleResumedAt(
          mergeSessionLists(remoteSessionsFiltered, get().sessions.filter((s) => !deletedSessions.has(s.id)))
        )
      );

      const remoteTasksFiltered = applyPendingTaskUpdates(
        (tasksResult.tasks || []).filter((t) => !deletedTasks.has(t.id))
      );

      const tasks = reconcileSessionTasks(withTaskDisplayFallbacks(remoteTasksFiltered), sessions);

      const remoteProjectsFiltered = withProjectDisplayFallbacks(projectsResult.projects || [])
        .filter((p) => !deletedProjects.has(p.id));

      const remoteClientsFiltered = (clientsResult.clients || [])
        .filter((c) => !deletedClients.has(c.id));

      set({
        clients: remoteClientsFiltered,
        projects: remoteProjectsFiltered,
        tasks,
        sessions,
        activeSessionId: sessions.find((s: Session) => !s.endedAt && ["running", "paused", "finishing"].includes(normalizeSession(s).state))?.id ?? null,
        initialLoadComplete: true,
      });

      await get().performDailyArchive();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ isLoading: false });
    }
  },

  performDailyArchive: async () => {
    const today = new Date().toISOString().split('T')[0];
    const lastArchiveDate = get().lastDailyArchiveDate;
    
    if (lastArchiveDate === today) {
      return;
    }

    const todayStart = new Date(today).getTime();
    const tasksToArchive = get().tasks.filter(
      (t) => t.status === "done" && t.completedAt && t.completedAt < todayStart && !t.archived
    );

    const projectsToArchive = get().projects.filter(
      (p) => p.status === "completed" && p.completedAt && p.completedAt < todayStart && !p.archived && !p.archivedAt
    );

    if (tasksToArchive.length === 0 && projectsToArchive.length === 0) {
      set({ lastDailyArchiveDate: today });
      return;
    }

    const now = Date.now();
    await Promise.all([
      ...tasksToArchive.map((task) =>
        api.tasks.update(task.id, taskUpdatePayload(task, { archived: true, archivedAt: now })).catch((error) => {
          console.error(`Failed to archive task ${task.id}:`, error);
        })
      ),
      ...projectsToArchive.map((project) =>
        api.projects.update(project.id, { archived: true, archivedAt: now, status: "archived" }).catch((error) => {
          console.error(`Failed to archive project ${project.id}:`, error);
        })
      )
    ]);

    set({
      tasks: get().tasks.map((t) => {
        const shouldArchive = tasksToArchive.some((ta) => ta.id === t.id);
        return shouldArchive ? { ...t, archived: true, archivedAt: now } : t;
      }),
      projects: get().projects.map((p) => {
        const shouldArchive = projectsToArchive.some((pa) => pa.id === p.id);
        return shouldArchive ? { ...p, archived: true, archivedAt: now, status: "archived" } : p;
      }),
      lastDailyArchiveDate: today,
    });
  },

  clearAll: () => set({
    clients: [],
    projects: [],
    tasks: [],
    sessions: [],
    activeSessionId: null,
    pendingIdleRecoverySessionId: null,
    agentRuns: {},
    completionAlarmSessionId: null,
    user: null,
    error: null,
    lastDailyArchiveDate: undefined,
    initialLoadComplete: false,
    reportShares: [],
    reportSharesLoaded: false,
  }),

  loadReportShares: async () => {
    try {
      const { shares } = await api.reportShares.list();
      set({ reportShares: shares || [], reportSharesLoaded: true });
    } catch (error) {
      console.error("Failed to load report shares:", error);
      set({ reportSharesLoaded: true });
      throw error;
    }
  },

  createReportShare: async (input) => {
    // Share links read from Supabase — flush any queued local edits first.
    try {
      await getSyncEngine().flush();
    } catch (error) {
      console.warn("Sync flush before createReportShare failed:", error);
    }
    const created = await api.reportShares.create(input);
    const { token: _token, url: _url, ...share } = created;
    set({ reportShares: [share, ...get().reportShares.filter((s) => s.id !== share.id)] });
    return created;
  },

  updateReportShare: async (id, input) => {
    const updated = await api.reportShares.update(id, input);
    set({
      reportShares: get().reportShares.map((s) => (s.id === id ? updated : s)),
    });
    return updated;
  },

  revokeReportShare: async (id) => {
    const updated = await api.reportShares.revoke(id);
    set({
      reportShares: get().reportShares.map((s) => (s.id === id ? updated : s)),
    });
    return updated;
  },

  rotateReportShareToken: async (id) => {
    const rotated = await api.reportShares.rotateToken(id);
    const { token: _token, url: _url, ...share } = rotated;
    set({
      reportShares: get().reportShares.map((s) => (s.id === id ? share : s)),
    });
    return rotated;
  },

  deleteReportShare: async (id) => {
    await api.reportShares.delete(id);
    set({ reportShares: get().reportShares.filter((s) => s.id !== id) });
  },

  loadProfile: async () => {
    try {
      const profile = await api.profile.get();
      set({ profile, profileLoaded: true });

      // Reconcile preferences. localStorage stays the synchronous source so the
      // timer has a value on first paint; the server only overrides it when it
      // is genuinely newer. Whole-object last-write-wins: an offline edit on one
      // device loses to a later edit on another. Acceptable for alarm sounds and
      // mascot settings; it would not be for time entries.
      const remoteAt = profile?.preferencesUpdatedAt ?? 0;
      const localAt = get().preferencesUpdatedAt ?? 0;

      if (profile?.preferences && remoteAt > localAt) {
        set({
          preferences: { ...DEFAULT_PREFERENCES, ...profile.preferences },
          preferencesUpdatedAt: remoteAt,
          preferencesDirty: false,
        });
      } else if (get().preferencesDirty || localAt > remoteAt) {
        // Local is ahead, or an earlier push failed. Retry now.
        void get().flushPreferences();
      }

      return profile;
    } catch (error) {
      console.error("Failed to load profile:", error);
      // profileLoaded stays false so callers can tell "no profile yet" (null)
      // apart from "we could not find out" and avoid acting on a failed read.
      return null;
    }
  },

  saveProfile: async (patch) => {
    // A caller that writes preferences directly (onboarding) satisfies any
    // pending push. Cancel it *before* the await: a debounced flush firing
    // mid-write is a second in-flight upsert, and whichever lands last wins on
    // the server regardless of which carried the newer values.
    const writesPreferences = patch.preferences !== undefined;
    const stamp = patch.preferencesUpdatedAt ?? Date.now();
    if (writesPreferences) cancelPreferencesPush();

    const profile = await api.profile.upsert(patch);
    set({ profile, profileLoaded: true });

    if (writesPreferences) {
      cancelPreferencesPush();
      set({
        preferencesUpdatedAt: Math.max(get().preferencesUpdatedAt ?? 0, stamp),
        // Only clear the flag if no newer edit landed while this write was in
        // flight — same guard as flushPreferences, or that edit never ships.
        preferencesDirty: (get().preferencesUpdatedAt ?? 0) > stamp,
      });
    }
    return profile;
  },
}), {
  name: "flowmate-supabase-session-store",
  partialize: (state) => ({
    // Persist confirmed logs too — previously only active/draft sessions were
    // kept, so offline or queued time-entry edits vanished on restart before
    // the sync queue could replay them.
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    preferences: state.preferences,
    // Both are needed to reconcile after a restart: without them an offline
    // edit looks older than the server and gets silently overwritten on load.
    preferencesUpdatedAt: state.preferencesUpdatedAt,
    preferencesDirty: state.preferencesDirty,
    // Cheap connection status only — avoids a flash of "not connected" on load.
    // Events go stale per view window and are re-fetched, so they stay out.
    googleCalendar: state.googleCalendar,
  }),
  onRehydrateStorage: () => (state) => {
    if (!state) return;
    const sessions = freezeStaleRunning(repairStaleResumedAt(state.sessions));
    state.sessions = sessions;
    const active = sessions.find((s) => s.id === state.activeSessionId);
    if (!active || normalizeSession(active).state === "confirmed") {
      state.activeSessionId = null;
    }
    // Derived rather than persisted: an unresolved gap must survive a restart.
    state.pendingIdleRecoverySessionId =
      sessions.find((s) => s.pendingIdleRecovery?.status === "pending")?.id ?? null;
    // Live agent runs are in-memory only.
    state.agentRuns = state.agentRuns ?? {};
  },
})
);
