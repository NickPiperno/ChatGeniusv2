import { useState } from 'react'
import { X, FileIcon, ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { fileConfig } from '@/lib/fileValidation'

interface FilePreviewProps {
  file: File
  onRemove: () => void
  progress?: number
}

export function FilePreview({ file, onRemove, progress }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Generate preview URL for images
  if (file.type.startsWith('image/') && !previewUrl) {
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const isImage = file.type.startsWith('image/')
  const isLoading = typeof progress === 'number' && progress < 100

  return (
    <div className="relative flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
      <div className="flex-shrink-0">
        {isImage ? (
          previewUrl ? (
            <div className="relative w-10 h-10 rounded overflow-hidden">
              <Image
                src={previewUrl}
                alt={file.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <ImageIcon className="w-10 h-10 text-gray-400" />
          )
        ) : (
          <FileIcon className="w-10 h-10 text-gray-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {(file.size / 1024 / 1024).toFixed(2)} MB
          {file.size > fileConfig.MAX_FILE_SIZE && (
            <span className="text-red-500 ml-2">
              Exceeds {fileConfig.MAX_FILE_SIZE / 1024 / 1024}MB limit
            </span>
          )}
        </p>
        {isLoading && (
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}