# P12 — Estrazione `DialogsOverlay` come componente autonomo

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 12 (corrispondente al Passo 12 del piano di refactoring)  
> Data: 23 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Al termine del Passo 11, `App.tsx` conta **~422 righe** e contiene ancora il blocco dei dialog modali — sette componenti distinti attualmente posizionati dopo il tag `</main>` e prima della chiusura del `<div className="relative">` che avvolge la struttura principale.

Il Passo 12 raccoglie tutti e sette i dialog in un componente dedicato: `src/components/DialogsOverlay.tsx`.

**Perché questo è l'ultimo passo di estrazione**: dopo `DialogsOverlay`, `App.tsx` conterrà esclusivamente la struttura di composizione — provider, guard di autenticazione, layout radice (background, `FocusIndicator`, `AppHeader`, `BudgetAlertBanner`), navigazione tab (`DashboardTab`, `TransactionsTab`, `ReportsTab`), il nuovo `<DialogsOverlay />` e `<Toaster />`. Il Passo 13 si limiterà a rimuovere il codice residuo (import inutilizzati, dichiarazioni di stato non più necessarie in `AppContent`, variabili locali duplicate) e ridurre il file alle **~70 righe** obiettivo.

**Perché questo passo è classificato come rischio medio**: non per difficoltà tecnica intrinseca, ma perché richiede che tutti gli stati dialog siano già esposti dai context prima di poter scrivere il componente. La verifica di questa precondizione — svolta prima di codificare — è essa stessa parte del passo. Il rischio è gestito: la lettura di `AppDataContext.tsx` e `AuthContext.tsx` conferma che tutti gli stati necessari sono già esposti (vedi Sezione 4).

**Differenza strutturale rispetto ai passi precedenti**: a differenza di `TransactionsTab`, `DashboardTab`, `ReportsTab`, `AppHeader` e `AuthScreen` — che estraggono blocchi JSX contigui e visivamente delimitati — `DialogsOverlay` raggruppa sette elementi distinti che non hanno tra loro alcuna relazione di layout. Sono accomunati solo dal fatto di essere dialog modali sovrapposti alla UI principale.

**Cosa cambia dopo questo passo**: `App.tsx` perde circa **86 righe nette** di JSX e scende da ~422 a circa **338 righe**. Il tag `<DialogsOverlay />` sostituisce l'intero blocco.

**Cosa NON cambia**: il comportamento visibile dell'app è identico a prima. Nessun handler di business logic viene modificato.

---

## 2. Perimetro della modifica

### File creati

| Percorso | Scopo |
|---|---|
| `src/components/DialogsOverlay.tsx` | Componente che raggruppa i sette dialog modali estratti da `App.tsx` |

### File modificati

| Percorso | Modifica |
|---|---|
| `src/App.tsx` | Rimozione del blocco JSX dei sette dialog (righe ~335–413); sostituzione con `<DialogsOverlay />`; aggiunta dell'import del componente |

### File non toccati

| Percorso | Motivo |
|---|---|
| `src/context/AppDataContext.tsx` | Già espone tutti gli stati dialog necessari; nessuna modifica richiesta |
| `src/context/AuthContext.tsx` | Già espone tutti gli stati PIN privato necessari; nessuna modifica richiesta |
| `src/hooks/use-visible-data.ts` | Già espone `visibleAccounts`, `visibleTransactions`, `hasPrivateAccount`, `privateAccount` — usato da `DialogsOverlay` in sola lettura |
| `src/components/PinDialog.tsx` | Importato da `DialogsOverlay`; invariato |
| `src/components/AccountDialog.tsx` | Importato da `DialogsOverlay`; invariato |
| `src/components/TransactionDialog.tsx` | Importato da `DialogsOverlay`; invariato |
| `src/components/BudgetDialog.tsx` | Importato da `DialogsOverlay`; invariato |
| `src/components/SavingsGoalDialog.tsx` | Importato da `DialogsOverlay`; invariato |
| `src/components/KeyboardShortcutsHelp.tsx` | Importato da `DialogsOverlay`; invariato |
| `src/components/AppHeader.tsx` | Già estratto nel Passo 10; invariato |
| `src/components/TransactionsTab.tsx` | Già estratto nel Passo 7; invariato |
| `src/components/DashboardTab.tsx` | Già estratto nel Passo 8; invariato |
| `src/components/ReportsTab.tsx` | Già estratto nel Passo 9; invariato |
| `src/components/AuthScreen.tsx` | Già estratto nel Passo 11; invariato |
| `docs/`, `.github/` | Invariati |

---

## 3. I sette dialog — mappatura completa

Il blocco dialog si trova in `App.tsx` nell'intervallo di righe **~335–413**, dopo il tag `</main>` e prima della chiusura del `<div className="relative">`. Tutti e sette i dialog sono figli dello stesso `<div className="relative">` che contiene anche `FocusIndicator`, `AppHeader` e il main layout.

**Nota di struttura**: `DialogsOverlay` viene posizionato in `App.tsx` esattamente dove si trovava il blocco rimosso, all'interno del `<div className="relative">` e dopo `</main>`. Non va spostato fuori da questo wrapper.

### 3.1 Dialog 1 — PinDialog privato (righe ~335–352)

| Prop | Valore in `App.tsx` | Provenienza in `DialogsOverlay` |
|---|---|---|
| `open` | `{showPrivatePinDialog}` | `useAuth()` |
| `title` | `{privatePinHash ? 'Sblocca Conto Privato' : 'Crea PIN Conto Privato'}` | `useAuth()` — condizionale su `privatePinHash` |
| `description` | `{privatePinHash ? 'Inserisci il PIN del conto privato' : 'Crea un PIN per il conto privato'}` | `useAuth()` — condizionale su `privatePinHash` |
| `onSubmit` | callback che chiama `handlePrivatePinSubmit(pin, onUnlocked)` | `useAuth()` + `useVisibleData()` + `useScreenReader()` + helpers |
| `onCancel` | `() => setShowPrivatePinDialog(false)` | `useAuth()` |
| `confirmMode` | `{!privatePinHash}` | `useAuth()` — `true` se il PIN privato non è ancora impostato |

**Callback `onUnlocked` passata come secondo argomento a `handlePrivatePinSubmit`:**

```typescript
() => {
  if (privateAccount) {
    const balance = calculateAccountBalance(privateAccount, visibleTransactions)
    toast.success(`Conto privato sbloccato. Saldo: ${formatCurrency(balance)}`)
    screenReader.announceBalance('Conto privato', balance)
  } else {
    screenReader.announceSuccess('Conto privato sbloccato.')
  }
}
```

| Simbolo usato nella callback | Provenienza in `DialogsOverlay` |
|---|---|
| `privateAccount` | `useVisibleData()` — calcolato da `safeAccounts.find(a => a.isPrivato)`, sempre disponibile indipendentemente da `isPrivateUnlocked` |
| `visibleTransactions` | `useVisibleData()` |
| `calculateAccountBalance` | `import { calculateAccountBalance } from '@/lib/helpers'` |
| `formatCurrency` | `import { formatCurrency } from '@/lib/helpers'` |
| `screenReader` | `useScreenReader()` — istanziato direttamente in `DialogsOverlay` |
| `toast` | `import { toast } from 'sonner'` |

⚠️ **Nota di implementazione**: il codice originale in `App.tsx` usa `visibleAccounts.find(a => a.isPrivato)` nella callback. Questo può restituire `undefined` al momento dello sblocco, poiché `visibleAccounts` è ancora filtrato con `isPrivateUnlocked === false` (il re-render React non è ancora avvenuto). `DialogsOverlay` usa `useVisibleData().privateAccount` (calcolato da `safeAccounts`, non filtrato per privacy) — questo garantisce che il toast mostri sempre il saldo al momento dello sblocco. La deviazione è intenzionale e migliora il comportamento osservabile.

### 3.2 Dialog 2 — AccountDialog (righe ~354–360)

| Prop | Valore in `App.tsx` | Provenienza in `DialogsOverlay` |
|---|---|---|
| `open` | `{showAccountDialog}` | `useAppData()` |
| `onClose` | `() => { setShowAccountDialog(false); setEditingAccount(undefined) }` | `useAppData()` |
| `onSave` | `(account) => { handleSaveAccount(account); setEditingAccount(undefined) }` | `useAppData()` |
| `account` | `{editingAccount}` | `useAppData()` |
| `hasPrivateAccount` | `{hasPrivateAccount && !editingAccount?.isPrivato}` | `useVisibleData()` per `hasPrivateAccount` + `useAppData()` per `editingAccount` |

### 3.3 Dialog 3 — TransactionDialog (righe ~362–370)

| Prop | Valore in `App.tsx` | Provenienza in `DialogsOverlay` |
|---|---|---|
| `open` | `{showTransactionDialog}` | `useAppData()` |
| `onClose` | `() => { setShowTransactionDialog(false); setEditingTransaction(undefined) }` | `useAppData()` |
| `onSave` | `(transaction) => { handleSaveTransaction(transaction); setEditingTransaction(undefined) }` | `useAppData()` |
| `transaction` | `{editingTransaction}` | `useAppData()` |
| `accounts` | `{visibleAccounts}` | `useVisibleData()` — solo i conti visibili (filtrati per privacy) |
| `categories` | `{safeCategories}` | `useAppData()` |

### 3.4 Dialog 4 — BudgetDialog (righe ~372–380)

| Prop | Valore in `App.tsx` | Provenienza in `DialogsOverlay` |
|---|---|---|
| `open` | `{showBudgetDialog}` | `useAppData()` |
| `onClose` | `() => { setShowBudgetDialog(false); setEditingBudget(undefined) }` | `useAppData()` |
| `onSave` | `(budget) => { handleSaveBudget(budget); setEditingBudget(undefined) }` | `useAppData()` |
| `budget` | `{editingBudget}` | `useAppData()` |
| `categories` | `{safeCategories}` | `useAppData()` |
| `accounts` | `{visibleAccounts}` | `useVisibleData()` |

### 3.5 Dialog 5 — SavingsGoalDialog (righe ~382–388)

| Prop | Valore in `App.tsx` | Provenienza in `DialogsOverlay` |
|---|---|---|
| `open` | `{showSavingsGoalDialog}` | `useAppData()` |
| `onClose` | `() => { setShowSavingsGoalDialog(false); setEditingSavingsGoal(undefined) }` | `useAppData()` |
| `onSave` | `(goal) => { handleSaveSavingsGoal(goal); setEditingSavingsGoal(undefined) }` | `useAppData()` |
| `goal` | `{editingSavingsGoal}` | `useAppData()` |
| `accounts` | `{visibleAccounts}` | `useVisibleData()` |

### 3.6 Dialog 6 — AlertDialog conferma eliminazione (righe ~390–413)

`AlertDialog` non è un componente importato da `@/components/` ma un componente UI da `@/components/ui/alert-dialog`. Il suo stato di apertura è gestito tramite `onOpenChange` invece di una prop `onClose` separata.

| Elemento | Valore in `App.tsx` | Provenienza in `DialogsOverlay` |
|---|---|---|
| `open` | `{showDeleteDialog}` | `useAppData()` |
| `onOpenChange` | chiude il dialog, suona `dialog-close`, azzera `deletingItem` | `useAppData()` — `setDeletingItem`, `setShowDeleteDialog` |
| Effetto sonoro | `soundSystem.play('dialog-close')` | `import { soundSystem } from '@/lib/sound-system'` |
| Messaggio di conferma | condizionale su `deletingItem?.type` (4 casi) | `useAppData()` — `deletingItem` |
| Pulsante Annulla | `onClick={() => soundSystem.play('dialog-close')}` | `soundSystem` importato |
| Pulsante Elimina | `onClick={() => handleDeleteConfirm()}` | `useAppData()` — `handleDeleteConfirm` |

**I quattro messaggi di conferma** (ternario annidato su `deletingItem?.type`):

| `type` | Messaggio |
|---|---|
| `'account'` | `'Eliminando questo conto verranno rimossi anche tutti i movimenti associati. Questa azione non può essere annullata.'` |
| `'budget'` | `'Questa azione eliminerà definitivamente il budget. Non può essere annullata.'` |
| `'savingsGoal'` | `'Questa azione eliminerà definitivamente l\'obiettivo di risparmio. Non può essere annullata.'` |
| default (transazione) | `'Questa azione eliminerà definitivamente il movimento. Non può essere annullata.'` |

⚠️ Il ternario annidato va preservato esattamente — non trasformarlo in uno switch o in un oggetto di lookup durante l'estrazione.

⚠️ `soundSystem.play('dialog-close')` viene chiamato **due volte** nel dialog originale: una in `onOpenChange` (quando il dialog si chiude) e una nel `<AlertDialogCancel>`. Entrambe le chiamate devono essere presenti.

### 3.7 Dialog 7 — KeyboardShortcutsHelp (righe ~415–418)

| Prop | Valore in `App.tsx` | Provenienza in `DialogsOverlay` |
|---|---|---|
| `open` | `{showKeyboardHelp}` | `useAppData()` |
| `onClose` | `() => setShowKeyboardHelp(false)` | `useAppData()` |

---

## 4. Verifica degli stati nei context

### 4.1 Stati già esposti da `AppDataContext.tsx`

Tutti gli stati e gli handler dialog sono già dichiarati nel tipo `AppDataContextValue` e forniti dal provider. Nessuna modifica è necessaria.

| Campo | Tipo | Esposto | Aggiunto nel passo |
|---|---|---|---|
| `showTransactionDialog` | `boolean` | ✔ | Passo 7 |
| `setShowTransactionDialog` | `(v: boolean) => void` | ✔ | Passo 7 |
| `editingTransaction` | `Transaction \| undefined` | ✔ | Passo 7 |
| `setEditingTransaction` | `(t: Transaction \| undefined) => void` | ✔ | Passo 7 |
| `showDeleteDialog` | `boolean` | ✔ | Passo 7 |
| `setShowDeleteDialog` | `(v: boolean) => void` | ✔ | Passo 7 |
| `deletingItem` | `{ type: 'account' \| 'transaction' \| 'budget' \| 'savingsGoal'; id: string } \| null` | ✔ | Passo 7 |
| `setDeletingItem` | `(item: { type: ...; id: string } \| null) => void` | ✔ | Passo 7 |
| `showAccountDialog` | `boolean` | ✔ | Passo 8 |
| `setShowAccountDialog` | `(v: boolean) => void` | ✔ | Passo 8 |
| `editingAccount` | `Account \| undefined` | ✔ | Passo 8 |
| `setEditingAccount` | `(a: Account \| undefined) => void` | ✔ | Passo 8 |
| `showBudgetDialog` | `boolean` | ✔ | Passo 9 |
| `setShowBudgetDialog` | `(v: boolean) => void` | ✔ | Passo 9 |
| `editingBudget` | `Budget \| undefined` | ✔ | Passo 9 |
| `setEditingBudget` | `(b: Budget \| undefined) => void` | ✔ | Passo 9 |
| `showSavingsGoalDialog` | `boolean` | ✔ | Passo 9 |
| `setShowSavingsGoalDialog` | `(v: boolean) => void` | ✔ | Passo 9 |
| `editingSavingsGoal` | `SavingsGoal \| undefined` | ✔ | Passo 9 |
| `setEditingSavingsGoal` | `(g: SavingsGoal \| undefined) => void` | ✔ | Passo 9 |
| `showKeyboardHelp` | `boolean` | ✔ | Passo 10 |
| `setShowKeyboardHelp` | `(v: boolean) => void` | ✔ | Passo 10 |
| `handleSaveAccount` | `(account: Account) => void` | ✔ | Passo 3 |
| `handleSaveTransaction` | `(transaction: Transaction) => void` | ✔ | Passo 3 |
| `handleSaveBudget` | `(budget: Budget) => void` | ✔ | Passo 3 |
| `handleSaveSavingsGoal` | `(goal: SavingsGoal) => void` | ✔ | Passo 3 |
| `handleDeleteConfirm` | `() => void` | ✔ | Passo 3 |
| `safeCategories` | `Category[]` | ✔ | Passo 1 |

**Risultato**: nessuna modifica ad `AppDataContext.tsx` è necessaria.

### 4.2 Stati già esposti da `AuthContext.tsx`

| Campo | Tipo | Esposto |
|---|---|---|
| `privatePinHash` | `string \| null` | ✔ |
| `showPrivatePinDialog` | `boolean` | ✔ |
| `setShowPrivatePinDialog` | `(v: boolean) => void` | ✔ |
| `handlePrivatePinSubmit` | `(pin: string, onUnlocked?: () => void) => Promise<void>` | ✔ |

**Risultato**: nessuna modifica ad `AuthContext.tsx` è necessaria.

### 4.3 Dati da `useVisibleData()`

`DialogsOverlay` usa `useVisibleData()` per i dati derivati dalla visibilità della privacy. Tutti i campi necessari sono già esposti dall'hook.

| Campo | Tipo | Uso in `DialogsOverlay` |
|---|---|---|
| `visibleAccounts` | `Account[]` | Prop `accounts` di `TransactionDialog`, `BudgetDialog`, `SavingsGoalDialog` |
| `visibleTransactions` | `Transaction[]` | Callback `onUnlocked` del `PinDialog` privato |
| `hasPrivateAccount` | `boolean` | Componente della prop `hasPrivateAccount` di `AccountDialog` |
| `privateAccount` | `Account \| undefined` | Callback `onUnlocked` del `PinDialog` privato |

**Risultato**: nessuna modifica a `use-visible-data.ts` è necessaria.

---

## 5. Dipendenze complete del componente

```
DialogsOverlay
├── useAppData()
│   ├── showTransactionDialog, setShowTransactionDialog
│   ├── editingTransaction, setEditingTransaction
│   ├── handleSaveTransaction
│   ├── showDeleteDialog, setShowDeleteDialog
│   ├── deletingItem, setDeletingItem
│   ├── handleDeleteConfirm
│   ├── showAccountDialog, setShowAccountDialog
│   ├── editingAccount, setEditingAccount
│   ├── handleSaveAccount
│   ├── showBudgetDialog, setShowBudgetDialog
│   ├── editingBudget, setEditingBudget
│   ├── handleSaveBudget
│   ├── showSavingsGoalDialog, setShowSavingsGoalDialog
│   ├── editingSavingsGoal, setEditingSavingsGoal
│   ├── handleSaveSavingsGoal
│   ├── showKeyboardHelp, setShowKeyboardHelp
│   └── safeCategories
├── useAuth()
│   ├── privatePinHash
│   ├── showPrivatePinDialog, setShowPrivatePinDialog
│   └── handlePrivatePinSubmit
├── useVisibleData()
│   ├── visibleAccounts     → prop accounts di TransactionDialog, BudgetDialog, SavingsGoalDialog
│   ├── visibleTransactions → callback onUnlocked del PinDialog privato
│   ├── hasPrivateAccount   → componente di hasPrivateAccount in AccountDialog
│   └── privateAccount      → callback onUnlocked del PinDialog privato
├── useScreenReader()
│   └── screenReader        → announceBalance, announceSuccess nella callback onUnlocked
├── Helpers (@/lib/helpers)
│   ├── calculateAccountBalance
│   └── formatCurrency
├── soundSystem (@/lib/sound-system)
│   └── soundSystem.play('dialog-close')  → in onOpenChange e AlertDialogCancel
├── toast (sonner)
│   └── toast.success(...)  → nella callback onUnlocked del PinDialog privato
├── Componenti dialog (@/components/)
│   ├── PinDialog
│   ├── AccountDialog
│   ├── TransactionDialog
│   ├── BudgetDialog
│   ├── SavingsGoalDialog
│   └── KeyboardShortcutsHelp
└── Componenti UI (@/components/ui/alert-dialog)
    ├── AlertDialog
    ├── AlertDialogAction
    ├── AlertDialogCancel
    ├── AlertDialogContent
    ├── AlertDialogDescription
    ├── AlertDialogFooter
    ├── AlertDialogHeader
    └── AlertDialogTitle
```

`DialogsOverlay` **non** dipende da:

- Props dall'esterno: zero props — tutte le dipendenze arrivano dai context
- `useIsMobile()` — nessun comportamento responsivo specifico per i dialog
- `hapticSystem` — il feedback aptico è gestito negli handler dentro i context
- Icone Phosphor — non presenti direttamente nel componente (sono interne ai singoli dialog)
- Componenti UI diversi da `alert-dialog` — non necessari

---

## 6. Debito tecnico dichiarato

Al termine del Passo 12, `AppDataContext` ospiterà la seguente raccolta di stati UI dialog accumulati nei Passi 7–12:

| Stato | Tipo | Aggiunto nel passo |
|---|---|---|
| `showTransactionDialog` | `boolean` | Passo 7 |
| `editingTransaction` | `Transaction \| undefined` | Passo 7 |
| `showDeleteDialog` | `boolean` | Passo 7 |
| `deletingItem` | `{ type: ...; id: string } \| null` | Passo 7 |
| `showAccountDialog` | `boolean` | Passo 8 |
| `editingAccount` | `Account \| undefined` | Passo 8 |
| `showBudgetDialog` | `boolean` | Passo 9 |
| `editingBudget` | `Budget \| undefined` | Passo 9 |
| `showSavingsGoalDialog` | `boolean` | Passo 9 |
| `editingSavingsGoal` | `SavingsGoal \| undefined` | Passo 9 |
| `showKeyboardHelp` | `boolean` | Passo 10 |

**Debito**: questi undici stati non appartengono per natura a un context dati — descrivono lo stato della UI, non i dati del dominio. La collocazione corretta sarebbe un `UIContext` dedicato, separato da `AppDataContext`. Questa separazione non viene effettuata nel Passo 12 né nel Passo 13: verrebbe richiesta una modifica propagata a tutti i componenti Tab e hook già estratti, che eccede lo scopo del refactoring corrente.

Il Passo 12 consolida il debito (tutti gli stati UI dialog sono ora visibili in un unico punto: `DialogsOverlay`), ma non lo estingue. La creazione di un `UIContext` è rimandata a una fase separata successiva al completamento della serie.

---

## 7. Cosa `DialogsOverlay` NON fa

- Non gestisce la logica di salvataggio dei dati (è negli handler di `AppDataContext`)
- Non gestisce la logica di autenticazione o hashing PIN (è in `AuthContext`)
- Non gestisce la navigazione tra tab (rimane in `App.tsx`)
- Non renderizza l'header, i tab, lo sfondo, la `BudgetAlertBanner`, la `SkipLink` o il `Toaster`
- Non riceve props dall'esterno: zero props, tutte le dipendenze arrivano dai context
- Non controlla quale tab è attivo
- Non include la `BudgetAlertBanner` — elemento inline nel layout, non un dialog modale; rimane in `App.tsx`
- Non include il `Toaster` — rimane figlio diretto del Fragment radice in `App.tsx`

---

## 8. Rischi e avvertenze

| Rischio | Mitigazione |
|---|---|
| Props mancanti o errate su un dialog | Copiare le props esattamente dal JSX originale di `App.tsx`; confrontare con la firma dichiarata in ogni file componente prima di scrivere |
| Il ternario annidato di `AlertDialog` viene semplificato | Preservare esattamente il ternario `account → budget → savingsGoal → default` senza refactor durante l'estrazione |
| `soundSystem.play('dialog-close')` nell'`onOpenChange` di `AlertDialog` | Viene chiamato due volte nell'originale (in `onOpenChange` e in `<AlertDialogCancel>`); entrambe le chiamate devono essere presenti in `DialogsOverlay` |
| `DialogsOverlay` posizionato fuori dal `<div className="relative">` | Il componente deve essere inserito **dentro** il `<div className="relative">`, dopo `</main>`, non fuori dal div o a livello del Fragment radice |
| `BudgetAlertBanner` spostata dentro `DialogsOverlay` | **Non fare questo**: è un elemento inline nel layout, non un dialog modale; rimane in `App.tsx` |
| `Toaster` spostato dentro `DialogsOverlay` | **Non fare questo**: rimane figlio diretto del Fragment radice in `App.tsx` |
| Import inutilizzati in `App.tsx` dopo la rimozione | Dopo la rimozione del blocco dialog, i seguenti import diventano inutilizzati in `App.tsx`: `PinDialog`, `AccountDialog`, `TransactionDialog`, `BudgetDialog`, `SavingsGoalDialog`, `KeyboardShortcutsHelp`, `AlertDialog` e tutti i suoi subcomponenti, `calculateAccountBalance`, `formatCurrency`, `soundSystem` (potenzialmente). Non rimuovere nessun import nel Passo 12: la pulizia degli import è compito del Passo 13, dopo verifica TypeScript |
| Regressioni nei componenti già estratti | Verificare tutti e cinque i componenti estratti nei passi precedenti dopo la modifica |

---

## 9. Criteri di verifica (definition of done)

### Dialog 1 — PinDialog privato

- [ ] In presenza di un conto privato, il pulsante "Sblocca" nell'`AccountCard` apre il `PinDialog` privato
- [ ] Se `privatePinHash` è `null` (primo setup), il titolo è `'Crea PIN Conto Privato'` e `confirmMode={true}`
- [ ] Se `privatePinHash` è presente, il titolo è `'Sblocca Conto Privato'` e `confirmMode={false}`
- [ ] PIN privato corretto: il conto privato diventa visibile, toast con saldo
- [ ] PIN privato errato: toast di errore, dialog rimane aperto
- [ ] Pulsante Annulla: `setShowPrivatePinDialog(false)` viene chiamato

### Dialog 2 — AccountDialog

- [ ] Pulsante "Nuovo Conto": apre `AccountDialog` con form vuoto (`account` è `undefined`)
- [ ] Click modifica su conto esistente: apre `AccountDialog` precompilato
- [ ] `hasPrivateAccount` è `false` se nel form si sta modificando già il conto privato (`editingAccount?.isPrivato`)
- [ ] Salvataggio: il conto appare nella dashboard
- [ ] Annullamento: chiude il dialog e azzera `editingAccount`

### Dialog 3 — TransactionDialog

- [ ] Pulsante "Nuovo Movimento": apre `TransactionDialog` con form vuoto
- [ ] Click modifica su transazione: apre `TransactionDialog` precompilato
- [ ] Il select di `accounts` mostra solo i conti visibili (non i conti privati bloccati)
- [ ] Il select di `categories` mostra le categorie da `safeCategories`
- [ ] Salvataggio: la transazione appare nella lista e il saldo si aggiorna
- [ ] Annullamento: chiude il dialog e azzera `editingTransaction`

### Dialog 4 — BudgetDialog

- [ ] Pulsante "Nuovo Budget": apre `BudgetDialog` con form vuoto
- [ ] Click modifica su budget: apre `BudgetDialog` precompilato
- [ ] I select di `accounts` e `categories` sono popolati correttamente
- [ ] Salvataggio: il budget appare nel tab Report
- [ ] Annullamento: chiude il dialog e azzera `editingBudget`

### Dialog 5 — SavingsGoalDialog

- [ ] Pulsante "Nuovo Obiettivo": apre `SavingsGoalDialog` con form vuoto
- [ ] Click modifica su obiettivo: apre `SavingsGoalDialog` precompilato
- [ ] Il select di `accounts` mostra solo i conti visibili
- [ ] Salvataggio: l'obiettivo appare nel tab Report
- [ ] Annullamento: chiude il dialog e azzera `editingSavingsGoal`

### Dialog 6 — AlertDialog eliminazione

- [ ] Click elimina su qualsiasi elemento: apre `AlertDialog` con messaggio corretto per tipo
- [ ] Tipo `account`: testo con avviso movimenti associati
- [ ] Tipo `budget`: testo specifico per budget
- [ ] Tipo `savingsGoal`: testo specifico per obiettivo di risparmio
- [ ] Tipo `transaction` (default): testo generico movimento
- [ ] Conferma: `handleDeleteConfirm()` viene chiamato e l'elemento scompare dalla UI
- [ ] Annullamento: chiude il dialog, azzera `deletingItem`, suona `dialog-close`
- [ ] Chiusura tramite `onOpenChange` (click fuori, Escape): identico all'annullamento

### Dialog 7 — KeyboardShortcutsHelp

- [ ] Click pulsante nell'header o shortcut `Shift+?`: `showKeyboardHelp` diventa `true` e il pannello si apre
- [ ] Il pannello mostra le scorciatoie
- [ ] Chiusura: `setShowKeyboardHelp(false)` viene chiamato

### Struttura di App.tsx dopo la modifica

- [ ] `App.tsx` non contiene più nessun JSX dei sette dialog (solo `<DialogsOverlay />`)
- [ ] `<DialogsOverlay />` è posizionato all'interno del `<div className="relative">`, dopo `</main>`
- [ ] `DialogsOverlay` non ha props
- [ ] `DialogsOverlay` non espone un contesto proprio
- [ ] Gli import dei sette componenti dialog e dei loro subcomponenti **non** sono stati rimossi da `App.tsx` nel Passo 12 (la rimozione avviene nel Passo 13)

### Test di regressione

- [ ] Nessuna regressione nel tab Movimenti (`TransactionsTab`)
- [ ] Nessuna regressione nel tab Dashboard (`DashboardTab`)
- [ ] Nessuna regressione nel tab Report (`ReportsTab`)
- [ ] `AppHeader` continua a funzionare correttamente (saldo, tooltip, pulsante scorciatoie)
- [ ] `AuthScreen` continua a funzionare correttamente (login e setup PIN)
- [ ] `BudgetAlertBanner` mostra e dismissi gli avvisi correttamente
- [ ] TypeScript non riporta errori di tipo dopo la modifica
