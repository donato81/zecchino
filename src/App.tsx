import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/helpers'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { useIsMobile } from '@/hooks/use-mobile'
import { AppDataProvider, useAppData } from '@/context/AppDataContext'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { VisibleDataProvider, useVisibleData } from '@/context/VisibleDataContext'
import { UserSettingsProvider, useUserSettings } from '@/context/UserSettingsContext'
import { SkipLink } from '@/components/SkipLink'
import { BudgetAlertBanner } from '@/components/BudgetAlertBanner'
import { FocusIndicator } from '@/components/FocusIndicator'
import { TransactionsTab } from '@/components/TransactionsTab'
import { DashboardTab } from '@/components/DashboardTab'
import { ReportsTab } from '@/components/ReportsTab'
import { AppHeader } from '@/components/AppHeader'
import { AuthScreen } from '@/components/AuthScreen'
import { DialogsOverlay } from '@/components/DialogsOverlay'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { OnboardingFlow } from '@/components/OnboardingFlow'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ChartLine, List, ArrowsLeftRight } from '@phosphor-icons/react'
import { Toaster } from '@/components/ui/sonner'
import { useAppShortcuts } from '@/hooks/use-app-shortcuts'
import { useTalkBack } from '@/hooks/use-talkback'

function AppContent() {
  const screenReader = useScreenReader()
  const { isEnabled: isScreenReaderActive } = useTalkBack()
  const isMobile = useIsMobile()
  const {
    handleViewBudget, setShowTransactionDialog, setEditingAccount,
    setShowAccountDialog, setShowBudgetDialog, setEditingBudget, setShowKeyboardHelp, setEditingTransaction,
    isDataReady,
  } = useAppData()
  const { isAuthenticated, isAuthReady, needsOnboarding } = useAuth()
  const { dismissBudgetAlert, isSettingsReady } = useUserSettings()
  const { budgetAlerts, totalBalance, visibleAccounts, visibleTransactions } = useVisibleData()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [previousTab, setPreviousTab] = useState('dashboard')

  useEffect(() => {
    document.documentElement.setAttribute('data-sr-active', isScreenReaderActive ? 'true' : 'false')

    return () => {
      document.documentElement.removeAttribute('data-sr-active')
    }
  }, [isScreenReaderActive])

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

  useAppShortcuts({ activeTab, setActiveTab, setShowTransactionDialog, setShowAccountDialog, setShowKeyboardHelp, setEditingTransaction, setEditingAccount })
  if (!isAuthReady) return <LoadingSpinner />
  if (!isAuthenticated) return <AuthScreen />
  if (needsOnboarding) return <OnboardingFlow />
  if (isAuthenticated && !isSettingsReady) return <LoadingSpinner />   // ← riga aggiunta
  if (!isDataReady) return <LoadingSpinner />

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
                <BudgetAlertBanner alerts={budgetAlerts} onDismiss={dismissBudgetAlert} onViewBudget={(id) => handleViewBudget(id, (budget) => {
                  setActiveTab('reports')
                  setTimeout(() => {
                    setEditingBudget(budget)
                    setShowBudgetDialog(true)
                  }, 300)
                })} />
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
              <TabsList className="grid w-full grid-cols-3 gap-1 p-1 bg-muted/50 rounded-xl h-auto" role="tablist" aria-label="Navigazione principale dell'applicazione">
                <TabsTrigger value="dashboard" className="gap-1.5 sm:gap-2 py-3 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all" data-focus-info="Scheda Dashboard - Visualizza conti e movimenti recenti (Ctrl+D)" aria-label="Dashboard. Visualizza conti e movimenti recenti. Scorciatoia tastiera: Control più D" aria-controls="dashboard-panel" aria-selected={activeTab === 'dashboard'}>
                  <List size={isMobile ? 20 : 18} weight="duotone" aria-hidden="true" />
                  <span className="font-medium">Dashboard</span>
                  {!isMobile && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden lg:inline-flex" aria-hidden="true">Ctrl+D</Badge>}
                </TabsTrigger>
                <TabsTrigger value="transactions" className="gap-1.5 sm:gap-2 py-3 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all" data-focus-info="Scheda Movimenti - Visualizza tutti i movimenti (Ctrl+T)" aria-label="Movimenti. Visualizza tutti i movimenti. Scorciatoia tastiera: Control più T" aria-controls="transactions-panel" aria-selected={activeTab === 'transactions'}>
                  <ArrowsLeftRight size={isMobile ? 20 : 18} weight="duotone" aria-hidden="true" />
                  <span className="font-medium">Movimenti</span>
                  {!isMobile && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden lg:inline-flex" aria-hidden="true">Ctrl+T</Badge>}
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-1.5 sm:gap-2 py-3 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all" data-focus-info="Scheda Report - Visualizza statistiche finanziarie (Ctrl+R)" aria-label="Report. Visualizza statistiche finanziarie. Scorciatoia tastiera: Control più R" aria-controls="reports-panel" aria-selected={activeTab === 'reports'}>
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

          <DialogsOverlay />
        </div>
      </div>
      <Toaster />
    </>
  )
}

function App() {
  return <AuthProvider><AppDataProvider><UserSettingsProvider><VisibleDataProvider><AppContent /></VisibleDataProvider></UserSettingsProvider></AppDataProvider></AuthProvider>
}

export default App