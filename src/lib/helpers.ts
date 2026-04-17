import { Account, Transaction } from './types'

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
