import { NextResponse } from 'next/server';
import { DynamoDBService } from '@/lib/services/dynamodb';
import { logger } from '@/lib/logger';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';

export const runtime = 'nodejs';

export const GET = withApiAuthRequired(async function GET(req) {
  try {
    logger.info('[Groups API] Starting GET request');
    
    // Get user from session
    logger.info('[Groups API] Getting session...');
    const session = await getSession();
    logger.info('[Groups API] Session result:', { hasSession: !!session });

    if (!session?.user?.sub) {
      logger.warn('[Groups API] No user ID in session');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = session.user.sub;

    logger.info('[Groups API] Fetching groups for user:', { userId });

    // Get the singleton instance
    const db = await DynamoDBService.getInstance();
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
    logger.error('[Groups API] Error in GET request:', {
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
    logger.info('[Groups API] Starting POST request');
    
    // Get user from session
    logger.info('[Groups API] Getting session...');
    const session = await getSession();
    logger.info('[Groups API] Session result:', { hasSession: !!session });

    if (!session?.user?.sub) {
      logger.warn('[Groups API] No user ID in session');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = session.user.sub;

    logger.info('[Groups API] Creating/updating group for user:', { userId });

    // Get the singleton instance
    const db = await DynamoDBService.getInstance();
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
    logger.error('[Groups API] Error in POST request:', {
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