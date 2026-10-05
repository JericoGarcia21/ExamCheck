import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { BookOpen, Code } from 'lucide-react'

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
    <section className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">ExamCheck</h2>
          <p className="text-sm text-muted-foreground">
            Are you a teacher or in IT / Computer Science / related field?
          </p>
        </div>

        {role === null && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setRole('teacher')}
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 hover:bg-blue-100 transition-colors"
            >
              <BookOpen className="h-5 w-5" />
              I'm a Teacher
            </button>
            <button
              onClick={() => setRole('tech')}
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <Code className="h-5 w-5" />
              I'm in IT / Computer Science / related field
            </button>
          </div>
        )}

        {role === 'teacher' && (
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Redirecting…' : 'Continue with Google'}
            </button>
            <button onClick={() => setRole(null)} className="w-full text-xs text-primary hover:underline">
              ← Back
            </button>
          </div>
        )}

        {role === 'tech' && (
          <div className="space-y-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-medium">Got it!</p>
            <p className="text-xs text-muted-foreground">
              Thanks for letting us know you're in IT / Computer Science. The custom Ollama API setup will be available in a future update.
            </p>
            <button onClick={() => setRole(null)} className="w-full text-xs text-primary hover:underline">
              ← Back
            </button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </section>
  )
}
