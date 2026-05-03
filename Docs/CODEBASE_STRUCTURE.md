# Flowmate - Codebase Structure

## Overview
Flowmate is a comprehensive task and project management application built with Next.js 14, React 18, Supabase, and Tailwind CSS. It enables users to organize projects, manage tasks with a Kanban board interface, track time with a timer, and generate analytics reports.

---

## Directory Structure

```
flowmate/
├── src/                          # Source code root
│   ├── app/                      # Next.js App Router pages
│   │   ├── auth/                 # Authentication page
│   │   │   └── page.tsx
│   │   ├── calendar/             # Calendar view page
│   │   │   └── page.tsx
│   │   ├── dashboard/            # Dashboard overview page
│   │   │   └── page.tsx
│   │   ├── projects/             # Projects management
│   │   │   ├── [id]/             # Dynamic project details route
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── report/               # Analytics & reporting
│   │   │   └── page.tsx
│   │   ├── tasks/                # Tasks list/archive view
│   │   │   └── page.tsx
│   │   ├── timer/                # Time tracking page
│   │   │   └── page.tsx
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout component
│   │   └── page.tsx              # Home page
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # Reusable UI primitives
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── select.tsx
│   │   │   └── textarea.tsx
│   │   ├── AddProjectModal.tsx   # Create/add project modal
│   │   ├── AddTaskModal.tsx      # Create/add task modal
│   │   ├── ActiveSessionBanner.tsx # Session status indicator
│   │   ├── AppShell.tsx          # Main app wrapper layout
│   │   ├── AuthGuard.tsx         # Authentication wrapper
│   │   ├── BrandMark.tsx         # Logo/branding component
│   │   ├── ClientBadge.tsx       # Client label display
│   │   ├── CommandPalette.tsx    # Quick command interface
│   │   ├── Dashboard.tsx         # Dashboard layout
│   │   ├── DatePicker.tsx        # Date selection component
│   │   ├── EditProjectModal.tsx  # Update project modal
│   │   ├── KanbanBoard.tsx       # Kanban board view (Todo/Doing/Done)
│   │   ├── ProjectDetailsCard.tsx # Project information display
│   │   ├── ProjectTag.tsx        # Project tag/badge
│   │   ├── ProjectWorkspace.tsx  # Project details workspace
│   │   ├── SessionCompleteModal.tsx # Session completion modal
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── TaskArchive.tsx       # Archived tasks view
│   │   ├── TaskCard.tsx          # Task display card
│   │   ├── TaskList.tsx          # Task list layout
│   │   └── UrgencyDot.tsx        # Urgency indicator
│   │
│   ├── lib/                      # Utility functions & logic
│   │   ├── auth.tsx              # Authentication context
│   │   ├── format.ts             # Data formatting utilities
│   │   ├── store-supabase.ts     # Supabase data store & API
│   │   ├── store.ts              # Zustand state management
│   │   ├── supabase.ts           # Supabase client config
│   │   ├── task-dates.ts         # Task date calculations
│   │   ├── types.ts              # TypeScript type definitions
│   │   └── utils.ts              # General utilities
│   │
│   └── hooks/                    # Custom React hooks
│       └── (custom hooks if needed)
│
├── supabase/                     # Supabase configuration & functions
│   └── functions/
│       ├── _shared/              # Shared utilities for functions
│       │   └── validators.ts     # Input validation logic
│       ├── clients/              # Client API endpoints
│       │   └── index.ts
│       ├── projects/             # Project API endpoints
│       │   └── index.ts
│       ├── sessions/             # Session API endpoints
│       │   └── index.ts
│       └── tasks/                # Task API endpoints
│           └── index.ts
│
├── public/                       # Static assets
├── scripts/                      # Build & utility scripts
│   ├── migrate-data.ts           # Database migration script
│   └── seed-dashboard-calendar-test-data.ts # Test data seeder
│
├── Docs/                         # Documentation
│   └── PROJECT_WORKSPACE_DESIGN.md
│
├── Documentation files (root)
│   ├── CODEBASE_OVERVIEW.md      # General codebase overview
│   ├── CODEBASE_STRUCTURE.md     # THIS FILE - Folder structure
│   ├── DEPLOYMENT_GUIDE.md       # Deployment instructions
│   ├── SUPABASE_MIGRATION_GUIDE.md
│   ├── SUPABASE_QUICKSTART.md
│   ├── README.md
│   ├── TODOS.md
│   └── Other design docs...
│
├── Configuration files (root)
│   ├── package.json              # NPM dependencies & scripts
│   ├── tsconfig.json             # TypeScript config
│   ├── next.config.mjs           # Next.js config
│   ├── tailwind.config.ts        # Tailwind CSS config
│   ├── postcss.config.mjs        # PostCSS config
│   ├── .eslintrc.json            # ESLint config
│   ├── .env.local                # Local environment variables
│   ├── .env.example              # Example env variables
│   └── .gitignore
│
└── .git/                         # Git repository

```

---

## Key Directories Explained

### `/src/app`
**Next.js App Router pages** - Each folder represents a route in the application.
- **auth/** - Login/authentication interface
- **dashboard/** - Main dashboard overview
- **projects/** - Project list and details views
- **tasks/** - Task archiving and management
- **calendar/** - Calendar-based task view
- **timer/** - Time tracking interface
- **report/** - Analytics and reports

### `/src/components`
**Reusable React components** - Organized by purpose.
- **ui/** - Atomic UI components (button, input, modal, etc.)
- **Feature components** - Domain-specific features (TaskCard, KanbanBoard, Sidebar, etc.)
- All components use memo() optimization where applicable for performance

### `/src/lib`
**Business logic and utilities**.
- **store-supabase.ts** - Main data store with Supabase integration
- **store.ts** - Zustand state management (derived from store-supabase)
- **auth.tsx** - Authentication context provider
- **types.ts** - Central type definitions for Tasks, Projects, Sessions, etc.
- **task-dates.ts** - Task date handling and calculations
- **supabase.ts** - Supabase client initialization
- **format.ts** - Data formatting helpers
- **utils.ts** - General utility functions

### `/supabase/functions`
**Backend API endpoints** - Cloudflare Workers executed via Supabase.
- **validators.ts** - Request validation (shared across all functions)
- **clients/** - Client management API
- **projects/** - Project CRUD operations
- **tasks/** - Task CRUD operations
- **sessions/** - Session/time-tracking operations

### `/scripts`
**Automation and setup scripts**.
- **migrate-data.ts** - Database schema migrations
- **seed-dashboard-calendar-test-data.ts** - Test data generation

---

## Important Type Definitions (`src/lib/types.ts`)

```typescript
// Core entities
- Task          // { id, title, description, status: 'todo'|'doing'|'done', ... }
- Project       // { id, name, description, clientId, ... }
- Session       // { id, startTime, endTime, taskId, ... }
- Client        // { id, name, email, ... }

// Status enums
- TaskStatus: 'todo' | 'doing' | 'done'
- Archive fields: archived (boolean), archivedAt (number)
```

---

## Data Flow Architecture

### Client-Side State Management
1. **Zustand Store** (`src/lib/store.ts`) - Global state for UI
2. **Supabase Store** (`src/lib/store-supabase.ts`) - Server-side data source
3. **Auth Context** (`src/lib/auth.tsx`) - User authentication state

### Server-Side API
1. **Supabase Functions** - RESTful API endpoints
2. **Database** - Supabase PostgreSQL with RLS policies
3. **Real-time Subscriptions** - Live data updates via Supabase

### Daily Task Archive
- **Trigger:** `loadAll()` called on app initialization
- **Function:** `performDailyArchive()` in store-supabase.ts
- **Logic:** Auto-archive tasks with `completedAt < today`
- **Tracking:** `lastDailyArchiveDate` prevents duplicate runs

---

## Component Optimization Patterns

### Memo Components
Used to prevent unnecessary re-renders during drag operations:
```typescript
// KanbanBoard.tsx
const KanbanColumn = memo(({ ... }) => { ... })
const SortableTaskCard = memo(({ ... }) => { ... })
```

### Hooks
- `useApp()` - Access global app state
- `useAuth()` - Get current user and auth methods
- Custom hooks for specific features

---

## Key Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| Next.js | Framework | 14.2.4 |
| React | UI library | 18.x |
| Supabase JS | Backend/Database | 2.105.1 |
| Zustand | State management | 4.5.2 |
| Tailwind CSS | Styling | 3.4.1 |
| @dnd-kit | Drag & drop | 6.3.1+ |
| Lucide React | Icons | 1.11.0 |

---

## Build & Scripts

```bash
# Development
npm run dev           # Start dev server on :3000

# Production
npm run build         # Type-check & build for production
npm start            # Run production server

# Code Quality
npm run lint         # Run ESLint for code quality
```

---

## File Naming Conventions

- **Pages:** `page.tsx` (Next.js convention)
- **Components:** PascalCase (e.g., `TaskCard.tsx`, `KanbanBoard.tsx`)
- **Utilities:** camelCase (e.g., `task-dates.ts`, `store.ts`)
- **UI Components:** Kebab-case directory in `ui/` (e.g., `confirm-dialog.tsx`)

---

## Database Schema Overview

### Tables (managed via Supabase)
- **tasks** - Task data with status, dates, archival info
- **projects** - Project metadata and organization
- **sessions** - Time-tracking sessions
- **clients** - Client information
- **task_tags** - Task categorization
- **users** - User profiles (via Supabase Auth)

All tables support:
- Created/Updated timestamps
- Soft deletes via `archived` boolean
- RLS (Row Level Security) policies

---

## Environment Setup

Required `.env.local` variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

See `.env.example` for all variables.

---

## Quick Navigation for AI/Developers

| Need | Location |
|------|----------|
| Add a new page | `src/app/[route]/page.tsx` |
| Create a UI component | `src/components/ui/[name].tsx` |
| Add business logic | `src/lib/[feature].ts` |
| Update type definitions | `src/lib/types.ts` |
| Create API endpoint | `supabase/functions/[resource]/index.ts` |
| Add validation | `supabase/functions/_shared/validators.ts` |
| Update styling | Component files or `src/app/globals.css` |
| Run database migration | `npm run ts-node scripts/migrate-data.ts` |

---

## Recent Changes (Latest Commit)

**Commit:** Add project workspace, task archive, and enhanced UI components
- ✅ Implemented project details & workspace features
- ✅ Added task archiving with automatic daily cleanup
- ✅ Enhanced Kanban board rendering with memo optimization
- ✅ Added checkbox & confirm dialog UI components
- ✅ Improved task management and date handling
- ✅ Updated backend validators and Supabase functions

---

## Notes for AI Assistants

1. **Before suggesting changes**, check `src/lib/types.ts` for current type definitions
2. **For state management**, review both `store.ts` and `store-supabase.ts`
3. **Component updates** should maintain memo() pattern for performance
4. **New Supabase functions** must include validation in `_shared/validators.ts`
5. **Database changes** should be scripted in `scripts/` for reproducibility
6. **Don't break existing pages** - check all usages before refactoring shared components

---

Last updated: 2026-05-03
