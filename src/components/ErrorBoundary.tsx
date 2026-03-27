'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen bg-geo-bg flex items-center justify-center p-8">
          <div className="glass-panel p-8 max-w-md w-full text-center">
            <p className="text-4xl mb-4">⚠️</p>
            <h2 className="text-xl font-headline font-extrabold text-geo-on-surface uppercase mb-2">
              Something went wrong
            </h2>
            <p className="text-geo-on-surface-dim text-sm font-body mb-6">
              The game encountered an error. Try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-8 py-3"
            >
              Refresh
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
