import React from 'react'
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
import { useState, useRef, useCallback } from 'react'
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

interface ChatSettings {
  enterToSend: boolean
}

interface MessageInputTiptapProps {
  onSendMessage: (content: string, attachments?: Array<{
    id: string
    name: string
    url: string
    type: 'document' | 'image'
  }>) => Promise<void>
  chatSettings: ChatSettings
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

const MentionList = ({ items, command }: MentionListProps) => {
  return (
    <div className="rounded-md border bg-popover p-1 shadow-md min-w-[200px]">
      {items.map((item, index) => {
        // Get display name from available fields
        const displayName = item.fullName || item.name || item.username || 'Unknown User'
        const initial = displayName[0].toUpperCase()
        
        return (
          <button
            key={item.id}
            className="mention-item flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => command(item)}
          >
            <div className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-gray-600">{initial}</span>
              )}
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">{displayName}</span>
              {item.username && (
                <span className="text-xs text-muted-foreground">@{item.username}</span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function MessageInputTiptap({
  onSendMessage,
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
            class: 'list-disc list-inside space-y-1'
          }
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-inside space-y-1'
          }
        },
        listItem: {
          HTMLAttributes: {
            class: 'leading-normal'
          }
        }
      }),
      Underline.configure({
        HTMLAttributes: {
          class: 'underline'
        }
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Type a message...',
        emptyEditorClass: 'before:content-[attr(data-placeholder)] before:text-muted-foreground before:h-0 before:float-left before:pointer-events-none'
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        renderText: ({ node }) => {
          return `@${(node.attrs as MentionNodeAttrs).label || ''}`
        },
        renderHTML: ({ node, HTMLAttributes }) => {
          return ['span', { ...HTMLAttributes, 'data-mention': node.attrs.id }, `@${node.attrs.label || ''}`]
        },
        suggestion: {
          items: ({ query }: { query: string }) => {
            return users
              .filter(user => 
                user.name?.toLowerCase().includes(query.toLowerCase()) ||
                user.username?.toLowerCase().includes(query.toLowerCase())
              )
              .map(user => ({
                ...user,
                label: user.username || user.name
              }))
              .slice(0, 5)
          },
          render: () => {
            let component: ReactRenderer | null = null
            let popup: any = null
            
            return {
              onStart: (props: SuggestionProps<User>) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                })
                
                const element = document.querySelector('body')
                if (!element) return
                
                popup = tippy(element, {
                  getReferenceClientRect: () => {
                    if (!props.clientRect) return new DOMRect()
                    const rect = props.clientRect()
                    return rect || new DOMRect()
                  },
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  theme: 'mention-popup'
                })
              },
              
              onUpdate: (props: SuggestionProps<User>) => {
                if (!component) return
                
                component.updateProps(props)
                
                if (popup && popup[0]) {
                  popup[0].setProps({
                    getReferenceClientRect: () => {
                      if (!props.clientRect) return new DOMRect()
                      const rect = props.clientRect()
                      return rect || new DOMRect()
                    },
                  })
                }
              },
              
              onKeyDown: (props: { event: KeyboardEvent }) => {
                if (props.event.key === 'Escape') {
                  if (popup && popup[0]) {
                    popup[0].hide()
                  }
                  return true
                }
                
                if (component?.ref && typeof component.ref === 'object') {
                  const ref = component.ref as MentionListRef
                  if (ref.onKeyDown) {
                    return ref.onKeyDown(props)
                  }
                }
                
                return false
              },
              
              onExit: () => {
                if (popup && popup[0]) {
                  popup[0].destroy()
                }
                if (component) {
                  component.destroy()
                }
              },
            }
          },
        },
      }),
    ],
    editable: true,
    autofocus: true,
    enableInputRules: true,
    onCreate: ({ editor }) => {
      editor.commands.focus()
    },
    onFocus: ({ editor }) => {
      editor.commands.focus()
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] px-3 py-2'
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
                handleSend()
                return true
              }
            }
          }
          
          if (chatSettings.enterToSend) {
            const isEmpty = editor?.isEmpty ?? true
            const hasFiles = uploadedFiles.length > 0
            
            if (!isEmpty || hasFiles) {
              event.preventDefault()
              handleSend()
              return true
            }
          }
        }
        return false
      }
    }
  })

  const canSendMessage = Boolean(
    (editor?.getText().trim().length ?? 0) > 0 || uploadedFiles.length > 0
  ) && !isUploading

  // Add debug log for send button state
  console.log('[MessageInput] Send button state:', {
    canSend: canSendMessage,
    textLength: editor?.getText().trim().length ?? 0,
    filesLength: uploadedFiles.length,
    isUploading
  })

  const handleSend = useCallback(async () => {
    if (!editor) return
    
    setIsUploading(true)
    try {
      const cleanContent = editor.getText().trim()
      if (!cleanContent && uploadedFiles.length === 0) return

      let attachments: { id: string; name: string; url: string; type: 'document' | 'image' }[] = []

      // Upload files if any
      if (uploadedFiles.length > 0) {
        const formData = new FormData()
        uploadedFiles.forEach(file => {
          formData.append('file', file)
        })
        if (groupId) {
          formData.append('groupId', groupId)
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          headers: {
            // Don't set Content-Type header - browser will set it with boundary for FormData
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('[MessageInput] Upload failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          })
          throw new Error(`Failed to upload files: ${response.statusText}`)
        }

        attachments = await response.json()
        console.log('[MessageInput] Files uploaded successfully:', attachments)
      }

      // Send message with file URLs
      await onSendMessage(cleanContent, attachments)
      
      // Clear the editor and reset files
      editor.commands.clearContent()
      setUploadedFiles([])
      setIsEmojiOpen(false)
    } catch (error) {
      console.error('[MessageInput] Error sending message:', error)
      toast({
        title: "Error sending message",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }, [editor, uploadedFiles, onSendMessage, groupId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setUploadedFiles(prev => [...prev, ...selectedFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = (index: number) => {
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
    setUploadedFiles(prev => [...prev, ...droppedFiles])
  }

  const handleEmojiSelect = useCallback((emoji: any) => {
    if (editor) {
      editor.commands.focus()
      editor.commands.insertContent(emoji.native)
      setIsEmojiOpen(false)
    }
  }, [editor])

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modKey = isMac ? '⌘' : 'Ctrl'

  const FormatButton = React.forwardRef<
    HTMLButtonElement,
    {
      icon: LucideIcon
      isActive?: boolean
      onClick: () => void
      tooltip: string
      shortcut?: string
    }
  >(({ icon: Icon, isActive, onClick, tooltip, shortcut }, ref) => {
    const isFormattingButton = !['Attach files', 'Add emoji'].includes(tooltip)

    const handleClick = (e: React.MouseEvent) => {
      // Stop event propagation
      e.preventDefault()
      e.stopPropagation()
      
      // Call the click handler
      onClick()
      
      // Prevent losing focus
      if (editor) {
        editor.commands.focus()
      }
    }

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8',
                isFormattingButton && isActive && 'bg-muted'
              )}
              onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
              onClick={handleClick}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{tooltip} {shortcut && <span className="text-muted-foreground ml-1">({shortcut})</span>}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  })

  FormatButton.displayName = 'FormatButton'

  const handleBold = useCallback(() => {
    if (!editor) return
    
    editor.commands.focus()
    editor.chain()
      .toggleBold()
      .focus()
      .run()
  }, [editor])

  const handleItalic = useCallback(() => {
    if (!editor) return
    
    editor.commands.focus()
    editor.chain()
      .toggleItalic()
      .focus()
      .run()
  }, [editor])

  const handleUnderline = useCallback(() => {
    if (!editor) return
    
    editor.commands.focus()
    editor.chain()
      .toggleUnderline()
      .focus()
      .run()
  }, [editor])

  const handleBulletList = useCallback(() => {
    if (!editor) return
    
    const isActive = editor.isActive('bulletList')
    const isOrderedListActive = editor.isActive('orderedList')
    
    if (isOrderedListActive) {
      // Convert ordered list to bullet list
      editor.chain()
        .focus()
        .toggleOrderedList()
        .toggleBulletList()
        .run()
    } else {
      // Toggle bullet list
      editor.chain()
        .focus()
        .toggleBulletList()
        .run()
    }
  }, [editor])

  const handleOrderedList = useCallback(() => {
    if (!editor) return
    
    const isActive = editor.isActive('orderedList')
    const isBulletListActive = editor.isActive('bulletList')
    
    if (isBulletListActive) {
      // Convert bullet list to ordered list
      editor.chain()
        .focus()
        .toggleBulletList()
        .toggleOrderedList()
        .run()
    } else {
      // Toggle ordered list
      editor.chain()
        .focus()
        .toggleOrderedList()
        .run()
    }
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div 
      className={cn(
        "relative rounded-md border bg-background shadow-sm",
        isDragging && "ring-2 ring-primary/20 after:absolute after:inset-0 after:z-50 after:rounded-md after:border-2 after:border-dashed after:border-primary after:bg-purple-500/5",
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
            <FormatButton
              icon={Smile}
              tooltip="Add emoji"
              onClick={() => setIsEmojiOpen(true)}
            />
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

      <div className="absolute right-2 bottom-2">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="h-8 w-8"
                disabled={!canSendMessage}
                onClick={handleSend}
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Send message
                {chatSettings.enterToSend && " (or press Enter)"}
                <br />
                <span className="text-xs text-muted-foreground">
                  Press Shift+Enter for new line
                </span>
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
} 