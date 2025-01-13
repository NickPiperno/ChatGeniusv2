import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamoDb = new DynamoDBService()

// GET /api/groups/[groupId]/messages/[id]/replies
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string; id: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })

    const { groupId, id } = params
    
    const message = await dynamoDb.getMessage(id)
    if (!message || message.groupId !== groupId) {
      return new NextResponse('Message not found', { status: 404 })
    }

    const replies = await dynamoDb.getRepliesForMessage(id)
    return NextResponse.json(replies)
  } catch (error) {
    console.error('Error in GET /api/groups/[groupId]/messages/[id]/replies:', error)
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    )
  }
}

// POST /api/groups/[groupId]/messages/[id]/replies
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; id: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })

    const { groupId, id } = params
    const data = await request.json()

    const parentMessage = await dynamoDb.getMessage(id)
    if (!parentMessage || parentMessage.groupId !== groupId) {
      return new NextResponse('Parent message not found', { status: 404 })
    }

    const messageData = {
      ...data,
      groupId,
      parentId: id,
      timestamp: new Date().toISOString()
    }

    const savedReply = await dynamoDb.createReply(messageData)
    return NextResponse.json(savedReply)
  } catch (error) {
    console.error('Error in POST /api/groups/[groupId]/messages/[id]/replies:', error)
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    )
  }
} 