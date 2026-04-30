# P34 — Migrazione DataManagement a Supabase

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P34 — Migrazione DataManagement a Supabase |
| **Tipo intervento** | Documento di design (sola lettura) |
| **Branch** | `refactoring-architettura` |
| **Data** | 30 aprile 2026 |
| **Autore** | Agent-Design |
| **File modificati** | Nessuno |
| **Documenti di riferimento** | [P24](./P24-architettura-migrazione-supabase.md) · [P25](./P25-schema-impostazioni-utente-cifrato.md) · [P26](./P26-strato-accesso-dati-supabase.md) · [P27](./P27-migrazione-authcontext-supabase.md) · [P28](./P28-migrazione-appdatacontext-supabase.md) · [P29](./P29-migrazione-usersettings-preferenze-ui.md) · [P30](./P30-migrazione-budgetpercentages-usestate.md) · [P31](./P31-migrazione-preferenze-display-audio-screenreader.md) · [P32](./P32-migrazione-pin-privato-supabase.md) · [P33](./P33-migrazione-categorymanagement-useappdata.md) · [DataManagement.tsx](../../src/components/DataManagement.tsx) · [AppDataContext.tsx](../../src/context/AppDataContext.tsx) · [AuthContext.tsx](../../src/context/AuthContext.tsx) · [types.ts](../../src/lib/types.ts) |
| **Stato** | Approvato — riferimento vincolante per il coding plan del Blocco 7 e per P35 in poi |

> **Questo documento è vincolante per tutti i design operativi successivi (P35 in poi).
> Le decisioni qui contenute sono già state validate e non vengono rimesse in discussione:
> i design successivi possono solo dettagliarne l'implementazione, non cambiarne la sostanza.**

---

## §2 — Contesto

### Stato attuale di `DataManagement.tsx`

[`DataManagement.tsx`](../../src/components/DataManagement.tsx) è il componente che oggi
gestisce il backup e il ripristino dei dati dell'applicazione. La sua implementazione si basa
interamente su due API del runtime **Spark** (KV store proprietario GitHub Spark):

- **Export**: chiama `window.spark.kv.keys()` per ottenere la lista di tutte le chiavi
  presenti nel KV, poi itera sulle chiavi con `window.spark.kv.get(key)` per leggere
  ogni valore e costruire un oggetto `Record<string, unknown>`. L'oggetto viene serializzato
  in JSON e scaricato come file `zecchino-backup-YYYY-MM-DD.json`. Non c'è selezione
  delle chiavi: vengono esportate **tutte** le chiavi presenti nel KV, incluse quelle
  di sistema Spark e quelle già migrate nei blocchi precedenti.

- **Import**: legge un file JSON selezionato dall'utente, lo deserializza, poi itera su
  ogni coppia chiave-valore con `window.spark.kv.set(key, value)`. Anche qui non c'è
  filtro: vengono scritte **tutte** le coppie presenti nel file, indiscriminatamente.
  Al termine, l'applicazione viene ricaricata tramite `window.location.reload()`.

Il componente non usa `useKV` da `@github/spark/hooks`, né alcun hook React di persistenza.
Usa direttamente le API `window.spark.kv.*` (quattro accessi diretti: `keys()`, `get()`,
`set()` ripetuto per ciascuna chiave). Non ha accesso ad `AppDataContext` né ai repository
di P26: legge e scrive i dati esclusivamente attraverso il KV Spark.

Il componente gestisce dialog di conferma con `AlertDialog` per entrambe le operazioni,
feedback via `toast` e annunci per screen reader tramite `useScreenReader()`, e suoni di
sistema via `soundSystem`. Questi meccanismi di presentazione sono invariati rispetto alla
migrazione: P34 non li tocca.

### R7 di P24 §7: perché questo stato è un rischio

[P24 §7](./P24-architettura-migrazione-supabase.md) classifica `DataManagement.tsx` come
**Rischio R7** dell'intera migrazione: «`DataManagement` export/import oggi cicla su
`window.spark.kv.keys()`. Romperà il backup esistente.» Il rischio è duplice.

Primo: dopo la migrazione, i dati di dominio non saranno più nel KV Spark ma su Supabase.
Un export che legge da `window.spark.kv.keys()` produrrà un file vuoto o parziale per
gli utenti che hanno già completato la migrazione a Supabase — il backup non includerà
conti, transazioni, budget e obiettivi di risparmio.

Secondo: un import che scrive su `window.spark.kv.set()` non avrà alcun effetto sul
backend Supabase — le coppie chiave-valore verranno scritte nel KV locale Spark, non
nelle tabelle PostgreSQL. Il ripristino risulterà silenziosamente non funzionante.

### Perché P34 è necessario ora

P34 è l'ultimo tassello di Blocco 7 di P24 §6. Tutti i prerequisiti sono soddisfatti:

- **Blocco 4 (P28)** ha ridisegnato `AppDataContext`: la superficie pubblica definitiva
  include `accounts`, `transactions`, `budgets`, `savingsGoals` con le azioni `add*`,
  `update*`, `remove*` e `refreshAll()`. I repository di P26 sono l'unica interfaccia
  verso Supabase.
- **Blocco 5 (P29/P31)** ha completato la migrazione delle preferenze UI, audio e
  accessibilità verso `impostazioni_utente`. Le chiavi `display-*`, `sr-*`, `audio-*`,
  `talkback-*` e `visible-categories` non devono essere toccate da P34.
- **Blocco 6b di P33** (Decisione B) ha già progettato la migrazione one-shot delle
  categorie personalizzate in `AppDataContext`, con il flag `legacy_categories_migrated`
  in `impostazioni_utente.preferences`. P34 esclude la chiave `categories` dal proprio
  perimetro di migrazione.
- **P32** ha completato la migrazione di `private-pin-hash` verso `impostazioni_utente.pin_privato_hash`.
  P34 esclude questa chiave.

### Cosa rimane da gestire in P34 vs cosa è già migrato

Dopo P33, le uniche chiavi KV Spark che non sono state migrate nei blocchi precedenti
e che contengono **dati di dominio dell'utente** sono:

| Chiave KV Spark | Entità | Stato |
|---|---|---|
| `accounts` | Conti bancari e contanti | **Perimetro P34** |
| `transactions` | Movimenti finanziari | **Perimetro P34** |
| `budgets` | Budget definiti dall'utente | **Perimetro P34** |
| `savings-goals` | Obiettivi di risparmio | **Perimetro P34** |

Tutte le altre chiavi KV sono già gestite da documenti precedenti e **vanno escluse** da P34.
Le esclusioni complete sono documentate al §9.

---

## §3 — File coinvolti e loro trasformazione

### 3.1 `src/components/DataManagement.tsx`

**Stato attuale (post-P33)**

Il componente ha due funzioni principali: `handleExportData` e `handleImportData`.
Entrambe usano `window.spark.kv.*` come descritto in §2. Il componente non importa
`useAppData()`, `useAuth()` né nessun repository da `src/lib/supabase/`. Non ha
dipendenza da `@github/spark/hooks` (non usa `useKV`), ma ha quattro accessi diretti
alle API globali `window.spark.kv.*`.

**Stato dopo P34**

Il componente viene ridisegnato su tre responsabilità distinte, coordinate in sequenza
al monte dell'applicazione:

1. **Rilevamento e migrazione one-shot (Fronte A)**: al mount del componente (o all'apertura
   della schermata di gestione dati), se il flag `legacy_domain_migrated` in
   `impostazioni_utente.preferences` non è `true` e il KV Spark contiene dati di dominio
   non ancora migrati, il componente mostra un pannello dedicato «Importa dati storici
   da Spark» e guida l'utente attraverso la migrazione one-shot. Il pannello non è
   visibile agli utenti che hanno già completato la migrazione.

2. **Export verso file JSON (Fronte B)**: legge i dati dall'array in memoria disponibile
   tramite `useAppData()` (già caricati da Supabase al login) e produce un file JSON
   con le 4 entità di dominio in formato documentato. Non accede a `window.spark.kv.*`
   né chiama direttamente i repository.

3. **Import da file JSON (Fronte B)**: legge un file JSON precedentemente esportato da
   Zecchino (post-P34), ricostruisce le entità nell'ordine corretto rispetto ai vincoli
   referenziali (descritto al §4), scrive tramite i repository di P26. Non accede a
   `window.spark.kv.*`.

**Cosa eliminato:**
- Chiamata a `window.spark.kv.keys()` in `handleExportData`
- Iterazione su `window.spark.kv.get(key)` per ogni chiave
- Iterazione su `window.spark.kv.set(key, value)` in `handleImportData`
- Reload automatico con `window.location.reload()` post-import (il context si aggiorna
  tramite `refreshAll()` di P28 §4 senza ricaricare la pagina)
- Export indiscriminato di tutte le chiavi KV (incluse quelle di sistema Spark e di
  preferenze già migrate)

**Cosa aggiunto:**
- Lettura di `{ accounts, transactions, budgets, savingsGoals, isDataReady }` da
  `useAppData()` per la funzione di export
- Import e chiamata di `user.id` da `useAuth()` per associare le richieste Supabase
  alla sessione corrente
- Chiamate ai repository `conti`, `transazioni`, `budget`, `obiettivi_risparmio`
  (P26 §7.1–§7.5) per la funzione di import
- Lettura delle preferenze utente per il flag `legacy_domain_migrated`
  tramite `useUserSettings()` (P29) — già in memoria al mount del componente,
  senza necessità di una chiamata diretta al repository `impostazioni-utente`.
  La scrittura del flag a migrazione completata avviene invece tramite il
  metodo `updatePreference()` del repository `impostazioni-utente` (P26 §7.6),
  come descritto in §7 Fase 4.
- Pannello di migrazione one-shot condizionale (visibile solo se `legacy_domain_migrated`
  non è `true` e il KV Spark contiene le chiavi di dominio)
- Report accumulato degli errori di import (Decisione A — §5)

### 3.2 Nota sui repository Supabase

I file `src/lib/supabase/repositories/conti.ts`, `transazioni.ts`, `budget.ts` e
`obiettivi_risparmio.ts` sono progettati da P26 ma non ancora implementati. I metodi
esposti da ciascun repository sono documentati in P26 §7.1–§7.5. P34 utilizza:
`getAll()`, `create()`, `getById()` (per la deduplicazione). Non richiede modifiche ai
contratti di P26 — eventuali lacune rispetto all'ID-preservation e all'upsert semantics
sono documentate come punti aperti al §11.

### 3.3 `src/context/AppDataContext.tsx`

**Stato dopo P34**

Nessuna modifica strutturale. La superficie pubblica definita in P28 §4 è già sufficiente:
`accounts`, `transactions`, `budgets`, `savingsGoals`, `isDataReady`, `refreshAll()`.
P34 certifica che nessuna aggiunta alla superficie pubblica di `AppDataContext` è necessaria
per supportare l'export: i dati sono già in memoria al momento in cui il componente viene
montato nell'uso normale.

**Eliminato:** Nulla da `AppDataContext` in P34.

**Aggiunto:** Nulla da `AppDataContext` in P34.

---

## §4 — Ordine di migrazione delle entità (Fronte A)

Le 4 entità gestite da P34 hanno dipendenze tramite Foreign Key (FK — vincolo referenziale di
integrità tra tabelle) che impongono un ordine di inserimento preciso su Supabase. In PostgreSQL
con RLS (Row Level Security — politica di accesso per riga) attiva, un `INSERT` su
`transazioni` con un `conto_id` che non esiste nella tabella `conti` produce un errore FK e
l'operazione viene rifiutata dal database.

La tabella seguente descrive il grafo delle dipendenze e l'ordine di inserimento risultante.

| Ordine | Entità | Tabella Supabase | Dipendenze FK verso tabelle P34 | Dipendenze FK verso tabelle già migrate | Note |
|---|---|---|---|---|---|
| 1 | Conti | `conti` | Nessuna | Nessuna | Nessuna FK verso altre entità di dominio P34. Da inserire per primi. |
| 2 | Budget | `budget` | `conti.id` (nullable, campo `conto_id`) | `categorie.id` (nullable, campo `categoria_id`) — già migrato da P33 | FK opzionali: un budget senza conto o categoria associata è valido. Ma se il campo è valorizzato, il conto referenziato deve già esistere. |
| 3 | Obiettivi di risparmio | `obiettivi_risparmio` | `conti.id` (nullable, campo `conto_associato`) | Nessuna | FK opzionale: un obiettivo senza conto associato è valido. |
| 4 | Transazioni | `transazioni` | `conti.id` (obbligatorio, campo `conto_id`); `conti.id` (nullable, campo `conto_destinazione_id` per i trasferimenti) | `categorie.id` (nullable, campo `categoria_id`) — già migrato da P33 | FK obbligatorio su `conto_id`: ogni transazione deve avere un conto valido. Le categorie sono già su Supabase da P33: nessun ordine aggiuntivo richiesto per questo FK. |

### Motivazione dell'ordine

L'ordine obbligatorio è imposto dal vincolo referenziale su `transazioni.conto_id`: ogni
riga di `transazioni` deve referenziare un conto esistente nella tabella `conti`. Poiché la
FK è dichiarata `NOT NULL`, l'inserimento di una transazione prima del suo conto di riferimento
produce un errore di violazione FK (`23503` in PostgreSQL).

Le categorie (referenziate da `transazioni.categoria_id` e `budget.categoria_id`) sono già
su Supabase perché P33 Decisione B le ha migrate automaticamente al primo login in
`AppDataContext`. Pertanto non richiedono una fase di inserimento separata in P34.

Budget e obiettivi di risparmio hanno dipendenze FK opzionali verso `conti` e vengono
inseriti dopo i conti ma prima delle transazioni — non per obbligo di schema (le FK sono
nullable), ma per coerenza logica: se il campo `conto_id` del budget è valorizzato nei
dati Spark, il conto referenziato deve essere già presente su Supabase al momento
dell'inserimento del budget. Non c'è dipendenza FK tra budget e transazioni, quindi
il loro ordine relativo (passi 2 e 3) è intercambiabile.

---

## §5 — Decisione A: atomicità della migrazione one-shot

### Il punto aperto

P24 §6 Blocco 7 identifica esplicitamente come punto aperto: «Transazione atomica vs
best-effort». La scelta impatta direttamente l'esperienza utente in caso di interruzione
di rete durante la migrazione e il rischio di dati parzialmente migrati.

### Opzione 1 — Migrazione best-effort (continua sugli errori, accumula il report)

Il processo di migrazione tenta di inserire ogni entità in ordine (§4). Se l'inserimento
di una singola entità fallisce (errore di rete, errore RLS, errore FK), il fallimento viene
registrato in un report accumulato ma il processo prosegue con le entità successive. Al termine,
viene presentato all'utente un report che elenca: quante entità sono state migrate con successo
e quanti fallimenti si sono verificati, con i messaggi di errore per ogni fallimento.

In caso di interruzione parziale, alcune entità sono già su Supabase e altre no. Al secondo
tentativo di migrazione (se l'utente può riavviare), il meccanismo deve evitare di inserire
duplicati per le entità già migrate. Questo richiede un controllo di esistenza prima di
ogni `create()`.

### Opzione 2 — Migrazione atomica (tutto o niente)

Se qualsiasi inserimento fallisce durante la migrazione, tutte le entità già inserite nella
stessa sessione vengono cancellate tramite operazioni di rimozione compensatorie. Al termine
dell'annullamento, il DB è nello stato precedente all'avvio della migrazione. L'utente
riceve un messaggio di errore e può ritentare la migrazione nella sua interezza.

### Analisi comparativa

| Dimensione | Opzione 1 — Best-effort | Opzione 2 — Atomica |
|---|---|---|
| **Coerenza dei dati in caso di errore parziale** | **Rischio di stato parziale**: se i conti sono stati inseriti ma le transazioni falliscono, i conti esistono su Supabase senza le transazioni corrispondenti. Al secondo tentativo, i conti non devono essere duplicati. | **Piena coerenza**: o tutti i dati sono migrati o nessuno. Nessuno stato intermedio. |
| **Esperienza utente in caso di interruzione di rete** | Migrazione interrotta a metà: entità già inserite rimangono su Supabase. L'utente vede un report parziale e può completare la migrazione al secondo tentativo (con logica di resume). | Migrazione fallita: l'utente deve ripetere l'intera operazione. Se il problema di rete era temporaneo, il retry funziona senza perdita di dati. |
| **Complessità di implementazione** | Media: richiede accumulatore di errori, report finale, e meccanismo di check-esistenza pre-insert per evitare duplicati al retry. | Alta: non esiste transazione cross-tabella nel client Supabase JS. L'atomicità deve essere simulata tramite operazioni compensatorie (delete di ogni record creato in caso di fallimento). Rischio di loop in caso di errore durante il rollback stesso. |
| **Coerenza con P26 Decisione A** | **Alta**: P26 Decisione A sceglie il pattern "throw al chiamante" per gli errori di repository. Il chiamante (DataManagement) accumula gli errori e li presenta all'utente — esattamente il pattern best-effort. | **Media**: richiede un coordinamento complesso tra più repository, non previsto né supportato dalla struttura di P26. I repository espongono operazioni singole, non transazioni multi-tabella. |
| **Coerenza con P28 §9** | **Alta**: P28 §9 definisce la gestione errori parziali in `AppDataContext` come «modalità degradata con i dati disponibili». Il best-effort è la filosofia già adottata per la gestione degli errori nell'app. | **Bassa**: P28 §9 non prevede meccanismi di rollback multi-entità. Implementarli in DataManagement senza un layer transazionale nativo sarebbe incoerente con il pattern. |
| **Rischio di stato parziale persistente** | Presente ma gestibile: il flag `legacy_domain_migrated` viene impostato a `true` solo al termine di una migrazione completamente riuscita (zero errori). Se ci sono errori, il flag rimane `false`, il pannello di migrazione rimane visibile, e l'utente può riprovare. | Assente: il flag viene impostato solo dopo il completamento atomico. |

### Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Migrazione best-effort con report accumulato.**

Il fattore determinante è l'assenza di un layer transazionale cross-tabella nel client
Supabase JS. Il client Supabase non espone transazioni BEGIN/COMMIT/ROLLBACK utilizzabili
dal codice applicativo React su più repository indipendenti. Simulare l'atomicità tramite
operazioni compensatorie (eliminare ogni record inserito in caso di fallimento) introduce
una complessità non proporzionale al vantaggio: il rollback stesso potrebbe fallire per
gli stessi motivi di rete che hanno causato il fallimento originale, lasciando comunque
uno stato parziale.

La strategia best-effort è coerente con P26 Decisione A (throw al chiamante) e con P28 §9
(modalità degradata con i dati disponibili). Il flag `legacy_domain_migrated` garantisce
che la migrazione sia rieseguibile: viene impostato a `true` **solo** quando tutte le
entità sono state inserite senza errori. In caso di errori parziali, il flag rimane `false`
e il pannello di migrazione rimane visibile con il report degli errori, permettendo all'utente
di riprovare una volta risolta la causa del fallimento (es. ripristino della connessione).

La logica di check-esistenza pre-insert per evitare duplicati al retry è un requisito
implementativo documentato al §11.

---

## §6 — Decisione B: gestione collisioni di ID sull'import ripetuto

### Il punto aperto

P24 §6 Blocco 7 identifica esplicitamente come punto aperto: «Gestione collisioni di `id`
se l'utente ri-importa». Il problema si pone sia per la migrazione one-shot (Fronte A) sia
per l'import di un file JSON precedentemente esportato da Zecchino (Fronte B): se l'utente
lancia l'operazione due volte, il sistema deve decidere cosa fare con le entità il cui ID
è già presente su Supabase.

### Contesto tecnico: come sono generati gli ID

Nei dati Spark KV, gli ID delle entità sono stringhe generate da `generateId()` in
`src/lib/helpers.ts` (UUID lato client). Nei dati esportati da Supabase (Fronte B post-P34),
gli ID sono UUID generati dal database al momento dell'inserimento. In entrambi i casi,
gli ID sono stringhe UUID standard e presumibilmente stabili per la stessa entità.

I repository di P26 espongono `create(data)` con input `Omit<Entità, 'id'>`: l'ID è
**sempre generato dal database** e non può essere fornito dal chiamante tramite l'interfaccia
corrente. Questa è una limitazione rilevante discussa al §11. Per l'analisi della Decisione B,
si assume che il coding plan del Blocco 7 risolverà la questione dell'ID-preservation
(o che il processo userà un approccio di remapping — vedi §11).

### Opzione 1 — Upsert semantico: crea se non esiste, aggiorna se esiste

Per ogni entità da importare, il processo verifica prima se un record con lo stesso ID
(o con la stessa combinazione di chiave naturale — nome + tipo per i conti, nome + data
per le transazioni) esiste già su Supabase tramite `getById(id)`. Se esiste, il record
viene aggiornato con i dati del file JSON tramite `update(id, data)`. Se non esiste,
viene creato tramite `create(data)`.

### Opzione 2 — Import bloccato con errore se esistono collisioni

Prima di iniziare l'import, il processo controlla l'esistenza di almeno una collisione
(tramite `getById` su un campione di IDs). Se viene rilevata anche una sola collisione,
l'intero import viene bloccato con un messaggio di errore esplicito che indica all'utente
di svuotare prima i dati esistenti o di scegliere un file di import diverso.

### Analisi comparativa

| Dimensione | Opzione 1 — Upsert semantico | Opzione 2 — Blocco con errore |
|---|---|---|
| **Esperienza utente su import ripetuto accidentale** | **Fluida**: l'import è idempotente. Importare due volte lo stesso file non crea duplicati e non mostra errori se i dati sono gli stessi. | **Bloccante**: l'utente deve prima identificare e risolvere le collisioni, oppure svuotare i dati esistenti. Inaccettabile per l'operatività quotidiana. |
| **Rischio di sovrascrittura indesiderata** | Presente: se l'utente importa un file più vecchio del backup attuale, i dati correnti vengono sovrascritti con dati obsoleti per le entità in collisione. | Assente per definizione: se ci sono dati, l'import è bloccato. |
| **Complessità di implementazione** | Media: richiede una chiamata a `getById(id)` per ogni entità prima di decidere se `create()` o `update()`. Può essere ottimizzata con un batch di `getById()` iniziale. | Bassa: è sufficiente un check di esistenza su un campione (o su tutti) gli ID prima di avviare l'import. |
| **Coerenza con P26** | **Alta**: i metodi `getById()`, `create()`, `update()` sono tutti disponibili nei repository di P26 §7.1–§7.5. Il pattern upsert è implementabile senza modificare il contratto di P26. | Alta: `getById()` è disponibile per il check iniziale. |
| **Chiarezza del messaggio all'utente** | L'utente non vede nulla di anomalo se l'import procede senza conflitti dati. In caso di aggiornamento effettivo, il report finale può indicare «N entità aggiornate, M create». | L'utente riceve un messaggio di errore anche quando avrebbe voluto semplicemente aggiornare i dati con un backup più recente. |

### Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Upsert semantico (crea se non esiste, aggiorna se esiste).**

L'upsert è il pattern che rende l'import idempotente, cioè ripetibile senza effetti
indesiderati. Questa proprietà è essenziale per uno strumento di backup: l'utente deve
poter eseguire un import anche per aggiornare dati esistenti con quelli di un backup
più completo, senza essere bloccato da un errore per la sola esistenza di dati preesistenti.

L'Opzione 2 è troppo restrittiva per un flusso di backup/ripristino: bloccare l'import
perché esistono dati equivale a rendere inutilizzabile lo strumento nella maggior parte
degli scenari di ripristino reali (dove l'utente ha già dati parziali e vuole integrare
quelli del backup).

Il rischio di sovrascrittura indesiderata è mitigato dal dialog di conferma pre-import
che deve indicare esplicitamente «Questa operazione può aggiornare i dati esistenti con
quelli del file di backup» — fornendo all'utente le informazioni necessarie per una scelta
consapevole. Il report finale mostra le quantità di entità create e aggiornate, rendendo
l'operazione trasparente.

La dipendenza dalla mancanza di un metodo `createWithId()` nei repository di P26 è un punto
aperto documentato al §11: la Decisione B presuppone che il coding plan del Blocco 7 risolva
la questione dell'ID-preservation o dell'ID-remapping prima dell'implementazione.

**Dipendenza critica con PA-1 (Fronte A):**
Il meccanismo di upsert semantico descritto in questa sezione si comporta
in modo diverso a seconda del fronte di applicazione.

Per il **Fronte B** (import di un file JSON esportato da Zecchino post-P34),
il meccanismo funziona immediatamente: gli ID presenti nel file JSON sono UUID
generati da Supabase al momento dell'inserimento originale, quindi `getById(id)`
li trova correttamente e decide se creare o aggiornare.

Per il **Fronte A** (migrazione one-shot Spark → Supabase), il meccanismo è
**condizionato alla risoluzione di PA-1**. Il motivo è strutturale: i repository
di P26 generano sempre un nuovo UUID lato database tramite `gen_random_uuid()`.
L'ID originale dell'entità nel KV Spark (generato da `generateId()` lato client)
non viene preservato. Di conseguenza, al retry di una migrazione parzialmente
interrotta, `getById(sparkId)` cerca su Supabase un UUID che non esiste — e
il processo creerebbe un duplicato invece di aggiornare il record già inserito.

**Il coding plan del Blocco 7 deve risolvere PA-1 prima di implementare la
logica di upsert per il Fronte A.** Fino a quel momento, il Fronte A non è
implementabile in modo sicuro rispetto ai retry con deduplicazione corretta.

---

## §7 — Flusso Fronte A: migrazione one-shot Spark → Supabase

Di seguito la specifica funzionale completa del ciclo di vita della migrazione one-shot.
Non contiene codice: è la specifica vincolante per il coding plan del Blocco 7.

### Precondizioni al momento dell'apertura di `DataManagement.tsx`

Il componente è accessibile all'utente solo quando `isDataReady = true` in `AppDataContext`
(P28 §8 punto 5) e `isAuthenticated = true` in `AuthContext` (P27). Alla mount, il componente
legge il flag `legacy_domain_migrated` dal record `UserSettings` disponibile in memoria tramite
`useUserSettings()` (P29). Questo accesso è sincrono: le impostazioni sono già in memoria al
momento del mount, non richiedono una nuova chiamata a Supabase.

### Rilevamento della necessità di migrazione

La migrazione one-shot si attiva se e solo se **entrambe** le condizioni seguenti sono vere:

1. Il flag `legacy_domain_migrated` in `impostazioni_utente.preferences` è `false`,
   `undefined` o assente (il record esiste ma la chiave non è stata ancora impostata).
2. Il runtime Spark è accessibile (`window.spark` non è `undefined`) e almeno una delle
   quattro chiavi di dominio (`accounts`, `transactions`, `budgets`, `savings-goals`) è
   presente e non vuota nel KV Spark.

Se solo la condizione 1 è vera ma il KV Spark non è accessibile o non contiene chiavi di
dominio, il processo imposta direttamente `legacy_domain_migrated = true` in
`impostazioni_utente.preferences` (tramite `impostazioni-utente.updatePreference()` di P26
§7.6) senza eseguire nessuna migrazione. Questo caso corrisponde a un utente che ha creato
il proprio account dopo la distribuzione del Blocco 7 e non ha mai avuto dati Spark.

Se il flag è già `true`, il pannello di migrazione one-shot non viene mostrato.

### Coordinamento con il flag `legacy_categories_migrated` di P33 Decisione B

P33 Decisione B ha introdotto il flag `legacy_categories_migrated` in `preferences JSONB`
per la migrazione automatica delle categorie personalizzate. P34 introduce in modo analogo
il flag `legacy_domain_migrated` per le 4 entità di dominio rimanenti. I due flag sono
indipendenti: `legacy_domain_migrated` riguarda esclusivamente `accounts`, `transactions`,
`budgets` e `savings-goals`. `DataManagement.tsx` non deve leggere né scrivere
`legacy_categories_migrated`: quel flag è di competenza esclusiva di `AppDataContext` (P33).

### Interazione con l'utente prima dell'avvio

Quando le due condizioni di rilevamento sono vere, il componente mostra un pannello
informativo all'interno della schermata di gestione dati. Il pannello comunica:
che sono stati rilevati dati storici nel formato precedente (Spark), che è disponibile
una procedura di importazione one-shot per trasferirli su Supabase, e che questa operazione
è facoltativa ma consigliata. Un pulsante «Avvia importazione storica» avvia il processo.
Un pulsante secondario «Salta per ora» permette di rinviare la migrazione a una sessione
successiva senza impostare il flag (così il pannello riappare al login successivo).
Un annuncio screen reader descrive la disponibilità dell'operazione.

### Fasi del processo di migrazione one-shot

**Fase 1 — Lettura e preparazione dei dati Spark**

Il processo legge le quattro chiavi dal KV Spark (`accounts`, `transactions`, `budgets`,
`savings-goals`) e deserializza i valori nei rispettivi tipi TypeScript (`Account[]`,
`Transaction[]`, `Budget[]`, `SavingsGoal[]`). I dati vengono validati strutturalmente
(array, campi obbligatori presenti) prima dell'inserimento. Eventuali entità con struttura
non valida vengono aggiunte al report di errore senza interrompere il processo.

**Fase 2 — Inserimento nell'ordine FK corretto**

Le entità vengono inserite nell'ordine definito al §4: prima i conti, poi i budget, poi
gli obiettivi di risparmio, infine le transazioni. Per ogni entità:

- Il processo verifica se un record con l'identificatore corrispondente esiste già su
  Supabase (Decisione B — upsert semantico). Se esiste, viene aggiornato; se non esiste,
  viene creato tramite i repository di P26.
  **Nota di dipendenza (PA-1):** questa verifica presuppone che l'ID dell'entità
  Spark sia confrontabile con un ID già presente su Supabase. Poiché i repository
  di P26 generano nuovi UUID al momento dell'inserimento, i record creati nella
  migrazione avranno UUID diversi dagli ID originali Spark. Il meccanismo di
  check-esistenza e upsert per questa fase deve essere implementato con la strategia
  di remapping o di estensione definita nella risoluzione di PA-1 (§11). Il coding
  plan del Blocco 7 deve esplicitare quale approccio adotta prima di implementare
  questa fase.
- Il campo `cifrato` delle transazioni viene **omesso dal payload di creazione e aggiornamento**
  (P24 §4.4 e P25): è un campo derivato popolato dal trigger database `trg_sync_cifrato`.
  Il valore eventualmente presente nell'oggetto Spark viene scartato senza errore.
- Gli errori di singola entità vengono accumulati nel report e non interrompono il processo
  (Decisione A — best-effort).

**Fase 3 — Feedback visivo durante il processo**

Durante la migrazione, il componente mostra un indicatore di avanzamento che descrive la
fase corrente (es. «Importazione conti: 3 di 5», «Importazione transazioni: 47 di 120»).
L'indicatore è accessibile via screen reader tramite aggiornamenti di una live region con
aria-live="polite" per i progressi intermedi e aria-live="assertive" per il completamento
finale e per gli errori bloccanti.

**Fase 4 — Completamento e impostazione del flag**

Al termine dell'inserimento di tutte le entità, il processo determina il risultato:

- **Successo completo** (nessun errore): il flag `legacy_domain_migrated` viene impostato
  a `true` in `impostazioni_utente.preferences` tramite `impostazioni-utente.updatePreference()`.
  Il pannello di migrazione scompare. Viene mostrato un toast di successo con il conteggio
  delle entità migrate. L'utente vede immediatamente i propri dati nell'app grazie a
  `refreshAll()` di P28 §4 che aggiorna `AppDataContext`.
- **Successo parziale** (uno o più errori): il flag **non** viene impostato (rimane `false`).
  Il pannello mostra il report degli errori con le entità non migrate. L'utente può
  correggere la causa (es. ripristino della connessione) e riavviare la migrazione.
  Il conteggio delle entità già migrate è visibile nel report.
- **Fallimento totale** (nessuna entità inserita): il flag non viene impostato. Il pannello
  mostra il messaggio di errore principale e un pulsante per riprovare.

**Interruzione a metà processo**

Se la migrazione viene interrotta (es. chiusura della scheda, perdita di connessione,
logout per timeout di sessione), il flag `legacy_domain_migrated` rimane `false`. Al login
successivo, il pannello di migrazione riappare. Poiché si usa l'upsert semantico (Decisione B),
le entità già migrate non vengono duplicate: il processo riprende dalle entità non ancora
inserite, rieseguendo il check di esistenza per le entità già inserite e aggiornandole
se necessario.

---

## §8 — Flusso Fronte B: export/import Supabase

### 8.1 Export: produzione del file JSON di backup

**Fonte dei dati**

I dati vengono letti dai quattro array in memoria esposti da `AppDataContext` tramite
`useAppData()`: `accounts`, `transactions`, `budgets`, `savingsGoals`. La precondizione
è che `isDataReady = true`: il componente è accessibile all'utente solo quando questa
condizione è soddisfatta (gate in App.tsx — P28 §8 punto 5). I dati in memoria sono
coerenti con lo stato corrente su Supabase grazie al caricamento iniziale post-login
e alle scritture sincronizzate tramite repository.

La scelta di usare i dati in memoria da `AppDataContext` piuttosto che chiamate dirette
ai repository è coerente con il principio di separazione: `AppDataContext` è già il punto
di aggregazione dei dati di dominio. Chiamare direttamente i repository aggiungerebbe una
duplicazione della logica di caricamento senza benefici di freschezza aggiuntiva, dato che
i dati in memoria vengono aggiornati a ogni operazione di scrittura.

**Entità incluse nel file JSON**

| Entità inclusa | Campo JSON | Note |
|---|---|---|
| Conti | `accounts` | Array `Account[]` |
| Transazioni | `transactions` | Array `Transaction[]`. Il campo `cifrato` è incluso nel JSON (è parte del tipo `Transaction`) ma è un valore read-only derivato: al momento dell'import viene ignorato (§8.2). |
| Budget | `budgets` | Array `Budget[]` |
| Obiettivi di risparmio | `savingsGoals` | Array `SavingsGoal[]` |
| Metadati del file | `meta` | Oggetto con almeno: `schema_version` (stringa, es. `"1.0"`), `exported_at` (ISO 8601 timestamp), `app_version` (stringa) |

**Entità escluse dal file JSON**

| Entità esclusa | Motivo |
|---|---|
| Categorie (`categories`) | Già gestite da P33 Decisione B. Non sono nel perimetro di P34. |
| Impostazioni utente (`impostazioni_utente`) | Contengono dati sensibili (`pin_privato_hash`) e preferenze UI. Il loro backup/ripristino non è nel perimetro del flusso generale di backup dati finanziari. |
| Notifiche / `dismissed-budget-alerts` | Dati effimeri di stato UI: indicano quali alert di budget sono stati già visualizzati dall'utente. Non sono dati finanziari persistenti né fanno parte del patrimonio informativo dell'utente. Il loro ripristino da backup non ha valore pratico e potrebbe causare la ricomparsa di alert già letti. Gestite da P29 verso la tabella `notifiche`. |
| Dati di preferenze e accessibilità | Gestiti da P29/P31; non nel perimetro di P34. |

**Formato e nome file**

Il file prodotto è un JSON indentato (per leggibilità umana) con un campo radice `meta`
e quattro array corrispondenti alle quattro entità. Il nome del file segue il pattern
`zecchino-backup-YYYY-MM-DD.json`.

**Feedback all'utente**

Al termine dell'operazione, viene mostrato un toast di successo con il nome del file
scaricato e il numero totale di entità incluse nel backup. L'annuncio per screen reader
descrive il file scaricato e il suo contenuto sintetico.

### 8.2 Import: ripristino da file JSON

**Lettura e validazione preliminare del file**

Il componente legge il file JSON selezionato dall'utente, lo deserializza, e verifica la
presenza dei campi `meta`, `accounts`, `transactions`, `budgets`, `savingsGoals`. Se la
struttura di base non è valida (JSON non parsabile, campi mancanti), l'import viene
bloccato con un messaggio di errore esplicito prima di avviare qualsiasi operazione su
Supabase. Il campo `meta.schema_version` viene letto e, se presente, verificato rispetto
alla versione supportata: una versione incompatibile blocca l'import con un messaggio
che indica la versione attesa.

**Ordine di scrittura su Supabase**

L'ordine di inserimento segue esattamente la tabella al §4:
prima i conti, poi i budget, poi gli obiettivi di risparmio, infine le transazioni.
Questo ordine è identico a quello del Fronte A e per le stesse ragioni (vincoli FK).

**Gestione del campo `cifrato` nelle transazioni**

Il campo `cifrato` presente nel file JSON esportato (che ha tipo `boolean`) viene
**ignorato** in fase di import e non incluso nel payload di creazione o aggiornamento
tramite il repository `transazioni`. Il trigger database `trg_sync_cifrato` (P25 §4.4)
ricalcola il valore correttamente in base al campo `is_privato` del conto referenziato.

**Strategia upsert per la gestione delle collisioni**

Per ogni entità, si applica la Decisione B: il processo verifica l'esistenza tramite
`getById(id)` prima di decidere se creare o aggiornare. Se il record esiste già su Supabase
con lo stesso ID, viene aggiornato con i dati del file JSON tramite `update(id, data)`.
Se non esiste, viene creato tramite `create(data)`.

**Gestione degli errori**

Si applica la Decisione A (best-effort): gli errori di singola entità vengono accumulati
in un report senza interrompere il processo. Al termine, il report mostra il numero di
entità create, aggiornate e non processate (con errore), insieme ai messaggi specifici
per ogni fallimento.

**Aggiornamento del contesto dopo l'import**

Al termine dell'import (indipendentemente dal risultato parziale o completo), viene invocato
`refreshAll()` di P28 §4 per ricaricare tutti i dati da Supabase in `AppDataContext`. Questo
sostituisce il precedente `window.location.reload()` e non richiede il ricaricamento completo
della pagina. Il reload avviene anche in caso di errori parziali, in modo che i dati
effettivamente importati siano visibili immediatamente.

**Feedback all'utente**

Il dialog di conferma pre-import indica chiaramente che l'operazione può aggiornare o
creare dati. Un indicatore di avanzamento mostra la progressione per ogni entità (analogamente
al Fronte A). Il report finale è accessibile via screen reader con un annuncio su
aria-live="assertive".

---

## §9 — Chiavi KV escluse e coordinamento con blocchi precedenti

La tabella seguente elenca **tutte** le chiavi KV del runtime Spark che non sono nel perimetro
di P34, con il motivo dell'esclusione e il documento che ne governa la migrazione.

| Chiave Spark KV | Motivo dell'esclusione da P34 | Documento di riferimento |
|---|---|---|
| `categories` | Migrata da P33 Decisione B: migrazione one-shot automatica in `AppDataContext` al primo login post-distribuzione. Il flag `legacy_categories_migrated` in `preferences JSONB` previene duplicati. | [P33 §6](./P33-migrazione-categorymanagement-useappdata.md) |
| `private-pin-hash` | Migrata da P32: l'hash è ora in `impostazioni_utente.pin_privato_hash`. La sua presenza in un file JSON di export Spark non deve essere mai scritta tramite `updatePinHash()` nel flusso di import di P34. | [P32 §11](./P32-migrazione-pin-privato-supabase.md) |
| `global-pin-hash` | Eliminata: la chiave non ha una tabella Supabase corrispondente. L'autenticazione è gestita interamente da Supabase Auth (P27). Un file JSON di export Spark che include questa chiave deve ignorarla nel flusso di import di P34. | [P27](./P27-migrazione-authcontext-supabase.md) · [P24 §4.2](./P24-architettura-migrazione-supabase.md) |
| `display-show-balances` | Migrata da P31 verso `impostazioni_utente.preferences.display_show_balances`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `display-show-account-icons` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `display-compact-mode` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `display-show-categories` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `display-animations-enabled` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `display-font-size` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `display-currency-display` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `display-number-format` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `display-high-contrast` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `display-show-percentages` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `display-show-transaction-icons` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `display-reduce-motion` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.1](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `audio-enabled` | Migrata da P31 verso `impostazioni_utente.preferences.audio_enabled`. | [P31 §3.2](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `audio-volume` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.2](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-verbosity` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-announce-navigation` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-announce-filters` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-announce-form-changes` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-announce-shortcuts` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-announce-balance-changes` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-announce-budget-alerts` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-announce-progress` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-announce-focus-changes` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-announce-list-position` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-announce-delay` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-reduced-announcements` | Migrata da P31 verso `preferences JSONB`. | [P31 §3.3](./P31-migrazione-preferenze-display-audio-screenreader.md) |
| `visible-categories` | Migrata da P29 verso `impostazioni_utente.preferences.visible_categories`. | [P29](./P29-migrazione-usersettings-preferenze-ui.md) |
| `dismissed-budget-alerts` | Migrata da P29 verso la tabella `notifiche` (campo `letta`). | [P29](./P29-migrazione-usersettings-preferenze-ui.md) · [P24 §4.8](./P24-architettura-migrazione-supabase.md) |
| `budget-percentages` | Non migrata: resta `useState` client-side per sessione. Non ha una tabella Supabase corrispondente (cache di notifica per-sessione). | [P30](./P30-migrazione-budgetpercentages-usestate.md) · [P24 §4.7](./P24-architettura-migrazione-supabase.md) |

**Nota sulle chiavi `talkback-*`**: P31 menziona chiavi `talkback-*` nel perimetro della
migrazione preferenze. Queste chiavi non compaiono nell'inventario di P31 §3.1–§3.3 con
nomi specifici. Se presenti nel KV Spark, seguono la stessa logica delle chiavi `sr-*`
(migrate verso `preferences JSONB` da P31) e devono essere escluse dal perimetro di P34.

### Coordinamento con P33 Decisione B e il flag `legacy_categories_migrated`

P33 Decisione B introduce il flag `legacy_categories_migrated` in `impostazioni_utente.preferences`
per tracciare la migrazione automatica delle categorie personalizzate. Questo flag è di competenza
esclusiva di `AppDataContext`: viene impostato da quel contesto, non da `DataManagement.tsx`.

P34 introduce in modo analogo il flag `legacy_domain_migrated` (stessa colonna `preferences`,
chiave distinta). I due flag sono ortogonali: possono essere impostati indipendentemente l'uno
dall'altro. `DataManagement.tsx` deve leggere `legacy_categories_migrated` **in sola lettura**
(per coerenza informativa nel report, se lo si desidera), ma non deve mai scriverlo. La
responsabilità di impostare `legacy_categories_migrated` appartiene esclusivamente ad
`AppDataContext` (P33).

---

## §10 — Impatto sui blocchi successivi

| Blocco P24 | Dipendenza da P34 | Note |
|---|---|---|
| **Blocco 9 — Onboarding** | **Precondizione critica** per il Fronte A | La migrazione one-shot di P34 (Fronte A) include le transazioni che referenziano categorie tramite `categoria_id`. Per evitare errori FK, le categorie template devono essere già presenti in `categorie` al momento in cui P34 tenta di inserire le transazioni. La funzione `seed_default_categories(user_id)` del Blocco 9 è una precondizione per il corretto funzionamento del Fronte A. Se l'utente avvia la migrazione one-shot prima che il Blocco 9 abbia eseguito il seed delle categorie template, le transazioni con `categoria_id` non trovano la FK corrispondente. La logica di P34 deve verificare che il Blocco 9 sia completato (`OnboardingFlow` completato) prima di abilitare la migrazione one-shot, oppure le transazioni con `categoria_id` non valida devono essere gestite nel report di errore come entità da migrare manualmente. |
| **Blocco 10 — Decommissioning Spark** | **Impatto diretto sul perimetro** | Dopo P34, `DataManagement.tsx` è il solo file `src/` che ancora accede a `window.spark.kv.*` (per il Fronte A — rilevamento dati Spark storici). Questo accesso è necessario finché esiste la logica di migrazione one-shot. Il Blocco 10 può rimuovere questo accesso solo dopo aver garantito che tutti gli utenti abbiano completato la migrazione (flag `legacy_domain_migrated = true` per tutti gli account attivi) oppure dopo un periodo di grazia documentato. Il mock `window.spark.kv.*` in `src/test/setup.ts` rimane fino al Blocco 10, come già previsto per il mock di `useKV`. Il Blocco 10 non può procedere al decommissioning completo di Spark finché P34 non ha eliminato gli accessi a `window.spark.kv.*` dalla versione finale di `DataManagement.tsx`. |
| **Blocco 8 — PIN privato** | **Nessuna dipendenza diretta, nota di coordinamento** | Il file JSON esportato da Zecchino post-P34 non include `pin_privato_hash` (escluso dall'export — §8.1). Tuttavia, un file JSON di backup Spark importato nel Fronte A potrebbe contenere la chiave `private-pin-hash`. P34 deve filtrare esplicitamente questa chiave nell'elenco delle chiavi da processare nel Fronte A, delegandone la gestione a P32 che ha già definito il suo percorso di migrazione verso `impostazioni_utente`. |

---

## §11 — Punti aperti residui

### PA-1 — ID-preservation e remapping per il Fronte A

I repository di P26 espongono `create(data)` con input `Omit<Entità, 'id'>`: l'ID viene
sempre generato dal database PostgreSQL tramite `gen_random_uuid()`. Questo significa che
gli ID originali delle entità nel KV Spark (generati lato client da `generateId()` in
`src/lib/helpers.ts`) non possono essere preservati direttamente tramite il contratto
corrente di P26.

Il problema è rilevante per il Fronte A perché le transazioni referenziano i conti tramite
`contoId` e `contoDestinazioneId` con i valori ID originali del KV Spark. Se i conti
vengono inseriti su Supabase con nuovi UUID generati dal DB, le transazioni devono essere
aggiornate con i nuovi ID prima dell'inserimento.

**Due approcci possibili** (da valutare nel coding plan del Blocco 7):

- **Approccio A — Remapping in memoria**: costruire una mappa `{sparkId → supabaseId}` per
  i conti durante il loro inserimento, poi applicare la mappa ai campi FK di transazioni,
  budget e obiettivi prima di inserirli. Questo approccio non richiede modifiche a P26.
- **Approccio B — Estensione P26**: aggiungere un metodo `createWithId(id, data)` ai
  repository che accetta un UUID esterno. Richiede modifica al contratto di P26, da
  documentare come aggiornamento di P26 nel coding plan.

Il blocco 7 deve scegliere uno dei due approcci prima di avviare l'implementazione. Se si
sceglie l'Approccio A, il Fronte B (import/export Supabase) non è interessato perché gli
ID nel file JSON esportato da Supabase sono già UUID validi e il meccanismo upsert di Decisione
B può usare `update(id, data)` direttamente.

### PA-2 — Comportamento del flag sentinel quando il KV Spark non è accessibile

La logica di rilevamento della migrazione one-shot (§7) include il controllo dell'accessibilità
del runtime Spark (`window.spark` disponibile) e della presenza di chiavi di dominio nel KV.
Non è specificato cosa succede nei seguenti scenari:

- Il runtime Spark è disponibile ma restituisce un errore di rete all'accesso al KV (es.
  connessione al server Spark instabile).
- Il runtime Spark è disponibile ma `window.spark.kv.keys()` restituisce un array vuoto
  perché i dati sono stati già cancellati manualmente dall'utente.
- L'app viene aperta in un contesto dove `window.spark` non è definito (es. browser che
  blocca script di terze parti).

Il coding plan del Blocco 7 deve definire il comportamento per ciascuno di questi casi,
in particolare distinguere «KV accessibile ma vuoto» (nessuna migrazione necessaria →
impostare `legacy_domain_migrated = true` direttamente) da «KV non accessibile» (rimandare
la migrazione → non impostare il flag e mostrare un messaggio informativo).

### PA-3 — Versioning e schema del file JSON di export (campo `schema_version`)

La specifica del Fronte B al §8.1 prevede un campo `meta.schema_version` nel file JSON
prodotto. Il valore iniziale proposto è `"1.0"`, ma non è definita la policy di
versioning: quando incrementa la versione? Come si gestisce un import di un file con
versione incompatibile?

Il coding plan del Blocco 7 deve stabilire:
- il valore iniziale di `schema_version` per la versione P34 del formato
- la policy di compatibilità (versioni minori retrocompatibili, versioni maggiori no)
- il messaggio di errore preciso mostrato all'utente in caso di versione incompatibile
- se il formato include un campo `app_version` (opzionale, per debug) o solo `schema_version`

### PA-4 — Comportamento dell'import su account con dati Supabase già presenti

Il flusso del Fronte B (import di un file JSON Supabase) prevede l'upsert semantico di
Decisione B: crea se non esiste, aggiorna se esiste. Ma non è specificato cosa succede
quando l'account su Supabase contiene **più** dati del file JSON (es. l'utente ha creato
transazioni aggiuntive dopo l'export).

Le transazioni presenti su Supabase ma assenti nel file JSON non vengono eliminate (P34
non prevede operazioni di `remove()` durante l'import). Questo comportamento è implicito
ma non esplicitato nella specifica. Il coding plan del Blocco 7 deve documentare
chiaramente che l'import è **additivo/aggiornante**, non sostitutivo: le entità non
presenti nel file JSON rimangono intatte su Supabase.

### PA-5 — Rimozione del KV Spark locale dopo migrazione completata

Il §7 specifica che, dopo una migrazione one-shot riuscita, il flag `legacy_domain_migrated`
viene impostato a `true`. Non è specificato se i dati Spark originali (`accounts`, `transactions`,
`budgets`, `savings-goals` nel KV) devono essere cancellati dal KV dopo la migrazione.

La pulizia del KV Spark potrebbe ridurre il rischio di confusione in futuro (es. l'utente
che ri-apre la migrazione one-shot su un account già migrato), ma richiede un'operazione
`window.spark.kv.delete(key)` per ogni chiave, il che aumenta il perimetro di interazione
con il runtime Spark. Il Blocco 10 (decommissioning) potrebbe essere il contesto più
appropriato per questa pulizia. Il coding plan del Blocco 7 deve dichiarare esplicitamente
se le chiavi vengono cancellate o lasciate nel KV dopo la migrazione.

### PA-6 — Precondizione Blocco 9: comportamento in assenza del seed categorie

§10 identifica che la funzione `seed_default_categories(user_id)` del Blocco 9
è una precondizione per il corretto funzionamento del Fronte A: le transazioni
con `categoria_id` valorizzato referenziano categorie che devono già esistere in
`categorie` su Supabase al momento dell'inserimento.

§10 propone due alternative senza scegliere:
1. Il Blocco 9 (Onboarding) è completato garantendo il seed prima che l'utente
   possa accedere a `DataManagement.tsx`.
2. Le transazioni con `categoria_id` non valido vengono gestite nel report di
   errore come entità da migrare manualmente dopo il completamento del Blocco 9.

Il coding plan del Blocco 7 deve scegliere una delle due alternative e
documentarla come decisione vincolante. La scelta ha impatto sull'ordine di
distribuzione dei blocchi: se si sceglie l'alternativa 1, il Blocco 9 deve
essere distribuito prima o contestualmente al Blocco 7. Se si sceglie
l'alternativa 2, il Fronte A può essere distribuito indipendentemente dal
Blocco 9, a costo di un'esperienza utente degradata per le transazioni con
categoria associata.

---

## §12 — Criteri di accettazione del documento

- [ ] Tutte le sezioni §1–§12 sono presenti e non vuote.
- [ ] §1 ha intestazione completa con tutti i campi obbligatori e il paragrafo blockquote
      vincolante «P35 in poi».
- [ ] §2 descrive lo stato attuale di `DataManagement.tsx` con riferimento esplicito a
      `window.spark.kv.keys()`, `window.spark.kv.get()`, `window.spark.kv.set()`,
      e classifica il Rischio R7 di P24 §7.
- [ ] §2 elenca le dipendenze dai blocchi completati (P28/P33 per Blocco 4, P29/P31 per
      Blocco 5) e identifica esplicitamente le chiavi nel perimetro P34 vs quelle già
      migrate.
- [ ] §3 copre `DataManagement.tsx` con: stato attuale, stato dopo P34, cosa eliminato,
      cosa aggiunto. Certifica che `AppDataContext` e i repository non richiedono modifiche.
- [ ] §4 ha la tabella completa dell'ordine FK con motivazione basata sui vincoli
      referenziali reali tra le tabelle Supabase.
- [ ] Decisione A (§5) ha **scelta definitiva in grassetto** (best-effort) con analisi
      comparativa su almeno 5 dimensioni e riferimento esplicito a P26 Decisione A e P28 §9.
- [ ] Decisione B (§6) ha **scelta definitiva in grassetto** (upsert semantico) con
      analisi comparativa su almeno 5 dimensioni.
- [ ] §7 descrive il flusso Fronte A completo: rilevamento, coordinamento con
      `legacy_categories_migrated`, interazione utente pre-avvio, le 4 fasi del processo
      (lettura, inserimento, feedback, completamento), comportamento in caso di interruzione.
- [ ] §7 include la specifica per il campo `cifrato` (omesso dal payload di inserimento).
- [ ] §8 descrive il flusso Fronte B completo per export (fonte dati, entità incluse/escluse,
      formato) e per import (validazione, ordine, `cifrato`, upsert, aggiornamento contesto).
- [ ] §9 ha tabella completa di tutte le chiavi KV escluse da P34 con documento di
      riferimento per ciascuna, incluse tutte le 12 chiavi `display-*`, 12 chiavi `sr-*`,
      2 chiavi `audio-*`, e la nota sui flag `legacy_*`.
- [ ] §10 copre Blocco 9 (seed categorie come precondizione), Blocco 10 (decommissioning:
      accesso a `window.spark.kv.*` rimane in `DataManagement.tsx` fino al Blocco 10),
      Blocco 8 (filtro chiave `private-pin-hash` nel Fronte A).
- [ ] §11 documenta almeno 5 punti aperti con riferimento al blocco o documento che dovrà
      risolverli.
- [ ] Nessun frammento TypeScript, JSX o SQL eseguibile in tutto il documento.
- [ ] Nessuna contraddizione con P24–P33 rilevata.
- [ ] Tutti i link a file `src/` usano path relativi (`../../src/...`).
- [ ] Tutti i link a docs/ usano path relativi (`./P24-....md`).

---

*Fine documento. Nessun file sorgente è stato modificato.*

*Messaggio di commit suggerito:*
`docs(design): creare P34 migrazione DataManagement a Supabase`
