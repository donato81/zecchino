import { Budget, Transaction } from './types'

export interface BudgetPeriodData {
  periodLabel: string
  startDate: string
  endDate: string
  spent: number
  percentage: number
  remaining: number
  isOverBudget: boolean
  transactionCount: number
}

function getMonthName(month: number): string {
  const months = [
    'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
  ]
  return months[month]
}

function getQuarterName(quarter: number, year: number): string {
  return `Q${quarter} ${year}`
}

function getPeriodLabel(budget: Budget, periodIndex: number): string {
  const startDate = new Date(budget.dataInizio)
  
  switch (budget.periodo) {
    case 'mensile': {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() - periodIndex)
      return `${getMonthName(date.getMonth())} ${date.getFullYear()}`
    }
    case 'trimestrale': {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() - (periodIndex * 3))
      const quarter = Math.floor(date.getMonth() / 3) + 1
      return getQuarterName(quarter, date.getFullYear())
    }
    case 'annuale': {
      const year = startDate.getFullYear() - periodIndex
      return `${year}`
    }
  }
}

function getPeriodDates(budget: Budget, periodIndex: number): { start: Date; end: Date } {
  const currentStart = new Date(budget.dataInizio)
  
  switch (budget.periodo) {
    case 'mensile': {
      const start = new Date(currentStart)
      start.setMonth(start.getMonth() - periodIndex)
      const end = new Date(start)
      end.setMonth(end.getMonth() + 1)
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    case 'trimestrale': {
      const start = new Date(currentStart)
      start.setMonth(start.getMonth() - (periodIndex * 3))
      const end = new Date(start)
      end.setMonth(end.getMonth() + 3)
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    case 'annuale': {
      const start = new Date(currentStart)
      start.setFullYear(start.getFullYear() - periodIndex)
      const end = new Date(start)
      end.setFullYear(end.getFullYear() + 1)
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
  }
}

function calculatePeriodSpending(
  budget: Budget,
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): { spent: number; transactionCount: number } {
  const periodTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.data)
    const inDateRange = transactionDate >= startDate && transactionDate <= endDate
    
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

export function getBudgetHistoricalData(
  budget: Budget,
  transactions: Transaction[],
  periodsToShow: number = 6
): BudgetPeriodData[] {
  const historyData: BudgetPeriodData[] = []
  
  for (let i = 0; i < periodsToShow; i++) {
    const { start, end } = getPeriodDates(budget, i)
    const { spent, transactionCount } = calculatePeriodSpending(budget, transactions, start, end)
    
    const percentage = budget.importoTarget > 0 ? (spent / budget.importoTarget) * 100 : 0
    const remaining = budget.importoTarget - spent
    const isOverBudget = spent > budget.importoTarget
    
    historyData.push({
      periodLabel: getPeriodLabel(budget, i),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      spent,
      percentage,
      remaining,
      isOverBudget,
      transactionCount
    })
  }
  
  return historyData.reverse()
}

export interface BudgetTrendData {
  trend: 'increasing' | 'decreasing' | 'stable'
  changePercentage: number
  averageSpending: number
  periodsOverBudget: number
  totalPeriods: number
}

export function calculateBudgetTrend(
  budget: Budget,
  transactions: Transaction[],
  periodsToAnalyze: number = 6
): BudgetTrendData {
  const historyData = getBudgetHistoricalData(budget, transactions, periodsToAnalyze)
  
  if (historyData.length < 2) {
    return {
      trend: 'stable',
      changePercentage: 0,
      averageSpending: historyData[0]?.spent || 0,
      periodsOverBudget: historyData.filter(d => d.isOverBudget).length,
      totalPeriods: historyData.length
    }
  }
  
  const averageSpending = historyData.reduce((sum, d) => sum + d.spent, 0) / historyData.length
  
  const midpoint = Math.floor(historyData.length / 2)
  const recentPeriods = historyData.slice(midpoint)
  const olderPeriods = historyData.slice(0, midpoint)
  
  const recentAvg = recentPeriods.reduce((sum, d) => sum + d.spent, 0) / recentPeriods.length
  const olderAvg = olderPeriods.reduce((sum, d) => sum + d.spent, 0) / olderPeriods.length
  
  const changePercentage = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0
  
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (changePercentage > 10) trend = 'increasing'
  else if (changePercentage < -10) trend = 'decreasing'
  
  return {
    trend,
    changePercentage,
    averageSpending,
    periodsOverBudget: historyData.filter(d => d.isOverBudget).length,
    totalPeriods: historyData.length
  }
}

export function compareBudgetPeriods(
  budget: Budget,
  transactions: Transaction[]
): {
  currentPeriod: BudgetPeriodData
  previousPeriod: BudgetPeriodData
  change: number
  changePercentage: number
} {
  const periods = getBudgetHistoricalData(budget, transactions, 2)
  
  const currentPeriod = periods[1] || {
    periodLabel: 'Corrente',
    startDate: budget.dataInizio,
    endDate: budget.dataFine,
    spent: 0,
    percentage: 0,
    remaining: budget.importoTarget,
    isOverBudget: false,
    transactionCount: 0
  }
  
  const previousPeriod = periods[0] || {
    periodLabel: 'Precedente',
    startDate: budget.dataInizio,
    endDate: budget.dataFine,
    spent: 0,
    percentage: 0,
    remaining: budget.importoTarget,
    isOverBudget: false,
    transactionCount: 0
  }
  
  const change = currentPeriod.spent - previousPeriod.spent
  const changePercentage = previousPeriod.spent > 0 
    ? (change / previousPeriod.spent) * 100 
    : 0
  
  return {
    currentPeriod,
    previousPeriod,
    change,
    changePercentage
  }
}
