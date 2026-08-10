//! Local loopback HTTP bridge for AI agent presence leases.
//!
//! Agents POST start/beat/done via hooks. While any lease is open the idle
//! detector suppresses auto-pause. Leases are in-memory only and expire on
//! their own (TTL 90s) if heartbeats stop — never a sticky boolean.

use crate::{AGENT_LEASE_ACTIVE, AGENT_LEASE_ENDED_AT};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::io::Read;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

const BRIDGE_VERSION: &str = "1";
const LEASE_TTL: Duration = Duration::from_secs(90);
const SWEEP_INTERVAL: Duration = Duration::from_secs(5);
const MAX_BODY_BYTES: usize = 8 * 1024;
const PORT_LO: u16 = 41999;
const PORT_HI: u16 = 42010;
const DISCOVERY_FILENAME: &str = "agent-bridge.json";
/// Synthetic lease opened by the in-app "AI running" toggle (M2). Never TTL-expires.
pub const MANUAL_RUN_ID: &str = "manual";

// ---------------------------------------------------------------------------
// Lease table
// ---------------------------------------------------------------------------

struct Lease {
    agent: String,
    label: Option<String>,
    task_id: Option<String>,
    /// Wall-clock unix seconds — for frontend payloads only.
    started_at: u64,
    /// Monotonic expiry — clock changes must not extend or kill a lease.
    expires_at: Instant,
    /// Manual toggle leases are not swept by TTL (user must clear them).
    no_expire: bool,
}

struct BridgeState {
    leases: Mutex<HashMap<String, Lease>>,
    token: String,
    port: u16,
    shutdown: AtomicBool,
}

static SHUTDOWN_STATE: OnceLock<Mutex<Option<Arc<BridgeState>>>> = OnceLock::new();

// ---------------------------------------------------------------------------
// Wire payloads
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartBody {
    run_id: String,
    agent: String,
    label: Option<String>,
    #[serde(default)]
    cwd: Option<String>,
    task_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BeatBody {
    run_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DoneBody {
    run_id: String,
    status: String,
    summary: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RunEventPayload {
    run_id: String,
    agent: String,
    label: Option<String>,
    task_id: Option<String>,
    started_at: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    ended_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    summary: Option<String>,
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/// Spawn the bridge server + TTL sweep. Never panics the app if bind fails.
/// Lease table is always created so the manual toggle works even if the port is busy.
pub fn start(app: AppHandle) {
    let data_dir = match app.path().app_data_dir() {
        Ok(p) => p,
        Err(e) => {
            log::error!("agent_bridge: cannot resolve app data dir: {e}");
            return;
        }
    };
    if let Err(e) = std::fs::create_dir_all(&data_dir) {
        log::error!("agent_bridge: cannot create app data dir: {e}");
        return;
    }

    let token = generate_token();
    let bind = bind_loopback();
    let port = bind.as_ref().map(|(_, p)| *p).unwrap_or(PORT_LO);

    if let Some((_, bound_port)) = bind.as_ref() {
        let discovery_path = data_dir.join(DISCOVERY_FILENAME);
        if let Err(e) = write_discovery(&discovery_path, *bound_port, &token) {
            log::error!("agent_bridge: failed to write discovery file: {e}");
        } else {
            restrict_discovery_acl(&discovery_path);
        }
    } else {
        log::error!(
            "agent_bridge: no free port in {PORT_LO}..={PORT_HI}; HTTP disabled, manual toggle still works"
        );
    }

    let state = Arc::new(BridgeState {
        leases: Mutex::new(HashMap::new()),
        token,
        port,
        shutdown: AtomicBool::new(false),
    });

    {
        let state = state.clone();
        let app = app.clone();
        thread::spawn(move || sweep_loop(state, app));
    }

    if let Some((server, bound_port)) = bind {
        let state = state.clone();
        let app = app.clone();
        thread::spawn(move || serve_loop(server, state, app));
        log::info!("agent_bridge: listening on 127.0.0.1:{bound_port}");
    }

    let slot = SHUTDOWN_STATE.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = slot.lock() {
        *guard = Some(state);
    }
}

/// M2 — manual "AI running" toggle. Opens/closes a non-expiring lease so idle
/// is suppressed without hooks. Emits the same events as HTTP start/done.
#[tauri::command]
pub fn set_manual_agent_active(app: AppHandle, active: bool) -> Result<bool, String> {
    let state = current_state().ok_or_else(|| "agent bridge not started".to_string())?;
    if active {
        open_manual_lease(&state, &app);
    } else {
        close_manual_lease(&state, &app);
    }
    Ok(active)
}

fn current_state() -> Option<Arc<BridgeState>> {
    let slot = SHUTDOWN_STATE.get()?;
    slot.lock().ok()?.clone()
}

fn open_manual_lease(state: &BridgeState, app: &AppHandle) {
    let mut map = match state.leases.lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    let was_empty = map.is_empty();
    let now_wall = now_unix_secs();
    let is_new = !map.contains_key(MANUAL_RUN_ID);
    let started_at = map
        .get(MANUAL_RUN_ID)
        .map(|l| l.started_at)
        .unwrap_or(now_wall);
    map.insert(
        MANUAL_RUN_ID.to_string(),
        Lease {
            agent: "manual".into(),
            label: Some("AI running".into()),
            task_id: None,
            started_at,
            // Far future — sweep skips no_expire anyway.
            expires_at: Instant::now() + Duration::from_secs(86400 * 365),
            no_expire: true,
        },
    );
    let is_empty = map.is_empty();
    sync_atomics(was_empty, is_empty);
    drop(map);

    if is_new {
        let payload = RunEventPayload {
            run_id: MANUAL_RUN_ID.into(),
            agent: "manual".into(),
            label: Some("AI running".into()),
            task_id: None,
            started_at,
            ended_at: None,
            status: None,
            summary: None,
        };
        let _ = app.emit("agent-run-started", &payload);
        log::info!("agent_bridge: manual lease opened");
    }
}

fn close_manual_lease(state: &BridgeState, app: &AppHandle) {
    let mut map = match state.leases.lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    let Some(lease) = map.remove(MANUAL_RUN_ID) else {
        return;
    };
    let was_empty = false;
    let is_empty = map.is_empty();
    sync_atomics(was_empty, is_empty);
    drop(map);

    let payload = RunEventPayload {
        run_id: MANUAL_RUN_ID.into(),
        agent: lease.agent,
        label: lease.label,
        task_id: lease.task_id,
        started_at: lease.started_at,
        ended_at: Some(now_unix_secs()),
        status: Some("ok".into()),
        summary: None,
    };
    let _ = app.emit("agent-run-finished", &payload);
    log::info!("agent_bridge: manual lease closed");
}

/// Close every lease and mark the suppressed stretch ended (T3 shutdown path).
pub fn on_shutdown() {
    let Some(slot) = SHUTDOWN_STATE.get() else {
        return;
    };
    let state = match slot.lock() {
        Ok(mut guard) => guard.take(),
        Err(_) => return,
    };
    let Some(state) = state else {
        return;
    };
    state.shutdown.store(true, Ordering::Relaxed);
    let mut map = match state.leases.lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    if !map.is_empty() {
        map.clear();
        set_atomics_empty();
        log::info!("agent_bridge: cleared leases on shutdown");
    }
}

// ---------------------------------------------------------------------------
// Bind + discovery
// ---------------------------------------------------------------------------

fn generate_token() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn bind_loopback() -> Option<(Server, u16)> {
    for port in PORT_LO..=PORT_HI {
        let addr = format!("127.0.0.1:{port}");
        match Server::http(&addr) {
            Ok(server) => return Some((server, port)),
            Err(e) => {
                log::debug!("agent_bridge: bind {addr} failed: {e}");
            }
        }
    }
    None
}

fn write_discovery(path: &Path, port: u16, token: &str) -> std::io::Result<()> {
    let body = json!({
        "port": port,
        "token": token,
        "version": BRIDGE_VERSION,
    });
    std::fs::write(path, body.to_string())
}

/// Restrict discovery file so only the current user can read it.
/// Windows: icacls (chmod is a silent no-op there). Unix: 0o600.
fn restrict_discovery_acl(path: &Path) {
    #[cfg(target_os = "windows")]
    {
        let path_str = match path.to_str() {
            Some(s) => s,
            None => return,
        };
        let user = std::env::var("USERNAME").unwrap_or_else(|_| "%USERNAME%".into());
        let _ = std::process::Command::new("icacls")
            .args([path_str, "/inheritance:r"])
            .output();
        let grant = format!("{user}:(R,W)");
        let status = std::process::Command::new("icacls")
            .args([path_str, "/grant:r", &grant])
            .output();
        if let Ok(out) = status {
            if !out.status.success() {
                log::warn!(
                    "agent_bridge: icacls failed: {}",
                    String::from_utf8_lossy(&out.stderr)
                );
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = std::fs::metadata(path) {
            let mut perms = meta.permissions();
            perms.set_mode(0o600);
            let _ = std::fs::set_permissions(path, perms);
        }
    }
}

// ---------------------------------------------------------------------------
// Atomic helpers (T2 / T5 / T3)
// ---------------------------------------------------------------------------

fn now_unix_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// After any map mutation: derive the two atomics from emptiness.
/// `AGENT_LEASE_ENDED_AT` is set only on the non-empty → empty transition.
fn sync_atomics(was_empty: bool, is_empty: bool) {
    if was_empty && !is_empty {
        AGENT_LEASE_ACTIVE.store(true, Ordering::Relaxed);
    } else if !was_empty && is_empty {
        set_atomics_empty();
    } else {
        AGENT_LEASE_ACTIVE.store(!is_empty, Ordering::Relaxed);
    }
}

fn set_atomics_empty() {
    AGENT_LEASE_ENDED_AT.store(now_unix_secs(), Ordering::Relaxed);
    AGENT_LEASE_ACTIVE.store(false, Ordering::Relaxed);
}

// ---------------------------------------------------------------------------
// Lease mutations
// ---------------------------------------------------------------------------

fn open_or_renew(state: &BridgeState, app: &AppHandle, body: StartBody) -> Result<(), String> {
    if body.run_id.is_empty() || body.agent.is_empty() {
        return Err("runId and agent are required".into());
    }
    let label = body.label.or_else(|| {
        body.cwd.as_ref().and_then(|c| {
            Path::new(c)
                .file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.to_string())
        })
    });

    let mut map = state
        .leases
        .lock()
        .map_err(|_| "lease lock poisoned".to_string())?;
    let was_empty = map.is_empty();
    let now_wall = now_unix_secs();
    let expires_at = Instant::now() + LEASE_TTL;

    let (started_at, is_new) = if let Some(existing) = map.get_mut(&body.run_id) {
        // T6: duplicate start renews, does not open a second lease.
        existing.expires_at = expires_at;
        if body.agent != existing.agent {
            existing.agent = body.agent.clone();
        }
        if label.is_some() {
            existing.label = label.clone();
        }
        if body.task_id.is_some() {
            existing.task_id = body.task_id.clone();
        }
        (existing.started_at, false)
    } else {
        let started_at = now_wall;
        map.insert(
            body.run_id.clone(),
            Lease {
                agent: body.agent.clone(),
                label: label.clone(),
                task_id: body.task_id.clone(),
                started_at,
                expires_at,
                no_expire: false,
            },
        );
        (started_at, true)
    };

    let is_empty = map.is_empty();
    sync_atomics(was_empty, is_empty);

    if is_new {
        let payload = RunEventPayload {
            run_id: body.run_id.clone(),
            agent: body.agent.clone(),
            label: label.clone(),
            task_id: body.task_id.clone(),
            started_at,
            ended_at: None,
            status: None,
            summary: None,
        };
        let _ = app.emit("agent-run-started", &payload);
        log::info!(
            "agent_bridge: lease opened runId={} agent={}",
            payload.run_id,
            payload.agent
        );
    }

    Ok(())
}

fn beat(state: &BridgeState, run_id: &str) {
    let mut map = match state.leases.lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    // T6: unknown runId → no-op (do not resurrect a TTL-killed run).
    if let Some(lease) = map.get_mut(run_id) {
        lease.expires_at = Instant::now() + LEASE_TTL;
    }
}

fn close_done(state: &BridgeState, app: &AppHandle, body: DoneBody) {
    let mut map = match state.leases.lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    // T6: unknown / already-closed → 200 no-op.
    let Some(lease) = map.remove(&body.run_id) else {
        return;
    };
    let was_empty = false;
    let is_empty = map.is_empty();
    sync_atomics(was_empty, is_empty);

    let status = match body.status.as_str() {
        "ok" | "error" | "cancelled" => body.status.clone(),
        _ => "ok".to_string(),
    };
    let payload = RunEventPayload {
        run_id: body.run_id.clone(),
        agent: lease.agent,
        label: lease.label,
        task_id: lease.task_id,
        started_at: lease.started_at,
        ended_at: Some(now_unix_secs()),
        status: Some(status),
        summary: body.summary,
    };
    let _ = app.emit("agent-run-finished", &payload);
    log::info!(
        "agent_bridge: lease closed runId={} status={:?}",
        payload.run_id,
        payload.status
    );
}

// ---------------------------------------------------------------------------
// TTL sweep (T1 / T3 — expiry MUST set AGENT_LEASE_ENDED_AT)
// ---------------------------------------------------------------------------

fn sweep_loop(state: Arc<BridgeState>, app: AppHandle) {
    while !state.shutdown.load(Ordering::Relaxed) {
        thread::sleep(SWEEP_INTERVAL);
        expire_stale(&state, &app);
    }
}

fn expire_stale(state: &BridgeState, app: &AppHandle) {
    let now_mono = Instant::now();
    let mut map = match state.leases.lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    if map.is_empty() {
        return;
    }
    let was_empty = false;
    let expired: Vec<(String, Lease)> = map
        .iter()
        .filter(|(_, l)| !l.no_expire && now_mono >= l.expires_at)
        .map(|(id, _)| id.clone())
        .collect::<Vec<_>>()
        .into_iter()
        .filter_map(|id| map.remove(&id).map(|l| (id, l)))
        .collect();

    if expired.is_empty() {
        return;
    }

    let is_empty = map.is_empty();
    sync_atomics(was_empty, is_empty);
    drop(map);

    let ended_at = now_unix_secs();
    for (run_id, lease) in expired {
        // Log lifetime for TTL tuning (spec §9).
        let life = ended_at.saturating_sub(lease.started_at);
        log::info!("agent_bridge: lease expired (stale) runId={run_id} lifetime_secs={life}");
        let payload = RunEventPayload {
            run_id,
            agent: lease.agent,
            label: lease.label,
            task_id: lease.task_id,
            started_at: lease.started_at,
            ended_at: Some(ended_at),
            status: Some("stale".into()),
            summary: None,
        };
        let _ = app.emit("agent-run-finished", &payload);
    }
}

// ---------------------------------------------------------------------------
// HTTP serve
// ---------------------------------------------------------------------------

fn serve_loop(server: Server, state: Arc<BridgeState>, app: AppHandle) {
    loop {
        if state.shutdown.load(Ordering::Relaxed) {
            break;
        }
        let request = match server.recv_timeout(Duration::from_secs(1)) {
            Ok(Some(r)) => r,
            Ok(None) => continue,
            Err(e) => {
                if state.shutdown.load(Ordering::Relaxed) {
                    break;
                }
                log::debug!("agent_bridge: recv error: {e}");
                continue;
            }
        };
        handle_request(request, &state, &app);
    }
}

fn handle_request(mut request: Request, state: &BridgeState, app: &AppHandle) {
    let method = request.method().clone();
    let url = request.url().to_string();
    let path = url.split('?').next().unwrap_or(&url);

    // Browsers can POST to localhost without preflight; reject Origin always.
    if header_present(&request, "Origin") {
        respond_json(request, 403, r#"{"ok":false,"error":"origin_forbidden"}"#);
        return;
    }

    match (method, path) {
        (Method::Get, "/v1/health") => {
            let body = json!({ "ok": true, "version": BRIDGE_VERSION, "port": state.port });
            respond_json(request, 200, &body.to_string());
        }
        (Method::Post, "/v1/agent/start")
        | (Method::Post, "/v1/agent/beat")
        | (Method::Post, "/v1/agent/done") => {
            if !authorize(&request, &state.token) {
                respond_json(request, 401, r#"{"ok":false,"error":"unauthorized"}"#);
                return;
            }
            if !content_type_is_json(&request) {
                respond_json(
                    request,
                    415,
                    r#"{"ok":false,"error":"content_type_required"}"#,
                );
                return;
            }
            let body = match read_body(&mut request) {
                Ok(b) => b,
                Err(code) => {
                    let msg = if code == 413 {
                        r#"{"ok":false,"error":"body_too_large"}"#
                    } else {
                        r#"{"ok":false,"error":"bad_body"}"#
                    };
                    respond_json(request, code, msg);
                    return;
                }
            };

            match path {
                "/v1/agent/start" => match serde_json::from_slice::<StartBody>(&body) {
                    Ok(start) => match open_or_renew(state, app, start) {
                        Ok(()) => respond_json(
                            request,
                            200,
                            &json!({ "ok": true, "leaseSeconds": 90 }).to_string(),
                        ),
                        Err(e) => {
                            respond_json(request, 400, &json!({ "ok": false, "error": e }).to_string())
                        }
                    },
                    Err(e) => respond_json(
                        request,
                        400,
                        &json!({ "ok": false, "error": e.to_string() }).to_string(),
                    ),
                },
                "/v1/agent/beat" => match serde_json::from_slice::<BeatBody>(&body) {
                    Ok(b) => {
                        beat(state, &b.run_id);
                        respond_json(request, 200, r#"{"ok":true}"#);
                    }
                    Err(e) => respond_json(
                        request,
                        400,
                        &json!({ "ok": false, "error": e.to_string() }).to_string(),
                    ),
                },
                "/v1/agent/done" => match serde_json::from_slice::<DoneBody>(&body) {
                    Ok(d) => {
                        close_done(state, app, d);
                        respond_json(request, 200, r#"{"ok":true}"#);
                    }
                    Err(e) => respond_json(
                        request,
                        400,
                        &json!({ "ok": false, "error": e.to_string() }).to_string(),
                    ),
                },
                _ => respond_json(request, 404, r#"{"ok":false,"error":"not_found"}"#),
            }
        }
        _ => respond_json(request, 404, r#"{"ok":false,"error":"not_found"}"#),
    }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

fn header_present(request: &Request, name: &str) -> bool {
    request.headers().iter().any(|h| {
        let field: &str = h.field.as_str().as_ref();
        field.eq_ignore_ascii_case(name)
    })
}

fn header_value<'a>(request: &'a Request, name: &str) -> Option<&'a str> {
    request.headers().iter().find_map(|h| {
        let field: &str = h.field.as_str().as_ref();
        if field.eq_ignore_ascii_case(name) {
            Some(h.value.as_str())
        } else {
            None
        }
    })
}

fn content_type_is_json(request: &Request) -> bool {
    header_value(request, "Content-Type")
        .map(|v| v.to_ascii_lowercase().starts_with("application/json"))
        .unwrap_or(false)
}

/// Constant-time bearer token compare.
fn authorize(request: &Request, expected: &str) -> bool {
    let Some(raw) = header_value(request, "Authorization") else {
        return ct_eq(b"", expected.as_bytes());
    };
    let prefix = "Bearer ";
    if !raw.starts_with(prefix) {
        return ct_eq(b"", expected.as_bytes());
    }
    let got = raw[prefix.len()..].trim().as_bytes();
    ct_eq(got, expected.as_bytes())
}

fn ct_eq(a: &[u8], b: &[u8]) -> bool {
    let mut diff = a.len() ^ b.len();
    let n = b.len();
    for i in 0..n {
        let av = if i < a.len() { a[i] } else { 0 };
        diff |= (av ^ b[i]) as usize;
    }
    diff == 0
}

fn read_body(request: &mut Request) -> Result<Vec<u8>, i32> {
    let declared = header_value(request, "Content-Length").and_then(|s| s.parse::<usize>().ok());
    if let Some(n) = declared {
        if n > MAX_BODY_BYTES {
            return Err(413);
        }
    }
    let mut buf = Vec::new();
    let mut limited = request.as_reader().take((MAX_BODY_BYTES as u64) + 1);
    limited.read_to_end(&mut buf).map_err(|_| 400)?;
    if buf.len() > MAX_BODY_BYTES {
        return Err(413);
    }
    Ok(buf)
}

fn respond_json(request: Request, status: i32, body: &str) {
    let mut response =
        Response::from_string(body.to_string()).with_status_code(StatusCode(status as u16));
    if let Ok(h) = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]) {
        response = response.with_header(h);
    }
    let _ = request.respond(response);
}
