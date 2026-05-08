# Analisi bug: "invalid syntax to insert id" nel salvataggio trasferimenti

Data: 2026-05-08  
Branch: refactoring-architettura  
Errore osservato: `invalid syntax to insert id` al momento del salvataggio di un movimento di tipo trasferimento.

---

## 1. Flusso di salvataggio — catena chiamate

```
TransactionDialog.tsx:198          onSave(newTransaction)
  ↓
DialogsOverlay.tsx                 handleSaveTransaction(transaction)
  ↓
AppDataContext.tsx:504-505         const { id: _id, ...createData } = transactionData
                                   await addTransaction(createData)
  ↓
AppDataContext.tsx:345-348         addTransaction → createTransazione(data)
  ↓
repositories/transazioni.ts:74-83 create(input) → supabase.insert({ ...toDb(input), user_id })
```

Nessuna logica speciale per i trasferimenti nella catena: la stessa funzione `create` gestisce entrata, uscita e trasferimento.

---

## 2. Costruzione del payload in TransactionDialog.tsx (righe 185–196)

```typescript
const newTransaction: TransactionInput = {
  ...(transaction?.id ? { id: transaction.id } : {}),
  data,
  importo: amount,
  tipo,
  contoId,
  contoDestinazioneId: tipo === 'trasferimento' ? contoDestinazioneId : undefined,
  categoriaId: tipo === 'trasferimento' ? '' : categoriaId,   // ← BUG
  descrizione: descrizione.trim(),
  ricorrente,
  frequenzaRicorrenza: ricorrente ? (frequenzaRicorrenza as RecurrenceFrequency) : undefined,
}
```

Per un trasferimento, `categoriaId` viene impostato a stringa vuota `''`.

---

## 3. Mappatura DB in repositories/transazioni.ts (righe 29–41)

```typescript
function toDb(data: Partial<Omit<Transaction, 'id' | 'cifrato'>>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data.data !== undefined) out.data = data.data
  if (data.importo !== undefined) out.importo = data.importo
  if (data.tipo !== undefined) out.tipo = data.tipo
  if (data.contoId !== undefined) out.conto_id = data.contoId
  if ('contoDestinazioneId' in data) out.conto_destinazione_id = data.contoDestinazioneId ?? null
  if (data.categoriaId !== undefined) out.categoria_id = data.categoriaId   // ← trasmette ''
  if (data.descrizione !== undefined) out.descrizione = data.descrizione
  if (data.ricorrente !== undefined) out.ricorrente = data.ricorrente
  if ('frequenzaRicorrenza' in data) out.frequenza_ricorrenza = data.frequenzaRicorrenza ?? null
  return out
}
```

Il guard `!== undefined` non filtra la stringa vuota: `out.categoria_id = ''` viene incluso nel payload INSERT.

---

## 4. Causa radice

La colonna `categoria_id` nella tabella `transazioni` è di tipo **UUID** in PostgreSQL. L'INSERT inviato da Supabase contiene:

```json
{ "categoria_id": "" }
```

PostgreSQL risponde con:

```
invalid input syntax for type uuid: ""
```

`RepositoryError` trasferisce il campo `message` dell'errore PostgREST così com'è (vedi `src/lib/supabase/types.ts:17`), e `handleSaveTransaction` lo mostra via `toast.error(message)`. L'utente vede la stringa troncata "invalid syntax to insert id".

---

## 5. Gestione ID: trasferimento vs entrata/uscita

Nessuna differenza. Per tutti i tipi:

- `TransactionInput.id` è opzionale (`{ id?: string }`)
- In `handleSaveTransaction` (AppDataContext.tsx:504), per nuovi movimenti l'id viene sempre estratto via destructuring: `const { id: _id, ...createData } = transactionData`
- `create()` nel repository non include mai `id` nel payload INSERT — Supabase genera l'UUID automaticamente

L'id non è la causa del problema.

---

## 6. Aggiornamento saldi dei due conti coinvolti

**Non esiste alcuna chiamata separata per aggiornare i saldi.**

Il saldo è calcolato interamente lato client in `src/lib/helpers.ts` (`calculateAccountBalance`):

- Conto **origine** (`contoId === account.id`): l'importo viene sottratto
- Conto **destinazione** (`contoDestinazioneId === account.id`): l'importo viene aggiunto
- Un singolo INSERT con `conto_destinazione_id` valorizzato è sufficiente per "aggiornare" logicamente entrambi i saldi al prossimo re-render

Non esistono trigger SQL né chiamate RPC separate per i saldi.

---

## 7. Riepilogo

| Punto | Trovato | File : riga |
|-------|---------|-------------|
| Funzione di salvataggio trasferimento | `handleSaveTransaction` → `addTransaction` → `create` | AppDataContext.tsx:490, :345; transazioni.ts:74 |
| ID generato diversamente per trasferimento? | No, identico a entrata/uscita | AppDataContext.tsx:504 |
| Chiamate separate per aggiornare saldi? | No, saldo calcolato runtime | helpers.ts |
| **Causa bug** | `categoriaId: ''` → `categoria_id = ''` su colonna UUID | TransactionDialog.tsx:192; transazioni.ts:33 |

---

## 8. Dove intervenire (senza ancora toccare nulla)

Il punto minimo di correzione è **uno solo** dei due seguenti:

**Opzione A** — `TransactionDialog.tsx:192`  
Cambiare `''` in `undefined` so che `toDb` non includa `categoria_id` nel payload:
```typescript
// prima
categoriaId: tipo === 'trasferimento' ? '' : categoriaId,
// dopo
categoriaId: tipo === 'trasferimento' ? undefined : categoriaId,
```
Nota: `TransactionInput.categoriaId` è `string` non optional — richiederebbe di allentare il tipo o di gestire il caso in `toDb`.

**Opzione B** — `repositories/transazioni.ts:33` (in `toDb`)  
Aggiungere il guard sulla stringa vuota e mappare a `null`:
```typescript
// prima
if (data.categoriaId !== undefined) out.categoria_id = data.categoriaId
// dopo
if (data.categoriaId !== undefined && data.categoriaId !== '') out.categoria_id = data.categoriaId || null
```
Oppure semplicemente: `out.categoria_id = data.categoriaId || null`

L'opzione B è più robusta perché difende il layer DB indipendentemente da chi chiama `toDb`.
