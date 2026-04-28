---
version: "1.0"
name: "Flowmate Dashboard – Linear-Inspired Dark UI"
colors:
  base: "#08090a"
  surface: "#0f1011"
  surface_raised: "#191a1b"
  surface_mid: "#161718"
  surface_glass: "rgba(28, 29, 30, 0.7)"
  border: "#2a2b2c"
  border_subtle: "#1e1f20"
  text_primary: "#f7f8f8"
  text_secondary: "#d0d6e0"
  text_muted: "#8a8f98"
  text_faint: "#62666d"
  accent: "#0066ff"
  accent_hover: "#3385ff"
  accent_dim: "rgba(0, 102, 255, 0.15)"
  success: "#10b981"
  warning: "#f59e0b"
  error: "#ef4444"
  info: "#3b82f6"
typography:
  display:
    fontFamily: "Urbanist"
    fontSize: 62
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  h1:
    fontFamily: "Urbanist"
    fontSize: 40
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  h2:
    fontFamily: "Urbanist"
    fontSize: 32
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  h3:
    fontFamily: "Urbanist"
    fontSize: 24
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body_l:
    fontFamily: "Urbanist"
    fontSize: 20
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  body_m:
    fontFamily: "Urbanist"
    fontSize: 18
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  body_s:
    fontFamily: "Urbanist"
    fontSize: 16
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.01em"
  label:
    fontFamily: "Urbanist"
    fontSize: 14
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
  label_sm:
    fontFamily: "Urbanist"
    fontSize: 12
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
  label_xs:
    fontFamily: "Urbanist"
    fontSize: 10
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
  mono:
    fontFamily: "Geist Mono"
    fontSize: 13
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
rounded:
  xs: "4px"
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  "2xl": "24px"
  "3xl": "32px"
  "4xl": "40px"
  "5xl": "56px"
  "6xl": "64px"
components:
  sidebar:
    width: "204px"
    backgroundColor: "{colors.base}"
    textColor: "{colors.text_primary}"
    borderRight: "1px solid {colors.border_subtle}"
    padding: "{spacing.lg}"
  button_primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text_primary}"
    padding: "{spacing.sm} {spacing.lg}"
    rounded: "{rounded.full}"
    fontSize: "13px"
    fontWeight: "500"
  button_ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text_primary}"
    padding: "{spacing.sm} {spacing.md}"
    rounded: "{rounded.md}"
    borderOnHover: "1px solid {colors.border}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  card_raised:
    backgroundColor: "{colors.surface_raised}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.surface_mid}"
    borderColor: "{colors.border_subtle}"
    textColor: "{colors.text_primary}"
    padding: "{spacing.sm} {spacing.md}"
    rounded: "{rounded.md}"
    fontSize: "13px"
  nav_item:
    padding: "{spacing.xs} {spacing.sm}"
    rounded: "{rounded.sm}"
    fontSize: "13px"
    activeBackground: "{colors.surface_mid}"
    activeTextColor: "{colors.text_primary}"
---

# Design System: Flowmate Dashboard

## 1. Visual Theme & Atmosphere

Flowmate's design system is **Linear-inspired** with a refined, "architectural" aesthetic. It prioritizes **precision, density, and functionality** while using **background-driven elevation** to reduce visual noise.

The UI evokes **quiet professionalism** — it should feel like a tool that gets out of your way and lets you focus on deep work. The dark theme reduces eye strain during long sessions. Spacing is generous (not cramped), typography is clear and modern (Urbanist), and interactions feel responsive and spring-based.

**Brand Personality:**
- Trustworthy (for tracking real work time)
- Focused (minimal visual noise)
- Premium (refined, not overdone)
- Responsive (spring animations, not linear)

---

## 2. Color Palette & Roles

### Background & Surface Hierarchy

The color system uses **four tonal layers** to create visual hierarchy without heavy borders:

| Token | Hex | Role | Usage |
|-------|-----|------|-------|
| **Base** | `#08090a` | Canvas | Main background, full-page areas |
| **Surface** | `#0f1011` | Primary Elevation | Cards, sections, panels (first lift) |
| **Surface Raised** | `#191a1b` | Secondary Elevation | Nested content, buttons, inputs (second lift) |
| **Surface Mid** | `#161718` | Tertiary Elevation | Slightly elevated, used sparingly |

### Text & Content

| Token | Hex | Role | Usage |
|-------|-----|------|-------|
| **Primary** | `#f7f8f8` | Main Text | Headlines, body text, primary labels |
| **Secondary** | `#d0d6e0` | Sub-text | Descriptions, secondary info, hints |
| **Muted** | `#8a8f98` | De-emphasized | Metadata, timestamps, disabled states |
| **Faint** | `#62666d` | Lowest Contrast | Placeholder text, very subtle labels |

### Accent (Interactive)

| Token | Hex | Role | Usage |
|-------|-----|------|-------|
| **Accent** | `#0066ff` | Primary CTA | Buttons, links, focus states, active indicators |
| **Accent Hover** | `#3385ff` | Hover State | Lighter blue for interactive hover feedback |
| **Accent Dim** | `rgba(0,102,255,0.15)` | Background | Subtle active/selected backgrounds |

### Status Colors

| Token | Hex | Role | Usage |
|-------|-----|------|-------|
| **Success** | `#10b981` | Positive State | Done/completed tasks, success messages |
| **Warning** | `#f59e0b` | Caution | Time warnings, important events, amber accents |
| **Error** | `#ef4444` | Destructive | Error messages, alerts, invalid states |
| **Info** | `#3b82f6` | Informational | Info tooltips, secondary status |

**Key Principle:** All colors are defined as **CSS custom properties** in `src/app/globals.css`. Never hardcode hex values in components.

---

## 3. Typography: Urbanist (110% Scale)

**Typefaces:**
- **Urbanist** (Primary): Headlines, labels, all UI text. Geometric, modern, premium.
- **Geist Mono** (Code/Mono): Timers, code snippets, monospace content.
- **Inter** (Fallback): Deprecated; do not use.

### Typography Scale

All sizes are scaled **~110%** from Linear baseline for superior legibility and comfort.

| Role | Size | Weight | Line Height | Letter Spacing | Usage |
|------|------|--------|-------------|----------------|-------|
| Display | 62px | 600 | 1.1 | -0.02em | Hero headlines, major page titles |
| H1 | 40px | 600 | 1.2 | -0.015em | Page titles, section headers |
| H2 | 32px | 600 | 1.25 | -0.01em | Subsection headers |
| H3 | 24px | 600 | 1.4 | -0.01em | Card titles, form sections |
| Body L | 20px | 400 | 1.6 | 0 | Large body copy |
| Body M | 18px | 400 | 1.5 | 0 | Standard body text |
| Body S | 16px | 400 | 1.5 | 0.01em | Secondary body, descriptions |
| Label | 14px | 500 | 1.4 | 0.02em | Interactive labels, nav items |
| Label SM | 12px | 500 | 1.4 | 0.02em | Small labels, metadata |
| Label XS | 10px | 500 | 1.4 | 0.02em | Tiny labels, badges |

**Principles:**
- Urbanist's geometric clarity creates a modern, tech-forward feel.
- Generous line heights (1.4–1.6) improve readability in dense layouts.
- Negative letter spacing (Headlines) creates a tighter, premium look.
- Positive letter spacing (Labels) improves scannability.

---

## 4. Layout & Spacing

### Grid System: 8px Base Unit

All spacing strictly adheres to an **8px baseline grid**:

| Token | Size | Usage |
|-------|------|-------|
| xs | 4px | Icon gaps, tiny offsets |
| sm | 8px | Component padding, small gaps |
| md | 12px | Card padding, moderate gaps |
| lg | 16px | Section padding, list item gaps |
| xl | 20px | Container padding, group gaps |
| 2xl | 24px | Larger sections |
| 3xl | 32px | Group separations |
| 4xl | 40px | Major layout divisions |
| 5xl | 56px | Large vertical separations |
| 6xl | 64px | Full-page margins |

### Layout Primitives

**Sidebar + Main Content:**
- Sidebar is fixed at **204px wide**, dark, contains navigation.
- Main content uses **flex: 1** to fill remaining space.
- Sidebar has vertical sections: Top (profile + search + nav), Bottom (settings + help).

**Cards & Sections:**
- Use `Surface` background (`#0f1011`) for primary cards.
- Add padding of **16px** (lg) for breathing room.
- Rounded corners: **12px** for standard cards, **16px** for larger panels.

**Gaps & Margins:**
- Between sections: **gap-5** (Tailwind = 20px)
- Within sections: **gap-3** to **gap-4** (12–16px)
- List items: **gap-2** or **gap-3** (8–12px)

---

## 5. Elevation & Depth

### Visual Hierarchy

Depth is achieved through **background shifts**, not shadows or borders.

1. **Base Layer** (`#08090a`): Full-page background.
2. **Raised Layer** (`#0f1011`): Cards, panels, sections.
3. **Elevated Layer** (`#191a1b`): Buttons, inputs, nested content.
4. **Glass Layer** (`rgba(28,29,30,0.7)`): Overlays, modals (with `backdrop-blur`).

Each layer is **slightly lighter** than the previous, creating clear depth without visual clutter.

**No explicit borders** — instead, rely on tonal shifts. Example:
- Don't: `border-2 border-gray-700`
- Do: `bg-surface-raised` inside `bg-surface`

---

## 6. Shapes & Corners

### Border Radius Scale

| Token | Size | Usage |
|-------|------|-------|
| xs | 4px | Minimal, for small UI elements |
| sm | 6px | Search bars, small buttons |
| md | 12px | Standard cards, inputs |
| lg | 16px | Large panels, modals |
| xl | 20px | Extra-large containers |
| full | 9999px | Fully rounded (pills, badges) |

**Principles:**
- Rounded corners create a **modern, soft aesthetic** (no sharp 90° corners).
- Use `rounded-full` for interactive pills (buttons, badges, chips).
- Standard cards: `rounded-lg` (16px).
- Smaller components: `rounded-md` (12px).

---

## 7. Components

### Sidebar

```
Width: 204px (fixed, shrink-0)
Background: Base (#08090a)
Border: Right edge, 1px solid {border-subtle}
Padding: lg (16px)
```

**Sections (vertical stacks):**
- **User Profile**: Avatar (30×30px, bg-surface-mid, rounded-md) + name + workspace switcher.
- **Search**: Input with magnifying glass icon, 31px height, rounded-lg.
- **Primary Nav**: Overview (active, bg-surface-mid), divider, Notes/Calendar/Tasks/Files/Templates, divider, Notebook/Tags/SharedWithMe.
- **Bottom Nav**: Settings, Help Center.

**Nav Item Styling:**
- Padding: `px-2 py-1`
- Font: Label (14px, 500)
- Background (active): `#1f1f1f`
- Color (inactive): `{text-muted}`, hover → `{text-primary}` + light bg
- Icon: 18×18px

### Dashboard Header

```
Padding: xl (20px) top/bottom
Display: flex, items-center, justify-between
Gap: xl (20px)
```

**Left side:**
- Heading (H2): "Good morning, Kole"
- Subtext (Body S, muted): "Saturday, March 7"

**Right side:**
- Three action buttons (rounded-full, bg-surface-raised, gap-2):
  - Icon (18×18px) + Label (13px)
  - "New Note", "New Event", "New Task"

### Section Cards

```
Background: Surface (#0f1011)
Rounded: lg (16px)
Padding: lg (16px)
Border: None (rely on background shift)
```

**Types:**

#### **Notes Section**
- Header: Title (H3) + Tabs (Recents / Suggested)
- Content: Horizontal scroll of note cards
- Each note card: 211×204px, Surface Raised bg, rounded-tl-lg/rounded-tr-lg
- Fade overlay at bottom (gradient-to-t)

#### **Calendar Section**
- Header strip: Surface Mid bg, contains Title + View tabs (Today / Week / Month)
- Time slots: 8 am – 2 pm labels
- Grid: 7 vertical dividers, 2 horizontal dividers
- Event card: Yellow background (`#ffdd55` at 10% opacity), yellow text, 152×132px

#### **Tasks Section**
- Header: Title + "+ Add task" button
- Task items: Checkbox (icon toggle) + text + source tag
- Dividers between items (1px, border-subtle)
- Add task placeholder at bottom

#### **Scratch Pad**
- Empty section, just a title for now

### Buttons

#### **Primary**
```
Background: {accent} (#0066ff)
Text: {text-primary}
Padding: sm lg (8px 16px)
Rounded: full (9999px)
Font: Label (14px, 500)
Hover: {accent-hover} (#3385ff)
```

#### **Secondary / Ghost**
```
Background: Surface Raised
Text: {text-primary}
Padding: sm md (8px 12px)
Rounded: md (12px)
Hover: Lighter Surface Raised, subtle border
```

#### **Subtle**
```
Background: None / transparent
Text: {text-muted}
Padding: xs sm (4px 8px)
Hover: {text-primary} + light bg shift
```

### Inputs & Searchbox

```
Background: Surface Mid (#161718)
Border: 1px solid {border}
Text: {text-primary}
Placeholder: {text-muted}
Padding: sm md (8px 12px)
Rounded: md (12px)
Font: Body S (16px)
Focus: Accent border, no shadow
```

### Badges & Chips

```
Background: Surface Raised
Text: {text-secondary}
Padding: xs sm (4px 8px)
Rounded: full (9999px)
Font: Label SM (12px)
Status variant: Use status colors
```

---

## 8. Motion System

> **Principle:** Motion is functional, not decorative. Goal: fast, precise, responsive — not animated.

### Core Philosophy

Motion must:
- Communicate state change
- Guide attention
- Preserve spatial continuity
- Improve perceived performance

If motion does not serve a purpose → remove it.

### Motion Tokens

```css
:root {
  --motion-fast: 120ms;
  --motion-base: 180ms;
  --motion-slow: 240ms;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Global Rules

**1. No Linear Easing** — never use `transition: all 0.3s linear`. Always use `--ease-out`, `--ease-in`, or `--ease-standard`.

**2. Duration Standards**

| Use Case | Duration |
|----------|----------|
| Hover feedback | 100–140ms |
| Small UI changes | 140–180ms |
| Standard transitions | 180–220ms |
| Panels / modals | 200–260ms |

Never exceed 300ms.

**3. GPU-Friendly Properties Only**

- Allowed: `transform`, `opacity`
- Avoid: `width`, `height`, `top`/`left`, `box-shadow`

**4. Subtle Over Expressive** — no bounce, no overshoot, no exaggerated motion. If it's noticeable, it's too much.

### Component Motion Patterns

#### Buttons

```css
.button {
  transition: background var(--motion-fast) var(--ease-out),
              transform var(--motion-fast) var(--ease-out);
}
.button:hover { transform: translateY(-1px); }
.button:active { transform: scale(0.97); }
```

Instant response (<50ms). No delay. No bounce-back.

#### Hover States (General)

```css
.hover-item {
  transition: background var(--motion-fast) var(--ease-out),
              opacity var(--motion-fast) var(--ease-out);
}
```

Prefer color/opacity over movement.

#### Dropdown / Autocomplete

```css
.dropdown { animation: dropdown-in 160ms var(--ease-out); }
.dropdown-exit { animation: dropdown-out 120ms var(--ease-in); }

@keyframes dropdown-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes dropdown-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(2px); }
}
```

#### Modal / Panel

```css
.modal { animation: modal-in 220ms var(--ease-out); }
.modal-exit { animation: modal-out 160ms var(--ease-in); }
.modal-overlay { transition: opacity var(--motion-base) var(--ease-out); }

@keyframes modal-in {
  from { opacity: 0; transform: scale(0.98) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes modal-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.98); }
}
```

#### Task Row

```css
.task-row {
  transition: background var(--motion-fast) var(--ease-out);
}
/* Reordering (FLIP) */
.task-row-moving {
  transition: transform var(--motion-base) var(--ease-standard);
}
```

#### Tabs (Linear Style)

```css
.tab-indicator {
  transition: transform var(--motion-base) var(--ease-out),
              width var(--motion-base) var(--ease-out);
}
```

Indicator slides. No fade switching. No bounce.

#### Token Insertion (Task / Project Tag)

```css
.token { animation: token-in 140ms var(--ease-out); }

@keyframes token-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
```

#### Page Load / Content Reveal

```css
.fade-in { animation: fade-in 180ms var(--ease-out); }

@keyframes fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Optional stagger */
.item { animation-delay: calc(var(--index) * 20ms); }
```

#### Timer Start

```css
.timer-bar { transition: transform var(--motion-base) var(--ease-out); }
.timer-active { transform: translateY(-2px); }
```

### Motion Hierarchy

| Priority | Element |
|----------|---------|
| High | User-triggered actions (click, input) |
| Medium | Navigation changes |
| Low | Background / passive elements |

### Interaction States

**Buttons:**
- Hover: Background shift + `translateY(-1px)`
- Active: `scale(0.97)`
- Disabled: `opacity-50`
- Focus: Accent border ring (2px, offset 2px)

**Nav Items:**
- Active: Surface Mid background, text-primary
- Hover: Light background shift, text-primary
- Inactive: text-muted

**Inputs:**
- Focus: Border shifts to accent color
- Error: Border shifts to error color
- Disabled: opacity-50, cursor-not-allowed

### What NOT to Do

- No bounce animations
- No animating layout properties (width, height, top, left)
- No delay before interaction response
- No decorative motion
- No overusing scale effects
- No animating everything at once

> Motion should be felt, not noticed. If the app feels fast and nothing stands out — you did it right.

---

## 9. Responsive Design

### Breakpoints

- **Mobile (<768px)**: Single column, bottom nav (out of scope for MVP)
- **Tablet (768–1024px)**: Sidebar collapses to icons (out of scope for MVP)
- **Desktop (>1024px)**: Full 2-column layout (sidebar + main)

### Current Implementation

The dashboard is **desktop-optimized**. Mobile support is **Phase 2**.

---

## 10. Figma MCP Integration Rules

### Required Workflow for Figma-Driven Changes

**ALWAYS follow these steps in order:**

1. **Get Design Context**: Call `get_design_context(fileKey, nodeId)` to fetch structured representation.
2. **Get Screenshot**: Call `get_screenshot(fileKey, nodeId)` for visual reference.
3. **Download Assets**: Extract asset URLs from Figma payload; save to `public/assets/` or use directly.
4. **Translate to Project Stack**: Convert React+Tailwind output to Flowmate conventions.
5. **Map Colors**: Replace hardcoded hex with CSS variables (`var(--base)`, `var(--accent)`, etc.).
6. **Reuse Components**: Check `src/components/` for existing Button, Card, Input, etc.; extend, don't duplicate.
7. **Validate**: Compare final UI to Figma screenshot for 1:1 visual parity.

### Asset Handling

- **IMPORTANT:** Use asset URLs from Figma MCP server directly if available.
- **IMPORTANT:** Do NOT install new icon libraries; all icons should come from Figma.
- If offline, download PNG/SVG to `public/assets/icons/` and reference locally.
- SVG icons should be wrapped in a reusable `<Icon>` component for size/color control.

### Component Organization

- **UI Components**: `src/components/` (Button, Card, Input, Sidebar, etc.)
- **Feature Components**: `src/components/` (Dashboard, TaskList, Calendar, etc.)
- **Layout Primitives**: Inline in `src/components/` or extracted to `src/components/layout/`

### Styling Rules

- **IMPORTANT:** Never hardcode colors; always use CSS custom properties (`var(--color-*)`).
- **IMPORTANT:** Use Tailwind utilities for layout/spacing; avoid hardcoded pixel values.
- **IMPORTANT:** Map Figma tokens to `tailwind.config.ts` colors and `src/app/globals.css` variables.
- **Arbitrary Values:** Only use Tailwind arbitrary values (e.g., `bg-[#1f1f1f]`) if color is not in the design system.

### Typography

- **IMPORTANT:** Use `font-sans` (Urbanist via CSS variable) for all text.
- **IMPORTANT:** Use semantic size tokens (e.g., `text-sm`, `text-base`, `text-lg`) where possible.
- **Letter Spacing:** Apply via class utility (e.g., `tracking-tighter` for -0.01em).
- **Font Weight:** Use Tailwind weight utilities (e.g., `font-semibold` for 600).

### State Management

- Use **Zustand** for global state (tasks, clients, sessions, theme).
- Store state in `src/lib/store.ts`.
- Define types in `src/lib/types.ts`.
- Keep component state local (React hooks) for UI-only state (form inputs, modals).

### Data Fetching

- Phase 1 (MVP): Data stored in **localStorage** via Zustand (no backend).
- Phase 2+: API routes in `src/app/api/` for backend integration.
- Never fetch data in `render()` — use `useEffect()` or async server components (App Router).

---

## 11. Do's and Don'ts

### Do

✅ **Use Urbanist font** for all UI text (defined in `globals.css`).

✅ **Reference CSS variables** for colors: `var(--base)`, `var(--surface)`, `var(--accent)`, `var(--text-primary)`, etc.

✅ **Adhere to the 8px grid** for spacing (use Tailwind's default scale: 4, 8, 12, 16, 20, 24, 32, 40, etc.).

✅ **Use Tailwind utilities** for layout and spacing (flex, grid, gap, p, m, etc.).

✅ **Extend components** from `src/components/` instead of duplicating; keep the library DRY.

✅ **Map Figma tonal layers** to CSS variables: `--base`, `--surface`, `--surface-raised`.

✅ **Use spring animations** for transitions (standard, snappy, soft presets).

✅ **Keep component props simple** and semantic (variant, size, disabled, etc.).

✅ **Test responsiveness** at 1440px viewport (desktop-first, mobile support is Phase 2).

### Don't

❌ **Don't hardcode colors** — always use CSS custom properties.

❌ **Don't use Inter font** — it's deprecated; use Urbanist exclusively.

❌ **Don't use inline styles** — use Tailwind utilities or CSS modules.

❌ **Don't install new icon libraries** — all icons come from Figma assets.

❌ **Don't skip the Figma MCP workflow** — always get context + screenshot before implementing.

❌ **Don't use linear easing** — use spring-based animations.

❌ **Don't hardcode spacing** — use Tailwind's spacing scale (gap-1, px-4, py-6, etc.).

❌ **Don't create deeply nested component structures** — keep it flat and composable.

❌ **Don't duplicate utility classes** — extract to Tailwind @apply or component-level CSS if pattern repeats.

❌ **Don't forget accessibility** — interactive elements need ARIA labels, colors must meet WCAG AA contrast.

---

## 12. Accessibility & Performance

### Accessibility (WCAG 2.1 AA)

- All buttons and interactive elements must have visible focus states (ring-accent, 2px offset).
- Color is never the only indicator of state; use icons, labels, or text changes.
- Icon-only buttons must have `aria-label` or `title` attribute.
- Form inputs need associated `<label>` elements.
- Use semantic HTML: `<button>`, `<a>`, `<nav>`, `<main>`, `<section>`, etc.

### Performance

- **Images**: Lazy-load with Next.js `<Image>` component; avoid unnecessary re-renders.
- **Icons**: Use SVG components from `src/components/icons/` (lightweight, scalable).
- **State**: Keep component state local; only lift to Zustand if shared across unrelated components.
- **Bundles**: No external icon libraries; all assets from Figma.

---

## 13. Token Reference (CSS Variables)

Add these to `src/app/globals.css`:

```css
:root {
  /* Colors */
  --base: #08090a;
  --surface: #0f1011;
  --surface-raised: #191a1b;
  --surface-mid: #161718;
  --border: #2a2b2c;
  --border-subtle: #1e1f20;

  --text-primary: #f7f8f8;
  --text-secondary: #d0d6e0;
  --text-muted: #8a8f98;
  --text-faint: #62666d;

  --accent: #0066ff;
  --accent-hover: #3385ff;
  --accent-dim: rgba(0, 102, 255, 0.15);

  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* Motion */
  --motion-fast: 120ms;
  --motion-base: 180ms;
  --motion-slow: 240ms;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 14. File Structure

```
src/
  app/
    globals.css           # CSS variables, fonts, base styles
    layout.tsx            # Root layout
    page.tsx              # Home page (Dashboard)
  components/
    Dashboard.tsx         # Main dashboard layout
    Sidebar.tsx           # Sidebar navigation
    Icon.tsx              # Icon wrapper (from Figma assets)
    Button.tsx            # Reusable button component
    Card.tsx              # Card component
    Input.tsx             # Input/search component
    Badge.tsx             # Badge/pill component
  lib/
    store.ts              # Zustand global state
    types.ts              # TypeScript types
    format.ts             # Formatting utilities

public/
  assets/
    icons/                # SVG icons from Figma
```

---

## 15. Last Updated

- **Version**: 1.0 (Alpha)
- **Date**: 2026-04-27
- **Status**: Production-ready for MVP phase
