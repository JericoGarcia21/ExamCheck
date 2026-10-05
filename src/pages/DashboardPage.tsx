import { Link } from 'react-router-dom'
import { BookOpen, ClipboardCheck, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'

const tiles = [
  { to: '/classes', label: 'Classes', icon: BookOpen, desc: 'Manage blocks & students' },
  { to: '/checking', label: 'Checking', icon: ClipboardCheck, desc: 'Grade papers faster' },
  { to: '/results', label: 'Results', icon: BarChart3, desc: 'View & export grades' },
]

export default function DashboardPage() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Welcome back to ExamCheck.</p>
      </div>

      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">
            Create a class, paste your students, then start a checking session. The longer your roster lives here, the
            faster every future exam gets.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="transition-transform hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-4 py-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                  <t.icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-medium">{t.label}</p>
                  <p className="text-sm text-muted-foreground">{t.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
