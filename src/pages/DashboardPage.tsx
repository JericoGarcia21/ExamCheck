import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Check, ClipboardCheck, ScanLine, FileCheck2, Download } from 'lucide-react'
import { listClasses } from '../services/classService'
import { listAllSessions } from '../services/resultsService'
import SessionListCard from '../components/SessionListCard'
import { Skeleton } from '../components/ui/skeleton'

const steps = [
  { title: 'Prepare your class', description: 'Add a roster and create a checking session.', icon: BookOpen },
  { title: 'Capture and review', description: 'Verify the answer key, then capture each paper.', icon: ScanLine },
  { title: 'Save your results', description: 'Review uncertain answers and export your grades.', icon: FileCheck2 },
]

export default function DashboardPage() {
  const classes = useQuery({ queryKey: ['classes', 'active'], queryFn: () => listClasses() })
  const sessions = useQuery({ queryKey: ['allSessions'], queryFn: listAllSessions })
  const latest = sessions.data?.[0]
  const ready = sessions.data?.filter(session => session.answer_key_confirmed).length ?? 0

  return (
    <section className="dashboard">
      <div className="page-heading"><div><h1 className="page-title">A little less paperwork.</h1><p className="page-description">Your classes, papers, and results. All in one place.</p></div><Link to="/classes" className="action-link action-link-outline"><BookOpen size={16} aria-hidden="true" />Manage classes</Link></div>
      <div className="dashboard-summary" aria-label="Workspace summary"><span>{classes.isPending ? 'Loading classes…' : classes.isError ? 'Classes unavailable' : <><strong>{classes.data?.length ?? 0}</strong> active {(classes.data?.length ?? 0) === 1 ? 'class' : 'classes'}</>}</span><span>{sessions.isPending ? 'Loading sessions…' : sessions.isError ? 'Sessions unavailable' : <><strong>{sessions.data?.length ?? 0}</strong> checking sessions</>}</span>{sessions.isSuccess && <span><span className="summary-dot" aria-hidden="true" /><strong>{ready}</strong> with a confirmed key</span>}</div>
      <div className="dashboard-start"><div className="dashboard-start-copy"><h2>Ready for the next paper?</h2><p>{latest ? 'Pick up your latest session, or open another one below.' : 'Start with a class and a roster. Your next exam gets easier from there.'}</p><Link to={latest ? '/sessions/' + latest.id : '/classes'} className="action-link action-link-primary">{latest ? 'Continue checking' : 'Set up a class'}<ArrowRight size={17} aria-hidden="true" /></Link></div><div className="checking-sequence" aria-label="Checking workflow"><span><ScanLine size={23} aria-hidden="true" /><strong>Capture</strong><small>A paper at a time</small></span><i aria-hidden="true" /><span><ClipboardCheck size={23} aria-hidden="true" /><strong>Review</strong><small>You make the call</small></span><i aria-hidden="true" /><span><Check size={23} aria-hidden="true" /><strong>Save</strong><small>Then the next one</small></span></div></div>
      <div className="dashboard-columns"><section aria-labelledby="recent-sessions-title" className="dashboard-sessions"><div className="section-heading"><h2 id="recent-sessions-title">Recent sessions</h2><Link to="/checking">View all<ArrowRight size={15} aria-hidden="true" /></Link></div>
        {sessions.isPending ? <div className="session-list" aria-busy="true" aria-label="Loading recent sessions">{[0, 1, 2].map(index => <div className="loading-row" key={index}><Skeleton className="h-4 w-40" /><Skeleton className="mt-3 h-3 w-28" /></div>)}</div> : sessions.isError ? <div className="workspace-empty"><h3>Sessions could not load</h3><p>Check your connection and try again.</p><button type="button" className="action-link action-link-outline" onClick={() => void sessions.refetch()}>Try again</button></div> : sessions.data.length ? <div className="session-list">{sessions.data.slice(0, 4).map(session => <SessionListCard key={session.id} to={'/sessions/' + session.id} title={session.session_name} block={session.classes?.block_name} schoolYear={session.classes?.school_year} date={session.session_date} confirmed={session.answer_key_confirmed} />)}</div> : <div className="workspace-empty"><ClipboardCheck size={30} aria-hidden="true" /><h3>Your first session starts here</h3><p>Create a class, add your students, and open a checking session.</p><Link to="/classes" className="action-link action-link-outline">Go to classes<ArrowRight size={15} aria-hidden="true" /></Link></div>}
      </section><aside className="dashboard-guide" aria-labelledby="workflow-title"><h2 id="workflow-title">From paper to results</h2><ol className="workflow-guide">{steps.map((step, index) => <li key={step.title}><span className="workflow-marker" aria-hidden="true">{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol><Link to="/results" className="results-shortcut"><Download size={18} aria-hidden="true" /><span><strong>Looking for grades?</strong><small>Review and export your results</small></span><ArrowRight size={16} aria-hidden="true" /></Link></aside></div>
    </section>
  )
}
