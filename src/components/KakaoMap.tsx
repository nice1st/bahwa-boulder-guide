'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Marker, Route, Path } from '@/types'
import MarkerPanel from './MarkerPanel'

declare global {
  interface Window {
    kakao: any
  }
}

const MARKER_ICONS: Record<string, string> = {
  boulder: '🪨',
  parking: '🅿️',
  toilet: '🚻',
  junction: '🔀',
}

function clusterMarkers(
  markers: Marker[],
  map: any,
  clusterRadius: number,
): { center: { lat: number; lng: number }; markers: Marker[] }[] {
  const proj = map.getProjection()
  const clusters: { center: { lat: number; lng: number }; markers: Marker[]; point: any }[] = []

  markers.forEach((m) => {
    const pos = new window.kakao.maps.LatLng(m.lat, m.lng)
    const point = proj.containerPointFromCoords(pos)

    let added = false
    for (const cluster of clusters) {
      const dx = point.x - cluster.point.x
      const dy = point.y - cluster.point.y
      if (Math.sqrt(dx * dx + dy * dy) < clusterRadius) {
        cluster.markers.push(m)
        added = true
        break
      }
    }

    if (!added) {
      clusters.push({ center: { lat: m.lat, lng: m.lng }, markers: [m], point })
    }
  })

  return clusters
}

export default function KakaoMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const overlaysRef = useRef<any[]>([])
  const polylinesRef = useRef<any[]>([])
  const [markers, setMarkers] = useState<Marker[]>([])
  const [paths, setPaths] = useState<Path[]>([])
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [gradeFilter, setGradeFilter] = useState('')
  const [padFilter, setPadFilter] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)
  const [activePath, setActivePath] = useState<string | null>(null)
  const [allRoutes, setAllRoutes] = useState<Route[]>([])

  // 최신 state를 ref로 유지 (이벤트 리스너에서 참조)
  const markersRef = useRef(markers)
  markersRef.current = markers
  const allRoutesRef = useRef(allRoutes)
  allRoutesRef.current = allRoutes
  const gradeFilterRef = useRef(gradeFilter)
  gradeFilterRef.current = gradeFilter
  const padFilterRef = useRef(padFilter)
  padFilterRef.current = padFilter
  const selectedMarkerRef = useRef(selectedMarker)
  selectedMarkerRef.current = selectedMarker

  // 데이터 fetch
  useEffect(() => {
    supabase.from('markers').select('*').then(({ data }) => {
      if (data) setMarkers(data)
    })
    supabase.from('paths').select('*').then(({ data }) => {
      if (data) setPaths(data)
    })
    supabase.from('routes').select('*').then(({ data }) => {
      if (data) setAllRoutes(data)
    })
  }, [])

  // 카카오 SDK 로드 대기
  useEffect(() => {
    const wait = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => setMapReady(true))
      } else {
        setTimeout(wait, 100)
      }
    }
    wait()
  }, [])

  const handleMarkerClick = useCallback(async (marker: Marker) => {
    setSelectedMarker(marker)
    setPanelVisible(true)

    if (mapInstance.current && mapRef.current) {
      const map = mapInstance.current
      const markerPos = new window.kakao.maps.LatLng(marker.lat, marker.lng)

      const applyOffset = () => {
        const proj = map.getProjection()
        const point = proj.containerPointFromCoords(markerPos)
        const mapHeight = mapRef.current!.clientHeight
        const panelHeight = mapHeight * 0.6
        const visibleHeight = mapHeight - panelHeight
        const targetY = visibleHeight / 2
        const dy = point.y - targetY
        const center = map.getCenter()
        const centerPoint = proj.containerPointFromCoords(center)
        centerPoint.y += dy
        const newCenter = proj.coordsFromContainerPoint(centerPoint)
        map.panTo(newCenter)
      }

      const currentLevel = map.getLevel()
      if (currentLevel > 4) {
        // 먼저 마커 위치로 중심 이동 + 줌 (애니메이션 없이 즉시)
        map.setCenter(markerPos)
        map.setLevel(4)
        // 줌 완료 후 패널 오프셋 적용
        setTimeout(applyOffset, 50)
      } else {
        // 줌 변경 없이 오프셋만 적용
        applyOffset()
      }
    }

    if (marker.type === 'boulder') {
      const { data } = await supabase
        .from('routes')
        .select('*')
        .eq('marker_id', marker.id)
        .order('grade')
      if (data) setRoutes(data)
    } else {
      setRoutes([])
    }
  }, [])

  const handleClose = useCallback(() => {
    setPanelVisible(false)
    setActivePath(null)
    setTimeout(() => setSelectedMarker(null), 300)
  }, [])

  const handleTogglePath = useCallback((markerId: string) => {
    setActivePath((prev) => (prev === markerId ? null : markerId))
  }, [])

  // ref 기반 renderMarkers — 이벤트 리스너에서 항상 최신 state 참조
  const renderMarkersRef = useRef<() => void>(() => {})

  const handleMarkerClickRef = useRef(handleMarkerClick)
  handleMarkerClickRef.current = handleMarkerClick

  renderMarkersRef.current = () => {
    if (!mapInstance.current || !mapReady) return

    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    const map = mapInstance.current
    const currentMarkers = markersRef.current
    const currentAllRoutes = allRoutesRef.current
    const currentGradeFilter = gradeFilterRef.current
    const currentPadFilter = padFilterRef.current

    const filteredMarkers = currentMarkers.filter((m) => {
      if (m.type !== 'boulder') return true
      if (!currentGradeFilter && !currentPadFilter) return true

      const mRoutes = currentAllRoutes.filter((r) => r.marker_id === m.id)
      if (mRoutes.length === 0) return false

      return mRoutes.some((r) => {
        if (currentGradeFilter && r.grade !== currentGradeFilter) return false
        if (currentPadFilter && r.min_pads > Number(currentPadFilter)) return false
        return true
      })
    })

    const clusters = clusterMarkers(filteredMarkers, map, 40)

    clusters.forEach((cluster) => {
      const position = new window.kakao.maps.LatLng(cluster.center.lat, cluster.center.lng)

      if (cluster.markers.length === 1) {
        const m = cluster.markers[0]
        const el = document.createElement('div')
        el.style.cssText = `
          cursor: pointer;
          font-size: 28px;
          line-height: 1;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
          transition: transform 0.15s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
          padding: 8px;
        `
        el.textContent = MARKER_ICONS[m.type] || '📍'
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)' })
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
        el.addEventListener('click', (e) => { e.stopPropagation(); handleMarkerClickRef.current(m) })
        el.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); handleMarkerClickRef.current(m) })

        const overlay = new window.kakao.maps.CustomOverlay({ position: new window.kakao.maps.LatLng(m.lat, m.lng), content: el, yAnchor: 1 })
        overlay.setMap(map)
        overlaysRef.current.push(overlay)
      } else {
        const el = document.createElement('div')
        el.style.cssText = `
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #3b82f6;
          color: white;
          font-size: 14px;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
        `
        el.textContent = String(cluster.markers.length)
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          const level = map.getLevel()
          map.setLevel(Math.max(1, level - 2), { anchor: position, animate: true })
        })
        el.addEventListener('touchend', (e) => {
          e.preventDefault()
          e.stopPropagation()
          const level = map.getLevel()
          map.setLevel(Math.max(1, level - 2), { anchor: position, animate: true })
        })

        const overlay = new window.kakao.maps.CustomOverlay({ position, content: el, yAnchor: 0.5 })
        overlay.setMap(map)
        overlaysRef.current.push(overlay)
      }
    })
  }

  // 지도 초기화 (한 번만)
  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    if (mapInstance.current) return

    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(37.5665, 126.978),
      level: 10,
    })
    mapInstance.current = map

    // 이벤트 리스너는 ref를 통해 항상 최신 함수 호출
    window.kakao.maps.event.addListener(map, 'zoom_changed', () => renderMarkersRef.current())
    window.kakao.maps.event.addListener(map, 'idle', () => renderMarkersRef.current())
    window.kakao.maps.event.addListener(map, 'click', () => {
      if (selectedMarkerRef.current) handleClose()
    })

    renderMarkersRef.current()
  }, [mapReady, handleClose])

  // markers/filter 변경 시 다시 렌더
  useEffect(() => {
    renderMarkersRef.current()
  }, [markers, allRoutes, gradeFilter, padFilter])

  // 어프로치 경로 폴리라인 표시
  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null))
    polylinesRef.current = []

    if (!mapInstance.current || !mapReady || !activePath) return

    const markerPaths = paths.filter((p) => {
      return p.waypoints.some((wp) => wp.marker_id === activePath)
    })

    markerPaths.forEach((p) => {
      const linePath = p.waypoints.map((wp) => new window.kakao.maps.LatLng(wp.lat, wp.lng))
      const polyline = new window.kakao.maps.Polyline({
        map: mapInstance.current,
        path: linePath,
        strokeWeight: 6,
        strokeColor: '#ef4444',
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
      })
      polylinesRef.current.push(polyline)
    })
  }, [activePath, paths, mapReady])

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      {/* 필터 */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <select
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-md"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
        >
          <option value="">난이도 전체</option>
          {Array.from({ length: 18 }, (_, i) => (
            <option key={i} value={`V${i}`}>V{i}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-md"
          value={padFilter}
          onChange={(e) => setPadFilter(e.target.value)}
        >
          <option value="">패드 전체</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={String(n)}>{n}개 이하</option>
          ))}
        </select>
      </div>

      {/* 마커 상세 패널 */}
      {selectedMarker && (
        <MarkerPanel
          marker={selectedMarker}
          routes={routes}
          gradeFilter={gradeFilter}
          padFilter={padFilter}
          visible={panelVisible}
          activePath={activePath}
          onTogglePath={handleTogglePath}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
