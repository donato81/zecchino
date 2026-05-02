# P28 — Coding Plan: Migrazione AppDataContext a Supabase

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: 28 — Blocco 4 migrazione Spark→Supabase (dati di dominio)
> Design di riferimento: `docs/1 - projects/P28-migrazione-appdatacontext-supabase.md`
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-02

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P27.
- ⚠️ **Perimetro dei file modificati:** `src/context/AppDataContext.tsx`, `src/App.tsx`, `src/components/TransactionDialog.tsx`. Nessun altro file sorgente esistente viene modificato.
- ⚠️ **File protetti SCF:** i file sotto `.github/instructions/`, `.github/agents/`, `.github/copilot-instructions.md`, `.github/AGENTS.md`, `.github/runtime/`, `.github/skills/`, `.github/prompts/`, `.github/changelogs/` non devono essere toccati in nessun caso.
- ⚠️ **Nessuna modifica a `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`** — salvo aggiornamenti imposti da nuovi import (documentare se accade).
- ⚠️ **`visibleCategories`, `dismissedAlerts`, `budgetPercentages` rimangono in `useKV`:** queste tre voci sopravvivono come `useKV` in `AppDataContext` dopo P28. La loro migrazione è compito dei Blocchi 5 e 6 rispettivamente. Non rimuovere né modificare queste chiamate in P28. L'import di `useKV` da `@github/spark/hooks` sopravvive quindi fino al Blocco 5/6.
- ⚠️ **`DEFAULT_CATEGORIES` in `constants.ts`:** l'import di `DEFAULT_CATEGORIES` e il relativo `useEffect` di bootstrap vengono rimossi da `AppDataContext.tsx`. La costante sopravvive fisicamente in `constants.ts` con un commento che indica il seeding server-side (Blocco 9). Il destino fisico finale (rimozione vs. mantenimento) viene deciso nel design del Blocco 9.
- ⚠️ **`CategoryManagement.tsx` invariato in P28:** la risoluzione del split-brain R2 (doppio `useKV('categories', [])`) è compito di P33 — non modificare `CategoryManagement.tsx` in questo pacchetto.
- ⚠️ **Dipendenza da AuthContext P27:** `AppDataProvider` usa `useAuth()` (P27) per leggere `user`, `session` e `isAuthenticated`. Il provider non avvia nessuna chiamata ai repository finché `isAuthenticated = false`. Prerequisito: P27 completato e tutti i gate P27 verificati.
- ⚠️ **Dipendenza dai Repository P26:** i 5 repository usati sono `src/lib/supabase/repositories/conti.ts`, `transazioni.ts`, `categorie.ts`, `budget.ts`, `obiettivi-risparmio.ts`. Per ogni repository è disponibile `getAll()`, `create(data)`, `update(id, data)`, `remove(id)`. Il repository `obiettivi-risparmio` espone anche `updateProgress(id, importoCorrente)` (P26 §7.5).

---

## File creati

| File | Descrizione |
|---|---|
| `docs/2 - coding plans/P28-coding-plan.md` | Questo documento |
| `docs/3 - todo lists/P28-todo.md` | Todo specifico P28 |

## File modificati

| File | Descrizione |
|---|---|
| `src/context/AppDataContext.tsx` | Migrazione completa delle 5 entità di dominio da Spark KV a repository Supabase P26; aggiunta superficie pubblica P28 §4 (Passo A) |
| `src/App.tsx` | Aggiunta gate `!isDataReady` con `<LoadingSpinner />` dopo il gate `needsOnboarding` (Passo B) |
| `src/components/TransactionDialog.tsx` | Rimozione del campo `cifrato` dal payload di creazione e modifica transazione (Passo C) |
| `docs/todo.md` | Aggiunta P28 nella tabella attivi |

## File invariati

| File / Area | Motivazione |
|---|---|
| `src/context/VisibleDataContext.tsx` | Thin wrapper invariato — nessuna dipendenza da `useKV` diretta (P28 §10) |
| `src/hooks/use-visible-data.ts` | Legge da `useAppData()` e `useAuth()` — interfaccia invariata |
| `src/lib/constants.ts` | `DEFAULT_CATEGORIES` sopravvive fisicamente; l'import è rimosso da `AppDataContext.tsx`, non da `constants.ts` |
| `src/components/CategoryManagement.tsx` | Split-brain R2 risolto in P33 — fuori dal perimetro P28 |
| `src/hooks/use-inactivity-timer.ts` | Creato in P27 — nessuna modifica necessaria |
| `src/lib/supabase/**` | Creato in P26 — nessuna modifica necessaria |
| `src/context/AuthContext.tsx` | Migrato in P27 — usato come dipendenza, non modificato |
| `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js` | Invariati (salvo aggiornamento automatico tipi — documentare se accade) |
| `.env.local` | Non committato; prerequisito, non output |
| `.github/**` | Protetto da `framework-guard.instructions.md` |

---

## Decisioni vincolanti (da P28 — non rimesse in discussione)

| ID | Decisione | Effetto pratico |
|---|---|---|
| **A** | **Caricamento parallelo** (Opzione 1 scelta) | Al login vengono lanciate simultaneamente tutte e 5 le chiamate `getAll()` tramite `Promise.all`. Il provider aspetta il completamento di tutte prima di dichiarare `isDataReady = true`. Motivo determinante: velocità totale superiore al sequenziale e eliminazione delle race condition tra entità correlate (`transactions` dipende da `accounts` e `categories`; `budgets` dipende da `categories`). |
| **B** | **Spinner globale unico** (Opzione 1 scelta) | Un solo flag `isLoading` diventa `true` durante il caricamento iniziale e durante `refreshAll()`. La dashboard non viene mostrata durante il caricamento: `App.tsx` mostra `<LoadingSpinner />` fino a `isDataReady = true`. Solo il primo caricamento blocca la UI; i refresh successivi non resettano `isDataReady`, quindi i dati precedenti rimangono visibili durante il refresh. |
| **C** | **Blocco totale su qualsiasi errore** (Opzione 1 scelta) | Se almeno una delle 5 chiamate `getAll()` fallisce, `error` viene impostato con un messaggio descrittivo e `isLoading = false`. La dashboard non viene mostrata. L'interfaccia mostra un messaggio di errore con pulsante "Riprova". Il pulsante chiama `refreshAll()`, che rilancia tutte e 5 le chiamate in parallelo, coerente con Decisione A. |

---

## Schema riepilogativo delle operazioni

```
P28 — Migrazione AppDataContext a Supabase
│
├── Prerequisiti
│   ├── PR0: @supabase/supabase-js in package.json (P26)
│   │   └── cat package.json | grep supabase
│   ├── PR1: .env.local con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
│   ├── PR2: src/lib/supabase/repositories/ disponibili (P26)
│   │   └── 5 repository: conti, transazioni, categorie, budget, obiettivi-risparmio
│   └── PR3: AuthContext P27 — useAuth() espone user, session, isAuthenticated
│       └── grep -n "isAuthenticated" src/context/AuthContext.tsx
│
├── Passo A — Refactoring AppDataContext.tsx
│   ├── A1: Rimozioni (5 useKV dominio, DEFAULT_CATEGORIES import e useEffect)
│   ├── A2: Import dei 5 repository P26 + useAuth P27
│   ├── A3: Nuovi stati e interfaccia (isLoading, error, isDataReady)
│   ├── A4: Bootstrap loadAll() — Promise.all sulle 5 getAll()
│   │   ├── Precondizione: isAuthenticated = true (useEffect [isAuthenticated])
│   │   ├── isLoading = true → Promise.all → popola 5 array
│   │   ├── Successo: isLoading = false, isDataReady = true
│   │   └── Errore: error = messaggio, isLoading = false
│   ├── A5: Setter add*/update*/remove* (15 azioni + updateSavingsGoalProgress)
│   │   ├── Principio: conferma-prima-di-aggiornare
│   │   └── Caso speciale: removeCategory → intercetta errore FK 23503
│   ├── A6: refreshAll() (idempotente) + cleanup al logout
│   └── Gate A: build exit 0; test passed; tsc 0 errori
│
├── Passo B — App.tsx: gate !isDataReady
│   ├── Aggiungere isDataReady alla destrutturazione di useAppData()
│   ├── Aggiungere gate: if (!isDataReady) return <LoadingSpinner />
│   └── Gate B: build exit 0; test passed
│
├── Passo C — TransactionDialog.tsx: rimozione cifrato dal payload
│   ├── Rimuovere cifrato: isPrivateTransaction dal payload create
│   ├── Rimuovere cifrato dal payload update
│   └── Gate C: build exit 0; test passed; tsc 0 errori
│
└── Gate finale D (= gate P28)
    ├── build exit 0; test passed; tsc 0 errori
    ├── grep useKV src/context/AppDataContext.tsx → solo 3 voci attese
    ├── useAppData() espone superficie pubblica P28 §4 completa
    └── git diff --name-only HEAD | grep ".github" → output vuoto
```

---

## Piano operativo dettagliato

### Prerequisiti — Prima di scrivere codice

#### PR0 — Conferma `@supabase/supabase-js` in `package.json`

P26 ha già installato `@supabase/supabase-js`. Verificare prima di procedere:

```bash
cat package.json | grep supabase
```

Atteso: una riga con `"@supabase/supabase-js": "..."` sotto `"dependencies"`.  
Se mancante, eseguire `npm install @supabase/supabase-js` (ripristino prerequisito P26).

#### PR1 — Variabili `.env.local`

Verificare la presenza di `.env.local` nella root con:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Già verificato in P26 e P27 — riconfermarlo prima di qualsiasi test runtime.  
**Non committare `.env.local`** — già in `.gitignore`.

#### PR2 — Repository P26 disponibili

Verificare che i 5 repository P26 esistano ed espongano almeno `getAll`:

```bash
grep -rn "export" src/lib/supabase/repositories/conti.ts
grep -rn "export" src/lib/supabase/repositories/transazioni.ts
grep -rn "export" src/lib/supabase/repositories/categorie.ts
grep -rn "export" src/lib/supabase/repositories/budget.ts
grep -rn "export" src/lib/supabase/repositories/obiettivi-risparmio.ts
```

Atteso per ciascuno: export `getAll`, `create`, `update`, `remove`. Per `obiettivi-risparmio`: anche `updateProgress`.

#### PR3 — AuthContext P27 disponibile

Verificare che `useAuth()` da P27 esponga `isAuthenticated`, `user` e `session`:

```bash
grep -n "isAuthenticated\|user\|session" src/context/AuthContext.tsx | head -20
```

---

### Passo A — Refactoring `AppDataContext.tsx`

**File modificato:** `src/context/AppDataContext.tsx`

**Obiettivo:** sostituire le 5 chiamate `useKV` di dominio con chiamate ai repository Supabase P26; aggiungere `isLoading`, `error`, `isDataReady`; implementare i setter `add*`/`update*`/`remove*`; mantenere `visibleCategories`, `dismissedAlerts`, `budgetPercentages` come `useKV` invariati fino ai Blocchi 5 e 6.

#### A1 — Rimozioni

Rimuovere le 5 chiamate `useKV` di dominio e i rispettivi setter raw dall'interfaccia pubblica:

- `const [accounts, setAccounts] = useKV<Account[]>('accounts', [])`
- `const [transactions, setTransactions] = useKV<Transaction[]>('transactions', [])`
- `const [categories, setCategories] = useKV<Category[]>('categories', [])`
- `const [budgets, setBudgets] = useKV<Budget[]>('budgets', [])`
- `const [savingsGoals, setSavingsGoals] = useKV<SavingsGoal[]>('savings-goals', [])`

Rimuovere i setter raw (`setAccounts`, `setTransactions`, `setCategories`, `setBudgets`, `setSavingsGoals`) dalla definizione di `AppDataContextValue`.

Rimuovere la firma `ReturnType<typeof useKV<T>>[1]` dal tipo `AppDataContextValue`.

Rimuovere:

- `import { DEFAULT_CATEGORIES } from '@/lib/constants'` (o percorso equivalente).
- Il `useEffect` di bootstrap con `DEFAULT_CATEGORIES` (che verificava `safeCategories.length === 0` e inizializzava le categorie).

> **Nota:** `import { useKV } from '@github/spark/hooks'` **non va rimosso** in P28 — sopravvive per `visibleCategories`, `dismissedAlerts` e `budgetPercentages` che rimangono come `useKV` fino ai Blocchi 5 e 6.

#### A2 — Nuovi import

Aggiungere import dei 5 repository P26 con alias semantici, per esempio:

```ts
import {
  getAll as getAllConti, create as createConto,
  update as updateConto, remove as removeConto,
} from '@/lib/supabase/repositories/conti'
import {
  getAll as getAllTransazioni, create as createTransazione,
  update as updateTransazione, remove as removeTransazione,
} from '@/lib/supabase/repositories/transazioni'
import {
  getAll as getAllCategorie, create as createCategoria,
  update as updateCategoria, remove as removeCategoria,
} from '@/lib/supabase/repositories/categorie'
import {
  getAll as getAllBudget, create as createBudgetItem,
  update as updateBudgetItem, remove as removeBudgetItem,
} from '@/lib/supabase/repositories/budget'
import {
  getAll as getAllObiettivi, create as createObiettivo,
  update as updateObiettivo, remove as removeObiettivo,
  updateProgress as updateObiettivoProgress,
} from '@/lib/supabase/repositories/obiettivi-risparmio'
import { useAuth } from '@/context/AuthContext'
```

#### A3 — Nuova interfaccia `AppDataContextValue` e stati

Aggiungere alla definizione di `AppDataContextValue`:

- `isLoading: boolean`
- `error: string | null`
- `isDataReady: boolean`
- `addAccount(data: Omit<Account, 'id'>): Promise<void>`
- `updateAccount(id: string, data: Partial<Account>): Promise<void>`
- `removeAccount(id: string): Promise<void>`
- `addTransaction(data: Omit<Transaction, 'id' | 'cifrato'>): Promise<void>`
- `updateTransaction(id: string, data: Partial<Omit<Transaction, 'cifrato'>>): Promise<void>`
- `removeTransaction(id: string): Promise<void>`
- `addCategory(data: Omit<Category, 'id'>): Promise<void>`
- `updateCategory(id: string, data: Partial<Category>): Promise<void>`
- `removeCategory(id: string): Promise<void>`
- `addBudget(data: Omit<Budget, 'id'>): Promise<void>`
- `updateBudget(id: string, data: Partial<Budget>): Promise<void>`
- `removeBudget(id: string): Promise<void>`
- `addSavingsGoal(data: Omit<SavingsGoal, 'id'>): Promise<void>`
- `updateSavingsGoal(id: string, data: Partial<SavingsGoal>): Promise<void>`
- `updateSavingsGoalProgress(id: string, importoCorrente: number): Promise<void>`
- `removeSavingsGoal(id: string): Promise<void>`
- `refreshAll(): void`

Aggiungere stati interni:

```ts
const [accounts, setAccounts] = useState<Account[]>([])
const [transactions, setTransactions] = useState<Transaction[]>([])
const [categories, setCategories] = useState<Category[]>([])
const [budgets, setBudgets] = useState<Budget[]>([])
const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [isDataReady, setIsDataReady] = useState(false)
```

Aggiungere la precondizione da `useAuth()`:

```ts
const { isAuthenticated } = useAuth()
```

#### A4 — Bootstrap `loadAll()` (Decisione A — parallelo, Decisione B — spinner, Decisione C — blocco totale)

Implementare il caricamento iniziale con `useEffect` con dipendenza `[isAuthenticated]`:

- **Branch `isAuthenticated = false`:** resettare tutti gli array a `[]`, `isLoading = false`, `error = null`, `isDataReady = false`. Questo gestisce il cleanup al logout.
- **Branch `isAuthenticated = true`:** avviare il caricamento parallelo.

**Logica di caricamento:**

1. Impostare `isLoading = true`, `error = null`.
2. Inizializzare flag stale: `let cancelled = false` (gestisce il logout durante il caricamento in volo — P28 §8 punto 6).
3. Lanciare `Promise.all([ getAllConti(), getAllTransazioni(), getAllCategorie(), getAllBudget(), getAllObiettivi() ])`.
4. Se tutte e 5 hanno successo e `!cancelled`: popolare i 5 array con i risultati, `isLoading = false`, `isDataReady = true`.
5. Se almeno una fallisce (catch `RepositoryError`) e `!cancelled`: `error = "Impossibile caricare i dati. Controlla la connessione e riprova."`, `isLoading = false`.
6. Cleanup del `useEffect`: `return () => { cancelled = true }`.

**`refreshAll()`:** guardia idempotente `if (isLoading) return`. Se non in corso, esegue gli stessi step 1–5. Non resetta `isDataReady`: i dati precedenti rimangono visibili durante il refresh.

#### A5 — Setter `add*`, `update*`, `remove*`

**Principio trasversale (P28 §9):** conferma-prima-di-aggiornare. Lo stato locale viene modificato solo dopo che il repository ha confermato il successo. Gli errori vengono propagati tramite rilancio del `RepositoryError`.

**Conti:**

- `addAccount(data)`: chiama `createConto(data)` → aggiunge il record restituito a `accounts`.
- `updateAccount(id, data)`: chiama `updateConto(id, data)` → sostituisce il record in `accounts`.
- `removeAccount(id)`: chiama `removeConto(id)` → rimuove il conto da `accounts` e filtra `transactions` rimuovendo le transazioni con `contoId = id` o `contoDestinazioneId = id`. Il doppio effetto deve essere applicato atomicamente per evitare flash di transazioni orfane.

**Transazioni:**

- `addTransaction(data)`: chiama `createTransazione(data)` **senza il campo `cifrato`** (P28 §9.2, P25 §4.3). Il trigger `trg_sync_cifrato` lato DB calcola `cifrato` prima che il record sia restituito. Aggiunge il record restituito (con `cifrato` calcolato) a `transactions`.
- `updateTransaction(id, data)`: chiama `updateTransazione(id, data)` **senza il campo `cifrato`** → sostituisce in `transactions`.
- `removeTransaction(id)`: chiama `removeTransazione(id)` → rimuove da `transactions`.

**Categorie:**

- `addCategory(data)`: chiama `createCategoria(data)` → aggiunge a `categories`.
- `updateCategory(id, data)`: chiama `updateCategoria(id, data)` → sostituisce in `categories`.
- `removeCategory(id)`: chiama `removeCategoria(id)`. **Caso speciale FK (P28 §9.3):** se il DB restituisce un errore di vincolo referenziale (categoria usata da transazioni — codice PostgreSQL `23503`), il context intercetta e imposta `error` con il messaggio: `"Impossibile eliminare la categoria: è usata da movimenti esistenti. Riassegna prima i movimenti a un'altra categoria."` Nessuna modifica locale. Questo caso è distinto dall'errore RLS su template.

**Budget:**

- `addBudget(data)`: chiama `createBudgetItem(data)` → aggiunge a `budgets`.
- `updateBudget(id, data)`: chiama `updateBudgetItem(id, data)` → sostituisce in `budgets`.
- `removeBudget(id)`: chiama `removeBudgetItem(id)` → rimuove da `budgets`.

**Obiettivi di risparmio:**

- `addSavingsGoal(data)`: chiama `createObiettivo(data)` → aggiunge a `savingsGoals`.
- `updateSavingsGoal(id, data)`: chiama `updateObiettivo(id, data)` → sostituisce in `savingsGoals`. Per aggiornamenti di metadati (nome, importoTarget, date, contoAssociato, ecc.).
- `updateSavingsGoalProgress(id, importoCorrente)`: chiama `updateObiettivoProgress(id, importoCorrente)` (P26 §7.5). Il DB aggiorna atomicamente `importoCorrente`, `completato`, `dataCompletamento`. Sostituisce il record aggiornato in `savingsGoals`. Usare questa azione per aggiornamenti di progresso — **non** `updateSavingsGoal`.
- `removeSavingsGoal(id)`: chiama `removeObiettivo(id)` → rimuove da `savingsGoals`.

#### A6 — Gate intermedio A

- `npm run build` exit 0
- `npm run test:run` → tutti i test passed (stessa baseline pre-P28)
- `npx tsc --noEmit` → 0 errori TypeScript sui consumer di `useAppData()`

---

### Passo B — `App.tsx`: gate `!isDataReady`

**File modificato:** `src/App.tsx`

**Obiettivo:** aggiungere il gate di caricamento dati dopo i gate P27, in modo che la dashboard non sia mai accessibile prima che `AppDataContext` abbia terminato il caricamento iniziale.

**Modifiche:**

- Aggiungere `isDataReady` (e opzionalmente `error`, `refreshAll`) alla destrutturazione di `useAppData()`.
- Aggiungere gate: `if (!isDataReady) return <LoadingSpinner />` dopo il gate `needsOnboarding` e prima della dashboard.

**Ordine dei gate dopo P28:**

1. `if (!isAuthReady) return <LoadingSpinner />` — gate P27
2. `if (!isAuthenticated) return <AuthScreen />` — gate P27
3. `if (needsOnboarding) return <OnboardingFlow />` — gate P27
4. `if (!isDataReady) return <LoadingSpinner />` — gate P28 (nuovo)
5. `return <Dashboard ... />` — dashboard

> **Nota:** `LoadingSpinner` è già disponibile da P27 (`src/components/LoadingSpinner.tsx`). Nessun nuovo componente va creato per questo gate.

#### Gate intermedio B

- `npm run build` exit 0
- `npm run test:run` → tutti i test passed (stessa baseline pre-P28)

---

### Passo C — `TransactionDialog.tsx`: rimozione campo `cifrato`

**File modificato:** `src/components/TransactionDialog.tsx`

**Obiettivo:** rimuovere il campo `cifrato: isPrivateTransaction` dal payload passato alle chiamate di creazione e modifica transazione (P28 §9.2, P25 §4.3, P26 §7.2). Il trigger `trg_sync_cifrato` lato DB calcola il valore automaticamente in base al conto associato.

**Modifiche:**

- Identificare la riga (circa riga 185) dove il payload include `cifrato: isPrivateTransaction` (o formula analoga) nella chiamata `addTransaction(...)`.
- Rimuovere il campo `cifrato` dal payload di `addTransaction(...)`.
- Identificare e rimuovere `cifrato` dal payload di `updateTransaction(...)`, se presente.
- Verificare che nessun altro punto del file costruisca un payload transaction con il campo `cifrato` come dato di input.

> **Nota:** la lettura del campo `cifrato` dai dati esistenti (per la pre-popolazione del form in edit mode) è separata dall'invio — il campo può essere letto per visualizzazione ma non deve essere re-inviato nel payload.

#### Gate intermedio C

- `npm run build` exit 0
- `npm run test:run` → tutti i test passed (stessa baseline pre-P28)
- `npx tsc --noEmit` → 0 errori TypeScript

---

### Gate finale D (= gate P28)

Tutti i passi A, B, C devono essere completati prima di verificare questo gate.

- `npm run build` exit 0
- `npm run test:run` → tutti i test passed (stessa baseline pre-P28)
- `npx tsc --noEmit` → 0 errori TypeScript
- `grep useKV src/context/AppDataContext.tsx` → solo 3 voci attese: `visibleCategories`, `dismissedAlerts`, `budgetPercentages`
- `useAppData()` espone tutti gli elementi della superficie pubblica P28 §4: 5 array di dominio, `isLoading`, `error`, `isDataReady`, 15 azioni `add*/update*/remove*` + `updateSavingsGoalProgress` + `refreshAll()`
- Verifica a vista: `App.tsx` ha i 4 gate nell'ordine corretto: `!isAuthReady` → `!isAuthenticated` → `needsOnboarding` → `!isDataReady`
- `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## Blocchi noti

> _Nessun blocco noto al momento dell'apertura del task._

---

## Note operative

- Il flag stale per le promise in volo al logout (A4) può essere implementato con `let cancelled = false` e `return () => { cancelled = true }` nel cleanup del `useEffect` — non richiede `AbortController`.
- Il caso FK in `removeCategory` (A5): l'errore di Supabase per violazione di chiave referenziale ha codice PostgreSQL `23503`. Verificare la struttura di `RepositoryError` da P26 per accedere al codice di errore prima di implementare l'intercettazione specifica.
- Se `TransactionDialog.tsx` usa `cifrato` anche nella logica di visibilità del form (es. per indicare se la transazione era in conto privato), verificare e mantenere la lettura del campo dai dati del DB come display — rimuovere solo l'invio nel payload.
- Se durante il Passo A l'import circolare tra `AppDataContext` e `AuthContext` causa errori, verificare che `useAuth()` sia importato tramite il path alias e non tramite import relativo diretto.
