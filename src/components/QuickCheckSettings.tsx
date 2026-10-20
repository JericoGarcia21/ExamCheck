import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getQuickCheckSettings } from '../services/quickCheckService'
export default function QuickCheckSettings() {
  const client=useQueryClient()
  const settings=useQuery({queryKey:['quickCheckSettings'],queryFn:getQuickCheckSettings})
  const [draft,setDraft]=useState('')
  const mutation=useMutation({mutationFn:async () => {
    const value=Number(draft)
    if (!draft.trim() || !Number.isInteger(value) || value<0 || value>100) throw new Error('Enter an integer from 0 to 100.')
    const {error}=await supabase.rpc('admin_set_quick_check_limit',{p_limit:value})
    if (error) throw error
  },onSuccess:async()=>{setDraft('');await client.invalidateQueries({queryKey:['quickCheckSettings']})}})
  return <section className="space-y-3 rounded-xl border bg-card p-5" aria-labelledby="guest-settings-title">
    <h2 id="guest-settings-title" className="text-lg font-semibold">Quick Check guest allowance</h2>
    <p className="text-sm text-muted-foreground">Default: 5 scans per network per UTC day. Key photos and answer sheets each use one scan, including failed reads. Set 0 to disable guest scans.</p>
    {settings.isPending ? <p role="status">Loading guest limit…</p> : settings.isError ? <p role="alert">Could not load the guest setting. <button onClick={()=>void settings.refetch()}>Retry</button></p> : <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();mutation.mutate()}}>
      <label className="text-sm">Daily guest scan limit (currently {settings.data.daily_limit})<input aria-label="Daily guest scan limit" type="number" min={0} max={100} step={1} required value={draft} onChange={e=>setDraft(e.target.value)} className="mt-1 block w-40 rounded-md border px-3 py-2" /></label>
      <button className="action-link action-link-outline" disabled={mutation.isPending}>Save guest limit</button>
    </form>}
    {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    {mutation.isSuccess && <p role="status">Guest limit saved.</p>}
  </section>
}
