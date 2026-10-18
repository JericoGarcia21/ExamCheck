# Code audit report

Resolution update (2026-10-18): A1–A4 were addressed after this audit. Full
`npm.cmd run verify` passed with 40 tests, lint, reader bundle freshness, Edge
Function checks, and production/PWA build. See [IMPROVEMENTS.md](IMPROVEMENTS.md)
for changes and remaining acceptance checks. The findings and original check
results below are retained as the pre-fix record.

Date: 2026-10-18. Reviewer: Codex using `.agents/skills/code-audit/SKILL.md` and the toolkit report template.

Scope: current working tree based on revision `47d22f62d3dd3ad96bbc10cbc249e64dcb92b52b`, including the newly installed engineering kit. Reviewed authentication and query lifecycle, answer-key parsing, recognition validation and handler, scoring/review, submission saving, results/export, roster operations, migrations, and existing tests. Intended behavior: teacher-controlled grading, preserved saved decisions, accurate results, and reproducible local verification. Existing changes to PRODUCT.md and QA_REPORT.md were left intact. No application implementation was changed.

## Verified defects

Reverified on 2026-10-18 against the current working tree: A1–A4 are
resolved. Their fixes were already present when this follow-up began; no
additional application changes were needed. The original findings below remain
as historical evidence.

| ID | Current resolution | Verification evidence |
| --- | --- | --- |
| A1 | Results use `percentageFor` without rounding before `remarkFor`; formatting is separate. | Regression cases cover 74.5, 74.999, 75, and 75.001 percent and exported remarks. |
| A2 | Saved-result queries load final/calculated scores; `restoreSavedResult` restores the final override during recalculation. | Regression cases cover unchanged and changed answers, legacy calculated-score fallback, and a zero override. Authenticated browser interaction remains unverified. |
| A3 | Null-question violations render as advisory without a penalty button; the toggle handler also rejects them. | Server-rendered regression verifies advisory text and absence of Mark wrong; assigned violations retain the action. Interactive browser behavior remains unverified. |
| A4 | `.oxlintrc.json` excludes `.engineering-kit/**` and `.agents/**` reference material. | `npm.cmd run verify` exited 0: reader bundle freshness, lint, all 42 tests, Edge Function checks, TypeScript and production/PWA build passed. |

| ID | Severity | Confidence | File:line | Impact / evidence | Remediation / retest |
| --- | --- | --- | --- | --- | --- |
| A1 | P2 | High | `src/services/resultsService.ts:83`; `src/lib/grading.ts:12` | Results round percentages before applying the 75% pass threshold. A score of 74.5/100 becomes 75% and receives Passed; session pass-rate statistics and exports inherit that decision. Executed a local reproduction using the real remarkFor function. | Keep the raw percentage for grading and statistics; round only display text. Test just below, at, and above 75%. If rounding before grading is an intentional school policy, make that policy explicit instead of presenting a strict 75% threshold. |
| A2 | P2 | High | `src/pages/SessionPage.tsx:112`; `src/pages/SessionPage.tsx:458`; `src/pages/SessionPage.tsx:511` | Editing an existing result cannot restore its teacher-adjusted final score: the submission query selects only id, selecting a student clears scoreOverride, and recalculation restores answer-level points only. Example: save answer points totaling 8/10 with final score 9/10; reopen, recalculate without changes, and save with the default blank override. The save path at line 330 writes 8/10, replacing 9/10. Established by tracing query, state, recalculation, and save code; no authenticated UI reproduction was run. | Load the saved final and calculated scores, preserve the teacher override when editing, and make resetting an override explicit. Cover unchanged recalculation and changed-answer edits with an existing override. |
| A3 | P2 | High | `src/components/session/PaperResultCard.tsx:105`; `src/pages/SessionPage.tsx:169` | Every rule violation has an enabled Mark wrong button, including violations with question_number null. Clicking it sets applied and displays Marked wrong, while effective scoring explicitly filters null question numbers out. The teacher sees a claimed penalty that never affects the saved grade. Reproduced the label/filter logic locally; traced the affected score and save path. | Require a valid question selection before applying a penalty, or make unassigned violations advisory with an accurate label and no penalty action. Verify that each applied penalty affects exactly the intended answer. |
| A4 | P2 | High | `package.json:9`; `.engineering-kit/scripts/package-smoke.mjs:22`; `.engineering-kit/scripts/validate.mjs:28` | Installing the kit breaks the project verification command: unscoped oxlint now checks its reference scripts and fails on one unused variable and two unnecessary escapes (validate.mjs lines 28 and 69). npm run verify stops before tests, Edge Function checks, and build. Reproduced on this tree. | Scope product lint to application/configuration/test paths or exclude the reference toolkit, keeping toolkit checks separate. Run the complete verification command afterward. |

P2 means a concrete issue to fix in normal development; ordering prioritizes grading correctness and preserving teacher decisions.

## Checks executed

- `npm.cmd run verify`: FAILED at lint with the three toolkit warnings above; generated dashboard reader bundle check passed first.
- `npm.cmd test`: PASSED, 35 tests including isolated PGlite migrations, authorization, rollback, fractional grades, quota, parsing, imports, and mocked recognition-handler behavior.
- `npm.cmd run check:edge`: PASSED for both handler entry points.
- `npm.cmd run build`: PASSED, including TypeScript, Vite, and PWA service worker generation. Precache output: 50 entries, 1603.82 KiB. This is build output, not a runtime performance measurement.
- Scoped oxlint over `src`, `scripts`, `tests`, and `vite.config.ts`: PASSED.
- Node reproduction using the real grading module: 74.5/100 produced percentage 75 and remark Passed.
- Local rule-action reproduction: applied null-question violation produced label Marked wrong and zero penalized questions.

PowerShell blocked the initial npm.ps1 invocation; npm.cmd worked without changing execution policy. An initial inline Node reproduction lost its import quotes through shell argument handling; rerunning through standard input succeeded. No checks were reported as passed based on those failed invocations.

## Suspected risks and coverage gaps

- No live Supabase project, OAuth, Gemini request, deployment, or real student data was accessed. Handler tests mock network responses and do not establish current provider/model availability.
- No browser acceptance, hardware camera, mobile layout, keyboard/focus, contrast, install/offline, or update-flow testing was performed. Accessibility cues were inspected in source only; this is not a full accessibility audit.
- Current tests do not exercise the React saved-result editing flow or rule-action UI. Those gaps explain why the passing suite does not resolve A2/A3.
- Dependency manifests and lazy loading were inspected, but no current advisory database audit or external dependency research was performed. No claim is made that dependencies are vulnerability-free.
- Database evidence comes from local synthetic PGlite identities and migrations, not the deployed schema or grants. Archive/restore and owner isolation tests passed locally.
- No measured runtime performance bottleneck was established; no performance fix is recommended on speculation.

## Optional improvements

- Add focused workflow regression coverage for saved final-score overrides and rule penalties, along with threshold boundary tests.
- Document the institution's percentage rounding policy and distinguish displayed percentages from grading decisions.

## Next action

Implement A1–A4 in small changes, then rerun full verification and perform authenticated browser acceptance for saved-result editing and rule penalties. Confirm the rounding policy with the project owner before treating rounded percentages as the intended grading rule. No deployment is part of this review.
