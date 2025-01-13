import { NextResponse } from 'next/server'
import { MongoClient, GridFSBucket } from 'mongodb'
import { auth } from '@clerk/nextjs'

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set')
}

const client = new MongoClient(process.env.MONGODB_URI)

export async function POST(request: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new NextResponse('No file provided', { status: 400 })
    }

    await client.connect()
    const db = client.db('chatgenius')
    const bucket = new GridFSBucket(db)

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        userId,
        contentType: file.type,
        size: file.size
      }
    })

    return new Promise<NextResponse>((resolve, reject) => {
      uploadStream.write(buffer, (error: Error | null | undefined) => {
        if (error) {
          console.error('Error uploading file:', error)
          reject(new NextResponse('Failed to upload file', { status: 500 }))
          return
        }

        uploadStream.end(() => {
          resolve(NextResponse.json({
            fileId: uploadStream.id.toString(),
            fileName: file.name
          }))
        })
      })
    })

  } catch (error) {
    console.error('Error in file upload:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  } finally {
    await client.close()
  }
} 