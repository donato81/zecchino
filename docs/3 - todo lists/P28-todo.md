# P28 — Todo List: Migrazione AppDataContext a Supabase

> Pacchetto 28 — Blocco 4 migrazione Spark→Supabase (dati di dominio)
> Piano di riferimento: `docs/2 - coding plans/P28-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P28-migrazione-appdatacontext-supabase.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-02

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [ ] |
| `npm run test:run` → tutti i test passed | [ ] |
| `npx tsc --noEmit` → 0 errori TypeScript | [ ] |
| `AppDataContext.tsx` espone la superficie pubblica P28 §4 completa | [ ] |
| `AppDataContext.tsx` senza le 5 `useKV` di dominio | [ ] |
| `visibleCategories`, `dismissedAlerts`, `budgetPercentages` rimangono `useKV` (Blocchi 5–6) | [ ] |
| `App.tsx` con 4 gate nell'ordine corretto | [ ] |
| `TransactionDialog.tsx` senza il campo `cifrato` nel payload | [ ] |
| `grep useKV src/context/AppDataContext.tsx` → solo 3 voci attese | [ ] |
| Nessun file `.github/**` modificato | [ ] |

---

## Prima di iniziare

- [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P28-coding-plan.md`
- [ ] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)
- [ ] Verificare che `npm run build` sia exit 0 (baseline pre-P28)
- [ ] Verificare che `npm run test:run` → tutti i test passed (baseline pre-P28)

---

## Prerequisiti operativi

> Non iniziare il Passo A finché questi prerequisiti non sono verificati.

- [ ] **PR0** — Verificare `@supabase/supabase-js` in `package.json`:
  ```bash
  cat package.json | grep supabase
  ```
  > Esito PR0: ___________

- [ ] **PR1** — Verificare `.env.local` con `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`:
  > Esito PR1: ___________

- [ ] **PR2** — Verificare che i 5 repository P26 esistano ed espongano `getAll`:
  ```bash
  grep -rn "export" src/lib/supabase/repositories/conti.ts
  grep -rn "export" src/lib/supabase/repositories/transazioni.ts
  grep -rn "export" src/lib/supabase/repositories/categorie.ts
  grep -rn "export" src/lib/supabase/repositories/budget.ts
  grep -rn "export" src/lib/supabase/repositories/obiettivi-risparmio.ts
  ```
  > Esito PR2: ___________

- [ ] **PR3** — Verificare che `useAuth()` da P27 esponga `isAuthenticated`, `user`, `session`:
  ```bash
  grep -n "isAuthenticated\|user\|session" src/context/AuthContext.tsx | head -20
  ```
  > Esito PR3: ___________

---

## Passo A — Refactoring `AppDataContext.tsx`

> Prerequisito: prerequisiti operativi PR0–PR3 verificati.
> File da modificare: `src/context/AppDataContext.tsx`

### A1 — Rimozioni

- [ ] Rimuovere `const [accounts, setAccounts] = useKV<Account[]>('accounts', [])` e setter raw `setAccounts` da interfaccia
- [ ] Rimuovere `const [transactions, setTransactions] = useKV<Transaction[]>('transactions', [])` e setter raw `setTransactions`
- [ ] Rimuovere `const [categories, setCategories] = useKV<Category[]>('categories', [])` e setter raw `setCategories`
- [ ] Rimuovere `const [budgets, setBudgets] = useKV<Budget[]>('budgets', [])` e setter raw `setBudgets`
- [ ] Rimuovere `const [savingsGoals, setSavingsGoals] = useKV<SavingsGoal[]>('savings-goals', [])` e setter raw `setSavingsGoals`
- [ ] Rimuovere import di `DEFAULT_CATEGORIES` da `constants`
- [ ] Rimuovere `useEffect` di bootstrap con `DEFAULT_CATEGORIES` (rilevamento `safeCategories.length === 0`)
- [ ] Rimuovere la firma `ReturnType<typeof useKV<T>>[1]` dal tipo `AppDataContextValue`
- [ ] Verificare che `import { useKV } from '@github/spark/hooks'` rimanga (usato da `visibleCategories`, `dismissedAlerts`, `budgetPercentages`)

### A2 — Nuovi import repository P26

- [ ] Aggiungere import dei 5 repository P26 con alias semantici (`getAllConti`, `createConto`, `updateConto`, `removeConto`, ecc.)
- [ ] Aggiungere import di `updateProgress` da `obiettivi-risparmio`
- [ ] Aggiungere `import { useAuth } from '@/context/AuthContext'`

### A3 — Nuova interfaccia e stati

- [ ] Aggiungere a `AppDataContextValue`: `isLoading: boolean`, `error: string | null`, `isDataReady: boolean`
- [ ] Aggiungere a `AppDataContextValue`: 15 azioni `add*/update*/remove*` per le 5 entità
- [ ] Aggiungere a `AppDataContextValue`: `updateSavingsGoalProgress(id, importoCorrente): Promise<void>`
- [ ] Aggiungere a `AppDataContextValue`: `refreshAll(): void`
- [ ] Rimuovere da `AppDataContextValue`: setter raw `setAccounts`, `setTransactions`, `setCategories`, `setBudgets`, `setSavingsGoals`
- [ ] Aggiungere `useState`: `isLoading = false`, `error = null`, `isDataReady = false`
- [ ] Aggiungere `const { isAuthenticated } = useAuth()`

### A4 — Bootstrap `loadAll()` (Decisione A — parallelo)

- [ ] Creare `useEffect` con dipendenza `[isAuthenticated]`
- [ ] Branch `isAuthenticated = false`: reset tutti gli array a `[]`, `isLoading = false`, `error = null`, `isDataReady = false`
- [ ] Branch `isAuthenticated = true`: impostare `isLoading = true`, `error = null`
- [ ] Implementare flag stale: `let cancelled = false` nel `useEffect` con `return () => { cancelled = true }` nel cleanup
- [ ] Lanciare `Promise.all([ getAllConti(), getAllTransazioni(), getAllCategorie(), getAllBudget(), getAllObiettivi() ])`
- [ ] Se successo e `!cancelled`: popolare i 5 array, `isLoading = false`, `isDataReady = true`
- [ ] Se errore (catch) e `!cancelled`: `error = messaggio descrittivo`, `isLoading = false`

### A5 — `refreshAll()`

- [ ] Implementare `refreshAll()`: guardia idempotente `if (isLoading) return`
- [ ] Se non in corso: avvia nuovo ciclo parallelo senza resettare `isDataReady` (i dati precedenti rimangono visibili)

### A6 — Setter `add*`, `update*`, `remove*` — Conti

- [ ] Implementare `addAccount(data)`: `createConto(data)` → aggiunge record restituito a `accounts`
- [ ] Implementare `updateAccount(id, data)`: `updateConto(id, data)` → sostituisce in `accounts`
- [ ] Implementare `removeAccount(id)`: `removeConto(id)` → rimuove da `accounts` + filtra `transactions` (contoId / contoDestinazioneId = id) atomicamente

### A7 — Setter `add*`, `update*`, `remove*` — Transazioni

- [ ] Implementare `addTransaction(data)`: `createTransazione(data)` **senza `cifrato`** → aggiunge il record restituito (con `cifrato` calcolato dal trigger) a `transactions`
- [ ] Implementare `updateTransaction(id, data)`: `updateTransazione(id, data)` **senza `cifrato`** → sostituisce in `transactions`
- [ ] Implementare `removeTransaction(id)`: `removeTransazione(id)` → rimuove da `transactions`

### A8 — Setter `add*`, `update*`, `remove*` — Categorie

- [ ] Implementare `addCategory(data)`: `createCategoria(data)` → aggiunge a `categories`
- [ ] Implementare `updateCategory(id, data)`: `updateCategoria(id, data)` → sostituisce in `categories`
- [ ] Implementare `removeCategory(id)`: `removeCategoria(id)` → caso speciale FK: intercettare errore `23503`, impostare `error` con messaggio «Impossibile eliminare la categoria: è usata da movimenti esistenti. Riassegna prima i movimenti a un'altra categoria.», nessuna modifica locale

### A9 — Setter `add*`, `update*`, `remove*` — Budget e Obiettivi

- [ ] Implementare `addBudget(data)`: `createBudgetItem(data)` → aggiunge a `budgets`
- [ ] Implementare `updateBudget(id, data)`: `updateBudgetItem(id, data)` → sostituisce in `budgets`
- [ ] Implementare `removeBudget(id)`: `removeBudgetItem(id)` → rimuove da `budgets`
- [ ] Implementare `addSavingsGoal(data)`: `createObiettivo(data)` → aggiunge a `savingsGoals`
- [ ] Implementare `updateSavingsGoal(id, data)`: `updateObiettivo(id, data)` → sostituisce (metadati)
- [ ] Implementare `updateSavingsGoalProgress(id, importoCorrente)`: `updateObiettivoProgress(id, importoCorrente)` → sostituisce il record aggiornato (inclusi `completato`, `dataCompletamento`)
- [ ] Implementare `removeSavingsGoal(id)`: `removeObiettivo(id)` → rimuove da `savingsGoals`

### A10 — Gate intermedio A

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → tutti i test passed (stessa baseline pre-P28)
- [ ] `npx tsc --noEmit` → 0 errori TypeScript

---

## Passo B — `App.tsx`: gate `!isDataReady`

> Prerequisito: Passo A completato.
> File da modificare: `src/App.tsx`

### B1 — Aggiunta gate

- [ ] Aggiungere `isDataReady` alla destrutturazione di `useAppData()`
- [ ] Aggiungere gate `if (!isDataReady) return <LoadingSpinner />` dopo il gate `needsOnboarding` e prima della dashboard
- [ ] Verificare ordine dei 4 gate: `!isAuthReady` → `!isAuthenticated` → `needsOnboarding` → `!isDataReady`

### B2 — Gate intermedio B

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → tutti i test passed (stessa baseline pre-P28)

---

## Passo C — `TransactionDialog.tsx`: rimozione campo `cifrato`

> Prerequisito: Passo B completato.
> File da modificare: `src/components/TransactionDialog.tsx`

### C1 — Rimozione dal payload

- [ ] Identificare la riga con `cifrato: isPrivateTransaction` (o formula analoga) nel payload di `addTransaction(...)`
- [ ] Rimuovere `cifrato` dal payload di `addTransaction(...)` nel handler di submit
- [ ] Rimuovere `cifrato` dal payload di `updateTransaction(...)` nel handler di submit, se presente
- [ ] Verificare che `cifrato` non sia costruito come dato di input in nessun altro punto del file
- [ ] Verificare che la lettura di `cifrato` dai dati esistenti (pre-popolamento form edit) non sia rimossa — solo l'invio nel payload va eliminato

### C2 — Gate intermedio C

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → tutti i test passed (stessa baseline pre-P28)
- [ ] `npx tsc --noEmit` → 0 errori TypeScript

---

## Gate finale D (= gate P28)

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → tutti i test passed (stessa baseline pre-P28)
- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] `grep useKV src/context/AppDataContext.tsx` → solo 3 occorrenze attese: `visibleCategories`, `dismissedAlerts`, `budgetPercentages`
- [ ] Verifica a vista: `useAppData()` espone tutti gli elementi della superficie pubblica P28 §4 (5 array, 3 flag, 15 azioni + `updateSavingsGoalProgress` + `refreshAll()`)
- [ ] Verifica a vista: `App.tsx` ha i 4 gate nell'ordine corretto
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## Blocchi noti

> _Nessun blocco noto al momento dell'apertura del task._

---

## Note operative

- Il flag stale per le promise in volo al logout (A4): implementare con `let cancelled = false` e `return () => { cancelled = true }` nel cleanup del `useEffect` — non richiede `AbortController`.
- Il caso FK in `removeCategory` (A8): verificare la struttura di `RepositoryError` da P26 per accedere al codice di errore `23503` (foreign_key_violation) prima di implementare l'intercettazione specifica.
- Se `TransactionDialog.tsx` usa `cifrato` anche nella logica di visibilità del form (es. per identificare transazioni private in edit mode), mantenere la lettura del campo dai dati del DB — rimuovere solo il campo dal payload di invio.
