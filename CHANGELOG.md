# Changelog

## [1.1.0] - 2026-08-13

Production web + desktop release. Google sign-in is the login path. Calendar overlay stays off until Google brand verification.

### Added

- Sign in with Google (OpenID email/profile only). PKCE so the auth code exchange works on the web callback.
- Public Privacy Policy and Terms of Service, plus OAuth homepage data-use copy.
- Preferences sync across devices, without resetting people who already have settings.
- Google Calendar read-only overlay is built, then parked. Settings explains why. Sign-in is a separate Google client.
- Landing art, FAQ, and legal footer. Dead social and placeholder links removed.
- App-level error boundaries so a render crash does not white-screen the whole app.

### Changed

- Pet overlay atlas, speech hook (`#speechStack`), and desktop overlay window.
- Calendar week cells keep Google and local events in the same lane when overlay is on.
- Auth callback: cancel and provider errors return to `/auth` with a readable message. StrictMode does not burn the one-time code.

### Fixed

- Preference backfill no longer overwrites existing users.
- Landing claims that were not backed by the product.
- One `user_profiles` row per user.
- Edge APIs hardened. Next.js upgraded.

### Parked

- Google Calendar connect/select UI. Needs `calendar.readonly` brand verification. Flip `GOOGLE_CALENDAR_ENABLED` and restore Settings connect UI when Google approves.
