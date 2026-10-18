import { Button } from '../components/ui/button'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, ClipboardCheck, Search, X } from 'lucide-react'
import { listAllSessions } from '../services/resultsService'
import SessionListCard from '../components/SessionListCard'
import { Skeleton } from '../components/ui/skeleton'

export default function CheckingPage() {
  const [search, setSearch] = useState('')
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['allSessions'], queryFn: listAllSessions })
  const query = search.trim().toLowerCase()
  const visible = data?.filter(session => [session.session_name, session.classes?.block_name, session.classes?.school_year].some(value => value?.toLowerCase().includes(query))) ?? []

  return (
    <section className="space-y-6">
      <div className="page-heading"><div><h1 className="page-title">Checking sessions</h1><p className="page-description">Pick up where you left off. Open a session to check the next paper.</p></div><Link to="/classes" className="action-link action-link-outline"><BookOpen size={16} aria-hidden="true" />Open a class</Link></div>
      <div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input type="search" aria-label="Search checking sessions or classes" placeholder="Search sessions or classes" value={search} onChange={event => setSearch(event.target.value)} className="h-11 w-full rounded-lg border bg-card pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 [&::-webkit-search-cancel-button]:appearance-none" />{search && <Button variant="ghost" size="icon" type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><X className="size-4" aria-hidden="true" /></Button>}</div>
      {isPending ? <div className="session-list" aria-busy="true" aria-label="Loading checking sessions">{[0, 1, 2].map(index => <div className="loading-row" key={index}><Skeleton className="h-4 w-40" /><Skeleton className="mt-3 h-3 w-28" /></div>)}</div> : error ? <div className="workspace-empty" role="alert"><h2>Sessions could not load</h2><p>Check your connection and try again.</p><button type="button" onClick={() => void refetch()} className="action-link action-link-outline">Try again</button></div> : data?.length === 0 ? <div className="workspace-empty"><ClipboardCheck size={30} aria-hidden="true" /><h2>No checking sessions yet</h2><p>Open a class and create a session. Add an answer key, then start capturing papers.</p><Link to="/classes" className="action-link action-link-outline">Go to classes<ArrowRight size={16} aria-hidden="true" /></Link></div> : visible.length === 0 ? <div className="workspace-empty"><h2>No sessions found</h2><p>Try another session or class name.</p><button type="button" className="action-link action-link-outline" onClick={() => setSearch('')}>Clear search</button></div> : <div><p className="mb-3 text-xs text-muted-foreground" aria-live="polite">{visible.length} {visible.length === 1 ? 'session' : 'sessions'}{query && ' found'}</p><div className="session-list">{visible.map(session => <SessionListCard key={session.id} to={'/sessions/' + session.id} title={session.session_name} block={session.classes?.block_name} schoolYear={session.classes?.school_year} date={session.session_date} confirmed={session.answer_key_confirmed} />)}</div></div>}
    </section>
  )
}
