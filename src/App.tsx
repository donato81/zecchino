import { useState, useEffect, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Account, Transaction, Category } from '@/lib/types'
import { hashPin, verifyPin } from '@/lib/crypto'
import { DEFAULT_CATEGORIES, ACCOUNT_CATEGORIES, ACCOUNT_TYPE_TO_CATEGORY } from '@/lib/constants'
import { generateId, calculateAccountBalance, getTotalBalance, formatCurrency, exportToCSV, downloadFile } from '@/lib/helpers'
import { PinDialog } from '@/components/PinDialog'
import { AccountCard } from '@/components/AccountCard'
import { AccountDialog } from '@/components/AccountDialog'
import { TransactionDialog } from '@/components/TransactionDialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, LockOpen, ChartLine, List, Gear, DownloadSimple, Trash, PencilSimple, ArrowsLeftRight, Eye, EyeSlash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

function App() {
  const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
  const [privatePinHash, setPrivatePinHash] = useKV<string>('private-pin-hash', '')
  const [accounts, setAccounts] = useKV<Account[]>('accounts', [])
  const [transactions, setTransactions] = useKV<Transaction[]>('transactions', [])
  const [categories, setCategories] = useKV<Category[]>('categories', [])

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)

  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [editingAccount, setEditingAccount] = useState<Account | undefined>()
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>()
  const [deletingItem, setDeletingItem] = useState<{ type: 'account' | 'transaction', id: string } | null>(null)

  const [activeTab, setActiveTab] = useState('dashboard')
  const [visibleCategories, setVisibleCategories] = useKV<string[]>('visible-categories', ACCOUNT_CATEGORIES.map(c => c.id))

  const safeAccounts = accounts || []
  const safeTransactions = transactions || []
  const safeCategories = categories || []

  useEffect(() => {
    if (!globalPinHash) {
      setIsSetupMode(true)
      setShowPinDialog(true)
    } else {
      setShowPinDialog(true)
    }

    if (safeCategories.length === 0) {
      const defaultCats: Category[] = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        id: generateId()
      }))
      setCategories(defaultCats)
    }
  }, [])

  const handleGlobalPinSubmit = async (pin: string) => {
    if (isSetupMode) {
      const hash = await hashPin(pin)
      setGlobalPinHash(hash)
      setIsAuthenticated(true)
      setShowPinDialog(false)
      setIsSetupMode(false)
      toast.success('PIN globale creato con successo')
    } else {
      const isValid = await verifyPin(pin, globalPinHash || '')
      if (isValid) {
        setIsAuthenticated(true)
        setShowPinDialog(false)
        toast.success('Accesso consentito')
      } else {
        toast.error('PIN non corretto')
      }
    }
  }

  const handlePrivatePinSubmit = async (pin: string) => {
    if (!privatePinHash) {
      const hash = await hashPin(pin)
      setPrivatePinHash(hash)
      setIsPrivateUnlocked(true)
      setShowPrivatePinDialog(false)
      toast.success('PIN privato creato e conto sbloccato')
    } else {
      const isValid = await verifyPin(pin, privatePinHash)
      if (isValid) {
        setIsPrivateUnlocked(true)
        setShowPrivatePinDialog(false)
        const privateAccount = visibleAccounts.find(a => a.isPrivato)
        if (privateAccount) {
          const balance = calculateAccountBalance(privateAccount, visibleTransactions)
          toast.success(`Conto privato sbloccato. Saldo: ${formatCurrency(balance)}`)
        }
      } else {
        toast.error('PIN privato non corretto')
      }
    }
  }

  const handleSaveAccount = (account: Account) => {
    setAccounts((currentAccounts) => {
      const current = currentAccounts || []
      const existingIndex = current.findIndex(a => a.id === account.id)
      if (existingIndex >= 0) {
        const updated = [...current]
        updated[existingIndex] = account
        toast.success('Conto modificato')
        return updated
      } else {
        toast.success(`Conto "${account.nome}" creato`)
        return [...current, account]
      }
    })
    setEditingAccount(undefined)
  }

  const handleSaveTransaction = (transaction: Transaction) => {
    setTransactions((currentTransactions) => {
      const current = currentTransactions || []
      const existingIndex = current.findIndex(t => t.id === transaction.id)
      if (existingIndex >= 0) {
        const updated = [...current]
        updated[existingIndex] = transaction
        toast.success('Movimento modificato')
        return updated
      } else {
        const account = safeAccounts.find(a => a.id === transaction.contoId)
        toast.success(`Movimento aggiunto: ${transaction.tipo} ${formatCurrency(transaction.importo)} - ${account?.nome || ''}`)
        return [...current, transaction]
      }
    })
    setEditingTransaction(undefined)
  }

  const handleDeleteConfirm = () => {
    if (!deletingItem) return

    if (deletingItem.type === 'account') {
      setAccounts((current) => (current || []).filter(a => a.id !== deletingItem.id))
      setTransactions((current) => (current || []).filter(t => t.contoId !== deletingItem.id && t.contoDestinazioneId !== deletingItem.id))
      toast.success('Conto eliminato')
    } else {
      setTransactions((current) => (current || []).filter(t => t.id !== deletingItem.id))
      toast.success('Movimento eliminato')
    }

    setDeletingItem(null)
    setShowDeleteDialog(false)
  }

  const handleExportCSV = () => {
    const csv = exportToCSV(visibleTransactions, visibleAccounts, safeCategories)
    downloadFile(csv, `zecchino-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
    toast.success('Dati esportati in CSV')
  }

  const visibleAccounts = useMemo(() => {
    return safeAccounts.filter(account => {
      if (account.isPrivato && !isPrivateUnlocked) {
        return false
      }
      return true
    })
  }, [safeAccounts, isPrivateUnlocked])

  const visibleTransactions = useMemo(() => {
    const accountIds = new Set(visibleAccounts.map(a => a.id))
    return safeTransactions.filter(t => accountIds.has(t.contoId))
  }, [safeTransactions, visibleAccounts])

  const hasPrivateAccount = safeAccounts.some(a => a.isPrivato)
  const privateAccount = safeAccounts.find(a => a.isPrivato)

  const totalBalance = useMemo(() => {
    return getTotalBalance(visibleAccounts, visibleTransactions)
  }, [visibleAccounts, visibleTransactions])

  const recentTransactions = useMemo(() => {
    return [...visibleTransactions]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10)
  }, [visibleTransactions])

  const groupedAccounts = useMemo(() => {
    const groups = new Map<string, Account[]>()
    
    visibleAccounts.forEach(account => {
      const categoryId = ACCOUNT_TYPE_TO_CATEGORY[account.tipo]
      if (!groups.has(categoryId)) {
        groups.set(categoryId, [])
      }
      groups.get(categoryId)?.push(account)
    })
    
    return ACCOUNT_CATEGORIES
      .map(category => ({
        ...category,
        accounts: groups.get(category.id) || []
      }))
      .filter(group => group.accounts.length > 0)
  }, [visibleAccounts])

  const filteredGroupedAccounts = useMemo(() => {
    const safeVisibleCategories = visibleCategories || []
    return groupedAccounts.filter(group => safeVisibleCategories.includes(group.id))
  }, [groupedAccounts, visibleCategories])

  const toggleCategoryVisibility = (categoryId: string) => {
    setVisibleCategories((current) => {
      const currentCategories = current || []
      if (currentCategories.includes(categoryId)) {
        return currentCategories.filter(id => id !== categoryId)
      } else {
        return [...currentCategories, categoryId]
      }
    })
  }

  const toggleAllCategories = () => {
    setVisibleCategories((current) => {
      const currentCategories = current || []
      const allCategoryIds = ACCOUNT_CATEGORIES.map(c => c.id)
      if (currentCategories.length === allCategoryIds.length) {
        return []
      } else {
        return allCategoryIds
      }
    })
  }

  const allCategoriesVisible = useMemo(() => {
    const currentCategories = visibleCategories || []
    return currentCategories.length === ACCOUNT_CATEGORIES.map(c => c.id).length
  }, [visibleCategories])

  useKeyboardShortcuts([
    {
      key: '1',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          toggleCategoryVisibility('banking')
          toast.success('Filtro Bancari attivato/disattivato')
        }
      },
      description: 'Toggle Banking category'
    },
    {
      key: '2',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          toggleCategoryVisibility('digital')
          toast.success('Filtro Digitali attivato/disattivato')
        }
      },
      description: 'Toggle Digital category'
    },
    {
      key: '3',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          toggleCategoryVisibility('savings')
          toast.success('Filtro Risparmio attivato/disattivato')
        }
      },
      description: 'Toggle Savings category'
    },
    {
      key: '4',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          toggleCategoryVisibility('investments')
          toast.success('Filtro Investimenti attivato/disattivato')
        }
      },
      description: 'Toggle Investments category'
    },
    {
      key: '5',
      callback: () => {
        if (isAuthenticated && activeTab === 'dashboard') {
          toggleCategoryVisibility('private')
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
          toggleAllCategories()
          toast.success(allCategoriesVisible ? 'Tutti i filtri nascosti' : 'Tutti i filtri attivati')
        }
      },
      description: 'Toggle all categories'
    }
  ], isAuthenticated)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <PinDialog
          open={showPinDialog}
          title={isSetupMode ? 'Imposta PIN Globale' : 'Inserisci PIN'}
          description={isSetupMode ? 'Crea un PIN per proteggere l\'applicazione' : 'Inserisci il tuo PIN per accedere'}
          onSubmit={handleGlobalPinSubmit}
          confirmMode={isSetupMode}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold tracking-tight">Zecchino</h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Saldo Totale</p>
                <p className={`text-2xl font-mono font-semibold ${totalBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {formatCurrency(totalBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <List size={18} weight="duotone" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <ArrowsLeftRight size={18} weight="duotone" />
              <span className="hidden sm:inline">Movimenti</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <ChartLine size={18} weight="duotone" />
              <span className="hidden sm:inline">Report</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <h2 className="text-2xl font-semibold">I Tuoi Conti</h2>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => { setEditingTransaction(undefined); setShowTransactionDialog(true) }} className="gap-2">
                  <Plus size={18} weight="bold" />
                  Movimento
                </Button>
                <Button onClick={() => { setEditingAccount(undefined); setShowAccountDialog(true) }} variant="outline" className="gap-2">
                  <Plus size={18} weight="bold" />
                  Conto
                </Button>
                {hasPrivateAccount && !isPrivateUnlocked && (
                  <Button onClick={() => setShowPrivatePinDialog(true)} variant="secondary" className="gap-2">
                    <LockOpen size={18} weight="duotone" />
                    Sblocca Privato
                  </Button>
                )}
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
                    <Button
                      onClick={toggleAllCategories}
                      variant={allCategoriesVisible ? 'default' : 'outline'}
                      size="sm"
                      className="gap-2"
                      aria-label={allCategoriesVisible ? 'Nascondi tutte le categorie' : 'Mostra tutte le categorie'}
                    >
                      {allCategoriesVisible ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
                      <span className="text-xs font-medium">{allCategoriesVisible ? 'Nascondi tutto' : 'Mostra tutto'}</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 hidden sm:inline-flex">Ctrl+A</Badge>
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    {groupedAccounts.map((category, index) => {
                      const isActive = (visibleCategories || []).includes(category.id)
                      const keyNumber = index + 1
                      return (
                        <Button
                          key={category.id}
                          onClick={() => toggleCategoryVisibility(category.id)}
                          variant={isActive ? category.badgeVariant : 'outline'}
                          size="sm"
                          className="gap-2"
                        >
                          <Badge variant={category.badgeVariant} className="text-xs px-0 border-0 bg-transparent">
                            {category.label}
                          </Badge>
                          <span className="text-xs">({category.accounts.length})</span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 hidden sm:inline-flex">{keyNumber}</Badge>
                        </Button>
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
                    {filteredGroupedAccounts.map(group => (
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
              <h3 className="text-xl font-semibold mb-4">Movimenti Recenti</h3>
              {recentTransactions.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-muted-foreground">Nessun movimento registrato</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {recentTransactions.map(transaction => {
                        const account = visibleAccounts.find(a => a.id === transaction.contoId)
                        const category = safeCategories.find(c => c.id === transaction.categoriaId)
                        const isIncome = transaction.tipo === 'entrata'
                        const isTransfer = transaction.tipo === 'trasferimento'

                        return (
                          <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
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
                                  onClick={() => {
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
                                  onClick={() => {
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

          <TabsContent value="transactions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Tutti i Movimenti</h2>
              <div className="flex gap-2">
                <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                  <DownloadSimple size={18} weight="duotone" />
                  Esporta CSV
                </Button>
                <Button onClick={() => { setEditingTransaction(undefined); setShowTransactionDialog(true) }} className="gap-2">
                  <Plus size={18} weight="bold" />
                  Nuovo Movimento
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
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
                    {[...visibleTransactions]
                      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                      .map(transaction => {
                        const account = visibleAccounts.find(a => a.id === transaction.contoId)
                        const destAccount = transaction.contoDestinazioneId
                          ? visibleAccounts.find(a => a.id === transaction.contoDestinazioneId)
                          : null
                        const category = safeCategories.find(c => c.id === transaction.categoriaId)
                        const isIncome = transaction.tipo === 'entrata'
                        const isTransfer = transaction.tipo === 'trasferimento'

                        return (
                          <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
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
                                  onClick={() => {
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
                                  onClick={() => {
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

          <TabsContent value="reports" className="space-y-6">
            <h2 className="text-2xl font-semibold">Report Finanziario</h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Saldo Totale</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-mono font-bold ${totalBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {formatCurrency(totalBalance)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Totale Entrate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono font-bold text-income">
                    {formatCurrency(visibleTransactions.filter(t => t.tipo === 'entrata').reduce((sum, t) => sum + t.importo, 0))}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Totale Uscite</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono font-bold text-expense">
                    {formatCurrency(visibleTransactions.filter(t => t.tipo === 'uscita').reduce((sum, t) => sum + t.importo, 0))}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Dettaglio Conti</CardTitle>
                <CardDescription>Saldo attuale di ogni conto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visibleAccounts.map(account => {
                    const balance = calculateAccountBalance(account, visibleTransactions)
                    return (
                      <div key={account.id} className="flex justify-between items-center">
                        <span className="font-medium">{account.nome}</span>
                        <span className={`font-mono font-semibold ${balance < 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <PinDialog
        open={showPrivatePinDialog}
        title={privatePinHash ? 'Sblocca Conto Privato' : 'Crea PIN Conto Privato'}
        description={privatePinHash ? 'Inserisci il PIN del conto privato' : 'Crea un PIN per il conto privato'}
        onSubmit={handlePrivatePinSubmit}
        onCancel={() => setShowPrivatePinDialog(false)}
        confirmMode={!privatePinHash}
      />

      <AccountDialog
        open={showAccountDialog}
        onClose={() => { setShowAccountDialog(false); setEditingAccount(undefined) }}
        onSave={handleSaveAccount}
        account={editingAccount}
        hasPrivateAccount={hasPrivateAccount && !editingAccount?.isPrivato}
      />

      <TransactionDialog
        open={showTransactionDialog}
        onClose={() => { setShowTransactionDialog(false); setEditingTransaction(undefined) }}
        onSave={handleSaveTransaction}
        transaction={editingTransaction}
        accounts={visibleAccounts}
        categories={safeCategories}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.type === 'account'
                ? 'Eliminando questo conto verranno rimossi anche tutti i movimenti associati. Questa azione non può essere annullata.'
                : 'Questa azione eliminerà definitivamente il movimento. Non può essere annullata.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default App