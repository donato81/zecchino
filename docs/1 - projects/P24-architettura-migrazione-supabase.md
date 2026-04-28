# P24 — Architettura generale migrazione Spark → Supabase

## 1. Intestazione

| Campo | Valore |
|---|---|
| Pacchetto | P24 — Architettura migrazione Supabase |
| Tipo intervento | Documento di design (sola lettura) |
| Branch | `refactoring-architettura` |
| Data | 28 aprile 2026 |
| Autore | Agent-Design |
| File modificati | Nessuno (solo creazione di questo documento di design) |
| Documenti di riferimento | [docs/4 - reports/report-analisi-migrazione-supabase.md](../4%20-%20reports/report-analisi-migrazione-supabase.md), [src/context/AuthContext.tsx](../../src/context/AuthContext.tsx), [src/context/AppDataContext.tsx](../../src/context/AppDataContext.tsx), [src/lib/types.ts](../../src/lib/types.ts), [src/components/SecuritySettings.tsx](../../src/components/SecuritySettings.tsx), [src/components/CategoryManagement.tsx](../../src/components/CategoryManagement.tsx), [src/lib/sound-system.ts](../../src/lib/sound-system.ts) |
| Stato | Approvato — riferimento fondante per i design operativi P25+ |

Questo documento è **vincolante** per tutti i design operativi successivi
(P25 in poi). Le decisioni qui contenute sono già state validate e non
vengono rimesse in discussione: i design successivi possono solo dettagliarne
l'implementazione, non cambiarne la sostanza.

---

## 2. Contesto e motivazione

### Punto di partenza

Zecchino è una web app React per la gestione delle finanze personali.
Tutti i dati persistenti sono oggi salvati tramite il sistema proprietario
**GitHub Spark**, attraverso l'hook `useKV` e l'API globale
`window.spark.kv.*`. Lo storage Spark è un key-value sincronizzato lato
server, non relazionale, accoppiato a un runtime non controllabile.

### Perché si migra

Il bug **BUG-01** (instabilità della persistenza PIN globale, oggetto del
ciclo P23) è il **sintomo**, non la causa. La causa reale è strutturale:

- Il server Spark è instabile alla base e non correggibile dal team.
- Il modello key-value non si presta a un'app che deve gestire **relazioni**
  (transazioni → conti → categorie → budget) con vincoli di integrità.
- Spark non offre un modello di **multi-utente** o di **multi-dispositivo**:
  i dati sono legati al runtime Spark, non a un'identità utente verificabile.
- Spark non offre **Row Level Security**, **autenticazione gestita**,
  **cifratura at-rest documentata** o un **client offline** standardizzato.

### Cosa cambia per l'utente finale

| Area | Prima (Spark) | Dopo (Supabase) |
|---|---|---|
| Accesso | PIN locale a 4-6 cifre, salvato sul singolo runtime Spark | Email + password, account utente reale |
| Multi-dispositivo | Non supportato realmente | Login dallo stesso account su più dispositivi |
| Privacy intra-account | PIN privato locale + flag `cifrato` (mai usato davvero) | PIN privato sincronizzato cloud + RLS per utente |
| Sessione | Permanente fino a logout esplicito | Scade per inattività (default 5 minuti, configurabile), logout sempre disponibile |
| Onboarding | Categorie default inizializzate al volo lato client | Schermata guidata al primo login: nome, valuta, primo conto, copia categorie |
| Offline | Best-effort opaco di Spark | Sola lettura offline garantita (scrittura offline fuori scope) |

---

## 3. Fotografia dello stato attuale

### Numeri

- **45 chiamate `useKV`** nei sorgenti applicativi.
- **8 chiamate dirette `window.spark.kv.*`** (in `AuthContext`,
  `DataManagement`, `sound-system`).
- **31 chiavi distinte** suddivise in **3 famiglie**:
  1. **Dominio** (5 chiavi) — mappano 1:1 sulle 5 tabelle ereditate.
  2. **Preferenze UI/A11y/Audio** (24 chiavi) — confluiscono in
     `impostazioni_utente`.
  3. **Sicurezza** (2 chiavi) — `global-pin-hash`, `private-pin-hash`.

### Tabella riepilogativa chiave Spark → tabella Supabase

| Famiglia | Chiave Spark | Tabella Supabase |
|---|---|---|
| Dominio | `accounts` | `conti` |
| Dominio | `transactions` | `transazioni` |
| Dominio | `categories` | `categorie` |
| Dominio | `budgets` | `budget` |
| Dominio | `savings-goals` | `obiettivi_risparmio` |
| Sicurezza | `global-pin-hash` | **RIMOSSA** (Supabase Auth) |
| Sicurezza | `private-pin-hash` | `impostazioni_utente.pin_privato_hash` |
| Preferenza | `visible-categories` | `impostazioni_utente` (colonna o JSONB) |
| Preferenza | `dismissed-budget-alerts` | `notifiche` |
| Cache | `budget-percentages` | **NON migrata** — `useState` client-side |
| Preferenza | 12 chiavi `display-*` | `impostazioni_utente` |
| Preferenza | 12 chiavi `sr-*` | `impostazioni_utente` |
| Preferenza | 2 chiavi `audio-*` | `impostazioni_utente` |
| Preferenza | 2 chiavi `talkback-*` | `impostazioni_utente` |

### Problemi tecnici identificati nel report

- **Duplicazioni `useKV` (split-brain)**:
  - [src/components/CategoryManagement.tsx](../../src/components/CategoryManagement.tsx#L38)
    apre `useKV<Category[]>('categories', [])` parallelo al
    `AppDataContext`.
  - [src/components/SecuritySettings.tsx](../../src/components/SecuritySettings.tsx#L27-L28)
    apre `useKV` su entrambi gli hash PIN paralleli ad `AuthContext`.
  - [src/hooks/use-display-preferences.ts](../../src/hooks/use-display-preferences.ts)
    duplica le 12 chiavi `display-*` di
    [DisplaySettings.tsx](../../src/components/DisplaySettings.tsx).
- **Campo `cifrato` morto**: scritto in
  [TransactionDialog.tsx#L185](../../src/components/TransactionDialog.tsx)
  ma **mai letto** in nessun consumer. La filtratura privata avviene per
  `account.isPrivato`.
- **`budget-percentages`** è una cache di stato di notifica per evitare di
  rinotificare lo stesso superamento di soglia: è per-sessione/per-device,
  **non deve** finire su Supabase.
- **`sound-system.ts`** è un singleton non React: chiama
  `window.spark.kv.get/set` direttamente nel costruttore e nei setter.
  Non può usare hook React, richiede un'iniezione manuale del client
  Supabase.
- **`HapticSettings`** non usa `useKV`: stato gestito da `hapticSystem`
  (singleton). La sua persistenza esatta non è stata verificata e va
  chiarita prima di toccarlo.
- **Bootstrap race**: `AuthContext` aggira un bug Spark con una lettura
  diretta `window.spark.kv.get('global-pin-hash')` riga 52, prima che
  `useKV` si stabilizzi. Lo stesso pattern `isAuthReady` va replicato per
  Supabase.

---

## 4. Decisioni architetturali

### 4.1 Utenti e isolamento

- **Scelta**: ogni utente ha il proprio account separato. Nessuna
  condivisione di dati tra utenti.
- **Motivazione**: l'app è personale (finanze proprie). Multi-utente
  condiviso (es. budget familiari) è esplicitamente fuori scope.
- **Implementazione**: **Row Level Security attiva su tutte le 11 tabelle**
  con policy `auth.uid() = user_id`. Ogni tabella ha una colonna
  `user_id uuid not null references auth.users(id)`.
- **Eliminato**: nessun concetto di "tenant" applicativo, nessun filtro
  manuale `WHERE user_id = ...` lato client (lo fa RLS).
- **Reimplementato**: nulla — è regola di schema/policy, non di codice
  applicativo.

### 4.2 Autenticazione

- **Scelta**: login con **email + password** tramite Supabase Auth.
- **Motivazione**: è il metodo standard, autosufficiente, supportato
  dall'SDK senza componenti custom; il PIN locale non è mai stato vera
  autenticazione.
- **Sessione**: **non permanente**. Scade per inattività dopo un periodo
  configurabile dall'utente. **Default consigliato: 5 minuti.** Logout
  manuale sempre disponibile.
- **Bootstrap**: `supabase.auth.getSession()` al mount +
  `supabase.auth.onAuthStateChange()` per la reattività. Il pattern
  `isAuthReady` attuale va **replicato** per evitare il flash della
  schermata sbagliata: il provider non monta i figli finché la sessione
  iniziale non è stata risolta (anche se è `null`).
- **Eliminato**:
  - `global-pin-hash` (chiave KV).
  - `handleGlobalPinSubmit` e tutto il flusso di setup/verify PIN globale.
  - `isSetupMode` (Supabase Auth gestisce signup e login come flussi
    separati).
  - L'attuale [AuthScreen.tsx](../../src/components/AuthScreen.tsx) nella
    sua forma a PIN unico.
  - La sezione "Cambio PIN globale" di
    [SecuritySettings.tsx](../../src/components/SecuritySettings.tsx).
- **Reimplementato**:
  - `AuthContext` diventa un **thin wrapper su `supabase.auth`**. Superficie
    esposta: `user`, `session`, `signIn(email, password)`,
    `signUp(email, password)`, `signOut()`, `isAuthenticated`,
    `isAuthReady`.
  - Nuova `AuthScreen` con form email/password e link a signup.
  - Timer di inattività client-side che chiama `signOut()` allo scadere.
  - **Recovery password**: link "Hai dimenticato la password?" nella nuova
    AuthScreen che invoca `supabase.auth.resetPasswordForEmail(email)`.
    L'utente riceve un link via email per reimpostare la password.
    Obbligatorio nel primo rilascio: senza recovery, un utente che
    dimentica le credenziali perde l'accesso a tutti i propri dati
    (RLS impedisce qualunque accesso senza sessione valida).
- **Fuori scope**: biometrico (rimandato a fase futura), magic link,
  social login.

### 4.3 PIN privato

- **Scelta**: **mantenere** il PIN privato come funzionalità UX
  (nascondere certi conti anche all'utente già loggato).
- **Motivazione**: scenario reale (telefono incustodito, sguardi indiscreti
  su tablet condiviso). Diversa dall'autenticazione: è una "seconda chiave"
  intra-account.
- **Storage**: hash del PIN privato salvato nella colonna
  `impostazioni_utente.pin_privato_hash` su Supabase. Sincronizzato tra
  dispositivi.
- **Algoritmo di hashing**: l'attuale **SHA-256 puro**
  ([src/lib/crypto.ts](../../src/lib/crypto.ts)) è **inadeguato** per un
  hash che transita via rete. Va sostituito con **bcrypt o argon2** lato
  client prima dell'upsert, oppure la verifica va eseguita interamente
  tramite **Supabase Edge Function** (PIN inviato in chiaro su HTTPS,
  hashato e verificato server-side, mai persistito in chiaro).
  → **Punto aperto da risolvere nel design operativo dedicato al PIN
  privato.**
- **Comportamento**: `isPrivateUnlocked` torna **automaticamente** a `false`
  ad ogni nuova sessione (login, riapertura app dopo logout/scadenza).
  Non viene mai persistita.
- **Eliminato**: `private-pin-hash` da `useKV`.
- **Reimplementato**: nuovo flusso di set/verify PIN privato basato su
  Supabase + nuova primitiva di hashing.

### 4.4 Campo `cifrato` sulle transazioni

- **Scelta**: il campo `cifrato` (BOOLEAN, default FALSE) **rimane** nello
  schema della tabella `transazioni` ma **non viene più scritto dal client**.
- **Motivazione**: è una denormalizzazione utile per query rapide
  (`WHERE cifrato = TRUE`) senza join con `conti`. Mantenerlo coerente
  manualmente dal client è fragile (oggi infatti il valore è scritto ma
  mai letto).
- **Popolamento**: tramite **trigger database** o **colonna generata** che
  imposta `cifrato = TRUE` quando il `conto_id` collegato ha
  `is_privato = TRUE`. Il client diventa cieco al campo.
- **Eliminato**: la riga 185 di
  [TransactionDialog.tsx](../../src/components/TransactionDialog.tsx)
  (`cifrato: isPrivateTransaction`) e l'impostazione di
  `Transaction.cifrato` in qualunque payload inviato a Supabase.
- **Reimplementato**: il trigger/colonna generata su Supabase. Il design
  operativo dedicato sceglierà tra trigger su `INSERT/UPDATE` o
  `GENERATED ALWAYS AS`.

### 4.5 Dati offline

- **Scelta primo rilascio**: **sola lettura offline**.
- **Motivazione**: la lettura offline ha valore d'uso immediato
  (consultare saldi e movimenti senza rete); la scrittura offline
  introduce conflitti di sincronizzazione che richiedono un design
  separato (CRDT, last-write-wins, queue locale, undo).
- **Implementazione**: cache locale via **service worker** o **cache del
  client Supabase** (es. `localStorage` con TTL). La strategia tecnica
  esatta va definita nel **design operativo dedicato all'offline**.
- **Eliminato**: nulla (Spark non offriva offline strutturato).
- **Reimplementato**: nuova primitiva di cache.
- **Fuori scope**: scrittura offline, sincronizzazione differita, gestione
  conflitti.

### 4.6 Onboarding primo accesso

- **Scelta**: schermata di **configurazione iniziale guidata** al primo
  login.
- **Step**: nome visualizzato → valuta default → creazione del primo conto.
- **Categorie**: copiate da un **set di template condivisi** (righe in una
  tabella `categorie` o `categorie_template` non legate a nessun
  `user_id`, con `user_id IS NULL`) nell'account del nuovo utente al
  completamento dell'onboarding.
- **Motivazione**: sostituisce l'attuale inizializzazione client-side
  delle categorie default (in `AppDataContext`/`constants.ts`), che con
  RLS+multi-device perde senso.
- **Eliminato**: `DEFAULT_CATEGORIES` come bootstrap automatico al primo
  render.
- **Reimplementato**: tabella template + RPC/funzione `seed_default_categories(user_id)`
  invocata al completamento dell'onboarding.

### 4.7 Preferenze UI

- **Scelta**: tutte le 24 chiavi (`display-*`, `sr-*`, `audio-*`,
  `talkback-*`) + `visible-categories` confluiscono in `impostazioni_utente`.
  `dismissed-budget-alerts` confluisce invece in `notifiche`
  (vedi §4.8 e §5.1).
- **Strategia di accesso**: un **unico hook `useUserSettings()`** che:
  1. al login carica una sola volta il record dell'utente;
  2. lo tiene in memoria nel context;
  3. su scrittura fa **upsert sul singolo campo** (debounce consigliato
     per slider e toggle rapidi).
- **Motivazione**: 24 query separate ad ogni render sono inaccettabili;
  un singolo record letto una volta è semplice, prevedibile, cache-friendly.
- **Strategia colonne**: due opzioni, da dirimere nel design operativo
  dedicato:
  1. **24 colonne tipizzate** + `pin_privato_hash` + `visible_categories`
     (text[] o JSONB) + `dismissed_alerts` (text[]).
  2. **Una colonna `preferences JSONB`** che raccoglie le preferenze UI
     non critiche, + colonne tipizzate solo per i campi sensibili
     (`pin_privato_hash`, `valuta_default`, `nome_visualizzato`).
- **Eliminato**: tutti i `useKV` individuali in `DisplaySettings`,
  `ScreenReaderSettings`, `AudioSettings`, `use-display-preferences`,
  `use-talkback`, e le chiamate dirette in `sound-system.ts`.
- **Reimplementato**: hook unico + iniezione del client Supabase nel
  singleton `sound-system` (vedi blocco 5 della roadmap).
- **Punto aperto**: schema esatto delle colonne (decisione 1 vs 2 sopra).

### 4.8 Tabelle fuori scope

Le seguenti **6 tabelle Supabase esistono già** ma **non vengono toccate**
dal codice in questa migrazione:

- `tag`
- `transazioni_tag` (giunzione)
- `ricorrenze` (= `transazioni_ricorrenti` nello schema originale)
- `notifiche`
- `storico_accessi`
- `allegati_transazioni`

Sono funzionalità future, da schedulare come **progetti separati** dopo il
completamento della migrazione. Eccezione: `dismissed-budget-alerts`
confluisce in `notifiche` tramite il campo `letta`. Decisione già chiusa
in §5.1 — la tabella `notifiche` esistente supporta questo caso senza
modifiche allo schema.

---

## 5. Schema Supabase — mappatura completa

### 5.1 Tabelle in scope (5 dominio + 1 preferenze + auth)

| # | Chiave Spark | Tabella Supabase | Note di migrazione |
|---|---|---|---|
| 1 | `accounts` | `conti` | 1:1 con `Account` di [types.ts](../../src/lib/types.ts). Aggiungere `user_id`. Confronto colonne in §5.3. |
| 2 | `transactions` | `transazioni` | Aggiungere `user_id`. `cifrato` diventa derivato (trigger). I campi `ricorrente` + `frequenzaRicorrenza` restano inline in questa migrazione (la tabella `ricorrenze` è fuori scope). |
| 3 | `categories` | `categorie` | Aggiungere `user_id`. Le righe template hanno `user_id IS NULL` e vengono copiate per nuovo utente. |
| 4 | `budgets` | `budget` | Aggiungere `user_id`. `attivo` resta gestito client-side / da query. |
| 5 | `savings-goals` | `obiettivi_risparmio` | Aggiungere `user_id`. `colore`/`icona` restano metadati visivi. |
| 6 | `private-pin-hash` | `impostazioni_utente.pin_privato_hash` | Hash con bcrypt/argon2, vedi §4.3. |
| 6 | `visible-categories` | `impostazioni_utente.visible_categories` (text[] o JSONB) | Schema esatto da definire. |
| 6 | `dismissed-budget-alerts` | `notifiche` | Ogni avviso budget genera una riga in `notifiche` con tipo `budget_soglia` o `budget_superato` e campo `letta = FALSE`. Quando l'utente lo chiude, si imposta `letta = TRUE`. L'app non mostra nuovamente avvisi con `letta = TRUE` per la stessa entità. Nessuna modifica allo schema della tabella `notifiche` necessaria: i campi `tipo`, `letta`, `entita_tipo`, `entita_id` coprono già questo caso. |
| 6 | 24 chiavi UI/A11y/Audio | `impostazioni_utente.*` o `impostazioni_utente.preferences` JSONB | Schema esatto da definire. |
| — | `global-pin-hash` | `auth.users` (gestito da Supabase Auth) | Eliminato dallo storage applicativo. |
| — | `budget-percentages` | **non migrato** | Resta `useState` client-side (cache di sessione). |

### 5.2 Tabelle fuori scope

| Tabella Supabase | Stato | Nota |
|---|---|---|
| `tag` | Esiste, non toccata | Funzionalità futura. |
| `transazioni_tag` | Esiste, non toccata | Giunzione N:M con `tag`. |
| `ricorrenze` | Esiste, non toccata | I campi `ricorrente`/`frequenzaRicorrenza` su `transazioni` restano inline per ora. La normalizzazione è progetto separato. |
| `notifiche` | Esiste, non toccata | Usata per `dismissed-budget-alerts` tramite il campo `letta`. Nessuna modifica allo schema necessaria. Decisione già chiusa in §4.8 e §5.1. |
| `storico_accessi` | Esiste, non toccata | Logging accessi futuro. |
| `allegati_transazioni` | Esiste, non toccata | Foto ricevute futuro (richiede Supabase Storage). |

### 5.3 Confronto tipi TypeScript ↔ colonne Supabase

I tipi TypeScript sotto sono presi da
[src/lib/types.ts](../../src/lib/types.ts). Le colonne Supabase **definitive**
non sono incluse nel report fonte: la mappatura sotto descrive le
**aspettative** che il design operativo di ogni blocco dovrà verificare
contro lo schema reale di Supabase **prima** di scrivere codice. Le
discrepanze trovate vanno tracciate come task del blocco corrispondente.

#### `Account` → `conti`

| Campo TS | Tipo TS | Colonna attesa Supabase | Note |
|---|---|---|---|
| `id` | `string` | `id uuid` | Generato server-side (`gen_random_uuid()`). |
| `nome` | `string` | `nome text` | |
| `tipo` | `AccountType` (enum) | `tipo text` o `enum` | Verificare se Supabase usa enum nativo o text + check. |
| `saldoIniziale` | `number` | `saldo_iniziale numeric` | Naming snake_case da mappare. |
| `valuta` | `string` | `valuta text` | |
| `isPrivato` | `boolean` | `is_privato boolean` | Naming. |
| `dataCreazione` | `string` | `data_creazione timestamptz` | Da ISO string a timestamp. |
| — | — | `user_id uuid` | **Nuovo**, non esiste lato client. |

#### `Transaction` → `transazioni`

| Campo TS | Tipo TS | Colonna attesa Supabase | Note |
|---|---|---|---|
| `id` | `string` | `id uuid` | |
| `data` | `string` | `data date` o `timestamptz` | Verificare. |
| `importo` | `number` | `importo numeric` | |
| `tipo` | `TransactionType` | `tipo text` o `enum` | |
| `contoId` | `string` | `conto_id uuid` | FK → `conti.id`. |
| `contoDestinazioneId?` | `string` | `conto_destinazione_id uuid` | Nullable, FK. |
| `categoriaId` | `string` | `categoria_id uuid` | Nullable per trasferimenti. FK. |
| `descrizione` | `string` | `descrizione text` | |
| `ricorrente` | `boolean` | `ricorrente boolean` | Resta inline (ricorrenze normalizzate fuori scope). |
| `frequenzaRicorrenza?` | `RecurrenceFrequency` | `frequenza_ricorrenza text` | Resta inline. |
| `cifrato` | `boolean` | `cifrato boolean` | **Diventa derivato** (trigger/generated). Client non scrive più. |
| — | — | `user_id uuid` | **Nuovo**. |

#### `Category` → `categorie`

| Campo TS | Tipo TS | Colonna attesa Supabase | Note |
|---|---|---|---|
| `id` | `string` | `id uuid` | |
| `nome` | `string` | `nome text` | |
| `tipo` | `CategoryType` | `tipo text` o `enum` | |
| `predefinita` | `boolean` | `predefinita boolean` | True per template. |
| — | — | `user_id uuid NULL` | **Nuovo**. NULL = template. |

#### `Budget` → `budget`

| Campo TS | Tipo TS | Colonna attesa Supabase | Note |
|---|---|---|---|
| `id` | `string` | `id uuid` | |
| `nome` | `string` | `nome text` | |
| `importoTarget` | `number` | `importo_target numeric` | |
| `periodo` | `BudgetPeriod` | `periodo text` o `enum` | |
| `categoriaId?` | `string` | `categoria_id uuid` | FK nullable. |
| `contoId?` | `string` | `conto_id uuid` | FK nullable. |
| `dataInizio` | `string` | `data_inizio date` | |
| `dataFine` | `string` | `data_fine date` | |
| `attivo` | `boolean` | `attivo boolean` | |
| — | — | `user_id uuid` | **Nuovo**. |

#### `SavingsGoal` → `obiettivi_risparmio`

| Campo TS | Tipo TS | Colonna attesa Supabase | Note |
|---|---|---|---|
| `id` | `string` | `id uuid` | |
| `nome` | `string` | `nome text` | |
| `descrizione` | `string` | `descrizione text` | |
| `importoTarget` | `number` | `importo_target numeric` | |
| `importoCorrente` | `number` | `importo_corrente numeric` | |
| `dataInizio` | `string` | `data_inizio date` | |
| `dataScadenza?` | `string` | `data_scadenza date` | |
| `contoAssociato?` | `string` | `conto_associato uuid` | FK nullable. |
| `colore` | `string` | `colore text` | |
| `icona` | `string` | `icona text` | |
| `completato` | `boolean` | `completato boolean` | |
| `dataCompletamento?` | `string` | `data_completamento timestamptz` | |
| — | — | `user_id uuid` | **Nuovo**. |

#### Differenze di nomenclatura — pattern generale

Il client TS usa **camelCase** italiano (`saldoIniziale`, `dataCreazione`,
`contoId`); Supabase per convenzione usa **snake_case** (`saldo_iniziale`,
`data_creazione`, `conto_id`). La mappatura va concentrata in **un solo
strato** (es. `src/lib/supabase/repositories/*.ts`) che fa la traduzione
in entrata e uscita, in modo che il resto del codice continui a vedere i
tipi `Account`, `Transaction`, ecc. invariati.

#### Campi nuovi (non presenti lato client)

- `user_id` su tutte le 5 tabelle di dominio + `categorie` + `impostazioni_utente`.
- `created_at` / `updated_at` (best practice, da chiarire se attivi).
- Eventuali colonne di `impostazioni_utente` per le 24 preferenze UI.

#### Campi eliminati o smessi di scrivere

- `Transaction.cifrato` viene **letto** ancora dal tipo TS (per tipizzazione)
  ma **non scritto** dal client.
- `globalPinHash`, `privatePinHash` da `AppState` di
  [types.ts](../../src/lib/types.ts) (righe 80-81) vanno deprecati.

---

## 6. Piano di migrazione in 10 blocchi

I blocchi sono numerati in ordine di dipendenza tecnica. I numeri 1, 2, 3
sono **bloccanti** per tutto ciò che segue.

### Blocco 1 — Decisioni di schema su `impostazioni_utente` e `cifrato`

- **Obiettivo**: chiudere i punti aperti di schema (24 colonne vs JSONB,
  trigger vs colonna generata per `cifrato`, destino di
  `dismissed-budget-alerts`).
- **File coinvolti**: `docs/1 - projects/P25-schema-impostazioni-utente.md`
  (nuovo design), nessun file `src/`.
- **Tabelle Supabase**: `impostazioni_utente`, `transazioni`.
- **Dipendenze**: nessuna.
- **Complessità**: **Media** (lavoro di design, non di codice).
- **Punti aperti**:
  - 24 colonne tipizzate vs `preferences JSONB`.
  - Trigger vs `GENERATED ALWAYS AS` per `cifrato`.

### Blocco 2 — Strato di accesso dati Supabase

- **Obiettivo**: creare `src/lib/supabase/client.ts` (singleton),
  `src/lib/supabase/repositories/*.ts` (uno per tabella) e l'hook
  `useSupabaseTable` che mantiene la stessa API setter di `useKV`
  (`set(prev => next)`), per consentire sostituzioni 1:1 nei call site.
- **File coinvolti**: nuovi `src/lib/supabase/**`. Nessuna modifica a
  componenti esistenti in questo blocco.
- **Tabelle Supabase**: tutte le 5 di dominio + `impostazioni_utente`.
- **Dipendenze**: blocco 1.
- **Complessità**: **Complessa** (è la fondazione di tutto).
- **Punti aperti**:
  - Strategia di error/retry (toast vs throw).
  - Convenzione di mapping camelCase ↔ snake_case (manuale vs libreria).
  - Politica di subscription realtime (sì o no in fase 1).

### Blocco 3 — Migrazione `AuthContext` a Supabase Auth

- **Obiettivo**: sostituire l'autenticazione PIN globale con email +
  password Supabase. Nuova `AuthScreen`. Pattern `isAuthReady` replicato.
  Timer di inattività configurabile.
- **File coinvolti**:
  [src/context/AuthContext.tsx](../../src/context/AuthContext.tsx),
  [src/components/AuthScreen.tsx](../../src/components/AuthScreen.tsx),
  [src/App.tsx](../../src/App.tsx) (gating render),
  [src/components/SecuritySettings.tsx](../../src/components/SecuritySettings.tsx)
  (rimozione cambio PIN globale).
- **Tabelle Supabase**: `auth.users` (gestita da SDK).
- **Dipendenze**: blocco 2.
- **Complessità**: **Complessa** — bloccante per tutto il resto: tutti i
  provider sono montati sotto `AuthProvider`.
- **Punti aperti**:
  - Recovery password: in scope. Implementare `resetPasswordForEmail`
    nella nuova AuthScreen (vedi §4.2 e R17).
  - Conferma email obbligatoria all'iscrizione?
  - Persistenza del valore di timeout inattività (locale o server).

### Blocco 4 — Migrazione dati di dominio in `AppDataContext`

- **Obiettivo**: sostituire le 5 chiamate `useKV` di dominio in
  [AppDataContext.tsx](../../src/context/AppDataContext.tsx) con
  `useSupabaseTable`. **Deduplicare** il `useKV` parallelo in
  [CategoryManagement.tsx](../../src/components/CategoryManagement.tsx#L38).
- **File coinvolti**: `AppDataContext.tsx`, `CategoryManagement.tsx`,
  `TransactionDialog.tsx` (rimozione riga `cifrato: isPrivateTransaction`).
- **Tabelle Supabase**: `conti`, `transazioni`, `categorie`, `budget`,
  `obiettivi_risparmio`.
- **Dipendenze**: blocco 2, blocco 3 (serve `user_id` da sessione).
- **Complessità**: **Complessa** (5 tabelle, denormalizzazione `cifrato`,
  deduplicazione).
- **Punti aperti**:
  - Comportamento di loading (spinner globale vs per-tabella).
  - Politica di cache locale tra sessioni.

### Blocco 5 — Migrazione preferenze UI/A11y/Audio

- **Obiettivo**: introdurre `useUserSettings()` come unica fonte verità
  per le 24 chiavi + `visible-categories` + `dismissed-budget-alerts`.
- **File coinvolti**:
  [DisplaySettings.tsx](../../src/components/DisplaySettings.tsx),
  [ScreenReaderSettings.tsx](../../src/components/ScreenReaderSettings.tsx),
  [AudioSettings.tsx](../../src/components/AudioSettings.tsx),
  [use-display-preferences.ts](../../src/hooks/use-display-preferences.ts),
  [use-talkback.ts](../../src/hooks/use-talkback.ts),
  [sound-system.ts](../../src/lib/sound-system.ts) (con iniezione client),
  parti di `AppDataContext.tsx` (`visible-categories`, `dismissed-alerts`).
- **Tabelle Supabase**: `impostazioni_utente`.
- **Dipendenze**: blocco 1 (schema), blocco 2, blocco 3.
- **Complessità**: **Complessa** (molti file, ma logica ripetitiva).
- **Punti aperti**:
  - Debounce per slider (volume, font-size).
  - Strategia per `sound-system.ts` non React (probabilmente: il singleton
    espone `setClient(supabase)` e `loadSettings()` viene chiamato dal
    `AuthProvider` post-login).

### Blocco 6 — Cache `budget-percentages` client-side

- **Obiettivo**: spostare `budget-percentages` da `useKV` a `useState` (o
  `localStorage` con chiave per-`user.id`).
- **File coinvolti**: `AppDataContext.tsx`.
- **Tabelle Supabase**: nessuna.
- **Dipendenze**: blocco 4.
- **Complessità**: **Semplice**.
- **Punti aperti**: scelta `useState` (perde stato a refresh) vs
  `localStorage` (persiste ma è per-device).

### Blocco 7 — Migratore one-shot Spark → Supabase

- **Obiettivo**: rifare
  [DataManagement.tsx](../../src/components/DataManagement.tsx) per:
  (a) export di un dump JSON dal nuovo backend Supabase;
  (b) import di un dump JSON Spark esistente come migrazione one-shot
  per chi ha già dati locali.
- **File coinvolti**: `DataManagement.tsx`.
- **Tabelle Supabase**: tutte le 5 di dominio + `impostazioni_utente`.
- **Dipendenze**: blocco 4, blocco 5.
- **Complessità**: **Media**.
- **Punti aperti**:
  - Transazione atomica vs best-effort.
  - Gestione collisioni di `id` se l'utente ri-importa.

### Blocco 8 — PIN privato su Supabase

- **Obiettivo**: implementare set/verify PIN privato con hashing
  appropriato (bcrypt/argon2) e storage su `impostazioni_utente.pin_privato_hash`.
  Aggiornare la sezione "Cambio PIN privato" di `SecuritySettings`.
  Garantire che `isPrivateUnlocked = false` ad ogni nuova sessione.
- **File coinvolti**:
  [src/lib/crypto.ts](../../src/lib/crypto.ts) (sostituzione SHA-256),
  `AuthContext.tsx` (logica unlock), `SecuritySettings.tsx`,
  [PinDialog.tsx](../../src/components/PinDialog.tsx),
  [use-visible-data.ts](../../src/hooks/use-visible-data.ts) (resta
  invariato a livello di logica),
  [use-app-shortcuts.ts](../../src/hooks/use-app-shortcuts.ts).
- **Tabelle Supabase**: `impostazioni_utente`.
- **Dipendenze**: blocco 3, blocco 5.
- **Complessità**: **Massima** — riguarda la sicurezza, richiede revisione
  crittografica.
- **Punti aperti**:
  - bcrypt/argon2 client-side (libreria, dimensione bundle) **vs**
    Edge Function server-side.
  - Politica di rate limiting su tentativi fallidi.

### Blocco 9 — Onboarding primo accesso

- **Obiettivo**: nuovo flusso post-signup con nome visualizzato, valuta
  default, primo conto, copia categorie template.
- **File coinvolti**: nuovo `src/components/OnboardingFlow.tsx`,
  `App.tsx` (gating), `AuthContext.tsx` (flag `needsOnboarding`).
- **Tabelle Supabase**: `impostazioni_utente`, `conti`, `categorie`.
- **Dipendenze**: blocco 3, blocco 4, blocco 5.
- **Complessità**: **Media**.
- **Punti aperti**:
  - Detection "primo accesso" (assenza riga `impostazioni_utente`?).
  - Categorie template: tabella dedicata o righe in `categorie` con
    `user_id IS NULL`.

### Blocco 10 — Decommissionamento Spark + offline read-only

- **Obiettivo**:
  (a) rimuovere `@github/spark/hooks` dagli import e da `package.json`;
  (b) aggiornare `src/test/setup.ts` (oggi mocka `useKV`);
  (c) introdurre cache offline read-only (service worker o cache locale).
- **File coinvolti**: `package.json`, `src/test/setup.ts`, eventuale
  `src/sw.ts` o configurazione client.
- **Tabelle Supabase**: tutte (lato cache).
- **Dipendenze**: blocchi 1–9 completati.
- **Complessità**: **Complessa** (offline) + **Semplice** (rimozione Spark).
  Si può **dividere in 10a (rimozione Spark)** e **10b (offline)**.
- **Punti aperti**:
  - Service worker (Workbox) vs cache nel client Supabase via `localStorage`.
  - TTL della cache.
  - Indicatore UI di stato offline.

---

## 7. Rischi tecnici e punti aperti

| # | Rischio | Impatto | Blocco di gestione |
|---|---|---|---|
| R1 | API setter di `useKV` (firma updater `set(prev => next)` con `prev` undefined-tolerant). Sostituto Supabase deve replicarla esattamente per evitare regressioni silenziose. | Alto — bug diffusi | Blocco 2 |
| R2 | Doppia sottoscrizione su `categories` (`CategoryManagement` vs `AppDataContext`). Migrare solo uno crea split-brain. | Alto | Blocco 4 |
| R3 | Doppia sottoscrizione su `*-pin-hash` (`SecuritySettings` vs `AuthContext`). Stessa nota. | Alto durante la transizione | Blocco 3 + 8 |
| R4 | Bootstrap race condition. Pattern `isAuthReady` da replicare con `getSession()`. | Alto — flash schermata sbagliata | Blocco 3 |
| R5 | `sound-system.ts` non è React e oggi accede direttamente a `window.spark.kv`. Non può usare hook. Serve iniezione manuale del client Supabase. | Medio | Blocco 5 |
| R6 | `HapticSettings` non usa `useKV`: persistenza interna a `hapticSystem` non verificata. | Medio (incognita) | Blocco 5 (analisi preliminare) |
| R7 | `DataManagement` export/import oggi cicla su `window.spark.kv.keys()`. Romperà il backup esistente. | Medio | Blocco 7 |
| R8 | `budget-percentages` semantica per-sessione: migrarla su Supabase sarebbe sbagliato. | Basso | Blocco 6 |
| R9 | `Transaction.ricorrente` + `frequenzaRicorrenza` inline vs futura tabella `ricorrenze`. Migrazione dati richiederà script futuro. | Basso (fuori scope) | Fuori scope |
| R10 | Hashing PIN privato con SHA-256 puro inadeguato per dato che transita via rete. Da sostituire con bcrypt/argon2 client o Edge Function. | **Critico — sicurezza** | Blocco 8 |
| R11 | Schema esatto di `impostazioni_utente` per le 24 chiavi UI: 24 colonne vs JSONB. Decisione necessaria prima di cablare il blocco 5. | Alto (bloccante) | Blocco 1 |
| R12 | Trigger / colonna generata per `cifrato`: scelta tecnica e scrittura SQL. | Medio | Blocco 1 |
| R13 | Strategia cache offline (service worker vs client cache vs localStorage). | Medio | Blocco 10 |
| R14 | Mapping camelCase ↔ snake_case: dove farlo (repository layer vs componenti). | Medio | Blocco 2 |
| R15 | Sessione 5 minuti: rischio UX (logout durante inserimento lungo). Necessario warning UI a 1 minuto dalla scadenza. | Medio | Blocco 3 |
| R16 | Confronto colonne attese vs schema reale Supabase: il presente documento descrive le **aspettative**. Il design operativo di ogni blocco dovrà confermarle leggendo lo schema reale. | Alto se trascurato | Tutti i blocchi |
| R17 | Recovery password: senza reset via email un utente che dimentica le credenziali perde l'accesso permanentemente (RLS impedisce qualunque accesso senza sessione valida). | **Critico per UX e dati** — **IN SCOPE blocco 3**: implementare `resetPasswordForEmail` nella nuova AuthScreen al primo rilascio. | Blocco 3 |

---

## 8. Comportamento invariato

I seguenti elementi **non cambiano** durante la migrazione. Servono come
**riferimento di non-regressione**:

- **Struttura dei componenti UI**: `DashboardTab`, `TransactionsTab`,
  `ReportsTab`, `AccountCard`, `AccountDialog`, `BudgetDialog`,
  `SavingsGoalDialog`, `DialogsOverlay`, `AppHeader`, `AuthScreen` (struttura
  visiva), `PinDialog` (struttura visiva). Le firme dei componenti non
  cambiano: cambia solo la fonte dei dati che ricevono via context.
- **Logica di [VisibleDataContext](../../src/context/VisibleDataContext.tsx)
  e [use-visible-data.ts](../../src/hooks/use-visible-data.ts)**: derivata
  da `AppDataContext` + `AuthContext`. Non tocca lo storage. Resta
  identica. La condizione `account.isPrivato && !isPrivateUnlocked` resta
  la fonte unica di filtraggio dei conti privati.
- **Tipi di dominio in [src/lib/types.ts](../../src/lib/types.ts)**:
  restano invariati nelle loro firme principali. Cambiano solo:
  rimozione di `globalPinHash`/`privatePinHash` da `AppState`,
  e (nel medio termine) deprecazione del campo `Transaction.cifrato`
  scrivibile.
- **Smoke test esistenti**: la struttura dei test resta. I file di setup
  ([src/test/setup.ts](../../src/test/setup.ts)) verranno aggiornati nei
  blocchi dedicati per smettere di mockare `useKV`.
- **Configurazione TypeScript** ([tsconfig.json](../../tsconfig.json))
  e **Vite** ([vite.config.ts](../../vite.config.ts)): nessuna modifica
  pianificata. Si aggiungerà solo la dipendenza `@supabase/supabase-js`
  in `package.json`.
- **Sistema di shortcut** ([use-app-shortcuts.ts](../../src/hooks/use-app-shortcuts.ts)):
  resta. Cambia solo la sorgente di `isAuthenticated` /
  `isPrivateUnlocked` (sempre via `useAuth()`).
- **Sistema accessibilità**: `useScreenReader`, `LiveRegion`, `SkipLink`,
  `FocusIndicator`, `KeyboardShortcutsHelp` restano invariati nelle firme
  e nei comportamenti. Cambia solo la persistenza delle loro preferenze
  (blocco 5).
- **Helpers** ([src/lib/helpers.ts](../../src/lib/helpers.ts)),
  **budget-alerts** ([src/lib/budget-alerts.ts](../../src/lib/budget-alerts.ts)),
  **constants** ([src/lib/constants.ts](../../src/lib/constants.ts)):
  restano invariati eccetto `DEFAULT_CATEGORIES` che diventerà template
  server-side (blocco 9).

---

## 9. Criteri di accettazione del documento

Prima di passare ai design operativi (P25+) e poi agli agenti Plan e Code,
verificare che:

- [ ] Tutte le 9 sezioni richieste sono presenti e non vuote.
- [ ] L'intestazione (§1) elenca i 7 documenti di riferimento e dichiara
      "nessun file modificato".
- [ ] Il contesto (§2) cita esplicitamente che BUG-01 è sintomo, non causa.
- [ ] La fotografia stato attuale (§3) riporta i numeri: 45 chiamate `useKV`,
      31 chiavi, 3 famiglie, e i 5 problemi tecnici (duplicazioni, `cifrato`
      morto, cache `budget-percentages`, `sound-system` non React,
      `HapticSettings` da chiarire).
- [ ] Le 6 decisioni architetturali (§4.1–§4.7 + §4.8) sono documentate
      con: scelta, motivazione, cosa è eliminato, cosa è reimplementato.
- [ ] La mappatura schema (§5) include tutte le 5 tabelle dominio, le 6
      tabelle fuori scope e il confronto tipi TS ↔ colonne Supabase.
- [ ] Il piano (§6) ha esattamente 10 blocchi numerati, ciascuno con:
      obiettivo, file, tabelle, dipendenze, complessità, punti aperti.
- [ ] La sezione rischi (§7) elenca almeno R1–R17 e per ognuno indica il
      blocco di gestione.
- [ ] La sezione invariato (§8) elenca esplicitamente cosa non cambia.
- [ ] Tutti i link a file `src/` e `docs/` puntano a path reali del
      repository.
- [ ] Nessuna frase del tipo "TODO", "da definire", "vedere dopo" senza
      essere già tracciata come punto aperto in §7.
- [ ] Il documento è leggibile da chi non conosce la storia del progetto:
      ogni acronimo (RLS, BUG-01, KV) è introdotto al primo uso.

---

*Fine documento. Nessun file sorgente è stato modificato.*

*Messaggio di commit suggerito:*
`docs(design): aggiungere P24 architettura generale migrazione Spark→Supabase`
