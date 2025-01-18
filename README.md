# ChatGenius

ChatGenius is a modern web application built with Next.js 14, featuring a sleek user interface and robust authentication system. It provides a platform for real-time chat interactions with an intuitive user experience.

## Features

- 🔐 Secure authentication with Clerk
- 💻 Modern UI built with Radix UI components
- 🎨 Customizable themes with next-themes
- 🔄 State management using Zustand
- 📱 Responsive design
- 🔍 Real-time search functionality
- 👤 User profiles and customization
- 💬 Real-time messaging with WebSocket
- 🔔 Push notifications
- 📎 File sharing and previews

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Databases**: 
  - DynamoDB (Messages, Groups, User Status)
  - MongoDB GridFS (File Storage)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (based on Radix UI)
- **State Management**: Zustand
- **Form Handling**: React Hook Form with Zod validation
- **Real-time**: WebSocket
- **Infrastructure**: AWS (DynamoDB), MongoDB Atlas

## Project Structure

```
ChatGenius/
├── app/                      # Next.js 14 App Router pages
│   ├── api/                  # API routes
│   ├── groups/              # Group chat pages
│   ├── dm/                  # Direct messaging pages
│   ├── settings/            # User settings pages
│   ├── sign-in/            # Authentication pages
│   └── sign-up/            # Registration pages
├── components/              # React components
│   ├── chat/               # Chat-related components
│   ├── dialogs/            # Modal dialogs and popups
│   ├── integrations/       # Third-party integration components
│   ├── settings/           # Settings-related components
│   ├── ui/                 # Reusable UI components
│   └── user/               # User-related components
├── hooks/                   # Custom React hooks
│   ├── data/               # Data fetching hooks
│   ├── realtime/           # WebSocket and real-time hooks
│   └── ui/                 # UI-related hooks
├── lib/                     # Utility functions and services
│   ├── services/           # Backend services
│   ├── store/              # Zustand store definitions
│   └── utils.ts            # Utility functions
├── public/                 # Static assets
├── styles/                 # Global styles
├── terraform/              # Infrastructure as Code
├── types/                  # TypeScript type definitions
│   ├── api/                # API-related types
│   ├── events/             # WebSocket event types
│   └── models/             # Data model types
└── docs/                   # Documentation files
```

## Key Directories and Files

- **/app**: Next.js App Router pages and API routes
  - Uses the new Next.js 14 App Router for server components
  - API routes for backend functionality
  - Layout components for consistent UI structure

- **/components**: Reusable React components
  - Organized by feature and functionality
  - Uses Shadcn UI components with Tailwind CSS
  - Implements atomic design principles

- **/hooks**: Custom React hooks
  - Data fetching and caching logic
  - Real-time WebSocket connections
  - UI state management

- **/lib**: Core utilities and services
  - Backend service integrations
  - State management stores
  - Helper functions and utilities

- **/types**: TypeScript type definitions
  - Comprehensive type coverage
  - Organized by domain (API, events, models)
  - Shared interfaces and types

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- AWS Account (for DynamoDB)
- MongoDB Atlas Account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourdisplayname/ChatGenius.git
cd ChatGenius
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory and add the necessary environment variables:
```env
# AWS Configuration
AWS_REGION=<YOUR_AWS_REGION>
AWS_ACCESS_KEY_ID=<YOUR_AWS_ACCESS_KEY>
AWS_SECRET_ACCESS_KEY=<YOUR_AWS_SECRET_KEY>

# MongoDB Configuration
MONGODB_URI=<YOUR_MONGODB_URI>

# DynamoDB Tables
DYNAMODB_MESSAGES_TABLE=<YOUR_MESSAGES_TABLE>
DYNAMODB_GROUP_CHATS_TABLE=<YOUR_GROUP_CHATS_TABLE>
DYNAMODB_FILE_METADATA_TABLE=<YOUR_FILE_METADATA_TABLE>
DYNAMODB_USERS_TABLE=<YOUR_USERS_TABLE>
DYNAMODB_NOTIFICATIONS_TABLE=<YOUR_NOTIFICATIONS_TABLE>
DYNAMODB_USER_STATUS_TABLE=<YOUR_USER_STATUS_TABLE>
DYNAMODB_TYPING_INDICATORS_TABLE=<YOUR_TYPING_INDICATORS_TABLE>
DYNAMODB_REACTIONS_TABLE=<YOUR_REACTIONS_TABLE>
DYNAMODB_PINNED_MESSAGES_TABLE=<YOUR_PINNED_MESSAGES_TABLE>
DYNAMODB_MENTIONS_TABLE=<YOUR_MENTIONS_TABLE>

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<YOUR_CLERK_PUBLISHABLE_KEY>
CLERK_SECRET_KEY=<YOUR_CLERK_SECRET_KEY>

# API and Socket Configuration
NEXT_PUBLIC_API_URL=<YOUR_API_URL>      # Your Next.js API server URL
NEXT_PUBLIC_SOCKET_URL=<YOUR_SOCKET_URL> # Your WebSocket server URL
```

4. Start the servers:
```bash
# Start both Next.js and Socket.IO servers
npm run dev
```

The application will be available at the URL specified in `NEXT_PUBLIC_API_URL`.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 