import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamoDb = new DynamoDBService()

export async function POST(request: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { username } = await request.json()
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    // Check if username is already taken in DynamoDB
    // You'll need to add a method to check by username
    const existingUser = await dynamoDb.getUserByUsername(username)
    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      )
    }

    // Update user in DynamoDB
    const updatedUser = await dynamoDb.updateUser(userId, { name: username })

    // Broadcast username update to all connected clients
    if (global.io) {
      global.io.emit('username_updated', {
        userId,
        username
      })
    }

    return NextResponse.json({ 
      success: true,
      username, // Use the validated username directly since updatedUser may not have username property
      message: 'Username updated successfully'
    })
  } catch (error) {
    console.error('Error updating username:', error)
    return NextResponse.json(
      { error: 'Error updating username' },
      { status: 500 }
    )
  }
}