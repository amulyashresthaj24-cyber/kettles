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
  speechStack: document.getElementById("speechStack"),
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
// Female mascot ("female") — baked preset for assets/sprite-2.clean.webp.
// (The newer sprite-female sheet rendered with bugs, so the female slot uses
// the proven companion atlas. "sprite2" is a legacy persisted id that
// resolves to this preset too.)
//
// The source art (sprite-2 design.webp) shipped opaque, with an opaque checker
// background and frames packed un-centered in their 8x9 grid. The .clean.webp
// atlas has the background flood-filled to transparent and every frame
// re-centered in a uniform 118x197 cell. Row meanings differ from the default
// sheet, so this preset remaps `states` while keeping the state NAMES
// identical so all event / phase / default-animation logic works untouched.
//
//   row 0 idle (standing)      row 1 walk-right        row 2 walk-left
//   row 3 waving               row 4 jumping           row 5 standing (neutral)
//   row 6 arms-crossed         row 7 laptop (working)  row 8 thinking (chin)
// ---------------------------------------------------------------------------
const FEMALE_PRESET = {
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
let runIdleNudged = false;   // true after the "still working?" nudge fires, until the cursor moves
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

// Spontaneous-gesture cadence per the "Animation Frequency" setting.
// 0 = off (the mascot only reacts to the timer and the mouse).
const GESTURE_INTERVALS = { off: 0, calm: 150000, normal: 60000, lively: 25000 };
let gestureEveryMs = GESTURE_INTERVALS.normal;

function applyPreferences() {
  if (!cfg) return;
  // No saved preferences (fresh install / cleared storage) still needs the
  // visual setup below — only the override sections are skipped.
  const prefs = loadPreferences() || {};

  // 1. Character swap — two mascots only: the default male (kettle config) and
  //    the female preset. Legacy ids ("sprite2", "custom") resolve sensibly.
  const preset =
    prefs.activeMascot === "female" || prefs.activeMascot === "sprite2"
      ? FEMALE_PRESET
      : null;
  if (preset) {
    cfg.spritesheet = preset.spritesheet;
    cfg.cell = { ...preset.cell };
    cfg.sheet = { ...preset.sheet };
    cfg.scale = preset.scale;
    cfg.states = JSON.parse(JSON.stringify(preset.states));
  }

  // 2. Default resting animation (dropdown in settings) — the looping state
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
    const idleMs = Date.now() - lastCursorTime;

    // Running + mouse idle > 1 min → wave and nudge. Fires once per idle
    // stretch (the latch clears the moment the cursor moves again).
    if (
      idleMs > 60 * 1000 &&
      phase === "running" &&
      !runIdleNudged &&
      !dragging &&
      !petting
    ) {
      runIdleNudged = true;
      if (cfg.states.waving) applyState("waving");
      say("Are you doing your work?", { kind: "reminder" });
    }

    // 5-minute AFK doze — only when idle (not running / dragging / petting).
    if (idleMs > 5 * 60 * 1000) {
      if (!afk && !dragging && !petting && phase !== "running" && cfg.states.sitting) {
        afk = true;
        applyState("sitting");
        spawnParticle("💤");
        clearInterval(zzzTimer);
        zzzTimer = setInterval(() => spawnParticle("💤"), 4000);
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

// Global physical cursor → drives hit-testing, fast-flick sprint, shake-protest
// and AFK wake. Coordinates arrive in physical px spanning all monitors.
function onCursor(gx, gy) {
  if (typeof gx !== "number" || typeof gy !== "number") return;
  const now = Date.now();
  // The cursor thread emits ~60Hz even when the mouse is still, so "idle" is
  // measured by an actual position change — not just receiving an event.
  const moved = lastCursorGx === null || gx !== lastCursorGx || gy !== lastCursorGy;

  // Any movement wakes the pet from its AFK doze / clears the idle nudge latch.
  if (moved) {
    runIdleNudged = false;
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

  // Hit-test the mascot + bubble + chevron + open notepad (+ queue actions);
  // capture the mouse only over interactive parts.
  const over =
    hitTest(el.mascot, relX, relY) ||
    hitTest(el.bubble, relX, relY) ||
    hitTest(el.hideToggle, relX, relY) ||
    (el.notepad && !el.notepad.hidden && hitTest(el.notepad, relX, relY)) ||
    Array.from(el.speechStack?.querySelectorAll(".speech-actions") || [])
      .some((actions) => hitTest(actions, relX, relY));
  interactive = over;
  if (!dragging) setClickThrough(!over);

  // (No fast-flick or shake reactions — cursor speed no longer triggers poses.)

  if (moved) lastCursorTime = now; // only real movement resets the idle clock
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

// Speech is a bounded notification stack: incoming chat no longer replaces an
// actionable reminder. Priority keeps break/reminder items nearest to the
// mascot, while bursts of chat collapse into one readable update.
const MAX_SPEECH_ITEMS = 3;
const speechItems = new Map();
const SPEECH_PRIORITY = { chat: 1, reminder: 2, break: 3 };
const CHAT_GROUP_WINDOW = 5000;

// Reminders stay up much longer than ambient chatter — they carry actions.
const SPEECH_DURATIONS = { chat: 6000, reminder: 15000, break: 25000 };

// Break nudges get inline actions: snooze routes back to the host.
const BREAK_ACTIONS = [
  { label: "Snooze 5m", action: "snoozeBreak" },
  { label: "OK" },
];

function syncSpeechVisibility() {
  el.shell.dataset.speaking = speechItems.size > 0 ? "true" : "false";
}

function dismissSpeech(item) {
  const timeout = speechItems.get(item);
  if (timeout) clearTimeout(timeout);
  speechItems.delete(item);
  item.remove();
  syncSpeechVisibility();
}

function hideSpeech() {
  for (const item of Array.from(speechItems.keys())) dismissSpeech(item);
}

function priorityFor(kind) {
  return SPEECH_PRIORITY[kind] || SPEECH_PRIORITY.chat;
}

function arrangeSpeechQueue() {
  if (!el.speechStack) return;
  const ordered = Array.from(speechItems.keys()).sort((a, b) => {
    const priorityDelta = Number(a.dataset.priority) - Number(b.dataset.priority);
    if (priorityDelta !== 0) return priorityDelta;
    return Number(a.dataset.createdAt) - Number(b.dataset.createdAt);
  });
  for (const item of ordered) el.speechStack.appendChild(item);
}

function resetSpeechTimer(item, duration) {
  const timeout = speechItems.get(item);
  if (timeout) clearTimeout(timeout);
  speechItems.set(item, setTimeout(() => dismissSpeech(item), duration));
}

function findRecentChatGroup(now) {
  return Array.from(speechItems.keys()).find(
    (item) =>
      item.dataset.kind === "chat" &&
      now - Number(item.dataset.lastAt || 0) <= CHAT_GROUP_WINDOW
  );
}

function addToChatGroup(item, text, now) {
  const count = Number(item.dataset.count || 1) + 1;
  const message = item.querySelector(".speech-text");
  item.dataset.count = String(count);
  item.dataset.lastAt = String(now);
  item.dataset.key = `chat-group:${now}`;
  if (message) message.textContent = `${count} updates · Latest: ${text}`;
  resetSpeechTimer(item, SPEECH_DURATIONS.chat);
  arrangeSpeechQueue();
  return item;
}

function trimSpeechQueue(nextPriority) {
  while (speechItems.size >= MAX_SPEECH_ITEMS) {
    const candidates = Array.from(speechItems.keys());
    const removable = candidates
      .filter((item) => Number(item.dataset.priority) <= nextPriority)
      .sort((a, b) => Number(a.dataset.priority) - Number(b.dataset.priority) || Number(a.dataset.createdAt) - Number(b.dataset.createdAt))[0];
    // Never push a lower-priority chat in front of a full set of reminders.
    if (!removable) return false;
    dismissSpeech(removable);
  }
  return true;
}

function say(text, opts = {}) {
  if (!el.speechStack || typeof text !== "string" || !text.trim()) return;
  const kind = opts.kind || "chat";
  const normalizedText = text.trim();
  const now = Date.now();
  const priority = priorityFor(kind);
  const actions = Array.isArray(opts.actions) ? opts.actions : [];
  const key = `${kind}:${normalizedText}`;
  const existing = Array.from(speechItems.keys()).find((item) => item.dataset.key === key);
  if (existing) dismissSpeech(existing);

  if (kind === "chat") {
    const chatGroup = findRecentChatGroup(now);
    if (chatGroup) return addToChatGroup(chatGroup, normalizedText, now);
  }

  if (!trimSpeechQueue(priority)) return;
  const item = document.createElement("article");
  item.className = "speech";
  item.dataset.kind = kind;
  item.dataset.key = key;
  item.dataset.priority = String(priority);
  item.dataset.createdAt = String(now);
  item.dataset.lastAt = String(now);
  item.dataset.count = "1";
  item.dataset.actionable = actions.length > 0 ? "true" : "false";

  const message = document.createElement("span");
  message.className = "speech-text";
  message.textContent = normalizedText;
  item.appendChild(message);

  if (actions.length > 0) {
    const actionBar = document.createElement("div");
    actionBar.className = "speech-actions";
    for (const action of actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn speech-btn";
      button.textContent = action.label;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (action.action) emit("pet://control", { action: action.action, at: Date.now() });
        dismissSpeech(item);
      });
      actionBar.appendChild(button);
    }
    item.appendChild(actionBar);
  }

  el.speechStack.appendChild(item);
  resetSpeechTimer(item, opts.ms || SPEECH_DURATIONS[kind] || 6000);
  arrangeSpeechQueue();
  syncSpeechVisibility();
}

function onSignal(sig) {
  if (typeof sig.source === "string") el.task.textContent = sig.source || "Ready to focus";
  if (typeof sig.detail === "string") el.timer.textContent = sig.detail || "00:00:00";
  if (typeof sig.phase === "string") applyPhase(sig.phase);
  // Extend chips: the host re-asserts this every second, so a pet opened
  // mid-alarm converges and the chips hide again after finish/extend.
  if (typeof sig.showExtend === "boolean") {
    setExtendVisible(sig.showExtend && phase === "finished");
  }

  // Speech: an explicit quote always wins; timer events fall back to their
  // built-in line. Spoken even mid-drag — words are not animations. While the
  // extend chips are up the card must stay visible (speech hides it), so the
  // completion line is skipped — the card's own message covers it.
  const line = sig.event ? SPEECH_LINES[sig.event] : null;
  const quoteKind = sig.quoteKind || (sig.event === "timerBreak" ? "break" : "chat");
  const quoteActions = quoteKind === "break" ? BREAK_ACTIONS : null;
  if (sig.event === "timerFinish" && sig.showExtend === true) {
    hideSpeech();
  } else if (typeof sig.quote === "string" && sig.quote) {
    say(sig.quote, { kind: quoteKind, actions: quoteActions });
  } else if (line) {
    say(line.text, { kind: quoteKind, actions: quoteActions });
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

  if (play) {
    if (then) baseState = then;
    // timerFinish's jump is deferred to applyPhase so it fires AFTER the pet
    // reaches screen center — the celebration lands in the middle, not mid-slide.
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
  // Hop to screen center on completion, THEN jump — so the celebration lands
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
  // Completion message: shown only while finished (task name stays above it).
  if (el.msg) {
    if (next === "finished") {
      el.msg.textContent = extendVisible ? "Time's up! Keep going?" : "You have completed task!";
      el.msg.hidden = false;
    } else {
      el.msg.hidden = true;
    }
  }
  // Surface a freshly-finished session — but only on the transition, so the
  // user can still collapse it afterwards (this fires every second otherwise).
  if (changed && next === "finished" && collapsed) setCollapsed(false);
}

// Show/hide the timer-complete extend chips. While shown, force the window
// clickable so the chips work the instant the pet lands mid-screen.
let extendVisible = false;

function setExtendVisible(show) {
  if (!el.completeActions || extendVisible === show) return;
  extendVisible = show;
  el.completeActions.hidden = !show;
  if (show) {
    if (el.msg && phase === "finished") {
      el.msg.textContent = "Time's up! Keep going?";
      el.msg.hidden = false;
    }
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

  // At rest, loop states hold a still frame — the overlay stays calm instead
  // of churning frames continuously (which reads as distracting). Only
  // interaction (hover, drag, petting) and one-shots (wave / jump / a
  // once-a-minute gesture) actually animate. The sprite still gets its
  // position written each rAF so the layer stays painted.
  const atRest = !isHovered && !dragging && !petting && !oneShot && s.loop;
  if (atRest) {
    // Pin to frame 0 — the mascot holds a still pose
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

  // Drag = grab-and-move the window while the pet stays SEATED (no walk/tilt).
  const beginDrag = () => {
    if (dragging) return;
    dragging = true;
    isHovered = false; // cursor left mascot when drag started
    if (!petting && cfg.states.sitting) applyState("sitting"); // ensure seated
    el.shell.classList.add("dragging");
    getCurrentWindow?.()?.startDragging?.();
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    pressed = false;
    el.shell.classList.remove("dragging");
    // Squash-and-stretch landing; the class is cleared on animationend so the
    // idle breathing animation can resume.
    el.mascot.classList.remove("land");
    void el.mascot.offsetWidth;
    el.mascot.classList.add("land");
    void refreshWinPos();   // window landed somewhere new — resync its origin
    if (petting) stopPetting(); else syncAnimToPhase(phase);
  };

  el.shell.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button")) return; // let buttons handle their own clicks
    pressed = true;
    dragged = false;
    onMascot = e.target === el.mascot;
    startX = e.screenX;
    startY = e.screenY;
    // Press-and-hold on the mascot = sit. A short delay lets a quick click /
    // double-click pass through without flashing the sit pose. Once seated,
    // moving the mouse drags the window (still seated).
    if (onMascot) {
      clearTimeout(petTimer);
      petTimer = setTimeout(() => { if (pressed) startPetting(); }, 150);
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (dragging && (e.buttons & 1) === 0) {
      endDrag();
      return;
    }
    if (dragging) return; // seated drag — the OS moves the window, pose stays put
    if (!pressed) return;
    if (Math.hypot(e.screenX - startX, e.screenY - startY) > DRAG_THRESHOLD) {
      pressed = false;
      dragged = true;
      clearTimeout(petTimer);
      if (!petting) startPetting(); // sit first, then drag from the seated pose
      beginDrag();
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

  // Timer-complete chips: extend the session or finish it from the pet.
  el.completeActions?.querySelectorAll("[data-extend]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const minutes = Number(btn.dataset.extend) || 5;
      emit("pet://control", { action: "extend", minutes, at: Date.now() });
      setExtendVisible(false); // optimistic — the host confirms via pet://state
    });
  });

  el.finishNow?.addEventListener("click", (e) => {
    e.stopPropagation();
    emit("pet://control", { action: "complete", at: Date.now() });
    setExtendVisible(false);
  });

  // Notepad handlers — right-click opens a full notepad panel that replaces
  // the timer card while open (shell[data-noting] hides the card via CSS).
  let noteOpen = false;

  const toggleNotePane = (show) => {
    noteOpen = show;
    if (!el.notepad) return;
    el.notepad.hidden = !show;
    el.shell.dataset.noting = String(show);

    if (show) {
      hideSpeech(); // the notepad owns the space above the mascot
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

  el.mascot.addEventListener("click", () => {
    if (dragging) return;
    const prefs = loadPreferences();
    if (prefs?.activeMascot === "sprite2" || prefs?.activeMascot === "female") {
      // Companion mascots: clicking blows a flying kiss (hand-up pose + 💋).
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
  const t = eventTarget("click");
  if (t && cfg.states[t.play]) return t.play;
  return cfg.states.waving ? "waving" : "idle";
}

function startPetting() {
  if (petting || collapsed || dragging) return;
  petting = true;
  // Press-and-hold simply sits the pet down — no hearts/particles.
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
