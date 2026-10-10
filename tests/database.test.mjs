import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

let db
const A='00000000-0000-0000-0000-000000000001', B='00000000-0000-0000-0000-000000000002'
const CA='10000000-0000-0000-0000-000000000001', CB='10000000-0000-0000-0000-000000000002', CA2='10000000-0000-0000-0000-000000000003'
const SA='20000000-0000-0000-0000-000000000001', SB='20000000-0000-0000-0000-000000000002', SA2='20000000-0000-0000-0000-000000000003'
const SESSION='30000000-0000-0000-0000-000000000001', DRAFT='30000000-0000-0000-0000-000000000002'
const keys=[{question_number:1,correct_answer:'Essay key',question_type:'essay',max_points:10,rubric:'Award up to ten points.'}]
const answers=[{question_number:1,student_answer:'Response',correct_answer:'Essay key',is_correct:false,confidence:0.9,review_status:'accepted',points_awarded:2.5,max_points:10,needs_review:false}]
const asUser=async(user,role='authenticated')=>db.exec('reset role; set role '+role+"; select set_config('request.jwt.claim.sub', '"+(user??'')+"', false)")
const save=async(score=2.5,items=answers,student=SA)=>db.query('select public.save_submission_atomic($1,$2,$3,$4::jsonb)',[SESSION,student,score,JSON.stringify(items)])

before(async()=>{
  db=new PGlite()
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`)
  for(const name of ['0001_init.sql','0002_answer_key.sql','0003_rules.sql','0004_coding_essay.sql','0005_submission_unique.sql']) {
    const sql=await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8')
    // PostgreSQL provides gen_random_uuid natively; PGlite has no pgcrypto extension.
    await db.exec(sql.replace('create extension if not exists "pgcrypto";',''))
  }
  await db.exec('grant select,insert,update,delete on all tables in schema public to anon,authenticated;')
  for(const name of ['0006_qa_integrity.sql','0007_reader_limits.sql','0008_class_archive.sql']) await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'))
  await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4)',[A,'a@example.test',B,'b@example.test'])
  await db.query('insert into public.classes(id,teacher_id,block_name,school_year) values ($1,$2,$3,$4),($5,$6,$7,$4),($8,$2,$9,$4)',[CA,A,'A','2026',CB,B,'B',CA2,'A2'])
  await db.query('insert into public.students(id,class_id,name,sort_name) values ($1,$2,$3,$3),($4,$5,$6,$6),($7,$8,$9,$9)',[SA,CA,'Student A',SB,CB,'Student B',SA2,CA2,'Student A2'])
  await db.query('insert into public.checking_sessions(id,class_id) values ($1,$2),($3,$2)',[SESSION,CA,DRAFT])
  await asUser(A)
  await db.query('select public.save_answer_key_atomic($1,$2::jsonb,true,$3)',[SESSION,JSON.stringify(keys),'No erasures'])
})
after(async()=>{await db?.close()})

test('atomic result saves retain fractional grades and overwrite without duplicates',async()=>{
  await asUser(A);await save()
  const {rows}=await db.query('select score,calculated_score,total_items from public.submissions')
  assert.equal(Number(rows[0].score),2.5);assert.equal(Number(rows[0].calculated_score),2.5);assert.equal(rows[0].total_items,10)
  await save(3.5)
  assert.equal((await db.query('select count(*)::int as n from public.submissions')).rows[0].n,1)
  assert.equal((await db.query('select count(*)::int as n from public.answers')).rows[0].n,1)
})
test('failure during answer insertion rolls back submission update and answer deletion',async()=>{
  await asUser(A);await save()
  await db.exec(`reset role; create function public.fail_test_insert() returns trigger language plpgsql as $$ begin raise exception 'Injected insertion failure'; end $$; create trigger fail_test_insert before insert on public.answers for each row execute function public.fail_test_insert();`)
  await asUser(A);await assert.rejects(save(5))
  assert.equal(Number((await db.query('select score from public.submissions')).rows[0].score),2.5)
  assert.equal((await db.query('select student_answer from public.answers')).rows[0].student_answer,'Response')
  await db.exec('reset role; drop trigger fail_test_insert on public.answers; drop function public.fail_test_insert();')
})
test('Teacher B cannot read or write Teacher A grades or keys',async()=>{
  await asUser(B)
  for(const table of ['classes','students','checking_sessions','answer_keys','submissions','answers']) assert.equal((await db.query('select * from public.'+table)).rows.some(r=>r.id===CA||r.id===SA||r.id===SESSION||r.checking_session_id===SESSION||r.student_id===SA||r.student_answer==='Response'),false)
  await assert.rejects(save())
  await assert.rejects(db.query('select public.save_answer_key_atomic($1,$2::jsonb,false,null)',[DRAFT,JSON.stringify(keys)]))
})
test('anonymous reads are empty and writes/RPC calls are rejected',async()=>{
  await asUser(null,'anon')
  for(const table of ['classes','students','checking_sessions','answer_keys','submissions','answers']) assert.equal((await db.query('select * from public.'+table)).rows.length,0)
  await assert.rejects(save())
  await assert.rejects(db.query('insert into public.submissions(checking_session_id,student_id) values ($1,$2)',[SESSION,SA]))
})
test('same-owner other-class and other-owner students are rejected',async()=>{
  await asUser(A)
  await assert.rejects(save(2.5,answers,SA2));await assert.rejects(save(2.5,answers,SB))
})
test('confirmed keys and configuration cannot be changed or unlocked',async()=>{
  await asUser(A)
  await assert.rejects(db.query('select public.save_answer_key_atomic($1,$2::jsonb,false,null)',[SESSION,JSON.stringify(keys)]))
  await assert.rejects(db.query('update public.checking_sessions set answer_key_confirmed=false where id=$1',[SESSION]))
  await assert.rejects(db.query('update public.checking_sessions set rules=$2 where id=$1',[SESSION,'Different rules']))
  await assert.rejects(db.query('update public.answer_keys set correct_answer=$2 where checking_session_id=$1',[SESSION,'Changed']))
})
test('invalid keys preserve previous draft and failed confirmation does not lock it',async()=>{
  await asUser(A)
  await db.query('select public.save_answer_key_atomic($1,$2::jsonb,false,null)',[DRAFT,JSON.stringify(keys)])
  await assert.rejects(db.query('select public.save_answer_key_atomic($1,$2::jsonb,true,null)',[DRAFT,JSON.stringify([{...keys[0],max_points:0}])]))
  assert.equal((await db.query('select correct_answer from public.answer_keys where checking_session_id=$1',[DRAFT])).rows[0].correct_answer,'Essay key')
  assert.equal((await db.query('select answer_key_confirmed from public.checking_sessions where id=$1',[DRAFT])).rows[0].answer_key_confirmed,false)
})
test('draft-key insertion failure restores the previous key and confirmation state',async()=>{
  await db.exec(`reset role; create function public.fail_key_insert() returns trigger language plpgsql as $$ begin raise exception 'Injected key failure'; end $$; create trigger fail_key_insert before insert on public.answer_keys for each row execute function public.fail_key_insert();`)
  await asUser(A)
  await assert.rejects(db.query('select public.save_answer_key_atomic($1,$2::jsonb,true,null)',[DRAFT,JSON.stringify([{...keys[0],correct_answer:'New key'}])]))
  assert.equal((await db.query('select correct_answer from public.answer_keys where checking_session_id=$1',[DRAFT])).rows[0].correct_answer,'Essay key')
  assert.equal((await db.query('select answer_key_confirmed from public.checking_sessions where id=$1',[DRAFT])).rows[0].answer_key_confirmed,false)
  await db.exec('reset role; drop trigger fail_key_insert on public.answer_keys; drop function public.fail_key_insert();')
})

test('unreviewed answers and out-of-bounds grades are rejected',async()=>{
  await asUser(A)
  await assert.rejects(save(2.5,[{...answers[0],review_status:'pending',confidence:0.1}]))
  await assert.rejects(save(11));await assert.rejects(save(-1));await assert.rejects(save(2.5,[]))
})
test('quota is user-scoped and enforced server-side',async()=>{
  await asUser(A)
  for(let i=0;i<120;i++) assert.equal((await db.query('select public.consume_reader_quota() as allowed')).rows[0].allowed,true)
  assert.equal((await db.query('select public.consume_reader_quota() as allowed')).rows[0].allowed,false)
  await asUser(B);assert.equal((await db.query('select public.consume_reader_quota() as allowed')).rows[0].allowed,true)
  await asUser(null,'anon');await assert.rejects(db.query('select public.consume_reader_quota()'))
})

test('archiving and restoring a class preserves its roster and complete exam history',async()=>{
  await asUser(A); await save()
  const tables=['students','checking_sessions','answer_keys','submissions','answers']
  const before=[]
  for(const table of tables) before.push((await db.query('select * from public.'+table+' order by id')).rows)
  await db.query('update public.classes set archived_at=now() where id=$1',[CA])
  assert.equal((await db.query('select id from public.classes where archived_at is null')).rows.some(row=>row.id===CA),false)
  assert.equal((await db.query('select id from public.classes where archived_at is not null')).rows[0].id,CA)
  assert.equal((await db.query('select s.id from public.checking_sessions s join public.classes c on c.id=s.class_id where c.archived_at is null')).rows.some(row=>row.id===SESSION),false)
  for(let i=0;i<tables.length;i++) assert.deepEqual((await db.query('select * from public.'+tables[i]+' order by id')).rows,before[i])
  await asUser(B)
  assert.equal((await db.query('update public.classes set archived_at=null where id=$1 returning id',[CA])).rows.length,0)
  assert.equal((await db.query('update public.classes set archived_at=now() where id=$1 returning id',[CA2])).rows.length,0)
  await asUser(null,'anon')
  assert.equal((await db.query('update public.classes set archived_at=null where id=$1 returning id',[CA])).rows.length,0)
  await asUser(A)
  await assert.rejects(db.query('delete from public.classes where id=$1',[CA]))
  await db.query('update public.classes set archived_at=null where id=$1',[CA])
  assert.equal((await db.query('select id from public.classes where archived_at is null')).rows.some(row=>row.id===CA),true)
  assert.equal((await db.query('select s.id from public.checking_sessions s join public.classes c on c.id=s.class_id where c.archived_at is null')).rows.some(row=>row.id===SESSION),true)
  for(let i=0;i<tables.length;i++) assert.deepEqual((await db.query('select * from public.'+tables[i]+' order by id')).rows,before[i])
})

test('deleting a confirmed synthetic session still cascades its key and results',async()=>{
  await asUser(A)
  await db.query('delete from public.checking_sessions where id=$1',[SESSION])
  assert.equal((await db.query('select count(*)::int as n from public.answer_keys where checking_session_id=$1',[SESSION])).rows[0].n,0)
  assert.equal((await db.query('select count(*)::int as n from public.answers')).rows[0].n,0)
})
