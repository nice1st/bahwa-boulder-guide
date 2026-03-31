export type MarkerType = 'boulder' | 'parking' | 'toilet' | 'junction'

export interface Marker {
  id: string
  type: MarkerType
  name: string
  lat: number
  lng: number
  thumbnail_url: string | null
  created_at: string
}

export interface Route {
  id: string
  marker_id: string
  name: string
  grade: string
  description: string | null
  min_pads: number
  photo_urls: string[]
  video_urls: string[]
  created_at: string
}

export interface Path {
  id: string
  name: string | null
  waypoints: { lat: number; lng: number; marker_id?: string }[]
  created_at: string
}

export interface Comment {
  id: string
  route_id: string
  content: string
  created_at: string
}

export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  role: UserRole
  display_name: string | null
  avatar_url: string | null
  created_at: string
}
