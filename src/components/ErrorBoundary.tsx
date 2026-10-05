import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Catches render errors so a crash shows a recoverable message instead of a blank screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-6">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          The app hit an unexpected error. Your saved results are safe.
        </p>
        <p className="rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
          {this.state.error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Reload app
        </button>
      </div>
    )
  }
}
