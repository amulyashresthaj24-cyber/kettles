# Changelog

## [Unreleased]

## [1.1.3] - 2026-09-22

Desktop update that actually offers updates in the app.

### Added

- **Check for updates** in Settings → Timer & Theme, showing the installed version.

### Fixed

- The tray **Check for Updates…** item and the launch update check never ran — `DesktopUpdatePrompt` existed but was not mounted. Updates are offered (not force-installed) so a running timer is not killed.

## [1.1.2] - 2026-09-21

Desktop production release of work that landed on web after 1.1.1: billed-through invoicing, opt-in app-usage tracking, timer correctness, AI attribution, and budget alerts.

### Added

- **Billed-through date on projects.** Sessions that ended on or before the cutoff count as invoiced; later ones stay open. Reports can filter billed vs unbilled, and the date ships in PDF/Excel exports.
- **Opt-in desktop app-usage tracking.** While a timer is running, the shell can record the focused app locally. Off by default, never billed, shown on `/report` on desktop.
- **AI-assisted time attribution (agent tracking M3).** Sessions now report how much of their duration had an agent running, derived from `agentSegments`. Concurrent agents are merged into a single supervised stretch rather than counted twice, and the figure is clamped to the session's billed duration. Shows as an "AI-Assisted" KPI on `/report` and in the PDF and Excel exports, both only when an agent actually ran.
- Shared report links can disclose the AI-assisted split via a new `showAgentSplit` option, **off by default** — the payload carries no agent segments unless the owner opts in.
- **Dashboard budget alerts.** Projects at 80% or over surface as a banner on the dashboard (nothing renders while every budget is healthy). Uses the same lifetime health helpers as the project `BillingPanel` — 80% warning, 100% over — so the two surfaces cannot disagree. Archived projects are excluded.
- Session lifecycle test coverage (`store-sessions.test.ts`).

### Changed

- Self-hosted Urbanist + Geist Mono via `next/font`.
- Landing hero, bento, and privacy section polish.
- The report's "Budget Used %" divides *period* earnings by the *lifetime* budget, so a week-long filter made a nearly-spent budget look untouched. Relabelled "Budget (period)" in the table and "Budget Used % (this period)" in the Excel export. Budget health proper lives on the project page and now also on the dashboard when a budget needs attention.
- `GOOGLE_CALENDAR_ENABLED` reads `NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED` instead of being hardcoded. Still off unless explicitly set.

### Fixed

- **Resuming a session could bill time that was never worked.** `resumeSession` overwrote `startedAt` and left an older `resumedAt` from idle recovery in place. Resume now stamps `resumedAt` and leaves `startedAt` immutable.
- Rows already carrying a stale `resumedAt` are repaired on load and on rehydrate (`repairStaleResumedAt`).
- New sessions were never stamped with `timelineVersion`. `startSession` and `startDraftSession` now stamp the current version.
- **The timer was unusable offline.** Start, pause, resume, finish, stop, confirm and save-as-draft now route through `persistSessionPatch`, queueing to the sync engine when offline.
- Stopping a local-only or offline session left the row `running` with no `endedAt`.
- `freezeStaleRunning` measured staleness from `startedAt` rather than the current running stretch.
- Pet overlay glyphs, atlas previews, and keyboard focus.
- The share-link password is held in memory now; earlier `sessionStorage` values are cleared on load.

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
