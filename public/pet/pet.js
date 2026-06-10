/* Flowmate pet overlay — controller for the "thinking" widget.
 *
 * Runs inside the "pet" window only. Talks to the host over Tauri events.
 *   inbound : "pet://state"   -> { state?, event?, phase?, source?, detail? }
 *   outbound: "pet://poke"    -> user tapped the mascot (restore main window)
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
  dot: document.getElementById("dot"),
  label: document.getElementById("label"),
  timer: document.getElementById("timer"),
  task: document.getElementById("task"),
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
  noteToggle: document.getElementById("noteToggle"),
  notePane: document.getElementById("notePane"),
  noteInput: document.getElementById("noteInput"),
  saveNote: document.getElementById("saveNote"),
  cancelNote: document.getElementById("cancelNote"),
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
const SPEECH_LINES = {
  timerStart:   { text: "Time to focus! Let's start work.", anim: "waving" },
  timerResume:  { text: "Back at it — let's go!", anim: "waving" },
  timerBreak:   { text: "Time to stretch and take a break!" },
  breakEnd:     { text: "Break's over! Ready to dive back in?", anim: "jumping" },
  timerFinish:  { text: "Great work! Session complete 🎉" },
  timerAbandon: { text: "Session ended — we'll get it next time." },
};

const MASCOT_HEIGHT = 128; // px; the mascot box height, matches pet.css

// ---------------------------------------------------------------------------
// Second mascot ("sprite2") — baked preset for assets/sprite-2.clean.webp.
//
// The source art (sprite-2 design.webp) shipped opaque, with an opaque checker
// background and frames packed un-centered in their 8x9 grid (which bled the
// next row's head into a cell). assets/sprite-2.clean.webp is the processed
// atlas: background flood-filled to transparent and every frame re-centered in
// a uniform 118x197 cell, so cells never bleed and the overlay stays see-through.
// Row meanings differ from the kettle sheet, so this preset also remaps `states`
// to the correct rows. State NAMES are kept identical to the kettle's so all
// existing event / phase / mapping / fps logic keeps working untouched.
//
//   row 0 idle (standing)      row 1 walk-right        row 2 walk-left
//   row 3 waving               row 4 jumping           row 5 standing (neutral)
//   row 6 arms-crossed         row 7 laptop (working)  row 8 thinking (chin)
// ---------------------------------------------------------------------------
const SPRITE2_PRESET = {
  spritesheet: "assets/sprite-2.clean.webp",
  cell: { width: 118, height: 197 },
  sheet: { cols: 8, rows: 9 },
  scale: 0.76,
  states: {
    idle:          { row: 0, frames: 8, fps: 5,  loop: true },
    working:       { row: 7, frames: 8, fps: 8,  loop: true },
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
let zzzTimer = null;         // interval drifting 💤 while dozing
const reducedMotion =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

function applyPreferences() {
  if (!cfg) return;
  // No saved preferences (fresh install / cleared storage) still needs the
  // visual setup below — only the override sections are skipped.
  const prefs = loadPreferences() || {};

  // 1. Character Swapping Config Overrides
  if (prefs.activeMascot === "sprite2") {
    // Baked second mascot: swap the sheet AND remap rows to its layout.
    cfg.spritesheet = SPRITE2_PRESET.spritesheet;
    cfg.cell = { ...SPRITE2_PRESET.cell };
    cfg.sheet = { ...SPRITE2_PRESET.sheet };
    cfg.scale = SPRITE2_PRESET.scale;
    cfg.states = JSON.parse(JSON.stringify(SPRITE2_PRESET.states));

  } else if (prefs.activeMascot === "custom") {
    cfg.spritesheet = prefs.customMascotSpritesheet || "assets/spritesheet.orig.webp";
    cfg.cell = {
      width: prefs.customMascotWidth ?? 192,
      height: prefs.customMascotHeight ?? 208
    };
    cfg.sheet = {
      cols: prefs.customMascotCols ?? 8,
      rows: prefs.customMascotRows ?? 9
    };
    cfg.scale = prefs.customMascotScale ?? 0.58;
  }

  // 2. Action Animation Mapping Overrides
  if (prefs.mascotMappings) {
    cfg.phaseStates = cfg.phaseStates || {};
    cfg.phaseStates.idle = prefs.mascotMappings.idle || "waiting";
    cfg.phaseStates.running = prefs.mascotMappings.toggle || "review";
    cfg.phaseStates.paused = prefs.mascotMappings.toggle || "review";
    cfg.phaseStates.finished = prefs.mascotMappings.idle || "waiting";

    cfg.events = cfg.events || {};
    cfg.events.hover = prefs.mascotMappings.hover || "waving";
    cfg.events.click = prefs.mascotMappings.hover || "waving";
    cfg.events.timerStart = prefs.mascotMappings.toggle || "review";
    cfg.events.timerResume = prefs.mascotMappings.toggle || "review";
    cfg.events.timerPause = prefs.mascotMappings.toggle || "review";
    cfg.events.timerBreak = prefs.mascotMappings.idle || "waiting";
    cfg.events.timerFinish = { play: prefs.mascotMappings.complete || "jumping", then: prefs.mascotMappings.idle || "waiting" };
  }

  // 3. FPS Speeds Overrides
  if (prefs.mascotFps) {
    for (const [key, fpsVal] of Object.entries(prefs.mascotFps)) {
      if (cfg.states[key]) {
        cfg.states[key].fps = fpsVal;
      }
    }
  }

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
  
  // 4. Notes Integration Toggle
  if (el.noteToggle) {
    el.noteToggle.hidden = !prefs.petNotesIntegrationEnabled;
  }
  
  // Clear layout cache to force re-render
  lastActiveScale = null;
  lastX = null;
  lastY = null;
}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------

async function boot() {
  rawCfg = await fetch("./pet.config.json?t=" + Date.now()).then((r) => {
    if (!r.ok) throw new Error(`pet.config.json: ${r.status}`);
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
    if (e.key === "flowmate-supabase-session-store") {
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

  // 5-minute AFK doze — only when idle (not running / dragging / petting).
  // While dozing a 💤 drifts up every few seconds so the sleep reads at a glance.
  setInterval(() => {
    if (Date.now() - lastCursorTime > 5 * 60 * 1000) {
      if (!afk && !dragging && !petting && phase !== "running" && cfg.states.sitting) {
        afk = true;
        applyState("sitting");
        spawnParticle("💤");
        clearInterval(zzzTimer);
        zzzTimer = setInterval(() => spawnParticle("💤"), 4000);
      }
    }
  }, 10000);

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

// Global physical cursor → drives hit-testing, fast-flick sprint, shake-protest
// and AFK wake. Coordinates arrive in physical px spanning all monitors.
function onCursor(gx, gy) {
  if (typeof gx !== "number" || typeof gy !== "number") return;
  const now = Date.now();
  const dt = now - lastCursorTime;

  // Any movement wakes the pet from its AFK doze.
  if (afk) {
    afk = false;
    clearInterval(zzzTimer);
    zzzTimer = null;
    syncAnimToPhase(phase);
  }

  // Window-relative CSS px (subtract window origin, divide by DPR).
  const dpr = window.devicePixelRatio || 1;
  const relX = (gx - winPos.x) / dpr;
  const relY = (gy - winPos.y) / dpr;

  // Hit-test the mascot + bubble + chevron; capture the mouse only over them.
  const over = hitTest(el.mascot, relX, relY) || hitTest(el.bubble, relX, relY) || hitTest(el.hideToggle, relX, relY);
  interactive = over;
  if (!dragging) setClickThrough(!over);

  // Cursor-driven moods only when active (not hidden / dragged / petted).
  if (!collapsed && !dragging && !petting && lastCursorGx !== null && dt > 0) {
    const dx = gx - lastCursorGx;
    const dist = Math.hypot(dx, gy - lastCursorGy);
    const speed = dist / dt; // px per ms

    // Fast flick (> ~3 px/ms) → the pet waves at you.
    if (speed > 3.0 && !sprinting && cfg.states.waving) {
      sprinting = true;        // reused as a "just waved" cooldown latch
      applyState("waving");
      clearTimeout(window._sprintTimeout);
      window._sprintTimeout = setTimeout(() => {
        sprinting = false;
        if (!oneShot) syncAnimToPhase(phase);
      }, 700);
    }

    // Frantic shake (>= 4 direction reversals in 600ms) → sit down.
    if (Math.abs(dx) > SHAKE_DEADZONE) {
      const dir = dx < 0 ? -1 : 1;
      if (shakeDir !== 0 && dir !== shakeDir) {
        shakeFlips.push(now);
        shakeFlips = shakeFlips.filter((t) => now - t < SHAKE_WINDOW);
        if (shakeFlips.length >= SHAKE_FLIPS && !protesting && cfg.states.sitting) {
          protesting = true;
          applyState("sitting");
          spawnParticle("💢"); // visible "hey, stop that" puff
          clearTimeout(window._shakeTimeout);
          window._shakeTimeout = setTimeout(() => {
            protesting = false;
            shakeFlips = [];
            syncAnimToPhase(phase);
          }, 2000);
        }
      }
      shakeDir = dir;
    }
  }

  lastCursorTime = now;
  lastCursorGx = gx;
  lastCursorGy = gy;
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
// the pet is talking (shell[data-speaking]).
let speechTimer = null;

function say(text, ms = 6000) {
  if (!el.speech || !text) return;
  el.speech.textContent = text;
  el.shell.dataset.speaking = "true";
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    el.shell.dataset.speaking = "false";
  }, ms);
}

function onSignal(sig) {
  if (typeof sig.source === "string") el.task.textContent = sig.source || "Ready to focus";
  if (typeof sig.detail === "string") el.timer.textContent = sig.detail || "00:00:00";
  if (typeof sig.phase === "string") applyPhase(sig.phase);

  // Speech: an explicit quote always wins; timer events fall back to their
  // built-in line. Spoken even mid-drag — words are not animations.
  const line = sig.event ? SPEECH_LINES[sig.event] : null;
  if (typeof sig.quote === "string" && sig.quote) say(sig.quote);
  else if (line) say(line.text);

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

  if (play) {
    if (then) baseState = then;
    applyState(play);
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
  // Hop to screen center on completion; hop back when leaving the finished state.
  if (changed) {
    if (next === "finished") centerOnScreen();
    else if (prevPhase === "finished") restorePosition();
  }
  // Completion message: shown only while finished (task name stays above it).
  if (el.msg) {
    if (next === "finished") {
      el.msg.textContent = "You have completed task!";
      el.msg.hidden = false;
    } else {
      el.msg.hidden = true;
    }
  }
  // Surface a freshly-finished session — but only on the transition, so the
  // user can still collapse it afterwards (this fires every second otherwise).
  if (changed && next === "finished" && collapsed) setCollapsed(false);
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
  current = name;
  frame = 0;
  lastTick = 0;
  oneShot = false;
}

function playOneShot(name) {
  current = name;
  frame = 0;
  lastTick = 0;
  oneShot = true;
}

// ---------------------------------------------------------------------------
// render loop — runs continuously so the sprite is never left unpainted
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

  // Frozen while collapsed: hold the current frame (no animation). The sprite
  // still gets its position written each rAF so the layer stays painted.
  // Also freeze loop animations at frame 0 when idle (not hovered, not dragging) and collapsed
  // — this gives complete stillness when the user isn't interacting and collapsed.
  const isIdle = collapsed && !isHovered && !dragging && !oneShot && s.loop;
  if (isIdle) {
    // Pin to frame 0 — the mascot holds a still pose
    frame = 0;
  } else if (!collapsed && now - lastTick >= frameMs) {
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

// Flying kiss — a 💋 that drifts up from the mascot's head and fades.
function flyKiss() {
  if (!el.shell) return;
  const kiss = document.createElement("span");
  kiss.className = "kiss";
  kiss.textContent = "💋";
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

function wireInput() {
  let pressed = false;
  let dragged = false;
  let onMascot = false;
  let startX = 0;
  let startY = 0;
  let lastDragX = null;

  // Tilt the sprite a few degrees into the travel direction (pet.css).
  const setDragDirection = (direction) => {
    el.shell.classList.toggle("drag-left", direction === "left");
    el.shell.classList.toggle("drag-right", direction === "right");
  };

  const beginDrag = (direction) => {
    dragging = true;
    isHovered = false; // cursor left mascot when drag started
    lastDragX = startX;
    el.shell.classList.add("dragging");
    setDragDirection(direction);
    const prefs = loadPreferences();
    const dragLeftAnim = prefs?.mascotMappings?.dragLeft || "drag_left";
    const dragRightAnim = prefs?.mascotMappings?.dragRight || "drag_right";
    applyState(direction === "left" ? dragLeftAnim : dragRightAnim);
    getCurrentWindow?.()?.startDragging?.();
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    lastDragX = null;
    el.shell.classList.remove("dragging", "drag-left", "drag-right");
    // Squash-and-stretch landing; the class is cleared on animationend so the
    // idle breathing animation can resume.
    el.mascot.classList.remove("land");
    void el.mascot.offsetWidth;
    el.mascot.classList.add("land");
    void refreshWinPos();   // window landed somewhere new — resync its origin
    syncAnimToPhase(phase); // settle back to the phase's looping state
  };

  el.shell.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button")) return; // let buttons handle their own clicks
    pressed = true;
    dragged = false;
    onMascot = e.target === el.mascot;
    startX = e.screenX;
    startY = e.screenY;
    // Press-and-hold on the mascot = petting (joy pose + particles). If the
    // pointer then travels past the drag threshold it becomes a drag instead.
    if (onMascot) {
      clearTimeout(petTimer);
      petTimer = setTimeout(() => { if (pressed && !dragged) startPetting(); }, 220);
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (dragging && (e.buttons & 1) === 0) {
      endDrag();
      return;
    }
    if (dragging) {
      const currentX = e.screenX;
      if (lastDragX !== null) {
        const prefs = loadPreferences();
        const dragLeftAnim = prefs?.mascotMappings?.dragLeft || "running_left";
        const dragRightAnim = prefs?.mascotMappings?.dragRight || "running_right";
        if (currentX < lastDragX - 1) {
          applyState(dragLeftAnim);
          setDragDirection("left");
        } else if (currentX > lastDragX + 1) {
          applyState(dragRightAnim);
          setDragDirection("right");
        }
      }
      lastDragX = currentX;
      return;
    }
    if (!pressed) return;
    if (Math.hypot(e.screenX - startX, e.screenY - startY) > DRAG_THRESHOLD) {
      pressed = false;
      dragged = true;
      clearTimeout(petTimer);   // moved too far — this is a drag, not a pet
      if (petting) stopPetting();
      const direction = (e.screenX < startX) ? "left" : "right";
      beginDrag(direction);
    }
  });

  window.addEventListener("mouseenter", (e) => {
    if (dragging && (e.buttons & 1) === 0) {
      endDrag();
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button !== 0) return;
    clearTimeout(petTimer);
    if (dragging) endDrag();
    if (petting) stopPetting(); // releasing after a hold ends the pet
    // Single taps no longer collapse — the card always shows the time, and a
    // double-tap is reserved for the jump.
    pressed = false;
  });

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

  // Scratchpad Note Handlers
  let noteOpen = false;

  const toggleNotePane = (show) => {
    noteOpen = show;
    el.notePane.hidden = !show;
    el.timer.hidden = show;
    el.task.hidden = show;
    if (el.msg) el.msg.hidden = show || phase !== "finished";
    
    if (show) {
      el.noteInput.value = "";
      el.noteInput.focus();
      setClickThrough(false); // capture keyboard focus
    } else {
      setClickThrough(!interactive);
    }
  };

  el.noteToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleNotePane(!noteOpen);
  });

  el.cancelNote?.addEventListener("click", (e) => {
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

  // Mascot interaction animations
  el.mascot.addEventListener("mouseenter", () => {
    if (collapsed || dragging) return;
    isHovered = true;
    const prefs = loadPreferences();
    const hoverAnim = prefs?.mascotMappings?.hover || "review"; // open the book
    applyState(hoverAnim); // Hovering always plays hover mapped anim
  });

  el.mascot.addEventListener("mouseleave", () => {
    isHovered = false;
    if (!dragging && !oneShot) {
      // Return to the phase's looping state (e.g. "waiting" when idle)
      syncAnimToPhase(phase);
    }
  });

  el.mascot.addEventListener("click", () => {
    if (dragging) return;
    const prefs = loadPreferences();
    if (prefs?.activeMascot === "sprite2") {
      // Companion mascot: clicking blows a flying kiss (hand-up pose + 💋).
      flyKiss();
      if (cfg.states.waving) applyState("waving");
    }
    // Default mascot: single click does nothing — double-click jumps.
  });

  // Double-click the mascot → jump, then open the main app.
  el.mascot.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (dragging) return;
    if (cfg.states.jumping) applyState("jumping");
    pokeApp();
  });

  // One-shot transform classes block the idle breathing animation while
  // present — drop them as soon as their keyframes finish.
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

// Which pose to play while being petted — prefer the click event's state,
// fall back to a happy wave.
function joyState() {
  const prefs = loadPreferences();
  const m = prefs?.mascotMappings?.click;
  if (m && cfg.states[m]) return m;
  const t = eventTarget("click");
  if (t && cfg.states[t.play]) return t.play;
  return cfg.states.waving ? "waving" : "idle";
}

function startPetting() {
  if (petting || collapsed || dragging) return;
  petting = true;
  if (cfg.states.sitting) applyState("sitting"); // press-and-hold → sit down
  // Affection feedback: a quick burst, then a steady drip of hearts while held.
  burstPets(3);
  clearInterval(petBurst);
  petBurst = setInterval(() => spawnParticle(), reducedMotion ? 600 : 280);
}

function stopPetting() {
  if (!petting) return;
  petting = false;
  clearInterval(petBurst);
  petBurst = null;
  if (!dragging && !oneShot) syncAnimToPhase(phase);
}

// A single floating emoji that drifts up from the mascot and fades.
// Defaults to affection (hearts/stars); callers can pass 💤 / 💢 / etc.
function spawnParticle(char) {
  if (!el.shell) return;
  const p = document.createElement("span");
  p.className = "particle";
  p.textContent = char || (Math.random() < 0.5 ? "❤️" : "⭐");
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

// Celebration confetti — fired on timerFinish alongside the jump + pop.
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

function pokeApp() {
  emit("pet://poke", { at: Date.now() });
}

boot().catch((err) => console.error("[pet] boot failed", err));
