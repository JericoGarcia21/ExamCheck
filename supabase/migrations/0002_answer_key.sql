-- Phase 2: answer key confirmation flag on checking_sessions
alter table public.checking_sessions
  add column if not exists answer_key_confirmed boolean not null default false;

create unique index if not exists answer_keys_session_question_unique
  on public.answer_keys (checking_session_id, question_number);
