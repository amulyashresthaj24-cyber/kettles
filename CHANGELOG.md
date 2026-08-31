# Changelog

## [Unreleased]

## [1.1.2] - 2026-08-31

Session-timer correctness, offline persistence, AI attribution in reports, and dashboard budget alerts. Lifetime budget health on the project page (80% warning bar, share replace/export) already landed in PR #3; this branch keeps that live `BillingPanel` and adds dashboard banners on the same thresholds.

### Fixed

- **Resuming a session could bill time that was never worked.** `resumeSession` overwrote `startedAt` and left an older `resumedAt` from idle recovery in place. Elapsed is measured from `resumedAt`, so every pause after an idle recovery re-counted the whole stretch since that stamp — a 20-minute break added 20 minutes to the bill. Resume now stamps `resumedAt` and leaves `startedAt` immutable, which is what `session-timeline.ts` specified all along.
- Rows already carrying a stale `resumedAt` are repaired on load and on rehydrate (`repairStaleResumedAt`).
- New sessions were never stamped with `timelineVersion`, so every one of them looked like a legacy row and got run through the report layer's `reconcileSessionBounds` heuristic. `startSession` and `startDraftSession` now stamp the current version.
- **The timer was unusable offline.** Start, pause, resume, finish, stop, confirm and save-as-draft all called the edge function directly with no offline branch, and committed local state only *after* the await — so a failed call discarded the change and left the timer running. All of them now route through `persistSessionPatch`, queueing to the sync engine when offline.
- Stopping a local-only or offline session left the row `running` with no `endedAt`, so it was re-adopted as the active session on the next load and kept counting through the downtime.
- `freezeStaleRunning` measured staleness from `startedAt` rather than the current running stretch, freezing sessions that had just been resumed, and truncated `durationSeconds` to the 4-hour cap — discarding real banked work. It now measures the stretch and caps only that.
- The share-link password was written to `sessionStorage`. It unlocks a client's billing figures and is only needed for the life of the view, so it is held in memory now; earlier stored values are cleared on load.

### Added

- **AI-assisted time attribution (agent tracking M3).** Sessions now report how much of their duration had an agent running, derived from `agentSegments`. Concurrent agents are merged into a single supervised stretch rather than counted twice, and the figure is clamped to the session's billed duration. Shows as an "AI-Assisted" KPI on `/report` and in the PDF and Excel exports, both only when an agent actually ran.
- Shared report links can disclose the AI-assisted split via a new `showAgentSplit` option, **off by default** — the payload carries no agent segments unless the owner opts in.
- Session lifecycle test coverage (`store-sessions.test.ts`). The store held the timer's money math and had none; the resume bug above shipped undetected because of it.
- **Dashboard budget alerts.** Projects at 80% or over surface as a banner on the dashboard (nothing renders while every budget is healthy). Uses the same lifetime health helpers as the project `BillingPanel` — 80% warning, 100% over — so the two surfaces cannot disagree. Archived projects are excluded.
- **Desktop pet builds and runs on Linux for local development.** The pet overlay module's Win32-only cursor/screen calls (`GetCursorPos`, `GetSystemMetrics`) are guarded behind `#[cfg(target_os = "windows")]` with fallbacks, overlay click-through is deferred until the window is shown on non-Windows (avoiding a `tao` panic), and an X11 `XQueryPointer` path lets the mascot follow the cursor on Linux. Windows behavior is byte-identical; this only unblocks building/running the Tauri app on Linux (e.g. cloud dev environments).

### Changed

- The report's "Budget Used %" divides *period* earnings by the *lifetime* budget, so a week-long filter made a nearly-spent budget look untouched. The figure is still useful as period spend against budget, so it stays — relabelled "Budget (period)" in the table and "Budget Used % (this period)" in the Excel export. Budget health proper lives on the project page (PR #3) and now also on the dashboard when a budget needs attention.
- `GOOGLE_CALENDAR_ENABLED` reads `NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED` instead of being hardcoded, so the calendar overlay can be switched on when Google brand verification lands without a code change. Still off unless explicitly set.

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
