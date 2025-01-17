import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { DynamoDBService } from '@/lib/services/dynamodb'

const dynamoDb = new DynamoDBService()

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.sub
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