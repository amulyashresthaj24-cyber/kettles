# Flowmate Stable Desktop Release

Flowmate's stable desktop build is the installed Windows app produced by the active Tauri shell in `src-tauri`. It should not require `npm run dev` or a local Next.js server after installation.

## Current Version

- App version: `0.1.0`
- Source of truth: `package.json`
- Required to match: `package-lock.json` and `src-tauri/tauri.conf.json`

Run this before any desktop release:

```powershell
node .\scripts\check-stable-version.mjs
```

## Stable Build

Use the stable release script from the repo root:

```powershell
npm run release:stable-desktop
```

If the global npm wrapper is broken on this Windows machine, run the script directly:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-stable-desktop.ps1
```

The script validates version alignment, the Next.js production export, TypeScript, the Tauri Rust project, and the Windows installer build. It copies generated installers into:

```text
releases\stable-desktop
```

## Release Checklist

- `package.json`, `package-lock.json`, and `src-tauri/tauri.conf.json` have the same version.
- `node .\node_modules\next\dist\bin\next build` passes.
- `node .\node_modules\typescript\bin\tsc --noEmit` passes after `.next/types` is generated.
- `cargo check` passes in `src-tauri`.
- `tauri build` creates the Windows installer.
- Installed app opens from the Start Menu or desktop shortcut.
- Auth, dashboard, tasks, projects, timer, report, settings, mini mode, and pet mode work.
- Mascot selection persists after app restart.

## Windows Notes

Close any running `flowmate-desktop.exe` before building installers. The stable build script checks for this and stops before bundling if the release executable is locked.
