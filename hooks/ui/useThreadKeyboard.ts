import { useEffect } from 'react'

interface UseThreadKeyboardProps {
  isOpen: boolean
  onClose: () => void
  onNextPage?: () => void
  onPrevPage?: () => void
  onReply?: () => void
}

export function useThreadKeyboard({
  isOpen,
  onClose,
  onNextPage,
  onPrevPage,
  onReply
}: UseThreadKeyboardProps) {
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      // Only handle if no input/textarea is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'PageDown':
          e.preventDefault()
          onNextPage?.()
          break
        case 'PageUp':
          e.preventDefault()
          onPrevPage?.()
          break
        case 'r':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            onReply?.()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onNextPage, onPrevPage, onReply])
} 