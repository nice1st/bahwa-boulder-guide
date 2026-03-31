'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Path, Marker } from '@/types'

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none'

interface PathManagerProps {
  markers: Marker[]
}

export default function PathManager({ markers }: PathManagerProps) {
  const [paths, setPaths] = useState<Path[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingPath, setEditingPath] = useState<Path | null>(null)

  const fetchPaths = async () => {
    const { data } = await supabase.from('paths').select('*').order('created_at', { ascending: false })
    if (data) setPaths(data)
  }

  useEffect(() => {
    fetchPaths()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('paths').delete().eq('id', id)
    fetchPaths()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">경로 관리</h2>
        <button
          onClick={() => { setEditingPath(null); setShowForm(true) }}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition"
        >
          + 경로 추가
        </button>
      </div>

      {showForm && (
        <PathForm
          markers={markers}
          path={editingPath}
          onDone={() => { setShowForm(false); setEditingPath(null); fetchPaths() }}
          onCancel={() => { setShowForm(false); setEditingPath(null) }}
        />
      )}

      {paths.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">등록된 경로가 없습니다</p>
      ) : (
        <ul className="space-y-2">
          {paths.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div>
                <div className="font-medium text-gray-900">{p.name || '이름 없음'}</div>
                <div className="text-xs text-gray-500">
                  경유지 {p.waypoints.length}개
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingPath(p); setShowForm(true) }}
                  className="rounded-lg px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 transition"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded-lg px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PathForm({
  markers,
  path,
  onDone,
  onCancel,
}: {
  markers: Marker[]
  path: Path | null
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(path?.name || '')
  const [waypoints, setWaypoints] = useState(path?.waypoints || [])
  const [saving, setSaving] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const polylineRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current) return

    const initMap = () => {
      const center = waypoints.length > 0
        ? new window.kakao.maps.LatLng(waypoints[0].lat, waypoints[0].lng)
        : new window.kakao.maps.LatLng(37.5665, 126.978)

      const map = new window.kakao.maps.Map(mapRef.current, { center, level: 5 })
      mapInstance.current = map

      // 기존 마커 표시 (클릭으로 waypoint 추가)
      markers.forEach((m) => {
        const pos = new window.kakao.maps.LatLng(m.lat, m.lng)
        const marker = new window.kakao.maps.Marker({ position: pos, map })
        window.kakao.maps.event.addListener(marker, 'click', () => {
          setWaypoints((prev) => [...prev, { lat: m.lat, lng: m.lng, marker_id: m.id }])
        })
      })

      // 지도 클릭으로 자유 좌표 추가
      window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
        const pos = mouseEvent.latLng
        setWaypoints((prev) => [...prev, { lat: pos.getLat(), lng: pos.getLng() }])
      })

      drawPolyline(map, waypoints)
    }

    const waitForKakao = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(initMap)
      } else {
        setTimeout(waitForKakao, 100)
      }
    }
    waitForKakao()
  }, [])

  // waypoints 변경 시 폴리라인 업데이트
  useEffect(() => {
    if (mapInstance.current) {
      drawPolyline(mapInstance.current, waypoints)
    }
  }, [waypoints])

  const drawPolyline = (map: any, wps: typeof waypoints) => {
    if (polylineRef.current) polylineRef.current.setMap(null)
    if (wps.length < 2) return

    const linePath = wps.map((wp) => new window.kakao.maps.LatLng(wp.lat, wp.lng))
    polylineRef.current = new window.kakao.maps.Polyline({
      map,
      path: linePath,
      strokeWeight: 4,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.7,
      strokeStyle: 'solid',
    })
  }

  const removeWaypoint = (index: number) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (waypoints.length < 2) { alert('경유지를 2개 이상 추가하세요'); return }
    setSaving(true)

    const payload = { name: name || null, waypoints }

    if (path) {
      await supabase.from('paths').update(payload).eq('id', path.id)
    } else {
      await supabase.from('paths').insert(payload)
    }

    setSaving(false)
    onDone()
  }

  const markerName = (wp: typeof waypoints[0]) => {
    if (wp.marker_id) {
      const m = markers.find((m) => m.id === wp.marker_id)
      return m?.name || wp.marker_id.slice(0, 6)
    }
    return `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900">{path ? '경로 수정' : '경로 추가'}</h3>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">이름</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="경로 이름 (선택)" className={inputClass} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          지도에서 마커 또는 빈 곳을 순서대로 클릭하세요
        </label>
        <div ref={mapRef} className="h-64 w-full rounded-xl border border-gray-300 shadow-sm" />
      </div>

      {waypoints.length > 0 && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">경유지 ({waypoints.length})</label>
          <ol className="space-y-1">
            {waypoints.map((wp, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-700">
                  {i + 1}. {markerName(wp)}
                </span>
                <button
                  type="button"
                  onClick={() => removeWaypoint(i)}
                  className="text-xs text-red-500 hover:underline"
                >
                  삭제
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setWaypoints([])}
            className="mt-2 text-xs text-red-500 hover:underline"
          >
            전체 초기화
          </button>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40 transition">
          {saving ? '저장 중...' : path ? '수정' : '추가'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
          취소
        </button>
      </div>
    </form>
  )
}
