import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { updatePreference } from '@/lib/supabase/repositories/impostazioni-utente'

export type UserSettingsState = {
  visibleCategories: string[]
  dismissedBudgetAlerts: string[]
  setVisibleCategories: (ids: string[]) => Promise<void>
  dismissBudgetAlert: (budgetId: string) => Promise<void>
  resetDismissedAlerts: () => Promise<void>
  isSettingsReady: boolean
  isSettingsLoading: boolean
  settingsError: string | null
}

// Hook puro interno — non importare direttamente nei consumer UI.
// I consumer devono usare useUserSettings() da '@/context/UserSettingsContext'.
export function useUserSettings(): UserSettingsState {
  const { userSettings, isAuthenticated } = useAuth()

  const [visibleCategories, setVisibleCategoriesState] = useState<string[]>([])
  const [dismissedBudgetAlerts, setDismissedBudgetAlertsState] = useState<string[]>([])
  const [isSettingsReady, setIsSettingsReady] = useState(false)
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  // Inizializzazione sincrona dal record già in memoria (parsing preferences JSONB).
  // isSettingsReady diventa true nello stesso ciclo di rendering (React batch).
  useEffect(() => {
    if (!isAuthenticated || !userSettings) {
      setVisibleCategoriesState([])
      setDismissedBudgetAlertsState([])
      setIsSettingsReady(false)
      setSettingsError(null)
      return
    }

    const prefs = userSettings.preferences as unknown as Record<string, unknown>
    const rawVisible = prefs?.visible_category_ids
    const rawDismissed = prefs?.dismissed_budget_alert_ids

    setVisibleCategoriesState(Array.isArray(rawVisible) ? (rawVisible as string[]) : [])
    setDismissedBudgetAlertsState(Array.isArray(rawDismissed) ? (rawDismissed as string[]) : [])
    setIsSettingsReady(true)
  }, [userSettings, isAuthenticated])

  // Scrittura non ottimistica: stato locale aggiornato solo dopo conferma repository.
  const setVisibleCategories = useCallback(async (ids: string[]): Promise<void> => {
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      await updatePreference('visible_category_ids' as never, ids)
      setVisibleCategoriesState(ids)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore aggiornamento preferenze')
    } finally {
      setIsSettingsLoading(false)
    }
  }, [])

  const dismissBudgetAlert = useCallback(async (budgetId: string): Promise<void> => {
    if (dismissedBudgetAlerts.includes(budgetId)) return
    const newIds = [...dismissedBudgetAlerts, budgetId]
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      await updatePreference('dismissed_budget_alert_ids' as never, newIds)
      setDismissedBudgetAlertsState(newIds)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore aggiornamento preferenze')
    } finally {
      setIsSettingsLoading(false)
    }
  }, [dismissedBudgetAlerts])

  const resetDismissedAlerts = useCallback(async (): Promise<void> => {
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      await updatePreference('dismissed_budget_alert_ids' as never, [])
      setDismissedBudgetAlertsState([])
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore aggiornamento preferenze')
    } finally {
      setIsSettingsLoading(false)
    }
  }, [])

  return {
    visibleCategories,
    dismissedBudgetAlerts,
    setVisibleCategories,
    dismissBudgetAlert,
    resetDismissedAlerts,
    isSettingsReady,
    isSettingsLoading,
    settingsError,
  }
}
