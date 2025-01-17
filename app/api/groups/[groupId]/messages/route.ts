import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'

let dynamoDb: DynamoDBService | null = null;

async function getDynamoDBInstance() {
  if (!dynamoDb) {
    logger.info('[Messages API] Initializing DynamoDB instance...');
    dynamoDb = await DynamoDBService.getInstance();
    logger.info('[Messages API] DynamoDB instance ready');
  }
  return dynamoDb;
}

// GET /api/groups/[groupId]/messages
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user?.sub) return new NextResponse('Unauthorized', { status: 401 })
    const userId = session.user.sub

    const { groupId } = params
    
    const db = await getDynamoDBInstance();
    const messages = await db.getMessagesForGroup(groupId)
    return NextResponse.json(messages)
  } catch (error) {
    logger.error('Error in GET /api/groups/[groupId]/messages:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
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
    const session = await getSession()
    if (!session?.user?.sub) return new NextResponse('Unauthorized', { status: 401 })
    const userId = session.user.sub

    const { groupId } = params
    const data = await request.json()

    const message = {
      ...data,
      groupId,
      timestamp: new Date().toISOString()
    }

    const db = await getDynamoDBInstance();
    const savedMessage = await db.createMessage(message)
    return NextResponse.json(savedMessage)
  } catch (error) {
    logger.error('Error in POST /api/groups/[groupId]/messages:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    )
  }
} 