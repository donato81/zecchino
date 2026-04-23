import { useState, useEffect, useMemo } from 'react'
import { Account, Transaction, Budget, SavingsGoal } from '@/lib/types'
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
import { TransactionsTab } from '@/components/TransactionsTab'
import { DashboardTab } from '@/components/DashboardTab'
import { ReportsTab } from '@/components/ReportsTab'
import { AppHeader } from '@/components/AppHeader'
import { IncomeExpenseChart } from '@/components/IncomeExpenseChart'
import { MonthlyComparisonChart } from '@/components/MonthlyComparisonChart'
import { PeriodSelector } from '@/components/PeriodSelector'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, LockOpen, ChartLine, List, Gear, Trash, PencilSimple, ArrowsLeftRight, Eye, EyeSlash, Target, Info, PiggyBank } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useAppShortcuts } from '@/hooks/use-app-shortcuts'
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
    showKeyboardHelp,
    setShowKeyboardHelp,
  } = useAppData()
  const {
    globalPinHash, setGlobalPinHash,
    privatePinHash, setPrivatePinHash,
    isAuthenticated, setIsAuthenticated,
    isPrivateUnlocked, setIsPrivateUnlocked,
    isSetupMode, setIsSetupMode,
    showPinDialog, setShowPinDialog,
    showPrivatePinDialog, setShowPrivatePinDialog,
    handleGlobalPinSubmit,
    handlePrivatePinSubmit,
  } = useAuth()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [previousTab, setPreviousTab] = useState('dashboard')

  useEffect(() => {
    if (showDeleteDialog) {
      soundSystem.play('dialog-open')
    }
  }, [showDeleteDialog])

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

  useAppShortcuts({
    activeTab,
    setActiveTab,
    setShowTransactionDialog,
    setShowAccountDialog,
    setShowKeyboardHelp,
    setEditingTransaction,
    setEditingAccount,
  })

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
        <AppHeader />

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

          <DashboardTab />

          <TransactionsTab />

          <ReportsTab />
        </Tabs>
      </main>

      <PinDialog
        open={showPrivatePinDialog}
        title={privatePinHash ? 'Sblocca Conto Privato' : 'Crea PIN Conto Privato'}
        description={privatePinHash ? 'Inserisci il PIN del conto privato' : 'Crea un PIN per il conto privato'}
        onSubmit={(pin) => handlePrivatePinSubmit(pin, () => {
          const privateAccount = visibleAccounts.find(a => a.isPrivato)
          if (privateAccount) {
            const balance = calculateAccountBalance(privateAccount, visibleTransactions)
            toast.success(`Conto privato sbloccato. Saldo: ${formatCurrency(balance)}`)
            screenReader.announceBalance('Conto privato', balance)
          } else {
            screenReader.announceSuccess('Conto privato sbloccato.')
          }
        })}
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
            <AlertDialogAction onClick={() => handleDeleteConfirm()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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