export default async function globalSetup() {
  console.log('\nSetting up test environment...')
  
  // Return a cleanup function
  return async () => {
    console.log('\nCleaning up test environment...')
  }
} 