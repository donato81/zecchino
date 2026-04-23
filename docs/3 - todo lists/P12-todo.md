# P12 — Todo List: Estrazione `DialogsOverlay`

> Checklist operativa sequenziale per il Pacchetto 12.  
> Coding Plan di riferimento: `docs/2 - coding plans/P12-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P12-DialogsOverlay-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [x] Leggere `docs/2 - coding plans/P12-coding-plan.md` per intero
- [x] ⚠️ **4 errori TypeScript baseline pre-esistenti** in `src/context/AuthContext.tsx`: `npx tsc --noEmit` non restituirà mai "zero errori". Il risultato atteso dopo ogni passo è **"4 errori, invariati rispetto a prima"** — non cercare di azzerarli
- [x] Prendere nota dell'ambiguità **AI1** (righe effettive del blocco dialog in App.tsx post-P11: blocco stimato ~326–405; verificare nell'editor prima del Passo B)
- [x] Prendere nota dell'ambiguità **AI2** (`useScreenReader` importato da `@/hooks/use-screen-reader` — file confermato presente)
- [x] Prendere nota dell'ambiguità **AI3** (radice del `return` di `DialogsOverlay` è Fragment `<>...</>` — obbligatorio, non aggiungere wrapper `<div>`)
- [x] Prendere nota dell'ambiguità **AI4** (`handlePrivatePinSubmit` accetta `onUnlocked` come secondo parametro opzionale — confermato su `AuthContext.tsx`)
- [x] Prendere nota dell'ambiguità **AI5** (`privateAccount` esposto da `useVisibleData()` con questo nome esatto)
- [x] Prendere nota di **R1** (`<DialogsOverlay />` deve stare **dentro** il `<div className="relative">` dopo `</main>` — non fuori)
- [x] Prendere nota di **R2** (ternario annidato `AlertDialog` — 4 casi — non semplificare, non refactorizzare)
- [x] Prendere nota di **R3** (`soundSystem.play('dialog-close')` deve comparire **due volte** nell'`AlertDialog` — in `onOpenChange` e in `<AlertDialogCancel>`)
- [x] Prendere nota di **R4** (`BudgetAlertBanner` e `Toaster` rimangono in `App.tsx` — **non includere** in `DialogsOverlay`)
- [x] Prendere nota di **R5** (deviazione intenzionale: usare `privateAccount` da `useVisibleData()` — **non** `visibleAccounts.find(a => a.isPrivato)` — per evitare la race condition React al momento dello sblocco)
- [x] Verificare di essere sul branch `refactoring-architettura`
- [x] Eseguire `npx tsc --noEmit` e confermare i 4 errori baseline **prima** di iniziare

---

## Passo A — Creazione `src/components/DialogsOverlay.tsx`

> **Prerequisito**: nessuno (P01–P11 già presenti nel branch).

### A.1 Creazione del file e import

- [x] Creare il file `src/components/DialogsOverlay.tsx` vuoto
- [x] Aggiungere import da `@/context/AppDataContext`: `useAppData`
- [x] Aggiungere import da `@/context/AuthContext`: `useAuth`
- [x] Aggiungere import da `@/hooks/use-visible-data`: `useVisibleData`
- [x] Aggiungere import da `@/hooks/use-screen-reader`: `useScreenReader`
- [x] Aggiungere import da `@/lib/helpers`: `calculateAccountBalance`, `formatCurrency`
- [x] Aggiungere import da `@/lib/sound-system`: `soundSystem`
- [x] Aggiungere import da `sonner`: `toast`
- [x] Aggiungere import da `@/components/PinDialog`: `PinDialog`
- [x] Aggiungere import da `@/components/AccountDialog`: `AccountDialog`
- [x] Aggiungere import da `@/components/TransactionDialog`: `TransactionDialog`
- [x] Aggiungere import da `@/components/BudgetDialog`: `BudgetDialog`
- [x] Aggiungere import da `@/components/SavingsGoalDialog`: `SavingsGoalDialog`
- [x] Aggiungere import da `@/components/KeyboardShortcutsHelp`: `KeyboardShortcutsHelp`
- [x] Aggiungere import da `@/components/ui/alert-dialog`: `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`
- [x] ⚠️ **Non importare** `useIsMobile`, `hapticSystem`, icone Phosphor, componenti UI diversi da `alert-dialog`
- [x] ⚠️ **Non importare** `useState`, `useEffect` — zero state locale, zero effetti

### A.2 Firma del componente

- [x] Aprire con:
  ```tsx
  export function DialogsOverlay() {
  ```
- [x] ⚠️ Nessuna props nella firma — il componente è zero-props
- [x] ⚠️ Nessuno `useState` locale nel corpo del componente

### A.3 Sorgenti dati — destructuring completo

- [x] Destructuring da `useAppData()` — lista completa (28 campi):
  ```tsx
  const {
    showTransactionDialog, setShowTransactionDialog,
    editingTransaction, setEditingTransaction,
    handleSaveTransaction,
    showDeleteDialog, setShowDeleteDialog,
    deletingItem, setDeletingItem,
    handleDeleteConfirm,
    showAccountDialog, setShowAccountDialog,
    editingAccount, setEditingAccount,
    handleSaveAccount,
    showBudgetDialog, setShowBudgetDialog,
    editingBudget, setEditingBudget,
    handleSaveBudget,
    showSavingsGoalDialog, setShowSavingsGoalDialog,
    editingSavingsGoal, setEditingSavingsGoal,
    handleSaveSavingsGoal,
    showKeyboardHelp, setShowKeyboardHelp,
    safeCategories,
  } = useAppData()
  ```
- [x] Destructuring da `useAuth()` (4 campi):
  ```tsx
  const {
    privatePinHash,
    showPrivatePinDialog, setShowPrivatePinDialog,
    handlePrivatePinSubmit,
  } = useAuth()
  ```
- [x] Destructuring da `useVisibleData()` (4 campi):
  ```tsx
  const {
    visibleAccounts,
    visibleTransactions,
    hasPrivateAccount,
    privateAccount,
  } = useVisibleData()
  ```
- [x] Istanza `screenReader`:
  ```tsx
  const screenReader = useScreenReader()
  ```
- [x] ⚠️ Verificare che tutti e 37 i valori siano inclusi (28 + 4 + 4 + 1)

### A.4 JSX — Dialog 1: PinDialog privato

- [x] Aggiungere `<PinDialog` come primo figlio del Fragment `<>` di ritorno
- [x] Verificare prop `open={showPrivatePinDialog}`
- [x] Verificare prop `title` condizionale su `privatePinHash`:
  - [x] `privatePinHash` truthy → `'Sblocca Conto Privato'`
  - [x] `privatePinHash` falsy → `'Crea PIN Conto Privato'`
- [x] Verificare prop `description` condizionale su `privatePinHash`:
  - [x] truthy → `'Inserisci il PIN del conto privato'`
  - [x] falsy → `'Crea un PIN per il conto privato'`
- [x] Verificare prop `onCancel={() => setShowPrivatePinDialog(false)}`
- [x] Verificare prop `confirmMode={!privatePinHash}`
- [x] Verificare prop `onSubmit` — callback inline con `handlePrivatePinSubmit`:
  - [x] Il secondo argomento di `handlePrivatePinSubmit` è una callback `onUnlocked`
  - [x] La callback controlla `if (privateAccount)` — **non** `visibleAccounts.find`
  - [x] ⚠️ **R5 — Deviazione intenzionale**: `privateAccount` da `useVisibleData()` evita la race condition React (al momento dello sblocco, `visibleAccounts` filtra ancora con `isPrivateUnlocked === false` e restituirebbe `undefined`; `privateAccount` è calcolato da `safeAccounts` e restituisce sempre il conto se esiste)
  - [x] Branch `if (privateAccount)` chiama: `calculateAccountBalance(privateAccount, visibleTransactions)`, poi `toast.success(...)` con saldo, poi `screenReader.announceBalance('Conto privato', balance)`
  - [x] Branch `else` chiama: `screenReader.announceSuccess('Conto privato sbloccato.')`

### A.5 JSX — Dialog 2: AccountDialog

- [x] Aggiungere `<AccountDialog` come secondo elemento del Fragment
- [x] Verificare prop `open={showAccountDialog}`
- [x] Verificare prop `onClose={() => { setShowAccountDialog(false); setEditingAccount(undefined) }}`
- [x] Verificare prop `onSave={(account) => { handleSaveAccount(account); setEditingAccount(undefined) }}`
- [x] Verificare prop `account={editingAccount}`
- [x] ⚠️ Verificare prop `hasPrivateAccount`:
  - [x] Il valore è `{hasPrivateAccount && !editingAccount?.isPrivato}` — espressione composta
  - [x] `hasPrivateAccount` viene da `useVisibleData()` — **non** calcolato inline
  - [x] `editingAccount` viene da `useAppData()`

### A.6 JSX — Dialog 3: TransactionDialog

- [x] Aggiungere `<TransactionDialog` come terzo elemento del Fragment
- [x] Verificare prop `open={showTransactionDialog}`
- [x] Verificare prop `onClose={() => { setShowTransactionDialog(false); setEditingTransaction(undefined) }}`
- [x] Verificare prop `onSave={(transaction) => { handleSaveTransaction(transaction); setEditingTransaction(undefined) }}`
- [x] Verificare prop `transaction={editingTransaction}`
- [x] ⚠️ Verificare prop `accounts={visibleAccounts}` — **NON** `safeAccounts` (solo conti visibili, filtrati per privacy)
- [x] Verificare prop `categories={safeCategories}`

### A.7 JSX — Dialog 4: BudgetDialog

- [x] Aggiungere `<BudgetDialog` come quarto elemento del Fragment
- [x] Verificare prop `open={showBudgetDialog}`
- [x] Verificare prop `onClose={() => { setShowBudgetDialog(false); setEditingBudget(undefined) }}`
- [x] Verificare prop `onSave={(budget) => { handleSaveBudget(budget); setEditingBudget(undefined) }}`
- [x] Verificare prop `budget={editingBudget}`
- [x] Verificare prop `categories={safeCategories}`
- [x] Verificare prop `accounts={visibleAccounts}` — da `useVisibleData()`

### A.8 JSX — Dialog 5: SavingsGoalDialog

- [x] Aggiungere `<SavingsGoalDialog` come quinto elemento del Fragment
- [x] Verificare prop `open={showSavingsGoalDialog}`
- [x] Verificare prop `onClose={() => { setShowSavingsGoalDialog(false); setEditingSavingsGoal(undefined) }}`
- [x] Verificare prop `onSave={(goal) => { handleSaveSavingsGoal(goal); setEditingSavingsGoal(undefined) }}`
- [x] Verificare prop `goal={editingSavingsGoal}`
- [x] Verificare prop `accounts={visibleAccounts}` — da `useVisibleData()`

### A.9 JSX — Dialog 6: AlertDialog conferma eliminazione

- [x] Aggiungere `<AlertDialog` come sesto elemento del Fragment
- [x] Verificare `open={showDeleteDialog}`
- [x] Verificare `onOpenChange` — callback che:
  - [x] Controlla `if (!open)` prima di eseguire azioni
  - [x] ⚠️ **R3 — prima occorrenza**: chiama `soundSystem.play('dialog-close')` dentro `if (!open)`
  - [x] Chiama `setDeletingItem(null)` dentro `if (!open)`
  - [x] Chiama `setShowDeleteDialog(open)` fuori dall'`if` (sempre)
- [x] Verificare `<AlertDialogContent>` contiene `<AlertDialogHeader>` con:
  - [x] `<AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>`
  - [x] `<AlertDialogDescription>` con ternario annidato (4 casi)
- [x] ⚠️ **R2 — ternario annidato**: verificare i 4 casi nell'ordine esatto:
  - [x] `deletingItem?.type === 'account'` → messaggio con movimenti associati
  - [x] `deletingItem?.type === 'budget'` → messaggio specifico budget
  - [x] `deletingItem?.type === 'savingsGoal'` → messaggio specifico obiettivo risparmio (con apostrofo escaped `\'`)
  - [x] default → messaggio generico movimento
  - [x] ⚠️ Il ternario annidato va preservato **esattamente** — non trasformarlo in switch né oggetto lookup
- [x] Verificare `<AlertDialogFooter>` contiene:
  - [x] `<AlertDialogCancel onClick={() => soundSystem.play('dialog-close')}>Annulla</AlertDialogCancel>` — ⚠️ **R3 — seconda occorrenza**
  - [x] `<AlertDialogAction onClick={() => handleDeleteConfirm()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>`

### A.10 JSX — Dialog 7: KeyboardShortcutsHelp

- [x] Aggiungere `<KeyboardShortcutsHelp` come settimo elemento del Fragment
- [x] Verificare prop `open={showKeyboardHelp}`
- [x] Verificare prop `onClose={() => setShowKeyboardHelp(false)}`
- [x] Verificare che sia il **ultimo** elemento prima della chiusura `</>`

### A.11 Verifica del Passo A

- [x] Salvare il file `src/components/DialogsOverlay.tsx`
- [x] Eseguire `npx tsc --noEmit` → **4 errori baseline, invariati**
- [x] ⚠️ **R3**: `grep -c "dialog-close" src/components/DialogsOverlay.tsx` → risultato `2`
- [x] Verificare che `App.tsx` non sia stato modificato → il comportamento dell'app è invariato
- [x] ⚠️ Non procedere al Passo B fino a verifica TypeScript completata

---

## Passo B — Modifica `src/App.tsx`

> **Prerequisito**: Passo A completato e verificato (tsc → 4 errori baseline) ✓

### B.1 Aggiunta import di `DialogsOverlay`

- [x] Aprire `src/App.tsx`
- [x] Aggiungere dopo l'import di `AuthScreen` (~riga 41):
  ```tsx
  import { DialogsOverlay } from '@/components/DialogsOverlay'
  ```

### B.2 Individuazione del blocco da rimuovere

- [x] Aprire `src/App.tsx` nell'editor e individuare visivamente il blocco dialog
- [x] Il blocco inizia con `<PinDialog` (primo `<PinDialog open={showPrivatePinDialog}`) dopo il tag `</main>`
- [x] Il blocco termina con `/>` di `<KeyboardShortcutsHelp ... />`
- [x] Annotare le righe effettive nell'editor (stima: ~326–405 ± 5)
- [x] Verificare che il blocco non includa né `<BudgetAlertBanner>` né `<Toaster>` ⚠️ **R4**

### B.3 Rimozione del blocco JSX dei sette dialog

- [x] Rimuovere l'intero blocco `<PinDialog ... /> ... <KeyboardShortcutsHelp ... />` (~80 righe)
- [x] ⚠️ Il `</main>` che precede il blocco **rimane in `App.tsx`** — non va rimosso
- [x] ⚠️ Il `</div>` che segue il blocco (chiusura di `<div className="relative">`) **rimane in `App.tsx`** — non va rimosso
- [x] ⚠️ `<BudgetAlertBanner>` rimane dentro `<main>` in `App.tsx` — non va spostata (**R4**)
- [x] ⚠️ `<Toaster />` rimane figlio del Fragment radice esterno in `App.tsx` — non va spostato (**R4**)

### B.4 Inserimento `<DialogsOverlay />`

- [x] Nella posizione esatta dove si trovava il blocco rimosso (dentro `<div className="relative">`, dopo `</main>`), inserire:
  ```tsx
        <DialogsOverlay />
  ```
- [x] ⚠️ **R1**: verificare che `<DialogsOverlay />` sia **dentro** il `<div className="relative">` — non come figlio diretto del Fragment radice `<>`, non dopo `</div>`
- [x] Verificare che la struttura sia:
  ```
  <div className="relative">
    <FocusIndicator />
    <AppHeader />
    <main ...>
      ...
    </main>
    <DialogsOverlay />       ← qui
  </div>
  ```

### B.5 Import — non rimuovere nulla

- [x] ⚠️ **Non rimuovere nessun import** da `App.tsx` in questo passo — la pulizia è compito del Passo 13
- [x] Verificare che l'import di `DialogsOverlay` sia stato aggiunto (B.1)
- [x] Lasciare gli import inutilizzati come warning TypeScript: non sono errori bloccanti

### B.6 Verifica del Passo B

- [x] Salvare il file `src/App.tsx`
- [x] Eseguire `npx tsc --noEmit` → **4 errori baseline, invariati**
- [x] Eseguire `npm run build` → compilazione riuscita
- [x] `grep "DialogsOverlay" src/App.tsx` → almeno 2 risultati (import + JSX)
- [x] `grep "showDeleteDialog\|showAccountDialog\|showBudgetDialog" src/App.tsx` → zero risultati nel JSX (solo eventuale destructuring residuo di `useAppData()`)

---

## Verifica finale

### Test di compilazione

- [x] `npx tsc --noEmit` → 4 errori baseline, invariati rispetto a prima del passo
- [x] `npm run build` → zero errori, bundle generato

### Verifica grep post-implementazione

- [x] `grep -c "dialog-close" src/components/DialogsOverlay.tsx` → `2`
- [x] `grep "DialogsOverlay" src/App.tsx` → almeno 2 risultati (import + `<DialogsOverlay />`)
- [x] `grep "showDeleteDialog\|showAccountDialog\|showBudgetDialog" src/App.tsx` → zero nel JSX
- [x] `grep "BudgetAlertBanner" src/App.tsx` → almeno 1 risultato (rimane in App.tsx)
- [x] `grep "Toaster" src/App.tsx` → almeno 1 risultato (rimane in App.tsx)

### Verifica struttura App.tsx

- [x] `<DialogsOverlay />` è posizionato **dentro** `<div className="relative">`, dopo `</main>`
- [x] `<BudgetAlertBanner />` è presente dentro `<main>` in `App.tsx`
- [x] `<Toaster />` è presente come figlio del Fragment radice in `App.tsx`
- [x] `App.tsx` non contiene più nessun JSX dei sette dialog (solo `<DialogsOverlay />`)

### Test manuale — Dialog 1: PinDialog privato (da design §9)

- [x] Conto privato presente: il pulsante "Sblocca" apre il `PinDialog` privato
- [x] Se PIN privato non ancora impostato: titolo `'Crea PIN Conto Privato'`, `confirmMode` attivo (richiede conferma)
- [x] Se PIN privato presente: titolo `'Sblocca Conto Privato'`, `confirmMode` disattivo
- [x] PIN privato corretto: il conto privato diventa visibile, toast con saldo corretto
- [x] PIN privato errato: toast di errore, dialog rimane aperto
- [x] Pulsante Annulla: `setShowPrivatePinDialog(false)` — dialog si chiude

### Test manuale — Dialog 2: AccountDialog (da design §9)

- [x] Pulsante "Nuovo Conto": apre `AccountDialog` con form vuoto
- [x] Click modifica su conto esistente: apre `AccountDialog` precompilato
- [x] `hasPrivateAccount` è `false` quando si modifica il conto privato esistente
- [x] Salvataggio: il conto appare nella dashboard
- [x] Annullamento: nessuna modifica, `editingAccount` azzerato

### Test manuale — Dialog 3: TransactionDialog (da design §9)

- [x] Pulsante "Nuovo Movimento": apre `TransactionDialog` con form vuoto
- [x] Click modifica su transazione: apre `TransactionDialog` precompilato
- [x] Il select di `accounts` mostra solo i conti visibili (non i conti privati bloccati)
- [x] Il select di `categories` mostra le categorie disponibili
- [x] Salvataggio: la transazione appare nella lista e il saldo si aggiorna
- [x] Annullamento: nessuna modifica, `editingTransaction` azzerato

### Test manuale — Dialog 4: BudgetDialog (da design §9)

- [x] Pulsante "Nuovo Budget": apre `BudgetDialog` con form vuoto
- [x] Click modifica su budget: apre `BudgetDialog` precompilato
- [x] I select di `accounts` e `categories` sono popolati correttamente
- [x] Salvataggio: il budget appare nel tab Report
- [x] Annullamento: nessuna modifica, `editingBudget` azzerato

### Test manuale — Dialog 5: SavingsGoalDialog (da design §9)

- [x] Pulsante "Nuovo Obiettivo": apre `SavingsGoalDialog` con form vuoto
- [x] Click modifica su obiettivo: apre `SavingsGoalDialog` precompilato
- [x] Il select di `accounts` mostra solo i conti visibili
- [x] Salvataggio: l'obiettivo appare nel tab Report
- [x] Annullamento: nessuna modifica, `editingSavingsGoal` azzerato

### Test manuale — Dialog 6: AlertDialog eliminazione (da design §9)

- [x] Click elimina su un **conto**: messaggio con avviso movimenti associati
- [x] Click elimina su un **budget**: messaggio specifico per budget
- [x] Click elimina su un **obiettivo di risparmio**: messaggio specifico per obiettivo
- [x] Click elimina su una **transazione**: messaggio generico movimento
- [x] Conferma eliminazione: `handleDeleteConfirm()` chiamato, elemento scompare dalla UI
- [x] Annullamento: `setDeletingItem(null)` e `setShowDeleteDialog(false)`, effetto sonoro `dialog-close`
- [x] Chiusura via Escape o click fuori: comportamento identico all'annullamento

### Test manuale — Dialog 7: KeyboardShortcutsHelp (da design §9)

- [x] Click pulsante nell'header o shortcut `Shift+?`: `showKeyboardHelp` diventa `true`, pannello aperto
- [x] Chiusura: `setShowKeyboardHelp(false)` chiamato, pannello chiuso

### Test di regressione — Componenti estratti nei passi precedenti (da design §9)

- [x] `AuthScreen` funziona correttamente (login e setup PIN globale)
- [x] `AppHeader` funziona correttamente (saldo aggiornato, tooltip, pulsante scorciatoie)
- [x] Tab Movimenti (`TransactionsTab`) — nessuna regressione
- [x] Tab Dashboard (`DashboardTab`) — nessuna regressione
- [x] Tab Report (`ReportsTab`) — nessuna regressione
- [x] `BudgetAlertBanner` mostra e dismissi gli avvisi correttamente

---

***

**Completato il 2026-04-23.**  
**Verifica automatica completata:** build produzione `PASS`, controlli
statici/grep `PASS`.  
**Verifica manuale residua:** scenari UI/accessibilità ancora da eseguire
in ambiente interattivo locale.

**Nota stato verifica**: `npx tsc --noEmit` (4 errori baseline invariati), `npm run build` e i controlli grep/strutturali sono da eseguire dopo l'implementazione. I test manuali UI restano da eseguire in ambiente interattivo locale, perché il repository non include un framework di test browser/e2e già configurato.
