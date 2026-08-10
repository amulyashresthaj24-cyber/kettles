# Pet chat interaction — implementation prompt

Use this prompt when implementing the Kettles desktop pet's conversational
interaction. This is a small, companion-like surface inside the existing Tauri
pet overlay — it is not a general-purpose chat window, an assistant sidebar, or
a replacement for the timer.

```text
Implement the Kettles desktop pet chat interaction in the existing pet overlay.

Read these files before changing anything:
- public/pet/pet.html
- public/pet/pet.css
- public/pet/pet.js
- src/lib/pet.ts
- src-tauri/src/pet.rs
- src/components/DesktopShell.tsx

Goal
Give the pet a brief, contextual “AI reply” surface that can be opened with a
click, while retaining a quick way to view the timer. The user can drag the pet
without accidental chats, and a compact switcher changes between Clock and AI
message modes.

Scope
- Desktop pet overlay only. Keep the web app and its page layouts unchanged.
- Reuse the existing `pet://state` signal and `pet://control` event channel.
- Start with deterministic, context-aware pet replies from data already present
  in the host. Do not claim model-backed conversation, source citations, task
  mutations, or saved chat history unless those are actually implemented.
- Keep the existing timer card, speech bubble, notepad, drag behavior,
  click-through behavior, and reduced-motion support working.

Interaction model
1. Add one compact two-option switcher directly above the pet, in the same
   footprint currently occupied by the timer/speech bubble:
   - `Clock` shows the existing task and elapsed-time card.
   - `AI` shows the latest contextual pet reply.
   - The selected option has a quiet filled treatment; the other is clearly
     available but visually secondary.
   - A newly received pet reply may switch to AI only if the user has not
     explicitly selected Clock during the current visible message. Never steal
     the view while the user is reading the timer, entering a note, dragging,
     or using an action chip.
2. A short left-click on the mascot opens or refreshes AI mode and requests a
   reply via `pet://control` with `action: "requestPetReply"` and a timestamp.
   The host answers by sending a normal `PetSignal` with `quote`, `quoteKind:
   "chat"`, and optional safe action chips.
3. Preserve gesture priority exactly:
   - button clicks operate only their own control;
   - pointer movement over the existing drag threshold starts window dragging;
   - press-and-hold preserves the existing petting behavior;
   - a quick click that did not drag and did not pet is the only gesture that
     requests a reply.
4. While the AI message is visible, show one concise response (maximum two
   short sentences) and zero to two concrete chips. Examples: `Open timer`,
   `Snooze 5m`, `View task`. Chips must emit explicit `pet://control` actions;
   they must never pretend an action completed until the host confirms it.
5. A close/dismiss affordance returns to Clock. The normal message timeout may
   return to Clock after a short, readable delay; actionable messages remain
   until acted on or dismissed. Do not stack messages or create a transcript.
6. When the user hovers only the pet, bubble, switcher, or visible action
   controls, temporarily disable native click-through. Everywhere else remains
   click-through. Include the new switcher in the existing global hit test.
7. Respect `prefers-reduced-motion`: use an opacity transition only, with no
   bounce, loop, or movement that competes with the timer.

Visual contract — match the exact existing pet bubble
Do not introduce a new card style, new colors, hardcoded hex values, external
icon libraries, a shadow-heavy panel, or a full-screen chat UI. Reuse the
existing values and visual treatment from `public/pet/pet.css`:
- `--font`, `--surface-glass`, `--border-glass`, `--text-highlight`,
  `--text-muted`, `--btn-bg`, `--btn-border`, `--btn-hover-bg`,
  `--radius`, `--ease-spring`, and `--ease-soft`.
- The conversation surface must preserve the current bubble construction:
  `position: absolute; bottom: calc(var(--mascot-height, 128px) + 16px);
  left: 50%; width: max-content; max-width: 225px; padding: 8px 13px;
  border: 1px solid var(--border-glass); border-radius: 14px;` plus the
  existing translucent gradient, glass background, inset highlight, and
  `blur(16px) saturate(1.2)` backdrop filter.
- Preserve the downward `::after` tail pointing to the mascot and the existing
  hidden-to-visible transition:
  `translateX(-50%) translateY(5px) scale(0.92)` to
  `translateX(-50%) translateY(0) scale(1)`.
- Keep actions as the existing compact pill buttons: `4px 10px` padding,
  `10.5px` type, `999px` radius, and `6px` gap.
- Keep the overlay's light-mode token overrides intact. Do not duplicate dark
  values in component selectors.

Implementation boundaries
- Make the smallest semantic HTML addition: a labelled mode switcher and an AI
  message region. Use real buttons with clear accessible labels and update the
  active mode with `aria-pressed` or an equivalent tab pattern.
- Keep DOM state on the existing `.shell` data attributes (for example,
  `data-pet-panel="clock|ai"`) so the CSS owns the visual swap.
- Extend the typed `PetControlPayload` and host listener only as needed for
  `requestPetReply`, `dismissPetReply`, and explicitly implemented chips.
- Do not add a network call or an LLM dependency as part of this UI-only pass.
  If no contextual reply provider exists, return a transparent deterministic
  fallback based on current phase/task, such as “Timer is paused. Resume when
  you are ready.”
- The existing `say()` path should remain the single renderer for incoming
  quote text and action chips; evolve it rather than creating a second message
  renderer.
- Do not regress current reminders, break nudges, completed-session chips,
  right-click notes, drag direction sprites, or the collapsed timer control.

Acceptance checks
- Quick mascot click requests and displays a reply; a drag never does.
- Clock/AI switching works with mouse and keyboard and never overlaps the
  timer, note pad, or speech bubble.
- Click-through remains enabled outside interactive bounds and the switcher is
  included in hit testing.
- Incoming timer state continues to update in Clock mode.
- Existing break/reminder buttons still emit their original payloads.
- Reduced-motion mode has no spring/bob animation on the new panel.
- Run `npm test`, `npm run lint`, and the relevant desktop/manual overlay smoke
  check; report any pre-existing failures separately.
```

## Reply voice

Keep replies factual, calm, and small enough for the 225px bubble. State the
observed context, then offer one useful next action. Avoid emoji, exclamation
marks, invented progress, guilt, or generic motivation. Good: “`Draft session
is still running. Open the timer when you want to wrap it up.`” Avoid:
“`You are crushing it! I finished your plan.`”

