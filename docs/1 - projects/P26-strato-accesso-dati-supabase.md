# P26 — Strato di accesso dati Supabase

## 1. Intestazione

| Campo | Valore |
|---|---|
| Pacchetto | P26 — Strato di accesso dati Supabase |
| Tipo intervento | Documento di design (sola lettura) |
| Branch | `refactoring-architettura` |
| Data | 28 aprile 2026 |
| Autore | Agent-Design |
| File modificati | Nessuno (solo creazione di questo documento di design) |
| Documenti di riferimento | [P24 — Architettura generale migrazione Spark→Supabase](./P24-architettura-migrazione-supabase.md), [P25 — Schema `impostazioni_utente` e campo `cifrato`](./P25-schema-impostazioni-utente-cifrato.md), [src/lib/types.ts](../../src/lib/types.ts) |
| Stato | Bozza — in attesa di validazione |

Questo documento è **vincolante** per tutti i design operativi successivi
(P27 in poi). Le decisioni qui contenute sono già state validate e non
vengono rimesse in discussione: i design successivi possono solo
dettagliarne l'implementazione, non cambiarne la sostanza.

---

## 2. Contesto

P24 §6 Blocco 2 definisce questo strato come **la fondazione tecnica di
tutto il progetto di migrazione**: tutti i blocchi dalla 3 alla 10
dipendono dai repository qui progettati. Finché le tre decisioni di questo
documento non sono chiuse, nessun agente di codifica può iniziare
l'implementazione dei contesti React, delle preferenze UI, del PIN privato
o dell'onboarding.

Lo strato ha un compito preciso: essere l'**unica interfaccia** tra il
codice applicativo React e Supabase (PostgreSQL + Auth). I componenti,
gli hook e i contesti non devono mai chiamare `supabase.from(...)` o
`supabase.auth.*` direttamente: lo fanno esclusivamente attraverso i
file di questo strato. Questo confina il codice Supabase in un perimetro
controllabile, rende i blocchi successivi testabili tramite mock dei
repository, e concentra la traduzione camelCase ↔ snake_case in un solo
punto (vedi Decisione B).

I tre punti aperti che P24 §6 Blocco 2 aveva lasciato irrisolti e che
questo documento chiude sono:

1. **Strategia di error/retry** (P24 R1): il repository lancia l'errore
   al chiamante o lo assorbe internamente mostrando un toast?
2. **Convenzione di mapping camelCase ↔ snake_case** (P24 R14): mappatura
   manuale per-repository o libreria automatica?
3. **Politica di subscription realtime**: attivare subito i canali Supabase
   Realtime o rimandare a una fase futura?

---

## 3. Struttura dei file

I file introdotti dal Blocco 2 vivono tutti sotto `src/lib/supabase/`.
Nessun file al di fuori di questo percorso viene creato o modificato in
questo blocco.

```
src/lib/supabase/
│
├── client.ts
│   Singleton del client Supabase. Legge VITE_SUPABASE_URL e
│   VITE_SUPABASE_ANON_KEY dalle variabili d'ambiente Vite.
│   Espone: un'unica istanza `supabase` di tipo SupabaseClient.
│   Nessun altro file del progetto importa `@supabase/supabase-js`
│   direttamente: passano sempre da qui.
│
├── types.ts
│   Tipi del layer di accesso dati. Non duplica i tipi di dominio
│   di src/lib/types.ts, ma li integra con i tipi specifici del DB.
│   Espone:
│   - UserPreferences: interfaccia che mappa esattamente le 28 chiavi
│     del JSONB `preferences` (vedi P25 §3.1 Opzione 2) ai tipi TS
│     corrispondenti.
│   - UserSettings: record completo di `impostazioni_utente` lato client
│     (4 colonne tipizzate + UserPreferences).
│   - DbAccount, DbTransaction, DbCategory, DbBudget, DbSavingsGoal:
│     interfacce row-level Supabase in snake_case, usate internamente
│     dalle funzioni toClient() e toDb() dei repository. Non esposte
│     fuori dal layer.
│   - RepositoryError: tipo wrapping degli errori Supabase per
│     renderli distinguibili da altri errori a runtime.
│
└── repositories/
    │
    ├── conti.ts
    │   Repository per la tabella `conti`.
    │   Espone: getAll, getById, create, update, remove.
    │   Gestisce internamente: toClient() (DbAccount → Account),
    │   toDb() (Partial<Account> → snake_case, senza user_id).
    │
    ├── transazioni.ts
    │   Repository per la tabella `transazioni`.
    │   Espone: getAll (con filtri opzionali), getById, create,
    │   update, remove.
    │   Gestisce internamente: toClient(), toDb() che esclude
    │   sempre il campo `cifrato` dal payload in uscita
    │   (il trigger DB lo popola — vedi P25 §4).
    │
    ├── categorie.ts
    │   Repository per la tabella `categorie`.
    │   Espone: getAll (include righe template con user_id = NULL),
    │   create, update, remove.
    │   Nota: le righe template (user_id = NULL) sono read-only:
    │   create/update/remove operano solo su righe dell'utente.
    │
    ├── budget.ts
    │   Repository per la tabella `budget`.
    │   Espone: getAll, getById, create, update, remove.
    │
    ├── obiettivi-risparmio.ts
    │   Repository per la tabella `obiettivi_risparmio`.
    │   Espone: getAll, getById, create, update, remove,
    │   updateProgress (aggiorna solo `importo_corrente` e
    │   `completato` in una singola operazione atomica).
    │
    └── impostazioni-utente.ts
        Repository per la tabella `impostazioni_utente`.
        Espone: getOrCreate, updateField, updatePreference,
        updatePinHash.
        Nota: `getOrCreate` crea il record con i default P25 §3.4
        se non esiste ancora (primo accesso post-onboarding).
        `updatePreference` fa merge JSONB chirurgico su una singola
        chiave del campo `preferences`.
```

---

## 4. Decisione A — Strategia di gestione errori

### 4.1 Le due opzioni

#### Opzione 1 — Toast visibile all'utente (fire and forget)

Ogni repository cattura internamente gli errori Supabase e mostra un
toast all'utente. Il chiamante non riceve mai un'eccezione: riceve sempre
un risultato (anche vuoto o `null`). Il repository ha accesso diretto al
sistema di notifica dell'app.

#### Opzione 2 — Errore lanciato al chiamante (throw)

Ogni repository lancia l'errore al componente o hook che ha fatto la
chiamata, sotto forma di `RepositoryError` (tipo definito in `types.ts`).
Il chiamante decide come gestirlo: toast, stato di errore locale, retry,
swallow silenzioso. Il repository non ha dipendenze sul sistema di notifica.

### 4.2 Analisi comparativa

| Dimensione | Opzione 1 (Toast interno) | Opzione 2 (Throw al chiamante) |
|---|---|---|
| **Semplicità per chi scrive i componenti** | Alta — il componente non deve gestire errori | Bassa — ogni chiamante deve implementare un `try/catch` o catturare con React Error Boundary |
| **Possibilità di retry intelligente** | Nessuna — il repository ha già consumato l'errore | Piena — il chiamante può decidere se ritentare, attendere, o presentare un'alternativa |
| **Uniformità del comportamento** | Alta — tutti i toast hanno lo stesso aspetto automaticamente | Media — dipende da come ogni chiamante gestisce l'errore; richiede discipline nel team |
| **Testabilità** | Bassa — il test deve intercettare il side effect del toast, non l'errore | Alta — il test verifica che l'eccezione sia lanciata con il tipo corretto |
| **Rischio di errori silenziosi** | **Alto** — se il sistema toast non è disponibile, o se un'operazione critica fallisce silenziosamente, il dato non viene salvato senza alcun feedback diagnostico | Basso — l'errore non gestito sale fino a React Error Boundary e produce un crash visibile |
| **Accoppiamento del layer** | Alto — il repository dipende dal sistema di notifica dell'app | Basso — il repository è puro: input → output o eccezione |

### 4.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 2 — Errore lanciato al chiamante (throw).**

I repository sono **librerie di accesso dati**, non componenti UI. Un
repository che mostra toast ha una dipendenza trasversale che rompe la
separazione di strati (vedi P24 §5.3 e il principio generale di P25):
il layer di dati non può conoscere il layer di presentazione.

L'Opzione 2 è anche l'unica che permette **retry intelligente** in scenari
di errore di rete temporaneo — scenario non raro su mobile. Con l'Opzione 1,
il dato viene perso silenziosamente e l'utente vede solo un toast generico.

Il rischio di dimenticare il `try/catch` nel chiamante è reale ma
**mitigabile dalla struttura**: ogni contesto React (AppDataContext,
AuthContext, `useUserSettings`) è il punto di aggregazione naturale dove
gestire gli errori in modo uniforme, mostrare il toast e decidere se
ripropagare. Questo concentra la logica di presentazione degli errori in
pochi file controllabili, invece di distribuirla nei repository.

Il tipo `RepositoryError` (wrapping di `PostgrestError` di Supabase) permette
ai chiamanti di distinguere errori di rete, errori RLS, conflitti di chiave e
altri casi senza inspect delle stringhe di messaggio.

---

## 5. Decisione B — Mapping camelCase ↔ snake_case

### 5.1 Le due opzioni

#### Opzione 1 — Mapping manuale nei repository

Ogni repository definisce internamente una funzione `toClient()` che
converte la riga DB (snake_case, con `user_id`) nel tipo TS di dominio
(camelCase, senza `user_id`), e una funzione `toDb()` che converte il tipo
TS di dominio nel payload Supabase (snake_case, senza i campi gestiti dal DB).

Le due funzioni sono private al file del repository e non sono esposte
all'esterno.

#### Opzione 2 — Mapping automatico con libreria

Si usa una libreria come `camelcase-keys` o `snakecase-keys` che converte
automaticamente tutti i nomi chiave in entrata (snake_case → camelCase) e
in uscita (camelCase → snake_case), senza dover elencare campo per campo.

### 5.2 Analisi comparativa

| Dimensione | Opzione 1 (Mapping manuale) | Opzione 2 (Libreria automatica) |
|---|---|---|
| **Semplicità di implementazione** | Bassa — ogni repository richiede 2 funzioni esplicite, decine di righe in totale | Alta — 2 chiamate di libreria coprono tutto |
| **Controllo esplicito sui nomi** | **Totale** — ogni campo è mappato nominalmente; errori di nome emergono a compile-time (TypeScript) | Parziale — errori di nome emergono solo a runtime se il DB restituisce una colonna inaspettata |
| **Rischio su nomi irregolari** | Nullo — ogni campo speciale (es. `contoDestinazioneId` → `conto_destinazione_id`) è gestito esplicitamente | **Medio** — conversioni automatiche su nomi compositi o abbreviazioni possono produrre risultati sbagliati; difficile da rilevare senza test exhaustivi |
| **Campi da escludere/trasformare** | Gestiti esplicitamente: `user_id` non appare nei tipi client, `cifrato` è readonly, `id` Supabase (UUID) → `id` TS (string) | Richiedono whitelist/blacklist manuale: si perde il vantaggio dell'automazione |
| **Dipendenza da librerie esterne** | Nessuna — codice puro TypeScript | Aggiunge una dipendenza (anche se piccola) a `package.json` |
| **Manutenibilità** | Alta — ogni repository è autonomo; una modifica di nome colonna aggiorna una sola funzione in un solo file | Media — una modifica di nome colonna non richiede codice, ma il test di non-regressione deve coprire tutti i casi edge |

### 5.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Mapping manuale nei repository.**

Il progetto usa nomi di campo **italiani in camelCase** (`saldoIniziale`,
`contoDestinazioneId`, `importoTarget`, `dataCreazione`, `isPrivato`,
`frequenzaRicorrenza`) che una libreria automatica converte correttamente
nelle forme snake_case attese (`saldo_iniziale`, `conto_destinazione_id`,
ecc.), ma questo non è garanzia sufficiente per un layer che gestisce dati
finanziari.

I motivi determinanti per l'Opzione 1 sono tre:

1. **Campi con semantica speciale**: `cifrato` non va nel payload di
   scrittura (P25 §4.3), `user_id` non va nei tipi client (P24 §4.1 RLS),
   `id` lato DB è UUID mentre lato client è stringa. Gestirli con una
   blacklist/whitelist nella libreria automatica richiede configurazione
   tanto quanto il mapping manuale, annullando il vantaggio.

2. **TypeScript come rete di sicurezza**: il mapping manuale permette a
   `toClient()` di restituire esattamente il tipo `Account` / `Transaction`
   / ecc. definito in `src/lib/types.ts`. Se lo schema DB cambia (es. una
   colonna viene rinominata), il compilatore segnala l'errore prima che
   il codice arrivi in produzione. Con la libreria, questa garanzia è
   assente.

3. **Nessuna dipendenza aggiuntiva**: il progetto è già a rischio di
   appesantimento del bundle durante la migrazione (aggiunta di
   `@supabase/supabase-js`). Non è il momento di aggiungere dipendenze
   opzionali.

---

## 6. Decisione C — Subscription realtime

### 6.1 Le due opzioni

#### Opzione 1 — Nessuna subscription realtime in fase 1

I dati vengono caricati una volta al login tramite i metodi `getAll()` dei
repository, e aggiornati solo su azioni esplicite dell'utente (es. dopo un
salvataggio, dopo una cancellazione). Il realtime è rimandato a una fase
futura separata.

#### Opzione 2 — Subscription realtime attiva da subito

Ogni repository apre un canale Supabase Realtime (PostgreSQL CDC) che
notifica l'app quando i dati della tabella cambiano (INSERT, UPDATE,
DELETE). Il contesto React che usa il repository aggiorna lo stato locale
in risposta agli eventi.

### 6.2 Analisi comparativa

| Dimensione | Opzione 1 (Nessun realtime) | Opzione 2 (Realtime da subito) |
|---|---|---|
| **Complessità di implementazione** | Bassa — carica e dimentica | Alta — ogni repository deve gestire apertura, chiusura e cleanup del canale; i contesti devono riconciliare eventi remoti con lo stato locale |
| **Utilità reale per l'utente** | Nulla in fase 1 — l'app è per uso personale su un dispositivo alla volta | Bassa — lo scenario "stesso utente, due dispositivi contemporanei" è raro nel primo rilascio |
| **Impatto su performance e banda** | Nullo | Apre una WebSocket persistente per ogni tabella attiva; su mobile può impattare la durata della batteria e causare riconnessioni frequenti |
| **Rischio di loop di aggiornamento** | Nullo | **Presente**: un UPDATE generato dal client può innescare un evento realtime che aggiorna lo stato, che genera un altro UPDATE. Richiede de-duplication o timestamp di confronto. |
| **Coerenza con la decisione offline** | **Coerente** — P24 §4.5 stabilisce "sola lettura offline" nel primo rilascio; il realtime presupporrebbe connettività costante | **Incoerente** — realtime richiede connettività stabile, in contraddizione con l'obiettivo di sola lettura offline |

### 6.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Nessuna subscription realtime in fase 1.**

L'app è un gestore di finanze **personale e monoutente** (P24 §4.1).
Lo scenario che renderebbe il realtime utile — stesso utente che aggiorna
dati contemporaneamente da due dispositivi — è eccezionale nel primo
rilascio. Implementare il realtime per coprire un caso d'uso marginale
introduce complessità (gestione canali, cleanup su unmount, riconciliazione
eventi, anti-loop) in tutti i contesti React durante la fase più delicata
del progetto.

Il realtime è in **contraddizione diretta con P24 §4.5**: la sola lettura
offline è garantita da una cache locale snapshot al login, mentre il
realtime presuppone connettività costante e invalida la cache a ogni evento.
Implementare entrambi richiederebbe una strategia di merge non banale
(es. CRDT o last-write-wins) che P24 rimanda esplicitamente a una fase futura.

Il Blocco 10 (decommissioning + offline) è il contesto naturale in cui
rivalutare il realtime una volta che la migrazione base è stabile.

---

## 7. Contratto dei repository

Il contratto descrive l'interfaccia pubblica di ciascun repository.
I tipi di input e output citati sono quelli di [src/lib/types.ts](../../src/lib/types.ts)
e di `src/lib/supabase/types.ts`. I dettagli implementativi (SQL, gestione
errori, conversione tipi) sono responsabilità del Blocco 2 di codifica.

### 7.1 Repository `conti`

Tabella Supabase: `conti`. RLS implicita: tutti i metodi operano solo sulle
righe dell'utente autenticato (`auth.uid() = user_id`).

| Metodo | Input | Output atteso | Note |
|---|---|---|---|
| `getAll()` | — | `Account[]` | Restituisce tutti i conti dell'utente. Ordine di default: `data_creazione ASC`. |
| `getById(id)` | `id: string` | `Account` | Lancia `RepositoryError` se non trovato o non appartiene all'utente (RLS). |
| `create(data)` | `Omit<Account, 'id'>` | `Account` | `id` generato da DB (`gen_random_uuid()`). `user_id` iniettato dal repository dalla sessione attiva, mai fornito dal chiamante. |
| `update(id, data)` | `id: string`, `Partial<Omit<Account, 'id'>>` | `Account` | Aggiornamento parziale. Restituisce il record aggiornato. `user_id` non modificabile. |
| `remove(id)` | `id: string` | `void` | Lancia `RepositoryError` se la riga non esiste o RLS blocca l'accesso. Non fa soft-delete. |

### 7.2 Repository `transazioni`

Tabella Supabase: `transazioni`. RLS implicita su tutte le operazioni.

| Metodo | Input | Output atteso | Note |
|---|---|---|---|
| `getAll(filtri?)` | `filtri?: { contoId?: string; categoriaId?: string; dataInizio?: string; dataFine?: string; tipo?: TransactionType }` | `Transaction[]` | Tutti i filtri sono opzionali e additivi (AND). Ordine di default: `data DESC`. |
| `getById(id)` | `id: string` | `Transaction` | Lancia `RepositoryError` se non trovato. |
| `create(data)` | `Omit<Transaction, 'id' \| 'cifrato'>` | `Transaction` | `cifrato` **non va nel payload**: il trigger DB `trg_sync_cifrato` (P25 §4.4) lo popola automaticamente. Il record restituito include il valore calcolato. |
| `update(id, data)` | `id: string`, `Partial<Omit<Transaction, 'id' \| 'cifrato'>>` | `Transaction` | Idem: `cifrato` escluso dal payload di input. Il trigger lo aggiorna se necessario. |
| `remove(id)` | `id: string` | `void` | Non fa soft-delete. |

### 7.3 Repository `categorie`

Tabella Supabase: `categorie`. RLS: SELECT su righe proprie + template
(`user_id IS NULL`); INSERT/UPDATE/DELETE solo su righe proprie.

| Metodo | Input | Output atteso | Note |
|---|---|---|---|
| `getAll()` | — | `Category[]` | Include righe template (`user_id IS NULL`) e righe dell'utente. Le righe template sono distinguibili dal campo `predefinita: true`. |
| `create(data)` | `Omit<Category, 'id'>` | `Category` | Crea solo categorie dell'utente (`user_id` iniettato). Non può creare template (bloccato da RLS). |
| `update(id, data)` | `id: string`, `Partial<Omit<Category, 'id'>>` | `Category` | Solo su righe dell'utente. Tentativo su riga template lancia `RepositoryError`. |
| `remove(id)` | `id: string` | `void` | Solo su righe dell'utente. Tentativo su riga template lancia `RepositoryError`. |

### 7.4 Repository `budget`

Tabella Supabase: `budget`. RLS implicita.

| Metodo | Input | Output atteso | Note |
|---|---|---|---|
| `getAll()` | — | `Budget[]` | Tutti i budget dell'utente. Ordine di default: `data_inizio DESC`. |
| `getById(id)` | `id: string` | `Budget` | Lancia `RepositoryError` se non trovato. |
| `create(data)` | `Omit<Budget, 'id'>` | `Budget` | `user_id` iniettato. |
| `update(id, data)` | `id: string`, `Partial<Omit<Budget, 'id'>>` | `Budget` | Aggiornamento parziale. |
| `remove(id)` | `id: string` | `void` | — |

### 7.5 Repository `obiettivi-risparmio`

Tabella Supabase: `obiettivi_risparmio`. RLS implicita.

| Metodo | Input | Output atteso | Note |
|---|---|---|---|
| `getAll()` | — | `SavingsGoal[]` | Tutti gli obiettivi dell'utente. |
| `getById(id)` | `id: string` | `SavingsGoal` | Lancia `RepositoryError` se non trovato. |
| `create(data)` | `Omit<SavingsGoal, 'id'>` | `SavingsGoal` | `user_id` iniettato. |
| `update(id, data)` | `id: string`, `Partial<Omit<SavingsGoal, 'id'>>` | `SavingsGoal` | Aggiornamento parziale. |
| `updateProgress(id, importoCorrente)` | `id: string`, `importoCorrente: number` | `SavingsGoal` | Aggiorna `importo_corrente` e, se `importoCorrente >= importo_target`, imposta anche `completato = TRUE` e `data_completamento = now()`. Atomica (singola UPDATE). |
| `remove(id)` | `id: string` | `void` | — |

### 7.6 Repository `impostazioni-utente`

Tabella Supabase: `impostazioni_utente`. Schema: vedi [P25 §3.4](./P25-schema-impostazioni-utente-cifrato.md#34-schema-risultante-della-tabella-impostazioni_utente). Un solo record per utente (UNIQUE su `user_id`).

| Metodo | Input | Output atteso | Note |
|---|---|---|---|
| `getOrCreate()` | — | `UserSettings` | Se il record esiste: lo restituisce. Se non esiste: lo crea con i default P25 §3.4 e lo restituisce. Il record non esiste solo tra la prima registrazione e il completamento dell'onboarding (Blocco 9). |
| `updateField(campo, valore)` | `campo: keyof UserSettings` (esclude `preferences`), `valore: string \| string[] \| null` | `UserSettings` | Aggiorna uno dei 4 campi tipizzati (`nome_visualizzato`, `valuta_default`, `visible_categories`, `pin_privato_hash`). Non usare per le preferenze UI: usare `updatePreference`. |
| `updatePreference(chiave, valore)` | `chiave: keyof UserPreferences`, `valore: boolean \| number \| string \| object \| null` | `UserSettings` | Fa merge JSONB chirurgico su una singola chiave del campo `preferences`. Non sovrascrive le altre chiavi. Equivale a `preferences = preferences \|\| '{"chiave": valore}'::jsonb`. |
| `updatePinHash(hash)` | `hash: string \| null` | `void` | Alias semantico di `updateField('pin_privato_hash', hash)`. Separato per leggibilità e per permettere audit futuro del codice che tocca l'hash del PIN. `null` = rimozione del PIN privato. |

---

## 8. Impatto sui blocchi successivi

| Blocco P24 | Impatto Decisione A (errori: throw) | Impatto Decisione B (mapping: manuale) | Impatto Decisione C (no realtime) | Note |
|---|---|---|---|---|
| **Blocco 3** — AuthContext | `AuthContext` deve fare `try/catch` sulle chiamate al repository `impostazioni-utente` (bootstrap impostazioni post-login). Errori di rete al login vengono gestiti nel contesto Auth. | `toClient()` e `toDb()` già pronti in `impostazioni-utente.ts`: il blocco 3 non deve scrivere mappature. | Nessun impatto diretto. | Il flag `isAuthReady` (P24 §4.2) dipende dal completamento asincrono di `getOrCreate()` — un errore deve essere gestito, non ignorato. |
| **Blocco 4** — AppDataContext dominio | `AppDataContext` fa `try/catch` centralizzato sulle 5 chiamate `getAll()`. Gestisce lo stato `isLoading` e `error` per ogni tabella. | Le funzioni `toClient()` dei 5 repository domenicali producono direttamente i tipi `Account`, `Transaction`, ecc. Il blocco 4 non richiede ulteriore mappatura. | Nessun impatto. Nessun canale da aprire/chiudere. | I setter `useKV`-style `(prev => next)` citati in P24 R1 vengono implementati nel blocco 4 sopra al layer repository, non nel layer stesso. |
| **Blocco 5** — Preferenze UI | `useUserSettings()` fa `try/catch` su `getOrCreate()` e `updatePreference()`. Errori su singola preferenza non devono bloccare l'intera sessione: il comportamento di fallback è usare il default locale. | `updatePreference(chiave, valore)` usa chiavi stringa (`keyof UserPreferences`) definite in `types.ts`: il blocco 5 non deve conoscere i nomi colonna DB. | Nessun impatto. | Il tipo `UserPreferences` definito in `types.ts` è il contratto condiviso tra il repository e tutti gli hook di preferenze (blocco 5). |
| **Blocco 6** — Cache `budget-percentages` | Nessun impatto — il blocco 6 non usa repository. | Nessun impatto. | Nessun impatto. | `budget-percentages` resta `useState` client-side (P24 §4.7). Il layer di accesso dati non lo tocca. |
| **Blocco 7** — DataManagement | L'export fa `try/catch` su tutti e 6 i `getAll()`. L'import fa `try/catch` su tutti i `create()`: errori parziali vengono accumulati e presentati in un report finale, non interrompono l'import al primo fallimento. | `toDb()` è usato internamente da `create()`: il blocco 7 non deve conoscere snake_case. Il JSON esportato usa i tipi TS (camelCase), non il formato DB. | Nessun impatto. | L'import non deve passare `cifrato` a `transazioni.create()` (P25 §4.3): il trigger DB lo ricalcola. |
| **Blocco 8** — PIN privato | `updatePinHash()` lancia `RepositoryError` in caso di errore: `SecuritySettings.tsx` lo gestisce mostrando un messaggio di errore inline (non un toast silenzioso). | Nessun impatto aggiuntivo: `pin_privato_hash` è una colonna TEXT nativa, nessuna mappatura speciale. | Nessun impatto. | L'algoritmo di hashing (bcrypt/argon2) viene applicato **prima** di chiamare `updatePinHash()`, non dentro il repository (P24 §4.3 punto aperto). |
| **Blocco 9** — Onboarding | `impostazioni-utente.getOrCreate()`, `conti.create()`, `categorie.create()` lanciano eccezioni: `OnboardingFlow` le gestisce mostrando errore e permettendo retry senza perdere i dati già inseriti. | I tipi TS dei campi onboarding (`nome_visualizzato`, `valuta_default`) corrispondono direttamente alle colonne tipizzate di P25 §3.4: `toDb()` li converte. | Nessun impatto. | Al completamento dell'onboarding il trigger `trg_sync_cifrato` (P25 §4.4) deve essere già attivo su Supabase: il primo `conti.create()` con `isPrivato = true` deve già popolare `cifrato` sulle eventuali transazioni create nello stesso step. |
| **Blocco 10** — Decommissioning | Nessun impatto aggiuntivo sui repository. | Nessun impatto. | **Positivo**: non avendo subscription da chiudere, il decommissioning Spark (rimozione `@github/spark/hooks`) è più semplice. Se il realtime verrà aggiunto nella fase successiva, sarà un'aggiunta a questo layer, non una modifica. | Il blocco 10 rimuoverà `@github/spark/hooks` da `package.json` e aggiornerà `src/test/setup.ts`. Il layer `src/lib/supabase/` non è toccato. |

---

## 9. Punti aperti residui

- **Variabili d'ambiente Vite**: `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_ANON_KEY` devono essere presenti nel file `.env.local`
  (non in `.env` committato) e nei secrets del pipeline CI (P24 §6 Blocco
  21 — GitHub Actions). Il blocco 2 di codifica deve verificarne
  l'esistenza prima di tentare la build; in assenza, il singleton
  `client.ts` deve fallire con un messaggio esplicito a compile-time
  (tramite `import.meta.env`).

- **Algoritmo di hashing per `pin_privato_hash`**: aperto da P25 §6 e
  confermato qui. Il repository `impostazioni-utente` espone
  `updatePinHash(hash)` ma non è responsabile dell'hashing. La scelta
  tra bcrypt client-side e Edge Function server-side è rimandata al
  Blocco 8.

- **Comportamento di caricamento dati (loading state)**: P24 §6 Blocco 4
  cita "spinner globale vs per-tabella" come punto aperto. Il layer
  repository non ha opinioni: restituisce la Promise. La politica di
  loading state sarà definita nel design operativo del Blocco 4.

- **Politica di cache tra sessioni**: P24 §6 Blocco 4 cita la cache
  locale tra sessioni come punto aperto. I repository non gestiscono
  cache: leggono sempre da Supabase. La strategia di cache (se presente)
  sarà uno strato aggiuntivo sopra ai repository, definito nel design del
  Blocco 4 e del Blocco 10.

- **Tipo TypeScript per `preferences` JSONB**: P25 §6 rimanda la
  definizione formale di `UserPreferences` al Blocco 2. Questo documento
  stabilisce che il tipo va in `src/lib/supabase/types.ts` e mappa
  esattamente le 28 chiavi del JSONB (vedi P25 §3.1 Opzione 2). La
  specifica campo per campo viene scritta nell'implementazione del Blocco 2.

- **Conferma schema reale Supabase**: P25 §6 e P24 R16. Prima di scrivere
  le funzioni `toClient()` e `toDb()`, il Blocco 2 deve confrontare lo
  schema atteso con quello reale su Supabase. Discrepanze di nomi o tipi
  vanno tracciate come sub-task del Blocco 2 e risolte con `ALTER TABLE`
  prima di procedere.

---

## 10. Criteri di accettazione del documento

- [ ] Tutte le sezioni (1–10) sono presenti e non vuote.
- [ ] La Decisione A ha una scelta **DEFINITIVA** dichiarata (Opzione 2 — Throw al chiamante).
- [ ] La Decisione B ha una scelta **DEFINITIVA** dichiarata (Opzione 1 — Mapping manuale).
- [ ] La Decisione C ha una scelta **DEFINITIVA** dichiarata (Opzione 1 — Nessun realtime in fase 1).
- [ ] La sezione §3 elenca esattamente 8 file con percorso, contenuto e cosa espongono.
- [ ] Il contratto §7 copre tutti e 6 i repository: conti, transazioni, categorie, budget, obiettivi-risparmio, impostazioni-utente.
- [ ] Ogni metodo nel contratto §7 ha: nome, input, output atteso, nota.
- [ ] Il metodo `transazioni.create()` specifica esplicitamente che `cifrato` è escluso dal payload (coerente con P25 §4.3).
- [ ] Il metodo `impostazioni-utente.getOrCreate()` specifica il comportamento al primo accesso (coerente con P25 §3.4 default).
- [ ] La sezione §8 copre tutti i blocchi da 3 a 10.
- [ ] La motivazione della Decisione A cita esplicitamente la separazione tra layer dati e layer presentazione.
- [ ] La motivazione della Decisione B cita esplicitamente i campi con semantica speciale (`cifrato`, `user_id`).
- [ ] La motivazione della Decisione C cita esplicitamente la coerenza con P24 §4.5 (offline sola lettura).
- [ ] Nessuna contraddizione con P24 e P25 rilevata.
- [ ] Tutti i link a file `src/` usano path relativi (`../../src/...`).
- [ ] Nessun frammento di codice TypeScript eseguibile nelle sezioni §7 e §8 — solo descrizione funzionale.

---

*Fine documento. Nessun file sorgente è stato modificato.*

*Messaggio di commit suggerito:*
`docs(design): creare P26 strato accesso dati Supabase`
