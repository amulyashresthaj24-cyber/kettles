# Project Workspace Design – Interactive Tab Interface

## Overview

The `ProjectWorkspace` component provides a modern, Linear-inspired project management interface featuring:

- **Interactive Tab Navigation** — Quick switching between Overview, Tasks, Board, Timeline, Dashboard, and Members views
- **Three-Pane Layout** — Left sidebar for controls, center content area, and right sidebar for metadata
- **Collapsible Sections** — Right sidebar sections (Project members, Estimate, Billing, Fixed fee) that expand/collapse
- **Contextual Controls** — Left sidebar with project details, privacy settings, tags, and actions
- **Dark Theme** — Refined, architectural aesthetic following Flowmate's design system

## Architecture

### Component Structure

```
ProjectWorkspace
├── Top Navigation Bar
│   ├── Back button + Project name
│   ├── Repository selector
│   ├── Saved views dropdown
│   └── Share button
├── Tab Navigation
│   └── [Overview, Tasks, Board, Timeline, Dashboard, Members]
├── Main Content Area
│   ├── Left Sidebar (Collapsible)
│   ├── Center Content (Tab-dependent)
│   └── Right Sidebar (Collapsible)
└── Modals
    ├── AddTaskModal
    └── EditProjectModal
```

### Key Features

#### 1. Tab System

Each tab (`TabId`) represents a view mode:

- **Overview** — Project details and summary information
- **Tasks** — List view of all tasks
- **Board** — Kanban board view (drag-and-drop)
- **Timeline** — Timeline/Gantt view (placeholder)
- **Dashboard** — Analytics and reporting (placeholder)
- **Members** — Team collaboration view (placeholder)

```tsx
type TabId = "overview" | "tasks" | "board" | "timeline" | "dashboard" | "members";
```

#### 2. Left Sidebar

**Contains:**
- Project header with color indicator
- Project selector (dropdown)
- Date range picker
- Privacy toggle (Private/Shared)
- Tag management
- Project description textarea
- Add milestone button
- Add attachment button

**Features:**
- Fixed width (320px / `w-80`)
- Scrollable content area
- Organized in logical sections with dividers

#### 3. Right Sidebar

**Collapsible sections:**
- **Project members** — Team members and roles
- **Estimate** — Time tracking budget
- **Billing** — Billable hours settings
- **Fixed fee** — Budget monitoring

**Features:**
- Toggle to collapse/expand
- Animated chevron rotation
- Independent expand/collapse state management
- Quick hide button (×)
- Collapse-to-button mode when hidden

#### 4. Top Navigation

**Left side:**
- Back button with smooth chevron
- Lock icon + project name
- Divider
- Repository dropdown
- Menu button

**Right side:**
- Saved views dropdown
- Share button (primary style)

### Styling & Theming

All styles follow the Flowmate design system:

- **Colors** — CSS custom properties from `globals.css`
- **Spacing** — 8px-based scale (xs: 4px, sm: 8px, md: 12px, lg: 16px, etc.)
- **Typography** — Urbanist font family with scale-based sizing
- **Borders** — Subtle border-subtle color for separation
- **Transitions** — Smooth 150-200ms cubic-bezier easing

### Responsive Behavior

The workspace uses a flexible three-pane layout:

```
┌─────────────────────────────────────────────────────┐
│                  Top Navigation                     │
├──────┬─────────────────────────────────────┬────────┤
│      │                                     │        │
│Left  │        Content Area                │ Right  │
│Sidebar│  (Tab-dependent)                 │Sidebar  │
│      │                                     │        │
│(w-80)│  (flex-1, overflow-y-auto)        │(w-80)   │
│      │                                     │        │
└──────┴─────────────────────────────────────┴────────┘
```

## Usage

### Basic Implementation

```tsx
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import type { Project, Task } from "@/lib/types";

export default function ProjectPage() {
  const project: Project = {
    id: "proj-1",
    name: "My Project",
    color: "teal",
    description: "Project description",
    // ... other fields
  };

  const tasks: Task[] = [
    // ... tasks filtered for this project
  ];

  return (
    <ProjectWorkspace
      project={project}
      tasks={tasks}
      onBack={() => router.push("/projects")}
    />
  );
}
```

### Props

```tsx
interface ProjectWorkspaceProps {
  project: Project;           // Current project
  tasks: Task[];              // Project tasks
  onBack: () => void;         // Navigation callback
}
```

### State Management

The component manages:

- `activeTab` — Currently selected tab
- `rightSidebarOpen` — Right sidebar visibility
- `expandedSections` — Which right sidebar sections are open
- `addTaskOpen` / `editProjectOpen` — Modal visibility states
- `isPrivate` — Privacy setting toggle

All state is local to the component, making it self-contained and reusable.

## Design Patterns

### 1. Tab Active Indicator

```css
/* Tab styling */
.tab-active {
  color: var(--accent);
  border-bottom: 2px solid var(--accent);
}

.tab-inactive {
  color: var(--text-secondary);
  transition: color 150ms ease-standard;
}
```

### 2. Collapsible Sections

Uses a render-time conditional to show/hide content:

```tsx
{isOpen && <div className="pt-md">{children}</div>}
```

Animated chevron indicator:

```tsx
<ChevronDown
  size={16}
  className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
/>
```

### 3. Hover States

Buttons use consistent hover patterns:

```tsx
"hover:bg-surface-raised transition-colors"
"hover:text-text-primary transition-colors"
```

### 4. Content Area Max-Width

Tab content is constrained to `max-w-6xl` to maintain readability:

```tsx
<div className={`${maxWidth} mx-auto space-y-4xl`}>
  {/* Tab content */}
</div>
```

## Accessibility

- Semantic HTML with proper button elements
- Keyboard navigable tabs (can be enhanced with arrow keys)
- Clear focus states via Tailwind focus rings
- ARIA-friendly structure
- Text contrast meets WCAG AA standards

## Future Enhancements

1. **Timeline & Dashboard Placeholders** — Implement actual views
2. **Keyboard Navigation** — Arrow keys to switch tabs
3. **Tab Persistence** — Save active tab in localStorage
4. **Responsive Mobile** — Collapse sidebars on small screens
5. **Drag-and-drop Tabs** — Reorder tab visibility
6. **Export/Save Views** — Named workspace configurations
7. **Real-time Updates** — WebSocket integration for live collaboration

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Modern mobile browsers (iOS Safari 14+, Chrome Android)

## Performance Notes

- Component uses `useMemo` for task filtering to avoid unnecessary re-renders
- Sidebar toggles don't require full page re-render (local state)
- Tab switching is instant (pre-rendered content)
- Consider memoizing child components if performance issues arise

## Integration Points

The component integrates with:

- `@/lib/store-supabase` — Project and task state management
- `@/components/KanbanBoard` — Task board view
- `@/components/ProjectDetailsCard` — Overview tab content
- `@/components/AddTaskModal` — Task creation
- `@/components/EditProjectModal` — Project editing

## Design Tokens Reference

### Spacing
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 20px
- `2xl`: 24px
- `3xl`: 32px
- `4xl`: 40px

### Colors
- `bg-base` — Main background
- `bg-surface` — Default surface
- `bg-surface-raised` — Elevated surface
- `bg-surface-mid` — Middle-tone surface
- `border-border-subtle` — Subtle dividers
- `text-text-primary` — Main text
- `text-text-secondary` — Secondary text

### Border Radius
- `rounded-md` — 12px (default for buttons)
- `rounded-lg` — 16px
- `rounded-full` — 9999px (pills)

## Related Files

- `src/components/ProjectWorkspace.tsx` — Main component
- `src/app/projects/[id]/page.tsx` — Project detail page
- `Docs/design.md` — Design system documentation
