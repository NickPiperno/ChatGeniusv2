import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamoDb = new DynamoDBService()

// PATCH /api/groups/[groupId]/messages/[id]/replies/[replyId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupId: string; id: string; replyId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })

    const { groupId, id: parentId, replyId: messageId } = params
    const data = await request.json()

    console.log('[API] Updating reply:', {
      messageId,
      parentId,
      groupId
    })

    const message = await dynamoDb.getMessage(messageId)
    if (!message || message.groupId !== groupId || message.parentId !== parentId) {
      console.log('[API] Reply not found or invalid:', {
        found: !!message,
        groupIdMatch: message?.groupId === groupId,
        parentIdMatch: message?.parentId === parentId
      })
      return new NextResponse('Reply not found', { status: 404 })
    }

    if (message.senderId !== userId) {
      return new NextResponse('Unauthorized', { status: 403 })
    }

    await dynamoDb.updateMessage(messageId, { content: data.content, edited: true })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/groups/[groupId]/messages/[id]/replies/[replyId]:', error)
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    )
  }
}

// DELETE /api/groups/[groupId]/messages/[id]/replies/[replyId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; id: string; replyId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })

    const { groupId, id: parentId, replyId: messageId } = params

    console.log('[API] Deleting reply:', {
      messageId,
      parentId,
      groupId
    })

    const message = await dynamoDb.getMessage(messageId)
    if (!message || message.groupId !== groupId || message.parentId !== parentId) {
      console.log('[API] Reply not found or invalid:', {
        found: !!message,
        groupIdMatch: message?.groupId === groupId,
        parentIdMatch: message?.parentId === parentId
      })
      return new NextResponse('Reply not found', { status: 404 })
    }

    if (message.senderId !== userId) {
      return new NextResponse('Unauthorized', { status: 403 })
    }

    await dynamoDb.deleteMessage(messageId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/groups/[groupId]/messages/[id]/replies/[replyId]:', error)
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    )
  }
} 