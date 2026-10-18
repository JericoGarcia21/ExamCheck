begin;
create table public.account_controls (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  suspended boolean not null default false
);
create table public.app_control (
  id boolean primary key default true check (id),
  paused boolean not null default false
);
insert into public.app_control(id) values(true);
create table public.admin_events (
  id bigint generated always as identity primary key,
  actor uuid not null references auth.users(id),
  action text not null,
  target uuid,
  created_at timestamptz not null default now()
);
alter table public.account_controls enable row level security;
alter table public.app_control enable row level security;
alter table public.admin_events enable row level security;
revoke all on public.account_controls, public.app_control, public.admin_events from anon, authenticated;

create function public.is_app_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.account_controls where user_id=auth.uid() and is_admin and not suspended)
$$;
create function public.teacher_enabled() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null
    and not exists(select 1 from public.account_controls where user_id=auth.uid() and suspended)
    and not (select paused from public.app_control where id)
$$;
create function public.app_access() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('admin', public.is_app_admin(),
    'suspended', exists(select 1 from public.account_controls where user_id=auth.uid() and suspended),
    'paused', (select paused from public.app_control where id))
$$;

do $$ declare t text; begin
  foreach t in array array['profiles','classes','students','checking_sessions','answer_keys','submissions','answers'] loop
    execute format('create policy "active teacher required" on public.%I as restrictive for all to authenticated using (public.teacher_enabled()) with check (public.teacher_enabled())',t);
  end loop;
end $$;

-- Preserve the existing atomic implementations, but remove their client entry points.
alter function public.save_answer_key_atomic(uuid,jsonb,boolean,text) rename to internal_save_answer_key;
alter function public.save_submission_atomic(uuid,uuid,numeric,jsonb) rename to internal_save_submission;
alter function public.consume_reader_quota() rename to internal_consume_reader_quota;
revoke all on function public.internal_save_answer_key(uuid,jsonb,boolean,text), public.internal_save_submission(uuid,uuid,numeric,jsonb), public.internal_consume_reader_quota() from public, anon, authenticated;
create function public.save_answer_key_atomic(p_session_id uuid,p_keys jsonb,p_confirm boolean default false,p_rules text default null)
returns void language plpgsql security definer set search_path='' as $$ begin
  if not public.teacher_enabled() then raise exception 'Account or app paused'; end if;
  perform public.internal_save_answer_key(p_session_id,p_keys,p_confirm,p_rules);
end $$;
create function public.save_submission_atomic(p_session_id uuid,p_student_id uuid,p_score numeric,p_answers jsonb)
returns void language plpgsql security definer set search_path='' as $$ begin
  if not public.teacher_enabled() then raise exception 'Account or app paused'; end if;
  perform public.internal_save_submission(p_session_id,p_student_id,p_score,p_answers);
end $$;
create function public.consume_reader_quota() returns boolean language plpgsql security definer set search_path='' as $$ begin
  if not public.teacher_enabled() then return false; end if;
  return public.internal_consume_reader_quota();
end $$;

create function public.admin_accounts(p_search text default '',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
  if not public.is_app_admin() then raise exception 'Admin access required'; end if;
  if p_offset is null or p_offset<0 or length(p_search)>200 then raise exception 'Invalid search'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) from (
    select p.id,p.full_name,p.email,p.created_at,coalesce(c.is_admin,false) as is_admin,coalesce(c.suspended,false) as suspended
    from public.profiles p left join public.account_controls c on c.user_id=p.id
    where coalesce(p.email,'') ilike '%'||p_search||'%' or coalesce(p.full_name,'') ilike '%'||p_search||'%'
    order by p.created_at desc,p.id limit 50 offset p_offset
  ) a);
end $$;
create function public.admin_set_suspended(p_user_id uuid,p_suspended boolean)
returns void language plpgsql security definer set search_path='' as $$ begin
  if not public.is_app_admin() then raise exception 'Admin access required'; end if;
  if p_suspended is null then raise exception 'Status required'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'Account not found'; end if;
  insert into public.account_controls(user_id,suspended) values(p_user_id,p_suspended)
    on conflict(user_id) do update set suspended=excluded.suspended where not account_controls.is_admin;
  if not found then raise exception 'Admin accounts cannot be suspended'; end if;
  insert into public.admin_events(actor,action,target) values(auth.uid(),case when p_suspended then 'suspend' else 'restore' end,p_user_id);
end $$;
create function public.admin_set_paused(p_paused boolean)
returns void language plpgsql security definer set search_path='' as $$ begin
  if not public.is_app_admin() then raise exception 'Admin access required'; end if;
  if p_paused is null then raise exception 'Status required'; end if;
  update public.app_control set paused=p_paused where id;
  insert into public.admin_events(actor,action) values(auth.uid(),case when p_paused then 'pause_app' else 'resume_app' end);
end $$;
create function public.admin_analytics() returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
  if not public.is_app_admin() then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'accounts',(select count(*) from public.profiles),
    'suspended',(select count(*) from public.account_controls where suspended),
    'classes',(select count(*) from public.classes),
    'sessions',(select count(*) from public.checking_sessions),
    'papers',(select count(*) from public.submissions),
    'requests',(select coalesce(sum(requests),0) from public.reader_usage),
    'daily',(select jsonb_agg(jsonb_build_object('day',d.day::date,'requests',coalesce(u.n,0)) order by d.day)
      from generate_series((now() at time zone 'UTC')::date-29,(now() at time zone 'UTC')::date,interval '1 day') d(day)
      left join (select (window_start at time zone 'UTC')::date as day,sum(requests) n from public.reader_usage
        where window_start >= (((now() at time zone 'UTC')::date-29)::timestamp at time zone 'UTC') group by 1) u on u.day=d.day::date)
  );
end $$;
revoke all on function public.is_app_admin(),public.teacher_enabled(),public.app_access(),public.admin_accounts(text,integer),public.admin_set_suspended(uuid,boolean),public.admin_set_paused(boolean),public.admin_analytics(),public.save_answer_key_atomic(uuid,jsonb,boolean,text),public.save_submission_atomic(uuid,uuid,numeric,jsonb),public.consume_reader_quota() from public,anon;
grant execute on function public.is_app_admin(),public.teacher_enabled(),public.app_access(),public.admin_accounts(text,integer),public.admin_set_suspended(uuid,boolean),public.admin_set_paused(boolean),public.admin_analytics(),public.save_answer_key_atomic(uuid,jsonb,boolean,text),public.save_submission_atomic(uuid,uuid,numeric,jsonb),public.consume_reader_quota() to authenticated;
commit;
