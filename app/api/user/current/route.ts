import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamodb = new DynamoDBService()

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Get additional user data from our database
    const dbUser = await dynamodb.getUserById(userId);
    
    return NextResponse.json({
      id: user.id,
      name: user.firstName + ' ' + user.lastName,
      email: user.emailAddresses[0]?.emailAddress,
      imageUrl: user.imageUrl,
      username: dbUser?.username || null
    });
  } catch (error) {
    console.error('[CURRENT_USER_GET]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 