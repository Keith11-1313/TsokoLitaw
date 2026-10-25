# Authentication and accounts

October 26 Dev activation: Supabase Auth still identifies people with UUIDs. The application resolves
`claims.sub` against `profiles.auth_user_id` and uses the separate sequential `profiles.id` for
orders, roles, loyalty and SQL ownership. Never compare an Auth UUID directly with an application
foreign key. Admin avatars resolve the authorized page's profile IDs to Auth UUIDs server-side.
Dev has the matching sequential-ID migration and deployed code. Authenticated acceptance remains
open; Production keeps the previous schema/code until a separately approved coordinated promotion.

Entry: `/login`, `src/app/auth/actions.ts`, and `src/app/auth/callback/route.ts`.
Google → environment-specific Supabase Auth → `/auth/callback` → cookie-backed app session.
`src/proxy.ts` refreshes cookies; `src/lib/auth.ts` verifies claims and loads an active profile.
`requireCustomer` requires the active customer role on checkout/account/order routes; Admins
and Staff are redirected to `/admin`. `requireBusiness` admits active Staff/Admin to the shared
workspace; `requireAdmin` permits management only and `requireStaff` permits transactions only.
The October 21 local candidate also makes prepared-stock operations Staff-only; Inventory admits
both business roles for reading, while its mutation actions/RPCs require Staff. Staff login redirects
may target Dashboard, Orders or Inventory, never Admin configuration or role-management routes.
Wrong-role pages/actions are denied, regardless of whether their links are visible.

`getGoogleAvatarUrl` validates existing Auth metadata (`avatar_url` or `picture`) against HTTPS
`lh3.googleusercontent.com`. The signed-in profile uses it, and Admin Customers uses it after
the authorized directory query for current-page users only. Only the validated photo URL is sent
to the avatar component; missing/failed lookups or images use the person icon. No Auth metadata
dump, additional stored avatar field or database migration is needed. See the [Admin guide](admin.md).

## Database and external dependencies

`profiles` references `auth.users`; the pre-v1 baseline's Auth trigger creates the profile.
RLS and `is_active_user`/`is_admin` protect reads. `is_active_customer` limits self-profile updates
to customers. Role/active fields are not customer-editable. Customer SQL writers independently
reject Admin actors for checkout, provider payment preparation, receipts, cancellations and reviews.
Login and callback redirects are role-aware. Admins can browse public pages, but customer cart,
Profile, My Orders and purchase controls are unavailable; business management remains available.
Staff completion of customer orders awards the owning customer's loyalty, never the operator's.
Staff/Admin have no personal shopping/profile/deletion flow. New identities are Customers;
Admin assigns roles to other eligible accounts through the audited `/admin/accounts` action.
Self-role changes, stale roles, active personal orders and pending deletion block assignment.
The new `staff` enum, Staff-only transaction guards and current policy need the three October 20
forward migrations and matching code before hosted use. Existing sessions read the current profile
role server-side; transaction SQL holds the Staff actor row stable against concurrent demotion.
The service-only bootstrap (`scripts/bootstrap-admin.mjs`, `promote_admin_by_email`) requires an
approved existing Google identity and enforces the ten-Admin limit. See [setup](../getting-started/local-setup.md).

Profile updates and deletion requests enter `src/app/profile/actions.ts`. The authenticated
`request_account_deletion`/`cancel_account_deletion` RPCs derive the owner from the session.
After a 90-day grace period, `/api/cron/account-deletions` invokes `deactivate_due_account`,
rechecks eligibility, and marks the profile inactive. Auth identity and relational history remain.
Pending deletion blocks new checkout; active orders block scheduling; Admin self-deletion
is excluded. Later login clears the session and shows `/auth/account-deleted`.

## Where to change it

- Login copy: `src/components/auth/login-preview.tsx`; Profile form and danger zone:
  `src/components/customer/profile-form.tsx` and `account-danger-zone.tsx`.
- Redirect rules: `auth-redirect.ts`, `site-url.ts`, callback route; keep allowed origins constrained.
- Access policy: `auth.ts` plus RLS and active-state checks in SQL, not a client-side condition.
- Google/Supabase URLs: [environments](../getting-started/environments.md), not hardcoded redirects.

Tests: `auth-redirect.test.ts`, `site-url.test.ts`, and local `001_auth_rls.test.sql`.
Smoke-test sign-in, logout confirmation, cross-user denial, and non-Admin access when these paths change.
