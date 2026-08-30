import type { AgentSegment } from "@/lib/types";
// Shared contract for live report shares (owner UI + public viewer + edge fn mirror).
// Keep this file free of React / store imports so the edge function can stay in sync manually.

export const REPORT_SHARE_SCHEMA_VERSION = 1;
export const MAX_ACTIVE_SHARES_PER_OWNER = 25;
export const MAX_SESSIONS_PER_VIEW = 5000;
export const PASSWORD_PBKDF2_ITERS = 210_000;
export const TOKEN_PREFIX_LEN = 8;

export type SharePeriodMode = "week" | "month" | "year";
export type ShareBillableFilter = "all" | "billable" | "non-billable";

export type ShareErrorCode =
  | "unavailable"
  | "password_required"
  | "wrong_password"
  | "rate_limited"
  | "invalid_period"
  | "payload_too_large"
  | "limit_reached"
  | "validation_error";

export interface ShareFilters {
  projectId: string | null;
  clientId: string | null;
  tag: string | null;
  billable: ShareBillableFilter;
}

export interface ShareDisclosureOptions {
  showEarnings: boolean;
  showTaskTitles: boolean;
  showNotes: boolean;
  /**
   * Include the AI-assisted vs solo split (M3). Off by default: how much of a
   * client's bill was agent-supervised is the owner's disclosure to make, not
   * something a share link should leak because the data happened to be there.
   */
  showAgentSplit?: boolean;
  allowExport: boolean;
  defaultPeriodMode: SharePeriodMode;
  /** Period the owner was viewing when the share was created (e.g. "2026-07"). */
  defaultPeriodKey?: string;
}

export interface ShareFilterLabels {
  project?: string;
  client?: string;
  tag?: string;
  billable: string;
}

/** Owner-facing share row. Never includes plaintext token or password. */
export interface ReportShare {
  id: string;
  tokenPrefix: string;
  name: string;
  displayName?: string;
  filters: ShareFilters;
  options: ShareDisclosureOptions;
  timezone: string;
  passwordProtected: boolean;
  expiresAt: number | null;
  revokedAt: number | null;
  viewCount: number;
  lastViewedAt: number | null;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
}

export interface CreateReportShareInput {
  name: string;
  displayName?: string;
  filters: ShareFilters;
  options: ShareDisclosureOptions;
  timezone: string;
  password?: string;
  expiresAt?: number | null;
}

export interface UpdateReportShareInput {
  name?: string;
  displayName?: string | null;
  options?: Partial<ShareDisclosureOptions>;
  password?: string;
  removePassword?: boolean;
  expiresAt?: number | null;
}

export interface CreateReportShareResult extends ReportShare {
  /** Plaintext token — returned once at creation / rotation only. */
  token: string;
  url: string;
}

/** Allowlisted session fields for the public viewer. */
export interface PublicShareSession {
  id: string;
  taskId: string;
  projectId: string;
  billable: boolean;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  state: "confirmed";
  notes?: { id: string; timestamp: number; text: string }[];
  /** Present only when the owner enabled `showAgentSplit` on the share. */
  agentSegments?: AgentSegment[];
}

export interface PublicShareTask {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  tags?: string[];
  projectId?: string | null;
}

export interface PublicShareProject {
  id: string;
  name: string;
  color: string;
  clientId?: string;
  billable?: boolean;
  hourlyRate?: number;
  budget?: number;
}

export interface PublicShareClient {
  id: string;
  name: string;
  hourlyRate?: number;
}

export interface PublicReportSource {
  sessions: PublicShareSession[];
  tasks: PublicShareTask[];
  projects: PublicShareProject[];
  clients: PublicShareClient[];
}

export interface PublicShareMeta {
  name: string;
  displayName?: string;
  options: ShareDisclosureOptions;
  filterLabels: ShareFilterLabels;
  defaultPeriodMode: SharePeriodMode;
  defaultPeriodKey?: string;
  timezone: string;
}

export interface PublicShareRange {
  startMs: number;
  endMs: number;
  label: string;
  key: string;
  periodMode: SharePeriodMode;
}

export interface PublicSharedReport {
  share: PublicShareMeta;
  range: PublicShareRange;
  source: PublicReportSource;
}

export interface FetchSharedReportInput {
  token: string;
  password?: string;
  periodMode: SharePeriodMode;
  periodKey: string;
  viewerSessionId: string;
}

export class SharedReportError extends Error {
  code: ShareErrorCode;
  status: number;

  constructor(code: ShareErrorCode, message: string, status: number) {
    super(message);
    this.name = "SharedReportError";
    this.code = code;
    this.status = status;
  }
}

export function defaultShareOptions(
  periodMode: SharePeriodMode = "month",
  periodKey?: string
): ShareDisclosureOptions {
  return {
    showEarnings: true,
    showTaskTitles: true,
    showNotes: true,
    showAgentSplit: false,
    allowExport: true,
    defaultPeriodMode: periodMode,
    ...(periodKey ? { defaultPeriodKey: periodKey } : {}),
  };
}

export function billableLabel(billable: ShareBillableFilter): string {
  if (billable === "billable") return "Billable only";
  if (billable === "non-billable") return "Non-billable only";
  return "Billable + non-billable";
}
