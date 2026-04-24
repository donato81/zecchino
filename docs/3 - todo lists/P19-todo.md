# P19 — Todo List: Introduzione Vitest e 5 smoke test

> Passo 19 — Vitest: infrastruttura di test e 5 smoke test  
> Piano di riferimento: `docs/2 - coding plans/P19-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P19-vitest-smoke-tests-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: —  
> Data completamento: —

---

## Prima di iniziare

- [ ] Rileggere `docs/2 - coding plans/P19-coding-plan.md` (tutte le sezioni AI1–AI10 e i rischi R1–R6)
- [ ] Rileggere `docs/1 - projects/P19-vitest-smoke-tests-design.md` §4 (mock) e §5 (dettaglio test)
- [ ] Verificare di essere sul branch `refactoring-architettura`
- [ ] Eseguire `npm run build` → atteso exit 0 (baseline pulita)
- [ ] Eseguire `npm run lint` → annotare il numero esatto di warning (baseline P18: 56)
  - Baseline effettiva misurata: ___ warning
- [ ] Eseguire `git status` → working tree pulito (nessun file modificato non committato)
- [ ] Verificare che `vitest.config.ts` **non esista** ancora in root
- [ ] Verificare che la cartella `src/test/` **non esista** ancora

---

## A — Configurazione infrastruttura

> ⚠️ Il mock di `useKV` è il prerequisito fondativo dell'intera suite di test.
> Senza di esso, tutti e 5 i test falliscono prima dell'esecuzione con errore di
> modulo mancante. Completare A e B integralmente prima di scrivere qualsiasi test.

### A.1 — Installazione dipendenze

- [ ] Eseguire:
  ```
  npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
  ```
- [ ] Verificare che i 6 pacchetti compaiano nella sezione `devDependencies` di `package.json`
- [ ] Verificare che `node_modules` sia aggiornato (nessun errore di `npm install`)
- [ ] Annotare le versioni effettivamente installate (da `package.json` post-install)

### A.2 — Creazione `vitest.config.ts`

- [ ] Creare `vitest.config.ts` in root del progetto (accanto a `vite.config.ts`)
- [ ] Import: `defineConfig` da `'vitest/config'` (**non** da `'vite'`)
- [ ] Import: `react` da `'@vitejs/plugin-react-swc'`
- [ ] Import: `resolve` da `'path'`
- [ ] Plugin: solo `react()` — ⚠️ NON includere `tailwindcss()`, `sparkPlugin()`, `createIconImportProxy()`
- [ ] `test.environment`: `'jsdom'`
- [ ] `test.setupFiles`: `['./src/test/setup.ts']`
- [ ] `test.globals`: `true`
- [ ] `test.include`: `['src/test/**/*.test.{ts,tsx}']`
- [ ] `resolve.alias`: `{ '@': resolve(import.meta.dirname, 'src') }` — usare `import.meta.dirname` direttamente (**non** `process.env.PROJECT_ROOT`)

### A.3 — Aggiunta script a `package.json`

- [ ] Aprire `package.json` e localizzare la sezione `scripts`
- [ ] Aggiungere dopo `"preview"`:
  - `"test": "vitest"`
  - `"test:run": "vitest run"`
- [ ] Verificare che gli script esistenti (`dev`, `kill`, `build`, `lint`, `optimize`, `preview`) siano invariati

### A.4 — Aggiunta `"types"` a `tsconfig.json`

- [ ] Aprire `tsconfig.json` e localizzare `compilerOptions`
- [ ] Aggiungere dopo il campo `"paths"`:
  ```json
  "types": ["@testing-library/jest-dom"]
  ```
- [ ] Verificare che il campo `"include": ["src"]` sia invariato
- [ ] Verificare che il campo `"paths": { "@/*": ["./src/*"] }` sia invariato

### A.5 — Verifica intermedia A

- [ ] Eseguire `npm run build`
  - ✅ Exit 0 → procedere alla sezione B
  - ❌ Errore TypeScript su `@testing-library/jest-dom` → verificare che A.1 sia completato e i pacchetti installati
  - ❌ Errore di sintassi JSON in `tsconfig.json` → verificare la virgola dopo `"paths"`

---

## B — Setup globale

> ⚠️ Il mock di `useKV` in questo file è la chiave dell'intera suite.
> Il percorso `'@github/spark/hooks'` nel `vi.mock(...)` deve corrispondere
> **esattamente** all'import nei file sorgente (riga 2 di `AuthContext.tsx`
> e riga 2 di `AppDataContext.tsx`). Qualsiasi differenza fa fallire tutti i test.

### B.1 — Creazione cartelle

- [ ] Creare la cartella `src/test/`
- [ ] Creare la cartella `src/test/smoke/`
  - Su PowerShell: `New-Item -ItemType Directory -Path src\test\smoke -Force`

### B.2 — Creazione `src/test/setup.ts`

- [ ] Creare `src/test/setup.ts`
- [ ] Aggiungere import di `@testing-library/jest-dom` (prima riga)
- [ ] Aggiungere `vi.mock('@github/spark/hooks', ...)` — percorso esatto
  - La funzione factory restituisce `{ useKV: vi.fn((_key, defaultValue) => [defaultValue, vi.fn()]) }`
  - ⚠️ `vi.mock()` deve essere nel corpo del modulo (non dentro una funzione)
  - ⚠️ Il setter restituito è `vi.fn()` (no-op) — non lancia eccezioni
- [ ] Verificare che il file non contenga altro codice (nessun test, nessuna export)

### B.3 — Verifica intermedia B

- [ ] Eseguire `npm run test:run`
  - ✅ Output `"No test files found"` o `"0 tests"` → mock funzionante, procedere a C
  - ❌ `Cannot find module '@github/spark/hooks'` → il mock non è applicato; verificare che `setupFiles` in `vitest.config.ts` punti a `'./src/test/setup.ts'`
  - ❌ `Error: [...] is not a function` → la struttura del mock non è corretta; verificare il factory di `vi.mock`

---

## C — Scrittura dei 5 test smoke

> ⚠️ Scrivere i test **in ordine**: prima 01, poi 02, poi 03, poi 04, poi 05.
> Non scrivere tutti i file e poi verificare: eseguire `npm run test:run`
> dopo ogni file per individuare immediatamente eventuali problemi.
>
> ⚠️ La funzione `authenticateWithPin()` è definita in C.2 e riutilizzata
> da C.3, C.4 e C.5. Definirla bene in C.2 prima di procedere.

### C.1 — `src/test/smoke/01-app-renders.test.tsx`

> Test passivo: nessuna interazione utente. Verifica che il rendering iniziale
> mostri la schermata di autenticazione.

- [ ] Creare `src/test/smoke/01-app-renders.test.tsx`
- [ ] Import: `render`, `screen` da `'@testing-library/react'`
- [ ] Import: `App` da `'@/App'` (default import)
- [ ] Wrappare in `describe('App renders', () => { ... })`
- [ ] Test 1: "dovrebbe mostrare la schermata di autenticazione al mount"
  - [ ] `render(<App />)`
  - [ ] `screen.getByRole('main', { name: /Schermata di autenticazione Zecchino/i })`
  - [ ] `screen.getByRole('dialog')`
  - [ ] `screen.getByText(/Imposta PIN Globale/i)`
  - [ ] `screen.getByText(/Crea un PIN per proteggere l'applicazione/i)`
- [ ] Eseguire `npm run test:run`
  - ✅ `1 passed` → procedere a C.2
  - ❌ Elemento non trovato → verificare il mock di `useKV` e l'albero dei provider in `App.tsx`

### C.2 — `src/test/smoke/02-authentication.test.tsx`

> Test interattivo: flusso PIN in setup mode → `isAuthenticated = true` → Dashboard visibile.
> **Definire qui le funzioni `renderApp()` e `authenticateWithPin(pin)`.**

- [ ] Creare `src/test/smoke/02-authentication.test.tsx`
- [ ] Import: `render`, `screen` da `'@testing-library/react'`
- [ ] Import: `userEvent` da `'@testing-library/user-event'`
- [ ] Import: `App` da `'@/App'`
- [ ] Definire funzione `authenticateWithPin(user, pin: string)`:
  - Riceve l'istanza `user` di `userEvent.setup()` e il PIN come stringa
  - `await user.type(screen.getByLabelText(/Nuovo PIN/i), pin)`
  - `await user.type(screen.getByLabelText(/Conferma PIN/i), pin)`
  - `await user.click(screen.getByRole('button', { name: /Conferma/i }))`
  - `await screen.findByText(/I Tuoi Conti/i)` — attende il re-render asincrono post-`hashPin`
- [ ] Test 2: "dovrebbe autenticare con PIN e mostrare la Dashboard"
  - [ ] `const user = userEvent.setup()`
  - [ ] `render(<App />)`
  - [ ] Chiamare `await authenticateWithPin(user, '1234')`
  - [ ] Verifica finale: `screen.getByText(/I Tuoi Conti/i)` visibile
  - [ ] Verifica che `AuthScreen` non sia più presente:
    `expect(screen.queryByRole('main', { name: /Schermata di autenticazione/i })).not.toBeInTheDocument()`
- [ ] Eseguire `npm run test:run`
  - ✅ `2 passed` → procedere a C.3
  - ❌ Timeout su `findByText(/I Tuoi Conti/)` → `hashPin` non ha completato o `setIsAuthenticated` non è stato chiamato; verificare i due campi del form e il pulsante "Conferma"
  - ❌ "I PIN non corrispondono" nel DOM → il campo "Conferma PIN" non è stato compilato

### C.3 — `src/test/smoke/03-dashboard-tab.test.tsx`

> Con autenticazione simulata, verifica la struttura principale della tab Dashboard.

- [ ] Creare `src/test/smoke/03-dashboard-tab.test.tsx`
- [ ] Import: `render`, `screen` da `'@testing-library/react'`
- [ ] Import: `userEvent` da `'@testing-library/user-event'`
- [ ] Import: `App` da `'@/App'`
- [ ] Import (o ripetizione locale): funzione `authenticateWithPin`
- [ ] Test 3: "dovrebbe mostrare le sezioni principali della Dashboard"
  - [ ] Setup + render + autenticazione
  - [ ] `screen.getByRole('heading', { level: 2, name: /I Tuoi Conti/i })`
  - [ ] `screen.getByText(/Nessun conto disponibile/i)` — stato vuoto
  - [ ] `screen.getByRole('heading', { level: 3, name: /Movimenti Recenti/i })`
  - [ ] `screen.getByText(/Nessun movimento registrato/i)` — stato vuoto
- [ ] Eseguire `npm run test:run`
  - ✅ `3 passed` → procedere a C.4
  - ❌ Heading non trovato → verificare il livello (`h2` o `h3`) nei selettori e il testo esatto in `DashboardTab.tsx` (AI7)

### C.4 — `src/test/smoke/04-transactions-tab.test.tsx`

> Con autenticazione simulata, naviga sulla tab Movimenti e verifica i controlli principali.

- [ ] Creare `src/test/smoke/04-transactions-tab.test.tsx`
- [ ] Import: `render`, `screen` da `'@testing-library/react'`
- [ ] Import: `userEvent` da `'@testing-library/user-event'`
- [ ] Import: `App` da `'@/App'`
- [ ] Import (o ripetizione locale): funzione `authenticateWithPin`
- [ ] Test 4: "dovrebbe mostrare la tab Movimenti con i controlli di aggiunta"
  - [ ] Setup + render + autenticazione
  - [ ] Trovare tab Movimenti: `screen.getByRole('tab', { name: /Movimenti\./i })` ← il punto è parte dell'aria-label
  - [ ] `await user.click(tabMovimenti)`
  - [ ] `await screen.findByRole('heading', { level: 2, name: /Tutti i Movimenti/i })` — asincrono
  - [ ] `screen.getByRole('button', { name: /Aggiungi nuovo movimento/i })` — sincrono dopo il render
  - [ ] `screen.getByText(/Nessun movimento da visualizzare/i)` — stato vuoto
- [ ] Eseguire `npm run test:run`
  - ✅ `4 passed` → procedere a C.5
  - ❌ Tab non trovata → verificare che il selettore della tab usi il partial match dell'aria-label (AI8: l'aria-label inizia con "Movimenti.")

### C.5 — `src/test/smoke/05-private-account.test.tsx`

> Verifica che il conto privato sia nascosto per default e visibile dopo sblocco.
> ⚠️ Mock locale per `accounts` — non deve propagarsi agli altri test.

- [ ] Creare `src/test/smoke/05-private-account.test.tsx`
- [ ] Import: `render`, `screen` da `'@testing-library/react'`
- [ ] Import: `userEvent` da `'@testing-library/user-event'`
- [ ] Import: `App` da `'@/App'`
- [ ] Import: `type Account` da `'@/lib/types'`
- [ ] Import (o ripetizione locale): funzione `authenticateWithPin`
- [ ] Definire oggetto `accountPrivatoTest: Account` con tutti e 7 i campi (AI9):
  - `id: 'test-priv-1'`, `nome: 'Conto Segreto'`, `tipo: 'privato'`
  - `saldoIniziale: 0`, `valuta: 'EUR'`, `isPrivato: true`, `dataCreazione: '2024-01-01'`
- [ ] `beforeEach`: sovrascrivere il mock di `useKV` per restituire `[[accountPrivatoTest], vi.fn()]` quando la chiave è `'accounts'`
- [ ] `afterEach`: `vi.restoreAllMocks()` per ripristinare il mock globale
- [ ] Test 5: "dovrebbe nascondere il conto privato per default e mostrarlo dopo lo sblocco"
  - [ ] Setup + render + autenticazione (`authenticateWithPin`)
  - [ ] `expect(screen.queryByText(/Conto Segreto/i)).not.toBeInTheDocument()` — conto nascosto
  - [ ] `screen.getByRole('button', { name: /Sblocca conto privato/i })` — pulsante presente
  - [ ] `await user.click(pulsanteSblocco)`
  - [ ] Dialog PIN privato appare — trovare campo: `screen.getByLabelText(/Nuovo PIN/i)` (setup mode, confirmMode)
  - [ ] `await user.type(campoPIN, '5678')`
  - [ ] `await user.type(screen.getByLabelText(/Conferma PIN/i), '5678')`
  - [ ] `await user.click(screen.getByRole('button', { name: /Conferma/i }))`
  - [ ] `await screen.findByText(/Conto Segreto/i)` — conto ora visibile
- [ ] Eseguire `npm run test:run`
  - ✅ `5 passed` → procedere a D
  - ❌ "Conto Segreto" visibile prima dello sblocco → il mock locale di `accounts` non è configurato correttamente o `isPrivato: true` non è nel record
  - ❌ Pulsante sblocco non trovato → `hasPrivateAccount` è `false`; verificare che il mock restituisca l'account nella chiave `'accounts'`
  - ❌ Dialog PIN privato non trovato → verificare `DialogsOverlay` nel DOM; usare `screen.debug()` per ispezionare

---

## D — Verifica finale

> Tutte le sotto-operazioni A, B, C completate con test verdi.

### D.1 — Test completi

- [ ] Eseguire `npm run test:run`
  - ✅ `5 passed, 0 failed` → exit 0
  - Annotare il tempo di esecuzione totale

### D.2 — Test in ordine inverso (assenza dipendenze inter-test)

- [ ] Eseguire i test in ordine inverso:
  ```
  npx vitest run src/test/smoke/05-private-account.test.tsx src/test/smoke/04-transactions-tab.test.tsx src/test/smoke/03-dashboard-tab.test.tsx src/test/smoke/02-authentication.test.tsx src/test/smoke/01-app-renders.test.tsx
  ```
  - ✅ `5 passed` → test indipendenti

### D.3 — Isolamento singolo file

- [ ] Eseguire ogni test in isolamento:
  - `npx vitest run src/test/smoke/01-app-renders.test.tsx` → 1 passed
  - `npx vitest run src/test/smoke/02-authentication.test.tsx` → 1 passed
  - `npx vitest run src/test/smoke/03-dashboard-tab.test.tsx` → 1 passed
  - `npx vitest run src/test/smoke/04-transactions-tab.test.tsx` → 1 passed
  - `npx vitest run src/test/smoke/05-private-account.test.tsx` → 1 passed

### D.4 — Build e lint

- [ ] Eseguire `npm run build` → exit 0
- [ ] Eseguire `npm run lint` → exit 0, annotare il numero di warning
  - Atteso: ≤ 56 warning (nessuna regressione rispetto alla baseline post-P18)
  - ⚠️ I file di test possono introdurre nuovi warning. Se il conteggio supera 56, investigare quale file di test causa il problema.

### D.5 — Integrità repository

- [ ] Eseguire `git diff --stat`
- [ ] Verificare che compaiano **esattamente** 9 file:
  - 2 file modificati:
    - [x] `package.json`
    - [x] `tsconfig.json`
  - 7 file nuovi:
    - [x] `vitest.config.ts`
    - [x] `src/test/setup.ts`
    - [x] `src/test/smoke/01-app-renders.test.tsx`
    - [x] `src/test/smoke/02-authentication.test.tsx`
    - [x] `src/test/smoke/03-dashboard-tab.test.tsx`
    - [x] `src/test/smoke/04-transactions-tab.test.tsx`
    - [x] `src/test/smoke/05-private-account.test.tsx`
- [ ] Verificare che **nessun file sotto `src/` al di fuori di `src/test/`** sia modificato
- [ ] Verificare che **nessun file sotto `.github/`** sia modificato

---

## Checklist gate finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| `npm run test:run` | 5 passed, exit 0 | | ☐ |
| Test in ordine inverso | 5 passed | | ☐ |
| Ogni test in isolamento | 1 passed per file | | ☐ |
| `npm run build` | exit 0 | | ☐ |
| `npm run lint` | exit 0, ≤ 56 warning | | ☐ |
| `git diff --stat` | 2 modificati + 7 nuovi | | ☐ |
| Nessun file in `src/` (fuori `src/test/`) modificato | 0 file | | ☐ |
| Nessun file `.github/` modificato | 0 file | | ☐ |
| Test 01 — AuthScreen visibile al mount | sì | | ☐ |
| Test 02 — Dashboard visibile dopo auth PIN | sì | | ☐ |
| Test 03 — Sezioni Dashboard presenti | sì | | ☐ |
| Test 04 — Tab Movimenti e pulsante aggiunta | sì | | ☐ |
| Test 05 — Conto privato nascosto/sbloccato | sì | | ☐ |

> Quando tutti i gate sono ✅, aggiornare `docs/todo.md` spostando P19
> dalla sezione "In corso" a "Completati" con la data odierna.
