FROM node:18-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Set default environment variables
ENV NODE_ENV=production \
    NEXT_PUBLIC_API_URL=http://localhost:3000 \
    AWS_REGION=us-east-2 \
    AWS_ACCESS_KEY_ID=dummy-key \
    AWS_SECRET_ACCESS_KEY=dummy-secret \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=dummy-key \
    CLERK_SECRET_KEY=dummy-secret \
    MONGODB_URI=mongodb://localhost:27017/chatgenius

# Build the application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the combined server
CMD ["npm", "start"] 