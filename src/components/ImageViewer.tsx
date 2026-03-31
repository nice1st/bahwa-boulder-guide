'use client'

import { useState } from 'react'
import { useSwipe } from '@/lib/useSwipe'
import { usePopstate } from '@/lib/usePopstate'

interface ImageViewerProps {
  images: string[]
  initialIndex: number
  onClose: () => void
}

export default function ImageViewer({ images, initialIndex, onClose }: ImageViewerProps) {
  const [index, setIndex] = useState(initialIndex)

  usePopstate(onClose)

  const swipe = useSwipe(
    () => setIndex((i) => Math.min(images.length - 1, i + 1)),
    () => setIndex((i) => Math.max(0, i - 1)),
    onClose,
  )

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
        className="h-full w-full flex items-center justify-center select-none"
        onClick={(e) => e.stopPropagation()}
        {...swipe}
      >
        <img
          src={images[index]}
          alt=""
          className="max-h-full max-w-full object-contain pointer-events-none"
          draggable={false}
        />
      </div>

      {/* 좌우 버튼 (PC) */}
      {images.length > 1 && (
        <>
          {index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setIndex((i) => i - 1) }}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white text-2xl active:bg-white/30"
            >
              ‹
            </button>
          )}
          {index < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setIndex((i) => i + 1) }}
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
