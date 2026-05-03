# Flowmate: JSON to Supabase Migration Guide

Complete walkthrough for migrating your local JSON-based Next.js app to a Supabase-powered backend with Edge Functions.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Phase 1: Database Schema Design](#phase-1-database-schema-design)
3. [Phase 2: Supabase Setup](#phase-2-supabase-setup)
4. [Phase 3: Edge Functions Implementation](#phase-3-edge-functions-implementation)
5. [Phase 4: Frontend Integration](#phase-4-frontend-integration)
6. [Phase 5: Analytics & Reporting](#phase-5-analytics--reporting)
7. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  Supabase Edge   │────▶│   PostgreSQL    │
│   (Frontend)    │◀────│   Functions      │◀────│   (JSONB)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                                               │
        │         ┌─────────────┐                       │
        └────────▶│  Auth (JWT) │◀──────────────────────┘
                  └─────────────┘
```

**Key Design Decisions:**
- **JSONB columns** for flexible entity storage (matches your current schema)
- **Edge Functions** for business logic (analytics, aggregations, validations)
- **Row Level Security (RLS)** for data isolation
- **Computed/materialized views** for analytics

---

## Phase 1: Database Schema Design

### 1.1 Core Tables with JSONB

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (synced with Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table (time tracking entries)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    billable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 JSONB Schema Structure

**User Data:**
```json
{
  "name": "Amulya",
  "email": "tech@cyaninnovations.com",
  "timezone": "UTC",
  "preferences": {
    "currency": "USD",
    "defaultHourlyRate": 5000
  }
}
```

**Client Data:**
```json
{
  "name": "Cyan Innovations",
  "email": "contact@cyan.com",
  "hourlyRate": 5000,
  "currency": "USD",
  "address": "123 Tech Street, San Francisco, CA",
  "phone": "+1-555-0101",
  "notes": "Main SaaS client, premium support tier"
}
```

**Project Data:**
```json
{
  "name": "Flowmate",
  "description": "Time tracking and task management app",
  "color": "teal",
  "billable": true,
  "status": "active",
  "startDate": 1704067200000,
  "endDate": null,
  "budget": 50000,
  "tags": ["app", "saas", "nextjs"]
}
```

**Task Data:**
```json
{
  "title": "Design landing page",
  "description": "Create mockups and finalize design",
  "urgency": "urgent",
  "status": "in_progress",
  "estimateMinutes": 90,
  "actualMinutes": 75,
  "assignees": [],
  "tags": ["design", "frontend"],
  "dateRange": {
    "startDate": 1704067200000,
    "dueDate": 1704153600000,
    "completedAt": null
  }
}
```

**Session Data:**
```json
{
  "notes": "Progress ring animation implementation",
  "paused": false
}
```

### 1.3 Indexes for Performance

```sql
-- JSONB indexes for common queries
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_task_id ON sessions(task_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);

-- JSONB GIN indexes for flexible querying
CREATE INDEX idx_clients_data_gin ON clients USING GIN(data);
CREATE INDEX idx_projects_data_gin ON projects USING GIN(data);
CREATE INDEX idx_tasks_data_gin ON tasks USING GIN(data);
CREATE INDEX idx_sessions_data_gin ON sessions USING GIN(data);

-- Partial index for active sessions
CREATE INDEX idx_sessions_active ON sessions(user_id, billable) 
WHERE ended_at IS NULL;
```

### 1.4 Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Clients policies
CREATE POLICY "Users can CRUD own clients" ON clients
    FOR ALL USING (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can CRUD own projects" ON projects
    FOR ALL USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can CRUD own tasks" ON tasks
    FOR ALL USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users can CRUD own sessions" ON sessions
    FOR ALL USING (auth.uid() = user_id);
```

---

## Phase 2: Supabase Setup

### 2.1 Project Initialization

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Initialize project (run from project root)
supabase init

# Link to your project (you'll provide project ID)
supabase link --project-ref YOUR_PROJECT_ID
```

### 2.2 Environment Configuration

Create `.env.local` in your Next.js project:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
```

### 2.3 Apply Database Schema

```bash
# Create migration file
supabase migration new initial_schema

# Copy the SQL from Phase 1.1 into:
# supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql

# Apply migration
supabase db push
```

---

## Phase 3: Edge Functions Implementation

### 3.1 Function Structure

```
supabase/
├── functions/
│   ├── clients/
│   │   ├── index.ts        # CRUD operations
│   │   └── _shared/
│   ├── projects/
│   │   ├── index.ts
│   │   └── _shared/
│   ├── tasks/
│   │   ├── index.ts
│   │   └── _shared/
│   ├── sessions/
│   │   ├── index.ts
│   │   └── _shared/
│   ├── analytics/
│   │   ├── index.ts        # Dashboard stats
│   │   └── _shared/
│   └── _shared/
│       ├── supabase.ts     # Supabase client
│       ├── cors.ts         # CORS headers
│       └── validators.ts   # Input validation
```

### 3.2 Shared Utilities

**`supabase/functions/_shared/supabase.ts`:**
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getSupabaseClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: authHeader ? { Authorization: authHeader } : undefined,
      },
    }
  );
}

export function getServiceRoleClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );
}
```

**`supabase/functions/_shared/cors.ts`:**
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
```

**`supabase/functions/_shared/validators.ts`:**
```typescript
export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function validateRequired(data: Record<string, any>, fields: string[]): string | null {
  for (const field of fields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

export function sanitizeData(data: Record<string, any>): Record<string, any> {
  // Remove internal fields
  const { id, created_at, updated_at, user_id, ...clean } = data;
  return clean;
}
```

### 3.3 CRUD Edge Functions

**`supabase/functions/clients/index.ts`:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { validateUUID, validateRequired, sanitizeData } from '../_shared/validators.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getSupabaseClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    switch (req.method) {
      case 'GET': {
        if (path && path !== 'clients') {
          // Get single client
          if (!validateUUID(path)) {
            return new Response(JSON.stringify({ error: 'Invalid client ID' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', path)
            .eq('user_id', user.id)
            .single();
          
          if (error) throw error;
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // List all clients
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return new Response(JSON.stringify({ clients: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'POST': {
        const body = await req.json();
        const validation = validateRequired(body, ['name']);
        if (validation) {
          return new Response(JSON.stringify({ error: validation }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            data: sanitizeData(body),
          })
          .select()
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'PUT': {
        if (!path || path === 'clients') {
          return new Response(JSON.stringify({ error: 'Client ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        const { data, error } = await supabase
          .from('clients')
          .update({ data: sanitizeData(body) })
          .eq('id', path)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'DELETE': {
        if (!path || path === 'clients') {
          return new Response(JSON.stringify({ error: 'Client ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', path)
          .eq('user_id', user.id);
        
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: corsHeaders,
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### 3.4 Analytics Edge Function

**`supabase/functions/analytics/index.ts`:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getSupabaseClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'dashboard';

  try {
    switch (type) {
      case 'dashboard': {
        // Get today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: todaySessions, error: todayError } = await supabase
          .from('sessions')
          .select('duration_seconds, billable, project_id')
          .eq('user_id', user.id)
          .gte('started_at', today.toISOString());
        
        if (todayError) throw todayError;

        // Get week stats
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        
        const { data: weekSessions, error: weekError } = await supabase
          .from('sessions')
          .select('duration_seconds, billable, project_id')
          .eq('user_id', user.id)
          .gte('started_at', weekStart.toISOString());
        
        if (weekError) throw weekError;

        // Get task stats
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('data')
          .eq('user_id', user.id);
        
        if (tasksError) throw tasksError;

        // Calculate stats
        const todayTracked = todaySessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0;
        const weekTracked = weekSessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0;
        
        const weekBillable = weekSessions
          ?.filter(s => s.billable)
          .reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0;

        const taskStats = {
          total: tasks?.length || 0,
          completed: tasks?.filter(t => t.data?.status === 'done').length || 0,
          inProgress: tasks?.filter(t => t.data?.status === 'in_progress').length || 0,
          todo: tasks?.filter(t => t.data?.status === 'todo').length || 0,
        };

        return new Response(JSON.stringify({
          todayTracked: {
            seconds: todayTracked,
            minutes: Math.floor(todayTracked / 60),
            hours: (todayTracked / 3600).toFixed(1),
            sessions: todaySessions?.length || 0,
          },
          weekTracked: {
            seconds: weekTracked,
            minutes: Math.floor(weekTracked / 60),
            hours: (weekTracked / 3600).toFixed(1),
            sessions: weekSessions?.length || 0,
          },
          weekBillable: {
            seconds: weekBillable,
            minutes: Math.floor(weekBillable / 60),
            hours: (weekBillable / 3600).toFixed(1),
            sessions: weekSessions?.filter(s => s.billable).length || 0,
          },
          taskStats: {
            ...taskStats,
            completionRate: taskStats.total > 0 
              ? Math.round((taskStats.completed / taskStats.total) * 100) 
              : 0,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'projects': {
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('project_id, duration_seconds, billable, started_at')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false });
        
        if (error) throw error;

        // Group by project
        const projectStats = sessions?.reduce((acc, s) => {
          const pid = s.project_id || 'unassigned';
          if (!acc[pid]) {
            acc[pid] = { totalSeconds: 0, billableSeconds: 0, sessions: 0 };
          }
          acc[pid].totalSeconds += s.duration_seconds || 0;
          if (s.billable) acc[pid].billableSeconds += s.duration_seconds || 0;
          acc[pid].sessions++;
          return acc;
        }, {} as Record<string, any>);

        return new Response(JSON.stringify({ projectStats }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown analytics type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### 3.5 Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy clients
supabase functions deploy projects
supabase functions deploy tasks
supabase functions deploy sessions
supabase functions deploy analytics

# Set environment variables for functions
supabase secrets set SUPABASE_URL=YOUR_SUPABASE_URL
supabase secrets set SUPABASE_ANON_KEY=YOUR_ANON_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

---

## Phase 4: Frontend Integration

### 4.1 Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 4.2 Create Supabase Client

**`src/lib/supabase.ts`:**
```typescript
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
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// API Clients
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
    list: () => edgeFunction('tasks'),
    get: (id: string) => edgeFunction(`tasks/${id}`),
    create: (data: any) => edgeFunction('tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => edgeFunction(`tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => edgeFunction(`tasks/${id}`, { method: 'DELETE' }),
  },
  sessions: {
    list: () => edgeFunction('sessions'),
    get: (id: string) => edgeFunction(`sessions/${id}`),
    create: (data: any) => edgeFunction('sessions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => edgeFunction(`sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => edgeFunction(`sessions/${id}`, { method: 'DELETE' }),
  },
  analytics: {
    dashboard: () => edgeFunction('analytics?type=dashboard'),
    projects: () => edgeFunction('analytics?type=projects'),
  },
};
```

### 4.3 Updated Zustand Store

**`src/lib/store.ts` (Supabase version):**
```typescript
"use client";

import { create } from "zustand";
import { api } from "./supabase";
import type { Client, Project, Task, Session, Urgency, TaskStatus } from "./types";
import { uid } from "./format";

interface State {
  user: { name: string } | null;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  sessions: Session[];
  activeSessionId: string | null;
  selectedProjectId: string | null;
  selectedUrgency: Urgency | "all";
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: { name: string } | null) => void;
  
  addClient: (c: Omit<Client, "id">) => Promise<Client>;
  addProject: (p: Omit<Project, "id">) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Omit<Project, "id">>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  addTask: (t: Omit<Task, "id" | "createdAt" | "status"> & { status?: TaskStatus }) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>;

  startSession: (taskId: string, billable?: boolean) => Promise<Session | null>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopSession: () => Promise<Session | null>;

  setSelectedProject: (id: string | null) => void;
  setSelectedUrgency: (u: Urgency | "all") => void;

  // Data loading
  loadClients: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadTasks: () => Promise<void>;
  loadSessions: () => Promise<void>;
  loadAll: () => Promise<void>;
}

export const useApp = create<State>()((set, get) => ({
  user: null,
  clients: [],
  projects: [],
  tasks: [],
  sessions: [],
  activeSessionId: null,
  selectedProjectId: null,
  selectedUrgency: "all",
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),

  addClient: async (c) => {
    const created = await api.clients.create(c);
    set({ clients: [...get().clients, created] });
    return created;
  },

  addProject: async (p) => {
    const created = await api.projects.create(p);
    set({ projects: [...get().projects, created] });
    return created;
  },

  updateProject: async (id, patch) => {
    const updated = await api.projects.update(id, patch);
    set({
      projects: get().projects.map((p) => (p.id === id ? { ...p, ...updated } : p)),
    });
  },

  deleteProject: async (id) => {
    await api.projects.delete(id);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },

  addTask: async (t) => {
    const created = await api.tasks.create({
      ...t,
      status: t.status ?? "todo",
    });
    set({ tasks: [...get().tasks, created] });
    return created;
  },

  updateTask: async (id, patch) => {
    const updated = await api.tasks.update(id, patch);
    set({
      tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    });
  },

  deleteTask: async (id) => {
    await api.tasks.delete(id);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },

  setTaskStatus: async (id, status) => {
    await api.tasks.update(id, { status });
    set({
      tasks: get().tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    });
  },

  startSession: async (taskId, billable) => {
    if (get().activeSessionId) return null;
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return null;
    
    const project = get().projects.find((p) => p.id === task.projectId);
    const session = await api.sessions.create({
      taskId,
      projectId: task.projectId,
      billable: billable ?? project?.billable ?? false,
      startedAt: Date.now(),
      durationSeconds: 0,
      paused: false,
    });

    set({
      sessions: [...get().sessions, session],
      activeSessionId: session.id,
    });
    
    return session;
  },

  pauseSession: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    const session = get().sessions.find((s) => s.id === id);
    if (!session || session.paused) return;

    const duration = session.durationSeconds + Math.floor((Date.now() - session.startedAt) / 1000);
    await api.sessions.update(id, { paused: true, durationSeconds: duration });

    set({
      sessions: get().sessions.map((s) =>
        s.id === id ? { ...s, paused: true, durationSeconds: duration } : s
      ),
    });
  },

  resumeSession: async () => {
    const id = get().activeSessionId;
    if (!id) return;
    
    await api.sessions.update(id, { paused: false, startedAt: Date.now() });
    set({
      sessions: get().sessions.map((s) =>
        s.id === id ? { ...s, paused: false, startedAt: Date.now() } : s
      ),
    });
  },

  stopSession: async () => {
    const id = get().activeSessionId;
    if (!id) return null;
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return null;

    const final = session.paused
      ? session.durationSeconds
      : session.durationSeconds + Math.floor((Date.now() - session.startedAt) / 1000);

    const updated = await api.sessions.update(id, {
      durationSeconds: final,
      endedAt: Date.now(),
      paused: true,
    });

    set({
      sessions: get().sessions.map((s) => (s.id === id ? updated : s)),
      activeSessionId: null,
    });

    return updated;
  },

  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedUrgency: (u) => set({ selectedUrgency: u }),

  loadClients: async () => {
    const { clients } = await api.clients.list();
    set({ clients: clients || [] });
  },

  loadProjects: async () => {
    const { projects } = await api.projects.list();
    set({ projects: projects || [] });
  },

  loadTasks: async () => {
    const { tasks } = await api.tasks.list();
    set({ tasks: tasks || [] });
  },

  loadSessions: async () => {
    const { sessions } = await api.sessions.list();
    set({ sessions: sessions || [] });
  },

  loadAll: async () => {
    set({ isLoading: true });
    try {
      await Promise.all([
        get().loadClients(),
        get().loadProjects(),
        get().loadTasks(),
        get().loadSessions(),
      ]);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ isLoading: false });
    }
  },
}));
```

### 4.4 Auth Integration

**`src/lib/auth.tsx`:**
```typescript
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabase";
import { useApp } from "./store";

interface AuthContextType {
  user: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { setUser: setStoreUser, loadAll } = useApp();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setStoreUser({ name: session.user.user_metadata?.name || "User" });
        loadAll();
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setStoreUser({ name: session.user.user_metadata?.name || "User" });
        loadAll();
      } else {
        setStoreUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

---

## Phase 5: Analytics & Reporting

### 5.1 Analytics View Components

The Edge Function analytics endpoint (`/functions/v1/analytics?type=dashboard`) returns:

```typescript
interface DashboardStats {
  todayTracked: {
    seconds: number;
    minutes: number;
    hours: string;
    sessions: number;
  };
  weekTracked: {
    seconds: number;
    minutes: number;
    hours: string;
    sessions: number;
  };
  weekBillable: {
    seconds: number;
    minutes: number;
    hours: string;
    sessions: number;
  };
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    completionRate: number;
  };
}
```

### 5.2 Usage in Components

```typescript
import { api } from "@/lib/supabase";

function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.analytics.dashboard().then(setStats);
  }, []);

  // Render stats...
}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Set up Supabase project
- [ ] Run all migrations
- [ ] Deploy all Edge Functions
- [ ] Configure environment variables
- [ ] Enable RLS policies
- [ ] Test auth flow
- [ ] Test CRUD operations
- [ ] Verify analytics endpoints

### Environment Variables

```bash
# Add to Vercel/Netlify environment
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Function secrets
supabase secrets set SUPABASE_URL=xxx
supabase secrets set SUPABASE_ANON_KEY=xxx
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Post-Deployment

- [ ] Create initial user account
- [ ] Migrate existing JSON data (optional script)
- [ ] Verify data persistence
- [ ] Test real-time session tracking
- [ ] Confirm analytics calculations

---

## Data Migration Script (Optional)

If you want to migrate existing JSON data:

```typescript
// scripts/migrate-data.ts
import { createClient } from '@supabase/supabase-js';
import data from '../public/data.json';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function migrate() {
  // Create user first
  const { data: { user }, error: authError } = await supabase.auth.signUp({
    email: data.user.email,
    password: 'temp-password-change-later',
  });

  if (authError || !user) throw authError;

  // Insert clients
  for (const client of data.clients) {
    await supabase.from('clients').insert({
      id: client.id,
      user_id: user.id,
      data: client,
    });
  }

  // Insert projects
  for (const project of data.projects) {
    await supabase.from('projects').insert({
      id: project.id,
      user_id: user.id,
      client_id: project.clientId,
      data: project,
    });
  }

  // Insert tasks
  for (const task of data.tasks) {
    await supabase.from('tasks').insert({
      id: task.id,
      user_id: user.id,
      project_id: task.projectId,
      data: task,
    });
  }

  // Insert sessions
  for (const session of data.sessions) {
    await supabase.from('sessions').insert({
      id: session.id,
      user_id: user.id,
      task_id: session.taskId,
      project_id: session.projectId,
      data: session,
      started_at: new Date(session.startedAt).toISOString(),
      ended_at: session.endedAt ? new Date(session.endedAt).toISOString() : null,
      duration_seconds: session.durationSeconds,
      billable: session.billable,
    });
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);
```

---

## Next Steps

When you're ready to proceed:

1. **Provide your Supabase credentials:**
   - Project ID
   - Project URL
   - Anon key (public)
   - Service role key (keep private)

2. **I'll implement:**
   - Complete database setup
   - All Edge Functions (clients, projects, tasks, sessions, analytics)
   - Frontend API client integration
   - Auth flow
   - Real-time session tracking

3. **Testing:**
   - Local development verification
   - Edge Function deployment testing
   - End-to-end flow validation
