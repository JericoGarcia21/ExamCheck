import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallState {
  /** True when the app is already running as an installed PWA. */
  installed: boolean
  /** True when the browser has offered a native install prompt we can trigger. */
  canPrompt: boolean
  /** iOS/iPadOS Safari, which has no programmatic install prompt. */
  isIos: boolean
}

/**
 * Detects whether ExamCheck is installed, and exposes the browser's install
 * prompt when available.
 *
 * The `beforeinstallprompt` listener is attached at module load (before React
 * mounts) so the event is never missed, and all consumers share one store.
 */
function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  // iOS Safari exposes navigator.standalone instead of display-mode.
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return standalone || iosStandalone
}

function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOSDevice = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ reports as Mac; detect by touch points.
  const iPadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  // Only Safari can add to the home screen on iOS (not Chrome/Firefox in-app).
  return iOSDevice || iPadOs
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let state: InstallState = {
  installed: detectInstalled(),
  canPrompt: false,
  isIos: detectIos(),
}

const listeners = new Set<() => void>()
function emit(): void {
  for (const listener of listeners) listener()
}
function setState(patch: Partial<InstallState>): void {
  state = { ...state, ...patch }
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    setState({ canPrompt: true, installed: false })
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    setState({ installed: true, canPrompt: false })
  })
  const mql = window.matchMedia('(display-mode: standalone)')
  mql.addEventListener?.('change', () => setState({ installed: detectInstalled() }))
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function useInstallPrompt() {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )

  /** Triggers the native install prompt. Returns 'unavailable' if there is none. */
  async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt) return 'unavailable'
    const promptEvent = deferredPrompt
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    deferredPrompt = null
    setState({ canPrompt: false })
    return choice.outcome
  }

  return {
    installed: current.installed,
    canPrompt: current.canPrompt,
    isIos: current.isIos,
    install,
  }
}
