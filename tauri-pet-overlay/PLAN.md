# Agent Pet Overlay — Execution Plan

Add an animated mascot ("pet") to the Tauri Pomodoro app. The pet is a separate
frameless, transparent, always-on-top window that floats near the Mini-Widget.
It reacts to **hover**, **click/double-click**, and **timer events**, and fires a
desktop **notification** when a session finishes.

## Architecture (why a separate window)

```
 ┌─────────────────────┐         pet_signal()         ┌──────────────┐
 │  MAIN window         │  ──── Tauri command ───────▶ │  Rust core   │
 │  (timer, mini-widget)│                              │  (pet.rs)    │
 │  uses pet-client.js  │ ◀─── "pet://poke" event ──┐  └──────┬───────┘
 └─────────────────────┘                            │         │ emit "pet://state"
                                                     │         ▼
                                              ┌──────┴──────────────┐
                                              │  PET window          │
                                              │  pet.html/.css/.js   │
                                              │  transparent overlay │
                                              └─────────────────────┘
```

- **Separate window** = the pet floats over *anything* (even other apps), never
  clipped by the 300×120 mini-widget, draggable independently.
- **One inbound command** (`pet_signal`) and **one outbound event** (`pet://poke`)
  — small, stable contract.
- Animation lives entirely in `pet.js`. The host only sends semantic events.

## File map

```
tauri-pet-overlay/
├── PLAN.md                     ← this file
├── README.md                   ← integration + trigger reference + customization
├── frontend/                   ← copy into your app's frontend (served dir)
│   ├── pet.html                ← the pet window document
│   ├── pet.css                 ← overlay styling (transparent bg)
│   ├── pet.js                  ← animation + click/hover/drag logic
│   ├── pet.config.json         ← ALL tunables — edit this to customize
│   ├── pet-client.js           ← host-side helper (use in MAIN window)
│   └── assets/
│       └── spritesheet.webp    ← 8×9 sprite sheet (1536×1872, 192×208 cells)
└── src-tauri/
    ├── pet.rs                  ← Rust module: window + commands  → src-tauri/src/
    ├── capabilities/pet.json   ← v2 permissions → src-tauri/capabilities/
    ├── Cargo.add.toml          ← dependencies to add
    ├── tauri.conf.patch.jsonc  ← config keys to merge
    └── lib.rs.example          ← how to register the module
```

## Steps

### Phase 1 — Backend wiring (~15 min)
1. Copy `src-tauri/pet.rs` → `your-app/src-tauri/src/pet.rs`.
2. Copy `src-tauri/capabilities/pet.json` → `your-app/src-tauri/capabilities/`.
3. Add deps from `Cargo.add.toml` (`serde`, `serde_json`, `tauri-plugin-notification`).
4. Merge `lib.rs.example` into your `src-tauri/src/lib.rs`:
   `mod pet;`, the notification plugin, the 5 `invoke_handler` entries.
5. Merge `tauri.conf.patch.jsonc` into `tauri.conf.json` (`withGlobalTauri: true`).

### Phase 2 — Frontend assets (~5 min)
6. Copy the whole `frontend/` contents into your app's served frontend folder
   (where `index.html` lives), so `pet.html` and `assets/` ship in the bundle.
7. Add `<script src="pet-client.js"></script>` to your MAIN window's `index.html`.

### Phase 3 — Hook into Mini-Widget mode (~20 min)
8. When the user clicks **Mini Mode**: after resizing `main` to 300×120, call
   `petClient.open(x, y)` to spawn the pet docked above the widget.
9. When restoring the full UI: call `petClient.close()`.
10. Wire `petClient.onPoke(...)` so clicking the pet restores the full window.

### Phase 4 — Hook into the timer (~20 min)
11. In your Pomodoro state machine, emit pet events at each transition:
    start → `timerStart`, pause → `timerPause`, resume → `timerResume`,
    break → `timerBreak`, complete → `timerFinish`, stop early → `timerAbandon`.
12. (Optional) every second call `petClient.tick("MM:SS")` to mirror the
    countdown in the pet's bubble.

### Phase 5 — Verify (~10 min)
13. `cargo tauri dev`. Enter mini mode → pet appears. Hover → waves + bubble.
    Click → waves + restores full window. Let a timer finish → pet jumps,
    flashes, OS notification fires.
14. Tune `pet.config.json` (scale, fps, event→animation mapping) to taste.

## Risks / notes

- **Transparent windows on macOS** need the `macos-private-api` feature +
  `macOSPrivateApi: true`. Windows/Linux work as-is. (See `Cargo.add.toml`.)
- **Notifications** prompt for OS permission on first use; the plugin handles it.
- The bundled sprite is a placeholder mascot — swap `assets/spritesheet.webp`
  and adjust `pet.config.json` → `sheet`/`cell`/`states` for your own art.
- Click-through is OFF by default so hover/click work. Turn on via
  `petClient.setClickThrough(true)` for a purely decorative pet.
