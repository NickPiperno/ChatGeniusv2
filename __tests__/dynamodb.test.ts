import { DynamoDBService } from '@/lib/services/dynamodb'
import { Message } from '@/types/models/message'
import { User } from '@/types/models/user'
import { GroupChat } from '@/types/models/dynamodb'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  UpdateCommand,
  DeleteCommand,
  PutCommandOutput,
  GetCommandOutput,
  QueryCommandOutput,
  UpdateCommandOutput
} from '@aws-sdk/lib-dynamodb'

// Mock AWS SDK v3
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    config: {}
  }))
}))

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = jest.fn().mockImplementation(() => Promise.resolve({
    $metadata: { requestId: '1', attempts: 1 }
  }))

  return {
    DynamoDBDocumentClient: {
      from: jest.fn().mockImplementation(() => ({
        send: mockSend
      }))
    },
    PutCommand: jest.fn().mockImplementation((args) => ({ ...args, type: 'Put' })),
    GetCommand: jest.fn().mockImplementation((args) => ({ ...args, type: 'Get' })),
    QueryCommand: jest.fn().mockImplementation((args) => ({ ...args, type: 'Query' })),
    UpdateCommand: jest.fn().mockImplementation((args) => ({ ...args, type: 'Update' })),
    DeleteCommand: jest.fn().mockImplementation((args) => ({ ...args, type: 'Delete' }))
  }
})

describe('DynamoDBService', () => {
  let service: DynamoDBService
  let mockMessage: Message
  let mockGroup: GroupChat
  let mockUser: User
  let dynamodb: DynamoDBDocumentClient
  let mockSend: jest.SpyInstance

  beforeEach(() => {
    service = new DynamoDBService()
    dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    mockSend = jest.spyOn(dynamodb, 'send')
    
    mockMessage = {
      id: 'test-message',
      groupId: 'test-group',
      content: 'Hello, World!',
      userId: 'test-user',
      displayName: 'Test User',
      imageUrl: '',
      timestamp: new Date().toISOString(),
      reactions: {},
      attachments: [],
      metadata: {},
      replyCount: 0,
      sender: {
        id: 'test-user',
        displayName: 'Test User',
        imageUrl: ''
      },
      replies: []
    }

    mockGroup = {
      id: 'group1',
      name: 'Test Group',
      userId: 'user1',
      members: ['user1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        description: 'Test description',
        type: 'group',
        isPrivate: false
      }
    }

    mockUser = {
      id: 'test-user',
      email: 'test@example.com',
      displayName: 'Test User',
      metadata: {}
    }
  })

  describe('Messages', () => {
    test('createMessage should create a message', async () => {
      mockSend.mockResolvedValueOnce({
        $metadata: { requestId: '1', attempts: 1 }
      })
      const result = await service.createMessage(mockMessage)
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutCommand))
      expect(result).toEqual(mockMessage)
    })

    test('getMessagesByGroup should return messages for a group', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [mockMessage],
        $metadata: { requestId: '1', attempts: 1 }
      })
      const result = await service.getMessagesByGroup('group1')
      expect(mockSend).toHaveBeenCalledWith(expect.any(QueryCommand))
      expect(result).toEqual([mockMessage])
    })
  })

  describe('GroupChats', () => {
    test('createGroupChat should create a group chat', async () => {
      mockSend.mockResolvedValueOnce({
        $metadata: { requestId: '1', attempts: 1 }
      })
      const result = await service.createGroupChat(mockGroup)
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutCommand))
      expect(result).toEqual(mockGroup)
    })

    test('getGroupById should return a group chat', async () => {
      mockSend.mockResolvedValueOnce({
        Item: mockGroup,
        $metadata: { requestId: '1', attempts: 1 }
      })
      const result = await service.getGroupById('group1')
      expect(mockSend).toHaveBeenCalledWith(expect.any(GetCommand))
      expect(result).toEqual(mockGroup)
    })

    test('deleteGroup should delete a group chat', async () => {
      // Mock successful group fetch
      mockSend.mockResolvedValueOnce({
        Item: mockGroup,
        $metadata: { requestId: '1', attempts: 1 }
      })
      // Mock successful message fetch
      mockSend.mockResolvedValueOnce({
        Items: [],
        $metadata: { requestId: '1', attempts: 1 }
      })
      // Mock successful group deletion
      mockSend.mockResolvedValueOnce({
        $metadata: { requestId: '1', attempts: 1 }
      })

      await service.deleteGroup('group1')
      expect(mockSend).toHaveBeenCalledWith(expect.any(GetCommand))
      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteCommand))
    })
  })

  describe('Error Handling', () => {
    test('should handle DynamoDB errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
      await expect(service.createMessage(mockMessage)).rejects.toThrow('Database operation failed')
    })
  })
}) 