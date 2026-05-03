# Quick Deployment Checklist: Kettles.works Auth Setup

## Production Deployment (kettles.works)

### Step 1: Supabase Dashboard Configuration (Required First)

**Location**: https://supabase.com → Your Project → Authentication → URL Configuration

**Site URL** (1 required):
- [ ] Clear existing value: `http://localhost:3000`
- [ ] Set to: `https://kettles.works`
- [ ] Click **Save**

**Redirect URLs** (All URLs where Supabase redirects after auth):
- [ ] `https://kettles.works/auth/callback` (Email confirmation)
- [ ] `https://kettles.works/dashboard` (Post-signup)
- [ ] `https://kettles.works/` (Fallback)
- [ ] `http://localhost:3000/auth/callback` (Keep for local dev)
- [ ] `http://localhost:3000/dashboard` (Keep for local dev)
- [ ] `http://localhost:3000/` (Keep for local dev)
- [ ] Click **Save**

**Verify**:
- [ ] Refresh page
- [ ] Site URL shows `https://kettles.works`
- [ ] All redirect URLs are listed

### Step 2: Environment Variables

**For Vercel** (or your hosting provider):

Go to Project Settings → Environment Variables and add:

```
NEXT_PUBLIC_SITE_URL = https://kettles.works
```

Optional (auto-detected if not set):
```
NEXT_PUBLIC_APP_URL = https://kettles.works
```

**Keep these**:
```
NEXT_PUBLIC_SUPABASE_URL = https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = [your-anon-key]
```

### Step 3: Deploy

- [ ] Deploy to production (push to main, trigger Vercel deployment, etc.)
- [ ] Wait for build to complete
- [ ] Verify app is live at `https://kettles.works`

### Step 4: Test Authentication

**Test 1: Signup with Email Confirmation**

1. [ ] Go to `https://kettles.works/auth`
2. [ ] Sign up with a new email: `test+[timestamp]@example.com`
3. [ ] Check your email inbox for confirmation link
4. [ ] Confirm email link URL starts with `https://kettles.works/` (NOT localhost)
5. [ ] Click confirmation link
6. [ ] You should be redirected to dashboard
7. [ ] You should be logged in

**Test 2: Signup without Email Confirmation** (if disabled in Supabase)

1. [ ] Go to `https://kettles.works/auth`
2. [ ] Sign up with another email
3. [ ] You should be logged in immediately
4. [ ] You should see dashboard
5. [ ] No confirmation email should be sent

**Test 3: Login**

1. [ ] Go to `https://kettles.works/auth`
2. [ ] Click "Already have an account?"
3. [ ] Sign in with test email from Test 1
4. [ ] You should be logged in
5. [ ] You should see dashboard

### Step 5: Troubleshooting

**Problem**: Email confirmation link goes to localhost

**Solution**:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Check that Site URL is `https://kettles.works`
3. Test again with a new signup

**Problem**: "Invalid redirect URL" error during signup

**Solution**:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add the error URL to Redirect URLs list
3. Make sure it exactly matches (HTTPS, no typos)
4. Try again

**Problem**: Confirmation page shows spinner forever

**Solution**:
1. Open DevTools (F12) → Console
2. Look for error message
3. Most common cause: Supabase Site URL not updated yet (wait 1-2 min)
4. Clear browser cache and try again

## Local Development (After Production is Live)

Your local development should continue to work with `http://localhost:3000`.

**Verify your `.env.local` has**:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Leave NEXT_PUBLIC_SITE_URL empty or unset
```

**Test locally**:
1. `npm run dev`
2. Go to `http://localhost:3000/auth`
3. Signup with a local test email
4. Confirmation email links should go to `http://localhost:3000/auth/callback`
5. Everything works normally

## Related Guides

- **[SUPABASE_AUTH_REDIRECT_FIX.md](./SUPABASE_AUTH_REDIRECT_FIX.md)** - Technical details of all changes
- **[SUPABASE_URL_CONFIGURATION.md](./SUPABASE_URL_CONFIGURATION.md)** - Comprehensive URL configuration guide
- **[SUPABASE_EMAIL_CONFIRMATION_SETUP.md](./SUPABASE_EMAIL_CONFIRMATION_SETUP.md)** - Enabling/disabling email confirmation

## Success Criteria

✅ All tests pass (see Test 1, 2, 3 above)
✅ Signup confirmation emails link to `https://kettles.works`
✅ Users can log in after email confirmation
✅ No "Check your email" screen appears if email confirmation is disabled
✅ Local development still works with localhost

## Contact

If you encounter issues:
1. Check the troubleshooting section above
2. Verify Supabase Site URL is set to `https://kettles.works`
3. Check DevTools Console for error messages
4. Review [SUPABASE_URL_CONFIGURATION.md](./SUPABASE_URL_CONFIGURATION.md) for detailed help
