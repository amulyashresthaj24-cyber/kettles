# Kettles Companion Extension

Manifest V3 Chrome extension. Version 0.1.0, unpacked only — not on the Chrome Web Store.

## What this is

A **remote control and awareness surface** for a Kettles account you are already signed into somewhere else. It borrows the browser session from an open Kettles tab and talks to the Kettles edge functions directly.

It is deliberately not a second Kettles client. It has no local store, no offline queue, no sync engine, and no cache — every popup open refetches tasks, projects, and sessions. If the network is down, the popup shows an error rather than a stale workspace.

**Use the web app or the desktop app for real work.** The extension covers the case where you are working in the browser, away from Kettles, and want to see or nudge the timer without switching tabs.

| | Extension | Web app | Desktop app |
|---|---|---|---|
| Timer control | start / pause / resume / end | full | full + mini-timer window |
| Task + project editing | tags only | full | full |
| Notes | one note slot per session | full | full |
| Offline | none | sync engine | sync engine |
| Reminders | local Chrome notifications | in-app | in-app + OS |

## What it does

Read:

- Current active session, elapsed time, and state.
- Active task, project, billable/internal status, and task/project tags.
- All tags across your tasks and projects.

Write:

- Start a session on a selected project, pause, resume, and end it.
- Add a tag to the active task.
- Save a single working note on the active session. The extension owns exactly one note slot and overwrites it each save — it does not append to your note history.

Notify — local Chrome notifications for:

- long-running sessions
- no active session during configured work hours
- active task tags outside your selected working tags

## Load locally

1. Open Chrome and go to `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this `extension` folder.

## Connect to Kettles

1. Open Kettles in a Chrome tab.
2. Sign in to Kettles.
3. Open the extension popup.
4. Click `Connect from Kettles tab`.

The extension runs a one-shot script in that tab, reads the Supabase `sb-*-auth-token` entry out of `localStorage`, and stores the **access token** in `chrome.storage.local`.

## Known limits

These are current V1 boundaries, not bugs to be surprised by:

- **Localhost only.** `host_permissions` in `manifest.json` covers `http://localhost:3000/*` and `https://*.supabase.co/*`. Pointing the extension at a deployed Kettles origin requires adding that origin to the manifest and reloading the extension. Changing only the app URL in settings is not enough.
- **No token refresh.** Only the access token is stored — not the refresh token. `connect.js` reads `expires_at` but nothing persists or checks it. When the token expires, requests start returning 401 and you get a "Kettles needs reconnecting" notification. Reconnecting from a signed-in tab is the only recovery.
- **Token at rest.** `chrome.storage.local` is not encrypted. Anything with access to the Chrome profile can read the token until it expires. Treat this as you would a session cookie.
- **Reminders drift.** Scheduling is local via `chrome.alarms`, clamped to a 5-minute minimum (default 25). Chrome throttles alarms for suspended service workers, so reminders are approximate, not scheduled events.
- **Each reminder tick costs three requests.** `runReminderCheck` fetches tasks, projects, and sessions in full on every fire. There is no delta endpoint.
- **Dark only.** The popup and options pages do not follow the Kettles light theme.
- **No conflict handling.** Session writes are last-write-wins against the server. Ending a session in the extension while the desktop app has the same session open will produce whichever write lands second.

## Settings

Open extension settings to configure:

- Kettles app URL
- notification toggles
- reminder interval
- workday start/end
- selected working tags

The extension UI follows the Kettles design system: tonal surfaces, blue accent, compact task-first layout, and the fan brand mark.
