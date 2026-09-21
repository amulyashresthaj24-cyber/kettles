//! Personal app-usage capture (timer-only).
//!
//! While a running timer session is active, poll the foreground process and
//! store exe-name spans on disk. This is not billed time: nothing here is
//! written to sessions JSONB or uploaded.
//!
//! Sibling thread to idle detection — do not fold this into the idle poll.

#[cfg(target_os = "windows")]
use crate::IDLE_THRESHOLD_SECS;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const POLL_INTERVAL: Duration = Duration::from_secs(2);
const MIN_SPAN_MS: u64 = 1_000;
const MERGE_GAP_MS: u64 = 3_000;
const RETENTION_MS: u64 = 90 * 86_400_000;
const FILENAME: &str = "app-usage.json";

static POLL_RUNNING: AtomicBool = AtomicBool::new(true);
static STATE: OnceLock<Mutex<AppUsageStore>> = OnceLock::new();

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUsageSpan {
    pub exe: String,
    pub started_at: u64,
    pub ended_at: u64,
    pub session_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct AppUsageFile {
    version: u32,
    spans: Vec<AppUsageSpan>,
}

struct OpenSpan {
    exe: String,
    started_at: u64,
    session_id: String,
}

struct AppUsageStore {
    path: PathBuf,
    enabled: bool,
    running: bool,
    session_id: Option<String>,
    current: Option<OpenSpan>,
    spans: Vec<AppUsageSpan>,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn store() -> Option<&'static Mutex<AppUsageStore>> {
    STATE.get()
}

fn load_spans(path: &Path) -> Vec<AppUsageSpan> {
    let Ok(bytes) = std::fs::read(path) else {
        return Vec::new();
    };
    match serde_json::from_slice::<AppUsageFile>(&bytes) {
        Ok(file) if file.version == 1 => file.spans,
        _ => Vec::new(),
    }
}

fn persist(store: &AppUsageStore) {
    if let Some(parent) = store.path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let file = AppUsageFile {
        version: 1,
        spans: store.spans.clone(),
    };
    if let Ok(json) = serde_json::to_vec(&file) {
        let _ = std::fs::write(&store.path, json);
    }
}

fn prune(spans: &mut Vec<AppUsageSpan>, now: u64) {
    let cutoff = now.saturating_sub(RETENTION_MS);
    spans.retain(|s| s.ended_at >= cutoff);
}

fn close_current(store: &mut AppUsageStore) -> bool {
    let Some(cur) = store.current.take() else {
        return false;
    };
    let ended_at = now_ms();
    if ended_at.saturating_sub(cur.started_at) < MIN_SPAN_MS {
        return false;
    }
    if let Some(last) = store.spans.last_mut() {
        if last.exe.eq_ignore_ascii_case(&cur.exe)
            && last.session_id == cur.session_id
            && cur.started_at.saturating_sub(last.ended_at) <= MERGE_GAP_MS
        {
            last.ended_at = ended_at;
            prune(&mut store.spans, ended_at);
            persist(store);
            return true;
        }
    }
    store.spans.push(AppUsageSpan {
        exe: cur.exe,
        started_at: cur.started_at,
        ended_at,
        session_id: cur.session_id,
    });
    prune(&mut store.spans, ended_at);
    persist(store);
    true
}

fn snapshot(store: &AppUsageStore, from_ms: u64, to_ms: u64) -> Vec<AppUsageSpan> {
    let mut out: Vec<AppUsageSpan> = store
        .spans
        .iter()
        .filter(|s| s.ended_at > from_ms && s.started_at < to_ms)
        .cloned()
        .collect();
    if let Some(cur) = &store.current {
        let now = now_ms();
        if now > from_ms && cur.started_at < to_ms {
            out.push(AppUsageSpan {
                exe: cur.exe.clone(),
                started_at: cur.started_at,
                ended_at: now.max(cur.started_at),
                session_id: cur.session_id.clone(),
            });
        }
    }
    out
}

fn tick(store: &mut AppUsageStore) {
    if !store.enabled || !store.running {
        close_current(store);
        return;
    }
    let Some(session_id) = store.session_id.clone() else {
        close_current(store);
        return;
    };

    #[cfg(target_os = "windows")]
    {
        if idle_seconds() >= IDLE_THRESHOLD_SECS.load(Ordering::Relaxed) {
            close_current(store);
            return;
        }
        let Some(exe) = foreground_exe_name() else {
            close_current(store);
            return;
        };
        match &store.current {
            Some(cur) if cur.exe.eq_ignore_ascii_case(&exe) && cur.session_id == session_id => {}
            _ => {
                close_current(store);
                store.current = Some(OpenSpan {
                    exe,
                    started_at: now_ms(),
                    session_id,
                });
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = session_id;
        close_current(store);
    }
}

/// Resolve app data dir, load existing spans, spawn the Windows poll thread.
pub fn start(app: AppHandle) {
    let data_dir = match app.path().app_data_dir() {
        Ok(p) => p,
        Err(e) => {
            log::error!("app_usage: cannot resolve app data dir: {e}");
            return;
        }
    };
    if let Err(e) = std::fs::create_dir_all(&data_dir) {
        log::error!("app_usage: cannot create app data dir: {e}");
        return;
    }
    let path = data_dir.join(FILENAME);
    let spans = load_spans(&path);
    let _ = STATE.set(Mutex::new(AppUsageStore {
        path,
        enabled: false,
        running: false,
        session_id: None,
        current: None,
        spans,
    }));

    #[cfg(target_os = "windows")]
    std::thread::spawn(|| {
        while POLL_RUNNING.load(Ordering::Relaxed) {
            std::thread::sleep(POLL_INTERVAL);
            if !POLL_RUNNING.load(Ordering::Relaxed) {
                break;
            }
            if let Some(lock) = store() {
                let mut state = lock.lock().unwrap_or_else(|e| e.into_inner());
                tick(&mut state);
            }
        }
    });
}

/// Close the open span and stop the poll thread.
pub fn on_shutdown() {
    POLL_RUNNING.store(false, Ordering::Relaxed);
    if let Some(lock) = store() {
        let mut state = lock.lock().unwrap_or_else(|e| e.into_inner());
        close_current(&mut state);
    }
}

#[tauri::command]
pub fn set_app_usage_enabled(enabled: bool) {
    let Some(lock) = store() else { return };
    let mut state = lock.lock().unwrap_or_else(|e| e.into_inner());
    state.enabled = enabled;
    if !enabled {
        close_current(&mut state);
    }
}

#[tauri::command]
pub fn set_app_usage_session(session_id: Option<String>, running: bool) {
    let Some(lock) = store() else { return };
    let mut state = lock.lock().unwrap_or_else(|e| e.into_inner());
    let session_id = session_id.filter(|s| !s.is_empty());
    let running = running && session_id.is_some();
    let session_changed = state.session_id != session_id;
    state.session_id = session_id;
    state.running = running;
    if !running || session_changed {
        close_current(&mut state);
    }
}

#[tauri::command]
pub fn get_app_usage_summary(from_ms: u64, to_ms: u64) -> Vec<AppUsageSpan> {
    let Some(lock) = store() else {
        return Vec::new();
    };
    let state = lock.lock().unwrap_or_else(|e| e.into_inner());
    snapshot(&state, from_ms, to_ms)
}

#[tauri::command]
pub fn clear_app_usage() {
    let Some(lock) = store() else { return };
    let mut state = lock.lock().unwrap_or_else(|e| e.into_inner());
    state.current = None;
    state.spans.clear();
    persist(&state);
}

#[cfg(target_os = "windows")]
fn idle_seconds() -> u64 {
    use std::mem;

    #[repr(C)]
    struct LastInputInfo {
        cb_size: u32,
        dw_time: u32,
    }

    extern "system" {
        fn GetLastInputInfo(plii: *mut LastInputInfo) -> i32;
        fn GetTickCount() -> u32;
    }

    unsafe {
        let mut lii = LastInputInfo {
            cb_size: mem::size_of::<LastInputInfo>() as u32,
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

#[cfg(target_os = "windows")]
fn foreground_exe_name() -> Option<String> {
    const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;

    extern "system" {
        fn GetForegroundWindow() -> isize;
        fn GetWindowThreadProcessId(hwnd: isize, lpdw_process_id: *mut u32) -> u32;
        fn OpenProcess(access: u32, inherit: i32, pid: u32) -> isize;
        fn QueryFullProcessImageNameW(
            handle: isize,
            flags: u32,
            buf: *mut u16,
            size: *mut u32,
        ) -> i32;
        fn CloseHandle(handle: isize) -> i32;
    }

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd == 0 {
            return None;
        }
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 {
            return None;
        }
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle == 0 {
            return None;
        }
        let mut buf = [0u16; 512];
        let mut size = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(handle, 0, buf.as_mut_ptr(), &mut size);
        CloseHandle(handle);
        if ok == 0 || size == 0 {
            return None;
        }
        let n = (size as usize).min(buf.len());
        let path = String::from_utf16_lossy(&buf[..n]);
        let name = path
            .rsplit(['\\', '/'])
            .next()
            .unwrap_or(path.as_str())
            .trim();
        if name.is_empty() {
            None
        } else {
            Some(name.to_string())
        }
    }
}
