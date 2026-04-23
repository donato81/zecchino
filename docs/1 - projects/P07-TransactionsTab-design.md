# P07 — Estrazione `TransactionsTab` come componente autonomo

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 7 (corrispondente al Passo 7 del piano di refactoring)  
> Data: 23 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Al termine dei Passi 1–6, `App.tsx` espone i dati tramite `AppDataContext` e `AuthContext`, calcola i valori derivati tramite `useVisibleData()`, e delega la configurazione delle shortcut a `useAppShortcuts()`. Tuttavia il JSX del tab Movimenti (circa 145 righe) è ancora inline in `App.tsx`, accoppiato a tutto il resto dell'interfaccia.

Il Passo 7 estrae il blocco `TabsContent value="transactions"` in un file autonomo: `src/components/TransactionsTab.tsx`.

**Perché farlo adesso**: il tab Movimenti è il più indipendente dei tre (non dipende da `totalBalance`, `groupedAccounts`, `filteredGroupedAccounts` o altri valori specifici della Dashboard). Tutte le sue sorgenti dati sono già pronte nei context e nell'hook `useVisibleData`. È il candidato naturale per il primo tab da estrarre.

**Cosa NON cambia**: il comportamento dell'app è **identico** a prima. Nessun dato, nessun handler, nessuna logica di business viene modificata: si sposta solo la struttura JSX.

---

## 2. Perimetro della modifica

### File creati

| Percorso | Scopo |
|---|---|
| `src/components/TransactionsTab.tsx` | Componente autonomo che incapsula il tab Movimenti |

### File modificati

| Percorso | Modifica |
|---|---|
| `src/App.tsx` | Rimozione del blocco JSX `TabsContent value="transactions"` (~145 righe); sostituzione con `<TransactionsTab />`; aggiunta import del componente |
| `src/context/AppDataContext.tsx` | Aggiunta di 4 stati dialog (vedi Sezione 4 — Opzione A) |

### File non toccati

| Percorso | Motivo |
|---|---|
| `src/hooks/use-visible-data.ts` | Già espone `visibleTransactions`, `visibleAccounts`, `safeCategories` |
| `src/hooks/use-app-shortcuts.ts` | Le shortcut globali rimangono invariate |
| `src/context/AuthContext.tsx` | `TransactionsTab` non accede direttamente all'auth |
| `src/hooks/use-list-navigation.ts` | Il meccanismo non cambia; si sposta solo dove viene istanziato |
| `src/lib/` | Invariato |
| `src/components/` (altri file) | Invariati |
| `docs/`, `.github/` | Invariati |

---

## 3. Sorgenti dati del nuovo componente

`TransactionsTab` non riceve props dall'esterno. Legge tutto direttamente dai context e dagli hook:

| Dato | Provenienza | Uso nel componente |
|---|---|---|
| `visibleTransactions` | `useVisibleData()` | Lista movimenti da renderizzare (già ordinata per data decrescente) |
| `visibleAccounts` | `useVisibleData()` | Lookup conto sorgente/destinazione per ogni movimento |
| `safeCategories` | `useVisibleData()` | Lookup nome categoria per ogni movimento |
| `handleExportCSV` | `useAppData()` | Pulsante "Esporta CSV" |
| `editingTransaction` | `useAppData()` | Movimento passato al `TransactionDialog` in modalità modifica |
| `setEditingTransaction` | `useAppData()` | Imposta il movimento da modificare (o `undefined` per nuovo) |
| `showTransactionDialog` | `useAppData()` | Controlla apertura/chiusura del `TransactionDialog` |
| `setShowTransactionDialog` | `useAppData()` | Apre il dialog al click su "Nuovo Movimento" e sui pulsanti di modifica |
| `deletingItem` | `useAppData()` | Item passato al flusso di conferma eliminazione |
| `setDeletingItem` | `useAppData()` | Imposta il movimento da eliminare prima di aprire l'`AlertDialog` |
| `showDeleteDialog` | `useAppData()` | Controlla apertura/chiusura dell'`AlertDialog` di conferma |
| `setShowDeleteDialog` | `useAppData()` | Apre il dialog al click sui pulsanti "Elimina" |
| `isMobile` | `useIsMobile()` | Adatta dimensioni icone e badge scorciatoie |

### 3.1 Dati che il componente NON usa direttamente

Il componente non usa: `totalBalance`, `groupedAccounts`, `filteredGroupedAccounts`, `budgetAlerts`, `recentTransactions`, `activeTab`, `setActiveTab`, `handleSaveTransaction`, `toggleCategoryVisibility`, `chartPeriod`. Questi rimangono di competenza degli altri tab o di `App.tsx`.

---

## 4. Gestione degli stati dialog

### Il problema

Quattro variabili di stato sono ancora locali in `App.tsx`:

| Stato | Tipo | Uso attuale |
|---|---|---|
| `editingTransaction` | `Transaction \| undefined` | Movimento in modifica (o `undefined` per nuovo) |
| `showTransactionDialog` | `boolean` | Apre/chiude `TransactionDialog` |
| `deletingItem` | `{ type: ..., id: string } \| null` | Item da eliminare (shared: usato da Dashboard, Transactions, Reports) |
| `showDeleteDialog` | `boolean` | Apre/chiude `AlertDialog` di conferma (shared) |

Questi stati sono **condivisi tra più tab**: `editingTransaction`/`showTransactionDialog` sono usati anche dalla Dashboard (movimenti recenti, pulsante "Nuovo Movimento" in header), e `deletingItem`/`showDeleteDialog` sono usati anche dal tab Reports (eliminazione budget e obiettivi). Non possono quindi essere stati locali di `TransactionsTab`.

### Opzione A — Aggiunta ad `AppDataContext` (scelta per questo passo)

I quattro stati vengono aggiunti come `useState` dentro `AppDataProvider` ed esposti nel valore del context.

**Perché questa scelta**:

1. **Nessun componente nuovo**: non è necessario creare un `UIContext` separato in questo passo. Il perimetro rimane minimo e invertibile.
2. **Autonomia completa del componente**: `TransactionsTab` non riceve nessuna prop; legge tutto dal context. Questo è il prerequisito per i passi successivi di estrazione degli altri tab.
3. **Coerenza con il piano**: il piano di refactoring prevede la creazione di un `UIContext` in una fase successiva (quando verranno estratti anche `DashboardTab` e `DialogsOverlay`). L'aggiunta temporanea ad `AppDataContext` è un interim esplicito, documentato, da rimuovere al momento della creazione del `UIContext`.

**Trade-off dichiarato**: `AppDataContext` acquisisce temporaneamente responsabilità di UI state che non gli appartengono per natura. Questo è accettabile per un passo intermedio; diventerà un debito tecnico da estinguere nel passo che creerà il `UIContext`.

### Opzione B — Props da `App.tsx` (scartata)

Passare i quattro stati come props a `TransactionsTab` creerebbe un accoppiamento esplicito tra `App.tsx` e il componente estratto, contraddicendo l'obiettivo del refactoring. Questa opzione viene scartata.

### Modifiche ad `AppDataContext`

Aggiungere in `AppDataContextValue`:

```ts
// Dialog transaction
editingTransaction: Transaction | undefined
setEditingTransaction: (t: Transaction | undefined) => void
showTransactionDialog: boolean
setShowTransactionDialog: (v: boolean) => void

// Dialog delete (shared tra tutti i tab)
deletingItem: { type: 'account' | 'transaction' | 'budget' | 'savingsGoal'; id: string } | null
setDeletingItem: (item: { type: 'account' | 'transaction' | 'budget' | 'savingsGoal'; id: string } | null) => void
showDeleteDialog: boolean
setShowDeleteDialog: (v: boolean) => void
```

Aggiungere nel corpo di `AppDataProvider` (prima degli handler CRUD):

```ts
const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)
const [showTransactionDialog, setShowTransactionDialog] = useState(false)
const [deletingItem, setDeletingItem] = useState<{ type: 'account' | 'transaction' | 'budget' | 'savingsGoal'; id: string } | null>(null)
const [showDeleteDialog, setShowDeleteDialog] = useState(false)
```

`handleDeleteConfirm` in `AppDataContext` — che attualmente accetta `item` come parametro — deve essere aggiornata per leggere `deletingItem` dallo stato interno e non richiedere più il parametro esterno. Questo semplifica la firma e allinea il comportamento a quello del codice originale di `App.tsx`.

---

## 5. Navigazione da tastiera nelle liste

### Spostamento di `allTransactionsNav`

L'istanza `allTransactionsNav = useListNavigation(...)` è attualmente in `App.tsx` ma appartiene semanticamente al tab Movimenti. Va spostata **dentro `TransactionsTab.tsx`**, dove viene sia inizializzata che usata.

### Inizializzazione nel nuovo componente

```ts
// src/components/TransactionsTab.tsx (frammento)

const { visibleTransactions, visibleAccounts, safeCategories } = useVisibleData()
const { setEditingTransaction, setShowTransactionDialog, setDeletingItem, setShowDeleteDialog } = useAppData()

const allTransactionsNav = useListNavigation({
  itemCount: visibleTransactions.length,
  enabled: true,  // sempre abilitato: questo componente è montato solo quando il tab è attivo
  onEnter: (index) => {
    const transaction = visibleTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  },
  onDelete: (index) => {
    const transaction = visibleTransactions[index]
    if (transaction) {
      setDeletingItem({ type: 'transaction', id: transaction.id })
      setShowDeleteDialog(true)
    }
  },
  onEdit: (index) => {
    const transaction = visibleTransactions[index]
    if (transaction) {
      setEditingTransaction(transaction)
      setShowTransactionDialog(true)
    }
  }
})
```

### Nota critica sulla coerenza indice/ordine

Nella versione corrente di `App.tsx`, i callback di `allTransactionsNav` ricalcolano ogni volta un array ordinato con `.sort(...)` localmente. Nel nuovo componente questo **non va replicato**: `visibleTransactions` da `useVisibleData()` è già ordinato per data decrescente. L'indice `index` passato da `useListNavigation` deve corrispondere all'indice nell'array `visibleTransactions` così com'è, senza re-sort intermedi. Il render del componente usa lo stesso array non-riodinato, quindi la corrispondenza è garantita.

---

## 6. Rischi e avvertenze

### R1 — Rimozione del sorting inline nel JSX

Nel JSX corrente di App.tsx, la lista viene renderizzata con:

```js
{[...visibleTransactions]
  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  .map((transaction, index) => { ... })}
```

Questo sort **va rimosso** nel nuovo componente. `useVisibleData()` restituisce già `visibleTransactions` ordinato per data decrescente. Lasciare un secondo sort causerebbe ordinamento ridondante senza errori visibili, ma creerebbe incoerenza latente se in futuro `useVisibleData` cambiasse il criterio di ordinamento.

**Verifica**: controllare che `use-visible-data.ts` applichi effettivamente il sort prima di eliminare quello inline. Se non lo fa, il sort va spostato lì, non mantenuto nel componente.

### R2 — Verifica setter esposti prima di scrivere codice

Prima di implementare `TransactionsTab`, verificare che AppDataContext esponga tutti e quattro gli stati dialog (Sezione 4). Se `handleDeleteConfirm` nell'AppDataContext riceve ancora `item` come parametro, va aggiornata contestualmente.

### R3 — `showDeleteDialog` è shared tra tutti i tab

Lo stato `showDeleteDialog`/`deletingItem` viene usato anche da DashboardTab (movimenti recenti) e ReportsTab (budget, obiettivi risparmio). La loro aggiunta ad `AppDataContext` in questo passo non è solo per `TransactionsTab`: risolve il caso generale. Di conseguenza, quando verranno estratti gli altri tab, questi due stati saranno già disponibili.

### R4 — Bug pre-esistente su salvataggio movimenti

Il salvataggio di movimenti (`handleSaveTransaction`) era già non funzionante prima del refactoring. Questo passo **non deve toccare** `handleSaveTransaction` né investigare o correggere tale comportamento. La regressione è pre-esistente e va gestita in un issue separato.

### R5 — `enabled` flag in `useListNavigation`

Nell'App.tsx originale, `allTransactionsNav` usa `enabled: isAuthenticated && activeTab === 'transactions'`. Nel nuovo componente, poiché il componente viene renderizzato solo quando il tab è attivo (dentro `TabsContent value="transactions"`), la condizione `activeTab === 'transactions'` è implicita. Tuttavia `isAuthenticated` rimane rilevante: verificare se `useListNavigation` gestisce autonomamente il caso non-autenticato oppure se il guard va mantenuto esplicitamente.

---

## 7. Criteri di verifica (definition of done)

| # | Scenario | Risultato atteso |
|---|---|---|
| 1 | Aprire il tab Movimenti | Tutti i movimenti vengono visualizzati in ordine cronologico decrescente |
| 2 | Cliccare "Nuovo Movimento" | Si apre `TransactionDialog` in modalità creazione (form vuoto) |
| 3 | Cliccare il pulsante modifica su un movimento | Si apre `TransactionDialog` precompilato con i dati del movimento |
| 4 | Cliccare il pulsante elimina su un movimento | Si apre l'`AlertDialog` di conferma con il movimento corretto |
| 5 | Confermare eliminazione | Il movimento viene rimosso dalla lista |
| 6 | Premere ↑/↓ sulla lista | Il focus si sposta tra le righe con highlight visivo corretto |
| 7 | Premere Enter o E su un movimento focalizzato | Si apre `TransactionDialog` sul movimento corretto |
| 8 | Premere Del su un movimento focalizzato | Si apre l'`AlertDialog` sul movimento corretto |
| 9 | Cliccare "Esporta CSV" | Viene scaricato il file CSV con tutti i movimenti visibili |
| 10 | Usare Ctrl+E | Viene scaricato il file CSV (shortcut rimane funzionante) |
| 11 | Usare Ctrl+N da qualsiasi tab | Si apre `TransactionDialog` in creazione (shortcut globale) |
| 12 | Navigare al tab Dashboard e tornare ai Movimenti | La lista non si resetta; nessuna regressione visiva |
| 13 | Aprire/chiudere il tab Reports | Nessuna regressione nelle cards budget, obiettivi e impostazioni |
| 14 | Test con screen reader | Il tab annuncia il conteggio movimenti al cambio tab; i pulsanti modifica/elimina hanno `aria-label` corretti |
