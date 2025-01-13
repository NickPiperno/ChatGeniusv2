import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamodb = new DynamoDBService()

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    console.log('[USERNAME_GET] Starting username fetch')
    
    const { userId } = auth();
    console.log('[USERNAME_GET] Auth check:', { 
      hasUserId: !!userId,
      userId: userId?.substring(0, 5) + '...'
    })
    
    if (!userId) {
      console.log('[USERNAME_GET] No userId found')
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log('[USERNAME_GET] Fetching user from DynamoDB:', userId)
    
    // Get username from our database
    const user = await dynamodb.getUserById(userId);
    console.log('[USERNAME_GET] DynamoDB response:', {
      hasUser: !!user,
      username: user?.username || null
    })
    
    return NextResponse.json({
      username: user?.username || null
    });
  } catch (error) {
    console.error('[USERNAME_GET] Error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    return NextResponse.json({ 
      error: 'Failed to fetch username',
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