import { Budget, Transaction } from './types'
import { getBudgetHistoricalData, calculateBudgetTrend } from './budget-history'

export interface BudgetForecast {
  projectedSpending: number
  projectedPercentage: number
  projectedRemaining: number
  willExceedBudget: boolean
  confidence: 'high' | 'medium' | 'low'
  daysElapsed: number
  daysRemaining: number
  currentDailyAverage: number
  historicalDailyAverage: number
  forecastMethod: 'current-trend' | 'historical-average' | 'weighted'
  historicalComparison: {
    averagePeriodSpending: number
    comparisonToHistorical: number
    comparisonPercentage: number
  }
}

function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const diff = endDate.getTime() - startDate.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getCurrentPeriodSpending(
  budget: Budget,
  transactions: Transaction[]
): { spent: number; transactionCount: number } {
  const startDate = new Date(budget.dataInizio)
  const now = new Date()
  
  const periodTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.data)
    const inDateRange = transactionDate >= startDate && transactionDate <= now
    
    if (!inDateRange) return false
    
    if (budget.categoriaId) {
      return t.categoriaId === budget.categoriaId && t.tipo === 'uscita'
    }
    
    if (budget.contoId) {
      return t.contoId === budget.contoId && t.tipo === 'uscita'
    }
    
    return t.tipo === 'uscita'
  })
  
  const spent = periodTransactions.reduce((sum, t) => sum + t.importo, 0)
  
  return {
    spent,
    transactionCount: periodTransactions.length
  }
}

export function calculateBudgetForecast(
  budget: Budget,
  transactions: Transaction[],
  historicalPeriods: number = 6
): BudgetForecast {
  const startDate = new Date(budget.dataInizio)
  const endDate = new Date(budget.dataFine)
  const now = new Date()
  
  if (now > endDate) {
    const { spent } = getCurrentPeriodSpending(budget, transactions)
    return {
      projectedSpending: spent,
      projectedPercentage: (spent / budget.importoTarget) * 100,
      projectedRemaining: budget.importoTarget - spent,
      willExceedBudget: spent > budget.importoTarget,
      confidence: 'high',
      daysElapsed: calculateDaysBetween(startDate, endDate),
      daysRemaining: 0,
      currentDailyAverage: 0,
      historicalDailyAverage: 0,
      forecastMethod: 'current-trend',
      historicalComparison: {
        averagePeriodSpending: 0,
        comparisonToHistorical: 0,
        comparisonPercentage: 0
      }
    }
  }
  
  const totalDays = calculateDaysBetween(startDate, endDate)
  const daysElapsed = calculateDaysBetween(startDate, now)
  const daysRemaining = calculateDaysBetween(now, endDate)
  
  const { spent: currentSpent } = getCurrentPeriodSpending(budget, transactions)
  
  const currentDailyAverage = daysElapsed > 0 ? currentSpent / daysElapsed : 0
  
  const historicalData = getBudgetHistoricalData(budget, transactions, historicalPeriods + 1)
  const pastPeriodsData = historicalData.slice(0, -1)
  
  const averageHistoricalSpending = pastPeriodsData.length > 0
    ? pastPeriodsData.reduce((sum, d) => sum + d.spent, 0) / pastPeriodsData.length
    : 0
  
  const historicalDailyAverage = averageHistoricalSpending / totalDays
  
  calculateBudgetTrend(budget, transactions, historicalPeriods)
  
  let projectedSpending: number
  let forecastMethod: 'current-trend' | 'historical-average' | 'weighted'
  let confidence: 'high' | 'medium' | 'low'
  
  if (daysElapsed < 5) {
    projectedSpending = averageHistoricalSpending
    forecastMethod = 'historical-average'
    confidence = pastPeriodsData.length >= 3 ? 'medium' : 'low'
  } else if (daysElapsed / totalDays < 0.25) {
    const currentTrendProjection = currentSpent + (currentDailyAverage * daysRemaining)
    const historicalProjection = averageHistoricalSpending
    projectedSpending = (currentTrendProjection * 0.4) + (historicalProjection * 0.6)
    forecastMethod = 'weighted'
    confidence = pastPeriodsData.length >= 3 ? 'medium' : 'low'
  } else if (daysElapsed / totalDays < 0.5) {
    const currentTrendProjection = currentSpent + (currentDailyAverage * daysRemaining)
    const historicalProjection = averageHistoricalSpending
    projectedSpending = (currentTrendProjection * 0.6) + (historicalProjection * 0.4)
    forecastMethod = 'weighted'
    confidence = pastPeriodsData.length >= 2 ? 'high' : 'medium'
  } else {
    projectedSpending = currentSpent + (currentDailyAverage * daysRemaining)
    forecastMethod = 'current-trend'
    confidence = 'high'
  }
  
  const projectedPercentage = (projectedSpending / budget.importoTarget) * 100
  const projectedRemaining = budget.importoTarget - projectedSpending
  const willExceedBudget = projectedSpending > budget.importoTarget
  
  const comparisonToHistorical = projectedSpending - averageHistoricalSpending
  const comparisonPercentage = averageHistoricalSpending > 0
    ? (comparisonToHistorical / averageHistoricalSpending) * 100
    : 0
  
  return {
    projectedSpending,
    projectedPercentage,
    projectedRemaining,
    willExceedBudget,
    confidence,
    daysElapsed,
    daysRemaining,
    currentDailyAverage,
    historicalDailyAverage,
    forecastMethod,
    historicalComparison: {
      averagePeriodSpending: averageHistoricalSpending,
      comparisonToHistorical,
      comparisonPercentage
    }
  }
}

export function getForecastMethodLabel(method: BudgetForecast['forecastMethod']): string {
  switch (method) {
    case 'current-trend':
      return 'Basato sulla tendenza corrente'
    case 'historical-average':
      return 'Basato sulla media storica'
    case 'weighted':
      return 'Basato su tendenza e storico'
  }
}

export function getConfidenceLabel(confidence: BudgetForecast['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'Alta affidabilità'
    case 'medium':
      return 'Media affidabilità'
    case 'low':
      return 'Bassa affidabilità'
  }
}

export function getConfidenceDescription(forecast: BudgetForecast): string {
  const { confidence, daysElapsed, daysRemaining, forecastMethod } = forecast
  
  if (daysRemaining === 0) {
    return 'Il periodo è concluso'
  }
  
  if (confidence === 'high') {
    if (forecastMethod === 'current-trend') {
      return `Con oltre ${daysElapsed} giorni di dati, la previsione si basa sulla tua spesa giornaliera attuale`
    }
    return 'Dati sufficienti per una previsione accurata'
  }
  
  if (confidence === 'medium') {
    return 'La previsione è moderatamente affidabile, basandosi su dati parziali e storico'
  }
  
  return 'Pochi dati disponibili - la previsione potrebbe essere meno accurata'
}
