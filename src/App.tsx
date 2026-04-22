import { useState, useEffect, useMemo } from 'react'
import { Account, Transaction, Budget, SavingsGoal } from '@/lib/types'
import { hashPin, verifyPin } from '@/lib/crypto'
import { ACCOUNT_CATEGORIES, ACCOUNT_TYPE_TO_CATEGORY } from '@/lib/constants'
import { calculateAccountBalance, getTotalBalance, formatCurrency, getActiveBudgets } from '@/lib/helpers'
import { generateBudgetAlerts } from '@/lib/budget-alerts'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { useIsMobile } from '@/hooks/use-mobile'
import { AppDataProvider, useAppData } from '@/context/AppDataContext'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { SkipLink } from '@/components/SkipLink'
import { PinDialog } from '@/components/PinDialog'
import { AccountCard } from '@/components/AccountCard'
import { AccountDialog } from '@/components/AccountDialog'
import { TransactionDialog } from '@/components/TransactionDialog'
import { BudgetDialog } from '@/components/BudgetDialog'
import { BudgetProgressCard } from '@/components/BudgetProgressCard'
import { BudgetAlertBanner } from '@/components/BudgetAlertBanner'
import { BudgetHistoryChart } from '@/components/BudgetHistoryChart'
import { BudgetComparisonCard } from '@/components/BudgetComparisonCard'
import { BudgetForecastCard } from '@/components/BudgetForecastCard'
import { SavingsGoalDialog } from '@/components/SavingsGoalDialog'
import { SavingsGoalCard } from '@/components/SavingsGoalCard'
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'
import { FocusIndicator } from '@/components/FocusIndicator'
import { AudioSettings } from '@/components/AudioSettings'
import { HapticSettings } from '@/components/HapticSettings'
import { ScreenReaderSettings } from '@/components/ScreenReaderSettings'
import { TalkBackSettings } from '@/components/TalkBackSettings'
import { DisplaySettings } from '@/components/DisplaySettings'
import { SecuritySettings } from '@/components/SecuritySettings'
import { CategoryManagement } from '@/components/CategoryManagement'
import { DataManagement } from '@/components/DataManagement'
import { IncomeExpenseChart } from '@/components/IncomeExpenseChart'
import { MonthlyComparisonChart } from '@/components/MonthlyComparisonChart'
import { PeriodSelector } from '@/components/PeriodSelector'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, LockOpen, ChartLine, List, Gear, DownloadSimple, Trash, PencilSimple, ArrowsLeftRight, Eye, EyeSlash, Keyboard, Target, Info, PiggyBank } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useListNavigation } from '@/hooks/use-list-navigation'

function AppContent() {
  const screenReader = useScreenReader()
  const isMobile = useIsMobile()

  const {
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
  } = useAppData()
  const {
    globalPinHash, setGlobalPinHash,
    privatePinHash, setPrivatePinHash,
    isAuthenticated, setIsAuthenticated,
    isPrivateUnlocked, setIsPrivateUnlocked,
    isSetupMode, setIsSetupMode,
    showPinDialog, setShowPinDialog,
    showPrivatePinDialog, setShowPrivatePinDialog,
  } = useAuth()
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [showSavingsGoalDialog, setShowSavingsGoalDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  const [editingAccount, setEditingAccount] = useState<Account | undefined>()
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>()
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>()
  const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>()
  const [deletingItem, setDeletingItem] = useState<{ type: 'account' | 'transaction' | 'budget' | 'savingsGoal', id: string } | null>(null)

  const [activeTab, setActiveTab] = useState('dashboard')
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month')
  const [previousTab, setPreviousTab] = useState('dashboard')

  useEffect(() => {
    if (showDeleteDialog) {
      soundSystem.play('dialog-open')
    }
  }, [showDeleteDialog])

  const handleGlobalPinSubmit = async (pin: string) => {
    if (isSetupMode) {
      const hash = await hashPin(pin)
      setGlobalPinHash(hash)
      setIsAuthenticated(true)
      setShowPinDialog(false)
      setIsSetupMode(false)
      soundSystem.play('pin-success')
      hapticSystem.pinSuccess()
      toast.success('PIN globale creato con successo')
      screenReader.announceSuccess('PIN globale creato. Accesso all\'applicazione consentito.')
    } else {
      const isValid = await verifyPin(pin, globalPinHash || '')
      if (isValid) {
        setIsAuthenticated(true)
        setShowPinDialog(false)
        soundSystem.play('unlock')
        hapticSystem.unlock()
        toast.success('Accesso consentito')
        screenReader.announceSuccess('Accesso consentito. Benvenuto in Zecchino.')
      } else {
        soundSystem.play('pin-error')
        hapticSystem.pinError()
        toast.error('PIN non corretto')
        screenReader.announceError('PIN non corretto. Riprova.')
      }
    }
  }

  const handlePrivatePinSubmit = async (pin: string) => {
    if (!privatePinHash) {
      const hash = await hashPin(pin)
      setPrivatePinHash(hash)
      setIsPrivateUnlocked(true)
      setShowPrivatePinDialog(false)
      soundSystem.play('private-unlock')
      hapticSystem.privateUnlock()
      toast.success('PIN privato creato e conto sbloccato')
      screenReader.announceSuccess('PIN privato creato. Conto privato ora sbloccato.')
    } else {
      const isValid = await verifyPin(pin, privatePinHash)
      if (isValid) {
        setIsPrivateUnlocked(true)
        setShowPrivatePinDialog(false)
        soundSystem.play('private-unlock')
        hapticSystem.privateUnlock()
        const unlockedPrivateAccount = visibleAccounts.find(account => account.isPrivato)
        if (unlockedPrivateAccount) {
          const balance = calculateAccountBalance(unlockedPrivateAccount, visibleTransactions)
          toast.success(`Conto privato sbloccato. Saldo: ${formatCurrency(balance)}`)
          screenReader.announceBalance('Conto privato', balance)
        } else {
          screenReader.announceSuccess('Conto privato sbloccato.')
        }
      } else {
        soundSystem.play('pin-error')
        hapticSystem.pinError()
        toast.error('PIN privato non corretto')
        screenReader.announceError('PIN privato non corretto. Riprova.')
      }
    }
  }

  const handleAddFundsToGoal = (goal: SavingsGoal) => {
    setEditingSavingsGoal(goal)
    setShowSavingsGoalDialog(true)
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

  useEffect(() => {
    if (activeTab !== previousTab && isAuthenticated) {
      setPreviousTab(activeTab)
      soundSystem.play('tab-change')
      hapticSystem.tabChange()
      
      let tabName = ''
      if (activeTab === 'dashboard') tabName = 'Dashboard'
      else if (activeTab === 'transactions') tabName = 'Movimenti'
      else if (activeTab === 'reports') tabName = 'Report'
      
      if (tabName) {
        screenReader.announceNavigation(tabName)
        
        if (activeTab === 'dashboard') {
          screenReader.announceCount('conti', visibleAccounts.length)
          setTimeout(() => {
            screenReader.announce(`Saldo totale: ${formatCurrency(totalBalance)}`, 'polite')
          }, 500)
        } else if (activeTab === 'transactions') {
          screenReader.announceCount('movimenti', visibleTransactions.length)
        } else if (activeTab === 'reports') {
          const totalIncome = visibleTransactions.filter(t => t.tipo === 'entrata').reduce((sum, t) => sum + t.importo, 0)
          const totalExpenses = visibleTransactions.filter(t => t.tipo === 'uscita').reduce((sum, t) => sum + t.importo, 0)
          setTimeout(() => {
            screenReader.announce(`Entrate: ${formatCurrency(totalIncome)}. Uscite: ${formatCurrency(totalExpenses)}`, 'polite')
          }, 500)
        }
      }
    }
  }, [activeTab, previousTab, isAuthenticated, visibleAccounts, visibleTransactions, totalBalance, screenReader])

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

  const allCategoriesVisible = useMemo(() => {
    const currentCategories = visibleCategories || []
    return currentCategories.length === ACCOUNT_CATEGORIES.map(c => c.id).length
  }, [visibleCategories])

  const budgetAlerts = useMemo(() => {
    const alerts = generateBudgetAlerts(safeBudgets, visibleTransactions)
    const dismissedIds = dismissedAlerts || []
    return alerts.filter(alert => !dismissedIds.includes(alert.budgetId))
  }, [safeBudgets, visibleTransactions, dismissedAlerts])

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
          soundSystem.play('click')
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
          soundSystem.play('click')
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
          soundSystem.play('click')
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
          soundSystem.play('click')
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
          soundSystem.play('click')
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
          soundSystem.play('click')
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
          soundSystem.play('click')
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
          soundSystem.play('click')
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
          soundSystem.play('navigation')
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
          soundSystem.play('navigation')
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
          soundSystem.play('navigation')
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
          handleExportCSV(visibleTransactions, visibleAccounts)
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
          soundSystem.play('click')
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
          soundSystem.play('notification')
        }
      },
      description: 'Show keyboard shortcuts help'
    }
  ], isAuthenticated)

  if (!isAuthenticated) {
    return (
      <>
        <SkipLink />
        <div 
          className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background touch-manipulation" 
          role="main" 
          aria-label="Schermata di autenticazione Zecchino"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-secondary/80 to-accent/90" aria-hidden="true"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.12),transparent_60%)]" aria-hidden="true"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" aria-hidden="true"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)] animate-pulse" style={{ animationDuration: '4s' }} aria-hidden="true"></div>
          <PinDialog
            open={showPinDialog}
            title={isSetupMode ? 'Imposta PIN Globale' : 'Inserisci PIN'}
            description={isSetupMode ? 'Crea un PIN per proteggere l\'applicazione' : 'Inserisci il tuo PIN per accedere'}
            onSubmit={handleGlobalPinSubmit}
            confirmMode={isSetupMode}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <SkipLink />
      <div className="min-h-screen relative overflow-hidden bg-background touch-manipulation">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/25" aria-hidden="true"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(165,120,255,0.15),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(90,200,250,0.15),transparent_50%)]" aria-hidden="true"></div>
        <div className="absolute inset-0 bg-[conic-gradient(from_45deg_at_30%_50%,transparent,rgba(165,120,255,0.08)_25%,transparent_50%)] animate-pulse" style={{ animationDuration: '8s' }} aria-hidden="true"></div>
        <div className="relative">
        <FocusIndicator />
        <header 
          className="border-b border-primary/30 bg-card/90 backdrop-blur-lg sticky top-0 z-10 shadow-lg shadow-primary/10" 
          role="banner"
          aria-label="Intestazione principale applicazione Zecchino"
        >
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg shadow-primary/30 ring-2 ring-primary/40 flex-shrink-0">
                  <span className="text-xl sm:text-2xl font-bold text-primary-foreground drop-shadow-md" aria-hidden="true">Z</span>
                </div>
                <h1 
                  className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent drop-shadow-sm truncate" 
                  id="app-title"
                >
                  Zecchino
                </h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0" role="region" aria-label="Informazioni saldo e azioni rapide">
                {!isMobile && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          soundSystem.play('dialog-open')
                          hapticSystem.dialogOpen()
                          setShowKeyboardHelp(true)
                        }}
                        aria-label="Mostra scorciatoie da tastiera. Apre finestra di dialogo con elenco comandi tastiera disponibili."
                        className="hidden sm:inline-flex hover:bg-accent/30 hover:text-accent transition-all hover:shadow-md hover:shadow-accent/20"
                      >
                        <Keyboard size={20} weight="duotone" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent variant="accent">
                      <div className="space-y-0.5">
                        <p className="font-semibold">Scorciatoie da Tastiera</p>
                        <p className="text-xs opacity-90">Premi ? per visualizzare tutti i comandi</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="text-right cursor-help bg-gradient-to-br from-card to-primary/10 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-primary/30 shadow-md shadow-primary/10 min-w-0" 
                      role="status" 
                      aria-live="polite" 
                      aria-atomic="true"
                      aria-label={`Saldo totale: ${formatCurrency(totalBalance)}`}
                      tabIndex={0}
                    >
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider" id="total-balance-label">
                        {isMobile ? 'Saldo' : 'Saldo Totale'}
                      </p>
                      <p 
                        className={`text-lg sm:text-2xl font-mono font-bold ${totalBalance < 0 ? 'text-destructive drop-shadow-md' : 'bg-gradient-to-r from-income via-success to-accent bg-clip-text text-transparent drop-shadow-sm'} truncate`} 
                        aria-labelledby="total-balance-label"
                      >
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

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 sm:pb-6" id="main-content" role="main" aria-label="Contenuto principale dell'applicazione Zecchino">
          {budgetAlerts.length > 0 && (
            <div className="mb-4 sm:mb-6" role="region" aria-label="Avvisi budget" aria-live="polite">
              <BudgetAlertBanner
                alerts={budgetAlerts}
                onDismiss={handleDismissBudgetAlert}
                onViewBudget={(id) => handleViewBudget(id, (budget) => {
                  setActiveTab('reports')
                  setTimeout(() => {
                    setEditingBudget(budget)
                    setShowBudgetDialog(true)
                  }, 300)
                })}
              />
            </div>
          )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList 
            className="grid w-full grid-cols-3 gap-1 p-1 bg-muted/50 rounded-xl h-auto" 
            role="tablist" 
            aria-label="Navigazione principale dell'applicazione"
          >
            <TabsTrigger 
              value="dashboard" 
              className="gap-1.5 sm:gap-2 py-3 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all" 
              data-focus-info="Scheda Dashboard - Visualizza conti e movimenti recenti (Ctrl+D)"
              aria-label="Dashboard. Visualizza conti e movimenti recenti. Scorciatoia tastiera: Control più D"
              aria-controls="dashboard-panel"
              aria-selected={activeTab === 'dashboard'}
            >
              <List size={isMobile ? 20 : 18} weight="duotone" aria-hidden="true" />
              <span className="font-medium">Dashboard</span>
              {!isMobile && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden lg:inline-flex" aria-hidden="true">Ctrl+D</Badge>}
            </TabsTrigger>
            <TabsTrigger 
              value="transactions" 
              className="gap-1.5 sm:gap-2 py-3 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all" 
              data-focus-info="Scheda Movimenti - Visualizza tutti i movimenti (Ctrl+T)"
              aria-label="Movimenti. Visualizza tutti i movimenti. Scorciatoia tastiera: Control più T"
              aria-controls="transactions-panel"
              aria-selected={activeTab === 'transactions'}
            >
              <ArrowsLeftRight size={isMobile ? 20 : 18} weight="duotone" aria-hidden="true" />
              <span className="font-medium">Movimenti</span>
              {!isMobile && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden lg:inline-flex" aria-hidden="true">Ctrl+T</Badge>}
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="gap-1.5 sm:gap-2 py-3 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all" 
              data-focus-info="Scheda Report - Visualizza statistiche finanziarie (Ctrl+R)"
              aria-label="Report. Visualizza statistiche finanziarie. Scorciatoia tastiera: Control più R"
              aria-controls="reports-panel"
              aria-selected={activeTab === 'reports'}
            >
              <ChartLine size={isMobile ? 20 : 18} weight="duotone" aria-hidden="true" />
              <span className="font-medium">Report</span>
              {!isMobile && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden lg:inline-flex" aria-hidden="true">Ctrl+R</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6" id="dashboard-panel" role="tabpanel" aria-labelledby="dashboard-tab">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center">
                <h2 className="text-xl sm:text-2xl font-semibold">I Tuoi Conti</h2>
                <div className="flex gap-2 flex-wrap" role="group" aria-label="Azioni rapide conti e movimenti">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => { 
                          soundSystem.play('dialog-open')
                          hapticSystem.dialogOpen()
                          setEditingTransaction(undefined)
                          setShowTransactionDialog(true)
                        }} 
                        className={`gap-2 flex-1 sm:flex-none ${isMobile ? 'min-h-[48px] text-base' : ''}`}
                        aria-label="Aggiungi nuovo movimento. Apre finestra di dialogo per inserire entrata, uscita o trasferimento. Scorciatoia tastiera: Control più N"
                        data-focus-info="Aggiungi nuovo movimento (Ctrl+N)"
                      >
                        <Plus size={isMobile ? 22 : 18} weight="bold" aria-hidden="true" />
                        <span>Movimento</span>
                        {!isMobile && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 bg-primary-foreground/20 hidden sm:inline-flex" aria-hidden="true">Ctrl+N</Badge>}
                      </Button>
                    </TooltipTrigger>
                    {!isMobile && (
                      <TooltipContent variant="accent">
                        <div className="space-y-0.5">
                          <p className="font-semibold">Nuovo Movimento</p>
                          <p className="text-xs opacity-90">Aggiungi entrata, uscita o trasferimento (Ctrl+N)</p>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => { 
                          soundSystem.play('dialog-open')
                          hapticSystem.dialogOpen()
                          setEditingAccount(undefined)
                          setShowAccountDialog(true)
                        }} 
                        variant="outline" 
                        className={`gap-2 flex-1 sm:flex-none ${isMobile ? 'min-h-[48px] text-base' : ''}`}
                        aria-label="Aggiungi nuovo conto. Apre finestra di dialogo per creare conto bancario, digitale, risparmio o investimenti. Scorciatoia tastiera: Control più M"
                        data-focus-info="Aggiungi nuovo conto (Ctrl+M)"
                      >
                        <Plus size={isMobile ? 22 : 18} weight="bold" aria-hidden="true" />
                        <span>Conto</span>
                        {!isMobile && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden sm:inline-flex" aria-hidden="true">Ctrl+M</Badge>}
                      </Button>
                    </TooltipTrigger>
                    {!isMobile && (
                      <TooltipContent variant="secondary">
                        <div className="space-y-0.5">
                          <p className="font-semibold">Nuovo Conto</p>
                          <p className="text-xs opacity-90">Aggiungi bancario, digitale, risparmio o investimenti (Ctrl+M)</p>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  {hasPrivateAccount && !isPrivateUnlocked && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={() => {
                            soundSystem.play('dialog-open')
                            hapticSystem.dialogOpen()
                            setShowPrivatePinDialog(true)
                          }} 
                          variant="secondary" 
                          className={`gap-2 w-full sm:w-auto ${isMobile ? 'min-h-[48px] text-base' : ''}`}
                          aria-label="Sblocca conto privato. Richiede inserimento PIN privato per accedere ai conti protetti. Scorciatoia tastiera: Control più U"
                          data-focus-info="Sblocca conto privato (Ctrl+U)"
                        >
                          <LockOpen size={isMobile ? 22 : 18} weight="duotone" aria-hidden="true" />
                          <span>Sblocca Privato</span>
                          {!isMobile && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden sm:inline-flex" aria-hidden="true">Ctrl+U</Badge>}
                        </Button>
                      </TooltipTrigger>
                      {!isMobile && (
                        <TooltipContent variant="private">
                          <div className="space-y-0.5">
                            <p className="font-semibold">Sblocca Conto Privato</p>
                            <p className="text-xs opacity-90">Inserisci PIN per accedere ai conti protetti (Ctrl+U)</p>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </div>
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

          <TabsContent value="transactions" className="space-y-6" id="transactions-panel" role="tabpanel" aria-labelledby="transactions-tab">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Tutti i Movimenti</h2>
              <div className="flex gap-2" role="group" aria-label="Azioni movimenti">
                <Button 
                  onClick={() => handleExportCSV(visibleTransactions, visibleAccounts)} 
                  variant="outline" 
                  className="gap-2"
                  data-focus-info="Esporta movimenti in formato CSV (Ctrl+E)"
                  aria-label="Esporta movimenti in formato CSV. Scorciatoia: Control più E"
                >
                  <DownloadSimple size={18} weight="duotone" aria-hidden="true" />
                  Esporta CSV
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden sm:inline-flex" aria-hidden="true">Ctrl+E</Badge>
                </Button>
                <Button 
                  onClick={() => { setEditingTransaction(undefined); setShowTransactionDialog(true) }} 
                  className="gap-2"
                  data-focus-info="Aggiungi nuovo movimento (Ctrl+N)"
                  aria-label="Aggiungi nuovo movimento. Scorciatoia: Control più N"
                >
                  <Plus size={18} weight="bold" aria-hidden="true" />
                  Nuovo Movimento
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 bg-primary-foreground/20 hidden sm:inline-flex" aria-hidden="true">Ctrl+N</Badge>
                </Button>
              </div>
            </div>

            {visibleTransactions.length > 0 && (
              <Badge variant="secondary" className="text-xs" role="note" aria-label="Istruzioni navigazione: freccia su e freccia giù per navigare, Enter o E per modificare, Canc per eliminare, Home e End per primo e ultimo">
                ↑/↓ Naviga · Enter Modifica · E Modifica · Del Elimina · Home/End Primo/Ultimo
              </Badge>
            )}

            <Card>
              <CardContent className="p-0" role="region" aria-label="Lista movimenti" aria-live="polite">
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

          <TabsContent value="reports" className="space-y-6" id="reports-panel" role="tabpanel" aria-labelledby="reports-tab">
            <h2 className="text-2xl font-semibold">Report Finanziario</h2>

            <MonthlyComparisonChart transactions={visibleTransactions} />

            <div className="grid gap-4 md:grid-cols-3" role="region" aria-label="Statistiche finanziarie principali">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card 
                    className="cursor-help transition-all hover:shadow-md" 
                    data-focus-info="Saldo totale di tutti i conti visibili"
                    role="article"
                    aria-label={`Saldo totale: ${formatCurrency(totalBalance)}`}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">Saldo Totale</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-3xl font-mono font-bold ${totalBalance < 0 ? 'text-destructive' : 'text-foreground'}`} aria-live="polite">
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

                  <div className="space-y-4 mt-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold">Previsioni Budget</h3>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-xs cursor-help">
                            <Info size={12} weight="fill" className="mr-1" />
                            Basato su tendenze
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent variant="accent" className="max-w-sm">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold">Previsioni intelligenti</p>
                            <p className="text-xs opacity-90">
                              Le previsioni sono calcolate analizzando la tua spesa corrente e confrontandola con i periodi precedenti per stimare la spesa finale del periodo attuale
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {getActiveBudgets(safeBudgets).map(budget => (
                        <BudgetForecastCard
                          key={`forecast-${budget.id}`}
                          budget={budget}
                          transactions={visibleTransactions}
                        />
                      ))}
                    </div>
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <PiggyBank size={24} weight="duotone" />
                  Obiettivi di Risparmio
                </h3>
                <Button 
                  onClick={() => { setEditingSavingsGoal(undefined); setShowSavingsGoalDialog(true) }} 
                  className="gap-2"
                >
                  <Plus size={18} weight="bold" />
                  Nuovo Obiettivo
                </Button>
              </div>

              {safeSavingsGoals.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <PiggyBank size={48} weight="duotone" className="text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Nessun obiettivo di risparmio</p>
                    <p className="text-sm text-muted-foreground mb-6">Crea un obiettivo per tracciare i tuoi progressi di risparmio e raggiungere i tuoi traguardi finanziari</p>
                    <Button onClick={() => setShowSavingsGoalDialog(true)} className="gap-2">
                      <Plus size={18} weight="bold" />
                      Crea il Primo Obiettivo
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {safeSavingsGoals.map(goal => (
                    <SavingsGoalCard
                      key={goal.id}
                      goal={goal}
                      accounts={safeAccounts}
                      onEdit={(g) => {
                        setEditingSavingsGoal(g)
                        setShowSavingsGoalDialog(true)
                      }}
                      onDelete={(g) => {
                        setDeletingItem({ type: 'savingsGoal', id: g.id })
                        setShowDeleteDialog(true)
                      }}
                      onAddFunds={handleAddFundsToGoal}
                    />
                  ))}
                </div>
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

            <div className="space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Gear size={24} weight="duotone" />
                Impostazioni Applicazione
              </h3>
              
              <SecuritySettings />
              <CategoryManagement />
              <DataManagement />
              
              <h3 className="text-xl font-semibold flex items-center gap-2 mt-8">
                <Gear size={24} weight="duotone" />
                Impostazioni Accessibilità
              </h3>
              
              <DisplaySettings />
              <AudioSettings />
              <HapticSettings />
              <ScreenReaderSettings />
              <TalkBackSettings />
            </div>
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
        onSave={(account) => { handleSaveAccount(account); setEditingAccount(undefined) }}
        account={editingAccount}
        hasPrivateAccount={hasPrivateAccount && !editingAccount?.isPrivato}
      />

      <TransactionDialog
        open={showTransactionDialog}
        onClose={() => { setShowTransactionDialog(false); setEditingTransaction(undefined) }}
        onSave={(transaction) => { handleSaveTransaction(transaction); setEditingTransaction(undefined) }}
        transaction={editingTransaction}
        accounts={visibleAccounts}
        categories={safeCategories}
      />

      <BudgetDialog
        open={showBudgetDialog}
        onClose={() => { setShowBudgetDialog(false); setEditingBudget(undefined) }}
        onSave={(budget) => { handleSaveBudget(budget); setEditingBudget(undefined) }}
        budget={editingBudget}
        categories={safeCategories}
        accounts={visibleAccounts}
      />

      <SavingsGoalDialog
        open={showSavingsGoalDialog}
        onClose={() => { setShowSavingsGoalDialog(false); setEditingSavingsGoal(undefined) }}
        onSave={(goal) => { handleSaveSavingsGoal(goal); setEditingSavingsGoal(undefined) }}
        goal={editingSavingsGoal}
        accounts={visibleAccounts}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!open) {
          soundSystem.play('dialog-close')
          setDeletingItem(null)
        }
        setShowDeleteDialog(open)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.type === 'account'
                ? 'Eliminando questo conto verranno rimossi anche tutti i movimenti associati. Questa azione non può essere annullata.'
                : deletingItem?.type === 'budget'
                ? 'Questa azione eliminerà definitivamente il budget. Non può essere annullata.'
                : deletingItem?.type === 'savingsGoal'
                ? 'Questa azione eliminerà definitivamente l\'obiettivo di risparmio. Non può essere annullata.'
                : 'Questa azione eliminerà definitivamente il movimento. Non può essere annullata.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => soundSystem.play('dialog-close')}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingItem) handleDeleteConfirm(deletingItem) }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
    </div>
    <Toaster />
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <AppContent />
      </AppDataProvider>
    </AuthProvider>
  )
}

export default App