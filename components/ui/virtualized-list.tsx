'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  itemHeight: number
  overscan?: number
  className?: string
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 3,
  className
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  const handleScroll = () => {
    const container = containerRef.current
    if (container) {
      setScrollTop(container.scrollTop)
    }
  }

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan
  const endIndex = Math.min(items.length, startIndex + visibleCount)

  // Create spacers and visible items
  const totalHeight = items.length * itemHeight
  const topSpacerHeight = startIndex * itemHeight
  const bottomSpacerHeight = (items.length - endIndex) * itemHeight

  const visibleItems = items.slice(startIndex, endIndex).map((item, index) => (
    <div
      key={startIndex + index}
      style={{ height: itemHeight }}
      className="w-full"
    >
      {renderItem(item)}
    </div>
  ))

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("overflow-auto relative", className)}
      style={{ willChange: 'transform' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {topSpacerHeight > 0 && (
          <div style={{ height: topSpacerHeight }} />
        )}
        {visibleItems}
        {bottomSpacerHeight > 0 && (
          <div style={{ height: bottomSpacerHeight }} />
        )}
      </div>
    </div>
  )
} 