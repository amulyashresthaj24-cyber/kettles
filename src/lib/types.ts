export type Urgency = "urgent" | "high" | "normal" | "low";
export type TaskStatus = "todo" | "doing" | "done";
export type ProjectColor = string;
export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type SessionState = "running" | "paused" | "finishing" | "confirmed" | "draft" | "discarded";

export interface SessionNote {
  id: string;
  timestamp: number;
  text: string;
}

/** How a session's time got into the ledger. */
export type SessionSource = "timer" | "manual" | "idle_recovery" | "agent_run";

/** A stretch of a session an AI agent was demonstrably working through. */
export interface AgentSegment {
  runId: string;
  agent: string; // "claude-code" | "codex" | "cursor" | "grok" | ...
  label?: string; // "refactor sync-engine"
  startedAt: number;
  endedAt?: number;
  status: "running" | "ok" | "error" | "cancelled" | "stale";
}

/**
 * An unresolved gap between the moment the OS stopped seeing input and the
 * moment the user came back.
 */
export interface IdleRecovery {
  id: string;
  /** When the idle threshold was crossed. */
  detectedAt: number;
  /** When input actually stopped — `detectedAt` minus the idle duration. */
  idleStartedAt: number;
  /** When input resumed. Absent while the user is still away. */
  returnedAt?: number;
  /** Idle seconds observed at detection. */
  idleSeconds: number;
  status: "pending" | "trimmed" | "counted" | "drafted" | "finished";
}

export type IdleRecoveryAction =
  | "resume_trimmed"
  | "count_as_work"
  | "save_as_draft"
  | "finish_at_idle";

export interface PetCustomReminder {
  id: string;
  text: string;
  time: string;
  active: boolean;
  /** days: 0 (Sun) – 6 (Sat); omitted/empty = every day. */
  days?: number[];
}

/**
 * User-tunable settings. Stored as one JSONB blob on `user_profiles` and cached
 * in localStorage, so adding a field here needs no migration.
 */
export interface UserPreferences {
  /** 0 = open-ended (count up from zero). Only apply when the user sets a real default. */
  defaultFocusDuration: number;
  weeklyTargetHours?: number;
  whistleSoundEnabled: boolean;
  alarmSound?: string;
  autoBreakEnabled: boolean;
  autoPauseOnIdleEnabled: boolean;
  /**
   * "kettle" = default male mascot. "sprite2" is a legacy persisted alias for
   * "female". "custom" renders a user-uploaded v1 atlas — the image itself
   * lives under its own localStorage key, never here (see mascot-custom.ts).
   */
  activeMascot?: "kettle" | "sprite2" | "female" | "custom";
  /** How often the mascot plays a spontaneous idle gesture. */
  mascotAnimationFrequency?: "off" | "calm" | "normal" | "lively";
  /** Looping animation the mascot rests in (state name from pet.config.json). */
  mascotDefaultAnimation?: string;
  petBreakRemindersEnabled?: boolean;
  petBreakIntervalMinutes?: number;
  petCustomRemindersEnabled?: boolean;
  petCustomReminders?: PetCustomReminder[];
  petNotesIntegrationEnabled?: boolean;
  /** Proactive pet interventions (estimate overrun, missing rate). Defaults on. */
  petIntelligenceEnabled?: boolean;
  /** Pet jump + cue when a tracked AI agent run finishes. Defaults on. */
  agentFinishCelebrationEnabled?: boolean;
  /** Minutes without input before the timer auto-pauses. Floored at 30s. */
  idleThresholdMinutes?: number;
}

/** Per-user profile + onboarding state (`user_profiles` table). One row per user. */
export interface UserProfile {
  userId: string;
  fullName?: string;
  avatarUrl?: string;
  /**
   * Whatever was last written — may be a subset of UserPreferences, since older
   * rows predate later fields. Merge over defaults before use.
   */
  preferences?: Partial<UserPreferences>;
  /** Last preference edit (ms). Drives last-write-wins across devices. */
  preferencesUpdatedAt?: number;
  onboardingCompleted: boolean;
  onboardingCompletedAt?: number;
}

/** Fields an onboarding/settings write may set. `userId` is taken from the session. */
export type UserProfilePatch = Partial<Omit<UserProfile, "userId">>;

/**
 * Google Calendar connection status as the client is allowed to see it.
 * Deliberately carries no tokens — `google_calendar_connections` denies all
 * access to `authenticated`, and only the edge function reads the real row.
 */
export interface GoogleCalendarConnection {
  connected: boolean;
  googleAccountEmail?: string;
  connectedAt?: number;
  /** Set when Google reported invalid_grant — the user revoked access. */
  revokedAt?: number;
  lastSyncedAt?: number;
  /** Empty = primary calendar only. */
  selectedCalendarIds: string[];
}

/** One entry from the user's Google calendar list, for the picker in Settings. */
export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  /** Google's per-calendar colour. Advisory — the overlay uses its own token. */
  backgroundColor?: string;
}

/**
 * A Google event normalized for the calendar views. Read-only: nothing in
 * Kettles ever writes these back.
 */
export interface GoogleCalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  /**
   * ms epoch. For timed events this is exact.
   *
   * For all-day events it is UTC midnight, which is NOT the same instant as
   * the viewer's midnight — resolve `startDate` instead. The server cannot do
   * this conversion: it has no idea what timezone the browser is in, and
   * picking its own would put an all-day event on the wrong day for anyone
   * west of UTC.
   */
  startsAt: number;
  endsAt: number;
  allDay: boolean;
  /** `YYYY-MM-DD`, all-day events only. Authoritative — build local midnight from this. */
  startDate?: string;
  /** `YYYY-MM-DD`, all-day events only. Exclusive, per Google: it is the day *after* the event. */
  endDate?: string;
  location?: string;
  /** Google's `htmlLink` — opens the event in Google Calendar. */
  url?: string;
  /** "accepted" | "declined" | "tentative" | "needsAction", when known. */
  responseStatus?: string;
}

export interface Client {
  id: string;
  name: string;
  hourlyRate: number;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  /** Assigned client id. Omit/undefined = unassigned; `null` on update clears the link. */
  clientId?: string | null;
  color: ProjectColor;
  icon?: string;
  billable: boolean;
  /** Project hourly rate in USD. Preferred over client rate for earnings. `null` clears it. */
  hourlyRate?: number | null;
  status?: ProjectStatus;
  startDate?: number;
  endDate?: number;
  budget?: number | null;
  createdAt?: number;
  updatedAt?: number;
  completedAt?: number;
  archived?: boolean;
  archivedAt?: number;
  tags?: string[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string | null;
  urgency: Urgency;
  status: TaskStatus;
  estimateMinutes?: number;
  tags?: string[];
  assignees?: string[];
  dateRange?: string;
  createdAt: number;
  updatedAt?: number;
  completedAt?: number;
  archived?: boolean;
  archivedAt?: number;
  deletedAt?: number;
}

export interface Session {
  id: string;
  taskId: string;
  projectId: string;
  billable: boolean;
  /** First start of the session. Immutable from timelineVersion 2 onward. */
  startedAt: number;
  /**
   * Start of the current running stretch, set on resume. Absent until the
   * session is resumed at least once. Legacy rows (no `timelineVersion`)
   * overwrote `startedAt` instead and never set this.
   */
  resumedAt?: number;
  /**
   * Bounds contract version. `2`+ means `startedAt`/`endedAt` are truthful and
   * the report layer must not reconcile them against `durationSeconds`.
   */
  timelineVersion?: number;
  endedAt?: number;
  durationSeconds: number;
  paused: boolean;
  state: SessionState;
  isDraft?: boolean;
  notes?: SessionNote[];
  frozenAt?: number;
  estimateMinutes?: number;
  /** Estimate value the completion alarm already fired at (local-only latch). */
  completionAckMinutes?: number;
  /** Client/server edit timestamp (ms) — used to keep local edits over stale remote rows. */
  updatedAt?: number;
  /** How this time was recorded. Absent on rows predating the field. */
  source?: SessionSource;
  /** Unresolved idle gap awaiting a decision. Rides the sessions JSONB payload. */
  pendingIdleRecovery?: IdleRecovery;
  /**
   * Stretches an AI agent was demonstrably working through.
   * Rides the sessions JSONB payload (same as pendingIdleRecovery) — not a column.
   */
  agentSegments?: AgentSegment[];
}
