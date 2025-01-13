import { NextResponse } from 'next/server'
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { auth } from '@clerk/nextjs'
import { validateFile, sanitizeFileName, getFileType } from '@/lib/fileValidation'
import { logger } from '@/lib/logger'

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local')
}

const uri = process.env.MONGODB_URI as string

export async function POST(request: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    logger.info('Starting file upload process', { userId })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const groupId = formData.get('groupId') as string
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    logger.debug('File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      groupId
    })

    try {
      validateFile(file)
    } catch (error) {
      const err = error as Error
      logger.warn('File validation failed:', { message: err.message })
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      )
    }

    // Create a unique ID for the file
    const fileId = uuidv4()
    
    logger.debug('Attempting MongoDB connection')
    
    // Connect to MongoDB
    const client = await MongoClient.connect(uri)
    logger.info('MongoDB connected successfully')
    
    const db = client.db('chatgenius')
    const bucket = new GridFSBucket(db, {
      bucketName: 'uploads'
    })

    // Sanitize filename
    const sanitizedName = sanitizeFileName(file.name)
    const fileName = `${fileId}-${sanitizedName}`

    logger.debug('Converting file to buffer')
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    logger.debug('Starting GridFS upload')
    // Upload to GridFS
    const uploadStream = bucket.openUploadStream(fileName, {
      metadata: {
        originalName: file.name,
        type: file.type,
        size: file.size,
        userId,
        groupId,
        uploadedAt: new Date()
      }
    })

    // Upload file and get the file ID
    const gridFsId = await new Promise<string>((resolve, reject) => {
      uploadStream.write(buffer, (error) => {
        if (error) {
          logger.error('Error writing to GridFS:', error)
          reject(error)
          return
        }
        uploadStream.end(() => {
          logger.info('File uploaded to GridFS successfully')
          resolve(uploadStream.id.toString())
        })
      })
    })

    logger.debug('Storing file metadata')
    // Store file metadata in MongoDB files collection
    const filesCollection = db.collection('files')
    await filesCollection.insertOne({
      id: fileId,
      name: sanitizedName,
      type: file.type,
      size: file.size,
      url: `/api/files/${fileId}/${sanitizedName}`,
      userId,
      groupId,
      gridFsId,
      uploadedAt: new Date()
    })

    // Close the MongoDB connection
    await client.close()
    logger.info('MongoDB connection closed')
    
    // Return the file metadata
    return NextResponse.json([{
      id: fileId,
      name: sanitizedName,
      url: `/api/files/${fileId}/${sanitizedName}`,
      type: getFileType(file.type)
    }])
  } catch (error) {
    logger.error('Error in file upload:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error uploading file' },
      { status: 500 }
    )
  }
} 