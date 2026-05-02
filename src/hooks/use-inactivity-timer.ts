import { useCallback, useEffect, useRef, useState } from 'react'

interface UseInactivityTimerOptions {
  timeoutMinutes: number
  onTimeout: () => void
}

interface UseInactivityTimerResult {
  resetTimer: () => void
  showWarning: boolean
}

const ACTIVITY_EVENTS = ['click', 'keydown', 'scroll', 'touchstart'] as const

export function useInactivityTimer({ timeoutMinutes, onTimeout }: UseInactivityTimerOptions): UseInactivityTimerResult {
  const warningTimerRef = useRef<number | null>(null)
  const timeoutTimerRef = useRef<number | null>(null)
  const [showWarning, setShowWarning] = useState(false)

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current !== null) {
      window.clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }

    if (timeoutTimerRef.current !== null) {
      window.clearTimeout(timeoutTimerRef.current)
      timeoutTimerRef.current = null
    }
  }, [])

  const scheduleTimers = useCallback(() => {
    clearTimers()
    setShowWarning(false)

    if (timeoutMinutes <= 0) {
      return
    }

    const timeoutMs = timeoutMinutes * 60_000
    const warningMs = Math.max((timeoutMinutes - 1) * 60_000, 0)

    warningTimerRef.current = window.setTimeout(() => {
      setShowWarning(true)
    }, warningMs)

    timeoutTimerRef.current = window.setTimeout(() => {
      setShowWarning(false)
      onTimeout()
    }, timeoutMs)
  }, [clearTimers, onTimeout, timeoutMinutes])

  const resetTimer = useCallback(() => {
    if (timeoutMinutes <= 0) {
      setShowWarning(false)
      clearTimers()
      return
    }

    scheduleTimers()
  }, [clearTimers, scheduleTimers, timeoutMinutes])

  useEffect(() => {
    if (timeoutMinutes <= 0) {
      clearTimers()
      setShowWarning(false)
      return
    }

    scheduleTimers()

    const handleActivity = () => {
      scheduleTimers()
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, handleActivity, { passive: true })
    })

    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, handleActivity)
      })
    }
  }, [clearTimers, scheduleTimers, timeoutMinutes])

  return {
    resetTimer,
    showWarning,
  }
}
