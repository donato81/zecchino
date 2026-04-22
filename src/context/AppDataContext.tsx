import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useKV } from '@github/spark/hooks'
import { Account, Transaction, Category, Budget, SavingsGoal } from '@/lib/types'
import { DEFAULT_CATEGORIES, ACCOUNT_CATEGORIES } from '@/lib/constants'
import { generateId } from '@/lib/helpers'

type AppDataContextValue = {
  accounts: Account[]
  setAccounts: ReturnType<typeof useKV<Account[]>>[1]
  transactions: Transaction[]
  setTransactions: ReturnType<typeof useKV<Transaction[]>>[1]
  categories: Category[]
  setCategories: ReturnType<typeof useKV<Category[]>>[1]
  budgets: Budget[]
  setBudgets: ReturnType<typeof useKV<Budget[]>>[1]
  savingsGoals: SavingsGoal[]
  setSavingsGoals: ReturnType<typeof useKV<SavingsGoal[]>>[1]
  visibleCategories: string[]
  setVisibleCategories: ReturnType<typeof useKV<string[]>>[1]
  dismissedAlerts: string[]
  setDismissedAlerts: ReturnType<typeof useKV<string[]>>[1]
  budgetPercentages: Record<string, number>
  setBudgetPercentages: ReturnType<typeof useKV<Record<string, number>>>[1]
  safeAccounts: Account[]
  safeTransactions: Transaction[]
  safeCategories: Category[]
  safeBudgets: Budget[]
  safeSavingsGoals: SavingsGoal[]
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useKV<Account[]>('accounts', [])
  const [transactions, setTransactions] = useKV<Transaction[]>('transactions', [])
  const [categories, setCategories] = useKV<Category[]>('categories', [])
  const [budgets, setBudgets] = useKV<Budget[]>('budgets', [])
  const [savingsGoals, setSavingsGoals] = useKV<SavingsGoal[]>('savings-goals', [])
  const [visibleCategories, setVisibleCategories] = useKV<string[]>(
    'visible-categories',
    ACCOUNT_CATEGORIES.map(category => category.id)
  )
  const [dismissedAlerts, setDismissedAlerts] = useKV<string[]>('dismissed-budget-alerts', [])
  const [budgetPercentages, setBudgetPercentages] = useKV<Record<string, number>>('budget-percentages', {})

  const safeAccounts = useMemo(() => accounts || [], [accounts])
  const safeTransactions = useMemo(() => transactions || [], [transactions])
  const safeCategories = useMemo(() => categories || [], [categories])
  const safeBudgets = useMemo(() => budgets || [], [budgets])
  const safeSavingsGoals = useMemo(() => savingsGoals || [], [savingsGoals])

  useEffect(() => {
    if (safeCategories.length === 0) {
      const defaultCategories: Category[] = DEFAULT_CATEGORIES.map(category => ({
        ...category,
        id: generateId(),
      }))
      setCategories(defaultCategories)
    }
  }, [safeCategories.length, setCategories])

  return (
    <AppDataContext.Provider
      value={{
        accounts,
        setAccounts,
        transactions,
        setTransactions,
        categories,
        setCategories,
        budgets,
        setBudgets,
        savingsGoals,
        setSavingsGoals,
        visibleCategories,
        setVisibleCategories,
        dismissedAlerts,
        setDismissedAlerts,
        budgetPercentages,
        setBudgetPercentages,
        safeAccounts,
        safeTransactions,
        safeCategories,
        safeBudgets,
        safeSavingsGoals,
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) {
    throw new Error('useAppData deve essere usato dentro AppDataProvider')
  }

  return context
}