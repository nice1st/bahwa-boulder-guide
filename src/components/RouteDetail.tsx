'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSwipe } from '@/lib/useSwipe'
import { usePopstate } from '@/lib/usePopstate'
import ImageViewer from './ImageViewer'
import type { Route, Comment } from '@/types'

interface RouteDetailProps {
  route: Route
  visible: boolean
  onBack: () => void
  onClose: () => void
  onHidden?: () => void
}

export default function RouteDetail({ route, visible, onBack, onClose, onHidden }: RouteDetailProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)

  const closeViewer = useCallback(() => setViewerOpen(false), [])

  usePopstate(onBack, !viewerOpen)

  const photoSwipe = useSwipe(
    () => setPhotoIndex((i) => Math.min(route.photo_urls.length - 1, i + 1)),
    () => setPhotoIndex((i) => Math.max(0, i - 1)),
  )

  useEffect(() => {
    supabase
      .from('comments')
      .select('*')
      .eq('route_id', route.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setComments(data) })
  }, [route.id])

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return
    const content = newComment.trim()
    setSubmitting(true)
    setNewComment('')

    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      route_id: route.id,
      content,
      created_at: new Date().toISOString(),
    }
    setComments((prev) => [tempComment, ...prev])

    const { data } = await supabase
      .from('comments')
      .insert({ route_id: route.id, content })
      .select()
      .single()
    if (data) {
      setComments((prev) => prev.map((c) => (c.id === tempComment.id ? data : c)))
    }
    setSubmitting(false)
  }

  return (
    <>
      <div
        onTransitionEnd={(e) => {
          if (e.propertyName === 'transform' && !visible) onHidden?.()
        }}
        className={`absolute bottom-0 left-0 right-0 z-30 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center gap-4 border-b bg-white px-4 py-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 truncate">{route.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                {route.grade}
              </span>
              <span className="text-xs text-gray-500">패드 {route.min_pads}개</span>
            </div>
          </div>
        </div>

        {/* 대표 사진 */}
        {route.photo_urls.length > 0 ? (
          <div className="relative h-56 bg-gray-100 select-none" {...photoSwipe}>
            <img
              src={route.photo_urls[photoIndex]}
              alt=""
              className="h-full w-full object-cover cursor-pointer"
              draggable={false}
              onClick={() => setViewerOpen(true)}
            />
            {route.photo_urls.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white text-lg active:bg-black/60"
                >
                  ‹
                </button>
                <button
                  onClick={() => setPhotoIndex((i) => Math.min(route.photo_urls.length - 1, i + 1))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white text-lg active:bg-black/60"
                >
                  ›
                </button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {route.photo_urls.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full transition ${i === photoIndex ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
                <div className="absolute top-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">
                  {photoIndex + 1} / {route.photo_urls.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex h-56 flex-col items-center justify-center bg-gray-100 text-gray-400">
            <div className="mb-2 text-4xl">🪨</div>
            <p className="text-sm font-medium">등록된 사진이 없습니다</p>
          </div>
        )}

        {/* 설명 */}
        {route.description && (
          <p className="px-4 py-3 text-sm leading-relaxed text-gray-700">{route.description}</p>
        )}

        {/* 영상 링크 */}
        {route.video_urls.length > 0 && (
          <div className="border-t px-4 py-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">영상</h3>
            <ul className="space-y-2">
              {route.video_urls.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-blue-600 active:bg-gray-100"
                  >
                    <span className="text-lg">▶</span>
                    <span className="truncate">{url}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 댓글 */}
        <div className="border-t px-4 py-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            댓글 {comments.length > 0 && `(${comments.length})`}
          </h3>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="댓글을 입력하세요"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
              enterKeyHint="send"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
              className="rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white active:bg-blue-600 disabled:opacity-40"
            >
              등록
            </button>
          </div>

          {comments.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">아직 댓글이 없습니다</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-800">{c.content}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 풀스크린 이미지 뷰어 */}
      {viewerOpen && route.photo_urls.length > 0 && (
        <ImageViewer
          images={route.photo_urls}
          initialIndex={photoIndex}
          onClose={closeViewer}
          labels={route.photo_urls.map(() => ({ name: route.name, grade: route.grade }))}
        />
      )}
    </>
  )
}
