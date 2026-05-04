# Layout Standardization Report

## Overview
Standardized the layout, spacing, and typography across all main content pages (Tasks, Projects, Calendar, Dashboard) using reusable layout tokens and components.

## Changes Made

### 1. Layout Tokens (CSS Variables)
**File:** `src/app/globals.css`

Added the following layout tokens to the `:root` CSS variables:

```css
/* Content padding & max-width */
--content-padding-x: 32px;        /* Left/right padding for content areas */
--content-padding-y: 32px;        /* Top/bottom padding for content areas */
--content-max-width: 1200px;      /* Max width for centered content */

/* Main gaps/spacing */
--content-gap: 24px;              /* Gap between major sections (header, toolbar, content) */
--header-gap: 24px;               /* Gap in header (title area vs action buttons) */
--toolbar-gap: 16px;              /* Gap in toolbar row (filters vs controls) */
--section-gap: 16px;              /* Gap between content sections */
--component-gap: 12px;            /* Gap between small components */

/* Heading styles (for reference - use via typography classes) */
--heading-xl-size: 32px;          /* Page title size */
--heading-xl-weight: 600;
--heading-xl-line-height: 1.25;
--heading-xl-letter-spacing: -0.01em;

--heading-lg-size: 28px;
--heading-lg-weight: 600;
--heading-lg-line-height: 1.3;
--heading-lg-letter-spacing: -0.01em;

--heading-sm-size: 22px;
--heading-sm-weight: 600;
--heading-sm-line-height: 1.4;
--heading-sm-letter-spacing: 0;

/* Body & labels */
--body-md-size: 16px;
--body-md-weight: 400;
--body-md-line-height: 1.5;

--body-sm-size: 14px;
--body-sm-weight: 400;
--body-sm-line-height: 1.5;

--label-size: 13px;
--label-weight: 500;
--label-line-height: 1.4;
```

### 2. Reusable Layout Components
Created new components in `src/components/layout/`:

#### **PageLayout.tsx**
- Wrapper component for all page content
- Applies consistent vertical gap between sections
- Usage: Wrap entire page content

```tsx
<PageLayout>
  <PageHeader ... />
  <PageToolbar ... />
  <PageContent ... />
</PageLayout>
```

#### **PageHeader.tsx**
- Consistent header with title, subtitle, and optional action
- Typography automatically scales from CSS variables
- Enforces consistent spacing: 4px gap between title and subtitle
- Usage: Page titles with optional CTA buttons

```tsx
<PageHeader 
  title="Tasks"
  subtitle="All tasks and projects"
  action={<Button>New Task</Button>}
/>
```

#### **PageToolbar.tsx**
- Flexible toolbar for filters and controls
- Left group for filters, right group for view toggles/actions
- Automatic spacing between items
- Usage: Filter bars, view switchers

```tsx
<PageToolbar
  left={<Select>Filters</Select>}
  right={<ViewToggle />}
/>
```

#### **PageContent.tsx**
- Wrapper for main content area
- Applies consistent gap between content sections
- Usage: Container for cards, tables, lists

```tsx
<PageContent>
  {/* Content items here */}
</PageContent>
```

#### **index.ts**
- Barrel export for easy importing: `import { PageLayout, PageHeader, PageToolbar, PageContent } from "@/components/layout"`

### 3. Pages Refactored

#### **Tasks Page** (`src/app/tasks/page.tsx`)
- ✅ Now uses `PageLayout` wrapper (gap: 32px)
- ✅ Header uses `PageHeader` component (32px title + subtitle + "New Task" button)
- ✅ Filters use `PageToolbar` (project/urgency selects on left, view toggle + archive on right)
- ✅ Content area uses `PageContent` wrapper (gap: 16px)
- ✅ All hardcoded gaps replaced with CSS variables
- ✅ Title size: **32px** (matches Dashboard)

#### **Projects Page** (`src/app/projects/page.tsx`)
- ✅ Now uses `PageLayout` wrapper (gap: 32px)
- ✅ Header uses `PageHeader` component (32px title + subtitle + "New Project" button)
- ✅ Content uses `PageContent` wrapper (gap: 16px)
- ✅ All spacing now token-driven
- ✅ Title size: **32px** (matches Dashboard)

#### **Calendar Page** (`src/app/calendar/page.tsx`)
- ✅ Header padding updated to use `--content-padding-x` and `--content-padding-y`
- ✅ Title updated to 32px (was 22px) using heading tokens
- ✅ Full-height viewport maintained (required for calendar grid)
- ✅ ListView section updated with layout token padding
- ✅ Title size: **32px** (matches Dashboard)
- ⚠️ Calendar grid views (week, month, day) kept as-is (internal layout not modified)

#### **Dashboard Component** (`src/components/Dashboard.tsx`)
- ✅ Now uses `PageLayout` wrapper
- ✅ Header uses `PageHeader` component (greeting + date + buttons)
- ✅ Content uses `PageContent` wrapper
- ✅ Max-width container uses `--content-max-width`
- ✅ All hardcoded gaps replaced with CSS variables

### 4. Layout Structure Consistency

All pages now follow this unified pattern:

```
PageLayout (gap: --content-gap)
├── PageHeader (title, subtitle, action)
├── PageToolbar (filters left, controls right)  [optional]
└── PageContent (gap: --section-gap)
    └── Content (cards, tables, lists, etc.)
```

**Benefits:**
- Headings aligned to same left edge across all pages
- Consistent spacing between header, toolbar, and content
- All toolbars have same baseline alignment
- Empty states centered within content area
- No arbitrary padding differences

## Spacing Reference

| Token | Value | Usage |
|-------|-------|-------|
| `--content-padding-x` | 32px | Horizontal padding of main content areas |
| `--content-padding-y` | 32px | Vertical padding of main content areas |
| `--content-gap` | **32px** | Gap between header, toolbar, content (major sections) — **matches Dashboard** |
| `--header-gap` | 24px | Internal gap in page header (title vs action) |
| `--toolbar-gap` | 16px | Gap between toolbar sections (left vs right) |
| `--section-gap` | 16px | Gap between content sections |
| `--component-gap` | 12px | Gap between small components |
| `--content-max-width` | 1200px | Maximum width for centered content (Dashboard) |

## Files Modified

### Layout Components (NEW)
- `src/components/layout/PageLayout.tsx`
- `src/components/layout/PageHeader.tsx`
- `src/components/layout/PageToolbar.tsx`
- `src/components/layout/PageContent.tsx`
- `src/components/layout/index.ts`

### Configuration
- `src/app/globals.css` — Added layout tokens

### Pages Refactored
- `src/app/tasks/page.tsx`
- `src/app/projects/page.tsx`
- `src/app/calendar/page.tsx`
- `src/components/Dashboard.tsx`

## Pages NOT Modified (Out of Scope)

- `/timer` — Timer-specific layout
- `/report` — Report-specific layout
- `/projects/[id]` — Project details (different structure)
- `/auth` — Authentication page
- `/onboarding` — Onboarding flow
- `/dashboard` — (Refactored)

## Consistency Achieved

### Title Sizes (All Pages)
- Tasks: **32px** ✅
- Projects: **32px** ✅
- Calendar: **32px** ✅
- Dashboard: **32px** ✅

### Content Gaps (All Pages)
- Between header → toolbar → content: **32px** (--content-gap) ✅
- Between content sections: **16px** (--section-gap) ✅
- Matches Dashboard reference point ✅

### Padding (All Pages)
- Left/right: **32px** (via AppShell + --content-padding-x) ✅
- Top: **32px** (via AppShell + --content-padding-y) ✅
- Consistent across Tasks, Projects, Calendar, Dashboard ✅

## Validation

✅ TypeScript compilation: **PASSED**
✅ Next.js build: **PASSED**
✅ All page titles: **32px** (consistent)
✅ Main gaps: **32px** (Dashboard reference applied)
✅ Spacing is token-driven: No hardcoded values in pages

## How to Extend

To apply this pattern to new pages:

1. Import layout components: `import { PageLayout, PageHeader, PageToolbar, PageContent } from "@/components/layout"`
2. Wrap page content with `PageLayout`
3. Add header with `PageHeader`
4. Add optional toolbar with `PageToolbar`
5. Wrap content with `PageContent`
6. Use CSS variables for custom padding if needed

Example:

```tsx
export default function MyPage() {
  return (
    <PageLayout>
      <PageHeader 
        title="Page Title"
        subtitle="Optional subtitle"
        action={<Button>Action</Button>}
      />
      <PageToolbar
        left={<Filter />}
        right={<ViewToggle />}
      />
      <PageContent>
        {/* Content here */}
      </PageContent>
    </PageLayout>
  );
}
```

## Design System Alignment

All changes follow the design system defined in `design.md`:

✅ Layout & Spacing (Section 4)
- 8px baseline grid maintained
- Consistent padding and gaps
- Tonal layers preserved

✅ Typography (Section 3)
- Urbanist font maintained
- Font sizes preserved
- Line heights and letter spacing consistent

✅ Components (Section 7)
- All existing component styling preserved
- Only layout structure changed
- No color or style modifications

✅ Motion (Section 8)
- No motion changes
- Existing animations preserved

## Next Steps (Recommendations)

1. Test responsiveness at 1440px+ (desktop-first as per design)
2. Consider mobile layouts (Phase 2) using the same token system
3. Apply same pattern to `/timer` and `/report` pages
4. Create similar layout wrapper for modals/dialogs if needed
5. Document layout tokens in component library or Storybook

