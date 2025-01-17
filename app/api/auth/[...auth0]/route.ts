import { handleAuth, handleCallback } from '@auth0/nextjs-auth0'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'

const dynamoDb = new DynamoDBService()

// Custom callback handler to create user in DynamoDB
const afterCallback = async (req: Request, session: any) => {
  if (!session?.user?.sub) {
    logger.warn('No user ID in session after Auth0 callback')
    return session
  }

  try {
    // Check if user already exists in DynamoDB
    const existingUser = await dynamoDb.getUserById(session.user.sub)
    
    if (!existingUser) {
      logger.info('Creating new user in DynamoDB:', {
        userId: session.user.sub,
        email: session.user.email
      })

      // Create user in DynamoDB
      await dynamoDb.createUser({
        id: session.user.sub,
        auth0Id: session.user.sub,
        email: session.user.email,
        displayName: session.user.nickname || session.user.name || session.user.email?.split('@')[0] || 'User',
        imageUrl: session.user.picture,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActiveAt: Date.now()
      })

      logger.info('Successfully created user in DynamoDB:', {
        userId: session.user.sub
      })

      // Add user to all existing groups
      logger.info('Adding new user to all existing groups')
      const allGroups = await dynamoDb.getAllGroups()
      
      for (const group of allGroups) {
        if (group.members && !group.members.includes(session.user.sub)) {
          logger.debug('Adding user to group:', {
            userId: session.user.sub,
            groupId: group.id
          })
          
          await dynamoDb.updateGroup(group.id, {
            members: [...group.members, session.user.sub],
            updatedAt: new Date().toISOString()
          })
        }
      }
      
      logger.info('Successfully added user to all groups:', {
        userId: session.user.sub,
        groupCount: allGroups.length
      })
    } else {
      logger.debug('User already exists in DynamoDB:', {
        userId: session.user.sub
      })
    }
  } catch (error) {
    logger.error('Error handling Auth0 callback:', error)
  }

  return session
}

export const GET = handleAuth({
  callback: handleCallback({ afterCallback })
})
export const POST = handleAuth() 