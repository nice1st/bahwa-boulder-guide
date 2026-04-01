'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Route } from '@/types'

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none'

interface RouteManagerProps {
  markerId: string
}

export default function RouteManager({ markerId }: RouteManagerProps) {
  const [routes, setRoutes] = useState<Route[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)

  const fetchRoutes = async () => {
    const { data } = await supabase
      .from('routes')
      .select('*')
      .eq('marker_id', markerId)
      .order('grade')
    if (data) setRoutes(data)
  }

  useEffect(() => {
    fetchRoutes()
  }, [markerId])

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('routes').delete().eq('id', id)
    fetchRoutes()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">루트 관리</h2>
        <button
          onClick={() => { setEditingRoute(null); setShowForm(true) }}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition"
        >
          + 루트 추가
        </button>
      </div>

      {showForm && (
        <RouteForm
          markerId={markerId}
          route={editingRoute}
          onDone={() => { setShowForm(false); setEditingRoute(null); fetchRoutes() }}
          onCancel={() => { setShowForm(false); setEditingRoute(null) }}
        />
      )}

      {routes.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">등록된 루트가 없습니다</p>
      ) : (
        <ul className="space-y-2">
          {routes.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{r.name}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{r.grade}</span>
                  <span className="text-xs text-gray-500">패드 {r.min_pads}개</span>
                </div>
                {r.description && <p className="mt-1 text-sm text-gray-500 truncate">{r.description}</p>}
                <div className="mt-1 text-xs text-gray-400">
                  사진 {r.photo_urls.length}장 | 영상 {r.video_urls.length}개
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0 ml-4">
                <button
                  onClick={() => { setEditingRoute(r); setShowForm(true) }}
                  className="rounded-lg px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 transition"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
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

function RouteForm({
  markerId,
  route,
  onDone,
  onCancel,
}: {
  markerId: string
  route: Route | null
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(route?.name || '')
  const [grade, setGrade] = useState(route?.grade || 'V0')
  const [description, setDescription] = useState(route?.description || '')
  const [minPads, setMinPads] = useState(route?.min_pads?.toString() || '0')
  const [photoUrls, setPhotoUrls] = useState(route?.photo_urls?.join('\n') || '')
  const [videoUrls, setVideoUrls] = useState(route?.video_urls?.join('\n') || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setUploading(true)

    const { resizeImage } = await import('@/lib/resizeImage')
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const resized = await resizeImage(file)
      const ext = resized.name.split('.').pop()
      const path = `routes/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('photos').upload(path, resized)
      if (!error) {
        const { data } = supabase.storage.from('photos').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }

    setPhotoUrls((prev) => [prev, ...urls].filter(Boolean).join('\n'))
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) { alert('이름을 입력하세요'); return }
    setSaving(true)

    const photos = photoUrls.split('\n').map((s) => s.trim()).filter(Boolean)
    const videos = videoUrls.split('\n').map((s) => s.trim()).filter(Boolean)
    const payload = {
      marker_id: markerId,
      name,
      grade,
      description: description || null,
      min_pads: Number(minPads) || 0,
      photo_urls: photos,
      video_urls: videos,
    }

    if (route) {
      await supabase.from('routes').update(payload).eq('id', route.id)
    } else {
      await supabase.from('routes').insert(payload)
    }

    setSaving(false)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900">{route ? '루트 수정' : '루트 추가'}</h3>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="루트 이름" className={inputClass} />
        </div>
        <div className="w-24">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">난이도</label>
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputClass}>
            {Array.from({ length: 18 }, (_, i) => (
              <option key={i} value={`V${i}`}>V{i}</option>
            ))}
          </select>
        </div>
        <div className="w-20">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">패드</label>
          <input type="number" min="0" value={minPads} onChange={(e) => setMinPads(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">설명</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          rows={2} placeholder="루트 설명 (선택)" className={inputClass} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">사진 업로드</label>
        <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="text-sm text-gray-600" />
        {uploading && <p className="mt-1 text-xs text-blue-500">업로드 중...</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">사진 URL (줄바꿈 구분)</label>
        <textarea value={photoUrls} onChange={(e) => setPhotoUrls(e.target.value)}
          rows={2} placeholder="https://..." className={`${inputClass} font-mono text-xs`} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">영상 URL (줄바꿈 구분)</label>
        <textarea value={videoUrls} onChange={(e) => setVideoUrls(e.target.value)}
          rows={2} placeholder="https://youtube.com/..." className={`${inputClass} font-mono text-xs`} />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40 transition">
          {saving ? '저장 중...' : route ? '수정' : '추가'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
          취소
        </button>
      </div>
    </form>
  )
}
