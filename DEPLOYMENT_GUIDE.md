# Flowmate Supabase Deployment Guide

Your complete backend is ready to deploy!

## Files Created

### Database & Edge Functions
- `supabase/migrations/20250501000000_initial_schema.sql` - PostgreSQL schema with JSONB
- `supabase/config.toml` - Supabase configuration
- `supabase/functions/_shared/` - Shared utilities (supabase client, CORS, validators)
- `supabase/functions/clients/index.ts` - Clients CRUD
- `supabase/functions/projects/index.ts` - Projects CRUD
- `supabase/functions/tasks/index.ts` - Tasks CRUD
- `supabase/functions/sessions/index.ts` - Sessions CRUD
- `supabase/functions/analytics/index.ts` - Dashboard & reporting

### Frontend Integration
- `src/lib/supabase.ts` - Supabase client + API helpers
- `src/lib/store-supabase.ts` - Updated Zustand store
- `src/lib/auth.tsx` - Auth provider component

### Migration & Config
- `.env.example` - Environment variables template
- `scripts/migrate-data.ts` - Data migration from JSON to Supabase

---

## Deployment Steps

### Step 1: Create .env.local

Copy `.env.example` to `.env.local` (already done):

```env
NEXT_PUBLIC_SUPABASE_URL=https://jrbsqkjryjjqyoeifiqd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyYnNxa2pyeWpqcXlvZWlmaXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTI1ODIsImV4cCI6MjA5MzE4ODU4Mn0.hZ922mXACmwgfT2ykCv-nSE6jTOotSK82dPuReBMJn4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyYnNxa2pyeWpqcXlvZWlmaXFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYxMjU4MiwiZXhwIjoyMDkzMTg4NTgyfQ.ZIZlUrInWKhR6x-UIzxezbjm2pVoU4BcZ5UfCVGTiCA
SUPABASE_PROJECT_ID=jrbsqkjryjjqyoeifiqd
```

### Step 2: Install Supabase CLI

**Windows (Winget - Recommended):**
```bash
winget install Supabase.CLI
```

**macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

Then login:
```bash
supabase login
```

### Step 3: Link Project

```bash
supabase link --project-ref jrbsqkjryjjqyoeifiqd
```

### Step 4: Deploy Database Schema

```bash
supabase db push
```

This creates:
- 5 tables: `users`, `clients`, `projects`, `tasks`, `sessions`
- JSONB columns for flexible data
- All indexes for performance
- Row Level Security (RLS) policies
- Auto-triggers for `updated_at`

### Step 5: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy clients
supabase functions deploy projects
supabase functions deploy tasks
supabase functions deploy sessions
supabase functions deploy analytics

# Set secrets (SUPABASE_URL and SUPABASE_ANON_KEY are auto-provided)
npx supabase@latest secrets set SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyYnNxa2pyeWpqcXlvZWlmaXFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYxMjU4MiwiZXhwIjoyMDkzMTg4NTgyfQ.ZIZlUrInWKhR6x-UIzxezbjm2pVoU4BcZ5UfCVGTiCA
```

### Step 6: Update Layout.tsx ✅

`src/app/layout.tsx` now wraps the app with AuthProvider:

```tsx
import { AuthProvider } from "@/lib/auth";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Step 7: Create .env.local

Copy the environment file:

```bash
copy .env.example .env.local
```

### Step 8: Update Component Imports ✅

All components now import from `store-supabase` instead of `store`. The store API remains the same, but data now persists to Supabase.

### Step 9: Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000` with Supabase backend.

### Step 7: Migrate Data (Optional)

To import existing `data.json`:

```bash
npx ts-node scripts/migrate-data.ts
```

This will:
1. Create a user account
2. Import all clients, projects, tasks, sessions
3. Preserve IDs and relationships

---

## API Endpoints

Once deployed, your Edge Functions are available at:

| Endpoint | Description |
|----------|-------------|
| `https://jrbsqkjryjjqyoeifiqd.supabase.co/functions/v1/clients` | CRUD clients |
| `https://jrbsqkjryjjqyoeifiqd.supabase.co/functions/v1/projects` | CRUD projects |
| `https://jrbsqkjryjjqyoeifiqd.supabase.co/functions/v1/tasks` | CRUD tasks |
| `https://jrbsqkjryjjqyoeifiqd.supabase.co/functions/v1/sessions` | CRUD sessions |
| `https://jrbsqkjryjjqyoeifiqd.supabase.co/functions/v1/analytics?type=dashboard` | Dashboard stats |
| `https://jrbsqkjryjjqyoeifiqd.supabase.co/functions/v1/analytics?type=projects` | Project breakdown |

---

## Testing Your Setup

### 1. Create a Test User
Go to Supabase Dashboard → Authentication → Users → Invite user

Or use the signup form in your app after updating the store import.

### 2. Test Edge Function
```bash
curl -X POST \
  https://jrbsqkjryjjqyoeifiqd.supabase.co/functions/v1/clients \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Client", "email": "test@test.com"}'
```

### 3. Verify Data in Dashboard
Supabase Dashboard → Table Editor → clients table

---

## Next Steps

After deployment, update your components to use the new store:

```tsx
// Instead of:
import { useApp } from "@/lib/store";

// Use:
import { useApp } from "@/lib/store-supabase";
```

The store API remains the same, but now persists to Supabase!

---

## Troubleshooting

**Function deployment fails:**
```bash
# Check function status
supabase functions list

# View logs
supabase functions logs clients
```

**Database push fails:**
```bash
# Reset and try again
supabase db reset
supabase db push
```

**CORS errors:**
- Functions already include CORS headers
- Check your site's origin is allowed in Supabase Dashboard → API → URL configuration

---

## Architecture Summary

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  Next.js App    │────▶│  Supabase Edge     │────▶│  PostgreSQL     │
│  (Frontend)     │◀────│  Functions (Deno)   │◀────│  (JSONB)        │
│                 │     │                     │     │                 │
│ - useApp()      │     │ - clients           │     │ - clients       │
│ - AuthProvider  │     │ - projects          │     │ - projects      │
│ - api.*         │     │ - tasks             │     │ - tasks         │
│                 │     │ - sessions          │     │ - sessions      │
│                 │     │ - analytics         │     │ - users         │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
         │                                                     │
         └─────────────────► Auth (JWT) ◀──────────────────────┘
```

Your Flowmate app is now a true full-stack application with Supabase backend!
