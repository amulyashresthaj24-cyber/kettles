# FlowMate Codebase Overview

## Project Summary
**FlowMate** is a Next.js 14 web application for task-linked time tracking designed for solo workers. It combines project management (Kanban board, task lists), time tracking (Pomodoro timer), and analytics (weekly reports, calendar view).

**Tech Stack:**
- Frontend: React 18 + Next.js 14.2.4
- State Management: Zustand (with localStorage persistence)
- Styling: Tailwind CSS 3.4 + custom design tokens
- UI Components: Custom component library with shadcn-inspired patterns
- Icons: lucide-react
- Drag & Drop: @dnd-kit
- PDF Export: jspdf

---

## Cleanup Performed

### Removed Files & Directories
The following unnecessary files were removed to reduce repository bloat:

1. **Virtual Environments & Dependencies**
   - `.venv/` - Python virtual environment (not needed for Node.js project)
   - `node_modules/` - Reinstalled via `npm install` ✓

2. **Build Artifacts**
   - `.next/` - Next.js build cache
   - `tsconfig.tsbuildinfo` - TypeScript compile cache
   - `next-env.d.ts` - Auto-generated TypeScript definitions

3. **IDE & Analysis Artifacts**
   - `.claude/` - Claude editor cache
   - `.graphify_python` - Code analysis artifact
   - `.graphify_uncached.txt` - Analysis cache
   - `.gstack` - Stack analysis tool output

4. **Logs & Backups**
   - `dev.log` - Development log file
   - `src/components/Dashboard.tsx.restored` - Backup component

### Updated `.gitignore`
Created a comprehensive `.gitignore` that covers:
- Dependencies (node_modules, venv, etc.)
- Build artifacts (.next, dist, *.tsbuildinfo)
- IDE artifacts (.claude, .vscode, .idea)
- Environment files (.env.local)
- Logs (npm-debug.log, dev.log)
- Analysis artifacts (graphify, .gstack)
- OS files (Thumbs.db, .DS_Store)

---

## Project Structure

```
flowmate/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Root page (Tasks view)
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles
│   │   ├── dashboard/         # Dashboard page
│   │   ├── timer/             # Pomodoro timer page
│   │   ├── projects/          # Projects management page
│   │   ├── calendar/          # Calendar view page
│   │   └── report/            # Weekly analytics report page
│   │
│   ├── components/            # React components
│   │   ├── ui/                # Low-level UI components (button, card, modal, etc.)
│   │   ├── AppShell.tsx       # Root layout component (sidebar, navigation)
│   │   ├── Dashboard.tsx      # Dashboard overview
│   │   ├── KanbanBoard.tsx    # Kanban view for tasks
│   │   ├── TaskList.tsx       # List view for tasks
│   │   ├── TaskCard.tsx       # Individual task card
│   │   ├── AddTaskModal.tsx   # Create/edit task modal
│   │   ├── AddProjectModal.tsx# Create/edit project modal
│   │   ├── EditProjectModal.tsx
│   │   ├── CommandPalette.tsx # Command palette search
│   │   ├── ActiveSessionBanner.tsx  # Timer session display
│   │   ├── DatePicker.tsx     # Date selection component
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── ProjectTag.tsx     # Project tag display
│   │   ├── ClientBadge.tsx    # Client badge component
│   │   └── UrgencyDot.tsx     # Urgency indicator dot
│   │
│   └── lib/                   # Utility modules
│       ├── store.ts          # Zustand store (state management)
│       ├── types.ts          # TypeScript type definitions
│       ├── utils.ts          # Utility functions
│       └── format.ts         # Formatting & UID generation
│
├── public/                    # Static assets
├── Docs/                      # Documentation
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── postcss.config.mjs        # PostCSS configuration
├── next.config.mjs           # Next.js configuration
├── .eslintrc.json           # ESLint rules (auto-generated)
├── .gitignore               # Git ignore rules (updated)
├── README.md                # Project README
└── TODOS.md                 # Deferred tasks & features
```

---

## Core Data Types

### Task
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  urgency: "urgent" | "high" | "normal" | "low";
  status: "todo" | "in_progress" | "done";
  estimateMinutes?: number;
  tags?: string[];
  assignees?: string[];
  dateRange?: string;
  createdAt: number;
}
```

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  clientId?: string;
  color: "teal" | "amber" | "rose" | "indigo";
  billable: boolean;
  status?: "active" | "paused" | "completed" | "archived";
  startDate?: number;
  endDate?: number;
  budget?: number;
  tags?: string[];
}
```

### Session
```typescript
interface Session {
  id: string;
  taskId: string;
  projectId: string;
  billable: boolean;
  startedAt: number;
  endedAt?: number;
  durationSeconds: number;
  paused: boolean;
}
```

### Client
```typescript
interface Client {
  id: string;
  name: string;
  hourlyRate: number;
}
```

---

## State Management (Zustand Store)

The app uses a single Zustand store (`src/lib/store.ts`) with localStorage persistence:

**Core State:**
- `user` - User profile
- `clients` - List of clients
- `projects` - List of projects
- `tasks` - List of tasks
- `sessions` - Time tracking sessions
- `activeSessionId` - Currently running timer

**UI State:**
- `selectedProjectId` - Filter by project
- `selectedUrgency` - Filter by urgency

**Key Actions:**
- Task management: `addTask()`, `updateTask()`, `deleteTask()`, `setTaskStatus()`
- Project management: `addProject()`, `updateProject()`, `deleteProject()`
- Session management: `startSession()`, `pauseSession()`, `resumeSession()`, `stopSession()`
- Filtering: `setSelectedProject()`, `setSelectedUrgency()`

---

## Pages & Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `src/app/page.tsx` | Main tasks dashboard (Kanban/List view) |
| `/dashboard` | `src/app/dashboard/page.tsx` | Dashboard overview |
| `/projects` | `src/app/projects/page.tsx` | Project management |
| `/timer` | `src/app/timer/page.tsx` | Pomodoro timer interface |
| `/calendar` | `src/app/calendar/page.tsx` | Calendar view of tasks |
| `/report` | `src/app/report/page.tsx` | Weekly analytics & reporting |

---

## Build & Development

### Available Scripts
```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint (with Strict config)
```

### Current Build Status
✅ **Build succeeds** (9 static pages generated)  
⚠️ **4 ESLint warnings** (React Hook dependencies - non-critical)

---

## Known Issues & Deferred Tasks

See `TODOS.md` for detailed deferred work:

1. **DB Indexes** - Add composite indexes to `pomodoros` table for hot-path queries
2. **Session Confirmation Retry** - Add retry mechanism for critical session completion
3. **Sentry Integration** - Add error tracking before validation phase
4. **DESIGN.md System** - Extract design specification into standalone file

---

## Design System

The app uses custom Tailwind CSS configuration with design tokens for:

**Colors:**
- Base: `bg-base`
- Surfaces: `surface-raised`, `surface-mid`
- Text: `text-primary`, `text-muted`, `text-success`, `text-error`
- Semantic: Urgency colors (red, amber, green, gray)

**Spacing:** Uses `xs`, `sm`, `md`, `lg`, `xl`, `2xl` scales
**Typography:** Custom text size variants and weight utilities
**Components:** Buttons (primary, secondary, ghost variants), cards, modals, selects, badges

---

## Development Notes

- All components use `"use client"` directive (client-side rendering)
- State persists to localStorage automatically via Zustand middleware
- Drag-and-drop uses `@dnd-kit` for accessible drag operations
- CSS uses a combination of Tailwind + custom utility classes
- No database backend yet (future phase)

---

## Next Steps for Development

1. **Install dependencies** (if not already): `npm install` ✓
2. **Start development server**: `npm run dev`
3. **Review TODOS.md** for planned features
4. **Address ESLint warnings** (optional but recommended)
5. **Create DESIGN.md** from design specifications

