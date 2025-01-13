import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamoDb = new DynamoDBService()

// GET /api/groups/[groupId]/messages
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })

    const { groupId } = params
    
    const messages = await dynamoDb.getMessagesByGroup(groupId)
    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error in GET /api/groups/[groupId]/messages:', error)
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    )
  }
}

// POST /api/groups/[groupId]/messages
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })

    const { groupId } = params
    const data = await request.json()

    const message = {
      ...data,
      groupId,
      timestamp: Date.now()
    }

    const savedMessage = await dynamoDb.createMessage(message)
    return NextResponse.json(savedMessage)
  } catch (error) {
    console.error('Error in POST /api/groups/[groupId]/messages:', error)
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    )
  }
} 