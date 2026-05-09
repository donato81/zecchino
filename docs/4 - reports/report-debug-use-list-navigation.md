# Report: Analisi `use-list-navigation.ts` — verifica ipotesi accumulo handler

**Data:** 2026-05-09  
**Branch:** refactoring-architettura  
**File analizzati:** `src/hooks/use-list-navigation.ts`  
**Report precedente:** `report-debug-focus-handler-accumulation.md`  
**Contesto:** il report precedente ipotizzava che `useListNavigation` fosse la fonte dell'accumulo di handler, perché è l'unico componente non visibile nel flusso e viene riabilitato esattamente al momento in cui il bug si manifesta (chiusura del form di modifica). Questa analisi verifica o confuta quell'ipotesi.

---

## 1. `addEventListener` e cleanup corrispondente

**Sì, il hook usa `addEventListener`. Il cleanup con `removeEventListener` esiste ed è strutturalmente corretto.**

Codice esatto, righe 71–78:

```typescript
useEffect(() => {
  const target = containerRef?.current || document

  target.addEventListener('keydown', handleKeyDown as EventListener)
  return () => {
    target.removeEventListener('keydown', handleKeyDown as EventListener)
  }
}, [handleKeyDown, containerRef])
```

Il `target` è catturato nella closure al momento in cui l'effetto gira. La funzione di cleanup usa la stessa closure, quindi `removeEventListener` riceve esattamente la stessa istanza di `target` e di `handleKeyDown` usata in `addEventListener`. Questo è il pattern corretto.

**Conclusione: nessun `addEventListener` orfano. Ipotesi "listener che si accumula senza cleanup" — CONFUTATA.**

---

## 2. Array o lista di callback che cresce nel tempo

**No. Non esiste alcun array che cresce tra un render e l'altro.**

Il hook usa un `useRef` per tenere le callback aggiornate senza includerle nelle dipendenze di `handleKeyDown`:

```typescript
const callbacksRef = useRef({ onEnter, onMenu, onDelete, onEdit })   // riga 26

useEffect(() => {
  callbacksRef.current = { onEnter, onMenu, onDelete, onEdit }        // riga 29
})                                                                     // nessun dep array
```

`callbacksRef` è un oggetto singolo con quattro chiavi. L'`useEffect` senza dipendenze lo sovrascrive dopo ogni render con i valori più recenti delle prop. Non si accumula: viene sempre sostituito, mai espanso.

**Conclusione: nessun array che cresce. Ipotesi "callback accumulate in una struttura dati interna" — CONFUTATA.**

---

## 3. Cosa succede quando `disabled` cambia da `true` a `false`

`disabled` è incluso nell'array delle dipendenze di `handleKeyDown`:

```typescript
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (disabled) return   // ← early return se disabled
  // ...
}, [disabled, enabled, itemCount, focusedIndex])   // ← disabled qui
```

Quando `disabled` cambia (da `true` a `false` alla chiusura del `TransactionDialog`), l'identità di `handleKeyDown` cambia — `useCallback` ricrea la funzione. Questo innesca il `useEffect` che gestisce il listener (perché `handleKeyDown` è nelle sue dipendenze):

```
[disabled cambia] → handleKeyDown ricreato → useEffect si riesegue:
  1. cleanup: removeEventListener(target, handleKeyOld)   ← rimuove il vecchio
  2. setup:   addEventListener(target, handleKeyNew)      ← aggiunge il nuovo
```

Il vecchio listener (che aveva `disabled=true` nella closure e quindi era un no-op) viene rimosso. Il nuovo listener (con `disabled=false`) viene aggiunto. Un listener solo, correttamente sostituito.

**Conclusione: il cambio `disabled: true → false` produce una sostituzione corretta del listener, non un'aggiunta. Ipotesi "listener duplicato all'abilitazione" — CONFUTATA.**

---

## 4. Correttezza dell'array di dipendenze

Il `useEffect` che registra il listener dipende da `[handleKeyDown, containerRef]`. `handleKeyDown` a sua volta dipende da `[disabled, enabled, itemCount, focusedIndex]`.

### Problema: `focusedIndex` nelle dipendenze

`focusedIndex` è uno stato interno (`useState`). Ogni volta che l'utente preme ArrowUp/ArrowDown, `focusedIndex` cambia → `handleKeyDown` viene ricreato → il listener viene rimosso e ricreato. Il cleanup è corretto, ma la ricreazione è inutile: `focusedIndex` serve dentro `handleKeyDown` solo per i casi `Enter`/`Space` (riga 55), e potrebbe essere sostituito da un `useRef` per eliminare il churn.

Questo non causa il bug segnalato, ma produce lavoro extra ad ogni tasto freccia. È un difetto di ottimizzazione, non di correttezza.

### Effetto focus (riga 88–94)

```typescript
useEffect(() => {
  if (!containerRef?.current || focusedIndex < 0) return
  const el = containerRef.current.querySelector<HTMLElement>(
    `[data-list-item][data-index="${focusedIndex}"]`
  )
  el?.focus()
}, [focusedIndex, containerRef])
```

Questo effetto cerca `[data-list-item][data-index="${focusedIndex}"]` nel container. **In `TransactionsTab`, nessun elemento ha questi attributi** (le righe usano solo `key={transaction.id}` e `data-trigger-index={index}`). Quindi `el` è sempre `null` e `el?.focus()` è sempre un no-op. L'effetto gira ma non produce effetti DOM.

**Questo conferma quanto già rilevato nel report precedente**: il `useEffect` di cleanup in `TransactionsTab.tsx` (righe 33–41) che cerca `[data-list-item][data-index]` è codice morto. L'attributo `data-list-item` esiste solo in `DashboardTab.tsx` e nel `useListNavigation` stesso.

---

## 5. Perché il hook NON spiega il bug

**In `TransactionsTab`, `useListNavigation` viene invocato senza nessuna callback d'azione:**

```typescript
const allTransactionsNav = useListNavigation({
  itemCount: sortedTransactions.length,
  enabled: isAuthenticated,
  disabled: showTransactionDialog || openMenuIndex >= 0,
  containerRef: transactionsListContainerRef,
  // onMenu, onEnter, onDelete, onEdit → NON PASSATE
})
```

Di conseguenza, `callbacksRef.current` è:
```typescript
{ onEnter: undefined, onMenu: undefined, onDelete: undefined, onEdit: undefined }
```

Le uniche azioni che `handleKeyDown` chiama tramite `callbacksRef` sono:
- `Enter`/`Space` → `callbacksRef.current.onMenu` o `onEnter` → `undefined` → no-op
- `Delete` → `callbacksRef.current.onDelete` → `undefined` → no-op
- `e`/`E` → `callbacksRef.current.onEdit` → `undefined` → no-op

**Il hook non può chiamare `openEditTransactionDialog`, `setDeletingItem`, né nessun altro handler d'azione su `TransactionsTab`.** È fisicamente impossibile: le callback non sono cablate.

**Nota:** le callback memoizzate `onMenuTransactions`, `onEditTransactions`, `onDeleteTransactions` definite in `TransactionsTab.tsx` (righe 48–65) non vengono mai passate a `useListNavigation`. Sono codice inutilizzato nella versione corrente.

---

## 6. Aggiornamento alla mappa causale

### Ipotesi del report precedente — stato

| Ipotesi | Stato dopo questa analisi |
|---------|--------------------------|
| `useListNavigation` accumula listener senza cleanup | **CONFUTATA** — cleanup corretto |
| `useListNavigation` mantiene una lista di callback che cresce | **CONFUTATA** — `callbacksRef` è un ref aggiornato, non un array |
| Abilitazione di `useListNavigation` aggiunge listener in eccesso | **CONFUTATA** — sostituzione corretta |
| `useListNavigation` chiama `handleEdit`/`handleDelete` | **CONFUTATA** — no callback cablate in `TransactionsTab` |

### Cosa rimane aperto

Il hook è implementato correttamente. La causa del bug — `handleEdit` che si esegue prima di `handleDelete` quando si clicca "Elimina" — **non proviene da questo file**.

Le cause non ancora confutate, in ordine di probabilità:

**C1 — Doppia esecuzione di `onFocusReturn()` + timing Radix (alta probabilità)**

`handleOpenChange` chiama `onFocusReturn()` quando il menu si chiude. Ma ciascuno dei tre handler (`handleEdit`, `handleDelete`, `handleDetail`) chiama già esplicitamente `onFocusReturn()` prima di invocare l'azione, E chiama `onOpenChange(false)` direttamente (non attraverso `handleOpenChange`). Risultato:

```
click "Elimina"
  → handleDelete:
      onOpenChange(false)    ← 1a chiusura (batch React)
      onFocusReturn()        ← 1° focus sul trigger
      onDelete()             ← azione
  → Radix chiude DropdownMenu → handleOpenChange(false):
      onOpenChange(false)    ← 2a chiusura (no-op)
      onFocusReturn()        ← 2° focus sul trigger
```

La seconda `onFocusReturn()` avviene DOPO che React ha già flushed gli state update del primo ciclo. In quel momento, `onFocusReturn` è la nuova funzione inline del re-render. Il trigger riceve focus una seconda volta mentre la pagina è già in uno stato intermedio.

**C2 — Radix DropdownMenu chiama `onClick` dopo `onSelect` (da verificare runtime)**

Radix `DropdownMenuItem` potrebbe inviare `onSelect` (che chiude il menu e chiama `handleOpenChange`) prima di `onClick` (che chiama `handleDelete`). Se in quel breve intervallo tra `onSelect` e `onClick` avviene un re-render della lista, il `onClick` potrebbe essere instradato al nodo DOM sbagliato (nodo vecchio vs nodo nuovo dopo reconciliazione del portale).

**C3 — `SheetClose asChild` su mobile (da verificare su device)**

Il pattern `<SheetClose asChild><button onClick={handleX}></SheetClose>` usa Radix `Slot` che compone i due `onClick` in sequenza. Se una versione precedente del handler composto rimane memorizzata nel Slot tra un render e l'altro, potrebbe fireare sia il vecchio che il nuovo handler.

---

## 7. Prossimo passo consigliato

L'indagine statica ha esaurito le ipotesi verificabili da codice. L'unico modo per identificare la causa esatta è **intercettare runtime lo stack call completo** nel momento in cui `[MENU] handleEdit chiamato` appare in console quando si clicca "Elimina".

Procedura consigliata:
1. Aprire Chrome DevTools → Sources → cercare `handleEdit chiamato` nei sorgenti (o `'[MENU] handleEdit chiamato'`)
2. Mettere un breakpoint sulla riga del `console.log` in `handleEdit`
3. Riprodurre il bug (apri menu → Modifica → chiudi form → apri menu → Elimina)
4. Quando il breakpoint si attiva inaspettatamente, guardare lo **stack trace completo** nel pannello Call Stack
5. Identificare quale funzione nella catena ha chiamato `handleEdit` invece di `handleDelete`

Lo stack trace risponderà definitivamente alla domanda: è Radix, è un re-render React, o è qualcos'altro.
