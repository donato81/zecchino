# Analisi di Impatto — Riga Breve e Menu Azioni nel Tab Movimenti

**Data:** 2026-05-08
**Branch:** refactoring-architettura
**Scope:** `src/components/TransactionsTab.tsx`, `src/hooks/use-list-navigation.ts`

---

## Contesto

Analisi read-only delle due modifiche richieste per il tab Movimenti. Nessuna modifica al codice è stata effettuata.

---

## Modifica 1 — Riga breve del movimento

### Stato attuale

Il render di ogni riga si trova in `TransactionsTab.tsx` alle righe 133–209 e ha questa struttura a due colonne:

- **Colonna sinistra** (`flex-1 min-w-0 space-y-1`):
  - Prima riga: descrizione in `font-medium` + badge ricorrenza se presente
  - Seconda riga: data in formato `it-IT` (es. `7/5/2026`) · nome conto · freccia + conto destinazione se trasferimento · categoria

- **Colonna destra** (`flex items-center gap-3`):
  - Importo con prefisso `+`/`→`/`-` e colori `text-income` / `text-accent` / `text-expense`
  - Due pulsanti icon-only: matita + cestino

Non esiste alcuna logica di troncamento sulla descrizione, sul nome del conto o sulla data.
Il formato data usa `toLocaleDateString('it-IT')` che produce `7/5/2026` — il formato richiesto è `07/05/26` (padding a due cifre, anno a 2 cifre).

### Componenti Radix UI riusabili

Nessun componente Radix è coinvolto in questa modifica. Si tratta di pura logica di formattazione e layout JSX.

### File da modificare

| File | Tipo | Righe impattate |
|---|---|---|
| `src/components/TransactionsTab.tsx` | Modifica | 133–209 (riga di rendering, ~77 righe) |

**Nessun file da creare da zero.**

### Stima righe di codice

- Righe modificate: ~77 (l'intero blocco del `return` del `map`)
- Righe dopo la modifica: ~55–65 (layout più compatto, rimozione della seconda riga descrittiva)
- Delta netto: −10 / −20 righe

Dettaglio delle sotto-modifiche:

| Elemento | Cambiamento | Righe |
|---|---|---|
| Data | `toLocaleDateString` → formattazione custom `dd/MM/yy` | 1 riga (helper o inline) |
| Descrizione | Aggiunta logica `descrizione.length > 30 ? descrizione.slice(0,30)+'...' : descrizione` | 1 riga |
| Conto | Troncamento a 15 char; per trasferimenti: `ContoOrig → ContoDest` entrambi troncati | 3–5 righe |
| Layout | Da struttura a due righe (descrizione + meta) a riga singola compatta a 4 colonne | ~20 righe di JSX |

### Dipendenze e rischi

1. **Funzione helper per la data.** `formatCurrency` è già in `src/lib/helpers.ts`. Conviene aggiungere lì una funzione `formatDateShort(date: string): string` per riusabilità, invece di logica inline. Questo aggiunge un file toccato ma riduce la duplicazione.

2. **Troncamento trasferimenti.** La specifica dice "troncato coerentemente" per `ContoOrigine → ContoDestinazione`. Non è chiaro se i 15 caratteri si applicano all'intera stringa combinata o a ciascun conto separatamente. Va chiarito prima dell'implementazione per evitare regressioni visive su trasferimenti con nomi lunghi.

3. **Badge ricorrenza.** La riga attuale mostra un badge `{transaction.frequenzaRicorrenza}` per i movimenti ricorrenti (riga 155–158). Il nuovo layout compatto non prevede questo badge nella specifica. Decidere se: (a) eliminarlo, (b) mantenerlo dopo la descrizione, (c) aggiungerlo come decoratore visivo. Impatta 3–5 righe.

4. **`aria-label` sulla riga.** L'attributo a riga 147 contiene la data nel formato `it-IT`. Dovrà essere aggiornato di conseguenza per coerenza con la visualizzazione.

5. **Regressione visiva.** La riga attuale usa `space-y-1` con due righe distinte. Compattandola in una sola riga su display molto stretti (<320px) potrebbe sovrapporre gli elementi. Test su viewport piccoli necessari.

---

## Modifica 2 — Menu azioni al posto dei pulsanti matita e cestino

### Stato attuale

I pulsanti di azione sono inline nella riga (righe 182–206):
- `<Button size="icon" variant="ghost">` con `PencilSimple` — chiama `openEditTransactionDialog`
- `<Button size="icon" variant="ghost">` con `Trash` — chiama `setDeletingItem` + `setShowDeleteDialog`

La navigazione da tastiera è gestita da `useListNavigation` (`src/hooks/use-list-navigation.ts`, 107 righe):
- `Enter` / `Spazio` → `onEnter` → apre direttamente il dialog di modifica (riga 54–56)
- `Delete` → `onDelete` → apre il dialog di eliminazione (righe 57–59)
- `E` → `onEdit` → apre il dialog di modifica (righe 60–62)

La rilevazione mobile è già in `src/hooks/use-mobile.ts` con `useIsMobile()` (breakpoint 768px).

### Componenti Radix UI riusabili

| Componente | File | Uso corrente | Riuso per questa modifica |
|---|---|---|---|
| `DropdownMenu` | `src/components/ui/dropdown-menu.tsx` | **Non usato** in nessun componente applicativo | **Desktop**: trigger + due voci Modifica/Elimina |
| `Sheet` | `src/components/ui/sheet.tsx` | Usato in altri componenti (basato su `@radix-ui/react-dialog`) | **Mobile**: `side="bottom"`, due voci Modifica/Elimina |
| `useIsMobile` | `src/hooks/use-mobile.ts` | Usato in `AppHeader`, `DashboardTab` | Selezione condizionale Desktop/Mobile |

**Non servono nuovi pacchetti npm.** `@radix-ui/react-dropdown-menu` e `@radix-ui/react-dialog` (da cui Sheet dipende) sono già installati.

### File da modificare e da creare

**File modificati:**

| File | Motivo | Righe impattate |
|---|---|---|
| `src/components/TransactionsTab.tsx` | Rimozione bottoni inline, aggiunta import e resa condizionale del menu | ~50 righe modificate |
| `src/hooks/use-list-navigation.ts` | Aggiunta callback `onMenu` per separare "apri menu" da "modifica diretta"; `Enter`/`Spazio` ora chiama `onMenu` invece di `onEnter` | ~15 righe modificate |

**File da creare:**

| File | Contenuto | Stima righe |
|---|---|---|
| `src/components/TransactionActionMenu.tsx` | Componente che incapsula la logica condizionale: `DropdownMenu` su desktop, `Sheet` su mobile. Riceve `transaction`, `onEdit`, `onDelete`, `isOpen`, `onOpenChange` come props. | ~80–100 righe |

### Stima righe di codice complessiva (Modifica 2)

| Operazione | Righe |
|---|---|
| `TransactionsTab.tsx` — rimozione blocco bottoni (righe 182–206) | −24 righe |
| `TransactionsTab.tsx` — aggiunta import + stato `openMenuIndex` + render `<TransactionActionMenu>` | +35 righe |
| `TransactionsTab.tsx` — modifica `onEnterTransactions` per aprire menu | +5 righe (sostituzione) |
| `use-list-navigation.ts` — aggiunta `onMenu` prop e relativa gestione | +15 righe |
| `TransactionActionMenu.tsx` — nuovo file | +90 righe |
| **Totale netto** | **~120 righe cambiate/create** |

### Dipendenze e rischi

1. **Cambio del modello di interazione da tastiera — rischio UX medio.**
   Attualmente `Enter`/`Spazio` apre direttamente il dialog di modifica. Con il menu, l'utente dovrà fare `Enter` → freccia → `Enter` per modificare. Questo è un passo in più per chi usa solo tastiera.
   **Raccomandazione:** mantenere `E` come scorciatoia diretta per la modifica (bypass del menu) e `Delete` per l'eliminazione diretta. `Enter`/`Spazio` apre il menu. Questo preserva la velocità per utenti tastiera esperti. Il badge hint a riga 98 andrà aggiornato di conseguenza.

2. **Conflitto con la guardia in `useListNavigation` riga 33.**
   Il hook controlla `document.querySelector('[data-state="open"][aria-modal="true"]')` per disabilitarsi quando un dialog è aperto. Il `DropdownMenu` di Radix usa `data-state="open"` ma **non** `aria-modal="true"`, quindi non verrebbe intercettato da questa guardia. Con il menu aperto, le frecce della lista continuerebbero a funzionare, causando spostamenti indesiderati di focus. Bisogna aggiungere una condizione `disabled` esplicita quando il menu è aperto (passando `openMenuIndex >= 0` a `disabled` del hook).

3. **Gestione stato `openMenuIndex`.**
   Serve uno stato in `TransactionsTab` per tracciare quale riga ha il menu aperto. Quando il menu si chiude, il focus deve tornare sull'elemento `[data-list-item][data-index="${openMenuIndex}"]`. Questo è un pattern già presente nel codice per il focus post-dialog; si può replicare con un `useEffect` simile a quello in `use-list-navigation.ts` righe 83–89.

4. **Sheet lato bottom su mobile.**
   Il `Sheet` attuale ha animazioni di slide che si aprono dai lati (`right`, `left`, `top`, `bottom`). L'uso con `side="bottom"` è già supportato dallo stile esistente. Tuttavia, il `SheetContent` ha una larghezza `w-3/4 sm:max-w-sm` pensata per pannelli laterali — per un cassetto bottom si dovrà aggiungere `w-full` e rimuovere la larghezza condizionale. Questo è un tweak di 2–3 classi CSS.

5. **Icona trigger del menu.**
   I pulsanti attuali usano `@phosphor-icons/react`. L'icona `DotsThreeVertical` (o `DotsThree`) è già disponibile nel pacchetto installato — nessun import aggiuntivo da installare.

6. **Accessibilità del trigger.**
   Il bottone trigger dovrà avere `aria-label="Azioni per il movimento"` e `aria-haspopup="menu"`. Il `DropdownMenu.Trigger` di Radix aggiunge `aria-haspopup` automaticamente; per lo `Sheet` su mobile va aggiunto manualmente.

---

## Riepilogo comparativo

| | Modifica 1 (Riga breve) | Modifica 2 (Menu azioni) |
|---|---|---|
| File modificati | 1 (`TransactionsTab.tsx`) | 2 (`TransactionsTab.tsx`, `use-list-navigation.ts`) |
| File creati | 0 | 1 (`TransactionActionMenu.tsx`) |
| Righe cambiate (stima) | ~60–80 | ~120 |
| Nuovi pacchetti npm | 0 | 0 |
| Componenti Radix riusabili | Nessuno | `DropdownMenu`, `Sheet` (già installati, mai usati in features) |
| Rischi principali | Troncamento trasferimenti da chiarire; badge ricorrenza da decidere | Cambio UX tastiera; guardia `disabled` nel hook; stato `openMenuIndex` |
| Complessità stimata | Bassa | Media |

---

## Ordine di implementazione consigliato

1. **Prima la Modifica 1.** È indipendente, a basso rischio, e produce una base visiva stabile su cui innestare la Modifica 2.
2. **Poi la Modifica 2.** Richiede la riga già ridisegnata per calcolare il posizionamento del trigger correttamente.

Prima di iniziare la Modifica 2, chiarire:
- Il comportamento esatto di `Enter`/`Spazio` post-menu (scorciatoia `E` rimane per modifica diretta?)
- Se `Sheet` bottom va stilizzato con override di larghezza rispetto al template attuale
