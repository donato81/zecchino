import { BudgetPeriod } from './types'
import { ShoppingCart, ForkKnife, Car, House, FilmSlate, Heartbeat, GraduationCap, PawPrint, TShirt, DeviceMobile } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

export interface BudgetTemplate {
  id: string
  nome: string
  descrizione: string
  importoSuggerito: number
  periodo: BudgetPeriod
  categorieTarget: string[]
  icon: Icon
  color: string
}

export const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: 'spesa-mensile',
    nome: 'Spesa Alimentare',
    descrizione: 'Budget mensile per supermercato e alimentari',
    importoSuggerito: 400,
    periodo: 'mensile',
    categorieTarget: ['Spesa alimentare'],
    icon: ShoppingCart,
    color: 'oklch(0.65 0.15 140)'
  },
  {
    id: 'ristoranti',
    nome: 'Ristoranti e Bar',
    descrizione: 'Budget mensile per pasti fuori e caffè',
    importoSuggerito: 200,
    periodo: 'mensile',
    categorieTarget: ['Ristorante/Bar'],
    icon: ForkKnife,
    color: 'oklch(0.70 0.15 45)'
  },
  {
    id: 'trasporti',
    nome: 'Trasporti',
    descrizione: 'Budget mensile per benzina, mezzi pubblici e parcheggi',
    importoSuggerito: 150,
    periodo: 'mensile',
    categorieTarget: ['Trasporti'],
    icon: Car,
    color: 'oklch(0.60 0.15 230)'
  },
  {
    id: 'casa',
    nome: 'Casa e Bollette',
    descrizione: 'Budget mensile per affitto, mutuo e utenze',
    importoSuggerito: 800,
    periodo: 'mensile',
    categorieTarget: ['Affitto/Mutuo', 'Bollette'],
    icon: House,
    color: 'oklch(0.55 0.12 30)'
  },
  {
    id: 'svago',
    nome: 'Svago e Intrattenimento',
    descrizione: 'Budget mensile per cinema, eventi e hobby',
    importoSuggerito: 100,
    periodo: 'mensile',
    categorieTarget: ['Svago/Intrattenimento'],
    icon: FilmSlate,
    color: 'oklch(0.68 0.18 300)'
  },
  {
    id: 'salute',
    nome: 'Salute e Benessere',
    descrizione: 'Budget mensile per farmacia, visite mediche e palestra',
    importoSuggerito: 100,
    periodo: 'mensile',
    categorieTarget: ['Salute/Farmacia'],
    icon: Heartbeat,
    color: 'oklch(0.65 0.15 25)'
  },
  {
    id: 'abbonamenti',
    nome: 'Abbonamenti',
    descrizione: 'Budget mensile per streaming, software e servizi',
    importoSuggerito: 50,
    periodo: 'mensile',
    categorieTarget: ['Abbonamenti'],
    icon: DeviceMobile,
    color: 'oklch(0.58 0.15 280)'
  },
  {
    id: 'abbigliamento',
    nome: 'Abbigliamento',
    descrizione: 'Budget trimestrale per vestiti e accessori',
    importoSuggerito: 300,
    periodo: 'trimestrale',
    categorieTarget: ['Abbigliamento'],
    icon: TShirt,
    color: 'oklch(0.62 0.12 320)'
  },
  {
    id: 'istruzione',
    nome: 'Istruzione e Formazione',
    descrizione: 'Budget annuale per corsi, libri e materiali didattici',
    importoSuggerito: 500,
    periodo: 'annuale',
    categorieTarget: ['Istruzione'],
    icon: GraduationCap,
    color: 'oklch(0.55 0.15 250)'
  },
  {
    id: 'animali',
    nome: 'Animali Domestici',
    descrizione: 'Budget mensile per cibo, cure veterinarie e accessori',
    importoSuggerito: 80,
    periodo: 'mensile',
    categorieTarget: ['Animali'],
    icon: PawPrint,
    color: 'oklch(0.70 0.14 60)'
  },
  {
    id: 'budget-totale',
    nome: 'Budget Totale Mensile',
    descrizione: 'Budget complessivo per tutte le spese del mese',
    importoSuggerito: 2000,
    periodo: 'mensile',
    categorieTarget: [],
    icon: ShoppingCart,
    color: 'oklch(0.35 0.08 250)'
  }
]

export function findTemplateCategories(template: BudgetTemplate, availableCategories: Array<{ id: string; nome: string }>): string[] {
  return availableCategories
    .filter(cat => template.categorieTarget.includes(cat.nome))
    .map(cat => cat.id)
}
