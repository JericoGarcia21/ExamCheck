import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Card, CardContent } from '../components/ui/card'
import SessionListCard from '../components/SessionListCard'
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
            <Card key={i} size="sm">
              <CardContent className="flex flex-col gap-3">
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

      <div className="grid gap-3">
        {data?.map((s) => (
          <SessionListCard key={s.id} to={"/sessions/" + s.id} title={s.session_name}
            block={s.classes?.block_name} schoolYear={s.classes?.school_year}
            date={s.session_date} confirmed={s.answer_key_confirmed} />
        ))}
      </div>
    </section>
  )
}
