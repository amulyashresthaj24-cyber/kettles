-- Google Calendar read-only overlay: server-side token storage.
--
-- Why a separate table and a separate OAuth flow rather than reusing the
-- Supabase Google sign-in:
--
--   1. supabase.auth.signInWithOAuth() returns provider_token /
--      provider_refresh_token on the sign-in response only. Supabase does not
--      persist them and never refreshes them — TOKEN_REFRESHED rotates the
--      Supabase JWT, not the Google one. src/app/auth/callback/page.tsx calls
--      exchangeCodeForSession and drops both tokens on the floor.
--   2. Google access tokens last ~1 hour, so a provider_token is dead by the
--      next page load. There is no recovery path from the client.
--   3. Existing signed-in users never re-run OAuth, so adding a scope to the
--      sign-in call would silently do nothing for them. Email/password users
--      (auth.tsx signInWithPassword) never get a provider token at all.
--
-- So: our own consent flow with access_type=offline, the refresh token stored
-- here, and access tokens minted server-side on demand.

CREATE TABLE google_calendar_connections (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Long-lived. Google issues this once, only when the consent screen is
    -- shown with access_type=offline + prompt=consent.
    --
    -- Nullable on purpose: when Google reports invalid_grant the token is dead,
    -- and keeping a dead credential at rest buys nothing. Revocation nulls it
    -- and stamps revoked_at, which is what the UI reads. NOT NULL here would
    -- force us to retain a useless secret just to keep the row.
    refresh_token TEXT,
    -- Short-lived (~1h) cache so a page load does not always cost a refresh
    -- round-trip. Safe to be null; the edge function re-mints on demand.
    access_token TEXT,
    access_token_expires_at TIMESTAMPTZ,
    -- Space-separated scopes actually granted. Google may grant fewer than
    -- requested, so record what we got rather than what we asked for.
    granted_scopes TEXT NOT NULL DEFAULT '',
    -- Which calendars the user chose to overlay. Empty = primary only.
    selected_calendar_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    google_account_email TEXT,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Set when Google returns invalid_grant (user revoked access from their
    -- Google account settings). Keeps the row so the UI can say "reconnect"
    -- instead of silently showing nothing.
    revoked_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS on with DELIBERATELY NO POLICIES.
--
-- Postgres denies by default when RLS is enabled and no policy matches, so
-- `authenticated` and `anon` cannot read this table at all — not even their own
-- row. That is the point: refresh_token must never reach a browser, and RLS is
-- row-level, not column-level, so "let users read their own row minus the
-- token" is not expressible here.
--
-- service_role bypasses RLS, so only the google-calendar edge function touches
-- this. The client learns connection status from that function's response.
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON google_calendar_connections FROM anon, authenticated;

CREATE TRIGGER update_google_calendar_connections_updated_at
    BEFORE UPDATE ON google_calendar_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
