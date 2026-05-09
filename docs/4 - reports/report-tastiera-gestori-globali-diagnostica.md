# Report diagnostica — Gestori di tastiera globali e interferenze sul menu transazioni

**Branch:** `refactoring-architettura`
**Data analisi:** 9 maggio 2026
**Agente:** Agent-Analyze (sola lettura)
**Report di partenza:** [docs/4 - reports/report-transaction-action-menu-diagnostica.md](docs/4%20-%20reports/report-transaction-action-menu-diagnostica.md)
**File esaminati:**
- [src/hooks/use-app-shortcuts.ts](src/hooks/use-app-shortcuts.ts)
- [src/hooks/use-keyboard-shortcuts.ts](src/hooks/use-keyboard-shortcuts.ts)
- [src/hooks/use-list-navigation.ts](src/hooks/use-list-navigation.ts)
- [src/hooks/use-talkback.ts](src/hooks/use-talkback.ts) (controllo collaterale)
- [src/components/TransactionActionMenu.tsx](src/components/TransactionActionMenu.tsx)
- [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx)
- [src/components/DashboardTab.tsx](src/components/DashboardTab.tsx) (callsite alternativo `useListNavigation`)
- [src/components/DialogsOverlay.tsx](src/components/DialogsOverlay.tsx)
- [src/components/FocusIndicator.tsx](src/components/FocusIndicator.tsx)
- [src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx)
- [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx)

---

## 1. Mappa dei gestori di tastiera attivi

| # | File | Sorgente registrazione | Tasti ascoltati | Condizione di attivazione | Disattivazione su dialog modale | Scope |
|---|------|------------------------|-----------------|---------------------------|----------------------------------|-------|
| 1 | [src/hooks/use-keyboard-shortcuts.ts](src/hooks/use-keyboard-shortcuts.ts#L41) | `window.addEventListener('keydown', ...)` (riga 41) | dipende dal vettore `shortcuts` (vedi #2) | `enabled` (passato come arg, riga 12) | **NO**: nessun controllo su dialog aperti. Solo skip se `target` è `INPUT/TEXTAREA/contentEditable` (righe 29-37) | Globale (window) |
| 2 | [src/hooks/use-app-shortcuts.ts](src/hooks/use-app-shortcuts.ts) | invoca `useKeyboardShortcuts(shortcuts, isAuthenticated)` (riga 256) | `1`,`2`,`3`,`4`,`5` (no modifier); `Ctrl+A`, `Ctrl+M`, `Ctrl+B`, `Ctrl+D`, `Ctrl+T`, `Ctrl+R`, `Ctrl+E`, `Ctrl+U`; `Shift+?` | `isAuthenticated` | **NO** (eredita #1) | Globale |
| 3 | [src/hooks/use-list-navigation.ts](src/hooks/use-list-navigation.ts#L74) | `target.addEventListener('keydown', ...)` su `containerRef.current` o `document` (riga 73) | `ArrowDown`, `ArrowUp`, `Home`, `End`, `Enter`/`Space`, `Delete`, `e`/`E` (senza ctrl/meta) (righe 37-67) | `enabled && !disabled && itemCount>0` + early-return se esiste un `[data-state="open"][aria-modal="true"]` nel DOM (riga 33) | **Indiretta**: solo via `disabled` esplicito o via la presenza di un modale Radix nel DOM. **`showDeleteDialog` NON è incluso nel `disabled` né in `TransactionsTab` né in `DashboardTab`** (vedi sez. 3) | Locale al container; in pratica il container avvolge l'intera lista |
| 4 | [src/components/FocusIndicator.tsx](src/components/FocusIndicator.tsx#L77) | `window.addEventListener('keydown')` (riga 77) | `Tab`, frecce — solo per impostare `keyboardMode=true` | sempre montato | irrilevante (non scatena azioni) | Globale, read-only |
| 5 | [src/hooks/use-talkback.ts](src/hooks/use-talkback.ts#L156) | `window.addEventListener('keydown', handleSlowNavigation)` (riga 156) | `Tab` — solo telemetria sessionStorage | sempre attivo | irrilevante | Globale, read-only |
| 6 | [src/components/TransactionActionMenu.tsx](src/components/TransactionActionMenu.tsx) | nessun `onKeyDown`/`onKeyUp` proprio (verificato) | — | — | — | — |

### Dettaglio scorciatoie globali rilevanti per il bug

| Tasto | File / riga | Effetto |
|-------|-------------|---------|
| `Ctrl+M` | [use-app-shortcuts.ts#L138-L148](src/hooks/use-app-shortcuts.ts#L138-L148) | `openNewTransactionDialog()` → `setEditingTransaction(undefined); setShowTransactionDialog(true)` ([AppDataContext.tsx#L169-L172](src/context/AppDataContext.tsx#L169-L172)). **Apre il TransactionDialog in modalità "Nuovo".** |
| `Ctrl+E` | [use-app-shortcuts.ts#L207-L215](src/hooks/use-app-shortcuts.ts#L207-L215) | `handleExportCSV(...)` (solo se `activeTab === 'transactions'`). Non apre dialog. |
| `e`/`E` (senza modifier) | [use-list-navigation.ts#L64-L67](src/hooks/use-list-navigation.ts#L64-L67) | invoca `callbacksRef.current.onEdit?.(focusedIndex)`. **In `TransactionsTab` `onEdit` NON è passato** ([TransactionsTab.tsx#L67-L72](src/components/TransactionsTab.tsx#L67-L72)) → no-op. **In `DashboardTab` `onEdit` IS passato** e chiama `openEditTransactionDialog` ([DashboardTab.tsx#L88-L102](src/components/DashboardTab.tsx#L88-L102)). |
| `Enter`/`Space` su lista (focusedIndex>=0) | [use-list-navigation.ts#L55-L62](src/hooks/use-list-navigation.ts#L55-L62) | invoca `onMenu` o, in fallback, `onEnter`. In `TransactionsTab` nessuno dei due è passato → no-op. |
| `Delete` su lista (focusedIndex>=0) | [use-list-navigation.ts#L60-L63](src/hooks/use-list-navigation.ts#L60-L63) | invoca `onDelete`. In `TransactionsTab` non passato. In `DashboardTab` sì. |
| `1`-`5` | [use-app-shortcuts.ts#L48-L120](src/hooks/use-app-shortcuts.ts#L48-L120) | toggle filtri categorie su Dashboard. |

### Difetto della funzione di matching delle scorciatoie

In [use-keyboard-shortcuts.ts#L22-L24](src/hooks/use-keyboard-shortcuts.ts#L22-L24):

```ts
const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true
const altMatch  = shortcut.alt  ? event.altKey  : true
const shiftMatch = shortcut.shift ? event.shiftKey : true
```

Il ramo "non richiesto → `true`" implica che una scorciatoia **senza modifier** matcha anche se l'utente sta tenendo premuto Ctrl/Alt/Shift. E una scorciatoia con `ctrl: true` matcha anche con Ctrl+Shift+key, Ctrl+Alt+key, ecc. Questo è un effetto collaterale rilevante (vedi sez. 4, ipotesi).

---

## 2. Finestre temporali critiche — sequenza Modifica → Chiusura

Riferimenti a [TransactionActionMenu.tsx#L53-L63](src/components/TransactionActionMenu.tsx#L53-L63), [TransactionsTab.tsx#L160-L183](src/components/TransactionsTab.tsx#L160-L183), [DialogsOverlay.tsx#L99-L106](src/components/DialogsOverlay.tsx#L99-L106), [TransactionDialog.tsx#L201-L216](src/components/TransactionDialog.tsx#L201-L216).

| # | Stato logico | `useKeyboardShortcuts` (#1/#2) | `useListNavigation` (#3) | Note |
|---|--------------|-------------------------------|---------------------------|------|
| T0 | utente sul listing, focus su trigger "tre puntini" della riga K | ATTIVO (auth=true). Target=button → non è input → tasti registrati possono scattare | ATTIVO (`disabled = false`). `focusedIndex=-1` | `Ctrl+M`/`Ctrl+E` ecc. possono scattare |
| T1 | utente preme Enter sul trigger → DropdownMenu si apre, `setOpenMenuIndex(K)` | ATTIVO | **DISATTIVO** (`disabled = openMenuIndex>=0`) | inoltre Radix monta menu con `[data-state="open"]` |
| T2 | utente naviga e seleziona "Modifica" | ATTIVO | DISATTIVO | `handleEdit`: chiude menu, focus trigger, apre dialog |
| T3 | tra `setOpenMenuIndex(-1)` e `setShowTransactionDialog(true)` (stesso tick React, stato non ancora committato) | ATTIVO | momentaneamente `disabled = false` (entrambe le flag false) MA early-return per `[data-state="open"][aria-modal="true"]` se Radix DropdownMenu è ancora nel DOM | **finestra di pochi ms** prima del flush React |
| T4 | `TransactionDialog` montato e aperto | ATTIVO | `disabled = showTransactionDialog = true` | Dialog Radix ha `aria-modal="true"`. Anche se #3 fosse abilitato, l'early-return lo neutralizzerebbe |
| T5 | utente conferma/annulla/ESC → `onClose` → `setShowTransactionDialog(false); setEditingTransaction(undefined)` | ATTIVO | torna `disabled = false` | Radix Dialog esegue `onCloseAutoFocus` → focus torna al trigger |
| T6 | dialogo smontato, focus sul trigger riga K | ATTIVO | ATTIVO, `focusedIndex=-1` | qualsiasi keydown sulla pagina viene visto da #1 e da #3 |
| T7 | utente preme Enter sul trigger → riapre menu | ATTIVO | ATTIVO; `focusedIndex=-1` quindi Enter non innesca `onMenu` (e non c'è `onMenu` in TransactionsTab); **non c'è `e.preventDefault()`** quindi Enter raggiunge il button → menu si apre | ok |
| T8 | utente seleziona "Elimina" | ATTIVO | DISATTIVO | `handleDelete`: chiude menu, focus trigger, `setDeletingItem` + `setShowDeleteDialog(true)` |
| T9 | `AlertDialog` di conferma aperto | ATTIVO | `disabled = showTransactionDialog=false`. `showDeleteDialog` **non incluso** nel disabled. Early-return da `[data-state="open"][aria-modal="true"]` di AlertDialog dovrebbe bloccarlo, ma è una protezione DOM-based, non state-based |  |

### Punti di attenzione specifici

- **T0/T6/T7 sono finestre in cui il vettore globale è pienamente attivo** mentre il focus è su un button della lista (non un input). Qualunque tasto registrato scatta.
- **T9 e simili (`showDeleteDialog`)**: in `TransactionsTab` la prop `disabled` di `useListNavigation` è `showTransactionDialog || openMenuIndex >= 0` ([TransactionsTab.tsx#L70](src/components/TransactionsTab.tsx#L70)). **`showDeleteDialog` non è considerato.** Stessa lacuna in `DashboardTab` ([DashboardTab.tsx#L97](src/components/DashboardTab.tsx#L97)).
- **#3 nel mounted-Sheet mobile**: il `Sheet` Radix viene smontato/montato; finché è montato, l'early-return su `[data-state="open"][aria-modal="true"]` blocca il listener — purché il Sheet abbia `aria-modal="true"` (verifica runtime consigliata).

---

## 3. Sovrapposizioni sospette

| # | Tasto | Gestori in conflitto | Scenario | Effetto potenziale |
|---|-------|---------------------|----------|---------------------|
| S1 | `Ctrl+M` | #2 (globale) ↔ TransactionDialog aperto | utente premette Ctrl+M mentre il TransactionDialog di edit è aperto | `setEditingTransaction(undefined); setShowTransactionDialog(true)` ([AppDataContext.tsx#L169-L172](src/context/AppDataContext.tsx#L169-L172)). Il dialog **rimane aperto** ma `editingTransaction` diventa undefined → al successivo `onSave`/`onClose` la chiusura procede ma in mezzo l'utente "perde" la transazione che stava modificando. Non spiega però la riapertura su click di "Elimina". |
| S2 | `e` / `E` senza modifier | #3 (`useListNavigation`) ↔ trigger button con focus | utente con focus sul trigger della riga premete `e` (es. cercando "Elimina") | In **DashboardTab** chiama `openEditTransactionDialog(recentTransactions[focusedIndex])` ([DashboardTab.tsx#L88-L102](src/components/DashboardTab.tsx#L88-L102)) — ma solo se `focusedIndex>=0`, cosa che richiede prima un ArrowDown/ArrowUp. **In TransactionsTab è no-op** (callback non passata). |
| S3 | `Delete` | #3 ↔ trigger / lista | con `focusedIndex>=0` su Dashboard, premete Delete → `onDelete` apre AlertDialog. Su Transactions: no-op. | nessun effetto su TransactionsTab |
| S4 | qualunque | #1 attivo durante AlertDialog di conferma elim. | `useListNavigation` non ha `showDeleteDialog` nel `disabled`; si affida a query DOM | se per qualche frame l'AlertDialog non ha ancora `data-state="open"` (race di mount), il listener resta abilitato; tasti come `e` o `Delete` potrebbero ancora scattare in DashboardTab |
| S5 | tasti senza modifier che combaciano per via del difetto matcher | #1 | utente preme `1`/`2`/`3`/`4`/`5` mentre dialog è aperto | toggla filtri categorie. Effetto collaterale fastidioso, non causa del bug descritto |
| S6 | tasti che richiedono Ctrl ma vengono interpretati anche con Ctrl+Shift/Alt | #1 (matcher difettoso, sez. 1) | varie combinazioni accidentali con tasti modificatori NVDA | possibili attivazioni indesiderate; non spiega il bug osservato |

### Sovrapposizione **non** trovata

Non esiste alcuna scorciatoia globale o di lista che invochi direttamente `openEditTransactionDialog` con la **transazione della riga corrente** se non passando per `focusedIndex` di `useListNavigation`. In `TransactionsTab` `useListNavigation` non riceve `onEdit`/`onMenu`/`onDelete`/`onEnter`. **Nessuna scorciatoia globale lega un tasto all'apertura del dialog di modifica di una transazione esistente.**

Conseguenza: **il sintomo "ogni voce successiva del menu apre la finestra di modifica" non può essere spiegato da nessuno dei gestori di tastiera analizzati**, perché:

- `Ctrl+M` apre il dialog in modalità *nuovo movimento*, non in modalità modifica.
- `e/E` senza modifier in `TransactionsTab` non ha callback wired.
- Nessun tasto registrato scatena `openEditTransactionDialog(transaction)` con la transazione di una riga.

---

## 4. Ipotesi prioritarie (ordinate)

### P1 — Il bug **non è** causato dai gestori di tastiera (probabilità: alta)

Motivazione: come mostrato in §3, nessuna catena di tastiera riproduce il sintomo "Elimina apre Modifica". I gestori globali non hanno una scorciatoia che esegua `openEditTransactionDialog(transaction)` con la transazione corretta della riga. Il sintomo si manifesta anche con click del mouse (per come è stato riportato), il che esclude del tutto il livello tastiera.

### P2 — Bug interazione DropdownMenu/Sheet ↔ Dialog Radix (focus & pointer events) (probabilità: media)

Motivazione: il primo report aveva già escluso lo stato React. L'ipotesi residua più probabile è un'interazione runtime tra:
- la chiusura della `DropdownMenuItem` ([TransactionActionMenu.tsx#L122-L132](src/components/TransactionActionMenu.tsx#L122-L132)) che invoca `onClick` sincrono,
- l'apertura immediata del `TransactionDialog` ([DialogsOverlay.tsx#L99-L106](src/components/DialogsOverlay.tsx#L99-L106)) prima che Radix DropdownMenu abbia smontato il portal,
- il pointer-events overlay che Radix lascia attivo durante la transizione.

Un click successivo su "Elimina" potrebbe colpire un nodo del portal residuo della DropdownMenu o del Dialog precedente, riattivando l'`onClick` di Modifica memorizzato.

Diagnosticabile solo runtime con DOM inspector ed event log.

### P3 — Difetto del matcher `useKeyboardShortcuts` (probabilità: bassa per questo bug, alta come bug separato)

Il matcher in [use-keyboard-shortcuts.ts#L22-L24](src/hooks/use-keyboard-shortcuts.ts#L22-L24) tratta i modifier non richiesti come "always-true". Effetti già discussi in §1 e §3 (S5/S6). Non spiega il sintomo principale, ma è un bug latente da segnalare.

### P4 — Lacuna `showDeleteDialog` non in `disabled` (probabilità: bassa per questo bug, media come bug separato)

`useListNavigation` in TransactionsTab/DashboardTab non considera `showDeleteDialog` nella prop `disabled`. Si affida solo all'early-return DOM-based su `[data-state="open"][aria-modal="true"]`. Possibile race di un frame all'apertura del modale. Non spiega il sintomo principale.

---

## 5. Mappa delle modifiche necessarie (solo localizzazione)

### Per chiudere lo screening tastiera in modo definitivo

Nessuna modifica di codice è necessaria per il bug primario (vedi P1). I file da NON toccare in fase di fix focus/stato residuo sono:

- [src/hooks/use-list-navigation.ts](src/hooks/use-list-navigation.ts) — comportamento corretto rispetto al menu/dialog; toccarlo rischierebbe regressione P17.

### Per i bug latenti emersi durante l'analisi (separati dal sintomo principale)

| File | Riferimento | Difetto |
|------|-------------|---------|
| [src/hooks/use-keyboard-shortcuts.ts](src/hooks/use-keyboard-shortcuts.ts#L22-L24) | matcher | `ctrlMatch/altMatch/shiftMatch` ritornano `true` quando il modifier non è richiesto → match troppo permissivo (vedi commit "//const" disattivato che mostrava la versione strict precedente) |
| [src/hooks/use-keyboard-shortcuts.ts](src/hooks/use-keyboard-shortcuts.ts#L13) | enabled | nessun gating su dialog aperti; `Ctrl+M` può triggerare anche con `TransactionDialog` aperto |
| [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L67-L72) | prop `disabled` di `useListNavigation` | non include `showDeleteDialog` |
| [src/components/DashboardTab.tsx](src/components/DashboardTab.tsx#L95-L103) | prop `disabled` di `useListNavigation` | idem |
| [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx#L32-L40) | `useEffect` di cleanup focus | codice morto già segnalato nel primo report (selettore `[data-list-item][data-index]` non matcha le righe) |

---

## 6. Limiti dell'analisi statica

- **Verifica runtime indispensabile**: la sola lettura statica conferma che **nessun gestore di tastiera analizzato spiega il sintomo**. La causa quindi è verosimilmente nel layer DOM/Radix (focus, pointer-events, portal mounting). Non è diagnosticabile senza React DevTools, breakpoints su `setShowTransactionDialog(true)` e ispezione del DOM ai vari T0-T9 della tabella in §2.
- **Verifica `aria-modal` sui Sheet mobili**: l'efficacia dell'early-return in `useListNavigation` (riga 33) dipende dal fatto che `Sheet` di shadcn/Radix monti effettivamente `aria-modal="true"` e `data-state="open"` con quei valori esatti. Da verificare con DOM inspector su mobile.
- **Riproducibilità del bug**: per validare definitivamente l'ipotesi P2 occorre intercettare runtime quale callback (`handleEdit` vs `handleDelete`) viene effettivamente eseguita al click su "Elimina" dopo la chiusura di un edit dialog. Senza questa traccia (event log con stack trace), la causa rimane indeterminabile staticamente.
