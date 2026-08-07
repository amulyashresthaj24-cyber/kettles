# Flowmate — Database Schema

Maps the legacy `data.json` seed → app code → the PostgreSQL schema running in production.

**Current state:** Live on Supabase Postgres. `clients`, `projects`, `tasks`, `sessions`,
`user_profiles`, and `report_shares` are deployed with RLS; see `supabase/migrations/`.
Zustand still persists `sessions`, `activeSessionId`, and `preferences` to localStorage,
but only as an offline cache and sync queue — Postgres is the source of truth.

The seed fixture now lives at `scripts/fixtures/data.json` (used by
`scripts/migrate-data.ts`). It was previously served publicly from `public/`.

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
| `hourly_rate_cents` | `integer` | NULL | project rate; overrides the client rate |
| `budget_cents` | `integer` | NOT NULL, default 0 | |
| `tags` | `text[]` | default `'{}'` | |
| `start_date` | `timestamptz` | | |
| `end_date` | `timestamptz` | | |
| `created_at` | `timestamptz` | NOT NULL, default now() | |
| `updated_at` | `timestamptz` | NOT NULL, default now() | |

**data.json fields used:** `id`, `name`, `description`, `clientId`, `color`, `billable`, `status`, `startDate`, `endDate`, `hourlyRate`, `budget`, `tags`, `createdAt`

**Rate resolution:** a project's own `hourlyRate` wins; otherwise the client rate applies; otherwise earnings are $0 (there is no default rate). The one implementation is `src/lib/rates.ts` on the client and `_shared/validators.ts → rateDollars()` in edge functions.

**Units:** JSONB `hourlyRate` / `budget` are dollars; the `*_cents` columns are cents and are divided by 100 on read. Sending `null` for either field clears it.

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

### `user_profiles`

Sourced from: `src/app/onboarding/page.tsx`, `store-supabase.ts → loadProfile()/saveProfile()`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default gen_random_uuid() | |
| `user_id` | `uuid` | FK → auth.users.id, **UNIQUE**, NOT NULL | one profile per user |
| `full_name` | `text` | | |
| `avatar_url` | `text` | | |
| `preferences` | `jsonb` | NOT NULL, default `'{}'` | all user settings; see below |
| `preferences_updated_at` | `timestamptz` | | last-write-wins clock across devices |
| `onboarding_completed` | `boolean` | default false | gates the `/onboarding` redirect |
| `onboarding_completed_at` | `timestamptz` | | |
| `created_at` / `updated_at` | `timestamptz` | default now() | `updated_at` via trigger |

**The UNIQUE on `user_id` is load-bearing.** Writes use
`upsert(row, { onConflict: "user_id" })`. Without both the constraint and the explicit
conflict target, PostgREST falls back to the primary key — which is generated per insert
and never conflicts — so every write appends a duplicate row instead of updating.
That bug shipped once and stranded completed users in an onboarding loop; it is fixed by
`20260808000000_user_profiles_unique.sql`.

**Reached via:** `api.profile` in `src/lib/supabase.ts` — direct table access under RLS,
not an edge function. Components must go through `useApp()`, never `api.profile` directly.

**`preferences` (jsonb).** One blob rather than a column per setting — the set is 14
fields, over half cosmetic (mascot, pet reminders, alarm sound), and columns would mean
a migration per toggle. Shape is `UserPreferences` in `src/lib/types.ts`; defaults live
in `DEFAULT_PREFERENCES` in `store-supabase.ts` and are merged over whatever the row
holds, so older rows missing newer keys are fine.

Sync model (`20260809000000_user_preferences.sql`):

- localStorage stays the **synchronous** source, so the timer has a value on first
  paint. The server only overrides it when `preferences_updated_at` is strictly newer.
- Writes are debounced ~800ms — Settings fires `setPreferences` per keystroke on the
  weekly-target number input — and flushed on `visibilitychange` / `pagehide`.
- Failed pushes leave `preferencesDirty` set in the persisted store and retry on the
  next edit or `loadProfile`.
- **Whole-object last-write-wins.** Edit device A offline, then edit device B, and A's
  edit is lost on reconnect. Acceptable for alarm sounds; it would not be for time
  entries, which is why sessions use the sync engine instead.

**Dropped:** `default_focus_duration`, folded into `preferences.defaultFocusDuration`.
It was written by onboarding and read by nothing, while the timer read a separate
localStorage value — so a user's onboarding choice was silently discarded.

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
| Week billable earnings | `SUM((effective_rate_cents * duration_seconds) / 3600) WHERE billable = true`, where effective rate = project rate ?? client rate ?? 0 | Dashboard, Report |
| Project completion % | `COUNT(*) FILTER (WHERE status='done') / COUNT(*)` | Dashboard |
| Session elapsed (active) | `duration_seconds + EXTRACT(EPOCH FROM now() - started_at)` | TimerPage |

---

## Migration from data.json

`data.json` field → DB column mappings for seeding:

| data.json | Table.column | Transform |
|-----------|-------------|-----------|
| `user.createdAt` | `users.created_at` | ms → timestamptz |
| `clients[].hourlyRate` | `clients.hourly_rate_cents` | `value * 100` |
| `projects[].hourlyRate` | `projects.hourly_rate_cents` | `value * 100`, null when unset |
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

| Table | Purpose | Status |
|-------|---------|--------|
| `invoices` | Generated invoices per client/period | Planned. Rate resolution (`rates.ts`) and report export (PDF/Excel) already exist |
| `calendar_integrations` | Google Calendar OAuth tokens | Planned. Needs a read-only vs two-way decision first |
| `weekly_reports` | Cached report snapshots | Not needed yet — reports compute fast enough live |
| `tags` | Normalized tag table (replace text[]) | Deferred. `tags?: string[]` exists on Task and Project but nothing reads it; normalizing an unused field is debt, not payoff |

**Dropped:** `pomodoro_configs` — superseded by `user_profiles.preferences`, which now
carries the full set (focus duration, weekly target, alarm sound, auto-break, mascot and
pet settings) and syncs across devices.

---

**Last updated:** 2026-08-07
