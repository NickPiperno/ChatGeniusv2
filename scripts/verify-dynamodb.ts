import { DynamoDBService } from '../lib/services/dynamodb'

async function main() {
  console.log('Starting DynamoDB verification...')
  
  try {
    const dynamoDb = new DynamoDBService()
    await dynamoDb.verifyTables()
    console.log('DynamoDB verification completed successfully')
  } catch (error) {
    console.error('DynamoDB verification failed:', error)
    process.exit(1)
  }
}

main() 