# Flowmate — Database Schema

Maps `public/data.json` → app code → PostgreSQL schema required for production.

**Current state:** All data lives in localStorage (Zustand persist). This doc defines the relational schema needed when moving to a real backend.

---

## Entity Relationship Overview

```
users
  └── clients (user_id)
        └── projects (client_id nullable)
              └── tasks (project_id)
                    └── sessions (task_id, project_id denorm)
```

---

## Tables

### `users`

Sourced from: `data.json → user`, `store.ts → state.user`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default gen_random_uuid() | |
| `name` | `varchar(100)` | NOT NULL | |
| `email` | `varchar(255)` | NOT NULL, UNIQUE | |
| `password_hash` | `varchar(255)` | NOT NULL | bcrypt |
| `timezone` | `varchar(50)` | NOT NULL, default `'UTC'` | |
| `created_at` | `timestamptz` | NOT NULL, default now() | |
| `updated_at` | `timestamptz` | NOT NULL, default now() | |

**data.json fields used:** `id`, `name`, `email`, `timezone`, `createdAt`

---

### `clients`

Sourced from: `data.json → clients`, `types.ts → Client`, `store.ts → addClient()`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → users.id, NOT NULL | owner |
| `name` | `varchar(100)` | NOT NULL | |
| `email` | `varchar(255)` | | optional contact |
| `hourly_rate_cents` | `integer` | NOT NULL, default 0 | store cents, avoid float |
| `currency` | `char(3)` | NOT NULL, default `'USD'` | ISO 4217 |
| `address` | `text` | | |
| `phone` | `varchar(50)` | | |
| `notes` | `text` | | |
| `created_at` | `timestamptz` | NOT NULL, default now() | |
| `updated_at` | `timestamptz` | NOT NULL, default now() | |

**data.json fields used:** `id`, `name`, `email`, `hourlyRate`, `currency`, `address`, `phone`, `notes`, `createdAt`

**Key:** `hourlyRate` in data.json is dollars (e.g. 5000 = $50.00) — store as cents in DB.

**Used by:** ReportPage earnings calc, Dashboard weekly billable, Session billing.

---

### `projects`

Sourced from: `data.json → projects`, `types.ts → Project`, `store.ts → addProject()`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → users.id, NOT NULL | |
| `client_id` | `uuid` | FK → clients.id, NULL | personal projects have no client |
| `name` | `varchar(100)` | NOT NULL | |
| `description` | `text` | | |
| `color` | `varchar(20)` | NOT NULL, default `'indigo'` | enum: teal/amber/rose/indigo |
| `billable` | `boolean` | NOT NULL, default false | default for new sessions |
| `status` | `varchar(20)` | NOT NULL, default `'active'` | enum: active/paused/completed/archived |
| `budget_cents` | `integer` | NOT NULL, default 0 | |
| `tags` | `text[]` | default `'{}'` | |
| `start_date` | `timestamptz` | | |
| `end_date` | `timestamptz` | | |
| `created_at` | `timestamptz` | NOT NULL, default now() | |
| `updated_at` | `timestamptz` | NOT NULL, default now() | |

**data.json fields used:** `id`, `name`, `description`, `clientId`, `color`, `billable`, `status`, `startDate`, `endDate`, `budget`, `tags`, `createdAt`

**Used by:** Sidebar nav, task filtering, session billing lookup, report grouping.

---

### `tasks`

Sourced from: `data.json → tasks`, `types.ts → Task`, `store.ts → addTask()/updateTask()/setTaskStatus()`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → users.id, NOT NULL | |
| `project_id` | `uuid` | FK → projects.id, NOT NULL | |
| `title` | `varchar(255)` | NOT NULL | |
| `description` | `text` | | |
| `urgency` | `varchar(10)` | NOT NULL, default `'normal'` | enum: urgent/high/normal/low |
| `status` | `varchar(15)` | NOT NULL, default `'todo'` | enum: todo/in_progress/done |
| `estimate_minutes` | `integer` | | nullable |
| `actual_minutes` | `integer` | | computed or manually set |
| `tags` | `text[]` | default `'{}'` | |
| `assignees` | `text[]` | default `'{}'` | future: FK to users |
| `due_date` | `timestamptz` | | from dateRange.dueDate |
| `start_date` | `timestamptz` | | from dateRange.startDate |
| `completed_at` | `timestamptz` | | set when status → done |
| `created_at` | `timestamptz` | NOT NULL, default now() | |
| `updated_at` | `timestamptz` | NOT NULL, default now() | |

**data.json fields used:** `id`, `title`, `description`, `projectId`, `urgency`, `status`, `estimateMinutes`, `actualMinutes`, `tags`, `assignees`, `dateRange.startDate`, `dateRange.dueDate`, `dateRange.completedAt`, `createdAt`, `updatedAt`

**Used by:** KanbanBoard, TaskList, CalendarView, TimerPage, Dashboard stats.

---

### `sessions`

Sourced from: `data.json → sessions`, `types.ts → Session`, `store.ts → startSession()/stopSession()/pauseSession()/adjustSessionDuration()`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → users.id, NOT NULL | |
| `task_id` | `uuid` | FK → tasks.id, NOT NULL | |
| `project_id` | `uuid` | FK → projects.id, NOT NULL | denormalized for perf |
| `billable` | `boolean` | NOT NULL, default false | inherited from project at start |
| `started_at` | `timestamptz` | NOT NULL | |
| `paused_at` | `timestamptz` | | NULL if not paused |
| `ended_at` | `timestamptz` | | NULL = active session |
| `duration_seconds` | `integer` | NOT NULL, default 0 | accumulated; excludes active elapsed |
| `paused` | `boolean` | NOT NULL, default false | current pause state |
| `notes` | `text` | | |
| `created_at` | `timestamptz` | NOT NULL, default now() | |
| `updated_at` | `timestamptz` | NOT NULL, default now() | |

**data.json fields used:** `id`, `taskId`, `projectId`, `billable`, `startedAt`, `pausedAt`, `endedAt`, `durationSeconds`, `paused`, `notes`

**Constraint:** At most one active session per user (ended_at IS NULL).

**Used by:** TimerPage elapsed calc, ReportPage earnings, Dashboard today/week totals.

---

## Enums (PostgreSQL `CREATE TYPE`)

```sql
CREATE TYPE urgency_level AS ENUM ('urgent', 'high', 'normal', 'low');
CREATE TYPE task_status   AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE project_color AS ENUM ('teal', 'amber', 'rose', 'indigo');
CREATE TYPE project_status AS ENUM ('active', 'paused', 'completed', 'archived');
```

---

## Indexes

```sql
-- Hot paths from component queries
CREATE INDEX idx_tasks_user_project  ON tasks(user_id, project_id);
CREATE INDEX idx_tasks_user_status   ON tasks(user_id, status);
CREATE INDEX idx_sessions_user_ended ON sessions(user_id, ended_at);
CREATE INDEX idx_sessions_task       ON sessions(task_id);
CREATE INDEX idx_projects_user       ON projects(user_id);
CREATE INDEX idx_clients_user        ON clients(user_id);

-- Active session lookup (TimerPage)
CREATE UNIQUE INDEX idx_sessions_active_user
  ON sessions(user_id)
  WHERE ended_at IS NULL;
```

---

## Key Computed Values

These are calculated at query time, not stored:

| Metric | Query | Used in |
|--------|-------|---------|
| Today tracked seconds | `SUM(duration_seconds) WHERE ended_at >= today_start` | Dashboard |
| Week tracked seconds | `SUM(duration_seconds) WHERE ended_at >= week_start` | Dashboard |
| Week billable earnings | `SUM((hourly_rate_cents * duration_seconds) / 3600) WHERE billable = true` | Dashboard |
| Project completion % | `COUNT(*) FILTER (WHERE status='done') / COUNT(*)` | Dashboard |
| Session elapsed (active) | `duration_seconds + EXTRACT(EPOCH FROM now() - started_at)` | TimerPage |

---

## Migration from data.json

`data.json` field → DB column mappings for seeding:

| data.json | Table.column | Transform |
|-----------|-------------|-----------|
| `user.createdAt` | `users.created_at` | ms → timestamptz |
| `clients[].hourlyRate` | `clients.hourly_rate_cents` | `value * 100` |
| `projects[].clientId` | `projects.client_id` | string → uuid |
| `tasks[].projectId` | `tasks.project_id` | string → uuid |
| `tasks[].dateRange.startDate` | `tasks.start_date` | ms → timestamptz |
| `tasks[].dateRange.dueDate` | `tasks.due_date` | ms → timestamptz |
| `tasks[].dateRange.completedAt` | `tasks.completed_at` | ms → timestamptz |
| `sessions[].taskId` | `sessions.task_id` | string → uuid |
| `sessions[].projectId` | `sessions.project_id` | string → uuid |
| `sessions[].startedAt` | `sessions.started_at` | ms → timestamptz |
| `sessions[].endedAt` | `sessions.ended_at` | ms → timestamptz, null if 0 |

---

## Future Tables (Phase 2)

| Table | Purpose |
|-------|---------|
| `pomodoro_configs` | Per-user timer settings (duration, break length) |
| `weekly_reports` | Cached report snapshots |
| `calendar_integrations` | Google Calendar OAuth tokens |
| `invoices` | Generated invoices per client/period |
| `tags` | Normalized tag table (replace text[]) |

---

**Last updated:** 2026-04-28
