import { useMemo } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useVisibleData } from '@/hooks/use-visible-data'
import { useIsMobile } from '@/hooks/use-mobile'
import { useListNavigation } from '@/hooks/use-list-navigation'
import { formatCurrency } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TabsContent } from '@/components/ui/tabs'
import { DownloadSimple, Plus, PencilSimple, Trash } from '@phosphor-icons/react'

export function TransactionsTab() {
  const {
    safeCategories,
    handleExportCSV,
    setEditingTransaction,
    setShowTransactionDialog,
    setDeletingItem,
    setShowDeleteDialog,
  } = useAppData()

  const { isAuthenticated } = useAuth()

  const { visibleTransactions, visibleAccounts } = useVisibleData()

  const isMobile = useIsMobile()

  const sortedTransactions = useMemo(
    () => [...visibleTransactions].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [visibleTransactions]
  )

  const allTransactionsNav = useListNavigation({
    itemCount: sortedTransactions.length,
    enabled: isAuthenticated,
    onEnter: (index) => {
      const transaction = sortedTransactions[index]
      if (transaction) {
        setEditingTransaction(transaction)
        setShowTransactionDialog(true)
      }
    },
    onDelete: (index) => {
      const transaction = sortedTransactions[index]
      if (transaction) {
        setDeletingItem({ type: 'transaction', id: transaction.id })
        setShowDeleteDialog(true)
      }
    },
    onEdit: (index) => {
      const transaction = sortedTransactions[index]
      if (transaction) {
        setEditingTransaction(transaction)
        setShowTransactionDialog(true)
      }
    },
  })

  return (
    <TabsContent value="transactions" className="space-y-6" id="transactions-panel" role="tabpanel" aria-labelledby="transactions-tab">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Tutti i Movimenti</h2>
        <div className="flex gap-2" role="group" aria-label="Azioni movimenti">
          <Button
            onClick={() => handleExportCSV(visibleTransactions, visibleAccounts)}
            variant="outline"
            className="gap-2"
            data-focus-info="Esporta movimenti in formato CSV (Ctrl+E)"
            aria-label="Esporta movimenti in formato CSV. Scorciatoia: Control più E"
          >
            <DownloadSimple size={18} weight="duotone" aria-hidden="true" />
            Esporta CSV
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden sm:inline-flex" aria-hidden="true">Ctrl+E</Badge>
          </Button>
          <Button
            onClick={() => { setEditingTransaction(undefined); setShowTransactionDialog(true) }}
            className="gap-2"
            data-focus-info="Aggiungi nuovo movimento (Ctrl+N)"
            aria-label="Aggiungi nuovo movimento. Scorciatoia: Control più N"
          >
            <Plus size={18} weight="bold" aria-hidden="true" />
            Nuovo Movimento
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 bg-primary-foreground/20 hidden sm:inline-flex" aria-hidden="true">Ctrl+N</Badge>
          </Button>
        </div>
      </div>

      {visibleTransactions.length > 0 && (
        <Badge variant="secondary" className="text-xs" role="note" aria-label="Istruzioni navigazione: freccia su e freccia giù per navigare, Enter o E per modificare, Canc per eliminare, Home e End per primo e ultimo">
          ↑/↓ Naviga · Enter Modifica · E Modifica · Del Elimina · Home/End Primo/Ultimo
        </Badge>
      )}

      <Card>
        <CardContent className="p-0" role="region" aria-label="Lista movimenti" aria-live="polite">
          {visibleTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">Nessun movimento da visualizzare</p>
              <Button onClick={() => setShowTransactionDialog(true)} className="gap-2">
                <Plus size={18} weight="bold" />
                Aggiungi Movimento
              </Button>
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {sortedTransactions.map((transaction, index) => {
                const account = visibleAccounts.find(a => a.id === transaction.contoId)
                const destAccount = transaction.contoDestinazioneId
                  ? visibleAccounts.find(a => a.id === transaction.contoDestinazioneId)
                  : null
                const category = safeCategories.find(c => c.id === transaction.categoriaId)
                const isIncome = transaction.tipo === 'entrata'
                const isTransfer = transaction.tipo === 'trasferimento'
                const isFocused = allTransactionsNav.isFocused(index)

                return (
                  <div
                    key={transaction.id}
                    className={`p-4 flex items-center justify-between transition-all ${
                      isFocused
                        ? 'bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => allTransactionsNav.setFocusedIndex(index)}
                    data-focus-info={`Movimento: ${transaction.descrizione || category?.nome} - ${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'} ${formatCurrency(transaction.importo)} - Premi Enter per modificare`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {transaction.descrizione || category?.nome || 'Movimento'}
                        </p>
                        {transaction.ricorrente && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.frequenzaRicorrenza}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <span>{new Date(transaction.data).toLocaleDateString('it-IT')}</span>
                        <span>•</span>
                        <span>{account?.nome}</span>
                        {isTransfer && destAccount && (
                          <>
                            <span>→</span>
                            <span>{destAccount.nome}</span>
                          </>
                        )}
                        {category && (
                          <>
                            <span>•</span>
                            <span>{category.nome}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`text-lg font-mono font-semibold ${isIncome ? 'text-income' : isTransfer ? 'text-accent' : 'text-expense'}`}>
                        {isIncome ? '+' : isTransfer ? '→' : '-'}{formatCurrency(transaction.importo)}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingTransaction(transaction)
                            setShowTransactionDialog(true)
                          }}
                          aria-label="Modifica movimento"
                        >
                          <PencilSimple size={18} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingItem({ type: 'transaction', id: transaction.id })
                            setShowDeleteDialog(true)
                          }}
                          aria-label="Elimina movimento"
                        >
                          <Trash size={18} />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  )
}
