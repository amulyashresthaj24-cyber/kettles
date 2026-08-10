# Pet Design System

The rules for the Kettles desktop pet: when it may speak, how often, what it may
look like, and how it is styled. Four rules and four recipes.

This doc is descriptive, not aspirational — every table below is derived from
shipped code, and the code wins if they ever disagree. Where a rule exists only
as a comment in a source file today, the source is cited so it can be checked.

> **Scope.** Desktop overlay only. The pet does not exist on web. Every host-side
> call already no-ops off-desktop through [`src/lib/desktop.ts`](../src/lib/desktop.ts).

---

## 0. Layers

Four layers, one seam between each. The seam is the point: the renderer knows
nothing about tasks, rates, or sessions, and the brain knows nothing about
sprites.

| Layer | Lives in | Knows about Kettles |
| --- | --- | --- |
| **Brain** — decides *whether* to speak | [`src/lib/pet-context.ts`](../src/lib/pet-context.ts) | Everything |
| **Host** — wires brain to overlay, owns the tick | [`src/components/DesktopShell.tsx`](../src/components/DesktopShell.tsx) | Everything |
| **Contract** — the signal shape | [`src/lib/pet.ts`](../src/lib/pet.ts) | Names only |
| **Renderer** — draws it | [`public/pet/pet.js`](../public/pet/pet.js), [`pet.css`](../public/pet/pet.css) | Nothing |
| **Window** — always-on-top, click-through | [`src-tauri/src/pet.rs`](../src-tauri/src/pet.rs) | Nothing |

Signal flow:

```
DesktopShell → petSignal()  → invoke("pet_signal") → pet://state   → pet.js
pet.js       → pet://control / pet://poke          → onPetControl()/onPetPoke() → DesktopShell
```

Two independent host timers drive it:

| Timer | Interval | Job |
| --- | --- | --- |
| Timer push | 1s | elapsed time + phase on the clock card |
| `considerIntervention` | 10s | ask the brain whether to speak |

**Layer rule.** `pet-context.ts` is pure: no store import, no network, no
`Date.now()`. Every time input (`now`, `dayStartMs`, `minuteOfDay`, `dateKey`) is
passed in, so quiet hours and day boundaries are testable without mocking the
clock or the host timezone. Build them at the call site with `localDayParts()`.
Do not import the store into it.

---

## 1. Moments — when the pet may speak

A moment is a reason to interrupt. Four exist.

| Kind | Severity | State | Fires when | Dedup key anchored to |
| --- | --- | --- | --- | --- |
| `missing_rate` | risk | `review` | session is billable **and** running **and** no rate resolves **and** elapsed ≤ 5m (`MISSING_RATE_GRACE_SECONDS`) | project id, falling back to session id |
| `estimate_overrun` | risk | `review` | `observed / estimate` ≥ 1.25 (`ESTIMATE_OVERRUN_RATIO`) | task id |
| `stale_drafts` | warning | `review` | ≥1 draft unresolved for 30m (`STALE_DRAFT_AFTER_MS`) or carried past local midnight | oldest stale draft's `startedAt` |
| `estimate_warning` | warning | `review` | `0.8 ≤ ratio < 1.25` (`ESTIMATE_WARNING_RATIO`) | task id |

Priority is the array order in `candidateInterventions()`. The first candidate
that clears every budget gate wins; the rest are silently dropped this tick. No
stacking, no queue, no transcript.

`info` is a defined severity with a budget, but **zero moments use it today.**
That is deliberate — see the admission test.

### Severity means one thing

Severity is not "how loud". It is **how wrong the ledger is right now.**

| Severity | Meaning | Test |
| --- | --- | --- |
| **risk** | The recorded data is wrong this second, and stays wrong every second you don't act | Money mispriced, time attributed to the wrong place |
| **warning** | Recoverable. The clock is no longer making it worse | Estimate slipping, drafts waiting |
| **info** | Neither. The user would have been fine never seeing it | — |

If a proposed moment is `info`, that is strong evidence it should not exist. The
pet's budget is the scarcest thing it has.

### Admission test for a new moment

All six, or it does not ship:

1. **Derivable.** Computable from data already on `PetContext`. A moment that
   needs a new fetch is not a moment, it is a feature.
2. **Numeric.** Names a specific figure the user can act on. "You've been busy"
   is not a moment. `"47m spent, 30m planned"` is.
3. **Stably keyed.** The `key` must dedup across a local→remote id remap. This
   is why `stale_drafts` keys off the oldest draft's `startedAt`, not its entity
   id: an id remap would make the same untouched draft look new every morning.
4. **Pure.** No `Date.now()`, no store, no network. Takes `now` as an argument.
5. **Actionable or silent.** If there is a fix, ship chips that emit real
   `pet://control` actions. Never render a chip that implies an action the host
   cannot actually perform.
6. **Tested.** Add a case to [`pet-context.test.ts`](../src/lib/pet-context.test.ts).
   Ordering in `candidateInterventions()` is a product decision, so assert it
   directly rather than through the budget machinery.

### Copy rules

- **State the number. Skip the judgment.** No guilt, no praise for productivity,
  no performance commentary. `"${title} is at ${spent}m against a ${planned}m estimate."`
  is the house voice.
- **Two short sentences, maximum.** The bubble caps at `225px`.
- **Durations go through `formatDuration()`** from [`src/lib/format.ts`](../src/lib/format.ts),
  always. A hand-rolled `"47 minutes"` next to a formatted `"1h 5m"` in the same
  bubble is the bug this prevents.
- **Rotate repeat phrasings with `phrasingFor(key, [...])`.** It hashes the key,
  so a given task always gets the same wording — varied across tasks, stable for
  one. Never random: a message that rewords itself on re-render reads as broken.
- **Zero to two chips.** Always offer an escape (`Dismiss today`).
- Copy is claim-bound: do not imply model-backed conversation, citations, saved
  history, or a completed mutation unless it is actually implemented.

---

## 2. Budget — how often

Silence is the default and the common case. Every gate exists to make the pet
cheaper to keep on than to turn off.

`DEFAULT_PET_POLICY` ([`pet-context.ts:182`](../src/lib/pet-context.ts#L182)):

| Severity | Max/day | Min gap | Bypasses daily quota |
| --- | --- | --- | --- |
| risk | 3 | 15m | **yes** |
| warning | 2 | 30m | no |
| info | 1 | 60m | no |

Plus, applied globally:

| Gate | Value | Applies to |
| --- | --- | --- |
| Quiet hours | 22:00 → 08:00 local, midnight-crossing supported | everything |
| Collision gap | 2m | **everything, including bypassers** |
| Per-key dedup | once per local day | all kinds except `stale_drafts` |
| Per-key dedup | once ever, until the anchor moves | `stale_drafts` |

Four rules that are easy to break by accident:

- **The gap is measured against the last message of any severity.** The user
  experiences interruptions as one stream, not three channels.
- **`risk` bypasses the daily quota but never the collision gap.** Without the
  gap, two risk candidates fire on consecutive ticks: the first is marked shown,
  the second immediately replaces it on screen, and the first is burned for the
  day after one second of visibility. Bypassing the quota is the point;
  bypassing the gap is a bug.
- **Budget is spent only on messages the user could actually see.**
  `petSignal()` resolves `true` only when the overlay was on screen. The emit
  succeeds against a hidden webview either way, so anything spending a limited
  budget must gate on the resolved value — see [`DesktopShell.tsx:884`](../src/components/DesktopShell.tsx#L884).
- **Record before you signal, not after.** The selector runs on a repeating
  tick; recording after the `await` leaves a window where the same intervention
  is selected twice. `DesktopShell` also latches a `sending` flag across the
  round trip.

History is bounded at 100 records / 7 days. `stale_drafts` records are exempt
from the age prune — they suppress the same untouched draft across local dates,
so they must survive until displaced by the record cap.

An unparseable quiet-hours window returns `false` rather than silencing the pet
forever. Fail open.

---

## 3. Animation vocabulary

### Two tiers

**Locked decision.** Users generate v1. Stock ships v2.

| | **v1 — user tier** | **v2 — stock tier** |
| --- | --- | --- |
| Who makes it | anyone, via the kit | Kettles, in-house |
| Sheet | 8 × 9 | 8 × 11 |
| Image | 1536 × 1872 | 1536 × 2288 |
| Look grid | none | 16 cells, rows 9–10 |
| Cursor-following | no | yes |
| Art rows | 9 | 9 + look grid |

The look grid is 16 hand-drawn head angles. That is real art cost per mascot, so
it stays a stock-mascot feature. A v1 mascot without it degrades cleanly — the
renderer short-circuits at [`pet.js:471`](../public/pet/pet.js#L471) when
`lookDirections` is absent, and guards every `look_*` lookup besides.

Both tiers implement the **same 14 state names.** That is the whole point: the
host requests names, never rows, so a v1 mascot and a v2 mascot are
interchangeable to everything above the renderer.

v1 covers 14 names with 9 rows by aliasing — `reading` shares `review`'s row,
`drag_left`/`drag_right` share one drag row (so v1 dragging is directionless),
`running_left`/`running_right` are reserved and mapped so they resolve. The
canonical v1 mapping is `stateMap` in
[`Docs/pet-kit/animation-rows.json`](pet-kit/animation-rows.json).

### The contract is the state names, not the rows

`pet.config.json` maps **names → atlas coordinates.** The host only ever requests
a name. This is what makes a mascot swap cheap: a new mascot re-maps rows and
keeps the vocabulary.

The type union `PetAnimationState` in [`pet.ts:25-39`](../src/lib/pet.ts#L25-L39)
is the vocabulary. **If a state name is not in both the union and the active
config's `states`, it does not exist.** The renderer guards every lookup
(`if (!cfg.states[next]) return`) and falls back to `idle`, so a missing state
degrades quietly instead of crashing — which also means a typo is invisible
until someone watches for it.

Two things enforce this, and both parse the union out of `pet.ts` rather than
duplicating it, so neither can drift from the type:

```bash
npm test                 # src/lib/pet-config.test.ts — configs, kit stateMap, pet.js presets
npm run validate:pet     # atlas pixel geometry against the live config
```

The test covers the live config, the v1 seed, the kit's `stateMap`, and every
mascot preset in `pet.js`. Both fail on a missing name, a name outside the
union, a dangling `events` or `phaseStates` reference, a state outside the
sheet, look states on a v1 sheet, and a v2 sheet with anything other than all 16.

For a non-default atlas:

```bash
node scripts/pet/validate-pet-atlas.mjs --atlas <atlas> --config <config>
```

### Live atlas — v2

| Property | Value |
| --- | --- |
| Cell | 192 × 208 px |
| Sheet | 8 cols × 11 rows |
| Image | 1536 × 2288 px, transparent, webp |
| `spriteVersionNumber` | 2 |

Row map ([`public/pet/pet.config.json`](../public/pet/pet.config.json)):

| Row | States | Frames | fps | Loop |
| --- | --- | --- | --- | --- |
| 0 | `idle` | 6 | 5 | yes |
| 0 | `sitting` (col 0, own scale) | 1 | 2 | yes |
| 1 | `running_right`, `drag_right` | 8 | 9 / 11 | yes |
| 2 | `running_left`, `drag_left` | 8 | 10 / 11 | yes |
| 3 | `waving` | 4 | 6 | no |
| 4 | `jumping` | 5 | 10 | no |
| 5 | `failed` | 8 | 6 | no |
| 6 | `waiting` | 6 | 4 | yes |
| 7 | `working`, `running` | 6 | 8 | yes |
| 8 | `review`, `reading` | 6 | 5 | yes |
| 9 | `look_000` … `look_157_5` | 1 each | 1 | yes |
| 10 | `look_180` … `look_337_5` | 1 each | 1 | yes |

Rows 9–10 are the look grid: 16 single-frame cells at 22.5° steps, driven by OS
cursor position with a 20px deadzone, active in the `idle`, `running`, `paused`,
and `finished` phases. Look direction is **renderer-owned** — the host never
requests a `look_*` state.

Aliased names (`working`/`running`, `review`/`reading`) are intentional. They
exist so a future mascot can split them without a host change.

### Events and phases

`event` is a high-level thing that happened; `phase` is a sustained condition.
A signal may carry both. `events` may specify `{ play, then }` — a one-shot
followed by a loop.

| Event | Plays | Then |
| --- | --- | --- |
| `timerStart`, `timerResume` | `waving` | `running` |
| `timerPause` | `idle` | — |
| `timerBreak` | `waiting` | — |
| `breakEnd` | `jumping` | `running` |
| `timerFinish` | `jumping` | `idle` (+ flash) |
| `timerAbandon` | `failed` | `waiting` |
| `hover` | `review` | — |

| Phase | Resting state |
| --- | --- |
| `idle` | `idle` |
| `running` | `running` |
| `paused` | `idle` |
| `finished` | `waiting` |

### Sprite intent

When generating a new mascot, each row carries an intent and a list of things to
avoid — see [`Docs/pet-kit/animation-rows.json`](pet-kit/animation-rows.json).
The universal rule across every row: **nothing detached from the mascot body.**
No sparkles, speed lines, floating punctuation, impact bursts, drop shadows,
dust, sleep bubbles, or UI panels drawn into the sprite. The overlay is
transparent and always-on-top; detached marks read as rendering artifacts.

---

## 4. Visual tokens

Tokens live in `:root` in [`public/pet/pet.css`](../public/pet/pet.css). Dark is
the default; a `prefers-color-scheme: light` block overrides a subset.

**No hardcoded hex in new pet CSS. No external icon library. No emoji.** The
overlay has its own token set because it renders in a separate Tauri webview and
cannot reach `src/app/globals.css`.

| Group | Tokens |
| --- | --- |
| Type | `--font`, `--font-mono` |
| Surface | `--surface`, `--surface-2`, `--surface-glass` |
| Border | `--border`, `--border-strong`, `--border-glass` |
| Text | `--text`, `--text-muted`, `--text-highlight` |
| Buttons | `--btn-bg`, `--btn-border`, `--btn-hover-bg` |
| State | `--accent`, `--accent-glow`, `--running`, `--paused`, `--finished`, `--idle` |
| Shape | `--radius` (16px), `--shadow` (`none`) |
| Motion | `--ease-spring`, `--ease-soft` |
| Layout | `--mascot-bottom` (34px), `--panel-switch-h` (26px) |

Rules:

- **`--shadow: none` is deliberate.** Depth comes from the glass treatment —
  translucent gradient, inset highlight, `backdrop-filter: blur(16px) saturate(1.2)`.
  A drop shadow on a transparent always-on-top window reads as a smudge on the
  desktop. Do not add one.
- **Accent is reserved for state.** Colour carries running/paused/finished
  meaning. It is not decoration.
- **Two easings only.** `--ease-spring` for entrances and playful motion,
  `--ease-soft` for everything else. A third easing needs a reason.
- **Reduced motion:** honour `prefers-reduced-motion` with an opacity transition
  only. No bounce, no loop, no movement competing with the clock.
- **New surfaces reuse the bubble construction** rather than inventing a card
  style: `max-width: 225px`, `padding: 8px 13px`, `border-radius: 14px`,
  `1px solid var(--border-glass)`, glass background.

### Speech duration

Set by `quoteKind` ([`pet.js:570`](../public/pet/pet.js#L570)); `speechMs` on
the signal overrides.

| `quoteKind` | Default | Used for |
| --- | --- | --- |
| `chat` | 7s | conversational replies, short status |
| `reminder` | 15s | interventions from the brain |
| `break` | 25s | break nudges — carries default actions |

Actionable messages should stay until acted on or dismissed. Do not stack
messages and do not build a transcript.

---

## 5. The chat surface

Shipped. A two-option switcher sits above the mascot: **Clock** shows the task
and elapsed-time card, **AI** shows the latest reply. Replies are
**deterministic** — `describePetCoverage()` over data the store already holds,
clamped to 160 characters for the 225px bubble. No model call, no history.

Do not describe it as model-backed, cite sources, or claim a mutation completed
before the host confirms it.

| Rule | Behaviour |
| --- | --- |
| Never steal the view | A new reply switches to AI only if the user has not pinned Clock, is not taking a note, and is not dragging |
| `forcePanel` | Agent-finish messages override the pin — the only thing that does |
| Gesture priority | Button clicks operate their own control; movement past the drag threshold drags; press-and-hold pets; a quick click that did neither is the only gesture that requests a reply |
| Acting on a chip | Dismisses and returns to Clock |
| Timeout | Returns to Clock after a readable delay unless the user pinned AI. Actionable messages wait |
| Click-through | Disabled only while hovering the pet, bubble, switcher, or visible controls. Everything else stays click-through — new controls must join the global hit test |

Chips are host-verified: `Open timer` always, plus `Pause` or `Resume` when a
live session is running or paused. Adding a chip means adding a case in
`onPetControl` — a chip with no handler is a button that lies.

---

## Recipes

### Add a moment

1. Add the kind to `PetInterventionKind`.
2. Add a branch in `candidateInterventions()` at the correct priority — position
   in the array *is* the priority.
3. Pick severity by the ledger test in §1, not by how much you want it seen.
4. Build a `key` that survives an id remap.
5. Add chips only for actions the host actually handles in `onPetControl`.
6. Add a test asserting both the trigger and its ordering against neighbours.

No renderer change is needed. Moments ride the existing signal.

### Add an animation state

Adding a name widens the contract for **every** mascot, both tiers, including
ones users already made. Alias onto existing art before adding a row.

1. Add the name to `PetAnimationState` in `pet.ts`.
2. Add it to `states` in `pet.config.json` **and to every mascot preset in
   `pet.js`** — a preset missing the name silently falls back to `idle`.
3. Add it to `stateMap` in `Docs/pet-kit/animation-rows.json` and to
   `Docs/pet-kit/examples/seed-pet.config.json`, aliased onto an existing v1
   row. A new v1 row means every existing user mascot needs regenerating.
4. Validate both tiers:
   ```bash
   node scripts/pet/validate-pet-atlas.mjs --atlas public/pet/assets/spritesheet.webp --config public/pet/pet.config.json
   node scripts/pet/validate-pet-atlas.mjs --atlas Docs/pet-kit/examples/user-sprite/seed-atlas.png --config Docs/pet-kit/examples/seed-pet.config.json
   ```
5. Map it from an event or phase only if the host should be able to request it.

### Swap the mascot

`preferences.activeMascot` selects a preset that overrides `spritesheet`,
`cell`, `sheet`, `scale`, and the whole `states` map — **while keeping the state
names identical.** Three values ship: `kettle` (default, v2), `female` (v2,
legacy id `sprite2`), and `custom`.

**A user uploading their own mascot needs no code change.** Settings → Mascot &
Pet → *Make Your Own Mascot* hands them the generation prompt from
[`src/lib/mascot-custom.ts`](../src/lib/mascot-custom.ts), takes a v1 sheet, and
validates format, size, and exact pixel dimensions before storing it.

The uploaded atlas lives in its **own localStorage key**
(`flowmate-custom-mascot`), never in `preferences`. The Zustand `partialize`
persists `sessions` alongside `preferences`, so a ~1MB data URL in there would
be re-serialized on every timer write. The overlay runs on the same origin and
reads the key directly, the same way it already reads the session store.

To add a **stock** mascot (bundled, and the only tier allowed to be v2):

1. Generate the atlas — see [`Docs/pet-mascot-kit.md`](pet-mascot-kit.md).
2. Add a preset object in `pet.js` implementing **every** name in the vocabulary.
   `pet-config.test.ts` picks up any `const *_PRESET` automatically and fails if
   a name is missing.
3. Add the option in [`src/app/settings/page.tsx`](../src/app/settings/page.tsx)
   and, if it is v2, a `animate-pet-jump-*` rule for the timer finish screen.

A preset may re-map rows freely. It may not rename states, and it may not skip
one — a missing name falls back to `idle` silently, which reads as "the mascot
is broken" rather than "a state is unmapped".

Custom mascots reuse `animate-pet-jump-kettle` with only `background-image`
swapped: those keyframes are already written against a v1 8×9 sheet
(1536×1872, row 4, 5 frames), which is exactly the custom geometry.

### Change tone

Copy lives in two places and they follow different rules:

- **Brain copy** (`candidateInterventions()`) — factual, numeric, no judgment.
  Rotate with `phrasingFor()`.
- **Renderer copy** (`SPEECH_LINES`, `bubbleCopy`) — one or two words, present
  tense, no punctuation beyond a period. `"Tracking."` `"Break's done."`

---

## What legitimately differs between tiers

The kit and the live config do not match, and should not. These are tier
differences, not drift — each is enforced or asserted somewhere.

| Thing | v1 | v2 | Why |
| --- | --- | --- | --- |
| Sheet | 8 × 9 | 8 × 11 | look grid |
| `working` / `running` | rows 1 and 8, distinct art | both row 7 | v1 has spare rows; v2 spent them on looks |
| `review` / `reading` | both row 7 | both row 8 | aliased in both tiers |
| `drag_left` / `drag_right` | both row 2 | rows 2 and 1 | v1 has no mirrored drag art |
| `phaseStates.paused` | `waiting` | `idle` | v1's waiting row *is* the paused pose; v2's reads as settled-after-finish |
| `phaseStates.finished` | `idle` | `waiting` | same reason, inverted |
| `look_*` | forbidden | all 16 required | validator enforces both directions |

Anything **outside** this table is drift and should be fixed. The validator
catches the mechanical kinds — missing name, unknown name, dangling event or
phase reference, wrong look-cell count for the tier.

`public/pet/pet.config.json` remains the only source of truth for what the
shipped overlay renders.

---

## Related

| Doc | Covers |
| --- | --- |
| [`Docs/pet-mascot-kit.md`](pet-mascot-kit.md) | Turning a mascot image into an atlas |
| [`Docs/pet-chat-interaction-prompt.md`](pet-chat-interaction-prompt.md) | Original chat build prompt. The surface it describes is **shipped** — treat it as history, not a todo |
| [`Docs/design.md`](design.md) | Main app design system — separate token set |
| [`Docs/agent-tracking-plan.md`](agent-tracking-plan.md) | `agentActive` and the loopback bridge |
