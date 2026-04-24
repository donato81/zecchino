# P19 — Coding Plan: Introduzione Vitest e 5 smoke test

> Documento operativo.  
> Fase: Plan → Code  
> Pacchetto: 19 — **Sesto passo post-refactoring — primo passo che introduce infrastruttura di test**  
> Design di riferimento: `docs/1 - projects/P19-vitest-smoke-tests-design.md`  
> Data: 24 aprile 2026

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P18.
- ⚠️ **Questo è il primo passo che introduce test automatici nel progetto.** Nessun file di test o configurazione Vitest esiste ancora nel repository.
- ⚠️ **Dipendenza critica — mock di `useKV`**: il pacchetto `@github/spark/hooks` richiede un runtime Spark non disponibile in jsdom. Il mock globale in `src/test/setup.ts` è il prerequisito fondativo: senza di esso tutti e 5 i test falliscono prima di eseguire il corpo del test.
- ⚠️ **Perimetro stretto**: nessuna modifica al codice applicativo in `src/` al di fuori della nuova cartella `src/test/`. Non aggiungere `data-testid`, non modificare `vite.config.ts`, non configurare CI/CD.
- ⚠️ **`.github/` protetto**: non toccare nulla sotto `.github/` (protetto da `framework-guard.instructions.md`). L'integrazione GitHub Actions è prevista in P21.

**File coinvolti:**

| Categoria | File | Operazione |
|---|---|---|
| Configurazione | `package.json` | **Modificato** — aggiunta script + devDependencies |
| Configurazione | `tsconfig.json` | **Modificato** — aggiunta `"types"` in compilerOptions |
| Infrastruttura | `vitest.config.ts` | **Creato** (in root accanto a `vite.config.ts`) |
| Infrastruttura | `src/test/setup.ts` | **Creato** |
| Test | `src/test/smoke/01-app-renders.test.tsx` | **Creato** |
| Test | `src/test/smoke/02-authentication.test.tsx` | **Creato** |
| Test | `src/test/smoke/03-dashboard-tab.test.tsx` | **Creato** |
| Test | `src/test/smoke/04-transactions-tab.test.tsx` | **Creato** |
| Test | `src/test/smoke/05-private-account.test.tsx` | **Creato** |

**File invariati (codice applicativo):**

| File / Area | Motivazione |
|---|---|
| `src/App.tsx` | I test lo importano ma non lo modificano |
| `src/context/` (tutti i file) | Invariati — i test li leggono tramite `<App />` |
| `src/components/` (tutti i file) | Invariati — nessun `data-testid` aggiunto |
| `src/hooks/` (tutti i file) | Invariati |
| `src/lib/` (tutti i file) | Invariati |
| `vite.config.ts` | Invariato — Vitest ha il proprio file di config |
| `eslint.config.js` | Invariato |
| `.github/` | Protetto da `framework-guard.instructions.md` |

### Struttura cartelle attesa dopo P19

```
src/test/
  setup.ts
  smoke/
    01-app-renders.test.tsx
    02-authentication.test.tsx
    03-dashboard-tab.test.tsx
    04-transactions-tab.test.tsx
    05-private-account.test.tsx
```

### Scelta architetturale: Vitest vs Jest

**Vitest scelto** per tre ragioni concrete:
1. **ESM nativo**: il progetto usa `"type": "module"` in `package.json` e `import.meta.dirname` in `vite.config.ts`. Jest richiede Babel o `ts-jest` per gestire ESM; Vitest usa la stessa pipeline ESM di Vite senza adattatori.
2. **Alias `@/` condiviso**: l'alias `@/` → `src/` è replicato facilmente in `vitest.config.ts` con la stessa sintassi; nessun `moduleNameMapper` di Jest.
3. **`@vitejs/plugin-react-swc` già installato** (versione `^4.2.2`): Vitest usa questo plugin per trasformare `.tsx` senza installare nulla di aggiuntivo.
4. **Separazione netta**: `vitest.config.ts` coesiste con `vite.config.ts` senza interferenze. Vite usa il proprio file per il build; Vitest usa il proprio per i test.

### Baseline warning ESLint al termine di P18

**56 warning, 0 errori** (misurati post-P18 nella sessione corrente). La baseline lint non deve degradare alla fine di P19 (gate D.5).

---

## Schema riepilogativo delle operazioni

```
Passo 19 — Introduzione Vitest e 5 smoke test
│
├── Sotto-operazione A — Configurazione infrastruttura
│   ├── A.1 npm install --save-dev (6 pacchetti)
│   ├── A.2 Creare vitest.config.ts in root
│   ├── A.3 Aggiungere script "test" e "test:run" a package.json
│   ├── A.4 Aggiungere "types": ["@testing-library/jest-dom"] a tsconfig.json
│   └── A.5 Verifica: npm run build → exit 0
│
├── Sotto-operazione B — Setup globale (src/test/setup.ts)
│   ├── B.1 Creare cartelle src/test/ e src/test/smoke/
│   ├── B.2 Creare src/test/setup.ts con mock @github/spark/hooks
│   └── B.3 Verifica: npm run test:run → 0 file trovati, exit 0
│
├── Sotto-operazione C — Scrittura 5 test smoke (sequenziale)
│   ├── C.1 01-app-renders.test.tsx → npm run test:run → 1 passed
│   ├── C.2 02-authentication.test.tsx (+ renderApp + authenticateWithPin) → 2 passed
│   ├── C.3 03-dashboard-tab.test.tsx → 3 passed
│   ├── C.4 04-transactions-tab.test.tsx → 4 passed
│   └── C.5 05-private-account.test.tsx → 5 passed
│
└── Sotto-operazione D — Verifica finale (tutti i gate DoD)
```

---

## Ambiguità rilevate

Le seguenti ambiguità sono state **verificate sul repository reale** sul branch `refactoring-architettura` con lettura diretta dei file sorgente prima della stesura di questo piano.

---

### AI1 — Stato attuale di `package.json`

**Verifica eseguita**: lettura completa del file.

**Versione di `vite`**: `"vite": "^7.3.2"` — compatibile con `vitest ^3.0.0` (Vitest 3.x supporta Vite 5–7).

**Versione di `react` e `react-dom`**: `"react": "^19.0.0"`, `"react-dom": "^19.0.0"` — compatibili con `@testing-library/react ^16.0.0` (v16 supporta React 18 e 19).

**Campo `engines`**: assente nel file. Il rischio R3 (`crypto.subtle`) si gestisce verificando la versione Node.js attiva in locale (deve essere ≥ 18 LTS).

**Script esistenti** (testo esatto):
```json
"scripts": {
    "dev": "vite",
    "kill": "fuser -k 5000/tcp",
    "build": "tsc -b --noCheck && vite build",
    "lint": "eslint .",
    "optimize": "vite optimize",
    "preview": "vite preview"
}
```
Da aggiungere dopo `"preview"`: `"test": "vitest"` e `"test:run": "vitest run"`.

**Pacchetti di test già presenti**: **nessuno** — confermato. Nessuno tra `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` compare in `dependencies` né in `devDependencies`.

**Struttura `devDependencies`**: in ordine alfabetico per nome del pacchetto:
```
@eslint/js, @tailwindcss/postcss, @types/react, @types/react-dom,
@vitejs/plugin-react-swc, eslint, eslint-plugin-jsx-a11y,
eslint-plugin-react-hooks, eslint-plugin-react-refresh,
globals, tailwindcss, typescript, typescript-eslint, vite
```
I nuovi pacchetti di test vanno inseriti in ordine alfabetico nella sezione `devDependencies`. La posizione naturale per i pacchetti `@testing-library/*` è dopo `@eslint/js` e prima di `@tailwindcss/postcss`; per `jsdom` dopo `globals`; per `vitest` e `@vitest/ui` alla fine (dopo `vite`).

---

### AI2 — Stato attuale di `tsconfig.json`

**Verifica eseguita**: lettura completa del file.

**Contenuto completo di `compilerOptions`**:
```json
"compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strictNullChecks": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": {
        "@/*": ["./src/*"]
    }
}
```

**Campo `"types"`**: **assente** — confermato. La modifica richiesta è aggiungere `"types": ["@testing-library/jest-dom"]` come ultimo campo in `compilerOptions`, dopo `"paths"`.

**Campo `"include"`**: presente, valore `["src"]` — confermato. Copre già `src/test/setup.ts` e `src/test/smoke/*.test.tsx` senza modifiche aggiuntive.

**Altri tsconfig**: nessun `tsconfig.node.json` o file derivato trovato nel repository. L'unico file è `tsconfig.json` in root.

**Modifica richiesta**: aggiungere esattamente questa riga in `compilerOptions`, dopo il campo `"paths"`:
```json
"types": ["@testing-library/jest-dom"]
```

---

### AI3 — Stato attuale di `vite.config.ts`

**Verifica eseguita**: lettura completa del file.

**Testo esatto dell'alias `@/`**:
```typescript
const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
})
```
La variabile `projectRoot` usa `process.env.PROJECT_ROOT || import.meta.dirname`. In `vitest.config.ts` (file in root del progetto, stesso livello), si può usare `import.meta.dirname` direttamente senza la variabile d'ambiente Spark — Vitest non gira in ambiente Spark.

**Plugin dichiarati in `vite.config.ts`** (da NON includere in `vitest.config.ts`):
1. `react()` — da `@vitejs/plugin-react-swc` → **includere** (necessario per trasformare `.tsx`)
2. `tailwindcss()` — da `@tailwindcss/vite` → **non includere**
3. `createIconImportProxy()` — da `@github/spark` → **non includere**
4. `sparkPlugin()` — da `@github/spark` → **non includere**

**Stile `defineConfig`**: importato da `'vite'`. In `vitest.config.ts` si usa `defineConfig` importato da `'vitest'` (non da `'vite'`), che accetta una chiave `test: { ... }` per la configurazione Vitest.

**`resolve` da `'path'`**: importato in `vite.config.ts` riga 7. Lo stesso import è necessario in `vitest.config.ts` per costruire il percorso assoluto dell'alias.

---

### AI4 — Struttura di `src/context/AuthContext.tsx` — meccanismo di autenticazione

**Verifica eseguita**: lettura completa del file (post-P18).

**Import `useKV`** (riga 2 — confermato):
```typescript
import { useKV } from '@github/spark/hooks'
```

**Chiamate a `useKV`** (righe 38–39):
```typescript
const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
const [privatePinHash, setPrivatePinHash] = useKV<string>('private-pin-hash', '')
```
Con il mock che restituisce `''` per qualsiasi chiave, `globalPinHash = ''` e l'app entra automaticamente in **setup mode** (creazione PIN) a ogni test.

**`useEffect` che legge `globalPinHash`** (riga 53 — confermato, righe 53–59):
```typescript
useEffect(() => {
    if (!globalPinHash) {
        setIsSetupMode(true)
        setShowPinDialog(true)
    } else {
        setShowPinDialog(true)
    }
}, [])
```
Con `globalPinHash = ''` (mock): `isSetupMode = true`, `showPinDialog = true`. Il dialog "Imposta PIN Globale" appare automaticamente.

**`isAuthenticated`** (riga 43): gestito con `useState(false)` — **non `useKV`** — confermato. Il setter no-op del mock KV non blocca l'autenticazione: `setIsAuthenticated(true)` è un setter React normale che funziona correttamente nei test.

**Funzione di submit** (riga 61): `handleGlobalPinSubmit(pin: string)` — `async`, usa `hashPin(pin)` (da `src/lib/crypto.ts`), poi `setIsAuthenticated(true)` se PIN valido. In setup mode chiama `hashPin` e poi `setIsAuthenticated(true)` direttamente (senza verifica).

**Funzione PIN privato** (riga 87): `handlePrivatePinSubmit(pin: string, onUnlocked?: () => void)` — analogo per il conto privato. In setup mode (nessun PIN privato), crea l'hash e chiama `setIsPrivateUnlocked(true)`.

**Campi di `AuthContextValue`** (righe 9–26):
```typescript
interface AuthContextValue {
  globalPinHash: string | null
  setGlobalPinHash: ...
  privatePinHash: string | null
  setPrivatePinHash: ...
  isAuthenticated: boolean
  setIsAuthenticated: (v: boolean) => void
  isPrivateUnlocked: boolean
  setIsPrivateUnlocked: (v: boolean) => void
  isSetupMode: boolean
  setIsSetupMode: (v: boolean) => void
  showPinDialog: boolean
  setShowPinDialog: (v: boolean) => void
  showPrivatePinDialog: boolean
  setShowPrivatePinDialog: (v: boolean) => void
  handleGlobalPinSubmit: (pin: string) => Promise<void>
  handlePrivatePinSubmit: (pin: string, onUnlocked?: () => void) => Promise<void>
}
```

---

### AI5 — Struttura di `src/context/AppDataContext.tsx` — campi gestiti da `useKV`

**Verifica eseguita**: lettura delle sezioni rilevanti del file (post-P18).

**Import `useKV`** (riga 2 — confermato):
```typescript
import { useKV } from '@github/spark/hooks'
```
Stesso percorso di `AuthContext`. Il mock in `setup.ts` deve coprire entrambi i file con un unico `vi.mock('@github/spark/hooks', ...)`.

**Chiamate a `useKV` in `AppDataContext`** (righe 79–91, confermato):

| Chiave KV | Tipo | Valore default |
|---|---|---|
| `'accounts'` | `Account[]` | `[]` |
| `'transactions'` | `Transaction[]` | `[]` |
| `'categories'` | `Category[]` | `[]` |
| `'budgets'` | `Budget[]` | `[]` |
| `'savings-goals'` | `SavingsGoal[]` | `[]` |
| `'visible-categories'` | `string[]` | `ACCOUNT_CATEGORIES.map(c => c.id)` |
| `'dismissed-budget-alerts'` | `string[]` | `[]` |
| `'budget-percentages'` | `Record<string, number>` | `{}` |

**Chiavi effettive**: 8 chiavi (design §4.1 ne citava 8 con nomi leggermente diversi — il nome reale di `savings-goals` è `'savings-goals'` non `'savingsGoals'`; `dismissed-budget-alerts` non `'dismissedAlerts'`; `budget-percentages` non `'budgetPercentages'`). Questo non impatta il mock: il mock restituisce `defaultValue` per qualsiasi chiave.

**Nessun wrapper locale**: `useKV` è importato direttamente da `@github/spark/hooks` — stessa riga dell'import in `AuthContext`. Il percorso del mock è univoco.

---

### AI6 — Struttura di `src/components/AuthScreen.tsx`

**Verifica eseguita**: lettura completa del file.

**`aria-label` sul div con `role="main"`** (riga 12 — confermato):
```tsx
<div
    className="..."
    role="main"
    aria-label="Schermata di autenticazione Zecchino"
>
```
Testo esatto: `"Schermata di autenticazione Zecchino"`.

**Componente `PinDialog`**: componente separato (`src/components/PinDialog.tsx`), non inline. `AuthScreen` lo istanzia come:
```tsx
<PinDialog
    open={showPinDialog}
    title={isSetupMode ? 'Imposta PIN Globale' : 'Inserisci PIN'}
    description={isSetupMode ? 'Crea un PIN per proteggere l\'applicazione' : 'Inserisci il tuo PIN per accedere'}
    onSubmit={handleGlobalPinSubmit}
    confirmMode={isSetupMode}
/>
```

Con mock (`globalPinHash = ''`) → `isSetupMode = true` → titolo: `'Imposta PIN Globale'`, descrizione: `"Crea un PIN per proteggere l'applicazione"`, `confirmMode={true}`.

**Struttura di `PinDialog` in setup mode** (lettura `src/components/PinDialog.tsx`):
- Label "Nuovo PIN" — `htmlFor="pin"` → selettore: `getByLabelText(/Nuovo PIN/i)`
- Input `id="pin"` — tipo `password`
- Label "Conferma PIN" — `htmlFor="confirm-pin"` → selettore: `getByLabelText(/Conferma PIN/i)`
- Input `id="confirm-pin"` — tipo `password`
- Pulsante submit: testo "Conferma" → selettore: `getByRole('button', { name: /Conferma/i })`

---

### AI7 — Struttura di `src/components/DashboardTab.tsx` — testi e ruoli

**Verifica eseguita**: lettura completa del file (post-P17, post-P18).

**Heading "I Tuoi Conti"** (riga 97 — confermato):
```tsx
<h2 className="text-xl sm:text-2xl font-semibold">I Tuoi Conti</h2>
```
Livello: `h2`, testo: `"I Tuoi Conti"`. Selettore: `getByRole('heading', { level: 2, name: /I Tuoi Conti/i })`.

**Messaggio stato vuoto conti** (riga ~190):
```tsx
<p className="text-muted-foreground mb-4">Nessun conto disponibile</p>
```
Testo: `"Nessun conto disponibile"`. Selettore: `getByText(/Nessun conto disponibile/i)`.

**Heading "Movimenti Recenti"** (riga ~309):
```tsx
<h3 className="text-xl font-semibold">Movimenti Recenti</h3>
```
Livello: `h3`, testo: `"Movimenti Recenti"`. Selettore: `getByRole('heading', { level: 3, name: /Movimenti Recenti/i })`.

**Messaggio stato vuoto movimenti recenti** (riga ~316):
```tsx
<p className="text-muted-foreground">Nessun movimento registrato</p>
```
Testo: `"Nessun movimento registrato"`. Selettore: `getByText(/Nessun movimento registrato/i)`.

**Pulsante "Sblocca Privato"** (riga ~151):
```tsx
<Button
    onClick={() => { ... setShowPrivatePinDialog(true) }}
    ...
    aria-label="Sblocca conto privato. Richiede inserimento PIN privato per accedere ai conti protetti. Scorciatoia tastiera: Control più U"
>
    <LockOpen ... />
    <span>Sblocca Privato</span>
</Button>
```
`aria-label` esatto: `"Sblocca conto privato. Richiede inserimento PIN privato per accedere ai conti protetti. Scorciatoia tastiera: Control più U"`. Selettore: `getByRole('button', { name: /Sblocca conto privato/i })` (partial match).

---

### AI8 — Struttura di `src/components/TransactionsTab.tsx` — testi e ruoli

**Verifica eseguita**: lettura completa del file (post-P17, post-P18).

**Heading "Tutti i Movimenti"** (riga 75):
```tsx
<h2 className="text-2xl font-semibold">Tutti i Movimenti</h2>
```
Livello: `h2`, testo: `"Tutti i Movimenti"`. Selettore: `getByRole('heading', { level: 2, name: /Tutti i Movimenti/i })`.

**Pulsante aggiunta movimento** (riga 88):
```tsx
<Button
    onClick={() => { setEditingTransaction(undefined); setShowTransactionDialog(true) }}
    className="gap-2"
    ...
    aria-label="Aggiungi nuovo movimento. Scorciatoia: Control più N"
>
    <Plus size={18} weight="bold" aria-hidden="true" />
    Nuovo Movimento
    ...
</Button>
```
`aria-label` esatto: `"Aggiungi nuovo movimento. Scorciatoia: Control più N"`. Selettore: `getByRole('button', { name: /Aggiungi nuovo movimento/i })` (partial match).

**Messaggio stato vuoto** (riga ~112):
```tsx
<p className="text-muted-foreground mb-4">Nessun movimento da visualizzare</p>
```
Testo: `"Nessun movimento da visualizzare"`.

**Tab "Movimenti" nella barra di navigazione** (`App.tsx` riga ~105):
```tsx
<TabsTrigger value="transactions" ... aria-label="Movimenti. Visualizza tutti i movimenti...">
    ...
    <span className="font-medium">Movimenti</span>
</TabsTrigger>
```
Il testo visibile dello span è `"Movimenti"`. `aria-label` completo: `"Movimenti. Visualizza tutti i movimenti. Scorciatoia tastiera: Control più T"`. Selettore consigliato: `getByRole('tab', { name: /^Movimenti/i })` oppure `getByRole('tab', { name: /Movimenti\. Visualizza/i })`.

---

### AI9 — Struttura di `src/lib/types.ts` — interfaccia `Account`

**Verifica eseguita**: lettura completa del file.

**Interfaccia `Account`** (righe 8–17, confermato):
```typescript
export interface Account {
  id: string
  nome: string
  tipo: AccountType
  saldoIniziale: number
  valuta: string
  isPrivato: boolean
  dataCreazione: string
}
```
Tutti i 7 campi verificati. **Nessun campo opzionale**: `isPrivato: boolean` (non `boolean | undefined`) — campo obbligatorio. L'oggetto account privato nei test deve includere tutti e 7 i campi.

**`AccountType`** (riga 1):
```typescript
export type AccountType = 'bancario' | 'prepagata' | 'contanti' | 'salvadanaio' | 'privato' | 'investimenti' | 'credito' | 'paypal' | 'crypto' | 'pensione'
```
Il valore `'privato'` è un `AccountType` valido — confermato.

**Oggetto `accountPrivatoTest` completo** per il test 5:
```typescript
const accountPrivatoTest: Account = {
  id: 'test-priv-1',
  nome: 'Conto Segreto',
  tipo: 'privato',
  saldoIniziale: 0,
  valuta: 'EUR',
  isPrivato: true,
  dataCreazione: '2024-01-01',
}
```

---

### AI10 — Struttura di `src/App.tsx` — albero provider post-P18 e navigazione

**Verifica eseguita**: lettura completa del file (post-P18).

**Albero provider** (ultima riga del file — confermato):
```typescript
function App() {
  return <AuthProvider><AppDataProvider><VisibleDataProvider><AppContent /></VisibleDataProvider></AppDataProvider></AuthProvider>
}
```
Ordine: `AuthProvider → AppDataProvider → VisibleDataProvider → AppContent`. P18 applicato correttamente.

**`<DialogsOverlay />`** in `AppContent`: presente — confermato (righe finali di `AppContent`):
```tsx
<DialogsOverlay />
```
Rilevante per il test 5: il dialog del PIN privato è renderizzato da `DialogsOverlay` e appare nel DOM tramite portale Radix (`<Dialog>`). Testing Library cerca nell'intero `document.body` per default.

**Navigazione Radix UI Tabs** — valori delle tab (righe ~100–115):
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsTrigger value="dashboard" ...>Dashboard</TabsTrigger>
  <TabsTrigger value="transactions" ...>Movimenti</TabsTrigger>
  <TabsTrigger value="reports" ...>Report</TabsTrigger>
</Tabs>
```
Valori: `"dashboard"`, `"transactions"`, `"reports"`. La tab attiva al mount è `"dashboard"` (`useState('dashboard')`).

---

## Rischi

### R1 🔴 — Mock di `useKV` non corretto

**Problema**: se il mock di `@github/spark/hooks` non è applicato prima del caricamento dei moduli, tutti e 5 i test falliscono prima dell'esecuzione con errore `Cannot find module '@github/spark/hooks'` o errore di hook fuori contesto.

**Mitigazione — tre verifiche obbligatorie**:
1. Il percorso del mock deve essere `'@github/spark/hooks'` — identico all'import nei file sorgente (riga 2 di `AuthContext.tsx` e riga 2 di `AppDataContext.tsx`).
2. La dichiarazione `vi.mock(...)` deve essere in `src/test/setup.ts` — file elencato in `setupFiles` di `vitest.config.ts`.
3. Struttura del mock: la funzione mock di `useKV` deve ricevere `(key, defaultValue)` e restituire `[defaultValue, vi.fn()]`. Il setter `vi.fn()` è un no-op che non lancia eccezioni.

**Gate**: eseguire `npm run test:run` dopo la creazione di `setup.ts` (sezione B.3). Se nessun file di test esiste ancora, l'output deve essere "0 tests passed" (non un errore di modulo). Se l'errore compare, il problema è nel mock.

---

### R2 🟡 — Autenticazione PIN con doppio campo

**Problema**: in setup mode, `PinDialog` mostra due campi (Nuovo PIN + Conferma PIN). Se solo uno dei due viene compilato, `handleGlobalPinSubmit` rifiuta con errore "I PIN non corrispondono" senza autenticare.

**Mitigazione**:
- Nel test 2 e nella funzione `authenticateWithPin`, compilare entrambi i campi con lo stesso valore.
- Usare `await userEvent.type(campo, pin)` (non `fireEvent.change`) per simulare la digitazione realistica.
- Usare `await userEvent.click(bottoneConferma)` per il submit.
- Attendere il re-render asincrono con `await screen.findByText(...)` (promise-based), non `getByText` sincrono — la funzione `hashPin` è asincrona.

---

### R3 🟢 — `crypto.subtle` non disponibile

**Problema**: `hashPin` in `src/lib/crypto.ts` usa `crypto.subtle.digest`. Se Node.js < 15, `crypto.subtle` non è disponibile globalmente.

**Mitigazione**: verificare `node --version` prima di scrivere il test 2. Se ≥ 18 LTS, nessun problema. `crypto.subtle` è disponibile anche in jsdom 25.

**Non mockare `src/lib/crypto.ts`**: la funzione reale deve essere chiamata per rendere il test realistico.

---

### R4 🟢 — recharts e canvas API

**Problema**: recharts usa canvas internamente. jsdom non implementa canvas, quindi emette warning `"Not implemented: HTMLCanvasElement.prototype.getContext"`.

**Impatto in P19**: **nullo** — nessuno dei 5 test naviga sulla tab Report, che è l'unica a usare recharts. Il rischio è documentato per i passi futuri che aggiungono test su `ReportsTab`.

---

### R5 🟡 — Isolamento del mock per `accounts` nel test 5

**Problema**: il test 5 richiede un array `accounts` non vuoto (con un account privato). Se il mock personalizzato non viene ripristinato dopo il test, gli altri test ricevono dati non vuoti.

**Mitigazione**:
- Il mock personalizzato per `accounts` va dichiarato **solo** nel file `05-private-account.test.tsx`.
- Usare `beforeEach(() => vi.clearAllMocks())` e `afterEach(() => vi.restoreAllMocks())` per garantire l'isolamento.
- Il mock globale in `setup.ts` restituisce il `defaultValue` per qualsiasi chiave — è il baseline a cui si torna dopo ogni test.

---

### R6 🟢 — Dialog PIN privato in portale DOM

**Problema**: il dialog del PIN privato è reso da `DialogsOverlay` in un portale Radix (`<Dialog>`). I portali sono figli di `document.body`, non del container radice di Testing Library.

**Mitigazione**: Testing Library (`@testing-library/react`) cerca elementi nell'intero `document.body` per default — i portali sono automaticamente inclusi nella ricerca. Nessuna configurazione speciale necessaria.

---

## Piano operativo: configurazione infrastruttura (A)

### A.1 — Installazione dipendenze

Eseguire in root del progetto:

```
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Versioni installate (compatibilità verificata da AI1):
- `vitest` → `^3.0.0` (Vite 7.x)
- `@vitest/ui` → `^3.0.0` (opzionale, stessa major)
- `@testing-library/react` → `^16.0.0` (React 19)
- `@testing-library/jest-dom` → `^6.6.0`
- `@testing-library/user-event` → `^14.5.0`
- `jsdom` → `^25.0.0`

Dopo l'installazione, verificare che le versioni reali appaiano in `package.json` e che `node_modules` sia aggiornato. Il file `package-lock.json` verrà aggiornato automaticamente.

---

### A.2 — Creazione `vitest.config.ts`

Creare in root del progetto (accanto a `vite.config.ts`).

**Contenuto**:
- Import: `defineConfig` da `'vitest/config'`; `react` da `'@vitejs/plugin-react-swc'`; `resolve` da `'path'`
- Plugin: solo `react()` — NON `tailwindcss()`, NON `sparkPlugin()`, NON `createIconImportProxy()`
- `test.environment`: `'jsdom'`
- `test.setupFiles`: `['./src/test/setup.ts']`
- `test.globals`: `true` (permette di usare `describe`, `it`, `expect`, `vi` senza import in ogni file)
- `test.include`: `['src/test/**/*.test.{ts,tsx}']`
- `resolve.alias`: `{ '@': resolve(import.meta.dirname, 'src') }` — usa `import.meta.dirname` direttamente (non la variabile Spark `projectRoot`)

**Separazione da `vite.config.ts`**: il file `vitest.config.ts` importa `defineConfig` da `'vitest/config'` (non da `'vite'`). Questa distinzione è necessaria per attivare la chiave `test: { ... }` nel config object.

---

### A.3 — Aggiunta script `"test"` e `"test:run"` a `package.json`

Nella sezione `scripts`, aggiungere dopo `"preview"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

Gli script esistenti restano invariati: `dev`, `kill`, `build`, `lint`, `optimize`, `preview`.

---

### A.4 — Aggiunta `"types"` a `tsconfig.json`

In `compilerOptions`, aggiungere dopo il campo `"paths"`:

```json
"types": ["@testing-library/jest-dom"]
```

Questa modifica registra le estensioni di tipo di `@testing-library/jest-dom` per tutti i file in `src/` (inclusi i file di test), permettendo a TypeScript di riconoscere i matcher come `toBeInTheDocument()`, `toBeVisible()`, `toHaveTextContent()`.

---

### A.5 — Verifica intermedia A

```
npm run build
```
Atteso: exit 0. La modifica a `tsconfig.json` non deve rompere la compilazione. Se compare un errore TypeScript relativo a `@testing-library/jest-dom`, la libreria non è ancora stata installata — verificare A.1.

---

## Piano operativo: setup globale (B)

### B.1 — Creazione cartelle

```
mkdir -p src/test/smoke
```

(Su Windows PowerShell: `New-Item -ItemType Directory -Path src\test\smoke -Force`)

Creare le cartelle `src/test/` e `src/test/smoke/`.

---

### B.2 — Creazione `src/test/setup.ts`

**Contenuto**:

1. Import di `@testing-library/jest-dom` — estende i matcher `expect()` di Vitest.

2. Mock globale di `@github/spark/hooks` — blocco fondativo dei test. Il mock intercetta `useKV` prima che qualsiasi modulo dell'app tenti di caricare il runtime Spark.

   Struttura del mock:
   - `vi.mock('@github/spark/hooks', ...)` — percorso identico all'import nei sorgenti (AI4 riga 2, AI5 riga 2)
   - La funzione factory del mock restituisce un oggetto con la proprietà `useKV`
   - `useKV` mock: funzione che riceve `(key, defaultValue)` e restituisce `[defaultValue, vi.fn()]`
   - Il setter `vi.fn()` è un no-op: non aggiorna lo stato, ma non lancia eccezioni
   - Questo comportamento significa che `globalPinHash = ''` (stringa vuota = setup mode) e tutti gli array di dati sono vuoti `[]` — stato di primo avvio

**Avvertenza**: `vi.mock()` deve essere chiamato nel corpo del modulo (non dentro una funzione), perché Vitest lo "hoist" (solleva) in cima al file durante la trasformazione. Posizionarlo subito dopo l'import.

---

### B.3 — Verifica intermedia B

```
npm run test:run
```

Atteso con nessun file di test scritto: `"No test files found"` oppure `"0 tests"`. L'importante è che il processo termini senza errori di modulo relativi a `@github/spark`. Se compare `Cannot find module '@github/spark/hooks'`, il problema è nella configurazione di `setupFiles` in `vitest.config.ts`.

---

## Piano operativo: scrittura test smoke (C)

### Funzioni di utilità condivise

**Definire nel file `src/test/smoke/02-authentication.test.tsx`** (primo file che le usa) e importarle nei file successivi, oppure estrarle in `src/test/smoke/test-utils.ts` se la duplicazione diventa rilevante.

**`renderApp()`**:
- Chiama `render(<App />)` da `@testing-library/react`
- Importa `App` da `@/App`
- Restituisce il risultato di `render()` (o lo destructura per esporre `screen` o `user`)

**`authenticateWithPin(pin: string)`**:
- Riceve il PIN come stringa (es. `'1234'`)
- Trova il campo "Nuovo PIN": `screen.getByLabelText(/Nuovo PIN/i)`
- Digita il PIN: `await userEvent.type(campo, pin)`
- Trova il campo "Conferma PIN": `screen.getByLabelText(/Conferma PIN/i)`
- Digita il PIN di conferma: `await userEvent.type(campo, pin)`
- Trova il pulsante "Conferma": `screen.getByRole('button', { name: /Conferma/i })`
- Clicca: `await userEvent.click(pulsante)`
- Attende che la Dashboard sia visibile: `await screen.findByText(/I Tuoi Conti/i)` (conferma autenticazione avvenuta)

**Nota**: `userEvent` richiede `setup()` prima dell'uso. Creare l'istanza con `const user = userEvent.setup()` all'inizio del test o nella funzione `renderApp()`.

---

### C.1 — `01-app-renders.test.tsx`

**Cosa verifica**: test passivo — l'app si monta senza errori e la schermata di autenticazione è visibile.

**Import**:
```typescript
import { render, screen } from '@testing-library/react'
import App from '@/App'
```

**Asserzioni** (tutte sincrone — `getBy*`):
1. `screen.getByRole('main', { name: /Schermata di autenticazione Zecchino/i })` — il div con `role="main"` e `aria-label` confermato (AI6)
2. `screen.getByRole('dialog')` — il `PinDialog` (Radix `<Dialog open={true}>`)
3. `screen.getByText(/Imposta PIN Globale/i)` — titolo del dialog in setup mode (AI6)
4. `screen.getByText(/Crea un PIN per proteggere l'applicazione/i)` — descrizione (AI6)

**Tipo di attesa**: `getBy*` sincrono (il rendering iniziale è sincrono dopo il mock di `useKV`).

**Se un elemento non è trovato**: "Unable to find an accessible element with the role 'main'" → il `<div role="main">` di `AuthScreen` non è stato renderizzato. Verificare il mock di `useKV` e l'albero dei provider.

---

### C.2 — `02-authentication.test.tsx`

**Cosa verifica**: test interattivo — il flusso PIN in setup mode porta a `isAuthenticated = true` e la tab Dashboard diventa visibile.

**Import**:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
```

**Setup**: `const user = userEvent.setup()`

**Flusso**:
1. `render(<App />)`
2. Trovare campo PIN: `screen.getByLabelText(/Nuovo PIN/i)` — label con `htmlFor="pin"` (AI6)
3. `await user.type(campoPIN, '1234')`
4. Trovare campo conferma: `screen.getByLabelText(/Conferma PIN/i)` — label con `htmlFor="confirm-pin"` (AI6)
5. `await user.type(campoConferma, '1234')`
6. Trovare pulsante: `screen.getByRole('button', { name: /Conferma/i })` (AI6)
7. `await user.click(pulsante)`
8. `await screen.findByText(/I Tuoi Conti/i)` — heading h2 in `DashboardTab` (AI7) — `findBy*` asincrono per `hashPin`

**Asserzione finale**: il testo "I Tuoi Conti" è visibile → autenticazione avvenuta.

**Nota**: dopo il passo 8, verificare anche che `AuthScreen` non sia più presente: `expect(screen.queryByRole('main', { name: /Schermata di autenticazione/i })).not.toBeInTheDocument()`.

---

### C.3 — `03-dashboard-tab.test.tsx`

**Cosa verifica**: con autenticazione simulata, la tab Dashboard mostra la sezione dei conti e la sezione dei movimenti recenti.

**Import**: come C.2 + la funzione `authenticateWithPin` (importata da C.2 o da `test-utils`).

**Flusso**:
1. `render(<App />)` + `authenticateWithPin('1234')`
2. Verificare heading "I Tuoi Conti": `screen.getByRole('heading', { level: 2, name: /I Tuoi Conti/i })` — `getBy*` sincrono (già in DOM dopo auth)
3. Verificare stato vuoto conti: `screen.getByText(/Nessun conto disponibile/i)` (AI7)
4. Verificare heading "Movimenti Recenti": `screen.getByRole('heading', { level: 3, name: /Movimenti Recenti/i })` (AI7)
5. Verificare stato vuoto movimenti: `screen.getByText(/Nessun movimento registrato/i)` (AI7)

**Dati**: tutti gli array sono vuoti (mock globale) → gli stati vuoti sono sempre presenti.

**Tipo di attesa**: `getBy*` dopo che `authenticateWithPin` ha già atteso `findByText(/I Tuoi Conti/)`.

---

### C.4 — `04-transactions-tab.test.tsx`

**Cosa verifica**: navigando sulla tab Movimenti, heading e pulsante aggiunta sono presenti.

**Import**: come C.3.

**Flusso**:
1. `render(<App />)` + `authenticateWithPin('1234')`
2. Trovare tab "Movimenti": `screen.getByRole('tab', { name: /Movimenti\./i })` — il `aria-label` inizia con "Movimenti." (AI8); oppure usare `screen.getAllByRole('tab')` e trovare quello con testo "Movimenti"
3. `await user.click(tabMovimenti)`
4. `await screen.findByRole('heading', { level: 2, name: /Tutti i Movimenti/i })` — `findBy*` asincrono per il mount del `TabsContent` (AI8)
5. `screen.getByRole('button', { name: /Aggiungi nuovo movimento/i })` — `getBy*` sincrono dopo il render del tab (AI8)

**Con dati vuoti**: il tab Movimenti mostra "Nessun movimento da visualizzare" (AI8) — verificare anche questo testo come asserzione aggiuntiva.

---

### C.5 — `05-private-account.test.tsx`

**Cosa verifica**: il conto privato è nascosto per default; dopo sblocco con PIN privato diventa visibile.

**Prerequisito**: override del mock per `accounts` con `[accountPrivatoTest]`.

**Oggetto `accountPrivatoTest`** (tutti i campi — AI9):
```typescript
const accountPrivatoTest: Account = {
  id: 'test-priv-1',
  nome: 'Conto Segreto',
  tipo: 'privato',
  saldoIniziale: 0,
  valuta: 'EUR',
  isPrivato: true,
  dataCreazione: '2024-01-01',
}
```

**Strategia mock locale**: nel `beforeEach` del test 5, sovrascrivere il comportamento di `useKV` per restituire `[accountPrivatoTest]` quando la chiave è `'accounts'` e `[]` per tutte le altre chiavi. Nel `afterEach`, ripristinare con `vi.restoreAllMocks()`.

**Flusso**:
1. Override mock accounts
2. `render(<App />)` + `authenticateWithPin('1234')`
3. Verificare "Conto Segreto" **non visibile**: `expect(screen.queryByText(/Conto Segreto/i)).not.toBeInTheDocument()`
4. Verificare pulsante sblocco: `screen.getByRole('button', { name: /Sblocca conto privato/i })` (AI7, partial match sull'aria-label)
5. `await user.click(pulsanteSblocco)`
6. Dialog PIN privato appare — trovare campo PIN: `screen.getByLabelText(/Nuovo PIN/i)` (in setup mode, nessun PIN privato precedente → confirmMode)
7. `await user.type(campoPIN, '5678')` (PIN privato diverso da quello globale)
8. `await user.type(campoConferma, '5678')`
9. `await user.click(pulsanteConferma)`
10. `await screen.findByText(/Conto Segreto/i)` — il conto è ora visibile

**Note**:
- Il dialog del PIN privato è renderizzato da `DialogsOverlay` in portale DOM (AI10 confermato). Testing Library lo trova in `document.body` per default.
- `privatePinHash = ''` nel mock → modalità setup del PIN privato → due campi (come test 2).
- Il selettore del pulsante conferma nel dialogo privato è identico a quello del test 2: `getByRole('button', { name: /Conferma/i })`. Se ci sono due pulsanti "Conferma" simultaneamente (improbabile perché il dialog globale si chiude prima), usare `within(dialog).getByRole('button', { name: /Conferma/i })`.

---

## Risultati dei gate (da compilare durante l'esecuzione)

| Sotto-operazione | Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|---|
| A.1 | `npm install` | exit 0 | | ☐ |
| A.5 | `npm run build` | exit 0 | | ☐ |
| B.3 | `npm run test:run` | 0 test, no errori modulo | | ☐ |
| C.1 | `npm run test:run` | 1 passed | | ☐ |
| C.2 | `npm run test:run` | 2 passed | | ☐ |
| C.3 | `npm run test:run` | 3 passed | | ☐ |
| C.4 | `npm run test:run` | 4 passed | | ☐ |
| C.5 | `npm run test:run` | 5 passed | | ☐ |
| D | `npm run build` | exit 0 | | ☐ |
| D | `npm run lint` | ≤ 56 warning | | ☐ |
| D | `git diff --stat` | 2 modificati + 7 nuovi | | ☐ |
