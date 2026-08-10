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
  accent_border: "color-mix(in srgb, #0066ff 28%, #1e1f20)"
  card_gradient_start: "#05080d"
  card_gradient_mid: "#061733"
  card_gradient_end: "#072a63"
  success: "#10b981"
  warning: "#3b82f6"
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
    fontSize: "14px"
    fontWeight: "500"
    height: "36px"
  button_primary_rounded:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text_primary}"
    padding: "{spacing.sm} {spacing.lg}"
    rounded: "{rounded.xl}"
    fontSize: "14px"
    fontWeight: "500"
    height: "36px"
  button_secondary_rounded:
    backgroundColor: "{colors.surface_raised}"
    textColor: "{colors.text_primary}"
    padding: "{spacing.sm} {spacing.lg}"
    rounded: "{rounded.xl}"
    border: "1px solid {colors.border_subtle}"
    fontSize: "14px"
    fontWeight: "500"
    height: "36px"
  button_ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text_primary}"
    padding: "{spacing.sm} {spacing.md}"
    rounded: "{rounded.xl}"
    borderOnHover: "1px solid {colors.border}"
  button_toolbar_icon:
    backgroundColor: "{colors.surface_raised}"
    textColor: "{colors.text_primary}"
    padding: "{spacing.sm}"
    rounded: "{rounded.xl}"
    height: "40px"
    width: "40px"
    fontSize: "14px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  card_raised:
    backgroundColor: "{colors.surface_raised}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  card_gradient_blue:
    background: "linear-gradient(180deg, {colors.card_gradient_start} 0%, {colors.card_gradient_mid} 58%, {colors.card_gradient_end} 100%)"
    border: "1px solid {colors.accent_border}"
    rounded: "{rounded.xl}"
    padding: "{spacing.3xl}"
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
| **Warning** | `#3b82f6` | Caution | Time warnings and attention states that should stay within the blue product accent family |
| **Error** | `#ef4444` | Destructive | Error messages, alerts, invalid states |
| **Info** | `#3b82f6` | Informational | Info tooltips, secondary status |

**Key Principle:** All colors are defined as **CSS custom properties** in `src/app/globals.css`. Never hardcode hex values in components.

### Blue Gradient Card Treatment

Use the reference-card treatment for authentication, onboarding, and high-emphasis brand panels. It creates depth with a near-black top surface and a saturated blue base, while keeping the Flowmate value proposition and interactive accents in the same blue family.

| Token | Value | Usage |
|-------|-------|-------|
| **Card Gradient Start** | `#05080d` | Top of large promotional/onboarding cards |
| **Card Gradient Mid** | `#061733` | Middle depth transition |
| **Card Gradient End** | `#072a63` | Bottom blue glow/depth |
| **Accent Border** | `color-mix(in srgb, #0066ff 28%, #1e1f20)` | Card outline and internal dividers |

**Rules:**
- Card shell: `rounded-xl`, `overflow-hidden`, `border` using Accent Border.
- Background: `linear-gradient(180deg, #05080d 0%, #061733 58%, #072a63 100%)`.
- Internal separators: 1px lines using Accent Border at 18-20% strength.
- Optional CTA: full-width `rounded-full`, `bg-accent`, hover `bg-accent-hover`.
- Text hierarchy: white/primary for titles and CTA text, muted/secondary for descriptions and feature copy.
- Do not use orange or amber as a brand accent. The legacy project color key named `amber` is a data compatibility alias and must render as blue in UI.

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

### Layout Tokens & Spacing Hierarchy

The layout is structured using a consistent set of CSS variables defined in `src/app/globals.css`:

| Variable | Value | Purpose |
|----------|-------|---------|
| `--content-padding-x` | 32px | Left/right padding for main content areas |
| `--content-padding-y` | 32px | Top/bottom padding for main content areas |
| `--content-max-width` | 1200px | Maximum width for centered layouts (Dashboard) |
| `--content-gap` | 32px | Gap between major layout elements (header → content) |
| `--header-gap` | 24px | Gap inside the header |
| `--toolbar-gap` | 16px | Gap inside search and view filters |
| `--section-gap` | 16px | Vertical gap between content sections |
| `--component-gap` | 12px | Horizontal/vertical gap between small components |

### Layout Primitives

**Sidebar + Main Content:**
- Sidebar is fixed at **204px wide**, dark, contains navigation.
- Main content uses **flex: 1** to fill remaining space, constrained to `--content-max-width` with `--content-padding-x` and `--content-padding-y` padding.

**Cards & Sections:**
- Use `Surface` background (`#0f1011`) for primary cards.
- Add padding of **16px** (`lg`) for breathing room.
- Rounded corners: **12px** for standard cards, **16px** for larger panels.

**Gaps & Margins:**
- Between sections: `gap-5` or `gap-6` (20-24px)
- Within sections: `gap-3` to `gap-4` (12–16px)
- List items: `gap-2` or `gap-3` (8–12px)

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

#### **Primary (Pill)**
```
Background: {accent} (#0066ff)
Text: {text-primary}
Padding: sm lg (8px 16px)
Rounded: full (9999px) - pill shape
Height: 36px (h-9)
Font: 14px, 500
Hover: {accent-hover} (#3385ff)
```

#### **Primary Rounded (Square)**
```
Background: {accent} (#0066ff)
Text: {text-primary}
Padding: sm lg (8px 16px)
Rounded: xl (12px) - rounded square
Height: 36px (h-9)
Font: 14px, 500
Hover: {accent-hover} (#3385ff)
```

#### **Secondary (Pill)**
```
Background: Surface Raised (#191a1b)
Text: {text-primary}
Padding: sm lg (8px 16px)
Rounded: full (9999px) - pill shape
Height: 36px (h-9)
Border: 1px solid {border-subtle}
Hover: Surface Mid + {border} color
```

#### **Secondary Rounded (Square)**
```
Background: Surface Raised (#191a1b)
Text: {text-primary}
Padding: sm lg (8px 16px)
Rounded: xl (12px) - rounded square
Height: 36px (h-9)
Border: 1px solid {border-subtle}
Hover: Surface Mid + {border} color
```

#### **Toolbar Icon**
```
Background: Surface Raised (#191a1b)
Text: {text-primary}
Padding: sm (8px)
Rounded: xl (12px) - rounded square
Height: 40px (h-9)
Width: 40px (w-9)
Font: 14px
Border: 1px solid {border-subtle}
Hover: Surface Mid + {border} color
```

#### **Ghost**
```
Background: transparent
Text: {text-primary}
Padding: sm md (8px 12px)
Rounded: xl (12px)
Hover: Surface Raised bg + subtle border
```

#### **Subtle**
```
Background: None / transparent
Text: {text-muted}
Padding: xs sm (4px 8px)
Hover: {text-primary} + light bg shift
```

#### **Size Variants**
| Size | Height | Usage |
|------|--------|-------|
| `xs` | 28px (h-7) | Compact, dense UIs |
| `sm` | 32px (h-8) | Small actions, tags |
| `default` | 36px (h-9) | Standard buttons |
| `lg` | 40px (h-10) | Primary CTAs, emphasis |
| `icon-xs` | 28px | Small icon buttons |
| `icon-sm` | 32px | Compact icon buttons |
| `icon` | 36px | Standard icon buttons |

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

### Auth Brand Gradient Card

Use this card style on the sign-in/sign-up left panel. It should contain Flowmate brand messaging, not pricing or plan content.

```
Background: linear-gradient(180deg, #05080d 0%, #061733 58%, #072a63 100%)
Border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border-subtle))
Rounded: xl (20px)
Padding: 40px desktop, 16px mobile if reused on small screens
Header: Flowmate logo mark + wordmark
Dividers: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border-subtle))
Hero: H1 value proposition + short supporting copy
Feature rows: accent check icon, Label/Body S text, secondary color
```

**Content pattern:**
- Brand: `Flowmate`.
- H1: `Task-linked time tracking for focused work`.
- Supporting copy: `Track time effortlessly. Stay organized. Ship faster.`
- Feature list:
  - `Connect time to specific tasks`
  - `Visualize productivity patterns`
  - `Bill accurately with confidence`

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

#### Sliding Tab Indicator
Slide active line smoothly below navigation tabs instead of snapping.

```css
.tab-indicator-sliding {
  position: absolute;
  bottom: 0;
  height: 2px;
  background-color: var(--accent);
  transition: left 300ms var(--ease-out), width 300ms var(--ease-out);
}
```

*Rule:* Measure the active tab button's `offsetLeft` and `clientWidth` in a `useEffect` loop or on state changes and apply them as inline styles (`left`, `width`) on the absolute indicator.

#### Satisfying Task Completion (Delayed Transition)
Prevent tasks from instantly vanishing from view when checked off.

```css
/* Checkbox check pop animation */
@keyframes checkbox-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
.animate-checkbox-pop {
  animation: checkbox-pop 200ms var(--ease-out) both;
}

/* Strikethrough draw animation */
.task-title-completed {
  text-decoration: line-through;
  color: var(--text-faint);
  transition: color 300ms var(--ease-out);
}
```

*Rule:* When clicking check:
1. Trigger local item state `isCompleting: true`.
2. Play the checkbox check-pop, draw the checkmark, and fade the task title color with a line-through.
3. Wait **350ms** before triggering the Zustand store update. This gives the user immediate visual reward before updating list state.

#### Sidebar active indicator
Sidebar items use a subtle active state entry transition rather than popping in.

```css
@keyframes active-nav-indicator {
  from { opacity: 0; transform: translateY(-50%) scaleY(0.4); }
  to { opacity: 1; transform: translateY(-50%) scaleY(1); }
}
.animate-nav-indicator {
  animation: active-nav-indicator 200ms var(--ease-out) both;
}
```

*Rule:* On hover, nav items shift slightly: `hover:translate-x-0.5`. On click, apply a small tactile feedback: `active:scale-[0.98]`.
*Rule:* Active nav item shows a vertical line with scale-Y entry.

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
- Store state in `src/lib/store-supabase.ts`.
- Define types in `src/lib/types.ts`.
- Keep component state local (React hooks) for UI-only state (form inputs, modals).

### Data Fetching

- Data is managed through the Supabase-backed Zustand store in `src/lib/store-supabase.ts`.
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
  --accent-border: color-mix(in srgb, var(--accent) 28%, var(--border-subtle));
  --card-gradient-start: #05080d;
  --card-gradient-mid: #061733;
  --card-gradient-end: #072a63;

  --success: #10b981;
  --warning: #3b82f6;
  --error: #ef4444;
  --info: #3b82f6;

  /* Motion */
  --motion-fast: 120ms;
  --motion-base: 180ms;
  --motion-slow: 240ms;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

  /* Layout Tokens */
  --content-padding-x: 32px;
  --content-padding-y: 32px;
  --content-max-width: 1200px;

  --content-gap: 32px;
  --header-gap: 24px;
  --toolbar-gap: 16px;
  --section-gap: 16px;
  --component-gap: 12px;
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
    store-supabase.ts     # Supabase-backed Zustand global state
    types.ts              # TypeScript types
    format.ts             # Formatting utilities

public/
  assets/
    icons/                # SVG icons from Figma
```

---

## 15. Dropdown Module

All dropdown menus across the app **must** follow this spec exactly. Do not deviate.

### Visual Spec

```
Background:    bg-surface-raised  (#191a1b)
Border:        border border-border-subtle  (1px solid #1e1f20)
Border radius: rounded-lg  (16px)
Shadow:        shadow-2xl
Z-index:       z-[100]
Overflow:      overflow-hidden
Position:      absolute, top-full mt-1  (below trigger)
               OR bottom-full mb-2  (above trigger, e.g. inside modals)
Min width:     match trigger or content, never narrower than 160px
```

### Animation

Use **only** `.animate-dropdown-in` (160ms, ease-out). No other class. No inline animation.

```css
/* globals.css — do not add more dropdown keyframes */
@keyframes dropdown-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-dropdown-in {
  animation: dropdown-in 160ms var(--ease-out) both;
}
```

### Search Input (when dropdown has search)

```
Container:   border-b border-border-subtle
Input:       w-full px-3 py-2 text-[12px] bg-transparent outline-none
             text-text-primary placeholder:text-text-faint
```

### Item Row

```
Padding:     px-2.5 py-1.5
Font:        text-[12px] text-text-primary
Radius:      rounded-md  (on each item, not container)
Hover:       hover:bg-surface-mid
Selected:    bg-accent text-white font-medium
Danger item: text-error hover:bg-error/10
```

### Scroll Area (when items overflow)

```
max-h-[240px] overflow-y-auto p-1
```

### Section Group Header (optional)

```
text-[11px] font-semibold uppercase tracking-[0.05em] text-text-faint
px-2.5 pt-2 pb-1
```

### Trigger Button

```
Use existing Button variants (ghost, secondary) or a pill control.
Caret icon: rotate-180 when open.
Never use a raw <select> element styled as a dropdown — only for native OS selects.
```

### Close Behavior

- Click outside → close (mousedown listener on document, check `ref.current.contains`)
- Escape key → close
- Item select → close

### Rules

- **Never** use `box-shadow` inline for dropdowns — use `shadow-2xl` class.
- **Never** use `rounded-[10px]` or other arbitrary radii — use `rounded-lg`.
- **Never** use CSS variables inline (`style={{ border: "1px solid var(--border-subtle)" }}`) — use Tailwind token classes (`border border-border-subtle`).
- **Never** add a new animation class for dropdowns — `animate-dropdown-in` is canonical.
- **Always** set `z-[100]` so dropdowns float above modals and panels.

---

## 16. Overlay Module

Overlays cover two patterns: **centered modals** and **side panels**. Both share a backdrop.

---

### 16a. Centered Modal

Use the `<Modal>` primitive (`src/components/ui/modal.tsx`) as the shell. Only customize content inside.

#### Backdrop

```
fixed inset-0 z-50
background: bg-base/60 backdrop-blur-sm
animation: animate-fade-in  (opacity only, 180ms)
```

#### Modal Container

```
background:    bg-surface-raised
border:        border border-border-subtle
border-radius: rounded-xl  (20px)
shadow:        shadow-2xl
padding:       p-2xl  (24px)
animation:     animate-modal-in  (220ms, scale+translateY)
max-width:     max-w-[560px] w-full
```

#### Animation

```css
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.98) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-modal-in { animation: modal-in 220ms var(--ease-out) both; }
```

#### Header

```
flex items-center justify-between
padding: px-xl py-md  (or px-6 py-4)
border-bottom: border-b border-border-subtle
title: text-[17px] font-semibold tracking-[-0.01em] text-text-primary
close button: w-8 h-8 rounded-[8px] hover:bg-surface-mid text-text-faint
```

#### Body

```
flex flex-col gap-md px-xl pt-xl pb-lg
overflow-y-auto if content may overflow
```

#### Footer

```
flex items-center justify-between gap-sm px-xl py-lg
border-top: border-t border-border-subtle
```

#### Keyboard / Close

- Escape → close
- Backdrop click → close
- Never close on content click (stopPropagation on modal container)

---

### 16b. Side Panel (Right Drawer)

Used for detail views (TaskDetailSidebar, etc.). Slides in from the right.

#### Backdrop

```
fixed inset-0 z-40  (one level below panel)
No background color — click-to-close only, transparent.
```

#### Panel Container

```
fixed right-0 top-0 bottom-0
width: w-96  (384px)
z-index: z-50
background: bg-surface-raised
border-left: border-l border-border-subtle
shadow: -4px 0 24px rgba(0,0,0,0.2)
animation: panel-animate  (200ms translateX slide-in from right)
flex flex-col overflow-hidden
```

#### Animation

```css
@keyframes panel-slide-in {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}
.panel-animate { animation: panel-slide-in 0.2s var(--ease-out) both; }
```

#### Panel Header

```
flex items-start justify-between p-6 shrink-0
border-bottom: border-b border-border-subtle
title: text-[17px] font-semibold text-text-primary
close button: w-8 h-8 rounded-[8px] hover:bg-surface-mid text-text-muted
```

#### Panel Body

```
flex-1 overflow-y-auto
content: flex flex-col gap-6 p-6
section labels: text-[11px] uppercase tracking-wider font-medium text-text-faint
```

#### Panel Footer

```
shrink-0 p-5
border-top: border-t border-border-subtle
buttons: flex gap-3, h-9 rounded-[8px] text-[13px] font-medium
  secondary: bg-surface-mid text-text-secondary
  primary:   bg-accent text-white
```

#### Keyboard / Close

- Escape → close
- Backdrop click → close
- Panel content click → no close (stopPropagation not needed — backdrop is behind panel)

---

### Z-Index Stack

| Layer | z-index | Element |
|-------|---------|---------|
| Base content | 0 | Page, time grid |
| Sticky headers | 10 | Floating now-indicator |
| Side panel backdrop | 40 | Click-to-close transparent layer |
| Side panel / Modal | 50 | Panel, modal container |
| Dropdown | 100 | All dropdown menus |
| Command palette | 100 | Global command menu |

**Rule:** Dropdowns always win over panels. Panels win over page content.

---

## 17. Last Updated

- **Version**: 1.1
- **Date**: 2026-05-07
- **Status**: Production-ready for MVP phase
