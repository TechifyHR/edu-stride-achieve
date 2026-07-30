## What's actually happening

Sign-up is not broken at the database level. I checked the backend: your account exists, and the trigger correctly created 1 organization, 1 role, and the employee record.

The blocker is email confirmation: the user row is `unconfirmed`, so no session is created. The auth page then navigates to `/dashboard`, the auth gate finds no signed-in user, and bounces straight back to `/auth` — which looks like "creating a workspace doesn't work".

## Fix

1. **Turn on auto-confirm for email sign-ups** (Cloud auth setting). New sign-ups get an immediate session, so the workspace is usable right away without an email round-trip.
2. **Harden the sign-up handler** in `src/routes/auth.tsx`: after `signUp`, check whether a session actually came back.
   - Session present → toast success, go to `/dashboard`.
   - No session → show a clear "check your email to confirm" state instead of a silent bounce.
3. **Sign-in fallback for the existing account**: your current unconfirmed user already owns an org, so it will be confirmed as part of this change and can sign in normally.
4. **Dashboard reachability check**: verify `/dashboard` renders for an HR Admin after sign-up — the HR view (assignments, overdue, certificates, employees KPIs + completion chart) is already built and wired to `getHrDashboard`.

## Technical notes

- Auth setting change via the Cloud auth configuration tool (auto-confirm email), no schema migration needed.
- No change to `handle_new_user()` — it works as designed.
- `emailRedirectTo` stays pointed at a same-origin URL for the case where confirmation is later re-enabled.
