# Guest Quick Check requirements

Status: proposed, 2026-10-20. Owner: project owner. Requirements only; implementation and deployment are not approved by this document.

Follow-up: the user subsequently requested implementation and specified a default of five scans with an admin-editable allowance. See `implementation.md` for the built scope, resolved input decisions, server enforcement and remaining release checks. Deployment has not been authorized or performed by this implementation task.

## Outcome and existing behavior

Confirmed request: visitors can upload an answer key, upload or photograph an answer sheet, and check it without logging in. Treat this as an additional Quick Check workflow; retain the existing signed-in classes, sessions, and saved results.

Repository evidence: `src/App.tsx` protects current checking routes with `RequireAuth`. `read-answers/index.ts` requires a verified bearer user, an authorized confirmed key, and user quota before provider calls. `answerKey.ts`, `scoring.ts`, image preparation, camera capture, and review components offer reuse. Current answer-key entry parses text; photo-to-key extraction would be new behavior. Removing the existing login guard alone cannot provide working guest checking.

## Proposed MVP

| ID | Workflow and observable result | Priority | Verification |
| --- | --- | --- | --- |
| QC-01 | An unsigned visitor opens a public Quick Check entry without registration, class creation, or a student roster. Existing account workflows remain available. | MVP | AC-01 route test |
| QC-02 | Visitor supplies an answer key, reviews editable numbered answers/types/points, and confirms 1–300 valid items before checking a sheet. Paste/edit text is the fallback. Photo upload is proposed pending input decision D1. | MVP | AC-02 input and extraction tests |
| QC-03 | Visitor uploads a JPEG/PNG/WebP answer-sheet image or uses the camera. Apply existing client limits: nonempty, at most 5 MiB, at most 40 megapixels; server independently enforces request/image limits. | MVP | AC-03 boundary tests |
| QC-04 | One explicit Check action reads one sheet against the confirmed key. Show progress, score/total, written answers, correct answers, and awarded points. Require a key reconfirmation after key edits before the next check. | MVP | AC-04 journey test |
| QC-05 | Preserve written case and existing grading/review rules. Under an explicit uppercase-only rule, TRUE may pass while True/true receive zero. Unreadable answers remain wrong and flagged for review; uncertain answers and essays remain advisory until reviewed. | MVP | AC-05 scoring/review tests |
| QC-06 | Keep key/results in current-page memory; no account record, saved history, or app database image storage. Check another sheet reuses the confirmed key and clears the previous sheet/result. Reset clears all guest content; refresh loses it, disclosed in the UI. | MVP | AC-06 lifecycle test |
| QC-07 | Guest can review/correct recognition and see recalculated points before treating the result as final. Changing the source sheet invalidates the prior result. Overall rule checks still require review. | MVP | AC-07 review/state test |
| QC-08 | Before any paid provider call, the server validates guest admission, input bounds, per-guest quota, a global daily budget, and the app pause state. Repeated clicks cannot cause concurrent requests for one active operation; stale replies cannot overwrite a newer sheet. | MVP | AC-08 concurrent and abuse tests |
| QC-09 | Invalid input, quota exhaustion, provider failure, and network loss show a useful recovery action, retain the confirmed key, and never fabricate a successful score. No automatic UI resubmission of paid work. | MVP | AC-09 failure tests |
| QC-10 | Guests cannot read or modify teacher classes, students, sessions, keys, submissions, or admin functions, including via forged IDs or direct API calls. Provider secrets stay on the server. | MVP | AC-10 authorization tests |

## Permissions and privacy

Guests may process only the key and sheet they submit in their temporary workflow. Public checking must not weaken existing account authentication or RLS. Infrastructure may retain bounded abuse-control counters; these must not contain image content or student answers. Application logging must omit image payloads, answer text, and credentials. Disclose that submitted images are sent to the configured AI provider; provider retention terms need verification before release. Do not promise deletion from provider systems.

## Nonfunctional requirements

- Reuse parsing, deterministic scoring, image processing, and review behavior where practical. Do not duplicate the complete session workflow.
- File selection, confirmation, checking, review, and reset must be keyboard accessible with labelled controls and announced progress/errors.
- Proposed reader deadline: retain the existing 90-second request deadline, then offer explicit retry. No response-time improvement is claimed or promised without a representative photo workload.
- Guest checks must fail closed if admission, quota, budget, or pause checks are unavailable. Client storage or IP alone must not be treated as a reliable person identity.
- Exact quota accounting and provider-attempt caps must be documented before implementation; retries/fallbacks must remain inside the budget.

## Decisions and scope boundaries

| Decision | Proposed default | Status and impact |
| --- | --- | --- |
| D1: answer-key input | Photo upload plus paste/edit fallback; always confirm extracted text | Asked user; affects extraction endpoint, cost, and acceptance scope. No existing key-photo OCR is assumed. |
| D2: free guest allowance | Small daily limit funded by app owner | Asked user; numeric allowance and global budget still require owner decision before paid public access is enabled. Both key-photo extraction and sheet reading must count. |
| D3: temporary storage | Page memory only; no saved guest history | Proposed assumption; minimizes implementation and data retention. |
| D4: account experience | Add Quick Check alongside current login | Proposed assumption based on request; removing account features is excluded. |

Optional later: result download, batch photos, multi-page sheets, saved guest keys, conversion into an account session. Excluded from MVP: PDF/Word/Excel key ingestion, offline AI recognition, new billing, and deployment.

Readiness: suitable for architecture planning. Resolve D1 and D2 and select a viable anonymous admission/rate-limit design before significant implementation. No weakening of the authenticated reader is authorized. Feature slice: public entry/key confirmation → guest reader with abuse limits → shared scoring/review → failure and authorization verification.
