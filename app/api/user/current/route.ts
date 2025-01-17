import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Return user data directly from Auth0 session
    return NextResponse.json({
      id: session.user.sub,
      auth0Id: session.user.sub,
      email: session.user.email,
      displayName: session.user.nickname || session.user.name || session.user.email?.split('@')[0] || 'User',
      imageUrl: session.user.picture,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActiveAt: Date.now()
    })

  } catch (error) {
    logger.error('[CURRENT_USER_GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 