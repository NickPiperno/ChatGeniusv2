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

    const { displayName } = await request.json()
    if (!displayName) {
      return NextResponse.json(
        { error: 'displayName is required' },
        { status: 400 }
      )
    }

    // Validate displayName format
    const displayNameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!displayNameRegex.test(displayName)) {
      return NextResponse.json(
        { error: 'displayName must be 3-20 characters long and can only contain letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    // Check if displayName is already taken in DynamoDB
    // You'll need to add a method to check by displayName
    const existingUser = await dynamoDb.getUserBydisplayName(displayName)
    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        { error: 'displayName is already taken' },
        { status: 400 }
      )
    }

    // Update user in DynamoDB
    const updatedUser = await dynamoDb.updateUser(userId, { name: displayName })

    // Broadcast displayName update to all connected clients
    if (global.io) {
      global.io.emit('displayName_updated', {
        userId,
        displayName
      })
    }

    return NextResponse.json({ 
      success: true,
      displayName, // Use the validated displayName directly since updatedUser may not have displayName property
      message: 'displayName updated successfully'
    })
  } catch (error) {
    console.error('Error updating displayName:', error)
    return NextResponse.json(
      { error: 'Error updating displayName' },
      { status: 500 }
    )
  }
}