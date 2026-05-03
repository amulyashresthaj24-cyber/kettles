# Project Workspace Layout – Visual Architecture (v2)

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│               Top Navigation Bar                        │
│ ◄ 🔒 Project Name | Rochak ⌄ | ⋯  |  Saved views ⌄  Share
├─────────────────────────────────────────────────────────┤
│  Overview | Tasks | Board | Timeline | Dashboard | Members
├─────────────────────────────────────────────────────────┤
│                                                         │
│               FULL-WIDTH CONTENT AREA                  │
│                   (Tab-dependent)                      │
│                                                         │
│  Overview Tab:                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │          Project Details Card                    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │ Project Members      │  │ Estimate             │   │
│  │ (Collapsible)        │  │ (Collapsible)        │   │
│  └──────────────────────┘  └──────────────────────┘   │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │ Billing              │  │ Fixed Fee            │   │
│  │ (Collapsible)        │  │ (Collapsible)        │   │
│  └──────────────────────┘  └──────────────────────┘   │
│                                                         │
│  Other Tabs:                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │          Content fills entire space              │ │
│  │        (Kanban, Timeline, Dashboard, etc)        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Key Changes from v1

### ❌ Removed
- **Left Sidebar** (Project controls, description, tags)
- **Right Sidebar** (Collapsible sections panel)
- Fixed 3-pane layout
- Sidebar toggle buttons

### ✅ Added
- **Full-width content area** for all views
- **Overview tab** with 2-column grid layout
- **Responsive grid** for sections (1 col mobile, 2 cols desktop)
- **Clean tab switching** without sidebar distractions

## Tab Content Breakdown

### Overview Tab
```
┌─ Project Details Card (Full width) ─────────────────────┐
│ • Project name, color, status                          │
│ • Client, dates, budget information                    │
│ • Billable status                                       │
│ • Edit & delete actions                                │
└────────────────────────────────────────────────────────┘

┌─ Members (Col 1) ──┐  ┌─ Estimate (Col 2) ──────────────┐
│ • Team members     │  │ • Time tracking budget           │
│ • Roles            │  │ • Comparison toggle              │
│ • Add members      │  └──────────────────────────────────┘
└────────────────────┘

┌─ Billing (Col 1) ──┐  ┌─ Fixed Fee (Col 2) ─────────────┐
│ • Billable toggle  │  │ • Fee monitoring                 │
│ • Hour value       │  │ • Spending tracker               │
│ • Calculation info │  └──────────────────────────────────┘
└────────────────────┘
```

### Tasks Tab
```
┌─ Tasks Header + Add Button ────────────────────────────────┐
│ Tasks (42)                                      + Add Task  │
├────────────────────────────────────────────────────────────┤
│  [Full-width Kanban Board]                                │
│  • All task columns displayed                            │
│  • Drag-and-drop support                                 │
│  • No sidebar constraints                                │
└────────────────────────────────────────────────────────────┘
```

### Board Tab
```
Same as Tasks tab (uses KanbanBoard component)
```

### Timeline, Dashboard, Members Tabs
```
┌────────────────────────────────────────────────────────────┐
│  [Coming Soon Placeholder]                                │
│  Full-width content area ready for implementation          │
└────────────────────────────────────────────────────────────┘
```

## Responsive Behavior

### Desktop (lg screens and up)
- 2-column grid for Overview sections
- Full-width tab content
- Optimal reading width maintained

### Tablet/Mobile (< lg screens)
- 1-column grid for Overview sections
- Full-width tab content
- Touch-friendly interactive areas

## Color & Spacing Reference

### Spacing Used
- Header padding: `px-4xl py-lg` (40px × 16px)
- Content padding: `p-4xl` (40px)
- Section gaps: `gap-4xl` (40px), `gap-lg` (16px)
- Inner spacing: `space-y-sm/md/lg/4xl`

### Color Palette
- Background: `bg-base` (#08090a)
- Surface: `bg-surface` (#0f1011)
- Surfaces raised: `bg-surface-raised` (#191a1b)
- Borders: `border-border-subtle` (#1e1f20)
- Text primary: `text-text-primary` (#f7f8f8)
- Accent: `text-accent` (#0066ff)

### Border & Radius
- Dividers: `border border-border-subtle`
- Buttons: `rounded-md` (12px)
- Rounded pills: `rounded-full` (9999px)

## Interactive Elements

### Tab Navigation
- Click to switch tabs
- Active tab shows blue underline
- Smooth color transitions
- Keyboard accessible (can add arrow key nav)

### Collapsible Sections
- Click header to expand/collapse
- Chevron rotates 180° on open
- Smooth height animation
- Independent state for each section

### Buttons & Links
- Hover states change background color
- Smooth transitions (150-200ms)
- Visual feedback on click
- Focus ring for keyboard navigation

## Component Hierarchy

```
ProjectWorkspace
├── Top Navigation Bar
│   ├── Back button
│   ├── Project info (name, lock icon)
│   ├── Repository selector
│   ├── Saved views
│   └── Share button
├── Tab Navigation
│   └── [6 tabs with active indicator]
└── Main Content Area
    ├── Overview Tab Content
    │   ├── ProjectDetailsCard
    │   └── 2-Column Grid
    │       ├── CollapsibleSection (Members)
    │       ├── CollapsibleSection (Estimate)
    │       ├── CollapsibleSection (Billing)
    │       └── CollapsibleSection (Fixed Fee)
    └── Other Tabs
        ├── Tasks/Board → KanbanBoard
        ├── Timeline → Placeholder
        ├── Dashboard → Placeholder
        └── Members → Placeholder
```

## Performance Optimizations

- `useMemo` for task filtering (prevents unnecessary re-renders)
- Local state for tab/section management (no global store needed)
- CSS transitions for smooth animations (GPU-accelerated)
- Lazy-loaded tab content (instant switching)

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Modern mobile browsers

## Accessibility

- Semantic HTML structure
- ARIA-friendly navigation
- Keyboard navigable tabs
- Proper color contrast (WCAG AA)
- Focus indicators on interactive elements
- Clear visual hierarchy

## Future Enhancement Ideas

1. **Tab Persistence** — Save active tab in localStorage
2. **Keyboard Navigation** — Arrow keys to switch tabs
3. **Mobile Responsiveness** — Hamburger menu for tabs on small screens
4. **Drag-and-drop Tabs** — Reorder tab visibility
5. **Timeline Implementation** — Gantt chart view
6. **Real-time Updates** — WebSocket integration
7. **Export Views** — Save workspace snapshots
8. **Search Integration** — Quick search within project

---

## Files Modified

- `src/components/ProjectWorkspace.tsx` — Full redesign
- `src/app/projects/[id]/page.tsx` — Uses updated component
- `REDESIGN_SUMMARY.md` — Updated documentation

## Status

✅ **Linting**: Passed  
✅ **TypeScript**: Compiled successfully  
✅ **Production Build**: Successful  
✅ **Ready for deployment**
