# P39 — Coding Plan: Fix navigazione da tastiera nel tab Movimenti (Enter / E)

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P39 — Fix keyboard navigation TransactionsTab
> Report di riferimento: `docs/4 - reports/report-diagnostico-navigazione-tastiera-movimenti.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-08

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P39 — Fix keyboard navigation TransactionsTab |
| **Tipo intervento** | Bugfix |
| **Branch** | `refactoring-architettura` |
| **Data** | 2026-05-08 |
| **File modificati** | `src/hooks/use-list-navigation.ts` · `src/components/TransactionsTab.tsx` |
| **Report di riferimento** | [report-diagnostico-navigazione-tastiera-movimenti.md](../4%20-%20reports/report-diagnostico-navigazione-tastiera-movimenti.md) |

---

## §2 — Obiettivo

Correggere il bug per cui premere **Invio** o **E** sulla lista dei movimenti nel tab Movimenti non apre il dialog di modifica — l'app rimane silenziosa.

**Risultato atteso dopo le modifiche:**
- Un utente che naviga con la sola tastiera può **Tab** sulla lista movimenti, usare **↑/↓** per navigare tra gli item e premere **Invio**, **Spazio** o **E** per aprire il dialog di modifica.
- Un utente che prima clicca un item e poi preme **Invio** o **E** ottiene il dialog di modifica.
- Il tasto **Spazio** su un item selezionato apre il dialog di modifica (semantica corretta per `role="button"`).
- Il tasto **Canc** su un item selezionato apre il dialog di eliminazione (comportamento invariato).
- Il handler `onKeyDown` duplicato sugli item non interferisce più con la logica dell'hook.

---

## §3 — Causa radice

Il diagnostico ha identificato tre problemi concorrenti.

**Problema 1 — Contenitore senza `tabIndex` (`TransactionsTab.tsx:113`)**

```tsx
<div className="divide-y max-h-[600px] overflow-y-auto" ref={transactionsListContainerRef}>
```

Il `div` contenitore della lista non ha `tabIndex`. Non può ricevere il focus via Tab. Gli item al caricamento hanno tutti `tabIndex={-1}` (nessuno è selezionato), quindi neanche loro sono raggiungibili da tastiera senza prima cliccare con il mouse. Non esiste nessun percorso da tastiera per entrare nella lista.

**Problema 2 — Listener sul contenitore: non riceve eventi se il contenitore non ha focus (`use-list-navigation.ts:66`)**

```typescript
const target = containerRef?.current || document
target.addEventListener('keydown', handleKeyDown as EventListener)
```

Il listener `keydown` è registrato sul `div` contenitore. Il listener riceve gli eventi solo quando il focus DOM è sul contenitore stesso o su un suo discendente (per bubbling). Se il focus è su un elemento esterno alla lista (es. il bottone "Nuovo Movimento"), gli eventi non passano mai attraverso il contenitore e `handleKeyDown` non scatta mai.

Il problema 2 è una **conseguenza diretta del problema 1**: poiché il contenitore non ha `tabIndex`, il focus non può mai entrarci via Tab. La fix del problema 1 (aggiungere `tabIndex`) risolve anche il problema 2: una volta che il contenitore ha `tabIndex={0}`, l'utente può portarvi il focus con Tab, e da quel momento il listener sul contenitore riceve tutti gli eventi.

**Problema 3 — Handler `onKeyDown` duplicato sugli item (`TransactionsTab.tsx:133-138`)**

```tsx
onKeyDown={(event) => {
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    allTransactionsNav.setFocusedIndex(index)   // ← no-op, non apre il dialog
  }
}}
```

Questo handler React intercetta `Enter` e `Spazio` e chiama `setFocusedIndex(index)` — operazione no-op se l'item è già selezionato. **Non chiama mai `openEditTransactionDialog`**. L'apertura del dialog dipende esclusivamente dal listener dell'hook (`handleKeyDown`) che chiama `onEnter?.(focusedIndex)`. L'handler sull'item è codice morto che aggiunge confusione e una falsa sicurezza sull'accessibilità di `role="button"` con Spazio.

**Problema correlato — Spazio non gestito nell'hook**

La semantica ARIA per `role="button"` richiede che sia `Enter` sia `Spazio` attivino l'elemento. L'hook gestisce `Enter` ma non `Spazio`. Rimuovendo l'handler sull'item (problema 3), il tasto Spazio resterebbe senza effetto. La fix aggiunge Spazio all'hook contestualmente alla rimozione dell'handler sull'item.

---

## §4 — File coinvolti (ordine vincolante)

1. `src/hooks/use-list-navigation.ts`
2. `src/components/TransactionsTab.tsx`

---

## §5 — Modifiche dettagliate per ogni file

---

### Passo 1 — `src/hooks/use-list-navigation.ts`

**Obiettivo:** aggiungere il tasto Spazio come alias di Invio per la callback `onEnter`, in modo che la semantica ARIA per `role="button"` sia rispettata una volta rimosso l'handler duplicato sugli item.

#### Modifica 1a — Aggiungere Spazio alla condizione Enter in `handleKeyDown`

**Riga 53. Codice attuale:**

```typescript
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      callbacksRef.current.onEnter?.(focusedIndex)
```

**Codice nuovo:**

```typescript
    } else if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0) {
      e.preventDefault()
      callbacksRef.current.onEnter?.(focusedIndex)
```

**Motivazione:** `e.key === ' '` è il valore standard per il tasto Spazio (non `'Space'` né `'Spacebar'`). Aggiungendolo alla condizione di `Enter`, qualunque lista che usi `useListNavigation` e abbia `role="button"` sugli item rispetta la semantica ARIA senza modifiche ai component consumer. Il `e.preventDefault()` esistente previene lo scroll di pagina che Spazio normalmente attiverebbe su container scrollabili.

**Gate 1:**
```bash
npx tsc --noEmit
```
Atteso: 0 errori. La modifica è interna all'hook, nessun consumer cambia firma.

---

### Passo 2 — `src/components/TransactionsTab.tsx`

**Obiettivo:** (a) rendere il contenitore raggiungibile via Tab aggiungendo `tabIndex` dinamico; (b) auto-navigare al primo item quando il contenitore riceve il focus; (c) rimuovere l'handler `onKeyDown` duplicato e fuorviante sugli item.

---

#### Modifica 2a — Aggiungere `tabIndex` dinamico e `onFocus` al contenitore

**Riga 113. Codice attuale:**

```tsx
            <div className="divide-y max-h-[600px] overflow-y-auto" ref={transactionsListContainerRef}>
```

**Codice nuovo:**

```tsx
            <div
              className="divide-y max-h-[600px] overflow-y-auto"
              ref={transactionsListContainerRef}
              tabIndex={allTransactionsNav.focusedIndex < 0 ? 0 : -1}
              onFocus={(e) => {
                if (e.target === e.currentTarget && allTransactionsNav.focusedIndex < 0) {
                  allTransactionsNav.setFocusedIndex(0)
                }
              }}
            >
```

**Motivazione della logica `tabIndex` dinamico:**

| Condizione | `tabIndex` contenitore | Item selezionato |
|---|---|---|
| Nessun item selezionato (`focusedIndex < 0`) | `0` — il contenitore è nel tab order | tutti `tabIndex={-1}` |
| Item N selezionato (`focusedIndex >= 0`) | `-1` — il contenitore esce dal tab order | item N ha `tabIndex={0}` |

Questo implementa il pattern **roving tabindex** corretto: Tab entra nella lista attraverso il contenitore; una volta dentro, un solo elemento ha `tabIndex={0}` (il selezionato); Tab successivo esce dalla lista verso l'elemento focusable successivo nel DOM.

**Motivazione del guard `e.target === e.currentTarget`:**

L'evento `onFocus` in React usa `focusin` che fa bubbling. Quando `el.focus()` (nell'hook) porta il focus su un item figlio, l'evento `focusin` bolla fino al contenitore e riscatta `onFocus`. Il guard `e.target === e.currentTarget` assicura che `setFocusedIndex(0)` venga chiamato **solo** quando il contenitore stesso riceve il focus direttamente (via Tab), non quando il focus è su un figlio (via bubbling da `el.focus()`).

**Flusso completo dopo questa modifica:**

```
Tab → focus atterrato sul contenitore (tabIndex=0)
  → onFocus: e.target === e.currentTarget → setFocusedIndex(0)
  → re-render: contenitore tabIndex=-1, item 0 tabIndex=0
  → useEffect [focusedIndex]: el.focus() su item 0
  → focus DOM su item 0

Utente preme ArrowDown
  → keydown su item 0 → bubble → listener sul contenitore → setFocusedIndex(1)
  → el.focus() su item 1

Utente preme Enter (o Spazio o E)
  → keydown su item 1 → bubble → handleKeyDown sul contenitore
  → focusedIndex=1 >= 0 → onEnter(1) → openEditTransactionDialog → dialog aperto
```

---

#### Modifica 2b — Rimuovere l'handler `onKeyDown` dall'item div

**Righe 133-138. Codice attuale:**

```tsx
                     onKeyDown={(event) => {
                       if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                         event.preventDefault()
                         allTransactionsNav.setFocusedIndex(index)
                       }
                     }}
```

**Codice nuovo:** righe da eliminare completamente.

**Motivazione:** dopo la Modifica 1a, l'hook gestisce `Enter`, `Spazio`, `E`, `Canc`, `↑`, `↓`, `Home`, `End` tramite il listener nativo sul contenitore. L'handler sull'item:
- Non aggiunge nessun comportamento reale (`setFocusedIndex(index)` è no-op se l'item è già selezionato)
- Non apre il dialog (era il bug originale)
- Intercetta `'Spacebar'` che non è il valore standard (`e.key` restituisce `' '` per Spazio in tutti i browser moderni; `'Spacebar'` era un valore non standard di IE/Edge legacy)
- Crea una falsa dipendenza dall'ordine di propagazione nativo vs. sintetico per `Enter`

La rimozione è sicura perché il listener dell'hook sul contenitore riceve tutti i keydown tramite bubbling dagli item figli, senza bisogno di handler aggiuntivi sui singoli item.

**Gate 2:**
```bash
npx tsc --noEmit
npm run build
```
Atteso: 0 errori. Il `onKeyDown` rimosso non era parte di nessuna interfaccia tipizzata.

---

## §6 — Ordine di esecuzione

| Passo | File | Dipende da |
|---|---|---|
| Passo 1 | `use-list-navigation.ts` | — indipendente |
| Passo 2a | `TransactionsTab.tsx` — container | — indipendente (usa `allTransactionsNav.focusedIndex` già esposto dall'hook) |
| Passo 2b | `TransactionsTab.tsx` — rimozione onKeyDown | Passo 1 (senza la Modifica 1a, Spazio non funziona dopo la rimozione) |

I Passi 1 e 2a sono mutuamente indipendenti e possono essere eseguiti in qualunque ordine. Il Passo 2b deve seguire il Passo 1 per non rompere la semantica Spazio.

---

## §7 — Test di verifica

Eseguire manualmente nell'ordine indicato dopo aver completato tutti i passi.

| # | Scenario | Esito atteso |
|---|---|---|
| T1 | Tab dalla barra azioni fino alla lista movimenti (nessun click prima) | Focus atterrata sul contenitore lista; il primo item appare evidenziato |
| T2 | Dopo T1, premere ↓ due volte | Il terzo item viene evidenziato; la lista scrolla se necessario |
| T3 | Dopo T2, premere Invio | Dialog "Modifica Movimento" aperto con i dati del terzo item |
| T4 | Chiudere il dialog; Tab sulla lista; premere ↓ una volta; premere E | Dialog "Modifica Movimento" aperto con i dati del secondo item |
| T5 | Tab sulla lista; premere ↓; premere Spazio | Dialog "Modifica Movimento" aperto (semantica role="button" rispettata) |
| T6 | Tab sulla lista; premere ↓; premere Canc | Dialog di conferma eliminazione aperto |
| T7 | Cliccare un item con il mouse, poi premere Invio | Dialog "Modifica Movimento" aperto con i dati dell'item cliccato |
| T8 | Cliccare un item, poi premere E | Dialog "Modifica Movimento" aperto |
| T9 | Cliccare un item, poi premere Spazio | Dialog "Modifica Movimento" aperto |
| T10 | Con dialog di modifica aperto, premere Invio o E | La lista sottostante non reagisce; il dialog rimane aperto senza cambio di stato |
| T11 | Tab sulla lista; premere Home; premere Invio | Dialog "Modifica Movimento" sul primo item della lista |
| T12 | Tab sulla lista; premere End; premere Invio | Dialog "Modifica Movimento" sull'ultimo item della lista |
| T13 | Tab sulla lista; Tab di nuovo (senza premere frecce) | Il focus esce dalla lista (roving tabindex: Tab esce dopo che `el.focus()` ha portato focus sull'item 0 con `tabIndex=0`) |
| T14 | Verificare che il bottone "Nuovo Movimento" e il bottone "Esporta CSV" continuino a funzionare | Nessuna regressione sulle azioni esterne alla lista |

---

## §8 — File da non toccare

| File | Motivo |
|---|---|
| `src/components/DashboardTab.tsx` | Ha il proprio `useListNavigation` per la lista recenti; non coinvolto in questo bug |
| `src/context/AppDataContext.tsx` | Non coinvolto |
| `src/components/DialogsOverlay.tsx` | Non coinvolto |
| `src/components/TransactionDialog.tsx` | Non coinvolto |
| `src/hooks/use-app-shortcuts.ts` | Non coinvolto |
| `src/hooks/use-keyboard-shortcuts.ts` | Non coinvolto |
| `src/lib/types.ts` | Nessuna modifica ai tipi necessaria |
| Qualunque file sotto `.github/` | Protetto dal framework guard |

---

## §9 — Rischi e attenzioni

| Rischio | Mitigazione |
|---|---|
| Il `tabIndex` dinamico sul contenitore cambia da `0` a `-1` durante il re-render innescato da `onFocus`. Tra il momento in cui `onFocus` chiama `setFocusedIndex(0)` e il momento in cui `el.focus()` porta il focus sull'item, il contenitore ha ancora il focus DOM. Il passaggio è istantaneo ma se il browser emette un secondo evento `focus` durante la transizione, l'`onFocus` potrebbe riscattare. | Il guard `e.target === e.currentTarget` nel handler previene la riesecuzione quando il focus è sui figli. Nessuna doppia chiamata. |
| `DashboardTab.tsx` usa lo stesso hook `useListNavigation`. La Modifica 1a (Spazio come Enter) si applica anche alla lista recenti nel Dashboard. | La lista recenti ha gli stessi `role="button"` e la stessa logica di modifica (`openEditTransactionDialog`). Spazio su un item recente aprirà il dialog di modifica — comportamento corretto e coerente. |
| Il Passo 2b rimuove il `event.preventDefault()` sul tasto Spazio che era nell'handler dell'item. Senza di esso, Spazio potrebbe scorrere il contenitore. | Il Passo 1 aggiunge `e.preventDefault()` nel listener dell'hook per `' '` (Spazio). Il listener nativo sul contenitore fa `preventDefault()` prima che il browser possa innescare lo scroll. |
| `'Spacebar'` rimosso dall'item `onKeyDown`: questo valore non-standard era usato per compatibilità con browser legacy. | `e.key === ' '` (stringa con uno spazio) è il valore corretto per tutti i browser moderni (Chrome, Firefox, Safari, Edge). `'Spacebar'` era usato da IE11 e vecchie versioni di Edge legacy. Il progetto non supporta questi browser. |
| Se `sortedTransactions` è vuoto al momento del `setFocusedIndex(0)` nell'`onFocus`, l'hook non fa nulla (il guard interno `if (index >= 0 && index < itemCount)` blocca). | Il contenitore con `tabIndex` dinamico è renderizzato solo nel ramo `visibleTransactions.length > 0`, quindi `sortedTransactions.length > 0` è sempre vero quando quel div esiste nel DOM. Il guard è comunque un secondo livello di protezione. |

---

## §10 — Gate finale P39

```bash
npx tsc --noEmit
npm run build
```

Entrambi devono restituire exit 0 senza errori.

Verifiche manuali obbligatorie: T1–T14 della sezione §7 devono passare tutti.

```bash
git diff --name-only HEAD | grep ".github"
```

Output atteso: vuoto. Nessun file sotto `.github/` deve essere modificato.
