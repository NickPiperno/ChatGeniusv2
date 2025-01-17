'use client'

import { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  className?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className={cn(
          "flex flex-col items-center justify-center min-h-[200px] p-4 space-y-4 text-center",
          this.props.className
        )}>
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Something went wrong</h3>
            <p className="text-sm text-gray-500">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={this.handleRetry}
          >
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
} 