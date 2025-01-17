import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamoDb = new DynamoDBService()

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

    // Get messages from DynamoDB
    const { messages, lastEvaluatedKey } = await dynamoDb.getMessagesForGroup(params.groupId)

    logger.debug('[MESSAGES_GET] Messages fetched:', {
      count: messages.length,
      hasMore: !!lastEvaluatedKey
    })

    return NextResponse.json({ 
      messages,
      cursor: lastEvaluatedKey || null,
      hasMore: !!lastEvaluatedKey
    })

  } catch (error) {
    logger.error('[MESSAGES_GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const { content } = await req.json()
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    logger.info('[MESSAGES_POST] Creating message', { 
      groupId: params.groupId,
      userId: session.user.sub 
    })

    // Create message in DynamoDB
    const message = await dynamoDb.createMessage({
      id: crypto.randomUUID(),
      groupId: params.groupId,
      content,
      userId: session.user.sub,
      displayName: session.user.name || session.user.email?.split('@')[0] || 'User',
      imageUrl: session.user.picture || '',
      timestamp: new Date().toISOString(),
      reactions: {},
      attachments: [],
      metadata: {},
      replyCount: 0,
      sender: {
        id: session.user.sub,
        displayName: session.user.name || session.user.email?.split('@')[0] || 'User',
        imageUrl: session.user.picture || ''
      },
      replies: []
    })

    logger.debug('[MESSAGES_POST] Message created:', {
      messageId: message.id,
      groupId: message.groupId,
      userId: message.userId
    })

    return NextResponse.json(message)

  } catch (error) {
    logger.error('[MESSAGES_POST] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 