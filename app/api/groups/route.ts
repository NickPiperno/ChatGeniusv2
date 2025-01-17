import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'

const dynamoDb = new DynamoDBService()

export const runtime = 'nodejs'

// GET /api/groups
export async function GET() {
  try {
    const { userId } = auth()
    if (!userId) {
      logger.warn('Unauthorized groups fetch attempt - no user ID')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    logger.info('Fetching groups for user', { userId })
    const groups = await dynamoDb.getGroupsByUserId(userId)
    
    logger.debug('Groups fetched:', groups.map(g => ({
      id: g.id,
      name: g.name,
      userId: g.userId,
      members: g.members
    })))

    return NextResponse.json({
      count: groups.length,
      groups
    })
  } catch (error) {
    logger.error('Error in GET /api/groups:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return new NextResponse(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// POST /api/groups
export async function POST(request: NextRequest) {
  try {
    logger.debug('Starting group creation')
    
    const { userId } = auth()
    if (!userId) {
      logger.warn('Unauthorized group creation attempt - no user ID')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    logger.debug('Authenticated user', { userId })

    const data = await request.json()
    const { name } = data

    if (!name?.trim()) {
      logger.warn('Invalid group name:', { name })
      return new NextResponse('Group name is required', { status: 400 })
    }

    logger.info('Creating group:', {
      name: name.trim(),
      userId,
      timestamp: new Date().toISOString()
    })

    const group = {
      id: crypto.randomUUID(),
      name: name.trim(),
      type: 'group',
      userId: userId,
      members: [userId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPrivate: false
    }

    logger.debug('Group data before save:', group)

    const savedGroup = await dynamoDb.createGroupChat(group)
    
    logger.info('Group created successfully:', {
      id: savedGroup.id,
      name: savedGroup.name,
      userId: savedGroup.userId,
      members: savedGroup.members
    })

    return NextResponse.json(savedGroup)
  } catch (error) {
    logger.error('Error in POST /api/groups:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return new NextResponse(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 