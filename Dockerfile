FROM node:18-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Set production mode
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the combined server
CMD ["npm", "start"] 