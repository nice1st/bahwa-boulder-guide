'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { extractGpsFromFile } from '@/lib/exif'
import type { Marker, MarkerType } from '@/types'

interface MarkerFormProps {
  marker: Marker | null
  mapClickCoords?: { lat: number; lng: number } | null
  onDone: () => void
  onCancel: () => void
}

const TYPES: { value: MarkerType; label: string }[] = [
  { value: 'boulder', label: '🪨 볼더' },
  { value: 'parking', label: '🅿️ 주차장' },
  { value: 'toilet', label: '🚻 화장실' },
  { value: 'junction', label: '🔀 갈림길' },
]

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none'

export default function MarkerForm({ marker, mapClickCoords, onDone, onCancel }: MarkerFormProps) {
  const [name, setName] = useState(marker?.name || '')
  const [type, setType] = useState<MarkerType>(marker?.type || 'boulder')
  const [lat, setLat] = useState(marker?.lat?.toString() || '')
  const [lng, setLng] = useState(marker?.lng?.toString() || '')
  const [thumbnailUrl, setThumbnailUrl] = useState(marker?.thumbnail_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [nearbyMarkers, setNearbyMarkers] = useState<Marker[]>([])
  const [showNearby, setShowNearby] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const pinMarker = useRef<any>(null)

  // 관리자 지도에서 클릭한 좌표 반영
  useEffect(() => {
    if (!mapClickCoords) return
    setLat(mapClickCoords.lat.toFixed(6))
    setLng(mapClickCoords.lng.toFixed(6))
    if (mapInstance.current && pinMarker.current) {
      const pos = new window.kakao.maps.LatLng(mapClickCoords.lat, mapClickCoords.lng)
      mapInstance.current.setCenter(pos)
      pinMarker.current.setPosition(pos)
    }
  }, [mapClickCoords])

  // 지도에서 핀 찍기
  useEffect(() => {
    if (!mapRef.current) return

    const initMap = () => {
      const center = lat && lng
        ? new window.kakao.maps.LatLng(Number(lat), Number(lng))
        : new window.kakao.maps.LatLng(37.5665, 126.978)

      const map = new window.kakao.maps.Map(mapRef.current, { center, level: 5 })
      mapInstance.current = map

      const pin = new window.kakao.maps.Marker({ position: center, draggable: true })
      pin.setMap(map)
      pinMarker.current = pin

      window.kakao.maps.event.addListener(pin, 'dragend', () => {
        const pos = pin.getPosition()
        setLat(pos.getLat().toFixed(6))
        setLng(pos.getLng().toFixed(6))
      })

      window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
        const pos = mouseEvent.latLng
        pin.setPosition(pos)
        setLat(pos.getLat().toFixed(6))
        setLng(pos.getLng().toFixed(6))
      })
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

  // 사진에서 GPS 추출 + 업로드
  const handlePhotoGps = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    // 사진 업로드
    const ext = file.name.split('.').pop()
    const path = `markers/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('photos').upload(path, file)
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
      setThumbnailUrl(urlData.publicUrl)
    }
    setUploading(false)

    // GPS 추출
    const gps = await extractGpsFromFile(file)
    if (!gps) {
      alert('사진에 GPS 정보가 없습니다. 지도에서 직접 위치를 지정하세요.')
      return
    }

    setLat(gps.lat.toFixed(6))
    setLng(gps.lng.toFixed(6))

    // 50m 반경 검색
    const { data: allMarkers } = await supabase.from('markers').select('*')
    if (allMarkers) {
      const nearby = allMarkers.filter((m) => haversine(gps.lat, gps.lng, m.lat, m.lng) <= 50)
      if (nearby.length > 0) {
        setNearbyMarkers(nearby)
        setShowNearby(true)
      }
    }

    // 지도 이동
    if (mapInstance.current && pinMarker.current) {
      const pos = new window.kakao.maps.LatLng(gps.lat, gps.lng)
      mapInstance.current.setCenter(pos)
      pinMarker.current.setPosition(pos)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) { alert('이름을 입력하세요'); return }
    if (!lat || !lng) { alert('지도에서 위치를 지정하세요'); return }
    setSaving(true)

    const payload = { name, type, lat: Number(lat), lng: Number(lng), thumbnail_url: thumbnailUrl || null }

    if (marker) {
      await supabase.from('markers').update(payload).eq('id', marker.id)
    } else {
      await supabase.from('markers').insert(payload)
    }

    setSaving(false)
    onDone()
  }

  return (
    <div className="max-w-xl">
      <h2 className="mb-6 text-lg font-bold text-gray-900">{marker ? '마커 수정' : '마커 추가'}</h2>

      {/* 사진 업로드 */}
      <div className="mb-5">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {marker ? '대표 사진 변경' : '사진으로 위치 추출'}
        </label>
        <input type="file" accept="image/*" onChange={handlePhotoGps} className="text-sm text-gray-600" />
        {uploading && <p className="mt-1 text-xs text-blue-500">업로드 중...</p>}
        {thumbnailUrl && (
          <div className="mt-2 relative inline-block">
            <img src={thumbnailUrl} alt="썸네일" className="h-32 rounded-lg object-cover shadow-sm" />
            <button
              type="button"
              onClick={() => setThumbnailUrl('')}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 50m 반경 기존 마커 */}
      {showNearby && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-medium text-amber-800">50m 이내 기존 마커:</p>
          <ul className="space-y-1">
            {nearbyMarkers.map((m) => (
              <li key={m.id} className="text-sm text-amber-700">{m.name} ({m.type})</li>
            ))}
          </ul>
          <button
            onClick={() => setShowNearby(false)}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            무시하고 새 마커 생성
          </button>
        </div>
      )}

      {/* 지도 핀 */}
      <div className="mb-5">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">위치 (지도 클릭 또는 드래그)</label>
        <div ref={mapRef} className="h-64 w-full rounded-xl border border-gray-300 shadow-sm" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">종류</label>
          <select value={type} onChange={(e) => setType(e.target.value as MarkerType)} className={inputClass}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="마커 이름" className={inputClass} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">위도</label>
            <input value={lat} readOnly className={`${inputClass} bg-gray-50`} />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">경도</label>
            <input value={lng} readOnly className={`${inputClass} bg-gray-50`} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40 transition"
          >
            {saving ? '저장 중...' : marker ? '수정' : '생성'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
