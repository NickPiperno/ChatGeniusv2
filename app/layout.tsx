import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import { SocketProvider } from '@/hooks/realtime'
import { ToastProvider } from '@/hooks/ui/use-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ChatGenius',
  description: 'Next-generation chat application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <UserProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              <SocketProvider>
                {children}
                <Toaster />
              </SocketProvider>
            </ToastProvider>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  )
}

