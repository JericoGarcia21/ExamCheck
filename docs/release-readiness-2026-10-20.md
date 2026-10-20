# Release readiness — 2026-10-20

Recommendation: **NO-GO for production**. One reproduced correctness defect and required acceptance/operational gaps remain. No exceptions have been accepted and no deployment is authorized.

## Candidate and scope

Assessed at approximately 19:30 Asia/Manila on 2026-10-20, Windows, Node v24.14.1. Candidate is the local working tree based on `e879d97807480ec2e452420b9f99b4d5640b7b14`, not that commit alone. Exact product-source/config/test inputs are recorded in `release-candidate-2026-10-20.sha256`. The manifest excludes environment files and unrelated engineering-kit changes. Documentation is not part of the deployable artifact.

Scope: uppercase-rule enforcement, recognition prompt preserving written case, results UI/filtering, and RF labels in results/review/export. Guest Quick Check is requirements-only and excluded. The standalone camera HTML shared in conversation was not added to this application. No dependency or database migration changes are in the assessed diff.

Target: intended frontend host plus Supabase reader; exact project, URL and currently deployed revision were not supplied or verified. Accountable release/operations owner: project owner, individual not assigned. Assessment/evidence collection: Codex. No live systems were accessed.

## Gates

All evidence below is from 2026-10-20 on this candidate unless labelled otherwise.

| Gate | Required | Status | Evidence / next action | Owner |
| --- | --- | --- | --- | --- |
| Acceptance: strict uppercase | Yes | FAIL | Reproduction below: combined rules allow mixed-case credit. Correct rule interpretation and add regression coverage. | Engineering |
| Automated QA/build | Yes | PASS | `npm.cmd run verify` exited 0: 58/58 tests, no skips; lint, generated-reader consistency, Deno checks, TypeScript, Vite and PWA build passed. `git diff --check -- src supabase tests` exited 0; only line-ending notices. | Engineering |
| Security regression | Yes | PASS | Current local tests cover synthetic owner isolation, denied anonymous writes, quota, malformed requests, transaction rollback and reader authorization. `verify_jwt = true` in local config. This is bounded regression evidence, not a complete security audit. | Engineering |
| Production security/configuration | Yes | NOT VERIFIED | Exact target, deployed JWT configuration, provider secret delivery, runtime configuration and dependency advisory triage were not checked. Older README audit claims are not current evidence. | Release owner |
| UI/accessibility | Yes | NOT VERIFIED | Static rendering tests pass. Earlier browser discovery returned no browsers; responsive visual inspection, interactive filters, focus/keyboard and contrast checks have not run. | QA |
| Camera/provider acceptance | Yes | NOT VERIFIED | Reader tests mock provider output. Test real TRUE/True/true photographs, low-confidence handwriting, camera permission denial and upload fallback on representative devices. | QA |
| Scope and release artifact | Yes | NOT VERIFIED | Guest feature is excluded, but the candidate is uncommitted and target is unspecified. Isolate product changes from unrelated kit edits and identify an immutable release artifact. | Release owner |
| Documentation accuracy | Yes | FAIL | `docs/checking-review-contract.md` still says rules never change individual scores; uppercase enforcement now does. Update before release. | Engineering |
| Recovery | Yes | NOT VERIFIED | No previous deployed frontend/reader artifacts or rollback rehearsal supplied. Use the paired rollback plan below after identifying target and artifacts. | Operator |
| Operations/monitoring | Yes | NOT VERIFIED | No named operator, alert destination or deployed error/quota dashboard verified. Observe synthetic check, provider errors, quota denials and save failures during rollout. | Operator |
| AI cost/privacy | Yes | NOT VERIFIED | Mock tests exercise authorization, quota and pause-before-paid-call behavior. Real case-preservation accuracy, provider retention and production limits remain unverified. | Release owner |
| Deployment authorization | Yes, before deployment | NOT VERIFIED | Assessment requested; deployment authorization was not given. | Project owner |

Not applicable to this incremental release: new schema migration or data conversion, because neither is changed. Database restore rehearsal is not newly required by this diff; existing backup/restore readiness is unknown. Performance optimization is excluded: no measured bottleneck or performance target was supplied, and no speed improvement is claimed.

## Reproduced blocker

Using Node with the repository TypeScript loader, call `calculateScore` with one true/false key `TRUE`, student answer `True`, confidence `0.99`:

| Rules | `requiresUppercase` | Score | Expected |
| --- | --- | --- | --- |
| Uppercase letters only | true | 0 | 0 |
| No erasures, uppercase letters only | false | 1 | 0 |

Cause: `requiresUppercase` splits sentences/newlines but not comma-separated clauses; any `no` in that segment suppresses the uppercase instruction. This is directly relevant to the user's strict-rule requirement. Existing tests use a newline between these two rules and do not cover this combined form. Product code was not altered during this assessment.

Additional review risk: the answer review dialog still enables manual points for any answer above one point, while its submit hook now treats only essay keys as point-editable. Weighted objective answers need an interaction check to ensure visible controls match submitted behavior.

## Rollout/recovery plan requiring validation

1. Name the target and operator, resolve the grading/documentation failures, then rerun verification on a frozen candidate. Complete browser/device/provider acceptance or record a specific owner-approved exception with expiry and remediation; no exception is assumed here.
2. Record the currently deployed frontend build, reader source/prompt and schema revision; retain both old artifacts. Confirm installed PWA update behavior and signed-in access on the actual target.
3. After separate deployment authorization, deploy the matching reader and frontend during a controlled window. No migrations are required by this candidate. Keep JWT verification enabled.
4. Run synthetic checks before real grading: uppercase pass/mixed-case rejection, teacher review/override, final save/reopen and export RF labels. Confirm unauthorized access remains denied.
5. Stop rollout on any incorrect synthetic score, authorization regression, inability to save/reopen, or sustained reader errors beyond the agreed baseline. Numeric operational thresholds must be set from the target's baseline before rollout.
6. Roll back frontend and reader/prompt together to the recorded prior artifacts; verify PWA refresh and synthetic workflow again. No schema rollback is planned. Previously saved grades are not automatically recalculated or repaired by rollback; identify affected submissions and have their owner review them explicitly.

No production configuration changes, real-image provider calls, deployment, rollback, or data repair occurred during this assessment.
