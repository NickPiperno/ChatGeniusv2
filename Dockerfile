# Build stage
FROM node:18-alpine AS builder

# Install dependencies needed for node-gyp and other build tools
RUN apk add --no-cache python3 make g++ libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Add dummy credentials for build time only
ENV AWS_ACCESS_KEY_ID=dummy-key
ENV AWS_SECRET_ACCESS_KEY=dummy-secret
ENV AWS_REGION=us-east-1
ENV NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
ENV MONGODB_URI=mongodb://dummy:dummy@localhost:27017/dummy

# Build Next.js application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

# Install production dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./
COPY --from=builder --chown=nextjs:nodejs /app/app ./app
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/types ./types

# Install production dependencies
RUN npm ci --only=production

# Switch to non-root user
USER nextjs

# Expose both Next.js and Socket ports
EXPOSE 3000
EXPOSE 3001

# Create start script
COPY --chown=nextjs:nodejs start.sh ./
RUN chmod +x start.sh

# Start both Next.js and Socket server
CMD ["./start.sh"] 