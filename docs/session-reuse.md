# Session reuse and editing

Date: 2026-10-19. Authorization: user requested copying an exam session/key to
another class without its roster, and editing created records. No live migration
or deployment is authorized by this implementation.

## Requirements and implementation

- Open a session and choose **Copy to class**. Select an active destination class
  and a session name. Same-class copying is also supported for revised exams.
- Copy only the saved answer key, types, maximum points, rubrics and rules. New
  IDs, today's date, unconfirmed key and in-progress status are assigned. Students,
  paper captures, submissions, scores and answer reviews are never copied.
- A copied key is an independent draft. Choose **Edit saved answer key**, change
  answer text/type/essay points/rubric, save, and confirm before checking papers.
  Pasting a replacement key still supports adding/replacing questions.
- Class detail has **Edit class** for block name and academic year. Session has
  **Edit session** for name and exam date. Existing student-name Edit is retained.
- **Edit confirmed answer key** returns a key to draft only when no submissions
  exist. Reconfirmation is required. The existing grade-save and reopen RPCs lock
  the same session row. Saved grades remain protected against key/rule changes.
- Policy decision remains pending: user was asked whether keys used by graded
  papers should require an editable copy or instead invalidate affected grading.
  No post-grading mutation or automatic regrading was implemented without that
  decision. Copying provides a safe revised-session path in the meantime.

Architecture: existing React/TanStack Query components and Supabase services.
Migration 0010 adds transactional RPCs, metadata-validation triggers and nullable
copy provenance. No new dependencies, roles or external APIs.

UI covers loading/failed/empty destination lists, required/length-limited fields,
submission progress, disabled duplicate submits, retained errors and retry, saved
status and an explicit link to the copied session. Server ownership checks apply
to both source and destination. Paused/suspended accounts cannot use the new RPCs.

## API contract

All paths use existing Supabase PostgREST JWT authentication and existing RLS.

| Method/path | Request | Success | Errors / permissions |
| --- | --- | --- | --- |
| POST /rest/v1/rpc/copy_session | p_source_id UUID, p_class_id UUID, p_name trimmed 1-200 chars, p_copy_id UUID | 200, new session UUID | 22023 invalid input/empty saved key; 42501 unavailable account/source/destination; 23505 request ID conflict |
| POST /rest/v1/rpc/reopen_answer_key | p_session_id UUID | 204, no body | 42501 unavailable account/session; 55000 if submissions exist |
| PATCH /rest/v1/classes?id=eq.UUID | block_name trimmed 1-200, school_year trimmed 1-40 | 200 representation with Prefer return=representation | RLS scopes own records; invalid details 22023; clients require one returned record |
| PATCH /rest/v1/checking_sessions?id=eq.UUID | session_name trimmed 1-200, session_date PostgreSQL date | 200 representation | Same ownership RLS; invalid name 22023; typed date/not-null constraints retained |

PostgREST maps SQLSTATE 22023 to 400, 42501 to 403 for authenticated users
(401 without authentication), 23505 to 409, and 55000 to 400. Client messages
avoid displaying SQL or sensitive records. Supabase API failures may also return
standard gateway/authentication errors. Existing save_answer_key_atomic contract
and validation bounds are retained.

copy_session holds an advisory transaction lock on the request UUID and a row
lock on the source. Same request UUID/source/target/name returns the existing
copy. Changed request input requires a new UUID. The open dialog preserves its
UUID across retries and changes it when form inputs change. Closing the dialog
loses that retry token: after an uncertain response, inspect the destination
session list before starting another copy. No automatic network retry is enabled.
The copy is atomic: key insertion failure rolls back the new session. It returns
one ID and adds no upload or pagination surface. Existing account controls and
question limits continue to govern source creation. Copying additionally rejects
sources outside 1-300 questions or rules longer than 10,000 characters.

## Verification and release

- npm run verify passed: reader bundle current; lint passed; 52 tests passed;
  Deno checked both Edge Functions; TypeScript/Vite/PWA production build passed.
- Added database tests: complete key copying; unchanged rosters/grades; independent
  draft editing; idempotent retries/conflicting input; source/target ownership;
  anonymous/paused/suspended denial; invalid input/empty key/archived destination;
  transaction rollback and retry; metadata validation/ownership; reopening and
  grading gates. Static React rendering checks editable answer/type/points/rubric
  controls and read-only confirmed rendering.
- Database evidence uses PGlite PostgreSQL with all migrations. Actual hosted
  Supabase/PostgREST mapping, multi-connection race execution, browser keyboard/
  mobile flows and actual installs remain unverified. Session's earlier browser
  inventory had no connected browser surfaces. No live records were accessed.
- Apply supabase/migrations/0010_session_copy_and_details.sql before releasing
  the frontend, using the project's normal authorized migration procedure.
  Do not release new UI against an unmigrated database.
- Rollback: roll frontend back first. Copied sessions/keys are ordinary records
  and should be retained. Restore the previous guard_session_key implementation
  from migration 0006 if reverting the reopen capability, then drop new RPCs and
  validation triggers only under a reviewed rollback. Do not delete copied exams
  or remove provenance as a casual rollback step.
