# P20 — Coding Plan: Lint Cleanup — azzeramento dei 56 warning ESLint

> Documento operativo.  
> Fase: Plan → Code  
> Pacchetto: 20 — Settimo passo post-refactoring  
> Design di riferimento: `docs/1 - projects/P20-lint-cleanup-design.md`  
> Data: 2026-04-25

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P19.
- ⚠️ **Baseline lint:** 56 warning, 0 errori (misurati post-P19 con `npm run lint`). Obiettivo: 0 warning.
- ⚠️ **Ordine obbligatorio:** E → A → B → D → C. Non invertire: A e B sono meccaniche, C ha il rischio più alto.
- ⚠️ **Perimetro stretto:** ogni modifica risolve esattamente un warning. Nessun refactoring non richiesto.
- ⚠️ **`src/components/ui/**` protetto:** non modificare i file shadcn/ui. La soluzione è il Layer 6 in `eslint.config.js`.
- ⚠️ **`eslint-disable` proibito** — eccezione unica documentata in `AuthContext.tsx` (Famiglia C, step C.2).
- ⚠️ **`.github/` protetto** da `framework-guard.instructions.md`. Non toccare nulla sotto `.github/`.
- ⚠️ **Gate lint intermedio:** dopo ogni famiglia (`npm run lint`) verificare che il conteggio scenda del valore atteso prima di procedere.
- ⚠️ **Gate test:** `npm run test:run` → 5 passed obbligatorio dopo ogni step della Famiglia C.

**File modificati:**

| Categoria | File | Famiglie |
|---|---|---|
| Config | `eslint.config.js` | E |
| Lib | `src/lib/helpers.ts` | A |
| Lib | `src/lib/budget-history.ts` | A |
| Lib | `src/lib/budget-forecasting.ts` | A |
| Lib | `src/lib/screen-reader.ts` | A |
| Lib | `src/lib/sound-system.ts` | B |
| Component | `src/components/BudgetDialog.tsx` | A |
| Component | `src/components/BudgetForecastCard.tsx` | A |
| Component | `src/components/PeriodSelector.tsx` | A |
| Component | `src/components/MonthlyComparisonChart.tsx` | A + B |
| Component | `src/components/IncomeExpenseChart.tsx` | A + B |
| Component | `src/components/TransactionsTab.tsx` | A |
| Component | `src/components/DisplaySettings.tsx` | A |
| Component | `src/components/AccountDialog.tsx` | A + D |
| Component | `src/components/CategoryManagement.tsx` | A + D |
| Component | `src/components/SecuritySettings.tsx` | A + D |
| Component | `src/components/DataManagement.tsx` | A + B + D |
| Component | `src/components/SavingsGoalCard.tsx` | B |
| Component | `src/components/TalkBackSettings.tsx` | B |
| Component | `src/components/DashboardTab.tsx` | B |
| Component | `src/components/AppHeader.tsx` | D |
| Component | `src/components/PinDialog.tsx` | D |
| Component | `src/components/TransactionDialog.tsx` | C + D |
| Hook | `src/hooks/use-app-shortcuts.ts` | C |
| Context | `src/context/AuthContext.tsx` | C (solo commento) |

**File invariati:**

| File / Area | Motivazione |
|---|---|
| `src/components/ui/**` (tutti) | Generati shadcn/ui — esclusi via Layer 6, nessuna modifica al codice |
| `src/context/AppDataContext.tsx` | Escluso via Layer 6 — nessuna modifica al codice |
| `src/context/VisibleDataContext.tsx` | Escluso via Layer 6 — nessuna modifica al codice |
| `src/test/**` | File di test P19 — invariati |
| `vite.config.ts` | Invariato |
| `package.json` | Invariato |
| `tsconfig.json` | Invariato |
| `vitest.config.ts` | Invariato |
| `.github/**` | Protetto da `framework-guard.instructions.md` |

---

## Schema riepilogativo delle operazioni

```
Passo 20 — Lint Cleanup (56 warning → 0)
│
├── E — eslint.config.js [10 warning] ← PRIMA DI TUTTO
│   └── E.1  Aggiungere Layer 6: 'off' per react-refresh in ui/** e context/**
│           → npm run lint → ~46 warning
│
├── A — Import e variabili inutilizzate [~29 warning]
│   ├── A.1   src/lib/helpers.ts — rimuovere `Category` dall'import
│   ├── A.2   src/lib/budget-history.ts — rimuovere import + variabile inutilizzata
│   ├── A.3   src/lib/budget-forecasting.ts — rimuovere 2 variabili inutilizzate
│   ├── A.4   src/lib/screen-reader.ts — prefissare `_currency`
│   ├── A.5   src/components/BudgetDialog.tsx — rimuovere `CardContent`
│   ├── A.6   src/components/BudgetForecastCard.tsx — rimuovere `Progress`
│   ├── A.7   src/components/PeriodSelector.tsx — rimuovere `Badge`
│   ├── A.8   src/components/MonthlyComparisonChart.tsx — rimuovere `Badge`
│   ├── A.9   src/components/IncomeExpenseChart.tsx — rimuovere `LineChart`+`Line`; `let`→`const`
│   ├── A.10  src/components/TransactionsTab.tsx — rimuovere `isMobile` + import
│   ├── A.11  src/components/DisplaySettings.tsx — prefissare `_checked` (9 occorrenze)
│   ├── A.12  src/components/AccountDialog.tsx — rimuovere `CardHeader`+`CardTitle`
│   ├── A.13  src/components/CategoryManagement.tsx — rimuovere import inutilizzati
│   ├── A.14  src/components/SecuritySettings.tsx — `catch (err)` → `catch (_err)`
│   └── A.15  src/components/DataManagement.tsx — `catch (error)` × 2 → `catch (_error)`
│           → npm run lint → ~10 warning
│
├── B — Sostituzione `any` [7 warning]
│   ├── B.1   src/lib/sound-system.ts — interfaccia `ExtendedWindow`
│   ├── B.2   src/components/DataManagement.tsx — `Record<string, unknown>`
│   ├── B.3   src/components/SavingsGoalCard.tsx — `Record<string, ComponentType<...>>`
│   ├── B.4   src/components/TalkBackSettings.tsx — `keyof TalkBackAdaptations`
│   ├── B.5   src/components/IncomeExpenseChart.tsx — interfaccia `RechartsTooltipProps`
│   ├── B.6   src/components/MonthlyComparisonChart.tsx — interfaccia `RechartsTooltipProps`
│   └── B.7   src/components/DashboardTab.tsx — `ComponentProps<typeof TooltipContent>['variant']`
│           → npm run lint → ~7 warning (solo D + C)
│
├── D — Accessibilità [7 warning]
│   ├── D.1   src/components/AppHeader.tsx — rimuovere `tabIndex={0}`
│   ├── D.2   src/components/DataManagement.tsx — aggiungere `aria-label` a input file
│   ├── D.3   src/components/PinDialog.tsx — `autoFocus` → `useEffect` + `useRef`
│   ├── D.4   src/components/AccountDialog.tsx — `autoFocus` → `useEffect` + `useRef`
│   ├── D.5   src/components/CategoryManagement.tsx — `autoFocus` → `useEffect` + `useRef`
│   ├── D.6   src/components/SecuritySettings.tsx — `autoFocus` → `useEffect` + `useRef`
│   └── D.7   src/components/TransactionDialog.tsx — `autoFocus` condizionale → `useEffect` + `useRef`
│           → npm run lint → 3 warning (solo C)
│
└── C — Dipendenze degli effetti [3 warning] ← ULTIMA, RISCHIO PIÙ ALTO
    ├── C.1   src/hooks/use-app-shortcuts.ts — aggiungere `isAuthenticated` ai deps (primitivo, sicuro)
    │         → npm run test:run → 5 passed ✓
    ├── C.2   src/context/AuthContext.tsx — commento eslint-disable motivato
    │         → npm run test:run → 5 passed ✓
    └── C.3   src/components/TransactionDialog.tsx — `resetForm` → `useCallback` + deps aggiornati
              → npm run test:run → 5 passed ✓
              → npm run lint → 0 warning ✓
```

---

## Ambiguità verificate

Le seguenti ambiguità sono state **verificate sul repository reale** sul branch `refactoring-architettura` con lettura diretta dei file sorgente prima della stesura di questo piano.

---

### AI1 — Struttura attuale di `eslint.config.js`

**Verifica eseguita:** lettura completa del file.

**Struttura confermata** — flat config ESLint 9, `export default [...]`:
- **Layer 0:** `ignores: ['dist/', 'node_modules/', 'vite.config.ts']`
- **Layer 1:** `@eslint/js` recommended, `files: ['**/*.{js,ts,tsx}']`, `prefer-const: 'warn'`
- **Layer 2:** `typescript-eslint` recommended, `files: ['src/**/*.{ts,tsx}']`; regole: `no-unused-vars: 'warn'`, `no-explicit-any: 'warn'`
- **Layer 3:** `eslint-plugin-react-hooks`, `files: ['src/**/*.{ts,tsx}']`; `exhaustive-deps: 'warn'`
- **Layer 4:** `eslint-plugin-react-refresh`, `files: ['src/**/*.{ts,tsx}']`; `only-export-components: ['warn', { allowConstantExport: true }]`
- **Layer 5:** `eslint-plugin-jsx-a11y` recommended, `files: ['src/**/*.{ts,tsx}']`; tutte le regole a `warn`
- **Layer 6:** **assente** — da aggiungere in E.1

---

### AI2 — Import inutilizzati in `AccountDialog.tsx`

**Verifica eseguita:** lettura file + `npm run lint`.

**Import inutilizzati confermati:** `CardHeader` e `CardTitle` alla riga 10:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
```
`Card` e `CardContent` sono usati nel JSX; `CardHeader` e `CardTitle` non compaiono.

Correzione: `import { Card, CardContent } from '@/components/ui/card'`

**Nota:** `ACCOUNT_TYPE_LABELS`, `ACCOUNT_TYPE_ICONS`, `ACCOUNT_TYPE_DESCRIPTIONS`, `ACCOUNT_CATEGORIES` dalla riga 7 sono tutti usati nel JSX — il lint non li segnala.

---

### AI3 — Import inutilizzato in `BudgetDialog.tsx`

**Verifica eseguita:** lettura riga 11.

Confermato: `CardContent` in `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'`.

Correzione: rimuovere solo `CardContent` dall'import.

---

### AI4 — Import inutilizzato in `BudgetForecastCard.tsx`

**Verifica eseguita:** lettura riga 7.

Confermato: `import { Progress } from '@/components/ui/progress'` — la barra di avanzamento usa markup custom, `Progress` non compare nel JSX.

Correzione: rimuovere l'intera riga.

---

### AI5 — Import inutilizzato in `PeriodSelector.tsx`

**Verifica eseguita:** lettura righe 1-2.

Confermato: `import { Badge } from '@/components/ui/badge'` — il componente usa solo `<Button>`, nessun `<Badge>`.

Correzione: rimuovere l'intera riga di import `Badge`.

---

### AI6 — Import inutilizzati in `CategoryManagement.tsx`

**Verifica eseguita:** lettura righe 1-35 + `npm run lint` individuale.

**Confermato a riga 15:** `X` nell'import `@phosphor-icons/react`:
```typescript
import { Tag, Plus, PencilSimple, Trash, CheckCircle, X, TrendUp, TrendDown } from '@phosphor-icons/react'
```
`X` non compare nel JSX corrente (era probabilmente usato per un bottone di chiusura in una versione precedente).

**autoFocus:** confermato a riga 367.

**Nota:** il lint segnala 3 warning totali per questo file. Il terzo (oltre a `X` e `autoFocus`) va verificato dall'implementatore con `npm run lint src/components/CategoryManagement.tsx` prima di procedere.

---

### AI7 — Tipo del prop `variant` di `TooltipContent` (per DashboardTab.tsx B.7)

**Verifica eseguita:** lettura `src/components/ui/tooltip.tsx`.

Il file definisce `const tooltipVariants = cva(...)` con la seguente union type per `variant`:
```
"default" | "secondary" | "accent" | "muted" | "banking" | "digital" | "savings" |
"investments" | "private" | "income" | "expense" | "success" | "warning" | "destructive"
```

`tooltipVariants` **non è esportato** da `tooltip.tsx`, quindi non è importabile direttamente.

**Fix consigliato** — derivare il tipo dai props del componente, che è già importato:
```typescript
// DashboardTab.tsx — aggiungere se ComponentProps non è già importato:
import type { ComponentProps } from 'react'
// Alla riga con il cast:
variant={category.id as ComponentProps<typeof TooltipContent>['variant']}
```

---

### AI8 — Issues in `DataManagement.tsx`

**Verifica eseguita:** lettura file.

Confermato:
- Riga 32: `const exportData: Record<string, any> = {}` → `Record<string, unknown>`
- Riga 52: `catch (error)` in `handleExportData` — `error` non usato → `catch (_error)`
- Riga 95: `catch (error)` in `handleImportData` — `error` non usato → `catch (_error)`
- Riga ~162: `<input type="file" id="import-file" ...>` senza `aria-label`

---

### AI9 — Pattern `checked` in `DisplaySettings.tsx`

**Verifica eseguita:** lettura file.

Confermato: 9 occorrenze del pattern:
```tsx
onCheckedChange={(checked) => handleToggle(setShowBalances, showBalances ?? true, '...')}
```
Il parametro `checked` non è mai letto: `handleToggle` riceve il valore corrente e lo inverte internamente.

Fix: `(checked)` → `(_checked)` in tutte e 9 le occorrenze.

---

### AI10 — Issues in `IncomeExpenseChart.tsx`

**Verifica eseguita:** lettura file.

Confermato:
- Riga 2 (import recharts): `LineChart` e `Line` presenti ma non usati (il componente usa `AreaChart` e `Area`)
- Riga 23: `let startDate = new Date()` — non riassegnato, solo mutato tramite metodi come `.setDate()` → `const startDate`
- Riga ~137: `const CustomTooltip = ({ active, payload }: any)` — usano `payload[0].payload.date`, `.entrate`, `.uscite`

---

### AI11 — Issues in `MonthlyComparisonChart.tsx`

**Verifica eseguita:** lettura file.

Confermato:
- Riga 6: `Badge` importato ma non usato nel JSX → rimuovere
- Riga ~101: `const CustomTooltip = ({ active, payload }: any)` — usano `payload[0].payload.name`, `.income`, `.expenses`, `.net`

---

### AI12 — Tipo `ICON_MAP` in `SavingsGoalCard.tsx`

**Verifica eseguita:** lettura file, riga 30.

Confermato: `const ICON_MAP: Record<string, any> = { 'piggy-bank': PiggyBank, ... }` con tutti i valori che sono componenti Phosphor Icons.

Il file non ha `import` di React (corretto per React 17+), ma `ComponentType` deve essere importato esplicitamente come tipo:
```typescript
import type { ComponentType } from 'react'

const ICON_MAP: Record<string, ComponentType<{ size?: number; weight?: string; className?: string }>> = {
  'piggy-bank': PiggyBank,
  // ... resto invariato
}
```

---

### AI13 — Tipo di `updateAdaptation` in `use-talkback.ts`

**Verifica eseguita:** lettura `src/hooks/use-talkback.ts`, riga 223.

Confermato:
```typescript
const updateAdaptation = useCallback((key: keyof TalkBackAdaptations, value: boolean) => {
```

Il tipo `TalkBackAdaptations` è esportato dal file come `export interface TalkBackAdaptations`.

**Fix in `TalkBackSettings.tsx`:**
- Riga 7 attuale: `import { useTalkBack } from '@/hooks/use-talkback'`
- Correzione: `import { useTalkBack, type TalkBackAdaptations } from '@/hooks/use-talkback'`
- Modificare il parametro `key` in `handleAdaptationChange`: `string` → `keyof TalkBackAdaptations`
- Rimuovere `as any` dalla chiamata: `updateAdaptation(key, value)` (nessun cast)

---

### AI14 — Issues in `TransactionDialog.tsx`

**Verifica eseguita:** lettura file.

Confermato:
- Imports attuali: `import { useState, useEffect } from 'react'` — mancano `useCallback` e `useRef`
- Il primo `useEffect` (~riga 56) ha deps `[open, transaction, screenReader]` ma il corpo chiama `resetForm` che non è nei deps
- `resetForm` è definita senza `useCallback` nel corpo del componente
- `autoFocus={!transaction}` sull'Input con id="transaction-amount" (~riga 254)

---

### AI15 — Issues in `SecuritySettings.tsx`

**Verifica eseguita:** lettura file + grep.

Confermato:
- Riga 133: `catch (err)` in `handleChangePIN` — `err` non usato → `catch (_err)`
- Riga 300: `autoFocus` sull'`Input` con id="current-pin"
- Imports: nessun import inutilizzato oltre quelli già identificati

---

### AI16 — Vedi AI13

---

### AI17 — `isMobile` in `TransactionsTab.tsx`

**Verifica eseguita:** lettura file, righe 1-28.

Confermato:
- Riga 5: `import { useIsMobile } from '@/hooks/use-mobile'`
- Riga 28: `const isMobile = useIsMobile()` — `isMobile` non compare nel JSX del componente

Correzione: rimuovere sia la riga 28 (`const isMobile = ...`) sia la riga 5 (`import { useIsMobile } ...`), poiché `useIsMobile` non è usato altrove nel file.

---

### AI18 — `useEffect` con deps `[]` in `AuthContext.tsx`

**Verifica eseguita:** lettura file.

Confermato: l'effect di inizializzazione (~riga 51) usa `globalPinHash` con array vuoto `[]`. Aggiungere `globalPinHash` ai deps romperebbe l'UX (riapertura del dialog di login dopo la creazione del PIN). La soluzione corretta è il commento di soppressione con spiegazione obbligatoria.

---

### AI19 — File context con `react-refresh/only-export-components`

**Verifica eseguita:** lettura `eslint.config.js` + struttura cartella context.

I tre file (`AppDataContext.tsx`, `AuthContext.tsx`, `VisibleDataContext.tsx`) esportano sia Provider sia hook — pattern standard React. Il Layer 4 attuale applica la regola a tutto `src/**/*.{ts,tsx}`. La correzione è il Layer 6 in `eslint.config.js`.

---

### AI20 — File `src/components/ui/**` con `react-refresh/only-export-components`

**Verifica eseguita:** `npm run lint` + lista file UI.

Confermati 7 file shadcn/ui: `badge.tsx`, `button.tsx`, `form.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `sidebar.tsx`, `toggle.tsx`. Il Layer 6 deve coprire `src/components/ui/**/*.{ts,tsx}`.

---

### AI21 — Deps mancante in `use-app-shortcuts.ts`

**Verifica eseguita:** lettura file.

Confermato: `isAuthenticated` da `useAuth()` è usato in ogni callback del `useMemo` come condizione `if (isAuthenticated && ...)`, ma non è nell'array di deps. Tipo: `boolean` — primitivo sicuro, nessun rischio di loop infinito.

---

### AI22 — Variabili inutilizzate in `budget-forecasting.ts`

**Verifica eseguita:** lettura file.

Confermato:
- Riga ~32 (in `getCurrentPeriodSpending`): `const endDate = new Date(budget.dataFine)` — `endDate` non compare nel corpo della funzione
- Riga ~107 (in `calculateBudgetForecast`): `const trendData = calculateBudgetTrend(budget, transactions, historicalPeriods)` — risultato non usato nelle righe successive

---

### AI23 — Variabili inutilizzate in `budget-history.ts`

**Verifica eseguita:** lettura file.

Confermato:
- Riga 2: `import { getBudgetPeriodDates } from './helpers'` — `getBudgetPeriodDates` non è chiamata nel file
- Riga ~51 (in `getPeriodDates`): `const currentEnd = new Date(budget.dataFine)` — non usata nel corpo

---

### AI24 — Import inutilizzato in `helpers.ts`

**Verifica eseguita:** lettura file, riga 1.

Confermato: `Category` in `import { Account, Transaction, Budget, Category } from './types'`. La funzione `groupTransactionsByCategory` usa un tipo anonimo `Array<{ id: string; nome: string }>` invece di `Category[]`.

Correzione: `import { Account, Transaction, Budget } from './types'`

---

### AI25 — Parametro `currency` in `screen-reader.ts`

**Verifica eseguita:** lettura file.

Confermato (~riga 84): `announceBalance(accountName: string, balance: number, currency: string = '€')` — il corpo usa `'EUR'` hardcoded nel `Intl.NumberFormat`, ignorando il parametro `currency`.

Correzione: prefissare `_currency` (invarianza funzionale garantita — il formatter continua a usare `'EUR'`).

---

### AI26 — `(window as any).webkitAudioContext` in `sound-system.ts`

**Verifica eseguita:** lettura file, riga ~131.

Confermato in `initialize()`:
```typescript
this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
```

Correzione — interfaccia locale e gestione esplicita del caso undefined:
```typescript
interface ExtendedWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}
const AudioCtx = window.AudioContext || (window as ExtendedWindow).webkitAudioContext
if (AudioCtx) {
  this.audioContext = new AudioCtx()
}
```
Il blocco `try/catch` già presente gestisce eventuali errori di inizializzazione.

---

## Piano operativo dettagliato

### E.1 — Aggiungere Layer 6 a `eslint.config.js`

**File:** `eslint.config.js`  
**Posizione:** dopo il Layer 5, prima della parentesi `]` finale

```javascript
// Layer 6 — Esclusioni react-refresh per file generati shadcn/ui e context React
{
  files: ['src/components/ui/**/*.{ts,tsx}', 'src/context/**/*.{ts,tsx}'],
  rules: {
    'react-refresh/only-export-components': 'off',
  },
},
```

**Warning eliminati:** 10 (7 file UI + 3 file context)  
**Verifica:** `npm run lint` → ~46 warning

---

### A.1 — `src/lib/helpers.ts`

Riga 1:
```typescript
// Prima:
import { Account, Transaction, Budget, Category } from './types'
// Dopo:
import { Account, Transaction, Budget } from './types'
```
**Warning eliminati:** 1

---

### A.2 — `src/lib/budget-history.ts`

Riga 2 → rimuovere l'intera riga `import { getBudgetPeriodDates } from './helpers'`  
Riga ~51 → rimuovere la riga `const currentEnd = new Date(budget.dataFine)`  
**Warning eliminati:** 2

---

### A.3 — `src/lib/budget-forecasting.ts`

In `getCurrentPeriodSpending` (~riga 32) → rimuovere la riga `const endDate = new Date(budget.dataFine)`  
In `calculateBudgetForecast` (~riga 107) → rimuovere la riga `const trendData = calculateBudgetTrend(budget, transactions, historicalPeriods)`  
**Warning eliminati:** 2

---

### A.4 — `src/lib/screen-reader.ts`

Riga ~84 — firma di `announceBalance`:
```typescript
// Prima:
announceBalance(accountName: string, balance: number, currency: string = '€')
// Dopo:
announceBalance(accountName: string, balance: number, _currency: string = '€')
```
**Warning eliminati:** 1

---

### A.5 — `src/components/BudgetDialog.tsx`

Riga 11:
```typescript
// Prima:
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// Dopo:
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
```
**Warning eliminati:** 1

---

### A.6 — `src/components/BudgetForecastCard.tsx`

Riga 7 → rimuovere l'intera riga `import { Progress } from '@/components/ui/progress'`  
**Warning eliminati:** 1

---

### A.7 — `src/components/PeriodSelector.tsx`

Riga 2 → rimuovere l'intera riga `import { Badge } from '@/components/ui/badge'`  
**Warning eliminati:** 1

---

### A.8 — `src/components/MonthlyComparisonChart.tsx`

Riga ~6 — rimuovere `Badge` dall'import (la riga va verificata: `Badge` potrebbe essere su una riga dedicata o condivisa con altri import dallo stesso package).  
**Warning eliminati:** 1

---

### A.9 — `src/components/IncomeExpenseChart.tsx`

Riga 2 (import recharts) → rimuovere `LineChart` e `Line` dall'import:
```typescript
// Prima (esempio):
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
// Dopo:
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
```

Riga 23 → `let startDate = new Date()` → `const startDate = new Date()`  
**Warning eliminati:** 3 (2 import + 1 prefer-const)

---

### A.10 — `src/components/TransactionsTab.tsx`

Riga 5 → rimuovere `import { useIsMobile } from '@/hooks/use-mobile'`  
Riga 28 → rimuovere `const isMobile = useIsMobile()`  
**Warning eliminati:** 1

---

### A.11 — `src/components/DisplaySettings.tsx`

9 occorrenze del pattern (ogni `Switch` che chiama `handleToggle`):
```tsx
// Prima:
onCheckedChange={(checked) => handleToggle(...)}
// Dopo:
onCheckedChange={(_checked) => handleToggle(...)}
```
Usare la funzione di ricerca dell'editor per trovare tutte e 9 le occorrenze.  
**Warning eliminati:** 9

---

### A.12 — `src/components/AccountDialog.tsx`

Riga 10:
```typescript
// Prima:
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Dopo:
import { Card, CardContent } from '@/components/ui/card'
```
**Warning eliminati:** 2

---

### A.13 — `src/components/CategoryManagement.tsx`

Riga 15 — rimuovere `X` dall'import Phosphor:
```typescript
// Prima:
import { Tag, Plus, PencilSimple, Trash, CheckCircle, X, TrendUp, TrendDown } from '@phosphor-icons/react'
// Dopo:
import { Tag, Plus, PencilSimple, Trash, CheckCircle, TrendUp, TrendDown } from '@phosphor-icons/react'
```

**Attenzione:** eseguire `npm run lint src/components/CategoryManagement.tsx` per confermare che non ci siano altri import inutilizzati oltre a `X`.  
**Warning eliminati:** 1 (+ eventuali altri confermati dal lint)

---

### A.14 — `src/components/SecuritySettings.tsx`

Riga 133:
```typescript
// Prima:
} catch (err) {
// Dopo:
} catch (_err) {
```
**Warning eliminati:** 1

---

### A.15 — `src/components/DataManagement.tsx`

Riga 52 (in `handleExportData`) e riga 95 (in `handleImportData`):
```typescript
// Prima (entrambe le occorrenze):
} catch (error) {
// Dopo (entrambe):
} catch (_error) {
```
**Warning eliminati:** 2

**Verifica intermedia A:** `npm run lint` → ~10 warning

---

### B.1 — `src/lib/sound-system.ts`

Aggiungere a livello di modulo (prima della classe o all'inizio del file):
```typescript
interface ExtendedWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}
```

In `initialize()`, riga ~131, sostituire:
```typescript
// Prima:
this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
// Dopo:
const AudioCtx = window.AudioContext || (window as ExtendedWindow).webkitAudioContext
if (AudioCtx) {
  this.audioContext = new AudioCtx()
}
```
**Warning eliminati:** 1

---

### B.2 — `src/components/DataManagement.tsx`

Riga 32:
```typescript
// Prima:
const exportData: Record<string, any> = {}
// Dopo:
const exportData: Record<string, unknown> = {}
```
**Warning eliminati:** 1

---

### B.3 — `src/components/SavingsGoalCard.tsx`

Aggiungere in cima al file:
```typescript
import type { ComponentType } from 'react'
```

Riga 30:
```typescript
// Prima:
const ICON_MAP: Record<string, any> = {
// Dopo:
const ICON_MAP: Record<string, ComponentType<{ size?: number; weight?: string; className?: string }>> = {
```
**Warning eliminati:** 1

---

### B.4 — `src/components/TalkBackSettings.tsx`

Riga 7 — aggiungere tipo all'import:
```typescript
// Prima:
import { useTalkBack } from '@/hooks/use-talkback'
// Dopo:
import { useTalkBack, type TalkBackAdaptations } from '@/hooks/use-talkback'
```

Nel componente, modificare il parametro `key` nella funzione `handleAdaptationChange`:
```typescript
// Prima:
const handleAdaptationChange = (key: string, value: boolean, label: string) => {
  updateAdaptation(key as any, value)
// Dopo:
const handleAdaptationChange = (key: keyof TalkBackAdaptations, value: boolean, label: string) => {
  updateAdaptation(key, value)
```
**Warning eliminati:** 1

---

### B.5 — `src/components/IncomeExpenseChart.tsx`

Aggiungere prima del componente `CustomTooltip`:
```typescript
interface RechartsTooltipProps {
  active?: boolean
  payload?: Array<{ payload: Record<string, number | string>; value: number; name: string }>
}
```

Riga ~137:
```typescript
// Prima:
const CustomTooltip = ({ active, payload }: any) => {
// Dopo:
const CustomTooltip = ({ active, payload }: RechartsTooltipProps) => {
```
**Warning eliminati:** 1

---

### B.6 — `src/components/MonthlyComparisonChart.tsx`

Stessa interfaccia di B.5:
```typescript
interface RechartsTooltipProps {
  active?: boolean
  payload?: Array<{ payload: Record<string, number | string>; value: number; name: string }>
}
```

Riga ~101:
```typescript
// Prima:
const CustomTooltip = ({ active, payload }: any) => {
// Dopo:
const CustomTooltip = ({ active, payload }: RechartsTooltipProps) => {
```
**Warning eliminati:** 1

---

### B.7 — `src/components/DashboardTab.tsx`

Verificare se `ComponentProps` è già importato da `'react'` nel file. Se no, aggiungere:
```typescript
import type { ComponentProps } from 'react'
```

Riga ~246:
```typescript
// Prima:
variant={category.id as any}
// Dopo:
variant={category.id as ComponentProps<typeof TooltipContent>['variant']}
```
`TooltipContent` è già importato nel file da `@/components/ui/tooltip`.  
**Warning eliminati:** 1

**Verifica intermedia B:** `npm run lint` → ~7 warning (solo D + C)

---

### D.1 — `src/components/AppHeader.tsx`

Riga 69 — rimuovere **solo** `tabIndex={0}` dal `<div>`. Lasciare invariati `role="status"`, `aria-live="polite"`, `aria-atomic`, `aria-label`.  
**Warning eliminati:** 1

---

### D.2 — `src/components/DataManagement.tsx`

Riga ~162 — aggiungere `aria-label` all'elemento `<input type="file">`:
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
**Warning eliminati:** 1

---

### D.3 — `src/components/PinDialog.tsx`

1. Aggiungere `useRef` all'import React: `import { useState, useEffect, useRef } from 'react'`
2. Aggiungere dopo gli state: `const pinInputRef = useRef<HTMLInputElement>(null)`
3. Aggiornare il `useEffect` su `[open]` (già esistente):
```typescript
useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    const timer = setTimeout(() => pinInputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }
}, [open])
```
4. Rimuovere `autoFocus` dall'`Input` con id="pin"; aggiungere `ref={pinInputRef}`

**Warning eliminati:** 1

---

### D.4 — `src/components/AccountDialog.tsx`

1. Aggiungere `useRef` all'import React: `import { useState, useEffect, useRef } from 'react'`
2. Aggiungere: `const nameInputRef = useRef<HTMLInputElement>(null)`
3. Aggiornare il `useEffect` su `[open]` (già esistente, chiama `soundSystem.play`):
```typescript
useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    const timer = setTimeout(() => nameInputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }
}, [open])
```
4. Rimuovere `autoFocus` dall'`Input` con id="account-name"; aggiungere `ref={nameInputRef}`

**Warning eliminati:** 1

---

### D.5 — `src/components/CategoryManagement.tsx`

1. Verificare quali hook React sono già importati (riga 1: `import { useState } from 'react'`); aggiungere `useEffect` e `useRef` se non presenti
2. Aggiungere nel corpo del componente: `const categoryNameRef = useRef<HTMLInputElement>(null)`
3. Aggiungere `useEffect` su `showCategoryDialog`:
```typescript
useEffect(() => {
  if (showCategoryDialog) {
    const timer = setTimeout(() => categoryNameRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }
}, [showCategoryDialog])
```
4. Rimuovere `autoFocus` dalla riga 367; aggiungere `ref={categoryNameRef}` all'`Input` con id="category-name"

**Warning eliminati:** 1

---

### D.6 — `src/components/SecuritySettings.tsx`

1. Verificare imports React attuali (riga 1: `import { useState } from 'react'`); aggiungere `useEffect` e `useRef`
2. Aggiungere: `const currentPinRef = useRef<HTMLInputElement>(null)`
3. Aggiungere `useEffect` su `showPinDialog` (la variabile state che controlla il dialog interno):
```typescript
useEffect(() => {
  if (showPinDialog) {
    const timer = setTimeout(() => currentPinRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }
}, [showPinDialog])
```
4. Rimuovere `autoFocus` dalla riga 300; aggiungere `ref={currentPinRef}` all'`Input` con id="current-pin"

**Warning eliminati:** 1

---

### D.7 — `src/components/TransactionDialog.tsx`

**Nota:** questo step è strettamente integrato con C.3. Eseguire D.7 e C.3 insieme sullo stesso file.

1. Aggiungere `useRef` all'import React (che dopo C.3 sarà: `import { useState, useEffect, useCallback, useRef } from 'react'`)
2. Aggiungere: `const amountInputRef = useRef<HTMLInputElement>(null)`
3. Nel `useEffect` aggiornato da C.3, integrare il focus condizionale nel ramo `if (!transaction)`:
```typescript
if (!transaction) {
  resetForm()
  const timer = setTimeout(() => amountInputRef.current?.focus(), 100)
  return () => clearTimeout(timer)
}
```
4. Rimuovere `autoFocus={!transaction}` dall'`Input` con id="transaction-amount"; aggiungere `ref={amountInputRef}`

**Warning eliminati:** 1 (conteggiato in D; il warning exhaustive-deps è conteggiato in C.3)

**Verifica intermedia D:** `npm run lint` → 3 warning (solo Famiglia C rimasta)

---

### C.1 — `src/hooks/use-app-shortcuts.ts`

⚠️ Aprire la console del browser e navigare all'app prima di questa modifica.

Trovare l'array di deps del `useMemo` per `shortcuts` (~riga 219) e aggiungere `isAuthenticated` come prima dipendenza:
```typescript
], [
  isAuthenticated,    // ← aggiungere come prima dep
  activeTab,
  allCategoriesVisible,
  hasPrivateAccount,
  isPrivateUnlocked,
  // ... resto invariato
])
```
`isAuthenticated` proviene già da `useAuth()` nel corpo del componente — nessuna modifica agli import.

**Warning eliminati:** 1  
**Gate:** `npm run test:run` → 5 passed ✓

---

### C.2 — `src/context/AuthContext.tsx`

⚠️ Modificare **solo il commento**, non il codice dell'effetto né l'array di deps `[]`.

Aggiungere due righe di commento immediatamente sopra il `useEffect` di inizializzazione (~riga 51):
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
// Intenzionale: eseguito solo al mount per determinare lo stato iniziale (setup vs login).
// Aggiungere `globalPinHash` ai deps causerebbe la riapertura del dialog PIN dopo ogni cambio PIN.
useEffect(() => {
  if (!globalPinHash) {
    setIsSetupMode(true)
    setShowPinDialog(true)
  } else {
    setShowPinDialog(true)
  }
}, [])
```

**Warning eliminati:** 1  
**Gate:** `npm run test:run` → 5 passed ✓

---

### C.3 — `src/components/TransactionDialog.tsx` (integrato con D.7)

⚠️ Aprire la console del browser e navigare al dialog "Nuovo Movimento" dopo questa modifica. Un ciclo di render si manifesta con messaggi ripetuti in console e CPU al massimo.

Step 1 — aggiornare imports:
```typescript
// Prima:
import { useState, useEffect } from 'react'
// Dopo:
import { useState, useEffect, useCallback, useRef } from 'react'
```

Step 2 — avvolgere `resetForm` in `useCallback` (verificare le variabili usate nel corpo di `resetForm` per costruire le dipendenze corrette — tipicamente `accounts` e `categories`):
```typescript
const resetForm = useCallback(() => {
  // corpo invariato
}, [accounts, categories])
```

Step 3 — aggiornare il primo `useEffect` aggiungendo `resetForm` ai deps e integrando il focus (coordinato con D.7):
```typescript
useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    const dialogTitle = transaction ? 'Modifica Movimento' : 'Nuovo Movimento'
    screenReader.announceDialogOpen(dialogTitle)
    if (!transaction) {
      resetForm()
      const timer = setTimeout(() => amountInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }
}, [open, transaction, screenReader, resetForm])
```

Step 4 — rimuovere `autoFocus={!transaction}` dall'Input; aggiungere `ref={amountInputRef}` (parte di D.7, riga ~254).

**Warning eliminati:** 2 (exhaustive-deps + no-autofocus)  
**Gate:** `npm run test:run` → 5 passed ✓  
**Gate finale:** `npm run lint` → 0 warning ✓

---

## Rischi

| Codice | Scenario | Probabilità | Impatto | Mitigazione |
|---|---|---|---|---|
| R1 🔴 | Ciclo di render infinito dopo C.3 se `resetForm` è avvolto in `useCallback` con dipendenze errate | Bassa | Alto | Verificare console browser subito dopo C.3. Rollback: `git checkout -- src/components/TransactionDialog.tsx` |
| R2 🟡 | Focus mancante dopo Famiglia D (ref non collegata all'Input corretto) | Media | Basso | Dopo ogni step D, aprire il dialog e premere Tab: il focus deve essere già sul campo senza ulteriori interazioni |
| R3 🟡 | Import rimosso ancora necessario (Famiglia A) — errore TypeScript a compile-time | Bassa | Medio | `npm run build` dopo ogni famiglia A segnala subito errori TypeScript |
| R4 🟢 | `screenReader` da `useScreenReader()` non stabile → loop in C.3 | Molto bassa | Alto | Verificabile leggendo `src/hooks/use-screen-reader.ts` prima di C.3; il hook è un singleton memoizzato |

---

## Criteri di uscita — Definition of Done

- [ ] `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [ ] `npm run build` → exit 0, 0 errori TypeScript
- [ ] `npm run test:run` → `5 passed`, exit 0
- [ ] Dialog di login PIN funziona correttamente all'avvio
- [ ] Dialog "Nuovo Conto": focus su campo "Nome del Conto" all'apertura
- [ ] Dialog "Nuovo Movimento": focus su campo "Importo" all'apertura (solo nuovo, non modifica)
- [ ] Dialog "Modifica Movimento": nessun focus aggiuntivo (comportamento invariato)
- [ ] Dialog "Nuova Categoria": focus su campo "Nome Categoria" all'apertura
- [ ] Dialog "Cambio PIN": focus su campo "PIN Attuale" all'apertura
- [ ] Nessun file `src/components/ui/**` modificato
- [ ] Nessun file `.github/**` modificato
