'use client'

import { useState, useCallback } from 'react'
import Header from '@/components/Header'
import KakaoMap from '@/components/KakaoMap'
import MarkerPanel from '@/components/MarkerPanel'
import type { Marker, Route } from '@/types'

export default function Home() {
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [panelVisible, setPanelVisible] = useState(false)
  const [activePath, setActivePath] = useState<string | null>(null)
  const [gradeFilters, setGradeFilters] = useState<string[]>([])
  const [padFilter, setPadFilter] = useState('')

  const handleMarkerSelect = useCallback((marker: Marker, fetchedRoutes: Route[]) => {
    setSelectedMarker(marker)
    setRoutes(fetchedRoutes)
    setPanelVisible(true)
  }, [])

  const handleClose = useCallback(() => {
    setPanelVisible(false)
    setActivePath(null)
    setTimeout(() => setSelectedMarker(null), 300)
  }, [])

  const handleMapTouch = useCallback(() => {
    if (selectedMarker) handleClose()
  }, [selectedMarker, handleClose])

  const handleTogglePath = useCallback((markerId: string) => {
    setActivePath((prev) => (prev === markerId ? null : markerId))
  }, [])

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
          onMapTouch={handleMapTouch}
        />
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
          />
        )}
      </div>
    </main>
  )
}
