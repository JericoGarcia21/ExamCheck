# Admin model usage

Implemented 2026-10-20. Scope: report real app admission counts and provider-returned token metadata without inventing a provider balance, billing figure, or historical token data.

## What Admin shows

- Guest scans admitted today and over 30 UTC days; a daily count table.
- Per-network daily allowance, global app scan cap and scans remaining today under that cap. The default per-network allowance stays five. Global cap defaults to 100, adjustable by admins from 0–10000; zero disables guest scans.
- Last-30-day provider attempts grouped by requested model and workflow (signed-in, guest key photo, guest sheet), HTTP/network failures, attempts with total-token metadata, and provider-reported input/output/thinking/cached/total tokens.
- Missing counts are **Unknown**, including a failed request without usage metadata. Known zero remains zero. Total is the provider's totalTokenCount rather than a fabricated sum; cached input is already included in prompt tokens.
- Links to Google AI Studio usage/rate limits and Google Cloud billing. **Live provider remaining quota and billing are not connected.** No cost estimate is presented as an invoice. External usage under the same Google project is outside the app counters.

Reference checks on 2026-10-20: [Gemini GenerateContent response/UsageMetadata](https://ai.google.dev/api/generate-content), [provider rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), and [Google Cloud billing export](https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery). The response supplies token metadata, not a billing account balance. Active provider limits belong to the Google project and may use different reset windows from the app's UTC allowance. A real in-app billing integration still needs the owner's project/account identity, authorized read access, and (for costs) an appropriate billing export/data source. No such credentials or connection have been provided, so that integration is blocked rather than silently simulated.

## Data and permissions

Migration `0012_usage_analytics.sql` adds persistent anonymous daily admission totals and a metadata-only model_usage table. Raw images, prompts, answers, provider keys, IP addresses and teacher identities are not stored in telemetry. Detailed model-attempt rows older than 90 days are removed on subsequent writes. Anonymous daily totals contain only date/count and are retained independently of the short-lived network hashes.

`record_model_usage` is service-role-only; guests and signed-in teachers cannot fabricate usage. `admin_model_usage` checks administrator status server-side. Changing either guest cap requires an administrator and records an audit event. Admission remains atomic with both per-network and global caps. Its previous service RPC signature remains compatible with older endpoint code; any older explicit cap can only lower the database cap.

Recording is best effort with a three-second telemetry-write deadline per provider attempt. A telemetry outage does not discard an otherwise successful paper read; the Edge Function emits the static warning `Model usage telemetry unavailable; token totals may be incomplete.` Missing recordings cannot be reconstructed from counters. Usage rows include unsuccessful and malformed-output responses when a provider call actually occurred, so HTTP success is distinct from a successfully graded paper. Retry/fallback attempts each receive a separate record. Duplicate telemetry IDs are ignored by the database.

History coverage: historical token data was never collected and is unavailable. Guest daily totals are seeded only from the network counters still present when migration 0012 runs (normally recent days); older deleted counters cannot be recovered. The 30-day display therefore is partial until enough new history accumulates. A zero on a pre-tracking day does not prove that no scans occurred. Known token sums are partial whenever responses or recording are missing.

## Setup and rollback

1. Apply migration **0012** after **0011**, without rerunning prior migrations.
2. Regenerate bundles with `npm run bundle:reader` and redeploy **both** `read-answers` and `quick-check` using each function's own `dashboard.ts`. Keep `read-answers` JWT verification enabled; the guest endpoint retains its existing public admission configuration.
3. Both functions need server-only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in addition to their existing provider/configuration secrets. Never put the service credential in a VITE variable. Current Quick Check takes the global cap from the database; the old global-limit environment variable is retired.
4. Deploy the frontend and open Admin → **Model usage & guest limits**. Data refreshes every 30 seconds. Use a synthetic photo to verify a token row and guest admission change after deployment. Review provider dashboards separately for true project-wide limits and billing.
5. If needed, restore previous frontend/reader artifacts together and leave additive tables in place. No grades are altered by telemetry. During rollback an older guest endpoint may still enforce its environment cap in addition to the database cap; restore its configuration too. No rollback or live deployment was performed here.

## Evidence

73 local tests passed, including admin authorization, service-only recording, deduplication, null-vs-zero handling, guest admission rollup, cap exhaustion/zero disabling, provider failure/no retry, and non-destructive telemetry outage behavior. Full verify includes lint, generated-bundle checks, Deno checks and production/PWA build. Live Google billing/quota, real-photo token readings, browser/mobile rendering and keyboard operation remain unverified; no browser was available earlier in this session. No deployment occurred.
