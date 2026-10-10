import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, ArrowRight, BookOpen, Check, ClipboardCheck, Code, LoaderCircle, ScanLine, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<'teacher' | 'tech' | null>(null)

  function resetRole() {
    setRole(null)
    setError(null)
  }

  async function handleGoogleLogin() {
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
      }
    } catch {
      setError('Unable to sign in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-intro" aria-labelledby="login-welcome">
          <div className="login-brand">
            <span className="login-brand-icon"><ClipboardCheck size={23} aria-hidden="true" /></span>
            <span>Exam<span className="text-blue-600">Check</span></span>
          </div>
          <div className="login-pitch">
            <span className="login-eyebrow">A LITTLE LESS GRADING. A LOT MORE TEACHING.</span>
            <h1 id="login-welcome">Your papers.<br />A clearer picture.</h1>
            <p>Turn exam papers into results you can review, organize, and put to work.</p>
            <div className="login-preview" aria-hidden="true">
              <div className="login-preview-heading"><span className="login-preview-icon"><ScanLine size={20} /></span><div><strong>From paper to progress</strong><span>Your checking workflow, simplified</span></div></div>
              <div className="login-workflow">
                <span><span className="login-step">1</span>Capture</span><span className="login-step-line" />
                <span><span className="login-step">2</span>Review</span><span className="login-step-line" />
                <span><span className="login-step login-step-done"><Check size={14} /></span>Results</span>
              </div>
            </div>
            <div className="login-benefits"><span><Check size={15} aria-hidden="true" /> Keep classes organized</span><span><Check size={15} aria-hidden="true" /> Review before saving</span></div>
          </div>
          <p className="login-intro-footer">Made for the work that happens after the exam.</p>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-form">
            <span className="login-eyebrow">LET’S GET STARTED</span>
            <h2 id="login-title">{role === 'teacher' ? 'Welcome, teacher.' : role === 'tech' ? 'For the curious minds.' : 'Welcome to ExamCheck.'}</h2>
            <p className="login-description">{role === 'teacher' ? 'Sign in to start checking papers and keep your classes in one place.' : role === 'tech' ? 'Here’s what’s coming for IT and computer science users.' : 'Choose the option that best describes you to get started.'}</p>

            {role === null && (
              <div className="login-roles">
                <button type="button" onClick={() => setRole('teacher')} className="login-role login-role-teacher">
                  <span className="login-role-icon"><BookOpen size={22} aria-hidden="true" /></span>
                  <span className="login-role-copy"><strong>I’m a teacher</strong><span>Check papers and manage results</span></span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setRole('tech')} className="login-role">
                  <span className="login-role-icon"><Code size={22} aria-hidden="true" /></span>
                  <span className="login-role-copy"><strong>I’m in IT or computer science</strong><span>Explore custom integrations</span></span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            )}

            {role === 'teacher' && (
              <div className="login-actions">
                <div className="login-selected"><BookOpen size={18} aria-hidden="true" /><span>Teacher workspace</span><Check size={16} aria-hidden="true" /></div>
                <button type="button" onClick={handleGoogleLogin} disabled={loading} className="login-google" aria-busy={loading}>
                  {loading ? <LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.08v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.42 13.92a6 6 0 0 1 0-3.84V7.49H3.08a10 10 0 0 0 0 9.02l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.92 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>}
                  {loading ? 'Redirecting to Google…' : 'Continue with Google'}
                </button>
                <p className="login-signin-note">Use your Google account to sign in securely.</p>
                <button type="button" onClick={resetRole} disabled={loading} className="login-back"><ArrowLeft size={15} aria-hidden="true" /> Change my role</button>
              </div>
            )}

            {role === 'tech' && (
              <div className="login-actions">
                <div className="login-coming-soon"><span className="login-coming-badge">COMING SOON</span><h3>Make it your own.</h3><p>Custom Ollama API setup is planned for a future update. Check back for more ways to connect your own tools.</p></div>
                <button type="button" onClick={resetRole} className="login-back"><ArrowLeft size={15} aria-hidden="true" /> Back to role selection</button>
              </div>
            )}

            {error && <p role="alert" className="login-error">{error}</p>}
            <div className="login-security"><ShieldCheck size={16} aria-hidden="true" /><span>{role === 'tech' ? 'Built with teachers in mind.' : 'Google sign-in. No extra password to remember.'}</span></div>
          </div>
          <p className="login-panel-footer">Less paperwork. More possibility.</p>
        </section>
      </div>
    </main>
  )
}
