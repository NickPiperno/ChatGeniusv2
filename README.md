# ChatGenius

A real-time chat application built with Next.js, DynamoDB, and Auth0 Authentication.

## Setup

1. Clone the repository
```bash
git clone <your-repo-url>
cd ChatGenius
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```
Edit `.env.local` with your actual values.

4. Set up AWS credentials
- Configure AWS CLI or
- Add credentials to `.env.local`

5. Set up Terraform (Optional for local development)
```bash
cd terraform
cp provider.tf.example provider.tf
```
Edit `provider.tf` with your AWS configuration.

6. Initialize and apply Terraform (Optional)
```bash
terraform init
terraform plan
terraform apply
```

7. Run the development server
```bash
npm run dev
```

## Deployment to AWS Amplify

1. Push your code to GitHub
2. Set up AWS Amplify:
   - Connect your GitHub repository
   - Configure build settings
   - Add environment variables
   - Set up IAM permissions for DynamoDB

3. Required environment variables in Amplify Console:
   - AWS configuration
   - Auth0 authentication
   - DynamoDB table names
   - Node environment

## Features

- Real-time messaging
- Group chats
- File sharing
- User presence
- Message reactions
- Thread discussions
- Typing indicators
- User authentication via Auth0
- DynamoDB for data storage

## Security Notes

- Never commit `.env` files
- Never commit AWS credentials
- Use IAM roles and policies in production
- Keep Auth0 secrets secure

## License

[Your chosen license] 