import { Message } from '@/types/models/message'
import { DynamoDBMessage } from '@/types/models/dynamodb'

export function convertToMessage(item: DynamoDBMessage): Message {
  return {
    id: item.id,
    groupId: item.groupId,
    content: item.content,
    userId: item.userId,
    displayName: item.displayName,
    imageUrl: item.imageUrl || '',
    timestamp: item.timestamp,
    reactions: item.reactions || {},
    attachments: item.attachments || [],
    metadata: item.metadata || {},
    replyCount: item.replyCount || 0,
    ...(item.parentId && { parentId: item.parentId }),
    sender: {
      id: item.userId,
      displayName: item.displayName,
      imageUrl: item.imageUrl || ''
    },
    replies: []
  }
} 