import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    // Check DynamoDB connection
    const dynamoHealth = await checkDynamoDBHealth()
    
    // Get socket server stats
    const socketStats = getSocketStats()

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        http: {
          status: 'healthy'
        },
        websocket: {
          status: socketStats.connected ? 'healthy' : 'unhealthy',
          connections: socketStats.connections,
          rooms: socketStats.rooms
        },
        dynamodb: {
          status: dynamoHealth.healthy ? 'healthy' : 'unhealthy',
          latency: dynamoHealth.latency
        }
      },
      version: process.env.NEXT_PUBLIC_VERSION || '0.0.0',
      environment: process.env.NODE_ENV
    }

    logger.info('Health check', health)

    return NextResponse.json(health)
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 500 })
  }
}

async function checkDynamoDBHealth() {
  try {
    const start = Date.now()
    // Add a simple DynamoDB operation here
    // For now, just return healthy
    const latency = Date.now() - start
    return { healthy: true, latency }
  } catch (error) {
    logger.error('DynamoDB health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return { healthy: false, latency: 0 }
  }
}

function getSocketStats() {
  try {
    // This will be populated by the socket server
    const globalStats = (global as any).__socketStats || {
      connected: false,
      connections: 0,
      rooms: 0
    }
    return globalStats
  } catch (error) {
    logger.error('Failed to get socket stats', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      connected: false,
      connections: 0,
      rooms: 0
    }
  }
} 