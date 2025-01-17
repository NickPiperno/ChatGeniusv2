import { useEffect, useState } from 'react'

/**
 * Default mobile breakpoint in pixels
 * @constant
 */
const MOBILE_BREAKPOINT = 768

/**
 * Hook to detect if the current viewport is mobile-sized
 * @returns {boolean} True if the viewport width is less than MOBILE_BREAKPOINT
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMobile = useIsMobile()
 *   return (
 *     <div>
 *       {isMobile ? 'Mobile View' : 'Desktop View'}
 *     </div>
 *   )
 * }
 * ```
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Set initial value
    onChange()

    // Add event listener
    mql.addEventListener('change', onChange)

    // Cleanup
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
} 