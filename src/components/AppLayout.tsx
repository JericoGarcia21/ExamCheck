import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/classes', label: 'Classes' },
  { to: '/checking', label: 'Checking' },
  { to: '/results', label: 'Results' },
]

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">ExamCheck</h1>
          <nav className="flex items-center gap-4 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  isActive ? 'font-medium text-blue-600' : 'text-gray-600 hover:text-gray-900'
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
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
