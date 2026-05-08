# Stato implementazione funzionalità — Tab Movimenti

Data: 2026-05-08  
Branch: refactoring-architettura  
Scopo: verifica dello stato di implementazione di quattro funzionalità nel tab Movimenti. Nessuna modifica al codice.

---

## Metodo di analisi

File letti integralmente:
- `src/components/TransactionsTab.tsx`
- `src/components/TransactionDialog.tsx`
- `src/components/DialogsOverlay.tsx`
- `src/context/AppDataContext.tsx`
- `src/context/VisibleDataContext.tsx`
- `src/hooks/use-visible-data.ts`

---

## 1. Filtro per tipo (entrata / uscita / trasferimento)

**Il codice esiste nel progetto?** NO.

Non esiste alcuno stato di filtro per tipo, né alcun componente UI (Select, RadioGroup, o simili) collegato a questo filtro in nessuno dei file analizzati.

La sola pipeline di filtraggio applicata a `visibleTransactions` è in `use-visible-data.ts:41-44`:

```typescript
// use-visible-data.ts:41-44
const visibleTransactions = useMemo(() => {
  const accountIds = new Set(visibleAccounts.map(account => account.id))
  return safeTransactions.filter(transaction => accountIds.has(transaction.contoId))
}, [safeTransactions, visibleAccounts])
```

Questo filtro esclude solo le transazioni dei conti privati bloccati. Non esiste logica per tipo (`entrata` / `uscita` / `trasferimento`).

In `TransactionsTab.tsx:30-33`, `sortedTransactions` è semplicemente un ordinamento per data senza alcun filtro:

```typescript
// TransactionsTab.tsx:30-33
const sortedTransactions = useMemo(
  () => [...visibleTransactions].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
  [visibleTransactions]
)
```

- **Collegato a TransactionsTab?** NO
- **Visibile nell'UI?** NO

---

## 2. Filtro per periodo (date range / "questo mese")

**Il codice esiste nel progetto?** NO.

Non esiste nessuno stato per `dateFrom` / `dateTo`, nessun componente DatePicker o Select per periodi predefiniti, nessuna logica di filtraggio per data applicata a `visibleTransactions` o `sortedTransactions` in nessuno dei file analizzati.

Il campo `data` delle transazioni viene usato solo per ordinamento (`TransactionsTab.tsx:31`) e per la visualizzazione nella riga (`TransactionsTab.tsx:158`), mai per filtrare.

- **Collegato a TransactionsTab?** NO
- **Visibile nell'UI?** NO

---

## 3. Ricerca testuale (descrizione / categoria)

**Il codice esiste nel progetto?** NO.

Non esiste nessuno stato per una query di ricerca, nessun campo `<Input>` di ricerca, nessuna logica di filtraggio per testo in `TransactionsTab.tsx` o in `use-visible-data.ts`.

Il testo della descrizione (`transaction.descrizione`) e il nome della categoria (`category?.nome`) vengono letti solo per la visualizzazione di ogni riga (`TransactionsTab.tsx:149`), non per filtrare la lista.

- **Collegato a TransactionsTab?** NO
- **Visibile nell'UI?** NO

---

## 4. Modifica di un movimento esistente

**Il codice esiste nel progetto?** SI — completamente implementato e funzionante (con l'eccezione nota del bug `categoria_id: ''` per i trasferimenti documentata separatamente).

### Punto di ingresso UI (TransactionsTab.tsx)

**Bottone matita** su ogni riga — `TransactionsTab.tsx:180-190`:
```typescript
<Button
  size="icon"
  variant="ghost"
  onClick={(e) => {
    e.stopPropagation()
    openEditTransactionDialog(transaction)  // ← apre il dialog in modalità modifica
  }}
  aria-label="Modifica movimento"
>
  <PencilSimple size={18} />
</Button>
```

**Callback tastiera Enter** — `TransactionsTab.tsx:35-40`:
```typescript
const onEnterTransactions = useCallback((index: number) => {
  const transaction = sortedTransactions[index]
  if (transaction) {
    openEditTransactionDialog(transaction)  // ← stessa funzione
  }
}, [sortedTransactions, openEditTransactionDialog])
```

### Apertura del dialog (AppDataContext.tsx)

`openEditTransactionDialog` — `AppDataContext.tsx:174-177`:
```typescript
const openEditTransactionDialog = useCallback((tx: Transaction) => {
  setEditingTransaction(tx)       // ← salva il movimento da modificare
  setShowTransactionDialog(true)  // ← apre il dialog
}, [])
```

### Popolazione del form (TransactionDialog.tsx)

`useEffect` che popola i campi dal movimento esistente — `TransactionDialog.tsx:84-97`:
```typescript
useEffect(() => {
  if (open && transaction) {
    setTipo(transaction.tipo)
    setData(transaction.data)
    setImporto(transaction.importo.toString())
    setContoId(transaction.contoId)
    setContoDestinazioneId(transaction.contoDestinazioneId || '')
    setCategoriaId(transaction.categoriaId || '')
    setDescrizione(transaction.descrizione || '')
    setRicorrente(transaction.ricorrente)
    setFrequenzaRicorrenza(transaction.frequenzaRicorrenza || '')
    setError('')
  }
}, [open, transaction])
```

### Payload con ID (TransactionDialog.tsx:185-196)

```typescript
const newTransaction: TransactionInput = {
  ...(transaction?.id ? { id: transaction.id } : {}),  // ← include l'id solo in modifica
  ...
}
```

### Salvataggio (AppDataContext.tsx:496-502)

```typescript
if (transaction.id && existing) {
  const { id, ...updateData } = transactionData
  await updateTransaction(transaction.id, updateData)  // ← UPDATE, non INSERT
  ...
}
```

### UPDATE su Supabase (repositories/transazioni.ts:85-97)

```typescript
export async function update(
  id: string,
  input: Partial<Omit<Transaction, 'id' | 'cifrato'>>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transazioni')
    .update(toDb(input))
    .eq('id', id)
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbTransaction)
}
```

### Aggiornamento dello stato React

```typescript
// AppDataContext.tsx:350-353
const updateTransaction = async (id: string, data: ...) => {
  const saved = await updateTransazione(id, data)
  setTransactions(prev => prev.map(t => t.id === id ? saved : t))  // ← sostituisce in-place
}
```

Il saldo viene ricalcolato automaticamente da `calculateAccountBalance` al re-render successivo.

- **Collegato a TransactionsTab?** SI — bottone matita visibile su ogni riga + navigazione da tastiera
- **Visibile nell'UI?** SI — icona matita (PencilSimple) a destra di ogni movimento

---

## Riepilogo

| Funzionalità | Codice esiste | File / riga | Collegato a TransactionsTab | Visibile in UI |
|---|---|---|---|---|
| Filtro per tipo | **NO** | — | NO | NO |
| Filtro per periodo | **NO** | — | NO | NO |
| Ricerca testuale | **NO** | — | NO | NO |
| Modifica movimento | **SI** | TransactionsTab.tsx:180, AppDataContext.tsx:174, TransactionDialog.tsx:84, transazioni.ts:85 | SI | SI (icona matita) |

Le tre funzionalità di filtro e ricerca sono assenti in tutto il progetto: non esiste stato, non esiste UI, non esiste logica di filtraggio applicata alla lista nel tab Movimenti.
