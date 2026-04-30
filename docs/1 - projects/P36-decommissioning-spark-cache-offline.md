# P36 — Decommissioning Spark e cache offline read-only

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P36 — Decommissioning Spark e cache offline read-only |
| **Tipo intervento** | Documento di design (sola lettura) |
| **Branch** | `refactoring-architettura` |
| **Data** | 30 aprile 2026 |
| **Autore** | Agent-Design |
| **File modificati** | `package.json` · `vite.config.ts` · `src/test/setup.ts` · `src/lib/constants.ts` (certificazione o rimozione `DEFAULT_CATEGORIES`) · `src/components/DataManagement.tsx` (rimozione Fronte A dopo periodo di grazia) · `src/lib/supabase/cache.ts` (nuovo — parte 10b) · `src/components/AppHeader.tsx` (aggiunta indicatore offline — parte 10b) |
| **Documenti di riferimento** | [P24](./P24-architettura-migrazione-supabase.md) · [P26](./P26-strato-accesso-dati-supabase.md) · [P27](./P27-migrazione-authcontext-supabase.md) · [P28](./P28-migrazione-appdatacontext-supabase.md) · [P29](./P29-migrazione-usersettings-preferenze-ui.md) · [P30](./P30-migrazione-budgetpercentages-usestate.md) · [P31](./P31-migrazione-preferenze-display-audio-screenreader.md) · [P32](./P32-migrazione-pin-privato-supabase.md) · [P33](./P33-migrazione-categorymanagement-useappdata.md) · [P34](./P34-migrazione-datamanagement-supabase.md) · [P35](./P35-onboarding-primo-accesso-supabase.md) · [src/test/setup.ts](../../src/test/setup.ts) · [src/lib/constants.ts](../../src/lib/constants.ts) · [src/lib/sound-system.ts](../../src/lib/sound-system.ts) · [vite.config.ts](../../vite.config.ts) |
| **Stato** | Bozza — in attesa di validazione |

> **Questo documento chiude l'architettura di migrazione Spark → Supabase definita in P24.
> Al completamento del Blocco 10, nessuna dipendenza da `@github/spark/hooks` o da
> `window.spark.kv.*` deve sopravvivere nel codebase. Le decisioni qui contenute sono
> vincolanti per il coding plan del Blocco 10.**

---

## §2 — Contesto

### Il Blocco 10 nell'economia della migrazione

Il Blocco 10 è l'ultimo blocco definito in [P24 §6](./P24-architettura-migrazione-supabase.md).
Il suo completamento chiude l'intera architettura di migrazione Spark → Supabase. A differenza
di tutti i blocchi precedenti — ciascuno dei quali sposta un sottoinsieme di dati o preferenze
da Spark KV a Supabase — il Blocco 10 non migra nulla: rimuove il substrato su cui si reggevano
le migrazioni precedenti e introduce la prima capacità genuinamente nuova dell'architettura
Supabase: la lettura offline garantita.

### Stato al momento dell'ingresso nel Blocco 10

Tutti i blocchi 1–9 sono completati. Questo significa:

- **Autenticazione (Blocco 3 — P27)**: `AuthContext.tsx` e `AuthScreen.tsx` usano Supabase Auth
  con email e password. Le chiavi `global-pin-hash` e `private-pin-hash` sono state rimosse da
  `AuthContext` e `SecuritySettings.tsx`. La chiave `global-pin-hash` non esiste più; il PIN
  privato è in `impostazioni_utente.pin_privato_hash`.

- **Dati di dominio (Blocco 4 — P28)**: `AppDataContext.tsx` usa i repository Supabase (P26)
  per le 5 tabelle di dominio. `CategoryManagement.tsx` non ha più la propria chiamata
  `useKV('categories', [])` parallela (rimossa da P33 — Blocco 9).

- **Preferenze UI/A11y/Audio (Blocco 5 — P29, P31)**: tutte le 28 chiavi di preferenze
  (`display-*`, `sr-*`, `audio-*`, `talkback-*`, `visible-categories`,
  `dismissed-budget-alerts`) sono migrate in `impostazioni_utente.preferences JSONB`.
  `DisplaySettings.tsx`, `ScreenReaderSettings.tsx`, `AudioSettings.tsx`, `use-talkback.ts`,
  `use-display-preferences.ts` non hanno più `useKV`. Il singleton `sound-system.ts` ha
  ricevuto l'iniezione del client Supabase tramite `setClient()` (P31 Wave A): le chiamate
  `window.spark.kv.get/set` su `audio-enabled` e `audio-volume` sono state rimosse.

- **Budget percentages (Blocco 6 — P30)**: `AppDataContext.tsx` usa `useState` per
  `budgetPercentages`. Nessun `useKV` rimasto in `AppDataContext`.

- **Migrazione one-shot e backup JSON (Blocco 7 — P34)**: `DataManagement.tsx` usa i
  repository Supabase per export e import. Le chiamate `window.spark.kv.keys()`, `.get()` e
  `.set()` per le funzioni legacy di export/import sono rimosse. **Rimangono** chiamate
  `window.spark.kv.get()` per il rilevamento dei dati storici del Fronte A (vedi §4 e §5.5).

- **PIN privato (Blocco 8 — P32)**: `AuthContext.tsx` usa `impostazioni_utente.pin_privato_hash`
  via repository. `SecuritySettings.tsx` non ha più `useKV` per i PIN hash.

- **Onboarding e CategoryManagement (Blocco 9 — P33, P35)**: `CategoryManagement.tsx` non ha
  più `useKV('categories', [])`. `OnboardingFlow.tsx` non ha mai usato Spark (P35 §3.1 certifica
  questo esplicitamente). Dopo P33 e P35, **nessun file `src/` di produzione** usa `useKV` da
  `@github/spark/hooks`.

### Cosa resta da fare nel Blocco 10

All'ingresso nel Blocco 10, le dipendenze da Spark sopravvissute ai blocchi 1–9 sono:

1. **`src/test/setup.ts`**: contiene il mock completo di `@github/spark/hooks` (la funzione
   `useKV` simulata tramite `Map`) e il mock di `window.spark.kv.*`. Finché esiste questo
   file, il pacchetto `@github/spark` deve restare nelle dipendenze del progetto.

2. **`src/components/DataManagement.tsx`**: le chiamate `window.spark.kv.get()` per il
   rilevamento dei dati storici del Fronte A (P34 §10). Questo accesso è necessario durante
   il periodo di grazia post-migrazione; il Blocco 10 lo rimuove quando la finestra di
   migrazione si chiude.

3. **`vite.config.ts`**: due import da `@github/spark/*` non previsti da P24 §8:
   `sparkPlugin` da `@github/spark/spark-vite-plugin` e `createIconImportProxy` da
   `@github/spark/vitePhosphorIconProxyPlugin`. La loro rimozione è necessaria per il
   decommissioning completo.

4. **`package.json`**: il pacchetto `@github/spark` è elencato nelle `dependencies` come
   `"@github/spark": ">=0.43.1 <1"`. Può essere rimosso solo dopo che tutti i file
   precedenti non vi fanno più riferimento.

5. **`src/lib/constants.ts`**: `DEFAULT_CATEGORIES` è ancora presente. P24 §8 prevedeva
   che «diventerà template server-side (blocco 9)». Il coding plan del Blocco 9 deve
   certificarne la rimozione; se non rimossa, il Blocco 10 la gestisce definitivamente.

### La duplice natura del Blocco 10

Il Blocco 10 ha due componenti con caratteristiche architetturali molto diverse:

**Componente 10a — Rimozione Spark**: operazione chirurgica e a basso rischio. Se i blocchi
1–9 sono stati completati correttamente, non esiste nessuna chiamata `useKV` o
`window.spark.kv.*` in produzione (eccetto il Fronte A di P34, con la sua logica di grazia
documentata). La rimozione di `@github/spark` è una questione di sequenza corretta e di
test post-rimozione.

**Componente 10b — Cache offline read-only**: operazione architetturalmente più complessa,
introdotta qui per la prima volta. Richiede una decisione di strategia (P24 §4.5 rimanda il
design a questo documento), l'implementazione di un nuovo layer di cache, e una UI per
comunicare lo stato offline all'utente.

[P24 §6 Blocco 10](./P24-architettura-migrazione-supabase.md) prevede esplicitamente la
possibilità di dividere il blocco in **10a** (rimozione Spark) e **10b** (offline). La
Decisione A in §3 risolve questa possibilità.

---

## §3 — Decisione A: dividere in 10a e 10b o procedere unito?

### Analisi comparativa

| Dimensione | Blocco unito (10a+10b insieme) | Blocco diviso (10a poi 10b) |
|---|---|---|
| **Rischio di accoppiamento** | **Alto**: un bug nella cache offline (10b) blocca il rilascio della rimozione Spark (10a), che è l'operazione urgente e a basso rischio. Un rollback dell'intero blocco richiederebbe di re-introdurre temporaneamente Spark nel codebase. | **Basso**: 10a è autosufficiente. Un problema nella 10b non impatta il decommissioning già completato. I due componenti sono ortogonali: rimuovere Spark non crea dipendenze dalla cache offline. |
| **Impatto su test e CI** | `src/test/setup.ts` deve essere aggiornato in modo atomico insieme a tutti gli altri file: rimozione dei mock Spark, aggiunta dei mock Supabase, e aggiunta dei test per la cache offline, in un unico PR. Il rischio di regressione in CI è massimo. | La 10a aggiorna `src/test/setup.ts` solo per rimuovere i mock Spark; la 10b aggiunge i test della cache offline in un PR separato. Ogni ciclo di CI valida un perimetro più contenuto. |
| **Parallelizzabilità** | Non parallelizzabile: la 10b deve aspettare che la 10a sia completata per avere un codebase pulito su cui costruire. Ma se uniti nello stesso sprint, impongono un perimetro di PR molto ampio. | **Alta**: 10a può essere avviata non appena Block 9 è completato. 10b può essere progettata e sviluppata in parallelo su un branch separato, partendo dalla baseline pulita di 10a. |
| **Sequenza di deploy in produzione** | Il deploy include sia la rimozione di Spark sia l'attivazione della cache offline. Se la cache offline introduce un bug (es. dati stale, loop di read da localStorage), non è possibile fare hotfix su Spark removal senza portare con sé il codice offline difettoso. | **10a può essere deployata indipendentemente**: dopo 10a, il codebase è pulito e funzionante esattamente come dopo il Blocco 9, ma senza Spark. La 10b viene deployata in un rilascio successivo. L'app è funzionante tra 10a e 10b; semplicemente non ha ancora la cache offline. |
| **Coerenza con P26 §8** | P26 §8 dice: «Il blocco 10 rimuoverà `@github/spark/hooks` da `package.json` e aggiornerà `src/test/setup.ts`»; non menziona la cache offline come parte di quel blocco. Unire i due componenti non crea incompatibilità con P26, ma amplia il perimetro oltre quanto P26 anticipava. | **Piena coerenza**: P26 §8 descrive esattamente il perimetro di 10a. La 10b è un'estensione architetturale separata, coerente con l'indicazione di P24 §4.5: «cache locale via service worker o cache del client Supabase» definita nel «design operativo dedicato all'offline». |

### Decisione finale e motivazione

**DECISIONE: Il Blocco 10 è diviso in 10a e 10b.**

Il fattore determinante è il rischio di accoppiamento. La rimozione di Spark (10a) è
un'operazione di pulizia che deve poter procedere non appena il Blocco 9 è completato:
ritardarla per attendere il completamento della cache offline (10b) introdurrebbe un debito
tecnico inutile — il codebase rimarrebbe con dipendenze da `@github/spark` anche quando non
ne ha più bisogno.

La cache offline (10b) è un'aggiunta di capacità, non una correzione: l'app è pienamente
funzionante senza di essa. Non esiste nessuna ragione per cui il deploy di 10a debba aspettare
il completamento di 10b.

**Perimetro di 10a** (descritto in §5 di questo documento):
- `src/test/setup.ts`: rimozione mock Spark, aggiornamento per Supabase
- `src/components/DataManagement.tsx`: rimozione Fronte A (dopo periodo di grazia documentato)
- `vite.config.ts`: rimozione plugin Spark
- `package.json`: rimozione `@github/spark`
- `src/lib/constants.ts`: certificazione o rimozione `DEFAULT_CATEGORIES`

**Perimetro di 10b** (descritto in §6 di questo documento):
- `src/lib/supabase/cache.ts`: nuovo file (layer di cache localStorage)
- `src/components/AppHeader.tsx`: aggiunta indicatore stato offline
- Eventuale aggiornamento dei repository di P26 per integrazione con la cache

**Impatto su PA-4 §10**: la divisione in 10a e 10b è esplicitamente documentata come PA-4:
il coding plan del Blocco 10 deve specificare i confini esatti del commit di 10a e del commit
di 10b, garantendo che 10a sia deployabile e funzionante in autonomia.

---

## §4 — Censimento residuo delle dipendenze Spark

Questa sezione certifica tutte le dipendenze da Spark sopravvissute ai blocchi 1–9. La baseline
è la fotografia iniziale di [P24 §3](./P24-architettura-migrazione-supabase.md): 45 chiamate
`useKV` + 8 chiamate `window.spark.kv.*`, ridistribuite su 13+ file sorgente. I blocchi 3–9
le hanno rimosse secondo il piano definito in P27–P35. Ciò che segue è il residuo documentato.

### Tabella completa delle dipendenze residue

| File sorgente | Dipendenza residua | Chiave Spark coinvolta | Blocco di competenza originale | Azione richiesta dal Blocco 10 |
|---|---|---|---|---|
| `src/test/setup.ts` | `vi.mock('@github/spark/hooks', () => ({ useKV: ... }))` — blocco righe 21–46: mock completo della funzione `useKV` con `Map` come store, funzioni helper `resetTestKvStore()` e `seedTestKvStore()` | Mock di tutte le chiavi KV (usato da tutti i test) | Blocco 10 | Rimuovere l'intero blocco del mock `@github/spark/hooks`; rimuovere le funzioni helper `resetTestKvStore` e `seedTestKvStore`; rimuovere l'import `useState` se usato solo dal mock |
| `src/test/setup.ts` | `Object.defineProperty(window, 'spark', { value: { kv: sparkKvMock } })` — blocco righe 49–64: mock della variabile globale `window.spark.kv` con `get`, `set`, `keys` come `vi.fn()` + variabile `sparkKvMock` | Mock di `window.spark.kv.*` (usato dai test che verificano `DataManagement.tsx` Fronte A) | Blocco 10 | Rimuovere `sparkKvMock`, `kvStore`, e `Object.defineProperty(window, 'spark', ...)` quando DataManagement.tsx Fronte A è stato rimosso |
| `src/test/setup.ts` | `afterEach(() => { cleanup(); resetTestKvStore() })` | Dipendente da `resetTestKvStore` (mock KV) | Blocco 10 | Rimuovere la chiamata `resetTestKvStore()` dall'`afterEach`; mantenere `cleanup()` |
| `src/components/DataManagement.tsx` | Chiamate `window.spark.kv.get(key)` per il rilevamento dei dati storici nel Fronte A (pannello migrazione one-shot) | `accounts`, `transactions`, `categories`, `budgets`, `savings-goals` (lettura selettiva, non iterazione generica) | Blocco 10 (post-periodo di grazia per migrazione — vedi §5.5 e PA-4) | Rimuovere il pannello Fronte A e tutte le chiamate `window.spark.kv.*` residue; la rimozione è condizionata al periodo di grazia documentato |
| `vite.config.ts` | `import sparkPlugin from "@github/spark/spark-vite-plugin"` e uso come `sparkPlugin() as PluginOption` nell'array `plugins` | — | Non previsto da P24 §8 — scoperto dalla lettura di `vite.config.ts` in P36 | Rimuovere l'import e il plugin dall'array; verificare che la build Vite funzioni senza |
| `vite.config.ts` | `import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin"` e uso come `createIconImportProxy() as PluginOption` nell'array `plugins` (preceduto da commento `// DO NOT REMOVE`) | — | Non previsto da P24 §8 — scoperto dalla lettura di `vite.config.ts` in P36 | Rimuovere l'import e il plugin; valutare impatto sugli import `@phosphor-icons/react` (PA-5 §10) |
| `package.json` | `"@github/spark": ">=0.43.1 <1"` nelle `dependencies` | — | Blocco 10 | Rimuovere la voce dopo la rimozione di tutti gli import `@github/spark/*` nei file sopra |
| `src/lib/constants.ts` | `DEFAULT_CATEGORIES: Omit<Category, 'id'>[]` — array di 18 categorie template con `predefinita: true` | — | P24 §8 prevedeva: «diventerà template server-side (Blocco 9)» | Il coding plan del Blocco 9 certifica la rimozione di questa costante (PA-x in P33/P35). Se non rimossa da Blocco 9, il Blocco 10 la rimuove o la converte in fallback documentato (§5.3) |

### Certificazione

**Dipendenze `useKV` residue dopo i blocchi 1–9**: 0 nei file di produzione. L'ultima chiamata
`useKV` in produzione era in `CategoryManagement.tsx` (riga 38): rimossa da P33 (Blocco 9).

**Dipendenze `window.spark.kv.*` residue**: 2 file. `DataManagement.tsx` (Fronte A, accesso
selettivo ai dati storici) e `src/test/setup.ts` (mock). La prima è temporanea per periodo di
grazia; la seconda è infrastruttura di test.

**Dipendenze `@github/spark/*` nei file di configurazione**: 2 in `vite.config.ts`
(`spark-vite-plugin` e `vitePhosphorIconProxyPlugin`). Non anticipate da P24 §8; identificate
per la prima volta in P36.

**`@github/spark/hooks` può essere rimosso da `package.json`**: sì, immediatamente dopo la
rimozione di `src/test/setup.ts` mock e dei plugin Vite, perché nessun file di produzione
fa riferimento a `@github/spark/hooks` dopo il Blocco 9. Il pacchetto radice `@github/spark`
(unica voce in `package.json`) copre tutti i sotto-moduli; la sua rimozione finale dipende
dalla chiusura del Fronte A in `DataManagement.tsx` (condizionata al periodo di grazia).

---

## §5 — Rimozione di @github/spark (parte 10a)

### 5.1 `package.json`

**Stato attuale**: `"@github/spark": ">=0.43.1 <1"` è elencato nelle `dependencies` (non
`devDependencies`). Il pacchetto fornisce tutti i sotto-moduli usati nel codebase: `hooks`
(useKV), `spark-vite-plugin`, `vitePhosphorIconProxyPlugin`. È l'unica dipendenza
`@github/spark` in `package.json` (verificato: nessuna voce separata per i sotto-moduli).

**Stato dopo 10a**: la voce `@github/spark` viene rimossa da `dependencies`. La rimozione è
il **passo finale** di 10a: può avvenire solo dopo che:

1. Il mock di `@github/spark/hooks` è stato rimosso da `src/test/setup.ts` (§5.2).
2. I plugin `sparkPlugin` e `createIconImportProxy` sono stati rimossi da `vite.config.ts` (§5.1 e §5.5).
3. La rimozione del Fronte A da `DataManagement.tsx` è completata (§5.5) o è stata pianificata
   la fase transitoria del periodo di grazia (PA-4 §10).

**Verifica post-rimozione**: una build Vite pulita (`vite build`) senza errori di importazione
è il criterio di uscita della 10a. I test devono passare senza il mock di `@github/spark/hooks`.

**Certificazione import `vite.config.ts`**: P24 §8 prevedeva «nessuna modifica pianificata»
per `vite.config.ts`. P36 documenta che questa previsione era incompleta: `vite.config.ts`
importa due plugin da `@github/spark/*` che devono essere rimossi. La rimozione di `@github/spark`
da `package.json` senza aver rimosso prima i relativi import da `vite.config.ts` causerebbe un
errore di build. L'ordine di esecuzione è: modificare `vite.config.ts` → verificare build →
rimuovere `@github/spark` da `package.json`.

### 5.2 `src/test/setup.ts`

**Stato attuale** (dal file letto direttamente):

Il file ha 133 righe e contiene:

- **Righe 1–3**: import di `@testing-library/jest-dom`, `cleanup` e `useState`. L'import di
  `useState` è usato esclusivamente dentro il mock di `useKV`.
- **Righe 5–13**: variabile `kvStore: Map<string, unknown>` e funzione `cloneValue<T>`. Il KV
  store è la struttura dati del mock.
- **Righe 15–18**: funzione `resetTestKvStore()` — cancella il KV store. Esportata e usata
  nell'`afterEach`.
- **Righe 20–23**: funzione `seedTestKvStore(entries)` — popola il KV store prima di un test.
  Esportata; usata nei file di test che simulano stati pre-caricati.
- **Righe 25–50**: `vi.mock('@github/spark/hooks', () => ({ useKV: ... }))` — mock completo
  della funzione `useKV` che usa `kvStore` come backend in-memory con `useState`.
- **Righe 52–64**: variabile `sparkKvMock` con `get`, `set`, `keys` come `vi.fn()`, poi
  `Object.defineProperty(window, 'spark', ...)` che espone `kv: sparkKvMock`. Questo mock
  serve ai test che verificano il codice con `window.spark.kv.*` (attualmente solo
  `DataManagement.tsx` Fronte A).
- **Righe 66–121**: `MockGainNode`, `MockOscillatorNode`, `MockAudioContext` — mock del Web
  Audio API. Non dipendente da Spark. **Da mantenere invariato**.
- **Righe 123–132**: `Object.defineProperty(window, 'matchMedia', ...)` — mock per jsdom. Non
  dipendente da Spark. **Da mantenere invariato**.
- **Righe 134–136**: `Object.defineProperty(navigator, 'vibrate', ...)`. Non dipendente da
  Spark. **Da mantenere invariato**.
- **Righe 138–141**: `afterEach(() => { cleanup(); resetTestKvStore() })` — reset post-test.

**Stato dopo 10a**:

Il Blocco 10a deve rimuovere:
- Il blocco `vi.mock('@github/spark/hooks', ...)` (righe 25–50) interamente.
- La variabile `kvStore` e la funzione `cloneValue` (righe 5–13), se non usate altrove.
- Le funzioni `resetTestKvStore()` e `seedTestKvStore()` (righe 15–23), perché dipendono da
  `kvStore` e non hanno più ragione di esistere senza il mock KV.
- L'import `useState` da `react` (riga 3), se usato solo dal mock di `useKV`.
- La chiamata `resetTestKvStore()` nell'`afterEach` (riga 140).
- Il blocco `sparkKvMock` e `Object.defineProperty(window, 'spark', ...)` (righe 52–64) — ma
  solo dopo la rimozione del Fronte A da `DataManagement.tsx`. Se il Fronte A è in periodo di
  grazia, questo mock deve restare temporaneamente.

Il Blocco 10a deve eventualmente aggiungere (PA-1 §10):
- Un mock per `@supabase/supabase-js` se i test unitari dei repository di P26 ne richiedono
  uno centralizzato. Tuttavia, se i repository vengono testati con un client reale verso un
  progetto Supabase di test, il mock non è necessario nel `setup.ts`.

**Effetto sui test che chiamano `seedTestKvStore`**: tutti i file di test che importano
`seedTestKvStore` dalla funzione esportata di `setup.ts` devono essere aggiornati per non
importare più quella funzione. Il coding plan del Blocco 10 deve localizzare tutti gli usi
di `seedTestKvStore` con una ricerca nel workspace e aggiornarli (o rimuovere i test
corrispondenti se testano logica Spark non più presente).

### 5.3 `src/lib/constants.ts`

**Stato attuale**: il file contiene `DEFAULT_CATEGORIES: Omit<Category, 'id'>[]` — un array di
18 oggetti con nome, tipo e `predefinita: true`. Oltre a questa costante, il file contiene
`ACCOUNT_TYPE_LABELS`, `ACCOUNT_TYPE_DESCRIPTIONS`, `ACCOUNT_TYPE_ICONS`,
`TRANSACTION_TYPE_LABELS`, `ACCOUNT_CATEGORIES` e strutture affini — tutte senza dipendenze
da Spark.

**Previsione di P24 §8**: «`DEFAULT_CATEGORIES` diventerà template server-side (blocco 9).»
Ciò significa che il coding plan del Blocco 9 dovrebbe rimuovere questa costante dal file, perché
i dati delle categorie template esistono già su Supabase (inseriti da `seed_default_categories()`
durante l'onboarding — P35 §6 passo 4) e non devono più essere inizializzati lato client.

**Tre possibili stati al momento del Blocco 10**:

1. **Caso A — la costante è già stata rimossa dal coding plan del Blocco 9**: il Blocco 10
   certifica l'assenza con una grep nel workspace e chiude il punto. Nessuna ulteriore azione
   necessaria.

2. **Caso B — la costante è ancora presente perché il coding plan del Blocco 9 non l'ha
   rimossa**: il Blocco 10 la rimuove. Prima di rimuoverla, il coding plan del Blocco 10 deve
   verificare che nessun file `src/` la importi ancora (es. `AppDataContext.tsx` o
   `CategoryManagement.tsx` potrebbero usarla come fallback di bootstrap locale). Se ci sono
   consumatori, vanno aggiornati per non usarla più prima della rimozione.

3. **Caso C — il coding plan del Blocco 9 ha deliberatamente mantenuto `DEFAULT_CATEGORIES`
   come fallback locale di emergenza** (es. per il caso di assenza di connessione al momento
   del seed): in questo caso il Blocco 10 documenta la decisione esplicitamente, verifica che
   il fallback non contraddica la Decisione A di P35 (seed obbligatorio, non saltabile), e
   lascia la costante con un commento che ne chiarisce il ruolo residuo.

**Posizione di P36**: la costante non è una dipendenza da Spark e non blocca il decommissioning.
Tuttavia, la sua presenza dopo il Blocco 9 sarebbe incoerente con la decisione architetturale di
P24 §4.6 e P35 §5 Decisione A. Il Caso C è accettabile solo se il coding plan del Blocco 9
documenta esplicitamente la motivazione — non come omissione implicita.

### 5.4 `src/lib/sound-system.ts`

**Stato attuale del file** (dal codice letto direttamente): il costruttore chiama
`this.loadSettings()`, che esegue `window.spark.kv.get<boolean>('audio-enabled')` (riga 110) e
`window.spark.kv.get<number>('audio-volume')` (riga 111). Il metodo `setVolume()` chiama
`window.spark.kv.set('audio-volume', this.volume)` (riga 871). Il metodo `setEnabled()` chiama
`window.spark.kv.set('audio-enabled', this.enabled)` (riga 880).

**Stato dopo P31 (Blocco 5 esteso)**: queste 4 chiamate `window.spark.kv.*` sono rimosse da P31
Wave A (P31 §5.3). Il singleton riceve l'iniezione del client Supabase via `setClient()` e
chiama `updatePreference()` del repository `impostazioni-utente` invece delle API Spark.

**Certificazione P36**: al momento del Blocco 10, `src/lib/sound-system.ts` **non ha più
dipendenze da `window.spark.kv.*`** — rimosse dal coding plan del Blocco 5 (P31 Wave A).
Il Blocco 10 certifica questa assenza come precondizione del decommissioning.

> **Verifica operativa**: il coding plan del Blocco 10 deve eseguire una grep nel file
> `sound-system.ts` per confermare l'assenza di `window.spark` prima di procedere alla
> rimozione di `@github/spark` da `package.json`.

### 5.5 Dipendenze residue in `vite.config.ts` e `DataManagement.tsx`

**`vite.config.ts` — `sparkPlugin`**

Stato attuale: `sparkPlugin` viene importato da `@github/spark/spark-vite-plugin` e inserito
nell'array `plugins` di Vite. Il plugin Spark è necessario per il runtime Spark (es.
orchestrazione del server, variabili di ambiente Spark). Dopo il decommissioning, non ha più
nessun ruolo nell'applicazione.

Azione: rimuovere l'import e il plugin dall'array `plugins`. Verificare con una build pulita
che il processo di build Vite non produca errori. Se `sparkPlugin()` generava configurazioni
aggiuntive (es. env vars, proxy per il server Spark), verificare che nessuna di queste
configurazioni sia ancora necessaria dopo la migrazione Supabase.

**`vite.config.ts` — `createIconImportProxy`**

Stato attuale: il plugin è importato da `@github/spark/vitePhosphorIconProxyPlugin` e inserito
come secondo plugin nell'array (con commento `// DO NOT REMOVE`). Il commento era un avviso del
team Spark che raccomandava di non rimuovere il plugin perché ottimizza gli import
`@phosphor-icons/react` tramite un proxy Vite (tree-shaking o risoluzione lazy).

Dopo il decommissioning, il plugin non è più disponibile (l'intero pacchetto `@github/spark`
verrà rimosso). Gli import `@phosphor-icons/react` sono già diretti — es. in
`src/lib/constants.ts` usa `import { Bank, CreditCard, Money, ... } from '@phosphor-icons/react'`
— e continuano a funzionare senza il proxy perché `@phosphor-icons/react` è una dipendenza
autonoma presente in `package.json`.

Azione: rimuovere l'import e il plugin. Eseguire una build di produzione e verificare che:
- Nessun errore di risoluzione dei moduli (PA-5 §10).
- Il bundle non aumenti significativamente di dimensione rispetto a prima (tree-shaking
  nativo di Vite può coprire il ruolo del proxy per gli icon package).

**`src/components/DataManagement.tsx` — Fronte A e periodo di grazia**

Dopo P34, `DataManagement.tsx` contiene chiamate `window.spark.kv.get()` per rilevare se
l'utente ha dati storici nel KV Spark non ancora migrati (pannello Fronte A). Queste chiamate
sono l'ultima dipendenza funzionale da `window.spark.kv.*` in produzione.

[P34 §10](./P34-migrazione-datamanagement-supabase.md) stabilisce che il Blocco 10 può
rimuovere questo accesso solo dopo aver garantito che tutti gli utenti abbiano completato la
migrazione (flag `legacy_domain_migrated = true`) o dopo un periodo di grazia documentato.

P36 sceglie il **periodo di grazia** come meccanismo di rimozione, perché:
- Non esiste un pannello amministrativo per monitorare la percentuale di utenti migrati.
- La natura dell'app (personale, singolo utente per account) rende impraticabile attendere
  un criterio di completamento globale.

**Durata del periodo di grazia (PA-4 §10)**: da definire nel coding plan del Blocco 10.
Il valore consigliato da P36 è **90 giorni dalla data di deploy della versione che include P34
Fronte A**. Dopo 90 giorni, il pannello Fronte A viene rimosso da `DataManagement.tsx`
indipendentemente dal fatto che singoli utenti abbiano completato la migrazione o meno.
Il codice di rimozione del Fronte A costituisce un commit separato all'interno di 10a
(o un follow-up di 10a), identificabile chiaramente nel log git.

---

## §6 — Cache offline read-only (parte 10b)

### 6.1 Decisione B: Service Worker (Workbox) vs cache localStorage

Le due opzioni alternative sono quelle enunciate in [P24 §7 R13](./P24-architettura-migrazione-supabase.md):
un Service Worker con Workbox oppure una cache localStorage gestita nel layer repository.

| Dimensione | Opzione A — Service Worker (Workbox) | Opzione B — Cache localStorage nel layer repository |
|---|---|---|
| **1. Compatibilità ambiente** | I Service Worker sono supportati da tutti i browser moderni. Tuttavia, Vite non include un plugin PWA nativo: richiederebbe `vite-plugin-pwa` (dipendenza aggiuntiva) o la configurazione manuale di un entry point `sw.ts`. `vite.config.ts` dovrebbe essere modificato — contrariamente a quanto prevedeva P24 §8. | **Piena compatibilità senza modifiche a `vite.config.ts`**: localStorage è disponibile in tutti i browser, non richiede nessun plugin Vite aggiuntivo, e può essere introdotto come file puro `src/lib/supabase/cache.ts` senza toccare la configurazione di build. |
| **2. Complessità implementativa** | **Alta**: il service worker ha un ciclo di vita separato (install, activate, fetch intercept). L'aggiornamento della SW richiede una strategia esplicita (cache busting, skip-waiting). Gli errori nel SW sono difficili da debuggare in CI (jsdom non supporta SW). | **Bassa**: il layer cache è codice TypeScript standard, testabile con Vitest come qualsiasi altro modulo. Lettura e scrittura su `localStorage` sono operazioni sincrone o minimamente asincrone. |
| **3. Persistenza tra sessioni** | **Piena**: la Cache API usata dai SW persiste tra sessioni, tab close e reload. Può anche sopravvivere all'offline completo. | **Piena**: `localStorage` persiste tra sessioni (a differenza di `sessionStorage`). Non viene cancellato alla chiusura del tab. Viene cancellato solo su logout esplicito o clear manuale. |
| **4. Capacità di storage** | **Illimitata** (Cache API, limitata solo dallo spazio disco disponibile). Adatta a scenari con molte transazioni o allegati. | **~5MB per origin** (limite standard di localStorage per browser). Per un'app di finanze personale con dati solo di testo (nessun allegato in scope — P24 §5.2), il limite è ampiamente sufficiente per centinaia di transazioni e preferenze. |
| **5. Granularità della strategia** | **Massima**: il SW intercetta ogni fetch verso Supabase REST API a livello di rete, con strategie per-route (Cache-First, Network-First, StaleWhileRevalidate). Non richiede modifiche ai repository di P26. | **Esplicita**: la cache viene scritta e letta dai repository di P26 in punti dichiarati. Non intercetta nulla a livello di rete: ogni repository decide quando scrivere e leggere dalla cache. Richiede un'aggiunta al layer `src/lib/supabase/` ma non tocca le firme esistenti dei repository. |
| **6. TTL e invalidazione** | **Automatica**: le strategie Workbox (es. NetworkFirst con fallback Cache) invalidano la cache quando la rete torna disponibile. La cache viene aggiornata ad ogni fetch riuscita online. | **Esplicita**: il TTL è scritto nella cache come metadato (es. `{ data: ..., cachedAt: timestamp }`). Al bootstrap online, il cache layer verifica se la cache è stale (TTL scaduto) e la invalida. Il logout cancella la cache per quell'utente. |

**Analisi aggiuntiva — impatto su P26 §8**:

P26 §8 dichiara: «Il blocco 10 rimuoverà `@github/spark/hooks` da `package.json` e aggiornerà
`src/test/setup.ts`. Il layer `src/lib/supabase/` non è toccato.» L'Opzione A rispetta
formalmente questa dichiarazione (il SW non tocca i repository). L'Opzione B introduce un nuovo
file `src/lib/supabase/cache.ts` che i repository usano internamente — ma P26 §8 si riferisce
alla non-modifica delle firme e contratti dei repository esistenti, non alla proibizione di
aggiungere file nuovi al layer. L'estensione con `cache.ts` è coerente con la nota finale di
P26 §6 Decisione C: «se il realtime verrà aggiunto nella fase successiva, sarà un'aggiunta a
questo layer, non una modifica». Lo stesso principio si applica alla cache.

### Decisione finale e motivazione

**OPZIONE SCELTA: Opzione B — Cache localStorage nel layer repository.**

Il fattore determinante è la **compatibilità con il contesto d'esecuzione e la complessità di
testing**. L'Opzione A richiederebbe:
1. Modifiche a `vite.config.ts` non previste da P24 §8 (già violato per la rimozione dei plugin
   Spark — ma aggiungere `vite-plugin-pwa` è un'ulteriore deviazione);
2. L'introduzione di un ciclo di vita Service Worker con semantica diversa da quella del resto
   dell'app;
3. Il testing del SW in CI tramite mocking di Service Worker in jsdom — noto per la sua
   complessità (PA-3 §10 con Opzione A sarebbe bloccante in CI).

L'Opzione B offre:
- Nessuna modifica a `vite.config.ts` per la 10b (solo 10a la tocca);
- Codice testabile con Vitest standard (localStorage mock in jsdom è supportato nativamente);
- Controllo esplicito su TTL, invalidazione e comportamento per-utente;
- Piena compatibilità con lo schema esistente dei repository P26 (aggiunta, non modifica).

Il limite di ~5MB di localStorage è accettabile per questa applicazione: i dati in scope sono
testo puro (nomi, importi, date, preferenze) e non includono allegati o blob binari. Un utente
con 2000 transazioni, 50 categorie, 20 conti, 30 budget e preferenze serializzate occupa
stimativamente 300–800KB — ampiamente entro il limite.

### 6.2 Specifica funzionale della soluzione scelta (Opzione B)

#### Dati messi in cache

La cache offline include i risultati dell'ultima chiamata `getAll()` riuscita per ognuna delle
5 tabelle di dominio: `conti`, `transazioni`, `categorie`, `budget`, `obiettivi_risparmio`. Include
anche il record `impostazioni_utente` dell'utente (necessario per rendere le preferenze accessibili
offline). La cache copre quindi 6 entità su 6 tabelle attive.

La cache **non include**:
- Dati delle tabelle fuori scope (P24 §5.2): `tag`, `transazioni_tag`, `ricorrenze`,
  `storico_accessi`, `allegati_transazioni`.
- Notifiche (`dismissed-budget-alerts` in `notifiche`): dati di stato UI, non necessari offline.
- La struttura interna `budget-percentages`: è uno stato di sessione per-render (P30).

#### Chiave di cache e struttura

Ogni cache entry ha chiave `zecchino_cache_{userId}_{tabella}` in localStorage (es.
`zecchino_cache_abc123_conti`). Il valore è un oggetto JSON con:
- `data`: l'array (o oggetto) dei record;
- `cachedAt`: timestamp ISO 8601 del momento di scrittura;
- `version`: numero di versione dello schema della cache (per invalidazione dopo aggiornamenti
  della struttura dati — PA-1 §10).

#### Momento del popolamento della cache

La cache viene scritta nelle seguenti occasioni:

1. **Dopo ogni login riuscito**: al completamento del bootstrap di `AppDataContext` (tutti i 5
   `getAll()` completati senza errore), i dati vengono serializzati in localStorage via
   `cache.write()`. Questo garantisce che la cache sia sempre fresca al primo accesso post-login.

2. **Dopo ogni `refreshAll()` riuscito**: `refreshAll()` in `AppDataContext` (P28 §4) ricarica
   tutte le 5 tabelle; al completamento, sovrascrive la cache.

3. **Dopo ogni scrittura riuscita su Supabase**: le singole operazioni di scrittura (create,
   update, delete) aggiornano la copia in cache della tabella interessata in modo incrementale
   (oppure invalidano la cache di quella tabella e delegano al prossimo `getAll()` la
   riscrittura). Il comportamento esatto è a carico del coding plan (PA-1 §10).

#### TTL e invalidazione

- **TTL** (PA-1 §10): da definire nel coding plan. Valore suggerito: **24 ore**. Dopo il TTL,
  la cache è considerata stale al momento del login: se la rete è disponibile, il `getAll()` di
  bootstrap viene eseguito normalmente e sovrascrive la cache. Se la rete non è disponibile e
  il TTL è scaduto, l'app mostra i dati stale con un avviso visivo aggiuntivo («Dati
  potenzialmente non aggiornati»).
- **Logout**: al logout, la cache dell'utente viene cancellata da localStorage. Questo garantisce
  che un utente diverso che accede sullo stesso dispositivo non veda dati del precedente.
- **Invalidazione manuale per aggiornamenti schema**: il campo `version` nella struttura di
  cache permette al codice di rilevare un formato non più compatibile e di svuotare la cache al
  login successivo senza errori.

#### Comportamento offline

Quando la rete non è disponibile al momento del login o durante la sessione:

1. `AppDataContext` tenta i 5 `getAll()`. Le chiamate Supabase falliscono con un errore di rete.
2. Il cache layer (`cache.read(userId, tabella)`) fornisce il risultato dell'ultima cache scritta.
3. `isDataReady` diventa `true` con i dati dalla cache; l'app è navigabile in sola lettura.
4. L'indicatore UI dello stato offline (§7) è visibile da quel momento.

In assenza di cache (primo accesso senza rete, o cache cancellata dopo logout):
- `AppDataContext` non ha dati da mostrare e la rete non è disponibile.
- L'app mostra un messaggio di errore specifico: «Non è possibile caricare i dati senza
  connessione al primo accesso. Connettiti e riprova.»
- `isDataReady` rimane `false`; la dashboard non viene mostrata.

#### Comportamento al ritorno della connessione (PA-2 §10)

Questo punto è un punto aperto da risolvere nel coding plan. I due comportamenti possibili:

- **Auto-refresh**: al rilevamento del ritorno della rete (evento `online` di `window`),
  `AppDataContext` esegue un `refreshAll()` automatico. L'indicatore offline scompare al
  completamento con successo.
- **Refresh manuale**: il banner offline mostra un pulsante «Aggiorna ora». L'utente sceglie
  quando ricaricare i dati.

P36 non decide tra i due: è PA-2 §10.

#### Comportamento su scrittura offline

P24 §4.5 dichiara esplicitamente: «scrittura offline fuori scope». L'UI deve essere coerente
con questa decisione architetturale. Comportamento definito da P36:

Quando l'utente è offline e tenta un'operazione di scrittura (creazione conto, aggiunta
transazione, modifica preferenza):
- Il pulsante o form di conferma rimane visivamente attivo.
- Al momento della sottomissione, il repository tenta la chiamata Supabase. La chiamata fallisce
  con un errore di rete.
- Il repository propaga l'errore al componente.
- Il componente mostra un messaggio di errore **bloccante**: «Impossibile salvare: sei offline.
  Connettiti per continuare.»
- Il form rimane aperto con i dati già inseriti (l'utente non perde l'input).
- L'operazione **non viene accodata** per la sincronizzazione differita (fuori scope P24 §4.5).

Questo comportamento deve essere documentato nell'UX dell'app: l'utente deve sapere che le
scritture richiedono rete.

### 6.3 File coinvolti dalla parte 10b

| File | Tipo | Descrizione |
|---|---|---|
| `src/lib/supabase/cache.ts` | **Nuovo** | Layer di cache localStorage. Espone `cache.write(userId, tabella, data)`, `cache.read(userId, tabella)`, `cache.invalidate(userId)`, `cache.isStale(userId, tabella, ttlMs)`. Non ha dipendenze da React; è un modulo TypeScript puro. |
| `src/context/AppDataContext.tsx` | **Modificato** (minimo) | Integrazione con `cache.read()` nel path di fallback durante il bootstrap quando la rete non è disponibile. Integrazione con `cache.write()` al completamento di `refreshAll()` e del bootstrap iniziale. Nessuna modifica alla superficie pubblica esposta (P28 §4). |
| `src/components/AppHeader.tsx` | **Modificato** (solo aggiunta visiva) | Aggiunta dell'indicatore stato offline (§7). Nessuna modifica alla logica esistente o alla firma delle props. |

**Certificazione P26 §8**: il layer `src/lib/supabase/` è esteso con il nuovo file `cache.ts`,
ma nessuno dei file repository esistenti (`conti.ts`, `transazioni.ts`, ecc.) viene
strutturalmente modificato. Le firme dei repository definite in P26 rimangono invariate. La
nota finale di P26 §6 Decisione C («sarà un'aggiunta a questo layer, non una modifica») è
rispettata.

---

## §7 — Decisione C: indicatore UI stato offline

### Specifica funzionale

**Dove viene mostrato**: un banner orizzontale nella parte superiore di `AppHeader.tsx`,
visibile sopra la navigazione principale. Il banner occupa una riga dedicata e non
sovrascrive o sposta le tab di navigazione esistenti.

**Testo**: «Modalità offline — stai vedendo dati salvati in precedenza» con un'icona di rete
disconnessa a sinistra del testo per la riconoscibilità da screen reader. Il testo è
accessibile via `role="alert"` e `aria-live="assertive"` così che il cambio di stato offline
venga annunciato automaticamente agli utenti di screen reader non appena l'indicatore appare.

**Quando appare**: il banner appare quando:
- `AppDataContext` rileva che il bootstrap o un `refreshAll()` sono falliti per errore di rete
  e i dati sono stati serviti dalla cache; oppure
- l'evento `offline` di `window` viene rilevato durante la sessione attiva.

Il banner **non appare** durante il bootstrap iniziale con rete disponibile (anche se la cache
esiste), perché in quel caso i dati sono freschi da Supabase.

**Quando scompare**: il banner scompare quando:
- La rete torna disponibile (evento `online` di `window`) e `refreshAll()` viene eseguito con
  successo; oppure
- L'utente clicca «Aggiorna ora» (se PA-2 §10 sceglie il refresh manuale) e il refresh ha
  successo.

**File coinvolto**: `src/components/AppHeader.tsx` (modifica esistente, aggiunta visiva). La
logica di stato online/offline viene esposta da `AppDataContext` tramite un campo
`isOffline: boolean` aggiunto alla superficie pubblica (o tramite un hook separato
`useOnlineStatus()` — da decidere nel coding plan, PA-2 §10).

**Certificazione componenti invariati**: `AppHeader.tsx` è nella lista «comportamento invariato»
di P24 §8 per la sua struttura visiva e la firma delle props. P36 aggiunge solo un banner
condizionale sopra la navigazione esistente; non modifica la firma delle props, la logica
delle tab, né i componenti figli. Questa è un'«aggiunta visiva» nel senso di P24 §8, non
una modifica strutturale.

---

## §8 — Impatto su test e CI

### `src/test/setup.ts` dopo 10a

Come descritto in §5.2, il Blocco 10a rimuove:
- Il mock di `@github/spark/hooks` (blocco `vi.mock`).
- Il mock di `window.spark` (`sparkKvMock`, `Object.defineProperty`).
- Le funzioni helper `resetTestKvStore`, `seedTestKvStore` e la variabile `kvStore`.
- La chiamata `resetTestKvStore()` nell'`afterEach`.

Il file risultante manterrà:
- Import di `@testing-library/jest-dom` e `cleanup`.
- Mock del Web Audio API (`MockGainNode`, `MockOscillatorNode`, `MockAudioContext`).
- Mock di `window.matchMedia`.
- Mock di `navigator.vibrate`.
- `afterEach(() => cleanup())` senza reset KV.

### Mock del client Supabase nei test

Dopo la rimozione del mock `@github/spark/hooks`, i test che testano componenti con dati
(es. `DashboardTab`, `TransactionsTab`) ricevono i dati via `AppDataContext`. A quel punto,
`AppDataContext` usa i repository di P26, che a loro volta chiamano il client Supabase. Due
strategie possibili:

- **Test con progetto Supabase di test dedicato** (integrazione): i repository chiamano il
  vero client Supabase puntando a un progetto di test con dati seed. Non richiede mock in
  `setup.ts`.
- **Test unitari con mock del client Supabase**: `vi.mock('@supabase/supabase-js', ...)` aggiunto
  a `setup.ts` (oppure per-file nei test che lo richiedono). Permette di testare componenti in
  isolamento senza rete.

P36 non decide tra le due strategie: è PA-1 §10, da risolvere nel coding plan del Blocco 10.

### Impatto sul CI pre-completamento 10a

Il CI (GitHub Actions, da P21) esegue `vitest run` e la build TypeScript. Finché il mock
`@github/spark/hooks` è presente, il CI funziona normalmente. Non appena il Blocco 10a
rimuove il mock **ma non ha ancora sostituito i test dipendenti da `seedTestKvStore`**, il CI
fallirebbe. La strategia raccomandata:

1. Il coding plan di 10a rimuove il mock di `@github/spark/hooks` e il mock di `window.spark`
   in un **unico commit atomico** che include anche l'aggiornamento di tutti i file di test
   che dipendono da `seedTestKvStore`.
2. Il commit deve passare il CI al primo tentativo: nessun commit intermedio con CI rotto.
3. Se la ricerca dei file che importano `seedTestKvStore` rivela test con una copertura che
   non è più rilevante (es. test che verificano comportamenti `useKV` non più presenti), quei
   test vanno rimossi nello stesso commit.

### Test esistenti con dati basati su `useKV`

I test esistenti che usano `seedTestKvStore()` per popolare il KV store devono essere
aggiornati o rimossi nel Blocco 10a. Il coding plan deve eseguire:

1. Ricerca di tutti i file in `src/test/` che importano `seedTestKvStore` o chiamano
   `resetTestKvStore`.
2. Per ogni test trovato: valutare se il test ha ancora senso post-migrazione Supabase. Se
   il componente testato non usa più `useKV`, il test va riscritto usando mock di
   `AppDataContext` o del client Supabase.
3. I test che verificano componenti della lista «invariato» di P24 §8 (`DashboardTab`,
   `TransactionsTab`, ecc.) non testano più la sorgente dei dati — testano solo la logica di
   rendering. Il mock può spostarsi da `seedTestKvStore` a un mock diretto del context.

---

## §9 — Coordinamento con i blocchi precedenti

La tabella certifica, per ogni blocco da 1 a 9, se lascia dipendenze Spark residue che
ricadono in carico al Blocco 10, basandosi sulla tabella di §4.

| Blocco | Documento di design | Dipendenze Spark residue al termine del blocco | File residui |
|---|---|---|---|
| **1** — Schema impostazioni_utente | [P25](./P25-schema-impostazioni-utente-cifrato.md) | No | — |
| **2** — Strato di accesso dati Supabase | [P26](./P26-strato-accesso-dati-supabase.md) | No | — |
| **3** — Migrazione AuthContext | [P27](./P27-migrazione-authcontext-supabase.md) | No — rimuove `useKV('global-pin-hash')`, `useKV('private-pin-hash')` da `AuthContext.tsx` e `useKV` da `SecuritySettings.tsx` | — |
| **4** — Migrazione AppDataContext | [P28](./P28-migrazione-appdatacontext-supabase.md) | **Sì parziale** — `visible-categories`, `dismissed-budget-alerts` in `AppDataContext.tsx` rimandati a Blocco 5; `budget-percentages` rimandato a Blocco 6. `CategoryManagement.tsx` rimandato a Blocco 9. | `AppDataContext.tsx` (3 useKV residue temporanee) · `CategoryManagement.tsx` (1 useKV) |
| **5 (P29+P31)** — Preferenze UI/A11y/Audio | [P29](./P29-migrazione-usersettings-preferenze-ui.md) · [P31](./P31-migrazione-preferenze-display-audio-screenreader.md) | No — P29 chiude `visible-categories` e `dismissed-budget-alerts` da `AppDataContext`; P31 chiude tutte le 40 `useKV` di Display/SR/Audio/TalkBack e le 4 `window.spark.kv.*` di `sound-system.ts` | — |
| **6** — Budget-percentages | [P30](./P30-migrazione-budgetpercentages-usestate.md) | No — chiude l'ultima `useKV` di `AppDataContext.tsx` | — |
| **7** — DataManagement | [P34](./P34-migrazione-datamanagement-supabase.md) | **Sì** — `DataManagement.tsx` mantiene chiamate `window.spark.kv.get()` per il Fronte A durante il periodo di grazia | `DataManagement.tsx` |
| **8** — PIN privato | [P32](./P32-migrazione-pin-privato-supabase.md) | No — chiude `useKV('private-pin-hash')` residue da `AuthContext.tsx` e `SecuritySettings.tsx` | — |
| **9** — CategoryManagement + Onboarding | [P33](./P33-migrazione-categorymanagement-useappdata.md) · [P35](./P35-onboarding-primo-accesso-supabase.md) | No per la produzione — P33 chiude l'ultima `useKV` di produzione (`CategoryManagement.tsx`); P35 certifica che `OnboardingFlow.tsx` non usa mai Spark. Residue in `src/test/setup.ts` (mock) e `src/lib/constants.ts` (`DEFAULT_CATEGORIES`, se non rimossa dal coding plan Blocco 9) | `src/test/setup.ts` (mock) · eventualmente `src/lib/constants.ts` |

**Sintesi**: al completamento dei blocchi 1–9, il codebase ha **zero** chiamate `useKV` in
produzione. Le dipendenze residue per il Blocco 10 sono:
- 1 file di test (`src/test/setup.ts`) con mock `@github/spark/hooks` e `window.spark`.
- 1 file di produzione temporaneo (`DataManagement.tsx`) con `window.spark.kv.get()` per il
  periodo di grazia del Fronte A.
- 2 import in `vite.config.ts` da `@github/spark/*`.
- 1 pacchetto in `package.json` da rimuovere.
- 1 costante in `src/lib/constants.ts` da certificare o rimuovere.

---

## §10 — Punti aperti residui

### PA-1 — Strategia di mock per il client Supabase nei test post-Blocco 10

Rimosso il mock di `@github/spark/hooks`, i test che usano `AppDataContext` (o i repository
di P26 direttamente) devono avere una strategia alternativa per funzionare senza rete reale.
Il coding plan del Blocco 10 deve decidere tra:
- Test di integrazione con progetto Supabase di test (richiede setup CI con variabili d'ambiente
  `SUPABASE_URL` e `SUPABASE_ANON_KEY` per il progetto di test);
- Mock di `@supabase/supabase-js` in `setup.ts` o per-file (richiede definire la struttura del
  mock compatibile con i contratti P26);
- Mock dei context (`AppDataContext`, `AuthContext`) direttamente nei test componente (non
  richiede mock del client Supabase, ma non testa il layer repository).

Questa decisione impatta significativamente la copertura e la manutenibilità dei test.

### PA-2 — Comportamento al ritorno della connessione (auto-refresh vs manuale)

§6.2 lascia aperto se il ritorno della rete produca un auto-refresh automatico dei dati o
solo l'attivazione di un pulsante «Aggiorna ora» nel banner offline. Il coding plan del
Blocco 10b deve scegliere e implementare uno dei due comportamenti, considerando:
- L'auto-refresh interrompe eventualmente un'operazione di lettura o un dialog aperto.
- Il refresh manuale lascia dati potenzialmente obsoleti finché l'utente non clicca.

### PA-3 — Strategia di test per la cache offline in CI

La cache localStorage (Opzione B) è testabile con Vitest tramite il mock nativo di `localStorage`
in jsdom (disponibile senza configurazione aggiuntiva). Il coding plan deve:
- Definire come simulare il fallback offline nei test: mock del client Supabase che restituisce
  un errore di rete; verifica che `cache.read()` venga chiamato e restituisca i dati attesi.
- Definire i test per la logica di invalidazione TTL: mock di `Date.now()` per simulare il
  trascorrere del tempo.
- Definire i test per il comportamento dell'indicatore offline in `AppHeader.tsx`.

### PA-4 — Confine esatto dei commit di 10a e 10b; durata del periodo di grazia

P36 §3 Decisione A stabilisce la divisione in 10a e 10b ma non specifica:
- Se 10a include già il commit di rimozione del Fronte A da `DataManagement.tsx` oppure se quel
  commit è un terzo pacchetto (10c) da pubblicare dopo il periodo di grazia.
- La durata esatta del periodo di grazia (P36 §5.5 suggerisce 90 giorni, ma il coding plan deve
  confermare e comunicarlo all'utente nell'app stessa, es. con una nota nel pannello Fronte A:
  «La funzione di importazione storica sarà disponibile fino al [data]»).

Il coding plan del Blocco 10 deve dichiarare esplicitamente:
- Il contenuto esatto del commit di 10a (file modificati, file rimossi).
- La data di fine periodo di grazia e il meccanismo di comunicazione all'utente.
- Se il commit di rimozione del Fronte A è parte di 10a con attivazione condizionale (feature
  flag basato su data) o un commit separato pianificato.

### PA-5 — Impatto della rimozione di `createIconImportProxy` su bundle e import Phosphor

Il plugin `createIconImportProxy` era preceduto da un commento `// DO NOT REMOVE` che segnalava
la sua rilevanza funzionale. La sua rimozione potrebbe causare:
- Import non ottimizzati da `@phosphor-icons/react` (bundle size aumentato se il plugin
  eseguiva tree-shaking o lazy-loading per gli icon component).
- Errori di risoluzione se il plugin re-redirigeva alcune path di import.

Il coding plan del Blocco 10 deve:
1. Rimuovere il plugin in un ambiente di sviluppo locale e verificare che la build Vite
   produca un bundle di dimensioni comparabili o ragionevoli.
2. Testare che tutti gli import Phosphor (`Bank`, `CreditCard`, ecc. da `@phosphor-icons/react`)
   funzionino correttamente dopo la rimozione.
3. Se le dimensioni del bundle aumentano significativamente, valutare un plugin Vite alternativo
   per l'ottimizzazione degli icon import (es. `vite-plugin-svgr` o configurazione manuale di
   rollup `treeshake`).

### PA-6 — Comportamento dell'app se `AppDataContext` usa dati dalla cache ma la cache non esiste

§6.2 descrive il comportamento di errore quando non c'è né rete né cache al primo accesso.
Ma non descrive il comportamento al primo avvio offline di un utente che ha già fatto login
in precedenza ma la cui cache è stata cancellata (es. dopo logout). Il coding plan del Blocco
10b deve specificare:
- Se la cache viene cancellata al logout (come raccomandato in §6.2), un secondo utente sullo
  stesso dispositivo non può accedere offline ai dati del primo utente (corretto per privacy).
- Ma cosa succede se l'utente si è loggato, poi si è sloggato, poi ha perso la rete, poi
  ri-logga? La cache è stata cancellata al logout: il bootstrap fallisce per errore di rete e
  non c'è cache. L'app mostra il messaggio «Impossibile caricare i dati senza connessione». È
  il comportamento corretto? O si deve mantenere una cache read-only anche dopo il logout
  (con rischio di privacy)?

---

## §11 — Criteri di accettazione del documento

- [ ] Tutte le sezioni §1–§11 sono presenti e non vuote.
- [ ] §1 ha intestazione completa con blockquote vincolante sul decommissioning completo.
- [ ] §2 dichiara esplicitamente che il Blocco 10 è l'ultimo blocco della migrazione Spark →
      Supabase e descrive lo stato dei blocchi 1–9 prima dell'ingresso in Blocco 10.
- [ ] Decisione A (§3) ha scelta definitiva in grassetto con tabella comparativa su almeno
      4 dimensioni e dichiara che 10a e 10b sono due pacchetti separati.
- [ ] §4 contiene una tabella completa delle dipendenze Spark residue con colonne: file,
      dipendenza residua, chiave coinvolta, blocco di competenza, azione Blocco 10.
- [ ] §4 include le dipendenze in `vite.config.ts` (spark-vite-plugin, vitePhosphorIconProxyPlugin)
      non previste da P24 §8.
- [ ] §4 certifica esplicitamente che dopo i blocchi 1–9 non ci sono più `useKV` in produzione.
- [ ] §5 copre `package.json` (§5.1), `src/test/setup.ts` con dettaglio struttura attuale (§5.2),
      `src/lib/constants.ts` con i 3 casi possibili (§5.3), `src/lib/sound-system.ts` con
      certificazione assenza dipendenze post-P31 (§5.4), e i file residui di `vite.config.ts`
      e `DataManagement.tsx` con periodo di grazia (§5.5).
- [ ] Decisione B (§6.1) ha scelta definitiva in grassetto (Opzione B — localStorage) con tabella
      comparativa su almeno 6 dimensioni.
- [ ] §6.2 specifica: dati in cache (6 tabelle), momento di popolamento (login, refreshAll,
      scritture), TTL o PA, comportamento offline (dati dalla cache, errore senza cache),
      comportamento al ritorno della connessione (PA-2), comportamento scrittura offline
      (messaggio bloccante, senza accodamento).
- [ ] §6.3 elenca i file nuovi e modificati dalla parte 10b: `src/lib/supabase/cache.ts` (nuovo),
      `AppDataContext.tsx` (minimo), `AppHeader.tsx` (aggiunta visiva).
- [ ] §6.3 certifica conformità con P26 §8 (aggiunta, non modifica ai repository esistenti).
- [ ] Decisione C (§7) specifica: posizione (banner in AppHeader), testo, `aria-live="assertive"`,
      quando appare e quando scompare, file coinvolto, conformità con P24 §8 componenti invariati.
- [ ] §8 descrive l'impatto su `src/test/setup.ts`, le due strategie di mock post-Blocco 10,
      e la strategia di deploy atomico del commit 10a per non rompere il CI.
- [ ] §9 ha una tabella che copre tutti i blocchi 1–9 con: blocco, documento, presenza di
      dipendenze residue (sì/no), file residui.
- [ ] §10 documenta almeno 6 punti aperti con riferimento al blocco che dovrà risolverli.
- [ ] Nessun frammento TypeScript, JSX, SQL o configurazione eseguibile nel documento.
- [ ] Nessuna contraddizione con P24–P35 rilevata.
- [ ] Tutti i path a file `src/` usano path relativi (`../../src/...`).
- [ ] Al termine del Blocco 10 (come descritto in questo documento), nessuna dipendenza da
      `@github/spark/hooks` o `window.spark.kv.*` sopravvive nel codebase — certificato
      esplicitamente in §4.

---

*Questo documento chiude la serie P25–P36. Al completamento del Blocco 10, l'architettura di
migrazione Spark → Supabase definita in P24 è interamente implementata.*

*Fine documento. Nessun file sorgente è stato modificato.*

*Messaggio di commit suggerito:*
`docs(design): creare P36 decommissioning Spark e cache offline — Blocco 10`
