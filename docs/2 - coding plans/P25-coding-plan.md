# P25 — Coding Plan: Schema `impostazioni_utente` e campo `cifrato`

> Documento operativo.  
> Fase: Plan → Code  
> Pacchetto: 25 — Blocco 1 migrazione Spark→Supabase (gatekeeper formale)  
> Design di riferimento: `docs/1 - projects/P25-schema-impostazioni-utente-cifrato.md`  
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md`  
> Branch: `refactoring-architettura`  
> Data: 2026-04-30

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P23. P24 approvato come riferimento architetturale vincolante.
- ⚠️ **Perimetro stretto:** nessun file `src/` toccato. Questo blocco produce **solo script SQL e documentazione**. Nessuna modifica al codice applicativo.
- ⚠️ **File protetti SCF:** i file sotto `.github/instructions/`, `.github/agents/`, `.github/copilot-instructions.md`, `.github/AGENTS.md`, `.github/runtime/`, `.github/skills/`, `.github/prompts/`, `.github/changelogs/` non devono essere toccati in nessun caso.
- ⚠️ **Nessuna modifica a `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`.**
- ⚠️ **Dipendenza critica con Blocco 4 (P28):** il trigger `trg_sync_cifrato` e `trg_propagate_cifrato` devono essere presenti e funzionanti sul database Supabase **prima** che il Blocco 4 faccia INSERT su `transazioni`. Il Passo B di questo piano deve essere completato e verificato prima che P28 possa iniziare.
- ⚠️ **Schema reale Supabase:** P25 definisce lo schema *atteso*. Prima di eseguire DDL, lo schema reale della tabella `impostazioni_utente` già presente su Supabase deve essere confrontato colonna per colonna. Eventuali discrepanze vanno gestite con `ALTER TABLE` invece di `CREATE TABLE IF NOT EXISTS`.
- ⚠️ **Cartella `docs/5 - sql/`:** non esiste nel repository — va creata prima dei file SQL.

---

## File creati

| File | Descrizione |
|---|---|
| `docs/2 - coding plans/P25-coding-plan.md` | Questo documento |
| `docs/3 - todo lists/P25-todo.md` | Todo specifico P25 |
| `docs/5 - sql/P25-schema-impostazioni-utente.sql` | DDL + RLS + trigger `updated_at` per `impostazioni_utente` |
| `docs/5 - sql/P25-trigger-cifrato.sql` | Funzioni PL/pgSQL + trigger `trg_sync_cifrato` e `trg_propagate_cifrato` |

## File modificati

| File | Descrizione |
|---|---|
| `docs/todo.md` | Aggiunta riga P25 attivi; P24 spostato in completati |

## File invariati

| File / Area | Motivazione |
|---|---|
| `src/**` (tutti i file sorgente) | Nessuna modifica al codice applicativo — perimetro stretto P25 |
| `package.json` | Invariato |
| `vite.config.ts` | Invariato |
| `tsconfig.json` | Invariato |
| `vitest.config.ts` | Invariato |
| `eslint.config.js` | Invariato |
| `.github/instructions/` | Protetto da `framework-guard.instructions.md` |
| `.github/agents/` | Protetto da `framework-guard.instructions.md` |
| `.github/copilot-instructions.md` | Protetto da `framework-guard.instructions.md` |
| `.github/AGENTS.md` | Protetto da `framework-guard.instructions.md` |
| `.github/runtime/` | Protetto da `framework-guard.instructions.md` |
| `.github/skills/` | Protetto da `framework-guard.instructions.md` |
| `.github/prompts/` | Protetto da `framework-guard.instructions.md` |
| `.github/changelogs/` | Protetto da `framework-guard.instructions.md` |

---

## Schema riepilogativo delle operazioni

```
P25 — Schema impostazioni_utente e campo cifrato
│
├── Prerequisito: creare docs/5 - sql/ (cartella non presente nel repository)
│
├── Passo A — Schema SQL impostazioni_utente
│   │
│   ├── Leggere schema reale Supabase (impostazioni_utente)
│   │   └── Confronto colonna per colonna con schema atteso P25 §3.4
│   │
│   ├── Produrre docs/5 - sql/P25-schema-impostazioni-utente.sql
│   │   ├── CREATE TABLE IF NOT EXISTS impostazioni_utente (o ALTER TABLE se esiste)
│   │   │   ├── id UUID PK gen_random_uuid()
│   │   │   ├── user_id UUID UNIQUE NOT NULL FK → auth.users(id)
│   │   │   ├── nome_visualizzato TEXT NULL
│   │   │   ├── valuta_default TEXT NOT NULL DEFAULT 'EUR'
│   │   │   ├── pin_privato_hash TEXT NULL
│   │   │   ├── preferences JSONB NOT NULL DEFAULT '{...28 chiavi}'::jsonb
│   │   │   ├── created_at TIMESTAMPTZ NOT NULL DEFAULT now()
│   │   │   └── updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
│   │   ├── ALTER TABLE ... ENABLE ROW LEVEL SECURITY
│   │   ├── Policy RLS: auth.uid() = user_id (SELECT, INSERT, UPDATE, DELETE)
│   │   ├── CREATE UNIQUE INDEX su user_id
│   │   └── Trigger set_updated_at (moddatetime o funzione manuale — vedi AI2)
│   │
│   └── Gate intermedio Passo A
│       ├── Script eseguito senza errori su Supabase
│       ├── SELECT * FROM impostazioni_utente LIMIT 1 → assenza errori
│       ├── Policy RLS attiva con auth.uid() = user_id
│       └── Default JSONB contiene le 28 chiavi attese
│
└── Passo B — Script SQL trigger cifrato  [PREREQUISITO: Passo A completato]
    │
    ├── Produrre docs/5 - sql/P25-trigger-cifrato.sql
    │   ├── CREATE OR REPLACE FUNCTION sync_cifrato() SECURITY DEFINER
    │   ├── CREATE TRIGGER trg_sync_cifrato BEFORE INSERT OR UPDATE ON transazioni
    │   ├── CREATE OR REPLACE FUNCTION propagate_cifrato_on_conto_update() SECURITY DEFINER
    │   └── CREATE TRIGGER trg_propagate_cifrato AFTER UPDATE OF is_privato ON conti
    │
    └── Gate finale Passo B
        ├── Script eseguito senza errori su Supabase
        ├── Funzione sync_cifrato visibile nel catalogo Functions
        ├── Trigger trg_sync_cifrato visibile su transazioni
        ├── Trigger trg_propagate_cifrato visibile su conti
        ├── Test INSERT: transazione su conto is_privato=TRUE → cifrato=TRUE
        └── Test propagazione: UPDATE conti.is_privato FALSE→TRUE → cifrato=TRUE su transazioni
```

---

## Piano operativo dettagliato

### Passo A — Schema SQL `impostazioni_utente`

**Prerequisito:** creare la cartella `docs/5 - sql/` nel repository (non esiste — va creata prima di salvare i file SQL).

#### A1 — Lettura schema reale Supabase

Aprire il pannello Supabase → **Table Editor** → tabella `impostazioni_utente` oppure eseguire nell'editor SQL:

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'impostazioni_utente'
ORDER BY ordinal_position;
```

Confrontare il risultato colonna per colonna con lo schema atteso (§3.4 P25):

| Colonna attesa | Tipo atteso | Default atteso | Nullable atteso |
|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | NO |
| `user_id` | `uuid` | — | NO |
| `nome_visualizzato` | `text` | `NULL` | SÌ |
| `valuta_default` | `text` | `'EUR'` | NO |
| `pin_privato_hash` | `text` | `NULL` | SÌ |
| `preferences` | `jsonb` | `'{}'::jsonb` | NO |
| `created_at` | `timestamptz` | `now()` | NO |
| `updated_at` | `timestamptz` | `now()` | NO |

**Nota AI1:** se la tabella ha colonne extra (es. `visible_categories TEXT[]` — presente in una versione precedente del design poi superata dall'errata di P25 §3.4) o mancano colonne, documentare le discrepanze e produrre `ALTER TABLE` mirati invece di `CREATE TABLE IF NOT EXISTS`. Non eliminare colonne esistenti senza conferma esplicita.

#### A2 — Produzione script `P25-schema-impostazioni-utente.sql`

Il file da creare in `docs/5 - sql/P25-schema-impostazioni-utente.sql`:

```sql
-- P25 — Schema tabella impostazioni_utente
-- Branch: refactoring-architettura
-- Data: 2026-04-30
-- Riferimento: docs/1 - projects/P25-schema-impostazioni-utente-cifrato.md §3.4
--
-- ISTRUZIONI DI ESECUZIONE:
-- 1. Verificare PRIMA lo schema reale (vedi coding plan P25, §A1).
-- 2. Se la tabella NON esiste: eseguire il blocco CREATE TABLE sotto.
-- 3. Se la tabella ESISTE GIÀ: eseguire solo i blocchi ALTER TABLE necessari
--    per le colonne mancanti o con tipo/default diverso.
-- 4. RLS e trigger vanno sempre eseguiti (sono idempotenti).

-- ============================================================
-- BLOCCO 1 — Creazione tabella (eseguire se la tabella non esiste)
-- ============================================================

CREATE TABLE IF NOT EXISTS impostazioni_utente (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_visualizzato TEXT     NULL,
  valuta_default TEXT        NOT NULL DEFAULT 'EUR',
  pin_privato_hash TEXT      NULL,
  preferences    JSONB       NOT NULL DEFAULT '{
    "display_show_balances": true,
    "display_show_account_icons": true,
    "display_compact_mode": false,
    "display_show_categories": true,
    "display_animations_enabled": true,
    "display_font_size": 100,
    "display_currency_display": "symbol",
    "display_number_format": "standard",
    "display_high_contrast": false,
    "display_show_percentages": true,
    "display_show_transaction_icons": true,
    "display_reduce_motion": false,
    "sr_verbosity": "normale",
    "sr_announce_navigation": true,
    "sr_announce_filters": true,
    "sr_announce_form_changes": false,
    "sr_announce_shortcuts": true,
    "sr_announce_balance_changes": true,
    "sr_announce_budget_alerts": true,
    "sr_announce_progress": true,
    "sr_announce_focus_changes": false,
    "sr_announce_list_position": true,
    "sr_announce_delay": 100,
    "sr_reduced_announcements": false,
    "audio_enabled": true,
    "audio_volume": 0.3,
    "talkback_adaptations": {
      "enhancedTouchTargets": true,
      "simplifiedNavigation": true,
      "extendedTimeouts": true,
      "verboseDescriptions": true,
      "highContrastMode": false,
      "reducedMotion": true,
      "autoFocusManagement": true,
      "spatialAudio": true
    },
    "talkback_manual_override": null
  }'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BLOCCO 2 — ALTER TABLE (eseguire se la tabella esiste già)
-- Adattare in base al confronto colonna per colonna (§A1).
-- Esempi:
-- ALTER TABLE impostazioni_utente ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
-- ALTER TABLE impostazioni_utente ADD COLUMN IF NOT EXISTS pin_privato_hash TEXT NULL;
-- ============================================================

-- ============================================================
-- BLOCCO 3 — Row Level Security
-- ============================================================

ALTER TABLE impostazioni_utente ENABLE ROW LEVEL SECURITY;

-- Rimuove policy esistenti (idempotente)
DROP POLICY IF EXISTS "utente_select_proprie_impostazioni" ON impostazioni_utente;
DROP POLICY IF EXISTS "utente_insert_proprie_impostazioni" ON impostazioni_utente;
DROP POLICY IF EXISTS "utente_update_proprie_impostazioni" ON impostazioni_utente;
DROP POLICY IF EXISTS "utente_delete_proprie_impostazioni" ON impostazioni_utente;

CREATE POLICY "utente_select_proprie_impostazioni"
  ON impostazioni_utente
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "utente_insert_proprie_impostazioni"
  ON impostazioni_utente
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "utente_update_proprie_impostazioni"
  ON impostazioni_utente
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "utente_delete_proprie_impostazioni"
  ON impostazioni_utente
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- BLOCCO 4 — Indice UNIQUE su user_id
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_impostazioni_utente_user_id
  ON impostazioni_utente (user_id);

-- ============================================================
-- BLOCCO 5 — Trigger updated_at
-- Soluzione A (prioritaria): estensione moddatetime — verificare
-- disponibilità con: SELECT * FROM pg_extension WHERE extname = 'moddatetime';
-- Se disponibile, decommentare il blocco A e commentare il blocco B.
-- ============================================================

-- BLOCCO 5A — Trigger via estensione moddatetime (preferito se disponibile)
-- CREATE EXTENSION IF NOT EXISTS moddatetime;
-- DROP TRIGGER IF EXISTS handle_updated_at ON impostazioni_utente;
-- CREATE TRIGGER handle_updated_at
--   BEFORE UPDATE ON impostazioni_utente
--   FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- BLOCCO 5B — Funzione manuale (fallback se moddatetime non disponibile)
CREATE OR REPLACE FUNCTION set_updated_at_impostazioni_utente()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_updated_at ON impostazioni_utente;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON impostazioni_utente
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_impostazioni_utente();

-- ============================================================
-- VERIFICA FINALE — eseguire dopo lo script per confermare
-- ============================================================
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'impostazioni_utente'
-- ORDER BY ordinal_position;
--
-- SELECT * FROM impostazioni_utente LIMIT 1;
```

**Verifica gate Passo A:**
- Script eseguito su Supabase senza errori di sintassi
- `SELECT * FROM impostazioni_utente LIMIT 1` → nessun errore (tabella accessibile)
- Policy RLS attiva: `SELECT policyname FROM pg_policies WHERE tablename = 'impostazioni_utente'` → 4 policy presenti
- `SELECT pg_get_indexdef(i.indexrelid) FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid WHERE c.relname = 'impostazioni_utente' AND i.indisunique` → indice UNIQUE su `user_id` presente
- Default JSONB verificato: il valore di default contiene tutte le 28 chiavi

---

### Passo B — Script SQL trigger `cifrato` (dipende da Passo A completato)

**Prerequisito:** Passo A completato e gate intermedio verificato.

**Nota operativa critica:** il client **non deve mai includere `cifrato`** nei payload di scrittura (INSERT o UPDATE su `transazioni`). Il trigger sovrascrive qualunque valore passato dal client. Questo vincolo sarà implementato a livello applicativo nel Blocco 4 (P28) rimuovendo `cifrato` da tutti i payload di scrittura in `TransactionDialog.tsx` e nei repository.

#### B1 — Produzione script `P25-trigger-cifrato.sql`

Il file da creare in `docs/5 - sql/P25-trigger-cifrato.sql`:

```sql
-- P25 — Trigger cifrato su transazioni e conti
-- Branch: refactoring-architettura
-- Data: 2026-04-30
-- Riferimento: docs/1 - projects/P25-schema-impostazioni-utente-cifrato.md §4.4
--
-- ISTRUZIONI DI ESECUZIONE:
-- Eseguire dopo che lo schema di impostazioni_utente (Passo A) è stato applicato.
-- Le tabelle 'transazioni' e 'conti' devono esistere su Supabase.
-- Verificare che 'transazioni.conto_id' sia FK → 'conti.id'.
-- Verificare che 'conti.is_privato' sia di tipo BOOLEAN.
-- Verificare che 'transazioni.cifrato' sia di tipo BOOLEAN.
--
-- NOTA SICUREZZA: SECURITY DEFINER garantisce che il trigger venga eseguito
-- con i permessi del proprietario della funzione (service role), necessario
-- perché RLS su 'conti' potrebbe altrimenti bloccare la lettura nel
-- contesto del trigger chiamato dall'utente autenticato.

-- ============================================================
-- FUNZIONE 1 — sync_cifrato
-- Sincronizza transazioni.cifrato con conti.is_privato al momento
-- di INSERT o UPDATE sulla tabella transazioni.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_cifrato()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SELECT is_privato
  INTO NEW.cifrato
  FROM conti
  WHERE id = NEW.conto_id;

  -- Se il conto non esiste (edge case: FK violata o conto eliminato), default a FALSE
  IF NOT FOUND THEN
    NEW.cifrato := FALSE;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGER 1 — trg_sync_cifrato
-- Si attiva BEFORE INSERT OR UPDATE su transazioni.
-- Il client non deve includere 'cifrato' nel payload: viene sempre
-- sovrascritto da questa funzione.
-- ============================================================

DROP TRIGGER IF EXISTS trg_sync_cifrato ON transazioni;

CREATE TRIGGER trg_sync_cifrato
BEFORE INSERT OR UPDATE ON transazioni
FOR EACH ROW EXECUTE FUNCTION sync_cifrato();

-- ============================================================
-- FUNZIONE 2 — propagate_cifrato_on_conto_update
-- Propaga il cambiamento di conti.is_privato a tutte le transazioni
-- collegate. Usa IS DISTINCT FROM per evitare UPDATE superflui.
-- ============================================================

CREATE OR REPLACE FUNCTION propagate_cifrato_on_conto_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_privato IS DISTINCT FROM OLD.is_privato THEN
    UPDATE transazioni
    SET cifrato = NEW.is_privato
    WHERE conto_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGER 2 — trg_propagate_cifrato
-- Si attiva AFTER UPDATE OF is_privato su conti.
-- Aggiorna cifrato su tutte le transazioni collegate al conto
-- quando is_privato cambia (es. utente rende privato un conto esistente).
-- ============================================================

DROP TRIGGER IF EXISTS trg_propagate_cifrato ON conti;

CREATE TRIGGER trg_propagate_cifrato
AFTER UPDATE OF is_privato ON conti
FOR EACH ROW EXECUTE FUNCTION propagate_cifrato_on_conto_update();

-- ============================================================
-- VERIFICA POST-ESECUZIONE
-- ============================================================

-- Verifica trigger su transazioni:
-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 'transazioni' AND trigger_name = 'trg_sync_cifrato';

-- Verifica trigger su conti:
-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 'conti' AND trigger_name = 'trg_propagate_cifrato';

-- Test funzionale (sostituire <uuid_conto_privato> e <uuid_utente>):
-- INSERT INTO transazioni (conto_id, user_id, importo, descrizione, data, tipo, categoria_id, cifrato)
-- VALUES ('<uuid_conto_privato>', '<uuid_utente>', 10.00, 'Test P25', now(), 'uscita', NULL, FALSE);
-- SELECT cifrato FROM transazioni WHERE descrizione = 'Test P25';
-- → Atteso: cifrato = TRUE (il trigger ha sovrascritto FALSE con TRUE)

-- Test propagazione (sostituire <uuid_conto>):
-- UPDATE conti SET is_privato = TRUE WHERE id = '<uuid_conto>';
-- SELECT cifrato FROM transazioni WHERE conto_id = '<uuid_conto>';
-- → Atteso: tutte le transazioni del conto hanno cifrato = TRUE
```

**Verifica gate Passo B:**
- Script eseguito su Supabase senza errori di sintassi
- `sync_cifrato` visibile nel catalogo Supabase → Functions
- `trg_sync_cifrato` verificato su `transazioni` → presente
- `trg_propagate_cifrato` verificato su `conti` → presente
- Test INSERT con `conto_id` di un conto `is_privato = TRUE` → `cifrato` risulta `TRUE` nel SELECT successivo
- Test propagazione: UPDATE `conti.is_privato` da FALSE a TRUE → tutte le transazioni collegate hanno `cifrato = TRUE`

---

## Ambiguità rilevate

Le seguenti ambiguità devono essere risolte **prima** di eseguire gli script SQL sul database. Il loro esito va documentato nel file `P25-todo.md` nella colonna "Effettivo" della checklist finale.

---

### AI1 — Schema reale Supabase vs schema atteso P25 §3.4

**Natura:** la tabella `impostazioni_utente` potrebbe già esistere su Supabase con uno schema diverso da quello definito in P25 §3.4 (es. presenza di colonna `visible_categories TEXT[]` — presente in una versione precedente del design poi superata dall'errata di P25 §3.4, o colonne mancanti, o default JSONB vuoto anziché con le 28 chiavi).

**Azione obbligatoria:** eseguire il SELECT su `information_schema.columns` (vedi §A1) e confrontare il risultato prima di qualsiasi DDL. Documentare le discrepanze trovate nella sezione "Esito finale" del todo P25.

**Impatto se ignorata:** eseguire `CREATE TABLE IF NOT EXISTS` quando la tabella esiste già non aggiunge le colonne mancanti — le discrepanze restano silenziosamente non corrette.

**Mitigazione:** il file `P25-schema-impostazioni-utente.sql` include istruzioni condizionali e blocchi ALTER TABLE commentati pronti per essere attivati in base al confronto colonna per colonna.

---

### AI2 — Presenza dell'estensione `moddatetime` su Supabase

**Natura:** la colonna `updated_at` richiede un trigger per l'aggiornamento automatico. Il metodo preferito su Supabase è l'estensione `moddatetime`, ma non è garantita la sua disponibilità su tutti i piani Supabase.

**Azione obbligatoria:** verificare eseguendo nell'editor SQL di Supabase:
```sql
SELECT * FROM pg_extension WHERE extname = 'moddatetime';
```

**Esiti possibili:**
- Se `moddatetime` è presente → usare il Blocco 5A dello script (decommentare, commentare il 5B).
- Se `moddatetime` non è presente → usare il Blocco 5B (funzione manuale `set_updated_at_impostazioni_utente`). Il Blocco 5B è quello attivo di default nello script.

**Impatto se ignorata:** basso a runtime (il fallback manuale funziona), ma la discrepanza va documentata nel todo P25 per coerenza con gli altri trigger `updated_at` eventualmente presenti nel database.

---

## Rischi

| Codice | Scenario | Probabilità | Impatto | Mitigazione |
|---|---|---|---|---|
| R1 | Schema reale `impostazioni_utente` diverge da quello atteso in P25 §3.4 (colonne extra, colonne mancanti, tipi diversi) | Media — la tabella potrebbe essere stata creata manualmente o da migrazioni precedenti | Alto (il Blocco 2 P26 legge lo schema per definire i repository types) | Eseguire sempre AI1 prima di qualsiasi DDL. Lo script include blocchi ALTER TABLE commentati. Non procedere a Passo B finché Passo A non è verificato. |
| R2 | Trigger `trg_sync_cifrato` non attivato per INSERT in Blocco 4 (P28) — client invia `cifrato` come campo calcolato dal codice TS invece di lasciarlo al trigger | Bassa se il piano viene seguito; alta se P28 viene sviluppato senza consultare P25 | Alto — `cifrato` può risultare errato su nuove transazioni | La dipendenza è esplicita nelle note preliminari e nel piano P28. Il campo `Transaction.cifrato` in `src/lib/types.ts` va marcato come `readonly` (Blocco 4). |
| R3 | Trigger `trg_propagate_cifrato` genera UPDATE di massa su tabella `transazioni` quando un utente rende privato un conto con molte transazioni storiche | Bassa in fase di sviluppo (pochi dati); alta in produzione se il conto ha migliaia di transazioni | Medio — rallentamento temporaneo della UI durante l'UPDATE; nessuna perdita di dati | Il trigger usa `IS DISTINCT FROM` per evitare UPDATE superflui. In produzione valutare se aggiungere paginazione o eseguire l'UPDATE in background via Edge Function (fuori perimetro P25). |
| R4 | Errore di sintassi nel blocco JSONB default a causa di caratteri speciali non escapati | Bassa — il blocco JSONB è testato nel design doc P25 §3.4 | Medio (blocca la CREATE TABLE) | Copiare il blocco JSONB esattamente dal design doc. Testare lo script prima in staging su Supabase. |
| R5 | Policy RLS già esistenti con nomi diversi generano conflitto con le DROP POLICY | Bassa — solo se le policy erano state create manualmente con nomi diversi | Basso (errore esplicito nell'editor SQL) | Le policy DROP sono condizionate con `IF EXISTS`. In caso di conflitto, listare le policy esistenti con `SELECT policyname FROM pg_policies WHERE tablename = 'impostazioni_utente'` e droppare manualmente quelle con nomi legacy. |

---

## Criteri di uscita — Definition of Done

- [ ] La cartella `docs/5 - sql/` esiste nel repository
- [ ] Il file `docs/5 - sql/P25-schema-impostazioni-utente.sql` esiste ed è stato eseguito su Supabase senza errori
- [ ] La tabella `impostazioni_utente` ha esattamente le 8 colonne attese (id, user_id, nome_visualizzato, valuta_default, pin_privato_hash, preferences, created_at, updated_at)
- [ ] La policy RLS è attiva su `impostazioni_utente` con `auth.uid() = user_id` per SELECT, INSERT, UPDATE, DELETE
- [ ] L'indice UNIQUE su `user_id` è presente
- [ ] Il trigger `handle_updated_at` è presente sulla tabella `impostazioni_utente`
- [ ] Il default JSONB di `preferences` contiene tutte le 28 chiavi (12 `display_*`, 12 `sr_*`, 2 `audio_*`, 2 `talkback_*`)
- [ ] Il file `docs/5 - sql/P25-trigger-cifrato.sql` esiste ed è stato eseguito su Supabase senza errori
- [ ] La funzione `sync_cifrato` è visibile nel catalogo Supabase Functions
- [ ] Il trigger `trg_sync_cifrato` è presente e attivo su `transazioni`
- [ ] Il trigger `trg_propagate_cifrato` è presente e attivo su `conti`
- [ ] Test funzionale: INSERT su `transazioni` con `conto_id` di un conto `is_privato = TRUE` → `cifrato = TRUE` nel SELECT successivo
- [ ] Test propagazione: UPDATE `conti.is_privato` FALSE→TRUE → tutte le transazioni collegate hanno `cifrato = TRUE`
- [ ] `npm run build` → exit 0 — invariato (nessun file sorgente modificato)
- [ ] `npm run lint` → 0 warning — invariato (nessun file sorgente modificato)
- [ ] `npm run test:run` → 5 passed — invariato (nessun file sorgente modificato)
- [ ] Nessun file in `src/` modificato
- [ ] Nessun file in `.github/` modificato
- [ ] Ambiguità AI1 e AI2 documentate e risolte con esito nel todo P25
