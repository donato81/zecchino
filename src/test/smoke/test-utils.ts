import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { vi } from 'vitest'
import App from '@/App'
import { ACCOUNT_CATEGORIES, ACCOUNT_TYPE_TO_CATEGORY } from '@/lib/constants'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { TalkBackAdaptations } from '@/lib/supabase/types'
import type { Account, Transaction, UserSettingsState } from '@/hooks/use-user-settings'

type DisplayPreferences = UserSettingsState['displayPreferences']
type ScreenReaderPreferences = UserSettingsState['screenReaderPreferences']

type MockAuthState = {
  user: { id: string; email: string } | null
  session: null
  isAuthReady: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  completeOnboarding: () => void
  inactivityTimeout: number
  userSettings: {
    nomeVisualizzato: string | null
    preferences: {
      session_timeout_minutes?: number
    }
    pinPrivatoHash: string | null
  } | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isPrivateEnabled: boolean
  isPrivateUnlocked: boolean
  setIsPrivateUnlocked: (value: boolean) => void
  showPrivatePinDialog: boolean
  setShowPrivatePinDialog: (value: boolean) => void
  setInactivityTimeout: (minutes: number) => Promise<void>
  unlockPrivate: (pin: string) => Promise<void>
  lockPrivate: () => void
  setPin: (pin: string) => Promise<void>
  changePin: (oldPin: string, newPin: string) => Promise<void>
  removePin: () => Promise<void>
}

const authStore = vi.hoisted(() => {
  let state: MockAuthState
  const listeners = new Set<() => void>()

  const store = {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getState() {
      return state
    },
    setState(partial: Partial<MockAuthState>) {
      state = { ...state, ...partial }
      listeners.forEach((listener) => listener())
    },
    reset() {
      state = createState()
      listeners.forEach((listener) => listener())
    },
  }

  function createState(): MockAuthState {
    return {
      user: { id: 'smoke-user', email: 'smoke@example.com' },
      session: null,
      isAuthReady: true,
      isAuthenticated: false,
      needsOnboarding: false,
      completeOnboarding: () => {},
      inactivityTimeout: 5,
      userSettings: {
        nomeVisualizzato: 'Smoke User',
        preferences: { session_timeout_minutes: 5 },
        pinPrivatoHash: 'mock-private-pin-hash',
      },
      signIn: async () => {
        store.setState({ isAuthenticated: true })
      },
      signUp: async () => undefined,
      signOut: async () => {
        store.setState({
          isAuthenticated: false,
          isPrivateEnabled: true,
          isPrivateUnlocked: false,
          showPrivatePinDialog: false,
        })
      },
      resetPassword: async () => undefined,
      isPrivateEnabled: true,
      isPrivateUnlocked: false,
      setIsPrivateUnlocked: (value: boolean) => {
        store.setState({ isPrivateUnlocked: value })
      },
      showPrivatePinDialog: false,
      setShowPrivatePinDialog: (value: boolean) => {
        store.setState({ showPrivatePinDialog: value })
      },
      setInactivityTimeout: async (minutes: number) => {
        store.setState({ inactivityTimeout: minutes })
      },
      unlockPrivate: async (_pin: string) => {
        store.setState({
          isPrivateUnlocked: true,
          showPrivatePinDialog: false,
        })
      },
      lockPrivate: () => {
        store.setState({ isPrivateUnlocked: false })
      },
      setPin: async (_pin: string) => {
        store.setState({
          isPrivateEnabled: true,
          isPrivateUnlocked: true,
        })
      },
      changePin: async (_oldPin: string, _newPin: string) => {
        store.setState({ isPrivateEnabled: true })
      },
      removePin: async () => {
        store.setState({
          isPrivateEnabled: false,
          isPrivateUnlocked: false,
        })
      },
    }
  }

  state = createState()

  return store
})

const userSettingsStore = vi.hoisted(() => {
  const DISPLAY_DEFAULTS = {
    showBalances: true,
    showAccountIcons: true,
    compactMode: false,
    showCategories: true,
    animationsEnabled: true,
    fontSize: 100,
    currencyDisplay: 'symbol' as const,
    numberFormat: 'standard' as const,
    highContrast: false,
    showPercentages: true,
    showTransactionIcons: true,
    reduceMotion: false,
  }

  const SCREEN_READER_DEFAULTS = {
    verbosityLevel: 'normale' as const,
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

  const TALKBACK_DEFAULTS = {
    enhancedTouchTargets: true,
    simplifiedNavigation: true,
    extendedTimeouts: true,
    verboseDescriptions: true,
    highContrastMode: false,
    reducedMotion: true,
    autoFocusManagement: true,
    spatialAudio: true,
  }

  let state: UserSettingsState
  const listeners = new Set<() => void>()

  const store = {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getState() {
      return state
    },
    setState(nextState: UserSettingsState) {
      state = nextState
      listeners.forEach((listener) => listener())
    },
    update(partial: Partial<UserSettingsState>) {
      state = { ...state, ...partial }
      listeners.forEach((listener) => listener())
    },
    reset() {
      state = createState()
      listeners.forEach((listener) => listener())
    },
  }

  function createState(): UserSettingsState {
    return {
      visibleCategories: ['banking', 'digital', 'savings', 'investments', 'private'],
      dismissedBudgetAlerts: [],
      setVisibleCategories: async (ids: string[]) => {
        store.update({ visibleCategories: ids })
      },
      dismissBudgetAlert: async (budgetId: string) => {
        store.update({ dismissedBudgetAlerts: [...store.getState().dismissedBudgetAlerts, budgetId] })
      },
      resetDismissedAlerts: async () => {
        store.update({ dismissedBudgetAlerts: [] })
      },
      isSettingsReady: true,
      isSettingsLoading: false,
      settingsError: null,
      audioEnabled: true,
      audioVolume: 0.3,
      setAudioEnabled: async (value: boolean) => {
        store.update({ audioEnabled: value })
      },
      setAudioVolume: async (value: number) => {
        store.update({ audioVolume: value })
      },
      displayPreferences: structuredClone(DISPLAY_DEFAULTS),
      setDisplayPreference: async <K extends keyof DisplayPreferences>(key: K, value: DisplayPreferences[K]) => {
        store.update({
          displayPreferences: {
            ...store.getState().displayPreferences,
            [key]: value,
          },
        })
      },
      screenReaderPreferences: structuredClone(SCREEN_READER_DEFAULTS),
      setScreenReaderPreference: async <K extends keyof ScreenReaderPreferences>(key: K, value: ScreenReaderPreferences[K]) => {
        store.update({
          screenReaderPreferences: {
            ...store.getState().screenReaderPreferences,
            [key]: value,
          },
        })
      },
      talkBackAdaptations: structuredClone(TALKBACK_DEFAULTS),
      talkBackManualOverride: null,
      setTalkBackAdaptations: async (adaptations: TalkBackAdaptations) => {
        store.update({ talkBackAdaptations: adaptations })
      },
      setTalkBackManualOverride: async (value: boolean | null) => {
        store.update({ talkBackManualOverride: value })
      },
      resetScreenReaderPreferences: async () => {
        store.update({ screenReaderPreferences: structuredClone(SCREEN_READER_DEFAULTS) })
      },
    }
  }

  state = createState()

  return store
})

const appDataStore = vi.hoisted(() => {
  let state: Record<string, unknown>
  const listeners = new Set<() => void>()

  const createState = (initialKv: Record<string, unknown> = {}) => ({
    accounts: Array.isArray(initialKv.accounts) ? structuredClone(initialKv.accounts) : [],
    transactions: Array.isArray(initialKv.transactions) ? structuredClone(initialKv.transactions) : [],
    categories: Array.isArray(initialKv.categories) ? structuredClone(initialKv.categories) : [],
    budgets: Array.isArray(initialKv.budgets) ? structuredClone(initialKv.budgets) : [],
    savingsGoals: Array.isArray(initialKv['savings-goals']) ? structuredClone(initialKv['savings-goals']) : [],
    safeAccounts: Array.isArray(initialKv.accounts) ? structuredClone(initialKv.accounts) : [],
    safeTransactions: Array.isArray(initialKv.transactions) ? structuredClone(initialKv.transactions) : [],
    safeCategories: Array.isArray(initialKv.categories) ? structuredClone(initialKv.categories) : [],
    safeBudgets: Array.isArray(initialKv.budgets) ? structuredClone(initialKv.budgets) : [],
    safeSavingsGoals: Array.isArray(initialKv['savings-goals']) ? structuredClone(initialKv['savings-goals']) : [],
    isLoading: false,
    error: null,
    isDataReady: true,
    budgetPercentages: {},
    setBudgetPercentages: vi.fn(),
    addAccount: vi.fn(),
    updateAccount: vi.fn(),
    removeAccount: vi.fn(),
    addTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    removeTransaction: vi.fn(),
    addCategory: vi.fn(),
    updateCategory: vi.fn(),
    removeCategory: vi.fn(),
    addBudget: vi.fn(),
    updateBudget: vi.fn(),
    removeBudget: vi.fn(),
    addSavingsGoal: vi.fn(),
    updateSavingsGoal: vi.fn(),
    updateSavingsGoalProgress: vi.fn(),
    removeSavingsGoal: vi.fn(),
    refreshAll: vi.fn(),
    handleSaveAccount: vi.fn(),
    handleSaveTransaction: vi.fn(),
    handleSaveBudget: vi.fn(),
    handleSaveSavingsGoal: vi.fn(),
    handleDeleteConfirm: vi.fn(),
    handleExportCSV: vi.fn(),
    handleViewBudget: vi.fn(),
    editingTransaction: undefined,
    setEditingTransaction: vi.fn(),
    showTransactionDialog: false,
    setShowTransactionDialog: vi.fn(),
    deletingItem: null,
    setDeletingItem: vi.fn(),
    showDeleteDialog: false,
    setShowDeleteDialog: vi.fn(),
    editingAccount: undefined,
    setEditingAccount: vi.fn(),
    showAccountDialog: false,
    setShowAccountDialog: vi.fn(),
    showBudgetDialog: false,
    setShowBudgetDialog: vi.fn(),
    editingBudget: undefined,
    setEditingBudget: vi.fn(),
    showSavingsGoalDialog: false,
    setShowSavingsGoalDialog: vi.fn(),
    editingSavingsGoal: undefined,
    setEditingSavingsGoal: vi.fn(),
    handleAddFundsToGoal: vi.fn(),
    showKeyboardHelp: false,
    setShowKeyboardHelp: vi.fn(),
  })

  const store = {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getState() {
      return state
    },
    reset(initialKv: Record<string, unknown> = {}) {
      state = createState(initialKv)
      listeners.forEach((listener) => listener())
    },
  }

  state = createState()

  return store
})

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => {
    React.useSyncExternalStore(authStore.subscribe, authStore.getState, authStore.getState)
    return authStore.getState()
  },
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/context/AppDataContext', () => ({
  useAppData: () => {
    React.useSyncExternalStore(appDataStore.subscribe, appDataStore.getState, appDataStore.getState)
    return appDataStore.getState()
  },
  AppDataProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/context/UserSettingsContext', () => ({
  useUserSettings: () => {
    React.useSyncExternalStore(userSettingsStore.subscribe, userSettingsStore.getState, userSettingsStore.getState)
    return userSettingsStore.getState()
  },
  UserSettingsProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/context/VisibleDataContext', () => ({
  useVisibleData: () => {
    React.useSyncExternalStore(authStore.subscribe, authStore.getState, authStore.getState)
    React.useSyncExternalStore(appDataStore.subscribe, appDataStore.getState, appDataStore.getState)
    React.useSyncExternalStore(userSettingsStore.subscribe, userSettingsStore.getState, userSettingsStore.getState)

    const authState = authStore.getState()
    const appDataState = appDataStore.getState() as {
      safeAccounts: Account[]
      safeTransactions: Transaction[]
    }
    const userSettingsState = userSettingsStore.getState()

    const visibleAccounts = appDataState.safeAccounts.filter((account) => {
      if (account.isPrivato && !authState.isPrivateUnlocked) {
        return false
      }
      return true
    })

    const visibleAccountIds = new Set(visibleAccounts.map((account) => account.id))
    const visibleTransactions = appDataState.safeTransactions.filter((transaction) => visibleAccountIds.has(transaction.contoId))
    const groupedAccounts = ACCOUNT_CATEGORIES
      .map((category) => ({
        ...category,
        accounts: visibleAccounts.filter((account) => ACCOUNT_TYPE_TO_CATEGORY[account.tipo] === category.id),
      }))
      .filter((group) => group.accounts.length > 0)

    const filteredGroupedAccounts = groupedAccounts.filter((group) => userSettingsState.visibleCategories.includes(group.id))
    const hasPrivateAccount = appDataState.safeAccounts.some((account) => account.isPrivato)
    const privateAccount = appDataState.safeAccounts.find((account) => account.isPrivato)
    const totalBalance = visibleAccounts.reduce((sum, account) => sum + account.saldoIniziale, 0)
    const recentTransactions = [...visibleTransactions]
      .sort((left, right) => new Date(right.data).getTime() - new Date(left.data).getTime())
      .slice(0, 10)

    return {
      visibleAccounts,
      visibleTransactions,
      hasPrivateAccount,
      privateAccount,
      totalBalance,
      recentTransactions,
      groupedAccounts,
      filteredGroupedAccounts,
      allCategoriesVisible: userSettingsState.visibleCategories.length === ACCOUNT_CATEGORIES.length,
      budgetAlerts: [],
    }
  },
  VisibleDataProvider: ({ children }: { children: React.ReactNode }) => children,
}))

type RenderAppOptions = {
  initialKv?: Record<string, unknown>
}

export function renderApp(options: RenderAppOptions = {}) {
  authStore.reset()
  appDataStore.reset(options.initialKv ?? {})
  userSettingsStore.reset()

  const user = userEvent.setup()
  const result = render(
    React.createElement(TooltipProvider, {
      delayDuration: 200,
      children: React.createElement(App),
    })
  )
  return { ...result, user }
}

export async function authenticateWithPin(user: ReturnType<typeof userEvent.setup>, _pin = '1234') {
  await act(async () => {
    authStore.setState({
      isAuthReady: true,
      isAuthenticated: true,
      needsOnboarding: false,
    })
  })

  await screen.findByText(/I Tuoi Conti/i)
}
