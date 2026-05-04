import { useEffect, useState } from 'react'

function getInitialOfflineState(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.onLine === false
}

export function useOnlineStatus() {
  const [isOffline, setIsOffline] = useState(getInitialOfflineState)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOffline }
}