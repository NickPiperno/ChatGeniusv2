'use client'

import { Sidebar } from '@/components/Sidebar'
import { SearchBar } from '@/components/SearchBar'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useSettings } from '@/lib/store/settings'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/ui/feedback/ErrorBoundary'
import { fetchApi } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading, error } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const { theme, fontSize } = useSettings()

  // Apply theme and font size settings
  useEffect(() => {
    const root = window.document.documentElement
    root.style.fontSize = `${fontSize}px`

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.toggle('dark', systemTheme === 'dark')
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
  }, [theme, fontSize])

  // Handle authentication and redirect
  useEffect(() => {
    if (!isLoading && !user && !pathname.startsWith('/api/auth')) {
      router.push('/sign-in')
    }
  }, [user, isLoading, router, pathname])

  // Initialize user data when authenticated
  useEffect(() => {
    const initializeUser = async () => {
      if (user?.sub) {
        try {
          logger.info('[AppLayout] Fetching user data')
          const response = await fetchApi('/api/user/current')
          if (!response.ok) {
            throw new Error('Failed to fetch user data')
          }
          const data = await response.json()
          logger.info('[AppLayout] User data fetched successfully', { 
            userId: data.id,
            hasDisplayName: !!data.displayName 
          })
        } catch (error) {
          logger.error('[AppLayout] Error fetching user data:', error)
        }
      }
    }

    initializeUser()
  }, [user?.sub])

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-500">Authentication Error</h1>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => router.push('/sign-in')}
            className="text-blue-500 hover:underline"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Handle unauthenticated state
  if (!user) {
    return null
  }

  const isPublicRoute = pathname === '/'

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <SearchBar />
          <main className="flex-1 overflow-y-auto">
            {isPublicRoute ? (
              <div className="h-full flex items-center justify-center text-center p-4">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Select a channel from the sidebar to start chatting.
                  </p>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
} 