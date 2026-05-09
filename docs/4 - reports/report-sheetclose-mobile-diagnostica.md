# Report diagnostica — `SheetClose` mobile e composizione delle voci del menu

**Branch:** `refactoring-architettura`
**Data analisi:** 9 maggio 2026
**Agente:** Agent-Analyze (sola lettura)
**Report di partenza:**
- [docs/4 - reports/report-transaction-action-menu-diagnostica.md](docs/4%20-%20reports/report-transaction-action-menu-diagnostica.md)
- [docs/4 - reports/report-tastiera-gestori-globali-diagnostica.md](docs/4%20-%20reports/report-tastiera-gestori-globali-diagnostica.md)

**File esaminati:**
- [src/components/TransactionActionMenu.tsx](src/components/TransactionActionMenu.tsx)
- [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx)
- [src/components/ui/sheet.tsx](src/components/ui/sheet.tsx)

---

## 1. Struttura del menu mobile

Sorgente: [TransactionActionMenu.tsx#L77-L116](src/components/TransactionActionMenu.tsx#L77-L116).

```
<Sheet open={isOpen} onOpenChange={handleOpenChange}>
  <SheetTrigger asChild>{triggerButton}</SheetTrigger>
  <SheetContent side="bottom">
    <SheetHeader>
      <SheetTitle>Azioni</SheetTitle>
    </SheetHeader>
    <div className="flex flex-col p-4 pt-0 gap-1">
      <SheetClose asChild>
        <button role="menuitem" onClick={handleDetail}>
          Apri dettaglio
        </button>
      </SheetClose>
      <SheetClose asChild>
        <button role="menuitem" onClick={handleEdit}>
          Modifica
        </button>
      </SheetClose>
      <SheetClose asChild>
        <button role="menuitem" onClick={handleDelete}>
          Elimina
        </button>
      </SheetClose>
    </div>
  </SheetContent>
</Sheet>
```

Punti rilevanti:

- **Tre `<SheetClose asChild>` distinti**, uno per voce. Non c'è un singolo wrapper esterno.
- Ogni `<SheetClose>` avvolge **un button differente** con un `onClick` differente (`handleDetail`, `handleEdit`, `handleDelete`).
- `role="menuitem"` è applicato manualmente al `<button>` ([righe 87, 96, 105](src/components/TransactionActionMenu.tsx#L87)). Il container `<div>` interno **non ha `role="menu"`**, e `SheetContent` espone `role="dialog"` (Radix Dialog). Da un punto di vista a11y questa non è una vera struttura di menu Radix, ma tre pulsanti con `role="menuitem"` orfano.
- `SheetClose` è un alias diretto di `Dialog.Close` di `@radix-ui/react-dialog` ([sheet.tsx#L18-L22](src/components/ui/sheet.tsx#L18-L22)): nessuna logica custom locale.

### Composizione `asChild` (Radix Slot)

`Dialog.Close asChild` clona l'unico figlio e ne fonde i propri prop tramite `Slot`/`mergeProps` di Radix. Per i gestori di evento Radix Slot **compone le funzioni**: prima esegue il proprio handler (chiusura del dialog/sheet), poi quello del figlio (oppure viceversa, l'ordine dipende dalla versione, ma entrambi vengono chiamati con lo stesso evento). Il "merge" non duplica l'evento e non lo propaga a fratelli; agisce solo sul singolo nodo clonato.

---

## 2. Ciclo di vita degli eventi su selezione "Modifica" (mobile)

Sorgente: [TransactionActionMenu.tsx#L39-L63](src/components/TransactionActionMenu.tsx#L39-L63), [TransactionActionMenu.tsx#L96-L102](src/components/TransactionActionMenu.tsx#L96-L102), [TransactionsTab.tsx#L165-L183](src/components/TransactionsTab.tsx#L165-L183).

| # | Evento | Handler | Effetto |
|---|--------|---------|---------|
| E1 | tap/Enter su `<button>Modifica</button>` | `onClick` clonato dal `Slot` di `<SheetClose asChild>` | esegue **sia** la chiusura del Sheet **sia** l'`onClick` del button |
| E2 | Radix Dialog (Sheet) → `setOpen(false)` interno | — | scatena `onOpenChange(false)` su `<Sheet>` |
| E3 | `onOpenChange(false)` | `handleOpenChange` ([righe 39-44](src/components/TransactionActionMenu.tsx#L39-L44)) | chiama `onOpenChange(false)` (parent → `setOpenMenuIndex(-1)`) e poi `onFocusReturn()` (focus al trigger) |
| E4 | onClick del button | `handleEdit` ([righe 53-57](src/components/TransactionActionMenu.tsx#L53-L57)) | richiama `onOpenChange(false)` (redundante), `onFocusReturn()` (redundante), poi `onEdit()` |
| E5 | `onEdit()` | closure da [TransactionsTab.tsx#L172](src/components/TransactionsTab.tsx#L172) | `openEditTransactionDialog(transaction)` → setta `editingTransaction = tx`, `showTransactionDialog = true` |
| E6 | re-render | — | `TransactionDialog` montato; `Sheet` smonta il `SheetContent` (è in portal) |

### Punti critici della sequenza

1. **`onFocusReturn` viene invocato due volte** (E3 e E4) in rapida successione. Innocuo in sé, ma indica codice ridondante.
2. **L'ordine E3 vs E4 dipende dall'ordine di composizione di Radix Slot**: in `@radix-ui/react-slot` recenti, l'handler del Slot (parent) viene eseguito **prima** dell'handler del child su ogni evento (vedi `composeEventHandlers`). Quindi tipicamente: chiusura Radix → `onOpenChange(false)` → `handleEdit` → `onEdit()`. È prevedibile e deterministico.
3. **Nessun evento residuo si propaga a sibling**: `composeEventHandlers` riceve l'evento dal singolo nodo clonato, non lo riemette su altri nodi del DOM. Le tre voci sono `<SheetClose>` indipendenti con button indipendenti; un click sulla voce "Modifica" non può, da costruzione, invocare `onClick` della voce "Elimina".
4. **Smontaggio durante l'animazione**: `SheetContent` (Radix Dialog Content) usa `forceMount`/`Presence` solo se richiesto; nel codice attuale non si vede `forceMount`. Le voci restano montate durante l'animazione di out, ma sono dentro un overlay con `pointer-events` gestito da Radix; non possono ricevere click "dietro" dal dialog di edit appena aperto.

---

## 3. Confronto desktop vs mobile

| Aspetto | Desktop ([TransactionActionMenu.tsx#L118-L132](src/components/TransactionActionMenu.tsx#L118-L132)) | Mobile ([TransactionActionMenu.tsx#L77-L116](src/components/TransactionActionMenu.tsx#L77-L116)) |
|---------|------------------------------------------------------------------|------------------------------------------------------------------|
| Wrapper modale | `<DropdownMenu>` (Radix `DropdownMenu.Root`) | `<Sheet>` (Radix `Dialog.Root`) |
| Voce | `<DropdownMenuItem onClick={handleDetail/Edit/Delete}>` | `<SheetClose asChild><button onClick={handleDetail/Edit/Delete}></SheetClose>` |
| Chiusura del menu sull'attivazione voce | implicita: `DropdownMenuItem` chiama `onSelect` che chiude il menu di default | esplicita tramite `SheetClose asChild` (se rimosso, il Sheet non si chiuderebbe) |
| Composizione handler | un unico `onClick` sul `DropdownMenuItem`; Radix gestisce la chiusura internamente sopra `onSelect` | doppia composizione via Radix Slot (close + onClick utente) |
| Doppio invio di `onFocusReturn` | sì (via `handleOpenChange` quando il menu si chiude + esplicito in `handleEdit`) | sì (stessa cosa) |
| Pattern menu a11y | `role="menu"`/`role="menuitem"` forniti automaticamente da Radix DropdownMenu | `role="menuitem"` manuale su `<button>`, niente `role="menu"` sul container |
| Smontaggio | `DropdownMenuContent` smontato a chiusura | `SheetContent` smontato a chiusura |

**Differenza strutturale chiave**: il mobile aggiunge un secondo livello di composizione (Slot + close), il desktop no. Questo è precisamente il sospetto da valutare.

---

## 4. Verdetto sul sospetto `SheetClose`

**Verdetto: `<SheetClose asChild>` può essere ESCLUSO come causa primaria del comportamento "Elimina apre Modifica".**

Motivazione:

1. **Isolamento per nodo**: ogni `<SheetClose asChild>` clona un solo `<button>` e fonde le proprie proprietà solo su quel nodo. Non esiste, nel modello di `Slot`/`composeEventHandlers` di Radix, un meccanismo che faccia sì che il click su un nodo invochi l'`onClick` di un nodo fratello. La struttura statica del codice impedisce per costruzione la cross-invocation tra "Modifica" ed "Elimina".

2. **Closures per voce**: i tre handler (`handleDetail`, `handleEdit`, `handleDelete`) sono funzioni distinte definite nello scope del componente ([TransactionActionMenu.tsx#L46-L63](src/components/TransactionActionMenu.tsx#L46-L63)) e referenziate per nome. Non c'è alcuna variabile condivisa che possa puntare alla funzione sbagliata.

3. **Symmetria desktop**: lo stesso bug (riportato dall'utente) si dovrebbe manifestare anche su desktop solo se la causa è nel layer di stato/dati comune. Il primo report aveva escluso percorsi statici nel layer dati. Se il bug fosse esclusivo del mobile, sarebbe sintomo di un problema specifico del Sheet; se è presente anche su desktop, esclude il SheetClose. **Da confermare runtime con quale piattaforma riproduce il bug**.

4. **`Dialog.Close` non riemette eventi**: Radix `Dialog.Close` chiama internamente `setOpen(false)` su `Dialog.Root`. Non emette eventi sintetici aggiuntivi su altri nodi.

5. **Effetto del `forceMount` non rilevato**: il `SheetContent` in uso non specifica `forceMount`. Le voci spariscono dal DOM al committ del nuovo `open=false`. Anche se durante l'animazione Radix mantenesse il DOM (cosa che fa per le animazioni di exit nel branch `Presence`), l'overlay e i pointer-events sono comunque gestiti per non far passare il pointer.

**Punti di attenzione residui (non causa del bug, ma codice subottimale)**:

- Doppia chiamata a `onFocusReturn` ([TransactionActionMenu.tsx#L43, L55, L60](src/components/TransactionActionMenu.tsx#L43)).
- `role="menuitem"` orfano rispetto al container (manca `role="menu"`); non è una vera struttura menu ARIA.
- Il `handleDetail` ([righe 47-51](src/components/TransactionActionMenu.tsx#L47-L51)) è anch'esso wrappato in `<SheetClose asChild>` su mobile: stesso pattern, ma "Apri dettaglio" non manifesta il bug. Questo è un argomento *forte* a favore dell'esclusione del SheetClose: se la composizione fosse difettosa, il bug si manifesterebbe anche da/verso "Apri dettaglio".

---

## 5. Lettura incrociata con i due report precedenti

### Convergenze tra i tre report

| Conclusione | Report 1 (menu) | Report 2 (tastiera) | Report 3 (SheetClose) |
|-------------|-----------------|---------------------|------------------------|
| Le callback `handleEdit`/`handleDelete` sono distinte e non incrociano azioni | confermato | non rilevante | confermato |
| `editingTransaction` viene resettato in tutti i percorsi di chiusura del dialog | confermato | non rilevante | confermato |
| Nessuna scorciatoia globale invoca `openEditTransactionDialog(transaction)` con la transazione di una specifica riga | non rilevante | confermato | non rilevante |
| Il sintomo non è riproducibile da analisi statica del codice React | confermato | confermato | confermato |
| La causa è verosimilmente nel layer DOM/Radix runtime | ipotesi P2 | ipotesi P2 | conferma indiretta |

### Cosa **resta aperto**

1. **Quale piattaforma riproduce il bug** (desktop / mobile / entrambe). È l'unica informazione che permette di restringere ulteriormente. Il primo report ipotizzava potesse essere mobile-only; questo report conclude che la struttura mobile non lo giustifica → se il bug è confermato anche su desktop, l'ipotesi mobile è del tutto esclusa.
2. **Quale callback viene effettivamente eseguita** al click su "Elimina" dopo un edit. Senza intercettare runtime con un `console.log` su `handleEdit` e `handleDelete`, o un breakpoint, non si può dire se:
   - viene chiamata `handleDelete` ma `onDelete` invoca per errore `openEditTransactionDialog` (improbabile da static — la closure è inline e usa `setDeletingItem`),
   - oppure viene chiamata `handleEdit` (improbabile — è un button diverso),
   - oppure il click "fantasma" arriva sul trigger originale e riapre il menu/dialog.
3. **Stato del DOM al momento del click incriminato**: portal residui di Radix Dialog, overlay con `pointer-events:auto` non rilasciato, focus trap che cattura input. Solo DOM inspector può mostrarlo.

### Ipotesi complessiva più probabile (post-3 report)

**Race tra apertura del `TransactionDialog` di edit e cleanup degli overlay/portal Radix del menu sorgente**, con conseguente ridirezione del successivo click utente verso un nodo "stale". Possibili sotto-cause:

- (A) il `TransactionDialog` non chiama `setEditingTransaction(undefined)` finché non si chiude esplicitamente; se il dialog non si fosse chiuso correttamente (es. `onOpenChange` non sparato perché Radix ha perso il riferimento al `Root` durante il mount sopra il menu), `editingTransaction` resta valorizzato → `TransactionDialog` rimane montato in background, e qualunque azione successiva che imposti `setShowTransactionDialog(true)` lo rimostra con i dati di prima. **Questa è l'ipotesi nuova più promettente** e va verificata runtime.
- (B) cattura del click successivo da parte di un overlay residuo del Sheet/Dropdown (mobile o desktop) che propaga al trigger button della stessa riga riaprendo il menu, e il primo elemento a fuoco è "Modifica" → l'utente percepisce una riapertura "automatica" del dialog modifica.
- (C) regressione introdotta nei commit 8-9 maggio 2026 in altri file non ancora analizzati (es. `AppDataContext`, hook di sync con backend) che mantiene `showTransactionDialog=true` o ri-imposta `editingTransaction` in modo asincrono dopo `handleSaveTransaction`. Da verificare il diff dei commit.

---

## 6. Raccomandazione operativa

**Non procedere alla correzione di `TransactionActionMenu.tsx` o di `SheetClose` con l'attuale livello di certezza.** L'analisi statica completa (tre report) ha escluso le cause più ovvie ma non ha identificato la causa con sufficiente confidenza per intervenire. Procedere a fix "esplorativi" rischierebbe di rompere meccanismi a11y P17/P37 senza risolvere il problema.

**Prossimo passo richiesto** prima di toccare il codice (in ordine di priorità):

1. **Riprodurre il bug runtime** e annotare:
   - piattaforma (desktop o mobile o entrambe);
   - se il bug si manifesta dopo "salva", "annulla", "ESC" o "click outside";
   - se il dialog di modifica resta visibile in DOM (anche se nascosto) tra le azioni.
2. **Strumentare con log temporanei** all'inizio di `handleEdit`, `handleDelete`, `handleDetail`, `openEditTransactionDialog`, `setShowTransactionDialog`, `setEditingTransaction` per capire chi chiama cosa nella sequenza incriminata.
3. **Esaminare il diff dei commit 8-9 maggio 2026** (`git log --since="2026-05-08" -- src/`) per individuare modifiche correlate al ciclo di vita del dialog. Oltre a `TransactionActionMenu.tsx` potrebbero esserci modifiche in `AppDataContext`, `DialogsOverlay`, o nei wrapper `dialog`/`sheet` di ui.
4. **Verificare ipotesi (A)** con React DevTools: ispezionare `editingTransaction` e `showTransactionDialog` nello stato di `AppDataContext` *dopo* la chiusura del dialog di edit. Se `editingTransaction` non torna `undefined`, l'ipotesi è confermata.

Solo dopo aver raccolto i dati runtime sopra, è sensato procedere alla fase di Code.

### Limiti dell'analisi statica (esplicito)

- L'analisi statica può confermare l'**assenza** di cause ovvie nel sorgente; **non può confermare** la presenza di una causa runtime senza eseguire il codice.
- Ogni ipotesi rimanente (A, B, C in §5) richiede strumentazione runtime per essere confermata o esclusa.
- Le interazioni Radix Slot ↔ Dialog ↔ FocusScope dipendono dalla versione esatta dei pacchetti `@radix-ui/*` installati; un downgrade/upgrade può cambiare la composizione degli handler. Una verifica del `package.json` e del `pnpm-lock.yaml`/`package-lock.json` per controllare le versioni di `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-slot` è raccomandata come step parallelo.
