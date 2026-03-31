'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Marker } from '@/types'
import MarkerForm from '@/components/admin/MarkerForm'
import MarkerList from '@/components/admin/MarkerList'
import RouteManager from '@/components/admin/RouteManager'
import PathManager from '@/components/admin/PathManager'
import UserManager from '@/components/admin/UserManager'

type Tab = 'markers' | 'paths' | 'users'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('markers')
  const [markers, setMarkers] = useState<Marker[]>([])
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingMarker, setEditingMarker] = useState<Marker | null>(null)

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
          {/* 좌측: 마커 목록 */}
          <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="font-semibold text-gray-900">마커 ({markers.length})</h2>
              <button
                onClick={() => { setEditingMarker(null); setShowForm(true) }}
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition"
              >
                + 추가
              </button>
            </div>
            <MarkerList
              markers={markers}
              selectedId={selectedMarkerId}
              onSelect={(id) => { setSelectedMarkerId(id); setShowForm(false) }}
              onEdit={(m) => { setEditingMarker(m); setShowForm(true) }}
              onDelete={handleDelete}
            />
          </div>

          {/* 우측 */}
          <div className="flex-1 overflow-y-auto p-6">
            {showForm ? (
              <MarkerForm
                marker={editingMarker}
                onDone={() => { setShowForm(false); setEditingMarker(null); fetchMarkers() }}
                onCancel={() => { setShowForm(false); setEditingMarker(null) }}
              />
            ) : selectedMarkerId ? (
              <RouteManager markerId={selectedMarkerId} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray-400">마커를 선택하거나 추가하세요</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
