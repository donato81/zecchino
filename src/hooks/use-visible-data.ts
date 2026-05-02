import { useMemo } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useUserSettings } from '@/context/UserSettingsContext'
import { ACCOUNT_CATEGORIES, ACCOUNT_TYPE_TO_CATEGORY } from '@/lib/constants'
import { generateBudgetAlerts, type BudgetAlert } from '@/lib/budget-alerts'
import { getTotalBalance } from '@/lib/helpers'
import type { Account, AccountGroup, Transaction } from '@/lib/types'

export type VisibleDataResult = {
  visibleAccounts: Account[]
  visibleTransactions: Transaction[]
  hasPrivateAccount: boolean
  privateAccount: Account | undefined
  totalBalance: number
  recentTransactions: Transaction[]
  groupedAccounts: AccountGroup[]
  filteredGroupedAccounts: AccountGroup[]
  allCategoriesVisible: boolean
  budgetAlerts: BudgetAlert[]
}

export function useVisibleData(): VisibleDataResult {
  const {
    safeAccounts,
    safeTransactions,
    safeBudgets,
  } = useAppData()
  const { visibleCategories, dismissedBudgetAlerts } = useUserSettings()
  const { isPrivateUnlocked } = useAuth()

  const visibleAccounts = useMemo(() => {
    return safeAccounts.filter(account => {
      if (account.isPrivato && !isPrivateUnlocked) {
        return false
      }
      return true
    })
  }, [safeAccounts, isPrivateUnlocked])

  const visibleTransactions = useMemo(() => {
    const accountIds = new Set(visibleAccounts.map(account => account.id))
    return safeTransactions.filter(transaction => accountIds.has(transaction.contoId))
  }, [safeTransactions, visibleAccounts])

  const hasPrivateAccount = useMemo(
    () => safeAccounts.some(account => account.isPrivato),
    [safeAccounts]
  )

  const privateAccount = useMemo(
    () => safeAccounts.find(account => account.isPrivato),
    [safeAccounts]
  )

  const totalBalance = useMemo(() => {
    return getTotalBalance(visibleAccounts, visibleTransactions)
  }, [visibleAccounts, visibleTransactions])

  const recentTransactions = useMemo(() => {
    return [...visibleTransactions]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10)
  }, [visibleTransactions])

  const groupedAccounts = useMemo((): AccountGroup[] => {
    const groups = new Map<string, Account[]>()

    visibleAccounts.forEach(account => {
      const categoryId = ACCOUNT_TYPE_TO_CATEGORY[account.tipo]
      if (!groups.has(categoryId)) {
        groups.set(categoryId, [])
      }
      groups.get(categoryId)?.push(account)
    })

    return ACCOUNT_CATEGORIES
      .map(category => ({
        ...category,
        accounts: groups.get(category.id) || [],
      }))
      .filter(group => group.accounts.length > 0)
  }, [visibleAccounts])

  const filteredGroupedAccounts = useMemo(() => {
    const safeVisibleCategories = visibleCategories || []
    return groupedAccounts.filter(group => safeVisibleCategories.includes(group.id))
  }, [groupedAccounts, visibleCategories])

  const allCategoriesVisible = useMemo(() => {
    const currentCategories = visibleCategories || []
    return currentCategories.length === ACCOUNT_CATEGORIES.length
  }, [visibleCategories])

  const budgetAlerts = useMemo(() => {
    const alerts = generateBudgetAlerts(safeBudgets, visibleTransactions)
    const dismissedIds = dismissedBudgetAlerts || []
    return alerts.filter(alert => !dismissedIds.includes(alert.budgetId))
  }, [safeBudgets, visibleTransactions, dismissedBudgetAlerts])

  return {
    visibleAccounts,
    visibleTransactions,
    hasPrivateAccount,
    privateAccount,
    totalBalance,
    recentTransactions,
    groupedAccounts,
    filteredGroupedAccounts,
    allCategoriesVisible,
    budgetAlerts,
  }
}