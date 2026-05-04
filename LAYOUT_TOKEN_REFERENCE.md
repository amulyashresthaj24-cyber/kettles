# Layout Token Reference Guide

## Quick Start

All layout consistency is driven by CSS variables defined in `src/app/globals.css` and enforced through reusable components in `src/components/layout/`.

### Basic Page Structure

```tsx
import { PageLayout, PageHeader, PageToolbar, PageContent } from "@/components/layout";

export default function ExamplePage() {
  return (
    <PageLayout>
      {/* Page title, optional subtitle, and right-aligned CTA */}
      <PageHeader 
        title="Page Title"
        subtitle="Optional descriptive text"
        action={<Button>Action</Button>}
      />
      
      {/* Optional: Filters, view toggles, etc. */}
      <PageToolbar
        left={<Filters />}
        right={<ViewToggle />}
      />
      
      {/* Main content area */}
      <PageContent>
        <YourContent />
      </PageContent>
    </PageLayout>
  );
}
```

## CSS Variables

All values are in `src/app/globals.css` in the `:root` selector.

### Content Padding & Max Width

| Variable | Value | Purpose |
|----------|-------|---------|
| `--content-padding-x` | 32px | Left/right padding for main content areas |
| `--content-padding-y` | 32px | Top/bottom padding for main content areas |
| `--content-max-width` | 1200px | Maximum width for centered layouts (Dashboard) |

**Usage:**
```css
/* In a page or component */
.container {
  padding-left: var(--content-padding-x);
  padding-right: var(--content-padding-x);
  padding-top: var(--content-padding-y);
  padding-bottom: var(--content-padding-y);
  max-width: var(--content-max-width);
  margin: 0 auto;
}
```

### Gaps & Spacing

| Variable | Value | Purpose |
|----------|-------|---------|
| `--content-gap` | 24px | Gap between major sections (header → toolbar → content) |
| `--header-gap` | 24px | Gap in page header between title/subtitle and action buttons |
| `--toolbar-gap` | 16px | Gap between toolbar left and right groups |
| `--section-gap` | 16px | Gap between content sections (cards, lists) |
| `--component-gap` | 12px | Gap between small components (form fields, buttons) |

**Spacing Hierarchy:**
```
--content-gap (24px) — Largest, between major layout sections
  ↓
--header-gap (24px) — Large, within header area
  ↓
--toolbar-gap (16px) — Medium, toolbar sections
--section-gap (16px) — Medium, content sections
  ↓
--component-gap (12px) — Small, between small items
```

### Typography Variables (Reference)

These are provided for consistency but typically accessed through Tailwind classes:

| Variable | Value | Usage |
|----------|-------|-------|
| `--heading-xl-size` | 32px | Page title (h1) |
| `--heading-xl-weight` | 600 | |
| `--heading-lg-size` | 28px | Large section header |
| `--heading-sm-size` | 22px | Small section header |
| `--body-md-size` | 16px | Body text |
| `--body-sm-size` | 14px | Secondary text |
| `--label-size` | 13px | UI labels |

## Component API

### PageLayout

Container for the entire page. Applies `--content-gap` between children.

```tsx
<PageLayout>
  {children}
</PageLayout>
```

**Props:**
- `children: React.ReactNode` — Page content

**Styles:**
- `display: flex`
- `flex-direction: column`
- `gap: var(--content-gap)` (24px)

---

### PageHeader

Consistent header with title, optional subtitle, and optional action.

```tsx
<PageHeader 
  title="Tasks"
  subtitle="All active tasks"
  action={<Button>New Task</Button>}
/>
```

**Props:**
- `title: string` — Page title
- `subtitle?: string | React.ReactNode` — Secondary text (optional)
- `action?: React.ReactNode` — Right-aligned button/control (optional)

**Styles:**
- `display: flex`
- `justify-content: space-between`
- `align-items: center`
- `gap: var(--toolbar-gap)` (16px) — between left and right
- Title/subtitle container has `gap: 4px`
- Title: 32px, 600 weight, -0.01em letter-spacing
- Subtitle: 14px, text-muted color

**Example:**
```tsx
<PageHeader
  title="Projects"
  subtitle={`${activeCount} active projects`}
  action={
    <Button variant="primary" size="sm">
      <Plus size={14} />
      New Project
    </Button>
  }
/>
```

---

### PageToolbar

Flexible toolbar for filters (left) and controls (right).

```tsx
<PageToolbar
  left={
    <>
      <Select>{options}</Select>
      <Select>{options}</Select>
    </>
  }
  right={
    <>
      <ViewToggle />
      <ArchiveButton />
    </>
  }
/>
```

**Props:**
- `left?: React.ReactNode` — Filter/search controls (optional)
- `right?: React.ReactNode` — Action buttons/toggles (optional)
- `className?: string` — Additional classes

**Styles:**
- `display: flex`
- `justify-content: space-between`
- `align-items: center`
- `gap: var(--toolbar-gap)` (16px) — between left and right groups
- Left/right sections: `gap: var(--component-gap)` (12px) between items
- Right section auto-margins to far right if left is empty

**Example:**
```tsx
<PageToolbar
  left={
    <>
      <Select
        value={selectedProjectId ?? ""}
        onChange={(e) => setSelectedProject(e.target.value || null)}
      >
        <option value="">All projects</option>
        {projects.map(p => <option value={p.id}>{p.name}</option>)}
      </Select>
      <Select
        value={selectedUrgency}
        onChange={(e) => setSelectedUrgency(e.target.value)}
      >
        <option value="all">All priorities</option>
        {/* options */}
      </Select>
    </>
  }
  right={
    <>
      <ViewToggle view={view} onChange={setView} />
      <ArchiveToggle show={showArchived} onToggle={setShowArchived} />
    </>
  }
/>
```

---

### PageContent

Container for main content with section gap.

```tsx
<PageContent>
  <Card>Content 1</Card>
  <Card>Content 2</Card>
</PageContent>
```

**Props:**
- `children: React.ReactNode` — Content items
- `className?: string` — Additional classes

**Styles:**
- `display: flex`
- `flex-direction: column`
- `gap: var(--section-gap)` (16px)

---

## Visual Layout Diagram

```
┌─────────────────────────────────────────────┐
│  Sidebar (fixed 204px)   │  Main Content   │
├──────────────────────────┼─────────────────┤
│  (nav)                   │  padding-x: 32px
│  (fixed)                 │  padding-y: 32px
│                          │
│                          │  ┌──────────────┐
│                          │  │ PageHeader   │ (title + subtitle + action)
│                          │  │ gap: 4px     │ (title-subtitle gap)
│                          │  │ gap: 16px    │ (header-action gap)
│                          │  └──────────────┘
│                          │
│                          │  gap: --content-gap (24px)
│                          │
│                          │  ┌──────────────┐
│                          │  │ PageToolbar  │ (filters + controls)
│                          │  │ gap: 16px    │ (left-right)
│                          │  │ gap: 12px    │ (items)
│                          │  └──────────────┘
│                          │
│                          │  gap: --content-gap (24px)
│                          │
│                          │  ┌──────────────┐
│                          │  │ PageContent  │ (cards, lists, tables)
│                          │  │ gap: 16px    │ (sections)
│                          │  └──────────────┘
│                          │
└──────────────────────────┴─────────────────┘
```

## Alignment Guide

### Header Elements (PageHeader)
- **Title alignment:** Left edge of content padding
- **Subtitle:** Directly below title
- **Action button:** Right edge of content padding

**Example:**
```
| Title Here                                  [New Task Button] |
| Subtitle here                                                 |
```

### Toolbar Elements (PageToolbar)
- **Left group:** Aligned with header left edge
- **Right group:** Aligned with header right edge
- **Baseline:** All elements vertically centered

**Example:**
```
| [Select] [Select]          [View Toggle] [Archive] |
```

### Content Area (PageContent)
- **Sections:** Stack vertically with 16px gaps
- **Left edge:** Aligned with header title
- **Cards/Lists:** Use their own internal padding

## Implementation Checklist

When building a new page:

- [ ] Import components: `import { PageLayout, PageHeader, PageToolbar, PageContent } from "@/components/layout"`
- [ ] Wrap content with `<PageLayout>`
- [ ] Add `<PageHeader title="..." />`
- [ ] Add `<PageToolbar />` if page has filters/controls
- [ ] Wrap main content with `<PageContent>`
- [ ] Use CSS variables for custom padding if needed
- [ ] Test alignment at 1440px+ (desktop-first)
- [ ] Verify no hardcoded gap/padding values (use tokens instead)

## Troubleshooting

### Headings not aligned vertically
- Check that both use `PageHeader` component
- Verify `--content-padding-x` is applied consistently
- Use browser DevTools to inspect computed padding

### Toolbar items have inconsistent spacing
- Use `PageToolbar` with `left` and `right` props
- Don't manually add margin/gap — let component handle it
- If custom spacing needed, add to `className` prop

### Content gaps feel wrong
- `--section-gap` is 16px — this is intentional for visual hierarchy
- If nested cards, use `--component-gap` (12px) internally
- Never mix hardcoded px values with variables

### Typography doesn't scale
- Typography is token-based but applied via Tailwind classes
- Use `text-[length]` syntax for sizes, `font-[weight]` for weights
- Or apply CSS variables directly if customizing

## Design System Harmony

These tokens align with `design.md` definitions:

- **Spacing**: Uses design system's 8px baseline (tokens are 4, 12, 16, 24, 32px multiples)
- **Typography**: Urbanist font with consistent weights and sizes
- **Colors**: All via CSS variables (no hardcoding)
- **Motion**: No changes to existing animations
- **Elevation**: Maintains tonal layer system

