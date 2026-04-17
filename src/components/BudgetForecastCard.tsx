import { Budget, Transaction } from '@/lib/types'
import { calculateBudgetForecast, getForecastMethodLabel, getConfidenceLabel, getConfidenceDescription } from '@/lib/budget-forecasting'
import { getBudgetProgress, formatCurrency } from '@/lib/helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { ChartLine, TrendUp, TrendDown, Warning, CheckCircle, Info } from '@phosphor-icons/react'

interface BudgetForecastCardProps {
  budget: Budget
  transactions: Transaction[]
}

export function BudgetForecastCard({ budget, transactions }: BudgetForecastCardProps) {
  const forecast = calculateBudgetForecast(budget, transactions)
  const currentProgress = getBudgetProgress(budget, transactions)
  
  const getConfidenceColor = (confidence: typeof forecast.confidence) => {
    switch (confidence) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-orange-600'
    }
  }
  
  const getConfidenceBadgeVariant = (confidence: typeof forecast.confidence): 'default' | 'secondary' | 'outline' => {
    switch (confidence) {
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
    }
  }

  const isMidPeriod = forecast.daysElapsed > 0 && forecast.daysRemaining > 0
  const isEndOfPeriod = forecast.daysRemaining === 0
  
  const historicalComparison = forecast.historicalComparison.comparisonPercentage
  const isAboveHistorical = historicalComparison > 5
  const isBelowHistorical = historicalComparison < -5

  return (
    <Card className="overflow-hidden border-accent/20">
      <CardHeader className="bg-gradient-to-br from-accent/5 via-transparent to-primary/5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ChartLine size={24} weight="duotone" className="text-accent" />
              <CardTitle className="text-lg">Previsione Budget</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant={getConfidenceBadgeVariant(forecast.confidence)} 
                    className={`text-xs ${getConfidenceColor(forecast.confidence)}`}
                  >
                    {getConfidenceLabel(forecast.confidence)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent variant="accent" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-xs">{getConfidenceLabel(forecast.confidence)}</p>
                    <p className="text-xs opacity-90">{getConfidenceDescription(forecast)}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <CardDescription className="text-xs">
              {getForecastMethodLabel(forecast.forecastMethod)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {isEndOfPeriod ? (
          <div className="text-center py-4">
            <CheckCircle size={32} weight="duotone" className="text-accent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Il periodo è concluso</p>
            <p className="text-xs text-muted-foreground mt-1">
              Spesa finale: {formatCurrency(currentProgress.spent)}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Spesa prevista a fine periodo</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <span className={`text-lg font-mono font-bold ${
                        forecast.willExceedBudget ? 'text-destructive' : 'text-accent'
                      }`}>
                        {formatCurrency(forecast.projectedSpending)}
                      </span>
                      {forecast.willExceedBudget && (
                        <Warning size={18} weight="duotone" className="text-destructive" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent variant={forecast.willExceedBudget ? 'destructive' : 'accent'}>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">
                        {forecast.willExceedBudget 
                          ? 'Rischio superamento budget' 
                          : 'Previsione entro il budget'}
                      </p>
                      <p className="text-xs opacity-90">
                        {forecast.projectedPercentage.toFixed(0)}% del budget target
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Proiezione vs Budget</span>
                  <span className={`font-semibold ${
                    forecast.willExceedBudget ? 'text-destructive' : 'text-green-600'
                  }`}>
                    {forecast.projectedPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all rounded-full ${
                      forecast.willExceedBudget ? 'bg-destructive' : 'bg-accent'
                    }`}
                    style={{ width: `${Math.min(forecast.projectedPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1 cursor-help">
                    <p className="text-xs text-muted-foreground">Giorni trascorsi</p>
                    <p className="text-base font-mono font-semibold">
                      {forecast.daysElapsed}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent variant="secondary">
                  <p className="text-xs">Giorni dall'inizio del periodo</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1 cursor-help">
                    <p className="text-xs text-muted-foreground">Giorni rimanenti</p>
                    <p className="text-base font-mono font-semibold">
                      {forecast.daysRemaining}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent variant="secondary">
                  <p className="text-xs">Giorni fino alla fine del periodo</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1 cursor-help">
                    <p className="text-xs text-muted-foreground">Media giornaliera attuale</p>
                    <p className="text-base font-mono font-semibold text-accent">
                      {formatCurrency(forecast.currentDailyAverage)}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent variant="accent">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">Spesa media al giorno</p>
                    <p className="text-xs opacity-90">
                      Basata sui {forecast.daysElapsed} giorni trascorsi
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1 cursor-help">
                    <p className="text-xs text-muted-foreground">Media storica</p>
                    <p className="text-base font-mono font-semibold text-primary">
                      {formatCurrency(forecast.historicalDailyAverage)}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent variant="secondary">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">Media giornaliera storica</p>
                    <p className="text-xs opacity-90">
                      Basata su periodi precedenti
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>

            {isMidPeriod && forecast.historicalComparison.averagePeriodSpending > 0 && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center gap-2">
                  <Info size={16} weight="duotone" className="text-primary" />
                  <p className="text-xs font-medium">Confronto con lo storico</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Media periodi precedenti</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(forecast.historicalComparison.averagePeriodSpending)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Differenza prevista</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 cursor-help">
                          {isAboveHistorical ? (
                            <TrendUp size={16} weight="duotone" className="text-destructive" />
                          ) : isBelowHistorical ? (
                            <TrendDown size={16} weight="duotone" className="text-green-600" />
                          ) : null}
                          <span className={`font-mono font-semibold ${
                            isAboveHistorical ? 'text-destructive' : 
                            isBelowHistorical ? 'text-green-600' : 
                            'text-foreground'
                          }`}>
                            {forecast.historicalComparison.comparisonToHistorical > 0 ? '+' : ''}
                            {formatCurrency(forecast.historicalComparison.comparisonToHistorical)}
                          </span>
                          <span className={`text-xs ${
                            isAboveHistorical ? 'text-destructive' : 
                            isBelowHistorical ? 'text-green-600' : 
                            'text-muted-foreground'
                          }`}>
                            ({forecast.historicalComparison.comparisonPercentage > 0 ? '+' : ''}
                            {forecast.historicalComparison.comparisonPercentage.toFixed(1)}%)
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent variant={isAboveHistorical ? 'destructive' : isBelowHistorical ? 'success' : 'secondary'}>
                        <p className="text-xs">
                          {isAboveHistorical 
                            ? 'Stai spendendo più della media storica' 
                            : isBelowHistorical 
                            ? 'Stai spendendo meno della media storica'
                            : 'In linea con la media storica'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}

            {forecast.willExceedBudget && (
              <div className="pt-4 border-t bg-destructive/5 -mx-6 px-6 py-3 rounded-b-lg">
                <div className="flex items-start gap-2">
                  <Warning size={18} weight="duotone" className="text-destructive mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-destructive">
                      Superamento budget previsto
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Al ritmo attuale, potresti superare il budget di {formatCurrency(Math.abs(forecast.projectedRemaining))} 
                      ({(forecast.projectedPercentage - 100).toFixed(0)}%)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!forecast.willExceedBudget && forecast.projectedPercentage > 85 && (
              <div className="pt-4 border-t bg-yellow-500/5 -mx-6 px-6 py-3 rounded-b-lg">
                <div className="flex items-start gap-2">
                  <Info size={18} weight="duotone" className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-yellow-700">
                      Budget in esaurimento
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stai per raggiungere il limite. Rimangono ancora {formatCurrency(forecast.projectedRemaining)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
