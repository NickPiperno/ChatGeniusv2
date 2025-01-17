'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileSettingsForm } from "@/components/settings/forms/ProfileSettingsForm"
import { NotificationSettingsForm } from "@/components/settings/forms/NotificationSettingsForm"
import { AppearanceSettingsForm } from "@/components/settings/forms/AppearanceSettingsForm"
import { IntegrationCard } from "@/components/settings/integrations/IntegrationCard"
import { ErrorBoundary } from "@/components/ui/feedback/ErrorBoundary"

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences.
          </p>
        </div>
        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="w-full justify-start border-b pb-px">
            <TabsTrigger value="profile" className="px-6">Profile</TabsTrigger>
            <TabsTrigger value="notifications" className="px-6">Notifications</TabsTrigger>
            <TabsTrigger value="appearance" className="px-6">Appearance</TabsTrigger>
            <TabsTrigger value="integrations" className="px-6">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-8">
            <ProfileSettingsForm />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-8">
            <NotificationSettingsForm />
          </TabsContent>

          <TabsContent value="appearance" className="space-y-8">
            <AppearanceSettingsForm />
          </TabsContent>

          <TabsContent value="integrations" className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <IntegrationCard
                title="Google Calendar"
                description="Connect your Google Calendar to manage events and meetings."
                icon="calendar"
                isConnected={false}
                onConnect={async () => {
                  // TODO: Implement Google Calendar connection
                }}
                onDisconnect={async () => {
                  // TODO: Implement Google Calendar disconnection
                }}
              />
              <IntegrationCard
                title="GitHub"
                description="Connect your GitHub account to access repositories and issues."
                icon="github"
                isConnected={false}
                onConnect={async () => {
                  // TODO: Implement GitHub connection
                }}
                onDisconnect={async () => {
                  // TODO: Implement GitHub disconnection
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  )
} 