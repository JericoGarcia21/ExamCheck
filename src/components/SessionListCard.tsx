import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface SessionListCardProps {
  to: string
  title: string | null
  block?: string
  schoolYear?: string
  date: string
  confirmed: boolean
  checked?: number
}

function formatDate(value: string) {
  const date = new Date(value + 'T00:00:00')
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SessionListCard({ to, title, block, schoolYear, date, confirmed, checked }: SessionListCardProps) {
  return (
    <Link to={to} className="session-row group outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
      <div className="min-w-0">
        <h3 className="break-words text-[15px] font-semibold leading-snug group-hover:text-primary">{title || 'Untitled session'}</h3>
        <p className="mt-1 break-words text-sm text-muted-foreground">{block || 'No class'}{schoolYear && <span className="text-muted-foreground/80"> · {schoolYear}</span>}</p>
        <time dateTime={date} className="mt-2 block text-xs text-muted-foreground">{formatDate(date)}</time>
      </div>
      <div className="session-row-status">
        <span className={confirmed ? 'session-status session-status-confirmed' : 'session-status'}>
          <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
          {confirmed ? 'Key confirmed' : 'Draft key'}
        </span>
        {checked !== undefined && <span className="text-xs text-muted-foreground"><strong className="font-medium tabular-nums text-foreground">{checked}</strong> {checked === 1 ? 'paper' : 'papers'} checked</span>}
      </div>
      <ChevronRight className="session-row-arrow size-4 text-muted-foreground/60 group-hover:text-primary" aria-hidden="true" />
    </Link>
  )
}
