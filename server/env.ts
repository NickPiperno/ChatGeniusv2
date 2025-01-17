import { config } from 'dotenv'
import { z } from 'zod'

// Only try to load .env file in development
if (process.env.NODE_ENV !== 'production') {
  try {
    config()
  } catch (error) {
    console.log('No .env file found in development mode')
  }
}

const envSchema = z.object({
  // App Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url(),
  PORT: z.string().default('3000'),

  // MongoDB Configuration
  MONGODB_URI: z.string(),

  // AWS Configuration
  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),

  // DynamoDB Tables
  DYNAMODB_MESSAGES_TABLE: z.string().default('dev_Messages'),
  DYNAMODB_GROUPS_TABLE: z.string().default('dev_Groups'),
  DYNAMODB_USERS_TABLE: z.string().default('dev_Users'),

  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
})

// Validate environment variables
let validatedEnv
try {
  validatedEnv = envSchema.parse(process.env)
} catch (error) {
  console.error('Environment validation failed:', error)
  throw new Error('Invalid environment configuration')
}

export default validatedEnv 