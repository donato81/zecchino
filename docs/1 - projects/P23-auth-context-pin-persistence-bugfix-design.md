# P23 — Bugfix BUG-01: persistenza PIN e flusso di inizializzazione in `AuthContext`

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 23 (corrispondente al Passo 23 del piano di refactoring)  
> Bug di riferimento: BUG-01 — report `docs/4 - reports/report-diagnostico-bug-pre-merge.md`  
> Data: 27 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Intestazione

| Campo | Valore |
|---|---|
| **Bug ID** | BUG-01 |
| **Severità** | Bloccante |
| **Segnalato in** | `docs/4 - reports/report-diagnostico-bug-pre-merge.md` — Sezione 1 |
| **File principale coinvolto** | `src/context/AuthContext.tsx` |
| **File correlati (sola lettura)** | `src/components/AuthScreen.tsx`, `src/components/PinDialog.tsx` (non modificati) |
| **Branch** | `refactoring-architettura` |
| **Data** | 27 aprile 2026 |
| **Tipo di intervento** | Bugfix — nessun refactoring, nessuna nuova feature |

---

## 2. Analisi della causa radice

### 2.1 Il problema in sintesi

Ad ogni refresh della pagina (F5) l'app presenta il dialog "Imposta PIN Globale" (setup mode) invece del dialog "Inserisci PIN" (login mode), come se fosse sempre il primo avvio. Il PIN già configurato non viene mai sovrascritto ma l'app non lo riconosce mai come presente al momento dell'inizializzazione.

### 2.2 Origine del difetto: timing asincrono di `useKV`

Il PIN globale è persistito tramite il hook `useKV` dal runtime Spark:

```tsx
// AuthContext.tsx — riga 37 (attuale — CODICE BUGGY)
const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
```

`useKV` carica i dati dal KV store in modo **asincrono**: al primo render del componente restituisce in modo sincrono il valore di default (`''`) mentre il recupero del dato persistito avviene in background. Quando il dato arriva, il componente si ri-renderizza con il valore reale.

### 2.3 L'effect con dipendenze vuote aggrava il problema

L'`useEffect` che decide se avviare il flusso di setup o di login ha un array di dipendenze vuoto (`[]`):

```tsx
// AuthContext.tsx — righe 50–58 (attuale — CODICE BUGGY)
// Intenzionale: questo effect deve girare solo al mount per scegliere setup o login iniziale.
// Aggiungere globalPinHash ai deps riaprirebbe il dialog PIN dopo ogni cambio PIN.
/* eslint-disable react-hooks/exhaustive-deps */
useEffect(() => {
  if (!globalPinHash) {        // ← valuta '' (default sincrono), non il valore reale dal KV
    setIsSetupMode(true)        // ← sempre true anche dopo il primo avvio
    setShowPinDialog(true)
  } else {
    setShowPinDialog(true)
  }
}, [])
/* eslint-enable react-hooks/exhaustive-deps */
```

L'effect viene eseguito **una sola volta al mount**. In quel momento, `globalPinHash` vale `''` (il default sincrono), che è **falsy**. La condizione `!globalPinHash` è sempre vera al mount, quindi `isSetupMode` viene impostato a `true` anche quando l'utente aveva già configurato un PIN in sessioni precedenti.

Quando il KV store completa il caricamento asincrono e `globalPinHash` assume il valore dell'hash reale, l'effect **non si riesegue** (deps `[]`). La decisione setup/login è già stata presa, erroneamente, sulla base del default vuoto.

### 2.4 Catena degli eventi al refresh (comportamento errato)

1. Utente preme F5 → `AuthProvider` si rimonta
2. `useKV('global-pin-hash', '')` → ritorna `''` in modo sincrono
3. `useEffect(fn, [])` → si esegue con `globalPinHash === ''` → `!globalPinHash === true`
4. `setIsSetupMode(true)` + `setShowPinDialog(true)` → dialog "Imposta PIN Globale" visibile
5. KV store carica in modo asincrono → `globalPinHash = 'abc123...'` (hash reale)
6. L'effect **non si riesegue** → `isSetupMode` rimane `true`
7. Risultato: l'utente vede il form di creazione PIN invece del login

### 2.5 Impatto

- Ogni accesso all'app dopo il primo avvio richiede di "impostare" nuovamente il PIN
- In apparenza il PIN viene ricreato, ma la logica di `handleGlobalPinSubmit` in modalità setup chiama `setGlobalPinHash(hash)` — sovrascrivendo il PIN esistente solo se l'utente completa il form
- L'accesso è completamente bloccato finché l'utente non interagisce con il dialog

---

## 3. Decisione progettuale

### 3.1 Alternativa A — Aggiungere `globalPinHash` ai deps senza sentinella

**Descrizione:** Cambiare il default di `useKV` da `''` a `undefined` e aggiungere `globalPinHash` all'array di dipendenze dell'effect, proteggendo con una guard iniziale:

```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)

useEffect(() => {
  if (globalPinHash === undefined) return   // KV non ancora caricato
  if (!globalPinHash) {
    setIsSetupMode(true)
  }
  setShowPinDialog(true)
}, [globalPinHash])
```

**Pro:**
- Modifica minima — solo due righe cambiano
- Non introduce nuove variabili di stato o ref

**Contro:**
- L'effect si rieseguirebbe **ad ogni variazione di `globalPinHash`**, incluso il momento in cui l'utente crea il proprio PIN (in `handleGlobalPinSubmit`, `setGlobalPinHash(hash)` viene chiamato). In quel caso, `globalPinHash` cambia da `''` a `'hash'`: l'effect girerebbe di nuovo con `globalPinHash !== undefined && globalPinHash !== ''`, chiamando `setShowPinDialog(true)` — riaprendo il dialog in modalità login immediatamente dopo che l'utente ha appena completato il setup.
- Per difendersi da questa riapertura sarebbe necessario aggiungere `isAuthenticated` alle deps e una guard aggiuntiva, aumentando la complessità e introducendo potenziali race condition.

---

### 3.2 Alternativa B — Introdurre uno stato `isInitializing` esplicito

**Descrizione:** Aggiungere un `useState(true)` per `isInitializing` e un `useEffect([globalPinHash])` che, alla prima variazione da `undefined` verso un valore definito, imposta i flag di setup/login e poi `setIsInitializing(false)`. Esporre `isInitializing` nel context in modo che `AuthScreen` possa mostrare uno spinner durante il caricamento.

**Pro:**
- Semanticamente chiaro: separa esplicitamente lo stato "sto caricando" dagli stati "login" e "setup"
- L'UI può fornire un feedback visivo durante il caricamento

**Contro:**
- Richiederebbe di aggiungere `isInitializing` all'interfaccia pubblica `AuthContextValue` — violando il vincolo che impone di non modificare l'interfaccia pubblica
- Richiederebbe modifiche ad `AuthScreen.tsx` per consumare il nuovo stato — violando il vincolo che impone di non modificare nessun componente UI
- Il caricamento dura pochi millisecondi: il feedback visivo non è necessario a questa scala temporale

---

### 3.3 Alternativa C — `deps [globalPinHash]` + `useRef` sentinella *(soluzione scelta)*

**Descrizione:** Combinazione di cambiamento del default `useKV` con aggiunta di un `useRef<boolean>` che traccia se l'inizializzazione è già avvenuta:

```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)
const hasInitialized = useRef(false)

useEffect(() => {
  if (globalPinHash === undefined) return   // KV non ancora caricato — attendi
  if (hasInitialized.current) return        // già inizializzato — non rieseguire
  hasInitialized.current = true
  if (!globalPinHash) {
    setIsSetupMode(true)
  }
  setShowPinDialog(true)
}, [globalPinHash])
```

**Perché questa è la scelta corretta:**

1. **Risolve la causa radice:** il default `undefined` come sentinella permette di distinguere "KV non ancora caricato" da "KV caricato e nessun PIN". L'effect attende il caricamento reale prima di decidere.
2. **Immune da riesecuzioni post-inizializzazione:** il `useRef` agisce come flag one-shot. Dopo la prima esecuzione (con il valore reale dal KV), `hasInitialized.current = true` garantisce che variazioni successive di `globalPinHash` (cambio PIN, rotazione PIN) non riaprino il dialog.
3. **Nessuna modifica all'interfaccia pubblica:** `hasInitialized` è una variabile interna al `AuthProvider`, non esposta nel context.
4. **Nessuna modifica ai componenti UI:** `AuthScreen.tsx` e `PinDialog.tsx` rimangono invariati.
5. **Il `useRef` non causa re-render:** a differenza di `useState`, la mutazione di `hasInitialized.current` non innesca cicli di rendering.
6. **Nessun `eslint-disable` necessario:** l'array `[globalPinHash]` è corretto secondo `react-hooks/exhaustive-deps` — `globalPinHash` è l'unico valore dell'outer scope usato nell'effect (i setter di stato sono stabili per definizione in React e non richiedono dichiarazione).

**Questa è la soluzione adottata per il Passo 23.**

---

## 4. Modifiche a `AuthContext.tsx`

### 4.1 Import React — aggiunta di `useRef`

**Prima (riga 1 — attuale):**
```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
```

**Dopo:**
```tsx
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
```

**Motivazione:** il `useRef` è necessario per dichiarare `hasInitialized`.

---

### 4.2 Default di `useKV` — da `''` a `undefined`

**Prima (riga 37 — attuale):**
```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
```

**Dopo:**
```tsx
const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)
```

**Motivazione:** con `''` come default, non è possibile distinguere "KV non ancora caricato" da "KV caricato e nessun PIN configurato". Il valore `undefined` è la sentinella semanticamente corretta per "non ancora disponibile". Il tipo `string | undefined` è già dichiarato nell'interfaccia `AuthContextValue` (riga 10), quindi questa modifica **non altera l'interfaccia pubblica**.

**Impatto su `handleGlobalPinSubmit`:** la funzione usa già `globalPinHash || ''` come fallback nella chiamata `verifyPin(pin, globalPinHash || '')`, quindi è già safe per `undefined`. Nessuna modifica necessaria alla funzione.

---

### 4.3 Aggiunta di `hasInitialized` ref

**Posizione:** dopo le dichiarazioni `useState` (riga 44), prima della dichiarazione `const screenReader` (riga 46), aggiungere una riga:

**Prima (righe 44–46 — attuale):**
```tsx
  const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)

  const screenReader = useScreenReader()
```

**Dopo:**
```tsx
  const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)

  const hasInitialized = useRef(false)
  const screenReader = useScreenReader()
```

**Motivazione:** `hasInitialized` è un flag one-shot che impedisce la riesecuzione dell'`useEffect` di inizializzazione dopo il suo primo completamento. Il `useRef` è usato al posto di `useState` perché la sua mutazione non causa re-render.

---

### 4.4 Riscrittura dell'`useEffect` di inizializzazione

Questa è la modifica principale. Il blocco attuale (righe 47–58) viene sostituito integralmente:

**Prima (righe 47–58 — attuale — CODICE BUGGY):**
```tsx
  // Intenzionale: questo effect deve girare solo al mount per scegliere setup o login iniziale.
  // Aggiungere globalPinHash ai deps riaprirebbe il dialog PIN dopo ogni cambio PIN.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!globalPinHash) {        // ← valuta '' (default sincrono), non il valore reale dal KV
      setIsSetupMode(true)        // ← sempre true anche dopo il primo avvio
      setShowPinDialog(true)
    } else {
      setShowPinDialog(true)
    }
  }, [])
  /* eslint-enable react-hooks/exhaustive-deps */
```

**Dopo:**
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

**Cosa cambia riga per riga:**

| Elemento | Prima | Dopo | Motivazione |
|---|---|---|---|
| Commenti e eslint-disable | Presenti (3 righe) | Rimossi | L'array deps è ora corretto — nessun disabilitazione del linter necessaria |
| Deps array | `[]` | `[globalPinHash]` | Permette la riesecuzione quando il KV carica il valore reale |
| Guard `undefined` | Assente | `if (globalPinHash === undefined) return` | Evita l'esecuzione con il default sincrono |
| Guard `hasInitialized` | Assente | `if (hasInitialized.current) return` | Evita la riesecuzione dopo l'inizializzazione |
| Flag one-shot | Assente | `hasInitialized.current = true` | Segna l'inizializzazione come completata |
| Branch setup | `setIsSetupMode(true)` + `setShowPinDialog(true)` | `setIsSetupMode(true)` (solo setup) | `setShowPinDialog` è spostato fuori dall'if/else |
| Branch login | `setShowPinDialog(true)` | (assente — coperto dalla riga fuori dall'if) | `setShowPinDialog` è ora chiamato una sola volta, fuori dall'if/else |
| `setIsSetupMode(false)` nel branch login | Assente | Assente (corretto) | `isSetupMode` è `false` di default; non serve un'assegnazione esplicita a `false` |

**Perché `setShowPinDialog(true)` è fuori dall'if:**  
In entrambi i casi (setup e login) il dialog deve essere mostrato. Spostare la chiamata fuori dall'if/else elimina la duplicazione e rende esplicito il fatto che il dialog viene sempre aperto dopo la determinazione della modalità.

---

### 4.5 Riepilogo di tutte le modifiche a `AuthContext.tsx`

| Tipo | Riga/e coinvolte | Descrizione |
|---|---|---|
| Modifica import | Riga 1 | Aggiungere `useRef` all'import da `react` |
| Modifica default KV | Riga 37 | `useKV<string>(..., '')` → `useKV<string \| undefined>(..., undefined)` |
| Aggiunta ref | Dopo riga 44 | `const hasInitialized = useRef(false)` |
| Rimozione commenti | Righe 47–49 | Rimuovere commento + eslint-disable |
| Riscrittura useEffect | Righe 50–58 | Nuovo body e nuove deps `[globalPinHash]` |
| Rimozione eslint-enable | Riga 58 (attuale) | Rimossa insieme al blocco |
| **Nessuna altra modifica** | — | Interfaccia, handler, JSX: invariati |

---

## 5. Comportamento atteso dopo la correzione

### 5.1 Primo avvio reale (nessun PIN configurato)

1. Mount di `AuthProvider`: `globalPinHash = undefined` (default `useKV`) → `showPinDialog = false`
2. KV store carica → nessun PIN trovato → `globalPinHash = ''`
3. `useEffect` si riesegue: `globalPinHash !== undefined` → prima guard superata
4. `hasInitialized.current === false` → seconda guard superata; imposta `hasInitialized.current = true`
5. `!globalPinHash` (`'' === falsy`) → `setIsSetupMode(true)`
6. `setShowPinDialog(true)` → il dialog "Imposta PIN Globale" appare

**Risultato:** l'utente vede il dialog di configurazione PIN. ✓

### 5.2 Avvii successivi (PIN già configurato, da fresh load)

1. Mount di `AuthProvider`: `globalPinHash = undefined` → `showPinDialog = false`
2. KV store carica → PIN trovato → `globalPinHash = 'abc123hash...'`
3. `useEffect` si riesegue: `globalPinHash !== undefined` → prima guard superata
4. `hasInitialized.current === false` → seconda guard superata; imposta `hasInitialized.current = true`
5. `globalPinHash` è truthy → il branch `if (!globalPinHash)` non esegue → `isSetupMode` rimane `false`
6. `setShowPinDialog(true)` → il dialog "Inserisci PIN" appare

**Risultato:** l'utente vede il dialog di login. ✓

### 5.3 Refresh F5 (con PIN già configurato)

Identico al punto 5.2: il provider viene rimontato, `hasInitialized.current` riparte da `false` (i `useRef` vengono reinizializzati al mount), il KV store carica il PIN esistente e il dialog "Inserisci PIN" appare.

**Risultato:** il refresh porta al login, non al setup. Bug corretto. ✓

### 5.4 Creazione PIN durante il setup (transizione setup → login)

1. Utente inserisce PIN → `handleGlobalPinSubmit` in setup mode
2. `setGlobalPinHash(hash)` → `globalPinHash` cambia da `''` a `'hash'`
3. `useEffect` si riesegue: `globalPinHash !== undefined` → prima guard superata
4. `hasInitialized.current === true` → **seconda guard non superata → early return**
5. Il dialog **non si riapre**. `handleGlobalPinSubmit` ha già chiamato `setShowPinDialog(false)` e `setIsAuthenticated(true)`.

**Risultato:** dopo la creazione del PIN l'utente entra nell'app senza interruzioni. ✓

### 5.5 PIN errato al login

L'`useEffect` non è coinvolto. `handleGlobalPinSubmit` gestisce l'errore (`toast.error`, `soundSystem.play('pin-error')`) e il dialog rimane aperto. Nessuna modifica al comportamento.

**Risultato:** PIN errato mostra messaggio di errore, il dialog rimane aperto. ✓

---

## 6. Comportamento invariato

Questa sezione elenca esplicitamente tutto ciò che **non deve cambiare** dopo il Passo 23:

| Aspetto | Note |
|---|---|
| **Interfaccia `AuthContextValue`** | Nessun campo aggiunto o rimosso; `globalPinHash: string \| undefined` era già dichiarato |
| **`handleGlobalPinSubmit`** | Nessuna modifica — gestisce setup e login esattamente come prima |
| **`handlePrivatePinSubmit`** | Nessuna modifica |
| **Logica del PIN privato** | `isPrivateUnlocked`, `privatePinHash`, `showPrivatePinDialog` — invariati |
| **`AuthScreen.tsx`** | Non toccato — legge `showPinDialog`, `isSetupMode`, `handleGlobalPinSubmit` dal context |
| **`PinDialog.tsx`** | Non toccato |
| **`App.tsx`** | Non toccato — il guard `!isAuthenticated` rimane invariato |
| **Tutti gli altri consumer di `useAuth()`** | Non richiedono modifiche |
| **Sound system e haptic feedback** | Invariati — sono dentro `handleGlobalPinSubmit` |
| **Screen reader announcements** | Invariati — dentro `handleGlobalPinSubmit` |
| **Configurazione PIN privato** | Il flusso del PIN privato è separato e non influenzato |
| **`src/lib/crypto.ts`** | `hashPin`, `verifyPin` — non toccati |
| **File di configurazione** | `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js` — invariati |
| **File SCF sotto `.github/`** | Protetti da `framework-guard.instructions.md` — invariati |

---

## 7. Criteri di accettazione

L'agente di implementazione verifica il proprio lavoro confrontando questa checklist al termine del Passo 23:

| # | Criterio | Verifica |
|---|---|---|
| CA-01 | `useRef` è importato da `react` nella riga 1 (insieme a `createContext`, `useContext`, `useState`, `useEffect`, `ReactNode`) | ☐ |
| CA-02 | `useKV` per `global-pin-hash` è dichiarato come `useKV<string \| undefined>('global-pin-hash', undefined)` — default `undefined`, non `''` | ☐ |
| CA-03 | `const hasInitialized = useRef(false)` è presente nel body di `AuthProvider`, prima dell'`useEffect` di inizializzazione | ☐ |
| CA-04 | Il commento `// Intenzionale:` (2 righe) e le direttive `/* eslint-disable/enable react-hooks/exhaustive-deps */` sono stati rimossi | ☐ |
| CA-05 | L'array di dipendenze dell'`useEffect` di inizializzazione è `[globalPinHash]` (non `[]`) | ☐ |
| CA-06 | La prima istruzione dell'`useEffect` è `if (globalPinHash === undefined) return` | ☐ |
| CA-07 | La seconda istruzione dell'`useEffect` è `if (hasInitialized.current) return` | ☐ |
| CA-08 | La terza istruzione dell'`useEffect` è `hasInitialized.current = true` | ☐ |
| CA-09 | `setIsSetupMode(true)` è chiamato solo nel branch `if (!globalPinHash)` — non è presente un `setIsSetupMode(false)` nel branch login | ☐ |
| CA-10 | `setShowPinDialog(true)` è chiamato **una sola volta**, **fuori** dall'if/else, come ultima istruzione dell'`useEffect` | ☐ |
| CA-11 | L'interfaccia `AuthContextValue` è identica all'originale — nessun campo aggiunto, rimosso o modificato nel tipo | ☐ |
| CA-12 | `handleGlobalPinSubmit` è identica all'originale — nessuna riga modificata | ☐ |
| CA-13 | `handlePrivatePinSubmit` è identica all'originale — nessuna riga modificata | ☐ |
| CA-14 | Il JSX del `return` di `AuthProvider` è identico all'originale | ☐ |
| CA-15 | Nessun altro file nel repository è stato modificato | ☐ |
| CA-16 | `tsc --noEmit` → 0 errori dopo la modifica | ☐ |
| CA-17 | `npm run lint` → 0 problems (nessun nuovo warning, in particolare nessun `react-hooks/exhaustive-deps`) | ☐ |
| CA-18 | Test manuale: refresh F5 con PIN configurato → appare il dialog "Inserisci PIN" (non "Imposta PIN Globale") | ☐ |

---

## 8. Note per l'agente di implementazione

### 8.1 Ordine suggerito delle modifiche

Eseguire le modifiche in questo ordine, che permette di verificare in modo incrementale:

1. **Riga 1** — Aggiungere `useRef` all'import di React
2. **Riga 37** — Cambiare il default di `useKV` da `''` a `undefined` e il generic da `<string>` a `<string | undefined>`
3. **Dopo riga 44** — Aggiungere `const hasInitialized = useRef(false)` prima di `const screenReader`
4. **Righe 47–58** — Sostituire l'intero blocco commenti + eslint-disable + useEffect + eslint-enable con il nuovo `useEffect`

Dopo le modifiche 1–3, eseguire `tsc --noEmit` per verificare che nessun errore di tipo sia stato introdotto prima di procedere con la modifica più delicata (step 4).

### 8.2 Verifica del tipo di `useKV`

Il generic `useKV<string | undefined>` garantisce che TypeScript sia allineato con il default `undefined`. Questo è consistente con la dichiarazione già presente in `AuthContextValue`:

```tsx
globalPinHash: string | undefined   // già dichiarato — nessuna modifica all'interfaccia
```

Se l'IDE segnalasse un'incompatibilità di tipo tra il setter restituito da `useKV<string | undefined>` e il tipo `setGlobalPinHash` nell'interfaccia (`(value: string | ((prev?: string) => string)) => void`), si può lasciare il generic a `<string>` e aggiungere `as unknown as string | undefined` al secondo argomento solo se necessario — ma questo non dovrebbe verificarsi data la flessibilità del tipo dichiarato.

### 8.3 Perché non è necessario `setIsSetupMode(false)` nel branch login

`isSetupMode` è inizializzato come `useState(false)` (valore di default già `false`). Nel flusso di login, `setIsSetupMode` non viene mai chiamato nell'effect (e giustamente: `isSetupMode` rimane al suo default `false`). Il branch `if (!globalPinHash)` imposta `true` solo nel caso di setup; per il login, non serve un'assegnazione esplicita a `false`.

### 8.4 Perché i commenti eslint-disable non sono più necessari

Il commento originale motivava la scelta di `deps: []` con:  
> "Aggiungere globalPinHash ai deps riaprirebbe il dialog PIN dopo ogni cambio PIN."

Con la soluzione adottata, questo problema è risolto dal `useRef`: anche se `globalPinHash` cambia dopo l'inizializzazione (cambio PIN), `hasInitialized.current === true` blocca l'esecuzione del body dell'effect. L'array `[globalPinHash]` è ora corretto secondo la regola `react-hooks/exhaustive-deps` e il commento non ha più ragion d'essere.

### 8.5 Test manuale post-implementazione

1. **Scenario A — Primo avvio:**
   - Aprire l'app in un browser in incognito (nessun dato KV)
   - Verificare: il dialog "Imposta PIN Globale" appare
   - Inserire un PIN → l'app entra nella schermata principale

2. **Scenario B — Refresh con PIN configurato:**
   - Con l'app aperta e autenticata, premere F5
   - Verificare: il dialog "Inserisci PIN" appare (non "Imposta PIN Globale")
   - Inserire il PIN → l'app entra nella schermata principale

3. **Scenario C — PIN errato:**
   - Al dialog "Inserisci PIN", inserire un PIN errato
   - Verificare: compare il messaggio di errore, il dialog rimane aperto

4. **Scenario D — Nessuna schermata di setup imprevista:**
   - Navigare nell'app per alcuni minuti (cambi di tab, apertura dialog)
   - Verificare: il dialog di autenticazione non riappare mai inaspettatamente

### 8.6 Impatto sui test automatici esistenti

I 5 smoke test di P19 in `src/test/` mockano `@github/spark/hooks` tramite `vi.mock` in `src/test/setup.ts`. Il default `undefined` per `useKV` è compatibile con il mock esistente; i test non richiedono modifiche. Eseguire `npm run test:run` dopo l'implementazione per confermare.

---

## 9. Messaggio di commit

Al termine dell'implementazione, committare con il messaggio esatto seguente (formato Conventional Commits):

```
fix(auth): correggi inizializzazione asincrona PIN — BUG-01 AuthContext

- useKV default '' → undefined per distinguere "non ancora caricato" da "nessun PIN"
- useRef hasInitialized per esecuzione one-shot dell'effect di avvio
- deps [] → [globalPinHash] per attendere il caricamento reale dal KV store
- rimossi commenti e direttive eslint-disable non più necessarie

Closes BUG-01
```
