import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs'
import { DynamoDBService } from '@/lib/services/dynamodb'
import { Group } from '@/types/models/group'
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

export default async function GroupPage({ params }: GroupPageProps) {
  const { userId } = auth()
  if (!userId) return notFound()

  const { groupId } = params
  const dynamoDb = new DynamoDBService()

  try {
    const dbGroup = await dynamoDb.getGroupById(groupId)
    if (!dbGroup) return notFound()

    const messages = await dynamoDb.getMessagesByGroup(groupId)

    // Ensure all required group properties are present
    const group: Group = {
      ...dbGroup,
      type: 'group',
      isPrivate: false
    }

    return <GroupPageClient group={group} messages={messages} userId={userId} />
  } catch (error) {
    console.error('Error loading group:', error)
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-gray-500">Failed to load group chat.</p>
      </div>
    )
  }
} 