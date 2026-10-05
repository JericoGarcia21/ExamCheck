import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Skeleton } from './ui/skeleton'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
