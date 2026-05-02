import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { hashPin, verifyPin } from '@/lib/crypto'
import { supabase } from '@/lib/supabase/client'
import { getOrCreate, updatePinHash, updatePreference } from '@/lib/supabase/repositories/impostazioni-utente'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { Button } from '@/components/ui/button'
import { useInactivityTimer } from '@/hooks/use-inactivity-timer'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { toast } from 'sonner'

interface AuthContextValue {
  user: User | null
  session: Session | null
  isAuthReady: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  inactivityTimeout: number
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isPrivateUnlocked: boolean
  setIsPrivateUnlocked: (v: boolean) => void
  showPrivatePinDialog: boolean
  setShowPrivatePinDialog: (v: boolean) => void
  setInactivityTimeout: (minutes: number) => Promise<void>
  handlePrivatePinSubmit: (pin: string, onUnlocked?: () => void) => Promise<void>
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
  const screenReader = useScreenReader()

  const loadUserSettings = useCallback(async () => {
    try {
      const settings = await getOrCreate()
      setNeedsOnboarding(!settings.nomeVisualizzato)
      setInactivityTimeoutState((settings.preferences as Record<string, unknown>)?.session_timeout_minutes as number ?? 5)
      setPrivatePinHashCache(settings.pinPrivatoHash ?? null)
    } catch {
      setNeedsOnboarding(false)
      setInactivityTimeoutState(5)
      setPrivatePinHashCache(null)
    }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setIsPrivateUnlocked(false)
    setShowPrivatePinDialog(false)
  }, [])

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
      setIsAuthReady(true)

      if (currentSession) {
        await loadUserSettings()
      }
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
    await updatePreference('session_timeout_minutes' as never, minutes)
    resetTimer()
  }, [resetTimer])

  const handlePrivatePinSubmit = useCallback(async (pin: string, onUnlocked?: () => void) => {
    if (privatePinHashCache === undefined) {
      return
    }

    // TODO Blocco 8: sostituire con primitiva crittografica aggiornata
    if (privatePinHashCache === null) {
      const hash = await hashPin(pin)
      await updatePinHash(hash)
      setPrivatePinHashCache(hash)
      setIsPrivateUnlocked(true)
      setShowPrivatePinDialog(false)
      soundSystem.play('private-unlock')
      hapticSystem.privateUnlock()
      toast.success('PIN privato creato e conto sbloccato')
      screenReader.announceSuccess('PIN privato creato. Conto privato ora sbloccato.')
    } else {
      const isValid = await verifyPin(pin, privatePinHashCache)
      if (isValid) {
        setIsPrivateUnlocked(true)
        setShowPrivatePinDialog(false)
        soundSystem.play('private-unlock')
        hapticSystem.privateUnlock()
        toast.success('Conto privato sbloccato')
        onUnlocked?.()
        if (!onUnlocked) {
          screenReader.announceSuccess('Conto privato sbloccato.')
        }
      } else {
        soundSystem.play('pin-error')
        hapticSystem.pinError()
        toast.error('PIN privato non corretto')
        screenReader.announceError('PIN privato non corretto. Riprova.')
        throw new Error('PIN non corretto')
      }
    }
  }, [privatePinHashCache, screenReader])

  const value = useMemo(() => ({
    user,
    session,
    isAuthReady,
    isAuthenticated,
    needsOnboarding,
    inactivityTimeout: inactivityTimeoutState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isPrivateUnlocked,
    setIsPrivateUnlocked,
    showPrivatePinDialog,
    setShowPrivatePinDialog,
    setInactivityTimeout,
    handlePrivatePinSubmit,
  }), [
    handlePrivatePinSubmit,
    inactivityTimeoutState,
    isAuthReady,
    isAuthenticated,
    isPrivateUnlocked,
    needsOnboarding,
    resetPassword,
    session,
    setInactivityTimeout,
    showPrivatePinDialog,
    signIn,
    signOut,
    signUp,
    user,
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
