import { useUserSettings } from '@/context/UserSettingsContext'
export type { DisplayPreferences } from '@/hooks/use-user-settings'

// Thin wrapper: delegates to useUserSettings for Supabase-backed display preferences.
export function useDisplayPreferences() {
  return useUserSettings().displayPreferences
}
