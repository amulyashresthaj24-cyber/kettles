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
  /** "kettle" = default male mascot. "sprite2" is a legacy persisted alias for "female". */
  activeMascot?: "kettle" | "sprite2" | "female";
  /** How often the mascot plays a spontaneous idle gesture. */
  mascotAnimationFrequency?: "off" | "calm" | "normal" | "lively";
  /** Looping animation the mascot rests in (state name from pet.config.json). */
  mascotDefaultAnimation?: string;
  petBreakRemindersEnabled?: boolean;
  petBreakIntervalMinutes?: number;
  petCustomRemindersEnabled?: boolean;
  petCustomReminders?: PetCustomReminder[];
  petNotesIntegrationEnabled?: boolean;
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
  startedAt: number;
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
}
