# P17 — Todo List: Fix navigazione frecce e accessibilità liste

> Passo 17 — Fix navigazione frecce e accessibilità liste  
> Piano di riferimento: `docs/2 - coding plans/P17-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P17-list-navigation-a11y-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: 2026-04-24  
> Data completamento: 2026-04-24

---

## Prima di iniziare

- [x] Rileggere `docs/2 - coding plans/P17-coding-plan.md` (tutte le sezioni AI1–AI6)
- [x] Rileggere `docs/1 - projects/P17-list-navigation-a11y-design.md` §3 e §7
- [x] Verificare di essere sul branch `refactoring-architettura`
- [x] Eseguire `npm run build` → atteso exit 0 (baseline pulita)
- [x] Eseguire `npm run lint` → annotare il numero esatto di warning (baseline: 59)
- [x] Eseguire `git status` → nessuna modifica in sospeso

---

## A — `src/hooks/use-list-navigation.ts`

> ⚠️ Questo hook è condiviso da tutti i componenti che usano la navigazione frecce.  
> Una regressione qui si propaga ovunque. Build verde obbligatorio dopo ogni punto di questa sezione.

### A.1 — `callbacksRef`: struttura e aggiornamento

- [x] Aprire `src/hooks/use-list-navigation.ts`
- [x] Leggere il file per intero per confermare lo stato attuale (vedere AI1 nel coding plan)
- [x] Aggiungere `import { useRef } from 'react'` all'import react se non già presente
- [x] Aggiungere `const callbacksRef = useRef({ onEnter, onDelete, onEdit })` subito dopo le dichiarazioni delle variabili di stato (`focusedIndex`, ecc.)
- [x] Aggiungere il `useEffect` di aggiornamento **senza array di dipendenze**:
  ```typescript
  useEffect(() => {
    callbacksRef.current = { onEnter, onDelete, onEdit }
  })
  ```
  ⚠️ L'assenza dell'array dipendenze è **intenzionale**: l'effetto si esegue ad ogni render per tenere il ref aggiornato. Non aggiungere dipendenze.

### A.2 — Modificare `handleKeyDown` per leggere le callback dal ref

- [x] Individuare il `useCallback` di `handleKeyDown`
- [x] Sostituire la chiamata diretta `onEnter?.(focusedIndex)` con `callbacksRef.current.onEnter?.(focusedIndex)`
- [x] Sostituire la chiamata diretta `onDelete?.(focusedIndex)` con `callbacksRef.current.onDelete?.(focusedIndex)`
- [x] Sostituire la chiamata diretta `onEdit?.(focusedIndex)` con `callbacksRef.current.onEdit?.(focusedIndex)`
- [x] Rimuovere `onEnter`, `onDelete`, `onEdit` dall'array di dipendenze di `handleKeyDown`
- [x] Verificare che `enabled`, `itemCount`, `focusedIndex` restino nelle dipendenze

  ⚠️ `focusedIndex` **deve restare** nelle dipendenze di `handleKeyDown` — è usato nei controlli `focusedIndex >= 0` e calcoli di navigazione. Rimuoverlo causerebbe stale closure.

### A.3 — Aggiungere guard per dialogo modale

- [x] All'**inizio** del corpo di `handleKeyDown` (prima di qualsiasi controllo `e.key`), aggiungere:
  ```typescript
  if (document.querySelector('[data-state="open"][aria-modal="true"]')) return
  ```
  ⚠️ Usare **`[aria-modal="true"]`**, non `[role="dialog"]`. La query deve catturare solo i dialog modali Radix (Dialog, AlertDialog). Tooltip, Popover, Select e DropdownMenu Radix **non** hanno `aria-modal="true"` e non devono bloccare la navigazione.

### A.4 — `useEffect` per focus DOM

- [x] Aggiungere un **nuovo** `useEffect` — separato dall'`useEffect` del listener e dall'`useEffect` di sincronizzazione `itemCount`:
  ```typescript
  useEffect(() => {
    if (!containerRef?.current || focusedIndex < 0) return
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-list-item][data-index="${focusedIndex}"]`
    )
    el?.focus()
  }, [focusedIndex, containerRef])
  ```
  ⚠️ **Perché in un `useEffect` e non nell'handler**: `.focus()` deve essere chiamato **dopo** che React ha completato il render con il nuovo `focusedIndex`. Se chiamato inline nell'handler, la riga destinazione ha ancora `tabIndex=-1` nel DOM al momento della chiamata. Il `useEffect` si esegue dopo il commit nel DOM, garantendo che `tabIndex` sia già stato aggiornato a 0 sulla riga target.

  ⚠️ Se `containerRef` è `undefined` (consumer che non lo passano), il guard `!containerRef?.current` evita qualsiasi focus DOM — il comportamento legacy è preservato.

### A.5 — Verifica intermedia A

- [x] Eseguire `npm run build`
  - ✅ Exit 0 → procedere alla sezione B
  - ❌ Errori → correggere prima di procedere. Tipi di errori comuni: tipo del `callbacksRef` non compatibile con `RefObject`, `useRef` non importato, rimozione accidentale di dipendenze critiche da `handleKeyDown`

---

## B — `src/components/DashboardTab.tsx`

> ⚠️ Prima modifica su un componente `src/`. Leggere le righe coinvolte **prima** di editare.

### B.1 — Import `useRef` e `useCallback`

- [x] Aprire `src/components/DashboardTab.tsx`
- [x] Verificare l'import da `'react'` (riga 1 o simile) — aggiungere `useRef` e `useCallback` se non già presenti

### B.2 — Aggiungere il ref per il container della lista

- [x] All'inizio del corpo di `DashboardTab` (dopo le chiamate ai custom hook esistenti, prima del `return`), aggiungere:
  ```typescript
  const recentListContainerRef = useRef<HTMLDivElement>(null)
  ```

### B.3 — Stabilizzare le callback con `useCallback`

- [x] Individuare la chiamata a `useListNavigation` (righe ~58–82)
- [x] Estrarre `onEnter` come `useCallback` con dipendenze `[recentTransactions, setEditingTransaction, setShowTransactionDialog]`
- [x] Estrarre `onDelete` come `useCallback` con dipendenze `[recentTransactions, setDeletingItem, setShowDeleteDialog]`
- [x] Estrarre `onEdit` come `useCallback` con stesse dipendenze di `onEnter`
- [x] Passare le callback estratte nella chiamata al hook
- [x] Aggiungere `containerRef: recentListContainerRef` alla chiamata al hook

  ⚠️ Se `setDeletingItem`, `setShowDeleteDialog` o simili non sono ancora presenti nella destrutturazione di `useAppData` per la sezione Movimenti Recenti, verificare il nome esatto degli state setter usati nelle callback inline originali prima di includere le dipendenze.

### B.4 — Assegnare `ref` al container della lista nel JSX

- [x] Nella sezione JSX "Movimenti Recenti", trovare il `<div className="divide-y">` che racchiude il `.map()`
- [x] Aggiungere `ref={recentListContainerRef}` a questo elemento

### B.5 — Attributi accessibilità sulle righe

- [x] Individuare la riga `<div key={transaction.id} ...>` dentro il `map` (riga ~327)
- [x] Aggiungere `tabIndex={isFocused ? 0 : -1}`
- [x] Aggiungere `role="button"`
- [x] Aggiungere `data-list-item` (attributo booleano, senza valore)
- [x] Aggiungere `data-index={index}`
- [x] Costruire e aggiungere `aria-label`:
  ```
  aria-label={`${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'}: ${
    transaction.descrizione || category?.nome || 'Movimento'
  }, ${formatCurrency(transaction.importo)}, ${new Date(transaction.data).toLocaleDateString('it-IT')}, ${account?.nome || ''}`}
  ```
  ⚠️ Verificare che `isIncome`, `isTransfer`, `category`, `account` e `formatCurrency` siano già in scope nella closure del `map` — se alcune variabili non esistono, derivarle dal `transaction.tipo` e dalle lookup esistenti nel map stesso.
- [ ] Aggiungere `focus:outline-none` alla `className` della riga per prevenire il doppio bordo (browser outline + CSS ring)

  ⚠️ Non modificare la logica condizionale esistente del `className` (`isFocused ? '...' : 'hover:bg-muted/50'`). Aggiungere semplicemente `focus:outline-none` come classe aggiuntiva sempre presente.

### B.6 — Verifica intermedia B

- [x] Eseguire `npm run build`
  - ✅ Exit 0 → procedere alla sezione C
  - ❌ Errori → tipi comuni: `useRef<HTMLDivElement>` su container che poi viene assegnato a un elemento non-div (verificare il tipo del container div), errore TypeScript sull'`aria-label` se alcune variabili sono `undefined` (aggiungere il fallback `|| ''`)

---

## C — `src/components/TransactionsTab.tsx`

> ⚠️ Struttura simmetrica a DashboardTab con `aria-label` esteso per trasferimenti e categorie.

### C.1 — Import `useRef` e `useCallback`

- [x] Aprire `src/components/TransactionsTab.tsx`
- [x] Verificare l'import da `'react'` — aggiungere `useRef` e `useCallback` se non già presenti

### C.2 — Aggiungere il ref per il container

- [x] All'inizio del corpo di `TransactionsTab`, aggiungere:
  ```typescript
  const transactionsListContainerRef = useRef<HTMLDivElement>(null)
  ```

### C.3 — Stabilizzare le callback e passare `containerRef`

- [x] Individuare la chiamata a `useListNavigation` (righe ~37–57)
- [x] Estrarre `onEnter`, `onEdit` come `useCallback` con dipendenze `[sortedTransactions, setEditingTransaction, setShowTransactionDialog]`
- [x] Estrarre `onDelete` come `useCallback` con dipendenze `[sortedTransactions, setDeletingItem, setShowDeleteDialog]`
- [x] Aggiungere `containerRef: transactionsListContainerRef`

### C.4 — Assegnare `ref` al container

- [x] Trovare il `<div className="divide-y max-h-[600px] overflow-y-auto">` (riga ~113)
- [x] Aggiungere `ref={transactionsListContainerRef}`

### C.5 — Attributi accessibilità sulle righe con `aria-label` esteso

- [x] Individuare la riga `<div key={transaction.id} ...>` (riga ~119)
- [x] Aggiungere `tabIndex={isFocused ? 0 : -1}`
- [x] Aggiungere `role="button"`
- [x] Aggiungere `data-list-item`
- [x] Aggiungere `data-index={index}`
- [x] Costruire l'`aria-label` esteso con dettaglio trasferimento e categoria:
  ```
  aria-label={`${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'}: ${
    transaction.descrizione || category?.nome || 'Movimento'
  }, ${formatCurrency(transaction.importo)}, ${new Date(transaction.data).toLocaleDateString('it-IT')}, ${account?.nome || ''}${
    isTransfer && destAccount ? ` → ${destAccount.nome}` : ''
  }${category && !isTransfer ? `, ${category.nome}` : ''}`}
  ```
  ⚠️ `destAccount` e `category` devono già essere in scope nel map. Verificare che `destAccount` sia definito (lookup su `visibleAccounts` o lista conti) — se è `null` la condizione `isTransfer && destAccount` gestisce già il caso.
- [ ] Aggiungere `focus:outline-none` alla `className`

  ⚠️ Non toccare il warning lint esistente `'isMobile' is assigned a value but never used` (riga 28) — è fuori perimetro di P17.

### C.6 — Verifica intermedia C

- [x] Eseguire `npm run build`
  - ✅ Exit 0 → procedere alla sezione D
  - ❌ Errori → stesse categorie di B.6. Attenzione in più: template literal dell'`aria-label` esteso, controllare che tutti i termini opzionali abbiano gestione `|| ''` o condizioni ternarie complete.

---

## D — `src/components/FocusIndicator.tsx`

> Modifica puntuale, basso rischio.

### D.1 — Aggiunta condizione `data-list-item`

- [x] Aprire `src/components/FocusIndicator.tsx`
- [x] Individuare la condizione `if (target.tagName === 'INPUT' || ...)` in `handleFocusIn`
- [x] Aggiungere come **prima condizione** del blocco if:
  ```typescript
  target.hasAttribute('data-list-item') ||
  ```
  La condizione deve essere la prima riga della condizione if, prima di `target.tagName === 'INPUT'`.

  ⚠️ Non modificare nient'altro del componente. Il tooltip usa già `dataFocusInfo || ariaLabel || title || buttonText` — le righe hanno `data-focus-info`, che ha priorità nel tooltip. L'aggiunta di `aria-label` alle righe serve allo screen reader, non al tooltip.

### D.2 — Verifica intermedia D

- [x] Eseguire `npm run build`
  - ✅ Exit 0 → procedere alla verifica finale
  - ❌ Errori → verificare che `target.hasAttribute` sia chiamato correttamente (stringa `'data-list-item'`, non `'data-list-item="true"'`)

---

## E — Verifica finale

### E.1 — Build e lint

- [ ] Eseguire `npm run build` → exit 0
- [ ] Eseguire `npm run lint` → exit 0
- [ ] Annotare il numero totale di warning: ___________
  - ✅ ≤59 → accettabile
  - ✅ ≤55 → miglioramento atteso (4 warning jsx-a11y risolti)
  - ❌ >59 → analizzare i nuovi warning prima di procedere

### E.2 — Integrità repository

- [ ] Eseguire `git diff --stat`
- [ ] Verificare che compaiano **esattamente** i quattro file:
  - [ ] `src/hooks/use-list-navigation.ts`
  - [ ] `src/components/DashboardTab.tsx`
  - [ ] `src/components/TransactionsTab.tsx`
  - [ ] `src/components/FocusIndicator.tsx`
- [ ] Verificare che **nessun altro file** sotto `src/` sia modificato
- [ ] Verificare che **nessun file sotto `.github/`** sia modificato

### E.3 — Verifica focus DOM con DevTools

- [ ] Avviare `npm run dev`
- [ ] Aprire il browser (Chrome consigliato per DevTools focus inspection)
- [ ] Navigare alla tab Dashboard
- [ ] Premere Tab per raggiungere la prima riga della lista "Movimenti Recenti"
- [ ] Aprire DevTools → pannello Elements → cercare l'elemento con bordo azzurro (`:focus`)
- [ ] Verificare che il focus sia sulla riga (non sul body o su un div wrapper)
- [ ] Premere ArrowDown → verificare che il focus si sposti alla riga successiva in DevTools
- [ ] Premere ArrowUp → il focus torna alla riga precedente
- [ ] Verificare che l'highlight CSS (bordo colorato + sfondo) corrisponda alla riga con focus DOM
- [ ] Verificare assenza del doppio bordo visivo (nessun outline del browser sopra il CSS ring)
- [ ] Ripetere la verifica sulla tab Transazioni (lista `sortedTransactions`)

### E.4 — Verifica guard dialogo

- [ ] Con DevTools aperto, navigare a una riga con ArrowDown
- [ ] Premere Enter → aprire il dialog di modifica
- [ ] Con il dialog aperto, premere ArrowDown
- [ ] Verificare che l'indice nella lista NON cambi (nessun cambio di highlight)
- [ ] Chiudere il dialog (Escape)
- [ ] Premere ArrowDown → la navigazione riprende normalmente

### E.5 — Verifica screen reader (se disponibile)

- [ ] **TalkBack (Android)**:
  - [ ] Attivare TalkBack
  - [ ] Navigare con swipe destra alle righe di "Movimenti Recenti"
  - [ ] Verificare annuncio corretto: tipo, descrizione, importo, data, conto
  - [ ] Verificare che il doppio tap apra il dialog di modifica
- [ ] **VoiceOver (iOS)** (opzionale):
  - [ ] Attivare VoiceOver
  - [ ] Navigare con swipe alle righe
  - [ ] Verificare annuncio corretto

---

## Checklist finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| `npm run build` | exit 0 | | ☐ |
| `npm run lint` | exit 0, ≤59 warn | | ☐ |
| Warning lint ridotti | ≤55 (atteso) | | ☐ |
| `git diff --stat` | 4 file esatti | | ☐ |
| Nessun file `.github/` modificato | 0 file | | ☐ |
| Focus DOM verificato (DevTools) | sì | | ☐ |
| Guard dialogo verificato | sì | | ☐ |
| Screen reader verificato | TalkBack / VoiceOver | | ☐ |


> Quando tutti i gate sono ✅, aggiornare `docs/todo.md` spostando P17 nella sezione completati con la data.

***

**Completato il 2026-04-24.**
**Bug navigazione frecce corretto — focus DOM reale attivo sulle liste.**

