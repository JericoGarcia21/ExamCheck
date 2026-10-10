import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'

interface SessionListCardProps {
  to: string
  title: string | null
  block?: string
  schoolYear?: string
  date: string
  confirmed: boolean
  checked?: number
}

export default function SessionListCard({ to, title, block, schoolYear, date, confirmed, checked }: SessionListCardProps) {
  return (
    <Link to={to} className="group block min-w-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <Card size="sm" className="transition-colors group-hover:bg-muted/50 group-active:bg-muted">
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="break-words text-base font-semibold leading-snug">{title || 'Untitled session'}</h3>
              <p className="break-words text-sm text-muted-foreground">{[block, schoolYear].filter(Boolean).join(' · ')}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                <time dateTime={date}>{date}</time>
              </p>
            </div>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <span className="whitespace-nowrap text-sm text-muted-foreground">{checked === undefined ? 'Answer key' : checked + ' checked'}</span>
            <Badge variant={confirmed ? 'default' : 'secondary'} className="shrink-0">{confirmed ? 'Key confirmed ✓' : 'Draft'}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
