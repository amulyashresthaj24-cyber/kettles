# Kettles Onboarding Flow Setup Guide

## Overview

The Kettles app now includes a complete onboarding flow that guides new users through a 5-step setup process after signup. This flow helps new users create their first project and task, set up their profile, and configure their focus duration preference.

## Onboarding Steps

### Step 1: Profile Setup
- **Purpose**: Collect user's full name
- **Fields**: Full name (required)
- **Data Saved**: 
  - `fullName` → user_profiles.full_name
  - `avatarUrl` → user_profiles.avatar_url (if uploaded later)
- **Pre-fill**: Name from Supabase Auth metadata if available

### Step 2: Project Setup
- **Purpose**: Create the first project
- **Fields**: Project name (required)
- **Data Saved**:
  - Creates a new project with the provided name
  - Project is linked to the authenticated user

### Step 3: First Task Setup
- **Purpose**: Create the first task to track
- **Fields**: Task title (required)
- **Data Saved**:
  - Creates a new task with the provided title
  - Task is automatically linked to the project from Step 2

### Step 4: Focus Preference
- **Purpose**: Set default focus session duration
- **Options**: 25 min, 45 min, 60 min (default: 25)
- **Data Saved**:
  - `defaultFocusDuration` → user_profiles.default_focus_duration

### Step 5: Completion
- **Purpose**: Confirmation screen before entering the app
- **Action**: Marks `onboardingCompleted = true` and redirects to /dashboard

## Database Schema

### user_profiles Table

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    default_focus_duration INTEGER DEFAULT 25,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Migration File**: `supabase/migrations/20250503000000_add_user_profiles.sql`

## Routing & Redirects

### After Signup
1. User completes signup form (/auth)
2. Auth page calls `signUp()` with email/password
3. If `data.session` exists (email confirmation disabled):
   - User is logged in immediately
   - Redirects to `/onboarding`
4. If `data.session` is null (email confirmation enabled):
   - Shows "Check your email" message
   - User must confirm email via link
   - Email link points to `/auth/callback`

### Auth Callback Flow
- Supabase sends confirmation email with auth code
- Email link → `/auth/callback?code=xxx`
- Callback page exchanges code for session
- Redirects to `/onboarding`

### After Signin
1. User completes signin form (/auth)
2. Auth page calls `signIn()`
3. On success, redirects to `/dashboard`
4. AuthProvider checks if user already has `onboardingCompleted = true`
5. If true, stays on dashboard
6. If false, should redirect to `/onboarding` (optional enhancement)

### Onboarding Guard
- Onboarding page checks if user exists and is logged in
- If not logged in, redirects to `/auth`
- If `onboardingCompleted = true`, redirects to `/dashboard`
- Prevents users from being forced through onboarding again

## Implementation Details

### Component Structure

**File**: `src/app/onboarding/page.tsx`

Key features:
- 5-step form with progress indicator (left panel on desktop)
- Multi-step form validation
- Error states with helpful messages
- Loading state during save
- Responsive layout:
  - Desktop: 40% left brand panel + 60% right form
  - Mobile: Stacked layout with hidden left panel
- Kettles branding (blue gradient, typography, colors)

### State Management

Uses React `useState` for:
- Current step tracking
- Form data (fullName, projectName, taskTitle, focusDuration)
- Validation errors
- Loading/error states

Data is NOT persisted to localStorage during flow (saved only at final step).

### Data Saving Logic

1. **Step 1 → Profile Save**:
   - Calls `supabase.from('user_profiles').upsert()`
   - Saves fullName and avatarUrl

2. **Step 2 & 3 → Direct Navigation**:
   - Data is held in component state
   - Not saved to database yet

3. **Step 4 → Complete Save**:
   - Calls `addProject()` from Zustand store
   - Calls `addTask()` linked to the project
   - Upserts user_profiles with:
     - fullName, avatarUrl, defaultFocusDuration
     - onboardingCompleted = true
     - onboardingCompletedAt = now()

### Error Handling

- Real-time field validation
- User-friendly error messages
- Supabase error mapping to readable text
- Error state persists until user fixes input
- Async save errors display at top of form
- Network failures prevented by disabled submit button

## Supabase Setup Requirements

### 1. Migration
The migration file creates the `user_profiles` table with RLS policies:

```bash
# Run migration locally
supabase migration new add_user_profiles
# Edit the file and add migration SQL
supabase up
```

Or upload directly to Supabase Dashboard:
1. Go to SQL Editor
2. Copy migration SQL
3. Run in editor

### 2. Enable Email Confirmation (Optional)
To use email confirmation after signup:

1. Go to Supabase Dashboard
2. Authentication → Providers → Email
3. Toggle "Confirm Email" ON
4. App will automatically detect and handle confirmation flow

### 3. Disable Email Confirmation (Faster Onboarding)
For immediate user access without email confirmation:

1. Go to Supabase Dashboard
2. Authentication → Providers → Email
3. Toggle "Confirm Email" OFF
4. Users will be logged in immediately after signup
5. No confirmation email needed

## Integration Checklist

- [x] Create onboarding page (`src/app/onboarding/page.tsx`)
- [x] Create user_profiles table migration
- [x] Update auth page redirect to `/onboarding` on signup
- [x] Update auth page redirect to `/dashboard` on signin
- [x] Update AppShell to allow onboarding route (not protected)
- [x] Build verification (no errors)
- [x] Lint verification (no errors)
- [ ] Run Supabase migration on dev database
- [ ] Run Supabase migration on production database
- [ ] Manual testing with new signup account
- [ ] Verify data persists in user_profiles table
- [ ] Test onboarding → dashboard redirect

## Testing Checklist

### Local Testing

1. **Complete Onboarding Flow**:
   - Sign up with test email
   - Fill in all 5 steps
   - Verify data in Supabase user_profiles table
   - Confirm redirect to dashboard
   - Verify first project and task appear in dashboard

2. **Skip Onboarding** (already completed):
   - Sign up user again
   - If email confirmation disabled, should go to onboarding
   - If already completed onboarding, should redirect to dashboard
   - Refresh should not restart onboarding

3. **Data Persistence**:
   - Refresh mid-onboarding (on step 2 or 3)
   - Step 1 should have saved profile
   - Form should reset steps 2-4 (expected)
   - User should be able to continue

4. **Error Scenarios**:
   - Try to submit step without required field
   - Verify inline error message
   - Fix error and resubmit
   - Verify submission succeeds

5. **Mobile Testing**:
   - Test on mobile viewport
   - Verify layout stacks properly
   - All buttons clickable
   - Text readable
   - Form width appropriate

### Production Testing

1. Deploy migration to production database
2. Deploy code changes
3. Create new test account at kettles.works
4. Complete full onboarding flow
5. Verify project/task appear on dashboard
6. Verify user_profiles table has correct data

## Customization

### Change Focus Duration Options
Edit `src/app/onboarding/page.tsx`, line ~520:

```typescript
{[
  { value: 25, label: "25 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
].map((option) => (
```

### Change Initial Focus Duration Default
Edit `src/app/onboarding/page.tsx`, line ~47:

```typescript
focusDuration: 25, // Change default here
```

### Change Step Text/Titles
All step titles and descriptions are in the corresponding step sections (lines ~280+).

### Add/Remove Steps
1. Add new step to `type Step = "profile" | "project" | "task" | "preference" | "complete"`
2. Add step UI block in return JSX
3. Update step navigation logic in `handleNext()`
4. Update progress indicator (lines ~290+)

## Related Files

- **Onboarding Page**: `src/app/onboarding/page.tsx`
- **Auth Page**: `src/app/auth/page.tsx` (updated redirects)
- **AppShell**: `src/components/AppShell.tsx` (allows onboarding route)
- **Auth Provider**: `src/lib/auth.tsx` (session handling)
- **Store**: `src/lib/store-supabase.ts` (addProject, addTask)
- **Migration**: `supabase/migrations/20250503000000_add_user_profiles.sql`

## Troubleshooting

### "user_profiles" Table Not Found
- Run migration: `supabase up`
- Verify table exists in Supabase Dashboard

### Onboarding Redirects to Auth
- Check if user is logged in: Look at browser console
- Verify auth session is created after signup
- Check email confirmation settings in Supabase

### Can't Create Project/Task During Onboarding
- Verify addProject and addTask functions work
- Check user_id is correctly set
- Review Supabase RLS policies

### Onboarding Completes but No Data Saved
- Check Supabase user_profiles table for records
- Verify upsert query in onboarding page
- Check browser console for errors

### Mobile Layout Broken
- Verify Tailwind classes applied correctly
- Test viewport sizes: 375px (mobile), 768px (tablet), 1024px (desktop)
- Use browser DevTools to inspect responsive behavior

## Future Enhancements

1. **Avatar Upload**:
   - Add file upload to Step 1
   - Save to Supabase Storage
   - Display avatar in profile/dashboard

2. **Workspace Creation**:
   - If supporting workspaces, add step
   - Create workspace before projects

3. **Client Setup**:
   - Optional step to create first client
   - Link to project if needed

4. **Team Invitations**:
   - If supporting teams, invite members during onboarding
   - Set up team workspace

5. **Dashboard Preview**:
   - Show preview of dashboard at end
   - Highlight key features available

6. **Skip Option**:
   - Allow skipping optional steps (with confirmation)
   - Save what was entered before skip

7. **Edit After Completion**:
   - Allow users to return to `/onboarding` to edit profile
   - Or create separate `/settings/profile` page

## Questions?

For issues or questions about the onboarding flow:
1. Check this guide for troubleshooting
2. Review the onboarding page code for implementation details
3. Check Supabase logs for database errors
4. Test with browser DevTools open for JavaScript errors
