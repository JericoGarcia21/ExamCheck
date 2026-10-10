import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { listAllSessions } from '../services/resultsService'
import { supabase } from '../lib/supabase'
import SessionListCard from '../components/SessionListCard'
import { Skeleton } from '../components/ui/skeleton'

const filters = [{ value: 'all', label: 'All sessions' }, { value: 'confirmed', label: 'Key confirmed' }, { value: 'draft', label: 'Draft keys' }] as const

export default function ResultsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'draft'>('all')
  const { data, isLoading, error } = useQuery({ queryKey: ['allSessions'], queryFn: listAllSessions })
  const { data: counts, error: countsError, isPending: countsPending } = useQuery({
    queryKey: ['sessionCounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('submissions').select('checking_session_id')
      if (error) throw error
      const map = new Map<string, number>()
      for (const row of data ?? []) map.set(row.checking_session_id, (map.get(row.checking_session_id) ?? 0) + 1)
      return map
    },
  })
  const query = search.trim().toLowerCase()
  const visible = data?.filter(session => {
    const matchesText = [session.session_name, session.classes?.block_name, session.classes?.school_year].some(value => value?.toLowerCase().includes(query))
    return matchesText && (filter === 'all' || session.answer_key_confirmed === (filter === 'confirmed'))
  }) ?? []
  const totalChecked = data?.reduce((total, session) => total + (counts?.get(session.id) ?? 0), 0) ?? 0

  return (
    <section className="space-y-6">
      <div className="page-heading">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Results</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Review checked papers and export your class grades.</p>
        </div>
        {!isLoading && !error && <p className="text-xs text-muted-foreground"><span className="font-medium tabular-nums text-foreground">{data?.length ?? 0}</span> sessions{!countsPending && !countsError && <> · <span className="font-medium tabular-nums text-foreground">{totalChecked}</span> papers checked</>}</p>}
      </div>

      <div className="space-y-4">
        <div className="relative md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input type="search" aria-label="Search sessions or classes" placeholder="Search sessions or classes" value={search} onChange={event => setSearch(event.target.value)} className="h-11 w-full rounded-lg border bg-card pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 [&::-webkit-search-cancel-button]:appearance-none" />
          {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><X className="size-4" /></button>}
        </div>
        <div className="flex flex-wrap gap-5 border-b" role="group" aria-label="Filter sessions">
          {filters.map(item => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={'min-h-11 border-b-2 px-0.5 text-[13px] transition-colors ' + (filter === item.value ? 'border-primary font-medium text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{item.label}</button>)}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
      {countsError && <p role="alert" className="text-sm text-destructive">Paper counts could not load. {countsError.message}</p>}
      {isLoading ? (
        <div className="session-list" aria-label="Loading sessions" aria-busy="true">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="space-y-3 border-b p-5 last:border-0"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-52 max-w-full" /><Skeleton className="h-3 w-24" /></div>)}</div>
      ) : !error && data?.length === 0 ? (
        <div className="rounded-lg border border-dashed px-5 py-10">
          <h3 className="text-sm font-semibold">Your results will appear here</h3>
          <p className="mt-2 text-sm text-muted-foreground">Create a session in one of your classes to start checking papers.</p>
          <Link to="/classes" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">Go to classes <ArrowRight className="size-4" /></Link>
        </div>
      ) : !error && visible.length === 0 ? (
        <div className="py-8 text-center"><h3 className="text-sm font-medium">No sessions found</h3><p className="mt-2 text-sm text-muted-foreground">Try a different name or another filter.</p><button type="button" onClick={() => { setSearch(''); setFilter('all') }} className="mt-3 min-h-11 text-sm font-medium text-primary">Clear filters</button></div>
      ) : !error && (
        <div>
          <p className="mb-3 text-xs font-medium text-muted-foreground" aria-live="polite">{visible.length} {visible.length === 1 ? 'session' : 'sessions'}{query || filter !== 'all' ? ' shown' : ''}</p>
          <div className="session-list">{visible.map(session => <SessionListCard key={session.id} to={'/results/' + session.id} title={session.session_name} block={session.classes?.block_name} schoolYear={session.classes?.school_year} date={session.session_date} confirmed={session.answer_key_confirmed} checked={counts ? counts.get(session.id) ?? 0 : undefined} />)}</div>
          <p className="mt-4 text-xs text-muted-foreground">Open a session to review scores and download grades.</p>
        </div>
      )}
    </section>
  )
}
