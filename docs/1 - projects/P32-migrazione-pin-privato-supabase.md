# P32 — Migrazione PIN privato a Supabase

---

## 1. Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P32 — Migrazione PIN privato a Supabase |
| **Tipo intervento** | Documento di design (sola lettura) |
| **Branch** | `refactoring-architettura` |
| **Data** | 28 aprile 2026 |
| **Autore** | Agent-Design |
| **File modificati** | Nessuno |
| **Documenti di riferimento** | [P24](./P24-architettura-migrazione-supabase.md) · [P25](./P25-schema-impostazioni-utente-cifrato.md) · [P26](./P26-strato-accesso-dati-supabase.md) · [P27](./P27-migrazione-authcontext-supabase.md) · [P28](./P28-migrazione-appdatacontext-supabase.md) · [P29](./P29-migrazione-usersettings-preferenze-ui.md) · [P30](./P30-migrazione-budgetpercentages-usestate.md) · [P31](./P31-migrazione-preferenze-display-audio-screenreader.md) · [AuthContext.tsx](../../src/context/AuthContext.tsx) · [SecuritySettings.tsx](../../src/components/SecuritySettings.tsx) · [src/lib/crypto.ts](../../src/lib/crypto.ts) |
| **Stato** | Bozza — in attesa di validazione |

> **Questo documento è vincolante per tutti i design operativi successivi (P33 in poi).
> Le decisioni qui contenute sono già state validate e non vengono rimesse in discussione:
> i design successivi possono solo dettagliarne l'implementazione, non cambiarne la sostanza.**

---

## 2. Contesto

### Il PIN privato come funzionalità di privacy intra-account

Il PIN privato è un meccanismo di **accesso selettivo** all'interno dell'app: non autentica
l'utente su Supabase, ma sblocca la visibilità dei conti e delle transazioni marcati come
privati nella sessione corrente. La sua esistenza risponde a uno scenario reale documentato
in P24 §4.3: telefono incustodito, tablet condiviso, sguardi indiscreti. È una **seconda
chiave** intra-account, indipendente dall'autenticazione con Supabase Auth.

Questa distinzione è fondamentale: il PIN **globale** (migrato in P27) è la credenziale di
accesso all'applicazione, gestita tramite Supabase Auth. Il PIN **privato** è un segreto
locale dell'app che non interagisce mai con il sistema di autenticazione di Supabase — il
suo hash viene semplicemente conservato come dato nella colonna `pin_privato_hash` della
tabella `impostazioni_utente`.

### Perché P27 ha rimandato questa migrazione

P27 §3.4 descrive `SecuritySettings.tsx` come file che **mantiene la sezione "PIN privato"
con il pattern Spark KV** (`useKV<string>('private-pin-hash', '')`), rimandando la migrazione
completa al Blocco 8. La motivazione è strutturale: il PIN privato non è una credenziale
di autenticazione (non va in Supabase Auth), richiede un design separato per il flusso di
set/verify/change/remove, e soprattutto P24 §4.3 identifica il **Rischio R10** — l'algoritmo
di hashing corrente (`SHA-256` puro in `src/lib/crypto.ts`) è inadeguato per un dato che
transita via rete. La sostituzione con `bcrypt`/`argon2` è un requisito del Blocco 8, non
del Blocco 3 (P27).

### Stato attuale residuo

Dopo P31, rimangono in `src/` le seguenti chiamate `useKV` legate al PIN privato:

- `src/context/AuthContext.tsx` riga 39: `useKV<string>('private-pin-hash', '')` per leggere
  l'hash e determinare `isPrivateEnabled` (hash non vuoto = PIN attivo), e per aggiornare
  l'hash tramite il setter `setPrivatePinHash`.
- `src/components/SecuritySettings.tsx` riga 28: `useKV<string>('private-pin-hash', '')`
  per leggere e scrivere l'hash nelle operazioni di cambio/rimozione PIN privato.

`AuthContext.tsx` accede inoltre a `window.spark.kv.get('global-pin-hash')` direttamente
(per il PIN globale — fuori scope P32, già gestito da P27). Non emergono accessi diretti
a `window.spark.kv` per la chiave `private-pin-hash`.

### Rilevanza strategica

Dopo P32, `AuthContext.tsx` e `SecuritySettings.tsx` non avranno più chiamate `useKV`. Questo
sblocca la progressione verso il Blocco 10 (decommissioning), che richiede l'azzeramento
completo di `@github/spark/hooks` in tutti i file `src/` dell'app. Dopo P32, le uniche
`useKV` residue saranno `CategoryManagement.tsx` (1, Blocco 4 implementazione) e
`src/test/setup.ts` (1 mock, Blocco 10).

### Infrastruttura già disponibile

- **P25 §3.4**: `pin_privato_hash TEXT DEFAULT NULL NULLABLE SÌ` — colonna **separata** dal campo
  `preferences JSONB`, tipizzata come `TEXT` nullable. `NULL` = nessun PIN privato impostato.
  La separazione dal JSONB è motivata in P25: un dato sensibile non deve finire nel blob
  di preferenze dove è più facile fare accesso batch.
- **P26 §7.6**: `updatePinHash(hash: string | null): void` — alias semantico di
  `updateField('pin_privato_hash', hash)`. Già implementato nel repository
  `impostazioni-utente`. `null` = rimozione del PIN privato.
- **P29 Decisione A**: il record `UserSettings` (incluso `pin_privato_hash`) è disponibile
  in memoria da `AuthProvider` al bootstrap senza seconda chiamata Supabase.

---

## 3. File coinvolti e loro trasformazione

### 3.1 `src/context/AuthContext.tsx`

**Stato attuale (post-P27)**

`AuthContext.tsx` usa `useKV<string>('global-pin-hash', '')` (gestione PIN globale — già
migrato in P27, ma ancora presente nel sorgente attuale) e
`useKV<string>('private-pin-hash', '')` per il PIN privato. L'hash del PIN privato è
esposto nella superficie pubblica come `privatePinHash` (e `setPrivatePinHash`).
`isPrivateEnabled` non è un campo esplicito nella superficie attuale: la condizione
`privatePinHash !== ''` (o `!= null`) è valutata inline dai componenti consumer.
`isPrivateUnlocked` è `useState<boolean>(false)`, resettato al logout. La funzione
`handlePrivatePinSubmit` calcola l'hash del PIN inserito con `hashPin()` (da `src/lib/crypto.ts`)
e lo confronta con `privatePinHash` tramite `verifyPin()` — verifica lato client.

**Stato dopo P32**

La chiamata `useKV<string>('private-pin-hash', '')` viene rimossa. `AuthContext` legge
`pin_privato_hash` dal record `UserSettings` già disponibile in memoria (passato da
`AuthProvider` al bootstrap — P29 Decisione A) e lo mantiene in un `useState` locale
privato (non esposto direttamente nella superficie pubblica). `isPrivateEnabled` diventa
un campo esplicito derivato: `pin_privato_hash !== null && pin_privato_hash !== ''`.

Le operazioni di scrittura (`setPin`, `changePin`, `removePin`) sono centralizzate in
`AuthContext` (Decisione C) e chiamano `updatePinHash()` dal repository `impostazioni-utente`
(P26 §7.6). La verifica del PIN al momento dello sblocco rimane lato client (Decisione B):
`hashPin(pin)` + confronto con l'hash in memoria.

**Eliminato:**
- `useKV<string>('private-pin-hash', '')` (riga 39 del sorgente attuale)
- Setter `setPrivatePinHash` dalla superficie pubblica di `AuthContextValue`
- `privatePinHash` come campo diretto nella superficie pubblica

**Aggiunto:**
- Lettura di `pin_privato_hash` dal record `UserSettings` passato da `AuthProvider`
- Funzioni `setPin(pin)`, `changePin(oldPin, newPin)`, `removePin()` nella superficie pubblica
- Campo `isPrivateEnabled` esplicito nella superficie pubblica

**Dopo P32:** nessuna dipendenza da `@github/spark/hooks`.

---

### 3.2 `src/components/SecuritySettings.tsx`

**Stato attuale (post-P27)**

`SecuritySettings.tsx` legge `useKV<string>('private-pin-hash', '')` (riga 28) in parallelo
con `AuthContext`. Gestisce autonomamente la sezione "PIN privato": impostazione (primo accesso),
cambio (con verifica del PIN attuale tramite `verifyPin()`), e la logica di rimozione. Ogni
operazione ricalcola l'hash con `hashPin()` e chiama il setter `setPrivatePinHash` diretto
(che scrive sul KV). Questo schema configura uno **split-brain** rispetto ad `AuthContext`:
entrambi i file gestiscono lo stesso dato indipendentemente — split-brain documentato in P27
§3.4.

**Stato dopo P32**

Le operazioni di impostazione, cambio e rimozione del PIN privato in `SecuritySettings.tsx`
delegano interamente ad `AuthContext`: chiamano rispettivamente `setPin(pin)`,
`changePin(oldPin, newPin)`, `removePin()` dal hook `useAuth()`. `SecuritySettings.tsx` non
chiama più `hashPin()` direttamente, non legge `useKV`, non gestisce l'hash. La UI rimane
invariata (dialog, validazione lunghezza PIN, feedback toast/screenReader): solo il layer di
persistenza cambia. Lo split-brain è risolto: `AuthContext` è l'unica autorità sull'hash
del PIN privato (Decisione C).

**Eliminato:**
- `useKV<string>('private-pin-hash', '')` (riga 28 del sorgente attuale)
- Chiamate dirette a `hashPin()` e `verifyPin()` da `SecuritySettings.tsx`
- Setter `setPrivatePinHash` dalla dipendenza locale
- Import di `useKV` da `@github/spark/hooks`

**Aggiunto:**
- Chiamate a `setPin()`, `changePin()`, `removePin()` tramite `useAuth()`
- Lettura di `isPrivateEnabled` tramite `useAuth()` (per mostrare lo stato del PIN nella UI)

**Dopo P32:** nessuna dipendenza da `@github/spark/hooks`.

---

## 4. Natura del PIN privato e separazione da PIN globale

### Tabella comparativa PIN globale vs PIN privato

| Dimensione | **PIN globale** (migrato in P27) | **PIN privato** (questo blocco — P32) |
|---|---|---|
| **Scopo** | Autentica l'utente all'applicazione. Senza PIN globale, l'app non si apre. | Sblocca la visibilità dei conti e delle transazioni marcati come "privati" nell'interfaccia. L'utente è già autenticato. |
| **Meccanismo di verifica** | Supabase Auth: la password dell'utente è il PIN globale. La verifica avviene tramite il sistema di autenticazione Supabase. | **Lato client**: `hashPin(pin)` + confronto con l'hash in memoria. Nessuna query Supabase al momento dello sblocco. |
| **Storage** | Gestito interamente da Supabase Auth (non salvato in `impostazioni_utente`). | Hash nella colonna `pin_privato_hash TEXT NULLABLE` di `impostazioni_utente` (P25 §3.4). Colonna separata dal campo `preferences JSONB`. |
| **Chi lo legge** | `AuthContext` (via Supabase Auth session). | `AuthContext` — al bootstrap legge `pin_privato_hash` dal record `UserSettings` in memoria. |
| **Chi lo scrive** | Supabase Auth (operazioni di cambio password). | `AuthContext` (via `updatePinHash()` di P26 §7.6). `SecuritySettings.tsx` delega ad `AuthContext` — non scrive direttamente (Decisione C). |
| **Cosa succede se perso** | L'utente non può accedere all'applicazione — flusso di reset password tramite Supabase Auth (email). | L'utente perde l'accesso alle voci private nella sessione. Non esiste recovery automatico: l'utente deve rimuovere il PIN e reimpostarne uno nuovo (azione disponibile in `SecuritySettings`). |
| **Relazione con Supabase Auth** | **Diretta**: è la credenziale di autenticazione. | **Nessuna**: Supabase conserva l'hash come dato nella tabella `impostazioni_utente`, non come credenziale. La RLS protegge la colonna tramite `auth.uid() = user_id`, ma la verifica del PIN è sempre lato client. |

### Il PIN privato come segreto locale

Il PIN privato è progettato per proteggere le voci private da chi guarda lo schermo, non da
chi ha accesso al database. Supabase conserva l'hash (non il PIN in chiaro) per sincronizzarlo
tra dispositivi: se l'utente imposta il PIN privato sul telefono, può sbloccarlo anche sul
tablet senza reimpostarlo. Questa è la differenza chiave rispetto alla soluzione Spark KV,
dove il PIN era solo locale al dispositivo.

La colonna `pin_privato_hash` è separata dal campo `preferences JSONB` per una ragione di
sicurezza documentata in P25: un dato sensibile non deve finire nel blob di preferenze dove
query analitiche o logging potrebbero esporlo accidentalmente. Come colonna tipizzata, è
più semplice implementare audit trail e policy RLS chirurgiche.

---

## 5. Decisione A — Cosa scrivere su Supabase quando l'utente rimuove il PIN privato

### 5.1 Le due opzioni

**OPZIONE 1 — Scrivere `NULL`**

Quando l'utente rimuove il PIN privato, `removePin()` chiama `updatePinHash(null)`. La colonna
`pin_privato_hash` torna a `NULL`. `isPrivateEnabled` è derivato dalla condizione
`hash !== null`. Al primo accesso di un utente nuovo che non ha mai impostato il PIN, il
valore è già `NULL` (default della colonna).

**OPZIONE 2 — Scrivere stringa vuota `''`**

Quando l'utente rimuove il PIN privato, `removePin()` chiama `updatePinHash('')`. La colonna
`pin_privato_hash` torna a `''`. `isPrivateEnabled` è derivato dalla condizione
`hash !== '' && hash !== null`.

### 5.2 Analisi comparativa

| Dimensione | Opzione 1 — `NULL` | Opzione 2 — Stringa vuota `''` |
|---|---|---|
| **Coerenza con P25 §3.4** | **Piena**: P25 §3.4 definisce la colonna `pin_privato_hash TEXT DEFAULT NULL NULLABLE SÌ` con la nota esplicita «NULL = nessun PIN privato impostato». `NULL` è il valore semantico canonico per "assenza". | **Parziale**: la colonna è dichiarata nullable in P25, quindi `''` è tecnicamente ammissibile, ma semanticamente incongruente: `NULL` in SQL significa "assente", `''` significa "stringa vuota presente". |
| **Leggibilità della condizione** | `isPrivateEnabled = hash !== null` — condizione univoca e semanticamente chiara. | `isPrivateEnabled = hash !== null && hash !== ''` — condizione composita necessaria per gestire sia `NULL` (primo accesso) sia `''` (rimozione). |
| **Comportamento al primo accesso (mai impostato)** | `NULL` (default della colonna). `isPrivateEnabled = false`. Nessun caso speciale. | Il default della colonna è `NULL`, non `''`. Al primo accesso, la condizione `hash !== '' && hash !== null` deve gestire entrambi i casi — complessità inutile. |
| **Coerenza con `updatePinHash()` (P26 §7.6)** | **Piena**: P26 §7.6 descrive esplicitamente `null` come parametro di rimozione: «`null` = rimozione del PIN privato». | Richiederebbe modificare la semantica di `updatePinHash()` rispetto a quanto definito in P26. |
| **Rischio di confusione** | Nessuno: `NULL` ha un significato SQL univoco. | Presente: chi legge il codice deve sapere che `''` e `NULL` hanno lo stesso significato funzionale, ma rappresentazioni diverse. |

### 5.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — scrittura di `NULL`.**

P25 §3.4 è esplicito: «`NULL` = nessun PIN privato impostato». P26 §7.6 è esplicito:
`updatePinHash(null)` rimuove il PIN. Non c'è ambiguità su quale sia la rappresentazione
canonica dell'assenza del PIN privato. Usare la stringa vuota richiederebbe deviare da due
documenti vincolanti (P25 e P26) senza alcun beneficio, aggiungendo una condizione composita
in ogni punto dove si legge `isPrivateEnabled`. `isPrivateEnabled` è quindi definito come
`pin_privato_hash !== null && pin_privato_hash !== ''` solo come guardia difensiva per gestire
hash vuoti eventualmente residui dal KV Spark — al regime normale (post-migrazione), l'unico
valore che indica "nessun PIN" è `NULL`.

---

## 6. Decisione B — Dove avviene la verifica del PIN al momento dello sblocco

### 6.1 Le due opzioni

**OPZIONE 1 — Verifica lato client**

`AuthContext.unlockPrivate(pin)` ha l'hash in memoria (dal record `UserSettings` passato al
bootstrap). Calcola `hashPin(pin)` tramite `src/lib/crypto.ts` e confronta localmente con
l'hash. Se il confronto ha esito positivo: `isPrivateUnlocked = true`. Nessuna chiamata
Supabase.

**OPZIONE 2 — Verifica lato server**

`AuthContext.unlockPrivate(pin)` invia il PIN (o l'hash del PIN) a una Supabase Edge Function
che esegue il confronto server-side. La Edge Function riceve il PIN, calcola l'hash, lo
confronta con `pin_privato_hash` nel database, e restituisce un token di sblocco o un boolean.

### 6.2 Analisi comparativa

| Dimensione | Opzione 1 — Verifica lato client | Opzione 2 — Verifica lato server |
|---|---|---|
| **Sicurezza della verifica** | Il confronto avviene in memoria nel browser/app. L'hash è già nel client. Nessun dato transita in rete al momento dello sblocco. | Il PIN (o l'hash) transita via HTTPS verso la Edge Function. HTTPS protegge dalla intercettazione, ma aggiunge una superficie di attacco e un round-trip di rete. |
| **Latenza percepita** | **Istantanea**: calcolo locale di SHA-256 (< 1ms con WebCrypto API). Nessuna latenza di rete. | **Richiede round-trip**: anche con connessione ottimale, introduce latenza percepibile (50–500ms). L'utente vede uno spinner prima dello sblocco. |
| **Coerenza con il pattern attuale** | **Piena**: il sorgente attuale (`AuthContext.tsx` + `SecuritySettings.tsx`) usa già `hashPin()` + `verifyPin()` da `src/lib/crypto.ts` — verifica lato client. P32 preserva questo pattern, cambia solo il backend di storage. | Discontinuità rispetto al pattern Spark: richiederebbe una nuova Edge Function, un nuovo flusso asincrono, e gestione di errori di rete durante lo sblocco — complessità non giustificata. |
| **Dipendenza dalla rete** | **Nessuna**: lo sblocco funziona anche offline (se il record UserSettings è in memoria). | Richiede connessione attiva. Sblocco fallisce se offline — inaccettabile per un'app di finanza personale usata potenzialmente senza rete. |
| **Rischio di intercettazione del PIN** | Il PIN non transita in rete al momento dello sblocco. | Il PIN transita verso la Edge Function. Anche se HTTPS cifra il canale, il PIN è presente nella richiesta HTTP. |
| **Requisito aggiuntivo di infrastruttura** | Nessuno. | Richiede la creazione e manutenzione di una Supabase Edge Function dedicata. Non prevista in P24. |

### 6.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — verifica lato client.**

Il principio di P24 §4.3 è chiaro: il PIN privato è un meccanismo **locale all'app**, non
una credenziale di autenticazione. La sua verifica è semanticamente un confronto tra ciò che
l'utente inserisce e ciò che il sistema ricorda — un'operazione che avviene interamente
nella sessione locale. Aggiungere un round-trip di rete a questa operazione non incrementa
la sicurezza (il confronto client-side è sicuro: SHA-256 o bcrypt producono hash non
reversibili) ma riduce l'usabilità e introduce una dipendenza dalla connettività di rete
che potrebbe bloccare l'accesso alle voci private in scenario offline.

La verifica lato client è il pattern già in uso: `hashPin()` e `verifyPin()` in
`src/lib/crypto.ts` svolgono già questo ruolo. P32 non cambia dove avviene la verifica,
ma solo dove è conservato l'hash (da Spark KV a Supabase `pin_privato_hash`).

---

## 7. Decisione C — Sincronizzazione dell'hash in memoria dopo aggiornamento

### 7.1 Le tre opzioni

**OPZIONE 1 — `AuthContext` espone `refreshPinHash()` o `setPinHash(hash)`**

`SecuritySettings.tsx` chiama `updatePinHash()` sul repository direttamente e poi notifica
`AuthContext` tramite una funzione esposta nella superficie pubblica. `AuthContext` aggiorna
l'hash in memoria. Responsabilità divisa: `SecuritySettings` chiama il repository,
`AuthContext` aggiorna lo stato.

**OPZIONE 2 — `AuthContext` osserva `useUserSettings()` e si aggiorna automaticamente**

`useUserSettings()` espone `pinPrivatoHash` come campo della sua superficie pubblica.
`AuthContext` osserva questo campo e aggiorna `isPrivateEnabled` automaticamente quando
cambia. `SecuritySettings.tsx` chiama il setter di `useUserSettings()`.

**OPZIONE 3 — `SecuritySettings.tsx` chiama le azioni di `AuthContext`**

`AuthContext` espone `setPin(pin)`, `changePin(oldPin, newPin)`, `removePin()` come funzioni
che internamente: calcolano/verificano l'hash, chiamano `updatePinHash()` sul repository,
aggiornano l'hash in memoria. `SecuritySettings.tsx` chiama queste funzioni e non gestisce
l'hash direttamente.

### 7.2 Analisi comparativa

| Dimensione | Opzione 1 — `setPinHash()` esposta | Opzione 2 — Osservazione di `useUserSettings()` | Opzione 3 — Azioni centralizzate in `AuthContext` |
|---|---|---|---|
| **Accoppiamento** | Moderato: `SecuritySettings` chiama il repository + `AuthContext`. Due dipendenze per una singola operazione. | **Alto**: `AuthContext` dipende da `useUserSettings()`. Il flusso è indiretto e difficile da tracciare. | **Basso**: `SecuritySettings` ha una singola dipendenza (`useAuth()`). Tutta la logica del PIN è in `AuthContext`. |
| **Rischio di split-brain** | Presente: se `SecuritySettings` chiama `updatePinHash()` ma dimentica di chiamare `setPinHash()` nell'`AuthContext`, i due stati divergono. | Ridotto: l'aggiornamento è automatico. Ma dipende dalla reattività dell'osservazione — race condition possibile. | **Nullo**: `AuthContext` è l'unica fonte di verità. `SecuritySettings` non tocca mai l'hash direttamente. |
| **Coerenza con il principio di P27** | Parziale: P27 §3.4 identifica `AuthContext` come autorità sull'autenticazione, ma questa opzione divide la responsabilità. | Incoerente: `useUserSettings()` diventerebbe autorità indiretta su un dato di sicurezza. | **Piena**: P27 tratta `AuthContext` come autorità sull'autenticazione e sulla gestione del PIN. Opzione 3 è la continuazione naturale di quel principio. |
| **Semplicità di `SecuritySettings.tsx`** | Media: due chiamate asincrone per ogni operazione. | Alta: un solo setter. Ma il flusso è oscurato dall'osservazione. | **Alta**: `SecuritySettings` chiama una sola funzione ben nominata (`setPin`, `changePin`, `removePin`) — auto-documentante. |
| **Testabilità** | Media: due mock da gestire nei test. | Bassa: l'osservazione reattiva è difficile da testare in isolamento. | **Alta**: le azioni di `AuthContext` sono unità testabili in isolamento con mock del repository. |

### 7.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 3 — azioni centralizzate in `AuthContext`.**

P27 ha stabilito il principio che `AuthContext` è l'autorità su tutte le operazioni di
autenticazione e sicurezza dell'app. Il PIN privato è un dato di sicurezza (hash crittografico),
non una preferenza UI: appartiene semanticamente al dominio di `AuthContext`, non a
`useUserSettings()`. Centralizzare `setPin`, `changePin` e `removePin` in `AuthContext` segue
questo principio, elimina lo split-brain documentato in P27 §3.4 (entrambi i file che gestiscono
lo stesso dato indipendentemente), e semplifica `SecuritySettings.tsx` a un componente UI
puro che delega tutta la logica di business a `useAuth()`. L'Opzione 3 è anche l'unica che
garantisce che l'hash in memoria in `AuthContext` sia sempre aggiornato: l'aggiornamento
avviene dentro la funzione che ha eseguito il repository call, non in un componente separato
che potrebbe non chiamare il setter.

---

## 8. Flusso di inizializzazione e ciclo di vita del PIN privato

**1. Precondizione (invariata da P29 Decisione A)**

Il record `UserSettings` completo — incluso `pin_privato_hash` — è disponibile in memoria
perché `AuthProvider` ha eseguito `getOrCreate()` al bootstrap (P27 §3.1) e lo ha passato
via context a `UserSettingsProvider`. `AuthContext` legge `pin_privato_hash` da questo record
senza eseguire una seconda chiamata Supabase.

**2. Determinazione di `isPrivateEnabled`**

`isPrivateEnabled` è derivato in modo sincrono al bootstrap:
`pin_privato_hash !== null && pin_privato_hash !== ''`. Questo campo è immediato e disponibile
senza latenza aggiuntiva. La condizione composita (con guardia su stringa vuota) gestisce
eventuali hash residui dal KV Spark (punto aperto §12). Al regime normale (post-migrazione),
il solo valore che indica "nessun PIN" è `NULL` (Decisione A).

**3. Inizializzazione di `isPrivateUnlocked`**

`isPrivateUnlocked = false` al bootstrap. Non viene mai persistito su Supabase né nel
KV Spark. Pattern invariato da P27 §9.3: ad ogni nuova sessione, l'utente deve reinserire
il PIN privato per sbloccare le voci private.

**4. Sblocco — `unlockPrivate(pin)`**

`AuthContext` calcola `hashPin(pin)` tramite `src/lib/crypto.ts` e confronta con l'hash
in memoria (Decisione B — verifica lato client). Se il confronto è positivo:
`isPrivateUnlocked = true`. Se negativo: `isPrivateUnlocked` rimane `false`, viene emesso
feedback di errore (toast + screenReader). Nessuna chiamata Supabase.

**5. Lock — `lockPrivate()`**

`isPrivateUnlocked = false`. Operazione sincrona, nessun effetto su Supabase.

**6. Impostazione PIN — `setPin(pin)` (quando non esiste)**

`AuthContext` verifica che `isPrivateEnabled = false` (nessun PIN attivo). Calcola
`hashPin(pin)` tramite `src/lib/crypto.ts`. Chiama `updatePinHash(hash)` dal repository
`impostazioni-utente` (P26 §7.6). Se la chiamata ha esito positivo: aggiorna l'hash in
memoria, imposta `isPrivateEnabled = true`, `isPrivateUnlocked = true` (il PIN appena
impostato sblocca immediatamente). Pattern non ottimistico: lo stato locale viene aggiornato
solo dopo conferma dal DB (coerente con P29 §8 punto 7).

**7. Cambio PIN — `changePin(oldPin, newPin)`**

`AuthContext` verifica il PIN attuale: `hashPin(oldPin)` confrontato con l'hash in memoria.
Se errato: errore, nessuna scrittura. Se corretto: calcola `hashPin(newPin)`, chiama
`updatePinHash(newHash)`. Se la chiamata ha esito positivo: aggiorna l'hash in memoria. Se
fallisce: nessun aggiornamento in memoria (rollback implicito — pattern non ottimistico).

**8. Rimozione PIN — `removePin()`**

`AuthContext` chiama `updatePinHash(null)` (Decisione A). Se la chiamata ha esito positivo:
imposta l'hash in memoria a `null`, `isPrivateEnabled = false`, `isPrivateUnlocked = false`.
Se fallisce: nessuna modifica allo stato in memoria (rollback implicito).

**9. Reset al logout**

`isPrivateUnlocked = false`. L'hash in memoria non viene azzerato al logout (viene aggiornato
al prossimo login quando `AuthProvider` carica il record `UserSettings` fresco). Pattern P27
§9.3: `isPrivateUnlocked` è la sola variabile di sessione del PIN privato.

---

## 9. Superficie pubblica aggiornata di `AuthContext` dopo P32

La tabella descrive le voci della superficie pubblica di `AuthContext` rilevanti al PIN
privato. Le voci non legate al PIN privato (es. `isAuthenticated`, `handleGlobalPinSubmit`,
`showPinDialog`, ecc.) sono invariate e non vengono ripetute qui — vedi P27 §9 per la
superficie completa di `AuthContext` post-P27.

| Nome | Tipo (descrittivo) | Descrizione funzionale | Note |
|---|---|---|---|
| `isPrivateEnabled` | Booleano | `true` se `pin_privato_hash` non è null e non è stringa vuota. | Derivato dal record `UserSettings` al bootstrap. Aggiornato sincrono dopo `setPin` / `removePin`. |
| `isPrivateUnlocked` | Booleano | `true` se il PIN privato è stato verificato correttamente nella sessione corrente. | Resettato a `false` al logout (P27 §9.3). Non persistito. |
| `unlockPrivate(pin)` | Funzione asincrona | Calcola `hashPin(pin)` lato client e confronta con l'hash in memoria (Decisione B). Se corretto: imposta `isPrivateUnlocked = true`. | Non chiama Supabase. Emette feedback (toast + screenReader) su esito. |
| `lockPrivate()` | Funzione sincrona | Imposta `isPrivateUnlocked = false`. | Nessun effetto su Supabase. |
| `setPin(pin)` | Funzione asincrona | Imposta un nuovo PIN privato quando non esiste (`isPrivateEnabled = false`). Calcola hash, chiama `updatePinHash(hash)`. | Non ottimistico: aggiorna stato in memoria solo dopo conferma DB. Dopo successo: `isPrivateEnabled = true`, `isPrivateUnlocked = true`. |
| `changePin(oldPin, newPin)` | Funzione asincrona | Cambia il PIN privato. Verifica `oldPin` prima di procedere. Calcola nuovo hash, chiama `updatePinHash(newHash)`. | Non ottimistico. Se `oldPin` errato: errore inline, nessuna scrittura. |
| `removePin()` | Funzione asincrona | Rimuove il PIN privato. Chiama `updatePinHash(null)` (Decisione A). | Non ottimistico. Dopo successo: `isPrivateEnabled = false`, `isPrivateUnlocked = false`, hash in memoria = `null`. |

> **Voci rimosse dalla superficie rispetto al sorgente attuale**: `privatePinHash` (campo
> diretto), `setPrivatePinHash` (setter diretto). Entrambi espongono l'hash raw ai componenti
> consumer — dopo P32 l'hash è un dettaglio interno di `AuthContext`, non parte dell'interfaccia
> pubblica.

---

## 10. Impatto sul decommissioning Spark (Blocco 10)

P31 §10 ha stabilito il conteggio residuo di chiamate `useKV` dopo la migrazione delle
preferenze Display/Audio/ScreenReader. P32 aggiorna quel conteggio eliminando 4 chiamate in 2 file.

**Situazione prima di P32 (post-P31):**

| File | Chiamate `useKV` | Blocco di risoluzione |
|---|---|---|
| `src/context/AuthContext.tsx` | 2 (`global-pin-hash`, `private-pin-hash`) | P27 + P32 |
| `src/components/SecuritySettings.tsx` | 2 (`global-pin-hash`, `private-pin-hash`) | P27 + P32 |
| `src/components/CategoryManagement.tsx` | 1 (`categories`) | P28 implementazione |
| `src/test/setup.ts` | 1 (mock) | Blocco 10 |
| **Totale** | **6** | — |

> **Nota**: P27 ha già rimosso la gestione del PIN globale dall'interno di `AuthContext`
> (migrato a Supabase Auth), ma il sorgente attuale contiene ancora `useKV('global-pin-hash')`
> perché P27 è un documento di design e l'implementazione non è ancora avvenuta. P32 copre
> la rimozione di `useKV('private-pin-hash')` dai due file; la rimozione di
> `useKV('global-pin-hash')` è parte dell'implementazione di P27.

**Situazione dopo P32 (4 chiamate eliminate da `AuthContext.tsx` e `SecuritySettings.tsx`):**

| File | Chiamate `useKV` dopo P32 | Blocco di risoluzione |
|---|---|---|
| `src/components/CategoryManagement.tsx` | 1 (`categories`) | P28 implementazione (Blocco 4) |
| `src/test/setup.ts` | 1 (mock) | Blocco 10 |
| **Totale residuo** | **2** | — |

Dopo P32, il percorso verso il Blocco 10 è quasi completato: rimangono solo 2 chiamate
`useKV` in `src/` — una in un file di componente (rimossa con l'implementazione di P28,
Blocco 4) e una nel file di test (rimossa nel decommissioning finale del Blocco 10). Il
Blocco 10 potrà rimuovere la dipendenza `@github/spark/hooks` da `package.json` e il mock
da `src/test/setup.ts`.

---

## 11. Impatto sui blocchi successivi

| Blocco P24 | Dipendenza da P32 | Note |
|---|---|---|
| **Blocco 7 — DataManagement** | **Dipendente** | L'import one-shot dal KV Spark (P31 Decisione C) deve **escludere** la chiave `private-pin-hash` dalla migrazione batch. L'hash del PIN privato non viene portato su Supabase tramite import dati: la colonna `pin_privato_hash` viene popolata tramite il normale flusso di `setPin()` (l'utente reimposta il PIN dopo la migrazione, se ne aveva uno). Importare un hash SHA-256 su una colonna che P32 intende ripopolare con bcrypt/argon2 creerebbe un'inconsistenza di algoritmo. |
| **Blocco 9 — Onboarding** | **Dipendente** | Il seed del record `impostazioni_utente` al completamento dell'onboarding include `pin_privato_hash = NULL` come default. L'utente imposta il PIN privato successivamente tramite `SecuritySettings.tsx`, non durante l'onboarding. Questo è coerente con il default definito in P25 §3.4: `NULL` = nessun PIN privato impostato. |
| **Blocco 10 — Decommissioning** | **Dipendente** | P32 elimina 4 delle 6 `useKV` residue in `src/` (da P31 §10). Dopo P32 rimangono 2. Il Blocco 10 può avanzare solo quando `CategoryManagement.tsx` ha completato la migrazione di `categories` (Blocco 4 implementazione) e `src/test/setup.ts` ha rimosso il mock `useKV`. P32 è prerequisito diretto del Blocco 10. |
| **P33+ (design futuri)** | **Dipendente sulla superficie** | I design futuri devono trattare `AuthContext` come espositore delle funzioni `setPin`, `changePin`, `removePin` (Decisione C). Nessun design futuro deve accedere a `pin_privato_hash` direttamente o chiamare `updatePinHash()` fuori da `AuthContext`. |

---

## 12. Punti aperti residui

- **Algoritmo di hashing — sostituzione SHA-256**: P24 §4.3 e P24 §8 (Rischio R10) classificano
  l'attuale SHA-256 puro come **inadeguato** per un hash che viene sincronizzato via rete su
  Supabase. Il coding plan del Blocco 8 deve scegliere tra bcrypt, argon2 o verifica tramite
  Supabase Edge Function. Il vincolo critico è la **continuità**: se l'algoritmo cambia, tutti
  gli utenti che hanno già impostato un PIN privato (con hash SHA-256) avranno l'hash incompatibile
  con il nuovo algoritmo. La scelta più sicura è una migrazione one-shot al primo login
  post-distribuzione: se il record ha un hash in formato SHA-256 (riconoscibile dalla lunghezza
  fissa di 64 caratteri esadecimali), `AuthContext` chiede all'utente di reinserire il PIN
  per ricrearlo con il nuovo algoritmo. Il meccanismo esatto è un punto aperto da documentare
  nel coding plan del Blocco 8, non risolvibile a livello di design.

- **Gestione errore su `updatePinHash()` durante operazioni PIN**: se Supabase non risponde
  durante `setPin`, `changePin` o `removePin`, il pattern non ottimistico (§8 punti 6–8)
  garantisce che lo stato in memoria non venga aggiornato. Il coding plan del Blocco 8 deve
  definire il feedback utente in questo scenario: errore inline nel dialog, possibilità di
  ritentare, comportamento del dialog dopo errore. P26 §7.6 specifica che `updatePinHash()`
  lancia `RepositoryError` — `AuthContext` deve intercettarlo e propagare l'errore alla UI
  tramite un meccanismo coerente con il pattern toast/screenReader già in uso.

- **PIN privato e migrazione dati storici dal Blocco 7**: la chiave `private-pin-hash` nel
  KV Spark deve essere esplicitamente esclusa dalla lista delle chiavi da migrare one-shot
  (P31 §12, Blocco 7 DataManagement). Il coding plan del Blocco 7 deve documentare questa
  esclusione esplicita. Se la chiave viene migrata accidentalmente, l'hash SHA-256 viene
  scritto su `pin_privato_hash` senza validazione — risultato: il PIN privato "funziona"
  ma con un algoritmo inadeguato, e il problema viene scoperto solo quando si tenta la
  sostituzione con bcrypt (punto aperto precedente).

- **`CategoryManagement.tsx` — ultima `useKV` non-mock**: rimane `useKV('categories', [])`
  come ultima chiamata non-mock dopo P32. La sua rimozione è già pianificata in P28 (Blocco 4
  implementazione). Non è un punto aperto di P32, ma va tenuto nel tracciamento verso il
  Blocco 10.

---

## 13. Criteri di accettazione del documento

- [ ] Tutte le sezioni 1–13 sono presenti e non vuote.
- [ ] §1 ha intestazione completa (tabella con tutti i campi) e paragrafo vincolante
      «Questo documento è vincolante per tutti i design operativi successivi (P33 in poi)».
- [ ] §1 cita `src/lib/crypto.ts` come documento di riferimento (verificato nel sorgente:
      il file esiste come `src/lib/crypto.ts`).
- [ ] §2 cita P27 §3.4 come origine del rimando al Blocco 8.
- [ ] §2 cita P24 Rischio R10 (SHA-256 inadeguato) come motivazione della separazione del
      Blocco 8 dal Blocco 3.
- [ ] §2 cita P25 §3.4 e P26 §7.6 come infrastruttura già disponibile.
- [ ] §3 copre `AuthContext.tsx` (§3.1) e `SecuritySettings.tsx` (§3.2) con: stato attuale
      post-P27, stato dopo P32, cosa eliminato, cosa aggiunto, conferma esplicita che dopo
      P32 nessuno dei due file usa `@github/spark/hooks`.
- [ ] §4 ha tabella comparativa PIN globale vs PIN privato con almeno 7 dimensioni.
- [ ] §4 spiega in prosa la separazione della colonna `pin_privato_hash` dal JSONB `preferences`.
- [ ] Decisione A (§5) ha scelta definitiva (`NULL`) dichiarata in grassetto con citazione
      di P25 §3.4 («`NULL` = nessun PIN privato impostato») e P26 §7.6
      (`updatePinHash(null)` = rimozione).
- [ ] Decisione B (§6) ha scelta definitiva (verifica lato client) dichiarata in grassetto
      con motivazione che include: nessun transito del PIN in rete, latenza nulla, coerenza
      con il pattern attuale, funzionamento offline.
- [ ] Decisione C (§7) ha scelta definitiva (azioni centralizzate in `AuthContext`) dichiarata
      in grassetto con motivazione che include: eliminazione split-brain, principio di P27,
      autorità centralizzata.
- [ ] §8 ha tutti e 9 i punti del flusso (bootstrap, `isPrivateEnabled`, `isPrivateUnlocked`,
      sblocco, lock, `setPin`, `changePin`, `removePin`, logout).
- [ ] §9 ha tabella completa con 7 voci: `isPrivateEnabled`, `isPrivateUnlocked`,
      `unlockPrivate`, `lockPrivate`, `setPin`, `changePin`, `removePin`.
- [ ] §9 dichiara esplicitamente le voci rimosse dalla superficie: `privatePinHash` e
      `setPrivatePinHash`.
- [ ] §10 aggiorna il conteggio da P31 §10: da 6 a 2 chiamate `useKV` residue dopo P32,
      con tabella prima/dopo.
- [ ] §11 copre Blocco 7 (con nota esplicita su esclusione di `private-pin-hash` dalla
      migrazione one-shot), Blocco 9 (seed `pin_privato_hash = NULL`) e Blocco 10.
- [ ] §12 documenta almeno 3 punti aperti: algoritmo di hashing (P24 R10), gestione errore
      `updatePinHash()`, esclusione `private-pin-hash` da Blocco 7.
- [ ] Nessuna contraddizione con P24–P31 rilevata.
- [ ] Tutti i link `src/` usano path relativi (`../../src/...`).
- [ ] Nessun frammento di codice TypeScript, JSX o SQL eseguibile nel documento.

---

*Fine documento. Nessun file sorgente è stato modificato.*
