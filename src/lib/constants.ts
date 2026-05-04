import { AccountType } from './types'
import { Bank, CreditCard, Money, PiggyBank, Lock, TrendUp, Wallet, CurrencyBtc, Coins } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

export type AccountCategory = 'banking' | 'digital' | 'savings' | 'investments' | 'private'

export interface AccountCategoryInfo {
  id: AccountCategory
  label: string
  description: string
  types: AccountType[]
  color: string
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive'
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bancario: 'Conto Bancario',
  prepagata: 'Carta Prepagata',
  contanti: 'Contanti',
  salvadanaio: 'Salvadanaio',
  privato: 'Conto Privato',
  investimenti: 'Investimenti',
  credito: 'Carta di Credito',
  paypal: 'PayPal',
  crypto: 'Crypto Wallet',
  pensione: 'Fondo Pensione'
}

export const ACCOUNT_TYPE_DESCRIPTIONS: Record<AccountType, string> = {
  bancario: 'Conto corrente tradizionale',
  prepagata: 'Postepay, Revolut, N26',
  contanti: 'Portafoglio fisico',
  salvadanaio: 'Riserva e risparmio',
  privato: 'Protetto con PIN',
  investimenti: 'Azioni, fondi, ETF',
  credito: 'Carte di credito',
  paypal: 'Saldo PayPal',
  crypto: 'Bitcoin, Ethereum',
  pensione: 'Previdenza integrativa'
}

export const ACCOUNT_TYPE_ICONS: Record<AccountType, Icon> = {
  bancario: Bank,
  prepagata: CreditCard,
  contanti: Money,
  salvadanaio: PiggyBank,
  privato: Lock,
  investimenti: TrendUp,
  credito: CreditCard,
  paypal: Wallet,
  crypto: CurrencyBtc,
  pensione: Coins
}

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  entrata: 'Entrata',
  uscita: 'Uscita',
  trasferimento: 'Trasferimento'
}

export const RECURRENCE_LABELS: Record<string, string> = {
  giornaliero: 'Giornaliero',
  settimanale: 'Settimanale',
  mensile: 'Mensile',
  annuale: 'Annuale'
}

export const ACCOUNT_CATEGORIES: AccountCategoryInfo[] = [
  {
    id: 'banking',
    label: 'Bancari',
    description: 'Conti correnti e carte tradizionali',
    types: ['bancario', 'credito'],
    color: 'oklch(0.35 0.08 250)',
    badgeVariant: 'default'
  },
  {
    id: 'digital',
    label: 'Digitali',
    description: 'Portafogli digitali e prepagate',
    types: ['prepagata', 'paypal'],
    color: 'oklch(0.65 0.15 190)',
    badgeVariant: 'secondary'
  },
  {
    id: 'savings',
    label: 'Risparmio',
    description: 'Fondi e riserve',
    types: ['contanti', 'salvadanaio'],
    color: 'oklch(0.75 0.12 85)',
    badgeVariant: 'outline'
  },
  {
    id: 'investments',
    label: 'Investimenti',
    description: 'Portafogli e fondi',
    types: ['investimenti', 'crypto', 'pensione'],
    color: 'oklch(0.55 0.18 140)',
    badgeVariant: 'outline'
  },
  {
    id: 'private',
    label: 'Privato',
    description: 'Conti protetti',
    types: ['privato'],
    color: 'oklch(0.55 0.15 25)',
    badgeVariant: 'destructive'
  }
]

export const ACCOUNT_TYPE_TO_CATEGORY: Record<AccountType, AccountCategory> = {
  bancario: 'banking',
  credito: 'banking',
  prepagata: 'digital',
  paypal: 'digital',
  contanti: 'savings',
  salvadanaio: 'savings',
  investimenti: 'investments',
  crypto: 'investments',
  pensione: 'investments',
  privato: 'private'
}
