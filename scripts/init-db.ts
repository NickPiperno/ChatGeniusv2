import { DynamoDBService } from '../lib/services/dynamodb'
import { v4 as uuidv4 } from 'uuid'

const dynamoService = new DynamoDBService()

async function initializeDefaultChannels() {
  console.log('Initializing default channels...')

  const now = new Date().toISOString()

  const defaultChannels = [
    {
      id: uuidv4(),
      name: 'general',
      description: 'General discussion channel for all team members',
      type: 'group',
      creatorId: 'system',
      members: ['system'],
      createdAt: now,
      updatedAt: now,
      isPrivate: false,
      metadata: {
        isDefault: true
      }
    },
    {
      id: uuidv4(),
      name: 'random',
      description: 'Channel for random discussions and fun conversations',
      type: 'group',
      creatorId: 'system',
      members: ['system'],
      createdAt: now,
      updatedAt: now,
      isPrivate: false,
      metadata: {
        isDefault: true
      }
    },
    {
      id: uuidv4(),
      name: 'introductions',
      description: 'Introduce yourself to the team!',
      type: 'group',
      creatorId: 'system',
      members: ['system'],
      createdAt: now,
      updatedAt: now,
      isPrivate: false,
      metadata: {
        isDefault: true
      }
    }
  ]

  try {
    for (const channel of defaultChannels) {
      await dynamoService.createGroupChat(channel)
      console.log(`Created channel: ${channel.name}`)
    }
    console.log('Successfully initialized default channels!')
  } catch (error) {
    console.error('Error initializing channels:', error)
  }
}

// Run the initialization
initializeDefaultChannels() 