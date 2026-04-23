# P08 — Todo List: Estrazione `DashboardTab`

> Checklist operativa sequenziale per il Pacchetto 8.  
> Coding Plan di riferimento: `docs/2 - coding plans/P08-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P08-DashboardTab-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [x] Leggere `docs/2 - coding plans/P08-coding-plan.md` per intero
- [x] Prendere nota dell'ambiguità **AI1** (`AccountCard` senza `onClick` nell'originale — va aggiunto nel nuovo componente con `soundSystem`, `hapticSystem`, `setEditingAccount`, `setShowAccountDialog`)
- [x] Prendere nota dell'ambiguità **AI2** (`soundSystem` e `hapticSystem` vanno importati direttamente in `DashboardTab.tsx` da `@/lib/sound-system` e `@/lib/haptic-system`)
- [x] Prendere nota dell'ambiguità **AI3** (`recentTransactions` è già ordinato — nessun sort aggiuntivo nei callback di `recentTransactionsNav`)
- [x] Prendere nota dell'ambiguità **AI4** (dopo Passo A, `setShowAccountDialog` e `setEditingAccount` vengono da `useAppData()` — il blocco `useAppShortcuts` in `App.tsx` rimane invariato)
- [x] Prendere nota dell'ambiguità **AI5** (`enabled: isAuthenticated` in `recentTransactionsNav` — la condizione `activeTab === 'dashboard'` è implicita per il mount)
- [x] Verificare di essere sul branch `refactoring-architettura`
- [x] Eseguire `npm run build` e confermare che compila senza errori **prima** di iniziare

---

## Passo A — Modifica `src/context/AppDataContext.tsx`

> **Prerequisito**: nessuno (P01–P07 già presenti nel branch).

### A.1 Aggiornamento del tipo `AppDataContextValue` (~righe 51–55)

- [x] Aprire `src/context/AppDataContext.tsx`
- [x] Individuare la sezione dialog delete alla fine dell'interfaccia: `showDeleteDialog: boolean` e `setShowDeleteDialog: (v: boolean) => void`
- [x] Aggiungere **dopo** `setShowDeleteDialog` e **prima** della chiusura `}` del tipo:
  ```ts
  // Dialog account
  editingAccount: Account | undefined
  setEditingAccount: (a: Account | undefined) => void
  showAccountDialog: boolean
  setShowAccountDialog: (v: boolean) => void
  ```
- [x] Verificare che l'interfaccia importi `Account` — è già presente nell'import esistente di `@/lib/types`

### A.2 Dichiarazione degli `useState` in `AppDataProvider` (~dopo riga 77)

- [x] Individuare `const [showDeleteDialog, setShowDeleteDialog] = useState(false)` (~riga 77)
- [x] Aggiungere subito **dopo** (prima di `const safeAccounts = useMemo(...)`):
  ```ts
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  ```
- [x] Verificare che `useState` sia già nell'import React di riga 1 (aggiunto nel Passo 7) ✓

### A.3 Aggiornamento del valore del Provider (~dopo riga 400)

- [x] Individuare `setShowDeleteDialog,` nell'oggetto `value` di `AppDataContext.Provider`
- [x] Aggiungere subito **dopo**:
  ```ts
  editingAccount,
  setEditingAccount,
  showAccountDialog,
  setShowAccountDialog,
  ```

### A.4 Aggiornamento destructuring `useAppData()` in `App.tsx` (~righe 60–97)

- [x] Aprire `src/App.tsx`
- [x] Individuare il blocco destructuring `const { ... } = useAppData()`
- [x] Aggiungere i 4 nuovi campi (posizione consigliata: dopo `setShowDeleteDialog,`):
  ```ts
  editingAccount,
  setEditingAccount,
  showAccountDialog,
  setShowAccountDialog,
  ```

### A.5 Rimozione degli `useState` locali in `App.tsx`

- [x] Individuare e rimuovere riga ~108: `const [showAccountDialog, setShowAccountDialog] = useState(false)`
- [x] Individuare e rimuovere riga ~113: `const [editingAccount, setEditingAccount] = useState<Account | undefined>()`
- [x] ⚠️ **Non rimuovere** `showBudgetDialog`, `showSavingsGoalDialog`, `showKeyboardHelp`, `editingBudget`, `editingSavingsGoal` — rimangono locali in `App.tsx`
- [x] Verificare che il blocco `useAppShortcuts` (~righe 255–262) **non venga modificato** — `setShowAccountDialog` e `setEditingAccount` vi arrivano ora dal context ma la chiamata è identica

### A.6 Verifica del Passo A

- [x] Salvare entrambi i file
- [x] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Verificare che `useAppData()` nel tipo esponga `editingAccount`, `setEditingAccount`, `showAccountDialog`, `setShowAccountDialog`
- [x] Verificare che `App.tsx` non contenga più `useState` locali per `showAccountDialog` e `editingAccount`
- [x] ⚠️ **R6**: non procedere al Passo B fino a zero errori TypeScript

***

---

## Passo B — Creazione `src/components/DashboardTab.tsx`

> **Prerequisito**: Passo A completato e verificato (`tsc --noEmit` a zero errori) ✓

### B.1 Creazione del file e import

- [x] Creare il file `src/components/DashboardTab.tsx` vuoto
- [x] Aggiungere import da `@/context/AppDataContext`: `useAppData`
- [x] Aggiungere import da `@/context/AuthContext`: `useAuth`
- [x] Aggiungere import da `@/hooks/use-visible-data`: `useVisibleData`
- [x] Aggiungere import da `@/hooks/use-mobile`: `useIsMobile`
- [x] Aggiungere import da `@/hooks/use-list-navigation`: `useListNavigation`
- [x] ⚠️ **R1**: aggiungere import da `@/lib/helpers`: `calculateAccountBalance`, `formatCurrency` — importati **direttamente**, non via context
- [x] ⚠️ **R2**: aggiungere import da `@/lib/constants`: `ACCOUNT_CATEGORIES` — importato **direttamente**, necessario per il reset filtri
- [x] ⚠️ **AI2**: aggiungere import da `@/lib/sound-system`: `soundSystem`
- [x] ⚠️ **AI2**: aggiungere import da `@/lib/haptic-system`: `hapticSystem`
- [x] Aggiungere import da `@/components/AccountCard`: `AccountCard`
- [x] Aggiungere import da `@/components/ui/button`: `Button`
- [x] Aggiungere import da `@/components/ui/card`: `Card`, `CardContent`
- [x] Aggiungere import da `@/components/ui/badge`: `Badge`
- [x] Aggiungere import da `@/components/ui/separator`: `Separator`
- [x] Aggiungere import da `@/components/ui/tabs`: `TabsContent`
- [x] Aggiungere import da `@/components/ui/tooltip`: `Tooltip`, `TooltipContent`, `TooltipTrigger`
- [x] Aggiungere import da `@phosphor-icons/react`: `Plus`, `EyeSlash`, `Eye`, `LockOpen`, `PencilSimple`, `Trash`

### B.2 Firma del componente

- [x] Aprire `export function DashboardTab() {`
- [x] Verificare che il componente non abbia props

### B.3 Sorgenti dati — destructuring

- [x] Destructure da `useAppData()`: `safeCategories`, `setEditingTransaction`, `setShowTransactionDialog`, `setDeletingItem`, `setShowDeleteDialog`, `setEditingAccount`, `setShowAccountDialog`, `toggleCategoryVisibility`, `toggleAllCategories`, `setVisibleCategories`, `visibleCategories`
- [x] Destructure da `useAuth()`: `isAuthenticated`, `isPrivateUnlocked`, `setShowPrivatePinDialog`
- [x] Destructure da `useVisibleData()`: `visibleAccounts`, `visibleTransactions`, `recentTransactions`, `groupedAccounts`, `filteredGroupedAccounts`, `allCategoriesVisible`, `hasPrivateAccount`
- [x] Dichiarare `const isMobile = useIsMobile()`

### B.4 Inizializzazione di `recentTransactionsNav`

- [x] Aprire il blocco `const recentTransactionsNav = useListNavigation({`
- [x] Impostare `itemCount: recentTransactions.length`
- [x] ⚠️ **AI5**: impostare `enabled: isAuthenticated` — la condizione `activeTab === 'dashboard'` **non** va aggiunta (implicita per il mount)
- [x] Aggiungere callback `onEnter`: usa `recentTransactions[index]` — **senza sort** (⚠️ **AI3**)
- [x] Aggiungere callback `onDelete`: usa `recentTransactions[index]` — **senza sort**
- [x] Aggiungere callback `onEdit`: usa `recentTransactions[index]` — **senza sort**

### B.5 JSX del componente

- [x] Aprire `src/App.tsx` e individuare il blocco `<TabsContent value="dashboard" ...>` (riga ~437)
- [x] Individuare la chiusura `</TabsContent>` corrispondente (riga ~738)
- [x] Copiare il blocco (circa 301 righe) come `return (...)` del componente
- [x] ⚠️ **AI1**: aggiungere `onClick` ad `AccountCard` per i conti esistenti (righe ~629–635 originali):
  ```tsx
  <AccountCard
    key={account.id}
    account={account}
    balance={balance}
    onClick={() => {
      soundSystem.play('dialog-open')
      hapticSystem.dialogOpen()
      setEditingAccount(account)
      setShowAccountDialog(true)
    }}
  />
  ```
- [x] ⚠️ **R5**: verificare che i bottoni filtro iterino su `{groupedAccounts.map((category, index) => {...})}` — **NON** su `filteredGroupedAccounts`
- [x] ⚠️ **R5**: verificare che la griglia conti usi `{filteredGroupedAccounts.map(group => {...})}` — questa è la parte corretta da filtrare
- [x] Verificare che `recentTransactionsNav.isFocused(index)` e `recentTransactionsNav.setFocusedIndex(index)` siano referenziati correttamente (istanza locale da B.4)
- [x] Verificare che tutti i setter siano disponibili localmente (da B.3)
- [x] Chiudere la funzione componente con `}`

### B.6 Verifica del Passo B

- [x] Salvare il file
- [x] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Verificare che `src/components/DashboardTab.tsx` esista
- [x] Verificare che `export function DashboardTab` sia presente
- [x] L'app **non cambia ancora** — `App.tsx` non è stato modificato in questo passo

---

## Passo C — Modifica `src/App.tsx`

> **Prerequisito**: Passi A e B completati e verificati (`tsc --noEmit` a zero errori) ✓

### C.1 Aggiunta import `DashboardTab` (~riga 35)

- [x] Aprire `src/App.tsx`
- [x] Aggiungere vicino all'import di `TransactionsTab`:
  ```ts
  import { DashboardTab } from '@/components/DashboardTab'
  ```

### C.2 Rimozione di `recentTransactionsNav` (~righe 226–253)

- [x] Individuare `const recentTransactionsNav = useListNavigation({` (~riga 226)
- [x] Individuare la chiusura `})` del blocco (~riga 253)
- [x] Rimuovere l'intero blocco (~26 righe)
- [x] ⚠️ Verificare che il blocco `useAppShortcuts(...)` immediatamente successivo (~righe 255–262) **NON** venga rimosso

### C.3 Pulizia di `recentTransactions` dalla destructuring (~riga ~200)

- [x] Cercare `recentTransactions` nella destructuring di `useVisibleData()` in `App.tsx`
- [x] Se TypeScript segnala `recentTransactions` come inutilizzato, rimuoverlo dalla destructuring

### C.4 Sostituzione del blocco `TabsContent value="dashboard"` (righe ~437–738)

- [x] Individuare `<TabsContent value="dashboard" className="space-y-4 sm:space-y-6" id="dashboard-panel" ...>` (~riga 437)
- [x] Individuare la chiusura `</TabsContent>` corrispondente (~riga 738)
- [x] Rimuovere l'intero blocco (~301 righe)
- [x] Inserire al posto del blocco rimosso:
  ```tsx
  <DashboardTab />
  ```
- [x] Verificare che `<TransactionsTab />` rimanga al suo posto
- [x] Verificare che `<TabsContent value="reports"` rimanga invariato

### C.5 Verifica import inutilizzati in `App.tsx`

- [x] Verificare con TypeScript se i seguenti import sono ancora usati dopo l'estrazione:
  - [x] `AccountCard` — probabilmente inutilizzato (solo nella Dashboard): rimuovere se confermato
  - [x] `Eye`, `EyeSlash` — probabilmente inutilizzati (solo nei filtri): rimuovere se confermato
  - [x] `LockOpen` — probabilmente inutilizzato (solo nel pulsante Sblocca): rimuovere se confermato
  - [x] `calculateAccountBalance` — probabilmente inutilizzato: rimuovere se confermato
  - [x] `PencilSimple`, `Trash` — verificare se usati in `ReportsTab` o `DialogsOverlay`: rimuovere solo se confermati inutilizzati
- [x] ⚠️ Non rimuovere import speculativamente — affidarsi agli errori TypeScript

### C.6 Verifica del Passo C

- [x] Salvare il file
- [x] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Eseguire `npm run build` → compilazione riuscita senza errori o warning
- [x] `grep "recentTransactionsNav" src/App.tsx` → zero risultati
- [x] `grep "TabsContent value=\"dashboard\"" src/App.tsx` → zero risultati
- [x] `grep "DashboardTab" src/App.tsx` → 2 risultati (import + `<DashboardTab />`)
- [x] `grep "editingAccount" src/App.tsx` → solo nella destructuring `useAppData()` e in `AccountDialog` (DialogsOverlay)

---

## Verifica finale

### Compilazione

- [x] `npx tsc --noEmit` → zero errori TypeScript
- [x] `npm run build` → compilazione riuscita senza errori o warning

### Test manuale — 24 scenari (tutti obbligatori)

> ⚠️ Aprire il tab Dashboard per prima cosa e verificare che non sia bianco.

- [x] **Scenario 1** — Aprire il tab Dashboard → conti visualizzati raggruppati per categoria con saldi corretti
- [x] **Scenario 2** — Click su un bottone categoria (es. "Bancari") → categoria nascosta/mostrata; bottone cambia variant visivo
- [x] **Scenario 3** — Click sul bottone "Mostra/Nascondi tutto" → tutte le categorie mostrate o nascoste contestualmente
- [x] **Scenario 4** — Nascondere tutte le categorie → compare messaggio "Nessun conto da visualizzare" con bottone "Mostra Tutti i Conti"
- [x] **Scenario 5** — Click su "Mostra Tutti i Conti" → tutte le categorie tornano visibili; griglia si ripopola
- [x] **Scenario 6** — Hover sui bottoni filtro categoria → Tooltip mostra label, descrizione e numero di conti corretti
- [x] **Scenario 7** — Click su "Nuovo Movimento" → `TransactionDialog` apre con form vuoto
- [x] **Scenario 8** — Click su "Nuovo Conto" → `AccountDialog` apre con form vuoto
- [x] **Scenario 9** — Click su un conto esistente nella griglia → `AccountDialog` apre precompilato con dati del conto (⚠️ AI1)
- [x] **Scenario 10** — Pulsante elimina conto → `AlertDialog` di conferma apre con il conto corretto
- [x] **Scenario 11** — Confermare eliminazione conto → conto rimosso dalla griglia
- [x] **Scenario 12** — Conto privato presente e non sbloccato → compare bottone "Sblocca Privato"
- [x] **Scenario 13** — Click su "Sblocca Privato" → `PinDialog` per il PIN privato apre
- [x] **Scenario 14** — Conto privato già sbloccato → bottone "Sblocca Privato" non compare
- [x] **Scenario 15** — Lista movimenti recenti non vuota → movimenti visualizzati con data, conto, importo e colore corretto
- [x] **Scenario 16** — Premere ↑/↓ nella lista movimenti recenti → focus si sposta tra le righe con highlight visivo corretto
- [x] **Scenario 17** — Premere Enter o E su un movimento focalizzato → `TransactionDialog` apre precompilato sul movimento corretto
- [x] **Scenario 18** — Premere Del su un movimento focalizzato → `AlertDialog` di conferma apre sul movimento corretto
- [x] **Scenario 19 (regressione)** — Aprire il tab Movimenti → `TransactionsTab` funziona identicamente a prima del Passo 8
- [x] **Scenario 20 (regressione)** — Aprire il tab Report → card budget, obiettivi e impostazioni rimangono funzionali
- [x] **Scenario 21** — Shortcut Ctrl+M da qualsiasi tab → `AccountDialog` apre vuoto
- [x] **Scenario 22** — Shortcut Ctrl+N da qualsiasi tab → `TransactionDialog` apre vuoto
- [x] **Scenario 23 (accessibilità)** — Bottoni filtro categoria con screen reader → ogni bottone annuncia nome categoria e numero di conti via `data-focus-info`
- [x] **Scenario 24 (accessibilità)** — Lista movimenti recenti con screen reader → ogni riga annuncia descrizione, tipo e importo; pulsanti modifica/elimina hanno `aria-label` corretti

### Test di regressione shortcut globali

- [x] Ctrl+D → naviga al tab Dashboard
- [x] Ctrl+T → naviga al tab Movimenti
- [x] Ctrl+R → naviga al tab Report
- [x] Ctrl+E → esporta CSV (tab Movimenti)
- [x] Tasti 1–5 → toggle categorie
- [x] Ctrl+A → toggle tutte le categorie
- [x] ? → apre finestra scorciatoie da tastiera

***

**Completato il 2026-04-23.**
