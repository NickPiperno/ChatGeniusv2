import { NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  DeleteCommand, 
  UpdateCommand 
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

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log('Channel API called with ID:', params.id);
  
  try {
    const db = initializeDynamoDB()
    
    const result = await db.send(new GetCommand({
      TableName: CHANNELS_TABLE,
      Key: {
        id: params.id
      }
    }))

    console.log('DynamoDB result:', result);

    // For custom channels, return the stored data
    if (result.Item && result.Item.name) {
      const response = {
        id: params.id,
        name: result.Item.name,
        isDefault: result.Item.isDefault || false,
        description: result.Item.description
      };
      console.log('Returning channel data:', response);
      return NextResponse.json(response);
    }

    // If no channel is found, return 404
    console.log('Channel not found in DynamoDB');
    return new NextResponse(
      JSON.stringify({ error: 'Channel not found' }),
      { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error fetching channel:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch channel' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log('Deleting channel with ID:', params.id);
  
  try {
    const db = initializeDynamoDB()
    
    // Check if channel exists and is not a default channel
    const result = await db.send(new GetCommand({
      TableName: CHANNELS_TABLE,
      Key: {
        id: params.id
      }
    }));

    if (!result.Item) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    if (result.Item.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default channels' },
        { status: 400 }
      );
    }
    
    await db.send(new DeleteCommand({
      TableName: CHANNELS_TABLE,
      Key: {
        id: params.id
      }
    }))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting channel:', error)
    return NextResponse.json(
      { error: 'Failed to delete channel' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log('Updating channel with ID:', params.id);
  
  try {
    const db = initializeDynamoDB()
    
    // Check if channel exists and is not a default channel
    const getResult = await db.send(new GetCommand({
      TableName: CHANNELS_TABLE,
      Key: {
        id: params.id
      }
    }));

    if (!getResult.Item) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    if (getResult.Item.isDefault) {
      return NextResponse.json(
        { error: 'Cannot modify default channels' },
        { status: 400 }
      );
    }

    const body = await req.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Channel name is required' },
        { status: 400 }
      )
    }
    
    const result = await db.send(new UpdateCommand({
      TableName: CHANNELS_TABLE,
      Key: {
        id: params.id
      },
      UpdateExpression: 'SET #name = :name',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': name
      },
      ReturnValues: 'ALL_NEW'
    }))

    return NextResponse.json({
      id: params.id,
      name: result.Attributes?.name,
      isDefault: result.Attributes?.isDefault || false,
      description: result.Attributes?.description
    })
  } catch (error) {
    console.error('Error updating channel:', error)
    return NextResponse.json(
      { error: 'Failed to update channel' },
      { status: 500 }
    )
  }
} 