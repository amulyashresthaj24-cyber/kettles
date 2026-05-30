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
let baseState = "idle"; // last looping state — the pet returns here after a one-shot
let current = "idle"; // state currently on screen
let frame = 0;
let lastTick = 0;
let oneShot = false; // true while a non-looping animation plays once
let bubbleTimer = null;

/* ---------- boot ---------------------------------------------------------- */

async function boot() {
  cfg = await fetch("./pet.config.json?t=" + Date.now()).then((r) => r.json());

  petEl.style.backgroundImage = `url("${cfg.spritesheet}")`;
  petEl.style.backgroundSize = `${cfg.sheet.cols * 100}% ${cfg.sheet.rows * 100}%`;

  await listen("pet://state", (e) => onSignal(e.payload || {}));

  wireInput();
  setState("idle");
  requestAnimationFrame(loop);
}

/* ---------- inbound signals (from the host app) --------------------------- */

// Resolve a config `events` entry to a normalized { play, then } object.
function eventTarget(name) {
  const v = cfg.events[name];
  if (!v) return null;
  return typeof v === "string" ? { play: v } : v;
}

// payload: { state?, event?, source?, detail? }
function onSignal(sig) {
  if (typeof sig.source === "string" || typeof sig.detail === "string") {
    showBubble(sig.source, sig.detail);
  }

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
  if (!play) return;

  if (cfg.flashOn && sig.event && cfg.flashOn.includes(sig.event)) flash();

  if (then) baseState = then;
  applyState(play);
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
  const state = cfg.states[current] || cfg.states.idle;
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
      shellEl.classList.add("dragging");
      // Hand the move off to the OS — smooth, no per-pixel IPC.
      getCurrentWindow().startDragging();
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button !== 0) return;
    if (pressed && !dragged) onClick();
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
