

# Fix: Invite Email Not Sending + Active Status Display

## Problem 1: Invite Email Not Sent
The `manage-users` edge function creates the user with `createUser()`, then tries `generateLink({ type: 'invite' })`. This fails with `email_exists` because the user already exists. The Resend email is never sent.

**Fix**: Change `generateLink` type from `'invite'` to `'magiclink'` since the user already exists at that point. The magic link will still redirect to `/setup-password`.

## Problem 2: Active Status Display
New users should appear as "Not Active" (disabled) until they complete the password setup flow. Currently they are created as active immediately.

**Fix**: Set `is_disabled: true` in the profile when creating the user. The existing `set-password` action already enables the user (`is_disabled: false`), so no changes needed there.

---

## Technical Changes

### File: `supabase/functions/manage-users/index.ts`

**Change 1 (Line 316):** Set `is_disabled: true` when creating the profile
```javascript
// Before
.upsert({
  user_id: newUser.user.id,
  email,
  full_name,
  username,
  company_id: isCreatingMasterAdmin ? null : company_id,
  role,
}, ...)

// After
.upsert({
  user_id: newUser.user.id,
  email,
  full_name,
  username,
  company_id: isCreatingMasterAdmin ? null : company_id,
  role,
  is_disabled: true,   // <-- show as "not active" until password is set
}, ...)
```

**Change 2 (Line 360):** Change `type: 'invite'` to `type: 'magiclink'`
```javascript
// Before
const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
  type: 'invite',
  email,
  options: { redirectTo: `${appUrl}/setup-password` },
});

// After
const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo: `${appUrl}/setup-password` },
});
```

### File: `src/pages/TeamManagement.jsx`

**Change 3:** When optimistically adding a new member to the UI, set `is_disabled: true` to match the server state.
```javascript
// Before
is_disabled: false,

// After
is_disabled: true,
```

---

## What Does NOT Change
- SetupPassword page
- Role system and permissions
- RLS policies
- `set-password` action (already enables user by setting `is_disabled: false`)
- Email HTML template
- Auth flow

## After This Fix
1. Admin creates user -> user is created with `is_disabled: true` -> shows "Disabled" in team list
2. `generateLink({ type: 'magiclink' })` succeeds -> branded email sent via Resend
3. User clicks link -> lands on `/setup-password` -> sets password
4. `set-password` action sets `is_disabled: false` -> user now shows as "Active"
5. User logs in normally

