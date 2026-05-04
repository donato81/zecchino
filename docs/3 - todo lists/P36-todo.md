# P36 — Todo: Decommissioning Spark e cache offline read-only

> Pacchetto P36 — Blocco 10: 10a rimozione @github/spark + 10b cache localStorage read-only
> Piano di riferimento: `docs/2 - coding plans/P36-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P36-decommissioning-spark-cache-offline.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-04
> Completato: —

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [x] |
| `npx tsc --noEmit` → 0 errori TypeScript | [x] |
| `npm run test:run` → tutti i test passed | [x] |
| `grep "@github/spark" package.json` → 0 risultati | [x] |
| `grep -rn "@github/spark" src/ vite.config.ts` → 0 risultati | [x] |
| `grep -rn "window\.spark\|sparkKvMock\|seedTestKvStore\|resetTestKvStore" src/` → 0 risultati | [x] |
| `cache.ts` e `use-online-status.ts` creati e compilano | [x] |
| Banner offline visibile in browser con rete disabilitata | [ ] |
| Pulizia localStorage al logout verificata | [ ] |
| `git diff --name-only HEAD \| grep ".github"` → output vuoto | [x] |

---

## PARTE 10a — Rimozione @github/spark

### Prima di iniziare

> Non avviare il Passo 10a-A finché questi controlli non sono completati e documentati.

- [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P36-coding-plan.md`
- [ ] Verificare di essere sul branch `refactoring-architettura`:
  ```
  git branch --show-current
  ```

### BL1 — Baseline build

- [ ] `npm run build` → exit 0
  > Esito BL1 build: _

### BL2 — Baseline test

- [ ] `npm run test:run` → tutti i test passed — annotare il numero:
  > Esito BL2 test: _ / _ passed

### BL3 — Baseline TypeScript

- [ ] `npx tsc --noEmit` → 0 errori
  > Esito BL3 tsc: _

### BL4 — Baseline bundle size (PA-5)

- [ ] Misurare la dimensione del bundle JS generato:
  ```
  npm run build 2>&1 | grep -E "dist/assets.*js.*kB"
  ```
  > Esito BL4 bundle size (js principale): ___ kB

### BL5 — Ricerca dipendenze Spark residue nel workspace

- [ ] Eseguire la grep di censimento:
  ```
  grep -rn "@github/spark\|window\.spark\|useKV\|seedTestKvStore\|resetTestKvStore" src/ --include="*.ts" --include="*.tsx"
  ```
  > Verificare che i risultati corrispondano solo ai file documentati in P36 §4.
  > Se ci sono risultati inattesi: bloccarsi e investigare prima di procedere.

### BL6 — Lista file test con `seedTestKvStore`

- [ ] Documentare tutti i file di test che importano `seedTestKvStore` o `resetTestKvStore`:
  ```
  grep -rn "seedTestKvStore\|resetTestKvStore" src/test/ --include="*.ts" --include="*.tsx"
  ```
  > File trovati (elencare qui):
  > -
  > Questa lista è il perimetro del commit atomico del Passo 10a-B.

---

### Passo 10a-A — `vite.config.ts`: rimozione plugin Spark

> Prerequisito: BL1–BL6 verificati.
> Perimetro: solo `vite.config.ts`. Nessun altro file modificato.

- [ ] **A1** — Rimuovere la riga `import sparkPlugin from "@github/spark/spark-vite-plugin"`
- [ ] **A2** — Rimuovere la riga `import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin"`
- [ ] **A3** — Rimuovere `sparkPlugin() as PluginOption` dall'array `plugins`
- [ ] **A4** — Rimuovere `createIconImportProxy() as PluginOption` e il commento `// DO NOT REMOVE` dall'array `plugins`
- [ ] **A5** — Verificare import orfani: se `PluginOption` era importato solo per i due plugin rimossi, rimuovere anche quell'import
- [ ] **A6** — Misurare il bundle post-rimozione e confrontare con BL4:
  ```
  npm run build 2>&1 | grep -E "dist/assets.*js.*kB"
  ```
  > Bundle post-rimozione: ___ kB
  > Delta rispetto a BL4: ___ kB (___ %)
  > Soglia accettabilità: ≤ +15% di BL4
  > Risultato: [ ] entro soglia / [ ] supera soglia (applicare ottimizzazione rollup)
- [ ] **A7** — Verificare che tutti gli import `@phosphor-icons/react` nei file sorgente non abbiano errori di risoluzione:
  ```
  grep -rn "@phosphor-icons/react" src/ --include="*.ts" --include="*.tsx" | head -5
  ```
  > Atteso: righe presenti, nessun errore di compilazione

#### Gate A

- [ ] `npm run build` → exit 0
- [ ] Dimensione bundle ≤ BL4 + 15%
- [ ] `grep "@github/spark" vite.config.ts` → 0 risultati
- [ ] `npm run test:run` → stesso numero di test passed del BL2

---

### Passo 10a-B — `src/test/setup.ts` + file test dipendenti (commit atomico)

> **Vincolo assoluto**: questo passo è un unico commit atomico.
> Prerequisito: Gate A verificato. Perimetro: `src/test/setup.ts` + tutti i file di BL6.

#### B1 — Modifiche a `src/test/setup.ts`

- [ ] Rimuovere la variabile `kvStore: Map<string, unknown>` (righe ~5–8)
- [ ] Rimuovere la funzione `cloneValue<T>` (righe ~9–13)
- [ ] Rimuovere la funzione esportata `resetTestKvStore()` (righe ~15–18)
- [ ] Rimuovere la funzione esportata `seedTestKvStore(entries)` (righe ~20–23)
- [ ] Rimuovere il blocco `vi.mock('@github/spark/hooks', () => ({ useKV: ... }))` (righe ~25–50)
- [ ] Rimuovere `useState` dall'import React se usato solo dal mock `useKV` (riga ~3)
- [ ] Rimuovere la chiamata `resetTestKvStore()` dall'`afterEach` — mantenere `cleanup()`
- [ ] **Non rimuovere** il blocco `sparkKvMock` e `Object.defineProperty(window, 'spark', ...)` (righe ~52–64): rimane fino al Passo 10a-D (periodo di grazia Fronte A)
- [ ] **Non modificare** i mock Web Audio API (righe ~66–121), `matchMedia` (righe ~123–132), `navigator.vibrate` (righe ~134–136)

#### B2 — Aggiornamento dei file test di BL6

Per ogni file individuato da BL6:
- [ ] Rimuovere l'import di `seedTestKvStore` e/o `resetTestKvStore`
- [ ] Valutare il test: se testa logica `useKV` non più presente → rimuovere il test; se testa logica di rendering ancora valida → riscrivere con mock del context
- [ ] Documentare per ogni file la decisione presa (rimosso / riscritto):
  > -

#### B3 — Verifica coerenza mock Supabase (PA-1)

- [ ] Verificare che i test modificati usino mock del context (`vi.mock('@/context/AppDataContext', ...)`) invece di `seedTestKvStore` per fornire dati ai componenti
- [ ] Confermare che `setup.ts` non riceve `vi.mock('@supabase/supabase-js')` centralizzato (strategia PA-1: mock per-context, non per-client)

#### Gate B (= gate commit atomico)

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → tutti i test passed (≥ BL2)
- [ ] `grep "@github/spark" src/test/setup.ts` → 0 risultati
- [ ] `grep -rn "seedTestKvStore\|resetTestKvStore" src/test/` → 0 risultati
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

### Passo 10a-C — `src/lib/constants.ts`: certificazione `DEFAULT_CATEGORIES`

> Prerequisito: Gate B verificato.
> Perimetro: solo `src/lib/constants.ts`. Potenzialmente invariato.

- [ ] **C1** — Ricerca della costante nel workspace:
  ```
  grep -rn "DEFAULT_CATEGORIES" src/ --include="*.ts" --include="*.tsx"
  ```
  > Risultati: _
  > Caso applicabile: [ ] Caso A (assente — nessuna azione) / [ ] Caso B (presente, non importata) / [ ] Caso C (presente e importata)

- [ ] **C2 — Caso A**: `DEFAULT_CATEGORIES` assente → documentare «Caso A certificato — rimossa da Blocco 9» e procedere al Gate C.

- [ ] **C2 — Caso B**: `DEFAULT_CATEGORIES` presente ma non importata da nessun file `src/`:
  - [ ] Rimuovere la costante e il suo tipo da `constants.ts`
  - [ ] Verificare assenza import orfani:
    ```
    grep -rn "DEFAULT_CATEGORIES" src/ --include="*.ts" --include="*.tsx"
    ```
    > Atteso: 0 risultati

- [ ] **C2 — Caso C**: `DEFAULT_CATEGORIES` presente e importata (es. da `categorie.ts` post-P35):
  - [ ] Documentare il consumatore e il ruolo del fallback
  - [ ] Aggiungere un commento esplicito al di sopra della costante in `constants.ts`:
    ```ts
    /**
     * DEFAULT_CATEGORIES — mantenuta come fallback documentato (Caso C, P36 §5.3).
     * Usata da: [file]. Motivazione: [descrivere].
     * Non rimuovere senza aggiornare i consumatori.
     */
    ```

#### Gate C

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] Nessun import orfano di `DEFAULT_CATEGORIES` (Caso B) oppure costante documentata con commento (Caso C)

---

### Passo 10a-D — `src/components/DataManagement.tsx`: rimozione Fronte A

> Prerequisito: Gate C verificato.
> Perimetro: `src/components/DataManagement.tsx` + `src/test/setup.ts` (rimozione mock `window.spark`).

- [ ] **D1** — Aggiungere la nota di scadenza visibile all'utente nel pannello Fronte A:
  - Testo da mostrare: «La funzione di importazione dei dati storici sarà disponibile fino al 1 agosto 2026.»
  - Data scadenza: `FRONTE_A_GRACE_PERIOD_END = '2026-08-01'` (PA-4 risolto: 90 giorni da 2026-05-03)
  - Aggiungere il commento: `{/* FRONTE_A_GRACE_PERIOD_END = '2026-08-01' — questo pannello verrà rimosso dopo questa data */}`

- [ ] **D2** — Rimuovere il pannello Fronte A da `DataManagement.tsx`:
  - [ ] Rimuovere tutto il codice JSX del pannello Fronte A e la sua logica condizionale
  - [ ] Rimuovere tutte le chiamate `window.spark.kv.get(key)` per le chiavi `accounts`, `transactions`, `categories`, `budgets`, `savings-goals`
  - [ ] Rimuovere le variabili di stato locali usate esclusivamente dal Fronte A
  - [ ] Rimuovere import usati solo dal Fronte A
  - [ ] Verificare che il Fronte B (export/import Supabase) rimanga intatto

- [ ] **D3** — Rimuovere il mock `window.spark` da `src/test/setup.ts` (contestuale a D2):
  - [ ] Rimuovere la variabile `sparkKvMock` con `get`, `set`, `keys` come `vi.fn()`
  - [ ] Rimuovere `Object.defineProperty(window, 'spark', { value: { kv: sparkKvMock } })`
  - [ ] Aggiornare i test di `DataManagement.tsx`: rimuovere i test che verificano il Fronte A, mantenere i test del Fronte B
  - [ ] Verificare che l'`afterEach` rimanga con solo `cleanup()` (senza riferimenti a `sparkKvMock`)

- [ ] **D4** — Verifica assenza riferimenti residui:
  ```
  grep -n "window\.spark\|sparkKvMock" src/components/DataManagement.tsx src/test/setup.ts
  ```
  > Atteso: 0 risultati

#### Gate D

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → tutti i test passed
- [ ] `grep "window\.spark\|sparkKvMock" src/` → 0 risultati

---

### Passo 10a-E — `package.json`: rimozione `@github/spark` (PASSO FINALE)

> **Vincolo assoluto**: eseguire solo dopo che i Gate A, B, C, D sono tutti verificati.
> Perimetro: solo `package.json` + reinstallazione dipendenze.

- [ ] **E1** — Verifica zero dipendenze Spark residue nel codebase (precondizione obbligatoria):
  ```
  grep -rn "@github/spark" src/ vite.config.ts --include="*.ts" --include="*.tsx" --include="*.js"
  ```
  > Atteso: **0 risultati**. Se ci sono risultati: BLOCCARSI, non procedere.

- [ ] **E2** — Certificazione `sound-system.ts` (P36 §5.4):
  ```
  grep -n "window\.spark\|@github/spark" src/lib/sound-system.ts
  ```
  > Atteso: 0 risultati. Certificare: «sound-system.ts privo di dipendenze Spark post-P31»

- [ ] **E3** — Rimuovere la voce `"@github/spark": ">=0.43.1 <1"` da `dependencies` in `package.json`

- [ ] **E4** — Reinstallare le dipendenze:
  ```
  npm install
  ```
  > Atteso: completamento senza errori

- [ ] **E5** — Verifica che il pacchetto non sia più in `node_modules`:
  ```
  ls node_modules/@github/spark 2>/dev/null || echo "NON TROVATO — OK"
  ```
  > Atteso: `NON TROVATO — OK`

- [ ] **E6** — Build, test e TypeScript post-rimozione:
  ```
  npm run build
  npm run test:run
  npx tsc --noEmit
  ```

#### Gate E (= Gate finale 10a)

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → tutti i test passed (≥ BL2)
- [ ] `grep "@github/spark" package.json` → 0 risultati
- [ ] `grep -rn "@github/spark" src/ vite.config.ts` → 0 risultati
- [ ] Pacchetto `@github/spark` assente da `node_modules`
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## PARTE 10b — Cache offline read-only

### Prima di iniziare 10b

> La parte 10b richiede che 10a sia completata (Gate finale 10a verificato).

- [ ] Confermare che Gate E (finale 10a) sia verificato
- [ ] `npm run build` → exit 0 (baseline 10b)
- [ ] `npm run test:run` → tutti i test passed (baseline 10b)

---

### Passo 10b-A — `src/lib/supabase/cache.ts`: layer cache localStorage

> Prerequisito: Gate finale 10a verificato.
> Perimetro: creazione nuovo file `src/lib/supabase/cache.ts` + test `src/test/unit/cache.test.ts`.

- [ ] **A1** — Creare il file `src/lib/supabase/cache.ts` con:
  - [ ] Tipo `CacheTable` con le 6 tabelle: `conti`, `transazioni`, `categorie`, `budget`, `obiettivi_risparmio`, `impostazioni_utente`
  - [ ] Interfaccia `CacheEntry<T>` con campi: `data: T`, `cachedAt: string` (ISO 8601), `version: number`, `userId: string`
  - [ ] Costante `CACHE_SCHEMA_VERSION = 1`
  - [ ] Costante `TTL_MS = 24 * 60 * 60 * 1000` (24 ore)
  - [ ] Funzione `cacheWrite<T>(userId, tabella, data)`: costruisce la chiave, serializza, chiama `localStorage.setItem`; silenzia `QuotaExceededError` con `console.warn`
  - [ ] Funzione `cacheRead<T>(userId, tabella)`: legge, parse JSON, verifica `version`, verifica `userId`, restituisce `data` o `null`; gestisce JSON corrotto e version mismatch chiamando `cacheInvalidate`
  - [ ] Funzione `cacheInvalidate(userId)`: rimuove tutte le chiavi `localStorage` con prefisso `zecchino_cache_{userId}_`
  - [ ] Funzione `cacheIsStale(userId, tabella, ttlMs?)`: legge `cachedAt`, calcola delta, confronta con `ttlMs` (default `TTL_MS`)

- [ ] **A2** — Creare il file di test `src/test/unit/cache.test.ts` con:
  - [ ] Test round-trip `cacheWrite` + `cacheRead` — dati restituiti correttamente
  - [ ] Test `cacheRead` su chiave assente → `null`
  - [ ] Test `cacheRead` su JSON corrotto → `null` e chiave rimossa da localStorage
  - [ ] Test invalidazione per version mismatch (mock `CACHE_SCHEMA_VERSION` diverso) → `null` + `cacheInvalidate` chiamata
  - [ ] Test `cacheIsStale` con `Date.now()` mockato: entro TTL → `false`, oltre TTL → `true`
  - [ ] Test `cacheInvalidate` rimuove tutte e sole le chiavi dell'utente specifico (non quelle di altri utenti)
  - [ ] Test `cacheRead` con `userId` mismatch → `null` e chiave rimossa

#### Gate A (10b)

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → tutti i test passed (inclusi i nuovi test di `cache.test.ts`)
- [ ] `grep -n "cacheWrite\|cacheRead\|cacheInvalidate\|cacheIsStale" src/lib/supabase/cache.ts` → tutte e 4 le funzioni presenti

---

### Passo 10b-B — `src/hooks/use-online-status.ts`: hook stato online/offline

> Prerequisito: Gate A (10b) verificato.
> Perimetro: creazione nuovo file `src/hooks/use-online-status.ts` + test.

- [ ] **B1** — Creare il file `src/hooks/use-online-status.ts` con:
  - [ ] Interfaccia `OnlineStatus` con campi: `isOffline: boolean`, `wasOffline: boolean`
  - [ ] Hook `useOnlineStatus()` che:
    - Inizializza `isOffline` da `!navigator.onLine` al mount
    - Inizializza `wasOffline` da `!navigator.onLine` al mount
    - Ascolta `window.addEventListener('online', ...)` → `setIsOffline(false)`
    - Ascolta `window.addEventListener('offline', ...)` → `setIsOffline(true)` + `setWasOffline(true)`
    - Rimuove gli event listener nel cleanup del `useEffect`
    - Restituisce `{ isOffline, wasOffline }`

- [ ] **B2** — Creare il file di test `src/test/unit/use-online-status.test.ts` con:
  - [ ] Test mount con `navigator.onLine = true` → `{ isOffline: false, wasOffline: false }`
  - [ ] Test mount con `navigator.onLine = false` → `{ isOffline: true, wasOffline: true }`
  - [ ] Test evento `offline` dopo mount online → `{ isOffline: true, wasOffline: true }`
  - [ ] Test evento `online` dopo offline → `{ isOffline: false, wasOffline: true }` (`wasOffline` persiste)
  - [ ] Test cleanup: dopo unmount, gli event listener sono rimossi (nessun memory leak)

#### Gate B (10b)

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → tutti i test passed
- [ ] `grep -n "useOnlineStatus" src/hooks/use-online-status.ts` → presente come export

---

### Passo 10b-C — `src/context/AppDataContext.tsx`: integrazione cache

> Prerequisito: Gate B (10b) verificato.
> Perimetro: solo `src/context/AppDataContext.tsx`. Superficie pubblica P28 §4 invariata.

- [ ] **C1** — Aggiungere import: `import { cacheWrite, cacheRead, cacheInvalidate } from '@/lib/supabase/cache'`

- [ ] **C2** — Aggiungere stato interno `isOfflineMode: boolean` (non esposto nella superficie pubblica)

- [ ] **C3** — Modificare il path di bootstrap: nel blocco `try/catch` del caricamento iniziale:
  - [ ] Nel blocco `try`: dopo che tutti i `getAll()` riescono, aggiungere `cacheWrite(uid, 'conti', conti)` per ciascuna delle 6 entità (5 tabelle + impostazioni_utente)
  - [ ] Nel blocco `catch` (errore di rete): tentare `cacheRead(uid, tabella)` per tutte le 5 tabelle + impostazioni_utente
    - [ ] Se tutti i `cacheRead` restituiscono dati → usarli, `setIsDataReady(true)`, `setIsOfflineMode(true)`
    - [ ] Se almeno uno è `null` → `setBootstrapError('NO_CACHE_OFFLINE')`, `isDataReady` rimane `false`

- [ ] **C4** — Modificare `refreshAll()`:
  - [ ] Nel blocco `try`: dopo che tutti i `getAll()` riescono, sovrascrivere la cache con `cacheWrite` per ciascuna entità; `setIsOfflineMode(false)`
  - [ ] Nel blocco `catch`: non sovrascrivere i dati esistenti — il banner rimane visibile

- [ ] **C5** — Integrare `cacheInvalidate(userId)` nel path di logout:
  - [ ] Verificare dove avviene il logout in `AuthContext.tsx` (post-P27)
  - [ ] Aggiungere la chiamata `cacheInvalidate(userId)` **prima** di `supabase.auth.signOut()`
  - [ ] In alternativa, se `AppDataContext` espone un reset, integrare lì

- [ ] **C6** — Verificare il messaggio di errore per «primo accesso offline senza cache»:
  - [ ] Il messaggio dell'errore bloccante è: «Non è possibile caricare i dati senza connessione al primo accesso. Connettiti e riprova.»
  - [ ] Il messaggio è distinto dall'errore generico di rete

#### Gate C (10b)

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → tutti i test passed
- [ ] **Verifica manuale offline (con cache popolata)**:
  - [ ] Effettuare login con rete attiva (popola la cache)
  - [ ] Disabilitare la rete (DevTools → Network → Offline)
  - [ ] Ricaricare la pagina
  - [ ] Atteso: app si avvia, dati presenti, banner offline visibile
- [ ] **Verifica manuale «primo accesso offline»**:
  - [ ] Pulire localStorage, disabilitare la rete, ricaricare
  - [ ] Atteso: messaggio di errore bloccante «Non è possibile caricare i dati senza connessione»

---

### Passo 10b-D — `src/components/AppHeader.tsx`: banner offline

> Prerequisito: Gate C (10b) verificato.
> Perimetro: solo `src/components/AppHeader.tsx`. Firma props invariata.

- [ ] **D1** — Aggiungere import: `import { useOnlineStatus } from '@/hooks/use-online-status'`
- [ ] **D2** — Aggiungere import di `refreshAll` da `useAppData()` se non già presente (o usare il hook nel corpo del componente)
- [ ] **D3** — Aggiungere stato locale `refreshedSuccessfully: boolean` (inizialmente `false`)
- [ ] **D4** — Aggiungere stato locale `isRefreshing: boolean` (inizialmente `false`)

- [ ] **D5** — Implementare la logica del banner:
  - [ ] `const { isOffline, wasOffline } = useOnlineStatus()`
  - [ ] `const showBanner = (isOffline || wasOffline) && !refreshedSuccessfully`
  - [ ] Handler `handleRefresh`: chiama `refreshAll()`, in caso di successo `setRefreshedSuccessfully(true)`; in caso di errore mostra feedback inline; gestisce `isRefreshing`

- [ ] **D6** — Aggiungere il JSX del banner **sopra** il contenuto esistente di `AppHeader`:
  - [ ] `role="alert"` e `aria-live="assertive"` sul contenitore del banner
  - [ ] Icona `<WifiSlash />` da `@phosphor-icons/react` con `aria-hidden="true"`
  - [ ] Testo stato offline: «Modalità offline — stai vedendo dati salvati in precedenza»
  - [ ] Testo stato ripristinato: «Connessione ripristinata. Aggiorna i dati ora.»
  - [ ] Pulsante «Aggiorna ora» visibile solo quando `!isOffline && wasOffline && !refreshedSuccessfully`
  - [ ] Pulsante con `aria-label="Aggiorna i dati ora"` e `disabled={isRefreshing}`

- [ ] **D7** — Creare/aggiornare test per il banner in `src/test/` (file appropriato per `AppHeader`):
  - [ ] Test: banner visibile con `useOnlineStatus` mockato a `{ isOffline: true, wasOffline: true }`
  - [ ] Test: banner non visibile con `{ isOffline: false, wasOffline: false }`
  - [ ] Test: testo banner offline corretto («Modalità offline — stai vedendo dati salvati in precedenza»)
  - [ ] Test: testo banner ripristino («Connessione ripristinata. Aggiorna i dati ora.») + pulsante «Aggiorna ora» visibile
  - [ ] Test: click su «Aggiorna ora» chiama `refreshAll()` dal context
  - [ ] Test: `role="alert"` e `aria-live="assertive"` presenti nel DOM

#### Gate D (= Gate finale 10b)

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → tutti i test passed (inclusi i nuovi test del banner)
- [ ] **Verifica manuale offline in browser**:
  - [ ] Con DevTools → Network → Offline: il banner «Modalità offline» appare in cima alla pagina
  - [ ] Il banner ha uno sfondo giallo/warning distinguibile
  - [ ] L'icona è visibile
- [ ] **Verifica manuale ripristino connessione**:
  - [ ] Riattivare la rete: il testo del banner cambia in «Connessione ripristinata. Aggiorna i dati ora.»
  - [ ] Il pulsante «Aggiorna ora» è visibile
  - [ ] Al click: `refreshAll()` viene eseguito, banner scompare
- [ ] **Verifica manuale scrittura offline**:
  - [ ] Con rete disabilitata, tentare di aggiungere una transazione
  - [ ] Atteso: il form mostra errore «Impossibile salvare: sei offline. Connettiti per continuare.»
  - [ ] I dati inseriti rimangono nel form (non vengono cancellati)
- [ ] **Verifica pulizia localStorage al logout**:
  - [ ] Effettuare logout e verificare in DevTools → Application → localStorage:
    ```
    Object.keys(localStorage).filter(k => k.startsWith('zecchino_cache_'))
    ```
    > Atteso: array vuoto

---

## Verifica finale complessiva

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → tutti i test passed
- [ ] `grep -rn "@github/spark" src/ vite.config.ts package.json` → 0 risultati
- [ ] `grep -rn "window\.spark\|sparkKvMock\|seedTestKvStore\|resetTestKvStore" src/` → 0 risultati
- [ ] File `src/lib/supabase/cache.ts` presente e compilato
- [ ] File `src/hooks/use-online-status.ts` presente e compilato
- [ ] Banner offline verificato in browser (con e senza cache)
- [ ] Pulizia localStorage al logout verificata
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## Checklist gate finale

| Gate | Atteso | Effettivo |
|---|---|---|
| `npm run build` | exit 0 | |
| `npx tsc --noEmit` | 0 errori | |
| `npm run test:run` | tutti i test passed | |
| `grep "@github/spark" package.json` | 0 risultati | |
| `grep -rn "@github/spark" src/ vite.config.ts` | 0 risultati | |
| `grep "window.spark\|sparkKvMock" src/` | 0 risultati | |
| `grep "seedTestKvStore\|resetTestKvStore" src/test/` | 0 risultati | |
| Banner offline visibile in browser con rete disabilitata | verificato | |
| localStorage pulito al logout | verificato | |
| `git diff --name-only HEAD \| grep ".github"` | output vuoto | |
