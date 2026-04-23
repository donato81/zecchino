# P08 — Estrazione `DashboardTab` come componente autonomo

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 8 (corrispondente al Passo 8 del piano di refactoring)  
> Data: 23 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Al termine del Passo 7, il tab Movimenti è stato estratto in `TransactionsTab.tsx` e il pattern di estrazione è stato validato: un componente che non riceve props, legge tutto dai context e dagli hook, e istanzia al suo interno i meccanismi di navigazione da tastiera che gli appartengono semanticamente.

Il Passo 8 applica lo stesso pattern al tab Dashboard: il blocco `TabsContent value="dashboard"` (circa 300 righe nel JSX post-P07 di `App.tsx`) viene estratto in un file autonomo: `src/components/DashboardTab.tsx`.

**Perché adesso**: la Dashboard è il secondo tab per complessità crescente. È più complessa di `TransactionsTab` (gestisce filtri categoria, griglia conti e movimenti recenti) ma meno dipendente da strutture dati specifiche di `ReportsTab`. Estrarla adesso consolida il pattern su un caso leggermente più articolato, prima di affrontare il tab Report.

**Cosa NON cambia**: il comportamento dell'app è **identico** a prima. Nessun dato, nessun handler, nessuna logica di business viene modificata: si sposta solo la struttura JSX.

---

## 2. Perimetro della modifica

### File creati

| Percorso | Scopo |
|---|---|
| `src/components/DashboardTab.tsx` | Componente autonomo che incapsula il tab Dashboard |

### File modificati

| Percorso | Modifica |
|---|---|
| `src/App.tsx` | Rimozione del blocco JSX `TabsContent value="dashboard"` (~300 righe); sostituzione con `<DashboardTab />`; aggiunta import del componente; rimozione delle istanze locali `showAccountDialog`, `setShowAccountDialog`, `editingAccount`, `setEditingAccount` (ora in AppDataContext) |
| `src/context/AppDataContext.tsx` | Aggiunta di 2 stati dialog account (vedi Sezione 4) |

### File non toccati

| Percorso | Motivo |
|---|---|
| `src/hooks/use-visible-data.ts` | Già espone tutti i valori necessari alla Dashboard |
| `src/hooks/use-app-shortcuts.ts` | Le shortcut globali rimangono invariate |
| `src/context/AuthContext.tsx` | `DashboardTab` vi accede in lettura; nessuna modifica necessaria |
| `src/hooks/use-list-navigation.ts` | Il meccanismo non cambia; si sposta solo dove viene istanziato |
| `src/lib/helpers.ts` | `calculateAccountBalance` e `formatCurrency` sono funzioni pure già importabili direttamente |
| `src/components/AccountCard.tsx` | Invariato |
| `src/components/AccountDialog.tsx` | Rimane nella zona DialogsOverlay; invariato |
| `src/components/TransactionsTab.tsx` | Già estratto nel Passo 7; invariato |
| `docs/`, `.github/` | Invariati |

---

## 3. Sorgenti dati del nuovo componente

`DashboardTab` non riceve props dall'esterno. Legge tutto direttamente dai context e dagli hook. Le dipendenze si articolano in tre aree funzionali.

### 3.1 Area 1 — Header azioni rapide + Filtri categoria

| Dato / Handler | Provenienza | Uso nel componente |
|---|---|---|
| `toggleCategoryVisibility(categoryId)` | `useAppData()` | Click sui bottoni filtro categoria individuali + shortcut tastiera 1–5 |
| `toggleAllCategories()` | `useAppData()` | Click sul bottone "Mostra/Nascondi tutto" + shortcut Ctrl+A |
| `setVisibleCategories` | `useAppData()` | Bottone "Mostra Tutti i Conti" (reset filtri quando `filteredGroupedAccounts.length === 0`) |
| `visibleCategories` | `useAppData()` | Calcolo dello stato `isActive` per ogni bottone filtro |
| `allCategoriesVisible` | `useVisibleData()` | Stato visivo del bottone toggle globale (variant active/outline) |
| `groupedAccounts` | `useVisibleData()` | Iterazione per generare i bottoni filtro (uno per categoria presente) |
| `filteredGroupedAccounts` | `useVisibleData()` | Guard per mostrare il messaggio "nessun conto con filtri selezionati" |
| `setEditingTransaction` | `useAppData()` | Pulsante "Nuovo Movimento" — reset a `undefined` prima di aprire il dialog |
| `setShowTransactionDialog` | `useAppData()` | Pulsante "Nuovo Movimento" — apertura dialog |
| `setEditingAccount` | `useAppData()` *(da aggiungere — vedi §4)* | Pulsante "Nuovo Conto" — reset a `undefined` prima di aprire il dialog |
| `setShowAccountDialog` | `useAppData()` *(da aggiungere — vedi §4)* | Pulsante "Nuovo Conto" — apertura dialog |
| `hasPrivateAccount` | `useVisibleData()` | Guard: il pulsante "Sblocca Privato" appare solo se esiste un conto privato |
| `isPrivateUnlocked` | `useAuth()` | Guard: il pulsante "Sblocca Privato" appare solo se il conto non è già sbloccato |
| `setShowPrivatePinDialog` | `useAuth()` | Pulsante "Sblocca Privato" — apertura dialog PIN privato |
| `isMobile` | `useIsMobile()` | Adatta dimensioni icone, label e badge scorciatoie |

### 3.2 Area 2 — Griglia conti

| Dato / Handler | Provenienza | Uso nel componente |
|---|---|---|
| `visibleAccounts` | `useVisibleData()` | Guard: mostra messaggio "Nessun conto disponibile" se vuoto; lookup conti per AccountCard |
| `filteredGroupedAccounts` | `useVisibleData()` | Iterazione per renderizzare i gruppi di conti |
| `calculateAccountBalance(account, visibleTransactions)` | `@/lib/helpers` (import diretto) | Calcolo saldo per ogni `AccountCard` |
| `visibleTransactions` | `useVisibleData()` | Parametro passato a `calculateAccountBalance` |
| `setEditingAccount` | `useAppData()` *(da aggiungere)* | Click su conto esistente → precompila il dialog |
| `setShowAccountDialog` | `useAppData()` *(da aggiungere)* | Click su conto esistente → apre `AccountDialog` |
| `setDeletingItem` | `useAppData()` | Pulsante elimina conto → imposta `{ type: 'account', id: account.id }` |
| `setShowDeleteDialog` | `useAppData()` | Pulsante elimina conto → apre `AlertDialog` di conferma |
| `formatCurrency` | `@/lib/helpers` (import diretto) | Rendering saldi |
| `isMobile` | `useIsMobile()` | Adatta layout griglia |

> **Nota su `AccountCard` e click**: nella versione corrente di `App.tsx`, `AccountCard` è renderizzato senza `onClick`. Il criterio di verifica (§8, riga 3) richiede che il click su un conto esistente apra `AccountDialog` precompilato. In `DashboardTab`, `AccountCard` andrà collegato con:
> ```tsx
> onClick={() => {
>   setEditingAccount(account)
>   setShowAccountDialog(true)
> }}
> ```
> Questo non è un cambio di logica di business: è completare il collegamento UI che il componente `AccountCard` già supporta via prop `onClick`.

### 3.3 Area 3 — Movimenti recenti

| Dato / Handler | Provenienza | Uso nel componente |
|---|---|---|
| `recentTransactions` | `useVisibleData()` | Lista (le ultime 10 transazioni, già ordinate per data decrescente) |
| `visibleAccounts` | `useVisibleData()` | Lookup nome conto per ogni riga movimento |
| `safeCategories` | `useAppData()` | Lookup nome categoria per ogni riga movimento |
| `recentTransactionsNav` | `useListNavigation(...)` *(istanziato localmente)* | Navigazione da tastiera con ↑/↓, Enter, E, Del |
| `setEditingTransaction` | `useAppData()` | Click su pulsante modifica o Enter/E → precompila dialog |
| `setShowTransactionDialog` | `useAppData()` | Click su pulsante modifica o Enter/E → apre dialog |
| `setDeletingItem` | `useAppData()` | Click su pulsante elimina o Del → imposta item da eliminare |
| `setShowDeleteDialog` | `useAppData()` | Click su pulsante elimina o Del → apre `AlertDialog` |
| `formatCurrency` | `@/lib/helpers` (import diretto) | Rendering importi |
| `isMobile` | `useIsMobile()` | Adatta layout |

### 3.4 Dati che il componente NON usa direttamente

Il componente non usa: `totalBalance`, `budgetAlerts`, `chartPeriod`, `activeTab`, `setActiveTab`, `handleSaveTransaction`, `handleSaveBudget`, `handleSaveSavingsGoal`, `safeBudgets`, `safeSavingsGoals`, `editingBudget`, `editingSavingsGoal`. Questi rimangono di competenza di `ReportsTab` o di `App.tsx`.

---

## 4. Gestione degli stati dialog

### Stato post-Passo 7

Dopo il Passo 7, `AppDataContext` espone già:

| Stato | Tipo | Note |
|---|---|---|
| `editingTransaction` | `Transaction \| undefined` | Già in AppDataContext |
| `setEditingTransaction` | `(t: Transaction \| undefined) => void` | Già in AppDataContext |
| `showTransactionDialog` | `boolean` | Già in AppDataContext |
| `setShowTransactionDialog` | `(v: boolean) => void` | Già in AppDataContext |
| `deletingItem` | `{ type: ...; id: string } \| null` | Già in AppDataContext |
| `setDeletingItem` | `(item: ...) => void` | Già in AppDataContext |
| `showDeleteDialog` | `boolean` | Già in AppDataContext |
| `setShowDeleteDialog` | `(v: boolean) => void` | Già in AppDataContext |

### Stato mancante per DashboardTab

Due stati sono ancora locali in `App.tsx` e sono necessari esclusivamente alla Dashboard (e a `DialogsOverlay` che renderizza `AccountDialog`):

| Stato | Tipo | Uso attuale |
|---|---|---|
| `editingAccount` | `Account \| undefined` | Conto passato ad `AccountDialog` in modalità modifica |
| `showAccountDialog` | `boolean` | Apre/chiude `AccountDialog` |

> **Nota**: `showBudgetDialog`, `showSavingsGoalDialog`, `editingBudget`, `editingSavingsGoal` non sono necessari in questo passo: appartengono a `ReportsTab` e verranno spostati al Passo 9.

### Opzione A — Aggiunta ad `AppDataContext` (scelta per questo passo)

I due stati vengono aggiunti come `useState` dentro `AppDataProvider` ed esposti nel valore del context, seguendo lo stesso approccio adottato nel Passo 7 per i quattro stati dialog transaction/delete.

**Perché questa scelta**: coerenza con il pattern stabilito nel Passo 7. Il perimetro rimane minimo e l'aggiunta è documentata come interim, da consolidare nel passo che creerà `UIContext`.

**Trade-off dichiarato**: `AppDataContext` accumula ulteriore UI state che non gli appartiene per natura. Il debito tecnico aumenta di due campi rispetto al Passo 7. Sarà estinto contestualmente alla creazione di `UIContext`.

### Modifiche ad `AppDataContext`

Aggiungere in `AppDataContextValue`:

```ts
// Dialog account
editingAccount: Account | undefined
setEditingAccount: (a: Account | undefined) => void
showAccountDialog: boolean
setShowAccountDialog: (v: boolean) => void
```

Aggiungere nel corpo di `AppDataProvider` (vicino agli altri useState dialog):

```ts
const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined)
const [showAccountDialog, setShowAccountDialog] = useState(false)
```

Aggiungere al valore esposto dal context (`value={...}`) i quattro nuovi campi:

```ts
editingAccount,
setEditingAccount,
showAccountDialog,
setShowAccountDialog,
```

Rimuovere da `App.tsx` le seguenti dichiarazioni (ora ridondanti):

```ts
const [showAccountDialog, setShowAccountDialog] = useState(false)
const [editingAccount, setEditingAccount] = useState<Account | undefined>()
```

---

## 5. Spostamento di `recentTransactionsNav`

### Configurazione attuale in `App.tsx`

```ts
const recentTransactionsNav = useListNavigation({
  itemCount: recentTransactions.length,
  enabled: isAuthenticated && activeTab === 'dashboard',
  onEnter: (index) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  },
  onDelete: (index) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      setDeletingItem({ type: 'transaction', id: transaction.id })
      setShowDeleteDialog(true)
    }
  },
  onEdit: (index) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  }
})
```

### Come va riscritta in `DashboardTab.tsx`

```ts
// src/components/DashboardTab.tsx (frammento)

const { recentTransactions, visibleAccounts, filteredGroupedAccounts, groupedAccounts,
        visibleTransactions, hasPrivateAccount, allCategoriesVisible } = useVisibleData()
const { safeCategories, setEditingTransaction, setShowTransactionDialog,
        setDeletingItem, setShowDeleteDialog,
        setEditingAccount, setShowAccountDialog,
        toggleCategoryVisibility, toggleAllCategories, setVisibleCategories,
        visibleCategories } = useAppData()
const { isPrivateUnlocked, setShowPrivatePinDialog } = useAuth()

const recentTransactionsNav = useListNavigation({
  itemCount: recentTransactions.length,
  enabled: isAuthenticated,  // vedi nota sotto
  onEnter: (index) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  },
  onDelete: (index) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      setDeletingItem({ type: 'transaction', id: transaction.id })
      setShowDeleteDialog(true)
    }
  },
  onEdit: (index) => {
    const transaction = recentTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  }
})
```

### Nota sul flag `enabled`

Nella versione originale, `enabled: isAuthenticated && activeTab === 'dashboard'` combina due guard:
- `activeTab === 'dashboard'`: impedisce che le shortcut di navigazione lista reagiscano quando l'utente è su un altro tab.
- `isAuthenticated`: impedisce che le shortcut siano attive sulla schermata di login.

Nel nuovo componente, `DashboardTab` è renderizzato dentro `TabsContent value="dashboard"`, che nel comportamento di Radix UI monta il contenuto solo quando il tab è attivo. Pertanto `activeTab === 'dashboard'` è implicito: il componente non esiste nel DOM attivo quando l'utente è su un altro tab.

**Valutazione di `isAuthenticated`**: `DashboardTab` è renderizzato solo dopo l'autenticazione (l'intera struttura `Tabs` è dentro il branch `if (isAuthenticated)`). In teoria il guard è doppiamente implicito. Tuttavia, mantenerlo esplicito (`enabled: isAuthenticated`) è più difensivo e coerente con la lettura del codice. Si raccomanda di ottenerlo tramite `useAuth()`:

```ts
const { isAuthenticated, isPrivateUnlocked, setShowPrivatePinDialog } = useAuth()
```

---

## 6. Rischio specifico — Tooltip filtri categoria

### Cosa contengono i Tooltip

Ogni bottone filtro categoria ha un `TooltipContent` con tre righe:

```tsx
<TooltipContent variant={category.id as any}>
  <div className="space-y-0.5">
    <p className="font-semibold">{category.label}</p>
    <p className="text-xs opacity-90">{category.description}</p>
    <p className="text-xs opacity-75 mt-1">
      {category.accounts.length} {category.accounts.length === 1 ? 'conto' : 'conti'} • Tasto {keyNumber}
    </p>
  </div>
</TooltipContent>
```

### Da dove leggono i dati

- `category.label`, `category.description`, `category.id` → proprietà di ogni elemento di `groupedAccounts` (da `useVisibleData()`)
- `category.accounts.length` → numero di conti nel gruppo, proveniente dallo stesso `groupedAccounts`
- `keyNumber` → indice `index + 1` dell'iterazione su `groupedAccounts.map(...)`

**Tutti questi dati sono già disponibili in `DashboardTab` tramite `useVisibleData()`**. Non è necessario alcun passaggio aggiuntivo.

### Come verificare

Dopo l'estrazione, aprire il tab Dashboard e verificare che passando il mouse (o usando la tastiera) sui bottoni filtro categoria i Tooltip mostrino:
1. Il nome corretto della categoria (es. "Bancari")
2. La descrizione corretta (es. "Conti correnti e depositi bancari")
3. Il numero aggiornato di conti nella categoria

Il rischio di regressione è basso poiché `groupedAccounts` è calcolato da `useVisibleData()` e `DashboardTab` la chiama direttamente. L'unico punto di attenzione è che `groupedAccounts` — non `filteredGroupedAccounts` — venga usato per i bottoni filtro (per mostrare anche le categorie al momento nascoste), come nella versione originale.

---

## 7. Rischi e avvertenze

### R1 — `calculateAccountBalance` va importato direttamente

Nel JSX corrente di `App.tsx`, `calculateAccountBalance` è importato a livello di modulo da `@/lib/helpers`. Nel nuovo componente va fatto lo stesso import diretto: non è esposto da `useAppData()` né da `useVisibleData()`. È una funzione pura e non ha dipendenze da context.

```ts
import { calculateAccountBalance, formatCurrency } from '@/lib/helpers'
```

### R2 — `ACCOUNT_CATEGORIES` è necessario per il reset filtri

Il bottone "Mostra Tutti i Conti" (visibile quando `filteredGroupedAccounts.length === 0`) chiama:

```ts
setVisibleCategories(ACCOUNT_CATEGORIES.map(c => c.id))
```

`ACCOUNT_CATEGORIES` va importato da `@/lib/constants` nel nuovo componente:

```ts
import { ACCOUNT_CATEGORIES } from '@/lib/constants'
```

### R3 — Bug pre-esistente su salvataggio movimenti

Come già documentato nel Passo 7, `handleSaveTransaction` era non funzionante prima del refactoring. Il Passo 8 **non deve toccare** tale handler. La regressione è pre-esistente e va gestita in un issue separato.

### R4 — Non toccare la logica di `toggleCategoryVisibility` e `toggleAllCategories`

Questi handler sono già in `AppDataContext` e gestiscono anche feedback sonoro e accessibilità. Il componente li chiama come sono, senza wrapping aggiuntivo.

### R5 — Verifica che `groupedAccounts` (non `filteredGroupedAccounts`) alimenti i bottoni filtro

La distinzione è semanticamente importante: i bottoni filtro devono mostrare **tutte le categorie che hanno conti** (da `groupedAccounts`), non solo quelle attualmente visibili (da `filteredGroupedAccounts`). L'uso sbagliato di `filteredGroupedAccounts` per i bottoni comporterebbe la sparizione del bottone di una categoria quando questa viene nascosta — impedendo di riattivarla.

### R6 — Verifica setter esposti prima di scrivere codice

Prima di implementare `DashboardTab`, verificare che `AppDataContext` esponga i due nuovi stati dialog account (§4). Se mancanti, aggiungerli prima di procedere.

### R7 — Nessuna regressione su `TransactionsTab`

Il Passo 8 non tocca `TransactionsTab.tsx`. Tuttavia, dopo le modifiche ad `AppDataContext` (aggiunta di `editingAccount` e `showAccountDialog`), verificare che `TransactionsTab` continui a funzionare correttamente: non usa questi stati, ma è opportuno un test di fumo.

---

## 8. Criteri di verifica (definition of done)

| # | Scenario | Risultato atteso |
|---|---|---|
| 1 | Aprire il tab Dashboard | I conti sono visualizzati raggruppati per categoria con saldi corretti |
| 2 | Click sul bottone categoria (es. "Bancari") | La categoria viene nascosta/mostrata; il bottone cambia variant visivo |
| 3 | Click sul bottone "Mostra/Nascondi tutto" | Tutte le categorie vengono mostrate o nascoste contestualmente |
| 4 | Nascondere tutte le categorie → `filteredGroupedAccounts.length === 0` | Compare il messaggio "Nessun conto da visualizzare" con il bottone "Mostra Tutti i Conti" |
| 5 | Click su "Mostra Tutti i Conti" | Tutte le categorie tornano visibili; la griglia si ripopola |
| 6 | Hover sui bottoni filtro categoria | Il Tooltip mostra label, descrizione e numero di conti corretti |
| 7 | Click su "Nuovo Movimento" | Si apre `TransactionDialog` in modalità creazione (form vuoto) |
| 8 | Click su "Nuovo Conto" | Si apre `AccountDialog` in modalità creazione (form vuoto) |
| 9 | Click su un conto esistente nella griglia | Si apre `AccountDialog` precompilato con i dati del conto |
| 10 | Pulsante elimina conto | Si apre `AlertDialog` di conferma con il conto corretto |
| 11 | Confermare eliminazione conto | Il conto viene rimosso dalla griglia |
| 12 | Conto privato presente e non sbloccato | Compare il bottone "Sblocca Privato" |
| 13 | Click su "Sblocca Privato" | Si apre `PinDialog` per il PIN privato |
| 14 | Conto privato già sbloccato | Il bottone "Sblocca Privato" non compare |
| 15 | Lista movimenti recenti non vuota | I movimenti sono visualizzati con data, conto, importo e colore corretto |
| 16 | Premere ↑/↓ nella lista movimenti recenti | Il focus si sposta tra le righe con highlight visivo corretto |
| 17 | Premere Enter o E su un movimento focalizzato | Si apre `TransactionDialog` precompilato sul movimento corretto |
| 18 | Premere Del su un movimento focalizzato | Si apre `AlertDialog` di conferma sul movimento corretto |
| 19 | Nessuna regressione nel tab Movimenti | `TransactionsTab` funziona identicamente a prima del Passo 8 |
| 20 | Nessuna regressione nel tab Report | Le card budget, obiettivi risparmio e impostazioni rimangono funzionali |
| 21 | Shortcut Ctrl+M da Dashboard o da altri tab | Si apre `AccountDialog` vuoto (shortcut globale — rimane funzionante) |
| 22 | Shortcut Ctrl+N da Dashboard o da altri tab | Si apre `TransactionDialog` vuoto (shortcut globale — rimane funzionante) |
| 23 | Accessibilità: bottoni filtro categoria con screen reader | Ogni bottone annuncia il nome categoria e il numero di conti via `data-focus-info` |
| 24 | Accessibilità: lista movimenti recenti con screen reader | Ogni riga annuncia descrizione, tipo e importo del movimento; i pulsanti modifica/elimina hanno `aria-label` corretti |
