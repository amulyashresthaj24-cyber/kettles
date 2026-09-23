# Kettles — Marketing Plan

> Brand: **Kettles** (codebase: Flowmate). Public name never changes to Flowmate.
> Companion docs: [`KETTLES_LANDING_PRD.md`](./KETTLES_LANDING_PRD.md) (site + messaging bank) · [`KETTLES_BRAND_ASSETS.md`](./KETTLES_BRAND_ASSETS.md) (asset inventory) · [`Docs/system.md`](../system.md) (product wedge) · [`Docs/release.md`](../release.md) (web + Windows channels).
> Status: product is shipped at **v1.1.1** (web on Vercel, Windows desktop self-updates). Marketing is in **open beta**: free, no billing, no teams. This plan is the go-to-market, not a landing-page spec.

---

## 0. What this plan is for

The landing PRD already covers page structure, voice, and motion. This document answers the questions that sit *around* the page:

1. Who we sell to, and who we ignore until the product can serve them.
2. What we can claim today without lying.
3. Which channels earn the first 100–1,000 users, and in what order.
4. How a first brew becomes a habit, then a ledger, then (later) a paid plan.
5. What must exist before any public launch push.

**North star:** Kettles is the **source of truth for freelance income**. Acquisition is a means. The ledger is the product.

---

## 1. Situation (honest snapshot)

### Shipped and marketable

| Surface | What exists | Marketing implication |
|---------|-------------|------------------------|
| Web app | Full product: tasks, projects, clients, timer, calendar, reports, PDF/Excel export, shareable report links | Primary CTA: **Start free** → `/auth` |
| Windows desktop | Tauri v2 installer, tray, global shortcuts, idle recovery, pet overlay, mini mode (hide main window, keep pet) | Secondary CTA once the download page is real. First-run SmartScreen warning — set expectations in copy |
| Auth | Email + Google (openid/email/profile only) | "No card. Sign in and brew." |
| Pet / kettle | Sprite-driven overlay + landing mascot | Launch hook. Not the product. |
| Reports | Per-client hours, billing rates, budgets, public share links | Proof of the ledger. Best "aha" after first week |
| Agent tracking (M1–M3) | Loopback bridge keeps the timer running while an AI agent works; reports can show an AI-assisted split | **Developer-freelancer wedge.** Do not lead consumer copy with this; use it on Show HN / X / indie-dev channels |
| Legal | Privacy Policy, Terms | Required for Google OAuth and PH/trust |

### Not shipped — do not market as if they are

| Claim | Reality |
|-------|---------|
| Paid plans / "Pro from $X" | No billing code. Landing correctly says **$0 in beta, no limits** |
| Teams / shared projects | Every RLS policy is `auth.uid() = user_id`. Teams is a data-model rewrite |
| macOS / Linux desktop | Release pipeline is **Windows only**. Landing FAQ currently claims macOS — that is a copy bug (see §8) |
| Chrome Web Store extension | `extension/` exists as unpacked-only. Not a store listing |
| Google Calendar overlay | Built, parked (`GOOGLE_CALENDAR_ENABLED` defaults false) until brand verification |
| Invented social proof | Do not use "120,000+ hours" or fake testimonials. The PRD's trust strip is aspirational, not live |

### Constraints that shape the GTM

- **Beta pricing is a gift and a trap.** Free-with-no-gates maximizes activation and kills urgency. Use beta to collect proof (hours billed, invoices sent, quotes), not to pretend there is a price.
- **Windows-first desktop** is fine for a freelancer/dev audience; do not run a "download for Mac" campaign until a macOS build exists.
- **SmartScreen** on first Windows install will convert some launches into bounce. Pair every desktop CTA with a one-line "More info → Run anyway" note until code-signing lands.
- **The kettle is blue.** Warmth is emotional (copy, ritual, companion), never orange/amber. See brand non-negotiables in [`README.md`](./README.md).

---

## 2. Audience

### Primary ICP — "the underbilling freelancer"

Solo operator with **2+ clients**, selling time or time-adjacent work (design, engineering, writing, consulting). They already tried Toggl/Clockify/Harvest and either:

- forget to start/stop the timer, or
- reconstruct the week on Sunday night, or
- distrust the log enough to round down.

**Job to be done:** "I want logged hours to equal real work, so I stop leaving money on the table — without feeling surveilled."

**Buying trigger:** a week they know they underbilled, a client asking "what did I pay for?", or switching to AI tools and watching idle-trim delete real work.

### Secondary — "the calm focuser"

Knowledge workers who want Pomodoro + a companion, not a timesheet. They convert later (if at all) and should never become the homepage promise. Use them for organic reach (pet clips, streaks), not for positioning.

### Do not target yet

- Agencies / teams (no shared ownership).
- Enterprises / SOC2 buyers (no admin, no SSO beyond Google, no DPA productized).
- Mobile-first users (no iOS/Android).
- People whose job is "automatic time from screenshots / window titles" (RescueTime/Timely) — that is the opposite of our privacy stance.

### Persona notes for copy

| Persona | Pain | Proof they need | Channel they trust |
|---------|------|-----------------|--------------------|
| Freelance designer | Reconstructs Friday from Figma tabs | Weekly per-client PDF | Twitter/X, Dribbble, designer Slacks |
| Freelance developer | Idle-trim kills agent time; underbills AI-assisted hours | Session that kept running during Claude/Cursor | Show HN, r/freelance, indie-hackers, X |
| Consultant / writer | Client wants a narrative of the week | Shareable report link | LinkedIn, newsletters |
| Agency founder (park) | Needs seat-level reports | — | Ignore until Teams exists |

---

## 3. Positioning

**Category we occupy:** task-linked time tracking for people who bill.

**Category we refuse:** employee monitoring, automatic activity scoring, hustle dashboards.

**Positioning statement (locked, from the PRD):**

> For solo freelancers and small teams juggling multiple clients, **Kettles** is the task-linked time tracker that turns focus into a cozy ritual — every minute brews into an accurate, billable ledger, watched over by a kettle companion instead of a surveillance dashboard.

Until Teams ships, drop "and small teams" from paid/ads copy. Organic/about copy can keep the aspiration.

**Differentiator stack (in order of defensibility):**

1. **The ledger** — time locks to a task; weekly hours per client; PDF/Excel; share links. Sticky once it is income.
2. **Task-linked by default** — not a naked stopwatch you label later.
3. **Honesty about idle and AI** — idle recovery asks; agent leases keep supervised AI work from being trimmed. Unique vs Toggl *and* vs RescueTime.
4. **Companion, not cop** — kettle pet, calm UX, no screenshots/keystrokes. Acquisition hook, not the reason they stay.

**One-liner (campaigns):** *Put the kettle on. Get to work.*

**Live homepage currently leads with** "Time tracking that does the remembering for you." That is a valid *benefit* line. Keep the kettle line as brand/OG/campaign; keep the remembering line as conversion headline. Do not run both in the same ad.

**Three-pillar value props (use everywhere):**

1. **Accurate** — "Time locks to the task. No guessing, no backfilling."
2. **Warm** — "A companion, not a surveillance dashboard."
3. **Billable** — "Every brew rolls into an invoice-ready ledger."

**Voice:** calm, plain-spoken, lightly playful. Tea words (brew, steam, whistle, gone cold) as flavor, never as a gimmick paragraph. Never hustle-bro. Never "10x your output."

**CTA bank (shipped):** "Start free" · "No card required." Future: "Get the desktop app" once `/download` exists.

---

## 4. Competitive frame

Do not compete on feature count. Compete on **trust + warmth**.

| | Kettles | Toggl / Clockify | Harvest | RescueTime / automatic |
|--|---------|------------------|---------|------------------------|
| Model | You choose the task, we lock the time | Timer + tags | Time + invoices | Passive window/activity capture |
| Feeling | Ritual + companion | Utilitarian | Accounting | Surveillance-adjacent |
| Billing | Per-client ledger, share links | Reports | Strong invoicing | Weak / none |
| AI-era idle | Agent lease (desktop) | Idle detect only | Idle detect only | Counts "activity," not billed work |
| Price today | Free in beta | Freemium | Paid | Freemium |

**Comparison copy rule:** name Toggl and RescueTime on the page (already in the PRD). Never name Harvest as "worse at invoicing" — they win that axis; we win *task-linked honesty before the invoice*.

**Objection handling (FAQ + community replies):**

| Objection | Answer |
|-----------|--------|
| "Just another timer" | Task-first. The report is a receipt, not a reconstruction. |
| "I need invoices" | Export PDF/Excel and share a read-only link. Full invoicing is not the v1 promise. |
| "I need Mac" | Web works today. Native Mac is not out. Do not imply otherwise. |
| "Will it stay free?" | Beta is free with no gates. Paid tiers come later; we will not bait-and-switch active beta ledgers without notice. |
| "Is the kettle a toy?" | The pet is optional. The ledger is the product. |
| "Does it spy on me?" | No screenshots, no keystrokes, no productivity score. You start the brew. |

---

## 5. What "launch" means here

Kettles is already live. "Launch" is not first deploy. It is the first **intentional public push** with:

- Copy that matches the binary (see §8).
- Real product screenshots / a 20–30s demo.
- A working web signup path (exists).
- A Windows download path with SmartScreen copy (partial).
- A way to collect email *and* first-brew events (signup exists; analytics for funnel need a pass — see §11).

Until those exist, treat traffic as a leak.

---

## 6. Phased GTM

Phases are gated on **product and proof**, not on a calendar.

### Phase A — Claim hygiene and conversion floor

**Goal:** the public site only says things the app does. Signup → first brew is obvious.

Work:

- Copy audit of `KettlesLanding.tsx` FAQ and footer (macOS, extension store, fake stats). See §8.
- Capture real screenshots: dashboard, Kanban, timer, report, share link, pet overlay. Replace invented mock energy where the live page still fakes UI.
- Dedicated `/download` for the Windows installer, with SmartScreen one-liner. Keep web as default CTA.
- Instrument: landing → `/auth` → first session started → first session stopped → first report viewed. (If analytics is incomplete, fix that before buying ads.)
- OG/Twitter: already uses dashboard shot + "Put the kettle on. Bill every minute." Keep that pair stable.

**Done when:** a stranger can go homepage → Google/email signup → start a task-linked session without hitting a lie or a 404.

### Phase B — Proof and seed users

**Goal:** 20–50 people who actually invoice from Kettles, not 2,000 drive-by signups.

Work:

- Direct outreach to freelancer Discord/Slack, r/freelance, designer/dev friends. Personal, not blast.
- Offer: free beta, no card, we want one honest quote after they send a real invoice.
- Collect: 3 real testimonials (designer, developer, writer — the PRD already wants this mix) with permission to name role, not necessarily company.
- Record 2 clips: (1) 15s kettle + timer, (2) 30s pick-task → brew → report PDF.
- Optional: waitlist-quality email from the existing capture (today it just routes to `/auth?email=`). Fine for now; add a real newsletter only if someone will write it.

**Done when:** three specific quotes + two clips exist. Then Product Hunt is allowed.

### Phase C — Public launch (mascot as bait, ledger as close)

**Goal:** a burst of signups that **activate**, not a vanity ranking.

Primary story for Product Hunt / social: *"the cozy time tracker with a kettle companion."*  
Closer in the first comment / first tweet: task-linked ledger, free in beta, Windows + web.

Playbooks in §7. Do **Show HN** as a separate beat with a different hook: persisted timer + agent-aware idle (developers). Do not use the cute-pet angle as the HN title.

**Done when:** we can point to activated users (first brew + a stopped session), not just PH upvotes.

### Phase D — Content and search

**Goal:** compounding acquisition that does not depend on another launch day.

Clusters in §9. Ship pages only when the claim is true. `/blog` is in the PRD sitemap and **not built** — do not announce a blog until two posts are ready to go live.

### Phase E — Monetization narrative (blocked on billing)

Do not put a price on the site until billing exists. When it does:

- Grandfather or warn beta users in writing before gates appear.
- Upsell moment = **export / unlimited history / desktop extras / kettle skins** — the PRD already sketches this. Revisit against actual usage, not guesses.
- Teams is a separate launch, not a pricing-page checkbox.

---

## 7. Channel plan

Order is deliberate. High-trust, high-fit first. Paid last.

### 7.1 Owned

| Channel | Use | Notes |
|---------|-----|--------|
| `kettles` landing `/` | Conversion | Dual path: Start free (web) + later Download (Windows) |
| `/share?token=` | Distribution | Every sent report is a quiet ad. Keep branding a small footer, not a billboard |
| Changelog | Trust | Link from footer. Ship notes in human voice |
| Email (post-signup) | Activation | Day-0: start your first brew. After 7 days: "your week, already totaled." No drip spam |

### 7.2 Community (Phase B–C)

| Place | Hook | Do | Don't |
|-------|------|----|-------|
| r/freelance, r/graphic_design, r/webdev | Underbilling / Sunday reconstruction | One genuine post with a screenshot of a *report*, not the pet | Drop PH links on day one |
| Indie Hackers | Building in public + ledger honesty | Ship log, not hype | Fake MRR |
| Designer/dev Slacks & Discords | "I built the timer I wanted" | Founder-in-the-thread support | Bot broadcasts |
| X | Short clips of kettle + mono timer | 15s loops, blue-only | Growth-hack reply spam |
| LinkedIn | Consultants: "send the week as a link" | One case-style post | Thought-leadership sludge |

### 7.3 Launch platforms (Phase C)

**Product Hunt**

- Tagline: cozy time tracker with a kettle companion.
- First hunter comment: task-linked, invoice-ready reports, free in beta, web + Windows, no surveillance.
- Assets: kettle GIF, report screenshot, desktop pet clip. Blue only.
- Maker availability: same-day replies. Idle on PH is death.
- Do not put fake "hours tracked" on the PH gallery.

**Show HN**

- Title angle: *Show HN: Kettles – task-linked time tracker that doesn't pause when your AI agent is working* (only if M3 is in the build they can download).
- Body: idle problem, loopback lease, ledger. Pet in paragraph 3, not the title.

**GitHub Release / download**

- Point new desktop users at `releases/latest` until `/download` exists.
- README is still "Flowmate" internally — public posts always say **Kettles**.

### 7.4 Creators (after Phase B proof)

- Micro-creators (freelance YouTube, design Twitter, "deep work" newsletters). Offer: free forever for them in beta, a unique share-report example, no script.
- Skip paid ambassadors until a paid plan exists (nothing to affiliate).

### 7.5 Paid (Phase D+, optional)

Do not buy traffic until Phase A instrumentation exists. If/when:

- Search: exact phrases from §9, not generic "time tracking software" (Toggl owns that CPC).
- Retargeting: only people who reached `/auth` or started a session — not all landing visitors.
- Budget rule: if CAC cannot be measured, spend is zero.

### 7.6 Channels we skip on purpose

- TikTok-first (unless a clip already working on X is reused). Product is desktop/web; the pet can travel, the ledger cannot demo in 6s without looking like a toy.
- Product-comparison affiliate sites until pricing exists.
- Chrome Web Store until the extension is a real listing.
- Mac App Store / MS Store until signing and store packaging exist.

---

## 8. Copy audit (fix before amplifying traffic)

These are **live mismatches** as of this plan. Marketing spend on a lying FAQ is worse than no spend.

| Location | Current claim | Product truth | Fix |
|----------|---------------|---------------|-----|
| Landing FAQ "Which platforms are supported?" | "native macOS and Windows apps" + "browser extension keeps everything in sync" | Windows desktop shipped; macOS not in release matrix; extension is unpacked-only | "Web app today, plus a native Windows app with a floating pet/mini mode. A Chrome extension exists as a companion (sideload), not a store listing yet." |
| Landing PRD trust strip | "120,000+ focused hours" | Unverified | Remove from any live/campaign use until the number is real |
| PRD / design prompt pricing section | Free / Pro / Team with prices | No billing | Keep the live "$0 in beta" card. Do not revive tiers on the page |
| Hero vs OG title | Hero: "does the remembering for you." OG: "Put the kettle on. Bill every minute." | Both true, different jobs | Keep; don't mix in one ad unit |
| Footer Product → Download | Link to `#download` | Confirm the anchor exists and points at a real installer | Wire to GitHub Releases or a `/download` page |

Voice check: prefer "Start free" (live) over "Start brewing — free" (PRD) on buttons. Keep brewing language in headlines and the pet section.

---

## 9. Content system

### Search clusters (only write what we can rank *and* fulfill)

1. **Freelance billing honesty** — "time tracking per client," "invoice from tracked hours," "stop underbilling."
2. **Task-linked vs stopwatch** — "task time tracking," "time tracker that locks to a task."
3. **Calm / anti-surveillance** — "time tracker without screenshots," "not RescueTime."
4. **Desktop focus** — "Windows time tracker always on top," "Pomodoro desktop companion."
5. **AI-assisted work** — "time tracking while Copilot/Cursor/Claude runs," "don't lose billable hours to idle detection." (Developer cluster. Do not put on the homepage hero.)

### Flagship pieces (write these first, in this order)

1. **"Your logged hours don't match your real work"** — problem essay. Mirrors landing § problem. Ends in the 3-step ritual.
2. **"How I bill a week without reconstructing Friday"** — product story with a real (or clearly labeled fictional composite) report screenshot.
3. **"Why idle detection fails when an agent is working"** — for Show HN residue and developer SEO.
4. **"The kettle is optional. The ledger isn't."** — positions the mascot so serious buyers don't bounce.

No blog chrome until two of those are ready. A changelog entry is not a blog post.

### Ongoing

- Release notes in Kettles voice (what changed for the freelancer, not the git log).
- One screenshot or 8s clip per notable desktop/pet improvement — that is the shareable layer.

---

## 10. Product-led loops (use what already exists)

| Loop | Mechanism | Marketing job |
|------|-----------|---------------|
| Share report | `/share?token=` public read-only | Subtle "Made with Kettles" on the share view. Owner-opt-in for AI split already exists — default off, keep it off in marketing demos unless the story is AI |
| Weekly report email (if/when sent) | Natural recap | Best activation email. Don't build a newsletter instead of this |
| Pet overlay screenshots | People photograph the kettle | Provide a "how to clip the pet" note; never force mascot-spam |
| Streaks | Habit | Retention, not ads. Don't put fire emoji in UI (product rule: no emojis). Blue spark if needed |
| Desktop self-update | Users stay on latest | Reduces "old screenshot" support load |

**Activation sequence we should optimize (in-product, not ads):**

1. Sign up.
2. Create (or import) one client + one project + one task.
3. Start a brew ≥ a few minutes, stop it. Session complete = **receipt**, not a celebration (system.md).
4. See that row on `/report`.
5. Optional: install Windows app, meet the pet, leave it running a real work block.
6. Optional: export PDF or send a share link to a (test) client.

Anything that skips step 3 is a vanity signup.

---

## 11. Metrics

Vanity: PH rank, raw signups, landing sessions.  
**Real:**

| Metric | Why |
|--------|-----|
| Landing → `/auth` start | Creative/CTA quality |
| Auth complete → first `startSession` | Onboarding friction |
| First session **stopped** (not abandoned) | Understood the ritual |
| Users with ≥2 clients in week 1 | ICP match (our wedge is 2+ clients) |
| Report viewed or PDF exported in first 14 sessions | Ledger aha |
| D7 / D30 return + at least one brew | Habit |
| Share-link created | Distribution |
| Desktop install among activated users | High-intent |

Do **not** publish "hours tracked" or "invoices backed" externally until they are queried from production and blessed. Internal OK.

**Beta → paid (later):** export usage, client count, desktop DAU, report-share count. Those predict willingness to pay better than session length.

---

## 12. Asset checklist (blockers vs nice-to-have)

From [`KETTLES_BRAND_ASSETS.md`](./KETTLES_BRAND_ASSETS.md) §7, prioritized for GTM:

**Blockers for Phase C**

- [ ] Real product screenshots (dashboard, Kanban, timer, report, calendar) at 2× webp
- [ ] 15s pet + timer clip (silent, captions)
- [ ] 30s task → brew → report clip
- [ ] Windows download path + SmartScreen sentence
- [ ] FAQ/platform copy corrected
- [ ] 3 real-or-clearly-labeled quotes (no stock avatars pretending to be customers)

**Should have**

- [ ] True OG 1200×630 (dashboard shot exists; a composed mark + tagline card is cleaner in chat previews)
- [ ] Favicon set generated from `kettlesicon.svg`
- [ ] `/download` page
- [ ] Original whistle or credited CC BY-SA use (credit in footer if the sound is on the site)

**After billing / stores**

- [ ] Price page that matches Stripe
- [ ] Chrome Web Store listing assets
- [ ] macOS download badge (only when the binary exists)

---

## 13. Campaign one-pagers (ready to brief)

### A. "Sunday night reconstruction" (ICP)

- Audience: freelancers who bill weekly.
- Visual: split — messy notes vs clean per-client bars.
- Line: "Stop rebuilding the week. Time already locked to the task."
- CTA: Start free.
- Channel: r/freelance, LinkedIn, SEO cluster 1.

### B. "You're not focusing alone" (reach)

- Audience: everyone; filter later.
- Visual: kettle brewing / lost kettle / jumping.
- Line: "Put the kettle on. Get to work."
- CTA: Start free / see the ritual.
- Channel: PH, X, product clips.
- Guardrail: always one sentence that this is a **billable ledger**, or we attract toy-seekers only.

### C. "Agents don't look like idle" (dev)

- Audience: developers who bill and use coding agents.
- Visual: timer still running; report with AI-assisted split (opt-in demo data).
- Line: "Your idle detector thinks Claude is a coffee break. Kettles doesn't."
- CTA: Windows desktop (bridge is desktop) + web for the rest.
- Channel: Show HN, X, r/webdev.
- Guardrail: this is not a "track your AI's tokens" product. It is "don't delete supervised work from the invoice."

---

## 14. Risks

| Risk | Mitigation |
|------|------------|
| Cute mascot positions us as a toy | Ledger-first homepage; pet as section 2–3, not the only screenshot |
| Beta forever trains "this is free software" | Be explicit: free *while in beta*; changelog will announce gates with notice |
| Fake social proof | Ban invented stats. Empty > fake |
| macOS expectation | Copy audit §8. Web is the Mac answer today |
| SmartScreen bounce | Honest install microcopy; code-signing when volume justifies it |
| Agent-tracking story overreaches | Only claim what the installed desktop build does; M3 report split is opt-in on shares |
| Teams inbound | "Built for you, not your org — yet." Do not take enterprise calls that imply a roadmap commitment |

---

## 15. Decision log (marketing)

Reuse product locks; do not relitigate them in campaigns.

| Decision | Call |
|----------|------|
| Public name | **Kettles** |
| Palette | Blue/neutral only. No orange/amber, including steam and "streak flames" |
| Primary conversion | Web signup (`/auth`). Desktop is power, not the first click |
| Price on site | **$0 in beta** until billing ships |
| Teams in ads | No |
| Surveillance comparison | Allowed and encouraged vs automatic trackers |
| Testimonials | Real or omitted |
| Kettle metaphors | Sparingly |

---

## 16. Immediate next actions

In order. Stop when the next item is blocked.

1. Fix landing FAQ/platform claims (§8).
2. Screenshot the real app; put the five views in `public/` and on the landing where mock UI still stands in.
3. Record the two demo clips (§6 Phase B).
4. Add `/download` (Windows + SmartScreen + "web works on any OS").
5. Confirm funnel events: signup, first start, first stop, report view.
6. Seed 20 ICP users; get 3 quotes.
7. Then PH (campaign B) and Show HN (campaign C) as **separate** days, not the same thread.

The landing build brief and brand pack remain in this folder. This plan does not replace them; it says when and how to put that site in front of people without overselling the binary.
