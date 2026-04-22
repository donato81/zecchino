# P05 — Hook dei valori derivati: `use-visible-data.ts`

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 5 (corrispondente al Passo 5 del piano di refactoring)  
> Data: 22 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Al termine dei Passi 1–4, `AppDataContext` e `AuthContext` sono pronti e `App.tsx` li usa già come sorgenti di dati. Tuttavia `App.tsx` contiene ancora dieci calcoli derivati (`useMemo` e inline computations) che leggono dati dai due context e producono i valori effettivamente usati dall'interfaccia.

Il Passo 5 raccoglie questi calcoli in un unico hook: `useVisibleData()`.

**Perché estrarlo in un hook separato:**

- I valori derivati non appartengono a `App.tsx` (logica di presentazione) né ai context (stato persistito). Vivono in uno strato intermedio: dati pronti da esporre all'UI, calcolati una sola volta per tutta la gerarchia.
- Una volta spostati nell'hook, `DashboardTab`, `TransactionsTab`, `ReportsTab`, `AppHeader` e `DialogsOverlay` (creati nei passi successivi) potranno chiamare `useVisibleData()` senza dipendere da `App.tsx`.
- Il Passo 5 è a **rischio basso**: nessun side-effect, nessuno stato, nessun effetto collaterale. Solo lettura e calcolo.

Al termine di questo passo il comportamento dell'app è identico: il file viene creato ma non è ancora importato da nessuna parte.

---

## 2. Perimetro della modifica

### File creati

| Percorso | Scopo |
|---|---|
| `src/hooks/use-visible-data.ts` | Hook che espone i dieci valori derivati calcolati da `AppDataContext` e `AuthContext` |

### File modificati

| Percorso | Modifica |
|---|---|
| `src/lib/types.ts` | Aggiunta del tipo `AccountGroup` (`{ id: string; label: string; accounts: Account[] }`) |

`App.tsx` non viene toccato: continua a calcolare gli stessi valori localmente fino al Passo 6, quando l'hook viene effettivamente connesso. `src/lib/types.ts` viene modificato esclusivamente per aggiungere il tipo `AccountGroup`. Nessun comportamento esistente cambia.

### File non toccati

Tutto il resto del progetto rimane invariato:

- `src/App.tsx` — invariato, continua ad avere i propri `useMemo` locali
- `src/context/AppDataContext.tsx` — invariato
- `src/context/AuthContext.tsx` — invariato
- `src/lib/` — invariato (helpers, budget-alerts, constants già pronti)
- `src/hooks/` — gli hook esistenti non vengono toccati
- `src/components/` — invariato
- `docs/`, `.github/` — invariati

---

## 3. Struttura dell'hook

### 3.1 Firma

```ts
// src/hooks/use-visible-data.ts

import { useMemo } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { ACCOUNT_CATEGORIES, ACCOUNT_TYPE_TO_CATEGORY } from '@/lib/constants'
import { getTotalBalance } from '@/lib/helpers'
import { generateBudgetAlerts } from '@/lib/budget-alerts'
import type { Account } from '@/lib/types'

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

export function useVisibleData(): VisibleDataResult {
  // ... corpo descritto in 3.2
}
```

`AccountGroup` è il tipo `{ id: string; label: string; accounts: Account[] }` (struttura già restituita da `ACCOUNT_CATEGORIES` con `accounts` aggiunto).

### 3.2 Sorgenti dati

L'hook non riceve parametri: li legge direttamente dai due context.

| Variabile sorgente | Provenienza | Descrizione |
|---|---|---|
| `safeAccounts` | `useAppData()` | Lista conti (mai null) |
| `safeTransactions` | `useAppData()` | Lista movimenti (mai null) |
| `safeBudgets` | `useAppData()` | Lista budget (mai null) |
| `visibleCategories` | `useAppData()` | ID categorie attualmente visibili |
| `dismissedAlerts` | `useAppData()` | ID alert budget già chiusi dall'utente |
| `isPrivateUnlocked` | `useAuth()` | `true` dopo sblocco PIN privato |

### 3.3 Valori restituiti

La tabella elenca ciascun valore nell'ordine in cui va dichiarato nel corpo dell'hook (rispettare l'ordine è obbligatorio perché alcuni valori dipendono dai precedenti).

| # | Nome | Tipo | Dipende da | Note implementative |
|---|---|---|---|---|
| 1 | `visibleAccounts` | `Account[]` | `safeAccounts`, `isPrivateUnlocked` | `useMemo` — filtra i conti con `isPrivato === true` se `isPrivateUnlocked` è `false` |
| 2 | `visibleTransactions` | `Transaction[]` | `safeTransactions`, `visibleAccounts` | `useMemo` — costruisce un `Set` di ID conto visibili, poi filtra `safeTransactions` per `contoId` |
| 3 | `hasPrivateAccount` | `boolean` | `safeAccounts` | `useMemo` — `safeAccounts.some(a => a.isPrivato)` |
| 4 | `privateAccount` | `Account \| undefined` | `safeAccounts` | `useMemo` — `safeAccounts.find(a => a.isPrivato)` |
| 5 | `totalBalance` | `number` | `visibleAccounts`, `visibleTransactions` | `useMemo` — delega a `getTotalBalance(visibleAccounts, visibleTransactions)` da `src/lib/helpers.ts` |
| 6 | `recentTransactions` | `Transaction[]` | `visibleTransactions` | `useMemo` — copia dell'array, ordinata per data decrescente, tagliata a 10 elementi |
| 7 | `groupedAccounts` | `AccountGroup[]` | `visibleAccounts` | `useMemo` — raggruppa con `ACCOUNT_TYPE_TO_CATEGORY`, mappa su `ACCOUNT_CATEGORIES`, filtra gruppi senza conti |
| 8 | `filteredGroupedAccounts` | `AccountGroup[]` | `groupedAccounts`, `visibleCategories` | `useMemo` — filtra `groupedAccounts` mantenendo solo i gruppi il cui `id` è presente in `visibleCategories` |
| 9 | `allCategoriesVisible` | `boolean` | `visibleCategories` | `useMemo` — confronta la lunghezza di `visibleCategories` con quella di `ACCOUNT_CATEGORIES` |
| 10 | `budgetAlerts` | `BudgetAlert[]` | `safeBudgets`, `visibleTransactions`, `dismissedAlerts` | `useMemo` — chiama `generateBudgetAlerts(safeBudgets, visibleTransactions)`, poi rimuove gli alert già presenti in `dismissedAlerts` per `budgetId` |

### 3.4 Note sull'ordine di dichiarazione

I valori **devono** essere dichiarati nell'ordine della tabella sopra perché:

- `visibleTransactions` (#2) dipende da `visibleAccounts` (#1)
- `totalBalance` (#5) dipende da entrambi (#1 e #2)
- `filteredGroupedAccounts` (#8) dipende da `groupedAccounts` (#7)

Dichiarare un valore prima del suo prerequisito causerebbe un errore di runtime per variabile non ancora inizializzata.

### 3.5 `hasPrivateAccount` e `privateAccount` — scelta di wrapping

In `App.tsx` questi due valori sono calcoli inline senza `useMemo`. Nell'hook vengono wrappati in `useMemo` perché:

- All'interno di un hook il "costo" di ricreazione del closure è reale ad ogni render
- Il pattern coerente con il resto dell'hook è `useMemo`
- La dipendenza è un solo array (`safeAccounts`), quindi l'overhead è minimo

---

## 4. Cosa NON si sposta in questo passo

Il Passo 5 crea l'hook ma non modifica `App.tsx`. Le seguenti parti di `App.tsx` restano invariate e verranno affrontate nei passi successivi:

| Elemento | Dove rimane | Passo previsto |
|---|---|---|
| I 10 `useMemo` / calcoli inline già presenti | `App.tsx` | Rimossi al Passo 6 (`use-app-shortcuts`) o quando il componente che li usa viene estratto |
| `useEffect` cambio tab | `App.tsx` | Passo 6 (`use-app-shortcuts`) |
| `useEffect` apertura delete dialog | `App.tsx` | Passo 8 (`DialogsOverlay`) |
| `handleAddFundsToGoal` | `App.tsx` | Passo 8 (`DialogsOverlay`) |
| `recentTransactionsNav`, `allTransactionsNav` (`useListNavigation`) | `App.tsx` | Passo 7 (`TransactionsTab`) e Passo 9 (`DashboardTab`) |
| `useKeyboardShortcuts` — configurazione 15 shortcut | `App.tsx` | Passo 6 (`use-app-shortcuts.ts`) |
| Stato UI: `showAccountDialog`, `showTransactionDialog`, `showBudgetDialog`, ecc. | `App.tsx` | Passo 8 (`DialogsOverlay`) |
| Stato UI: `editingAccount`, `editingTransaction`, `editingBudget`, `editingSavingsGoal` | `App.tsx` | Passo 8 |
| `deletingItem`, `showDeleteDialog` | `App.tsx` | Passo 8 |
| `activeTab`, `previousTab`, `chartPeriod` | `App.tsx` | Passi 7–10 (estrazione tab) |
| `showKeyboardHelp` | `App.tsx` | Passo 6 |
| Tutto il JSX (AuthScreen, header, tab, dialog) | `App.tsx` | Passi 7–12 |

---

## 5. Come `App.tsx` userà l'hook

> Questa sezione descrive l'uso atteso dopo il Passo 6. Il codice qui sotto **non viene scritto in questo passo**.

Quando l'hook verrà collegato, `App.tsx` (o i componenti estratti) sostituiranno i propri calcoli locali con una singola chiamata:

```tsx
// Uso futuro in App.tsx o nei componenti estratti
import { useVisibleData } from '@/hooks/use-visible-data'

function AppContent() {
  const {
    visibleAccounts,
    visibleTransactions,
    hasPrivateAccount,
    privateAccount,
    totalBalance,
    recentTransactions,
    groupedAccounts,
    filteredGroupedAccounts,
    allCategoriesVisible,
    budgetAlerts,
  } = useVisibleData()

  // I 10 useMemo locali vengono rimossi
  // ...
}
```

I componenti che attualmente ricevono questi valori come prop (es. `BudgetAlertBanner`, `AccountCard`) potranno invece chiamare `useVisibleData()` direttamente — ma questo avviene nei passi di estrazione dei componenti (7–10), non ora.

---

## 6. Criteri di verifica

Dopo aver implementato il Passo 5 (creazione del file), eseguire i seguenti controlli:

1. **Compilazione TypeScript senza errori**: eseguire `tsc --noEmit` nel terminale. Nessun errore deve comparire nel file `src/hooks/use-visible-data.ts` né nei file che lo importano (nessuno, in questa fase).

2. **Il file esiste e viene trovato**: verificare che `src/hooks/use-visible-data.ts` esista nel repository e contenga l'export `useVisibleData`.

3. **Il comportamento dell'app è invariato**: `App.tsx` non è stato modificato, quindi l'app funziona esattamente come prima del passo. Aprire l'app, autenticarsi, navigare nei tab — nessuna regressione visiva o funzionale.

4. **Nessun import ciclico**: aprire la console del browser durante l'esecuzione. Nessun warning "circular dependency" deve comparire. Il file `use-visible-data.ts` importa solo da `context/` e `lib/`, che non importano da `hooks/`.

5. **I valori tipizzati sono corretti**: il tipo restituito dall'hook corrisponde alla struttura usata in `App.tsx`. In particolare:
   - `visibleAccounts` è `Account[]`
   - `budgetAlerts` è `BudgetAlert[]` (tipo da `src/lib/budget-alerts.ts`)
   - `groupedAccounts` e `filteredGroupedAccounts` hanno la struttura `{ id, label, accounts[] }`

---

## 7. Rischi e note

### R1 — Dipendenza circolare `AuthContext ↔ use-visible-data`

`use-visible-data` legge `isPrivateUnlocked` da `AuthContext` per calcolare `visibleAccounts`. `handlePrivatePinSubmit` (in `AuthContext`) in futuro potrebbe voler leggere `visibleAccounts` per annunciare il saldo al screen reader.

Se `AuthContext` importasse `use-visible-data`, si creerebbe un ciclo:

```
AuthContext → use-visible-data → useAuth() → AuthContext
```

**Soluzione già applicata nel Passo 4**: `handlePrivatePinSubmit` riceve una callback `onUnlocked?: () => void`. Il chiamante (es. `DialogsOverlay`, Passo 8) calcola il saldo da `useVisibleData()` e lo inietta nella callback. `AuthContext` non importa mai `use-visible-data`.

### R2 — Ordine fisso dei calcoli interni

I dieci valori hanno dipendenze in cascata. L'ordine nella tabella 3.3 deve essere rispettato rigidamente. Qualsiasi riorganizzazione del corpo dell'hook (es. per raggruppamento tematico) va verificata rispetto all'albero delle dipendenze:

```
safeAccounts, isPrivateUnlocked → visibleAccounts
safeTransactions, visibleAccounts → visibleTransactions
visibleAccounts, visibleTransactions → totalBalance
visibleTransactions → recentTransactions
visibleAccounts → groupedAccounts
groupedAccounts, visibleCategories → filteredGroupedAccounts
visibleCategories → allCategoriesVisible
safeBudgets, visibleTransactions, dismissedAlerts → budgetAlerts
safeAccounts → hasPrivateAccount, privateAccount (indipendenti dagli altri)
```

### R3 — `visibleCategories` potrebbe essere `null` durante il caricamento iniziale

In `App.tsx` il calcolo di `filteredGroupedAccounts` già protegge con `const safeVisibleCategories = visibleCategories || []`. Nell'hook va replicata la stessa guardia, non rimossa, perché `useKV` può restituire `null` prima che il valore sia caricato dallo storage.

Stessa guardia per `dismissedAlerts` in `budgetAlerts`: `const dismissedIds = dismissedAlerts || []`.

### R4 — `generateBudgetAlerts` usa solo budget attivi e non scaduti

La funzione `generateBudgetAlerts` in `src/lib/budget-alerts.ts` filtra internamente i budget con `attivo === true` e `dataFine >= oggi`. Non è necessario pre-filtrare `safeBudgets` prima di passarli: la funzione è già idempotente su input completo.

### R5 — `getTotalBalance` vs `calculateAccountBalance` in helpers

Per il calcolo del `totalBalance` l'hook usa `getTotalBalance(visibleAccounts, visibleTransactions)` da `src/lib/helpers.ts`, che internamente itera chiamando `calculateAccountBalance` per ogni conto. Non va reimplementato inline nell'hook: delegare sempre alla funzione di libreria per garantire coerenza con il resto dell'app.

### R6 — Il tipo `AccountGroup` non esiste ancora come tipo esportato

`ACCOUNT_CATEGORIES` in `src/lib/constants.ts` restituisce oggetti `{ id, label, icon? }`. Quando l'hook aggiunge il campo `accounts: Account[]`, il tipo risultante non è ancora dichiarato in `src/lib/types.ts`. Al momento dell'implementazione, valutare se:

- Aggiungere `AccountGroup` a `src/lib/types.ts` (preferibile per riuso nei componenti estratti), oppure
- Dichiararlo inline nel file dell'hook come tipo locale.

**Decisione adottata**: `AccountGroup` viene aggiunto a `src/lib/types.ts` come parte del Passo 5. Questo è l'unico file esistente modificato in questo passo, oltre alla creazione di `use-visible-data.ts`. Il tipo non viene dichiarato inline nell'hook perché sarà usato da almeno tre componenti futuri (`DashboardTab`, `ReportsTab`, componenti card) — tenerlo in `src/lib/types.ts` garantisce un singolo punto di importazione coerente con il resto dei tipi del progetto.
