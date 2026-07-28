import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient, getServiceRoleClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  validateUUID,
  rateDollars,
  budgetDollars as resolveBudgetDollars,
} from '../_shared/validators.ts';

// ─── Constants (keep in sync with src/lib/report/share-types.ts) ─────────────

const SCHEMA_VERSION = 1;
const MAX_ACTIVE_SHARES = 25;
const MAX_SESSIONS = 5000;
const PAGE_SIZE = 1000;
const PBKDF2_ITERS = 210_000;
const TOKEN_BYTES = 32;
const TOKEN_PREFIX_LEN = 8;
const MAX_BODY_BYTES = 32_768;
const THROTTLE_WINDOW_MS = 15 * 60_000;
const THROTTLE_MAX_FAILS = 8;
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

const responseHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/** Public web origin for share links (never Tauri / localhost). */
const DEFAULT_PUBLIC_SITE_URL = 'https://www.kettles.works';

function isPublicWebOrigin(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    if (host === 'tauri.localhost' || host.endsWith('.localhost')) return false;
    return true;
  } catch {
    return false;
  }
}

function publicSiteUrl(req: Request): string {
  const fromEnv = Deno.env.get('SITE_URL') || Deno.env.get('APP_URL') || '';
  if (isPublicWebOrigin(fromEnv)) return fromEnv.replace(/\/$/, '');
  const origin = req.headers.get('origin');
  if (isPublicWebOrigin(origin)) return origin!.replace(/\/$/, '');
  return DEFAULT_PUBLIC_SITE_URL;
}

// In-memory throttle (best-effort per isolate). Key = shareId|ip
const passwordFails = new Map<string, { count: number; resetAt: number }>();

// ─── Crypto ──────────────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hash));
}

async function generateToken(): Promise<{ token: string; digest: string; prefix: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  const token = bytesToBase64Url(bytes);
  const digest = await sha256Hex(token);
  return { token, digest, prefix: token.slice(0, TOKEN_PREFIX_LEN) };
}

async function hashPassword(password: string, saltHex?: string, iters = PBKDF2_ITERS) {
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iters, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return {
    hash: bytesToHex(new Uint8Array(bits)),
    salt: bytesToHex(salt),
    iters,
  };
}

async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
  iters: number
): Promise<boolean> {
  const derived = await hashPassword(password, salt, iters);
  return timingSafeEqual(derived.hash, hash);
}

// ─── Period resolution (owner timezone) ──────────────────────────────────────

type PeriodMode = 'week' | 'month' | 'year';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getTzParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: get('weekday'),
  };
}

function zonedLocalToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string
): number {
  let guess = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  for (let i = 0; i < 3; i++) {
    const p = getTzParts(guess, timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, ms);
    const wanted = Date.UTC(year, month - 1, day, hour, minute, second, ms);
    const delta = wanted - asUtc;
    if (delta === 0) break;
    guess += delta;
  }
  return guess;
}

function weekdayIndex(weekday: string): number {
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}

function mondayOfIsoWeek(isoYear: number, week: number, timeZone: string) {
  const jan4Ms = zonedLocalToUtcMs(isoYear, 1, 4, 12, 0, 0, 0, timeZone);
  const p = getTzParts(jan4Ms, timeZone);
  const dow = weekdayIndex(p.weekday);
  const monOffset = dow === 0 ? -6 : 1 - dow;
  const week1MondayMs = zonedLocalToUtcMs(p.year, p.month, p.day + monOffset, 12, 0, 0, 0, timeZone);
  const targetMs = week1MondayMs + (week - 1) * 7 * 86_400_000;
  const t = getTzParts(targetMs, timeZone);
  return { y: t.year, m: t.month, d: t.day };
}

function shortDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function resolvePeriod(periodMode: PeriodMode, periodKey: string, timeZone: string) {
  try {
    if (periodMode === 'week') {
      const m = /^(\d{4})-W(\d{2})$/.exec(periodKey);
      if (!m) return null;
      const year = Number(m[1]);
      const week = Number(m[2]);
      if (week < 1 || week > 53 || year < YEAR_MIN || year > YEAR_MAX) return null;
      const mon = mondayOfIsoWeek(year, week, timeZone);
      const startMs = zonedLocalToUtcMs(mon.y, mon.m, mon.d, 0, 0, 0, 0, timeZone);
      const sun = getTzParts(startMs + 6 * 86_400_000 + 12 * 3_600_000, timeZone);
      const endMs = zonedLocalToUtcMs(sun.year, sun.month, sun.day, 23, 59, 59, 999, timeZone);
      return {
        startMs,
        endMs,
        label: `${shortDate(mon.y, mon.m, mon.d)} – ${shortDate(sun.year, sun.month, sun.day)}`,
        key: periodKey,
        periodMode,
      };
    }
    if (periodMode === 'month') {
      const m = /^(\d{4})-(\d{2})$/.exec(periodKey);
      if (!m) return null;
      const year = Number(m[1]);
      const month = Number(m[2]);
      if (month < 1 || month > 12 || year < YEAR_MIN || year > YEAR_MAX) return null;
      const startMs = zonedLocalToUtcMs(year, month, 1, 0, 0, 0, 0, timeZone);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const endMs = zonedLocalToUtcMs(year, month, lastDay, 23, 59, 59, 999, timeZone);
      const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
      return { startMs, endMs, label, key: periodKey, periodMode };
    }
    const m = /^(\d{4})$/.exec(periodKey);
    if (!m) return null;
    const year = Number(m[1]);
    if (year < YEAR_MIN || year > YEAR_MAX) return null;
    return {
      startMs: zonedLocalToUtcMs(year, 1, 1, 0, 0, 0, 0, timeZone),
      endMs: zonedLocalToUtcMs(year, 12, 31, 23, 59, 59, 999, timeZone),
      label: String(year),
      key: periodKey,
      periodMode,
    };
  } catch {
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function err(status: number, code: string, message: string) {
  return json(status, { error: message, code });
}

function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function checkThrottle(key: string): boolean {
  const now = Date.now();
  const entry = passwordFails.get(key);
  if (!entry || entry.resetAt < now) {
    passwordFails.set(key, { count: 0, resetAt: now + THROTTLE_WINDOW_MS });
    return true;
  }
  return entry.count < THROTTLE_MAX_FAILS;
}

function recordFail(key: string) {
  const now = Date.now();
  const entry = passwordFails.get(key);
  if (!entry || entry.resetAt < now) {
    passwordFails.set(key, { count: 1, resetAt: now + THROTTLE_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function getData(row: any): Record<string, any> {
  if (!row?.data) return {};
  if (typeof row.data === 'object' && !Array.isArray(row.data)) return row.data;
  return {};
}

function firstDefined(...values: any[]) {
  return values.find((v) => v !== undefined && v !== null);
}

function isConfirmedSession(row: any): boolean {
  if (!row.ended_at) return false;
  const d = getData(row);
  const state = d.state;
  // Exclude in-progress / draft / discarded. Everything else with ended_at is reportable
  // (matches owner report: state defaults to "confirmed" when ended).
  if (
    state === 'draft' ||
    state === 'discarded' ||
    state === 'running' ||
    state === 'paused' ||
    state === 'finishing'
  ) {
    return false;
  }
  return true;
}

function billableLabel(billable: string) {
  if (billable === 'billable') return 'Billable only';
  if (billable === 'non-billable') return 'Non-billable only';
  return 'Billable + non-billable';
}

function parseShareData(data: any) {
  const filters = data?.filters ?? {};
  const options = data?.options ?? {};
  return {
    name: typeof data?.name === 'string' ? data.name : 'Shared report',
    displayName: typeof data?.displayName === 'string' && data.displayName.trim()
      ? data.displayName.trim()
      : undefined,
    filters: {
      projectId: filters.projectId ?? null,
      clientId: filters.clientId ?? null,
      tag: filters.tag ?? null,
      billable: ['all', 'billable', 'non-billable'].includes(filters.billable)
        ? filters.billable
        : 'all',
    },
    options: {
      showEarnings: options.showEarnings !== false,
      showTaskTitles: options.showTaskTitles !== false,
      showNotes: options.showNotes !== false,
      allowExport: options.allowExport !== false,
      defaultPeriodMode: ['week', 'month', 'year'].includes(options.defaultPeriodMode)
        ? options.defaultPeriodMode
        : 'month',
      defaultPeriodKey:
        typeof options.defaultPeriodKey === 'string' && options.defaultPeriodKey.trim()
          ? options.defaultPeriodKey.trim()
          : undefined,
    },
    schemaVersion: Number(data?.schema_version ?? data?.schemaVersion ?? SCHEMA_VERSION),
  };
}

async function countViews(service: ReturnType<typeof getServiceRoleClient>, shareId: string) {
  const { count } = await service
    .from('report_share_views')
    .select('*', { count: 'exact', head: true })
    .eq('share_id', shareId);
  const { data: last } = await service
    .from('report_share_views')
    .select('last_seen_at')
    .eq('share_id', shareId)
    .order('last_seen_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    viewCount: count ?? 0,
    lastViewedAt: last?.last_seen_at ? new Date(last.last_seen_at).getTime() : null,
  };
}

function formatOwnerShare(row: any, views: { viewCount: number; lastViewedAt: number | null }) {
  const parsed = parseShareData(row.data);
  return {
    id: row.id,
    tokenPrefix: row.token_prefix,
    name: parsed.name,
    displayName: parsed.displayName,
    filters: parsed.filters,
    options: parsed.options,
    timezone: row.timezone || 'UTC',
    passwordProtected: !!row.password_hash,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at).getTime() : null,
    viewCount: views.viewCount,
    lastViewedAt: views.lastViewedAt,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    schemaVersion: parsed.schemaVersion,
  };
}

function validateFilters(filters: any): string | null {
  if (!filters || typeof filters !== 'object') return 'filters required';
  if (filters.projectId != null && !validateUUID(filters.projectId)) return 'Invalid projectId';
  if (filters.clientId != null && !validateUUID(filters.clientId)) return 'Invalid clientId';
  if (filters.tag != null && (typeof filters.tag !== 'string' || filters.tag.length > 64)) {
    return 'Invalid tag';
  }
  if (!['all', 'billable', 'non-billable'].includes(filters.billable ?? 'all')) {
    return 'Invalid billable filter';
  }
  return null;
}

function validateOptions(options: any): string | null {
  if (!options || typeof options !== 'object') return 'options required';
  if (!['week', 'month', 'year'].includes(options.defaultPeriodMode ?? 'month')) {
    return 'Invalid defaultPeriodMode';
  }
  return null;
}

async function assertFilterOwnership(supabase: any, userId: string, filters: any) {
  if (filters.projectId) {
    const { data, error } = await supabase
      .from('projects')
      .select('id, client_id')
      .eq('id', filters.projectId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return 'Project not found';
    if (filters.clientId && data.client_id && data.client_id !== filters.clientId) {
      return 'Project does not belong to selected client';
    }
  }
  if (filters.clientId) {
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .eq('id', filters.clientId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return 'Client not found';
  }
  return null;
}

async function fetchSessionsPaginated(
  service: ReturnType<typeof getServiceRoleClient>,
  userId: string,
  startIso: string,
  endIso: string,
  filters: ReturnType<typeof parseShareData>['filters']
) {
  const rows: any[] = [];
  let from = 0;
  while (rows.length < MAX_SESSIONS) {
    let query = service
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .gte('ended_at', startIso)
      .lte('ended_at', endIso)
      .order('ended_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (filters.projectId) query = query.eq('project_id', filters.projectId);
    if (filters.billable === 'billable') query = query.eq('billable', true);
    if (filters.billable === 'non-billable') query = query.eq('billable', false);

    const { data, error } = await query;
    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    if (rows.length >= MAX_SESSIONS && batch.length === PAGE_SIZE) {
      throw new Error('SESSION_LIMIT');
    }
  }
  return rows.filter(isConfirmedSession);
}

async function chunkById<T extends { id: string }>(
  ids: string[],
  fetchChunk: (chunk: string[]) => Promise<T[]>
): Promise<T[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const out: T[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    out.push(...(await fetchChunk(chunk)));
  }
  return out;
}

async function buildPublicSource(
  service: ReturnType<typeof getServiceRoleClient>,
  userId: string,
  filters: ReturnType<typeof parseShareData>['filters'],
  options: ReturnType<typeof parseShareData>['options'],
  startMs: number,
  endMs: number
) {
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();
  let sessions = await fetchSessionsPaginated(service, userId, startIso, endIso, filters);

  // Client filter via project.client_id
  let projects = await chunkById(
    sessions.map((s) => s.project_id).filter(Boolean),
    async (ids) => {
      const { data, error } = await service
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .in('id', ids);
      if (error) throw error;
      return data || [];
    }
  );

  if (filters.clientId) {
    const allowed = new Set(
      projects.filter((p) => p.client_id === filters.clientId).map((p) => p.id)
    );
    sessions = sessions.filter((s) => s.project_id && allowed.has(s.project_id));
    projects = projects.filter((p) => allowed.has(p.id));
  }

  let tasks = await chunkById(
    sessions.map((s) => s.task_id).filter(Boolean),
    async (ids) => {
      const { data, error } = await service
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .in('id', ids);
      if (error) throw error;
      return data || [];
    }
  );

  if (filters.tag) {
    const tagged = new Set(
      tasks
        .filter((t) => {
          const tags = getData(t).tags ?? t.tags ?? [];
          return Array.isArray(tags) && tags.includes(filters.tag);
        })
        .map((t) => t.id)
    );
    sessions = sessions.filter((s) => s.task_id && tagged.has(s.task_id));
    tasks = tasks.filter((t) => tagged.has(t.id));
    const projectIds = new Set(sessions.map((s) => s.project_id).filter(Boolean));
    projects = projects.filter((p) => projectIds.has(p.id));
  }

  const clients = await chunkById(
    projects.map((p) => p.client_id).filter(Boolean),
    async (ids) => {
      const { data, error } = await service
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .in('id', ids);
      if (error) throw error;
      return data || [];
    }
  );

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const publicSessions = sessions.map((s) => {
    const d = getData(s);
    const notes = options.showNotes && Array.isArray(d.notes)
      ? d.notes
          .filter((n: any) => n && typeof n.text === 'string' && n.text.trim())
          .map((n: any) => ({
            id: String(n.id ?? crypto.randomUUID()),
            timestamp: typeof n.timestamp === 'number' ? n.timestamp : Date.now(),
            text: String(n.text).trim(),
          }))
      : undefined;
    return {
      id: s.id,
      taskId: s.task_id ?? '',
      projectId: s.project_id ?? '',
      billable: !!s.billable,
      startedAt: new Date(s.started_at).getTime(),
      endedAt: new Date(s.ended_at).getTime(),
      durationSeconds: s.duration_seconds ?? 0,
      state: 'confirmed' as const,
      ...(notes && notes.length ? { notes } : {}),
    };
  });

  const publicTasks = tasks.map((t) => {
    const d = getData(t);
    const statusRaw = d.status ?? t.status ?? 'todo';
    const status = statusRaw === 'in_progress' ? 'doing' : statusRaw;
    return {
      id: t.id,
      title: options.showTaskTitles
        ? String(d.title ?? t.title ?? 'Task')
        : 'Task',
      status: ['todo', 'doing', 'done'].includes(status) ? status : 'todo',
      tags: Array.isArray(d.tags) ? d.tags : undefined,
      projectId: t.project_id ?? null,
    };
  });

  const publicProjects = projects.map((p) => {
    const d = getData(p);
    const out: any = {
      id: p.id,
      name: String(d.name ?? p.name ?? 'Project'),
      color: String(d.color ?? p.color ?? '#3b82f6'),
      billable: firstDefined(d.billable, p.billable) ?? false,
    };
    if (p.client_id) out.clientId = p.client_id;
    if (options.showEarnings) {
      const rate = rateDollars(p);
      if (rate != null) out.hourlyRate = rate;
      const budget = resolveBudgetDollars(p);
      if (budget != null) out.budget = budget;
    }
    return out;
  });

  const publicClients = clients.map((c) => {
    const d = getData(c);
    const out: any = {
      id: c.id,
      name: String(d.name ?? c.name ?? 'Client'),
    };
    if (options.showEarnings) {
      const rate = rateDollars(c);
      if (rate != null) out.hourlyRate = rate;
    }
    return out;
  });

  // Filter labels (human-readable)
  const filterLabels: Record<string, string> = {
    billable: billableLabel(filters.billable),
  };
  if (filters.projectId) {
    const p = projectById.get(filters.projectId) || projects.find((x) => x.id === filters.projectId);
    if (p) filterLabels.project = String(getData(p).name ?? p.name ?? 'Project');
  }
  if (filters.clientId) {
    const c = clients.find((x) => x.id === filters.clientId);
    if (c) filterLabels.client = String(getData(c).name ?? c.name ?? 'Client');
  }
  if (filters.tag) filterLabels.tag = filters.tag;

  // Ensure task map completeness for sessions with missing tasks
  for (const s of publicSessions) {
    if (s.taskId && !taskById.has(s.taskId) && !publicTasks.find((t) => t.id === s.taskId)) {
      publicTasks.push({
        id: s.taskId,
        title: options.showTaskTitles ? 'Unknown task' : 'Task',
        status: 'todo',
        projectId: s.projectId || null,
      });
    }
  }

  return {
    source: {
      sessions: publicSessions,
      tasks: publicTasks,
      projects: publicProjects,
      clients: publicClients,
    },
    filterLabels,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

async function handleView(req: Request) {
  const service = getServiceRoleClient();
  let body: any;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return err(413, 'payload_too_large', 'Request too large');
    body = JSON.parse(text || '{}');
  } catch {
    return err(400, 'validation_error', 'Invalid JSON');
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  let periodMode = body.periodMode as PeriodMode;
  let periodKey = typeof body.periodKey === 'string' ? body.periodKey.trim() : '';
  const viewerSessionId =
    typeof body.viewerSessionId === 'string' ? body.viewerSessionId.trim() : '';
  const password = typeof body.password === 'string' ? body.password : undefined;

  if (!token || token.length < 16) return err(404, 'unavailable', 'This share link is unavailable');
  if (!viewerSessionId || viewerSessionId.length < 8) {
    return err(400, 'validation_error', 'Missing viewer session');
  }

  const digest = await sha256Hex(token);
  const { data: share, error } = await service
    .from('report_shares')
    .select('*')
    .eq('token_digest', digest)
    .maybeSingle();

  if (error) throw error;
  if (!share || share.revoked_at) return err(404, 'unavailable', 'This share link is unavailable');
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
    return err(404, 'unavailable', 'This share link is unavailable');
  }

  const parsedEarly = parseShareData(share.data);
  // Fall back to the period the owner pinned at create time
  if (!['week', 'month', 'year'].includes(periodMode)) {
    periodMode = parsedEarly.options.defaultPeriodMode;
  }
  if (!periodKey) {
    periodKey = parsedEarly.options.defaultPeriodKey || '';
  }
  if (!['week', 'month', 'year'].includes(periodMode) || !periodKey) {
    return err(400, 'invalid_period', 'Invalid period');
  }

  const ip = clientIp(req);
  const throttleKey = `${share.id}|${ip}`;
  if (!checkThrottle(throttleKey)) {
    return err(429, 'rate_limited', 'Too many attempts. Try again later.');
  }

  if (share.password_hash) {
    if (!password) return err(401, 'password_required', 'Password required');
    const ok = await verifyPassword(
      password,
      share.password_hash,
      share.password_salt,
      share.password_iters || PBKDF2_ITERS
    );
    if (!ok) {
      recordFail(throttleKey);
      return err(403, 'wrong_password', 'Incorrect password');
    }
  }

  const parsed = parseShareData(share.data);
  const range = resolvePeriod(periodMode, periodKey, share.timezone || 'UTC');
  if (!range) return err(400, 'invalid_period', 'Invalid period');

  let built;
  try {
    built = await buildPublicSource(
      service,
      share.user_id,
      parsed.filters,
      parsed.options,
      range.startMs,
      range.endMs
    );
  } catch (e: any) {
    if (e?.message === 'SESSION_LIMIT') {
      return err(413, 'payload_too_large', 'Too many sessions in this period');
    }
    throw e;
  }

  // Await view recording (deduped by viewer session)
  try {
    await service.rpc('record_report_share_view', {
      p_share_id: share.id,
      p_viewer_session_id: viewerSessionId,
    });
  } catch (e) {
    console.error('record_report_share_view failed', e);
  }

  return json(200, {
    share: {
      name: parsed.name,
      ...(parsed.displayName ? { displayName: parsed.displayName } : {}),
      options: parsed.options,
      filterLabels: built.filterLabels,
      defaultPeriodMode: parsed.options.defaultPeriodMode,
      ...(parsed.options.defaultPeriodKey
        ? { defaultPeriodKey: parsed.options.defaultPeriodKey }
        : {}),
      timezone: share.timezone || 'UTC',
    },
    range,
    source: built.source,
  });
}

async function requireUser(req: Request) {
  const supabase = getSupabaseClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: err(401, 'unavailable', 'Unauthorized') } as const;
  return { supabase, user } as const;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return new Response(corsResponse.body, {
      status: corsResponse.status,
      headers: { ...corsHeaders, 'Cache-Control': 'no-store' },
    });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // path: /report-shares | /report-shares/view | /report-shares/:id | /report-shares/:id/revoke ...
  const after = parts[0] === 'report-shares' ? parts.slice(1) : parts;
  const head = after[0] || '';
  const action = after[1] || '';

  try {
    // Public route — before auth
    if (req.method === 'POST' && head === 'view') {
      return await handleView(req);
    }

    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { supabase, user } = auth;
    const service = getServiceRoleClient();

    if (req.method === 'GET' && !head) {
      const { data, error } = await supabase
        .from('report_shares')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const shares = [];
      for (const row of data || []) {
        const views = await countViews(service, row.id);
        shares.push(formatOwnerShare(row, views));
      }
      return json(200, { shares });
    }

    if (req.method === 'POST' && !head) {
      const text = await req.text();
      if (text.length > MAX_BODY_BYTES) return err(413, 'payload_too_large', 'Request too large');
      const body = JSON.parse(text || '{}');

      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 120) return err(400, 'validation_error', 'Name required');
      const displayName =
        typeof body.displayName === 'string' && body.displayName.trim()
          ? body.displayName.trim().slice(0, 80)
          : undefined;
      const timezone =
        typeof body.timezone === 'string' && body.timezone.trim()
          ? body.timezone.trim().slice(0, 64)
          : 'UTC';
      const filters = {
        projectId: body.filters?.projectId ?? null,
        clientId: body.filters?.clientId ?? null,
        tag: body.filters?.tag ?? null,
        billable: body.filters?.billable ?? 'all',
      };
      const options = {
        showEarnings: body.options?.showEarnings !== false,
        showTaskTitles: body.options?.showTaskTitles !== false,
        showNotes: body.options?.showNotes !== false,
        allowExport: body.options?.allowExport !== false,
        defaultPeriodMode: body.options?.defaultPeriodMode ?? 'month',
        defaultPeriodKey:
          typeof body.options?.defaultPeriodKey === 'string' && body.options.defaultPeriodKey.trim()
            ? body.options.defaultPeriodKey.trim()
            : undefined,
      };

      const fErr = validateFilters(filters);
      if (fErr) return err(400, 'validation_error', fErr);
      const oErr = validateOptions(options);
      if (oErr) return err(400, 'validation_error', oErr);
      const ownErr = await assertFilterOwnership(supabase, user.id, filters);
      if (ownErr) return err(400, 'validation_error', ownErr);

      const { count } = await supabase
        .from('report_shares')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('revoked_at', null);
      if ((count ?? 0) >= MAX_ACTIVE_SHARES) {
        return err(400, 'limit_reached', `Maximum of ${MAX_ACTIVE_SHARES} active shares`);
      }

      const { token, digest, prefix } = await generateToken();
      let password_hash: string | null = null;
      let password_salt: string | null = null;
      let password_iters: number | null = null;
      if (typeof body.password === 'string' && body.password.length > 0) {
        if (body.password.length < 4 || body.password.length > 128) {
          return err(400, 'validation_error', 'Password must be 4–128 characters');
        }
        const hashed = await hashPassword(body.password);
        password_hash = hashed.hash;
        password_salt = hashed.salt;
        password_iters = hashed.iters;
      }

      const expires_at =
        typeof body.expiresAt === 'number' && body.expiresAt > Date.now()
          ? new Date(body.expiresAt).toISOString()
          : null;

      const insertData = {
        user_id: user.id,
        token_digest: digest,
        token_prefix: prefix,
        password_hash,
        password_salt,
        password_iters,
        timezone,
        expires_at,
        data: {
          schema_version: SCHEMA_VERSION,
          name,
          displayName,
          filters,
          options,
        },
      };

      const { data, error } = await supabase.from('report_shares').insert(insertData).select().single();
      if (error) throw error;

      const urlOut = `${publicSiteUrl(req)}/share?t=${encodeURIComponent(token)}`;

      return json(201, {
        ...formatOwnerShare(data, { viewCount: 0, lastViewedAt: null }),
        token,
        url: urlOut,
      });
    }

    if (!head || !validateUUID(head)) {
      return err(400, 'validation_error', 'Invalid share id');
    }
    const id = head;

    // Ensure ownership
    const { data: existing, error: fetchErr } = await supabase
      .from('report_shares')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return err(404, 'unavailable', 'Share not found');

    if (req.method === 'POST' && action === 'revoke') {
      const { data, error } = await supabase
        .from('report_shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      const views = await countViews(service, id);
      return json(200, formatOwnerShare(data, views));
    }

    if (req.method === 'POST' && action === 'rotate-token') {
      const { token, digest, prefix } = await generateToken();
      const { data, error } = await supabase
        .from('report_shares')
        .update({
          token_digest: digest,
          token_prefix: prefix,
          revoked_at: null,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      const views = await countViews(service, id);
      return json(200, {
        ...formatOwnerShare(data, views),
        token,
        url: `${publicSiteUrl(req)}/share?t=${encodeURIComponent(token)}`,
      });
    }

    if (req.method === 'PATCH' && !action) {
      const text = await req.text();
      if (text.length > MAX_BODY_BYTES) return err(413, 'payload_too_large', 'Request too large');
      const body = JSON.parse(text || '{}');
      const parsed = parseShareData(existing.data);
      const nextData: any = {
        schema_version: SCHEMA_VERSION,
        name: typeof body.name === 'string' ? body.name.trim().slice(0, 120) || parsed.name : parsed.name,
        displayName:
          body.displayName === null
            ? undefined
            : typeof body.displayName === 'string'
              ? body.displayName.trim().slice(0, 80) || undefined
              : parsed.displayName,
        filters: parsed.filters,
        options: {
          ...parsed.options,
          ...(body.options && typeof body.options === 'object' ? body.options : {}),
        },
      };
      const oErr = validateOptions(nextData.options);
      if (oErr) return err(400, 'validation_error', oErr);

      const update: any = { data: nextData };
      if (body.expiresAt === null) update.expires_at = null;
      else if (typeof body.expiresAt === 'number') {
        update.expires_at = body.expiresAt > Date.now() ? new Date(body.expiresAt).toISOString() : null;
      }

      if (body.removePassword === true) {
        update.password_hash = null;
        update.password_salt = null;
        update.password_iters = null;
      } else if (typeof body.password === 'string' && body.password.length > 0) {
        if (body.password.length < 4 || body.password.length > 128) {
          return err(400, 'validation_error', 'Password must be 4–128 characters');
        }
        const hashed = await hashPassword(body.password);
        update.password_hash = hashed.hash;
        update.password_salt = hashed.salt;
        update.password_iters = hashed.iters;
      }

      const { data, error } = await supabase
        .from('report_shares')
        .update(update)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      const views = await countViews(service, id);
      return json(200, formatOwnerShare(data, views));
    }

    if (req.method === 'DELETE' && !action) {
      const { error } = await supabase
        .from('report_shares')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      return json(200, { success: true });
    }

    return err(405, 'validation_error', 'Method not allowed');
  } catch (e: any) {
    console.error('report-shares error', e);
    return err(500, 'validation_error', e?.message || 'Internal error');
  }
});
