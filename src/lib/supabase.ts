import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_PUBLIC_SITE_URL,
  isPublicWebOrigin,
  normalizeOrigin,
} from './site-url';
import type {
  Client,
  GoogleCalendarConnection,
  GoogleCalendarEvent,
  GoogleCalendarListEntry,
  Project,
  Session,
  Task,
  UserPreferences,
  UserProfile,
  UserProfilePatch,
} from './types';
import type {
  CreateReportShareInput,
  CreateReportShareResult,
  FetchSharedReportInput,
  PublicSharedReport,
  ReportShare,
  ShareErrorCode,
  UpdateReportShareInput,
} from './report/share-types';
import { SharedReportError } from './report/share-types';

/**
 * Google revoked access (edge returns 409 `{ error: 'reconnect_required' }`).
 * Distinct from generic failures so the store/UI can offer "Reconnect" rather
 * than a dead empty overlay.
 */
export class GoogleCalendarReconnectError extends Error {
  constructor(message = 'reconnect_required') {
    super(message);
    this.name = 'GoogleCalendarReconnectError';
  }
}

let supabase: SupabaseClient | null = null;

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseClient() {
  if (supabase) {
    return supabase;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  // PKCE is required: /auth/callback exchanges ?code=. The library default is
  // still implicit (tokens in the hash), which that page never sees.
  // detectSessionInUrl stays off so AuthProvider's getSession() does not
  // consume the one-time code before the callback can exchange it.
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return supabase;
}

// Origin helpers live in ./site-url so metadata routes can use them without
// pulling in the Supabase client. Re-exported here for existing consumers.
export { DEFAULT_PUBLIC_SITE_URL, isPublicWebOrigin };

/**
 * Origin for public share / invite links. Prefer configured site URL;
 * never use the desktop webview origin (http://tauri.localhost).
 */
export function getPublicShareOrigin() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && isPublicWebOrigin(siteUrl)) return normalizeOrigin(siteUrl);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && isPublicWebOrigin(appUrl)) return normalizeOrigin(appUrl);

  if (typeof window !== "undefined" && isPublicWebOrigin(window.location.origin)) {
    return window.location.origin;
  }

  return DEFAULT_PUBLIC_SITE_URL;
}

export function getAppOrigin() {
  // 1. NEXT_PUBLIC_SITE_URL (preferred for production)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    return normalizeOrigin(siteUrl);
  }

  // 2. NEXT_PUBLIC_APP_URL (fallback)
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) {
    return normalizeOrigin(configuredUrl);
  }

  // 3. Browser window location — skip Tauri / embedded desktop origins
  if (typeof window !== "undefined" && window.location.origin) {
    if (isPublicWebOrigin(window.location.origin)) {
      return window.location.origin;
    }
    // Local web dev still needs localhost for auth redirects
    const host = window.location.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return window.location.origin;
    }
    return DEFAULT_PUBLIC_SITE_URL;
  }

  // 4. Development fallback
  return "http://localhost:3000";
}

/** Sign-in only. Never include Calendar or other sensitive Google scopes. */
export const GOOGLE_SIGNIN_SCOPES = "openid email profile";

function isLocalDevOrigin(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * OAuth redirect for the current browser origin. PKCE stores the code verifier
 * in that origin's localStorage — sending the user to SITE_URL from apex,
 * preview, or localhost makes the exchange fail with a missing verifier.
 * Tauri / other private origins are not valid Google redirects, so those
 * fall back to getAppOrigin().
 */
export function buildOAuthRedirectTo(
  currentOrigin: string | undefined,
  fallbackOrigin: string,
  path = "/auth/callback"
): string {
  if (currentOrigin && (isPublicWebOrigin(currentOrigin) || isLocalDevOrigin(currentOrigin))) {
    return `${normalizeOrigin(currentOrigin)}${path}`;
  }
  return `${normalizeOrigin(fallbackOrigin)}${path}`;
}

export function getOAuthRedirectTo(path = "/auth/callback"): string {
  const current = typeof window !== "undefined" ? window.location.origin : undefined;
  return buildOAuthRedirectTo(current, getAppOrigin(), path);
}

function getEdgeFunctionUrl() {
  const { supabaseUrl } = getSupabaseEnv();
  return `${supabaseUrl}/functions/v1`;
}

function isHtmlResponse(text: string) {
  const normalized = text.trim().toLowerCase();
  return normalized.startsWith("<!doctype html") || normalized.startsWith("<html");
}

function getSupabaseMisconfigurationMessage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return [
    "Supabase returned HTML instead of JSON.",
    "Check your Vercel environment variables.",
    `NEXT_PUBLIC_SUPABASE_URL should be your Supabase project URL, for example https://your-project-ref.supabase.co${url ? ` (current host: ${safeHost(url)})` : ""}.`,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY must be the matching anon public key for the same project.",
  ].join(" ");
}

function safeHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

export function getFriendlySupabaseErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Authentication failed";
  }

  const message = error.message || "Authentication failed";
  if (
    message.includes("Unexpected token '<'") ||
    message.includes("<!DOCTYPE") ||
    message.includes("is not valid JSON")
  ) {
    return getSupabaseMisconfigurationMessage();
  }

  return message;
}

// Helper for Edge Function calls
async function edgeFunction<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const supabase = getSupabaseClient();
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  const edgeFunctionUrl = getEdgeFunctionUrl();

  const response = await fetch(`${edgeFunctionUrl}/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `HTTP ${response.status}`;
    try {
      const error = JSON.parse(text);
      message = error.error || error.message || text || message;
    } catch {
      message = isHtmlResponse(text) ? getSupabaseMisconfigurationMessage() : text || message;
    }
    // Special handling for auth errors
    if (response.status === 401 || text.includes("Missing authorization") || text.includes("Unauthorized")) {
      throw new Error("Please sign in to continue");
    }
    // Google Calendar: user revoked access at Google — typed so callers branch.
    if (response.status === 409 && message === 'reconnect_required') {
      throw new GoogleCalendarReconnectError();
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

type UserProfileRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  preferences: Partial<UserPreferences> | null;
  preferences_updated_at: string | null;
  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;
};

/** Parse a timestamptz to epoch ms, or undefined when absent/unparseable. */
function parseTimestamp(value: string | null): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

function mapUserProfile(row: UserProfileRow): UserProfile {
  // Postgres defaults the column to '{}', so an untouched profile arrives as an
  // empty object rather than null. Treat both as "nothing saved yet".
  const preferences =
    row.preferences && Object.keys(row.preferences).length > 0
      ? row.preferences
      : undefined;

  return {
    userId: row.user_id,
    fullName: row.full_name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    preferences,
    preferencesUpdatedAt: parseTimestamp(row.preferences_updated_at),
    onboardingCompleted: row.onboarding_completed === true,
    onboardingCompletedAt: parseTimestamp(row.onboarding_completed_at),
  };
}

const USER_PROFILE_COLUMNS =
  'user_id, full_name, avatar_url, preferences, preferences_updated_at, onboarding_completed, onboarding_completed_at';

async function requireUserId() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Please sign in to continue');
  return data.user.id;
}

// API Clients for all entities
export const api = {
  /**
   * Profiles go straight to the table under RLS ("Users can CRUD own profile")
   * rather than through an edge function — there is no user-profiles function
   * deployed, and a profile read/write never crosses a user boundary. Callers
   * should still come via the store, not components.
   */
  profile: {
    get: async (): Promise<UserProfile | null> => {
      const supabase = getSupabaseClient();
      const userId = await requireUserId();

      // maybeSingle(): a user with no profile yet is a normal state, not an error.
      const { data, error } = await supabase
        .from('user_profiles')
        .select(USER_PROFILE_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle<UserProfileRow>();

      if (error) throw error;
      return data ? mapUserProfile(data) : null;
    },

    upsert: async (patch: UserProfilePatch): Promise<UserProfile> => {
      const supabase = getSupabaseClient();
      const userId = await requireUserId();

      const row: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };
      if (patch.fullName !== undefined) row.full_name = patch.fullName;
      if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
      if (patch.preferences !== undefined) {
        row.preferences = patch.preferences;
        // Always stamp the clock alongside the blob — an unstamped write would
        // lose every cross-device comparison against a stamped one.
        row.preferences_updated_at = new Date(
          patch.preferencesUpdatedAt ?? Date.now()
        ).toISOString();
      }
      if (patch.onboardingCompleted !== undefined) {
        row.onboarding_completed = patch.onboardingCompleted;
      }
      if (patch.onboardingCompletedAt !== undefined) {
        row.onboarding_completed_at = new Date(patch.onboardingCompletedAt).toISOString();
      }

      // onConflict: "user_id" is required — without it PostgREST targets the
      // primary key, which is generated per insert and therefore never conflicts,
      // so every call would append a duplicate row.
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(row, { onConflict: 'user_id' })
        .select(USER_PROFILE_COLUMNS)
        .single<UserProfileRow>();

      if (error) throw error;
      return mapUserProfile(data);
    },
  },
  clients: {
    list: () => edgeFunction<{ clients: Client[] }>('clients'),
    get: (id: string) => edgeFunction<Client>(`clients/${id}`),
    create: (data: unknown) => edgeFunction<Client>('clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => edgeFunction<Client>(`clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => edgeFunction<{ success: boolean }>(`clients/${id}`, { method: 'DELETE' }),
  },
  projects: {
    list: () => edgeFunction<{ projects: Project[] }>('projects'),
    get: (id: string) => edgeFunction<Project>(`projects/${id}`),
    create: (data: unknown) => edgeFunction<Project>('projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => edgeFunction<Project>(`projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => edgeFunction<{ success: boolean }>(`projects/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (filters?: { projectId?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.append('projectId', filters.projectId);
      if (filters?.status) params.append('status', filters.status);
      const query = params.toString() ? `?${params.toString()}` : '';
      return edgeFunction<{ tasks: Task[] }>(`tasks${query}`);
    },
    get: (id: string) => edgeFunction<Task>(`tasks/${id}`),
    create: (data: unknown) => edgeFunction<Task>('tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => edgeFunction<Task>(`tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => edgeFunction<{ success: boolean }>(`tasks/${id}`, { method: 'DELETE' }),
  },
  sessions: {
    list: (filters?: { taskId?: string; projectId?: string; active?: boolean }) => {
      const params = new URLSearchParams();
      if (filters?.taskId) params.append('taskId', filters.taskId);
      if (filters?.projectId) params.append('projectId', filters.projectId);
      if (filters?.active) params.append('active', 'true');
      const query = params.toString() ? `?${params.toString()}` : '';
      return edgeFunction<{ sessions: Session[] }>(`sessions${query}`);
    },
    get: (id: string) => edgeFunction<Session>(`sessions/${id}`),
    create: (data: unknown) => edgeFunction<Session>('sessions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => edgeFunction<Session>(`sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => edgeFunction<{ success: boolean }>(`sessions/${id}`, { method: 'DELETE' }),
  },
  analytics: {
    dashboard: () => edgeFunction('analytics?type=dashboard'),
    projects: () => edgeFunction('analytics?type=projects'),
    timeDistribution: (days: number = 30) => edgeFunction(`analytics?type=time-distribution&days=${days}`),
  },
  reportShares: {
    list: () => edgeFunction<{ shares: ReportShare[] }>('report-shares'),
    create: (data: CreateReportShareInput) =>
      edgeFunction<CreateReportShareResult>('report-shares', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateReportShareInput) =>
      edgeFunction<ReportShare>(`report-shares/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    revoke: (id: string) =>
      edgeFunction<ReportShare>(`report-shares/${id}/revoke`, { method: 'POST', body: '{}' }),
    rotateToken: (id: string) =>
      edgeFunction<CreateReportShareResult>(`report-shares/${id}/rotate-token`, {
        method: 'POST',
        body: '{}',
      }),
    delete: (id: string) =>
      edgeFunction<{ success: boolean }>(`report-shares/${id}`, { method: 'DELETE' }),
  },
  /**
   * Google Calendar OAuth + read-only overlay. Tokens never leave the edge
   * function; the client only sees connection status, calendar list, and events.
   */
  googleCalendar: {
    status: () => edgeFunction<GoogleCalendarConnection>('google-calendar/status'),
    // redirectUri must be one of GOOGLE_OAUTH_REDIRECT_URIS on the function, and
    // the same value must come back on completeConnect — Google compares them
    // byte for byte on the token exchange. Derived from the live origin so
    // localhost and production each get their own without a config swap.
    authUrl: (redirectUri: string) => {
      const params = new URLSearchParams({ redirectUri });
      return edgeFunction<{ url: string }>(`google-calendar/auth-url?${params.toString()}`);
    },
    // `state` is not optional: /auth-url sets it to the user's id and the edge
    // function rejects the callback with 400 unless it matches. That check is
    // the CSRF defence for the connect flow — pass Google's state back verbatim.
    completeConnect: (code: string, state: string, redirectUri: string) =>
      edgeFunction<GoogleCalendarConnection>('google-calendar/callback', {
        method: 'POST',
        body: JSON.stringify({ code, state, redirectUri }),
      }),
    listCalendars: () =>
      edgeFunction<{ calendars: GoogleCalendarListEntry[] }>('google-calendar/calendars'),
    setSelectedCalendars: (ids: string[]) =>
      edgeFunction<GoogleCalendarConnection>('google-calendar/calendars', {
        method: 'PUT',
        body: JSON.stringify({ selectedCalendarIds: ids }),
      }),
    listEvents: (timeMinMs: number, timeMaxMs: number) => {
      const params = new URLSearchParams({
        timeMin: new Date(timeMinMs).toISOString(),
        timeMax: new Date(timeMaxMs).toISOString(),
      });
      return edgeFunction<{ events: GoogleCalendarEvent[] }>(
        `google-calendar/events?${params.toString()}`
      );
    },
    disconnect: () =>
      edgeFunction<{ connected: false }>('google-calendar', { method: 'DELETE' }),
  },
};

/**
 * Public shared-report fetch. Never attaches the user's JWT so a signed-in
 * owner visiting /share does not accidentally auth as themselves for /view.
 */
export async function fetchSharedReport(
  input: FetchSharedReportInput
): Promise<PublicSharedReport> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const response = await fetch(`${supabaseUrl}/functions/v1/report-shares/view`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(input),
  });

  const text = await response.text();
  let body: { error?: string; code?: string } & Partial<PublicSharedReport> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    if (isHtmlResponse(text)) {
      throw new SharedReportError('unavailable', getSupabaseMisconfigurationMessage(), 502);
    }
    throw new SharedReportError('unavailable', 'Could not load shared report', response.status || 502);
  }

  if (!response.ok) {
    const code = (body.code as ShareErrorCode) || 'unavailable';
    const message = body.error || 'Could not load shared report';
    throw new SharedReportError(code, message, response.status);
  }

  return body as PublicSharedReport;
}
