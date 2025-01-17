import { NextRequest, NextResponse } from 'next/server'
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb'
import { getSession } from '@auth0/nextjs-auth0'
import { logger } from '@/lib/logger'

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set')
}

let cachedClient: MongoClient | null = null

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient
  }

  const client = new MongoClient(process.env.MONGODB_URI!)
  await client.connect()
  cachedClient = client
  return client
}

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string; fileName: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user?.sub) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const userId = session.user.sub
    logger.debug('File download requested', { fileId: params.fileId, fileName: params.fileName })

    const client = await connectToDatabase()
    const db = client.db('chatgenius')
    const filesCollection = db.collection('files')
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' })

    // Find the file metadata
    const file = await filesCollection.findOne({ id: params.fileId })
    
    if (!file) {
      logger.warn('File not found', { fileId: params.fileId })
      return new NextResponse('File not found', { status: 404 })
    }

    // Check if user has access to this file
    if (file.userId !== userId) {
      logger.warn('Unauthorized file access attempt', { fileId: params.fileId, userId })
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Stream the file from GridFS
    const chunks: Buffer[] = []
    const downloadStream = bucket.openDownloadStream(new ObjectId(file.gridFsId))

    await new Promise((resolve, reject) => {
      downloadStream.on('data', chunk => chunks.push(chunk))
      downloadStream.on('error', error => {
        logger.error('Error streaming file', { error, fileId: params.fileId })
        reject(error)
      })
      downloadStream.on('end', resolve)
    })

    const buffer = Buffer.concat(chunks)
    
    logger.info('File downloaded successfully', { 
      fileId: params.fileId,
      fileName: params.fileName,
      size: buffer.length 
    })

    // Return the file with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${file.name}"`,
        'Cache-Control': 'public, max-age=31536000'
      }
    })

  } catch (error) {
    logger.error('Error in file download:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)

    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error',
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs' 