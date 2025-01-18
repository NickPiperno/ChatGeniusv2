import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamoDb = new DynamoDBService()

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await clerkClient.users.getUser(params.userId)
    const dbUser = await dynamoDb.getUserByClerkId(user.id)
    
    // Format the user data
    const formattedUser = {
      id: user.id,
      name: dbUser?.name || user.displayName || 'Anonymous',
      displayName: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : dbUser?.name || user.displayName || 'Anonymous',
      imageUrl: user.imageUrl,
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