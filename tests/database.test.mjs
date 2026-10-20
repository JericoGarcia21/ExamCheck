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
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`)
  for(const name of ['0001_init.sql','0002_answer_key.sql','0003_rules.sql','0004_coding_essay.sql','0005_submission_unique.sql']) {
    const sql=await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8')
    // PostgreSQL provides gen_random_uuid natively; PGlite has no pgcrypto extension.
    await db.exec(sql.replace('create extension if not exists "pgcrypto";',''))
  }
  await db.exec('grant select,insert,update,delete on all tables in schema public to anon,authenticated;')
  for(const name of ['0006_qa_integrity.sql','0007_reader_limits.sql','0008_class_archive.sql','0009_admin.sql','0010_session_copy_and_details.sql','0011_quick_check.sql']) await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'))
  await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4)',[A,'a@example.test',B,'b@example.test'])
  await db.query('insert into public.classes(id,teacher_id,block_name,school_year) values ($1,$2,$3,$4),($5,$6,$7,$4),($8,$2,$9,$4)',[CA,A,'A','2026',CB,B,'B',CA2,'A2'])
  await db.query('insert into public.students(id,class_id,name,sort_name) values ($1,$2,$3,$3),($4,$5,$6,$6),($7,$8,$9,$9)',[SA,CA,'Student A',SB,CB,'Student B',SA2,CA2,'Student A2'])
  await db.query('insert into public.checking_sessions(id,class_id) values ($1,$2),($3,$2)',[SESSION,CA,DRAFT])
  await asUser(A)
  await db.query('select public.save_answer_key_atomic($1,$2::jsonb,true,$3)',[SESSION,JSON.stringify(keys),'No erasures'])
})
after(async()=>{await db?.close()})

// Guest tests are registered after the existing scenarios below so their admin
// audit entries do not change the earlier exact-count assertions.

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

test('admin permissions, suspension, pause and aggregate analytics',async()=>{
  await asUser(B)
  for(const name of ['admin_analytics','admin_accounts']) await assert.rejects(db.query('select public.'+name+'()'))
  await assert.rejects(db.query('select public.admin_set_paused(true)'))
  await assert.rejects(db.query('select public.admin_set_suspended($1,true)',[A]))
  await assert.rejects(db.query('insert into public.account_controls(user_id,is_admin) values ($1,true)',[B]))
  await assert.rejects(db.query('select public.internal_consume_reader_quota()'))
  await db.exec('reset role')
  await db.query('insert into public.account_controls(user_id,is_admin) values ($1,true)',[B])
  await asUser(B)
  const stats=(await db.query('select public.admin_analytics() as data')).rows[0].data
  assert.equal(stats.accounts,2);assert.equal(stats.classes,3);assert.equal(stats.daily.length,30)
  assert.ok(stats.requests>=121)
  const accounts=(await db.query("select public.admin_accounts('a@example',0) as data")).rows[0].data
  assert.equal(accounts.length,1);assert.equal(accounts[0].id,A)
  assert.equal((await db.query('select * from public.classes where id=$1',[CA])).rows.length,0)
  await assert.rejects(db.query('select public.admin_set_suspended($1,true)',[B]))
  await db.query('select public.admin_set_suspended($1,true)',[A])
  await asUser(A)
  assert.equal((await db.query('select * from public.classes')).rows.length,0)
  await assert.rejects(save())
  await assert.rejects(db.query('select public.save_answer_key_atomic($1,$2::jsonb,false,null)',[DRAFT,JSON.stringify(keys)]))
  assert.equal((await db.query('select public.consume_reader_quota() as allowed')).rows[0].allowed,false)
  await asUser(B);await db.query('select public.admin_set_suspended($1,false)',[A])
  await db.query('select public.admin_set_paused(true)')
  const access=(await db.query('select public.app_access() as access')).rows[0].access
  assert.equal(access.admin,true);assert.equal(access.paused,true)
  await asUser(A)
  assert.equal((await db.query('select * from public.classes')).rows.length,0)
  await assert.rejects(save())
  assert.equal((await db.query('select public.consume_reader_quota() as allowed')).rows[0].allowed,false)
  await assert.rejects(db.query("insert into public.classes(block_name,school_year) values ('Blocked','2026')"))
  await asUser(B);await db.query('select public.admin_set_paused(false)')
  await asUser(A);await save()
  assert.equal((await db.query('select * from public.classes')).rows.length,2)
  await db.exec('reset role')
  assert.equal((await db.query('select count(*)::int n from public.admin_events')).rows[0].n,4)
  await asUser(null,'anon');await assert.rejects(db.query('select public.app_access()'))
})

test('deleting a confirmed synthetic session still cascades its key and results',async()=>{
  await asUser(A)
  await db.query('delete from public.checking_sessions where id=$1',[SESSION])
  assert.equal((await db.query('select count(*)::int as n from public.answer_keys where checking_session_id=$1',[SESSION])).rows[0].n,0)
  assert.equal((await db.query('select count(*)::int as n from public.answers')).rows[0].n,0)
})

test('copy session creates an independent editable key and preserves both rosters and grades',async()=>{
  await asUser(A)
  const source=(await db.query("insert into public.checking_sessions(class_id,session_name) values ($1,'Midterm') returning id",[CA])).rows[0].id
  await db.query('select public.save_answer_key_atomic($1,$2::jsonb,true,$3)',[source,JSON.stringify(keys),'No erasures'])
  const id=(await db.query('select gen_random_uuid() as id')).rows[0].id
  const roster=(await db.query('select * from public.students order by id')).rows
  const grades=(await db.query('select * from public.submissions order by id')).rows
  const copy=()=>db.query('select public.copy_session($1,$2,$3,$4) as id',[source,CA2,'Midterm - Block A2',id])
  assert.equal((await copy()).rows[0].id,id)
  assert.equal((await copy()).rows[0].id,id)
  const row=(await db.query('select * from public.checking_sessions where id=$1',[id])).rows[0]
  assert.equal(row.class_id,CA2);assert.equal(row.answer_key_confirmed,false);assert.equal(row.rules,'No erasures')
  assert.equal(row.status,'in_progress')
  const copied=(await db.query('select question_number,correct_answer,question_type,max_points,rubric from public.answer_keys where checking_session_id=$1',[id])).rows
  assert.deepEqual(copied,keys)
  assert.deepEqual((await db.query('select * from public.students order by id')).rows,roster)
  assert.deepEqual((await db.query('select * from public.submissions order by id')).rows,grades)
  assert.equal((await db.query('select count(*)::int n from public.checking_sessions where id=$1',[id])).rows[0].n,1)
  await db.query('select public.save_answer_key_atomic($1,$2::jsonb,false,null)',[id,JSON.stringify([{...keys[0],correct_answer:'Revised for A2'}])])
  assert.equal((await db.query('select correct_answer from public.answer_keys where checking_session_id=$1',[source])).rows[0].correct_answer,'Essay key')
  await assert.rejects(db.query('select public.copy_session($1,$2,$3,$4)',[source,CA2,'Different request',id]))
})

test('copy rejects unauthorized sources/destinations, invalid input, paused accounts, and empty keys',async()=>{
  await asUser(A)
  const source=(await db.query("insert into public.checking_sessions(class_id,session_name) values ($1,'Copy security') returning id",[CA])).rows[0].id
  await db.query('select public.save_answer_key_atomic($1,$2::jsonb,false,null)',[source,JSON.stringify(keys)])
  const copy=(src=source,dst=CA2,name='Midterm')=>db.query('select public.copy_session($1,$2,$3,gen_random_uuid())',[src,dst,name])
  await assert.rejects(copy(source,CB));await assert.rejects(copy(source,CA2,' '));await assert.rejects(copy(source,CA2,'x'.repeat(201)))
  const empty=(await db.query('insert into public.checking_sessions(class_id) values ($1) returning id',[CA])).rows[0].id
  await assert.rejects(copy(empty))
  await db.query('update public.classes set archived_at=now() where id=$1',[CA2]);await assert.rejects(copy());await db.query('update public.classes set archived_at=null where id=$1',[CA2])
  await asUser(B);await assert.rejects(copy(source,CB));await assert.rejects(copy())
  await asUser(null,'anon');await assert.rejects(copy())
  await db.exec('reset role; update public.app_control set paused=true')
  await asUser(A);await assert.rejects(copy())
  await db.exec('reset role; update public.app_control set paused=false;')
  await db.query('insert into public.account_controls(user_id,suspended) values ($1,true) on conflict(user_id) do update set suspended=true',[A])
  await asUser(A);await assert.rejects(copy())
  await db.exec('reset role');await db.query('update public.account_controls set suspended=false where user_id=$1',[A])
})

test('failed key insertion rolls back the entire copy and can retry with the same ID',async()=>{
  await asUser(A)
  const source=(await db.query("insert into public.checking_sessions(class_id,session_name) values ($1,'Rollback source') returning id",[CA])).rows[0].id
  await db.query('select public.save_answer_key_atomic($1,$2::jsonb,false,null)',[source,JSON.stringify(keys)])
  const id=(await db.query('select gen_random_uuid() id')).rows[0].id
  await db.exec(`reset role; create function public.fail_copy_test() returns trigger language plpgsql as $$ begin raise exception 'Injected copy failure'; end $$; create trigger fail_copy_test before insert on public.answer_keys for each row execute function public.fail_copy_test();`)
  await asUser(A)
  const copy=()=>db.query('select public.copy_session($1,$2,$3,$4)',[source,CA2,'Rollback copy',id])
  await assert.rejects(copy())
  assert.equal((await db.query('select id from public.checking_sessions where id=$1',[id])).rows.length,0)
  await db.exec('reset role; drop trigger fail_copy_test on public.answer_keys; drop function public.fail_copy_test();')
  await asUser(A);await copy()
  assert.equal((await db.query('select id from public.answer_keys where checking_session_id=$1',[id])).rows.length,1)
})

test('class and session detail edits validate fields and preserve ownership and key contents',async()=>{
  await asUser(A)
  const source=(await db.query("insert into public.checking_sessions(class_id,session_name) values ($1,'Rename me') returning id",[CA])).rows[0].id
  await db.query('select public.save_answer_key_atomic($1,$2::jsonb,true,null)',[source,JSON.stringify(keys)])
  await db.query("update public.classes set block_name=' Updated A ',school_year='2027-2028' where id=$1",[CA])
  assert.equal((await db.query('select block_name from public.classes where id=$1',[CA])).rows[0].block_name,'Updated A')
  await db.query("update public.checking_sessions set session_name='Final exam',session_date='2027-03-01' where id=$1",[source])
  assert.equal((await db.query('select session_name from public.checking_sessions where id=$1',[source])).rows[0].session_name,'Final exam')
  assert.equal((await db.query('select correct_answer from public.answer_keys where checking_session_id=$1',[source])).rows[0].correct_answer,'Essay key')
  await assert.rejects(db.query("update public.classes set block_name=' ' where id=$1",[CA]))
  await assert.rejects(db.query("update public.classes set school_year='' where id=$1",[CA]))
  await assert.rejects(db.query('update public.checking_sessions set session_name=$2 where id=$1',[source,'x'.repeat(201)]))
  await asUser(B)
  assert.equal((await db.query("update public.classes set block_name='Hacked' where id=$1 returning id",[CA])).rows.length,0)
  assert.equal((await db.query("update public.checking_sessions set session_name='Hacked' where id=$1 returning id",[source])).rows.length,0)
  await asUser(null,'anon')
  assert.equal((await db.query("update public.classes set block_name='Hacked' where id=$1 returning id",[CA])).rows.length,0)
})

test('confirmed keys reopen before grading, require confirmation again, and cannot reopen after a save',async()=>{
  await asUser(A)
  const source=(await db.query("insert into public.checking_sessions(class_id,session_name) values ($1,'Editable confirmed') returning id",[CA])).rows[0].id
  await db.query('select public.save_answer_key_atomic($1,$2::jsonb,true,null)',[source,JSON.stringify(keys)])
  await db.query('select public.reopen_answer_key($1)',[source])
  assert.equal((await db.query('select answer_key_confirmed from public.checking_sessions where id=$1',[source])).rows[0].answer_key_confirmed,false)
  const grade=()=>db.query('select public.save_submission_atomic($1,$2,$3,$4::jsonb)',[source,SA,2.5,JSON.stringify(answers)])
  await assert.rejects(grade())
  await db.query('select public.save_answer_key_atomic($1,$2::jsonb,true,null)',[source,JSON.stringify([{...keys[0],rubric:'Updated rubric'}])])
  await grade()
  const before=(await db.query('select * from public.submissions where checking_session_id=$1',[source])).rows
  await assert.rejects(db.query('select public.reopen_answer_key($1)',[source]))
  await assert.rejects(db.query('update public.checking_sessions set answer_key_confirmed=false where id=$1',[source]))
  assert.deepEqual((await db.query('select * from public.submissions where checking_session_id=$1',[source])).rows,before)
  assert.equal((await db.query('select answer_key_confirmed from public.checking_sessions where id=$1',[source])).rows[0].answer_key_confirmed,true)
  await asUser(B);await assert.rejects(db.query('select public.reopen_answer_key($1)',[source]))
  await asUser(null,'anon');await assert.rejects(db.query('select public.reopen_answer_key($1)',[source]))
  await db.exec('reset role; update public.app_control set paused=true')
  await asUser(A);await assert.rejects(db.query('select public.reopen_answer_key($1)',[source]))
  await db.exec('reset role; update public.app_control set paused=false')
})

test('guest default is five; only admins change it and only service role admits scans', async()=>{
  await asUser(null,'anon')
  assert.equal((await db.query('select public.quick_check_settings() s')).rows[0].s.daily_limit,5)
  await assert.rejects(db.query('select public.admin_set_quick_check_limit(2)'))
  await assert.rejects(db.query('select public.consume_quick_check_quota($1,100)',['a'.repeat(64)]))
  await assert.rejects(db.query('select * from public.quick_check_usage'))
  await asUser(A)
  await assert.rejects(db.query('select public.admin_set_quick_check_limit(2)'))
  await asUser(B)
  await assert.rejects(db.query('select public.admin_set_quick_check_limit(-1)'))
  await assert.rejects(db.query('select public.admin_set_quick_check_limit(101)'))
  await db.query('select public.admin_set_quick_check_limit(2)')
  await db.exec('reset role; grant usage on schema public to service_role; set role service_role')
  const consume=(hash,limit=3)=>db.query('select public.consume_quick_check_quota($1,$2) ok',[hash.repeat(64),limit]).then(r=>r.rows[0].ok)
  const admitted=await Promise.all([consume('a'),consume('a'),consume('a')])
  assert.equal(admitted.filter(Boolean).length,2)
  assert.equal(await consume('b'),true)
  assert.equal(await consume('c'),false)
  await assert.rejects(db.query('select public.consume_quick_check_quota($1,3)',['invalid']))
  await asUser(B);await db.query('select public.admin_set_paused(true)')
  await db.exec('reset role; set role service_role')
  assert.equal(await consume('d',100),false)
  await asUser(B);await db.query('select public.admin_set_paused(false)');await db.query('select public.admin_set_quick_check_limit(0)')
  await db.exec('reset role; set role service_role')
  assert.equal(await consume('d',100),false)
  await asUser(B);await db.query('select public.admin_set_quick_check_limit(5)')
})
