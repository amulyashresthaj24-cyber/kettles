# Kettles Companion Extension

Manifest V3 Chrome extension for lightweight Kettles focus awareness.

## What it does

- Shows the current active Kettles session in the popup.
- Shows the active task, project, billable/internal status, and task/project tags.
- Shows all current task/project tags and lets you add a new tag to the active task.
- Opens Kettles timer, tasks, and current project pages.
- Sends local Chrome notifications for:
  - long-running sessions
  - no active session during configured work hours
  - active task tags outside selected working tags

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

The extension reads the existing Supabase browser session from that active Kettles tab and stores the access token in Chrome local extension storage. It does not edit tasks, projects, or sessions in V1.

## Settings

Open extension settings to configure:

- Kettles app URL
- notification toggles
- reminder interval
- workday start/end
- selected working tags

The extension UI is dark-only for now and follows the Kettles design system: tonal surfaces, blue accent, compact task-first layout, and the fan brand mark.

Reminder scheduling is local to Chrome using `chrome.alarms`.
