/* Flowmate pet overlay ΓÇö controller for the "thinking" widget.
 *
 * Runs inside the "pet" window only. Talks to the host over Tauri events.
 *   inbound : "pet://state"   -> { state?, event?, phase?, source?, detail? }
 *   outbound: "pet://poke"    -> openApp (double-click/Open) or a legacy poke
 *             "pet://control" -> user tapped Play/Pause (toggle the timer)
 *
 * Rendering: the sprite sheet is drawn with PIXEL background-position/size
 * (computed from the config + a target height), and the mascot animates every
 * frame. Both keep it reliably painted on the Windows WebView2 compositor.
 */

const tauri = window.__TAURI__ || {};
const listen = tauri.event?.listen || (async () => () => {});
const emit = tauri.event?.emit || (async () => {});
const invoke = tauri.core?.invoke || tauri.invoke || (async () => {});
const getCurrentWindow =
  tauri.window?.getCurrentWindow ||
  tauri.webviewWindow?.getCurrentWebviewWindow ||
  null;

const el = {
  shell: document.getElementById("shell"),
  mascot: document.getElementById("mascot"),
  bubble: document.getElementById("bubble"),
  speech: document.getElementById("speech"),
  speechText: document.getElementById("speechText"),
  speechActions: document.getElementById("speechActions"),
  dismissSpeech: document.getElementById("dismissSpeech"),
  panelSwitch: document.getElementById("panelSwitch"),
  modeClock: document.getElementById("modeClock"),
  modeAi: document.getElementById("modeAi"),
  dot: document.getElementById("dot"),
  label: document.getElementById("label"),
  timer: document.getElementById("timer"),
  task: document.getElementById("task"),
  syncDot: document.getElementById("syncDot"),
  msg: document.getElementById("msg"),
  hideToggle: document.getElementById("hideToggle"),
  controls: document.getElementById("controls"),
  toggle: document.getElementById("toggle"),
  toggleLabel: document.getElementById("toggleLabel"),
  complete: document.getElementById("complete"),
  confirm: document.getElementById("confirm"),
  discard: document.getElementById("discard"),
  open: document.getElementById("open"),
  collapse: document.getElementById("collapse"),
  reopen: document.getElementById("reopen"),
  completeActions: document.getElementById("completeActions"),
  finishNow: document.getElementById("finishNow"),
  notepad: document.getElementById("notepad"),
  notepadTitle: document.getElementById("notepadTitle"),
  noteInput: document.getElementById("noteInput"),
  saveNote: document.getElementById("saveNote"),
  cancelNote: document.getElementById("cancelNote"),
  closeNote: document.getElementById("closeNote"),
};

window.addEventListener("error", (e) =>
  console.error("[pet]", e.error || e.message)
);

const PHASE_LABELS = {
  idle: "Focus",
  running: "Focusing",
  paused: "Paused",
  finished: "Complete",
};

// Default speech lines per timer event. A `quote` in the signal payload wins;
// `anim` is an optional one-shot layered on top of the event's mapped state.
// One voice, matching the warnings in src/lib/pet-context.ts: state the fact,
// no exclamation marks, no emoji, no consolation for things that are not
// setbacks. The host overrides any of these by sending an explicit `quote`.
const SPEECH_LINES = {
  timerStart:   { text: "Tracking.", anim: "waving" },
  timerResume:  { text: "Resumed.", anim: "waving" },
  timerBreak:   { text: "Break time." },
  breakEnd:     { text: "Break's done.", anim: "jumping" },
  timerFinish:  { text: "Session complete." },
  timerAbandon: { text: "Session discarded. Nothing logged." },
};

const MASCOT_HEIGHT = 128; // px; the mascot box height, matches pet.css

// ---------------------------------------------------------------------------
// Female mascot ("female") ΓÇö baked v2 preset for assets/sprite-2-v2.clean.webp.
// (The newer sprite-female sheet rendered with bugs, so the female slot uses
// the proven companion atlas. "sprite2" is a legacy persisted id that
// resolves to this preset too.)
//
// The source art (sprite-2 design.webp) shipped opaque, with an opaque checker
// background and frames packed un-centered in their 8x9 grid. The .clean.webp
// atlas has the background flood-filled to transparent and every frame
// re-centered in the canonical 192x208 v2 cell. Row meanings differ from the
// default sheet, so this preset remaps `states` while keeping the state NAMES
// identical so all event / phase / default-animation logic works untouched.
//
//   row 0 idle (standing)      row 1 walk-right        row 2 walk-left
//   row 3 waving               row 4 jumping           row 5 standing (neutral)
//   row 6 arms-crossed         row 7 laptop (working)  row 8 thinking (chin)
//   rows 9-10 clockwise pointer-look poses (up -> right -> down -> left)
// ---------------------------------------------------------------------------
const FEMALE_PRESET = {
  spritesheet: "assets/sprite-2-v2.clean.webp",
  cell: { width: 192, height: 208 },
  sheet: { cols: 8, rows: 11 },
  scale: 0.72,
  spriteVersionNumber: 2,
  lookDirections: {
    enabled: true,
    deadzonePx: 20,
    phases: ["idle", "running", "paused", "finished"],
  },
  states: {
    idle:          { row: 0, frames: 8, fps: 5,  loop: true },
    working:       { row: 7, frames: 8, fps: 8,  loop: true },
    running:       { row: 7, frames: 8, fps: 8,  loop: true },
    running_left:  { row: 2, frames: 8, fps: 10, loop: true },
    waving:        { row: 3, frames: 8, fps: 6,  loop: false },
    jumping:       { row: 4, frames: 8, fps: 10, loop: false },
    failed:        { row: 5, frames: 8, fps: 6,  loop: false },
    waiting:       { row: 8, frames: 8, fps: 4,  loop: true },
    review:        { row: 7, frames: 8, fps: 5,  loop: true },
    sitting:       { row: 6, col: 0, frames: 2, fps: 2, loop: true, scale: 0.9 },
    running_right: { row: 1, frames: 8, fps: 9,  loop: true },
    reading:       { row: 8, frames: 8, fps: 5,  loop: true },
    drag_right:    { row: 1, frames: 8, fps: 11, loop: true },
    drag_left:     { row: 2, frames: 8, fps: 11, loop: true },
    look_000:      { row: 9, col: 0, frames: 1, fps: 1, loop: true },
    look_022_5:    { row: 9, col: 1, frames: 1, fps: 1, loop: true },
    look_045:      { row: 9, col: 2, frames: 1, fps: 1, loop: true },
    look_067_5:    { row: 9, col: 3, frames: 1, fps: 1, loop: true },
    look_090:      { row: 9, col: 4, frames: 1, fps: 1, loop: true },
    look_112_5:    { row: 9, col: 5, frames: 1, fps: 1, loop: true },
    look_135:      { row: 9, col: 6, frames: 1, fps: 1, loop: true },
    look_157_5:    { row: 9, col: 7, frames: 1, fps: 1, loop: true },
    look_180:      { row: 10, col: 0, frames: 1, fps: 1, loop: true },
    look_202_5:    { row: 10, col: 1, frames: 1, fps: 1, loop: true },
    look_225:      { row: 10, col: 2, frames: 1, fps: 1, loop: true },
    look_247_5:    { row: 10, col: 3, frames: 1, fps: 1, loop: true },
    look_270:      { row: 10, col: 4, frames: 1, fps: 1, loop: true },
    look_292_5:    { row: 10, col: 5, frames: 1, fps: 1, loop: true },
    look_315:      { row: 10, col: 6, frames: 1, fps: 1, loop: true },
    look_337_5:    { row: 10, col: 7, frames: 1, fps: 1, loop: true },
  },
};


// ---------------------------------------------------------------------------
// runtime state
// ---------------------------------------------------------------------------

let cfg = null;
let rawCfg = null; // store original fetched config
let scale = 1; // sheet px -> screen px
let baseState = "idle"; // looping state to return to after a one-shot
let current = "idle"; // animation currently on screen
let oneShot = false;
let frame = 0;
let lastTick = 0;
let phase = "idle";
let collapsed = false;
let dragging = false;
let isHovered = false; // true while cursor is over the mascot element
let lastX = null;
let lastY = null;
let lastActiveScale = null;
let prePos = null; // pet outer position (physical px) cached before centering on finish

// --- interaction layer (cursor feed + click-through + petting) -------------
let clickThrough = true;     // mirrors set_ignore_cursor_events; true = pass-through
let winPos = { x: 0, y: 0 }; // pet window outer position (physical px), cached
let interactive = false;     // true while the cursor is over the mascot/bubble
// velocity / shake / afk tracking, all fed by the global pet://cursor thread
let lastCursorTime = Date.now();
let lastCursorGx = null;
let lastCursorGy = null;
let sprinting = false;
let afk = false;
let shakeDir = 0;            // last horizontal travel sign (-1 | 0 | 1)
let shakeFlips = [];         // timestamps of recent direction reversals
let protesting = false;      // true while playing the shake-protest pose
const SHAKE_WINDOW = 600;    // ms lookback for counting reversals
const SHAKE_FLIPS = 4;       // reversals within the window => protest
const SHAKE_DEADZONE = 2;    // px; ignore sub-pixel jitter
// petting (press-and-hold on the mascot)
let petting = false;
let petTimer = null;
let petBurst = null;         // interval spawning hearts while held
let zzzTimer = null;         // interval drifting ≡ƒÆñ while dozing
let lastDragCursorX = null;  // global physical px; drives Codex left/right drag rows
let lastLookCursorX = null;  // global physical px; limits look-state stepping
let lastLookCursorY = null;
let dragOrigin = null;       // cursor/window origin for a pointer-captured drag
let dragPointerId = null;
let pendingDragPosition = null;
let dragPositionFrame = null;
const reducedMotion =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The v2 staging config remains opt-in through the Tauri window URL for
// regression checks. The default production path now loads the live v2 config.
const petConfigVariant = new URLSearchParams(window.location.search).get("petConfig");
const configPath =
  petConfigVariant === "v2"
    ? "./staging/flowmate-v2/pet-v2.test.config.json"
    : "./pet.config.json";
const LOOK_DEGREES = ["000", "022_5", "045", "067_5", "090", "112_5", "135", "157_5", "180", "202_5", "225", "247_5", "270", "292_5", "315", "337_5"];
const POINTER_LOOK_STEP_PX = 20;
const DRAG_DIRECTION_STEP_PX = 20;
let lookState = null;

// ---------------------------------------------------------------------------
// preferences sync
// ---------------------------------------------------------------------------

function loadPreferences() {
  try {
    const storeStr = localStorage.getItem("flowmate-supabase-session-store");
    if (!storeStr) return null;
    const store = JSON.parse(storeStr);
    return store?.state?.preferences || null;
  } catch (e) {
    console.error("[pet] failed to read localStorage store", e);
    return null;
  }
}

// Key written by src/lib/mascot-custom.ts. It is deliberately separate from the
// session store: that blob is rewritten on every timer tick, and a ~1MB data URL
// riding along with it would be re-serialized each time.
const CUSTOM_MASCOT_KEY = "flowmate-custom-mascot";

/** Uploaded user atlas, or null when none is stored or the entry is unusable. */
function loadCustomMascot() {
  try {
    const raw = localStorage.getItem(CUSTOM_MASCOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // A truncated write must not take the overlay down ΓÇö fall through to stock.
    if (typeof parsed?.dataUrl !== "string" || !parsed.dataUrl.startsWith("data:image/")) {
      return null;
    }
    return parsed;
  } catch (e) {
    console.error("[pet] failed to read custom mascot", e);
    return null;
  }
}

// Custom mascots are v1: 8x9, nine art rows, no look grid. All 14 state names
// resolve by aliasing onto those rows ΓÇö a missing name would silently render
// idle. Mirrors V1_STATES in src/lib/mascot-custom.ts.
const CUSTOM_V1_PRESET = {
  spritesheet: null, // filled in from the stored data URL
  cell: { width: 192, height: 208 },
  sheet: { cols: 8, rows: 9 },
  scale: 0.58,
  spriteVersionNumber: 1,
  lookDirections: null, // v1 has no look grid; cursor tracking short-circuits
  states: {
    idle:          { row: 0, frames: 6, fps: 5,  loop: true },
    sitting:       { row: 0, col: 0, frames: 1, fps: 2, loop: true },
    working:       { row: 1, frames: 8, fps: 8,  loop: true },
    drag_left:     { row: 2, frames: 8, fps: 11, loop: true },
    drag_right:    { row: 2, frames: 8, fps: 11, loop: true },
    running_left:  { row: 2, frames: 8, fps: 10, loop: true },
    running_right: { row: 2, frames: 8, fps: 10, loop: true },
    waving:        { row: 3, frames: 4, fps: 6,  loop: false },
    jumping:       { row: 4, frames: 5, fps: 10, loop: false },
    failed:        { row: 5, frames: 8, fps: 6,  loop: false },
    waiting:       { row: 6, frames: 6, fps: 4,  loop: true },
    review:        { row: 7, frames: 6, fps: 5,  loop: true },
    reading:       { row: 7, frames: 6, fps: 5,  loop: true },
    running:       { row: 8, frames: 6, fps: 9,  loop: true },
  },
  events: {
    hover: "review",
    click: "waving",
    doubleClick: "jumping",
    timerStart: { play: "waving", then: "running" },
    timerResume: { play: "waving", then: "running" },
    timerPause: "waiting",
    timerBreak: "idle",
    breakEnd: { play: "jumping", then: "running" },
    timerFinish: { play: "jumping", then: "idle" },
    timerAbandon: { play: "failed", then: "waiting" },
  },
  phaseStates: { idle: "idle", running: "running", paused: "waiting", finished: "idle" },
};

// Spontaneous-gesture cadence per the "Animation Frequency" setting.
// 0 = off (the mascot only reacts to the timer and the mouse).
const GESTURE_INTERVALS = { off: 0, calm: 150000, normal: 60000, lively: 25000 };
let gestureEveryMs = GESTURE_INTERVALS.normal;

function applyPreferences() {
  if (!cfg) return;
  // No saved preferences (fresh install / cleared storage) still needs the
  // visual setup below ΓÇö only the override sections are skipped.
  const prefs = loadPreferences() || {};

  // 1. Character swap ΓÇö the default male (kettle config), the female preset, or
  //    a user-uploaded v1 atlas. "sprite2" is a legacy alias for "female".
  //
  //    "custom" with nothing stored falls through to the default rather than
  //    rendering an empty sprite: the upload can be cleared from another window
  //    while this one is open.
  let preset = null;
  let customSheet = null;
  if (prefs.activeMascot === "female" || prefs.activeMascot === "sprite2") {
    preset = FEMALE_PRESET;
  } else if (prefs.activeMascot === "custom") {
    const custom = loadCustomMascot();
    if (custom) {
      preset = CUSTOM_V1_PRESET;
      customSheet = custom.dataUrl;
    }
  }
  if (preset) {
    cfg.spritesheet = customSheet || preset.spritesheet;
    cfg.cell = { ...preset.cell };
    cfg.sheet = { ...preset.sheet };
    cfg.scale = preset.scale;
    cfg.spriteVersionNumber = preset.spriteVersionNumber;
    // v1 presets carry no look grid. Deleting the key is what makes pet.js skip
    // cursor tracking entirely ΓÇö an empty object would still enable it.
    if (preset.lookDirections) {
      cfg.lookDirections = JSON.parse(JSON.stringify(preset.lookDirections));
    } else {
      delete cfg.lookDirections;
    }
    cfg.states = JSON.parse(JSON.stringify(preset.states));
    if (preset.events) cfg.events = JSON.parse(JSON.stringify(preset.events));
    if (preset.phaseStates) cfg.phaseStates = JSON.parse(JSON.stringify(preset.phaseStates));
  }

  // 2. Default resting animation (dropdown in settings) ΓÇö the looping state
  //    the mascot holds while nothing is happening.
  const rest = prefs.mascotDefaultAnimation;
  if (rest && cfg.states[rest] && cfg.states[rest].loop) {
    cfg.phaseStates = cfg.phaseStates || {};
    cfg.phaseStates.idle = rest;
    cfg.phaseStates.finished = rest;
  }

  // 3. Spontaneous gesture cadence.
  gestureEveryMs =
    GESTURE_INTERVALS[prefs.mascotAnimationFrequency] ?? GESTURE_INTERVALS.normal;

  // Apply visual sheet sizes and styles dynamically
  scale = cfg.scale || 0.58;
  const ch = cfg.cell.height * scale;
  const cw = cfg.cell.width * scale;

  document.documentElement.style.setProperty('--mascot-width', `${cw}px`);
  document.documentElement.style.setProperty('--mascot-height', `${ch}px`);

  el.mascot.style.width = `${cw}px`;
  el.mascot.style.height = `${ch}px`;
  el.mascot.style.marginLeft = `${-cw / 2}px`;
  el.mascot.style.backgroundImage = `url("${cfg.spritesheet}")`;
  el.mascot.style.backgroundSize = `${cfg.sheet.cols * cw}px ${cfg.sheet.rows * ch}px`;
  
  // Clear layout cache to force re-render
  lastActiveScale = null;
  lastX = null;
  lastY = null;
}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------

async function boot() {
  rawCfg = await fetch(configPath + "?t=" + Date.now()).then((r) => {
    if (!r.ok) throw new Error(`${configPath}: ${r.status}`);
    return r.json();
  });

  cfg = JSON.parse(JSON.stringify(rawCfg));
  applyPreferences();

  await listen("pet://state", (e) => onSignal(e.payload || {}));
  await listen("pet://cursor", (e) => {
    const p = e.payload || {};
    onCursor(p.x, p.y);
  });

  // Listen to Storage events to sync preferences dynamically!
  window.addEventListener("storage", (e) => {
    if (e.key === "flowmate-supabase-session-store" || e.key === CUSTOM_MASCOT_KEY) {
      cfg = JSON.parse(JSON.stringify(rawCfg));
      applyPreferences();
      if (!dragging) {
        syncAnimToPhase(phase);
      }
    }
  });

  // Start the OS cursor-polling thread (emits pet://cursor ~60Hz) and keep the
  // pet window's outer position cached so we can hit-test the global cursor.
  invoke("pet_tracking", { enabled: true }).catch(() => {});
  await refreshWinPos();
  setInterval(refreshWinPos, 1000);

  // 5-minute AFK doze ΓÇö only when idle (not running / dragging / petting).
  // While dozing a ≡ƒÆñ drifts up every few seconds so the sleep reads at a glance.
  setInterval(() => {
    const idleMs = Date.now() - lastCursorTime;

    // No cursor-idle nudge. A still mouse is not evidence that work stopped ΓÇö
    // the user may be reading, presenting, or on a call, and accusing them of
    // slacking after one quiet minute is exactly the behavior that trains people
    // to close the overlay. Real away-from-keyboard handling belongs to the
    // host's OS-level idle detection, which knows about all input, not just this
    // window's cursor.

    // 5-minute AFK doze ΓÇö only when idle (not running / dragging / petting).
    if (idleMs > 5 * 60 * 1000) {
      if (!afk && !dragging && !petting && phase !== "running" && cfg.states.sitting) {
        afk = true;
        applyState("sitting");
        spawnParticle("≡ƒÆñ");
        clearInterval(zzzTimer);
        zzzTimer = setInterval(() => spawnParticle("≡ƒÆñ"), 4000);
      }
    }
  }, 10000);

  // Gentle sign of life: a brief gesture on the user's chosen cadence
  // ("Animation Frequency" in settings), so the overlay is never fully frozen
  // but also never continuously animates. 0 = off.
  let lastGestureAt = Date.now();
  setInterval(() => {
    if (!gestureEveryMs || Date.now() - lastGestureAt < gestureEveryMs) return;
    if (collapsed || dragging || petting || afk || oneShot || isHovered) return;
    if (phase === "finished") return; // don't disturb the centered celebration
    lastGestureAt = Date.now();
    if (cfg.states.waving) applyState("waving");
  }, 5000);

  wireInput();
  applyPhase("idle");
  syncAnimToPhase("idle");
  requestAnimationFrame(loop);
}

// Cache the pet window's outer position (physical px) for cursor hit-testing.
async function refreshWinPos() {
  try {
    const p = await getCurrentWindow?.()?.outerPosition?.();
    if (p && typeof p.x === "number") winPos = { x: p.x, y: p.y };
  } catch (_) {}
}

// On task completion the pet jumps to the middle of the screen for a moment.
// We cache its prior spot so it can hop back when the session resumes/ends.
async function centerOnScreen() {
  try {
    const win = getCurrentWindow?.();
    if (!win) return;
    const [mon, size, pos] = await Promise.all([
      win.currentMonitor?.(),
      win.outerSize?.(),
      win.outerPosition?.(),
    ]);
    if (!mon || !size) return;
    if (!prePos && pos && typeof pos.x === "number") prePos = { x: pos.x, y: pos.y };
    const mx = mon.position?.x ?? 0;
    const my = mon.position?.y ?? 0;
    const mw = mon.size?.width ?? 0;
    const mh = mon.size?.height ?? 0;
    const x = Math.round(mx + (mw - size.width) / 2);
    const y = Math.round(my + (mh - size.height) / 2);
    await invoke("pet_set_position", { x, y });
    winPos = { x, y };
  } catch (_) {}
}

async function restorePosition() {
  if (!prePos) return;
  const target = prePos;
  prePos = null;
  try {
    await invoke("pet_set_position", { x: target.x, y: target.y });
    winPos = { x: target.x, y: target.y };
  } catch (_) {}
}

// Enable/disable mouse interaction by flipping OS click-through. We keep the
// pet pass-through (so the desktop stays usable) and only capture the mouse
// while the cursor is actually over the mascot or the timer bubble.
function setClickThrough(next) {
  if (clickThrough === next) return;
  clickThrough = next;
  invoke("pet_set_clickthrough", { enabled: next }).catch(() => {});
}

// Global physical cursor ΓåÆ drives hit-testing, fast-flick sprint, shake-protest
// and AFK wake. Coordinates arrive in physical px spanning all monitors.
function onCursor(gx, gy) {
  if (typeof gx !== "number" || typeof gy !== "number") return;
  const now = Date.now();
  // The cursor thread emits ~60Hz even when the mouse is still, so "idle" is
  // measured by an actual position change ΓÇö not just receiving an event.
  const moved = lastCursorGx === null || gx !== lastCursorGx || gy !== lastCursorGy;

  // Any movement wakes the pet from its AFK doze.
  if (moved) {
    if (afk) {
      afk = false;
      clearInterval(zzzTimer);
      zzzTimer = null;
      syncAnimToPhase(phase);
    }
  }

  // Window-relative CSS px (subtract window origin, divide by DPR).
  const dpr = window.devicePixelRatio || 1;
  const relX = (gx - winPos.x) / dpr;
  const relY = (gy - winPos.y) / dpr;

  // Hit-test the mascot + bubble + chevron + switcher + open notepad
  // (+ speech while speaking); capture the mouse only over them.
  const over =
    hitTest(el.mascot, relX, relY) ||
    hitTest(el.bubble, relX, relY) ||
    hitTest(el.hideToggle, relX, relY) ||
    hitTest(el.panelSwitch, relX, relY) ||
    (el.notepad && !el.notepad.hidden && hitTest(el.notepad, relX, relY)) ||
    (el.shell.dataset.speaking === "true" && hitTest(el.speech, relX, relY));
  interactive = over;
  if (!dragging) setClickThrough(!over);

  if (dragging) {
    updateDragDirection(gx);
    updateDraggedWindow(gx, gy);
  }
  updateLookDirection(gx, gy, moved);

  // (No fast-flick or shake reactions ΓÇö cursor speed no longer triggers poses.)

  if (moved) lastCursorTime = now; // only real movement resets the idle clock
  lastCursorGx = gx;
  lastCursorGy = gy;
}

// V2 uses an 11-row atlas: two extra rows provide a clockwise set of 16
// single-frame look poses.
function updateLookDirection(gx, gy, moved) {
  if (!cfg?.lookDirections?.enabled || !moved) return;
  const activePhases = cfg.lookDirections.phases;
  if (Array.isArray(activePhases) && !activePhases.includes(phase)) {
    clearLookDirection();
    return;
  }
  if (dragging || petting || afk || oneShot || collapsed) {
    lastLookCursorX = null;
    lastLookCursorY = null;
    return;
  }

  const rect = el.mascot?.getBoundingClientRect();
  if (!rect) return;
  const dpr = window.devicePixelRatio || 1;
  const cx = winPos.x + (rect.left + rect.width / 2) * dpr;
  const cy = winPos.y + (rect.top + rect.height / 2) * dpr;
  const dx = gx - cx;
  const dy = gy - cy;
  // Cursor coordinates are OS-global, so this works across every monitor.
  // Stay neutral inside the configured 20px center deadzone: v2 has no
  // dedicated neutral look cell.
  const configuredDeadzone = Number(cfg.lookDirections.deadzonePx);
  const deadzone = Math.max(8, Number.isFinite(configuredDeadzone) ? configuredDeadzone : 20);

  if (Math.hypot(dx, dy) < deadzone) {
    lastLookCursorX = null;
    lastLookCursorY = null;
    clearLookDirection();
    return;
  }

  // Do not flip between neighboring look frames on tiny cursor tremors.
  // The first position outside the pet deadzone is accepted immediately;
  // later changes need a full 20px physical move from the last accepted step.
  if (lastLookCursorX !== null && lastLookCursorY !== null) {
    if (Math.hypot(gx - lastLookCursorX, gy - lastLookCursorY) < POINTER_LOOK_STEP_PX) return;
  }

  // atan2(dx, -dy) produces the v2 convention: 000 is up, then clockwise.
  const degrees = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  const index = Math.round(degrees / 22.5) % 16;
  const next = `look_${LOOK_DEGREES[index]}`;
  if (!cfg.states[next] || next === lookState) return;

  lookState = next;
  lastLookCursorX = gx;
  lastLookCursorY = gy;
  setState(next);
}

function clearLookDirection() {
  if (!lookState) return;
  lookState = null;
  lastLookCursorX = null;
  lastLookCursorY = null;
  if (!oneShot && !dragging) restorePhaseState();
}

function restorePhaseState() {
  const target = cfg?.phaseStates?.[phase];
  if (!target || !cfg.states[target]) return;
  baseState = target;
  setState(target);
}

// Is (x,y) in CSS px inside an element's box (with a small padding)?
function hitTest(node, x, y, pad = 6) {
  if (!node) return false;
  const r = node.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}

// ---------------------------------------------------------------------------
// inbound signals
// ---------------------------------------------------------------------------

function eventTarget(name) {
  const v = cfg.events[name];
  if (!v) return null;
  return typeof v === "string" ? { play: v } : v;
}

// Show a message in the speech bubble. The bubble sizes to its text (CSS
// max-content) and fades/springs in and out; the timer card steps aside while
// the pet is talking (shell[data-speaking]). Clock | AI panel is data-pet-panel.
let speechTimer = null;
/** User explicitly chose Clock ΓÇö do not steal the view for a new reply. */
let userPinnedClock = false;
/** User explicitly chose AI ΓÇö keep the panel until they dismiss or switch. */
let userPinnedAi = false;
/** Latest AI/chat text so switching to AI without a fresh reply still works. */
let lastAiText = "";
let lastAiActions = [];
/** True when lastAiText is a live agent status seed (safe to refresh each tick). */
let lastAiIsAgentStatus = false;
let speechHasActions = false;
let singleClickTimer = null;
let pendingChatRequestId = null;
let chatReplyTimer = null;

// Reminders stay up much longer than ambient chatter ΓÇö they carry actions.
const SPEECH_DURATIONS = { chat: 7000, reminder: 15000, break: 25000 };
const CHAT_REPLY_TIMEOUT_MS = 5000;

// Pok├⌐mon-style letter reveal for speech. Hold duration starts after the
// last character, so short lines are not dismissed mid-type.
const SPEECH_CHAR_MS = 28;
const SPEECH_PUNCT_PAUSE_MS = 120;
const SPEECH_PUNCT = new Set([".", "!", "?", "ΓÇª", "ΓÇö", ";", ":"]);

let speechRevealTimer = null;
let speechRevealToken = 0;
let speechFullText = "";
let speechRevealing = false;
let speechRevealOnComplete = null;

// Break nudges get inline actions: snooze routes back to the host.
const BREAK_ACTIONS = [
  { label: "Snooze 5m", action: "snoozeBreak" },
  { label: "OK" },
];

function cancelSpeechReveal({ runComplete = false } = {}) {
  if (speechRevealTimer != null) {
    clearTimeout(speechRevealTimer);
    speechRevealTimer = null;
  }
  speechRevealing = false;
  if (el.speech) el.speech.dataset.revealing = "false";
  if (el.speechText) el.speechText.removeAttribute("aria-hidden");
  if (el.speech) {
    el.speech.removeAttribute("aria-busy");
    // Drop temporary label used while the visible text was partial.
    if (el.speech.getAttribute("aria-label") === speechFullText) {
      el.speech.removeAttribute("aria-label");
    }
  }
  const done = speechRevealOnComplete;
  speechRevealOnComplete = null;
  if (runComplete && typeof done === "function") done();
}

/** Snap to the full line and fire the post-reveal callback (e.g. auto-hide). */
function skipSpeechReveal() {
  if (!speechRevealing) return;
  cancelSpeechReveal({ runComplete: true });
  if (el.speechText && speechFullText) {
    el.speechText.textContent = speechFullText;
  }
}

/**
 * Type the line into #speechText character by character (caret while active).
 * Instant when reduced-motion is on, text is tiny, or opts.instant.
 * Click the bubble while revealing to skip (wired in wireInput).
 */
function revealSpeechText(text, { instant = false, onComplete } = {}) {
  cancelSpeechReveal();
  speechFullText = text;
  speechRevealOnComplete = typeof onComplete === "function" ? onComplete : null;

  const finish = () => {
    speechRevealing = false;
    if (el.speech) {
      el.speech.dataset.revealing = "false";
      el.speech.removeAttribute("aria-busy");
      if (el.speech.getAttribute("aria-label") === text) {
        el.speech.removeAttribute("aria-label");
      }
    }
    if (el.speechText) {
      el.speechText.removeAttribute("aria-hidden");
      el.speechText.textContent = text;
    }
    const done = speechRevealOnComplete;
    speechRevealOnComplete = null;
    if (typeof done === "function") done();
  };

  if (!el.speechText) {
    finish();
    return;
  }

  // Instant path: reduced motion, skip flag, or single glyph (e.g. "ΓÇª").
  if (instant || reducedMotion || text.length <= 1) {
    el.speechText.textContent = text;
    finish();
    return;
  }

  speechRevealing = true;
  if (el.speech) {
    el.speech.dataset.revealing = "true";
    el.speech.setAttribute("aria-busy", "true");
    // Full line available to AT immediately; visible text types in.
    el.speech.setAttribute("aria-label", text);
  }
  el.speechText.setAttribute("aria-hidden", "true");
  el.speechText.textContent = "";

  const token = ++speechRevealToken;
  let i = 0;

  const paint = (partial) => {
    // Clear then rebuild so the caret stays a real element (not text noise).
    el.speechText.textContent = "";
    el.speechText.appendChild(document.createTextNode(partial));
    if (partial.length < text.length) {
      const caret = document.createElement("span");
      caret.className = "speech-caret";
      caret.setAttribute("aria-hidden", "true");
      el.speechText.appendChild(caret);
    }
  };

  const step = () => {
    if (token !== speechRevealToken) return;
    if (i >= text.length) {
      speechRevealTimer = null;
      finish();
      return;
    }
    i += 1;
    paint(text.slice(0, i));
    const ch = text[i - 1];
    let delay = SPEECH_CHAR_MS;
    // Tiny beat after sentence punctuation ΓÇö reads more like dialogue boxes.
    if (SPEECH_PUNCT.has(ch)) delay += SPEECH_PUNCT_PAUSE_MS;
    else if (ch === "," || ch === "ΓÇö") delay += SPEECH_PUNCT_PAUSE_MS * 0.45;
    speechRevealTimer = setTimeout(step, delay);
  };

  step();
}

function getPetPanel() {
  return el.shell?.dataset.petPanel === "ai" ? "ai" : "clock";
}

function applyPanelChrome(next) {
  if (el.shell) el.shell.dataset.petPanel = next;
  if (el.modeClock) el.modeClock.setAttribute("aria-pressed", String(next === "clock"));
  if (el.modeAi) el.modeAi.setAttribute("aria-pressed", String(next === "ai"));
}

function setPetPanel(mode, { userChoice = false } = {}) {
  const next = mode === "ai" ? "ai" : "clock";
  applyPanelChrome(next);
  if (userChoice) {
    userPinnedClock = next === "clock";
    userPinnedAi = next === "ai";
  }
  // AI panel with no live text: show last reply or request a fresh one.
  if (next === "ai" && el.shell?.dataset.speaking !== "true") {
    if (lastAiText) {
      say(lastAiText, {
        kind: "chat",
        actions: lastAiActions,
        stayOnAi: true,
        forcePanel: true,
        // User-opened AI keeps the message until dismiss / Clock.
        hold: userPinnedAi,
      });
    } else {
      requestPetReply({ fromSwitcher: true });
    }
  }
}

function hideSpeech({ returnToClock = true } = {}) {
  cancelSpeechReveal();
  el.shell.dataset.speaking = "false";
  speechHasActions = false;
  if (el.speechActions) {
    el.speechActions.hidden = true;
    el.speechActions.innerHTML = "";
  }
  if (el.dismissSpeech) el.dismissSpeech.hidden = true;
  // Timeout after a readable delay returns to Clock unless the user pinned AI.
  if (returnToClock && getPetPanel() === "ai" && !userPinnedAi) {
    userPinnedClock = false;
    applyPanelChrome("clock");
  }
  clearTimeout(speechTimer);
  speechTimer = null;
}

function say(text, opts = {}) {
  if (!el.speech || !text) return;
  const kind = opts.kind || "chat";
  const actions = opts.actions || [];
  speechHasActions = actions.length > 0;

  // Cache chat replies for the AI panel switcher.
  if (kind === "chat" || opts.cacheAsAi) {
    lastAiText = text;
    lastAiActions = actions;
    lastAiIsAgentStatus = Boolean(opts.agentStatus);
  }

  el.speech.dataset.kind = kind;

  if (el.speechActions) {
    el.speechActions.innerHTML = "";
    for (const a of actions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn speech-btn";
      btn.textContent = a.label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        // Retry uses the same correlated request path as a mascot tap; do not
        // emit a bare control event that cannot resolve the pending bubble.
        if (a.action === "requestPetReply") {
          requestPetReply();
          return;
        }
        if (a.action) {
          const payload =
            a.payload &&
            typeof a.payload === "object" &&
            !Array.isArray(a.payload)
              ? a.payload
              : {};
          emit("pet://control", {
            ...payload,
            action: a.action,
            at: Date.now(),
          });
        }
        // Acting on a chip dismisses and returns to Clock.
        userPinnedAi = false;
        userPinnedClock = false;
        hideSpeech({ returnToClock: true });
        applyPanelChrome("clock");
      });
      el.speechActions.appendChild(btn);
    }
    el.speechActions.hidden = actions.length === 0;
  }

  // Auto status lines (e.g. agent finished) need no dismiss affordance.
  // User-opened AI always gets a dismiss so they can return to Clock.
  if (el.dismissSpeech) {
    const autoOnly =
      Boolean(opts.ms && !speechHasActions && opts.forcePanel) && !userPinnedAi && !opts.hold;
    el.dismissSpeech.hidden = autoOnly;
  }

  el.shell.dataset.speaking = "true";

  // Switch to AI for new replies unless the user is reading the timer / noting /
  // dragging, or has pinned Clock. forcePanel (agent finish) always shows.
  const noting = el.shell?.dataset.noting === "true";
  const shouldShowAi =
    opts.forcePanel ||
    opts.stayOnAi ||
    (!userPinnedClock && !noting && !dragging && opts.forcePanel !== false);
  if (shouldShowAi) {
    applyPanelChrome("ai");
    if (opts.forcePanel && !userPinnedAi) userPinnedClock = false;
  }

  clearTimeout(speechTimer);
  speechTimer = null;
  // Transient status lines (agent finished with empty chips + speechMs) always
  // auto-return ΓÇö they are not a user-opened chat.
  const transientStatus =
    Boolean(opts.forcePanel) && !speechHasActions && typeof opts.ms === "number";
  if (transientStatus) userPinnedAi = false;

  // Hold duration begins after the reveal finishes so the full line is readable.
  // Actionable / user-pinned AI stays until dismiss or a chip.
  const scheduleHide = () => {
    if (!speechHasActions && !opts.hold && (!userPinnedAi || transientStatus)) {
      speechTimer = setTimeout(() => {
        hideSpeech({ returnToClock: true });
      }, opts.ms || SPEECH_DURATIONS[kind] || 6000);
    }
  };

  // Agent status ticks and explicit opts.instant skip the typewriter (live refresh).
  revealSpeechText(text, {
    instant: Boolean(opts.instant || opts.agentStatus),
    onComplete: scheduleHide,
  });
}

function requestPetReply({ fromSwitcher = false } = {}) {
  if (dragging || petting) return;
  if (el.shell?.dataset.noting === "true") return;
  if (pendingChatRequestId) return;
  const requestId =
    globalThis.crypto?.randomUUID?.() ?? `pet-chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  pendingChatRequestId = requestId;
  userPinnedClock = false;
  if (fromSwitcher) userPinnedAi = true;
  applyPanelChrome("ai");
  // Soft pending state until the host answers via pet://state.
  if (!fromSwitcher || !lastAiText) {
    cancelSpeechReveal();
    if (el.speechText) el.speechText.textContent = "ΓÇª";
    el.shell.dataset.speaking = "true";
    if (el.dismissSpeech) el.dismissSpeech.hidden = false;
  }
  clearTimeout(chatReplyTimer);
  chatReplyTimer = setTimeout(() => {
    if (pendingChatRequestId !== requestId) return;
    pendingChatRequestId = null;
    say("Flowmate has not replied yet.", {
      kind: "chat",
      actions: [{ label: "Try again", action: "requestPetReply" }],
      stayOnAi: true,
      hold: userPinnedAi,
    });
  }, CHAT_REPLY_TIMEOUT_MS);
  emit("pet://control", { action: "requestPetReply", requestId, at: Date.now() });
}

function onSignal(sig) {
  if (
    typeof sig.chatRequestId === "string" &&
    sig.chatRequestId === pendingChatRequestId
  ) {
    pendingChatRequestId = null;
    clearTimeout(chatReplyTimer);
    chatReplyTimer = null;
  }
  if (typeof sig.source === "string") el.task.textContent = sig.source || "Ready to focus";
  if (typeof sig.detail === "string") el.timer.textContent = sig.detail || "00:00:00";
  if (typeof sig.phase === "string") applyPhase(sig.phase);
  // Extend chips: the host re-asserts this every second, so a pet opened
  // mid-alarm converges and the chips hide again after finish/extend.
  if (typeof sig.showExtend === "boolean") {
    setExtendVisible(sig.showExtend && phase === "finished");
  }

  // AI-working indicator: slight glow on the AI tab only ΓÇö not a log UI.
  // Host may also send `agentSummary` so the AI tab has live copy without a
  // full requestPetReply round-trip.
  if (typeof sig.agentActive === "boolean" && el.shell) {
    el.shell.dataset.agentActive = String(sig.agentActive);
  }
  if (typeof sig.agentSummary === "string" && sig.agentSummary) {
    // Only seed / refresh when empty or the cache is already agent status ΓÇö
    // never clobber a real chat reply the user is reading.
    if (sig.agentActive !== false && (!lastAiText || lastAiIsAgentStatus)) {
      lastAiText = sig.agentSummary;
      lastAiActions = [{ label: "Open timer", action: "openApp" }];
      lastAiIsAgentStatus = true;
      // Live-refresh the bubble if the AI panel is already showing that seed.
      // Instant ΓÇö status ticks every second; typewriter would thrash.
      if (
        getPetPanel() === "ai" &&
        el.shell?.dataset.speaking === "true" &&
        el.speechText &&
        lastAiIsAgentStatus
      ) {
        cancelSpeechReveal();
        speechFullText = sig.agentSummary;
        el.speechText.textContent = sig.agentSummary;
      }
    }
  } else if (sig.agentActive === false && lastAiIsAgentStatus) {
    // Agent stopped ΓÇö leave the last line; a finish quote will replace it.
    lastAiIsAgentStatus = false;
  }

  // Sync indicator. Pet mode hides the main window, so this is the only place
  // an offline or blocked queue can be seen while the user is focusing.
  if (typeof sig.syncState === "string" && el.syncDot) {
    const st = sig.syncState;
    el.syncDot.dataset.sync = st;
    el.syncDot.hidden = st === "ok";
    const n = typeof sig.syncPending === "number" ? sig.syncPending : 0;
    el.syncDot.title =
      st === "blocked"
        ? `${n || "Some"} change${n === 1 ? "" : "s"} could not be saved ΓÇö open Kettles`
        : st === "offline"
          ? n
            ? `Offline ┬╖ ${n} change${n === 1 ? "" : "s"} waiting`
            : "Offline"
          : st === "syncing"
            ? "SyncingΓÇª"
            : "";
  }

  // Speech: an explicit quote always wins; timer events fall back to their
  // built-in line. Spoken even mid-drag ΓÇö words are not animations. While the
  // extend chips are up the card must stay visible (speech hides it), so the
  // completion line is skipped ΓÇö the card's own message covers it.
  const line = sig.event ? SPEECH_LINES[sig.event] : null;
  const quoteKind = sig.quoteKind || (sig.event === "timerBreak" ? "break" : "chat");
  // Explicit empty array means "no chips" (agent finish). Omitted = break defaults.
  const quoteActions = Array.isArray(sig.actions)
    ? sig.actions
    : quoteKind === "break"
      ? BREAK_ACTIONS
      : null;
  const speechMs =
    typeof sig.speechMs === "number" && sig.speechMs > 0 ? sig.speechMs : undefined;
  if (sig.event === "timerFinish" && sig.showExtend === true) {
    // Extend chips own the card ΓÇö flash a short secondary, skip the speech
    // bubble so the timer card stays visible.
    hideSpeech();
    clearTimeout(speechTimer);
    showSecondary("Time's up! Keep going?");
  } else if (typeof sig.quote === "string" && sig.quote) {
    say(sig.quote, {
      kind: quoteKind,
      actions: quoteActions === null ? undefined : quoteActions,
      ms: speechMs,
      // Agent finish / status lines should show without requiring a pet click.
      forcePanel: quoteKind === "chat" && Array.isArray(sig.actions) && sig.actions.length === 0,
    });
    // Mirror short chat status onto the clock card for ~3s when it's a
    // transient status line (no action chips).
    if (Array.isArray(sig.actions) && sig.actions.length === 0) {
      showSecondary(sig.quote);
    }
  } else if (line) {
    say(line.text, { kind: quoteKind, actions: quoteActions, ms: speechMs });
    // Timer lifecycle events also flash under the task name for 3s.
    showSecondary(line.text);
  }

  if (dragging) return; // If dragging, ignore incoming animation changes!

  let play = null;
  let then = null;

  if (sig.state && cfg.states[sig.state]) {
    play = sig.state;
  } else if (sig.event) {
    const t = eventTarget(sig.event);
    if (t) {
      play = cfg.states[t.play] ? t.play : null;
      then = t.then && cfg.states[t.then] ? t.then : null;
    }
  }

  if (cfg.flashOn && sig.event && cfg.flashOn.includes(sig.event)) pop();
  if (sig.event === "timerFinish") confettiBurst();
  // Agent finish: a short cue + confetti, so a run completing while the user
  // looks elsewhere is noticed without a native notification.
  if (typeof sig.sound === "string" && sig.sound) {
    playCue(sig.sound);
    if (sig.sound === "cheer") confettiBurst();
  }

  if (play) {
    if (then) baseState = then;
    // timerFinish's jump is deferred to applyPhase so it fires AFTER the pet
    // reaches screen center ΓÇö the celebration lands in the middle, not mid-slide.
    if (sig.event !== "timerFinish") applyState(play);
  } else if (typeof sig.phase === "string") {
    syncAnimToPhase(sig.phase);
  }

  // Positive one-shot layered on top (e.g. a wave when the session starts);
  // it settles back into whatever looping state was just applied.
  if (line && line.anim && cfg.states[line.anim] && line.anim !== play) {
    applyState(line.anim);
  }
}

// ---------------------------------------------------------------------------
// phase + controls
// ---------------------------------------------------------------------------

function applyPhase(next) {
  if (!PHASE_LABELS[next]) return;
  const changed = next !== phase;
  const prevPhase = phase;
  phase = next;
  el.shell.dataset.phase = next;
  el.label.textContent = PHASE_LABELS[next];
  updateControls(next);
  // The extend chips only exist inside the finished state.
  if (next !== "finished") setExtendVisible(false);
  // Hop to screen center on completion, THEN jump ΓÇö so the celebration lands
  // in the middle of the screen and the flow reads cleanly. Hop back when
  // leaving the finished state.
  if (changed) {
    if (next === "finished") {
      centerOnScreen().then(() => {
        if (phase === "finished" && cfg.states.jumping) applyState("jumping");
      });
    } else if (prevPhase === "finished") {
      restorePosition();
    }
  }
  // Secondary status line is event-driven (3s flash) ΓÇö never a permanent
  // "You have completed task!" under the timer.
  if (changed && next !== "finished") hideSecondary();
  // Surface a freshly-finished session ΓÇö but only on the transition, so the
  // user can still collapse it afterwards (this fires every second otherwise).
  if (changed && next === "finished" && collapsed) setCollapsed(false);
}

// Secondary line under the task name ΓÇö only for brief event flashes (~3s).
const SECONDARY_MS = 3000;
let secondaryTimer = null;

function showSecondary(text, ms = SECONDARY_MS) {
  if (!el.msg || !text) return;
  el.msg.textContent = text;
  el.msg.hidden = false;
  clearTimeout(secondaryTimer);
  secondaryTimer = setTimeout(() => {
    if (el.msg) el.msg.hidden = true;
    secondaryTimer = null;
  }, ms);
}

function hideSecondary() {
  clearTimeout(secondaryTimer);
  secondaryTimer = null;
  if (el.msg) el.msg.hidden = true;
}

// Show/hide the timer-complete extend chips. While shown, force the window
// clickable so the chips work the instant the pet lands mid-screen.
let extendVisible = false;

function setExtendVisible(show) {
  if (!el.completeActions || extendVisible === show) return;
  extendVisible = show;
  el.completeActions.hidden = !show;
  if (show) {
    // One short flash when the alarm fires ΓÇö not a sticky finished label.
    showSecondary("Time's up! Keep going?");
    setClickThrough(false);
  } else {
    setClickThrough(!interactive);
  }
}

// Pause while running, Play while paused; hidden when idle/finished.
function updateControls(p) {
  const active = p === "running" || p === "paused";
  const finished = p === "finished";

  el.controls.hidden = !active && !finished;

  if (active) {
    el.toggle.hidden = false;
    el.complete.hidden = false;
    el.confirm.hidden = true;
    el.discard.hidden = true;

    if (p === "running") {
      el.toggle.dataset.act = "pause";
      el.toggleLabel.textContent = "Pause";
    } else {
      el.toggle.dataset.act = "play";
      el.toggleLabel.textContent = "Play";
    }
  } else if (finished) {
    el.toggle.hidden = true;
    el.complete.hidden = true;
    el.confirm.hidden = false;
    el.discard.hidden = false;
  }
}

function syncAnimToPhase(p) {
  if (oneShot || dragging) return; // Do not overwrite active dragging animation!
  const target = cfg.phaseStates && cfg.phaseStates[p];
  if (target && cfg.states[target] && baseState !== target) applyState(target);
}

// ---------------------------------------------------------------------------
// animation state machine
// ---------------------------------------------------------------------------

function applyState(name) {
  if (!cfg.states[name]) return;
  if (cfg.states[name].loop) {
    baseState = name;
    setState(name);
  } else {
    playOneShot(name);
  }
}

function setState(name) {
  if (!name.startsWith("look_")) lookState = null;
  current = name;
  frame = 0;
  lastTick = 0;
  oneShot = false;
}

function playOneShot(name) {
  lookState = null;
  current = name;
  frame = 0;
  lastTick = 0;
  oneShot = true;
}

// ---------------------------------------------------------------------------
// render loop ΓÇö runs continuously so the sprite is never left unpainted
// ---------------------------------------------------------------------------

function loop(now) {
  if (cfg) draw(now);
  requestAnimationFrame(loop);
}

function draw(now) {
  const s = cfg.states[current] || cfg.states.idle;
  const activeScale = scale * (s.scale || 1.0);

  if (activeScale !== lastActiveScale) {
    const ch = cfg.cell.height * activeScale;
    const cw = cfg.cell.width * activeScale;
    el.mascot.style.width = `${cw}px`;
    el.mascot.style.height = `${ch}px`;
    el.mascot.style.marginLeft = `${-cw / 2}px`;
    el.mascot.style.backgroundSize = `${cfg.sheet.cols * cw}px ${cfg.sheet.rows * ch}px`;

    document.documentElement.style.setProperty('--mascot-width', `${cw}px`);
    document.documentElement.style.setProperty('--mascot-height', `${ch}px`);

    lastActiveScale = activeScale;
    lastX = null;
    lastY = null;
  }

  const frameMs = 1000 / s.fps;

  // At rest, loop states hold a still frame ΓÇö the overlay stays calm instead
  // of churning frames continuously (which reads as distracting). Only
  // interaction (hover, drag, petting) and one-shots (wave / jump / a
  // once-a-minute gesture) actually animate. The sprite still gets its
  // position written each rAF so the layer stays painted.
  const atRest = !isHovered && !dragging && !petting && !oneShot && s.loop;
  if (atRest) {
    // Pin to frame 0 ΓÇö the mascot holds a still pose
    frame = 0;
  } else if (now - lastTick >= frameMs) {
    lastTick = now;
    frame += 1;
    if (frame >= s.frames) {
      frame = 0;
      if (oneShot) {
        setState(baseState); // one-shot finished -> settle into the loop
        return;
      }
    }
  }

  const col = (s.col || 0) + frame;
  const x = Math.round(-(col * cfg.cell.width * activeScale));
  const ch = cfg.cell.height * activeScale;
  const y = Math.round(-(s.row * ch));
  
  if (x !== lastX || y !== lastY) {
    el.mascot.style.backgroundPosition = `${x}px ${y}px`;
    lastX = x;
    lastY = y;
  }
}

function pop() {
  el.mascot.classList.remove("pop");
  void el.mascot.offsetWidth;
  el.mascot.classList.add("pop");
}

// Flying kiss ΓÇö a ≡ƒÆï that drifts up from the mascot's head and fades.
function flyKiss() {
  if (!el.shell) return;
  const kiss = document.createElement("span");
  kiss.className = "kiss";
  kiss.textContent = "≡ƒÆï";
  // start a little above the mascot, with a small random horizontal drift
  const drift = (Math.random() * 28 - 14).toFixed(0);
  kiss.style.setProperty("--kiss-drift", `${drift}px`);
  const mh = parseFloat(getComputedStyle(el.mascot).height) || 150;
  kiss.style.bottom = `${mh * 0.72}px`;
  el.shell.appendChild(kiss);
  kiss.addEventListener("animationend", () => kiss.remove());
  // safety cleanup
  setTimeout(() => kiss.remove(), 1600);
}

// ---------------------------------------------------------------------------
// collapse / expand
// ---------------------------------------------------------------------------

function setCollapsed(next) {
  if (collapsed === next) return;
  collapsed = next;
  el.shell.dataset.collapsed = String(next);
  if (next) {
    setState("idle"); // freeze on a calm pose, not mid-stride
  } else {
    lastTick = 0; // resume cleanly
    syncAnimToPhase(phase);
  }
}

// ---------------------------------------------------------------------------
// input: tap / drag / buttons
// ---------------------------------------------------------------------------

const DRAG_THRESHOLD = 4;

function updateDragDirection(globalX) {
  if (!dragging || typeof globalX !== "number") return;
  if (lastDragCursorX === null) {
    lastDragCursorX = globalX;
    return;
  }
  const delta = globalX - lastDragCursorX;
  // Keep the old sample until a true 20px drag step occurs. Updating it on
  // every event makes slow drags appear motionless and causes direction jitter.
  if (Math.abs(delta) < DRAG_DIRECTION_STEP_PX) return;
  lastDragCursorX = globalX;
  const next = delta < 0 ? "drag_left" : "drag_right";
  if (cfg.states[next] && current !== next) applyState(next);
}

function updateDraggedWindow(globalX, globalY) {
  if (!dragging || !dragOrigin) return;
  pendingDragPosition = {
    x: dragOrigin.windowX + globalX - dragOrigin.cursorX,
    y: dragOrigin.windowY + globalY - dragOrigin.cursorY,
  };
  if (dragPositionFrame !== null) return;
  dragPositionFrame = requestAnimationFrame(() => {
    dragPositionFrame = null;
    const next = pendingDragPosition;
    pendingDragPosition = null;
    if (!next) return;
    // Keep the local origin current immediately; the native command catches up
    // on the same animation frame and remains responsive across all monitors.
    winPos = next;
    invoke("pet_set_position", next).catch(() => {});
  });
}

function wireInput() {
  let pressed = false;
  let dragged = false;
  let onMascot = false;
  let didPet = false;
  let startX = 0;
  let startY = 0;

  // Clock | AI switcher
  el.modeClock?.addEventListener("click", (e) => {
    e.stopPropagation();
    // Clock is the timer surface ΓÇö clear speech so the card is visible.
    userPinnedAi = false;
    hideSpeech({ returnToClock: false });
    setPetPanel("clock", { userChoice: true });
  });
  el.modeAi?.addEventListener("click", (e) => {
    e.stopPropagation();
    setPetPanel("ai", { userChoice: true });
  });
  el.dismissSpeech?.addEventListener("click", (e) => {
    e.stopPropagation();
    emit("pet://control", { action: "dismissPetReply", at: Date.now() });
    userPinnedAi = false;
    userPinnedClock = false;
    hideSpeech({ returnToClock: false });
    setPetPanel("clock", { userChoice: true });
  });

  // Click the bubble body while typing ΓåÆ skip to full line (Pok├⌐mon A-button).
  // Dismiss / chips keep their own handlers above.
  el.speech?.addEventListener("click", (e) => {
    if (e.target.closest(".speech-dismiss, .speech-btn")) return;
    if (!speechRevealing) return;
    e.stopPropagation();
    skipSpeechReveal();
  });

  // Drag = grab-and-move the window. Codex's directional locomotion rows show
  // which way the pet is being carried; it settles back into its phase on drop.
  const beginDrag = (initialDelta) => {
    if (dragging) return;
    dragging = true;
    isHovered = false; // cursor left mascot when drag started
    lookState = null;
    if (petting) {
      petting = false;
      clearInterval(petBurst);
      petBurst = null;
    }
    const cursorX = Number.isFinite(lastCursorGx) ? lastCursorGx : winPos.x;
    const cursorY = Number.isFinite(lastCursorGy) ? lastCursorGy : winPos.y;
    dragOrigin = {
      cursorX,
      cursorY,
      windowX: winPos.x,
      windowY: winPos.y,
    };
    lastDragCursorX = cursorX;
    const initialState = initialDelta < 0 ? "drag_left" : "drag_right";
    if (cfg.states[initialState]) applyState(initialState);
    el.shell.classList.add("dragging");
    setClickThrough(false);
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    lastDragCursorX = null;
    dragOrigin = null;
    pendingDragPosition = null;
    if (dragPositionFrame !== null) {
      cancelAnimationFrame(dragPositionFrame);
      dragPositionFrame = null;
    }
    if (dragPointerId !== null && el.mascot.hasPointerCapture?.(dragPointerId)) {
      el.mascot.releasePointerCapture(dragPointerId);
    }
    dragPointerId = null;
    pressed = false;
    el.shell.classList.remove("dragging");
    // Squash-and-stretch landing; the class is cleared on animationend so the
    // idle breathing animation can resume.
    el.mascot.classList.remove("land");
    void el.mascot.offsetWidth;
    el.mascot.classList.add("land");
    void refreshWinPos();   // window landed somewhere new ΓÇö resync its origin
    if (petting) stopPetting(); else syncAnimToPhase(phase);
  };

  el.mascot.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || collapsed) return;
    e.preventDefault();
    el.mascot.setPointerCapture?.(e.pointerId);
    dragPointerId = e.pointerId;
    pressed = true;
    dragged = false;
    didPet = false;
    onMascot = true;
    startX = e.screenX;
    startY = e.screenY;
    // Press-and-hold on the mascot = sit. A short delay lets a quick click /
    // double-click pass through without flashing the sit pose. Once seated,
    // moving the mouse drags the window (still seated).
    clearTimeout(petTimer);
    petTimer = setTimeout(() => {
      if (pressed && !dragged) {
        didPet = true;
        startPetting();
      }
    }, 220);
  });

  window.addEventListener("pointermove", (e) => {
    if (!pressed || e.pointerId !== dragPointerId || dragging) return;
    if (Math.hypot(e.screenX - startX, e.screenY - startY) > DRAG_THRESHOLD) {
      dragged = true;
      clearTimeout(petTimer);
      if (petting) stopPetting();
      beginDrag(e.screenX - startX);
    }
  });

  const finishPointer = (e) => {
    if (e.pointerId !== dragPointerId) return;
    clearTimeout(petTimer);
    const wasDragging = dragging;
    const wasPetting = petting || didPet;
    if (dragging) endDrag();
    if (petting) stopPetting(); // releasing after a hold ends the pet
    // Quick click on mascot (no drag, no pet) ΓåÆ request AI reply.
    // Debounced so double-click can cancel and jump instead.
    if (onMascot && pressed && !wasDragging && !dragged && !wasPetting) {
      clearTimeout(singleClickTimer);
      singleClickTimer = setTimeout(() => {
        singleClickTimer = null;
        requestPetReply();
      }, 280);
    }
    pressed = false;
    onMascot = false;
    didPet = false;
    dragPointerId = null;
  };

  window.addEventListener("pointerup", finishPointer);
  window.addEventListener("pointercancel", finishPointer);

  el.collapse.addEventListener("click", (e) => {
    e.stopPropagation();
    setCollapsed(true);
  });

  // Single always-visible chevron toggles the timer card hidden/shown.
  document.getElementById("hideToggle")?.addEventListener("click", (e) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  });

  el.reopen.addEventListener("click", (e) => {
    e.stopPropagation();
    setCollapsed(false);
  });

  el.toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    emit("pet://control", { action: "toggle", at: Date.now() });
    updateControls(phase === "running" ? "paused" : "running"); // optimistic
  });

  el.complete.addEventListener("click", (e) => {
    e.stopPropagation();
    emit("pet://control", { action: "complete", at: Date.now() });
  });

  el.confirm.addEventListener("click", (e) => {
    e.stopPropagation();
    emit("pet://control", { action: "confirm", at: Date.now() });
  });

  el.discard.addEventListener("click", (e) => {
    e.stopPropagation();
    emit("pet://control", { action: "discard", at: Date.now() });
  });

  el.open.addEventListener("click", (e) => {
    e.stopPropagation();
    pokeApp();
  });

  // Timer-complete chips: extend the session or finish it from the pet.
  el.completeActions?.querySelectorAll("[data-extend]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const minutes = Number(btn.dataset.extend) || 5;
      emit("pet://control", { action: "extend", minutes, at: Date.now() });
      setExtendVisible(false); // optimistic ΓÇö the host confirms via pet://state
    });
  });

  el.finishNow?.addEventListener("click", (e) => {
    e.stopPropagation();
    emit("pet://control", { action: "complete", at: Date.now() });
    setExtendVisible(false);
  });

  // Notepad handlers ΓÇö right-click opens a full notepad panel that replaces
  // the timer card while open (shell[data-noting] hides the card via CSS).
  let noteOpen = false;

  const toggleNotePane = (show) => {
    noteOpen = show;
    if (!el.notepad) return;
    el.notepad.hidden = !show;
    el.shell.dataset.noting = String(show);

    if (show) {
      hideSpeech({ returnToClock: false }); // notepad owns the space above the mascot
      userPinnedAi = false;
      setPetPanel("clock", { userChoice: true });
      // Title mirrors where the host will file the note (session vs new task).
      if (el.notepadTitle) {
        el.notepadTitle.textContent =
          phase === "running" || phase === "paused" ? "Session note" : "Quick note";
      }
      el.noteInput.value = "";
      el.noteInput.focus();
      setClickThrough(false); // capture keyboard focus
    } else {
      setClickThrough(!interactive);
    }
  };

  // Right-click the mascot to jot a quick note (when the setting is on).
  el.mascot.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragging) return;
    const prefs = loadPreferences();
    if (!prefs?.petNotesIntegrationEnabled) return;
    toggleNotePane(!noteOpen);
  });

  el.cancelNote?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleNotePane(false);
  });

  el.closeNote?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleNotePane(false);
  });

  el.saveNote?.addEventListener("click", (e) => {
    e.stopPropagation();
    const txt = el.noteInput.value.trim();
    if (txt) {
      emit("pet://new-note", { text: txt });
    }
    toggleNotePane(false);
  });

  el.noteInput?.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      el.saveNote.click();
    } else if (e.key === "Escape") {
      el.cancelNote.click();
    }
  });

  // Keyboard parity for the mascot: Escape always closes the active surface;
  // Enter/Space performs the same quick-chat action as a click. This keeps the
  // overlay usable when a user navigates into it with a keyboard or assistive
  // technology instead of relying on pointer-only behavior.
  el.shell.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (noteOpen) {
        toggleNotePane(false);
      } else if (el.shell.dataset.speaking === "true") {
        emit("pet://control", { action: "dismissPetReply", at: Date.now() });
        userPinnedAi = false;
        hideSpeech({ returnToClock: false });
        setPetPanel("clock", { userChoice: true });
      }
      return;
    }
    if (e.target !== el.mascot || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    if (collapsed || dragging || petting) return;
    requestPetReply();
  });

  // Mascot interaction animations
  el.mascot.addEventListener("mouseenter", () => {
    if (collapsed || dragging) return;
    isHovered = true;
    const t = eventTarget("hover");
    if (t && cfg.states[t.play]) applyState(t.play);
  });

  el.mascot.addEventListener("mouseleave", () => {
    isHovered = false;
    if (!dragging && !oneShot) {
      // Return to the phase's looping state (e.g. "waiting" when idle)
      syncAnimToPhase(phase);
    }
  });

  el.mascot.addEventListener("click", (e) => {
    // Reply is scheduled from mouseup (gesture-safe). Companion mascots still
    // get a light reaction without stealing the AI path.
    if (dragging || dragged) return;
    const prefs = loadPreferences();
    if (prefs?.activeMascot === "sprite2" || prefs?.activeMascot === "female") {
      flyKiss();
      if (cfg.states.waving) applyState("waving");
    }
  });

  // Double-click the mascot ΓåÆ jump, then open the main app (not AI reply).
  el.mascot.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    e.preventDefault();
    clearTimeout(singleClickTimer);
    singleClickTimer = null;
    if (dragging) return;
    if (cfg.states.jumping) applyState("jumping");
    pokeApp();
  });

  // One-shot transform classes block the idle breathing animation while
  // present ΓÇö drop them as soon as their keyframes finish.
  el.mascot.addEventListener("animationend", (e) => {
    if (e.animationName === "land" || e.animationName === "pop") {
      el.mascot.classList.remove("land", "pop");
    }
  });

  // Reset dragging/hover states on window focus/blur
  window.addEventListener("blur", () => {
    isHovered = false;
    if (dragging) endDrag();
  });
  window.addEventListener("focus", () => {
    if (dragging) endDrag();
  });
}

// --- petting (press-and-hold the mascot) -----------------------------------

// Which pose to play while being petted ΓÇö prefer the click event's state,
// fall back to a happy wave.
function joyState() {
  const t = eventTarget("click");
  if (t && cfg.states[t.play]) return t.play;
  return cfg.states.waving ? "waving" : "idle";
}

function startPetting() {
  if (petting || collapsed || dragging) return;
  petting = true;
  // Press-and-hold simply sits the pet down ΓÇö no hearts/particles.
  if (cfg.states.sitting) applyState("sitting");
}

function stopPetting() {
  if (!petting) return;
  petting = false;
  clearInterval(petBurst);
  petBurst = null;
  if (!dragging && !oneShot) syncAnimToPhase(phase);
}

// A single floating emoji that drifts up from the mascot and fades.
// Defaults to affection (hearts/stars); callers can pass ≡ƒÆñ / ≡ƒÆó / etc.
function spawnParticle(char) {
  if (!el.shell) return;
  const p = document.createElement("span");
  p.className = "particle";
  p.textContent = char || (Math.random() < 0.5 ? "Γ¥ñ∩╕Å" : "Γ¡É");
  p.style.setProperty("--pdx", `${(Math.random() * 36 - 18).toFixed(0)}px`);
  const mh = parseFloat(getComputedStyle(el.mascot).height) || 150;
  p.style.bottom = `${mh * 0.7}px`;
  el.shell.appendChild(p);
  p.addEventListener("animationend", () => p.remove());
  setTimeout(() => p.remove(), 1300);
}

function burstPets(n) {
  for (let i = 0; i < n; i++) setTimeout(() => spawnParticle(), i * 70);
}

// Celebration confetti ΓÇö fired on timerFinish alongside the jump + pop.
const CONFETTI_COLORS = ["#3385ff", "#10b981", "#f5b14c", "#ef6aa5", "#8b5cf6"];

function confettiBurst() {
  if (!el.shell) return;
  const count = reducedMotion ? 6 : 16;
  for (let i = 0; i < count; i++) {
    const c = document.createElement("span");
    c.className = "confetti-piece";
    c.style.setProperty("--cp-color", CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
    c.style.setProperty("--cp-dx", `${(Math.random() * 170 - 85).toFixed(0)}px`);
    c.style.setProperty("--cp-up", `${(-(55 + Math.random() * 70)).toFixed(0)}px`);
    c.style.setProperty("--cp-down", `${(25 + Math.random() * 45).toFixed(0)}px`);
    c.style.setProperty("--cp-rot", `${(Math.random() * 540 - 270).toFixed(0)}deg`);
    c.style.animationDelay = `${(Math.random() * 140).toFixed(0)}ms`;
    el.shell.appendChild(c);
    c.addEventListener("animationend", () => c.remove());
    setTimeout(() => c.remove(), 2200);
  }
}

// ---------------------------------------------------------------------------
// audio cue
// ---------------------------------------------------------------------------
// Synthesised, not a file: the overlay ships no audio assets and a two-note
// blip is smaller as code than as an .ogg. Same WebAudio shape as
// src/lib/alarm.ts. Deliberately quiet and under 400ms ΓÇö this fires while the
// user is working in another window.
const CUE_NOTES = {
  cheer: [660, 880, 1175],
  alert: [440, 330],
};

let cueCtx = null;

function playCue(kind) {
  const notes = CUE_NOTES[kind];
  if (!notes) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!cueCtx || cueCtx.state === "closed") cueCtx = new Ctx();
    if (cueCtx.state === "suspended") cueCtx.resume().catch(() => {});
    notes.forEach((freq, i) => {
      const osc = cueCtx.createOscillator();
      const gain = cueCtx.createGain();
      osc.connect(gain);
      gain.connect(cueCtx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = cueCtx.currentTime + i * 0.11;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    /* audio is decoration ΓÇö never break the overlay */
  }
}

function pokeApp() {
  emit("pet://poke", { action: "openApp", at: Date.now() });
}

boot().catch((err) => console.error("[pet] boot failed", err));
