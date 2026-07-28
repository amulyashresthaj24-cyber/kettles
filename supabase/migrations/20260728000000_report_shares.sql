-- Report shares: live client-facing report links
-- Tokens stored as digests only; public access via edge function (service role).

CREATE TABLE IF NOT EXISTS report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_digest TEXT NOT NULL UNIQUE,
    token_prefix TEXT NOT NULL,
    password_hash TEXT,
    password_salt TEXT,
    password_iters INTEGER,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    data JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_shares_user_id ON report_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_user_active
    ON report_shares(user_id)
    WHERE revoked_at IS NULL;

-- Viewer-session deduped view tracking (polling must not inflate counts)
CREATE TABLE IF NOT EXISTS report_share_views (
    share_id UUID NOT NULL REFERENCES report_shares(id) ON DELETE CASCADE,
    viewer_session_id TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (share_id, viewer_session_id)
);

CREATE INDEX IF NOT EXISTS idx_report_share_views_share_id ON report_share_views(share_id);

-- Report attribution uses ended_at; existing index is started_at only
CREATE INDEX IF NOT EXISTS idx_sessions_user_ended_at
    ON sessions(user_id, ended_at)
    WHERE ended_at IS NOT NULL;

ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_share_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can CRUD own report_shares"
    ON report_shares
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Views are written by service role from the edge function; owners can read counts
CREATE POLICY "Owners can read own report_share_views"
    ON report_share_views
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM report_shares s
            WHERE s.id = report_share_views.share_id
              AND s.user_id = auth.uid()
        )
    );

CREATE TRIGGER update_report_shares_updated_at
    BEFORE UPDATE ON report_shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Atomic upsert for viewer-session tracking; returns distinct view count + last_seen
CREATE OR REPLACE FUNCTION record_report_share_view(
    p_share_id UUID,
    p_viewer_session_id TEXT
)
RETURNS TABLE(view_count BIGINT, last_viewed_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_viewer_session_id IS NULL OR length(trim(p_viewer_session_id)) < 8 THEN
        RAISE EXCEPTION 'invalid viewer_session_id';
    END IF;

    INSERT INTO report_share_views (share_id, viewer_session_id, first_seen_at, last_seen_at)
    VALUES (p_share_id, p_viewer_session_id, NOW(), NOW())
    ON CONFLICT (share_id, viewer_session_id)
    DO UPDATE SET last_seen_at = NOW();

    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::BIGINT FROM report_share_views v WHERE v.share_id = p_share_id),
        (SELECT MAX(v.last_seen_at) FROM report_share_views v WHERE v.share_id = p_share_id);
END;
$$;

REVOKE ALL ON FUNCTION record_report_share_view(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_report_share_view(UUID, TEXT) TO service_role;
