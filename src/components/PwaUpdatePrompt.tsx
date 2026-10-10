import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui/button'

export default function PwaUpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return <div role="status" className="fixed inset-x-4 top-20 z-40 mx-auto max-w-md space-y-2 rounded-xl border bg-card p-4 shadow-lg">
    <p>A new version is ready. Save your grading work before updating.</p>
    <div className="flex gap-2">
      <Button onClick={() => void updateServiceWorker(true)}>Update and reload</Button>
      <Button variant="outline" onClick={() => setNeedRefresh(false)}>Later</Button>
    </div>
  </div>
}
