# Supabase Edge Functions — Claude Guide

  ## Structure
```
supabase/functions/
  _shared/
    cors.ts        # corsHeaders + handleCors(req)
    supabase.ts    # getSupabaseClient(req) — auth-aware client; getServiceRoleClient()
    validators.ts  # validateUUID, validateRequired, sanitizeData, formatEntityResponse
  projects/index.ts
  tasks/index.ts
  sessions/index.ts
  clients/index.ts
  analytics/index.ts
  report-shares/index.ts  # owner CRUD + public POST /view (verify_jwt=false)
```

## Pattern (every function)
```typescript
serve(async (req) => {
  const corsResponse = handleCors(req);          // 1. CORS preflight
  if (corsResponse) return corsResponse;

  const supabase = getSupabaseClient(req);        // 2. Auth-aware client
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 401;                          // 3. Auth guard

  // 4. Route on req.method + URL path
  // 5. Return JSON with corsHeaders
});
```

## Conventions
- Money fields (`hourlyRate`, `budget`): run bodies through `normalizeMoneyFields()`, merge with `mergeEntityData()` so an explicit `null` clears the key, and read rates with `rateDollars()` / `budgetDollars()` (they convert `*_cents` columns). Rate precedence is project → client → none.
- All responses: `{ ...corsHeaders, 'Content-Type': 'application/json' }`
- ID from URL: `pathParts[pathParts.length - 1]` — always validate with `validateUUID()`
- RLS enforced by Supabase — always filter by `user_id` anyway as defense-in-depth
- Deno runtime — use `https://deno.land/std@0.168.0/` imports, not npm

## Deploy
```bash
supabase functions deploy <function-name>
```
