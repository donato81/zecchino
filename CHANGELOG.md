# Changelog

## [Unreleased]

Questa sezione aggrega le modifiche rilasciate sul branch `refactoring-architettura`
ma non ancora su `main`.

### Blocco 4 — Migrazione dati di dominio a Supabase (P28 + P33)

#### Changed
- `AppDataContext` carica i 5 array di dominio (`accounts`, `transactions`,
  `categories`, `budgets`, `savingsGoals`) da Supabase in parallelo tramite
  i repository P26; espone `isLoading`, `error`, `isDataReady` e le azioni
  tipizzate `add*/update*/remove*` + `refreshAll()`.
- `App.tsx` aggiunge il quarto gate `!isDataReady → LoadingSpinner`, dopo
  `!isAuthReady`, `!isAuthenticated` e `needsOnboarding`.
- `TransactionDialog.tsx` rimuove il campo `cifrato` dai payload di creazione e
  aggiornamento: il trigger DB `trg_sync_cifrato` lo calcola automaticamente.
- `CategoryManagement.tsx` rimuove l'ultima `useKV('categories', [])` di
  produzione e consuma le categorie direttamente da `useAppData()`; i pulsanti
  "Modifica" ed "Elimina" sono disabilitati per le righe con `predefinita: true`.
- `AppDataContext` include la logica di migrazione one-shot delle categorie
  personalizzate dal KV Spark a Supabase, protetta dal flag
  `preferences.legacy_categories_migrated`.

#### Rimosso
- Tutte le dipendenze da `@github/spark/hooks` (`useKV`) nei file di produzione.
  Rimane solo il mock in `src/test/setup.ts`.

---

## [P33] — 2026-05-02

### Changed
- `CategoryManagement.tsx` rimuove `useKV` in produzione e legge le categorie da `useAppData()`; i pulsanti di modifica ed eliminazione sono disabilitati per le categorie template `predefinita`.
- `AppDataContext` aggiunge la migrazione one-shot delle categorie legacy da `window.spark.kv` a Supabase, protetta dal flag `preferences.legacy_categories_migrated`.
- La suite di produzione non contiene più import diretti da `@github/spark/hooks` per la gestione delle categorie.

## [P28] — 2026-05-02

### Added
- `src/context/AppDataContext.tsx` carica i dati di dominio da Supabase tramite i repository `conti`, `transazioni`, `categorie`, `budget`, `obiettivi-risparmio`.
- `AppDataContext` espone i flag `isLoading`, `error`, `isDataReady`, le azioni `add*/update*/remove*` e `refreshAll()`.

### Changed
- `App.tsx` aggiunge il gate `!isDataReady` dopo `needsOnboarding` con `LoadingSpinner` globale.
- `TransactionDialog.tsx` rimuove il campo `cifrato` dai payload di creazione e aggiornamento delle transazioni; il DB calcola `cifrato` tramite trigger.
- `AppDataContext` conserva solo `visibleCategories`, `dismissedAlerts` e `budgetPercentages` in `useKV`; tutti gli altri dati di dominio sono migrati a Supabase.

## [P27] — 2026-05-02

### Added
- Aggiunti `src/hooks/use-inactivity-timer.ts`, `src/components/LoadingSpinner.tsx` e `src/components/OnboardingFlow.tsx` per gestire timeout sessione, bootstrap auth e gate onboarding.

### Changed
- `AuthContext` migra da autenticazione PIN globale a Supabase Auth con session bootstrap, `signIn`, `signUp`, `signOut`, `resetPassword` e timeout inattività.
- `AuthScreen` passa da dialog PIN a schermata email/password con pannelli Login, Signup, Recovery e conferma signup.
- `App.tsx` introduce i gate sequenziali `isAuthReady`, `isAuthenticated` e `needsOnboarding` prima del rendering dell'area applicativa.
- `SecuritySettings` rimuove il PIN globale da `useKV` e mostra la nuova sezione sicurezza account con reset password e gestione PIN privato.
- `DialogsOverlay` usa il contratto auth aggiornato e mantiene solo il flusso PIN privato.

### Fixed
- Aggiornati gli smoke test 02–05 al nuovo flusso auth tramite mock parziale del contesto, eliminando la dipendenza dal vecchio helper PIN globale.

### Notes
- I residui `@github/spark/hooks` e `window.spark` fuori dai file P27 restano esplicitamente fuori scope e saranno rimossi nei blocchi successivi.

## [P26] — 2026-05-01

### Data layer / Supabase
- Aggiunta dipendenza `@supabase/supabase-js` in `package.json`.
- Creato il layer di accesso dati in `src/lib/supabase/` con `client.ts`, `types.ts` e repository per `conti`, `transazioni`, `categorie`, `budget`, `obiettivi-risparmio` e `impostazioni-utente`.
- Mappatura camelCase ↔ snake_case gestita nei repository; `user_id` non è esposto nei tipi client.
- `transazioni.create()` e `transazioni.update()` escludono `cifrato` dal payload; il trigger DB `trg_sync_cifrato` popola il campo.
- Tipi `UserPreferences` e `UserSettings` aggiornati per il record `impostazioni_utente`.

## [P19] — 2026-04-24

### Testing
- Introdotto `vitest.config.ts` con ambiente `jsdom`, alias `@` e bootstrap globale `src/test/setup.ts`
- Aggiunti gli script `test` e `test:run` e le dipendenze di test in `package.json`; aggiornato `package-lock.json`
- Aggiornato `tsconfig.json` con i tipi `@testing-library/jest-dom`
- Creato setup test stateful con mock di `@github/spark/hooks.useKV`, `window.spark.kv`, `AudioContext`, `webkitAudioContext`, `navigator.vibrate` e `matchMedia`
- Creato `src/test/smoke/test-utils.ts` per render condiviso, seed del KV mock e helper di autenticazione PIN
- Aggiunti 5 smoke test end-to-end di superficie:
  - render iniziale schermata auth
  - autenticazione con PIN globale
  - struttura principale Dashboard
  - navigazione tab Movimenti
  - sblocco del conto privato con PIN dedicato
- Gate automatici P19: `npm run test:run` PASS (5/5), esecuzione inversa PASS, isolamento singolo file PASS, `npm run build` PASS, `npm run lint` PASS con 59 warning

## [P18] — 2026-04-24

### Architettura
- Creato `src/context/VisibleDataContext.tsx`: nuovo context dedicato
  che espone i dati elaborati tramite `VisibleDataProvider`
- Albero provider aggiornato: `AuthProvider → AppDataProvider →
  VisibleDataProvider → AppContent`
- Migrati 7 consumer da `@/hooks/use-visible-data` a
  `@/context/VisibleDataContext`: `App.tsx`, `AppHeader.tsx`,
  `TransactionsTab.tsx`, `use-app-shortcuts.ts`, `DialogsOverlay.tsx`,
  `ReportsTab.tsx`, `DashboardTab.tsx`
- `use-visible-data.ts` diventa implementazione interna del provider —
  logica invariata, nessun consumer accede più al hook direttamente
- Comportamento app invariato — zero modifiche visibili all'utente

## [P17] — 2026-04-24

### Accessibilità / Correzioni
- Corretto bug di gestione del focus DOM nelle liste: il focus ora viene spostato sul reale elemento di lista dopo il commit del DOM, evitando highlight visuali scollegati dallo stato reale.
- Implementato roving `tabindex` e attributi `data-list-item` / `data-index` sulle righe di `DashboardTab` e `TransactionsTab` per supportare navigazione da tastiera e screen reader.
- Aggiunto guard per dialog modali (`[aria-modal="true"]`) in `use-list-navigation` per sospendere la navigazione frecce quando un dialog modale è aperto.
- Introdotto `callbacksRef` in `use-list-navigation` per stabilizzare le callback (`onEnter`, `onDelete`, `onEdit`) ed evitare stale closures.
- Aggiornati `DashboardTab` e `TransactionsTab`: `tabIndex`, `role="button"`, `aria-label` dettagliato (tipo, descrizione, importo, data, conto, destinazione se trasferimento`) e `focus:outline-none` per evitare doppio bordo visivo.
- `FocusIndicator` ora riconosce elementi con `data-list-item`, migliorando la coerenza del tooltip e dell'indicazione di focus.
- Ridotti warning `jsx-a11y` rilevanti su `DashboardTab` e `TransactionsTab`; baseline ESLint documentata a 55 warning.

## [P16] — 2026-04-24

### Sicurezza
- Aggiornato constraint `vite` da `^7.2.6` a `^7.3.2`
  (risolve GHSA-4w7w-66w2-5vf9, GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583)
- Aggiunti `overrides` mirati per `flatted`, `lodash`, `minimatch`,
  `path-to-regexp`, `picomatch`, `ajv` e `brace-expansion`; le vulnerabilita
  transitive residue sono state documentate nel coding plan P16
- `uuid@11.1.0` accettata temporaneamente (GHSA-w5hq-g745-h8pq):
  fix richiede major jump v11→v14, rinviato a passo dedicato
- Nessun file sotto `src/` modificato — comportamento app invariato
- Baseline post-P16: 8 vulnerabilita residue documentate (5 high, 3 moderate)

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