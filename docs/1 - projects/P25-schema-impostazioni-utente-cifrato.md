# P25 — Schema `impostazioni_utente` e campo `cifrato`

## 1. Intestazione

| Campo | Valore |
|---|---|
| Pacchetto | P25 — Schema `impostazioni_utente` e campo `cifrato` |
| Tipo intervento | Documento di design (sola lettura) |
| Branch | `refactoring-architettura` |
| Data | 28 aprile 2026 |
| Autore | Agent-Design |
| File modificati | Nessuno (solo creazione di questo documento di design) |
| Documenti di riferimento | [P24 — Architettura generale migrazione Spark→Supabase](./P24-architettura-migrazione-supabase.md), [src/lib/types.ts](../../src/lib/types.ts) |
| Stato | Bozza — in attesa di validazione |

Questo documento è **vincolante** per tutti i design operativi successivi
(P26 in poi). Le decisioni qui contenute sono già state validate e non
vengono rimesse in discussione: i design successivi possono solo
dettagliarne l'implementazione, non cambiarne la sostanza.

---

## 2. Contesto

P24 definisce il piano di migrazione in 10 blocchi (vedi [P24 §6](./P24-architettura-migrazione-supabase.md#6-piano-di-migrazione-in-10-blocchi)).
Il **Blocco 1** è il primo della sequenza ed è il gatekeeper formale di tutti
gli altri: finché le sue decisioni non sono chiuse, nessun blocco che tocca
codice può partire (tutti i blocchi 2–10 dipendono almeno indirettamente
dallo schema).

I due punti rimasti aperti alla fine di P24 sono:

1. **Schema di `impostazioni_utente`** (P24 §4.7): le 24 chiavi
   `display-*`, `sr-*`, `audio-*`, `talkback-*` + `visible-categories`
   devono atterrare su Supabase. La scelta tra 24 colonne tipizzate e una
   singola colonna `preferences JSONB` non era stata fatta in P24 perché
   richiede un'analisi dedicata. Questa scelta determina direttamente
   la struttura che il Blocco 5 (preferenze UI) deve implementare e
   impatta anche il Blocco 2 (strato di accesso) nel definire i tipi
   dei repository.

2. **Implementazione del campo `cifrato`** (P24 §4.4): il campo deve
   diventare derivato (non più scritto dal client) tramite **trigger** o
   **colonna generata** PostgreSQL. La scelta non era stata fatta in P24
   perché dipende dalle garanzie semantiche di ciascuna opzione, in
   particolare sul comportamento quando `conti.is_privato` cambia dopo
   la creazione della transazione.

Entrambe le decisioni sono **puramente di schema/database**: non toccano
ancora nessun file `src/`.

---

## 3. Decisione A — Schema della tabella `impostazioni_utente`

### 3.1 Le due opzioni

#### Opzione 1 — 24 colonne tipizzate

Ogni preferenza ha una colonna dedicata con tipo SQL preciso.

**Area display (12 colonne):**

| Chiave Spark | Nome colonna | Tipo SQL | Default |
|---|---|---|---|
| `display-show-balances` | `display_show_balances` | `BOOLEAN` | `TRUE` |
| `display-show-account-icons` | `display_show_account_icons` | `BOOLEAN` | `TRUE` |
| `display-compact-mode` | `display_compact_mode` | `BOOLEAN` | `FALSE` |
| `display-show-categories` | `display_show_categories` | `BOOLEAN` | `TRUE` |
| `display-animations-enabled` | `display_animations_enabled` | `BOOLEAN` | `TRUE` |
| `display-font-size` | `display_font_size` | `SMALLINT` | `100` |
| `display-currency-display` | `display_currency_display` | `TEXT` | `'symbol'` |
| `display-number-format` | `display_number_format` | `TEXT` | `'standard'` |
| `display-high-contrast` | `display_high_contrast` | `BOOLEAN` | `FALSE` |
| `display-show-percentages` | `display_show_percentages` | `BOOLEAN` | `TRUE` |
| `display-show-transaction-icons` | `display_show_transaction_icons` | `BOOLEAN` | `TRUE` |
| `display-reduce-motion` | `display_reduce_motion` | `BOOLEAN` | `FALSE` |

**Area screen reader (12 colonne):**

| Chiave Spark | Nome colonna | Tipo SQL | Default |
|---|---|---|---|
| `sr-verbosity` | `sr_verbosity` | `TEXT` | `'normale'` |
| `sr-announce-navigation` | `sr_announce_navigation` | `BOOLEAN` | `TRUE` |
| `sr-announce-filters` | `sr_announce_filters` | `BOOLEAN` | `TRUE` |
| `sr-announce-form-changes` | `sr_announce_form_changes` | `BOOLEAN` | `FALSE` |
| `sr-announce-shortcuts` | `sr_announce_shortcuts` | `BOOLEAN` | `TRUE` |
| `sr-announce-balance-changes` | `sr_announce_balance_changes` | `BOOLEAN` | `TRUE` |
| `sr-announce-budget-alerts` | `sr_announce_budget_alerts` | `BOOLEAN` | `TRUE` |
| `sr-announce-progress` | `sr_announce_progress` | `BOOLEAN` | `TRUE` |
| `sr-announce-focus-changes` | `sr_announce_focus_changes` | `BOOLEAN` | `FALSE` |
| `sr-announce-list-position` | `sr_announce_list_position` | `BOOLEAN` | `TRUE` |
| `sr-announce-delay` | `sr_announce_delay` | `SMALLINT` | `100` |
| `sr-reduced-announcements` | `sr_reduced_announcements` | `BOOLEAN` | `FALSE` |

**Area audio (2 colonne):**

| Chiave Spark | Nome colonna | Tipo SQL | Default |
|---|---|---|---|
| `audio-enabled` | `audio_enabled` | `BOOLEAN` | `TRUE` |
| `audio-volume` | `audio_volume` | `NUMERIC(4,3)` | `0.300` |

**Area TalkBack (2 colonne):**

| Chiave Spark | Nome colonna | Tipo SQL | Default |
|---|---|---|---|
| `talkback-adaptations` | `talkback_adaptations` | `JSONB` | `'{...}'` (oggetto default) |
| `talkback-manual-override` | `talkback_manual_override` | `BOOLEAN` | `NULL` |

> Nota: `talkback_adaptations` rimane JSONB anche nell'Opzione 1 perché è
> un oggetto strutturato (`TalkBackAdaptations`) con 8 campi booleani — non
> ha senso normalizzarlo ulteriormente in colonne separate.

**Area generali e sicurezza (4 colonne):**

| Chiave/campo | Nome colonna | Tipo SQL | Default |
|---|---|---|---|
| `visible-categories` | `visible_categories` | `TEXT[]` | `ARRAY[]::TEXT[]` |
| `private-pin-hash` | `pin_privato_hash` | `TEXT` | `NULL` |
| — | `valuta_default` | `TEXT` | `'EUR'` |
| — | `nome_visualizzato` | `TEXT` | `NULL` |

**Totale Opzione 1:** 24 + 4 = **28 colonne tipizzate** + 1 JSONB per
`talkback_adaptations` = **29 colonne**.

---

#### Opzione 2 — Colonna `preferences` JSONB per le preferenze non critiche

Le 24 preferenze UI (display, screen reader, audio, talkback) + alcune
generali confluiscono in una singola colonna `preferences JSONB`. Le colonne
tipizzate rimangono solo per i campi che richiedono garanzie di integrità o
sono acceduti direttamente da query.

**Colonne tipizzate (4):**

| Nome colonna | Tipo SQL | Default | Motivazione |
|---|---|---|---|
| `pin_privato_hash` | `TEXT` | `NULL` | Sicurezza — non deve finire nel JSONB blob |
| `valuta_default` | `TEXT` | `'EUR'` | Usata in query di calcolo e report |
| `nome_visualizzato` | `TEXT` | `NULL` | Usata nell'header utente |
| `visible_categories` | `TEXT[]` | `ARRAY[]::TEXT[]` | Array — più naturale come colonna nativa |

**Colonna JSONB (1):**

`preferences JSONB NOT NULL DEFAULT '{}'`

Contenuto tipico:
```json
{
  "display_show_balances": true,
  "display_compact_mode": false,
  "display_font_size": 100,
  "display_currency_display": "symbol",
  "display_number_format": "standard",
  "display_high_contrast": false,
  "display_show_percentages": true,
  "display_show_transaction_icons": true,
  "display_reduce_motion": false,
  "display_animations_enabled": true,
  "display_show_categories": true,
  "display_show_account_icons": true,
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
  "talkback_adaptations": { "enhancedTouchTargets": true, "...": "..." },
  "talkback_manual_override": null
}
```

**Totale Opzione 2:** 4 colonne tipizzate + 1 JSONB = **5 colonne**.

---

### 3.2 Analisi comparativa

| Dimensione | Opzione 1 (24 colonne) | Opzione 2 (JSONB) |
|---|---|---|
| **Semplicità di schema** | Bassa — 29 colonne, DDL lungo | Alta — 5 colonne |
| **Semplicità di lettura lato client** | Media — un SELECT restituisce tutto il record; la mappatura snake→camel è meccanica | Alta — un SELECT restituisce `preferences` come oggetto JS già deserializzato |
| **Semplicità di scrittura (upsert campo singolo)** | Alta — `UPDATE SET display_font_size = 110 WHERE user_id = $1` è chirurgico | Media — `UPDATE SET preferences = preferences || '{"display_font_size": 110}'::jsonb WHERE user_id = $1` funziona ma è meno leggibile |
| **Validazione tipi a livello database** | Alta — il DB rifiuta tipi errati (es. stringa su BOOLEAN) | Bassa — il JSONB accetta qualunque valore senza validazione nativa |
| **Flessibilità per nuove preferenze** | Bassa — ogni nuova preferenza richiede ALTER TABLE + migrazione | Alta — si aggiunge una chiave al JSONB senza DDL |
| **Rischio di regressione durante migrazione** | Medio — 29 campi da mappare 1:1, ogni errore di nome è un bug silenzioso | Basso — un solo campo da scrivere; errori di chiave cadono nel JSONB senza rompere lo schema |

### 3.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 2 — colonna `preferences` JSONB.**

**Motivazione:**

L'app gestisce già oggi **24 preferenze** che potrebbero crescere con
funzionalità future (es. impostazioni temi, shortcut personalizzati,
preferenze di notifica). Con l'Opzione 1, ogni nuova preferenza richiede
un `ALTER TABLE` e una migrazione coordinata su tutti gli ambienti, con
rischio di errori silenziosi per disallineamento di nomi.

Il principale svantaggio dell'Opzione 2 — assenza di validazione tipi nel
DB — è **mitigabile lato client**: il hook `useUserSettings()` (Blocco 5)
è l'unico writer e implementa la validazione prima di fare upsert. Il DB
non deve essere la prima linea di difesa per preferenze UI non critiche.

L'Opzione 2 rende anche il **Blocco 5 più semplice da implementare**:
il repository per `impostazioni_utente` legge un singolo oggetto e lo
passa direttamente al hook; le scritture fanno un merge JSONB con un solo
campo. Questo riduce il rischio di regressione nella fase più affollata
di file della migrazione (DisplaySettings, ScreenReaderSettings, AudioSettings,
use-display-preferences, use-talkback, sound-system).

I **4 campi critici** (`pin_privato_hash`, `valuta_default`,
`nome_visualizzato`, `visible_categories`) restano colonne tipizzate dove la
validazione e le query dirette hanno senso.

---

### 3.4 Schema risultante della tabella `impostazioni_utente`

> **Schema definitivo** — vincolante per tutti i blocchi successivi.

| Nome colonna | Tipo SQL | Default | Nullable | Note |
|---|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | NO | PK |
| `user_id` | `UUID` | — | NO | FK → `auth.users(id)`, UNIQUE (un record per utente) |
| `nome_visualizzato` | `TEXT` | `NULL` | SÌ | Nome mostrato nell'header. Impostato in onboarding. |
| `valuta_default` | `TEXT` | `'EUR'` | NO | Valuta per visualizzazione importi. |
| `visible_categories` | `TEXT[]` | `ARRAY[]::TEXT[]` | NO | ID delle categorie conto visibili nella sidebar. |

> **⚠ Errata — decisione superata da P29:** La colonna separata `visible_categories` (TEXT[]) descritta in questa sezione **non viene creata** nel database. Per decisione architetturale presa in P29 (§ 4 — Struttura `preferences` JSONB), le categorie visibili sono salvate come `preferences.visible_category_ids` all'interno del campo `preferences jsonb` della stessa tabella. Questa scelta è stata adottata per coerenza con tutte le altre preferenze utente e per minimizzare le ALTER TABLE future. P29 è il documento autoritativo su questo punto.

| `pin_privato_hash` | `TEXT` | `NULL` | SÌ | Hash bcrypt/argon2 del PIN privato. NULL = nessun PIN privato impostato. |
| `preferences` | `JSONB` | `'{}'::jsonb` | NO | Tutte le 24 preferenze UI/A11y/Audio/TalkBack. Chiavi in snake_case (vedi Opzione 2 §3.1). |
| `created_at` | `TIMESTAMPTZ` | `now()` | NO | Creazione automatica. |
| `updated_at` | `TIMESTAMPTZ` | `now()` | NO | Aggiornato da trigger `set_updated_at`. |

**Policy RLS:** `auth.uid() = user_id` (SELECT, INSERT, UPDATE, DELETE).

**Indice:** `UNIQUE (user_id)` — garantisce un solo record per utente.

**Valori di default per `preferences`** al momento dell'inserimento (onboarding):

```json
{
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
}
```

---

## 4. Decisione B — Campo `cifrato` su `transazioni`

### 4.1 Le due opzioni

P24 §4.4 stabilisce che `cifrato` non viene più scritto dal client e deve
essere popolato automaticamente dal database quando `conti.is_privato = TRUE`.
Le due opzioni tecniche sono:

#### Opzione 1 — Trigger su `INSERT` e `UPDATE`

Una funzione PL/pgSQL + trigger che:
- si attiva su `INSERT` e `UPDATE` della tabella `transazioni`;
- legge `is_privato` dalla riga corrispondente in `conti`;
- imposta `NEW.cifrato = TRUE` se `conti.is_privato = TRUE`.

Aggiungendo un secondo trigger (o espandendo il primo) su `UPDATE` di
`conti.is_privato`, è possibile propagare il cambio a tutte le transazioni
collegate: se un utente rende privato un conto esistente, tutte le sue
transazioni passano a `cifrato = TRUE`.

#### Opzione 2 — Colonna generata (`GENERATED ALWAYS AS`)

Una colonna calcolata `AS (SELECT is_privato FROM conti WHERE id = conto_id)`
che PostgreSQL mantiene aggiornata automaticamente.

**Limitazione critica**: PostgreSQL non consente subquery nelle espressioni
di colonne generate (`GENERATED ALWAYS AS`). La sintassi è riservata a
espressioni deterministiche su colonne della stessa riga, **non** a
cross-table lookups. Questo rende l'Opzione 2 **tecnicamente non
applicabile** allo scenario in esame.

### 4.2 Analisi comparativa

| Dimensione | Opzione 1 (Trigger) | Opzione 2 (Colonna generata) |
|---|---|---|
| **Semplicità di implementazione SQL** | Media — richiede funzione + trigger | Alta — una sola DDL ALTER TABLE |
| **Comportamento su UPDATE di `conti.is_privato`** | Gestibile con trigger secondario su `conti` | **Non gestibile** — colonne generate non supportano cross-table |
| **Supporto nativo in PostgreSQL / Supabase** | Pieno — trigger PL/pgSQL supportato | **Non applicabile** — subquery in GENERATED AS non consentite |
| **Manutenibilità futura** | Media — codice PL/pgSQL separato dalla logica applicativa | N/A |
| **Rischio di effetti collaterali** | Basso se la funzione è idempotente | N/A — opzione non praticabile |

### 4.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Trigger su `INSERT` e `UPDATE`.**

**Motivazione:**

L'Opzione 2 è **tecnicamente non praticabile** in PostgreSQL: le colonne
generate non supportano subquery cross-table. L'unica opzione tecnicamente
valida è il trigger.

Il trigger offre anche un vantaggio aggiuntivo rispetto a una semplice
derivazione statica: consente di **propagare il cambio di `is_privato`** a
tutte le transazioni collegate quando l'utente modifica un conto già
esistente (caso reale: l'utente rende privato un conto che prima era
pubblico). Con una colonna generata questo sarebbe impossibile.

Il rischio di effetti collaterali è minimizzato rendendo la funzione
**idempotente**: legge sempre il valore corrente di `conti.is_privato` e
lo applica, senza stato interno.

### 4.4 Specifica tecnica del trigger

> **Pseudocodice SQL definitivo** — vincolante per il Blocco 4 (migrazione
> dati di dominio) e l'eventuale script di schema SQL.

```sql
-- Funzione trigger: sincronizza cifrato con is_privato del conto
CREATE OR REPLACE FUNCTION sync_cifrato()
RETURNS TRIGGER AS $$
BEGIN
  SELECT is_privato
  INTO NEW.cifrato
  FROM conti
  WHERE id = NEW.conto_id;

  -- Se il conto non esiste (edge case), default a FALSE
  IF NOT FOUND THEN
    NEW.cifrato := FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger su INSERT e UPDATE di transazioni
CREATE TRIGGER trg_sync_cifrato
BEFORE INSERT OR UPDATE ON transazioni
FOR EACH ROW EXECUTE FUNCTION sync_cifrato();

-- Funzione trigger secondaria: aggiorna cifrato su tutte le transazioni
-- quando is_privato di un conto cambia
CREATE OR REPLACE FUNCTION propagate_cifrato_on_conto_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_privato IS DISTINCT FROM OLD.is_privato THEN
    UPDATE transazioni
    SET cifrato = NEW.is_privato
    WHERE conto_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger su UPDATE di conti
CREATE TRIGGER trg_propagate_cifrato
AFTER UPDATE OF is_privato ON conti
FOR EACH ROW EXECUTE FUNCTION propagate_cifrato_on_conto_update();
```

**Note implementative:**

- `SECURITY DEFINER` garantisce che il trigger venga eseguito con i
  permessi del proprietario della funzione (service role), non dell'utente
  chiamante — necessario perché RLS su `conti` potrebbe altrimenti bloccare
  la lettura nel contesto del trigger.
- Il trigger secondario su `conti` usa `IS DISTINCT FROM` per non attivarsi
  se `is_privato` non cambia effettivamente (evita UPDATE superflui).
- Il client non deve includere `cifrato` nel payload delle INSERT/UPDATE:
  il trigger sovrascrive qualunque valore passato.
- Il campo `Transaction.cifrato` in [src/lib/types.ts](../../src/lib/types.ts)
  può rimanere nel tipo TypeScript come campo **readonly** (per lettura), ma
  va rimosso da tutti i payload di scrittura.

---

## 5. Impatto sui blocchi successivi

| Blocco P24 | Impatto Decisione A (schema `impostazioni_utente`) | Impatto Decisione B (trigger `cifrato`) | Note |
|---|---|---|---|
| **Blocco 2** — Strato accesso dati | **Diretto**: il repository `impostazioni_utente` deve gestire il campo `preferences JSONB` e i 4 campi tipizzati separati. Il tipo TypeScript del repository va definito con la struttura JSONB. | Nessuno diretto. | Il tipo `PreferencesRecord` va definito in questo blocco per essere usato nel blocco 5. |
| **Blocco 3** — AuthContext | **Indiretto**: al login, `useUserSettings()` carica `impostazioni_utente` incluso `pin_privato_hash`. Il Blocco 3 deve conoscere lo schema per il bootstrap. | Nessuno. | |
| **Blocco 4** — AppDataContext dominio | Nessuno diretto. | **Diretto**: il trigger deve essere presente sul DB **prima** che il Blocco 4 faccia INSERT su `transazioni`. Il Blocco 4 rimuove `cifrato` dal payload di scrittura in [TransactionDialog.tsx](../../src/components/TransactionDialog.tsx#L185). |  |
| **Blocco 5** — Preferenze UI | **Diretto e critico**: l'intero blocco è costruito sullo schema definito qui. `useUserSettings()` legge `preferences` JSONB e lo mappa sui tipi TS attuali. Le scritture fanno merge parziale su `preferences`. | Nessuno. | Questo è il blocco più impattato dalla Decisione A. |
| **Blocco 6** — Cache `budget-percentages` | Nessuno — `budget-percentages` non va in `impostazioni_utente`. | Nessuno. | |
| **Blocco 7** — DataManagement | **Indiretto**: l'export JSON deve includere `preferences` come oggetto espanso, non come stringa. | **Indiretto**: l'import non deve scrivere `cifrato` — il trigger lo gestisce. | |
| **Blocco 8** — PIN privato | **Diretto**: il PIN privato usa `impostazioni_utente.pin_privato_hash` (colonna tipizzata, schema definito qui). | Nessuno. | |
| **Blocco 9** — Onboarding | **Diretto**: l'INSERT del record `impostazioni_utente` al termine dell'onboarding deve usare esattamente lo schema e i default di §3.4. | **Indiretto**: il primo conto creato nell'onboarding potrebbe essere privato — il trigger deve già essere attivo. | |
| **Blocco 10** — Decommissioning | Nessuno aggiuntivo. | Nessuno aggiuntivo. | |

---

## 6. Punti aperti residui

- **Algoritmo di hashing per `pin_privato_hash`**: P24 §4.3 dichiara che SHA-256
  è inadeguato e rimanda al design operativo del PIN privato. P25 definisce
  la colonna ma non la primitiva crittografica. Da risolvere nel Blocco 8.

- **Trigger `set_updated_at`**: la colonna `updated_at` in `impostazioni_utente`
  (§3.4) richiede un trigger dedicato per l'aggiornamento automatico. Si assume
  che Supabase lo gestisca tramite il pattern standard `moddatetime` extension;
  da verificare nello script di schema del Blocco 1.

- **Tipo TypeScript per `preferences` JSONB**: il Blocco 2 (strato accesso dati)
  deve definire il tipo `UserPreferences` che mappa esattamente le chiavi del
  JSONB ai tipi attuali di `use-display-preferences.ts`, `ScreenReaderSettings`,
  `AudioSettings`, `use-talkback.ts`. P25 definisce le chiavi e i default ma
  non il tipo TS formale.

- **Conferma schema reale Supabase**: P25 definisce lo schema **atteso**.
  Prima di eseguire la migrazione, lo schema reale della tabella
  `impostazioni_utente` già presente su Supabase deve essere confrontato
  colonna per colonna. Eventuali discrepanze vanno gestite con `ALTER TABLE`.

---

## 7. Criteri di accettazione del documento

- [ ] Tutte le sezioni (1–7) sono presenti e non vuote.
- [ ] La Decisione A ha una scelta **DEFINITIVA** dichiarata (Opzione 2 — JSONB).
- [ ] La Decisione B ha una scelta **DEFINITIVA** dichiarata (Opzione 1 — Trigger).
- [ ] Lo schema §3.4 è completo: ogni colonna ha nome, tipo, default, nullable
      e nota. Nessuna colonna è marcata "da definire".
- [ ] Il JSONB default (§3.4) include tutte le 24 chiavi Spark derivate da
      [use-display-preferences.ts](../../src/hooks/use-display-preferences.ts),
      [ScreenReaderSettings.tsx](../../src/components/ScreenReaderSettings.tsx),
      [AudioSettings.tsx](../../src/components/AudioSettings.tsx) e
      [use-talkback.ts](../../src/hooks/use-talkback.ts).
- [ ] Il pseudocodice SQL §4.4 include sia il trigger su `transazioni` sia
      il trigger di propagazione su `conti`.
- [ ] La motivazione dell'Opzione 2 (JSONB) cita esplicitamente la mitigazione
      del rischio di tipo mancante (validazione lato client in `useUserSettings`).
- [ ] La motivazione dell'Opzione 1 (Trigger) cita esplicitamente
      l'inapplicabilità delle colonne generate per cross-table lookup.
- [ ] La sezione §5 copre tutti i blocchi da 2 a 10.
- [ ] I punti aperti §6 non contraddicono nessuna decisione di P24.
- [ ] Tutti i link a file `src/` usano path relativi (`../../src/...`).
- [ ] Nessuna contraddizione con P24 rilevata.

---

*Fine documento. Nessun file sorgente è stato modificato.*

*Messaggio di commit suggerito:*
`docs(design): creare P25 schema impostazioni_utente e campo cifrato`
