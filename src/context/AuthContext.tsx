import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { hashPin, verifyPin } from '@/lib/crypto'
import { supabase } from '@/lib/supabase/client'
import { invalidateCache } from '@/lib/supabase/cache'
import { getOrCreate, updatePinHash, updatePreference } from '@/lib/supabase/repositories/impostazioni-utente'
import type { UserSettings } from '@/lib/supabase/types'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { Button } from '@/components/ui/button'
import { useInactivityTimer } from '@/hooks/use-inactivity-timer'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { toast as sonnerNotify } from 'sonner'

interface AuthContextValue {
  user: User | null
  session: Session | null
  isAuthReady: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  completeOnboarding: () => void
  inactivityTimeout: number
  userSettings: UserSettings | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isPrivateEnabled: boolean
  isPrivateUnlocked: boolean
  setIsPrivateUnlocked: (v: boolean) => void
  showPrivatePinDialog: boolean
  setShowPrivatePinDialog: (v: boolean) => void
  setInactivityTimeout: (minutes: number) => Promise<void>
  unlockPrivate: (pin: string) => Promise<void>
  lockPrivate: () => void
  setPin: (pin: string) => Promise<void>
  changePin: (oldPin: string, newPin: string) => Promise<void>
  removePin: (pin: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [inactivityTimeoutState, setInactivityTimeoutState] = useState(5)
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false)
  const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [privatePinHashCache, setPrivatePinHashCache] = useState<string | null | undefined>(undefined)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const screenReader = useScreenReader()
  const isScreenReaderActive = typeof document !== 'undefined'
    && document.querySelector('[aria-live]') !== null
    && document.documentElement.getAttribute('data-sr-active') === 'true'

  const loadUserSettings = useCallback(async () => {
    try {
      const settings = await getOrCreate()
      setNeedsOnboarding(!settings.nomeVisualizzato)
      setInactivityTimeoutState(settings.preferences.session_timeout_minutes ?? 5)
      setPrivatePinHashCache(settings.pinPrivatoHash ?? null)
      setUserSettings(settings)
    } catch {
      setNeedsOnboarding(false)
      setInactivityTimeoutState(5)
      setPrivatePinHashCache(null)
      setUserSettings(null)
    }
  }, [])

  const signOut = useCallback(async () => {
    if (user?.id) {
      invalidateCache(user.id)
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setIsPrivateUnlocked(false)
    setShowPrivatePinDialog(false)
  }, [user?.id])

  const { resetTimer, showWarning } = useInactivityTimer({
    timeoutMinutes: isAuthenticated ? inactivityTimeoutState : 0,
    onTimeout: () => {
      void signOut()
    },
  })

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!active) return
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      setIsAuthenticated(!!currentSession)

      if (currentSession) {
        await loadUserSettings()
      }

      setIsAuthReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      setIsAuthenticated(!!currentSession)
      setIsAuthReady(true)

      if (currentSession) {
        void loadUserSettings()
      } else {
        setIsPrivateUnlocked(false)
        setNeedsOnboarding(false)
        setPrivatePinHashCache(undefined)
        setUserSettings(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadUserSettings])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    if (!email) return

    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('email') && message.includes('not')) {
        return
      }
      throw error
    }
  }, [])

  const setInactivityTimeout = useCallback(async (minutes: number) => {
    setInactivityTimeoutState(minutes)
    await updatePreference('session_timeout_minutes', minutes)
    resetTimer()
  }, [resetTimer])

  const isPrivateEnabled = privatePinHashCache !== null && privatePinHashCache !== undefined && privatePinHashCache !== ''

  const unlockPrivate = useCallback(async (pin: string) => {
    if (!isPrivateEnabled || !privatePinHashCache) {
      soundSystem.play('pin-error')
      hapticSystem.pinError()
      screenReader.announceError('PIN privato non configurato.')
      if (!isScreenReaderActive) {
        sonnerNotify.error('PIN privato non configurato')
      }
      throw new Error('PIN privato non configurato')
    }

    const isValid = await verifyPin(pin, privatePinHashCache)
    if (!isValid) {
      soundSystem.play('pin-error')
      hapticSystem.pinError()
      screenReader.announceError('PIN privato non corretto. Riprova.')
      if (!isScreenReaderActive) {
        sonnerNotify.error('PIN privato non corretto')
      }
      throw new Error('PIN non corretto')
    }

    setIsPrivateUnlocked(true)
    setShowPrivatePinDialog(false)
    soundSystem.play('private-unlock')
    hapticSystem.privateUnlock()
    screenReader.announceSuccess('Conto privato sbloccato.')
    if (!isScreenReaderActive) {
      sonnerNotify.success('Conto privato sbloccato')
    }
  }, [isPrivateEnabled, isScreenReaderActive, privatePinHashCache, screenReader])

  const lockPrivate = useCallback(() => {
    setIsPrivateUnlocked(false)
  }, [])

  const setPin = useCallback(async (pin: string) => {
    if (isPrivateEnabled) {
      throw new Error('PIN privato già configurato')
    }

    const hash = await hashPin(pin)
    await updatePinHash(hash)
    setPrivatePinHashCache(hash)
    setUserSettings(prev => prev ? { ...prev, pinPrivatoHash: hash } : prev)
    setIsPrivateUnlocked(true)
    soundSystem.play('private-unlock')
    hapticSystem.privateUnlock()
    screenReader.announceSuccess('PIN privato configurato.')
    if (!isScreenReaderActive) {
      sonnerNotify.success('PIN privato configurato con successo')
    }
  }, [isPrivateEnabled, isScreenReaderActive, screenReader])

  const changePin = useCallback(async (oldPin: string, newPin: string) => {
    if (!isPrivateEnabled || !privatePinHashCache) {
      throw new Error('PIN privato non configurato')
    }

    const isValid = await verifyPin(oldPin, privatePinHashCache)
    if (!isValid) {
      soundSystem.play('pin-error')
      hapticSystem.pinError()
      throw new Error('PIN attuale non corretto')
    }

    const newHash = await hashPin(newPin)
    await updatePinHash(newHash)
    setPrivatePinHashCache(newHash)
    setUserSettings(prev => prev ? { ...prev, pinPrivatoHash: newHash } : prev)
    soundSystem.play('private-unlock')
    hapticSystem.privateUnlock()
    screenReader.announceSuccess('PIN privato modificato.')
    if (!isScreenReaderActive) {
      sonnerNotify.success('PIN privato modificato con successo')
    }
  }, [isPrivateEnabled, isScreenReaderActive, privatePinHashCache, screenReader])

  const removePin = useCallback(async (pin: string) => {
    if (!isPrivateEnabled || !privatePinHashCache) {
      throw new Error('PIN privato non configurato')
    }

    const isValid = await verifyPin(pin, privatePinHashCache)
    if (!isValid) {
      soundSystem.play('pin-error')
      hapticSystem.pinError()
      throw new Error('PIN attuale non corretto')
    }

    await updatePinHash(null)
    setPrivatePinHashCache(null)
    setUserSettings(prev => prev ? { ...prev, pinPrivatoHash: null } : prev)
    setIsPrivateUnlocked(false)
    soundSystem.play('dialog-close')
    screenReader.announceSuccess('PIN privato rimosso.')
    if (!isScreenReaderActive) {
      sonnerNotify.success('PIN privato rimosso')
    }
  }, [isPrivateEnabled, isScreenReaderActive, privatePinHashCache, screenReader])

  const completeOnboarding = useCallback(() => {
    setNeedsOnboarding(false)
  }, [])

  const value = useMemo(() => ({
    user,
    session,
    isAuthReady,
    isAuthenticated,
    needsOnboarding,
    completeOnboarding,
    inactivityTimeout: inactivityTimeoutState,
    userSettings,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isPrivateEnabled,
    isPrivateUnlocked,
    setIsPrivateUnlocked,
    showPrivatePinDialog,
    setShowPrivatePinDialog,
    setInactivityTimeout,
    unlockPrivate,
    lockPrivate,
    setPin,
    changePin,
    removePin,
  }), [
    changePin,
    completeOnboarding,
    inactivityTimeoutState,
    isAuthReady,
    isAuthenticated,
    isPrivateEnabled,
    isPrivateUnlocked,
    lockPrivate,
    needsOnboarding,
    removePin,
    resetPassword,
    session,
    setPin,
    setInactivityTimeout,
    showPrivatePinDialog,
    signIn,
    signOut,
    signUp,
    unlockPrivate,
    user,
    userSettings,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showWarning && isAuthenticated ? (
        <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border bg-background/95 p-4 shadow-lg backdrop-blur" role="alertdialog" aria-live="assertive" aria-label="Avviso scadenza sessione">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">La tua sessione scadrà tra 1 minuto. Vuoi rimanere connesso?</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { resetTimer(); screenReader.announceSuccess('Sessione mantenuta attiva.') }}>
                Rimani connesso
              </Button>
              <Button variant="destructive" onClick={() => { void signOut() }}>
                Esci ora
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AuthContext.Provider>
  )
}
