import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { UserStatus } from '@/types/models/user'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { Server } from 'socket.io'

declare global {
  var io: Server | undefined
}

let dynamoDb: DynamoDBService | null = null;

async function getDynamoDBInstance() {
  if (!dynamoDb) {
    logger.info('[User API] Initializing DynamoDB instance...');
    dynamoDb = await DynamoDBService.getInstance();
    logger.info('[User API] DynamoDB instance ready');
  }
  return dynamoDb;
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { status } = await req.json() as { status: UserStatus }
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['online', 'away', 'busy', 'offline'] as const
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const userId = session.user.sub
    const db = await getDynamoDBInstance();
    
    // Update user status in DynamoDB
    await db.updateUser(userId, { 
      lastActiveAt: Date.now(),
      status
    });

    // Broadcast status update to all connected clients
    if (global.io) {
      global.io.emit('status_updated', {
        userId,
        status
      });
    }

    logger.info('[User API] Status updated successfully', {
      userId,
      status
    });

    return NextResponse.json({ 
      success: true,
      userId,
      status
    })
  } catch (error) {
    logger.error('[USER_STATUS_POST] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 