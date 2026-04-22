# P05 — Coding Plan: Hook `use-visible-data`

> Documento operativo. Nessun file viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 5 — Creazione di `use-visible-data.ts` e aggiunta di `AccountGroup` a `types.ts`  
> Design di riferimento: `docs/1 - projects/P05-use-visible-data-design.md`  
> Data: 22 aprile 2026

---

## Note preliminari

- I numeri di riga indicati sono **approssimativi** (±5 righe) e vanno verificati nell'editor prima di ogni modifica.
- Il Passo B è prerequisito del Passo A: completare e verificare A prima di procedere.
- `src/App.tsx` **non viene toccato** in nessun passo di questo pacchetto.
- I context `AppDataContext.tsx` e `AuthContext.tsx` non vengono toccati.
- Il file `src/hooks/use-visible-data.ts` viene creato ma non importato da nessuna parte: l'app continua a funzionare identicamente.
- Dopo il Passo B, eseguire `tsc --noEmit` prima di qualsiasi commit.

---

## Passo A — Aggiunta di `AccountGroup` a `src/lib/types.ts`

### Rischio: 🟢 Basso

### File da modificare

**`src/lib/types.ts`** (esistente)

Aggiungere l'esportazione del tipo `AccountGroup` in fondo al file, prima dell'interfaccia `AppState`:

```ts
export type AccountGroup = {
  id: string
  label: string
  accounts: Account[]
}
```

**Posizione nel file**: dopo l'interfaccia `SavingsGoal` (~riga 72) e prima di `AppState` (~riga 74). `AccountGroup` usa `Account[]`, che è dichiarato più in alto nel file — l'ordine è corretto.

### Criterio di verifica — Passo A

- Eseguire `tsc --noEmit` nella root del progetto → zero errori TypeScript.
- Verificare che il tipo sia importabile da un altro file con `import type { AccountGroup } from '@/lib/types'` senza errori.
- L'app si avvia senza modifiche visibili (il tipo è solo dichiarato, non usato da nessuno ancora).

---

## Passo B — Creazione di `src/hooks/use-visible-data.ts`

### Rischio: 🟢 Basso
### Prerequisito: Passo A completato e verificato

### File da creare

**`src/hooks/use-visible-data.ts`** (nuovo)

Struttura completa del file:

```ts
import { useMemo } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { ACCOUNT_CATEGORIES, ACCOUNT_TYPE_TO_CATEGORY } from '@/lib/constants'
import { getTotalBalance } from '@/lib/helpers'
import { generateBudgetAlerts, type BudgetAlert } from '@/lib/budget-alerts'
import type { Account, Transaction, AccountGroup } from '@/lib/types'

// Tipo del valore restituito dall'hook
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
  // — Sorgenti dati —
  const {
    safeAccounts,
    safeTransactions,
    safeBudgets,
    visibleCategories,
    dismissedAlerts,
  } = useAppData()

  const { isPrivateUnlocked } = useAuth()

  // — Valori derivati — ordine obbligatorio (vedi design §3.3 e §3.4) —

  // 1. visibleAccounts: filtra i conti privati se non sbloccati
  const visibleAccounts = useMemo(() => {
    return safeAccounts.filter(account => {
      if (account.isPrivato && !isPrivateUnlocked) return false
      return true
    })
  }, [safeAccounts, isPrivateUnlocked])

  // 2. visibleTransactions: solo le transazioni di conti visibili
  const visibleTransactions = useMemo(() => {
    const accountIds = new Set(visibleAccounts.map(a => a.id))
    return safeTransactions.filter(t => accountIds.has(t.contoId))
  }, [safeTransactions, visibleAccounts])

  // 3. hasPrivateAccount: flag — esiste almeno un conto privato
  const hasPrivateAccount = useMemo(
    () => safeAccounts.some(a => a.isPrivato),
    [safeAccounts]
  )

  // 4. privateAccount: riferimento al conto privato (se esiste)
  const privateAccount = useMemo(
    () => safeAccounts.find(a => a.isPrivato),
    [safeAccounts]
  )

  // 5. totalBalance: saldo consolidato di tutti i conti visibili
  const totalBalance = useMemo(
    () => getTotalBalance(visibleAccounts, visibleTransactions),
    [visibleAccounts, visibleTransactions]
  )

  // 6. recentTransactions: ultime 10 transazioni ordinate per data
  const recentTransactions = useMemo(() => {
    return [...visibleTransactions]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10)
  }, [visibleTransactions])

  // 7. groupedAccounts: conti raggruppati per categoria
  const groupedAccounts = useMemo((): AccountGroup[] => {
    const groups = new Map<string, Account[]>()

    visibleAccounts.forEach(account => {
      const categoryId = ACCOUNT_TYPE_TO_CATEGORY[account.tipo]
      if (!groups.has(categoryId)) groups.set(categoryId, [])
      groups.get(categoryId)?.push(account)
    })

    return ACCOUNT_CATEGORIES
      .map(category => ({
        id: category.id,
        label: category.label,
        accounts: groups.get(category.id) || [],
      }))
      .filter(group => group.accounts.length > 0)
  }, [visibleAccounts])

  // 8. filteredGroupedAccounts: gruppi filtrati per visibilità categoria
  //    Guardia null: visibleCategories può essere null durante il caricamento iniziale (R3)
  const filteredGroupedAccounts = useMemo(() => {
    const safeVisibleCategories = visibleCategories || []
    return groupedAccounts.filter(group => safeVisibleCategories.includes(group.id))
  }, [groupedAccounts, visibleCategories])

  // 9. allCategoriesVisible: flag — tutte le categorie sono visibili
  const allCategoriesVisible = useMemo(() => {
    const current = visibleCategories || []
    return current.length === ACCOUNT_CATEGORIES.length
  }, [visibleCategories])

  // 10. budgetAlerts: alert budget attivi non ancora chiusi dall'utente
  //     Guardia null: dismissedAlerts può essere null durante il caricamento iniziale (R3)
  const budgetAlerts = useMemo(() => {
    const alerts = generateBudgetAlerts(safeBudgets, visibleTransactions)
    const dismissedIds = dismissedAlerts || []
    return alerts.filter(alert => !dismissedIds.includes(alert.budgetId))
  }, [safeBudgets, visibleTransactions, dismissedAlerts])

  return {
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
  }
}
```

### Dipendenze importate in `use-visible-data.ts`

| Import | Da |
|---|---|
| `useMemo` | `react` |
| `useAppData` | `@/context/AppDataContext` |
| `useAuth` | `@/context/AuthContext` |
| `ACCOUNT_CATEGORIES`, `ACCOUNT_TYPE_TO_CATEGORY` | `@/lib/constants` |
| `getTotalBalance` | `@/lib/helpers` |
| `generateBudgetAlerts`, `BudgetAlert` | `@/lib/budget-alerts` |
| `Account`, `Transaction`, `AccountGroup` | `@/lib/types` |

### Ordine obbligatorio dei 10 useMemo

I valori hanno dipendenze in cascata — l'ordine non può essere modificato:

```
safeAccounts, isPrivateUnlocked  →  visibleAccounts        (#1)
safeTransactions, visibleAccounts  →  visibleTransactions  (#2)
safeAccounts  →  hasPrivateAccount                         (#3)
safeAccounts  →  privateAccount                            (#4)
visibleAccounts, visibleTransactions  →  totalBalance      (#5)
visibleTransactions  →  recentTransactions                 (#6)
visibleAccounts  →  groupedAccounts                        (#7)
groupedAccounts, visibleCategories  →  filteredGroupedAccounts (#8)
visibleCategories  →  allCategoriesVisible                 (#9)
safeBudgets, visibleTransactions, dismissedAlerts  →  budgetAlerts (#10)
```

### Criterio di verifica — Passo B

1. **Compilazione senza errori**: `tsc --noEmit` → zero errori nel file `src/hooks/use-visible-data.ts`.
2. **File presente**: `src/hooks/use-visible-data.ts` esiste e contiene l'export `useVisibleData`.
3. **Comportamento invariato**: l'app si avvia, il login funziona, la navigazione tra tab è normale. Nessuna regressione.
4. **Nessun import ciclico**: aprire la console del browser → nessun warning "circular dependency". L'hook importa solo da `context/` e `lib/`, che non importano da `hooks/`.
5. **Tipi corretti**: verificare che i tipi del valore restituito corrispondano a quelli usati in `App.tsx`:
   - `visibleAccounts` → `Account[]`
   - `budgetAlerts` → `BudgetAlert[]`
   - `groupedAccounts` / `filteredGroupedAccounts` → `AccountGroup[]`

---

## Struttura finale dopo il Passo 5

### Aggiunto

| File | Tipo | Contenuto |
|---|---|---|
| `src/hooks/use-visible-data.ts` | Nuovo | Hook `useVisibleData()` con 10 valori derivati |
| `src/lib/types.ts` (modifica) | Esistente | Tipo `AccountGroup` aggiunto in fondo, prima di `AppState` |

### Invariato

| Elemento | Stato |
|---|---|
| `src/App.tsx` | Invariato — contiene ancora i propri `useMemo` locali |
| `src/context/AppDataContext.tsx` | Invariato |
| `src/context/AuthContext.tsx` | Invariato |
| `src/lib/helpers.ts`, `budget-alerts.ts`, `constants.ts` | Invariati |
| Tutti i componenti in `src/components/` | Invariati |
| Tutti gli altri hook in `src/hooks/` | Invariati |

`App.tsx` manterrà i propri `useMemo` duplicati fino al Passo 6 (`use-app-shortcuts`) o fino all'estrazione del componente che li usa, quando la duplicazione verrà rimossa.

---

## Ambiguità rilevate

### AI1 — Campi di `AccountGroup` potenzialmente insufficienti

**Situazione**: Il design doc definisce `AccountGroup` come `{ id: string; label: string; accounts: Account[] }`. Il codice esistente in `App.tsx` (~riga 186) usa `{ ...category, accounts: [...] }`, che include tutti i campi di `AccountCategoryInfo` (`id`, `label`, `description`, `types`, `color`, `badgeVariant`).

**Problema potenziale**: Quando `DashboardTab` (Passo 8) e `ReportsTab` (Passo 9) verranno estratti come componenti, potrebbero accedere a `group.color` o `group.badgeVariant` per la visualizzazione dei badge categoria. Con il tipo `AccountGroup` ridotto a soli tre campi, quell'accesso causerebbe un errore TypeScript.

**Non risolto in questo passo**: Seguendo il design doc fedelmente, `AccountGroup` viene dichiarato con `{ id, label, accounts }`. Se al momento dell'estrazione di `DashboardTab` (Passo 8) emergesse la necessità degli altri campi, il tipo andrà esteso a `AccountCategoryInfo & { accounts: Account[] }` o equivalente, e l'import di `AccountCategoryInfo` andrà aggiunto in `types.ts` o `use-visible-data.ts`. Documentare questa decisione nel Passo 8.

### AI2 — `ACCOUNT_TYPE_TO_CATEGORY` non verificato come import da `constants.ts`

**Situazione**: Il design doc elenca `ACCOUNT_TYPE_TO_CATEGORY` tra le costanti da importare da `@/lib/constants`. Il file `constants.ts` è stato verificato nella fase di analisi: la costante esiste ed è esportata. Non emergono ambiguità, ma va confermata la chiave usata (`account.tipo`) corrispondente ai valori di `AccountCategory` prima di committare.
