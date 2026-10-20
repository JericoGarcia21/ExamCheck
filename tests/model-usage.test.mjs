import {test,after} from 'node:test'
import assert from 'node:assert/strict'
import {usageCounts,trackedModelFetch} from '../supabase/functions/_shared/modelUsage.ts'
const original=globalThis.Deno
after(()=>{globalThis.Deno=original})
const configure=()=>{globalThis.Deno={env:{get:n=>({SUPABASE_URL:'https://backend.example.test',SUPABASE_SERVICE_ROLE_KEY:'test-service-key'}[n])}}}

test('provider token counts stay unknown when absent, malformed or unsafe',()=>{
  assert.deepEqual(usageCounts(null),{p_input:null,p_output:null,p_thinking:null,p_cached:null,p_total:null})
  assert.deepEqual(usageCounts({promptTokenCount:0,candidatesTokenCount:5,thoughtsTokenCount:3,cachedContentTokenCount:2,totalTokenCount:8}),{p_input:0,p_output:5,p_thinking:3,p_cached:2,p_total:8})
  assert.equal(usageCounts({totalTokenCount:-1}).p_total,null)
  assert.equal(usageCounts({totalTokenCount:'50'}).p_total,null)
  assert.equal(usageCounts({totalTokenCount:Infinity}).p_total,null)
  assert.equal(usageCounts({totalTokenCount:1.2}).p_total,null)
})
test('token telemetry preserves successful response when the database is unavailable',async t=>{
  configure()
  const calls=[]
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    calls.push({url,init})
    if(String(url).includes('provider')) return Response.json({usageMetadata:{totalTokenCount:10},answer:'preserved'})
    return new Response(null,{status:503})
  })
  const response=await trackedModelFetch('signed_in','test-model','https://provider.example.test',{})
  assert.equal((await response.json()).answer,'preserved')
  assert.equal(JSON.parse(calls[1].init.body).p_total,10)
  assert.equal(JSON.parse(calls[1].init.body).p_status,200)
})
test('network failures record an unknown outcome and rethrow without an automatic retry',async t=>{
  configure()
  const calls=[]
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    calls.push({url,init})
    if(String(url).includes('provider')) throw new Error('network down')
    return new Response(null,{status:204})
  })
  await assert.rejects(()=>trackedModelFetch('guest_key','test-model','https://provider.example.test',{}),/network down/)
  const recorded=JSON.parse(calls[1].init.body)
  assert.equal(recorded.p_status,null);assert.equal(recorded.p_total,null)
  assert.equal(calls.length,2)
})
