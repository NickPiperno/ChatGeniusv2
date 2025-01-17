import { handleAuth, handleCallback } from '@auth0/nextjs-auth0'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { getSession } from '@auth0/nextjs-auth0'

const dynamoDb = new DynamoDBService()

export const GET = handleAuth()

export const POST = async (req: NextRequest, ctx: { params: { auth0: string[] } }) => {
  try {
    await handleCallback(req, ctx)
    const session = await getSession()
    
    if (!session?.user?.sub) {
      logger.warn('No user ID in session after callback')
      return Response.json({ error: 'No user ID in session' })
    }

    logger.info('Auth0 callback - updating groups for user:', session.user.sub)

    // Get all users and groups
    const allUsers = await dynamoDb.getAllUsers()
    const allGroups = await dynamoDb.getAllGroups()

    logger.info('Found existing data:', {
      userCount: allUsers.length,
      groupCount: allGroups.length
    })

    // Update each group to include all users
    for (const group of allGroups) {
      const userIds = allUsers.map(user => user.id)
      await dynamoDb.updateGroup(group.id, {
        members: userIds,
        updatedAt: new Date().toISOString()
      })
      logger.info('Updated group members:', {
        groupId: group.id,
        memberCount: userIds.length
      })
    }

    logger.info('Successfully updated all groups with all users')
    return Response.json({ success: true })
  } catch (error) {
    logger.error('Error in Auth0 callback:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
} 