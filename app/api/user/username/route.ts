import { getSession } from '@auth0/nextjs-auth0'
import { NextResponse } from 'next/server'
import { DynamoDBService } from '@/lib/services/dynamodb'

interface DbUser {
  displayName?: string;
}

const dynamoDb = new DynamoDBService()

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const userId = session.user.sub
    const user = await dynamoDb.getUserById(userId) as DbUser

    return NextResponse.json({
      displayName: user?.displayName || session.user.nickname || null
    })
  } catch (error) {
    console.error('Error in GET /api/user/username:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 