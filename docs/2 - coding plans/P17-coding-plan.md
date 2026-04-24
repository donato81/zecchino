# P17 — Coding Plan: Fix navigazione frecce e accessibilità liste

> Documento operativo.  
> Fase: Plan → Code  
> Pacchetto: 17 — **Quarto passo post-refactoring — primo passo che modifica `src/`**  
> Design di riferimento: `docs/1 - projects/P17-list-navigation-a11y-design.md`  
> Data: 24 aprile 2026

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P16.
- ⚠️ **Questo è il primo passo che tocca codice applicativo sotto `src/`** — un cambiamento strutturale rispetto a P14, P15 e P16 che operavano esclusivamente su configurazione, dipendenze e documentazione.
- **Quattro file modificati** (design §2.1):
  1. `src/hooks/use-list-navigation.ts`
  2. `src/components/DashboardTab.tsx`
  3. `src/components/TransactionsTab.tsx`
  4. `src/components/FocusIndicator.tsx`
- **Nessun nuovo file creato** nel repository eccetto i documenti di questo passo.
- **Pattern tecnico adottato**: roving tabindex con focus DOM reale (design §3.1). Non si usa `aria-activedescendant` — il focus DOM si sposta effettivamente sull'elemento, il che è il meccanismo più robusto e universalmente supportato dagli screen reader.
- **Guard dialogo**: query `[data-state="open"][aria-modal="true"]` (design §7.3 — versione raffinata; cattura solo i dialog modali, esclude Tooltip e Popover Radix non modali).
- `.github/` è protetto da `framework-guard.instructions.md`: nessuna operazione di questo passo lo tocca.

### File che restano invariati

| File / Area | Motivazione |
|---|---|
| `src/hooks/use-keyboard-shortcuts.ts` | Menzionato nel design §5 per la relazione con listener concorrenti — non modificato in P17 |
| `src/hooks/use-app-shortcuts.ts` | Non coinvolto |
| `src/hooks/use-visible-data.ts` | Non coinvolto — design §8 esclude esplicitamente la promozione a Provider |
| `src/hooks/use-mobile.ts`, tutti gli altri hook | Non coinvolti |
| `src/App.tsx` | Non coinvolto — design §8 esclude il fix §3.4 (useEffect dipendenze instabili) |
| `src/context/AppDataContext.tsx`, `src/context/AuthContext.tsx` | Non coinvolti |
| `src/components/TransactionDialog.tsx` | Non coinvolto — design §5.2 e §8 |
| `src/components/AccountDialog.tsx` | Non coinvolto |
| `src/components/BudgetDialog.tsx` | Non coinvolto |
| `src/components/PinDialog.tsx` | Non coinvolto |
| `src/components/DeleteDialog.tsx` | Non coinvolto |
| Tutti gli altri file in `src/components/` | Non coinvolti |
| `src/lib/` (tutti i file) | Non coinvolti |
| `eslint.config.js` | Creato in P15 — invariato |
| `package.json` | Aggiornato in P16 — invariato |
| `tailwind.config.js`, `tsconfig.json`, `vite.config.ts` | Non coinvolti |
| `components.json`, `theme.json`, `index.html` | Non coinvolti |
| `runtime.config.json`, `spark.meta.json` | Non coinvolti |
| `.github/` | Protetto da `framework-guard.instructions.md` |

### Tabella riepilogativa

| Operazione | File | Modifica principale |
|---|---|---|
| Modificato | `src/hooks/use-list-navigation.ts` | `callbacksRef`, guard dialogo, `useEffect` focus DOM |
| Modificato | `src/components/DashboardTab.tsx` | `containerRef`, `useCallback`, attributi accessibilità righe |
| Modificato | `src/components/TransactionsTab.tsx` | `containerRef`, `useCallback`, attributi accessibilità righe |
| Modificato | `src/components/FocusIndicator.tsx` | Condizione `data-list-item` nel selettore |
| **0 file sotto `src/`** | tutti gli altri | **invariati** |

---

## Ambiguità rilevate

Le seguenti ambiguità sono state **verificate sul repository reale** sul branch `refactoring-architettura` con lettura diretta dei file sorgente prima della stesura di questo piano.

---

### AI1 — Stato attuale di `src/hooks/use-list-navigation.ts`

**Verifica eseguita**: lettura completa del file (90 righe).

**Firma attuale del hook:**

```typescript
interface UseListNavigationProps {
  itemCount: number
  onEnter?: (index: number) => void
  onDelete?: (index: number) => void
  onEdit?: (index: number) => void
  enabled?: boolean
  containerRef?: RefObject<HTMLElement>
}

export function useListNavigation({
  itemCount, onEnter, onDelete, onEdit,
  enabled = true, containerRef
}: UseListNavigationProps)

// Valore di ritorno:
{ focusedIndex, setFocusedIndex: setFocus, resetFocus, isFocused: (index: number) => index === focusedIndex }
```

**`containerRef`**: già presente nell'interfaccia come parametro opzionale. La prima riga del `useEffect` di registrazione usa già `const target = containerRef?.current || document` — quindi se il consumer passa un ref, il listener si registra sul container; se non lo passa, usa `document`. La modifica richiesta non è aggiungere `containerRef` all'interfaccia (c'è già) ma **fare in modo che i consumer lo passino** (attualmente né DashboardTab né TransactionsTab lo passano).

**`callbacksRef`**: non presente. Le callback `onEnter`, `onDelete`, `onEdit` sono nella closure del `useCallback` di `handleKeyDown`. Le dipendenze di `handleKeyDown` sono `[enabled, itemCount, focusedIndex, onEnter, onDelete, onEdit]` — se le callback cambiano identità (inline nei consumer), `handleKeyDown` viene ricreato ad ogni render, il che fa rieseguire il `useEffect` di registrazione del listener (`[handleKeyDown, containerRef]`), causando remove+add del listener ad ogni render.

**Guard per dialoghi**: non presente.

**Chiamata `.focus()`**: non presente. Il hook aggiorna solo `focusedIndex` (stato React), non sposta mai il focus DOM.

**Tasti gestiti**: ArrowDown, ArrowUp, Home, End, Enter, Delete, e/E.

**`useEffect` di sincronizzazione itemCount** (secondo `useEffect`): presente — resetta o aggiusta `focusedIndex` quando `itemCount` cambia. Non va toccato.

**Intervento richiesto**: aggiungere `callbacksRef`, guard dialogo, `useEffect` per focus DOM. Il `containerRef` nell'interfaccia è già corretto; il consumer deve passarlo.

---

### AI2 — Stato attuale di `src/components/DashboardTab.tsx`

**Verifica eseguita**: lettura completa del file, sezioni hook call (~riga 58-82) e lista Movimenti Recenti (~righe 305-390).

**Chiamata al hook** (righe ~58-82):

```typescript
const recentTransactionsNav = useListNavigation({
  itemCount: recentTransactions.length,
  enabled: isAuthenticated,
  onEnter: (index) => { ... },   // funzione inline
  onDelete: (index) => { ... },  // funzione inline
  onEdit: (index) => { ... },    // funzione inline
})
```

`containerRef`: **non passato**. Le callback sono **funzioni inline** — non avvolte in `useCallback` — causano il churn descritto in AI1.

**`useRef` per container lista**: **non presente** nel file.

**Struttura JSX della riga** (riga ~327):

```jsx
<div
  key={transaction.id}
  className={`p-4 flex items-center justify-between transition-all ${
    isFocused ? 'bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20' : 'hover:bg-muted/50'
  }`}
  onClick={() => recentTransactionsNav.setFocusedIndex(index)}
  data-focus-info={`Movimento: ${...} - ... - Premi Enter per modificare`}
>
```

Attributi **mancanti**: `tabIndex`, `role`, `aria-label`, `data-list-item`, `data-index`.

**Container della lista** (il `<div className="divide-y">` che racchiude il map): riga ~322.

**`isFocused`** (AI5 per DashboardTab): `const isFocused = recentTransactionsNav.isFocused(index)` — variabile locale calcolata all'interno del `map`, riga ~328.

**Warning ESLint esistenti** (baseline P15/P16):
- Riga 327: `jsx-a11y/click-events-have-key-events` — div con onClick senza keyboard handler
- Riga 327: `jsx-a11y/no-static-element-interactions` — elemento non-interattivo con event handler

**Riduzione attesa dei warning**: aggiungendo `role="button"` e `tabIndex` la riga diventa un elemento interattivo, risolvendo entrambi i warning. Impatto atteso: baseline passa da 59 a ≤57 warning (2 warning risolti in DashboardTab; altri 2 simili in TransactionsTab → potenziale riduzione a ≤55).

**Nota su TalkBack** (AI6 + CSS): `src/index.css` contiene una regola `body.talkback-enhanced-targets [role="button"] { min-height: 56px; min-width: 56px }`. Dopo l'aggiunta di `role="button"` alle righe, questa regola si attiverà in modalità TalkBack Enhanced Targets — le righe avranno un'altezza minima di 56px. Questo è il comportamento corretto per l'accessibilità su Android. Non è una regressione.

---

### AI3 — Stato attuale di `src/components/TransactionsTab.tsx`

**Verifica eseguita**: lettura completa del file, sezioni hook call (~righe 37-57) e lista sortedTransactions (~righe 108-170).

**Chiamata al hook** (righe ~37-57):

```typescript
const allTransactionsNav = useListNavigation({
  itemCount: sortedTransactions.length,
  enabled: isAuthenticated,
  onEnter: (index) => { ... },   // funzione inline
  onDelete: (index) => { ... },  // funzione inline
  onEdit: (index) => { ... },    // funzione inline
})
```

`containerRef`: **non passato**. Callback: **inline**, stesso churn di DashboardTab.

**`useRef` per container**: **non presente**.

**Struttura JSX della riga** (riga ~119):

```jsx
<div
  key={transaction.id}
  className={`p-4 flex items-center justify-between transition-all ${
    isFocused ? 'bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20' : 'hover:bg-muted/50'
  }`}
  onClick={() => allTransactionsNav.setFocusedIndex(index)}
  data-focus-info={`Movimento: ${...} - ... - Premi Enter per modificare`}
>
```

Attributi **mancanti**: stessi di DashboardTab.

**Container della lista** (`<div className="divide-y max-h-[600px] overflow-y-auto">`): riga ~113.

**Variabili rilevanti già presenti nel map** (importanti per costruire `aria-label`):
- `const account = visibleAccounts.find(...)` — conto di addebito
- `const destAccount = ...` — conto destinazione (solo trasferimenti, può essere `null`)
- `const category = safeCategories.find(...)` — categoria (può essere `undefined`)
- `const isIncome = transaction.tipo === 'entrata'`
- `const isTransfer = transaction.tipo === 'trasferimento'`
- `const isFocused = allTransactionsNav.isFocused(index)` — variabile locale

**Warning ESLint esistenti**: righe 119: `click-events-have-key-events` e `no-static-element-interactions` — stessi di DashboardTab. Entrambi risolti dall'aggiunta di `role="button"`.

**Nota `isMobile`**: riga 28 — `'isMobile' is assigned a value but never used` (warning già presente nel baseline). Non toccare.

---

### AI4 — Stato attuale di `src/components/FocusIndicator.tsx`

**Verifica eseguita**: lettura completa del file (150 righe).

**Condizioni attuali di `handleFocusIn`** (righe ~26-35):

```typescript
if (
  target.tagName === 'INPUT' ||
  target.tagName === 'BUTTON' ||
  target.tagName === 'A' ||
  target.tagName === 'SELECT' ||
  target.tagName === 'TEXTAREA' ||
  target.getAttribute('role') === 'button' ||
  target.getAttribute('tabindex') === '0' ||
  target.closest('[data-focus-info]')
) {
```

**`data-list-item`**: non presente nella condizione.

**Costruzione del tooltip** (riga ~36-40): ordine di priorità `dataFocusInfo || ariaLabel || title || buttonText`.

**Osservazione critica (AI4)**: le righe in DashboardTab e TransactionsTab hanno **già** `data-focus-info` — la condizione `target.closest('[data-focus-info]')` le cattura già oggi se ricevono focus. Dopo l'aggiunta di `tabIndex` (Sotto-operazioni 2 e 3), le righe potranno ricevere focus e `data-focus-info` garantirà la cattura da FocusIndicator. L'aggiunta di `data-list-item` nella condizione (Sotto-operazione 4) è comunque raccomandata per:
- Esplicitezza semantica (la condizione esprime chiaramente che le list row sono supportate)
- Robustezza contro edge case di timing: se `.focus()` viene chiamato prima che il re-render abbia aggiornato `tabIndex` da -1 a 0, la condizione `tabindex=0` e la condizione `role=button` potrebbero non scattare; `data-list-item` è stabile indipendentemente dallo stato del re-render
- Corretta cattura anche quando `isFocused` è ancora false nel JSX (es. focus programmatico durante animazione)

---

### AI5 — Struttura `isFocused` nelle righe

Entrambi i componenti usano lo stesso pattern: variabile locale calcolata **dentro il `map`** prima del `return (`:

- DashboardTab: `const isFocused = recentTransactionsNav.isFocused(index)`
- TransactionsTab: `const isFocused = allTransactionsNav.isFocused(index)`

La condizione per `tabIndex` sarà in entrambi i casi: `tabIndex={isFocused ? 0 : -1}`.

---

### AI6 — Stili di focus esistenti nel progetto

**Verifica eseguita**: lettura di `src/index.css`, `src/main.css`, prime 80 righe di `tailwind.config.js`.

**Stato attuale**: nessuna regola `outline: none` globale per elementi con focus. Non esiste un reset dell'outline del browser nelle liste. Tailwind v4 di default non applica `outline: none` ai `div` — il browser applicherà l'outline di default (tipicamente un anello blu in Chromium, un bordo punteggiato in Firefox) quando un `div` con `tabIndex` riceve focus.

**Rischio confermato** (design §7.1): l'outline nativo del browser si sovrapporrà all'highlight CSS esistente (`ring-2 ring-accent/20` + `border-l-4 border-l-accent`), creando un doppio bordo visivo.

**Mitigazione richiesta**: aggiungere `focus:outline-none` alla `className` delle righe. Usare `focus:outline-none` (non `outline-none` senza variante) per applicarlo solo allo stato focus. Mantenere il `ring-2 ring-accent/20` condizionale a `isFocused` come unico indicatore visivo di focus per la modalità tastiera.

Nota: `focus-visible:ring-0` NON è necessario qui perché il `ring` esistente nel `className` condizionale è già applicato solo quando `isFocused` è true — non è sovrapposto al ring di focus-visible del browser. Il problema è solo l'outline nativo che si aggiunge indipendentemente dal ring CSS.

---

## Rischi

### R1 — Regressione comportamento visivo — 🔴 Alto

**Problema**: il focus DOM attiva l'outline nativo del browser sulle righe `div` con `tabIndex`. Questo si sovrappone all'highlight CSS esistente (`ring-2 ring-accent/20`).

**Mitigazione**: aggiungere `focus:outline-none` alla `className` di ogni riga in DashboardTab e TransactionsTab (confermato necessario in AI6). Il ring CSS condizionale rimane l'unico indicatore visivo.

**Gate**: verifica visiva manuale post-build in un browser (Chrome e Firefox) — le righe devono mostrare solo il bordo colorato, non un outline aggiuntivo.

### R2 — Regressione funzionale — 🔴 Alto

**Problema**: P17 è il primo passo che modifica codice in `src/`. Qualsiasi errore TypeScript o di runtime rompe il build o il comportamento dell'app.

**Mitigazione**: `npm run build` dopo ogni sotto-operazione. Se il build si rompe → rollback immediato della sotto-operazione in corso, analisi dell'errore, correzione prima di procedere. Non accumulare modifiche tra una verifica build e la successiva.

### R3 — `aria-label` troppo verbosi — 🟡 Medio

**Problema**: etichette lunghe rallentano la navigazione con TalkBack e VoiceOver.

**Mitigazione**: limitare a tipo + descrizione/categoria + importo formattato + data. Soglia: ~60 caratteri in media. Il nome del conto è opzionale; la categoria è opzionale in DashboardTab dove lo spazio è più limitato. Il `data-focus-info` (più verboso) serve a FocusIndicator, non all'`aria-label` principale.

### R4 — Guard dialogo con falsi positivi — 🟡 Medio

**Problema**: la query `[data-state="open"][role="dialog"]` cattura anche Popover Radix che non sono dialog modali.

**Mitigazione**: usare `[data-state="open"][aria-modal="true"]` (design §7.3). Radix applica `aria-modal="true"` solo ai dialog modali veri. Tooltip e Popover non hanno `aria-modal="true"`.

### R5 — Churn listener per callback instabili — 🟡 Medio

**Problema**: le callback inline in DashboardTab e TransactionsTab cambiano identità ad ogni render, causando ri-registrazione del listener. Confermato in AI2 e AI3.

**Mitigazione primaria**: `callbacksRef` interno al hook (Sotto-operazione 1) — il listener si registra una sola volta, legge le callback dal ref al momento dell'invocazione. **Mitigazione secondaria**: wrappare le callback in `useCallback` nei due consumer (Sotto-operazioni 2 e 3) — riduce il numero di re-render che aggiornano il ref, ma non è strettamente necessaria se `callbacksRef` è implementato correttamente.

### R6 — Modifica accidentale di file fuori perimetro — 🟢 Basso

**Mitigazione**: `git diff --stat` alla fine mostra esattamente i quattro file attesi. Gate obbligatorio prima di dichiarare P17 completato.

### R7 — TalkBack `min-height` applicato alle righe — 🟢 Basso

**Problema**: `src/index.css` contiene `body.talkback-enhanced-targets [role="button"] { min-height: 56px }`. Aggiungendo `role="button"` alle righe, questa regola si attiva in modalità TalkBack Enhanced Targets, aumentando l'altezza delle righe a 56px.

**Valutazione**: questo è il comportamento corretto — righe più alte sono più facili da toccare su Android. Non è una regressione ma un miglioramento dell'accessibilità mobile. Non richiede intervento.

---

## Problemi fuori perimetro di P17

I seguenti problemi del report diagnostico (`docs/4 - reports/Diagnostic-Analysis-Post-P13.md`) sono **esplicitamente esclusi** da P17 (design §8):

| Problema | Sezione report | Motivo esclusione |
|---|---|---|
| `useVisibleData` chiamato in più consumer | §3.3 | Ottimizzazione di performance separata — passo dedicato |
| `App.tsx` useEffect dipendenze instabili | §3.4 | Richiede analisi `useScreenReader()` — passo dedicato |
| Destrutturazioni inutilizzate (`DashboardTab.tsx` §3.6) | §3.6 | Cleanup variabili — passo separato |
| Test automatici (Vitest, Playwright) | §3.7 | Infrastruttura di test — passo separato |

Questi problemi **non devono essere toccati** durante l'esecuzione di P17, nemmeno se il Code agent li rileva incidentalmente.

---

## Nota sulla riduzione dei warning ESLint attesa

Il baseline P15/P16 è 59 warning (exit code 0). Dopo P17 è attesa una **riduzione** del conteggio per effetto collaterale delle modifiche:

| Riga | File | Warning attuale | Causa risoluzione |
|---|---|---|---|
| 327:21 | `DashboardTab.tsx` | `jsx-a11y/click-events-have-key-events` | `role="button"` rende l'elemento interattivo |
| 327:21 | `DashboardTab.tsx` | `jsx-a11y/no-static-element-interactions` | `role="button"` rende l'elemento interattivo |
| 119:19 | `TransactionsTab.tsx` | `jsx-a11y/click-events-have-key-events` | `role="button"` rende l'elemento interattivo |
| 119:19 | `TransactionsTab.tsx` | `jsx-a11y/no-static-element-interactions` | `role="button"` rende l'elemento interattivo |

Riduzione attesa: da 59 a **≤55 warning** (4 warning risolti). Se il conteggio dopo P17 è tra 55 e 59 inclusi, è un risultato accettabile. Se il conteggio aumenta rispetto a 59, analizzare i nuovi warning prima di dichiarare il passo completato.

Possibile warning nuovo da ESLint: l'aggiunta di `tabIndex={isFocused ? 0 : -1}` alle righe potrebbe generare il warning `jsx-a11y/no-noninteractive-tabindex` se ESLint considera la riga come elemento non-interattivo. Con `role="button"` la riga è interattiva, quindi il warning non dovrebbe comparire. Verificare nell'output lint post-modifica.

---

## Passo unico — Fix navigazione frecce e accessibilità liste

### Schema riepilogativo

```
Passo 17 — Fix navigazione frecce e accessibilità liste
│
├── Sotto-operazione 1 — use-list-navigation.ts
│   ├── Aggiungere callbacksRef (useRef per onEnter/onDelete/onEdit)
│   ├── Aggiungere useEffect aggiornamento callbacksRef (nessuna dep → ogni render)
│   ├── Modificare handleKeyDown per leggere callback da callbacksRef.current
│   ├── Modificare useEffect listener: rimuovere callback dalle dipendenze
│   ├── Aggiungere guard dialogo in handleKeyDown
│   ├── Aggiungere useEffect focus DOM ([focusedIndex])
│   └── Verifica: npm run build → exit 0
│
├── Sotto-operazione 2 — DashboardTab.tsx
│   ├── Aggiungere useRef<HTMLDivElement>(null) per container lista
│   ├── Passare containerRef al hook recentTransactionsNav
│   ├── Wrappare callback in useCallback
│   ├── Assegnare ref al container div della lista
│   ├── Aggiungere tabIndex, role, aria-label, data-list-item, data-index,
│   │   focus:outline-none a ogni riga
│   └── Verifica: npm run build → exit 0
│
├── Sotto-operazione 3 — TransactionsTab.tsx
│   ├── Stesse modifiche di DashboardTab per allTransactionsNav
│   ├── aria-label esteso con dettaglio trasferimento e categoria
│   └── Verifica: npm run build → exit 0
│
├── Sotto-operazione 4 — FocusIndicator.tsx
│   ├── Aggiungere condizione data-list-item al handleFocusIn
│   └── Verifica: npm run build → exit 0
│
└── Sotto-operazione 5 — Verifica finale
    ├── npm run build → exit 0
    ├── npm run lint → exit 0 (≤59 warning, atteso ≤55)
    ├── git diff --stat → quattro file attesi
    ├── Verifica focus DOM manuale (DevTools)
    ├── Verifica guard dialogo
    └── Verifica screen reader (TalkBack / VoiceOver)
```

---

### Sotto-operazione 1 — `src/hooks/use-list-navigation.ts`

> **Rischio prevalente**: 🔴 R2 (regressione funzionale) — la logica dell'hook è la base di tutta la navigazione.
> **Prerequisito**: P01–P16 completati; branch `refactoring-architettura`.

#### 1.1 Struttura del `callbacksRef`

Aggiungere un `useRef` interno che mantiene le versioni aggiornate delle callback. Il ref viene aggiornato ad ogni render (nessun array di dipendenze → ogni render) ma il listener viene registrato una sola volta. L'handler legge le callback dal ref nel momento dell'invocazione, garantendo di usare sempre la versione più recente senza dover ri-registrare il listener.

Questo `useRef` deve essere tipizzato per contenere i valori di `onEnter`, `onDelete`, `onEdit` (tutti opzionali, stessa firma di `UseListNavigationProps`). Un `useEffect` senza array di dipendenze (che si esegue ad ogni render) aggiorna il contenuto del ref.

**Struttura concettuale** (in linguaggio naturale — non codice, solo descrizione dell'effetto):
- Aggiungere: `const callbacksRef = useRef<{ onEnter, onDelete, onEdit }>({ ... })`
- Aggiungere: `useEffect(() => { callbacksRef.current = { onEnter, onDelete, onEdit } })` — senza array di dipendenze
- Modificare: dentro `handleKeyDown`, sostituire le chiamate dirette `onEnter?.(focusedIndex)` con `callbacksRef.current.onEnter?.(focusedIndex)` (e analoghe per `onDelete` e `onEdit`)
- Modificare: le dipendenze di `handleKeyDown` (`useCallback`) rimuovono `onEnter`, `onDelete`, `onEdit` — che non sono più nella closure. Le dipendenze diventano: `[enabled, itemCount, focusedIndex]` (o escludendo anche `focusedIndex` se viene letto dal ref — ma `focusedIndex` è usato per i controlli `focusedIndex >= 0`, quindi deve restare nelle dipendenze)

⚠️ Nota: `focusedIndex` resta nelle dipendenze di `handleKeyDown` perché è usato in `e.key === 'Enter' && focusedIndex >= 0` e simili. Non è eliminabile dalle dipendenze. Questo significa che `handleKeyDown` cambia ancora quando `focusedIndex` cambia. Il beneficio del `callbacksRef` è eliminare il churn per i cambiamenti di callback, non quello per i cambiamenti di indice (che è accettabile).

#### 1.2 Guard dialogo

**Prima istruzione** di `handleKeyDown`, prima di qualsiasi controllo sui tasti:

Verificare se nel documento è presente un elemento con `data-state="open"` E `aria-modal="true"`. Se sì, restituire senza elaborare il tasto.

Nota sulla query: `[data-state="open"][aria-modal="true"]` cattura solo i dialog modali Radix (Dialog, AlertDialog). Non cattura Tooltip (`role="tooltip"`), Popover, Select, DropdownMenu — che Radix non marca con `aria-modal="true"` perché non sono modali bloccanti.

#### 1.3 `useEffect` per focus DOM

Aggiungere un terzo `useEffect` (separato dall'`useEffect` di registrazione del listener e dall'`useEffect` di sincronizzazione `itemCount`) che dipende da `focusedIndex`.

Questo effetto si esegue **dopo ogni render in cui `focusedIndex` è cambiato**. Al suo interno:
1. Verificare che `containerRef?.current` esista.
2. Verificare che `focusedIndex >= 0` (non spostare il focus se l'indice è -1, cioè nessuna riga selezionata).
3. Interrogare il container con: `containerRef.current.querySelector('[data-list-item][data-index="N"]')` dove N è il valore corrente di `focusedIndex`.
4. Se l'elemento esiste, chiamare `.focus()` su di esso.

⚠️ Perché in un `useEffect` e non inline nell'handler: chiamare `.focus()` inline nell'handler (prima che React completi il rendering del nuovo stato) può causare problemi di timing — il componente consumer non ha ancora aggiornato `tabIndex` sugli elementi nel DOM (da -1 a 0 per il nuovo indice). Il `useEffect` si esegue dopo il commit nel DOM, garantendo che l'elemento abbia già `tabIndex=0` e che il DOM sia stabile.

⚠️ Il `useEffect` dipende da `[focusedIndex, containerRef]`. Se `containerRef` non viene fornito dal consumer (fallback su `document`), il focus DOM non avviene — il comportamento precedente è preservato per i contesti legacy senza containerRef.

#### 1.4 Verifica intermedia 1

Dopo le modifiche al hook:
```
npm run build
```
Atteso: exit code 0. Se il build si rompe, è un errore TypeScript nel hook: correggere prima di procedere.

---

### Sotto-operazione 2 — `src/components/DashboardTab.tsx`

> **Rischio prevalente**: 🔴 R1 (outline browser), 🔴 R2 (regressione funzionale)
> **Prerequisito**: Sotto-operazione 1 completata; build verde.

#### 2.1 `useRef` per il container della lista

Aggiungere all'inizio del corpo della funzione `DashboardTab` (dopo le dichiarazioni esistenti, prima del `return`):

```
const recentListContainerRef = useRef<HTMLDivElement>(null)
```

Importare `useRef` da `react` nella riga degli import (dove già compaiono `useState`, `useCallback` o altri hook react — aggiungere `useRef` all'import esistente da `'react'`; verificare se è già importato).

#### 2.2 Passare `containerRef` al hook e stabilizzare le callback

Modificare la chiamata a `useListNavigation` (righe ~58-82) per:
1. Aggiungere `containerRef: recentListContainerRef` come parametro
2. Avvolgere `onEnter`, `onDelete`, `onEdit` in `useCallback` con le dipendenze corrette

Per `onEnter` e `onEdit` (identico comportamento: aprono il dialog di modifica): le dipendenze sono `[recentTransactions, setEditingTransaction, setShowTransactionDialog]`. Per `onDelete`: `[recentTransactions, setDeletingItem, setShowDeleteDialog]`.

⚠️ `react-hooks/exhaustive-deps` (attivo da P15) genererebbe un warning se le dipendenze sono incomplete. Includere tutte le variabili usate dentro la callback.

#### 2.3 Assegnare il ref al container della lista

Nella sezione JSX "Movimenti Recenti", trovare il `<div className="divide-y">` che contiene il `.map()` (riga ~322). Aggiungere `ref={recentListContainerRef}` a questo elemento.

#### 2.4 Attributi di accessibilità su ogni riga

Nella riga `<div key={transaction.id} ...>` (riga ~327), aggiungere gli attributi seguenti:

**`tabIndex={isFocused ? 0 : -1}`**

Implementa il roving tabindex: un solo elemento della lista ha `tabIndex=0` (la riga attiva), tutti gli altri hanno `tabIndex=-1`. Se nessuna riga è attiva (`focusedIndex === -1`), nessuna riga ha `tabIndex=0` — l'ingresso iniziale nella lista avviene tramite Tab su un elemento esterno che poi attiva le frecce.

**`role="button"`**

Dichiarazione semantica: la riga è un elemento interattivo attivabile. Risolve i warning `jsx-a11y/click-events-have-key-events` e `jsx-a11y/no-static-element-interactions` sulla riga 327.

**`aria-label`**

Formato: `"{tipo}: {descrizione o categoria}, {importo formattato}, {data formattata}, {nome conto}"`

Valori:
- `{tipo}`: `isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'`
- `{descrizione o categoria}`: `transaction.descrizione || category?.nome || 'Movimento'`
- `{importo formattato}`: `formatCurrency(transaction.importo)` (già usato nel rendering)
- `{data formattata}`: `new Date(transaction.data).toLocaleDateString('it-IT')` (già usato nel rendering)
- `{nome conto}`: `account?.nome || ''`

Obiettivo di lunghezza: ~60 caratteri medi. Se i dati reali mostrano etichette sistematicamente più lunghe, il nome del conto può essere omesso.

**`data-list-item`** — attributo senza valore, identifica la riga come elemento navigabile dal hook

**`data-index={index}`** — indice numerico per il targeting del querySelector del hook

**`focus:outline-none`** — aggiunto alla `className` per eliminare il doppio bordo (browser outline + CSS ring) confermato necessario in AI6

La `className` condizionale esistente (`isFocused ? '...' : 'hover:bg-muted/50'`) rimane invariata — si aggiunge solo `focus:outline-none` alla stringa template.

#### 2.5 Verifica intermedia 2

```
npm run build
```
Atteso: exit code 0. Se si rompe, verificare:
- Import di `useRef` e `useCallback` da react
- Tipizzazione corretta del ref
- Nessun errore TypeScript nella costruzione dell'`aria-label`

---

### Sotto-operazione 3 — `src/components/TransactionsTab.tsx`

> **Rischio prevalente**: 🔴 R1 (outline), 🔴 R2 (regressione funzionale), 🟡 R3 (aria-label verbosità per righe con trasferimento + categoria)
> **Prerequisito**: Sotto-operazione 2 completata; build verde.

Le modifiche sono simmetriche alla Sotto-operazione 2 con le differenze seguenti.

#### 3.1 `useRef` per il container

```
const transactionsListContainerRef = useRef<HTMLDivElement>(null)
```

Aggiungere `useRef` all'import da `react` se non già presente.

#### 3.2 Passare `containerRef` al hook e stabilizzare le callback

Modificare la chiamata a `useListNavigation` (righe ~37-57) aggiungendo `containerRef: transactionsListContainerRef` e avvolgendo le callback in `useCallback`.

Dipendenze per `onEnter`/`onEdit`: `[sortedTransactions, setEditingTransaction, setShowTransactionDialog]`.
Dipendenze per `onDelete`: `[sortedTransactions, setDeletingItem, setShowDeleteDialog]`.

#### 3.3 Assegnare il ref al container

Il container della lista è `<div className="divide-y max-h-[600px] overflow-y-auto">` (riga ~113). Aggiungere `ref={transactionsListContainerRef}`.

#### 3.4 Attributi di accessibilità su ogni riga (con `aria-label` esteso)

Stessi attributi di DashboardTab: `tabIndex`, `role="button"`, `data-list-item`, `data-index`, `focus:outline-none`.

**`aria-label` esteso per TransactionsTab** — formato completo:

`"{tipo}: {descrizione o categoria}, {importo formattato}, {data formattata}, {nome conto}{dettaglio trasferimento}{dettaglio categoria}"`

Dove:
- `{tipo}`: `isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'`
- `{descrizione o categoria}`: `transaction.descrizione || category?.nome || 'Movimento'`
- `{importo formattato}`: `formatCurrency(transaction.importo)`
- `{data formattata}`: `new Date(transaction.data).toLocaleDateString('it-IT')`
- `{nome conto}`: `account?.nome || ''`
- `{dettaglio trasferimento}`: se `isTransfer && destAccount` → ` → ${destAccount.nome}`; altrimenti stringa vuota
- `{dettaglio categoria}`: se `category && !isTransfer` → `, ${category.nome}`; altrimenti stringa vuota

Esempio concreto per trasferimento: `"Trasferimento: Mensile risparmio, 200,00 €, 1 apr 2026, Conto corrente → Conto risparmio"`

Esempio con categoria: `"Uscita: Cena fuori, 38,00 €, 20 apr 2026, Conto corrente, Ristorazione"`

⚠️ Il `data-focus-info` già presente sulle righe usa un formato simile ma più verbose — non modificarlo.

#### 3.5 Verifica intermedia 3

```
npm run build
```
Atteso: exit code 0.

---

### Sotto-operazione 4 — `src/components/FocusIndicator.tsx`

> **Rischio prevalente**: 🟢 basso — modifica puntuale, nessun comportamento esistente rimosso.
> **Prerequisito**: Sotto-operazione 3 completata; build verde.

#### 4.1 Aggiunta condizione `data-list-item`

Nell'handler `handleFocusIn`, dentro il blocco `if (target.tagName === 'INPUT' || ...)`, aggiungere come prima condizione (prima di `target.tagName === 'INPUT'`):

```
target.hasAttribute('data-list-item') ||
```

Posizione: prima riga del blocco if, prima di `target.tagName === 'INPUT'`. La posizione di alta priorità garantisce che le righe di lista vengano catturate prima di valutare le altre condizioni — utile per gli edge case di timing descritti in AI4.

Nessun'altra modifica al componente: il tooltip si costruisce già con la logica `dataFocusInfo || ariaLabel || title || buttonText`. Le righe hanno `data-focus-info` (primo in priorità per il tooltip) e `aria-label` (secondo). Il tooltip mostrerà il contenuto di `data-focus-info` che è già informativo.

#### 4.2 Verifica intermedia 4

```
npm run build
```
Atteso: exit code 0.

---

### Sotto-operazione 5 — Verifica finale

> **Prerequisito**: tutte e quattro le sotto-operazioni completate; build verde a ogni step.

#### 5.1 Build e lint

```
npm run build
```
Atteso: exit code 0.

```
npm run lint
```
Atteso: exit code 0, conteggio warning ≤59. Atteso per effetto collaterale: ≤55 (risoluzione 4 warning jsx-a11y su DashboardTab e TransactionsTab). Se il conteggio è superiore a 59 (nuovi warning introdotti), analizzare i nuovi warning prima di procedere.

#### 5.2 Integrità repository

```
git diff --stat
```
Atteso: esattamente quattro file: `src/hooks/use-list-navigation.ts`, `src/components/DashboardTab.tsx`, `src/components/TransactionsTab.tsx`, `src/components/FocusIndicator.tsx`. Nessun altro file sotto `src/`.

#### 5.3 Verifica funzionale manuale

1. Avviare `npm run dev`.
2. Navigare alla tab Dashboard (Movimenti Recenti).
3. Premere Tab fino ad arrivare alla prima riga della lista.
4. Aprire DevTools → pannello Elements → cercare il nodo con `:focus` attivo.
5. Verificare che il focus sia sulla riga (non sul body o su un elemento esterno).
6. Premere ArrowDown — il focus deve spostarsi alla riga successiva (DevTools mostra il nuovo nodo con `:focus`).
7. Premere ArrowUp — il focus torna alla riga precedente.
8. Verificare che l'highlight CSS (bordo colorato, sfondo) corrisponda alla riga con focus DOM.
9. Verificare che NON ci sia un doppio outline visivo (browser outline + CSS ring).

#### 5.4 Verifica guard dialogo

1. Con DevTools aperto, selezionare una riga con ArrowDown.
2. Premere Enter — deve aprirsi `TransactionDialog`.
3. Con il dialog aperto, premere ArrowDown.
4. Verificare in console che nessun log di cambio `focusedIndex` avvenga (oppure, in alternativa: verificare visivamente che la lista dietro il dialog non cambi l'highlight).
5. Chiudere il dialog (Escape o pulsante).
6. Premere ArrowDown — la navigazione deve riprendere normalmente.

#### 5.5 Verifica screen reader

Seguire la procedura del design §7.4:

**TalkBack (Android)** — priorità alta:
1. Attivare TalkBack sul dispositivo.
2. Aprire Zecchino in Chrome.
3. Navigare con swipe destra alla zona "Movimenti Recenti".
4. Verificare che ogni riga sia annunciata come: `"{tipo}: {descrizione}, {importo}, {data}, {conto}. Bottone."` o equivalente nella lingua dello screen reader.
5. Verificare che il doppio tap apra il dialog di modifica.

**VoiceOver (iOS)** — se disponibile:
1. Attivare VoiceOver.
2. Navigare con swipe destra alla lista.
3. Verificare annuncio della riga.

---

## Tabella risultato finale

> Da compilare dal Code agent al completamento del passo.

| Sotto-operazione | File | Esito build | Note |
|---|---|---|---|
| 1 — hook | `use-list-navigation.ts` | ☐ PASS / ☐ FAIL | |
| 2 — Dashboard | `DashboardTab.tsx` | ☐ PASS / ☐ FAIL | |
| 3 — Transactions | `TransactionsTab.tsx` | ☐ PASS / ☐ FAIL | |
| 4 — FocusIndicator | `FocusIndicator.tsx` | ☐ PASS / ☐ FAIL | |
| 5 — Verifica finale | — | ☐ PASS / ☐ FAIL | |

| Gate | Atteso | Effettivo |
|---|---|---|
| `npm run build` finale | exit 0 | |
| `npm run lint` finale | exit 0, ≤59 warn | |
| Warning risolti (jsx-a11y div) | ≤55 | |
| `git diff --stat` | 4 file | |
| Focus DOM verificato (DevTools) | sì | |
| Guard dialogo verificato | sì | |
| Screen reader verificato | sì (TalkBack / VoiceOver) | |
