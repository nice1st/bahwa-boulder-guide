import { useEffect, useRef } from 'react'

// 글로벌 뒤로가기 콜백 스택
// 가장 마지막에 등록된(= 최상위) 컴포넌트만 뒤로가기 처리
const backStack: Array<() => void> = []
let historyDepth = 0

function ensureHistoryEntry() {
  if (historyDepth === 0) {
    window.history.pushState({ __backStack: true }, '')
  }
  historyDepth++
}

function releaseHistoryEntry() {
  historyDepth--
  if (historyDepth === 0 && window.history.state?.__backStack) {
    window.history.back()
  }
}

// 글로벌 popstate 핸들러 (한 번만 등록)
let globalListenerAttached = false

function attachGlobalListener() {
  if (globalListenerAttached) return
  globalListenerAttached = true

  window.addEventListener('popstate', () => {
    if (backStack.length > 0) {
      const top = backStack[backStack.length - 1]
      top()
      // 다음 뒤로가기를 위해 다시 history entry 추가 (스택에 아직 항목이 있으면)
      if (backStack.length > 0) {
        window.history.pushState({ __backStack: true }, '')
      } else {
        historyDepth = 0
      }
    }
  })
}

export function usePopstate(onBack: () => void, enabled: boolean = true) {
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  const callbackRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!enabled) {
      // enabled가 false로 바뀌면 스택에서 제거
      if (callbackRef.current) {
        const idx = backStack.indexOf(callbackRef.current)
        if (idx !== -1) backStack.splice(idx, 1)
        callbackRef.current = null
        releaseHistoryEntry()
      }
      return
    }

    attachGlobalListener()

    const callback = () => onBackRef.current()
    callbackRef.current = callback
    backStack.push(callback)
    ensureHistoryEntry()

    return () => {
      const idx = backStack.indexOf(callback)
      if (idx !== -1) backStack.splice(idx, 1)
      callbackRef.current = null
      releaseHistoryEntry()
    }
  }, [enabled])
}
