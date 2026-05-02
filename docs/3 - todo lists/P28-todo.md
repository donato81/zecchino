# P28 — Todo List: Migrazione AppDataContext a Supabase

> Pacchetto 28 — Blocco 4 migrazione Spark→Supabase (dati di dominio)
> Piano di riferimento: `docs/2 - coding plans/P28-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P28-migrazione-appdatacontext-supabase.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-02
> Completato: 2026-05-02

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [x] |
| `npm run test:run` → tutti i test passed | [x] |
| `npx tsc --noEmit` → 0 errori TypeScript | [x] |
| `AppDataContext.tsx` espone la superficie pubblica P28 §4 completa | [x] |
| `AppDataContext.tsx` senza le 5 `useKV` di dominio | [x] |
| `visibleCategories`, `dismissedAlerts`, `budgetPercentages` rimangono `useKV` (Blocchi 5–6) | [x] |
| `App.tsx` con 4 gate nell'ordine corretto | [x] |
| `TransactionDialog.tsx` senza il campo `cifrato` nel payload | [x] |
| `grep useKV src/context/AppDataContext.tsx` → solo 3 voci attese | [x] |
| Nessun file `.github/**` modificato | [x] |

---

## Prima di iniziare

- [x] Leggere integralmente il coding plan `docs/2 - coding plans/P28-coding-plan.md`
- [x] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)
- [x] Verificare che `npm run build` sia exit 0 (baseline pre-P28)
- [x] Verificare che `npm run test:run` → tutti i test passed (baseline pre-P28)

---

## Prerequisiti operativi

> Non iniziare il Passo A finché questi prerequisiti non sono verificati.

- [x] **PR0** — Verificare `@supabase/supabase-js` in `package.json`:
  ```bash
  cat package.json | grep supabase
  ```
  > Esito PR0: verificato ✓

- [x] **PR1** — Verificare `.env.local` con `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`:
  > Esito PR1: verificato ✓

- [x] **PR2** — Verificare che i 5 repository P26 esistano ed espongano `getAll`:
  ```bash
  grep -rn "export" src/lib/supabase/repositories/conti.ts
  grep -rn "export" src/lib/supabase/repositories/transazioni.ts
  grep -rn "export" src/lib/supabase/repositories/categorie.ts
  grep -rn "export" src/lib/supabase/repositories/budget.ts
  grep -rn "export" src/lib/supabase/repositories/obiettivi-risparmio.ts
  ```
  > Esito PR2: verificato ✓

- [x] **PR3** — Verificare che `useAuth()` da P27 esponga `isAuthenticated`, `user`, `session`:
  ```bash
  grep -n "isAuthenticated\|user\|session" src/context/AuthContext.tsx | head -20
  ```
  > Esito PR3: verificato ✓

---

## Passo A — Refactoring `AppDataContext.tsx`

> Prerequisito: prerequisiti operativi PR0–PR3 verificati.
> File da modificare: `src/context/AppDataContext.tsx`

### A1 — Rimozioni

- [x] Rimuovere `const [accounts, setAccounts] = useKV<Account[]>('accounts', [])` e setter raw `setAccounts` da interfaccia
- [x] Rimuovere `const [transactions, setTransactions] = useKV<Transaction[]>('transactions', [])` e setter raw `setTransactions`
- [x] Rimuovere `const [categories, setCategories] = useKV<Category[]>('categories', [])` e setter raw `setCategories`
- [x] Rimuovere `const [budgets, setBudgets] = useKV<Budget[]>('budgets', [])` e setter raw `setBudgets`
- [x] Rimuovere `const [savingsGoals, setSavingsGoals] = useKV<SavingsGoal[]>('savings-goals', [])` e setter raw `setSavingsGoals`
- [x] Rimuovere import di `DEFAULT_CATEGORIES` da `constants`
- [x] Rimuovere `useEffect` di bootstrap con `DEFAULT_CATEGORIES` (rilevamento `safeCategories.length === 0`)
- [x] Rimuovere la firma `ReturnType<typeof useKV<T>>[1]` dal tipo `AppDataContextValue`
- [x] Verificare che `import { useKV } from '@github/spark/hooks'` rimanga (usato da `visibleCategories`, `dismissedAlerts`, `budgetPercentages`)

### A2 — Nuovi import repository P26

- [x] Aggiungere import dei 5 repository P26 con alias semantici (`getAllConti`, `createConto`, `updateConto`, `removeConto`, ecc.)
- [x] Aggiungere import di `updateProgress` da `obiettivi-risparmio`
- [x] Aggiungere `import { useAuth } from '@/context/AuthContext'`

### A3 — Nuova interfaccia e stati

- [x] Aggiungere a `AppDataContextValue`: `isLoading: boolean`, `error: string | null`, `isDataReady: boolean`
- [x] Aggiungere a `AppDataContextValue`: 15 azioni `add*/update*/remove*` per le 5 entità
- [x] Aggiungere a `AppDataContextValue`: `updateSavingsGoalProgress(id, importoCorrente): Promise<void>`
- [x] Aggiungere a `AppDataContextValue`: `refreshAll(): void`
- [x] Rimuovere da `AppDataContextValue`: setter raw `setAccounts`, `setTransactions`, `setCategories`, `setBudgets`, `setSavingsGoals`
- [x] Aggiungere `useState`: `isLoading = false`, `error = null`, `isDataReady = false`
- [x] Aggiungere `const { isAuthenticated } = useAuth()`

### A4 — Bootstrap `loadAll()` (Decisione A — parallelo)

- [x] Creare `useEffect` con dipendenza `[isAuthenticated]`
- [x] Branch `isAuthenticated = false`: reset tutti gli array a `[]`, `isLoading = false`, `error = null`, `isDataReady = false`
- [x] Branch `isAuthenticated = true`: impostare `isLoading = true`, `error = null`
- [x] Implementare flag stale: `let cancelled = false` nel `useEffect` con `return () => { cancelled = true }` nel cleanup
- [x] Lanciare `Promise.all([ getAllConti(), getAllTransazioni(), getAllCategorie(), getAllBudget(), getAllObiettivi() ])`
- [x] Se successo e `!cancelled`: popolare i 5 array, `isLoading = false`, `isDataReady = true`
- [x] Se errore (catch) e `!cancelled`: `error = messaggio descrittivo`, `isLoading = false`

### A5 — `refreshAll()`

- [x] Implementare `refreshAll()`: guardia idempotente `if (isLoading) return`
- [x] Se non in corso: avvia nuovo ciclo parallelo senza resettare `isDataReady` (i dati precedenti rimangono visibili)

### A6 — Setter `add*`, `update*`, `remove*` — Conti

- [x] Implementare `addAccount(data)`: `createConto(data)` → aggiunge record restituito a `accounts`
- [x] Implementare `updateAccount(id, data)`: `updateConto(id, data)` → sostituisce in `accounts`
- [x] Implementare `removeAccount(id)`: `removeConto(id)` → rimuove da `accounts` + filtra `transactions` (contoId / contoDestinazioneId = id) atomicamente

### A7 — Setter `add*`, `update*`, `remove*` — Transazioni

- [x] Implementare `addTransaction(data)`: `createTransazione(data)` **senza `cifrato`** → aggiunge il record restituito (con `cifrato` calcolato dal trigger) a `transactions`
- [x] Implementare `updateTransaction(id, data)`: `updateTransazione(id, data)` **senza `cifrato`** → sostituisce in `transactions`
- [x] Implementare `removeTransaction(id)`: `removeTransazione(id)` → rimuove da `transactions`

### A8 — Setter `add*`, `update*`, `remove*` — Categorie

- [x] Implementare `addCategory(data)`: `createCategoria(data)` → aggiunge a `categories`
- [x] Implementare `updateCategory(id, data)`: `updateCategoria(id, data)` → sostituisce in `categories`
- [x] Implementare `removeCategory(id)`: `removeCategoria(id)` → caso speciale FK: intercettare errore `23503`, impostare `error` con messaggio «Impossibile eliminare la categoria: è usata da movimenti esistenti. Riassegna prima i movimenti a un'altra categoria.», nessuna modifica locale

### A9 — Setter `add*`, `update*`, `remove*` — Budget e Obiettivi

- [x] Implementare `addBudget(data)`: `createBudgetItem(data)` → aggiunge a `budgets`
- [x] Implementare `updateBudget(id, data)`: `updateBudgetItem(id, data)` → sostituisce in `budgets`
- [x] Implementare `removeBudget(id)`: `removeBudgetItem(id)` → rimuove da `budgets`
- [x] Implementare `addSavingsGoal(data)`: `createObiettivo(data)` → aggiunge a `savingsGoals`
- [x] Implementare `updateSavingsGoal(id, data)`: `updateObiettivo(id, data)` → sostituisce (metadati)
- [x] Implementare `updateSavingsGoalProgress(id, importoCorrente)`: `updateObiettivoProgress(id, importoCorrente)` → sostituisce il record aggiornato (inclusi `completato`, `dataCompletamento`)
- [x] Implementare `removeSavingsGoal(id)`: `removeObiettivo(id)` → rimuove da `savingsGoals`

### A10 — Gate intermedio A

- [x] `npm run build` exit 0
- [x] `npm run test:run` → tutti i test passed (stessa baseline pre-P28)
- [x] `npx tsc --noEmit` → 0 errori TypeScript

---

## Passo B — `App.tsx`: gate `!isDataReady`

> Prerequisito: Passo A completato.
> File da modificare: `src/App.tsx`

### B1 — Aggiunta gate

- [x] Aggiungere `isDataReady` alla destrutturazione di `useAppData()`
- [x] Aggiungere gate `if (!isDataReady) return <LoadingSpinner />` dopo il gate `needsOnboarding` e prima della dashboard
- [x] Verificare ordine dei 4 gate: `!isAuthReady` → `!isAuthenticated` → `needsOnboarding` → `!isDataReady`

### B2 — Gate intermedio B

- [x] `npm run build` exit 0
- [x] `npm run test:run` → tutti i test passed (stessa baseline pre-P28)

---

## Passo C — `TransactionDialog.tsx`: rimozione campo `cifrato`

> Prerequisito: Passo B completato.
> File da modificare: `src/components/TransactionDialog.tsx`

### C1 — Rimozione dal payload

- [x] Identificare la riga con `cifrato: isPrivateTransaction` (o formula analoga) nel payload di `addTransaction(...)`
- [x] Rimuovere `cifrato` dal payload di `addTransaction(...)` nel handler di submit
- [x] Rimuovere `cifrato` dal payload di `updateTransaction(...)` nel handler di submit, se presente
- [x] Verificare che `cifrato` non sia costruito come dato di input in nessun altro punto del file
- [x] Verificare che la lettura di `cifrato` dai dati esistenti (pre-popolamento form edit) non sia rimossa — solo l'invio nel payload va eliminato

### C2 — Gate intermedio C

- [x] `npm run build` exit 0
- [x] `npm run test:run` → tutti i test passed (stessa baseline pre-P28)
- [x] `npx tsc --noEmit` → 0 errori TypeScript

---

## Gate finale D (= gate P28)

- [x] `npm run build` exit 0
- [x] `npm run test:run` → tutti i test passed (stessa baseline pre-P28)
- [x] `npx tsc --noEmit` → 0 errori TypeScript
- [x] `grep useKV src/context/AppDataContext.tsx` → solo 3 occorrenze attese: `visibleCategories`, `dismissedAlerts`, `budgetPercentages`
- [x] Verifica a vista: `useAppData()` espone tutti gli elementi della superficie pubblica P28 §4 (5 array, 3 flag, 15 azioni + `updateSavingsGoalProgress` + `refreshAll()`)
- [x] Verifica a vista: `App.tsx` ha i 4 gate nell'ordine corretto
- [x] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## Blocchi noti

> _Nessun blocco noto al momento dell'apertura del task._

---

## Note operative

- Il flag stale per le promise in volo al logout (A4): implementare con `let cancelled = false` e `return () => { cancelled = true }` nel cleanup del `useEffect` — non richiede `AbortController`.
- Il caso FK in `removeCategory` (A8): verificare la struttura di `RepositoryError` da P26 per accedere al codice di errore `23503` (foreign_key_violation) prima di implementare l'intercettazione specifica.
- Se `TransactionDialog.tsx` usa `cifrato` anche nella logica di visibilità del form (es. per identificare transazioni private in edit mode), mantenere la lettura del campo dai dati del DB — rimuovere solo il campo dal payload di invio.
