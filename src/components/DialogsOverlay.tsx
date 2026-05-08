import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useVisibleData } from '@/context/VisibleDataContext'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { calculateAccountBalance, formatCurrency } from '@/lib/helpers'
import { soundSystem } from '@/lib/sound-system'
import { PinDialog } from '@/components/PinDialog'
import { AccountDialog } from '@/components/AccountDialog'
import { TransactionDialog } from '@/components/TransactionDialog'
import { BudgetDialog } from '@/components/BudgetDialog'
import { SavingsGoalDialog } from '@/components/SavingsGoalDialog'
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export function DialogsOverlay() {
  const {
    showTransactionDialog,
    setShowTransactionDialog,
    editingTransaction,
    setEditingTransaction,
    handleSaveTransaction,
    showDeleteDialog,
    setShowDeleteDialog,
    deletingItem,
    setDeletingItem,
    handleDeleteConfirm,
    showAccountDialog,
    setShowAccountDialog,
    editingAccount,
    setEditingAccount,
    handleSaveAccount,
    showBudgetDialog,
    setShowBudgetDialog,
    editingBudget,
    setEditingBudget,
    handleSaveBudget,
    showSavingsGoalDialog,
    setShowSavingsGoalDialog,
    editingSavingsGoal,
    setEditingSavingsGoal,
    handleSaveSavingsGoal,
    showKeyboardHelp,
    setShowKeyboardHelp,
    safeCategories,
  } = useAppData()

  const {
    showPrivatePinDialog,
    setShowPrivatePinDialog,
    unlockPrivate,
  } = useAuth()

  const {
    visibleAccounts,
    visibleTransactions,
    hasPrivateAccount,
    privateAccount,
  } = useVisibleData()

  const screenReader = useScreenReader()

  return (
    <>
      <PinDialog
        open={showPrivatePinDialog}
        title="PIN Conto Privato"
        description="Inserisci il PIN del conto privato per sbloccare i dati protetti."
        onSubmit={async (pin) => {
          await unlockPrivate(pin)
          if (privateAccount) {
            const balance = calculateAccountBalance(privateAccount, visibleTransactions)
            toast.success(`Conto privato sbloccato. Saldo: ${formatCurrency(balance)}`)
            screenReader.announceBalance('Conto privato', balance)
          } else {
            screenReader.announceSuccess('Conto privato sbloccato.')
          }
        }}
        onCancel={() => setShowPrivatePinDialog(false)}
      />

      <AccountDialog
        open={showAccountDialog}
        onClose={() => { setShowAccountDialog(false); setEditingAccount(undefined) }}
        onSave={(account) => { handleSaveAccount(account); setEditingAccount(undefined) }}
        account={editingAccount}
        hasPrivateAccount={hasPrivateAccount && !editingAccount?.isPrivato}
      />

      <TransactionDialog
        open={showTransactionDialog}
        onClose={() => { setShowTransactionDialog(false); setEditingTransaction(undefined) }}
        onSave={async (transaction) => { try { await handleSaveTransaction(transaction) } finally { setEditingTransaction(undefined) } }}
        transaction={editingTransaction}
        accounts={visibleAccounts}
        categories={safeCategories}
      />

      <BudgetDialog
        open={showBudgetDialog}
        onClose={() => { setShowBudgetDialog(false); setEditingBudget(undefined) }}
        onSave={(budget) => { handleSaveBudget(budget); setEditingBudget(undefined) }}
        budget={editingBudget}
        categories={safeCategories}
        accounts={visibleAccounts}
      />

      <SavingsGoalDialog
        open={showSavingsGoalDialog}
        onClose={() => { setShowSavingsGoalDialog(false); setEditingSavingsGoal(undefined) }}
        onSave={(goal) => { handleSaveSavingsGoal(goal); setEditingSavingsGoal(undefined) }}
        goal={editingSavingsGoal}
        accounts={visibleAccounts}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!open) {
          soundSystem.play('dialog-close')
          setDeletingItem(null)
        }
        setShowDeleteDialog(open)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.type === 'account'
                ? 'Eliminando questo conto verranno rimossi anche tutti i movimenti associati. Questa azione non può essere annullata.'
                : deletingItem?.type === 'budget'
                ? 'Questa azione eliminerà definitivamente il budget. Non può essere annullata.'
                : deletingItem?.type === 'savingsGoal'
                ? 'Questa azione eliminerà definitivamente l\'obiettivo di risparmio. Non può essere annullata.'
                : 'Questa azione eliminerà definitivamente il movimento. Non può essere annullata.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => soundSystem.play('dialog-close')}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteConfirm()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <KeyboardShortcutsHelp
        open={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </>
  )
}