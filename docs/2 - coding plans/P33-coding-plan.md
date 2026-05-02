# P33 — Coding Plan: Migrazione CategoryManagement a useAppData()

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: 33 — Blocco 4 (chiusura split-brain R2) — Migrazione CategoryManagement
> Design di riferimento: `docs/1 - projects/P33-migrazione-categorymanagement-useappdata.md`
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-02

---

## Prerequisiti obbligatori

- P28 completato. Tutti i gate finali P28 verificati (build, test, tsc).

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P32.
- ⚠️ **Perimetro dei file modificati:** `src/components/CategoryManagement.tsx` e `src/context/AppDataContext.tsx` (aggiunta logica migrazione one-shot categorie personalizzate — Decisione B). Nessun altro file sorgente esistente viene modificato.
- ⚠️ **File protetti SCF:** i file sotto `.github/instructions/`, `.github/agents/`, `.github/copilot-instructions.md`, `.github/AGENTS.md`, `.github/runtime/`, `.github/skills/`, `.github/prompts/`, `.github/changelogs/` non devono essere toccati in nessun caso.
- ⚠️ **Nessuna modifica a `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`** — salvo aggiornamenti imposti da nuovi import (documentare se accade).
- ⚠️ **P33 chiude l'ultima `useKV` di produzione** in tutto il codebase: la riga 38 di `CategoryManagement.tsx` (`useKV<Category[]>('categories', [])`). Dopo P33, nessun file `src/` di produzione ha più dipendenze da `@github/spark/hooks`. L'unica dipendenza residua è il mock in `src/test/setup.ts`, che viene rimosso nel Blocco 10.
- ⚠️ **`AppDataContext.tsx` già migrato da P28**: la superficie pubblica del context — inclusi `categories`, `addCategory`, `updateCategory`, `removeCategory`, `error` — è già definita e operativa dopo P28. P33 **non aggiunge** nuovi campi alla superficie pubblica: aggiunge solo la logica di migrazione one-shot (Decisione B) dentro il provider.
- ⚠️ **Distinzione template/personali**: le categorie con `predefinita: true` sono read-only per l'utente tramite RLS lato server. `CategoryManagement.tsx` disabilita i controlli di modifica e di eliminazione per queste righe con `disabled={category.predefinita}`. Il bottone "Modifica" acquisisce lo stesso flag che il bottone "Elimina" aveva già prima di P33 — allineamento necessario perché `updateCategory` su un template lancia `RepositoryError` (P28 §4).
- ⚠️ **Dipendenza da `useAppData()` P28**: `CategoryManagement.tsx` usa `categories`, `addCategory`, `updateCategory`, `removeCategory`, `error` da `useAppData()`. Prerequisito: P28 completato e tutti i gate P28 verificati.

---

## File creati

| File | Descrizione |
|---|---|
| `docs/2 - coding plans/P33-coding-plan.md` | Questo documento |
| `docs/3 - todo lists/P33-todo.md` | Todo specifico P33 |

## File modificati

| File | Descrizione |
|---|---|
| `src/components/CategoryManagement.tsx` | Rimozione `useKV` e import da `@github/spark/hooks`; sostituzione con `useAppData()`; pattern asincrono nei handler; gestione errore FK (Decisione A); disabled template (Passo A) |
| `src/context/AppDataContext.tsx` | Aggiunta logica migrazione one-shot categorie personalizzate da KV Spark (Decisione B — Passo B) |
| `docs/todo.md` | Aggiunta P33 nella tabella attivi |

## File invariati

| File / Area | Motivazione |
|---|---|
| `src/lib/constants.ts` | `DEFAULT_CATEGORIES` non è usata da `CategoryManagement.tsx` — P33 non tocca questo file; il destino finale di `DEFAULT_CATEGORIES` rimane il punto aperto documentato in P28 §12 |
| `src/context/VisibleDataContext.tsx` | Thin wrapper invariato — nessuna dipendenza da `useKV` diretta |
| `src/hooks/use-visible-data.ts` | Non dipende da `CategoryManagement.tsx` né da `useKV` direttamente |
| `src/context/AuthContext.tsx` | Migrato in P27 — usato come dipendenza transitiva, non modificato |
| `src/lib/supabase/**` | Creato in P26 — nessuna modifica necessaria |
| `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js` | Invariati |
| `.github/**` | Protetto da `framework-guard.instructions.md` |

---

## Decisioni vincolanti (da P33 — non rimesse in discussione)

| ID | Decisione | Effetto pratico |
|---|---|---|
| **A** | **Errore FK via toast globale** (Opzione 2 scelta) | Quando `removeCategory(id)` fallisce per vincolo referenziale (categoria usata da transazioni), `AlertDialogAction` di Radix UI chiude il dialog automaticamente al click — non è possibile mantenere il dialog aperto senza ristrutturare il componente. Un `toast.error` mostra il messaggio FK di P28 §9.3. Aggiungere anche `screenReader.announceError()` per accessibilità. Pattern coerente con `toast.success` già usato per i casi di successo. |
| **B** | **Migrazione one-shot categorie personalizzate** (Opzione 1 scelta) | Al primo accesso post-distribuzione P33, se `preferences.legacy_categories_migrated` non è `true`, `AppDataContext` legge le categorie personalizzate dal KV Spark, filtra quelle con `predefinita: false`, le scrive su Supabase tramite `categorie.create()` per ciascuna, poi imposta `preferences.legacy_categories_migrated = true` via `updatePreference`. Il Blocco 7 deve escludere la chiave `categories` dalla sua migrazione batch. |

---

## Schema riepilogativo delle operazioni

```
P33 — Migrazione CategoryManagement a useAppData()
│
├── Prerequisiti
│   ├── P28 completato (gate finale D superato)
│   │   └── useAppData() espone: categories, addCategory, updateCategory,
│   │       removeCategory, error
│   ├── PR0: npm run build exit 0 (baseline post-P28)
│   └── PR1: npm run test:run → tutti i test passed (baseline post-P28)
│
├── Passo A — Refactoring CategoryManagement.tsx
│   ├── A1: Rimozioni (useKV riga 38, import @github/spark/hooks, setter KV,
│   │   scritture ottimistiche)
│   ├── A2: Aggiunte (useAppData(), pattern asincrono in handleSaveCategory
│   │   e handleDeleteCategory con try/catch)
│   ├── A3: UI — disabled={category.predefinita} su bottone "Modifica"
│   │   (allineato al bottone "Elimina" già esistente)
│   ├── A4: Gestione errore FK (Decisione A — toast.error +
│   │   screenReader.announceError)
│   └── Gate A: build exit 0; test passed;
│       grep @github/spark/hooks src/ → 0 in produzione
│
├── Passo B — AppDataContext.tsx: migrazione one-shot (Decisione B)
│   ├── B1: Detection flag legacy_categories_migrated in preferences JSONB
│   ├── B2: Lettura categorie personalizzate da window.spark.kv.get('categories')
│   ├── B3: Scrittura one-shot su Supabase via addCategory() per ciascuna
│   ├── B4: Impostazione flag via updatePreference('legacy_categories_migrated', true)
│   └── Gate B: build exit 0; test passed; tsc 0 errori
│
└── Gate finale C (= gate P33)
    ├── build exit 0; test passed; tsc 0 errori
    ├── grep -r "@github/spark/hooks" src/ → 0 in produzione
    ├── grep useKV src/components/CategoryManagement.tsx → 0 risultati
    └── git diff --name-only HEAD | grep ".github" → output vuoto
```

---

## Piano operativo dettagliato

### Prerequisiti — Prima di scrivere codice

#### PR0 — Baseline build post-P28

```bash
npm run build
```

Atteso: exit 0.

#### PR1 — Baseline test post-P28

```bash
npm run test:run
```

Atteso: tutti i test passed (stessa baseline pre-P33).

#### PR2 — Verifica superficie pubblica `useAppData()` post-P28

Verificare che `AppDataContext.tsx` esponga i campi usati da P33:

```bash
grep -n "categories\|addCategory\|updateCategory\|removeCategory\|error" src/context/AppDataContext.tsx | head -20
```

---

### Passo A — Refactoring `CategoryManagement.tsx`

**File modificato:** `src/components/CategoryManagement.tsx`

**Obiettivo:** eliminare l'ultima `useKV` di produzione in tutto il codebase (riga 38); sostituire con `useAppData()`; rendere il componente consumer puro del context; allineare i controlli UI per le categorie template; gestire l'errore FK tramite toast (Decisione A).

#### A1 — Rimozioni

- Rimuovere `import { useKV } from '@github/spark/hooks'`.
- Rimuovere `const [categories, setCategories] = useKV<Category[]>('categories', [])` (riga 38).
- Rimuovere le scritture dirette sul setter KV in `handleSaveCategory` (creazione e modifica): sono gli aggiornamenti ottimistici sincroni sull'array locale.
- Rimuovere le scritture dirette sul setter KV in `handleDeleteCategory`.
- Rimuovere qualsiasi validazione che dipenda dalla mutazione locale dell'array `categories` (il componente non aggiorna più `categories` direttamente).

#### A2 — Aggiunte import e destrutturazione

- Aggiungere `import { useAppData } from '@/context/AppDataContext'`.
- Destrutturare `{ categories, addCategory, updateCategory, removeCategory, error }` da `useAppData()`.

**`handleSaveCategory` (creazione) — pattern asincrono:**

- Validazione: nome non vuoto (client-side, invariata).
- Chiamare `await addCategory(data)` dentro try/catch.
- Se successo: `toast.success(...)` + `screenReader.announceSuccess(...)`, reset form, chiudere dialog.
- Se errore (catch): `toast.error(err.message)` + `screenReader.announceError(...)`.

**`handleSaveCategory` (modifica) — pattern asincrono:**

- Validazione: nome non vuoto.
- Chiamare `await updateCategory(id, data)` dentro try/catch.
- Se successo: `toast.success(...)` + `screenReader.announceSuccess(...)`, chiudere dialog.
- Se errore (catch): `toast.error(err.message)` + `screenReader.announceError(...)`.

**`handleDeleteCategory` — pattern asincrono (Decisione A — toast globale):**

- `AlertDialogAction` chiude il dialog automaticamente al click — questo comportamento non va modificato.
- Chiamare `await removeCategory(id)` dentro try/catch.
- Se successo: `toast.success(...)` + `screenReader.announceSuccess(...)`.
- Se errore (catch) — incluso il caso FK: `toast.error(error ?? err.message)` + `screenReader.announceError(...)`. Il messaggio FK di P28 §9.3 è già disponibile nel campo `error` di `useAppData()` o nell'eccezione rilanciate dal context.

> **Nota:** l'approccio più affidabile per rilevare l'errore FK è intercettare l'eccezione direttamente nel try/catch del handler e leggere il messaggio dall'eccezione, piuttosto che dipendere dall'aggiornamento asincrono del campo `error` nel context (che potrebbe non sincronizzarsi atomicamente con il re-render).

#### A3 — Controlli UI per categorie template

- Aggiungere `disabled={category.predefinita}` al bottone "Modifica" nella tabella categorie entrate.
- Aggiungere `disabled={category.predefinita}` al bottone "Modifica" nella tabella categorie uscite.
- Verificare che il bottone "Elimina" mantenga `disabled={category.predefinita}` già esistente in entrambe le tabelle.
- Verificare che `incomeCategories` e `expenseCategories` (filtri su `tipo`) continuino a funzionare con l'array `categories` proveniente da `useAppData()` — stesso tipo di dato, stesso schema.

#### A4 — Gate intermedio A

- `npm run build` exit 0
- `npm run test:run` → tutti i test passed (stessa baseline pre-P33)
- `grep -r "@github/spark/hooks" src/` → 0 risultati in file di produzione (solo `src/test/setup.ts` è ammesso — mock, non produzione)

---

### Passo B — `AppDataContext.tsx`: migrazione one-shot categorie personalizzate (Decisione B)

**File modificato:** `src/context/AppDataContext.tsx`

**Obiettivo:** aggiungere la logica di migrazione one-shot delle categorie personalizzate dal KV Spark a Supabase, attivata al primo accesso post-distribuzione di P33 (P33 §6 Decisione B). Questa logica viene aggiunta dentro il provider, senza modificare la superficie pubblica di `useAppData()`.

#### B1 — Detection del flag

Al completamento del caricamento iniziale (`isDataReady = true`):

- Verificare il flag `legacy_categories_migrated` in `preferences JSONB` tramite `impostazioni-utente.getOrCreate()` (già disponibile da P27 — il valore è in memoria dal bootstrap).
- Se flag già `true`: skip della migrazione (non rieseguire).
- Se flag assente o `false`: procedere con B2.

#### B2 — Lettura dal KV Spark

- Accedere a `window.spark.kv.get('categories')` in modo difensivo (avvolgere in try/catch — l'API potrebbe non essere disponibile in ambiente di distribuzione post-migrazione).
- Filtrare le categorie con `predefinita: false` (quelle create dall'utente, non i template).
- Confrontare per `nome` e `tipo` con le categorie già presenti in `categories` (da `useAppData()`) per evitare duplicati.

#### B3 — Scrittura one-shot su Supabase

- Per ciascuna categoria personalizzata non già presente su Supabase: chiamare `addCategory({ nome, tipo, predefinita: false })`.
- Se `window.spark.kv.get` non è accessibile o restituisce array vuoto: skip senza errore.
- Se una singola scrittura fallisce: `console.warn(...)` e continuare il loop (non bloccare la migrazione per un singolo fallimento).

#### B4 — Impostazione del flag

- Dopo il completamento del loop (con successo o con warning parziali): chiamare `updatePreference('legacy_categories_migrated', true)` da `impostazioni-utente` (import già disponibile da P27).
- Il flag viene impostato anche se nessuna categoria è stata migrata (utente senza categorie personalizzate nel KV).

#### B5 — Gate intermedio B

- `npm run build` exit 0
- `npm run test:run` → tutti i test passed (stessa baseline pre-P33)
- `npx tsc --noEmit` → 0 errori TypeScript

---

### Gate finale C (= gate P33)

Tutti i passi A e B devono essere completati prima di verificare questo gate.

- `npm run build` exit 0
- `npm run test:run` → tutti i test passed (stessa baseline pre-P33)
- `npx tsc --noEmit` → 0 errori TypeScript
- `grep -r "@github/spark/hooks" src/` → 0 risultati in file di produzione (solo `src/test/setup.ts` ammesso)
- `grep useKV src/components/CategoryManagement.tsx` → 0 risultati
- `grep -r "window\.spark\.kv" src/components/` → 0 risultati (la lettura KV one-shot rimane solo dentro il provider `AppDataContext`)
- Verifica a vista: bottone "Modifica" disabilitato per categorie template in entrambe le tabelle (entrate e uscite)
- `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## Blocchi noti

> _Nessun blocco noto al momento dell'apertura del task._

---

## Note operative

- Il pattern per rilevare l'errore FK in `handleDeleteCategory` (A2): preferire il try/catch diretto sull'`await removeCategory(id)` e leggere il messaggio dall'eccezione — più affidabile rispetto a usare `useEffect([error])`.
- `window.spark.kv.get('categories')` (B2): avvolgere in try/catch. L'API Spark potrebbe non essere disponibile o restituire un formato diverso in produzione — gestire tutti i fallimenti silenziosi senza interrompere il flusso dell'app.
- La logica di migrazione one-shot (B1–B4) deve essere eseguita **dopo** `isDataReady = true` per avere accesso all'array `categories` già caricato da Supabase (necessario per il confronto duplicati in B2).
- Dopo il gate finale C, il **Blocco 10** (decommissioning Spark) è sbloccato: rimuovere `@github/spark/hooks` da `package.json`, eliminare il mock da `src/test/setup.ts`, e verificare `grep -r "@github/spark/hooks" src/` → 0 risultati totali.
