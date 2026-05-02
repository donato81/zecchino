# P29 — Coding Plan: Migrazione useUserSettings e Preferenze UI

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: 29 — Blocco 5 migrazione Spark→Supabase (preferenze UI)
> Design di riferimento: `docs/1 - projects/P29-migrazione-usersettings-preferenze-ui.md`
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-02

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P28, P33.
- ⚠️ **Perimetro dei file modificati (esistenti):** `src/context/AppDataContext.tsx`, `src/hooks/use-visible-data.ts`, `src/components/DashboardTab.tsx`, `src/hooks/use-app-shortcuts.ts`, `src/App.tsx`, `src/test/smoke/test-utils.ts`. Eventuale modifica minima a `src/context/AuthContext.tsx` solo se il prerequisito PR0 richiede di esporre `userSettings` (vedi PR0). Nessun altro file sorgente esistente viene modificato.
- ⚠️ **File protetti SCF:** i file sotto `.github/instructions/`, `.github/agents/`, `.github/copilot-instructions.md`, `.github/AGENTS.md`, `.github/runtime/`, `.github/skills/`, `.github/prompts/`, `.github/changelogs/` non devono essere toccati in nessun caso.
- ⚠️ **Nessuna modifica a `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`** — salvo aggiornamenti imposti da nuovi import (documentare se accade).
- ⚠️ **`budgetPercentages` rimane come `useKV`:** questa voce sopravvive in `AppDataContext` dopo P29. La sua migrazione è compito del Blocco 6 (P30). Non rimuoverla in P29.
- ⚠️ **`session_timeout_minutes` fuori dal perimetro:** la lettura e scrittura di `preferences.session_timeout_minutes` rimane in `AuthProvider` (P27 Decisione B). Non centralizzarla in `useUserSettings()` in questo pacchetto.
- ⚠️ **Le 22 altre preferenze UI fuori dal perimetro:** `display-*`, `sr-*`, `audio-*`, `talkback-*` sono migrazione separata (Blocco 5b, P31). Non includere la loro migrazione in P29.
- ⚠️ **Aggiornamento non ottimistico:** tutte le operazioni di scrittura (`setVisibleCategories`, `dismissBudgetAlert`, `resetDismissedAlerts`) aggiornano lo stato locale **solo dopo** la conferma del repository, coerentemente con P28 §9 (conferma-prima-di-aggiornare).
- ⚠️ **Dipendenza da AuthContext P27:** `useUserSettings()` deve leggere il record `UserSettings` già caricato da `AuthProvider` senza eseguire una seconda chiamata a `getOrCreate()`. Questo è il punto critico della Decisione A (§5.3 di P29). Il prerequisito PR0 verifica questa disponibilità.
- ⚠️ **Dipendenza dal repository `impostazioni-utente` (P26 §7.6):** usati `getOrCreate()` (solo per PR0) e `updatePreference(key, value)` per le scritture.
- ⚠️ **`toggleCategoryVisibility` e `toggleAllCategories` escono da `AppDataContext`:** i componenti consumer (`DashboardTab.tsx`, `use-app-shortcuts.ts`) devono calcolare il nuovo array di id prima di chiamare `setVisibleCategories(newIds)` su `useUserSettings()`. La logica di toggle rimane nei consumer; cambia solo dove viene persistita.

---

## File creati

| File | Descrizione |
|---|---|
| `docs/2 - coding plans/P29-coding-plan.md` | Questo documento |
| `docs/3 - todo lists/P29-todo.md` | Todo specifico P29 |
| `src/hooks/use-user-settings.ts` | Hook `useUserSettings()` — lettura/scrittura preferenze UI da Supabase tramite repository `impostazioni-utente` |
| `src/context/UserSettingsContext.tsx` | Provider `UserSettingsProvider` — wrappa `useUserSettings()` e lo espone via context |

## File modificati

| File | Descrizione |
|---|---|
| `src/context/AppDataContext.tsx` | Rimozione di `visibleCategories`, `setVisibleCategories`, `dismissedAlerts`, `setDismissedAlerts` dal tipo e dal valore del context; rimozione delle due chiamate `useKV`; rimozione degli handler `toggleCategoryVisibility`, `toggleAllCategories`, `handleDismissBudgetAlert` |
| `src/hooks/use-visible-data.ts` | Cambio sorgente preferenze: `visibleCategories` e `dismissedBudgetAlerts` letti da `useUserSettings()` invece che da `useAppData()` |
| `src/components/DashboardTab.tsx` | Sostituzione di `toggleCategoryVisibility` / `toggleAllCategories` (da `useAppData()`) con `setVisibleCategories` (da `useUserSettings()`); aggiunta logica di toggle locale |
| `src/hooks/use-app-shortcuts.ts` | Sostituzione di `toggleCategoryVisibility` / `toggleAllCategories` (da `useAppData()`) con `setVisibleCategories` (da `useUserSettings()`); aggiunta logica di toggle locale |
| `src/App.tsx` | Montaggio di `UserSettingsProvider` tra `AppDataProvider` e `VisibleDataProvider`; sostituzione di `handleDismissBudgetAlert` (da `useAppData()`) con `dismissBudgetAlert` (da `useUserSettings()`) |
| `src/test/smoke/test-utils.ts` | Aggiornamento dei mock: rimozione di `toggleCategoryVisibility`, `toggleAllCategories`, `handleDismissBudgetAlert` dal mock di `AppDataContext`; aggiunta del mock di `UserSettingsContext` |
| `src/context/AuthContext.tsx` | **Solo se necessario** (vedi PR0): aggiunta di `userSettings` alla superficie pubblica di `useAuth()` |
| `docs/todo.md` | Aggiunta P29 nella tabella attivi |

## File invariati

| File / Area | Motivazione |
|---|---|
| `src/context/VisibleDataContext.tsx` | Thin wrapper invariato — nessuna dipendenza da `useKV` diretta; l'interfaccia che espone rimane invariata |
| `src/components/CategoryManagement.tsx` | Non legge né scrive `visibleCategories` — ruolo esclusivo: CRUD categorie tramite `useAppData()` |
| `src/components/SecuritySettings.tsx` | Non gestisce `visibleCategories` né `dismissedBudgetAlerts` (P29 §3.3) |
| `src/lib/supabase/**` | Creato in P26 — il repository `impostazioni-utente` è usato così com'è |
| `src/hooks/use-inactivity-timer.ts` | Creato in P27 — nessuna modifica necessaria |
| `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js` | Invariati |
| `.env.local` | Non committato; prerequisito, non output |
| `.github/**` | Protetto da `framework-guard.instructions.md` |

---

## Decisioni vincolanti (da P29 — non rimesse in discussione)

| ID | Decisione | Effetto pratico |
|---|---|---|
| **A** | **`UserSettingsProvider` figlio di `AppDataProvider`** (Opzione 2 scelta) | Gerarchia: `AuthProvider` → `AppDataProvider` → `UserSettingsProvider` → `VisibleDataProvider` → UI. `UserSettingsProvider` si monta subito dopo `AppDataProvider`, in parallelo al caricamento dei dati di dominio. Riceve il record `UserSettings` già caricato da `AuthProvider` senza una seconda query Supabase. |
| **B** | **Default "aspetta" — array vuoto bloccante** (Opzione 2 scelta) | Mentre `isSettingsReady = false`, `visibleCategories = []`. Nessun flash di categorie "tutte visibili" → "preferenze reali". La finestra di attesa è quasi nulla perché il record è già in memoria al mount. Coerente con il pattern spinner/blocco di P28. |
| **C** | **Pulizia lazy degli id orfani** (Opzione 2 scelta) | Se una categoria o un budget vengono eliminati, i loro id residui in `preferences.visible_category_ids` o `preferences.dismissed_budget_alert_ids` vengono ignorati silenziosamente da `use-visible-data.ts`. Nessun accoppiamento bidirezionale tra `AppDataContext` e `useUserSettings`. La pulizia batch del JSONB è rimandata al Blocco 10. |

---

## Schema riepilogativo delle operazioni

```
P29 — Migrazione useUserSettings e Preferenze UI
│
├── Prerequisiti
│   ├── PR0: AuthContext P27 espone userSettings (record UserSettings da getOrCreate)
│   │   └── grep -n "userSettings" src/context/AuthContext.tsx
│   ├── PR1: Repository impostazioni-utente P26 espone updatePreference
│   │   └── grep -n "updatePreference\|getOrCreate" src/lib/supabase/repositories/impostazioni-utente.ts
│   ├── PR2: @supabase/supabase-js in package.json
│   │   └── grep supabase package.json
│   └── PR3: Baseline build+test pre-P29
│       └── npm run build && npm run test:run
│
├── Passo A — Creare src/hooks/use-user-settings.ts
│   ├── A1: Import: useAuth, updatePreference dal repository impostazioni-utente
│   ├── A2: Stato locale: visibleCategories, dismissedBudgetAlerts, isSettingsReady, isSettingsLoading, settingsError
│   ├── A3: Inizializzazione dal record userSettings (parsing preferences)
│   ├── A4: Reset al logout (useEffect su isAuthenticated)
│   ├── A5: setVisibleCategories(ids) — updatePreference non ottimistico
│   ├── A6: dismissBudgetAlert(budgetId) — aggiunge id, updatePreference non ottimistico
│   ├── A7: resetDismissedAlerts() — svuota array, updatePreference non ottimistico
│   └── Gate A: build exit 0; tsc 0 errori
│
├── Passo B — Creare src/context/UserSettingsContext.tsx
│   ├── B1: Creare UserSettingsContextValue con gli 8 valori pubblici
│   ├── B2: Creare UserSettingsProvider usando useUserSettings()
│   ├── B3: Creare e esportare useUserSettings() come hook di accesso al context
│   └── Gate B: build exit 0; tsc 0 errori
│
├── Passo C — Aggiornare AppDataContext.tsx (rimozioni preferenze)
│   ├── C1: Rimuovere useKV('visible-categories', ...)
│   ├── C2: Rimuovere useKV('dismissed-budget-alerts', [])
│   ├── C3: Rimuovere visibleCategories, setVisibleCategories dall'interfaccia e dal valore
│   ├── C4: Rimuovere dismissedAlerts, setDismissedAlerts dall'interfaccia e dal valore
│   ├── C5: Rimuovere toggleCategoryVisibility, toggleAllCategories, handleDismissBudgetAlert
│   ├── C6: Verificare se import da @github/spark/hooks rimane (solo budgetPercentages)
│   └── Gate C: build exit 0; tsc 0 errori (attesi errori nei consumer — da correggere nei passi D-F)
│
├── Passo D — Aggiornare use-visible-data.ts
│   ├── D1: Aggiungere import useUserSettings
│   ├── D2: Sostituire destructuring visibleCategories e dismissedAlerts da useAppData()
│   │   con visibleCategories e dismissedBudgetAlerts da useUserSettings()
│   ├── D3: Nessuna modifica alla logica di calcolo (filteredGroupedAccounts, budgetAlerts)
│   └── Gate D: build exit 0; tsc 0 errori
│
├── Passo E — Aggiornare consumer (DashboardTab, use-app-shortcuts)
│   ├── E1 — DashboardTab.tsx:
│   │   ├── Rimuovere toggleCategoryVisibility, toggleAllCategories da destructuring useAppData()
│   │   ├── Aggiungere import e destructuring visibleCategories, setVisibleCategories da useUserSettings()
│   │   ├── Implementare logica toggle locale: per toggleAll usare setVisibleCategories con tutti gli id o []
│   │   └── Per toggle singola: calcolare newIds (add se non c'era, remove se c'era) e chiamare setVisibleCategories(newIds)
│   ├── E2 — use-app-shortcuts.ts:
│   │   ├── Rimuovere toggleCategoryVisibility, toggleAllCategories da destructuring useAppData()
│   │   ├── Aggiungere import e destructuring visibleCategories, setVisibleCategories da useUserSettings()
│   │   └── Implementare logica toggle locale analoga a E1
│   └── Gate E: build exit 0; tsc 0 errori
│
├── Passo F — Aggiornare App.tsx (albero provider + handleDismissBudgetAlert)
│   ├── F1: Importare UserSettingsProvider da context/UserSettingsContext
│   ├── F2: Montare UserSettingsProvider tra AppDataProvider e VisibleDataProvider
│   ├── F3: Rimuovere handleDismissBudgetAlert dalla destructuring di useAppData()
│   ├── F4: Aggiungere dismissBudgetAlert dalla destructuring di useUserSettings()
│   ├── F5: Sostituire onDismiss={handleDismissBudgetAlert} → onDismiss={dismissBudgetAlert}
│   └── Gate F: build exit 0; test passed
│
├── Passo G — Aggiornare test-utils.ts (mock AppData + mock UserSettings)
│   ├── G1: Rimuovere toggleCategoryVisibility, toggleAllCategories, handleDismissBudgetAlert
│   │   dal mock di AppDataContext
│   ├── G2: Rimuovere visibleCategories, dismissedAlerts, setVisibleCategories, setDismissedAlerts
│   │   dal mock di AppDataContext
│   ├── G3: Aggiungere mock di UserSettingsContext con valori di default:
│   │   visibleCategories: [], dismissedBudgetAlerts: [], isSettingsReady: true,
│   │   isSettingsLoading: false, settingsError: null,
│   │   setVisibleCategories: vi.fn(), dismissBudgetAlert: vi.fn(), resetDismissedAlerts: vi.fn()
│   └── Gate G: npm run test:run → tutti i test passed (baseline pre-P29)
│
└── Gate finale H (= gate P29)
    ├── build exit 0; test passed; tsc 0 errori
    ├── grep useKV src/context/AppDataContext.tsx → solo 1 voce attesa: budgetPercentages
    ├── useUserSettings() espone gli 8 valori della superficie pubblica P29 §4
    ├── Gerarchia provider App.tsx: AuthProvider → AppDataProvider → UserSettingsProvider → VisibleDataProvider
    └── git diff --name-only HEAD | grep ".github" → output vuoto
```

---

## Piano operativo dettagliato

### Prerequisiti — Prima di scrivere codice

#### PR0 — Conferma che `AuthContext` espone `userSettings`

Verificare che `useAuth()` esponga il record `UserSettings` già caricato da `getOrCreate()`:

```bash
grep -n "userSettings" src/context/AuthContext.tsx
```

Atteso: almeno una riga con `userSettings` nell'interfaccia pubblica e nel valore restituito.

Se **non presente**: aggiungere `userSettings` a `AuthContextValue` e al valore restituito da `useAuth()`. Questa è la modifica minima necessaria: il record `impostazioni_utente` è già caricato in P27 via `getOrCreate()` per determinare `needsOnboarding`; aggiungerlo alla superficie pubblica non richiede nessuna query aggiuntiva.

> **Attenzione:** se questa modifica è necessaria, aggiornare le note operative e documentare il cambiamento.

#### PR1 — Repository `impostazioni-utente` espone `updatePreference`

Verificare che P26 abbia implementato `updatePreference` nel repository:

```bash
grep -n "updatePreference\|getOrCreate" src/lib/supabase/repositories/impostazioni-utente.ts
```

Atteso: export di `getOrCreate` e `updatePreference`.

#### PR2 — Conferma `@supabase/supabase-js` in `package.json`

```bash
grep supabase package.json
```

Atteso: `"@supabase/supabase-js": "..."` tra le dipendenze.

#### PR3 — Baseline pre-P29

```bash
npm run build
npm run test:run
```

Atteso: build exit 0; test 01–04 passed (test 05 può essere in stato noto di fallimento pre-esistente — documentare).

---

### Passo A — Creare `src/hooks/use-user-settings.ts`

**File creato:** `src/hooks/use-user-settings.ts`

**Obiettivo:** implementare il hook puro che gestisce lo stato locale delle preferenze UI e la sincronizzazione con Supabase tramite il repository `impostazioni-utente`.

**Dipendenze:**
- `useAuth()` da `AuthContext` — per leggere `userSettings` (record già caricato) e `isAuthenticated`
- `updatePreference` dal repository `@/lib/supabase/repositories/impostazioni-utente`

**Struttura del hook:**

Il hook non crea un context: è un hook puro che gestisce stato e side effect. Il context viene creato nel Passo B.

#### A1 — Import

```ts
import { useAuth } from '@/context/AuthContext'
import { updatePreference } from '@/lib/supabase/repositories/impostazioni-utente'
```

#### A2 — Stato locale

```ts
const [visibleCategories, setVisibleCategoriesState] = useState<string[]>([])
const [dismissedBudgetAlerts, setDismissedBudgetAlertsState] = useState<string[]>([])
const [isSettingsReady, setIsSettingsReady] = useState(false)
const [isSettingsLoading, setIsSettingsLoading] = useState(false)
const [settingsError, setSettingsError] = useState<string | null>(null)
```

#### A3 — Inizializzazione dal record `userSettings`

Implementare `useEffect` con dipendenza `[userSettings, isAuthenticated]`:

- **Branch `isAuthenticated = false` o `userSettings` null:** resettare tutti i valori allo stato iniziale (`[]`, `[]`, `false`, `null`). Gestisce il logout.
- **Branch `isAuthenticated = true` e `userSettings` disponibile:**
  - Leggere `userSettings.preferences?.visible_category_ids` → se null o assente usare `[]`.
  - Leggere `userSettings.preferences?.dismissed_budget_alert_ids` → se null o assente usare `[]`.
  - Impostare i due stati locali con i valori letti.
  - Impostare `isSettingsReady = true`.

> **Nota:** questa operazione è **sincrona** (parsing di un oggetto già in memoria) — `isSettingsReady` diventa `true` nello stesso ciclo di rendering, eliminando la finestra di array-vuoto visibile all'utente (Decisione B, P29 §8 punto 5).

#### A4 — `setVisibleCategories(ids: string[])`

Funzione asincrona non ottimistica:

1. Impostare `isSettingsLoading = true`, `settingsError = null`.
2. Chiamare `updatePreference('visible_category_ids', ids)`.
3. Se successo: `setVisibleCategoriesState(ids)`, `setIsSettingsLoading(false)`.
4. Se errore (catch `RepositoryError`): NON aggiornare lo stato locale (rollback implicito), `settingsError = messaggio`, `setIsSettingsLoading(false)`.

#### A5 — `dismissBudgetAlert(budgetId: string)`

Funzione asincrona non ottimistica:

1. Calcolare `newIds = [...dismissedBudgetAlerts, budgetId]` (se non già presente).
2. Impostare `isSettingsLoading = true`, `settingsError = null`.
3. Chiamare `updatePreference('dismissed_budget_alert_ids', newIds)`.
4. Se successo: `setDismissedBudgetAlertsState(newIds)`, `setIsSettingsLoading(false)`.
5. Se errore: NON aggiornare, `settingsError = messaggio`, `setIsSettingsLoading(false)`.

#### A6 — `resetDismissedAlerts()`

Funzione asincrona non ottimistica:

1. Impostare `isSettingsLoading = true`, `settingsError = null`.
2. Chiamare `updatePreference('dismissed_budget_alert_ids', [])`.
3. Se successo: `setDismissedBudgetAlertsState([])`, `setIsSettingsLoading(false)`.
4. Se errore: NON aggiornare, `settingsError = messaggio`, `setIsSettingsLoading(false)`.

#### A7 — Valore restituito

Il hook restituisce l'oggetto con gli 8 valori della superficie pubblica P29 §4:

```ts
return {
  visibleCategories,
  dismissedBudgetAlerts,
  setVisibleCategories,
  dismissBudgetAlert,
  resetDismissedAlerts,
  isSettingsReady,
  isSettingsLoading,
  settingsError,
}
```

#### Gate intermedio A

- `npm run build` exit 0 (possibili errori nei consumer non ancora aggiornati — verificare che non siano nel nuovo file)
- `npx tsc --noEmit` → 0 errori nel nuovo file `use-user-settings.ts`

---

### Passo B — Creare `src/context/UserSettingsContext.tsx`

**File creato:** `src/context/UserSettingsContext.tsx`

**Obiettivo:** creare il provider React che wrappa `useUserSettings()` e rende le preferenze disponibili a tutta la sotto-gerarchia tramite context.

#### B1 — Interfaccia `UserSettingsContextValue`

Definire il tipo che rispecchia gli 8 valori della superficie pubblica:

```ts
interface UserSettingsContextValue {
  visibleCategories: string[]
  dismissedBudgetAlerts: string[]
  setVisibleCategories: (ids: string[]) => Promise<void>
  dismissBudgetAlert: (budgetId: string) => Promise<void>
  resetDismissedAlerts: () => Promise<void>
  isSettingsReady: boolean
  isSettingsLoading: boolean
  settingsError: string | null
}
```

#### B2 — `UserSettingsProvider`

Il provider:

```tsx
export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const value = useUserSettings()
  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  )
}
```

#### B3 — Hook di accesso `useUserSettingsContext()`

Esportare un hook di accesso che verifica che il provider sia montato:

```ts
export function useUserSettingsContext(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext)
  if (!ctx) throw new Error('useUserSettingsContext deve essere usato dentro UserSettingsProvider')
  return ctx
}
```

> **Nota naming:** nei componenti consumer, il hook di accesso al context si chiama `useUserSettingsContext()` per distinguerlo dall'hook puro `useUserSettings()` che è interno al provider. In alternativa, il file `UserSettingsContext.tsx` può esportare direttamente `useUserSettings` come alias del hook di accesso, in modo che i consumer usino sempre `useUserSettings()`. Scegliere una convenzione e documentarla nel file.

#### Gate intermedio B

- `npm run build` exit 0
- `npx tsc --noEmit` → 0 errori nel nuovo file `UserSettingsContext.tsx`

---

### Passo C — Aggiornare `AppDataContext.tsx`

**File modificato:** `src/context/AppDataContext.tsx`

**Obiettivo:** rimuovere le due chiamate `useKV` rimaste per le preferenze UI e i relativi handler. Dopo questo passo, `AppDataContext` contiene solo `budgetPercentages` come `useKV` (Blocco 6).

#### C1 — Rimuovere `useKV('visible-categories', ...)`

Riga attuale circa 180–183:

```ts
const [visibleCategories, setVisibleCategories] = useKV<string[]>(
  'visible-categories',
  ACCOUNT_CATEGORIES.map(c => c.id)
)
```

Rimuovere l'intera chiamata.

> **Nota:** verificare se `ACCOUNT_CATEGORIES` è usato solo come valore iniziale di questa `useKV`. Se non viene più usato altrove in `AppDataContext.tsx`, rimuovere anche l'import. Se viene usato per altri scopi, mantenerlo.

#### C2 — Rimuovere `useKV('dismissed-budget-alerts', [])`

Riga attuale circa 184:

```ts
const [dismissedAlerts, setDismissedAlerts] = useKV<string[]>('dismissed-budget-alerts', [])
```

Rimuovere.

#### C3 — Aggiornare l'interfaccia `AppDataContextValue`

Rimuovere:
- `visibleCategories: string[]`
- `setVisibleCategories: ReturnType<typeof useKV<string[]>>[1]`
- `dismissedAlerts: string[]`
- `setDismissedAlerts: ReturnType<typeof useKV<string[]>>[1]`
- `toggleCategoryVisibility: (categoryId: string) => void`
- `toggleAllCategories: () => void`
- `handleDismissBudgetAlert: (budgetId: string) => void`

#### C4 — Rimuovere gli handler

Rimuovere le implementazioni di:
- `toggleCategoryVisibility` (riga circa 584)
- `toggleAllCategories` (riga circa 604)
- `handleDismissBudgetAlert` (riga circa 620)

Rimuovere le rispettive voci dal valore del context (righe circa 683–685).

#### C5 — Verificare `import { useKV }`

Dopo C1–C4, `useKV` deve essere ancora usato per `budgetPercentages` (riga 185). Verificare che l'import rimanga. **Non rimuoverlo:** `budgetPercentages` sopravvive fino al Blocco 6.

> **Atteso dopo C1–C4:** `grep useKV src/context/AppDataContext.tsx` mostra solo 1 voce: `budget-percentages`.

#### Gate intermedio C

- `npm run build` — attesi errori TypeScript nei consumer (`use-visible-data.ts`, `DashboardTab.tsx`, `use-app-shortcuts.ts`, `App.tsx`) che ancora usano le voci rimosse. Questo è **atteso**: i passi D–F risolvono questi errori. Verificare solo che non ci siano errori nuovi non attesi nel file `AppDataContext.tsx` stesso.

---

### Passo D — Aggiornare `use-visible-data.ts`

**File modificato:** `src/hooks/use-visible-data.ts`

**Obiettivo:** leggere `visibleCategories` e `dismissedBudgetAlerts` da `useUserSettings()` invece che da `useAppData()`. La logica di derivazione rimane identica.

#### D1 — Import

Aggiungere import del hook di accesso al context `UserSettingsContext`:

```ts
import { useUserSettingsContext } from '@/context/UserSettingsContext'
```

(oppure l'alias scelto nel Passo B3)

#### D2 — Cambio sorgente preferenze

Sostituire nel destructuring di `useAppData()`:
- Rimuovere `visibleCategories` e `dismissedAlerts`.

Aggiungere destructuring da `useUserSettingsContext()`:

```ts
const { visibleCategories, dismissedBudgetAlerts } = useUserSettingsContext()
```

> **Nota rinomina:** il nome `dismissedAlerts` usato oggi in `use-visible-data.ts` (proveniente da `AppDataContext`) diventa `dismissedBudgetAlerts` (nome nella superficie di `useUserSettings()`). Aggiornare tutti i riferimenti locali nel hook: ovunque il codice usa `dismissedAlerts`, sostituire con `dismissedBudgetAlerts`.

#### D3 — Nessuna modifica alla logica di calcolo

Le formule `useMemo` per `filteredGroupedAccounts`, `allCategoriesVisible`, `budgetAlerts` rimangono identiche. Cambia solo la variabile sorgente (`dismissedAlerts` → `dismissedBudgetAlerts`).

#### Gate intermedio D

- `npm run build` — attesi errori residui in `DashboardTab.tsx`, `use-app-shortcuts.ts`, `App.tsx`. Non attesi errori in `use-visible-data.ts`.
- `npx tsc --noEmit` → 0 errori in `use-visible-data.ts`

---

### Passo E — Aggiornare i consumer di toggle

#### E1 — `DashboardTab.tsx`

**File modificato:** `src/components/DashboardTab.tsx`

**Contesto attuale:** il componente destruttura `toggleCategoryVisibility` e `toggleAllCategories` da `useAppData()` (righe 32–33). Le usa in due punti: riga 207 (`toggleAllCategories` su click del pulsante "Tutte") e riga 234 (`toggleCategoryVisibility(category.id)` su click di ogni categoria).

**Modifiche:**

1. Rimuovere `toggleCategoryVisibility`, `toggleAllCategories` dalla destructuring di `useAppData()`.
2. Aggiungere import e destructuring da `useUserSettingsContext()`:

```ts
const { visibleCategories, setVisibleCategories } = useUserSettingsContext()
```

3. Implementare la logica di toggle locale:

   - **Toggle singola categoria** (sostituisce `toggleCategoryVisibility(category.id)`):
     ```ts
     const handleToggleCategory = (categoryId: string) => {
       const newIds = visibleCategories.includes(categoryId)
         ? visibleCategories.filter(id => id !== categoryId)
         : [...visibleCategories, categoryId]
       setVisibleCategories(newIds)
     }
     ```
     Usare `handleToggleCategory(category.id)` al posto di `toggleCategoryVisibility(category.id)`.

   - **Toggle tutte** (sostituisce `toggleAllCategories()`):
     ```ts
     const handleToggleAll = () => {
       const allIds = ACCOUNT_CATEGORIES.map(c => c.id)
       const newIds = visibleCategories.length === allIds.length ? [] : allIds
       setVisibleCategories(newIds)
     }
     ```
     Usare `handleToggleAll` al posto di `toggleAllCategories`.

> **Nota:** `ACCOUNT_CATEGORIES` deve essere importato da `@/lib/constants` se non già presente nel file. Verificare se l'import esiste già.

#### E2 — `use-app-shortcuts.ts`

**File modificato:** `src/hooks/use-app-shortcuts.ts`

**Contesto attuale:** il hook destruttura `toggleCategoryVisibility` e `toggleAllCategories` da `useAppData()` (righe 32–33) e li usa nelle scorciatoie da tastiera (riga 55 circa: `toggleCategoryVisibility('banking')`).

**Modifiche:**

1. Rimuovere `toggleCategoryVisibility`, `toggleAllCategories` dalla destructuring di `useAppData()`.
2. Aggiungere import e destructuring da `useUserSettingsContext()`:

```ts
const { visibleCategories, setVisibleCategories } = useUserSettingsContext()
```

3. Implementare la logica di toggle locale analoga a E1:
   - Toggle singola categoria per id: calcolare `newIds` e chiamare `setVisibleCategories(newIds)`.
   - Toggle tutte: calcolare `newIds` (tutti gli id o `[]`) e chiamare `setVisibleCategories(newIds)`.

#### Gate intermedio E

- `npm run build` exit 0
- `npx tsc --noEmit` → 0 errori in `DashboardTab.tsx` e `use-app-shortcuts.ts`

---

### Passo F — Aggiornare `App.tsx`

**File modificato:** `src/App.tsx`

**Obiettivo 1:** montare `UserSettingsProvider` nell'albero dei provider, tra `AppDataProvider` e `VisibleDataProvider`.

**Obiettivo 2:** spostare `handleDismissBudgetAlert` da `useAppData()` a `useUserSettings()`.

#### F1 — Import e albero provider

Aggiungere import:

```ts
import { UserSettingsProvider } from '@/context/UserSettingsContext'
```

Modificare l'albero dei provider da:

```tsx
<AppDataProvider>
  <VisibleDataProvider>
    ...
  </VisibleDataProvider>
</AppDataProvider>
```

A:

```tsx
<AppDataProvider>
  <UserSettingsProvider>
    <VisibleDataProvider>
      ...
    </VisibleDataProvider>
  </UserSettingsProvider>
</AppDataProvider>
```

#### F2 — `handleDismissBudgetAlert`

- Rimuovere `handleDismissBudgetAlert` dalla destructuring di `useAppData()`.
- Aggiungere destructuring di `dismissBudgetAlert` da `useUserSettingsContext()`.
- Sostituire `onDismiss={handleDismissBudgetAlert}` con `onDismiss={dismissBudgetAlert}` (riga 92 circa).

> **Ordine dei gate in `App.tsx` dopo P29 (invariato rispetto a P28):**
> 1. `if (!isAuthReady) return <LoadingSpinner />`
> 2. `if (!isAuthenticated) return <AuthScreen />`
> 3. `if (needsOnboarding) return <OnboardingFlow />`
> 4. `if (!isDataReady) return <LoadingSpinner />`
> 5. `return <Dashboard ...>`
>
> Nessun gate aggiuntivo per `!isSettingsReady`: non è necessario perché la transizione a `true` è quasi istantanea (Decisione B + P29 §8 punto 5).

#### Gate intermedio F

- `npm run build` exit 0
- `npm run test:run` — attesi errori nel mock dei test (non ancora aggiornato)
- `npx tsc --noEmit` → 0 errori in `App.tsx`

---

### Passo G — Aggiornare `src/test/smoke/test-utils.ts`

**File modificato:** `src/test/smoke/test-utils.ts`

**Obiettivo:** aggiornare il mock di `AppDataContext` per riflettere la superficie pubblica aggiornata; aggiungere un mock per `UserSettingsContext`.

#### G1 — Aggiornare mock `AppDataContext`

Rimuovere dal mock:
- `toggleCategoryVisibility: vi.fn()` (riga 144)
- `toggleAllCategories: vi.fn()` (riga 145)
- `handleDismissBudgetAlert: vi.fn()` (riga 146)
- `visibleCategories` (se presente nel mock)
- `dismissedAlerts` (se presente nel mock)
- `setVisibleCategories` (se presente nel mock)
- `setDismissedAlerts` (se presente nel mock)

#### G2 — Aggiungere mock `UserSettingsContext`

Aggiungere un mock del `UserSettingsContext` che restituisce valori di default stabili per i test:

```ts
vi.mock('@/context/UserSettingsContext', () => ({
  useUserSettingsContext: () => ({
    visibleCategories: ['banking', 'digital', 'savings', 'investments', 'private'],
    dismissedBudgetAlerts: [],
    setVisibleCategories: vi.fn().mockResolvedValue(undefined),
    dismissBudgetAlert: vi.fn().mockResolvedValue(undefined),
    resetDismissedAlerts: vi.fn().mockResolvedValue(undefined),
    isSettingsReady: true,
    isSettingsLoading: false,
    settingsError: null,
  }),
  UserSettingsProvider: ({ children }: { children: React.ReactNode }) => children,
}))
```

> **Nota:** il mock di `visibleCategories` con tutte e 5 le categorie ripristina il comportamento "tutto visibile" nei test, che è la baseline attesa. Diverso dal comportamento di produzione a bootstrap (array vuoto per Decisione B) — ma corretto per i test, dove `isSettingsReady = true` è già impostato.

#### Gate intermedio G

- `npm run test:run` → tutti i test passed (stessa baseline pre-P29)
- Verificare test 01–04; test 05 può rimanere in stato di fallimento noto pre-esistente

---

### Gate finale H (= gate P29)

Tutti i passi A–G devono essere completati prima di verificare questo gate.

- `npm run build` exit 0
- `npm run test:run` → test 01–04 passed (stessa baseline)
- `npx tsc --noEmit` → 0 errori TypeScript
- `grep useKV src/context/AppDataContext.tsx` → **1 sola voce** attesa: `budget-percentages`
- `useUserSettingsContext()` espone tutti gli 8 valori della superficie pubblica P29 §4: `visibleCategories`, `dismissedBudgetAlerts`, `setVisibleCategories`, `dismissBudgetAlert`, `resetDismissedAlerts`, `isSettingsReady`, `isSettingsLoading`, `settingsError`
- Verifica a vista: albero provider in `App.tsx` — `UserSettingsProvider` è figlio di `AppDataProvider` e genitore di `VisibleDataProvider`
- Verifica a vista: `use-visible-data.ts` legge `visibleCategories` e `dismissedBudgetAlerts` da `useUserSettingsContext()` (non da `useAppData()`)
- `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## Blocchi noti

> _Nessun blocco noto al momento dell'apertura del task._

---

## Note operative

- **Naming del hook di accesso al context (Passo B3):** scegliere tra esportare `useUserSettingsContext` come nome esplicito oppure esportare `useUserSettings` come alias. La seconda opzione è più leggibile per i consumer, ma può creare confusione con il hook puro interno (stesso nome). La prima opzione è più esplicita. Documentare la scelta scelta nel file `UserSettingsContext.tsx`.
- **Import di `ACCOUNT_CATEGORIES` in `DashboardTab.tsx` e `use-app-shortcuts.ts` (Passo E):** verificare se già importato da `@/lib/constants`. Se non presente, aggiungerlo. Se il file dei constants non esporta `ACCOUNT_CATEGORIES` ma solo `DEFAULT_CATEGORIES`, verificare il nome corretto.
- **Verifica `dismissedAlerts` vs `dismissedBudgetAlerts` (Passo D):** il nome interno in `use-visible-data.ts` e nei componenti prima di P29 era `dismissedAlerts`. Dopo P29 il nome nella superficie di `useUserSettings()` è `dismissedBudgetAlerts`. Assicurarsi di aggiornare tutti i riferimenti nel file.
- **`setVisibleCategories` è asincrona:** nei consumer (`DashboardTab.tsx`, `use-app-shortcuts.ts`), la chiamata `setVisibleCategories(newIds)` è `async`. Se i componenti non gestiscono già le promise (es. con `.catch()`), aggiungere `.catch(console.error)` o equivalente per evitare promise non gestite. Non bloccare l'UI in attesa della promise.
- **Test 05 pre-esistente:** il test 05 (`dovrebbe mostrare il conto privato solo dopo lo sblocco con PIN dedicato`) era già in stato di fallimento prima di P29. Documentare nel gate G che questo fallimento è pre-esistente e non introdotto da P29.
- **`UserSettingsProvider` nel mock dei test (G2):** il mock deve restituire `children` direttamente dal `UserSettingsProvider` fittizio, in modo che i test che wrappano componenti dentro `UserSettingsProvider` non richiedano una struttura di context reale.
