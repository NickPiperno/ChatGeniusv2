import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { DynamoDBService } from '@/lib/services/dynamodb'

let dynamoDb: DynamoDBService;

// Initialize DynamoDB service
async function getDynamoDBInstance() {
  if (!dynamoDb) {
    logger.info('[Groups API] Creating new DynamoDB instance...')
    dynamoDb = await DynamoDBService.getInstance()
    logger.info('[Groups API] DynamoDB instance ready')
  }
  return dynamoDb
}

// Initialize the service
getDynamoDBInstance().catch(error => {
  logger.error('[Groups API] Failed to initialize DynamoDB:', error)
})

export const runtime = 'nodejs'

export async function POST() {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      logger.warn('Unauthorized update attempt - no user ID')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    logger.info('Starting update of all groups with all users')
    await (await getDynamoDBInstance()).updateAllGroupsWithAllUsers()
    logger.info('Successfully updated all groups with all users')

    return NextResponse.json({ message: 'All groups updated successfully' })
  } catch (error) {
    logger.error('Error updating all groups:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to update groups' },
      { status: 500 }
    )
  }
} 