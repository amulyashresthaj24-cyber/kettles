# Flowmate — Codex Guide

> Product summary + design decisions: [`Docs/system.md`](Docs/system.md)
> Edge function patterns: [`supabase/functions/AGENTS.md`](supabase/functions/AGENTS.md)

## Stack

- **Framework:** Next.js 14.2.4 (App Router, `"use client"` where interactive)
- **Auth + DB:** Supabase (auth, postgres, edge functions)
- **State:** Zustand via `src/lib/store-supabase.ts` (replaces old localStorage store)
- **Styling:** Tailwind CSS v3 + CSS variables in `src/app/globals.css`
- **Icons:** Custom SVG components in `src/components/ui/icon.tsx`

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/store-supabase.ts` | Primary Zustand store — tasks, projects, sessions, clients |
| `src/lib/supabase.ts` | Supabase client + `api` helper functions |
| `src/lib/types.ts` | All shared TypeScript types |
| `src/lib/format.ts` | `formatDuration`, `formatDate`, `uid()` |
| `src/lib/task-dates.ts` | Date logic for tasks/scheduling |
| `src/components/AppShell.tsx` | Root provider wrapper |
| `src/components/Sidebar.tsx` | Main nav |
| `src/app/globals.css` | CSS design tokens (--accent, --text-*, --surface-*, --border-*) |
| `supabase/functions/projects/index.ts` | Edge function: project CRUD |
| `supabase/functions/tasks/index.ts` | Edge function: task CRUD |

## Routes

```
/                   → landing / redirect
/auth               → login/signup
/auth/callback      → Supabase OAuth callback
/onboarding         → new user setup
/dashboard          → main dashboard
/tasks              → task list + kanban
/projects           → project list
/projects/[id]      → project detail + workspace
/timer              → Pomodoro timer + session history
/report             → time tracking analytics
/calendar           → 7/14-day calendar view
```

## Store API (src/lib/store-supabase.ts)

```typescript
useApp((s) => s.tasks)                    // Task[]
useApp((s) => s.addTask({...}))          // create
useApp((s) => s.updateTask(id, {...}))   // update
useApp((s) => s.deleteTask(id))          // delete

useApp((s) => s.projects)               // Project[]
useApp((s) => s.clients)                // Client[]

useApp((s) => s.startSession(taskId))   // start Pomodoro
useApp((s) => s.stopSession(sessionId)) // stop Pomodoro
useApp((s) => s.activeSessionId)        // current session
```

## Conventions

- State always from `useApp()` — never fetch Supabase directly in components
- New pages: `src/app/<route>/page.tsx` + add nav link in `Sidebar.tsx`
- New components: `src/components/MyComponent.tsx` with `"use client"` if interactive
- Colors: use CSS vars (`--accent`, `--surface-2`, etc.), not hardcoded hex
- Icons: add to `src/components/ui/icon.tsx`, don't import external icon libs
- Auth guard: wrap protected pages with `<AuthGuard>`
- Loading states: use `<KettleLoader>` (branded spinner)

## Dev Commands

```bash
npm run dev     # localhost:3000
npm run build   # production build
npm run lint    # ESLint
```

## Current State (May 2026)

- Auth: Supabase email + OAuth, onboarding flow complete
- Storage: migrated from localStorage → Supabase (store-supabase.ts is live)
- Edge functions: projects + tasks deployed
- Layout: standardized with PageLayout/PageToolbar/PageContent/PageHeader components
- Theme: dark/light, persisted to localStorage
