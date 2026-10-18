import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, BookOpen, ClipboardCheck, BarChart3, WifiOff, LogOut, ChevronRight, ScanLine } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import ErrorBoundary from './ErrorBoundary'

const links = [
  { to: '/', label: 'Overview', icon: Home },
  { to: '/classes', label: 'Classes', icon: BookOpen },
  { to: '/checking', label: 'Checking', icon: ClipboardCheck },
  { to: '/results', label: 'Results', icon: BarChart3 },
]

export default function AppLayout() {
  const online = useOnlineStatus()
  const { pathname } = useLocation()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(false)
  const activePage = pathname.startsWith('/sessions') ? 'Checking' : links.find(link => link.to !== '/' && pathname.startsWith(link.to))?.label ?? 'Overview'

  async function signOut() {
    setSigningOut(true)
    setSignOutError(false)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      window.location.href = '/login'
    } catch {
      setSigningOut(false)
      setSignOutError(true)
    }
  }

  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="workspace-sidebar">
        <Link to="/" className="workspace-brand" aria-label="ExamCheck home"><ClipboardCheck size={27} aria-hidden="true" /><span>ExamCheck<span className="brand-dot">.</span></span></Link>
        <p className="workspace-caption">Your teacher workspace</p>
        <nav aria-label="Main navigation" className="workspace-nav">
          {links.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => 'workspace-nav-link' + (isActive || (link.to === '/checking' && pathname.startsWith('/sessions')) ? ' is-active' : '')}><link.icon size={19} aria-hidden="true" /><span>{link.label}</span><ChevronRight className="nav-chevron" size={15} aria-hidden="true" /></NavLink>)}
        </nav>
        <div className="sidebar-note"><ScanLine size={22} aria-hidden="true" /><p>Paper to results.<br /><span>With you in control.</span></p></div>
        <div className="sidebar-footer"><span className="teacher-avatar" aria-hidden="true"><BookOpen size={19} /></span><div><strong>Teacher workspace</strong><span>ExamCheck</span></div></div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <Link to="/" className="mobile-brand"><ClipboardCheck size={23} aria-hidden="true" />ExamCheck<span className="brand-dot">.</span></Link>
          <div className="workspace-breadcrumb"><span>Workspace</span><ChevronRight size={14} aria-hidden="true" /><strong>{activePage}</strong></div>
          <div className="workspace-account"><span className={'connection-status' + (!online ? ' is-offline' : '')}><span aria-hidden="true" />{online ? 'Online' : 'Offline'}</span><button type="button" onClick={() => void signOut()} disabled={signingOut} className="signout-button"><LogOut size={16} aria-hidden="true" /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span></button></div>
        </header>
        {!online && <div role="status" className="workspace-notice"><WifiOff size={16} aria-hidden="true" />You are offline. Checking papers needs an internet connection.</div>}
        {signOutError && <p role="alert" className="workspace-notice">Could not sign out. Check your connection and try again.</p>}
        <main id="main-content" tabIndex={-1} className="workspace-main"><ErrorBoundary><Outlet /></ErrorBoundary></main>
      </div>
      <nav aria-label="Mobile navigation" className="workspace-mobile-nav">{links.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => 'mobile-nav-link' + (isActive || (link.to === '/checking' && pathname.startsWith('/sessions')) ? ' is-active' : '')}><link.icon size={21} aria-hidden="true" /><span>{link.label}</span></NavLink>)}</nav>
    </div>
  )
}
