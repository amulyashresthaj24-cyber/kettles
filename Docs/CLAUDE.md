# FlowMast — Development Guide

**Unified Productivity OS for Solo Workers**

Task-linked time tracking, project planning, calendar integration, and Pomodoro-based deep work for solo freelancers. Built with Next.js 14, React 18, Zustand, Tailwind CSS.

> **Design Reference:** See [design.md](./design.md) for visual system, components, themes, and UX guidelines.

## Stack

- **Framework:** Next.js 14.2.4 (App Router)
- **State:** Zustand (persisted to localStorage)
- **Styling:** Tailwind CSS v3 + custom CSS variables (dark/light theme)
- **UI:** Custom components (see design.md for system)
- **Icons:** Custom SVG Icon components

---

## PRD: FlowMast System Overview

### Product Vision

FlowMast eliminates tool fragmentation by combining **project → task → schedule → focus → time tracking** into a single workflow, turning daily execution into measurable, revenue-aligned insights.

**Core Differentiator:** Not just managing tasks—but connecting **time, execution, and outcomes** into a feedback loop that drives both productivity and income clarity.

### System Flow (MVP)

```
Project Creation
    ↓
Task Breakdown
    ↓
Calendar Time Blocking
    ↓
Pomodoro Focus Session
    ↓
Automatic Time Tracking
    ↓
Analytics & Insights
    ↓
Revenue Alignment
```

### Core Goals

- **Reduce tool-switching** by 5–7 hours per week
- **Increase task completion** to 90%+
- **Enable visibility** into time spent per project and earnings efficiency
- **Improve consistency** of time-blocking and deep work habits
- **Reduce burnout** by aligning workload with realistic scheduling

### Primary Users

1. **Freelancers / Solo Professionals** — manage multiple clients, track billable vs non-billable time
2. **Indie Makers / Builders** — juggle product development, marketing, and operations
3. **Consultants / Coaches** — structured scheduling and session tracking

### Key Use Cases

| Use Case | Flow |
|----------|------|
| **Project Planning** | Create project → add tasks → assign deadlines → visualize workload |
| **Daily Time Blocking** | Select tasks → auto-schedule into calendar → adjust manually |
| **Focus Execution** | Start Pomodoro → system tracks time automatically → log to task |
| **Time Tracking & Insights** | View time per project → compare against revenue → identify inefficiencies |
| **Meeting + Task Sync** | Calendar events ↔ task creation → seamless time tracking |

### MVP Feature Set

- ✅ Projects with metadata (client, deadline, priority, color tags)
- ✅ Tasks with statuses (To Do, In Progress, Done), estimates, due dates
- ✅ Pomodoro timer linked to tasks with auto time-logging
- ✅ Basic time tracking per task/project
- ✅ Manual calendar view and scheduling
- ✅ Client & project filtering
- ✅ Dark/light theme
- 🔄 Calendar integration (Google Calendar 2-way sync) — Phase 2
- 🔄 Auto-scheduling based on deadlines — Phase 2
- 🔄 Revenue tracking + hourly rate analytics — Phase 2

### Success Metrics

- **Engagement:** Daily active usage, avg. focus sessions per day
- **Productivity:** Task completion rate >90%, planned vs actual time accuracy
- **Retention:** Weekly active users, 30-day retention rate
- **Value:** Time saved per week, increase in tracked billable hours

---

## Problem Statement

Solo workers juggling multiple clients (freelancers, contractors, consultants) cannot trust that their logged time maps to actual work. They switch between client portals, tools, and notifications so frequently that by day's end, they can't answer: "How much time did I actually spend on Client A vs. Client B?"

This creates three cascading problems:
1. **Underbilled hours** — they can't prove time spent, so they either don't bill or undercharge
2. **Misspent effort** — they think they worked 20 hours on their own startup but actually worked 12 (distraction tax invisible)
3. **Broken self-trust** — productivity feels like acting, not real work

The status quo: paper notes + Todoist + Google Calendar + Toggl + Slack. Fragmented. Untrustworthy. Manual.

---

## Demand Evidence

**Primary user:** A remote freelancer with 2+ clients, no internal accountability, juggling tasks across different client portals.

**Observed pain:**
- Starts day with tasks from Client A (day shift) and Client B (night shift)
- Switches between client portals, loses track of which task belongs to whom
- At end of week, cannot answer "how many billable hours for each client?"
- Current workaround: paper notes + manual time entry + distrust of the numbers

**User quote:** *"I look productive, but the time taken is like I'm acting. If there was a solution where I could assign a task and work and track it, it could be perfect."*

**Market signal:** User is actively looking for a solution and would pay for something that solves this (not yet committed, but interested enough to discuss the problem repeatedly).

---

## Status Quo

**Current workflow:**
1. Morning: writes tasks on paper, assigns deadlines manually
2. During work: sets Pomodoro timer on laptop (not linked to tasks)
3. When timer goes off: doesn't remember which task the timer was for
4. End of day: tries to sync paper notes with Todoist; tasks and times don't match
5. End of week: manually extracts hours per client from fragmented logs (or gives up and guesses)

**Cost:** Hours wasted context-switching between tools, plus loss of billable time due to inability to track accurately.

**Consequence if nothing changes:** Continues to underbill, can't see productivity patterns, doesn't trust their own time.

---

## Target User & Narrowest Wedge

**Ideal user:** Remote freelancer with 2+ simultaneous clients, no manager oversight, working across fragmented task management systems (different portals per client).

**Narrowest wedge:** A timer that forces you to pick ONE task, locks in the time against that task, and generates a weekly report showing hours per client.

**What solves the pain:** Task-linked time tracking. Not willpower enforcement ("don't context-switch"). Not task management. Just: **pick a task, timer runs, time locks to the task, report shows what actually happened.**

---

## Constraints

- **Timeline:** Ship MVP in 2-3 weeks
- **Validation:** Test with founder (self) + freelancer friend + 2-3 similar users before scaling
- **Tech:** Next.js monolith (full control, easy iteration)
- **Distribution:** Web app (no mobile initially; browser-based timer is sufficient)
- **Scope:** Minimum viable — task inbox, Pomodoro timer, weekly report. No integrations yet.

---

## Premises

1. **Your freelancer friend is the wedge customer** — multi-client remote worker who can't trust their time allocation
2. **The core pain is trust friction** (can't verify time maps to reality) + manual friction (forgets to log)
3. **The wedge product is task-linked time tracking** — pick a task, timer runs, time locks to task, weekly report shows hours per client
4. **The defensibility is the ledger** — once it becomes the source of truth for income, it's sticky
5. **The market window is now** — remote work is standard, freelancing is rising, existing tools are fragmented
6. **You're the first user** — this solves YOUR problem first; validation comes through your friend + 2-3 others
7. **The product ships as a web app** (not mobile-first)
8. **Initial feature set is narrow** — task inbox + Pomodoro timer + weekly report
9. **You'll validate with 5-10 early users** before scaling to larger markets

---

## Approaches Considered

### Approach A: Monolith First (CHOSEN)
**Next.js full-stack, single deploy, browser-based timer, simple database schema.** Fastest to validation. You own everything. Ship in 2-3 weeks.

**Why chosen:** You need full control to iterate based on early user feedback. Testing with 5-10 people before scaling justifies the monolith approach.

### Approach B: Modular from Day One
**Separate services (tasks, timer, reporting). Microservices architecture.** Future-proof but slower to ship (4-5 weeks).

**Why not chosen:** You don't know yet if the core hypothesis (task-linked time = trust) is correct. Premature architecture.

### Approach C: Outsource the Hard Parts
**Supabase + Trigger.dev + Stripe. Minimal backend code.** Fastest to ship (1-2 weeks) but third-party dependencies.

**Why not chosen:** You want full control for early iteration and testing.

---

## Recommended Approach: Monolith First (Next.js)

### Architecture

**Tech stack:**
- Frontend: Next.js (App Router), React, Tailwind CSS
- Backend: Next.js API routes, Node.js
- Database: PostgreSQL (local dev), or Postgres hosted (e.g., Railway, Render)
- Auth: NextAuth.js (simple session-based, no OAuth required initially)
- Timer: Browser-based (JavaScript) with server-side fallback for persistence

**Database schema (minimal):**
```
users (id, email, password_hash, created_at)
tasks (id, user_id, client_id, title, description, created_at)
clients (id, user_id, name, hourly_rate, created_at)
pomodoros (id, user_id, task_id, duration_minutes, start_time, end_time, status)
weekly_reports (id, user_id, week_start, week_end, generated_at)
  → computed from pomodoros table
```

**Key design decision:** Timer state lives in the database, not just the browser. If the user closes the tab mid-Pomodoro, the next time they open the app, the timer resumes (or marks the session as incomplete). This solves the "did my work get lost?" anxiety.

### Feature Set: MVP

**1. Task Inbox**
- Add task (title, description, client, estimated time)
- Assign task to a client
- Mark task as "to do," "in progress," or "done"
- No external integrations yet — manual entry only

**2. Pomodoro Timer**
- User picks a task from the inbox
- Clicks "Start Focus Session"
- Timer runs for 25 minutes (configurable, but default 25)
- Browser tab title updates to show remaining time (user can see it even when tab is not focused)
- When timer ends: browser notification + sound + redirect to "session complete" screen
- User confirms: "Did you work the full 25 minutes?" (yes/no)
  - If yes: time is locked to the task, marked as "completed"
  - If no: user can adjust the actual time spent (5 min, 10 min, etc.)

**3. Weekly Report**
- Automatically generated every Sunday at midnight
- Shows:
  - Hours spent per client (total + breakdown by task)
  - Total billable hours (based on hourly rate per client)
  - Distraction time (time logged that wasn't assigned to a task)
  - Productivity patterns (when did you work most)
- Exportable as PDF or shareable link
- Historical reports (user can view past weeks)

---

## Distribution Plan

**Initial (MVP):**
- Self-hosted instance (you run it locally or on a cheap VPS)
- Share login with your friend + 2-3 testers
- No public signup yet

**After validation (Week 4+):**
- Deploy to Railway or Render (simple, low-cost)
- Create a public landing page (basic HTML, link to signup)
- Share link with your friend to invite others
- Collect emails on waitlist if demand exceeds capacity

**No fancy growth mechanics yet.** Word-of-mouth from testers is your distribution.

---

## CI/CD Pipeline

**Minimal but functional:**
- GitHub Actions: run tests on every PR (if you write them)
- Automatic deploy on `main` branch to Railway/Render
- No manual deployments after initial setup

**Later:** add monitoring, error tracking (Sentry), analytics (Posthog).

---

## Tech Dependencies

**Required:**
- Node.js 18+
- PostgreSQL 14+
- npm/yarn

**Already familiar with?**
- Next.js (App Router)
- React
- Tailwind CSS
- Basic SQL

If any of these are new to you, allocate extra time for learning.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Timer state lost if user closes tab mid-session | Store timer state in database; resume on app load |
| User forgets to confirm session completion | Auto-confirm after 1 hour idle; send notification reminder |
| Database schema needs changes after launch | Document migration path; v1 has simple schema, easy to evolve |
| Early users churn because feature set is too minimal | Set expectations (beta); collect feedback weekly; iterate fast |

---

```
src/
  app/
    layout.tsx                 # Root layout + fonts
    globals.css               # Design tokens (--accent, --text-*, etc.)
    page.tsx                  # Tasks (list + calendar view)
    timer/page.tsx            # Active timer + history
    reports/page.tsx          # Stats by client
    clients/page.tsx          # CRUD clients
    projects/page.tsx         # CRUD projects
    projects/[id]/page.tsx    # Project detail
  components/
    AppShell.tsx              # Providers wrapper
    Sidebar.tsx               # Main nav + projects list
    Icon.tsx                  # All SVG icons
    Button.tsx                # Reusable button
    Badge.tsx                 # Tag component
    Pill.tsx                  # Filter pill
    Modal.tsx                 # Dialog
    Toast.tsx                 # Toast notifications
    ThemeProvider.tsx         # Dark/light toggle
    CalendarView.tsx          # 7-day + 14-day task calendar
    AddTaskController.tsx      # Add task modal state
    GlobalAddTaskModal.tsx     # Task creation form
  lib/
    store.ts                  # Zustand store (tasks/clients/projects/sessions)
    format.ts                 # formatDuration, formatCents, formatDate

.claude/
  CLAUDE.md                   # This file
  settings.json              # (optional) Claude Code overrides
```

## Key Features

- **Tasks:** Create, mark done, set priority (1-4), due date, estimate (minutes), client/project tags
- **Timer:** Start session on task, stop/pause, view history
- **Clients:** Add billable/internal clients with hourly rates
- **Projects:** Create projects with color tags, filter tasks by project
- **Reports:** Total tracked time, total earned (for billable clients), breakdown by client
- **Theme:** Dark/light mode, persisted to localStorage
- **Data:** All stored in localStorage via Zustand (no backend)

## Development

```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm start            # Run production build
npm run lint         # Run ESLint
```

## Design System

> **Complete design documentation:** See [design.md](./design.md) for color palettes, typography, spacing system, component specs, and responsive design guidelines.

### Quick Reference

- **Colors:** CSS variables in `globals.css` (--accent, --green, --red, --yellow, --text-*, --surface-*, --border-*)
- **Fonts:** Urbanist (headings), Inter (body), Geist Mono (code)
- **Spacing:** Tailwind defaults (4px base unit)
- **Themes:** Dark/light mode, persisted to localStorage
- **Animations:** Defined in `globals.css` (row-in, dialog-in, toast-in)

## Store API (src/lib/store.ts)

```typescript
useApp((s) => s.tasks)                    // All tasks
useApp((s) => s.addTask({...}))          // Create task
useApp((s) => s.updateTask(id, {...}))   // Edit task
useApp((s) => s.deleteTask(id))          // Delete task

useApp((s) => s.clients)                  // All clients
useApp((s) => s.addClient({...}))        // Create client

useApp((s) => s.projects)                 // All projects
useApp((s) => s.addProject({...}))       // Create project

useApp((s) => s.startSession(taskId))    // Start timer
useApp((s) => s.stopSession(sessionId))  // Stop timer
useApp((s) => s.activeSessionId)         // Current session ID
```

## Common Tasks

### Add new page

1. Create `src/app/route/page.tsx`
2. Use `useApp()` for state
3. Import components from `src/components/`
4. Sidebar link added in `Sidebar.tsx`

### Add new component

1. Create `src/components/MyComponent.tsx`
2. Use `"use client"` if interactive
3. Import types/hooks as needed

### Update theme

1. Edit colors in `src/app/globals.css`
2. Rebuild (or reload dev server)

### Deploy

Next.js static export for pure client-side, or deploy to Vercel.

## Notes

- All data stored locally (no server required)
- Theme toggle persisted to localStorage
- No authentication (solo freelancer use)
- Icons are custom SVG components (add to Icon.tsx)
- Animations in globals.css (row-in, dialog-in, toast-in)

---

**Last updated:** 2026-04-26  
**Status:** Production-ready

