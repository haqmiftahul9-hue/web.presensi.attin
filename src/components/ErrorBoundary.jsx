import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary] Terjadi kesalahan pada komponen <${this.props.name || 'Component'}>:`, error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.handleReset })
      }
      return (
        <div className="p-6 max-w-xl mx-auto my-8 bg-card rounded-2xl border border-destructive/20 shadow-lg text-foreground">
          <div className="flex items-center gap-3 text-destructive mb-3">
            <span className="material-symbols-outlined text-[24px]">error</span>
            <h2 className="text-base font-bold">Terjadi Kendala pada {this.props.name || 'Halaman'}</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Komponen ini mengalami kesalahan saat merender. Anda dapat mencoba memuat ulang komponen atau me-refresh halaman.
          </p>
          {this.state.error?.message && (
            <pre className="p-3 bg-muted/60 rounded-lg text-[11px] font-mono text-destructive mb-4 overflow-x-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex items-center gap-2.5">
            <button
              onClick={this.handleReset}
              className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              type="button"
            >
              Coba Muat Ulang
            </button>
            <button
              onClick={() => window.location.reload()}
              className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
              type="button"
            >
              Refresh Halaman
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
