# P09 — Todo List: Estrazione `ReportsTab`

> Checklist operativa sequenziale per il Pacchetto 9.  
> Coding Plan di riferimento: `docs/2 - coding plans/P09-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P09-ReportsTab-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [x] Leggere `docs/2 - coding plans/P09-coding-plan.md` per intero
- [x] Prendere nota dell'ambiguità **AI1** (`handleAddFundsToGoal` va dichiarato **dopo** i 4 `useState` da cui dipende — non prima)
- [x] Prendere nota dell'ambiguità **AI2** (`chartPeriod` non si rimuove nel Passo A: rimane in `App.tsx` fino al Passo C, poi si rimuove quando TypeScript lo segnala come inutilizzato)
- [x] Prendere nota dell'ambiguità **AI3** (`soundSystem` e `hapticSystem` vanno importati direttamente in `ReportsTab.tsx` da `@/lib/sound-system` e `@/lib/haptic-system` se usati negli `onClick` inline)
- [x] Prendere nota dell'ambiguità **AI4** (icone base: `Plus`, `Gear`, `Target`, `Info`, `PiggyBank` — aggiungere `PencilSimple`/`Trash` solo se compaiono nel JSX fuori dai componenti estratti)
- [x] Prendere nota di **R1** (`setTimeout(300ms)` nella callback `BudgetAlertBanner` in `App.tsx` — non toccare mai)
- [x] Prendere nota di **R4** (il Passo B dipende interamente dal Passo A completato con `tsc --noEmit` a zero errori)
- [x] Prendere nota di **R7** (`SavingsGoalCard` usa `accounts={safeAccounts}` — non `visibleAccounts`)
- [x] Verificare di essere sul branch `refactoring-architettura`
- [x] Eseguire `npm run build` e confermare che compila senza errori **prima** di iniziare

---

## Passo A — Modifica `src/context/AppDataContext.tsx` e `src/App.tsx`

> **Prerequisito**: nessuno (P01–P08 già presenti nel branch).

### A.1 Aggiornamento del tipo `AppDataContextValue` (~righe 12–63)

- [x] Aprire `src/context/AppDataContext.tsx`
- [x] Individuare `setShowAccountDialog: (v: boolean) => void` (~riga 62) — ultima riga del blocco dialog account
- [x] Aggiungere **dopo** quella riga e **prima** della chiusura `}` del tipo:
  ```ts
  // Dialog budget
  showBudgetDialog: boolean
  setShowBudgetDialog: (v: boolean) => void
  editingBudget: Budget | undefined
  setEditingBudget: (b: Budget | undefined) => void
  // Dialog savings goal
  showSavingsGoalDialog: boolean
  setShowSavingsGoalDialog: (v: boolean) => void
  editingSavingsGoal: SavingsGoal | undefined
  setEditingSavingsGoal: (g: SavingsGoal | undefined) => void
  // Handler derivato
  handleAddFundsToGoal: (goal: SavingsGoal) => void
  ```
- [x] Verificare che `Budget` e `SavingsGoal` siano già nell'import a riga 3 ✓

### A.2 Dichiarazione dei 4 `useState` in `AppDataProvider` (dopo riga ~86)

- [x] Individuare `const [showAccountDialog, setShowAccountDialog] = useState(false)` (~riga 86)
- [x] Aggiungere subito **dopo** (prima di `const safeAccounts = useMemo(...)`):
  ```ts
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined)
  const [showSavingsGoalDialog, setShowSavingsGoalDialog] = useState(false)
  const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>(undefined)
  ```

### A.3 Dichiarazione di `handleAddFundsToGoal` nel corpo di `AppDataProvider` (dopo A.2)

- [x] ⚠️ **AI1**: aggiungere **dopo** i 4 `useState` del passo A.2 (non prima — dipende da `setEditingSavingsGoal` e `setShowSavingsGoalDialog`):
  ```ts
  const handleAddFundsToGoal = (goal: SavingsGoal) => {
    setEditingSavingsGoal(goal)
    setShowSavingsGoalDialog(true)
  }
  ```

### A.4 Aggiornamento del valore del Provider (~riga ~409)

- [x] Individuare `setShowAccountDialog,` nell'oggetto `value` di `AppDataContext.Provider`
- [x] Aggiungere subito **dopo**:
  ```ts
  showBudgetDialog, setShowBudgetDialog,
  editingBudget, setEditingBudget,
  showSavingsGoalDialog, setShowSavingsGoalDialog,
  editingSavingsGoal, setEditingSavingsGoal,
  handleAddFundsToGoal,
  ```

### A.5 Aggiornamento destructuring `useAppData()` in `App.tsx` (~righe 80–101)

- [x] Aprire `src/App.tsx`
- [x] Individuare il blocco `const { ... } = useAppData()`
- [x] Aggiungere i nuovi campi dopo `setShowAccountDialog,` (~riga 100):
  ```ts
  showBudgetDialog, setShowBudgetDialog,
  editingBudget, setEditingBudget,
  showSavingsGoalDialog, setShowSavingsGoalDialog,
  editingSavingsGoal, setEditingSavingsGoal,
  handleAddFundsToGoal,
  ```

### A.6 Rimozione degli `useState` locali in `App.tsx`

- [x] Individuare e rimuovere ~riga 113: `const [showBudgetDialog, setShowBudgetDialog] = useState(false)`
- [x] Individuare e rimuovere ~riga 114: `const [showSavingsGoalDialog, setShowSavingsGoalDialog] = useState(false)`
- [x] ⚠️ **Non rimuovere** ~riga 115: `const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)` — rimane locale in `App.tsx`
- [x] Individuare e rimuovere ~riga 117: `const [editingBudget, setEditingBudget] = useState<Budget | undefined>()`
- [x] Individuare e rimuovere ~riga 118: `const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>()`
- [x] ⚠️ **Non rimuovere** ~righe 120–122: `activeTab`, `chartPeriod`, `previousTab` — rimangono in `App.tsx` per ora (⚠️ **AI2**: `chartPeriod` verrà rimosso nel Passo C)

### A.7 Rimozione di `handleAddFundsToGoal` locale da `App.tsx` (~righe 130–133)

- [x] Individuare e rimuovere la funzione locale:
  ```ts
  const handleAddFundsToGoal = (goal: SavingsGoal) => {
    setEditingSavingsGoal(goal)
    setShowSavingsGoalDialog(true)
  }
  ```
- [x] Verificare che il blocco `useEffect(() => { if (showDeleteDialog) { ... } }, [showDeleteDialog])` (~righe 124–128) **non venga rimosso**

### A.8 Verifica del Passo A

- [x] Salvare entrambi i file
- [x] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Verificare che `useAppData()` esponga `showBudgetDialog`, `editingBudget`, `showSavingsGoalDialog`, `editingSavingsGoal`, `handleAddFundsToGoal`
- [x] Verificare che `App.tsx` non contenga più `useState` locali per `showBudgetDialog`, `showSavingsGoalDialog`, `editingBudget`, `editingSavingsGoal`
- [x] Verificare che `App.tsx` non contenga più la funzione locale `handleAddFundsToGoal`
- [x] ⚠️ **R1**: verificare che il blocco `BudgetAlertBanner` con `setTimeout(300ms)` in `App.tsx` sia invariato:
  ```tsx
  onViewBudget={(id) => handleViewBudget(id, (budget) => {
    setActiveTab('reports')
    setTimeout(() => {
      setEditingBudget(budget)
      setShowBudgetDialog(true)
    }, 300)
  })}
  ```
- [x] ⚠️ **R4**: non procedere al Passo B fino a zero errori TypeScript

***

---

## Passo B — Creazione `src/components/ReportsTab.tsx`

> **Prerequisito**: Passo A completato e verificato (`tsc --noEmit` a zero errori) ✓

### B.1 Creazione del file e import

- [x] Creare il file `src/components/ReportsTab.tsx` vuoto
- [x] Aggiungere import da `react`: `useState`, `useMemo`
- [x] Aggiungere import da `@/context/AppDataContext`: `useAppData`
- [x] Aggiungere import da `@/hooks/use-visible-data`: `useVisibleData`
- [x] ⚠️ **R1**: aggiungere import da `@/lib/helpers`: `formatCurrency`, `calculateAccountBalance`, `getActiveBudgets` — importati **direttamente**, non via context
- [x] ⚠️ **AI3**: aggiungere import da `@/lib/sound-system`: `soundSystem` (se usato negli `onClick` inline — verificare in B.8)
- [x] ⚠️ **AI3**: aggiungere import da `@/lib/haptic-system`: `hapticSystem` (se usato negli `onClick` inline — verificare in B.8)
- [x] Aggiungere import dei componenti estratti:
  - `BudgetProgressCard` da `@/components/BudgetProgressCard`
  - `BudgetForecastCard` da `@/components/BudgetForecastCard`
  - `BudgetHistoryChart` da `@/components/BudgetHistoryChart`
  - `BudgetComparisonCard` da `@/components/BudgetComparisonCard`
  - `SavingsGoalCard` da `@/components/SavingsGoalCard`
  - `PeriodSelector` da `@/components/PeriodSelector`
  - `IncomeExpenseChart` da `@/components/IncomeExpenseChart`
  - `MonthlyComparisonChart` da `@/components/MonthlyComparisonChart`
  - `SecuritySettings` da `@/components/SecuritySettings`
  - `CategoryManagement` da `@/components/CategoryManagement`
  - `DataManagement` da `@/components/DataManagement`
  - `DisplaySettings` da `@/components/DisplaySettings`
  - `AudioSettings` da `@/components/AudioSettings`
  - `HapticSettings` da `@/components/HapticSettings`
  - `ScreenReaderSettings` da `@/components/ScreenReaderSettings`
  - `TalkBackSettings` da `@/components/TalkBackSettings`
- [x] Aggiungere import da `@/components/ui/button`: `Button`
- [x] Aggiungere import da `@/components/ui/card`: `Card`, `CardContent`, `CardHeader`, `CardTitle`
- [x] Aggiungere import da `@/components/ui/tabs`: `TabsContent`
- [x] Aggiungere import da `@/components/ui/tooltip`: `Tooltip`, `TooltipContent`, `TooltipTrigger`
- [x] ⚠️ **R6**: aggiungere import da `@phosphor-icons/react`: `Plus`, `Gear`, `Target`, `Info`, `PiggyBank`
- [x] ⚠️ **AI4**: verificare durante B.8 se servono ulteriori icone (`PencilSimple`, `Trash`) — aggiungere solo se referenziate nel JSX fuori dai componenti estratti
- [x] Verificare dal JSX se sono necessari ulteriori import da `@/components/ui/` (es. `Separator`, `Badge`) — aggiungere solo quelli referenziati

### B.2 Firma del componente

- [x] Aprire `export function ReportsTab() {`
- [x] Verificare che il componente non abbia props

### B.3 Sorgenti dati — destructuring

- [x] Destructure da `useAppData()`:
  - `safeCategories`
  - `safeBudgets`
  - `safeSavingsGoals`
  - `safeAccounts`
  - `showBudgetDialog`, `setShowBudgetDialog`
  - `editingBudget`, `setEditingBudget`
  - `showSavingsGoalDialog`, `setShowSavingsGoalDialog`
  - `editingSavingsGoal`, `setEditingSavingsGoal`
  - `handleAddFundsToGoal`
  - `setDeletingItem`
  - `setShowDeleteDialog`
- [x] Destructure da `useVisibleData()`:
  - `visibleAccounts`
  - `visibleTransactions`
  - `totalBalance`
- [x] Verificare che **non** siano inclusi nella destructuring: `recentTransactions`, `groupedAccounts`, `filteredGroupedAccounts`, `editingAccount`, `showAccountDialog`, `editingTransaction`, `showTransactionDialog`

### B.4 Stato locale `chartPeriod`

- [x] ⚠️ **Design §6** — dichiarare `chartPeriod` come `useState` locale (NON in AppDataContext):
  ```ts
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month')
  ```

### B.5 `useMemo` — `activeBudgets`

- [x] ⚠️ **Design §5.B** — dichiarare il `useMemo` che sostituisce le 4 chiamate `getActiveBudgets(safeBudgets)`:
  ```ts
  const activeBudgets = useMemo(
    () => getActiveBudgets(safeBudgets),
    [safeBudgets]
  )
  ```

### B.6 `useMemo` — `topIncomeCategories`

- [x] ⚠️ **Design §5.A** — dichiarare il `useMemo` che sostituisce la IIFE nella card "Totale Entrate":
  ```ts
  const topIncomeCategories = useMemo(() => {
    const byCategory = visibleTransactions
      .filter(t => t.tipo === 'entrata')
      .reduce((acc, t) => {
        const category = safeCategories.find(c => c.id === t.categoriaId)
        const catName = category?.nome || 'Senza categoria'
        acc[catName] = (acc[catName] || 0) + t.importo
        return acc
      }, {} as Record<string, number>)
    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [visibleTransactions, safeCategories])
  ```

### B.7 `useMemo` — `topExpenseCategories`

- [x] ⚠️ **Design §5.A** — dichiarare il `useMemo` che sostituisce la IIFE nella card "Totale Uscite":
  ```ts
  const topExpenseCategories = useMemo(() => {
    const byCategory = visibleTransactions
      .filter(t => t.tipo === 'uscita')
      .reduce((acc, t) => {
        const category = safeCategories.find(c => c.id === t.categoriaId)
        const catName = category?.nome || 'Senza categoria'
        acc[catName] = (acc[catName] || 0) + t.importo
        return acc
      }, {} as Record<string, number>)
    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [visibleTransactions, safeCategories])
  ```

### B.8 JSX del componente

- [x] Aprire `src/App.tsx` e individuare il blocco `<TabsContent value="reports" ...>` (~riga 417)
- [x] Individuare la chiusura `</TabsContent>` corrispondente (~riga 757)
- [x] Copiare il blocco (~341 righe) come `return (...)` del componente

**Modifiche obbligatorie durante la copia:**

- [x] ⚠️ **Design §5.B** — sostituire ogni `getActiveBudgets(safeBudgets)` con `activeBudgets` — **4 occorrenze**:
  - Guard empty state (~riga 470 originale)
  - Map `BudgetProgressCard` (~riga 583 originale)
  - Map `BudgetForecastCard` (~riga 592 originale)
  - Map griglia storica `BudgetHistoryChart`+`BudgetComparisonCard` (~riga 620 originale)
- [x] ⚠️ **Design §5.A** — sostituire la IIFE nella card "Totale Entrate" (~righe 487–510 originali) con `topIncomeCategories.length > 0 ? ... : ...`
- [x] ⚠️ **Design §5.A** — sostituire la IIFE nella card "Totale Uscite" (~righe 527–545 originali) con `topExpenseCategories.length > 0 ? ... : ...`
- [x] ⚠️ **R7** — verificare esplicitamente che `SavingsGoalCard` riceva `accounts={safeAccounts}` — NON modificare con `visibleAccounts`
- [x] ⚠️ **R1** — il blocco JSX estratto **non include** la callback `BudgetAlertBanner` (quella rimane in `App.tsx` con il `setTimeout(300ms)` intatto)

### B.9 Verifica del Passo B

- [x] Salvare il file
- [x] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Verificare che `src/components/ReportsTab.tsx` esista con `export function ReportsTab`
- [x] Verificare: `grep "getActiveBudgets(safeBudgets)" src/components/ReportsTab.tsx` → zero risultati
- [x] Verificare che le 2 IIFE siano state rimosse e sostituite con `topIncomeCategories`/`topExpenseCategories`
- [x] L'app **non cambia ancora** — `App.tsx` non è stato modificato in questo passo

***

---

## Passo C — Modifica `src/App.tsx`

> **Prerequisito**: Passi A e B completati e verificati (`tsc --noEmit` a zero errori) ✓

### C.1 Aggiunta import `ReportsTab` (~riga 35)

- [x] Aprire `src/App.tsx`
- [x] Aggiungere vicino all'import di `DashboardTab`:
  ```ts
  import { ReportsTab } from '@/components/ReportsTab'
  ```

### C.2 Rimozione del blocco `TabsContent value="reports"` (~righe 417–757)

- [x] Individuare `<TabsContent value="reports" ...>` (~riga 417)
- [x] Individuare la chiusura `</TabsContent>` corrispondente (~riga 757)
- [x] Rimuovere l'intero blocco (~341 righe)
- [x] Inserire al posto del blocco rimosso:
  ```tsx
  <ReportsTab />
  ```
- [x] Verificare che `<DashboardTab />` e `<TransactionsTab />` rimangano al loro posto
- [x] ⚠️ **R1** — verificare che il blocco `BudgetAlertBanner` con `onViewBudget` e `setTimeout(300ms)` rimanga invariato nella sua posizione in `App.tsx`

### C.3 Rimozione di `chartPeriod` da `App.tsx` (~riga 121)

- [x] ⚠️ **AI2** — dopo la rimozione del blocco JSX, TypeScript segnala `chartPeriod` e `setChartPeriod` come non utilizzati
- [x] Rimuovere la riga:
  ```ts
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month')
  ```

### C.4 Verifica import inutilizzati in `App.tsx`

- [x] Affidarsi agli errori TypeScript per identificare import diventati inutilizzati
- [x] Rimuovere solo gli import che TypeScript segnala come inutilizzati
- [x] ⚠️ Non rimuovere import speculativamente

### C.5 Verifica del Passo C

- [x] Salvare il file
- [x] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Eseguire `npm run build` → compilazione riuscita senza errori
- [x] `grep "TabsContent value=\"reports\"" src/App.tsx` → zero risultati
- [x] `grep "ReportsTab" src/App.tsx` → 2 risultati (import + `<ReportsTab />`)
- [x] `grep "chartPeriod" src/App.tsx` → zero risultati
- [ ] `grep "getActiveBudgets" src/components/ReportsTab.tsx` → zero risultati

***

---

## Verifica finale

### Compilazione

- [x] `npx tsc --noEmit` → zero errori TypeScript
- [x] `npm run build` → compilazione riuscita senza errori o warning

### Test manuale — 34 scenari (tutti obbligatori)

> ⚠️ Aprire il tab Report per prima cosa e verificare che non sia bianco.

**Area statistiche:**
- [ ] **Scenario 1** — Aprire il tab Report → `MonthlyComparisonChart` e le tre card statistiche visibili
- [ ] **Scenario 2** — Card "Saldo Totale" → valore corretto; Tooltip riporta n. conti, entrate totali, uscite totali, saldo netto
- [ ] **Scenario 3** — Card "Totale Entrate" → somma corretta delle entrate
- [ ] **Scenario 4** — Tooltip "Totale Entrate" con transazioni → top 3 categorie con importi corretti
- [ ] **Scenario 5** — Tooltip "Totale Entrate" senza entrate → compare "Nessuna entrata registrata"
- [ ] **Scenario 6** — Card "Totale Uscite" → somma corretta delle uscite
- [ ] **Scenario 7** — Tooltip "Totale Uscite" con transazioni → top 3 categorie di spesa con importi corretti
- [ ] **Scenario 8** — Tooltip "Totale Uscite" senza uscite → compare "Nessuna uscita registrata"
- [ ] **Scenario 9** — Card "Dettaglio Conti" → ogni conto visibile con saldo calcolato correttamente

**Area grafici:**
- [ ] **Scenario 10** — `PeriodSelector` visibile → cinque bottoni periodo presenti
- [ ] **Scenario 11** — Click su periodo diverso → `IncomeExpenseChart` si aggiorna con il periodo selezionato
- [ ] **Scenario 12** — `MonthlyComparisonChart` → comparazione mensile basata su `visibleTransactions`

**Area budget:**
- [ ] **Scenario 13** — Nessun budget attivo → empty state con pulsante "Crea il Primo Budget"
- [ ] **Scenario 14** — Click "Crea il Primo Budget" o "Nuovo Budget" → `BudgetDialog` apre con form vuoto
- [ ] **Scenario 15** — Click modifica budget esistente → `BudgetDialog` apre precompilato
- [ ] **Scenario 16** — Click elimina budget → `AlertDialog` di conferma apre
- [ ] **Scenario 17** — Conferma eliminazione → budget sparisce da tutte e tre le griglie
- [ ] **Scenario 18** — Budget attivi presenti → tre griglie visibili (progressi, previsioni, analisi storica)
- [ ] **Scenario 19** — Ogni budget appare in tutte e tre le griglie → `BudgetProgressCard`, `BudgetForecastCard`, `BudgetHistoryChart`+`BudgetComparisonCard` renderizzati per ogni budget attivo

**Area obiettivi di risparmio:**
- [ ] **Scenario 20** — Nessun obiettivo → empty state con pulsante "Crea il Primo Obiettivo"
- [ ] **Scenario 21** — Click "Crea il Primo Obiettivo" o "Nuovo Obiettivo" → `SavingsGoalDialog` apre vuoto
- [ ] **Scenario 22** — Click modifica obiettivo → `SavingsGoalDialog` apre precompilato
- [ ] **Scenario 23** — Click "Aggiungi Fondi" → `SavingsGoalDialog` apre precompilato sull'obiettivo (via `handleAddFundsToGoal`)
- [ ] **Scenario 24** — Click elimina obiettivo → `AlertDialog` di conferma apre
- [ ] **Scenario 25** — Conferma eliminazione → obiettivo sparisce dalla griglia

**Area impostazioni:**
- [ ] **Scenario 26** — `SecuritySettings` visibile e interattiva → sezione PIN presente; dialog cambio PIN si apre
- [ ] **Scenario 27** — `CategoryManagement` visibile e interattiva → categorie elencate con pulsanti funzionanti
- [ ] **Scenario 28** — `DataManagement` visibile → pulsante Export CSV presente
- [ ] **Scenario 29** — Export CSV → avvia il download del file con dati corretti
- [ ] **Scenario 30** — `DisplaySettings`, `AudioSettings`, `HapticSettings`, `ScreenReaderSettings`, `TalkBackSettings` → tutti visibili; preferenze si salvano e persistono al reload

**Regressioni:**
- [ ] **Scenario 31** — Tab Movimenti → `TransactionsTab` funziona identicamente a prima del Passo 9
- [ ] **Scenario 32** — Tab Dashboard → `DashboardTab` funziona identicamente a prima del Passo 9
- [ ] **Scenario 33** — `BudgetAlertBanner` → click "Visualizza Budget" → naviga al tab Report e apre `BudgetDialog` precompilato (timeout 300ms intatto)
- [ ] **Scenario 34** — Shortcut globali da qualsiasi tab → Ctrl+N, Ctrl+M, Ctrl+D, Ctrl+T, Ctrl+R ancora funzionanti

### Test di regressione shortcut globali

- [ ] Ctrl+D → naviga al tab Dashboard
- [ ] Ctrl+T → naviga al tab Movimenti
- [ ] Ctrl+R → naviga al tab Report
- [ ] Ctrl+N → apre `TransactionDialog` vuoto
- [ ] Ctrl+M → apre `AccountDialog` vuoto
- [ ] ? → apre finestra scorciatoie da tastiera

### Test accessibilità impostazioni

- [ ] Aprire la sezione Impostazioni nel tab Report con screen reader attivo
- [ ] Verificare che tutte le sotto-sezioni siano raggiungibili da tastiera
- [ ] Verificare che i titoli delle sezioni siano annunciati correttamente

***

**Nota stato al 2026-04-23:** implementazione completata e gate automatici verdi (`npx tsc --noEmit`, `npm run build`). La checklist di validazione manuale UI e accessibilità resta aperta in questa sessione. Il punto `grep "getActiveBudgets" src/components/ReportsTab.tsx` è lasciato aperto perché il helper è usato intenzionalmente nel `useMemo` `activeBudgets`, come richiesto dal design e dal coding plan.
