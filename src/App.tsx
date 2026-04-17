import { useState, useEffect, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Account, Transaction, Category, Budget } from '@/lib/types'
import { hashPin, verifyPin } from '@/lib/crypto'
import { DEFAULT_CATEGORIES, ACCOUNT_CATEGORIES, ACCOUNT_TYPE_TO_CATEGORY } from '@/lib/constants'
import { generateId, calculateAccountBalance, getTotalBalance, formatCurrency, exportToCSV, downloadFile, getActiveBudgets, getBudgetProgress } from '@/lib/helpers'
import { generateBudgetAlerts, shouldShowBudgetNotification, getBudgetNotificationTitle } from '@/lib/budget-alerts'
import { PinDialog } from '@/components/PinDialog'
import { AccountCard } from '@/components/AccountCard'
import { AccountDialog } from '@/components/AccountDialog'
import { TransactionDialog } from '@/components/TransactionDialog'
import { BudgetDialog } from '@/components/BudgetDialog'
import { BudgetProgressCard } from '@/components/BudgetProgressCard'
import { BudgetAlertBanner } from '@/components/BudgetAlertBanner'
import { BudgetHistoryChart } from '@/components/BudgetHistoryChart'
import { BudgetComparisonCard } from '@/components/BudgetComparisonCard'
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'
import { FocusIndicator } from '@/components/FocusIndicator'
import { IncomeExpenseChart } from '@/components/IncomeExpenseChart'
import { MonthlyComparisonChart } from '@/components/MonthlyComparisonChart'
import { PeriodSelector } from '@/components/PeriodSelector'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, LockOpen, ChartLine, List, Gear, DownloadSimple, Trash, PencilSimple, ArrowsLeftRight, Eye, EyeSlash, Keyboard, Target } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useListNavigation } from '@/hooks/use-list-navigation'

function App() {
  const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
  const [privatePinHash, setPrivatePinHash] = useKV<string>('private-pin-hash', '')
  const [accounts, setAccounts] = useKV<Account[]>('accounts', [])
  const [transactions, setTransactions] = useKV<Transaction[]>('transactions', [])
  const [categories, setCategories] = useKV<Category[]>('categories', [])
  const [budgets, setBudgets] = useKV<Budget[]>('budgets', [])

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)

  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  const [editingAccount, setEditingAccount] = useState<Account | undefined>()
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>()
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>()
  const [deletingItem, setDeletingItem] = useState<{ type: 'account' | 'transaction' | 'budget', id: string } | null>(null)

  const [activeTab, setActiveTab] = useState('dashboard')
  const [visibleCategories, setVisibleCategories] = useKV<string[]>('visible-categories', ACCOUNT_CATEGORIES.map(c => c.id))
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month')
  const [dismissedAlerts, setDismissedAlerts] = useKV<string[]>('dismissed-budget-alerts', [])
  const [budgetPercentages, setBudgetPercentages] = useKV<Record<string, number>>('budget-percentages', {})

  const safeAccounts = accounts || []
  const safeTransactions = transactions || []
  const safeCategories = categories || []
  const safeBudgets = budgets || []

  useEffect(() => {
    if (!globalPinHash) {
      setIsSetupMode(true)
      setShowPinDialog(true)
    } else {
      setShowPinDialog(true)
    }

    if (safeCategories.length === 0) {
      const defaultCats: Category[] = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        id: generateId()
      }))
      setCategories(defaultCats)
    }
  }, [])

  const handleGlobalPinSubmit = async (pin: string) => {
    if (isSetupMode) {
      const hash = await hashPin(pin)
      setGlobalPinHash(hash)
      setIsAuthenticated(true)
      setShowPinDialog(false)
      setIsSetupMode(false)
      toast.success('PIN globale creato con successo')
    } else {
      const isValid = await verifyPin(pin, globalPinHash || '')
      if (isValid) {
        setIsAuthenticated(true)
        setShowPinDialog(false)
        toast.success('Accesso consentito')
      } else {
        toast.error('PIN non corretto')
      }
    }
  }

  const handlePrivatePinSubmit = async (pin: string) => {
    if (!privatePinHash) {
      const hash = await hashPin(pin)
      setPrivatePinHash(hash)
      setIsPrivateUnlocked(true)
      setShowPrivatePinDialog(false)
      toast.success('PIN privato creato e conto sbloccato')
    } else {
      const isValid = await verifyPin(pin, privatePinHash)
      if (isValid) {
        setIsPrivateUnlocked(true)
        setShowPrivatePinDialog(false)
        const privateAccount = visibleAccounts.find(a => a.isPrivato)
        if (privateAccount) {
          const balance = calculateAccountBalance(privateAccount, visibleTransactions)
          toast.success(`Conto privato sbloccato. Saldo: ${formatCurrency(balance)}`)
        }
      } else {
        toast.error('PIN privato non corretto')
      }
    }
  }

  const handleSaveAccount = (account: Account) => {
    setAccounts((currentAccounts) => {
      const current = currentAccounts || []
      const existingIndex = current.findIndex(a => a.id === account.id)
      if (existingIndex >= 0) {
        const updated = [...current]
        updated[existingIndex] = account
        toast.success('Conto modificato')
        return updated
      } else {
        toast.success(`Conto "${account.nome}" creato`)
        return [...current, account]
      }
    })
    setEditingAccount(undefined)
  }

  const handleSaveTransaction = (transaction: Transaction) => {
    setTransactions((currentTransactions) => {
      const current = currentTransactions || []
      const existingIndex = current.findIndex(t => t.id === transaction.id)
      
      let updatedTransactions: Transaction[]
      if (existingIndex >= 0) {
        const updated = [...current]
        updated[existingIndex] = transaction
        toast.success('Movimento modificato')
        updatedTransactions = updated
      } else {
        const account = safeAccounts.find(a => a.id === transaction.contoId)
        toast.success(`Movimento aggiunto: ${transaction.tipo} ${formatCurrency(transaction.importo)} - ${account?.nome || ''}`)
        updatedTransactions = [...current, transaction]
      }
      
      if (transaction.tipo === 'uscita') {
        checkBudgetNotifications(updatedTransactions)
      }
      
      return updatedTransactions
    })
    setEditingTransaction(undefined)
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
        } else if (level === 'critical') {
          message = `Attenzione! Il budget "${budget.nome}" è al ${Math.round(newPercentage)}%. Rimangono ${formatCurrency(remaining)}.`
        } else if (level === 'warning') {
          message = `Il budget "${budget.nome}" ha raggiunto il ${Math.round(newPercentage)}%.`
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
        [budget.id]: newPercentage
      }))
    })
  }

  const handleSaveBudget = (budget: Budget) => {
    setBudgets((currentBudgets) => {
      const current = currentBudgets || []
      const existingIndex = current.findIndex(b => b.id === budget.id)
      if (existingIndex >= 0) {
        const updated = [...current]
        updated[existingIndex] = budget
        toast.success('Budget modificato')
        return updated
      } else {
        toast.success(`Budget "${budget.nome}" creato`)
        return [...current, budget]
      }
    })
    setEditingBudget(undefined)
  }

  const handleDeleteConfirm = () => {
    if (!deletingItem) return

    if (deletingItem.type === 'account') {
      setAccounts((current) => (current || []).filter(a => a.id !== deletingItem.id))
      setTransactions((current) => (current || []).filter(t => t.contoId !== deletingItem.id && t.contoDestinazioneId !== deletingItem.id))
      toast.success('Conto eliminato')
    } else if (deletingItem.type === 'transaction') {
      setTransactions((current) => (current || []).filter(t => t.id !== deletingItem.id))
      toast.success('Movimento eliminato')
    } else if (deletingItem.type === 'budget') {
      setBudgets((current) => (current || []).filter(b => b.id !== deletingItem.id))
      toast.success('Budget eliminato')
    }

    setDeletingItem(null)
    setShowDeleteDialog(false)
  }

  const handleExportCSV = () => {
    const csv = exportToCSV(visibleTransactions, visibleAccounts, safeCategories)
    downloadFile(csv, `zecchino-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
    toast.success('Dati esportati in CSV')
  }

  const visibleAccounts = useMemo(() => {
    return safeAccounts.filter(account => {
      if (account.isPrivato && !isPrivateUnlocked) {
        return false
      }
      return true
    })
  }, [safeAccounts, isPrivateUnlocked])

  const visibleTransactions = useMemo(() => {
    const accountIds = new Set(visibleAccounts.map(a => a.id))
    return safeTransactions.filter(t => accountIds.has(t.contoId))
  }, [safeTransactions, visibleAccounts])

  const hasPrivateAccount = safeAccounts.some(a => a.isPrivato)
  const privateAccount = safeAccounts.find(a => a.isPrivato)

  const totalBalance = useMemo(() => {
    return getTotalBalance(visibleAccounts, visibleTransactions)
  }, [visibleAccounts, visibleTransactions])

  const recentTransactions = useMemo(() => {
    return [...visibleTransactions]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10)
  }, [visibleTransactions])

  const groupedAccounts = useMemo(() => {
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
        accounts: groups.get(category.id) || []
      }))
      .filter(group => group.accounts.length > 0)
  }, [visibleAccounts])

  const filteredGroupedAccounts = useMemo(() => {
    const safeVisibleCategories = visibleCategories || []
    return groupedAccounts.filter(group => safeVisibleCategories.includes(group.id))
  }, [groupedAccounts, visibleCategories])

  const toggleCategoryVisibility = (categoryId: string) => {
    setVisibleCategories((current) => {
      const currentCategories = current || []
      if (currentCategories.includes(categoryId)) {
        return currentCategories.filter(id => id !== categoryId)
      } else {
        return [...currentCategories, categoryId]
      }
    })
  }

  const toggleAllCategories = () => {
    setVisibleCategories((current) => {
      const currentCategories = current || []
      const allCategoryIds = ACCOUNT_CATEGORIES.map(c => c.id)
      if (currentCategories.length === allCategoryIds.length) {
        return []
      } else {
        return allCategoryIds
      }
    })
  }

  const allCategoriesVisible = useMemo(() => {
    const currentCategories = visibleCategories || []
    return currentCategories.length === ACCOUNT_CATEGORIES.map(c => c.id).length
  }, [visibleCategories])

  const budgetAlerts = useMemo(() => {
    const alerts = generateBudgetAlerts(safeBudgets, visibleTransactions)
    const dismissedIds = dismissedAlerts || []
    return alerts.filter(alert => !dismissedIds.includes(alert.budgetId))
  }, [safeBudgets, visibleTransactions, dismissedAlerts])

  const handleDismissBudgetAlert = (budgetId: string) => {
    setDismissedAlerts((current) => {
      const currentDismissed = current || []
      return [...currentDismissed, budgetId]
    })
  }

  const handleViewBudget = (budgetId: string) => {
    setActiveTab('reports')
    const budget = safeBudgets.find(b => b.id === budgetId)
    if (budget) {
      setTimeout(() => {
        setEditingBudget(budget)
        setShowBudgetDialog(true)
      }, 300)
    }
  }

  const recentTransactionsNav = useListNavigation({
    itemCount: recentTransactions.length,
    enabled: isAuthenticated && activeTab === 'dashboard',
    onEnter: (index) => {
      const transaction = recentTransactions[index]
      if (transaction) {
        setEditingTransaction(transaction)
        setShowTransactionDialog(true)
      }
    },
    onDelete: (index) => {
      const transaction = recentTransactions[index]
      if (transaction) {
        setDeletingItem({ type: 'transaction', id: transaction.id })
        setShowDeleteDialog(true)
      }
    },
    onEdit: (index) => {
      const transaction = recentTransactions[index]
      if (transaction) {
        setEditingTransaction(transaction)
        setShowTransactionDialog(true)
      }
    }
  })

  const allTransactionsNav = useListNavigation({
    itemCount: visibleTransactions.length,
    enabled: isAuthenticated && activeTab === 'transactions',
    onEnter: (index) => {
      const sortedTransactions = [...visibleTransactions].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      const transaction = sortedTransactions[index]
      if (transaction) {
        setEditingTransaction(transaction)
        setShowTransactionDialog(true)
      }
    },
    onDelete: (index) => {
      const sortedTransactions = [...visibleTransactions].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      const transaction = sortedTransactions[index]
      if (transaction) {
        setDeletingItem({ type: 'transaction', id: transaction.id })
        setShowDeleteDialog(true)
      }
    },
    onEdit: (index) => {
      const sortedTransactions = [...visibleTransactions].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      const transaction = sortedTransactions[index]
      if (transaction) {
        setEditingTransaction(transaction)
        setShowTransactionDialog(true)
      }
    }
  })

  useKeyboardShortcuts([
    {
      key: '1',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          toggleCategoryVisibility('banking')
          toast.success('Filtro Bancari attivato/disattivato')
        }
      },
      description: 'Toggle Banking category'
    },
    {
      key: '2',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          toggleCategoryVisibility('digital')
          toast.success('Filtro Digitali attivato/disattivato')
        }
      },
      description: 'Toggle Digital category'
    },
    {
      key: '3',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          toggleCategoryVisibility('savings')
          toast.success('Filtro Risparmio attivato/disattivato')
        }
      },
      description: 'Toggle Savings category'
    },
    {
      key: '4',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          toggleCategoryVisibility('investments')
          toast.success('Filtro Investimenti attivato/disattivato')
        }
      },
      description: 'Toggle Investments category'
    },
    {
      key: '5',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          toggleCategoryVisibility('private')
          toast.success('Filtro Privato attivato/disattivato')
        }
      },
      description: 'Toggle Private category'
    },
    {
      key: 'a',
      ctrl: true,
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          toggleAllCategories()
          toast.success(allCategoriesVisible ? 'Tutti i filtri nascosti' : 'Tutti i filtri attivati')
        }
      },
      description: 'Toggle all categories'
    },
    {
      key: 'n',
      ctrl: true,
      callback: () => {
        if (isAuthenticated) {
          setEditingTransaction(undefined)
          setShowTransactionDialog(true)
          toast.success('Nuovo movimento')
        }
      },
      description: 'New transaction'
    },
    {
      key: 'm',
      ctrl: true,
      callback: () => {
        if (isAuthenticated) {
          setEditingAccount(undefined)
          setShowAccountDialog(true)
          toast.success('Nuovo conto')
        }
      },
      description: 'New account'
    },
    {
      key: 'd',
      ctrl: true,
      callback: () => {
        if (isAuthenticated) {
          setActiveTab('dashboard')
          toast.success('Dashboard')
        }
      },
      description: 'Navigate to Dashboard'
    },
    {
      key: 't',
      ctrl: true,
      callback: () => {
        if (isAuthenticated) {
          setActiveTab('transactions')
          toast.success('Movimenti')
        }
      },
      description: 'Navigate to Transactions'
    },
    {
      key: 'r',
      ctrl: true,
      callback: () => {
        if (isAuthenticated) {
          setActiveTab('reports')
          toast.success('Report')
        }
      },
      description: 'Navigate to Reports'
    },
    {
      key: 'e',
      ctrl: true,
      callback: () => {
        if (isAuthenticated && activeTab === 'transactions') {
          handleExportCSV()
        }
      },
      description: 'Export CSV'
    },
    {
      key: 'u',
      ctrl: true,
      callback: () => {
        if (isAuthenticated && hasPrivateAccount && !isPrivateUnlocked) {
          setShowPrivatePinDialog(true)
          toast.success('Sblocca conto privato')
        }
      },
      description: 'Unlock private account'
    },
    {
      key: '?',
      shift: true,
      callback: () => {
        if (isAuthenticated) {
          setShowKeyboardHelp(true)
        }
      },
      description: 'Show keyboard shortcuts help'
    }
  ], isAuthenticated)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <PinDialog
          open={showPinDialog}
          title={isSetupMode ? 'Imposta PIN Globale' : 'Inserisci PIN'}
          description={isSetupMode ? 'Crea un PIN per proteggere l\'applicazione' : 'Inserisci il tuo PIN per accedere'}
          onSubmit={handleGlobalPinSubmit}
          confirmMode={isSetupMode}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <FocusIndicator />
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold tracking-tight">Zecchino</h1>
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowKeyboardHelp(true)}
                    aria-label="Mostra scorciatoie da tastiera"
                    className="hidden sm:inline-flex"
                  >
                    <Keyboard size={20} weight="duotone" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent variant="accent">
                  <div className="space-y-0.5">
                    <p className="font-semibold">Scorciatoie da Tastiera</p>
                    <p className="text-xs opacity-90">Premi ? per visualizzare tutti i comandi</p>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-right cursor-help">
                    <p className="text-sm text-muted-foreground">Saldo Totale</p>
                    <p className={`text-2xl font-mono font-semibold ${totalBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                      {formatCurrency(totalBalance)}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent variant={totalBalance < 0 ? 'destructive' : 'success'}>
                  <div className="space-y-0.5">
                    <p className="font-semibold">Saldo Consolidato</p>
                    <p className="text-xs opacity-90">
                      Somma di tutti i conti visibili ({visibleAccounts.length} {visibleAccounts.length === 1 ? 'conto' : 'conti'})
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {budgetAlerts.length > 0 && (
          <div className="mb-6">
            <BudgetAlertBanner
              alerts={budgetAlerts}
              onDismiss={handleDismissBudgetAlert}
              onViewBudget={handleViewBudget}
            />
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2" data-focus-info="Scheda Dashboard - Visualizza conti e movimenti recenti (Ctrl+D)">
              <List size={18} weight="duotone" />
              <span className="hidden sm:inline">Dashboard</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden lg:inline-flex">Ctrl+D</Badge>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2" data-focus-info="Scheda Movimenti - Visualizza tutti i movimenti (Ctrl+T)">
              <ArrowsLeftRight size={18} weight="duotone" />
              <span className="hidden sm:inline">Movimenti</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden lg:inline-flex">Ctrl+T</Badge>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2" data-focus-info="Scheda Report - Visualizza statistiche finanziarie (Ctrl+R)">
              <ChartLine size={18} weight="duotone" />
              <span className="hidden sm:inline">Report</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden lg:inline-flex">Ctrl+R</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <h2 className="text-2xl font-semibold">I Tuoi Conti</h2>
              <div className="flex gap-2 flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => { setEditingTransaction(undefined); setShowTransactionDialog(true) }} 
                      className="gap-2"
                      data-focus-info="Aggiungi nuovo movimento (Ctrl+N)"
                    >
                      <Plus size={18} weight="bold" />
                      Movimento
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 bg-primary-foreground/20 hidden sm:inline-flex">Ctrl+N</Badge>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent variant="accent">
                    <div className="space-y-0.5">
                      <p className="font-semibold">Nuovo Movimento</p>
                      <p className="text-xs opacity-90">Aggiungi entrata, uscita o trasferimento (Ctrl+N)</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => { setEditingAccount(undefined); setShowAccountDialog(true) }} 
                      variant="outline" 
                      className="gap-2"
                      data-focus-info="Aggiungi nuovo conto (Ctrl+M)"
                    >
                      <Plus size={18} weight="bold" />
                      Conto
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden sm:inline-flex">Ctrl+M</Badge>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent variant="secondary">
                    <div className="space-y-0.5">
                      <p className="font-semibold">Nuovo Conto</p>
                      <p className="text-xs opacity-90">Aggiungi bancario, digitale, risparmio o investimenti (Ctrl+M)</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
                {hasPrivateAccount && !isPrivateUnlocked && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => setShowPrivatePinDialog(true)} 
                        variant="secondary" 
                        className="gap-2"
                        data-focus-info="Sblocca conto privato (Ctrl+U)"
                      >
                        <LockOpen size={18} weight="duotone" />
                        Sblocca Privato
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden sm:inline-flex">Ctrl+U</Badge>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent variant="private">
                      <div className="space-y-0.5">
                        <p className="font-semibold">Sblocca Conto Privato</p>
                        <p className="text-xs opacity-90">Inserisci PIN per accedere ai conti protetti (Ctrl+U)</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {visibleAccounts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground mb-4">Nessun conto disponibile</p>
                  <Button onClick={() => setShowAccountDialog(true)} className="gap-2">
                    <Plus size={18} weight="bold" />
                    Crea il Primo Conto
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {groupedAccounts.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-muted-foreground self-center mr-2">Filtra categorie:</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={toggleAllCategories}
                          variant={allCategoriesVisible ? 'default' : 'outline'}
                          size="sm"
                          className="gap-2"
                          aria-label={allCategoriesVisible ? 'Nascondi tutte le categorie' : 'Mostra tutte le categorie'}
                          data-focus-info={`${allCategoriesVisible ? 'Nascondi' : 'Mostra'} tutte le categorie (Ctrl+A)`}
                        >
                          {allCategoriesVisible ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
                          <span className="text-xs font-medium">{allCategoriesVisible ? 'Nascondi tutto' : 'Mostra tutto'}</span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 hidden sm:inline-flex">Ctrl+A</Badge>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent variant={allCategoriesVisible ? 'muted' : 'accent'}>
                        <div className="space-y-0.5">
                          <p className="font-semibold">{allCategoriesVisible ? 'Nascondi Tutte le Categorie' : 'Mostra Tutte le Categorie'}</p>
                          <p className="text-xs opacity-90">Toggle visibilità di tutte le categorie (Ctrl+A)</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    <Separator orientation="vertical" className="h-6" />
                    {groupedAccounts.map((category, index) => {
                      const isActive = (visibleCategories || []).includes(category.id)
                      const keyNumber = index + 1
                      return (
                        <Tooltip key={category.id}>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => toggleCategoryVisibility(category.id)}
                              variant={isActive ? category.badgeVariant : 'outline'}
                              size="sm"
                              className="gap-2"
                              data-focus-info={`Filtra ${category.label} (${category.accounts.length} conti) - Tasto ${keyNumber}`}
                            >
                              <Badge variant={category.badgeVariant} className="text-xs px-0 border-0 bg-transparent">
                                {category.label}
                              </Badge>
                              <span className="text-xs">({category.accounts.length})</span>
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 hidden sm:inline-flex">{keyNumber}</Badge>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent variant={category.id as any}>
                            <div className="space-y-0.5">
                              <p className="font-semibold">{category.label}</p>
                              <p className="text-xs opacity-90">{category.description}</p>
                              <p className="text-xs opacity-75 mt-1">{category.accounts.length} {category.accounts.length === 1 ? 'conto' : 'conti'} • Tasto {keyNumber}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                )}

                {filteredGroupedAccounts.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-muted-foreground mb-4">Nessun conto da visualizzare con i filtri selezionati</p>
                      <Button 
                        onClick={() => setVisibleCategories(ACCOUNT_CATEGORIES.map(c => c.id))} 
                        variant="outline"
                      >
                        Mostra Tutti i Conti
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {filteredGroupedAccounts.map(group => (
                      <div key={group.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={group.badgeVariant}>
                            {group.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {group.description}
                          </span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {group.accounts.map(account => {
                            const balance = calculateAccountBalance(account, visibleTransactions)
                            return (
                              <AccountCard
                                key={account.id}
                                account={account}
                                balance={balance}
                              />
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Movimenti Recenti</h3>
                {recentTransactions.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    ↑/↓ Naviga · Enter Modifica · E Modifica · Del Elimina
                  </Badge>
                )}
              </div>
              {recentTransactions.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-muted-foreground">Nessun movimento registrato</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {recentTransactions.map((transaction, index) => {
                        const account = visibleAccounts.find(a => a.id === transaction.contoId)
                        const category = safeCategories.find(c => c.id === transaction.categoriaId)
                        const isIncome = transaction.tipo === 'entrata'
                        const isTransfer = transaction.tipo === 'trasferimento'
                        const isFocused = recentTransactionsNav.isFocused(index)

                        return (
                          <div 
                            key={transaction.id} 
                            className={`p-4 flex items-center justify-between transition-all ${
                              isFocused 
                                ? 'bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => recentTransactionsNav.setFocusedIndex(index)}
                            data-focus-info={`Movimento: ${transaction.descrizione || category?.nome} - ${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'} ${formatCurrency(transaction.importo)} - Premi Enter per modificare`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">
                                  {transaction.descrizione || category?.nome || 'Movimento'}
                                </p>
                                {transaction.ricorrente && (
                                  <Badge variant="outline" className="text-xs">Ricorrente</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{new Date(transaction.data).toLocaleDateString('it-IT')}</span>
                                <span>•</span>
                                <span>{account?.nome}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`text-lg font-mono font-semibold ${isIncome ? 'text-income' : isTransfer ? 'text-accent' : 'text-expense'}`}>
                                {isIncome ? '+' : isTransfer ? '→' : '-'}{formatCurrency(transaction.importo)}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingTransaction(transaction)
                                    setShowTransactionDialog(true)
                                  }}
                                  aria-label="Modifica movimento"
                                >
                                  <PencilSimple size={18} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeletingItem({ type: 'transaction', id: transaction.id })
                                    setShowDeleteDialog(true)
                                  }}
                                  aria-label="Elimina movimento"
                                >
                                  <Trash size={18} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Tutti i Movimenti</h2>
              <div className="flex gap-2">
                <Button 
                  onClick={handleExportCSV} 
                  variant="outline" 
                  className="gap-2"
                  data-focus-info="Esporta movimenti in formato CSV (Ctrl+E)"
                >
                  <DownloadSimple size={18} weight="duotone" />
                  Esporta CSV
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden sm:inline-flex">Ctrl+E</Badge>
                </Button>
                <Button 
                  onClick={() => { setEditingTransaction(undefined); setShowTransactionDialog(true) }} 
                  className="gap-2"
                  data-focus-info="Aggiungi nuovo movimento (Ctrl+N)"
                >
                  <Plus size={18} weight="bold" />
                  Nuovo Movimento
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 bg-primary-foreground/20 hidden sm:inline-flex">Ctrl+N</Badge>
                </Button>
              </div>
            </div>

            {visibleTransactions.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                ↑/↓ Naviga · Enter Modifica · E Modifica · Del Elimina · Home/End Primo/Ultimo
              </Badge>
            )}

            <Card>
              <CardContent className="p-0">
                {visibleTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-muted-foreground mb-4">Nessun movimento da visualizzare</p>
                    <Button onClick={() => setShowTransactionDialog(true)} className="gap-2">
                      <Plus size={18} weight="bold" />
                      Aggiungi Movimento
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {[...visibleTransactions]
                      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                      .map((transaction, index) => {
                        const account = visibleAccounts.find(a => a.id === transaction.contoId)
                        const destAccount = transaction.contoDestinazioneId
                          ? visibleAccounts.find(a => a.id === transaction.contoDestinazioneId)
                          : null
                        const category = safeCategories.find(c => c.id === transaction.categoriaId)
                        const isIncome = transaction.tipo === 'entrata'
                        const isTransfer = transaction.tipo === 'trasferimento'
                        const isFocused = allTransactionsNav.isFocused(index)

                        return (
                          <div 
                            key={transaction.id} 
                            className={`p-4 flex items-center justify-between transition-all ${
                              isFocused 
                                ? 'bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => allTransactionsNav.setFocusedIndex(index)}
                            data-focus-info={`Movimento: ${transaction.descrizione || category?.nome} - ${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'} ${formatCurrency(transaction.importo)} - Premi Enter per modificare`}
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {transaction.descrizione || category?.nome || 'Movimento'}
                                </p>
                                {transaction.ricorrente && (
                                  <Badge variant="outline" className="text-xs">
                                    {transaction.frequenzaRicorrenza}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                <span>{new Date(transaction.data).toLocaleDateString('it-IT')}</span>
                                <span>•</span>
                                <span>{account?.nome}</span>
                                {isTransfer && destAccount && (
                                  <>
                                    <span>→</span>
                                    <span>{destAccount.nome}</span>
                                  </>
                                )}
                                {category && (
                                  <>
                                    <span>•</span>
                                    <span>{category.nome}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`text-lg font-mono font-semibold ${isIncome ? 'text-income' : isTransfer ? 'text-accent' : 'text-expense'}`}>
                                {isIncome ? '+' : isTransfer ? '→' : '-'}{formatCurrency(transaction.importo)}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingTransaction(transaction)
                                    setShowTransactionDialog(true)
                                  }}
                                  aria-label="Modifica movimento"
                                >
                                  <PencilSimple size={18} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeletingItem({ type: 'transaction', id: transaction.id })
                                    setShowDeleteDialog(true)
                                  }}
                                  aria-label="Elimina movimento"
                                >
                                  <Trash size={18} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <h2 className="text-2xl font-semibold">Report Finanziario</h2>

            <MonthlyComparisonChart transactions={visibleTransactions} />

            <div className="grid gap-4 md:grid-cols-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help transition-all hover:shadow-md" data-focus-info="Saldo totale di tutti i conti visibili">
                    <CardHeader>
                      <CardTitle className="text-base">Saldo Totale</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-3xl font-mono font-bold ${totalBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {formatCurrency(totalBalance)}
                      </p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent variant={totalBalance < 0 ? 'destructive' : 'success'} className="max-w-xs">
                  <div className="space-y-1.5">
                    <p className="font-semibold">Saldo Consolidato</p>
                    <p className="text-xs opacity-90">
                      Somma di tutti i {visibleAccounts.length} conti visibili
                    </p>
                    <div className="pt-1 border-t border-current/20 space-y-0.5">
                      <p className="text-xs">Entrate totali: {formatCurrency(visibleTransactions.filter(t => t.tipo === 'entrata').reduce((sum, t) => sum + t.importo, 0))}</p>
                      <p className="text-xs">Uscite totali: {formatCurrency(visibleTransactions.filter(t => t.tipo === 'uscita').reduce((sum, t) => sum + t.importo, 0))}</p>
                      <p className="text-xs font-medium">Saldo netto: {formatCurrency(
                        visibleTransactions.filter(t => t.tipo === 'entrata').reduce((sum, t) => sum + t.importo, 0) -
                        visibleTransactions.filter(t => t.tipo === 'uscita').reduce((sum, t) => sum + t.importo, 0)
                      )}</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help transition-all hover:shadow-md" data-focus-info="Totale entrate registrate in tutti i conti">
                    <CardHeader>
                      <CardTitle className="text-base">Totale Entrate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-mono font-bold text-income">
                        {formatCurrency(visibleTransactions.filter(t => t.tipo === 'entrata').reduce((sum, t) => sum + t.importo, 0))}
                      </p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent variant="success" className="max-w-xs">
                  <div className="space-y-1.5">
                    <p className="font-semibold">Dettaglio Entrate</p>
                    <p className="text-xs opacity-90">
                      {visibleTransactions.filter(t => t.tipo === 'entrata').length} movimenti di entrata
                    </p>
                    <div className="pt-1 border-t border-current/20 space-y-0.5">
                      {(() => {
                        const incomeByCategory = visibleTransactions
                          .filter(t => t.tipo === 'entrata')
                          .reduce((acc, t) => {
                            const category = safeCategories.find(c => c.id === t.categoriaId)
                            const catName = category?.nome || 'Senza categoria'
                            acc[catName] = (acc[catName] || 0) + t.importo
                            return acc
                          }, {} as Record<string, number>)
                        
                        const topCategories = Object.entries(incomeByCategory)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                        
                        return topCategories.length > 0 ? (
                          <>
                            <p className="text-xs font-medium mt-1">Top categorie:</p>
                            {topCategories.map(([cat, amount]) => (
                              <p key={cat} className="text-xs">• {cat}: {formatCurrency(amount)}</p>
                            ))}
                          </>
                        ) : (
                          <p className="text-xs opacity-75">Nessuna entrata registrata</p>
                        )
                      })()}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help transition-all hover:shadow-md" data-focus-info="Totale uscite registrate in tutti i conti">
                    <CardHeader>
                      <CardTitle className="text-base">Totale Uscite</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-mono font-bold text-expense">
                        {formatCurrency(visibleTransactions.filter(t => t.tipo === 'uscita').reduce((sum, t) => sum + t.importo, 0))}
                      </p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent variant="destructive" className="max-w-xs">
                  <div className="space-y-1.5">
                    <p className="font-semibold">Dettaglio Uscite</p>
                    <p className="text-xs opacity-90">
                      {visibleTransactions.filter(t => t.tipo === 'uscita').length} movimenti di uscita
                    </p>
                    <div className="pt-1 border-t border-current/20 space-y-0.5">
                      {(() => {
                        const expenseByCategory = visibleTransactions
                          .filter(t => t.tipo === 'uscita')
                          .reduce((acc, t) => {
                            const category = safeCategories.find(c => c.id === t.categoriaId)
                            const catName = category?.nome || 'Senza categoria'
                            acc[catName] = (acc[catName] || 0) + t.importo
                            return acc
                          }, {} as Record<string, number>)
                        
                        const topCategories = Object.entries(expenseByCategory)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                        
                        return topCategories.length > 0 ? (
                          <>
                            <p className="text-xs font-medium mt-1">Top categorie:</p>
                            {topCategories.map(([cat, amount]) => (
                              <p key={cat} className="text-xs">• {cat}: {formatCurrency(amount)}</p>
                            ))}
                          </>
                        ) : (
                          <p className="text-xs opacity-75">Nessuna uscita registrata</p>
                        )
                      })()}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-4">
              <PeriodSelector value={chartPeriod} onChange={setChartPeriod} />
              <IncomeExpenseChart transactions={visibleTransactions} period={chartPeriod} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Target size={24} weight="duotone" />
                  Budget e Obiettivi
                </h3>
                <Button 
                  onClick={() => { setEditingBudget(undefined); setShowBudgetDialog(true) }} 
                  className="gap-2"
                >
                  <Plus size={18} weight="bold" />
                  Nuovo Budget
                </Button>
              </div>

              {getActiveBudgets(safeBudgets).length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Target size={48} weight="duotone" className="text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Nessun budget attivo</p>
                    <p className="text-sm text-muted-foreground mb-6">Crea un budget per monitorare le tue spese e raggiungere i tuoi obiettivi finanziari</p>
                    <Button onClick={() => setShowBudgetDialog(true)} className="gap-2">
                      <Plus size={18} weight="bold" />
                      Crea il Primo Budget
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {getActiveBudgets(safeBudgets).map(budget => (
                      <BudgetProgressCard
                        key={budget.id}
                        budget={budget}
                        transactions={visibleTransactions}
                        categories={safeCategories}
                        accounts={visibleAccounts}
                        onEdit={(b) => {
                          setEditingBudget(b)
                          setShowBudgetDialog(true)
                        }}
                        onDelete={(b) => {
                          setDeletingItem({ type: 'budget', id: b.id })
                          setShowDeleteDialog(true)
                        }}
                      />
                    ))}
                  </div>

                  <div className="space-y-6 mt-6">
                    <h3 className="text-xl font-semibold">Analisi Storica Budget</h3>
                    
                    {getActiveBudgets(safeBudgets).map(budget => (
                      <div key={`history-${budget.id}`} className="space-y-4">
                        <BudgetHistoryChart
                          budget={budget}
                          transactions={visibleTransactions}
                          periodsToShow={6}
                        />
                        <BudgetComparisonCard
                          budget={budget}
                          transactions={visibleTransactions}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Dettaglio Conti</CardTitle>
                <CardDescription>Saldo attuale di ogni conto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visibleAccounts.map(account => {
                    const balance = calculateAccountBalance(account, visibleTransactions)
                    return (
                      <div key={account.id} className="flex justify-between items-center">
                        <span className="font-medium">{account.nome}</span>
                        <span className={`font-mono font-semibold ${balance < 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <PinDialog
        open={showPrivatePinDialog}
        title={privatePinHash ? 'Sblocca Conto Privato' : 'Crea PIN Conto Privato'}
        description={privatePinHash ? 'Inserisci il PIN del conto privato' : 'Crea un PIN per il conto privato'}
        onSubmit={handlePrivatePinSubmit}
        onCancel={() => setShowPrivatePinDialog(false)}
        confirmMode={!privatePinHash}
      />

      <AccountDialog
        open={showAccountDialog}
        onClose={() => { setShowAccountDialog(false); setEditingAccount(undefined) }}
        onSave={handleSaveAccount}
        account={editingAccount}
        hasPrivateAccount={hasPrivateAccount && !editingAccount?.isPrivato}
      />

      <TransactionDialog
        open={showTransactionDialog}
        onClose={() => { setShowTransactionDialog(false); setEditingTransaction(undefined) }}
        onSave={handleSaveTransaction}
        transaction={editingTransaction}
        accounts={visibleAccounts}
        categories={safeCategories}
      />

      <BudgetDialog
        open={showBudgetDialog}
        onClose={() => { setShowBudgetDialog(false); setEditingBudget(undefined) }}
        onSave={handleSaveBudget}
        budget={editingBudget}
        categories={safeCategories}
        accounts={visibleAccounts}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.type === 'account'
                ? 'Eliminando questo conto verranno rimossi anche tutti i movimenti associati. Questa azione non può essere annullata.'
                : deletingItem?.type === 'budget'
                ? 'Questa azione eliminerà definitivamente il budget. Non può essere annullata.'
                : 'Questa azione eliminerà definitivamente il movimento. Non può essere annullata.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <KeyboardShortcutsHelp
        open={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </div>
  )
}

export default App