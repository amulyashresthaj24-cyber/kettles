# Flowmate Folder Guide

This guide explains the intended folder structure for Flowmate without changing the current working app. The active web and desktop code still lives in the root `src/` and `src-tauri/` folders until each area is migrated safely.

## Current Active Folders

| Folder | Use |
| --- | --- |
| `src/app/` | Active Next.js routes for the web app and the Tauri-rendered desktop UI. |
| `src/components/` | Active React components used by the product screens. |
| `src/lib/` | Active shared logic: Supabase API helpers, Zustand store, sync engine, desktop bridge, dates, types, and formatting. |
| `src-tauri/` | Active Tauri desktop shell: native window, tray, shortcuts, notifications, idle detection, and bundling. |
| `extension/` | Chrome extension code — a thin remote control over the edge functions, not a second client. Scope and limits: [`extension/README.md`](../extension/README.md). Keep separate from the web and Tauri app unless a shared package is introduced. |
| `supabase/` | Database migrations and Supabase edge functions. |
| `Docs/` | Product, architecture, design, and implementation documentation. |

## Target Folder Direction

| Folder | Intended Use |
| --- | --- |
| `apps/web/` | Future Next.js web app shell. Web-only routes, metadata, deployment config, and browser-specific setup should live here after migration. |
| `apps/desktop/` | Future Tauri desktop app shell. Desktop-only routes, window shell, tray/shortcut bridge, mini timer shell, and native packaging should live here after migration. |
| `packages/core/` | Shared pure TypeScript logic: types, constants, date helpers, formatting, and domain utilities. This package should not import React, Next.js, Supabase, or Tauri. |
| `packages/data/` | Shared data layer: Zustand store, Supabase API clients, sync engine, storage adapters, and future offline-first logic. |
| `packages/ui/` | Shared design system: UI primitives, layout components, icons, CSS variables, and reusable product components. |

## Migration Rule

Do not move active files into `apps/` or `packages/` in one large pass. Move one small layer at a time and keep compatibility re-exports from the old path until all imports are updated.

Safe first moves:

1. `src/lib/types.ts` to `packages/core/src/types.ts`
2. `src/lib/format.ts` to `packages/core/src/format.ts`
3. `src/lib/task-dates.ts` to `packages/core/src/task-dates.ts`
4. `src/lib/constants.ts` to `packages/core/src/constants.ts`

Riskier later moves:

1. `src/lib/store-supabase.ts`
2. `src/lib/sync-engine.ts`
3. `src/components/AppShell.tsx`
4. `src/components/DesktopShell.tsx`
5. `src/app/mini-timer/`
6. `src-tauri/`

## AI Prompt Guide

Use this prompt when asking an AI agent to work in this repo:

```text
You are working in Flowmate. Do not break the existing app.

Current active app code lives in:
- src/app for Next.js routes
- src/components for React UI
- src/lib for active app logic and store
- src-tauri for the active Tauri desktop shell
- extension for the Chrome extension
- supabase for database and edge functions

The future structure is:
- apps/web for the web app shell
- apps/desktop for the desktop app shell
- packages/core for pure shared domain helpers
- packages/data for store, sync, Supabase, and storage adapters
- packages/ui for shared UI, icons, layout, and design tokens

Do not move many files at once. Prefer a phased migration:
1. Add or update docs first.
2. Extract pure shared files before app shells.
3. Keep compatibility re-exports from old paths.
4. Run npm run build after each meaningful move.
5. Only touch src-tauri or desktop bridge files when the task is explicitly desktop-related.
```

