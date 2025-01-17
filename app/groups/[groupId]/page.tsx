import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@auth0/nextjs-auth0'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { Group } from '@/types/models/group'
import { GroupChat, DynamoDBMessage } from '@/types/models/dynamodb'
import { GroupPageClient } from './client'

interface GroupPageProps {
  params: {
    groupId: string
  }
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { groupId } = params
  const dynamoDb = new DynamoDBService()
  
  try {
    const group = await dynamoDb.getGroupById(groupId)
    if (!group) return { title: 'Group Not Found' }
    
    return {
      title: `${group.name} | ChatGenius`,
      description: `Chat with members in ${group.name}`
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return { title: 'ChatGenius' }
  }
}

export default async function GroupPage({ params }: { params: { groupId: string } }) {
  const session = await getSession()
  if (!session?.user) redirect('/api/auth/login')
  const userId = session.user.sub

  const dynamoDb = new DynamoDBService()
  const dbGroup = await dynamoDb.getGroupById(params.groupId)
  if (!dbGroup) redirect('/')

  // Ensure user is a member of the group
  await dynamoDb.ensureUserInGroup(userId, params.groupId)

  // Get messages for the group
  const { messages } = await dynamoDb.getMessagesForGroup(params.groupId)

  // Convert DynamoDB group to Group type
  const group: Group = {
    id: dbGroup.id,
    name: dbGroup.name,
    userId: dbGroup.userId,
    createdAt: dbGroup.createdAt,
    members: dbGroup.members || []
  }

  return <GroupPageClient group={group} messages={messages} userId={userId} />
} 