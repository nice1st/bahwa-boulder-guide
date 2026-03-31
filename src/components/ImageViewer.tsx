'use client'

import { useState, useRef, useCallback } from 'react'
import { usePopstate } from '@/lib/usePopstate'

interface ImageViewerProps {
  images: string[]
  initialIndex: number
  onClose: () => void
}

export default function ImageViewer({ images, initialIndex, onClose }: ImageViewerProps) {
  const [index, setIndex] = useState(initialIndex)
  const [zoomed, setZoomed] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)

  // 스와이프
  const startX = useRef(0)
  const startY = useRef(0)
  const deltaX = useRef(0)
  const deltaY = useRef(0)

  // 더블탭
  const lastTap = useRef(0)
  const tapPos = useRef({ x: 0, y: 0 })

  // 줌 드래그
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragOffset = useRef({ x: 0, y: 0 })

  usePopstate(onClose)

  const goNext = useCallback(() => {
    if (index < images.length - 1) {
      setSlideDir('left')
      setTimeout(() => { setIndex((i) => i + 1); setSlideDir(null) }, 200)
    }
  }, [index, images.length])

  const goPrev = useCallback(() => {
    if (index > 0) {
      setSlideDir('right')
      setTimeout(() => { setIndex((i) => i - 1); setSlideDir(null) }, 200)
    }
  }, [index])

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    startX.current = t.clientX
    startY.current = t.clientY
    deltaX.current = 0
    deltaY.current = 0

    // 더블탭 감지
    const now = Date.now()
    if (now - lastTap.current < 300) {
      // 더블탭
      if (zoomed) {
        setZoomed(false)
        setOffset({ x: 0, y: 0 })
      } else {
        setZoomed(true)
        // 탭 위치 기준으로 확대
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        setOffset({
          x: -(t.clientX - rect.width / 2),
          y: -(t.clientY - rect.height / 2),
        })
      }
      lastTap.current = 0
      return
    }
    lastTap.current = now
    tapPos.current = { x: t.clientX, y: t.clientY }

    // 줌 상태에서 드래그
    if (zoomed) {
      dragging.current = true
      dragStart.current = { x: t.clientX, y: t.clientY }
      dragOffset.current = { ...offset }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0]
    deltaX.current = t.clientX - startX.current
    deltaY.current = t.clientY - startY.current

    if (zoomed && dragging.current) {
      setOffset({
        x: dragOffset.current.x + (t.clientX - dragStart.current.x),
        y: dragOffset.current.y + (t.clientY - dragStart.current.y),
      })
    }
  }

  const handleTouchEnd = () => {
    dragging.current = false

    if (zoomed) return

    const absX = Math.abs(deltaX.current)
    const absY = Math.abs(deltaY.current)

    if (absX > absY && absX > 50) {
      if (deltaX.current < 0) goNext()
      else goPrev()
    } else if (absY > absX && absY > 50 && deltaY.current > 0) {
      onClose()
    }
  }

  const slideClass = slideDir === 'left'
    ? 'translate-x-[-30px] opacity-0'
    : slideDir === 'right'
    ? 'translate-x-[30px] opacity-0'
    : 'translate-x-0 opacity-100'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* 닫기 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-xl active:bg-white/30"
      >
        ✕
      </button>

      {/* 카운터 */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 rounded-full bg-white/20 px-3 py-1 text-sm text-white">
          {index + 1} / {images.length}
        </div>
      )}

      {/* 이미지 */}
      <div
        className="h-full w-full flex items-center justify-center select-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[index]}
          alt=""
          className={`max-h-full max-w-full object-contain pointer-events-none transition-all duration-200 ease-out ${slideClass}`}
          draggable={false}
          style={zoomed ? {
            transform: `scale(2.5) translate(${offset.x / 2.5}px, ${offset.y / 2.5}px)`,
            transition: dragging.current ? 'none' : undefined,
          } : undefined}
        />
      </div>

      {/* 좌우 버튼 (PC) */}
      {images.length > 1 && (
        <>
          {index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev() }}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white text-2xl active:bg-white/30"
            >
              ‹
            </button>
          )}
          {index < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white text-2xl active:bg-white/30"
            >
              ›
            </button>
          )}
        </>
      )}
    </div>
  )
}
