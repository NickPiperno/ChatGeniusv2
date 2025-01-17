import { AppLayout } from '@/components/AppLayout'

export default function AppPage() {
  return (
    <AppLayout>
      <div className="h-full flex items-center justify-center text-center p-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Welcome to ChatGenius!</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Select a conversation from the sidebar to start chatting.
          </p>
        </div>
      </div>
    </AppLayout>
  )
} 