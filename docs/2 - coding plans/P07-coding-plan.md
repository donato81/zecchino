# P07 — Coding Plan: Estrazione `TransactionsTab`

> Documento operativo. Nessun file di codice sorgente viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 7 — Creazione di `src/components/TransactionsTab.tsx`  
> Design di riferimento: `docs/1 - projects/P07-TransactionsTab-design.md`  
> Data: 23 aprile 2026

---

## Note preliminari

- I numeri di riga indicati sono **approssimativi** (±5 righe) e vanno verificati nell'editor prima di ogni modifica.
- Questo pacchetto si implementa in **tre passi distinti e sequenziali**: prima la modifica di `AppDataContext`, poi la creazione del componente, infine la pulizia di `App.tsx`. Ogni passo va verificato con `npx tsc --noEmit` prima di procedere al successivo.
- I file in `src/lib/`, `src/context/AuthContext.tsx` e `src/hooks/use-app-shortcuts.ts` non vengono toccati.
- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P06.
- File non toccati in questo passo:

  | File | Motivo |
  |---|---|
  | `src/context/AuthContext.tsx` | `TransactionsTab` non accede direttamente all'auth |
  | `src/hooks/use-app-shortcuts.ts` | Interfaccia pubblica invariata (i setter arrivano dal context) |
  | `src/hooks/use-visible-data.ts` | Già espone i valori corretti; nessuna modifica necessaria |
  | `src/hooks/use-keyboard-shortcuts.ts` | Meccanismo meccanico invariato |
  | `src/lib/` | Tutti i file già stabili |
  | `docs/`, `.github/` | Invariati |

---

## Ambiguità rilevate

### AI1 — `visibleTransactions` NON è ordinato da `useVisibleData()`

**Situazione**: il design doc §5 e R1 affermano che "visibleTransactions da `useVisibleData()` è già ordinato per data decrescente". Verificando `src/hooks/use-visible-data.ts` riga 41:

```ts
const visibleTransactions = useMemo(() => {
  const accountIds = new Set(visibleAccounts.map(account => account.id))
  return safeTransactions.filter(transaction => accountIds.has(transaction.contoId))
}, [safeTransactions, visibleAccounts])
```

`visibleTransactions` **filtra soltanto** — non ordina. Solo `recentTransactions` (riga 61) applica il sort. Di conseguenza il sort nel JSX e nei callback di `allTransactionsNav` è necessario e corretto.

**Decisione**: invece di 3 sort ripetuti nei callback e 1 sort nel render, si introduce una variabile locale ordinata **una sola volta** nel componente:

```ts
const sortedTransactions = useMemo(
  () => [...visibleTransactions].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
  [visibleTransactions]
)
```

Tutti i riferimenti a `[...visibleTransactions].sort(...)` nel JSX e nei callback di `allTransactionsNav` vengono sostituiti con `sortedTransactions`. L'indice passato da `useListNavigation` corrisponde all'indice in `sortedTransactions`.

### AI2 — Firma di `handleDeleteConfirm` dopo la migrazione

**Situazione**: il design doc §4 indica che `handleDeleteConfirm` deve "leggere `deletingItem` dallo stato interno e non richiedere più il parametro esterno". L'implementazione attuale in `AppDataContext.tsx` riga 225 accetta `item` come parametro. Il call site in `App.tsx` riga 1320 è:

```ts
onClick={() => { if (deletingItem) handleDeleteConfirm(deletingItem) }}
```

**Decisione (segue il design doc)**: la firma cambia a `handleDeleteConfirm: () => void`. Il corpo della funzione legge `deletingItem` dallo stato interno e ne verifica la nullità. Il call site in `App.tsx` diventa semplicemente `onClick={() => handleDeleteConfirm()}`. Il tipo nell'interfaccia `AppDataContextValue` (riga 38) va aggiornato di conseguenza.

### AI3 — `useEffect` di `showDeleteDialog` rimane in `App.tsx`

**Situazione**: `App.tsx` righe 117–120 contiene un `useEffect` che suona `dialog-open` quando `showDeleteDialog` diventa `true`. Dopo la migrazione di `showDeleteDialog` in `AppDataContext`, questo effetto va letto dal context. Il design doc non lo menziona.

**Decisione**: l'effetto rimane in `App.tsx` ma legge `showDeleteDialog` dalla destructuring di `useAppData()` (aggiunta nel Passo C). Non va spostato in `AppDataContext` (l'effetto visivo/sonoro della UI non appartiene al layer dati).

### AI4 — `showTransactionDialog` non è usato dentro il JSX di `TransactionsTab`

**Situazione**: il blocco `TabsContent value="transactions"` (righe 762–899) usa solo i **setter** (`setShowTransactionDialog`, `setDeletingItem`, `setShowDeleteDialog`, `setEditingTransaction`). I booleani `showTransactionDialog` e `showDeleteDialog` non compaiono nel JSX del tab. Sono usati dai Dialog in `App.tsx`.

**Decisione**: `TransactionsTab` destructura da `useAppData()` solo i setter che servono. I booleani restano referenziati solo da `App.tsx` per pilotare i Dialog. Non è una limitazione: tutti e 8 i valori (4 stati + 4 setter) saranno in context e ognuno legge ciò che serve.

---

## Rischi

### R1 — Sort rimosso dal design ma necessario — 🔴 Alto

Il design doc indicava di rimuovere il sort perché `visibleTransactions` "è già ordinato". Come da AI1, il sort è necessario.

**Mitigazione**: usare `sortedTransactions` (vedi AI1). Non rimuovere il sort senza avere questo `useMemo` come sostituto.

### R2 — Prerequisito Passo A non verificato — 🔴 Alto

Il Passo B (creazione `TransactionsTab`) dipende dalla corretta esposizione dei 4 stati dialog da `AppDataContext`. Se il Passo A non compila o espone setter con tipo errato, il Passo B non può essere scritto correttamente.

**Mitigazione**: eseguire `npx tsc --noEmit` dopo il Passo A e non procedere al Passo B fino a zero errori.

### R3 — `useState` non importato in `AppDataContext.tsx` — 🟡 Medio

L'import corrente di `AppDataContext.tsx` (riga 1) è:

```ts
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
```

`useState` **non è presente**. Va aggiunto prima di dichiarare i nuovi stati.

**Mitigazione**: prima di ogni altra modifica, aggiungere `useState` all'import (Passo A.1).

### R4 — Indice `allTransactionsNav` disallineato se array cambia — 🟡 Medio

`useListNavigation` tiene il `focusedIndex` come intero. Se `visibleTransactions` cambia lunghezza mentre un indice è attivo, l'hook deve gestire l'out-of-bounds. Verificare che `useListNavigation` abbia già questa guardia (il comportamento era invariato prima di questo passo; non introduce nuovi rischi ma va verificato).

**Mitigazione**: testare scenario "elimina il movimento focalizzato" (scenario 5+8 del design).

### R5 — `enabled` flag in `allTransactionsNav` — 🟡 Medio

Nell'App.tsx originale: `enabled: isAuthenticated && activeTab === 'transactions'`. Dopo l'estrazione:

- `TransactionsTab` è renderizzato all'interno di `TabsContent value="transactions"`, quindi è montato/smontato con il tab → la condizione `activeTab === 'transactions'` è implicita.
- `isAuthenticated` rimane rilevante: se l'app fosse autenticata (l'utente vede `AppContent`) ma `useListNavigation` lo richiede esplicitamente, va letto da `useAuth()` o passato come prop.

**Decisione operativa**: leggere `isAuthenticated` da `useAuth()` dentro `TransactionsTab` e passarlo come `enabled: isAuthenticated`. Non rimuoverlo silenziosamente.

---

## Passo A — Modifica `src/context/AppDataContext.tsx`

### Rischio: 🟡 Medio
### Prerequisito: P01–P06 completati; branch `refactoring-architettura`

### A.1 Aggiornamento import React (riga 1)

```ts
// PRIMA:
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'

// DOPO:
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
```

### A.2 Aggiornamento di `AppDataContextValue` (righe 12–44)

Aggiungere **dopo** l'ultima proprietà esistente (`handleViewBudget`) e **prima** della chiusura `}`:

```ts
  // Dialog transaction
  editingTransaction: Transaction | undefined
  setEditingTransaction: (t: Transaction | undefined) => void
  showTransactionDialog: boolean
  setShowTransactionDialog: (v: boolean) => void
  // Dialog delete (shared tra tutti i tab)
  deletingItem: { type: 'account' | 'transaction' | 'budget' | 'savingsGoal'; id: string } | null
  setDeletingItem: (item: { type: 'account' | 'transaction' | 'budget' | 'savingsGoal'; id: string } | null) => void
  showDeleteDialog: boolean
  setShowDeleteDialog: (v: boolean) => void
```

Aggiornare la firma di `handleDeleteConfirm` nella stessa interfaccia (riga 38):

```ts
// PRIMA:
  handleDeleteConfirm: (item: { type: 'account' | 'transaction' | 'budget' | 'savingsGoal', id: string }) => void

// DOPO:
  handleDeleteConfirm: () => void
```

### A.3 Dichiarazione degli `useState` dentro `AppDataProvider`

Posizione: subito dopo la dichiarazione degli `useState` esistenti (dopo riga 67 circa, prima di `const safeAccounts = useMemo...`):

```ts
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [deletingItem, setDeletingItem] = useState<{
    type: 'account' | 'transaction' | 'budget' | 'savingsGoal';
    id: string
  } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
```

### A.4 Aggiornamento di `handleDeleteConfirm` (riga ~225)

```ts
// PRIMA:
  const handleDeleteConfirm = (item: { type: 'account' | 'transaction' | 'budget' | 'savingsGoal', id: string }) => {
    soundSystem.play('delete')
    hapticSystem.delete()
    if (item.type === 'account') {
      // ...
    } else if (item.type === 'transaction') {
      // ...
    // ecc.

// DOPO:
  const handleDeleteConfirm = () => {
    if (!deletingItem) return
    soundSystem.play('delete')
    hapticSystem.delete()
    if (deletingItem.type === 'account') {
      // (sostituire ogni riferimento a `item.` con `deletingItem.`)
    } else if (deletingItem.type === 'transaction') {
      // ecc.
```

Tutte le occorrenze di `item.type`, `item.id` nel corpo della funzione vanno sostituite con `deletingItem.type`, `deletingItem.id`.

### A.5 Aggiornamento del valore del Provider (righe ~340–390)

Aggiungere i nuovi valori nell'oggetto passato a `AppDataContext.Provider`:

```ts
        editingTransaction,
        setEditingTransaction,
        showTransactionDialog,
        setShowTransactionDialog,
        deletingItem,
        setDeletingItem,
        showDeleteDialog,
        setShowDeleteDialog,
```

### Criterio di verifica — Passo A

- `npx tsc --noEmit` → zero errori TypeScript
- `useAppData()` restituisce `setEditingTransaction`, `setShowTransactionDialog`, `setDeletingItem`, `setShowDeleteDialog`, `showDeleteDialog`, `deletingItem`, `editingTransaction`, `showTransactionDialog`
- L'app si avvia normalmente (i dialog non sono ancora collegati al nuovo path, ma non crashano)

---

## Passo B — Creazione `src/components/TransactionsTab.tsx`

### Rischio: 🔴 Alto (dipende dal Passo A completato)
### Prerequisito: Passo A verificato con `tsc --noEmit` a zero errori

### B.1 Import

```ts
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
```

### B.2 Firma del componente

```ts
export function TransactionsTab() {
  // ... corpo descritto in B.3–B.7
}
```

Il componente non riceve props.

### B.3 Sorgenti dati

```ts
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
```

### B.4 Array ordinato — `sortedTransactions` (risolve AI1)

```ts
  const sortedTransactions = useMemo(
    () => [...visibleTransactions].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [visibleTransactions]
  )
```

⚠️ **AI1**: usare **`sortedTransactions`** ovunque nel render e nei callback di navigazione. Non usare `[...visibleTransactions].sort(...)` inline.

### B.5 Inizializzazione di `allTransactionsNav`

```ts
  const allTransactionsNav = useListNavigation({
    itemCount: sortedTransactions.length,
    enabled: isAuthenticated,   // tab attivo implicitly (R5)
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
```

⚠️ **R5**: `enabled: isAuthenticated` — non omettere; letto da `useAuth()` (B.3).  
⚠️ **AI1**: i callback usano `sortedTransactions[index]` — **senza** `.sort()` aggiuntivo.

### B.6 JSX del componente

Il corpo JSX è il blocco `TabsContent value="transactions"` copiato da `App.tsx` righe **762–899**. Sostituzioni obbligatorie rispetto all'originale:

| Originale (App.tsx) | Nel nuovo componente |
|---|---|
| `[...visibleTransactions].sort((a, b) => ...).map(...)` | `sortedTransactions.map(...)` |
| `visibleTransactions.length === 0` (nel JSX) | Invariato — `visibleTransactions` è corretto per il conteggio |
| `visibleTransactions.length > 0` (badge) | Invariato |
| `handleExportCSV(visibleTransactions, visibleAccounts)` | Invariato — firma di `handleExportCSV` non cambia |

Nessun'altra modifica logica: tutti i `setEditingTransaction`, `setShowTransactionDialog`, `setDeletingItem`, `setShowDeleteDialog`, `allTransactionsNav` sono disponibili localmente.

### B.7 Verifica del Passo B

- Il file `src/components/TransactionsTab.tsx` esiste
- `npx tsc --noEmit` → zero errori TypeScript
- L'app **non cambia ancora** visivamente (App.tsx non è stato modificato)

---

## Passo C — Modifica `src/App.tsx`

### Rischio: 🟡 Medio
### Prerequisito: Passi A e B verificati con `tsc --noEmit` a zero errori

### C.1 Aggiungere import di `TransactionsTab` (riga ~52, dopo l'ultimo import)

```ts
import { TransactionsTab } from '@/components/TransactionsTab'
```

### C.2 Rimozione dei 4 `useState` dialog locali (righe ~100–110)

Rimuovere le righe:

```ts
// RIMUOVERE (riga ~100):
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)

// RIMUOVERE (riga ~103):
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

// RIMUOVERE (riga ~107):
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>()

// RIMUOVERE (riga ~110):
  const [deletingItem, setDeletingItem] = useState<{ type: 'account' | 'transaction' | 'budget' | 'savingsGoal', id: string } | null>(null)
```

### C.3 Aggiornamento della destructuring di `useAppData()` (righe ~70–88)

Aggiungere i nuovi valori esposti dal context:

```ts
    editingTransaction,
    setEditingTransaction,
    showTransactionDialog,
    setShowTransactionDialog,
    deletingItem,
    setDeletingItem,
    showDeleteDialog,
    setShowDeleteDialog,
```

Questi valori sono già usati nel JSX rimanente di `App.tsx` (dialog al fondo) e nell'`useEffect` di `showDeleteDialog` (riga ~117): non vanno rimossi dall'app, solo spostati nella sorgente.

### C.4 Rimozione di `allTransactionsNav` (righe ~247–276)

Rimuovere l'intero blocco `useListNavigation` per `allTransactionsNav`:

```ts
// RIMUOVERE (~30 righe, da riga ~247 a ~276):
  const allTransactionsNav = useListNavigation({
    itemCount: visibleTransactions.length,
    enabled: isAuthenticated && activeTab === 'transactions',
    onEnter: (index) => { ... },
    onDelete: (index) => { ... },
    onEdit: (index) => { ... }
  })
```

⚠️ Verificare che `recentTransactionsNav` (blocco immediatamente precedente, righe ~218–246) **non** venga rimosso.

### C.5 Sostituzione del blocco `TabsContent value="transactions"` (righe 762–899)

```ts
// RIMUOVERE (~138 righe, da riga 762 a 899):
          <TabsContent value="transactions" className="space-y-6" id="transactions-panel" role="tabpanel" aria-labelledby="transactions-tab">
            ...
          </TabsContent>

// SOSTITUIRE CON (1 riga):
          <TransactionsTab />
```

### C.6 Aggiornamento del call site di `handleDeleteConfirm` (riga ~1320 → ricalcolata dopo le rimozioni)

```ts
// PRIMA:
onClick={() => { if (deletingItem) handleDeleteConfirm(deletingItem) }}

// DOPO:
onClick={() => handleDeleteConfirm()}
```

Il guard `if (deletingItem)` è ora interno a `handleDeleteConfirm()` (vedi Passo A.4).

### C.7 Verifica importazioni residue

Dopo le rimozioni, verificare che in `App.tsx` non rimangano import inutilizzati legati al tab Movimenti (es. `DownloadSimple` se usato solo nel tab estratto). Rimuovere quelli non più referenziati nel JSX rimanente.

### Criterio di verifica — Passo C

- `npx tsc --noEmit` → zero errori TypeScript
- `npm run build` → compilazione riuscita senza errori
- `grep "allTransactionsNav" src/App.tsx` → zero risultati
- `grep "TabsContent value=\"transactions\"" src/App.tsx` → zero risultati
- `grep "TransactionsTab" src/App.tsx` → 2 risultati (import + utilizzo `<TransactionsTab />`)
- L'app si avvia e il tab Movimenti funziona correttamente

---

## Valori che restano in `App.tsx` dopo il Passo C

I seguenti elementi **non vanno rimossi** dall'App.tsx:

| Elemento | Righe (stimate post-rimozioni) | Motivo |
|---|---|---|
| `recentTransactionsNav` | ~218–246 | Usato nel tab Dashboard (non estratto in questo passo) |
| `useEffect(showDeleteDialog)` | ~117–120 | Rimane; ora legge da context invece che da useState locale |
| `editingTransaction`, `showTransactionDialog` | da context | Usati dai Dialog al fondo di App.tsx |
| `deletingItem`, `showDeleteDialog` | da context | Usati dal AlertDialog al fondo di App.tsx |
| `visibleTransactions`, `visibleAccounts` | `useMemo` locale | Usati da DashboardTab, ReportsTab, header, dialog |
| Import `PencilSimple`, `Trash` | riga ~47 | Verificare: se usati anche nel tab Dashboard, restano; altrimenti rimuovere |
| Import `DownloadSimple` | riga ~47 | Verificare: se usato solo nel tab estratto, rimuovere |
| Import `ArrowsLeftRight` | riga ~47 | Usato nel `TabsTrigger`, rimane |
