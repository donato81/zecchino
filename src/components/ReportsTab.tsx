import { useMemo, useState } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useVisibleData } from '@/context/VisibleDataContext'
import { calculateAccountBalance, formatCurrency, getActiveBudgets } from '@/lib/helpers'
import { BudgetProgressCard } from '@/components/BudgetProgressCard'
import { BudgetForecastCard } from '@/components/BudgetForecastCard'
import { BudgetHistoryChart } from '@/components/BudgetHistoryChart'
import { BudgetComparisonCard } from '@/components/BudgetComparisonCard'
import { SavingsGoalCard } from '@/components/SavingsGoalCard'
import { PeriodSelector } from '@/components/PeriodSelector'
import { IncomeExpenseChart } from '@/components/IncomeExpenseChart'
import { MonthlyComparisonChart } from '@/components/MonthlyComparisonChart'
import { SecuritySettings } from '@/components/SecuritySettings'
import { CategoryManagement } from '@/components/CategoryManagement'
import { DataManagement } from '@/components/DataManagement'
import { DisplaySettings } from '@/components/DisplaySettings'
import { AudioSettings } from '@/components/AudioSettings'
import { HapticSettings } from '@/components/HapticSettings'
import { ScreenReaderSettings } from '@/components/ScreenReaderSettings'
import { TalkBackSettings } from '@/components/TalkBackSettings'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Gear, Info, PiggyBank, Plus, Target } from '@phosphor-icons/react'

export function ReportsTab() {
  const {
    safeCategories,
    safeBudgets,
    safeSavingsGoals,
    safeAccounts,
    setShowBudgetDialog,
    setEditingBudget,
    setShowSavingsGoalDialog,
    setEditingSavingsGoal,
    handleAddFundsToGoal,
    setDeletingItem,
    setShowDeleteDialog,
  } = useAppData()

  const {
    visibleAccounts,
    visibleTransactions,
    totalBalance,
  } = useVisibleData()

  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month')

  const activeBudgets = useMemo(() => getActiveBudgets(safeBudgets), [safeBudgets])

  const topIncomeCategories = useMemo(() => {
    const byCategory = visibleTransactions
      .filter(t => t.tipo === 'entrata')
      .reduce((acc, t) => {
        const category = safeCategories.find(c => c.id === t.categoriaId)
        const categoryName = category?.nome || 'Senza categoria'
        acc[categoryName] = (acc[categoryName] || 0) + t.importo
        return acc
      }, {} as Record<string, number>)

    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [visibleTransactions, safeCategories])

  const topExpenseCategories = useMemo(() => {
    const byCategory = visibleTransactions
      .filter(t => t.tipo === 'uscita')
      .reduce((acc, t) => {
        const category = safeCategories.find(c => c.id === t.categoriaId)
        const categoryName = category?.nome || 'Senza categoria'
        acc[categoryName] = (acc[categoryName] || 0) + t.importo
        return acc
      }, {} as Record<string, number>)

    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [visibleTransactions, safeCategories])

  return (
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
                {topIncomeCategories.length > 0 ? (
                  <>
                    <p className="text-xs font-medium mt-1">Top categorie:</p>
                    {topIncomeCategories.map(([categoryName, amount]) => (
                      <p key={categoryName} className="text-xs">• {categoryName}: {formatCurrency(amount)}</p>
                    ))}
                  </>
                ) : (
                  <p className="text-xs opacity-75">Nessuna entrata registrata</p>
                )}
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
                {topExpenseCategories.length > 0 ? (
                  <>
                    <p className="text-xs font-medium mt-1">Top categorie:</p>
                    {topExpenseCategories.map(([categoryName, amount]) => (
                      <p key={categoryName} className="text-xs">• {categoryName}: {formatCurrency(amount)}</p>
                    ))}
                  </>
                ) : (
                  <p className="text-xs opacity-75">Nessuna uscita registrata</p>
                )}
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

        {activeBudgets.length === 0 ? (
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
              {activeBudgets.map(budget => (
                <BudgetProgressCard
                  key={budget.id}
                  budget={budget}
                  transactions={visibleTransactions}
                  categories={safeCategories}
                  accounts={visibleAccounts}
                  onEdit={(currentBudget) => {
                    setEditingBudget(currentBudget)
                    setShowBudgetDialog(true)
                  }}
                  onDelete={(currentBudget) => {
                    setDeletingItem({ type: 'budget', id: currentBudget.id })
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
                {activeBudgets.map(budget => (
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

              {activeBudgets.map(budget => (
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
                onEdit={(currentGoal) => {
                  setEditingSavingsGoal(currentGoal)
                  setShowSavingsGoalDialog(true)
                }}
                onDelete={(currentGoal) => {
                  setDeletingItem({ type: 'savingsGoal', id: currentGoal.id })
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
  )
}