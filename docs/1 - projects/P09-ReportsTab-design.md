# P09 — Estrazione `ReportsTab` come componente autonomo

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 9 (corrispondente al Passo 9 del piano di refactoring)  
> Data: 23 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Al termine del Passo 8, il tab Dashboard è stato estratto in `DashboardTab.tsx` e il pattern è stato consolidato su due casi di complessità crescente: `TransactionsTab` (Passo 7) e `DashboardTab` (Passo 8).

Il Passo 9 applica lo stesso pattern all'ultimo e più grande dei tre tab: il blocco `TabsContent value="reports"` (circa 341 righe nel JSX post-P08 di `App.tsx`) viene estratto in un file autonomo: `src/components/ReportsTab.tsx`.

**Perché adesso**: `ReportsTab` è il tab con la complessità maggiore. Viene affrontato per ultimo perché richiede: (a) spostare quattro stati dialog da `App.tsx` ad `AppDataContext`, (b) risolvere due problemi di performance durante l'estrazione (IIFE inline e `getActiveBudgets` ripetuto), (c) gestire una sezione impostazioni con otto sotto-componenti già estratti. Il metodo rimane identico ai Passi 7 e 8.

**Cosa cambia dopo questo passo**: `App.tsx` conterrà solo header, schermata di autenticazione, navigazione tab e `DialogsOverlay` (BudgetDialog, SavingsGoalDialog, AlertDialog, KeyboardShortcutsHelp). Tutti e tre i tab principali saranno estratti come componenti autonomi.

**Cosa NON cambia**: il comportamento dell'app è **identico** a prima. Nessun handler di business viene modificato: si sposta solo la struttura JSX.

---

## 2. Perimetro della modifica

### File creati

| Percorso | Scopo |
|---|---|
| `src/components/ReportsTab.tsx` | Componente autonomo che incapsula il tab Report |

### File modificati

| Percorso | Modifica |
|---|---|
| `src/App.tsx` | Rimozione del blocco JSX `TabsContent value="reports"` (~341 righe, linee 417–757); sostituzione con `<ReportsTab />`; aggiunta import del componente; rimozione delle dichiarazioni locali `showBudgetDialog`, `editingBudget`, `showSavingsGoalDialog`, `editingSavingsGoal` e della funzione locale `handleAddFundsToGoal` (ora tutti in AppDataContext) |
| `src/context/AppDataContext.tsx` | Aggiunta di 4 stati dialog budget/savings + handler `handleAddFundsToGoal` (vedi §4) |

### File non toccati

| Percorso | Motivo |
|---|---|
| `src/hooks/use-visible-data.ts` | Già espone `visibleTransactions`, `visibleAccounts`, `totalBalance` |
| `src/context/AuthContext.tsx` | `SecuritySettings` vi accede direttamente; nessuna modifica necessaria |
| `src/hooks/use-app-shortcuts.ts` | Shortcut globali invariate |
| `src/components/TransactionsTab.tsx` | Già estratto nel Passo 7; invariato |
| `src/components/DashboardTab.tsx` | Già estratto nel Passo 8; invariato |
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
| `docs/`, `.github/` | Invariati |

---

## 3. Sorgenti dati del nuovo componente

`ReportsTab` non riceve props dall'esterno. Legge tutto direttamente dai context, dagli hook e dalle librerie. Le dipendenze si articolano in quattro aree funzionali.

### 3.1 Area 1 — Card statistiche

La sezione mostra il grafico `MonthlyComparisonChart` in testa, seguito da tre card (Saldo Totale, Totale Entrate, Totale Uscite) ciascuna con Tooltip. Chiude con una card "Dettaglio Conti" che lista il saldo per ogni conto visibile.

| Dato / Handler | Provenienza | Uso nel componente |
|---|---|---|
| `visibleTransactions` | `useVisibleData()` | Calcolo totale entrate/uscite nelle card; input per `MonthlyComparisonChart` |
| `visibleAccounts` | `useVisibleData()` | Conteggio conti nel Tooltip "Saldo Consolidato"; iterazione nella card "Dettaglio Conti" |
| `totalBalance` | `useVisibleData()` | Valore mostrato nella card "Saldo Totale" |
| `safeCategories` | `useAppData()` | Lookup nome categoria per i `useMemo` `topIncomeCategories`/`topExpenseCategories` |
| `formatCurrency` | `@/lib/helpers` (import diretto) | Rendering di tutti i valori monetari |
| `calculateAccountBalance` | `@/lib/helpers` (import diretto) | Calcolo saldo per la card "Dettaglio Conti" |
| `topIncomeCategories` | `useMemo` locale *(da creare — vedi §5.A)* | Top 3 categorie nel Tooltip "Dettaglio Entrate" |
| `topExpenseCategories` | `useMemo` locale *(da creare — vedi §5.A)* | Top 3 categorie nel Tooltip "Dettaglio Uscite" |

> **IIFE da eliminare**: nella versione attuale di `App.tsx`, `topIncomeCategories` ed `topExpenseCategories` sono calcolate come IIFE direttamente dentro i `TooltipContent`. Durante l'estrazione vanno convertite in `useMemo` locali al componente (vedi §5.A).

### 3.2 Area 2 — Grafici

| Dato / Handler | Provenienza | Uso nel componente |
|---|---|---|
| `visibleTransactions` | `useVisibleData()` | Input per `IncomeExpenseChart` e `MonthlyComparisonChart` |
| `chartPeriod` | `useState` locale *(vedi §6)* | Periodo selezionato da `PeriodSelector`; filtro per `IncomeExpenseChart` |
| `setChartPeriod` | `useState` locale *(vedi §6)* | Handler cambio periodo in `PeriodSelector` |

Componenti grafici già estratti e importabili direttamente:

| Componente | File | Props necessarie |
|---|---|---|
| `MonthlyComparisonChart` | `src/components/MonthlyComparisonChart.tsx` | `transactions={visibleTransactions}` |
| `PeriodSelector` | `src/components/PeriodSelector.tsx` | `value={chartPeriod} onChange={setChartPeriod}` |
| `IncomeExpenseChart` | `src/components/IncomeExpenseChart.tsx` | `transactions={visibleTransactions} period={chartPeriod}` |

### 3.3 Area 3 — Budget e Obiettivi di Risparmio

| Dato / Handler | Provenienza | Uso nel componente |
|---|---|---|
| `safeBudgets` | `useAppData()` | Input per il `useMemo` `activeBudgets` |
| `activeBudgets` | `useMemo` locale *(da creare — vedi §5.B)* | Guard empty state; iterazione per le tre griglie budget |
| `safeSavingsGoals` | `useAppData()` | Guard empty state; iterazione per la griglia obiettivi |
| `safeAccounts` | `useAppData()` | Passato come `accounts` a `SavingsGoalCard` (tutti i conti, non solo visibili — vedi R7) |
| `visibleTransactions` | `useVisibleData()` | Prop a `BudgetProgressCard`, `BudgetForecastCard`, `BudgetHistoryChart`, `BudgetComparisonCard` |
| `visibleAccounts` | `useVisibleData()` | Prop `accounts` a `BudgetProgressCard` |
| `safeCategories` | `useAppData()` | Prop `categories` a `BudgetProgressCard` |
| `showBudgetDialog` | `useAppData()` *(da aggiungere — vedi §4)* | Controlla apertura `BudgetDialog` |
| `setShowBudgetDialog` | `useAppData()` *(da aggiungere — vedi §4)* | Pulsante "Nuovo Budget" e pulsante modifica budget |
| `editingBudget` | `useAppData()` *(da aggiungere — vedi §4)* | Budget precompilato passato a `BudgetDialog` |
| `setEditingBudget` | `useAppData()` *(da aggiungere — vedi §4)* | Reset a `undefined` prima di aprire in creazione; imposta budget in modifica |
| `showSavingsGoalDialog` | `useAppData()` *(da aggiungere — vedi §4)* | Controlla apertura `SavingsGoalDialog` |
| `setShowSavingsGoalDialog` | `useAppData()` *(da aggiungere — vedi §4)* | Pulsante "Nuovo Obiettivo" e pulsante modifica obiettivo |
| `editingSavingsGoal` | `useAppData()` *(da aggiungere — vedi §4)* | Obiettivo precompilato passato a `SavingsGoalDialog` |
| `setEditingSavingsGoal` | `useAppData()` *(da aggiungere — vedi §4)* | Reset a `undefined` prima di aprire in creazione; imposta obiettivo in modifica |
| `handleAddFundsToGoal` | `useAppData()` *(da aggiungere — vedi §4)* | Prop `onAddFunds` di `SavingsGoalCard` |
| `setDeletingItem` | `useAppData()` | Pulsante elimina budget → `{ type: 'budget', id }` ; pulsante elimina obiettivo → `{ type: 'savingsGoal', id }` |
| `setShowDeleteDialog` | `useAppData()` | Pulsante elimina → apre `AlertDialog` di conferma |

Componenti budget/savings già estratti e importabili direttamente:

| Componente | File |
|---|---|
| `BudgetProgressCard` | `src/components/BudgetProgressCard.tsx` |
| `BudgetForecastCard` | `src/components/BudgetForecastCard.tsx` |
| `BudgetHistoryChart` | `src/components/BudgetHistoryChart.tsx` |
| `BudgetComparisonCard` | `src/components/BudgetComparisonCard.tsx` |
| `SavingsGoalCard` | `src/components/SavingsGoalCard.tsx` |

### 3.4 Area 4 — Impostazioni

La sezione è divisa in due blocchi visivi distinti con titoli separati (entrambi con icona `Gear`).

**Blocco "Impostazioni Applicazione"**:

| Sotto-sezione | Componente | Provenienza dati |
|---|---|---|
| Sicurezza / PIN | `SecuritySettings` | Legge autonomamente da `useAuth()` — nessuna prop |
| Categorie | `CategoryManagement` | Legge autonomamente da `useAppData()` — nessuna prop |
| Gestione dati (export CSV, import) | `DataManagement` | Legge autonomamente da `useAppData()` — nessuna prop |

**Blocco "Impostazioni Accessibilità"**:

| Sotto-sezione | Componente | Provenienza dati |
|---|---|---|
| Preferenze display | `DisplaySettings` | Legge autonomamente dalle preferenze locali — nessuna prop |
| Audio | `AudioSettings` | Legge autonomamente dal sistema audio — nessuna prop |
| Feedback aptico | `HapticSettings` | Legge autonomamente dal sistema aptico — nessuna prop |
| Screen Reader | `ScreenReaderSettings` | Legge autonomamente da `useScreenReader()` — nessuna prop |
| TalkBack | `TalkBackSettings` | Legge autonomamente da `useTalkBack()` — nessuna prop |

> **Nota**: tutti gli otto sotto-componenti impostazioni sono già estratti in `src/components/`. `ReportsTab` li importa e li renderizza senza passare props. Ciascuno accede direttamente ai context e agli hook di propria competenza.

### 3.5 Dati che il componente NON usa direttamente

`ReportsTab` non usa: `recentTransactions`, `groupedAccounts`, `filteredGroupedAccounts`, `allCategoriesVisible`, `visibleCategories`, `setVisibleCategories`, `toggleCategoryVisibility`, `toggleAllCategories`, `editingAccount`, `showAccountDialog`, `editingTransaction`, `showTransactionDialog`. Questi rimangono di competenza di `DashboardTab`, `TransactionsTab` o `App.tsx`.

---

## 4. Gestione degli stati dialog

### Stato post-Passo 8

Dopo il Passo 8, `AppDataContext` espone già:

| Stato | Tipo | Note |
|---|---|---|
| `editingTransaction` | `Transaction \| undefined` | Già in AppDataContext |
| `setEditingTransaction` | `(t: Transaction \| undefined) => void` | Già in AppDataContext |
| `showTransactionDialog` | `boolean` | Già in AppDataContext |
| `setShowTransactionDialog` | `(v: boolean) => void` | Già in AppDataContext |
| `deletingItem` | `{ type: 'account' \| 'transaction' \| 'budget' \| 'savingsGoal'; id: string } \| null` | Già in AppDataContext |
| `setDeletingItem` | `(item: ...) => void` | Già in AppDataContext |
| `showDeleteDialog` | `boolean` | Già in AppDataContext |
| `setShowDeleteDialog` | `(v: boolean) => void` | Già in AppDataContext |
| `editingAccount` | `Account \| undefined` | Già in AppDataContext (aggiunto nel Passo 8) |
| `setEditingAccount` | `(a: Account \| undefined) => void` | Già in AppDataContext |
| `showAccountDialog` | `boolean` | Già in AppDataContext |
| `setShowAccountDialog` | `(v: boolean) => void` | Già in AppDataContext |

### Stato mancante per ReportsTab

Quattro stati dialog e un handler sono ancora locali in `App.tsx` e sono necessari sia per `ReportsTab` sia per i dialog che `App.tsx` renderizza fisicamente (`BudgetDialog`, `SavingsGoalDialog`):

| Stato / Handler | Tipo | Uso attuale in App.tsx |
|---|---|---|
| `showBudgetDialog` | `boolean` | Controlla apertura `BudgetDialog` |
| `editingBudget` | `Budget \| undefined` | Budget passato a `BudgetDialog` in modalità modifica |
| `showSavingsGoalDialog` | `boolean` | Controlla apertura `SavingsGoalDialog` |
| `editingSavingsGoal` | `SavingsGoal \| undefined` | Obiettivo passato a `SavingsGoalDialog` in modalità modifica |
| `handleAddFundsToGoal` | `(goal: SavingsGoal) => void` | Pulsante "Aggiungi Fondi" in `SavingsGoalCard` |

> **Nota su `handleAddFundsToGoal`**: la funzione è attualmente definita localmente in `App.tsx`:
> ```ts
> const handleAddFundsToGoal = (goal: SavingsGoal) => {
>   setEditingSavingsGoal(goal)
>   setShowSavingsGoalDialog(true)
> }
> ```
> Poiché `editingSavingsGoal` e `showSavingsGoalDialog` si spostano in `AppDataContext`, `handleAddFundsToGoal` va aggiunto anch'esso ad `AppDataContext` come handler di convenienza, seguendo il pattern già stabilito da `handleViewBudget` e `handleDismissBudgetAlert`.

> **Nota su `chartPeriod`**: `chartPeriod` e `setChartPeriod` non rientrano in questo spostamento. Sono usati esclusivamente all'interno di `ReportsTab` e rimangono come `useState` locale nel componente (vedi §6 per la motivazione).

### Opzione A — Aggiunta ad `AppDataContext` (scelta per questo passo)

I quattro stati e l'handler vengono aggiunti come `useState` / funzione dentro `AppDataProvider` ed esposti nel valore del context, seguendo lo stesso approccio adottato nei Passi 7 e 8.

**Trade-off dichiarato**: `AppDataContext` accumula ulteriore UI state che non gli appartiene per natura. Dopo il Passo 9, il debito UI comprende: transaction dialog, delete dialog, account dialog, budget dialog, savings goal dialog — tutti ospitati in `AppDataContext` per ragioni architetturali di transizione. Il debito sarà estinto nella fase successiva con la creazione di `UIContext`, che raccoglierà tutti questi stati in un context dedicato, liberando `AppDataContext` per i soli dati di dominio.

### Modifiche ad `AppDataContext`

Aggiungere in `AppDataContextValue`:

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

Aggiungere nel corpo di `AppDataProvider` (vicino agli altri `useState` dialog):

```ts
const [showBudgetDialog, setShowBudgetDialog] = useState(false)
const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined)
const [showSavingsGoalDialog, setShowSavingsGoalDialog] = useState(false)
const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>(undefined)

const handleAddFundsToGoal = (goal: SavingsGoal) => {
  setEditingSavingsGoal(goal)
  setShowSavingsGoalDialog(true)
}
```

Aggiungere al valore esposto dal context (`value={...}`):

```ts
showBudgetDialog, setShowBudgetDialog,
editingBudget, setEditingBudget,
showSavingsGoalDialog, setShowSavingsGoalDialog,
editingSavingsGoal, setEditingSavingsGoal,
handleAddFundsToGoal,
```

Rimuovere da `App.tsx` le seguenti dichiarazioni (ora ridondanti) e aggiornarne la destructuring del context:

```ts
// Da rimuovere da App.tsx:
const [showBudgetDialog, setShowBudgetDialog] = useState(false)
const [showSavingsGoalDialog, setShowSavingsGoalDialog] = useState(false)
const [editingBudget, setEditingBudget] = useState<Budget | undefined>()
const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>()

// E la funzione locale:
const handleAddFundsToGoal = (goal: SavingsGoal) => {
  setEditingSavingsGoal(goal)
  setShowSavingsGoalDialog(true)
}
```

Aggiungere alla destructuring `useAppData()` in `App.tsx`:

```ts
showBudgetDialog, setShowBudgetDialog,
editingBudget, setEditingBudget,
showSavingsGoalDialog, setShowSavingsGoalDialog,
editingSavingsGoal, setEditingSavingsGoal,
handleAddFundsToGoal,  // non più necessario in App.tsx ma tolto dalla dichiarazione locale
```

---

## 5. I due problemi di performance da risolvere

### 5.A — IIFE inline nei TooltipContent

**Cosa sono**: nel JSX corrente di `App.tsx`, i Tooltip delle card "Totale Entrate" e "Totale Uscite" contengono IIFE che calcolano le top 3 categorie di aggregazione:

```tsx
// Card Totale Entrate — TooltipContent (attuale — da eliminare):
{(() => {
  const incomeByCategory = visibleTransactions
    .filter(t => t.tipo === 'entrata')
    .reduce((acc, t) => {
      const category = safeCategories.find(c => c.id === t.categoriaId)
      const catName = category?.nome || 'Senza categoria'
      acc[catName] = (acc[catName] || 0) + t.importo
      return acc
    }, {} as Record<string, number>)

  const topCategories = Object.entries(incomeByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return topCategories.length > 0 ? (
    <>
      <p className="text-xs font-medium mt-1">Top categorie:</p>
      {topCategories.map(([cat, amount]) => (
        <p key={cat} className="text-xs">• {cat}: {formatCurrency(amount)}</p>
      ))}
    </>
  ) : (
    <p className="text-xs opacity-75">Nessuna entrata registrata</p>
  )
})()}

// Card Totale Uscite — stessa struttura con tipo === 'uscita'
```

**Perché è un problema**: questi blocchi vengono ricalcolati ad ogni render del componente, inclusi i render causati da stati non correlati (cambio `chartPeriod`, apertura tooltip, qualsiasi setState nello scope). Il calcolo itera su tutte le transazioni visibili in entrambi i branch.

**Come risolvere**: durante l'estrazione, sostituire con due `useMemo` locali al componente:

```ts
// useMemo top categorie entrate
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

// useMemo top categorie uscite
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

**Tipo di ritorno**: `[string, number][]` — array di tuple `[nomeCategoria, totale]`, ordinato decrescente per totale, sliced a 3 elementi.

**Aggiornamento nel JSX**: sostituire le IIFE con lettura diretta delle variabili memoizzate:

```tsx
// Card Totale Entrate — TooltipContent (dopo):
{topIncomeCategories.length > 0 ? (
  <>
    <p className="text-xs font-medium mt-1">Top categorie:</p>
    {topIncomeCategories.map(([cat, amount]) => (
      <p key={cat} className="text-xs">• {cat}: {formatCurrency(amount)}</p>
    ))}
  </>
) : (
  <p className="text-xs opacity-75">Nessuna entrata registrata</p>
)}
```

### 5.B — `getActiveBudgets` chiamata 4 volte

**Dove viene chiamata**: nella versione corrente, `getActiveBudgets(safeBudgets)` viene invocata in 4 punti distinti del JSX della sezione budget:

1. Guard empty state: `if (getActiveBudgets(safeBudgets).length === 0)`
2. Griglia `BudgetProgressCard`: `{getActiveBudgets(safeBudgets).map(budget => (<BudgetProgressCard...`)}`
3. Griglia `BudgetForecastCard`: `{getActiveBudgets(safeBudgets).map(budget => (<BudgetForecastCard...`)}`
4. Griglia storica: `{getActiveBudgets(safeBudgets).map(budget => (<div key={`history-${budget.id}`}...`)}`

**Come risolvere**: durante l'estrazione, definire un singolo `useMemo` locale:

```ts
const activeBudgets = useMemo(
  () => getActiveBudgets(safeBudgets),
  [safeBudgets]
)
```

**Aggiornamento dei 4 punti nel JSX**: sostituire ogni occorrenza di `getActiveBudgets(safeBudgets)` con `activeBudgets`.

**Import necessario**: `getActiveBudgets` è già importata da `@/lib/helpers` nell'`AppDataContext`. Nel nuovo componente va importata direttamente:

```ts
import { formatCurrency, calculateAccountBalance, getActiveBudgets } from '@/lib/helpers'
```

---

## 6. Rischio specifico — `chartPeriod` rimane locale al componente

### Perché non va in AppDataContext

`chartPeriod` e `setChartPeriod` sono usati esclusivamente all'interno del tab Report: `PeriodSelector` li riceve come props, `IncomeExpenseChart` usa `chartPeriod` per filtrare i dati. Nessun altro componente, nessun dialog overlay e nessuna logica di `App.tsx` dipende da questo valore.

Inserire `chartPeriod` in `AppDataContext` aumenterebbe il debito UI senza alcun beneficio architetturale.

**Decisione**: `chartPeriod` rimane come `useState` locale in `ReportsTab`:

```ts
const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month')
```

**Differenza rispetto agli stati dialog**: i dialog states (`showBudgetDialog` etc.) devono stare in `AppDataContext` perché `App.tsx` renderizza fisicamente `BudgetDialog` e `SavingsGoalDialog` nel `DialogsOverlay` e ne legge lo stato direttamente per le prop `open`. `chartPeriod` invece è interamente incapsulato nel componente tab e non fuoriesce mai.

---

## 7. Rischi e avvertenze

### R1 — `handleViewBudget` e il timeout di 300ms

`handleViewBudget` è già in `AppDataContext` e riceve una callback dal suo chiamante. In `App.tsx`, la callback è:

```tsx
onViewBudget={(id) => handleViewBudget(id, (budget) => {
  setActiveTab('reports')
  setTimeout(() => {
    setEditingBudget(budget)    // sarà letto da AppDataContext
    setShowBudgetDialog(true)   // sarà letto da AppDataContext
  }, 300)
})}
```

Il `setTimeout(300)` è **intenzionale**: l'handler cambia prima il tab attivo, poi attende che Radix UI monti il contenuto del tab Report, poi apre il dialog. `ReportsTab` **non deve toccare questa logica**: la callback rimane in `App.tsx`. Dopo lo spostamento di `editingBudget` e `showBudgetDialog` in `AppDataContext`, `App.tsx` li leggerà dalla destructuring del context.

### R2 — Bug pre-esistente su salvataggio movimenti

Come già documentato nei Passi 7 e 8: `handleSaveTransaction` era non funzionante prima del refactoring. Il Passo 9 **non tocca** tale handler. La regressione è pre-esistente e va gestita in un issue separato.

### R3 — Non modificare gli handler interni ai componenti impostazioni

I componenti `SecuritySettings`, `CategoryManagement`, `DataManagement` e gli altri gestiscono i propri handler internamente. `ReportsTab` li renderizza come `<SecuritySettings />` senza passare props. Non va aggiunta alcuna logica di wrapping né intercettazione degli handler.

### R4 — Verifica setter esposti prima di scrivere codice

Prima di implementare `ReportsTab.tsx`, verificare che `AppDataContext` esponga i quattro nuovi stati dialog budget/savings e `handleAddFundsToGoal`. Se mancanti, aggiungerli prima di procedere alla scrittura del componente.

### R5 — Nessuna regressione nei tab già estratti

Il Passo 9 non tocca `TransactionsTab.tsx` e `DashboardTab.tsx`. Dopo le modifiche ad `AppDataContext` (aggiunta stati budget/savings), verificare con smoke test che entrambi i tab continuino a funzionare correttamente: non usano i nuovi stati, ma è opportuno confermare.

### R6 — Import icone Phosphor corretti

In `ReportsTab.tsx`, importare solo le icone usate nel blocco Report:

```ts
import { Plus, Gear, Target, Info, PiggyBank } from '@phosphor-icons/react'
```

Le icone `LockOpen`, `ChartLine`, `List`, `ArrowsLeftRight`, `Eye`, `EyeSlash`, `Keyboard` sono usate in `App.tsx` o nei tab già estratti; non vanno duplicate.

### R7 — `safeAccounts` vs `visibleAccounts` in `SavingsGoalCard`

In `App.tsx`, `SavingsGoalCard` riceve `accounts={safeAccounts}` (tutti i conti, inclusi quelli privati). Questo è intenzionale: un obiettivo di risparmio può essere associato a un conto privato e l'utente deve poterlo vedere in questa card indipendentemente dal suo stato di visibilità. `ReportsTab` deve replicare esattamente questo comportamento usando `safeAccounts` e non `visibleAccounts`.

---

## 8. Criteri di verifica (definition of done)

| # | Scenario | Risultato atteso |
|---|---|---|
| **Area statistiche** | | |
| 1 | Aprire il tab Report | La pagina mostra `MonthlyComparisonChart` e le tre card statistiche |
| 2 | Card "Saldo Totale" | Mostra il valore corretto; Tooltip riporta numero conti, entrate totali, uscite totali e saldo netto |
| 3 | Card "Totale Entrate" | Mostra la somma corretta delle entrate |
| 4 | Tooltip "Totale Entrate" con transazioni presenti | Riporta le top 3 categorie di entrata con importi corretti |
| 5 | Tooltip "Totale Entrate" senza transazioni di entrata | Compare la nota "Nessuna entrata registrata" |
| 6 | Card "Totale Uscite" | Mostra la somma corretta delle uscite |
| 7 | Tooltip "Totale Uscite" con transazioni presenti | Riporta le top 3 categorie di spesa con importi corretti |
| 8 | Tooltip "Totale Uscite" senza transazioni di uscita | Compare la nota "Nessuna uscita registrata" |
| 9 | Card "Dettaglio Conti" | Elenca ogni conto visibile con il saldo calcolato correttamente |
| **Area grafici** | | |
| 10 | `PeriodSelector` visibile | I cinque bottoni periodo sono presenti (settimana, mese, 3 mesi, 6 mesi, anno) |
| 11 | Click su un periodo diverso | `IncomeExpenseChart` si aggiorna con il periodo selezionato |
| 12 | `MonthlyComparisonChart` | Visualizza la comparazione mensile basata su `visibleTransactions` |
| **Area budget** | | |
| 13 | Nessun budget attivo | Compare il messaggio empty state con il pulsante "Crea il Primo Budget" |
| 14 | Click "Crea il Primo Budget" o "Nuovo Budget" | Si apre `BudgetDialog` con form vuoto |
| 15 | Click su pulsante modifica di un budget esistente | Si apre `BudgetDialog` precompilato con i dati del budget |
| 16 | Click su pulsante elimina budget | Si apre `AlertDialog` di conferma |
| 17 | Conferma eliminazione budget | Il budget sparisce da tutte e tre le griglie |
| 18 | Budget attivi presenti | Tre griglie visibili: progressi, previsioni, analisi storica |
| 19 | Ogni budget appare in tutte e tre le griglie | `BudgetProgressCard`, `BudgetForecastCard`, `BudgetHistoryChart`+`BudgetComparisonCard` renderizzati per ogni budget attivo |
| **Area obiettivi** | | |
| 20 | Nessun obiettivo di risparmio | Compare il messaggio empty state con il pulsante "Crea il Primo Obiettivo" |
| 21 | Click "Crea il Primo Obiettivo" o "Nuovo Obiettivo" | Si apre `SavingsGoalDialog` con form vuoto |
| 22 | Click su pulsante modifica di un obiettivo | Si apre `SavingsGoalDialog` precompilato |
| 23 | Click su pulsante "Aggiungi Fondi" | Si apre `SavingsGoalDialog` precompilato sull'obiettivo selezionato (via `handleAddFundsToGoal`) |
| 24 | Click su pulsante elimina obiettivo | Si apre `AlertDialog` di conferma |
| 25 | Conferma eliminazione obiettivo | L'obiettivo sparisce dalla griglia |
| **Area impostazioni** | | |
| 26 | `SecuritySettings` visibile e interattiva | La sezione PIN è presente; il dialog cambio PIN si apre al click |
| 27 | `CategoryManagement` visibile e interattiva | Le categorie sono elencate con pulsanti aggiunta/modifica/elimina funzionanti |
| 28 | `DataManagement` visibile | Il pulsante Export CSV è presente |
| 29 | Export CSV | Avvia il download del file con i dati corretti |
| 30 | `DisplaySettings`, `AudioSettings`, `HapticSettings`, `ScreenReaderSettings`, `TalkBackSettings` | Tutti visibili; le relative preferenze si salvano e persistono al reload |
| **Regressioni** | | |
| 31 | Nessuna regressione nel tab Movimenti | `TransactionsTab` funziona identicamente a prima del Passo 9 |
| 32 | Nessuna regressione nel tab Dashboard | `DashboardTab` funziona identicamente a prima del Passo 9 |
| 33 | `BudgetAlertBanner` → click "Visualizza Budget" | Naviga al tab Report e apre `BudgetDialog` precompilato (timeout 300ms intatto) |
| 34 | Shortcut globali da qualsiasi tab | Ctrl+N, Ctrl+M, Ctrl+D, Ctrl+T, Ctrl+R ancora funzionanti |
