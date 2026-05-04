# P36 — Coding Plan: Decommissioning Spark e cache offline read-only

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P36 — Blocco 10 — Decommissioning Spark e cache offline read-only
> Design di riferimento: `docs/1 - projects/P36-decommissioning-spark-cache-offline.md`
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-04

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P36 — Decommissioning Spark e cache offline read-only |
| **Tipo intervento** | Implementazione |
| **Branch** | `refactoring-architettura` |
| **Data** | 2026-05-04 |
| **File modificati (10a)** | `vite.config.ts` · `src/test/setup.ts` · `src/components/DataManagement.tsx` · `src/lib/constants.ts` (certificazione) · `package.json` |
| **File creati (10b)** | `src/lib/supabase/cache.ts` · `src/hooks/use-online-status.ts` |
| **File modificati (10b)** | `src/context/AppDataContext.tsx` · `src/components/AppHeader.tsx` |
| **Documenti di riferimento** | [P36 design](../1%20-%20projects/P36-decommissioning-spark-cache-offline.md) · [P24](../1%20-%20projects/P24-architettura-migrazione-supabase.md) · [P26](../1%20-%20projects/P26-strato-accesso-dati-supabase.md) · [P28](../1%20-%20projects/P28-migrazione-appdatacontext-supabase.md) · [P34](../1%20-%20projects/P34-migrazione-datamanagement-supabase.md) · [P35](../1%20-%20projects/P35-onboarding-primo-accesso-supabase.md) |

---

## §2 — Prerequisiti e stato attuale

### Precondizione

Tutti i blocchi da 1 a 9 (P25–P35) sono completati. Nessuna chiamata `useKV` sopravvive nei
file di produzione. Le dipendenze Spark residue all'ingresso del Blocco 10 sono le seguenti
(dal censimento P36 §4):

| File | Dipendenza residua |
|---|---|
| `src/test/setup.ts` | Mock `@github/spark/hooks` + mock `window.spark.kv.*` + helper `resetTestKvStore` / `seedTestKvStore` |
| `src/components/DataManagement.tsx` | Chiamate `window.spark.kv.get()` per il Fronte A (periodo di grazia P34) |
| `vite.config.ts` | Import `sparkPlugin` da `@github/spark/spark-vite-plugin` e `createIconImportProxy` da `@github/spark/vitePhosphorIconProxyPlugin` |
| `package.json` | Voce `"@github/spark": ">=0.43.1 <1"` in `dependencies` |
| `src/lib/constants.ts` | Costante `DEFAULT_CATEGORIES` — da certificare (vedi §3 Passo C) |

### Divisione in 10a e 10b

Come stabilito da P36 §3 Decisione A, il Blocco 10 è diviso in due parti sequenziali e
indipendenti. Il presente piano copre entrambe.

---

## §3 — Parte 10a: Rimozione di @github/spark

### Risoluzione PA-4 — Data di scadenza periodo di grazia Fronte A

Il deploy di P34 (Fronte A) è avvenuto in data **2026-05-03** (data riportata nel todo master
come data di completamento P34). Il periodo di grazia è di **90 giorni**. La data di scadenza
è quindi il **2026-08-01**. Questa data va inserita come costante documentata nel codice
di `DataManagement.tsx` nel momento della rimozione del Fronte A (Passo 10a-D).

**Nota operativa**: il pannello Fronte A in `DataManagement.tsx` deve contenere una nota
visibile all'utente: «La funzione di importazione dei dati storici sarà disponibile fino al
1 agosto 2026.» La costante `FRONTE_A_GRACE_PERIOD_END = '2026-08-01'` viene dichiarata
come commento documentato nella stessa sezione del codice che rimuove il Fronte A.

### Risoluzione PA-5 — Verifica impatto bundle dopo rimozione `createIconImportProxy`

Il piano include un passo esplicito (Passo 10a-A3) per misurare la dimensione del bundle
prima della rimozione del plugin. La soglia di accettabilità è: il bundle post-rimozione
**non deve superare del +15% la dimensione del bundle pre-rimozione**. Questa soglia è
coerente con l'impatto atteso di Vite tree-shaking nativo su `@phosphor-icons/react`
(libreria con export granulari, già tree-shaken correttamente da Rollup senza proxy).

Se il bundle supera la soglia, la strategia alternativa è aggiungere la configurazione
`optimizeDeps.include` o `build.rollupOptions.treeshake` in `vite.config.ts` per gli
icon package — senza re-introdurre dipendenze da `@github/spark`.

---

### Ordine di esecuzione obbligatorio (10a)

```
Baseline build + test
  → Passo 10a-A: vite.config.ts (rimozione plugin)
  → Passo 10a-B: src/test/setup.ts + tutti i file test dipendenti (commit atomico)
  → Passo 10a-C: src/lib/constants.ts (certificazione DEFAULT_CATEGORIES)
  → Passo 10a-D: src/components/DataManagement.tsx (rimozione Fronte A)
  → Passo 10a-E: package.json (rimozione @github/spark — PASSO FINALE)
  → Gate finale 10a
```

L'ordine è vincolante. `package.json` è sempre l'ultimo. Il Passo 10a-B è un commit atomico
che include setup.ts e tutti i file test dipendenti da `seedTestKvStore` — nessun commit
intermedio con CI rotto.

---

### Prerequisiti 10a — Prima di scrivere codice

#### BL1 — Baseline build

```bash
npm run build
```

Atteso: exit 0. Se fallisce, bloccarsi e investigare prima di procedere.

#### BL2 — Baseline test

```bash
npm run test:run
```

Atteso: tutti i test passed. Annotare il numero esatto (es. 5/5). Il numero diventa il
requisito di non-regressione per tutti i gate di 10a.

#### BL3 — Baseline TypeScript

```bash
npx tsc --noEmit
```

Atteso: 0 errori.

#### BL4 — Baseline bundle size (PA-5)

```bash
npm run build 2>&1 | grep -E "dist/assets.*js.*kB"
```

Annotare le dimensioni dei bundle JS generati (es. `index-[hash].js: 320 kB`). Questo
valore è la baseline per il confronto post-rimozione di `createIconImportProxy`.

#### BL5 — Ricerca dipendenze Spark residue nel workspace

```bash
grep -rn "@github/spark\|window\.spark\|useKV\|seedTestKvStore\|resetTestKvStore" src/ --include="*.ts" --include="*.tsx"
```

Atteso: solo i file documentati in §2. Qualsiasi risultato fuori da quella lista è un
blocco pre-rimozione da investigare.

#### BL6 — Ricerca `seedTestKvStore` nei file di test

```bash
grep -rn "seedTestKvStore\|resetTestKvStore" src/test/ --include="*.ts" --include="*.tsx"
```

Documentare tutti i file che importano queste funzioni. Questa lista determina il perimetro
del commit atomico del Passo 10a-B.

---

### Passo 10a-A — `vite.config.ts`: rimozione plugin Spark

**File modificato:** `vite.config.ts`

**Stato attuale:** il file importa due plugin da `@github/spark/*`:
- `import sparkPlugin from "@github/spark/spark-vite-plugin"` — usato come `sparkPlugin()`
  nell'array `plugins`.
- `import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin"` — usato
  come `createIconImportProxy()` nell'array `plugins`, preceduto dal commento `// DO NOT REMOVE`.

**Trasformazione richiesta:**

1. **A1** — Rimuovere la riga `import sparkPlugin from "@github/spark/spark-vite-plugin"`.
2. **A2** — Rimuovere la riga `import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin"`.
3. **A3** — Rimuovere `sparkPlugin() as PluginOption` dall'array `plugins`.
4. **A4** — Rimuovere `createIconImportProxy() as PluginOption` e il commento `// DO NOT REMOVE` dall'array `plugins`.
5. **A5** — Verificare che non rimangano tipi orfani (es. `PluginOption` importato solo per i plugin rimossi): se l'import di `PluginOption` era usato esclusivamente per il cast di questi due plugin, rimuovere anche quel tipo.
6. **A6** — Eseguire la build di produzione e misurare il bundle:

```bash
npm run build 2>&1 | grep -E "dist/assets.*js.*kB"
```

Confrontare con BL4. Il delta deve essere ≤ +15%. Se supera la soglia, aggiungere in
`vite.config.ts`:

```ts
// Compensazione tree-shaking icon pack dopo rimozione createIconImportProxy
build: {
  rollupOptions: {
    treeshake: { moduleSideEffects: false }
  }
}
```

7. **A7** — Verificare che tutti gli import `@phosphor-icons/react` nei file sorgente continuino
   a funzionare senza errori di risoluzione.

**Stato finale atteso:** `vite.config.ts` non importa più nessun modulo da `@github/spark/*`.
La build Vite produce un bundle senza errori. Le dimensioni del bundle sono entro la soglia.

**Gate A:**
- `npm run build` → exit 0
- Dimensione bundle ≤ BL4 + 15%
- `grep "@github/spark" vite.config.ts` → 0 risultati
- `npm run test:run` → stesso numero di test passed del BL2

---

### Passo 10a-B — `src/test/setup.ts` + file test dipendenti (commit atomico)

> **Vincolo assoluto**: questo passo è un singolo commit atomico. Include `src/test/setup.ts`
> e **tutti** i file di test individuati da BL6. Il CI deve passare al primo tentativo dopo
> questo commit. Nessun commit intermedio con CI rotto.

**File modificato principale:** `src/test/setup.ts`

**File coinvolti aggiuntivi:** tutti i file in `src/test/` che importano `seedTestKvStore` o
`resetTestKvStore` (elenco da BL6).

**Stato attuale di `src/test/setup.ts`** (da P36 §5.2):

| Righe | Contenuto | Azione |
|---|---|---|
| 1–3 | Import `@testing-library/jest-dom`, `cleanup`, `useState` | Rimuovere solo `useState` se usato esclusivamente dal mock `useKV` |
| 5–13 | `kvStore: Map<string, unknown>` e `cloneValue<T>` | **Rimuovere** |
| 15–18 | `resetTestKvStore()` — esportata | **Rimuovere** |
| 20–23 | `seedTestKvStore(entries)` — esportata | **Rimuovere** |
| 25–50 | `vi.mock('@github/spark/hooks', () => ({ useKV: ... }))` | **Rimuovere** |
| 52–64 | `sparkKvMock` + `Object.defineProperty(window, 'spark', ...)` | **Rimuovere** (contestualmente alla rimozione Fronte A — Passo 10a-D) |
| 66–121 | Mock Web Audio API (`MockGainNode`, `MockOscillatorNode`, `MockAudioContext`) | **Mantenere invariato** |
| 123–132 | `Object.defineProperty(window, 'matchMedia', ...)` | **Mantenere invariato** |
| 134–136 | `Object.defineProperty(navigator, 'vibrate', ...)` | **Mantenere invariato** |
| 138–141 | `afterEach(() => { cleanup(); resetTestKvStore() })` | Rimuovere `resetTestKvStore()` dalla chiamata; mantenere `cleanup()` |

**Nota**: il blocco `sparkKvMock` (righe 52–64) è il mock di `window.spark.kv.*` usato dai
test di `DataManagement.tsx` Fronte A. Viene rimosso contestualmente al Passo 10a-D
(rimozione Fronte A), non in questo passo. Se al momento di 10a-B il Fronte A è ancora in
periodo di grazia, il blocco `sparkKvMock` rimane temporaneamente.

**Trasformazione richiesta:**

**B1** — In `src/test/setup.ts`:
- Rimuovere la variabile `kvStore: Map<string, unknown>`.
- Rimuovere la funzione `cloneValue<T>`.
- Rimuovere le funzioni esportate `resetTestKvStore()` e `seedTestKvStore()`.
- Rimuovere il blocco `vi.mock('@github/spark/hooks', () => ({ useKV: ... }))` interamente.
- Rimuovere `useState` dall'import React se usato solo dal mock `useKV`.
- Rimuovere `resetTestKvStore()` dalla chiamata `afterEach` (mantenere `cleanup()`).
- Il blocco `sparkKvMock` e `Object.defineProperty(window, 'spark', ...)` rimane fino
  al Passo 10a-D.

**B2** — Per ogni file di test individuato da BL6 che chiama `seedTestKvStore`:
- Rimuovere l'import di `seedTestKvStore` e/o `resetTestKvStore` da `../setup` (o dal path
  relativo corrispondente).
- Valutare il test: se testa logica `useKV` non più presente nel componente, **rimuovere il
  test** nello stesso commit. Se testa logica di rendering ancora valida, riscrivere il setup
  del test usando mock diretti del context (`AppDataContext`, `AuthContext`) con i dati necessari.

**B3** — Verificare la coerenza del mock Supabase (PA-1 — vedi §4 per la decisione completa):
dopo la rimozione del mock `useKV`, i test che usano `AppDataContext` ricevono dati via i
repository P26. La strategia adottata (PA-1) è il **mock del context** (`vi.mock('@/context/AppDataContext', ...)`)
per i test componente: questo approccio non richiede modifiche a `setup.ts` per il mock del
client Supabase e isola i test dal layer repository.

**Stato finale atteso:** `src/test/setup.ts` non contiene più nessun riferimento a
`@github/spark`, `kvStore`, `seedTestKvStore`, `resetTestKvStore`. Il file mantiene i mock
per Web Audio API, `matchMedia` e `navigator.vibrate`. Tutti i test passano.

**Gate B (= gate del commit atomico):**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → stesso numero di test passed del BL2 (o superiore se test sostituiti
  con nuovi; mai inferiore a causa di regressioni)
- `grep "@github/spark" src/test/setup.ts` → 0 risultati
- `grep "seedTestKvStore\|resetTestKvStore" src/test/` → 0 risultati
- `git diff --name-only HEAD | grep ".github"` → output vuoto

---

### Passo 10a-C — `src/lib/constants.ts`: certificazione `DEFAULT_CATEGORIES`

**File:** `src/lib/constants.ts`

**Stato attuale incerto**: P36 §5.3 descrive tre possibili stati della costante
`DEFAULT_CATEGORIES` all'ingresso del Blocco 10. Il Passo 10a-C risolve il caso applicabile.

**C1 — Ricerca della costante nel workspace:**

```bash
grep -rn "DEFAULT_CATEGORIES" src/ --include="*.ts" --include="*.tsx"
```

- **Se l'output è vuoto** (Caso A del design P36): la costante è già stata rimossa dal
  coding plan del Blocco 9. Nessuna azione necessaria. Documentare nel gate: «Caso A —
  DEFAULT_CATEGORIES assente, certificata rimossa.»

- **Se la costante è presente in `src/lib/constants.ts` ma non importata da nessun file
  `src/`** (Caso B): rimuovere la costante. Verificare con grep che nessun import rimanga.

- **Se la costante è presente e importata da altri file** (verificare se `categorie.ts` o
  `OnboardingFlow.tsx` la importano ancora post-P35): valutare se può essere rimossa o se
  deve restare come fallback documentato (Caso C del design P36, accettabile solo con
  commento esplicito).

**C2 — Azione secondo il caso:**

Caso B (probabile, poiché P35 usa la costante via RPC server-side e non più lato client):
```bash
# Rimuovere DEFAULT_CATEGORIES e il suo tipo dall'esportazione di constants.ts
# Verificare che non rimanga nessun import orfano
grep -rn "DEFAULT_CATEGORIES" src/ --include="*.ts" --include="*.tsx"
```
Atteso post-rimozione: 0 risultati.

**Stato finale atteso:** `DEFAULT_CATEGORIES` è assente dal file (Caso A o B) o la sua
presenza è documentata con un commento esplicito che ne giustifica il ruolo residuo (Caso C).

**Gate C:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- Nessun import orfano di `DEFAULT_CATEGORIES` in `src/`

---

### Passo 10a-D — `src/components/DataManagement.tsx`: rimozione Fronte A

**File modificato:** `src/components/DataManagement.tsx`

**Contesto:** il pannello Fronte A contiene le chiamate `window.spark.kv.get()` per il
rilevamento dei dati storici (P34 §10). La data di scadenza del periodo di grazia è il
**2026-08-01** (PA-4 risolto in §3 di questo piano).

**D1 — Aggiunta nota di scadenza all'utente (prima della rimozione)**

Prima della rimozione definitiva, il codice del pannello Fronte A deve mostrare all'utente
una nota visibile:

```tsx
{/* FRONTE_A_GRACE_PERIOD_END = '2026-08-01' — dopo questa data questo pannello verrà rimosso */}
<p className="text-sm text-muted-foreground">
  La funzione di importazione dei dati storici sarà disponibile fino al 1 agosto 2026.
</p>
```

Questo è un prerequisito da committare come parte del Passo 10a-D prima della rimozione
definitiva, in modo che gli utenti abbiano visibilità della scadenza.

**D2 — Rimozione del pannello Fronte A**

Rimuovere dall'implementazione di `DataManagement.tsx`:
- Tutto il codice del pannello Fronte A (il blocco JSX condizionale e la sua logica).
- Tutte le chiamate `window.spark.kv.get(key)` per le chiavi `accounts`, `transactions`,
  `categories`, `budgets`, `savings-goals`.
- Le variabili di stato locali usate esclusivamente dal Fronte A.
- Gli import che erano necessari solo per il Fronte A (es. import di tipi Spark).

**D3 — Rimozione del mock `window.spark` da `src/test/setup.ts`**

Contestualmente a D2, rimuovere da `src/test/setup.ts`:
- La variabile `sparkKvMock` con le funzioni `get`, `set`, `keys` come `vi.fn()`.
- Il blocco `Object.defineProperty(window, 'spark', { value: { kv: sparkKvMock } })`.
- Aggiornare i test di `DataManagement.tsx` che usano `sparkKvMock`: rimuovere i test che
  verificano il comportamento del Fronte A (non più presente), mantenere i test che
  verificano il Fronte B (export/import Supabase).

**Stato finale atteso:** `DataManagement.tsx` non contiene più riferimenti a
`window.spark.kv.*`. `src/test/setup.ts` non contiene più `sparkKvMock` né
`Object.defineProperty(window, 'spark', ...)`.

**Gate D:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → tutti i test passed
- `grep "window.spark\|sparkKvMock" src/` → 0 risultati
- `grep "window\.spark" vite.config.ts src/ --include="*.ts" --include="*.tsx" -rn` → 0 risultati

---

### Passo 10a-E — `package.json`: rimozione `@github/spark` (passo finale)

> **Vincolo assoluto**: questo è il passo finale di 10a. Può essere eseguito solo dopo che
> i Gate A, B, C, D sono tutti verificati.

**File modificato:** `package.json`

**E1 — Verifica zero dipendenze residue:**

```bash
grep -rn "@github/spark" src/ vite.config.ts --include="*.ts" --include="*.tsx" --include="*.js"
```

Atteso: **0 risultati**. Se ci sono ancora dipendenze, bloccarsi e non procedere.

**E2 — Verifica `sound-system.ts`** (certificazione richiesta da P36 §5.4):

```bash
grep -n "window\.spark\|@github/spark" src/lib/sound-system.ts
```

Atteso: 0 risultati. Questa dipendenza era documentata in P31 come rimossa da Wave A.
Certificare prima di procedere.

**E3 — Rimozione dalla voce `dependencies`:**

Rimuovere la riga `"@github/spark": ">=0.43.1 <1"` da `dependencies` in `package.json`.

**E4 — Reinstallazione dipendenze:**

```bash
npm install
```

Verificare che `npm install` completi senza errori e che `node_modules/@github` non esista più
(o che il pacchetto `spark` non sia più presente).

**E5 — Build e test post-rimozione:**

```bash
npm run build
npm run test:run
npx tsc --noEmit
```

Tutti devono passare senza errori.

**Stato finale atteso:** `package.json` non contiene più `@github/spark`. Il codebase non
ha più dipendenze da `@github/spark` in nessun file. La build, i test e TypeScript passano.

**Gate E (= Gate finale 10a):**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → tutti i test passed (≥ BL2)
- `grep "@github/spark" package.json` → 0 risultati
- `grep -rn "@github/spark" src/ vite.config.ts` → 0 risultati
- `ls node_modules/@github/spark 2>/dev/null` → errore (directory non esiste)
- `git diff --name-only HEAD | grep ".github"` → output vuoto

---

### Confine del commit di 10a

Il commit di 10a (o la sequenza ordinata di commit secondo l'ordine dei passi) ha il seguente
perimetro finale:

| Commit | File modificati | Criterio di uscita |
|---|---|---|
| `10a-1` (Passo A) | `vite.config.ts` | Build OK, bundle entro soglia |
| `10a-2` (Passo B, atomico) | `src/test/setup.ts` + tutti i file test con `seedTestKvStore` | Build OK, test OK, CI verde |
| `10a-3` (Passo C) | `src/lib/constants.ts` | Build OK |
| `10a-4` (Passo D) | `src/components/DataManagement.tsx` + `src/test/setup.ts` (mock `window.spark`) | Build OK, test OK |
| `10a-5` (Passo E, finale) | `package.json` | Build OK, test OK, zero import `@github/spark` |

---

## §4 — Parte 10b: Cache offline read-only

### Risoluzione PA-1 — Strategia di mock del client Supabase nei test

**Decisione: mock del context per i test componente; no mock centralizzato in `setup.ts`.**

**Motivazione:** i test dei componenti React (`DashboardTab`, `TransactionsTab`, ecc.) testano
la logica di rendering, non il layer repository. Il loro punto di accoppiamento naturale è il
context (`AppDataContext`, `AuthContext`), non il client Supabase. Mockare il context tramite
`vi.mock('@/context/AppDataContext', () => ({ useAppData: () => mockState }))` in ogni test
file è più granulare, più manutenibile e più espressivo degli scenari testati.

**Conseguenze:**
- `setup.ts` non riceve nessun `vi.mock('@supabase/supabase-js')` centralizzato.
- I test dei repository di P26 (es. `categorie.test.ts`, `conti.test.ts`) sono **test di
  integrazione** che richiedono una connessione reale a Supabase. Questi test non rientrano
  nel perimetro di P36: rimangono fuori dallo scope del Blocco 10 e saranno introdotti in un
  pacchetto dedicato (fuori da questa migrazione).
- Il mock per i test di `cache.ts` usa il mock nativo di `localStorage` in jsdom (già
  disponibile senza configurazione aggiuntiva in Vitest + jsdom), come specificato in P36
  §10 PA-3.
- I test per `use-online-status.ts` mockano `navigator.onLine` e gli eventi `window.online` /
  `window.offline` tramite `Object.defineProperty` e `window.dispatchEvent` in jsdom.

---

### Risoluzione PA-2 — Comportamento al ritorno della connessione

**Decisione: refresh manuale tramite pulsante «Aggiorna ora» nel banner offline.**

**Motivazione:** l'auto-refresh al ritorno della connessione presenta un problema di UX non
banale: se l'utente ha un dialog aperto (es. sta compilando una nuova transazione) e la rete
torna, un `refreshAll()` automatico provocherebbe un re-render di `AppDataContext` che potrebbe
causare perdita del contesto locale del dialog o comportamenti visivi inattesi. Il codebase
non ha un sistema di ottimistic updates (fuori scope P24 §4.5) che renderebbe l'auto-refresh
trasparente.

Il refresh manuale è più sicuro: l'utente decide esplicitamente di aggiornare i dati. Il
banner offline con il pulsante «Aggiorna ora» comunica chiaramente sia lo stato offline che
l'azione disponibile. Al click su «Aggiorna ora», viene chiamato `refreshAll()` da
`AppDataContext`. Se il refresh ha successo, il banner scompare. Se fallisce (rete ancora
assente), il banner rimane con un messaggio aggiornato.

**Comportamento al ritorno della connessione (riassunto):**
- L'evento `online` di `window` viene rilevato da `useOnlineStatus()`.
- `isOffline` torna `false`.
- Il banner non scompare automaticamente (scompare solo dopo un refresh riuscito).
- Il banner aggiorna il suo testo da «Modalità offline — stai vedendo dati salvati in
  precedenza» a «Connessione ripristinata. Aggiorna i dati ora.» con il pulsante «Aggiorna ora».
- Al click su «Aggiorna ora» → `refreshAll()` → se OK, banner scompare; se KO, messaggio
  di errore inline nel banner.

---

### Risoluzione PA-3 — Struttura della versione dello schema cache

**Decisione: campo `version` numerico semplice, valore iniziale `1`, invalidazione al mismatch.**

**Motivazione:** la cache è gestita internamente dal layer repository; non è esposta a terzi
e non richiede compatibilità semantica. Un numero intero è più semplice da confrontare e più
leggibile nei log di debug. La stringa semantica sarebbe sovra-ingegnerizzata per questo caso.

**Struttura della cache entry:**

```ts
interface CacheEntry<T> {
  data: T;
  cachedAt: string;  // ISO 8601
  version: number;   // attualmente: 1
  userId: string;    // per safety check al read
}
```

**Logica di invalidazione per schema non compatibile:**

```ts
const CACHE_SCHEMA_VERSION = 1; // costante in cache.ts — incrementare ad ogni breaking change

// In cache.read():
if (entry.version !== CACHE_SCHEMA_VERSION) {
  // Schema non compatibile: svuotare tutta la cache dell'utente e restituire null
  cache.invalidate(userId);
  return null;
}
```

**Quando incrementare `CACHE_SCHEMA_VERSION`:** solo quando la struttura di `data` cambia
in modo non retrocompatibile (es. cambio del tipo di una proprietà, rimozione di un campo
obbligatorio). Aggiunta di campi opzionali non richiede incremento.

**TTL:** 24 ore (`TTL_MS = 24 * 60 * 60 * 1000`). Dopo il TTL, la cache è considerata stale.
Se la rete è disponibile, viene sovrascritta con i dati freschi da Supabase. Se la rete non
è disponibile, i dati stale vengono usati con un avviso aggiuntivo nel banner.

---

### Specifica tecnica completa della parte 10b

#### Struttura della chiave localStorage

```
zecchino_cache_{userId}_{tabella}
```

Esempi:
- `zecchino_cache_abc-123_conti`
- `zecchino_cache_abc-123_transazioni`
- `zecchino_cache_abc-123_categorie`
- `zecchino_cache_abc-123_budget`
- `zecchino_cache_abc-123_obiettivi_risparmio`
- `zecchino_cache_abc-123_impostazioni_utente`

Le 6 tabelle in cache corrispondono alle 5 tabelle di dominio + il record impostazioni utente
(da P36 §6.2).

---

### Passo 10b-A — `src/lib/supabase/cache.ts`: layer cache localStorage

**File creato:** `src/lib/supabase/cache.ts`

**Interfaccia TypeScript completa:**

```ts
type CacheTable =
  | 'conti'
  | 'transazioni'
  | 'categorie'
  | 'budget'
  | 'obiettivi_risparmio'
  | 'impostazioni_utente';

interface CacheEntry<T> {
  data: T;
  cachedAt: string;   // ISO 8601 — es. '2026-05-04T10:00:00.000Z'
  version: number;    // CACHE_SCHEMA_VERSION
  userId: string;     // safety check: userId dell'utente proprietario dei dati
}

// Funzioni esportate:
export function cacheWrite<T>(userId: string, tabella: CacheTable, data: T): void;
export function cacheRead<T>(userId: string, tabella: CacheTable): T | null;
export function cacheInvalidate(userId: string): void;
export function cacheIsStale(userId: string, tabella: CacheTable, ttlMs?: number): boolean;
```

**Implementazione `cacheWrite`:**
- Costruisce la chiave `zecchino_cache_{userId}_{tabella}`.
- Costruisce un oggetto `CacheEntry<T>` con `data`, `cachedAt: new Date().toISOString()`,
  `version: CACHE_SCHEMA_VERSION`, `userId`.
- Chiama `localStorage.setItem(key, JSON.stringify(entry))`.
- In caso di `QuotaExceededError` (localStorage pieno), silenzia l'errore e logga su
  `console.warn` — la cache è best-effort, non critica per il funzionamento dell'app.

**Implementazione `cacheRead`:**
- Costruisce la chiave. Chiama `localStorage.getItem(key)`.
- Se `null`: restituisce `null` (cache assente).
- Tenta il `JSON.parse`. Se fallisce, elimina la chiave corrotta e restituisce `null`.
- Controlla `entry.version !== CACHE_SCHEMA_VERSION`: se vero, chiama `cacheInvalidate(userId)`
  e restituisce `null`.
- Controlla `entry.userId !== userId`: se vero (safety check), elimina la chiave e
  restituisce `null`.
- Restituisce `entry.data as T`.

**Implementazione `cacheInvalidate`:**
- Itera su `localStorage` e rimuove tutte le chiavi che iniziano con
  `zecchino_cache_{userId}_`.
- Questa funzione va chiamata al logout dell'utente.

**Implementazione `cacheIsStale`:**
- Legge la entry dalla chiave `zecchino_cache_{userId}_{tabella}`.
- Se assente, restituisce `true` (assenza = stale).
- Calcola `Date.now() - new Date(entry.cachedAt).getTime()`.
- Restituisce `true` se il delta supera `ttlMs` (default: `TTL_MS = 86400000` = 24h).

**Test per `cache.ts`** (da includere in un file `src/test/unit/cache.test.ts`):
- Test `cacheWrite` + `cacheRead` round-trip.
- Test `cacheRead` su chiave assente → `null`.
- Test `cacheRead` su JSON corrotto → `null` + chiave rimossa.
- Test invalidazione per version mismatch (mock `CACHE_SCHEMA_VERSION` + 1).
- Test `cacheIsStale` con `Date.now()` mockato oltre e sotto il TTL.
- Test `cacheInvalidate` rimuove tutte e sole le chiavi dell'utente.

**Gate A (10b):**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → tutti i test passed (inclusi i nuovi test di `cache.ts`)

---

### Passo 10b-B — `src/hooks/use-online-status.ts`: hook stato online/offline

**File creato:** `src/hooks/use-online-status.ts`

**Interfaccia:**

```ts
// Valore restituito dall'hook
interface OnlineStatus {
  isOffline: boolean;
  wasOffline: boolean; // true se la sessione è partita offline o ha avuto un episodio offline
}

export function useOnlineStatus(): OnlineStatus;
```

**Implementazione:**

```ts
export function useOnlineStatus(): OnlineStatus {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOffline, wasOffline };
}
```

**Note di implementazione:**
- `navigator.onLine` al mount fornisce lo stato iniziale (supportato da tutti i browser
  target, stesso meccanismo usato da P36 §6.3).
- L'evento `online` setta `isOffline = false` ma non resetta `wasOffline`: questo permette
  al banner di mostrare «Connessione ripristinata. Aggiorna i dati ora.» anche dopo il
  ritorno dalla rete.
- `wasOffline` viene resettato a `false` solo dopo che `refreshAll()` ha avuto successo
  (gestito in `AppHeader.tsx` — il componente che consuma l'hook).

**Test per `use-online-status.ts`** (da includere in `src/test/unit/use-online-status.test.ts`):
- Test mount con `navigator.onLine = true` → `{ isOffline: false, wasOffline: false }`.
- Test mount con `navigator.onLine = false` → `{ isOffline: true, wasOffline: true }`.
- Test evento `offline` dopo mount online → `{ isOffline: true, wasOffline: true }`.
- Test evento `online` dopo offline → `{ isOffline: false, wasOffline: true }` (wasOffline persiste).
- Test cleanup — rimozione event listener al unmount (nessun memory leak).

**Gate B (10b):**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → tutti i test passed

---

### Passo 10b-C — `src/context/AppDataContext.tsx`: integrazione cache

**File modificato:** `src/context/AppDataContext.tsx`

**Superficie pubblica invariata**: la firma dell'interfaccia pubblica di `AppDataContext`
(P28 §4) non viene modificata. Nessun nuovo campo aggiunto al context value.

**Stato attuale (post-P28 Blocco 4):** il bootstrap di `AppDataContext` esegue 5 `getAll()`
in parallelo (o sequenziali) per popolare le 5 tabelle di dominio. `refreshAll()` riesegue
gli stessi `getAll()`. In caso di errore di rete, il bootstrap imposta un stato di errore.

**Trasformazione richiesta:**

**C1 — Import di `cacheWrite`, `cacheRead`, `cacheInvalidate`, `cacheIsStale` da `@/lib/supabase/cache`.**

**C2 — Modifica al path di bootstrap:**

```ts
// Nel bootstrap (useEffect iniziale o funzione loadData):
try {
  const [conti, transazioni, categorie, budget, obiettivi] = await Promise.all([
    contiRepo.getAll(),
    transazioniRepo.getAll(),
    categorieRepo.getAll(),
    budgetRepo.getAll(),
    obiettiviRepo.getAll(),
  ]);
  // Scrittura in cache dopo bootstrap riuscito
  const uid = user.id;
  cacheWrite(uid, 'conti', conti);
  cacheWrite(uid, 'transazioni', transazioni);
  cacheWrite(uid, 'categorie', categorie);
  cacheWrite(uid, 'budget', budget);
  cacheWrite(uid, 'obiettivi_risparmio', obiettivi);
  // ... impostare isDataReady = true
} catch (networkError) {
  // Fallback: lettura dalla cache
  const uid = user.id;
  const cachedConti = cacheRead(uid, 'conti');
  const cachedTransazioni = cacheRead(uid, 'transazioni');
  // ... cacheRead per tutte le 5 tabelle
  if (cachedConti && cachedTransazioni /* && ... */) {
    // Tutti i dati sono in cache: usarli
    setConti(cachedConti);
    // ... setters per tutte le tabelle
    setIsDataReady(true);
    setIsOfflineMode(true); // stato interno, non esposto nella superficie pubblica
  } else {
    // Prima volta offline senza cache: errore bloccante
    setBootstrapError('NO_CACHE_OFFLINE');
  }
}
```

**C3 — Stato interno `isOfflineMode`:** stato `boolean` interno al provider, non esposto nella
superficie pubblica. Viene usato internamente per determinare se `cacheWrite` deve essere
saltato (non si scrive in cache se i dati vengono già dalla cache). Viene resettato a `false`
dopo un `refreshAll()` riuscito.

**C4 — Modifica a `refreshAll()`:**

```ts
async function refreshAll() {
  try {
    const [conti, transazioni, categorie, budget, obiettivi] = await Promise.all([...]);
    // Scrittura in cache dopo refreshAll riuscito
    cacheWrite(uid, 'conti', conti);
    // ... cacheWrite per tutte le tabelle
    setIsOfflineMode(false); // connessione ripristinata
    // ... aggiornare gli stati React
  } catch (err) {
    // refreshAll fallito (ancora offline): non sovrascrivere i dati esistenti
    // Il banner rimane visibile
  }
}
```

**C5 — Invalidazione cache al logout:**

Il logout è gestito da `AuthContext` (P27). La chiamata `cacheInvalidate(userId)` deve essere
eseguita prima della chiamata a `supabase.auth.signOut()`. Verificare dove avviene il logout
in `AuthContext.tsx` e aggiungere la chiamata `cacheInvalidate`. Se `AppDataContext` espone
già un callback di reset (es. `reset()` o viene smontato al logout), la chiamata può essere
integrata lì.

**C6 — Gestione del caso «primo accesso offline» (PA-6 del design P36):**

Il comportamento per PA-6 è:
- Cache cancellata al logout → cache assente alla riloginata → bootstrap fallisce per rete
  assente → nessun dato in cache → app mostra errore bloccante «Non è possibile caricare i
  dati senza connessione. Connettiti e riprova.» → `isDataReady = false` → la dashboard non
  viene mostrata.
- Questo è il comportamento corretto per la privacy: un utente che si è sloggato non dovrebbe
  vedere i dati offline del proprio account precedente in una sessione separata.
- Il messaggio di errore è già definito in P36 §6.2 ed è distinto dall'errore generico di rete.

**Gate C (10b):**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → tutti i test passed
- Verifica manuale: con rete disabilitata e cache popolata, l'app si avvia e mostra i dati
  della cache.
- Verifica manuale: con rete disabilitata e senza cache (primo accesso), l'app mostra il
  messaggio di errore bloccante.

---

### Passo 10b-D — `src/components/AppHeader.tsx`: banner offline

**File modificato:** `src/components/AppHeader.tsx`

**Vincoli:** la firma delle props non viene modificata (P36 vincolo assoluto). La logica
delle tab e dei componenti figli esistenti non viene modificata. L'aggiunta è esclusivamente
un banner condizionale sopra la navigazione.

**D1 — Import di `useOnlineStatus`:**

```ts
import { useOnlineStatus } from '@/hooks/use-online-status';
```

**D2 — Import di `useAppData` (se non già importato) per accedere a `refreshAll`:**

Se `AppHeader.tsx` non usa già `useAppData`, aggiungere l'import. `refreshAll()` è nella
superficie pubblica di `AppDataContext` (P28 §4).

**D3 — Struttura del banner:**

Il banner è condizionale: viene renderizzato solo quando `isOffline || wasOffline`. Testo
e pulsante variano in base allo stato:

```tsx
// Nel corpo di AppHeader, prima del contenuto esistente:
{(isOffline || wasOffline) && (
  <div
    role="alert"
    aria-live="assertive"
    className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-sm flex items-center gap-2"
  >
    <OfflineIcon aria-hidden="true" />
    {isOffline ? (
      <span>Modalità offline — stai vedendo dati salvati in precedenza</span>
    ) : (
      <span>Connessione ripristinata. Aggiorna i dati ora.</span>
    )}
    {(!isOffline && wasOffline) && (
      <button
        onClick={handleRefresh}
        className="ml-auto underline font-medium"
        aria-label="Aggiorna i dati ora"
      >
        Aggiorna ora
      </button>
    )}
  </div>
)}
```

**D4 — Handler `handleRefresh`:**

```ts
const [isRefreshing, setIsRefreshing] = useState(false);

const handleRefresh = async () => {
  setIsRefreshing(true);
  try {
    await refreshAll();
    // refreshAll riuscito: wasOffline verrà resettato dall'aggiornamento di stato
    // Il banner scompare perché wasOffline diventa false
  } catch {
    // Refresh ancora fallito: il banner rimane, mostrare feedback inline
  } finally {
    setIsRefreshing(false);
  }
};
```

**Nota sul reset di `wasOffline`:** `wasOffline` è stato interno di `useOnlineStatus`.
Poiché il hook non espone un metodo di reset, la soluzione è che dopo un `refreshAll()`
riuscito `AppHeader` smonta e rimonta `useOnlineStatus` via key change — oppure, più
semplicemente, `AppHeader` gestisce il proprio stato `didRefreshSuccessfully` e lo usa
come override di `wasOffline` per determinare la visibilità del banner:

```ts
const [refreshedSuccessfully, setRefreshedSuccessfully] = useState(false);
const showBanner = (isOffline || wasOffline) && !refreshedSuccessfully;
```

Al click su «Aggiorna ora» con successo, `setRefreshedSuccessfully(true)` e il banner scompare.
Al prossimo evento `offline`, `refreshedSuccessfully` viene resettato a `false`.

**Testo esatto del banner:**
- Stato offline: `«Modalità offline — stai vedendo dati salvati in precedenza»`
- Stato connessione ripristinata: `«Connessione ripristinata. Aggiorna i dati ora.»`
- Pulsante (solo nello stato ripristinato): `«Aggiorna ora»`
- Icona: `<WifiSlash />` da `@phosphor-icons/react` (già disponibile nel progetto)

**Test per `AppHeader.tsx` offline banner:**
- Test banner visibile con `useOnlineStatus` mockato a `{ isOffline: true, wasOffline: true }`.
- Test banner non visibile con `{ isOffline: false, wasOffline: false }`.
- Test testo banner offline corretto.
- Test testo banner ripristino + pulsante «Aggiorna ora».
- Test click «Aggiorna ora» chiama `refreshAll()`.
- Test banner scompare dopo refresh riuscito.
- Test `role="alert"` e `aria-live="assertive"` presenti nel DOM.

**Gate D (10b):**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → tutti i test passed
- Verifica manuale in browser: con DevTools Network → Offline, il banner appare.
- Verifica manuale: con rete riattivata, il pulsante «Aggiorna ora» appare e al click il
  banner scompare.
- Verifica screen reader: il cambio di stato offline annuncia il banner.

---

### Gate finale 10b

- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → tutti i test passed (inclusi i nuovi test di `cache.ts`,
  `use-online-status.ts`, banner `AppHeader.tsx`)
- `grep -rn "@github/spark" src/ package.json vite.config.ts` → 0 risultati (già garantito da 10a)
- Verifica manuale offline completa: con cache popolata, disabilitare la rete, ricaricare l'app
  → banner offline visibile, dati presenti, operazioni di scrittura mostrano errore «Impossibile
  salvare: sei offline.»
- Verifica manuale pulizia localStorage al logout: dopo logout, `Object.keys(localStorage)`
  non mostra chiavi con prefisso `zecchino_cache_`
- `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## §5 — File invariati

| File | Motivazione |
|---|---|
| `src/App.tsx` | Nessuna modifica necessaria — i gate esistenti coprono tutti i casi |
| Tutti i file repository in `src/lib/supabase/repositories/` | Le firme pubbliche di P26 non vengono modificate — solo aggiunta del nuovo file `cache.ts` |
| `src/context/AuthContext.tsx` | La superficie pubblica di P27 è invariata — solo aggiunta della chiamata `cacheInvalidate` nel path di logout |
| `src/lib/sound-system.ts` | Certificato senza dipendenze da `@github/spark` post-P31 (verifica in Passo 10a-E2) |
| Tutti i componenti non elencati | Nessun refactoring opportunistico fuori perimetro |

---

## §6 — Schema riepilogativo delle operazioni

```
P36 — Decommissioning Spark e cache offline read-only
│
├── PARTE 10a — Rimozione @github/spark
│   │
│   ├── Prerequisiti
│   │   ├── BL1: npm run build exit 0
│   │   ├── BL2: npm run test:run → N/N passed
│   │   ├── BL3: npx tsc --noEmit → 0 errori
│   │   ├── BL4: baseline bundle size misurata
│   │   ├── BL5: grep dipendenze Spark residue → solo file attesi
│   │   └── BL6: lista file test con seedTestKvStore documentata
│   │
│   ├── Passo 10a-A: vite.config.ts
│   │   └── Gate A: build OK, bundle ≤ +15% BL4, zero import @github/spark
│   │
│   ├── Passo 10a-B: setup.ts + file test (commit atomico)
│   │   └── Gate B: build OK, test OK, zero seedTestKvStore, CI verde
│   │
│   ├── Passo 10a-C: constants.ts (certificazione DEFAULT_CATEGORIES)
│   │   └── Gate C: build OK, nessun import orfano
│   │
│   ├── Passo 10a-D: DataManagement.tsx + setup.ts (mock window.spark)
│   │   └── Gate D: build OK, test OK, zero window.spark
│   │
│   └── Passo 10a-E: package.json (PASSO FINALE)
│       └── Gate E (= Gate finale 10a): tutto OK, zero @github/spark
│
└── PARTE 10b — Cache offline read-only
    │
    ├── Passo 10b-A: src/lib/supabase/cache.ts (nuovo)
    │   └── Gate A: build OK, test cache.ts OK
    │
    ├── Passo 10b-B: src/hooks/use-online-status.ts (nuovo)
    │   └── Gate B: build OK, test use-online-status.ts OK
    │
    ├── Passo 10b-C: AppDataContext.tsx (integrazione cache)
    │   └── Gate C: build OK, verifica manuale offline OK
    │
    └── Passo 10b-D: AppHeader.tsx (banner offline)
        └── Gate D (= Gate finale 10b): build OK, test OK, verifica
            manuale completa OK
```
