import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<'teacher' | 'tech' | null>(null)

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
    <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">ExamCheck</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Are you a teacher or in IT / Computer Science / related field?
        </p>
      </div>

      {role === null && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setRole('teacher')}
            className="w-full rounded-md border px-4 py-3 text-sm font-medium hover:bg-muted/50"
          >
            I'm a Teacher
          </button>
          <button
            onClick={() => setRole('tech')}
            className="w-full rounded-md border px-4 py-3 text-sm font-medium hover:bg-muted/50"
          >
            I'm in IT / Computer Science / related field
          </button>
        </div>
      )}

      {role === 'teacher' && (
        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>
          <button onClick={() => setRole(null)} className="text-xs text-primary">
            ← Back
          </button>
        </div>
      )}

      {role === 'tech' && (
        <div className="space-y-4 rounded-md border border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-medium">Got it!</p>
          <p className="text-xs text-muted-foreground">
            Thanks for letting us know you're in IT / Computer Science. The custom Ollama API setup will be available in a future update.
          </p>
          <button onClick={() => setRole(null)} className="text-xs text-primary">
            ← Back
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  )
}
