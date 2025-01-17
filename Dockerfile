FROM node:18-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Set production mode and build-time environment variables
ENV NODE_ENV=production \
    NEXT_PUBLIC_API_URL=https://localhost:3000 \
    AWS_REGION=us-east-2 \
    AWS_ACCESS_KEY_ID=dummy-build-key \
    AWS_SECRET_ACCESS_KEY=dummy-build-secret \
    MONGODB_URI=mongodb://dummy-build-uri \
    DYNAMODB_MESSAGES_TABLE=dev_Messages \
    DYNAMODB_GROUP_CHATS_TABLE=dev_Groups \
    DYNAMODB_USERS_TABLE=dev_Users \
    AUTH0_SECRET=dummy-secret \
    AUTH0_BASE_URL=https://localhost:3000 \
    AUTH0_ISSUER_BASE_URL=https://dummy.auth0.com \
    AUTH0_CLIENT_ID=dummy-client-id \
    AUTH0_CLIENT_SECRET=dummy-client-secret

# Build the application
RUN npm run build

# Remove build-time credentials
ENV AWS_ACCESS_KEY_ID= \
    AWS_SECRET_ACCESS_KEY= \
    AUTH0_CLIENT_SECRET= \
    AUTH0_SECRET= \
    MONGODB_URI=

# Expose port 3000
EXPOSE 3000

# Start the combined server
CMD ["npm", "start"] 