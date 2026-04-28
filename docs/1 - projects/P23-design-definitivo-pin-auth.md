# P23 — Design definitivo BUG-01: bootstrap asincrono `AuthContext` + mock allineato

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.
> Pacchetto: 23 (revisione definitiva — sostituisce P23 e P23-fix-auth-pin-combinazione-AB)
> Bug di riferimento: BUG-01 — `docs/4 - reports/report-definitivo-pin-auth.md`
> Data: 28 aprile 2026
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Intestazione

| Campo | Valore |
|---|---|
| **Bug ID** | BUG-01 |
| **Severità** | Bloccante |
| **Segnalato in** | `docs/4 - reports/report-diagnostico-bug-pre-merge.md` — Sezione 1 |
| **Analisi definitiva in** | `docs/4 - reports/report-definitivo-pin-auth.md` — fonte esclusiva per questo design |
| **File modificati** | `src/context/AuthContext.tsx`, `src/test/setup.ts`, `src/test/smoke/01-app-renders.test.tsx`, `src/test/smoke/test-utils.ts` |
| **File invariati** | Tutti gli altri — in particolare `AuthScreen.tsx`, `PinDialog.tsx`, `App.tsx`, `AppDataContext.tsx`, `VisibleDataContext.tsx` |
| **Branch** | `refactoring-architettura` |
| **Data** | 28 aprile 2026 |
| **Tipo di intervento** | Bugfix — nessun refactoring, nessuna nuova feature |
| **Documenti resi obsoleti** | `docs/1 - projects/P23-auth-context-pin-persistence-bugfix-design.md`, `docs/1 - projects/P23-fix-auth-pin-combinazione-AB.md` |

**I documenti P23 e P23-fix-auth-pin-combinazione-AB sono da considerarsi obsoleti e non devono essere utilizzati come riferimento per alcuna operazione di codice. Il presente documento li sostituisce integralmente.**

---

## 2. Perché P23 e P23-fix non sono sufficienti

I tentativi precedenti (P23 e P23-fix) hanno oscillato tra due manifestazioni dello stesso bug: **VARIANTE A** (dialog setup appare al refresh al posto del dialog login) e **VARIANTE B** (nessun dialog appare affatto). La causa comune è un **disallineamento architetturale** che quei design non hanno mai affrontato alla radice.

Il codice di P23 usa `undefined` come sentinella di "KV non ancora caricato" e blocca l'effect di bootstrap con `if (globalPinHash === undefined) return`. Questo guard è corretto sulla piattaforma reale (dove il KV risolve in modo asincrono), ma è **invalicabile** nel mock dei test: `useKV` nel mock è sincrono e restituisce `undefined` in modo definitivo, senza mai simulare la transizione al valore reale. Risultato: nel test con KV vuoto (scenario primo avvio), il dialog non appare mai — VARIANTE B sistematica.

P23-fix ha tentato di correggere il mock introducendo rami `MODE === 'test'` nel codice di produzione, producendo una doppia sorgente di verità e race condition — che portavano a VARIANTE A.

La diagnosi definitiva (sezione 3.1 del report) è: `useKV` svolge due ruoli incompatibili — fonte di verità asincrona del PIN e sentinella di loading. Separare questi ruoli è l'unica correzione stabile (sezione 3 del report).

---

## 3. Architettura della soluzione

### 3.1 Macchina a quattro stati

```
                ┌──────────────────┐
                │     LOADING      │  ← stato iniziale al mount
                │  (KV non letto)  │
                └────────┬─────────┘
                         │ T1: window.spark.kv.get('global-pin-hash') risolve
                         │     (bootstrap one-shot, deps=[])
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
                │  AUTHENTICATED   │  ← AppContent renderizza la dashboard
                └──────────────────┘
```

### 3.2 Tabella delle transizioni

| Transizione | Innesco | Variabili impostate | File |
|---|---|---|---|
| **T1 → READY_SETUP** | `window.spark.kv.get` restituisce falsy | `isSetupMode = true`, `showPinDialog = true`, `isAuthReady = true` | `AuthContext.tsx` |
| **T1 → READY_LOGIN** | `window.spark.kv.get` restituisce hash valido | `showPinDialog = true`, `isAuthReady = true` | `AuthContext.tsx` |
| **T2a setup → auth** | Submit `PinDialog` (`confirmMode=true`), hash creato | `globalPinHash = hash`, `isAuthenticated = true`, `showPinDialog = false`, `isSetupMode = false` | `AuthContext.handleGlobalPinSubmit` |
| **T2b login → auth** | Submit `PinDialog`, `verifyPin` ok | `isAuthenticated = true`, `showPinDialog = false` | `AuthContext.handleGlobalPinSubmit` |

### 3.3 Tabella delle variabili e dei loro osservatori

| Variabile | Letta da | Usata per |
|---|---|---|
| `isAuthenticated` | `App.AppContent` | `if (!isAuthenticated) return <AuthScreen />` |
| `showPinDialog` | `AuthScreen` | prop `open` di `PinDialog` |
| `isSetupMode` | `AuthScreen` | titolo e `confirmMode` di `PinDialog` |
| `isAuthReady` | **solo `AuthContext` internamente** | mai esposto — variabile di bootstrap privata |

`isAuthReady` non viene aggiunto all'interfaccia `AuthContextValue`. I componenti visivi non lo osservano. Dal loro punto di vista, lo stato `LOADING` si manifesta semplicemente come `showPinDialog === false` — valore già gestito correttamente.

---

## 4. Modifiche a `src/context/AuthContext.tsx`

### 4.1 Modifica import React

**Prima (riga 1):**
```tsx
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
```

**Dopo:**
```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
```

`useRef` viene rimosso perché l'unico suo utilizzo nel file era `const hasInitialized = useRef(false)`, che viene eliminato. `useState` e `useEffect` rimangono.

**Verifica preventiva obbligatoria:** prima di rimuovere `useRef` dall'import, l'agente deve confermare che nessun'altra riga di `AuthContext.tsx` contenga `useRef`. La ricerca nel file attuale conferma che `useRef` compare esattamente in due posizioni: riga 1 (import) e riga 46 (dichiarazione di `hasInitialized`). Nessun altro utilizzo. La rimozione è sicura.

### 4.2 Modifica tipo `useKV` per `globalPinHash`

**Prima (riga 37):**
```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)
```

**Dopo:**
```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
```

**Perché:** con il nuovo bootstrap, `useKV` non ha più il ruolo di sentinella di loading. Il valore `undefined` non ha più significato semantico — il tipo torna al più semplice `string` con default `''`. Questo elimina anche la propagazione del tipo `string | undefined` sull'interfaccia `AuthContextValue`.

### 4.3 Modifica interfaccia `AuthContextValue` (conseguenza della 4.2)

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

Il campo `globalPinHash` passa da `string | undefined` a `string`. Il tipo del setter perde il `?` opzionale dal parametro `prev` — il default `''` garantisce che `prev` sia sempre una stringa.

### 4.4 Sostituzione del blocco stato — rimozione `hasInitialized`, aggiunta `isAuthReady`

**Prima (righe 41–46):**
```tsx
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)

  const hasInitialized = useRef(false)
```

**Dopo:**
```tsx
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)
  const [isAuthReady, setIsAuthReady] = useState(false)
```

`hasInitialized` viene rimosso interamente. `isAuthReady` viene inserito al suo posto: è uno stato React (`useState`) e non un ref, perché non deve persistere tra re-render ma deve essere letto come flag di completamento del bootstrap.

### 4.5 Sostituzione integrale del `useEffect` di inizializzazione

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

**Spiegazione riga per riga:**

| Riga | Scopo |
|---|---|
| `let cancelled = false` | Flag di cancellazione per cleanup sicuro in caso di unmount prematuro del provider (rilevante in test concorrenti) |
| `;(async () => { ... })()` | IIFE async — permette l'uso di `await` dentro un `useEffect` che non può essere `async` direttamente |
| `await window.spark.kv.get('global-pin-hash')` | Lettura diretta e contrattualmente asincrona del KV; questa è la **sola** sorgente della decisione setup/login |
| `as string \| undefined` | Cast esplicito — il tipo generico di `window.spark.kv.get` restituisce `unknown`; il cast chiarisce l'intento |
| `if (cancelled) return` | Se il provider è stato unmontato mentre aspettavamo la promessa, non impostare stato su un componente smontato |
| `if (!storedHash)` | Hash assente (primo avvio) o stringa vuota → setup mode |
| `setShowPinDialog(true)` | Sempre: che sia setup o login, il dialog deve aprirsi |
| `setIsAuthReady(true)` | Segnala il completamento del bootstrap — impostato per ultimo, dopo le decisioni di stato |
| `return () => { cancelled = true }` | Cleanup dell'effect: imposta `cancelled` quando il componente viene smontato |
| `}, [])` | Deps vuoto — l'effect è one-shot, si esegue una sola volta al mount |

### 4.6 Riepilogo completo modifiche a `AuthContext.tsx`

| # | Tipo | Posizione | Descrizione |
|---|---|---|---|
| M1 | Modifica import | Riga 1 | Rimuovere `useRef` dall'import React |
| M2 | Modifica dichiarazione | Riga 37 | `useKV<string \| undefined>('global-pin-hash', undefined)` → `useKV<string>('global-pin-hash', '')` |
| M3 | Modifica interfaccia | Righe 10–11 | `globalPinHash: string \| undefined` → `string`; setter `prev?` → `prev` |
| M4 | Rimozione | Riga 46 | `const hasInitialized = useRef(false)` — eliminata |
| M5 | Aggiunta | Dopo riga 45 | `const [isAuthReady, setIsAuthReady] = useState(false)` |
| M6 | Sostituzione | Righe 49–57 | useEffect di inizializzazione completamente riscritto con bootstrap asincrono |
| **Nessuna altra modifica** | — | — | `handleGlobalPinSubmit`, `handlePrivatePinSubmit`, il JSX del provider e tutti gli altri state rimangono invariati |

---

## 5. Modifiche a `src/test/setup.ts`

### 5.1 Modifica `sparkKvMock`

**Prima (righe 49–53):**
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

### 5.2 Differenze riga per riga

| Funzione | Prima | Dopo | Motivazione |
|---|---|---|---|
| `get` | Restituisce sempre `undefined` (ignora `kvStore`) | Legge dal `kvStore`; restituisce `undefined` solo se la chiave è assente | Il bootstrap di `AuthContext` chiama `window.spark.kv.get('global-pin-hash')`. Il mock precedente restituiva sempre `undefined`: nei test seedati con un hash, il bootstrap avrebbe classificato la sessione come setup. Ora `get` e `useKV` leggono dalla stessa mappa. |
| `set` | No-op (ignora `kvStore`) | Scrive nel `kvStore` con clone | Coerenza: `window.spark.kv.set` deve aggiornare la stessa sorgente letta da `get` e da `useKV`. |
| `keys` | Restituisce `[]` costante | Restituisce `Array.from(kvStore.keys())` | Coerenza: le chiavi rispecchiano lo stato reale del `kvStore`. |

### 5.3 Conferma esplicita: il mock `useKV` non viene toccato

Il blocco `vi.mock('@github/spark/hooks', () => ({ useKV: ... }))` alle righe 22–47 di `setup.ts` **non viene modificato**. Il ciclo di vita di `useKV` non è più rilevante per la decisione di bootstrap: il bootstrap legge direttamente `window.spark.kv.get`, non lo stato React di `useKV`. Nessuna simulazione asincrona è necessaria per `useKV`.

### 5.4 Riepilogo modifiche a `setup.ts`

| # | Tipo | Posizione | Descrizione |
|---|---|---|---|
| M1 | Modifica `sparkKvMock.get` | Riga 50 | Da `async () => undefined` a lookup nel `kvStore` |
| M2 | Modifica `sparkKvMock.set` | Riga 51 | Da `async () => undefined` a scrittura nel `kvStore` |
| M3 | Modifica `sparkKvMock.keys` | Riga 52 | Da `[] costante` a `Array.from(kvStore.keys())` |
| **Nessuna altra modifica** | — | — | Mock `useKV`, `resetTestKvStore`, `seedTestKvStore`, mock audio, mock `matchMedia`, mock `vibrate`, `afterEach` — tutti invariati |

---

## 6. Modifiche ai test

### 6.1 `src/test/smoke/01-app-renders.test.tsx`

Il test attuale usa `screen.getByText` (sincrono) e `screen.getByRole` (sincrono) per verificare la presenza del dialog al mount. Con il bootstrap asincrono, il dialog appare dopo la risoluzione della promessa — in un microtask successivo al render iniziale. Le query sincrone falliscono perché cercano il dialog prima che esista nel DOM.

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

**Cosa cambia:**

| Riga | Prima | Dopo | Motivo |
|---|---|---|---|
| Firma `it` | `() => {` | `async () => {` | Le query async richiedono una funzione asincrona |
| `screen.getByRole('dialog')` | sincrono — fallisce | `await screen.findByRole('dialog')` | Attende il re-render post-promessa |
| `screen.getByText(/Imposta PIN Globale/i)` | sincrono — fallisce | `await screen.findByText(/Imposta PIN Globale/i)` | Attende il re-render post-promessa |
| `screen.getByText(/Crea un PIN.../)` | sincrono | resta sincrono `getByText` | Appare nello stesso render del testo precedente — una volta che il dialog è aperto, tutto il suo contenuto è presente |
| `document.querySelector(...)` | sincrono | resta sincrono | Il `<main>` di `AuthScreen` è renderizzato sincrono al mount, prima ancora del bootstrap |

### 6.2 `src/test/smoke/test-utils.ts`

La funzione `authenticateWithPin` cercava il campo "Nuovo PIN" con `screen.getByLabelText` (sincrono). Con il bootstrap asincrono, il dialog non è presente al render iniziale, quindi la query sincrona fallisce. Solo la prima query deve diventare `findByLabelText`: una volta che il dialog è aperto, tutti i suoi campi e pulsanti sono presenti nello stesso render.

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

**Cosa cambia:** una sola riga. `screen.getByLabelText(/Nuovo PIN/i)` → `await screen.findByLabelText(/Nuovo PIN/i)`.

Le righe successive (`getByLabelText(/Conferma PIN/i)`, `getByRole('button', ...)`) restano sincrone: il dialog è già aperto quando si cerca il campo di conferma — `findByLabelText` ne ha aspettato la comparsa.

### 6.3 File di test che non richiedono modifiche dirette

| File | Motivo dell'esenzione |
|---|---|
| `02-authentication.test.tsx` | Usa `authenticateWithPin` (già aggiornato in 6.2). L'unica query esplicita dopo il login è `await screen.findByText(...)` — già async. |
| `03-dashboard-tab.test.tsx` | Usa `authenticateWithPin`. Le query post-autenticazione (`screen.getByText(/Nessun conto/i)`, `screen.getByText(/Nessun movimento/i)`) sono eseguite dopo che il login è già completato da `authenticateWithPin`, che attende `findByText(/I Tuoi Conti/i)`. Il DOM è stabile al momento delle query. |
| `04-transactions-tab.test.tsx` | Identico a 03: usa `authenticateWithPin`, tutte le query post-auth sono eseguite su DOM stabile. |
| `05-private-account.test.tsx` | Usa `authenticateWithPin` con `initialKv` seedato. Il dialog privato viene aperto con un'interazione esplicita dell'utente dopo il login — non al mount. `screen.getByText(/Crea PIN Conto Privato/i)` è sincrono e corretto perché eseguito dopo azioni utente che attendono già il DOM. |

---

## 7. Comportamento atteso dopo la correzione

### 7.1 Primo avvio reale (KV piattaforma vuoto)

L'utente apre l'applicazione per la prima volta. La schermata di autenticazione appare con il dialog "Imposta PIN Globale" e la descrizione "Crea un PIN per proteggere l'applicazione". I campi "Nuovo PIN" e "Conferma PIN" sono presenti e funzionanti. L'invio crea il PIN, il dialog si chiude e l'utente accede alla dashboard.

### 7.2 Refresh reale con PIN salvato

L'utente preme F5 o ricarica la pagina. La schermata di autenticazione appare con il dialog "Inserisci PIN" (senza i campi di conferma). L'inserimento del PIN corretto chiude il dialog e mostra la dashboard. Il PIN precedente non viene sovrascritto.

### 7.3 Test con KV vuoto (`renderApp()` senza opzioni)

Il test runner trova il dialog "Imposta PIN Globale" tramite `await screen.findByText(...)` o `await screen.findByRole('dialog')`. Il test 01 passa. Il helper `authenticateWithPin` trova il campo "Nuovo PIN" tramite `await screen.findByLabelText(...)` e completa il flusso.

### 7.4 Test con KV seedato (`renderApp({ initialKv: { 'global-pin-hash': 'hash...' } })`)

Il bootstrap legge l'hash dal `kvStore` tramite `window.spark.kv.get`, classificando la sessione come login. Il dialog mostra il titolo "Inserisci PIN". Il test 05 che usa `initialKv` con hash non riscontra regressioni.

---

## 8. Comportamento invariato

| Aspetto | Note |
|---|---|
| **Interfaccia `AuthContextValue`** | Tutte le proprietà rimangono (eccetto il cambio di tipo `globalPinHash: string | undefined` → `string` — vedere 4.3). Nessuna proprietà aggiunta o rimossa. `isAuthReady` non è esposta. |
| **`handleGlobalPinSubmit`** | Invariato. Usa `globalPinHash` da `useKV` per la verifica login: al momento del submit, `useKV` ha già risolto la sua lettura asincrona. La riga `const isValid = await verifyPin(pin, globalPinHash \|\| '')` è corretta anche con tipo `string` (il `\|\| ''` è ridondante ma inoffensivo). |
| **`handlePrivatePinSubmit`** | Invariato. Il PIN privato usa `useKV<string>` — il tipo non è cambiato. |
| **`AuthScreen.tsx`** | Invariato. Legge `showPinDialog` e `isSetupMode` come prima. |
| **`PinDialog.tsx`** | Invariato. Renderizza in base alla prop `open`. |
| **`App.tsx`** — ordine provider | Invariato. `AuthProvider` resta il provider più esterno. |
| **`AppDataContext.tsx`** | Invariato. |
| **`VisibleDataContext.tsx`** | Invariato. |
| **Logica PIN privato** | Invariata. `setIsPrivateUnlocked`, `setShowPrivatePinDialog` e il relativo flusso non sono coinvolti. |
| **Mock `useKV` in `setup.ts`** | Invariato (sezione 5.3). |
| **`resetTestKvStore` e `seedTestKvStore`** | Invariati. |
| **Tutti i file di configurazione** | `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `package.json` — invariati. |

---

## 9. Criteri di accettazione

### Blocco A — Modifiche a `AuthContext.tsx`

| # | Criterio | Verifica |
|---|---|---|
| CA-A01 | `useRef` è rimosso dall'import React (riga 1) | ☐ |
| CA-A02 | `useKV<string>('global-pin-hash', '')` — il tipo generico è `string`, il default è `''` | ☐ |
| CA-A03 | `useKV<string>('private-pin-hash', '')` — invariato rispetto all'originale | ☐ |
| CA-A04 | `AuthContextValue.globalPinHash` è tipizzato `string` (non `string \| undefined`) | ☐ |
| CA-A05 | Il setter `setGlobalPinHash` ha tipo `(value: string \| ((prev: string) => string)) => void` (nessun `?` su `prev`) | ☐ |
| CA-A06 | `const hasInitialized = useRef(false)` non compare più nel file | ☐ |
| CA-A07 | `const [isAuthReady, setIsAuthReady] = useState(false)` è presente tra le dichiarazioni di stato | ☐ |
| CA-A08 | `isAuthReady` **non** è presente nel `value` passato al `<AuthContext.Provider>` | ☐ |
| CA-A09 | Il `useEffect` di bootstrap ha `deps=[]` (array vuoto, non `[globalPinHash]`) | ☐ |
| CA-A10 | Il `useEffect` usa `window.spark.kv.get('global-pin-hash')` — non `globalPinHash` da React state | ☐ |
| CA-A11 | Il `useEffect` contiene il flag `cancelled` e il cleanup `return () => { cancelled = true }` | ☐ |
| CA-A12 | La sequenza di `setState` nell'effect è: `setIsSetupMode(true)` (condizionale), poi `setShowPinDialog(true)`, poi `setIsAuthReady(true)` | ☐ |
| CA-A13 | `handleGlobalPinSubmit` e `handlePrivatePinSubmit` sono identici all'originale | ☐ |
| CA-A14 | Il JSX del provider è identico all'originale | ☐ |

### Blocco B — Modifiche a `setup.ts`

| # | Criterio | Verifica |
|---|---|---|
| CB-01 | `sparkKvMock.get` legge dal `kvStore` — non restituisce `undefined` incondizionatamente | ☐ |
| CB-02 | `sparkKvMock.get` restituisce `cloneValue(kvStore.get(key))` se la chiave esiste, `undefined` altrimenti | ☐ |
| CB-03 | `sparkKvMock.set` scrive nel `kvStore` con `cloneValue` | ☐ |
| CB-04 | `sparkKvMock.keys` restituisce `Array.from(kvStore.keys())` | ☐ |
| CB-05 | Il blocco `vi.mock('@github/spark/hooks', () => ({ useKV: ... }))` è identico all'originale — nessuna riga toccata | ☐ |
| CB-06 | `resetTestKvStore`, `seedTestKvStore` e il blocco `afterEach` sono identici all'originale | ☐ |

### Blocco C — Modifiche ai test e validazione finale

| # | Criterio | Verifica |
|---|---|---|
| CC-01 | La firma di `it(...)` in `01-app-renders.test.tsx` è `async () => {` | ☐ |
| CC-02 | `screen.getByRole('dialog')` è sostituito con `await screen.findByRole('dialog')` | ☐ |
| CC-03 | `screen.getByText(/Imposta PIN Globale/i)` è sostituito con `await screen.findByText(/Imposta PIN Globale/i)` | ☐ |
| CC-04 | `screen.getByText(/Crea un PIN per proteggere l'applicazione/i)` resta sincrono (nessuna modifica) | ☐ |
| CC-05 | In `test-utils.ts`, la prima riga di `authenticateWithPin` è `await screen.findByLabelText(/Nuovo PIN/i)` | ☐ |
| CC-06 | Le righe successive di `authenticateWithPin` (`getByLabelText(/Conferma PIN/i)`, `getByRole(...)`) restano sincrone | ☐ |
| CC-07 | I file `02`, `03`, `04`, `05` non sono stati modificati | ☐ |
| CC-08 | `tsc --noEmit` → 0 errori | ☐ |
| CC-09 | `npm run lint` → 0 problemi sui file modificati | ☐ |
| CC-10 | `npm run test:run` → 0 failures | ☐ |

---

## 10. Note per l'agente di implementazione

### 10.1 Ordine di applicazione delle modifiche

1. **Prima: `src/test/setup.ts`** — aggiornare `sparkKvMock.get`, `set` e `keys`. Questo è il passo fondante: senza un mock corretto, i test falliscono indipendentemente da qualsiasi modifica a `AuthContext`. Modificare il mock per primo consente di eseguire `npm run test:run` dopo ogni passo successivo e vedere i test avanzare verso il verde.

2. **Poi: `src/context/AuthContext.tsx`** — nell'ordine: (a) modifica import, (b) tipo `useKV`, (c) interfaccia `AuthContextValue`, (d) rimozione `hasInitialized`, (e) aggiunta `isAuthReady`, (f) sostituzione `useEffect`. Eseguire `tsc --noEmit` dopo questo passo.

3. **Infine: i test** — `01-app-renders.test.tsx` e `test-utils.ts`. Eseguire `npm run test:run` per la verifica finale.

### 10.2 Il flag `cancelled` — quando è rilevante

Il flag `cancelled` protegge dallo scenario in cui il componente `AuthProvider` viene smontato mentre la promessa `window.spark.kv.get` è ancora in attesa. Questo non avviene nelle sessioni utente normali (il provider non viene mai smontato durante l'uso), ma può accadere nei test con `cleanup()` aggressivo. Senza il flag, i `setState` chiamati dopo un unmount genererebbero un warning React ("Can't perform a React state update on an unmounted component") — un errore silente in test che potrebbe oscurare altri problemi. Il costo del flag è una variabile locale e un assignment nel cleanup: overhead trascurabile, protezione non negoziabile.

### 10.3 `getByText` vs `findByText` — regola pratica

| Query | Tipo | Quando usarla |
|---|---|---|
| `screen.getByText(...)` | Sincrona — lancia subito se non trova | Quando l'elemento è già nel DOM al momento della chiamata (es. subito dopo `renderApp` per elementi sincroni, o dopo un'interazione utente già awaited) |
| `await screen.findByText(...)` | Asincrona — polling con timeout | Quando l'elemento appare in un re-render futuro (es. dopo la risoluzione di una promessa, dopo un `setState` in un microtask) |

Regola: ogni query che verifica il risultato di un'operazione asincrona (anche di un singolo microtask) deve usare `findBy*`. Le query che verificano contenuto già renderizzato al momento della chiamata possono restare `getBy*`. Nel test 01, il `<main>` con `aria-label="Schermata di autenticazione..."` è renderizzato sincrono (fa parte di `AuthScreen` che è montato immediatamente) — quindi `document.querySelector` su di esso resta sincrono. Il dialog è controllato da `showPinDialog`, che diventa `true` solo dopo la promessa — quindi richiede `findBy*`.

### 10.4 Rimozione di `useRef` dall'import — verifica preventiva

Prima di rimuovere `useRef` dall'import di `AuthContext.tsx`, effettuare una ricerca testuale per `useRef` nel file. Il file attuale contiene esattamente due occorrenze: riga 1 (import) e riga 46 (dichiarazione `hasInitialized`). Poiché `hasInitialized` viene rimosso (passo M4), nessun'altra riga usa `useRef`. La rimozione dall'import è sicura. Se in una versione futura del file comparissero altri `useRef`, la rimozione dall'import causerebbe un errore TypeScript immediato — che funge da segnale correttivo automatico.

### 10.5 `handleGlobalPinSubmit` — nessuna modifica necessaria

`handleGlobalPinSubmit` usa `globalPinHash` (dalla `useKV`) per la verifica del PIN inserito dall'utente:

```tsx
const isValid = await verifyPin(pin, globalPinHash || '')
```

Al momento in cui l'utente digita il PIN e preme "Conferma" (secondi dopo il mount), `useKV` ha già completato la sua lettura asincrona interna e `globalPinHash` contiene il valore reale dal KV. Non c'è race condition. La riga `globalPinHash || ''` è ridondante con il tipo `string` (il default `''` garantisce che `globalPinHash` non sia mai `undefined`), ma è inoffensiva e non va modificata.

---

## 11. Messaggio di commit

```
fix(auth): bootstrap asincrono AuthContext + mock KV allineato

- AuthContext: sostituisce useEffect con guard undefined/hasInitialized
  con un bootstrap one-shot via window.spark.kv.get (deps=[]).
  Aggiunge isAuthReady (stato interno, non esposto). Rimuove useRef
  hasInitialized. Ripristina useKV<string>('global-pin-hash', '').
- setup.ts: allinea sparkKvMock.get/set al kvStore interno per coerenza
  con useKV. Risolve il disallineamento sincrono/asincrono tra mock e
  piattaforma reale (causa radice VARIANTE B sistematica nei test).
- 01-app-renders.test.tsx: converte il test in async, sostituisce
  getByRole/getByText con findByRole/findByText per il dialog asincrono.
- test-utils.ts: prima query di authenticateWithPin diventa findByLabelText.

Rende obsoleti P23 e P23-fix-auth-pin-combinazione-AB.
Risolve BUG-01 (bloccante) in tutti e quattro gli scenari.
```

---

*Fine documento di design — nessun file di codice modificato in questa fase.*
*L'implementazione segue in fase Code secondo il workflow standard SCF.*
