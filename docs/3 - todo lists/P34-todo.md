# P34 — Todo List: Migrazione DataManagement a Supabase

> Derivata da `docs/2 - coding plans/P34-coding-plan.md`.
> Branch: `refactoring-architettura`
> Data creazione: 2026-05-03

---

## Sezione 1 — Prerequisiti

- [ ] Leggere e comprendere P34 §3, §4, §5, §6, §7, §8 del design prima di scrivere codice
- [ ] Verificare che i repository di P26 (`conti`, `transazioni`, `budget`, `obiettivi_risparmio`) abbiano i metodi `getAll()`, `create()`, `getById()`, `update()` disponibili e funzionanti
- [ ] Verificare che `useUserSettings()` (P29) esponga in lettura il flag `legacy_domain_migrated` da `impostazioni_utente.preferences`
- [ ] Verificare che `updatePreference()` del repository `impostazioni-utente` (P26 §7.6) sia disponibile per la scrittura del flag `legacy_domain_migrated`

---

## Sezione 2 — Fronte A: migrazione one-shot (Step A1–A10)

- [ ] [A1] Aggiungere lettura di `useUserSettings()` al mount del componente per il flag `legacy_domain_migrated`; inizializzare stato locale `migrationChecked`
- [ ] [A2] Implementare la logica di rilevamento in `useEffect` con le condizioni doppie: flag assente/false + almeno una chiave di dominio presente nel KV Spark
- [ ] [A3] Implementare i tre scenari di PA-2: errore di rete (mostrare messaggio informativo, non impostare flag), array KV vuoto (impostare flag direttamente), `window.spark` undefined (impostare flag direttamente)
- [ ] [A4] Implementare il pannello UI condizionale con pulsante «Avvia importazione storica», pulsante «Salta per ora» e annuncio screen reader all'apertura del pannello
- [ ] [A5] Implementare Fase 1 del flusso: lettura e validazione strutturale dei dati Spark dalle chiavi `accounts`, `transactions`, `budgets`, `savings-goals`; filtrare silenziosamente tutte le altre chiavi
- [ ] [A6] Implementare la costruzione della mappa `sparkId → supabaseId` durante l'inserimento dei conti (PA-1 Approccio A): per ogni `conti.create()` riuscito, registrare nella mappa la coppia ID Spark → UUID Supabase restituito
- [ ] [A7] Implementare Fase 2: inserimento nell'ordine FK corretto (conti → budget → obiettivi di risparmio → transazioni) con remapping FK tramite la mappa di Step A6; omettere il campo `cifrato` dal payload delle transazioni
- [ ] [A8] Implementare l'accumulatore degli errori best-effort: array di oggetti `{ entity, id, message }`; nessun errore interrompe il ciclo di inserimento
- [ ] [A9] Implementare l'indicatore di avanzamento con live region `aria-live="polite"` per i progressi intermedi e `aria-live="assertive"` per il completamento finale e gli errori bloccanti
- [ ] [A10] Implementare Fase 4: completamento con impostazione condizionale del flag tramite `updatePreference('legacy_domain_migrated', true)` solo se `migrationErrors.length === 0`; chiamare `refreshAll()`; mostrare toast di esito e report errori se presenti

---

## Sezione 3 — Fronte B: export/import Supabase (Step B1–B10)

- [ ] [B1] Riscrivere `handleExportData`: rimuovere `window.spark.kv.keys()` e il ciclo con `window.spark.kv.get(key)`; aggiungere `useAppData()` e destrutturare `{ accounts, transactions, budgets, savingsGoals }`
- [ ] [B2] Costruire il payload JSON con campo `meta` (`schema_version: "1.0"`, `exported_at` ISO 8601, `app_version` opzionale) e i quattro array da `useAppData()`
- [ ] [B3] Produrre il file `zecchino-backup-YYYY-MM-DD.json` con download via blob; mostrare toast di conferma con nome file e conteggio entità; annuncio screen reader
- [ ] [B4] Riscrivere `handleImportData`: rimuovere il ciclo con `window.spark.kv.set(key, value)`; aggiungere import dei repository P26 e `useAuth()` per `user.id`
- [ ] [B5] Implementare lettura e validazione del file JSON: struttura base (campi `meta`, `accounts`, `transactions`, `budgets`, `savingsGoals`) e check `meta.schema_version` — bloccare con messaggio esplicito se major diverso da `"1"`
- [ ] [B6] Implementare l'ordine di scrittura FK corretto: conti → budget → obiettivi di risparmio → transazioni (identico al Fronte A)
- [ ] [B7] Implementare il meccanismo upsert semantico (Decisione B): `getById(id)` + `create()` se non esiste, `update(id, data)` se esiste; contatori separati per create e update nel report finale
- [ ] [B8] Omettere il campo `cifrato` dal payload di `create()` e `update()` del repository `transazioni` in ogni chiamata del Fronte B
- [ ] [B9] Implementare accumulatore errori best-effort, indicatore di avanzamento con live region, e report finale con conteggio entità create, aggiornate e fallite; chiamare `refreshAll()` al termine indipendentemente dagli errori
- [ ] [B10] Sostituire `window.location.reload()` (e il `setTimeout` che la contiene) con chiamata a `refreshAll()` di `useAppData()` al termine dell'import
