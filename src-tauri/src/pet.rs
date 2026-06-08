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

/// Small overlay window (logical px). It is sized snug to the mascot + the note
/// / bubble that float above it, and the OS moves the whole window around — so
/// the pet can live on, and be dragged across to, ANY monitor.
pub const PET_W: f64 = 300.0;
pub const PET_H: f64 = 500.0;

static TRACKING: AtomicBool = AtomicBool::new(false);

#[repr(C)]
struct POINT {
    x: i32,
    y: i32,
}

extern "system" {
    fn GetCursorPos(lpPoint: *mut POINT) -> i32;
    fn GetSystemMetrics(index: i32) -> i32;
}

// SM_C[XY]SCREEN — PRIMARY monitor size (physical px). The primary monitor is
// always anchored at (0,0) in Windows screen coords.
const SM_CXSCREEN: i32 = 0;
const SM_CYSCREEN: i32 = 1;

/// (origin_x, origin_y, width, height) of the PRIMARY monitor, physical px.
///
/// NOTE: we deliberately do NOT span the whole virtual desktop. A transparent,
/// always-on-top WebView2 window that large (e.g. 4480x1440 across mixed-height
/// monitors) fails to composite — it renders fully invisible — and the
/// bottom-anchored mascot falls off shorter screens. Keep it on one monitor.
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

    let builder =
        WebviewWindowBuilder::new(app, PET_LABEL, WebviewUrl::App("pet/pet.html".into()))
            .title("Agent Pet")
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

/// The one call you need: animate the pet and (on finish events) notify.
#[tauri::command]
pub fn pet_signal(app: AppHandle, signal: PetSignal) -> Result<(), String> {
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

    Ok(())
}

/// Move the pet window (physical px). Used to park / snap it programmatically;
/// interactive dragging uses the OS via `startDragging` in the webview.
#[tauri::command]
pub fn pet_set_position(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(PET_LABEL) {
        win.set_position(PhysicalPosition::new(x as i32, y as i32))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
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

/// Start or stop the global cursor tracking thread. The thread only does a bare
/// Win32 `GetCursorPos` + `emit_to` (both thread-safe) — no Manager/monitor
/// calls, which are main-thread-only on Windows.
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

