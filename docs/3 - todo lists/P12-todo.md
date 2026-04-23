# P12 — Todo List: Estrazione `DialogsOverlay`

> Checklist operativa sequenziale per il Pacchetto 12.  
> Coding Plan di riferimento: `docs/2 - coding plans/P12-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P12-DialogsOverlay-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [ ] Leggere `docs/2 - coding plans/P12-coding-plan.md` per intero
- [ ] ⚠️ **4 errori TypeScript baseline pre-esistenti** in `src/context/AuthContext.tsx`: `npx tsc --noEmit` non restituirà mai "zero errori". Il risultato atteso dopo ogni passo è **"4 errori, invariati rispetto a prima"** — non cercare di azzerarli
- [ ] Prendere nota dell'ambiguità **AI1** (righe effettive del blocco dialog in App.tsx post-P11: blocco stimato ~326–405; verificare nell'editor prima del Passo B)
- [ ] Prendere nota dell'ambiguità **AI2** (`useScreenReader` importato da `@/hooks/use-screen-reader` — file confermato presente)
- [ ] Prendere nota dell'ambiguità **AI3** (radice del `return` di `DialogsOverlay` è Fragment `<>...</>` — obbligatorio, non aggiungere wrapper `<div>`)
- [ ] Prendere nota dell'ambiguità **AI4** (`handlePrivatePinSubmit` accetta `onUnlocked` come secondo parametro opzionale — confermato su `AuthContext.tsx`)
- [ ] Prendere nota dell'ambiguità **AI5** (`privateAccount` esposto da `useVisibleData()` con questo nome esatto)
- [ ] Prendere nota di **R1** (`<DialogsOverlay />` deve stare **dentro** il `<div className="relative">` dopo `</main>` — non fuori)
- [ ] Prendere nota di **R2** (ternario annidato `AlertDialog` — 4 casi — non semplificare, non refactorizzare)
- [ ] Prendere nota di **R3** (`soundSystem.play('dialog-close')` deve comparire **due volte** nell'`AlertDialog` — in `onOpenChange` e in `<AlertDialogCancel>`)
- [ ] Prendere nota di **R4** (`BudgetAlertBanner` e `Toaster` rimangono in `App.tsx` — **non includere** in `DialogsOverlay`)
- [ ] Prendere nota di **R5** (deviazione intenzionale: usare `privateAccount` da `useVisibleData()` — **non** `visibleAccounts.find(a => a.isPrivato)` — per evitare la race condition React al momento dello sblocco)
- [ ] Verificare di essere sul branch `refactoring-architettura`
- [ ] Eseguire `npx tsc --noEmit` e confermare i 4 errori baseline **prima** di iniziare

---

## Passo A — Creazione `src/components/DialogsOverlay.tsx`

> **Prerequisito**: nessuno (P01–P11 già presenti nel branch).

### A.1 Creazione del file e import

- [ ] Creare il file `src/components/DialogsOverlay.tsx` vuoto
- [ ] Aggiungere import da `@/context/AppDataContext`: `useAppData`
- [ ] Aggiungere import da `@/context/AuthContext`: `useAuth`
- [ ] Aggiungere import da `@/hooks/use-visible-data`: `useVisibleData`
- [ ] Aggiungere import da `@/hooks/use-screen-reader`: `useScreenReader`
- [ ] Aggiungere import da `@/lib/helpers`: `calculateAccountBalance`, `formatCurrency`
- [ ] Aggiungere import da `@/lib/sound-system`: `soundSystem`
- [ ] Aggiungere import da `sonner`: `toast`
- [ ] Aggiungere import da `@/components/PinDialog`: `PinDialog`
- [ ] Aggiungere import da `@/components/AccountDialog`: `AccountDialog`
- [ ] Aggiungere import da `@/components/TransactionDialog`: `TransactionDialog`
- [ ] Aggiungere import da `@/components/BudgetDialog`: `BudgetDialog`
- [ ] Aggiungere import da `@/components/SavingsGoalDialog`: `SavingsGoalDialog`
- [ ] Aggiungere import da `@/components/KeyboardShortcutsHelp`: `KeyboardShortcutsHelp`
- [ ] Aggiungere import da `@/components/ui/alert-dialog`: `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`
- [ ] ⚠️ **Non importare** `useIsMobile`, `hapticSystem`, icone Phosphor, componenti UI diversi da `alert-dialog`
- [ ] ⚠️ **Non importare** `useState`, `useEffect` — zero state locale, zero effetti

### A.2 Firma del componente

- [ ] Aprire con:
  ```tsx
  export function DialogsOverlay() {
  ```
- [ ] ⚠️ Nessuna props nella firma — il componente è zero-props
- [ ] ⚠️ Nessuno `useState` locale nel corpo del componente

### A.3 Sorgenti dati — destructuring completo

- [ ] Destructuring da `useAppData()` — lista completa (28 campi):
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
- [ ] Destructuring da `useAuth()` (4 campi):
  ```tsx
  const {
    privatePinHash,
    showPrivatePinDialog, setShowPrivatePinDialog,
    handlePrivatePinSubmit,
  } = useAuth()
  ```
- [ ] Destructuring da `useVisibleData()` (4 campi):
  ```tsx
  const {
    visibleAccounts,
    visibleTransactions,
    hasPrivateAccount,
    privateAccount,
  } = useVisibleData()
  ```
- [ ] Istanza `screenReader`:
  ```tsx
  const screenReader = useScreenReader()
  ```
- [ ] ⚠️ Verificare che tutti e 37 i valori siano inclusi (28 + 4 + 4 + 1)

### A.4 JSX — Dialog 1: PinDialog privato

- [ ] Aggiungere `<PinDialog` come primo figlio del Fragment `<>` di ritorno
- [ ] Verificare prop `open={showPrivatePinDialog}`
- [ ] Verificare prop `title` condizionale su `privatePinHash`:
  - [ ] `privatePinHash` truthy → `'Sblocca Conto Privato'`
  - [ ] `privatePinHash` falsy → `'Crea PIN Conto Privato'`
- [ ] Verificare prop `description` condizionale su `privatePinHash`:
  - [ ] truthy → `'Inserisci il PIN del conto privato'`
  - [ ] falsy → `'Crea un PIN per il conto privato'`
- [ ] Verificare prop `onCancel={() => setShowPrivatePinDialog(false)}`
- [ ] Verificare prop `confirmMode={!privatePinHash}`
- [ ] Verificare prop `onSubmit` — callback inline con `handlePrivatePinSubmit`:
  - [ ] Il secondo argomento di `handlePrivatePinSubmit` è una callback `onUnlocked`
  - [ ] La callback controlla `if (privateAccount)` — **non** `visibleAccounts.find`
  - [ ] ⚠️ **R5 — Deviazione intenzionale**: `privateAccount` da `useVisibleData()` evita la race condition React (al momento dello sblocco, `visibleAccounts` filtra ancora con `isPrivateUnlocked === false` e restituirebbe `undefined`; `privateAccount` è calcolato da `safeAccounts` e restituisce sempre il conto se esiste)
  - [ ] Branch `if (privateAccount)` chiama: `calculateAccountBalance(privateAccount, visibleTransactions)`, poi `toast.success(...)` con saldo, poi `screenReader.announceBalance('Conto privato', balance)`
  - [ ] Branch `else` chiama: `screenReader.announceSuccess('Conto privato sbloccato.')`

### A.5 JSX — Dialog 2: AccountDialog

- [ ] Aggiungere `<AccountDialog` come secondo elemento del Fragment
- [ ] Verificare prop `open={showAccountDialog}`
- [ ] Verificare prop `onClose={() => { setShowAccountDialog(false); setEditingAccount(undefined) }}`
- [ ] Verificare prop `onSave={(account) => { handleSaveAccount(account); setEditingAccount(undefined) }}`
- [ ] Verificare prop `account={editingAccount}`
- [ ] ⚠️ Verificare prop `hasPrivateAccount`:
  - [ ] Il valore è `{hasPrivateAccount && !editingAccount?.isPrivato}` — espressione composta
  - [ ] `hasPrivateAccount` viene da `useVisibleData()` — **non** calcolato inline
  - [ ] `editingAccount` viene da `useAppData()`

### A.6 JSX — Dialog 3: TransactionDialog

- [ ] Aggiungere `<TransactionDialog` come terzo elemento del Fragment
- [ ] Verificare prop `open={showTransactionDialog}`
- [ ] Verificare prop `onClose={() => { setShowTransactionDialog(false); setEditingTransaction(undefined) }}`
- [ ] Verificare prop `onSave={(transaction) => { handleSaveTransaction(transaction); setEditingTransaction(undefined) }}`
- [ ] Verificare prop `transaction={editingTransaction}`
- [ ] ⚠️ Verificare prop `accounts={visibleAccounts}` — **NON** `safeAccounts` (solo conti visibili, filtrati per privacy)
- [ ] Verificare prop `categories={safeCategories}`

### A.7 JSX — Dialog 4: BudgetDialog

- [ ] Aggiungere `<BudgetDialog` come quarto elemento del Fragment
- [ ] Verificare prop `open={showBudgetDialog}`
- [ ] Verificare prop `onClose={() => { setShowBudgetDialog(false); setEditingBudget(undefined) }}`
- [ ] Verificare prop `onSave={(budget) => { handleSaveBudget(budget); setEditingBudget(undefined) }}`
- [ ] Verificare prop `budget={editingBudget}`
- [ ] Verificare prop `categories={safeCategories}`
- [ ] Verificare prop `accounts={visibleAccounts}` — da `useVisibleData()`

### A.8 JSX — Dialog 5: SavingsGoalDialog

- [ ] Aggiungere `<SavingsGoalDialog` come quinto elemento del Fragment
- [ ] Verificare prop `open={showSavingsGoalDialog}`
- [ ] Verificare prop `onClose={() => { setShowSavingsGoalDialog(false); setEditingSavingsGoal(undefined) }}`
- [ ] Verificare prop `onSave={(goal) => { handleSaveSavingsGoal(goal); setEditingSavingsGoal(undefined) }}`
- [ ] Verificare prop `goal={editingSavingsGoal}`
- [ ] Verificare prop `accounts={visibleAccounts}` — da `useVisibleData()`

### A.9 JSX — Dialog 6: AlertDialog conferma eliminazione

- [ ] Aggiungere `<AlertDialog` come sesto elemento del Fragment
- [ ] Verificare `open={showDeleteDialog}`
- [ ] Verificare `onOpenChange` — callback che:
  - [ ] Controlla `if (!open)` prima di eseguire azioni
  - [ ] ⚠️ **R3 — prima occorrenza**: chiama `soundSystem.play('dialog-close')` dentro `if (!open)`
  - [ ] Chiama `setDeletingItem(null)` dentro `if (!open)`
  - [ ] Chiama `setShowDeleteDialog(open)` fuori dall'`if` (sempre)
- [ ] Verificare `<AlertDialogContent>` contiene `<AlertDialogHeader>` con:
  - [ ] `<AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>`
  - [ ] `<AlertDialogDescription>` con ternario annidato (4 casi)
- [ ] ⚠️ **R2 — ternario annidato**: verificare i 4 casi nell'ordine esatto:
  - [ ] `deletingItem?.type === 'account'` → messaggio con movimenti associati
  - [ ] `deletingItem?.type === 'budget'` → messaggio specifico budget
  - [ ] `deletingItem?.type === 'savingsGoal'` → messaggio specifico obiettivo risparmio (con apostrofo escaped `\'`)
  - [ ] default → messaggio generico movimento
  - [ ] ⚠️ Il ternario annidato va preservato **esattamente** — non trasformarlo in switch né oggetto lookup
- [ ] Verificare `<AlertDialogFooter>` contiene:
  - [ ] `<AlertDialogCancel onClick={() => soundSystem.play('dialog-close')}>Annulla</AlertDialogCancel>` — ⚠️ **R3 — seconda occorrenza**
  - [ ] `<AlertDialogAction onClick={() => handleDeleteConfirm()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>`

### A.10 JSX — Dialog 7: KeyboardShortcutsHelp

- [ ] Aggiungere `<KeyboardShortcutsHelp` come settimo elemento del Fragment
- [ ] Verificare prop `open={showKeyboardHelp}`
- [ ] Verificare prop `onClose={() => setShowKeyboardHelp(false)}`
- [ ] Verificare che sia il **ultimo** elemento prima della chiusura `</>`

### A.11 Verifica del Passo A

- [ ] Salvare il file `src/components/DialogsOverlay.tsx`
- [ ] Eseguire `npx tsc --noEmit` → **4 errori baseline, invariati**
- [ ] ⚠️ **R3**: `grep -c "dialog-close" src/components/DialogsOverlay.tsx` → risultato `2`
- [ ] Verificare che `App.tsx` non sia stato modificato → il comportamento dell'app è invariato
- [ ] ⚠️ Non procedere al Passo B fino a verifica TypeScript completata

---

## Passo B — Modifica `src/App.tsx`

> **Prerequisito**: Passo A completato e verificato (tsc → 4 errori baseline) ✓

### B.1 Aggiunta import di `DialogsOverlay`

- [ ] Aprire `src/App.tsx`
- [ ] Aggiungere dopo l'import di `AuthScreen` (~riga 41):
  ```tsx
  import { DialogsOverlay } from '@/components/DialogsOverlay'
  ```

### B.2 Individuazione del blocco da rimuovere

- [ ] Aprire `src/App.tsx` nell'editor e individuare visivamente il blocco dialog
- [ ] Il blocco inizia con `<PinDialog` (primo `<PinDialog open={showPrivatePinDialog}`) dopo il tag `</main>`
- [ ] Il blocco termina con `/>` di `<KeyboardShortcutsHelp ... />`
- [ ] Annotare le righe effettive nell'editor (stima: ~326–405 ± 5)
- [ ] Verificare che il blocco non includa né `<BudgetAlertBanner>` né `<Toaster>` ⚠️ **R4**

### B.3 Rimozione del blocco JSX dei sette dialog

- [ ] Rimuovere l'intero blocco `<PinDialog ... /> ... <KeyboardShortcutsHelp ... />` (~80 righe)
- [ ] ⚠️ Il `</main>` che precede il blocco **rimane in `App.tsx`** — non va rimosso
- [ ] ⚠️ Il `</div>` che segue il blocco (chiusura di `<div className="relative">`) **rimane in `App.tsx`** — non va rimosso
- [ ] ⚠️ `<BudgetAlertBanner>` rimane dentro `<main>` in `App.tsx` — non va spostata (**R4**)
- [ ] ⚠️ `<Toaster />` rimane figlio del Fragment radice esterno in `App.tsx` — non va spostato (**R4**)

### B.4 Inserimento `<DialogsOverlay />`

- [ ] Nella posizione esatta dove si trovava il blocco rimosso (dentro `<div className="relative">`, dopo `</main>`), inserire:
  ```tsx
        <DialogsOverlay />
  ```
- [ ] ⚠️ **R1**: verificare che `<DialogsOverlay />` sia **dentro** il `<div className="relative">` — non come figlio diretto del Fragment radice `<>`, non dopo `</div>`
- [ ] Verificare che la struttura sia:
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

- [ ] ⚠️ **Non rimuovere nessun import** da `App.tsx` in questo passo — la pulizia è compito del Passo 13
- [ ] Verificare che l'import di `DialogsOverlay` sia stato aggiunto (B.1)
- [ ] Lasciare gli import inutilizzati come warning TypeScript: non sono errori bloccanti

### B.6 Verifica del Passo B

- [ ] Salvare il file `src/App.tsx`
- [ ] Eseguire `npx tsc --noEmit` → **4 errori baseline, invariati**
- [ ] Eseguire `npm run build` → compilazione riuscita
- [ ] `grep "DialogsOverlay" src/App.tsx` → almeno 2 risultati (import + JSX)
- [ ] `grep "showDeleteDialog\|showAccountDialog\|showBudgetDialog" src/App.tsx` → zero risultati nel JSX (solo eventuale destructuring residuo di `useAppData()`)

---

## Verifica finale

### Test di compilazione

- [ ] `npx tsc --noEmit` → 4 errori baseline, invariati rispetto a prima del passo
- [ ] `npm run build` → zero errori, bundle generato

### Verifica grep post-implementazione

- [ ] `grep -c "dialog-close" src/components/DialogsOverlay.tsx` → `2`
- [ ] `grep "DialogsOverlay" src/App.tsx` → almeno 2 risultati (import + `<DialogsOverlay />`)
- [ ] `grep "showDeleteDialog\|showAccountDialog\|showBudgetDialog" src/App.tsx` → zero nel JSX
- [ ] `grep "BudgetAlertBanner" src/App.tsx` → almeno 1 risultato (rimane in App.tsx)
- [ ] `grep "Toaster" src/App.tsx` → almeno 1 risultato (rimane in App.tsx)

### Verifica struttura App.tsx

- [ ] `<DialogsOverlay />` è posizionato **dentro** `<div className="relative">`, dopo `</main>`
- [ ] `<BudgetAlertBanner />` è presente dentro `<main>` in `App.tsx`
- [ ] `<Toaster />` è presente come figlio del Fragment radice in `App.tsx`
- [ ] `App.tsx` non contiene più nessun JSX dei sette dialog (solo `<DialogsOverlay />`)

### Test manuale — Dialog 1: PinDialog privato (da design §9)

- [ ] Conto privato presente: il pulsante "Sblocca" apre il `PinDialog` privato
- [ ] Se PIN privato non ancora impostato: titolo `'Crea PIN Conto Privato'`, `confirmMode` attivo (richiede conferma)
- [ ] Se PIN privato presente: titolo `'Sblocca Conto Privato'`, `confirmMode` disattivo
- [ ] PIN privato corretto: il conto privato diventa visibile, toast con saldo corretto
- [ ] PIN privato errato: toast di errore, dialog rimane aperto
- [ ] Pulsante Annulla: `setShowPrivatePinDialog(false)` — dialog si chiude

### Test manuale — Dialog 2: AccountDialog (da design §9)

- [ ] Pulsante "Nuovo Conto": apre `AccountDialog` con form vuoto
- [ ] Click modifica su conto esistente: apre `AccountDialog` precompilato
- [ ] `hasPrivateAccount` è `false` quando si modifica il conto privato esistente
- [ ] Salvataggio: il conto appare nella dashboard
- [ ] Annullamento: nessuna modifica, `editingAccount` azzerato

### Test manuale — Dialog 3: TransactionDialog (da design §9)

- [ ] Pulsante "Nuovo Movimento": apre `TransactionDialog` con form vuoto
- [ ] Click modifica su transazione: apre `TransactionDialog` precompilato
- [ ] Il select di `accounts` mostra solo i conti visibili (non i conti privati bloccati)
- [ ] Il select di `categories` mostra le categorie disponibili
- [ ] Salvataggio: la transazione appare nella lista e il saldo si aggiorna
- [ ] Annullamento: nessuna modifica, `editingTransaction` azzerato

### Test manuale — Dialog 4: BudgetDialog (da design §9)

- [ ] Pulsante "Nuovo Budget": apre `BudgetDialog` con form vuoto
- [ ] Click modifica su budget: apre `BudgetDialog` precompilato
- [ ] I select di `accounts` e `categories` sono popolati correttamente
- [ ] Salvataggio: il budget appare nel tab Report
- [ ] Annullamento: nessuna modifica, `editingBudget` azzerato

### Test manuale — Dialog 5: SavingsGoalDialog (da design §9)

- [ ] Pulsante "Nuovo Obiettivo": apre `SavingsGoalDialog` con form vuoto
- [ ] Click modifica su obiettivo: apre `SavingsGoalDialog` precompilato
- [ ] Il select di `accounts` mostra solo i conti visibili
- [ ] Salvataggio: l'obiettivo appare nel tab Report
- [ ] Annullamento: nessuna modifica, `editingSavingsGoal` azzerato

### Test manuale — Dialog 6: AlertDialog eliminazione (da design §9)

- [ ] Click elimina su un **conto**: messaggio con avviso movimenti associati
- [ ] Click elimina su un **budget**: messaggio specifico per budget
- [ ] Click elimina su un **obiettivo di risparmio**: messaggio specifico per obiettivo
- [ ] Click elimina su una **transazione**: messaggio generico movimento
- [ ] Conferma eliminazione: `handleDeleteConfirm()` chiamato, elemento scompare dalla UI
- [ ] Annullamento: `setDeletingItem(null)` e `setShowDeleteDialog(false)`, effetto sonoro `dialog-close`
- [ ] Chiusura via Escape o click fuori: comportamento identico all'annullamento

### Test manuale — Dialog 7: KeyboardShortcutsHelp (da design §9)

- [ ] Click pulsante nell'header o shortcut `Shift+?`: `showKeyboardHelp` diventa `true`, pannello aperto
- [ ] Chiusura: `setShowKeyboardHelp(false)` chiamato, pannello chiuso

### Test di regressione — Componenti estratti nei passi precedenti (da design §9)

- [ ] `AuthScreen` funziona correttamente (login e setup PIN globale)
- [ ] `AppHeader` funziona correttamente (saldo aggiornato, tooltip, pulsante scorciatoie)
- [ ] Tab Movimenti (`TransactionsTab`) — nessuna regressione
- [ ] Tab Dashboard (`DashboardTab`) — nessuna regressione
- [ ] Tab Report (`ReportsTab`) — nessuna regressione
- [ ] `BudgetAlertBanner` mostra e dismissi gli avvisi correttamente

---

**Nota stato verifica**: `npx tsc --noEmit` (4 errori baseline invariati), `npm run build` e i controlli grep/strutturali sono da eseguire dopo l'implementazione. I test manuali UI restano da eseguire in ambiente interattivo locale, perché il repository non include un framework di test browser/e2e già configurato.
