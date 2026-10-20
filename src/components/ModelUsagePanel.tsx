import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getModelUsage, setGuestGlobalLimit } from '../services/adminService'

const format=(value:number|null) => value===null ? 'Unknown' : value.toLocaleString()
const sources={signed_in:'Signed-in checking',guest_key:'Guest key photos',guest_sheet:'Guest answer sheets'}

export default function ModelUsagePanel() {
  const client=useQueryClient()
  const usage=useQuery({queryKey:['modelUsage'],queryFn:getModelUsage,refetchInterval:30_000})
  const [draft,setDraft]=useState('')
  const mutation=useMutation({mutationFn:async()=>{
    const value=Number(draft)
    if(!draft.trim() || !Number.isInteger(value) || value<0 || value>10000) throw new Error('Enter an integer from 0 to 10000.')
    await setGuestGlobalLimit(value)
  },onSuccess:async()=>{setDraft('');await Promise.all([client.invalidateQueries({queryKey:['modelUsage']}),client.invalidateQueries({queryKey:['quickCheckSettings']})])}})
  const data=usage.data
  return <section className="space-y-4 rounded-xl border bg-card p-5" aria-labelledby="model-usage-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="model-usage-title" className="text-lg font-semibold">Model usage & guest limits</h2><p className="mt-1 text-sm text-muted-foreground">App usage in UTC. Refreshes every 30 seconds.</p></div><button className="action-link action-link-outline" onClick={()=>void usage.refetch()} disabled={usage.isFetching}>Refresh usage</button></div>
    {usage.isPending ? <p role="status">Loading model usage…</p> : usage.isError ? <p role="alert">Could not load usage. Apply the usage analytics migration and use Refresh usage to retry.</p> : data && <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{([
        ['Guest scans today',data.guest_today],['Guest scans · 30 days',data.guest_30_days],['Guest daily cap',data.global_limit],['Guest scans remaining today',Math.max(0,data.global_limit-data.guest_today)],
      ] as const).map(([label,value])=><div key={label} className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{format(value)}</dd></div>)}</dl>
      <p className="text-xs text-muted-foreground">These are app-enforced scan limits, not Gemini provider quota. Per-network allowance: {data.daily_limit}/day. Counts include admitted failed reads; token metadata is recorded separately. Pausing the app blocks scans even when allowance remains. Guest history before the analytics migration may be incomplete.</p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();mutation.mutate()}}><label className="text-sm">Global guest scan cap per UTC day<input className="mt-1 block w-44 rounded-md border px-3 py-2" aria-label="Global guest scan cap per UTC day" type="number" required min={0} max={10000} step={1} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={String(data.global_limit)} /></label><button className="action-link action-link-outline" disabled={mutation.isPending}>Save global cap</button></form>
      <p className="text-xs text-muted-foreground">Zero disables guest scans. Lowering a cap below today’s usage stops further scans without erasing recorded usage.</p>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}{mutation.isSuccess && <p role="status">Global cap saved.</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-3 text-left font-medium">Provider-reported tokens · last 30 UTC days</caption><thead><tr>{['Workflow / model','Attempts','Failed HTTP / network','With total tokens','Input','Output','Thinking','Cached input','Total'].map(label=><th key={label} scope="col" className="whitespace-nowrap p-2">{label}</th>)}</tr></thead><tbody>{data.models.map(row=><tr key={row.source+row.model} className="border-t"><th scope="row" className="p-2 font-normal"><span className="block font-medium">{sources[row.source]}</span><span className="whitespace-nowrap text-xs text-muted-foreground">{row.model}</span></th>{[row.attempts,row.failed_attempts,row.reported_attempts,row.input_tokens,row.output_tokens,row.thinking_tokens,row.cached_tokens,row.total_tokens].map((value,i)=><td key={i} className="p-2 tabular-nums whitespace-nowrap">{format(value)}</td>)}</tr>)}</tbody></table></div>
      {data.models.length===0 && <p>No model usage has been recorded yet. Deploy the updated reader functions to start tracking.</p>}
      <p className="text-xs text-muted-foreground">{data.tracking_since ? `Available tracking begins ${new Date(data.tracking_since).toLocaleString()}. ` : ''}Only recorded responses are included. Unknown means the provider did not report that count. Retry/fallback attempts are separate rows in storage. Telemetry outages can leave gaps; prior token usage cannot be reconstructed. Cached input is a subset of input tokens; do not add it again. HTTP success does not guarantee the paper was readable.</p>
      <details><summary className="cursor-pointer text-sm">Daily Quick Check counts</summary><div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Quick Check admissions per UTC day</caption><thead><tr><th scope="col">Date</th><th scope="col">Scans</th></tr></thead><tbody>{data.daily.map(day=><tr key={day.day}><th scope="row" className="py-1 font-normal">{day.day.slice(0,10)}</th><td>{format(day.guest_scans)}</td></tr>)}</tbody></table></div></details>
    </>}
    <div className="space-y-2 border-t pt-4 text-sm"><h3 className="font-medium">Provider quota & billing</h3><p className="text-muted-foreground">Live provider balances are not connected. App token counts are not an invoice and do not include other apps using the same Google project.</p><div className="flex flex-wrap gap-3"><a className="underline underline-offset-4" href="https://aistudio.google.com/usage" target="_blank" rel="noopener noreferrer">Open Gemini usage</a><a className="underline underline-offset-4" href="https://aistudio.google.com/rate-limit?timeRange=last-28-days" target="_blank" rel="noopener noreferrer">Open active provider rate limits</a><a className="underline underline-offset-4" href="https://console.cloud.google.com/billing" target="_blank" rel="noopener noreferrer">Open Google Cloud billing</a></div></div>
  </section>
}
