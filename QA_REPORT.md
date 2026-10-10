# ExamCheck QA review

Date: 2026-10-10

## Remediation status — 2026-10-10

The findings below are the original review. Source fixes have been implemented in priority order and covered by the new verification suite. Migrations 0006/0007 and the updated reader/frontend have NOT been deployed to live Supabase. Browser/mobile acceptance remains pending.

- P1: result identity, atomic saves, code comparison, parser correctness, review lifecycle, numeric final scores, and student/session class enforcement implemented.
- P2: roster preview/validation, shared AI response validation, user authentication, limits/timeouts, recoverable query/mutation errors, and safe CSV serialization implemented.
- P3: camera upload/quality, accessible review modal, explicit PWA update prompt, strict TypeScript, Deno checking, automated regressions, and CI workflow added.
- Production SheetJS upgraded to the official 0.20.3 distribution; production audit reports zero vulnerabilities. Seven development-only advisory entries remain in the component-generation CLI dependency chain; its underlying braces advisory has no upstream patched release.
- Existing grades are preserved. No live database or student records were changed.
- Rollout steps and known limits are documented in README.md.

## Verification after remediation

- `npm run verify`: PASS.
- Regression tests: 30 PASS (11 local PostgreSQL/RLS/transaction tests, 11 grading/import/export/validation tests, 8 reader-handler tests with mocked upstream services).
- Strict TypeScript: PASS.
- Edge Function Deno check: PASS.
- Lint: PASS, zero errors and zero warnings.
- Production build and service-worker generation: PASS, no build warnings.
- `npm audit --omit=dev --audit-level=high`: PASS, zero production vulnerabilities.
- Git whitespace check: PASS.
- CI workflow added; a hosted CI run has not been performed in this session.
- Live database deployment, OAuth/provider calls, and browser/device acceptance: NOT VERIFIED.

## Pending live acceptance checklist

Use synthetic records in a named test class and record the device/browser and outcome.

1. Sign in as Teacher A; create a class, preview/import a roster with headers and duplicates, and confirm a multipart key with numeric answers.
2. Capture or upload a paper; switch students before/during reading and verify no result can be saved under the wrong student. Try duplicate capture/save clicks.
3. Accept/edit low-confidence, missing, coding, and essay answers. Verify final save remains disabled until all review is resolved and does not reopen accepted items.
4. Save a fractional essay grade and a teacher-adjusted final score; reload and verify class results, per-answer breakdown, and Excel/CSV/PDF exports.
5. Interrupt the network during recognition and saving; verify useful recovery and preservation of previously saved answers. Retry and verify one submission per student.
6. Sign in as Teacher B and verify Teacher A's roster/results are inaccessible; verify anonymous reads and writes are denied in the deployed project.
7. Test camera denial, retake, upload limits, rotation, and handwriting recognition on target phones. Check keyboard focus/labels and horizontal overflow on small screens.
8. Install the PWA, reload offline, reconnect, and trigger an update with unsaved grading work. Verify the update waits for explicit reload.
9. Confirm deleted-student/session warnings explain historical-grade loss; use only disposable synthetic records for deletion checks.
10. Inspect browser console/network and deployed function logs for errors and sensitive response content.

## Assessment

Feature phases are implemented, but this review does not support production QA sign-off. Resolve the P1 grade integrity and persistence findings before relying on real grades.

Scope: source review of frontend, services, SQL migrations, Edge Function, import/export, and PWA configuration; local TypeScript/build/lint execution; direct execution of scoring and parser edge cases. No application source or database changes were made.

## Verification

- TypeScript (tsc -b): PASS.
- Production build (vite build): PASS, including service-worker generation.
- Lint: 0 errors, 5 warnings (two Fast Refresh exports, two unused icon-script variables, one set-state-in-effect warning).
- Build warnings: __dirname incompatibility with a future native config loader; deprecated advancedChunks configuration.
- Automated tests: no test script or test suite found in repository inventory.
- Runtime reproductions: three defects reproduced below.
- Browser workflow, responsive layout, console/network behavior, camera hardware, OAuth, deployed Edge Function, and live RLS: NOT VERIFIED. No browser is available through the enabled UI tool. Local preview was stopped afterward.
- Frontend type checking excludes supabase/functions; a passing frontend build does not validate the Deno function.
- No production records were created, modified, or deleted; no paid AI calls were made.

## P1 — fix before real grading

### 1. A paper can be saved to a different selected student

Evidence: src/pages/SessionPage.tsx:389 only changes selectedStudent and selectedStudentName. It leaves paperResult, preview, overrides, violations, and active recognition in place. handleSaveResult at line 285 uses the current selectedStudent.

Trigger: select A, read A's paper, select B, save. A's result remains available and is saved under B. Switching while recognition is running can produce the same mismatch when the response arrives.

Recommendation: bind each capture/result to a student and session identity; clear paper state on selection changes; cancel or ignore stale recognition responses; disable selection and repeat capture/save while operations are pending. Validate result ownership again before saving. Add regression cases for switching before and during recognition.

Evidence level: source-confirmed flow; browser reproduction pending.

### 2. Save operations can destroy existing answers or leave incomplete results

Evidence: src/services/submissionService.ts:37-73 updates the submission, deletes its old answers, and inserts new answers in separate requests. src/services/sessionService.ts:52 similarly deletes answer keys before replacement insertion.

Failure: if the final insert fails or the network drops, a checked submission can have a new score and no answers; a draft answer key can be lost. Concurrent saves can race. The Save result button has no pending guard.

Recommendation: use authenticated transactional database RPCs for result replacement and answer-key replacement; retain old state on failure, validate payloads before mutation, and make saves idempotent. Test failure after each write and concurrent retries.

Evidence level: source-confirmed failure paths; live database fault injection pending.

### 3. Code normalization gives incorrect code full credit

Evidence: src/lib/scoring.ts:53 lowercases code and removes parentheses, braces, semicolons, and whitespace before comparison.

Executed reproduction: key 'return a + b * c;' versus student 'return (a + b) * c;' receives 1/1, is_correct=true, needs_review=false. These expressions have different grouping and can calculate different results. Removing case and syntax can also erase meaningful distinctions in programming languages.

Recommendation: preserve meaningful syntax and case. Prefer exact comparison with narrowly defined safe formatting normalization; send ambiguous variants for teacher review rather than awarding automatic credit.

Evidence level: runtime reproduced.

### 4. Answer-key parsing silently discards or changes valid answers

Evidence: src/lib/answerKey.ts:60 permits a numeric prefix with no required delimiter; line 67 preserves printed numbers when there are no headings; the final Map silently keeps the last duplicate.

Executed reproduction A: '1. A / 2. B / 1. True / 2. False' on separate lines produces only two answers, True and False. Earlier questions disappear.

Executed reproduction B: bare answers '42 / 3.14 / 2026' become Q4='2', Q3='14', Q202='6'.

Recommendation: require an explicit numbering delimiter; preserve bare numeric answers; follow the documented sequential reading-order contract or require an explicit numbering mode. Reject duplicate/gapped identifiers rather than silently overwriting them. Align recognition numbering with the accepted key. Test restarted sections, numeric answers, and multiline coding/essay content.

Evidence level: runtime reproduced.

### 5. Review status is inconsistent and uncertainty can appear finalized

Evidence: useAnswerReview.ts:64 marks an answer accepted, but needs_review is cleared only in edit mode at line 83. Its queue and SessionPage's reviewCount use needs_review/low confidence without excluding accepted answers. resultsService.ts:82 reads only needs_review. Scoring marks coding mismatches/essays for review, but not ordinary low-confidence answers. saveSubmission always sets status='checked'; Save result remains available with unresolved review items.

Consequences: accepting an essay can leave it marked for review forever; a low-confidence multiple-choice answer can be saved and exported without a review remark. Editing a low-confidence answer retains its low confidence and can keep it in the review queue. Essay AI suggestions can be included in a saved score without individual approval.

Recommendation: define one authoritative unresolved-review predicate and lifecycle shared by UI, save, results, and export. Acceptance/editing should resolve teacher review while preserving original AI confidence separately. Support explicit draft saves for unresolved items and require teacher approval before finalizing grades.

Evidence level: source-confirmed inconsistent state.

### 6. Database grade types conflict with supported fractional points

Evidence: 0001_init.sql:55 defines submissions.score as int; 0004 adds numeric answer points. The scoring function and review inputs accept fractional essay points, and the override handler accepts fractional final scores.

Consequence: fractional totals cannot be represented faithfully by the submission column; persistence can reject or coerce values depending on the write path.

Recommendation: decide whether fractional grades are supported. If yes, migrate final scores to an appropriate numeric type and validate finite values and bounds. If no, consistently reject fractional values in UI and backend. Test saving/reloading a 2.5-point grade and exporting it.

Evidence level: schema/source mismatch; live serialization behavior unverified.

### 7. Submission policies do not enforce student/session class consistency

Evidence: 0001_init.sql:124 authorizes submissions by the session's class owner. student_id is a separate foreign key; no constraint or policy checks that its class matches the session class.

Consequence: direct API writes can reference a student from another class, potentially another teacher's class if the ID is known. This is an integrity and authorization gap; it does not establish that another teacher's roster can be read.

Recommendation: enforce student.class_id = session.class_id at the database boundary and test Teacher A / Teacher B, same-teacher different-class, and unauthenticated writes. Enforce confirmed answer-key immutability server-side too: current answer-key policies permit owner updates even after the UI locks the key.

Evidence level: migration review; deployed policies may differ and require inspection.

## P2 — reliability and security improvements

### 8. Spreadsheet import selects arbitrary text and immediately saves

Evidence: ClassDetailPage.tsx:95-117 chooses the first alphabetic string in each row, without a header mapping, preview, file-size check, or existing-roster duplicate filtering. Paste import does filter existing names, but spreadsheet import does not.

Trigger: a CSV with 'Student ID,Name' can import the header as a student; an alphanumeric ID column can be chosen instead of names; importing the same file again can duplicate the roster.

Recommendation: validate file size/type, detect or select a name column, show preview and rejected rows, check duplicates against the roster, then confirm import. Avoid treating names alone as universally unique student identities. Decide how alphabetical display numbers should be maintained after imports, renames, and deletions: current stored numbers can differ from display/export ordering.

### 9. AI request/response validation and cost controls are incomplete

Evidence: read-answers/index.ts:135 validates only truthiness of imageBase64 and totalItems. Response parsing at line 199 does not require integer/unique/in-range question IDs or valid answer strings. Missing confidence can be replaced by 85% based solely on answer format. No explicit user validation, per-user limits, image-size limits, or fetch timeout exists inside the function. Gateway authentication configuration is not present in the repository and is unverified.

Recommendation: validate method, authenticated user, bounded image bytes/MIME, rules length, keys, and question count before provider calls; validate structured AI output and reject duplicates/out-of-range identifiers; treat missing confidence as uncertain; flag missing questions. Add timeout and per-user usage limits. Inspect actual gateway/JWT settings rather than assuming the function is public or protected. Return safe errors and avoid logging complete recognized student responses (line 258 currently logs model output on parsing failure).

### 10. Several failures have no useful UI recovery

Evidence: SessionPage queries do not expose loading/error state; ClassDetailPage queries and delete/rename/session mutations omit error presentation. New-session submission closes the dialog and clears text immediately, before mutation success. SessionResultsPage does not show per-answer query errors.

Recommendation: surface safe error and retry states, retain entered values until success, distinguish loading from failure, disable repeated requests, and invalidate all affected results/answer queries after saves.

### 11. CSV formula-like values are not neutralized

Evidence: src/lib/export.ts:64 escapes CSV quotes/commas/newlines but leaves user-controlled cells starting with '=', '+', '-', or '@' unchanged.

Recommendation: apply a documented spreadsheet-safe serialization policy to text cells and verify exports with target spreadsheet software. Add tests for quoted names, carriage returns, non-ASCII names, and formula-like text. Keep grade values numeric.

## P3 — polish and release evidence

### 12. QA automation and mobile/PWA evidence are missing

No committed automated tests or CI verification workflow was found. The phase checklist's 'all QA checks passing' claim is stronger than the available reproducible evidence.

Recommendation: add focused scoring/parser/import tests, transactional persistence tests, two-teacher RLS tests, and one end-to-end synthetic-roster workflow. Enable TypeScript strict checks and add a separate Deno function check. Resolve lint/build warnings.

Before release, test OAuth cancellation/expiry, network loss during recognition/save, duplicate clicks, phone camera denial/orientation, real handwriting quality at the current 896px/JPEG 0.7 compression, keyboard labels/focus, install/offline behavior, and update behavior during unsaved grading. CameraCapture provides camera capture only, despite documentation claiming paper upload; either add upload or correct the feature claims. Make deletion warnings explain that deleting a student cascades to historical submissions/answers. Record device/browser and test results in phases.md without claiming unperformed checks.

## Recommended order

1. Student/result identity, atomic persistence, parser and coding correctness.
2. Review lifecycle, fractional-score policy, database class/ownership constraints.
3. Import validation, AI validation/authentication verification, retry/error handling, safe exports.
4. Automated regression suite and authenticated mobile/PWA acceptance testing.

Production acceptance: no unresolved P1 findings; failed saves preserve prior records; final grades are teacher-approved and reload/export consistently; invalid student/session combinations are rejected; the synthetic end-to-end workflow and two-teacher authorization tests pass.

## Dashboard deployment follow-up

The dashboard deployment failed because the uploaded entry referenced an absent
`../_shared/validation.ts`. Added a generated, self-contained
`supabase/functions/read-answers/dashboard.ts` for copying into the editor.
The canonical handler and shared validation remain maintained in their original files.
Bundle freshness is enforced by verification, and reader-handler tests now exercise
the actual dashboard artifact. All 31 tests, lint, Deno checks, and build pass.
Live redeployment has not been performed by this agent.
