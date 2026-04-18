import { useState, useEffect } from 'react'
import { hapticSystem } from '@/lib/haptic-system'

export function useHaptic() {
  const [isEnabled, setIsEnabled] = useState(hapticSystem.isEnabled())
  const [intensity, setIntensity] = useState(hapticSystem.getIntensity())
  const [isSupported, setIsSupported] = useState(hapticSystem.isSupported())

  useEffect(() => {
    setIsEnabled(hapticSystem.isEnabled())
    setIntensity(hapticSystem.getIntensity())
    setIsSupported(hapticSystem.isSupported())
  }, [])

  const toggleEnabled = (enabled: boolean) => {
    hapticSystem.setEnabled(enabled)
    setIsEnabled(enabled)
  }

  const updateIntensity = (newIntensity: number) => {
    hapticSystem.setIntensity(newIntensity)
    setIntensity(newIntensity)
  }

  return {
    isEnabled,
    intensity,
    isSupported,
    setEnabled: toggleEnabled,
    setIntensity: updateIntensity,
    play: hapticSystem.play.bind(hapticSystem),
    click: hapticSystem.click.bind(hapticSystem),
    buttonPress: hapticSystem.buttonPress.bind(hapticSystem),
    success: hapticSystem.success.bind(hapticSystem),
    error: hapticSystem.error.bind(hapticSystem),
    warning: hapticSystem.warning.bind(hapticSystem),
    selection: hapticSystem.selection.bind(hapticSystem),
    impact: hapticSystem.impact.bind(hapticSystem),
    notification: hapticSystem.notification.bind(hapticSystem),
  }
}
