import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamoDb = DynamoDBService.getInstance()

export const runtime = 'nodejs'

export async function POST() {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized update attempt - no user ID')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    logger.info('Starting update of all groups with all users')
    await dynamoDb.updateAllGroupsWithAllUsers()
    logger.info('Successfully updated all groups with all users')

    return NextResponse.json({ message: 'All groups updated successfully' })
  } catch (error) {
    logger.error('Error updating all groups:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 