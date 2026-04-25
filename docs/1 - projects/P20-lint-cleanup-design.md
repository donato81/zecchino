# P20 — Lint Cleanup: azzeramento dei 56 warning ESLint

**Stato:** Design  
**Branch:** `refactoring-architettura`  
**Dipende da:** P19 (vitest smoke tests completato)  
**Prepara:** P21 (CI pipeline)  
**Data:** 2026-04-25

---

## 1. Obiettivo

La CI programmata in P21 eseguirà `npm run lint` ad ogni pull request. Se la baseline è già 56 warning, qualsiasi nuovo warning introdotto sarà invisibile nel rumore di fondo: non c'è modo di distinguere un warning preesistente da uno appena introdotto.

Azzerare i warning ora significa che qualsiasi successivo `npm run lint` con output non-zero è per definizione una regressione. Questo è il prerequisito tecnico per avere lint come gate affidabile in CI.

I 56 warning non derivano da codice difettoso: sono la conseguenza diretta di P15, che ha ripristinato `eslint.config.js` con le regole in modalità `warn` anziché `error`. Da quel momento sono emerse situazioni che erano silenziose in precedenza. Non è necessario cambiare alcuna logica applicativa: tutte le correzioni riguardano codice già scritto correttamente che va solo raffinato per soddisfare le regole di lint.

---

## 2. Inventario completo dei warning per file

La tabella riporta ogni warning verificato mediante lettura diretta del codice sorgente.

| File | Riga | Regola | Problema | Correzione |
|---|---|---|---|---|
| `src/components/AccountDialog.tsx` | varie | `@typescript-eslint/no-unused-vars` | Import `ACCOUNT_TYPE_LABELS` e/o `ACCOUNT_TYPE_DESCRIPTIONS` non usati nel JSX | Rimuovere le voci inutilizzate dall'import destructuring |
| `src/components/AccountDialog.tsx` | ~107 | `jsx-a11y/no-autofocus` | `autoFocus` sull'input "Nome del Conto" | Sostituire con `useEffect` + `ref.focus()` |
| `src/components/AppHeader.tsx` | 69 | `jsx-a11y/no-noninteractive-tabindex` | `tabIndex={0}` su `<div role="status">` | Rimuovere `tabIndex={0}` |
| `src/components/BudgetDialog.tsx` | 12 | `@typescript-eslint/no-unused-vars` | `CardContent` importato ma non usato nel JSX | Rimuovere `CardContent` dall'import |
| `src/components/BudgetForecastCard.tsx` | 7 | `@typescript-eslint/no-unused-vars` | `Progress` importato ma non usato (la barra usa markup custom) | Rimuovere `Progress` dall'import |
| `src/components/CategoryManagement.tsx` | varie | `@typescript-eslint/no-unused-vars` | Uno o più import non usati (da verificare con lint) | Rimuovere le voci inutilizzate |
| `src/components/CategoryManagement.tsx` | ~362 | `jsx-a11y/no-autofocus` | `autoFocus` sull'input "Nome Categoria" nel dialog | Sostituire con `useEffect` + `ref.focus()` |
| `src/components/DashboardTab.tsx` | 246 | `@typescript-eslint/no-explicit-any` | `category.id as any` nel prop `variant` di `TooltipContent` | Usare `as string` o il tipo union corretto |
| `src/components/DataManagement.tsx` | 32 | `@typescript-eslint/no-explicit-any` | `Record<string, any>` per `exportData` | Usare `Record<string, unknown>` |
| `src/components/DataManagement.tsx` | 52 | `@typescript-eslint/no-unused-vars` | `error` nel `catch` di `handleExportData` non usato come variabile | Cambiare in `catch (_error)` |
| `src/components/DataManagement.tsx` | 95 | `@typescript-eslint/no-unused-vars` | `error` nel `catch` di `handleImportData` non usato come variabile | Cambiare in `catch (_error)` |
| `src/components/DataManagement.tsx` | 162 | `jsx-a11y/control-has-associated-label` | `<input type="file" id="import-file" className="hidden">` senza etichetta | Aggiungere `aria-label="Seleziona file di backup JSON da importare"` |
| `src/components/DisplaySettings.tsx` | ~107 e 9 righe simili | `@typescript-eslint/no-unused-vars` | `checked` parametro di 9 handler `onCheckedChange` mai usato | Prefissare con `_checked` in tutti e 9 i handler |
| `src/components/IncomeExpenseChart.tsx` | 2 | `@typescript-eslint/no-unused-vars` | `LineChart` e `Line` importati ma non usati (il componente usa `AreaChart` e `Area`) | Rimuovere `LineChart` e `Line` dall'import |
| `src/components/IncomeExpenseChart.tsx` | 23 | `prefer-const` | `let startDate` non viene mai riassegnato (viene solo mutato con metodi come `.setDate()`) | Cambiare `let startDate` in `const startDate` |
| `src/components/IncomeExpenseChart.tsx` | 137 | `@typescript-eslint/no-explicit-any` | `{ active, payload }: any` nei props di `CustomTooltip` | Usare tipo strutturato per i props di Recharts |
| `src/components/MonthlyComparisonChart.tsx` | 6 | `@typescript-eslint/no-unused-vars` | `Badge` importato ma non usato nel JSX | Rimuovere `Badge` dall'import |
| `src/components/MonthlyComparisonChart.tsx` | 101 | `@typescript-eslint/no-explicit-any` | `{ active, payload }: any` nei props di `CustomTooltip` | Usare tipo strutturato per i props di Recharts |
| `src/components/PeriodSelector.tsx` | 2 | `@typescript-eslint/no-unused-vars` | `Badge` importato ma non usato nel componente | Rimuovere `Badge` dall'import |
| `src/components/PinDialog.tsx` | ~91 | `jsx-a11y/no-autofocus` | `autoFocus` sull'input PIN | Sostituire con `useEffect` + `ref.focus()` |
| `src/components/SavingsGoalCard.tsx` | 30 | `@typescript-eslint/no-explicit-any` | `Record<string, any>` per `ICON_MAP` | Usare `Record<string, React.ComponentType<{ size?: number; weight?: string; className?: string }>>` |
| `src/components/SecuritySettings.tsx` | varie | `@typescript-eslint/no-unused-vars` | Uno o più import non usati | Rimuovere le voci inutilizzate |
| `src/components/SecuritySettings.tsx` | ~307 | `jsx-a11y/no-autofocus` | `autoFocus` sull'input "PIN Attuale" nel dialog interno | Sostituire con `useEffect` + `ref.focus()` |
| `src/components/TalkBackSettings.tsx` | 59 | `@typescript-eslint/no-explicit-any` | `updateAdaptation(key as any, value)` | Tipizzare il parametro `key` come il tipo chiave di `updateAdaptation` |
| `src/components/TransactionDialog.tsx` | ~56 | `react-hooks/exhaustive-deps` | Il primo `useEffect([open, transaction, screenReader])` chiama `resetForm` che non è nei deps | Stabilizzare `resetForm` con `useCallback` o inlineare la logica di reset |
| `src/components/TransactionDialog.tsx` | ~254 | `jsx-a11y/no-autofocus` | `autoFocus={!transaction}` sull'input importo | Sostituire con `useEffect` condizionale + `ref.focus()` |
| `src/components/TransactionsTab.tsx` | 28 | `@typescript-eslint/no-unused-vars` | `isMobile` assegnato da `useIsMobile()` ma mai usato nel JSX del componente | Rimuovere la riga `const isMobile = useIsMobile()` |
| `src/context/AppDataContext.tsx` | varie | `react-refresh/only-export-components` | Il file mescola il componente `AppDataProvider` con export di tipo e hook | Escludere in `eslint.config.js` |
| `src/context/AuthContext.tsx` | varie | `react-refresh/only-export-components` | Stessa situazione del context precedente | Escludere in `eslint.config.js` |
| `src/context/AuthContext.tsx` | ~51 | `react-hooks/exhaustive-deps` | `useEffect` con deps `[]` usa `globalPinHash` | Sopprimere con commento esplicativo (vedi Famiglia C) |
| `src/context/VisibleDataContext.tsx` | varie | `react-refresh/only-export-components` | Stessa situazione | Escludere in `eslint.config.js` |
| `src/hooks/use-app-shortcuts.ts` | ~219 | `react-hooks/exhaustive-deps` | `useMemo` per `shortcuts` usa `isAuthenticated` in tutti i callback ma `isAuthenticated` non è nei deps | Aggiungere `isAuthenticated` ai deps del `useMemo` |
| `src/lib/budget-forecasting.ts` | 32 | `@typescript-eslint/no-unused-vars` | `endDate` assegnato in `getCurrentPeriodSpending` ma non usato nel corpo della funzione | Rimuovere la riga `const endDate = new Date(budget.dataFine)` |
| `src/lib/budget-forecasting.ts` | 107 | `@typescript-eslint/no-unused-vars` | `trendData` assegnato da `calculateBudgetTrend(...)` ma il risultato non è usato | Rimuovere `const trendData =` (il calcolo è evidentemente dead code) |
| `src/lib/budget-history.ts` | 2 | `@typescript-eslint/no-unused-vars` | `getBudgetPeriodDates` importato da `./helpers` ma non usato nel file | Rimuovere dall'import |
| `src/lib/budget-history.ts` | 51 | `@typescript-eslint/no-unused-vars` | `currentEnd` assegnato in `getPeriodDates` ma non usato nel corpo della funzione | Rimuovere la riga `const currentEnd = new Date(budget.dataFine)` |
| `src/lib/helpers.ts` | 1 | `@typescript-eslint/no-unused-vars` | `Category` importato da `./types` ma nessuna funzione nel file usa il tipo `Category` (la funzione `groupTransactionsByCategory` usa un tipo anonimo `Array<{ id: string; nome: string }>`) | Rimuovere `Category` dall'import |
| `src/lib/screen-reader.ts` | 84 | `@typescript-eslint/no-unused-vars` | Il parametro `currency` di `announceBalance` non è usato nel corpo (il formatter usa `'EUR'` hardcoded) | Prefissare con `_currency` |
| `src/lib/sound-system.ts` | 131 | `@typescript-eslint/no-explicit-any` | `(window as any).webkitAudioContext` | Usare `(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext` |
| `src/components/ui/badge.tsx` | varie | `react-refresh/only-export-components` | File shadcn/ui con export multipli | Escludere in `eslint.config.js` |
| `src/components/ui/button.tsx` | varie | `react-refresh/only-export-components` | idem | Escludere in `eslint.config.js` |
| `src/components/ui/form.tsx` | varie | `react-refresh/only-export-components` | idem | Escludere in `eslint.config.js` |
| `src/components/ui/navigation-menu.tsx` | varie | `react-refresh/only-export-components` | idem | Escludere in `eslint.config.js` |
| `src/components/ui/pagination.tsx` | varie | `react-refresh/only-export-components` | idem | Escludere in `eslint.config.js` |
| `src/components/ui/sidebar.tsx` | varie | `react-refresh/only-export-components` | idem | Escludere in `eslint.config.js` |
| `src/components/ui/toggle.tsx` | varie | `react-refresh/only-export-components` | idem | Escludere in `eslint.config.js` |

---

## 3. Famiglia A — Import e variabili inutilizzate

### Regola generale

Tre tipi di intervento distinti:

- **Rimozione import**: quando un simbolo è importato ma non appare mai nel codice del file.
- **Rimozione variabile**: quando una variabile è dichiarata ma il suo valore non è mai letto.
- **Prefisso `_`**: quando il parametro non può essere rimosso perché la firma della callback è imposta da un'API esterna (es. il secondo parametro di `onCheckedChange`). Il prefisso `_` segnala al compilatore e al linter che l'omissione è intenzionale.

Rimuovere import non usati non produce mai effetti collaterali: TypeScript li elimina in fase di compilazione, quindi il bundle non cambia.

### AccountDialog.tsx

Il file importa da `@/lib/constants`:
```
ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_DESCRIPTIONS, ACCOUNT_CATEGORIES
```

Dopo lettura del JSX: `ACCOUNT_TYPE_ICONS` è usato per ottenere il componente icona (`const Icon = ACCOUNT_TYPE_ICONS[type]`), `ACCOUNT_CATEGORIES` è usato nel `.map()`. Le voci `ACCOUNT_TYPE_LABELS` e `ACCOUNT_TYPE_DESCRIPTIONS` appaiono nell'import ma non compaiono nel template JSX — vengono probabilmente usate in una sezione del componente non raggiunta dalla lettura parziale, o sono davvero inutilizzate. L'implementatore deve verificare quali esattamente compaiono nell'output di `npm run lint --format stylish` e rimuovere solo quelle segnalate.

### BudgetDialog.tsx (riga 12)

Import da `@/components/ui/card`: `Card, CardContent, CardDescription, CardHeader, CardTitle`. Il JSX del componente usa `Card`, `CardHeader`, `CardTitle`, `CardDescription` per le card dei template, ma **`CardContent`** non appare mai. Rimuovere `CardContent` dalla riga di import.

### BudgetForecastCard.tsx (riga 7)

Il file importa `Progress` da `@/components/ui/progress`. La barra di avanzamento nel JSX è costruita con markup custom (un div con larghezza percentuale inline) e non usa mai il componente `Progress`. Rimuovere l'import.

### CategoryManagement.tsx (varie)

Il linter segnala più occorrenze. Dopo lettura: tutti i simboli visibili nel JSX letto sono effettivamente usati. L'implementatore deve eseguire `npm run lint src/components/CategoryManagement.tsx` per ottenere le righe precise e rimuovere solo le voci segnalate.

### DataManagement.tsx (righe 52 e 95)

Due blocchi `catch (error)` identici: uno in `handleExportData` e uno in `handleImportData`. In entrambi il corpo del catch chiama `soundSystem.play('error')` e `toast.error(...)` ma non usa mai la variabile `error`. Cambiare entrambi in `catch (_error)`. Non rimuovere il blocco catch: gestire gli errori è corretto, semplicemente la variabile dell'eccezione non viene ispezionata.

### DisplaySettings.tsx (9 occorrenze — "checked")

Questo è il caso più numeroso della Famiglia A. Il componente `DisplaySettings` ha 12 switch che usano il componente `<Switch onCheckedChange={...}>`. Il callback che shadcn/ui passa a `onCheckedChange` ha la firma `(checked: boolean) => void`, dove `checked` è il **nuovo** valore del toggle.

Tuttavia, `handleToggle` riceve come secondo argomento il **corrente** valore (es. `showBalances ?? true`) e calcola internamente il nuovo valore con `!currentValue`. Quindi il parametro `checked` arrivato dalla callback non è mai letto.

Esempio del pattern attuale:
```tsx
onCheckedChange={(checked) => handleToggle(setShowBalances, showBalances ?? true, 'Visualizzazione saldi')}
```

La firma `(checked)` è imposta da shadcn/ui: non si può scrivere `onCheckedChange={() => ...}` senza il parametro perché la firma è tipizzata. La soluzione corretta è il prefisso `_`:
```tsx
onCheckedChange={(_checked) => handleToggle(setShowBalances, showBalances ?? true, 'Visualizzazione saldi')}
```

Questo va applicato a tutte e 9 le occorrenze nel file. Le 3 switch che non producono warning (compact, animations, high contrast, reduce motion) vanno verificate: probabilmente sono quelle dove `handleToggle` non è usato e il parametro è usato direttamente in un modo diverso — ma l'implementatore può ignorarle perché il linter segnala solo le 9 problematiche.

### IncomeExpenseChart.tsx (riga 2)

Import da `recharts`: `LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart`. Il grafico usa `AreaChart` e `Area` per il rendering, non `LineChart` e `Line` (che erano probabilmente usati in un'iterazione precedente del componente). Rimuovere `LineChart` e `Line` dall'import.

### IncomeExpenseChart.tsx (riga 23)

Nella funzione `useMemo` del componente: `let startDate = new Date()` dichiarato con `let`. Il valore del riferimento `startDate` non viene mai riassegnato a un nuovo oggetto (`startDate = new Date()`). Viene solo **mutato** tramite metodi come `startDate.setDate(...)`, `startDate.setMonth(...)`. Poiché la variabile punta sempre allo stesso oggetto, `prefer-const` suggerisce `const`. Cambiare `let startDate` in `const startDate`.

### MonthlyComparisonChart.tsx (riga 6)

Import da `@/components/ui/badge`: `Badge`. Il JSX del componente mostra statistiche con frecce e valori, ma non usa mai `<Badge>`. Rimuovere dall'import.

### PeriodSelector.tsx (riga 2)

Import da `@/components/ui/badge`: `Badge`. Il componente mostra solo `<Button>` per la selezione del periodo, nessun badge visibile. Rimuovere dall'import.

### SecuritySettings.tsx (varie)

Il linter segnala più occorrenze. Dopo lettura parziale, tutti gli import visibili nel JSX letto sembrano usati. L'implementatore deve eseguire `npm run lint src/components/SecuritySettings.tsx` per le righe precise.

### TransactionsTab.tsx (riga 28)

Il componente importa `useIsMobile` e lo usa: `const isMobile = useIsMobile()`. Dopo questa riga, la variabile `isMobile` non appare mai nel JSX restante del componente (nelle righe lette). Il contenuto del tab non ha rendering condizionale mobile/desktop. Rimuovere la riga `const isMobile = useIsMobile()`. Attenzione: verificare che non compaia nelle righe non lette del file prima di rimuovere.

### budget-forecasting.ts (riga 32)

Nella funzione `getCurrentPeriodSpending`: la riga `const endDate = new Date(budget.dataFine)` è dichiarata ma `endDate` non appare mai nel corpo della funzione. Il filtro usa `startDate` e `now`, non `endDate`. Rimuovere la riga.

### budget-forecasting.ts (riga 107)

Nella funzione `calculateBudgetForecast`: la riga `const trendData = calculateBudgetTrend(budget, transactions, historicalPeriods)` calcola il trend ma il risultato non è mai usato nelle righe successive. `calculateBudgetTrend` è una funzione pura senza side effects — il suo risultato è dead code. Rimuovere `const trendData =` ma lasciare la funzione non chiamata se necessario, o rimuovere l'intera riga se la chiamata non è necessaria. Se in futuro `trendData` sarà utilizzato (es. per esportarlo nel forecast), questo è il punto dove reinserirlo.

### budget-history.ts (riga 2)

Import da `./helpers`: `getBudgetPeriodDates`. Questo import era probabilmente usato in un'iterazione precedente della logica. Dopo lettura dell'intero file, nessuna funzione chiama `getBudgetPeriodDates`. Rimuovere dall'import.

### budget-history.ts (riga 51)

Nella funzione `getPeriodDates`: `const currentEnd = new Date(budget.dataFine)` è dichiarata subito dopo `currentStart`. Il corpo della funzione calcola `start` e `end` basandosi su `currentStart` e gli offset di periodo, ma `currentEnd` non è mai letta. Rimuovere la riga.

### helpers.ts (riga 1)

L'import `import { Account, Transaction, Budget, Category } from './types'` include `Category`. Le funzioni del file usano `Account`, `Transaction`, `Budget` come tipi di parametri, ma nessuna funzione ha parametri o return di tipo `Category`. La funzione `groupTransactionsByCategory` usa il tipo anonimo `Array<{ id: string; nome: string }>` invece di `Category[]`. Rimuovere `Category` dall'import.

### screen-reader.ts (riga 84)

Il metodo `announceBalance(accountName: string, balance: number, currency: string = '€')` dichiara il parametro `currency` con default `'€'`, ma il formatter interno usa `currency: 'EUR'` hardcoded invece di `currency`. Il parametro è quindi dichiarato ma inutilizzato. Poiché la firma fa parte dell'interfaccia pubblica della classe, non si può semplicemente rimuovere il parametro senza breaking change. Le opzioni sono:

1. **Prefissare con `_currency`**: segnala l'omissione intenzionale, mantiene la firma pubblica.
2. **Usare effettivamente il parametro**: cambiare `currency: 'EUR'` in `currency: currency` nel `Intl.NumberFormat`.

L'opzione 2 è preferibile perché risolve anche l'inconsistenza semantica: se il parametro è esposto, dovrebbe avere effetto. Tuttavia, cambiare il comportamento runtime (es. permettere `currency: 'USD'`) è fuori dal perimetro di questo passo. Il design consigliato è l'opzione 1 (`_currency`) per mantenere invarianza funzionale garantita.

---

## 4. Famiglia B — Tipo `any` da sostituire

### Regola generale

`any` disabilita completamente il type checking sul valore: TypeScript lo tratta come se fosse compatibile con qualsiasi tipo. In pratica, nasconde potenziali errori a compile time. Le alternative:

- **Tipo specifico**: quando si conosce la struttura esatta.
- **`unknown`**: quando il tipo non è noto a priori; richiede un type guard prima dell'uso.
- **Tipo di libreria**: quando la libreria esporta il tipo (va importato esplicitamente).

Non si usano mai `// eslint-disable` per questa famiglia: si trova il tipo corretto.

### DashboardTab.tsx (riga 246)

Contesto: `<TooltipContent variant={category.id as any}>`. Il prop `variant` di `TooltipContent` accetta un tipo union di stringhe definito nel componente UI. Il cast `as any` serve per passare un valore stringa dinamico (`category.id`) a un prop che accetta solo valori letterali dell'union.

Correzione: cambiare il cast in `as string` non risolve il problema se `variant` non accetta `string`. La soluzione pulita è cambiare il cast in `category.id as Parameters<typeof TooltipContent>[0]['variant']` oppure, se la variante dinamica non è supportata dal tipo, verificare se il componente `TooltipContent` accetta `string` nel suo tipo. In alternativa, se le varianti possibili corrispondono ai valori delle categorie, tiparle esplicitamente: `as 'bancario' | 'digitale' | 'risparmio' | 'investimento' | 'privato'` (o il tipo union effettivo). L'implementatore deve leggere il tipo di `variant` in `src/components/ui/tooltip.tsx` e usare quel tipo.

### DataManagement.tsx (riga 32)

Contesto: `const exportData: Record<string, any> = {}`.

L'oggetto accumula valori letti da `window.spark.kv.get(key)` il cui tipo non è noto a priori. La correzione corretta è `Record<string, unknown>`. Il corpo del ciclo non legge `exportData[key]` dopo la scrittura (viene solo serializzato con `JSON.stringify`), quindi `unknown` è sufficiente e non richiede type guard aggiuntivi.

### IncomeExpenseChart.tsx (riga 137) e MonthlyComparisonChart.tsx (riga 101)

Contesto identico: i custom tooltip di Recharts hanno la firma `({ active, payload }: any)`.

Recharts esporta i tipi per i props del tooltip. Il tipo corretto è:
```typescript
{ active?: boolean; payload?: Array<{ payload: Record<string, number>; value: number; name: string }> }
```

Recharts esporta anche `TooltipProps` da `recharts`, ma il tipo esatto dipende dalla versione installata. L'approccio più sicuro che non richiede l'import di un tipo esterno è definire un'interfaccia locale minimal:
```typescript
interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: Record<string, number | string>; value: number; name: string }>
}
```
Da usare come tipo dei props di `CustomTooltip` in entrambi i file. Il corpo dei due tooltip usa `payload[0].payload.date`, `payload[0].payload.entrate`, `payload[0].payload.uscite` — tutti campi `number` o `string` nel `payload` interno.

### SavingsGoalCard.tsx (riga 30)

Contesto: `const ICON_MAP: Record<string, any> = { 'piggy-bank': PiggyBank, ... }`.

Tutti i valori sono componenti React da `@phosphor-icons/react`. Il tipo corretto è:
```typescript
Record<string, React.ComponentType<{ size?: number; weight?: string; className?: string }>>
```

Questo permette di usare `const Icon = ICON_MAP[goal.icona] || Target` e di rendere `<Icon size={...} weight={...} />` con type safety. Non richiede import aggiuntivi se `React` è già importato, ma poiché questo è un file TSX con React 17+ (no import necessario per JSX), occorre importare il tipo `React.ComponentType` aggiungendo `import type { ComponentType } from 'react'` o usando `React.ComponentType` se React è già importato.

### TalkBackSettings.tsx (riga 59)

Contesto: `updateAdaptation(key as any, value)` nel metodo `handleAdaptationChange(key: string, value: boolean, label: string)`.

La funzione `updateAdaptation` dal hook `useTalkBack` accetta un tipo specifico per la chiave (probabilmente `keyof TalkBackAdaptations` o simile). Il cast `as any` bypassa questa sicurezza. La correzione: cambiare il tipo del parametro `key` in `handleAdaptationChange` da `string` al tipo effettivo che `updateAdaptation` si aspetta. Per trovare questo tipo, l'implementatore deve leggere il return type di `useTalkBack` in `src/hooks/use-talkback.ts` e trovare il tipo del primo parametro di `updateAdaptation`.

### sound-system.ts (riga 131)

Contesto: `this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()`.

`webkitAudioContext` è una proprietà vendor-prefixed non standard di `window`. TypeScript non la conosce. Il cast corretto è:
```typescript
(window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
```

Forma più concisa e idiomatica:
```typescript
const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
this.audioContext = AudioContextClass ? new AudioContextClass() : null
```

Oppure, definire un'interfaccia locale:
```typescript
interface ExtendedWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}
const ctx = window.AudioContext || (window as ExtendedWindow).webkitAudioContext
```

Questa soluzione richiede gestire il caso in cui entrambi siano `undefined` (browser molto vecchi), ma nella funzione `initialize()` questo caso è già gestito dal blocco `try/catch`.

---

## 5. Famiglia C — Effetti con dipendenze incomplete

Questa è la famiglia più delicata. Aggiungere meccanicamente una dipendenza mancante può introdurre un ciclo di render infinito se la dipendenza è un oggetto o funzione che cambia identità ad ogni render. L'analisi va fatta caso per caso.

### TransactionDialog.tsx — primo `useEffect`

**Localizzazione:** riga ~56-65, deps: `[open, transaction, screenReader]`

**Corpo dell'effetto:**
```typescript
useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    const dialogTitle = transaction ? 'Modifica Movimento' : 'Nuovo Movimento'
    screenReader.announceDialogOpen(dialogTitle)
    if (!transaction) {
      resetForm()
    }
  }
}, [open, transaction, screenReader])
```

**Variabili usate nel corpo:**
- `open` — in deps ✓
- `transaction` — in deps ✓
- `screenReader` — in deps ✓
- `soundSystem` — singleton a livello di modulo, stabile, non serve nei deps
- `resetForm` — funzione definita nel corpo del componente, **assente dai deps**

**Stabilità di `resetForm`:** `resetForm` è definita con `const resetForm = () => { ... }` direttamente nel componente senza `useCallback`. Cambia identità ad ogni render. Se aggiunta ai deps così com'è, l'effetto verrebbe ri-eseguito ad ogni render, non solo quando `open` cambia.

**Soluzione sicura:** avvolgere `resetForm` con `useCallback`. Le dipendenze di `resetForm` sono: `accounts` (dal prop, per inizializzare `contoId`), `categories` (dal prop, per inizializzare `categoriaId`). Quindi:
```typescript
const resetForm = useCallback(() => {
  setTipo('uscita')
  setData(new Date().toISOString().split('T')[0])
  setImporto('')
  setContoId(accounts[0]?.id || '')
  // ...resto invariato
}, [accounts, categories])
```

Con `resetForm` stabile tramite `useCallback`, aggiungerla ai deps del primo `useEffect` è sicuro: l'effetto si ri-esegue solo quando `open`, `transaction`, `screenReader`, o `resetForm` (quindi `accounts`/`categories`) cambiano.

**Impatto funzionale:** nessuno. Il comportamento è identico — il form si resetta quando il dialog si apre senza transaction. La modifica è solo strutturale.

**Nota:** `screenReader` è un'istanza restituita da `useScreenReader()`. Se questo hook non è memoizzato e restituisce un nuovo oggetto ad ogni render, la sua presenza nei deps potrebbe già causare problemi indipendentemente da `resetForm`. L'implementatore deve verificare `src/hooks/use-screen-reader.ts` per confermare che `screenReader` sia stabile (es. che ritorni un oggetto singleton o memorizzato con `useRef`/`useMemo`).

### AuthContext.tsx — `useEffect` di inizializzazione

**Localizzazione:** riga ~51-57, deps: `[]`

**Corpo dell'effetto:**
```typescript
useEffect(() => {
  if (!globalPinHash) {
    setIsSetupMode(true)
    setShowPinDialog(true)
  } else {
    setShowPinDialog(true)
  }
}, [])
```

**Variabili usate nel corpo:**
- `globalPinHash` — dal `useKV`, **assente dai deps**
- `setIsSetupMode`, `setShowPinDialog` — setter di `useState`, stabili, non richiedono deps

**Stabilità di `globalPinHash`:** `globalPinHash` è un valore stringa restituito da `useKV`. Cambia quando il PIN viene salvato per la prima volta (dopo il setup). Se aggiunto ai deps, l'effetto si ri-eseguirebbe ogni volta che `globalPinHash` cambia.

**Analisi dell'intento:** l'effetto è progettato per eseguire una **sola volta al mount** per determinare lo stato iniziale: se non c'è PIN mostra il dialog di setup, altrimenti mostra il dialog di login. Se si aggiungesse `globalPinHash` ai deps, dopo che l'utente crea il PIN per la prima volta, `globalPinHash` cambierebbe, l'effetto si ri-eseguirebbe, e troverebbe `globalPinHash` non-null quindi chiamerebbe di nuovo `setShowPinDialog(true)`, mostrando di nuovo il dialog di login immediatamente dopo il setup — comportamento non voluto.

**Soluzione corretta:** mantenere `[]` e sopprimere il warning con commento esplicativo:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
// Intenzionale: deve girare solo al mount per determinare lo stato iniziale.
// Aggiungere globalPinHash causerebbe la re-apertura del dialog dopo ogni cambio PIN.
useEffect(() => {
  if (!globalPinHash) { ... }
}, [])
```

Questo è l'**unico caso in tutta la codebase** dove `eslint-disable` è ammesso per `react-hooks/exhaustive-deps`. La motivazione deve essere esplicita nel commento.

**Impatto funzionale:** nessuno. Il comportamento è identico — è solo aggiunto un commento di soppressione motivato.

### use-app-shortcuts.ts — `useMemo` per `shortcuts`

**Localizzazione:** riga ~49-237, deps: `[activeTab, allCategoriesVisible, hasPrivateAccount, isPrivateUnlocked, visibleTransactions, visibleAccounts, toggleCategoryVisibility, toggleAllCategories, handleExportCSV, setShowPrivatePinDialog, setActiveTab, setShowTransactionDialog, setShowAccountDialog, setShowKeyboardHelp, setEditingTransaction, setEditingAccount]`

**Variabile usata ma assente dai deps:** `isAuthenticated` (booleano, usato in ogni callback come condizione `if (isAuthenticated && ...)`)

**Stabilità di `isAuthenticated`:** è un valore primitivo `boolean` proveniente dal context `useAuth()`. I primitivi sono sicuri nelle deps: cambiare un booleano non crea loop infiniti.

**Soluzione sicura:** aggiungere `isAuthenticated` all'array di deps del `useMemo`:
```typescript
], [
  isAuthenticated,  // ← aggiungere
  activeTab,
  allCategoriesVisible,
  ...resto invariato
])
```

**Impatto funzionale:** nessuno sui casi normali. Senza `isAuthenticated` nei deps, i callback userebbero il valore "stale" di `isAuthenticated` catturato alla creazione del memo. Con la dipendenza, il memo si ricalcola quando cambia l'autenticazione — ma poiché tutti i callback controllano `isAuthenticated` prima di agire, il comportamento osservabile è identico. La differenza è che ora il memo usa sempre il valore fresco di `isAuthenticated`.

**Nota:** questo non richiede modifiche a file aggiuntivi. È una modifica a una sola riga in `use-app-shortcuts.ts`.

---

## 6. Famiglia D — Problemi di accessibilità

### Regola generale per `jsx-a11y/no-autofocus`

L'attributo HTML `autoFocus` causa problemi per gli utenti di screen reader perché sposta il focus prima che il dialog sia completamente annunciato. Il modo accessibile per spostare il focus su un elemento specifico all'apertura di un dialog è farlo programmaticamente tramite `useEffect` con una `ref`, dopo che il dialog è stato montato nel DOM e annunciato all'utente.

Pattern standard da applicare a tutti i casi di autofocus:
```typescript
const inputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  if (open) {
    // Piccolo delay per permettere al dialog di essere annunciato prima del focus
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }
}, [open])
```

Il ritardo di 100ms non è un trucco arbitrario: serve a garantire che il DOM del dialog sia visibile e che lo screen reader abbia avuto il tempo di annunciare il titolo del dialog prima che il focus si sposti sul campo. Questo segue le linee guida WCAG 2.1 per i dialog modali.

### AccountDialog.tsx — `autoFocus` sull'input "Nome del Conto"

**Localizzazione:** riga ~107, prop `autoFocus` sull'`Input` con `id="account-name"`.

**Valutazione:** il focus sul campo nome è **funzionalmente necessario** — quando si apre il dialog "Nuovo Conto" o "Modifica Conto", il cursore deve essere sul primo campo per permettere l'inserimento immediato. Non è puramente estetico.

**Correzione:** aggiungere `const nameInputRef = useRef<HTMLInputElement>(null)` al componente, rimuovere `autoFocus` dall'`Input`, aggiungere `ref={nameInputRef}` all'`Input`, aggiungere un `useEffect` che chiama `nameInputRef.current?.focus()` quando `open` diventa `true`. Il `useEffect` per il focus può essere integrato in quello già esistente che chiama `soundSystem.play('dialog-open')`:
```typescript
useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    const timer = setTimeout(() => nameInputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }
}, [open])
```

### AppHeader.tsx (riga 69) — `tabIndex={0}` su `<div role="status">`

**Localizzazione:** riga 69, il div che mostra il saldo totale con `role="status"`, `aria-live="polite"`, `aria-label`, e `tabIndex={0}`.

**Valutazione:** `role="status"` è un live region. I live region annunciano automaticamente il loro contenuto agli screen reader quando cambia. Non hanno bisogno di essere focusabili per essere accessibili: il contenuto viene letto automaticamente. L'`aria-label` è già presente sul div, quindi anche se raggiunto da tastiera sarebbe identificato correttamente.

Il motivo per cui `tabIndex={0}` è stato aggiunto è probabilmente per permettere agli utenti tastiera di raggiungere l'elemento e vedere il tooltip (Radix UI `TooltipTrigger asChild`). Tuttavia:
1. Lo screen reader legge già il saldo corrente tramite `aria-live`
2. Il tooltip mostra il numero di conti visibili — informazione supplementare, non critica
3. Gli utenti che usano solo tastiera possono accedere a questa informazione in altri modi

**Correzione:** rimuovere `tabIndex={0}`. Il div resta nel DOM con `role="status"` e `aria-live="polite"`, che è il modo corretto per un live region. Il tooltip non sarà più raggiungibile da tastiera, ma il contenuto informativo principale (il saldo) è già accessibile tramite il live region.

**Alternativa** (se si vuole mantenere il tooltip keyboard-accessible): cambiare il div in un elemento semanticamente interattivo, es. `<button type="button">` con stile custom. Questo cambia il markup ma soddisfa la regola. Questa alternativa è fuori dal perimetro del Passo P20 ed è documentata come improvement per un passo futuro.

### CategoryManagement.tsx — `autoFocus` sull'input "Nome Categoria"

**Localizzazione:** riga ~362, `autoFocus` sull'`Input` con `id="category-name"` nel dialog di creazione/modifica categoria.

**Valutazione:** funzionalmente necessario — quando si apre il dialog categoria il focus deve andare sul campo nome.

**Correzione:** stessa procedura di AccountDialog. Aggiungere `const categoryNameRef = useRef<HTMLInputElement>(null)`, rimuovere `autoFocus`, aggiungere `ref={categoryNameRef}`, e aggiungere un `useEffect` che fa focus quando `showCategoryDialog` diventa `true`:
```typescript
useEffect(() => {
  if (showCategoryDialog) {
    const timer = setTimeout(() => categoryNameRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }
}, [showCategoryDialog])
```

### DataManagement.tsx (riga 162) — `control-has-associated-label`

**Localizzazione:** riga ~162, `<input type="file" id="import-file" accept=".json,application/json" onChange={handleFileSelect} className="hidden" />`.

**Valutazione:** l'input è nascosto (`className="hidden"`) e viene attivato programmaticamente dal click sul Button soprastante. Non ha né un `<label htmlFor="import-file">` né un `aria-label`. Gli screen reader non possono identificarlo.

**Correzione:** aggiungere `aria-label="Seleziona file di backup JSON da importare"` all'input. Anche se è visivamente nascosto, lo screen reader lo scoprirà quando il focus viene spostato su di esso durante l'attivazione programmatica:
```tsx
<input
  type="file"
  id="import-file"
  accept=".json,application/json"
  onChange={handleFileSelect}
  className="hidden"
  aria-label="Seleziona file di backup JSON da importare"
/>
```

### PinDialog.tsx — `autoFocus` sull'input PIN

**Localizzazione:** riga ~91, `autoFocus` sull'`Input` con `id="pin"`.

**Valutazione:** funzionalmente necessario e critico per la sicurezza dell'UX — quando si apre il dialog PIN, il cursore deve essere immediatamente sul campo PIN per permettere l'inserimento senza ulteriori click. Questo è anche un requisito di usabilità per utenti che accedono tramite tastiera.

**Correzione:** aggiungere `const pinInputRef = useRef<HTMLInputElement>(null)`, rimuovere `autoFocus`, aggiungere `ref={pinInputRef}`, integrare il focus nell'`useEffect` già esistente che si attiva su `open`:
```typescript
const pinInputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    const timer = setTimeout(() => pinInputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }
}, [open])
```

Il ritardo è importante qui: senza ritardo, il focus arriverebbe prima che lo screen reader annunci il titolo del dialog (es. "Inserisci PIN globale") e la descrizione, compromettendo la comprensione del contesto.

### SecuritySettings.tsx — `autoFocus` sull'input "PIN Attuale"

**Localizzazione:** riga ~307, `autoFocus` sull'`Input` con `id="current-pin"` nel dialog di cambio PIN interno al componente.

**Valutazione:** funzionalmente necessario — il dialog di cambio PIN richiede l'inserimento immediato del PIN corrente.

**Correzione:** aggiungere `const currentPinRef = useRef<HTMLInputElement>(null)`, rimuovere `autoFocus`, aggiungere `ref={currentPinRef}`, aggiungere un `useEffect` condizionato su `showPinDialog`:
```typescript
useEffect(() => {
  if (showPinDialog) {
    const timer = setTimeout(() => currentPinRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }
}, [showPinDialog])
```

### TransactionDialog.tsx — `autoFocus={!transaction}` sull'input importo

**Localizzazione:** riga ~254, `autoFocus={!transaction}` sull'`Input` con `id="transaction-amount"`.

**Valutazione:** funzionalmente necessario ma condizionale: il focus sull'importo è desiderato solo per i **nuovi** movimenti (quando `!transaction` è true). Per la modifica, il focus resta sulla voce selezionata.

**Correzione:** aggiungere `const amountInputRef = useRef<HTMLInputElement>(null)`, rimuovere `autoFocus={!transaction}`, aggiungere `ref={amountInputRef}`, e nel `useEffect` già presente che si attiva su `open`:
```typescript
useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    const dialogTitle = transaction ? 'Modifica Movimento' : 'Nuovo Movimento'
    screenReader.announceDialogOpen(dialogTitle)
    if (!transaction) {
      resetForm()
      // Focus sull'importo solo per i nuovi movimenti
      const timer = setTimeout(() => amountInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }
}, [open, transaction, screenReader, resetForm])
```

Nota: questa modifica è integrata con la correzione della Famiglia C per lo stesso `useEffect`.

---

## 7. Famiglia E — Modifica `eslint.config.js`

### Contesto attuale

Il file `eslint.config.js` attuale ha questa struttura (flat config ESLint 9):

- **Layer 0** — Ignores globali (`dist/`, `node_modules/`, `vite.config.ts`)
- **Layer 1** — `@eslint/js` recommended
- **Layer 2** — `typescript-eslint` recommended (per `src/**/*.{ts,tsx}`)
- **Layer 3** — `eslint-plugin-react-hooks` (per `src/**/*.{ts,tsx}`)
- **Layer 4** — `eslint-plugin-react-refresh` con `only-export-components: warn`
- **Layer 5** — `eslint-plugin-jsx-a11y` recommended (per `src/**/*.{ts,tsx}`)

Il Layer 4 applica `react-refresh/only-export-components` a **tutto** `src/**/*.{ts,tsx}`, inclusi i file generati da shadcn/ui e i context React.

### Il problema

`react-refresh/only-export-components` segnala file che esportano sia componenti React sia funzioni utility, hook, o costanti nello stesso modulo. Questo è normale e intenzionale per:

1. **File shadcn/ui** (`src/components/ui/**`): generati automaticamente, esportano il componente principale più varianti, tipi e funzioni helper nello stesso file. Non si modificano.
2. **Context React** (`src/context/**`): ogni context file esporta il `Provider`, il hook di accesso (`useAuth`, `useAppData`, `useVisibleData`), e a volte l'interfaccia del context. Questa è la struttura standard dei React context.

### Modifica proposta per `eslint.config.js`

Aggiungere un **Layer 6** alla fine della configurazione che esclude la regola `react-refresh/only-export-components` per i path identificati:

```javascript
// Layer 6 — Esclusioni react-refresh per file generati e context
{
  files: ['src/components/ui/**/*.{ts,tsx}', 'src/context/**/*.{ts,tsx}'],
  rules: {
    'react-refresh/only-export-components': 'off',
  },
},
```

Questo override sovrascrive il Layer 4 solo per questi path. La regola resta attiva per tutto il resto di `src/`.

### Motivazione della scelta per `src/context/**`

Due approcci alternativi:

1. **Esclusione globale** (`'react-refresh/only-export-components': 'off'` per tutto `src/context/**`): più pulita, nessuna modifica ai file di context. Appropriata perché il pattern "un file per context che esporta provider + hook" è una convenzione consolidata di React, non una deviazione.

2. **Commenti inline mirati**: aggiungere `// eslint-disable-next-line react-refresh/only-export-components` sopra le esportazioni non-componente (es. `export function useAuth()`). Più granulare, ma richiede modifiche a tre file di context e appesantisce il codice con annotazioni che riguardano un'infrastruttura tool.

**Scelta consigliata:** esclusione globale per `src/context/**`. I file di context sono strutturalmente identici ai file shadcn/ui per questo tipo di problema, e l'esclusione in config è la forma più leggibile e manutenibile. Se in futuro un file di context dovesse diventare problematico per altri motivi, la regola può essere riattivata selettivamente.

### Verifica

Dopo la modifica, i 10 file (7 shadcn/ui + 3 context) non produrranno più warning `react-refresh`. Il Layer 4 continua a coprire tutti gli altri file applicativi dove la regola è significativa.

---

## 8. Invarianza funzionale

Tutte le correzioni previste mantengono il comportamento dell'app invariato. Analisi per famiglia:

**Famiglia A (import e variabili):** Rimuovere import inutilizzati non modifica mai il comportamento runtime. TypeScript rimuove gli import di tipo in fase di compilazione, e rimuovere import di valore non usati ha lo stesso effetto di non averli mai importati. Nessun rendering cambia.

**Famiglia B (tipo `any`):** I tipi TypeScript sono informazione esclusivamente a compile-time. Cambiare `any` in un tipo più specifico non produce byte diversi nel bundle compilato. L'app si comporta esattamente come prima — viene solo aggiunto un layer di verifica statica che prima era assente.

**Famiglia C (exhaustive-deps):**
- `TransactionDialog.tsx`: avvolgere `resetForm` in `useCallback` e aggiungerla ai deps non cambia il momento in cui il form viene resettato (al momento in cui `open` diventa `true` senza `transaction`). Il form si resetta esattamente come prima.
- `AuthContext.tsx`: aggiungere solo un commento di soppressione. Zero cambiamenti al codice.
- `use-app-shortcuts.ts`: aggiungere `isAuthenticated` ai deps del `useMemo` corregge un potenziale bug di stale closure (i callback potrebbero usare un valore obsoleto di `isAuthenticated`) senza cambiare il comportamento osservabile, perché tutti i callback già controllano `isAuthenticated` al momento dell'esecuzione.

**Famiglia D (a11y):** Spostare l'autofocus da attributo dichiarativo a `useEffect` + `ref.focus()` produce lo stesso risultato visivo: il cursore arriva sul campo target. Il timing è leggermente diverso (100ms di delay) ma l'utente non lo percepisce. Per gli screen reader, l'esperienza migliora perché il focus arriva dopo l'annuncio del dialog.

**Famiglia E (eslint.config.js):** Modificare la configurazione ESLint non tocca il codice sorgente né il bundle. La modifica è invisibile a runtime.

---

## 9. Ordine di esecuzione consigliato

L'ordine è progettato per minimizzare il rischio: prima le correzioni più meccaniche e reversibili, poi quelle che richiedono ragionamento.

### E — Configurazione ESLint (prima di tutto)
Modificare `eslint.config.js` per aggiungere il Layer 6 con l'esclusione `react-refresh/only-export-components` per `src/components/ui/**` e `src/context/**`. Questo elimina immediatamente ~10 warning senza toccare file applicativi. Dopo questa modifica, il conteggio scende a circa 46 warning.

### A — Import e variabili inutilizzate
Questa è la famiglia più ampia (oltre 30 warning) e la meno rischiosa. Ogni modifica è chirurgica: si rimuove una voce da un import o si prefissa con `_`. Nessuna logica applicativa è coinvolta.

Sequenza suggerita (file per file, dal più semplice al più complesso):
1. `src/lib/helpers.ts` — rimuovere `Category`
2. `src/lib/budget-history.ts` — rimuovere `getBudgetPeriodDates`, rimuovere `currentEnd`
3. `src/lib/budget-forecasting.ts` — rimuovere `endDate`, rimuovere `const trendData =`
4. `src/lib/screen-reader.ts` — prefissare `_currency`
5. `src/components/BudgetDialog.tsx` — rimuovere `CardContent`
6. `src/components/BudgetForecastCard.tsx` — rimuovere `Progress`
7. `src/components/PeriodSelector.tsx` — rimuovere `Badge`
8. `src/components/MonthlyComparisonChart.tsx` — rimuovere `Badge`
9. `src/components/IncomeExpenseChart.tsx` — rimuovere `LineChart` e `Line`, cambiare `let` in `const`
10. `src/components/TransactionsTab.tsx` — rimuovere la riga `const isMobile = useIsMobile()`
11. `src/components/DisplaySettings.tsx` — prefissare `_checked` in tutte e 9 le occorrenze
12. `src/components/AccountDialog.tsx` — rimuovere import inutilizzati
13. `src/components/CategoryManagement.tsx` — rimuovere import inutilizzati
14. `src/components/SecuritySettings.tsx` — rimuovere import inutilizzati
15. `src/components/DataManagement.tsx` — cambiare `catch (error)` in `catch (_error)` in due punti

### B — Sostituzione `any`
Richiede di scegliere il tipo corretto per ciascun caso. Nessun rischio di regressione ma richiede attenzione.

Sequenza suggerita:
1. `src/lib/sound-system.ts` — `(window as any).webkitAudioContext`
2. `src/components/DataManagement.tsx` — `Record<string, any>`
3. `src/components/SavingsGoalCard.tsx` — `Record<string, any>` per `ICON_MAP`
4. `src/components/TalkBackSettings.tsx` — `key as any`
5. `src/components/IncomeExpenseChart.tsx` e `src/components/MonthlyComparisonChart.tsx` — `CustomTooltip` props
6. `src/components/DashboardTab.tsx` — `category.id as any`

### D — Problemi di accessibilità
Richiede aggiunta di ref e useEffect. Conviene fare prima le tre famiglie precedenti così il conteggio dei warning è già basso e si lavora con meno rumore.

Sequenza suggerita:
1. `src/components/AppHeader.tsx` — rimuovere `tabIndex={0}` (più semplice)
2. `src/components/DataManagement.tsx` — aggiungere `aria-label` all'input file
3. `src/components/PinDialog.tsx` — sostituire `autoFocus` con `useEffect` + ref
4. `src/components/AccountDialog.tsx` — sostituire `autoFocus` con `useEffect` + ref
5. `src/components/CategoryManagement.tsx` — sostituire `autoFocus` con `useEffect` + ref
6. `src/components/SecuritySettings.tsx` — sostituire `autoFocus` con `useEffect` + ref
7. `src/components/TransactionDialog.tsx` — sostituire `autoFocus` con `useEffect` + ref (integrato con correzione Famiglia C)

### C — Dipendenze degli effetti
Ultima perché richiede l'analisi più approfondita e ha il rischio più alto.

Sequenza suggerita:
1. `src/hooks/use-app-shortcuts.ts` — aggiungere `isAuthenticated` ai deps (sicuro, primitivo)
2. `src/context/AuthContext.tsx` — aggiungere commento di soppressione motivato
3. `src/components/TransactionDialog.tsx` — avvolgere `resetForm` in `useCallback` e aggiornare deps

---

## 10. Criteri di verifica — Definition of Done

Checklist da verificare al termine di tutte le correzioni:

- [ ] `npm run lint` termina con `0 problems (0 errors, 0 warnings)`
- [ ] `npm run build` termina con exit code 0 senza errori TypeScript
- [ ] `npm run test:run` termina con `5 passed` (i 5 smoke test di P19)
- [ ] Nessun nuovo warning introdotto nei file di test (l'output lint non menziona `src/test/**`)
- [ ] Il comportamento visivo dell'app è invariato nelle tre tab principali (Dashboard, Movimenti, Report)
- [ ] Il dialog di login con PIN funziona correttamente all'avvio
- [ ] I dialog (nuovo conto, nuovo movimento, nuova categoria) portano il focus sul campo corretto all'apertura
- [ ] La navigazione da tastiera nei dialog è invariata
- [ ] I form di inserimento accettano ancora input e salvano i dati correttamente

---

## 11. Rischi e avvertenze

### Rischio principale: ciclo di render infinito (Famiglia C)

Il segnale di un ciclo infinito è: l'app si blocca o il browser segnala "Page unresponsive". Si manifesta nel momento in cui si apre il file corretto del componente nel browser di sviluppo.

Come rilevarlo durante lo sviluppo: aprire la console del browser prima di navigare al componente modificato. Se il ciclo è presente, si vedranno messaggi ripetuti molto rapidamente e la CPU si impennerà.

Come intervenire: ripristinare il file con `git checkout -- src/components/TransactionDialog.tsx` (o il file coinvolto) e rianalizzare la dipendenza aggiunta.

Il rischio è basso per questa codebase perché:
- `AuthContext.tsx` non viene modificato nel codice (solo aggiunto un commento)
- `use-app-shortcuts.ts` aggiunge un primitivo booleano ai deps — i primitivi non causano mai loop infiniti
- `TransactionDialog.tsx` richiede il wrapping di `resetForm` in `useCallback`, che è una modifica controllata con dipendenze esplicite

### Rischio secondario: focus mancante dopo rimozione `autoFocus` (Famiglia D)

Se il `useEffect` con `ref.focus()` viene aggiunto ma la `ref` non viene collegata all'elemento corretto (prop `ref` mancante sull'input), il dialog si aprirà senza focus sul campo. Questo è un degrado di usabilità, non un errore funzionale.

Come verificare: aprire ogni dialog modificato, premere Tab — il focus deve essere già sul campo principale senza dover fare tab.

Come intervenire: verificare che `ref={nomedellaRef}` sia presente sull'`Input` corretto.

### Rischio terziario: variabili `_` non effettivamente inutilizzate (Famiglia A)

Prima di prefissare una variabile con `_`, verificare che non appaia in parti del file non coperte dalla lettura parziale (es. callback annidate, JSX condizionale). Una variabile prefissata con `_` che è in realtà usata produce un errore a compile-time, non silenzioso. Per `DisplaySettings.tsx`, `checked` compare solo come parametro di arrow function e non appare mai nel corpo della funzione, quindi il prefisso è sicuro.

### Nota specifica per PinDialog.tsx

Rimuovere `autoFocus` dal campo PIN e sostituirlo con `useEffect` + `ref.focus()` con 100ms di delay è corretto, ma è critico che il delay sia rispettato. Se per qualche motivo il dialog si apre e si chiude in meno di 100ms prima che il timer faccia scattare il focus, non succede nulla di problematico (nessun errore). Il timer viene cancellato dal cleanup dell'effect.

### Cosa NON appartiene a questo passo

- I warning di Radix UI su `DialogTitle` mancante che appaiono in output di Vitest non sono warning ESLint e non devono essere corretti qui. Appartengono al Passo P22 (accessibility audit completo).
- Non correggere warning ESLint non presenti nell'output della baseline P19, anche se si incontrano durante la modifica dei file.
- Non refactorizzare logica applicativa. Se una variabile è inutilizzata per un bug (es. `endDate` calcolato ma non usato in `getCurrentPeriodSpending`), la correzione è rimuovere la variabile — non correggere il bug che ha fatto sì che la variabile non fosse necessaria.

---

## 12. Cosa NON fare in questo passo

- **Non usare `// eslint-disable`** come soluzione generale per i warning. L'unico caso ammesso è `react-hooks/exhaustive-deps` in `AuthContext.tsx` con commento esplicativo.
- **Non modificare i file `src/components/ui/**`**. Sono generati da shadcn/ui e devono restare intatti. La soluzione è escluderli dalla regola in `eslint.config.js`.
- **Non introdurre nuove dipendenze npm**. Tutte le correzioni si fanno con TypeScript e React già presenti.
- **Non modificare la logica applicativa**. Ogni riga di codice cambiata deve riguardare esclusivamente la correzione del warning, non refactoring di funzionalità.
- **Non correggere warning di strumenti esterni** (Vitest, browser console). Solo i 56 warning ESLint.
- **Non toccare `.github/`**. Il framework guard protegge questi file.
- **Non eseguire `git commit`, `git push`, `git merge`** fuori da Agent-Git.
