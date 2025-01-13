import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamodb = new DynamoDBService()

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    // Log headers and auth state
    console.log('[USERS_GET] Headers:', Object.fromEntries(req.headers))
    const authState = auth()
    console.log('[USERS_GET] Auth state:', { userId: authState.userId, sessionId: authState.sessionId })

    const { userId } = authState
    if (!userId) {
      console.log('[USERS_GET] No userId found in auth state')
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all users from our database
    const users = await dynamodb.getAllUsers();
    console.log('[USERS_GET] Successfully fetched users:', users.length)
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('[USERS_GET]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 