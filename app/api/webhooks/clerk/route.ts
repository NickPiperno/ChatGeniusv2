import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { logger } from '@/lib/logger'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
const GROUPS_TABLE = process.env.DYNAMODB_GROUP_CHATS_TABLE || 'dev_GroupChats'

const dynamoDb = new DynamoDBService()

async function handler(request: Request) {
  const payload = await request.json()
  const headersList = headers()
  const svix_id = headersList.get("svix-id")
  const svix_timestamp = headersList.get("svix-timestamp")
  const svix_signature = headersList.get("svix-signature")

  // If there is no webhook secret, throw an error
  if (!webhookSecret) {
    logger.error('Missing CLERK_WEBHOOK_SECRET')
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    logger.error('Missing Svix headers')
    return new Response('Error occurred -- no svix headers', {
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
    logger.error('Error verifying webhook:', err)
    return new Response('Error occurred', {
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
        displayName: username || fullName || id,
        email: email_addresses[0]?.email_address || '',
        imageUrl: image_url,
        createdAt: Date.now(),
        preferences: {}
      }

      logger.info('Creating user in DynamoDB:', { userId: id })
      await dynamoDb.createUser(user)

      // Get all existing groups
      logger.info('Fetching all groups to add new user')
      const result = await dynamoDb.send(new ScanCommand({
        TableName: GROUPS_TABLE
      }))

      const groups = result.Items || []
      logger.info('Adding user to groups:', { 
        userId: id, 
        groupCount: groups.length 
      })

      // Add user to each group
      for (const group of groups) {
        try {
          await dynamoDb.updateGroup(group.id, {
            members: [...(group.members || []), id]
          })
          logger.info('Added user to group:', { 
            userId: id, 
            groupId: group.id 
          })
        } catch (error) {
          logger.error('Error adding user to group:', {
            userId: id,
            groupId: group.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          // Continue with other groups even if one fails
        }
      }
      
      return NextResponse.json({
        message: 'User created in DynamoDB and added to all groups',
        user,
        addedToGroups: groups.length
      })
    } catch (error) {
      logger.error('Error creating user in DynamoDB:', error)
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
        displayName: username || fullName || id,
        email: email_addresses[0]?.email_address || '',
        imageUrl: image_url
      }

      logger.info('Updating user in DynamoDB:', { userId: id })
      await dynamoDb.updateUser(id, updates)
      
      return NextResponse.json({
        message: 'User updated in DynamoDB',
        updates
      })
    } catch (error) {
      logger.error('Error updating user in DynamoDB:', error)
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
      
      logger.info('Deleting user from DynamoDB:', { userId: id })
      await dynamoDb.deleteUser(id)
      
      return NextResponse.json({
        message: 'User deleted from DynamoDB'
      })
    } catch (error) {
      logger.error('Error deleting user from DynamoDB:', error)
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

export { handler as POST } 