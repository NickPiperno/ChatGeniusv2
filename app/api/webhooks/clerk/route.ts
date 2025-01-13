import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { DynamoDBService } from '@/lib/services/dynamodb'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

const dynamoDb = new DynamoDBService()

async function handler(request: Request) {
  const payload = await request.json()
  const headersList = headers()
  const svix_id = headersList.get("svix-id")
  const svix_timestamp = headersList.get("svix-timestamp")
  const svix_signature = headersList.get("svix-signature")

  // If there is no webhook secret, throw an error
  if (!webhookSecret) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(webhookSecret)

  let evt: WebhookEvent

  // Verify the webhook payload
  try {
    evt = wh.verify(JSON.stringify(payload), {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400
    })
  }

  // Handle the webhook
  const eventType = evt.type
  
  if (eventType === 'user.created') {
    const { id, email_addresses, username, first_name, last_name, image_url } = evt.data

    // Create user in DynamoDB
    try {
      const fullName = `${first_name || ''} ${last_name || ''}`.trim()
      const user = {
        id: id,
        clerkId: id,
        name: username || id,
        displayName: fullName || 'Anonymous',
        username: username || id,
        email: email_addresses[0]?.email_address || '',
        avatarUrl: image_url,
        createdAt: Date.now(),
        preferences: {}
      }

      await dynamoDb.createUser(user)
      
      return NextResponse.json({
        message: 'User created in DynamoDB',
        user
      })
    } catch (error) {
      console.error('Error creating user in DynamoDB:', error)
      return NextResponse.json(
        { error: 'Error creating user' },
        { status: 500 }
      )
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, username, first_name, last_name, image_url } = evt.data

    try {
      const fullName = `${first_name || ''} ${last_name || ''}`.trim()
      const updates = {
        name: username || id,
        displayName: fullName || 'Anonymous',
        username: username || id,
        email: email_addresses[0]?.email_address || '',
        avatarUrl: image_url
      }

      await dynamoDb.updateUser(id, updates)
      
      return NextResponse.json({
        message: 'User updated in DynamoDB',
        updates
      })
    } catch (error) {
      console.error('Error updating user in DynamoDB:', error)
      return NextResponse.json(
        { error: 'Error updating user' },
        { status: 500 }
      )
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data
    try {
      if (!id) {
        throw new Error('User ID is required')
      }
      
      await dynamoDb.deleteUser(id)
      
      return NextResponse.json({
        message: 'User deleted from DynamoDB'
      })
    } catch (error) {
      console.error('Error deleting user from DynamoDB:', error)
      return NextResponse.json(
        { error: 'Error deleting user' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    message: 'Webhook received',
    eventType
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler 