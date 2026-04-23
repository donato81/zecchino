import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useKV } from '@github/spark/hooks'
import { Account, Transaction, Category, Budget, SavingsGoal } from '@/lib/types'
import { DEFAULT_CATEGORIES, ACCOUNT_CATEGORIES } from '@/lib/constants'
import { generateId, formatCurrency, exportToCSV, downloadFile, getActiveBudgets, getBudgetProgress } from '@/lib/helpers'
import { shouldShowBudgetNotification, getBudgetNotificationTitle } from '@/lib/budget-alerts'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { toast } from 'sonner'

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
  handleSaveAccount: (account: Account) => void
  handleSaveTransaction: (transaction: Transaction) => void
  handleSaveBudget: (budget: Budget) => void
  handleSaveSavingsGoal: (goal: SavingsGoal) => void
  handleDeleteConfirm: () => void
  handleExportCSV: (visibleTransactions: Transaction[], visibleAccounts: Account[]) => void
  toggleCategoryVisibility: (categoryId: string) => void
  toggleAllCategories: () => void
  handleDismissBudgetAlert: (budgetId: string) => void
  handleViewBudget: (budgetId: string, onNavigate: (budget: Budget) => void) => void
  // Dialog transaction
  editingTransaction: Transaction | undefined
  setEditingTransaction: (t: Transaction | undefined) => void
  showTransactionDialog: boolean
  setShowTransactionDialog: (v: boolean) => void
  // Dialog delete (shared)
  deletingItem: { type: 'account' | 'transaction' | 'budget' | 'savingsGoal'; id: string } | null
  setDeletingItem: (item: { type: 'account' | 'transaction' | 'budget' | 'savingsGoal'; id: string } | null) => void
  showDeleteDialog: boolean
  setShowDeleteDialog: (v: boolean) => void
  // Dialog account
  editingAccount: Account | undefined
  setEditingAccount: (a: Account | undefined) => void
  showAccountDialog: boolean
  setShowAccountDialog: (v: boolean) => void
  // Dialog budget
  showBudgetDialog: boolean
  setShowBudgetDialog: (v: boolean) => void
  editingBudget: Budget | undefined
  setEditingBudget: (b: Budget | undefined) => void
  // Dialog savings goal
  showSavingsGoalDialog: boolean
  setShowSavingsGoalDialog: (v: boolean) => void
  editingSavingsGoal: SavingsGoal | undefined
  setEditingSavingsGoal: (g: SavingsGoal | undefined) => void
  // Handler derivato
  handleAddFundsToGoal: (goal: SavingsGoal) => void
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

  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [deletingItem, setDeletingItem] = useState<{
    type: 'account' | 'transaction' | 'budget' | 'savingsGoal';
    id: string
  } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined)
  const [showSavingsGoalDialog, setShowSavingsGoalDialog] = useState(false)
  const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>(undefined)

  const handleAddFundsToGoal = (goal: SavingsGoal) => {
    setEditingSavingsGoal(goal)
    setShowSavingsGoalDialog(true)
  }

  const safeAccounts = useMemo(() => accounts || [], [accounts])
  const safeTransactions = useMemo(() => transactions || [], [transactions])
  const safeCategories = useMemo(() => categories || [], [categories])
  const safeBudgets = useMemo(() => budgets || [], [budgets])
  const safeSavingsGoals = useMemo(() => savingsGoals || [], [savingsGoals])

  const screenReader = useScreenReader()

  const checkBudgetNotifications = (updatedTransactions: Transaction[]) => {
    const activeBudgets = getActiveBudgets(safeBudgets)
    const currentPercentages = budgetPercentages || {}

    activeBudgets.forEach(budget => {
      const { percentage: newPercentage } = getBudgetProgress(budget, updatedTransactions)
      const previousPercentage = currentPercentages[budget.id] || 0

      const { shouldShow, level } = shouldShowBudgetNotification(budget, previousPercentage, newPercentage)

      if (shouldShow && level) {
        const title = getBudgetNotificationTitle(level)
        const { spent, remaining } = getBudgetProgress(budget, updatedTransactions)

        let message = ''
        if (level === 'exceeded') {
          message = `Budget "${budget.nome}" superato! Hai speso ${formatCurrency(spent)} su ${formatCurrency(budget.importoTarget)}.`
          soundSystem.play('budget-exceeded')
          hapticSystem.budgetExceeded()
        } else if (level === 'critical') {
          message = `Attenzione! Il budget "${budget.nome}" è al ${Math.round(newPercentage)}%. Rimangono ${formatCurrency(remaining)}.`
          soundSystem.play('budget-critical')
          hapticSystem.budgetCritical()
        } else if (level === 'warning') {
          message = `Il budget "${budget.nome}" ha raggiunto il ${Math.round(newPercentage)}%.`
          soundSystem.play('budget-warning')
          hapticSystem.budgetWarning()
        }

        if (level === 'exceeded') {
          toast.error(title, { description: message, duration: 6000 })
        } else if (level === 'critical') {
          toast.warning(title, { description: message, duration: 5000 })
        } else {
          toast(title, { description: message, duration: 4000 })
        }
      }

      setBudgetPercentages((current) => ({
        ...(current || {}),
        [budget.id]: newPercentage,
      }))
    })
  }

  const handleSaveAccount = (account: Account) => {
    setAccounts((currentAccounts) => {
      const current = currentAccounts || []
      const existingIndex = current.findIndex(a => a.id === account.id)
      if (existingIndex >= 0) {
        const updated = [...current]
        updated[existingIndex] = account
        soundSystem.play('save')
        hapticSystem.save()
        toast.success('Conto modificato')
        screenReader.announceSuccess(`Conto ${account.nome} modificato con successo.`)
        return updated
      } else {
        soundSystem.play('account-created')
        hapticSystem.accountCreated()
        toast.success(`Conto "${account.nome}" creato`)
        screenReader.announceSuccess(`Nuovo conto ${account.nome} di tipo ${account.tipo} creato con saldo iniziale di ${formatCurrency(account.saldoIniziale)}.`)
        return [...current, account]
      }
    })
  }

  const handleSaveTransaction = (transaction: Transaction) => {
    setTransactions((currentTransactions) => {
      const current = currentTransactions || []
      const existingIndex = current.findIndex(t => t.id === transaction.id)

      let updatedTransactions: Transaction[]
      if (existingIndex >= 0) {
        const updated = [...current]
        updated[existingIndex] = transaction
        soundSystem.play('save')
        hapticSystem.save()
        toast.success('Movimento modificato')
        screenReader.announceSuccess('Movimento modificato con successo.')
        updatedTransactions = updated
      } else {
        if (transaction.tipo === 'entrata') {
          soundSystem.play('income')
          hapticSystem.income()
        } else if (transaction.tipo === 'uscita') {
          soundSystem.play('expense')
          hapticSystem.expense()
        } else {
          soundSystem.play('transfer')
          hapticSystem.transfer()
        }
        const account = safeAccounts.find(a => a.id === transaction.contoId)
        const category = safeCategories.find(c => c.id === transaction.categoriaId)
        toast.success(`Movimento aggiunto: ${transaction.tipo} ${formatCurrency(transaction.importo)} - ${account?.nome || ''}`)
        screenReader.announceTransaction(
          transaction.tipo,
          transaction.importo,
          account?.nome || 'Conto sconosciuto',
          category?.nome
        )
        updatedTransactions = [...current, transaction]
      }

      if (transaction.tipo === 'uscita') {
        checkBudgetNotifications(updatedTransactions)
      }

      return updatedTransactions
    })
  }

  const handleSaveBudget = (budget: Budget) => {
    setBudgets((currentBudgets) => {
      const current = currentBudgets || []
      const existingIndex = current.findIndex(b => b.id === budget.id)
      if (existingIndex >= 0) {
        const updated = [...current]
        updated[existingIndex] = budget
        soundSystem.play('save')
        hapticSystem.save()
        toast.success('Budget modificato')
        screenReader.announceSuccess(`Budget ${budget.nome} modificato.`)
        return updated
      } else {
        soundSystem.play('budget-created')
        hapticSystem.budgetCreated()
        toast.success(`Budget "${budget.nome}" creato`)
        screenReader.announceSuccess(`Nuovo budget ${budget.nome} creato. Importo target: ${formatCurrency(budget.importoTarget)} per periodo ${budget.periodo}.`)
        return [...current, budget]
      }
    })
  }

  const handleSaveSavingsGoal = (goal: SavingsGoal) => {
    setSavingsGoals((currentGoals) => {
      const current = currentGoals || []
      const existingIndex = current.findIndex(g => g.id === goal.id)
      if (existingIndex >= 0) {
        const updated = [...current]
        updated[existingIndex] = goal
        soundSystem.play('save')
        hapticSystem.save()
        toast.success('Obiettivo di risparmio modificato')
        screenReader.announceSuccess(`Obiettivo ${goal.nome} modificato.`)
        return updated
      } else {
        soundSystem.play('goal-created')
        hapticSystem.goalCreated()
        toast.success(`Obiettivo "${goal.nome}" creato`)
        screenReader.announceSuccess(`Nuovo obiettivo di risparmio ${goal.nome} creato. Target: ${formatCurrency(goal.importoTarget)}.`)
        return [...current, goal]
      }
    })
  }

  const handleDeleteConfirm = () => {
    if (!deletingItem) return
    soundSystem.play('delete')
    hapticSystem.delete()
    if (deletingItem.type === 'account') {
      const account = safeAccounts.find(a => a.id === deletingItem.id)
      setAccounts((current) => (current || []).filter(a => a.id !== deletingItem.id))
      setTransactions((current) => (current || []).filter(t => t.contoId !== deletingItem.id && t.contoDestinazioneId !== deletingItem.id))
      soundSystem.play('account-deleted')
      hapticSystem.accountDeleted()
      toast.success('Conto eliminato')
      if (account) {
        screenReader.announceSuccess(`Conto ${account.nome} eliminato. Tutti i movimenti associati sono stati rimossi.`)
      } else {
        screenReader.announceSuccess('Conto eliminato.')
      }
    } else if (deletingItem.type === 'transaction') {
      setTransactions((current) => (current || []).filter(t => t.id !== deletingItem.id))
      toast.success('Movimento eliminato')
      screenReader.announceSuccess('Movimento eliminato.')
    } else if (deletingItem.type === 'budget') {
      const budget = safeBudgets.find(b => b.id === deletingItem.id)
      setBudgets((current) => (current || []).filter(b => b.id !== deletingItem.id))
      soundSystem.play('budget-deleted')
      hapticSystem.budgetDeleted()
      toast.success('Budget eliminato')
      if (budget) {
        screenReader.announceSuccess(`Budget ${budget.nome} eliminato.`)
      } else {
        screenReader.announceSuccess('Budget eliminato.')
      }
    } else if (deletingItem.type === 'savingsGoal') {
      const goal = safeSavingsGoals.find(g => g.id === deletingItem.id)
      setSavingsGoals((current) => (current || []).filter(g => g.id !== deletingItem.id))
      toast.success('Obiettivo di risparmio eliminato')
      if (goal) {
        screenReader.announceSuccess(`Obiettivo ${goal.nome} eliminato.`)
      } else {
        screenReader.announceSuccess('Obiettivo eliminato.')
      }
    }
  }

  const handleExportCSV = (visibleTransactions: Transaction[], visibleAccounts: Account[]) => {
    const csv = exportToCSV(visibleTransactions, visibleAccounts, safeCategories)
    downloadFile(csv, `zecchino-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
    soundSystem.play('export')
    hapticSystem.export()
    toast.success('Dati esportati in CSV')
    screenReader.announceSuccess(`Dati esportati. ${visibleTransactions.length} movimenti salvati in formato CSV.`)
  }

  const toggleCategoryVisibility = (categoryId: string) => {
    setVisibleCategories((current) => {
      const currentCategories = current || []
      const category = ACCOUNT_CATEGORIES.find(c => c.id === categoryId)
      const categoryName = category?.label || 'Categoria'

      if (currentCategories.includes(categoryId)) {
        soundSystem.play('filter-toggle')
        hapticSystem.filterToggle()
        screenReader.announceFilter(categoryName, false)
        return currentCategories.filter(id => id !== categoryId)
      } else {
        soundSystem.play('category-toggle')
        hapticSystem.categoryToggle()
        screenReader.announceFilter(categoryName, true)
        return [...currentCategories, categoryId]
      }
    })
  }

  const toggleAllCategories = () => {
    setVisibleCategories((current) => {
      const currentCategories = current || []
      const allCategoryIds = ACCOUNT_CATEGORIES.map(c => c.id)
      if (currentCategories.length === allCategoryIds.length) {
        soundSystem.play('filter-toggle')
        hapticSystem.filterToggle()
        return []
      } else {
        soundSystem.play('category-toggle')
        hapticSystem.categoryToggle()
        return allCategoryIds
      }
    })
  }

  const handleDismissBudgetAlert = (budgetId: string) => {
    setDismissedAlerts((current) => {
      const currentDismissed = current || []
      soundSystem.play('alert-dismissed')
      hapticSystem.alertDismissed()
      return [...currentDismissed, budgetId]
    })
  }

  const handleViewBudget = (budgetId: string, onNavigate: (budget: Budget) => void) => {
    soundSystem.play('dialog-open')
    hapticSystem.dialogOpen()
    const budget = safeBudgets.find(b => b.id === budgetId)
    if (budget) {
      onNavigate(budget)
    }
  }

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
        accounts: safeAccounts,
        setAccounts,
        transactions: safeTransactions,
        setTransactions,
        categories: safeCategories,
        setCategories,
        budgets: safeBudgets,
        setBudgets,
        savingsGoals: safeSavingsGoals,
        setSavingsGoals,
        visibleCategories: visibleCategories || [],
        setVisibleCategories,
        dismissedAlerts: dismissedAlerts || [],
        setDismissedAlerts,
        budgetPercentages: budgetPercentages || {},
        setBudgetPercentages,
        safeAccounts,
        safeTransactions,
        safeCategories,
        safeBudgets,
        safeSavingsGoals,
        handleSaveAccount,
        handleSaveTransaction,
        handleSaveBudget,
        handleSaveSavingsGoal,
        handleDeleteConfirm,
        handleExportCSV,
        toggleCategoryVisibility,
        toggleAllCategories,
        handleDismissBudgetAlert,
        handleViewBudget,
        editingTransaction,
        setEditingTransaction,
        showTransactionDialog,
        setShowTransactionDialog,
        deletingItem,
        setDeletingItem,
        showDeleteDialog,
        setShowDeleteDialog,
        editingAccount,
        setEditingAccount,
        showAccountDialog,
        setShowAccountDialog,
        showBudgetDialog,
        setShowBudgetDialog,
        editingBudget,
        setEditingBudget,
        showSavingsGoalDialog,
        setShowSavingsGoalDialog,
        editingSavingsGoal,
        setEditingSavingsGoal,
        handleAddFundsToGoal,
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