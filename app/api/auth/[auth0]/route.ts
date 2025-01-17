import { handleAuth, handleCallback } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'
import type { NextRequest } from 'next/server'
import type { HandleAuth } from '@auth0/nextjs-auth0'

const dynamoDb = new DynamoDBService()

export const GET = handleAuth({
  callback: async (req: NextRequest, ctx) => {
    try {
      const res = await handleCallback(req, ctx)
      const session = await ctx.getSession()

      if (session?.user) {
        logger.info('User logged in, updating group memberships:', {
          userId: session.user.sub
        })

        // Get all users and groups
        const allUsers = await dynamoDb.getAllUsers()
        const allGroups = await dynamoDb.getAllGroups()
        
        // Update each group to include all users
        for (const group of allGroups) {
          const userIds = allUsers.map(user => user.id)
          await dynamoDb.updateGroup(group.id, {
            members: userIds,
            updatedAt: new Date().toISOString()
          })
        }

        logger.info('Successfully updated group memberships')
      }

      return res
    } catch (error) {
      logger.error('Error in Auth0 callback:', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }
}) 