# P34 — Todo: Migrazione DataManagement a Supabase

> Pacchetto P34 — Blocco 7: Fronte A one-shot Spark → Supabase + Fronte B export/import Supabase
> Piano di riferimento: `docs/2 - coding plans/P34-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P34-migrazione-datamanagement-supabase.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-03
> Completato: 2026-05-03

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [x] PASS |
| `npm run lint` → 0 errori; 5 warning pre-esistenti | [x] PASS |
| `npm run test:run` → tutti i test passed (5/5) | [x] PASS |
| `window.spark.kv.*` nel Fronte B | [x] RIMOSSO |
| `window.location.reload()` in `DataManagement.tsx` | [x] RIMOSSO |
| Fronte A con soli accessi KV ammessi (`keys`, `get('accounts')`, `get('transactions')`, `get('budgets')`, `get('savings-goals')`) | [x] PRESENTE |
| Campo FK obiettivi di risparmio verificato (`contoAssociato`) | [x] VERIFICATO |
| Nessun file in `src/lib/supabase/` modificato | [x] |
| `git diff --name-only HEAD \| grep ".github"` | [x] Deviazione nota: solo `.github/runtime/orchestrator-state.json` aggiornato dall'orchestrazione |

---

## Prima di iniziare

> Non avviare il Passo A finché questi controlli non sono completati e documentati.

- [x] Leggere integralmente il todo specifico `docs/3 - todo lists/P34-todo.md`

### BL1 — Baseline build, lint e test

- [x] `npm run build` → exit 0 (baseline e gate finale coerenti; warning CSS pre-esistenti non bloccanti)
- [x] `npm run lint` → 0 errori; 5 warning (baseline pre-P34 e post-fix invariata)
- [x] `npm run test:run` → tutti i test passed — annotare il numero esatto trovato:
	> Esito BL1 test: 5/5 passed

### BL2 — Verifica stato iniziale di `DataManagement.tsx`

- [x] Verificare le occorrenze baseline di `window.spark.kv`:
	> Esito BL2 baseline:
	> - `handleExportData`: `window.spark.kv.keys()` + iterazione con `window.spark.kv.get(key)`
	> - `handleImportData`: iterazione con `window.spark.kv.set(key, value)`
	> - post-import: `window.location.reload()` via `setTimeout`
	> 
	> Esito post-fix:
	> - restano solo 5 occorrenze in Fronte A: `keys()` e `get()` sulle 4 chiavi di dominio
	> - nessuna occorrenza di `window.location.reload()`

### BL3 — Verifica nome campo FK obiettivi di risparmio

- [x] Leggere il repository `src/lib/supabase/repositories/obiettivi-risparmio.ts`
- [x] Annotare il nome reale del campo FK verso i conti:
	> Esito BL3: il campo reale è `contoAssociato` lato client, serializzato in DB come `conto_associato`

### BL4 — Verifica path hook `useUserSettings`

- [x] Verificare il path pubblico da usare nei consumer:
	> Esito BL4: il path pubblico è `@/context/UserSettingsContext`
- [x] Annotare la nota di implementazione reale:
	> `useUserSettings()` non espone direttamente `preferences`; per leggere `legacy_domain_migrated` il componente usa `useAuth().userSettings?.preferences`, mentre la scrittura usa `updatePreference()` da `@/lib/supabase/repositories/impostazioni-utente`

### BL5 — Verifica path repository P26

- [x] Verificare la cartella `src/lib/supabase/repositories/`
- [x] Annotare i file usati da P34:
	> Esito BL5:
	> - `conti.ts`
	> - `budget.ts`
	> - `obiettivi-risparmio.ts`
	> - `transazioni.ts`
	> - `impostazioni-utente.ts`

---

## Fronte A — Migrazione one-shot (Step A1–A10)

- [x] [A1] Aggiungere lettura di stato utente al mount (`useUserSettings()` per readiness, `useAuth().userSettings?.preferences` per il flag `legacy_domain_migrated`) e inizializzare `migrationChecked`
- [x] [A2] Implementare il rilevamento al mount con le condizioni doppie: flag assente/false + chiavi di dominio nel KV Spark
- [x] [A3] Implementare i tre scenari PA-2 con filtro esplicito sulle sole chiavi di dominio; array non vuoto con sole chiavi escluse trattato come Scenario 2
- [x] [A4] Implementare il pannello UI condizionale con pulsante `Avvia importazione storica`, pulsante `Salta per ora` e annuncio screen reader
- [x] [A5] Implementare Fase 1: lettura e validazione strutturale delle 4 chiavi Spark (`accounts`, `transactions`, `budgets`, `savings-goals`)
- [x] [A6] Implementare la mappa `sparkId → supabaseId` durante l'inserimento dei conti
- [x] [A7] Implementare l'ordine FK corretto con remapping: conti → budget → obiettivi di risparmio (`contoAssociato`) → transazioni; `cifrato` omesso dal payload
- [x] [A8] Implementare l'accumulatore `migrationErrors: Array<{ entity, id, message }>` con strategia best-effort
- [x] [A9] Implementare l'indicatore di avanzamento con live region e messaggi di fase
- [x] [A10] Implementare il completamento: flag `legacy_domain_migrated` solo se `migrationErrors.length === 0`; `refreshAll()` solo in assenza di errori; report e toast coerenti

---

## Fronte B — Export/import Supabase (Step B1–B10)

- [x] [B1] Riscrivere `handleExportData` usando `useAppData()` e rimuovendo `window.spark.kv.keys()`/`get(key)`
- [x] [B2] Costruire il payload JSON `{ meta, accounts, transactions, budgets, savingsGoals }` con `schema_version: "1.0"`
- [x] [B3] Produrre il file `zecchino-backup-YYYY-MM-DD.json` via blob con toast e annuncio screen reader
- [x] [B4] Riscrivere `handleImportData` rimuovendo `window.spark.kv.set(key, value)` e aggiungendo `useAuth()` + repository P26
- [x] [B5] Implementare parsing e validazione del file JSON, inclusi controllo `schema_version` major e warning best-effort sugli ID non UUID
- [x] [B6] Implementare l'ordine di scrittura FK corretto: conti → budget → obiettivi di risparmio → transazioni
- [x] [B7] Implementare l'upsert semantico `getById()` + `create()`/`update()` con fallback di matching strutturale per backup legacy non allineati
- [x] [B8] Omettere `cifrato` dal payload di `create()`/`update()` del repository `transazioni`
- [x] [B9] Implementare accumulatore errori, avanzamento e report finale; `refreshAll()` sempre al termine del Fronte B
- [x] [B10] Sostituire `window.location.reload()` con `refreshAll()`

---

## Verifica finale

- [x] Nessun accesso a `window.spark.kv.*` nel Fronte B
- [x] Il Fronte A accede a `window.spark.kv.*` solo per `keys()` e per `get()` delle 4 chiavi di dominio
- [x] L'export produce JSON con struttura `{ meta, accounts, transactions, budgets, savingsGoals }`
- [x] L'import scrive nell'ordine FK corretto: conti → budget → obiettivi → transazioni
- [x] Il meccanismo upsert è additivo/aggiornante e non esegue delete
- [x] Il campo `cifrato` non entra nei payload di scrittura
- [x] Il flag `legacy_domain_migrated` viene impostato solo a `migrationErrors.length === 0`
- [x] `refreshAll()` sostituisce `window.location.reload()` in entrambi i fronti, con asimmetria rispettata: Fronte A solo senza errori, Fronte B sempre
- [x] Il pannello di migrazione non viene mostrato agli utenti con flag già `true`
- [x] Le chiavi escluse non vengono processate dal Fronte B; nel Fronte A vengono ignorate silenziosamente
- [x] Array non vuoto con sole chiavi escluse → Scenario 2
- [x] `npm run build` exit 0
- [x] `npm run lint` → 0 errori (5 warning pre-esistenti)
- [x] `npm run test:run` → 5/5 PASS

---

## Checklist gate finale

| Gate | Atteso | Effettivo |
|---|---|---|
| `npm run build` | exit 0 | PASS |
| `npm run lint` | 0 errori; 5 warning | PASS |
| `npm run test:run` | tutti i test passed (5/5) | PASS |
| `window.spark.kv` in `src/components/DataManagement.tsx` | solo Fronte A | PASS — 5 occorrenze ammesse |
| `window.location.reload` in `src/components/DataManagement.tsx` | 0 risultati | PASS |
| File `src/lib/supabase/**` modificati | 0 | PASS |
| `git diff --name-only HEAD \| grep ".github"` | output vuoto | DEVIAZIONE NOTA — `.github/runtime/orchestrator-state.json` aggiornato dal runtime di orchestrazione, fuori perimetro funzionale P34 |
