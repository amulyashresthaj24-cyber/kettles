# Agent Pet Overlay (Tauri v2)

An animated mascot that floats over your Pomodoro app's Mini-Widget. It **waves**
on hover/click, **runs** while a timer is active, **jumps + notifies** when a
session finishes, and looks **failed** if you stop early.

- Separate frameless, transparent, always-on-top window — floats over anything.
- Vanilla JS, system WebView, **no npm / no bundler** needed.
- Driven by one Rust command (`pet_signal`) and one helper (`pet-client.js`).
- Fully data-driven: every behavior lives in [`pet.config.json`](frontend/pet.config.json).

See [`PLAN.md`](PLAN.md) for the step-by-step execution plan and file map.

---

## 1. Install (summary)

| # | Do | Where |
|---|----|-------|
| 1 | Copy `frontend/*` into your app's served frontend folder (next to `index.html`) | frontend |
| 2 | Copy `src-tauri/pet.rs` → `src-tauri/src/pet.rs` | backend |
| 3 | Copy `src-tauri/capabilities/pet.json` → `src-tauri/capabilities/` | backend |
| 4 | Add deps from `src-tauri/Cargo.add.toml` | backend |
| 5 | Merge `src-tauri/lib.rs.example` into `src-tauri/src/lib.rs` | backend |
| 6 | Merge `src-tauri/tauri.conf.patch.jsonc` into `tauri.conf.json` | config |
| 7 | Add `<script src="pet-client.js"></script>` to your MAIN window HTML | frontend |

Then `cargo tauri dev`.

---

## 2. Trigger reference — every action

The pet has **7 animations**. Two ways to trigger them:

- **From the host app** (your timer code) → call a `petClient.*` method.
- **From the user** (mouse on the pet) → handled automatically inside the pet.

### Host-triggered (your timer code calls these)

| Call | Pet animation | Notification? | When to call |
|------|---------------|---------------|--------------|
| `petClient.open(x, y)` | appears (`idle`) | — | entering Mini-Widget mode |
| `petClient.timerStart(client, task)` | `running` | no | Pomodoro starts |
| `petClient.timerResume(client, task)` | `running` | no | resumed from pause |
| `petClient.timerPause()` | `waiting` | no | timer paused |
| `petClient.timerBreak()` | `review` | no | break period starts |
| `petClient.timerFinish(task)` | `jumping` → `review` + flash | **yes** | session completes |
| `petClient.timerAbandon()` | `failed` → `idle` | **yes** | timer stopped early |
| `petClient.tick("MM:SS")` | stays `running`, bubble updates | no | every second (optional) |
| `petClient.close()` | window closes | — | restoring full UI |

`client` / `task` strings show in the pet's speech bubble (your "client badge"
and "active task name").

### User-triggered (automatic — no host code)

| User action | Pet animation | Side effect |
|-------------|---------------|-------------|
| **Hover** the pet | `waving` | bubble shows current task/client |
| **Click** the pet | `waving` | emits `pet://poke` event to host |
| **Double-click** the pet | `jumping` | — |
| **Press + drag** the pet | — | window moves (OS drag) |

Listen for the click in your MAIN window to restore the full app:

```js
petClient.onPoke(() => {
  // e.g. restore the full window, exit mini mode
  window.__TAURI__.window.getCurrentWindow().setSize(
    new window.__TAURI__.window.LogicalSize(960, 640)
  );
});
```

### Example: wiring a Pomodoro state machine

```js
// in your MAIN window, after <script src="pet-client.js"></script>

function enterMiniMode() {
  // ...resize main window to 300x120, frameless, always-on-top...
  petClient.open();                       // pet appears
}

function exitMiniMode() {
  petClient.close();                      // pet disappears
}

// timer transitions:
onStart((client, task) => petClient.timerStart(client, task));
onPause(()             => petClient.timerPause());
onResume((client,task) => petClient.timerResume(client, task));
onBreak(()             => petClient.timerBreak());
onComplete((task)      => petClient.timerFinish(task));   // jumps + OS notification
onStopEarly(()         => petClient.timerAbandon());

// optional: live countdown in the bubble
setInterval(() => petClient.tick(formatRemaining()), 1000);

// clicking the pet brings the full app back:
petClient.onPoke(exitMiniMode);
```

---

## 3. Customization — `pet.config.json`

Edit [`frontend/pet.config.json`](frontend/pet.config.json). It reloads when the
pet window opens — no rebuild needed for value tweaks.

| Key | Meaning |
|-----|---------|
| `spritesheet` | Path to the sprite image (relative to `pet.html`). |
| `cell` | Pixel size of one animation frame in the sheet. |
| `sheet` | Grid dimensions — `cols` × `rows` of frames. |
| `scale` | Visual size multiplier of the pet (0.4–1.2 is sensible). |
| `states` | Animation table — see below. |
| `events` | Maps a semantic event → which animation plays. |
| `bubble` | Speech-bubble behavior (`enabled`, `showOnHover`, `autoHideMs`). |
| `flashOn` | List of events that trigger the glow/flash effect. |

### `states` — one row per animation

```json
"running": { "row": 8, "frames": 6, "fps": 8, "loop": true }
```

- `row` — which row of the sprite sheet (0-indexed).
- `frames` — how many frames in that row.
- `fps` — playback speed.
- `loop` — `true` = repeats forever; `false` = plays once then returns to the
  last looping state (a "one-shot", e.g. `waving`, `jumping`).

### `events` — remap behavior without touching code

A value is either a **state name** (string) or `{ "play": ..., "then": ... }`:

```json
"timerFinish": { "play": "jumping", "then": "review" }
```

- `play` — the (usually one-shot) animation to run now.
- `then` — the looping state to settle into afterwards.

Examples of customization:
- Want the pet to **dance instead of wave** on click? Change
  `"click": "waving"` → `"click": "jumping"`.
- Want a **calmer idle**? Lower `states.idle.fps`.
- Want **no bubble**? Set `bubble.enabled` to `false`.
- Want the pet **bigger**? Raise `scale`.

### Swapping in your own mascot art

1. Replace `frontend/assets/spritesheet.webp` with your sheet (a grid of frames,
   one animation per row, frames left-to-right).
2. Update `cell` (frame px), `sheet` (`cols`/`rows`), and each `states.*.row` /
   `frames` to match your sheet's layout.
3. The bundled sheet is `1536×1872`, `8 cols × 9 rows`, `192×208` per cell.

---

## 4. API reference

### Rust commands (`pet.rs`)

| Command | Args | Purpose |
|---------|------|---------|
| `pet_open` | `x?`, `y?` | Create/show the overlay window. |
| `pet_close` | — | Close the overlay. |
| `pet_signal` | `signal: PetSignal` | Animate the pet; notify on finish events. |
| `pet_set_position` | `x`, `y` | Move the window (physical px). |
| `pet_set_clickthrough` | `enabled: bool` | Toggle mouse pass-through. |

`PetSignal` fields (all optional): `state`, `event`, `source`, `detail`,
`notify { title, body }`.

### Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `pet://state` | host → pet window | `PetSignal` |
| `pet://poke` | pet window → host | `{ at: <timestamp> }` |

### Host helper (`pet-client.js`)

Exposes `window.petClient` — see the trigger table in section 2. The escape
hatch `petClient.signal({...})` sends any raw `PetSignal`, e.g.
`petClient.signal({ state: "failed", source: "Acme", detail: "Build broke" })`.

---

## 5. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Pet window is a black/white box, not transparent | macOS: add `macos-private-api` feature + `macOSPrivateApi: true`. Windows/Linux: works by default. |
| `window.__TAURI__ is undefined` | Set `app.withGlobalTauri: true` in `tauri.conf.json`. |
| Pet shows but never animates / blank sprite | `spritesheet` path wrong, or `sheet`/`cell` don't match the image. |
| Click/hover do nothing | Click-through is on — call `petClient.setClickThrough(false)`. |
| No notification on finish | `tauri-plugin-notification` not added, or `notification` perms missing from `capabilities/pet.json`. |
| Permission denied errors in console | `capabilities/pet.json` not copied into `src-tauri/capabilities/`. |
| Pet hidden behind the mini-widget | It shouldn't be (separate always-on-top window). If so, call `pet_open` again to re-assert always-on-top. |
