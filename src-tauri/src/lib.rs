use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

mod pet;

// ---------------------------------------------------------------------------
// Idle detection state
// ---------------------------------------------------------------------------

static IDLE_NOTIFIED: AtomicBool = AtomicBool::new(false);
static IDLE_DETECTION_ENABLED: AtomicBool = AtomicBool::new(true);
const IDLE_THRESHOLD_SECS: u64 = 300; // 5 minutes

// ---------------------------------------------------------------------------
// IPC Commands (invoked from the React frontend)
// ---------------------------------------------------------------------------

#[tauri::command]
fn hide_to_tray(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
}

#[tauri::command]
fn show_from_tray(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = pet::pet_close(app.clone());
        let _ = win.set_skip_taskbar(false);
        let _ = win.show();
        let _ = win.set_focus();
    }
}
#[tauri::command]
fn enter_mini_mode(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("enter_mini_mode invoked");
    // Pet mode = hide main window entirely, show only the pet avatar overlay.
    // Pet bubble already renders task title + live timer via pet_signal stream.
    let pet_pos = primary_pet_position(&app);
    log::info!("enter_mini_mode: opening pet before hiding main");
    match pet_pos {
        Some((x, y)) => pet::pet_open(app.clone(), Some(x), Some(y))?,
        None => pet::pet_open(app.clone(), None, None)?,
    }

    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
        let _ = win.set_skip_taskbar(true);
    }
    log::info!("enter_mini_mode: main hidden");
    log::info!("enter_mini_mode: done");
    Ok(())
}

fn primary_pet_position(app: &tauri::AppHandle) -> Option<(f64, f64)> {
    let win = app.get_webview_window("main")?;
    let monitor = win.current_monitor().ok().flatten()?;
    let scale = monitor.scale_factor();
    let area = monitor.work_area();
    let pet_w = pet::PET_W * scale;
    let margin = 24.0 * scale;
    let x = (area.position.x as f64) + (area.size.width as f64) - pet_w - margin;
    let y = (area.position.y as f64) + margin;
    Some((x, y))
}

#[tauri::command]
fn exit_mini_mode(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        win.set_skip_taskbar(false).map_err(|e| e.to_string())?;
        win.show().map_err(|e| e.to_string())?;
        win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(1280.0, 800.0)))
            .map_err(|e| e.to_string())?;
        win.set_always_on_top(false).map_err(|e| e.to_string())?;
        win.set_decorations(true).map_err(|e| e.to_string())?;
        win.set_resizable(true).map_err(|e| e.to_string())?;
        win.center().map_err(|e| e.to_string())?;
    }
    pet::pet_close(app)?;
    Ok(())
}

#[tauri::command]
fn toggle_mini_mode(app: tauri::AppHandle) -> Result<(), String> {
    if app.get_webview_window(pet::PET_LABEL).is_some() {
        exit_mini_mode(app)?;
        return Ok(());
    }

    if let Some(win) = app.get_webview_window("main") {
        let size = win.inner_size().unwrap_or_default();
        if size.width < 500 {
            exit_mini_mode(app)?;
        } else {
            enter_mini_mode(app)?;
        }
    }
    Ok(())
}

#[tauri::command]
fn show_quick_capture(app: tauri::AppHandle) {
    let _ = app.emit("shortcut-action", "quick_capture");
}

#[tauri::command]
fn set_tray_state(app: tauri::AppHandle, state: String) {
    // Update tray tooltip based on timer state
    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = match state.as_str() {
            "running" => "Flowmate – Timer Running ▶",
            "paused" => "Flowmate – Timer Paused ⏸",
            _ => "Flowmate – Task Timer",
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

#[tauri::command]
fn show_notification(app: tauri::AppHandle, title: String, body: String) {
    use tauri_plugin_notification::NotificationExt;
    let _ = app
        .notification()
        .builder()
        .title(&title)
        .body(&body)
        .show();
}

#[tauri::command]
fn set_idle_detection_enabled(enabled: bool) {
    IDLE_DETECTION_ENABLED.store(enabled, Ordering::Relaxed);
    if !enabled {
        IDLE_NOTIFIED.store(false, Ordering::Relaxed);
    }
}

// ---------------------------------------------------------------------------
// App entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // --- Plugins ---
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Logger (debug builds only)
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Pre-create the pet overlay window (hidden) on the main thread.
            // Building it later from an IPC command thread deadlocks on Windows.
            if let Err(err) = pet::pet_init(app.handle()) {
                log::error!("failed to pre-create pet overlay window: {err}");
            }

            // --- System Tray ---
            let show_item = MenuItemBuilder::with_id("show", "Show Flowmate").build(app)?;
            let pause_item =
                MenuItemBuilder::with_id("toggle_timer", "Pause / Resume Timer").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .item(&show_item)
                .item(&pause_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let _tray = TrayIconBuilder::with_id("main-tray")
                .tooltip("Flowmate – Task Timer")
                .menu(&tray_menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = pet::pet_close(app.clone());
                            let _ = win.set_skip_taskbar(false);
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "toggle_timer" => {
                        let _ = app.emit("shortcut-action", "toggle_timer");
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = pet::pet_close(app.clone());
                            let _ = win.set_skip_taskbar(false);
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

            // --- Global Shortcuts ---
            use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
            let app_handle = app.handle().clone();

            // Alt+Shift+Space → toggle timer
            let _ = app.global_shortcut().on_shortcut("Alt+Shift+Space", {
                let handle = app_handle.clone();
                move |_app, _shortcut, _event| {
                    if _event.state() != ShortcutState::Pressed {
                        return;
                    }
                    let _ = handle.emit("shortcut-action", "toggle_timer");
                }
            });

            // Alt+Shift+T → toggle mini mode
            let _ = app.global_shortcut().on_shortcut("Alt+Shift+T", {
                let handle = app_handle.clone();
                move |_app, _shortcut, _event| {
                    if _event.state() != ShortcutState::Pressed {
                        return;
                    }
                    if let Err(err) = toggle_mini_mode(handle.clone()) {
                        log::error!("failed to toggle mini mode: {err}");
                    }
                }
            });

            // Alt+Shift+N → quick capture
            let _ = app.global_shortcut().on_shortcut("Alt+Shift+N", {
                let handle = app_handle.clone();
                move |_app, _shortcut, _event| {
                    if _event.state() != ShortcutState::Pressed {
                        return;
                    }
                    let _ = handle.emit("shortcut-action", "quick_capture");
                }
            });

            // --- Idle Detection Thread ---
            let idle_handle = app.handle().clone();
            let running = Arc::new(AtomicBool::new(true));
            let running_clone = running.clone();

            std::thread::spawn(move || {
                while running_clone.load(Ordering::Relaxed) {
                    std::thread::sleep(Duration::from_secs(30)); // Check every 30 seconds

                    // Use GetLastInputInfo on Windows
                    #[cfg(target_os = "windows")]
                    {
                        if !IDLE_DETECTION_ENABLED.load(Ordering::Relaxed) {
                            IDLE_NOTIFIED.store(false, Ordering::Relaxed);
                            continue;
                        }

                        let idle_secs = get_system_idle_seconds();
                        if idle_secs >= IDLE_THRESHOLD_SECS {
                            if !IDLE_NOTIFIED.swap(true, Ordering::Relaxed) {
                                let _ = idle_handle.emit("idle-detected", idle_secs);
                            }
                        } else {
                            IDLE_NOTIFIED.store(false, Ordering::Relaxed);
                        }
                    }
                }
            });

            Ok(())
        })
        // --- IPC Command Registration ---
        .invoke_handler(tauri::generate_handler![
            hide_to_tray,
            show_from_tray,
            enter_mini_mode,
            exit_mini_mode,
            toggle_mini_mode,
            show_quick_capture,
            set_tray_state,
            show_notification,
            set_idle_detection_enabled,
            pet::pet_open,
            pet::pet_close,
            pet::pet_signal,
            pet::pet_set_position,
            pet::pet_set_clickthrough,
        ])
        // --- Close to tray behavior ---
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Closing the main window to tray must not orphan the pet overlay.
                if window.label() == "main" {
                    let _ = pet::pet_close(window.app_handle().clone());
                }
                // Hide to tray instead of quitting
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Flowmate");
}

// ---------------------------------------------------------------------------
// Windows idle detection via GetLastInputInfo
// ---------------------------------------------------------------------------
#[cfg(target_os = "windows")]
fn get_system_idle_seconds() -> u64 {
    use std::mem;

    #[repr(C)]
    struct LASTINPUTINFO {
        cb_size: u32,
        dw_time: u32,
    }

    extern "system" {
        fn GetLastInputInfo(plii: *mut LASTINPUTINFO) -> i32;
        fn GetTickCount() -> u32;
    }

    unsafe {
        let mut lii = LASTINPUTINFO {
            cb_size: mem::size_of::<LASTINPUTINFO>() as u32,
            dw_time: 0,
        };
        if GetLastInputInfo(&mut lii) != 0 {
            let tick = GetTickCount();
            let idle_ms = tick.wrapping_sub(lii.dw_time);
            (idle_ms / 1000) as u64
        } else {
            0
        }
    }
}
