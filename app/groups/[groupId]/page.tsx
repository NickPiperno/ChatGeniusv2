import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@auth0/nextjs-auth0'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { Group } from '@/types/models/group'
import { GroupChat, DynamoDBMessage } from '@/types/models/dynamodb'
import { GroupPageClient } from './client'
import { logger } from '@/lib/logger'

interface GroupPageProps {
  params: {
    groupId: string
  }
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { groupId } = params
  
  try {
    const dynamoDb = await DynamoDBService.getInstance()
    const group = await dynamoDb.getGroupById(groupId)
    if (!group) return { title: 'Group Not Found' }
    
    return {
      title: `${group.name.S} | ChatGenius`,
      description: `Chat with members in ${group.name.S}`
    }
  } catch (error) {
    logger.error('Error generating metadata:', error)
    return { title: 'ChatGenius' }
  }
}

export default async function GroupPage({ params }: { params: { groupId: string } }) {
  const session = await getSession()
  if (!session?.user) redirect('/api/auth/login')
  const userId = session.user.sub

  try {
    const dynamoDb = await DynamoDBService.getInstance()
    
    logger.info('Fetching group:', { groupId: params.groupId, userId })
    const dbGroup = await dynamoDb.getGroupById(params.groupId)
    
    if (!dbGroup) {
      logger.error('Group not found:', { groupId: params.groupId })
      return notFound()
    }

    // Ensure user is a member of the group
    logger.info('Ensuring user is member of group:', { groupId: params.groupId, userId })
    const isMember = await dynamoDb.ensureUserInGroup(userId, params.groupId)
    if (!isMember) {
      logger.error('User is not a member of group:', { groupId: params.groupId, userId })
      return notFound()
    }

    // Get messages for the group
    logger.info('Fetching messages for group:', { groupId: params.groupId })
    const messages = await dynamoDb.getMessagesForGroup(params.groupId)

    // Convert DynamoDB group to Group type
    const group: Group = {
      id: dbGroup.groupId.S,
      name: dbGroup.name.S,
      userId: dbGroup.userId.S,
      createdAt: dbGroup.createdAt.S,
      members: dbGroup.members?.SS || []
    }

    return <GroupPageClient group={group} messages={messages} userId={userId} />
  } catch (error) {
    logger.error('Error loading group page:', { 
      error,
      groupId: params.groupId,
      userId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    if (error instanceof Error && error.message.includes('ResourceNotFoundException')) {
      return notFound()
    }
    
    throw error // Let Next.js error boundary handle it
  }
} 