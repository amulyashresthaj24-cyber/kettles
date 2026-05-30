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
const getCurrentWindow =
  tauri.window?.getCurrentWindow ||
  tauri.webviewWindow?.getCurrentWebviewWindow ||
  null;

const el = {
  shell: document.getElementById("shell"),
  mascot: document.getElementById("mascot"),
  bubble: document.getElementById("bubble"),
  dot: document.getElementById("dot"),
  label: document.getElementById("label"),
  timer: document.getElementById("timer"),
  task: document.getElementById("task"),
  controls: document.getElementById("controls"),
  toggle: document.getElementById("toggle"),
  toggleLabel: document.getElementById("toggleLabel"),
  complete: document.getElementById("complete"),
  confirm: document.getElementById("confirm"),
  discard: document.getElementById("discard"),
  open: document.getElementById("open"),
  collapse: document.getElementById("collapse"),
  reopen: document.getElementById("reopen"),
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
  const prefs = loadPreferences();
  if (!prefs) return;

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

  wireInput();
  applyPhase("idle");
  syncAnimToPhase("idle");
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// inbound signals
// ---------------------------------------------------------------------------

function eventTarget(name) {
  const v = cfg.events[name];
  if (!v) return null;
  return typeof v === "string" ? { play: v } : v;
}

function onSignal(sig) {
  if (typeof sig.source === "string") el.task.textContent = sig.source || "Ready to focus";
  if (typeof sig.detail === "string") el.timer.textContent = sig.detail || "00:00:00";
  if (typeof sig.phase === "string") applyPhase(sig.phase);

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

  if (play) {
    if (then) baseState = then;
    applyState(play);
  } else if (typeof sig.phase === "string") {
    syncAnimToPhase(sig.phase);
  }
}

// ---------------------------------------------------------------------------
// phase + controls
// ---------------------------------------------------------------------------

function applyPhase(next) {
  if (!PHASE_LABELS[next]) return;
  const changed = next !== phase;
  phase = next;
  el.shell.dataset.phase = next;
  el.label.textContent = PHASE_LABELS[next];
  updateControls(next);
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
  // Also freeze loop animations at frame 0 when idle (not hovered, not dragging)
  // — this gives complete stillness when the user isn't interacting.
  const isIdle = !isHovered && !dragging && !oneShot && s.loop;
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

  const beginDrag = (direction) => {
    dragging = true;
    isHovered = false; // cursor left mascot when drag started
    lastDragX = startX;
    el.shell.classList.add("dragging");
    const prefs = loadPreferences();
    const dragLeftAnim = prefs?.mascotMappings?.dragLeft || "running_left";
    const dragRightAnim = prefs?.mascotMappings?.dragRight || "running_right";
    applyState(direction === "left" ? dragLeftAnim : dragRightAnim);
    getCurrentWindow?.()?.startDragging?.();
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    lastDragX = null;
    el.shell.classList.remove("dragging");
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
        } else if (currentX > lastDragX + 1) {
          applyState(dragRightAnim);
        }
      }
      lastDragX = currentX;
      return;
    }
    if (!pressed) return;
    if (Math.hypot(e.screenX - startX, e.screenY - startY) > DRAG_THRESHOLD) {
      pressed = false;
      dragged = true;
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
    if (dragging) endDrag();
    if (pressed && !dragged && onMascot) {
      // Companion mascot uses a click to blow a kiss (handled in the mascot
      // click listener), so don't also collapse here — the chevron does that.
      const prefs = loadPreferences();
      if (prefs?.activeMascot !== "sprite2") {
        setCollapsed(!collapsed); // Toggle collapsed state on left click
      }
    }
    pressed = false;
  });

  el.collapse.addEventListener("click", (e) => {
    e.stopPropagation();
    setCollapsed(true);
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

  // Mascot interaction animations
  el.mascot.addEventListener("mouseenter", () => {
    if (collapsed || dragging) return;
    isHovered = true;
    const prefs = loadPreferences();
    const hoverAnim = prefs?.mascotMappings?.hover || "waving";
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
      return;
    }
    const target = eventTarget("click");
    if (target && cfg.states[target.play]) {
      applyState(target.play);
    }
  });

  // Double-click is intentionally disabled — no animation trigger

  // Reset dragging/hover states on window focus/blur
  window.addEventListener("blur", () => {
    isHovered = false;
    if (dragging) endDrag();
  });
  window.addEventListener("focus", () => {
    if (dragging) endDrag();
  });
}

function pokeApp() {
  emit("pet://poke", { at: Date.now() });
}

boot().catch((err) => console.error("[pet] boot failed", err));
