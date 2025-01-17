import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'

const dynamoDb = new DynamoDBService()

export const runtime = 'nodejs'

// DELETE /api/groups/[groupId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    logger.info('Delete group request:', { groupId: params.groupId })
    
    const { userId } = auth()
    if (!userId) {
      logger.warn('Unauthorized delete attempt - no user ID')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    logger.debug('Checking group existence and authorization', {
      groupId: params.groupId,
      userId
    })

    const group = await dynamoDb.getGroupById(params.groupId)
    if (!group) {
      logger.warn('Group not found:', { groupId: params.groupId })
      return new NextResponse('Group not found', { status: 404 })
    }

    logger.info('[Group API] Group found:', {
      groupId: params.groupId,
      userId: group.userId,
      isCreator: group.userId === userId
    })

    // Only allow the creator to delete the group
    if (group.userId !== userId) {
      return new Response('Unauthorized - Only the group creator can delete this group', {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
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

// PATCH /api/groups/[groupId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    logger.info('Update group request:', { groupId: params.groupId })
    
    const { userId } = auth()
    if (!userId) {
      logger.warn('Unauthorized update attempt - no user ID')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const data = await request.json()
    const { name } = data

    if (!name?.trim()) {
      logger.warn('Invalid group name:', { name })
      return new NextResponse('Group name is required', { status: 400 })
    }

    logger.debug('Checking group existence and authorization', {
      groupId: params.groupId,
      userId
    })

    const group = await dynamoDb.getGroupById(params.groupId)
    if (!group) {
      logger.warn('Group not found:', { groupId: params.groupId })
      return new NextResponse('Group not found', { status: 404 })
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
      return new NextResponse('Unauthorized - only creator can update group', { status: 403 })
    }

    logger.info('Updating group:', {
      groupId: params.groupId,
      newName: name.trim()
    })

    const updatedGroup = await dynamoDb.updateGroup(params.groupId, {
      name: name.trim(),
      updatedAt: new Date().toISOString()
    })

    logger.info('Group updated successfully:', {
      groupId: params.groupId,
      name: updatedGroup.name
    })

    return NextResponse.json(updatedGroup)
  } catch (error) {
    logger.error('Error in PATCH /api/groups/[groupId]:', {
      groupId: params.groupId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
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