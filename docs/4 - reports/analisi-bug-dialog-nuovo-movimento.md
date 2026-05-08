# Analisi bug — Dialog movimento cambia da "Nuovo" a "Modifica"

> **Tipo:** Analisi statica read-only
> **Branch:** `refactoring-architettura`
> **Data:** 2026-05-07
> **Scope:** flusso di apertura/chiusura `TransactionDialog` e gestione di `editingTransaction`
> **Sintomo riportato:** aprendo il dialog "Nuovo Movimento", al primo tocco sul Select del conto **o** sul Select della categoria il titolo diventa "Modifica Movimento" e il pulsante "Salva Modifiche". Il successivo salvataggio sovrascrive una transazione esistente invece di crearne una nuova.

---

## 1. Mappa del flusso completo (apertura → rendering)

### 1.1 Stato sorgente

Lo stato `editingTransaction` (di tipo `Transaction | undefined`) è **unico** per tutta l'app ed è dichiarato nel context globale:

- [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L75-L76) — interfaccia `AppDataContextValue`
- [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L152) — `useState<Transaction | undefined>(undefined)`
- [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L677-L678) — esposto nel value del provider

### 1.2 Entry point per "Nuovo Movimento"

Tutti i punti che dovrebbero aprire il dialog **in modalità nuovo** chiamano esplicitamente `setEditingTransaction(undefined)` *prima* di `setShowTransactionDialog(true)`:

| File | Linea | Trigger UI |
|------|-------|------------|
| [src/components/DashboardTab.tsx](src/components/DashboardTab.tsx#L114-L121) | 114-121 | Bottone "Movimento" nella dashboard |
| [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L84) | 84 | Bottone "Nuovo Movimento" tab transazioni |
| [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L108) | 108 | Bottone empty-state |
| [src/hooks/use-app-shortcuts.ts](src/hooks/use-app-shortcuts.ts#L140-L148) | 140-148 | Shortcut `Ctrl+M` (descritta come Ctrl+N nei tooltip) |

### 1.3 Entry point per "Modifica Movimento"

Tutti i punti che aprono il dialog in modalità modifica chiamano `setEditingTransaction(transaction)` con un oggetto valorizzato:

| File | Linea | Trigger UI |
|------|-------|------------|
| [src/components/DashboardTab.tsx](src/components/DashboardTab.tsx#L73-L78) | 73-78 | `onEnterRecent` (tasto Invio su lista recenti) |
| [src/components/DashboardTab.tsx](src/components/DashboardTab.tsx#L89-L94) | 89-94 | `onEditRecent` (tasto E su lista recenti) |
| [src/components/DashboardTab.tsx](src/components/DashboardTab.tsx#L393-L400) | 393-400 | Icona PencilSimple su singola riga recente |
| [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L35-L40) | 35-40 | `onEnterTransactions` (Invio) |
| [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L51-L56) | 51-56 | `onEditTransactions` (tasto E) |
| [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L182-L191) | 182-191 | Icona PencilSimple su riga transazione |

### 1.4 Reset dello stato in chiusura

Il dialog è renderizzato in [src/components/DialogsOverlay.tsx](src/components/DialogsOverlay.tsx#L100-L107):

```tsx
<TransactionDialog
  open={showTransactionDialog}
  onClose={() => { setShowTransactionDialog(false); setEditingTransaction(undefined) }}
  onSave={async (transaction) => {await handleSaveTransaction(transaction); setEditingTransaction(undefined) }}
  transaction={editingTransaction}
  accounts={visibleAccounts}
  categories={safeCategories}
/>
```

`onClose` azzera `editingTransaction`. `onSave` lo azzera **dopo** che `handleSaveTransaction` ha completato.

### 1.5 Discriminante della modalità nel dialog

In [src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx) la modalità è derivata **esclusivamente** dalla presenza della prop `transaction`:

- [src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx#L207-L215) — `DialogTitle`/`DialogDescription`:
  ```tsx
  {transaction ? 'Modifica Movimento' : 'Nuovo Movimento'}
  ```
- [src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx#L460-L463) — bottone submit:
  ```tsx
  {transaction ? 'Salva Modifiche' : 'Aggiungi Movimento'}
  ```
- [src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx#L168-L181) — payload submit:
  ```tsx
  const newTransaction: TransactionInput = {
    ...(transaction?.id ? { id: transaction.id } : {}),
    ...
  }
  ```

Quindi il sintomo "il titolo diventa Modifica" implica **una transizione `undefined` → `Transaction` della prop `transaction`**, ossia di `editingTransaction` nel context, mentre il dialog è aperto.

---

## 2. Anomalie e zone fragili individuate

### 2.1 Nessun callsite di `setEditingTransaction(<truthy>)` è raggiungibile dal corpo del dialog

Ricerca esaustiva (`setEditingTransaction(`) in `src/`: **nessun** chiamante è dentro `TransactionDialog.tsx`, dentro un Select Radix o dentro un effetto che dipenda da `contoId`/`categoriaId`. I soli chiamanti che assegnano un `Transaction` truthy sono i 6 elencati al §1.3 (tutti azionati da liste in `DashboardTab`/`TransactionsTab`, **fuori** dal dialog).

**Implicazione:** la transizione di mode che si osserva non corrisponde a un percorso evidente in lettura statica. Servono uno o più dei seguenti meccanismi:

1. una callback delle liste (§1.3) che si attiva mentre il dialog è aperto;
2. uno stato già "sporco" prima dell'apertura (`editingTransaction` non azzerato);
3. un side effect di Radix Select che propaga eventi tastiera/click ai container delle liste sottostanti.

Le sezioni 2.2-2.6 dettagliano i punti che rendono possibili questi scenari.

### 2.2 Guardia "modal aperta" basata su query DOM, fragile rispetto ai Portal Radix

[src/hooks/use-list-navigation.ts](src/hooks/use-list-navigation.ts#L27-L29):

```ts
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (document.querySelector('[data-state="open"][aria-modal="true"]')) return
  if (!enabled || itemCount === 0) return
```

L'hook è registrato dalle liste in `DashboardTab` e `TransactionsTab` ([src/components/DashboardTab.tsx](src/components/DashboardTab.tsx#L96-L103), [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L58-L65)) ed espone callback `onEnter`/`onEdit`/`onDelete` che chiamano `setEditingTransaction(transaction)` (§1.3).

Problemi:

- la guardia controlla **solo** la presenza di `[data-state="open"][aria-modal="true"]` nel DOM. Non distingue chi ha emesso l'evento;
- l'event listener è agganciato a `containerRef?.current || document` ([src/hooks/use-list-navigation.ts](src/hooks/use-list-navigation.ts#L62-L67)). Il container è la lista; quindi normalmente gli eventi del Portal Radix Select (renderizzato sotto `<body>`) non lo raggiungono;
- però se il Portal del Select Radix viene montato come figlio di `document` e Radix usa **`event.preventDefault`/`stopPropagation`** in modo non uniforme su tasti come Invio o `e`/`E`, si può creare una situazione in cui l'evento — pur intercettato dalla guardia — non blocca tutti i listener;
- più rilevante: la guardia **non protegge dall'esecuzione differita**. `setFocusedIndex` può essere stato impostato prima dell'apertura del dialog (riga `onClick={() => recentTransactionsNav.setFocusedIndex(index)}` in [src/components/DashboardTab.tsx](src/components/DashboardTab.tsx#L358-L364) e [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L132-L141)). Se l'utente, prima di aprire "Nuovo Movimento", ha cliccato una riga della lista, `focusedIndex >= 0` rimane finché la lista esiste.

Conclusione: il bug è **compatibile** con un trigger keystroke che attraversa la guardia. Il punto esatto di rottura non è dimostrabile staticamente; va verificato a runtime registrando in `handleKeyDown` quando viene chiamato a dialog aperto e con quale tasto.

### 2.3 `setEditingTransaction` **non** viene azzerato all'unmount delle liste o al cambio tab

Non esiste alcun `useEffect` cleanup che resetti `editingTransaction` o `focusedIndex` quando l'utente cambia tab o quando il context si re-inizializza. L'unico reset documentato è in `onClose` del dialog (§1.4) e nei singoli bottoni "Nuovo Movimento" (§1.2).

Se per qualunque motivo `editingTransaction` rimane valorizzato (es. errore in `handleSaveTransaction` che fa terminare la promise prima del `setEditingTransaction(undefined)` in `onSave`, oppure chiusura per cambio rotta), il successivo "Nuovo Movimento" ripulisce sì lo stato — ma il render iniziale del dialog potrebbe avvenire con la prop ancora valorizzata se la sequenza di `set*` non viene batchata come atteso.

Punto di interesse: in [src/components/DialogsOverlay.tsx](src/components/DialogsOverlay.tsx#L102-L103) la versione attiva di `onSave` è async; il `setEditingTransaction(undefined)` finale è raggiunto **solo se** `handleSaveTransaction` non lancia. La versione sincrona commentata sopra (riga 102) non aveva questo problema:

```tsx
//onSave={(transaction) => { handleSaveTransaction(transaction); setEditingTransaction(undefined) }}
onSave={async (transaction) => {await handleSaveTransaction(transaction); setEditingTransaction(undefined) }}
```

### 2.4 `useEffect` di reset nel dialog dipende da `transaction` e `resetForm`

[src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx#L70-L80):

```tsx
useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    const dialogTitle = transaction ? 'Modifica Movimento' : 'Nuovo Movimento'
    announceDialogOpen(dialogTitle)
    if (!transaction) {
      resetForm()
      const timer = setTimeout(() => amountInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }
}, [open, transaction, announceDialogOpen, resetForm])
```

Punti critici:

- l'effetto **non azzera** lo stato locale se `transaction` passa da truthy a undefined a dialog aperto, e **non** ricostruisce lo stato se la prop diventa truthy a dialog aperto. La modalità visiva cambia ma i campi locali (importo, descrizione, conti) **non** si allineano alla `Transaction`. Se la transizione mode viene innescata da un setEditingTransaction esterno mentre il dialog è già aperto, l'utente vede il titolo "Modifica" ma con i dati che ha già digitato → al submit, l'`id` viene incluso ([TransactionDialog.tsx#L168-L181](src/components/TransactionDialog.tsx#L168-L181)) e **sovrascrive** la transazione il cui id è arrivato dal context. **Coerente al 100% con il sintomo riportato.**
- `resetForm` è `useCallback` su `[accounts, categories]` ([src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx#L57-L68)). `accounts`/`categories` sono memoizzati a monte (`useVisibleData` + `safeCategories`), quindi normalmente la dipendenza è stabile e non causa re-fire.

### 2.5 Stato locale del dialog inizializzato **solo** al mount

[src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx#L37-L51):

```tsx
const [tipo, setTipo] = useState<TransactionType>(transaction?.tipo || 'uscita')
const [data, setData] = useState(transaction?.data || new Date().toISOString().split('T')[0])
const [importo, setImporto] = useState(transaction?.importo.toString() || '')
const [contoId, setContoId] = useState(transaction?.contoId || '')
const [contoDestinazioneId, setContoDestinazioneId] = useState(transaction?.contoDestinazioneId || '')
const [categoriaId, setCategoriaId] = useState(transaction?.categoriaId || '')
const [descrizione, setDescrizione] = useState(transaction?.descrizione || '')
const [ricorrente, setRicorrente] = useState(transaction?.ricorrente || false)
const [frequenzaRicorrenza, setFrequenzaRicorrenza] = useState<RecurrenceFrequency | ''>(
  transaction?.frequenzaRicorrenza || ''
)
```

`useState(initialValue)` legge l'initial value **solo al primo render**. Il dialog però resta montato per tutta la sessione (cambia solo `open`), quindi questi initial value sono inutili dopo il primo ciclo. La sincronizzazione effettiva dipende interamente dall'`useEffect` del §2.4 e da `resetForm` (che però **non** copia `transaction.*` sui campi: imposta solo i default per "Nuovo Movimento").

**Conseguenza:** non esiste in tutto il file un effetto che, al cambio della prop `transaction`, **popoli** i campi con i valori della transazione ricevuta. Quando si entra in modalità modifica via lista, la UI mostra "Modifica Movimento" perché il render lo deduce dalla prop, ma i campi sono quelli del precedente stato (o resettati a default se l'`useEffect` ha appena girato con `!transaction`). È una incongruenza strutturale del dialog che amplifica gli effetti del bug.

### 2.6 `handleClose` non azzera lo stato locale quando `transaction` è truthy

[src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx#L184-L190):

```tsx
const handleClose = () => {
  soundSystem.play('dialog-close')
  if (!transaction) {
    resetForm()
  }
  onClose()
}
```

Se durante una sessione il dialog viene chiuso con `transaction` truthy (modalità modifica), lo stato locale **rimane sporco**. Quando l'utente riapre per "Nuovo Movimento", `transaction` è undefined, l'`useEffect` esegue `resetForm` → i campi tornano ai default. Ma c'è un caso patologico: se per qualunque ragione `editingTransaction` viene **rivalorizzato** subito dopo (mentre il dialog è già aperto), la `transaction` prop diventa truthy senza che alcun effetto reidrati i campi: l'utente vede "Modifica Movimento" sui campi che stava compilando come "Nuovo".

### 2.7 `JSX` malformato in TransactionsTab (effetto collaterale evidente)

[src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L107-L113):

```tsx
//<Button onClick={() => setShowTransactionDialog(true)} className="gap-2">
<Button onClick={() => { setEditingTransaction(undefined); setShowTransactionDialog(true) }} className="gap-2"></Button>
  <Plus size={18} weight="bold" />
  Aggiungi Movimento
</Button>
```

Il `<Button .../>` è auto-chiuso e seguito da un secondo `</Button>` orfano: l'icona e il testo sono fuori dal pulsante. Non è la causa diretta del bug oggetto dell'analisi (è solo nello stato vuoto), ma è un'anomalia da correggere nel medesimo intervento.

### 2.8 `handleSaveTransaction` contiene `console.log` di debug

[src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L478-L490): la riga 481 `console.log(...) //riga aggiunta da me` è codice di debug che conferma che l'utente sta già investigando lo stesso sintomo.

```ts
console.log('handleSaveTransaction chiamato con id:', transaction.id, '| existing trovato:', !!transactions.find(t => t.id === transaction.id))
```

Va rimosso o ricondotto al sistema di logging.

---

## 3. Punto esatto di rottura

La condizione necessaria e sufficiente per il sintomo è:

> `editingTransaction` nel context passa da `undefined` a una `Transaction` truthy **mentre `showTransactionDialog === true`**, senza che alcun handler interno al dialog rifletta il cambio sui campi.

Dalla mappa al §1, l'**unica** superficie capace di chiamare `setEditingTransaction(<truthy>)` mentre il dialog è aperto è il blocco di callback delle liste navigabili (§1.3) — `onEnterRecent`/`onEditRecent`/`onEnterTransactions`/`onEditTransactions` — registrate via `useListNavigation` ([src/hooks/use-list-navigation.ts](src/hooks/use-list-navigation.ts#L27-L67)).

La protezione contro l'attivazione a dialog aperto è la singola riga:

[src/hooks/use-list-navigation.ts](src/hooks/use-list-navigation.ts#L29):

```ts
if (document.querySelector('[data-state="open"][aria-modal="true"]')) return
```

Questa è l'unica barriera tra l'interazione utente con il Radix Select interno al dialog e una chiamata a `setEditingTransaction(transactionDellaListaSottostante)`. Poiché:

- la guardia interroga il DOM solo all'inizio dell'handler;
- `focusedIndex` può essere stato impostato prima dell'apertura del dialog (resta valido);
- le callback `onEnter`/`onEdit` chiamano `setEditingTransaction(transactionsList[focusedIndex])` **e** `setShowTransactionDialog(true)` (no-op se già `true`);
- Radix Select gestisce internamente Invio, Spazio e tasti alfa per la selezione: i tasti possono propagarsi al `document` se Radix non li chiude prima del bubble verso i listener di `document`.

→ **Il flusso si rompe nel momento in cui un evento tastiera (es. Invio sul SelectItem aperto) attraversa il listener di `useListNavigation` con `focusedIndex >= 0`, fa fallire la guardia di riga 29 (timing/race) e invoca `callbacksRef.current.onEnter?.(focusedIndex)` → `setEditingTransaction(recentTransactions[focusedIndex])`.**

Con il dialog già aperto, `setShowTransactionDialog(true)` è no-op; ma `setEditingTransaction` ridipinge il dialog con la nuova prop, che fa apparire "Modifica Movimento". Lo stato locale dei campi resta quello che l'utente stava compilando. Al submit, [TransactionDialog.tsx#L168](src/components/TransactionDialog.tsx#L168) include `id: transaction.id` nel payload e `handleSaveTransaction` esegue il branch di update ([AppDataContext.tsx#L483-L489](src/context/AppDataContext.tsx#L483-L489)).

Il sintomo descritto dall'utente (titolo cambia "toccando" il Select, ovvero quando l'utente seleziona o naviga un'opzione) è **completamente coerente** con questo scenario.

> Conferma operativa richiesta a runtime: aggiungere temporaneamente un `console.log('list-nav fired', e.key, focusedIndex)` come prima istruzione di `handleKeyDown` in [src/hooks/use-list-navigation.ts](src/hooks/use-list-navigation.ts#L27) e verificare che venga stampato durante l'interazione con i Select del dialog. La prova definitiva si chiude osservando lo stack dell'effetto di `setEditingTransaction`.

---

## 4. File da modificare per la risoluzione (ordine consigliato)

> Il presente report **non** propone soluzioni; l'elenco identifica solo i file che dovranno essere toccati per chiudere il bug, secondo l'analisi dei §1-3.

1. **[src/hooks/use-list-navigation.ts](src/hooks/use-list-navigation.ts)** — rendere robusta la disattivazione delle callback quando esiste un dialog modale aperto e/o quando il target dell'evento è dentro un Portal Radix; valutare un parametro esplicito `disabled` collegato a `showTransactionDialog`/`showAccountDialog`/etc.
2. **[src/components/DialogsOverlay.tsx](src/components/DialogsOverlay.tsx)** — garantire che `setEditingTransaction(undefined)` sia chiamato anche in caso di errore in `handleSaveTransaction` (riga 103) e considerare uno store ref-based per disattivare gli hook di navigazione lista quando un dialog è aperto.
3. **[src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx)** — aggiungere un `useEffect` di sincronizzazione dei campi locali al cambio della prop `transaction` mentre `open === true`, oppure forzare il remount del dialog usando una `key` derivata dall'identità della transazione/sessione (mitigazione dell'incongruenza descritta al §2.5 e §2.6).
4. **[src/context/AppDataContext.tsx](src/context/AppDataContext.tsx)** — rimuovere il `console.log` di debug (§2.8); valutare un'API atomica `openNewTransactionDialog()`/`openEditTransactionDialog(tx)` esposta dal context per evitare le coppie `setEditingTransaction + setShowTransactionDialog` distribuite in 7+ punti.
5. **[src/components/DashboardTab.tsx](src/components/DashboardTab.tsx)** — adottare l'API atomica del punto 4.
6. **[src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx)** — adottare l'API atomica del punto 4 e correggere il JSX malformato del bottone empty-state (§2.7).
7. **[src/hooks/use-app-shortcuts.ts](src/hooks/use-app-shortcuts.ts)** — adottare l'API atomica del punto 4 nel callback `Ctrl+M`.

---

## 5. Riepilogo

- Lo stato `editingTransaction` è la **sola** sorgente che decide la modalità del dialog.
- Tutti gli entry point per "Nuovo Movimento" lo azzerano correttamente prima di aprire il dialog.
- Nessun handler interno al dialog modifica `editingTransaction`.
- L'unica superficie che può alterarlo a dialog aperto sono le callback di `useListNavigation` registrate da `DashboardTab`/`TransactionsTab`, protette da una guardia DOM-based fragile ([use-list-navigation.ts#L29](src/hooks/use-list-navigation.ts#L29)).
- Il dialog non ha alcun meccanismo di sincronizzazione dei campi locali al cambio della prop `transaction`, quindi una transizione di mode a metà compilazione passa inosservata e il submit produce un update con l'id ricevuto.
- I file impattati per la fix sono 7, tutti elencati al §4.
