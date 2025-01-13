import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/lib/logger'

const dynamoDb = new DynamoDBService()

// GET /api/groups
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })

    logger.info('Fetching groups for user:', userId)
    const groups = await dynamoDb.getGroupsByUserId(userId)
    
    logger.debug('Groups fetched:', groups.map(g => ({
      id: g.id,
      name: g.name,
      creatorId: g.creatorId,
      members: g.members
    })))

    return NextResponse.json(groups)
  } catch (error) {
    logger.error('Error in GET /api/groups:', error)
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    )
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

    logger.debug('Authenticated user:', userId)

    const data = await request.json()
    const { name } = data

    if (!name?.trim()) {
      logger.warn('Invalid group name:', name)
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
      creatorId: userId,
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
      creatorId: savedGroup.creatorId,
      members: savedGroup.members
    })

    return NextResponse.json(savedGroup)
  } catch (error) {
    logger.error('Error in POST /api/groups:', error)
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    )
  }
} 