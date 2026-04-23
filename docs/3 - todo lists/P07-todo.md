# P07 — Todo List: Estrazione `TransactionsTab`

> Checklist operativa sequenziale per il Pacchetto 7.  
> Coding Plan di riferimento: `docs/2 - coding plans/P07-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P07-TransactionsTab-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [ ] Leggere `docs/2 - coding plans/P07-coding-plan.md` per intero
- [ ] Prendere nota dell'ambiguità **AI1** (`visibleTransactions` NON è ordinato — usare `sortedTransactions` nel componente)
- [ ] Prendere nota dell'ambiguità **AI2** (`handleDeleteConfirm` cambia firma: rimuovere il parametro `item`)
- [ ] Prendere nota dell'ambiguità **AI3** (`useEffect(showDeleteDialog)` rimane in `App.tsx` ma legge dal context)
- [ ] Prendere nota dell'ambiguità **AI4** (`TransactionsTab` usa solo i setter, non i booleani)
- [ ] Verificare di essere sul branch `refactoring-architettura`
- [ ] Eseguire `npm run build` e confermare che compila senza errori **prima** di iniziare

---

## Passo A — Modifica `src/context/AppDataContext.tsx`

> **Prerequisito**: nessuno (P01–P06 già presenti nel branch).

### A.1 Aggiornamento import React

- [ ] Aprire `src/context/AppDataContext.tsx`
- [ ] Individuare riga 1: `import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'`
- [ ] ⚠️ **R3**: aggiungere `useState` all'import → `import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'`

### A.2 Aggiornamento del tipo `AppDataContextValue` (righe ~12–44)

- [ ] Individuare la chiusura `}` del tipo `AppDataContextValue` (dopo `handleViewBudget`)
- [ ] Aggiungere prima della chiusura le 8 nuove proprietà (vedi coding plan §A.2)
- [ ] ⚠️ **AI2**: aggiornare `handleDeleteConfirm` in interfaccia da `(item: {...}) => void` a `() => void`

### A.3 Dichiarazione dei 4 `useState` in `AppDataProvider`

- [ ] Individuare il blocco degli `useState` existenti (~riga 67), dopo `const [budgetPercentages, setBudgetPercentages] = useKV<...>`
- [ ] Aggiungere subito dopo (prima di `const safeAccounts = useMemo...`):
  - [ ] `const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)`
  - [ ] `const [showTransactionDialog, setShowTransactionDialog] = useState(false)`
  - [ ] `const [deletingItem, setDeletingItem] = useState<{...} | null>(null)` (tipo con union e `;` come separatori)
  - [ ] `const [showDeleteDialog, setShowDeleteDialog] = useState(false)`

### A.4 Aggiornamento di `handleDeleteConfirm` (~riga 225)

- [ ] Individuare `const handleDeleteConfirm = (item: { type: ..., id: string }) => {`
- [ ] ⚠️ **AI2**: cambiare la firma a `const handleDeleteConfirm = () => {`
- [ ] Aggiungere guard all'inizio del corpo: `if (!deletingItem) return`
- [ ] Sostituire tutti i riferimenti a `item.type` e `item.id` con `deletingItem.type` e `deletingItem.id`
- [ ] Verificare che nessun riferimento a `item` rimanga nel corpo della funzione

### A.5 Aggiornamento del valore del Provider (~righe 340–390)

- [ ] Individuare `<AppDataContext.Provider value={{ ... }}>` 
- [ ] Aggiungere all'oggetto value i nuovi 8 valori:
  - [ ] `editingTransaction,`
  - [ ] `setEditingTransaction,`
  - [ ] `showTransactionDialog,`
  - [ ] `setShowTransactionDialog,`
  - [ ] `deletingItem,`
  - [ ] `setDeletingItem,`
  - [ ] `showDeleteDialog,`
  - [ ] `setShowDeleteDialog,`

### A.6 Verifica del Passo A

- [ ] Salvare il file
- [ ] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [ ] Verificare che `handleDeleteConfirm` nel tipo abbia firma `() => void`
- [ ] ⚠️ **R2**: non procedere al Passo B fino a zero errori TypeScript

---

## Passo B — Creazione `src/components/TransactionsTab.tsx`

> **Prerequisito**: Passo A completato e verificato (`tsc --noEmit` a zero errori) ✓

### B.1 Creazione del file e import

- [ ] Creare il file `src/components/TransactionsTab.tsx` vuoto
- [ ] Aggiungere import da `react`: `useMemo`
- [ ] Aggiungere import da `@/context/AppDataContext`: `useAppData`
- [ ] Aggiungere import da `@/context/AuthContext`: `useAuth`
- [ ] Aggiungere import da `@/hooks/use-visible-data`: `useVisibleData`
- [ ] Aggiungere import da `@/hooks/use-mobile`: `useIsMobile`
- [ ] Aggiungere import da `@/hooks/use-list-navigation`: `useListNavigation`
- [ ] Aggiungere import da `@/lib/helpers`: `formatCurrency`
- [ ] Aggiungere import da `@/components/ui/button`: `Button`
- [ ] Aggiungere import da `@/components/ui/card`: `Card`, `CardContent`
- [ ] Aggiungere import da `@/components/ui/badge`: `Badge`
- [ ] Aggiungere import da `@/components/ui/tabs`: `TabsContent`
- [ ] Aggiungere import da `@phosphor-icons/react`: `DownloadSimple`, `Plus`, `PencilSimple`, `Trash`

### B.2 Firma del componente

- [ ] Aprire `export function TransactionsTab() {`
- [ ] Verificare che il componente non abbia props — se ne servisse una in futuro, andrà aggiunta esplicitamente

### B.3 Sorgenti dati

- [ ] Destructure da `useAppData()`: `safeCategories`, `handleExportCSV`, `setEditingTransaction`, `setShowTransactionDialog`, `setDeletingItem`, `setShowDeleteDialog`
- [ ] Destructure da `useAuth()`: `isAuthenticated`
- [ ] Destructure da `useVisibleData()`: `visibleTransactions`, `visibleAccounts`
- [ ] Dichiarare `const isMobile = useIsMobile()`

### B.4 Creazione di `sortedTransactions`

- [ ] ⚠️ **AI1** — Aggiungere prima di `allTransactionsNav`:
  ```ts
  const sortedTransactions = useMemo(
    () => [...visibleTransactions].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [visibleTransactions]
  )
  ```
- [ ] ⚠️ **AI1**: NON usare `[...visibleTransactions].sort(...)` altrove nel componente — usare sempre `sortedTransactions`

### B.5 Inizializzazione di `allTransactionsNav`

- [ ] Aprire il blocco `const allTransactionsNav = useListNavigation({`
- [ ] Impostare `itemCount: sortedTransactions.length`
- [ ] ⚠️ **R5**: impostare `enabled: isAuthenticated` (non omettere)
- [ ] Aggiungere callback `onEnter`: usa `sortedTransactions[index]` — **senza `.sort()`** aggiuntivo
- [ ] Aggiungere callback `onDelete`: usa `sortedTransactions[index]` — **senza `.sort()`** aggiuntivo
- [ ] Aggiungere callback `onEdit`: usa `sortedTransactions[index]` — **senza `.sort()`** aggiuntivo

### B.6 JSX del componente

- [ ] Aprire `src/App.tsx` e copiare il blocco `<TabsContent value="transactions" ...>` (righe 762–899)
- [ ] Incollare il JSX come return del componente
- [ ] ⚠️ **AI1**: sostituire `[...visibleTransactions].sort((a, b) => ...).map(...)` con `sortedTransactions.map(...)`
- [ ] Verificare che `visibleTransactions.length === 0` (stato vuoto) e `visibleTransactions.length > 0` (badge) rimangano invariati — sono corretti
- [ ] Verificare che `handleExportCSV(visibleTransactions, visibleAccounts)` sia invariato — la firma non cambia
- [ ] Verificare che `allTransactionsNav.isFocused(index)` e `allTransactionsNav.setFocusedIndex(index)` siano corretti
- [ ] Verificare che tutti i `setEditingTransaction`, `setShowTransactionDialog`, `setDeletingItem`, `setShowDeleteDialog` siano disponibili localmente (da B.3)
- [ ] Chiudere la funzione componente con `}`

### B.7 Verifica del Passo B

- [ ] Salvare il file
- [ ] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [ ] Verificare che `src/components/TransactionsTab.tsx` esista
- [ ] Verificare che `export function TransactionsTab` sia presente
- [ ] L'app **non cambia ancora** (`App.tsx` non è stato modificato in questo passo)

---

## Passo C — Modifica `src/App.tsx`

> **Prerequisito**: Passi A e B completati e verificati (`tsc --noEmit` a zero errori) ✓

### C.1 Aggiunta import `TransactionsTab`

- [ ] Aprire `src/App.tsx`
- [ ] Individuare l'ultimo import (~riga 52)
- [ ] Aggiungere: `import { TransactionsTab } from '@/components/TransactionsTab'`

### C.2 Aggiornamento destructuring `useAppData()` (~righe 70–88)

- [ ] Individuare il blocco di destructuring di `useAppData()`
- [ ] Aggiungere i 8 nuovi valori esposti dal context (vedi coding plan §C.3)

### C.3 Rimozione dei 4 `useState` locali dialog (~righe 100–110)

- [ ] Rimuovere riga ~100: `const [showTransactionDialog, setShowTransactionDialog] = useState(false)`
- [ ] Rimuovere riga ~103: `const [showDeleteDialog, setShowDeleteDialog] = useState(false)`
- [ ] Rimuovere riga ~107: `const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>()`
- [ ] Rimuovere riga ~110: `const [deletingItem, setDeletingItem] = useState<{...} | null>(null)`
- [ ] Verificare che `showAccountDialog`, `showBudgetDialog`, `showSavingsGoalDialog`, `showKeyboardHelp`, `editingAccount`, `editingBudget`, `editingSavingsGoal` **NON** vengano rimossi (non si spostano in questo passo)

### C.4 Rimozione di `allTransactionsNav` (~righe 247–276)

- [ ] Individuare `const allTransactionsNav = useListNavigation({` (~riga 247)
- [ ] Individuare la chiusura `})` del blocco (~riga 276)
- [ ] ⚠️ Verificare che `recentTransactionsNav` (blocco immediatamente precedente, ~righe 218–246) **NON** venga rimosso
- [ ] Rimuovere solo il blocco `allTransactionsNav` (~30 righe)

### C.5 Sostituzione del blocco `TabsContent value="transactions"` (righe ~762–899 post-precedenti rimozioni)

- [ ] Individuare `<TabsContent value="transactions"` nel JSX
- [ ] Individuare la chiusura `</TabsContent>` corrispondente (~138 righe più in basso)
- [ ] Rimuovere l'intero blocco (~138 righe)
- [ ] Inserire al suo posto: `<TransactionsTab />`
- [ ] Verificare che `<TabsContent value="dashboard"` e `<TabsContent value="reports"` rimangano invariati

### C.6 Aggiornamento call site `handleDeleteConfirm` (~riga 1320 → ricalcolata)

- [ ] Cercare nel file: `handleDeleteConfirm(deletingItem)`
- [ ] ⚠️ **AI2**: sostituire `onClick={() => { if (deletingItem) handleDeleteConfirm(deletingItem) }}` con `onClick={() => handleDeleteConfirm()}`

### C.7 Verifica import inutilizzati

- [ ] Cercare `DownloadSimple` in `App.tsx` — se non usato nel JSX rimanente, rimuovere dall'import
- [ ] Cercare `PencilSimple` in `App.tsx` — se non usato nel JSX rimanente (tab Dashboard usa altri pattern?), rimuovere
- [ ] Cercare `Trash` in `App.tsx` — stessa verifica

### C.8 Verifica del Passo C

- [ ] Salvare il file
- [ ] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [ ] Eseguire `npm run build` → compilazione riuscita senza errori
- [ ] Eseguire `grep "allTransactionsNav" src/App.tsx` → zero risultati
- [ ] Eseguire `grep "TabsContent value=\"transactions\"" src/App.tsx` → zero risultati
- [ ] Eseguire `grep "TransactionsTab" src/App.tsx` → 2 risultati (import + `<TransactionsTab />`)

---

## Verifica finale

### Compilazione

- [ ] `npx tsc --noEmit` → zero errori TypeScript
- [ ] `npm run build` → compilazione riuscita senza errori o warning

### Test manuale — 14 scenari (tutti obbligatori)

> ⚠️ Aprire prima il tab Movimenti, verificare che sia visibile e non bianco.

- [ ] **Scenario 1** — Aprire il tab Movimenti → tutti i movimenti visibili in ordine cronologico decrescente
- [ ] **Scenario 2** — Cliccare "Nuovo Movimento" → `TransactionDialog` apre con form vuoto
- [ ] **Scenario 3** — Cliccare il pulsante matita su un movimento → `TransactionDialog` precompilato con dati corretti
- [ ] **Scenario 4** — Cliccare il pulsante cestino su un movimento → `AlertDialog` di conferma apre
- [ ] **Scenario 5** — Confermare eliminazione → movimento rimosso dalla lista
- [ ] **Scenario 6** — Premere ↑/↓ sulla lista → focus si sposta tra le righe con highlight visivo
- [ ] **Scenario 7** — Premere Enter su un movimento focalizzato → `TransactionDialog` apre sul movimento corretto
- [ ] **Scenario 8** — Premere Del su un movimento focalizzato → `AlertDialog` apre sul movimento corretto
- [ ] **Scenario 9** — Cliccare "Esporta CSV" → file CSV scaricato con tutti i movimenti visibili
- [ ] **Scenario 10** — Usare Ctrl+E (da qualsiasi tab) → file CSV scaricato
- [ ] **Scenario 11** — Usare Ctrl+N → `TransactionDialog` apre in modalità creazione
- [ ] **Scenario 12** — Navigare a Dashboard e tornare a Movimenti → lista corretta, nessuna regressione visiva
- [ ] **Scenario 13** — Navigare al tab Report → nessuna regressione nelle card budget, obiettivi, impostazioni
- [ ] **Scenario 14** — ⚠️ Test accessibilità: il conteggio movimenti viene annunciato al cambio tab; i pulsanti modifica/elimina hanno `aria-label` corretti

### Test di regressione

- [ ] Login con PIN globale → accesso concesso normalmente
- [ ] Aggiungere un movimento dal tab Dashboard (pulsante header) → toast "Movimento aggiunto"
- [ ] Aggiungere un movimento dal tab Movimenti → toast "Movimento aggiunto"
- [ ] Modificare un conto → toast "Conto modificato"
- [ ] Eliminare un budget dal tab Report → `AlertDialog` apre, conferma elimina il budget
- [ ] Shortcut `Ctrl+D`, `Ctrl+T`, `Ctrl+R` → navigazione corretta tra tab
- [ ] Shortcut `Ctrl+N` da tab Dashboard → `TransactionDialog` apre
- [ ] Shortcut `Ctrl+N` da tab Movimenti → `TransactionDialog` apre
- [ ] Shortcut `Shift+?` → dialog Aiuto Tastiera apre
- [ ] Nessun errore in console (F12) durante la navigazione normale

### Accessibilità (screen reader)

- [ ] Con NVDA attivo: passare al tab Movimenti → annuncio conteggio movimenti
- [ ] Con NVDA attivo: pulsante matita → `aria-label="Modifica movimento"` letto correttamente
- [ ] Con NVDA attivo: pulsante cestino → `aria-label="Elimina movimento"` letto correttamente
- [ ] Con NVDA attivo: `↑/↓` sulla lista → `data-focus-info` letto come hint di navigazione
