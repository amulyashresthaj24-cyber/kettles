# Flowmate

Task-linked time tracking, project management, and analytics for solo workers and small teams.

## ≡ƒÜÇ Quick Links

- **[≡ƒôû Development Guide](./CLAUDE.md)** ΓÇö Stack, key files, routes, store API, conventions
- **[≡ƒº¡ Product Summary](./Docs/system.md)** ΓÇö Problem, wedge, locked decisions
- **[≡ƒÄ¿ Design System](./Docs/design.md)** ΓÇö Tokens, typography, components
- **[≡ƒÜó Releasing](./Docs/release.md)** ΓÇö Web + desktop release channels

## What is Flowmate?

Flowmate combines project management, task tracking, and time tracking into a unified workflow:

- **Projects** ΓÇö Organize work by client and initiative
- **Tasks** ΓÇö Break projects into actionable items
- **Kanban Board** ΓÇö Visualize workflow (Todo ΓåÆ Doing ΓåÆ Done)
- **Timer** ΓÇö Track time with Pomodoro-based sessions
- **Calendar** ΓÇö View tasks across dates
- **Reports** ΓÇö Weekly analytics and productivity insights

## Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Edge Functions)
- **State:** Zustand
- **UI:** Custom components + shadcn patterns
- **Icons:** Custom SVG components (`src/components/ui/icon.tsx`)
- **Desktop:** Tauri (Windows)

## Documentation

| Document | What it covers |
|----------|----------------|
| [CLAUDE.md](./CLAUDE.md) | Stack, key files, routes, store API, conventions |
| [Docs/system.md](./Docs/system.md) | Product summary and locked product decisions |
| [Docs/design.md](./Docs/design.md) | Design system ΓÇö tokens, type scale, motion |
| [Docs/LAYOUT_TOKEN_REFERENCE.md](./Docs/LAYOUT_TOKEN_REFERENCE.md) | Layout components and spacing tokens |
| [Docs/agent-tracking-plan.md](./Docs/agent-tracking-plan.md) | AI agent tracking spec ΓÇö idle detection, agent bridge |
| [Docs/agent-hooks.md](./Docs/agent-hooks.md) | Agent bridge hook wiring |
| [Docs/release.md](./Docs/release.md) | Web + desktop release channels |
| [Docs/pet-mascot-kit.md](./Docs/pet-mascot-kit.md) | Pet sprite contract and asset pipeline |
| [Docs/marketing/](./Docs/marketing/) | GTM plan, landing PRD, brand assets, build brief |
| [supabase/functions/CLAUDE.md](./supabase/functions/CLAUDE.md) | Edge function patterns |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to begin.

## Contributing

See [CLAUDE.md](./CLAUDE.md) for conventions: where features go, component patterns,
state access via `useApp()`, token and icon rules.

## License

Private repository
