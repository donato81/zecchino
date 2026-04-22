# P05 — Todo List: Hook `use-visible-data`

> Checklist operativa sequenziale per il Passo 5.  
> Coding Plan di riferimento: `docs/2 - coding plans/P05-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P05-use-visible-data-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi AI1 nel coding plan)

---

## Prima di iniziare

- [x] Leggere `docs/2 - coding plans/P05-coding-plan.md` per intero
- [x] Prendere nota dell'ambiguità **AI1** (`AccountGroup`: tipo ridotto o completo?) — non blocca il Passo 5, ma va tenuta presente per il Passo 8
- [x] Verificare di essere sul branch `refactoring-architettura`
- [x] Eseguire `npm run build` e confermare che compila senza errori **prima** di iniziare

---

## Passo A — Aggiunta tipo `AccountGroup` in `src/lib/types.ts`

- [x] Aprire `src/lib/types.ts`
- [x] Individuare la fine dell'interfaccia `SavingsGoal` (~riga 72) e l'inizio di `AppState` (~riga 74)
- [x] Aggiungere tra le due il seguente tipo esportato:
  ```ts
  export type AccountGroup = {
    id: string
    label: string
    accounts: Account[]
  }
  ```
- [x] Salvare il file
- [x] Eseguire `tsc --noEmit` → zero errori TypeScript
- [x] Verificare: il tipo è importabile con `import type { AccountGroup } from '@/lib/types'` senza errori

---

## Passo B — Creazione hook `src/hooks/use-visible-data.ts`

> **Prerequisito**: Passo A completato e verificato ✓

### B.1 Creazione del file e import

- [x] Creare il file `src/hooks/use-visible-data.ts` vuoto
- [x] Aggiungere gli import da `react`: `useMemo`
- [x] Aggiungere import da `@/context/AppDataContext`: `useAppData`
- [x] Aggiungere import da `@/context/AuthContext`: `useAuth`
- [x] Aggiungere import da `@/lib/constants`: `ACCOUNT_CATEGORIES`, `ACCOUNT_TYPE_TO_CATEGORY`
- [x] Aggiungere import da `@/lib/helpers`: `getTotalBalance`
- [x] Aggiungere import da `@/lib/budget-alerts`: `generateBudgetAlerts`, `type BudgetAlert`
- [x] Aggiungere import da `@/lib/types`: `type Account`, `type Transaction`, `type AccountGroup`

### B.2 Dichiarazione del tipo `VisibleDataResult`

- [x] Esportare il tipo `VisibleDataResult` con i 10 campi:
  - `visibleAccounts: Account[]`
  - `visibleTransactions: Transaction[]`
  - `hasPrivateAccount: boolean`
  - `privateAccount: Account | undefined`
  - `totalBalance: number`
  - `recentTransactions: Transaction[]`
  - `groupedAccounts: AccountGroup[]`
  - `filteredGroupedAccounts: AccountGroup[]`
  - `allCategoriesVisible: boolean`
  - `budgetAlerts: BudgetAlert[]`

### B.3 Corpo dell'hook — sorgenti dati

- [x] Aprire la funzione `export function useVisibleData(): VisibleDataResult`
- [x] Destructure da `useAppData()`: `safeAccounts`, `safeTransactions`, `safeBudgets`, `visibleCategories`, `dismissedAlerts`
- [x] Destructure da `useAuth()`: `isPrivateUnlocked`

### B.4 Corpo dell'hook — 10 useMemo nell'ordine corretto

- [x] **#1** `visibleAccounts` — dipende da `safeAccounts`, `isPrivateUnlocked`
  - Filtra i conti con `isPrivato === true` se `!isPrivateUnlocked`
- [x] **#2** `visibleTransactions` — dipende da `safeTransactions`, `visibleAccounts`
  - Costruisce un `Set` di ID conto visibili, filtra `safeTransactions` per `contoId`
- [x] **#3** `hasPrivateAccount` — dipende da `safeAccounts`
  - `safeAccounts.some(a => a.isPrivato)`
- [x] **#4** `privateAccount` — dipende da `safeAccounts`
  - `safeAccounts.find(a => a.isPrivato)`
- [x] **#5** `totalBalance` — dipende da `visibleAccounts`, `visibleTransactions`
  - `getTotalBalance(visibleAccounts, visibleTransactions)`
- [x] **#6** `recentTransactions` — dipende da `visibleTransactions`
  - Copia ordinata per data decrescente, tagliata a 10 elementi
- [x] **#7** `groupedAccounts` — dipende da `visibleAccounts`
  - Raggruppa con `ACCOUNT_TYPE_TO_CATEGORY`, mappa su `ACCOUNT_CATEGORIES`, filtra gruppi vuoti
- [x] **#8** `filteredGroupedAccounts` — dipende da `groupedAccounts`, `visibleCategories`
  - ⚠️ Guardia null: `const safeVisibleCategories = visibleCategories || []`
  - Filtra `groupedAccounts` per `safeVisibleCategories.includes(group.id)`
- [x] **#9** `allCategoriesVisible` — dipende da `visibleCategories`
  - ⚠️ Guardia null: `const current = visibleCategories || []`
  - `current.length === ACCOUNT_CATEGORIES.length`
- [x] **#10** `budgetAlerts` — dipende da `safeBudgets`, `visibleTransactions`, `dismissedAlerts`
  - ⚠️ Guardia null: `const dismissedIds = dismissedAlerts || []`
  - `generateBudgetAlerts(safeBudgets, visibleTransactions)` poi filtra per `dismissedIds`

### B.5 Return statement

- [x] Aggiungere il `return` con tutti e 10 i valori

---

## Verifica finale

- [x] `tsc --noEmit` → zero errori TypeScript (nessun errore in `use-visible-data.ts` né in `types.ts`)
- [x] Il file `src/hooks/use-visible-data.ts` esiste e contiene l'export `useVisibleData`
- [x] `npm run build` (o `npm run dev`) → compilazione riuscita senza errori
- [ ] L'app si avvia nel browser senza errori in console (F12)
- [ ] Il comportamento dell'app è identico a prima: login, navigazione tab, saldi corretti
- [ ] Nessun import ciclico in console (nessun warning "circular dependency")
- [x] I tipi restituiti corrispondono a quelli usati in `App.tsx`:
  - `visibleAccounts` è `Account[]`
  - `budgetAlerts` è `BudgetAlert[]`
  - `groupedAccounts` e `filteredGroupedAccounts` sono `AccountGroup[]`
