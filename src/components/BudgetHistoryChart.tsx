import { useMemo } from 'react'
import { Budget, Transaction } from '@/lib/types'
import { formatCurrency } from '@/lib/helpers'
import { getBudgetHistoricalData } from '@/lib/budget-history'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendUp, TrendDown, Minus, Target } from '@phosphor-icons/react'

interface BudgetHistoryChartProps {
  budget: Budget
  transactions: Transaction[]
  periodsToShow?: number
}

export function BudgetHistoryChart({ budget, transactions, periodsToShow = 6 }: BudgetHistoryChartProps) {
  const historyData = useMemo(() => {
    return getBudgetHistoricalData(budget, transactions, periodsToShow)
  }, [budget, transactions, periodsToShow])

  const maxSpent = Math.max(...historyData.map(d => d.spent), budget.importoTarget)
  const avgSpending = historyData.reduce((sum, d) => sum + d.spent, 0) / historyData.length
  
  const trend = useMemo(() => {
    if (historyData.length < 2) return 'stable'
    
    const recent = historyData.slice(-3)
    const older = historyData.slice(0, -3)
    
    if (older.length === 0) return 'stable'
    
    const recentAvg = recent.reduce((sum, d) => sum + d.spent, 0) / recent.length
    const olderAvg = older.reduce((sum, d) => sum + d.spent, 0) / older.length
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100
    
    if (change > 10) return 'increasing'
    if (change < -10) return 'decreasing'
    return 'stable'
  }, [historyData])

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing':
        return <TrendUp size={20} weight="duotone" className="text-destructive" />
      case 'decreasing':
        return <TrendDown size={20} weight="duotone" className="text-green-600" />
      default:
        return <Minus size={20} weight="duotone" className="text-muted-foreground" />
    }
  }

  const getTrendLabel = () => {
    switch (trend) {
      case 'increasing':
        return 'In aumento'
      case 'decreasing':
        return 'In diminuzione'
      default:
        return 'Stabile'
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'increasing':
        return 'text-destructive'
      case 'decreasing':
        return 'text-green-600'
      default:
        return 'text-muted-foreground'
    }
  }

  if (historyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target size={20} weight="duotone" />
            Storico Budget
          </CardTitle>
          <CardDescription>Nessun dato storico disponibile</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target size={20} weight="duotone" />
          Storico Budget: {budget.nome}
        </CardTitle>
        <CardDescription>
          Andamento della spesa negli ultimi {periodsToShow} periodi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1 cursor-help">
                <p className="text-xs text-muted-foreground">Media Spesa</p>
                <p className="text-lg font-mono font-semibold">
                  {formatCurrency(avgSpending)}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent variant="accent">
              <p className="text-xs">Spesa media negli ultimi {periodsToShow} periodi</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1 cursor-help">
                <p className="text-xs text-muted-foreground">Tendenza</p>
                <div className="flex items-center gap-2">
                  {getTrendIcon()}
                  <p className={`text-sm font-semibold ${getTrendColor()}`}>
                    {getTrendLabel()}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent variant="secondary">
              <p className="text-xs">Confronto tra i periodi recenti e quelli passati</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1 cursor-help">
                <p className="text-xs text-muted-foreground">Periodi Oltre Budget</p>
                <p className="text-lg font-mono font-semibold text-destructive">
                  {historyData.filter(d => d.isOverBudget).length} / {historyData.length}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent variant="destructive">
              <p className="text-xs">Numero di periodi in cui hai superato il budget</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-3">
          {historyData.map((period, index) => {
            const barWidth = (period.spent / maxSpent) * 100
            const targetPosition = (budget.importoTarget / maxSpent) * 100
            const isOverBudget = period.spent > budget.importoTarget
            
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div className="space-y-1 cursor-pointer">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{period.periodLabel}</span>
                        {isOverBudget && (
                          <Badge variant="destructive" className="text-xs">
                            +{((period.spent - budget.importoTarget) / budget.importoTarget * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                      <span className={`font-mono font-semibold ${isOverBudget ? 'text-destructive' : ''}`}>
                        {formatCurrency(period.spent)}
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={Math.min(Math.round(period.percentage), 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${period.periodLabel}: ${Math.min(Math.round(period.percentage), 100)}% del budget, ${formatCurrency(period.spent)} su ${formatCurrency(budget.importoTarget)}`}
                      className="relative w-full bg-muted rounded-full h-8 overflow-hidden"
                    >
                      <div 
                        className={`h-full transition-all rounded-full ${
                          isOverBudget 
                            ? 'bg-destructive' 
                            : period.percentage >= 90 
                            ? 'bg-amber-500' 
                            : period.percentage >= 75 
                            ? 'bg-yellow-500' 
                            : 'bg-accent'
                        }`}
                        style={{ width: `${Math.min(barWidth, 100)}%` }}
                        aria-hidden="true"
                      />
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                        style={{ left: `${Math.min(targetPosition, 100)}%` }}
                        aria-hidden="true"
                      >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-foreground/60" />
                      </div>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground/80" aria-hidden="true">
                        {period.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent variant={isOverBudget ? 'destructive' : 'accent'} className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">{period.periodLabel}</p>
                    <p className="text-xs">Speso: {formatCurrency(period.spent)}</p>
                    <p className="text-xs">Budget: {formatCurrency(budget.importoTarget)}</p>
                    <p className="text-xs">
                      {isOverBudget 
                        ? `Oltre: ${formatCurrency(Math.abs(period.remaining))}` 
                        : `Risparmiato: ${formatCurrency(period.remaining)}`}
                    </p>
                    <p className="text-xs opacity-90">{period.transactionCount} movimenti</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-accent" />
            <span>Sotto il 75%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>75-90%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>90-100%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive" />
            <span>Oltre budget</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
