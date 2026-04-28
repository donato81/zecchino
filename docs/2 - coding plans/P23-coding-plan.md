# P23 — Coding Plan: Bugfix BUG-01 — bootstrap asincrono AuthContext + mock KV allineato
> Documento operativo.
> Fase: Plan → Code
> Pacchetto: 23 — Decimo passo post-refactoring (revisione definitiva)
> Design di riferimento: `docs/1 - projects/P23-design-definitivo-pin-auth.md`
> Report di riferimento: `docs/4 - reports/report-definitivo-pin-auth.md`
> Data: 2026-04-28
---
## Note preliminari
- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P19, P20, P21, P22.
- Questo passo è un **bugfix puro**: nessun refactoring, nessuna nuova feature.
- ⚠️ **Perimetro:** 4 file modificati nell'ordine obbligatorio indicato nella sezione 10.1 del design: (1) `src/test/setup.ts`, (2) `src/context/AuthContext.tsx`, (3) `src/test/smoke/01-app-renders.test.tsx`, (4) `src/test/smoke/test-utils.ts`.
- ⚠️ **Ordine obbligatorio:** prima il mock, poi il context, poi i test. Questo ordine permette di eseguire `npm run test:run` dopo ogni passo e vedere i test avanzare verso il verde.
- ⚠️ `handleGlobalPinSubmit`, `handlePrivatePinSubmit` e il JSX del return di `AuthProvider` rimangono invariati.
- ⚠️ I componenti consumer (`AuthScreen.tsx`, `PinDialog.tsx`, `App.tsx`) non vengono toccati.
- ⚠️ Il mock `useKV` in `setup.ts` (blocco `vi.mock('@github/spark/hooks', ...)`) non viene toccato: solo `sparkKvMock.get`, `sparkKvMock.set` e `sparkKvMock.keys` vengono aggiornati.
- ⚠️ I file di test `02`, `03`, `04`, `05` non vengono modificati.
- ⚠️ File di configurazione (`package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`) invariati.
- ⚠️ File framework SCF sotto `.github/` protetti da `framework-guard.instructions.md`.
---
**File modificati:**
| Categoria | File | Tipo intervento |
|---|---|---|
| Mock test | `src/test/setup.ts` | Modifica (aggiornamento `sparkKvMock.get`, `set`, `keys` — sezione 5 del design) |
| Context | `src/context/AuthContext.tsx` | Modifica (6 modifiche chirurgiche M1–M6 — sezione 4 del design) |
| Test smoke | `src/test/smoke/01-app-renders.test.tsx` | Modifica (conversione `async` + query `findBy*` — sezione 6.1 del design) |
| Test utils | `src/test/smoke/test-utils.ts` | Modifica (prima query `authenticateWithPin` → `findByLabelText` — sezione 6.2 del design) |
**File invariati:**
| File / Area | Motivazione |
|---|---|
| `src/context/AuthContext.tsx` — `handleGlobalPinSubmit` | Handler invariato: usa `globalPinHash` da `useKV`, già risolto al momento del submit utente |
| `src/context/AuthContext.tsx` — `handlePrivatePinSubmit` | Handler invariato: flusso PIN privato non coinvolto in BUG-01 |
| `src/context/AuthContext.tsx` — JSX return provider | Invariato: `isAuthReady` non viene aggiunto al `value` del provider |
| `src/components/AuthScreen.tsx` | Consumer che legge `showPinDialog`/`isSetupMode` — beneficia automaticamente senza modifiche |
| `src/components/PinDialog.tsx` | Renderizza su prop `open` — nessuna dipendenza dal ciclo di vita interno del context |
| `src/App.tsx` | Ordine provider invariato |
| `src/context/AppDataContext.tsx` | Non coinvolto |
| `src/context/VisibleDataContext.tsx` | Non coinvolto |
| `src/test/setup.ts` — mock `useKV` | Blocco `vi.mock('@github/spark/hooks', ...)` invariato |
| `src/test/setup.ts` — `resetTestKvStore` | Invariato |
| `src/test/setup.ts` — `seedTestKvStore` | Invariato |
| `src/test/setup.ts` — blocco `afterEach` | Invariato |
| `src/test/smoke/02-authentication.test.tsx` | Usa `authenticateWithPin` aggiornato — nessuna modifica diretta |
| `src/test/smoke/03-dashboard-tab.test.tsx` | Usa `authenticateWithPin` aggiornato — nessuna modifica diretta |
| `src/test/smoke/04-transactions-tab.test.tsx` | Usa `authenticateWithPin` aggiornato — nessuna modifica diretta |
| `src/test/smoke/05-private-account.test.tsx` | Usa `authenticateWithPin` aggiornato — query post-auth su DOM stabile, nessuna modifica diretta |
| `package.json` | Nessuna dipendenza aggiunta/rimossa |
| `vite.config.ts` | Invariato |
| `tsconfig.json` | Invariato |
| `vitest.config.ts` | Invariato |
| `eslint.config.js` | Invariato |
| `.github/instructions/` | Protetto da `framework-guard.instructions.md` |
| `.github/agents/` | Protetto da `framework-guard.instructions.md` |
| `.github/copilot-instructions.md` | Protetto da `framework-guard.instructions.md` |
| `.github/AGENTS.md` | Protetto da `framework-guard.instructions.md` |
| `.github/runtime/` | Protetto da `framework-guard.instructions.md` |
| `.github/skills/` | Protetto da `framework-guard.instructions.md` |
| `.github/prompts/` | Protetto da `framework-guard.instructions.md` |
| `.github/changelogs/` | Protetto da `framework-guard.instructions.md` |
---
## Schema riepilogativo delle operazioni
```
Passo 23 — Bugfix BUG-01: bootstrap asincrono AuthContext + mock KV allineato
│
├── Step 1: Modifica src/test/setup.ts — allineamento sparkKvMock al kvStore
│   ├── sparkKvMock.get: da `async () => undefined` a lookup nel kvStore
│   ├── sparkKvMock.set: da no-op a scrittura nel kvStore con cloneValue
│   ├── sparkKvMock.keys: da `[]` costante a `Array.from(kvStore.keys())`
│   └── Gate: npm run test:run (i test resteranno rossi, ma con errori diversi)
│
├── Step 2: Modifica src/context/AuthContext.tsx — bootstrap asincrono
│   ├── M1: rimuovere useRef dall'import React (riga 1)
│   ├── M2: useKV<string | undefined> → useKV<string> con default ''  (riga 37)
│   ├── M3: AuthContextValue — globalPinHash: string | undefined → string; setter prev? → prev
│   ├── M4: rimuovere const hasInitialized = useRef(false) (riga 46)
│   ├── M5: aggiungere const [isAuthReady, setIsAuthReady] = useState(false)
│   ├── M6: sostituire integralmente l'useEffect di inizializzazione
│   │       (deps [] → window.spark.kv.get one-shot con flag cancelled)
│   └── Gate: tsc --noEmit → 0 errori
│
├── Step 3: Modifica src/test/smoke/01-app-renders.test.tsx
│   ├── Firma it: () => { → async () => {
│   ├── screen.getByRole('dialog') → await screen.findByRole('dialog')
│   ├── screen.getByText(/Imposta PIN Globale/i) → await screen.findByText(...)
│   └── screen.getByText(/Crea un PIN.../) → resta sincrono (invariato)
│
├── Step 4: Modifica src/test/smoke/test-utils.ts
│   └── authenticateWithPin riga 1: getByLabelText → await findByLabelText
│
├── Step 5: Verifica locale
│   ├── tsc --noEmit → 0 errori
│   ├── npm run lint → 0 problems
│   ├── npm run build → exit 0
│   └── npm run test:run → 0 failures
│
└── Step 6: Verifica manuale (4 scenari — sezione 7 del design)
    ├── Scenario 7.1: primo avvio reale → dialog "Imposta PIN Globale"
    ├── Scenario 7.2: refresh F5 con PIN salvato → dialog "Inserisci PIN"
    ├── Scenario 7.3: test KV vuoto → findByText("Imposta PIN Globale") passa
    └── Scenario 7.4: test KV seedato → dialog "Inserisci PIN" corretto
```
---
## Ambiguità verificate
Le seguenti ambiguità sono state **verificate sul repository reale** sul branch `refactoring-architettura` con lettura diretta dei file sorgente prima della stesura di questo piano.
---
### AI1 — Causa radice: `useKV` svolge due ruoli incompatibili
**Verifica eseguita:** lettura completa di `src/context/AuthContext.tsx` e `src/test/setup.ts`.
**Risultato:** Il codice attuale di `AuthContext.tsx` usa `useKV<string | undefined>('global-pin-hash', undefined)` e si affida alla transizione `undefined → valore reale` per decidere il flusso setup/login. Questo funziona sulla piattaforma reale (il KV risolve in modo asincrono e scatena un re-render) ma fallisce sistematicamente nel mock: `useKV` in `setup.ts` è implementato con `useState` sincrono che restituisce il default `undefined` in modo definitivo, senza mai simulare la transizione asincrona. Il guard `if (globalPinHash === undefined) return` blocca il bootstrap per sempre nel test con KV vuoto: VARIANTE B sistematica.
---
### AI2 — Perché i tentativi P23 e P23-fix non erano sufficienti
**Verifica eseguita:** lettura del design definitivo (sezioni 2 e 3.1), tracciamento del flusso nei file sorgente attuali.
**Risultato:** P23 aveva introdotto il guard `=== undefined` che è corretto per la piattaforma reale ma invalicabile nel mock sincrono. P23-fix aveva tentato di correggere con rami `import.meta.env.MODE === 'test'` nel codice di produzione, introducendo una doppia sorgente di verità (`useKV` + `window.spark.kv.get`) con race condition: la transizione `undefined → ''` artificiale consumava `hasInitialized` prima del valore reale, portando a VARIANTE A (setup mode su refresh). I due fix hanno oscillato tra le varianti perché la causa profonda — il disallineamento sincrono/asincrono tra mock e piattaforma — non era mai stata affrontata.
---
### AI3 — Perché `window.spark.kv.get` direttamente e non `useKV`
**Verifica eseguita:** analisi dell'API `window.spark.kv` in `src/test/setup.ts` (dove già esiste `sparkKvMock`) e in `src/components/DataManagement.tsx` (uso reale in produzione).
**Risultato:** `window.spark.kv.get` è un'API contrattualmente asincrona (`async`): restituisce sempre una promessa, sia sulla piattaforma reale sia nel mock. Il mock `sparkKvMock.get` in `setup.ts` è già definito come `vi.fn(async () => undefined)`. Usare questa API nel bootstrap elimina la dipendenza dal ciclo di vita sincrono/asincrono interno di `useKV`: la promessa si risolve sempre in un microtask, React batcha i `setState` post-await, il dialog appare correttamente. Non è necessario modificare il mock di `useKV` (che resta sincrono) perché `useKV` non partecipa più alla decisione di bootstrap.
---
### AI4 — Perché `isAuthReady` è `useState` e non `useRef`
**Verifica eseguita:** analisi dell'uso di `isAuthReady` nel design (sezione 3.3 e 4.4).
**Risultato:** `isAuthReady` è dichiarato come `useState(false)` e non come `useRef(false)` per due motivi: (1) la modifica da `false` a `true` deve scatenare un re-render del provider per propagare lo stato ai consumer — un ref non scatenerebbe il re-render; (2) se in futuro si decidesse di esporre `isAuthReady` nell'interfaccia pubblica (es. per mostrare un indicatore di caricamento), la scelta di `useState` è già coerente con la filosofia React dei context. Per ora `isAuthReady` è interno e non viene aggiunto al `value` del provider (sezione 3.3 del design).
---
### AI5 — Perché il flag `cancelled` nell'IIFE asincrona
**Verifica eseguita:** analisi del pattern di cleanup degli `useEffect` asincroni, sezione 10.2 del design.
**Risultato:** Il flag `cancelled` protegge dallo scenario in cui `AuthProvider` viene smontato mentre la promessa `window.spark.kv.get` è ancora in attesa. Nelle sessioni utente normali questo non avviene (il provider vive per tutta la sessione), ma nei test con `cleanup()` aggressivo — come quelli basati sul blocco `afterEach` di `setup.ts` — il componente può essere smontato prima che la promessa risolva. Senza il flag, i `setState` chiamati su un componente già smontato generano un warning React che può oscurare altri errori nei test. Il costo è una variabile locale e un assignment nel cleanup: overhead trascurabile, protezione non negoziabile.
---
### AI6 — Perché solo la prima query di `authenticateWithPin` diventa `findByLabelText`
**Verifica eseguita:** lettura di `src/test/smoke/test-utils.ts` e analisi del comportamento del dialog post-apertura.
**Risultato:** `authenticateWithPin` cerca il campo "Nuovo PIN" come prima azione. Con il bootstrap asincrono, il dialog non è nel DOM al momento sincrono dopo `renderApp()`. La prima query deve quindi diventare `await screen.findByLabelText(/Nuovo PIN/i)` — che aspetta il re-render post-promessa. Una volta che il dialog è aperto (garantito da `findByLabelText`), tutti i suoi elementi (`Conferma PIN`, il pulsante `Conferma`, l'intero form) sono presenti nello stesso render: le query successive `screen.getByLabelText(/Conferma PIN/i)` e `screen.getByRole('button', { name: /Conferma/i })` sono sincrone e corrette. Convertirle in `findBy*` sarebbe ridondante e potenzialmente più lento senza alcun beneficio.
---
## Piano operativo dettagliato
### Step 1 — Modifica `src/test/setup.ts`
**File coinvolto:** `src/test/setup.ts`
**Righe interessate:** blocco `sparkKvMock` (righe ~49–53)
Il mock `sparkKvMock` attualmente definisce `get`, `set` e `keys` come no-op o costanti che ignorano completamente il `kvStore`. Il bootstrap di `AuthContext` chiama `await window.spark.kv.get('global-pin-hash')`: se il mock restituisce sempre `undefined`, i test con KV seedato (es. test 05) classificherebbero erroneamente la sessione come setup mode. Allineare i tre metodi al `kvStore` garantisce coerenza tra `useKV` e `window.spark.kv`.
**Prima:**
```ts
const sparkKvMock = {
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  keys: vi.fn(async () => []),
}
```
**Dopo:**
```ts
const sparkKvMock = {
  get: vi.fn(async (key: string) => {
    if (kvStore.has(key)) return cloneValue(kvStore.get(key))
    return undefined
  }),
  set: vi.fn(async (key: string, value: unknown) => {
    kvStore.set(key, cloneValue(value))
  }),
  keys: vi.fn(async () => Array.from(kvStore.keys())),
}
```
**Motivazione tecnica:** `window.spark.kv.get` e `useKV` leggono ora dalla stessa mappa `kvStore`. `seedTestKvStore` e `resetTestKvStore` continuano a gestire lo stato di partenza del `kvStore` prima del render, garantendo che sia `useKV` sia `window.spark.kv.get` vedano gli stessi valori.
**Conferma:** il blocco `vi.mock('@github/spark/hooks', () => ({ useKV: ... }))` (righe 22–47) non viene toccato.
---
### Step 2 — Modifica `src/context/AuthContext.tsx`
**File coinvolto:** `src/context/AuthContext.tsx`
**Righe interessate:** riga 1 (import), righe 10–11 (interfaccia), riga 37 (useKV), riga 46 (hasInitialized), dopo riga 45 (isAuthReady), righe 49–57 (useEffect)
#### Modifica M1 — Import React
**Prima (riga 1):**
```tsx
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
```
**Dopo:**
```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
```
**Motivazione:** `useRef` è usato solo in due posizioni nel file: riga 1 (import) e riga 46 (dichiarazione `hasInitialized`). Poiché `hasInitialized` viene rimosso (M4), nessun'altra riga usa `useRef`. Verifica preventiva obbligatoria: cercare `useRef` nel file prima di rimuoverlo — deve comparire solo nelle due righe citate.
#### Modifica M2 — Tipo `useKV` per `globalPinHash`
**Prima (riga 37):**
```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)
```
**Dopo:**
```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
```
**Motivazione:** `undefined` non ha più il ruolo di sentinella di loading. Il tipo torna al più semplice `string` con default `''`.
#### Modifica M3 — Interfaccia `AuthContextValue`
**Prima (righe 10–11):**
```tsx
  globalPinHash: string | undefined
  setGlobalPinHash: (value: string | ((prev?: string) => string)) => void
```
**Dopo:**
```tsx
  globalPinHash: string
  setGlobalPinHash: (value: string | ((prev: string) => string)) => void
```
**Motivazione:** coerenza con il cambio di tipo in M2. Il `?` opzionale su `prev` viene rimosso — il default `''` garantisce che `prev` sia sempre una stringa.
#### Modifica M4 — Rimozione `hasInitialized`
**Prima (riga 46):**
```tsx
  const hasInitialized = useRef(false)
```
**Dopo:** la riga viene eliminata interamente.
**Motivazione:** il bootstrap one-shot è garantito da `deps=[]` nell'useEffect. Il ref `hasInitialized` era un workaround per impedire la riesecuzione del vecchio effect con `deps=[globalPinHash]` — non più necessario.
#### Modifica M5 — Aggiunta `isAuthReady`
Dopo l'ultima riga del blocco degli stati (attuale riga 45 `const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)`), aggiungere:
```tsx
  const [isAuthReady, setIsAuthReady] = useState(false)
```
**Motivazione:** stato interno che segnala il completamento del bootstrap. Non viene aggiunto al `value` del provider — rimane privato.
#### Modifica M6 — Sostituzione integrale del `useEffect` di inizializzazione
**Prima (righe 49–57):**
```tsx
useEffect(() => {
  if (globalPinHash === undefined) return
  if (hasInitialized.current) return
  hasInitialized.current = true
  if (!globalPinHash) {
    setIsSetupMode(true)
  }
  setShowPinDialog(true)
}, [globalPinHash])
```
**Dopo:**
```tsx
useEffect(() => {
  let cancelled = false
  ;(async () => {
    const storedHash = (await window.spark.kv.get('global-pin-hash')) as string | undefined
    if (cancelled) return
    if (!storedHash) {
      setIsSetupMode(true)
    }
    setShowPinDialog(true)
    setIsAuthReady(true)
  })()
  return () => { cancelled = true }
}, [])
```
**Motivazione tecnica:** `deps=[]` garantisce l'esecuzione one-shot al mount. `window.spark.kv.get` è contrattualmente asincrona — sia sulla piattaforma reale sia nel mock aggiornato. La IIFE async permette l'uso di `await` senza rendere l'effect direttamente `async` (pattern non supportato da React). `cancelled` protegge da setState su componente smontato. La sequenza `setIsSetupMode → setShowPinDialog → setIsAuthReady` è atomica in un singolo microtask: React batcha i tre setState in un unico re-render.
**Gate intermedio:** dopo questa modifica, eseguire `tsc --noEmit` → 0 errori prima di procedere allo Step 3.
---
### Step 3 — Modifica `src/test/smoke/01-app-renders.test.tsx`
**File coinvolto:** `src/test/smoke/01-app-renders.test.tsx`
**Righe interessate:** firma `it`, due query `screen.getBy*`
Con il bootstrap asincrono, il dialog appare in un re-render successivo alla risoluzione della promessa — non nel render iniziale sincrono. Le query `getByRole`/`getByText` falliscono perché cercano il dialog prima che esista nel DOM.
**Prima:**
```tsx
import { screen } from '@testing-library/react'
import { renderApp } from './test-utils'
describe('01 — App renders', () => {
  it('dovrebbe mostrare la schermata di autenticazione al mount', () => {
    renderApp()
    // Radix Dialog nasconde il background con aria-hidden; verifichiamo
    // l'esistenza del contenitore tramite querySelector diretto
    const authMain = document.querySelector('[role="main"][aria-label*="Schermata di autenticazione"]')
    expect(authMain).not.toBeNull()
    screen.getByRole('dialog')
    screen.getByText(/Imposta PIN Globale/i)
    screen.getByText(/Crea un PIN per proteggere l'applicazione/i)
  })
})
```
**Dopo:**
```tsx
import { screen } from '@testing-library/react'
import { renderApp } from './test-utils'
describe('01 — App renders', () => {
  it('dovrebbe mostrare la schermata di autenticazione al mount', async () => {
    renderApp()
    // Radix Dialog nasconde il background con aria-hidden; verifichiamo
    // l'esistenza del contenitore tramite querySelector diretto
    const authMain = document.querySelector('[role="main"][aria-label*="Schermata di autenticazione"]')
    expect(authMain).not.toBeNull()
    await screen.findByRole('dialog')
    await screen.findByText(/Imposta PIN Globale/i)
    screen.getByText(/Crea un PIN per proteggere l'applicazione/i)
  })
})
```
**Motivazione riga per riga:**
| Modifica | Motivazione |
|---|---|
| `() => {` → `async () => {` | Le query `findBy*` restituiscono promise — la funzione test deve essere async |
| `getByRole('dialog')` → `await findByRole('dialog')` | Il dialog appare nel re-render post-promessa, non nel render iniziale |
| `getByText(/Imposta PIN Globale/i)` → `await findByText(...)` | Stesso motivo — il titolo del dialog è nel re-render post-promessa |
| `getByText(/Crea un PIN.../)` → invariato | Il testo appare nello stesso render del titolo — `getByText` è corretto dopo `findByText` |
| `document.querySelector(...)` → invariato | `<main role="main">` è renderizzato da `AuthScreen` sincrono al mount |
---
### Step 4 — Modifica `src/test/smoke/test-utils.ts`
**File coinvolto:** `src/test/smoke/test-utils.ts`
**Righe interessate:** prima riga del corpo di `authenticateWithPin`
**Prima:**
```ts
export async function authenticateWithPin(user: ReturnType<typeof userEvent.setup>, pin = '1234') {
  const pinField = screen.getByLabelText(/Nuovo PIN/i)
  await user.type(pinField, pin)
  const confirmField = screen.getByLabelText(/Conferma PIN/i)
  await user.type(confirmField, pin)
  const confirmButton = screen.getByRole('button', { name: /Conferma/i })
  await user.click(confirmButton)
  await screen.findByText(/I Tuoi Conti/i)
}
```
**Dopo:**
```ts
export async function authenticateWithPin(user: ReturnType<typeof userEvent.setup>, pin = '1234') {
  const pinField = await screen.findByLabelText(/Nuovo PIN/i)
  await user.type(pinField, pin)
  const confirmField = screen.getByLabelText(/Conferma PIN/i)
  await user.type(confirmField, pin)
  const confirmButton = screen.getByRole('button', { name: /Conferma/i })
  await user.click(confirmButton)
  await screen.findByText(/I Tuoi Conti/i)
}
```
**Motivazione:** `getByLabelText(/Nuovo PIN/i)` fallisce perché il dialog non è ancora nel DOM al momento del primo render. `findByLabelText` attende il re-render post-promessa. Le query successive (`getByLabelText(/Conferma PIN/i)`, `getByRole(...)`) restano sincrone: una volta che il dialog è aperto, tutti i suoi elementi sono presenti nello stesso render.
**Impatto a cascata (nessuna modifica diretta necessaria):** i test `02`, `03`, `04`, `05` usano `authenticateWithPin` e beneficiano automaticamente di questa correzione.
---
## Tabella dei rischi
| Codice | Scenario | Probabilità | Impatto | Mitigazione |
|---|---|---|---|---|
| R1 | Rimozione `useRef` dall'import mentre altre righe del file lo usano ancora | Bassa — verifica preventiva obbligatoria descritta in M1 | Alto — errore TypeScript immediato | Cercare `useRef` nel file prima della rimozione; il gate `tsc --noEmit` lo intercetta comunque |
| R2 | `sparkKvMock.set` non aggiornato → `window.spark.kv.set` nel bootstrap non persiste nel `kvStore` → test 05 (PIN privato con `initialKv`) fallisce | Bassa — le tre modifiche al mock sono nel medesimo blocco | Alto — test 05 rompe | Applicare le tre modifiche `get/set/keys` insieme in un unico passo; gate `npm run test:run` |
| R3 | `isAuthReady` aggiunto al `value` del provider per errore → esposto ai consumer | Bassa — il design lo esclude esplicitamente (sezione 3.3) | Medio — interfaccia allargata non intenzionalmente | Verificare CA-A08: `isAuthReady` non compare nel blocco `value={{ ... }}` del provider |
| R4 | Query sincrone nei test `02–05` diventano instabili perché `authenticateWithPin` non attende correttamente il dialog | Molto bassa — `findByLabelText` in `test-utils.ts` garantisce l'attesa; le query post-auth lavorano su DOM stabile | Alto — test a cascata rossi | Gate `npm run test:run` → 0 failures su tutti e 5 i test |
---
## Criteri di uscita — Definition of Done
### Blocco A — Modifiche a `AuthContext.tsx`
- [ ] **CA-A01** — `useRef` è rimosso dall'import React (riga 1)
- [ ] **CA-A02** — `useKV<string>('global-pin-hash', '')` — il tipo generico è `string`, il default è `''`
- [ ] **CA-A03** — `useKV<string>('private-pin-hash', '')` — invariato rispetto all'originale
- [ ] **CA-A04** — `AuthContextValue.globalPinHash` è tipizzato `string` (non `string | undefined`)
- [ ] **CA-A05** — Il setter `setGlobalPinHash` ha tipo `(value: string | ((prev: string) => string)) => void` (nessun `?` su `prev`)
- [ ] **CA-A06** — `const hasInitialized = useRef(false)` non compare più nel file
- [ ] **CA-A07** — `const [isAuthReady, setIsAuthReady] = useState(false)` è presente tra le dichiarazioni di stato
- [ ] **CA-A08** — `isAuthReady` **non** è presente nel `value` passato al `<AuthContext.Provider>`
- [ ] **CA-A09** — Il `useEffect` di bootstrap ha `deps=[]` (array vuoto, non `[globalPinHash]`)
- [ ] **CA-A10** — Il `useEffect` usa `window.spark.kv.get('global-pin-hash')` — non `globalPinHash` da React state
- [ ] **CA-A11** — Il `useEffect` contiene il flag `cancelled` e il cleanup `return () => { cancelled = true }`
- [ ] **CA-A12** — La sequenza di `setState` nell'effect è: `setIsSetupMode(true)` (condizionale), poi `setShowPinDialog(true)`, poi `setIsAuthReady(true)`
- [ ] **CA-A13** — `handleGlobalPinSubmit` e `handlePrivatePinSubmit` sono identici all'originale
- [ ] **CA-A14** — Il JSX del provider è identico all'originale
### Blocco B — Modifiche a `setup.ts`
- [ ] **CB-01** — `sparkKvMock.get` legge dal `kvStore` — non restituisce `undefined` incondizionatamente
- [ ] **CB-02** — `sparkKvMock.get` restituisce `cloneValue(kvStore.get(key))` se la chiave esiste, `undefined` altrimenti
- [ ] **CB-03** — `sparkKvMock.set` scrive nel `kvStore` con `cloneValue`
- [ ] **CB-04** — `sparkKvMock.keys` restituisce `Array.from(kvStore.keys())`
- [ ] **CB-05** — Il blocco `vi.mock('@github/spark/hooks', () => ({ useKV: ... }))` è identico all'originale — nessuna riga toccata
- [ ] **CB-06** — `resetTestKvStore`, `seedTestKvStore` e il blocco `afterEach` sono identici all'originale
### Blocco C — Modifiche ai test e validazione finale
- [ ] **CC-01** — La firma di `it(...)` in `01-app-renders.test.tsx` è `async () => {`
- [ ] **CC-02** — `screen.getByRole('dialog')` è sostituito con `await screen.findByRole('dialog')`
- [ ] **CC-03** — `screen.getByText(/Imposta PIN Globale/i)` è sostituito con `await screen.findByText(/Imposta PIN Globale/i)`
- [ ] **CC-04** — `screen.getByText(/Crea un PIN per proteggere l'applicazione/i)` resta sincrono (nessuna modifica)
- [ ] **CC-05** — In `test-utils.ts`, la prima riga di `authenticateWithPin` è `await screen.findByLabelText(/Nuovo PIN/i)`
- [ ] **CC-06** — Le righe successive di `authenticateWithPin` (`getByLabelText(/Conferma PIN/i)`, `getByRole(...)`) restano sincrone
- [ ] **CC-07** — I file `02`, `03`, `04`, `05` non sono stati modificati
- [ ] **CC-08** — `tsc --noEmit` → 0 errori
- [ ] **CC-09** — `npm run lint` → 0 problemi sui file modificati
- [ ] **CC-10** — `npm run test:run` → 0 failures
- [ ] **Gate lint** — `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [ ] **Gate build** — `npm run build` → exit 0
- [ ] **Gate test** — `npm run test:run` → 0 failures
- [ ] **Gate manuale** — 4 scenari sezione 7 del design verificati
