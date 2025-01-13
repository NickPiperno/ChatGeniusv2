# Architecture Overview

## Data Storage

### Primary Database
- Messages and chat data
- User profiles and settings
- Group chat information
- File metadata references

### File Storage
- Handles file uploads and downloads
- Stores file metadata and content
- Manages file streaming and retrieval

## File Handling Flow

1. Upload Process:
   - Client initiates upload
   - File is processed and stored
   - System generates file ID and metadata
   - References stored in primary database

2. Download Process:
   - Client requests file by ID
   - System validates access permissions
   - File is streamed to client

## Data Models

### File Reference
```typescript
interface FileReference {
  id: string        // Unique identifier
  name: string      // Original filename
  type: string      // MIME type
  size: number      // File size in bytes
  url: string       // Access URL
  metadata: {       // Additional metadata
    uploadedBy: string
    uploadedAt: Date
    // ... other metadata
  }
}
```

## API Endpoints

### File Operations
- `/api/upload` - Handles file uploads
- `/api/files/[fileId]` - Streams files
- `/api/files/metadata/[fileId]` - Retrieves file metadata 