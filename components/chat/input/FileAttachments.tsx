'use client'

import { Button } from '@/components/ui/button'
import { X, Paperclip } from 'lucide-react'

interface FileAttachmentsProps {
  files: File[]
  onRemove: (index: number) => void
}

export function FileAttachments({ files, onRemove }: FileAttachmentsProps) {
  if (files.length === 0) return null

  return (
    <div className="mt-2 space-y-2 mb-4">
      {files.map((file, index) => (
        <div 
          key={index} 
          className="flex items-center gap-2 p-2 rounded-md border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{file.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onRemove(index)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove file</span>
          </Button>
        </div>
      ))}
    </div>
  )
} 