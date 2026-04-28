# P23 — Todo List: Bugfix BUG-01 — bootstrap asincrono AuthContext + mock KV allineato

> Passo 23 — Bugfix BUG-01: bootstrap asincrono AuthContext + mock KV allineato
> Piano di riferimento: `docs/2 - coding plans/P23-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P23-design-definitivo-pin-auth.md`
> Branch: `refactoring-architettura`
> Data inizio: —
> Data completamento: —

---

## Prima di iniziare

- [ ] Verificare: `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [ ] Verificare: `npm run test:run` → i test possono essere rossi (BUG-01 attivo), ma il conteggio è noto
- [ ] Leggere il coding plan completo `docs/2 - coding plans/P23-coding-plan.md`

---

## Step 1 — Modifica `src/test/setup.ts`

- [ ] Aggiornare `sparkKvMock.get`: da `async () => undefined` a lookup nel `kvStore`
- [ ] Aggiornare `sparkKvMock.set`: da no-op a scrittura nel `kvStore` con `cloneValue`
- [ ] Aggiornare `sparkKvMock.keys`: da `[]` costante a `Array.from(kvStore.keys())`
- [ ] Confermare: il blocco `vi.mock('@github/spark/hooks', ...)` (mock `useKV`) è invariato
- [ ] Confermare: `resetTestKvStore`, `seedTestKvStore` e `afterEach` sono invariati
- [ ] **Gate:** `npm run test:run` (errore atteso: dialog non nel DOM sincrono, non “globalPinHash undefined”)

---

## Step 2 — Modifica `src/context/AuthContext.tsx`

- [ ] **M1** — Rimuovere `useRef` dall’import React (riga 1)
- [ ] Verifica preventiva: `useRef` appare solo in riga 1 e riga 46 — non altrove
- [ ] **M2** — Cambiare tipo `useKV` per `globalPinHash`: da `useKV<string | undefined>('global-pin-hash', undefined)` a `useKV<string>('global-pin-hash', '')`
- [ ] **M3** — Aggiornare `AuthContextValue`: `globalPinHash: string | undefined` → `string`; rimuovere `?` da `prev`
- [ ] **M4** — Eliminare la riga `const hasInitialized = useRef(false)` (riga 46)
- [ ] **M5** — Aggiungere dopo l’ultima riga di `useState`: `const [isAuthReady, setIsAuthReady] = useState(false)`
- [ ] **M6** — Sostituire integralmente l’`useEffect` di inizializzazione con IIFE asincrona + flag `cancelled` + `deps=[]`
- [ ] Verificare: `handleGlobalPinSubmit` identico all’originale
- [ ] Verificare: `handlePrivatePinSubmit` identico all’originale
- [ ] Verificare: JSX del provider identico — `isAuthReady` NON nel `value`
- [ ] **Gate intermedio:** `tsc --noEmit` → 0 errori

---

## Step 3 — Modifica `src/test/smoke/01-app-renders.test.tsx`

- [ ] Rendere il callback `it(...)` asincrono: `async () => {`
- [ ] `screen.getByRole('dialog')` → `await screen.findByRole('dialog')`
- [ ] `screen.getByText(/Imposta PIN Globale/i)` → `await screen.findByText(/Imposta PIN Globale/i)`
- [ ] Verificare: `screen.getByText(/Crea un PIN per proteggere l’applicazione/i)` rimane sincrono
- [ ] Verificare: `document.querySelector(...)` rimane sincrono

---

## Step 4 — Modifica `src/test/smoke/test-utils.ts`

- [ ] Prima riga di `authenticateWithPin`: da `screen.getByLabelText(/Nuovo PIN/i)` a `await screen.findByLabelText(/Nuovo PIN/i)`
- [ ] Verificare: le righe successive restano sincrone

---

## Verifica locale post-modifica

- [ ] `tsc --noEmit` → 0 errori
- [ ] `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [ ] `npm run build` → exit 0
- [ ] `npm run test:run` → 0 failures
- [ ] Nessun file oltre ai 4 modificati risulta cambiato nel diff
- [ ] I file `02`, `03`, `04`, `05` non sono stati modificati

---

## Verifica manuale (4 scenari)

- [ ] **Scenario 7.1** — Primo avvio (KV vuoto): dialog “Imposta PIN Globale” appare entro 1 s dal mount
- [ ] **Scenario 7.2** — Refresh F5 con PIN configurato: appare dialog “Inserisci PIN” (non setup mode)
- [ ] **Scenario 7.3** — Test con KV vuoto: `findByText(/Imposta PIN Globale/i)` passa senza timeout
- [ ] **Scenario 7.4** — Test con KV seedato: dialog “Inserisci PIN” corretto (non setup mode)

---

## Checklist gate finale

| Gate | Atteso | Effettivo | OK |
|---|---|---|---|
| CA-A01: `useRef` rimosso | `import { createContext, useContext, useState, useEffect, ReactNode }` | — | |
| CA-A02: `useKV<string>` default `''` | `useKV<string>('global-pin-hash', '')` | — | |
| CA-A04: `globalPinHash: string` | Interfaccia `AuthContextValue` | — | |
| CA-A06: `hasInitialized` rimosso | 0 occorrenze nel file | — | |
| CA-A07: `isAuthReady` aggiunto | `useState(false)` presente | — | |
| CA-A08: `isAuthReady` NON nel `value` | 0 occorrenze nel blocco `value={{...}}` | — | |
| CA-A09: `deps=[]` | `}, [])` come ultima riga effect | — | |
| CA-A10: `window.spark.kv.get` | Presente nel body IIFE | — | |
| CA-A11: flag `cancelled` | `let cancelled` + cleanup | — | |
| CA-A13: handler invariati | `handleGlobalPinSubmit` e `handlePrivatePinSubmit` identici | — | |
| CB-01: `sparkKvMock.get` legge `kvStore` | `kvStore.has(key)` nel body | — | |
| CB-03: `sparkKvMock.set` scrive `kvStore` | `kvStore.set(key, ...)` nel body | — | |
| CB-05: `vi.mock` `useKV` invariato | Identico all’originale | — | |
| CC-01: `it(...)` asincrono | `async () => {` nella firma | — | |
| CC-02: `findByRole` | `await screen.findByRole('dialog')` | — | |
| CC-05: `findByLabelText` | `await screen.findByLabelText(/Nuovo PIN/i)` | — | |
| CC-07: file `02-05` non modificati | 0 righe cambiate | — | |
| Gate lint | `0 problems (0 errors, 0 warnings)` | — | |
| Gate build | exit 0 | — | |
| Gate test | 0 failures | — | |
| Gate manuale | 4 scenari verificati | — | |
