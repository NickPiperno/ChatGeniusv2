'use client'

import '@/styles/globals.css'
import '@/styles/mentions.css'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { ToastProvider } from '@/hooks/ui/use-toast'
import { ClerkProvider } from '@clerk/nextjs'
import { AppLayout } from '@/components/AppLayout'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { SocketProvider } from '@/hooks/realtime'
import { useCurrentUser } from '@/hooks/data/use-current-user'

const inter = Inter({ subsets: ['latin'] })

// Separate client component for user data loading
function ClientProviders({ children }: { children: React.ReactNode }) {
  useCurrentUser()
  
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ToastProvider>
          <SocketProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </SocketProvider>
          <Toaster />
        </ToastProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <ClerkProvider>
          <ClientProviders>
            {children}
          </ClientProviders>
        </ClerkProvider>
      </body>
    </html>
  )
}

