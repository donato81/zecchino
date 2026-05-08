# P38 — Coding Plan: Fix bug dialog "Nuovo Movimento" → "Modifica Movimento"

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P38 — Fix bug TransactionDialog mode-flip
> Report di riferimento: `docs/4 - reports/analisi-bug-dialog-nuovo-movimento.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-07

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P38 — Fix bug TransactionDialog mode-flip |
| **Tipo intervento** | Bugfix critico |
| **Branch** | `refactoring-architettura` |
| **Data** | 2026-05-07 |
| **File modificati** | `src/hooks/use-list-navigation.ts` · `src/components/DialogsOverlay.tsx` · `src/components/TransactionDialog.tsx` · `src/context/AppDataContext.tsx` · `src/components/DashboardTab.tsx` · `src/components/TransactionsTab.tsx` · `src/hooks/use-app-shortcuts.ts` |
| **Report di riferimento** | [analisi-bug-dialog-nuovo-movimento.md](../4%20-%20reports/analisi-bug-dialog-nuovo-movimento.md) |

---

## §2 — Obiettivo

Correggere il bug per cui, aprendo il dialog **"Nuovo Movimento"**, al primo tocco sul Select del conto o della categoria il titolo diventa **"Modifica Movimento"** e il pulsante cambia in **"Salva Modifiche"**. Il successivo salvataggio sovrascrive una transazione esistente invece di crearne una nuova.

**Risultato atteso dopo le modifiche:**
- Il dialog aperto come "Nuovo Movimento" mantiene sempre quel titolo e quel pulsante, qualunque interazione interna avvenga.
- Il submit crea sempre un record nuovo con UUID generato dal backend.
- La navigazione da tastiera delle liste (frecce, Invio, E, Del) continua a funzionare correttamente quando nessun dialog è aperto.

---

## §3 — Causa radice

Lo stato `editingTransaction` (di tipo `Transaction | undefined`) è unico e globale nel context. Il `TransactionDialog` deriva la propria modalità **esclusivamente** dalla presenza o assenza della prop `transaction`:

```tsx
{transaction ? 'Modifica Movimento' : 'Nuovo Movimento'}
{transaction ? 'Salva Modifiche' : 'Aggiungi Movimento'}
const newTransaction: TransactionInput = {
  ...(transaction?.id ? { id: transaction.id } : {}),
  ...
}
```

La transizione che causa il bug è:

> `editingTransaction` nel context passa da `undefined` a un oggetto `Transaction` **mentre il dialog è già aperto**, senza che alcun handler interno al dialog lo gestisca.

L'unica superficie che può produrre questa transizione a dialog aperto sono le callback `onEnter`/`onEdit` delle liste navigabili (in `DashboardTab` e `TransactionsTab`), registrate tramite `useListNavigation`. Queste callback chiamano `setEditingTransaction(transactionDellaLista[focusedIndex])`.

La barriera che dovrebbe impedirlo è la singola riga in `use-list-navigation.ts:29`:

```ts
if (document.querySelector('[data-state="open"][aria-modal="true"]')) return
```

Questa guardia è fragile perché:
1. La valutazione è puntuale (non reattiva): in caso di timing race o propagazione di evento non prevista da Radix, l'handler si esegue ugualmente.
2. Se l'utente ha cliccato una riga della lista **prima** di aprire il dialog (→ `focusedIndex >= 0`), quella selezione rimane valida finché la lista esiste.
3. Radix Select gestisce tasti come Invio/Spazio/lettere internamente, ma il comportamento di `stopPropagation` non è garantito in tutti i percorsi del bubble chain.

**Effetto secondario dell'injection:** il dialog non ha alcun `useEffect` che ri-popoli i campi quando `transaction` cambia a dialog aperto, quindi l'utente vede "Modifica Movimento" ma i campi contengono i dati che stava digitando come nuovo movimento. Al submit, `id: transaction.id` viene incluso nel payload e `handleSaveTransaction` esegue un `UPDATE` invece di un `INSERT`.

---

## §4 — File coinvolti (ordine vincolante)

1. `src/hooks/use-list-navigation.ts`
2. `src/components/DialogsOverlay.tsx`
3. `src/components/TransactionDialog.tsx`
4. `src/context/AppDataContext.tsx`
5. `src/components/DashboardTab.tsx`
6. `src/components/TransactionsTab.tsx`
7. `src/hooks/use-app-shortcuts.ts`

---

## §5 — Modifiche dettagliate per ogni file

---

### Passo 1 — `src/hooks/use-list-navigation.ts`

**Obiettivo:** aggiungere un parametro esplicito `disabled` che disattiva completamente l'hook indipendentemente dal DOM. Questo è il fix primario della causa radice.

#### Modifica 1a — Aggiungere `disabled` all'interfaccia

**Righe 3-10. Codice attuale:**

```ts
interface UseListNavigationProps {
  itemCount: number
  onEnter?: (index: number) => void
  onDelete?: (index: number) => void
  onEdit?: (index: number) => void
  enabled?: boolean
  containerRef?: RefObject<HTMLElement | null>
}
```

**Codice nuovo:**

```ts
interface UseListNavigationProps {
  itemCount: number
  onEnter?: (index: number) => void
  onDelete?: (index: number) => void
  onEdit?: (index: number) => void
  enabled?: boolean
  disabled?: boolean
  containerRef?: RefObject<HTMLElement | null>
}
```

**Motivazione:** `enabled` segnala se l'hook è attivo (collegato ad `isAuthenticated`); `disabled` è il flag di corto-circuito prioritario che blocca le callback quando un dialog è aperto.

#### Modifica 1b — Aggiungere `disabled` ai parametri della funzione

**Righe 12-19. Codice attuale:**

```ts
export function useListNavigation({
  itemCount,
  onEnter,
  onDelete,
  onEdit,
  enabled = true,
  containerRef
}: UseListNavigationProps) {
```

**Codice nuovo:**

```ts
export function useListNavigation({
  itemCount,
  onEnter,
  onDelete,
  onEdit,
  enabled = true,
  disabled = false,
  containerRef
}: UseListNavigationProps) {
```

#### Modifica 1c — Aggiungere il guard `disabled` all'inizio di `handleKeyDown`

**Righe 28-30. Codice attuale:**

```ts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (document.querySelector('[data-state="open"][aria-modal="true"]')) return
    if (!enabled || itemCount === 0) return
```

**Codice nuovo:**

```ts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return
    if (document.querySelector('[data-state="open"][aria-modal="true"]')) return
    if (!enabled || itemCount === 0) return
```

**Motivazione:** `disabled` viene controllato prima della query DOM. Essendo una prop React reattiva (aggiornata al render), non soffre del problema di timing della query DOM.

#### Modifica 1d — Aggiungere `disabled` al dependency array di `handleKeyDown`

**Riga 60. Codice attuale:**

```ts
  }, [enabled, itemCount, focusedIndex])
```

**Codice nuovo:**

```ts
  }, [disabled, enabled, itemCount, focusedIndex])
```

**Motivazione:** senza `disabled` nelle dipendenze, `handleKeyDown` non viene ricreato quando `disabled` cambia e la chiusura cattura il valore stantio.

**Dipendenze con altri passi:** i callsite di `DashboardTab.tsx` (Passo 5) e `TransactionsTab.tsx` (Passo 6) devono passare `disabled={showTransactionDialog}` per sfruttare questa modifica.

**Gate 1:**
```bash
npx tsc --noEmit
```
Atteso: 0 errori. Non ci sono consumer del hook che passano `disabled` in questo momento, quindi TypeScript non si lamenta dell'interfaccia aggiornata.

---

### Passo 2 — `src/components/DialogsOverlay.tsx`

**Obiettivo:** garantire che `setEditingTransaction(undefined)` venga chiamato anche quando `handleSaveTransaction` lancia un'eccezione; rimuovere il commento di codice morto.

#### Modifica 2a — Fix `onSave` del TransactionDialog

**Righe 102-103. Codice attuale:**

```tsx
        //onSave={(transaction) => { handleSaveTransaction(transaction); setEditingTransaction(undefined) }}
        onSave={async (transaction) => {await handleSaveTransaction(transaction); setEditingTransaction(undefined) }}
```

**Codice nuovo:**

```tsx
        onSave={async (transaction) => { try { await handleSaveTransaction(transaction) } finally { setEditingTransaction(undefined) } }}
```

**Motivazione:** nella versione attuale, se `handleSaveTransaction` lancia, il `setEditingTransaction(undefined)` non viene mai eseguito. Con `try/finally`, il reset è garantito in tutti i percorsi. Il commento con il codice obsoleto viene rimosso.

**Gate 2:**
```bash
npx tsc --noEmit
npm run build
```
Atteso: 0 errori.

---

### Passo 3 — `src/components/TransactionDialog.tsx`

**Obiettivo:** (a) aggiungere un `useEffect` che sincronizza i campi locali quando la prop `transaction` cambia mentre il dialog è aperto; (b) fare in modo che `handleClose` resetti sempre il form.

#### Modifica 3a — Nuovo `useEffect` di sincronizzazione campi

**Punto di inserimento:** dopo la riga 82 (`}, [open, transaction, announceDialogOpen, resetForm])`), prima del `useEffect` successivo (riga 84).

**Codice da inserire (nuovo blocco):**

```tsx
  useEffect(() => {
    if (open && transaction) {
      setTipo(transaction.tipo)
      setData(transaction.data)
      setImporto(transaction.importo.toString())
      setContoId(transaction.contoId)
      setContoDestinazioneId(transaction.contoDestinazioneId || '')
      setCategoriaId(transaction.categoriaId || '')
      setDescrizione(transaction.descrizione || '')
      setRicorrente(transaction.ricorrente)
      setFrequenzaRicorrenza(transaction.frequenzaRicorrenza || '')
      setError('')
    }
  }, [open, transaction])
```

**Motivazione:** i `useState` in questo componente leggono l'initial value **solo al primo render**. Il dialog rimane montato tra aperture, quindi dopo il mount i campi vengono aggiornati solo da `resetForm` (per il caso "nuovo") ma non esisteva nessun percorso che popolasse i campi dalla prop `transaction`. Questo effetto gestisce sia l'apertura normale in modalità modifica (caso corretto) sia il caso patologico del bug (injection di `transaction` a dialog già aperto).

**Dipendenze con altri passi:** questo useEffect è una difesa in profondità. Il fix primario è il Passo 1 (disabled prop). Anche se il Passo 1 impedisce il trigger del bug, questo useEffect garantisce che i campi siano sempre allineati alla prop `transaction`.

#### Modifica 3b — `handleClose` resetta sempre il form

**Righe 187-193. Codice attuale:**

```tsx
  const handleClose = () => {
    soundSystem.play('dialog-close')
    if (!transaction) {
      resetForm()
    }
    onClose()
  }
```

**Codice nuovo:**

```tsx
  const handleClose = () => {
    soundSystem.play('dialog-close')
    resetForm()
    onClose()
  }
```

**Motivazione:** nella versione attuale, chiudere il dialog in modalità modifica lascia i campi con i valori della transazione modificata. Se per qualunque motivo il dialog viene riaperto come "Nuovo Movimento" prima che `useEffect` possa girare (es. aggiornamento batched di `editingTransaction` + `showTransactionDialog` su cicli separati), l'utente vedrebbe i dati della modifica precedente per un frame. Resettare sempre il form alla chiusura elimina questo rischio.

**Gate 3:**
```bash
npx tsc --noEmit
npm run build
```
Atteso: 0 errori.

---

### Passo 4 — `src/context/AppDataContext.tsx`

**Obiettivo:** (a) rimuovere il `console.log` di debug; (b) aggiungere le API atomiche `openNewTransactionDialog` e `openEditTransactionDialog` per centralizzare la coppia `setEditingTransaction + setShowTransactionDialog`.

#### Modifica 4a — Rimuovere `console.log` di debug

**Riga 481. Codice attuale (riga 481 all'interno di `handleSaveTransaction`):**

```ts
      console.log('handleSaveTransaction chiamato con id:', transaction.id, '| existing trovato:', !!transactions.find(t => t.id === transaction.id)) //riga aggiunta da me
```

**Codice nuovo:** riga da eliminare completamente.

Il contesto dopo la rimozione (righe 478-485) deve essere:

```ts
  const handleSaveTransaction = async (transaction: TransactionInput) => {
    try {
      const transactionData = transaction
      const existing = transaction.id
        ? transactions.find(t => t.id === transaction.id)
        : undefined
```

**Motivazione:** codice di debug; vietato in contesti MCP (nessun `console.log` su stdout).

#### Modifica 4b — Aggiungere le API atomiche all'interfaccia del tipo

**Righe 74-78. Codice attuale:**

```ts
  // Dialog transaction
  editingTransaction: Transaction | undefined
  setEditingTransaction: (t: Transaction | undefined) => void
  showTransactionDialog: boolean
  setShowTransactionDialog: (v: boolean) => void
```

**Codice nuovo:**

```ts
  // Dialog transaction
  editingTransaction: Transaction | undefined
  setEditingTransaction: (t: Transaction | undefined) => void
  showTransactionDialog: boolean
  setShowTransactionDialog: (v: boolean) => void
  openNewTransactionDialog: () => void
  openEditTransactionDialog: (tx: Transaction) => void
```

#### Modifica 4c — Aggiungere le implementazioni

**Punto di inserimento:** dopo la riga 165 (`const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)`), prima della riga 167 (`const handleAddFundsToGoal = ...`).

**Codice da inserire:**

```ts
  const openNewTransactionDialog = useCallback(() => {
    setEditingTransaction(undefined)
    setShowTransactionDialog(true)
  }, [])

  const openEditTransactionDialog = useCallback((tx: Transaction) => {
    setEditingTransaction(tx)
    setShowTransactionDialog(true)
  }, [])
```

**Motivazione:** centralizzare la coppia `setEditingTransaction + setShowTransactionDialog` in un'unica chiamata atomica elimina 7+ siti dove questa coppia è replicata a mano, riducendo la superficie di errore. I dependency array delle `useCallback` sono vuoti perché `setEditingTransaction` e `setShowTransactionDialog` sono setState setter — riferimenti stabili garantiti da React.

#### Modifica 4d — Esporre le API nel value del provider

**Punto di inserimento:** nel blocco `value={{...}}` del provider, dopo la riga `setShowTransactionDialog,` (intorno alla riga 680).

**Codice attuale (righe 677-681):**

```ts
        editingTransaction,
        setEditingTransaction,
        showTransactionDialog,
        setShowTransactionDialog,
        deletingItem,
```

**Codice nuovo:**

```ts
        editingTransaction,
        setEditingTransaction,
        showTransactionDialog,
        setShowTransactionDialog,
        openNewTransactionDialog,
        openEditTransactionDialog,
        deletingItem,
```

**Gate 4:**
```bash
npx tsc --noEmit
npm run build
```
Atteso: 0 errori. TypeScript verificherà che le nuove proprietà dell'interfaccia siano implementate nel provider value.

---

### Passo 5 — `src/components/DashboardTab.tsx`

**Obiettivo:** adottare le API atomiche del Passo 4; passare `disabled={showTransactionDialog}` all'hook di navigazione lista per attivare la protezione del Passo 1.

#### Modifica 5a — Aggiornare il destructuring da `useAppData`

**Righe 24-32. Codice attuale:**

```tsx
  const {
    safeCategories,
    setEditingTransaction,
    setShowTransactionDialog,
    setDeletingItem,
    setShowDeleteDialog,
    setEditingAccount,
    setShowAccountDialog,
  } = useAppData()
```

**Codice nuovo:**

```tsx
  const {
    safeCategories,
    openNewTransactionDialog,
    openEditTransactionDialog,
    showTransactionDialog,
    setDeletingItem,
    setShowDeleteDialog,
    setEditingAccount,
    setShowAccountDialog,
  } = useAppData()
```

#### Modifica 5b — Aggiornare `onEnterRecent`

**Righe 72-78. Codice attuale:**

```tsx
  const onEnterRecent = useCallback((index: number) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  }, [recentTransactions, setEditingTransaction, setShowTransactionDialog])
```

**Codice nuovo:**

```tsx
  const onEnterRecent = useCallback((index: number) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      openEditTransactionDialog(transaction)
    }
  }, [recentTransactions, openEditTransactionDialog])
```

#### Modifica 5c — Aggiornare `onEditRecent`

**Righe 88-94. Codice attuale:**

```tsx
  const onEditRecent = useCallback((index: number) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  }, [recentTransactions, setEditingTransaction, setShowTransactionDialog])
```

**Codice nuovo:**

```tsx
  const onEditRecent = useCallback((index: number) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      openEditTransactionDialog(transaction)
    }
  }, [recentTransactions, openEditTransactionDialog])
```

#### Modifica 5d — Aggiungere `disabled` al call di `useListNavigation`

**Righe 96-103. Codice attuale:**

```tsx
  const recentTransactionsNav = useListNavigation({
    itemCount: recentTransactions.length,
    enabled: isAuthenticated,
    onEnter: onEnterRecent,
    onDelete: onDeleteRecent,
    onEdit: onEditRecent,
    containerRef: recentListContainerRef,
  })
```

**Codice nuovo:**

```tsx
  const recentTransactionsNav = useListNavigation({
    itemCount: recentTransactions.length,
    enabled: isAuthenticated,
    disabled: showTransactionDialog,
    onEnter: onEnterRecent,
    onDelete: onDeleteRecent,
    onEdit: onEditRecent,
    containerRef: recentListContainerRef,
  })
```

**Motivazione:** `disabled={showTransactionDialog}` disattiva l'hook nel momento esatto in cui il dialog è aperto, indipendentemente dallo stato del DOM.

#### Modifica 5e — Aggiornare il bottone "Movimento" nella toolbar

**Righe 113-119. Codice attuale:**

```tsx
                  onClick={() => {
                    soundSystem.play('dialog-open')
                    hapticSystem.dialogOpen()
                    setEditingTransaction(undefined)
                    setShowTransactionDialog(true)
                  }}
```

**Codice nuovo:**

```tsx
                  onClick={() => {
                    soundSystem.play('dialog-open')
                    hapticSystem.dialogOpen()
                    openNewTransactionDialog()
                  }}
```

#### Modifica 5f — Aggiornare il bottone PencilSimple su riga lista recenti

**Righe 394-398. Codice attuale:**

```tsx
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingTransaction(transaction)
                              setShowTransactionDialog(true)
                            }}
```

**Codice nuovo:**

```tsx
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditTransactionDialog(transaction)
                            }}
```

**Gate 5:**
```bash
npx tsc --noEmit
npm run build
```
Atteso: 0 errori TypeScript.

---

### Passo 6 — `src/components/TransactionsTab.tsx`

**Obiettivo:** adottare le API atomiche del Passo 4; passare `disabled={showTransactionDialog}` all'hook di navigazione; correggere il JSX malformato del bottone empty-state.

#### Modifica 6a — Aggiornare il destructuring da `useAppData`

**Righe 14-21. Codice attuale:**

```tsx
  const {
    safeCategories,
    handleExportCSV,
    setEditingTransaction,
    setShowTransactionDialog,
    setDeletingItem,
    setShowDeleteDialog,
  } = useAppData()
```

**Codice nuovo:**

```tsx
  const {
    safeCategories,
    handleExportCSV,
    openNewTransactionDialog,
    openEditTransactionDialog,
    showTransactionDialog,
    setDeletingItem,
    setShowDeleteDialog,
  } = useAppData()
```

#### Modifica 6b — Aggiornare `onEnterTransactions`

**Righe 34-40. Codice attuale:**

```tsx
  const onEnterTransactions = useCallback((index: number) => {
    const transaction = sortedTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  }, [sortedTransactions, setEditingTransaction, setShowTransactionDialog])
```

**Codice nuovo:**

```tsx
  const onEnterTransactions = useCallback((index: number) => {
    const transaction = sortedTransactions[index]
    if (transaction) {
      openEditTransactionDialog(transaction)
    }
  }, [sortedTransactions, openEditTransactionDialog])
```

#### Modifica 6c — Aggiornare `onEditTransactions`

**Righe 50-56. Codice attuale:**

```tsx
  const onEditTransactions = useCallback((index: number) => {
    const transaction = sortedTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  }, [sortedTransactions, setEditingTransaction, setShowTransactionDialog])
```

**Codice nuovo:**

```tsx
  const onEditTransactions = useCallback((index: number) => {
    const transaction = sortedTransactions[index]
    if (transaction) {
      openEditTransactionDialog(transaction)
    }
  }, [sortedTransactions, openEditTransactionDialog])
```

#### Modifica 6d — Aggiungere `disabled` al call di `useListNavigation`

**Righe 58-65. Codice attuale:**

```tsx
  const allTransactionsNav = useListNavigation({
    itemCount: sortedTransactions.length,
    enabled: isAuthenticated,
    onEnter: onEnterTransactions,
    onDelete: onDeleteTransactions,
    onEdit: onEditTransactions,
    containerRef: transactionsListContainerRef,
  })
```

**Codice nuovo:**

```tsx
  const allTransactionsNav = useListNavigation({
    itemCount: sortedTransactions.length,
    enabled: isAuthenticated,
    disabled: showTransactionDialog,
    onEnter: onEnterTransactions,
    onDelete: onDeleteTransactions,
    onEdit: onEditTransactions,
    containerRef: transactionsListContainerRef,
  })
```

#### Modifica 6e — Aggiornare il bottone "Nuovo Movimento" nella toolbar

**Riga 84. Codice attuale:**

```tsx
            onClick={() => { setEditingTransaction(undefined); setShowTransactionDialog(true) }}
```

**Codice nuovo:**

```tsx
            onClick={() => openNewTransactionDialog()}
```

#### Modifica 6f — Correggere il JSX malformato del bottone empty-state

**Righe 107-111. Codice attuale:**

```tsx
              //<Button onClick={() => setShowTransactionDialog(true)} className="gap-2">
              <Button onClick={() => { setEditingTransaction(undefined); setShowTransactionDialog(true) }} className="gap-2"></Button>
                <Plus size={18} weight="bold" />
                Aggiungi Movimento
              </Button>
```

**Codice nuovo:**

```tsx
              <Button onClick={() => openNewTransactionDialog()} className="gap-2">
                <Plus size={18} weight="bold" />
                Aggiungi Movimento
              </Button>
```

**Motivazione:** il `<Button .../>` auto-chiuso lasciava `<Plus>` e il testo fuori dal pulsante. Il `</Button>` orfano era JSX non valido. Il commento con codice obsoleto viene rimosso.

#### Modifica 6g — Aggiornare il bottone PencilSimple su riga lista transazioni

**Righe 184-188. Codice attuale:**

```tsx
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingTransaction(transaction)
                            setShowTransactionDialog(true)
                          }}
```

**Codice nuovo:**

```tsx
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditTransactionDialog(transaction)
                          }}
```

**Gate 6:**
```bash
npx tsc --noEmit
npm run build
```
Atteso: 0 errori. Il JSX malformato era già accettato dal parser di Vite ma era errato semanticamente; dopo la fix il componente funziona correttamente nell'empty-state.

---

### Passo 7 — `src/hooks/use-app-shortcuts.ts`

**Obiettivo:** adottare l'API atomica `openNewTransactionDialog` nel callback `Ctrl+M`, rimuovendo la dipendenza dalle opzioni `setEditingTransaction` e `setShowTransactionDialog`.

#### Modifica 7a — Aggiungere `openNewTransactionDialog` al destructuring di `useAppData`

**Righe 34-36. Codice attuale:**

```ts
  const {
    handleExportCSV,
  } = useAppData()
```

**Codice nuovo:**

```ts
  const {
    handleExportCSV,
    openNewTransactionDialog,
  } = useAppData()
```

#### Modifica 7b — Rimuovere `setShowTransactionDialog` e `setEditingTransaction` dal destructuring delle opzioni

**Righe 22-31. Codice attuale:**

```ts
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
```

**Codice nuovo:**

```ts
export function useAppShortcuts(options: AppShortcutsOptions): void {
  const {
    activeTab,
    setActiveTab,
    setShowAccountDialog,
    setShowKeyboardHelp,
    setEditingAccount,
  } = options
```

**Nota:** le proprietà `setShowTransactionDialog` e `setEditingTransaction` rimangono nell'interfaccia `AppShortcutsOptions` (righe 12-20) per compatibilità con il chiamante esistente. Non vanno rimosse dall'interfaccia in questo intervento. Le proprietà dell'interfaccia inutilizzate nel body della funzione non causano errori TypeScript.

#### Modifica 7c — Aggiornare il callback della shortcut `Ctrl+M`

**Righe 138-148. Codice attuale:**

```ts
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
```

**Codice nuovo:**

```ts
    {
      key: 'm',
      ctrl: true,
      callback: () => {
        if (isAuthenticated) {
          openNewTransactionDialog()
          soundSystem.play('click')
          toast.success('Nuovo movimento')
        }
      },
      description: 'New transaction'
    },
```

#### Modifica 7d — Aggiornare il dependency array del `useMemo`

**Righe 232-250. Codice attuale:**

```ts
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
```

**Codice nuovo:**

```ts
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
    openNewTransactionDialog,
    setShowAccountDialog,
    setShowKeyboardHelp,
    setEditingAccount,
  ])
```

**Gate 7:**
```bash
npx tsc --noEmit
npm run build
```
Atteso: 0 errori.

---

## §6 — Ordine di esecuzione

L'ordine dei 7 passi è vincolante per le seguenti dipendenze:

| Passo | Dipende da |
|---|---|
| Passo 1 (`use-list-navigation.ts`) | — indipendente |
| Passo 2 (`DialogsOverlay.tsx`) | — indipendente |
| Passo 3 (`TransactionDialog.tsx`) | — indipendente |
| Passo 4 (`AppDataContext.tsx`) | — indipendente, ma deve precedere 5, 6, 7 |
| Passo 5 (`DashboardTab.tsx`) | Passo 1 (prop `disabled`), Passo 4 (API atomica) |
| Passo 6 (`TransactionsTab.tsx`) | Passo 1 (prop `disabled`), Passo 4 (API atomica) |
| Passo 7 (`use-app-shortcuts.ts`) | Passo 4 (API atomica) |

I Passi 1, 2, 3, 4 sono mutuamente indipendenti e possono essere eseguiti in qualunque loro ordine relativo. I Passi 5, 6, 7 devono seguire il Passo 4 per evitare errori TypeScript su simboli non ancora definiti.

---

## §7 — Test di verifica

Eseguire manualmente nell'ordine indicato dopo aver completato tutti e 7 i passi.

| # | Scenario | Esito atteso |
|---|---|---|
| T1 | Aprire il dialog "Nuovo Movimento" **senza aver mai toccato nessuna lista** | Titolo "Nuovo Movimento", pulsante "Aggiungi Movimento" |
| T2 | Aprire il dialog "Nuovo Movimento" **dopo aver cliccato un movimento nella lista** (→ `focusedIndex >= 0`) e navigare nel Select del conto | Titolo resta "Nuovo Movimento", pulsante resta "Aggiungi Movimento" |
| T3 | Nel dialog aperto come "Nuovo Movimento", aprire il dropdown del conto e selezionare una voce con Invio | Titolo resta "Nuovo Movimento"; il campo conto viene aggiornato con la selezione |
| T4 | Nel dialog aperto come "Nuovo Movimento", aprire il dropdown della categoria e selezionare una voce con Invio | Titolo resta "Nuovo Movimento"; il campo categoria viene aggiornato |
| T5 | Compilare il form come "Nuovo Movimento" e salvare | Viene creato un **nuovo record** con UUID diverso da qualunque transazione esistente. Nessuna transazione esistente viene modificata. |
| T6 | Il pulsante nella toolbar di DashboardTab dice "Movimento" e apre dialog con titolo "Nuovo Movimento" | Pulsante presente e funzionante |
| T7 | Cliccare l'icona PencilSimple su una riga recente | Dialog apre con titolo "Modifica Movimento" e i campi popolati con i valori della transazione selezionata |
| T8 | Tab Movimenti: cliccare "Nuovo Movimento" | Dialog con titolo "Nuovo Movimento", pulsante "Aggiungi Movimento" |
| T9 | Tab Movimenti, empty-state: bottone "Aggiungi Movimento" contiene icona + testo e apre dialog correttamente | Pulsante visivamente corretto e funzionante |
| T10 | Usare Ctrl+M | Dialog "Nuovo Movimento" si apre |
| T11 | Con dialog chiuso, usare frecce ↑/↓ sulla lista recenti → premere Invio | La transazione selezionata si apre in modifica |
| T12 | Con dialog chiuso, usare frecce ↑/↓ sulla lista transazioni → premere E | La transazione selezionata si apre in modifica |
| T13 | Con dialog aperto (in qualsiasi modalità), premere Invio o E sulla tastiera | La lista sottostante non reagisce; nessun cambio di modalità nel dialog |

---

## §8 — File da non toccare

I seguenti file **non devono essere modificati** in questo intervento:

| File | Motivo |
|---|---|
| `src/hooks/use-keyboard-shortcuts.ts` | Non coinvolto nel flusso del bug |
| `src/context/AuthContext.tsx` | Non coinvolto |
| `src/context/VisibleDataContext.tsx` | Non coinvolto |
| `src/lib/types.ts` | Nessuna modifica ai tipi necessaria |
| `src/components/AccountDialog.tsx` | Non coinvolto |
| `src/components/BudgetDialog.tsx` | Non coinvolto |
| `src/components/SavingsGoalDialog.tsx` | Non coinvolto |
| Qualunque file sotto `.github/` | Protetto dal framework guard |

---

## §9 — Rischi e attenzioni

| Rischio | Mitigazione |
|---|---|
| La prop `disabled` su `useListNavigation` blocca le callback anche se per qualunque motivo il dialog rimane "open" in stato React ma non nel DOM | Il parametro `disabled` si affianca alla guardia DOM esistente (non la sostituisce). Se `showTransactionDialog` è `false` ma c'è un altro dialog aperto, la guardia DOM (`aria-modal`) funge da secondo livello. |
| Il nuovo `useEffect` in `TransactionDialog` (Modifica 3a) dipende da `[open, transaction]`. Se `transaction` è un oggetto ricreato a ogni render (reference instability), l'effetto si ri-esegue inutilmente | `editingTransaction` è uno stato React impostato con `setEditingTransaction(tx)` dove `tx` è la stessa reference della lista. Non viene ricostruito a ogni render. Il rischio è teoricamente basso. |
| Rimuovere `if (!transaction)` da `handleClose` (Modifica 3b) significa che `resetForm` viene chiamato anche alla chiusura di una modifica | Il `useEffect` con `[open, transaction]` (Modifica 3a) ripopolerà i campi alla successiva apertura in edit mode. Non c'è regressione. |
| La correzione del JSX in `TransactionsTab.tsx` (Modifica 6f) cambia la struttura del bottone empty-state che era rotto | Il bottone era semanticamente errato (icona e testo fuori dal `<button>`). La correzione ripristina la struttura corretta. Verificare visivamente nell'empty-state dopo la modifica. |
| `use-app-shortcuts.ts` lascia `setShowTransactionDialog` e `setEditingTransaction` nell'interfaccia ma non le usa | Proprietà inutilizzate nell'interfaccia non causano errori TypeScript. Il chiamante continua a funzionare senza modifiche. Un cleanup dell'interfaccia può essere fatto in un intervento separato. |

---

## §10 — Gate finale P38

```bash
npx tsc --noEmit
npm run build
```

Entrambi devono restituire exit 0 senza errori.

Verifiche manuali obbligatorie: T1–T13 della sezione §7 devono passare tutti.

```bash
git diff --name-only HEAD | grep ".github"
```

Output atteso: vuoto. Nessun file sotto `.github/` deve essere modificato.
