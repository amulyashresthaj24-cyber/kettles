# Disabling Email Confirmation in Supabase

By default, Supabase has email confirmation enabled. This means users must confirm their email address before accessing the app. This guide shows how to disable this requirement so users can sign up and access the app immediately.

## Why Disable Email Confirmation?

- **Better onboarding**: Users don't need to check their email to start using the app
- **Lower friction**: Fewer steps between signup and first use
- **Faster time-to-value**: Users can start creating projects and tasks immediately

## How to Disable Email Confirmation

### Step 1: Open Supabase Dashboard

1. Go to [supabase.com](https://supabase.com)
2. Log in with your account
3. Select your Flowmate project

### Step 2: Navigate to Email Provider Settings

1. In the left sidebar, click **Authentication**
2. Click **Providers**
3. Find **Email** in the list and click it to open settings

### Step 3: Turn Off "Confirm Email"

1. Look for the toggle labeled **"Confirm Email"**
2. Click the toggle to turn it **OFF**
3. Click **Save**

### Step 4: Verify the Setting

After saving, confirm that:
- The "Confirm Email" toggle is in the OFF position
- A confirmation message appears saying the change was saved

## Expected Behavior After Disabling Email Confirmation

### Sign Up Flow

1. User enters email, password, and name
2. Clicks "Create account"
3. Account is created immediately
4. User is automatically logged in (session is created)
5. User is redirected to the Dashboard
6. No email confirmation is required

### What Users See

- ✅ Sign up form
- ✅ "Creating account..." loading state
- ✅ Automatic redirect to Dashboard
- ❌ No "Check your email" screen
- ❌ No "Confirm your email" email
- ❌ No confirmation link required

## Testing in Development

To test that email confirmation is disabled:

1. Sign up with a new test email (e.g., `test123@example.com`)
2. You should be automatically logged in
3. You should see the Dashboard immediately
4. You should **not** see a confirmation email in your inbox

If you see a confirmation email or can't log in, email confirmation is still enabled. Go back to Step 3 and verify the toggle is OFF.

## Common Issues

### Issue: User sees "Email confirmation is currently enabled" screen

**Solution**: The Supabase Dashboard still has "Confirm Email" enabled.
1. Go back to Step 3 and confirm the toggle is OFF
2. Wait a few seconds for the change to propagate
3. Refresh the browser
4. Try signing up again

### Issue: Signup works but user isn't logged in

**Solution**: Check that the session is being created after signup.
1. Open browser DevTools → Application → Cookies
2. Look for `sb-<project-id>-auth-token` cookie
3. If it doesn't exist, email confirmation is still required

### Issue: User gets an error during signup

**Solution**: Check the Supabase Edge Function logs.
1. In Supabase Dashboard, go to **Edge Functions**
2. Look for errors in the auth-related functions
3. Contact support if errors persist

## More Information

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Email Provider Settings](https://supabase.com/docs/guides/auth/auth-email)
- [Sessions and Tokens](https://supabase.com/docs/guides/auth/sessions)

## Rollback: Re-enable Email Confirmation

If you need to re-enable email confirmation later:

1. Go to Authentication → Providers → Email
2. Click the "Confirm Email" toggle to turn it **ON**
3. Click **Save**

Note: Existing users without confirmed emails may not be able to log in.
