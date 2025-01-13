import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamodb = new DynamoDBService()

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    console.log('[CURRENT_USER_GET] Starting request...')
    
    const { userId } = auth()
    console.log('[CURRENT_USER_GET] Auth check:', { userId: userId?.substring(0, 8) })
    
    if (!userId) {
      console.log('[CURRENT_USER_GET] No userId found')
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = await currentUser()
    console.log('[CURRENT_USER_GET] Clerk user:', { 
      id: user?.id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.emailAddresses[0]?.emailAddress
    })
    
    if (!user) {
      console.log('[CURRENT_USER_GET] No Clerk user found')
      return new NextResponse("User not found", { status: 404 })
    }

    // Get additional user data from our database
    console.log('[CURRENT_USER_GET] Fetching user from DynamoDB:', userId)
    let dbUser = await dynamodb.getUserById(userId)
    console.log('[CURRENT_USER_GET] DynamoDB user:', dbUser)
    
    // If user doesn't exist in DynamoDB, create them
    if (!dbUser) {
      console.log('[CURRENT_USER_GET] User not found in DynamoDB, creating...')
      const newUser = {
        id: userId,
        clerkId: userId,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous',
        username: user.username || userId,
        email: user.emailAddresses[0]?.emailAddress || '',
        avatarUrl: user.imageUrl,
        createdAt: Date.now(),
        preferences: {}
      }

      console.log('[CURRENT_USER_GET] Attempting to create user:', newUser)
      try {
        await dynamodb.createUser(newUser)
        console.log('[CURRENT_USER_GET] User created successfully')
        dbUser = newUser
      } catch (error) {
        console.error('[CURRENT_USER_GET] Error creating user:', error)
        throw error
      }
    }

    const response = {
      id: user.id,
      name: dbUser.name,
      email: dbUser.email,
      imageUrl: user.imageUrl,
      username: dbUser.username
    }
    console.log('[CURRENT_USER_GET] Sending response:', response)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('[CURRENT_USER_GET] Error:', error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 