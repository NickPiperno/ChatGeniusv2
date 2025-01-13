'use client'

import { useEffect, useState } from 'react'
import { Message } from '@/types/models/message'
import { User } from '@/types/models/user'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { MessageList } from '../messages/MessageList'
import { AlertCircle, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VirtualizedList } from '@/components/ui/virtualized-list'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { useThreadKeyboard } from '@/hooks/ui/useThreadKeyboard'

const REPLIES_PER_PAGE = 20

interface MessageThreadProps {
  isOpen: boolean
  onClose: () => void
  parentMessage: Message
  replies: Message[]
  onReaction: (messageId: string, emoji: string, parentId?: string) => void
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  onLoadMoreReplies?: (messageId: string, page: number) => Promise<Message[]>
  users: User[]
  headerHeight: number
  searchBarHeight: number
}

export function MessageThread({
  isOpen,
  onClose,
  parentMessage,
  replies,
  onReaction,
  onEdit,
  onDelete,
  onLoadMoreReplies,
  users,
  headerHeight,
  searchBarHeight
}: MessageThreadProps) {
  const [error, setError] = useState<{ message: string; retryable?: boolean } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [visibleReplies, setVisibleReplies] = useState<Message[]>([])
  const [hasMoreReplies, setHasMoreReplies] = useState(true)

  useEffect(() => {
    setVisibleReplies(replies.slice(0, REPLIES_PER_PAGE))
    setHasMoreReplies(replies.length > REPLIES_PER_PAGE)
  }, [replies])

  const clearError = () => {
    setError(null)
    setRetryCount(0)
  }

  const handleRetry = () => {
    clearError()
  }

  const handlePageChange = async (page: number) => {
    if (!onLoadMoreReplies) return
    
    setIsLoading(true)
    try {
      const newReplies = await onLoadMoreReplies(parentMessage.id, page)
      setVisibleReplies(newReplies)
      setCurrentPage(page)
      setHasMoreReplies(newReplies.length === REPLIES_PER_PAGE)
    } catch (err) {
      setError({ message: 'Failed to load replies', retryable: true })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNextPage = () => {
    if (hasMoreReplies) {
      handlePageChange(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1)
    }
  }

  const handleReply = () => {
    const inputElement = document.querySelector<HTMLTextAreaElement>('.thread-reply-input')
    if (inputElement) {
      inputElement.focus()
    }
  }

  useThreadKeyboard({
    isOpen,
    onClose,
    onNextPage: handleNextPage,
    onPrevPage: handlePrevPage,
    onReply: handleReply
  })

  if (!isOpen) return null

  console.log('[MessageThread] Height calculations:', {
    searchBarHeight,
    headerHeight,
    totalHeight: searchBarHeight + headerHeight,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0
  })

  return (
    <aside 
      data-testid="thread-sidebar"
      className={cn(
        "fixed right-0 z-30 w-[400px] border-l bg-background transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
      style={{ 
        top: `${searchBarHeight + headerHeight}px`, 
        height: `calc(100vh - ${searchBarHeight + headerHeight}px)`,
        maxHeight: `calc(100vh - ${searchBarHeight + headerHeight}px)`
      }}
    >
      <div className="flex items-center justify-between h-12 px-6 border-b border-border">
        <h3 className="text-lg font-semibold">Thread</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              {error.message}
              {error.retryable && retryCount < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetry}
                  className="ml-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border shrink-0">
              <MessageList
                messages={[parentMessage]}
                onReaction={onReaction}
                onReply={() => {}}
                onEdit={onEdit}
                onDelete={onDelete}
                showThreadPreview={false}
              />
            </div>

            <div className="flex-1 min-h-0">
              {isSyncing && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              )}

              <div className="h-full overflow-y-auto custom-scrollbar">
                {visibleReplies.map((message) => (
                  <div key={message.id} className="p-2">
                    <MessageList
                      messages={[message]}
                      onReaction={onReaction}
                      onReply={() => {}}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      showThreadPreview={false}
                    />
                  </div>
                ))}
              </div>

              {hasMoreReplies && (
                <div className="p-4 border-t border-border">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) {
                              handlePageChange(currentPage - 1)
                            }
                          }}
                          aria-disabled={currentPage === 1}
                          className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink isActive>{currentPage}</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (hasMoreReplies) {
                              handlePageChange(currentPage + 1)
                            }
                          }}
                          aria-disabled={!hasMoreReplies}
                          className={cn(!hasMoreReplies && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
} 