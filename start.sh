#!/bin/sh

# Wait for environment variables to be set
until [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ] && [ -n "$AWS_REGION" ]; do
  echo "Waiting for AWS credentials..."
  sleep 2
done

echo "Starting services with AWS region: $AWS_REGION"

# Start the Socket server in the background
node dist/server/socket-server.js &
SOCKET_PID=$!

# Start the Next.js application
node server.js &
NEXT_PID=$!

# Handle shutdown
trap 'kill $SOCKET_PID $NEXT_PID' SIGTERM
trap 'kill $SOCKET_PID $NEXT_PID' SIGINT

# Keep the script running
wait 