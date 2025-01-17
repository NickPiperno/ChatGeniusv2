import { handleAuth, handleCallback, getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'
import type { NextRequest } from 'next/server'

// Initialize DynamoDB service with error handling
let dynamoDb: DynamoDBService
try {
  dynamoDb = new DynamoDBService()
} catch (error) {
  logger.error('Failed to initialize DynamoDB service:', error)
  // Don't throw here - let the handler deal with it
}

export const GET = handleAuth({
  callback: async (req: NextRequest, ctx: any) => {
    try {
      // Verify DynamoDB is initialized
      if (!dynamoDb) {
        logger.error('DynamoDB service not initialized')
        return NextResponse.json(
          { error: 'Database service unavailable' },
          { status: 503 }
        )
      }

      const res = await handleCallback(req, ctx)
      
      // Get the user from the session
      const session = await getSession()
      if (!session?.user?.sub) {
        logger.warn('No user ID in session after callback')
        return res
      }

      logger.info('User logged in:', { userId: session.user.sub })

      try {
        // Create or update user in DynamoDB
        await dynamoDb.createUser({
          id: session.user.sub,
          email: session.user.email || '',
          auth0Id: session.user.sub,
          displayName: session.user.nickname || session.user.name || session.user.email?.split('@')[0] || 'Anonymous',
          imageUrl: session.user.picture || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastActiveAt: Date.now()
        })

        // Create or get default group with retry logic
        let defaultGroup
        try {
          defaultGroup = await dynamoDb.createGroupChat({
            id: 'general',
            name: 'General',
            userId: session.user.sub,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            members: [session.user.sub],
            metadata: {}
          })
        } catch (error) {
          const errorInfo = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : { error };
          
          logger.warn('Failed to create default group, attempting to get existing:', errorInfo)
          // Try to get existing group instead
          defaultGroup = await dynamoDb.getGroupById('general')
        }

        if (defaultGroup) {
          // Add user to default group with error handling
          try {
            await dynamoDb.ensureUserInGroup(session.user.sub, defaultGroup.id)
          } catch (error) {
            logger.error('Failed to add user to default group:', error)
            // Don't fail the whole auth flow if this fails
          }

          logger.info('User setup complete:', {
            userId: session.user.sub,
            defaultGroupId: defaultGroup.id
          })
        } else {
          logger.error('Could not create or get default group')
        }

        return res
      } catch (dbError) {
        logger.error('Database operation failed:', dbError)
        // Return success response even if DB ops fail
        // This prevents user from being locked out if DB is temporarily down
        return res
      }
    } catch (error) {
      logger.error('Error in Auth0 callback:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

export const POST = handleAuth() 