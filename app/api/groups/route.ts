import { NextResponse } from 'next/server';
import { DynamoDBService } from '@/lib/services/dynamodb';
import { logger } from '@/lib/logger';
import { getSession } from '@auth0/nextjs-auth0';

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

    // Get user from session
    const session = await getSession();
    if (!session?.user?.sub) {
      logger.warn('[Groups API] Unauthorized request - no user session');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = session.user.sub;

    logger.info('[Groups API] Fetching groups for user:', { userId });

    const groups = await db.getGroupsByUserId(userId);
    logger.info('[Groups API] Successfully fetched groups', {
      userId,
      groupCount: groups.length
    });

    return NextResponse.json({
      count: groups.length,
      groups
    });
  } catch (error) {
    logger.error('[Groups API] Error processing request:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      env: {
        hasAuth0Secret: !!process.env.AUTH0_SECRET,
        hasAuth0BaseUrl: !!process.env.AUTH0_BASE_URL,
        hasAuth0IssuerBaseUrl: !!process.env.AUTH0_ISSUER_BASE_URL,
        hasAuth0ClientId: !!process.env.AUTH0_CLIENT_ID,
        hasAuth0ClientSecret: !!process.env.AUTH0_CLIENT_SECRET
      }
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

    // Get user from session
    const session = await getSession();
    if (!session?.user?.sub) {
      logger.warn('[Groups API] Unauthorized request - no user session');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = session.user.sub;

    logger.info('[Groups API] Creating/updating group for user:', { userId });

    const groups = await db.getGroupsByUserId(userId);
    logger.info('[Groups API] Successfully fetched groups', {
      userId,
      groupCount: groups.length
    });

    return NextResponse.json({
      count: groups.length,
      groups
    });
  } catch (error) {
    logger.error('[Groups API] Error processing request:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      env: {
        hasAuth0Secret: !!process.env.AUTH0_SECRET,
        hasAuth0BaseUrl: !!process.env.AUTH0_BASE_URL,
        hasAuth0IssuerBaseUrl: !!process.env.AUTH0_ISSUER_BASE_URL,
        hasAuth0ClientId: !!process.env.AUTH0_CLIENT_ID,
        hasAuth0ClientSecret: !!process.env.AUTH0_CLIENT_SECRET
      }
    });
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
} 