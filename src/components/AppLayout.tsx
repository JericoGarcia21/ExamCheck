import { NavLink, Outlet } from 'react-router-dom'
import { Home, BookOpen, ClipboardCheck, BarChart3 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/classes', label: 'Classes', icon: BookOpen },
  { to: '/checking', label: 'Checking', icon: ClipboardCheck },
  { to: '/results', label: 'Results', icon: BarChart3 },
]

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-10">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3 md:max-w-5xl">
          <h1 className="text-lg font-semibold">ExamCheck</h1>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  isActive ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground'
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
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-6 md:max-w-5xl md:py-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card md:hidden">
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
              <link.icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
