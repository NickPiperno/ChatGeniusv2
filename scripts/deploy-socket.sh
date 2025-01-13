#!/bin/bash

# Install Node.js 18.x if not already installed
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Build the project
npm run build

# Start the socket server with PM2
pm2 delete socket-server 2>/dev/null || true
pm2 start server/socket-server.ts --name socket-server --interpreter ./node_modules/.bin/ts-node

# Save PM2 process list and set to start on system startup
pm2 save
sudo pm2 startup 