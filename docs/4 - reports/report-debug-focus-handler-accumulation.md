# Report: Analisi accumulo handler nel menu azioni transazioni

**Data:** 2026-05-09  
**Branch:** refactoring-architettura  
**File analizzati:** `src/components/TransactionActionMenu.tsx`, `src/components/TransactionsTab.tsx`  
**Contesto:** i log di console hanno rivelato che le azioni del menu si accumulano — premere "Elimina" dopo "Modifica" chiama `handleEdit` poi `handleDelete`; premere "Dettaglio" dopo entrambe chiama tutti e tre in sequenza.

---

## 1. Come viene passata `onFocusReturn`

In `TransactionsTab.tsx`, righe 179–184, `onFocusReturn` è definita **inline dentro `.map()`**:

```typescript
onFocusReturn={() => {
  const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
    `[data-trigger-index="${index}"]`
  )
  el?.focus()
}}
```

Non è avvolta da nessun `useCallback`. Cattura `index` e `transactionsListContainerRef` per closure dalla funzione di `.map()`. Questo significa che **per ogni render di `TransactionsTab`, viene creata una nuova istanza di funzione per ogni riga della lista**. L'identità della funzione cambia ad ogni render.

Stesso discorso per `onEdit` e `onDelete`:

```typescript
onEdit={() => openEditTransactionDialog(transaction)}   // inline, non memoizzata
onDelete={() => {                                        // inline, non memoizzata
  setDeletingItem({ type: 'transaction', id: transaction.id })
  setShowDeleteDialog(true)
}}
```

---

## 2. `onFocusReturn` NON è memoizzata

Nessun `useCallback` la protegge. È una arrow function ricreata ad ogni render del componente padre. Esistono però altre callback memoizzate nello stesso file:

```typescript
const onMenuTransactions = useCallback((index: number) => { ... }, [])
const onDeleteTransactions = useCallback((index: number) => { ... }, [sortedTransactions, ...])
const onEditTransactions   = useCallback((index: number) => { ... }, [sortedTransactions, ...])
```

Queste callback memoizzate **non vengono mai usate nel JSX** — non sono passate al `TransactionActionMenu`. Il componente usa invece le versioni inline non memoizzate. La memoizzazione è quindi applicata nel posto sbagliato.

---

## 3. `handleOpenChange` viene chiamato più volte nella stessa sequenza

Questo è il nodo centrale del bug. Quando si clicca "Modifica" in un `DropdownMenuItem`:

### Chiamata 1 — dal handler esplicito

`handleEdit` chiama `onOpenChange(false)` **direttamente** (non attraverso `handleOpenChange`):

```typescript
const handleEdit = () => {
  console.log('[MENU] handleEdit chiamato')
  onOpenChange(false)    // ← chiamata diretta a onOpenChange
  onFocusReturn()        // ← onFocusReturn chiamata qui (1a volta)
  onEdit()
}
```

### Chiamata 2 — da Radix DropdownMenu

Quando un `DropdownMenuItem` viene selezionato, Radix UI chiude il menu internamente e chiama il suo `onOpenChange` callback — che è `handleOpenChange`:

```typescript
const handleOpenChange = (open: boolean) => {
  onOpenChange(open)
  if (!open) {
    onFocusReturn()    // ← onFocusReturn chiamata qui (2a volta)
  }
}
```

**Risultato: `onFocusReturn()` viene chiamata DUE VOLTE per ogni click su una voce del menu**, e `onOpenChange(false)` viene chiamata DUE VOLTE.

La seconda chiamata avviene DOPO che React ha già processato (o sta processando) gli state update prodotti dalla prima, quindi il timing è asimmetrico.

---

## 4. Il codice esatto delle due funzioni

### `onFocusReturn` in `TransactionsTab.tsx` (righe 179–184)

```typescript
onFocusReturn={() => {
  const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
    `[data-trigger-index="${index}"]`
  )
  el?.focus()
}}
```

Cerca nel DOM il bottone con `data-trigger-index="{index}"` e gli chiama `.focus()`. Questa operazione è **sincrona**: il browser spara immediatamente l'evento `focus` sul bottone prima che l'esecuzione dello handler corrente finisca.

### `handleOpenChange` in `TransactionActionMenu.tsx` (righe 41–46)

```typescript
const handleOpenChange = (open: boolean) => {
  onOpenChange(open)
  if (!open) {
    onFocusReturn()
  }
}
```

Viene passato a `DropdownMenu` come `onOpenChange={handleOpenChange}` (riga 124) e a `Sheet` come `onOpenChange={handleOpenChange}` (riga 80).

---

## 5. Meccanismo probabile dell'accumulo

### Traccia temporale — primo uso di "Modifica"

1. Click su "Modifica" → `handleEdit` entra in esecuzione
2. `onOpenChange(false)` → accoda `setOpenMenuIndex(-1)` (React batch)
3. `onFocusReturn()` → `el?.focus()` **sincrono** → il bottone trigger riceve il focus
4. L'evento `focus` si propaga nel DOM; eventuali listener registrati da `useListNavigation` si attivano **durante l'esecuzione di `handleEdit`**, prima che `onEdit()` venga chiamato
5. `onEdit()` → `openEditTransactionDialog(transaction)` → accoda `setShowTransactionDialog(true)`
6. React svuota il batch; `TransactionsTab` re-renderizza; nuove istanze di `onEdit`, `onDelete`, `onFocusReturn` vengono create
7. Radix chiude il dropdown e chiama `handleOpenChange(false)` → `onFocusReturn()` una seconda volta → secondo `focus` sul trigger

### Tra un'interazione e la successiva

Quando l'utente chiude il form di modifica (`setShowTransactionDialog(false)`), `useListNavigation` viene **riabilitato** perché la sua prop `disabled` cambia da `true` a `false`:

```typescript
const allTransactionsNav = useListNavigation({
  disabled: showTransactionDialog || openMenuIndex >= 0,   // ← diventa false
  ...
})
```

Se `useListNavigation` registra event listener (es. `addEventListener` su `keydown`, `pointerdown`, o `focus`) al momento dell'abilitazione senza rimuovere quelli precedenti, questi si accumulano. Ogni chiamata a `onFocusReturn()` che sposta il focus può triggerare questi listener.

### Perché i log mostrano l'ordine storico delle azioni

La sequenza `handleEdit → handleDelete` quando si preme "Elimina" indica che **più handler sono attivi contemporaneamente**. Il pattern "ogni azione aggiunge un handler invece di sostituirlo" è coerente con un `addEventListener` senza cleanup o con un array di callback che cresce ma non viene svuotato.

L'unico componente nel flusso che non è visibile in questi file è `useListNavigation`. È il candidato principale perché:
- Riceve `containerRef` che wrappa tutta la lista
- Viene abilitato/disabilitato in risposta a `showTransactionDialog` e `openMenuIndex`
- La sua prop `disabled` cambia esattamente nel momento in cui il bug si manifesta (dopo la chiusura del form)

---

## 6. `useEffect` con cleanup inutilizzato

In `TransactionsTab.tsx`, righe 33–41:

```typescript
useEffect(() => {
  if (openMenuIndex < 0) return
  return () => {
    const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
      `[data-list-item][data-index="${openMenuIndex}"]`
    )
    el?.focus()
  }
}, [openMenuIndex])
```

Il cleanup tenta di fare focus su `[data-list-item][data-index="N"]`, ma **nessun elemento nel JSX ha questi attributi**. Le righe della lista usano solo `key={transaction.id}` e `data-trigger-index={index}`. Questo cleanup è codice morto che non produce effetti.

---

## 7. Sintesi

| Problema | File | Riga | Gravità |
|----------|------|------|---------|
| `onFocusReturn` non memoizzata — nuova funzione ogni render | `TransactionsTab.tsx` | 179 | Media |
| `onEdit` e `onDelete` non memoizzate | `TransactionsTab.tsx` | 174–178 | Media |
| `onFocusReturn()` chiamata 2 volte per ogni azione menu | `TransactionActionMenu.tsx` | 41–46 + 50/56/64 | Alta |
| `onOpenChange(false)` chiamata 2 volte per ogni azione menu | `TransactionActionMenu.tsx` | 41-46 + 50/57/64 | Alta |
| Callback memoizzate (`onMenuTransactions`, `onEditTransactions`, `onDeleteTransactions`) non usate nel JSX | `TransactionsTab.tsx` | 48–65 | Bassa |
| `useEffect` cleanup su attributi `[data-list-item]` inesistenti | `TransactionsTab.tsx` | 33–41 | Bassa |

**Causa radice più probabile:** la doppia chiamata a `onFocusReturn()` (una da handler, una da `handleOpenChange`) produce due eventi `focus` sincroni sul bottone trigger, che attivano più volte i listener di `useListNavigation`. Se questi listener non vengono rimossi correttamente tra un'abilitazione e l'altra, si accumulano e chiamano gli handler precedentemente registrati.

**Prossimo passo consigliato:** leggere `src/hooks/use-list-navigation.ts` per verificare se usa `addEventListener` senza cleanup, o se mantiene una lista di callback che cresce senza essere svuotata.
