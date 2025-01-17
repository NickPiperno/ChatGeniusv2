import { DynamoDBService } from '../lib/services/dynamodb'

async function main(): Promise<void> {
  console.log('Starting group update script')
  const dynamoDb = new DynamoDBService()
  
  try {
    await dynamoDb.updateAllGroupsWithAllUsers()
    console.log('Successfully updated all groups')
  } catch (error) {
    console.error('Error updating groups:', error)
    process.exit(1)
  }
}

main() 