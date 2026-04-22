import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useKV } from '@github/spark/hooks'

interface AuthContextValue {
  globalPinHash: string | null
  setGlobalPinHash: (value: string | ((prev: string | null) => string)) => void
  privatePinHash: string | null
  setPrivatePinHash: (value: string | ((prev: string | null) => string)) => void
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
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
  const [privatePinHash, setPrivatePinHash] = useKV<string>('private-pin-hash', '')

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)
  useEffect(() => {
    if (!globalPinHash) {
      setIsSetupMode(true)
      setShowPinDialog(true)
    } else {
      setShowPinDialog(true)
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      globalPinHash, setGlobalPinHash,
      privatePinHash, setPrivatePinHash,
      isAuthenticated, setIsAuthenticated,
      isPrivateUnlocked, setIsPrivateUnlocked,
      isSetupMode, setIsSetupMode,
      showPinDialog, setShowPinDialog,
      showPrivatePinDialog, setShowPrivatePinDialog,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
