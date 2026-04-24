# Changelog

## [P15] — 2026-04-24

### Tooling
- Creato `eslint.config.js` (flat config ESLint 9, formato ESModule)
  con 5 layer: `@eslint/js`, `typescript-eslint`, `react-hooks`,
  `react-refresh`, `jsx-a11y`
- Installato `eslint-plugin-jsx-a11y@6.10.2` in `devDependencies`
- `npm run lint` operativo — gate di qualità ripristinato
- Strategia Fase A: tutte le regole in `warn`; nessun errore bloccante
  sul codice esistente
- Baseline avvisi documentata in `docs/2 - coding plans/P15-coding-plan.md`
- Nessun file sotto `src/` modificato — comportamento app invariato

## [P14] — 2026-04-24

### Manutenzione — Pulizia root e riorganizzazione documentazione
- 9 file Markdown spostati dalla root a `docs/`
- 4 file TALKBACK consolidati in `docs/accessibility/talkback.md`
- 4 log storici rimossi dalla root
- 6 file di log tecnici rimossi (build*.txt, build*.log, tsc_output.txt)
- `.gitignore` aggiornato con i pattern `build*.txt`, `build*.log`, `tsc_output.txt`
- `README.md` aggiornato con sezione Documentazione e link a `docs/`
- Nessuna modifica apportata a file sotto `src/`

## [P13] — 2026-04-23

### Refactoring — Passo conclusivo
- `App.tsx` ridotto da 322 righe a 133 righe: rimossi tutti gli import,
  destructuring e calcoli delegati ai passi P01–P12
- Aggiunto `useVisibleData()` come unica fonte per `budgetAlerts`,
  `totalBalance`, `visibleAccounts`, `visibleTransactions`
- Rimossi 10 `useMemo` locali, ~34 import inutilizzati e i destructuring
  non piu necessari da `useAppData()` e `useAuth()`
- Rimosso `useEffect(showDeleteDialog)`: il feedback sonoro e ora gestito
  in `DialogsOverlay`
- Conservato il `useEffect` del cambio tab con feedback sonoro e screen
  reader
- `App.tsx` e ora pura composizione: nessun handler, nessun calcolo
  derivato, nessun dato persistito localmente
- Gate automatici P13: `npx tsc --noEmit` PASS, `npm run build` PASS
- Validazione funzionale interattiva ancora da completare manualmente

## [P12] — 2026-04-23

### Refactoring
- Estratto `src/components/DialogsOverlay.tsx` con i sette dialog modali
  di `App.tsx` (~85 righe JSX rimosse)
- Nessuna modifica ad `AppDataContext`, `AuthContext` o hook: tutti gli
  stati erano già esposti
- Deviazione intenzionale: uso di `privateAccount` da `useVisibleData()`
  al posto di `visibleAccounts.find()` nella callback `onUnlocked` del
  PIN privato (motivazione: correttezza al momento del re-render)
- Import inutilizzati in `App.tsx` lasciati invariati: pulizia rimandata
  a P13

## [P11] — 2026-04-23

### Refactoring
- Estratto `src/components/AuthScreen.tsx` dal blocco JSX `!isAuthenticated` di `App.tsx` (~20 righe JSX rimosse)
- Nessuna modifica ad `AppDataContext` né `AuthContext`: `AuthScreen` dipende solo da `useAuth()`
- `App.tsx`: il guard `if (!isAuthenticated)` rimane; `SkipLink` e `PinDialog` rimangono necessari nel ramo autenticato

## [P10] — 2026-04-23

### Refactoring
- Estratto `src/components/AppHeader.tsx` dal blocco JSX `<header>` di `App.tsx` (~78 righe rimosse)
- Migrato `showKeyboardHelp` / `setShowKeyboardHelp` da `useState` locale in `App.tsx` ad `AppDataContext`
- `App.tsx` ridotto a circa 447 righe (da 522 post-P09)
- Rimosso import `Keyboard` da `App.tsx` (ora usato solo in `AppHeader`)

## [P09] — 2026-04-23

### Refactoring
- Estratto `src/components/ReportsTab.tsx` dal blocco JSX `TabsContent value="reports"` di `App.tsx` (~341 righe rimosse)
- Migrati in `AppDataContext` gli stati dialog budget e savings goal (`showBudgetDialog`, `editingBudget`, `showSavingsGoalDialog`, `editingSavingsGoal`) e l'handler `handleAddFundsToGoal`
- Sostituiti 3 `useMemo` locali in `ReportsTab`: `activeBudgets` (rimpiazza 4 chiamate a `getActiveBudgets`), `topIncomeCategories` e `topExpenseCategories` (rimpiazzano le IIFE nei tooltip)
- Rimosso `chartPeriod` da `App.tsx`; è ora `useState` locale in `ReportsTab`
- `App.tsx` ridotto di circa 346 righe complessive

## [P08] — 2026-04-23

### Refactoring
- Estratto `src/components/DashboardTab.tsx` dal blocco JSX `TabsContent value="dashboard"` di `App.tsx` (~301 righe rimosse)
- Migrati in `AppDataContext` gli stati dialog account (`editingAccount`, `showAccountDialog` e relativi setter)
- Completato il collegamento `onClick` su `AccountCard` (connessione UI pre-esistente ma non collegata)
- Rimosso `recentTransactionsNav` da `App.tsx`; l'hook è ora istanziato localmente in `DashboardTab`
- `App.tsx` ridotto di circa 305 righe complessive (301 JSX + 4 dichiarazioni useState)