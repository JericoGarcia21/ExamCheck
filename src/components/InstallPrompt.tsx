import { useState } from 'react'
import { Download, X, Share, MoreVertical } from 'lucide-react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

const DISMISS_KEY = 'examcheck:install-dismissed'

/**
 * Prominent, dismissible install banner.
 *
 * Shows when the app is NOT already installed. On Android/desktop we trigger the
 * native prompt; on iOS (which has no API) we show "Add to Home Screen" steps.
 * Hidden forever after the teacher dismisses it or once installed.
 */
export default function InstallPrompt() {
  const { installed, canPrompt, isIos, install } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [showIosHelp, setShowIosHelp] = useState(false)

  if (installed || dismissed) return null
  // Nothing useful to show if we can't prompt and it's not iOS.
  if (!canPrompt && !isIos) return null

  function close() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 lg:max-w-5xl">
        <span className="flex items-center gap-2">
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Install ExamCheck</strong> on your device for faster access and offline shell.
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {canPrompt && (
            <button
              onClick={() => install()}
              className="rounded bg-primary px-2.5 py-1 font-medium text-primary-foreground"
            >
              Install
            </button>
          )}
          {!canPrompt && isIos && (
            <button
              onClick={() => setShowIosHelp((v) => !v)}
              className="rounded bg-primary px-2.5 py-1 font-medium text-primary-foreground"
            >
              How?
            </button>
          )}
          <button onClick={close} aria-label="Dismiss install prompt" className="text-primary/70 hover:text-primary">
            <X className="h-4 w-4" />
          </button>
        </span>
      </div>

      {showIosHelp && isIos && (
        <div className="mx-auto mt-2 w-full max-w-md rounded-md border border-primary/20 bg-card p-3 text-foreground lg:max-w-5xl">
          <p className="flex items-center gap-2 text-sm font-medium">
            Install on iPhone / iPad
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li className="flex items-center gap-1">
              Tap the <Share className="inline h-3.5 w-3.5" /> <strong>Share</strong> button in Safari.
            </li>
            <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong>. ExamCheck will appear on your home screen.</li>
          </ol>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            On Android, open the browser menu <MoreVertical className="inline h-3.5 w-3.5" /> and choose
            <strong> Install app</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
