import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { useKV } from '@github/spark/hooks'
import { hashPin, verifyPin } from '@/lib/crypto'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { toast } from 'sonner'

interface AuthContextValue {
  globalPinHash: string | undefined
  setGlobalPinHash: (value: string | ((prev?: string) => string)) => void
  privatePinHash: string | undefined
  setPrivatePinHash: (value: string | ((prev?: string) => string)) => void
  isAuthenticated: boolean
  setIsAuthenticated: (v: boolean) => void
  isPrivateUnlocked: boolean
  setIsPrivateUnlocked: (v: boolean) => void
  isSetupMode: boolean
  setIsSetupMode: (v: boolean) => void
  showPinDialog: boolean
  setShowPinDialog: (v: boolean) => void
  showPrivatePinDialog: boolean
  setShowPrivatePinDialog: (v: boolean) => void
  handleGlobalPinSubmit: (pin: string) => Promise<void>
  handlePrivatePinSubmit: (pin: string, onUnlocked?: () => void) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)
  const [privatePinHash, setPrivatePinHash] = useKV<string>('private-pin-hash', '')

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)

  const hasInitialized = useRef(false)
  const isAuthenticatedRef = useRef(isAuthenticated)
  isAuthenticatedRef.current = isAuthenticated
  const screenReader = useScreenReader()

  useEffect(() => {
    if (isAuthenticatedRef.current) return
    if (globalPinHash === undefined) {
      setIsSetupMode(true)
      setShowPinDialog(true)
      return
    }
    if (hasInitialized.current) return

    const openAuthDialog = (pinHash: string) => {
      hasInitialized.current = true
      if (!pinHash) {
        setIsSetupMode(true)
      } else {
        setIsSetupMode(false)
      }
      setShowPinDialog(true)
    }

    openAuthDialog(globalPinHash)
  }, [globalPinHash])

  const handleGlobalPinSubmit = async (pin: string) => {
    if (isSetupMode) {
      const hash = await hashPin(pin)
      setGlobalPinHash(hash)
      setIsAuthenticated(true)
      setShowPinDialog(false)
      setIsSetupMode(false)
      soundSystem.play('pin-success')
      hapticSystem.pinSuccess()
      toast.success('PIN globale creato con successo')
      screenReader.announceSuccess('PIN globale creato. Accesso all\'applicazione consentito.')
    } else {
      const isValid = await verifyPin(pin, globalPinHash || '')
      if (isValid) {
        setIsAuthenticated(true)
        setShowPinDialog(false)
        soundSystem.play('unlock')
        hapticSystem.unlock()
        toast.success('Accesso consentito')
        screenReader.announceSuccess('Accesso consentito. Benvenuto in Zecchino.')
      } else {
        soundSystem.play('pin-error')
        hapticSystem.pinError()
        toast.error('PIN non corretto')
        screenReader.announceError('PIN non corretto. Riprova.')
      }
    }
  }

  const handlePrivatePinSubmit = async (pin: string, onUnlocked?: () => void) => {
    if (!privatePinHash) {
      const hash = await hashPin(pin)
      setPrivatePinHash(hash)
      setIsPrivateUnlocked(true)
      setShowPrivatePinDialog(false)
      soundSystem.play('private-unlock')
      hapticSystem.privateUnlock()
      toast.success('PIN privato creato e conto sbloccato')
      screenReader.announceSuccess('PIN privato creato. Conto privato ora sbloccato.')
    } else {
      const isValid = await verifyPin(pin, privatePinHash)
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
      }
    }
  }

  return (
    <AuthContext.Provider value={{
      globalPinHash, setGlobalPinHash,
      privatePinHash, setPrivatePinHash,
      isAuthenticated, setIsAuthenticated,
      isPrivateUnlocked, setIsPrivateUnlocked,
      isSetupMode, setIsSetupMode,
      showPinDialog, setShowPinDialog,
      showPrivatePinDialog, setShowPrivatePinDialog,
      handleGlobalPinSubmit,
      handlePrivatePinSubmit,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
