import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'

const dynamodb = new DynamoDBService()

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the target userId from query params
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId');
    
    if (!targetUserId) {
      return new NextResponse("Missing userId parameter", { status: 400 });
    }

    // Get user data from DynamoDB
    const dbUser = await dynamodb.getUserById(targetUserId);
    
    if (!dbUser) {
      return NextResponse.json({ displayName: null });
    }
    
    return NextResponse.json({
      displayName: dbUser.displayName
    });
  } catch (error) {
    logger.error('[DISPLAY_NAME_GET]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 