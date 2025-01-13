import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'
import io from '@/server/socket'

const dynamoDb = new DynamoDBService()

export async function DELETE(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    console.log('[API] Delete group request:', params.groupId)
    
    const { userId } = auth()
    if (!userId) {
      console.log('[API] Unauthorized delete attempt - no user ID')
      return new Response('Unauthorized', { status: 401 })
    }

    console.log('[API] Checking group existence and authorization:', {
      groupId: params.groupId,
      userId,
      requestHeaders: Object.fromEntries(request.headers)
    })

    try {
      const group = await dynamoDb.getGroupById(params.groupId)
      if (!group) {
        console.log('[API] Group not found:', params.groupId)
        return new Response('Group not found', { status: 404 })
      }

      console.log('[API] Authorization check:', {
        userId,
        groupCreatorId: group.creatorId,
        isCreator: group.creatorId === userId,
        group: JSON.stringify(group, null, 2)
      })

      if (group.creatorId !== userId) {
        console.log('[API] Unauthorized delete attempt by non-creator:', userId, 'actual creator:', group.creatorId)
        return new Response('Unauthorized - only creator can delete group', { status: 403 })
      }

      console.log('[API] Deleting group:', params.groupId)
      try {
        await dynamoDb.deleteGroup(params.groupId)
        console.log('[API] Group deleted successfully:', params.groupId)
        return new Response(null, { status: 204 })
      } catch (deleteError) {
        console.error('[API] Error in deleteGroup operation:', {
          error: deleteError,
          message: deleteError instanceof Error ? deleteError.message : 'Unknown error',
          stack: deleteError instanceof Error ? deleteError.stack : undefined,
          type: deleteError instanceof Error ? deleteError.constructor.name : typeof deleteError
        })
        // Return error details in development
        if (process.env.NODE_ENV === 'development') {
          return new Response(JSON.stringify({
            error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
            stack: deleteError instanceof Error ? deleteError.stack : undefined,
            type: deleteError instanceof Error ? deleteError.constructor.name : typeof deleteError
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        return new Response('Failed to delete group', { status: 500 })
      }
    } catch (error) {
      console.error('[API] Database operation error:', {
        operation: 'getGroupById/deleteGroup',
        groupId: params.groupId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error
      })
      // Return error details in development
      if (process.env.NODE_ENV === 'development') {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          type: error instanceof Error ? error.constructor.name : typeof error
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return new Response('Database operation failed', { status: 500 })
    }
  } catch (error) {
    console.error('[API] Error in group deletion:', {
      groupId: params.groupId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    })
    // Return error details in development
    if (process.env.NODE_ENV === 'development') {
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response('Internal Server Error', { status: 500 })
  }
}

// PATCH /api/groups/[groupId]
export async function PATCH(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    console.log('[API] Update group request:', params.groupId)
    
    const { userId } = auth()
    if (!userId) {
      console.log('[API] Unauthorized update attempt - no user ID')
      return new Response('Unauthorized', { status: 401 })
    }

    console.log('[API] Checking group existence and authorization:', {
      groupId: params.groupId,
      userId,
      requestHeaders: Object.fromEntries(request.headers)
    })

    try {
      const group = await dynamoDb.getGroupById(params.groupId)
      if (!group) {
        console.log('[API] Group not found:', params.groupId)
        return new Response('Group not found', { status: 404 })
      }

      console.log('[API] Authorization check:', {
        userId,
        groupCreatorId: group.creatorId,
        isCreator: group.creatorId === userId,
        group: JSON.stringify(group, null, 2)
      })

      if (group.creatorId !== userId) {
        console.log('[API] Unauthorized update attempt by non-creator:', userId, 'actual creator:', group.creatorId)
        return new Response('Unauthorized - only creator can update group', { status: 403 })
      }

      const data = await request.json()
      const { name } = data

      if (!name?.trim()) {
        return new Response('Group name is required', { status: 400 })
      }

      // Update the group in DynamoDB
      const updatedGroup = await dynamoDb.updateGroup(params.groupId, {
        name: name.trim(),
        updatedAt: new Date().toISOString()
      })

      // Emit socket event for group name update using the existing socket server
      io.emit('group_name_updated', { groupId: params.groupId, name: name.trim() })

      console.log('[API] Group updated successfully:', {
        id: updatedGroup.id,
        name: updatedGroup.name,
        creatorId: updatedGroup.creatorId
      })

      return new Response(JSON.stringify(updatedGroup), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('[API] Database operation error:', {
        operation: 'getGroupById/updateGroup',
        groupId: params.groupId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error
      })
      // Return error details in development
      if (process.env.NODE_ENV === 'development') {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          type: error instanceof Error ? error.constructor.name : typeof error
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return new Response('Database operation failed', { status: 500 })
    }
  } catch (error) {
    console.error('[API] Error in group update:', {
      groupId: params.groupId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    })
    // Return error details in development
    if (process.env.NODE_ENV === 'development') {
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response('Internal Server Error', { status: 500 })
  }
} 