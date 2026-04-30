# P25 — Todo List: Schema `impostazioni_utente` e campo `cifrato`

> Passo 25 — Blocco 1 migrazione Spark→Supabase (gatekeeper formale)  
> Piano di riferimento: `docs/2 - coding plans/P25-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P25-schema-impostazioni-utente-cifrato.md`  
> Branch: `refactoring-architettura`  
> Data inizio: —  
> Data completamento: —

---

## Esito finale

- [ ] Script SQL Passo A (`P25-schema-impostazioni-utente.sql`) eseguito su Supabase senza errori
- [ ] Script SQL Passo B (`P25-trigger-cifrato.sql`) eseguito su Supabase senza errori
- [ ] Trigger `trg_sync_cifrato` e `trg_propagate_cifrato` verificati e funzionanti
- [ ] `npm run build` exit 0 — invariato (nessun file sorgente modificato)
- [ ] `npm run test:run` → 5 passed — invariato
- [ ] Nessun file in `src/` modificato
- [ ] Nessun file in `.github/` modificato

---

## Prima di iniziare

- [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P25-coding-plan.md`
- [ ] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)
- [ ] Verificare che `npm run build` sia exit 0 (baseline pre-P25)
- [ ] Verificare che `npm run lint` sia 0 warning (baseline P20 completato)
- [ ] Verificare di avere accesso al pannello Supabase con permessi di eseguire SQL nell'editor
- [ ] Aprire l'editor SQL di Supabase e leggere lo schema reale della tabella `impostazioni_utente`:
  ```sql
  SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'impostazioni_utente'
  ORDER BY ordinal_position;
  ```
- [ ] Documentare qui l'esito della lettura schema reale (colonne trovate vs attese):
  > Esito AI1 — Schema reale: _da compilare_

---

## Passo A — Schema `impostazioni_utente`

> Prerequisito: completare la sezione "Prima di iniziare" e documentare l'esito AI1.

- [ ] Aprire l'editor SQL di Supabase
- [ ] Verificare la disponibilità dell'estensione `moddatetime`:
  ```sql
  SELECT * FROM pg_extension WHERE extname = 'moddatetime';
  ```
  > Esito AI2 — moddatetime: _da compilare_ (presente / non presente)
- [ ] Confrontare colonna per colonna lo schema reale con lo schema atteso (P25 §3.4):
  - [ ] `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` — presente / mancante / diverso
  - [ ] `user_id UUID UNIQUE NOT NULL FK → auth.users(id)` — presente / mancante / diverso
  - [ ] `nome_visualizzato TEXT NULL` — presente / mancante / diverso
  - [ ] `valuta_default TEXT NOT NULL DEFAULT 'EUR'` — presente / mancante / diverso
  - [ ] `pin_privato_hash TEXT NULL` — presente / mancante / diverso
  - [ ] `preferences JSONB NOT NULL DEFAULT '{}'::jsonb` — presente / mancante / diverso
  - [ ] `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` — presente / mancante / diverso
  - [ ] `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` — presente / mancante / diverso
  - [ ] Eventuali colonne extra non attese (documentare): _da compilare_
- [ ] Adattare lo script `docs/5 - sql/P25-schema-impostazioni-utente.sql` in base al confronto (CREATE TABLE se non esiste; ALTER TABLE per colonne mancanti; attivare Blocco 5A o 5B per `updated_at` secondo esito AI2)
- [ ] Eseguire lo script `docs/5 - sql/P25-schema-impostazioni-utente.sql` nell'editor SQL di Supabase
- [ ] Verificare assenza di errori nell'output dell'editor SQL
- [ ] Verificare che la policy RLS sia attiva con `auth.uid() = user_id`:
  ```sql
  SELECT policyname, cmd FROM pg_policies WHERE tablename = 'impostazioni_utente';
  ```
  → Atteso: 4 policy (SELECT, INSERT, UPDATE, DELETE)
- [ ] Verificare l'indice UNIQUE su `user_id`:
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'impostazioni_utente' AND indexdef LIKE '%user_id%';
  ```
  → Atteso: indice UNIQUE presente
- [ ] Eseguire `SELECT * FROM impostazioni_utente LIMIT 1` — assenza di errori (tabella accessibile)
- [ ] Verificare che il default JSONB di `preferences` contenga tutte le 28 chiavi attese:
  ```sql
  SELECT column_default
  FROM information_schema.columns
  WHERE table_name = 'impostazioni_utente' AND column_name = 'preferences';
  ```
  Chiavi da verificare: `display_show_balances`, `display_show_account_icons`, `display_compact_mode`, `display_show_categories`, `display_animations_enabled`, `display_font_size`, `display_currency_display`, `display_number_format`, `display_high_contrast`, `display_show_percentages`, `display_show_transaction_icons`, `display_reduce_motion`, `sr_verbosity`, `sr_announce_navigation`, `sr_announce_filters`, `sr_announce_form_changes`, `sr_announce_shortcuts`, `sr_announce_balance_changes`, `sr_announce_budget_alerts`, `sr_announce_progress`, `sr_announce_focus_changes`, `sr_announce_list_position`, `sr_announce_delay`, `sr_reduced_announcements`, `audio_enabled`, `audio_volume`, `talkback_adaptations`, `talkback_manual_override`

**Gate intermedio Passo A:**
- [ ] Passo A completato — documentare data e esito: _Data: ___ — Esito: ___

---

## Passo B — Trigger `cifrato` (prerequisito: Passo A completato)

> Non iniziare questo passo finché il gate intermedio del Passo A non è stato firmato.

- [ ] Aprire l'editor SQL di Supabase
- [ ] Eseguire lo script `docs/5 - sql/P25-trigger-cifrato.sql` nell'editor SQL di Supabase
- [ ] Verificare assenza di errori nell'output dell'editor SQL
- [ ] Verificare la funzione `sync_cifrato` nel catalogo Supabase:
  - Navigare in Supabase → Database → Functions → cercare `sync_cifrato`
  - Oppure via SQL: `SELECT proname, prosecdef FROM pg_proc WHERE proname = 'sync_cifrato'`
  - → Atteso: `sync_cifrato` presente con `prosecdef = true` (SECURITY DEFINER)
- [ ] Verificare la funzione `propagate_cifrato_on_conto_update` nel catalogo Supabase:
  - `SELECT proname, prosecdef FROM pg_proc WHERE proname = 'propagate_cifrato_on_conto_update'`
  - → Atteso: presente con `prosecdef = true`
- [ ] Verificare il trigger `trg_sync_cifrato` sulla tabella `transazioni`:
  ```sql
  SELECT trigger_name, event_manipulation, action_timing
  FROM information_schema.triggers
  WHERE event_object_table = 'transazioni' AND trigger_name = 'trg_sync_cifrato';
  ```
  → Atteso: `BEFORE`, `INSERT` e `UPDATE`
- [ ] Verificare il trigger `trg_propagate_cifrato` sulla tabella `conti`:
  ```sql
  SELECT trigger_name, event_manipulation, action_timing
  FROM information_schema.triggers
  WHERE event_object_table = 'conti' AND trigger_name = 'trg_propagate_cifrato';
  ```
  → Atteso: `AFTER`, `UPDATE`
- [ ] **Test funzionale:** INSERT su `transazioni` con `conto_id` di un conto `is_privato = TRUE`:
  - Identificare l'UUID di un conto con `is_privato = TRUE` nel database di test
  - Eseguire INSERT includendo `cifrato = FALSE` nel payload (per verificare che il trigger lo sovrascriva)
  - Verificare che `cifrato` risulti `TRUE` nel SELECT successivo sulla stessa riga
  - → Atteso: `cifrato = TRUE` indipendentemente dal valore passato nel payload
- [ ] **Test propagazione:** UPDATE di `conti.is_privato` da FALSE a TRUE:
  - Identificare un conto con `is_privato = FALSE` che ha almeno una transazione collegata
  - Eseguire `UPDATE conti SET is_privato = TRUE WHERE id = '<uuid_conto>'`
  - Verificare che le transazioni collegate abbiano `cifrato = TRUE`
  - → Atteso: tutte le transazioni del conto aggiornate a `cifrato = TRUE`

**Gate finale Passo B:**
- [ ] Passo B completato — documentare data e esito: _Data: ___ — Esito: ___

---

## Verifica finale

- [ ] `npm run build` → exit 0 — invariato (nessun file sorgente modificato)
- [ ] `npm run lint` → 0 warning — invariato (nessun file sorgente modificato)
- [ ] `npm run test:run` → 5 passed — invariato (nessun file sorgente modificato)
- [ ] Script SQL Passo A eseguito su Supabase senza errori
- [ ] Script SQL Passo B eseguito su Supabase senza errori
- [ ] Trigger `trg_sync_cifrato` verificato e funzionante su `transazioni`
- [ ] Trigger `trg_propagate_cifrato` verificato e funzionante su `conti`
- [ ] Nessun file in `src/` modificato
- [ ] Nessun file in `.github/` modificato

---

## Checklist gate finale

| Gate | Atteso | Effettivo |
|---|---|---|
| Cartella `docs/5 - sql/` presente | Cartella creata | |
| `P25-schema-impostazioni-utente.sql` presente | File esistente | |
| `P25-trigger-cifrato.sql` presente | File esistente | |
| Tabella `impostazioni_utente` — colonne | 8 colonne (id, user_id, nome_visualizzato, valuta_default, pin_privato_hash, preferences, created_at, updated_at) | |
| Policy RLS attiva | 4 policy con `auth.uid() = user_id` | |
| Indice UNIQUE su `user_id` | Presente | |
| Trigger `handle_updated_at` | Presente su `impostazioni_utente` | |
| Default JSONB `preferences` | 28 chiavi presenti | |
| Funzione `sync_cifrato` | Presente con SECURITY DEFINER | |
| Funzione `propagate_cifrato_on_conto_update` | Presente con SECURITY DEFINER | |
| Trigger `trg_sync_cifrato` | BEFORE INSERT OR UPDATE su `transazioni` | |
| Trigger `trg_propagate_cifrato` | AFTER UPDATE OF `is_privato` su `conti` | |
| Test INSERT `cifrato` | `cifrato = TRUE` su conto privato | |
| Test propagazione `is_privato` | Transazioni aggiornate a `cifrato = TRUE` | |
| `npm run build` | exit 0 | |
| `npm run lint` | 0 warning | |
| `npm run test:run` | 5 passed | |
| File `src/**` invariati | Nessuna modifica | |
| File `.github/**` invariati | Nessuna modifica | |
| AI1 — schema reale documentato | Discrepanze rilevate e gestite | |
| AI2 — moddatetime documentato | Soluzione adottata (5A o 5B) | |
