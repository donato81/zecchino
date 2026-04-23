# Changelog

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