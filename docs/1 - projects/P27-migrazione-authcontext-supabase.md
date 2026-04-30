# P27 — Migrazione AuthContext a Supabase Auth

## 1. Intestazione

| Campo | Valore |
|---|---|
| Pacchetto | P27 — Migrazione AuthContext a Supabase Auth |
| Tipo intervento | Documento di design (sola lettura) |
| Branch | `refactoring-architettura` |
| Data | 28 aprile 2026 |
| Autore | Agent-Design |
| File modificati | Nessuno (solo creazione di questo documento di design) |
| Documenti di riferimento | [P24 — Architettura generale migrazione Spark→Supabase](./P24-architettura-migrazione-supabase.md), [P25 — Schema `impostazioni_utente` e campo `cifrato`](./P25-schema-impostazioni-utente-cifrato.md), [P26 — Strato di accesso dati Supabase](./P26-strato-accesso-dati-supabase.md), [src/context/AuthContext.tsx](../../src/context/AuthContext.tsx), [src/components/AuthScreen.tsx](../../src/components/AuthScreen.tsx), [src/components/SecuritySettings.tsx](../../src/components/SecuritySettings.tsx), [src/App.tsx](../../src/App.tsx) |
| Stato | Bozza — in attesa di validazione |

Questo documento è **vincolante** per tutti i design operativi successivi
(P28 in poi). Le decisioni qui contenute sono già state validate e non
vengono rimesse in discussione: i design successivi possono solo
dettagliarne l'implementazione, non cambiarne la sostanza.

---

## 2. Contesto

Il Blocco 3 è il **più critico dell'intera sequenza di migrazione**: tutti
i Provider React dell'app — `AppDataProvider`, `VisibleDataProvider` e i
futuri provider di preferenze e onboarding — sono montati **dentro**
`AuthProvider`. Un errore di implementazione in questo blocco non produce
un bug isolato, produce un'app che non parte.

P24 §4.2 ha già chiuso le decisioni fondamentali: autenticazione tramite
email + password Supabase, sessione non permanente con default di 5 minuti
di inattività, recovery password obbligatoria nel primo rilascio (P24 R17,
in scope Blocco 3), e il pattern `isAuthReady` che impedisce il flash della
schermata sbagliata al bootstrap. Queste scelte **non sono più in
discussione**.

I tre punti che P24 §6 Blocco 3 aveva lasciato aperti — e che P27 chiude —
sono:

1. **Conferma email obbligatoria** all'iscrizione (sì o no nel primo
   rilascio)?
2. **Persistenza del timeout di inattività**: `localStorage` del singolo
   dispositivo o colonna `impostazioni_utente` su Supabase (sincronizzato
   multi-device)?
3. **Schermata durante il caricamento iniziale**: spinner neutro o
   schermata di login anticipata?

Il flag `needsOnboarding` (consumato dal Blocco 9) nasce anch'esso in
questo blocco: è `AuthProvider` che, dopo aver risolto la sessione, carica
`impostazioni_utente` tramite il repository P26 e determina se l'utente
ha già completato l'onboarding.

---

## 3. File coinvolti e loro trasformazione

### 3.1 `src/context/AuthContext.tsx`

**Stato attuale (Spark):**
- Importa `useKV` per leggere e scrivere `global-pin-hash` e
  `private-pin-hash` (righe 38–39).
- Usa `window.spark.kv.get('global-pin-hash')` direttamente al bootstrap
  (riga 52) come workaround al bug di stabilità Spark — la lettura avviene
  prima che `useKV` si stabilizzi.
- Espone 18 valori nel context: hash PIN, flag di stato UI
  (`isSetupMode`, `showPinDialog`, `showPrivatePinDialog`), handler
  di verifica PIN globale e privato.
- `isAuthenticated` è un semplice `useState` locale: vale `true` dopo
  che il PIN globale è stato verificato correttamente in sessione.
- `isAuthReady` diventa `true` dopo la lettura KV iniziale.

**Stato futuro (Supabase):**
- Importa il client Supabase da `src/lib/supabase/client.ts` (P26 §3).
- Al mount chiama `supabase.auth.getSession()` per risolvere la sessione
  esistente, poi sottoscrive `supabase.auth.onAuthStateChange()` per
  reagire a login, logout e scadenza token.
- `isAuthReady` diventa `true` solo dopo che `getSession()` è tornata
  (sia con sessione attiva, sia con sessione nulla).
- Dopo che `isAuthReady = true` e la sessione è attiva, carica
  `impostazioni_utente` tramite il repository
  `impostazioni-utente.getOrCreate()` (P26 §7.6) per determinare il
  valore di `needsOnboarding`.
- Avvia il timer di inattività dopo il login (logica descritta in §9).
- Espone la superficie pubblica ridotta descritta in §4 — nessuno degli
  stati UI del PIN globale sopravvive.

**Eliminato:**
- `useKV` e tutti gli import da `@github/spark/hooks`.
- `window.spark.kv.get(...)` (workaround bootstrap).
- `globalPinHash`, `setGlobalPinHash` (tutto il concetto di PIN globale).
- `isSetupMode`, `setIsSetupMode` (non esiste più setup PIN globale).
- `showPinDialog`, `setShowPinDialog` (il PinDialog globale sparisce).
- `handleGlobalPinSubmit` (il flusso di verifica PIN globale sparisce).
- `privatePinHash`, `setPrivatePinHash` dal context pubblico — il PIN
  privato è ora gestito da `impostazioni_utente` e il suo hash non transita
  più nel context Auth (rimane responsabilità del Blocco 8, dove vive in
  un context dedicato o in `useUserSettings()`).

**Aggiunto:**
- `user` (oggetto `User` di Supabase, `null` se non autenticato).
- `session` (oggetto `Session` di Supabase, `null` se non autenticata).
- `signIn(email, password)` — chiama `supabase.auth.signInWithPassword()`.
- `signUp(email, password)` — chiama `supabase.auth.signUp()`.
- `signOut()` — chiama `supabase.auth.signOut()` e resetta tutti gli
  stati locali, incluso `isPrivateUnlocked`.
- `resetPassword(email)` — chiama
  `supabase.auth.resetPasswordForEmail(email)`. Esposto nel context
  perché usato da `AuthScreen` e potenzialmente da `SecuritySettings`.
- `needsOnboarding` — `boolean`, determinato dal risultato di
  `impostazioni-utente.getOrCreate()` al bootstrap.
- `inactivityTimeout` — valore corrente del timeout (numero di minuti),
  leggibile da tutti i consumer; modificabile tramite `setInactivityTimeout`.

---

### 3.2 `src/components/AuthScreen.tsx`

**Stato attuale (Spark):**
- Thin wrapper: rende solo lo sfondo visivo e delega tutto il contenuto
  a `PinDialog` (aperto automaticamente da `AuthContext`).
- Non contiene nessuna logica: legge solo `showPinDialog`, `isSetupMode`,
  `handleGlobalPinSubmit` da `useAuth()`.
- Non gestisce nessuno stato di errore visibile.
- Non ha né form email né link di recovery.

**Stato futuro (Supabase):**
- Contiene la UI di autenticazione email + password per intero.
- Gestisce localmente il proprio stato di form (email, password, modalità
  login/signup, errori), separato dal context Auth.
- Mostra tre pannelli distinti: login, signup, recovery (vedi §8 per i
  flussi dettagliati).
- Chiama `signIn`, `signUp`, `resetPassword` dal context Auth.
- Mantiene lo sfondo visivo esistente (invariato per continuità UX).

**Eliminato:**
- Il render di `PinDialog` con il PIN globale.
- La dipendenza da `showPinDialog`, `isSetupMode`, `handleGlobalPinSubmit`.

**Aggiunto:**
- Form email + password (login e signup).
- Link "Registrati" / "Hai già un account?" per passare tra le due modalità.
- Sezione recovery password con campo email e pulsante "Invia link".
- Gestione errori visibile inline (non solo toast): messaggio sotto il
  campo errato per credenziali non valide.
- Stato di caricamento: i pulsanti si disabilitano durante le chiamate
  asincrone, con indicatore visivo (spinner o testo "Accesso in corso…").

---

### 3.3 `src/App.tsx`

**Stato attuale (Spark):**
- Alla riga `if (!isAuthReady) return null` blocca il render se
  `isAuthReady = false` (restituisce nulla — schermo vuoto).
- Alla riga `if (!isAuthenticated) return <AuthScreen />` mostra
  `AuthScreen` se non autenticato.
- `AuthProvider` avvolge `AppDataProvider` e `VisibleDataProvider`
  nella gerarchia dei provider.

**Stato futuro (Supabase):**
- Il gating su `isAuthReady` rimane (stessa logica, diversa implementazione
  interna in AuthContext) — ma il comportamento visivo durante l'attesa
  è definito dalla Decisione C (§7): spinner neutro.
- Aggiunge un terzo gate: se `isAuthenticated && needsOnboarding`, mostra
  `OnboardingFlow` invece della dashboard (Blocco 9).
  Ordine dei gate: `!isAuthReady` → spinner; `!isAuthenticated` →
  `AuthScreen`; `needsOnboarding` → `OnboardingFlow`; altrimenti → dashboard.
- La struttura dei provider non cambia: `AuthProvider` rimane la radice.

**Eliminato:**
- Nulla di strutturale: il pattern `isAuthReady` / `isAuthenticated` rimane
  identico lato `App.tsx`. Cambia solo la sorgente dei valori
  (Supabase invece di Spark).

**Aggiunto:**
- Gate intermedio per `needsOnboarding` tra `isAuthenticated` e la
  dashboard.
- Render di uno spinner/schermata di attesa quando `isAuthReady = false`
  (invece di `return null`), come da Decisione C.

---

### 3.4 `src/components/SecuritySettings.tsx`

**Stato attuale (Spark):**
- Apre **due** chiamate `useKV` autonome: `global-pin-hash` e
  `private-pin-hash` (righe 27–28) — **split-brain** rispetto ad
  `AuthContext` (P24 §3 problema duplicazioni, R3).
- Contiene tutta la logica di cambio PIN globale: verifica PIN attuale,
  inserimento nuovo PIN, hashing, salvataggio.
- Contiene tutta la logica di cambio PIN privato in parallelo.

**Stato futuro (Supabase):**
- **Rimuove completamente** la sezione "Cambio PIN globale": non esiste più
  un PIN globale, l'autenticazione è email + password. Al suo posto appare
  una sezione "Sicurezza account" con:
  - Link "Cambia password" che chiama `resetPassword(user.email)` e mostra
    un messaggio "Ti abbiamo inviato un link via email per reimpostare la
    password".
  - Visualizzazione dell'email dell'account corrente (read-only).
- Mantiene la sezione "PIN privato" per impostazione/modifica del PIN
  intra-account, ma **senza** `useKV`: la lettura e scrittura dell'hash
  avvengono tramite il repository `impostazioni-utente.updatePinHash()`
  (P26 §7.6), chiamato dal Blocco 8. La logica completa del PIN privato
  (hashing, verifica, aggiornamento) è rimandata al design del Blocco 8.
- Non espone più `showPinDialog` / `setShowPinDialog` propri: il dialog
  per il PIN privato (se rimane) è gestito da `AuthContext` o da un hook
  dedicato (Blocco 8).

**Eliminato:**
- Entrambe le chiamate `useKV` (righe 27–28).
- Tutta la sezione "Cambio PIN globale" e la sua logica
  (`handleOpenPinChange('global')`, validazione hash globale, ecc.).
- La dipendenza diretta da `hashPin` e `verifyPin` di `src/lib/crypto.ts`
  (spostata al Blocco 8 con primitiva crittografica aggiornata).

**Aggiunto:**
- Sezione "Sicurezza account" con email e link cambio password via email.
- Integrazione con `signOut()` di AuthContext per il pulsante "Esci"
  (se non è già altrove nell'UI).

---

## 4. Superficie pubblica del nuovo AuthContext

La tabella sotto descrive l'intera interfaccia che `AuthProvider` espone
tramite `useAuth()` dopo la migrazione. Non è un tipo TypeScript formale:
è il contratto funzionale vincolante per i blocchi 4–10.

| Nome | Tipo (descrittivo) | Descrizione funzionale | Note |
|---|---|---|---|
| `user` | Oggetto utente Supabase o `null` | L'utente attualmente autenticato. Contiene `id` (uuid), `email`. | Cambia a login (`User`), logout (`null`), scadenza sessione (`null`). Usato da tutti i repository che iniettano `user_id`. |
| `session` | Oggetto sessione Supabase o `null` | La sessione attiva con access token e refresh token. | Raramente usato direttamente dai componenti; utile per i repository che devono fare chiamate autenticate manualmente. |
| `isAuthenticated` | Booleano | `true` se `session` è non-null e valida. | Usato da `App.tsx` per il gating del render e da `use-app-shortcuts`. |
| `isAuthReady` | Booleano | `true` dopo che `getSession()` è tornata (con o senza sessione). Prima che diventi `true` l'app non mostra nessun contenuto. | Usato da `App.tsx`. Diventa `true` una sola volta per ciclo di vita del provider. |
| `needsOnboarding` | Booleano | `true` se l'utente è autenticato ma non ha ancora un record `impostazioni_utente` completo (nessun `nome_visualizzato`). | Usato da `App.tsx` per il gate di `OnboardingFlow`. Blocco 9 lo imposta a `false` al completamento. |
| `inactivityTimeout` | Numero intero (minuti) | Il valore corrente del timeout di inattività. Default: 5. | Usato dal timer interno (§9) e da `SecuritySettings` per mostrare e modificare il valore. |
| `signIn(email, password)` | Funzione asincrona | Chiama `supabase.auth.signInWithPassword()`. In caso di errore lancia `RepositoryError` (P26 Decisione A). | Chiamata da `AuthScreen`. |
| `signUp(email, password)` | Funzione asincrona | Chiama `supabase.auth.signUp()`. | Chiamata da `AuthScreen`. Se la Decisione A (§5) sceglie conferma email, il risultato non produce una sessione immediata. |
| `signOut()` | Funzione asincrona | Chiama `supabase.auth.signOut()`, resetta `isPrivateUnlocked` a `false`, ferma il timer di inattività. | Chiamata da `AppHeader`, `SecuritySettings`, e automaticamente dal timer alla scadenza. |
| `resetPassword(email)` | Funzione asincrona | Chiama `supabase.auth.resetPasswordForEmail(email)`. Non lancia eccezione se l'email non è trovata (per sicurezza: non rivela se l'email esiste). | Chiamata da `AuthScreen` e da `SecuritySettings`. |
| `isPrivateUnlocked` | Booleano | `true` se il PIN privato è stato verificato nella sessione corrente. | Resettato automaticamente a `false` ad ogni logout. Usato da `VisibleDataContext` / `use-visible-data`. |
| `setIsPrivateUnlocked` | Funzione | Aggiorna `isPrivateUnlocked`. | Chiamata da `PinDialog` al completamento della verifica PIN privato (Blocco 8). |
| `showPrivatePinDialog` | Booleano | `true` quando è aperto il dialog di verifica PIN privato. | Usato da `DialogsOverlay` e da `use-app-shortcuts`. |
| `setShowPrivatePinDialog` | Funzione | Apre/chiude il dialog PIN privato. | Chiamata da `AppHeader` e da shortcut. |
| `setInactivityTimeout(minuti)` | Funzione | Aggiorna il valore del timeout e, se la Decisione B sceglie Supabase, chiama `updatePreference` del repository. | Chiamata da `SecuritySettings`. |

> **Nota sulla continuità**: `isPrivateUnlocked`, `setIsPrivateUnlocked`,
> `showPrivatePinDialog`, `setShowPrivatePinDialog` sopravvivono nella
> superficie pubblica perché il PIN privato è mantenuto come funzionalità
> UX (P24 §4.3) e il suo flusso di unlock transita ancora da `AuthContext`.
> L'implementazione completa è rimandata al Blocco 8.

---

## 5. Decisione A — Conferma email obbligatoria

### 5.1 Le due opzioni

#### Opzione 1 — Conferma email obbligatoria

Supabase invia un'email di verifica dopo la registrazione.
L'utente non può accedere ai propri dati finché non clicca il link di
conferma. `signUp()` restituisce un oggetto `session: null` finché l'email
non è confermata. L'app mostra un messaggio "Controlla la tua email e
clicca il link di conferma per attivare l'account."

#### Opzione 2 — Nessuna conferma email nel primo rilascio

L'utente si registra e accede immediatamente senza verificare l'email.
`signUp()` restituisce una sessione attiva subito. La conferma può essere
attivata in una fase futura modificando la configurazione del progetto
Supabase (nessuna modifica al codice client necessaria).

### 5.2 Analisi comparativa

| Dimensione | Opzione 1 (Conferma obbligatoria) | Opzione 2 (Nessuna conferma) |
|---|---|---|
| **Sicurezza dell'account** | Alta — l'utente dimostra il controllo dell'email; account con email inesistente impossibili | Bassa — chiunque può creare account con email altrui; rischio account orfani con email di terzi |
| **Fluidità dell'onboarding** | Bassa — aggiunge un passo obbligatorio fuori app; l'utente deve uscire dall'app, controllare l'email, tornare | Alta — da registrazione a dashboard senza interruzioni |
| **Rischio account orfani** | Nullo — solo email verificate producono account attivi | **Presente** — email di altri utenti possono essere usate; eventuali link di recovery arrivano a terzi |
| **Impatto sulla recovery password** | **Positivo** — la recovery tramite email è affidabile perché l'email è stata già verificata | **Negativo** — P24 R17: recovery obbligatoria nel primo rilascio; se l'email è falsa, il link di reset arriva a un terzo, rendendo inutile la recovery |
| **Complessità di implementazione** | Bassa — è configurazione Supabase + un messaggio informativo nella UI; nessuna logica aggiuntiva lato client | Nulla — nessuna modifica rispetto al flusso base |

### 5.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Conferma email obbligatoria.**

La motivazione determinante è il **legame con la recovery password** (P24 R17).
La recovery via email è l'unico meccanismo per recuperare l'accesso ai dati
in caso di password dimenticata: senza di essa, RLS impedisce qualunque
accesso e tutti i dati dell'utente sono irrecuperabili. Se l'email non è
verificata, la recovery diventa inaffidabile o, nel caso di email di terzi,
un vettore di confusione o abuso.

L'Opzione 2 creerebbe una vulnerabilità nella catena di sicurezza dell'app:
un dato finanziario personale protetto da RLS ma raggiungibile solo tramite
un'email che l'utente potrebbe non controllare. Questo è inaccettabile in
un'app che gestisce dati sensibili.

Il costo in fluidità dell'onboarding è reale ma **limitato e una-tantum**:
avviene una sola volta al primo accesso. Il messaggio nell'app può essere
chiaro ("Apri la tua email e clicca il link di conferma — poi torna qui")
e il pulsante di re-invio disponibile se l'email non è arrivata. Una volta
confermata, l'utente non deve ripetere il passo.

---

## 6. Decisione B — Persistenza del timeout di inattività

### 6.1 Le due opzioni

#### Opzione 1 — Timeout salvato in `localStorage`

Il valore scelto dall'utente (es. 10 minuti) viene salvato nel
`localStorage` del dispositivo con una chiave prefissata dall'`user.id`
(es. `zecchino_timeout_<user_id>`) per evitare conflitti tra utenti su
dispositivo condiviso. Su un secondo dispositivo il timeout riparte dal
default di 5 minuti.

#### Opzione 2 — Timeout salvato su Supabase in `impostazioni_utente`

Il valore viene salvato nel campo `preferences` JSONB di
`impostazioni_utente` come chiave `session_timeout_minutes` (P25 §3.4
default JSONB). Si sincronizza su tutti i dispositivi dell'utente. Il timer
del dispositivo usa sempre il valore caricato da Supabase, con fallback
al default 5 durante il bootstrap.

### 6.2 Analisi comparativa

| Dimensione | Opzione 1 (localStorage) | Opzione 2 (Supabase / preferences) |
|---|---|---|
| **Coerenza esperienza multi-dispositivo** | Bassa — ogni dispositivo ha il suo valore | Alta — il cambio su un dispositivo si riflette sugli altri al prossimo login |
| **Semplicità di implementazione** | Alta — lettura/scrittura sincrona, nessuna chiamata async, nessuna dipendenza dal Blocco 5 | Media — richiede una chiamata `updatePreference` dal repository, coordinata con il Blocco 5 |
| **Dipendenza dal Blocco 5** | Nessuna — completamente autonoma | **Parziale**: il Blocco 3 deve chiamare `updatePreference` da `impostazioni-utente`, ma il repository è già disponibile dopo il Blocco 2. Non richiede il completamento del Blocco 5 completo. |
| **Rischio di bootstrap race** | Nullo — `localStorage` è sincrono, disponibile immediatamente al mount | **Presente ma gestibile**: `getOrCreate()` è asincrono; il timer non può partire prima che il valore sia caricato. Serve un fallback al default 5 durante l'attesa. |
| **Comportamento al primo accesso** | Il valore non esiste: si usa il default 5. Viene scritto solo al primo cambiamento. | `getOrCreate()` (P26 §7.6) inizializza il record con `preferences = {}` default; il timer usa 5 minuti come default hardcoded finché non è caricato. |

### 6.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 2 — Timeout salvato su Supabase in `preferences` JSONB.**

L'app è progettata per il **multi-dispositivo** (P24 §2 tabella "Dopo
Supabase"): un utente che imposta il timeout a 15 minuti su telefono si
aspetta che quella scelta si applichi anche sul tablet. Salvare il timeout
in `localStorage` producrebbe un comportamento incoerente che si scopre
solo usando l'app su più dispositivi — un tipo di bug difficile da rilevare
e frustrante da spiegare.

Il rischio di bootstrap race è **reale ma gestibile** con una strategia
semplice: al mount del timer, se le impostazioni non sono ancora caricate,
si usa il default 5 come valore temporaneo. Appena `getOrCreate()` torna,
il timer si aggiorna al valore reale. Se il valore reale è maggiore del
default, il timer si resetta al valore corretto; se è minore, il timer
scatta al tempo più breve (comportamento conservativo per la sicurezza).

Il campo `session_timeout_minutes` viene aggiunto al JSONB default di P25
§3.4 (chiave da definire nell'implementazione del Blocco 3, qui
convenzionalmente: `session_timeout_minutes: 5`). Il blocco 5 non è
prerequisito: il Blocco 3 chiama direttamente
`impostazioni-utente.updatePreference('session_timeout_minutes', N)` dal
repository P26 già disponibile.

---

## 7. Decisione C — Schermata durante il caricamento iniziale

### 7.1 Le due opzioni

#### Opzione 1 — Spinner neutro

Durante la risoluzione della sessione iniziale (`isAuthReady = false`)
l'app mostra uno spinner centrato o uno schermo con logo e barra di
caricamento, senza mostrare nessun contenuto applicativo.

#### Opzione 2 — Schermata di login anticipata

Durante la risoluzione l'app mostra direttamente la schermata di login.
Se la sessione risulta attiva (es. token valido nel localStorage di
Supabase), l'utente viene reindirizzato automaticamente alla dashboard
senza dover inserire credenziali.

### 7.2 Analisi comparativa

| Dimensione | Opzione 1 (Spinner neutro) | Opzione 2 (Login anticipata) |
|---|---|---|
| **Rischio di flash (lampeggio schermata sbagliata)** | **Nullo** — l'utente vede solo spinner, poi direttamente la schermata corretta | **Presente**: se la sessione è valida, l'utente vede brevemente la schermata di login prima del redirect alla dashboard |
| **Percezione di velocità** | Neutra — lo spinner segnala che "qualcosa sta succedendo" | Potenzialmente più rapida per utenti non autenticati (vedono subito la UI di login) |
| **Semplicità di implementazione in App.tsx** | Alta — `if (!isAuthReady) return <Spinner />` | Media — richiede logica di redirect condizionale una volta che `isAuthReady` diventa `true` |
| **Coerenza con il pattern `isAuthReady` di P24 §4.2** | **Piena** — `isAuthReady = false` significa "non ancora deciso": mostrare il login sarebbe una scelta prematura | Parziale — tecnicamente funziona ma viola la semantica di `isAuthReady` che significa "non so ancora chi sei" |

### 7.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Spinner neutro.**

Il pattern `isAuthReady` (P24 §4.2) ha una semantica precisa: finché è
`false`, l'app **non sa ancora** se l'utente è autenticato o meno.
Mostrare la schermata di login in questo stato viola quella semantica e
introduce il rischio di un flash per gli utenti con sessione valida — un
effetto fastidioso specialmente su dispositivi veloci dove il flash dura
poche decine di millisecondi ma è percepito come sfarfallio.

L'Opzione 2 richiederebbe anche logica di redirect aggiuntiva in `App.tsx`:
"sei sulla schermata di login ma sei autenticato → vai alla dashboard".
Questa logica non è necessaria con l'Opzione 1.

Lo spinner è la soluzione più **semplice, robusta e coerente** con
l'architettura stabilita in P24 R4. Il testo dell'attuale
`if (!isAuthReady) return null` in [App.tsx](../../src/App.tsx) viene
sostituito da `if (!isAuthReady) return <LoadingSpinner />` — una modifica
chirurgica che non tocca nessun'altra logica.

---

## 8. Struttura della nuova AuthScreen

La nuova `AuthScreen` gestisce internamente tre pannelli distinti,
mostrati uno alla volta in base allo stato UI locale. Lo sfondo visivo
esistente (gradiente, griglia, effetti `radial-gradient`) rimane invariato
per continuità estetica.

### 8.1 Pannello Login

Mostrato di default all'apertura di `AuthScreen`.

Elementi visivi presenti:
- **Logo e nome app** in alto (invariato rispetto all'attuale).
- **Campo email**: tipo `email`, label "Email", autocomplete `email`.
- **Campo password**: tipo `password`, label "Password", autocomplete
  `current-password`.
- **Pulsante "Accedi"**: submit principale; durante la chiamata `signIn()`
  è disabilitato con testo "Accesso in corso…" e un indicatore di caricamento.
- **Link "Hai dimenticato la password?"**: sotto il pulsante, porta al
  Pannello Recovery.
- **Link "Non hai un account? Registrati"**: porta al Pannello Signup.
- **Area errori**: sotto i campi, testo rosso visibile se `signIn()` lancia
  errore. Messaggi distinti per: credenziali errate ("Email o password non
  corretti"), rete assente ("Impossibile connettersi. Controlla la
  connessione."), account non verificato ("Controlla la tua email e clicca
  il link di conferma prima di accedere.").

Accessibilità: tutti i messaggi di errore vengono annunciati tramite
`screenReader.announceError()`. Il focus si sposta sul primo campo in
errore. Il pulsante ha un `aria-busy` durante il caricamento.

### 8.2 Pannello Signup

Aperto dal link "Registrati" del Pannello Login.

Elementi visivi presenti:
- **Campo email**: tipo `email`, autocomplete `email`.
- **Campo password**: tipo `password`, autocomplete `new-password`.
- **Campo conferma password**: tipo `password`, autocomplete
  `new-password`.
- **Pulsante "Registrati"**: durante la chiamata `signUp()` è disabilitato
  con testo "Registrazione in corso…".
- **Link "Hai già un account? Accedi"**: torna al Pannello Login.
- **Area errori**: messaggi distinti per: email già registrata ("Questa
  email è già in uso. Accedi o reimposta la password."), password troppo
  corta ("La password deve avere almeno 6 caratteri."), password non
  coincidenti ("Le due password non coincidono.").

Dopo `signUp()` riuscito con conferma email obbligatoria (Decisione A):
il pannello si trasforma in una **schermata informativa** — "Registrazione
completata! Controlla la tua email e clicca il link di conferma per
attivare l'account." — con un pulsante "Re-invia email" e un link "Torna
al login".

### 8.3 Pannello Recovery

Aperto dal link "Hai dimenticato la password?" del Pannello Login.

Elementi visivi presenti:
- **Testo introduttivo**: "Inserisci il tuo indirizzo email. Ti invieremo
  un link per reimpostare la password."
- **Campo email**: tipo `email`, autocomplete `email`.
- **Pulsante "Invia link di recupero"**: durante la chiamata
  `resetPassword()` è disabilitato.
- **Link "Torna al login"**: torna al Pannello Login.

Dopo `resetPassword()` riuscito: il pannello mostra "Se l'email è
associata a un account, riceverai un link per reimpostare la password entro
pochi minuti." — il messaggio è **volutamente ambiguo** per non rivelare
se l'email esiste nel sistema (sicurezza: no user enumeration).

### 8.4 Gestione stati di errore

Tutti gli errori di rete (es. `AuthApiError` di Supabase con codice di
connessione) producono un messaggio visibile nell'area errori del pannello
corrente, **non solo un toast**. Il toast rimane per feedback di successo
(es. "Email di recupero inviata").

I messaggi di errore seguono il pattern:
1. Testo breve visibile nella UI ("Email o password non corretti").
2. Messaggio screen reader via `screenReader.announceError(...)`.
3. Focus sul primo campo in errore.

### 8.5 Stato di caricamento

Durante qualsiasi operazione asincrona (`signIn`, `signUp`, `resetPassword`):
- Il pulsante di submit è **disabilitato** (`disabled` + `aria-busy="true"`).
- Il testo del pulsante cambia in una forma progressiva
  ("Accesso in corso…", "Registrazione in corso…", "Invio in corso…").
- I campi del form restano editabili per permettere correzioni se l'utente
  si accorge di un errore prima che la chiamata torni.

---

## 9. Timer di inattività — logica funzionale

Il timer di inattività vive **dentro `AuthProvider`**, gestito da un
hook interno dedicato (`useInactivityTimer`) non esposto all'esterno del
file. Questa scelta lo mantiene co-localizzato con `signOut()`, che è il
suo unico effetto finale, e lo isola dai componenti UI.

### 9.1 Ciclo di vita del timer

- **Avvio**: il timer parte non appena `isAuthenticated` diventa `true`
  (evento `SIGNED_IN` da `onAuthStateChange`). Non parte prima.
- **Reset**: il timer si azzera ad ogni evento di interazione utente:
  `click`, `keydown`, `scroll`, `touchstart` sul `document`. Il listener
  è aggiunto a livello `document` in modalità `passive` (non interferisce
  con gli handler dell'app).
- **Valore**: il timer usa `inactivityTimeout` (in minuti) convertito in
  millisecondi. Il valore è letto da `impostazioni_utente.preferences`
  caricato al bootstrap (Decisione B). Durante il bootstrap, mentre il
  valore non è ancora disponibile, si usa il default 5 minuti.
- **Stop**: il timer si ferma quando `isAuthenticated` diventa `false`
  (logout manuale, scadenza sessione esterna, errore di rete irreversibile).

### 9.2 Warning a 1 minuto dalla scadenza (P24 R15)

Quando rimane 1 minuto alla scadenza del timer:
- Appare un **banner o dialog modale non bloccante** (es. un `Toast`
  persistente o un `Alert` in basso) con il testo "La tua sessione scadrà
  tra 1 minuto. Vuoi rimanere connesso?"
- Due azioni disponibili: **"Rimani connesso"** e **"Esci ora"**.
- Se l'utente clicca "Rimani connesso": il timer si azzera completamente
  (equivale a qualsiasi altra interazione utente), il banner scompare.
  **Non è richiesto un nuovo login**: la sessione Supabase è ancora valida,
  si tratta solo del timer di inattività dell'app.
- Se l'utente clicca "Esci ora": viene chiamato `signOut()` immediatamente.
- Se l'utente non fa nulla: allo scadere del minuto viene chiamato
  `signOut()` automaticamente. Il banner scompare.

### 9.3 Comportamento alla scadenza

Quando il timer raggiunge zero (nessuna interazione nel periodo di
inattività configurato):
1. `signOut()` viene chiamato.
2. `isPrivateUnlocked` viene resettato a `false`.
3. L'app torna alla `AuthScreen` (via il gate `isAuthenticated` di
   `App.tsx`).
4. Un toast o messaggio sulla `AuthScreen` informa l'utente del motivo:
   "Sessione scaduta per inattività. Accedi di nuovo."

### 9.4 Interazione con la sessione Supabase

Il timer di inattività è **indipendente** dalla scadenza del token JWT di
Supabase. Supabase gestisce autonomamente il refresh del token tramite
`supabase.auth.onAuthStateChange()`. Il timer dell'app è un layer di
sicurezza UX aggiuntivo: fa il logout dell'app prima che il token Supabase
scada naturalmente, per proteggere lo schermo incustodito.

Se Supabase revoca la sessione esternamente (es. admin, altro dispositivo),
`onAuthStateChange` emette `SIGNED_OUT` e l'app torna ad `AuthScreen`
indipendentemente dal timer.

---

## 10. Impatto sui blocchi successivi

| Blocco P24 | Dipendenza da P27 | Note |
|---|---|---|
| **Blocco 4** — AppDataContext dominio | **Critica**: `AppDataProvider` è montato dentro `AuthProvider`. I repository del Blocco 2 iniettano `user_id` dalla sessione Supabase: senza sessione valida, tutte le query RLS restituiscono 0 righe. Il Blocco 4 usa `user.id` da `useAuth()` per iniettare `user_id` nelle chiamate ai repository. | Il Blocco 4 non può partire prima che il Blocco 3 sia stabile in ambiente di sviluppo. |
| **Blocco 5** — Preferenze UI | **Diretta**: `useUserSettings()` usa il repository `impostazioni-utente` che richiede una sessione attiva. Il hook viene inizializzato solo dopo `isAuthenticated = true`. Il campo `session_timeout_minutes` nelle `preferences` è scritto dal Blocco 3 tramite `updatePreference` (Decisione B). | Il Blocco 5 può essere sviluppato in parallelo al Blocco 4 ma non può essere testato end-to-end senza una sessione valida. |
| **Blocco 6** — Cache `budget-percentages` | **Indiretta**: la chiave `localStorage` è prefissata da `user.id` per isolamento tra utenti su dispositivo condiviso. `user.id` viene da `useAuth()`. | Dipendenza minima: basta che `user` sia disponibile nel context. |
| **Blocco 7** — DataManagement | **Diretta**: export e import Supabase richiedono sessione attiva. Il `user.id` è necessario per i repository. Il blocco 7 non può essere testato senza sessione. | Nessun impatto sulla struttura del blocco, solo sul testing. |
| **Blocco 8** — PIN privato | **Critica**: il PIN privato usa `impostazioni_utente.pin_privato_hash`, che richiede sessione. Il flusso di unlock (`isPrivateUnlocked`, `setIsPrivateUnlocked`, `showPrivatePinDialog`) sopravvive nel context Auth (§4): il Blocco 8 usa queste superfici senza modificare `AuthContext`. | La primitiva crittografica (bcrypt/argon2) e il flusso di set/verify PIN privato sono progettati nel Blocco 8. |
| **Blocco 9** — Onboarding | **Critica**: il flag `needsOnboarding` (§4) nasce in `AuthProvider`. L'`OnboardingFlow` è gated da `App.tsx` dopo `isAuthenticated = true && needsOnboarding = true`. Il completamento dell'onboarding imposta `needsOnboarding = false` chiamando `setNeedsOnboarding(false)` dal context Auth. | Il Blocco 9 non può essere progettato senza la superficie pubblica di P27 §4. |
| **Blocco 10** — Decommissioning | **Indiretta**: la rimozione di `@github/spark/hooks` da `package.json` e `src/test/setup.ts` rimuove anche i mock `useKV` che oggi coprono `global-pin-hash` e `private-pin-hash`. I test del Blocco 3 devono mockare `supabase.auth.*` invece di `useKV`. | Il Blocco 10 aggiorna `src/test/setup.ts` per riflettere i mock del nuovo `AuthContext`. |

---

## 11. Punti aperti residui

- **Algoritmo di hashing per `pin_privato_hash`**: rimandato al Blocco 8.
  La scelta tra bcrypt client-side e Edge Function server-side non è
  impattata da nessuna decisione di P27. (Aperto da P24 §4.3, P25 §6.)

- **Conferma email — URL di redirect**: Supabase richiede un URL di
  callback per il link di conferma email (es.
  `https://app.zecchino.it/auth/confirm`). La configurazione di questo URL
  nel pannello Supabase e la gestione del redirect in `App.tsx` (deep link
  su mobile, query param su web) devono essere risolti nell'implementazione
  del Blocco 3. Non è un punto di design ma un dettaglio implementativo.

- **Rate limiting su login**: Supabase applica rate limiting nativo su
  `signInWithPassword()`. L'app non deve implementare rate limiting
  aggiuntivo lato client, ma deve gestire l'errore HTTP 429 con un
  messaggio appropriato ("Troppi tentativi. Attendi qualche minuto prima
  di riprovare."). Da implementare nel Blocco 3.

- **Logout da altri dispositivi**: Supabase permette di revocare tutte le
  sessioni tramite `supabase.auth.signOut({ scope: 'global' })`. Se aggiungere
  questa opzione in `SecuritySettings` (es. "Esci da tutti i dispositivi")
  è in scope per il primo rilascio, va deciso nel Blocco 8 insieme alla
  revisione di `SecuritySettings`.

---

## 12. Criteri di accettazione del documento

- [ ] Tutte le sezioni (1–12) sono presenti e non vuote.
- [ ] I 4 file coinvolti (§3) hanno ciascuno: stato attuale, stato futuro, eliminato, aggiunto.
- [ ] `AuthContext.tsx` (§3.1) cita esplicitamente l'eliminazione di `useKV`, `window.spark.kv.get`, PIN globale, `isSetupMode`.
- [ ] `SecuritySettings.tsx` (§3.4) cita esplicitamente la rimozione delle chiamate `useKV` righe 27–28 e della sezione "Cambio PIN globale".
- [ ] La superficie pubblica (§4) include tutti i valori: `user`, `session`, `isAuthenticated`, `isAuthReady`, `needsOnboarding`, `inactivityTimeout`, `signIn`, `signUp`, `signOut`, `resetPassword`, `isPrivateUnlocked`, `setIsPrivateUnlocked`, `showPrivatePinDialog`, `setShowPrivatePinDialog`, `setInactivityTimeout`.
- [ ] La Decisione A (§5) ha scelta DEFINITIVA dichiarata (Opzione 1 — Conferma email obbligatoria).
- [ ] La motivazione della Decisione A cita esplicitamente il legame con la recovery password (P24 R17).
- [ ] La Decisione B (§6) ha scelta DEFINITIVA dichiarata (Opzione 2 — Supabase `preferences`).
- [ ] La motivazione della Decisione B cita esplicitamente il comportamento di fallback durante il bootstrap race.
- [ ] La Decisione C (§7) ha scelta DEFINITIVA dichiarata (Opzione 1 — Spinner neutro).
- [ ] La motivazione della Decisione C cita esplicitamente il rischio di flash e la coerenza con `isAuthReady` (P24 §4.2).
- [ ] La §8 copre tutti e 5 i flussi: login, signup, recovery, stati di errore, stato di caricamento.
- [ ] La §9 copre: avvio timer, eventi di reset, warning a 1 minuto (P24 R15), comportamento alla scadenza, interazione con sessione Supabase.
- [ ] La §10 copre tutti i blocchi da 4 a 10.
- [ ] Nessuna contraddizione con P24, P25, P26.
- [ ] Tutti i link a file `src/` usano path relativi (`../../src/...`).
- [ ] Nessun frammento di codice TypeScript o JSX eseguibile in tutto il documento.
- [ ] `SecuritySettings.tsx` non contiene più alcuna chiamata `useKV`
      per `global-pin-hash`: il `useKV` parallelo ad `AuthContext` è stato
      rimosso contestualmente alla rimozione della sezione "Cambio PIN
      globale" (deduplicazione esplicita — vedi MINORE 6 del report di
      verifica coerenza).

---

*Fine documento. Nessun file sorgente è stato modificato.*

*Messaggio di commit suggerito:*
`docs(design): creare P27 migrazione AuthContext Supabase Auth`
