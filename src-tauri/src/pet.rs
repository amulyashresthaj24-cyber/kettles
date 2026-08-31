//! Agent Pet — overlay window module for Tauri v2.
//!
//! Drop this file next to `lib.rs` as `src-tauri/src/pet.rs`, then in `lib.rs`:
//!
//! ```ignore
//! mod pet;
//!
//! tauri::Builder::default()
//!     .plugin(tauri_plugin_notification::init())
//!     .invoke_handler(tauri::generate_handler![
//!         pet::pet_open,
//!         pet::pet_close,
//!         pet::pet_signal,
//!         pet::pet_set_position,
//!         pet::pet_set_clickthrough,
//!     ])
//!     // ...
//! ```
//!
//! The whole feature is driven by ONE command: `pet_signal`. Call it from your
//! timer logic whenever something happens — it animates the pet and fires a
//! native notification when a session finishes. See README.md.

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering::Relaxed};
use std::time::Duration;
use tauri::{
    utils::config::Color, AppHandle, Emitter, Manager, PhysicalPosition, WebviewUrl,
    WebviewWindowBuilder,
};
use tauri_plugin_notification::NotificationExt;

/// Window label of the pet overlay. Used by the capability file too.
pub const PET_LABEL: &str = "pet";

/// The overlay's entry document, relative to the frontend root.
///
/// Deliberately NOT `pet/pet.html`. WebView2 held a cached permanent redirect
/// for that URL (`/pet/pet.html` -> `/pet/pet`), and `/pet/pet` is not a route,
/// so Next answered with a 404 rendered inside the app's root layout — the
/// overlay came up as the Kettles sidebar instead of the mascot, on every boot.
/// A path that has never been requested is a fresh cache key, and dropping the
/// duplicated `pet/pet` segment removes the shape that invited the rewrite.
const PET_URL_PATH: &str = "pet/overlay.html";

/// Small overlay window (logical px). It is sized snug to the mascot + the note
/// / bubble that float above it, and the OS moves the whole window around — so
/// the pet can live on, and be dragged across to, ANY monitor.
pub const PET_W: f64 = 300.0;
pub const PET_H: f64 = 500.0;

static TRACKING: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "windows")]
#[repr(C)]
struct POINT {
    x: i32,
    y: i32,
}

#[cfg(target_os = "windows")]
extern "system" {
    fn GetCursorPos(lpPoint: *mut POINT) -> i32;
    fn GetSystemMetrics(index: i32) -> i32;
}

// SM_C[XY]SCREEN — PRIMARY monitor size (physical px). The primary monitor is
// always anchored at (0,0) in Windows screen coords.
#[cfg(target_os = "windows")]
const SM_CXSCREEN: i32 = 0;
#[cfg(target_os = "windows")]
const SM_CYSCREEN: i32 = 1;

/// (origin_x, origin_y, width, height) of the PRIMARY monitor, physical px.
///
/// NOTE: we deliberately do NOT span the whole virtual desktop. A transparent,
/// always-on-top WebView2 window that large (e.g. 4480x1440 across mixed-height
/// monitors) fails to composite — it renders fully invisible — and the
/// bottom-anchored mascot falls off shorter screens. Keep it on one monitor.
#[cfg(target_os = "windows")]
fn primary_screen() -> (i32, i32, i32, i32) {
    unsafe {
        let w = GetSystemMetrics(SM_CXSCREEN);
        let h = GetSystemMetrics(SM_CYSCREEN);
        if w <= 0 || h <= 0 {
            (0, 0, 1920, 1080)
        } else {
            (0, 0, w, h)
        }
    }
}

// Non-Windows builds (used for local Linux dev/testing of the overlay) have no
// Win32 screen-metrics API. The desktop app ships on Windows, so fall back to a
// sensible default primary-monitor size to keep the module portable.
#[cfg(not(target_os = "windows"))]
fn primary_screen() -> (i32, i32, i32, i32) {
    (0, 0, 1920, 1080)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorPos {
    pub x: f64,
    pub y: f64,
}

/// Optional native-notification payload.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotifyOpts {
    pub title: String,
    pub body: String,
}

/// One speech-bubble action. `payload` remains schemaless so later idle
/// recovery and closeout actions can add identifiers without another transport
/// rewrite.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PetAction {
    pub label: String,
    #[serde(default)]
    pub action: Option<String>,
    #[serde(default)]
    pub payload: Option<serde_json::Value>,
}

/// A single instruction for the pet. Every field is optional so callers send
/// only what they have.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PetSignal {
    /// Direct animation state: idle | running | waving | jumping | failed | waiting | review.
    #[serde(default)]
    pub state: Option<String>,
    /// High-level event mapped by `pet.config.json` -> `events`:
    /// timerStart | timerResume | timerPause | timerBreak | timerFinish | timerAbandon.
    #[serde(default)]
    pub event: Option<String>,
    /// Coarse timer phase for card styling: idle | running | paused | finished.
    #[serde(default)]
    pub phase: Option<String>,
    /// Short label for the pet's speech bubble, e.g. the client name.
    #[serde(default)]
    pub source: Option<String>,
    /// Detail line, e.g. the task name or the countdown "24:59".
    #[serde(default)]
    pub detail: Option<String>,
    /// Force a desktop notification regardless of `event`.
    #[serde(default)]
    pub notify: Option<NotifyOpts>,
    /// Speech-bubble quote text (reminders, break nudges, chatter).
    #[serde(default)]
    pub quote: Option<String>,
    /// Kind of quote for bubble styling: chat | break | reminder.
    #[serde(default, rename = "quoteKind")]
    pub quote_kind: Option<String>,
    /// Explicit speech-bubble actions. Omission preserves break defaults in JS.
    #[serde(default)]
    pub actions: Option<Vec<PetAction>>,
    /// Correlates a pet chat reply to the request that opened the bubble.
    #[serde(default, rename = "chatRequestId")]
    pub chat_request_id: Option<String>,
    /// Show the timer-complete extend chips (+5/+10/+25/Finish) on the card.
    #[serde(default, rename = "showExtend")]
    pub show_extend: Option<bool>,
    /// True while an external AI agent is working — glows the AI tab.
    #[serde(default, rename = "agentActive")]
    pub agent_active: Option<bool>,
    /// Live one-line agent status for the AI tab.
    #[serde(default, rename = "agentSummary")]
    pub agent_summary: Option<String>,
    /// Auto-dismiss speech after this many ms (pet.js); omit for kind defaults.
    #[serde(default, rename = "speechMs")]
    pub speech_ms: Option<u64>,
    /// Offline / queued-writes state for the pet card.
    #[serde(default, rename = "syncState")]
    pub sync_state: Option<String>,
    /// Count behind syncState.
    #[serde(default, rename = "syncPending")]
    pub sync_pending: Option<u32>,
    /// Short audio cue played by the overlay: `cheer` | `alert`. Omit for silence.
    #[serde(default)]
    pub sound: Option<String>,
}

/// Build the pet overlay window (hidden). MUST run on the main thread — call
/// this from `setup()`. Creating a webview window from an IPC command thread
/// deadlocks `build()` on Windows, so the window is created once at startup and
/// only shown/hidden afterwards.
pub fn pet_init(app: &AppHandle) -> Result<(), String> {
    if app.get_webview_window(PET_LABEL).is_some() {
        return Ok(());
    }

    log::info!("pet_init: creating pet overlay window (hidden)");

    // Small snug window, parked at the bottom-right of the primary monitor. The
    // OS owns its position from here on, so it can be dragged to any monitor.
    let (_, _, pw, ph) = primary_screen();

    // The default page loads the live v2 config. `FLOWMATE_PET_V2_TEST=1`
    // selects the isolated staged config for regression checks.
    let pet_page = if std::env::var("FLOWMATE_PET_V2_TEST").ok().as_deref() == Some("1") {
        format!("{PET_URL_PATH}?petConfig=v2")
    } else {
        PET_URL_PATH.to_string()
    };
    let builder =
        WebviewWindowBuilder::new(app, PET_LABEL, WebviewUrl::App(pet_page.into()))
            .title("Agent Pet")
            // The overlay must never become the main app. If anything sends it
            // elsewhere — a cached redirect, a stray link — drop the navigation
            // and say so, instead of silently rendering the Kettles UI inside a
            // 300x500 always-on-top window with no titlebar to close.
            .on_navigation(|url| {
                let allowed = url.scheme() == "about" || url.path().ends_with("/overlay.html");
                if !allowed {
                    log::warn!("pet: blocked navigation away from the overlay -> {url}");
                }
                allowed
            })
            .inner_size(PET_W, PET_H)
            .decorations(false)
            .transparent(true)
            .background_color(Color(0, 0, 0, 0))
            .devtools(cfg!(debug_assertions))
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .shadow(false)
            .visible(false);

    let win = builder.build().map_err(|e| {
        log::error!("pet_init: builder.build() FAILED: {e}");
        e.to_string()
    })?;

    // Park bottom-right of the primary monitor (physical px). PET_* are logical,
    // so scale them up by the monitor's factor.
    let scale = win.scale_factor().unwrap_or(1.0);
    let margin = 24.0 * scale;
    let x = (pw as f64) - (PET_W * scale) - margin;
    let y = (ph as f64) - (PET_H * scale) - margin;
    let _ = win.set_position(PhysicalPosition::new(x.max(0.0) as i32, y.max(0.0) as i32));

    // Windows applies click-through to the still-hidden overlay here. On Linux
    // (dev/test) the GTK window isn't realized until it's shown, and tao panics
    // trying to grab the underlying gdk::Window — so there it's applied in
    // pet_open after the window is visible instead.
    #[cfg(target_os = "windows")]
    let _ = win.set_ignore_cursor_events(true);
    log::info!("pet_init: pet overlay window created ({PET_W}x{PET_H} @ {x},{y})");
    Ok(())
}

/// Open (or reveal) the always-on-top pet overlay window.
#[tauri::command]
pub fn pet_open(app: AppHandle, _x: Option<f64>, _y: Option<f64>) -> Result<(), String> {
    if app.get_webview_window(PET_LABEL).is_none() {
        let handle = app.clone();
        app.run_on_main_thread(move || {
            let _ = pet_init(&handle);
        })
        .map_err(|e| e.to_string())?;
    }

    if let Some(win) = app.get_webview_window(PET_LABEL) {
        log::info!("showing pet overlay window");
        win.show().map_err(|e| e.to_string())?;
        let _ = win.set_always_on_top(true);
        // On non-Windows the overlay isn't realized until shown, so apply
        // click-through now (see pet_init). No-op-safe on an already-set window.
        #[cfg(not(target_os = "windows"))]
        let _ = win.set_ignore_cursor_events(true);
    }
    Ok(())
}

/// Hide the pet overlay window. The window is kept alive (not destroyed) so it
/// can be re-shown instantly without rebuilding the webview — rebuilding from a
/// command thread deadlocks on Windows.
#[tauri::command]
pub fn pet_close(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(PET_LABEL) {
        log::info!("hiding pet overlay window");
        win.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Whether the overlay is on screen right now.
///
/// The host needs this before it spends a proactive message. `pet_signal` emits
/// into the webview whether or not it is visible, so without this check the app
/// can "deliver" a warning to a hidden window and then suppress it for the rest
/// of the day. Returns false when the window has never been created.
#[tauri::command]
pub fn pet_is_open(app: AppHandle) -> bool {
    app.get_webview_window(PET_LABEL)
        .and_then(|win| win.is_visible().ok())
        .unwrap_or(false)
}

/// The one call you need: animate the pet and (on finish events) notify.
///
/// Returns whether the overlay was actually on screen for this signal. Callers
/// that spend a limited budget — the proactive ledger warnings in
/// `pet-context.ts` — must only mark a message as delivered when this is true.
/// Emitting into a hidden webview otherwise consumes the message silently.
#[tauri::command]
pub fn pet_signal(app: AppHandle, signal: PetSignal) -> Result<bool, String> {
    let delivered = pet_is_open(app.clone());

    // 1. Drive the animation + bubble inside the pet window. The window may be
    //    hidden (user exited mini mode mid-session) — don't let a failed emit
    //    swallow the notification below.
    let _ = app.emit_to(PET_LABEL, "pet://state", &signal);

    // 2. Native desktop notification: explicit, or implied by a finish event.
    let notify = signal
        .notify
        .clone()
        .or_else(|| match signal.event.as_deref() {
            Some("timerFinish") => Some(NotifyOpts {
                title: "Pomodoro complete".into(),
                body: signal
                    .detail
                    .clone()
                    .unwrap_or_else(|| "Time for a break.".into()),
            }),
            Some("timerAbandon") => Some(NotifyOpts {
                title: "Timer stopped".into(),
                body: "Session ended early.".into(),
            }),
            _ => None,
        });

    if let Some(n) = notify {
        app.notification()
            .builder()
            .title(&n.title)
            .body(&n.body)
            .show()
            .map_err(|e| e.to_string())?;

        // Re-assert the overlay on top so the user actually sees the reaction —
        // but only when it's already visible (mini mode). Never force-show it
        // over the main window when the user isn't in mini mode.
        if let Some(win) = app.get_webview_window(PET_LABEL) {
            if win.is_visible().unwrap_or(false) {
                let _ = win.set_always_on_top(true);
            }
        }
    }

    Ok(delivered)
}

/// Move the pet window (physical px). Used to park / snap it programmatically;
/// interactive dragging uses the OS via `startDragging` in the webview.
#[tauri::command]
pub fn pet_set_position(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(PET_LABEL) {
        let (x, y) = clamp_to_monitor(&win, x, y);
        win.set_position(PhysicalPosition::new(x, y))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Keep the overlay fully inside the monitor it sits on. Without this a drag
/// past an edge parks the window half off-screen, where the mascot is sliced
/// flat by the screen edge and the remaining sliver is hard to grab back.
fn clamp_to_monitor(win: &tauri::WebviewWindow, x: f64, y: f64) -> (i32, i32) {
    let (ww, wh) = win
        .outer_size()
        .map(|s| (s.width as f64, s.height as f64))
        .unwrap_or((PET_W, PET_H));

    let (mx, my, mw, mh) = win
        .current_monitor()
        .ok()
        .flatten()
        .map(|m| {
            let p = m.position();
            let s = m.size();
            (p.x as f64, p.y as f64, s.width as f64, s.height as f64)
        })
        .unwrap_or_else(|| {
            let (_, _, pw, ph) = primary_screen();
            (0.0, 0.0, pw as f64, ph as f64)
        });

    let max_x = mx + (mw - ww).max(0.0);
    let max_y = my + (mh - wh).max(0.0);
    (x.clamp(mx, max_x) as i32, y.clamp(my, max_y) as i32)
}

/// Toggle click-through. `true` = mouse passes through the pet to windows
/// behind it (pet becomes purely decorative; click/hover/drag stop working).
#[tauri::command]
pub fn pet_set_clickthrough(app: AppHandle, enabled: bool) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(PET_LABEL) {
        win.set_ignore_cursor_events(enabled)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Absolute OS cursor position in PHYSICAL px (global, spans all monitors). The
/// pet window subtracts its own outer position + divides by devicePixelRatio to
/// get window-relative px. No Tauri monitor calls here (those corrupt the heap
/// from a background thread).
#[cfg(target_os = "windows")]
fn cursor_pos() -> Result<CursorPos, String> {
    let mut pt = POINT { x: 0, y: 0 };
    unsafe {
        if GetCursorPos(&mut pt) != 0 {
            Ok(CursorPos {
                x: pt.x as f64,
                y: pt.y as f64,
            })
        } else {
            Err("Failed to get cursor position".into())
        }
    }
}

// Linux global cursor position via X11 `XQueryPointer` on the root window,
// returning physical screen px (matches the Windows contract). The X11 display
// is opened once per tracking thread and cached. This keeps the pet's
// cursor-follow ("look direction") poses working when running on Linux.
#[cfg(target_os = "linux")]
mod linux_cursor {
    use std::cell::Cell;
    use std::os::raw::{c_char, c_int, c_uint, c_ulong};

    type Display = std::ffi::c_void;
    type Window = c_ulong;

    #[link(name = "X11")]
    extern "C" {
        fn XOpenDisplay(name: *const c_char) -> *mut Display;
        fn XDefaultRootWindow(display: *mut Display) -> Window;
        #[allow(clippy::too_many_arguments)]
        fn XQueryPointer(
            display: *mut Display,
            w: Window,
            root_return: *mut Window,
            child_return: *mut Window,
            root_x_return: *mut c_int,
            root_y_return: *mut c_int,
            win_x_return: *mut c_int,
            win_y_return: *mut c_int,
            mask_return: *mut c_uint,
        ) -> c_int;
    }

    thread_local! {
        static DISPLAY: Cell<*mut Display> = const { Cell::new(std::ptr::null_mut()) };
    }

    pub fn query() -> Option<(f64, f64)> {
        DISPLAY.with(|slot| {
            let mut dpy = slot.get();
            if dpy.is_null() {
                dpy = unsafe { XOpenDisplay(std::ptr::null()) };
                if dpy.is_null() {
                    return None;
                }
                slot.set(dpy);
            }
            unsafe {
                let root = XDefaultRootWindow(dpy);
                let (mut root_ret, mut child_ret): (Window, Window) = (0, 0);
                let (mut rx, mut ry, mut wx, mut wy): (c_int, c_int, c_int, c_int) = (0, 0, 0, 0);
                let mut mask: c_uint = 0;
                let ok = XQueryPointer(
                    dpy, root, &mut root_ret, &mut child_ret, &mut rx, &mut ry, &mut wx, &mut wy,
                    &mut mask,
                );
                if ok != 0 {
                    Some((rx as f64, ry as f64))
                } else {
                    None
                }
            }
        })
    }
}

#[cfg(target_os = "linux")]
fn cursor_pos() -> Result<CursorPos, String> {
    match linux_cursor::query() {
        Some((x, y)) => Ok(CursorPos { x, y }),
        None => Err("Failed to get cursor position".into()),
    }
}

// Other non-Windows, non-Linux targets have no cursor source wired up here, so
// the tracking loop simply idles without emitting cursor updates.
#[cfg(not(any(target_os = "windows", target_os = "linux")))]
fn cursor_pos() -> Result<CursorPos, String> {
    Err("cursor tracking is not supported on this platform".into())
}

/// Start or stop the global cursor tracking thread. The thread only does a bare
/// platform cursor query (Win32 `GetCursorPos` on Windows, X11 `XQueryPointer`
/// on Linux) + `emit_to` (both thread-safe) — no Manager/monitor calls, which
/// are main-thread-only on Windows.
#[tauri::command]
pub fn pet_tracking(app: AppHandle, enabled: bool) -> Result<(), String> {
    if !enabled {
        TRACKING.store(false, Relaxed);
        return Ok(());
    }
    if TRACKING.swap(true, Relaxed) {
        return Ok(()); // already running
    }
    let app_clone = app.clone();
    std::thread::spawn(move || {
        let mut fail_count: u8 = 0;
        while TRACKING.load(Relaxed) {
            if let Ok(pos) = cursor_pos() {
                if app_clone.emit_to(PET_LABEL, "pet://cursor", pos).is_err() {
                    fail_count += 1;
                    if fail_count > 10 {
                        TRACKING.store(false, Relaxed);
                        break;
                    }
                } else {
                    fail_count = 0;
                }
            }
            std::thread::sleep(Duration::from_millis(16)); // ~60Hz
        }
    });
    Ok(())
}
