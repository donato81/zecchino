# P13 — Refactor finale di `App.tsx`: rimozione del codice residuo

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 13 (corrispondente al Passo 13 del piano di refactoring — passo conclusivo)  
> Data: 23 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Al termine del Passo 12, `App.tsx` conta **322 righe** (la stima del Passo 12 era ~338; la differenza è dovuta a ottimizzazioni di formattazione avvenute durante i passi precedenti).

Il Passo 13 non crea nessun file nuovo e non modifica nessun altro file. Rimuove da `App.tsx` tutto il codice che i Passi 1–12 hanno già spostato altrove: import inutilizzati, l'enorme blocco di destructuring da `useAppData()`, i dieci `useMemo` locali ora duplicati in `use-visible-data.ts`, un `useEffect` spostato in `DialogsOverlay`, e i setter da `useAuth()` che non servono più in `AppContent`.

**Perché il Passo 13 è separato dai passi di estrazione**: rimuovere codice durante le estrazioni aumenta il rischio di regressioni. I Passi 7–12 estraggono ciascuno un componente o un blocco logico; se durante l'estrazione si rimuovesse anche il codice sorgente in `App.tsx`, una prop mancante, un import dimenticato o un effetto collaterale non considerato causerebbe un errore in un momento in cui il file era già stato modificato su due fronti simultaneamente. Consolidare prima (Passi 1–12) e pulire dopo (Passo 13) garantisce piena visibilità su cosa è rimasto effettivamente e perché.

**Una specificità rispetto agli altri passi di sola rimozione**: `App.tsx` contiene ancora i `useMemo` locali per `visibleAccounts`, `visibleTransactions`, `totalBalance`, `budgetAlerts` e gli altri calcolati derivati — perché durante i passi precedenti la logica è stata *copiata* in `use-visible-data.ts` senza essere rimossa da `App.tsx`. Il Passo 13 completa questa migrazione: i `useMemo` locali vengono rimossi e sostituiti con un'unica chiamata a `useVisibleData()`. Questo richiede di aggiungere un import (`useVisibleData`) e una riga di destructuring, ma comporta la rimozione di circa settanta righe di calcoli derivati. **È l'unica "aggiunta" consentita in questo passo**, ed è strettamente funzionale alla rimozione.

**Conteggio righe**:

| Stato | Righe |
|---|---|
| Dopo il Passo 12 (misurato) | **322** |
| Obiettivo originale del piano | ~70 |
| Stima realistica dopo il Passo 13 | **~135–145** |

**Nota sul divario rispetto all'obiettivo originale**: la stima di ~70 righe era stata formulata prima di conoscere l'entità degli attributi di accessibilità sulle `TabsTrigger` (ogni trigger occupa ~10 righe di JSX con `aria-label`, `data-focus-info`, `aria-controls`, `aria-selected`) e la lunghezza del `useEffect` di cambio tab con le sue sei diramazioni per screen reader (~28 righe). Rimuovere questi elementi richiederebbe ulteriori estrazioni (es. un componente `TabNavigation`) che eccedono lo scopo del Passo 13. L'obiettivo primario del piano — *App.tsx come pura composizione senza handler di business logic, calcoli derivati o dati persistiti gestiti localmente* — è pienamente raggiungibile a ~140 righe.

**Il comportamento dell'app è identico a prima**: nessuna logica viene modificata, solo il codice morto viene rimosso.

---

## 2. Perimetro della modifica

### File modificati

| Percorso | Modifica |
|---|---|
| `src/App.tsx` | Rimozione di tutti gli import, `useMemo`, `useEffect`, setter di stato e variabili locali non più necessari; aggiunta dell'import di `useVisibleData` e sostituzione dei `useMemo` locali con un'unica chiamata all'hook |

### File non creati

Nessun nuovo file viene creato in questo passo.

### File non toccati

| Percorso | Motivo |
|---|---|
| `src/context/AppDataContext.tsx` | Invariato |
| `src/context/AuthContext.tsx` | Invariato |
| `src/hooks/use-visible-data.ts` | Invariato |
| `src/hooks/use-app-shortcuts.ts` | Invariato |
| `src/components/DialogsOverlay.tsx` | Estratto nel Passo 12; invariato |
| `src/components/AppHeader.tsx` | Estratto nel Passo 10; invariato |
| `src/components/AuthScreen.tsx` | Estratto nel Passo 11; invariato |
| `src/components/DashboardTab.tsx` | Estratto nel Passo 8; invariato |
| `src/components/TransactionsTab.tsx` | Estratto nel Passo 7; invariato |
| `src/components/ReportsTab.tsx` | Estratto nel Passo 9; invariato |
| `docs/`, `.github/` | Invariati |

---

## 3. Inventario completo — cosa rimane e cosa viene rimosso

### Lista A — Cosa rimane in `App.tsx` (le ~135–145 righe finali)

**Import necessari** (~23 righe):

| Import | Motivo |
|---|---|
| `useState, useEffect` da `'react'` | `useState` per `activeTab` e `previousTab`; `useEffect` per il cambio tab |
| `formatCurrency` da `'@/lib/helpers'` | Usato nel `useEffect` del cambio tab (announce saldo Dashboard e totali Report) |
| `soundSystem` da `'@/lib/sound-system'` | `soundSystem.play('tab-change')` nel `useEffect` del cambio tab |
| `hapticSystem` da `'@/lib/haptic-system'` | `hapticSystem.tabChange()` nel `useEffect` del cambio tab |
| `useScreenReader` da `'@/hooks/use-screen-reader'` | `screenReader.announceNavigation`, `announceCount`, `announce` nel `useEffect` del cambio tab |
| `useIsMobile` da `'@/hooks/use-mobile'` | `size={isMobile ? 20 : 18}` nelle icone delle `TabsTrigger` |
| `AppDataProvider, useAppData` da `'@/context/AppDataContext'` | `AppDataProvider` per il wrapper in `App()`; `useAppData()` per gli handler di `BudgetAlertBanner` e i setter passati a `useAppShortcuts` |
| `AuthProvider, useAuth` da `'@/context/AuthContext'` | `AuthProvider` per il wrapper in `App()`; `useAuth()` per `isAuthenticated` |
| `useVisibleData` da `'@/hooks/use-visible-data'` | ⚠️ **Aggiunto in questo passo** — sostituisce tutti i `useMemo` locali rimossi |
| `useAppShortcuts` da `'@/hooks/use-app-shortcuts'` | Chiamato in `AppContent` |
| `SkipLink` | JSX |
| `FocusIndicator` | JSX |
| `AppHeader` | JSX |
| `BudgetAlertBanner` | JSX — ancora in `App.tsx`, non in un tab né in `DialogsOverlay` |
| `DashboardTab` | JSX |
| `TransactionsTab` | JSX |
| `ReportsTab` | JSX |
| `AuthScreen` | JSX — ritornato nel ramo `!isAuthenticated` |
| `DialogsOverlay` | JSX |
| `Tabs, TabsList, TabsTrigger` da `'@/components/ui/tabs'` | JSX — `TabsContent` non è necessario in `App.tsx` (ogni tab component include il proprio `TabsContent` internamente) |
| `Badge` da `'@/components/ui/badge'` | Hint da tastiera nelle `TabsTrigger` |
| `ChartLine, List, ArrowsLeftRight` da `'@phosphor-icons/react'` | Icone nelle tre `TabsTrigger` |
| `Toaster` da `'@/components/ui/sonner'` | JSX — figlio diretto del Fragment radice |

**Logica di `AppContent`** (~25 righe):

| Elemento | Tipo | Note |
|---|---|---|
| `const screenReader = useScreenReader()` | hook | Per il `useEffect` del cambio tab |
| `const isMobile = useIsMobile()` | hook | Per i size icon nelle `TabsTrigger` |
| `const { handleDismissBudgetAlert, handleViewBudget, setEditingBudget, setShowBudgetDialog, setShowTransactionDialog, setShowAccountDialog, setShowKeyboardHelp, setEditingTransaction, setEditingAccount } = useAppData()` | destructuring | 9 campi — tutti necessari: i primi 4 per `BudgetAlertBanner`, gli ultimi 5 per `useAppShortcuts` |
| `const { isAuthenticated } = useAuth()` | destructuring | Guard di autenticazione |
| `const { budgetAlerts, totalBalance, visibleAccounts, visibleTransactions } = useVisibleData()` | destructuring | 4 campi — `budgetAlerts` per il banner, gli altri 3 per il `useEffect` del cambio tab |
| `const [activeTab, setActiveTab] = useState('dashboard')` | stato locale | Controllato da `Tabs` e passato a `useAppShortcuts` |
| `const [previousTab, setPreviousTab] = useState('dashboard')` | stato locale | Traccia il tab precedente per il `useEffect` di cambio tab |

**`useEffect` cambio tab** (~28 righe): rimane integralmente in `AppContent`. Condizione: `activeTab !== previousTab && isAuthenticated`. Corpo: aggiorna `previousTab`, suona `tab-change`, vibra, annuncia la navigazione via screen reader; per Dashboard annuncia il conteggio conti e il saldo totale, per Movimenti annuncia il conteggio movimenti, per Report annuncia entrate e uscite totali. Dipendenze: `[activeTab, previousTab, isAuthenticated, visibleAccounts, visibleTransactions, totalBalance, screenReader]`.

**Chiamata `useAppShortcuts`** (~9 righe): invariata nella firma — riceve `{ activeTab, setActiveTab, setShowTransactionDialog, setShowAccountDialog, setShowKeyboardHelp, setEditingTransaction, setEditingAccount }`.

**Guard `!isAuthenticated`** (~3 righe): `if (!isAuthenticated) return <AuthScreen />`.

**JSX radice** (~50 righe): `SkipLink`, div sfondo con gradienti, `FocusIndicator`, `AppHeader`, `main` con `BudgetAlertBanner` condizionale e `Tabs`/`TabsList`/3x`TabsTrigger`/`DashboardTab`/`TransactionsTab`/`ReportsTab`, `DialogsOverlay`, `Toaster`.

**Funzione `App()`** (~8 righe): invariata — `AuthProvider > AppDataProvider > AppContent`.

**`export default App`** (1 riga).

---

### Lista B — Cosa viene rimosso da `App.tsx`

#### B.1 — Import inutilizzati (≈ 34 righe)

| Import rimosso | Motivo | Passo |
|---|---|---|
| `useMemo` da `'react'` | Tutti i `useMemo` locali vengono rimossi | Passo 5 (use-visible-data) |
| `Account, Transaction, Budget, SavingsGoal` da `'@/lib/types'` | Non referenziati direttamente in `AppContent` dopo la rimozione dei `useMemo` | Passi 1–3 |
| `ACCOUNT_CATEGORIES, ACCOUNT_TYPE_TO_CATEGORY` da `'@/lib/constants'` | Usati solo nel `useMemo` di `groupedAccounts`, ora in `use-visible-data` | Passo 5 |
| `calculateAccountBalance, getTotalBalance, getActiveBudgets` da `'@/lib/helpers'` | `calculateAccountBalance` e `getTotalBalance` erano in `useMemo` locali; `getActiveBudgets` non era più usato | Passi 5, 8 |
| `generateBudgetAlerts` da `'@/lib/budget-alerts'` | Usato nel `useMemo` di `budgetAlerts`, ora in `use-visible-data` | Passo 5 |
| `PinDialog` | Spostato in `DialogsOverlay` | Passo 12 |
| `AccountCard` | Spostato in `DashboardTab` | Passo 8 |
| `AccountDialog` | Spostato in `DialogsOverlay` | Passo 12 |
| `TransactionDialog` | Spostato in `DialogsOverlay` | Passo 12 |
| `BudgetDialog` | Spostato in `DialogsOverlay` | Passo 12 |
| `BudgetProgressCard` | Spostato in `DashboardTab` | Passo 8 |
| `BudgetHistoryChart` | Spostato in `ReportsTab` | Passo 9 |
| `BudgetComparisonCard` | Spostato in `ReportsTab` | Passo 9 |
| `BudgetForecastCard` | Spostato in `ReportsTab` | Passo 9 |
| `SavingsGoalDialog` | Spostato in `DialogsOverlay` | Passo 12 |
| `SavingsGoalCard` | Spostato in `DashboardTab` | Passo 8 |
| `KeyboardShortcutsHelp` | Spostato in `DialogsOverlay` | Passo 12 |
| `AudioSettings` | Spostato in `DashboardTab` (pannello impostazioni) | Passo 8 |
| `HapticSettings` | Spostato in `DashboardTab` | Passo 8 |
| `ScreenReaderSettings` | Spostato in `DashboardTab` | Passo 8 |
| `TalkBackSettings` | Spostato in `DashboardTab` | Passo 8 |
| `DisplaySettings` | Spostato in `DashboardTab` | Passo 8 |
| `SecuritySettings` | Spostato in `DashboardTab` | Passo 8 |
| `CategoryManagement` | Spostato in `DashboardTab` | Passo 8 |
| `DataManagement` | Spostato in `DashboardTab` o `TransactionsTab` | Passi 7–8 |
| `IncomeExpenseChart` | Spostato in `ReportsTab` | Passo 9 |
| `MonthlyComparisonChart` | Spostato in `ReportsTab` | Passo 9 |
| `PeriodSelector` | Spostato in `ReportsTab` | Passo 9 |
| `Button` da `ui/button` | Non presente nel JSX residuo di `App.tsx` | — |
| `TabsContent` da `ui/tabs` | Ogni componente tab include il proprio `TabsContent` internamente | Passi 7–9 |
| `Card, CardContent, CardDescription, CardHeader, CardTitle` da `ui/card` | Spostati nei tab component | Passi 7–9 |
| `Separator` da `ui/separator` | Non presente nel JSX residuo di `App.tsx` | — |
| `Tooltip, TooltipContent, TooltipTrigger` da `ui/tooltip` | Non presenti nel JSX residuo di `App.tsx` | — |
| `AlertDialog` e tutti i subcomponenti da `ui/alert-dialog` | Spostati in `DialogsOverlay` | Passo 12 |
| `Plus, LockOpen, Gear, Trash, PencilSimple, Eye, EyeSlash, Target, Info, PiggyBank` da `@phosphor-icons/react` | Icone non presenti nel JSX residuo; usate nei tab/dialog component | Passi 7–12 |
| `toast` da `'sonner'` | Non chiamato direttamente in `AppContent` dopo la pulizia | Passi 7–12 |
| `useListNavigation` | Non usato in `AppContent` dopo le estrazioni | Passi 7–9 |

#### B.2 — Destructuring da `useAppData()` rimosso (≈ 48 righe)

Il blocco di destructuring attuale conta ~55 righe con 40+ campi. Dopo il Passo 13 scende a 9 campi (~7 righe). Vengono rimossi:

| Campo rimosso | Motivo |
|---|---|
| `accounts, setAccounts` | Usati solo nei `useMemo` locali rimossi; i dati arrivano ora da `useVisibleData()` |
| `transactions, setTransactions` | Come sopra |
| `categories, setCategories` | Come sopra |
| `budgets, setBudgets` | Come sopra |
| `savingsGoals, setSavingsGoals` | Come sopra |
| `visibleCategories, setVisibleCategories` | Usati solo in `useMemo` locali rimossi |
| `dismissedAlerts, setDismissedAlerts` | Usati solo nel `useMemo` di `budgetAlerts` rimosso |
| `budgetPercentages, setBudgetPercentages` | Non usato nel JSX residuo di `App.tsx` |
| `safeAccounts, safeTransactions, safeCategories, safeBudgets, safeSavingsGoals` | Usati solo nei `useMemo` locali rimossi; ora accessibili via `useVisibleData()` internamente |
| `handleSaveAccount, handleSaveTransaction, handleSaveBudget, handleSaveSavingsGoal, handleDeleteConfirm` | Spostati in `DialogsOverlay` | 
| `handleExportCSV` | Spostato in `TransactionsTab` (via `useAppShortcuts`) |
| `toggleCategoryVisibility, toggleAllCategories` | Usati da `useAppShortcuts` internamente tramite `useAppData()` |
| `editingTransaction, setEditingTransaction, showTransactionDialog, setShowTransactionDialog` | `setEditingTransaction` e `setShowTransactionDialog` rimangono come parametri di `useAppShortcuts`; i valori dello stato sono letti da `DialogsOverlay` tramite `useAppData()` |
| `deletingItem, setDeletingItem, showDeleteDialog, setShowDeleteDialog` | Spostati in `DialogsOverlay` |
| `editingAccount, setEditingAccount, showAccountDialog, setShowAccountDialog` | `setEditingAccount`, `setShowAccountDialog` rimangono come parametri di `useAppShortcuts` |
| `showSavingsGoalDialog, setShowSavingsGoalDialog, editingSavingsGoal, setEditingSavingsGoal` | Spostati in `DialogsOverlay` |
| `handleAddFundsToGoal` | Spostato in `DashboardTab` |
| `showKeyboardHelp, setShowKeyboardHelp` | `setShowKeyboardHelp` rimane come parametro di `useAppShortcuts` |

#### B.3 — Destructuring da `useAuth()` rimosso (≈ 11 righe)

| Campo rimosso | Motivo |
|---|---|
| `globalPinHash, setGlobalPinHash` | Gestiti interamente da `AuthContext` e `AuthScreen` |
| `privatePinHash, setPrivatePinHash` | Gestiti da `AuthContext` e `DialogsOverlay` |
| `setIsAuthenticated` | Gestito internamente da `AuthContext` |
| `isPrivateUnlocked, setIsPrivateUnlocked` | Usato solo nei `useMemo` locali rimossi; `useVisibleData()` lo legge internamente |
| `isSetupMode, setIsSetupMode` | Gestiti da `AuthContext` e `AuthScreen` |
| `showPinDialog, setShowPinDialog` | Gestiti da `AuthContext` e `AuthScreen` |
| `showPrivatePinDialog, setShowPrivatePinDialog` | Gestiti da `DialogsOverlay` |
| `handleGlobalPinSubmit, handlePrivatePinSubmit` | Gestiti da `AuthScreen` e `DialogsOverlay` |

#### B.4 — `useMemo` locali rimossi (≈ 60 righe)

| `useMemo` rimosso | Ora fornito da | Passo in cui è stato aggiunto all'hook |
|---|---|---|
| `visibleAccounts` | `useVisibleData()` | Passo 5 |
| `visibleTransactions` | `useVisibleData()` | Passo 5 |
| `hasPrivateAccount` (inline `safeAccounts.some(...)`) | `useVisibleData()` | Passo 5 |
| `privateAccount` (inline `safeAccounts.find(...)`) | `useVisibleData()` | Passo 5 |
| `totalBalance` | `useVisibleData()` | Passo 5 |
| `recentTransactions` | `useVisibleData()` | Passo 5 |
| `groupedAccounts` | `useVisibleData()` | Passo 5 |
| `filteredGroupedAccounts` | `useVisibleData()` | Passo 5 |
| `allCategoriesVisible` | `useVisibleData()` | Passo 5 |
| `budgetAlerts` | `useVisibleData()` | Passo 5 |

#### B.5 — `useEffect` rimosso (≈ 5 righe)

| `useEffect` rimosso | Motivo | Spostato in |
|---|---|---|
| `useEffect(() => { if (showDeleteDialog) { soundSystem.play('dialog-open') } }, [showDeleteDialog])` | Il dialog di eliminazione è ora in `DialogsOverlay`; l'effetto sonoro all'apertura è più corretto gestirlo dove il dialog è renderizzato | `DialogsOverlay` (Passo 12) |

---

## 4. Struttura finale di `App.tsx`

### Schema a blocchi

```
App.tsx (~135–145 righe)
│
├── [Sezione 1 — Import] ~23 righe
│   ├── React: useState, useEffect
│   ├── Helpers: formatCurrency
│   ├── System: soundSystem, hapticSystem
│   ├── Hooks: useScreenReader, useIsMobile, AppDataProvider/useAppData,
│   │          AuthProvider/useAuth, useVisibleData, useAppShortcuts
│   ├── Componenti: SkipLink, FocusIndicator, AppHeader, BudgetAlertBanner,
│   │              DashboardTab, TransactionsTab, ReportsTab,
│   │              AuthScreen, DialogsOverlay
│   └── UI + icone: Tabs/TabsList/TabsTrigger, Badge,
│                   ChartLine/List/ArrowsLeftRight, Toaster
│
├── [Sezione 2 — AppContent] ~105 righe
│   ├── Hook calls (screenReader, isMobile) ~2 righe
│   ├── useAppData() destructuring (9 campi) ~7 righe
│   ├── useAuth() destructuring (isAuthenticated) ~1 riga
│   ├── useVisibleData() destructuring (4 campi) ~5 righe
│   ├── Stato locale (activeTab, previousTab) ~2 righe
│   ├── useEffect cambio tab ~28 righe
│   ├── useAppShortcuts() call ~9 righe
│   ├── Guard !isAuthenticated → <AuthScreen /> ~3 righe
│   └── JSX radice ~48 righe
│       ├── <SkipLink />
│       ├── div.min-h-screen
│       │   └── 3 div sfondo (gradienti) aria-hidden
│       │   └── div.relative
│       │       ├── <FocusIndicator />
│       │       ├── <AppHeader />
│       │       └── <main id="main-content" role="main">
│       │           ├── {budgetAlerts.length > 0 && <BudgetAlertBanner .../>}
│       │           └── <Tabs value={activeTab} onValueChange={setActiveTab}>
│       │               ├── <TabsList>
│       │               │   ├── <TabsTrigger value="dashboard" ...>
│       │               │   ├── <TabsTrigger value="transactions" ...>
│       │               │   └── <TabsTrigger value="reports" ...>
│       │               ├── <DashboardTab />
│       │               ├── <TransactionsTab />
│       │               └── <ReportsTab />
│       │       └── <DialogsOverlay />
│       └── <Toaster />
│
└── [Sezione 3 — App + export] ~9 righe
    ├── function App()
    │   └── <AuthProvider>
    │       └── <AppDataProvider>
    │           └── <AppContent />
    └── export default App
```

### Ordine dei provider

```
AuthProvider          ← outer (autentica prima che AppDataContext legga i dati)
  └── AppDataProvider ← inner (legge KV storage solo dopo che il provider è montato)
        └── AppContent
```

`AuthProvider` avvolge `AppDataProvider` perché `AppDataContext` usa `useScreenReader()` internamente (per i toast sonori degli handler) e altri hook che richiedono il contesto già inizializzato.

### Ordine degli elementi JSX nella struttura radice

```
<>
  <SkipLink />                       ← accessibilità: primo elemento del DOM
  <div min-h-screen>
    <div gradiente BR />              ← aria-hidden decorativi
    <div gradiente radiale />
    <div gradiente conico animate />
    <div relative>
      <FocusIndicator />             ← overlay globale indicatore focus
      <AppHeader />                  ← header con navigazione e controlli
      <main id="main-content">
        BudgetAlertBanner (cond.)    ← banner alert sopra i tab
        <Tabs>
          <TabsList>                 ← navigazione tab con badge kbd
          <DashboardTab />
          <TransactionsTab />
          <ReportsTab />
        </Tabs>
      </main>
      <DialogsOverlay />             ← tutti i dialog modali
    </div>
  </div>
  <Toaster />                        ← notifiche toast, fuori dal div principale
</>
```

---

## 5. Verifica TypeScript prima dell'avvio

Il Passo 13 **prescrive** di eseguire `tsc --noEmit` prima di avviare il dev server. Questo è obbligatorio per una ragione specifica: il Passo 13 è un passo di sintesi — rimuove da `App.tsx` molti campi che si suppone siano stati esportati correttamente dai context nei Passi 1–12. Se un campo necessario non è stato esposto, o è stato esposto con un tipo incompatibile, l'errore emerge tutto qui, in un unico momento.

Nei passi precedenti, `App.tsx` era ancora il fornitore di tutte queste variabili; TypeScript non poteva segnalare inconsistenze nei context perché `App.tsx` le computava localmente. Dopo il Passo 13, `App.tsx` consuma interamente ciò che i context producono — ed è quindi il primo momento in cui TypeScript può verificare l'intera catena.

**Categorie di errori TypeScript più probabili**:

| Categoria | Esempio | Causa tipica |
|---|---|---|
| Import rimosso ma ancora referenziato | `Cannot find name 'Account'` | Un tipo rimosso era ancora usato in un'annotazione locale rimasta |
| Valore non esposto dal context | `Property 'handleAddFundsToGoal' does not exist on type AppDataContextValue` | Il campo è stato rimosso dal context in un refactor precedente ma il codice locale lo usava ancora |
| Tipo implicito diventato `unknown` | `Parameter 'budget' implicitly has an 'any' type` | La funzione callback inline nel `handleViewBudget` non aveva annotazione di tipo e il tipo era inferito da una variabile locale ora rimossa |
| Mismatch tra `useVisibleData` e destructuring locale | `Property 'filteredGroupedAccounts' does not exist` | Se un campo viene referenziato in `App.tsx` ma viene dimenticato di rimuovere una riga di accesso |

**Comando da eseguire prima di `npm run dev`**:
```bash
npx tsc --noEmit
```

**Nessun errore atteso** se tutti i Passi 1–12 sono stati eseguiti correttamente.

---

## 6. Cosa NON fare in questo passo

- **Non creare nessun file nuovo**: nessun componente, hook, utility o test aggiuntivo
- **Non spostare logica**: se durante la pulizia emerge che qualcosa andava spostato in un context e non lo è stato, aprire un issue separato e non farlo inline nel Passo 13
- **Non correggere il debito UIContext**: gli undici stati UI dialog (`showTransactionDialog`, `editingTransaction`, `showDeleteDialog`, ecc.) rimangono in `AppDataContext` — questa è una decisione dichiarata nel Passo 12 e non viene rivista qui
- **Non rimuovere il secondo `SkipLink`**: verificare che nel JSX restino `<SkipLink />` e la struttura `id="main-content"` — entrambi sono richiesti dalla navigazione con screen reader
- **Non ottimizzare il codice che rimane**: il Passo 13 rimuove solo codice morto; non semplifica, non consolida, non rifattorizza ciò che resta
- **Non rimuovere l'annotazione `useMemo` nei commenti di `AppDataContext`**: i commenti di sezione nel context (es. `// Dialog transaction`) appartengono ad `AppDataContext.tsx`, non a `App.tsx`, e non vengono toccati in questo passo
- **Non rimuovere `useListNavigation` dall'elenco degli import senza verificare**: l'hook è importato in `App.tsx` — prima della rimozione, verificare con TypeScript che non sia referenziato in nessuna riga rimasta

---

## 7. Rischi e avvertenze

| Rischio | Mitigazione |
|---|---|
| Rimozione di un campo che sembra inutilizzato ma è ancora referenziato indirettamente | Lasciare che `tsc --noEmit` faccia la verifica prima di avviare l'app; non procedere se ci sono errori TypeScript |
| Il `useEffect` del cambio tab è presente in `App.tsx` e anche altrove (duplicazione) | Verificare che questo `useEffect` sia presente **esattamente una volta** nell'intera codebase; cercare `tab-change` e `announceNavigation` nel codice |
| `useAppShortcuts` chiamato due volte | Verificare che `useAppShortcuts` sia chiamato esattamente una volta in `AppContent` e non sia replicato in nessun altro file dopo le estrazioni |
| `Toaster` rimosso per errore | `<Toaster />` rimane figlio diretto del Fragment radice in `AppContent`; non si trova nei tab né in `DialogsOverlay` |
| `FocusIndicator` rimosso per errore | Verificare la presenza di `<FocusIndicator />` come primo figlio del `<div className="relative">` interno |
| Rimozione di `setShowTransactionDialog` dall'import di `useAppData` | Questo setter è ancora necessario — viene passato a `useAppShortcuts`; rimuoverlo causa errore TypeScript |
| Aggiunta di `useVisibleData` non completata | Se l'import viene aggiunto ma il destructuring no (o viceversa), TypeScript segnala subito l'errore; verificare entrambi |
| `BudgetAlertBanner` rimossa insieme agli altri componenti | `BudgetAlertBanner` rimane in `App.tsx`; non va spostata in nessun tab né in `DialogsOverlay` |

---

## 8. Criteri di verifica (definition of done)

### Conteggio righe

- [ ] `App.tsx` conta tra **120 e 160 righe** al termine del passo  
  *(La finestra è volutamente più ampia del target originale ~70 righe; vedi Sezione 1 per la spiegazione)*
- [ ] Nessuna dichiarazione `useState` locale rimasta oltre a `activeTab` e `previousTab`
- [ ] Nessun handler locale rimasto (tutti sono nei context)
- [ ] Nessun `useMemo` locale rimasto (tutti sono in `use-visible-data`)
- [ ] Il blocco di destructuring da `useAppData()` conta al massimo **9 campi**
- [ ] Il blocco di destructuring da `useAuth()` conta al massimo **1 campo** (`isAuthenticated`)
- [ ] Il blocco di destructuring da `useVisibleData()` conta al massimo **4 campi** (`budgetAlerts, totalBalance, visibleAccounts, visibleTransactions`)

### TypeScript

- [ ] `tsc --noEmit` non riporta nessun errore prima dell'avvio

### Comportamento funzionale

- [ ] L'app si avvia senza errori in console
- [ ] Login con PIN globale funziona
- [ ] Setup primo PIN funziona
- [ ] Navigazione tra i tre tab funziona (suono + announce screen reader)
- [ ] Aggiunta di una transazione funziona e aggiorna il saldo
- [ ] Modifica di un conto funziona
- [ ] Eliminazione di un elemento funziona (con dialog di conferma)
- [ ] Export CSV funziona
- [ ] Sblocco conto privato funziona (toast con saldo)
- [ ] Tutte le scorciatoie da tastiera funzionano
- [ ] `BudgetAlertBanner` appare e si può dismissare

### Regressioni

- [ ] Nessuna regressione in `TransactionsTab`
- [ ] Nessuna regressione in `DashboardTab`
- [ ] Nessuna regressione in `ReportsTab`
- [ ] `AppHeader` funziona correttamente
- [ ] `AuthScreen` funziona correttamente
- [ ] `DialogsOverlay` funziona per tutti e sette i dialog

### Obiettivo finale del piano

- [ ] `App.tsx` contiene solo composizione e routing
- [ ] Nessun handler di business logic in `App.tsx`
- [ ] Nessun calcolo derivato in `App.tsx` (sostituiti da `useVisibleData()`)
- [ ] Nessun dato persistito gestito direttamente in `App.tsx`
- [ ] Nessun `useMemo` in `App.tsx`
- [ ] TypeScript: zero errori
