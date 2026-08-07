# Codebase Overview

This file used to hold a full architecture snapshot. It went stale — it described
a localStorage-only app with a lucide-react icon set, a `src/lib/store.ts` that no
longer exists, and a route table missing half the app. Rather than maintain a
second copy of the truth, the overview now lives next to the code:

| You want | Read |
|----------|------|
| Stack, key files, routes, store API, conventions | [`../CLAUDE.md`](../CLAUDE.md) |
| Product summary + design decisions | [`system.md`](system.md) |
| Database schema | [`database.md`](database.md) |
| Screen layouts and user flows | [`screens.md`](screens.md) |
| Edge function patterns | [`../supabase/functions/CLAUDE.md`](../supabase/functions/CLAUDE.md) |
| Deployment | [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) |

**Rule of thumb:** when a doc and the code disagree, the code is right. Fix the doc.
