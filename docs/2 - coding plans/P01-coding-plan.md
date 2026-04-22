# P01 — Coding Plan: Context Split

> Documento operativo. Nessun file viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 1 — Creazione di `AppDataContext` e `AuthContext`  
> Design di riferimento: `docs/1 - projects/P01-context-split-design.md`  
> Data: 22 aprile 2026

---

## Note preliminari

- I numeri di riga indicati sono **approssimativi** (±5 righe) e vanno verificati nell'editor prima di ogni spostamento.
- Ogni passo deve essere verificato e committato separatamente prima di procedere al successivo.
- I file `src/lib/`, `src/hooks/`, `src/components/` non vengono toccati in nessun passo.
- La directory `src/context/` non esiste ancora: va creata al Passo 1.

---

## Passo 1 — Crea `AppDataContext` con lo stato dati KV

### Rischio: 🟢 Basso

### File da creare

**`src/context/AppDataContext.tsx`** (nuovo)

Struttura interna del file:

```tsx
import { createContext, useContext, useMemo, useEffect, ReactNode } from 'react'
import { useKV } from '@github/spark/hooks'
import { Account, Transaction, Category, Budget, SavingsGoal } from '@/lib/types'
import { DEFAULT_CATEGORIES, ACCOUNT_CATEGORIES } from '@/lib/constants'
import { generateId } from '@/lib/helpers'

// 1. Interfaccia del valore esposto dal context
interface AppDataContextValue {
  // Stato KV grezzo
  accounts: Account[] | null
  setAccounts: (value: Account[] | ((prev: Account[] | null) => Account[])) => void
  transactions: Transaction[] | null
  setTransactions: (value: Transaction[] | ((prev: Transaction[] | null) => Transaction[])) => void
  categories: Category[] | null
  setCategories: (value: Category[] | ((prev: Category[] | null) => Category[])) => void
  budgets: Budget[] | null
  setBudgets: (value: Budget[] | ((prev: Budget[] | null) => Budget[])) => void
  savingsGoals: SavingsGoal[] | null
  setSavingsGoals: (value: SavingsGoal[] | ((prev: SavingsGoal[] | null) => SavingsGoal[])) => void
  visibleCategories: string[] | null
  setVisibleCategories: (value: string[] | ((prev: string[] | null) => string[])) => void
  dismissedAlerts: string[] | null
  setDismissedAlerts: (value: string[] | ((prev: string[] | null) => string[])) => void
  budgetPercentages: Record<string, number> | null
  setBudgetPercentages: (value: Record<string, number> | ((prev: Record<string, number> | null) => Record<string, number>)) => void
  // Safe wrappers (useMemo)
  safeAccounts: Account[]
  safeTransactions: Transaction[]
  safeCategories: Category[]
  safeBudgets: Budget[]
  safeSavingsGoals: SavingsGoal[]
}

// 2. Context + hook
const AppDataContext = createContext<AppDataContextValue | null>(null)

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData deve essere usato dentro AppDataProvider')
  return ctx
}

// 3. Provider
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useKV<Account[]>('accounts', [])
  const [transactions, setTransactions] = useKV<Transaction[]>('transactions', [])
  const [categories, setCategories] = useKV<Category[]>('categories', [])
  const [budgets, setBudgets] = useKV<Budget[]>('budgets', [])
  const [savingsGoals, setSavingsGoals] = useKV<SavingsGoal[]>('savings-goals', [])
  const [visibleCategories, setVisibleCategories] = useKV<string[]>(
    'visible-categories',
    ACCOUNT_CATEGORIES.map(c => c.id)
  )
  const [dismissedAlerts, setDismissedAlerts] = useKV<string[]>('dismissed-budget-alerts', [])
  const [budgetPercentages, setBudgetPercentages] = useKV<Record<string, number>>('budget-percentages', {})

  const safeAccounts = useMemo(() => accounts || [], [accounts])
  const safeTransactions = useMemo(() => transactions || [], [transactions])
  const safeCategories = useMemo(() => categories || [], [categories])
  const safeBudgets = useMemo(() => budgets || [], [budgets])
  const safeSavingsGoals = useMemo(() => savingsGoals || [], [savingsGoals])

  // Inizializzazione categorie default (solo la parte dati)
  useEffect(() => {
    if (safeCategories.length === 0) {
      const defaultCats: Category[] = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        id: generateId()
      }))
      setCategories(defaultCats)
    }
  }, [])

  return (
    <AppDataContext.Provider value={{
      accounts, setAccounts,
      transactions, setTransactions,
      categories, setCategories,
      budgets, setBudgets,
      savingsGoals, setSavingsGoals,
      visibleCategories, setVisibleCategories,
      dismissedAlerts, setDismissedAlerts,
      budgetPercentages, setBudgetPercentages,
      safeAccounts, safeTransactions, safeCategories, safeBudgets, safeSavingsGoals,
    }}>
      {children}
    </AppDataContext.Provider>
  )
}
```

### Righe da rimuovere da `src/App.tsx`

| Blocco | Righe approssimative | Azione |
|---|---|---|
| `useKV` accounts, transactions, categories, budgets, savingsGoals | ~59–63 | Rimuovere; sostituire con destructure da `useAppData()` |
| `useKV` visibleCategories | ~86 | Rimuovere; sostituire con destructure da `useAppData()` |
| `useKV` dismissedAlerts | ~88 | Rimuovere; sostituire con destructure da `useAppData()` |
| `useKV` budgetPercentages | ~89 | Rimuovere; sostituire con destructure da `useAppData()` |
| Safe wrappers `safeAccounts`–`safeSavingsGoals` | ~92–96 | Rimuovere; sostituire con destructure da `useAppData()` |
| Parte categorie del `useEffect` init | ~104–109 | Rimuovere il blocco `if (safeCategories.length === 0)` (mantieni il blocco PIN) |

> **Attenzione — useEffect init**: il `useEffect` a riga ~98 ha due responsabilità: controlla il PIN (righe ~99–103) e inizializza le categorie (righe ~104–109). Solo il secondo blocco viene rimosso da App.tsx in questo passo. Il primo resta fino al Passo 2.

### Modifiche ad `App.tsx`

1. Aggiungere import: `import { AppDataProvider, useAppData } from '@/context/AppDataContext'`
2. All'inizio di `function App()`, aggiungere:
   ```tsx
   const {
     accounts, setAccounts, transactions, setTransactions,
     categories, setCategories, budgets, setBudgets,
     savingsGoals, setSavingsGoals, visibleCategories, setVisibleCategories,
     dismissedAlerts, setDismissedAlerts, budgetPercentages, setBudgetPercentages,
     safeAccounts, safeTransactions, safeCategories, safeBudgets, safeSavingsGoals,
   } = useAppData()
   ```
3. Avvolgere il JSX restituito da `App` in `<AppDataProvider>`:
   ```tsx
   return (
     <AppDataProvider>
       {/* contenuto esistente */}
     </AppDataProvider>
   )
   ```

### Dipendenze importate in `AppDataContext.tsx`

| Import | Da |
|---|---|
| `createContext`, `useContext`, `useMemo`, `useEffect`, `ReactNode` | `react` |
| `useKV` | `@github/spark/hooks` |
| `Account`, `Transaction`, `Category`, `Budget`, `SavingsGoal` | `@/lib/types` |
| `DEFAULT_CATEGORIES`, `ACCOUNT_CATEGORIES` | `@/lib/constants` |
| `generateId` | `@/lib/helpers` |

### Criterio di verifica — Passo 1

- L'app si avvia senza errori in console (F12).
- Il PIN globale funziona (login e primo setup).
- Dopo aver aggiunto un conto, F5 → il conto è ancora presente.
- In sessione pulita (localStorage svuotato), le categorie default appaiono automaticamente.

---

## Passo 2 — Crea `AuthContext` con lo stato autenticazione

### Rischio: 🟢 Basso
### Prerequisito: Passo 1 completato e verificato

### File da creare

**`src/context/AuthContext.tsx`** (nuovo)

Struttura interna del file:

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useKV } from '@github/spark/hooks'

interface AuthContextValue {
  // Stato KV
  globalPinHash: string | null
  setGlobalPinHash: (value: string | ((prev: string | null) => string)) => void
  privatePinHash: string | null
  setPrivatePinHash: (value: string | ((prev: string | null) => string)) => void
  // Stato effimero
  isAuthenticated: boolean
  setIsAuthenticated: (v: boolean) => void
  isPrivateUnlocked: boolean
  setIsPrivateUnlocked: (v: boolean) => void
  isSetupMode: boolean
  setIsSetupMode: (v: boolean) => void
  showPinDialog: boolean
  setShowPinDialog: (v: boolean) => void
  showPrivatePinDialog: boolean
  setShowPrivatePinDialog: (v: boolean) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
  const [privatePinHash, setPrivatePinHash] = useKV<string>('private-pin-hash', '')

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)

  // Inizializzazione PIN (solo la parte auth, separata dal blocco categorie rimosso al Passo 1)
  useEffect(() => {
    if (!globalPinHash) {
      setIsSetupMode(true)
      setShowPinDialog(true)
    } else {
      setShowPinDialog(true)
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      globalPinHash, setGlobalPinHash,
      privatePinHash, setPrivatePinHash,
      isAuthenticated, setIsAuthenticated,
      isPrivateUnlocked, setIsPrivateUnlocked,
      isSetupMode, setIsSetupMode,
      showPinDialog, setShowPinDialog,
      showPrivatePinDialog, setShowPrivatePinDialog,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Righe da rimuovere da `src/App.tsx`

| Blocco | Righe approssimative | Azione |
|---|---|---|
| `useKV` globalPinHash, privatePinHash | ~57–58 | Rimuovere; sostituire con destructure da `useAuth()` |
| `useState` isAuthenticated, isPrivateUnlocked, isSetupMode | ~65–67 | Rimuovere; sostituire con destructure da `useAuth()` |
| `useState` showPinDialog, showPrivatePinDialog | ~69–70 | Rimuovere; sostituire con destructure da `useAuth()` |
| Parte PIN del `useEffect` init (il blocco rimasto al Passo 1) | ~98–103 | Rimuovere interamente (ora gestito in `AuthContext`) |

### Modifiche ad `App.tsx`

1. Aggiungere import: `import { AuthProvider, useAuth } from '@/context/AuthContext'`
2. All'inizio di `function App()`, aggiungere:
   ```tsx
   const {
     globalPinHash, setGlobalPinHash, privatePinHash, setPrivatePinHash,
     isAuthenticated, setIsAuthenticated, isPrivateUnlocked, setIsPrivateUnlocked,
     isSetupMode, setIsSetupMode, showPinDialog, setShowPinDialog,
     showPrivatePinDialog, setShowPrivatePinDialog,
   } = useAuth()
   ```
3. Avvolgere il JSX restituito in `<AuthProvider>` (esterno a `<AppDataProvider>`):
   ```tsx
   return (
     <AuthProvider>
       <AppDataProvider>
         {/* contenuto esistente */}
       </AppDataProvider>
     </AuthProvider>
   )
   ```

### Ordine dei provider — R4

`AuthProvider` deve essere il wrapper **esterno**. Se invertito, si ottiene un errore di runtime "useAuth deve essere usato dentro AuthProvider" alla prima chiamata fuori contesto. Verificare l'ordine dopo ogni modifica alla struttura JSX di App.tsx.

### Dipendenze importate in `AuthContext.tsx`

| Import | Da |
|---|---|
| `createContext`, `useContext`, `useState`, `useEffect`, `ReactNode` | `react` |
| `useKV` | `@github/spark/hooks` |

### Criterio di verifica — Passo 2

- Login con PIN globale corretto → app si sblocca.
- Setup del primo PIN (sessione pulita) → hash salvato, accesso concesso.
- PIN errato → toast "PIN non corretto" appare.
- `isAuthenticated` è `false` al caricamento (console: `console.log(isAuthenticated)` prima del login).

---

## Passo 3 — Migra gli handler CRUD in `AppDataContext`

### Rischio: 🟡 Medio
### Prerequisito: Passo 1 completato e verificato

### Principio

Gli handler vengono spostati fisicamente da `App.tsx` al corpo di `AppDataProvider`. Le firme di alcuni handler cambiano per le dipendenze trasversali (vedi sotto). App.tsx chiama gli handler tramite `useAppData()`.

### Firme modificate per gestire R2 e R3

**R2 — `handleDeleteConfirm`**: il parametro `deletingItem` (UI state in App.tsx) viene passato esplicitamente.

```tsx
// Nuova firma in AppDataContext
handleDeleteConfirm: (item: { type: 'account' | 'transaction' | 'budget' | 'savingsGoal', id: string }) => void
```
In App.tsx: `handleDeleteConfirm(deletingItem!)` — già garantito non-null dall'AlertDialog.

**R3 — `handleViewBudget`**: i setter UI `setActiveTab`, `setEditingBudget`, `setShowBudgetDialog` restano in App.tsx. La funzione riceve una callback.

```tsx
// Nuova firma in AppDataContext
handleViewBudget: (budgetId: string, onNavigate: (budget: Budget) => void) => void
```
In App.tsx: `handleViewBudget(id, (budget) => { setActiveTab('reports'); setTimeout(() => { setEditingBudget(budget); setShowBudgetDialog(true) }, 300) })`

**`handleExportCSV`**: usa `visibleTransactions` e `visibleAccounts` che sono ancora `useMemo` in App.tsx. Li riceve come parametri.

```tsx
// Nuova firma in AppDataContext
handleExportCSV: (visibleTransactions: Transaction[], visibleAccounts: Account[]) => void
```
In App.tsx: `handleExportCSV(visibleTransactions, visibleAccounts)`

**`handleAddFundsToGoal`**: ⚠️ *Vedi sezione Ambiguità — AI1.*

### Righe da spostare da `src/App.tsx` a `AppDataContext.tsx`

| Handler | Righe approssimative in App.tsx | Note firma |
|---|---|---|
| `handleSaveAccount` | ~178–199 | Nessuna modifica. Rimuove `setEditingAccount(undefined)` — lasciare in App.tsx come callback o spostare con il context UI (P02) |
| `handleSaveTransaction` + `checkBudgetNotifications` | ~201–285 | Idem per `setEditingTransaction(undefined)` |
| `handleSaveBudget` | ~287–308 | Idem per `setEditingBudget(undefined)` |
| `handleSaveSavingsGoal` | ~310–330 | Idem per `setEditingSavingsGoal(undefined)` |
| `handleDeleteConfirm` | ~337–381 | Firma modificata: riceve `item` come parametro |
| `handleExportCSV` | ~383–390 | Firma modificata: riceve `visibleTransactions`, `visibleAccounts` |
| `toggleCategoryVisibility` | ~486–500 | Nessuna modifica |
| `toggleAllCategories` | ~502–514 | Nessuna modifica |
| `handleDismissBudgetAlert` | ~528–534 | Nessuna modifica |
| `handleViewBudget` | ~536–548 | Firma modificata: riceve `onNavigate` callback |

> **Nota sulle chiamate `setEditing*` dentro handleSave\***: ogni handler `handleSave*` chiama `setEditing*(undefined)` per pulire lo stato di editing dopo il salvataggio. Questi setter sono ancora in App.tsx. Soluzione: rimuovere la chiamata `setEditing*` dall'handler nel context e gestirla come callback nei dialog (pattern già presente in tutti i `Dialog` — il dialog chiama `onSave(item)` e App.tsx reimposta lo stato). In alternativa: passare il setter come parametro. Scegliere un approccio e applicarlo consistentemente.

### Aggiunte all'interfaccia `AppDataContextValue`

Aggiungere tutte le firme degli handler (con le nuove firme dove applicabile):

```tsx
handleSaveAccount: (account: Account) => void
handleSaveTransaction: (transaction: Transaction) => void
handleSaveBudget: (budget: Budget) => void
handleSaveSavingsGoal: (goal: SavingsGoal) => void
handleDeleteConfirm: (item: { type: 'account' | 'transaction' | 'budget' | 'savingsGoal', id: string }) => void
handleExportCSV: (visibleTransactions: Transaction[], visibleAccounts: Account[]) => void
toggleCategoryVisibility: (categoryId: string) => void
toggleAllCategories: () => void
handleDismissBudgetAlert: (budgetId: string) => void
handleViewBudget: (budgetId: string, onNavigate: (budget: Budget) => void) => void
```

### Dipendenze aggiuntive da importare in `AppDataContext.tsx`

| Import | Da |
|---|---|
| `toast` | `sonner` |
| `soundSystem` | `@/lib/sound-system` |
| `hapticSystem` | `@/lib/haptic-system` |
| `useScreenReader` | `@/hooks/use-screen-reader` |
| `generateId`, `calculateAccountBalance`, `formatCurrency`, `exportToCSV`, `downloadFile`, `getActiveBudgets`, `getBudgetProgress` | `@/lib/helpers` |
| `generateBudgetAlerts`, `shouldShowBudgetNotification`, `getBudgetNotificationTitle` | `@/lib/budget-alerts` |

### Criterio di verifica — Passo 3

- Aggiungere una transazione → saldo aggiornato, toast "Movimento aggiunto" visibile.
- Modificare un conto → toast "Conto modificato".
- Eliminare un budget → toast "Budget eliminato".
- Esportare CSV → file scaricato con movimenti corretti.
- Filtri categoria nella dashboard → toggle funzionante (visual e stato persistito).
- Nessun errore TypeScript nel progetto (`npm run build` senza errori).

---

## Passo 4 — Migra gli handler PIN in `AuthContext`

### Rischio: 🟡 Medio
### Prerequisito: Passo 2 completato e verificato

### Gestione di R1 — Dipendenza circolare

`handlePrivatePinSubmit` usa `visibleAccounts` e `visibleTransactions` per annunciare il saldo. Questi valori non esistono ancora come dati condivisi — sono `useMemo` in App.tsx.

**Soluzione adottata**: `handlePrivatePinSubmit` riceve una callback opzionale `onUnlocked`.

```tsx
// Nuova firma in AuthContext
handlePrivatePinSubmit: (pin: string, onUnlocked?: (balance: number) => void) => Promise<void>
```

In App.tsx, al momento della chiamata:
```tsx
handlePrivatePinSubmit(pin, (balance) => {
  // annuncio screen reader del saldo
  screenReader.announceBalance('Conto privato', balance)
})
```

La logica di calcolo del saldo (privateAccount lookup + calculateAccountBalance) rimane in App.tsx o viene spostata nel chiamante del dialog. L'handler in AuthContext non calcola il saldo: lo riceve già calcolato tramite callback.

### Righe da spostare da `src/App.tsx` ad `AuthContext.tsx`

| Handler | Righe approssimative in App.tsx | Note firma |
|---|---|---|
| `handleGlobalPinSubmit` | ~118–145 | Nessuna modifica alla logica |
| `handlePrivatePinSubmit` | ~147–176 | Firma modificata: riceve `onUnlocked?` callback; la parte `visibleAccounts.find(...)` e `calculateAccountBalance(...)` viene rimossa dall'handler e delegata alla callback |

### Aggiunte all'interfaccia `AuthContextValue`

```tsx
handleGlobalPinSubmit: (pin: string) => Promise<void>
handlePrivatePinSubmit: (pin: string, onUnlocked?: (balance: number) => void) => Promise<void>
```

### Dipendenze aggiuntive da importare in `AuthContext.tsx`

| Import | Da |
|---|---|
| `hashPin`, `verifyPin` | `@/lib/crypto` |
| `toast` | `sonner` |
| `soundSystem` | `@/lib/sound-system` |
| `hapticSystem` | `@/lib/haptic-system` |
| `useScreenReader` | `@/hooks/use-screen-reader` |

### Criterio di verifica — Passo 4

- Login con PIN globale corretto → accesso concesso, toast "Accesso consentito".
- PIN globale errato → toast "PIN non corretto".
- Setup primo PIN (sessione pulita) → toast "PIN globale creato".
- PIN privato corretto → conto privato sbloccato e visibile.
- PIN privato errato → toast "PIN privato non corretto".
- Con screen reader attivo e conto privato esistente → annuncio del saldo dopo sblocco.

---

## Struttura finale di `App.tsx` dopo P01

Al termine dei 4 passi, `App.tsx` non conterrà più:
- Nessuna chiamata `useKV` (tutte nei due context)
- Nessuno stato auth (in `AuthContext`)
- Nessun handler CRUD o PIN (nei due context)

`App.tsx` conterrà ancora (da affrontare nei pacchetti successivi):
- `useState` per dialog UI (`showAccountDialog`, ecc.)
- `useState` per editing (`editingAccount`, ecc.)
- `useState` per `deletingItem`, `activeTab`, `chartPeriod`, ecc.
- Tutti i `useMemo` (valori derivati: `visibleAccounts`, `totalBalance`, ecc.)
- `useEffect` per tab change e delete dialog sound
- `useListNavigation` e `useKeyboardShortcuts`
- Tutto il JSX

---

## Ambiguità rilevate

### AI1 — `handleAddFundsToGoal`

Il design doc (sezione 3.4) include `handleAddFundsToGoal` tra gli handler da spostare in `AppDataContext`. Tuttavia il codice attuale in App.tsx (~righe 332–335) è:

```tsx
const handleAddFundsToGoal = (goal: SavingsGoal) => {
  setEditingSavingsGoal(goal)
  setShowSavingsGoalDialog(true)
}
```

Questa funzione non tocca nessun dato persistito: imposta solo stati UI (`editingSavingsGoal`, `showSavingsGoalDialog`) che restano in App.tsx fino a P02. Spostarla in `AppDataContext` richiederebbe passare entrambi i setter come parametri o callback — pattern identico a R3.

**Opzione A**: lasciare `handleAddFundsToGoal` in App.tsx per ora e includerla nel P02 con i dialog UI.  
**Opzione B**: spostarla in AppDataContext con callback `onOpen: (goal: SavingsGoal) => void`.

**Decisione richiesta all'implementatore** prima del Passo 3.

### AI2 — `setEditing*` dentro `handleSave*`

Ogni `handleSave*` termina con `setEditingAccount(undefined)` (o equivalente). Questi setter sono UI state in App.tsx. La soluzione va scelta una volta e applicata consistentemente a tutti e 4 gli handler. Opzioni:
- Rimuovere la riga dall'handler nel context e gestire il reset nel Dialog dopo `onSave`.
- Passare il setter come parametro `onSaved?: () => void`.

**Decisione richiesta all'implementatore** prima del Passo 3.
