-- QA integrity: atomic writes, numeric grades, and immutable confirmed keys.
-- No existing grades or answer records are removed by this migration.
begin;
alter table public.submissions alter column score type numeric using score::numeric;
alter table public.submissions add column if not exists calculated_score numeric;
alter table public.submissions add column if not exists updated_at timestamptz not null default now();

create or replace function public.validate_submission_class()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.students st join public.checking_sessions cs on cs.class_id = st.class_id
    where st.id = new.student_id and cs.id = new.checking_session_id) then
    raise exception 'Student must belong to the session class';
  end if;
  return new;
end;
$$;
create trigger submissions_class_integrity before insert or update of student_id, checking_session_id
on public.submissions for each row execute function public.validate_submission_class();

create or replace function public.guard_answer_key()
returns trigger language plpgsql set search_path = '' as $$
declare v_session uuid;
begin
  v_session := case when TG_OP = 'DELETE' then old.checking_session_id else new.checking_session_id end;
  if exists (select 1 from public.checking_sessions where id = v_session and answer_key_confirmed) then
    raise exception 'Confirmed answer keys are immutable';
  end if;
  if TG_OP = 'UPDATE' and old.checking_session_id <> new.checking_session_id and exists
    (select 1 from public.checking_sessions where id = old.checking_session_id and answer_key_confirmed) then
    raise exception 'Confirmed answer keys are immutable';
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger answer_key_immutable before insert or update or delete on public.answer_keys
for each row execute function public.guard_answer_key();

create or replace function public.guard_session_key()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.answer_key_confirmed and (not new.answer_key_confirmed or new.class_id <> old.class_id or new.rules is distinct from old.rules) then
    raise exception 'Confirmed session grading configuration is immutable';
  end if;
  if new.answer_key_confirmed and not exists (select 1 from public.answer_keys where checking_session_id = new.id) then
    raise exception 'An answer key is required before confirmation';
  end if;
  return new;
end;
$$;
create trigger session_key_immutable before update on public.checking_sessions
for each row execute function public.guard_session_key();

create or replace function public.save_answer_key_atomic(p_session_id uuid, p_keys jsonb, p_confirm boolean default false, p_rules text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_session public.checking_sessions; v_count int;
begin
  select s.* into v_session from public.checking_sessions s join public.classes c on c.id=s.class_id
  where s.id=p_session_id and c.teacher_id=auth.uid() for update of s;
  if not found then raise exception 'Session not authorized'; end if;
  if v_session.answer_key_confirmed then raise exception 'Answer key already confirmed'; end if;
  if jsonb_typeof(p_keys) is distinct from 'array' then raise exception 'Keys must be an array'; end if;
  v_count := jsonb_array_length(p_keys);
  if v_count < 1 or v_count > 300 then raise exception 'Answer key must contain 1 to 300 questions'; end if;
  if exists (select 1 from jsonb_to_recordset(p_keys) as k(question_number int, correct_answer text, question_type text, max_points int, rubric text)
    where question_number is null or question_number<1 or question_number>v_count or correct_answer is null or length(trim(correct_answer))=0
      or length(correct_answer)>20000 or question_type is null or question_type not in ('multiple_choice','true_false','identification','coding','essay')
      or max_points is null or max_points<1 or max_points>1000 or length(coalesce(rubric,''))>10000)
    or (select count(distinct (k->>'question_number')::int) from jsonb_array_elements(p_keys) k) <> v_count then
    raise exception 'Invalid or duplicate answer key questions';
  end if;
  if length(coalesce(p_rules,''))>10000 then raise exception 'Rules too long'; end if;
  delete from public.answer_keys where checking_session_id=p_session_id;
  insert into public.answer_keys(checking_session_id, question_number, correct_answer, question_type, max_points, rubric)
    select p_session_id, question_number, correct_answer, question_type, max_points, rubric
    from jsonb_to_recordset(p_keys) as k(question_number int, correct_answer text, question_type text, max_points int, rubric text);
  update public.checking_sessions set rules=coalesce(p_rules,rules), answer_key_confirmed=p_confirm,
    status=case when p_confirm then 'answer_key_confirmed' else status end where id=p_session_id;
end;
$$;

create or replace function public.save_submission_atomic(p_session_id uuid, p_student_id uuid, p_score numeric, p_answers jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_session public.checking_sessions; v_id uuid; v_total int; v_count int; v_calculated numeric;
begin
  select s.* into v_session from public.checking_sessions s join public.classes c on c.id=s.class_id
    where s.id=p_session_id and c.teacher_id=auth.uid() for update of s;
  if not found then raise exception 'Session not authorized'; end if;
  if not v_session.answer_key_confirmed then raise exception 'Confirm answer key first'; end if;
  if not exists(select 1 from public.students where id=p_student_id and class_id=v_session.class_id) then
    raise exception 'Student must belong to the session class'; end if;
  select count(*), sum(max_points) into v_count,v_total from public.answer_keys where checking_session_id=p_session_id;
  if jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'Answers must be an array'; end if;
  if jsonb_array_length(p_answers)<>v_count then raise exception 'Complete answers required'; end if;
  if p_score is null or p_score::text in ('NaN','Infinity','-Infinity') or p_score<0 or p_score>v_total then raise exception 'Invalid score'; end if;
  if (select count(distinct (a->>'question_number')::int) from jsonb_array_elements(p_answers) a)<>v_count then raise exception 'Duplicate questions'; end if;
  if exists(select 1 from jsonb_to_recordset(p_answers) as a(question_number int, student_answer text, correct_answer text, is_correct boolean,
    confidence numeric, review_status text, points_awarded numeric, max_points int, needs_review boolean)
    left join public.answer_keys k on k.checking_session_id=p_session_id and k.question_number=a.question_number
    where k.id is null or a.student_answer is null or length(a.student_answer)>20000 or a.correct_answer is distinct from k.correct_answer
      or a.max_points is distinct from k.max_points or a.points_awarded is null or a.points_awarded::text in ('NaN','Infinity','-Infinity')
      or a.points_awarded<0 or a.points_awarded>k.max_points or a.is_correct is distinct from (a.points_awarded>=k.max_points)
      or (a.confidence is not null and (a.confidence::text in ('NaN','Infinity','-Infinity') or a.confidence<0 or a.confidence>1))
      or (coalesce(a.review_status,'pending') not in ('accepted','edited') and (coalesce(a.needs_review,false) or a.confidence is null or a.confidence<0.7 or length(trim(a.student_answer))=0))) then
    raise exception 'Invalid or unreviewed answers'; end if;
  select sum((a->>'points_awarded')::numeric) into v_calculated from jsonb_array_elements(p_answers) a;
  insert into public.submissions(checking_session_id,student_id,score,total_items,status,calculated_score)
    values(p_session_id,p_student_id,p_score,v_total,'checked',v_calculated)
    on conflict(checking_session_id,student_id) do update set score=excluded.score,total_items=excluded.total_items,
      status=excluded.status,calculated_score=excluded.calculated_score,updated_at=now() returning id into v_id;
  delete from public.answers where submission_id=v_id;
  insert into public.answers(submission_id,question_number,student_answer,correct_answer,is_correct,confidence,review_status,points_awarded,max_points,feedback,needs_review)
    select v_id,question_number,student_answer,correct_answer,is_correct,confidence,coalesce(review_status,'pending'),points_awarded,max_points,feedback,false
    from jsonb_to_recordset(p_answers) as a(question_number int,student_answer text,correct_answer text,is_correct boolean,confidence numeric,
      review_status text,points_awarded numeric,max_points int,feedback text);
end;
$$;
revoke all on function public.save_answer_key_atomic(uuid,jsonb,boolean,text) from public, anon;
revoke all on function public.save_submission_atomic(uuid,uuid,numeric,jsonb) from public, anon;
grant execute on function public.save_answer_key_atomic(uuid,jsonb,boolean,text) to authenticated;
grant execute on function public.save_submission_atomic(uuid,uuid,numeric,jsonb) to authenticated;
-- Reads remain governed by RLS. Writes must pass through validated transactions.
revoke insert, update, delete on public.submissions, public.answers, public.answer_keys from authenticated, anon;
commit;
