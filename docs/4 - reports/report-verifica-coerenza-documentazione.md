# Report — Verifica di coerenza della documentazione di migrazione Spark → Supabase

| Campo | Valore |
|---|---|
| Tipo | Report di verifica read-only (audit di coerenza) |
| Branch | `refactoring-architettura` |
| Data | 30 aprile 2026 |
| Autore | Agent-Analyze |
| Documenti analizzati | `docs/4 - reports/report-analisi-migrazione-supabase.md`, `docs/schema database supabase.md`, `docs/1 - projects/P24..P36-*.md` (13 design) |
| Codice ispezionato (sola lettura) | `src/context/AuthContext.tsx`, `src/context/AppDataContext.tsx`, `src/components/{CategoryManagement,SecuritySettings,DisplaySettings,AudioSettings,ScreenReaderSettings,TransactionDialog,DataManagement}.tsx`, `src/hooks/{use-display-preferences,use-talkback}.ts`, `src/lib/{crypto,sound-system,types}.ts`, `src/test/setup.ts` |
| File modificati | Nessuno (creazione di questo report) |
| Vincolo operativo | Sola lettura. Nessuna modifica ai documenti analizzati. |

---

## 1. Sintesi esecutiva

**Semaforo: VERDE → PRONTO PER ESECUZIONE.**

La suite di design P24–P36 è internamente coerente sui punti critici (mappatura
chiavi → tabelle, naming `pin_privato_hash`, trattamento del campo `cifrato`
come campo derivato via trigger, esclusione di `global-pin-hash` perché gestito
da Supabase Auth). Tutti i 26 path file sorgente citati nei design esistono nel
repository. Lo schema database e i design operativi sono allineati. Sono stati
identificati 6 problemi MINORI documentazionali (riconciliazione di conteggi
numerici, naming divergenti rispetto al report originale, una decisione
crittografica esplicitamente differita al coding plan), ma **nessun problema
BLOCCANTE**: la suite può essere consegnata agli agenti Plan/Code.

---

## 2. Risultati per livello di verifica

### L1 — Coerenza con il report di analisi originale

| Aspetto | Esito | Note |
|---|---|---|
| 5 chiavi di dominio → tabelle 1:1 | OK | P24 §3, §5.1; ripreso in P28 |
| 31 chiavi distinte / 3 famiglie | Parziale | Il numero "31" è ripetuto in P24 §3 e §9, ma il dettaglio interno (24 vs 28 preferenze) è incoerente — vedi L6 |
| Trattamento `cifrato` (rimuovere o derivato) | OK | Report §6 offriva 2 opzioni; P24 §4.4 seleziona "derivato via trigger"; P25, P26 §7.2, P28 §6, P34 sono coerenti con questa scelta |
| PIN privato richiede bcrypt/argon2 (raccomandazione report §5) | Riconosciuta | P24 §4.3 + R10 segnano la criticità; P32 §11 differisce l'adozione al coding plan del Blocco 8 — vedi L5 |
| Tabelle fuori scope (notifiche, storico_accessi, tag, allegati, ricorrenze) | OK | P24 §4.8 + §5.2 le elencano esplicitamente |
| Eccezione: `dismissed-budget-alerts` confluisce in `notifiche` | OK | P24 §4.8 + §5.1, ripreso in P28/P31 |

**Esito L1: COERENTE** con il report originale. Le decisioni sono tracciabili
back ai punti aperti del report.

### L2 — Dipendenze fra blocchi

I 13 design coprono i 10 blocchi di P24 §6. Mapping ricostruito:

| Blocco P24 | Design operativo | Dipendenze dichiarate |
|---|---|---|
| 1 (schema impostazioni_utente, cifrato) | P25 | nessuna |
| 2 (strato dati Supabase) | P26 | P25 |
| 3 (AuthContext) | P27 | P26 |
| 4 (AppDataContext) | P28 (+ P33 deduplicazione CategoryManagement) | P26, P27 |
| 5 (preferenze UI/A11y/Audio) | P29 (hook `useUserSettings`) + P31 (display/audio/sr) | P25, P26, P27 |
| 6 (`budget-percentages` cache) | P30 | P28 |
| 7 (DataManagement export/import) | P34 | P28, P29, P31 |
| 8 (PIN privato) | P32 | P27, P29 |
| 9 (Onboarding) | P35 | P27, P28, P29 |
| 10 (decommissioning Spark + offline read-only) | P36 | tutti i precedenti |

Le sezioni "Dipendenze" / "Coordinamento blocchi" presenti in ogni design citano
correttamente i predecessori. In particolare:

- P28 §6 dichiara la dipendenza dal trigger `trg_sync_cifrato` di P25 §4
  (deve essere attivo prima del primo `conti.create()` con `isPrivato=true`).
- P32 §11 dichiara di lasciare bcrypt/argon2 come Punto Aperto al coding
  plan, citando esplicitamente P24 R10.
- P36 elenca 6 PA (PA-1..PA-6) e descrive l'attivazione finale post-blocchi 1–9.

**Esito L2: COERENTE.** Catena di dipendenze consistente. Unico gap
documentazionale: il mapping fra i 13 file P25–P36 e i 10 blocchi di P24 §6
**non è esplicitato** in un indice di coordinamento (P33 e la suddivisione
Blocco 5 in P29+P31 sono inferibili ma non riassunti) — vedi L7 / problema MINORE 5.

### L3 — Esistenza dei file sorgente citati

Verifica di esistenza con `Test-Path` su tutti i 26 path `src/...` ricorrenti
nei design (AuthContext, AppDataContext, AppHeader, AuthScreen, PinDialog,
SecuritySettings, CategoryManagement, DataManagement, DisplaySettings,
AudioSettings, ScreenReaderSettings, TransactionDialog, BudgetProgressCard,
use-display-preferences, use-talkback, use-visible-data, use-app-shortcuts,
crypto, constants, types, sound-system, helpers, test/setup, App.tsx,
vite.config.ts, VisibleDataContext).

| Risultato | Conteggio |
|---|---|
| File esistenti | 26/26 |
| File mancanti | 0 |

**Esito L3: COERENTE.** Nessun design fa riferimento a file inesistenti.

### L4 — Allineamento con lo schema database

| Verifica | Esito |
|---|---|
| `transazioni.cifrato BOOLEAN DEFAULT FALSE` presente in schema | OK (Tabella 4) |
| `cifrato` mai scritto da client nei design (P28 §6, P34) | OK |
| Trigger `trg_sync_cifrato` previsto in P25 §4 | OK |
| `impostazioni_utente.pin_privato_hash TEXT NULL` in schema | OK (Tabella 8) |
| Naming `pin_privato_hash` coerente in P24, P25, P27, P28, P32, P34, P35 | OK |
| `impostazioni_utente.preferences jsonb` in schema | OK (Tabella 8) |
| 28 chiavi flat in `preferences` (P31 §3) compatibile con jsonb | OK |
| RLS `auth.uid() = user_id` su tutte le 11 tabelle in scope | OK (schema § Sicurezza) |
| Tabelle fuori scope (notifiche, storico_accessi, tag, ricorrenze, allegati) | OK in schema, non toccate dai design |

**Esito L4: COERENTE.** Schema e design parlano la stessa lingua su nomi,
tipi, RLS e trigger.

### L5 — Sicurezza del PIN privato

P24 §4.3 + R10 (rischio "Critico — sicurezza") raccomandano bcrypt o argon2
client-side, oppure verifica via Edge Function. P32 (Blocco 8) gestisce la
migrazione del PIN privato come segue:

- §3.1 mantiene l'uso di `hashPin()` da `src/lib/crypto.ts` (oggi SHA-256) per
  la fase ponte.
- §11 dichiara esplicitamente: «la primitiva crittografica reale (bcrypt/argon2)
  resta come Punto Aperto al coding plan dedicato al Blocco 8».
- Strategia di compatibilità: gestione hash legacy via lunghezza stringa per
  evitare rotture all'utente esistente.

**Esito L5: COERENTE — con un Punto Aperto dichiarato.** La decisione
crittografica reale è formalmente differita al coding plan del Blocco 8. Non è
una contraddizione nascosta: è una deferred decision esplicita. Da segnalare
come MINORE perché un agente Code che eseguisse P32 senza il coding plan del
Blocco 8 implementerebbe ancora SHA-256 (vedi problema MINORE 2).

### L6 — Copertura delle 31 chiavi e conteggi

Conteggio reale derivato da grep su `src/**/*.{ts,tsx}` (escludendo `src/test/setup.ts`):

| Famiglia | Chiavi distinte | File |
|---|---|---|
| Dominio | 5 (`accounts`, `transactions`, `categories`, `budgets`, `savings-goals`) | AppDataContext |
| Cache UI in AppDataContext | 3 (`visible-categories`, `dismissed-budget-alerts`, `budget-percentages`) | AppDataContext |
| Sicurezza PIN | 2 (`global-pin-hash`, `private-pin-hash`) | AuthContext + duplicati in SecuritySettings |
| Display | 12 (`display-*`) | DisplaySettings + duplicati in use-display-preferences |
| Screen reader | 12 (`sr-*`) | ScreenReaderSettings |
| Audio | 2 (`audio-*`) | AudioSettings |
| TalkBack | 2 (`talkback-*`) | use-talkback |
| **Totale distinte** | **38** | — |

Mappatura ai design:

| Chiave | Design che la migra | Tabella destinazione |
|---|---|---|
| 5 dominio | P28 (Blocco 4) | tabelle dominio + RLS |
| `visible-categories` | P28 / P29 | `impostazioni_utente.preferences` |
| `dismissed-budget-alerts` | P28 / P29 | `notifiche` |
| `budget-percentages` | P30 (Blocco 6) | non migrata (`useState`) |
| `global-pin-hash` | P27 (Blocco 3) | rimossa (Supabase Auth) |
| `private-pin-hash` | P27 + P32 (Blocco 8) | `impostazioni_utente.pin_privato_hash` |
| 12 `display-*` | P29 + P31 (Blocco 5) | `impostazioni_utente.preferences` |
| 12 `sr-*` | P31 (Blocco 5) | `impostazioni_utente.preferences` |
| 2 `audio-*` | P31 (Blocco 5) | `impostazioni_utente.preferences` |
| 2 `talkback-*` | P31 (Blocco 5) | `impostazioni_utente.preferences` (chiave annidata) |

**Esito L6: COERENTE sulla copertura — INCOERENTE sui conteggi.** Tutte le
chiavi attualmente in uso sono coperte da un design. Però il conteggio "24
preferenze" usato da P24 §3, §4.7, §5.1 (e ripreso da P25 §3) **non corrisponde**
al conteggio "28 preferenze" usato da P26 §1/§7.2, P31 §3 (esplicito: "26 dai 3
file + 2 talkback = 28") e P36 §3. Vedi problema MINORE 1.

### L7 — Verificabilità dei criteri di successo

Ogni design ha una sezione "Criteri di accettazione" o "Definition of Done":

| Design | Sezione DoD | Verificabilità |
|---|---|---|
| P24 §9 | Checklist 12 voci | Verificabile per ispezione del documento |
| P25 §10 | Checklist schema + trigger | Verificabile su Supabase |
| P26 §10 | Checklist signature repository + tipi | Verificabile compile-time |
| P27, P28, P29, P31, P32, P33, P34, P35, P36 | DoD specifico per blocco | Verificabile via test/lint/run-time |

**Esito L7: COERENTE.** Ogni DoD ha criteri concreti (compile, test, schema
applicato). Manca però un **indice di coordinamento** che mappi i 13 design ai
10 blocchi di P24 §6 — vedi problema MINORE 5.

---

## 3. Problemi prioritizzati

### Problemi BLOCCANTI

**Nessuno.** La suite di design può essere passata al ciclo di coding.

### Problemi MINORI

#### MINORE 1 — Conteggio chiavi di preferenza incoerente fra documenti (24 vs 28)

- **Dove**: P24 §3 ("24 chiavi preferenze"), §4.7 ("le 24 chiavi `display-*`,
  `sr-*`, `audio-*`, `talkback-*`"), §5.1 (riga "24 chiavi UI/A11y/Audio"),
  §6 Blocco 5 e §7 R11 — vs — P26 §1 e §7.2 ("28 chiavi"), P31 §3 ("28 chiavi
  (26 dai 3 file + 2 talkback)"), P36 §3 ("28 chiavi"), P25 §3 ("24 chiavi
  Spark derivate") e §10 (default JSONB "24 chiavi").
- **Cosa dice**: P24 e P25 contano "24" includendo nominalmente
  `display-*`+`sr-*`+`audio-*`+`talkback-*`; in realtà queste famiglie
  sommano a 12+12+2+2 = **28**, come riconosciuto da P26, P31 e P36.
- **Perché è un problema**: incoerenza puramente numerica, ma rischia di
  produrre seed JSONB incompleti se un agente Code seguisse P25 §10
  ("default JSONB con tutte le 24 chiavi") senza incrociare con P31 §4
  (struttura flat con 28 chiavi). I 4 `audio-*`+`talkback-*` rischierebbero
  l'omissione nei default.
- **Cosa correggere**: aggiornare P24 §3, §4.7, §5.1 e §6 Blocco 5 + P25 §3 e
  §10 sostituendo "24" con "28" (o mantenere la frase e aggiungere una nota
  "26 chiavi flat dei 3 file + 2 chiavi talkback annidate"). In alternativa,
  inserire una singola tabella riepilogo conteggi in P24 §3 che P25–P36
  citino come fonte unica.

#### MINORE 2 — Decisione crittografica PIN privato (bcrypt/argon2) deferita

- **Dove**: P32 §11 (Punto Aperto), riferendosi a P24 §4.3 e R10.
- **Cosa dice**: P32 mantiene SHA-256 dell'attuale `src/lib/crypto.ts` come
  ponte e dichiara di lasciare la sostituzione con bcrypt o argon2 al
  "coding plan dedicato al Blocco 8".
- **Perché è un problema**: un agente Code che eseguisse P32 alla lettera,
  senza il coding plan del Blocco 8 ancora prodotto, **non risolverebbe**
  il rischio R10 ("Critico — sicurezza") di P24 §7. P32 dichiara la cosa,
  ma P24 R10 marca l'algoritmo come critico per la consegna.
- **Cosa correggere**: prima di iniziare il coding del Blocco 8, produrre
  un coding plan o un addendum a P32 che chiuda esplicitamente la scelta
  fra (a) bcrypt-ts/argon2-browser client-side e (b) Edge Function
  server-side. In alternativa, escludere P32 dalla prima ondata di code e
  schedularlo dopo il coding plan dedicato.

#### MINORE 3 — Naming `pin_privato_hash` divergente dal suggerimento del report

- **Dove**: report originale §5 ("nome suggerito: `private_account_pin_hash`")
  vs P24, P25 §3.4, P27, P28, P32, P34, P35, P36 (tutti `pin_privato_hash`).
- **Cosa dice**: il report originale offriva `private_account_pin_hash` come
  esempio non vincolante; la suite di design adotta `pin_privato_hash`
  (coerente con la convenzione snake_case italiana del resto dello schema).
- **Perché è un problema**: divergenza nominalmente innocua, ma chi rileggerà
  il report originale potrà chiedersi quale dei due nomi sia canonico.
- **Cosa correggere**: aggiungere una breve nota in P24 §4.3 o §5.1 che
  espliciti: "il nome canonico è `pin_privato_hash` (snake_case italiano,
  schema DB); il report originale §5 lo cita come `private_account_pin_hash`
  in via esemplificativa". Nessuna modifica agli altri design necessaria.

#### MINORE 4 — Naming `transazioni_ricorrenti` vs `ricorrenze`

- **Dove**: report originale (riferimenti a `transazioni_ricorrenti`) vs
  schema DB Tabella 9 e P24 §4.8 / §5.2 (`ricorrenze`).
- **Cosa dice**: lo schema canonico usa `ricorrenze`. Il report originale
  in alcuni passaggi cita `transazioni_ricorrenti`, che è una formulazione
  pre-schema.
- **Perché è un problema**: tabella esplicitamente fuori scope (P24 §4.8),
  quindi nessun impatto operativo. Solo confusione documentazionale.
- **Cosa correggere**: lasciare la divergenza così (la tabella non è
  toccata in questa migrazione) oppure aggiungere una nota nel report
  originale con il nome canonico `ricorrenze`. P24 §5.2 già fa questo
  chiarimento.

#### MINORE 5 — Manca indice di mapping fra 13 design e 10 blocchi P24

- **Dove**: P24 §6 elenca 10 blocchi; i 13 design P25–P36 esistono ma il
  mapping (P29+P31 = Blocco 5; P33 = sotto-task del Blocco 4; ecc.) non è
  documentato in un singolo indice.
- **Cosa dice**: i singoli design citano "Blocco N", ma manca una tabella
  riepilogo lato P24 (o un nuovo file `docs/1 - projects/INDEX-blocchi.md`).
- **Perché è un problema**: l'agente Plan/Orchestrator deve ricostruire da
  sé la corrispondenza per pianificare l'esecuzione in ordine. Rischio di
  saltare P33 (deduplicazione `CategoryManagement.tsx` `useKV`) perché
  apparentemente "fuori sequenza".
- **Cosa correggere**: aggiungere a P24 §6 una colonna "Design operativo"
  con il nome del file P25–P36. In alternativa, creare un breve documento
  indice in `docs/1 - projects/`.

#### MINORE 6 — Duplicati `useKV` in `SecuritySettings.tsx` non esplicitamente trattati come deduplica

- **Dove**: `src/components/SecuritySettings.tsx` L27-L28 apre `useKV` su
  `global-pin-hash` e `private-pin-hash` in parallelo a `AuthContext`.
  P24 §3 lo segnala come duplicazione split-brain.
- **Cosa dice**: P27 (Blocco 3) rimuove la sezione "Cambio PIN globale"
  da `SecuritySettings`; P32 (Blocco 8) riscrive la sezione "Cambio PIN
  privato" passando per `AuthContext`. Quindi la deduplicazione **avviene
  implicitamente** quando entrambi i blocchi sono completati, ma nessuno
  dei due la marca esplicitamente come "deduplicazione del `useKV`
  parallelo a AuthContext".
- **Perché è un problema**: rischio di lasciare residui `import { useKV }`
  o lookup duplicato in `SecuritySettings.tsx` se uno dei due blocchi
  viene rilavorato in isolamento.
- **Cosa correggere**: aggiungere in P27 (DoD) e P32 (DoD) una checkbox
  esplicita "rimosso `useKV` per `*-pin-hash` da `SecuritySettings.tsx`".

---

## 4. Verdetto finale

**PRONTO PER ESECUZIONE.**

La suite di documenti P24–P36 + schema DB + report di analisi è **coerente** sui
punti critici (decisioni architetturali, mappatura chiavi, schema DB, RLS,
trattamento `cifrato`, esclusione/migrazione PIN globale, copertura completa
delle chiavi `useKV` in uso). Tutti i file sorgente citati esistono. La catena
di dipendenze fra blocchi è consistente.

I 6 problemi identificati sono **MINORI**: 4 di natura puramente
documentazionale (riconciliazione conteggi, naming, indice di mapping,
checkbox DoD) e 2 con implicazioni operative limitate e già esplicitamente
tracciate nei design (algoritmo PIN deferito al coding plan del Blocco 8;
deduplicazione `SecuritySettings` da rendere esplicita).

**Raccomandazione operativa**: gli agenti Plan/Code possono iniziare
dall'ordine P25 → P26 → P27 → P28+P33 → P29+P31 → P30 → P34 → P35 → P32 → P36,
trattando le 6 segnalazioni MINORI come refinements documentazionali in
parallelo alla prima ondata di coding (problemi 1, 3, 4, 5, 6) o come gate
prima del Blocco 8 (problema 2 sull'algoritmo PIN privato).

---

*Fine report. Nessun documento è stato modificato. Modifiche al codice o ai
design esistenti devono essere richieste esplicitamente in un task separato.*
