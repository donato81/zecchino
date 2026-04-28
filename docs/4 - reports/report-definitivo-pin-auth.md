# Report Definitivo — Autenticazione PIN

**Data:** 28 aprile 2026
**Branch:** `refactoring-architettura`
**Tipo:** Sola lettura — analisi diagnostica e progetto soluzione
**Bug:** BUG-01 (terzo ciclo di analisi)
**Riferimenti:**
- [report-diagnostico-bug-pre-merge.md](report-diagnostico-bug-pre-merge.md)
- [report-diagnostico-pin-approfondito.md](report-diagnostico-pin-approfondito.md)

---

## Indice

1. [Macchina a stati dell'autenticazione](#1-macchina-a-stati-dellautenticazione)
2. [Verifica dei quattro scenari (stato attuale)](#2-verifica-dei-quattro-scenari-stato-attuale)
3. [Progetto della soluzione definitiva](#3-progetto-della-soluzione-definitiva)
4. [Impatto sui test esistenti](#4-impatto-sui-test-esistenti)
5. [Garanzia di stabilità](#5-garanzia-di-stabilità)

---

## 1. Macchina a Stati dell'Autenticazione

L'autenticazione globale è una macchina a quattro stati. Tre transizioni interne
sono guidate dal sistema (KV + bootstrap), una è guidata dall'utente (submit PIN).

```
                ┌──────────────────┐
                │     LOADING      │  ← stato iniziale al mount
                │  (KV non letto)  │
                └────────┬─────────┘
                         │ T1: lettura KV completata
                         │     (decisione setup vs login)
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
      ┌───────────────┐     ┌───────────────┐
      │  READY_SETUP  │     │  READY_LOGIN  │
      │  (no hash)    │     │  (hash noto)  │
      └───────┬───────┘     └───────┬───────┘
              │                     │
              │ T2a: utente crea    │ T2b: utente inserisce
              │      PIN valido     │      PIN corretto
              │                     │
              └──────────┬──────────┘
                         ▼
                ┌──────────────────┐
                │ AUTHENTICATED    │  ← AppContent renderizza la dashboard
                └──────────────────┘
```

### 1.1 — Variabili di stato per ogni transizione

| Transizione | Innesco | Variabili impostate | File |
|---|---|---|---|
| **T1 → READY_SETUP** | KV restituisce `undefined`/falsy per `global-pin-hash` | `isSetupMode = true`, `showPinDialog = true`, `isAuthReady = true` | `src/context/AuthContext.tsx` |
| **T1 → READY_LOGIN** | KV restituisce hash valido per `global-pin-hash` | `isSetupMode = false`, `showPinDialog = true`, `isAuthReady = true` | `src/context/AuthContext.tsx` |
| **T2a (setup → auth)** | Submit `PinDialog` in `confirmMode`, hash equality | `setGlobalPinHash(hash)`, `isAuthenticated = true`, `showPinDialog = false`, `isSetupMode = false` | `AuthContext.handleGlobalPinSubmit` |
| **T2b (login → auth)** | Submit `PinDialog`, `verifyPin` ok | `isAuthenticated = true`, `showPinDialog = false` | `AuthContext.handleGlobalPinSubmit` |

### 1.2 — Chi osserva quali variabili

| Variabile | Letta da | Usata per |
|---|---|---|
| `isAuthenticated` | `App.AppContent` | `if (!isAuthenticated) return <AuthScreen />` |
| `showPinDialog` | `AuthScreen` | prop `open` di `PinDialog` |
| `isSetupMode` | `AuthScreen` | titolo + `confirmMode` di `PinDialog` |
| `isAuthReady` *(nuova)* | **solo `AuthContext`** | gate interno della transizione T1 |

`isAuthReady` resta confinato dentro `AuthContext`. I componenti visivi non lo
vedono mai: questo soddisfa il vincolo "no modifiche a `AuthScreen`/`PinDialog`".
Dal punto di vista di `AuthScreen` la differenza tra `LOADING` e gli stati ready
si manifesta come `showPinDialog === false` — esattamente lo stesso valore già
usato oggi per "dialog non visibile".

---

## 2. Verifica dei Quattro Scenari (stato attuale)

Stato attuale del codice — `src/context/AuthContext.tsx` (righe 49–57):

```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)
// ...
useEffect(() => {
  if (globalPinHash === undefined) return
  if (hasInitialized.current) return
  hasInitialized.current = true
  if (!globalPinHash) setIsSetupMode(true)
  setShowPinDialog(true)
}, [globalPinHash])
```

Stato attuale del mock — `src/test/setup.ts` (righe 22–47):

```tsx
useKV: (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    if (kvStore.has(key)) return cloneValue(kvStore.get(key))
    const initialValue = cloneValue(defaultValue)  // structuredClone(undefined) = undefined
    kvStore.set(key, initialValue)
    return initialValue                             // ← sincrono, definitivo
  })
  // ...
}
sparkKvMock = { get: vi.fn(async () => undefined), ... }
```

### 2.1 — Scenario A: Primo avvio reale (KV piattaforma vuoto)

| Render | `globalPinHash` | Effect | Stato risultante |
|---|---|---|---|
| 1 (sync) | `undefined` (default useKV) | guard `=== undefined` → return | `LOADING` |
| 2 (async, dopo risoluzione KV) | `null` o `undefined` (dipende da serializzazione Spark) | se `null`: setSetup+setShow → `READY_SETUP` ✓ se `undefined`: guard return → `LOADING` ✗ | **incognita** |

**Esito:** non deterministico. Dipende da come la piattaforma Spark serializza
`undefined` su una chiave inesistente.

### 2.2 — Scenario B: Refresh reale con PIN salvato

| Render | `globalPinHash` | Effect | Stato risultante |
|---|---|---|---|
| 1 (sync) | `undefined` | guard return | `LOADING` |
| 2 (async) | `'abc123...'` | `!globalPinHash`=false → `setShowPinDialog(true)` | `READY_LOGIN` ✓ |

**Esito:** corretto.

### 2.3 — Scenario C: Test con KV vuoto

| Render | `globalPinHash` | Effect | Stato risultante |
|---|---|---|---|
| 1 (sync) | `undefined` (cloneValue(undefined)) | guard return | `LOADING` |
| 2+ | mai cambia (mock 100% sincrono, no transizione asincrona) | mai eseguito | `LOADING` ∞ |

**Esito:** ROTTO. Test 01 fallisce perché `screen.getByText(/Imposta PIN Globale/i)`
non trova mai il dialog. **VARIANTE B sistematica.**

### 2.4 — Scenario D: Test con KV seedato

| Render | `globalPinHash` | Effect | Stato risultante |
|---|---|---|---|
| 1 (sync) | `'hash...'` (da `seedTestKvStore`) | `!globalPinHash`=false → `setShowPinDialog(true)` | `READY_LOGIN` ✓ |

**Esito:** corretto. Funziona perché il valore è pre-seed prima del mount.

### 2.5 — Tabella riassuntiva (stato attuale)

| Scenario | Esito | Stato finale | Variante bug |
|---|---|---|---|
| A — Primo avvio reale | ⚠️ incerto | `READY_SETUP` o `LOADING` | possibile B |
| B — Refresh reale (PIN noto) | ✅ ok | `READY_LOGIN` | nessuna |
| C — Test KV vuoto | ❌ rotto | `LOADING` ∞ | **B (sistematica)** |
| D — Test KV seedato | ✅ ok | `READY_LOGIN` | nessuna |

---

## 3. Progetto della Soluzione Definitiva

### 3.1 — Principio architetturale

La radice del problema è che `useKV` viene usato come **due cose insieme**:

1. **Sorgente di verità asincrona** per il valore persistente del PIN.
2. **Sentinella di "loading"** tramite il valore `undefined`.

Queste due responsabilità vanno separate. La soluzione introduce uno stato di
caricamento esplicito (`isAuthReady`) e demanda la **decisione iniziale**
(setup vs login) a una lettura asincrona diretta del KV via `window.spark.kv.get`,
che è una API contrattualmente asincrona, ben definita, **già mockata** in
`setup.ts` e indipendente dal ciclo di vita interno di `useKV`.

`useKV` resta in `AuthContext` ma ha un solo ruolo: persistere il PIN al cambio
(setup, cambio futuro). La sua eventuale risoluzione asincrona post-mount non
influenza più la macchina a stati di inizializzazione.

### 3.2 — Modifiche file per file

#### File 1 — `src/context/AuthContext.tsx`

**Cosa cambia:**

```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
const [privatePinHash, setPrivatePinHash] = useKV<string>('private-pin-hash', '')

const [isAuthenticated, setIsAuthenticated] = useState(false)
const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false)
const [isSetupMode, setIsSetupMode] = useState(false)
const [showPinDialog, setShowPinDialog] = useState(false)
const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)
const [isAuthReady, setIsAuthReady] = useState(false)   // ← NUOVO

const screenReader = useScreenReader()

// Bootstrap one-shot della macchina a stati di autenticazione.
// Indipendente dal ciclo di vita di useKV: legge il KV direttamente
// e classifica la sessione come setup o login.
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

**Cosa viene rimosso:**
- Il guard `if (globalPinHash === undefined) return`.
- Il guard `if (hasInitialized.current) return` e il `useRef`.
- La dipendenza `[globalPinHash]` dell'effect.

**Cosa viene cambiato sul tipo di `useKV`:**
- `useKV<string | undefined>('global-pin-hash', undefined)` → `useKV<string>('global-pin-hash', '')`.
  Ritorno al tipo non-opzionale: il ruolo di sentinella di loading è ora svolto
  da `isAuthReady`, non più dal valore `undefined`.

**Perché risolve in questo file:**
- Il bootstrap è ora **deterministico**: una sola lettura `await` decide il ramo.
  Non c'è più dipendenza dal numero di re-render di `useKV` né dal modo in cui
  Spark serializza `undefined`.
- `isAuthReady = true` viene impostato **dopo** la decisione, garantendo che la
  sequenza `setIsSetupMode → setShowPinDialog → setIsAuthReady` sia atomica
  rispetto al consumatore esterno (React batcha gli `setState` dentro lo stesso
  microtask asincrono).
- Nessuna race tra il valore "stale" di `useKV` (sincrono, default `''`) e il
  valore reale del KV: il bootstrap non legge `globalPinHash` di React, legge
  direttamente il KV.
- `handleGlobalPinSubmit` continua a usare `globalPinHash` da `useKV` per la
  verifica login: per il momento in cui l'utente digita e submitta il PIN
  (secondi), `useKV` ha già risolto la sua lettura asincrona e `globalPinHash`
  contiene l'hash corretto.

**Esposizione opzionale di `isAuthReady`:**

Aggiungere `isAuthReady` al `value` del provider è facoltativo. Non è
necessario per la correttezza visiva (i componenti visivi continuano a usare
solo `showPinDialog`/`isSetupMode`). Se si vuole abilitare in futuro un
indicatore di caricamento, è già pronto. Per rispettare il vincolo "no
modifiche ai componenti visivi", **non lo si espone** nella prima versione.

---

#### File 2 — `src/test/setup.ts`

**Cosa cambia (singola riga, mock di `window.spark.kv.get`):**

```tsx
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

**Perché è necessario:**

- Il bootstrap di `AuthContext` chiama `window.spark.kv.get('global-pin-hash')`.
  Il mock attuale restituisce **sempre** `undefined`, ignorando il `kvStore`.
  Conseguenza: in test seedati con un hash, il bootstrap non lo troverebbe e
  classificherebbe la sessione come setup.
- Allineare `get`/`set` al `kvStore` rende il mock **coerente**: tanto `useKV`
  quanto `window.spark.kv` leggono e scrivono dalla stessa mappa, esattamente
  come la piattaforma reale.
- Il mock di `useKV` **non viene toccato**: il ciclo di vita di `useKV` non è
  più rilevante per la decisione di bootstrap, quindi non serve simulare la
  risoluzione asincrona di useKV.

**Comportamento risultante:**
- `await window.spark.kv.get(key)` risolve in un microtask. React batcha gli
  `setState` post-await in un re-render. Il dialog appare dopo `findByText`,
  non `getByText`.

#### Riepilogo modifiche

| File | Tipo modifica | Effetto |
|---|---|---|
| `src/context/AuthContext.tsx` | Refactor del `useEffect` di bootstrap, aggiunta `isAuthReady`, ripristino tipo `useKV<string>` | Decisione setup/login deterministica e disaccoppiata da `useKV` |
| `src/test/setup.ts` | `sparkKvMock.get`/`set` leggono e scrivono nel `kvStore` | Mock coerente piattaforma↔test |

Nessun altro file applicativo richiede modifiche. `AuthScreen.tsx`,
`PinDialog.tsx`, `App.tsx`, `AppDataContext.tsx`, `VisibleDataContext.tsx`,
`useAppShortcuts.ts` restano invariati.

---

## 4. Impatto sui Test Esistenti

Con il bootstrap asincrono, il dialog non appare nel render iniziale ma in un
microtask successivo. Tutti i test che verificano la prima apparizione del
dialog devono diventare asincroni e usare `findBy*` invece di `getBy*`.

### 4.1 — Tabella impatto

| File | Modifica richiesta | Note |
|---|---|---|
| `src/test/smoke/01-app-renders.test.tsx` | `it(..., async () => { ... })`; sostituire `screen.getByText(/Imposta PIN Globale/i)` con `await screen.findByText(/Imposta PIN Globale/i)`; sostituire `screen.getByRole('dialog')` con `await screen.findByRole('dialog')`. La query `document.querySelector([role="main"]...)` resta valida (il main è renderizzato sincrono). | Conversione minima a async. |
| `src/test/smoke/test-utils.ts` (helper `authenticateWithPin`) | Sostituire `screen.getByLabelText(/Nuovo PIN/i)` con `await screen.findByLabelText(/Nuovo PIN/i)` per la **prima** query (gli altri campi del dialog appaiono nello stesso render del primo, quindi `getByLabelText` resta valido per "Conferma PIN"). | Beneficio a cascata su 02–05. |
| `src/test/smoke/02-authentication.test.tsx` | Nessuna modifica diretta — già `async` e usa `authenticateWithPin` aggiornato. | — |
| `src/test/smoke/03-dashboard-tab.test.tsx` | Nessuna modifica diretta — usa `authenticateWithPin`. | — |
| `src/test/smoke/04-transactions-tab.test.tsx` | Nessuna modifica diretta — usa `authenticateWithPin`. | — |
| `src/test/smoke/05-private-account.test.tsx` | Nessuna modifica diretta sul flusso login (il dialog appare async, ma `authenticateWithPin` usa già `findByText` per "I Tuoi Conti"). Verificare che `screen.getByText(/Crea PIN Conto Privato/i)` sia ancora sincrono al momento della chiamata: lo è, perché viene chiamato dopo l'apertura esplicita del dialog privato. | — |

### 4.2 — Patch concettuali

**`01-app-renders.test.tsx`:**

```tsx
it('dovrebbe mostrare la schermata di autenticazione al mount', async () => {
  renderApp()
  const authMain = document.querySelector('[role="main"][aria-label*="Schermata di autenticazione"]')
  expect(authMain).not.toBeNull()
  await screen.findByRole('dialog')
  await screen.findByText(/Imposta PIN Globale/i)
  screen.getByText(/Crea un PIN per proteggere l'applicazione/i)
})
```

**`test-utils.ts` (helper):**

```tsx
export async function authenticateWithPin(user, pin = '1234') {
  const pinField = await screen.findByLabelText(/Nuovo PIN/i)   // ← findBy
  await user.type(pinField, pin)
  const confirmField = screen.getByLabelText(/Conferma PIN/i)
  await user.type(confirmField, pin)
  const confirmButton = screen.getByRole('button', { name: /Conferma/i })
  await user.click(confirmButton)
  await screen.findByText(/I Tuoi Conti/i)
}
```

Tutti gli altri test ereditano automaticamente la correzione tramite l'helper.
Nessun altro file di test ha riferimenti diretti al dialog di autenticazione
nel render iniziale.

---

## 5. Garanzia di Stabilità

Verifica che la macchina a stati con la soluzione applicata non possa
oscillare tra VARIANTE A e VARIANTE B in nessuno dei quattro scenari.

### 5.1 — Scenario A: Primo avvio reale (KV piattaforma vuoto)

| Step | Azione | Stato |
|---|---|---|
| 1 | Mount `AuthProvider` | `LOADING` (`isAuthReady=false`, `showPinDialog=false`) |
| 2 | Bootstrap effect parte | sospeso su `await window.spark.kv.get(...)` |
| 3 | Spark restituisce `undefined` (chiave inesistente) | — |
| 4 | `!storedHash` true → `setIsSetupMode(true)`; `setShowPinDialog(true)`; `setIsAuthReady(true)` | `READY_SETUP` ✓ |
| 5 | `AuthScreen` re-render → `<PinDialog open={true} title="Imposta PIN Globale" confirmMode={true} />` | dialog visibile, **VARIANTE A evitata** |

### 5.2 — Scenario B: Refresh reale (PIN salvato)

| Step | Azione | Stato |
|---|---|---|
| 1 | Mount | `LOADING` |
| 2 | Bootstrap effect parte | sospeso |
| 3 | Spark restituisce `'abc123...'` | — |
| 4 | `!storedHash` false → `setShowPinDialog(true)`; `setIsAuthReady(true)` | `READY_LOGIN` ✓ |
| 5 | `AuthScreen` re-render → `<PinDialog open={true} title="Inserisci PIN" confirmMode={false} />` | dialog login visibile, **VARIANTE A evitata** |
| 6 | Utente submit → `handleGlobalPinSubmit('1234')` → `verifyPin('1234', globalPinHash)` | `globalPinHash` è già stato risolto da `useKV` nel frattempo (microtask anteriore al click utente) → verifica ok → `AUTHENTICATED` |

### 5.3 — Scenario C: Test con KV vuoto

| Step | Azione | Stato |
|---|---|---|
| 1 | `renderApp()` resetta `kvStore` | — |
| 2 | Mount | `LOADING` |
| 3 | Bootstrap effect parte | sospeso su `await window.spark.kv.get('global-pin-hash')` |
| 4 | Mock restituisce `undefined` (kvStore vuoto) | — |
| 5 | `setIsSetupMode(true)`; `setShowPinDialog(true)`; `setIsAuthReady(true)` | `READY_SETUP` ✓ |
| 6 | `await screen.findByText(/Imposta PIN Globale/i)` | risolve → test passa ✓ |

**VARIANTE B evitata:** lo `await` del mock restituisce in un microtask;
React esegue il re-render; `findByText` aspetta proprio questo.

### 5.4 — Scenario D: Test con KV seedato

| Step | Azione | Stato |
|---|---|---|
| 1 | `renderApp({ initialKv: { 'global-pin-hash': 'hash...' } })` | kvStore popolato |
| 2 | Mount | `LOADING` |
| 3 | Bootstrap effect parte | sospeso |
| 4 | Mock `get` restituisce `'hash...'` (lookup `kvStore.get`) | — |
| 5 | `setShowPinDialog(true)`; `setIsAuthReady(true)` | `READY_LOGIN` ✓ |

### 5.5 — Tabella riassuntiva (con soluzione)

| Scenario | Esito | Stato finale | Variante A possibile? | Variante B possibile? |
|---|---|---|---|---|
| A — Primo avvio reale | ✅ | `READY_SETUP` | No | No |
| B — Refresh reale (PIN noto) | ✅ | `READY_LOGIN` | No | No |
| C — Test KV vuoto | ✅ | `READY_SETUP` | No | No |
| D — Test KV seedato | ✅ | `READY_LOGIN` | No | No |

### 5.6 — Argomento di stabilità

La soluzione non può oscillare perché:

1. **Sorgente unica per la decisione iniziale.** Solo `window.spark.kv.get`
   determina il ramo setup/login. `useKV` non partecipa più. Eliminata la
   classe di bug "due sorgenti, due tempistiche".

2. **Effetto one-shot intrinsecamente.** L'`useEffect` ha `deps=[]` ed è
   l'unico modo di transizione T1. Non ci sono altre vie per impostare
   `showPinDialog=true` o `isSetupMode=true` durante il bootstrap. Il flag
   `cancelled` previene impostazioni post-unmount in test concorrenti.

3. **Sentinella di loading semantica, non valoriale.** `isAuthReady` è un
   `boolean` distinto dal valore del PIN: nessuna ambiguità tra "non caricato"
   e "caricato vuoto". Elimina la classe di bug "valore falsy interpretato
   come loading".

4. **Mock allineato per contratto.** `sparkKvMock.get/set` operano sullo
   stesso `kvStore` di `useKV`: i test simulano fedelmente le due API
   coordinate. Non esiste più la divergenza di comportamento tra mock e
   piattaforma reale che ha causato l'oscillazione storica.

5. **Vincolo "no modifiche visive" rispettato.** `AuthScreen` continua a
   leggere `showPinDialog`/`isSetupMode`. Nello stato `LOADING` vede
   `showPinDialog=false` (esattamente come "dialog chiuso"), comportamento
   già supportato. Nessuna nuova prop, nessuna nuova condizione di render.

6. **Compatibilità con la piattaforma reale.** Il bootstrap usa solo
   `window.spark.kv.get`, una API documentata e stabile dell'SDK Spark.
   Indipendente da come `useKV` gestisce internamente la sentinella
   `undefined → null`.

---

*Fine report — nessuna modifica al codice applicata. L'implementazione segue
in fase Code, secondo il workflow standard SCF.*
