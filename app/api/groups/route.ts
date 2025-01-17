import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { DynamoDBService } from '@/lib/services/dynamodb'

// Initialize DynamoDB service for each request instead of at module level
async function getDynamoDBService() {
  try {
    const service = new DynamoDBService()
    if (!service.isInitialized) {
      logger.error('[DynamoDB] Service failed to initialize')
      return null
    }
    return service
  } catch (error) {
    logger.error('[DynamoDB] Error creating service:', error)
    return null
  }
}

export const runtime = 'nodejs'

export async function GET() {
  try {
    const dynamoDb = await getDynamoDBService()
    if (!dynamoDb) {
      return NextResponse.json({ 
        error: 'Database service unavailable',
        details: 'Please check AWS credentials and configuration'
      }, { status: 503 })
    }

    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized groups fetch attempt - no user ID')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = session.user.sub

    logger.info('Fetching groups for user', { userId })
    
    // Handle case where groups table is not configured
    if (!process.env.DYNAMODB_GROUP_CHATS_TABLE) {
      logger.warn('Groups table not configured')
      return NextResponse.json({
        count: 0,
        groups: []
      })
    }

    const groups = await dynamoDb.getGroupsByUserId(userId)
    
    logger.debug('Groups fetched:', groups.map(g => ({
      id: g.id,
      name: g.name,
      userId: g.userId,
      members: g.members
    })))

    return NextResponse.json({
      count: groups.length,
      groups
    })
  } catch (error) {
    logger.error('[GROUPS_GET] Error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      env: {
        hasAuth0Secret: !!process.env.AUTH0_SECRET,
        hasAuth0BaseUrl: !!process.env.AUTH0_BASE_URL,
        hasAuth0IssuerBaseUrl: !!process.env.AUTH0_ISSUER_BASE_URL,
        hasAuth0ClientId: !!process.env.AUTH0_CLIENT_ID,
        hasAuth0ClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
        hasAwsAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
        hasAwsSecretAccessKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        hasAwsRegion: !!process.env.AWS_REGION,
        nodeEnv: process.env.NODE_ENV,
        apiUrl: process.env.NEXT_PUBLIC_API_URL
      }
    })
    
    return NextResponse.json({
      error: 'Database operation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    logger.info('[GROUPS_POST] Starting group creation')
    
    const dynamoDb = await getDynamoDBService()
    if (!dynamoDb) {
      logger.error('[GROUPS_POST] DynamoDB service not initialized')
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
        message: error instanceof Error ? error.message : 'Unknown error'
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
    const dynamoDb = await getDynamoDBService()
    if (!dynamoDb) {
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
    const userIds = allUsers.map(user => user.id)

    // Get all groups
    logger.info('Fetching all groups')
    const allGroups = await dynamoDb.getAllGroups()

    // Update each group to include all users
    logger.info('Updating all groups with all users:', {
      userCount: userIds.length,
      groupCount: allGroups.length
    })

    const updates = await Promise.all(
      allGroups.map(async group => {
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