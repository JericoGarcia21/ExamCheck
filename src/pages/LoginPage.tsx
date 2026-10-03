import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const schema = z.object({
  full_name: z.string().optional(),
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setError(null)
    setMessage(null)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      if (error) return setError(error.message)
      navigate('/', { replace: true })
    } else {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { full_name: values.full_name ?? '' } },
      })
      if (error) return setError(error.message)
      setMessage('Account created. If email confirmation is enabled, check your inbox.')
    }
  }

  return (
    <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h2 className="text-2xl font-semibold">ExamCheck</h2>
      <p className="mt-1 text-sm text-gray-600">
        {mode === 'signin' ? 'Sign in to your teacher account' : 'Create a teacher account'}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="mb-1 block text-sm font-medium">Full name</label>
            <input
              {...register('full_name')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            {...register('email')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            {...register('password')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="mt-4 text-center text-sm text-blue-600"
      >
        {mode === 'signin' ? 'No account? Sign up' : 'Have an account? Sign in'}
      </button>
    </section>
  )
}
