-- Archive classes without deleting students, sessions, or grades.
alter table public.classes add column if not exists archived_at timestamptz;
create index if not exists classes_teacher_archive_idx on public.classes (teacher_id, archived_at);

-- Teachers archive instead of permanently deleting a class and its history.
-- Existing owner RLS policies still govern UPDATE and SELECT, including restore.
revoke delete on public.classes from anon, authenticated;
