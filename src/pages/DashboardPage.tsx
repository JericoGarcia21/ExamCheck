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
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">
            Welcome to ExamCheck. Create a class, paste your students, then start checking sessions.
          </p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-3">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 py-4">
                <t.icon className="h-6 w-6 text-primary" />
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
