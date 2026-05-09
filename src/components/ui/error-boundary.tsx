'use client';

/**
 * React Error Boundary — catches render-time errors so the whole page
 * doesn't blank out. Shows a friendly fallback with a retry button.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 *
 *   // Custom fallback:
 *   <ErrorBoundary fallback={<p>Oops!</p>}>
 *     <YourComponent />
 *   </ErrorBoundary>
 */

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Override the default error UI */
  fallback?: ReactNode;
  /** Called when an error is caught — useful for external error tracking */
  onError?: (error: Error, info: { componentStack: string }) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console (server-side logger not available here — client boundary)
    console.error('[ErrorBoundary] Caught:', error.message);
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <DefaultFallback
          error={this.state.error}
          reset={this.reset}
        />
      );
    }
    return this.props.children;
  }
}

/* ── Default fallback UI ────────────────────────────────── */
function DefaultFallback({
  error,
  reset,
}: {
  error: Error | null;
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] px-6 text-center gap-4">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ backgroundColor: '#EEF0FB' }}
      >
        <AlertTriangle className="w-7 h-7" style={{ color: '#4762D5' }} />
      </div>

      <div className="space-y-1 max-w-sm">
        <h2 className="text-base font-semibold" style={{ color: '#333333' }}>
          Something went wrong
        </h2>
        <p className="text-sm" style={{ color: '#999999' }}>
          {isDev && error
            ? error.message
            : 'An unexpected error occurred. Your data is safe — please try again.'}
        </p>
      </div>

      <button
        onClick={reset}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors"
        style={{
          borderColor: '#EBEBEB',
          color: '#666666',
          backgroundColor: '#FAFAFA',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EEF2F7';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FAFAFA';
        }}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Try again
      </button>
    </div>
  );
}

/* ── Convenience page-level wrapper ─────────────────────── */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div
          className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-6"
          style={{ backgroundColor: '#FAFAFA' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#EEF0FB' }}
          >
            <AlertTriangle className="w-8 h-8" style={{ color: '#4762D5' }} />
          </div>
          <div className="space-y-1 max-w-md">
            <h1 className="text-lg font-semibold" style={{ color: '#333333' }}>
              Page failed to load
            </h1>
            <p className="text-sm" style={{ color: '#999999' }}>
              Something unexpected happened. Your data is safe.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-lg text-white"
            style={{ backgroundColor: '#4762D5' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
