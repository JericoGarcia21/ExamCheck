import { useQuery } from '@tanstack/react-query'
import { listAllSessions } from '../services/resultsService'
import { supabase } from '../lib/supabase'
import { Card, CardContent } from '../components/ui/card'
import SessionListCard from '../components/SessionListCard'
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
            <Card key={i} size="sm">
              <CardContent className="flex flex-col gap-3">
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

      <div className="grid gap-3">
        {data?.map((s) => (
          <SessionListCard key={s.id} to={"/results/" + s.id} title={s.session_name}
            block={s.classes?.block_name} schoolYear={s.classes?.school_year}
            date={s.session_date} confirmed={s.answer_key_confirmed} checked={counts?.get(s.id) ?? 0} />
        ))}
      </div>
    </section>
  )
}
