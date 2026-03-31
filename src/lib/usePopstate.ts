import { useEffect } from 'react'

const POPSTATE_IGNORE_KEY = '__popstate_ignore_flag'

export function usePopstate(onBack: () => void) {
  useEffect(() => {
    let lastFired = 0

    const handlePopState = () => {
      // @ts-expect-error global flag
      if (window[POPSTATE_IGNORE_KEY]) {
        // @ts-expect-error global flag
        window[POPSTATE_IGNORE_KEY] = false
        return
      }
      // 연속 뒤로가기 debounce: 300ms 이내 중복 호출 무시
      const now = Date.now()
      if (now - lastFired < 300) return
      lastFired = now
      onBack()
    }

    // 모달 식별을 위한 고유 ID 부여
    const modalId = Math.random().toString(36).substr(2, 9)
    window.history.pushState({ modalId }, '')
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      
      // 언마운트 될 때, 아직 현재 히스토리가 자신이 푸시한 상태라면 뒤로가기 실행
      // (X 버튼이나 배경 클릭으로 닫는 경우 히스토리 스택 복구)
      if (window.history.state?.modalId === modalId) {
        // @ts-expect-error global flag
        window[POPSTATE_IGNORE_KEY] = true
        window.history.back()
        
        // 브라우저에 따라 back()의 popstate 이벤트가 약간 지연될 수 있으므로
        // 에러를 방지하기 위해 일정 시간 후 flag 초기화
        setTimeout(() => {
          // @ts-expect-error global flag
          window[POPSTATE_IGNORE_KEY] = false
        }, 100)
      }
    }
  }, [onBack])
}
