import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { vi } from 'vitest'
import App from '@/App'
import { TooltipProvider } from '@/components/ui/tooltip'
import { resetTestKvStore, seedTestKvStore } from '../setup'

type MockAuthState = {
  user: { id: string; email: string } | null
  session: null
  isAuthReady: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  inactivityTimeout: number
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isPrivateUnlocked: boolean
  setIsPrivateUnlocked: (value: boolean) => void
  showPrivatePinDialog: boolean
  setShowPrivatePinDialog: (value: boolean) => void
  setInactivityTimeout: (minutes: number) => Promise<void>
  handlePrivatePinSubmit: (pin: string, onUnlocked?: () => void) => Promise<void>
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
      inactivityTimeout: 5,
      signIn: async () => {
        store.setState({ isAuthenticated: true })
      },
      signUp: async () => undefined,
      signOut: async () => {
        store.setState({
          isAuthenticated: false,
          isPrivateUnlocked: false,
          showPrivatePinDialog: false,
        })
      },
      resetPassword: async () => undefined,
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
      handlePrivatePinSubmit: async (_pin: string, onUnlocked?: () => void) => {
        store.setState({
          isPrivateUnlocked: true,
          showPrivatePinDialog: false,
        })
        onUnlocked?.()
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
  useUserSettings: () => ({
    visibleCategories: ['banking', 'digital', 'savings', 'investments', 'private'],
    dismissedBudgetAlerts: [],
    setVisibleCategories: vi.fn().mockResolvedValue(undefined),
    dismissBudgetAlert: vi.fn().mockResolvedValue(undefined),
    resetDismissedAlerts: vi.fn().mockResolvedValue(undefined),
    isSettingsReady: true,
    isSettingsLoading: false,
    settingsError: null,
  }),
  UserSettingsProvider: ({ children }: { children: React.ReactNode }) => children,
}))

type RenderAppOptions = {
  initialKv?: Record<string, unknown>
}

export function renderApp(options: RenderAppOptions = {}) {
  resetTestKvStore()
  seedTestKvStore(options.initialKv ?? {})
  authStore.reset()
  appDataStore.reset(options.initialKv ?? {})

  const user = userEvent.setup()
  const result = render(
    React.createElement(TooltipProvider, {
      delayDuration: 200,
      children: React.createElement(App),
    })
  )
  return { ...result, user }
}

export async function authenticateWithPin(user: ReturnType<typeof userEvent.setup>, pin = '1234') {
  await act(async () => {
    authStore.setState({
      isAuthReady: true,
      isAuthenticated: true,
      needsOnboarding: false,
    })
  })

  await screen.findByText(/I Tuoi Conti/i)
}
