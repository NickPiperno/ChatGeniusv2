import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0/edge'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Public paths that don't require authentication
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/callback',
    '/api/auth/logout',
    '/api/auth/signup',
  ]
  
  // Check if the path is public
  const isPublicPath = publicPaths.some(path => 
    req.nextUrl.pathname === path || 
    req.nextUrl.pathname.startsWith('/_next/') ||
    req.nextUrl.pathname.startsWith('/api/auth/') ||
    req.nextUrl.pathname.includes('favicon.ico')
  )

  // Get the user session
  const session = await getSession(req, res)

  // If user is authenticated and trying to access the landing page, redirect to main app
  if (session && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/app', req.url))
  }

  // If it's a public path, allow access
  if (isPublicPath) {
    return res
  }

  // If no session and trying to access protected route, redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/api/auth/login', req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}