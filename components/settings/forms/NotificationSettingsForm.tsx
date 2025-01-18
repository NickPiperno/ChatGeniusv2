'use client'

import { useSettings } from "@/lib/store/settings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ErrorBoundary } from "@/components/ui/feedback/ErrorBoundary"

export function NotificationSettingsForm() {
  const { notifications, setNotifications } = useSettings()

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications({ [key]: !notifications[key] })
  }

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Choose how you want to be notified about new messages and events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications on your desktop
                </p>
              </div>
              <Switch
                checked={notifications.desktop}
                onCheckedChange={() => handleNotificationChange('desktop')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sound Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Play a sound when you receive a message
                </p>
              </div>
              <Switch
                checked={notifications.sound}
                onCheckedChange={() => handleNotificationChange('sound')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mentions</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when someone mentions you
                </p>
              </div>
              <Switch
                checked={notifications.mentions}
                onCheckedChange={() => handleNotificationChange('mentions')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for important updates
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={() => handleNotificationChange('email')}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  )
} 