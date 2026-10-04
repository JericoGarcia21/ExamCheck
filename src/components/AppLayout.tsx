import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/classes', label: 'Classes', icon: '📚' },
  { to: '/checking', label: 'Checking', icon: '📝' },
  { to: '/results', label: 'Results', icon: '📊' },
]

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">ExamCheck</h1>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive ? 'font-medium text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <span className="text-lg leading-none">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
