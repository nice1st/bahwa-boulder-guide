'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Marker, Route, Path } from '@/types'

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

interface KakaoMapProps {
  mode?: 'user' | 'admin'
  // 사용자: 외부 state (page.tsx에서 관리)
  gradeFilters?: string[]
  padFilter?: string
  onGradeFiltersChange?: (filters: string[]) => void
  onPadFilterChange?: (filter: string) => void
  activePath?: string | null
  onMarkerSelect?: (marker: Marker, routes: Route[]) => void
  panelOpen?: boolean
  // 어드민
  adminMarkers?: Marker[]
  adminSelectedMarkerId?: string | null
  onAdminMarkerSelect?: (id: string) => void
  onAdminMapClick?: (lat: number, lng: number) => void
  isCreatingMarker?: boolean
  onBoundsChange?: (bounds: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }) => void
}

export default function KakaoMap({
  mode = 'user',
  gradeFilters: externalGradeFilters,
  padFilter: externalPadFilter,
  onGradeFiltersChange,
  onPadFilterChange,
  activePath: externalActivePath,
  onMarkerSelect,
  panelOpen = false,
  adminMarkers,
  adminSelectedMarkerId,
  onAdminMarkerSelect,
  onAdminMapClick,
  isCreatingMarker = false,
  onBoundsChange,
}: KakaoMapProps = {}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const overlaysRef = useRef<any[]>([])
  const polylinesRef = useRef<any[]>([])
  const [internalMarkers, setInternalMarkers] = useState<Marker[]>([])
  const [paths, setPaths] = useState<Path[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [allRoutes, setAllRoutes] = useState<Route[]>([])
  const [filterOpen, setFilterOpen] = useState(false)

  const isAdmin = mode === 'admin'
  const markers = isAdmin ? (adminMarkers || []) : internalMarkers
  const gradeFilters = externalGradeFilters || []
  const padFilter = externalPadFilter || ''
  const activePath = externalActivePath || null

  // 최신 state를 ref로 유지 (이벤트 리스너에서 참조)
  const markersRef = useRef(markers)
  markersRef.current = markers
  const allRoutesRef = useRef(allRoutes)
  allRoutesRef.current = allRoutes
  const gradeFiltersRef = useRef(gradeFilters)
  gradeFiltersRef.current = gradeFilters
  const padFilterRef = useRef(padFilter)
  padFilterRef.current = padFilter
  const adminSelectedMarkerIdRef = useRef(adminSelectedMarkerId)
  adminSelectedMarkerIdRef.current = adminSelectedMarkerId
  const onAdminMarkerSelectRef = useRef(onAdminMarkerSelect)
  onAdminMarkerSelectRef.current = onAdminMarkerSelect
  const onAdminMapClickRef = useRef(onAdminMapClick)
  onAdminMapClickRef.current = onAdminMapClick
  const isCreatingMarkerRef = useRef(isCreatingMarker)
  isCreatingMarkerRef.current = isCreatingMarker
  const onBoundsChangeRef = useRef(onBoundsChange)
  onBoundsChangeRef.current = onBoundsChange
  const onMarkerSelectRef = useRef(onMarkerSelect)
  onMarkerSelectRef.current = onMarkerSelect
  // 데이터 fetch (사용자 모드만)
  useEffect(() => {
    if (isAdmin) return
    supabase.from('markers').select('*').then(({ data }) => {
      if (data) setInternalMarkers(data)
    })
    supabase.from('paths').select('*').then(({ data }) => {
      if (data) setPaths(data)
    })
    supabase.from('routes').select('*').then(({ data }) => {
      if (data) setAllRoutes(data)
    })
  }, [isAdmin])

  // 어드민: 외부 마커 변경 시 routes도 로드
  useEffect(() => {
    if (!isAdmin) return
    supabase.from('paths').select('*').then(({ data }) => {
      if (data) setPaths(data)
    })
    supabase.from('routes').select('*').then(({ data }) => {
      if (data) setAllRoutes(data)
    })
  }, [isAdmin, adminMarkers])

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
    if (isAdmin) {
      onAdminMarkerSelectRef.current?.(marker.id)
      return
    }

    // 지도 카메라 이동
    if (mapInstance.current && mapRef.current) {
      const map = mapInstance.current
      const markerPos = new window.kakao.maps.LatLng(marker.lat, marker.lng)

      const currentLevel = map.getLevel()
      if (currentLevel > 4) {
        map.setLevel(4)
      }
      const proj = map.getProjection()
      map.setCenter(markerPos)
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
      map.setCenter(newCenter)
    }

    // 루트 fetch 후 외부 콜백
    let fetchedRoutes: Route[] = []
    if (marker.type === 'boulder') {
      const { data } = await supabase
        .from('routes')
        .select('*')
        .eq('marker_id', marker.id)
        .order('grade')
      if (data) fetchedRoutes = data
    }
    onMarkerSelectRef.current?.(marker, fetchedRoutes)
  }, [isAdmin])

  const gpsOverlayRef = useRef<any>(null)

  const handleGpsClick = useCallback(() => {
    if (!navigator.geolocation) {
      alert('위치 정보를 지원하지 않는 브라우저입니다.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (mapInstance.current) {
          const loc = new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)
          mapInstance.current.setCenter(loc)
          if (mapInstance.current.getLevel() > 4) {
            mapInstance.current.setLevel(4)
          }

          // 기존 위치 마커 제거
          if (gpsOverlayRef.current) gpsOverlayRef.current.setMap(null)

          // 파란 점 표시
          const el = document.createElement('div')
          el.style.cssText = `
            width: 16px; height: 16px; border-radius: 50%;
            background: #3b82f6; border: 3px solid white;
            box-shadow: 0 0 8px rgba(59,130,246,0.6);
            pointer-events: none;
          `
          gpsOverlayRef.current = new window.kakao.maps.CustomOverlay({
            position: loc, content: el, yAnchor: 0.5, xAnchor: 0.5, zIndex: 100,
          })
          gpsOverlayRef.current.setMap(mapInstance.current)
        }
      },
      () => alert('위치 권한을 허용해 주세요.'),
      { enableHighAccuracy: true }
    )
  }, [])

  // ref 기반 renderMarkers
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
    const currentGradeFilters = gradeFiltersRef.current
    const currentPadFilter = padFilterRef.current
    const currentAdminSelectedId = adminSelectedMarkerIdRef.current

    const currentLevel = map.getLevel()

    // 비볼더 마커: 줌 레벨 5 이하(가까이)에서만 표시, 클러스터링 제외
    const nonBoulderMarkers = currentMarkers.filter((m) => m.type !== 'boulder')
    if (currentLevel <= 5) {
      nonBoulderMarkers.forEach((m) => {
        const el = document.createElement('div')
        el.style.cssText = `
          cursor: pointer;
          font-size: 17px;
          line-height: 1;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
          transition: transform 0.15s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
          padding: 6px;
        `
        el.textContent = MARKER_ICONS[m.type] || '📍'
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)' })
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
        el.addEventListener('click', (e) => { e.stopPropagation(); handleMarkerClickRef.current(m) })
        el.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); handleMarkerClickRef.current(m) })

        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(m.lat, m.lng), content: el, yAnchor: 1,
        })
        overlay.setMap(map)
        overlaysRef.current.push(overlay)
      })
    }

    // 볼더 마커: 필터 적용 + 클러스터링
    const boulderMarkers = currentMarkers.filter((m) => {
      if (m.type !== 'boulder') return false
      if (currentGradeFilters.length === 0 && !currentPadFilter) return true

      const mRoutes = currentAllRoutes.filter((r) => r.marker_id === m.id)
      if (mRoutes.length === 0) return false

      return mRoutes.some((r) => {
        if (currentGradeFilters.length > 0) {
          const isV10Plus = ['V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'].includes(r.grade)
          const matches = currentGradeFilters.some((f) => (f === 'V10+' ? isV10Plus : f === r.grade))
          if (!matches) return false
        }
        if (currentPadFilter && r.min_pads > Number(currentPadFilter)) return false
        return true
      })
    })

    const clusters = clusterMarkers(boulderMarkers, map, 40)

    clusters.forEach((cluster) => {
      const position = new window.kakao.maps.LatLng(cluster.center.lat, cluster.center.lng)

      if (cluster.markers.length === 1) {
        const m = cluster.markers[0]
        const isSelected = isAdmin && m.id === currentAdminSelectedId
        const el = document.createElement('div')
        el.style.cssText = `
          cursor: pointer;
          font-size: ${isSelected ? '36px' : '28px'};
          line-height: 1;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
          transition: transform 0.15s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
          padding: 8px;
          ${isSelected ? 'transform: scale(1.2); filter: drop-shadow(0 0 6px rgba(59,130,246,0.8));' : ''}
        `
        el.textContent = MARKER_ICONS[m.type] || '📍'
        el.addEventListener('mouseenter', () => {
          if (!isAdmin || m.id !== currentAdminSelectedId) el.style.transform = 'scale(1.3)'
        })
        el.addEventListener('mouseleave', () => {
          if (!isAdmin || m.id !== currentAdminSelectedId) el.style.transform = isSelected ? 'scale(1.2)' : 'scale(1)'
        })
        el.addEventListener('click', (e) => { e.stopPropagation(); handleMarkerClickRef.current(m) })
        el.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); handleMarkerClickRef.current(m) })

        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(m.lat, m.lng),
          content: el,
          yAnchor: 1,
          zIndex: isSelected ? 10 : 1,
        })
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
        const zoomToCluster = () => {
          const bounds = new window.kakao.maps.LatLngBounds()
          cluster.markers.forEach((m) => bounds.extend(new window.kakao.maps.LatLng(m.lat, m.lng)))
          map.setBounds(bounds, 80)
        }
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          zoomToCluster()
        })
        el.addEventListener('touchend', (e) => {
          e.preventDefault()
          e.stopPropagation()
          zoomToCluster()
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

    window.kakao.maps.event.addListener(map, 'zoom_changed', () => renderMarkersRef.current())
    window.kakao.maps.event.addListener(map, 'idle', () => renderMarkersRef.current())

    const reportBounds = () => {
      if (!onBoundsChangeRef.current) return
      const bounds = map.getBounds()
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      onBoundsChangeRef.current({
        sw: { lat: sw.getLat(), lng: sw.getLng() },
        ne: { lat: ne.getLat(), lng: ne.getLng() },
      })
    }
    window.kakao.maps.event.addListener(map, 'idle', reportBounds)

    // 지도 클릭
    window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
      if (isCreatingMarkerRef.current) {
        const latlng = mouseEvent.latLng
        onAdminMapClickRef.current?.(latlng.getLat(), latlng.getLng())
      }
    })

    renderMarkersRef.current()
  }, [mapReady])

  // 패널 열림/닫힘에 따라 지도 드래그·줌 제어 (이벤트 전파 대신 API 직접 제어)
  useEffect(() => {
    if (!mapInstance.current || !mapReady || isAdmin) return
    mapInstance.current.setDraggable(!panelOpen)
    mapInstance.current.setZoomable(!panelOpen)
  }, [panelOpen, mapReady, isAdmin])

  // 패널 열릴 때 필터 닫기
  useEffect(() => {
    if (panelOpen) setFilterOpen(false)
  }, [panelOpen])

  // markers/filter/선택 변경 시 다시 렌더
  useEffect(() => {
    renderMarkersRef.current()
  }, [markers, allRoutes, gradeFilters, padFilter, adminSelectedMarkerId])

  // 어드민: 선택된 마커로 지도 이동
  useEffect(() => {
    if (!isAdmin || !adminSelectedMarkerId || !mapInstance.current || !mapReady) return
    const marker = markers.find((m) => m.id === adminSelectedMarkerId)
    if (!marker) return

    const map = mapInstance.current
    const pos = new window.kakao.maps.LatLng(marker.lat, marker.lng)
    const currentLevel = map.getLevel()
    if (currentLevel > 5) {
      map.setCenter(pos)
      map.setLevel(5)
      // setLevel 후 재렌더 필요
      setTimeout(() => renderMarkersRef.current(), 50)
    } else {
      map.panTo(pos)
    }
  }, [isAdmin, adminSelectedMarkerId, markers, mapReady])

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

      {/* 어드민: 마커 생성 모드 배너 */}
      {isAdmin && isCreatingMarker && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          지도를 클릭하여 위치를 지정하세요
        </div>
      )}

      {/* 사용자 모드 UI */}
      {!isAdmin && (
        <>
          {/* 필터 버튼 + 팝업 패널 */}
          {(() => {
            const activeCount = gradeFilters.length + (padFilter ? 1 : 0)
            return (
              <div
                data-overlay-ui
                className="absolute top-4 left-4 z-10"
                onClick={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setFilterOpen((o) => !o)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold shadow-md transition-colors ${
                    activeCount > 0
                      ? 'bg-blue-600 border border-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-6.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                  </svg>
                  필터
                  {activeCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-600">
                      {activeCount}
                    </span>
                  )}
                </button>

                {filterOpen && (
                  <div className="absolute left-0 top-10 w-60 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">난이도</span>
                      {activeCount > 0 && (
                        <button
                          onClick={() => { onGradeFiltersChange?.([]); onPadFilterChange?.('') }}
                          className="text-xs text-blue-500 font-medium hover:text-blue-700"
                        >
                          초기화
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1 mb-3">
                      {['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10+'].map((g) => {
                        const isActive = gradeFilters.includes(g)
                        return (
                          <button
                            key={g}
                            onClick={() =>
                              onGradeFiltersChange?.(
                                gradeFilters.includes(g) ? gradeFilters.filter((f) => f !== g) : [...gradeFilters, g]
                              )
                            }
                            className={`rounded-lg py-1 text-xs font-semibold transition-colors ${
                              g === 'V10+' ? 'col-span-2' : ''
                            } ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {g}
                          </button>
                        )
                      })}
                    </div>
                    <div className="border-t border-gray-100 pt-2">
                      <span className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">최소 패드</span>
                      <select
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-400"
                        value={padFilter}
                        onChange={(e) => onPadFilterChange?.(e.target.value)}
                      >
                        <option value="">전체</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={String(n)}>{n}개 이하</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* GPS 버튼 */}
          <button
            data-overlay-ui
            onClick={(e) => {
              e.stopPropagation()
              handleGpsClick()
            }}
            onTouchEnd={(e) => e.stopPropagation()}
            className="absolute bottom-6 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-white pb-1 pl-0.5 text-2xl shadow-lg active:bg-gray-50"
          >
            🎯
          </button>

        </>
      )}
    </div>
  )
}
