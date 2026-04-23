# P13 — Coding Plan: Refactor finale di `App.tsx`

> Documento operativo. Nessun file di codice sorgente viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 13 — **Passo conclusivo** del refactoring architetturale  
> Design di riferimento: `docs/1 - projects/P13-AppTsxFinal-design.md`  
> Data: 23 aprile 2026

---

## Note preliminari

- I numeri di riga indicati sono **approssimativi** (±5 righe) e vanno verificati nell'editor prima di ogni modifica. Sono stati ricavati dal codice reale post-P12 sul branch `refactoring-architettura`.
- Questo pacchetto si implementa in **un unico passo** (non due): opera su un solo file (`src/App.tsx`) e non esiste una fase intermedia verificabile separatamente.
- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P12.
- `src/App.tsx` è a **322 righe** al momento dell'avvio (misurate sul branch post-P12).
- **Unico file modificato**: `src/App.tsx`. Nessun altro file viene toccato.
- **Nessun file nuovo viene creato** in questo passo.
- **L'unica aggiunta consentita**: `import { useVisibleData } from '@/hooks/use-visible-data'` + riga di destructuring con i 4 campi necessari. Tutto il resto è rimozione.
- **Obiettivo righe finali**: 135–145 (finestra accettabile: 120–160).
- ✅ **0 errori TypeScript** al momento dell'avvio (verificato su branch post-P12: `npx tsc --noEmit` → nessun output di errore). Il criterio del Passo 13 è: zero errori anche al termine.

### File non toccati in questo passo

| File | Motivo |
|---|---|
| `src/context/AppDataContext.tsx` | Invariato — già espone tutti i campi necessari |
| `src/context/AuthContext.tsx` | Invariato |
| `src/hooks/use-visible-data.ts` | Invariato — espone tutti i calcoli derivati rimossi da `App.tsx` |
| `src/hooks/use-app-shortcuts.ts` | Invariato |
| `src/components/DialogsOverlay.tsx` | Estratto nel Passo 12; invariato |
| `src/components/AppHeader.tsx` | Estratto nel Passo 10; invariato |
| `src/components/AuthScreen.tsx` | Estratto nel Passo 11; invariato |
| `src/components/DashboardTab.tsx` | Estratto nel Passo 8; invariato |
| `src/components/TransactionsTab.tsx` | Estratto nel Passo 7; invariato |
| `src/components/ReportsTab.tsx` | Estratto nel Passo 9; invariato |
| Tutti gli altri componenti | Invariati |
| `docs/`, `.github/` | Invariati |

---

## Debito tecnico dichiarato

L'obiettivo originale del piano prevedeva ~70 righe per `App.tsx` al termine del Passo 13. La stima era stata formulata prima di conoscere l'entità del codice di accessibilità accumulato:

- Il `useEffect` del cambio tab (screen reader + audio per i tre tab) occupa **~28 righe** nel corpo di `AppContent` e **non può essere rimosso** in questo passo — è il solo `useEffect` che rimane
- Ogni `TabsTrigger` occupa **~10 righe** di JSX con `aria-label`, `data-focus-info`, `aria-controls`, `aria-selected` — tre trigger = ~30 righe JSX tab-list

Estrarre questi blocchi richiederebbe componenti aggiuntivi (es. `TabNavigation`) che eccedono lo scopo del Passo 13 e costituiscono debito separato.

**L'obiettivo architetturale del piano è comunque pienamente raggiunto a ~140 righe**: `App.tsx` conterrà solo composizione, senza handler di business logic, calcoli derivati o dati persistiti gestiti localmente. Nessun `useMemo`, nessun handler, nessun CRUD — solo hook di composizione e JSX strutturale.

---

## Ambiguità rilevate

Le seguenti ambiguità sono state **verificate sul codice effettivo post-P12** prima della stesura di questo piano.

### AI1 — `useListNavigation` non è referenziato nel JSX residuo

**Situazione**: il design §6 avverte di non rimuoverlo senza prima verificare.

**Risultato verifica su `src/App.tsx` post-P12**: `useListNavigation` compare **una sola volta** in tutto il file — solo come riga di import (riga 55). Non è referenziato in nessuna espressione JSX né in nessun handler rimasto nel corpo di `AppContent`.

**Decisione**: `useListNavigation` può essere rimosso nella Sotto-operazione 2. Non c'è alcuna referenza dipendente da preservare.

---

### AI2 — Righe approssimative dei blocchi da rimuovere

**Stima ricavata dal codice effettivo post-P12 (322 righe totali)**:

| Blocco | Righe approssimative | Righe nette rimosse |
|---|---|---|
| (a) Import inutilizzati | ~1–55 (sparsi tra import da conservare) | ~34 righe rimosse su ~55 totali |
| (b) Destructuring `useAppData()` esteso | ~62–120 (~58 righe, ~40 campi) | ~48 righe nette (da ~55 a ~7) |
| (c) Destructuring `useAuth()` esteso | ~121–131 (~10 righe, 10 campi) | ~9 righe nette (da ~10 a ~1) |
| (d) `useMemo` locali + `useEffect` dialog | ~131–240 (sparsi con `useEffect` tab-change incluso) | ~60 righe (10 `useMemo` ~55 rig. + `useEffect` dialog ~5 rig.) |

**Nota**: i numeri di riga sono orientativi. In questo passo non si sta spostando un blocco JSX contiguo come nei passi precedenti — si rimuovono istruzioni sparse alternate ad altri istruzioni da conservare. La verifica corretta è sempre `npx tsc --noEmit`, non il conteggio manuale.

---

### AI3 — `useEffect` apertura dialog (`showDeleteDialog`) ancora presente

**Situazione**: il design §3 Lista B.5 indica che questo `useEffect` deve essere rimosso.

**Risultato verifica su `src/App.tsx` post-P12**: il `useEffect` è **ancora presente** alle righe 131–136:

```tsx
useEffect(() => {
  if (showDeleteDialog) {
    soundSystem.play('dialog-open')
  }
}, [showDeleteDialog])
```

**Decisione**: il `useEffect` è presente e deve essere rimosso nella Sotto-operazione 5. Il dialog di eliminazione è ora in `DialogsOverlay` — l'effetto sonoro di apertura è più corretto gestirlo in prossimità del dialog.

---

### AI4 — Il `useEffect` del cambio tab non è duplicato

**Situazione**: il design §7 segnala il rischio di duplicazione.

**Risultato verifica su tutto il codebase**: `soundSystem.play('tab-change')` compare **una sola volta** in tutto il progetto — solo in `src/App.tsx` (riga 162). `announceNavigation` compare in `src/App.tsx` (riga 171), in `src/hooks/use-screen-reader.ts` (definizione), e in `src/components/ScreenReaderSettings.tsx` (come KV setting, non un'istanza del tab-change). Nessuna duplicazione del `useEffect` di `App.tsx` nei componenti estratti.

**Decisione**: il rischio non si è materializzato. Il `useEffect` del cambio tab rimane solo in `App.tsx` e deve essere conservato integralmente nella Sotto-operazione 5.

---

### AI5 — Zero errori TypeScript dopo P12

**Situazione**: durante i Passi 1–12 erano segnalati 4 errori TypeScript baseline pre-esistenti in `src/context/AuthContext.tsx`. Il design §5 prescrive zero errori al termine del Passo 13.

**Risultato verifica post-P12**: `npx tsc --noEmit` non restituisce nessun output — **zero errori**. I 4 errori baseline risultano risolti durante l'implementazione di P12 (probabilmente la pulizia del Passo B di P12 li ha eliminati implicitamente).

**Decisione**: il punto di partenza del Passo 13 è già a zero errori. Le verifiche intermedie con `npx tsc --noEmit` devono restituire zero errori dopo ogni sotto-operazione. Nessuna tolleranza per errori intermedi.

---

## Rischi

### R1 — Rimozione dei cinque setter passati a `useAppShortcuts` — 🔴 Alto

`setShowTransactionDialog`, `setEditingTransaction`, `setShowAccountDialog`, `setEditingAccount`, `setShowKeyboardHelp` sono presenti nel destructuring di `useAppData()` e vengono passati come argomenti a `useAppShortcuts()`. Dopo la rimozione del JSX dei dialog (avvenuta in P12), questi setter **sembrano inutilizzati** — ma sono ancora necessari. Rimuoverli produce errore TypeScript immediato su `useAppShortcuts`.

**Mitigazione**: nella Sotto-operazione 3, i nove campi del destructuring ridotto sono elencati esplicitamente — non rimuovere nessuno dei cinque setter. Verificare con `npx tsc --noEmit` dopo la riduzione.

### R2 — `useVisibleData` aggiunto parzialmente — 🔴 Alto

L'import di `useVisibleData` e la riga di destructuring devono essere aggiunti **entrambi** e in coerenza. I 4 campi necessari sono esattamente: `budgetAlerts`, `totalBalance`, `visibleAccounts`, `visibleTransactions`. Un import senza destructuring o un destructuring con campi sbagliati produce errore TypeScript.

**Mitigazione**: la Sotto-operazione 1 va eseguita per prima e verificata con TypeScript prima di procedere alle rimozioni. Se l'import è corretto, i campi sono immediatamente disponibili per il `useEffect` del cambio tab e per `BudgetAlertBanner`.

### R3 — `BudgetAlertBanner` rimossa per errore — 🔴 Alto

`BudgetAlertBanner` è un elemento inline nel layout, non un dialog. Rimane nel JSX di `AppContent`, dentro `<main>`. Non va spostata.

**Mitigazione**: non toccare il JSX durante il Passo 13. Tutte le sotto-operazioni riguardano import, destructuring e `useMemo` — non il blocco JSX return.

### R4 — `Toaster` rimosso per errore — 🔴 Alto

`<Toaster />` è figlio diretto del Fragment radice di `AppContent`. Rimane in `App.tsx`.

**Mitigazione**: come R3 — non toccare il JSX.

### R5 — `FocusIndicator` rimosso per errore — 🔴 Alto

`<FocusIndicator />` è il primo figlio del `<div className="relative">` interno. Rimane in `App.tsx`.

**Mitigazione**: come R3 — non toccare il JSX.

### R6 — `useEffect` del cambio tab rimosso insieme agli altri `useEffect` — 🟡 Medio

Il `useEffect` del cambio tab (righe ~165–199) è il **solo** `useEffect` che deve rimanere in `AppContent`. L'altro `useEffect` (`showDeleteDialog`, righe 131–136) deve essere rimosso. Se si rimuovono entrambi, la navigazione tra tab non produce più feedback sonoro né announce per screen reader.

**Mitigazione**: rimuovere **solo** il `useEffect(showDeleteDialog)` — identificabile dalla dipendenza `[showDeleteDialog]`. Il `useEffect` del cambio tab ha dipendenza `[activeTab, previousTab, isAuthenticated, visibleAccounts, visibleTransactions, totalBalance, screenReader]`.

### R7 — Rimozione di un import ancora referenziato — 🟡 Medio

Durante la rimozione degli import, un simbolo che sembra inutilizzato potrebbe essere ancora referenziato in una riga conservata (es. `formatCurrency` è usato nel `useEffect` del cambio tab).

**Mitigazione**: dopo ogni sotto-operazione, eseguire `npx tsc --noEmit` e non procedere se compaiono errori. Non affidarsi al conteggio manuale.

### R8 — Formattazione: righe vuote eccedenti — 🟢 Basso

La rimozione di ~177 righe sparse può lasciare blocchi di righe vuote consecutivi o commenti orfani che rendono il file disordinato.

**Mitigazione**: rimuovere le righe di codice incluse eventuali righe vuote di separazione contigue al blocco rimosso. Non alterare la formattazione del codice che rimane.

---

## Passo unico — Refactor finale `src/App.tsx`

### Rischio: 🔴 Alto
### Prerequisito: P01–P12 completati; branch `refactoring-architettura`; `npx tsc --noEmit` → 0 errori

---

### Sotto-operazione 1 — Aggiunta `useVisibleData`

> **Eseguire prima delle rimozioni per garantire la disponibilità di TypeScript check continuo.**

**1.1 Import**

Aggiungere tra gli import degli hook, dopo la riga di `useAppShortcuts` (~riga 54) e prima degli import dei componenti:

```tsx
import { useVisibleData } from '@/hooks/use-visible-data'
```

**1.2 Destructuring in `AppContent`**

Aggiungere nel corpo di `AppContent`, dopo il destructuring di `useAuth()`:

```tsx
const { budgetAlerts, totalBalance, visibleAccounts, visibleTransactions } = useVisibleData()
```

> ⚠️ Esattamente questi 4 campi — non aggiungerne altri.  
> ⚠️ `budgetAlerts` → usato nella condizione `{budgetAlerts.length > 0 && <BudgetAlertBanner ...>}`  
> ⚠️ `totalBalance`, `visibleAccounts`, `visibleTransactions` → usati nel `useEffect` del cambio tab

**Verifica intermedia 1**: `npx tsc --noEmit` → **0 errori**

---

### Sotto-operazione 2 — Rimozione import inutilizzati (~34 righe)

Rimuovere i seguenti import da `src/App.tsx`. L'ordine suggerito è dall'alto verso il basso per non perdere il riferimento alle righe.

**Da riga ~1 — blocco React**:
- Rimuovere `useMemo` dalla riga `import { useState, useEffect, useMemo } from 'react'`  
  → diventa: `import { useState, useEffect } from 'react'`

**Da righe ~2–7 — types, helpers, systems**:
- Rimuovere intera riga: `import { Account, Transaction, Budget, SavingsGoal } from '@/lib/types'`
- Nella riga helpers, rimuovere `calculateAccountBalance`, `getTotalBalance`, `getActiveBudgets`, lasciando: `import { formatCurrency } from '@/lib/helpers'`
- Rimuovere intera riga: `import { generateBudgetAlerts } from '@/lib/budget-alerts'`

**Da righe ~12–55 — componenti e UI (tutti inutilizzati dopo P07–P12)**:
- `import { PinDialog } from '@/components/PinDialog'`
- `import { AccountCard } from '@/components/AccountCard'`
- `import { AccountDialog } from '@/components/AccountDialog'`
- `import { TransactionDialog } from '@/components/TransactionDialog'`
- `import { BudgetDialog } from '@/components/BudgetDialog'`
- `import { BudgetProgressCard } from '@/components/BudgetProgressCard'`
- `import { BudgetHistoryChart } from '@/components/BudgetHistoryChart'`
- `import { BudgetComparisonCard } from '@/components/BudgetComparisonCard'`
- `import { BudgetForecastCard } from '@/components/BudgetForecastCard'`
- `import { SavingsGoalDialog } from '@/components/SavingsGoalDialog'`
- `import { SavingsGoalCard } from '@/components/SavingsGoalCard'`
- `import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'`
- `import { AudioSettings } from '@/components/AudioSettings'`
- `import { HapticSettings } from '@/components/HapticSettings'`
- `import { ScreenReaderSettings } from '@/components/ScreenReaderSettings'`
- `import { TalkBackSettings } from '@/components/TalkBackSettings'`
- `import { DisplaySettings } from '@/components/DisplaySettings'`
- `import { SecuritySettings } from '@/components/SecuritySettings'`
- `import { CategoryManagement } from '@/components/CategoryManagement'`
- `import { DataManagement } from '@/components/DataManagement'`
- `import { IncomeExpenseChart } from '@/components/IncomeExpenseChart'`
- `import { MonthlyComparisonChart } from '@/components/MonthlyComparisonChart'`
- `import { PeriodSelector } from '@/components/PeriodSelector'`
- `import { Button } from '@/components/ui/button'`
- Nella riga Tabs, rimuovere `TabsContent`: `import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'`
- `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'`
- `import { Separator } from '@/components/ui/separator'`
- `import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'`
- `import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'`
- Nella riga Phosphor, rimuovere le icone non usate, lasciando solo `ChartLine, List, ArrowsLeftRight`: `import { ChartLine, List, ArrowsLeftRight } from '@phosphor-icons/react'`
- `import { toast } from 'sonner'`
- `import { useListNavigation } from '@/hooks/use-list-navigation'` ← **AI1: confermato non referenziato, rimuovibile**

> ⚠️ **Conservare** i seguenti import: `useState, useEffect` (React), `formatCurrency` (helpers), `soundSystem`, `hapticSystem`, `useScreenReader`, `useIsMobile`, `AppDataProvider/useAppData`, `AuthProvider/useAuth`, `useAppShortcuts`, `SkipLink`, `FocusIndicator`, `AppHeader`, `BudgetAlertBanner`, `DashboardTab`, `TransactionsTab`, `ReportsTab`, `AuthScreen`, `DialogsOverlay`, `Tabs/TabsList/TabsTrigger`, `Badge`, `ChartLine/List/ArrowsLeftRight`, `Toaster`

**Verifica intermedia 2**: `npx tsc --noEmit` → **0 errori**

---

### Sotto-operazione 3 — Riduzione destructuring `useAppData()` (~48 righe nette)

Il blocco di destructuring da `useAppData()` occupa attualmente ~58 righe con ~40 campi (~righe 62–120).

**Sostituire l'intero blocco** con:

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

> ⚠️ **R1 — CRITICO**: `setShowTransactionDialog`, `setEditingTransaction`, `setShowAccountDialog`, `setEditingAccount`, `setShowKeyboardHelp` **devono rimanere** — vengono passati come argomenti a `useAppShortcuts()`. Rimuoverli causa errore TypeScript immediato.

> ⚠️ `handleDismissBudgetAlert`, `handleViewBudget`, `setEditingBudget`, `setShowBudgetDialog` **devono rimanere** — usati nelle props di `BudgetAlertBanner` nel JSX.

**Verifica intermedia 3**: `npx tsc --noEmit` → **0 errori**

---

### Sotto-operazione 4 — Riduzione destructuring `useAuth()` (~9 righe nette)

Il blocco di destructuring da `useAuth()` occupa attualmente ~10 righe con 10 campi (~righe 121–131).

**Sostituire l'intero blocco** con:

```tsx
const { isAuthenticated } = useAuth()
```

> ⚠️ `isAuthenticated` è l'**unico campo** che rimane — è il guard del ramo `if (!isAuthenticated) return <AuthScreen />`.

**Verifica intermedia 4**: `npx tsc --noEmit` → **0 errori**

---

### Sotto-operazione 5 — Rimozione `useMemo` locali e `useEffect` dialog (~60 righe)

**5.1 Rimozione `useEffect(showDeleteDialog)`** — AI3: confermato ancora presente

Rimuovere il blocco alle righe ~131–136:

```tsx
useEffect(() => {
  if (showDeleteDialog) {
    soundSystem.play('dialog-open')
  }
}, [showDeleteDialog])
```

> ⚠️ Questo `useEffect` ha dipendenza `[showDeleteDialog]`. Il `useEffect` del cambio tab ha dipendenza `[activeTab, previousTab, ...]` — sono distinguibili inequivocabilmente.

**5.2 Rimozione dei dieci `useMemo` locali**

Rimuovere nell'ordine:
1. `const visibleAccounts = useMemo(...)` — ~righe 138–145
2. `const visibleTransactions = useMemo(...)` — ~righe 147–150
3. `const hasPrivateAccount = safeAccounts.some(...)` — ~riga 152 (non è un `useMemo` ma una riga derivata)
4. `const privateAccount = safeAccounts.find(...)` — ~riga 153 (idem)
5. `const totalBalance = useMemo(...)` — ~righe 155–157
6. `const recentTransactions = useMemo(...)` — ~righe 200–204
7. `const groupedAccounts = useMemo(...)` — ~righe 206–220
8. `const filteredGroupedAccounts = useMemo(...)` — ~righe 222–225
9. `const allCategoriesVisible = useMemo(...)` — ~righe 227–231
10. `const budgetAlerts = useMemo(...)` — ~righe 233–238

> ⚠️ **Non rimuovere il `useEffect` del cambio tab** — le sue dipendenze (`visibleAccounts`, `visibleTransactions`, `totalBalance`) arrivano ora da `useVisibleData()` già destructurato nella Sotto-operazione 1.

> ⚠️ **Non rimuovere `useMemo` dall'import React in questo punto**: `useMemo` da React è già stato rimosso nella Sotto-operazione 2. Se non lo è stato, rimuoverlo ora — verificare che nessun `useMemo` rimanga nel file prima di rimuovere l'import.

**Verifica finale**: `npx tsc --noEmit` → **0 errori**

---

## Tabella riepilogativa

| Sotto-operazione | Tipo | Righe rimosse | Righe aggiunte | Netto |
|---|---|---|---|---|
| 1 — Aggiunta `useVisibleData` | Aggiunta | 0 | +2 | +2 |
| 2 — Import inutilizzati | Rimozione | ~34 | 0 | −34 |
| 3 — Riduzione destructuring `useAppData()` | Rimozione | ~48 | 0 | −48 |
| 4 — Riduzione destructuring `useAuth()` | Rimozione | ~9 | 0 | −9 |
| 5 — `useMemo` locali + `useEffect` dialog | Rimozione | ~65 | 0 | −65 |
| **Totale** | | **~156** | **2** | **~−154** |

| Metrica | Valore |
|---|---|
| Righe di partenza (post-P12) | 322 |
| Righe rimosse nette | ~154 |
| Righe finali attese | ~168 *(prima della compressione spazi)* |
| Righe finali stimati con ottimizzazione formattazione | **135–145** |

> **Nota sul conteggio**: le righe rimosse stimate sono larghe (+5/-5); il file finale potrebbe attestarsi tra 120 e 160 righe. La finestra accettabile (120–160) copre tutte le varianti realistiche.

---

## Schema riepilogativo del passo unico

```
P13 — Passo Unico: Refactor finale App.tsx (322 righe → ~140 righe)
│
├── Pre-condizione: branch refactoring-architettura, tsc → 0 errori
│
├── Sotto-operazione 1 — Aggiunta useVisibleData
│   ├── import { useVisibleData } aggiunto agli hook imports
│   ├── const { budgetAlerts, totalBalance, visibleAccounts, visibleTransactions } = useVisibleData()
│   └── ✓ tsc → 0 errori
│
├── Sotto-operazione 2 — Rimozione import inutilizzati (~34 righe)
│   ├── useMemo rimosso da React import
│   ├── Account, Transaction, Budget, SavingsGoal rimossi
│   ├── helpers/budget-alerts/icons ridotti
│   ├── ~24 import componenti rimossi (spostati in P07–P12)
│   ├── useListNavigation rimosso (AI1: non referenziato)
│   └── ✓ tsc → 0 errori
│
├── Sotto-operazione 3 — Riduzione destructuring useAppData() (~48 righe)
│   ├── Da ~40 campi a 9 campi espliciti
│   ├── ⚠️ 5 setter per useAppShortcuts conservati
│   ├── ⚠️ 4 campi BudgetAlertBanner conservati
│   └── ✓ tsc → 0 errori
│
├── Sotto-operazione 4 — Riduzione destructuring useAuth() (~9 righe)
│   ├── Da 10 campi a 1 campo: { isAuthenticated }
│   └── ✓ tsc → 0 errori
│
├── Sotto-operazione 5 — Rimozione useMemo + useEffect dialog (~60 righe)
│   ├── useEffect(showDeleteDialog) rimosso (AI3: ancora presente in App.tsx)
│   ├── 10 useMemo locali rimossi (tutti forniti da useVisibleData)
│   ├── ⚠️ useEffect cambio tab CONSERVATO integralmente
│   └── ✓ tsc → 0 errori (verifica finale)
│
└── Post-condizione: App.tsx ~135–145 righe, pura composizione
    ✅ Nessun useMemo locale
    ✅ Nessun handler locale
    ✅ Nessun dato persistito locale
    ✅ tsc → 0 errori

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 PASSO CONCLUSIVO — Refactoring architetturale completato
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Verifica finale

### TypeScript

- [ ] `npx tsc --noEmit` → **0 errori**

### Conteggio e struttura

- [ ] `wc -l src/App.tsx` (o conteggio righe nell'editor) → **120–160 righe**
- [ ] Nessun `useMemo` nel file: `grep -c "useMemo" src/App.tsx` → `0`
- [ ] Nessun handler locale: `grep -c "handle\|Handle" src/App.tsx` → `0` nel corpo di `AppContent` (eccetto nei parametri passati a `useAppShortcuts` e `BudgetAlertBanner`)
- [ ] Destructuring `useAppData()` ha al massimo 9 campi
- [ ] Destructuring `useAuth()` ha al massimo 1 campo (`isAuthenticated`)
- [ ] Destructuring `useVisibleData()` ha esattamente 4 campi
- [ ] `grep "useListNavigation" src/App.tsx` → 0 risultati
- [ ] `grep "useMemo" src/App.tsx` → 0 risultati

### Test di build

- [ ] `npm run build` → zero errori, bundle generato

### Test funzionali

- [ ] L'app si avvia senza errori in console
- [ ] Login con PIN globale funziona
- [ ] Setup primo PIN funziona
- [ ] Navigazione tra i tre tab funziona (suono + announce screen reader)
- [ ] Aggiunta di una transazione funziona e aggiorna il saldo
- [ ] Modifica di un conto funziona
- [ ] Eliminazione di un elemento funziona (dialog di conferma)
- [ ] Export CSV funziona
- [ ] Sblocco conto privato funziona (toast con saldo)
- [ ] Tutte le scorciatoie da tastiera funzionano
- [ ] `BudgetAlertBanner` appare e si può dismissare

### Test di regressione

- [ ] `TransactionsTab` — nessuna regressione
- [ ] `DashboardTab` — nessuna regressione
- [ ] `ReportsTab` — nessuna regressione
- [ ] `AppHeader` funziona correttamente
- [ ] `AuthScreen` funziona correttamente (login e setup PIN globale)
- [ ] `DialogsOverlay` funziona per tutti e sette i dialog

### Obiettivo finale del piano

- [ ] `App.tsx` contiene solo composizione e routing
- [ ] Nessun handler di business logic in `App.tsx`
- [ ] Nessun calcolo derivato in `App.tsx` (sostituiti da `useVisibleData()`)
- [ ] Nessun dato persistito gestito direttamente in `App.tsx`
- [ ] Nessun `useMemo` in `App.tsx`
- [ ] TypeScript: zero errori

---

> 🏁 **Il Passo 13 è il passo conclusivo dell'intera serie di refactoring.**  
> Al termine di questo passo, l'obiettivo architetturale del piano è completato:  
> `App.tsx` è un file di pura composizione — provider, guard di autenticazione,  
> layout strutturale, navigazione tab, delegazione ai componenti estratti.
