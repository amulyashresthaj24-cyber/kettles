# Supabase Auth Redirect URL Fix - Implementation Summary

## Changes Made

This update fixes Supabase auth email confirmation and other auth flows that were redirecting to localhost instead of the production app.

### 1. **Improved App URL Helper** (`src/lib/supabase.ts`)

Updated `getAppOrigin()` to prioritize:
1. `NEXT_PUBLIC_SITE_URL` (production domain)
2. `NEXT_PUBLIC_APP_URL` (fallback)
3. `window.location.origin` (auto-detect in browser)
4. `http://localhost:3000` (development default)

**Why**: Ensures email links, password reset links, and OAuth callbacks use the correct domain in production.

### 2. **Email Confirmation Redirect** (`src/lib/auth.tsx`)

Added `emailRedirectTo` option to `signUp()`:
```typescript
options: {
  data: metadata,
  emailRedirectTo: `${getAppOrigin()}/auth/callback`,
}
```

**Why**: When users click the email confirmation link, they're sent to `/auth/callback` instead of defaulting to localhost.

### 3. **Auth Callback Handler** (`src/app/auth/callback/page.tsx`)

New page that:
- Parses the auth code from URL
- Exchanges code for session using `exchangeCodeForSession(code)`
- Redirects to dashboard on success
- Shows helpful error messages on failure

**Why**: Supabase auth links need a page to exchange the code for a real session.

### 4. **Environment Variables** (`.env.example`)

Added configuration guidance:
```env
NEXT_PUBLIC_SITE_URL=https://kettles.works    # Use for production
NEXT_PUBLIC_APP_URL=http://localhost:3000     # Use for development
```

**Why**: Gives deployers clear instructions on what to set.

### 5. **Documentation**

Created two new guides:
- **`SUPABASE_URL_CONFIGURATION.md`** - Complete setup guide for Supabase URL settings
- **`SUPABASE_EMAIL_CONFIRMATION_SETUP.md`** - Guide for disabling email confirmation (separate from redirect fix)

## Files Changed

```
src/lib/supabase.ts                    - Updated getAppOrigin()
src/lib/auth.tsx                       - Added emailRedirectTo
src/app/auth/callback/page.tsx         - NEW: Auth code exchange handler
.env.example                           - Added NEXT_PUBLIC_SITE_URL
Docs/SUPABASE_URL_CONFIGURATION.md     - NEW: Setup guide
Docs/SUPABASE_EMAIL_CONFIRMATION_SETUP.md - Updated with checklist
```

## How It Works

### For Email Confirmation (when enabled in Supabase):

1. User signs up → `signUp()` called with `emailRedirectTo: https://kettles.works/auth/callback`
2. Supabase sends confirmation email with link to: `https://kettles.works/auth/callback?code=xxx`
3. User clicks link → Redirected to `/auth/callback`
4. Callback page exchanges code for session
5. User redirected to dashboard

### For No Email Confirmation:

1. User signs up → Session created immediately
2. User redirected to dashboard
3. No email step needed

### Local Development:

1. `NEXT_PUBLIC_APP_URL=http://localhost:3000`
2. Supabase sends links to: `http://localhost:3000/auth/callback`
3. Everything works locally

## Deployment Checklist

### Supabase Dashboard

- [ ] Go to **Authentication** → **URL Configuration**
- [ ] Update **Site URL**:
  - From: `http://localhost:3000`
  - To: `https://kettles.works`
- [ ] Add to **Redirect URLs**:
  - `https://kettles.works/auth/callback`
  - `https://kettles.works/dashboard`
  - `https://kettles.works/`
  - Keep localhost URLs for local dev:
    - `http://localhost:3000/auth/callback`
    - `http://localhost:3000/dashboard`
    - `http://localhost:3000/`
- [ ] Click **Save**

### Application Environment

For **production** (e.g., Vercel):
```
NEXT_PUBLIC_SITE_URL=https://kettles.works
NEXT_PUBLIC_APP_URL=https://kettles.works
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

For **development** (.env.local):
```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### Testing

1. **Local Dev**: Signup works, confirmation email links to localhost
2. **Production**: Signup works, confirmation email links to kettles.works
3. **No Confirmation**: User logs in immediately after signup
4. **With Confirmation**: User confirms email, then logs in

## Troubleshooting

### Email Links Still Go to Localhost

**Cause**: Supabase Site URL is still `http://localhost:3000`

**Fix**:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Change Site URL to `https://kettles.works`
3. Wait 1-2 minutes for propagation
4. Test with new signup

### "Invalid redirect URL" Error

**Cause**: The redirect URL in Supabase doesn't match the code

**Fix**:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Check that all Redirect URLs are in the list
3. Ensure they exactly match (HTTPS, no trailing slash variations)

### Callback Page Shows Spinner Forever

**Cause**: Auth code exchange failing

**Fix**:
1. Open DevTools Console (F12)
2. Look for error messages
3. Common causes:
   - Invalid Site URL in Supabase
   - Code parameter missing from URL
   - Code expired (more than 1 hour old)
   - Redirect URL not in Supabase allowlist

## Benefits

✅ Email confirmation emails redirect to production domain (not localhost)
✅ Password reset emails work in production (when implemented)
✅ OAuth callbacks use correct domain
✅ Local development still works with localhost
✅ Clearer error messages if auth fails
✅ Support for both email confirmation enabled and disabled

## Compatibility

- ✅ Does not remove email/password auth
- ✅ Does not remove signup/login
- ✅ Does not remove Supabase integration
- ✅ Does not break existing auth flows
- ✅ Backwards compatible with existing code
