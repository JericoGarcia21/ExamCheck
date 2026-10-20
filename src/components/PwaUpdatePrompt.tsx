import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'

export default function PwaUpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timeout.current), [])
  async function update() {
    if (pending.current) return
    pending.current = true
    setUpdating(true)
    setError('')
    timeout.current = setTimeout(() => {
      pending.current = false
      setUpdating(false)
      setError('The update did not finish. Check your connection and try again. Save your work before closing and reopening the app.')
    }, 20_000)
    try {
      // This resolves after requesting activation, not after the page reloads.
      await updateServiceWorker(true)
    } catch {
      clearTimeout(timeout.current)
      pending.current = false
      setUpdating(false)
      setError('Could not apply the update. Check your connection and try again.')
    }
  }
  if (!needRefresh) return null
  return <div role="status" aria-busy={updating} className="fixed inset-x-4 top-20 z-40 mx-auto max-w-md space-y-2 rounded-xl border bg-card p-4 shadow-lg">
    <p>A new version is ready. Save your grading work before updating.</p>
    <div className="flex gap-2">
      <Button disabled={updating} onClick={() => void update()}>{updating ? 'Applying update…' : error ? 'Retry update' : 'Update and reload'}</Button>
      <Button disabled={updating} variant="outline" onClick={() => { setError(''); setNeedRefresh(false) }}>Later</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>
}
