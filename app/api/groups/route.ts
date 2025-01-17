import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamoDb = new DynamoDBService()

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized groups fetch attempt - no user ID')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = session.user.sub

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
    logger.error('[GROUPS_GET] Error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    logger.debug('Starting group creation')
    
    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized group creation attempt - no user ID')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = session.user.sub

    logger.debug('Authenticated user', { userId })

    const { name } = await req.json()
    if (!name?.trim()) {
      logger.warn('Invalid group name:', { name })
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Get all users to add to the group
    logger.info('Fetching all users for group creation')
    const allUsers = await dynamoDb.getAllUsers()
    const userIds = allUsers.map(user => user.id)

    logger.info('Creating group:', {
      name: name.trim(),
      userId,
      memberCount: userIds.length,
      timestamp: new Date().toISOString()
    })

    const group = {
      id: crypto.randomUUID(),
      name: name.trim(),
      type: 'group',
      userId: userId,
      members: userIds, // Add all users as members
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPrivate: false
    }

    logger.debug('Group data before save:', {
      ...group,
      memberCount: group.members.length
    })

    const savedGroup = await dynamoDb.createGroupChat(group)
    
    logger.info('Group created successfully:', {
      id: savedGroup.id,
      name: savedGroup.name,
      userId: savedGroup.userId,
      memberCount: savedGroup.members?.length || 0
    })

    return NextResponse.json(savedGroup)
  } catch (error) {
    logger.error('[GROUPS_POST] Error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized update attempt - no user ID')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get all users
    logger.info('Fetching all users')
    const allUsers = await dynamoDb.getAllUsers()
    const userIds = allUsers.map(user => user.id)

    // Get all groups
    logger.info('Fetching all groups')
    const allGroups = await dynamoDb.getAllGroups()

    // Update each group to include all users
    logger.info('Updating all groups with all users:', {
      userCount: userIds.length,
      groupCount: allGroups.length
    })

    const updates = await Promise.all(
      allGroups.map(async group => {
        const updatedGroup = await dynamoDb.updateGroup(group.id, {
          members: userIds,
          updatedAt: new Date().toISOString()
        })
        return updatedGroup
      })
    )

    logger.info('Successfully updated all groups with all users:', {
      updatedGroups: updates.length
    })

    return NextResponse.json({
      message: 'All groups updated successfully',
      updatedGroups: updates.length
    })
  } catch (error) {
    logger.error('[GROUPS_PATCH] Error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 