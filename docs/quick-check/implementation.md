# Quick Check implementation and setup

Implemented locally on 2026-10-20. No live migrations, secret changes, deployment or GitHub push performed for this feature.

## Scope and decisions

Public `/quick-check`, linked from the login page. A guest uploads an answer-key image or pastes text, reviews editable answers/types/points/rubrics and confirms the key. The guest then uses the existing camera or uploads a sheet, reviews/corrects readings, resolves uncertain answers and paper rules, and downloads reviewed results as CSV. The confirmed key can be reused. Editing it clears the old result; reset and refresh discard temporary work. There are no guest class/student/session records.

User decision: default **5 scans per guest per day**, adjustable by an administrator. With no account identity, this implementation applies the allowance to the trusted proxy's network identifier, shared by people on that network. A photo key and a sheet each cost one scan. Pasted keys do not. Admitted provider failures count; invalid requests do not. Reset is midnight UTC. Admin accepts integers 0–100; zero disables scans. Existing global app pause also blocks guest scans. The deployment separately sets the total daily scan cap across all guests.

This implements D1 (photo plus paste/edit) and D2 (five default; admin editable) from `requirements.md`; D3/D4 use the proposed temporary-memory/additive workflow. The earlier requirements/acceptance documents remain planning records. The five-scan decision supersedes their unspecified numeric allowance. CSV download supplies a portable result without guest persistence.

## Architecture and contract

- `src/pages/QuickCheckPage.tsx` owns temporary state and operation IDs. Active-operation guard prevents repeated submissions; unmount invalidates replies. Busy inputs/reset are disabled. Failed reads retain the confirmed key and require explicit retry.
- Reuses `CameraCapture`, image conversion, answer-key parser, deterministic scorer, confidence/review hook, review dialog and `PaperResultCard`. RF labels and strict uppercase rules apply. Results are advisory until reviewed. Every answer also has an Edit reading action in this guest flow.
- `POST /functions/v1/quick-check`: body `{mode:'key'|'sheet', imageBase64, mimeType, keys?, rules?}`. Sheet keys contain sequential question numbers, answer/type/max points and optional rubric. No account/session ID is used to fetch resources.
- Key response `{keys:[...]}` requires confirmation. Sheet response uses the existing validated recognition contract `{answers,rule_violations}`. Output schemas/IDs/points are validated before use.
- Request body bounded to 7,500,000 bytes; image validation reuses existing 5 MiB/JPEG/PNG/WebP checks; 1–300 questions, 3000 characters per key answer/rubric/rules, maximum 100 points per item. Client images retain 40-megapixel source limit and 1920px conversion.
- Error statuses: 400 invalid inputs, 403 wrong origin/missing network identity, 405 wrong method, 413 oversized request, 422 unreadable/invalid model output, 429 quota/paused, 503 disabled/unconfigured/dependency failure. Error text contains no credentials, provider body or image payload.
- New additive migration `0011_quick_check.sql`: app setting default 5, short-lived hash counters and three RPCs. Anonymous visitors can read only the guest settings RPC; only authorized admins can update the limit; only service role can consume quota. Existing account RLS/authentication remains unchanged.
- Quota admission locks the singleton app-control row, atomically checking per-network/global counts and app pause. Day-scoped network HMACs have buckets older than two days deleted on the next successful admission (no background cleanup is installed); raw network addresses/images/answers are not stored in the guest table. No guest provider-call payload is logged.
- One provider request per admission, no automatic retries or fallback. 90-second request deadline and 16,384 output-token ceiling. Uses the project's existing `gemini-3.5-flash-lite` model. Request structure/header usage was checked against the [official Gemini API reference](https://ai.google.dev/api) on 2026-10-20. Mock tests do not establish real handwriting accuracy, model availability or provider retention.

## Deployment steps (not executed)

1. Confirm existing migrations through `0010_session_copy_and_details.sql` are applied. Apply `0011_quick_check.sql`, then `0012_usage_analytics.sql` if not already applied. Do not rerun older migrations.
2. Configure the `quick-check` function's server secrets:
   - `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only; never VITE variables).
   - `QUICK_CHECK_ORIGIN`: exact frontend origin, e.g. `https://your-app.example`, without trailing slash.
   - `QUICK_CHECK_HASH_SECRET`: a long randomly generated server secret for network HMACs; keep stable within a day.
   - `QUICK_CHECK_IP_HEADER`: the header your trusted deployment proxy **overwrites** with a stable client-network identity. Verify spoof resistance on the actual ingress. Do not enable guest processing with a caller-controlled header. A shared proxy identity will share the five-scan allowance across all guests.
   - The global daily cap is now stored in the database (default **100**) and editable in Admin → Model usage & guest limits. `QUICK_CHECK_GLOBAL_DAILY_LIMIT` is no longer read by the current endpoint. Existing older endpoint versions can still request a lower cap while rolling out. This limits scan count, not dollar cost.
   - `QUICK_CHECK_ENABLED`: leave unset/false during setup; set `true` only after admission and synthetic workflow checks on the target.
3. Deploy the **new** function `quick-check`. Its config requires JWT verification **off**, since this is the public endpoint with its own quota admission. Keep JWT verification **on** for the existing `read-answers` function.
4. For dashboard deployment, run `npm run bundle:reader`, then paste all of `supabase/functions/quick-check/dashboard.ts` into the **quick-check** function editor as `index.ts`. Do not paste this into `read-answers`. Both bundles are checked by `npm run verify`.
5. Deploy the frontend. Open `/login` → **Quick Check — no login needed**, or `/quick-check` directly. Admin → **Quick Check guest allowance** changes the default-five setting immediately on the server. Settings refresh on the guest screen every 30 seconds.

For model-token telemetry also redeploy `read-answers` from its own generated dashboard file with JWT verification **on**. Both functions use the server-only `SUPABASE_SERVICE_ROLE_KEY` to write metadata; no service key belongs in frontend configuration. See `../model-usage.md` for coverage and reporting limits.

Production setup and header trust have not been verified; failure to configure required secrets deliberately returns unavailable rather than allowing unbounded paid scans. An unauthenticated public endpoint can still attract bots: even with correct per-network limits, distributed visitors can exhaust the global cap and deny guest availability. Add stronger admission if observed abuse warrants it; the owner must accept this availability trade-off before enabling public scans. CORS alone is not authentication.

## Verification and release checks

`npm.cmd run verify` passed: 69 tests, lint, source/dashboard Deno checks, TypeScript, production build and PWA generation. Local backend/schema tests cover public access without login, key validation, real quota RPC denial for guests/teachers, admin setting boundaries, pause, zero disabling, concurrent admissions, global exhaustion, hashed network identities, provider failures/no retries, and rejection of invalid output/over-awarded points. Existing signed-in authorization/transaction/scoring tests remain in the suite.

No browser was available (`cua.listBrowsers()` returned an empty list). Guest interaction, keyboard/mobile layout, hardware camera, CSV downloads and real-provider photo evaluation remain unverified. Validate TRUE/True/true images, restarts/long answers, unreadable keys, quota reset, app pause and multi-client limits before production release. Provider retention/data handling must be checked for the intended account; no deletion promise is made about provider systems.

Rollback: disable `QUICK_CHECK_ENABLED` or set admin guest limit to zero, then restore the previous frontend/function artifacts. Leave additive schema/counters in place; no teacher grades need migration or rollback. Requests already admitted may finish. Retest the signed-in checking workflow. No live rollback was rehearsed.
