'use client'

import { useTheme } from "next-themes"
import { useSettings } from "@/lib/store/settings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ErrorBoundary } from "@/components/ui/feedback/ErrorBoundary"

export function AppearanceSettingsForm() {
  const { setTheme, theme } = useTheme()
  const { appearance, setAppearance } = useSettings()
  const handleFontSizeChange = (value: "sm" | "base" | "lg") => {
    setAppearance({ fontSize: value })
  }

  const handleCompactModeChange = () => {
    setAppearance({ compactMode: !appearance.compactMode })
  }

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle>Appearance Settings</CardTitle>
          <CardDescription>
            Customize how ChatGenius looks and feels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Font Size</Label>
              <Select value={appearance.fontSize} onValueChange={handleFontSizeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select font size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="base">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compact Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Reduce spacing between items
                </p>
              </div>
              <Switch
                checked={appearance.compactMode}
                onCheckedChange={handleCompactModeChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  )
} 