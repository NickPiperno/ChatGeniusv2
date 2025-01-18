import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { DynamoDBService, convertToMessage } from '@/lib/services/dynamodb'
import { SearchParams, SearchResponse } from '@/types/search'
import { DynamoDBMessage } from '@/types/models/dynamodb'

console.log('[Search API] Initializing DynamoDB service...')
const dynamoDb = DynamoDBService.getInstance()
console.log('[Search API] DynamoDB service initialized')

export async function GET(request: NextRequest) {
  console.log('[Search API] Received search request')
  
  try {
    const session = await getSession()
    console.log('[Search API] Auth check:', { userId: session?.user?.sub, hasUserId: !!session?.user?.sub })
    
    if (!session?.user?.sub) {
      console.log('[Search API] Unauthorized - no userId')
      return new NextResponse('Unauthorized', { status: 401 })
    }
    const userId = session.user.sub

    // Get search parameters from URL
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query')
    const groupId = searchParams.get('groupId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('[Search API] Search parameters:', {
      query,
      groupId,
      limit,
      cursor,
      startDate,
      endDate
    })

    if (!query) {
      console.log('[Search API] Missing required query parameter')
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Execute the search
    console.log('[Search API] Executing search with DynamoDB service')
    const result = await dynamoDb.searchMessages({
      query,
      groupId: groupId || undefined,
      limit,
      cursor: cursor || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })

    console.log('[Search API] Search results:', {
      itemCount: result.items.length,
      totalCount: result.count,
      hasMore: !!result.lastEvaluatedKey
    })

    // Get unique group IDs from the results
    const groupIds = Array.from(new Set(result.items.map(item => item.groupId)))
    
    // Fetch group details in parallel
    const groupDetails = await Promise.all(
      groupIds.map(async (id) => {
        const group = await dynamoDb.getGroupById(id)
        return { id, name: group?.name || 'Unknown Group' }
      })
    )
    
    // Create a map of group IDs to names for quick lookup
    const groupNames = Object.fromEntries(
      groupDetails.map(group => [group.id, group.name])
    )

    // Format the results with group names
    const searchResults = result.items.map(item => {
      const message = convertToMessage(item)
      return {
        message,
        groupId: message.groupId,
        groupName: groupNames[message.groupId] || 'Unknown Group',
        score: 1, // Basic scoring for now
        matches: [{
          field: 'content',
          snippet: message.content
        }]
      }
    })

    const response: SearchResponse = {
      results: searchResults,
      totalResults: result.count,
      ...(result.lastEvaluatedKey && {
        nextCursor: encodeURIComponent(JSON.stringify(result.lastEvaluatedKey))
      })
    }

    console.log('[Search API] Sending response:', {
      resultCount: response.results.length,
      totalResults: response.totalResults,
      hasNextCursor: !!response.nextCursor
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Search API] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        return NextResponse.json(
          { error: 'AWS credentials not configured correctly' },
          { status: 500 }
        )
      }
      if (error.message.includes('network')) {
        return NextResponse.json(
          { error: 'Failed to connect to DynamoDB' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute search' },
      { status: 500 }
    )
  }
} 