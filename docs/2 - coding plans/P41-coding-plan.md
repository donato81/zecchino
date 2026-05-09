# P41 — Coding Plan: Fix doppia chiamata `onFocusReturn` nel menu azioni

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P41 — Fix double-call onFocusReturn TransactionActionMenu
> Report di riferimento: `docs/4 - reports/report-debug-focus-handler-accumulation.md` · `docs/4 - reports/report-transaction-action-menu-diagnostica.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-09

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P41 — Fix double-call onFocusReturn TransactionActionMenu |
| **Tipo intervento** | Bugfix |
| **Branch** | `refactoring-architettura` |
| **Data** | 2026-05-09 |
| **File modificati** | `src/components/TransactionActionMenu.tsx` · `src/components/TransactionsTab.tsx` |
| **File creati** | nessuno |
| **Report di riferimento** | [report-debug-focus-handler-accumulation.md](../4%20-%20reports/report-debug-focus-handler-accumulation.md) · [report-transaction-action-menu-diagnostica.md](../4%20-%20reports/report-transaction-action-menu-diagnostica.md) |

---

## §2 — Obiettivo

Eliminare l'accumulo di handler nel menu azioni del tab Movimenti. Il bug si manifesta come segue: premendo "Elimina" dopo aver già usato "Modifica", viene invocato prima `handleEdit` poi `handleDelete`; ad ogni interazione successiva la sequenza storica delle azioni cresce.

La causa radice è la doppia invocazione di `onFocusReturn()` per ogni click su una voce del menu: la prima avviene dall'handler individuale (`handleEdit`, `handleDelete`, `handleDetail`), la seconda avviene da `handleOpenChange` quando Radix chiama il callback di chiusura del `DropdownMenu` o dello `Sheet`. Ogni chiamata a `onFocusReturn()` porta il focus sincrono sul pulsante trigger, attivando più volte i listener di `useListNavigation` prima che React completi il batch degli state update, con l'effetto di accumulare handler ad ogni ciclo.

Tre interventi risolvono il problema in sequenza:

1. **Rimozione del call duplicato** — in `TransactionActionMenu.tsx`, eliminare `onFocusReturn()` da `handleOpenChange`. Gli handler individuali già lo chiamano.
2. **Memoizzazione delle props** — in `TransactionsTab.tsx`, sostituire le closure inline non memoizzate passate a `TransactionActionMenu` con i `useCallback` già presenti nel componente (`onMenuTransactions`, `onEditTransactions`, `onDeleteTransactions`).
3. **Rimozione `useEffect` morto** — in `TransactionsTab.tsx`, eliminare il `useEffect` il cui cleanup cerca `[data-list-item][data-index]` attributi inesistenti nel DOM.

**Risultato atteso:** premendo qualunque voce del menu in console appare un solo log `[MENU]` per l'azione, senza ripetizioni delle azioni precedenti. L'accumulo cessa.

---

## §3 — Motivazione tecnica

### Doppia chiamata a `onFocusReturn`

In `TransactionActionMenu.tsx` coesistono due percorsi che chiamano `onFocusReturn()`:

**Percorso A — handler individuale:**
```typescript
const handleEdit = () => {
  onOpenChange(false)
  onFocusReturn()   // ← 1a chiamata
  onEdit()
}
```

**Percorso B — `handleOpenChange` (callback di Radix):**
```typescript
const handleOpenChange = (open: boolean) => {
  onOpenChange(open)
  if (!open) {
    onFocusReturn()   // ← 2a chiamata (Radix la innesca dopo la chiusura)
  }
}
```

Quando un `DropdownMenuItem` viene selezionato, Radix chiude il menu internamente ed emette il suo `onOpenChange(false)` — che mappa su `handleOpenChange`. L'handler individuale (`handleEdit`, `handleDelete`, `handleDetail`) aveva già chiamato `onFocusReturn()` al passo A. Il risultato è due `.focus()` sincroni sullo stesso elemento trigger in rapida successione, che attivano due volte i listener registrati da `useListNavigation`.

La soluzione minimale è rimuovere `onFocusReturn()` da `handleOpenChange`. Gli handler individuali sono l'unico punto responsabile del focus-return; `handleOpenChange` deve solo propagare il cambio di stato verso il parent tramite `onOpenChange`.

### Props inline non memoizzate

In `TransactionsTab.tsx` esistono già tre `useCallback` memoizzati:
```typescript
const onMenuTransactions = useCallback((index: number) => { setOpenMenuIndex(index) }, [])
const onDeleteTransactions = useCallback((index: number) => { ... }, [sortedTransactions, ...])
const onEditTransactions   = useCallback((index: number) => { ... }, [sortedTransactions, ...])
```

Questi non sono connessi al `TransactionActionMenu`. Il componente usa invece le versioni inline create nel `.map()`:
```typescript
onEdit={() => openEditTransactionDialog(transaction)}          // ricreata ogni render
onDelete={() => { setDeletingItem(...); setShowDeleteDialog(true) }} // ricreata ogni render
onOpenChange={(open) => setOpenMenuIndex(open ? index : -1)}   // ricreata ogni render
```

Sostituire le inline con wrapper che chiamano i `useCallback` esistenti riduce il numero di identità funzionali distinte che React vede ad ogni render, stabilizzando le props di `TransactionActionMenu`.

### `useEffect` con selettore inesistente

In `TransactionsTab.tsx` righe 31–40 esiste un `useEffect` il cui cleanup tenta:
```typescript
`[data-list-item][data-index="${openMenuIndex}"]`
```
Nessun elemento nel JSX corrente porta gli attributi `data-list-item` e `data-index` combinati (gli attributi `data-list-item` sono solo in `DashboardTab.tsx` e `use-list-navigation.ts`; in `TransactionsTab` le righe usano `data-trigger-index`). Il selettore restituisce sempre `null`; il cleanup è codice morto. Va rimosso.

---

## §4 — File coinvolti (ordine vincolante)

1. `src/components/TransactionActionMenu.tsx` — Passo 1
2. `src/components/TransactionsTab.tsx` — Passi 2 e 3 (eseguibili in qualunque ordine tra loro, dopo il Passo 1)

Il Passo 1 è prerequisito logico dei Passi 2 e 3 perché riduce la superficie di bug prima di toccare il parent. I Passi 2 e 3 sono indipendenti l'uno dall'altro.

---

## §5 — Modifiche dettagliate per ogni file

---

### Passo 1 — `src/components/TransactionActionMenu.tsx`

**Obiettivo:** rimuovere la chiamata a `onFocusReturn()` da `handleOpenChange`. Gli handler individuali restano invariati.

#### Modifica 1a — Eliminare `onFocusReturn()` da `handleOpenChange`

**Codice attuale (righe 41–46):**

```typescript
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) {
      onFocusReturn()
    }
  }
```

**Codice nuovo:**

```typescript
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
  }
```

**Motivazione:** `handleOpenChange` viene chiamato da Radix ogniqualvolta il menu si chiude, incluso il caso in cui la chiusura è già stata avviata da un handler individuale. Rimuovendo `onFocusReturn()` da questo punto si elimina la seconda chiamata. La prima chiamata, negli handler individuali, è intenzionale e resta.

**Nota:** i log `console.log('[MENU] ...')` negli handler individuali (`handleDetail`, `handleEdit`, `handleDelete`) sono temporanei e non vanno rimossi in questo passo — verranno rimossi in un passo successivo dopo la verifica del fix.

**Gate 1:**
```bash
npx tsc --noEmit
```
Atteso: 0 errori TypeScript.

---

### Passo 2 — `src/components/TransactionsTab.tsx`: connessione dei `useCallback`

**Obiettivo:** verificare la corrispondenza esatta dei nomi delle props, poi sostituire le closure inline con i `useCallback` già esistenti.

#### Pre-verifica — Corrispondenza nomi props

Confronto tra nomi delle props di `TransactionActionMenu` (interfaccia in `TransactionActionMenu.tsx`) e nomi dei `useCallback` in `TransactionsTab.tsx`:

| Prop di `TransactionActionMenu` | `useCallback` corrispondente | Firma attesa |
|---|---|---|
| `onOpenChange: (open: boolean) => void` | `onMenuTransactions: (index: number) => void` | `open ? onMenuTransactions(index) : setOpenMenuIndex(-1)` |
| `onEdit: () => void` | `onEditTransactions: (index: number) => void` | `() => onEditTransactions(index)` |
| `onDelete: () => void` | `onDeleteTransactions: (index: number) => void` | `() => onDeleteTransactions(index)` |

`onFocusReturn: () => void` non ha un `useCallback` corrispondente — la inline resta invariata perché cattura `index` e `transactionsListContainerRef` che non sono dipendenze stazionarie del componente.

#### Modifica 2a — Sostituire le props inline nel blocco `<TransactionActionMenu>`

**Codice attuale (nel `.map()`):**

```tsx
                    <TransactionActionMenu
                      transactionLabel={`${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'}, ${rawDesc}, ${formatCurrency(transaction.importo)}, ${formatDateShort(transaction.data)}, ${isTransfer ? 'Trasferimento' : account?.nome || ''}`}
                      triggerIndex={index}
                      isOpen={openMenuIndex === index}
                      onOpenChange={(open) => setOpenMenuIndex(open ? index : -1)}
                      onEdit={() => openEditTransactionDialog(transaction)}
                      onDelete={() => {
                        setDeletingItem({ type: 'transaction', id: transaction.id })
                        setShowDeleteDialog(true)
                      }}
                      onFocusReturn={() => {
                        const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
                          `[data-trigger-index="${index}"]`
                        )
                        el?.focus()
                      }}
                    />
```

**Codice nuovo:**

```tsx
                    <TransactionActionMenu
                      transactionLabel={`${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'}, ${rawDesc}, ${formatCurrency(transaction.importo)}, ${formatDateShort(transaction.data)}, ${isTransfer ? 'Trasferimento' : account?.nome || ''}`}
                      triggerIndex={index}
                      isOpen={openMenuIndex === index}
                      onOpenChange={(open) => open ? onMenuTransactions(index) : setOpenMenuIndex(-1)}
                      onEdit={() => onEditTransactions(index)}
                      onDelete={() => onDeleteTransactions(index)}
                      onFocusReturn={() => {
                        const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
                          `[data-trigger-index="${index}"]`
                        )
                        el?.focus()
                      }}
                    />
```

**Motivazione:** le closure `() => onEditTransactions(index)` e `() => onDeleteTransactions(index)` sono thin wrapper che chiamano funzioni stabili memoizzate. La logica di business (apertura dialog, impostazione `deletingItem`) risiede nei `useCallback` — non viene più duplicata inline per ogni riga della lista.

**Gate 2:**
```bash
npx tsc --noEmit
```
Atteso: 0 errori TypeScript.

---

### Passo 3 — `src/components/TransactionsTab.tsx`: rimozione `useEffect` morto

**Obiettivo:** eliminare il `useEffect` il cui cleanup cerca attributi DOM inesistenti.

#### Modifica 3a — Rimuovere il `useEffect` con selettore `[data-list-item][data-index]`

**Codice attuale (righe 31–40):**

```typescript
  useEffect(() => {
    if (openMenuIndex < 0) return
    return () => {
      const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
        `[data-list-item][data-index="${openMenuIndex}"]`
      )
      el?.focus()
    }
  }, [openMenuIndex])
```

**Codice nuovo:**

```typescript
  // (blocco rimosso — selettore [data-list-item][data-index] inesistente nel DOM)
```

> Il commento è inserito solo come placeholder per questa documentazione. Nel file sorgente il blocco va rimosso senza lasciare commenti.

**Motivazione:** le righe della lista `TransactionsTab` non espongono mai gli attributi `[data-list-item]` e `[data-index]` in combinazione. Il selettore restituisce sempre `null`; il cleanup è dead code che non produce effetti osservabili. Rimuoverlo riduce rumore nel componente.

**Nota:** `useEffect` rimane importato perché il Passo 2 non lo elimina (`useEffect` potrebbe essere usato altrove nel file — verificare prima di rimuovere l'import). Se dopo la rimozione del blocco `useEffect` non compare più in nessun altro punto del file, rimuovere anche `useEffect` dall'import a riga 1.

**Gate 3:**
```bash
npx tsc --noEmit
```
Atteso: 0 errori TypeScript.

---

## §6 — Ordine di esecuzione

| Passo | File | Dipende da |
|---|---|---|
| Passo 1 | `TransactionActionMenu.tsx` — rimozione `onFocusReturn` da `handleOpenChange` | — indipendente |
| Passo 2 | `TransactionsTab.tsx` — connessione `useCallback` a `TransactionActionMenu` | Passo 1 (logicamente) |
| Passo 3 | `TransactionsTab.tsx` — rimozione `useEffect` morto | — indipendente dai passi 1 e 2 |

I Passi 2 e 3 possono essere eseguiti nell'ordine preferito, ma il Passo 1 deve precedere la verifica del fix in console.

---

## §7 — Test di verifica

### Test statici

| # | Comando | Esito atteso |
|---|---|---|
| S1 | `npx tsc --noEmit` | 0 errori |
| S2 | `npm run build` | exit 0 |

### Test funzionali in console

Aprire il tab Movimenti nel browser con DevTools aperto sulla scheda Console, filtro attivo su `[MENU]`.

| # | Scenario | Esito atteso |
|---|---|---|
| F1 | Click su "Modifica" in qualunque riga | Console: esattamente 1 log `[MENU] handleEdit chiamato`. Nessun `[MENU] handleDetail` o `[MENU] handleDelete` precedente. |
| F2 | Click su "Elimina" in qualunque riga | Console: esattamente 1 log `[MENU] handleDelete chiamato`. Nessun log di azioni precedenti. |
| F3 | Click su "Apri dettaglio" | Console: esattamente 1 log `[MENU] handleDetail chiamato`. |
| F4 | Sequenza: Modifica → chiudi dialog → Elimina | Console per il click "Elimina": solo 1 log `[MENU] handleDelete chiamato`. L'accumulo storico delle azioni non si manifesta. |
| F5 | Sequenza: tre click su Modifica su righe diverse | Ogni click produce 1 solo log. Nessuna sequenza cumulativa. |
| F6 | Focus sul trigger `⋮` dopo chiusura menu (Esc) | Il focus torna esattamente sul trigger della riga da cui il menu era stato aperto. |

### Test regressioni

| # | Scenario | Esito atteso |
|---|---|---|
| R1 | DashboardTab: Invio su item lista recenti | Dialog "Modifica Movimento" si apre — il comportamento di `useListNavigation` non è coinvolto in questo fix |
| R2 | Ctrl+N apre dialog nuovo movimento | Nessuna regressione |
| R3 | Ctrl+E esporta CSV | Nessuna regressione |

---

## §8 — File da non toccare

| File | Motivo |
|---|---|
| `src/hooks/use-list-navigation.ts` | Corretto così com'è; non coinvolto in questo fix |
| `src/components/DialogsOverlay.tsx` | Non coinvolto |
| `src/components/TransactionDialog.tsx` | Non coinvolto |
| `src/context/AppDataContext.tsx` | Non coinvolto |
| `src/components/DashboardTab.tsx` | Non coinvolto |
| Qualunque file sotto `.github/` | Protetto dal framework guard |

---

## §9 — Rischi e attenzioni

| Rischio | Mitigazione |
|---|---|
| **Rimozione `useEffect` toglie anche `useEffect` dall'import** | Dopo aver rimosso il blocco, verificare con grep se `useEffect` è usato altrove nel file. Se non lo è, rimuovere `useEffect` dalla riga di import. Se lo è, lasciare l'import invariato. |
| **I log `[MENU]` sono temporanei** | Non rimuoverli in questo piano — servono a validare il fix. Pianificare la loro rimozione in un task separato dopo la verifica. |
| **`onFocusReturn` inline (nel `.map()`) è ancora una closure ricreata ad ogni render** | Accettabile: cattura `index` e `transactionsListContainerRef` che non si prestano a memoizzazione semplice dentro un `.map()`. Il problema di identità funzionale per `onFocusReturn` è minore rispetto alla doppia chiamata che questo piano corregge. |
| **`handleOpenChange` ridotto a wrapper puro** | Dopo il fix, `handleOpenChange` chiama solo `onOpenChange(open)`. Questa funzione rimane per non cambiare la firma del prop passato a `DropdownMenu` e `Sheet` — Radix chiama il proprio `onOpenChange` con il tipo `boolean`, non il `onOpenChange` del parent direttamente. Rimuovere `handleOpenChange` del tutto richiederebbe di passare `onOpenChange` direttamente, che è equivalente ma aumenta il diff senza beneficio aggiuntivo. |

---

## §10 — Gate finale P41

```bash
npx tsc --noEmit
npm run build
```

Entrambi devono restituire exit 0 senza errori.

Verifica console obbligatoria:
- Ogni click su una voce del menu produce **esattamente 1 log `[MENU]`**.
- Nessuna sequenza cumulativa dopo più interazioni consecutive.

```bash
git diff --name-only HEAD | grep ".github"
```

Output atteso: vuoto. Nessun file sotto `.github/` deve essere modificato.

```bash
git diff --name-only HEAD
```

Output atteso (esattamente questi file, nessun altro):
```
src/components/TransactionActionMenu.tsx
src/components/TransactionsTab.tsx
```
