# ZECCHINO — Schema database Supabase
**Progetto:** zecchino | **Server:** EU West (Parigi) | **Data creazione schema:** 2026-04-28

***

## Tabella 1 — `conti`

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `id` | UUID | ✅ | auto-generato | Chiave primaria |
| `user_id` | UUID | ✅ | — | Riferimento a `auth.users` |
| `nome` | TEXT | ✅ | — | Nome del conto |
| `tipo` | TEXT | ✅ | — | bancario, prepagata, contanti, salvadanaio, privato, investimenti, credito, paypal, crypto, pensione |
| `saldo_iniziale` | NUMERIC(14,2) | ✅ | 0 | Saldo al momento della creazione |
| `valuta` | TEXT | ✅ | EUR | Codice valuta |
| `is_privato` | BOOLEAN | ✅ | FALSE | Conto protetto da PIN separato |
| `data_creazione` | DATE | ✅ | data odierna | — |
| `colore` | TEXT | ❌ | — | Colore visivo nell'interfaccia |
| `icona` | TEXT | ❌ | — | Icona visiva nell'interfaccia |
| `archiviato` | BOOLEAN | ✅ | FALSE | Nascosto senza essere eliminato |
| `ordine` | INTEGER | ✅ | 0 | Posizione nel riordinamento manuale |
| `created_at` | TIMESTAMPTZ | ✅ | ora attuale | — |
| `updated_at` | TIMESTAMPTZ | ✅ | ora attuale | — |

***

## Tabella 2 — `categorie`

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `id` | UUID | ✅ | auto-generato | Chiave primaria |
| `user_id` | UUID | ✅ | — | Riferimento a `auth.users` |
| `nome` | TEXT | ✅ | — | — |
| `tipo` | TEXT | ✅ | — | entrata, uscita |
| `predefinita` | BOOLEAN | ✅ | FALSE | Categoria di sistema non eliminabile |
| `icona` | TEXT | ❌ | — | — |
| `colore` | TEXT | ❌ | — | — |
| `archiviata` | BOOLEAN | ✅ | FALSE | — |
| `created_at` | TIMESTAMPTZ | ✅ | ora attuale | — |
| `updated_at` | TIMESTAMPTZ | ✅ | ora attuale | — |

***

## Tabella 3 — `tag`

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `id` | UUID | ✅ | auto-generato | Chiave primaria |
| `user_id` | UUID | ✅ | — | Riferimento a `auth.users` |
| `nome` | TEXT | ✅ | — | — |
| `colore` | TEXT | ❌ | — | — |
| `icona` | TEXT | ❌ | — | — |
| `usato_n_volte` | INTEGER | ✅ | 0 | Contatore automatico utilizzi |
| `created_at` | TIMESTAMPTZ | ✅ | ora attuale | — |

***

## Tabella 4 — `transazioni`

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `id` | UUID | ✅ | auto-generato | Chiave primaria |
| `user_id` | UUID | ✅ | — | Riferimento a `auth.users` |
| `conto_id` | UUID | ✅ | — | Riferimento a `conti` |
| `conto_destinazione_id` | UUID | ❌ | — | Solo per trasferimenti, riferimento a `conti` |
| `categoria_id` | UUID | ❌ | — | Riferimento a `categorie` |
| `tipo` | TEXT | ✅ | — | entrata, uscita, trasferimento |
| `importo` | NUMERIC(14,2) | ✅ | — | Deve essere maggiore di 0 |
| `data` | DATE | ✅ | — | Data del movimento |
| `descrizione` | TEXT | ❌ | — | Testo libero |
| `note` | TEXT | ❌ | — | Testo aggiuntivo libero |
| `cifrato` | BOOLEAN | ✅ | FALSE | Movimento appartenente a conto privato |
| `ricorrente` | BOOLEAN | ✅ | FALSE | — |
| `frequenza_ricorrenza` | TEXT | ❌ | — | giornaliero, settimanale, mensile, annuale |
| `ricorrenza_fine` | DATE | ❌ | — | Data fine della ricorrenza |
| `created_at` | TIMESTAMPTZ | ✅ | ora attuale | — |
| `updated_at` | TIMESTAMPTZ | ✅ | ora attuale | — |

***

## Tabella 4b — `transazioni_tag` *(collegamento)*

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| `transazione_id` | UUID | ✅ | Riferimento a `transazioni` |
| `tag_id` | UUID | ✅ | Riferimento a `tag` |

*Chiave primaria composta: `(transazione_id, tag_id)` — una transazione può avere più tag e viceversa.*

***

## Tabella 5 — `budget`

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `id` | UUID | ✅ | auto-generato | Chiave primaria |
| `user_id` | UUID | ✅ | — | Riferimento a `auth.users` |
| `nome` | TEXT | ✅ | — | — |
| `importo_target` | NUMERIC(14,2) | ✅ | — | Limite di spesa, deve essere maggiore di 0 |
| `periodo` | TEXT | ✅ | — | mensile, trimestrale, annuale |
| `categoria_id` | UUID | ❌ | — | Riferimento a `categorie` |
| `conto_id` | UUID | ❌ | — | Riferimento a `conti` |
| `data_inizio` | DATE | ✅ | — | — |
| `data_fine` | DATE | ❌ | — | — |
| `attivo` | BOOLEAN | ✅ | TRUE | — |
| `notifica_soglia` | INTEGER | ❌ | — | Percentuale 1–100 oltre cui avvisare |
| `created_at` | TIMESTAMPTZ | ✅ | ora attuale | — |
| `updated_at` | TIMESTAMPTZ | ✅ | ora attuale | — |

***

## Tabella 6 — `obiettivi_risparmio`

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `id` | UUID | ✅ | auto-generato | Chiave primaria |
| `user_id` | UUID | ✅ | — | Riferimento a `auth.users` |
| `conto_associato` | UUID | ❌ | — | Riferimento a `conti` |
| `nome` | TEXT | ✅ | — | — |
| `descrizione` | TEXT | ❌ | — | — |
| `importo_target` | NUMERIC(14,2) | ✅ | — | Traguardo da raggiungere |
| `importo_corrente` | NUMERIC(14,2) | ✅ | 0 | Quanto accumulato finora |
| `data_inizio` | DATE | ✅ | data odierna | — |
| `data_scadenza` | DATE | ❌ | — | — |
| `colore` | TEXT | ❌ | — | — |
| `icona` | TEXT | ❌ | — | — |
| `completato` | BOOLEAN | ✅ | FALSE | — |
| `data_completamento` | DATE | ❌ | — | — |
| `created_at` | TIMESTAMPTZ | ✅ | ora attuale | — |
| `updated_at` | TIMESTAMPTZ | ✅ | ora attuale | — |

***

## Tabella 7 — `ricorrenze`

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `id` | UUID | ✅ | auto-generato | Chiave primaria |
| `user_id` | UUID | ✅ | — | Riferimento a `auth.users` |
| `conto_id` | UUID | ✅ | — | Riferimento a `conti` |
| `categoria_id` | UUID | ❌ | — | Riferimento a `categorie` |
| `tipo` | TEXT | ✅ | — | entrata, uscita |
| `importo` | NUMERIC(14,2) | ✅ | — | Deve essere maggiore di 0 |
| `descrizione` | TEXT | ✅ | — | — |
| `frequenza` | TEXT | ✅ | — | giornaliero, settimanale, mensile, annuale |
| `data_inizio` | DATE | ✅ | — | — |
| `data_fine` | DATE | ❌ | — | — |
| `ultima_generazione` | DATE | ❌ | — | Data dell'ultima transazione generata |
| `prossima_generazione` | DATE | ✅ | — | Data della prossima da creare |
| `attiva` | BOOLEAN | ✅ | TRUE | — |
| `created_at` | TIMESTAMPTZ | ✅ | ora attuale | — |
| `updated_at` | TIMESTAMPTZ | ✅ | ora attuale | — |

***

## Tabella 8 — `impostazioni_utente`

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `id` | UUID | ✅ | auto-generato | Chiave primaria |
| `user_id` | UUID | ✅ | — | Unico per utente, riferimento a `auth.users` |
| `valuta_default` | TEXT | ✅ | EUR | — |
| `lingua` | TEXT | ✅ | it | — |
| `tema` | TEXT | ✅ | system | light, dark, system |
| `formato_data` | TEXT | ✅ | DD/MM/YYYY | — |
| `formato_numero` | TEXT | ✅ | it-IT | Separatori decimali e migliaia |
| `primo_giorno_settimana` | INTEGER | ✅ | 1 | 0=domenica, 1=lunedì, ... 6=sabato |
| `notifiche_attive` | BOOLEAN | ✅ | TRUE | — |
| `mostra_saldo_homepage` | BOOLEAN | ✅ | TRUE | Privacy in luoghi pubblici |
| `pin_hash` | TEXT | ❌ | — | PIN globale cifrato |
| `pin_privato_hash` | TEXT | ❌ | — | PIN conti privati cifrato |
| `preferences` | `jsonb` | No (nullable) | `null` | Preferenze utente serializzate: display, audio, screen reader, categorie visibili. Sostituisce 28+ chiavi `useKV`. Struttura interna definita in P29. |
| `created_at` | TIMESTAMPTZ | ✅ | ora attuale | — |
| `updated_at` | TIMESTAMPTZ | ✅ | ora attuale | — |

***

## Tabella 9 — `notifiche`

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `id` | UUID | ✅ | auto-generato | Chiave primaria |
| `user_id` | UUID | ✅ | — | Riferimento a `auth.users` |
| `tipo` | TEXT | ✅ | — | budget_soglia, budget_superato, obiettivo_raggiunto, sistema |
| `titolo` | TEXT | ✅ | — | — |
| `messaggio` | TEXT | ❌ | — | — |
| `letta` | BOOLEAN | ✅ | FALSE | — |
| `canale` | TEXT | ✅ | inapp | inapp, email, push |
| `schedulata_per` | TIMESTAMPTZ | ❌ | — | Per avvisi programmati futuri |
| `entita_tipo` | TEXT | ❌ | — | budget, obiettivo, conto, transazione |
| `entita_id` | UUID | ❌ | — | ID dell'entità che ha scatenato l'avviso |
| `created_at` | TIMESTAMPTZ | ✅ | ora attuale | — |

***

## Tabella 10 — `storico_accessi`

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `id` | UUID | ✅ | auto-generato | Chiave primaria |
| `user_id` | UUID | ✅ | — | Riferimento a `auth.users` |
| `accesso_at` | TIMESTAMPTZ | ✅ | ora attuale | — |
| `ip_address` | INET | ❌ | — | Indirizzo IP |
| `user_agent` | TEXT | ❌ | — | Browser e sistema operativo |
| `dispositivo` | TEXT | ❌ | — | Tipo di dispositivo |
| `tipo_accesso` | TEXT | ❌ | — | pin_globale, pin_privato, biometrico |
| `sessione_id` | TEXT | ❌ | — | Per gestione logout multi-dispositivo |
| `esito` | TEXT | ✅ | successo | successo, fallito |

***

## Tabella 11 — `allegati_transazioni`

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `id` | UUID | ✅ | auto-generato | Chiave primaria |
| `user_id` | UUID | ✅ | — | Riferimento a `auth.users` |
| `transazione_id` | UUID | ✅ | — | Riferimento a `transazioni` |
| `nome_file` | TEXT | ✅ | — | Nome originale del file |
| `storage_path` | TEXT | ✅ | — | Percorso nel sistema di archiviazione Supabase |
| `mime_type` | TEXT | ❌ | — | Tipo di file (es. image/jpeg, application/pdf) |
| `dimensione_bytes` | INTEGER | ❌ | — | Peso del file in byte |
| `descrizione` | TEXT | ❌ | — | Testo libero descrittivo |
| `miniatura_path` | TEXT | ❌ | — | Percorso anteprima ridotta per le liste |
| `created_at` | TIMESTAMPTZ | ✅ | ora attuale | — |

***

## Indici creati

| Nome indice | Tabella | Campo/i | Scopo |
|---|---|---|---|
| `idx_conti_user` | conti | user_id | Tutti i conti di un utente |
| `idx_categorie_user` | categorie | user_id | Tutte le categorie di un utente |
| `idx_tag_user` | tag | user_id | Tutti i tag di un utente |
| `idx_transazioni_user` | transazioni | user_id | Tutte le transazioni di un utente |
| `idx_transazioni_conto` | transazioni | conto_id | Transazioni per conto |
| `idx_transazioni_data` | transazioni | data DESC | Transazioni ordinate per data |
| `idx_transazioni_categoria` | transazioni | categoria_id | Transazioni per categoria |
| `idx_transazioni_tipo` | transazioni | tipo | Filtro entrate/uscite/trasferimenti |
| `idx_budget_user` | budget | user_id | Tutti i budget di un utente |
| `idx_obiettivi_user` | obiettivi_risparmio | user_id | Tutti gli obiettivi di un utente |
| `idx_ricorrenze_user` | ricorrenze | user_id | Tutte le ricorrenze di un utente |
| `idx_ricorrenze_prossima` | ricorrenze | prossima_generazione | Solo ricorrenze attive, per il motore automatico |
| `idx_notifiche_user_letta` | notifiche | user_id + letta | Notifiche non lette per utente |
| `idx_notifiche_schedulata` | notifiche | schedulata_per | Solo notifiche con data programmata |
| `idx_storico_user` | storico_accessi | user_id + accesso_at DESC | Accessi recenti per utente |
| `idx_allegati_transazione` | allegati_transazioni | transazione_id | Allegati di una transazione |

***

## Sicurezza applicata

Row Level Security attiva su tutte e 11 le tabelle. Policy applicata: ogni utente accede esclusivamente ai propri dati tramite confronto `auth.uid() = user_id`.

***

