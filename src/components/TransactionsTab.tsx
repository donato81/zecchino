import { useMemo, useRef, useCallback, useState, useEffect } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useVisibleData } from '@/context/VisibleDataContext'
import { useListNavigation } from '@/hooks/use-list-navigation'
import { formatCurrency, formatDateShort } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TabsContent } from '@/components/ui/tabs'
import { DownloadSimple, Plus } from '@phosphor-icons/react'
import { TransactionActionMenu } from '@/components/TransactionActionMenu'

export function TransactionsTab() {
  const {
    safeCategories,
    handleExportCSV,
    openNewTransactionDialog,
    openEditTransactionDialog,
    showTransactionDialog,
    setDeletingItem,
    setShowDeleteDialog,
  } = useAppData()

  const { isAuthenticated } = useAuth()

  const { visibleTransactions, visibleAccounts } = useVisibleData()

  const transactionsListContainerRef = useRef<HTMLDivElement>(null)

  const [openMenuIndex, setOpenMenuIndex] = useState<number>(-1)

  useEffect(() => {
    if (openMenuIndex < 0) return
    return () => {
      const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
        `[data-list-item][data-index="${openMenuIndex}"]`
      )
      el?.focus()
    }
  }, [openMenuIndex])

  const sortedTransactions = useMemo(
    () => [...visibleTransactions].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [visibleTransactions]
  )

  const onMenuTransactions = useCallback((index: number) => {
    setOpenMenuIndex(index)
  }, [])

  const onDeleteTransactions = useCallback((index: number) => {
    const transaction = sortedTransactions[index]
    if (transaction) {
      setDeletingItem({ type: 'transaction', id: transaction.id })
      setShowDeleteDialog(true)
    }
  }, [sortedTransactions, setDeletingItem, setShowDeleteDialog])

  const onEditTransactions = useCallback((index: number) => {
    const transaction = sortedTransactions[index]
    if (transaction) {
      openEditTransactionDialog(transaction)
    }
  }, [sortedTransactions, openEditTransactionDialog])

  const allTransactionsNav = useListNavigation({
    itemCount: sortedTransactions.length,
    enabled: isAuthenticated,
    disabled: showTransactionDialog || openMenuIndex >= 0,
    onMenu: onMenuTransactions,
    onDelete: onDeleteTransactions,
    onEdit: onEditTransactions,
    containerRef: transactionsListContainerRef,
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
            onClick={() => openNewTransactionDialog()}
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
        <Badge variant="secondary" className="text-xs" role="note" aria-label="Istruzioni navigazione: freccia su e freccia giù per navigare, Enter o Spazio per aprire il menu azioni, E per modifica diretta, Canc per eliminare, Home e End per primo e ultimo">
          ↑/↓ Naviga · Enter Menu · E Modifica · Del Elimina · Home/End Primo/Ultimo
        </Badge>
      )}

      <Card>
        <CardContent className="p-0" role="region" aria-label="Lista movimenti" aria-live="polite">
          {visibleTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">Nessun movimento da visualizzare</p>
              <Button onClick={() => openNewTransactionDialog()} className="gap-2">
                <Plus size={18} weight="bold" />
                Aggiungi Movimento
              </Button>
            </div>
          ) : (
            <div
              className="divide-y max-h-[600px] overflow-y-auto"
              ref={transactionsListContainerRef}
              tabIndex={allTransactionsNav.focusedIndex < 0 ? 0 : -1}
              onFocus={(e) => {
                if (e.target === e.currentTarget && allTransactionsNav.focusedIndex < 0) {
                  allTransactionsNav.setFocusedIndex(0)
                }
              }}
            >
              {sortedTransactions.map((transaction, index) => {
                const account = visibleAccounts.find(a => a.id === transaction.contoId)
                const destAccount = transaction.contoDestinazioneId
                  ? visibleAccounts.find(a => a.id === transaction.contoDestinazioneId)
                  : null
                const category = safeCategories.find(c => c.id === transaction.categoriaId)
                const isIncome = transaction.tipo === 'entrata'
                const isTransfer = transaction.tipo === 'trasferimento'
                const isFocused = allTransactionsNav.isFocused(index)

                const rawDesc = transaction.descrizione || category?.nome || 'Movimento'
                const shortDesc = rawDesc.length > 30 ? rawDesc.slice(0, 30) + '…' : rawDesc
                const shortAccount = isTransfer
                  ? 'Trasferimento'
                  : (account?.nome ?? '').length > 15
                    ? (account?.nome ?? '').slice(0, 15) + '…'
                    : (account?.nome ?? '')

                return (
                  <div
                    key={transaction.id}
                    className={`px-4 py-3 flex items-center gap-3 transition-all focus:outline-none ${
                      isFocused
                        ? 'bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => allTransactionsNav.setFocusedIndex(index)}
                    data-focus-info={`Movimento: ${rawDesc} - ${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'} ${formatCurrency(transaction.importo)} - Premi Enter per il menu azioni`}
                    tabIndex={isFocused ? 0 : -1}
                    role="button"
                    data-list-item
                    data-index={index}
                    aria-label={`${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'}: ${rawDesc}, ${formatCurrency(transaction.importo)}, ${formatDateShort(transaction.data)}, ${isTransfer ? 'Trasferimento' : account?.nome || ''}`}
                  >
                    <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDateShort(transaction.data)}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm">
                      {shortDesc}
                    </span>
                    <span className={`shrink-0 text-sm font-mono font-semibold ${isIncome ? 'text-income' : isTransfer ? 'text-accent' : 'text-expense'}`}>
                      {isIncome ? '+' : isTransfer ? '→' : '-'}{formatCurrency(transaction.importo)}
                    </span>
                    <span className="w-24 shrink-0 truncate text-xs text-muted-foreground text-right">
                      {shortAccount}
                    </span>
                    <TransactionActionMenu
                      isOpen={openMenuIndex === index}
                      onOpenChange={(open) => setOpenMenuIndex(open ? index : -1)}
                      onEdit={() => openEditTransactionDialog(transaction)}
                      onDelete={() => {
                        setDeletingItem({ type: 'transaction', id: transaction.id })
                        setShowDeleteDialog(true)
                      }}
                      onFocusReturn={() => {
                        const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
                          `[data-list-item][data-index="${index}"]`
                        )
                        el?.focus()
                      }}
                    />
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
