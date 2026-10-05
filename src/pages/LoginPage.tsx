import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent } from '../components/ui/card'
import { ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGoogleLogin() {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          <span className="text-primary">Exam</span>Check
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome! Check handwritten exam papers faster with AI-assisted grading.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-center text-sm text-muted-foreground">Sign in with your Google account to continue.</p>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5z" />
            </svg>
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {error && <p className="text-center text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Your class data stays private to your account.
      </p>
    </section>
  )
}
