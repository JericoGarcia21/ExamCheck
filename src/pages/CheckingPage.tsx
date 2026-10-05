import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'

export default function CheckingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['allSessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checking_sessions')
        .select('*, classes(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Checking sessions</h2>
      <p className="text-sm text-muted-foreground">
        All checking sessions across your classes. Tap one to continue grading.
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
                <Skeleton className="h-5 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {data?.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No checking sessions yet. Open a class and create one.
          </CardContent>
        </Card>
      )}

      {data?.map((s) => (
        <Link key={s.id} to={`/sessions/${s.id}`}>
          <Card className="hover:bg-muted/50">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{s.session_name || 'Untitled session'}</p>
                <p className="text-sm text-muted-foreground">
                  {s.classes?.block_name} · {s.session_date}
                </p>
              </div>
              <span>
                <Badge variant={s.answer_key_confirmed ? 'default' : 'secondary'}>
                  {s.answer_key_confirmed ? 'Key confirmed ✓' : 'Draft'}
                </Badge>
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  )
}
