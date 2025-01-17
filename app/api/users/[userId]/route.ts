import { ManagementClient } from 'auth0'
import { NextResponse } from 'next/server'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'

interface Auth0User {
  nickname?: string;
  picture?: string;
}

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
})

let dynamoDb: DynamoDBService | null = null;

async function getDynamoDBInstance() {
  if (!dynamoDb) {
    logger.info('[User API] Initializing DynamoDB instance...');
    dynamoDb = await DynamoDBService.getInstance();
    logger.info('[User API] DynamoDB instance ready');
  }
  return dynamoDb;
}

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = (await auth0.users.get({ id: params.userId })) as Auth0User
    const db = await getDynamoDBInstance();
    const dbUser = await db.getUserById(params.userId)
    
    // Format the user data
    const formattedUser = {
      id: params.userId,
      displayName: dbUser?.name?.S || user.nickname || 'Anonymous',
      imageUrl: user.picture || null,
      status: dbUser?.status?.S || 'offline'
    }

    return NextResponse.json(formattedUser)
  } catch (error) {
    logger.error('[USER_GET] Error fetching user:', {
      userId: params.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
} 