import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Badge } from '../components/ui/badge'

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
          Are you a teacher or a tech/user?
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
            I'm a Tech User
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
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Ollama API</p>
            <Badge variant="secondary">Under development</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Tech users can connect their own Ollama API key here later. This feature is still being built and is not available yet.
          </p>
          <button
            disabled
            className="w-full cursor-not-allowed rounded-md border px-4 py-3 text-sm font-medium opacity-50"
          >
            Connect Ollama (coming soon)
          </button>
          <button onClick={() => setRole(null)} className="text-xs text-primary">
            ← Back
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  )
}
