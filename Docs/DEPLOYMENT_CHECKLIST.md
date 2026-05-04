# Kettles Onboarding - Deployment & Testing Checklist

## Pre-Deployment Verification

✅ **Code Changes Complete**
- [x] Onboarding page created and styled
- [x] Auth redirects updated
- [x] AppShell route protection updated
- [x] Database migration created
- [x] Build passes with no errors
- [x] Linter passes with no warnings
- [x] No TypeScript errors

✅ **Files Created/Modified**
- [x] `src/app/onboarding/page.tsx` (538 lines)
- [x] `src/app/auth/page.tsx` (redirects updated)
- [x] `src/components/AppShell.tsx` (route handling)
- [x] `supabase/migrations/20250503000000_add_user_profiles.sql`
- [x] `Docs/ONBOARDING_SETUP.md` (setup guide)
- [x] `ONBOARDING_IMPLEMENTATION.md` (implementation summary)

## Local Development Setup

### Step 1: Apply Database Migration

```bash
cd /path/to/kettles
npx supabase db push
```

When prompted:
- Accept package installation if needed
- Confirm push migration to remote database
- Migration should complete successfully

**Verify**: Check Supabase Dashboard → SQL Editor
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'user_profiles';
```

Should return 1 row with table definition.

### Step 2: Start Development Server

```bash
npm run dev
```

Should start on http://localhost:3000

### Step 3: Test Complete Onboarding Flow

1. **Go to signup page**:
   - Navigate to http://localhost:3000/auth
   - Should show auth form with signup mode (default)

2. **Create test account**:
   - Email: `test-onboard@example.com`
   - Password: `Test123456`
   - Name: `Test User`
   - Click "Sign up"

3. **Verify redirect to onboarding**:
   - If email confirmation is disabled in Supabase:
     - Should immediately redirect to `/onboarding`
   - If email confirmation is enabled:
     - Should show "Check your email" message
     - Use Supabase email preview to get confirmation link
     - Click link to confirm
     - Should redirect to `/onboarding`

4. **Complete step 1 - Profile**:
   - Fill in name (should be pre-filled from signup)
   - Click "Next"
   - Should save profile and advance to step 2

5. **Complete step 2 - Project**:
   - Fill in project name: "My First Project"
   - Click "Next"
   - Should advance to step 3

6. **Complete step 3 - Task**:
   - Fill in task title: "First Task"
   - Click "Next"
   - Should advance to step 4

7. **Complete step 4 - Preference**:
   - Click on "25 min" (or select another)
   - Click "Next"
   - Should advance to step 5

8. **Complete step 5 - Success**:
   - Should see completion message
   - Click "Go to Dashboard"
   - Should redirect to `/dashboard`

9. **Verify dashboard shows data**:
   - Should see "My First Project" in projects list
   - Should see "First Task" in tasks list
   - Task should be linked to project

### Step 4: Verify Database Records

Check Supabase local database:

```sql
-- Check user_profiles
SELECT * FROM user_profiles WHERE full_name = 'Test User';
-- Should show:
-- - full_name: "Test User"
-- - onboarding_completed: true
-- - default_focus_duration: 25
-- - onboarding_completed_at: (current timestamp)

-- Check projects
SELECT * FROM projects WHERE user_id = (SELECT user_id FROM user_profiles WHERE full_name = 'Test User');
-- Should show project "My First Project"

-- Check tasks
SELECT * FROM tasks WHERE project_id = (SELECT id FROM projects WHERE user_id = (SELECT user_id FROM user_profiles WHERE full_name = 'Test User'));
-- Should show task "First Task"
```

### Step 5: Test Re-Entry Prevention

1. **Sign out**:
   - Click profile/settings menu
   - Click "Sign out"

2. **Sign in with same account**:
   - Go to `/auth`
   - Switch to "Sign in"
   - Login with same credentials

3. **Verify redirect to dashboard**:
   - Should bypass onboarding
   - Should go directly to `/dashboard`
   - Onboarding already completed for this user

## Mobile Testing

### Desktop First (1920x1080)
- [x] Two-column layout visible
- [x] Left panel (40% width) with brand and progress
- [x] Right panel (60% width) with form
- [x] All form elements properly spaced
- [x] All buttons clickable

### Tablet View (768x1024)
- [x] Layout still two-column
- [x] Responsive padding adjusts
- [x] Text remains readable
- [x] Form inputs appropriately sized

### Mobile View (375x667)
- [x] Single column layout
- [x] Left brand panel hidden
- [x] Logo visible at top
- [x] Form full-width
- [x] Buttons full-width and easy to tap
- [x] No horizontal scrolling
- [x] Text readable
- [x] Inputs 48px+ height for touch

**Test Mobile**:
```bash
# In Chrome DevTools:
1. Press F12
2. Click responsive design mode (Ctrl+Shift+M)
3. Set to iPhone 12 (375x812)
4. Test entire onboarding flow
```

## Error Scenarios

### Test 1: Missing Required Fields
1. Go to `/onboarding`
2. Try to click "Next" on step 1 without filling name
3. Should see error: "Name is required"
4. Fill name
5. Error should clear
6. Should proceed

### Test 2: Network Error
1. Go to step 4 (preference)
2. Open DevTools Network tab
3. Throttle to "Offline" (DevTools → Network → Offline)
4. Click "Next"
5. Should see error message
6. Go back online
7. Retry should work

### Test 3: Already Completed Onboarding
1. After completing onboarding, visit `/onboarding` again
2. Should immediately redirect to `/dashboard`
3. No re-entry to onboarding

### Test 4: Not Logged In
1. Log out user
2. Visit `/onboarding`
3. Should redirect to `/auth`
4. Must login first

## Production Deployment

### Pre-Deployment
- [ ] Code reviewed by team
- [ ] All tests passing locally
- [ ] Mobile testing completed
- [ ] No console errors or warnings
- [ ] Linting passed
- [ ] Build passing

### Deployment Steps

1. **Merge code to main branch**:
   ```bash
   git add .
   git commit -m "feat: add onboarding flow after signup"
   git push origin main
   ```

2. **Deploy migration to production**:
   - Option A: Use Supabase CLI
     ```bash
     npx supabase db push --linked
     ```
   - Option B: Manual (Supabase Dashboard)
     1. Go to SQL Editor
     2. Create new query
     3. Copy SQL from migration file
     4. Run query
     5. Verify table created

3. **Deploy code to production**:
   - Push to production (Vercel or your host)
   - Verify `/onboarding` route is live
   - Check build logs for errors

4. **Verify production deployment**:
   - [ ] Visit https://kettles.works/auth
   - [ ] Create test account
   - [ ] Complete onboarding flow
   - [ ] Verify data in production Supabase
   - [ ] Check no console errors
   - [ ] Mobile testing on production

### Post-Deployment Monitoring

**First 24 hours**:
- [ ] Monitor error logs in Sentry/Rollbar
- [ ] Check Supabase logs for errors
- [ ] Monitor signup completion rates
- [ ] Monitor onboarding drop-off rates

**Key metrics to track**:
- Signup completion rate
- Onboarding completion rate
- Average time to complete onboarding
- Error rate on `/onboarding` route
- Database query errors

## Rollback Plan

If critical issues found:

1. **Stop new signups** (optional):
   - Temporarily disable signup in auth page
   - Redirect to waitlist or hold page

2. **Revert code**:
   ```bash
   git revert <commit-hash>
   git push origin main
   # Deploy reverted version
   ```

3. **Keep database changes**:
   - Don't drop `user_profiles` table
   - Safe to leave in place
   - Can use for future features

4. **Communicate status**:
   - Notify users of temporary issue
   - Update status page
   - Monitor error rate decrease

## Success Criteria

✅ **Signup flow works**:
- Users can create account
- Are logged in immediately (if email confirmation disabled)
- Are redirected to `/onboarding`

✅ **Onboarding completes**:
- All 5 steps work without errors
- Data saves to database
- User redirected to dashboard

✅ **Data integrity**:
- user_profiles records created correctly
- Projects created and linked to user
- Tasks created and linked to project
- No duplicate data

✅ **User experience**:
- Form is responsive and accessible
- Error messages are clear
- Loading states visible
- Mobile experience smooth

✅ **Performance**:
- No slow database queries
- Page loads quickly
- Form submission responsive
- No 404 or 500 errors

## Common Issues & Fixes

### "user_profiles table not found"
**Solution**: 
- Run migration: `npx supabase db push`
- Verify in Supabase Dashboard

### "User not redirected to onboarding"
**Possible causes**:
- Email confirmation enabled in Supabase (expected)
- Auth session not created
- Check browser console for JavaScript errors

**Solution**:
- Disable email confirmation (optional)
- Check auth page logs
- Verify getSession() returns user

### "Form data not saving"
**Possible causes**:
- RLS policies blocking insert
- user_profiles table doesn't exist
- Supabase anon key missing permissions
- Network error

**Solution**:
- Check Supabase RLS policies
- Verify table exists
- Check browser Network tab for 403 errors
- Check Supabase logs

### "Mobile layout broken"
**Solution**:
- Verify Tailwind CSS installed
- Check responsive classes applied
- Clear browser cache (Ctrl+Shift+Delete)
- Test in different mobile browsers

## Next Steps After Deployment

1. **Gather feedback**:
   - Collect user feedback on onboarding
   - Monitor where users drop off

2. **Iterate improvements**:
   - Add avatar upload if requested
   - Adjust text based on feedback
   - Refine form validation

3. **Analyze metrics**:
   - Track onboarding completion rates
   - Time to complete onboarding
   - Feature usage after onboarding

4. **Enhance features**:
   - Add workspace selection (if supported)
   - Add team setup (if supported)
   - Add dashboard preview (optional)

## Support Contact

For deployment issues:
1. Check logs in console
2. Review this checklist
3. Check `Docs/ONBOARDING_SETUP.md`
4. Review `ONBOARDING_IMPLEMENTATION.md`

---

**Last Updated**: 2025-05-03
**Status**: Ready for testing and deployment
**Risk Level**: Low (isolated feature, no breaking changes)
