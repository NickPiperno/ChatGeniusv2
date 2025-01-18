const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function validateFile(file: File) {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('File type not allowed')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit')
  }

  return true
}

export function sanitizeFileName(fileName: string): string {
  // Remove any path components from the filename
  const name = fileName.replace(/^.*[\\\/]/, '')
  
  // Remove any non-alphanumeric characters except for dots, dashes, and underscores
  return name.replace(/[^a-zA-Z0-9.-_]/g, '_')
}

export function getFileType(mimeType: string): 'image' | 'document' {
  return mimeType.startsWith('image/') ? 'image' : 'document'
}

export const fileConfig = {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE
} 