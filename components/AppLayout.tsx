'use client'

import { Sidebar } from '@/components/Sidebar'
import { SearchBar } from '@/components/SearchBar'
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
} from '@clerk/nextjs'
import { useSettings } from '@/lib/store/settings'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/ui/feedback/ErrorBoundary'

export function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme, fontSize } = useSettings()
  const pathname = usePathname()
  const router = useRouter()
  const isPublicRoute = pathname === '/'

  // Apply theme and font size
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

  return (
    <ErrorBoundary>
      <SignedIn>
        <div className="h-screen flex flex-col overflow-hidden">
          <div className="flex-1 flex min-h-0">
            <Sidebar />
            <main className="flex-1 overflow-hidden">
              {isPublicRoute ? (
                // Welcome screen for authenticated users on landing page
                <div className="h-full flex items-center justify-center text-center p-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
                    <p className="text-gray-600 dark:text-gray-300">
                      Select a channel from the sidebar to start chatting.
                    </p>
                  </div>
                </div>
              ) : (
                // Regular content for other routes
                children
              )}
            </main>
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        {isPublicRoute ? (
          // Show landing page for non-authenticated users on root route
          children
        ) : (
          // Redirect to sign-in for non-authenticated users on protected routes
          <RedirectToSignIn />
        )}
      </SignedOut>
    </ErrorBoundary>
  )
} 