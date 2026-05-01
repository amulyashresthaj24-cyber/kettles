import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Edge Function base URL
const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1`;

// Helper for Edge Function calls
async function edgeFunction(path: string, options: RequestInit = {}) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const response = await fetch(`${EDGE_FUNCTION_URL}/${path}`, {
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
      message = text || message;
    }
    // Special handling for auth errors
    if (response.status === 401 || text.includes("Missing authorization") || text.includes("Unauthorized")) {
      throw new Error("Please sign in to continue");
    }
    throw new Error(message);
  }

  return response.json();
}

// API Clients for all entities
export const api = {
  clients: {
    list: () => edgeFunction('clients'),
    get: (id: string) => edgeFunction(`clients/${id}`),
    create: (data: any) => edgeFunction('clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => edgeFunction(`clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => edgeFunction(`clients/${id}`, { method: 'DELETE' }),
  },
  projects: {
    list: () => edgeFunction('projects'),
    get: (id: string) => edgeFunction(`projects/${id}`),
    create: (data: any) => edgeFunction('projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => edgeFunction(`projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => edgeFunction(`projects/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (filters?: { projectId?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.append('projectId', filters.projectId);
      if (filters?.status) params.append('status', filters.status);
      const query = params.toString() ? `?${params.toString()}` : '';
      return edgeFunction(`tasks${query}`);
    },
    get: (id: string) => edgeFunction(`tasks/${id}`),
    create: (data: any) => edgeFunction('tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => edgeFunction(`tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => edgeFunction(`tasks/${id}`, { method: 'DELETE' }),
  },
  sessions: {
    list: (filters?: { taskId?: string; projectId?: string; active?: boolean }) => {
      const params = new URLSearchParams();
      if (filters?.taskId) params.append('taskId', filters.taskId);
      if (filters?.projectId) params.append('projectId', filters.projectId);
      if (filters?.active) params.append('active', 'true');
      const query = params.toString() ? `?${params.toString()}` : '';
      return edgeFunction(`sessions${query}`);
    },
    get: (id: string) => edgeFunction(`sessions/${id}`),
    create: (data: any) => edgeFunction('sessions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => edgeFunction(`sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => edgeFunction(`sessions/${id}`, { method: 'DELETE' }),
  },
  analytics: {
    dashboard: () => edgeFunction('analytics?type=dashboard'),
    projects: () => edgeFunction('analytics?type=projects'),
    timeDistribution: (days: number = 30) => edgeFunction(`analytics?type=time-distribution&days=${days}`),
  },
};
