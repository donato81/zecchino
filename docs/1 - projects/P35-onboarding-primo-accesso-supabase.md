# P35 — Onboarding primo accesso Supabase

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P35 — Onboarding primo accesso Supabase |
| **Tipo intervento** | Documento di design (sola lettura) |
| **Branch** | `refactoring-architettura` |
| **Data** | 30 aprile 2026 |
| **Autore** | Agent-Design |
| **File modificati** | `src/components/OnboardingFlow.tsx` (nuovo) · `src/App.tsx` (gate onboarding) · `src/context/AuthContext.tsx` (aggiunta `completeOnboarding()` alla superficie pubblica) |
| **Documenti di riferimento** | [P24](./P24-architettura-migrazione-supabase.md) · [P25](./P25-schema-impostazioni-utente-cifrato.md) · [P26](./P26-strato-accesso-dati-supabase.md) · [P27](./P27-migrazione-authcontext-supabase.md) · [P28](./P28-migrazione-appdatacontext-supabase.md) · [P33](./P33-migrazione-categorymanagement-useappdata.md) · [P34](./P34-migrazione-datamanagement-supabase.md) · [App.tsx](../../src/App.tsx) · [AuthScreen.tsx](../../src/components/AuthScreen.tsx) |
| **Stato** | Bozza — in attesa di validazione |

> **Questo documento è vincolante per tutti i design operativi successivi (P36 in poi).
> Le decisioni qui contenute sono già state validate e non vengono rimesse in discussione:
> i design successivi possono solo dettagliarne l'implementazione, non cambiarne la sostanza.**

---

## §2 — Contesto

### Stato attuale al primo accesso

Con il sistema Spark attuale, [`AuthContext.tsx`](../../src/context/AuthContext.tsx) gestisce
l'autenticazione tramite un PIN globale a 4-6 cifre salvato nel KV Spark. Al primo avvio
dell'app, se non è presente alcun PIN nel KV, il componente entra in modalità setup:
[`AuthScreen.tsx`](../../src/components/AuthScreen.tsx) mostra il `PinDialog` con
`confirmMode = true` per consentire all'utente di impostare il PIN. Completata questa
operazione, l'app è immediatamente accessibile nella sua interezza. Non esiste nessuna
schermata di configurazione guidata: le categorie di default vengono inizializzate dalla
logica lato client al primo utilizzo, il nome utente non esiste come concetto, la valuta
è fissa.

### Perché questo schema non funziona dopo la migrazione a Supabase

Dopo la distribuzione del Blocco 3 (P27), l'autenticazione passa a Supabase Auth con
email e password. Il primo login — sia per un utente completamente nuovo, sia per un
utente migrato da Spark — produce una sessione Supabase valida ma lascia il sistema in
uno stato strutturalmente incompleto per tre ragioni distinte.

**Prima ragione — record `impostazioni_utente` parziale**: il record viene creato da
`impostazioni-utente.getOrCreate()` (P26 §7.6) al bootstrap di `AuthContext` (P27 §3.1),
ma `nome_visualizzato` è `NULL`, `valuta_default` è il default `'EUR'` di P25 §3.4, e
`preferences` contiene i valori default senza il flag `onboarding_completed`. L'app è
tecnicamente funzionante ma l'utente non ha mai avuto modo di configurare il proprio
profilo minimo.

**Seconda ragione — assenza di categorie template**: la tabella `categorie` su Supabase
non contiene righe con `predefinita: true` per l'utente. `AppDataContext` carica un array
di categorie vuoto o con le sole categorie personalizzate eventualmente migrate da P33
Decisione B. Le categorie template (`predefinita: true, user_id: null`) esistono su
Supabase solo dopo che la funzione `seed_default_categories(user_id)` è stata invocata.
Senza di esse, `CategoryManagement.tsx` mostra un'app senza struttura categoriale di
partenza, e — più critico — le transazioni storiche dell'utente migrato da Spark con
`categoria_id` valorizzato non possono essere inserite su Supabase per violazione del
vincolo referenziale FK.

**Terza ragione — dashboard vuota senza guida**: un utente nuovo si trova davanti a una
dashboard senza conti, senza saldo, senza nessuna indicazione su come iniziare.

P35 risolve queste tre carenze attraverso il flusso di onboarding guidato descritto in
questo documento.

### Dipendenza critica con P34: risoluzione di PA-6

[P34 §10](./P34-migrazione-datamanagement-supabase.md) e PA-6 (P34 §11) identificano
una dipendenza aperta tra il Blocco 9 (onboarding) e il Fronte A della migrazione
one-shot di `DataManagement.tsx`: le transazioni con `categoria_id` valorizzato
referenziano categorie che devono già esistere nella tabella `categorie` su Supabase al
momento dell'inserimento (vincolo FK). P34 PA-6 propone due alternative senza scegliere,
demandando la decisione a questo documento.

**P35 risolve PA-6 scegliendo l'Alternativa 1**: `seed_default_categories(user_id)` viene
chiamata come passo esplicito (passo 4) del flusso di onboarding di `OnboardingFlow.tsx`,
garantendo che le categorie template siano disponibili su Supabase prima che l'utente
possa accedere a `DataManagement.tsx`. La motivazione completa è documentata nella
Decisione A al §5. Il coordinamento operativo con P34 Fronte A è descritto al §8.

### Dipendenza con P33 Decisione B

P33 Decisione B ha scelto la migrazione one-shot automatica delle categorie personalizzate
(da KV Spark a Supabase) come operazione eseguita da `AppDataContext` al primo login
post-distribuzione P33. P35 non modifica e non sostituisce questo meccanismo.

Il coordinamento è il seguente: P35 (onboarding) si occupa del seed delle categorie
template (`predefinita: true, user_id: null`); P33 Decisione B si occupa del ripristino
delle categorie personalizzate dell'utente (`predefinita: false, user_id: ID utente`).
I due meccanismi operano su insiemi distinti di righe nella tabella `categorie` e sono
tra loro ortogonali.

P33 §4 stabilisce che `seed_default_categories(user_id)` «deve essere completato prima
che `CategoryManagement` sia accessibile». P35 garantisce questa precondizione rendendo
il seed un passo non saltabile del flusso di onboarding (§6 passo 4), completato prima
che l'app principale sia raggiungibile dall'utente.

---

## §3 — File coinvolti e loro trasformazione

### 3.1 `src/components/OnboardingFlow.tsx` — file nuovo

**Responsabilità**: componente React che guida l'utente attraverso la configurazione
iniziale dell'account al primo accesso post-registrazione. È mostrato in
[`App.tsx`](../../src/App.tsx) al posto della dashboard quando `needsOnboarding = true`
in `AuthContext` (P27 §3.1). Viene smontato definitivamente al completamento del flusso,
quando `completeOnboarding()` di `AuthContext` imposta `needsOnboarding = false`.

**Cosa mostra**: una progressione di schermate guidate con indicatore di avanzamento
visivo («Passo N di 5»), accessibile via screen reader tramite aggiornamenti su
`aria-live="polite"` a ogni transizione di passo. Ogni passo ha un titolo, una
descrizione, un input o un'azione, e un pulsante di avanzamento. I passi obbligatori
non permettono di proseguire finché l'operazione associata non è completata con successo.
Il passo 5 (facoltativo) espone un pulsante «Salta per ora» chiaramente visibile.
L'utente può tornare ai passi precedenti tramite un pulsante «Indietro» (disabilitato
al passo 1).

**Quando viene montato**: immediatamente dopo l'autenticazione, quando `isAuthenticated = true`
e `needsOnboarding = true` in `AuthContext`. Il componente non viene mai mostrato a un
utente con `preferences.onboarding_completed = true`.

**Quando viene smontato**: al completamento del passo 6, dopo che `completeOnboarding()`
di `AuthContext` imposta `needsOnboarding = false`. [`App.tsx`](../../src/App.tsx)
re-renderizza e mostra la dashboard principale con i dati già caricati.

**Dipendenze di runtime**:
- `useAuth()` per ottenere `user.id` e chiamare `completeOnboarding()` al passo 6.
- `useAppData()` per chiamare `refreshAll()` al completamento del flusso.
- Repository `impostazioni-utente` (P26 §7.6) per le scritture dei passi 2, 3 e 6.
- Repository `conti` (P26 §7.1) per la scrittura del passo 5.
- Funzione `seed_default_categories(user_id)` per il passo 4 (PA-2 §10).

**Cosa NON fa**: non accede a `window.spark.kv.*`; non legge né scrive le chiavi di
preferenze già migrate da P29/P31; non tocca `legacy_categories_migrated` (competenza
esclusiva di P33 in `AppDataContext`); non chiama `window.location.reload()`.

### 3.2 `src/App.tsx` — aggiunta del gate onboarding

**Stato attuale** (post-P27, pre-P35):

La sequenza dei gate condizionali in [`App.tsx`](../../src/App.tsx) segue questo ordine
all'interno della funzione `AppContent`:

1. `if (!isAuthReady) return null` — blocca il render durante la risoluzione della
   sessione Supabase (la sostituzione con uno spinner è già prevista da P27 Decisione C,
   ma non cambia la posizione del gate nella sequenza).
2. `if (!isAuthenticated) return <AuthScreen />` — mostra la schermata di autenticazione
   se l'utente non è loggato.
3. Altrimenti: app principale, con gate interno su `isDataReady` per lo spinner di
   caricamento dati (P28 §8 punto 5).

P27 §3.3 ha già anticipato l'aggiunta del gate `needsOnboarding` ma non è ancora
implementato prima di P35.

**Stato dopo P35**:

Viene inserito un terzo gate condizionale nella sequenza, tra il gate `isAuthenticated`
e la dashboard:

`if (needsOnboarding) return <OnboardingFlow />`

La sequenza completa dei gate diventa:

1. `if (!isAuthReady)` → spinner (invariato)
2. `if (!isAuthenticated)` → `<AuthScreen />` (invariato)
3. `if (needsOnboarding)` → `<OnboardingFlow />` (**nuovo — aggiunto da P35**)
4. `if (!isDataReady)` → spinner dati (invariato nella posizione relativa)
5. altrimenti → dashboard principale

**Tutti gli altri gate** (isLoading, isDataReady, errori di AppDataContext), la gerarchia
dei provider (`AuthProvider` → `AppDataProvider` → `VisibleDataProvider`), i componenti
figli e tutta la logica di `AppContent` non vengono toccati da P35 eccetto l'aggiunta
del gate descritto.

**Import aggiunto**: `OnboardingFlow` da `@/components/OnboardingFlow`.

### 3.3 `src/context/AuthContext.tsx` — aggiunta `completeOnboarding()`

**Stato attuale** (da P27 §3.1): la superficie pubblica di [`AuthContext.tsx`](../../src/context/AuthContext.tsx)
include `user`, `session`, `isAuthenticated`, `isAuthReady`, `needsOnboarding`, `signIn`,
`signUp`, `signOut`, `resetPassword`, `inactivityTimeout`, `setInactivityTimeout`. Non
include nessuna funzione per segnalare il completamento dell'onboarding.

**Aggiunta necessaria da P35**: la superficie pubblica deve esporre `completeOnboarding()`,
una funzione senza argomenti che:

- imposta `needsOnboarding = false` nello stato locale di `AuthContext`;
- non effettua nessuna scrittura su Supabase (la scrittura di
  `preferences.onboarding_completed = true` è già stata eseguita da `OnboardingFlow`
  al passo 6 tramite `impostazioni-utente.updatePreference('onboarding_completed', true)`
  — P26 §7.6);
- è idempotente: chiamarla più volte non ha effetti aggiuntivi.

**Motivazione**: `OnboardingFlow` deve poter segnalare al gate di `App.tsx` che il flusso
è completato. Poiché `needsOnboarding` è uno stato interno di `AuthContext`, solo
`AuthContext` può impostarlo a `false`. `completeOnboarding()` è il punto di contatto
dichiarato tra `OnboardingFlow` e `AuthContext`. Il dettaglio implementativo (aggiornamento
del tipo `AuthContextType` o equivalente) è a carico del coding plan del Blocco 9 (PA-6
§10).

**Nessun'altra modifica a `AuthContext`**: la logica di bootstrap che determina
`needsOnboarding` dalla lettura di `impostazioni_utente.preferences.onboarding_completed`
(P27 §3.1) non cambia. Il flag viene letto al bootstrap; la transizione a `false` avviene
solo tramite `completeOnboarding()`.

---

## §4 — Definizione di "utente nuovo" vs "utente esistente"

Le tre tipologie di utente che possono trovarsi con `needsOnboarding = true` o `false`
al momento del login sono definite dalla seguente tabella. La distinzione è rilevante
perché determina cosa trova l'utente nell'app principale dopo il completamento
dell'onboarding.

| Profilo utente | Segnale di riconoscimento al bootstrap | Valore `needsOnboarding` | Comportamento post-onboarding |
|---|---|---|---|
| **Utente nuovo** | `impostazioni_utente` non esiste → `getOrCreate()` lo crea con defaults P25 §3.4. `preferences.onboarding_completed` è assente nel JSONB (il JSON di default non include questa chiave — PA-4 §10). | `true` | Dashboard vuota senza dati. `AppDataContext` carica array vuoti da Supabase. P33 Decisione B non trova categorie da migrare (KV Spark vuoto o assente). Il passo 4 dell'onboarding ha già inserito le categorie template. |
| **Utente esistente migrato da Spark** | `impostazioni_utente` esiste (creato da P27 `getOrCreate()` al primo login post-P27). `preferences.onboarding_completed` è assente o `false`. L'utente ha dati di dominio nel KV Spark (`accounts`, `transactions`, `budgets`, `savings-goals`). | `true` | Dashboard carica con array vuoti da Supabase (dati ancora nel KV Spark). P33 Decisione B migra automaticamente le categorie personalizzate in `AppDataContext`. `DataManagement.tsx` mostra il pannello di migrazione one-shot P34 Fronte A perché `legacy_domain_migrated` non è ancora `true`. Il passo 4 dell'onboarding ha già inserito le categorie template. |
| **Utente già su Supabase con onboarding completato** | `impostazioni_utente` esiste. `preferences.onboarding_completed = true`. | `false` | Dashboard mostrata direttamente senza flusso di onboarding. Il gate `needsOnboarding` in `App.tsx` non si attiva. |

**Nota sul trattamento uniforme dei primi due profili**: P35 non differenzia il flusso
di onboarding tra "utente nuovo" e "utente migrato da Spark". Entrambi attraversano gli
stessi passi (§6). La distinzione tra i due profili è interamente delegata ai meccanismi
post-onboarding: P33 Decisione B in `AppDataContext` gestisce il ripristino delle
categorie personalizzate; P34 Fronte A in `DataManagement.tsx` gestisce la migrazione dei
dati di dominio. Un utente migrato da Spark che sa di avere conti nel KV può saltare il
passo 5 (creazione del primo conto) e attendere la migrazione tramite P34 Fronte A.

**Nota sulla prevenzione dei loop di onboarding**: se l'utente chiude l'app durante
l'onboarding prima del passo 6, al login successivo `needsOnboarding = true` perché
`preferences.onboarding_completed` non è ancora `true`. Il flusso riappare. Il
comportamento per i dati già scritti nei passi completati prima dell'interruzione è
definito al §10 PA-5.

---

## §5 — Decisione A: quando viene chiamata `seed_default_categories`

### Il punto aperto

Questa sezione risolve **PA-6 di [P34 §11](./P34-migrazione-datamanagement-supabase.md)**.

P34 §10 e PA-6 identificano la dipendenza tra il Blocco 9 (onboarding) e il Fronte A
della migrazione one-shot di `DataManagement.tsx`: le transazioni con `categoria_id`
valorizzato referenziano categorie che devono già esistere nella tabella `categorie` su
Supabase prima che il Fronte A tenti di inserirle (vincolo FK su `transazioni.categoria_id`).
P34 PA-6 propone due alternative senza decidere:

1. Il Blocco 9 (onboarding) garantisce il seed prima che l'utente acceda a
   `DataManagement.tsx`.
2. P34 Fronte A gestisce nel report di errore le transazioni con `categoria_id`
   non valido.

### Analisi comparativa

| Dimensione | Alternativa 1 — Seed durante onboarding (Blocco 9) | Alternativa 2 — Gestione errore FK in P34 Fronte A |
|---|---|---|
| **Garanzia di disponibilità categorie per P34 Fronte A** | **Piena**: il seed avviene al passo 4 dell'onboarding, prima che l'utente possa accedere a `DataManagement.tsx`. Le transazioni con `categoria_id` trovano sempre la FK corrispondente al momento dell'inserimento. | **Nessuna garanzia**: P34 deve gestire errori FK sulle categorie nel report di errore e segnalare le transazioni non migrate. L'utente deve eseguire una seconda sessione di migrazione manualmente dopo aver completato il Blocco 9. |
| **Impatto sull'ordine di distribuzione dei blocchi** | Il Blocco 9 deve essere distribuito prima o contestualmente al Blocco 7 (P34). L'ordine è esplicito e verificabile prima del deploy. | Il Blocco 7 può essere distribuito indipendentemente dal Blocco 9, ma il Fronte A produce risultati degradati (transazioni con categoria non migrate) fino al completamento successivo del Blocco 9. Il rischio di un deploy disordinato è reale. |
| **Esperienza utente per l'utente migrato da Spark** | **Ottimale**: dopo l'onboarding e la migrazione P34, le transazioni sono migrate con le loro categorie associate senza record orfani. Il report di migrazione non contiene errori FK imputabili al seed mancante. | **Degradata**: l'utente vede nel report di migrazione P34 un elenco di transazioni non migrate per errore FK. Il messaggio di errore rimanda a un'operazione (onboarding) che l'utente potrebbe non sapere come completare. Il danno è percepito come perdita parziale di dati storici. |
| **Complessità architetturale** | **Contenuta**: il seed è un passo esplicito del flusso di onboarding, con gestione degli errori definita (PA-2 §10). Non richiede logica aggiuntiva in P34 per distinguere errori FK da categorie template mancanti da errori FK da altri motivi. | **Elevata**: P34 Fronte A deve implementare un path di errore FK specializzato (distinto dall'errore di rete generico), accumulare le transazioni non migrate per categoria non trovata, mostrare istruzioni specifiche su come risolvere il problema, e prevedere una logica di retry per le sole transazioni FK-fallite dopo il completamento del Blocco 9. |
| **Rischio di seed duplicati (idempotenza)** | Presente se il seed viene chiamato più volte per interruzioni successive durante il passo 4. La funzione `seed_default_categories(user_id)` deve essere **idempotente** (PA-2 §10). Il rischio è gestibile e circoscritto al passo 4. | Assente per il seed (non viene chiamato da P34). Ma il problema si sposta: P34 deve gestire in modo idempotente le transazioni parzialmente migrate nel retry post-FK-error, con logica aggiuntiva rispetto all'upsert standard di Decisione B (P34 §6). |
| **Coerenza con P33 §4** | **Piena**: P33 §4 stabilisce esplicitamente che `seed_default_categories(user_id)` viene chiamata «al completamento dell'onboarding (Blocco 9)» e che «il seed deve essere completato prima che `CategoryManagement` sia accessibile». L'Alternativa 1 implementa direttamente questa specifica. | **Parziale**: P33 §4 indica il Blocco 9 come momento del seed. Posticiparlo de facto all'avvio del Blocco 7 o al caricamento di `AppDataContext` crea un disallineamento con la specifica di P33 che richiederebbe una revisione retroattiva di quel documento. |

### Decisione finale e motivazione

**ALTERNATIVA SCELTA: Alternativa 1 — `seed_default_categories(user_id)` viene chiamata
come passo esplicito (passo 4) del flusso di onboarding di `OnboardingFlow.tsx`, prima
che l'utente possa accedere a `DataManagement.tsx` e all'app principale.**

Il fattore determinante è la garanzia di integrità referenziale per P34 Fronte A e la
qualità dell'esperienza utente per l'utente migrato da Spark. L'Alternativa 2 produce
un'esperienza degradata che non è recuperabile dall'utente in modo intuitivo: una
transazione non migrata per errore FK su categoria non esiste visivamente per l'utente
come un dato mancante, esiste come un errore tecnico nel report di migrazione. Chiedere
all'utente di comprendere il nesso tra «errore FK su categoria» e «completare l'onboarding»
non è realistico per uno strumento di gestione finanziaria personale dove i dati storici
hanno valore critico.

L'Alternativa 1 è la discendente diretta di P33 §4 e del principio stabilito da P24–P34:
le precondizioni di integrità devono essere soddisfatte prima che l'operazione che le
richiede sia resa accessibile all'utente.

**Impatto sull'ordine di distribuzione**: il Blocco 9 deve essere distribuito prima o
contestualmente al Blocco 7. Il coding plan del Blocco 7 deve verificare, come
precondizione di distribuzione, che il Blocco 9 sia già attivo in produzione o che venga
rilasciato nello stesso deploy.

---

## §6 — Flusso dell'onboarding: passi e ordine

Di seguito la specifica funzionale completa del flusso di `OnboardingFlow.tsx`. Non
contiene codice: è la specifica vincolante per il coding plan del Blocco 9.

### Precondizioni al momento del mount di `OnboardingFlow`

Il componente è mostrato solo quando `isAuthenticated = true` e `needsOnboarding = true`
in `AuthContext`. `AppDataProvider` è già montato come provider padre: per un utente
nuovo, il ciclo iniziale di `getAll()` in `AppDataContext` ha già completato con array
vuoti e `isDataReady = true`. L'oggetto `user` di `AuthContext` espone `user.id`
(necessario per le scritture su Supabase associate all'utente). Il record
`impostazioni_utente` esiste già su Supabase (creato da `getOrCreate()` al bootstrap
di `AuthContext` — P27 §3.1).

### Indicatore di avanzamento

Il componente mostra un indicatore di avanzamento visivo («Passo N di 5») per i passi
1–5 (il passo 6 è il completamento automatico, non espone un indicatore separato).
L'indicatore è accessibile via screen reader tramite aggiornamenti su `aria-live="polite"`
a ogni transizione di passo.

---

### Passo 1 — Benvenuto e presentazione dell'app

**Cosa vede l'utente**: schermata di benvenuto con il nome dell'app, una breve
descrizione dell'app («Zecchino ti aiuta a tenere traccia delle tue finanze personali»),
e un riepilogo sintetico dei passi che seguiranno. Pulsante «Inizia» per avanzare.

**Cosa viene scritto su Supabase**: nulla.

**Obbligatorio o saltabile**: il passo non è saltabile. È il punto di ingresso
obbligato del flusso.

**Comportamento in caso di interruzione**: se l'utente chiude l'app al passo 1, nessun
dato è stato scritto su Supabase. Al login successivo `needsOnboarding = true` e il
flusso riparte dal passo 1.

---

### Passo 2 — Inserimento nome visualizzato

**Cosa vede l'utente**: campo di testo etichettato «Come ti chiami?» pre-compilato con
la parte locale dell'indirizzo email dell'utente (es. `mario.rossi` estratto da
`mario.rossi@esempio.it`). L'utente può confermare il valore suggerito o sostituirlo
con un nome diverso. Nota informativa: «Il tuo nome verrà mostrato nell'intestazione
dell'app.»

**Cosa viene scritto su Supabase**: al click su «Avanti», il componente chiama
`impostazioni-utente.updateField('nome_visualizzato', valore)` (P26 §7.6). La scrittura
avviene prima di avanzare al passo successivo. Se la chiamata fallisce, viene mostrato
un messaggio di errore inline («Non è stato possibile salvare il nome, riprova.») e
l'utente può riprovare senza perdere il valore inserito nel campo. Il passo non avanza
finché la scrittura non ha avuto esito positivo.

**Obbligatorio o saltabile**: obbligatorio per avanzare. Il valore pre-compilato dalla
parte locale dell'email consente di procedere senza digitare.

**Comportamento in caso di interruzione**: se l'app viene chiusa dopo che la scrittura
è avvenuta con successo, al login successivo `nome_visualizzato` è già impostato su
Supabase. Il coding plan del Blocco 9 deve gestire questo caso (PA-5): i campi dei passi
già completati vengono pre-compilati con i valori già presenti, permettendo all'utente
di confermarli o modificarli senza sovrascrittura automatica.

---

### Passo 3 — Scelta della valuta preferita

**Cosa vede l'utente**: menu di selezione con le valute supportate dall'app (PA-3 §10).
Il valore pre-selezionato è `'EUR'` (default da P25 §3.4). Nota informativa: «La valuta
verrà usata per tutti i saldi e i report.»

**Cosa viene scritto su Supabase**: al click su «Avanti», il componente chiama
`impostazioni-utente.updateField('valuta_default', valore)` (P26 §7.6). Stesso
meccanismo di gestione errori del passo 2: errore inline con retry, passo non avanza
fino a scrittura riuscita.

**Obbligatorio o saltabile**: obbligatorio per avanzare. Il valore pre-selezionato `'EUR'`
permette all'utente di procedere senza modifiche.

**Comportamento in caso di interruzione**: identico al passo 2. Se la scrittura è già
avvenuta, il valore è preservato su Supabase al login successivo e il menu viene
pre-selezionato con il valore già impostato.

---

### Passo 4 — Seed delle categorie template

**Cosa vede l'utente**: schermata informativa con messaggio «Stiamo preparando le
categorie di spesa predefinite...» con indicatore di avanzamento (spinner o barra) mentre
l'operazione è in corso. Il processo avviene automaticamente all'ingresso in questo passo:
non è richiesta nessuna azione dall'utente. Al termine con successo, viene mostrato un
messaggio di conferma («Categorie pronte.») e il pulsante «Avanti» diventa attivo. In
caso di errore, viene mostrato un messaggio di errore con pulsante «Riprova» (PA-2 §10).

**Cosa viene scritto su Supabase**: il componente invoca `seed_default_categories(user.id)`
(P33 §4 · P24 §6 Blocco 9). La funzione inserisce le categorie template
(`predefinita: true, user_id: null`) nella tabella `categorie`. La funzione deve essere
**idempotente**: se le righe esistono già (per un retry dopo interruzione), non produce
duplicati (PA-2 §10).

**Obbligatorio o saltabile**: **non saltabile**. Il seed delle categorie template è una
precondizione strutturale per il corretto funzionamento di `DataManagement.tsx`
(P34 Fronte A) e di `CategoryManagement.tsx` (P33 §4). Questo passo non può essere
rimandato o reso facoltativo senza invalidare la Decisione A di §5.

**Comportamento in caso di interruzione**: se l'app viene chiusa durante o dopo il seed,
le righe già inserite rimangono su Supabase. Al login successivo il passo viene rieseguito;
grazie all'idempotenza, non produce duplicati. Il comportamento in caso di errore di rete
persistente è specificato in PA-2 §10.

---

### Passo 5 — Creazione del primo conto (facoltativo)

**Cosa vede l'utente**: form per la creazione del primo conto con i campi minimi
richiesti (nome del conto, tipo, saldo iniziale). Il passo espone un pulsante «Salta
per ora» chiaramente visibile, con nota: «Potrai creare i tuoi conti in seguito dalla
schermata principale.» Il pulsante di avanzamento è etichettato «Crea conto e continua»
quando il form è compilato.

**Cosa viene scritto su Supabase**: se l'utente compila il form e clicca «Crea conto e
continua», il componente chiama `conti.create(datiConto)` (P26 §7.1). Se la chiamata
fallisce, viene mostrato un messaggio di errore inline con opzione di riprovare. Se
l'utente clicca «Salta per ora», nessuna scrittura avviene per questo passo.

> **Nota infrastrutturale (da P26 §8)**: al completamento dell'onboarding il trigger
> `trg_sync_cifrato` (P25 §4.4) deve essere già attivo su Supabase. Il primo
> `conti.create()` con `isPrivato = true` deve già popolare correttamente `cifrato`
> sulle transazioni associate. Questa precondizione è responsabilità del Blocco 9 nella
> fase di deploy, non di `OnboardingFlow` a runtime.

**Obbligatorio o saltabile**: **saltabile**. La creazione di un conto in questa fase è
facoltativa. Un utente migrato da Spark che intende migrare i propri conti tramite P34
Fronte A può saltare questo passo. Un utente nuovo che preferisce esplorare l'app prima
di inserire dati può saltare il passo e creare i conti in seguito tramite `AccountDialog`.

**Comportamento in caso di interruzione**: se il conto è già stato creato con successo
prima della chiusura dell'app, il record esiste su Supabase. Al login successivo,
l'onboarding riappare (flag `onboarding_completed` ancora `false`). Il coding plan del
Blocco 9 deve gestire il caso «conto già presente» per evitare duplicati e offrire
un'esperienza di ripristino coerente (PA-5).

---

### Passo 6 — Completamento e impostazione del flag

**Cosa vede l'utente**: schermata di conferma («Tutto pronto! Benvenuto in Zecchino.»)
con riepilogo di quanto configurato (nome, valuta, categorie pronte, eventuale conto
creato). Pulsante «Inizia a usare Zecchino» che avvia la transizione alla dashboard.

**Cosa viene scritto su Supabase e operazioni finali**:

1. Il componente chiama `impostazioni-utente.updatePreference('onboarding_completed', true)`
   (P26 §7.6) tramite il repository. Se la chiamata fallisce, viene mostrato un messaggio
   di errore con opzione di riprovare: il flag non viene impostato e il flusso rimane
   attivo al passo 6. Il pulsante «Inizia a usare Zecchino» si disabilita durante la
   chiamata.

2. Al successo della scrittura del flag, il componente chiama `refreshAll()` da
   `useAppData()` (P28 §4) per caricare in `AppDataContext` i dati appena creati durante
   l'onboarding (in particolare il conto creato al passo 5, se presente, e le categorie
   template inserite al passo 4). Il pulsante mantiene lo stato disabilitato con
   indicatore visivo mentre `refreshAll()` è in corso.

3. Al completamento di `refreshAll()`, il componente chiama `completeOnboarding()` da
   `useAuth()` (§3.3). `AuthContext` imposta `needsOnboarding = false`. `App.tsx`
   re-renderizza e mostra la dashboard principale con i dati già caricati da
   `AppDataContext`.

**Obbligatorio o saltabile**: non saltabile. È l'unico passo che imposta il flag
`preferences.onboarding_completed = true` e che attiva la transizione alla dashboard.

**Comportamento in caso di interruzione**: se l'app viene chiusa tra il passo 5 e il
passo 6 (o durante il passo 6 prima della scrittura del flag), `onboarding_completed`
è ancora `false`. Al login successivo il flusso riappare al passo 1. I dati dei passi
precedenti (nome, valuta, conto, categorie) sono già su Supabase. Il coding plan del
Blocco 9 deve gestire il caso di ripristino (PA-5).

---

## §7 — Gate in `App.tsx`: prima e dopo P35

### Stato attuale (pre-P35, post-P27)

La sequenza dei gate condizionali in [`App.tsx`](../../src/App.tsx) nella funzione
`AppContent`:

| Ordine | Condizione | Render | Note |
|---|---|---|---|
| 1 | `!isAuthReady` | `null` (spinner per P27 Decisione C) | Risoluzione sessione Supabase in corso. Fonte: `AuthContext`. |
| 2 | `!isAuthenticated` | `<AuthScreen />` | Utente non loggato. Fonte: `AuthContext`. |
| 3 | — | Dashboard (con gate interno su `isDataReady` — P28 §8 punto 5) | Utente autenticato. |

Il gate `needsOnboarding` è anticipato da P27 §3.3 come «terzo gate» ma non è ancora
implementato prima di P35.

### Stato dopo P35

| Ordine | Condizione | Render | Fonte | Note |
|---|---|---|---|---|
| 1 | `!isAuthReady` | Spinner | `AuthContext` | Invariato. P27 Decisione C. |
| 2 | `!isAuthenticated` | `<AuthScreen />` | `AuthContext` | Invariato. |
| 3 | `needsOnboarding` | `<OnboardingFlow />` | `AuthContext` | **Nuovo gate aggiunto da P35.** |
| 4 | `!isDataReady` | Spinner dati | `AppDataContext` | Invariato nella posizione relativa. |
| 5 | — | Dashboard principale | — | Utente autenticato, onboarding completato, dati pronti. |

### Posizionamento del gate onboarding rispetto a `isDataReady`

Il gate `needsOnboarding` è valutato **prima** del gate `isDataReady`. Motivazione:

Durante l'onboarding di un utente nuovo, `AppDataContext` esegue i 5 `getAll()` e
ottiene array vuoti senza errori: `isDataReady` diventa `true` rapidamente. Tuttavia,
mostrare la dashboard a un utente che non ha ancora completato l'onboarding sarebbe una
regressione funzionale: l'utente vedrebbe un'app senza categorie template (il seed non
è ancora avvenuto), potrebbe creare dati prima che il passo 4 sia completato, e la
migrazione P34 Fronte A fallirebbe per mancanza di FK sulle categorie.

Posizionare `needsOnboarding` prima di `isDataReady` garantisce che l'onboarding sia
completato — e che il seed delle categorie template (passo 4) sia stato eseguito — prima
che qualsiasi funzionalità dell'app principale sia accessibile all'utente.

**Nota sul comportamento di `AppDataContext` durante l'onboarding**: `AppDataProvider`
è montato come provider padre e carica i dati in background anche durante la
visualizzazione di `OnboardingFlow`. Per un utente nuovo, tutti i `getAll()` restituiscono
array vuoti senza errori: `isDataReady = true` è raggiunto rapidamente e non interfere
con il flusso di onboarding. Quando al passo 6 viene chiamato `refreshAll()`, i dati
appena creati (conto del passo 5, categorie del passo 4) vengono caricati in
`AppDataContext` prima che la dashboard sia mostrata.

---

## §8 — Coordinamento con P34 Fronte A

### Risposta dichiarata a PA-6 di P34 §11

P35 risolve PA-6 di [P34 §11](./P34-migrazione-datamanagement-supabase.md) scegliendo
l'**Alternativa 1** e documentandola come decisione vincolante:

> Il Blocco 9 (onboarding, P35) garantisce il seed delle categorie template come
> precondizione obbligatoria, prima che l'utente possa accedere a `DataManagement.tsx`.
> Il coding plan del Blocco 7 (P34) **non deve** implementare un path di errore
> specializzato per FK mancanti su categorie template: la precondizione è garantita dalla
> struttura del gate `needsOnboarding` in `App.tsx` e dall'obbligatorietà del passo 4
> di `OnboardingFlow`.

**Impatto sul coding plan del Blocco 7**: il Blocco 7 può procedere all'implementazione
del Fronte A con la certezza che, al momento in cui il pannello di migrazione è mostrato
all'utente, le categorie template sono già presenti su Supabase. Il report di errore P34
Fronte A gestisce errori FK per categorie **personalizzate** eventualmente mancanti (caso
gestito da P33 Decisione B separatamente), ma non per categorie template. Questa
semplificazione riduce la complessità del path di errore del Fronte A.

### Momento in cui le categorie sono garantite disponibili

Le categorie template sono disponibili su Supabase dal momento in cui il passo 4
dell'onboarding (§6) viene completato con successo. Poiché `DataManagement.tsx` è
accessibile all'utente solo dopo il completamento dell'intero flusso di onboarding
(gate `needsOnboarding` in `App.tsx`), la precondizione è strutturalmente garantita
nell'uso normale: non è possibile raggiungere `DataManagement.tsx` senza aver completato
il passo 4.

### Comportamento per l'utente esistente migrato da Spark

Un utente migrato da Spark (con `needsOnboarding = true` perché `onboarding_completed`
è assente) attraversa l'intero flusso di onboarding come un utente nuovo. Al passo 4,
il seed delle categorie template viene eseguito. Al completamento dell'onboarding:

1. `AppDataContext` ha già caricato i dati Supabase (array vuoti o con le categorie
   appena seedate dopo il `refreshAll()` del passo 6).
2. P33 Decisione B in `AppDataContext` ha già eseguito (o sta eseguendo in parallelo al
   caricamento iniziale) il ripristino automatico delle categorie personalizzate dal KV Spark.
3. `DataManagement.tsx` mostra il pannello di migrazione one-shot P34 Fronte A perché
   `legacy_domain_migrated` non è ancora `true` in `preferences`.

L'utente può avviare la migrazione P34 Fronte A con la certezza che le categorie template
sono già su Supabase (passo 4 completato) e che le categorie personalizzate sono state
ripristinate automaticamente da P33 Decisione B.

### Coordinamento con P33 Decisione B

P33 Decisione B opera in `AppDataContext` al primo caricamento (prima che l'utente
interagisca con `DataManagement.tsx`). Il seed di P35 (categorie template, passo 4) e
la migrazione di P33 Decisione B (categorie personalizzate, in `AppDataContext`) operano
su insiemi di righe distinti della tabella `categorie` e non producono interferenze:
- P35 passo 4: inserisce righe con `predefinita: true, user_id: null`.
- P33 Decisione B: inserisce righe con `predefinita: false, user_id: ID utente`.

---

## §9 — Impatto sui blocchi successivi

| Blocco P24 | Dipendenza da P35 | Note |
|---|---|---|
| **Blocco 7 — DataManagement (P34)** | **Dipendenza diretta risolta** | P35 risolve PA-6 di P34: la precondizione delle categorie template per P34 Fronte A è garantita dal passo 4 dell'onboarding. Il Blocco 9 deve essere distribuito prima o contestualmente al Blocco 7. Il coding plan del Blocco 7 deve documentare questa precondizione esplicitamente come condizione di deploy. |
| **Blocco 8 — PIN privato** | **Nessuna dipendenza diretta** | `OnboardingFlow.tsx` non tocca `pin_privato_hash` né espone UI per la gestione del PIN privato. Il PIN privato viene configurato dall'utente in seguito tramite `SecuritySettings.tsx` (P27 §3.4), non durante l'onboarding di P35. Il Blocco 8 non dipende dal completamento di P35. |
| **Blocco 10 — Decommissioning Spark** | **Nessuna dipendenza diretta; certificazione di non-uso** | `OnboardingFlow.tsx` non accede a `window.spark.kv.*` in nessuna delle sue operazioni (§3.1 esplicita questo punto). Il Blocco 10 può procedere al decommissioning completo di Spark senza dipendenze da questo file. |

---

## §10 — Punti aperti residui

### PA-1 — Lista esatta delle categorie template per `seed_default_categories`

P24 §6 Blocco 9 non specifica i nomi, i tipi (spesa/entrata), le icone e i colori delle
categorie template da inserire. P33 §4 si limita a confermare che le righe hanno
`predefinita: true` e `user_id: null`, senza elencarle. Il coding plan del Blocco 9 deve
definire:

- L'elenco completo delle categorie template (nomi in italiano, tipo `spesa` o `entrata`).
- I valori dei campi `icona` e `colore` per ciascuna (se presenti nello schema reale
  di `categorie` su Supabase — da verificare in conformità con P24 R16).
- Il formato esatto del payload da passare alla funzione o al repository per il seed.

### PA-2 — Comportamento del passo 4 se la chiamata Supabase per il seed fallisce

Il passo 4 esegue un'operazione asincrona su Supabase che può fallire per errori di rete
o di configurazione. Il coding plan del Blocco 9 deve definire:

- **Errore di rete temporaneo**: il componente mostra un messaggio di errore («Impossibile
  preparare le categorie, controlla la connessione.») con pulsante «Riprova». Il flusso
  non avanza finché il seed non ha avuto esito positivo (il passo 4 è non saltabile).
- **Errore persistente**: il coding plan deve dichiarare esplicitamente se esiste un
  percorso di fallback (es. l'app è usabile senza categorie template in modalità
  degradata) o se il passo 4 è sempre bloccante.
- **Idempotenza del seed**: il meccanismo esatto per evitare duplicati in caso di retry
  (es. INSERT ON CONFLICT DO NOTHING su una combinazione univoca nome+tipo, oppure
  controllo preventivo di esistenza tramite `categorie.getAll()` prima di inserire).
  Il meccanismo dipende dallo schema reale di `categorie` su Supabase e dalla policy
  RLS per righe con `user_id = null`.

### PA-3 — Lista delle valute supportate al passo 3

Il passo 3 mostra un menu di selezione valute. La lista esatta delle valute supportate
dall'app (codici ISO 4217, simboli, nomi visualizzati) non è definita da nessun
documento P24–P34. Il coding plan del Blocco 9 deve compilare questa lista
coerentemente con la funzione `formatCurrency()` già presente in
[`src/lib/helpers.ts`](../../src/lib/helpers.ts) e con i valori già in uso nell'app.

### PA-4 — Flag `onboarding_completed` non presente nello schema P25 §3.4

P25 §3.4 definisce il JSON di default per `preferences JSONB` in `impostazioni_utente`.
Quel JSON non include la chiave `onboarding_completed`. P35 introduce questa chiave come
nuovo membro di `preferences JSONB`, seguendo la convenzione snake_case di P25.

Il coding plan del Blocco 9 deve:
- Verificare che il tipo TypeScript `UserPreferences` (definito nel Blocco 2) includa
  la chiave `onboarding_completed?: boolean`.
- Aggiungere la chiave al tipo se necessario. Non richiede ALTER TABLE: è una chiave
  JSONB aggiuntiva al di fuori del JSON di default P25.
- Verificare che `impostazioni-utente.updatePreference('onboarding_completed', true)` sia
  pienamente supportato dal contratto attuale di `updatePreference()` (P26 §7.6): la
  funzione esegue merge JSONB chirurgico su singola chiave, quindi aggiungere una nuova
  chiave non presente nel default è supportato senza modifiche al repository.

### PA-5 — Riprendibilità del flusso di onboarding dopo interruzione

Se l'utente chiude l'app a metà del flusso, alcuni passi sono già stati completati
(scritture avvenute su Supabase) mentre altri no. Al login successivo, `OnboardingFlow`
viene mostrato di nuovo dall'inizio perché `onboarding_completed` non è ancora `true`.

Il coding plan del Blocco 9 deve definire:

- Se il flusso riparte sempre dal passo 1 (senza rilevare lo stato dei passi precedenti)
  oppure se rileva i valori già impostati e popola i campi con i valori già su Supabase.
- Comportamento per il passo 2 e passo 3 (nome e valuta già impostati): i campi vengono
  pre-compilati con i valori già su Supabase, permettendo all'utente di confermarli o
  modificarli senza sovrascrittura automatica.
- Comportamento per il passo 5 (conto già creato): il componente rileva la presenza di
  conti esistenti per l'utente tramite `AppDataContext` o tramite il repository, e mostra
  un messaggio «Hai già un conto configurato» con opzione di saltare il passo o di
  aggiungerne un secondo.

### PA-6 — Funzione `completeOnboarding()` da aggiungere alla superficie pubblica di `AuthContext`

P27 §3.1 definisce la superficie pubblica di `AuthContext` ma non include
`completeOnboarding()`. P35 §3.3 specifica che questa funzione è necessaria per il
coordinamento tra `OnboardingFlow` e `AuthContext`. Il coding plan del Blocco 9 deve:

- Aggiungere `completeOnboarding: () => void` alla superficie pubblica di `AuthContext`
  (nel tipo del context e nel provider).
- Implementare la funzione come setter locale di `needsOnboarding = false` senza
  effetti collaterali su Supabase (la scrittura su Supabase è già avvenuta al passo 6
  di `OnboardingFlow`).
- Aggiornare il tipo `AuthContextType` (o equivalente) in
  [`AuthContext.tsx`](../../src/context/AuthContext.tsx).
- Verificare che nessun componente esistente dipenda da assunzioni sull'immutabilità
  di `needsOnboarding` post-bootstrap.

---

## §11 — Criteri di accettazione del documento

- [ ] Tutte le sezioni §1–§11 sono presenti e non vuote.
- [ ] §1 ha intestazione completa con tutti i campi obbligatori e il paragrafo blockquote
      vincolante «P36 in poi».
- [ ] §2 descrive lo stato attuale al primo accesso (autenticazione Spark tramite PIN),
      il problema post-migrazione (record parziale, categorie mancanti, dashboard vuota),
      e le dipendenze con P34 PA-6 e P33 Decisione B.
- [ ] §3 copre tutti e tre i file coinvolti: `OnboardingFlow.tsx` (nuovo — §3.1),
      `App.tsx` (gate — §3.2), `AuthContext.tsx` (aggiunta `completeOnboarding()` — §3.3).
      Certifica che nessun altro file viene modificato da P35.
- [ ] §4 distingue chiaramente i tre profili utente (nuovo, migrato da Spark, già su Supabase)
      con segnale di riconoscimento, valore `needsOnboarding` e comportamento
      post-onboarding per ciascuno.
- [ ] Decisione A (§5) ha **scelta definitiva in grassetto** (Alternativa 1) con analisi
      comparativa su almeno 5 dimensioni e risolve esplicitamente PA-6 di P34 §11.
- [ ] §5 dichiara esplicitamente l'impatto sull'ordine di distribuzione (Blocco 9 prima
      o contestuale al Blocco 7).
- [ ] §6 descrive tutti e 6 i passi del flusso con: cosa vede l'utente, cosa viene
      scritto su Supabase, se è saltabile, comportamento in caso di interruzione.
- [ ] §6 include il passo 4 (seed categorie) come non saltabile, con motivazione coerente
      con la Decisione A di §5.
- [ ] §6 passo 6 descrive l'ordine preciso delle tre operazioni finali:
      `updatePreference('onboarding_completed', true)` → `refreshAll()` → `completeOnboarding()`.
- [ ] §7 certifica l'ordine corretto dei gate in `App.tsx` prima e dopo P35 in forma
      di tabella, con motivazione del posizionamento di `needsOnboarding` prima di
      `isDataReady`.
- [ ] §8 risponde esplicitamente a PA-6 di P34 §11, dichiara la scelta dell'Alternativa 1
      come decisione vincolante per il coding plan del Blocco 7, e descrive il
      comportamento per l'utente migrato da Spark.
- [ ] §9 copre almeno i Blocchi 7, 8 e 10 con la dipendenza o la certificazione di
      non-dipendenza da P35.
- [ ] §10 documenta almeno 6 punti aperti con riferimento al blocco o documento che
      dovrà risolverli.
- [ ] Nessun frammento TypeScript, JSX o SQL eseguibile in tutto il documento.
- [ ] Nessuna contraddizione con P24–P34 rilevata.
- [ ] Tutti i path a file `src/` usano path relativi (`../../src/...`).
- [ ] Tutti i path a docs/ usano path relativi (`./P24-....md`).

---

*Fine documento. Nessun file sorgente è stato modificato.*

*Messaggio di commit suggerito:*
`docs(design): creare P35 onboarding primo accesso Supabase — Blocco 9`
