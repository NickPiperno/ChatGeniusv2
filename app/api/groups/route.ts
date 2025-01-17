import { NextResponse } from 'next/server';
import { DynamoDBService } from '@/lib/services/dynamodb';
import { logger } from '@/lib/logger';

let dynamoDb: DynamoDBService;

async function getDynamoDBInstance() {
  if (!dynamoDb) {
    logger.info('[Groups API] Creating DynamoDB instance...');
    dynamoDb = new DynamoDBService();
    // Wait for initialization to complete
    await (dynamoDb as any).initializationPromise;
    logger.info('[Groups API] DynamoDB instance ready:', {
      isInitialized: dynamoDb.isInitialized
    });
  }
  return dynamoDb;
}

export async function GET(request: Request) {
  try {
    // Get initialized DynamoDB instance
    const db = await getDynamoDBInstance();
    logger.info('[Groups API] Processing GET request');

    // Get userId from URL params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      logger.warn('[Groups API] Missing userId in request');
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const groups = await db.getGroupsByUserId(userId);
    logger.info('[Groups API] Successfully fetched groups', {
      userId,
      groupCount: groups.length
    });

    return NextResponse.json(groups);
  } catch (error) {
    logger.error('[Groups API] Error processing request:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Get initialized DynamoDB instance
    const db = await getDynamoDBInstance();
    logger.info('[Groups API] Processing POST request');

    const { userId } = await request.json();
    if (!userId) {
      logger.warn('[Groups API] Missing userId in request');
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const groups = await db.getGroupsByUserId(userId);
    logger.info('[Groups API] Successfully fetched groups', {
      userId,
      groupCount: groups.length
    });

    return NextResponse.json(groups);
  } catch (error) {
    logger.error('[Groups API] Error processing request:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
} 