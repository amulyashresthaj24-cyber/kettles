# Flowmate

Task-linked time tracking, project management, and analytics for solo workers and small teams.

## 🚀 Quick Links

- **[📚 Complete Documentation](./Docs/INDEX.md)** — Start here for guides, architecture, and references
- **[🏗️ Codebase Structure](./Docs/CODEBASE_STRUCTURE.md)** — Folder organization and quick navigation
- **[⚙️ Setup Guide](./Docs/SUPABASE_QUICKSTART.md)** — Get started in 5 minutes
- **[🚢 Deployment](./Docs/DEPLOYMENT_GUIDE.md)** — Production deployment checklist

## What is Flowmate?

Flowmate combines project management, task tracking, and time tracking into a unified workflow:

- **Projects** — Organize work by client and initiative
- **Tasks** — Break projects into actionable items
- **Kanban Board** — Visualize workflow (Todo → Doing → Done)
- **Timer** — Track time with Pomodoro-based sessions
- **Calendar** — View tasks across dates
- **Reports** — Weekly analytics and productivity insights

## Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Edge Functions)
- **State:** Zustand
- **UI:** Custom components + shadcn patterns
- **Icons:** Lucide React

## Documentation

All documentation is organized in the [`Docs/`](./Docs/) folder:

| Category | Documents |
|----------|-----------|
| **Getting Started** | [Overview](./Docs/CODEBASE_OVERVIEW.md), [Structure](./Docs/CODEBASE_STRUCTURE.md), [Guide](./Docs/CLAUDE.md) |
| **Backend** | [Supabase Setup](./Docs/SUPABASE_QUICKSTART.md), [Migration](./Docs/SUPABASE_MIGRATION_GUIDE.md), [Deploy](./Docs/DEPLOYMENT_GUIDE.md) |
| **Design** | [Visual System](./Docs/design.md), [Screens](./Docs/screens.md), [Database](./Docs/database.md) |
| **Architecture** | [Layout v2](./Docs/LAYOUT_ARCHITECTURE_V2.md), [Redesigns](./Docs/REDESIGN_SUMMARY.md) |

**→ [View Full Documentation Index](./Docs/INDEX.md)**

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

See [CODEBASE_STRUCTURE.md](./Docs/CODEBASE_STRUCTURE.md) for guidelines on:
- Where to add new features
- Component conventions
- State management patterns
- Code organization

## License

Private repository
