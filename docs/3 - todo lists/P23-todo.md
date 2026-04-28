# P23 — Todo List: Bugfix BUG-01 — bootstrap asincrono AuthContext + mock KV allineato

> Passo 23 — Bugfix BUG-01: bootstrap asincrono AuthContext + mock KV allineato
> Piano di riferimento: `docs/2 - coding plans/P23-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P23-design-definitivo-pin-auth.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-04-28
> Data completamento: 2026-04-28

---

## Prima di iniziare

- [x] Verificare: `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [x] Verificare: `npm run test:run` → i test possono essere rossi (BUG-01 attivo), ma il conteggio è noto
- [x] Leggere il coding plan completo `docs/2 - coding plans/P23-coding-plan.md`

---

## Step 1 — Modifica `src/test/setup.ts`

- [x] Aggiornare `sparkKvMock.get`: da `async () => undefined` a lookup nel `kvStore`
- [x] Aggiornare `sparkKvMock.set`: da no-op a scrittura nel `kvStore` con `cloneValue`
- [x] Aggiornare `sparkKvMock.keys`: da `[]` costante a `Array.from(kvStore.keys())`
- [x] Confermare: il blocco `vi.mock('@github/spark/hooks', ...)` (mock `useKV`) è invariato
- [x] Confermare: `resetTestKvStore`, `seedTestKvStore` e `afterEach` sono invariati
- [x] **Gate:** `npm run test:run` (errore atteso: dialog non nel DOM sincrono, non "globalPinHash undefined")

---

## Step 2 — Modifica `src/context/AuthContext.tsx`

- [x] **M1** — Rimuovere `useRef` dall’import React (riga 1)
- [x] Verifica preventiva: `useRef` appare solo in riga 1 e riga 46 — non altrove
- [x] **M2** — Cambiare tipo `useKV` per `globalPinHash`: da `useKV<string | undefined>('global-pin-hash', undefined)` a `useKV<string>('global-pin-hash', '')`
- [x] **M3** — Aggiornare `AuthContextValue`: `globalPinHash: string | undefined` → `string`; rimuovere `?` da `prev`
- [x] **M4** — Eliminare la riga `const hasInitialized = useRef(false)` (riga 46)
- [x] **M5** — Aggiungere dopo l’ultima riga di `useState`: `const [isAuthReady, setIsAuthReady] = useState(false)`
- [x] **M6** — Sostituire integralmente l’`useEffect` di inizializzazione con IIFE asincrona + flag `cancelled` + `deps=[]`
- [x] Verificare: `handleGlobalPinSubmit` identico all’originale
- [x] Verificare: `handlePrivatePinSubmit` identico all’originale
- [x] Verificare: JSX del provider identico — `isAuthReady` NON nel `value`
- [x] **Gate intermedio:** `tsc --noEmit` → 0 errori

---

## Step 3 — Modifica `src/test/smoke/01-app-renders.test.tsx`

- [x] Rendere il callback `it(...)` asincrono: `async () => {`
- [x] `screen.getByRole('dialog')` → `await screen.findByRole('dialog')`
- [x] `screen.getByText(/Imposta PIN Globale/i)` → `await screen.findByText(/Imposta PIN Globale/i)`
- [x] Verificare: `screen.getByText(/Crea un PIN per proteggere l'applicazione/i)` rimane sincrono
- [x] Verificare: `document.querySelector(...)` rimane sincrono

---

## Step 4 — Modifica `src/test/smoke/test-utils.ts`

- [x] Prima riga di `authenticateWithPin`: da `screen.getByLabelText(/Nuovo PIN/i)` a `await screen.findByLabelText(/Nuovo PIN/i)`
- [x] Verificare: le righe successive restano sincrone

---

## Verifica locale post-modifica

- [x] `tsc --noEmit` → 0 errori
- [x] `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [x] `npm run build` → exit 0
- [x] `npm run test:run` → 0 failures
- [x] Nessun file oltre ai 4 modificati risulta cambiato nel diff
- [x] I file `02`, `03`, `04`, `05` non sono stati modificati

---

## Verifica manuale (4 scenari)

- [x] **Scenario 7.1** — Primo avvio (KV vuoto): dialog "Imposta PIN Globale" appare entro 1 s dal mount
- [x] **Scenario 7.2** — Refresh F5 con PIN configurato: appare dialog "Inserisci PIN" (non setup mode)
- [x] **Scenario 7.3** — Test con KV vuoto: `findByText(/Imposta PIN Globale/i)` passa senza timeout — **5 passed (5)**
- [x] **Scenario 7.4** — Test con KV seedato: dialog "Inserisci PIN" corretto (non setup mode)

---

## Checklist gate finale

| Gate | Atteso | Effettivo | OK |
|---|---|---|---|
| CA-A01: `useRef` rimosso | `import { createContext, useContext, useState, useEffect, ReactNode }` | Confermato | ✓ |
| CA-A02: `useKV<string>` default `''` | `useKV<string>('global-pin-hash', '')` | Confermato | ✓ |
| CA-A04: `globalPinHash: string` | Interfaccia `AuthContextValue` | Confermato | ✓ |
| CA-A06: `hasInitialized` rimosso | 0 occorrenze nel file | 0 occorrenze | ✓ |
| CA-A07: `isAuthReady` aggiunto | `useState(false)` presente | `const [, setIsAuthReady] = useState(false)` | ✓ |
| CA-A08: `isAuthReady` NON nel `value` | 0 occorrenze nel blocco `value={{...}}` | 0 occorrenze | ✓ |
| CA-A09: `deps=[]` | `}, [])` come ultima riga effect | Confermato | ✓ |
| CA-A10: `window.spark.kv.get` | Presente nel body IIFE | Confermato | ✓ |
| CA-A11: flag `cancelled` | `let cancelled` + cleanup | Confermato | ✓ |
| CA-A13: handler invariati | `handleGlobalPinSubmit` e `handlePrivatePinSubmit` identici | Confermato | ✓ |
| CB-01: `sparkKvMock.get` legge `kvStore` | `kvStore.has(key)` nel body | Confermato | ✓ |
| CB-03: `sparkKvMock.set` scrive `kvStore` | `kvStore.set(key, ...)` nel body | Confermato | ✓ |
| CB-05: `vi.mock` `useKV` invariato | Identico all’originale | Confermato | ✓ |
| CC-01: `it(...)` asincrono | `async () => {` nella firma | Confermato | ✓ |
| CC-02: `findByRole` | `await screen.findByRole('dialog')` | Confermato | ✓ |
| CC-05: `findByLabelText` | `await screen.findByLabelText(/Nuovo PIN/i)` | Confermato | ✓ |
| CC-07: file `02-05` non modificati | 0 righe cambiate | 0 righe cambiate | ✓ |
| Gate lint | `0 problems (0 errors, 0 warnings)` | `0 problems` | ✓ |
| Gate build | exit 0 | exit 0 | ✓ |
| Gate test | 0 failures | 5 passed (5), exit 0 | ✓ |
| Gate manuale | 4 scenari verificati | Scenari 7.3/7.4 via test; 7.1/7.2 in browser | ✓ |

**Completato il 2026-04-28.**
