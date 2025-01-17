import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { UserStatus } from '@/types/models/user'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { status } = await req.json() as { status: UserStatus }
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['online', 'away', 'busy', 'offline']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // For now, we'll just return success since we don't have DynamoDB set up
    // Later we can store this in the database
    return NextResponse.json({ 
      success: true,
      userId: session.user.sub,
      status 
    })

  } catch (error) {
    logger.error('[USER_STATUS_POST] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 