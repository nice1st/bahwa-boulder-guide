export const dynamic = 'force-dynamic'

import Header from '@/components/Header'
import KakaoMap from '@/components/KakaoMap'

export default function Home() {
  return (
    <main className="flex h-full w-full flex-col">
      <Header />
      <div className="relative flex-1 overflow-hidden">
        <KakaoMap />
      </div>
    </main>
  )
}
