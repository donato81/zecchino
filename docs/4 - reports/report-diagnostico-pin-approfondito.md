# Report Diagnostico PIN — Analisi Approfondita
**Data:** 27 aprile 2026  
**Branch:** `refactoring-architettura`  
**Tipo:** Sola lettura — nessuna modifica al codice  
**File analizzati:** `src/context/AuthContext.tsx`, `src/test/setup.ts`, `src/App.tsx`,  
`src/components/AuthScreen.tsx`, `src/components/PinDialog.tsx`, `src/lib/crypto.ts`

---

## Indice

1. [Stato attuale del codice](#1-stato-attuale-del-codice)
2. [Mappa del flusso di esecuzione](#2-mappa-del-flusso-di-esecuzione)
3. [Punto esatto di biforcazione](#3-punto-esatto-di-biforcazione)
4. [Causa radice definitiva](#4-causa-radice-definitiva)
5. [Perché i tentativi precedenti non hanno risolto](#5-perché-i-tentativi-precedenti-non-hanno-risolto)
6. [Analisi file correlati](#6-analisi-file-correlati)
7. [Soluzioni possibili](#7-soluzioni-possibili)
8. [Conclusione](#8-conclusione)

---

## 1. Stato Attuale del Codice

### `src/context/AuthContext.tsx` — useEffect di inizializzazione (righe 49–57)

```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)
// ...
const hasInitialized = useRef(false)

useEffect(() => {
  if (globalPinHash === undefined) return   // Guard A: KV non ancora caricato
  if (hasInitialized.current) return        // Guard B: one-shot
  hasInitialized.current = true
  if (!globalPinHash) {
    setIsSetupMode(true)                    // nessun hash salvato → setup
  }
  setShowPinDialog(true)
}, [globalPinHash])
```

**Differenza rispetto al codice originale (pre-BUG-01):**

| | Originale (BUG-01) | Attuale (P23) |
|---|---|---|
| Tipo | `useKV<string>` | `useKV<string \| undefined>` |
| Default | `''` (stringa vuota) | `undefined` |
| Deps effect | `[]` | `[globalPinHash]` |
| Guard | assente | `=== undefined` + `hasInitialized` |

---

## 2. Mappa del Flusso di Esecuzione

### 2.1 — Piattaforma reale: Refresh (PIN già salvato) ✅ FUNZIONA

Questo è lo scenario che si suppone risolva VARIANTE A (setup mode su refresh).

```
Render 1  ──────────────────────────────────────────────────────────────
  useKV('global-pin-hash', undefined)
    └─► KVClient chiama getOrSetKey() in modo ASINCRONO
    └─► Restituisce SINCRONO: undefined (defaultValue)
  
  globalPinHash = undefined          hasInitialized.current = false
  isSetupMode   = false              showPinDialog = false

  useEffect [globalPinHash] si accoda per post-render:
    ├─ if (undefined === undefined) return   ← RETURN EARLY ✓
    └─ Nessuna modifica di stato

Re-render 1 → AuthScreen renderizzato, PinDialog open={false}
             Nessun dialog visibile. L'utente vede schermata di attesa.

KV async risolve ────────────────────────────────────────────────────────
  getOrSetKey('global-pin-hash', undefined) → chiave ESISTE → 'abc123...'
  Stato React aggiornato: globalPinHash = 'abc123...'

Render 2  ──────────────────────────────────────────────────────────────
  globalPinHash = 'abc123...'        hasInitialized.current = false

  useEffect [globalPinHash] si accoda:
    ├─ 'abc123...' === undefined  → FALSE  (non ritorna)
    ├─ hasInitialized.current     → false  (non ritorna)
    ├─ hasInitialized.current = true
    ├─ !'abc123...'               → FALSE  (non setup mode)
    └─ setShowPinDialog(true) ✓

Re-render 2 → PinDialog open={true}, isSetupMode=false → "Inserisci PIN" ✓
```

**Esito: CORRETTO.** Il flusso refresh con PIN salvato funziona perfettamente.

---

### 2.2 — Piattaforma reale: Primo avvio (KV vuoto) — **INCOGNITA CRITICA**

```
Render 1  ──────────────────────────────────────────────────────────────
  (identico al caso 2.1 — sync: globalPinHash = undefined)
  
  useEffect [globalPinHash]:
    └─ if (undefined === undefined) return   ← RETURN EARLY

KV async risolve ────────────────────────────────────────────────────────
  getOrSetKey('global-pin-hash', undefined) → chiave NON ESISTE
  
  ┌─────────────────────────────────────────────────────────────────────┐
  │  COMPORTAMENTO DELLA PIATTAFORMA SPARK — NON DOCUMENTATO           │
  │                                                                     │
  │  Scenario A: defaultValue=undefined → KV serializza come null      │
  │    → stato diventa null (≠ undefined) → re-render → FUNZIONA ✓    │
  │                                                                     │
  │  Scenario B: defaultValue=undefined → KV non serializza undefined  │
  │    → stato rimane undefined → nessun re-render → VARIANTE B ✗      │
  └─────────────────────────────────────────────────────────────────────┘
```

**Se Scenario A (null) — il flusso continua:**

```
Render 2 con globalPinHash = null
  useEffect:
    ├─ null === undefined       → FALSE (non ritorna)
    ├─ hasInitialized.current   → false (non ritorna)
    ├─ hasInitialized.current = true
    ├─ !null                    → TRUE → setIsSetupMode(true) ✓
    └─ setShowPinDialog(true) ✓
  
  Dialog "Imposta PIN Globale" visibile ✓
```

**Se Scenario B (undefined permane) — VARIANTE B:**

```
  Nessun re-render. globalPinHash resta undefined.
  Dialog mai mostrato. App bloccata sulla schermata di autenticazione vuota.
```

---

### 2.3 — Test mock: Primo avvio (KV store vuoto) — **VARIANTE B SISTEMATICA**

Il mock in `src/test/setup.ts` implementa `useKV` con `useState` **sincrono**:

```tsx
useKV: (key: string, defaultValue: unknown) => {
  const [value, setValue] = useState(() => {
    if (kvStore.has(key)) {
      return cloneValue(kvStore.get(key))       // ← chiave in cache
    }
    const initialValue = cloneValue(defaultValue) // ← structuredClone(undefined) = undefined
    kvStore.set(key, initialValue)                // ← kvStore.set('global-pin-hash', undefined)
    return initialValue                           // ← returns undefined
  })
  // setStoredValue non viene MAI chiamato dall'esterno del componente
  return [value, setStoredValue]
}
```

**Ciclo di vita nel test:**

```
renderApp() chiama resetTestKvStore() → kvStore = {}

Render 1 in test:
  useState initializer:
    kvStore.has('global-pin-hash') → false
    cloneValue(undefined)          → undefined
    kvStore.set('global-pin-hash', undefined)
    ritorna undefined

  globalPinHash = undefined   ← sincrono, definitivo
  
  useEffect [globalPinHash]:
    └─ undefined === undefined → RETURN EARLY ← sempre, per sempre

Fine del test tick:
  Nessun aggiornamento asincrono. Il mock è 100% sincrono.
  globalPinHash = undefined per tutta la durata del test.
  Dialog NEVER shows.

Test 01 fallisce:
  screen.getByText(/Imposta PIN Globale/i)
  → Unable to find element with text: /Imposta PIN Globale/i
```

---

### 2.4 — Test mock: Avvio con PIN pre-seed — **FUNZIONA (per test autenticazione)**

Quando `renderApp({ initialKv: { 'global-pin-hash': 'hash...' } })`:

```
seedTestKvStore({ 'global-pin-hash': 'hash...' })
  → kvStore.set('global-pin-hash', 'hash...')

Render 1 in test:
  kvStore.has('global-pin-hash') → true
  cloneValue(kvStore.get(...))   → 'hash...'
  
  globalPinHash = 'hash...'   ← sincrono e corretto

  useEffect:
    ├─ 'hash...' === undefined  → FALSE
    ├─ hasInitialized → false
    ├─ hasInitialized = true
    ├─ !'hash...'               → FALSE (no setup mode)
    └─ setShowPinDialog(true) ✓

Dialog "Inserisci PIN" visibile immediatamente ✓
```

Questo caso funziona perché il valore è pre-seed **prima** del render. Non c'è async.

---

## 3. Punto Esatto di Biforcazione

```
Mount del componente AuthProvider
         │
         ▼
useKV('global-pin-hash', undefined)
         │
         ▼ [SINCRONO]
globalPinHash = undefined
         │
         ▼
useEffect [globalPinHash] — RENDER 1
         │
         ▼
┌────────────────────────────────┐
│  if (globalPinHash === undefined) return  │  ← PUNTO DI BIFORCAZIONE
└────────────────────────────────┘
         │
    ╔════╧══════════════════════════════════════════════════╗
    ║                                                       ║
    ▼                                                       ▼
  PIATTAFORMA REALE                               TEST MOCK
  (async KV resolution segue)              (nessun aggiornamento segue)
    │                                               │
    ▼                                               ▼
  [attende KV]                           globalPinHash = undefined ∞
    │                                    ┌──────────────────────────┐
    ├─► KV ha PIN salvato               │ VARIANTE B: dialog mai   │
    │   → globalPinHash = 'hash...'     │ mostrato                 │
    │   → Login dialog ✓               └──────────────────────────┘
    │
    └─► KV NON ha PIN (primo avvio)
        → Dipende da comportamento
          serializzazione undefined:
          ┌─────────────────────────────┐
          │ null: setup dialog ✓        │
          │ undefined: VARIANTE B ✗    │
          └─────────────────────────────┘
```

---

## 4. Causa Radice Definitiva

### Diagnosi in tre livelli

**Livello 1 — Sintomo:** Il dialog PIN non appare al primo avvio in ambiente test, e potenzialmente neanche su piattaforma reale se il KV non converte `undefined` → `null`.

**Livello 2 — Meccanismo:** Il guard `if (globalPinHash === undefined) return` è progettato per aspettare la risoluzione asincrona del KV store. Il mock di test è **sincrono** e non simula mai questa transizione: `globalPinHash` resta `undefined` permanentemente nel test, rendendo il guard una barriera invalicabile.

**Livello 3 — Causa strutturale:** Esiste un **disallineamento architetturale** tra:

| | Comportamento reale | Mock di test |
|---|---|---|
| Timing | Asincrono: `undefined → valore` | Sincrono: `undefined` definitivo |
| Chiave non trovata | `undefined → null` o `undefined → ''` | `undefined` permanente |
| Chiave trovata | `undefined → 'hash...'` | Dipende da seed, immediato |

Il guard `=== undefined` è semanticamente corretto come sentinella di "loading", ma questa semantica **non è implementata nel mock**. Il mock non distingue "KV non ancora caricato" da "KV caricato e il valore è undefined".

### Risposta alle domande specifiche

**Q1 — Ciclo di vita di `globalPinHash`:**

| Scenario | Render 1 | Dopo KV async |
|---|---|---|
| Piattaforma, PIN salvato | `undefined` | `'abc123...'` |
| Piattaforma, primo avvio | `undefined` | `null` o `undefined` (incerto) |
| Test, kvStore vuoto | `undefined` | mai cambia |
| Test, kvStore seedato | `'hash...'` | mai cambia |

**Q2 — `if (globalPinHash === undefined)` è sempre vera al primo render?**  
Sì, **sempre**, sia in produzione che nei test. Al primo render sincrono `useKV` restituisce sempre `defaultValue = undefined`. La differenza è cosa succede **dopo**: in produzione arriva un aggiornamento asincrono; nei test non arriva mai.

**Q3 — `hasInitialized` impostato durante la fase undefined?**  
No. Il guard `=== undefined` viene valutato **prima** di `hasInitialized.current = true`. Se il flusso entra nel guard e ritorna, `hasInitialized` resta `false`. Questo non è il problema attuale. Il problema è che nel test il flusso non supera **mai** il guard.

**Q4 — `isAuthenticatedRef.current` (menzionato nella richiesta):**  
Questo riferimento **non esiste** nel codice corrente di `AuthContext.tsx`. Non c'è nessun `isAuthenticatedRef`. Lo stato `isAuthenticated` è gestito come `useState(false)` senza ref. Questa condizione non è un fattore di blocco.

**Q5 — `openAuthDialog` chiamata con valore reale o intermedio?**  
La funzione `openAuthDialog` **non esiste** nel codice corrente. L'apertura avviene direttamente tramite `setShowPinDialog(true)` nell'useEffect. Il valore di `globalPinHash` al momento della chiamata è quello del render corrente (il valore già risolto dal KV, mai `undefined` grazie al guard).

---

## 5. Perché i Tentativi Precedenti Non Hanno Risolto

### Tentativo 0 — Codice originale (`default=''`, deps `[]`)

**Il problema:** `globalPinHash = ''` (default sincrono, falsy). L'effect con `[]` esegue una volta sola al mount con `''` → sempre setup mode → sovrascrive il PIN.

**Perché non funzionava:** Dipendenza `[]` impedisce la riesecuzione dopo la risoluzione KV.

### Tentativo 1 — P23: `default=undefined`, guard `=== undefined`, deps `[globalPinHash]`

**L'intento:** Aspettare che KV consegni il valore reale prima di decidere setup/login.

**Perché non risolve il test:** Il mock di test è sincrono. Il guard `=== undefined` blocca l'effect e non c'è risoluzione asincrona che lo sblocchi.

**Perché non risolve completamente in produzione:** Se il KV serializza `undefined` come `undefined` (anziché `null`), il comportamento è identico al test: nessun re-render, dialog mai mostrato.

### Tentativo 2 — Bootstrap useEffect con `window.spark.kv.get` + branch `import.meta.env.MODE === 'test'`

**L'intento:** Forzare la transizione `undefined → ''` in test tramite `setGlobalPinHash('')` dentro un branch test-only.

**Perché è stato rimosso (23-FIX):** Codice test-specifico in produzione. La branch `MODE === 'test'` è una violazione del principio di separazione delle responsabilità. Inoltre, il `window.spark.kv.get` crea una doppia sorgente di verità con `useKV`: i due meccanismi possono entrare in conflitto.

**Perché creava race condition:** `setGlobalPinHash('')` veniva chiamato nel bootstrap, poi il KV reale poteva consegnare un valore diverso. `hasInitialized` veniva consumato sulla transizione `undefined → ''` (artificiale), non sulla transizione `undefined → valore reale` (autentica).

### Tentativo 3 — 23-FIX: Rimozione del bootstrap, solo guard `=== undefined`

**Stato attuale.** Corretto per il caso refresh con PIN salvato su piattaforma reale. Rotto per:
1. Primo avvio nel test (guard invalicabile)
2. Potenzialmente primo avvio su piattaforma se KV non converte `undefined → null`

**La tensione fondamentale irrisolta:** Ogni fix che usa `undefined` come sentinella di loading richiede che il mock simuli il comportamento asincrono della piattaforma reale. Questa simulazione non è mai stata implementata in `setup.ts`.

---

## 6. Analisi File Correlati

### `src/App.tsx` — Ordine provider

```tsx
function App() {
  return <AuthProvider>
    <AppDataProvider>
      <VisibleDataProvider>
        <AppContent />
      </VisibleDataProvider>
    </AppDataProvider>
  </AuthProvider>
}
```

`AuthProvider` è il provider più esterno. Monta prima di `AppDataProvider` e `VisibleDataProvider`. Non ci sono ritardi o condizionali nel montaggio. **Nessuna interferenza da provider order.**

### `src/components/AuthScreen.tsx` — Rendering condizionale

```tsx
export function AuthScreen() {
  const { showPinDialog, isSetupMode, handleGlobalPinSubmit } = useAuth()
  return (
    <>
      {/* ... */}
      <PinDialog
        open={showPinDialog}
        title={isSetupMode ? 'Imposta PIN Globale' : 'Inserisci PIN'}
        // ...
      />
    </>
  )
}
```

`AuthScreen` è renderizzato da `AppContent` solo quando `!isAuthenticated`:

```tsx
if (!isAuthenticated) return <AuthScreen />
```

Il flusso è: mount → `isAuthenticated = false` → `AuthScreen` sempre renderizzato → `PinDialog` con `open={showPinDialog}`. **Nessuna condizione nascosta che blocchi il render di AuthScreen o PinDialog.**

### `src/components/PinDialog.tsx` — Prop `open`

```tsx
<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
```

Il dialog di Radix UI è controllato completamente dalla prop `open`. Se `open=false`, il dialog non appare. Non ci sono condizioni interne che possano nasconderlo quando `open=true`. **Il dialog funziona correttamente; il problema è a monte, in AuthContext.**

### `src/lib/crypto.ts` — Interferenza async

`hashPin` e `verifyPin` sono funzioni `async` che usano `crypto.subtle`. Vengono chiamate **solo in risposta all'invio del form** (`handleGlobalPinSubmit`, `handlePrivatePinSubmit`), non durante l'inizializzazione. Non hanno nessuna interazione con il flusso di inizializzazione del dialog. **Nessuna interferenza con il flusso di startup.**

---

## 7. Soluzioni Possibili

### Soluzione A — Correggere il mock `useKV` per simulare il comportamento asincrono

**Descrizione:** Modificare `src/test/setup.ts` per far sì che il mock aggiorni `globalPinHash` in modo asincrono, simulando la risoluzione del KV store.

```tsx
// setup.ts — mock useKV modificato
useKV: (key: string, defaultValue: unknown) => {
  const [value, setValue] = useState<unknown>(undefined) // ← sempre undefined al mount

  useEffect(() => {
    // simula la risoluzione asincrona del KV
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
    setValue((current) => {
      const resolved = typeof nextValue === 'function'
        ? (nextValue as Function)(current)
        : nextValue
      const cloned = cloneValue(resolved)
      kvStore.set(key, cloned)
      return cloned
    })
  }
  return [value, setStoredValue]
}
```

**Pro:**
- AuthContext.tsx non viene toccato
- Il mock simula fedelmente il comportamento della piattaforma reale
- La transizione `undefined → valore` avviene in un micro-task, come in produzione

**Contro:**
- Tutti i test che usano `getByText` invece di `findByText` devono diventare `await findByText` (async)
- Il test 01-app-renders.test.tsx deve diventare `async` con `await screen.findByText(...)`
- Richiede revisione di tutti i test smoke

**Compatibilità con il codice attuale di AuthContext:** ✅ Piena. Il guard `=== undefined` funzionerebbe correttamente.

---

### Soluzione B — Usare `null` come sentinella (anziché `undefined`) + mock aggiornato

**Descrizione:** Cambiare il tipo della KV a `string | null` con default `null`. Il vantaggio è che `null` è serializzabile in JSON (`JSON.stringify(null) = "null"`) e quindi la piattaforma Spark lo gestisce in modo prevedibile.

```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string | null>('global-pin-hash', null)
// ...
useEffect(() => {
  if (globalPinHash === null) return   // guard: KV non caricato
  if (hasInitialized.current) return
  hasInitialized.current = true
  if (!globalPinHash) {
    setIsSetupMode(true)
  }
  setShowPinDialog(true)
}, [globalPinHash])
```

**Pro:**
- `null` è serializzabile in JSON: la piattaforma Spark gestisce la transizione `null → null` (nessun re-render superfluo) vs `null → hash` (re-render corretto) in modo affidabile
- Elimina l'incognita su come il KV gestisce `undefined` al primo avvio
- Risolve VARIANTE A definitivamente su piattaforma reale

**Contro:**
- Da sola non risolve i test: il mock sincrono restituirebbe `null` definitivamente → stesso problema con `=== null`
- Richiede comunque un fix al mock (come Soluzione A) per fare funzionare i test
- Il tipo `string | null` si propaga a chi usa `globalPinHash` (type narrowing richiesto)

**Compatibilità con il codice attuale di AuthContext:** Richiede modifica del type e del guard.

---

### Soluzione C — Leggere il KV direttamente in useEffect tramite `window.spark.kv.get`

**Descrizione:** Sostituire la dipendenza da `useKV` per l'inizializzazione con una lettura diretta tramite `window.spark.kv.get`. L'effect è one-shot con `[]` e non dipende dal ciclo asincrono di `useKV`.

```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)
// ...
const hasInitialized = useRef(false)

useEffect(() => {
  if (hasInitialized.current) return
  hasInitialized.current = true
  let cancelled = false

  window.spark.kv.get('global-pin-hash').then((storedHash: string | undefined) => {
    if (cancelled) return
    if (!storedHash) {
      setIsSetupMode(true)
    }
    setShowPinDialog(true)
  })

  return () => { cancelled = true }
}, [])
```

**Il mock in setup.ts già definisce `window.spark.kv.get`** come:
```tsx
get: vi.fn(async () => undefined),
```

Nei test, `get` restituisce `undefined` → primo avvio → setup mode → `setShowPinDialog(true)`. Per testare il login con PIN esistente, il test può sovrascrivere il mock:
```tsx
sparkKvMock.get.mockResolvedValueOnce('hash...')
```

**Pro:**
- Ignora completamente il ciclo di vita asincrono di `useKV` per l'inizializzazione
- Funziona correttamente sia in produzione che nei test (il mock `window.spark.kv.get` è già presente)
- Guard semplice: un solo `useRef` one-shot, nessuna sentinella `undefined/null`
- Nessun race condition: l'effect è `[]`, esegue una sola volta

**Contro:**
- Duplicazione parziale della logica di accesso al KV (sia `useKV` che `window.spark.kv.get`)
- `window.spark.kv.get` e `useKV` sono sorgenti separate: `useKV` potrebbe aggiornare `globalPinHash` in seguito (es. dopo cambio PIN), ma `hasInitialized = true` previene la riesecuzione → corretto
- Richiede che il test usi `await waitFor(...)` o `await screen.findByText(...)` per aspettare la promessa

**Compatibilità con il codice attuale:** Richiede sostituzione dell'useEffect. `useKV` rimane per la gestione del PIN dopo il login (cambio, lettura). Solo l'inizializzazione viene delegata a `window.spark.kv.get`.

---

### Soluzione D — `useKV` con loading state esplicito (wrapper custom)

**Descrizione:** Creare un hook `useKVWithReady` che combina `useKV` con un flag `isReady`, settato a `true` solo dopo la prima risoluzione.

```tsx
function useKVWithReady<T>(key: string, defaultValue: T) {
  const [value, setValue] = useKV<T>(key, defaultValue)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Dopo il montaggio, il KV si risolve entro un micro-task
    // questo setTimeout(0) garantisce che isReady venga settato dopo che useKV ha aggiornato value
    const timer = setTimeout(() => setIsReady(true), 0)
    return () => clearTimeout(timer)
  }, [])

  return [value, setValue, isReady] as const
}
```

**Pro:**
- Separa nettamente "KV caricato" da "valore del KV"
- Riutilizzabile in altri contesti (privatePinHash, ecc.)
- Non richiede modifiche al mock

**Contro:**
- `setTimeout(0)` è un euristica fragile: non garantisce che `useKV` abbia già aggiornato il valore prima che `isReady` diventi `true`
- Aggiunge complessità architetturale
- Il timeout potrebbe causare flash di contenuto in produzione

---

### Tabella Riassuntiva

| Soluzione | Tocca AuthContext? | Tocca setup.ts? | Risolve test? | Risolve prod? | Complessità |
|---|---|---|---|---|---|
| A — Mock async | No | Sì | ✅ | ✅ | Media |
| B — `null` sentinel + A | Sì (minimo) | Sì | ✅ (con A) | ✅✅ | Media |
| C — `window.spark.kv.get` | Sì | No | ✅ | ✅ | Bassa |
| D — Hook custom | Sì | No | ⚠️ fragile | ⚠️ fragile | Alta |

---

## 8. Conclusione

### Causa radice in una frase

Il guard `if (globalPinHash === undefined) return` è corretto per la piattaforma reale ma è invalicabile nei test perché il mock di `useKV` in `setup.ts` è **sincrono** e restituisce `undefined` in modo definitivo, senza mai simulare la transizione asincrona al valore reale.

### Perché i fix hanno oscillato tra VARIANTE A e VARIANTE B

- **VARIANTE A** (setup mode su refresh): si manifesta quando l'effect legge un valore falsy (`''` o `null`) che viene consegnato prima dell'hash reale, consumando `hasInitialized` nel momento sbagliato.
- **VARIANTE B** (dialog mai mostrato): si manifesta quando il guard `=== undefined` blocca l'effect prima che il valore reale arrivi (o non arriva mai, come nel test).

Ogni tentativo di correggere una variante ha reintrodotto l'altra, perché la vera causa — il disallineamento sincrono/asincrono tra mock e piattaforma — non è mai stata affrontata direttamente.

### Raccomandazione

**Soluzione C** (lettura diretta via `window.spark.kv.get` in useEffect `[]`) è la più immediata e non richiede modifiche al mock. È adeguata se si accetta di avere due meccanismi di accesso al KV.

**Combinazione A+B** (mock asincrono + sentinel `null`) è la più robusta architetturalmente: allinea il comportamento del mock a quello della piattaforma e usa un tipo serializzabile in modo affidabile.

---

*Fine report — nessuna modifica al codice applicata*
