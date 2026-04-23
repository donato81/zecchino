# P09 — Coding Plan: Estrazione `ReportsTab`

> Documento operativo. Nessun file di codice sorgente viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 9 — Creazione di `src/components/ReportsTab.tsx`  
> Design di riferimento: `docs/1 - projects/P09-ReportsTab-design.md`  
> Data: 23 aprile 2026

---

## Note preliminari

- I numeri di riga indicati sono **approssimativi** (±5 righe) e vanno verificati nell'editor prima di ogni modifica.
- Questo pacchetto si implementa in **tre passi distinti e sequenziali**: prima la modifica di `AppDataContext`, poi la creazione del componente, infine la pulizia di `App.tsx`. Ogni passo va verificato con `npx tsc --noEmit` prima di procedere al successivo.
- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P08.
- File non toccati in questo passo:

  | File | Motivo |
  |---|---|
  | `src/components/TransactionsTab.tsx` | Già estratto nel Passo 7; invariato |
  | `src/components/DashboardTab.tsx` | Già estratto nel Passo 8; invariato |
  | `src/context/AuthContext.tsx` | `SecuritySettings` vi accede direttamente; nessuna modifica necessaria |
  | `src/hooks/use-visible-data.ts` | Già espone `visibleTransactions`, `visibleAccounts`, `totalBalance` |
  | `src/hooks/use-app-shortcuts.ts` | Shortcut globali invariate |
  | `src/components/BudgetProgressCard.tsx` | Importato da ReportsTab; invariato |
  | `src/components/BudgetForecastCard.tsx` | Importato da ReportsTab; invariato |
  | `src/components/BudgetHistoryChart.tsx` | Importato da ReportsTab; invariato |
  | `src/components/BudgetComparisonCard.tsx` | Importato da ReportsTab; invariato |
  | `src/components/SavingsGoalCard.tsx` | Importato da ReportsTab; invariato |
  | `src/components/SecuritySettings.tsx` | Importato da ReportsTab; invariato |
  | `src/components/CategoryManagement.tsx` | Importato da ReportsTab; invariato |
  | `src/components/DataManagement.tsx` | Importato da ReportsTab; invariato |
  | `src/components/DisplaySettings.tsx` | Importato da ReportsTab; invariato |
  | `src/components/AudioSettings.tsx` | Importato da ReportsTab; invariato |
  | `src/components/HapticSettings.tsx` | Importato da ReportsTab; invariato |
  | `src/components/ScreenReaderSettings.tsx` | Importato da ReportsTab; invariato |
  | `src/components/TalkBackSettings.tsx` | Importato da ReportsTab; invariato |
  | `src/components/PeriodSelector.tsx` | Importato da ReportsTab; invariato |
  | `src/components/IncomeExpenseChart.tsx` | Importato da ReportsTab; invariato |
  | `src/components/MonthlyComparisonChart.tsx` | Importato da ReportsTab; invariato |
  | `src/lib/` | Tutti i file già stabili |
  | `docs/`, `.github/` | Invariati |

---

## Ambiguità rilevate

### AI1 — Ordine di dichiarazione di `handleAddFundsToGoal` rispetto agli `useState`

**Situazione**: `handleAddFundsToGoal` chiude su `setEditingSavingsGoal` e `setShowSavingsGoalDialog`. In JavaScript, una funzione `const` non è hoistata, quindi deve essere dichiarata **dopo** i due `useState` da cui dipende.

**Decisione**: nel corpo di `AppDataProvider`, aggiungere i 4 `useState` (Passo A.2) **prima** di `handleAddFundsToGoal` (Passo A.3). L'ordine corretto è:

```ts
const [showBudgetDialog, setShowBudgetDialog] = useState(false)
const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined)
const [showSavingsGoalDialog, setShowSavingsGoalDialog] = useState(false)
const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>(undefined)

const handleAddFundsToGoal = (goal: SavingsGoal) => {  // <-- DOPO i 4 useState
  setEditingSavingsGoal(goal)
  setShowSavingsGoalDialog(true)
}
```

### AI2 — `chartPeriod` rimane in `App.tsx` fino al Passo C

**Situazione**: `chartPeriod` non rientra nella lista delle dichiarazioni da rimuovere nel Passo A (design §2). È usato esclusivamente nel blocco JSX `TabsContent value="reports"` (~righe 417–757), che viene rimosso solo nel **Passo C**.

**Decisione**: non toccare `chartPeriod` nel Passo A. Nel Passo C, dopo la rimozione del blocco JSX, TypeScript segnalerà `chartPeriod` come non utilizzato. Rimuovere la riga `const [chartPeriod, setChartPeriod] = useState<...>('month')` (~riga 121 di `App.tsx`) solo **dopo** la rimozione del blocco JSX. In `ReportsTab.tsx`, dichiarare `chartPeriod` come `useState` locale fresco (Passo B.4).

### AI3 — `soundSystem` e `hapticSystem` in `ReportsTab.tsx`

**Situazione**: il JSX dei pulsanti "Nuovo Budget", "Nuovo Obiettivo" e dei bottoni modifica inline (se presenti nel blocco ReportsTab) chiama `soundSystem.play(...)` e `hapticSystem.*()` direttamente negli `onClick`. Questi singleton non sono esposti da alcun context.

**Decisione**: `ReportsTab.tsx` importa direttamente i singleton:

```ts
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
```

Stesso pattern già adottato in `App.tsx` e `DashboardTab.tsx`. Verificare durante la copia del JSX se questi import sono effettivamente necessari (BudgetProgressCard, SavingsGoalCard etc. potrebbero già gestire il feedback audio/aptico internamente).

### AI4 — Icone Phosphor oltre a `Plus`, `Gear`, `Target`, `Info`, `PiggyBank`

**Situazione**: il design §7 R6 elenca le icone necessarie in `ReportsTab.tsx`. Tuttavia, se il blocco JSX del tab contiene pulsanti di modifica/elimina inline (non delegati ai componenti estratti), potrebbero servire anche `PencilSimple` e `Trash`.

**Decisione**: importare le 5 icone documentate nel design. Durante la copia del JSX (Passo B.8), se compaiono `PencilSimple` o `Trash` nel blocco ReportsTab che non siano incapsulati dentro componenti già estratti, aggiungere al momento. Non anticipare import speculativi.

### AI5 — Componenti impostazioni senza props

**Situazione**: i 8 componenti impostazioni (`SecuritySettings`, `CategoryManagement`, `DataManagement`, `DisplaySettings`, `AudioSettings`, `HapticSettings`, `ScreenReaderSettings`, `TalkBackSettings`) leggono autonomamente dai propri context/hook.

**Decisione**: renderizzarli in `ReportsTab.tsx` senza props. Non aggiungere wrapping né intercettazione di handler. Verificare al momento del test che le sezioni si aprano correttamente.

---

## Rischi

### R1 — `handleViewBudget` e il timeout di 300ms — 🔴 Alto

Il callback di `BudgetAlertBanner` in `App.tsx` usa un `setTimeout(300ms)` intenzionale per attendere il mount del tab Report prima di aprire il dialog:

```tsx
onViewBudget={(id) => handleViewBudget(id, (budget) => {
  setActiveTab('reports')
  setTimeout(() => {
    setEditingBudget(budget)
    setShowBudgetDialog(true)
  }, 300)
})}
```

Dopo il Passo A, `setEditingBudget` e `setShowBudgetDialog` arriveranno dalla destructuring di `useAppData()` in `App.tsx`, ma la logica del timeout **non cambia**. `ReportsTab` non deve toccare questa callback.

**Mitigazione**: verificare dopo il Passo A che la destructuring di `useAppData()` in `App.tsx` includa `setEditingBudget` e `setShowBudgetDialog`. Il blocco `setTimeout` rimane invariato.

### R2 — Bug pre-esistente su salvataggio movimenti — 🟡 Medio

`handleSaveTransaction` era non funzionante prima del refactoring. Il Passo 9 non tocca tale handler.

**Mitigazione**: non modificare `handleSaveTransaction`, non rimuoverlo, non modificarne la firma.

### R3 — Non modificare gli handler interni ai componenti impostazioni — 🟢 Basso

I componenti `SecuritySettings`, `CategoryManagement`, `DataManagement` e gli altri gestiscono i propri handler internamente. `ReportsTab` li renderizza senza props.

**Mitigazione**: nessuna azione richiesta; è il comportamento naturale.

### R4 — Prerequisito Passo A per gli stati dialog budget/savings — 🔴 Alto

Il Passo B dipende dal Passo A completato: `showBudgetDialog`, `editingBudget`, `showSavingsGoalDialog`, `editingSavingsGoal`, `handleAddFundsToGoal` devono essere disponibili da `useAppData()` prima di scrivere `ReportsTab`.

**Mitigazione**: eseguire `npx tsc --noEmit` dopo il Passo A e non procedere al Passo B fino a zero errori.

### R5 — Nessuna regressione nei tab già estratti — 🟢 Basso

Il Passo 9 non tocca `TransactionsTab.tsx` e `DashboardTab.tsx`. Le modifiche ad `AppDataContext` (aggiunta stati budget/savings) non alterano i valori già esposti.

**Mitigazione**: smoke test sui tab Movimenti e Dashboard al termine del Passo C.

### R6 — Import icone Phosphor corretti — 🟡 Medio

Importare solo le icone usate nel blocco ReportsTab. Le icone dei tab già estratti (`Eye`, `EyeSlash`, `LockOpen` ecc.) e delle testata app (`ChartLine`, `List`) rimangono in `App.tsx`.

**Mitigazione**: basarsi sulla lista del design §7 R6 (`Plus`, `Gear`, `Target`, `Info`, `PiggyBank`) e integrare solo se TypeScript segnala riferimenti non risolti (vedi AI4).

### R7 — `safeAccounts` vs `visibleAccounts` in `SavingsGoalCard` — 🔴 Alto

`SavingsGoalCard` riceve `accounts={safeAccounts}` (tutti i conti, inclusi quelli privati). È **intenzionale**: un obiettivo di risparmio può essere associato a un conto privato. Usare `visibleAccounts` sarebbe un bug.

**Mitigazione**: durante la copia del JSX (Passo B.8), verificare esplicitamente che la prop sia `accounts={safeAccounts}`. Non "correggere" con `visibleAccounts`.

---

## Passo A — Modifica `src/context/AppDataContext.tsx`

### Rischio: 🟡 Medio
### Prerequisito: P01–P08 completati; branch `refactoring-architettura`

### A.1 Aggiornamento di `AppDataContextValue` (righe ~12–63)

Aggiungere **dopo** `setShowAccountDialog: (v: boolean) => void` (~riga 62) e **prima** della chiusura `}` del tipo:

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

> ✔ `Budget` e `SavingsGoal` sono già presenti nell'import a riga 3 — nessuna modifica all'import richiesta.

### A.2 Dichiarazione dei 4 `useState` in `AppDataProvider` (dopo riga ~86)

Posizione: subito dopo `const [showAccountDialog, setShowAccountDialog] = useState(false)` (~riga 86), prima di `const safeAccounts = useMemo(...)`:

```ts
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined)
  const [showSavingsGoalDialog, setShowSavingsGoalDialog] = useState(false)
  const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>(undefined)
```

### A.3 Dichiarazione di `handleAddFundsToGoal` in `AppDataProvider` (dopo A.2)

Posizione: subito dopo i 4 `useState` aggiunti in A.2 (⚠️ **AI1** — deve seguire, non precedere):

```ts
  const handleAddFundsToGoal = (goal: SavingsGoal) => {
    setEditingSavingsGoal(goal)
    setShowSavingsGoalDialog(true)
  }
```

### A.4 Aggiornamento del valore del Provider (dopo riga ~409)

Aggiungere **dopo** `setShowAccountDialog,` nell'oggetto `value`:

```ts
        showBudgetDialog, setShowBudgetDialog,
        editingBudget, setEditingBudget,
        showSavingsGoalDialog, setShowSavingsGoalDialog,
        editingSavingsGoal, setEditingSavingsGoal,
        handleAddFundsToGoal,
```

### A.5 Aggiornamento destructuring `useAppData()` in `App.tsx` (righe ~80–101)

Aggiungere i nuovi campi dopo `setShowAccountDialog,` (~riga 100):

```ts
    showBudgetDialog, setShowBudgetDialog,
    editingBudget, setEditingBudget,
    showSavingsGoalDialog, setShowSavingsGoalDialog,
    editingSavingsGoal, setEditingSavingsGoal,
    handleAddFundsToGoal,
```

### A.6 Rimozione degli `useState` locali in `App.tsx`

Rimuovere le seguenti righe (ora ridondanti — i valori arrivano dal context):

```ts
// riga ~113 — rimuovere:
const [showBudgetDialog, setShowBudgetDialog] = useState(false)

// riga ~114 — rimuovere:
const [showSavingsGoalDialog, setShowSavingsGoalDialog] = useState(false)

// riga ~117 — rimuovere:
const [editingBudget, setEditingBudget] = useState<Budget | undefined>()

// riga ~118 — rimuovere:
const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>()
```

> ⚠️ **Non rimuovere** riga ~115: `const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)` — rimane locale in `App.tsx`.  
> ⚠️ **Non rimuovere** righe ~120–122: `activeTab`, `chartPeriod`, `previousTab` — rimangono in `App.tsx` (chartPeriod sarà rimosso nel Passo C, vedi AI2).

### A.7 Rimozione di `handleAddFundsToGoal` locale da `App.tsx` (righe ~130–133)

Rimuovere la funzione locale (ora sostituita dall'handler nel context):

```ts
// Da rimuovere:
const handleAddFundsToGoal = (goal: SavingsGoal) => {
  setEditingSavingsGoal(goal)
  setShowSavingsGoalDialog(true)
}
```

### Criterio di verifica — Passo A

- `npx tsc --noEmit` → zero errori TypeScript
- `useAppData()` espone `showBudgetDialog`, `editingBudget`, `showSavingsGoalDialog`, `editingSavingsGoal`, `handleAddFundsToGoal`
- `App.tsx` non contiene più `useState` locali per `showBudgetDialog`, `showSavingsGoalDialog`, `editingBudget`, `editingSavingsGoal`
- `App.tsx` non contiene più la funzione locale `handleAddFundsToGoal`
- La callback `BudgetAlertBanner` in `App.tsx` con `setTimeout(300ms)` è invariata (usa `setEditingBudget` e `setShowBudgetDialog` dalla destructuring del context)

---

## Passo B — Creazione `src/components/ReportsTab.tsx`

### Rischio: 🔴 Alto (dipende dal Passo A completato)
### Prerequisito: Passo A verificato con `tsc --noEmit` a zero errori

### B.1 Import

```ts
import { useState, useMemo } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useVisibleData } from '@/hooks/use-visible-data'
import { formatCurrency, calculateAccountBalance, getActiveBudgets } from '@/lib/helpers'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { BudgetProgressCard } from '@/components/BudgetProgressCard'
import { BudgetForecastCard } from '@/components/BudgetForecastCard'
import { BudgetHistoryChart } from '@/components/BudgetHistoryChart'
import { BudgetComparisonCard } from '@/components/BudgetComparisonCard'
import { SavingsGoalCard } from '@/components/SavingsGoalCard'
import { PeriodSelector } from '@/components/PeriodSelector'
import { IncomeExpenseChart } from '@/components/IncomeExpenseChart'
import { MonthlyComparisonChart } from '@/components/MonthlyComparisonChart'
import { SecuritySettings } from '@/components/SecuritySettings'
import { CategoryManagement } from '@/components/CategoryManagement'
import { DataManagement } from '@/components/DataManagement'
import { DisplaySettings } from '@/components/DisplaySettings'
import { AudioSettings } from '@/components/AudioSettings'
import { HapticSettings } from '@/components/HapticSettings'
import { ScreenReaderSettings } from '@/components/ScreenReaderSettings'
import { TalkBackSettings } from '@/components/TalkBackSettings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Gear, Target, Info, PiggyBank } from '@phosphor-icons/react'
```

> ⚠️ **R1** (design §7): `formatCurrency`, `calculateAccountBalance`, `getActiveBudgets` importati direttamente da `@/lib/helpers`, **non** da context.  
> ⚠️ **AI3**: `soundSystem` e `hapticSystem` importati direttamente se usati negli `onClick` inline — verificare durante B.8.  
> ⚠️ **AI4**: se la copia del JSX rivela `PencilSimple` o `Trash` usati direttamente (fuori dai componenti estratti), aggiungere all'import `@phosphor-icons/react`.

Verificare dal JSX se sono necessari ulteriori import da `@/components/ui/` (es. `Separator`, `Badge`). Aggiungere solo quelli referenziati nel blocco JSX.

### B.2 Firma del componente

```ts
export function ReportsTab() {
```

Il componente non riceve props.

### B.3 Sorgenti dati — destructuring

```ts
  const {
    safeCategories,
    safeBudgets,
    safeSavingsGoals,
    safeAccounts,
    showBudgetDialog, setShowBudgetDialog,
    editingBudget, setEditingBudget,
    showSavingsGoalDialog, setShowSavingsGoalDialog,
    editingSavingsGoal, setEditingSavingsGoal,
    handleAddFundsToGoal,
    setDeletingItem,
    setShowDeleteDialog,
  } = useAppData()

  const {
    visibleAccounts,
    visibleTransactions,
    totalBalance,
  } = useVisibleData()
```

> ℹ️ `ReportsTab` **non** usa: `recentTransactions`, `groupedAccounts`, `filteredGroupedAccounts`, `allCategoriesVisible`, `editingAccount`, `showAccountDialog`, `editingTransaction`, `showTransactionDialog` — questi appartengono a `DashboardTab` o `TransactionsTab`.

### B.4 Stato locale `chartPeriod`

```ts
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month')
```

> ⚠️ **Design §6**: `chartPeriod` rimane `useState` locale — non va in `AppDataContext`. Questo valore non è mai letto fuori da `ReportsTab`.

### B.5 `useMemo` — `activeBudgets` (sostituisce 4 chiamate a `getActiveBudgets`)

```ts
  const activeBudgets = useMemo(
    () => getActiveBudgets(safeBudgets),
    [safeBudgets]
  )
```

> ⚠️ **Design §5.B**: nel JSX del Passo B.8, ogni occorrenza di `getActiveBudgets(safeBudgets)` va sostituita con `activeBudgets`. Sono 4 punti: guard empty state, `BudgetProgressCard` map, `BudgetForecastCard` map, griglia storica map.

### B.6 `useMemo` — `topIncomeCategories` (sostituisce IIFE entrate)

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

**Tipo di ritorno**: `[string, number][]`

> ⚠️ **Design §5.A**: nel JSX del Passo B.8, la IIFE nel `TooltipContent` della card "Totale Entrate" va rimossa e sostituita con:
> ```tsx
> {topIncomeCategories.length > 0 ? (
>   <>
>     <p className="text-xs font-medium mt-1">Top categorie:</p>
>     {topIncomeCategories.map(([cat, amount]) => (
>       <p key={cat} className="text-xs">• {cat}: {formatCurrency(amount)}</p>
>     ))}
>   </>
> ) : (
>   <p className="text-xs opacity-75">Nessuna entrata registrata</p>
> )}
> ```

### B.7 `useMemo` — `topExpenseCategories` (sostituisce IIFE uscite)

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

> ⚠️ **Design §5.A**: sostituire la IIFE nel `TooltipContent` della card "Totale Uscite" con la stessa struttura, usando `topExpenseCategories`.

### B.8 JSX del componente

Copiare il blocco `<TabsContent value="reports" ...>` da `App.tsx` righe **417–757** come `return (...)` del componente.

Differenze rispetto all'originale da applicare **durante la copia**:

1. ⚠️ **§5.B** — Sostituire ogni `getActiveBudgets(safeBudgets)` con `activeBudgets` (4 occorrenze: ~righe 470, 583, 592, 620).

2. ⚠️ **§5.A** — Sostituire la IIFE della card "Totale Entrate" (~righe 487–510) con `topIncomeCategories.map(...)` (vedi B.6).

3. ⚠️ **§5.A** — Sostituire la IIFE della card "Totale Uscite" (~righe 527–545) con `topExpenseCategories.map(...)` (vedi B.7).

4. ⚠️ **R7** — Verificare che `SavingsGoalCard` riceva `accounts={safeAccounts}` (non `visibleAccounts`). Questa prop è già così nell'originale — non "correggere".

5. ⚠️ **R1** — Il blocco JSX NON contiene la callback `BudgetAlertBanner` con `setTimeout(300ms)`: quella rimane in `App.tsx`. Il blocco estratto inizia con `<TabsContent value="reports"` e contiene solo il contenuto del tab, non il banner di alert.

6. ⚠️ **R6** — Se compaiono icone Phosphor non previste, aggiornare l'import in B.1.

### B.9 Chiusura

```ts
}
```

### Criterio di verifica — Passo B

- Salvare il file
- `npx tsc --noEmit` → zero errori TypeScript
- Verificare che `src/components/ReportsTab.tsx` esista con `export function ReportsTab`
- L'app **non cambia ancora** — `App.tsx` non è stato modificato in questo passo
- Verificare che le 4 occorrenze di `getActiveBudgets(safeBudgets)` siano state sostituite con `activeBudgets`
- Verificare che le 2 IIFE siano state sostituite con `topIncomeCategories`/`topExpenseCategories`

---

## Passo C — Modifica `src/App.tsx`

### Rischio: 🟡 Medio
### Prerequisito: Passi A e B completati e verificati (`tsc --noEmit` a zero errori)

### C.1 Aggiunta import `ReportsTab` (~riga 35)

Aggiungere subito dopo (o vicino a) `import { DashboardTab } from '@/components/DashboardTab'`:

```ts
import { ReportsTab } from '@/components/ReportsTab'
```

### C.2 Sostituzione del blocco `TabsContent value="reports"` (righe ~417–757)

Individuare:
```tsx
          <TabsContent value="reports" className="space-y-6" ...>
```

Individuare la chiusura `</TabsContent>` corrispondente (~riga 757, la riga immediatamente prima dell'ultimo `</Tabs>` o del dialogs overlay).

Rimuovere l'intero blocco (~341 righe) e sostituire con:

```tsx
          <ReportsTab />
```

Verificare che `<DashboardTab />` e `<TransactionsTab />` rimangano invariati.

### C.3 Rimozione di `chartPeriod` da `App.tsx` (~riga 121)

Dopo la rimozione del blocco JSX, TypeScript segnalerà `chartPeriod` e `setChartPeriod` come non utilizzati. Rimuovere la riga:

```ts
// riga ~121 — rimuovere:
const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month')
```

> ⚠️ **AI2**: questa rimozione va fatta **nel Passo C**, non nel Passo A.

### C.4 Verifica import inutilizzati in `App.tsx`

Dopo l'estrazione, i seguenti import potrebbero diventare inutilizzati. Verificare con TypeScript:

| Import | Probabilmente inutilizzato? | Nota |
|---|---|---|
| `MonthlyComparisonChart` | Sì | Solo in ReportsTab |
| `PeriodSelector` | Sì | Solo in ReportsTab |
| `IncomeExpenseChart` | Sì | Solo in ReportsTab |
| `BudgetProgressCard` | Sì | Solo in ReportsTab |
| `BudgetForecastCard` | Sì | Solo in ReportsTab |
| `BudgetHistoryChart` | Sì | Solo in ReportsTab |
| `BudgetComparisonCard` | Sì | Solo in ReportsTab |
| `SavingsGoalCard` | Sì | Solo in ReportsTab |
| `SecuritySettings` | Sì | Solo in ReportsTab |
| `CategoryManagement` | Sì | Solo in ReportsTab |
| `DataManagement` | Sì | Solo in ReportsTab |
| `DisplaySettings` | Sì | Solo in ReportsTab |
| `AudioSettings` | Sì | Solo in ReportsTab |
| `HapticSettings` | Sì | Solo in ReportsTab |
| `ScreenReaderSettings` | Sì | Solo in ReportsTab |
| `TalkBackSettings` | Sì | Solo in ReportsTab |
| `calculateAccountBalance` | Probabilmente | Usato solo nella card Dettaglio Conti di ReportsTab |
| `getActiveBudgets` | Probabilmente | Usato solo in ReportsTab (sostituito da useMemo) |
| `Gear`, `Target`, `Info`, `PiggyBank` | Probabilmente | Usate solo in ReportsTab |
| `PencilSimple`, `Trash` | Verificare | Potrebbero restare in altri blocchi di App.tsx |

> ⚠️ Non rimuovere import speculativamente — affidarsi agli errori TypeScript.

### Criterio di verifica — Passo C

- `npx tsc --noEmit` → zero errori TypeScript
- `npm run build` → compilazione riuscita senza errori
- `grep "TabsContent value=\"reports\"" src/App.tsx` → zero risultati
- `grep "ReportsTab" src/App.tsx` → 2 risultati (import + `<ReportsTab />`)
- `grep "chartPeriod" src/App.tsx` → zero risultati
- `grep "getActiveBudgets" src/components/ReportsTab.tsx` → zero risultati (tutti rimpiazzati da `activeBudgets`)
- L'app si avvia e tutti e tre i tab funzionano

---

## Sequenza riepilogativa

```
Passo A: AppDataContext.tsx + App.tsx (rimozione stati locali)
  └─ Verifica: npx tsc --noEmit → 0 errori

Passo B: Creazione ReportsTab.tsx
  ├─ 2 useMemo (topIncomeCategories, topExpenseCategories) — sostituiscono IIFE
  ├─ 1 useMemo (activeBudgets) — sostituisce getActiveBudgets x4
  ├─ 1 useState locale (chartPeriod)
  └─ Verifica: npx tsc --noEmit → 0 errori

Passo C: App.tsx (sostituzione blocco JSX + cleanup)
  └─ Verifica: npx tsc --noEmit → 0 errori; npm run build → OK
```
