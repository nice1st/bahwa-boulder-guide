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
  const [swiping, setSwiping] = useState(false)
  const [swipeDelta, setSwipeDelta] = useState(0)

  // 스와이프
  const startX = useRef(0)
  const startY = useRef(0)
  const deltaX = useRef(0)
  const deltaY = useRef(0)

  // 더블탭
  const lastTap = useRef(0)

  // 줌 드래그
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragOffset = useRef({ x: 0, y: 0 })

  usePopstate(onClose)

  const goNext = useCallback(() => {
    if (index < images.length - 1) setIndex((i) => i + 1)
  }, [index, images.length])

  const goPrev = useCallback(() => {
    if (index > 0) setIndex((i) => i - 1)
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
      if (zoomed) {
        setZoomed(false)
        setOffset({ x: 0, y: 0 })
      } else {
        setZoomed(true)
        setOffset({ x: 0, y: 0 })
      }
      lastTap.current = 0
      return
    }
    lastTap.current = now

    // 줌 상태에서 드래그
    if (zoomed) {
      dragging.current = true
      dragStart.current = { x: t.clientX, y: t.clientY }
      dragOffset.current = { ...offset }
    } else {
      setSwiping(true)
      setSwipeDelta(0)
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
    } else if (!zoomed && swiping) {
      setSwipeDelta(deltaX.current)
    }
  }

  const handleTouchEnd = () => {
    dragging.current = false

    if (zoomed) return

    setSwiping(false)
    setSwipeDelta(0)

    const absX = Math.abs(deltaX.current)
    const absY = Math.abs(deltaY.current)

    if (absX > absY && absX > 50) {
      if (deltaX.current < 0) goNext()
      else goPrev()
    } else if (absY > absX && absY > 50 && deltaY.current > 0) {
      onClose()
    }
  }

  // 갤러리 translateX: 현재 인덱스 기준 + 스와이프 중 드래그 오프셋
  const galleryOffset = -(index * 100)
  const dragPx = swiping ? swipeDelta : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* 닫기 */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-xl active:bg-white/30"
      >
        ✕
      </button>

      {/* 카운터 */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 z-[60] rounded-full bg-white/20 px-3 py-1 text-sm text-white">
          {index + 1} / {images.length}
        </div>
      )}

      {/* 갤러리 컨테이너 */}
      <div
        className="h-full w-full overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(calc(${galleryOffset}% + ${dragPx}px))`,
            transition: swiping ? 'none' : 'transform 300ms ease-out',
          }}
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="flex h-full w-full flex-shrink-0 items-center justify-center"
            >
              <img
                src={src}
                alt=""
                className="max-h-full max-w-full object-contain pointer-events-none"
                draggable={false}
                style={
                  i === index && zoomed
                    ? {
                        transform: `scale(2.5) translate(${offset.x / 2.5}px, ${offset.y / 2.5}px)`,
                        transition: dragging.current ? 'none' : 'transform 300ms ease-out',
                      }
                    : {
                        transform: 'scale(1)',
                        transition: 'transform 300ms ease-out',
                      }
                }
              />
            </div>
          ))}
        </div>
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
