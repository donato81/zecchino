# P23 — Coding Plan: Bugfix BUG-01 — persistenza PIN e flusso di inizializzazione in AuthContext

> Documento operativo.  
> Fase: Plan → Code  
> Pacchetto: 23 — Decimo passo post-refactoring  
> Design di riferimento: `docs/1 - projects/P23-auth-context-pin-persistence-bugfix-design.md`  
> Bug di riferimento: BUG-01 — `docs/4 - reports/report-diagnostico-bug-pre-merge.md`  
> Data: 2026-04-27

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P19, P20, P21, P22.
- Questo passo è un **bugfix puro**: nessun refactoring, nessuna nuova feature.
- ⚠️ **Perimetro stretto:** un solo file sorgente viene modificato: `src/context/AuthContext.tsx`. Nessun altro file sorgente, di configurazione, di documentazione o framework SCF deve essere toccato.
- ⚠️ **Ordine obbligatorio delle 4 modifiche** (come da sezione 4 e 8.1 del design): import → `useKV` default → `hasInitialized` ref → `useEffect`. Questo ordine permette di eseguire `tsc --noEmit` dopo i primi 3 step e verificare l'assenza di errori prima di toccare il corpo dell'effect.
- ⚠️ **Interfaccia `AuthContextValue` non modificata:** `globalPinHash: string | undefined` era già dichiarata in `AuthContextValue` — questo cambiamento non altera l'interfaccia pubblica.
- ⚠️ **`handleGlobalPinSubmit`, `handlePrivatePinSubmit`, JSX del return di `AuthProvider`**: invariati — nessuna riga deve essere modificata.
- ⚠️ **Nessun componente consumer toccato:** `src/components/AuthScreen.tsx`, `src/components/PinDialog.tsx`, `src/App.tsx` non devono essere modificati; beneficiano automaticamente della correzione.
- ⚠️ Il file `src/lib/crypto.ts` (`hashPin`, `verifyPin`) **non viene modificato**.
- ⚠️ I file di configurazione (`package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`) rimangono invariati.
- ⚠️ I file framework SCF sotto `.github/` sono protetti da `framework-guard.instructions.md` e non devono essere toccati.

---

**File modificati:**

| Categoria | File | Tipo intervento |
|---|---|---|
| Context | `src/context/AuthContext.tsx` | Modifica (4 modifiche chirurgiche — vedi schema) |

**File invariati:**

| File / Area | Motivazione |
|---|---|
| `src/components/AuthScreen.tsx` | Consumer del context — legge `showPinDialog`, `isSetupMode`, `handleGlobalPinSubmit`; beneficia automaticamente della correzione |
| `src/components/PinDialog.tsx` | Consumer del context — non coinvolto nella causa radice |
| `src/App.tsx` | Guard `!isAuthenticated` — invariato |
| `src/lib/crypto.ts` | `hashPin`, `verifyPin` — non coinvolti |
| `src/context/AuthContext.tsx` — interfaccia | `AuthContextValue` invariata: nessun campo aggiunto/rimosso |
| `src/context/AppDataContext.tsx` | Non coinvolto in BUG-01 |
| `src/hooks/use-screen-reader.ts` | Già corretto in P22; non coinvolto in BUG-01 |
| `src/hooks/use-app-shortcuts.ts` | Non coinvolto in BUG-01 |
| `src/components/DashboardTab.tsx` | Non coinvolto in BUG-01 |
| `src/components/TransactionDialog.tsx` | Già corretto in P22; non coinvolto in BUG-01 |
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
Passo 23 — Bugfix BUG-01: persistenza PIN e flusso di inizializzazione AuthContext
│
├── Step 1: Modifica riga 1 — import React
│   │
│   ├── Aggiungere useRef all'import
│   │   Prima:  import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
│   │   Dopo:   import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
│   │
│   └── (gate intermedio insieme a Step 2 e 3)
│
├── Step 2: Modifica riga 37 — default useKV
│   │
│   ├── Cambiare generic e default value
│   │   Prima:  const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
│   │   Dopo:   const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)
│   │
│   └── (gate intermedio insieme a Step 1 e 3)
│
├── Step 3: Aggiunta dopo riga 44 — hasInitialized ref
│   │
│   ├── Aggiungere una riga prima di const screenReader = useScreenReader()
│   │   const hasInitialized = useRef(false)
│   │
│   └── Gate intermedio: tsc --noEmit → 0 errori
│
├── Step 4: Sostituzione righe 47–58 — useEffect di inizializzazione
│   │
│   ├── Rimuovere: commento // Intenzionale + eslint-disable + eslint-enable
│   ├── Sostituire body e deps array dell'useEffect
│   │   Prima deps:  []  (con eslint-disable)
│   │   Dopo deps:   [globalPinHash]
│   │   Nuovo body:
│   │     if (globalPinHash === undefined) return
│   │     if (hasInitialized.current) return
│   │     hasInitialized.current = true
│   │     if (!globalPinHash) { setIsSetupMode(true) }
│   │     setShowPinDialog(true)
│   │
│   └── Gate: tsc --noEmit → 0 errori, npm run lint → 0 problems
│
├── Step 5: Test locali
│   ├── npm run lint → 0 problems
│   ├── npm run build → exit 0
│   └── npm run test:run → 5 passed
│
└── Step 6: Verifica manuale (4 scenari — sezione 8.5 del design)
    ├── Scenario A: browser incognito → dialog "Imposta PIN Globale"
    ├── Scenario B: F5 con PIN configurato → dialog "Inserisci PIN" (non setup)
    ├── Scenario C: PIN errato → messaggio errore, dialog rimane aperto
    └── Scenario D: navigazione app → dialog autenticazione non riappare
```

---

## Ambiguità verificate

Le seguenti ambiguità sono state **verificate sul repository reale** sul branch `refactoring-architettura` con lettura diretta dei file sorgente prima della stesura di questo piano.

---

### AI1 — Causa radice: timing asincrono di `useKV` + deps `[]` nell'effect

**Verifica eseguita:** lettura di `src/context/AuthContext.tsx` (righe 37 e 50–58)

**Risultato:** al mount, `useKV('global-pin-hash', '')` restituisce in modo sincrono il default `''`, che è falsy. L'`useEffect` con array di dipendenze `[]` si esegue una sola volta al mount, valutando `!globalPinHash === true` — quindi imposta sempre `isSetupMode(true)`. Quando il KV store carica il valore reale in modo asincrono, l'effect non si riesegue. Il comportamento errato è deterministico e si manifesta ad ogni refresh.

---

### AI2 — Soluzione scelta: Alternativa C (default `undefined` + `useRef` one-shot)

**Verifica eseguita:** analisi delle tre alternative in sezione 3 del design (`P23-auth-context-pin-persistence-bugfix-design.md`)

**Risultato:** l'Alternativa C risolve la causa radice senza modificare l'interfaccia pubblica né i componenti UI. Il default `undefined` fornisce una sentinella semanticamente corretta per "KV non ancora caricato"; il `useRef` garantisce che l'effect di inizializzazione sia eseguito esattamente una volta, anche quando `globalPinHash` cambia in seguito (es. creazione o cambio PIN).

---

### AI3 — Perché `useRef` e non `useState` per `hasInitialized`

**Verifica eseguita:** analisi del comportamento di `useState` vs `useRef` in React per la logica one-shot richiesta

**Risultato:** `useState(false)` causerebbe un re-render aggiuntivo nel momento in cui `setHasInitialized(true)` viene chiamato, con rischio di race condition. `useRef` è la scelta corretta per i flag di stato imperativo che non devono influenzare il ciclo di rendering: `hasInitialized.current = true` è una mutazione silenziosa che non innesca un re-render. Inoltre, a differenza di variabili `let` a livello di modulo, il `useRef` è scoped al singolo `AuthProvider` — garantendo isolamento tra istanze.

---

### AI4 — `setIsSetupMode(false)` non necessario nel branch login

**Verifica eseguita:** lettura della dichiarazione di stato in `AuthContext.tsx` riga 41

**Risultato:** `isSetupMode` è dichiarato come `useState(false)` — il valore di default è già `false`. Nel branch login, non chiamare `setIsSetupMode` è corretto: il valore rimane al suo default senza necessità di un'assegnazione esplicita. Aggiungere `setIsSetupMode(false)` non sarebbe errato, ma sarebbe ridondante e introduce un'asimmetria visiva nel codice che potrebbe confondere i futuri manutentori.

---

### AI5 — Rimozione commenti e `eslint-disable/enable`

**Verifica eseguita:** analisi dello scenario descritto nella sezione 3.1 del design (Alternativa A) e lettura dei commenti esistenti in `AuthContext.tsx`

**Risultato:** il commento originale motivava `deps: []` con "Aggiungere `globalPinHash` ai deps riaprirebbe il dialog PIN dopo ogni cambio PIN." Con la soluzione adottata, questo problema è risolto dal `useRef`: anche se `globalPinHash` cambia dopo l'inizializzazione, `hasInitialized.current === true` produce un early return prima di qualsiasi effetto collaterale. L'array `[globalPinHash]` è ora **semanticamente corretto** per `react-hooks/exhaustive-deps` e i commenti di override non hanno più ragion d'essere.

---

### AI6 — `handleGlobalPinSubmit` già safe per il tipo `string | undefined`

**Verifica eseguita:** lettura dell'handler in `AuthContext.tsx` (righe 62–90)

**Risultato:** nell'handler, il ramo login contiene `const isValid = await verifyPin(pin, globalPinHash || '')`. Il fallback `|| ''` rende la chiamata safe anche quando `globalPinHash` è `undefined`. Non è necessaria alcuna modifica all'handler; il tipo `string | undefined` del nuovo generic `useKV<string | undefined>` è già gestito correttamente.

---

## Piano operativo dettagliato

### Step 1 — Aggiunta di `useRef` all'import React

**File coinvolto:** `src/context/AuthContext.tsx`  
**Riga interessata:** riga 1

`useRef` è necessario per dichiarare `hasInitialized` (Step 3). L'aggiunta va inserita nella stessa istruzione di import, prima di `ReactNode`, rispettando l'ordine alfabetico degli hook React.

**Prima (riga 1 — attuale):**
```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
```

**Dopo:**
```tsx
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
```

**Motivazione:** aggiungere all'import esistente senza creare un nuovo blocco di import. `ReactNode` rimane l'ultimo elemento prima della keyword `from` per coerenza con lo stile originale.

---

### Step 2 — Modifica default di `useKV` per `globalPinHash`

**File coinvolto:** `src/context/AuthContext.tsx`  
**Riga interessata:** riga 37

Il default `''` non permette di distinguere "KV non ancora caricato" da "KV caricato, nessun PIN configurato". Cambiare il generic e il default per usare `undefined` come sentinella semantica.

**Prima (riga 37 — attuale):**
```tsx
  const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
```

**Dopo:**
```tsx
  const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)
```

**Motivazione:** con `undefined` come default, al mount `globalPinHash === undefined` è il segnale inequivocabile che il KV non ha ancora completato il caricamento. Il tipo `string | undefined` è già presente nella dichiarazione `AuthContextValue` (riga 10) — questa modifica è quindi coerente con l'interfaccia pubblica esistente senza alterarla.

**Impatto su `handleGlobalPinSubmit`:** già safe — usa `globalPinHash || ''` nel ramo login (riga ~79). Nessuna modifica all'handler.

---

### Step 3 — Aggiunta di `hasInitialized` ref

**File coinvolto:** `src/context/AuthContext.tsx`  
**Posizione:** dopo la riga 44 (ultima dichiarazione `useState`), prima della riga con `const screenReader = useScreenReader()`

Il `useRef(false)` fornisce un flag one-shot che impedisce la riesecuzione del corpo dell'`useEffect` di inizializzazione dopo il suo primo completamento. A differenza di `useState`, la mutazione di `.current` non causa re-render.

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

**Motivazione:** posizionare `hasInitialized` prima di `screenReader` mantiene il raggruppamento visivo "stato → ref → hook derivati". Il `useRef` non aggiunge dipendenze all'array dell'`useEffect`.

**Gate intermedio:** dopo i tre step 1–3, eseguire `tsc --noEmit` e verificare 0 errori prima di procedere con la modifica più delicata (Step 4).

---

### Step 4 — Riscrittura dell'`useEffect` di inizializzazione

**File coinvolto:** `src/context/AuthContext.tsx`  
**Righe interessate:** righe 47–58 (commento + eslint-disable + useEffect body + eslint-enable)

Questo è il blocco centrale del bugfix. Il vecchio blocco viene sostituito integralmente: si rimuovono le direttive eslint e i commenti, si riscrive il body e si corregge l'array di dipendenze.

**Prima (righe 47–58 — attuale — CODICE BUGGY):**
```tsx
  // Intenzionale: questo effect deve girare solo al mount per scegliere setup o login iniziale.
  // Aggiungere globalPinHash ai deps riaprirebbe il dialog PIN dopo ogni cambio PIN.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!globalPinHash) {
      setIsSetupMode(true)
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

**Motivazione tecnica, riga per riga:**

| Riga | Ruolo |
|---|---|
| `if (globalPinHash === undefined) return` | Guard di caricamento: esce silenziosamente se il KV non ha ancora restituito il valore reale. Evita l'esecuzione con il default sincrono. |
| `if (hasInitialized.current) return` | Guard one-shot: blocca le riesecuzioni successive (es. dopo cambio PIN). La prima esecuzione con valore definito è l'unica che conta. |
| `hasInitialized.current = true` | Segna l'inizializzazione come completata. Mutazione silenziosa (nessun re-render). |
| `if (!globalPinHash) { setIsSetupMode(true) }` | Solo nel caso "nessun PIN configurato" si imposta la modalità setup. In tutti gli altri casi, `isSetupMode` rimane `false` (il suo default). |
| `setShowPinDialog(true)` | Chiamato fuori dall'if/else: il dialog appare in entrambe le modalità (setup e login). Elimina la duplicazione presente nel codice originale. |
| `}, [globalPinHash])` | Array di dipendenze corretto: l'effect si riesegue ogni volta che `globalPinHash` cambia, ma le guard interne ne controllano l'idempotenza. |

**Gate finale:** `tsc --noEmit` → 0 errori, poi `npm run lint` → 0 problems.

---

## Tabella dei rischi

| Codice | Scenario | Probabilità | Impatto | Mitigazione |
|---|---|---|---|---|
| R1 | Default `undefined` introduce incompatibilità di tipo con usages di `globalPinHash` che assumono `string` | Bassa — `string \| undefined` già dichiarato in `AuthContextValue` e l'handler usa `globalPinHash \|\| ''` | Alto — errore TypeScript in compilazione | Gate `tsc --noEmit` dopo Step 1–3 (prima di modificare l'`useEffect`) |
| R2 | `hasInitialized.current` non resettato al remount | Non applicabile — i `useRef` vengono reinizializzati al mount; `hasInitialized.current` riparte da `false` ad ogni fresh load / F5 | — | Per conferma: verificare Scenario B della verifica manuale (F5 con PIN configurato) |
| R3 | Regressione flusso cambio PIN: dopo setup, `setGlobalPinHash(hash)` aggiorna `globalPinHash` → effect rieseguito → dialog riappare inaspettatamente | Bassa — bloccata da `hasInitialized.current === true` che produce early return | Alto — dialog riaperto inaspettatamente dopo la creazione del PIN | Verificare Scenario D della verifica manuale (navigazione senza ricomparsa del dialog) |
| R4 | Commento eslint-disable non rimosso: l'array `[globalPinHash]` viene ignorato e il comportamento del linter oscura la correzione | Bassa — la sostituzione integrale del blocco include la rimozione dei commenti | Medio — il warning linter rimane silente ma la logica è corretta | Gate `npm run lint` → 0 problems; cercare manualmente `eslint-disable react-hooks/exhaustive-deps` nel file modificato |

---

## Criteri di uscita — Definition of Done

- [ ] **CA-01** — `useRef` è importato da `react` nella riga 1 (insieme a `createContext`, `useContext`, `useState`, `useEffect`, `ReactNode`)
- [ ] **CA-02** — `useKV` per `global-pin-hash` è dichiarato come `useKV<string | undefined>('global-pin-hash', undefined)` — default `undefined`, non `''`
- [ ] **CA-03** — `const hasInitialized = useRef(false)` è presente nel body di `AuthProvider`, prima dell'`useEffect` di inizializzazione
- [ ] **CA-04** — Il commento `// Intenzionale:` (2 righe) e le direttive `/* eslint-disable/enable react-hooks/exhaustive-deps */` sono stati rimossi
- [ ] **CA-05** — L'array di dipendenze dell'`useEffect` di inizializzazione è `[globalPinHash]` (non `[]`)
- [ ] **CA-06** — La prima istruzione dell'`useEffect` è `if (globalPinHash === undefined) return`
- [ ] **CA-07** — La seconda istruzione dell'`useEffect` è `if (hasInitialized.current) return`
- [ ] **CA-08** — La terza istruzione dell'`useEffect` è `hasInitialized.current = true`
- [ ] **CA-09** — `setIsSetupMode(true)` è chiamato solo nel branch `if (!globalPinHash)`; nessun `setIsSetupMode(false)` nel branch login
- [ ] **CA-10** — `setShowPinDialog(true)` è chiamato una sola volta, fuori dall'if/else, come ultima istruzione dell'`useEffect`
- [ ] **CA-11** — L'interfaccia `AuthContextValue` è identica all'originale — nessun campo aggiunto, rimosso o modificato nel tipo
- [ ] **CA-12** — `handleGlobalPinSubmit` è identica all'originale — nessuna riga modificata
- [ ] **CA-13** — `handlePrivatePinSubmit` è identica all'originale — nessuna riga modificata
- [ ] **CA-14** — Il JSX del return di `AuthProvider` è identico all'originale
- [ ] **CA-15** — Nessun altro file nel repository è stato modificato
- [ ] **CA-16** — `tsc --noEmit` → 0 errori dopo la modifica
- [ ] **CA-17** — `npm run lint` → 0 problems (nessun nuovo warning, in particolare nessun `react-hooks/exhaustive-deps`)
- [ ] **CA-18** — Test manuale: F5 con PIN configurato → appare il dialog "Inserisci PIN" (non "Imposta PIN Globale")
- [ ] **Gate lint** — `npm run lint` → `0 problems (0 errors, 0 warnings)` (invariato rispetto a P22)
- [ ] **Gate build** — `npm run build` → exit 0
- [ ] **Gate test** — `npm run test:run` → `5 passed`
- [ ] **Gate manuale** — 4 scenari della sezione 8.5 del design verificati (A: primo avvio; B: F5 con PIN; C: PIN errato; D: navigazione senza ricomparsa dialog)
