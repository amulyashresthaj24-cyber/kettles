# Supabase URL Configuration Setup

This guide explains how to configure Supabase authentication URLs for your Kettles app, ensuring that email confirmation links, password reset links, and OAuth callbacks work correctly in both development and production.

## Overview

Supabase needs to know:
- **Site URL**: The primary URL where your app is hosted (used for email links)
- **Redirect URLs**: All URLs where auth callbacks should be accepted

Misconfigured URLs cause:
- ❌ Email confirmation links redirect to localhost instead of your app
- ❌ Password reset links don't work in production
- ❌ OAuth callbacks fail
- ❌ Users can't access the app after email confirmation

## Production Setup (kettles.works)

### Step 1: Open Supabase Dashboard

1. Go to [supabase.com](https://supabase.com)
2. Log in with your account
3. Select your Kettles project
4. Click **Authentication** in the left sidebar
5. Click **URL Configuration**

### Step 2: Set Site URL

This is the primary domain used in all email links.

1. Find the **Site URL** field
2. Change from: `http://localhost:3000`
3. Change to: `https://kettles.works`
4. Click **Save**

### Step 3: Add Redirect URLs

These are all URLs where Supabase should accept auth callbacks.

In the **Redirect URLs** section, add:
- `https://kettles.works/auth/callback` (Email confirmation callback)
- `https://kettles.works/dashboard` (Post-signup redirect)
- `https://kettles.works/` (Fallback redirect)

**Exact format matters.** Use HTTPS for production.

Keep existing localhost URLs for local development:
- `http://localhost:3000/auth/callback`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/`

Your final list should include both production and development URLs.

### Step 4: Configure Your App

Update your production environment variables:

**Vercel (or your hosting):**
```
NEXT_PUBLIC_SITE_URL=https://kettles.works
NEXT_PUBLIC_APP_URL=https://kettles.works
```

**Local development (.env.local):**
```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Leave `NEXT_PUBLIC_SITE_URL` empty in development — the app will use `NEXT_PUBLIC_APP_URL` instead.

## Testing in Production

### Test Email Confirmation

1. Sign up with a new email at `https://kettles.works`
2. Check your email for the confirmation link
3. Click the confirmation link
4. You should be redirected to `https://kettles.works/auth/callback`
5. Your session should be established
6. You should be redirected to `https://kettles.works/dashboard`

### Test Password Reset (when implemented)

1. Sign in
2. Request a password reset
3. Check email for the reset link
4. Click the reset link
5. Confirm it redirects to `https://kettles.works` (not localhost)

## Testing in Development

### Local Email Links

When testing locally, email confirmation links will redirect to `http://localhost:3000/auth/callback`. This is correct for development.

To test the full flow:
1. Sign up with an email at `http://localhost:3000/auth/signup`
2. Check your email for the confirmation link
3. Copy the confirmation link and paste it in your browser
4. You should be redirected to `http://localhost:3000/auth/callback`
5. The callback handler will exchange the code for a session
6. You should be redirected to `http://localhost:3000/dashboard`

## Common Issues

### Issue: Email Links Redirect to localhost in Production

**Cause**: Supabase Site URL is still set to `http://localhost:3000`

**Fix**:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Check that Site URL is `https://kettles.works` (no localhost)
3. Click Save
4. Wait 1-2 minutes for changes to propagate
5. Test with a new signup

### Issue: "Invalid redirect URL" Error During Signup

**Cause**: The callback URL in your code doesn't match the Redirect URLs list in Supabase

**Fix**:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Find "Redirect URLs" section
3. Add the URL from the error message to the list
4. Make sure it exactly matches (HTTPS, trailing slashes, etc.)
5. Click Save
6. Try again

### Issue: Callback Page Shows "Confirming your email..." Forever

**Cause**: The auth code exchange is failing (usually due to URL mismatch)

**Fix**:
1. Open browser DevTools (F12) → Console
2. Look for error messages
3. Common errors:
   - "Invalid redirect URL" → Add URL to Redirect URLs list in Supabase
   - "Authorization code has expired" → The link was too old, sign up again
   - "Code not found" → URL is malformed, check Supabase Site URL setting

### Issue: Users Can Sign Up But Can't Confirm Email

**Cause**: Email confirmation is enabled in Supabase, but redirect URLs aren't configured

**Fix**:
1. Verify the email confirmation feature is enabled (Authentication → Providers → Email → "Confirm Email" toggle is ON)
2. Verify Site URL is set correctly (should be production URL, not localhost)
3. Verify Redirect URLs include `/auth/callback` for your domain
4. Resend the confirmation email

## Environment Variable Priority

The app uses this priority order for determining the app URL:

1. **NEXT_PUBLIC_SITE_URL** (if set) — Use for production
2. **NEXT_PUBLIC_APP_URL** (if set) — Use as fallback
3. **window.location.origin** (browser only) — Auto-detect in browser
4. **http://localhost:3000** (fallback) — Development default

**Example configurations:**

Production (Vercel):
```
NEXT_PUBLIC_SITE_URL=https://kettles.works
```

Development:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Local + Auto-detect:
```
# Leave both empty to use window.location.origin in browser
```

## Related Links

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Email Confirmation Guide](./SUPABASE_EMAIL_CONFIRMATION_SETUP.md)

## Checklist for Production Deployment

Before deploying to production:

- [ ] Supabase Dashboard → Authentication → URL Configuration
- [ ] Site URL is set to `https://kettles.works` (not localhost)
- [ ] Redirect URLs include:
  - [ ] `https://kettles.works/auth/callback`
  - [ ] `https://kettles.works/dashboard`
  - [ ] `https://kettles.works/`
- [ ] Environment variables set:
  - [ ] `NEXT_PUBLIC_SITE_URL=https://kettles.works`
  - [ ] `NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`
- [ ] Test signup with a real email
- [ ] Confirm email link in inbox redirects to production app
- [ ] After confirmation, redirected to dashboard (not localhost)

## Rollback: Reset to Development

If you need to reset to localhost for testing:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set Site URL to `http://localhost:3000`
3. Set environment variables:
   ```
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
4. Test locally

**Note**: This will break production deployments if they rely on these settings.
