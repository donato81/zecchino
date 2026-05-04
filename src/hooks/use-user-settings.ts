import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ACCOUNT_CATEGORIES } from '@/lib/constants'
import { updatePreference } from '@/lib/supabase/repositories/impostazioni-utente'
import type { TalkBackAdaptations, UserPreferences } from '@/lib/supabase/types'

// ── Wave B: Display preferences ──────────────────────────────────────────────
export interface DisplayPreferences {
  showBalances: boolean
  showAccountIcons: boolean
  compactMode: boolean
  showCategories: boolean
  animationsEnabled: boolean
  fontSize: number
  currencyDisplay: 'symbol' | 'code' | 'full'
  numberFormat: 'standard' | 'compact'
  highContrast: boolean
  showPercentages: boolean
  showTransactionIcons: boolean
  reduceMotion: boolean
}

const DISPLAY_DEFAULTS: DisplayPreferences = {
  showBalances: true,
  showAccountIcons: true,
  compactMode: false,
  showCategories: true,
  animationsEnabled: true,
  fontSize: 100,
  currencyDisplay: 'symbol',
  numberFormat: 'standard',
  highContrast: false,
  showPercentages: true,
  showTransactionIcons: true,
  reduceMotion: false,
}

// camelCase UI key → JSONB snake_case key
const displayKeyMap: Record<keyof DisplayPreferences, keyof UserPreferences> = {
  showBalances: 'display_show_balances',
  showAccountIcons: 'display_show_account_icons',
  compactMode: 'display_compact_mode',
  showCategories: 'display_show_categories',
  animationsEnabled: 'display_animations_enabled',
  fontSize: 'display_font_size',
  currencyDisplay: 'display_currency_display',
  numberFormat: 'display_number_format',
  highContrast: 'display_high_contrast',
  showPercentages: 'display_show_percentages',
  showTransactionIcons: 'display_show_transaction_icons',
  reduceMotion: 'display_reduce_motion',
}

// ── Wave C: Screen reader preferences ────────────────────────────────────────
export interface ScreenReaderPreferences {
  verbosityLevel: 'conciso' | 'normale' | 'verboso'
  announceNavigation: boolean
  announceFilters: boolean
  announceFormChanges: boolean
  announceKeyboardShortcuts: boolean
  announceBalanceChanges: boolean
  announceBudgetAlerts: boolean
  announceProgress: boolean
  announceFocusChanges: boolean
  announceListPosition: boolean
  announceDelay: number
  reducedAnnouncements: boolean
}

const SR_DEFAULTS: ScreenReaderPreferences = {
  verbosityLevel: 'normale',
  announceNavigation: true,
  announceFilters: true,
  announceFormChanges: false,
  announceKeyboardShortcuts: true,
  announceBalanceChanges: true,
  announceBudgetAlerts: true,
  announceProgress: true,
  announceFocusChanges: false,
  announceListPosition: true,
  announceDelay: 100,
  reducedAnnouncements: false,
}

const srKeyMap: Record<keyof ScreenReaderPreferences, keyof UserPreferences> = {
  verbosityLevel: 'sr_verbosity',
  announceNavigation: 'sr_announce_navigation',
  announceFilters: 'sr_announce_filters',
  announceFormChanges: 'sr_announce_form_changes',
  announceKeyboardShortcuts: 'sr_announce_shortcuts',
  announceBalanceChanges: 'sr_announce_balance_changes',
  announceBudgetAlerts: 'sr_announce_budget_alerts',
  announceProgress: 'sr_announce_progress',
  announceFocusChanges: 'sr_announce_focus_changes',
  announceListPosition: 'sr_announce_list_position',
  announceDelay: 'sr_announce_delay',
  reducedAnnouncements: 'sr_reduced_announcements',
}

const DEFAULT_TALKBACK_ADAPTATIONS: TalkBackAdaptations = {
  enhancedTouchTargets: true,
  simplifiedNavigation: true,
  extendedTimeouts: true,
  verboseDescriptions: true,
  highContrastMode: false,
  reducedMotion: true,
  autoFocusManagement: true,
  spatialAudio: true,
}

function isTalkBackAdaptations(v: unknown): v is TalkBackAdaptations {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  const keys: (keyof TalkBackAdaptations)[] = [
    'enhancedTouchTargets', 'simplifiedNavigation', 'extendedTimeouts',
    'verboseDescriptions', 'highContrastMode', 'reducedMotion',
    'autoFocusManagement', 'spatialAudio',
  ]
  return keys.every(k => typeof o[k] === 'boolean')
}

export type UserSettingsState = {
  visibleCategories: string[]
  dismissedBudgetAlerts: string[]
  setVisibleCategories: (ids: string[]) => Promise<void>
  dismissBudgetAlert: (budgetId: string) => Promise<void>
  resetDismissedAlerts: () => Promise<void>
  isSettingsReady: boolean
  isSettingsLoading: boolean
  settingsError: string | null
  audioEnabled: boolean
  audioVolume: number
  setAudioEnabled: (v: boolean) => Promise<void>
  setAudioVolume: (v: number) => Promise<void>
  displayPreferences: DisplayPreferences
  setDisplayPreference: <K extends keyof DisplayPreferences>(key: K, value: DisplayPreferences[K]) => Promise<void>
  screenReaderPreferences: ScreenReaderPreferences
  setScreenReaderPreference: <K extends keyof ScreenReaderPreferences>(key: K, value: ScreenReaderPreferences[K]) => Promise<void>
  talkBackAdaptations: TalkBackAdaptations
  talkBackManualOverride: boolean | null
  setTalkBackAdaptations: (adaptations: TalkBackAdaptations) => Promise<void>
  setTalkBackManualOverride: (v: boolean | null) => Promise<void>
  resetScreenReaderPreferences: () => Promise<void>
}

export function useUserSettings(): UserSettingsState {
  const { userSettings, isAuthenticated } = useAuth()

  const [visibleCategories, setVisibleCategoriesState] = useState<string[]>([])
  const [dismissedBudgetAlerts, setDismissedBudgetAlertsState] = useState<string[]>([])
  const [isSettingsReady, setIsSettingsReady] = useState(false)
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  const [audioEnabled, setAudioEnabledState] = useState<boolean>(true)
  const [audioVolume, setAudioVolumeState] = useState<number>(0.3)

  const [displayPreferences, setDisplayPreferencesState] = useState<DisplayPreferences>(DISPLAY_DEFAULTS)

  const [screenReaderPreferences, setScreenReaderPreferencesState] = useState<ScreenReaderPreferences>(SR_DEFAULTS)
  const [talkBackAdaptations, setTalkBackAdaptationsState] = useState<TalkBackAdaptations>(DEFAULT_TALKBACK_ADAPTATIONS)
  const [talkBackManualOverride, setTalkBackManualOverrideState] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !userSettings) {
      setVisibleCategoriesState([])
      setDismissedBudgetAlertsState([])
      setAudioEnabledState(true)
      setAudioVolumeState(0.3)
      setDisplayPreferencesState(DISPLAY_DEFAULTS)
      setScreenReaderPreferencesState(SR_DEFAULTS)
      setTalkBackAdaptationsState(DEFAULT_TALKBACK_ADAPTATIONS)
      setTalkBackManualOverrideState(null)
      setIsSettingsReady(false)
      setSettingsError(null)
      return
    }

    const prefs = userSettings.preferences

    const rawVisible = prefs?.visible_category_ids
    const rawDismissed = prefs?.dismissed_budget_alert_ids
    setVisibleCategoriesState(
      Array.isArray(rawVisible) && rawVisible.length > 0
        ? (rawVisible as string[])
        : ACCOUNT_CATEGORIES.map(c => c.id)
    )
    setDismissedBudgetAlertsState(Array.isArray(rawDismissed) ? (rawDismissed as string[]) : [])

    // Migrazione KV → Supabase completata. Periodo grazia scaduto 2026-08-01.
    setAudioEnabledState(prefs.audio_enabled !== false)
    setAudioVolumeState(typeof prefs.audio_volume === 'number' ? prefs.audio_volume : 0.3)

    setDisplayPreferencesState({
      showBalances: prefs.display_show_balances !== false,
      showAccountIcons: prefs.display_show_account_icons !== false,
      compactMode: prefs.display_compact_mode === true,
      showCategories: prefs.display_show_categories !== false,
      animationsEnabled: prefs.display_animations_enabled !== false,
      fontSize: typeof prefs.display_font_size === 'number' ? prefs.display_font_size : 100,
      currencyDisplay: (prefs.display_currency_display as 'symbol' | 'code' | 'full') ?? 'symbol',
      numberFormat: (prefs.display_number_format as 'standard' | 'compact') ?? 'standard',
      highContrast: prefs.display_high_contrast === true,
      showPercentages: prefs.display_show_percentages !== false,
      showTransactionIcons: prefs.display_show_transaction_icons !== false,
      reduceMotion: prefs.display_reduce_motion === true,
    })

    setScreenReaderPreferencesState({
      verbosityLevel: (prefs.sr_verbosity as 'conciso' | 'normale' | 'verboso') ?? 'normale',
      announceNavigation: prefs.sr_announce_navigation !== false,
      announceFilters: prefs.sr_announce_filters !== false,
      announceFormChanges: prefs.sr_announce_form_changes === true,
      announceKeyboardShortcuts: prefs.sr_announce_shortcuts !== false,
      announceBalanceChanges: prefs.sr_announce_balance_changes !== false,
      announceBudgetAlerts: prefs.sr_announce_budget_alerts !== false,
      announceProgress: prefs.sr_announce_progress !== false,
      announceFocusChanges: prefs.sr_announce_focus_changes === true,
      announceListPosition: prefs.sr_announce_list_position !== false,
      announceDelay: typeof prefs.sr_announce_delay === 'number' ? prefs.sr_announce_delay : 100,
      reducedAnnouncements: prefs.sr_reduced_announcements === true,
    })
    const rawAdaptations = prefs.talkback_adaptations
    setTalkBackAdaptationsState(isTalkBackAdaptations(rawAdaptations) ? rawAdaptations : DEFAULT_TALKBACK_ADAPTATIONS)
    const rawOverride = prefs.talkback_manual_override
    setTalkBackManualOverrideState(rawOverride === true || rawOverride === false || rawOverride === null ? rawOverride : null)

    setIsSettingsReady(true)
  }, [userSettings, isAuthenticated])

  // ── P29 setters ─────────────────────────────────────────────────────────────
  // Scrittura non ottimistica: stato locale aggiornato solo dopo conferma repository.
  const setVisibleCategories = useCallback(async (ids: string[]): Promise<void> => {
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      await updatePreference('visible_category_ids', ids)
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
      await updatePreference('dismissed_budget_alert_ids', newIds)
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
      await updatePreference('dismissed_budget_alert_ids', [])
      setDismissedBudgetAlertsState([])
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore aggiornamento preferenze')
    } finally {
      setIsSettingsLoading(false)
    }
  }, [])

  // ── Wave A: Audio setters ───────────────────────────────────────────────────
  const setAudioEnabled = useCallback(async (v: boolean): Promise<void> => {
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      await updatePreference('audio_enabled', v)
      setAudioEnabledState(v)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore aggiornamento audio')
    } finally {
      setIsSettingsLoading(false)
    }
  }, [])

  const setAudioVolume = useCallback(async (v: number): Promise<void> => {
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      await updatePreference('audio_volume', v)
      setAudioVolumeState(v)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore aggiornamento volume')
    } finally {
      setIsSettingsLoading(false)
    }
  }, [])

  // ── Wave B: Display setter ──────────────────────────────────────────────────
  const setDisplayPreference = useCallback(async <K extends keyof DisplayPreferences>(
    key: K,
    value: DisplayPreferences[K]
  ): Promise<void> => {
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      await updatePreference(displayKeyMap[key], value)
      setDisplayPreferencesState(prev => ({ ...prev, [key]: value }))
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore aggiornamento visualizzazione')
    } finally {
      setIsSettingsLoading(false)
    }
  }, [])

  // ── Wave C: Screen reader setters ───────────────────────────────────────────
  const setScreenReaderPreference = useCallback(async <K extends keyof ScreenReaderPreferences>(
    key: K,
    value: ScreenReaderPreferences[K]
  ): Promise<void> => {
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      await updatePreference(srKeyMap[key], value)
      setScreenReaderPreferencesState(prev => ({ ...prev, [key]: value }))
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore aggiornamento screen reader')
    } finally {
      setIsSettingsLoading(false)
    }
  }, [])

  const setTalkBackAdaptations = useCallback(async (adaptations: TalkBackAdaptations): Promise<void> => {
    if (!isTalkBackAdaptations(adaptations)) {
      setSettingsError('Dati adattamenti TalkBack non validi')
      return
    }
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      await updatePreference('talkback_adaptations', adaptations)
      setTalkBackAdaptationsState(adaptations)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore aggiornamento TalkBack')
    } finally {
      setIsSettingsLoading(false)
    }
  }, [])

  const setTalkBackManualOverride = useCallback(async (v: boolean | null): Promise<void> => {
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      await updatePreference('talkback_manual_override', v)
      setTalkBackManualOverrideState(v)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore aggiornamento TalkBack override')
    } finally {
      setIsSettingsLoading(false)
    }
  }, [])

  const resetScreenReaderPreferences = useCallback(async (): Promise<void> => {
    setIsSettingsLoading(true)
    setSettingsError(null)
    try {
      const writes = (Object.keys(srKeyMap) as (keyof ScreenReaderPreferences)[]).map(uiKey =>
        updatePreference(srKeyMap[uiKey], SR_DEFAULTS[uiKey])
      )
      await Promise.all([
        ...writes,
        updatePreference('talkback_adaptations', DEFAULT_TALKBACK_ADAPTATIONS),
        updatePreference('talkback_manual_override', null),
      ])
      setScreenReaderPreferencesState(SR_DEFAULTS)
      setTalkBackAdaptationsState(DEFAULT_TALKBACK_ADAPTATIONS)
      setTalkBackManualOverrideState(null)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Errore reset screen reader')
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
    // Wave A
    audioEnabled,
    audioVolume,
    setAudioEnabled,
    setAudioVolume,
    // Wave B
    displayPreferences,
    setDisplayPreference,
    // Wave C
    screenReaderPreferences,
    setScreenReaderPreference,
    talkBackAdaptations,
    talkBackManualOverride,
    setTalkBackAdaptations,
    setTalkBackManualOverride,
    resetScreenReaderPreferences,
  }
}
