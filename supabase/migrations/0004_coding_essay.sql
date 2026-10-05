-- Phase 4/5 extension: coding + essay support and richer answer results.

-- Essay rubrics and per-question point values on the answer key.
alter table public.answer_keys
  add column if not exists rubric text,
  add column if not exists max_points int not null default 1;

-- Per-answer point scores, essay feedback and a review flag.
alter table public.answers
  add column if not exists points_awarded numeric,
  add column if not exists max_points int,
  add column if not exists feedback text,
  add column if not exists needs_review boolean not null default false;
