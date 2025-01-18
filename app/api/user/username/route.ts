import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamodb = new DynamoDBService()

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    console.log('[displayName_GET] Starting displayName fetch')
    
    const { userId } = auth();
    console.log('[displayName_GET] Auth check:', { 
      hasUserId: !!userId,
      userId: userId?.substring(0, 5) + '...'
    })
    
    if (!userId) {
      console.log('[displayName_GET] No userId found')
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log('[displayName_GET] Fetching user from DynamoDB:', userId)
    
    // Get displayName from our database
    const user = await dynamodb.getUserById(userId);
    console.log('[displayName_GET] DynamoDB response:', {
      hasUser: !!user,
      displayName: user?.displayName || null
    })
    
    // Get Clerk user data
    const clerkUser = await clerkClient.users.getUser(userId);
    
    return NextResponse.json({
      displayName: user?.displayName || clerkUser?.username || null
    });
  } catch (error) {
    console.error('[displayName_GET] Error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    return NextResponse.json({ 
      error: 'Failed to fetch displayName',
      details: error instanceof Error ? error.message : 'Unknown error',
      env: {
        hasRegion: !!process.env.AWS_REGION,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        table: process.env.DYNAMODB_USERS_TABLE
      }
    }, { status: 500 });
  }
} 