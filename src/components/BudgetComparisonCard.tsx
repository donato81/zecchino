import { useMemo } from 'react'
import { Budget, Transaction } from '@/lib/types'
import { formatCurrency } from '@/lib/helpers'
import { compareBudgetPeriods } from '@/lib/budget-history'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendUp, TrendDown, Equals, CalendarBlank } from '@phosphor-icons/react'

interface BudgetComparisonCardProps {
  budget: Budget
  transactions: Transaction[]
}

export function BudgetComparisonCard({ budget, transactions }: BudgetComparisonCardProps) {
  const comparison = useMemo(() => {
    return compareBudgetPeriods(budget, transactions)
  }, [budget, transactions])

  const { currentPeriod, previousPeriod, change, changePercentage } = comparison

  const getTrendIcon = () => {
    if (Math.abs(changePercentage) < 5) {
      return <Equals size={24} weight="duotone" className="text-muted-foreground" aria-hidden="true" />
    }
    if (change > 0) {
      return <TrendUp size={24} weight="duotone" className="text-destructive" aria-hidden="true" />
    }
    return <TrendDown size={24} weight="duotone" className="text-green-600" aria-hidden="true" />
  }

  const getTrendColor = () => {
    if (Math.abs(changePercentage) < 5) return 'text-muted-foreground'
    if (change > 0) return 'text-destructive'
    return 'text-green-600'
  }

  const getTrendLabel = () => {
    if (Math.abs(changePercentage) < 5) return 'Stabile'
    if (change > 0) return 'Aumento'
    return 'Diminuzione'
  }

  const getTrendBadgeVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (Math.abs(changePercentage) < 5) return 'secondary'
    if (change > 0) return 'destructive'
    return 'default'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarBlank size={20} weight="duotone" />
          Confronto Periodi: {budget.nome}
        </CardTitle>
        <CardDescription>
          Confronto tra periodo corrente e precedente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-3 py-4">
          {getTrendIcon()}
          <div className="text-center">
            <p className={`text-3xl font-mono font-bold ${getTrendColor()}`}>
              {change > 0 ? '+' : ''}{formatCurrency(change)}
            </p>
            <div className="flex items-center gap-2 justify-center mt-1">
              <p className={`text-sm font-semibold ${getTrendColor()}`}>
                {getTrendLabel()}
              </p>
              <Badge variant={getTrendBadgeVariant()} className="text-xs">
                {changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2 cursor-help">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <p className="text-sm font-medium text-muted-foreground">Periodo Corrente</p>
                </div>
                <div className="space-y-1 pl-5">
                  <p className="text-xs text-muted-foreground">{currentPeriod.periodLabel}</p>
                  <p className="text-lg font-mono font-semibold">
                    {formatCurrency(currentPeriod.spent)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={currentPeriod.isOverBudget ? 'destructive' : 'secondary'} 
                      className="text-xs"
                    >
                      {currentPeriod.percentage.toFixed(0)}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {currentPeriod.transactionCount} mov.
                    </span>
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent variant="accent">
              <div className="space-y-1">
                <p className="font-semibold">Periodo Corrente</p>
                <p className="text-xs">Speso: {formatCurrency(currentPeriod.spent)}</p>
                <p className="text-xs">
                  {currentPeriod.isOverBudget 
                    ? `Oltre: ${formatCurrency(Math.abs(currentPeriod.remaining))}` 
                    : `Rimasto: ${formatCurrency(currentPeriod.remaining)}`}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2 cursor-help">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">Periodo Precedente</p>
                </div>
                <div className="space-y-1 pl-5">
                  <p className="text-xs text-muted-foreground">{previousPeriod.periodLabel}</p>
                  <p className="text-lg font-mono font-semibold">
                    {formatCurrency(previousPeriod.spent)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={previousPeriod.isOverBudget ? 'destructive' : 'secondary'} 
                      className="text-xs"
                    >
                      {previousPeriod.percentage.toFixed(0)}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {previousPeriod.transactionCount} mov.
                    </span>
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent variant="secondary">
              <div className="space-y-1">
                <p className="font-semibold">Periodo Precedente</p>
                <p className="text-xs">Speso: {formatCurrency(previousPeriod.spent)}</p>
                <p className="text-xs">
                  {previousPeriod.isOverBudget 
                    ? `Oltre: ${formatCurrency(Math.abs(previousPeriod.remaining))}` 
                    : `Rimasto: ${formatCurrency(previousPeriod.remaining)}`}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {Math.abs(changePercentage) < 5 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              La spesa è rimasta stabile tra i due periodi
            </p>
          </div>
        )}

        {change > 0 && changePercentage >= 5 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-destructive text-center">
              La spesa è aumentata del {changePercentage.toFixed(1)}% rispetto al periodo precedente
            </p>
          </div>
        )}

        {change < 0 && Math.abs(changePercentage) >= 5 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-green-600 text-center">
              Ottimo! Hai ridotto la spesa del {Math.abs(changePercentage).toFixed(1)}% rispetto al periodo precedente
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
