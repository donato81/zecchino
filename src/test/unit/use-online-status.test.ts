import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOnlineStatus } from '@/hooks/use-online-status'

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  })
}

describe('useOnlineStatus', () => {
  beforeEach(() => {
    setNavigatorOnline(true)
  })

  it('inizializza lo stato da navigator.onLine', () => {
    setNavigatorOnline(false)

    const { result } = renderHook(() => useOnlineStatus())

    expect(result.current.isOffline).toBe(true)
  })

  it('aggiorna lo stato sugli eventi online e offline', () => {
    const { result } = renderHook(() => useOnlineStatus())

    act(() => {
      setNavigatorOnline(false)
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current.isOffline).toBe(true)

    act(() => {
      setNavigatorOnline(true)
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current.isOffline).toBe(false)
  })
})