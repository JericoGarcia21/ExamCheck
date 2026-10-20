/** Metadata-only telemetry. Missing counts remain unknown; no prompts/images are stored. */
export function usageCounts(value: unknown) {
  const v = value && typeof value==='object' ? value as Record<string,unknown> : {}
  const count=(name:string) => typeof v[name]==='number' && Number.isSafeInteger(v[name]) && (v[name] as number)>=0 && (v[name] as number)<=1_000_000_000 ? v[name] as number : null
  return {p_input:count('promptTokenCount'),p_output:count('candidatesTokenCount'),p_thinking:count('thoughtsTokenCount'),p_cached:count('cachedContentTokenCount'),p_total:count('totalTokenCount')}
}

export async function trackedModelFetch(source:'signed_in'|'guest_key'|'guest_sheet',model:string,url:string,init:RequestInit):Promise<Response> {
  let response:Response|undefined
  try {
    response=await fetch(url,init)
    return response
  } finally {
    await recordResponseUsage(source,model,response)
  }
}

async function recordResponseUsage(source:string,model:string,response:Response|undefined) {
  // A telemetry outage must not discard a successfully read paper.
  try {
      const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const backend=Deno.env.get('SUPABASE_URL')
      if (!service || !backend) throw new Error('Telemetry not configured')
      let metadata:unknown
      try { metadata=(await response?.clone().json())?.usageMetadata } catch { /* Error bodies may not be JSON. */ }
      const saved=await fetch(backend+'/rest/v1/rpc/record_model_usage',{
        method:'POST',signal:AbortSignal.timeout(3000),
        headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},
        body:JSON.stringify({p_id:crypto.randomUUID(),p_source:source,p_model:model,p_status:response?.status??null,...usageCounts(metadata)}),
      })
      if (!saved.ok) throw new Error('Telemetry write rejected')
  } catch { console.warn('Model usage telemetry unavailable; token totals may be incomplete.') }
}
