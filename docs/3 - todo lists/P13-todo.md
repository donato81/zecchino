# P13 — Todo List: Refactor finale di `App.tsx`

> Checklist operativa sequenziale per il Pacchetto 13 — **Passo conclusivo** del refactoring architetturale.  
> Coding Plan di riferimento: `docs/2 - coding plans/P13-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P13-AppTsxFinal-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [ ] Leggere `docs/2 - coding plans/P13-coding-plan.md` per intero
- [ ] ⚠️ **Questo passo modifica SOLO `src/App.tsx`** — nessun altro file viene toccato
- [ ] ⚠️ **Nessun file nuovo viene creato** — P13 è un passo di pura rimozione
- [ ] ⚠️ **L'unica aggiunta consentita**: import `useVisibleData` + riga di destructuring con 4 campi
- [ ] Verificare di essere sul branch `refactoring-architettura`
- [ ] Eseguire `npx tsc --noEmit` prima di iniziare → annotare il numero di errori come **punto di partenza**
  - ⚠️ Risultato atteso (verificato post-P12): **0 errori**
  - Il confronto finale sarà: punto di partenza = 0 errori, punto di arrivo = 0 errori
- [ ] Prendere nota dei risultati delle ambiguità verificate nel coding plan:
  - [ ] **AI1**: `useListNavigation` → import riga ~55, non referenziato altrove → **rimuovibile**
  - [ ] **AI2**: blocchi approssimativi — (a) import ~riga 1–55, (b) destructuring `useAppData()` ~righe 62–120, (c) destructuring `useAuth()` ~righe 121–131, (d) `useMemo` locali ~righe 138–240
  - [ ] **AI3**: `useEffect(showDeleteDialog)` ancora presente in App.tsx righe ~131–136 → **da rimuovere**
  - [ ] **AI4**: `useEffect` cambio tab NON duplicato — solo in App.tsx → **conservare**
  - [ ] **AI5**: 0 errori TypeScript di partenza — nessuna tolleranza per nuovi errori durante le sotto-operazioni
- [ ] Prendere nota dei rischi critici 🔴:
  - [ ] **R1**: `setShowTransactionDialog`, `setEditingTransaction`, `setShowAccountDialog`, `setEditingAccount`, `setShowKeyboardHelp` — **devono rimanere** nel destructuring di `useAppData()`
  - [ ] **R2**: import `useVisibleData` + destructuring — **entrambi** obbligatori, con esattamente 4 campi
  - [ ] **R3**: `BudgetAlertBanner` rimane nel JSX — non toccare il blocco return
  - [ ] **R4**: `Toaster` rimane nel JSX — non toccare il blocco return
  - [ ] **R5**: `FocusIndicator` rimane nel JSX — non toccare il blocco return

---

## Passo unico — Sotto-operazione 1: Aggiunta `useVisibleData`

> **Eseguire prima di qualsiasi rimozione** — garantisce disponibilità dei campi durante le verifiche TypeScript successive.

- [ ] Aprire `src/App.tsx`
- [ ] Aggiungere l'import di `useVisibleData` dopo la riga di `useAppShortcuts` (~riga 54), prima degli import dei componenti:
  ```tsx
  import { useVisibleData } from '@/hooks/use-visible-data'
  ```
- [ ] Aggiungere nel corpo di `AppContent`, dopo il destructuring di `useAuth()`:
  ```tsx
  const { budgetAlerts, totalBalance, visibleAccounts, visibleTransactions } = useVisibleData()
  ```
- [ ] ⚠️ Verificare che i campi siano esattamente questi 4: `budgetAlerts`, `totalBalance`, `visibleAccounts`, `visibleTransactions` — non aggiungerne altri
- [ ] ⚠️ Verificare che sia l'**import** sia il **destructuring** siano stati aggiunti — non solo uno dei due (R2)
- [ ] Eseguire `npx tsc --noEmit` → **0 errori**
- [ ] ⚠️ Non procedere alla Sotto-operazione 2 se TypeScript segnala errori

---

## Passo unico — Sotto-operazione 2: Rimozione import inutilizzati

- [ ] **Riga import React (~riga 1)**: rimuovere `useMemo` lasciando `useState, useEffect`
  ```tsx
  import { useState, useEffect } from 'react'
  ```
- [ ] **Types (~riga 2)**: rimuovere l'intera riga:
  ```tsx
  import { Account, Transaction, Budget, SavingsGoal } from '@/lib/types'
  ```
- [ ] **Helpers (~riga 4)**: rimuovere `calculateAccountBalance`, `getTotalBalance`, `getActiveBudgets`, lasciando solo `formatCurrency`
- [ ] **Budget alerts (~riga 6)**: rimuovere l'intera riga:
  ```tsx
  import { generateBudgetAlerts } from '@/lib/budget-alerts'
  ```
- [ ] **Componenti dialog** — rimuovere ognuna delle seguenti righe:
  - [ ] `import { PinDialog } from '@/components/PinDialog'`
  - [ ] `import { AccountCard } from '@/components/AccountCard'`
  - [ ] `import { AccountDialog } from '@/components/AccountDialog'`
  - [ ] `import { TransactionDialog } from '@/components/TransactionDialog'`
  - [ ] `import { BudgetDialog } from '@/components/BudgetDialog'`
  - [ ] `import { BudgetProgressCard } from '@/components/BudgetProgressCard'`
  - [ ] `import { BudgetHistoryChart } from '@/components/BudgetHistoryChart'`
  - [ ] `import { BudgetComparisonCard } from '@/components/BudgetComparisonCard'`
  - [ ] `import { BudgetForecastCard } from '@/components/BudgetForecastCard'`
  - [ ] `import { SavingsGoalDialog } from '@/components/SavingsGoalDialog'`
  - [ ] `import { SavingsGoalCard } from '@/components/SavingsGoalCard'`
  - [ ] `import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'`
  - [ ] `import { AudioSettings } from '@/components/AudioSettings'`
  - [ ] `import { HapticSettings } from '@/components/HapticSettings'`
  - [ ] `import { ScreenReaderSettings } from '@/components/ScreenReaderSettings'`
  - [ ] `import { TalkBackSettings } from '@/components/TalkBackSettings'`
  - [ ] `import { DisplaySettings } from '@/components/DisplaySettings'`
  - [ ] `import { SecuritySettings } from '@/components/SecuritySettings'`
  - [ ] `import { CategoryManagement } from '@/components/CategoryManagement'`
  - [ ] `import { DataManagement } from '@/components/DataManagement'`
  - [ ] `import { IncomeExpenseChart } from '@/components/IncomeExpenseChart'`
  - [ ] `import { MonthlyComparisonChart } from '@/components/MonthlyComparisonChart'`
  - [ ] `import { PeriodSelector } from '@/components/PeriodSelector'`
- [ ] **UI components** — rimuovere ognuna delle seguenti righe:
  - [ ] `import { Button } from '@/components/ui/button'`
  - [ ] Nella riga Tabs, rimuovere `TabsContent` lasciando `Tabs, TabsList, TabsTrigger`
  - [ ] `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'`
  - [ ] `import { Separator } from '@/components/ui/separator'`
  - [ ] `import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'`
  - [ ] `import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'`
- [ ] **Icone Phosphor**: ridurre la riga lasciando solo `ChartLine, List, ArrowsLeftRight`
- [ ] **Sonner**: rimuovere `import { toast } from 'sonner'`
- [ ] **Hook non usato** — ⚠️ verificare AI1: `useListNavigation` non è referenziato → rimuovere:
  ```tsx
  import { useListNavigation } from '@/hooks/use-list-navigation'
  ```
- [ ] ⚠️ **Non rimuovere**: `useState, useEffect` (React), `formatCurrency`, `soundSystem`, `hapticSystem`, `useScreenReader`, `useIsMobile`, `AppDataProvider/useAppData`, `AuthProvider/useAuth`, `useAppShortcuts`, `SkipLink`, `FocusIndicator`, `AppHeader`, `BudgetAlertBanner`, `DashboardTab`, `TransactionsTab`, `ReportsTab`, `AuthScreen`, `DialogsOverlay`, `Tabs/TabsList/TabsTrigger`, `Badge`, `ChartLine/List/ArrowsLeftRight`, `Toaster`
- [ ] Eseguire `npx tsc --noEmit` → **0 errori**
- [ ] ⚠️ Non procedere alla Sotto-operazione 3 se TypeScript segnala errori

---

## Passo unico — Sotto-operazione 3: Riduzione destructuring `useAppData()`

- [ ] Individuare il blocco `const { ... } = useAppData()` nel corpo di `AppContent` (~righe 62–120)
- [ ] Sostituire l'intero blocco con:
  ```tsx
  const {
    handleDismissBudgetAlert,
    handleViewBudget,
    setEditingBudget,
    setShowBudgetDialog,
    setShowTransactionDialog,
    setShowAccountDialog,
    setShowKeyboardHelp,
    setEditingTransaction,
    setEditingAccount,
  } = useAppData()
  ```
- [ ] ⚠️ **R1 — CRITICO**: verificare che tutti e cinque i seguenti setter siano presenti nel destructuring ridotto — **vengono passati a `useAppShortcuts()`**:
  - [ ] `setShowTransactionDialog`
  - [ ] `setEditingTransaction`
  - [ ] `setShowAccountDialog`
  - [ ] `setEditingAccount`
  - [ ] `setShowKeyboardHelp`
- [ ] ⚠️ Verificare che i quattro campi per `BudgetAlertBanner` siano presenti:
  - [ ] `handleDismissBudgetAlert`
  - [ ] `handleViewBudget`
  - [ ] `setEditingBudget`
  - [ ] `setShowBudgetDialog`
- [ ] Verificare che il destructuring risultante abbia **esattamente 9 campi**
- [ ] Eseguire `npx tsc --noEmit` → **0 errori**
- [ ] ⚠️ Non procedere alla Sotto-operazione 4 se TypeScript segnala errori

---

## Passo unico — Sotto-operazione 4: Riduzione destructuring `useAuth()`

- [ ] Individuare il blocco `const { ... } = useAuth()` nel corpo di `AppContent` (~righe 121–131)
- [ ] Sostituire l'intero blocco con:
  ```tsx
  const { isAuthenticated } = useAuth()
  ```
- [ ] ⚠️ `isAuthenticated` è l'**unico campo** che rimane — è il guard `if (!isAuthenticated) return <AuthScreen />`
- [ ] Verificare che non rimanga nessun altro campo di `useAuth()` nel corpo di `AppContent`
- [ ] Eseguire `npx tsc --noEmit` → **0 errori**
- [ ] ⚠️ Non procedere alla Sotto-operazione 5 se TypeScript segnala errori

---

## Passo unico — Sotto-operazione 5: Rimozione `useMemo` locali e `useEffect` dialog

### 5.1 — Rimozione `useEffect(showDeleteDialog)`

- [ ] ⚠️ Verificare AI3: il `useEffect(showDeleteDialog)` è confermato presente alle righe ~131–136
- [ ] Identificare il blocco per la sua dipendenza `[showDeleteDialog]`:
  ```tsx
  useEffect(() => {
    if (showDeleteDialog) {
      soundSystem.play('dialog-open')
    }
  }, [showDeleteDialog])
  ```
- [ ] Rimuovere il blocco
- [ ] ⚠️ **Non rimuovere** il `useEffect` con dipendenza `[activeTab, previousTab, isAuthenticated, visibleAccounts, visibleTransactions, totalBalance, screenReader]` — quello è il `useEffect` del cambio tab che **deve rimanere**

### 5.2 — Rimozione dei dieci `useMemo` locali

- [ ] Rimuovere `const visibleAccounts = useMemo(...)` — ~righe 138–145
  - (ora fornito da `useVisibleData()` già destructurato)
- [ ] Rimuovere `const visibleTransactions = useMemo(...)` — ~righe 147–150
- [ ] Rimuovere `const hasPrivateAccount = safeAccounts.some(...)` — ~riga 152
- [ ] Rimuovere `const privateAccount = safeAccounts.find(...)` — ~riga 153
- [ ] Rimuovere `const totalBalance = useMemo(...)` — ~righe 155–157
- [ ] Rimuovere `const recentTransactions = useMemo(...)` — ~righe 200–204
- [ ] Rimuovere `const groupedAccounts = useMemo(...)` — ~righe 206–220
- [ ] Rimuovere `const filteredGroupedAccounts = useMemo(...)` — ~righe 222–225
- [ ] Rimuovere `const allCategoriesVisible = useMemo(...)` — ~righe 227–231
- [ ] Rimuovere `const budgetAlerts = useMemo(...)` — ~righe 233–238
- [ ] ⚠️ **Non rimuovere il `useEffect` del cambio tab** — è il solo `useEffect` che rimane in `AppContent`
- [ ] Verificare che `useMemo` non sia più importato da React (rimosso nella Sotto-operazione 2)
  - Se ancora presente: `grep "useMemo" src/App.tsx` → deve restituire 0 risultati

### 5.3 — Verifica finale TypeScript

- [ ] Eseguire `npx tsc --noEmit` → **0 errori** ← VERIFICA FINALE OBBLIGATORIA

---

## Verifica finale

### Conteggio e struttura

- [ ] Contare le righe di `App.tsx`: deve essere **tra 120 e 160**
- [ ] `grep -c "useMemo" src/App.tsx` → **0**
- [ ] `grep "useListNavigation" src/App.tsx` → **0 risultati**
- [ ] Destructuring `useAppData()` ha **9 campi** (contare visivamente)
- [ ] Destructuring `useAuth()` ha **1 campo** (`isAuthenticated`)
- [ ] Destructuring `useVisibleData()` ha **4 campi** (`budgetAlerts, totalBalance, visibleAccounts, visibleTransactions`)
- [ ] `grep -c "useState" src/App.tsx` → **2** (solo `activeTab` e `previousTab`)
- [ ] Il JSX di `AppContent` contiene `<BudgetAlertBanner` ← rimasto in App.tsx (R3)
- [ ] Il JSX di `AppContent` contiene `<Toaster />` ← rimasto in App.tsx (R4)
- [ ] Il JSX di `AppContent` contiene `<FocusIndicator />` ← rimasto in App.tsx (R5)
- [ ] `<DialogsOverlay />` è dentro `<div className="relative">` dopo `</main>`

### TypeScript

- [ ] `npx tsc --noEmit` → **0 errori** (identico al punto di partenza)

### Build

- [ ] `npm run build` → zero errori, bundle generato

### Test funzionali (dal design §8)

- [ ] L'app si avvia senza errori in console
- [ ] Login con PIN globale funziona
- [ ] Setup primo PIN funziona
- [ ] Navigazione tra i tre tab funziona (suono + announce screen reader al cambio tab)
- [ ] Aggiunta di una transazione funziona e aggiorna il saldo
- [ ] Modifica di un conto funziona
- [ ] Eliminazione di un elemento funziona (dialog di conferma appare)
- [ ] Export CSV funziona
- [ ] Sblocco conto privato funziona (toast con saldo)
- [ ] Tutte le scorciatoie da tastiera funzionano
- [ ] `BudgetAlertBanner` appare e si può dismissare

### Test di regressione — componenti estratti P07–P12 (dal design §8)

- [ ] `TransactionsTab` — nessuna regressione
- [ ] `DashboardTab` — nessuna regressione
- [ ] `ReportsTab` — nessuna regressione
- [ ] `AppHeader` funziona correttamente
- [ ] `AuthScreen` funziona correttamente (login e setup PIN globale)
- [ ] `DialogsOverlay` funziona per tutti e sette i dialog

### Obiettivo finale del piano (dal design §8)

- [ ] `App.tsx` contiene solo composizione e routing
- [ ] Nessun handler di business logic in `App.tsx`
- [ ] Nessun calcolo derivato in `App.tsx` (sostituiti da `useVisibleData()`)
- [ ] Nessun dato persistito gestito direttamente in `App.tsx`
- [ ] Nessun `useMemo` in `App.tsx`
- [ ] TypeScript: zero errori

---

***

> 🏁 **Completare questo passo significa completare l'intero piano di refactoring architetturale.**  
> `App.tsx` è ora un file di pura composizione: provider, guard, layout, tab, delegazione ai componenti.  
> Dopo la verifica finale, aggiornare `docs/todo.md` spostando P13 nella sezione "TODO completati".
