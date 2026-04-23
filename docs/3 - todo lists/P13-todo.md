# P13 — Todo List: Refactor finale di `App.tsx`

> Checklist operativa sequenziale per il Pacchetto 13 — **Passo conclusivo** del refactoring architetturale.  
> Coding Plan di riferimento: `docs/2 - coding plans/P13-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P13-AppTsxFinal-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [x] Leggere `docs/2 - coding plans/P13-coding-plan.md` per intero
- [x] ⚠️ **Questo passo modifica SOLO `src/App.tsx`** — nessun altro file viene toccato
- [x] ⚠️ **Nessun file nuovo viene creato** — P13 è un passo di pura rimozione
- [x] ⚠️ **L'unica aggiunta consentita**: import `useVisibleData` + riga di destructuring con 4 campi
- [x] Verificare di essere sul branch `refactoring-architettura`
- [x] Eseguire `npx tsc --noEmit` prima di iniziare → annotare il numero di errori come **punto di partenza**
  - ⚠️ Risultato atteso (verificato post-P12): **0 errori**
  - Il confronto finale sarà: punto di partenza = 0 errori, punto di arrivo = 0 errori
- [x] Prendere nota dei risultati delle ambiguità verificate nel coding plan:
  - [x] **AI1**: `useListNavigation` → import riga ~55, non referenziato altrove → **rimuovibile**
  - [x] **AI2**: blocchi approssimativi — (a) import ~riga 1–55, (b) destructuring `useAppData()` ~righe 62–120, (c) destructuring `useAuth()` ~righe 121–131, (d) `useMemo` locali ~righe 138–240
  - [x] **AI3**: `useEffect(showDeleteDialog)` ancora presente in App.tsx righe ~131–136 → **da rimuovere**
  - [x] **AI4**: `useEffect` cambio tab NON duplicato — solo in App.tsx → **conservare**
  - [x] **AI5**: 0 errori TypeScript di partenza — nessuna tolleranza per nuovi errori durante le sotto-operazioni
- [x] Prendere nota dei rischi critici 🔴:
  - [x] **R1**: `setShowTransactionDialog`, `setEditingTransaction`, `setShowAccountDialog`, `setEditingAccount`, `setShowKeyboardHelp` — **devono rimanere** nel destructuring di `useAppData()`
  - [x] **R2**: import `useVisibleData` + destructuring — **entrambi** obbligatori, con esattamente 4 campi
  - [x] **R3**: `BudgetAlertBanner` rimane nel JSX — non toccare il blocco return
  - [x] **R4**: `Toaster` rimane nel JSX — non toccare il blocco return
  - [x] **R5**: `FocusIndicator` rimane nel JSX — non toccare il blocco return

---

## Passo unico — Sotto-operazione 1: Aggiunta `useVisibleData`

> **Eseguire prima di qualsiasi rimozione** — garantisce disponibilità dei campi durante le verifiche TypeScript successive.

- [x] Aprire `src/App.tsx`
- [x] Aggiungere l'import di `useVisibleData` dopo la riga di `useAppShortcuts` (~riga 54), prima degli import dei componenti:
  ```tsx
  import { useVisibleData } from '@/hooks/use-visible-data'
  ```
- [x] Aggiungere nel corpo di `AppContent`, dopo il destructuring di `useAuth()`:
  ```tsx
  const { budgetAlerts, totalBalance, visibleAccounts, visibleTransactions } = useVisibleData()
  ```
- [x] ⚠️ Verificare che i campi siano esattamente questi 4: `budgetAlerts`, `totalBalance`, `visibleAccounts`, `visibleTransactions` — non aggiungerne altri
- [x] ⚠️ Verificare che sia l'**import** sia il **destructuring** siano stati aggiunti — non solo uno dei due (R2)
- [x] Eseguire `npx tsc --noEmit` → **0 errori**
- [x] ⚠️ Non procedere alla Sotto-operazione 2 se TypeScript segnala errori

---

## Passo unico — Sotto-operazione 2: Rimozione import inutilizzati

- [x] **Riga import React (~riga 1)**: rimuovere `useMemo` lasciando `useState, useEffect`
  ```tsx
  import { useState, useEffect } from 'react'
  ```
- [x] **Types (~riga 2)**: rimuovere l'intera riga:
  ```tsx
  import { Account, Transaction, Budget, SavingsGoal } from '@/lib/types'
  ```
- [x] **Helpers (~riga 4)**: rimuovere `calculateAccountBalance`, `getTotalBalance`, `getActiveBudgets`, lasciando solo `formatCurrency`
- [x] **Budget alerts (~riga 6)**: rimuovere l'intera riga:
  ```tsx
  import { generateBudgetAlerts } from '@/lib/budget-alerts'
  ```
- [x] **Componenti dialog** — rimuovere ognuna delle seguenti righe:
  - [x] `import { PinDialog } from '@/components/PinDialog'`
  - [x] `import { AccountCard } from '@/components/AccountCard'`
  - [x] `import { AccountDialog } from '@/components/AccountDialog'`
  - [x] `import { TransactionDialog } from '@/components/TransactionDialog'`
  - [x] `import { BudgetDialog } from '@/components/BudgetDialog'`
  - [x] `import { BudgetProgressCard } from '@/components/BudgetProgressCard'`
  - [x] `import { BudgetHistoryChart } from '@/components/BudgetHistoryChart'`
  - [x] `import { BudgetComparisonCard } from '@/components/BudgetComparisonCard'`
  - [x] `import { BudgetForecastCard } from '@/components/BudgetForecastCard'`
  - [x] `import { SavingsGoalDialog } from '@/components/SavingsGoalDialog'`
  - [x] `import { SavingsGoalCard } from '@/components/SavingsGoalCard'`
  - [x] `import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'`
  - [x] `import { AudioSettings } from '@/components/AudioSettings'`
  - [x] `import { HapticSettings } from '@/components/HapticSettings'`
  - [x] `import { ScreenReaderSettings } from '@/components/ScreenReaderSettings'`
  - [x] `import { TalkBackSettings } from '@/components/TalkBackSettings'`
  - [x] `import { DisplaySettings } from '@/components/DisplaySettings'`
  - [x] `import { SecuritySettings } from '@/components/SecuritySettings'`
  - [x] `import { CategoryManagement } from '@/components/CategoryManagement'`
  - [x] `import { DataManagement } from '@/components/DataManagement'`
  - [x] `import { IncomeExpenseChart } from '@/components/IncomeExpenseChart'`
  - [x] `import { MonthlyComparisonChart } from '@/components/MonthlyComparisonChart'`
  - [x] `import { PeriodSelector } from '@/components/PeriodSelector'`
- [x] **UI components** — rimuovere ognuna delle seguenti righe:
  - [x] `import { Button } from '@/components/ui/button'`
  - [x] Nella riga Tabs, rimuovere `TabsContent` lasciando `Tabs, TabsList, TabsTrigger`
  - [x] `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'`
  - [x] `import { Separator } from '@/components/ui/separator'`
  - [x] `import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'`
  - [x] `import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'`
- [x] **Icone Phosphor**: ridurre la riga lasciando solo `ChartLine, List, ArrowsLeftRight`
- [x] **Sonner**: rimuovere `import { toast } from 'sonner'`
- [x] **Hook non usato** — ⚠️ verificare AI1: `useListNavigation` non è referenziato → rimuovere:
  ```tsx
  import { useListNavigation } from '@/hooks/use-list-navigation'
  ```
- [x] ⚠️ **Non rimuovere**: `useState, useEffect` (React), `formatCurrency`, `soundSystem`, `hapticSystem`, `useScreenReader`, `useIsMobile`, `AppDataProvider/useAppData`, `AuthProvider/useAuth`, `useAppShortcuts`, `SkipLink`, `FocusIndicator`, `AppHeader`, `BudgetAlertBanner`, `DashboardTab`, `TransactionsTab`, `ReportsTab`, `AuthScreen`, `DialogsOverlay`, `Tabs/TabsList/TabsTrigger`, `Badge`, `ChartLine/List/ArrowsLeftRight`, `Toaster`
- [x] Eseguire `npx tsc --noEmit` → **0 errori**
- [x] ⚠️ Non procedere alla Sotto-operazione 3 se TypeScript segnala errori

---

## Passo unico — Sotto-operazione 3: Riduzione destructuring `useAppData()`

- [x] Individuare il blocco `const { ... } = useAppData()` nel corpo di `AppContent` (~righe 62–120)
- [x] Sostituire l'intero blocco con:
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
- [x] ⚠️ **R1 — CRITICO**: verificare che tutti e cinque i seguenti setter siano presenti nel destructuring ridotto — **vengono passati a `useAppShortcuts()`**:
  - [x] `setShowTransactionDialog`
  - [x] `setEditingTransaction`
  - [x] `setShowAccountDialog`
  - [x] `setEditingAccount`
  - [x] `setShowKeyboardHelp`
- [x] ⚠️ Verificare che i quattro campi per `BudgetAlertBanner` siano presenti:
  - [x] `handleDismissBudgetAlert`
  - [x] `handleViewBudget`
  - [x] `setEditingBudget`
  - [x] `setShowBudgetDialog`
- [x] Verificare che il destructuring risultante abbia **esattamente 9 campi**
- [x] Eseguire `npx tsc --noEmit` → **0 errori**
- [x] ⚠️ Non procedere alla Sotto-operazione 4 se TypeScript segnala errori

---

## Passo unico — Sotto-operazione 4: Riduzione destructuring `useAuth()`

- [x] Individuare il blocco `const { ... } = useAuth()` nel corpo di `AppContent` (~righe 121–131)
- [x] Sostituire l'intero blocco con:
  ```tsx
  const { isAuthenticated } = useAuth()
  ```
- [x] ⚠️ `isAuthenticated` è l'**unico campo** che rimane — è il guard `if (!isAuthenticated) return <AuthScreen />`
- [x] Verificare che non rimanga nessun altro campo di `useAuth()` nel corpo di `AppContent`
- [x] Eseguire `npx tsc --noEmit` → **0 errori**
- [x] ⚠️ Non procedere alla Sotto-operazione 5 se TypeScript segnala errori

---

## Passo unico — Sotto-operazione 5: Rimozione `useMemo` locali e `useEffect` dialog

### 5.1 — Rimozione `useEffect(showDeleteDialog)`

- [x] ⚠️ Verificare AI3: il `useEffect(showDeleteDialog)` è confermato presente alle righe ~131–136
- [x] Identificare il blocco per la sua dipendenza `[showDeleteDialog]`:
  ```tsx
  useEffect(() => {
    if (showDeleteDialog) {
      soundSystem.play('dialog-open')
    }
  }, [showDeleteDialog])
  ```
- [x] Rimuovere il blocco
- [x] ⚠️ **Non rimuovere** il `useEffect` con dipendenza `[activeTab, previousTab, isAuthenticated, visibleAccounts, visibleTransactions, totalBalance, screenReader]` — quello è il `useEffect` del cambio tab che **deve rimanere**

### 5.2 — Rimozione dei dieci `useMemo` locali

- [x] Rimuovere `const visibleAccounts = useMemo(...)` — ~righe 138–145
  - (ora fornito da `useVisibleData()` già destructurato)
- [x] Rimuovere `const visibleTransactions = useMemo(...)` — ~righe 147–150
- [x] Rimuovere `const hasPrivateAccount = safeAccounts.some(...)` — ~riga 152
- [x] Rimuovere `const privateAccount = safeAccounts.find(...)` — ~riga 153
- [x] Rimuovere `const totalBalance = useMemo(...)` — ~righe 155–157
- [x] Rimuovere `const recentTransactions = useMemo(...)` — ~righe 200–204
- [x] Rimuovere `const groupedAccounts = useMemo(...)` — ~righe 206–220
- [x] Rimuovere `const filteredGroupedAccounts = useMemo(...)` — ~righe 222–225
- [x] Rimuovere `const allCategoriesVisible = useMemo(...)` — ~righe 227–231
- [x] Rimuovere `const budgetAlerts = useMemo(...)` — ~righe 233–238
- [x] ⚠️ **Non rimuovere il `useEffect` del cambio tab** — è il solo `useEffect` che rimane in `AppContent`
- [x] Verificare che `useMemo` non sia più importato da React (rimosso nella Sotto-operazione 2)
  - Se ancora presente: `grep "useMemo" src/App.tsx` → deve restituire 0 risultati

### 5.3 — Verifica finale TypeScript

- [x] Eseguire `npx tsc --noEmit` → **0 errori** ← VERIFICA FINALE OBBLIGATORIA

---

## Verifica finale

### Conteggio e struttura

- [x] Contare le righe di `App.tsx`: deve essere **tra 120 e 160**
- [x] `grep -c "useMemo" src/App.tsx` → **0**
- [x] `grep "useListNavigation" src/App.tsx` → **0 risultati**
- [x] Destructuring `useAppData()` ha **9 campi** (contare visivamente)
- [x] Destructuring `useAuth()` ha **1 campo** (`isAuthenticated`)
- [x] Destructuring `useVisibleData()` ha **4 campi** (`budgetAlerts, totalBalance, visibleAccounts, visibleTransactions`)
- [x] `grep -c "useState" src/App.tsx` → **2** (solo `activeTab` e `previousTab`)
- [x] Il JSX di `AppContent` contiene `<BudgetAlertBanner` ← rimasto in App.tsx (R3)
- [x] Il JSX di `AppContent` contiene `<Toaster />` ← rimasto in App.tsx (R4)
- [x] Il JSX di `AppContent` contiene `<FocusIndicator />` ← rimasto in App.tsx (R5)
- [x] `<DialogsOverlay />` è dentro `<div className="relative">` dopo `</main>`

### TypeScript

- [x] `npx tsc --noEmit` → **0 errori** (identico al punto di partenza)

### Build

- [x] `npm run build` → zero errori, bundle generato

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

**Implementazione completata il 2026-04-23.**
**Gate automatici superati: TypeScript 0 errori, build PASS, `App.tsx` a 133 righe.**
**Validazione funzionale manuale ancora richiesta sui 33 scenari interattivi in preview browser.**
