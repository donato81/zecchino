import { createContext, useContext, type ReactNode } from 'react'
import { useUserSettings as useUserSettingsHook, type UserSettingsState } from '@/hooks/use-user-settings'

// Hook di accesso pubblico: useUserSettings() — alias del context hook.
// Il hook puro (use-user-settings.ts) è privato e non va importato direttamente dai consumer.

type UserSettingsContextValue = UserSettingsState

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null)

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const value = useUserSettingsHook()
  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  )
}

export function useUserSettings(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext)
  if (!ctx) throw new Error('useUserSettings deve essere usato dentro UserSettingsProvider')
  return ctx
}
