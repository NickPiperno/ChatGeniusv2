const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Current working directory:', process.cwd());
console.log('Env file path:', envPath);
console.log('File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('\nFile content:');
  console.log(content);
  
  console.log('\nTrying to parse variables...');
  const envVars = content.split('\n').reduce((acc, line) => {
    const match = line.match(/^([^#\s][^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      acc[key.trim()] = value.trim();
      console.log(`Parsed: ${key.trim()} = ${value.trim()}`);
    }
    return acc;
  }, {});

  console.log('\nSetting environment variables...');
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
    console.log(`Set: ${key} = ${value}`);
  });

  console.log('\nVerifying environment variables:');
  console.log({
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID?.substring(0, 5) + '...',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY?.substring(0, 5) + '...',
    DYNAMODB_MESSAGES_TABLE: process.env.DYNAMODB_MESSAGES_TABLE
  });
} 