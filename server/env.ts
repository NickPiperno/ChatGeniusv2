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

// Helper function to validate URL or deployment platform variables
function isValidUrlOrPlatformVar(url: string) {
  // Check for platform-specific URL variables
  if (url.includes('${RAILWAY') || url.includes('${VERCEL')) return true
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const envSchema = z.object({
  // App Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().refine((url) => isValidUrlOrPlatformVar(url), {
    message: "NEXT_PUBLIC_API_URL must be a valid URL or platform variable (e.g., https://${VERCEL_URL} for Vercel or https://${RAILWAY_STATIC_URL} for Railway)"
  }),
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
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/')
})

// Validate environment variables
let validatedEnv
try {
  validatedEnv = envSchema.parse(process.env)
} catch (error) {
  console.error('Environment validation failed. Details:')
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      console.error(`- ${err.path.join('.')}: ${err.message}`)
    })
  } else {
    console.error(error)
  }
  throw new Error('Invalid environment configuration')
}

export default validatedEnv 