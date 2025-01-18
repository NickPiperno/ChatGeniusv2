'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global Error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-4 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-gray-500">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
        </div>
      </body>
    </html>
  )
} 