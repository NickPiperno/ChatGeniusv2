'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Icons } from "@/components/ui/icons"
import { ErrorBoundary } from "@/components/ui/feedback/ErrorBoundary"
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner"

interface IntegrationCardProps {
  title: string
  description: string
  icon: keyof typeof Icons
  isConnected: boolean
  onConnect: () => Promise<void>
  onDisconnect: () => Promise<void>
}

export function IntegrationCard({
  title,
  description,
  icon,
  isConnected,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const Icon = Icons[icon]

  const handleToggle = async () => {
    setIsLoading(true)
    try {
      if (isConnected) {
        await onDisconnect()
      } else {
        await onConnect()
      }
    } catch (error) {
      console.error(`Error ${isConnected ? 'disconnecting from' : 'connecting to'} ${title}:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Not connected'}
            </p>
            <Switch
              checked={isConnected}
              onCheckedChange={handleToggle}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          {isLoading && (
            <div className="flex items-center space-x-2">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Disconnecting...' : 'Connecting...'}
              </span>
            </div>
          )}
        </CardFooter>
      </Card>
    </ErrorBoundary>
  )
} 