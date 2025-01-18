'use client'

import { useEffect, useRef } from 'react'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { useTheme } from 'next-themes'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Handle click outside if needed
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div ref={containerRef} className="z-50">
      <Picker
        data={data}
        onEmojiSelect={(emoji: any) => onEmojiSelect(emoji.native)}
        theme={theme === 'dark' ? 'dark' : 'light'}
        previewPosition="none"
        skinTonePosition="none"
        searchPosition="none"
        navPosition="none"
        perLine={8}
        maxFrequentRows={0}
      />
    </div>
  )
} 