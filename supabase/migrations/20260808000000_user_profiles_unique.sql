-- Collapse duplicate user_profiles rows and enforce one profile per user.
--
-- Bug this fixes: onboarding called .upsert({ user_id, ... }) with no onConflict
-- target. PostgREST then defaults the conflict target to the primary key (id),
-- which is generated fresh on every insert, so each "upsert" INSERTed a new row
-- instead of updating the existing one. A single onboarding run wrote two rows.
-- The /onboarding guard read the profile back with .single(), which errors when
-- more than one row matches, so onboarding_completed never read back as true and
-- completed users were sent through onboarding again on every visit.

-- 1) Merge each user's rows into their best row, then drop the rest.
--    Data-modifying CTEs share one snapshot, so the DELETE (rn > 1) and the
--    UPDATE (rn = 1) see the same ranking and cannot disagree about the keeper.
WITH ranked AS (
    SELECT
        id,
        user_id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY
                (onboarding_completed IS TRUE) DESC,
                onboarding_completed_at DESC NULLS LAST,
                updated_at DESC NULLS LAST,
                created_at DESC NULLS LAST,
                id
        ) AS rn
    FROM user_profiles
),
merged AS (
    -- Newest non-null value wins per column, so a field set on an earlier row is
    -- never lost to a later row that left it null. FILTER drops the null rows
    -- before aggregating; if every row is null, array_agg yields NULL and the
    -- [1] subscript stays NULL. The trailing `p.id` breaks updated_at ties so a
    -- rerun on the same data picks the same value.
    SELECT
        k.id AS keep_id,
        (ARRAY_AGG(p.full_name ORDER BY p.updated_at DESC NULLS LAST, p.id)
            FILTER (WHERE p.full_name IS NOT NULL))[1] AS full_name,
        (ARRAY_AGG(p.avatar_url ORDER BY p.updated_at DESC NULLS LAST, p.id)
            FILTER (WHERE p.avatar_url IS NOT NULL))[1] AS avatar_url,
        (ARRAY_AGG(p.default_focus_duration ORDER BY p.updated_at DESC NULLS LAST, p.id)
            FILTER (WHERE p.default_focus_duration IS NOT NULL))[1] AS default_focus_duration,
        BOOL_OR(COALESCE(p.onboarding_completed, FALSE)) AS onboarding_completed,
        MIN(p.onboarding_completed_at) AS onboarding_completed_at,
        MIN(p.created_at) AS created_at
    FROM ranked k
    JOIN user_profiles p ON p.user_id = k.user_id
    WHERE k.rn = 1
    GROUP BY k.id
),
deleted AS (
    DELETE FROM user_profiles
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    RETURNING id
)
UPDATE user_profiles up
SET
    full_name              = m.full_name,
    avatar_url             = m.avatar_url,
    default_focus_duration = m.default_focus_duration,
    onboarding_completed   = m.onboarding_completed,
    onboarding_completed_at = m.onboarding_completed_at,
    created_at             = m.created_at
FROM merged m
WHERE up.id = m.keep_id;

-- 2) One profile per user. This is what upsert(..., { onConflict: "user_id" })
--    needs in order to update instead of insert.
ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);

-- 3) The unique constraint creates its own index on user_id, so the plain
--    lookup index from 20250503000000 is now redundant.
DROP INDEX IF EXISTS idx_user_profiles_user_id;
