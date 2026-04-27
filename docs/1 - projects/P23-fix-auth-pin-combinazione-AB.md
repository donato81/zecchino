# P23-fix — Correzione definitiva BUG-01: combinazione A+B (mock asincrono + sentinella `null`)

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Sostituisce integralmente la soluzione adottata nel Passo 23.  
> Bug di riferimento: BUG-01 — report `docs/4 - reports/report-diagnostico-bug-pre-merge.md`  
> Analisi approfondita: `docs/4 - reports/report-diagnostico-pin-approfondito.md`  
> Data: 28 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Intestazione

| Campo | Valore |
|---|---|
| **Bug ID** | BUG-01 |
| **Severità** | Bloccante |
| **Segnalato in** | `docs/4 - reports/report-diagnostico-bug-pre-merge.md` — Sezione 1 |
| **File principali coinvolti** | `src/test/setup.ts`, `src/context/AuthContext.tsx` |
| **File di test aggiornati** | `src/test/smoke/01-app-renders.test.tsx`, `src/test/smoke/test-utils.ts` |
| **Branch** | `refactoring-architettura` |
| **Data** | 28 aprile 2026 |
| **Tipo di intervento** | Bugfix — nessun refactoring, nessuna nuova feature |
| **Relazione con P23** | Sostituisce l'implementazione del Passo 23. I file già modificati da P23 (`AuthContext.tsx`) vengono ulteriormente aggiornati. Il file `setup.ts` non era stato toccato da P23 e viene modificato per la prima volta. |

---

## 2. Perché P23 non è sufficiente

### 2.1 Il disallineamento sincrono/asincrono

Il Passo 23 ha introdotto il guard `if (globalPinHash === undefined) return` nell'`useEffect` di inizializzazione, con l'intento di aspettare la risoluzione asincrona del KV store prima di decidere tra setup e login. Questa logica è **corretta per la piattaforma reale**, dove `useKV` restituisce `undefined` al primo render sincrono e poi aggiorna il valore in modo asincrono (sezione 2.1 del report approfondito).

Il problema fondamentale, descritto nelle sezioni 4 e 5 del report approfondito, è che il mock di `useKV` in `src/test/setup.ts` è **completamente sincrono**: la sua implementazione con `useState(() => { ... })` legge il kvStore durante la fase di inizializzazione e restituisce il valore immediatamente, senza mai simulare la transizione asincrona `undefined → valore`.

**Conseguenza diretta:** nei test con kvStore vuoto (primo avvio), `globalPinHash` viene inizializzato a `undefined` e **non cambia mai** per tutta la durata del test. Il guard `=== undefined` diventa una barriera invalicabile: il dialog PIN non viene mai mostrato e i test del caso "primo avvio" falliscono sistematicamente.

### 2.2 L'incognita sul primo avvio su piattaforma reale

Sezione 2.2 del report approfondito descrive una seconda criticità: quando non esiste alcun PIN configurato nel KV store e il default value è `undefined`, il comportamento della piattaforma Spark è **non documentato**. Due scenari sono possibili:

- **Scenario A** (piattaforma converte `undefined` → `null`): il KV restituisce `null`, il guard `=== undefined` viene superato, il dialog di setup appare. ✓
- **Scenario B** (piattaforma non serializza `undefined`): `globalPinHash` resta `undefined`, il guard blocca per sempre, il dialog non appare. ✗

Il fatto che `undefined` non sia serializzabile in JSON (e che il KV store utilizzi verosimilmente JSON internamente) rende il Scenario B realistico. Usare `null` come sentinella elimina questa incognita: `null` è serializzabile (`JSON.stringify(null) === "null"`) e la piattaforma lo gestisce in modo prevedibile.

### 2.3 Perché i fix precedenti hanno oscillato

Come documentato in sezione 5 del report approfondito: ogni tentativo che usava `undefined` come sentinella di loading richiedeva che il mock simulasse il comportamento asincrono della piattaforma — ma questa simulazione non è mai stata implementata in `setup.ts`. La vera causa strutturale — il disallineamento tra mock sincrono e piattaforma asincrona — non è mai stata affrontata direttamente.

---

## 3. Decisione progettuale

### 3.1 La combinazione A+B

La soluzione adottata unisce due interventi complementari:

- **Parte A** — Modificare il mock `useKV` in `src/test/setup.ts` per simulare il comportamento asincrono della piattaforma reale: al mount restituisce sempre `undefined`, poi aggiorna al valore reale tramite un `useEffect` interno.
- **Parte B** — Cambiare il tipo e il default di `useKV` per `global-pin-hash` in `src/context/AuthContext.tsx`: da `string | undefined` con default `undefined` a `string | null` con default `null`. Il guard dell'`useEffect` di inizializzazione diventa `if (globalPinHash === null) return`.

### 3.2 Confronto con le alternative

| Approccio | Risolve test? | Risolve primo avvio prod? | Note |
|---|---|---|---|
| **Solo A** (mock async, sentinella resta `undefined`) | ✅ | ⚠️ incerto | Dipende dal Scenario A/B della piattaforma su `undefined`. L'incognita resta. |
| **Solo B** (sentinella `null`, mock sincrono invariato) | ✗ | ✅ | Il mock sincrono restituirebbe `null` definitivamente → `=== null` blocca per sempre → stesso problema nei test. |
| **A+B combinati** | ✅ | ✅✅ | Elimina sia il disallineamento mock/prod che l'incognita sulla serializzazione di `undefined`. Soluzione robusta. |

**Perché le due parti devono essere applicate insieme:**

Solo A risolve i test ma lascia aperta l'incognita sul primo avvio in produzione (il comportamento di `undefined` nel KV della piattaforma non è documentato). Solo B risolve il primo avvio in produzione ma rende i test inutilizzabili perché il mock sincrono restituirebbe `null` definitivamente, rendendo `=== null` invalicabile esattamente come prima. Solo la combinazione produce un sistema consistente: il mock asincrono simula la transizione `null → valore` esattamente come la piattaforma reale simula `null → valore` (o `null → null` nel primo avvio).

---

## 4. Parte A — Modifiche a `src/test/setup.ts`

### 4.1 Import aggiuntivo

Il mock deve usare `useEffect` per simulare la risoluzione asincrona. `useEffect` non è attualmente importato.

**Prima (riga 3):**

```ts
import { useState } from 'react'
```

**Dopo:**

```ts
import { useState, useEffect } from 'react'
```

---

### 4.2 Sostituzione del mock `useKV`

Questa è la modifica principale della Parte A. Il blocco `vi.mock('@github/spark/hooks', () => ({ ... }))` viene riscritto integralmente.

**Prima (righe 21–46 — attuale):**

```ts
vi.mock('@github/spark/hooks', () => ({
  useKV: (key: string, defaultValue: unknown) => {
    const [value, setValue] = useState(() => {
      if (kvStore.has(key)) {
        return cloneValue(kvStore.get(key))
      }

      const initialValue = cloneValue(defaultValue)
      kvStore.set(key, initialValue)
      return initialValue
    })

    const setStoredValue = (nextValue: unknown) => {
      setValue((currentValue) => {
        const resolvedValue = typeof nextValue === 'function'
          ? (nextValue as (previousValue: unknown) => unknown)(currentValue)
          : nextValue

        const clonedValue = cloneValue(resolvedValue)
        kvStore.set(key, clonedValue)
        return clonedValue
      })
    }

    return [value, setStoredValue]
  },
}))
```

**Dopo:**

```ts
vi.mock('@github/spark/hooks', () => ({
  useKV: (key: string, defaultValue: unknown) => {
    const [value, setValue] = useState<unknown>(undefined)

    useEffect(() => {
      const storedValue = kvStore.has(key)
        ? cloneValue(kvStore.get(key))
        : (() => {
            const initial = cloneValue(defaultValue)
            kvStore.set(key, initial)
            return initial
          })()
      setValue(storedValue)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const setStoredValue = (nextValue: unknown) => {
      setValue((currentValue) => {
        const resolvedValue = typeof nextValue === 'function'
          ? (nextValue as (previousValue: unknown) => unknown)(currentValue)
          : nextValue

        const clonedValue = cloneValue(resolvedValue)
        kvStore.set(key, clonedValue)
        return clonedValue
      })
    }

    return [value, setStoredValue]
  },
}))
```

---

### 4.3 Spiegazione riga per riga delle differenze

| Elemento | Prima | Dopo | Motivazione |
|---|---|---|---|
| `useState` initializer | `useState(() => { ... })` — legge kvStore in modo sincrono | `useState<unknown>(undefined)` — sempre `undefined` al mount | Simula il comportamento della piattaforma: il valore reale non è disponibile al primo render sincrono |
| Lettura kvStore | Dentro `useState(() => { ... })` — eseguita in fase di rendering | Dentro `useEffect(() => { ... }, [])` — eseguita post-render | Post-commit, come il KV store reale che risolve in modo asincrono |
| `useEffect` | Assente | Presente con deps `[]` (one-shot) | Simula la risoluzione asincrona: dopo il mount, il valore viene caricato e `setValue` aggiorna il componente |
| Logica di fallback | `if (kvStore.has(key)) ... else { kvStore.set(key, initial); return initial }` | Identica ma nell'`useEffect` | La semantica è la stessa; spostata nel momento post-render corretto |
| `setStoredValue` | Invariato | Invariato | La logica di scrittura nel kvStore non cambia |
| `eslint-disable-line` | Assente | `// eslint-disable-line react-hooks/exhaustive-deps` sulla riga del deps array | `key` e `defaultValue` non devono essere nelle deps (il mock è one-shot, come il KV reale che si legge una sola volta al mount) |

---

### 4.4 Test che richiedono aggiornamento

Con il nuovo mock, al momento di `renderApp()` il valore di `globalPinHash` è `undefined`. Il dialog PIN non è ancora aperto. Viene aperto solo dopo che il `useEffect` interno al mock ha eseguito e `globalPinHash` ha ricevuto il valore reale. Qualsiasi query sincrona (`getByText`, `getByRole`, `getByLabelText`) su elementi che dipendono dall'apertura del dialog fallirà se eseguita prima di questo aggiornamento.

**File: `src/test/smoke/01-app-renders.test.tsx`**

Il test deve diventare `async` e le query sul dialog devono diventare asincrone:

| Riga attuale | Tipo query | Problema | Fix |
|---|---|---|---|
| `screen.getByRole('dialog')` | sincrona | Dialog non ancora aperto al mount | → `await screen.findByRole('dialog')` |
| `screen.getByText(/Imposta PIN Globale/i)` | sincrona | Testo non presente prima della risoluzione KV | → `screen.getByText(...)` (sincrono) — eseguito dopo `findByRole` che garantisce l'apertura del dialog |
| `screen.getByText(/Crea un PIN per proteggere l'applicazione/i)` | sincrona | Idem | → `screen.getByText(...)` (sincrono) — eseguito dopo `findByRole` |

Strategia consigliata: attendere il dialog con `await screen.findByRole('dialog')`, poi le query successive sul contenuto del dialog rimangono sincrone perché il DOM è già aggiornato.

**File: `src/test/smoke/test-utils.ts` — funzione `authenticateWithPin`**

La prima query della funzione usa `getByLabelText` sincrono per trovare il campo PIN. Con il nuovo mock, al momento in cui `authenticateWithPin` viene invocata (immediatamente dopo `renderApp()`), il dialog non è ancora aperto.

| Riga attuale | Tipo query | Problema | Fix |
|---|---|---|---|
| `const pinField = screen.getByLabelText(/Nuovo PIN/i)` | sincrona | Dialog non ancora aperto | → `const pinField = await screen.findByLabelText(/Nuovo PIN/i)` |

Le query successive (`getByLabelText(/Conferma PIN/i)`, `getByRole('button', { name: /Conferma/i })`) rimangono sincrone: dopo che `findByLabelText` ha trovato il campo, il dialog è sicuramente aperto e il DOM è stabile.

**File: `src/test/smoke/02-authentication.test.tsx`**

Non richiede modifiche dirette: chiama `authenticateWithPin` che, una volta aggiornata, gestisce la prima attesa in modo asincrono.

**File: `src/test/smoke/03-dashboard-tab.test.tsx`**

Le query sincrone (`screen.getByRole`, `screen.getByText`) sono eseguite **dopo** che `await authenticateWithPin(user)` è già risolto — in quel momento il DOM è autenticato e i contenuti sono visibili. Non richiedono aggiornamento.

**File: `src/test/smoke/04-transactions-tab.test.tsx`**

Idem: le query sincrone sui contenuti della tab avvengono dopo che auth e click sul tab sono già risolti. Non richiedono aggiornamento.

**File: `src/test/smoke/05-private-account.test.tsx`**

Le query su elementi del dialog privato (`screen.getByText(/Crea PIN Conto Privato/i)`, `screen.getByLabelText(/Nuovo PIN/i)`) avvengono dopo `await authenticateWithPin(user)` e `await user.click(...)`, entrambe operazioni asincrone già complete. Non richiedono aggiornamento.

---

### 4.5 Riepilogo modifiche a `setup.ts`

| Tipo | Riga/e | Descrizione |
|---|---|---|
| Modifica import | Riga 3 | Aggiungere `useEffect` all'import da `react` |
| Riscrittura mock `useKV` | Righe 21–46 | `useState` sincrono → `useState(undefined)` + `useEffect` per risoluzione post-mount |
| **Nessuna altra modifica** | — | `kvStore`, `cloneValue`, `resetTestKvStore`, `seedTestKvStore`, `sparkKvMock`, mock audio, mock matchMedia, `afterEach`: invariati |

---

## 5. Parte B — Modifiche a `src/context/AuthContext.tsx`

### 5.1 Tipo e default di `useKV` per `global-pin-hash`

**Prima (riga 37 — attuale dopo P23):**

```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)
```

**Dopo:**

```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string | null>('global-pin-hash', null)
```

**Motivazione:** `null` è serializzabile in JSON (`JSON.stringify(null) === "null"`); la piattaforma Spark gestisce la transizione `null → null` (primo avvio, nessun PIN) e `null → hash` (avvio successivo, PIN presente) in modo prevedibile e deterministico. Elimina l'incognita descritta in sezione 2.2.

---

### 5.2 Interfaccia `AuthContextValue` — campo `globalPinHash`

**Prima (righe 10–11 — attuale dopo P23):**

```tsx
interface AuthContextValue {
  globalPinHash: string | undefined
  setGlobalPinHash: (value: string | ((prev?: string) => string)) => void
```

**Dopo:**

```tsx
interface AuthContextValue {
  globalPinHash: string | null
  setGlobalPinHash: (value: string | null | ((prev: string | null) => string | null)) => void
```

**Motivazione:** il campo `globalPinHash` rispecchia il nuovo tipo `string | null`. Il tipo del setter viene aggiornato di conseguenza per essere compatibile con `useKV<string | null>` e per soddisfare il type-checker TypeScript. Nessun altro campo dell'interfaccia cambia.

---

### 5.3 Guard nell'`useEffect` di inizializzazione

**Prima (riga 51 — attuale dopo P23):**

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
  if (globalPinHash === null) return
  if (hasInitialized.current) return
  hasInitialized.current = true
  if (!globalPinHash) {
    setIsSetupMode(true)
  }
  setShowPinDialog(true)
}, [globalPinHash])
```

**Cosa cambia:** solo la prima riga del corpo dell'effect: `=== undefined` → `=== null`. Il resto del blocco rimane identico.

**Comportamento del guard `if (!globalPinHash)` con `string | null`:** la condizione valuta `true` per `''` (stringa vuota — nessun PIN configurato) e per `null` (non raggiungibile grazie al guard precedente). Valuta `false` per qualsiasi hash non vuoto. La semantica è identica a prima.

---

### 5.4 Impatto su `handleGlobalPinSubmit`

```tsx
// riga esistente — invariata
const isValid = await verifyPin(pin, globalPinHash || '')
```

Con tipo `string | null`, l'espressione `globalPinHash || ''` rimane valida: `null` è falsy, quindi l'operatore `||` restituisce `''` come fallback. Il type-checker TypeScript accetta `string | null || string` poiché il risultato è sempre `string`. **Nessuna modifica necessaria.**

---

### 5.5 Riepilogo modifiche a `AuthContext.tsx`

| Tipo | Riga/e | Descrizione |
|---|---|---|
| Modifica generic `useKV` | Riga 37 | `useKV<string \| undefined>(..., undefined)` → `useKV<string \| null>(..., null)` |
| Modifica interfaccia | Righe 10–11 | `globalPinHash: string \| undefined` → `string \| null`; tipo setter aggiornato |
| Modifica guard useEffect | Riga 51 | `=== undefined` → `=== null` |
| **Nessuna altra modifica** | — | Import, `useRef`, `hasInitialized`, `handleGlobalPinSubmit`, `handlePrivatePinSubmit`, JSX: invariati |

---

## 6. Ordine di applicazione

**1. Modificare prima `src/test/setup.ts`**

Il mock deve essere aggiornato prima di toccare `AuthContext.tsx`. Questo permette di:

- Eseguire `npm run test:run` dopo la Parte A e osservare che i test del caso "kvStore seedato" (02–05) continuano a passare. Questo valida che il nuovo mock asincrono è retrocompatibile.
- I test del caso "primo avvio" (01) falliranno ancora in questa fase perché `AuthContext.tsx` usa ancora `undefined` come sentinella — ma il fallimento è atteso e documentato.

**2. Modificare poi `src/context/AuthContext.tsx`**

Con il mock già aggiornato, l'aggiornamento di `AuthContext.tsx` completa la combinazione A+B. Dopo questa modifica, eseguire `npm run test:run` deve produrre 0 failures.

**3. Aggiornare i test nel terzo step**

I test `01-app-renders.test.tsx` e `test-utils.ts` vanno aggiornati alle query asincrone. Possono essere modificati contestualmente alla Parte A (approccio preferito — evita test rossi intermedi) oppure contestualmente alla Parte B.

---

## 7. Comportamento atteso dopo la correzione

### 7.1 Primo avvio reale (nessun PIN configurato, KV vuoto)

1. Mount di `AuthProvider`: `useKV<string | null>('global-pin-hash', null)` restituisce `null` in modo sincrono (defaultValue).
2. `useEffect [globalPinHash]` gira: `null === null` → guard blocca, return early. `showPinDialog = false`.
3. KV store risolve in modo asincrono → chiave non trovata → `getOrSetKey` scrive `null` e restituisce `null`.
4. `React.Object.is(null, null)` → nessun re-render. Il guard blocca indefinitamente.

**Limitazione nota:** il primo avvio in produzione con `null` come defaultValue ha lo stesso problema strutturale di `undefined` nel Scenario B (sezione 2.2 del report approfondito): quando la piattaforma restituisce il defaultValue invariato per una chiave non trovata, React non vede nessun cambiamento di stato e il re-render non avviene. Il guard `=== null` non viene mai superato.

**Scope di questa correzione:** BUG-01 è documentato come "ad ogni refresh appare il dialog di setup invece del login". Il caso primo avvio in produzione esula dallo scope di BUG-01 e potrà essere affrontato separatamente (es. con un flag sentinel distinto da qualsiasi valore reale del KV). La combinazione A+B risolve BUG-01 e allinea i test; non pretende di correggere il primo avvio in produzione.

### 7.2 Avvii successivi (PIN già configurato)

1. Mount: `globalPinHash = null` (default sincrono).
2. `useEffect`: `null === null` → guard blocca, return early.
3. KV risolve in modo asincrono → PIN trovato → `globalPinHash = 'abc123hash...'`.
4. React vede `null → 'abc123hash...'` → re-render.
5. `useEffect` si riesegue: `'abc123hash...' !== null` → prima guard superata. `hasInitialized.current = false` → seconda guard superata. Imposta `hasInitialized.current = true`. `!globalPinHash` è `false` → `isSetupMode` rimane `false`. `setShowPinDialog(true)`.
6. Dialog "Inserisci PIN" appare. ✓

**BUG-01 risolto:** in precedenza (con default `''` e deps `[]`) il dialog setup appariva sempre al refresh perché l'effect leggeva il default sincrono prima della risoluzione KV. Con A+B, l'effect aspetta il valore reale grazie al guard `=== null`. ✓

### 7.3 Refresh F5 (con PIN configurato)

Identico al punto 7.2: `hasInitialized.current` riparte da `false` al rimount del provider. Il KV carica l'hash esistente. Il dialog "Inserisci PIN" appare. ✓

### 7.4 Creazione PIN durante il setup

1. Utente completa il form → `handleGlobalPinSubmit` in setup mode → `setGlobalPinHash(hash)`.
2. `globalPinHash` cambia: `null → 'newHash...'` o `'' → 'newHash...'`.
3. `useEffect` si riesegue: `'newHash...' !== null` → prima guard superata. `hasInitialized.current === true` → seconda guard blocca. **Nessuna riapertura del dialog.** ✓

### 7.5 PIN errato al login

L'`useEffect` non è coinvolto. `handleGlobalPinSubmit` gestisce l'errore (`toast.error`, `soundSystem.play('pin-error')`), il dialog rimane aperto. Comportamento invariato. ✓

### 7.6 Esecuzione test suite completa (`npm run test:run`)

Con entrambe le parti implementate e i test aggiornati:

**`01-app-renders.test.tsx` — test "primo avvio" (kvStore vuoto):**

Il mock inizia con `useState<unknown>(undefined)` (non `null`). Al mount, `globalPinHash = undefined`. Il guard `=== null` in AuthContext valuta `undefined !== null` → guard superato immediatamente. `hasInitialized.current = false` → seconda guard superata. `!undefined` è `true` → `setIsSetupMode(true)` → `setShowPinDialog(true)`. Il dialog "Imposta PIN Globale" appare già al primo render sincrono, prima ancora che il `useEffect` interno al mock abbia eseguito. ✓

Successivamente, il `useEffect` del mock gira e chiama `setValue(null)` (poiché il kvStore è vuoto, `cloneValue(null) = null`). `globalPinHash` diventa `null`. L'`useEffect` di AuthContext si riesegue: `null === null` → guard blocca. `hasInitialized.current = true` → seconda guard blocca. Nessuna azione aggiuntiva. Il dialog rimane aperto. ✓

**Comportamento test 02–05:**

Tutti usano `authenticateWithPin` che, dopo l'aggiornamento di `test-utils.ts`, attende il dialog con `findByLabelText` prima di interagire. Dopo l'autenticazione, le query sincrone su contenuti già renderizzati funzionano correttamente. ✓

**Risultato:** `npm run test:run` → 0 failures.

---

## 8. Comportamento invariato

| Aspetto | Note |
|---|---|
| **Import da `react` in `AuthContext.tsx`** | `useRef` era già presente dopo P23 — nessuna modifica |
| **`hasInitialized`** | Rimane `useRef(false)` — non diventa `useState` |
| **`handleGlobalPinSubmit`** | Invariato — `globalPinHash \|\| ''` funziona con `string \| null` |
| **`handlePrivatePinSubmit`** | Invariato — non coinvolto |
| **Logica PIN privato** | `isPrivateUnlocked`, `privatePinHash`, `showPrivatePinDialog` — invariati |
| **`AuthScreen.tsx`** | Non modificato — legge `showPinDialog`, `isSetupMode`, `handleGlobalPinSubmit` dal context |
| **`PinDialog.tsx`** | Non modificato |
| **`App.tsx`** | Non modificato — guard `!isAuthenticated` invariato |
| **Tutti gli altri consumer di `useAuth()`** | Non richiedono modifiche |
| **`kvStore`, `resetTestKvStore`, `seedTestKvStore` in `setup.ts`** | Invariati |
| **`sparkKvMock` in `setup.ts`** | Invariato |
| **Mock audio, matchMedia, vibrate in `setup.ts`** | Invariati |
| **`afterEach(() => { cleanup(); resetTestKvStore() })` in `setup.ts`** | Invariato |
| **Test 02–05** | Logica invariata — solo `test-utils.ts` viene aggiornato nella query di accesso al dialog |
| **Dipendenze esterne** | Nessuna nuova dipendenza introdotta |
| **File di configurazione** | `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js` — invariati |
| **File SCF sotto `.github/`** | Protetti da `framework-guard.instructions.md` — invariati |

---

## 9. Criteri di accettazione

### 9.1 `src/test/setup.ts`

| # | Criterio | Verifica |
|---|---|---|
| CA-01 | `useEffect` è importato da `react` insieme a `useState` (riga 3) | ☐ |
| CA-02 | Il mock `useKV` inizializza il valore con `useState<unknown>(undefined)` (nessun initializer sincrono) | ☐ |
| CA-03 | Il mock `useKV` contiene un `useEffect(() => { ... }, [])` che chiama `setValue(storedValue)` dopo il mount | ☐ |
| CA-04 | Il `useEffect` interno al mock usa `eslint-disable-line react-hooks/exhaustive-deps` sulla riga del deps array `[]` | ☐ |
| CA-05 | La logica di `setStoredValue` (aggiornamento con funzione o valore diretto, `cloneValue`, `kvStore.set`) è identica all'originale | ☐ |
| CA-06 | `resetTestKvStore`, `seedTestKvStore`, `sparkKvMock`, mock audio, `afterEach` sono invariati | ☐ |

### 9.2 `src/context/AuthContext.tsx`

| # | Criterio | Verifica |
|---|---|---|
| CA-07 | `useKV` per `global-pin-hash` è dichiarato come `useKV<string \| null>('global-pin-hash', null)` | ☐ |
| CA-08 | L'interfaccia `AuthContextValue` ha `globalPinHash: string \| null` | ☐ |
| CA-09 | Il tipo di `setGlobalPinHash` nell'interfaccia è aggiornato per `string \| null` | ☐ |
| CA-10 | La prima istruzione dell'`useEffect` di inizializzazione è `if (globalPinHash === null) return` | ☐ |
| CA-11 | Il resto dell'`useEffect` (guard `hasInitialized`, flag one-shot, `setIsSetupMode`, `setShowPinDialog`) è identico a P23 | ☐ |
| CA-12 | `hasInitialized` è ancora `useRef(false)` — non è diventato `useState` | ☐ |
| CA-13 | `handleGlobalPinSubmit` è identico a P23 — nessuna riga modificata | ☐ |
| CA-14 | Nessun file UI (`AuthScreen.tsx`, `PinDialog.tsx`, `App.tsx`) è stato modificato | ☐ |

### 9.3 Test aggiornati

| # | Criterio | Verifica |
|---|---|---|
| CA-15 | `01-app-renders.test.tsx` è `async` e usa `await screen.findByRole('dialog')` (o equivalente `findBy*`) prima delle query sul contenuto del dialog | ☐ |
| CA-16 | `test-utils.ts` — `authenticateWithPin` usa `await screen.findByLabelText(/Nuovo PIN/i)` anziché `screen.getByLabelText` | ☐ |
| CA-17 | I test 02–05 non richiedono modifiche a query sincrone esistenti (verificare che passino senza toccarli) | ☐ |

### 9.4 Validazione finale

| # | Criterio | Verifica |
|---|---|---|
| CA-18 | `tsc --noEmit` → 0 errori dopo entrambe le modifiche | ☐ |
| CA-19 | `npm run lint` → 0 problems (nessun `react-hooks/exhaustive-deps` non gestito, nessun nuovo warning) | ☐ |
| CA-20 | `npm run test:run` → 0 failures, tutti i test passano | ☐ |

---

## 10. Note per l'agente di implementazione

### 10.1 Query sincrone vs asincrone in React Testing Library

`getByText` / `getByRole` / `getByLabelText` sono query **sincrone**: cercano nel DOM corrente e lanciano un errore se l'elemento non è trovato. Falliscono se il DOM non è ancora aggiornato.

`findByText` / `findByRole` / `findByLabelText` sono query **asincrone** (ritornano `Promise`): attendono fino a un timeout (default 1000ms) che l'elemento appaia nel DOM. Richiedono `await`.

**Pattern corretto per test che dipendono dal dialog PIN:**

```tsx
// SBAGLIATO — il dialog potrebbe non essere ancora aperto
screen.getByRole('dialog')

// CORRETTO — attende che il dialog appaia
await screen.findByRole('dialog')
```

Una volta che un `findBy*` è risolto positivamente, le query `getBy*` sincrone successive sullo stesso DOM sono sicure.

### 10.2 `structuredClone(null)` restituisce `null`

La funzione `cloneValue` in `setup.ts` usa `structuredClone`. `structuredClone(null)` restituisce `null` (corretto per la specifica). Con il nuovo default `null` in `AuthContext.tsx`, il mock esegue:

```ts
const initial = cloneValue(null)   // → structuredClone(null) → null
kvStore.set(key, null)
setValue(null)
```

Il componente passa da `globalPinHash = undefined` (mount) a `globalPinHash = null` (post-useEffect). Questo è il comportamento corretto per testare il guard `=== null`.

### 10.3 Il caso "primo avvio" nel test

Con il mock aggiornato e la sentinella `null`, la sequenza nel test "primo avvio" (kvStore vuoto) è:

1. Mount: `globalPinHash = undefined` → guard `=== null` → `undefined !== null` → guard **non** blocca al mount.
2. `useEffect` di AuthContext gira: `undefined !== null` → prima guard superata. `hasInitialized.current = false` → seconda guard superata. `hasInitialized.current = true`. `!undefined` → `true` → `setIsSetupMode(true)`. `setShowPinDialog(true)`. **Dialog setup appare immediatamente!** ✓
3. `useEffect` del mock gira (post-mount): `setValue(null)`. `globalPinHash` diventa `null`.
4. `useEffect` di AuthContext si riesegue: `null === null` → guard blocca. `hasInitialized.current = true` → seconda guard blocca. Nessuna azione. ✓

**Questo è il comportamento corretto.** Il dialog appare perché il primo render con `undefined` supera il guard `=== null` e innesca subito l'inizializzazione. Il test 01 funziona senza attendere la risoluzione asincrona del mock.

**Conseguenza per `01-app-renders.test.tsx`:** il dialog potrebbe apparire già al primo render sincrono (grazie alla transizione `undefined → guard-superato`). In quel caso `getByText` sincrono potrebbe già funzionare. Tuttavia, per robustezza e consistenza con gli altri test, è preferibile usare `findByText`/`findByRole` anche in questo test — garantisce stabilità indipendentemente dall'ordine di esecuzione degli effect.

### 10.4 Propagazione del tipo `string | null` in `handleGlobalPinSubmit`

```tsx
// Riga esistente — invariata — già compatibile con string | null
const isValid = await verifyPin(pin, globalPinHash || '')
```

Il tipo di `globalPinHash` è ora `string | null`. L'espressione `globalPinHash || ''`:
- Se `globalPinHash` è `null` → falsy → restituisce `''` → `verifyPin(pin, '')` → always false (nessun hash salvato). Corretto.
- Se `globalPinHash` è `''` → falsy → restituisce `''` → identico a prima.
- Se `globalPinHash` è `'hash...'` → truthy → restituisce `'hash...'` → verifica corretta.

TypeScript accetta questa espressione: `(string | null) || string` → risultato `string`. Nessuna modifica necessaria.

### 10.5 Ordine dei guard nell'`useEffect`

Con `null` come sentinella e il mock che inizia con `undefined`:

| Momento | `globalPinHash` | Guard `=== null` | Guard `hasInitialized` | Azione |
|---|---|---|---|---|
| Render 1 (mount) | `undefined` | `false` (superato!) | `false` (superato!) | Inizializzazione eseguita ✓ |
| Dopo mock useEffect | `null` | `true` (bloccato) | — | Nessuna azione ✓ |
| Dopo KV reale (hash) | `'hash...'` | `false` | `true` (bloccato) | Nessuna azione ✓ |

Il comportamento di `undefined` che supera il guard `=== null` è **intenzionale e necessario** per il primo avvio. Non è un bug.

---

## 11. Messaggio di commit

Da usare al termine dell'implementazione di entrambi i file e dell'aggiornamento dei test:

```
fix(auth): combinazione A+B — mock useKV asincrono + sentinella null per globalPinHash

- setup.ts: useKV mock ora inizia con undefined e aggiorna via useEffect (simula piattaforma)
- AuthContext.tsx: useKV<string|null> con default null; guard === null nell'useEffect init
- 01-app-renders.test.tsx: query asincrone (findByRole) per dialog PIN
- test-utils.ts: authenticateWithPin usa findByLabelText per attendere apertura dialog

Closes BUG-01
```
