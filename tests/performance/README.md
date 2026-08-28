# Performance validation

These protocol-level k6 scenarios measure TsokoLitaw's own Next.js and Supabase read paths. They deliberately do not call Google, PayMongo, or Resend.

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) separately, then target a staging deployment and staging/test database. Do not run the 100-user profile against production without explicit approval.

PowerShell smoke test:

```powershell
$env:BASE_URL = "https://staging.example.com"
npm run load:smoke
```

For authenticated order reads, copy only the staging Supabase auth cookie from an active staging browser session. Never commit it:

```powershell
$env:AUTH_COOKIE = "sb-...=..."
$env:ORDER_ID = "00000000-0000-4000-8000-000000000000"
npm run load:smoke
```

After smoke validation, run the staged ramp, ten-minute 100-user hold, and recovery spike:

```powershell
npm run load:100
```

The test fails when unexpected HTTP errors reach 1% or warm p95 response time reaches one second. Also inspect Vercel route durations and Supabase database metrics during the run. Passing response thresholds is not sufficient if database connections saturate, lock waits accumulate, or any ownership/inventory/idempotency invariant fails.

Checkout, cancellation, refund, and webhook writes require unique seeded users and provider fixtures. Keep those in a separate low-rate test so this read-capacity script cannot create real operational records or call third parties.
