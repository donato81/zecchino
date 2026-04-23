# P12 — Coding Plan: Estrazione `DialogsOverlay`

> Documento operativo. Nessun file di codice sorgente viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 12 — Creazione di `src/components/DialogsOverlay.tsx`  
> Design di riferimento: `docs/1 - projects/P12-DialogsOverlay-design.md`  
> Data: 23 aprile 2026

---

## Note preliminari

- I numeri di riga indicati sono **approssimativi** (±5 righe) e vanno verificati nell'editor prima di ogni modifica. Sono stati ricavati dal codice reale post-P11 sul branch `refactoring-architettura`.
- Questo pacchetto si implementa in **due passi distinti e sequenziali**: prima la creazione del componente, poi la sostituzione in `App.tsx`. Ogni passo va verificato con `npx tsc --noEmit` prima di procedere al successivo.
- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P11.
- ⚠️ **4 errori TypeScript baseline pre-esistenti** in `src/context/AuthContext.tsx` non introdotti da nessun passo precedente. `npx tsc --noEmit` non restituirà mai "zero errori" su questo branch. Il risultato atteso dopo ogni passo è **"4 errori, invariati rispetto a prima"**.
- **Nessun context da toccare in questo passo**: tutti gli stati e gli handler dialog necessari sono già esposti da `AppDataContext` e `AuthContext`. La verifica è stata effettuata sul codice effettivo (design §4). Nessuna modifica a nessun context è necessaria.
- File non toccati in questo passo:

  | File | Motivo |
  |---|---|
  | `src/context/AppDataContext.tsx` | Già espone tutti e 28 i campi dialog necessari; nessuna modifica richiesta |
  | `src/context/AuthContext.tsx` | Già espone `privatePinHash`, `showPrivatePinDialog`, `setShowPrivatePinDialog`, `handlePrivatePinSubmit`; nessuna modifica richiesta |
  | `src/hooks/use-visible-data.ts` | Già espone `visibleAccounts`, `visibleTransactions`, `hasPrivateAccount`, `privateAccount`; nessuna modifica richiesta |
  | `src/hooks/use-app-shortcuts.ts` | Shortcut globali invariate |
  | `src/components/AppHeader.tsx` | Già estratto nel Passo 10; invariato |
  | `src/components/TransactionsTab.tsx` | Già estratto nel Passo 7; invariato |
  | `src/components/DashboardTab.tsx` | Già estratto nel Passo 8; invariato |
  | `src/components/ReportsTab.tsx` | Già estratto nel Passo 9; invariato |
  | `src/components/AuthScreen.tsx` | Già estratto nel Passo 11; invariato |
  | `src/components/PinDialog.tsx` | Importato da `DialogsOverlay`; invariato |
  | `src/components/AccountDialog.tsx` | Importato da `DialogsOverlay`; invariato |
  | `src/components/TransactionDialog.tsx` | Importato da `DialogsOverlay`; invariato |
  | `src/components/BudgetDialog.tsx` | Importato da `DialogsOverlay`; invariato |
  | `src/components/SavingsGoalDialog.tsx` | Importato da `DialogsOverlay`; invariato |
  | `src/components/KeyboardShortcutsHelp.tsx` | Importato da `DialogsOverlay`; invariato |
  | `docs/`, `.github/` | Invariati |

---

## Debito tecnico dichiarato

Al termine del Passo 12, `AppDataContext` ospiterà undici stati UI dialog accumulati nei Passi 7–12:

| Stato | Tipo | Aggiunto nel passo |
|---|---|---|
| `showTransactionDialog` + `editingTransaction` | dialog state | Passo 7 |
| `showDeleteDialog` + `deletingItem` | dialog state | Passo 7 |
| `showAccountDialog` + `editingAccount` | dialog state | Passo 8 |
| `showBudgetDialog` + `editingBudget` | dialog state | Passo 9 |
| `showSavingsGoalDialog` + `editingSavingsGoal` | dialog state | Passo 9 |
| `showKeyboardHelp` | dialog state | Passo 10 |

Questi undici stati descrivono lo stato della UI, non i dati del dominio. La loro collocazione naturale sarebbe un `UIContext` dedicato, separato da `AppDataContext`. La creazione di un `UIContext` non viene effettuata nel Passo 12 né nel Passo 13: richiederebbe una modifica propagata a tutti i componenti Tab e hook già estratti, eccedendo lo scopo del refactoring corrente. Il Passo 12 consolida il debito (tutti gli stati UI dialog sono ora visibili in un unico punto: `DialogsOverlay`), ma la sua estinzione è rimandata a una fase separata successiva al completamento della serie.

---

## Ambiguità rilevate

### AI1 — Righe esatte del blocco dialog in `App.tsx` post-P11

**Situazione**: il design doc §2 indica "~335–418 post-P10"; dopo P11 le righe si sono spostate verso l'alto di ~24 posizioni (la rimozione del blocco auth ha ridotto `App.tsx` da 447 a ~422 righe).

**Risultato verifica sul codice effettivo post-P11**:

Il blocco dialog inizia dopo `</main>` e termina prima del `</div>` che chiude il `<div className="relative">`. Stima affidabile delle righe nel file da 422 righe:

| Elemento | Riga approssimativa post-P11 |
|---|---|
| `</main>` (chiusura del contenuto tab) | ~324 |
| `<PinDialog open={showPrivatePinDialog} ...>` — inizio Dialog 1 | ~326 |
| `/>` — fine Dialog 1 (PinDialog privato) | ~340 |
| `<AccountDialog ...>` — Dialog 2 | ~342 |
| `/>` — fine Dialog 2 | ~348 |
| `<TransactionDialog ...>` — Dialog 3 | ~350 |
| `/>` — fine Dialog 3 | ~358 |
| `<BudgetDialog ...>` — Dialog 4 | ~360 |
| `/>` — fine Dialog 4 | ~368 |
| `<SavingsGoalDialog ...>` — Dialog 5 | ~370 |
| `/>` — fine Dialog 5 | ~376 |
| `<AlertDialog open={showDeleteDialog} ...>` — Dialog 6 | ~378 |
| `</AlertDialog>` — fine Dialog 6 | ~400 |
| `<KeyboardShortcutsHelp ...>` — Dialog 7 | ~402 |
| `/>` — fine Dialog 7 | ~405 |
| `</div>` (chiusura di `<div className="relative">`) | ~406 |

**Istruzione operativa**: prima di iniziare il Passo B, aprire `App.tsx` e verificare le righe effettive nell'editor. Le stime ±5 righe sopra sono punti di partenza, non posizioni assolute.

### AI2 — Percorso esatto di `useScreenReader`

**Situazione**: `DialogsOverlay` istanzia `useScreenReader()` nella callback `onUnlocked` del PinDialog privato. Va verificato il nome esatto del file.

**Risultato verifica su `src/hooks/`**:

```
src/hooks/use-screen-reader.ts  ← presente
```

**Decisione**: l'import da usare è:

```tsx
import { useScreenReader } from '@/hooks/use-screen-reader'
```

### AI3 — Radice del `return` di `DialogsOverlay`: Fragment o elemento singolo

**Situazione**: i sette dialog sono fratelli nel JSX originale — non sono avvolti da nessun elemento wrapper dedicato; sono figli del `<div className="relative">` di `App.tsx` insieme a `<FocusIndicator />`, `<AppHeader />` e `<main>`. Quando vengono estratti, non esiste un wrapper naturale.

**Risultato verifica**: il blocco da estrarre è una sequenza di sette nodi JSX fratelli. La radice del `return` di `DialogsOverlay` deve essere un Fragment:

```tsx
return (
  <>
    <PinDialog ... />
    <AccountDialog ... />
    <TransactionDialog ... />
    <BudgetDialog ... />
    <SavingsGoalDialog ... />
    <AlertDialog ...>...</AlertDialog>
    <KeyboardShortcutsHelp ... />
  </>
)
```

**Decisione**: Fragment `<>...</>` obbligatorio. Non aggiungere nessun wrapper `<div>`.

### AI4 — Firma di `handlePrivatePinSubmit` in `AuthContext`

**Situazione**: il design §3.1 documenta che `handlePrivatePinSubmit` accetta un secondo parametro opzionale `onUnlocked`. Va verificato sulla firma effettiva.

**Risultato verifica su `src/context/AuthContext.tsx`**:

```typescript
handlePrivatePinSubmit: (pin: string, onUnlocked?: () => void) => Promise<void>
```

**Decisione**: il secondo parametro esiste ed è opzionale. La callback inline con `toast.success` e `screenReader.announceBalance` va passata come secondo argomento di `handlePrivatePinSubmit`. Nessuna modifica ad `AuthContext.tsx` necessaria.

### AI5 — `privateAccount` esposto da `useVisibleData()` con questo nome esatto

**Situazione**: il design §3.1 e §4.3 documenta che `privateAccount` è già esposto da `useVisibleData()`. Va verificato il nome esatto del campo.

**Risultato verifica su `src/hooks/use-visible-data.ts`**:

```typescript
export type VisibleDataResult = {
  ...
  privateAccount: Account | undefined
  ...
}
```

**Decisione**: il campo si chiama esattamente `privateAccount`. Destructuring diretto da `useVisibleData()` senza alias. Nessuna modifica all'hook necessaria.

---

## Rischi

### R1 — `DialogsOverlay` posizionato fuori dal `<div className="relative">` — 🔴 Alto

Se `<DialogsOverlay />` viene inserito in `App.tsx` fuori dal `<div className="relative">` (ad esempio come figlio diretto del Fragment radice o dopo `</div>`) anziché al suo posto originale (dopo `</main>`), i dialog non avranno il corretto contesto di stacking CSS e potrebbero non essere visualizzati correttamente.

**Mitigazione**: nel Passo B, il tag `<DialogsOverlay />` va inserito **dentro** il `<div className="relative">`, nella posizione esatta dove si trovava il blocco rimosso — cioè immediatamente dopo il tag `</main>`. Verificare la struttura risultante confrontando con il commento nella sezione B.3.

### R2 — Ternario annidato di `AlertDialog` trasformato durante la copia — 🔴 Alto

Il messaggio di conferma di `AlertDialog` è un ternario annidato su `deletingItem?.type` con quattro casi (`account`, `budget`, `savingsGoal`, default). Se il ternario viene semplificato in uno switch o oggetto lookup durante l'estrazione, il comportamento visivo resta identico ma si introduce un refactor non richiesto che eccede lo scopo del passo.

**Mitigazione**: copiare il ternario annidato dall'originale senza nessuna trasformazione. Il ternario ha questa struttura:

```tsx
{deletingItem?.type === 'account'
  ? '...'
  : deletingItem?.type === 'budget'
  ? '...'
  : deletingItem?.type === 'savingsGoal'
  ? '...'
  : '...'}
```

### R3 — `soundSystem.play('dialog-close')` chiamato una sola volta invece di due — 🔴 Alto

Nel codice originale di `App.tsx`, `soundSystem.play('dialog-close')` compare **due volte** nell'`AlertDialog`:

1. In `onOpenChange`: quando il dialog viene chiuso (qualsiasi causa — click fuori, Escape, o pulsante Annulla)
2. In `<AlertDialogCancel>` `onClick`: quando l'utente clicca esplicitamente Annulla

Entrambe le chiamate sono intenzionali e producono comportamento diverso in certi scenari. Se viene copiata solo una delle due, l'effetto sonoro manca in alcuni casi.

**Mitigazione**: copiare il blocco `AlertDialog` dall'originale senza omissioni. Dopo il Passo A, verificare con grep: `grep -c "dialog-close" src/components/DialogsOverlay.tsx` → deve restituire `2`.

### R4 — `BudgetAlertBanner` o `Toaster` inclusi in `DialogsOverlay` — 🔴 Alto

`BudgetAlertBanner` è un elemento inline nel layout (non un dialog modale); `Toaster` è un provider di notifiche globale. Entrambi devono rimanere in `App.tsx`. Spostarli in `DialogsOverlay` romperebbe il layout.

**Mitigazione**: il blocco da estrarre inizia dal primo `<PinDialog ...>` (dopo `</main>`) e termina con l'ultimo `/>` di `<KeyboardShortcutsHelp />`. Non includere nessun altro elemento.

### R5 — Deviazione `privateAccount` vs `visibleAccounts.find` — 🟡 Medio

**Deviazione intenzionale e migliorativa** (design §3.1): il codice originale in `App.tsx` usa `visibleAccounts.find(a => a.isPrivato)` nella callback `onUnlocked`. Questa espressione può restituire `undefined` al momento dello sblocco perché `visibleAccounts` è filtrato con `isPrivateUnlocked === false` — il re-render React con il conto sbloccato non è ancora avvenuto quando la callback viene eseguita. `DialogsOverlay` usa invece `privateAccount` da `useVisibleData()`, che è calcolato da `safeAccounts` (non filtrato per privacy) e restituisce sempre il conto privato se esiste. Questo garantisce che il toast mostri sempre il saldo corretto.

**Mitigazione**: in `DialogsOverlay`, usare `privateAccount` (da `useVisibleData()`) nella callback `onUnlocked` — **non** `visibleAccounts.find(a => a.isPrivato)`. Questa è una deviazione documentata, non un errore.

### R6 — Props mancanti o errate su un dialog — 🟡 Medio

Sette dialog con props multiple, alcune con espressioni composte. Una props mancante o un'espressione errata non è sempre segnalata da TypeScript con messaggi chiari (le props opzionali non segnalano errore se omesse).

**Mitigazione**: per ciascun dialog, confrontare le props del JSX in `DialogsOverlay` con la firma dichiarata nel file del componente. Le firme rilevanti sono riportate in sezione A.4.

### R7 — Import inutilizzati non rimossi da `App.tsx` nel Passo B — 🟢 Basso

Dopo la rimozione del blocco dialog, diversi import in `App.tsx` diventano inutilizzati: `PinDialog`, `AccountDialog`, `TransactionDialog`, `BudgetDialog`, `SavingsGoalDialog`, `KeyboardShortcutsHelp`, tutti i subcomponenti di `AlertDialog`, e potenzialmente `calculateAccountBalance`, `formatCurrency`, `soundSystem`. TypeScript segnala questi come warning, non come errori bloccanti.

**Mitigazione**: nel Passo B, **non rimuovere nessun import** da `App.tsx`. La pulizia degli import è compito esclusivo del Passo 13, dopo verifica TypeScript completa. Lasciare i warning come sono.

---

## Passo A — Creazione `src/components/DialogsOverlay.tsx`

### Rischio: 🔴 Alto (il Passo B dipende da questo)
### Prerequisito: P01–P11 completati; branch `refactoring-architettura`

### A.1 Import

```tsx
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useVisibleData } from '@/hooks/use-visible-data'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { calculateAccountBalance, formatCurrency } from '@/lib/helpers'
import { soundSystem } from '@/lib/sound-system'
import { toast } from 'sonner'
import { PinDialog } from '@/components/PinDialog'
import { AccountDialog } from '@/components/AccountDialog'
import { TransactionDialog } from '@/components/TransactionDialog'
import { BudgetDialog } from '@/components/BudgetDialog'
import { SavingsGoalDialog } from '@/components/SavingsGoalDialog'
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
```

> ⚠️ Non importare: `useIsMobile`, `hapticSystem`, icone Phosphor, componenti UI diversi da `alert-dialog`.  
> ⚠️ Non importare: `useState`, `useEffect` — zero state locale, zero effetti.

### A.2 Firma del componente

```tsx
export function DialogsOverlay() {
```

> ⚠️ Zero props nella firma — il componente è zero-props.  
> ⚠️ Zero `useState` locali nel corpo — tutti gli stati arrivano dai context.

### A.3 Sorgenti dati

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

  const {
    privatePinHash,
    showPrivatePinDialog, setShowPrivatePinDialog,
    handlePrivatePinSubmit,
  } = useAuth()

  const {
    visibleAccounts,
    visibleTransactions,
    hasPrivateAccount,
    privateAccount,
  } = useVisibleData()

  const screenReader = useScreenReader()
```

> ✔ Lista completa: 28 campi da `useAppData()`, 4 da `useAuth()`, 4 da `useVisibleData()`, 1 istanza `screenReader`.

### A.4 JSX del componente

Copiare il blocco righe **~326–405** di `src/App.tsx` (post-P11) come `return (<>...</>)` (AI3: Fragment obbligatorio come radice).

Verifiche obbligatorie per ciascun dialog:

---

#### Dialog 1 — PinDialog privato (~righe 326–340 di App.tsx post-P11)

| Prop | Valore | Note |
|---|---|---|
| `open` | `{showPrivatePinDialog}` | da `useAuth()` |
| `title` | `{privatePinHash ? 'Sblocca Conto Privato' : 'Crea PIN Conto Privato'}` | condizionale su `privatePinHash` |
| `description` | `{privatePinHash ? 'Inserisci il PIN del conto privato' : 'Crea un PIN per il conto privato'}` | condizionale su `privatePinHash` |
| `onSubmit` | callback inline (vedi sotto) | ⚠️ copiare esattamente |
| `onCancel` | `() => setShowPrivatePinDialog(false)` | da `useAuth()` |
| `confirmMode` | `{!privatePinHash}` | `true` se PIN non ancora impostato |

**Callback `onSubmit` — copiare esattamente** (⚠️ non semplificare):

```tsx
onSubmit={(pin) => handlePrivatePinSubmit(pin, () => {
  if (privateAccount) {
    const balance = calculateAccountBalance(privateAccount, visibleTransactions)
    toast.success(`Conto privato sbloccato. Saldo: ${formatCurrency(balance)}`)
    screenReader.announceBalance('Conto privato', balance)
  } else {
    screenReader.announceSuccess('Conto privato sbloccato.')
  }
})}
```

> ⚠️ **R5 — Deviazione intenzionale**: usare `privateAccount` (da `useVisibleData()`) — NON `visibleAccounts.find(a => a.isPrivato)` dell'originale. Motivazione: `visibleAccounts` è filtrato per `isPrivateUnlocked === false` al momento della chiamata; `privateAccount` è calcolato da `safeAccounts` e restituisce il conto anche quando è ancora bloccato.

---

#### Dialog 2 — AccountDialog (~righe 342–348 di App.tsx post-P11)

Firma `AccountDialogProps`:
```typescript
{ open: boolean; onClose: () => void; onSave: (account: Account) => void; account?: Account; hasPrivateAccount?: boolean }
```

| Prop | Valore | Note |
|---|---|---|
| `open` | `{showAccountDialog}` | |
| `onClose` | `() => { setShowAccountDialog(false); setEditingAccount(undefined) }` | |
| `onSave` | `(account) => { handleSaveAccount(account); setEditingAccount(undefined) }` | |
| `account` | `{editingAccount}` | opzionale — `undefined` per nuovo conto |
| `hasPrivateAccount` | `{hasPrivateAccount && !editingAccount?.isPrivato}` | ⚠️ espressione composta: `hasPrivateAccount` da `useVisibleData()` + `editingAccount` da `useAppData()` |

---

#### Dialog 3 — TransactionDialog (~righe 350–358 di App.tsx post-P11)

Firma `TransactionDialogProps`:
```typescript
{ open: boolean; onClose: () => void; onSave: (transaction: Transaction) => void; transaction?: Transaction; accounts: Account[]; categories: Category[] }
```

| Prop | Valore | Note |
|---|---|---|
| `open` | `{showTransactionDialog}` | |
| `onClose` | `() => { setShowTransactionDialog(false); setEditingTransaction(undefined) }` | |
| `onSave` | `(transaction) => { handleSaveTransaction(transaction); setEditingTransaction(undefined) }` | |
| `transaction` | `{editingTransaction}` | |
| `accounts` | `{visibleAccounts}` | ⚠️ `visibleAccounts` da `useVisibleData()` — **NON** `safeAccounts` |
| `categories` | `{safeCategories}` | da `useAppData()` |

---

#### Dialog 4 — BudgetDialog (~righe 360–368 di App.tsx post-P11)

Firma `BudgetDialogProps`:
```typescript
{ open: boolean; onClose: () => void; onSave: (budget: Budget) => void; budget?: Budget; categories: Category[]; accounts: Account[] }
```

| Prop | Valore | Note |
|---|---|---|
| `open` | `{showBudgetDialog}` | |
| `onClose` | `() => { setShowBudgetDialog(false); setEditingBudget(undefined) }` | |
| `onSave` | `(budget) => { handleSaveBudget(budget); setEditingBudget(undefined) }` | |
| `budget` | `{editingBudget}` | |
| `categories` | `{safeCategories}` | da `useAppData()` |
| `accounts` | `{visibleAccounts}` | da `useVisibleData()` |

---

#### Dialog 5 — SavingsGoalDialog (~righe 370–376 di App.tsx post-P11)

Firma `SavingsGoalDialogProps`:
```typescript
{ open: boolean; onClose: () => void; onSave: (goal: SavingsGoal) => void; goal?: SavingsGoal; accounts: Account[] }
```

| Prop | Valore | Note |
|---|---|---|
| `open` | `{showSavingsGoalDialog}` | |
| `onClose` | `() => { setShowSavingsGoalDialog(false); setEditingSavingsGoal(undefined) }` | |
| `onSave` | `(goal) => { handleSaveSavingsGoal(goal); setEditingSavingsGoal(undefined) }` | |
| `goal` | `{editingSavingsGoal}` | |
| `accounts` | `{visibleAccounts}` | da `useVisibleData()` |

---

#### Dialog 6 — AlertDialog conferma eliminazione (~righe 378–400 di App.tsx post-P11)

```tsx
<AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
  if (!open) {
    soundSystem.play('dialog-close')  // ⚠️ R3 — prima occorrenza
    setDeletingItem(null)
  }
  setShowDeleteDialog(open)
}}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
      <AlertDialogDescription>
        {deletingItem?.type === 'account'
          ? 'Eliminando questo conto verranno rimossi anche tutti i movimenti associati. Questa azione non può essere annullata.'
          : deletingItem?.type === 'budget'
          ? 'Questa azione eliminerà definitivamente il budget. Non può essere annullata.'
          : deletingItem?.type === 'savingsGoal'
          ? 'Questa azione eliminerà definitivamente l\'obiettivo di risparmio. Non può essere annullata.'
          : 'Questa azione eliminerà definitivamente il movimento. Non può essere annullata.'}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => soundSystem.play('dialog-close')}>Annulla</AlertDialogCancel>  {/* ⚠️ R3 — seconda occorrenza */}
      <AlertDialogAction onClick={() => handleDeleteConfirm()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        Elimina
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

> ⚠️ **R2**: Il ternario annidato (4 casi) va preservato esattamente — **non trasformarlo** in switch o oggetto lookup.  
> ⚠️ **R3**: `soundSystem.play('dialog-close')` compare **due volte**: in `onOpenChange` e in `<AlertDialogCancel>`. Entrambe obbligatorie.

---

#### Dialog 7 — KeyboardShortcutsHelp (~righe 402–405 di App.tsx post-P11)

Firma `KeyboardShortcutsHelpProps`:
```typescript
{ open: boolean; onClose: () => void }
```

| Prop | Valore | Note |
|---|---|---|
| `open` | `{showKeyboardHelp}` | da `useAppData()` |
| `onClose` | `() => setShowKeyboardHelp(false)` | da `useAppData()` |

---

### Criterio di verifica — Passo A

- `npx tsc --noEmit` → 4 errori baseline, invariati rispetto a prima
- `grep -c "dialog-close" src/components/DialogsOverlay.tsx` → `2`
- Il componente esiste come file ma `App.tsx` non è ancora stato modificato → comportamento dell'app invariato

---

## Passo B — Modifica `src/App.tsx`

### Rischio: 🟡 Medio (dipende dal Passo A completato)
### Prerequisito: Passo A verificato con `tsc --noEmit` a 4 errori baseline

### B.1 Aggiunta import di `DialogsOverlay`

Aggiungere tra gli import dei componenti estratti (dopo l'import di `AuthScreen`, ~riga 41):

```tsx
import { DialogsOverlay } from '@/components/DialogsOverlay'
```

### B.2 Rimozione del blocco JSX dei sette dialog (~righe 326–405 post-P11)

Rimuovere l'intero blocco che inizia con:

```tsx
      <PinDialog
        open={showPrivatePinDialog}
```

e termina con:

```tsx
      <KeyboardShortcutsHelp
        open={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
```

⚠️ Il blocco da rimuovere è circa 80 righe. Verificare nell'editor i limiti esatti prima di rimuovere.

### B.3 Sostituzione con `<DialogsOverlay />`

Nella posizione esatta dove si trovava il blocco rimosso (dentro `<div className="relative">`, dopo `</main>`), inserire:

```tsx
      <DialogsOverlay />
```

La struttura risultante del `<div className="relative">` deve essere:

```tsx
<div className="relative">
  <FocusIndicator />
  <AppHeader />

  <main className="container mx-auto ..." id="main-content" role="main" aria-label="...">
    {budgetAlerts.length > 0 && (
      <div ...>
        <BudgetAlertBanner ... />
      </div>
    )}
    <Tabs ...>
      <DashboardTab />
      <TransactionsTab />
      <ReportsTab />
    </Tabs>
  </main>

  <DialogsOverlay />
</div>
```

> ⚠️ **R1**: `<DialogsOverlay />` è **dentro** il `<div className="relative">` — non fuori, non a livello del Fragment radice.  
> ⚠️ **R4**: `<BudgetAlertBanner />` rimane dentro `<main>` — non va spostata.  
> ⚠️ **R4**: `<Toaster />` rimane figlio del Fragment radice esterno — non va spostato.

### B.4 Import non rimossi da `App.tsx`

> ⚠️ **Non rimuovere nessun import** da `App.tsx` in questo passo.  
> La pulizia degli import (R7) è compito esclusivo del Passo 13.  
> Lasciare gli import inutilizzati come warning TypeScript: non sono errori bloccanti.

### Criterio di verifica — Passo B

- `npx tsc --noEmit` → 4 errori baseline, invariati rispetto a prima
- `npm run build` → compilazione riuscita
- `grep "DialogsOverlay" src/App.tsx` → almeno 2 risultati (import + JSX `<DialogsOverlay />`)
- `grep "showDeleteDialog\|showAccountDialog\|showBudgetDialog" src/App.tsx` → zero risultati nel JSX (solo eventuale destructuring residuo di `useAppData()`)

---

## Schema riepilogativo

```
P12 — DialogsOverlay
│
├─ PASSO A — Creazione src/components/DialogsOverlay.tsx
│   ├─ Prerequisito: P01–P11 completati; branch refactoring-architettura
│   ├─ Import: 7 componenti dialog + 4 context/hook + 4 utility
│   ├─ Firma: export function DialogsOverlay()  [zero props]
│   ├─ Destructuring: 28 campi da useAppData() + 4 da useAuth() + 4 da useVisibleData() + 1 screenReader
│   ├─ JSX: return (<>Dialog1...Dialog7</>)  [Fragment obbligatorio]
│   └─ Verifica: tsc → 4 errori baseline invariati; grep dialog-close → 2
│
└─ PASSO B — Modifica src/App.tsx
    ├─ Prerequisito: Passo A verificato
    ├─ Aggiunta import DialogsOverlay
    ├─ Rimozione blocco ~326–405 (~80 righe)
    ├─ Inserimento <DialogsOverlay /> dentro <div className="relative">, dopo </main>
    ├─ Nessun import rimosso [rimandato a P13]
    └─ Verifica: tsc → 4 errori baseline; build OK; grep struttura
```
