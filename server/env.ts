import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables immediately
const envPath = resolve(process.cwd(), '.env')
const result = dotenv.config({ path: envPath })

if (result.error) {
  console.error('Error loading .env file:', result.error)
  process.exit(1)
}

// Verify required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'DYNAMODB_MESSAGES_TABLE',
  'DYNAMODB_GROUPS_TABLE'
]

let missingVars = false
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Required environment variable ${varName} is not defined`)
    missingVars = true
  }
})

if (missingVars) {
  process.exit(1)
}

// Export environment variables for type safety
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  AWS_REGION: process.env.AWS_REGION!,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
  DYNAMODB_MESSAGES_TABLE: process.env.DYNAMODB_MESSAGES_TABLE!,
  DYNAMODB_GROUPS_TABLE: process.env.DYNAMODB_GROUPS_TABLE!,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!
} as const 