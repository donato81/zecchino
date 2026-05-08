import { Account, Transaction, Budget } from './types'

export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[]
): number {
  const accountTransactions = transactions.filter(
    t => t.contoId === account.id || t.contoDestinazioneId === account.id
  )
  
  let balance = account.saldoIniziale
  
  for (const transaction of accountTransactions) {
    if (transaction.contoId === account.id) {
      if (transaction.tipo === 'entrata') {
        balance += transaction.importo
      } else if (transaction.tipo === 'uscita') {
        balance -= transaction.importo
      } else if (transaction.tipo === 'trasferimento') {
        balance -= transaction.importo
      }
    }
    
    if (transaction.contoDestinazioneId === account.id && transaction.tipo === 'trasferimento') {
      balance += transaction.importo
    }
  }
  
  return balance
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('it-IT').format(date)
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function getTotalBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts.reduce((sum, account) => {
    return sum + calculateAccountBalance(account, transactions)
  }, 0)
}

export function getTransactionsInPeriod(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] {
  return transactions.filter(t => {
    const transactionDate = new Date(t.data)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return transactionDate >= start && transactionDate <= end
  })
}

export function getTotalByType(
  transactions: Transaction[],
  tipo: 'entrata' | 'uscita'
): number {
  return transactions
    .filter(t => t.tipo === tipo)
    .reduce((sum, t) => sum + t.importo, 0)
}

export function groupTransactionsByCategory(
  transactions: Transaction[],
  categories: Array<{ id: string; nome: string }>
): Array<{ categoria: string; totale: number }> {
  const grouped = new Map<string, number>()
  
  for (const transaction of transactions) {
    if (transaction.tipo !== 'uscita') continue
    
    const category = categories.find(c => c.id === transaction.categoriaId)
    const categoryName = category?.nome || 'Sconosciuta'
    
    grouped.set(categoryName, (grouped.get(categoryName) || 0) + transaction.importo)
  }
  
  return Array.from(grouped.entries())
    .map(([categoria, totale]) => ({ categoria, totale }))
    .sort((a, b) => b.totale - a.totale)
}

export function exportToCSV(
  transactions: Transaction[],
  accounts: Account[],
  categories: Array<{ id: string; nome: string }>
): string {
  const headers = ['Data', 'Tipo', 'Importo', 'Conto', 'Categoria', 'Descrizione', 'Ricorrente']
  const rows = transactions.map(t => {
    const account = accounts.find(a => a.id === t.contoId)
    const category = categories.find(c => c.id === t.categoriaId)
    
    return [
      formatDate(t.data),
      t.tipo,
      t.importo.toString(),
      account?.nome || '',
      category?.nome || '',
      t.descrizione,
      t.ricorrente ? 'Sì' : 'No'
    ]
  })
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  
  return csvContent
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function getBudgetProgress(
  budget: Budget,
  transactions: Transaction[]
): { spent: number; percentage: number; remaining: number; isOverBudget: boolean } {
  const budgetTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.data)
    const startDate = new Date(budget.dataInizio)
    const endDate = new Date(budget.dataFine)
    
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
  
  const spent = budgetTransactions.reduce((sum, t) => sum + t.importo, 0)
  const percentage = budget.importoTarget > 0 ? (spent / budget.importoTarget) * 100 : 0
  const remaining = budget.importoTarget - spent
  const isOverBudget = spent > budget.importoTarget
  
  return { spent, percentage, remaining, isOverBudget }
}

export function getActiveBudgets(budgets: Budget[]): Budget[] {
  const now = new Date()
  return budgets.filter(budget => {
    if (!budget.attivo) return false
    const endDate = new Date(budget.dataFine)
    return endDate >= now
  })
}

export function getBudgetPeriodDates(periodo: Budget['periodo'], startDate: Date = new Date()): { dataInizio: string; dataFine: string } {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(start)
  
  switch (periodo) {
    case 'mensile':
      end.setMonth(end.getMonth() + 1)
      end.setDate(end.getDate() - 1)
      break
    case 'trimestrale':
      end.setMonth(end.getMonth() + 3)
      end.setDate(end.getDate() - 1)
      break
    case 'annuale':
      end.setFullYear(end.getFullYear() + 1)
      end.setDate(end.getDate() - 1)
      break
  }
  
  end.setHours(23, 59, 59, 999)
  
  return {
    dataInizio: start.toISOString(),
    dataFine: end.toISOString()
  }
}

export function getSavingsGoalProgress(goal: {
  importoTarget: number
  importoCorrente: number
  dataInizio: string
  dataScadenza?: string
}): {
  percentage: number
  remaining: number
  daysRemaining?: number
  isComplete: boolean
  isOverdue: boolean
} {
  const percentage = (goal.importoCorrente / goal.importoTarget) * 100
  const remaining = goal.importoTarget - goal.importoCorrente
  const isComplete = goal.importoCorrente >= goal.importoTarget
  
  let daysRemaining: number | undefined
  let isOverdue = false
  
  if (goal.dataScadenza) {
    const today = new Date()
    const deadline = new Date(goal.dataScadenza)
    const diffTime = deadline.getTime() - today.getTime()
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    isOverdue = daysRemaining < 0 && !isComplete
  }
  
  return {
    percentage: Math.min(percentage, 100),
    remaining: Math.max(remaining, 0),
    daysRemaining,
    isComplete,
    isOverdue
  }
}

export function calculateSavingsProjection(goal: {
  importoTarget: number
  importoCorrente: number
  dataInizio: string
  dataScadenza?: string
}): {
  projectedCompletion?: string
  weeklyRequired: number
  monthlyRequired: number
  onTrack: boolean
} | null {
  if (!goal.dataScadenza) {
    return null
  }
  
  const today = new Date()
  const start = new Date(goal.dataInizio)
  const deadline = new Date(goal.dataScadenza)
  
  const totalDays = (deadline.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const remainingDays = Math.max(0, (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  const remaining = goal.importoTarget - goal.importoCorrente
  
  const weeklyRequired = remainingDays > 0 ? (remaining / remainingDays) * 7 : 0
  const monthlyRequired = remainingDays > 0 ? (remaining / remainingDays) * 30 : 0
  
  const expectedProgress = (elapsedDays / totalDays) * goal.importoTarget
  const actualProgress = goal.importoCorrente
  const onTrack = actualProgress >= expectedProgress * 0.9
  
  let projectedCompletion: string | undefined
  if (goal.importoCorrente > 0 && elapsedDays > 0) {
    const dailyRate = goal.importoCorrente / elapsedDays
    if (dailyRate > 0) {
      const daysToComplete = remaining / dailyRate
      const completionDate = new Date(today.getTime() + daysToComplete * 24 * 60 * 60 * 1000)
      projectedCompletion = completionDate.toISOString()
    }
  }
  
  return {
    projectedCompletion,
    weeklyRequired: Math.max(0, weeklyRequired),
    monthlyRequired: Math.max(0, monthlyRequired),
    onTrack
  }
}
