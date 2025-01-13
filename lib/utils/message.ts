import { Message } from '@/types/models/message'
import { DynamoDBMessage } from '@/types/models/dynamodb'

export function convertToMessage(item: DynamoDBMessage): Message {
  return {
    id: item.id,
    groupId: item.groupId,
    content: item.content,
    senderId: item.senderId,
    senderName: item.senderName,
    senderImageUrl: item.senderImageUrl,
    timestamp: item.timestamp,
    reactions: item.reactions || {},
    attachments: item.attachments || [],
    metadata: item.metadata || {},
    replyCount: item.replyCount || 0,
    ...(item.parentId && { parentId: item.parentId }),
    sender: {
      id: item.senderId,
      name: item.senderName,
      imageUrl: item.senderImageUrl || ''
    },
    replies: []
  }
} 