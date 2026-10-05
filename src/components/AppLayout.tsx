import { NavLink, Outlet } from 'react-router-dom'
import { Home, BookOpen, ClipboardCheck, BarChart3, WifiOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import ErrorBoundary from './ErrorBoundary'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/classes', label: 'Classes', icon: BookOpen },
  { to: '/checking', label: 'Checking', icon: ClipboardCheck },
  { to: '/results', label: 'Results', icon: BarChart3 },
]

export default function AppLayout() {
  const online = useOnlineStatus()

  return (
    <div className="min-h-screen text-foreground pb-24 lg:pb-10">
      <header className="sticky top-0 z-10 border-b border-white/40 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3 lg:max-w-5xl">
          <h1 className="font-heading text-lg font-semibold">
            <span className="text-primary">Exam</span>Check
          </h1>
          <nav className="hidden items-center gap-1 text-sm lg:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition-colors ${
                    isActive
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Sign out
          </button>
        </div>

        {!online && (
          <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-xs text-amber-900">
            <WifiOff className="h-3.5 w-3.5" />
            You are offline. Checking papers needs an internet connection.
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-6 lg:max-w-5xl lg:px-6 lg:py-10">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/40 bg-white/80 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around px-2 py-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-xs transition-colors ${
                  isActive ? 'font-medium text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
