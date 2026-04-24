import { useRef, useCallback } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useVisibleData } from '@/hooks/use-visible-data'
import { useIsMobile } from '@/hooks/use-mobile'
import { useListNavigation } from '@/hooks/use-list-navigation'
import { calculateAccountBalance, formatCurrency } from '@/lib/helpers'
import { ACCOUNT_CATEGORIES } from '@/lib/constants'
import type { AccountCategoryInfo } from '@/lib/constants'
import type { Account } from '@/lib/types'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { AccountCard } from '@/components/AccountCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, EyeSlash, Eye, LockOpen, PencilSimple, Trash } from '@phosphor-icons/react'

export function DashboardTab() {
  const {
    safeCategories,
    setEditingTransaction,
    setShowTransactionDialog,
    setDeletingItem,
    setShowDeleteDialog,
    setEditingAccount,
    setShowAccountDialog,
    toggleCategoryVisibility,
    toggleAllCategories,
    setVisibleCategories,
    visibleCategories,
  } = useAppData()

  const {
    isAuthenticated,
    isPrivateUnlocked,
    setShowPrivatePinDialog,
  } = useAuth()

  const {
    visibleAccounts,
    visibleTransactions,
    recentTransactions,
    groupedAccounts,
    filteredGroupedAccounts,
    allCategoriesVisible,
    hasPrivateAccount,
  } = useVisibleData()

  const isMobile = useIsMobile()

  const recentListContainerRef = useRef<HTMLDivElement>(null)

  type FullAccountGroup = AccountCategoryInfo & { accounts: Account[] }
  const typedGroupedAccounts = groupedAccounts as unknown as FullAccountGroup[]
  const typedFilteredGroupedAccounts = filteredGroupedAccounts as unknown as FullAccountGroup[]

  const onEnterRecent = useCallback((index: number) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  }, [recentTransactions, setEditingTransaction, setShowTransactionDialog])

  const onDeleteRecent = useCallback((index: number) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      setDeletingItem({ type: 'transaction', id: transaction.id })
      setShowDeleteDialog(true)
    }
  }, [recentTransactions, setDeletingItem, setShowDeleteDialog])

  const onEditRecent = useCallback((index: number) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  }, [recentTransactions, setEditingTransaction, setShowTransactionDialog])

  const recentTransactionsNav = useListNavigation({
    itemCount: recentTransactions.length,
    enabled: isAuthenticated,
    onEnter: onEnterRecent,
    onDelete: onDeleteRecent,
    onEdit: onEditRecent,
    containerRef: recentListContainerRef,
  })

  return (
    <TabsContent value="dashboard" className="space-y-4 sm:space-y-6" id="dashboard-panel" role="tabpanel" aria-labelledby="dashboard-tab">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center">
          <h2 className="text-xl sm:text-2xl font-semibold">I Tuoi Conti</h2>
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Azioni rapide conti e movimenti">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    soundSystem.play('dialog-open')
                    hapticSystem.dialogOpen()
                    setEditingTransaction(undefined)
                    setShowTransactionDialog(true)
                  }}
                  className={`gap-2 flex-1 sm:flex-none ${isMobile ? 'min-h-[48px] text-base' : ''}`}
                  aria-label="Aggiungi nuovo movimento. Apre finestra di dialogo per inserire entrata, uscita o trasferimento. Scorciatoia tastiera: Control più N"
                  data-focus-info="Aggiungi nuovo movimento (Ctrl+N)"
                >
                  <Plus size={isMobile ? 22 : 18} weight="bold" aria-hidden="true" />
                  <span>Movimento</span>
                  {!isMobile && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 bg-primary-foreground/20 hidden sm:inline-flex" aria-hidden="true">Ctrl+N</Badge>}
                </Button>
              </TooltipTrigger>
              {!isMobile && (
                <TooltipContent variant="accent">
                  <div className="space-y-0.5">
                    <p className="font-semibold">Nuovo Movimento</p>
                    <p className="text-xs opacity-90">Aggiungi entrata, uscita o trasferimento (Ctrl+N)</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    soundSystem.play('dialog-open')
                    hapticSystem.dialogOpen()
                    setEditingAccount(undefined)
                    setShowAccountDialog(true)
                  }}
                  variant="outline"
                  className={`gap-2 flex-1 sm:flex-none ${isMobile ? 'min-h-[48px] text-base' : ''}`}
                  aria-label="Aggiungi nuovo conto. Apre finestra di dialogo per creare conto bancario, digitale, risparmio o investimenti. Scorciatoia tastiera: Control più M"
                  data-focus-info="Aggiungi nuovo conto (Ctrl+M)"
                >
                  <Plus size={isMobile ? 22 : 18} weight="bold" aria-hidden="true" />
                  <span>Conto</span>
                  {!isMobile && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden sm:inline-flex" aria-hidden="true">Ctrl+M</Badge>}
                </Button>
              </TooltipTrigger>
              {!isMobile && (
                <TooltipContent variant="secondary">
                  <div className="space-y-0.5">
                    <p className="font-semibold">Nuovo Conto</p>
                    <p className="text-xs opacity-90">Aggiungi bancario, digitale, risparmio o investimenti (Ctrl+M)</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
            {hasPrivateAccount && !isPrivateUnlocked && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => {
                      soundSystem.play('dialog-open')
                      hapticSystem.dialogOpen()
                      setShowPrivatePinDialog(true)
                    }}
                    variant="secondary"
                    className={`gap-2 w-full sm:w-auto ${isMobile ? 'min-h-[48px] text-base' : ''}`}
                    aria-label="Sblocca conto privato. Richiede inserimento PIN privato per accedere ai conti protetti. Scorciatoia tastiera: Control più U"
                    data-focus-info="Sblocca conto privato (Ctrl+U)"
                  >
                    <LockOpen size={isMobile ? 22 : 18} weight="duotone" aria-hidden="true" />
                    <span>Sblocca Privato</span>
                    {!isMobile && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1 hidden sm:inline-flex" aria-hidden="true">Ctrl+U</Badge>}
                  </Button>
                </TooltipTrigger>
                {!isMobile && (
                  <TooltipContent variant="private">
                    <div className="space-y-0.5">
                      <p className="font-semibold">Sblocca Conto Privato</p>
                      <p className="text-xs opacity-90">Inserisci PIN per accedere ai conti protetti (Ctrl+U)</p>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {visibleAccounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">Nessun conto disponibile</p>
            <Button onClick={() => setShowAccountDialog(true)} className="gap-2">
              <Plus size={18} weight="bold" />
              Crea il Primo Conto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedAccounts.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground self-center mr-2">Filtra categorie:</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={toggleAllCategories}
                    variant={allCategoriesVisible ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2"
                    aria-label={allCategoriesVisible ? 'Nascondi tutte le categorie' : 'Mostra tutte le categorie'}
                    data-focus-info={`${allCategoriesVisible ? 'Nascondi' : 'Mostra'} tutte le categorie (Ctrl+A)`}
                  >
                    {allCategoriesVisible ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
                    <span className="text-xs font-medium">{allCategoriesVisible ? 'Nascondi tutto' : 'Mostra tutto'}</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 hidden sm:inline-flex">Ctrl+A</Badge>
                  </Button>
                </TooltipTrigger>
                <TooltipContent variant={allCategoriesVisible ? 'muted' : 'accent'}>
                  <div className="space-y-0.5">
                    <p className="font-semibold">{allCategoriesVisible ? 'Nascondi Tutte le Categorie' : 'Mostra Tutte le Categorie'}</p>
                    <p className="text-xs opacity-90">Toggle visibilità di tutte le categorie (Ctrl+A)</p>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-6" />
              {typedGroupedAccounts.map((category, index) => {
                const isActive = (visibleCategories || []).includes(category.id)
                const keyNumber = index + 1
                return (
                  <Tooltip key={category.id}>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => toggleCategoryVisibility(category.id)}
                        variant={isActive ? category.badgeVariant : 'outline'}
                        size="sm"
                        className="gap-2"
                        data-focus-info={`Filtra ${category.label} (${category.accounts.length} conti) - Tasto ${keyNumber}`}
                      >
                        <Badge variant={category.badgeVariant} className="text-xs px-0 border-0 bg-transparent">
                          {category.label}
                        </Badge>
                        <span className="text-xs">({category.accounts.length})</span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 hidden sm:inline-flex">{keyNumber}</Badge>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent variant={category.id as any}>
                      <div className="space-y-0.5">
                        <p className="font-semibold">{category.label}</p>
                        <p className="text-xs opacity-90">{category.description}</p>
                        <p className="text-xs opacity-75 mt-1">{category.accounts.length} {category.accounts.length === 1 ? 'conto' : 'conti'} • Tasto {keyNumber}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          )}

          {filteredGroupedAccounts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-4">Nessun conto da visualizzare con i filtri selezionati</p>
                <Button
                  onClick={() => setVisibleCategories(ACCOUNT_CATEGORIES.map(c => c.id))}
                  variant="outline"
                >
                  Mostra Tutti i Conti
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {typedFilteredGroupedAccounts.map(group => (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={group.badgeVariant}>
                      {group.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {group.description}
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {group.accounts.map(account => {
                      const balance = calculateAccountBalance(account, visibleTransactions)
                      return (
                        <AccountCard
                          key={account.id}
                          account={account}
                          balance={balance}
                          onClick={() => {
                            soundSystem.play('dialog-open')
                            hapticSystem.dialogOpen()
                            setEditingAccount(account)
                            setShowAccountDialog(true)
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Movimenti Recenti</h3>
          {recentTransactions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              ↑/↓ Naviga · Enter Modifica · E Modifica · Del Elimina
            </Badge>
          )}
        </div>
        {recentTransactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">Nessun movimento registrato</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y" ref={recentListContainerRef}>
                {recentTransactions.map((transaction, index) => {
                  const account = visibleAccounts.find(a => a.id === transaction.contoId)
                  const category = safeCategories.find(c => c.id === transaction.categoriaId)
                  const isIncome = transaction.tipo === 'entrata'
                  const isTransfer = transaction.tipo === 'trasferimento'
                  const isFocused = recentTransactionsNav.isFocused(index)

                  return (
                    <div
                      key={transaction.id}
                      className={`p-4 flex items-center justify-between transition-all focus:outline-none ${
                        isFocused
                          ? 'bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => recentTransactionsNav.setFocusedIndex(index)}
                       onKeyDown={(event) => {
                         if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                           event.preventDefault()
                           recentTransactionsNav.setFocusedIndex(index)
                         }
                       }}
                      data-focus-info={`Movimento: ${transaction.descrizione || category?.nome} - ${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'} ${formatCurrency(transaction.importo)} - Premi Enter per modificare`}
                      tabIndex={isFocused ? 0 : -1}
                      role="button"
                      data-list-item
                      data-index={index}
                      aria-label={`${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'}: ${transaction.descrizione || category?.nome || 'Movimento'}, ${formatCurrency(transaction.importo)}, ${new Date(transaction.data).toLocaleDateString('it-IT')}, ${account?.nome || ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {transaction.descrizione || category?.nome || 'Movimento'}
                          </p>
                          {transaction.ricorrente && (
                            <Badge variant="outline" className="text-xs">Ricorrente</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{new Date(transaction.data).toLocaleDateString('it-IT')}</span>
                          <span>•</span>
                          <span>{account?.nome}</span>
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
            </CardContent>
          </Card>
        )}
      </div>
    </TabsContent>
  )
}
