import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient, getServiceRoleClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { readJsonBody, publicErrorMessage } from '../_shared/validators.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_CALENDAR_LIST_URL =
  'https://www.googleapis.com/calendar/v3/users/me/calendarList';
const CALENDAR_READONLY_SCOPE =
  'https://www.googleapis.com/auth/calendar.readonly';
/** Treat access tokens as expired this many ms early. */
const EXPIRY_SKEW_MS = 60_000;

type ConnectionRow = {
  user_id: string;
  refresh_token: string | null;
  access_token: string | null;
  access_token_expires_at: string | null;
  granted_scopes: string;
  selected_calendar_ids: string[] | null;
  google_account_email: string | null;
  connected_at: string | null;
  revoked_at: string | null;
  last_synced_at: string | null;
  updated_at?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleCalendarListItem = {
  id?: string;
  summary?: string;
  primary?: boolean;
  backgroundColor?: string;
};

type GoogleEventItem = {
  id?: string;
  status?: string;
  summary?: string;
  htmlLink?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: Array<{ self?: boolean; responseStatus?: string }>;
};

/** Thrown when Google says the refresh token is dead (user revoked). */
class ReconnectRequiredError extends Error {
  constructor() {
    super('reconnect_required');
    this.name = 'ReconnectRequiredError';
  }
}

/** Google token endpoint error — `code` is Google's error string (e.g. invalid_grant). */
class GoogleTokenError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = 'GoogleTokenError';
    this.code = code;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function getOAuthConfig():
  | { clientId: string; clientSecret: string; redirectUris: string[] }
  | { error: string } {
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
  // Comma-separated allowlist, so localhost and production can both be live
  // without swapping a secret between environments. GOOGLE_OAUTH_REDIRECT_URI
  // (singular) is still honoured so an existing deployment keeps working.
  const raw =
    Deno.env.get('GOOGLE_OAUTH_REDIRECT_URIS') ??
    Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI') ??
    '';
  const redirectUris = raw
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);

  if (!clientId || !clientSecret || redirectUris.length === 0) {
    return {
      error:
        'Google Calendar OAuth is not configured (missing GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, or GOOGLE_OAUTH_REDIRECT_URIS)',
    };
  }
  return { clientId, clientSecret, redirectUris };
}

/**
 * Resolve a caller-supplied redirect URI against the allowlist.
 *
 * This MUST stay an exact-match allowlist. A redirect_uri taken from the
 * request and passed to Google unchecked is the classic OAuth token-theft
 * hole: an attacker points it at a host they control and Google hands them
 * the authorization code. Prefix or startsWith matching is not good enough
 * either — `https://kettles.works.evil.com/` starts with the real origin.
 *
 * Returns null when the value is present but not allowlisted, so the caller
 * can reject rather than silently fall back to the default.
 */
function resolveRedirectUri(
  requested: string | null | undefined,
  allowed: string[]
): string | null {
  if (!requested) return allowed[0];
  const trimmed = requested.trim();
  return allowed.includes(trimmed) ? trimmed : null;
}

function toMs(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

/** Map a DB row to the public GoogleCalendarConnection contract (no tokens). */
function toConnectionResponse(row: ConnectionRow | null): Record<string, unknown> {
  if (!row) {
    return { connected: false, selectedCalendarIds: [] };
  }

  const selectedCalendarIds = Array.isArray(row.selected_calendar_ids)
    ? row.selected_calendar_ids
    : [];
  const revokedAt = toMs(row.revoked_at);

  if (row.revoked_at) {
    const out: Record<string, unknown> = {
      connected: false,
      selectedCalendarIds,
      revokedAt,
    };
    const email = row.google_account_email;
    if (email) out.googleAccountEmail = email;
    const connectedAt = toMs(row.connected_at);
    if (connectedAt !== undefined) out.connectedAt = connectedAt;
    const lastSyncedAt = toMs(row.last_synced_at);
    if (lastSyncedAt !== undefined) out.lastSyncedAt = lastSyncedAt;
    return out;
  }

  const out: Record<string, unknown> = {
    connected: true,
    selectedCalendarIds,
  };
  if (row.google_account_email) out.googleAccountEmail = row.google_account_email;
  const connectedAt = toMs(row.connected_at);
  if (connectedAt !== undefined) out.connectedAt = connectedAt;
  const lastSyncedAt = toMs(row.last_synced_at);
  if (lastSyncedAt !== undefined) out.lastSyncedAt = lastSyncedAt;
  return out;
}

async function loadConnection(userId: string): Promise<ConnectionRow | null> {
  const admin = getServiceRoleClient();
  const { data, error } = await admin
    .from('google_calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as ConnectionRow) ?? null;
}

function isAccessTokenFresh(row: ConnectionRow): boolean {
  if (!row.access_token || !row.access_token_expires_at) return false;
  const expiresAt = new Date(row.access_token_expires_at).getTime();
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt - EXPIRY_SKEW_MS > Date.now();
}

/** Form-encoded POST to Google's token endpoint. Never logs the body. */
async function postTokenForm(
  params: Record<string, string>
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams(params);
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  let data: GoogleTokenResponse;
  try {
    data = (await res.json()) as GoogleTokenResponse;
  } catch {
    console.error('[google-calendar] token endpoint returned non-JSON', res.status);
    throw new Error('Google token exchange failed');
  }
  if (!res.ok || data.error) {
    const code = data.error || `http_${res.status}`;
    console.error('[google-calendar] token error', code);
    throw new GoogleTokenError(code);
  }
  return data;
}

/**
 * Mark connection as revoked. access_token is nulled; refresh_token is kept
 * because the column is NOT NULL (migration). revoked_at is the real signal.
 */
async function markRevoked(userId: string): Promise<void> {
  const admin = getServiceRoleClient();
  const { error } = await admin
    .from('google_calendar_connections')
    .update({
      revoked_at: new Date().toISOString(),
      access_token: null,
      access_token_expires_at: null,
    })
    .eq('user_id', userId);
  if (error) throw error;
}

async function refreshAccessToken(
  userId: string,
  row: ConnectionRow
): Promise<ConnectionRow> {
  if (!row.refresh_token) {
    await markRevoked(userId);
    throw new ReconnectRequiredError();
  }

  const config = getOAuthConfig();
  if ('error' in config) throw new Error(config.error);

  let token: GoogleTokenResponse;
  try {
    token = await postTokenForm({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
    });
  } catch (err) {
    if (err instanceof GoogleTokenError && err.code === 'invalid_grant') {
      await markRevoked(userId);
      throw new ReconnectRequiredError();
    }
    throw err;
  }

  if (!token.access_token) {
    console.error('[google-calendar] refresh missing access_token');
    throw new Error('Google token refresh failed');
  }

  const expiresIn = typeof token.expires_in === 'number' ? token.expires_in : 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const admin = getServiceRoleClient();
  const patch: Record<string, unknown> = {
    access_token: token.access_token,
    access_token_expires_at: expiresAt,
    revoked_at: null,
  };
  // Google may rotate the refresh token; keep the old one if not re-issued.
  if (token.refresh_token) {
    patch.refresh_token = token.refresh_token;
  }
  if (token.scope) {
    patch.granted_scopes = token.scope;
  }

  const { data, error } = await admin
    .from('google_calendar_connections')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as ConnectionRow;
}

/**
 * Ensure a live access token. Refreshes if missing/expired.
 * On invalid_grant: marks row revoked and throws ReconnectRequiredError.
 */
async function ensureAccessToken(
  userId: string,
  row: ConnectionRow
): Promise<{ row: ConnectionRow; accessToken: string }> {
  if (row.revoked_at) {
    throw new ReconnectRequiredError();
  }
  if (!row.refresh_token) {
    await markRevoked(userId);
    throw new ReconnectRequiredError();
  }

  let current = row;
  if (!isAccessTokenFresh(current)) {
    current = await refreshAccessToken(userId, current);
  }
  if (!current.access_token) {
    console.error('[google-calendar] no access_token after refresh');
    throw new Error('Google access token unavailable');
  }
  return { row: current, accessToken: current.access_token };
}

/**
 * Call a Google API with the user's token. On 401, refresh once and retry once.
 * Never logs response bodies that may contain tokens.
 */
async function googleFetch(
  userId: string,
  row: ConnectionRow,
  url: string,
  init: RequestInit = {}
): Promise<{ response: Response; row: ConnectionRow }> {
  let { row: current, accessToken } = await ensureAccessToken(userId, row);

  const doFetch = (token: string) =>
    fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

  let response = await doFetch(accessToken);

  if (response.status === 401) {
    current = await refreshAccessToken(userId, current);
    if (!current.access_token) {
      throw new Error('Google access token unavailable');
    }
    response = await doFetch(current.access_token);
  }

  return { response, row: current };
}

/** Local midnight of a YYYY-MM-DD date string (server local TZ). */
// UTC, deliberately — NOT the server's local zone.
//
// This function runs in Deno on Supabase's infrastructure; its local timezone
// has nothing to do with the viewer's. `new Date(y, m-1, d)` would resolve an
// all-day event to the server's midnight, which for any viewer west of that
// zone lands on the previous day. The client re-derives real local midnight
// from the `startDate` / `endDate` strings; this value is only a stable
// fallback for consumers that ignore them.
function utcMidnightMs(dateOnly: string): number {
  const [y, m, d] = dateOnly.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d);
}

function normalizeEvent(
  item: GoogleEventItem,
  calendarId: string
): Record<string, unknown> | null {
  if (!item?.id) return null;
  if (item.status === 'cancelled') return null;

  const allDay = Boolean(item.start?.date && !item.start?.dateTime);
  let startsAt: number;
  let endsAt: number;

  if (allDay) {
    startsAt = utcMidnightMs(item.start!.date!);
    // Google's end.date is exclusive (next day). Use as-is — do not subtract.
    endsAt = item.end?.date
      ? utcMidnightMs(item.end.date)
      : startsAt + 24 * 60 * 60 * 1000;
  } else {
    startsAt = item.start?.dateTime
      ? new Date(item.start.dateTime).getTime()
      : NaN;
    endsAt = item.end?.dateTime
      ? new Date(item.end.dateTime).getTime()
      : NaN;
  }

  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) return null;

  const selfAttendee = (item.attendees || []).find((a) => a.self === true);
  const out: Record<string, unknown> = {
    id: item.id,
    calendarId,
    title: item.summary?.trim() ? item.summary : '(no title)',
    startsAt,
    endsAt,
    allDay,
  };
  // Authoritative for all-day events — the client converts these to real local
  // midnight. startsAt/endsAt above are UTC and will be off by the viewer's
  // offset, which is exactly why these strings are sent alongside them.
  if (allDay) {
    if (item.start?.date) out.startDate = item.start.date;
    if (item.end?.date) out.endDate = item.end.date;
  }
  if (item.location) out.location = item.location;
  if (item.htmlLink) out.url = item.htmlLink;
  if (selfAttendee?.responseStatus) {
    out.responseStatus = selfAttendee.responseStatus;
  }
  return out;
}

async function resolveGoogleAccountEmail(
  userId: string,
  row: ConnectionRow
): Promise<string | null> {
  try {
    const { response } = await googleFetch(
      userId,
      row,
      `${GOOGLE_CALENDAR_LIST_URL}?maxResults=250`
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      items?: GoogleCalendarListItem[];
    };
    const primary = (data.items || []).find((c) => c.primary);
    return primary?.id || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getSupabaseClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Last segment: status | auth-url | callback | calendars | events | google-calendar
  const route = pathParts[pathParts.length - 1] || '';

  try {
    switch (req.method) {
      // ── GET ──────────────────────────────────────────────────────────────
      case 'GET': {
        if (route === 'status') {
          const row = await loadConnection(user.id);
          return json(toConnectionResponse(row));
        }

        if (route === 'auth-url') {
          const config = getOAuthConfig();
          if ('error' in config) {
            return json({ error: config.error }, 500);
          }
          // The browser tells us which of its origins it is calling from, so
          // localhost and production can share one deployment. Rejected rather
          // than defaulted when unrecognised — a silent fallback would send the
          // user to the wrong environment and burn the one-time code there.
          const wantedRedirect = resolveRedirectUri(
            url.searchParams.get('redirectUri'),
            config.redirectUris
          );
          if (!wantedRedirect) {
            return json({ error: 'redirect_uri_not_allowed' }, 400);
          }
          const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: wantedRedirect,
            response_type: 'code',
            scope: CALENDAR_READONLY_SCOPE,
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true',
            state: user.id,
          });
          return json({ url: `${GOOGLE_AUTH_URL}?${params.toString()}` });
        }

        if (route === 'calendars') {
          const row = await loadConnection(user.id);
          if (!row || row.revoked_at || !row.refresh_token) {
            return json(
              {
                error: row?.revoked_at
                  ? 'reconnect_required'
                  : 'Google Calendar not connected',
              },
              row?.revoked_at ? 409 : 400
            );
          }

          const { response, row: current } = await googleFetch(
            user.id,
            row,
            `${GOOGLE_CALENDAR_LIST_URL}?maxResults=250`
          );
          if (!response.ok) {
            console.error(
              '[google-calendar] calendarList failed',
              response.status
            );
            return json({ error: 'Failed to list calendars' }, 502);
          }

          const data = (await response.json()) as {
            items?: GoogleCalendarListItem[];
          };
          const calendars = (data.items || [])
            .filter((c) => c.id)
            .map((c) => {
              const entry: Record<string, unknown> = {
                id: c.id as string,
                summary: c.summary || c.id || '(unnamed)',
              };
              if (c.primary) entry.primary = true;
              if (c.backgroundColor) entry.backgroundColor = c.backgroundColor;
              return entry;
            });

          // Best-effort: fill email if we never stored it.
          if (!current.google_account_email) {
            const primary = (data.items || []).find((c) => c.primary);
            if (primary?.id) {
              const admin = getServiceRoleClient();
              await admin
                .from('google_calendar_connections')
                .update({ google_account_email: primary.id })
                .eq('user_id', user.id);
            }
          }

          return json({ calendars });
        }

        if (route === 'events') {
          const timeMin = url.searchParams.get('timeMin');
          const timeMax = url.searchParams.get('timeMax');
          if (!timeMin || !timeMax) {
            return json(
              { error: 'Invalid query: timeMin and timeMax are required' },
              400
            );
          }
          const minMs = new Date(timeMin).getTime();
          const maxMs = new Date(timeMax).getTime();
          if (Number.isNaN(minMs) || Number.isNaN(maxMs)) {
            return json(
              { error: 'Invalid query: timeMin and timeMax must be ISO dates' },
              400
            );
          }
          if (minMs >= maxMs) {
            return json(
              { error: 'Invalid query: timeMin must be before timeMax' },
              400
            );
          }

          const row = await loadConnection(user.id);
          if (!row || row.revoked_at || !row.refresh_token) {
            return json(
              {
                error: row?.revoked_at
                  ? 'reconnect_required'
                  : 'Google Calendar not connected',
              },
              row?.revoked_at ? 409 : 400
            );
          }

          const selected = Array.isArray(row.selected_calendar_ids)
            ? row.selected_calendar_ids.filter(Boolean)
            : [];
          // Empty selection = primary calendar only (see migration comment).
          const calendarIds = selected.length > 0 ? selected : ['primary'];

          const events: Record<string, unknown>[] = [];
          let workingRow = row;

          for (const calendarId of calendarIds) {
            const qs = new URLSearchParams({
              timeMin: new Date(minMs).toISOString(),
              timeMax: new Date(maxMs).toISOString(),
              singleEvents: 'true',
              orderBy: 'startTime',
              maxResults: '250',
            });
            const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
              calendarId
            )}/events?${qs.toString()}`;

            const { response, row: nextRow } = await googleFetch(
              user.id,
              workingRow,
              endpoint
            );
            workingRow = nextRow;

            if (!response.ok) {
              // Skip calendars the user lost access to; keep the rest.
              console.error(
                '[google-calendar] events fetch failed',
                response.status,
                calendarId === 'primary' ? 'primary' : 'cal'
              );
              continue;
            }

            const data = (await response.json()) as {
              items?: GoogleEventItem[];
            };
            for (const item of data.items || []) {
              const normalized = normalizeEvent(item, calendarId);
              if (normalized) events.push(normalized);
            }
          }

          events.sort(
            (a, b) => (a.startsAt as number) - (b.startsAt as number)
          );

          const admin = getServiceRoleClient();
          await admin
            .from('google_calendar_connections')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('user_id', user.id);

          return json({ events });
        }

        return json({ error: 'Not found' }, 404);
      }

      // ── POST ─────────────────────────────────────────────────────────────
      case 'POST': {
        if (route !== 'callback') {
          return json({ error: 'Not found' }, 404);
        }

        const config = getOAuthConfig();
        if ('error' in config) {
          return json({ error: config.error }, 500);
        }

        const parsed = await readJsonBody(req);
        if (parsed.error) {
          return json(
            { error: parsed.error },
            parsed.error === 'Request too large' ? 413 : 400
          );
        }
        const body = parsed.body || {};
        const code = typeof body.code === 'string' ? body.code.trim() : '';
        const state = typeof body.state === 'string' ? body.state.trim() : '';

        if (!code) {
          return json({ error: 'Missing required field: code' }, 400);
        }
        // CSRF: state was set to the authenticated user's id on /auth-url.
        if (!state || state !== user.id) {
          return json({ error: 'Invalid OAuth state' }, 400);
        }
        // Google requires the redirect_uri on the token exchange to be byte
        // identical to the one used on the consent request, so the client has
        // to send back the same value. Re-validate it here: this half of the
        // flow is separately reachable, and an allowlist checked only on the
        // way out is not an allowlist.
        const callbackRedirect = resolveRedirectUri(
          typeof body.redirectUri === 'string' ? body.redirectUri : null,
          config.redirectUris
        );
        if (!callbackRedirect) {
          return json({ error: 'redirect_uri_not_allowed' }, 400);
        }

        let token: GoogleTokenResponse;
        try {
          token = await postTokenForm({
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: callbackRedirect,
            grant_type: 'authorization_code',
          });
        } catch (err) {
          // invalid_grant here means expired/used code, not a revoked connection.
          if (err instanceof GoogleTokenError) {
            return json({ error: 'Google token exchange failed' }, 400);
          }
          throw err;
        }

        if (!token.access_token) {
          console.error('[google-calendar] code exchange missing access_token');
          return json({ error: 'Google token exchange failed' }, 502);
        }
        if (!token.refresh_token) {
          // Without offline access we cannot stay connected. prompt=consent
          // should always yield a refresh_token; if it doesn't, fail loudly.
          console.error('[google-calendar] code exchange missing refresh_token');
          return json(
            {
              error:
                'Google did not return a refresh token. Disconnect the app in Google Account permissions and try again.',
            },
            502
          );
        }

        const expiresIn =
          typeof token.expires_in === 'number' ? token.expires_in : 3600;
        const accessTokenExpiresAt = new Date(
          Date.now() + expiresIn * 1000
        ).toISOString();
        const grantedScopes = token.scope || CALENDAR_READONLY_SCOPE;

        // Preserve selected calendars on reconnect if a prior row exists.
        const existing = await loadConnection(user.id);
        const selectedCalendarIds =
          existing && Array.isArray(existing.selected_calendar_ids)
            ? existing.selected_calendar_ids
            : [];

        const admin = getServiceRoleClient();
        const upsertRow = {
          user_id: user.id,
          refresh_token: token.refresh_token,
          access_token: token.access_token,
          access_token_expires_at: accessTokenExpiresAt,
          granted_scopes: grantedScopes,
          selected_calendar_ids: selectedCalendarIds,
          connected_at: new Date().toISOString(),
          revoked_at: null,
          google_account_email: existing?.google_account_email ?? null,
        };

        const { data: saved, error: upsertError } = await admin
          .from('google_calendar_connections')
          .upsert(upsertRow, { onConflict: 'user_id' })
          .select('*')
          .single();
        if (upsertError) throw upsertError;

        let connection = saved as ConnectionRow;

        // Best-effort email from primary calendar id.
        if (!connection.google_account_email) {
          const email = await resolveGoogleAccountEmail(user.id, connection);
          if (email) {
            const { data: updated } = await admin
              .from('google_calendar_connections')
              .update({ google_account_email: email })
              .eq('user_id', user.id)
              .select('*')
              .single();
            if (updated) connection = updated as ConnectionRow;
          }
        }

        return json(toConnectionResponse(connection));
      }

      // ── PUT ──────────────────────────────────────────────────────────────
      case 'PUT': {
        if (route !== 'calendars') {
          return json({ error: 'Not found' }, 404);
        }

        const parsed = await readJsonBody(req);
        if (parsed.error) {
          return json(
            { error: parsed.error },
            parsed.error === 'Request too large' ? 413 : 400
          );
        }
        const body = parsed.body || {};
        if (!Array.isArray(body.selectedCalendarIds)) {
          return json(
            { error: 'Invalid selectedCalendarIds: expected string array' },
            400
          );
        }
        const selectedCalendarIds = body.selectedCalendarIds
          .filter((id: unknown) => typeof id === 'string' && id.trim())
          .map((id: string) => id.trim());

        const row = await loadConnection(user.id);
        if (!row) {
          return json({ error: 'Google Calendar not connected' }, 400);
        }
        if (row.revoked_at) {
          return json({ error: 'reconnect_required' }, 409);
        }

        const admin = getServiceRoleClient();
        const { data, error } = await admin
          .from('google_calendar_connections')
          .update({ selected_calendar_ids: selectedCalendarIds })
          .eq('user_id', user.id)
          .select('*')
          .single();
        if (error) throw error;
        return json(toConnectionResponse(data as ConnectionRow));
      }

      // ── DELETE ───────────────────────────────────────────────────────────
      case 'DELETE': {
        // DELETE /google-calendar — last segment is the function name.
        if (route !== 'google-calendar') {
          return json({ error: 'Not found' }, 404);
        }

        const row = await loadConnection(user.id);
        if (row) {
          // Best-effort revoke at Google. Prefer refresh_token so all grants die.
          const tokenToRevoke = row.refresh_token || row.access_token;
          if (tokenToRevoke) {
            try {
              const revokeBody = new URLSearchParams({ token: tokenToRevoke });
              const revokeRes = await fetch(GOOGLE_REVOKE_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: revokeBody.toString(),
              });
              // 200 = revoked; 400 often means already revoked — both fine.
              if (!revokeRes.ok && revokeRes.status !== 400) {
                console.error(
                  '[google-calendar] revoke failed',
                  revokeRes.status
                );
              }
            } catch {
              console.error('[google-calendar] revoke network error');
            }
          }

          const admin = getServiceRoleClient();
          const { error } = await admin
            .from('google_calendar_connections')
            .delete()
            .eq('user_id', user.id);
          if (error) throw error;
        }

        return json({ connected: false });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: corsHeaders,
        });
    }
  } catch (error: unknown) {
    if (error instanceof ReconnectRequiredError) {
      return json({ error: 'reconnect_required' }, 409);
    }
    return json({ error: publicErrorMessage(error) }, 500);
  }
});
