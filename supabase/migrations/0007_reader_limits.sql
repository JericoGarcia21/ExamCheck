begin;
create table public.reader_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  requests integer not null default 0,
  primary key(user_id, window_start)
);
alter table public.reader_usage enable row level security;
revoke all on public.reader_usage from anon, authenticated;
create or replace function public.consume_reader_quota()
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_hour timestamptz := date_trunc('hour',now()); v_hour_count int; v_day_count int;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  select coalesce(sum(requests),0),coalesce(sum(requests) filter(where window_start=v_hour),0)
    into v_day_count,v_hour_count from public.reader_usage where user_id=v_user and window_start>=v_hour-interval '23 hours';
  -- Counts recognition requests, including failed provider calls, to bound cost.
  if v_hour_count>=120 or v_day_count>=500 then return false; end if;
  insert into public.reader_usage(user_id,window_start,requests) values(v_user,v_hour,1)
    on conflict(user_id,window_start) do update set requests=public.reader_usage.requests+1;
  return true;
end;
$$;
revoke all on function public.consume_reader_quota() from public, anon;
grant execute on function public.consume_reader_quota() to authenticated;
commit;
