# Admin scope and acceptance

Authorized: account management, aggregate usage analytics, and a global pause to protect AI credits. React routes and Supabase RPCs extend the existing stack without new services.

- ADM-1: Only manually provisioned admins may list/search accounts and suspend/restore teachers. No account deletion, role editing, or access to teachers' exam records. Admin accounts cannot be suspended through this UI.
- ADM-2: Dashboard shows account, class, session, paper and reader-request totals, plus daily requests for the last 30 UTC days. Requests include failed recognition calls; they are not token or monetary cost measurements.
- ADM-3: Admin can pause/resume teacher activity globally. Existing sessions must also lose database/RPC access and no subsequent provider attempt may start after a pause is observed. Already dispatched requests can finish.
- ADM-4: Server authorization denies ordinary/anonymous users admin RPCs and protects privileged tables from direct writes. Record admin mutations transactionally.

Implementation: protected account-control/settings tables, restricted security-definer RPCs, restrictive policies on existing data, active-account checks in existing privileged save/quota RPCs; admin route and shared access status. Bootstrap via SQL only. Preserve owner policies. No live deployment is authorized.

QA mapping: ADM-1/4 database authorization and escalation tests; ADM-2 aggregate/zero-filled dates tests; ADM-3 pause, suspension, existing RPC and resume tests. Run repository lint, tests, edge checks and build. Live Supabase and browser checks remain separate evidence gaps unless actually performed.

## Verification — 2026-10-18

`npm.cmd run verify` passed: reader bundle freshness, lint, 46 tests, Deno checks for both Edge Function variants, TypeScript and Vite/PWA production build. Database tests run against synthetic PGlite data; provider tests use mocked HTTP responses. They cover denial of ordinary admin calls and privilege escalation, aggregate totals and 30 daily buckets, account suspension/restoration, global pause/resume, existing atomic saves/quota enforcement, and preventing paid retries/fallbacks after pause.

Not verified: browser layout/interaction against a running backend, live Supabase migration/roles, Google sign-in with a provisioned admin, and real provider billing. No live database, deployment, or external account was changed.
