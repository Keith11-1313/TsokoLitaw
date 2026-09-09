# Authentication and accounts

Entry: `/login`, `src/app/auth/actions.ts`, and `src/app/auth/callback/route.ts`.
Google → environment-specific Supabase Auth → `/auth/callback` → cookie-backed app session.
`src/proxy.ts` refreshes cookies; `src/lib/auth.ts` verifies claims and loads an active profile.
`requireCustomer` protects checkout/account/order routes, while `requireAdmin` also checks the role.
Signed-in non-Admins receive Not Found at Admin URLs. Hiding a link is not authorization.

## Database and external dependencies

`profiles` references `auth.users`; the initial migration's Auth trigger creates the profile.
RLS and `is_active_user`/`is_admin` protect reads. Role/active fields are not customer-editable.
The service-only bootstrap (`scripts/bootstrap-admin.mjs`, `promote_admin_by_email`) requires an
approved existing Google identity and enforces the five-Admin limit. See [setup](../getting-started/local-setup.md).

Profile updates and deletion requests enter `src/app/profile/actions.ts`. The authenticated
`request_account_deletion`/`cancel_account_deletion` RPCs derive the owner from the session.
After a 90-day grace period, `/api/cron/account-deletions` invokes `deactivate_due_account`,
rechecks eligibility, and marks the profile inactive. Auth identity and relational history remain.
Pending deletion blocks new checkout; active orders/refunds block scheduling; Admin self-deletion
is excluded. Later login clears the session and shows `/auth/account-deleted`.

## Where to change it

- Login copy: `src/components/auth/login-preview.tsx`; Profile form and danger zone:
  `src/components/customer/profile-form.tsx` and `account-danger-zone.tsx`.
- Redirect rules: `auth-redirect.ts`, `site-url.ts`, callback route; keep allowed origins constrained.
- Access policy: `auth.ts` plus RLS and active-state checks in SQL, not a client-side condition.
- Google/Supabase URLs: [environments](../getting-started/environments.md), not hardcoded redirects.

Tests: `auth-redirect.test.ts`, `site-url.test.ts`, and local `001_auth_rls.test.sql`.
Smoke-test sign-in, logout confirmation, cross-user denial, and non-Admin access when these paths change.
