-- Move user preferences into the database so they follow a user across devices.
--
-- Before this, preferences lived only in localStorage (Zustand persist), while
-- onboarding wrote default_focus_duration to its own column that nothing read.
-- Two homes for one value: a user picked "45 minutes" during onboarding, it
-- landed in Postgres, and the timer kept using the local default of 0.
--
-- One JSONB blob rather than a column per setting: the set is 14 fields, over
-- half of them cosmetic (mascot, pet reminders, alarm sound), and would
-- otherwise need a migration per toggle.

ALTER TABLE user_profiles
    ADD COLUMN preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Last-write-wins clock for cross-device reconciliation.
    ADD COLUMN preferences_updated_at TIMESTAMPTZ;

-- Carry the one preference that was already persisted into the blob, so users
-- who completed onboarding keep the focus duration they chose.
UPDATE user_profiles
SET preferences = jsonb_build_object('defaultFocusDuration', default_focus_duration),
    preferences_updated_at = COALESCE(updated_at, created_at, now())
WHERE default_focus_duration IS NOT NULL;

-- Drop the old column rather than leaving both. Two homes for one value is the
-- defect being fixed here, so the fix has to end with exactly one.
ALTER TABLE user_profiles
    DROP COLUMN default_focus_duration;
