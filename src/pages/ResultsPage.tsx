import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listAllSessions } from '../services/resultsService'
import { supabase } from '../lib/supabase'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'

export default function ResultsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['allSessions'],
    queryFn: listAllSessions,
  })

  const { data: counts } = useQuery({
    queryKey: ['sessionCounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('submissions').select('checking_session_id')
      if (error) throw error
      const map = new Map<string, number>()
      for (const row of data ?? []) {
        map.set(row.checking_session_id, (map.get(row.checking_session_id) ?? 0) + 1)
      }
      return map
    },
  })

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Results</h2>
      <p className="text-sm text-muted-foreground">
        View results for each checking session and export the grades.
      </p>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-5 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {data?.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No checking sessions yet. Check some papers first.
          </CardContent>
        </Card>
      )}

      {data?.map((s) => (
        <Link key={s.id} to={`/results/${s.id}`}>
          <Card className="hover:bg-muted/50">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{s.session_name || 'Untitled session'}</p>
                <p className="text-sm text-muted-foreground">
                  {s.classes?.block_name} · {s.classes?.school_year} · {s.session_date}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{counts?.get(s.id) ?? 0} checked</span>
                <Badge variant={s.answer_key_confirmed ? 'default' : 'secondary'}>
                  {s.answer_key_confirmed ? 'Key confirmed ✓' : 'Draft'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  )
}
