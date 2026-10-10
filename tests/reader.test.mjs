import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
let handler
const originalDeno=globalThis.Deno
before(async()=>{
  globalThis.Deno={env:{get:(name)=>({GEMINI_API_KEY:'test-provider-secret',SUPABASE_URL:'https://backend.example.test',SUPABASE_ANON_KEY:'test-anon-key'}[name])},serve:(fn)=>{handler=fn}}
  await import('../supabase/functions/read-answers/dashboard.ts')
})
after(()=>{globalThis.Deno=originalDeno})
const sessionId='00000000-0000-0000-0000-000000000001'
const input={sessionId,imageBase64:Buffer.from([255,216,255,0,0,0]).toString('base64'),mimeType:'image/jpeg'}
const request=(body=input,token='test-user-token')=>new Request('https://reader.example.test',{method:'POST',headers:token?{authorization:'Bearer '+token}:undefined,body:JSON.stringify(body)})
function mockBackend(t,options={}) {
  const calls=[]
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    calls.push({url:String(url),init})
    if(String(url).endsWith('/auth/v1/user')) return Response.json(options.authInvalid?{error:'Unauthorized'}:{id:'teacher-a'},{status:options.authInvalid?401:200})
    if(String(url).includes('/checking_sessions?')) return Response.json(options.denied?[]:[{answer_key_confirmed:true,rules:'Stored rules'}])
    if(String(url).includes('/answer_keys?')) return Response.json([{question_number:1,question_type:'essay',max_points:10,rubric:'Stored rubric'},{question_number:2,question_type:'multiple_choice',max_points:1}])
    if(String(url).endsWith('/rpc/consume_reader_quota')) return Response.json(!options.quotaExceeded)
    if(String(url).includes('generativelanguage.googleapis.com')) return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(options.recognition??{answers:[{question_number:1,student_answer:'Essay response',confidence:0.8,points:2.5},{question_number:2,student_answer:'B',confidence:0.9}],rule_violations:[]})}]}}]})
    throw new Error('Unexpected URL')
  })
  return calls
}
test('missing or invalid user authentication prevents provider requests',async(t)=>{
  const calls=mockBackend(t,{authInvalid:true})
  assert.equal((await handler(request(input,''))).status,401);assert.equal(calls.length,0)
  assert.equal((await handler(request())).status,401)
  assert.equal(calls.some(c=>c.url.includes('googleapis')),false)
})
test('unauthorized session and exceeded quota prevent provider requests',async(t)=>{
  const calls=mockBackend(t,{denied:true})
  assert.equal((await handler(request())).status,403)
  assert.equal(calls.some(c=>c.url.includes('googleapis')||c.url.includes('consume_reader_quota')),false)
})
test('quota rejects processing before any paid call',async(t)=>{
  const calls=mockBackend(t,{quotaExceeded:true})
  assert.equal((await handler(request())).status,429)
  assert.equal(calls.some(c=>c.url.includes('googleapis')),false)
})
test('invalid image or session is rejected before quota and provider calls',async(t)=>{
  const calls=mockBackend(t)
  assert.equal((await handler(request({...input,mimeType:'image/png'}))).status,400)
  assert.equal(calls.some(c=>c.url.includes('googleapis')||c.url.includes('consume_reader_quota')),false)
})
test('reader uses the authorized stored key and supports fractional essay points',async(t)=>{
  const calls=mockBackend(t)
  const response=await handler(request({...input,answerKey:[{rubric:'Injected rubric'}],rules:'Injected rules'}))
  assert.equal(response.status,200)
  const body=await response.json();assert.equal(body.answers[0].points,2.5)
  const provider=calls.find(c=>c.url.includes('googleapis'))
  const prompt=JSON.parse(provider.init.body).contents[0].parts[0].text
  assert.match(prompt,/Stored rubric/);assert.match(prompt,/Stored rules/)
  assert.doesNotMatch(prompt,/Injected rubric|Injected rules/)
})
test('malformed provider question IDs fail instead of producing a final grade',async(t)=>{
  mockBackend(t,{recognition:{answers:[{question_number:99,student_answer:'B',confidence:0.9}]}})
  assert.equal((await handler(request())).status,422)
})
test('missing confidence and missing questions remain explicitly uncertain',async(t)=>{
  mockBackend(t,{recognition:{answers:[{question_number:1,student_answer:'Essay response'}]}})
  const response=await handler(request());const body=await response.json()
  assert.equal(response.status,200);assert.equal(body.answers.length,2)
  assert.equal(body.answers[0].confidence,0);assert.equal(body.answers[1].confidence,0)
})
test('wrong HTTP methods are rejected without backend requests',async(t)=>{
  const calls=mockBackend(t)
  assert.equal((await handler(new Request('https://reader.example.test',{method:'GET'}))).status,405)
  assert.equal(calls.length,0)
})
