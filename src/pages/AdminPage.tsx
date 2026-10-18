import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppAccess } from '../hooks/useAppAccess'
import { getAdminAccounts, getAdminAnalytics, setAccountSuspended, setAppPaused } from '../services/adminService'

export default function AdminPage() {
  const access = useAppAccess()
  if (!access.data?.admin) return <p role="alert">Admin access required.</p>
  return <AdminDashboard paused={access.data.paused} />
}

function AdminDashboard({ paused }: { paused: boolean }) {
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [offset, setOffset] = useState(0)
  const [notice, setNotice] = useState('')
  const analytics = useQuery({ queryKey: ['adminAnalytics'], queryFn: getAdminAnalytics, refetchInterval: 30_000 })
  const accounts = useQuery({ queryKey: ['adminAccounts', search, offset], queryFn: () => getAdminAccounts(search, offset) })
  const mutation = useMutation({
    mutationFn: (change: { type: 'pause'; value: boolean } | { type: 'account'; id: string; value: boolean }) => change.type === 'pause' ? setAppPaused(change.value) : setAccountSuspended(change.id, change.value),
    onSuccess: async (_, change) => {
      setNotice(change.type === 'pause' ? (change.value ? 'App paused. New teacher activity and AI requests are blocked.' : 'App resumed.') : (change.value ? 'Account suspended.' : 'Account restored.'))
      await Promise.all([client.invalidateQueries({ queryKey: ['appAccess'] }), client.invalidateQueries({ queryKey: ['adminAccounts'] }), client.invalidateQueries({ queryKey: ['adminAnalytics'] })])
    },
  })
  const data = analytics.data
  const max = Math.max(1, ...data?.daily.map(day => day.requests) ?? [])
  return <section className="space-y-6">
    <div className="page-heading"><div><h1 className="page-title">Administration</h1><p className="page-description">Accounts and overall ExamCheck usage.</p></div><button className="action-link action-link-outline" onClick={() => { void analytics.refetch(); void accounts.refetch(); void accessRefresh() }}>Refresh</button></div>
    <section className="rounded-xl border bg-card p-5 space-y-3" aria-labelledby="app-control-title">
      <h2 id="app-control-title" className="text-lg font-semibold">App is {paused ? 'paused' : 'running'}</h2>
      <p className="text-sm text-muted-foreground">Pause teacher activity and new AI requests to protect your credits. Requests already sent may still finish. Admin access stays available.</p>
      <button className="action-link action-link-outline" disabled={mutation.isPending} onClick={() => {
        if (window.confirm(paused ? 'Resume teacher activity and AI reading?' : 'Pause the app for all teachers and stop new AI requests?')) mutation.mutate({ type: 'pause', value: !paused })
      }}>{paused ? 'Resume app' : 'Pause app'}</button>
    </section>
    {notice && <p role="status">{notice}</p>}
    {mutation.isError && <p role="alert" className="text-destructive">Change failed. {mutation.error.message}</p>}
    {analytics.isPending ? <p role="status">Loading analytics…</p> : analytics.isError ? <p role="alert">Analytics could not load. Use Refresh to retry.</p> : data && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-label="Overall usage">
        {([['Accounts', data.accounts], ['Suspended accounts', data.suspended], ['Classes', data.classes], ['Checking sessions', data.sessions], ['Papers saved', data.papers], ['AI reader requests', data.requests]] as const).map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value.toLocaleString()}</p></div>)}
      </div>
      <section className="rounded-xl border bg-card p-5 space-y-4" aria-labelledby="usage-title">
        <h2 id="usage-title" className="text-lg font-semibold">AI usage · last 30 days</h2>
        <p className="text-sm text-muted-foreground">Daily reader requests in UTC, including failed reads. These counts do not measure tokens, provider retries, or credit balances.</p>
        {data.daily.every(day => day.requests === 0) && <p>No AI requests in the last 30 days.</p>}
        <div className="flex h-36 items-end gap-1" aria-hidden="true">{data.daily.map(day => <div key={day.day} title={`${day.day}: ${day.requests}`} className="flex-1 rounded-t bg-emerald-700" style={{ height: `${Math.max(1, day.requests / max * 100)}%` }} />)}</div>
        <details><summary className="cursor-pointer text-sm">View daily counts</summary><div className="max-h-64 overflow-auto mt-3"><table className="w-full text-sm text-left"><caption className="sr-only">Daily AI reader request counts in UTC</caption><thead><tr><th scope="col">Date (UTC)</th><th scope="col">Requests</th></tr></thead><tbody>{data.daily.map(day => <tr key={day.day}><th scope="row" className="font-normal py-1">{day.day}</th><td>{day.requests}</td></tr>)}</tbody></table></div></details>
      </section>
    </>}
    <section className="rounded-xl border bg-card p-5 space-y-4" aria-labelledby="accounts-title">
      <h2 id="accounts-title" className="text-lg font-semibold">Accounts</h2>
      <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setSearch(draft.trim()); setOffset(0) }}><label htmlFor="account-search" className="sr-only">Search accounts by name or email</label><input id="account-search" className="min-w-0 flex-1 rounded-md border px-3 py-2" placeholder="Search name or email" maxLength={200} value={draft} onChange={event => setDraft(event.target.value)} /><button className="action-link action-link-outline" type="submit">Search</button></form>
      {accounts.isPending ? <p role="status">Loading accounts…</p> : accounts.isError ? <p role="alert">Accounts could not load. Use Refresh to retry.</p> : accounts.data?.length === 0 ? <p>No accounts found.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="sr-only">Registered accounts and access controls</caption><thead><tr><th scope="col" className="p-2">Account</th><th scope="col" className="p-2">Joined</th><th scope="col" className="p-2">Status</th><th scope="col" className="p-2">Action</th></tr></thead><tbody>{accounts.data?.map(account => <tr key={account.id} className="border-t"><td className="p-2"><p className="font-medium">{account.full_name || 'Unnamed account'}</p><p className="text-muted-foreground">{account.email || 'No email'}</p></td><td className="p-2 whitespace-nowrap">{new Date(account.created_at).toLocaleDateString()}</td><td className="p-2">{account.is_admin ? 'Admin' : account.suspended ? 'Suspended' : 'Active'}</td><td className="p-2">{!account.is_admin && <button className="action-link action-link-outline" disabled={mutation.isPending} aria-label={`${account.suspended ? 'Restore' : 'Suspend'} ${account.email || account.full_name || 'account'}`} onClick={() => {
        if (window.confirm(`${account.suspended ? 'Restore access for' : 'Suspend'} ${account.email || account.full_name || 'this account'}?`)) mutation.mutate({ type: 'account', id: account.id, value: !account.suspended })
      }}>{account.suspended ? 'Restore' : 'Suspend'}</button>}</td></tr>)}</tbody></table></div>}
      <div className="flex items-center gap-3"><button className="action-link action-link-outline" disabled={offset === 0 || accounts.isFetching} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</button><span className="text-sm">Page {offset / 50 + 1}</span><button className="action-link action-link-outline" disabled={accounts.data?.length !== 50 || accounts.isFetching} onClick={() => setOffset(offset + 50)}>Next</button></div>
    </section>
  </section>

  function accessRefresh() { return client.invalidateQueries({ queryKey: ['appAccess'] }) }
}
