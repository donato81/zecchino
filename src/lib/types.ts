export type AccountType = 'bancario' | 'prepagata' | 'contanti' | 'salvadanaio' | 'privato' | 'investimenti' | 'credito' | 'paypal' | 'crypto' | 'pensione'

export type TransactionType = 'entrata' | 'uscita' | 'trasferimento'

export type RecurrenceFrequency = 'giornaliero' | 'settimanale' | 'mensile' | 'annuale'

export type CategoryType = 'entrata' | 'uscita'

export interface Account {
  id: string
  nome: string
  tipo: AccountType
  saldoIniziale: number
  valuta: string
  isPrivato: boolean
  dataCreazione: string
}

export interface Transaction {
  id: string
  data: string
  importo: number
  tipo: TransactionType
  contoId: string
  contoDestinazioneId?: string
  categoriaId: string
  descrizione: string
  ricorrente: boolean
  frequenzaRicorrenza?: RecurrenceFrequency
  cifrato: boolean
}

export type TransactionInput = Omit<Transaction, 'cifrato'>

export interface Category {
  id: string
  nome: string
  tipo: CategoryType
  predefinita: boolean
}

export type BudgetPeriod = 'mensile' | 'trimestrale' | 'annuale'

export interface Budget {
  id: string
  nome: string
  importoTarget: number
  periodo: BudgetPeriod
  categoriaId?: string
  contoId?: string
  dataInizio: string
  dataFine: string
  attivo: boolean
}

export interface SavingsGoal {
  id: string
  nome: string
  descrizione: string
  importoTarget: number
  importoCorrente: number
  dataInizio: string
  dataScadenza?: string
  contoAssociato?: string
  colore: string
  icona: string
  completato: boolean
  dataCompletamento?: string
}

export type AccountGroup = {
  id: string
  label: string
  accounts: Account[]
}

export interface AppState {
  isAuthenticated: boolean
  isPrivateUnlocked: boolean
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  savingsGoals: SavingsGoal[]
  globalPinHash: string
  privatePinHash: string
}
