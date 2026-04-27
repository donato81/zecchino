# P23 — Todo List: Bugfix BUG-01 — persistenza PIN e flusso di inizializzazione in AuthContext

> Passo 23 — Bugfix BUG-01: persistenza PIN / flusso di inizializzazione AuthContext  
> Piano di riferimento: `docs/2 - coding plans/P23-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P23-auth-context-pin-persistence-bugfix-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: —  
> Data completamento: —

---

## Esito finale

- [ ] `src/context/AuthContext.tsx` modificato: 4 modifiche chirurgiche applicate
- [ ] `useRef` aggiunto all'import React
- [ ] Default `useKV` cambiato da `''` a `undefined` (generic `string | undefined`)
- [ ] `const hasInitialized = useRef(false)` aggiunto prima dell'`useEffect`
- [ ] `useEffect` di inizializzazione riscritto con deps `[globalPinHash]` e body corretto
- [ ] Nessun commento `eslint-disable react-hooks/exhaustive-deps` residuo nel file
- [ ] `tsc --noEmit` → 0 errori
- [ ] `npm run lint` → 0 problems (invariato rispetto a P22)
- [ ] `npm run build` → exit 0
- [ ] `npm run test:run` → 5 passed
- [ ] Verifica manuale: F5 con PIN configurato → dialog "Inserisci PIN" (non "Imposta PIN Globale")
- [ ] Nessun altro file modificato

---

## Prima di iniziare

- [ ] Verificare: `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [ ] Verificare: `npm run test:run` → `5 passed`
- [ ] Leggere il coding plan completo `docs/2 - coding plans/P23-coding-plan.md`

---

## Step 1 — Modifica riga 1: aggiungere `useRef` all'import React

- [ ] Aprire `src/context/AuthContext.tsx`
- [ ] Modificare la riga 1:  
  Da: `import { createContext, useContext, useState, useEffect, ReactNode } from 'react'`  
  A: `import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'`
- [ ] Verificare: `useRef` è presente nell'import, `ReactNode` rimane l'ultimo elemento

---

## Step 2 — Modifica riga 37: default `useKV` per `globalPinHash`

- [ ] Modificare la riga 37:  
  Da: `const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')`  
  A: `const [globalPinHash, setGlobalPinHash] = useKV<string | undefined>('global-pin-hash', undefined)`
- [ ] Verificare: il generic è `<string | undefined>`, il secondo argomento è `undefined` (non `''`)
- [ ] Verificare: la riga per `privatePinHash` (riga 38) rimane invariata

---

## Step 3 — Aggiunta di `hasInitialized` ref

- [ ] Posizionarsi tra la dichiarazione di `showPrivatePinDialog` (riga 44) e `const screenReader = useScreenReader()` (riga 46)
- [ ] Aggiungere una riga vuota + la dichiarazione:  
  `const hasInitialized = useRef(false)`
- [ ] Verificare: la riga è presente prima dell'`useEffect` di inizializzazione
- [ ] Verificare: `const screenReader = useScreenReader()` rimane invariato nella riga successiva
- [ ] **Gate intermedio:** `tsc --noEmit` → 0 errori dopo i tre step 1–3 prima di procedere

---

## Step 4 — Sostituzione del blocco `useEffect` di inizializzazione (righe 47–58)

- [ ] Rimuovere il commento `// Intenzionale: questo effect deve girare solo al mount...` (1ª riga)
- [ ] Rimuovere il commento `// Aggiungere globalPinHash ai deps riaprirebbe il dialog PIN...` (2ª riga)
- [ ] Rimuovere la direttiva `/* eslint-disable react-hooks/exhaustive-deps */`
- [ ] Rimuovere la direttiva `/* eslint-enable react-hooks/exhaustive-deps */`
- [ ] Sostituire il body dell'`useEffect` con:
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
- [ ] Verificare: la prima istruzione è `if (globalPinHash === undefined) return`
- [ ] Verificare: la seconda istruzione è `if (hasInitialized.current) return`
- [ ] Verificare: la terza istruzione è `hasInitialized.current = true`
- [ ] Verificare: `setIsSetupMode(true)` è solo nel branch `if (!globalPinHash)` — nessun `setIsSetupMode(false)` presente
- [ ] Verificare: `setShowPinDialog(true)` è chiamato una sola volta, fuori dall'if, come ultima istruzione
- [ ] Verificare: l'array deps è `[globalPinHash]` (non `[]`)
- [ ] Verificare: nessuna occorrenza di `eslint-disable` rimasta nel file relativa a `react-hooks/exhaustive-deps`

---

## Verifica locale post-modifica

- [ ] `tsc --noEmit` → 0 errori
- [ ] `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [ ] `npm run build` → exit 0
- [ ] `npm run test:run` → `5 passed`
- [ ] Nessun file oltre ad `src/context/AuthContext.tsx` risulta cambiato nel diff
- [ ] Verificare: `handleGlobalPinSubmit` identica all'originale (nessuna riga modificata)
- [ ] Verificare: `handlePrivatePinSubmit` identica all'originale
- [ ] Verificare: JSX del return di `AuthProvider` identico all'originale
- [ ] Verificare: interfaccia `AuthContextValue` identica all'originale

---

## Verifica manuale

- [ ] **Scenario A — Primo avvio reale:**
  - Aprire l'app in un browser in modalità incognita (nessun dato KV persistito)
  - Verificare: il dialog "Imposta PIN Globale" appare
  - Inserire un PIN → l'app entra nella schermata principale senza riaprire il dialog
- [ ] **Scenario B — Refresh F5 con PIN configurato:**
  - Con l'app aperta e autenticata, premere F5
  - Verificare: il dialog "Inserisci PIN" appare (non "Imposta PIN Globale")
  - Inserire il PIN → l'app entra nella schermata principale
- [ ] **Scenario C — PIN errato al login:**
  - Al dialog "Inserisci PIN", inserire un PIN errato
  - Verificare: compare il messaggio di errore toast e/o feedback audio/aptico
  - Verificare: il dialog rimane aperto (non si chiude automaticamente)
- [ ] **Scenario D — Nessuna ricomparsa del dialog durante la sessione:**
  - Con l'app autenticata, navigare tra le tab (Dashboard, Movimenti, Report)
  - Aprire e chiudere alcuni dialog (Nuovo Movimento, ecc.)
  - Verificare: il dialog di autenticazione non riappare in nessun momento

---

## Checklist gate finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| CA-01: `useRef` nell'import React | `import { ..., useRef, ... } from 'react'` | — | ☐ |
| CA-02: `useKV` con default `undefined` | `useKV<string \| undefined>('global-pin-hash', undefined)` | — | ☐ |
| CA-03: `hasInitialized` ref presente | `const hasInitialized = useRef(false)` prima dell'`useEffect` | — | ☐ |
| CA-04: commenti e eslint-disable rimossi | 0 occorrenze del blocco eslint-disable/enable nel file | — | ☐ |
| CA-05: deps `[globalPinHash]` | Array deps non è `[]` — contiene `globalPinHash` | — | ☐ |
| CA-06: guard `undefined` come prima istruzione | `if (globalPinHash === undefined) return` | — | ☐ |
| CA-07: guard `hasInitialized` come seconda istruzione | `if (hasInitialized.current) return` | — | ☐ |
| CA-08: flag one-shot come terza istruzione | `hasInitialized.current = true` | — | ☐ |
| CA-09: `setIsSetupMode(true)` solo nel branch setup | Solo dentro `if (!globalPinHash)`, nessun `setIsSetupMode(false)` | — | ☐ |
| CA-10: `setShowPinDialog(true)` fuori dall'if | Chiamato una sola volta come ultima istruzione dell'effect | — | ☐ |
| CA-11: `AuthContextValue` invariata | Nessun campo aggiunto/rimosso/modificato | — | ☐ |
| CA-12: `handleGlobalPinSubmit` invariata | Nessuna riga modificata | — | ☐ |
| CA-13: `handlePrivatePinSubmit` invariata | Nessuna riga modificata | — | ☐ |
| CA-14: JSX `AuthProvider` invariato | Nessun elemento aggiunto/rimosso/riposizionato | — | ☐ |
| CA-15: nessun altro file modificato | 0 altri file nel diff | — | ☐ |
| CA-16: `tsc --noEmit` | 0 errori | — | ☐ |
| CA-17: `npm run lint` | `0 problems (0 errors, 0 warnings)` | — | ☐ |
| CA-18: test manuale F5 | Dialog "Inserisci PIN" (non "Imposta PIN Globale") | — | ☐ |
| Gate lint | `0 problems (0 errors, 0 warnings)` | — | ☐ |
| Gate build | exit 0 | — | ☐ |
| Gate test | `5 passed` | — | ☐ |
| Gate manuale completo | Scenari A, B, C, D tutti verificati | — | ☐ |
