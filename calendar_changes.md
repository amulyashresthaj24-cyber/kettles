# Calendar Enhancement - Complete Changes Guide

**Start work with:** `/compact` before long sessions

---

## Phase 1: Layout & Foundation

### 1.1 Remove "No Events Scheduled" Section
**File:** `src/app/calendar/page.tsx` | **Lines 577-583**

Delete this block:
```typescript
        {laid.length === 0 && (
          <div className="absolute inset-x-0 top-32 flex flex-col items-center gap-2 pointer-events-none">
            <span className="text-[13px]" style={{ color: "var(--text-faint)" }}>
              No events scheduled
            </span>
          </div>
        )}
```

---

### 1.2 Fix Header Bottom Padding
**File:** `src/app/calendar/page.tsx` | **Line 175**

```diff
- paddingBottom: "16px",
+ paddingBottom: "var(--content-padding-y)",
```

---

### 1.3 Fix Week View Day Headers Spacing
**File:** `src/app/calendar/page.tsx` | **Line 252**

```diff
- <div key={i} className="h-12 flex flex-col items-center justify-center gap-0.5"
+ <div key={i} className="h-14 flex flex-col items-center justify-center gap-1"
```

Also update line 248:
```diff
- <div className="h-12" />
+ <div className="h-14" />
```

---

### 1.4 Create TaskDetailSidebar Component
**File:** Create `src/components/TaskDetailSidebar.tsx`

```typescript
"use client";

import { useState } from "react";
import { useApp } from "@/lib/store-supabase";
import type { Task } from "@/lib/types";
import { X } from "@/components/ui/icon";

interface TaskDetailSidebarProps {
  taskId: string | null;
  onClose: () => void;
}

export function TaskDetailSidebar({ taskId, onClose }: TaskDetailSidebarProps) {
  if (!taskId) return null;

  const task = useApp((s) => s.tasks.find((t) => t.id === taskId));
  if (!task) return null;

  return (
    <>
      {/* Overlay backdrop - full viewport */}
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close task panel"
      />

      {/* Side panel - fixed, full height */}
      <div
        className="fixed right-0 top-0 bottom-0 w-96 z-50 flex flex-col overflow-hidden"
        style={{
          background: "var(--surface-raised)",
          borderLeft: "1px solid var(--border-subtle)",
          boxShadow: "-4px 0 12px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 shrink-0"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <h2
            className="text-[18px] font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {task.title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-mid transition-colors shrink-0"
            aria-label="Close panel"
          >
            <X size={18} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Content - scrollable */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            paddingLeft: "var(--content-padding-x)",
            paddingRight: "var(--content-padding-x)",
            paddingTop: "var(--content-padding-y)",
            paddingBottom: "var(--content-padding-y)",
          }}
        >
          <div className="space-y-6">
            {/* Date & Time */}
            <div>
              <span
                className="text-[12px] uppercase tracking-wider font-medium"
                style={{ color: "var(--text-faint)" }}
              >
                Date & Time
              </span>
              <p
                className="text-[14px] mt-2"
                style={{ color: "var(--text-primary)" }}
              >
                {task.dateRange || "No date set"}
              </p>
            </div>

            {/* Description */}
            <div>
              <span
                className="text-[12px] uppercase tracking-wider font-medium"
                style={{ color: "var(--text-faint)" }}
              >
                Description
              </span>
              <p
                className="text-[14px] mt-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {task.description || "No description"}
              </p>
            </div>

            {/* Tags - placeholder for TagEditor component */}
            <div>
              <span
                className="text-[12px] uppercase tracking-wider font-medium"
                style={{ color: "var(--text-faint)" }}
              >
                Tags
              </span>
              <p
                className="text-[13px] mt-2"
                style={{ color: "var(--text-muted)" }}
              >
                Tag editor component coming...
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="flex items-center gap-3 p-6 shrink-0"
          style={{
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-md text-[13px] font-medium transition-colors"
            style={{
              background: "var(--surface-mid)",
              color: "var(--text-primary)",
            }}
          >
            Cancel
          </button>
          <button
            className="flex-1 py-2 rounded-md text-[13px] font-medium text-white transition-colors"
            style={{ background: "var(--accent)" }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}
```

---

### 1.5 Add Side Panel to Calendar Page
**File:** `src/app/calendar/page.tsx` | **Line 4 (imports)**

Add import:
```typescript
import { TaskDetailSidebar } from "@/components/TaskDetailSidebar";
```

**Line 88 (after other state):**
```typescript
const selectedTaskId = useApp((s) => s.selectedTaskId);
const setSelectedTaskId = useApp((s) => s.setSelectedTaskId);
```

**Update store:** `src/lib/store-supabase.ts` | **Line 86**

Add to State interface:
```typescript
selectedTaskId: string | null;
setSelectedTaskId: (id: string | null) => void;
```

In create() function (~line 150), add:
```typescript
selectedTaskId: null,
setSelectedTaskId: (id) => set({ selectedTaskId: id }),
```

**Line 231 (before closing `</div>`):**
```typescript
      {/* Task detail side panel - full viewport */}
      <TaskDetailSidebar
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
```

---

## Phase 2: Status Filter Tabs

### 2.1 Add Status Tabs to Header
**File:** `src/app/calendar/page.tsx` | **After line 219**

Add component state at top (~line 86):
```typescript
const [filterStatus, setFilterStatus] = useState<"all" | "todo" | "doing" | "done">("all");
```

Add to header JSX after "Today" button:
```typescript
          {/* Status filter tabs */}
          <div
            className="flex items-center rounded-md p-1 gap-0.5"
            style={{ background: "var(--surface-raised)" }}
          >
            {[
              { id: "all", label: "All" },
              { id: "todo", label: "To-Do" },
              { id: "doing", label: "In Progress" },
              { id: "done", label: "Done" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilterStatus(id as any)}
                className="px-3 h-7 text-[12px] font-medium rounded transition-colors"
                style={{
                  background: filterStatus === id ? "var(--surface-mid)" : "transparent",
                  color: filterStatus === id ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
```

---

### 2.2 Filter Events by Status
**File:** `src/app/calendar/page.tsx` | **Line 92-93**

Update the useMemo:
```typescript
const events: CalendarEvent[] = useMemo(() => {
  return tasks
    .filter((t) => !t.archived && !t.deletedAt)
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .map((t) => {
```

---

## Phase 3: Tag Editor

### 3.1 Create TagEditor Component
**File:** Create `src/components/TagEditor.tsx`

```typescript
"use client";

import { useState } from "react";
import { X, Plus } from "@/components/ui/icon";
import type { Task } from "@/lib/types";

interface TagEditorProps {
  task: Task;
  onTagsChange: (tags: string[]) => void;
}

export function TagEditor({ task, onTagsChange }: TagEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(task.tags || []);

  // Mock tags - integrate with store when available
  const allTags = ["Design", "Planning", "Marketing", "Review", "Urgent", "Bug Fix"];
  const available = allTags.filter(
    (t) => !selectedTags.includes(t) && t.toLowerCase().includes(search.toLowerCase())
  );

  const addTag = (tag: string) => {
    const updated = [...selectedTags, tag];
    setSelectedTags(updated);
    onTagsChange(updated);
    setSearch("");
  };

  const removeTag = (tag: string) => {
    const updated = selectedTags.filter((t) => t !== tag);
    setSelectedTags(updated);
    onTagsChange(updated);
  };

  return (
    <div className="space-y-3 mt-2">
      {/* Selected tags */}
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <div
            key={tag}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium"
            style={{
              background: "var(--accent)",
              color: "white",
            }}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:opacity-80 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Add tag button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-md transition-colors"
          style={{
            background: "var(--surface-mid)",
            color: "var(--text-primary)",
          }}
        >
          <Plus size={12} />
          Add Tag
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className="absolute top-full mt-1 left-0 w-48 rounded-md shadow-lg z-50 mt-2"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-[12px] border-b"
              style={{
                borderColor: "var(--border-subtle)",
                background: "transparent",
                color: "var(--text-primary)",
              }}
            />
            <div className="max-h-40 overflow-y-auto p-1">
              {available.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    addTag(tag);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[12px] rounded hover:bg-surface-mid transition-colors"
                  style={{ color: "var(--text-primary)" }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 3.2 Add TagEditor to TaskDetailSidebar
**File:** `src/components/TaskDetailSidebar.tsx` | **Line 3**

Add import:
```typescript
import { TagEditor } from "./TagEditor";
```

**Update the Tags section (replace placeholder):**
```typescript
            {/* Tags */}
            <div>
              <span
                className="text-[12px] uppercase tracking-wider font-medium"
                style={{ color: "var(--text-faint)" }}
              >
                Tags
              </span>
              <TagEditor
                task={task}
                onTagsChange={(tags) => {
                  // Update task with new tags
                  useApp.getState().updateTask(task.id, { tags });
                }}
              />
            </div>
```

---

## Phase 4: Time-Blocking (Week View)

### 4.1 Add Click Handler to Time Slots
**File:** `src/app/calendar/page.tsx` | **Line 582**

Update WeekView signature:
```typescript
function WeekView({
  cursor,
  eventsForDay,
  onTaskClick,
}: {
  cursor: Date;
  eventsForDay: (d: Date) => CalendarEvent[];
  onTaskClick: (taskId: string) => void;
}) {
```

**Add state after function declaration:**
```typescript
  const [hoveredSlot, setHoveredSlot] = useState<{ day: Date; hour: number } | null>(null);
```

**Update time cell rendering (around line 630):**

Find this section:
```typescript
                  <div
                    key={`cell-${h}-${di}`}
                    className="h-14 relative"
                    style={{
                      borderLeft: "1px solid var(--border-subtle)",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
```

Add onClick and hover:
```typescript
                  <div
                    key={`cell-${h}-${di}`}
                    className="h-14 relative cursor-pointer hover:bg-accent/5 transition-colors"
                    onClick={() => onTaskClick(`new-slot-${day.toISOString()}-${h}`)}
                    onMouseEnter={() => setHoveredSlot({ day, hour: h })}
                    onMouseLeave={() => setHoveredSlot(null)}
                    style={{
                      borderLeft: "1px solid var(--border-subtle)",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
```

---

### 4.2 Add Click Handler to Month View
**File:** `src/app/calendar/page.tsx` | **Line 336**

Find the month view day cell:
```typescript
            <div
              key={i}
              className="p-2 flex flex-col gap-1 overflow-hidden"
              style={{
```

Add onClick:
```typescript
            <div
              key={i}
              className="p-2 flex flex-col gap-1 overflow-hidden cursor-pointer hover:bg-surface-mid/50 transition-colors"
              onClick={() => onTaskClick(`date-${day.toISOString()}`)}
              style={{
```

---

### 4.3 Pass onTaskClick to All Views
**File:** `src/app/calendar/page.tsx` | **Line 245 (where views are called)**

Update view calls:
```typescript
      {/* View Content */}
      <div className="flex-1 overflow-auto">
        {view === "week" && <WeekView cursor={cursor} eventsForDay={eventsForDay} onTaskClick={(id) => setSelectedTaskId(id)} />}
        {view === "month" && <MonthView cursor={cursor} eventsForDay={eventsForDay} onTaskClick={(id) => setSelectedTaskId(id)} />}
        {view === "day" && <DayView cursor={cursor} eventsForDay={eventsForDay} onTaskClick={(id) => setSelectedTaskId(id)} />}
        {view === "list" && <ListView cursor={cursor} events={events} onAddTask={() => setOpenAddTask(true)} />}
      </div>
```

Update DayView and MonthView signatures similarly.

---

## Phase 5: Animations

### 5.1 Add Dropdown Animation CSS
**File:** `src/app/globals.css` | **Append at end**

```css
/* Dropdown fade-in animation */
@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Panel slide-in from right */
@keyframes panelSlideIn {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.dropdown-animate {
  animation: dropdownFadeIn 0.15s ease-out;
}

.panel-animate {
  animation: panelSlideIn 0.2s ease-out;
}
```

---

### 5.2 Add Animation Classes
**File:** `src/components/TaskDetailSidebar.tsx` | **Line 38**

Update the panel div:
```typescript
      <div
        className="fixed right-0 top-0 bottom-0 w-96 z-50 flex flex-col overflow-hidden panel-animate"
```

**File:** `src/components/TagEditor.tsx` | **Line 58**

Update dropdown div:
```typescript
        {isOpen && (
          <div
            className="absolute top-full mt-2 left-0 w-48 rounded-md shadow-lg z-50 dropdown-animate"
```

---

## Quick Reference

**Start session:** `/compact`

**Request changes:** `/claude "Only change X in file Y, lines Z-A"`

**Example:** 
```
/claude "Remove 'No events scheduled' block from src/app/calendar/page.tsx lines 577-583"
```

---

## Test Each Phase

After each phase, verify:
- [ ] No console errors
- [ ] Layout looks correct at 1280px, 768px, 320px
- [ ] All design tokens used (no hardcoded colors)
- [ ] Spacing matches design system
- [ ] Animations smooth (no jank)
- [ ] Side panel full viewport height
- [ ] Filters work correctly
