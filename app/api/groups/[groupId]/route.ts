import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamoDb = new DynamoDBService()

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized group fetch attempt - no user ID')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = session.user.sub

    const group = await dynamoDb.getGroupById(params.groupId)
    if (!group) {
      logger.warn('Group not found:', { groupId: params.groupId })
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // All users should have access to all groups
    logger.info('Group fetched successfully:', {
      id: group.id,
      name: group.name,
      userId: group.userId,
      members: group.members
    })

    return NextResponse.json(group)
  } catch (error) {
    logger.error('[GROUP_GET] Error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    logger.info('Update group request:', { groupId: params.groupId })
    
    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized update attempt - no user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.sub

    const data = await req.json()
    const { name } = data

    if (!name?.trim()) {
      logger.warn('Invalid group name:', { name })
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    logger.debug('Checking group existence and authorization', {
      groupId: params.groupId,
      userId
    })

    const group = await dynamoDb.getGroupById(params.groupId)
    if (!group) {
      logger.warn('Group not found:', { groupId: params.groupId })
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    logger.debug('Authorization check:', {
      userId,
      groupCreatorId: group.userId,
      isCreator: group.userId === userId
    })

    if (group.userId !== userId) {
      logger.warn('Unauthorized update attempt by non-creator:', {
        userId,
        creatorId: group.userId
      })
      return NextResponse.json({ 
        error: 'Unauthorized - only creator can update group' 
      }, { status: 403 })
    }

    logger.info('Updating group:', {
      groupId: params.groupId,
      newName: name.trim()
    })

    // Get all users to ensure everyone is a member
    logger.info('Fetching all users for group update')
    const allUsers = await dynamoDb.getAllUsers()
    const userIds = allUsers.map(user => user.id)

    const updatedGroup = await dynamoDb.updateGroup(params.groupId, {
      name: name.trim(),
      members: userIds, // Ensure all users are members
      updatedAt: new Date().toISOString()
    })

    logger.info('Group updated successfully:', {
      groupId: params.groupId,
      name: updatedGroup.name,
      memberCount: updatedGroup.members?.length || 0
    })

    return NextResponse.json(updatedGroup)
  } catch (error) {
    logger.error('Error in PATCH /api/groups/[groupId]:', {
      groupId: params.groupId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    logger.info('Delete group request:', { groupId: params.groupId })
    
    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized delete attempt - no user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.sub

    logger.debug('Checking group existence and authorization', {
      groupId: params.groupId,
      userId
    })

    const group = await dynamoDb.getGroupById(params.groupId)
    if (!group) {
      logger.warn('Group not found:', { groupId: params.groupId })
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    logger.info('[Group API] Group found:', {
      groupId: params.groupId,
      userId: group.userId,
      isCreator: group.userId === userId
    })

    // Only allow the creator to delete the group
    if (group.userId !== userId) {
      logger.warn('Unauthorized delete attempt by non-creator:', {
        userId,
        creatorId: group.userId
      })
      return NextResponse.json({ 
        error: 'Unauthorized - Only the group creator can delete this group'
      }, { status: 403 })
    }

    // Delete the group
    await dynamoDb.deleteGroup(params.groupId)

    logger.info('[Group API] Group deleted:', {
      groupId: params.groupId,
      userId: group.userId,
      currentUserId: userId
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    logger.error('Error in DELETE /api/groups/[groupId]:', {
      groupId: params.groupId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 