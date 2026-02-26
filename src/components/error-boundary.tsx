"use client"

import React, { Component, ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-xl font-semibold text-destructive">
              エラーが発生しました
            </h2>
            <p className="text-muted-foreground">
              予期しないエラーが発生しました。もう一度お試しください。
            </p>
            {this.state.error && (
              <details className="text-left text-sm text-muted-foreground">
                <summary className="cursor-pointer">エラー詳細</summary>
                <pre className="mt-2 p-4 bg-muted rounded overflow-auto max-h-48">
                  {this.state.error.toString()}
                </pre>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs">スタックトレース</summary>
                    <pre className="mt-2 p-2 bg-muted-foreground/10 rounded overflow-auto max-h-32 text-xs">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </details>
            )}
            <Button onClick={this.handleReset}>再読み込み</Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional Wrapper (HOC pattern)
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Error handler hook
export function useErrorHandler() {
  return React.useCallback((error: Error) => {
    throw error
  }, [])
}
