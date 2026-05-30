/* Agent Pet — HOST-side helper.
 *
 * Include this in your MAIN app window (the one with the timer / mini-widget),
 * NOT in the pet window. It wraps the Tauri commands so your timer code reads
 * like plain English: `petClient.timerStart(...)`, `petClient.timerFinish(...)`.
 *
 * Load it as a normal script:   <script src="pet-client.js"></script>
 * then use the global `window.petClient`.
 *
 * Requires `app.withGlobalTauri: true` in tauri.conf.json.
 */
(function () {
  const { invoke } = window.__TAURI__.core;
  const { listen } = window.__TAURI__.event;

  const sig = (signal) => invoke("pet_signal", { signal });

  window.petClient = {
    /* ---- window lifecycle ---- */

    // Open the overlay. Pass physical px to place it (e.g. above the widget).
    open: (x, y) => invoke("pet_open", { x: x ?? null, y: y ?? null }),
    close: () => invoke("pet_close"),
    setPosition: (x, y) => invoke("pet_set_position", { x, y }),
    // true = mouse passes through the pet (decorative only).
    setClickThrough: (enabled) => invoke("pet_set_clickthrough", { enabled }),

    /* ---- timer events: call these from your Pomodoro logic ---- */

    // source = client/badge text, detail = task name. Both show in the bubble.
    timerStart: (source, detail) => sig({ event: "timerStart", source, detail }),
    timerResume: (source, detail) => sig({ event: "timerResume", source, detail }),
    timerPause: () => sig({ event: "timerPause" }),
    timerBreak: () => sig({ event: "timerBreak" }),
    timerFinish: (detail) => sig({ event: "timerFinish", detail }), // also notifies
    timerAbandon: () => sig({ event: "timerAbandon" }), // also notifies

    // Push the live countdown text into the bubble every second (optional).
    tick: (countdown) => sig({ state: "running", detail: countdown }),

    /* ---- escape hatch: send any raw signal ---- */
    signal: (signalObj) => sig(signalObj),

    /* ---- listen for pet clicks (e.g. to restore the full window) ---- */
    onPoke: (callback) => listen("pet://poke", callback),
  };
})();
