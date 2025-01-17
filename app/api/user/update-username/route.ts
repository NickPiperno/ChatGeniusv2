import { NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { Server } from 'socket.io'

declare global {
  var io: Server | undefined
}

const dynamoDb = new DynamoDBService()

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { displayName } = await req.json()
    if (!displayName) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
    }

    // Check if display name is already taken
    const existingUser = await dynamoDb.getUserByAuthId(session.user.sub)
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update the user's display name
    const updatedUser = await dynamoDb.updateUser(existingUser.id, { displayName })

    // Notify connected clients about the display name change
    if (global.io) {
      global.io.emit('user_updated', updatedUser)
    }

    return NextResponse.json({ message: 'Display name updated successfully' })
  } catch (error) {
    console.error('Error updating display name:', error)
    return NextResponse.json({ error: 'Error updating display name' }, { status: 500 })
  }
}