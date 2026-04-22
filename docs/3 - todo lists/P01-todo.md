# P01 — Todo List: Context Split

> Checklist operativa sequenziale per il Pacchetto 1.  
> Coding Plan di riferimento: `docs/2 - coding plans/P01-coding-plan.md`  
> Ogni voce è indipendente da quelle successive nello stesso passo.  
> ⚠️ = richiede decisione su ambiguità prima di procedere (vedi AI1, AI2 nel coding plan)

---

## Prima di iniziare

- [x] Leggere `docs/2 - coding plans/P01-coding-plan.md` per intero
- [x] Decidere la strategia per **AI1** (`handleAddFundsToGoal`: context o App.tsx?)
- [x] Decidere la strategia per **AI2** (`setEditing*` dentro `handleSave*`: rimuovere o callback?)
- [x] Verificare di essere sul branch `refactoring-architettura`
- [x] Eseguire `npm run build` e confermare che compila senza errori prima di iniziare

---

## Passo 1 — AppDataContext: stato dati KV

### 1.1 Preparazione struttura

- [x] Creare la directory `src/context/` (non esiste)
- [x] Creare il file `src/context/AppDataContext.tsx` vuoto

### 1.2 Contenuto di `AppDataContext.tsx`

- [x] Aggiungere gli import: `react`, `@github/spark/hooks`, `@/lib/types`, `@/lib/constants`, `@/lib/helpers`
- [x] Definire l'interfaccia `AppDataContextValue` con le 8 coppie KV + 5 safe wrappers
- [x] Creare `AppDataContext` con `createContext<AppDataContextValue | null>(null)`
- [x] Implementare l'hook `useAppData()` con guard `if (!ctx) throw new Error(...)`
- [x] Aggiungere le 8 chiamate `useKV` nel corpo di `AppDataProvider`  
  - `accounts` / `transactions` / `categories` / `budgets` / `savingsGoals`  
  - `visibleCategories` (chiave: `'visible-categories'`, default: tutte le categorie)  
  - `dismissedAlerts` (chiave: `'dismissed-budget-alerts'`, default: `[]`)  
  - `budgetPercentages` (chiave: `'budget-percentages'`, default: `{}`)
- [x] Aggiungere i 5 `useMemo` safe wrappers (`safeAccounts` ... `safeSavingsGoals`)
- [x] Aggiungere il `useEffect` di init categorie default (solo il blocco `if (safeCategories.length === 0)`)
- [x] Restituire `<AppDataContext.Provider value={...}>{children}</AppDataContext.Provider>`
- [x] Esportare `AppDataProvider` e `useAppData`

### 1.3 Modifiche a `src/App.tsx`

- [x] Aggiungere import `import { AppDataProvider, useAppData } from '@/context/AppDataContext'`
- [x] Rimuovere da App.tsx: `useKV` accounts (~riga 59), transactions (~60), categories (~61), budgets (~62), savingsGoals (~63)
- [x] Rimuovere da App.tsx: `useKV` visibleCategories (~riga 86)
- [x] Rimuovere da App.tsx: `useKV` dismissedAlerts (~riga 88), budgetPercentages (~riga 89)
- [x] Rimuovere da App.tsx: le 5 righe safe wrappers senza `useMemo` (~righe 92–96)
- [x] Rimuovere da App.tsx: il blocco `if (safeCategories.length === 0)` dal `useEffect` init (~righe 104–109); **lasciare** il blocco PIN (righe ~99–103) — verrà rimosso al Passo 2
- [x] Aggiungere all'inizio di `function App()` la destructure `const { accounts, setAccounts, ..., safeAccounts, ... } = useAppData()`
- [x] Avvolgere il JSX di ritorno di `App` in `<AppDataProvider>...</AppDataProvider>`

### 1.4 Verifica Passo 1

- [x] `npm run build` → zero errori TypeScript
- [x] App si avvia nel browser senza errori in console (F12)
- [x] Login con PIN → funziona normalmente
- [x] Aggiungere un conto → F5 → il conto è ancora presente
- [x] In sessione pulita (cancellare localStorage) → categorie default caricate automaticamente

---

## Passo 2 — AuthContext: stato autenticazione

> **Prerequisito**: Passo 1 completato e verificato ✓

### 2.1 Creazione di `AuthContext.tsx`

- [x] Creare il file `src/context/AuthContext.tsx` vuoto
- [x] Aggiungere gli import: `react`, `@github/spark/hooks`
- [x] Definire l'interfaccia `AuthContextValue` con le 2 coppie KV + 5 stati effimeri + relativi setter
- [x] Creare `AuthContext` con `createContext<AuthContextValue | null>(null)`
- [x] Implementare l'hook `useAuth()` con guard `if (!ctx) throw new Error(...)`
- [x] Aggiungere le 2 chiamate `useKV` nel corpo di `AuthProvider`:  
  - `globalPinHash` (chiave: `'global-pin-hash'`, default: `''`)  
  - `privatePinHash` (chiave: `'private-pin-hash'`, default: `''`)
- [x] Aggiungere i 5 `useState` per stato effimero:  
  - `isAuthenticated` (false), `isPrivateUnlocked` (false), `isSetupMode` (false)  
  - `showPinDialog` (false), `showPrivatePinDialog` (false)
- [x] Aggiungere `useEffect` init PIN (il blocco `if (!globalPinHash) ... else ...`, solo la parte auth)
- [x] Restituire `<AuthContext.Provider value={...}>{children}</AuthContext.Provider>`
- [x] Esportare `AuthProvider` e `useAuth`

### 2.2 Modifiche a `src/App.tsx`

- [x] Aggiungere import `import { AuthProvider, useAuth } from '@/context/AuthContext'`
- [x] Rimuovere da App.tsx: `useKV` globalPinHash (~riga 57), privatePinHash (~riga 58)
- [x] Rimuovere da App.tsx: `useState` isAuthenticated (~65), isPrivateUnlocked (~66), isSetupMode (~67)
- [x] Rimuovere da App.tsx: `useState` showPinDialog (~69), showPrivatePinDialog (~70)
- [x] Rimuovere da App.tsx: il `useEffect` init PIN (il blocco rimasto al Passo 1, righe ~98–103); se il `useEffect` è ora vuoto, rimuovere anche l'intera chiamata
- [x] Aggiungere all'inizio di `function App()` la destructure `const { globalPinHash, ..., showPrivatePinDialog, setShowPrivatePinDialog } = useAuth()`
- [x] Aggiornare il JSX di ritorno: avvolgere in `<AuthProvider>` esterno, mantenendo `<AppDataProvider>` interno:
  ```tsx
  <AuthProvider>
    <AppDataProvider>
      {/* contenuto esistente */}
    </AppDataProvider>
  </AuthProvider>
  ```
- [x] Verificare che `AuthProvider` sia il wrapper **esterno** e `AppDataProvider` quello **interno**

### 2.3 Verifica Passo 2

- [x] `npm run build` → zero errori TypeScript
- [x] App si avvia senza errori in console
- [x] Login con PIN corretto → accesso consentito
- [x] Setup primo PIN (sessione pulita) → hash salvato, accesso concesso
- [x] PIN errato → toast "PIN non corretto" appare
- [x] `isAuthenticated` è `false` prima del login (verificabile con console.log temporaneo)

---

## Passo 3 — Handler CRUD in `AppDataContext`

> **Prerequisito**: Passo 1 completato e verificato ✓  
> **Prerequisito**: Decisioni su AI1 e AI2 prese e documentate

### 3.1 Preparazione firme modificate

- [x] Aggiornare `AppDataContextValue` in `AppDataContext.tsx` con le firme di tutti gli handler (incluse firme modificate per R2, R3)
- [x] Aggiungere gli import aggiuntivi in `AppDataContext.tsx`: `toast`, `soundSystem`, `hapticSystem`, `useScreenReader`, helper functions, `generateBudgetAlerts`, `shouldShowBudgetNotification`, `getBudgetNotificationTitle`

### 3.2 Spostamento handler da App.tsx a AppDataContext.tsx

- [x] Spostare `handleSaveAccount` (~righe 178–199): incollare nel corpo di `AppDataProvider`; gestire la riga `setEditingAccount(undefined)` secondo AI2
- [x] Spostare `handleSaveTransaction` (~righe 201–241) + `checkBudgetNotifications` (~righe 243–285): spostare entrambi; gestire `setEditingTransaction(undefined)` secondo AI2
- [x] Spostare `handleSaveBudget` (~righe 287–308): gestire `setEditingBudget(undefined)` secondo AI2
- [x] Spostare `handleSaveSavingsGoal` (~righe 310–330): gestire `setEditingSavingsGoal(undefined)` secondo AI2
- [x] Spostare `handleDeleteConfirm` (~righe 337–381): modificare la firma per accettare `item` come parametro; rimuovere la lettura di `deletingItem` dalla closure
- [x] Spostare `handleExportCSV` (~righe 383–390): modificare la firma per accettare `visibleTransactions` e `visibleAccounts` come parametri
- [x] Spostare `toggleCategoryVisibility` (~righe 486–500): nessuna modifica alla firma
- [x] Spostare `toggleAllCategories` (~righe 502–514): nessuna modifica
- [x] Spostare `handleDismissBudgetAlert` (~righe 528–534): nessuna modifica
- [x] Spostare `handleViewBudget` (~righe 536–548): modificare la firma per accettare `onNavigate: (budget: Budget) => void`; rimuovere le chiamate dirette a `setActiveTab`, `setEditingBudget`, `setShowBudgetDialog`
- [x] Gestire `handleAddFundsToGoal` secondo la decisione AI1

### 3.3 Aggiornamento call site in `App.tsx`

- [x] Aggiornare la destructure `useAppData()` per includere tutti gli handler
- [x] Aggiornare la chiamata a `handleDeleteConfirm` → passare `deletingItem` come argomento
- [x] Aggiornare la chiamata a `handleExportCSV` → passare `visibleTransactions`, `visibleAccounts`
- [x] Aggiornare la chiamata a `handleViewBudget` → passare `onNavigate` callback che imposta `activeTab`, `editingBudget`, `showBudgetDialog`
- [x] Verificare che non rimangano riferimenti orfani agli handler rimossi da App.tsx

### 3.4 Verifica Passo 3

- [x] `npm run build` → zero errori TypeScript
- [x] Aggiungere una transazione (entrata) → toast corretto + saldo aggiornato
- [x] Aggiungere una transazione (uscita) → nessuna regressione sui budget alert
- [x] Modificare un conto esistente → toast "Conto modificato"
- [x] Eliminare un movimento → toast "Movimento eliminato", movimento scompare dalla lista
- [x] Esportare CSV → file scaricato, contenuto verificato
- [x] Toggle singola categoria → filtro applicato nella dashboard
- [x] Toggle tutte le categorie → tutte visibili / tutte nascoste

---

## Passo 4 — Handler PIN in `AuthContext`

> **Prerequisito**: Passo 2 completato e verificato ✓

### 4.1 Preparazione firme

- [x] Aggiornare `AuthContextValue` in `AuthContext.tsx` con le firme dei due handler
- [x] Aggiungere gli import aggiuntivi in `AuthContext.tsx`: `hashPin`, `verifyPin` da `@/lib/crypto`; `toast`; `soundSystem`; `hapticSystem`; `useScreenReader`

### 4.2 Spostamento handler da App.tsx ad AuthContext.tsx

- [x] Spostare `handleGlobalPinSubmit` (~righe 118–145): incollare nel corpo di `AuthProvider`; nessuna modifica alla logica
- [x] Spostare `handlePrivatePinSubmit` (~righe 147–176): modificare la firma per aggiungere `onUnlocked?: (balance: number) => void`; rimuovere dal corpo le righe che usano `visibleAccounts` e `calculateAccountBalance`; sostituirle con la chiamata `onUnlocked?.(balance)` dove `balance` viene calcolato dal chiamante

### 4.3 Implementazione callback nel chiamante (App.tsx)

- [x] Trovare il punto in App.tsx (o nel componente PinDialog) dove viene chiamato `handlePrivatePinSubmit`
- [x] Aggiornare la chiamata: passare la callback `onUnlocked` che calcola il saldo usando `visibleAccounts` e `visibleTransactions` (ancora disponibili come `useMemo` in App.tsx) e chiama `screenReader.announceBalance`

### 4.4 Aggiornamento call site in `App.tsx`

- [x] Aggiornare la destructure `useAuth()` per includere `handleGlobalPinSubmit` e `handlePrivatePinSubmit`
- [x] Rimuovere le definizioni degli handler da App.tsx
- [x] Verificare che tutti i riferimenti JSX a questi handler siano aggiornati

### 4.5 Verifica Passo 4

- [x] `npm run build` → zero errori TypeScript
- [x] Login con PIN globale corretto → accesso consentito, toast, suono
- [x] PIN globale errato → toast "PIN non corretto", suono errore
- [x] Setup primo PIN (sessione pulita) → hash salvato, toast "PIN globale creato"
- [x] PIN privato corretto → conto privato appare nella dashboard
- [x] PIN privato errato → toast "PIN privato non corretto"
- [x] Con screen reader attivo e conto privato esistente → saldo annunciato dopo sblocco

---

## Verifica finale P01

- [x] `npm run build` → zero errori TypeScript sull'intero progetto
- [x] Nessun errore in console durante navigazione normale (F12)
- [x] Tutti i criteri di verifica del design doc (sezione 7) superati:
  - [x] Autenticazione intatta (PIN corretto/errato)
  - [x] Dati persistiti dopo F5
  - [x] Conto privato sbloccabile
  - [x] Console browser senza errori rossi
  - [x] Categorie default al primo avvio
- [x] I file `src/lib/`, `src/hooks/`, `src/components/` non sono stati modificati
- [x] I file in `.github/` non sono stati modificati
