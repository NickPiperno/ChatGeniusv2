require('dotenv').config({ path: '.env.local' });
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  PutCommand, 
  ScanCommand,
  DeleteCommand,
  GetCommand 
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Verify credentials are loaded
console.log('AWS Region:', process.env.AWS_REGION);
console.log('AWS Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? '****' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'not set');
console.log('AWS Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY ? '****' : 'not set');

// Configure AWS Client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const dynamodb = DynamoDBDocumentClient.from(client);

const TableNames = {
  GroupChats: process.env.DYNAMODB_GROUPS_TABLE || 'dev_GroupChats',
};

async function deleteChannel(id) {
  try {
    await dynamodb.send(new DeleteCommand({
      TableName: TableNames.GroupChats,
      Key: { id }
    }));
    console.log(`Deleted channel with id: ${id}`);
  } catch (error) {
    console.error(`Error deleting channel ${id}:`, error);
  }
}

async function cleanupTestChannels() {
  console.log('Cleaning up test channels...');
  const channels = await listExistingChannels();
  
  for (const channel of channels) {
    // Delete channels that are:
    // - not default channels
    // - have test-like names
    // - old default channels (Channel 1, Channel 2)
    if (!channel.isDefault || 
        channel.name === 'hello' || 
        channel.name === 'Channel 1' || 
        channel.name === 'Channel 2' ||
        channel.name.toLowerCase().includes('channel')) {
      await deleteChannel(channel.id);
    }
  }
}

async function listExistingChannels() {
  try {
    const result = await dynamodb.send(new ScanCommand({
      TableName: TableNames.GroupChats
    }));
    console.log('Existing channels:', result.Items);
    return result.Items || [];
  } catch (error) {
    console.error('Error listing channels:', error);
    return [];
  }
}

async function createGroupChat(group) {
  console.log('Creating channel:', group);
  try {
    await dynamodb.send(new PutCommand({
      TableName: TableNames.GroupChats,
      Item: group
    }));
    
    // Verify the channel was created
    const result = await dynamodb.send(new GetCommand({
      TableName: TableNames.GroupChats,
      Key: {
        id: group.id
      }
    }));
    
    console.log('Verified channel in DynamoDB:', result.Item);
    return group;
  } catch (error) {
    console.error('Error creating channel:', error);
    throw error;
  }
}

async function initializeDefaultChannels() {
  console.log('Initializing default channels...');
  console.log('Using table:', TableNames.GroupChats);

  // Clean up test channels first
  await cleanupTestChannels();

  // First, list existing channels
  const existingChannels = await listExistingChannels();
  console.log('Found existing channels:', existingChannels.length);

  const defaultChannels = [
    {
      id: uuidv4(),
      name: 'general',
      description: 'General discussion channel for all team members',
      isDefault: true,
      createdAt: Date.now(),
      createdBy: 'system',
      members: ['system'],
      memberCount: 0,
      type: 'group'
    },
    {
      id: uuidv4(),
      name: 'random',
      description: 'Channel for random discussions and fun conversations',
      isDefault: true,
      createdAt: Date.now(),
      createdBy: 'system',
      members: ['system'],
      memberCount: 0,
      type: 'group'
    },
    {
      id: uuidv4(),
      name: 'introductions',
      description: 'Introduce yourself to the team!',
      isDefault: true,
      createdAt: Date.now(),
      createdBy: 'system',
      members: ['system'],
      memberCount: 0,
      type: 'group'
    }
  ];

  try {
    for (const channel of defaultChannels) {
      // Check if channel with same name already exists
      const exists = existingChannels.some(ch => ch.name === channel.name);
      if (!exists) {
        await createGroupChat(channel);
        console.log(`Created channel: ${channel.name}`);
      } else {
        console.log(`Channel ${channel.name} already exists, skipping...`);
      }
    }
    console.log('Successfully initialized default channels!');
    
    // List final state
    const finalChannels = await listExistingChannels();
    console.log('Final channels in database:', finalChannels);
  } catch (error) {
    console.error('Error initializing channels:', error);
  }
}

// Run the initialization
initializeDefaultChannels(); 