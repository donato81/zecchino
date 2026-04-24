# P18 — Coding Plan: VisibleDataProvider — fonte unica dei dati elaborati

> Documento operativo.  
> Fase: Plan → Code  
> Pacchetto: 18 — **Quinto passo post-refactoring — secondo passo che modifica `src/`**  
> Design di riferimento: `docs/1 - projects/P18-visible-data-provider-design.md`  
> Data: 24 aprile 2026

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P17.
- ⚠️ **Questo è il secondo passo che tocca codice applicativo sotto `src/`**, dopo P17. L'architettura dei layer è: `lib/` → `hooks/` → `context/` → `components/` → `App.tsx`.
- **1 file creato** e **8 file modificati** (design §3.1 e §3.2):
  1. `src/context/VisibleDataContext.tsx` ← **NUOVO**
  2. `src/App.tsx`
  3. `src/hooks/use-app-shortcuts.ts`
  4. `src/components/AppHeader.tsx`
  5. `src/components/TransactionsTab.tsx`
  6. `src/components/DialogsOverlay.tsx`
  7. `src/components/ReportsTab.tsx`
  8. `src/components/DashboardTab.tsx`
  9. `src/hooks/use-visible-data.ts` ← **non modificato** (diventa implementazione interna)
- **Scelta architetturale**: Opzione A — nuovo contesto dedicato `VisibleDataContext.tsx`. Motivazione: `AppDataContext` non dipende da `AuthContext` nell'architettura attuale; integrare `useVisibleData` in `AppDataContext` richiederebbe di aggiungere questa dipendenza implicita, violando il layer architecture documentato in §5.1 del report e creando una dipendenza circolare implicita tra i due context. Opzione B scartata.
- **Albero dei provider atteso** dopo la modifica:
  ```
  AuthProvider → AppDataProvider → VisibleDataProvider → AppContent
  ```
- **Baseline warning ESLint** al termine di P17: **55 warning** (misurare il valore effettivo all'inizio di P18 — gate A.1 della todo — per confermare la baseline reale).
- `.github/` è protetto da `framework-guard.instructions.md`: nessuna operazione di questo passo lo tocca.

### File che restano invariati

| File / Area | Motivazione |
|---|---|
| `src/hooks/use-visible-data.ts` | Diventa implementazione interna del provider — la sua logica e firma pubblica restano invariate |
| `src/context/AppDataContext.tsx` | Non coinvolto — per design (evitare dipendenza da `AuthContext`) |
| `src/context/AuthContext.tsx` | Non coinvolto — consumato indirettamente dal hook interno |
| `src/hooks/use-list-navigation.ts` | Non coinvolto — P17 |
| `src/hooks/use-mobile.ts`, tutti gli altri hook | Non coinvolti |
| `src/components/FocusIndicator.tsx` | Non coinvolto — P17 |
| `src/components/` (tutti gli altri oltre ai 5 modificati) | Non coinvolti |
| `src/lib/` (tutti i file) | Non coinvolti |
| `eslint.config.js` | Invariato — P15 |
| `package.json`, `package-lock.json` | Invariati — P16 |
| `tailwind.config.js`, `tsconfig.json`, `vite.config.ts` | Non coinvolti |
| `.github/` | Protetto da `framework-guard.instructions.md` |

### Tabella riepilogativa

| Operazione | File | Modifica principale |
|---|---|---|
| **Creato** | `src/context/VisibleDataContext.tsx` | Nuovo contesto, `VisibleDataProvider`, hook `useVisibleData` |
| Modificato | `src/App.tsx` | Aggiunta `VisibleDataProvider` nell'albero, sostituzione import in `AppContent` |
| Modificato | `src/hooks/use-app-shortcuts.ts` | Sostituzione import `@/hooks/…` → `@/context/…` |
| Modificato | `src/components/AppHeader.tsx` | Sostituzione import |
| Modificato | `src/components/TransactionsTab.tsx` | Sostituzione import |
| Modificato | `src/components/DialogsOverlay.tsx` | Sostituzione import |
| Modificato | `src/components/ReportsTab.tsx` | Sostituzione import |
| Modificato | `src/components/DashboardTab.tsx` | Sostituzione import |
| **Invariato** | `src/hooks/use-visible-data.ts` | Solo implementazione interna del provider |

---

## Ambiguità rilevate

Le seguenti ambiguità sono state **verificate sul repository reale** sul branch `refactoring-architettura` con lettura diretta dei file sorgente prima della stesura di questo piano.

---

### AI1 — Struttura di `src/hooks/use-visible-data.ts`

**Verifica eseguita**: lettura completa del file.

**Exports del file**:

```typescript
export type VisibleDataResult = {
  visibleAccounts: Account[]
  visibleTransactions: Transaction[]
  hasPrivateAccount: boolean
  privateAccount: Account | undefined
  totalBalance: number
  recentTransactions: Transaction[]
  groupedAccounts: AccountGroup[]
  filteredGroupedAccounts: AccountGroup[]
  allCategoriesVisible: boolean
  budgetAlerts: BudgetAlert[]
}

export function useVisibleData(): VisibleDataResult { ... }
```

**Campi di `VisibleDataResult`**: 10 campi, corrispondono esattamente a quelli elencati nel design §4.1 — nessun campo aggiuntivo o mancante.

**Firma della funzione**: `useVisibleData()` senza parametri, return type esplicitamente annotato `: VisibleDataResult`.

**Export aggiuntivi**: nessuno oltre al tipo e alla funzione. Non ci sono costanti, enum o utility esportati da questo file.

**Imports rilevanti del file** (utili per costruire `VisibleDataContext.tsx`):
- `useAppData` da `@/context/AppDataContext`
- `useAuth` da `@/context/AuthContext`
- `type BudgetAlert` da `@/lib/budget-alerts`
- `type Account, AccountGroup, Transaction` da `@/lib/types`

**Nota per la costruzione di `VisibleDataContext.tsx`**: il file del context deve importare solo `useVisibleData` e `type VisibleDataResult` da `@/hooks/use-visible-data`. Tutti gli altri import (context, lib, tipi di dominio) rimangono incapsulati nel hook. In `VisibleDataContext.tsx`, poiché si esporta una funzione con lo stesso nome `useVisibleData`, l'import interno deve usare un alias: `import { useVisibleData as useVisibleDataHook, type VisibleDataResult } from '@/hooks/use-visible-data'`.

---

### AI2 — Struttura di `src/App.tsx`

**Verifica eseguita**: lettura completa del file.

**Albero dei provider attuale** (riga ~134):

```typescript
function App() {
  return <AuthProvider><AppDataProvider><AppContent /></AppDataProvider></AuthProvider>
}
```

**Componente interno**: `AppContent` (confermato — lo stesso nome usato nel design).

**Import di `useVisibleData`** (riga 23):
```typescript
import { useVisibleData } from '@/hooks/use-visible-data'
```

**Chiamata a `useVisibleData` in `AppContent`** (riga 33):
```typescript
const { budgetAlerts, totalBalance, visibleAccounts, visibleTransactions } = useVisibleData()
```
Campi destrutturati: `budgetAlerts`, `totalBalance`, `visibleAccounts`, `visibleTransactions` — 4 campi.

**Modifica richiesta in `App.tsx`** — due interventi separati:

1. **Nella funzione `App`**: inserire `<VisibleDataProvider>` tra `<AppDataProvider>` e `<AppContent />`:
   ```typescript
   function App() {
     return <AuthProvider><AppDataProvider><VisibleDataProvider><AppContent /></VisibleDataProvider></AppDataProvider></AuthProvider>
   }
   ```

2. **In `AppContent`**: sostituire l'import riga 23 da `@/hooks/use-visible-data` a `@/context/VisibleDataContext`. La destrutturazione riga 33 rimane identica.

**Import di `VisibleDataProvider`** da aggiungere: riga di import da `@/context/VisibleDataContext`.

---

### AI3 — Import e destrutturazione in `src/components/AppHeader.tsx`

**Verifica eseguita**: lettura del file.

**Import** (riga 3):
```typescript
import { useVisibleData } from '@/hooks/use-visible-data'
```

**Destrutturazione** (riga 13):
```typescript
const { totalBalance, visibleAccounts } = useVisibleData()
```
Campi: `totalBalance`, `visibleAccounts` — 2 campi.

**Import aggiuntivi** da `@/hooks/use-visible-data`: nessuno.

**Modifica richiesta**: sostituzione del solo percorso nell'import (riga 3). La riga 13 è invariata.

---

### AI4 — Import e destrutturazione in `src/components/DashboardTab.tsx`

**Verifica eseguita**: lettura del file (post-P17).

**Import** (riga 4):
```typescript
import { useVisibleData } from '@/hooks/use-visible-data'
```

**Destrutturazione** (~righe 43–51):
```typescript
const {
  visibleAccounts,
  visibleTransactions,
  recentTransactions,
  groupedAccounts,
  filteredGroupedAccounts,
  allCategoriesVisible,
  hasPrivateAccount,
} = useVisibleData()
```
Campi: 7 (`visibleAccounts`, `visibleTransactions`, `recentTransactions`, `groupedAccounts`, `filteredGroupedAccounts`, `allCategoriesVisible`, `hasPrivateAccount`). Non usa `totalBalance`, `privateAccount`, `budgetAlerts`.

**Import React** (riga 1): `import { useRef, useCallback } from 'react'` — già presenti da P17. Non richiedono modifica.

**Modifica richiesta**: sostituzione del solo percorso nell'import (riga 4). La destrutturazione è invariata.

---

### AI5 — Import e destrutturazione in `src/components/TransactionsTab.tsx`

**Verifica eseguita**: lettura del file (post-P17).

**Import** (riga 4):
```typescript
import { useVisibleData } from '@/hooks/use-visible-data'
```

**Destrutturazione** (riga 26):
```typescript
const { visibleTransactions, visibleAccounts } = useVisibleData()
```
Campi: 2 (`visibleTransactions`, `visibleAccounts`).

**Import React** (riga 1): `import { useMemo, useRef, useCallback } from 'react'` — già presenti da P17. Non richiedono modifica.

**Modifica richiesta**: sostituzione del solo percorso nell'import (riga 4). Riga 26 invariata.

---

### AI6 — Import e destrutturazione in `src/components/ReportsTab.tsx`

**Verifica eseguita**: lettura del file.

**Import** (riga 3):
```typescript
import { useVisibleData } from '@/hooks/use-visible-data'
```

**Destrutturazione** (~righe 44–48):
```typescript
const {
  visibleAccounts,
  visibleTransactions,
  totalBalance,
} = useVisibleData()
```
Campi: 3 (`visibleAccounts`, `visibleTransactions`, `totalBalance`).

**Note**: questo è il consumer non ispezionato nel report diagnostico originale. I campi effettivi (`visibleAccounts`, `visibleTransactions`, `totalBalance`) sono tutti presenti nel tipo `VisibleDataResult` — nessuna sorpresa.

**Modifica richiesta**: sostituzione del solo percorso nell'import (riga 3). Destrutturazione invariata.

---

### AI7 — Import e destrutturazione in `src/components/DialogsOverlay.tsx`

**Verifica eseguita**: lettura del file.

**Import** (riga 3):
```typescript
import { useVisibleData } from '@/hooks/use-visible-data'
```

**Destrutturazione** (~righe 66–71, top-level nel componente `DialogsOverlay`):
```typescript
const {
  visibleAccounts,
  visibleTransactions,
  hasPrivateAccount,
  privateAccount,
} = useVisibleData()
```
Campi: 4 (`visibleAccounts`, `visibleTransactions`, `hasPrivateAccount`, `privateAccount`).

**Posizione della chiamata**: top-level del componente (non dentro una funzione interna). Nessun rischio per `react-hooks/rules-of-hooks`.

**Modifica richiesta**: sostituzione del solo percorso nell'import (riga 3). Destrutturazione invariata.

---

### AI8 — Import e destrutturazione in `src/hooks/use-app-shortcuts.ts`

**Verifica eseguita**: lettura del file.

**Import** (riga 4 — confermato):
```typescript
import { useVisibleData } from '@/hooks/use-visible-data'
```

**Destrutturazione** (~righe 44–49):
```typescript
const {
  allCategoriesVisible,
  hasPrivateAccount,
  visibleTransactions,
  visibleAccounts,
} = useVisibleData()
```
Campi: 4 (`allCategoriesVisible`, `hasPrivateAccount`, `visibleTransactions`, `visibleAccounts`).

**Chiamante**: `use-app-shortcuts.ts` è un hook chiamato in `AppContent` (riga ~68 di `App.tsx`: `useAppShortcuts({...})`). Poiché `AppContent` si troverà dentro `VisibleDataProvider` dopo la modifica di `App.tsx`, la chiamata a `useVisibleData()` dal context funzionerà correttamente — il provider è nell'albero sopra il chiamante.

**Modifica richiesta**: sostituzione del solo percorso nell'import (riga 4). Destrutturazione invariata.

---

### AI9 — Convenzione di naming in `src/context/`

**Verifica eseguita**: lettura delle sezioni rilevanti di `AppDataContext.tsx` e `AuthContext.tsx`.

**Pattern comune ai due file**:

| Elemento | `AppDataContext.tsx` | `AuthContext.tsx` |
|---|---|---|
| Tipo del contesto | `type AppDataContextValue = {...}` | `interface AuthContextValue {...}` |
| Creazione context | `const AppDataContext = createContext<Type | null>(null)` | `const AuthContext = createContext<Type | null>(null)` |
| Export context | Non esportato direttamente | Non esportato direttamente |
| Provider | `export function AppDataProvider({ children }: { children: ReactNode })` | `export function AuthProvider({ children }: { children: ReactNode })` |
| Hook di accesso | `export function useAppData(): AppDataContextValue` | `export function useAuth(): AuthContextValue` |
| Guard nel hook | `if (!ctx) throw new Error('useAppData deve essere usato dentro AppDataProvider')` | `if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider')` |
| Stile funzione | Funzione normale (non `React.FC`) | Funzione normale (non `React.FC`) |
| Import React | `createContext, useContext, useEffect, useMemo, useState, type ReactNode` | `createContext, useContext, useState, useEffect, ReactNode` |

**Struttura target di `VisibleDataContext.tsx`** (coerente con la convenzione):

```typescript
import { createContext, useContext, type ReactNode } from 'react'
import { useVisibleData as useVisibleDataHook, type VisibleDataResult } from '@/hooks/use-visible-data'

type VisibleDataContextValue = VisibleDataResult

const VisibleDataContext = createContext<VisibleDataContextValue | null>(null)

export function useVisibleData(): VisibleDataContextValue {
  const ctx = useContext(VisibleDataContext)
  if (!ctx) throw new Error('useVisibleData deve essere usato dentro VisibleDataProvider')
  return ctx
}

export function VisibleDataProvider({ children }: { children: ReactNode }) {
  const data = useVisibleDataHook()
  return <VisibleDataContext.Provider value={data}>{children}</VisibleDataContext.Provider>
}
```

**Note**:
- Il context non viene esportato direttamente (pattern esistente).
- Il tipo `VisibleDataContextValue` è un alias di `VisibleDataResult` — non ridefinisce i campi, li ri-espone.
- L'alias `useVisibleDataHook` è necessario per evitare il conflitto di nomi: il file esporta `useVisibleData` (per i consumer) e importa `useVisibleData` da `@/hooks/` (per uso interno). TypeScript e il bundler accetterebbero nomi identici in un import rinominato — ma per chiarezza si usa l'alias esplicito.
- Il tipo usa `type` (non `interface`) per coerenza con `VisibleDataResult` che è già dichiarato come `type` nel file sorgente.
- `VisibleDataProvider` non contiene logica: è un wrapper puro che chiama il hook interno e passa il risultato al context provider.

---

## Rischi

### R1 🔴 — Posizionamento errato del provider nell'albero

**Problema**: se `VisibleDataProvider` viene inserito fuori da `AppDataProvider` o fuori da `AuthProvider`, il hook interno `useVisibleDataHook()` non trova i context di cui dipende e lancia un errore runtime immediatamente al caricamento dell'app (catturato dall'ErrorBoundary).

**Mitigazione**: verifica visiva dell'ordine di annidamento JSX dopo la modifica in `App.tsx`. L'ordine atteso è: `AuthProvider → AppDataProvider → VisibleDataProvider → AppContent`. Il messaggio di errore runtime è descrittivo ("useAppData deve essere usato dentro AppDataProvider") — individua immediatamente il problema.

**Gate**: build verde + verifica JSX manuale in `App.tsx` prima di migrare i consumer.

---

### R2 🟡 — Campi mancanti nel tipo del context

**Problema**: se un consumer usa campi di `VisibleDataResult` non inclusi nel tipo del context (causato da un refactor non documentato), TypeScript segnala l'errore durante il build.

**Mitigazione**: AI1 conferma che `VisibleDataResult` ha esattamente 10 campi e che nessun consumer usa campi al di fuori di essi. Il build intercetta il problema deterministicamente.

**Gate**: `npm run build` dopo la creazione del context (Sotto-operazione 1) e dopo ogni migrazione consumer.

---

### R3 🟡 — Consumer con calcoli inline sulla chiamata a `useVisibleData`

**Problema**: un consumer potrebbe fare calcoli sull'oggetto restituito da `useVisibleData()` prima della destrutturazione standard.

**Mitigazione**: AI3–AI8 hanno letto ogni consumer e confermato che tutti usano esclusivamente la destrutturazione standard — nessun calcolo inline sulla chiamata. Nessun rischio residuo confermato.

**Gate**: TypeScript segnala l'errore in modo deterministico se la sostituzione rompe una variabile locale.

---

### R4 🟢 — Nuovo warning ESLint introdotto dal file context

**Problema**: il nuovo file `VisibleDataContext.tsx` potrebbe introdurre warning se la struttura viola regole attive (es. `react-refresh/only-export-components`).

**Mitigazione**: `AppDataContext.tsx` ha già il warning `react-refresh/only-export-components` riga 455 (per l'export del hook insieme al provider). Lo stesso warning comparirà in `VisibleDataContext.tsx` per la stessa ragione strutturale. Il conteggio potrebbe salire di 1 — da documentare nel report dei risultati.

**Gate**: `npm run lint` dopo Sotto-operazione 1, confronto con baseline.

---

### R5 🟢 — `react-hooks/rules-of-hooks` in `use-app-shortcuts.ts`

**Problema**: `use-app-shortcuts.ts` è un hook che chiama `useVisibleData()` dal context. Se il provider non è nell'albero, il runtime lancia un errore non rilevabile da TypeScript.

**Mitigazione**: AI8 ha confermato che `use-app-shortcuts` è chiamato da `AppContent`, che si trova sotto `VisibleDataProvider`. Il rischio è reale solo se il posizionamento del provider è sbagliato (R1), che è già il rischio più critico. La verifica funzionale manuale (avvio dell'app, test scorciatoie) copre questo caso.

---

## Schema riepilogativo delle operazioni

```
Passo 18 — VisibleDataProvider: fonte unica dei dati elaborati
│
├── Sotto-operazione 1 — Creazione src/context/VisibleDataContext.tsx
│   ├── Leggere use-visible-data.ts (AI1) e contesti esistenti (AI9)
│   ├── Creare il file con: type alias, createContext, useVisibleData hook, VisibleDataProvider
│   ├── Alias import interno: useVisibleDataHook da @/hooks/use-visible-data
│   └── Verifica: npm run build → exit 0
│
├── Sotto-operazione 2 — Integrazione in src/App.tsx
│   ├── Aggiungere import VisibleDataProvider da @/context/VisibleDataContext
│   ├── Inserire <VisibleDataProvider> nella funzione App (dentro AppDataProvider, sopra AppContent)
│   ├── In AppContent: sostituire import useVisibleData da hooks → context
│   ├── Verifica visiva ordine annidamento JSX (gate R1)
│   └── Verifica: npm run build → exit 0
│
├── Sotto-operazione 3 — Migrazione consumer (6 file in ordine crescente di complessità)
│   ├── 3a AppHeader.tsx — 2 campi → sostituzione import → build
│   ├── 3b TransactionsTab.tsx — 2 campi → sostituzione import → build
│   ├── 3c use-app-shortcuts.ts — 4 campi (hook) → sostituzione import → build
│   ├── 3d DialogsOverlay.tsx — 4 campi → sostituzione import → build
│   ├── 3e ReportsTab.tsx — 3 campi → sostituzione import → build
│   └── 3f DashboardTab.tsx — 7 campi → sostituzione import → build
│
└── Sotto-operazione 4 — Verifica finale
    ├── npm run build → exit 0
    ├── npm run lint → exit 0, ≤ baseline
    ├── Grep: zero import da @/hooks/use-visible-data eccetto VisibleDataContext.tsx
    ├── git diff --stat → 9 file (1 creato + 8 modificati)
    └── Verifica comportamento visivo manuale: Dashboard, Movimenti, Report,
        AppHeader, dialoghi, scorciatoie, sblocco conto privato
```

---

## Sotto-operazione 1 — Creazione di `src/context/VisibleDataContext.tsx`

> **Rischio prevalente**: 🟡 R4 (warning ESLint nuovo).  
> **Prerequisito**: P01–P17 completati; branch `refactoring-architettura`.

### 1.1 Lettura preventiva dei file di riferimento

Prima di creare il file, confermare la struttura di `use-visible-data.ts` (AI1) e dei contesti esistenti (AI9). I dati raccolti in questo piano sono già sufficienti; una ulteriore lettura è facoltativa se il file non è stato toccato.

### 1.2 Struttura del file `VisibleDataContext.tsx`

Il file è compatto: import, type alias, context, hook di accesso, provider. Non contiene logica di calcolo — quella rimane in `use-visible-data.ts`.

**Import**:
- Da `react`: `createContext`, `useContext`, `type ReactNode`
- Da `@/hooks/use-visible-data`: `useVisibleData` rinominato come `useVisibleDataHook`, più `type VisibleDataResult`

**Tipo del context**: `type VisibleDataContextValue = VisibleDataResult` — alias diretto, senza ridefinire i campi.

**Creazione del context**: `const VisibleDataContext = createContext<VisibleDataContextValue | null>(null)` — non esportato.

**Hook di accesso `useVisibleData`**: funzione named export che chiama `useContext(VisibleDataContext)` e lancia `new Error('useVisibleData deve essere usato dentro VisibleDataProvider')` se il context è null.

**Provider `VisibleDataProvider`**: funzione named export, parametro `{ children }: { children: ReactNode }`. Corpo: chiama `useVisibleDataHook()` una sola volta, restituisce `<VisibleDataContext.Provider value={data}>{children}</VisibleDataContext.Provider>`.

⚠️ `VisibleDataProvider` non deve contenere `useState`, `useEffect` propri, o altri hook oltre a `useVisibleDataHook()`. È un wrapper puro.

⚠️ Il file esporta `useVisibleData` con lo stesso nome dell'hook in `use-visible-data.ts`. Questo è intenzionale: i consumer cambiano solo il percorso dell'import, non il nome. TypeScript risolve correttamente i due simboli perché provengono da moduli diversi.

### 1.3 Warning ESLint atteso

La regola `react-refresh/only-export-components` si attiva quando un file esporta sia componenti che hook/funzioni. `VisibleDataContext.tsx` esporta sia `VisibleDataProvider` (componente) che `useVisibleData` (hook). Il warning è atteso e già presente in modo identico in `AppDataContext.tsx` (riga 455) e `AuthContext.tsx` (riga 30). Il conteggio totale dei warning potrebbe salire di 1.

### 1.4 Verifica intermedia 1

```
npm run build
```
Atteso: exit code 0. Errori TypeScript tipici in caso di problemi:
- `JSX element type '...' does not have any construct or call signatures` — verificare che il provider ritorni JSX valido
- `Property 'X' does not exist on type 'VisibleDataContextValue | null'` — verificare il guard nel hook di accesso
- `Module '"@/hooks/use-visible-data"' has no exported member 'useVisibleData'` — verificare il nome esatto dell'export in `use-visible-data.ts`

---

## Sotto-operazione 2 — Integrazione in `src/App.tsx`

> **Rischio prevalente**: 🔴 R1 (posizionamento errato del provider).  
> **Prerequisito**: Sotto-operazione 1 completata; build verde.

### 2.1 Aggiunta dell'import di `VisibleDataProvider`

Aggiungere nella sezione import di `App.tsx` (dopo gli import dei context esistenti, prima degli import dei componenti UI o nella posizione coerente con l'ordinamento esistente):

```typescript
import { VisibleDataProvider } from '@/context/VisibleDataContext'
```

### 2.2 Inserimento del provider nell'albero

Modificare la funzione `App` (riga ~134) da:

```typescript
function App() {
  return <AuthProvider><AppDataProvider><AppContent /></AppDataProvider></AuthProvider>
}
```

a:

```typescript
function App() {
  return <AuthProvider><AppDataProvider><VisibleDataProvider><AppContent /></VisibleDataProvider></AppDataProvider></AuthProvider>
}
```

⚠️ La posizione è: **dentro** `<AppDataProvider>`, **sopra** `<AppContent />`. L'ordine delle aperture è: `AuthProvider` → `AppDataProvider` → `VisibleDataProvider` → `AppContent`. Se l'ordine è diverso, l'app si rompe al primo render con un errore nell'ErrorBoundary.

### 2.3 Sostituzione dell'import in `AppContent`

In `AppContent`, alla riga 23, sostituire:

```typescript
import { useVisibleData } from '@/hooks/use-visible-data'
```

con:

```typescript
import { useVisibleData } from '@/context/VisibleDataContext'
```

La destrutturazione alla riga 33 è invariata:
```typescript
const { budgetAlerts, totalBalance, visibleAccounts, visibleTransactions } = useVisibleData()
```

### 2.4 Verifica visiva dell'albero JSX

Dopo l'edit, leggere le righe finali di `App.tsx` e confermare visivamente l'ordine di annidamento. Questo è il gate R1.

### 2.5 Verifica intermedia 2

```
npm run build
```
Atteso: exit code 0. Se il build rompe con un errore del tipo `useAppData deve essere usato dentro AppDataProvider`, il provider è stato inserito in posizione sbagliata.

---

## Sotto-operazione 3 — Migrazione consumer (6 file)

> **Rischio prevalente**: 🟡 R3 (calcoli inline — già escluso dalle AI).  
> **Prerequisito**: Sotto-operazione 2 completata; build verde.

Per ogni consumer, la sequenza è:
1. Leggere la riga di import attuale (già documentata nelle AI sopra).
2. Sostituire il percorso: `@/hooks/use-visible-data` → `@/context/VisibleDataContext`.
3. Verificare che la destrutturazione sia identica (nessun campo rimosso o aggiunto).
4. `npm run build` → exit 0 prima di procedere al consumer successivo.

⚠️ Non accumulare migrazioni senza build intermedio. La sequenza è intenzionalmente dal più semplice al più complesso per ridurre il rischio cumulativo.

---

### 3a — `src/components/AppHeader.tsx`

**Import attuale** (riga 3): `import { useVisibleData } from '@/hooks/use-visible-data'`

**Modifica**: sostituire solo il percorso dell'import. La riga 13 con la destrutturazione `{ totalBalance, visibleAccounts }` è invariata.

**Build intermedio**: `npm run build` → exit 0.

---

### 3b — `src/components/TransactionsTab.tsx`

**Import attuale** (riga 4): `import { useVisibleData } from '@/hooks/use-visible-data'`

**Modifica**: sostituire solo il percorso dell'import. La riga 26 con la destrutturazione `{ visibleTransactions, visibleAccounts }` è invariata. Gli import React esistenti (`useMemo`, `useRef`, `useCallback` — introdotti da P17) non vengono toccati.

**Build intermedio**: `npm run build` → exit 0.

---

### 3c — `src/hooks/use-app-shortcuts.ts`

**Import attuale** (riga 4): `import { useVisibleData } from '@/hooks/use-visible-data'`

**Modifica**: sostituire solo il percorso dell'import. La destrutturazione `{ allCategoriesVisible, hasPrivateAccount, visibleTransactions, visibleAccounts }` (~riga 44–49) è invariata.

**Nota critica**: `use-app-shortcuts.ts` è un hook, non un componente. La chiamata a `useVisibleData()` dal context funziona perché questo hook viene usato dentro `AppContent` (confermato in AI8), che si trova nell'albero sotto `VisibleDataProvider` dopo la modifica di `App.tsx`. Se il provider non fosse nell'albero, il runtime lancerebbe un errore al primo render — ma il build TypeScript non lo rileva (R5).

**Build intermedio**: `npm run build` → exit 0.

---

### 3d — `src/components/DialogsOverlay.tsx`

**Import attuale** (riga 3): `import { useVisibleData } from '@/hooks/use-visible-data'`

**Modifica**: sostituire solo il percorso dell'import. La destrutturazione `{ visibleAccounts, visibleTransactions, hasPrivateAccount, privateAccount }` (~riga 66–71) è invariata.

**Build intermedio**: `npm run build` → exit 0.

---

### 3e — `src/components/ReportsTab.tsx`

**Import attuale** (riga 3): `import { useVisibleData } from '@/hooks/use-visible-data'`

**Modifica**: sostituire solo il percorso dell'import. La destrutturazione `{ visibleAccounts, visibleTransactions, totalBalance }` (~riga 44–48) è invariata.

**Build intermedio**: `npm run build` → exit 0.

---

### 3f — `src/components/DashboardTab.tsx`

**Import attuale** (riga 4): `import { useVisibleData } from '@/hooks/use-visible-data'`

**Modifica**: sostituire solo il percorso dell'import. La destrutturazione (~righe 43–51) che include 7 campi è invariata. Gli import React (`useRef`, `useCallback` — P17) non vengono toccati.

**Build intermedio**: `npm run build` → exit 0.

---

## Sotto-operazione 4 — Verifica finale

> **Prerequisito**: tutte le migrazioni consumer completate; build verde dopo 3f.

### 4.1 Build e lint

```
npm run build
```
Atteso: exit code 0.

```
npm run lint
```
Atteso: exit code 0. Contare i warning e confrontare con la baseline post-P17 (attesa ≤55, ma misurare il valore effettivo annotato al gate A.1 della todo). Il conteggio dopo P18 non deve aumentare rispetto alla baseline, a eccezione del possibile warning `react-refresh/only-export-components` su `VisibleDataContext.tsx` (vedi AI9 — probabile +1).

### 4.2 Grep di controllo

Eseguire una ricerca di `@/hooks/use-visible-data` in tutta la directory `src/`:

```
grep -r "@/hooks/use-visible-data" src/
```

Atteso: **solo** `src/context/VisibleDataContext.tsx` deve apparire nell'output. Zero occorrenze in qualsiasi altro file.

### 4.3 Integrità del repository

```
git diff --stat
```

Atteso: **9 file** esatti:
- `src/context/VisibleDataContext.tsx` (nuovo — status `A`)
- `src/App.tsx`
- `src/hooks/use-app-shortcuts.ts`
- `src/components/AppHeader.tsx`
- `src/components/TransactionsTab.tsx`
- `src/components/DialogsOverlay.tsx`
- `src/components/ReportsTab.tsx`
- `src/components/DashboardTab.tsx`
- `src/hooks/use-visible-data.ts` **non deve comparire** (invariato)

Se compaiono file aggiuntivi non attesi, analizzare prima di procedere.

### 4.4 Verifica comportamento visivo manuale

Avviare il dev server con `npm run dev` e verificare:

- **Dashboard**: i conti, i movimenti recenti e il saldo totale sono identici a prima
- **Movimenti**: la lista con filtri e ordinamento è invariata
- **Report**: i grafici e le statistiche sono invariati
- **AppHeader**: il saldo nella barra dell'intestazione è corretto
- **BudgetAlertBanner**: gli alert di budget compaiono se presenti
- **Sblocco conto privato**: aggiorna le tab in modo coerente
- **Dialoghi**: apertura e salvataggio di transazione, conto, budget funzionano (`DialogsOverlay` migrato)
- **Scorciatoie tastiera**: Ctrl+D, Ctrl+T, Ctrl+R e le altre scorciatoie gestite da `use-app-shortcuts` funzionano

---

## Nota sulla riduzione dei warning ESLint attesa

Baseline al termine di P17: 55 warning (o il valore effettivo misurato al gate A.1 della todo). P18 non risolve nessun warning esistente e non ne introduce di nuovi oltre all'eventuale `react-refresh/only-export-components` su `VisibleDataContext.tsx`.

| Possibile variazione | Causa | Entità |
|---|---|---|
| +1 warning `react-refresh/only-export-components` | `VisibleDataContext.tsx` esporta sia un componente che un hook | Probabile |
| Nessun warning risolto | Le sostituzioni di import non toccano nessun warning esistente | Certo |

**Conteggio atteso post-P18**: uguale o +1 rispetto alla baseline post-P17.

---

## Tabella risultati da compilare durante l'esecuzione

| Sotto-operazione | Build | Warning lint | Note |
|---|---|---|---|
| 1 — Creazione VisibleDataContext.tsx | PASS | 60 | Build verde; warning atteso `react-refresh/only-export-components` presente nel nuovo file |
| 2 — Integrazione App.tsx | PASS | n/d | Ordine provider verificato a vista: Auth → AppData → VisibleData → AppContent |
| 3a — AppHeader.tsx | PASS | n/d | Solo sostituzione import; destrutturazione invariata |
| 3b — TransactionsTab.tsx | PASS | n/d | Solo sostituzione import; import React P17 invariati |
| 3c — use-app-shortcuts.ts | PASS | n/d | Hook migrato correttamente sotto `VisibleDataProvider` |
| 3d — DialogsOverlay.tsx | PASS | n/d | Solo sostituzione import; flusso conto privato invariato a livello statico |
| 3e — ReportsTab.tsx | PASS | n/d | Un controllo intermedio ha restituito un falso negativo su npm; build rieseguita con exit code 0 |
| 3f — DashboardTab.tsx | PASS | n/d | Solo sostituzione import; import React P17 invariati |
| 4 — Verifica finale | PASS | 56 | Grep verde: unico import residuo da `@/hooks/use-visible-data` in `VisibleDataContext.tsx`; perimetro codice P18 confermato; verifica UI interattiva completa non automatizzabile qui |
