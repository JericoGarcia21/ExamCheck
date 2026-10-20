import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { validateQuickKey } from '../supabase/functions/_shared/quickCheck.ts'

const settings={QUICK_CHECK_ENABLED:'true',QUICK_CHECK_ORIGIN:'https://app.example.test',QUICK_CHECK_GLOBAL_DAILY_LIMIT:'100',QUICK_CHECK_IP_HEADER:'x-test-trusted-ip',QUICK_CHECK_HASH_SECRET:'test-only-hash-secret',GEMINI_API_KEY:'test-provider-key',SUPABASE_URL:'https://backend.example.test',SUPABASE_SERVICE_ROLE_KEY:'test-service-key'}
const original=globalThis.Deno
let handler
before(async()=>{
  globalThis.Deno={env:{get:n=>settings[n]},serve:fn=>{handler=fn}}
  await import('../supabase/functions/quick-check/dashboard.ts')
})
after(()=>{globalThis.Deno=original})
const keys=[{question_number:1,correct_answer:'TRUE',question_type:'true_false',max_points:1}]
const input={mode:'sheet',keys,rules:'No erasures, uppercase only',mimeType:'image/jpeg',imageBase64:Buffer.from([255,216,255,0,0,0]).toString('base64')}
const request=(body=input,headers={})=>new Request('https://backend.example.test/functions/v1/quick-check',{method:'POST',headers:{origin:settings.QUICK_CHECK_ORIGIN,'x-test-trusted-ip':'192.0.2.1',...headers},body:JSON.stringify(body)})
function backend(t,options={}) {
  const calls=[]
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    calls.push({url:String(url),init})
    if(String(url).includes('/rpc/consume_quick_check_quota')) return Response.json(options.admitted??true,{status:options.quotaStatus??200})
    if(String(url).includes('/rpc/record_model_usage')) return new Response(null,{status:options.telemetryStatus??204})
    if(String(url).includes('googleapis.com')) return Response.json({usageMetadata:{promptTokenCount:12,candidatesTokenCount:5,totalTokenCount:17},candidates:[{content:{parts:[{text:JSON.stringify(options.output??{answers:[{question_number:1,student_answer:'True',confidence:0.99}],rule_violations:[]})}]}}]},{status:options.providerStatus??200})
    throw new Error('Unexpected API access')
  })
  return calls
}
test('guest reader accepts images without a login, returns verbatim readings, and hashes network identity',async t=>{
  const calls=backend(t)
  const response=await handler(request())
  assert.equal(response.status,200)
  assert.equal((await response.json()).answers[0].student_answer,'True')
  assert.equal(calls.length,3)
  assert.match(JSON.parse(calls[0].init.body).p_guest_hash,/^[a-f0-9]{64}$/)
  assert.equal(calls[0].init.body.includes('192.0.2.1'),false)
  assert.equal(calls[1].url.includes('test-provider-key'),false)
  assert.match(calls[1].init.body,/Preserve exact written letter case/)
  const usage=JSON.parse(calls[2].init.body)
  assert.equal(usage.p_source,'guest_sheet')
  assert.equal(usage.p_total,17)
  assert.equal(calls[2].init.body.includes('student_answer'),false)
})
test('invalid inputs and wrong origin never reach quota or provider',async t=>{
  const calls=backend(t)
  for(const body of [{...input,mode:'unknown'},{...input,keys:[]},{...input,keys:[{...keys[0],question_number:4}]},{...input,mimeType:'image/png'},{...input,rules:'x'.repeat(3001)}]) assert.equal((await handler(request(body))).status,400)
  assert.equal((await handler(request(input,{origin:'https://evil.example.test'}))).status,403)
  assert.equal((await handler(request(input,{'x-test-trusted-ip':''}))).status,403)
  assert.equal(calls.length,0)
})
test('disabled guest access makes no backend calls',async t=>{
  const calls=backend(t)
  const enabled=settings.QUICK_CHECK_ENABLED
  settings.QUICK_CHECK_ENABLED='false'
  try { assert.equal((await handler(request())).status,503) } finally { settings.QUICK_CHECK_ENABLED=enabled }
  assert.equal(calls.length,0)
})
test('quota/pause denial and unavailable counters prevent every paid call',async t=>{
  const calls=backend(t,{admitted:false})
  assert.equal((await handler(request())).status,429)
  assert.equal(calls.length,1)
})
test('failed quota checks fail closed',async t=>{
  const calls=backend(t,{quotaStatus:503})
  assert.equal((await handler(request())).status,503)
  assert.equal(calls.length,1)
})
test('key-photo output is validated before the editable preview',async t=>{
  backend(t,{output:{keys}})
  const response=await handler(request({...input,mode:'key'}))
  assert.equal(response.status,200)
  assert.equal((await response.json()).keys[0].correct_answer,'TRUE')
})
test('malformed provider IDs and over-awarded points fail instead of creating grades',async t=>{
  backend(t,{output:{answers:[{question_number:1,student_answer:'TRUE',confidence:0.9,points:2}]}})
  assert.equal((await handler(request())).status,422)
})
test('provider failures are not automatically retried',async t=>{
  const calls=backend(t,{providerStatus:503})
  assert.equal((await handler(request())).status,503)
  assert.equal(calls.filter(c=>c.url.includes('googleapis')).length,1)
})
test('key validation rejects invalid types, formats, limits and non-finite scores',()=>{
  assert.equal(validateQuickKey(keys).length,1)
  for(const patch of [{max_points:Infinity},{correct_answer:''},{correct_answer:'true?'},{question_type:'unknown'},{max_points:0}]) assert.throws(()=>validateQuickKey([{...keys[0],...patch}]))
  assert.throws(()=>validateQuickKey(Array.from({length:301},(_,i)=>({...keys[0],question_number:i+1}))))
})
