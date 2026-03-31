'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Marker, Route } from '@/types'
import { useSwipe } from '@/lib/useSwipe'
import { usePopstate } from '@/lib/usePopstate'
import ImageViewer from './ImageViewer'
import RouteDetail from './RouteDetail'

interface MarkerPanelProps {
  marker: Marker
  routes: Route[]
  gradeFilters: string[]
  padFilter: string
  visible: boolean
  activePath: string | null
  onTogglePath: (markerId: string) => void
  onClose: () => void
}

export default function MarkerPanel({
  marker,
  routes,
  gradeFilters,
  padFilter,
  visible,
  activePath,
  onTogglePath,
  onClose,
}: MarkerPanelProps) {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [routeVisible, setRouteVisible] = useState(false)
  const [viewerImages, setViewerImages] = useState<string[] | null>(null)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)

  const isRouteOpen = selectedRoute !== null
  const isViewerOpen = viewerImages !== null
  usePopstate(onClose, !isRouteOpen && !isViewerOpen)

  useEffect(() => {
    setPhotoIndex(0)
    setSelectedRoute(null)
  }, [marker.id])

  const filteredRoutes = routes.filter((r) => {
    if (gradeFilters.length > 0) {
      const isV10Plus = ['V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'].includes(r.grade)
      const matches = gradeFilters.some((f) => (f === 'V10+' ? isV10Plus : f === r.grade))
      if (!matches) return false
    }
    if (padFilter && r.min_pads > Number(padFilter)) return false
    return true
  })

  // 마커 썸네일 + 모든 루트 사진
  const markerImages = marker.thumbnail_url ? [marker.thumbnail_url] : []
  const allRoutePhotos = routes.flatMap((r) => r.photo_urls)
  const allPhotos = [...markerImages, ...allRoutePhotos]

  const panelSwipe = useSwipe(undefined, undefined, onClose)

  const prevPhoto = useCallback(() => {
    setSlideDir('right')
    setTimeout(() => { setPhotoIndex((i) => Math.max(0, i - 1)); setSlideDir(null) }, 150)
  }, [])
  const nextPhoto = useCallback(() => {
    setSlideDir('left')
    setTimeout(() => { setPhotoIndex((i) => Math.min(allPhotos.length - 1, i + 1)); setSlideDir(null) }, 150)
  }, [allPhotos.length])
  const photoSwipe = useSwipe(nextPhoto, prevPhoto)

  const openRoute = useCallback((route: Route) => {
    setSelectedRoute(route)
    setRouteVisible(true)
  }, [])

  const closeRoute = useCallback(() => {
    setRouteVisible(false)
    setTimeout(() => setSelectedRoute(null), 300)
  }, [])

  const openViewer = useCallback((images: string[], index: number) => {
    setViewerImages(images)
    setViewerIndex(index)
  }, [])

  const closeViewer = useCallback(() => setViewerImages(null), [])

  if (selectedRoute) {
    return (
      <>
        <RouteDetail
          route={selectedRoute}
          visible={routeVisible}
          onBack={closeRoute}
          onClose={onClose}
        />
        {viewerImages && (
          <ImageViewer
            images={viewerImages}
            initialIndex={viewerIndex}
            onClose={closeViewer}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div
        onTouchStart={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ touchAction: 'pan-y' }}
        className={`absolute bottom-0 left-0 right-0 z-20 max-h-[60vh] overflow-y-auto rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2 cursor-grab" {...panelSwipe}>
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{marker.name}</h2>
            <p className="text-xs text-gray-400">
              {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTogglePath(marker.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activePath === marker.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {activePath === marker.id ? '경로 숨김' : '어프로치'}
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 대표이미지 슬라이드 */}
        {allPhotos.length > 0 && (
          <div className="relative h-48 bg-gray-100 select-none" {...photoSwipe}>
            <img
              src={allPhotos[photoIndex]}
              alt=""
              className={`h-full w-full object-cover cursor-pointer transition-all duration-150 ease-out ${
                slideDir === 'left' ? 'translate-x-[-20px] opacity-60' :
                slideDir === 'right' ? 'translate-x-[20px] opacity-60' :
                'translate-x-0 opacity-100'
              }`}
              draggable={false}
              onClick={() => openViewer(allPhotos, photoIndex)}
            />
            {allPhotos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white text-lg active:bg-black/60"
                >
                  ‹
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white text-lg active:bg-black/60"
                >
                  ›
                </button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {allPhotos.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full transition ${i === photoIndex ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
                <div className="absolute top-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">
                  {photoIndex + 1} / {allPhotos.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* 루트 목록 */}
        {marker.type === 'boulder' && (
          <div className="p-4">
            {filteredRoutes.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">등록된 루트가 없습니다</p>
            ) : (
              <ul className="space-y-2">
                {filteredRoutes.map((route) => (
                  <li
                    key={route.id}
                    onClick={() => openRoute(route)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 transition active:bg-blue-50"
                  >
                    {route.photo_urls[0] ? (
                      <img
                        src={route.photo_urls[0]}
                        alt=""
                        className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                        🪨
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{route.name}</span>
                        <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {route.grade}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span>패드 {route.min_pads}개</span>
                        {route.video_urls[0] && (
                          <a
                            href={route.video_urls[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-500"
                          >
                            ▶ 영상
                          </a>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-300">›</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 풀스크린 이미지 뷰어 */}
      {viewerImages && (
        <ImageViewer
          images={viewerImages}
          initialIndex={viewerIndex}
          onClose={closeViewer}
        />
      )}
    </>
  )
}
