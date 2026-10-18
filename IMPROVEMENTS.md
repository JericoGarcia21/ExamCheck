# Audit fixes and verification

Implemented 2026-10-18 following the code-audit, debugging, frontend-engineering,
qa-testing, and documentation skills. Scope: the four findings in
[CODE_AUDIT_REPORT.md](CODE_AUDIT_REPORT.md). Existing architecture and database
contracts were retained. No dependency additions, migrations, or deployment were
needed. Existing user edits in PRODUCT.md and QA_REPORT.md were preserved.

## Requirements and implementation

| Finding | Cause and change | Acceptance evidence |
| --- | --- | --- |
| A1: incorrect pass threshold | Results rounded before grading. `percentageFor` retains the raw value; results and exports format it separately. The existing 75% threshold now applies to the raw percentage. | Boundary checks below, at, and above 75%, including 74.5/100 and fractional ratios; export remarks agree. |
| A2: lost final-score override | Saved-result loading omitted the final score. It now loads score and calculated_score. `restoreSavedResult` retains a saved override, restores unchanged reviewed answer points and feedback, and requires review for changed answers. | Unchanged and edited answers, low original confidence, legacy null calculated_score, zero override, and no-override cases. |
| A3: ineffective rule action | A null-question violation could claim to apply a penalty while scoring ignored it. Such violations now show advisory text, with no penalty button. State handling also refuses to toggle them. | Real component server rendering checks advisory text and absent penalty action, while assigned violations retain the action. |
| A4: verification blocked by toolkit lint | Product lint scanned newly installed toolkit reference scripts. Oxlint excludes `.engineering-kit/**` and `.agents/**`, retaining existing lint rules for product code. | Full verification now completes successfully. |

The saved final-score override is an absolute score, matching the existing input.
When answer text changes it stays visible until the teacher edits it or clears it
to use the system score. It is not automatically converted to a relative bonus.
Legacy submissions without calculated_score use saved answer points as their
available baseline. Previously stored grades are not rewritten by these changes;
their displayed pass/fail remarks are derived using the corrected threshold.

## Executed checks

Environment: Windows PowerShell, Node.js 24.14.1, local working tree based on
`47d22f62d3dd3ad96bbc10cbc249e64dcb92b52b` plus these changes.

`npm.cmd run verify` — PASS:

- Reader dashboard bundle matches its source.
- Product lint passes with warnings denied.
- 40 tests pass, zero failures (35 existing plus five focused regression tests).
- Both Deno reader entry points type-check.
- TypeScript, Vite production build, and PWA generation complete.

The existing test loader now transpiles TSX with the automatic React JSX runtime
so the rule-action test renders the real component using React's server renderer.
No new test framework was introduced. Database authorization, atomic rollback,
review validation, quotas, and archive tests still pass with isolated synthetic
PGlite data. Network calls in reader tests remain mocked.

## Browser acceptance still required

These checks were NOT VERIFIED in an authenticated browser:

1. Save an 8/10 answer total with a 9/10 teacher final score. Reopen, recalculate,
   and save unchanged: confirm the final score remains 9/10.
2. Edit an answer in that result: confirm review is required and the final-score
   field still shows 9. Clear the field to explicitly use the system score.
3. Confirm a violation with no question displays advisory text, and an assigned
   violation changes only its question's points when applied and restores them
   when removed.
4. Confirm result tables and downloaded exports classify 74.5/100 as Failed and
   75/100 as Passed. Very close percentages may look identical after display
   rounding; the underlying precise value determines the remark.
5. Check keyboard navigation, mobile layout, camera capture, OAuth, PWA updates,
   and live save failure/retry behavior before release.

No live services, real student data, current dependency advisory database, or
runtime performance measurements were part of this implementation. The project
owner remains responsible for any institution-specific rounding-policy change
and live release acceptance. Existing API authorization was not modified.
