# FlowMast UI Screens — Detailed Specification

**Reworked MVP Screen Flow:**
1. Tasks (Kanban + Projects)
2. Timer (Sentence-based input)
3. Report (Calendar view)

Desktop-only MVP. Mobile shows "switch to desktop" banner.

---

## Navigation Structure

```
┌─────────────────────────────────────────────────────┐
│ Sidebar               │ Main Content                │
│                       │                             │
│ FlowMast              │ [Tab: Tasks] [Timer] [Report]│
│                       │                             │
│ Projects              │ Content area changes per tab│
│ ├─ 📁 Flowmast        │                             │
│ │   └─ Client: Cyan   │                             │
│ ├─ 📁 Client B Site   │                             │
│ │   └─ Client: ACME   │                             │
│ └─ 📁 Personal        │                             │
│     └─ (no client)    │                             │
│                       │                             │
│ [+ New Project]       │                             │
│                       │                             │
│ Filters               │                             │
│ ● All                 │                             │
│ ○ Urgent              │                             │
│ ○ High                │                             │
│ ○ Normal              │                             │
│ ○ Low                 │                             │
│                       │                             │
└─────────────────────────────────────────────────────┘
```

**Sidebar behavior:**
- Projects list is always visible
- Click project → filters tasks to that project only
- Urgency filter applies globally or per-project
- Client shown as subtitle under project (secondary info)

---

## Screen 1: Tasks (Kanban Board)

**Route:** `/` (default page)
**Purpose:** Create and manage tasks organized by project, view as kanban
**State:** Tasks + projects from Zustand store

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar           │ Tasks Tab                                   │
├───────────────────┼─────────────────────────────────────────────┤
│                   │                                             │
│ FlowMast          │ ┌── Filter Bar ─────────────────────────┐   │
│                   │ │ [All Projects ▼] [Urgency ▼] [+ Task] │   │
│ PROJECTS          │ └───────────────────────────────────────┘   │
│ ─────────────     │                                             │
│ 📁 Flowmast       │ Kanban Board:                               │
│   Client: Cyan    │                                             │
│ 📁 Client B Site  │ ┌── TO DO ────┐  ┌── IN PROGRESS ─┐  ┌── DONE ──┐│
│   Client: ACME    │ │             │  │                │  │          ││
│ 📁 Personal       │ │ ┌─────────┐ │  │ ┌─────────┐   │  │ ┌──────┐ ││
│   (no client)     │ │ │🔴 Design│ │  │ │🟡 Build │   │  │ │✓ Fix │ ││
│                   │ │ │landing  │ │  │ │timer UI │   │  │ │auth  │ ││
│ [+ New Project]   │ │ │Flowmast │ │  │ │Flowmast │   │  │ │bug   │ ││
│                   │ │ │[▶ Start]│ │  │ │[▶ Start]│   │  │ │      │ ││
│ URGENCY           │ │ └─────────┘ │  │ └─────────┘   │  │ └──────┘ ││
│ ─────────         │ │             │  │                │  │          ││
│ ● All             │ │ ┌─────────┐ │  │                │  │          ││
│ ○ 🔴 Urgent       │ │ │🟡 Write │ │  │                │  │          ││
│ ○ 🟡 High         │ │ │proposal │ │  │                │  │          ││
│ ○ 🟢 Normal       │ │ │ACME     │ │  │                │  │          ││
│ ○ ⚪ Low          │ │ │[▶ Start]│ │  │                │  │          ││
│                   │ │ └─────────┘ │  │                │  │          ││
│                   │ │             │  │                │  │          ││
│                   │ │ [+ Add Task]│  │                │  │          ││
│                   │ └─────────────┘  └────────────────┘  └──────────┘│
│                   │                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Task Card Anatomy

```
┌────────────────────────────────┐
│ 🔴 [urgent dot]               │  ← urgency color dot (top left)
│                                │
│ Design landing page            │  ← task title
│                                │
│ 📁 Flowmast   👤 Cyan Innov.  │  ← project tag + client badge
│                                │
│ Est: 90 min                    │  ← estimate (optional)
│                                │
│             [▶ Start Timer]    │  ← action button
└────────────────────────────────┘
```

**Urgency dot colors:**
- 🔴 Urgent — `#DC2626`
- 🟡 High — `#D97706`
- 🟢 Normal — `#16A34A`
- ⚪ Low — `#808080`

### Create Task (Inline Modal)

Triggered by [+ Add Task] in any column or [+ Task] in filter bar.

```
┌────────────────────────────────────────┐
│ New Task                               │
├────────────────────────────────────────┤
│ Title *                                │
│ ┌──────────────────────────────────┐   │
│ │ ________________________________ │   │
│ └──────────────────────────────────┘   │
│                                        │
│ Project *                              │
│ ┌──────────────────────────────────┐   │
│ │ [Select project ▼]               │   │
│ └──────────────────────────────────┘   │
│                                        │
│ Urgency                                │
│ ○ 🔴 Urgent  ○ 🟡 High               │
│ ● 🟢 Normal  ○ ⚪ Low                │
│                                        │
│ Estimate (optional)                    │
│ ┌──────────────────────────────────┐   │
│ │ ____ minutes                     │   │
│ └──────────────────────────────────┘   │
│                                        │
│ Description (optional)                 │
│ ┌──────────────────────────────────┐   │
│ │ ________________________________ │   │
│ └──────────────────────────────────┘   │
│                                        │
│ [Save Task]  [Cancel]                  │
└────────────────────────────────────────┘
```

### Create Project (Modal)

Triggered by [+ New Project] in sidebar.

```
┌────────────────────────────────────────┐
│ New Project                            │
├────────────────────────────────────────┤
│ Project Name *                         │
│ ┌──────────────────────────────────┐   │
│ │ ________________________________ │   │
│ └──────────────────────────────────┘   │
│                                        │
│ Client (optional)                      │
│ ┌──────────────────────────────────┐   │
│ │ [Select client or none ▼]        │   │
│ └──────────────────────────────────┘   │
│                                        │
│ Color Tag                              │
│ ● Teal  ● Amber  ● Rose  ● Indigo    │
│                                        │
│ Billable?                              │
│ ☑ Yes (inherit from client rate)       │
│ ☐ No (internal project)               │
│                                        │
│ [Save Project]  [Cancel]               │
└────────────────────────────────────────┘
```

**Client is secondary:** Project can exist without a client. Client assignment links project to billing/reporting.

### Components

| Component | Props | Notes |
|-----------|-------|-------|
| **KanbanBoard** | `tasks`, `onMove` | 3 columns: To Do, In Progress, Done. Drag-to-reorder within columns (v2). |
| **KanbanColumn** | `title`, `tasks`, `onAddTask` | Column header with count, task cards, add task button. |
| **TaskCard** | `task`, `onStart`, `onMove`, `onClick` | Title, urgency dot, project tag, client badge, estimate, Start button. |
| **UrgencyDot** | `urgency` | Colored dot: red/yellow/green/gray. |
| **ProjectTag** | `project` | Small pill with project color + name. |
| **ClientBadge** | `client` | Small gray badge. Secondary info. |
| **FilterBar** | `onFilterProject`, `onFilterUrgency` | Project dropdown, urgency dropdown, Add Task button. |
| **AddTaskModal** | `defaultColumn`, `onSave`, `onCancel` | Creates new task. |
| **AddProjectModal** | `onSave`, `onCancel` | Creates new project + optional client link. |

### States

| State | Column | UI |
|-------|--------|-----|
| **Empty board** | All | "No tasks. [+ Add Task] to start." Centered. |
| **Empty column** | One | Light gray dashed border: "+ Add task to To Do" |
| **Loading** | All | Skeleton cards, shimmer animation. |
| **Filtered (empty)** | All | "No tasks match this filter." Clear filter link. |

### Interactions

- **Click [▶ Start Timer] on task card:** Navigate to `/timer` with `taskId` preset in sentence input.
- **Click task card body:** Open task detail modal (edit title, urgency, project, estimate, description).
- **Drag task card between columns:** Update task status in Zustand. (v2 feature — v1: use status buttons on card.)
- **Click [+ Add Task] in column:** Open AddTaskModal with column status pre-selected.
- **Click project in sidebar:** Filter kanban to show only tasks in that project.
- **Click urgency filter:** Filter kanban to show only tasks matching urgency level.
- **Click [+ New Project]:** Open AddProjectModal.

### Data Flow

```
Zustand store (tasks, projects, clients)
    ↓
Apply project filter (from sidebar)
    ↓
Apply urgency filter (from filter bar)
    ↓
Group remaining tasks by status
    ↓
Render KanbanColumns (To Do / In Progress / Done)
```

### Edge Cases

| Case | Behavior |
|------|----------|
| Task has no project | Cannot create — project is required. |
| Project has no client | Show project normally. Client badge hidden on task card. |
| Task with 0 estimate | Show "No estimate" in gray. Allow start anyway. |
| Starting task while timer running | Warn: "Timer running on [other task]. Stop it first?" |
| Marking task done while timer running | Warn: "Session active. Finish session first?" |
| All tasks filtered out | Show empty state per-column: "No tasks match filter." |
| 20+ tasks in one column | Scroll within column. No pagination for MVP. |
| Long task title (>60 chars) | Truncate at 2 lines on card. Full title in detail modal. |

---

## Screen 2: Timer Tab

**Route:** `/timer`
**Purpose:** Start focus session using sentence-based input
**State:** Active session from Zustand. Projects + tasks from Zustand for autocomplete.

### Core Concept

Sentence-based input that creates a structured work declaration:

```
[Name] is working on [@task] from [@project] [$billing]
```

Where `[Name]` = user's name (preset, read-only). User fills in the rest.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar           │ Timer Tab                                   │
├───────────────────┼─────────────────────────────────────────────┤
│                   │                                             │
│ (same sidebar)    │                                             │
│                   │           FOCUS MODE                        │
│                   │                                             │
│                   │                                             │
│                   │  ┌─────────────────────────────────────────┐│
│                   │  │                                         ││
│                   │  │  Amulya is working on                   ││
│                   │  │  ┌──────────────────────────────┐       ││
│                   │  │  │ @Design landing page ×  [⌄]  │       ││  ← tokenized task
│                   │  │  └──────────────────────────────┘       ││
│                   │  │  from                                   ││
│                   │  │  ┌──────────────────────────────┐       ││
│                   │  │  │ @Flowmast ×  [⌄]             │       ││  ← tokenized project
│                   │  │  └──────────────────────────────┘       ││
│                   │  │  [$billable]                            ││  ← billing toggle
│                   │  │                                         ││
│                   │  └─────────────────────────────────────────┘│
│                   │                                             │
│                   │  ┌─ Control Bar ───────────────────────────┐│
│                   │  │                                         ││
│                   │  │   00 : 00 : 00          [▶ Start]       ││
│                   │  │   (HH:MM:SS)            (disabled)      ││
│                   │  │                                         ││
│                   │  └─────────────────────────────────────────┘│
│                   │                                             │
│                   │  — or pick from your tasks —               │
│                   │                                             │
│                   │  ┌─ Quick Pick ───────────────────────────┐ │
│                   │  │ 🔴 Design landing page  · Flowmast    [▶]│
│                   │  │ 🟡 Write proposal       · ACME        [▶]│
│                   │  │ 🟢 Build timer UI       · Flowmast    [▶]│
│                   │  └────────────────────────────────────────┘ │
│                   │                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Input System (Sentence Mode)

**Full input row layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  [User Name] is working on [          ] from [         ] [$bill] │
└──────────────────────────────────────────────────────────────────┘
                                                      [ 00:00:00 ]   [ ▶ Start ]
```

**Compact single-line version (alternate):**
```
[ Amulya is working on @task from @project $billable ]   [ 00:00:00 ]   [ ▶ Start ]
```

### Token Behavior

| Token | Trigger | Dropdown | Display |
|-------|---------|----------|---------|
| `@task` | Type `@` in task slot | Shows tasks from selected project (or all if no project). Filter as you type. | Blue pill: "Design landing page ×" |
| `@project` | Type `@` in project slot | Shows all projects. Filter as you type. | Purple pill: "Flowmast ×" |
| `$billable` | Click `$billable` toggle | N/A (toggle only) | Green label: "$billable" or gray: "internal" |

**Token interactions:**
- Click `×` on token → remove, return to text input
- Click pill body → open dropdown to change selection
- Keyboard: `@` opens dropdown, arrow keys navigate, Enter selects, Escape closes
- Tab moves between slots (task → project → billing → Start)

### Autocomplete Dropdown

```
┌────────────────────────────────┐
│ @Design landing page           │  ← matches "Design"
│ @Design mockups                │
│ @Design system                 │
│ ──────────────────────────────  │
│ + Create task "Design homepage" │  ← create new option
└────────────────────────────────┘
```

- Filters as user types (fuzzy match)
- Shows project context per task: "Design landing page · Flowmast"
- "+ Create task" at bottom: opens AddTaskModal, on save auto-fills token

### Billing Toggle

```
  [$billable]  →  green, "$billable" label, included in report earnings
  [internal]   →  gray, "internal" label, excluded from earnings
```

Default: inherits from project's billing setting. Overridable per session.

### Timer Control

```
[ 00 : 00 : 00 ]  [ ▶ Start ]   ← idle state (task not selected)
[ 00 : 00 : 00 ]  [ ▶ Start ]   ← ready state (task selected, timer 0)
[ 00 : 12 : 34 ]  [ ⏸ Pause ] [⏹ Stop]  ← running state
[ 00 : 12 : 34 ]  [ ▶ Resume ] [⏹ Stop] ← paused state
```

- **Start disabled** until `@task` is filled (project optional but encouraged)
- **Timer counts UP** (elapsed time, not countdown — this rework moves away from Pomodoro countdown)
- Click [▶ Start]: begin session, freeze input tokens (can't change task mid-session)
- Click [⏸ Pause]: freeze timer, allow resume
- Click [⏹ Stop]: navigate to Session Complete screen

### Quick Pick List

Below the input, shows user's current To Do + In Progress tasks sorted by urgency.

```
┌──────────────────────────────────────────────────────────────┐
│ 🔴 Design landing page     · Flowmast · Cyan Innovations  [▶] │
│ 🟡 Write proposal          · ACME                         [▶] │
│ 🟢 Build timer UI          · Flowmast                     [▶] │
└──────────────────────────────────────────────────────────────┘
```

Click [▶] on any row → auto-fills `@task` + `@project` tokens in sentence input. User can start immediately.

### Running Session View

When timer is running, sentence input becomes a read-only declaration:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Amulya is working on                                          │
│   ┌────────────────────────┐                                    │
│   │ Design landing page    │    from   ┌──────────────┐         │
│   └────────────────────────┘           │ Flowmast     │         │
│                                        └──────────────┘         │
│   $billable                                                      │
│                                                                  │
│                   00 : 23 : 15        [ ⏸ Pause ] [ ⏹ Stop ]   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Props | Notes |
|-----------|-------|-------|
| **SentenceInput** | `user`, `task`, `project`, `billing`, `onChange` | Composite input with three slots. Manages token state. |
| **TokenSlot** | `label`, `value`, `placeholder`, `options`, `onSelect`, `onClear` | Single tokenizable slot. Handles autocomplete dropdown. |
| **BillingToggle** | `value`, `onChange` | Toggle: billable / internal. |
| **TimerDisplay** | `elapsed`, `isRunning`, `isPaused` | HH:MM:SS, monospace, large. |
| **StartButton** | `disabled`, `onClick` | Disabled until task filled. |
| **QuickPickList** | `tasks`, `onSelect` | Shows top tasks sorted by urgency. |

### States

| State | Input | Timer | Start |
|-------|-------|-------|-------|
| **Idle** | All slots empty | 00:00:00 | Disabled (gray) |
| **Task selected** | @task filled | 00:00:00 | Active (dark) |
| **Running** | Frozen (read-only) | Counting up | Hidden → [Pause] [Stop] |
| **Paused** | Frozen | Frozen | Hidden → [Resume] [Stop] |
| **Error** | Normal | Reset | Banner: "Failed to start session. Retry." |

### Interactions

- **Type `@` in task slot:** Open autocomplete dropdown with tasks. Filter by project if project already selected.
- **Type `@` in project slot:** Open autocomplete dropdown with all projects.
- **Select task from dropdown:** Fills task token. If project not filled, auto-fill from task's project.
- **Click [▶] in Quick Pick:** Auto-fill task + project tokens. Input ready to start.
- **Click [$billable] toggle:** Toggle between billable and internal.
- **Click [▶ Start]:** Validate (task required), POST `/api/sessions/start`, begin elapsed timer.
- **Click [⏸ Pause]:** Freeze timer, show [Resume], keep elapsed.
- **Click [▶ Resume]:** Resume elapsed timer.
- **Click [⏹ Stop]:** Navigate to `/session-complete?sessionId=xxx`.

### Data Flow

```
User types @task → fuzzy search tasks in Zustand
    ↓
Token selected → task + project filled
    ↓
Click [▶ Start]
    ↓
POST /api/sessions/start { taskId, projectId, billing }
    ↓
Session created in DB + Zustand
    ↓
setInterval counts up every 1s
    ↓
Sync elapsed to DB every 10s
    ↓
User stops → navigate to /session-complete
```

### Edge Cases

| Case | Behavior |
|------|----------|
| Task belongs to project A, user picks project B | Show warning: "Task doesn't belong to this project. Clear project?" |
| No tasks exist yet | Quick pick empty: "No tasks. Create one in the Tasks tab." Input still works (type task name, hit "Create task"). |
| Timer running and user navigates away | Session persists in Zustand + DB. Show ActiveSessionBanner in Tasks tab. |
| User types task that doesn't exist | Show "+ Create task [name]" in dropdown. On select, open AddTaskModal pre-filled. |
| Session already active (crash recovery) | On load, detect active session in DB, auto-restore timer state. |

---

## Screen 3: Session Complete

**Route:** `/session-complete?sessionId=xxx`
**Purpose:** Confirm or adjust logged time. Lock to task.

### Layout

```
┌─────────────────────────────────────────────┐
│ Sidebar        │ Main Content              │
├────────────────┼───────────────────────────┤
│                │                           │
│                │  ✓ Session Logged        │
│                │                           │
│                │  Amulya is working on    │
│                │  ┌──────────────────────┐ │
│                │  │ Design landing page  │ │
│                │  └──────────────────────┘ │
│                │  from Flowmast            │
│                │  $billable                │
│                │                           │
│                │  Duration: 00:23:15       │
│                │  Started: 2:30 PM         │
│                │  Ended: 2:53 PM           │
│                │                           │
│                │  ─────────────────────    │
│                │                           │
│                │  Log this session?        │
│                │                           │
│                │  [Yes — log 23 min]       │
│                │  [I worked less]          │
│                │                           │
│                │  [Back to Tasks]          │
│                │                           │
└─────────────────────────────────────────────┘
```

**Note:** If user clicks "I worked less":
```
│  Actual minutes worked:                  │
│  ┌──────────────────────────────────┐    │
│  │ ____ minutes                     │    │
│  └──────────────────────────────────┘    │
│  [Log and Continue]                      │
```

### Components, States, Interactions

Same as previous spec (see earlier version). Key copy changes:

- "Session logged" → "✓ Session Logged" (green checkmark)
- "Yes — log 23 min" (uses elapsed, not estimate)
- "I worked less" (not "No, adjust")
- "Back to Tasks" navigates to `/` Tasks tab

---

## Screen 4: Report (Calendar View)

**Route:** `/report`
**Purpose:** View time logged on a calendar. See hours per day, per project, per client.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Sidebar           │ Report Tab                                   │
├───────────────────┼──────────────────────────────────────────────┤
│                   │                                              │
│ (same sidebar)    │ ┌── Report Header ────────────────────────┐  │
│                   │ │ 📊 Report                               │  │
│                   │ │ [Month ▼] [← Apr] [May →]  [Today]     │  │
│ Filter by:        │ │ View: [Month] [Week] [Day]              │  │
│ ● All clients     │ └─────────────────────────────────────────┘  │
│ ○ Flowmast        │                                              │
│ ○ ACME            │ Calendar Grid (Month View):                  │
│                   │                                              │
│                   │  Mon   Tue   Wed   Thu   Fri   Sat   Sun    │
│                   │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ─── ─── │
│                   │ │    │ │    │ │ 21 │ │ 22 │ │ 23 │         │
│                   │ │    │ │    │ │3h  │ │1h  │ │5h  │         │
│                   │ │    │ │    │ │■■■ │ │■   │ │■■■■│         │
│                   │ └────┘ └────┘ └────┘ └────┘ └────┘         │
│                   │                                              │
│                   │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ─── ─── │
│                   │ │ 26 │ │ 27 │ │ 28 │ │ 29 │ │ 30 │         │
│                   │ │6h  │ │4h  │ │    │ │2h  │ │    │         │
│                   │ │■■■■│ │■■■ │ │    │ │■■  │ │    │         │
│                   │ └────┘ └────┘ └────┘ └────┘ └────┘         │
│                   │                                              │
│                   │ ─────────────────────────────────────────── │
│                   │                                              │
│                   │ Week Summary (selected week: Apr 21-27):    │
│                   │                                              │
│                   │ ┌── Client Breakdown ────────────────────┐  │
│                   │ │ ████████████  Flowmast    12h 30m $625 │  │
│                   │ │ ████████      ACME         8h 15m $618 │  │
│                   │ │ ██████        Personal     5h 45m  $0  │  │
│                   │ └────────────────────────────────────────┘  │
│                   │                                              │
│                   │ Total: 26h 30m  |  Billable: $1,243.75      │
│                   │                                              │
│                   │ [📥 Export PDF]  [🔗 Share]                 │
│                   │                                              │
└──────────────────────────────────────────────────────────────────┘
```

### Day Cell Detail (on hover or click)

```
Clicking a day cell expands detail:

┌── Apr 26 ─────────────────────────────────────────────┐
│                                                        │
│  06h 00m total                                         │
│                                                        │
│  ■ Flowmast                                            │
│    Design landing page          2h 30m                 │
│    Build timer UI               1h 45m                 │
│                                                        │
│  ■ ACME                                                │
│    Write proposal               1h 45m                 │
│                                                        │
│                            [Close ×]                   │
└────────────────────────────────────────────────────────┘
```

### Week View (alternate)

```
         Mon Apr 21   Tue Apr 22   Wed Apr 23
         ──────────   ──────────   ──────────
  8am    ┌──────────┐
         │Design LP │  ← session block (color = project color)
  9am    │2h 30m    │
         └──────────┘
  10am                             ┌──────────┐
                                   │Write prop│
  11am                             │1h 45m    │
                                   └──────────┘
  ...
```

### Components

| Component | Props | Notes |
|-----------|-------|-------|
| **CalendarGrid** | `view`, `sessions`, `onDayClick`, `onWeekSelect` | Month or week view. Day cells show time bars. |
| **DayCell** | `date`, `sessions`, `totalMinutes`, `onClick` | Shows date, total hours, stacked color bars (one per project). |
| **DayDetail** | `date`, `sessions` | Expanded view of sessions for that day. On click/hover. |
| **WeekSummary** | `sessions`, `weekStart`, `weekEnd` | Client breakdown horizontal bars + totals. |
| **ClientBar** | `client`, `minutes`, `earnings` | Horizontal bar, color dot, client name, hours, earnings. |
| **ReportHeader** | `view`, `month`, `onPrev`, `onNext`, `onViewChange` | Month/week/day toggle, navigation. |
| **ExportButton** | `onClick` | PDF download. |
| **ShareButton** | `onClick` | Copy shareable link. |

### States

| State | Content | UI |
|-------|---------|-----|
| **Loading** | Fetching sessions | Skeleton calendar with gray cells. |
| **Empty month** | No sessions logged | "Nothing logged in April. Start a session to see your work." |
| **Partial week** | Some sessions exist | Show logged data. Footer: "Week in progress." |
| **Success** | Sessions rendered | Color bars in day cells, week summary at bottom. |

### Interactions

- **Click [Month] / [Week] / [Day]:** Switch calendar view mode.
- **Click [← Apr] / [May →]:** Navigate to prev/next month. Load sessions for that period.
- **Click [Today]:** Jump to current month/week.
- **Click day cell:** Expand DayDetail showing sessions for that day.
- **Click client in sidebar:** Filter calendar to show only that client's sessions.
- **Click [📥 Export PDF]:** Generate PDF of current week summary. Filename: `flowmast-report-2026-04-21.pdf`.
- **Click [🔗 Share]:** Copy shareable read-only link to clipboard. Toast: "Copied!"
- **Hover day cell:** Show tooltip with total hours. (Or expand on click for mobile-friendly.)

### Data Flow

```
Zustand sessions store
    ↓
Filter by selected client(s)
    ↓
Filter by visible date range (month / week)
    ↓
Group by date → list sessions per day
    ↓
Compute per-day totals
    ↓
Render CalendarGrid with DayCells
    ↓
Click day → DayDetail
    ↓
Compute week summary when week selected
```

### Edge Cases

| Case | Behavior |
|------|----------|
| Session spans midnight | Count in start day. Show as single block. |
| No hourly rate on client | Show hours, no earnings. "Rate not set." |
| Day has 10+ sessions | Collapse in DayDetail with scroll. Day cell shows stacked bars. |
| Future dates | Gray out. No sessions. No interaction. |
| All data filtered (client filter) | Empty state per visible period: "No sessions for this client in April." |
| PDF export fails | Toast error: "Export failed. Try again." |

---

## Global: Active Session Banner

Shown in **Tasks tab** and **Report tab** when timer is running. Persists across tabs.

```
┌──────────────────────────────────────────────────────────┐
│ ⏱ Amulya is working on Design landing page · Flowmast   │
│ 00:23:15                [⏸ Pause]  [⏹ Stop]  [View ▶]  │
└──────────────────────────────────────────────────────────┘
```

- Appears at top of content area when `activeSessionId` exists in Zustand
- Shows task, project, elapsed time
- Controls: pause, stop (→ session complete), view (→ timer tab)

---

## Navigation Flow

```
Tasks ──────────────────────────────────────────────────────────┐
  │                                                             │
  │ [▶ Start] on card                                          │
  ▼                                                            │
Timer Tab ──────────────────────────────────────────────────┐  │
  │                                                          │  │
  │ [⏹ Stop]                                                │  │
  ▼                                                          │  │
Session Complete ───────────────────────────────────────────┘  │
  │                                                             │
  │ [Back to Tasks] or auto-redirect on log                    │
  ▼                                                            │
Tasks ─────────────────────────────────────────────────────────┘

Report Tab (accessible anytime, independent)
```

---

## Component Hierarchy (Updated)

```
App (root)
├── ThemeProvider
├── AppShell
│   ├── Sidebar
│   │   ├── Nav (Tasks, Timer, Report)
│   │   ├── ProjectList
│   │   │   └── ProjectItem (per project, with client label)
│   │   ├── UrgencyFilter
│   │   └── [+ New Project] button
│   └── MainContent
│       ├── Page: Tasks
│       │   ├── FilterBar
│       │   └── KanbanBoard
│       │       └── KanbanColumn × 3
│       │           └── TaskCard (per task)
│       │               ├── UrgencyDot
│       │               ├── ProjectTag
│       │               └── ClientBadge
│       ├── Page: Timer
│       │   ├── SentenceInput
│       │   │   ├── TokenSlot (task)
│       │   │   ├── TokenSlot (project)
│       │   │   └── BillingToggle
│       │   ├── TimerDisplay (HH:MM:SS)
│       │   ├── StartButton / PauseButton / StopButton
│       │   └── QuickPickList
│       │       └── QuickPickRow (per task)
│       ├── Page: SessionComplete
│       │   ├── ConfirmationMessage
│       │   ├── ConfirmButton
│       │   ├── AdjustButton
│       │   ├── AdjustTimeInput (conditional)
│       │   └── LogAndContinueButton
│       └── Page: Report
│           ├── ReportHeader
│           ├── CalendarGrid
│           │   └── DayCell (per day)
│           │       └── DayDetail (on click)
│           └── WeekSummary
│               └── ClientBar (per client)
└── Toast Container (global)

Active Session Banner (global, conditional)

Modal Components:
├── AddTaskModal
├── AddProjectModal
├── TaskDetailModal (edit task)
└── ConfirmationDialog (delete, back warnings)
```

---

## Urgency System

| Level | Color | Hex | Use case |
|-------|-------|-----|----------|
| 🔴 Urgent | Red | `#DC2626` | Deadline today, client blocking |
| 🟡 High | Amber | `#D97706` | Due this week, important |
| 🟢 Normal | Green | `#16A34A` | Standard work (default) |
| ⚪ Low | Gray | `#808080` | Backlog, someday |

Default urgency: Normal. Sort order in kanban: Urgent → High → Normal → Low within each column.

---

## Responsive Behavior

**Screen < 768px:**
```
"Flowmast works best on desktop.
Please switch to a larger screen."
```

**Desktop (768px+):** Full layout as specified.

---

## Animation & Transitions

| Element | Animation | Duration | Trigger |
|---------|-----------|----------|---------|
| Task card added | Slide in from top, fade in | 300ms | Save task |
| Task moved between columns | Smooth slide (v2) / instant | — | Status change |
| Timer numbers | Tick update (no animation) | 1s | Running |
| Token added | Scale in (0.8 → 1.0) | 150ms | Token selected |
| Token removed | Fade out | 100ms | × clicked |
| Start button activate | Color shift gray → dark | 200ms | Task selected |
| Calendar day expand | Height expand | 200ms | Day clicked |
| Page transition | Fade in | 150ms | Tab switch |

---

## Performance Targets

- **Tasks tab load:** <300ms (Zustand, instant local data)
- **Kanban render:** <100ms (client-side group + sort)
- **Timer tick:** <16ms (60fps, setInterval)
- **Autocomplete dropdown:** <50ms response (local fuzzy search)
- **Report compute:** <500ms (group + sum sessions)
- **Calendar render:** <500ms (31 day cells)

---

**Last updated:** 2026-04-27
**Status:** Ready for implementation
**Next:** Build Zustand store + component files
