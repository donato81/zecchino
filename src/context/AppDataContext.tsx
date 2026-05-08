import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Account, Transaction, TransactionInput, Category, Budget, SavingsGoal } from '@/lib/types'
import { formatCurrency, exportToCSV, downloadFile, getActiveBudgets, getBudgetProgress } from '@/lib/helpers'
import { shouldShowBudgetNotification, getBudgetNotificationTitle } from '@/lib/budget-alerts'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { toast } from 'sonner'
import {
  getAll as getAllConti, create as createConto,
  update as updateConto, remove as removeConto,
} from '@/lib/supabase/repositories/conti'
import {
  getAll as getAllTransazioni, create as createTransazione,
  update as updateTransazione, remove as removeTransazione,
} from '@/lib/supabase/repositories/transazioni'
import {
  getAll as getAllCategorie, create as createCategoria,
  update as updateCategoria, remove as removeCategoria,
} from '@/lib/supabase/repositories/categorie'
import {
  getAll as getAllBudget, create as createBudgetItem,
  update as updateBudgetItem, remove as removeBudgetItem,
} from '@/lib/supabase/repositories/budget'
import {
  getAll as getAllObiettivi, create as createObiettivo,
  update as updateObiettivo, remove as removeObiettivo,
  updateProgress as updateObiettivoProgress,
} from '@/lib/supabase/repositories/obiettivi-risparmio'
import { CACHE_TTL_MS, isCacheStale, readCache, writeCache } from '@/lib/supabase/cache'
import { useAuth } from '@/context/AuthContext'
import { RepositoryError } from '@/lib/supabase/types'

type AppDataContextValue = {
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  savingsGoals: SavingsGoal[]
  isLoading: boolean
  error: string | null
  isDataReady: boolean
  safeAccounts: Account[]
  safeTransactions: Transaction[]
  safeCategories: Category[]
  safeBudgets: Budget[]
  safeSavingsGoals: SavingsGoal[]
  // Repository actions
  addAccount: (data: Omit<Account, 'id'>) => Promise<void>
  updateAccount: (id: string, data: Partial<Omit<Account, 'id'>>) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  addTransaction: (data: Omit<Transaction, 'id' | 'cifrato'>) => Promise<void>
  updateTransaction: (id: string, data: Partial<Omit<Transaction, 'id' | 'cifrato'>>) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  addCategory: (data: Omit<Category, 'id'>) => Promise<void>
  updateCategory: (id: string, data: Partial<Omit<Category, 'id'>>) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  addBudget: (data: Omit<Budget, 'id'>) => Promise<void>
  updateBudget: (id: string, data: Partial<Omit<Budget, 'id'>>) => Promise<void>
  removeBudget: (id: string) => Promise<void>
  addSavingsGoal: (data: Omit<SavingsGoal, 'id'>) => Promise<void>
  updateSavingsGoal: (id: string, data: Partial<Omit<SavingsGoal, 'id'>>) => Promise<void>
  updateSavingsGoalProgress: (id: string, importoCorrente: number) => Promise<void>
  removeSavingsGoal: (id: string) => Promise<void>
  refreshAll: () => void
  // Legacy handlers used by DialogsOverlay and other existing consumers
  handleSaveAccount: (account: Account) => void
  handleSaveTransaction: (transaction: TransactionInput) => void
  handleSaveBudget: (budget: Budget) => void
  handleSaveSavingsGoal: (goal: SavingsGoal) => void
  handleDeleteConfirm: () => void
  handleExportCSV: (visibleTransactions: Transaction[], visibleAccounts: Account[]) => void
  handleViewBudget: (budgetId: string, onNavigate: (budget: Budget) => void) => void
  // Dialog transaction
  editingTransaction: Transaction | undefined
  setEditingTransaction: (t: Transaction | undefined) => void
  showTransactionDialog: boolean
  setShowTransactionDialog: (v: boolean) => void
  openNewTransactionDialog: () => void
  openEditTransactionDialog: (tx: Transaction) => void
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
  // Dialog keyboard shortcuts
  showKeyboardHelp: boolean
  setShowKeyboardHelp: (v: boolean) => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

type DomainSnapshot = {
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  savingsGoals: SavingsGoal[]
}

const OFFLINE_CACHE_MESSAGE = 'Modalità offline: stai vedendo dati salvati in precedenza.'
const OFFLINE_STALE_CACHE_MESSAGE = 'Modalità offline: stai vedendo dati salvati in precedenza. I dati potrebbero non essere aggiornati.'
const OFFLINE_FIRST_ACCESS_MESSAGE = 'Non è possibile caricare i dati senza connessione al primo accesso. Connettiti e riprova.'

async function loadDomainSnapshot(): Promise<DomainSnapshot> {
  const [accounts, transactions, categories, budgets, savingsGoals] = await Promise.all([
    getAllConti(),
    getAllTransazioni(),
    getAllCategorie(),
    getAllBudget(),
    getAllObiettivi(),
  ])

  return {
    accounts,
    transactions,
    categories,
    budgets,
    savingsGoals,
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDataReady, setIsDataReady] = useState(false)

  const [budgetPercentages, setBudgetPercentages] = useState<Record<string, number>>({})

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
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  const openNewTransactionDialog = useCallback(() => {
    setEditingTransaction(undefined)
    setShowTransactionDialog(true)
  }, [])

  const openEditTransactionDialog = useCallback((tx: Transaction) => {
    setEditingTransaction(tx)
    setShowTransactionDialog(true)
  }, [])

  const handleAddFundsToGoal = (goal: SavingsGoal) => {
    setEditingSavingsGoal(goal)
    setShowSavingsGoalDialog(true)
  }

  const safeAccounts = useMemo(() => accounts, [accounts])
  const safeTransactions = useMemo(() => transactions, [transactions])
  const safeCategories = useMemo(() => categories, [categories])
  const safeBudgets = useMemo(() => budgets, [budgets])
  const safeSavingsGoals = useMemo(() => savingsGoals, [savingsGoals])

  const screenReader = useScreenReader()

  const applyDomainSnapshot = useCallback((snapshot: DomainSnapshot) => {
    setAccounts(snapshot.accounts)
    setTransactions(snapshot.transactions)
    setCategories(snapshot.categories)
    setBudgets(snapshot.budgets)
    setSavingsGoals(snapshot.savingsGoals)
    setBudgetPercentages({})
  }, [])

  const readCachedDomainSnapshot = useCallback((userId: string): { snapshot: DomainSnapshot; isStale: boolean } | null => {
    const accounts = readCache<Account[]>(userId, 'conti')
    const transactions = readCache<Transaction[]>(userId, 'transazioni')
    const categories = readCache<Category[]>(userId, 'categorie')
    const budgets = readCache<Budget[]>(userId, 'budget')
    const savingsGoals = readCache<SavingsGoal[]>(userId, 'obiettivi_risparmio')

    if (!accounts || !transactions || !categories || !budgets || !savingsGoals) {
      return null
    }

    return {
      snapshot: {
        accounts: accounts.data,
        transactions: transactions.data,
        categories: categories.data,
        budgets: budgets.data,
        savingsGoals: savingsGoals.data,
      },
      isStale: [
        isCacheStale(userId, 'conti', CACHE_TTL_MS),
        isCacheStale(userId, 'transazioni', CACHE_TTL_MS),
        isCacheStale(userId, 'categorie', CACHE_TTL_MS),
        isCacheStale(userId, 'budget', CACHE_TTL_MS),
        isCacheStale(userId, 'obiettivi_risparmio', CACHE_TTL_MS),
      ].some(Boolean),
    }
  }, [])

  const hydrateFromCache = useCallback((userId: string): boolean => {
    const cached = readCachedDomainSnapshot(userId)
    if (!cached) {
      setError(OFFLINE_FIRST_ACCESS_MESSAGE)
      setIsLoading(false)
      setIsDataReady(false)
      return false
    }

    applyDomainSnapshot(cached.snapshot)
    setError(cached.isStale ? OFFLINE_STALE_CACHE_MESSAGE : OFFLINE_CACHE_MESSAGE)
    setIsLoading(false)
    setIsDataReady(true)
    return true
  }, [applyDomainSnapshot, readCachedDomainSnapshot])

  // Bootstrap: carica tutti i dati in parallelo al login, resetta al logout
  useEffect(() => {
    let cancelled = false

    if (!isAuthenticated || !user?.id) {
      setAccounts([])
      setTransactions([])
      setCategories([])
      setBudgets([])
      setSavingsGoals([])
      setBudgetPercentages({})
      setIsLoading(false)
      setError(null)
      setIsDataReady(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const loadBootstrapData = async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (!cancelled) {
          hydrateFromCache(user.id)
        }
        return
      }

      try {
        const snapshot = await loadDomainSnapshot()
        if (cancelled) return
        applyDomainSnapshot(snapshot)
        setError(null)
        setIsLoading(false)
        setIsDataReady(true)
      } catch {
        if (cancelled) return
        hydrateFromCache(user.id)
      }
    }

    void loadBootstrapData()

    return () => { cancelled = true }
  }, [applyDomainSnapshot, hydrateFromCache, isAuthenticated, user?.id])

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !isDataReady) return

    writeCache(user.id, 'conti', accounts)
    writeCache(user.id, 'transazioni', transactions)
    writeCache(user.id, 'categorie', categories)
    writeCache(user.id, 'budget', budgets)
    writeCache(user.id, 'obiettivi_risparmio', savingsGoals)
  }, [accounts, budgets, categories, isAuthenticated, isDataReady, savingsGoals, transactions, user?.id])

  const refreshAll = () => {
    if (isLoading || !user?.id) return
    setIsLoading(true)
    setError(null)

    const reloadData = async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        hydrateFromCache(user.id)
        return
      }

      try {
        const snapshot = await loadDomainSnapshot()
        applyDomainSnapshot(snapshot)
        setError(null)
        setIsLoading(false)
        setIsDataReady(true)
      } catch {
        hydrateFromCache(user.id)
      }
    }

    void reloadData()
  }

  // --- Repository actions (pure, no UX side effects) ---

  const addAccount = async (data: Omit<Account, 'id'>): Promise<void> => {
    const saved = await createConto(data)
    setAccounts(prev => [...prev, saved])
  }

  const updateAccount = async (id: string, data: Partial<Omit<Account, 'id'>>): Promise<void> => {
    const saved = await updateConto(id, data)
    setAccounts(prev => prev.map(a => a.id === id ? saved : a))
  }

  const removeAccount = async (id: string): Promise<void> => {
    await removeConto(id)
    setAccounts(prev => prev.filter(a => a.id !== id))
    setTransactions(prev => prev.filter(t => t.contoId !== id && t.contoDestinazioneId !== id))
  }

  const addTransaction = async (data: Omit<Transaction, 'id' | 'cifrato'>): Promise<void> => {
    const saved = await createTransazione(data)
    setTransactions(prev => [...prev, saved])
  }

  const updateTransaction = async (id: string, data: Partial<Omit<Transaction, 'id' | 'cifrato'>>): Promise<void> => {
    const saved = await updateTransazione(id, data)
    setTransactions(prev => prev.map(t => t.id === id ? saved : t))
  }

  const removeTransaction = async (id: string): Promise<void> => {
    await removeTransazione(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const addCategory = async (data: Omit<Category, 'id'>): Promise<void> => {
    const saved = await createCategoria(data)
    setCategories(prev => [...prev, saved])
  }

  const updateCategory = async (id: string, data: Partial<Omit<Category, 'id'>>): Promise<void> => {
    const saved = await updateCategoria(id, data)
    setCategories(prev => prev.map(c => c.id === id ? saved : c))
  }

  const removeCategory = async (id: string): Promise<void> => {
    try {
      await removeCategoria(id)
      setCategories(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      if (err instanceof RepositoryError && err.code === '23503') {
        const message = "Impossibile eliminare la categoria: è usata da movimenti esistenti. Riassegna prima i movimenti a un'altra categoria."
        setError(message)
        throw new Error(message)
      }
      throw err
    }
  }

  const addBudget = async (data: Omit<Budget, 'id'>): Promise<void> => {
    const saved = await createBudgetItem(data)
    setBudgets(prev => [...prev, saved])
  }

  const updateBudget = async (id: string, data: Partial<Omit<Budget, 'id'>>): Promise<void> => {
    const saved = await updateBudgetItem(id, data)
    setBudgets(prev => prev.map(b => b.id === id ? saved : b))
  }

  const removeBudget = async (id: string): Promise<void> => {
    await removeBudgetItem(id)
    setBudgets(prev => prev.filter(b => b.id !== id))
  }

  const addSavingsGoal = async (data: Omit<SavingsGoal, 'id'>): Promise<void> => {
    const saved = await createObiettivo(data)
    setSavingsGoals(prev => [...prev, saved])
  }

  const updateSavingsGoal = async (id: string, data: Partial<Omit<SavingsGoal, 'id'>>): Promise<void> => {
    const saved = await updateObiettivo(id, data)
    setSavingsGoals(prev => prev.map(g => g.id === id ? saved : g))
  }

  const updateSavingsGoalProgress = async (id: string, importoCorrente: number): Promise<void> => {
    const saved = await updateObiettivoProgress(id, importoCorrente)
    setSavingsGoals(prev => prev.map(g => g.id === id ? saved : g))
  }

  const removeSavingsGoal = async (id: string): Promise<void> => {
    await removeObiettivo(id)
    setSavingsGoals(prev => prev.filter(g => g.id !== id))
  }

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

  // --- Legacy handlers (thin wrappers, kept for DialogsOverlay compatibility) ---

  const handleSaveAccount = async (account: Account) => {
    try {
      const existing = accounts.find(a => a.id === account.id)
      if (existing) {
        const { id, ...data } = account
        await updateAccount(id, data)
        soundSystem.play('save')
        hapticSystem.save()
        toast.success('Conto modificato')
        screenReader.announceSuccess(`Conto ${account.nome} modificato con successo.`)
      } else {
        const { id: _id, ...data } = account
        await addAccount(data)
        soundSystem.play('account-created')
        hapticSystem.accountCreated()
        toast.success(`Conto "${account.nome}" creato`)
        screenReader.announceSuccess(`Nuovo conto ${account.nome} di tipo ${account.tipo} creato con saldo iniziale di ${formatCurrency(account.saldoIniziale)}.`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante il salvataggio del conto'
      toast.error(message)
    }
  }

  const handleSaveTransaction = async (transaction: TransactionInput) => {
    try {
      const transactionData = transaction
      const existing = transaction.id
        ? transactions.find(t => t.id === transaction.id)
        : undefined
      if (transaction.id && existing) {
        const { id, ...updateData } = transactionData
        await updateTransaction(transaction.id, updateData)
        soundSystem.play('save')
        hapticSystem.save()
        toast.success('Movimento modificato')
        screenReader.announceSuccess('Movimento modificato con successo.')
      } else {
        const { id: _id, ...createData } = transactionData
        await addTransaction(createData)
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
        const account = accounts.find(a => a.id === transaction.contoId)
        const category = categories.find(c => c.id === transaction.categoriaId)
        toast.success(`Movimento aggiunto: ${transaction.tipo} ${formatCurrency(transaction.importo)} - ${account?.nome || ''}`)
        screenReader.announceTransaction(
          transaction.tipo,
          transaction.importo,
          account?.nome || 'Conto sconosciuto',
          category?.nome
        )
        if (transaction.tipo === 'uscita') {
          checkBudgetNotifications([...transactions, { ...transaction, cifrato: false, id: transaction.id ?? '' }])
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante il salvataggio del movimento'
      toast.error(message)
    }
  }

  const handleSaveBudget = async (budget: Budget) => {
    try {
      const existing = budgets.find(b => b.id === budget.id)
      if (existing) {
        const { id, ...data } = budget
        await updateBudget(id, data)
        soundSystem.play('save')
        hapticSystem.save()
        toast.success('Budget modificato')
        screenReader.announceSuccess(`Budget ${budget.nome} modificato.`)
      } else {
        const { id: _id, ...data } = budget
        await addBudget(data)
        soundSystem.play('budget-created')
        hapticSystem.budgetCreated()
        toast.success(`Budget "${budget.nome}" creato`)
        screenReader.announceSuccess(`Nuovo budget ${budget.nome} creato. Importo target: ${formatCurrency(budget.importoTarget)} per periodo ${budget.periodo}.`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante il salvataggio del budget'
      toast.error(message)
    }
  }

  const handleSaveSavingsGoal = async (goal: SavingsGoal) => {
    try {
      const existing = savingsGoals.find(g => g.id === goal.id)
      if (existing) {
        const { id, ...data } = goal
        await updateSavingsGoal(id, data)
        soundSystem.play('save')
        hapticSystem.save()
        toast.success('Obiettivo di risparmio modificato')
        screenReader.announceSuccess(`Obiettivo ${goal.nome} modificato.`)
      } else {
        const { id: _id, ...data } = goal
        await addSavingsGoal(data)
        soundSystem.play('goal-created')
        hapticSystem.goalCreated()
        toast.success(`Obiettivo "${goal.nome}" creato`)
        screenReader.announceSuccess(`Nuovo obiettivo di risparmio ${goal.nome} creato. Target: ${formatCurrency(goal.importoTarget)}.`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante il salvataggio'
      toast.error(message)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return
    soundSystem.play('delete')
    hapticSystem.delete()
    try {
      if (deletingItem.type === 'account') {
        const account = accounts.find(a => a.id === deletingItem.id)
        await removeAccount(deletingItem.id)
        soundSystem.play('account-deleted')
        hapticSystem.accountDeleted()
        toast.success('Conto eliminato')
        if (account) {
          screenReader.announceSuccess(`Conto ${account.nome} eliminato. Tutti i movimenti associati sono stati rimossi.`)
        } else {
          screenReader.announceSuccess('Conto eliminato.')
        }
      } else if (deletingItem.type === 'transaction') {
        await removeTransaction(deletingItem.id)
        toast.success('Movimento eliminato')
        screenReader.announceSuccess('Movimento eliminato.')
      } else if (deletingItem.type === 'budget') {
        const budget = budgets.find(b => b.id === deletingItem.id)
        await removeBudget(deletingItem.id)
        soundSystem.play('budget-deleted')
        hapticSystem.budgetDeleted()
        toast.success('Budget eliminato')
        if (budget) {
          screenReader.announceSuccess(`Budget ${budget.nome} eliminato.`)
        } else {
          screenReader.announceSuccess('Budget eliminato.')
        }
      } else if (deletingItem.type === 'savingsGoal') {
        const goal = savingsGoals.find(g => g.id === deletingItem.id)
        await removeSavingsGoal(deletingItem.id)
        toast.success('Obiettivo di risparmio eliminato')
        if (goal) {
          screenReader.announceSuccess(`Obiettivo ${goal.nome} eliminato.`)
        } else {
          screenReader.announceSuccess('Obiettivo eliminato.')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante l\'eliminazione'
      toast.error(message)
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

  const handleViewBudget = (budgetId: string, onNavigate: (budget: Budget) => void) => {
    soundSystem.play('dialog-open')
    hapticSystem.dialogOpen()
    const budget = safeBudgets.find(b => b.id === budgetId)
    if (budget) {
      onNavigate(budget)
    }
  }

  return (
    <AppDataContext.Provider
      value={{
        accounts: safeAccounts,
        transactions: safeTransactions,
        categories: safeCategories,
        budgets: safeBudgets,
        savingsGoals: safeSavingsGoals,
        isLoading,
        error,
        isDataReady,
        safeAccounts,
        safeTransactions,
        safeCategories,
        safeBudgets,
        safeSavingsGoals,
        addAccount,
        updateAccount,
        removeAccount,
        addTransaction,
        updateTransaction,
        removeTransaction,
        addCategory,
        updateCategory,
        removeCategory,
        addBudget,
        updateBudget,
        removeBudget,
        addSavingsGoal,
        updateSavingsGoal,
        updateSavingsGoalProgress,
        removeSavingsGoal,
        refreshAll,
        handleSaveAccount,
        handleSaveTransaction,
        handleSaveBudget,
        handleSaveSavingsGoal,
        handleDeleteConfirm,
        handleExportCSV,
        handleViewBudget,
        editingTransaction,
        setEditingTransaction,
        showTransactionDialog,
        setShowTransactionDialog,
        openNewTransactionDialog,
        openEditTransactionDialog,
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
        showKeyboardHelp,
        setShowKeyboardHelp,
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