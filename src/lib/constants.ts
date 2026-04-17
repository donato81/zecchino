import { Category } from './types'

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { nome: 'Stipendio', tipo: 'entrata', predefinita: true },
  { nome: 'Freelance', tipo: 'entrata', predefinita: true },
  { nome: 'Rimborso', tipo: 'entrata', predefinita: true },
  { nome: 'Regalo', tipo: 'entrata', predefinita: true },
  { nome: 'Rendita', tipo: 'entrata', predefinita: true },
  { nome: 'Altro (entrata)', tipo: 'entrata', predefinita: true },
  
  { nome: 'Spesa alimentare', tipo: 'uscita', predefinita: true },
  { nome: 'Ristorante/Bar', tipo: 'uscita', predefinita: true },
  { nome: 'Bollette', tipo: 'uscita', predefinita: true },
  { nome: 'Affitto/Mutuo', tipo: 'uscita', predefinita: true },
  { nome: 'Trasporti', tipo: 'uscita', predefinita: true },
  { nome: 'Salute/Farmacia', tipo: 'uscita', predefinita: true },
  { nome: 'Abbigliamento', tipo: 'uscita', predefinita: true },
  { nome: 'Svago/Intrattenimento', tipo: 'uscita', predefinita: true },
  { nome: 'Abbonamenti', tipo: 'uscita', predefinita: true },
  { nome: 'Istruzione', tipo: 'uscita', predefinita: true },
  { nome: 'Animali', tipo: 'uscita', predefinita: true },
  { nome: 'Altro (uscita)', tipo: 'uscita', predefinita: true },
]

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
