use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

mod agent_bridge;
mod pet;

// ---------------------------------------------------------------------------
// Idle detection state
// ---------------------------------------------------------------------------

static IDLE_NOTIFIED: AtomicBool = AtomicBool::new(false);
static IDLE_DETECTION_ENABLED: AtomicBool = AtomicBool::new(true);
/// Longest idle reading seen during the current idle stretch. Read on return —
/// the OS counter has already reset to zero by then.
static LAST_IDLE_SECS: AtomicU64 = AtomicU64::new(0);
/// How long without input before the timer auto-pauses. Runtime-configurable:
/// five minutes suits deep work and is far too long for a coffee break, so this
/// is a preference rather than a constant.
static IDLE_THRESHOLD_SECS: AtomicU64 = AtomicU64::new(300);
/// Below this the detector fights normal reading pauses instead of finding real
/// absences.
const MIN_IDLE_THRESHOLD_SECS: u64 = 30;
/// Cleared on RunEvent::Exit so the idle poll thread actually stops instead of
/// outliving the app.
static IDLE_POLL_RUNNING: AtomicBool = AtomicBool::new(true);
/// How often the idle detector samples. This is NOT the idle threshold — it
/// bounds how late `idle-resumed` can arrive after the user comes back.
const IDLE_POLL_INTERVAL: Duration = Duration::from_secs(5);

// ---------------------------------------------------------------------------
// Agent lease suppression (independent of IDLE_DETECTION_ENABLED — see T2)
// ---------------------------------------------------------------------------

/// True while any agent lease is open. Idle poll suppresses when set.
pub(crate) static AGENT_LEASE_ACTIVE: AtomicBool = AtomicBool::new(false);
/// Unix seconds of the moment the lease map last went empty. Used to clamp
/// OS idle readings so agent work is never attributed as absence (T3).
pub(crate) static AGENT_LEASE_ENDED_AT: AtomicU64 = AtomicU64::new(0);

// Logical (width, height) and position of the main window captured on entering
// mini mode, so exit_mini_mode restores the user's real layout instead of a
// hardcoded size at screen centre.
fn saved_main_size() -> &'static Mutex<Option<(f64, f64)>> {
    static SIZE: OnceLock<Mutex<Option<(f64, f64)>>> = OnceLock::new();
    SIZE.get_or_init(|| Mutex::new(None))
}

/// Physical (x, y) of the main window before entering mini mode. Separate from
/// the size because exit_mini_mode used to call center(), teleporting the window
/// away from wherever the user had actually put it.
fn saved_main_position() -> &'static Mutex<Option<(i32, i32)>> {
    static POS: OnceLock<Mutex<Option<(i32, i32)>>> = OnceLock::new();
    POS.get_or_init(|| Mutex::new(None))
}

/// Menu item handles retained past setup() so their labels can be rewritten.
/// The builders are local to setup(), so without this the tray text was frozen
/// at whatever it was built with.
struct TrayItems {
    status: tauri::menu::MenuItem<tauri::Wry>,
    pause: tauri::menu::MenuItem<tauri::Wry>,
}

static TRAY_ITEMS: OnceLock<TrayItems> = OnceLock::new();

/// Global shortcut combinations that failed to register, usually because
/// another application already owns them. Surfaced in Settings > Keyboard
/// instead of being swallowed by `let _ =`.
fn failed_shortcuts() -> &'static Mutex<Vec<String>> {
    static FAILED: OnceLock<Mutex<Vec<String>>> = OnceLock::new();
    FAILED.get_or_init(|| Mutex::new(Vec::new()))
}

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
    // Pet mode = hide main window entirely, show only the pet overlay. The pet
    // is now a fullscreen click-through stage, so no positioning is needed.
    log::info!("enter_mini_mode: opening pet before hiding main");
    pet::pet_open(app.clone(), None, None)?;

    if let Some(win) = app.get_webview_window("main") {
        // Remember the current size (logical px) so we can restore it on exit.
        if let Ok(size) = win.inner_size() {
            let scale = win.scale_factor().unwrap_or(1.0);
            let logical = size.to_logical::<f64>(scale);
            if let Ok(mut slot) = saved_main_size().lock() {
                *slot = Some((logical.width, logical.height));
            }
        }
        // Remember where it was too. exit_mini_mode used to call center(),
        // so leaving pet mode teleported the window away from the user's layout.
        if let Ok(pos) = win.outer_position() {
            if let Ok(mut slot) = saved_main_position().lock() {
                *slot = Some((pos.x, pos.y));
            }
        }
        let _ = win.hide();
        let _ = win.set_skip_taskbar(true);
    }
    log::info!("enter_mini_mode: main hidden");
    log::info!("enter_mini_mode: done");
    Ok(())
}

#[tauri::command]
fn exit_mini_mode(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        win.set_skip_taskbar(false).map_err(|e| e.to_string())?;
        win.show().map_err(|e| e.to_string())?;
        // Restore the size we captured on entering mini mode; fall back to the
        // default only if nothing was ever stored.
        let (w, h) = saved_main_size()
            .lock()
            .ok()
            .and_then(|slot| *slot)
            .unwrap_or((1280.0, 800.0));
        win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(w, h)))
            .map_err(|e| e.to_string())?;
        win.set_always_on_top(false).map_err(|e| e.to_string())?;
        win.set_decorations(true).map_err(|e| e.to_string())?;
        win.set_resizable(true).map_err(|e| e.to_string())?;
        // Put it back where it was. Only centre when we never captured a
        // position — e.g. pet mode was entered before this build.
        match saved_main_position().lock().ok().and_then(|slot| *slot) {
            Some((x, y)) => {
                win.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)))
                    .map_err(|e| e.to_string())?;
            }
            None => win.center().map_err(|e| e.to_string())?,
        }
    }
    pet::pet_close(app)?;
    Ok(())
}

#[tauri::command]
fn toggle_mini_mode(app: tauri::AppHandle) -> Result<(), String> {
    // The pet window is pre-created at startup (hidden), so existence is always
    // true — mini mode is defined by the pet overlay being VISIBLE.
    let in_mini = app
        .get_webview_window(pet::PET_LABEL)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false);

    if in_mini {
        exit_mini_mode(app)
    } else {
        enter_mini_mode(app)
    }
}

/// Reflect timer state in the tray: tooltip, the status line, and the
/// play/pause label. Previously this changed only the tooltip, so the tray gave
/// no at-a-glance state and the menu item read "Pause / Resume Timer" forever.
///
/// `task` and `elapsed` are optional; when absent the status line falls back to
/// a generic label.
#[tauri::command]
fn set_tray_state(
    app: tauri::AppHandle,
    state: String,
    task: Option<String>,
    elapsed: Option<String>,
) {
    let running = state == "running";
    let paused = state == "paused";

    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = match state.as_str() {
            "running" => "Flowmate – Timer Running",
            "paused" => "Flowmate – Timer Paused",
            _ => "Flowmate – Task Timer",
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }

    let Some(items) = TRAY_ITEMS.get() else { return };

    let status_text = if running || paused {
        let name = task.unwrap_or_else(|| "Focus session".to_string());
        // Windows tray menus do not wrap, so keep the line short.
        let name = if name.chars().count() > 40 {
            let truncated: String = name.chars().take(39).collect();
            format!("{truncated}…")
        } else {
            name
        };
        match elapsed {
            Some(e) => format!("{name} · {e}"),
            None => name,
        }
    } else {
        "No active session".to_string()
    };
    let _ = items.status.set_text(status_text);

    let pause_text = if running {
        "Pause Timer"
    } else if paused {
        "Resume Timer"
    } else {
        "Start Timer"
    };
    let _ = items.pause.set_text(pause_text);
}

/// Replay the global-shortcut registration failures collected at startup.
/// Settings asks for these on mount; without it the failures were invisible.
#[tauri::command]
fn get_failed_shortcuts() -> Vec<String> {
    failed_shortcuts().lock().map(|f| f.clone()).unwrap_or_default()
}

/// Fire a native notification.
///
/// Note on what is NOT possible here: tauri-plugin-notification implements
/// `register_action_types` / `register_listener` only in its mobile backend.
/// The desktop path (its desktop.rs) builds a notify_rust notification and
/// calls `.show()`, honouring title/body/icon/sound and nothing else — there is
/// no click callback and no dedup tag on Windows. So notification copy must
/// never instruct the user to click the toast, and repeat-suppression has to
/// happen on our side before we ever call this.
#[tauri::command]
fn show_notification(app: tauri::AppHandle, title: String, body: String) {
    use tauri_plugin_notification::NotificationExt;
    let _ = app
        .notification()
        .builder()
        .title(&title)
        .body(&body)
        .icon("icons/icon.png")
        .show();
}

#[tauri::command]
fn set_idle_threshold_seconds(seconds: u64) {
    IDLE_THRESHOLD_SECS.store(seconds.max(MIN_IDLE_THRESHOLD_SECS), Ordering::Relaxed);
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
    // #region agent log
    {
        use std::io::Write;
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(r"C:\Users\amuly\Projects\Kettles\debug-369301.log")
        {
            let _ = writeln!(
                f,
                r#"{{"sessionId":"369301","hypothesisId":"A","location":"lib.rs:run","message":"run() entered","data":{{"pid":{}}},"timestamp":{}}}"#,
                std::process::id(),
                ts
            );
        }
    }
    // #endregion
    tauri::Builder::default()
        // --- Plugins ---
        // single-instance MUST be registered before anything else: it decides
        // whether this process should live at all. A second launch previously
        // produced a second tray icon, a second idle poll thread, and a second
        // agent bridge silently bound to the next port in 41999..42010.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // #region agent log
            {
                use std::io::Write;
                let ts = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_millis())
                    .unwrap_or(0);
                if let Ok(mut f) = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(r"C:\Users\amuly\Projects\Kettles\debug-369301.log")
                {
                    let _ = writeln!(
                        f,
                        r#"{{"sessionId":"369301","hypothesisId":"A","location":"lib.rs:single_instance","message":"second-instance focus callback","data":{{"hostPid":{},"hasMain":{}}},"timestamp":{}}}"#,
                        std::process::id(),
                        app.get_webview_window("main").is_some(),
                        ts
                    );
                }
            }
            // #endregion
            // Reuse the same restore path as the tray, including the
            // skip_taskbar reset that pet mode sets.
            if let Some(win) = app.get_webview_window("main") {
                let _ = pet::pet_close(app.clone());
                let _ = win.set_skip_taskbar(false);
                let _ = win.show();
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
        }))
        // Remember where the user actually put the window.
        //
        // NOT StateFlags::default() — that is all(), which includes VISIBLE.
        // This app hides main to the tray on close (prevent_close) and in pet
        // mode, so VISIBLE would persist `false` and the next launch would come
        // up invisible with only a tray icon. DECORATIONS is excluded for the
        // same reason: mini mode toggles them.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED,
                )
                // The pet overlay parks itself relative to the monitor and is
                // transparent + always-on-top; restoring a saved rect would
                // fight pet.rs.
                .with_denylist(&[pet::PET_LABEL])
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // #region agent log
            {
                use std::io::Write;
                let ts = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_millis())
                    .unwrap_or(0);
                if let Ok(mut f) = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(r"C:\Users\amuly\Projects\Kettles\debug-369301.log")
                {
                    let _ = writeln!(
                        f,
                        r#"{{"sessionId":"369301","hypothesisId":"B","location":"lib.rs:setup","message":"setup() entered (primary instance)","data":{{"pid":{}}},"timestamp":{}}}"#,
                        std::process::id(),
                        ts
                    );
                }
            }
            // #endregion
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

            // Agent presence bridge — loopback HTTP for agent hooks. Not
            // Windows-gated: idle detection is Windows-only; the bridge is not.
            agent_bridge::start(app.handle().clone());

            // --- System Tray ---
            // A disabled first line carries the current task + elapsed time, so
            // the tray answers "what am I tracking?" without opening the window.
            let status_item = MenuItemBuilder::with_id("status", "No active session")
                .enabled(false)
                .build(app)?;
            let show_item = MenuItemBuilder::with_id("show", "Show Flowmate").build(app)?;
            // Label is rewritten by set_tray_state — it used to read
            // "Pause / Resume Timer" forever regardless of what the timer was doing.
            let pause_item = MenuItemBuilder::with_id("toggle_timer", "Start Timer").build(app)?;
            let updates_item =
                MenuItemBuilder::with_id("check_updates", "Check for Updates…").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .item(&status_item)
                .separator()
                .item(&show_item)
                .item(&pause_item)
                .separator()
                .item(&updates_item)
                .item(&quit_item)
                .build()?;

            // Retain handles: the builders go out of scope at the end of setup(),
            // and set_tray_state needs to rewrite these labels later.
            let _ = TRAY_ITEMS.set(TrayItems {
                status: status_item.clone(),
                pause: pause_item.clone(),
            });

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
                    "check_updates" => {
                        // The frontend owns the update flow — it knows whether a
                        // session is running and must not be interrupted.
                        let _ = app.emit("shortcut-action", "check_updates");
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.set_skip_taskbar(false);
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
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

            // Registration is best-effort: another app may already own a
            // combination. These used to be `let _ =`, so a conflict meant the
            // shortcut silently never worked and nothing anywhere said so.
            let mut failed: Vec<String> = Vec::new();

            // Alt+Shift+Space → toggle timer
            if let Err(err) = app.global_shortcut().on_shortcut("Alt+Shift+Space", {
                let handle = app_handle.clone();
                move |_app, _shortcut, _event| {
                    if _event.state() != ShortcutState::Pressed {
                        return;
                    }
                    let _ = handle.emit("shortcut-action", "toggle_timer");
                }
            }) {
                log::warn!("could not register Alt+Shift+Space: {err}");
                failed.push("Alt+Shift+Space".to_string());
            }

            // Alt+Shift+T → toggle mini mode
            if let Err(err) = app.global_shortcut().on_shortcut("Alt+Shift+T", {
                let handle = app_handle.clone();
                move |_app, _shortcut, _event| {
                    if _event.state() != ShortcutState::Pressed {
                        return;
                    }
                    if let Err(err) = toggle_mini_mode(handle.clone()) {
                        log::error!("failed to toggle mini mode: {err}");
                    }
                }
            }) {
                log::warn!("could not register Alt+Shift+T: {err}");
                failed.push("Alt+Shift+T".to_string());
            }

            if !failed.is_empty() {
                if let Ok(mut slot) = failed_shortcuts().lock() {
                    *slot = failed.clone();
                }
                // Settings also pulls this via get_failed_shortcuts on mount;
                // the emit covers a window that is already open.
                let _ = app.handle().emit("shortcut-registration-failed", failed);
            }

            // No Alt+Shift+N. It used to emit "quick_capture", which the frontend
            // answered by invoking show_quick_capture, which emitted it again —
            // an unbounded IPC loop feeding a capture UI that was never built.
            // Reserve the hotkey again when quick capture actually exists.

            // Alt+Shift+R → reload the pet overlay webview. Dev convenience:
            // the pet window serves static /pet assets with no HMR, so this
            // picks up pet.html/css/js edits without restarting the whole app.
            // Debug-only: in a release build this drops a running session.
            #[cfg(debug_assertions)]
            let _ = app.global_shortcut().on_shortcut("Alt+Shift+R", {
                let handle = app_handle.clone();
                move |_app, _shortcut, _event| {
                    if _event.state() != ShortcutState::Pressed {
                        return;
                    }
                    if let Some(win) = handle.get_webview_window(pet::PET_LABEL) {
                        let _ = win.eval("window.location.reload()");
                    }
                    if let Some(win) = handle.get_webview_window("main") {
                        let _ = win.eval("window.location.reload()");
                    }
                }
            });

            // --- Idle Detection Thread ---
            // Windows-only: the whole body is GetLastInputInfo. Spawning it
            // elsewhere just burns a thread sleeping forever.
            #[cfg(target_os = "windows")]
            {
                let idle_handle = app.handle().clone();

                std::thread::spawn(move || {
                    while IDLE_POLL_RUNNING.load(Ordering::Relaxed) {
                        // 5s, not 30s. GetLastInputInfo is nearly free, and at
                        // 30s the "welcome back" recovery prompt could arrive
                        // half a minute after the user was already typing again.
                        // The idle THRESHOLD is unchanged — this is only how
                        // often we look.
                        std::thread::sleep(IDLE_POLL_INTERVAL);
                        // Preference off OR agent lease active → suppress.
                        // AGENT_LEASE_ACTIVE is its own flag (T2): the preference
                        // effect re-asserts IDLE_DETECTION_ENABLED and must not
                        // flip suppression mid-agent-run.
                        if !IDLE_DETECTION_ENABLED.load(Ordering::Relaxed)
                            || AGENT_LEASE_ACTIVE.load(Ordering::Relaxed)
                        {
                            // Suppressing mid-idle must not later look like a return.
                            IDLE_NOTIFIED.store(false, Ordering::Relaxed);
                            LAST_IDLE_SECS.store(0, Ordering::Relaxed);
                            continue;
                        }

                        // Clamp to the end of the last lease stretch (T3). The OS
                        // idle counter keeps climbing while we suppress; without
                        // this clamp, pauseSessionForIdle rewinds through agent time.
                        let os_idle = get_system_idle_seconds();
                        let now_secs = SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .map(|d| d.as_secs())
                            .unwrap_or(0);
                        let lease_ended = AGENT_LEASE_ENDED_AT.load(Ordering::Relaxed);
                        let since_lease = if lease_ended == 0 {
                            u64::MAX
                        } else {
                            now_secs.saturating_sub(lease_ended)
                        };
                        let idle_secs = os_idle.min(since_lease);

                        if idle_secs >= IDLE_THRESHOLD_SECS.load(Ordering::Relaxed) {
                            // Track the high-water mark. The poll runs every 30s,
                            // so by the time input returns this is the closest
                            // reading we have to how long the user was actually
                            // away — the OS counter itself has already reset.
                            LAST_IDLE_SECS.store(idle_secs, Ordering::Relaxed);
                            if !IDLE_NOTIFIED.swap(true, Ordering::Relaxed) {
                                let _ = idle_handle.emit("idle-detected", idle_secs);
                            }
                        } else if IDLE_NOTIFIED.swap(false, Ordering::Relaxed) {
                            // true -> false: the user is back. The frontend needs
                            // this to close the gap it opened on idle-detected;
                            // without it the session stays paused with an
                            // unresolved boundary and the ledger silently rots.
                            let away_secs = LAST_IDLE_SECS.swap(0, Ordering::Relaxed);
                            let _ = idle_handle.emit("idle-resumed", away_secs);
                        }
                    }
                });
            }

            Ok(())
        })
        // --- IPC Command Registration ---
        .invoke_handler(tauri::generate_handler![
            hide_to_tray,
            show_from_tray,
            enter_mini_mode,
            exit_mini_mode,
            toggle_mini_mode,
            set_tray_state,
            get_failed_shortcuts,
            show_notification,
            set_idle_detection_enabled,
            set_idle_threshold_seconds,
            agent_bridge::set_manual_agent_active,
            pet::pet_open,
            pet::pet_is_open,
            pet::pet_close,
            pet::pet_signal,
            pet::pet_set_position,
            pet::pet_set_clickthrough,
            pet::pet_tracking,
        ])
        // --- Close to tray behavior ---
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Close-to-tray is main-window behaviour only. Applying it to
                // every label meant any other window could never actually close.
                if window.label() != "main" {
                    return;
                }
                // Closing the main window to tray must not orphan the pet overlay.
                let _ = pet::pet_close(window.app_handle().clone());
                // Hide to tray instead of quitting
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Flowmate")
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                IDLE_POLL_RUNNING.store(false, Ordering::Relaxed);
                agent_bridge::on_shutdown();
            }
        });
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
