import { NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamodb = DynamoDBService.getInstance()

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all users from our database
    const users = await dynamodb.getAllUsers();
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('[USERS_GET]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 