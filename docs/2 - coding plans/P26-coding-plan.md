# P26 — Coding Plan: Strato di accesso dati Supabase

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: 26 — Blocco 2 migrazione Spark→Supabase (fondazione tecnica del layer dati)
> Design di riferimento: `docs/1 - projects/P26-strato-accesso-dati-supabase.md`
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md`
> Schema DB di riferimento: `docs/1 - projects/P25-schema-impostazioni-utente-cifrato.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-01

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P25.
- ⚠️ **Perimetro stretto:** questo blocco crea **solo** file nuovi in `src/lib/supabase/`. Nessun file `src/` esistente viene modificato. Nessuna modifica a contesti React, hook applicativi, componenti.
- ⚠️ **Prerequisito critico — dipendenza npm:** `@supabase/supabase-js` **non è ancora in `package.json`**. Prima di scrivere qualsiasi file `src/`, la dipendenza va installata (`npm install @supabase/supabase-js`). Senza di essa, la build è rotta fin dal Passo A.
- ⚠️ **Prerequisito critico — variabili d'ambiente:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` devono essere presenti nel file `.env.local` (non committato, escluso da `.gitignore`). Se mancano, il `client.ts` fallisce a compile-time con un errore esplicito da `import.meta.env`.
- ⚠️ **Prerequisito critico — P25 su Supabase:** i trigger `trg_sync_cifrato` e `trg_propagate_cifrato` e la tabella `impostazioni_utente` devono essere già attivi sul database Supabase prima che qualsiasi repository venga usato in modo integrato. Il Passo C in particolare dipende dal completamento di P25 §B.
- ⚠️ **File protetti SCF:** i file sotto `.github/instructions/`, `.github/agents/`, `.github/copilot-instructions.md`, `.github/AGENTS.md`, `.github/runtime/`, `.github/skills/`, `.github/prompts/`, `.github/changelogs/` non devono essere toccati in nessun caso.
- ⚠️ **Nessuna modifica a `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`** — salvo piccoli aggiornamenti inevitabili imposti dall'installazione di `@supabase/supabase-js` (tipi). In tal caso documentare la modifica.
- ⚠️ **`cifrato` non va mai nel payload di scrittura di `transazioni`:** il trigger DB `trg_sync_cifrato` (P25 §4.4) lo popola automaticamente. Questo vale sia per `create()` sia per `update()`. Forzarlo esplicitamente è un errore.
- ⚠️ **`user_id` non va mai nei tipi pubblici restituiti dai repository:** è responsabilità delle funzioni interne `toClient()` rimuoverlo prima di restituire il record. Il chiamante non deve mai vedere né passare `user_id`.
- ⚠️ **Discrepanza schema DB vs tipi TS:** lo schema reale Supabase contiene campi non ancora presenti in `src/lib/types.ts` (vedi §Ambiguità). Le funzioni `toClient()` mappano **solo** i campi presenti nei tipi TS correnti; i campi DB aggiuntivi vengono ignorati in questa fase.

---

## File creati

| File | Descrizione |
|---|---|
| `docs/2 - coding plans/P26-coding-plan.md` | Questo documento |
| `docs/3 - todo lists/P26-todo.md` | Todo specifico P26 |
| `src/lib/supabase/client.ts` | Singleton del client Supabase |
| `src/lib/supabase/types.ts` | Tipi interni del layer: UserPreferences, UserSettings, tipi DB row-level, RepositoryError |
| `src/lib/supabase/repositories/conti.ts` | Repository per la tabella `conti` |
| `src/lib/supabase/repositories/transazioni.ts` | Repository per la tabella `transazioni` |
| `src/lib/supabase/repositories/categorie.ts` | Repository per la tabella `categorie` |
| `src/lib/supabase/repositories/budget.ts` | Repository per la tabella `budget` |
| `src/lib/supabase/repositories/obiettivi-risparmio.ts` | Repository per la tabella `obiettivi_risparmio` |
| `src/lib/supabase/repositories/impostazioni-utente.ts` | Repository per la tabella `impostazioni_utente` |

## File modificati

| File | Descrizione |
|---|---|
| `package.json` | Aggiunta dipendenza `@supabase/supabase-js` |
| `docs/todo.md` | P25 spostato in completati; P26 aggiunto in attivi |

## File invariati

| File / Area | Motivazione |
|---|---|
| `src/App.tsx`, `src/context/**`, `src/hooks/**`, `src/components/**` | Nessun file sorgente esistente viene modificato — perimetro stretto P26 |
| `src/lib/types.ts` | I tipi di dominio sono già corretti e vengono usati dai repository; nessuna modifica necessaria in P26 |
| `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js` | Invariati (salvo aggiornamento automatico tipi da npm — documentare se accade) |
| `.env.local` | Non committato; la sua presenza è un prerequisito, non un output di P26 |
| `.github/**` | Protetto da `framework-guard.instructions.md` |

---

## Decisioni vincolanti (da P26 §4–6, non rimesse in discussione)

| ID | Decisione | Effetto pratico |
|---|---|---|
| **A** | Gli errori Supabase vengono **lanciati al chiamante** come `RepositoryError` | Nessun toast dentro i repository. Ogni `PostgrestError` va wrappato e rilanciato. |
| **B** | Mapping camelCase ↔ snake_case **manuale** nei repository | Ogni repository ha `toClient()` e `toDb()` privati. Nessuna libreria aggiuntiva. |
| **C** | **Nessuna subscription realtime** in fase 1 | Nessun canale Supabase Realtime da aprire, gestire o chiudere. |

---

## Schema riepilogativo delle operazioni

```
P26 — Strato di accesso dati Supabase
│
├── Prerequisito 0: npm install @supabase/supabase-js
│   └── Verifica: package.json aggiornato, npm run build exit 0
│
├── Prerequisito 1: variabili d'ambiente
│   └── .env.local contiene VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
│
├── Prerequisito 2: P25 completato su Supabase
│   └── trg_sync_cifrato e trg_propagate_cifrato attivi, impostazioni_utente presente
│
├── Passo A — Infrastruttura base
│   ├── src/lib/supabase/client.ts
│   │   └── Singleton supabase; legge VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
│   ├── src/lib/supabase/types.ts
│   │   ├── RepositoryError (wrapping PostgrestError)
│   │   ├── UserPreferences (28 chiavi del JSONB preferences — vedi P25 §3.1)
│   │   ├── UserSettings (record completo impostazioni_utente lato client)
│   │   └── DbAccount, DbTransaction, DbCategory, DbBudget, DbSavingsGoal
│   │       (tipi row-level snake_case — interni, non esportati fuori dal layer)
│   └── Gate intermedio A: build exit 0; test 5 passed; nessun import supabase
│       fuori da src/lib/supabase/
│
├── Passo B — Repository di dominio  [PREREQUISITO: Passo A completato]
│   ├── src/lib/supabase/repositories/conti.ts
│   │   └── getAll, getById, create, update, remove
│   │       toClient(): DbAccount → Account (ignora campi extra DB)
│   │       toDb(): Partial<Account> → snake_case (senza user_id)
│   ├── src/lib/supabase/repositories/transazioni.ts
│   │   └── getAll(filtri?), getById, create, update, remove
│   │       toDb(): esclude sempre cifrato dal payload (trigger DB)
│   ├── src/lib/supabase/repositories/categorie.ts
│   │   └── getAll (include template user_id=NULL), create, update, remove
│   │       create/update/remove: solo su righe dell'utente
│   ├── src/lib/supabase/repositories/budget.ts
│   │   └── getAll, getById, create, update, remove
│   ├── src/lib/supabase/repositories/obiettivi-risparmio.ts
│   │   └── getAll, getById, create, update, remove, updateProgress
│   │       updateProgress: aggiorna importo_corrente + completato atomicamente
│   └── Gate intermedio B: build exit 0; test 5 passed; nessun import supabase
│       fuori da src/lib/supabase/; verifica manuale getAll su conti (se .env.local disponibile)
│
└── Passo C — Repository impostazioni-utente  [PREREQUISITO: Passo B completato]
    ├── src/lib/supabase/repositories/impostazioni-utente.ts
    │   └── getOrCreate, updateField, updatePreference, updatePinHash
    │       getOrCreate: crea con default P25 §3.4 se il record non esiste
    │       updatePreference: merge JSONB chirurgico su singola chiave
    │       updatePinHash: alias semantico di updateField('pin_privato_hash', hash)
    └── Gate finale: build exit 0; test 5 passed; nessun import supabase fuori
        da src/lib/supabase/; nessun file src/ preesistente modificato
```

---

## Piano operativo dettagliato

### Prerequisiti — Prima di scrivere codice

#### PR0 — Installazione dipendenza `@supabase/supabase-js`

`@supabase/supabase-js` non è presente in `package.json`. Senza di essa
la build è rotta appena viene scritto il primo `import { createClient } from '@supabase/supabase-js'`.

Operazioni:
1. Eseguire `npm install @supabase/supabase-js` nel terminale nella root del progetto.
2. Verificare che `package.json` mostri la dipendenza sotto `dependencies`.
3. Eseguire `npm run build` → atteso exit 0 (con sole modifiche alla dipendenza — nessun file `src/` ancora creato).

#### PR1 — Variabili d'ambiente

Verificare la presenza di `.env.local` nella root del progetto con i valori:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Se il file non esiste o mancano le chiavi, `client.ts` non funzionerà a runtime.
Le chiavi si trovano nel pannello Supabase → Project Settings → API.
**Non committare `.env.local`** — è già in `.gitignore`.

#### PR2 — Conferma P25 completato

Verificare che sul database Supabase siano presenti:
- Tabella `impostazioni_utente` con schema P25 §3.4.
- Trigger `trg_sync_cifrato` sulla tabella `transazioni`.
- Trigger `trg_propagate_cifrato` sulla tabella `conti`.

Se P25 non è stato ancora eseguito su Supabase, il Passo C non può essere completato in modo integrato (i Passi A e B possono comunque essere scritti e compilati).

---

### Passo A — Infrastruttura base (`client.ts` + `types.ts`)

**Obiettivo:** creare la struttura minima che permette a tutti i repository di funzionare: il singleton del client e i tipi condivisi del layer.

#### File da creare: `src/lib/supabase/client.ts`

- Importa `createClient` da `@supabase/supabase-js`.
- Legge `import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_ANON_KEY`.
- Se una delle due variabili è assente o vuota, lancia un errore esplicito a compile-time / all'inizializzazione (`throw new Error('...')`), con indicazione chiara di quale variabile manca.
- Esporta un'unica istanza `supabase` di tipo `SupabaseClient`.
- Questo è l'**unico file** che importa `@supabase/supabase-js` direttamente. Tutti gli altri passano da qui.

#### File da creare: `src/lib/supabase/types.ts`

Espone i seguenti tipi:

**`RepositoryError`**
- Classe o interfaccia che wrappa `PostgrestError` di Supabase.
- Distinguibile a runtime dagli altri errori con `instanceof` o controllo su una proprietà discriminante.
- Espone almeno: `message`, `code`, `details`, `cause` (il `PostgrestError` originale).

**`UserPreferences`**
- Interfaccia con esattamente 28 chiavi corrispondenti al JSONB `preferences` di `impostazioni_utente` (vedi P25 §3.1 Opzione 2 e i default P25 §3.4).
- I nomi delle chiavi usano underscore come nel JSONB: `display_show_balances`, `display_show_account_icons`, ecc.
- I tipi corrispondono ai default P25: boolean, number, string, object o null secondo il campo.

**`UserSettings`**
- Record completo di `impostazioni_utente` lato client (senza `user_id`).
- Campi: `nomeVisualizzato: string | null`, `valutaDefault: string`, `pinPrivatoHash: string | null`, `preferences: UserPreferences`.
- Non include `id` (UUID interno), `user_id` (mai esposto), `createdAt` / `updatedAt` (non necessari al chiamante in fase 1).

**`DbAccount`, `DbTransaction`, `DbCategory`, `DbBudget`, `DbSavingsGoal`**
- Interfacce row-level che rappresentano la riga Supabase in snake_case con tutti i campi DB (compresi `user_id`, `created_at`, `updated_at` e campi non presenti in `src/lib/types.ts`).
- **Non esportate fuori da `src/lib/supabase/`**: usate solo internamente alle funzioni `toClient()` e `toDb()` di ciascun repository.
- Devono riflettere lo schema reale verificato (vedi §Ambiguità — discrepanza schema DB vs tipi TS).

#### Verifica intermedia Passo A

- `npm run build` exit 0.
- `npm run test:run` → 5 passed.
- Nessun import di `@supabase/supabase-js` fuori da `src/lib/supabase/client.ts` (verificabile con grep).
- `src/lib/supabase/types.ts` compilato senza errori TypeScript.

---

### Passo B — Repository di dominio

**Obiettivo:** creare i 5 repository per le tabelle di dominio. Ciascuno è autonomo e non dipende dagli altri.

**Regola comune a tutti i repository:**
- Ogni repository importa `supabase` da `../client` e i tipi da `../types`.
- I tipi di dominio pubblici (`Account`, `Transaction`, ecc.) vengono importati da `src/lib/types.ts`.
- `user_id` viene iniettato internamente da `(await supabase.auth.getUser()).data.user?.id` — mai fornito dal chiamante.
- Errori Supabase (`PostgrestError`) vengono wrappati in `RepositoryError` e rilanciati.
- Le funzioni `toClient()` e `toDb()` sono private al file (non esportate).

#### File da creare: `src/lib/supabase/repositories/conti.ts`

Tabella DB: `conti`. Campi reali DB: `id, user_id, nome, tipo, saldo_iniziale, valuta, is_privato, data_creazione, colore, icona, archiviato, ordine, created_at, updated_at`.

Contratto pubblico (P26 §7.1):
- `getAll(): Promise<Account[]>` — ordine default `data_creazione ASC`.
- `getById(id: string): Promise<Account>` — lancia `RepositoryError` se non trovato.
- `create(data: Omit<Account, 'id'>): Promise<Account>` — `user_id` iniettato; `id` generato da DB.
- `update(id: string, data: Partial<Omit<Account, 'id'>>): Promise<Account>` — aggiornamento parziale.
- `remove(id: string): Promise<void>` — lancia `RepositoryError` se RLS blocca.

Nota mapping: `toClient()` mappa solo i campi presenti in `Account` (types.ts). I campi `colore`, `icona`, `archiviato`, `ordine` del DB vengono ignorati (non presenti nel tipo TS corrente — vedi §Ambiguità).

#### File da creare: `src/lib/supabase/repositories/transazioni.ts`

Tabella DB: `transazioni`. Campi reali DB: `id, user_id, conto_id, conto_destinazione_id, categoria_id, tipo, importo, data, descrizione, note, cifrato, ricorrente, frequenza_ricorrenza, ricorrenza_fine, created_at, updated_at`.

Contratto pubblico (P26 §7.2):
- `getAll(filtri?): Promise<Transaction[]>` — filtri opzionali `contoId`, `categoriaId`, `dataInizio`, `dataFine`, `tipo`; AND additivi; ordine default `data DESC`.
- `getById(id: string): Promise<Transaction>`.
- `create(data: Omit<Transaction, 'id' | 'cifrato'>): Promise<Transaction>` — `cifrato` **escluso dal payload** (popolato dal trigger `trg_sync_cifrato`).
- `update(id: string, data: Partial<Omit<Transaction, 'id' | 'cifrato'>>): Promise<Transaction>` — idem.
- `remove(id: string): Promise<void>`.

Nota mapping: `toDb()` **non include mai `cifrato`** nel payload di INSERT o UPDATE. Il campo `note` del DB non è in `Transaction` (types.ts) e viene ignorato da `toClient()`.

#### File da creare: `src/lib/supabase/repositories/categorie.ts`

Tabella DB: `categorie`. Campi reali DB: `id, user_id, nome, tipo, predefinita, icona, colore, archiviata, created_at, updated_at`.

Contratto pubblico (P26 §7.3):
- `getAll(): Promise<Category[]>` — include righe template (`user_id IS NULL`, distinguibili da `predefinita: true`). RLS deve consentire SELECT su `user_id IS NULL OR auth.uid() = user_id`.
- `create(data: Omit<Category, 'id'>): Promise<Category>` — solo categorie dell'utente.
- `update(id: string, data: Partial<Omit<Category, 'id'>>): Promise<Category>` — solo righe dell'utente; tentativo su template lancia `RepositoryError`.
- `remove(id: string): Promise<void>` — solo righe dell'utente.

Nota mapping: `icona`, `colore`, `archiviata` del DB non sono in `Category` (types.ts) e vengono ignorati da `toClient()`.

#### File da creare: `src/lib/supabase/repositories/budget.ts`

Tabella DB: `budget`. Campi reali DB: `id, user_id, nome, importo_target, periodo, categoria_id, conto_id, data_inizio, data_fine, attivo, notifica_soglia, created_at, updated_at`.

Contratto pubblico (P26 §7.4):
- `getAll(): Promise<Budget[]>` — ordine default `data_inizio DESC`.
- `getById(id: string): Promise<Budget>`.
- `create(data: Omit<Budget, 'id'>): Promise<Budget>`.
- `update(id: string, data: Partial<Omit<Budget, 'id'>>): Promise<Budget>`.
- `remove(id: string): Promise<void>`.

Nota mapping: `notifica_soglia` del DB non è in `Budget` (types.ts) e viene ignorato da `toClient()`.

#### File da creare: `src/lib/supabase/repositories/obiettivi-risparmio.ts`

Tabella DB: `obiettivi_risparmio`. Campi reali DB: `id, user_id, conto_associato, nome, descrizione, importo_target, importo_corrente, data_inizio, data_scadenza, colore, icona, completato, data_completamento, created_at, updated_at`.

Contratto pubblico (P26 §7.5):
- `getAll(): Promise<SavingsGoal[]>`.
- `getById(id: string): Promise<SavingsGoal>`.
- `create(data: Omit<SavingsGoal, 'id'>): Promise<SavingsGoal>`.
- `update(id: string, data: Partial<Omit<SavingsGoal, 'id'>>): Promise<SavingsGoal>`.
- `updateProgress(id: string, importoCorrente: number): Promise<SavingsGoal>` — aggiorna `importo_corrente` e, se `importoCorrente >= importo_target`, imposta `completato = TRUE` e `data_completamento = now()` in una singola UPDATE atomica.
- `remove(id: string): Promise<void>`.

Nota mapping: tutti i campi presenti in `SavingsGoal` (types.ts) hanno corrispondenza nel DB. Nessun campo extra da ignorare in questa tabella.

#### Verifica intermedia Passo B

- `npm run build` exit 0.
- `npm run test:run` → 5 passed (i test esistenti non toccano il layer supabase — invarianti).
- Nessun import di `@supabase/supabase-js` fuori da `src/lib/supabase/client.ts`.
- Nessun file in `src/` preesistente modificato.
- **Facoltativo** (se `.env.local` presente): verifica manuale che `conti.getAll()` restituisce array senza eccezioni su un progetto Supabase con RLS attiva e utente autenticato.

---

### Passo C — Repository `impostazioni-utente`

**Obiettivo:** creare il repository per la tabella `impostazioni_utente` (schema P25 §3.4). Questo repository è separato dagli altri per la sua logica più complessa (`getOrCreate`, merge JSONB chirurgico).

**Dipendenza diretta:** P25 completato su Supabase (tabella e trigger attivi).

#### File da creare: `src/lib/supabase/repositories/impostazioni-utente.ts`

Tabella DB: `impostazioni_utente`. Campi (schema P25 §3.4): `id, user_id, nome_visualizzato, valuta_default, pin_privato_hash, preferences (JSONB), created_at, updated_at`.

Contratto pubblico (P26 §7.6):
- `getOrCreate(): Promise<UserSettings>` — se il record per l'utente corrente esiste: lo restituisce. Se non esiste: lo inserisce con i default P25 §3.4 e lo restituisce. Non restituisce mai `null`.
- `updateField(campo: keyof Omit<UserSettings, 'preferences'>, valore: string | null): Promise<UserSettings>` — aggiorna uno dei campi tipizzati (`nomeVisualizzato`, `valutaDefault`, `pinPrivatoHash`). Non usare per le preferenze.
- `updatePreference(chiave: keyof UserPreferences, valore: boolean | number | string | object | null): Promise<UserSettings>` — merge JSONB chirurgico su una singola chiave di `preferences`. Non sovrascrive le altre chiavi. Corrisponde a `preferences = preferences || jsonb_build_object(chiave, valore)`.
- `updatePinHash(hash: string | null): Promise<void>` — alias semantico di `updateField('pinPrivatoHash', hash)`. Separato per chiarezza e per facilitare audit futuro sul codice che tocca l'hash del PIN.

Note implementative:
- `getOrCreate()` usa `upsert` Supabase con `onConflict: 'user_id'` oppure una logica `select` + `insert` con gestione del conflitto.
- Il record creato da `getOrCreate()` usa i default P25 §3.4 per il JSONB `preferences` (i 28 valori già nel DEFAULT della colonna — non serve passarli esplicitamente se si usa INSERT senza il campo).
- `updatePreference()` **non deve** fare `getOrCreate()` + merge JS + `update()` completo: usare un UPDATE con operatore JSONB di merge (`||`) direttamente su Supabase per evitare race condition.

#### Verifica intermedia Passo C (gate finale)

- `npm run build` exit 0.
- `npm run test:run` → 5 passed.
- Nessun import di `@supabase/supabase-js` fuori da `src/lib/supabase/client.ts`.
- Nessun file `src/` preesistente modificato (verificare con `git diff --name-only`).
- **Facoltativo** (se P25 completato su Supabase e `.env.local` presente): verifica manuale che `impostazioni-utente.getOrCreate()` restituisce un record con le 28 chiavi attese nel campo `preferences`.

---

## Ambiguità e punti da verificare prima dell'implementazione

### AI1 — Discrepanza schema DB vs tipi TS

Lo schema reale Supabase contiene campi che **non sono** nei tipi dominio di `src/lib/types.ts`:

| Tabella | Campi in DB non in types.ts | Strategia P26 |
|---|---|---|
| `conti` | `colore`, `icona`, `archiviato`, `ordine` | Ignorati da `toClient()`. Non inclusi nel tipo `Account`. |
| `transazioni` | `note`, `ricorrenza_fine` | Ignorati da `toClient()`. Non inclusi in `Transaction`. |
| `categorie` | `icona`, `colore`, `archiviata` | Ignorati da `toClient()`. Non inclusi in `Category`. |
| `budget` | `notifica_soglia` | Ignorato da `toClient()`. Non incluso in `Budget`. |
| `obiettivi_risparmio` | — | Nessuna discrepanza. |

**Azione richiesta prima del Passo B:** confermare con il team che questa strategia è accettabile. Se uno o più campi extra devono essere surfaciati al client, `src/lib/types.ts` va aggiornato **prima** di scrivere le funzioni `toClient()`. Aggiornare `src/lib/types.ts` è fuori dal perimetro di P26 come definito dal design — richiederebbe un'estensione del piano.

### AI2 — RLS su `categorie` per righe template

La policy RLS attuale di `categorie` (se presente) deve consentire SELECT su righe con `user_id IS NULL` (template predefinite). Se la policy consente solo `auth.uid() = user_id`, le righe template non saranno visibili. Verificare la policy attuale su Supabase prima di scrivere `categorie.ts`.

### AI3 — Strategia `getOrCreate` per `impostazioni_utente`

Se tra la prima registrazione e il completamento dell'onboarding (Blocco 9) il record non esiste, `getOrCreate()` lo crea. Verificare che la policy RLS di `impostazioni_utente` consenta INSERT (e non solo SELECT/UPDATE) per l'utente corrente. Questo è stato definito in P25 (4 policy: SELECT, INSERT, UPDATE, DELETE) — ma va confermato sullo schema reale.

### AI4 — Tipo di `import.meta.env` in TypeScript

Con Vite, `import.meta.env.VITE_*` è tipizzato tramite `vite/client`. Verificare che `tsconfig.json` includa `vite/client` nei tipi (di solito già presente da setup Vite). Se mancante, aggiungere `"types": ["vite/client"]` in `tsconfig.json` è una modifica minima accettabile.

---

## Criteri di uscita — Definition of Done

- [ ] `@supabase/supabase-js` presente in `package.json` `dependencies`.
- [ ] `npm run build` exit 0 con tutti i 9 file `src/lib/supabase/**` presenti.
- [ ] `npm run test:run` → 5 passed (nessun test esistente rotto).
- [ ] Nessun import di `@supabase/supabase-js` fuori da `src/lib/supabase/client.ts`.
- [ ] Nessun file `src/` preesistente modificato (confermato con `git diff --name-only`).
- [ ] La funzione `toDb()` di `transazioni.ts` non include mai il campo `cifrato` nel payload.
- [ ] La funzione `toClient()` di tutti i repository non include mai `user_id` nell'output.
- [ ] `UserPreferences` in `types.ts` contiene esattamente 28 chiavi.
- [ ] `UserSettings` in `types.ts` non espone `user_id`, `id`, `created_at`, `updated_at`.
- [ ] `RepositoryError` è distinguibile a runtime da altri errori.
- [ ] Il punto AI1 (discrepanza schema DB vs tipi TS) è stato confermato o risolto prima del Passo B.
- [ ] Il punto AI2 (RLS categorie template) è stato verificato su Supabase.
- [ ] Nessun file in `.github/` modificato.

---

*Fine documento. Nessun file sorgente preesistente viene modificato da questo piano.*
