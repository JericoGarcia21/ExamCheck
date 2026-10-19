begin;

-- Metadata edits retain class/session identity and existing grade relationships.
create function public.validate_class_session_details()
returns trigger language plpgsql set search_path='' as $$
begin
  if TG_TABLE_NAME = 'classes' then
    if new.block_name is null or length(btrim(new.block_name)) not between 1 and 200
       or new.school_year is null or length(btrim(new.school_year)) not between 1 and 40 then
      raise exception 'Invalid class details' using errcode='22023';
    end if;
    new.block_name := btrim(new.block_name); new.school_year := btrim(new.school_year);
  else
    if new.session_name is not null and length(btrim(new.session_name)) not between 1 and 200 then
      raise exception 'Invalid session name' using errcode='22023';
    end if;
    new.session_name := btrim(new.session_name);
  end if;
  return new;
end $$;
create trigger class_details_valid before insert or update of block_name,school_year on public.classes
for each row execute function public.validate_class_session_details();
create trigger session_details_valid before insert or update of session_name on public.checking_sessions
for each row execute function public.validate_class_session_details();

alter table public.checking_sessions add column copied_from_session_id uuid references public.checking_sessions(id) on delete set null;

-- The client reuses p_copy_id after uncertain responses, so a retry cannot create
-- a second session. Lock source/session class rows before taking the key snapshot.
create function public.copy_session(p_source_id uuid, p_class_id uuid, p_name text, p_copy_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_source public.checking_sessions; v_existing public.checking_sessions; v_count integer;
begin
  if not public.teacher_enabled() then raise exception 'Account unavailable' using errcode='42501'; end if;
  if p_copy_id is null or p_name is null or length(btrim(p_name)) not between 1 and 200 then
    raise exception 'Invalid copy details' using errcode='22023';
  end if;
  -- Serialize retries, including requests that arrive before the first commits.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_copy_id::text,0));
  perform 1 from public.classes where id=p_class_id and teacher_id=auth.uid() and archived_at is null for share;
  if not found then raise exception 'Class unavailable' using errcode='42501'; end if;
  select s.* into v_source from public.checking_sessions s join public.classes c on c.id=s.class_id
    where s.id=p_source_id and c.teacher_id=auth.uid() for update of s;
  if not found then raise exception 'Session unavailable' using errcode='42501'; end if;
  select * into v_existing from public.checking_sessions where id=p_copy_id;
  if found then
    if v_existing.class_id=p_class_id and v_existing.copied_from_session_id=p_source_id and v_existing.session_name=btrim(p_name) then
      return p_copy_id;
    end if;
    raise exception 'Copy request conflict' using errcode='23505';
  end if;
  select count(*) into v_count from public.answer_keys where checking_session_id=p_source_id;
  if v_count not between 1 and 300 or length(coalesce(v_source.rules,''))>10000 then
    raise exception 'Source must have 1 to 300 saved questions and rules up to 10000 characters' using errcode='22023';
  end if;
  insert into public.checking_sessions(id,class_id,session_name,rules,copied_from_session_id)
    values(p_copy_id,p_class_id,btrim(p_name),v_source.rules,p_source_id);
  insert into public.answer_keys(checking_session_id,question_number,correct_answer,question_type,max_points,rubric)
    select p_copy_id,question_number,correct_answer,question_type,max_points,rubric
    from public.answer_keys where checking_session_id=p_source_id;
  return p_copy_id;
end $$;
revoke all on function public.copy_session(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.copy_session(uuid,uuid,text,uuid) to authenticated;
-- Return to draft only before any submissions exist. Grade saves use the same
-- row lock, so reopening and first grading cannot both win a concurrent race.
create or replace function public.guard_session_key()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.answer_key_confirmed and (
      new.class_id <> old.class_id or new.rules is distinct from old.rules
      or (not new.answer_key_confirmed and exists(
        select 1 from public.submissions where checking_session_id=old.id))) then
    raise exception 'Confirmed session grading configuration is immutable';
  end if;
  if new.answer_key_confirmed and not exists(select 1 from public.answer_keys where checking_session_id=new.id) then
    raise exception 'An answer key is required before confirmation';
  end if;
  return new;
end $$;

create function public.reopen_answer_key(p_session_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_session public.checking_sessions;
begin
  if not public.teacher_enabled() then raise exception 'Account unavailable' using errcode='42501'; end if;
  select s.* into v_session from public.checking_sessions s join public.classes c on c.id=s.class_id
    where s.id=p_session_id and c.teacher_id=auth.uid() for update of s;
  if not found then raise exception 'Session unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.submissions where checking_session_id=p_session_id) then
    raise exception 'This session already has graded papers' using errcode='55000';
  end if;
  update public.checking_sessions set answer_key_confirmed=false,status='in_progress' where id=p_session_id;
end $$;
revoke all on function public.reopen_answer_key(uuid) from public,anon;
grant execute on function public.reopen_answer_key(uuid) to authenticated;
commit;
