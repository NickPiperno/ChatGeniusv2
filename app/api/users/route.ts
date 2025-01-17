import { NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'

let dynamoDb: DynamoDBService | null = null;

async function getDynamoDBInstance() {
  if (!dynamoDb) {
    logger.info('[Users API] Initializing DynamoDB instance...');
    dynamoDb = await DynamoDBService.getInstance();
    logger.info('[Users API] DynamoDB instance ready');
  }
  return dynamoDb;
}

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all users from our database
    const db = await getDynamoDBInstance();
    const users = await db.getAllUsers();
    
    // Format users to include status
    const formattedUsers = users.map(user => ({
      id: user.id.S,
      email: user.email.S,
      displayName: user.name.S,
      status: user.status?.S || 'offline'
    }));
    
    return NextResponse.json(formattedUsers);
  } catch (error) {
    logger.error('[USERS_GET] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse("Internal Error", { status: 500 });
  }
} 