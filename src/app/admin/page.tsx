'use client'

import { useEffect, useState } from 'react'
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

  const isCreatingMarker = showForm && !editingMarker

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
        <div className="flex-1 overflow-y-auto p-6">
          <PathManager markers={markers} />
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

            {showForm ? (
              <div className="flex-1 overflow-y-auto p-6">
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
            ) : selectedMarkerId ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* 마커 목록 (축소) */}
                <div className="max-h-48 flex-shrink-0 overflow-y-auto border-b border-gray-200">
                  <MarkerList
                    markers={markers}
                    selectedId={selectedMarkerId}
                    onSelect={(id) => {
                      setSelectedMarkerId(id)
                      setShowForm(false)
                    }}
                    onEdit={(m) => {
                      setEditingMarker(m)
                      setShowForm(true)
                    }}
                    onDelete={handleDelete}
                  />
                </div>
                {/* 루트 매니저 */}
                <div className="flex-1 overflow-y-auto p-6">
                  <RouteManager markerId={selectedMarkerId} />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <MarkerList
                  markers={markers}
                  selectedId={selectedMarkerId}
                  onSelect={(id) => {
                    setSelectedMarkerId(id)
                    setShowForm(false)
                  }}
                  onEdit={(m) => {
                    setEditingMarker(m)
                    setShowForm(true)
                  }}
                  onDelete={handleDelete}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
