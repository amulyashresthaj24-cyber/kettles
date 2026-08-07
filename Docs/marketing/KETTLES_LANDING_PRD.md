# Kettles — Landing & Marketing Site PRD

> Brand: **Kettles** (codebase name: Flowmate). The kettle is the mascot and the metaphor.
> Product: task-linked time tracking + project/task management + Pomodoro + analytics for solo freelancers and small teams.
> Surfaces: Web app, Tauri desktop app (Windows), floating mini-timer, browser extension, Supabase sync.
> This doc covers: (1) Positioning & PRD, (2) Page structure, (3) Theme guide, (4) Marketing effects + growth guide.

---

## 0. The big idea

Most time trackers feel like surveillance. Kettles reframes focused work as a **warm daily ritual**: you "put the kettle on," the timer brews, and every minute condenses into an accurate, billable record. A kettle companion keeps you company — it thrives when you focus and wanders off ("lost kettle") when you go cold.

**One-liner:** *Put the kettle on. Get to work.*

**Positioning statement:**
For solo freelancers and small teams juggling multiple clients, **Kettles** is the task-linked time tracker that turns focus into a cozy ritual — every minute brews into an accurate, billable ledger, watched over by a kettle companion instead of a surveillance dashboard.

**Why it wins (defensibility):** the **ledger**. Once Kettles is the source of truth for your income, it's sticky.

---

## 1. Product summary (what we're selling)

| Pillar | What it does | Marketing hook |
|--------|--------------|----------------|
| **Task-linked timer** | Pick a task → timer runs → time locks to that task | "Logged time that matches real work" |
| **Projects & clients** | Organize work by client/initiative | "Every brew sorted by client" |
| **Tasks & Kanban** | Todo → Doing → Done board | "Watch work move" |
| **Pomodoro sessions** | Focus brews + breaks; session complete = receipt | "Focus in brews, not marathons" |
| **Calendar** | 7/14-day task view | "See the week at a glance" |
| **Reports** | Weekly hours per client; export | "Bill with confidence" |
| **Kettle companion** | Mascot that reacts to focus/streaks | "A tool that roots for you" |
| **Desktop + mini-timer** | Native app + floating always-on-top timer | "Brews on top of everything" |
| **Browser extension + sync** | Capture + sync across surfaces | "Your ledger, everywhere" |

**Target users:**
- **Primary:** solo freelancers with 2+ clients (designers, devs, writers, consultants).
- **Secondary:** small agencies / 2–6 person teams.
- **Tertiary:** focus-seeking knowledge workers (anti-burnout, deep-work crowd).

**Core jobs-to-be-done:**
1. "Trust that my logged hours = real work, so I stop underbilling."
2. "Make focusing feel good, not punishing."
3. "Show a client exactly what they're paying for."

**Competitive frame:** Toggl / Clockify / RescueTime / Harvest = utilitarian or surveillance-flavored. Kettles = **calm, cozy, companion-driven** + task-linked accuracy. Differentiator axis: *warmth + trust*, not feature count.

---

## 2. Site map

```
/                 Landing (primary conversion page)
/features         Deep feature tour (per-pillar sections)
/how-it-works     The 3-step ritual + the ledger explainer
/kettle           The mascot / gamification story (emotional page)
/pricing          Free / Pro / Team — NOT BUILT; no billing exists (see 3.10)
/download         Desktop, web, extension
/blog             SEO + deep-work content
/changelog        Shipped updates (trust + retention)
/about            Story + mission
/legal/*          Privacy, Terms, DPA
```

The **/** landing page is the focus of this PRD. Other pages reuse its section components.

---

## 3. Landing page structure (section by section)

Each section below = goal, content, copy direction, and the marketing effect (see §5 for effect specs).

### 3.1 — Top nav (sticky)
- **Left:** Kettle mark + "Kettles" wordmark.
- **Center:** Features · How it works · Pricing · Download · Blog.
- **Right:** "Sign in" (ghost) + "Start brewing — free" (primary pill).
- **Behavior:** transparent over hero → solid `surface` with subtle border on scroll. Mini steam wisp animates from the logo on hover.

### 3.2 — Hero
- **Goal:** state the promise + dual CTA in <5s.
- **Headline (Display 62px):** "Put the kettle on. Get to work."
- **Subhead (Body L):** "Task-linked time tracking that turns deep work into a warm daily ritual — every minute brews into an accurate, billable record."
- **CTAs:** primary "Download for desktop" · secondary "Try the web app".
- **Visual:** animated kettle mid-boil with rising steam, beside a product mockup (the floating **mini-timer** showing a live count + the active task name in Geist Mono).
- **Trust strip:** "Trusted by freelancers tracking 120,000+ focused hours" + small client-color dots.
- **Effect:** steam particle drift, timer ticking up, subtle parallax on mockup (§5.1).

### 3.3 — Problem / agitation ("the cold cup")
- **Goal:** make them feel the pain.
- **Headline:** "Your logged hours don't match your real work."
- **Three pains (cards):**
  1. **Underbilling** — "Forgotten minutes are unpaid minutes."
  2. **The distraction tax** — "You worked all day. Where did it go?"
  3. **Broken self-trust** — "If the log lies, you stop trusting it."
- **Effect:** cards fade/rise on scroll; a faint "draining timer" animation (§5.2).

### 3.4 — The wedge (3-step ritual)
- **Goal:** show the core loop instantly.
- **Headline:** "Three steps. One honest record."
- **Steps (horizontal, animated):**
  1. **Pick a task** — choose what you're working on.
  2. **The kettle boils** — timer runs, steam builds.
  3. **Time locks to the task** — no guessing, no backfilling.
- **Effect:** scroll-scrubbed sequence; the kettle fills→boils→whistles as the user scrolls through steps (§5.3). This is the signature scroll moment.

### 3.5 — Feature bento grid
- **Goal:** breadth without a wall of text.
- **Layout:** asymmetric bento (1 large + several small cards).
  - **Large:** Task-linked timer + Kanban (animated drag of a card Todo→Doing→Done).
  - Projects & clients (colored client dots).
  - Pomodoro brews (session ring).
  - Calendar (mini 7-day strip).
  - Reports (bar chart of hours/client).
  - Desktop + mini-timer (floating window).
  - Browser extension + sync (synced badge).
- **Effect:** each card has a live micro-demo on hover/in-view (§5.4).

### 3.6 — The Kettle companion (emotional differentiator)
- **Goal:** the part nobody else has — make them smile.
- **Headline:** "You're not focusing alone."
- **Body:** "Your kettle stays warm while you work, whistles when a brew is done, and wanders off when you go cold. Keep your streak — keep the kettle on."
- **Visual:** the three mascot states side by side — **happy/steaming** (focused), **idle/cooling** (break), **lost** (abandoned focus → `LostKettleAnimation`).
- **Effect:** mascot reacts to cursor proximity; streak counter ticks (§5.5).

### 3.7 — The ledger (trust / billing)
- **Goal:** land the defensible value: accurate billing.
- **Headline:** "The source of truth for your income."
- **Body:** "Every brew rolls up into a weekly report — hours per client, ready to invoice. Export to PDF in one click."
- **Visual:** report screenshot (bars per client, total hours, export button). Uses `jspdf` export as proof point.
- **Effect:** numbers count up; bars grow on scroll (§5.6).

### 3.8 — Deep-work ritual (anti-burnout)
- **Goal:** values alignment — calm, not hustle.
- **Headline:** "Focus that doesn't burn you out."
- **Body:** brews + breaks, gentle whistles, no red-alert surveillance. "A tool that respects your attention."
- **Effect:** calm, slow fade; reduced motion; soft off-white light section to contrast the dark hero.

### 3.9 — Social proof
- **Goal:** credibility.
- **Content:** 3 freelancer testimonials (designer, dev, writer) + stat band ("hours tracked", "invoices backed", "streaks kept").
- **Effect:** marquee of avatars; numbers count up once in view.

### 3.10 — Pricing
> ⚠️ **Unbuilt roadmap, not spec.** There is no billing code, no plan gating, and no
> `Team` surface in the app. Every tier below is aspirational. As shipped, the landing
> page states one thing: free while in beta, no limits. Do not reintroduce a price or a
> tier into marketing copy until billing exists — the earlier "Pro from $8/mo" line was
> removed for exactly this reason.
>
> Also note `Team` implies shared ownership, and every RLS policy in
> `supabase/migrations/` is currently `auth.uid() = user_id`. Teams is a data-model
> change across all tables, not a pricing page.

- **Goal:** convert.
- **Tiers (proposed, none implemented):**
  - **Free** — solo, 1 client, core timer + tasks + 7-day reports.
  - **Pro** ($/mo) — unlimited clients/projects, full reports + PDF export, desktop + mini-timer, kettle skins.
  - **Team** ($/seat) — shared projects, team reports, admin, priority support.
- **Effect:** monthly/annual toggle; "most popular" Pro card lifts + glows on hover.

### 3.11 — Comparison
- **Goal:** position against incumbents.
- **Table:** Kettles vs Toggl vs RescueTime — rows: task-linked accuracy, companion/motivation, calm UX, per-client billing, desktop mini-timer, surveillance-free.
- **Effect:** check/cross icons animate in; Kettles column highlighted.

### 3.12 — FAQ
- Is it task-linked or just a stopwatch? · Does the timer survive a tab close? (yes — DB-persisted) · Desktop only? (web + Windows desktop now) · Can I export for invoicing? · Is my data private? · What's the kettle?
- **Effect:** accordion, spring expand.

### 3.13 — Final CTA
- **Headline:** "The kettle's ready when you are."
- **CTA:** "Start brewing — free." + small "No card required."
- **Visual:** big kettle, full blue steam, soft blue glow.
- **Effect:** magnetic button; steam intensifies near cursor (§5.7).

### 3.14 — Footer
- Product · Resources · Company · Legal columns. Social. "Made for focused work." Theme toggle. Status/changelog link.

---

## 4. Theme guide (marketing site)

The marketing site **extends the product's Linear-inspired dark system** (see `Docs/design.md`). Critically: **the actual Kettles mascot is blue, not orange** — `KettleAnimation.tsx` renders the kettle body and steam in `#85c2ff` with a blue drop-shadow, and the design system has a hard rule: *"Do not use orange or amber as a brand accent."* So warmth here is **emotional, not chromatic** — it comes from soft off-white light sections, rounded forms, the companion, and the tea/brew language, while every color stays in the blue family. No ember, no amber, anywhere.

### 4.1 Brand personality
Cozy · Trustworthy · Calm · Premium · Quietly playful. Cozy in a *cool-blue, late-night-focus* way (steam in a quiet room), not a warm-orange way. The opposite of frantic hustle-culture dashboards.

### 4.2 Color

**Primary (matches product):**
| Token | Hex | Use |
|-------|-----|-----|
| Base | `#08090a` | Dark section canvas, hero |
| Surface | `#0f1011` | Cards |
| Surface raised | `#191a1b` | Nested cards, inputs |
| Accent | `#0066ff` | All CTAs, links, focus rings |
| Accent hover | `#3385ff` | Hover |
| Text primary | `#f7f8f8` | Headlines |
| Text secondary | `#d0d6e0` | Body |
| Text muted | `#8a8f98` | Meta |
| Success | `#10b981` | "Done", positive stats |

**Steam / mascot layer (blue — matches the real `KettleAnimation`):**
| Token | Hex | Use |
|-------|-----|-----|
| Steam light | `#FAFAFA` | Alternating off-white light sections (anti-burnout, deep-work) for soft contrast against the dark |
| Steam blue | `#85c2ff` | Kettle body + steam wisps (exact value from `KettleAnimation.tsx`) |
| Kettle glow | `rgba(51,133,255,0.20)` | Soft blue drop-shadow / glow behind the mascot (from the component) |
| Steam tint | `rgba(0,102,255,0.08)` | Faint accent wash behind mascot / hero |

**Client accent dots (reuse product palette):** `#0D9488` (teal) · `#4F46E5` (indigo) · `#BE185D` (pink) · plus blue `#0066ff`. (The product also exposes the full project-color set in `src/lib/constants.ts`; note `amber` there is a legacy alias that renders blue.)

**Section rhythm:** alternate **dark** (hero, features, ledger, final CTA) with **soft off-white** (problem, deep-work, social proof) for pacing and a calmer, cozier feel. Keep CTAs blue in both. Warmth is created by *light + space + roundness + copy*, not by hue.

> Rule: there is **no warm/ember accent**. Every surface, button, link, focus state, steam wisp, and glow lives in the blue/neutral family. This keeps the marketing site 1:1 with the app and respects the hard "no amber/orange" design rule.

### 4.3 Typography
- **Display / headings:** Urbanist 600, tight tracking (-0.02em display, -0.015em h1).
- **Body:** Urbanist 400, line-height 1.5–1.6.
- **Numbers / timers / "code" moments:** **Geist Mono** — reuse the product's signature big-mono timer as a hero element (e.g. `25:00` count-up).
- Scale matches `design.md` (Display 62 / H1 40 / H2 32 / H3 24 / Body L 20 / Body M 18 / Body S 16 / Label 14).

### 4.4 Layout & shape
- 8px grid; max content width ~1200px (wider full-bleed bands allowed for hero/CTA).
- Radius: cards `rounded-lg/xl` (16–20px), pills `rounded-full`, never sharp 90°.
- Elevation via background shift (base → surface → raised), not heavy borders/shadows.
- Generous vertical rhythm: section padding 96–128px desktop.

### 4.5 Mascot usage (the Kettle)
- **States:** Brewing (steaming, happy) · Idle (cooling, calm) · Lost (`LostKettleAnimation`, wandered off) · Loading (`KettleLoader`).
- **Visual fact:** the kettle is **blue** (`#85c2ff`) with a soft blue glow (`drop-shadow(0 4px 14px rgba(51,133,255,0.2))`) and floats/breathes (`kettleFloat` + `kettleBreathe`, 2.4s loops). Steam wisps rise on staggered delays. Marketing assets must match this identity.
- **Pet system:** the desktop overlay is data-driven — a sprite atlas (`192×208` cells, `8×9` sheet) read from `public/pet/pet.config.json`, driven by `petSignal({ event, phase, source, detail })` (e.g. `timerStart`/`running`). Richer pet states exist for the desktop companion; the marketing site can showcase these animated states.
- **Do:** use as emotional punctuation (hero, companion section, final CTA, empty states, loaders). Keep proportions consistent. Soft blue glow only.
- **Don't:** overuse on every section, anthropomorphize into mascot-spam, recolor it warm, or let any non-blue glow touch UI controls.
- Assets live in `public/pet/`; kit in `Docs/pet-mascot-kit.md`; in-app components: `KettleAnimation`, `LostKettleAnimation`, `KettleLoader`.

### 4.6 Motion (extends `design.md` motion system)
- In-product motion stays subtle/functional. **Marketing motion can be more expressive** (scroll storytelling) but must respect `prefers-reduced-motion` (swap to static states).
- Easing: `--ease-out: cubic-bezier(0.16,1,0.3,1)`. GPU props only (`transform`, `opacity`). No layout animation.
- Steam = the signature motion primitive (drifting, looping, GPU particles or SVG).

### 4.7 Imagery & components to reuse
- Product mockups: mini-timer window, Kanban board, weekly report, calendar strip.
- Component primitives carry over: pill buttons, bento cards, badges, the blue gradient card (`#05080d → #061733 → #072a63`) for the hero/CTA panels.

---

## 5. Marketing effects & motion guide

Recommended stack: **GSAP + ScrollTrigger** for scroll storytelling; CSS transitions for hover/micro. (GSAP skills available in this environment.) All effects degrade gracefully and honor `prefers-reduced-motion`.

### 5.1 Hero — living steam + count-up
- Steam: looping SVG/particle drift (`transform: translateY` + `opacity`), 8–12s loops, randomized offsets.
- Mini-timer mockup: Geist Mono digits **count up** on load; parallax (mockup moves ~20px slower than scroll).
- Magnetic primary CTA (translate toward cursor within ~40px radius).

### 5.2 Problem — the draining cup
- Pain cards stagger in (`y: 24 → 0`, opacity, 80ms stagger) as they enter viewport.
- Background: a faint timer that "drains" (a ring depleting) to evoke lost time.

### 5.3 The wedge — signature scroll-scrub kettle ⭐
- **Pin** the kettle, **scrub** its state to scroll: empty → filling → boiling → whistle → "time locked" check.
- Sync the 3 step labels so each lights up as its keyframe hits.
- This is the page's hero moment — the kettle metaphor made literal. Build with ScrollTrigger `scrub: true` + a sprite/Lottie or staged SVG.

### 5.4 Feature bento — live micro-demos
- Cards animate their content **in view** and replay on hover: Kanban card slides Todo→Doing→Done; report bars grow; Pomodoro ring fills; client dots pop in.
- Hover: card lifts (`translateY(-4px)`) + accent border glow.

### 5.5 Kettle companion — reactive mascot
- Mascot eyes/steam follow cursor proximity; "lost" state triggers if you scroll past without interacting (playful).
- Streak counter ticks up; gentle whistle SFX on click (muted by default, opt-in).

### 5.6 Ledger — number tickers + growing bars
- Hours/client bars grow from 0 with `--ease-out`; totals count up (`IntersectionObserver` triggered, once).
- "Export PDF" button does a tiny paper-slide micro-animation on hover.

### 5.7 Final CTA — full steam
- Steam intensity scales with cursor distance to the button; button is magnetic; soft blue glow (`rgba(51,133,255,0.2)`) pulses slowly (3s loop, low opacity).

### 5.8 Global micro-interactions
- Buttons: hover `translateY(-1px)`, active `scale(0.97)` (matches product).
- Links: underline draws left→right.
- Section reveals: 80–120ms staggered fade-rise, never more than 24px travel.
- Theme toggle: smooth surface cross-fade.

### 5.9 Performance budget
- LCP < 2.5s; defer mascot/steam JS; lazy-load below-fold demos.
- Steam via transform/opacity only; cap particle count; pause animations off-screen.
- Ship static fallbacks for `prefers-reduced-motion` and low-power.

---

## 6. Messaging system (copy bank)

**Taglines (pick 1 primary):**
- ⭐ "Put the kettle on. Get to work."
- "Focus, brewing."
- "Deep work, warmly tracked."
- "Time tracking that roots for you."

**Value props (3-pillar):**
1. **Accurate** — "Time locks to the task. No guessing, no backfilling."
2. **Warm** — "A companion, not a surveillance dashboard."
3. **Billable** — "Every brew rolls into an invoice-ready ledger."

**Voice:** warm, calm, plain-spoken, lightly playful. Tea/kettle metaphors used sparingly (brew, steam, whistle, keep the kettle on, gone cold) — flavor, not gimmick. Never hustle-bro.

**CTA bank:** "Start brewing — free" · "Put the kettle on" · "Track your first brew" · "Get the desktop app".

**Email capture hook:** "Get the deep-work newsletter — one warm idea a week."

---

## 7. Growth & launch guide

**SEO targets:** "task time tracking for freelancers", "pomodoro time tracker desktop", "time tracking per client", "focus timer with reports", "calm time tracker (not surveillance)". Blog clusters: freelance billing, deep work, anti-burnout, Pomodoro.

**Launch channels:**
- Product Hunt ("the cozy time tracker with a kettle companion" — mascot is the hook).
- Indie/freelance communities (r/freelance, designer/dev Slacks, Indie Hackers).
- X/LinkedIn deep-work & freelance creators; short clips of the scroll-scrub kettle + mini-timer.
- Show HN (desktop app + DB-persisted timer angle).

**Acquisition loops:**
- Free tier → habit (streaks) → Pro upsell at billing moment (PDF export, unlimited clients).
- Kettle skins as a fun, low-cost upsell + shareability.
- Weekly report = natural "share with client" surface (subtle Kettles footer).

**Conversion levers on the page:** dual CTA (desktop/web), no-card free tier, social proof band, comparison table, FAQ that kills objections (privacy, tab-close persistence).

**Key metrics:** landing→signup CVR, signup→first-brew activation, D7 streak retention, free→Pro conversion, PDF export usage.

---

## 8. Build notes (for implementation)

- Reuse product tokens from `src/app/globals.css` + `tailwind.config.ts` so the site matches the app 1:1 (blue accent, Urbanist, Geist Mono).
- Mascot assets: `public/pet/`. Loaders: `KettleLoader`. States: `KettleAnimation`, `LostKettleAnimation`.
- Mockups: screenshot the real mini-timer, Kanban, report, calendar — don't fake UI.
- Stack suggestion: Next.js (same repo, `/marketing` route group or separate site) + GSAP/ScrollTrigger + Tailwind. Respect `prefers-reduced-motion`.
- Accessibility: WCAG AA contrast, focus rings (2px accent), alt text on mascot, captions on any video.

---

## 9. Open decisions (confirm before build)
1. **Brand name** — ship as "Kettles" publicly while codebase stays "Flowmate"? (assumed yes)
2. **Palette** — confirmed blue-only (kettle + steam are blue per `KettleAnimation`); warmth stays emotional (copy + soft light + roundness), no orange/amber anywhere. (assumed yes)
3. **Pricing numbers** — still open, and now blocking: the landing says "free in beta"
   because no billing exists. Tiers + $ must be decided *and built* before any price
   returns to the page.
4. **Primary CTA target** — desktop download vs web signup as the hero default.
