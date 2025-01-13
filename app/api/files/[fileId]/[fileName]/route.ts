import { MongoClient, GridFSBucket, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local')
}

const uri = process.env.MONGODB_URI as string

export async function GET(
  req: Request,
  { params }: { params: { fileId: string; fileName: string } }
) {
  try {
    logger.debug('File download requested', { fileId: params.fileId, fileName: params.fileName })
    
    // Connect to MongoDB
    const client = await MongoClient.connect(uri)
    const db = client.db('chatgenius')
    
    // First get the file metadata from files collection
    const filesCollection = db.collection('files')
    const fileMetadata = await filesCollection.findOne({ id: params.fileId })
    
    if (!fileMetadata) {
      logger.warn('File metadata not found', { fileId: params.fileId })
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Get GridFS bucket
    const bucket = new GridFSBucket(db, {
      bucketName: 'uploads'
    })

    // Find file by GridFS ID
    const file = await bucket.find({ _id: new ObjectId(fileMetadata.gridFsId) }).next()
    if (!file) {
      logger.warn('GridFS file not found', { gridFsId: fileMetadata.gridFsId })
      return NextResponse.json(
        { error: 'File content not found' },
        { status: 404 }
      )
    }

    // Create download stream
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileMetadata.gridFsId))

    // Convert stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of downloadStream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Close MongoDB connection
    await client.close()
    logger.info('File downloaded successfully', { fileId: params.fileId })

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': fileMetadata.type || 'application/octet-stream',
        'Content-Disposition': fileMetadata.type?.startsWith('image/') || fileMetadata.type === 'application/pdf'
          ? 'inline'  // Display in browser for images and PDFs
          : `attachment; filename="${fileMetadata.name}"`, // Download for other files
      },
    })
  } catch (error) {
    logger.error('Error downloading file:', error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : error)
    
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
} 