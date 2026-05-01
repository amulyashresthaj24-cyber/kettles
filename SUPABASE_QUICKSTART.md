# Flowmate Supabase Quickstart

## Overview

Your Flowmate app will use:
- **PostgreSQL JSONB columns** for flexible entity storage
- **5 Edge Functions**: `clients`, `projects`, `tasks`, `sessions`, `analytics`
- **RLS policies** for data security
- **Zustand + Supabase** for state management

## Entity Relationship

```
users (auth)
  ├── clients (JSONB: name, email, hourlyRate, etc.)
  ├── projects (JSONB: name, description, color, billable, etc.)
  │     └── linked to client (optional)
  ├── tasks (JSONB: title, urgency, status, tags, etc.)
  │     └── linked to project (required)
  └── sessions (JSONB: notes, paused)
        ├── linked to task (optional)
        └── linked to project (optional)
```

## JSONB Data Structure

| Entity | JSONB Fields | Dedicated Columns |
|--------|-------------|-------------------|
| clients | name, email, hourlyRate, currency, address, phone, notes | id, user_id |
| projects | name, description, color, billable, status, startDate, endDate, budget, tags | id, user_id, client_id |
| tasks | title, description, urgency, status, estimateMinutes, actualMinutes, assignees, tags, dateRange | id, user_id, project_id |
| sessions | notes, paused | id, user_id, task_id, project_id, started_at, ended_at, duration_seconds, billable |

## Setup Commands

### 1. Install Supabase CLI
```bash
npm install -g supabase
supabase login
```

### 2. Initialize Project
```bash
cd c:\Users\amuly\Documents\Work\Flowmate
supabase init
supabase link --project-ref YOUR_PROJECT_ID
```

### 3. Apply Database Schema
```bash
# Create migration
supabase migration new initial_schema

# Copy the SQL from SUPABASE_MIGRATION_GUIDE.md Phase 1.1
# into supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql

# Deploy
supabase db push
```

### 4. Deploy Edge Functions
```bash
supabase functions deploy clients
supabase functions deploy projects
supabase functions deploy tasks
supabase functions deploy sessions
supabase functions deploy analytics
```

### 5. Set Secrets
```bash
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
supabase secrets set SUPABASE_ANON_KEY=YOUR_ANON_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## Environment Variables (Next.js)

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
```

## Edge Function Endpoints

| Function | Methods | Endpoints |
|----------|---------|-----------|
| clients | GET, POST, PUT, DELETE | `/functions/v1/clients` (list), `/functions/v1/clients/:id` (single) |
| projects | GET, POST, PUT, DELETE | `/functions/v1/projects`, `/functions/v1/projects/:id` |
| tasks | GET, POST, PUT, DELETE | `/functions/v1/tasks`, `/functions/v1/tasks/:id` |
| sessions | GET, POST, PUT, DELETE | `/functions/v1/sessions`, `/functions/v1/sessions/:id` |
| analytics | GET | `/functions/v1/analytics?type=dashboard`, `/functions/v1/analytics?type=projects` |

## API Response Format

All Edge Functions return:
```typescript
// List endpoints
{ [entityName]: [{ id, user_id, data: {}, created_at, updated_at }] }

// Single item endpoints  
{ id, user_id, data: {}, created_at, updated_at }

// Delete
{ success: true }

// Error
{ error: string }
```

## Required Files to Create

When you provide credentials, I'll create:

1. **Database**: Migration SQL + seed data (optional)
2. **Edge Functions**:
   - `supabase/functions/_shared/supabase.ts`
   - `supabase/functions/_shared/cors.ts`
   - `supabase/functions/_shared/validators.ts`
   - `supabase/functions/clients/index.ts`
   - `supabase/functions/projects/index.ts`
   - `supabase/functions/tasks/index.ts`
   - `supabase/functions/sessions/index.ts`
   - `supabase/functions/analytics/index.ts`
3. **Frontend**:
   - `src/lib/supabase.ts` - Client + API helper
   - `src/lib/store-supabase.ts` - Updated Zustand store
   - `src/lib/auth.tsx` - Auth provider

## What You Need to Provide

1. **Supabase Project ID** (from dashboard URL)
2. **Project URL** (e.g., `https://xxxxxx.supabase.co`)
3. **Anon Key** (public, safe for frontend)
4. **Service Role Key** (private, server-side only)

Find these in: Supabase Dashboard → Project Settings → API

---

Ready when you are! Share your Supabase credentials and I'll implement everything.
