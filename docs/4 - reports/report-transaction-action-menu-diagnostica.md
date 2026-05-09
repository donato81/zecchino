# Report diagnostica — `TransactionActionMenu`

**Branch:** `refactoring-architettura`
**Data analisi:** 9 maggio 2026
**Agente:** Agent-Analyze (sola lettura)
**File esaminati:**
- [src/components/TransactionActionMenu.tsx](src/components/TransactionActionMenu.tsx)
- [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx)
- [src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx)
- [src/components/DialogsOverlay.tsx](src/components/DialogsOverlay.tsx)
- [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx)
- [src/hooks/use-app-shortcuts.ts](src/hooks/use-app-shortcuts.ts) (controllo collaterale)

---

## 1. Comportamento atteso delle voci del menu

Il menu azioni di ogni riga di movimento espone tre voci. Il flusso corretto, gia rispettato dalla voce **Apri dettaglio**, e il seguente:

1. L'utente porta il focus sul pulsante "tre puntini" (trigger del menu) tramite tab/quick-nav `B` di NVDA.
2. Apre il menu (Dropdown su desktop, Sheet su mobile). Lo stato `openMenuIndex` viene impostato all'indice della riga.
3. Seleziona una voce. La voce esegue, in sequenza:
   - chiusura del menu (`onOpenChange(false)` -> `setOpenMenuIndex(-1)` nel parent),
   - **ripristino del focus** sul pulsante trigger di partenza (`onFocusReturn()` -> `el?.focus()` sul nodo con `data-trigger-index="${index}"`),
   - esecuzione dell'azione vera e propria.
4. Quando l'azione apre un dialog modale, alla chiusura del dialog il focus deve tornare al pulsante trigger della riga di origine. Per **Apri dettaglio** non si apre alcun dialog: il toast viene mostrato e il focus resta correttamente sul trigger gia rifocalizzato dal passo 3.

| Voce | Azione attesa | Modello di riferimento |
|------|--------------|------------------------|
| Apri dettaglio | toast informativo, focus sul trigger della riga | flusso corretto attualmente in produzione (`handleDetail`, riga 47-51 di `TransactionActionMenu.tsx`) |
| Modifica | apertura `TransactionDialog` precompilato con la transazione della riga; alla chiusura focus torna al trigger | deve replicare il comportamento di "Apri dettaglio" sul ritorno del focus |
| Elimina | apertura `AlertDialog` di conferma con `deletingItem` impostato sulla transazione della riga; alla chiusura focus torna al trigger | come sopra |

---

## 2. Causa radice — Anomalia 1 (stato residuo dopo "Modifica")

### 2.1 Variabile candidata

La variabile che rappresenta "transazione correntemente in modifica" e:

- `editingTransaction: Transaction | undefined` definita in [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L154), gestita tramite `setEditingTransaction`.

E' l'unica variabile globale che lega il dialog di modifica a una specifica transazione. Insieme a `showTransactionDialog` (riga [155](src/context/AppDataContext.tsx#L155)) controlla apertura e contenuto del `TransactionDialog`.

### 2.2 Percorsi di reset esaminati

Tutti i percorsi di chiusura del `TransactionDialog` montati in [src/components/DialogsOverlay.tsx](src/components/DialogsOverlay.tsx#L99-L106) richiamano `setEditingTransaction(undefined)`:

- `onClose={() => { setShowTransactionDialog(false); setEditingTransaction(undefined) }}` ([DialogsOverlay.tsx#L101](src/components/DialogsOverlay.tsx#L101))
- `onSave={async (transaction) => { try { await handleSaveTransaction(transaction) } finally { setEditingTransaction(undefined) } }}` ([DialogsOverlay.tsx#L102](src/components/DialogsOverlay.tsx#L102))

`onClose` e invocato da [TransactionDialog.tsx#L201-L206](src/components/TransactionDialog.tsx#L201-L206) (`handleClose`) sia dopo `onSave`, sia dal bottone "Annulla", sia dall'overlay close di Radix (`<Dialog ... onOpenChange={(isOpen) => !isOpen && handleClose()}>` a [riga 215](src/components/TransactionDialog.tsx#L215)) che intercetta ESC e click fuori.

**Sul piano statico** non e quindi presente un percorso di chiusura del `TransactionDialog` in cui `editingTransaction` rimanga valorizzata.

### 2.3 Logica di selezione dell'azione nel menu

Le callback `onEdit` e `onDelete` passate al `TransactionActionMenu` da [TransactionsTab.tsx#L168-L176](src/components/TransactionsTab.tsx#L168-L176) sono closure inline create dentro la `.map` su `sortedTransactions`. Catturano direttamente la `transaction` della riga corrente:

```
onEdit={() => openEditTransactionDialog(transaction)}
onDelete={() => {
  setDeletingItem({ type: 'transaction', id: transaction.id })
  setShowDeleteDialog(true)
}}
```

`handleEdit` e `handleDelete` di `TransactionActionMenu` ([righe 53-63](src/components/TransactionActionMenu.tsx#L53-L63)) eseguono in modo distinto e mutuamente esclusivo `onEdit()` e `onDelete()`. Non c'e ramo condizionale che legge `editingTransaction` per decidere quale azione invocare.

### 2.4 Conclusione sull'Anomalia 1

**Sulla base della sola lettura statica, l'anomalia 1 non e riproducibile**: nessuna combinazione visibile di stato fa si che il click su "Elimina" finisca per invocare `openEditTransactionDialog`. Le ipotesi residue da verificare runtime (con devtools React + breakpoint) sono, in ordine di probabilita:

1. **Listener globale fantasma**: una scorciatoia `useAppShortcuts` o un handler residuo che, alla chiusura del `TransactionDialog`, riemette `setShowTransactionDialog(true)`. La grep su `setShowTransactionDialog\(` non mostra altri call site oltre a quelli gia tracciati, ma va verificato che `handleSaveTransaction` non rilanci accidentalmente l'apertura.
2. **Composizione `<SheetClose asChild>` su mobile**: in [TransactionActionMenu.tsx#L88-L114](src/components/TransactionActionMenu.tsx#L88-L114) ogni voce e wrappata in `<SheetClose asChild>`. Bisogna confermare runtime che la composizione di `onClick` (Radix close + handler utente) non riemetta l'`onClick` della prima voce iterata. Anomalia plausibile solo su mobile.
3. **Stato React stale**: doppio invio di `onOpenChange` (vedi sezione 3.3) potrebbe causare riconciliazioni che ri-eseguono la callback iniziale. Non dimostrabile staticamente.

**Azione richiesta**: prima di intervenire sul codice, riprodurre il bug con React DevTools attivo, registrare quale callback effettivamente esegue (breakpoint su `openEditTransactionDialog`) e quale stack la chiama. Senza questa traccia la causa root non e identificabile da analisi statica.

---

## 3. Causa radice — Anomalia 2 (perdita focus dopo Modifica/Elimina)

### 3.1 Come "Apri dettaglio" gestisce il ritorno del focus

In [TransactionActionMenu.tsx#L47-L51](src/components/TransactionActionMenu.tsx#L47-L51):

```
const handleDetail = () => {
  onOpenChange(false)
  toast.info('Funzionalita in arrivo')
  onFocusReturn()
}
```

`onFocusReturn` e fornita dal parent in [TransactionsTab.tsx#L177-L182](src/components/TransactionsTab.tsx#L177-L182):

```
onFocusReturn={() => {
  const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
    `[data-trigger-index="${index}"]`
  )
  el?.focus()
}}
```

Il pulsante trigger ha `data-trigger-index={triggerIndex}` ([TransactionActionMenu.tsx#L66-L75](src/components/TransactionActionMenu.tsx#L66-L75)). Il meccanismo funziona perche `handleDetail` non apre alcun dialog: la chiamata `el?.focus()` riporta il focus sul trigger e nessun componente successivo lo ruba.

### 3.2 Cosa fanno "Modifica" ed "Elimina"

In [TransactionActionMenu.tsx#L53-L63](src/components/TransactionActionMenu.tsx#L53-L63):

```
const handleEdit = () => {
  onOpenChange(false)
  onFocusReturn()
  onEdit()       // -> openEditTransactionDialog(transaction)
}

const handleDelete = () => {
  onOpenChange(false)
  onFocusReturn()
  onDelete()     // -> setDeletingItem + setShowDeleteDialog(true)
}
```

Differenza chiave rispetto a `handleDetail`: dopo `onFocusReturn()` viene aperto un dialog modale (`TransactionDialog` o `AlertDialog` di conferma). Radix Dialog/AlertDialog, all'apertura, registra l'`activeElement` corrente come "elemento da rifocalizzare" alla chiusura. In linea teorica `el?.focus()` posto subito prima di `onEdit()/onDelete()` dovrebbe rendere il trigger l'elemento attivo, ma:

- L'apertura del dialog avviene in maniera asincrona rispetto all'aggiornamento di `openMenuIndex` -> `-1`. Quando lo `Sheet`/`DropdownMenu` si chiude, Radix esegue **`onCloseAutoFocus`** che riposta il focus sul trigger ufficiale del menu dopo `onFocusReturn()`. Sulla mappa di esecuzione finale potrebbe quindi rimanere attivo un elemento diverso da quello previsto al momento del mount del dialog.
- Su mobile, il `Sheet` smonta il contenuto e la sequenza di focus e ulteriormente perturbata.
- Non viene mai salvato esplicitamente un riferimento `useRef<HTMLButtonElement>` al trigger di partenza per essere ripristinato da `onCloseAutoFocus` del dialog modale.

In **`handleDetail` il problema non si manifesta** perche non c'e dialog: `el?.focus()` e l'ultima operazione e nessuno la sovrascrive.

### 3.3 Riferimento al pulsante di partenza

Il pulsante trigger e individuato indirettamente tramite querySelector su `data-trigger-index`. Non viene salvato in nessun `useRef`. Nessuno passa un `onCloseAutoFocus` esplicito al `TransactionDialog` ne al `AlertDialog` di [DialogsOverlay.tsx#L121-L148](src/components/DialogsOverlay.tsx#L121-L148).

**Effetto collaterale aggravante**: in [TransactionsTab.tsx#L32-L40](src/components/TransactionsTab.tsx#L32-L40) esiste un `useEffect` di cleanup che fa:

```
const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
  `[data-list-item][data-index="${openMenuIndex}"]`
)
el?.focus()
```

Le righe del listing **non hanno gli attributi `data-list-item` ne `data-index`** (verificato via grep: gli unici nodi con `data-list-item` sono in [DashboardTab.tsx#L366](src/components/DashboardTab.tsx#L366) e nel `use-list-navigation.ts`). Il selettore restituisce sempre `null` -> codice morto, ma sintomo di un meccanismo di restore del focus pensato e mai completato.

Inoltre il `<DropdownMenuItem>` desktop ([righe 124-132](src/components/TransactionActionMenu.tsx#L124-L132)) **non passa `onSelect` ne `onCloseAutoFocus`**, quindi Radix fa partire il proprio `onCloseAutoFocus` (focus al trigger) prima che il dialog si monti -> ordine: trigger focus -> dialog si monta -> registra trigger come previousActiveElement -> alla chiusura del dialog dovrebbe tornare al trigger. Nei fatti l'utente riporta che non torna: **occorre investigazione runtime per capire perche** (sospetti: rerender della riga che smonta/rimonta il pulsante prima che il dialog catturi il riferimento, oppure interazione con `useListNavigation` che rimuove `tabIndex`/altera il DOM al cambio di `focusedIndex`).

### 3.4 Conclusione sull'Anomalia 2

La causa principale e **l'assenza di un meccanismo deterministico** che leghi il pulsante trigger a un `useRef` stabile e lo passi come `onCloseAutoFocus` al dialog modale. La sequenza attuale (`onOpenChange(false); onFocusReturn(); onEdit()`) si appoggia a un comportamento implicito di Radix Dialog che, in presenza di smontaggio rapido del menu e re-render della riga, non garantisce il ritorno corretto del focus. Per "Apri dettaglio" il problema non esiste perche non c'e modale che possa rubare/non restituire il focus.

---

## 4. Mappa delle modifiche necessarie (solo localizzazione)

### 4.1 Per Anomalia 1 (da confermare runtime)

| File | Riferimento | Cosa indagare |
|------|-------------|---------------|
| [src/components/TransactionActionMenu.tsx](src/components/TransactionActionMenu.tsx#L77-L116) | blocco mobile `Sheet` | comportamento di `<SheetClose asChild>` su tre voci consecutive con `onClick` distinti |
| [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L150-L183) | mappatura riga + props del menu | verificare che le closure inline `onEdit`/`onDelete` non vengano accidentalmente rimpiazzate da una sola istanza condivisa per via di una memoizzazione errata (al momento non risulta) |
| [src/components/DialogsOverlay.tsx](src/components/DialogsOverlay.tsx#L99-L106) | montaggio `TransactionDialog` | breakpoint su `setShowTransactionDialog(true)` per individuare lo stack reale che riapre il dialog quando l'utente preme "Elimina" |
| [src/hooks/use-app-shortcuts.ts](src/hooks/use-app-shortcuts.ts#L141) | `openNewTransactionDialog()` (Ctrl+N) | escludere che un keypress residuo (es. Enter su trigger gia rifocalizzato) propaghi a livello globale |

### 4.2 Per Anomalia 2

| File | Riferimento | Intervento richiesto |
|------|-------------|---------------------|
| [src/components/TransactionActionMenu.tsx](src/components/TransactionActionMenu.tsx#L53-L63) | `handleEdit` e `handleDelete` | l'ordine `onFocusReturn()` -> `onEdit()` non e sufficiente con dialog modali; serve un riferimento esplicito al trigger |
| [src/components/TransactionActionMenu.tsx](src/components/TransactionActionMenu.tsx#L66-L75) | `triggerButton` | il pulsante andrebbe esposto via `useRef`/`forwardRef` cosi che il parent possa passarlo al dialog come `onCloseAutoFocus` target |
| [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L150-L183) | mappa righe + callback `onFocusReturn` | salvare il trigger della riga attiva (es. `lastTriggerRef`) prima di invocare `openEditTransactionDialog` o `setShowDeleteDialog`, e renderlo accessibile al `DialogsOverlay` |
| [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L32-L40) | `useEffect` di cleanup | codice morto: il selettore `[data-list-item][data-index="..."]` non matcha alcuna riga; va rimosso o correttamente collegato a un attributo realmente presente (potenziale fonte di confusione futura) |
| [src/components/DialogsOverlay.tsx](src/components/DialogsOverlay.tsx#L99-L148) | `TransactionDialog` e `AlertDialog` | aggiungere `onCloseAutoFocus` (per Radix Dialog/AlertDialog) che restituisca il focus al trigger della riga sorgente (richiede riferimento condiviso, vedi sopra) |
| [src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx#L215-L216) | `<Dialog ... onOpenChange=...>` | verificare che eventuale `onCloseAutoFocus` introdotto a monte raggiunga effettivamente `<DialogContent>` |

---

## 5. Dipendenze, ordine di intervento e rischi di regressione

### 5.1 Indipendenza tra le anomalie

Le due anomalie sono **logicamente indipendenti**:

- Anomalia 1 riguarda lo stato dati (quale azione viene eseguita).
- Anomalia 2 riguarda la gestione DOM/focus (dove va il focus dopo l'azione).

Tuttavia, poiche entrambe hanno epicentro su `handleEdit`/`handleDelete` e sulla coppia `onFocusReturn`/`onEdit` di `TransactionActionMenu.tsx`, **e consigliato affrontare prima l'Anomalia 1** (capire perche viene eseguita la callback sbagliata) per evitare che la fix focus venga progettata su flussi che cambieranno comunque. Una refactor del menu fatto solo per la 2 rischierebbe di mascherare la 1.

### 5.2 Rischi di regressione

- **P17 — list navigation a11y**: l'hook `useListNavigation` e disabilitato finche `openMenuIndex >= 0` o `showTransactionDialog`. Toccare il timing di chiusura del menu, lo stato `openMenuIndex` o l'apertura del dialog puo riabilitare prematuramente la navigazione e generare flicker di focus tra trigger e dialog. Validare con NVDA che `Tab`/frecce nel listing non vengano riattivati prima del completamento del modal flow.
- **P37 — focus e annunci NVDA**: l'eventuale aggiunta di `useRef` al trigger e di `onCloseAutoFocus` ai dialog deve preservare gli annunci esistenti (titolo dialog, descrizione, conferme). Verificare che l'evento `focus` programmatico non scateni doppi annunci sul pulsante "tre puntini".
- Codice morto in [TransactionsTab.tsx#L32-L40](src/components/TransactionsTab.tsx#L32-L40): rimuoverlo non incide sul comportamento attuale ma evita che future modifiche lo riattivino in modo errato.
- `editingTransaction` reset condiviso ([DialogsOverlay.tsx#L101-L102](src/components/DialogsOverlay.tsx#L101-L102)): un'eventuale modifica per "non resettare immediatamente" (per qualunque ragione) re-introdurrebbe potenzialmente l'anomalia 1; mantenere reset sincrono in tutti i percorsi.

---

## 6. Limiti dell'analisi statica

- **Anomalia 1** non e riproducibile dalla sola lettura del codice. Le tre cause plausibili (listener fantasma, composizione SheetClose mobile, stale state) richiedono riproduzione runtime con React DevTools e breakpoint su `openEditTransactionDialog` / `setShowTransactionDialog`. Lo segnaliamo esplicitamente come richiesto dai vincoli del task.
- **Anomalia 2** e diagnosticabile staticamente quanto a meccanismo mancante (riferimento trigger + `onCloseAutoFocus`), ma la causa esatta del fallimento del fallback Radix richiede ispezione DOM in fase di apertura del dialog (per capire se il pulsante trigger e ancora montato e focusable nel momento in cui il dialog registra `previousActiveElement`).
