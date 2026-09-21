# Flowmate / Kettles — Claude Code Guide

> Brand is **Kettles**, codebase is **Flowmate**. Both names are live; don't "fix" one to the other.
> Product summary + locked decisions: [`Docs/system.md`](Docs/system.md)
> Edge function patterns: [`supabase/functions/CLAUDE.md`](supabase/functions/CLAUDE.md)
> This file and [`AGENTS.md`](AGENTS.md) are kept identical — edit both.

## Stack

- **Framework:** Next.js 14.2.4 (App Router, `"use client"` where interactive)
- **Desktop:** Tauri v2 (Windows) in `src-tauri/` — tray, global shortcuts, idle detection, pet overlay, agent bridge
- **Auth + DB:** Supabase (auth, postgres, edge functions)
- **State:** Zustand via `src/lib/store-supabase.ts`
- **Styling:** Tailwind CSS v3 + CSS variables in `src/app/globals.css`
- **Icons:** Custom SVG components in `src/components/ui/icon.tsx`
- **Tests:** Vitest, `environment: "node"`, `src/**/*.test.ts` only. **No jsdom — do not write component tests.**

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/store-supabase.ts` | Primary Zustand store — tasks, projects, sessions, clients, agent runs |
| `src/lib/supabase.ts` | Supabase client + `api` helper functions |
| `src/lib/sync-engine.ts` | Offline mutation queue + reconnect flush |
| `src/lib/types.ts` | All shared TypeScript types |
| `src/lib/format.ts` | `formatDuration`, `formatDate`, `uid()` |
| `src/lib/task-dates.ts` | Date logic for tasks/scheduling |
| `src/lib/desktop.ts` | Tauri bridge — `isDesktop()`, `invoke()`, `listen()`, mini mode, tray, notifications |
| `src/lib/idle-recovery.ts` | Idle gap detection + recovery prompts |
| `src/lib/session-timeline.ts` | Pure session segment math (pauses, idle, agent time) |
| `src/lib/agent-runs.ts` | AI agent segments. Pure module — do not import the store into it |
| `src/lib/report/data.ts` | Report aggregation + billing math |
| `src/lib/rates.ts` | Project billing rates |
| `src/lib/pet.ts`, `pet-context.ts` | Pet overlay state + moment selection |
| `src/lib/mascot-custom.ts` | User-uploaded mascot — v1 contract, validation, generation prompt. Atlas lives in its own localStorage key, never in `preferences` |
| `src/components/AppShell.tsx` | Root provider wrapper |
| `src/components/DesktopShell.tsx` | Desktop-only chrome, idle recovery, tray sync |
| `src/components/Sidebar.tsx` | Main nav — **add new routes here** |
| `src/app/globals.css` | CSS design tokens (`--accent`, `--text-*`, `--surface-*`, `--border-*`) |
| `src-tauri/src/lib.rs` | Tauri commands, tray, windows, idle poll |
| `src-tauri/src/agent_bridge.rs` | Loopback agent presence server (`127.0.0.1:41999`–`42010`) |
| `src-tauri/src/pet.rs` | Pet overlay window |
| `Docs/agent-tracking-plan.md` | AI agent tracking spec. **Read in full before any work touching idle detection, the agent bridge, or `agentSegments`.** |

## Routes

```
/                   → marketing landing (src/app/(marketing)/page.tsx)
/auth               → login/signup
/auth/callback      → Supabase OAuth callback
/onboarding         → new user setup
/dashboard          → main dashboard
/tasks              → task list + kanban
/projects           → project list
/projects/view?id=  → project detail + workspace (query param, NOT a [id] segment)
/timer              → Pomodoro timer + session history
/reminders          → reminder agent
/report             → time tracking analytics + export/share
/calendar           → 7/14-day calendar view
/settings           → preferences, desktop, pet
/share?token=       → public read-only shared report
```

## Store API (src/lib/store-supabase.ts)

```typescript
// state
useApp((s) => s.tasks)          // Task[]
useApp((s) => s.projects)       // Project[]
useApp((s) => s.clients)        // Client[]
useApp((s) => s.sessions)       // Session[]
useApp((s) => s.activeSessionId)
useApp((s) => s.agentRuns)      // Record<string, AgentSegment>

// CRUD — all async, all return promises
addTask / updateTask / deleteTask / archiveTask / restoreTask / setTaskStatus
addProject / updateProject / deleteProject / archiveProject / restoreProject
addClient / updateClient / deleteClient

// sessions — note the signatures
startSession(taskId, billable?, estimateMinutes?)
startDraftSession(projectId?, billable?, estimateMinutes?)
pauseSession()            // no args
resumeSession()
stopSession()             // no args — stops the active session
discardSession()
addManualSession({...}) / updateManualSession(id, {...})

// loading
loadAll() / loadTasks() / loadProjects() / loadClients() / loadSessions()
```

## Conventions

- State always from `useApp()` — never fetch Supabase directly in components
- New pages: `src/app/<route>/page.tsx` + nav entry in `Sidebar.tsx`. A route with no nav entry isn't done
- New components: `src/components/MyComponent.tsx`, `"use client"` if interactive
- Colors: CSS vars (`--accent`, `--surface-2`, …), never hardcoded hex, never `#000`
- Icons: add to `src/components/ui/icon.tsx`. No external icon libs, no emojis in UI
- Auth guard: wrap protected pages with `<AuthGuard>`
- Loading states: `<KettleLoader>` (branded spinner)
- Layout: compose `PageLayout` / `PageHeader` / `PageToolbar` / `PageContent` from `src/components/layout/`
- Desktop code paths: guard with `isDesktop()` from `src/lib/desktop.ts` — the same components render on web
- New Tauri command → register it in the `invoke_handler` in `src-tauri/src/lib.rs` or it silently 404s

## Dev Commands

```bash
npm run dev                  # localhost:3000
npm run build                # production build
npm run lint                 # ESLint
npm test                     # vitest run
npm run tauri:dev            # desktop dev (rebuilds Rust)
npm run tauri:build          # desktop installer
npm run deploy:functions     # deploy all edge functions
npm run check:stable-version # package.json / lock / tauri.conf.json version match
npm run validate:pet         # pet atlas geometry vs live config
```

## Docs

| Doc | Covers |
|-----|--------|
| [`Docs/system.md`](Docs/system.md) | Product summary, locked decisions |
| [`Docs/design.md`](Docs/design.md) | Design system — tokens, type scale, motion |
| [`Docs/LAYOUT_TOKEN_REFERENCE.md`](Docs/LAYOUT_TOKEN_REFERENCE.md) | Layout components + spacing tokens |
| [`Docs/agent-tracking-plan.md`](Docs/agent-tracking-plan.md) | Agent tracking spec (mandatory read, see above) |
| [`Docs/agent-hooks.md`](Docs/agent-hooks.md) | Agent bridge hook wiring |
| [`Docs/release.md`](Docs/release.md) | Web + desktop release channels |
| [`Docs/pet-design-system.md`](Docs/pet-design-system.md) | Pet rules — moments, budget, animation vocabulary, tokens. **Read before any pet change.** |
| [`Docs/pet-mascot-kit.md`](Docs/pet-mascot-kit.md) | Pet sprite contract; kit assets in `Docs/pet-kit/` |
| [`Docs/marketing/`](Docs/marketing/) | Landing PRD, brand assets, build brief |

There is **no database schema doc** — the old one drifted and was deleted. Source of truth is
`supabase/migrations/` plus the edge functions. Sessions persist through a `data` JSONB column
that the edge function **shallow**-merges: send complete arrays, not partial ones.

## Current State (August 2026)

- Version 1.1.2. Web on Vercel, desktop shipped as a self-updating Windows installer
- Edge functions live: `sessions`, `tasks`, `projects`, `clients`, `analytics`, `report-shares`, `google-calendar`
- Auth: email + Sign in with Google (PKCE, openid/email/profile only)
- Google Calendar overlay is built and parked (`GOOGLE_CALENDAR_ENABLED = false`) until brand verification
- Desktop: tray, global shortcuts, notifications, idle detection + recovery, auto-update. "Mini mode" hides the main window and leaves the pet overlay on top — there is no separate mini-timer window
- Agent tracking M1 shipped — loopback bridge suppresses idle auto-pause while an agent lease is open
- Reports: filters, KPIs, charts, PDF/Excel export, shareable public links, project billing rates
- Pet overlay: Tauri window driven by `public/pet/`, sprite atlas in `public/pet/assets/`
- Theme: dark/light, persisted to localStorage. Preferences sync across devices
- Legal: public Privacy Policy and Terms at `/legal/privacy` and `/legal/terms`
