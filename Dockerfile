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
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=dummy-build-key \
    CLERK_SECRET_KEY=dummy-build-secret \
    MONGODB_URI=mongodb://dummy-build-uri \
    DYNAMODB_MESSAGES_TABLE=dev_Messages \
    DYNAMODB_GROUPS_TABLE=dev_Groups \
    DYNAMODB_USERS_TABLE=dev_Users \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/ \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Build the application
RUN npm run build

# Remove build-time credentials
ENV AWS_ACCESS_KEY_ID= \
    AWS_SECRET_ACCESS_KEY= \
    CLERK_SECRET_KEY= \
    MONGODB_URI=

# Expose port 3000
EXPOSE 3000

# Start the combined server
CMD ["npm", "start"] 