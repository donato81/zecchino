# P33 — Todo List: Migrazione CategoryManagement a useAppData()

> Pacchetto 33 — Blocco 4 (chiusura split-brain R2)
> Piano di riferimento: `docs/2 - coding plans/P33-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P33-migrazione-categorymanagement-useappdata.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-02
> Completato: 2026-05-02

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [x] |
| `npm run test:run` → tutti i test passed | [x] |
| `npx tsc --noEmit` → 0 errori TypeScript | [x] |
| `CategoryManagement.tsx` senza `useKV` e senza import da `@github/spark/hooks` | [x] |
| `CategoryManagement.tsx` usa `useAppData()` per lettura e scrittura categorie | [x] |
| Bottone "Modifica" disabilitato per categorie template (`disabled={category.predefinita}`) | [x] |
| Gestione errore FK via `toast.error` in `handleDeleteCategory` | [x] |
| `AppDataContext.tsx` con logica migrazione one-shot categorie personalizzate (Decisione B) | [x] |
| `grep -r "@github/spark/hooks" src/` → 0 risultati in file di produzione | [x] |
| Nessun file `.github/**` modificato | [x] |

---

## Prima di iniziare

- [x] Verificare che P28 sia completato (gate finale D superato)
- [x] `npm run build` exit 0 (baseline post-P28)
- [x] `npm run test:run` → tutti i test passed (baseline post-P28)
- [x] Leggere integralmente il coding plan `docs/2 - coding plans/P33-coding-plan.md`
- [x] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)

---

## Prerequisiti operativi

> Non iniziare il Passo A finché questi prerequisiti non sono verificati.

- [x] **PR0** — Verificare baseline build post-P28:
  ```bash
  npm run build
  ```
  > Esito PR0: exit 0 ✓

- [x] **PR1** — Verificare baseline test post-P28:
  ```bash
  npm run test:run
  ```
  > Esito PR1: 5/5 passed ✓

- [x] **PR2** — Verificare che `useAppData()` esponga `categories`, `addCategory`, `updateCategory`, `removeCategory`, `error`:
  ```bash
  grep -n "categories\|addCategory\|updateCategory\|removeCategory\|error" src/context/AppDataContext.tsx | head -20
  ```
  > Esito PR2: verificato ✓

---

## Passo A — Refactoring `CategoryManagement.tsx`

> Prerequisito: prerequisiti operativi PR0–PR2 verificati.
> File da modificare: `src/components/CategoryManagement.tsx`

### A1 — Rimozioni

- [x] Rimuovere `import { useKV } from '@github/spark/hooks'`
- [x] Rimuovere `const [categories, setCategories] = useKV<Category[]>('categories', [])` (riga 38)
- [x] Rimuovere le scritture dirette sul setter KV in `handleSaveCategory` (creazione — update ottimistico locale)
- [x] Rimuovere le scritture dirette sul setter KV in `handleSaveCategory` (modifica — update ottimistico locale)
- [x] Rimuovere le scritture dirette sul setter KV in `handleDeleteCategory`

### A2 — Aggiunte import e destrutturazione

- [x] Aggiungere `import { useAppData } from '@/context/AppDataContext'`
- [x] Destrutturare `{ categories, addCategory, updateCategory, removeCategory, error }` da `useAppData()`

### A3 — Pattern asincrono in `handleSaveCategory` (creazione)

- [x] Aggiungere `async` a `handleSaveCategory`
- [x] Chiamare `await addCategory(data)` in try/catch
- [x] Successo: `toast.success(...)` + `screenReader.announceSuccess(...)`, reset form, chiudi dialog
- [x] Errore (catch): `toast.error(err.message)` + `screenReader.announceError(...)`

### A4 — Pattern asincrono in `handleSaveCategory` (modifica)

- [x] Chiamare `await updateCategory(id, data)` in try/catch
- [x] Successo: `toast.success(...)` + `screenReader.announceSuccess(...)`, chiudi dialog
- [x] Errore (catch): `toast.error(err.message)` + `screenReader.announceError(...)`

### A5 — Pattern asincrono in `handleDeleteCategory` (Decisione A — toast globale)

- [x] Aggiungere `async` a `handleDeleteCategory`
- [x] Chiamare `await removeCategory(id)` in try/catch
- [x] Successo: `toast.success(...)` + `screenReader.announceSuccess(...)`
- [x] Errore FK (catch): `toast.error(error ?? err.message)` + `screenReader.announceError(...)` — il dialog si chiude automaticamente (`AlertDialogAction`), non tentare di riaprirlo
- [x] Verificare che `AlertDialogAction` non venga ristrutturato in `Dialog` custom: usare il pattern toast, non l'errore inline nel dialog

### A6 — Controlli UI per categorie template

- [x] Aggiungere `disabled={category.predefinita}` al bottone "Modifica" nella tabella categorie entrate
- [x] Aggiungere `disabled={category.predefinita}` al bottone "Modifica" nella tabella categorie uscite
- [x] Verificare che il bottone "Elimina" mantenga `disabled={category.predefinita}` già esistente in entrambe le tabelle
- [x] Verificare che `incomeCategories` e `expenseCategories` filtrino correttamente l'array `categories` da `useAppData()` per `tipo`

### A7 — Gate intermedio A

- [x] `npm run build` exit 0
- [x] `npm run test:run` → tutti i test passed (stessa baseline pre-P33)
- [x] `grep -r "@github/spark/hooks" src/` → 0 risultati in file di produzione (escluso `src/test/setup.ts`)

---

## Passo B — `AppDataContext.tsx`: migrazione one-shot (Decisione B)

> Prerequisito: Passo A completato.
> File da modificare: `src/context/AppDataContext.tsx`

### B1 — Detection del flag

- [x] Dopo `isDataReady = true`, verificare `preferences.legacy_categories_migrated` tramite il valore già in memoria dal bootstrap P27 (`impostazioni-utente.getOrCreate()`)
- [x] Se flag è `true`: skip della migrazione (early return)
- [x] Se flag è assente o `false`: procedere con B2

### B2 — Lettura categorie dal KV Spark

- [x] Accedere a `window.spark.kv.get('categories')` avvolto in try/catch
- [x] Filtrare le categorie con `predefinita: false` (personalizzate dall'utente)
- [x] Confrontare per `nome` e `tipo` con le categorie già presenti in `categories` (da `useAppData()`) per escludere duplicati

### B3 — Scrittura one-shot su Supabase

- [x] Per ciascuna categoria personalizzata non già presente: chiamare `addCategory({ nome, tipo, predefinita: false })`
- [x] Se `window.spark.kv.get` non è accessibile o array vuoto: skip senza errore
- [x] Se una singola scrittura fallisce: `console.warn(...)` e continuare il loop (non bloccare la migrazione)

### B4 — Impostazione del flag

- [x] Chiamare `updatePreference('legacy_categories_migrated', true)` da `impostazioni-utente` dopo il completamento del loop
- [x] Il flag viene impostato anche se nessuna categoria è stata migrata

### B5 — Gate intermedio B

- [x] `npm run build` exit 0
- [x] `npm run test:run` → tutti i test passed (stessa baseline pre-P33)
- [x] `npx tsc --noEmit` → 0 errori TypeScript

---

## Gate finale C (= gate P33)

- [x] `npm run build` exit 0
- [x] `npm run test:run` → tutti i test passed (stessa baseline pre-P33)
- [x] `npx tsc --noEmit` → 0 errori TypeScript
- [x] `grep -r "@github/spark/hooks" src/` → 0 risultati in file di produzione (solo `src/test/setup.ts` ammesso — mock, non produzione)
- [x] `grep useKV src/components/CategoryManagement.tsx` → 0 risultati
- [x] `grep -r "window\.spark\.kv" src/components/` → 0 risultati
- [x] Verifica a vista: bottone "Modifica" disabilitato per categorie template in entrambe le tabelle
- [x] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## Blocchi noti

> _Nessun blocco noto al momento dell'apertura del task._

---

## Note operative

- Per rilevare l'errore FK in `handleDeleteCategory` (A5): preferire il try/catch diretto sull'`await removeCategory(id)` e leggere il messaggio dall'eccezione, anziché dipendere dall'aggiornamento asincrono del campo `error` nel context.
- `window.spark.kv.get('categories')` (B2): avvolgere in try/catch — l'API Spark potrebbe non essere disponibile in produzione post-distribuzione.
- La logica di migrazione one-shot (B1–B4) deve essere eseguita dopo `isDataReady = true` per avere l'array `categories` già caricato da Supabase (necessario per il confronto duplicati).
- Dopo il gate finale C, il **Blocco 10** (decommissioning Spark) è sbloccato: rimuovere `@github/spark/hooks` da `package.json` ed eliminare il mock da `src/test/setup.ts`.
