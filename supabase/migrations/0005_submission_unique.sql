-- Phase 6 fix: one submission per (checking_session, student).
--
-- The original save always INSERTed, so re-checking a student created duplicate
-- result rows. This removes the existing duplicates (keeping the most recent
-- submission for each student) and adds a unique index to prevent recurrence.
-- Deleting a submission cascades to its answers.

delete from public.submissions s
using public.submissions keep
where s.checking_session_id = keep.checking_session_id
  and s.student_id = keep.student_id
  and (s.created_at < keep.created_at
       or (s.created_at = keep.created_at and s.id < keep.id));

create unique index if not exists submissions_session_student_unique
  on public.submissions (checking_session_id, student_id);
