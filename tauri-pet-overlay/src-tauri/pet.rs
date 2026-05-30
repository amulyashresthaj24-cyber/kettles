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
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_notification::NotificationExt;

/// Window label of the pet overlay. Used by the capability file too.
pub const PET_LABEL: &str = "pet";

/// Overlay window size (logical px). The sprite is centered inside it.
const PET_W: f64 = 220.0;
const PET_H: f64 = 240.0;

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

/// Open (or reveal) the always-on-top pet overlay window.
/// Pass `x`/`y` (physical px) to place it, e.g. next to the mini-widget.
#[tauri::command]
pub fn pet_open(app: AppHandle, x: Option<f64>, y: Option<f64>) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(PET_LABEL) {
        win.show().map_err(|e| e.to_string())?;
        let _ = win.set_always_on_top(true);
        return Ok(());
    }

    let mut builder =
        WebviewWindowBuilder::new(&app, PET_LABEL, WebviewUrl::App("pet.html".into()))
            .title("Agent Pet")
            .inner_size(PET_W, PET_H)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .shadow(false)
            .focused(false)
            .visible(false);

    if let (Some(x), Some(y)) = (x, y) {
        builder = builder.position(x, y);
    }

    let win = builder.build().map_err(|e| e.to_string())?;
    win.show().map_err(|e| e.to_string())?;
    Ok(())
}

/// Close the pet overlay window.
#[tauri::command]
pub fn pet_close(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(PET_LABEL) {
        win.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// The one call you need: animate the pet and (on finish events) notify.
///
/// Examples — from your timer code:
///   pet_signal({ event: "timerStart",  source: "Acme Co", detail: "Logo draft" })
///   pet_signal({ event: "timerPause" })
///   pet_signal({ event: "timerFinish", detail: "Logo draft — done" })
///   pet_signal({ state: "running",     detail: "24:59" })   // live countdown text
#[tauri::command]
pub fn pet_signal(app: AppHandle, signal: PetSignal) -> Result<(), String> {
    // 1. Drive the animation + bubble inside the pet window.
    app.emit_to(PET_LABEL, "pet://state", &signal)
        .map_err(|e| e.to_string())?;

    // 2. Native desktop notification: explicit, or implied by a finish event.
    let notify = signal.notify.clone().or_else(|| match signal.event.as_deref() {
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

        // Re-assert the overlay on top so the user actually sees the reaction.
        if let Some(win) = app.get_webview_window(PET_LABEL) {
            let _ = win.show();
            let _ = win.set_always_on_top(true);
        }
    }

    Ok(())
}

/// Move the pet window (physical px). Handy to dock it beside the mini-widget.
#[tauri::command]
pub fn pet_set_position(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(PET_LABEL) {
        win.set_position(PhysicalPosition::new(x, y))
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
