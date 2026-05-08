# Diagnostico: navigazione da tastiera nel tab Movimenti — Enter / E non aprono il dialog

Data: 2026-05-08  
Branch: refactoring-architettura  
File analizzati: `src/components/TransactionsTab.tsx`, `src/hooks/use-list-navigation.ts`  
Nessuna modifica al codice.

---

## Punto 1 — Il contenitore della lista ha `tabIndex` corretto?

**NO.**

Il `div` contenitore della lista è definito a `TransactionsTab.tsx:113`:

```tsx
<div className="divide-y max-h-[600px] overflow-y-auto" ref={transactionsListContainerRef}>
```

Non ha nessun attributo `tabIndex`. Questo significa che il `div` contenitore **non può mai ricevere il focus da tastiera** (né via Tab, né in modo programmatico senza un `focus()` esplicito).

I singoli item hanno invece il pattern roving-tabindex (`TransactionsTab.tsx:140`):

```tsx
tabIndex={isFocused ? 0 : -1}
```

Allo stato iniziale — prima che l'utente clicchi qualcosa — `focusedIndex = -1` e quindi **tutti gli item hanno `tabIndex={-1}`**: nessun elemento dentro il contenitore è raggiungibile via Tab.

**Conseguenza diretta:** l'utente non ha nessun percorso da tastiera per entrare nella lista. Deve obbligatoriamente cliccare con il mouse su un item prima che le frecce e i tasti Enter/E possano funzionare.

---

## Punto 2 — `containerRef` è collegato al `div` corretto?

**SÌ, è corretto.**

Il ref `transactionsListContainerRef` viene creato a riga 28:

```tsx
const transactionsListContainerRef = useRef<HTMLDivElement>(null)
```

Viene attaccato al `div` della lista a riga 113:

```tsx
<div className="divide-y max-h-[600px] overflow-y-auto" ref={transactionsListContainerRef}>
```

Viene passato all'hook a riga 64:

```tsx
const allTransactionsNav = useListNavigation({
  ...
  containerRef: transactionsListContainerRef,
})
```

Il wiring è coerente. Il problema non è qui.

---

## Punto 3 — Qualcosa blocca l'hook dal ricevere gli eventi tastiera?

**SÌ — tre problemi distinti, tutti concorrenti.**

### 3a. Il listener è sul contenitore, non su `document` — e il contenitore non ha focus

In `use-list-navigation.ts:65-72`:

```typescript
useEffect(() => {
  const target = containerRef?.current || document   // ← usa il div, NON document

  target.addEventListener('keydown', handleKeyDown as EventListener)
  return () => {
    target.removeEventListener('keydown', handleKeyDown as EventListener)
  }
}, [handleKeyDown, containerRef])
```

Il `keydown` listener viene registrato sul **contenitore div**, non su `document`. Questo significa che il listener riceve eventi solo quando un elemento **discendente del contenitore** ha il focus DOM. Se il focus è su un elemento fuori dalla lista (ad esempio il bottone "Nuovo Movimento"), gli eventi tastiera passano attraverso la gerarchia di quel bottone — mai attraverso il contenitore — e il listener non si attiva mai.

Combinato con il punto 1 (nessun `tabIndex` sul contenitore, item con `tabIndex=-1` iniziale), il risultato è:

> **Prima di un click del mouse, nessun tasto raggiunge mai `handleKeyDown`.** L'app rimane silenziosa non perché le callback siano bloccate, ma perché il listener non riceve fisicamente gli eventi.

### 3b. `enabled` e `disabled`

In `TransactionsTab.tsx:57-65`:

```tsx
const allTransactionsNav = useListNavigation({
  itemCount: sortedTransactions.length,
  enabled: isAuthenticated,        // ← true se loggato
  disabled: showTransactionDialog, // ← true solo mentre il dialog è aperto
  ...
})
```

In `use-list-navigation.ts:30-33`:

```typescript
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (disabled) return
  if (document.querySelector('[data-state="open"][aria-modal="true"]')) return
  if (!enabled || itemCount === 0) return
  ...
}, [disabled, enabled, itemCount, focusedIndex])
```

Per un utente autenticato con il dialog chiuso: `enabled = true`, `disabled = false`. Queste condizioni non bloccano le callback in condizioni normali.

### 3c. Conflitto nel `onKeyDown` dell'item — Enter chiama `setFocusedIndex` invece di `openEditTransactionDialog`

In `TransactionsTab.tsx:133-138`:

```tsx
onKeyDown={(event) => {
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    allTransactionsNav.setFocusedIndex(index)   // ← aggiorna solo lo stato del focus, non apre il dialog
  }
}}
```

Questo handler React intercetta `Enter` e chiama **`setFocusedIndex`**, che aggiorna solo l'indice di focus (operazione no-op se l'item è già selezionato) e **non chiama `openEditTransactionDialog`**.

L'apertura del dialog è invece affidata a `handleKeyDown` in `use-list-navigation.ts:53-55`:

```typescript
} else if (e.key === 'Enter' && focusedIndex >= 0) {
  e.preventDefault()
  callbacksRef.current.onEnter?.(focusedIndex)   // ← questa è la call che apre il dialog
}
```

Nel modello di propagazione degli eventi del browser, il listener nativo sul contenitore (bubble phase, elemento più vicino al target) dovrebbe scattare **prima** del listener React sintetico (bubble phase, processato al root `#root`). Quindi teoricamente `onEnter` verrebbe chiamato prima che il React `onKeyDown` dell'item sovrascriva l'azione. Tuttavia questo crea una struttura fragile:

- **Due gestori separati per lo stesso tasto Enter**: il listener nell'hook (che apre il dialog) e il `onKeyDown` sull'item (che aggiorna solo il focus)
- Il `onKeyDown` dell'item NON chiama `e.stopPropagation()`, quindi il bubble continua, ma aggiunge dipendenza dall'ordine di propagazione nativo vs. sintetico
- Il tasto `E` non è interceptato dall'item `onKeyDown`, quindi arriva al listener solo via bubble — questo può funzionare solo se DOM focus è già dentro il contenitore

---

## Riepilogo dei problemi trovati

| # | Problema | File : riga | Effetto |
|---|----------|-------------|---------|
| 1 | Contenitore senza `tabIndex` | TransactionsTab.tsx:113 | Impossibile entrare nella lista via Tab; il listener non riceve eventi se l'utente non ha prima cliccato |
| 2 | Listener registrato sul contenitore, non su `document` | use-list-navigation.ts:66 | Enter/E sordi finché il focus DOM non è dentro il contenitore (impossibile senza click) |
| 3 | Item `onKeyDown` intercetta Enter ma chiama `setFocusedIndex` invece di `openEditTransactionDialog` | TransactionsTab.tsx:133-138 | Doppio handler in conflitto; il dialog si apre solo se il listener nativo dell'hook scatta per primo (ordine di propagazione dipendente dall'implementazione) |
| — | `enabled` / `disabled` | TransactionsTab.tsx:59-60 | Non bloccano in condizioni normali; `disabled=showTransactionDialog` è corretto |
| — | `containerRef` wiring | TransactionsTab.tsx:28, 64, 113 | Corretto |

---

## Percorso dell'evento quando il bug si manifesta

```
Utente preme Enter (focus fuori dal contenitore)
  ↓
keydown su elemento esterno (es. bottone "Nuovo Movimento")
  ↓
evento bubble → attraverso antenati del bottone
  ↓
NON passa mai per il contenitore div (che è un sibling, non un antenato)
  ↓
handleKeyDown nel hook: mai chiamato
  ↓
App silenziosa
```

Il percorso funzionante (solo dopo click sul mouse):

```
Click su item → setFocusedIndex(index) → re-render → el.focus()
  ↓
Item ha DOM focus (tabIndex=0)
  ↓
Utente preme Enter
  ↓
keydown su item div → bubble → contenitore div
  ↓
handleKeyDown: focusedIndex >= 0 → onEnter?.(focusedIndex) → openEditTransactionDialog
  ↓
Dialog aperto
```
