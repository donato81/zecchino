import { useState, useEffect, useCallback } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import type { TalkBackAdaptations } from '@/lib/supabase/types'

export interface TalkBackState {
  isEnabled: boolean
  isDetected: boolean
  confidenceLevel: 'high' | 'medium' | 'low'
  adaptationsActive: boolean
}

const DEFAULT_ADAPTATIONS: TalkBackAdaptations = {
  enhancedTouchTargets: true,
  simplifiedNavigation: true,
  extendedTimeouts: true,
  verboseDescriptions: true,
  highContrastMode: false,
  reducedMotion: true,
  autoFocusManagement: true,
  spatialAudio: true
}

export function useTalkBack() {
  const {
    talkBackAdaptations,
    talkBackManualOverride,
    setTalkBackAdaptations,
    setTalkBackManualOverride,
  } = useUserSettings()
  const [talkBackState, setTalkBackState] = useState<TalkBackState>({
    isEnabled: false,
    isDetected: false,
    confidenceLevel: 'low',
    adaptationsActive: false
  })

  const adaptations = talkBackAdaptations ?? DEFAULT_ADAPTATIONS
  const manualOverride = talkBackManualOverride

  const detectTalkBack = useCallback(() => {
    let confidence: 'high' | 'medium' | 'low' = 'low'
    let detected = false

    if (typeof window === 'undefined') {
      return { detected: false, confidence: 'low' }
    }

    const indicators = {
      mediaQuery: false,
      userAgent: false,
      touchEvents: false,
      screenReaderAPI: false,
      behavioralPatterns: false
    }

    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        indicators.mediaQuery = true
      }

      const userAgent = navigator.userAgent.toLowerCase()
      if (userAgent.includes('android')) {
        indicators.userAgent = true
      }

      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        indicators.touchEvents = true
      }

      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          indicators.screenReaderAPI = true
        }
      }

      const focusTime = sessionStorage.getItem('talkback-focus-pattern')
      const slowNavigation = sessionStorage.getItem('talkback-slow-nav')
      if (focusTime || slowNavigation) {
        indicators.behavioralPatterns = true
      }

      const activeIndicators = Object.values(indicators).filter(Boolean).length

      if (activeIndicators >= 4) {
        detected = true
        confidence = 'high'
      } else if (activeIndicators >= 3) {
        detected = true
        confidence = 'medium'
      } else if (activeIndicators >= 2) {
        detected = true
        confidence = 'low'
      }

    } catch (error) {
      console.warn('TalkBack detection error:', error)
    }

    return { detected, confidence }
  }, [])

  useEffect(() => {
    const { detected, confidence } = detectTalkBack()
    
    const isEnabled = manualOverride !== null ? Boolean(manualOverride) : detected
    
    setTalkBackState({
      isEnabled: Boolean(isEnabled),
      isDetected: Boolean(detected),
      confidenceLevel: confidence as 'high' | 'medium' | 'low',
      adaptationsActive: Boolean(isEnabled)
    })

    if (isEnabled) {
      document.body.setAttribute('data-talkback', 'true')
      document.body.setAttribute('data-talkback-confidence', confidence as string)
      
      const currentAdaptations = adaptations || DEFAULT_ADAPTATIONS
      
      if (currentAdaptations.enhancedTouchTargets) {
        document.body.classList.add('talkback-enhanced-targets')
      }
      if (currentAdaptations.highContrastMode) {
        document.body.classList.add('talkback-high-contrast')
      }
      if (currentAdaptations.reducedMotion) {
        document.body.classList.add('talkback-reduced-motion')
      }
      
      sessionStorage.setItem('talkback-active', 'true')
      console.log(`TalkBack detected with ${confidence} confidence - adaptations active`)
    } else {
      document.body.removeAttribute('data-talkback')
      document.body.removeAttribute('data-talkback-confidence')
      document.body.classList.remove('talkback-enhanced-targets', 'talkback-high-contrast', 'talkback-reduced-motion')
      sessionStorage.removeItem('talkback-active')
    }

    const handleFocusPattern = () => {
      sessionStorage.setItem('talkback-focus-pattern', Date.now().toString())
    }

    const handleSlowNavigation = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const lastTab = sessionStorage.getItem('last-tab-time')
        const now = Date.now()
        if (lastTab && now - parseInt(lastTab) > 1000) {
          sessionStorage.setItem('talkback-slow-nav', 'true')
        }
        sessionStorage.setItem('last-tab-time', now.toString())
      }
    }

    window.addEventListener('focus', handleFocusPattern, true)
    window.addEventListener('keydown', handleSlowNavigation)

    const recheckInterval = setInterval(() => {
      const { detected: newDetected } = detectTalkBack()
      if (newDetected !== talkBackState.isDetected && manualOverride === null) {
        const { detected, confidence } = detectTalkBack()
        setTalkBackState(prev => ({
          ...prev,
          isDetected: detected,
          isEnabled: detected,
          confidenceLevel: confidence as 'high' | 'medium' | 'low',
          adaptationsActive: detected
        }))
      }
    }, 30000)

    return () => {
      window.removeEventListener('focus', handleFocusPattern, true)
      window.removeEventListener('keydown', handleSlowNavigation)
      clearInterval(recheckInterval)
    }
  }, [detectTalkBack, manualOverride, adaptations, talkBackState.isDetected])

  const enableTalkBack = useCallback((manual: boolean = false) => {
    if (manual) {
      setTalkBackManualOverride(true).catch(console.error)
    }
    setTalkBackState(prev => ({
      ...prev,
      isEnabled: true,
      adaptationsActive: true
    }))
  }, [setTalkBackManualOverride])

  const disableTalkBack = useCallback((manual: boolean = false) => {
    if (manual) {
      setTalkBackManualOverride(false).catch(console.error)
    }
    setTalkBackState(prev => ({
      ...prev,
      isEnabled: false,
      adaptationsActive: false
    }))
  }, [setTalkBackManualOverride])

  const resetDetection = useCallback(() => {
    setTalkBackManualOverride(null).catch(console.error)
    const { detected, confidence } = detectTalkBack()
    setTalkBackState({
      isEnabled: detected,
      isDetected: detected,
      confidenceLevel: confidence as 'high' | 'medium' | 'low',
      adaptationsActive: detected
    })
  }, [setTalkBackManualOverride, detectTalkBack])

  const updateAdaptation = useCallback((key: keyof TalkBackAdaptations, value: boolean) => {
    setTalkBackAdaptations({
      ...adaptations,
      [key]: value
    }).catch(console.error)
  }, [adaptations, setTalkBackAdaptations])

  const resetAdaptations = useCallback(() => {
    setTalkBackAdaptations(DEFAULT_ADAPTATIONS).catch(console.error)
  }, [setTalkBackAdaptations])

  const getTouchTargetSize = useCallback(() => {
    if (!talkBackState.adaptationsActive || !adaptations?.enhancedTouchTargets) {
      return 44
    }
    return 56
  }, [talkBackState.adaptationsActive, adaptations])

  const getAnimationDuration = useCallback((baseMs: number) => {
    if (!talkBackState.adaptationsActive || !adaptations?.reducedMotion) {
      return baseMs
    }
    return Math.min(baseMs * 0.5, 100)
  }, [talkBackState.adaptationsActive, adaptations])

  const getTimeout = useCallback((baseMs: number) => {
    if (!talkBackState.adaptationsActive || !adaptations?.extendedTimeouts) {
      return baseMs
    }
    return baseMs * 2
  }, [talkBackState.adaptationsActive, adaptations])

  const shouldUseVerboseDescriptions = useCallback(() => {
    return talkBackState.adaptationsActive && (adaptations?.verboseDescriptions ?? true)
  }, [talkBackState.adaptationsActive, adaptations])

  const shouldSimplifyNavigation = useCallback(() => {
    return talkBackState.adaptationsActive && (adaptations?.simplifiedNavigation ?? true)
  }, [talkBackState.adaptationsActive, adaptations])

  const shouldAutoManageFocus = useCallback(() => {
    return talkBackState.adaptationsActive && (adaptations?.autoFocusManagement ?? true)
  }, [talkBackState.adaptationsActive, adaptations])

  const getAriaDescription = useCallback((brief: string, verbose: string) => {
    return shouldUseVerboseDescriptions() ? verbose : brief
  }, [shouldUseVerboseDescriptions])

  return {
    talkBackState,
    adaptations,
    enableTalkBack,
    disableTalkBack,
    resetDetection,
    updateAdaptation,
    resetAdaptations,
    getTouchTargetSize,
    getAnimationDuration,
    getTimeout,
    shouldUseVerboseDescriptions,
    shouldSimplifyNavigation,
    shouldAutoManageFocus,
    getAriaDescription
  }
}
