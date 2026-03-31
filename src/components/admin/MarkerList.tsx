'use client'

import type { Marker } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  boulder: '🪨 볼더',
  parking: '🅿️ 주차장',
  toilet: '🚻 화장실',
  junction: '🔀 갈림길',
}

interface MarkerListProps {
  markers: Marker[]
  selectedId: string | null
  onSelect: (id: string) => void
  onEdit: (marker: Marker) => void
  onDelete: (id: string) => void
}

export default function MarkerList({ markers, selectedId, onSelect, onEdit, onDelete }: MarkerListProps) {
  if (markers.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-gray-400">마커가 없습니다</p>
  }

  return (
    <ul>
      {markers.map((m) => (
        <li
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={`flex cursor-pointer items-center justify-between border-b border-gray-100 px-4 py-3 transition hover:bg-gray-50 ${
            selectedId === m.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
          }`}
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{m.name}</div>
            <div className="text-xs text-gray-500">{TYPE_LABELS[m.type]}</div>
          </div>
          <div className="flex gap-1 flex-shrink-0 ml-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(m) }}
              className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 transition"
            >
              수정
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(m.id) }}
              className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 transition"
            >
              삭제
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
