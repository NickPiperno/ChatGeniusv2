import { NextResponse } from 'next/server';
import { DynamoDBService } from '@/lib/services/dynamodb';
import { logger } from '@/lib/logger';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';

let dynamoDb: DynamoDBService;

async function getDynamoDBInstance() {
  if (!dynamoDb) {
    console.log('[Groups API] Creating DynamoDB instance...');
    dynamoDb = new DynamoDBService();
    // Wait for initialization to complete
    await (dynamoDb as any).initializationPromise;
    console.log('[Groups API] DynamoDB instance ready:', {
      isInitialized: dynamoDb.isInitialized
    });
  }
  return dynamoDb;
}

export const runtime = 'nodejs';

export const GET = withApiAuthRequired(async function GET(req) {
  try {
    console.log('[Groups API] Starting GET request');
    
    // Get initialized DynamoDB instance
    const db = await getDynamoDBInstance();
    console.log('[Groups API] DynamoDB instance obtained');

    // Get user from session
    console.log('[Groups API] Getting session...');
    const session = await getSession();
    console.log('[Groups API] Session result:', { hasSession: !!session });

    if (!session?.user?.sub) {
      console.warn('[Groups API] No user ID in session');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = session.user.sub;

    console.log('[Groups API] Fetching groups for user:', { userId });

    const groups = await db.getGroupsByUserId(userId);
    console.log('[Groups API] Successfully fetched groups', {
      userId,
      groupCount: groups.length
    });

    return NextResponse.json({
      count: groups.length,
      groups
    });
  } catch (error) {
    console.error('[Groups API] Error in GET request:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    return NextResponse.json(
      { error: 'Failed to fetch groups', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

export const POST = withApiAuthRequired(async function POST(req) {
  try {
    console.log('[Groups API] Starting POST request');
    
    // Get initialized DynamoDB instance
    const db = await getDynamoDBInstance();
    console.log('[Groups API] DynamoDB instance obtained');

    // Get user from session
    console.log('[Groups API] Getting session...');
    const session = await getSession();
    console.log('[Groups API] Session result:', { hasSession: !!session });

    if (!session?.user?.sub) {
      console.warn('[Groups API] No user ID in session');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = session.user.sub;

    console.log('[Groups API] Creating/updating group for user:', { userId });

    const groups = await db.getGroupsByUserId(userId);
    console.log('[Groups API] Successfully fetched groups', {
      userId,
      groupCount: groups.length
    });

    return NextResponse.json({
      count: groups.length,
      groups
    });
  } catch (error) {
    console.error('[Groups API] Error in POST request:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    return NextResponse.json(
      { error: 'Failed to fetch groups', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}); 