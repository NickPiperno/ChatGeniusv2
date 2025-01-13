import { MongoClient, ObjectId, GridFSBucket } from 'mongodb'
import type { GridFSFile as MongoGridFSFile } from 'mongodb'

// MongoDB Connection
if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local')
}

const uri = process.env.MONGODB_URI
const options = {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 2000,
  socketTimeoutMS: 30000,
  compressors: ["zlib"] as ["zlib"],
  zlibCompressionLevel: 6 as 6
}

// Global is used here to maintain a cached connection across hot reloads
let cached = global as typeof globalThis & {
  mongoClient?: MongoClient
  clientPromise?: Promise<MongoClient>
}

if (!cached.clientPromise) {
  cached.mongoClient = new MongoClient(uri, options)
  cached.clientPromise = cached.mongoClient.connect()
}

const clientPromise = cached.clientPromise!

// File Storage Operations
export const mongodb = {
  async uploadFile(file: Buffer, filename: string, metadata: {
    userId: string;
    groupId: string;
    originalName: string;
    type: string;
    size: number;
  }) {
    const client = await clientPromise
    const bucket = new GridFSBucket(client.db('chatgenius'), {
      bucketName: 'uploads'
    })

    return new Promise<string>((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
        metadata
      })

      uploadStream.write(file, (error) => {
        if (error) {
          reject(error)
          return
        }
        uploadStream.end(() => {
          resolve(uploadStream.id.toString())
        })
      })
    })
  },

  async getFile(fileId: string): Promise<MongoGridFSFile | null> {
    const client = await clientPromise
    const bucket = new GridFSBucket(client.db('chatgenius'), {
      bucketName: 'uploads'
    })

    try {
      return await bucket.find({ _id: new ObjectId(fileId) }).next()
    } catch (error) {
      console.error('Error getting file:', error)
      return null
    }
  },

  async downloadFile(fileId: string): Promise<Buffer> {
    const client = await clientPromise
    const bucket = new GridFSBucket(client.db('chatgenius'), {
      bucketName: 'uploads'
    })

    const chunks: Buffer[] = []
    return new Promise((resolve, reject) => {
      const downloadStream = bucket.openDownloadStream(new ObjectId(fileId))
      
      downloadStream.on('data', (chunk) => chunks.push(chunk))
      downloadStream.on('error', reject)
      downloadStream.on('end', () => resolve(Buffer.concat(chunks)))
    })
  },

  async deleteFile(fileId: string): Promise<boolean> {
    const client = await clientPromise
    const bucket = new GridFSBucket(client.db('chatgenius'), {
      bucketName: 'uploads'
    })

    try {
      await bucket.delete(new ObjectId(fileId))
      return true
    } catch (error) {
      console.error('Error deleting file:', error)
      return false
    }
  }
} 