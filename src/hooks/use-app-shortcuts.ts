import { useMemo } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useVisibleData } from '@/context/VisibleDataContext'
import { useUserSettings } from '@/context/UserSettingsContext'
import { ACCOUNT_CATEGORIES } from '@/lib/constants'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { soundSystem } from '@/lib/sound-system'
import { toast } from 'sonner'
import type { Transaction, Account } from '@/lib/types'

export interface AppShortcutsOptions {
  activeTab: string
  setActiveTab: (tab: string) => void
  setShowTransactionDialog: (v: boolean) => void
  setShowAccountDialog: (v: boolean) => void
  setShowKeyboardHelp: (v: boolean) => void
  setEditingTransaction: (t: Transaction | undefined) => void
  setEditingAccount: (a: Account | undefined) => void
}

export function useAppShortcuts(options: AppShortcutsOptions): void {
  const {
    activeTab,
    setActiveTab,
    setShowTransactionDialog,
    setShowAccountDialog,
    setShowKeyboardHelp,
    setEditingTransaction,
    setEditingAccount,
  } = options

  const {
    handleExportCSV,
  } = useAppData()

  const { visibleCategories, setVisibleCategories } = useUserSettings()

  const {
    isAuthenticated,
    isPrivateUnlocked,
    setShowPrivatePinDialog,
  } = useAuth()

  const {
    allCategoriesVisible,
    hasPrivateAccount,
    visibleTransactions,
    visibleAccounts,
  } = useVisibleData()

  const shortcuts = useMemo(() => [
    {
      key: '1',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          const newIds = visibleCategories.includes('banking')
            ? visibleCategories.filter(id => id !== 'banking')
            : [...visibleCategories, 'banking']
          setVisibleCategories(newIds).catch(console.error)
          soundSystem.play('click')
          toast.success('Filtro Bancari attivato/disattivato')
        }
      },
      description: 'Toggle Banking category'
    },
    {
      key: '2',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          const newIds = visibleCategories.includes('digital')
            ? visibleCategories.filter(id => id !== 'digital')
            : [...visibleCategories, 'digital']
          setVisibleCategories(newIds).catch(console.error)
          soundSystem.play('click')
          toast.success('Filtro Digitali attivato/disattivato')
        }
      },
      description: 'Toggle Digital category'
    },
    {
      key: '3',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          const newIds = visibleCategories.includes('savings')
            ? visibleCategories.filter(id => id !== 'savings')
            : [...visibleCategories, 'savings']
          setVisibleCategories(newIds).catch(console.error)
          soundSystem.play('click')
          toast.success('Filtro Risparmio attivato/disattivato')
        }
      },
      description: 'Toggle Savings category'
    },
    {
      key: '4',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          const newIds = visibleCategories.includes('investments')
            ? visibleCategories.filter(id => id !== 'investments')
            : [...visibleCategories, 'investments']
          setVisibleCategories(newIds).catch(console.error)
          soundSystem.play('click')
          toast.success('Filtro Investimenti attivato/disattivato')
        }
      },
      description: 'Toggle Investments category'
    },
    {
      key: '5',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          const newIds = visibleCategories.includes('private')
            ? visibleCategories.filter(id => id !== 'private')
            : [...visibleCategories, 'private']
          setVisibleCategories(newIds).catch(console.error)
          soundSystem.play('click')
          toast.success('Filtro Privato attivato/disattivato')
        }
      },
      description: 'Toggle Private category'
    },
    {
      key: 'a',
      ctrl: true,
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          const allIds = ACCOUNT_CATEGORIES.map(c => c.id)
          const newIds = visibleCategories.length === allIds.length ? [] : allIds
          setVisibleCategories(newIds).catch(console.error)
          soundSystem.play('click')
          toast.success(allCategoriesVisible ? 'Tutti i filtri nascosti' : 'Tutti i filtri attivati')
        }
      },
      description: 'Toggle all categories'
    },
    {
      key: 'm',
      ctrl: true,
      callback: () => {
        if (isAuthenticated) {
          setEditingTransaction(undefined)
          setShowTransactionDialog(true)
          soundSystem.play('click')
          toast.success('Nuovo movimento')
        }
      },
      description: 'New transaction'
    },
    {
      key: 'b',
      ctrl: true,
      callback: () => {
        if (isAuthenticated) {
          setEditingAccount(undefined)
          setShowAccountDialog(true)
          soundSystem.play('click')
          toast.success('Nuovo conto')
        }
      },
      description: 'New account'
    },
    {
      key: 'd',
      ctrl: true,
      callback: () => {
        if (isAuthenticated) {
          setActiveTab('dashboard')
          soundSystem.play('navigation')
          toast.success('Dashboard')
        }
      },
      description: 'Navigate to Dashboard'
    },
    {
      key: 't',
      ctrl: true,
      callback: () => {
        if (isAuthenticated) {
          setActiveTab('transactions')
          soundSystem.play('navigation')
          toast.success('Movimenti')
        }
      },
      description: 'Navigate to Transactions'
    },
    {
      key: 'r',
      ctrl: true,
      callback: () => {
        if (isAuthenticated) {
          setActiveTab('reports')
          soundSystem.play('navigation')
          toast.success('Report')
        }
      },
      description: 'Navigate to Reports'
    },
    {
      key: 'e',
      ctrl: true,
      callback: () => {
        if (isAuthenticated && activeTab === 'transactions') {
          handleExportCSV(visibleTransactions, visibleAccounts)
        }
      },
      description: 'Export CSV'
    },
    {
      key: 'u',
      ctrl: true,
      callback: () => {
        if (isAuthenticated && hasPrivateAccount && !isPrivateUnlocked) {
          setShowPrivatePinDialog(true)
          soundSystem.play('click')
          toast.success('Sblocca conto privato')
        }
      },
      description: 'Unlock private account'
    },
    {
      key: '?',
      shift: true,
      callback: () => {
        if (isAuthenticated) {
          setShowKeyboardHelp(true)
          soundSystem.play('notification')
        }
      },
      description: 'Show keyboard shortcuts help'
    },
  ], [
    isAuthenticated,
    activeTab,
    allCategoriesVisible,
    hasPrivateAccount,
    isPrivateUnlocked,
    visibleCategories,
    visibleTransactions,
    visibleAccounts,
    setVisibleCategories,
    handleExportCSV,
    setShowPrivatePinDialog,
    setActiveTab,
    setShowTransactionDialog,
    setShowAccountDialog,
    setShowKeyboardHelp,
    setEditingTransaction,
    setEditingAccount,
  ])

  useKeyboardShortcuts(shortcuts, isAuthenticated)
}
