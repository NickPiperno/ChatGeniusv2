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
        { error: 'Display name is required' },
        { status: 400 }
      )
    }

    // Update user in DynamoDB
    const updatedUser = await dynamoDb.updateUser(userId, { displayName })

    // Broadcast display name update to all connected clients
    if (global.io) {
      global.io.emit('displayName_updated', {
        userId,
        displayName
      })
    }

    return NextResponse.json({ 
      success: true,
      displayName,
      message: 'Display name updated successfully'
    })
  } catch (error) {
    console.error('Error updating display name:', error)
    return NextResponse.json(
      { error: 'Error updating display name' },
      { status: 500 }
    )
  }
} 