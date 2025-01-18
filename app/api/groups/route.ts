import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { DynamoDBService } from '@/lib/services/dynamodb'
import crypto from 'crypto'
import { GroupChat } from '@/types/models/dynamodb'
import { User } from '@/types/models/user'

// Initialize DynamoDB service using singleton pattern
const dynamoDb = DynamoDBService.getInstance()

export const runtime = 'nodejs'

export async function GET() {
  const startTime = Date.now();
  console.log('[API] Groups GET request started:', {
    time: new Date().toISOString(),
    hasDb: !!dynamoDb,
    dbState: dynamoDb ? {
      isInitialized: dynamoDb.isInitialized,
      hasClient: !!(dynamoDb as any)?.dynamodb,
      hasInitPromise: !!(dynamoDb as any)?.initializationPromise
    } : 'no db instance'
  });

  try {
    // Check DynamoDB initialization with detailed logging
    if (!dynamoDb.isInitialized) {
      const error = {
        time: new Date().toISOString(),
        duration: Date.now() - startTime,
        state: dynamoDb ? 'exists but not initialized' : 'null instance',
        env: {
          nodeEnv: process.env.NODE_ENV,
          isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
          region: process.env.AWS_REGION,
          hasCredentials: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY
        }
      };
      console.error('[API] DynamoDB not initialized:', error);
      return NextResponse.json({ 
        error: 'Database service unavailable',
        details: 'Service not initialized',
        debug: error
      }, { status: 503 });
    }

    const session = await getSession();
    if (!session?.user?.sub) {
      console.warn('[API] Unauthorized groups fetch attempt - no user ID:', {
        time: new Date().toISOString(),
        duration: Date.now() - startTime,
        session: session ? 'exists but no user' : 'no session'
      });
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = session.user.sub;

    console.log('[API] Fetching groups for user:', {
      time: new Date().toISOString(),
      userId,
      duration: Date.now() - startTime
    });

    const groups = await dynamoDb.getGroupsByUserId(userId);
    
    console.log('[API] Groups fetched successfully:', {
      time: new Date().toISOString(),
      userId,
      count: groups.length,
      duration: Date.now() - startTime,
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        members: g.members?.length
      }))
    });

    return NextResponse.json({
      count: groups.length,
      groups
    });
  } catch (error) {
    console.error('[API] Error in groups fetch:', {
      time: new Date().toISOString(),
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return NextResponse.json({
      error: 'Failed to fetch groups',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    logger.info('[GROUPS_POST] Starting group creation')
    
    // Check DynamoDB initialization
    if (!dynamoDb.isInitialized) {
      logger.error('[GROUPS_POST] DynamoDB service not initialized:', {
        hasRegion: !!process.env.AWS_REGION,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        hasGroupsTable: !!process.env.DYNAMODB_GROUP_CHATS_TABLE
      })
      return NextResponse.json({ 
        error: 'Database service unavailable',
        details: 'Please check AWS credentials and configuration'
      }, { status: 503 })
    }

    // Verify tables exist and are accessible
    try {
      logger.info('[GROUPS_POST] Verifying tables...')
      await dynamoDb.verifyTables()
      logger.info('[GROUPS_POST] Tables verified successfully')
    } catch (error) {
      logger.error('[GROUPS_POST] Table verification failed:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      return NextResponse.json({ 
        error: 'Database tables not accessible',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 503 })
    }

    // Check if groups table is configured
    logger.info('[GROUPS_POST] Environment check:', {
      hasGroupsTable: !!process.env.DYNAMODB_GROUP_CHATS_TABLE,
      groupsTableName: process.env.DYNAMODB_GROUP_CHATS_TABLE,
      region: process.env.AWS_REGION
    })

    if (!process.env.DYNAMODB_GROUP_CHATS_TABLE) {
      logger.error('[GROUPS_POST] Groups table not configured')
      return NextResponse.json({ 
        error: 'Groups functionality not available',
        details: 'Groups table not configured'
      }, { status: 503 })
    }

    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('[GROUPS_POST] Unauthorized group creation attempt - no user ID')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = session.user.sub

    const body = await request.json()
    const { name } = body

    if (!name) {
      logger.warn('[GROUPS_POST] Missing group name')
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const groupId = crypto.randomUUID()
    logger.info('[GROUPS_POST] Creating group:', { 
      groupId,
      name, 
      userId,
      tableName: process.env.DYNAMODB_GROUP_CHATS_TABLE
    })

    const group = await dynamoDb.createGroupChat({
      id: groupId,
      name,
      userId,
      members: [userId], // Initially just the creator
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    logger.info('[GROUPS_POST] Group created successfully:', {
      groupId: group.id,
      name: group.name,
      members: group.members
    })

    return NextResponse.json(group)
  } catch (error) {
    logger.error('[GROUPS_POST] Error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      env: {
        hasGroupsTable: !!process.env.DYNAMODB_GROUP_CHATS_TABLE,
        groupsTableName: process.env.DYNAMODB_GROUP_CHATS_TABLE,
        region: process.env.AWS_REGION,
        nodeEnv: process.env.NODE_ENV
      }
    })
    return NextResponse.json({ 
      error: 'Failed to create group',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    // Check DynamoDB initialization
    if (!dynamoDb.isInitialized) {
      logger.error('[GROUPS_PATCH] DynamoDB service not initialized:', {
        hasRegion: !!process.env.AWS_REGION,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        hasGroupsTable: !!process.env.DYNAMODB_GROUP_CHATS_TABLE
      })
      return NextResponse.json({ 
        error: 'Database service unavailable',
        details: 'Please check AWS credentials and configuration'
      }, { status: 503 })
    }

    // Check if groups table is configured
    if (!process.env.DYNAMODB_GROUP_CHATS_TABLE) {
      return NextResponse.json({ 
        error: 'Groups functionality not available',
        details: 'Groups table not configured'
      }, { status: 503 })
    }

    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized update attempt - no user ID')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get all users
    logger.info('Fetching all users')
    const allUsers = await dynamoDb.getAllUsers()
    const userIds = allUsers.map((user: User) => user.id)

    // Get all groups
    logger.info('Fetching all groups')
    const allGroups = await dynamoDb.getAllGroups()

    // Update each group to include all users
    logger.info('Updating all groups with all users:', {
      userCount: userIds.length,
      groupCount: allGroups.length
    })

    const updates = await Promise.all(
      allGroups.map(async (group: GroupChat) => {
        const updatedGroup = await dynamoDb.updateGroup(group.id, {
          members: userIds,
          updatedAt: new Date().toISOString()
        })
        return updatedGroup
      })
    )

    logger.info('Successfully updated all groups with all users:', {
      updatedGroups: updates.length
    })

    return NextResponse.json({
      message: 'All groups updated successfully',
      updatedGroups: updates.length
    })
  } catch (error) {
    logger.error('[GROUPS_PATCH] Error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
