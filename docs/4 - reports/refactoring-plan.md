# Piano di Refactoring — `src/App.tsx`

> Documento di sola pianificazione. **Nessun file deve essere modificato.**
> Data analisi: 21 aprile 2026
> Dimensione attuale: ~1812 righe
> Obiettivo: App.tsx ridotto a 50–100 righe di solo routing/composizione

---

## FASE 1 — MAPPA DEI BLOCCHI LOGICI

### 1.1 Inventario blocchi in `App.tsx`

#### A. Stato KV (persistito con `useKV`)

| Nome stato | Chiave KV | Tipo |
|---|---|---|
| `globalPinHash / setGlobalPinHash` | `'global-pin-hash'` | `string` |
| `privatePinHash / setPrivatePinHash` | `'private-pin-hash'` | `string` |
| `accounts / setAccounts` | `'accounts'` | `Account[]` |
| `transactions / setTransactions` | `'transactions'` | `Transaction[]` |
| `categories / setCategories` | `'categories'` | `Category[]` |
| `budgets / setBudgets` | `'budgets'` | `Budget[]` |
| `savingsGoals / setSavingsGoals` | `'savings-goals'` | `SavingsGoal[]` |
| `visibleCategories / setVisibleCategories` | `'visible-categories'` | `string[]` |
| `dismissedAlerts / setDismissedAlerts` | `'dismissed-budget-alerts'` | `string[]` |
| `budgetPercentages / setBudgetPercentages` | `'budget-percentages'` | `Record<string, number>` |

#### B. Stato effimero (`useState`)

| Nome stato | Responsabilità |
|---|---|
| `isAuthenticated` | Flag accesso globale |
| `isPrivateUnlocked` | Flag accesso conto privato |
| `isSetupMode` | Flag primo avvio (creazione PIN) |
| `showPinDialog` | Visibilità dialog PIN globale |
| `showPrivatePinDialog` | Visibilità dialog PIN privato |
| `showAccountDialog` | Visibilità dialog conto |
| `showTransactionDialog` | Visibilità dialog movimento |
| `showBudgetDialog` | Visibilità dialog budget |
| `showSavingsGoalDialog` | Visibilità dialog obiettivo risparmio |
| `showDeleteDialog` | Visibilità dialog conferma eliminazione |
| `showKeyboardHelp` | Visibilità dialog scorciatoie tastiera |
| `editingAccount` | Conto in modifica |
| `editingTransaction` | Movimento in modifica |
| `editingBudget` | Budget in modifica |
| `editingSavingsGoal` | Obiettivo in modifica |
| `deletingItem` | Item da eliminare (tipo + id) |
| `activeTab` | Tab attiva |
| `previousTab` | Tab precedente (per effetti audio) |
| `chartPeriod` | Periodo selezionato per i grafici |

#### C. Valori derivati (`useMemo`)

| Nome | Dipendenze | Descrizione |
|---|---|---|
| `safeAccounts` | `accounts` | Null-coalescing (`accounts \|\| []`) |
| `safeTransactions` | `transactions` | Null-coalescing |
| `safeCategories` | `categories` | Null-coalescing |
| `safeBudgets` | `budgets` | Null-coalescing |
| `safeSavingsGoals` | `savingsGoals` | Null-coalescing |
| `visibleAccounts` | `safeAccounts`, `isPrivateUnlocked` | Filtra conti privati se non sbloccato |
| `visibleTransactions` | `safeTransactions`, `visibleAccounts` | Solo transazioni di conti visibili |
| `hasPrivateAccount` | `safeAccounts` | Flag: esiste almeno un conto privato |
| `privateAccount` | `safeAccounts` | Riferimento al conto privato |
| `totalBalance` | `visibleAccounts`, `visibleTransactions` | Saldo consolidato |
| `recentTransactions` | `visibleTransactions` | Ultime 10 transazioni ordinate per data |
| `groupedAccounts` | `visibleAccounts` | Conti raggruppati per categoria |
| `filteredGroupedAccounts` | `groupedAccounts`, `visibleCategories` | Gruppi filtrati per visibilità |
| `allCategoriesVisible` | `visibleCategories` | Flag: tutte le categorie visibili |
| `budgetAlerts` | `safeBudgets`, `visibleTransactions`, `dismissedAlerts` | Alert budget attivi non dismissi |

#### D. Effetti (`useEffect`)

| # | Trigger | Comportamento |
|---|---|---|
| 1 | Mount | Se no PIN → setup mode + dialog. Se categorie vuote → inizializza default |
| 2 | `showDeleteDialog` | Suona `dialog-open` all'apertura |
| 3 | `activeTab` | Annunci screen reader al cambio tab + suono + haptic |

#### E. Handler — autenticazione

- `handleGlobalPinSubmit(pin)` — crea o verifica PIN globale; imposta `isAuthenticated`
- `handlePrivatePinSubmit(pin)` — crea o verifica PIN privato; imposta `isPrivateUnlocked`; **usa `visibleAccounts` e `visibleTransactions`** per annunciare il saldo al login

#### F. Handler — CRUD dati

- `handleSaveAccount(account)` — crea/aggiorna conto; suono + haptic + toast + screen reader
- `handleSaveTransaction(transaction)` — crea/aggiorna movimento; chiama `checkBudgetNotifications`
- `checkBudgetNotifications(updatedTransactions)` — verifica soglie budget sulle nuove transazioni; toast + suono + haptic
- `handleSaveBudget(budget)` — crea/aggiorna budget
- `handleSaveSavingsGoal(goal)` — crea/aggiorna obiettivo risparmio
- `handleAddFundsToGoal(goal)` — shortcut: apre dialog obiettivo in edit mode
- `handleDeleteConfirm()` — elimina conto/transazione/budget/obiettivo in base a `deletingItem`
- `handleExportCSV()` — esporta visibleTransactions in CSV e avvia download

#### G. Handler — UI / filtri

- `toggleCategoryVisibility(categoryId)` — toggle visibilità singola categoria
- `toggleAllCategories()` — toggle tutte le categorie
- `handleDismissBudgetAlert(budgetId)` — aggiunge budgetId ai dismissedAlerts
- `handleViewBudget(budgetId)` — naviga al tab reports e apre il budget in edit

#### H. Navigazione da tastiera

- `recentTransactionsNav` — `useListNavigation` per movimenti recenti nella dashboard
- `allTransactionsNav` — `useListNavigation` per tutti i movimenti nel tab transactions
- `useKeyboardShortcuts(shortcuts, isAuthenticated)` — registra 15 shortcut globali (navigazione tab, nuovi item, filtri categorie, sblocco privato, help)

#### I. JSX inline (componenti non ancora estratti)

| Blocco JSX | Righe approssimative | Descrizione |
|---|---|---|
| `AuthScreen` | 770–795 | Schermata gradient + PinDialog quando `!isAuthenticated` |
| `AppHeader` | 797–865 | Header sticky: logo, saldo totale, bottone keyboard |
| `BudgetAlertBanner area` | 866–876 | Wrapper condizionale dell'alert banner |
| `TabsList` | 899–940 | I tre tab trigger con badge scorciatoia |
| `DashboardTab` (TabsContent) | 940–1240 | Sezione conti, filtri categorie, movimenti recenti |
| `TransactionsTab` (TabsContent) | 1241–1385 | Lista completa movimenti con export |
| `ReportsTab` (TabsContent) | 1386–1723 | Statistiche, budget, previsioni, obiettivi, impostazioni |
| `DialogsOverlay` | 1724–1805 | Tutti i dialog sovrapposti (6 dialoghi + AlertDialog) |

---

### 1.2 Mappa delle dipendenze

| Blocco | Dipende da | Usato da |
|---|---|---|
| Stato KV dati | `useKV`, `@github/spark/hooks` | Handler F, Handler G, computed C |
| Stato KV auth | `useKV` | Handler E, visibleAccounts |
| `visibleAccounts` | `safeAccounts`, `isPrivateUnlocked` | `visibleTransactions`, `totalBalance`, `recentTransactions`, `groupedAccounts`, `handlePrivatePinSubmit`, JSX dashboard |
| `visibleTransactions` | `safeTransactions`, `visibleAccounts` | `totalBalance`, `recentTransactions`, `budgetAlerts`, JSX transactions, JSX reports |
| `groupedAccounts` | `visibleAccounts`, `ACCOUNT_TYPE_TO_CATEGORY`, `ACCOUNT_CATEGORIES` | `filteredGroupedAccounts`, JSX dashboard |
| `filteredGroupedAccounts` | `groupedAccounts`, `visibleCategories` | JSX dashboard |
| `budgetAlerts` | `safeBudgets`, `visibleTransactions`, `dismissedAlerts` | JSX reports, `BudgetAlertBanner` |
| `handleGlobalPinSubmit` | `globalPinHash`, `hashPin`, `verifyPin`, `isSetupMode`, `soundSystem`, `hapticSystem`, `screenReader` | JSX PinDialog globale |
| `handlePrivatePinSubmit` | `privatePinHash`, `hashPin`, `verifyPin`, `visibleAccounts`, `visibleTransactions`, `formatCurrency`, `calculateAccountBalance`, `soundSystem`, `hapticSystem`, `screenReader` | JSX PinDialog privato |
| `handleSaveTransaction` | `setTransactions`, `safeAccounts`, `safeCategories`, `checkBudgetNotifications`, `soundSystem`, `hapticSystem`, `screenReader`, `formatCurrency` | JSX TransactionDialog |
| `checkBudgetNotifications` | `safeBudgets`, `budgetPercentages`, `setBudgetPercentages`, `getActiveBudgets`, `getBudgetProgress`, `shouldShowBudgetNotification`, `getBudgetNotificationTitle`, `formatCurrency`, `soundSystem`, `hapticSystem` | `handleSaveTransaction` |
| `handleDeleteConfirm` | `deletingItem`, `setAccounts`, `setTransactions`, `setBudgets`, `setSavingsGoals`, `soundSystem`, `hapticSystem`, `screenReader` | JSX AlertDialog |
| `handleExportCSV` | `visibleTransactions`, `visibleAccounts`, `safeCategories`, `exportToCSV`, `downloadFile`, `soundSystem`, `hapticSystem`, `screenReader` | JSX button, keyboard shortcut `Ctrl+E` |
| `toggleCategoryVisibility` | `setVisibleCategories`, `ACCOUNT_CATEGORIES`, `soundSystem`, `hapticSystem`, `screenReader` | JSX filter buttons, keyboard shortcuts 1–5 |
| `handleViewBudget` | `safeBudgets`, `setActiveTab`, `setEditingBudget`, `setShowBudgetDialog`, `soundSystem`, `hapticSystem` | JSX `BudgetAlertBanner` |
| `recentTransactionsNav` | `recentTransactions`, `setEditingTransaction`, `setShowTransactionDialog`, `setDeletingItem`, `setShowDeleteDialog` | JSX dashboard |
| `allTransactionsNav` | `visibleTransactions`, `setEditingTransaction`, `setShowTransactionDialog`, `setDeletingItem`, `setShowDeleteDialog` | JSX transactions |
| `useKeyboardShortcuts` | **Quasi tutto** — isAuthenticated, activeTab, toggle handlers, setActiveTab, showDialog setters, hasPrivateAccount, isPrivateUnlocked, allCategoriesVisible, handleExportCSV, soundSystem | registrato globalmente |
| JSX `DashboardTab` | `visibleAccounts`, `filteredGroupedAccounts`, `groupedAccounts`, `visibleCategories`, `recentTransactions`, `recentTransactionsNav`, `toggleCategoryVisibility`, `toggleAllCategories`, `allCategoriesVisible`, `isMobile`, `formatCurrency`, `calculateAccountBalance`, setter dialogs | `TabsContent` dashboard |
| JSX `TransactionsTab` | `visibleTransactions`, `allTransactionsNav`, `handleExportCSV`, `visibleAccounts`, `safeCategories`, setter dialogs, `formatCurrency`, `isMobile` | `TabsContent` transactions |
| JSX `ReportsTab` | `visibleTransactions`, `visibleAccounts`, `safeAccounts`, `safeCategories`, `safeBudgets`, `safeSavingsGoals`, `totalBalance`, `chartPeriod`, `getActiveBudgets`, `formatCurrency`, setter dialogs, handler risparmio/budget | `TabsContent` reports |

### 1.3 File già esistenti fuori da `App.tsx`

| File | Contenuto | Candidato a ricevere altro? |
|---|---|---|
| `src/lib/types.ts` | Tutti i tipi/interfacce del dominio | No — già completo |
| `src/lib/constants.ts` | Costanti dominio, categorie conto, icone | No — già completo |
| `src/lib/helpers.ts` | Calcoli puri: balance, totali, CSV, formatCurrency | No — già completo |
| `src/lib/crypto.ts` | hashPin, verifyPin, encrypt/decrypt | No — già completo |
| `src/lib/budget-alerts.ts` | Generazione alert, shouldShowNotification | No — già completo |
| `src/lib/sound-system.ts` | Singleton soundSystem | No |
| `src/lib/haptic-system.ts` | Singleton hapticSystem | No |
| `src/lib/screen-reader.ts` | Singleton screenReader + tipi | No |
| `src/lib/budget-forecasting.ts` | Logica previsioni budget | No |
| `src/lib/budget-history.ts` | Storico budget | No |
| `src/lib/budget-templates.ts` | Template budget | No |
| `src/hooks/use-screen-reader.ts` | Hook wrapper per screenReader | No |
| `src/hooks/use-mobile.ts` | Hook `useIsMobile` | No |
| `src/hooks/use-keyboard-shortcuts.ts` | Hook `useKeyboardShortcuts` (meccanismo) | No — solo il meccanismo, la **configurazione** è in App.tsx |
| `src/hooks/use-list-navigation.ts` | Hook `useListNavigation` (meccanismo) | No |
| `src/hooks/use-display-preferences.ts` | Preferenze display | No |
| `src/hooks/use-haptic.ts` | Hook haptic | No |
| `src/hooks/use-talkback.ts` | Hook TalkBack | No |
| `src/components/` | ~30 componenti UI già estratti | No — già separati |

> **Osservazione critica**: in `App.tsx` non esistono definizioni di tipo o costanti locali. Tutto il layer `lib/` è già completo. Il lavoro di refactoring riguarda esclusivamente **stato, handler e JSX**.

---

## FASE 2 — STRUTTURA TARGET

```
src/
├── lib/                    → invariato
├── context/
│   ├── AppDataContext.tsx  → stato dati KV + handler CRUD
│   └── AuthContext.tsx     → stato auth + handler PIN
├── hooks/
│   ├── (esistenti)
│   ├── use-visible-data.ts → computed derivati da context
│   └── use-app-shortcuts.ts → configurazione shortcut tastiera
├── components/
│   ├── (esistenti)
│   ├── AuthScreen.tsx      → schermata di login
│   ├── AppHeader.tsx       → header sticky con saldo
│   ├── DashboardTab.tsx    → TabsContent "dashboard"
│   ├── TransactionsTab.tsx → TabsContent "transactions"
│   ├── ReportsTab.tsx      → TabsContent "reports"
│   └── DialogsOverlay.tsx  → tutti i dialog sovrapposti
└── App.tsx                 → ~70 righe: composizione + navigazione
```

### Dettaglio file target

| File | Responsabilità | Contenuto | Dipendenze in entrata | Dipendenze in uscita |
|---|---|---|---|---|
| `src/context/AppDataContext.tsx` | Gestisce tutto lo stato dati persistito e i relativi CRUD handler | Stato KV (accounts, transactions, categories, budgets, savingsGoals, visibleCategories, dismissedAlerts, budgetPercentages); safe* wrappers; handleSave*, handleDelete*, handleExport*, toggle*, handleDismiss*, handleViewBudget, checkBudgetNotifications; useEffect categorie default | `AppHeader`, `DashboardTab`, `TransactionsTab`, `ReportsTab`, `DialogsOverlay`, `use-visible-data`, `use-app-shortcuts` | `useKV`, `types`, `helpers`, `budget-alerts`, `sound-system`, `haptic-system`, `use-screen-reader`, `constants` |
| `src/context/AuthContext.tsx` | Gestisce autenticazione globale e privata, stati PIN e handler di login | `globalPinHash`, `privatePinHash` (KV); `isAuthenticated`, `isPrivateUnlocked`, `isSetupMode`, `showPinDialog`, `showPrivatePinDialog` (useState); `handleGlobalPinSubmit`, `handlePrivatePinSubmit` | `AppHeader`, `AuthScreen`, `DialogsOverlay`, `use-visible-data`, `use-app-shortcuts`, `DashboardTab` | `useKV`, `crypto`, `sound-system`, `haptic-system`, `use-screen-reader`, `helpers` (formatCurrency) |
| `src/hooks/use-visible-data.ts` | Fornisce tutti i valori derivati calcolati da stato auth e dati | `visibleAccounts`, `visibleTransactions`, `hasPrivateAccount`, `privateAccount`, `totalBalance`, `recentTransactions`, `groupedAccounts`, `filteredGroupedAccounts`, `allCategoriesVisible`, `budgetAlerts` | `DashboardTab`, `TransactionsTab`, `ReportsTab`, `AppHeader`, `use-app-shortcuts` | `useAppData` (context), `useAuth` (context), `helpers`, `budget-alerts`, `constants` |
| `src/hooks/use-app-shortcuts.ts` | Registra tutte le 15 scorciatoie da tastiera dell'applicazione | Array di `KeyboardShortcut` + chiamata a `useKeyboardShortcuts`; dipende da handler e stato corrente | `App.tsx` | `useAppData`, `useAuth`, `use-visible-data`, `use-keyboard-shortcuts`, `sound-system` |
| `src/components/AuthScreen.tsx` | Mostra la schermata di accesso con gradient e dialog PIN | JSX background gradients + `PinDialog` condizionale su setup/login | Importata da `App.tsx` | `useAuth`, `PinDialog`, `SkipLink` |
| `src/components/AppHeader.tsx` | Header sticky con logo, saldo totale e accesso all'help tastiera | JSX header con `Tooltip` saldo, bottone keyboard | Importata da `App.tsx` | `useAuth`, `useAppData`, `use-visible-data`, `formatCurrency`, ui components, `soundSystem`, `hapticSystem` |
| `src/components/DashboardTab.tsx` | Renderizza il pannello dashboard: conti raggruppati, filtri, movimenti recenti | JSX `TabsContent value="dashboard"` completo | Importata da `App.tsx` | `useAppData`, `useAuth`, `use-visible-data`, `use-list-navigation`, `AccountCard`, ui components |
| `src/components/TransactionsTab.tsx` | Renderizza l'elenco completo delle transazioni con export e navigazione | JSX `TabsContent value="transactions"` completo | Importata da `App.tsx` | `useAppData`, `use-visible-data`, `use-list-navigation`, ui components |
| `src/components/ReportsTab.tsx` | Renderizza statistiche finanziarie, budget, obiettivi risparmio, impostazioni | JSX `TabsContent value="reports"` completo | Importata da `App.tsx` | `useAppData`, `use-visible-data`, grafici, `BudgetProgressCard`, `SavingsGoalCard`, settings components |
| `src/components/DialogsOverlay.tsx` | Raccoglie tutti i dialog modali sovrapposti | `PinDialog` privato, `AccountDialog`, `TransactionDialog`, `BudgetDialog`, `SavingsGoalDialog`, `AlertDialog` eliminazione, `KeyboardShortcutsHelp` | Importata da `App.tsx` | `useAppData`, `useAuth`, `use-visible-data`, tutti i Dialog components |
| `src/App.tsx` (finale) | Composizione top-level: provider, routing tab, assemblaggio | Import context providers, `useEffect` tab change, JSX con `Tabs`+`TabsList`+3 tab+`DialogsOverlay`+`Toaster` | entry point | tutti i context, `AuthScreen`, `AppHeader`, `DashboardTab`, `TransactionsTab`, `ReportsTab`, `DialogsOverlay`, `use-app-shortcuts` |

---

## FASE 3 — PIANO DI SPOSTAMENTO INCREMENTALE

> Ogni passo presuppone che il passo precedente sia stato completato e verificato.
> 🟢 = Rischio basso | 🟡 = Rischio medio | 🔴 = Rischio alto

---

### Passo 1 — Crea `AppDataContext` con solo lo stato KV dati

**Cosa fare**: Creare il file `src/context/AppDataContext.tsx` con:
- Le 8 chiamate `useKV` relative ai dati (tutto tranne `globalPinHash` e `privatePinHash`)
- I 5 safe-wrapper (`safeAccounts`, ecc.)
- Il `useEffect` di inizializzazione delle categorie default
- Un context provider `AppDataProvider` e un hook `useAppData`

Non spostare ancora nessun handler.

**Dove**: `src/context/AppDataContext.tsx` (file nuovo)

**Perché in questo momento**: Nessun handler dipende ancora da questo context. È un passo puramente estrattivo: si crea il context e lo si usa in App.tsx in sostituzione delle 8 righe `useKV`. Nessuna dipendenza circolare possibile.

**Come verificare**: L'app si avvia senza errori in console. Il PIN globale funziona. I dati persistiti vengono caricati correttamente (riavviare e verificare che accounts/transactions siano ancora visibili).

🟢 **Rischio basso** — nessuna logica modificata, solo wrapping.

---

### Passo 2 — Crea `AuthContext` con solo lo stato auth

**Cosa fare**: Creare `src/context/AuthContext.tsx` con:
- Le 2 chiamate `useKV` per PIN hash (`globalPinHash`, `privatePinHash`)
- I 3 stati effimeri auth (`isAuthenticated`, `isPrivateUnlocked`, `isSetupMode`)
- I 2 stati dialog PIN (`showPinDialog`, `showPrivatePinDialog`)
- Provider `AuthProvider` e hook `useAuth`

Non spostare ancora `handleGlobalPinSubmit` e `handlePrivatePinSubmit`: restano in `App.tsx` per ora, ma usano `useAuth()` per leggere e settare lo stato.

**Dove**: `src/context/AuthContext.tsx` (file nuovo)

**Perché in questo momento**: Il context auth non dipende da AppDataContext. I due context sono indipendenti.

**Come verificare**: Il login con PIN funziona. Il setup del primo PIN funziona. `isAuthenticated` è correttamente `false` al primo caricamento.

🟢 **Rischio basso** — solo stato spostato, handler ancora in App.tsx.

---

### Passo 3 — Sposta handler CRUD in `AppDataContext`

**Cosa fare**: Spostare in `AppDataContext` i seguenti handler:
- `handleSaveAccount`
- `handleSaveTransaction` (include `checkBudgetNotifications`)
- `handleSaveBudget`
- `handleSaveSavingsGoal`
- `handleAddFundsToGoal`
- `handleDeleteConfirm`
- `handleExportCSV`
- `toggleCategoryVisibility`
- `toggleAllCategories`
- `handleDismissBudgetAlert`
- `handleViewBudget`

`handleViewBudget` usa `setActiveTab`, `setEditingBudget`, `setShowBudgetDialog`. Questi sono stati effimeri UI ancora in App.tsx. **Soluzione**: passarli come parametri alla funzione, oppure spostarli nel context — per ora passarli come parametri (`handleViewBudget` accetta un callback `onNavigate`).

**Dove**: `src/context/AppDataContext.tsx`

**Perché in questo momento**: Il contesto dati già ha tutto lo stato KV necessario (passo 1). Gli handler CRUD non dipendono da AuthContext né da useVisibleData.

**Come verificare**: Aggiungere una transazione. Modificare un conto. Eliminare un budget. Esportare CSV. Il saldo si aggiorna correttamente.

🟡 **Rischio medio** — `checkBudgetNotifications` usa `budgetPercentages` e `safeBudgets` (entrambi nel context, ok); `handleDeleteConfirm` legge `deletingItem` che è ancora in App.tsx → va passato come parametro o spostato anticipatamente.

---

### Passo 4 — Sposta handler PIN in `AuthContext`

**Cosa fare**: Spostare in `AuthContext`:
- `handleGlobalPinSubmit`
- `handlePrivatePinSubmit`

**Attenzione**: `handlePrivatePinSubmit` usa `visibleAccounts` e `visibleTransactions` per l'annuncio screen reader del saldo. In questo momento queste due variabili sono ancora in App.tsx (come `useMemo`).

**Soluzione adottata**: Rendere l'annuncio del saldo opzionale tramite parametro. Il context riceve una callback `onUnlocked?: (balance: number) => void` che viene chiamata dopo il login; il componente che chiama il dialog (o App.tsx) si occupa dell'annuncio. Oppure spostare il solo annuncio fuori dall'handler, come side effect in App.tsx.

**Dove**: `src/context/AuthContext.tsx`

**Perché in questo momento**: Lo stato auth è già nel context. Ora si aggiungono solo le funzioni che lo modificano. Non è possibile spostare questi handler prima del context auth (passo 2).

**Come verificare**: Il login con PIN globale funziona. Il PIN privato sblocca il conto privato. PIN errato mostra toast di errore.

🟡 **Rischio medio** — dipendenza trasversale con `visibleAccounts`; risolvibile con il pattern callback descritto sopra.

---

### Passo 5 — Crea `src/hooks/use-visible-data.ts`

**Cosa fare**: Creare un hook che espone tutti i valori `useMemo` derivati da stato e dati:
- `visibleAccounts`
- `visibleTransactions`
- `hasPrivateAccount`, `privateAccount`
- `totalBalance`
- `recentTransactions`
- `groupedAccounts`, `filteredGroupedAccounts`
- `allCategoriesVisible`
- `budgetAlerts`

L'hook legge da `useAppData()` e `useAuth()`.

**Dove**: `src/hooks/use-visible-data.ts` (file nuovo)

**Perché in questo momento**: AppDataContext (passo 1) e AuthContext (passo 2) sono pronti. L'hook non modifica nessuno stato, quindi non può rompere nulla.

**Come verificare**: Il saldo nel header è corretto. I conti privati restano nascosti finché non si sblocca. I filtri per categoria funzionano.

🟢 **Rischio basso** — solo lettura e calcolo.

---

### Passo 6 — Crea `src/hooks/use-app-shortcuts.ts`

**Cosa fare**: Estrarre l'array di `KeyboardShortcut` e la chiamata `useKeyboardShortcuts` dall'App.tsx in un hook dedicato `useAppShortcuts()`. L'hook usa `useAppData`, `useAuth`, `use-visible-data` internamente.

**Dove**: `src/hooks/use-app-shortcuts.ts` (file nuovo)

**Perché in questo momento**: Tutti i suoi prerequisiti sono stati creati nei passi 1–5. È l'elemento più dipendente-da-tutto: va estratto dopo che le dipendenze sono già nei context/hook.

**Come verificare**: Tutte le scorciatoie funzionano: `Ctrl+N` apre il dialog movimento, `Ctrl+D/T/R` cambiano tab, tasti `1–5` filtrano le categorie, `Shift+?` apre l'help.

🟡 **Rischio medio** — molte dipendenze concatenate; se un handler è stato passato con firma diversa dal passo precedente, il breakage è silente (shortcut che non fa nulla).

---

### Passo 7 — Estrai `TransactionsTab` come componente

**Cosa fare**: Creare `src/components/TransactionsTab.tsx` con il JSX completo di `TabsContent value="transactions"` (righe ~1241–1385). Il componente legge dati da `useAppData()`, `useAuth()`, `use-visible-data`. Non riceve props eccetto `activeTab` per condizionare `useListNavigation`.

**Dove**: `src/components/TransactionsTab.tsx` (file nuovo)

**Perché in questo momento**: Tra i tre tab, questo è il meno dipendente dai filtri categorie. I context e l'hook dati sono pronti. È il passo più sicuro per testare il pattern di estrazione tab.

**Come verificare**: Il tab Movimenti mostra tutte le transazioni ordinate. L'export CSV funziona. La navigazione con frecce e Edit/Delete funziona.

🟢 **Rischio basso** — JSX copiato; non modifica logica.

---

### Passo 8 — Estrai `DashboardTab` come componente

**Cosa fare**: Creare `src/components/DashboardTab.tsx` con il JSX completo di `TabsContent value="dashboard"` (righe ~940–1240). Include il blocco filtri categorie, la grid dei conti, i movimenti recenti.

**Dove**: `src/components/DashboardTab.tsx` (file nuovo)

**Perché in questo momento**: Il passo 7 ha già testato il pattern. `DashboardTab` è più complesso per i filtri ma usa `use-visible-data` che è già pronto (passo 5).

**Come verificare**: La dashboard mostra i conti raggruppati. I filtri per categoria funzionano (toggle singolo e globale). I movimenti recenti si aggiornano. Il bottone "Sblocca Privato" appare quando necessario.

🟡 **Rischio medio** — il blocco filtri usa `groupedAccounts`/`filteredGroupedAccounts` che vengono da `use-visible-data`; verificare che i Tooltip per le categorie passino le info corrette.

---

### Passo 9 — Estrai `ReportsTab` come componente

**Cosa fare**: Creare `src/components/ReportsTab.tsx` con il JSX completo di `TabsContent value="reports"` (righe ~1386–1723). Include: statistiche (3 card), grafici, budget section, savings goals section, sezione impostazioni (Security, Category, Data, Display, Audio, Haptic, ScreenReader, TalkBack).

**Dove**: `src/components/ReportsTab.tsx` (file nuovo)

**Perché in questo momento**: Dipende da tutti i context già pronti. È il più lungo ma è una responsabilità unica.

**Come verificare**: Il tab Report mostra le card statistiche con valori corretti. I grafici sono visibili. I budget attivi appaiono. Si può creare un nuovo budget. Le impostazioni accessibilità sono operative.

🟡 **Rischio medio** — le IIFE inline nelle tooltip delle card statistiche (top categorie) sono fragili: estrarre in variabili `useMemo` nel componente per evitare re-render inutili.

---

### Passo 10 — Estrai `AppHeader` come componente

**Cosa fare**: Creare `src/components/AppHeader.tsx` con il JSX dell'header sticky (righe ~797–865). Il componente mostra logo, saldo totale con Tooltip, bottone keyboard shortcuts.

**Dove**: `src/components/AppHeader.tsx` (file nuovo)

**Perché in questo momento**: Non dipende da nessuno dei tab estratti. Dipende da `use-visible-data` (totalBalance), `useAuth`, `useIsMobile`, `soundSystem`, `hapticSystem`.

**Come verificare**: Il saldo nel header si aggiorna dopo aver aggiunto una transazione. Il bottone keyboard apre l'help. Il tooltip saldo mostra numero conti.

🟢 **Rischio basso** — componente isolato, nessuna logica critica.

---

### Passo 11 — Estrai `AuthScreen` come componente

**Cosa fare**: Creare `src/components/AuthScreen.tsx` con il JSX della schermata di login (righe ~770–795). Include il background gradients e il `PinDialog`.

**Dove**: `src/components/AuthScreen.tsx` (file nuovo)

**Perché in questo momento**: Dipende solo da `useAuth` e dal componente `PinDialog` già esistente.

**Come verificare**: La schermata di login appare all'avvio. L'inserimento PIN corretto sblocca l'app. Il setup del primo PIN crea l'hash.

🟢 **Rischio basso** — JSX puro, poca logica.

---

### Passo 12 — Estrai `DialogsOverlay` come componente

**Cosa fare**: Creare `src/components/DialogsOverlay.tsx` raccogliendo tutti i dialog aperti in overlay (righe ~1724–1805):
- `PinDialog` privato
- `AccountDialog`
- `TransactionDialog`
- `BudgetDialog`
- `SavingsGoalDialog`
- `AlertDialog` (conferma eliminazione)
- `KeyboardShortcutsHelp`

Il componente legge tutto dallo stato dei context.

**Dove**: `src/components/DialogsOverlay.tsx` (file nuovo)

**Perché in questo momento**: Tutti gli handler e stati necessari sono nei context (passi 1–4). È il penultimo passo prima della pulizia finale di App.tsx.

**Come verificare**: Si può aprire e chiudere ogni dialog. La conferma eliminazione elimina correttamente. AccountDialog salva correttamente. Il dialog PIN privato funziona.

🟡 **Rischio medio** — molti stati editing (`editingAccount` ecc.) devono essere esposti dai context; verificare che tutti i setter `setEditing*` siano accessibili tramite `useAppData`.

---

### Passo 13 — Refactor finale di `App.tsx`

**Cosa fare**: Sostituire il contenuto di `App.tsx` con solo:
- Import dei provider e dei componenti estratti
- Wrapping in `AuthProvider` e `AppDataProvider`
- `useAppShortcuts()` (passo 6)
- `useEffect` per il cambio tab (screen reader + audio)
- JSX: `SkipLink`, condizionale `AuthScreen` / layout principale con `AppHeader`, `BudgetAlertBanner`, `Tabs` con `TabsList` + 3 `TabsContent`, `DialogsOverlay`, `Toaster`

Il risultato atteso è ~70 righe.

**Dove**: `src/App.tsx` (file esistente, ridotto)

**Perché in questo momento**: Tutti gli elementi sono già estratti nei passi precedenti. Questo passo è solo composizione.

**Come verificare**: L'app si avvia. Login funziona. Si può aggiungere/modificare/eliminare ogni tipo di dato. Navigazione tra tab. Export CSV. Scorciatoie da tastiera. Accesso conto privato.

🟡 **Rischio medio** — passo di sintesi: se qualcosa non è stato esportato correttamente da un context nel passo precedente, l'errore emerge qui. Eseguire controllo TypeScript (`tsc --noEmit`) prima di avviare il dev server.

---

## FASE 4 — AVVERTENZE E RISCHI

### 4.1 Dipendenze nascoste critiche

#### ⚠️ `handlePrivatePinSubmit` usa `visibleAccounts` / `visibleTransactions`

L'handler di autenticazione privata (candidato per `AuthContext`) usa i conti visibili per annunciare il saldo al login. Se `AuthContext` viene creato prima di `use-visible-data`, c'è una dipendenza trasversale **AuthContext → use-visible-data → AuthContext** (circolare).

**Soluzione prescritta**: Separare l'annuncio del saldo dall'handler. `AuthContext.handlePrivatePinSubmit` imposta solo `isPrivateUnlocked = true`. L'annuncio viene fatto come side effect in `App.tsx` (o nel componente che osserva `isPrivateUnlocked`), tramite `useEffect([isPrivateUnlocked])` che calcola il saldo lì.

#### ⚠️ `handleViewBudget` usa `setActiveTab` e `setEditingBudget`

Questi sono stati di navigazione/UI che potrebbero non essere nel context dati. In fase di spostamento, o si centralizza `activeTab` in `AppDataContext`, oppure `handleViewBudget` accetta callback come parametri.

#### ⚠️ `deletingItem` usato da `handleDeleteConfirm`

`deletingItem` è uno stato effimero che deve essere accessibile da `AppDataContext` per poter eseguire l'eliminazione. Deve essere incluso nel context dati, oppure passato come argomento all'handler.

#### ⚠️ `checkBudgetNotifications` è chiamato dentro il setter di `setTransactions`

Nota: `checkBudgetNotifications` viene chiamato **dentro** la callback passata a `setTransactions(callback)`, il che significa che usa una closure su `safeBudgets` e `budgetPercentages` al momento della chiamata. Durante la migrazione al context, verificare che i valori siano letti *dall'interno del context* e non da closure stantie.

#### ⚠️ IIFE nelle tooltip di `ReportsTab`

Le funzioni `incomeByCategory` e `expenseByCategory` sono calcolate inline come IIFE dentro `TooltipContent`. Sono ricalcolate a ogni render. Durante l'estrazione di `ReportsTab`, spostarle in `useMemo` separati nel componente per evitare degradi di performance.

### 4.2 Pattern da non replicare

- **Null coalescing ridondante**: il pattern `const safeX = x || []` è applicato 5 volte anche dentro i setter (`setTransactions(current => (current || []).filter(...))`). Durante la migrazione, consolidare la garanzia di non-null una sola volta nel context (ad esempio all'inizializzazione del KV con valore di default `[]`).

- **`setTimeout` dentro handler**: `handleViewBudget` usa `setTimeout(() => ..., 300)` per ritardare l'apertura del dialog dopo il cambio tab. È un pattern fragile (race condition su device lenti). Non replicarlo in nuovi handler.

- **Calcoli ripetuti in JSX**: `getActiveBudgets(safeBudgets)` viene chiamato **4 volte** nel JSX di reports senza memoizzazione. Durante l'estrazione di `ReportsTab`, memoizzare con `useMemo`.

- **Logica sorting duplicata**: il sorting `sort((a,b) => new Date(b.data)... - new Date(a.data)...)` appare sia in `recentTransactions` (useMemo) sia inline nel JSX di `TransactionsTab`. Durante l'estrazione, rimuovere il secondo e usare il memo.

### 4.3 Dipendenze circolari potenziali

| Coppia | Rischio | Note |
|---|---|---|
| `AuthContext` ↔ `use-visible-data` | 🔴 Alto | `handlePrivatePinSubmit` vuole `visibleAccounts` da use-visible-data che dipende da `isPrivateUnlocked` di AuthContext. Soluzione: separare annuncio saldo (vedi 4.1) |
| `AppDataContext` ↔ `AuthContext` | 🟢 Nessuno | Non c'è dipendenza diretta tra i due |
| `use-app-shortcuts` ↔ context | 🟢 Nessuno | L'hook legge dai context ma non vi scrive in modo che crei cicli |

### 4.4 Ordine TypeScript critico

Durante l'estrazione, rispettare questo ordine di export/import:
1. `types.ts` → non dipende da nulla del progetto
2. `constants.ts` → dipende da `types.ts`
3. `helpers.ts` → dipende da `types.ts`
4. `AppDataContext.tsx` → dipende da `types`, `constants`, `helpers`, `lib/*`
5. `AuthContext.tsx` → dipende da `types`, `crypto`, `lib/*`
6. `use-visible-data.ts` → dipende da `AppDataContext`, `AuthContext`, `helpers`, `constants`
7. `use-app-shortcuts.ts` → dipende da `AppDataContext`, `AuthContext`, `use-visible-data`
8. Componenti tab → dipendono da context + use-visible-data
9. `App.tsx` → dipende da tutto

Eseguire `tsc --noEmit` dopo ogni passo per rilevare errori di tipo prima di avviare il dev server.

---

## Stato finale

**Implementazione del refactoring architetturale completata il 2026-04-23.**

Tutti e 13 i pacchetti sono stati implementati e documentati sul branch `refactoring-architettura`.

**Gate automatici finali:** `npx tsc --noEmit` PASS, `npm run build` PASS, `src/App.tsx` ridotto a 133 righe di pura composizione.

**Validazione funzionale interattiva residua:** gli scenari browser end-to-end restano da eseguire manualmente in preview locale.

---

*Fine documento — nessun file è stato modificato durante questa analisi.*
