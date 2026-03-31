'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

export default function UserManager() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProfiles = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProfiles(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  const updateRole = async (id: string, newRole: UserRole) => {
    if (!confirm(`${newRole === 'admin' ? '관리자로 승격' : '일반 사용자로 변경'}하시겠습니까?`)) return
    await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    fetchProfiles()
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-gray-400">로딩 중...</p>
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 text-lg font-bold text-gray-900">사용자 관리 ({profiles.length})</h2>

      {profiles.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">등록된 사용자가 없습니다</p>
      ) : (
        <ul className="space-y-2">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-400">
                    ?
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900">{p.display_name || '이름 없음'}</div>
                  <div className="text-xs text-gray-500">{p.id.slice(0, 8)}...</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  p.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {p.role === 'admin' ? '관리자' : '사용자'}
                </span>
                {p.role === 'user' ? (
                  <button
                    onClick={() => updateRole(p.id, 'admin')}
                    className="rounded-lg px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 transition"
                  >
                    승격
                  </button>
                ) : (
                  <button
                    onClick={() => updateRole(p.id, 'user')}
                    className="rounded-lg px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition"
                  >
                    강등
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
