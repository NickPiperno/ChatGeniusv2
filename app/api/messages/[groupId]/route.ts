import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { DynamoDBService } from '@/lib/services/dynamodb'

let dynamoDb: DynamoDBService;

// Initialize DynamoDB service
async function getDynamoDBInstance() {
  if (!dynamoDb) {
    logger.info('[Messages API] Creating new DynamoDB instance...')
    dynamoDb = await DynamoDBService.getInstance()
    logger.info('[Messages API] DynamoDB instance ready')
  }
  return dynamoDb
}

// Initialize the service
getDynamoDBInstance().catch(error => {
  logger.error('[Messages API] Failed to initialize DynamoDB:', error)
})

export async function GET(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    logger.info('[MESSAGES_GET] Fetching messages', { 
      groupId: params.groupId,
      userId: session.user.sub 
    })

    // Get messages for the group
    const messages = await (await getDynamoDBInstance()).getMessagesForGroup(params.groupId)
    
    return NextResponse.json(messages)
  } catch (error) {
    logger.error('[MESSAGES_GET] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      groupId: params.groupId
    })
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const result = await (await getDynamoDBInstance()).createMessage({
      ...message,
      groupId: params.groupId,
      userId: session.user.sub
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error('[MESSAGES_POST] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      groupId: params.groupId
    })
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
} 