import { useState, useRef, useCallback, forwardRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Mention from '@tiptap/extension-mention'
import { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance, Props } from 'tippy.js'
import { Button } from '@/components/ui/button'
import { type LucideIcon, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Smile, Send, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { User } from '@/types/models/user'
import { FileAttachments } from './FileAttachments'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { useTheme } from 'next-themes'
import { toast } from '@/components/ui/use-toast'
import { FilePreview } from '@/components/chat/input/FilePreview'
import { logger } from '@/lib/logger'
import { validateFile } from '@/lib/fileValidation'
import { fetchApi } from '@/lib/api-client'
import { Message } from '@/types/models/message'

interface ChatSettings {
  enterToSend: boolean
}

interface MessageInputTiptapProps {
  onSendMessage: (content: string, attachments?: { id: string; name: string; url: string; type: 'image' | 'document'; size: number }[]) => Promise<void>
  onEditMessage?: (content: string) => Promise<void>
  editingMessage?: Message | null
  chatSettings: {
    enterToSend: boolean
  }
  users: User[]
  isReplying?: boolean
  placeholder?: string
  className?: string
  groupId?: string
}

interface MentionListProps {
  items: User[]
  command: (item: User) => void
}

interface MentionSuggestionProps {
  items: User[]
  command: (item: { id: string; label: string }) => void
  clientRect: () => DOMRect | null
  editor: any
}

interface MentionNodeAttrs {
  id: string
  label: string
}

interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface UploadResponse {
  fileId: string
  fileName: string
  url: string
}

interface FileUploadResult {
  id: string
  name: string
  url: string
  type: 'document' | 'image'
  size: number
}

const MentionList = ({ items, command }: MentionListProps) => {
  return (
    <div className="rounded-md border bg-popover p-1 shadow-md">
      {items.map((item, index) => (
        <button
          key={item.id}
          className="mention-item flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          onClick={() => command(item)}
        >
          <div className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden">
            {item.imageUrl && <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />}
          </div>
          <span>{item.displayName}</span>
        </button>
      ))}
    </div>
  )
}

export function MessageInputTiptap({
  onSendMessage,
  onEditMessage,
  editingMessage,
  chatSettings,
  users,
  isReplying = false,
  placeholder = "Type a message...",
  className,
  groupId
}: MessageInputTiptapProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isEmojiOpen, setIsEmojiOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme } = useTheme()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-outside ml-4'
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-outside ml-4'
          },
        },
      }),
      Underline.configure({
        HTMLAttributes: {
          class: 'underline'
        }
      }),
    ],
    editable: true,
    autofocus: 'end',
    enableInputRules: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[50px] px-3 py-2'
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          const { empty, $from } = view.state.selection
          const isInList = $from.node(-1)?.type.name.endsWith('List')
          
          if (isInList && empty) {
            const isEmptyListItem = $from.parent.textContent === ''
            
            if (isEmptyListItem) {
              editor?.commands.liftListItem('listItem')
              event.preventDefault()
              return true
            }
            
            if (chatSettings.enterToSend) {
              const isEmpty = editor?.isEmpty ?? true
              const hasFiles = uploadedFiles.length > 0
              
              if (!isEmpty || hasFiles) {
                event.preventDefault()
                handleSendMessage()
                return true
              }
            }
          }
          
          if (chatSettings.enterToSend) {
            const isEmpty = editor?.isEmpty ?? true
            const hasFiles = uploadedFiles.length > 0
            
            if (!isEmpty || hasFiles) {
              event.preventDefault()
              handleSendMessage()
              return true
            }
          }
        }
        return false
      }
    }
  })

  const canSendMessage = Boolean(
    (!editor?.isEmpty || uploadedFiles.length > 0) && !isUploading
  )

  // Add debug log for send button state
  console.log('[MessageInput] Send button state:', {
    canSend: canSendMessage,
    textLength: editor?.getText().trim().length ?? 0,
    filesLength: uploadedFiles.length,
    isUploading,
    isEmpty: editor?.isEmpty
  })

  // Update editor content when editingMessage changes
  useEffect(() => {
    if (editingMessage && editor) {
      editor.commands.setContent(editingMessage.content)
    }
  }, [editingMessage, editor])

  const handleSendMessage = async () => {
    if (!editor) return

    const content = editor.getHTML()
    const isEmpty = editor.isEmpty || !editor.getText().trim()
    
    if (isEmpty && uploadedFiles.length === 0) return

    try {
      if (editingMessage && onEditMessage) {
        await onEditMessage(content)
        editor.commands.clearContent()
        return
      }

      const uploadedAttachments: FileUploadResult[] = []
      
      if (uploadedFiles.length > 0) {
        setIsUploading(true)
        for (const file of uploadedFiles) {
          try {
            const result = await handleFileUpload(file)
            uploadedAttachments.push(result)
          } catch (error) {
            console.error('Error uploading file:', error)
            toast({
              title: 'Upload Failed',
              description: `Failed to upload ${file.name}`,
              variant: 'destructive'
            })
          }
        }
        setIsUploading(false)
      }

      await onSendMessage(content, uploadedAttachments)
      editor.commands.clearContent()
      setUploadedFiles([])
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      })
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    console.log('[MessageInput] Files selected:', selectedFiles)
    setUploadedFiles(prev => [...prev, ...selectedFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = (index: number) => {
    console.log('[MessageInput] Removing file at index:', index)
    setUploadedFiles(files => files.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    console.log('[MessageInput] Files dropped:', droppedFiles)
    setUploadedFiles(prev => [...prev, ...droppedFiles])
  }

  const handleEmojiSelect = useCallback((emoji: any) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji.native).run()
      setIsEmojiOpen(false)
    }
  }, [editor])

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modKey = isMac ? '⌘' : 'Ctrl'

  const FormatButton = forwardRef<
    HTMLButtonElement,
    {
      icon: LucideIcon
      isActive?: boolean
      onClick?: () => void
      tooltip: string
      shortcut?: string
    }
  >(({ icon: Icon, isActive, onClick, tooltip, shortcut }, ref) => {
    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      if (onClick) {
        onClick()
      }
    }, [onClick])

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClick}
              type="button"
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{tooltip} {shortcut && <kbd className="ml-2 text-xs">{shortcut}</kbd>}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  })

  FormatButton.displayName = 'FormatButton'

  const handleBold = useCallback(() => {
    editor?.chain().toggleBold().run()
  }, [editor])

  const handleItalic = useCallback(() => {
    editor?.chain().toggleItalic().run()
  }, [editor])

  const handleUnderline = useCallback(() => {
    editor?.chain().toggleUnderline().run()
  }, [editor])

  const handleBulletList = useCallback(() => {
    if (!editor) return
    
    if (editor.isActive('orderedList')) {
      editor.chain().toggleOrderedList().toggleBulletList().run()
    } else {
      editor.chain().toggleBulletList().run()
    }
  }, [editor])

  const handleOrderedList = useCallback(() => {
    if (!editor) return
    
    if (editor.isActive('bulletList')) {
      editor.chain().toggleBulletList().toggleOrderedList().run()
    } else {
      editor.chain().toggleOrderedList().run()
    }
  }, [editor])

  const handleFileUpload = async (file: File): Promise<FileUploadResult> => {
    if (!file) {
      throw new Error('No file provided')
    }

    const formData = new FormData()
    formData.append('file', file)
    if (groupId) {
      formData.append('groupId', groupId)
    }

    try {
      const response = await fetchApi('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Upload failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      // The /api/upload endpoint returns an array with a single item
      const fileData = Array.isArray(data) ? data[0] : data

      return {
        id: fileData.id,
        name: fileData.name,
        url: fileData.url,
        type: fileData.type || 'document',
        size: file.size
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to upload file')
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && chatSettings.enterToSend) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div 
      className={cn(
        "relative flex flex-col rounded-lg border bg-background",
        isDragging && "border-primary",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div className="rounded-lg bg-purple-50/95 px-6 py-4 text-center shadow-lg">
            <div className="mb-2 text-2xl">📄</div>
            <div className="text-sm font-medium text-purple-900">Drop files to attach</div>
            <div className="text-xs text-purple-600">
              Images, documents, and more
            </div>
          </div>
        </div>
      )}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border-b">
          {uploadedFiles.map((file, index) => (
            <FilePreview
              key={file.name}
              file={file}
              onRemove={() => handleRemoveFile(index)}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-0.5 border-b p-2">
        <FormatButton
          icon={Bold}
          tooltip="Bold"
          shortcut={`${modKey}+B`}
          isActive={editor.isActive('bold')}
          onClick={handleBold}
        />
        <FormatButton
          icon={Italic}
          tooltip="Italic"
          shortcut={`${modKey}+I`}
          isActive={editor.isActive('italic')}
          onClick={handleItalic}
        />
        <FormatButton
          icon={UnderlineIcon}
          tooltip="Underline"
          shortcut={`${modKey}+U`}
          isActive={editor.isActive('underline')}
          onClick={handleUnderline}
        />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <FormatButton
          icon={List}
          tooltip="Bullet list"
          shortcut={`${modKey}+Shift+8`}
          isActive={editor.isActive('bulletList')}
          onClick={handleBulletList}
        />
        <FormatButton
          icon={ListOrdered}
          tooltip="Numbered list"
          shortcut={`${modKey}+Shift+7`}
          isActive={editor.isActive('orderedList')}
          onClick={handleOrderedList}
        />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <FormatButton
          icon={Paperclip}
          tooltip="Attach files"
          onClick={() => fileInputRef.current?.click()}
        />
        <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground"
              )}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                editor?.commands.focus()
              }}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme={theme}
              previewPosition="none"
              skinTonePosition="none"
            />
          </PopoverContent>
        </Popover>
      </div>

      <EditorContent editor={editor} />

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />

      <div className="flex items-center gap-1.5 px-3 pb-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canSendMessage}
                onClick={handleSendMessage}
              >
                <Send className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send message</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}