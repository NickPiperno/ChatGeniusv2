// Load environment variables first
import './env'
import { startServer } from './combined-server'
import { logger } from '../lib/logger'

// Start server
startServer().catch(err => {
  logger.error('Failed to start server:', {
    error: err instanceof Error ? err.message : 'Unknown error'
  })
  process.exit(1)
}) 