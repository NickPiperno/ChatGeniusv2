import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FilePreviewProps {
  file: File
  onRemove: () => void
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background/50 px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-lg">📄</span>
        <span className="text-sm font-medium truncate max-w-[200px]">
          {file.name}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
} 