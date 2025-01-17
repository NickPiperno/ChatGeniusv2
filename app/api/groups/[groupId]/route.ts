import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { DynamoDBService } from '@/lib/services/dynamodb'

let dynamoDb: DynamoDBService;

// Initialize DynamoDB service
async function getDynamoDBInstance() {
  if (!dynamoDb) {
    logger.info('[Groups API] Creating new DynamoDB instance...')
    dynamoDb = await DynamoDBService.getInstance()
    logger.info('[Groups API] DynamoDB instance ready')
  }
  return dynamoDb
}

// Initialize the service
getDynamoDBInstance().catch(error => {
  logger.error('[Groups API] Failed to initialize DynamoDB:', error)
})

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

    // Get the group
    const group = await (await getDynamoDBInstance()).getGroupById(params.groupId)
    if (!group) {
      logger.warn('Group not found:', { groupId: params.groupId })
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    return NextResponse.json(group)
  } catch (error) {
    logger.error('Error in GET /api/groups/[groupId]:', {
      groupId: params.groupId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized group update attempt - no user ID')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = session.user.sub

    // Get the group first to check permissions
    const group = await (await getDynamoDBInstance()).getGroupById(params.groupId)
    if (!group) {
      logger.warn('Group not found for update:', { groupId: params.groupId })
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Only the creator can update the group
    if (group.userId !== userId) {
      logger.warn('Unauthorized group update attempt - not creator:', {
        groupId: params.groupId,
        userId,
        creatorId: group.userId
      })
      return NextResponse.json({ 
        error: 'Unauthorized - Only the group creator can update this group'
      }, { status: 403 })
    }

    const { name } = await req.json()
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      logger.warn('Invalid group update data:', { name })
      return NextResponse.json({ error: 'Invalid group name' }, { status: 400 })
    }

    // Get all users to ensure everyone is a member
    logger.info('Fetching all users for group update')
    const allUsers = await (await getDynamoDBInstance()).getAllUsers()
    const userIds = allUsers.map(user => user.id.S)

    const updatedGroup = await (await getDynamoDBInstance()).updateGroup(params.groupId, {
      name: name.trim(),
      members: userIds,
      updatedAt: new Date().toISOString()
    })

    logger.info('Group updated successfully:', {
      groupId: params.groupId,
      name: updatedGroup.name,
      memberCount: updatedGroup.members?.SS?.length || 0
    })

    return NextResponse.json(updatedGroup)
  } catch (error) {
    logger.error('Error in PATCH /api/groups/[groupId]:', {
      groupId: params.groupId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized group deletion attempt - no user ID')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = session.user.sub

    // Get the group first to check permissions
    const group = await (await getDynamoDBInstance()).getGroupById(params.groupId)
    if (!group) {
      logger.warn('Group not found for deletion:', { groupId: params.groupId })
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Only the creator can delete the group
    if (group.userId !== userId) {
      logger.warn('Unauthorized group deletion attempt - not creator:', {
        groupId: params.groupId,
        userId,
        creatorId: group.userId
      })
      return NextResponse.json({ 
        error: 'Unauthorized - Only the group creator can delete this group'
      }, { status: 403 })
    }

    // Delete the group
    await (await getDynamoDBInstance()).deleteGroup(params.groupId)

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
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    )
  }
} 