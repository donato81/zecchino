# Analisi: ID interno delle transazioni generato lato app

| Campo        | Valore                         |
|--------------|--------------------------------|
| **Data**     | 2026-05-07                     |
| **Branch**   | `refactoring-architettura`     |
| **Obiettivo**| Mappare tutti i punti in cui viene generato, assegnato, trasmesso o usato un ID interno lato app per le transazioni, in preparazione alla sua rimozione. |

---

## Punto 1 — Definizione di `generateId()`

**File:** [src/lib/helpers.ts](../../src/lib/helpers.ts#L44)  
**Riga:** 44

```ts
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
```

**Ruolo:** Genera una stringa opaca non-UUID (formato `timestamp-randomhex`). Viene esportata e usata in quattro componenti: `TransactionDialog`, `AccountDialog`, `BudgetDialog`, `SavingsGoalDialog`. La funzione non è riservata alle transazioni — serve come generatore universale di ID applicativi per tutte le entità.

**Uso per entità diverse dalle transazioni** (fuori scope di questo intervento):
- `AccountDialog.tsx` riga 61: `id: account?.id || generateId()`
- `BudgetDialog.tsx` riga 104: `id: budget?.id || generateId()`
- `SavingsGoalDialog.tsx` riga 109: `id: goal?.id || generateId()`

---

## Punto 2 — Tipo `Transaction`

**File:** [src/lib/types.ts](../../src/lib/types.ts#L22)  
**Righe:** 22–34

```ts
export interface Transaction {
  id: string          // obbligatorio, non opzionale
  data: string
  importo: number
  tipo: TransactionType
  contoId: string
  contoDestinazioneId?: string
  categoriaId: string
  descrizione: string
  ricorrente: boolean
  frequenzaRicorrenza?: RecurrenceFrequency
  cifrato: boolean
}
```

**Ruolo:** Tipo canonico di una transazione letta da Supabase. Il campo `id` è obbligatorio e rappresenta il UUID assegnato da PostgreSQL. Non è coinvolto direttamente nella generazione lato app — il lato app lo riceve solo in risposta a una INSERT di Supabase.

---

## Punto 3 — Tipo `TransactionInput`

**File:** [src/lib/types.ts](../../src/lib/types.ts#L36)  
**Riga:** 36

```ts
export type TransactionInput = Omit<Transaction, 'cifrato'>
```

**Ruolo:** Tipo usato per il payload del form (creazione e modifica). Poiché è `Omit<Transaction, 'cifrato'>`, il campo `id: string` è **obbligatorio** anche in `TransactionInput`. Questo forza `TransactionDialog` a generare un ID prima dell'invio anche per le nuove transazioni, dove nessun ID esiste ancora.

**Impatto diretto:** Questo è il punto di tipo che rende necessario `generateId()` per nuove transazioni. La rimozione dell'ID generato lato app richiede di cambiare questa definizione.

---

## Punto 4 — Generazione dell'ID in `TransactionDialog`

**File:** [src/components/TransactionDialog.tsx](../../src/components/TransactionDialog.tsx#L171)  
**Righe:** 171–183

```ts
const newTransaction: TransactionInput = {
  id: transaction?.id || generateId(),  // ← generazione o propagazione
  data,
  importo: amount,
  tipo,
  contoId,
  contoDestinazioneId: tipo === 'trasferimento' ? contoDestinazioneId : undefined,
  categoriaId: tipo === 'trasferimento' ? '' : categoriaId,
  descrizione: descrizione.trim(),
  ricorrente,
  frequenzaRicorrenza: ricorrente ? (frequenzaRicorrenza as RecurrenceFrequency) : undefined,
}
onSave(newTransaction)
```

**Ruolo:** È il punto di generazione dell'ID lato app per le **nuove** transazioni. Quando `transaction` (prop) è `undefined` (nuovo movimento), viene chiamata `generateId()`. Quando `transaction` esiste (modifica), viene propagato `transaction.id` (UUID Supabase reale).  

**Import rilevante:** riga 11 — `import { generateId } from '@/lib/helpers'`

---

## Punto 5 — Routing create/update in `handleSaveTransaction`

**File:** [src/context/AppDataContext.tsx](../../src/context/AppDataContext.tsx#L478)  
**Righe:** 478–518

```ts
const handleSaveTransaction = async (transaction: TransactionInput) => {
  try {
    const transactionData = transaction
    const existing = transactions.find(t => t.id === transaction.id)  // ← discriminante
    if (existing) {
      const { id, ...updateData } = transactionData
      await updateTransaction(id, updateData)
      // ...
    } else {
      const { id: _id, ...createData } = transactionData  // ← id viene scartato
      await addTransaction(createData)
      // ...
    }
  }
}
```

**Ruolo:** Questo è il **punto di coupling critico**. La funzione usa `transaction.id` per determinare se eseguire una CREATE o una UPDATE:
- Se `transactions.find(t => t.id === transaction.id)` restituisce un valore → si tratta di una modifica di transazione esistente.
- Se non restituisce nulla → si tratta di una nuova transazione.

Per la **creazione**: l'ID generato lato app (`_id`) viene esplicitamente scartato con destructuring. La chiamata a `addTransaction(createData)` non include mai `id` nel payload inviato a Supabase.

Per la **modifica**: l'ID (UUID Supabase reale) viene usato come chiave per `updateTransaction(id, updateData)`.

**L'ID generato lato app serve solo come chiave di confronto temporanea** — non viene mai trasmesso a Supabase in caso di INSERT.

---

## Punto 6 — Layer Supabase: `create()` in `transazioni.ts`

**File:** [src/lib/supabase/repositories/transazioni.ts](../../src/lib/supabase/repositories/transazioni.ts#L74)  
**Righe:** 74–82

```ts
export async function create(input: Omit<Transaction, 'id' | 'cifrato'>): Promise<Transaction> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('transazioni')
    .insert({ ...toDb(input), user_id: uid })
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbTransaction)
}
```

**Ruolo:** La firma `Omit<Transaction, 'id' | 'cifrato'>` esclude già `id` a livello di tipo. La funzione `toDb()` (righe 29–40) non include mai `id` nel payload. Il payload INSERT non contiene `id` — viene assegnato da PostgreSQL (SERIAL/UUID default). Supabase restituisce la riga con l'UUID generato, che viene mappato in `toClient()`.

**Stato attuale:** Il layer Supabase è già corretto per questa rimozione.

---

## Punto 7 — Gestione locale: `addTransaction` e `updateTransaction`

**File:** [src/context/AppDataContext.tsx](../../src/context/AppDataContext.tsx#L336)  
**Righe:** 336–346

```ts
const addTransaction = async (data: Omit<Transaction, 'id' | 'cifrato'>): Promise<void> => {
  const saved = await createTransazione(data)
  setTransactions(prev => [...prev, saved])   // ← saved ha l'UUID da Supabase
}

const updateTransaction = async (id: string, data: Partial<Omit<Transaction, 'id' | 'cifrato'>>): Promise<void> => {
  const saved = await updateTransazione(id, data)
  setTransactions(prev => prev.map(t => t.id === id ? saved : t))  // ← confronto per UUID reale
}
```

**Ruolo:** Dopo la CREATE, lo stato locale viene aggiornato con la transazione restituita da Supabase (che ha un UUID reale). Ogni successivo confronto sull'`id` avviene su UUID Supabase, non sull'ID generato lato app. Il confronto in `updateTransaction` usa l'UUID reale come chiave.

---

## Punto 8 — React list keys

**File 1:** [src/components/TransactionsTab.tsx](../../src/components/TransactionsTab.tsx#L126)  
**Riga:** 126

```tsx
key={transaction.id}
```

**File 2:** [src/components/DashboardTab.tsx](../../src/components/DashboardTab.tsx#L351)  
**Riga:** 351

```tsx
key={transaction.id}
```

**Ruolo:** Usano `transaction.id` come chiave React per il rendering delle liste. In entrambi i casi, `transaction` proviene dallo stato locale (`visibleTransactions`), che contiene solo UUID Supabase reali (vedi Punto 7). Non dipendono dall'ID generato lato app.

---

## Punto 9 — Eliminazione di transazioni via `setDeletingItem`

**File 1:** [src/components/TransactionsTab.tsx](../../src/components/TransactionsTab.tsx#L45)  
**Riga:** 45

```ts
setDeletingItem({ type: 'transaction', id: transaction.id })
```

**File 2:** [src/components/DashboardTab.tsx](../../src/components/DashboardTab.tsx#L83)  
**Riga:** 83

```ts
setDeletingItem({ type: 'transaction', id: transaction.id })
```

**Ruolo:** L'ID usato per la cancellazione è sempre quello della transazione proveniente dallo stato locale (UUID Supabase). Non dipende dall'ID generato lato app.

---

## Punto 10 — Import da backup in `DataManagement.tsx`

**File:** [src/components/DataManagement.tsx](../../src/components/DataManagement.tsx#L537)  
**Righe:** 537–590

```ts
if (!isUuid(transaction.id)) {
  errors.push({ entity: 'transaction', id: transaction.id,
    message: 'Entità con ID non riconosciuto: potrebbe provenire da un backup precedente alla migrazione.' })
  continue
}
// ...
const existingById = await getTransactionById(transaction.id)
```

**Ruolo:** Il flusso di import da backup usa `transaction.id` nel file JSON per:
1. Verificare che l'ID sia un UUID valido (rigetta backup pre-migrazione con ID `generateId()`-style).
2. Cercare la transazione esistente su Supabase con quell'UUID esatto (idempotenza del restore).

Questo punto **non dipende da `generateId()`** — dipende dall'UUID Supabase presente nel backup esportato. Il check `!isUuid(transaction.id)` esiste proprio per gestire i backup creati prima della migrazione, quando gli ID erano prodotti da `generateId()`.

**Nota:** Il backup include `transaction.id` (UUID Supabase) perché il JSON di export include l'intero oggetto `Transaction` già presente nello stato (vedi Punto 11).

---

## Punto 11 — Export backup in `DataManagement.tsx`

**File:** [src/components/DataManagement.tsx](../../src/components/DataManagement.tsx#L276)  
**Righe:** 285–290

```ts
const payload = {
  meta: { ... },
  accounts: appAccounts,
  transactions: appTransactions,   // ← include tutti i campi di Transaction, tra cui id
  budgets: appBudgets,
  savingsGoals: appSavingsGoals,
}
```

**Ruolo:** Il backup JSON include il campo `id` delle transazioni, che a questo punto è l'UUID Supabase. Non dipende da `generateId()`.

---

## Sezione rischi

### Punto 2 — `Transaction.id` obbligatorio
Nessun rischio diretto dalla rimozione di `generateId()` per le transazioni. Il campo `id: string` su `Transaction` deve rimanere (è l'UUID Supabase dopo la lettura).

### Punto 3 — `TransactionInput.id` obbligatorio
**Rischio alto.** Se `generateId()` viene rimosso da `TransactionDialog` senza aggiornare il tipo, TypeScript genera un errore di compilazione perché `id` è obbligatorio in `TransactionInput`. Occorre rendere `id` opzionale (`id?: string`) o ridefinire `TransactionInput` come `Omit<Transaction, 'id' | 'cifrato'>`.

### Punto 4 — Generazione ID in `TransactionDialog`
**Rischio alto.** La riga `id: transaction?.id || generateId()` deve essere modificata. Se `TransactionInput` diventa `Omit<Transaction, 'id' | 'cifrato'>`, questa riga va rimossa o resa condizionale solo per le modifiche.

### Punto 5 — Logica create/update in `handleSaveTransaction`
**Rischio alto.** Questo è il punto più critico. La condizione `transactions.find(t => t.id === transaction.id)` che discrimina CREATE da UPDATE dipende dalla presenza e unicità dell'`id` nel `TransactionInput`. Se `id` diventa opzionale:
- **Nuovo movimento:** `transaction.id` sarà `undefined` → `find()` restituisce `undefined` → si esegue CREATE (comportamento corretto).
- **Modifica:** `transaction.id` sarà l'UUID Supabase reale → `find()` trova la corrispondenza → si esegue UPDATE (comportamento corretto).

La logica funziona naturalmente se `id` viene reso opzionale in `TransactionInput`. L'if deve però gestire il caso `id === undefined` (non passare `undefined` a `updateTransaction`).

### Punto 6 — Layer Supabase `create()`
**Nessun rischio.** Il layer è già corretto: `id` è escluso dalla firma e dal payload.

### Punto 7 — `addTransaction` / `updateTransaction`
**Nessun rischio** dalla rimozione di `generateId()`. Entrambe le funzioni usano solo UUID Supabase.

### Punti 8 e 9 — React keys e delete
**Nessun rischio.** Usano UUID Supabase dallo stato locale.

### Punto 10 — Import backup
**Nessun rischio aggiuntivo.** Il check `isUuid()` già gestisce il caso di backup con ID non-UUID. Backup futuri conterranno sempre UUID Supabase.

---

## Sezione dipendenze tra punti

```
Punto 3 (TransactionInput.id obbligatorio)
  └─ blocca → Punto 4 (TransactionDialog genera id)
               └─ dipende da → Punto 5 (handleSaveTransaction usa id per create/update)
                                └─ dipende da → Punto 6 (layer Supabase — già ok)
                                                └─ dipende da → Punto 7 (stato locale — già ok)
```

**Ordine di modifica consigliato** (quando si procederà all'intervento):

1. **Primo: `src/lib/types.ts`** — Ridefinire `TransactionInput` come `Omit<Transaction, 'id' | 'cifrato'>` (oppure `id?: string`). Questo è il tipo che governa tutte le dipendenze.

2. **Secondo: `src/context/AppDataContext.tsx`** — Aggiornare `handleSaveTransaction` per gestire `id` opzionale: usare `transaction.id !== undefined` come discriminante create/update, e passare `transaction.id` a `updateTransaction` solo quando presente.

3. **Terzo: `src/components/TransactionDialog.tsx`** — Rimuovere `id: transaction?.id || generateId()` dal payload. Propagare solo `id: transaction?.id` (per le modifiche) o omettere il campo (per i nuovi movimenti). Rimuovere l'import di `generateId`.

I Punti 6, 7, 8, 9, 10, 11 non richiedono modifiche per questo intervento.

---

## Riepilogo finale

| # | File | Riga | Tipo di uso | Modifica richiesta |
|---|------|------|-------------|--------------------|
| 1 | `src/lib/helpers.ts` | 44 | Definizione `generateId()` | Rimane (usata da Account, Budget, SavingsGoal) |
| 2 | `src/lib/types.ts` | 22 | `Transaction.id: string` | Nessuna |
| 3 | `src/lib/types.ts` | 36 | `TransactionInput = Omit<Transaction, 'cifrato'>` | **Sì — rimuovere `id` dal tipo** |
| 4 | `src/components/TransactionDialog.tsx` | 11, 172 | Import e uso di `generateId()` | **Sì — rimuovere `generateId()`, omettere `id` per nuovi** |
| 5 | `src/context/AppDataContext.tsx` | 478–518 | `handleSaveTransaction` create/update discriminant | **Sì — adattare logica per `id` opzionale** |
| 6 | `src/lib/supabase/repositories/transazioni.ts` | 74 | `create()` con `Omit<Transaction, 'id' \| 'cifrato'>` | Nessuna (già corretto) |
| 7 | `src/context/AppDataContext.tsx` | 336–346 | `addTransaction` / `updateTransaction` | Nessuna |
| 8 | `src/components/TransactionsTab.tsx` | 126 | `key={transaction.id}` | Nessuna |
| 8b | `src/components/DashboardTab.tsx` | 351 | `key={transaction.id}` | Nessuna |
| 9 | `src/components/TransactionsTab.tsx`, `DashboardTab.tsx` | 45, 83 | `setDeletingItem({ id: transaction.id })` | Nessuna |
| 10 | `src/components/DataManagement.tsx` | 537–590 | Import backup: check UUID e lookup per id | Nessuna |
| 11 | `src/components/DataManagement.tsx` | 285 | Export backup: include `transaction.id` | Nessuna |

**Punti totali individuati:** 11 (di cui 3 richiedono modifica, 8 non richiedono intervento)

**Stima complessità:** **Bassa**

- Solo 3 file da modificare: `src/lib/types.ts`, `src/components/TransactionDialog.tsx`, `src/context/AppDataContext.tsx`
- Il layer Supabase è già disaccoppiato dall'ID generato lato app
- La logica di create/update in `handleSaveTransaction` si adatta naturalmente se `id` diventa opzionale
- Nessun cambiamento richiesto a test, export/import, UI di lista

**Rischio nascosto principale:** Il campo `id` in `TransactionInput` è obbligatorio a livello di tipo. Se si rimuovesse `generateId()` da `TransactionDialog` senza aggiornare prima il tipo, si otterrebbe un errore TypeScript che blocca la build. L'ordine di modifica (tipo → context → dialog) è quindi vincolante.

**Nota su `generateId()`:** La funzione non va eliminata da `src/lib/helpers.ts` in questa fase — viene ancora usata da `AccountDialog`, `BudgetDialog` e `SavingsGoalDialog`. Va rimosso solo l'import e l'uso in `TransactionDialog.tsx`.
