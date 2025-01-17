import { NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'
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

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the target userId from query params
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId');
    
    if (!targetUserId) {
      return new NextResponse("Missing userId parameter", { status: 400 });
    }

    // Get user data from DynamoDB
    const db = await getDynamoDBInstance();
    const dbUser = await db.getUserById(targetUserId);
    
    if (!dbUser) {
      // If no DynamoDB record, fallback to Auth0 nickname
      return NextResponse.json({ 
        displayName: session.user.nickname || null 
      });
    }
    
    return NextResponse.json({
      displayName: dbUser.name.S
    });
  } catch (error) {
    logger.error('[DISPLAY_NAME_GET]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.sub
    const { displayName } = await request.json()
    if (!displayName) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      )
    }

    // Update user in DynamoDB
    const db = await getDynamoDBInstance();
    const updatedUser = await db.updateUser(userId, { displayName })

    // Broadcast display name update to all connected clients
    if (global.io) {
      global.io.emit('displayName_updated', {
        userId,
        displayName
      })
    }

    logger.info('[User API] Display name updated successfully', {
      userId,
      displayName
    });

    return NextResponse.json({ 
      success: true,
      displayName,
      message: 'Display name updated successfully'
    })
  } catch (error) {
    logger.error('[User API] Error updating display name:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Error updating display name' },
      { status: 500 }
    )
  }
} 