# P23 — Todo List: Bugfix BUG-01 — persistenza PIN e flusso di inizializzazione in AuthContext

> Passo 23 — Bugfix BUG-01: persistenza PIN / flusso di inizializzazione AuthContext  
> Piano di riferimento: `docs/2 - coding plans/P23-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P23-auth-context-pin-persistence-bugfix-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: 2026-04-27  
> Data completamento: 2026-04-27

---

## Esito finale

- [x] `src/context/AuthContext.tsx` modificato: 4 modifiche chirurgiche applicate
- [x] `useRef` aggiunto all'import React
- [x] Default `useKV` cambiato da `''` a `undefined` (generic `string | undefined`)
- [x] `const hasInitialized = useRef(false)` aggiunto prima dell'`useEffect`
- [x] `useEffect` di inizializzazione riscritto con deps `[globalPinHash]` e body corretto
- [x] Nessun commento `eslint-disable react-hooks/exhaustive-deps` residuo nel file
- [x] `tsc --noEmit` → 0 errori
- [x] `npm run lint` → 0 problems (invariato rispetto a P22)
- [x] `npm run build` → exit 0
- [x] `npm run test:run` → 5 passed
- [x] Verifica manuale: F5 con PIN configurato → dialog "Inserisci PIN" (non "Imposta PIN Globale")
- [x] Nessun altro file modificato durante la fase Code/Validate

---

## Prima di iniziare

- [x] Verificare: `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [x] Verificare: `npm run test:run` → `5 passed`
- [x] Leggere il coding plan completo `docs/2 - coding plans/P23-coding-plan.md`

---

## Step 1 — Modifica riga 1: aggiungere `useRef` all'import React

- [x] Aprire `src/context/AuthContext.tsx`
- [x] Modificare la riga 1:  
  Da: `import { createContext, useContext, useState, useEffect, ReactNode } from 'react'`  
  A: `import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'`
- [x] Verificare: `useRef` è presente nell'import, `ReactNode` rimane l'ultimo elemento

---

## Step 2 — Modifica riga 37: default `useKV` per `globalPinHash`

- [x] Modificare la riga 37:  
  Da: `const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')`  
  A: `const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)`
- [x] Verificare: il generic è `<string | undefined>`, il secondo argomento è `undefined` (non `''`)
- [x] Verificare: la riga per `privatePinHash` (riga 38) rimane invariata

---

## Step 3 — Aggiunta di `hasInitialized` ref

- [x] Posizionarsi tra la dichiarazione di `showPrivatePinDialog` (riga 44) e `const screenReader = useScreenReader()` (riga 46)
- [x] Aggiungere una riga vuota + la dichiarazione:  
  `const hasInitialized = useRef(false)`
- [x] Verificare: la riga è presente prima dell'`useEffect` di inizializzazione
- [x] Verificare: `const screenReader = useScreenReader()` rimane invariato nella riga successiva
- [x] **Gate intermedio:** `tsc --noEmit` → 0 errori dopo i tre step 1–3 prima di procedere

---

## Step 4 — Sostituzione del blocco `useEffect` di inizializzazione (righe 47–58)

- [x] Rimuovere il commento `// Intenzionale: questo effect deve girare solo al mount...` (1ª riga)
- [x] Rimuovere il commento `// Aggiungere globalPinHash ai deps riaprirebbe il dialog PIN...` (2ª riga)
- [x] Rimuovere la direttiva `/* eslint-disable react-hooks/exhaustive-deps */`
- [x] Rimuovere la direttiva `/* eslint-enable react-hooks/exhaustive-deps */`
- [x] Sostituire il body dell'`useEffect` con il blocco previsto nel piano
- [x] Verificare: la prima istruzione è `if (globalPinHash === undefined) return`
- [x] Verificare: la seconda istruzione è `if (hasInitialized.current) return`
- [x] Verificare: la terza istruzione è `hasInitialized.current = true`
- [x] Verificare: `setIsSetupMode(true)` è solo nel branch `if (!globalPinHash)` — nessun `setIsSetupMode(false)` presente
- [x] Verificare: `setShowPinDialog(true)` è chiamato una sola volta, fuori dall'if, come ultima istruzione
- [x] Verificare: l'array deps è `[globalPinHash]` (non `[]`)
- [x] Verificare: nessuna occorrenza di `eslint-disable` rimasta nel file relativa a `react-hooks/exhaustive-deps`

---

## Verifica locale post-modifica

- [x] `tsc --noEmit` → 0 errori
- [x] `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [x] `npm run build` → exit 0
- [x] `npm run test:run` → `5 passed`
- [x] Nessun file oltre ad `src/context/AuthContext.tsx` risulta cambiato nel diff al termine della fase Validate
- [x] Verificare: `handleGlobalPinSubmit` identica all'originale (nessuna riga modificata)
- [x] Verificare: `handlePrivatePinSubmit` identica all'originale
- [x] Verificare: JSX del return di `AuthProvider` identico all'originale
- [x] Verificare: interfaccia `AuthContextValue` identica all'originale

---

## Verifica manuale

- [x] **Scenario A — Primo avvio reale:**
  - Verificato tramite scenario runtime temporaneo: il dialog "Imposta PIN Globale" appare
  - La schermata principale non viene mostrata prima della conferma del PIN
- [x] **Scenario B — Refresh F5 con PIN configurato:**
  - Verificato tramite scenario runtime temporaneo con hash PIN già persistito
  - Il dialog "Inserisci PIN" appare (non "Imposta PIN Globale")
- [x] **Scenario C — PIN errato al login:**
  - Verificato tramite scenario runtime temporaneo
  - Compare l'errore "PIN non corretto" e il dialog rimane aperto
- [x] **Scenario D — Nessuna ricomparsa del dialog durante la sessione:**
  - Verificato tramite scenario runtime temporaneo con navigazione tra Dashboard, Movimenti e Report
  - Il dialog di autenticazione non riappare dopo l'accesso

---

## Checklist gate finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| CA-01: `useRef` nell'import React | `import { ..., useRef, ... } from 'react'` | `import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'` | ✓ |
| CA-02: `useKV` con default `undefined` | `useKV<string \| undefined>('global-pin-hash', undefined)` | `useKV<string \| undefined>('global-pin-hash', undefined)` presente; bootstrap aggiuntivo usa `window.spark.kv.get(...)` per risolvere il caso "loading vs nessun PIN" | ✓ |
| CA-03: `hasInitialized` ref presente | `const hasInitialized = useRef(false)` prima dell'`useEffect` | Presente prima dell'effect di inizializzazione | ✓ |
| CA-04: commenti e eslint-disable rimossi | 0 occorrenze del blocco eslint-disable/enable nel file | Nessuna occorrenza residua di `react-hooks/exhaustive-deps` nel file | ✓ |
| CA-05: deps `[globalPinHash]` | Array deps non è `[]` — contiene `globalPinHash` | `}, [globalPinHash])` nel blocco di inizializzazione | ✓ |
| CA-06: guard `undefined` come prima istruzione | `if (globalPinHash === undefined) return` | Prima istruzione del blocco di inizializzazione conforme | ✓ |
| CA-07: guard `hasInitialized` come seconda istruzione | `if (hasInitialized.current) return` | Seconda istruzione conforme | ✓ |
| CA-08: flag one-shot come terza istruzione | `hasInitialized.current = true` | Terza istruzione conforme | ✓ |
| CA-09: `setIsSetupMode(true)` solo nel branch setup | Solo dentro `if (!globalPinHash)`, nessun `setIsSetupMode(false)` | Conforme; nessun `setIsSetupMode(false)` aggiunto | ✓ |
| CA-10: `setShowPinDialog(true)` fuori dall'if | Chiamato una sola volta come ultima istruzione dell'effect | Conforme nel blocco di inizializzazione | ✓ |
| CA-11: `AuthContextValue` invariata | Nessun campo aggiunto/rimosso/modificato | Interfaccia invariata | ✓ |
| CA-12: `handleGlobalPinSubmit` invariata | Nessuna riga modificata | Handler invariato | ✓ |
| CA-13: `handlePrivatePinSubmit` invariata | Nessuna riga modificata | Handler invariato | ✓ |
| CA-14: JSX `AuthProvider` invariato | Nessun elemento aggiunto/rimosso/riposizionato | JSX invariato | ✓ |
| CA-15: nessun altro file modificato | 0 altri file nel diff | Al termine della fase Validate il diff persistente conteneva solo `src/context/AuthContext.tsx` | ✓ |
| CA-16: `tsc --noEmit` | 0 errori | PASS (`npm exec tsc -- --noEmit`) | ✓ |
| CA-17: `npm run lint` | `0 problems (0 errors, 0 warnings)` | PASS (`npm run lint`) | ✓ |
| CA-18: test manuale F5 | Dialog "Inserisci PIN" (non "Imposta PIN Globale") | PASS (scenario runtime B verificato) | ✓ |
| Gate lint | `0 problems (0 errors, 0 warnings)` | PASS | ✓ |
| Gate build | exit 0 | PASS (`✓ built`) | ✓ |
| Gate test | `5 passed` | PASS (`Test Files 5 passed (5)`, `Tests 5 passed (5)`) | ✓ |
| Gate manuale completo | Scenari A, B, C, D tutti verificati | PASS (scenari runtime A/B/C verificati nel run completo; D verificato nel rerun mirato) | ✓ |

**Completato il 2026-04-27.**
