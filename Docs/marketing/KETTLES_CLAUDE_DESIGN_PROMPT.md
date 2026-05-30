# Build Prompt — Kettles Landing Page (for Claude / Claude Design)

> Paste everything below the line into Claude. It is a complete, self-contained brief — Claude does not have the repo, so all tokens, copy, and the mascot are included inline. Goal: one-shot a production-quality marketing landing page.

---

## ROLE

You are a senior product designer + front-end engineer. Build a **single-page marketing landing page** for a product called **Kettles**. Output one self-contained artifact (React + Tailwind via CDN, or a single HTML file with inline `<style>` — your choice, but it must run standalone with no external build step). Use only inline SVG for graphics. No external images, no icon libraries, no placeholder lorem.

Make it feel like a **premium, modern SaaS site** (Linear / Vercel / Raycast tier) — calm, confident, quietly playful. Avoid generic AI-template look: no center-everything-stack, no rainbow gradients, no clip-art.

## PRODUCT

**Kettles** — task-linked time tracking + project/task management + Pomodoro + analytics, for **solo freelancers and small teams juggling multiple clients**.

**The idea:** most time trackers feel like surveillance. Kettles reframes focused work as a cozy daily ritual — you "put the kettle on," the timer brews, and every minute condenses into an accurate, billable record. A blue kettle companion keeps you company: it steams while you focus, whistles when a brew is done, and wanders off ("lost kettle") when you go cold.

**One-liner:** *Put the kettle on. Get to work.*

**Why it wins:** the **ledger** — every brew rolls into an invoice-ready weekly report. Once it's the source of truth for your income, it's sticky.

**Real features (use these, don't invent):** task-linked timer (time locks to the task), projects & clients, Kanban (Todo→Doing→Done), Pomodoro brews + breaks, 7/14-day calendar, weekly reports with per-client hours + PDF export, native desktop app + floating always-on-top mini-timer, browser extension, cross-device sync, and the kettle companion (streaks).

## REAL BRAND ASSETS (these exist — match them, don't invent a new logo)

The real Kettles logo is a **geometric blue kettle** (stacked bars + a trapezoid spout). Use the exact inline SVG below as the logo mark in the nav, favicon, and footer. The wordmark is this mark + the word "Kettles" in Urbanist-style bold. The mark is **always blue** — never recolor it.

**Real logo mark (paste verbatim — this is the production asset):**
```svg
<svg viewBox="0 0 128.52 119.83" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kettles">
  <rect fill="#85c2ff" x="40.28" y="8.04"  width="20.92" height="48.34" transform="translate(82.95 -18.53) rotate(90)"/>
  <rect fill="#85c2ff" x="40.28" y="49.87" width="20.92" height="48.34" transform="translate(124.78 23.31) rotate(90)"/>
  <rect fill="#85c2ff" x="43.95" y="67.12" width="13.57" height="48.34" transform="translate(142.03 40.56) rotate(90)"/>
  <polygon fill="#3385ff" points="26.93 63.59 53.62 42.67 101.96 42.67 101.96 63.59 26.93 63.59"/>
</svg>
```
- Wordmark text color: `#f7f8f8` on dark sections, `#081828` on light sections. Mark stays blue on both.
- For the **animated hero/CTA kettle** (steaming, floating), use the friendlier mascot SVG in the "THE MASCOT" section below — keep it visually consistent with this mark (same blue `#85c2ff` body, `#3385ff` accents, geometric feel).
- Real product also ships: a sprite-driven desktop pet (states: idle, working, waving, jumping, failed, waiting, review), a kettle-whistle sound, and OS app icons. The marketing page doesn't need those files, but the kettle identity must match.

## HARD CONSTRAINTS (do not violate)

1. **Blue palette only.** No orange, no amber, no warm accent — anywhere, including the mascot and steam. The kettle is **blue**. Warmth is emotional (copy + soft off-white sections + rounded shapes), never chromatic.
2. **Fonts:** headings + UI = **Urbanist** (600 weight for headings); numbers/timers = a monospace (**Geist Mono**, fallback `ui-monospace`). Load Urbanist from Google Fonts.
3. **Respect `prefers-reduced-motion`** — swap all motion for static states.
4. **Accessible:** WCAG AA contrast, visible focus rings (2px accent), alt/aria on the mascot, semantic HTML.
5. Single artifact, runs standalone.

## DESIGN TOKENS (use exactly)

```css
/* Colors — dark base, blue accent */
--base:            #08090a;  /* page canvas / dark sections */
--surface:         #0f1011;  /* cards */
--surface-raised:  #191a1b;  /* nested cards, inputs */
--border-subtle:   #1e1f20;
--border:          #2a2b2c;

--text-primary:    #f7f8f8;
--text-secondary:  #d0d6e0;
--text-muted:      #8a8f98;
--text-faint:      #62666d;

--accent:          #0066ff;  /* ALL CTAs, links, focus, active */
--accent-hover:    #3385ff;
--accent-dim:      rgba(0,102,255,0.15);

--steam-blue:      #85c2ff;  /* kettle body + steam wisps */
--kettle-glow:     rgba(51,133,255,0.20);

--success:         #10b981;

--light-section:   #FAFAFA;  /* soft off-white alt sections */
--light-ink:       #111111;  /* text on light sections */

/* Blue gradient panel for hero/CTA cards */
--grad: linear-gradient(180deg, #05080d 0%, #061733 58%, #072a63 100%);

/* Client dots (variety, all cool-toned) */
--c1:#0D9488; --c2:#4F46E5; --c3:#BE185D; --c4:#0066ff;

/* Motion */
--ease-out: cubic-bezier(0.16,1,0.3,1);
--motion-fast:120ms; --motion-base:180ms; --motion-slow:240ms;
```

**Type scale:** Display 60–72px / H1 40 / H2 32 / H3 24 / Body-L 20 / Body 18 / Body-S 16 / Label 14. Tight tracking on headings (-0.02em), generous line-height (1.5–1.6) on body.

**Layout:** 8px grid. Max content width ~1200px (full-bleed bands allowed). Radius: cards 16–20px, pills `9999px`, never sharp corners. Elevation via background shift (base→surface→raised), not heavy shadows. Section vertical padding 96–128px desktop.

**Section rhythm:** alternate **dark** (hero, features, ledger, final CTA) with **soft off-white `#FAFAFA`** (problem, anti-burnout, social proof) for pacing. CTAs stay blue in both.

## THE MASCOT — blue kettle (render inline, animated)

A simple, friendly **geometric blue kettle** with rising steam. Use this as the base SVG and animate it (float + breathe + steam). Scale it up for hero/CTA.

```html
<div class="kettle" aria-label="Kettles mascot — a steaming blue kettle">
  <!-- steam -->
  <svg class="steam" width="40" height="36" viewBox="0 0 40 36" fill="none" aria-hidden="true">
    <path class="s1" d="M12 34 C8 26 16 22 12 14 C9 8 12 2 12 2" stroke="#85c2ff" stroke-width="2.4" stroke-linecap="round"/>
    <path class="s2" d="M22 34 C26 26 18 22 22 14 C25 8 22 2 22 2" stroke="#85c2ff" stroke-width="2.4" stroke-linecap="round"/>
    <path class="s3" d="M31 34 C27 27 34 22 31 15 C28 9 31 4 31 4" stroke="#85c2ff" stroke-width="2.4" stroke-linecap="round"/>
  </svg>
  <!-- kettle body: rounded pot + spout + handle + lid knob -->
  <svg class="pot" width="120" height="104" viewBox="0 0 120 104" fill="none" aria-hidden="true">
    <path d="M22 44 H88 a8 8 0 0 1 8 8 v18 a26 26 0 0 1 -26 26 H40 a26 26 0 0 1 -26 -26 V52 a8 8 0 0 1 8 -8 Z" fill="#85c2ff"/>
    <path d="M88 52 L112 40 L112 56 L92 64 Z" fill="#3385ff"/>            <!-- spout -->
    <path d="M30 44 a30 16 0 0 1 50 0 Z" fill="#3385ff"/>                 <!-- lid -->
    <circle cx="55" cy="24" r="6" fill="#85c2ff"/>                        <!-- knob -->
    <path d="M40 28 q-22 6 -22 26" stroke="#3385ff" stroke-width="6" fill="none" stroke-linecap="round"/> <!-- handle -->
    <circle cx="44" cy="72" r="4" fill="#0a1830"/><circle cx="62" cy="72" r="4" fill="#0a1830"/> <!-- eyes -->
  </svg>
</div>
```

```css
.kettle{position:relative;display:inline-flex;flex-direction:column;align-items:center;filter:drop-shadow(0 6px 18px var(--kettle-glow));}
.kettle .pot{animation:float 2.6s ease-in-out infinite, breathe 2.6s ease-in-out infinite;transform-origin:center bottom;}
@keyframes float{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-6px) rotate(1.5deg)}}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
.steam{margin-bottom:-6px}
.steam path{opacity:0}
.s1{animation:steam 2.2s ease-out infinite}
.s2{animation:steam 2.2s ease-out .6s infinite}
.s3{animation:steam 2.2s ease-out 1.2s infinite}
@keyframes steam{0%{opacity:0;transform:translateY(6px) scaleX(1)}25%{opacity:.7}80%{opacity:.2}100%{opacity:0;transform:translateY(-22px) scaleX(.6)}}
@media (prefers-reduced-motion:reduce){.kettle .pot,.steam path{animation:none}.steam path{opacity:.35}}
```

**States to also depict** (vary the SVG, keep identity): *Lost kettle* (tipped/grey-blue, no steam, small "?" ) for the companion section; *whistling* (extra steam burst) for the final CTA.

## PAGE SECTIONS — in order, with exact copy

Build all of these. Use the supplied copy verbatim (you may lightly tighten but keep meaning + voice).

### 1. Sticky nav
Left: the real kettle mark (SVG from "REAL BRAND ASSETS" above) + wordmark **"Kettles"**. Center: Features · How it works · Pricing · Download. Right: "Sign in" (ghost) + **"Start brewing — free"** (blue pill). Transparent over hero → solid `--surface` + 1px `--border-subtle` on scroll. Tiny steam wisp animates from logo on hover.

### 2. Hero (dark)
- Eyebrow: `TASK-LINKED TIME TRACKING`
- H1 (Display): **"Put the kettle on. Get to work."**
- Sub (Body-L, muted): "Task-linked time tracking that turns deep work into a cozy daily ritual — every minute brews into an accurate, billable record."
- CTAs: **"Download for desktop"** (blue) + **"Try the web app"** (secondary).
- Right: animated kettle beside a **mini-timer mockup** — a small floating window showing `25:00` in mono counting up, an active task name, and a project dot. Give it the `--grad` panel treatment.
- Trust strip under CTAs: "Trusted by freelancers tracking **120,000+** focused hours" + 4 client dots (`--c1..c4`).
- Effects: drifting steam, mono digits count up on load, subtle parallax on the mockup, magnetic primary CTA.

### 3. Problem (soft off-white)
- H2: **"Your logged hours don't match your real work."**
- Three cards:
  1. **Underbilling** — "Forgotten minutes are unpaid minutes."
  2. **The distraction tax** — "You worked all day. Where did it go?"
  3. **Broken self-trust** — "If the log lies, you stop trusting it."
- Effect: cards stagger-rise on scroll (y:24→0, 80ms stagger).

### 4. The wedge — 3 steps (dark)
- H2: **"Three steps. One honest record."**
- Steps: **1 Pick a task** → **2 The kettle boils** (timer runs, steam builds) → **3 Time locks to the task** (no guessing, no backfilling).
- Signature effect: as the user scrolls this section, the kettle progresses empty → filling → boiling → whistle → a checkmark "time locked". Each step label lights up on its keyframe. (Use scroll-driven JS; static fallback for reduced-motion.)

### 5. Features bento (dark)
Asymmetric bento grid (1 large + 6 small). Each card = icon (inline SVG), title, one line, and a tiny live micro-demo.
- **Large:** Task-linked timer + Kanban — animate a card sliding Todo→Doing→Done.
- Projects & clients (colored dots).
- Pomodoro brews (a filling ring).
- Calendar (mini 7-day strip).
- Reports (bars growing per client).
- Desktop + mini-timer (floating window).
- Extension + sync (a "Synced" badge).
- Hover: card lifts `translateY(-4px)` + 1px accent border glow.

### 6. The Kettle companion (dark, the differentiator)
- H2: **"You're not focusing alone."**
- Body: "Your kettle stays warm while you work, whistles when a brew is done, and wanders off when you go cold. Keep your streak — keep the kettle on."
- Show three mascot states side by side: **brewing** (steaming) · **idle** (calm) · **lost** (tipped). Add a streak counter that ticks up (e.g. "🔥 12-day streak" → render flame as blue, not orange — use a blue spark/steak chip).
- Effect: mascot reacts to cursor proximity.

### 7. The ledger (dark)
- H2: **"The source of truth for your income."**
- Body: "Every brew rolls up into a weekly report — hours per client, ready to invoice. Export to PDF in one click."
- Visual: a report card — horizontal bars per client (use client dots), a big total in mono, and an "Export PDF" button.
- Effect: numbers count up, bars grow from 0 on scroll.

### 8. Anti-burnout (soft off-white)
- H2: **"Focus that doesn't burn you out."**
- Body: "Brews and breaks. Gentle whistles. No red-alert surveillance. A tool that respects your attention."
- Calm, slow, minimal motion.

### 9. Social proof (soft off-white)
- 3 short testimonials (a designer, a developer, a writer) — write believable, specific quotes about accurate billing + the kettle being a delight.
- Stat band (mono numbers): "120k+ hours tracked" · "8,000+ invoices backed" · "31-day longest streak".

### 10. Pricing (dark)
Monthly/annual toggle. Three cards:
- **Free** — solo, 1 client, core timer + tasks + 7-day reports.
- **Pro** *(most popular — lift + accent glow)* — unlimited clients/projects, full reports + PDF export, desktop app + mini-timer, kettle skins.
- **Team** — shared projects, team reports, admin, priority support.
Leave prices as `$—` placeholders with "/mo". CTA on each: "Start brewing".

### 11. Comparison (dark)
Table: **Kettles vs Toggl vs RescueTime**. Rows: task-linked accuracy · companion/motivation · calm, surveillance-free UX · per-client billing · desktop mini-timer · survives tab close. Highlight Kettles column; animate check/cross icons in.

### 12. FAQ (soft off-white)
Accordion (spring expand). Questions: "Is it task-linked or just a stopwatch?" · "Does the timer survive a tab close?" (yes — saved to the cloud) · "Desktop only?" (web + Windows desktop now) · "Can I export for invoicing?" (yes, PDF) · "Is my data private?" · "What's the kettle?".

### 13. Final CTA (dark, `--grad` panel)
- H2: **"The kettle's ready when you are."**
- Big whistling kettle + full blue steam + soft blue glow pulse.
- CTA: **"Start brewing — free."** + small "No card required."
- Effect: magnetic button; steam intensifies near cursor.

### 14. Footer (dark)
Columns: Product · Resources · Company · Legal. Social row. "Made for focused work." Theme toggle (light/dark). Small changelog link.

## MOTION & EFFECTS (apply throughout)
- Buttons: hover `translateY(-1px)`, active `scale(0.97)`, 120ms `--ease-out`.
- Section reveals: staggered fade-rise, ≤24px travel, on scroll into view.
- GPU props only (`transform`, `opacity`). No layout animation. Never exceed ~300ms.
- Links: underline draws left→right on hover.
- All of §2/§4/§6/§7 effects above. Everything degrades to static under `prefers-reduced-motion`.
- Perf: lazy-init below-fold animations, pause off-screen.

## VOICE (for any copy you add)
Calm, plain-spoken, lightly playful. Tea/kettle words used sparingly as flavor (brew, steam, whistle, keep the kettle on, gone cold) — never gimmicky, never hustle-bro.

## DELIVERABLE
One runnable artifact: the full responsive landing page (mobile → desktop), dark + soft-off-white sections, animated blue kettle, all 14 sections with the copy above, working scroll/hover effects, reduced-motion + AA accessibility. Polished and shippable.
