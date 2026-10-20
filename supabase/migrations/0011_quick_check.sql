begin;
alter table public.app_control add column quick_check_daily_limit integer not null default 5
  check (quick_check_daily_limit between 0 and 100);
create table public.quick_check_usage (
  day date not null,
  guest_hash text not null,
  requests integer not null check (requests > 0),
  primary key(day,guest_hash)
);
alter table public.quick_check_usage enable row level security;
revoke all on public.quick_check_usage from public,anon,authenticated;

create function public.quick_check_settings() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('daily_limit',quick_check_daily_limit,'paused',paused) from public.app_control where id
$$;
create function public.admin_set_quick_check_limit(p_limit integer) returns void
language plpgsql security definer set search_path='' as $$ begin
  if not public.is_app_admin() then raise exception 'Admin access required'; end if;
  if p_limit is null or p_limit not between 0 and 100 then raise exception 'Limit must be an integer from 0 to 100'; end if;
  update public.app_control set quick_check_daily_limit=p_limit where id;
  insert into public.admin_events(actor,action) values(auth.uid(),'quick_check_limit:'||p_limit);
end $$;
-- A single transaction serializes admission across all guest workers.
-- Only the Edge Function's service role may consume quota.
create function public.consume_quick_check_quota(p_guest_hash text,p_global_limit integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare lim integer; stopped boolean; today date := (now() at time zone 'UTC')::date;
begin
  if p_guest_hash is null or p_guest_hash !~ '^[a-f0-9]{64}$' or p_global_limit is null or p_global_limit not between 1 and 10000 then
    raise exception 'Invalid guest quota request';
  end if;
  select quick_check_daily_limit,paused into lim,stopped from public.app_control where id for update;
  if lim is null or stopped is distinct from false or lim=0 then return false; end if;
  if (select coalesce(sum(requests),0) from public.quick_check_usage where day=today) >= p_global_limit then return false; end if;
  if (select coalesce(sum(requests),0) from public.quick_check_usage where day=today and guest_hash=p_guest_hash) >= lim then return false; end if;
  delete from public.quick_check_usage where day < today-2;
  insert into public.quick_check_usage(day,guest_hash,requests) values(today,p_guest_hash,1)
    on conflict(day,guest_hash) do update set requests=quick_check_usage.requests+1;
  return true;
end $$;
revoke all on function public.quick_check_settings(),public.admin_set_quick_check_limit(integer),public.consume_quick_check_quota(text,integer) from public,anon,authenticated;
grant execute on function public.quick_check_settings() to anon,authenticated,service_role;
grant execute on function public.admin_set_quick_check_limit(integer) to authenticated;
grant execute on function public.consume_quick_check_quota(text,integer) to service_role;
commit;
