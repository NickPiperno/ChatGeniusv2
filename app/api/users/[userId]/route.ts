import { ManagementClient } from 'auth0'
import { NextResponse } from 'next/server'
import { DynamoDBService } from '@/lib/services/dynamodb'

interface Auth0User {
  nickname?: string;
  picture?: string;
}

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
})

const dynamoDb = DynamoDBService.getInstance()

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = (await auth0.users.get({ id: params.userId })) as Auth0User
    const dbUser = await dynamoDb.getUserById(params.userId)
    
    // Format the user data
    const formattedUser = {
      id: params.userId,
      displayName: dbUser?.displayName || user.nickname || 'Anonymous',
      imageUrl: user.picture || null,
      status: 'offline'
    }

    return NextResponse.json(formattedUser)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
} 