-- Phase 4 prep: store checking rules on the session
alter table public.checking_sessions
  add column if not exists rules text;
