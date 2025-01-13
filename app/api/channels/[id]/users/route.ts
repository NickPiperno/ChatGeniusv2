import { NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { 
  DynamoDBDocumentClient, 
  GetCommand
} from '@aws-sdk/lib-dynamodb'

let dynamodb: DynamoDBDocumentClient | null = null

function initializeDynamoDB(): DynamoDBDocumentClient {
  if (dynamodb) return dynamodb

  try {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    })
    
    dynamodb = DynamoDBDocumentClient.from(client)
    return dynamodb
  } catch (error) {
    console.error('Failed to initialize DynamoDB client:', error)
    throw error
  }
}

const CHANNELS_TABLE = process.env.DYNAMODB_GROUP_CHATS_TABLE || 'dev_GroupChats'
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'dev_Users'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log('Channel users API called with ID:', params.id);
  
  try {
    const db = initializeDynamoDB()
    
    // First get the channel to get the member list
    const channelResult = await db.send(new GetCommand({
      TableName: CHANNELS_TABLE,
      Key: {
        id: params.id
      }
    }))

    if (!channelResult.Item) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    const members = channelResult.Item.members || []

    // For now, return a basic list of users
    // In a real app, you would fetch user details from your users table
    const users = members.map((userId: string) => ({
      id: userId,
      name: userId === 'system' ? 'System' : `User ${userId}`,
      imageUrl: null
    }))

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching channel users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channel users' },
      { status: 500 }
    )
  }
} 