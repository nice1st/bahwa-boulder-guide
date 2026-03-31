import { useEffect, useRef } from 'react'

// 글로벌 뒤로가기 콜백 스택
const backStack: Array<() => void> = []
let historyDepth = 0
let pendingRelease: ReturnType<typeof setTimeout> | null = null

function ensureHistoryEntry() {
  if (pendingRelease) {
    clearTimeout(pendingRelease)
    pendingRelease = null
  }
  if (historyDepth === 0 && !window.history.state?.__backStack) {
    window.history.pushState({ __backStack: true }, '')
  }
  historyDepth++
}

function releaseHistoryEntry() {
  historyDepth--
  if (historyDepth === 0) {
    pendingRelease = setTimeout(() => {
      pendingRelease = null
      if (historyDepth === 0 && window.history.state?.__backStack) {
        window.history.back()
      }
    }, 50)
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
