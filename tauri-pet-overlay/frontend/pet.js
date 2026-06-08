/* Agent Pet — overlay window logic (Tauri v2, vanilla JS / system WebView).
 *
 * Runs inside the "pet" window only. Talks to the rest of the app over Tauri
 * events. Requires `app.withGlobalTauri: true` in tauri.conf.json so that
 * `window.__TAURI__` is available without a bundler.
 *
 * Inbound  : event  "pet://state"  -> drives the animation + bubble.
 * Outbound : event  "pet://poke"   -> fired when the user clicks the pet.
 *
 * See README.md for the full trigger reference and customization guide.
 */

const { listen, emit } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;

const shellEl = document.getElementById("shell");
const petEl = document.getElementById("pet");
const bubbleEl = document.getElementById("bubble");
const sourceEl = document.getElementById("source");
const detailEl = document.getElementById("detail");

let cfg = null;
let baseState = "idle_blink"; // last looping state — the pet returns here after a one-shot
let current = "idle_blink"; // state currently on screen
let frame = 0;
let lastTick = 0;
let oneShot = false; // true while a non-looping animation plays once
let bubbleTimer = null;
let phase = "idle"; // coarse timer phase — drives data-phase + the resting state
let afk = false;
let sprinting = false;
let lastCursorTime = Date.now();
let lastCursorGx = null;
let lastCursorGy = null;

let dragging = false; // true while the OS is moving the window

/* ---------- boot ---------------------------------------------------------- */

async function boot() {
  cfg = await fetch("./pet.config.json?t=" + Date.now()).then((r) => r.json());

  petEl.style.backgroundImage = `url("${cfg.spritesheet}")`;
  petEl.style.backgroundSize = `${cfg.sheet.cols * 100}% ${cfg.sheet.rows * 100}%`;

  await listen("pet://state", (e) => onSignal(e.payload || {}));
  await listen("pet://cursor", (e) => {
    const p = e.payload || {};
    onCursor(p.x, p.y);
  });

  // 5 minute AFK check
  setInterval(() => {
    if (Date.now() - lastCursorTime > 5 * 60 * 1000) {
      if (!afk && !dragging && phase !== "running") {
        afk = true;
        applyState("sleeping_afk");
      }
    }
  }, 10000);

  wireInput();
  applyPhase("idle");
  setState("idle_blink");
  requestAnimationFrame(loop);
}

/* ---------- inbound signals (from the host app) --------------------------- */

// Resolve a config `events` entry to a normalized { play, then } object.
function eventTarget(name) {
  const v = cfg.events[name];
  if (!v) return null;
  return typeof v === "string" ? { play: v } : v;
}

// payload: { state?, event?, phase?, source?, detail? }
function onSignal(sig) {
  if (typeof sig.source === "string" || typeof sig.detail === "string") {
    showBubble(sig.source, sig.detail);
  }
  if (typeof sig.phase === "string") applyPhase(sig.phase);

  // Completing a focus session → scale-pop celebration (Row 6 plays below).
  if (sig.event === "timerFinish") celebrate();

  if (dragging) return; // OS owns the mascot mid-drag — don't fight the walk anim.

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

  if (cfg.flashOn && sig.event && cfg.flashOn.includes(sig.event)) flash();

  if (play) {
    if (then) baseState = then;
    applyState(play);
  } else if (typeof sig.phase === "string") {
    syncAnimToPhase(sig.phase);
  }
}

/* ---------- cursor velocity tracking (from the host app) ------------------ */

function onCursor(gx, gy) {
  if (typeof gx !== "number" || typeof gy !== "number") return;

  const now = Date.now();
  const dt = now - lastCursorTime;
  
  if (afk) {
    afk = false;
    syncAnimToPhase(phase);
  }

  // Velocity tracking (Fast Hunting)
  if (lastCursorGx !== null && lastCursorGy !== null && dt > 0) {
    const dist = Math.hypot(gx - lastCursorGx, gy - lastCursorGy);
    const speed = dist / dt; // px per ms
    
    // speed > 3 px/ms is roughly > 50px/frame at 60fps
    if (speed > 3.0 && !sprinting && !dragging) {
      sprinting = true;
      applyState("sprinting_fast");
      
      // Face the direction of the cursor movement
      const movingLeft = gx < lastCursorGx;
      petEl.style.transform = movingLeft ? "scaleX(1)" : "scaleX(-1)";
      
      clearTimeout(window._sprintTimeout);
      window._sprintTimeout = setTimeout(() => {
        sprinting = false;
        petEl.style.transform = "";
        syncAnimToPhase(phase);
      }, 500);
    }
  }

  lastCursorTime = now;
  lastCursorGx = gx;
  lastCursorGy = gy;
}

/* ---------- phase → data-phase + resting state ---------------------------- */

const PHASES = ["idle", "running", "paused", "finished"];

function applyPhase(p) {
  if (!PHASES.includes(p)) return;
  phase = p;
  shellEl.dataset.phase = p;
}

// Settle into the phase's looping state once a one-shot / drag finishes.
function syncAnimToPhase(p) {
  if (oneShot || dragging) return;
  const target = cfg.phaseStates && cfg.phaseStates[p];
  if (target && cfg.states[target] && baseState !== target) applyState(target);
}

// 1.2× pop for 3s on a completed session, then settle back.
function celebrate() {
  petEl.style.transition = "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";
  petEl.style.transform = "scale(1.2)";
  setTimeout(() => {
    petEl.style.transform = "";
  }, 3000);
}

/* ---------- state machine ------------------------------------------------- */

function applyState(name) {
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

/* ---------- animation loop ------------------------------------------------ */

function loop(now) {
  if (cfg) drawFrame(now);
  requestAnimationFrame(loop);
}

function drawFrame(now) {
  const state = cfg.states[current] || cfg.states.idle_blink;
  const frameMs = 1000 / state.fps;

  if (now - lastTick >= frameMs) {
    frame += 1;
    lastTick = now;
    if (frame >= state.frames) {
      frame = 0;
      if (oneShot) {
        // one-shot finished -> fall back to the last looping state
        setState(baseState);
        return;
      }
    }
  }

  const { cols, rows } = cfg.sheet;
  const x = cols > 1 ? (frame * 100) / (cols - 1) : 0;
  const y = rows > 1 ? (state.row * 100) / (rows - 1) : 0;
  petEl.style.backgroundPosition = `${x}% ${y}%`;
}

function flash() {
  petEl.classList.remove("flash");
  void petEl.offsetWidth; // restart the CSS animation
  petEl.classList.add("flash");
}

/* ---------- bubble (task / client / countdown text) ----------------------- */

function showBubble(source, detail) {
  if (!cfg.bubble || !cfg.bubble.enabled) return;
  if (typeof source === "string") sourceEl.textContent = source || "Pomodoro";
  if (typeof detail === "string") detailEl.textContent = detail || "";
  bubbleEl.hidden = false;
  bubbleEl.classList.remove("fade");

  clearTimeout(bubbleTimer);
  if (cfg.bubble.autoHideMs > 0) {
    bubbleTimer = setTimeout(hideBubble, cfg.bubble.autoHideMs);
  }
}

function hideBubble() {
  bubbleEl.classList.add("fade");
  setTimeout(() => {
    bubbleEl.hidden = true;
  }, 200);
}

/* ---------- input: click vs. drag, double-click, hover -------------------- */

const DRAG_THRESHOLD = 4; // px of travel before a press becomes a drag

function wireInput() {
  let pressed = false;
  let dragged = false;
  let startX = 0;
  let startY = 0;

  shellEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    pressed = true;
    dragged = false;
    startX = e.screenX;
    startY = e.screenY;
  });

  window.addEventListener("mousemove", (e) => {
    if (!pressed) return;
    if (Math.hypot(e.screenX - startX, e.screenY - startY) > DRAG_THRESHOLD) {
      pressed = false;
      dragged = true;
      dragging = true;
      shellEl.classList.add("dragging");
      // Carried/walking pose while moving (Row 1); face the travel direction.
      petEl.style.transform = e.screenX < startX ? "scaleX(1)" : "scaleX(-1)";
      applyState("walking");
      // Hand the move off to the OS — smooth, no per-pixel IPC.
      getCurrentWindow().startDragging();
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button !== 0) return;
    if (pressed && !dragged) onClick();
    if (dragged) {
      dragging = false;
      petEl.style.transform = ""; // drop the direction flip
      syncAnimToPhase(phase);     // settle into the phase's resting state
    }
    pressed = false;
    shellEl.classList.remove("dragging");
  });

  shellEl.addEventListener("dblclick", () => {
    const t = eventTarget("doubleClick");
    if (t && cfg.states[t.play]) playOneShot(t.play);
  });

  if (cfg && cfg.bubble && cfg.bubble.showOnHover) {
    shellEl.addEventListener("mouseenter", onHover);
  } else {
    // cfg may not be loaded yet at wire time; guard at call time too.
    shellEl.addEventListener("mouseenter", () => {
      if (cfg.bubble && cfg.bubble.showOnHover) onHover();
    });
  }
}

function onHover() {
  const t = eventTarget("hover");
  if (t && cfg.states[t.play]) playOneShot(t.play);
  bubbleEl.hidden = false;
  bubbleEl.classList.remove("fade");
  clearTimeout(bubbleTimer);
}

function onClick() {
  const t = eventTarget("click");
  if (t && cfg.states[t.play]) playOneShot(t.play);
  // Tell the host app the pet was clicked (e.g. to restore the full window).
  emit("pet://poke", { at: Date.now() });
}

boot();
