'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Marker } from '@/types'
import MarkerForm from '@/components/admin/MarkerForm'
import MarkerList from '@/components/admin/MarkerList'
import RouteManager from '@/components/admin/RouteManager'
import PathManager from '@/components/admin/PathManager'
import UserManager from '@/components/admin/UserManager'
import KakaoMap from '@/components/KakaoMap'

type Tab = 'markers' | 'paths' | 'users'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('markers')
  const [markers, setMarkers] = useState<Marker[]>([])
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingMarker, setEditingMarker] = useState<Marker | null>(null)
  const [mapClickCoords, setMapClickCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [mapBounds, setMapBounds] = useState<{ sw: { lat: number; lng: number }; ne: { lat: number; lng: number } } | null>(null)

  const fetchMarkers = async () => {
    const { data } = await supabase.from('markers').select('*').order('created_at', { ascending: false })
    if (data) setMarkers(data)
  }

  useEffect(() => {
    fetchMarkers()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('markers').delete().eq('id', id)
    if (selectedMarkerId === id) setSelectedMarkerId(null)
    fetchMarkers()
  }

  const handleMapMarkerSelect = (id: string) => {
    setSelectedMarkerId(id)
    setShowForm(false)
  }

  const handleMapClick = (lat: number, lng: number) => {
    setMapClickCoords({ lat, lng })
  }

  const visibleMarkers = mapBounds
    ? markers.filter((m) => m.lat >= mapBounds.sw.lat && m.lat <= mapBounds.ne.lat && m.lng >= mapBounds.sw.lng && m.lng <= mapBounds.ne.lng)
    : markers

  const isCreatingMarker = showForm && !editingMarker
  const [listHeight, setListHeight] = useState(200)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const y = ev.clientY - rect.top
      setListHeight(Math.max(80, Math.min(y, rect.height - 100)))
    }
    const onUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* 탭 */}
      <div className="flex border-b border-gray-200 bg-white px-4">
        <button
          onClick={() => setTab('markers')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === 'markers' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          마커/루트
        </button>
        <button
          onClick={() => setTab('paths')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === 'paths' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          경로
        </button>
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          사용자
        </button>
      </div>

      {tab === 'users' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <UserManager />
        </div>
      ) : tab === 'paths' ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 flex-shrink-0 border-r border-gray-200">
            <KakaoMap mode="admin" adminMarkers={markers} />
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <PathManager markers={markers} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* 좌측: 지도 */}
          <div className="w-1/2 flex-shrink-0 border-r border-gray-200">
            <KakaoMap
              mode="admin"
              adminMarkers={markers}
              adminSelectedMarkerId={selectedMarkerId}
              onAdminMarkerSelect={handleMapMarkerSelect}
              onAdminMapClick={handleMapClick}
              isCreatingMarker={isCreatingMarker}
              onBoundsChange={setMapBounds}
            />
          </div>

          {/* 우측: 마커 목록 + 편집 패널 */}
          <div className="flex w-1/2 flex-col overflow-hidden">
            {/* 마커 목록 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
              <h2 className="font-semibold text-gray-900">마커 ({markers.length})</h2>
              <button
                onClick={() => {
                  setEditingMarker(null)
                  setMapClickCoords(null)
                  setShowForm(true)
                }}
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition"
              >
                + 추가
              </button>
            </div>

            {selectedMarkerId ? (
              <div ref={containerRef} className="flex flex-1 flex-col overflow-hidden">
                {/* 마커 목록 (리사이즈 가능) */}
                <div className="flex-shrink-0 overflow-y-auto" style={{ height: listHeight }}>
                  <MarkerList
                    markers={visibleMarkers}
                    selectedId={selectedMarkerId}
                    onSelect={(id) => {
                      setSelectedMarkerId(id)
                    }}
                    onEdit={(m) => {
                      setEditingMarker(m)
                      setShowForm(true)
                    }}
                    onDelete={handleDelete}
                  />
                </div>
                {/* 리사이즈 핸들 */}
                <div
                  onMouseDown={handleDragStart}
                  className="flex h-2 flex-shrink-0 cursor-row-resize items-center justify-center border-y border-gray-200 bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="h-0.5 w-8 rounded-full bg-gray-300" />
                </div>
                {/* 루트 매니저 (볼더만) */}
                {(() => {
                  const selectedMarker = markers.find((m) => m.id === selectedMarkerId)
                  return selectedMarker?.type === 'boulder' ? (
                    <div className="flex-1 overflow-y-auto p-6">
                      <RouteManager markerId={selectedMarkerId} />
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center">
                      <p className="text-sm text-gray-400">
                        {selectedMarker ? `${selectedMarker.name} (${selectedMarker.type})` : ''}
                      </p>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <MarkerList
                  markers={markers}
                  selectedId={selectedMarkerId}
                  onSelect={(id) => {
                    setSelectedMarkerId(id)
                  }}
                  onEdit={(m) => {
                    setEditingMarker(m)
                    setShowForm(true)
                  }}
                  onDelete={handleDelete}
                />
              </div>
            )}

            {/* 마커 추가/수정 모달 */}
            {showForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                  <button
                    onClick={() => { setShowForm(false); setEditingMarker(null); setMapClickCoords(null) }}
                    className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                  >
                    ✕
                  </button>
                  <MarkerForm
                    marker={editingMarker}
                    mapClickCoords={mapClickCoords}
                    onDone={() => {
                      setShowForm(false)
                      setEditingMarker(null)
                      setMapClickCoords(null)
                      fetchMarkers()
                    }}
                    onCancel={() => {
                      setShowForm(false)
                      setEditingMarker(null)
                      setMapClickCoords(null)
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
