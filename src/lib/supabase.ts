import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Client, Project, Session, Task } from './types';
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
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  return supabase;
}

export function getAppOrigin() {
  // Priority order for app URL configuration
  
  // 1. NEXT_PUBLIC_SITE_URL (preferred for production)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    return siteUrl.replace(/\/$/, "");
  }

  // 2. NEXT_PUBLIC_APP_URL (fallback)
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  // 3. Browser window location (client-side only)
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  // 4. Development fallback
  return "http://localhost:3000";
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
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// API Clients for all entities
export const api = {
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
