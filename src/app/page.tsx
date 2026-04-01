'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Header from '@/components/Header'
import KakaoMap from '@/components/KakaoMap'
import MarkerPanel from '@/components/MarkerPanel'
import { supabase } from '@/lib/supabase'
import type { Marker, Route } from '@/types'

function updateUrlParams(markerId?: string | null, routeId?: string | null) {
  const url = new URL(window.location.href)
  if (markerId) {
    url.searchParams.set('marker', markerId)
  } else {
    url.searchParams.delete('marker')
  }
  if (routeId) {
    url.searchParams.set('route', routeId)
  } else {
    url.searchParams.delete('route')
  }
  // replaceState — history 스택에 영향 없이 URL만 갱신
  window.history.replaceState(window.history.state, '', url.toString())
}

export default function Home() {
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [panelVisible, setPanelVisible] = useState(false)
  const [activePath, setActivePath] = useState<string | null>(null)
  const [gradeFilters, setGradeFilters] = useState<string[]>([])
  const [padFilter, setPadFilter] = useState('')
  const [initialRouteId, setInitialRouteId] = useState<string | null>(null)
  const markerSelectTime = useRef(0)

  // URL 파라미터에서 초기 상태 복원
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const markerId = params.get('marker')
    const routeId = params.get('route')
    if (!markerId) return

    ;(async () => {
      const { data: marker } = await supabase
        .from('markers')
        .select('*')
        .eq('id', markerId)
        .single()
      if (!marker) return

      const { data: fetchedRoutes } = await supabase
        .from('routes')
        .select('*')
        .eq('marker_id', markerId)

      setSelectedMarker(marker)
      setRoutes(fetchedRoutes || [])
      setPanelVisible(true)
      if (routeId) setInitialRouteId(routeId)
    })()
  }, [])

  const handleMarkerSelect = useCallback((marker: Marker, fetchedRoutes: Route[]) => {
    markerSelectTime.current = Date.now()
    setSelectedMarker(marker)
    setRoutes(fetchedRoutes)
    setPanelVisible(true)
    updateUrlParams(marker.id)
  }, [])

  const handleClose = useCallback(() => {
    if (Date.now() - markerSelectTime.current < 300) return
    setPanelVisible(false)
    setActivePath(null)
    updateUrlParams(null, null)
  }, [])

  const handlePanelHidden = useCallback(() => {
    if (!panelVisible) setSelectedMarker(null)
  }, [panelVisible])

  const handleTogglePath = useCallback((markerId: string) => {
    setActivePath((prev) => (prev === markerId ? null : markerId))
  }, [])

  // MarkerPanel에서 루트 선택/해제 시 URL 갱신
  const handleRouteChange = useCallback((routeId: string | null) => {
    updateUrlParams(selectedMarker?.id, routeId)
  }, [selectedMarker])

  return (
    <main className="flex h-full w-full flex-col">
      <Header />
      <div className="relative flex-1 overflow-hidden">
        <KakaoMap
          gradeFilters={gradeFilters}
          padFilter={padFilter}
          onGradeFiltersChange={setGradeFilters}
          onPadFilterChange={setPadFilter}
          activePath={activePath}
          onMarkerSelect={handleMarkerSelect}
          panelOpen={panelVisible}
        />
        {/* 투명 backdrop: 지도 영역 터치 → 패널 닫기 */}
        {panelVisible && (
          <div
            className="absolute inset-0 z-10"
            onClick={handleClose}
            onTouchEnd={handleClose}
          />
        )}
        {selectedMarker && (
          <MarkerPanel
            marker={selectedMarker}
            routes={routes}
            gradeFilters={gradeFilters}
            padFilter={padFilter}
            visible={panelVisible}
            activePath={activePath}
            onTogglePath={handleTogglePath}
            onClose={handleClose}
            onHidden={handlePanelHidden}
            onRouteChange={handleRouteChange}
            initialRouteId={initialRouteId}
          />
        )}
      </div>
    </main>
  )
}
