import { useRef, useCallback } from 'react'

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}

export function useSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeDown?: () => void,
  threshold = 50,
): SwipeHandlers {
  const startX = useRef(0)
  const startY = useRef(0)
  const deltaX = useRef(0)
  const deltaY = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    deltaX.current = 0
    deltaY.current = 0
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    deltaX.current = e.touches[0].clientX - startX.current
    deltaY.current = e.touches[0].clientY - startY.current
  }, [])

  const onTouchEnd = useCallback(() => {
    const absX = Math.abs(deltaX.current)
    const absY = Math.abs(deltaY.current)

    if (absX > absY && absX > threshold) {
      if (deltaX.current < 0) onSwipeLeft?.()
      else onSwipeRight?.()
    } else if (absY > absX && absY > threshold) {
      if (deltaY.current > 0) onSwipeDown?.()
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeDown, threshold])

  return { onTouchStart, onTouchMove, onTouchEnd }
}
