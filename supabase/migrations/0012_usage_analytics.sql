begin;
alter table public.app_control add column quick_check_global_limit integer not null default 100 check (quick_check_global_limit between 0 and 10000);
create table public.guest_usage_daily(day date primary key,requests bigint not null check(requests>0));
insert into public.guest_usage_daily select day,sum(requests) from public.quick_check_usage group by day;
create table public.model_usage (
  id uuid primary key,
  created_at timestamptz not null default now(),
  source text not null check(source in ('signed_in','guest_key','guest_sheet')),
  model text not null check(length(model) between 1 and 100),
  status integer check(status between 100 and 599),
  input_tokens bigint check(input_tokens between 0 and 1000000000),
  output_tokens bigint check(output_tokens between 0 and 1000000000),
  thinking_tokens bigint check(thinking_tokens between 0 and 1000000000),
  cached_tokens bigint check(cached_tokens between 0 and 1000000000),
  total_tokens bigint check(total_tokens between 0 and 1000000000)
);
create index model_usage_created on public.model_usage(created_at);
alter table public.guest_usage_daily enable row level security;
alter table public.model_usage enable row level security;
revoke all on public.guest_usage_daily,public.model_usage from public,anon,authenticated;

create or replace function public.quick_check_settings() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('daily_limit',quick_check_daily_limit,'paused',paused or quick_check_global_limit=0) from public.app_control where id
$$;
create function public.admin_set_quick_check_global_limit(p_limit integer) returns void
language plpgsql security definer set search_path='' as $$ begin
  if not public.is_app_admin() then raise exception 'Admin access required'; end if;
  if p_limit is null or p_limit not between 0 and 10000 then raise exception 'Limit must be 0 to 10000'; end if;
  update public.app_control set quick_check_global_limit=p_limit where id;
  insert into public.admin_events(actor,action) values(auth.uid(),'quick_check_global_limit:'||p_limit);
end $$;
create or replace function public.consume_quick_check_quota(p_guest_hash text,p_global_limit integer default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare lim integer; cap integer; stopped boolean; today date := (now() at time zone 'UTC')::date;
begin
  if p_guest_hash is null or p_guest_hash !~ '^[a-f0-9]{64}$' or (p_global_limit is not null and p_global_limit not between 1 and 10000) then raise exception 'Invalid guest quota request'; end if;
  select quick_check_daily_limit,quick_check_global_limit,paused into lim,cap,stopped from public.app_control where id for update;
  cap := least(cap,coalesce(p_global_limit,cap));
  if lim is null or cap is null or stopped is distinct from false or lim=0 or cap=0 then return false; end if;
  if (select coalesce(sum(requests),0) from public.guest_usage_daily where day=today) >= cap then return false; end if;
  if (select coalesce(sum(requests),0) from public.quick_check_usage where day=today and guest_hash=p_guest_hash) >= lim then return false; end if;
  delete from public.quick_check_usage where day<today-2;
  insert into public.quick_check_usage values(today,p_guest_hash,1) on conflict(day,guest_hash) do update set requests=quick_check_usage.requests+1;
  insert into public.guest_usage_daily values(today,1) on conflict(day) do update set requests=guest_usage_daily.requests+1;
  return true;
end $$;

create function public.record_model_usage(p_id uuid,p_source text,p_model text,p_status integer,p_input bigint,p_output bigint,p_thinking bigint,p_cached bigint,p_total bigint) returns void
language plpgsql security definer set search_path='' as $$ begin
  insert into public.model_usage(id,source,model,status,input_tokens,output_tokens,thinking_tokens,cached_tokens,total_tokens)
  values(p_id,p_source,p_model,p_status,p_input,p_output,p_thinking,p_cached,p_total) on conflict(id) do nothing;
  delete from public.model_usage where created_at<now()-interval '90 days';
end $$;
create function public.admin_model_usage() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare today date := (now() at time zone 'UTC')::date;
begin
  if not public.is_app_admin() then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'daily_limit',(select quick_check_daily_limit from public.app_control where id),
    'global_limit',(select quick_check_global_limit from public.app_control where id),
    'guest_today',(select coalesce(sum(requests),0) from public.guest_usage_daily where day=today),
    'guest_30_days',(select coalesce(sum(requests),0) from public.guest_usage_daily where day>=today-29),
    'tracking_since',(select min(created_at) from public.model_usage),
    'models',(select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from (
      select source,model,count(*) attempts,count(total_tokens) reported_attempts,
        count(*) filter(where status is null or status>=400) failed_attempts,
        sum(input_tokens) input_tokens,sum(output_tokens) output_tokens,sum(thinking_tokens) thinking_tokens,
        sum(cached_tokens) cached_tokens,sum(total_tokens) total_tokens,max(created_at) last_recorded
      from public.model_usage where created_at>=((today-29)::timestamp at time zone 'UTC') group by source,model order by source,model
    ) m),
    'daily',(select coalesce(jsonb_agg(jsonb_build_object('day',d.day::date,'guest_scans',coalesce(g.requests,0)) order by d.day),'[]'::jsonb)
      from generate_series(today-29,today,interval '1 day') d(day) left join public.guest_usage_daily g on g.day=d.day::date)
  );
end $$;
revoke all on function public.admin_set_quick_check_global_limit(integer),public.record_model_usage(uuid,text,text,integer,bigint,bigint,bigint,bigint,bigint),public.admin_model_usage() from public,anon,authenticated;
grant execute on function public.admin_set_quick_check_global_limit(integer),public.admin_model_usage() to authenticated;
grant execute on function public.record_model_usage(uuid,text,text,integer,bigint,bigint,bigint,bigint,bigint) to service_role;
commit;
