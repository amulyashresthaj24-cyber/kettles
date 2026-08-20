# Changelog

## [1.1.1] - 2026-08-20

Search and share polish, plus a CI gate on the web channel.

### Added

- `robots.txt` and `sitemap.xml` (both were 404 in production). App routes and token-gated share links are disallowed; landing and legal pages are indexable.
- Open Graph and Twitter card metadata, so shared links render a title, description, and dashboard preview instead of a bare URL.
- `.github/workflows/ci.yml` — lint, tests, version check, and a production build now gate every push and PR to `main`. Pushing to `main` auto-deploys to Vercel, and until now nothing checked it.

### Changed

- Site origin resolution moved to `src/lib/site-url.ts` and now reads `NEXT_PUBLIC_SITE_URL` first — the variable CI and `Docs/release.md` already set, which the root layout previously ignored. Always resolves to a public origin, so a dev `localhost` value can never leak into shipped metadata.
- QA screenshots (`.qa-*.png`) untracked from the repo root and gitignored.

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
