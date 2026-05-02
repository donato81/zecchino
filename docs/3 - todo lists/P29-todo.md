# P29 — Todo List: Migrazione useUserSettings e Preferenze UI

> Pacchetto 29 — Blocco 5 migrazione Spark→Supabase (preferenze UI)
> Piano di riferimento: `docs/2 - coding plans/P29-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P29-migrazione-usersettings-preferenze-ui.md`
> Branch: `refactoring-architettura`
> Data inizio: —
> Completato: —

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [ ] |
| `npm run test:run` → test 01–04 passed | [ ] |
| `npx tsc --noEmit` → 0 errori TypeScript | [ ] |
| `grep useKV src/context/AppDataContext.tsx` → 1 sola voce (`budget-percentages`) | [ ] |
| `useUserSettingsContext()` espone gli 8 valori della superficie pubblica P29 §4 | [ ] |
| Albero provider `App.tsx`: `AppDataProvider → UserSettingsProvider → VisibleDataProvider` | [ ] |
| `use-visible-data.ts` legge preferenze da `useUserSettingsContext()` (non da `useAppData()`) | [ ] |
| Nessun file `.github/**` modificato | [ ] |

---

## Prima di iniziare

- [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P29-coding-plan.md`
- [ ] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)
- [ ] Verificare che `npm run build` sia exit 0 (baseline pre-P29)
- [ ] Verificare che `npm run test:run` → test 01–04 passed (baseline pre-P29; test 05 può essere in stato di fallimento noto pre-esistente — documentare)

---

## Prerequisiti operativi

> Non iniziare il Passo A finché questi prerequisiti non sono verificati.

- [ ] **PR0** — Verificare che `AuthContext` esponga `userSettings` (record `UserSettings` da `getOrCreate()`):
  ```bash
  grep -n "userSettings" src/context/AuthContext.tsx
  ```
  > Esito PR0: ___________  
  > Se non esposto: aggiungere `userSettings` alla superficie pubblica di `AuthContext` (modifica minima — nessuna query aggiuntiva, il record è già caricato).

- [ ] **PR1** — Verificare che il repository `impostazioni-utente` esponga `getOrCreate` e `updatePreference`:
  ```bash
  grep -n "updatePreference\|getOrCreate" src/lib/supabase/repositories/impostazioni-utente.ts
  ```
  > Esito PR1: ___________

- [ ] **PR2** — Verificare `@supabase/supabase-js` in `package.json`:
  ```bash
  grep supabase package.json
  ```
  > Esito PR2: ___________

- [ ] **PR3** — Baseline build e test pre-P29:
  ```bash
  npm run build && npm run test:run
  ```
  > Esito PR3: build ___________; test ___________

---

## Passo A — Creare `src/hooks/use-user-settings.ts`

> Prerequisito: prerequisiti operativi PR0–PR3 verificati.
> File da creare: `src/hooks/use-user-settings.ts`

### A1 — Import

- [ ] Aggiungere `import { useAuth } from '@/context/AuthContext'`
- [ ] Aggiungere `import { updatePreference } from '@/lib/supabase/repositories/impostazioni-utente'`

### A2 — Stato locale

- [ ] Dichiarare `const [visibleCategories, setVisibleCategoriesState] = useState<string[]>([])`
- [ ] Dichiarare `const [dismissedBudgetAlerts, setDismissedBudgetAlertsState] = useState<string[]>([])`
- [ ] Dichiarare `const [isSettingsReady, setIsSettingsReady] = useState(false)`
- [ ] Dichiarare `const [isSettingsLoading, setIsSettingsLoading] = useState(false)`
- [ ] Dichiarare `const [settingsError, setSettingsError] = useState<string | null>(null)`

### A3 — Inizializzazione da `userSettings`

- [ ] Creare `useEffect` con dipendenza `[userSettings, isAuthenticated]`
- [ ] Branch `!isAuthenticated` o `userSettings` null: reset tutti i valori (`[]`, `[]`, `false`, `null`)
- [ ] Branch autenticato: leggere `preferences.visible_category_ids` → `[]` se null/assente
- [ ] Branch autenticato: leggere `preferences.dismissed_budget_alert_ids` → `[]` se null/assente
- [ ] Impostare i due stati locali e `isSettingsReady = true` (operazione sincrona)

### A4 — `setVisibleCategories(ids: string[])`

- [ ] Implementare funzione asincrona non ottimistica
- [ ] `isSettingsLoading = true`, `settingsError = null` all'avvio
- [ ] Chiamare `updatePreference('visible_category_ids', ids)`
- [ ] Successo: `setVisibleCategoriesState(ids)`, `isSettingsLoading = false`
- [ ] Errore (catch): NON aggiornare stato, `settingsError = messaggio`, `isSettingsLoading = false`

### A5 — `dismissBudgetAlert(budgetId: string)`

- [ ] Calcolare `newIds = [...dismissedBudgetAlerts, budgetId]` (se non già presente)
- [ ] Implementare funzione asincrona non ottimistica
- [ ] Chiamare `updatePreference('dismissed_budget_alert_ids', newIds)`
- [ ] Successo: `setDismissedBudgetAlertsState(newIds)`, `isSettingsLoading = false`
- [ ] Errore: NON aggiornare stato, `settingsError = messaggio`, `isSettingsLoading = false`

### A6 — `resetDismissedAlerts()`

- [ ] Implementare funzione asincrona non ottimistica
- [ ] Chiamare `updatePreference('dismissed_budget_alert_ids', [])`
- [ ] Successo: `setDismissedBudgetAlertsState([])`, `isSettingsLoading = false`
- [ ] Errore: NON aggiornare stato, `settingsError = messaggio`, `isSettingsLoading = false`

### A7 — Valore restituito

- [ ] Restituire oggetto con tutti gli 8 valori: `visibleCategories`, `dismissedBudgetAlerts`, `setVisibleCategories`, `dismissBudgetAlert`, `resetDismissedAlerts`, `isSettingsReady`, `isSettingsLoading`, `settingsError`

### Gate A

- [ ] `npm run build` exit 0 (eventuali errori nei consumer sono attesi — il file nuovo deve essere error-free)
- [ ] `npx tsc --noEmit` → 0 errori in `use-user-settings.ts`

---

## Passo B — Creare `src/context/UserSettingsContext.tsx`

> Prerequisito: Passo A completato.
> File da creare: `src/context/UserSettingsContext.tsx`

### B1 — Interfaccia `UserSettingsContextValue`

- [ ] Definire interfaccia con gli 8 valori: `visibleCategories: string[]`, `dismissedBudgetAlerts: string[]`, `setVisibleCategories: (ids: string[]) => Promise<void>`, `dismissBudgetAlert: (budgetId: string) => Promise<void>`, `resetDismissedAlerts: () => Promise<void>`, `isSettingsReady: boolean`, `isSettingsLoading: boolean`, `settingsError: string | null`

### B2 — `UserSettingsProvider`

- [ ] Creare `UserSettingsProvider` che chiama `useUserSettings()` e wrappa in context
- [ ] Esportare `UserSettingsProvider`

### B3 — Hook di accesso

- [ ] Creare e esportare hook di accesso al context (con guardia se montato fuori dal provider)
- [ ] Documentare nel file la convenzione di naming scelta (`useUserSettingsContext` vs `useUserSettings`)

### Gate B

- [ ] `npm run build` exit 0
- [ ] `npx tsc --noEmit` → 0 errori in `UserSettingsContext.tsx`

---

## Passo C — Aggiornare `src/context/AppDataContext.tsx`

> Prerequisito: Passo B completato.
> File da modificare: `src/context/AppDataContext.tsx`

### C1 — Rimuovere `useKV('visible-categories', ...)`

- [ ] Rimuovere `const [visibleCategories, setVisibleCategories] = useKV<string[]>('visible-categories', ...)` (righe circa 180–183)
- [ ] Verificare se `ACCOUNT_CATEGORIES` è usato solo come valore iniziale di questa `useKV` → se sì, rimuovere anche l'import

### C2 — Rimuovere `useKV('dismissed-budget-alerts', [])`

- [ ] Rimuovere `const [dismissedAlerts, setDismissedAlerts] = useKV<string[]>('dismissed-budget-alerts', [])` (riga circa 184)

### C3 — Aggiornare interfaccia `AppDataContextValue`

- [ ] Rimuovere `visibleCategories: string[]` dal tipo
- [ ] Rimuovere `setVisibleCategories: ReturnType<typeof useKV<string[]>>[1]` dal tipo
- [ ] Rimuovere `dismissedAlerts: string[]` dal tipo
- [ ] Rimuovere `setDismissedAlerts: ReturnType<typeof useKV<string[]>>[1]` dal tipo
- [ ] Rimuovere `toggleCategoryVisibility: (categoryId: string) => void` dal tipo
- [ ] Rimuovere `toggleAllCategories: () => void` dal tipo
- [ ] Rimuovere `handleDismissBudgetAlert: (budgetId: string) => void` dal tipo

### C4 — Rimuovere implementazioni handler

- [ ] Rimuovere implementazione di `toggleCategoryVisibility` (riga circa 584)
- [ ] Rimuovere implementazione di `toggleAllCategories` (riga circa 604)
- [ ] Rimuovere implementazione di `handleDismissBudgetAlert` (riga circa 620)
- [ ] Rimuovere le tre voci dal valore del context (righe circa 683–685)

### C5 — Verifica `import { useKV }`

- [ ] Verificare che `import { useKV } from '@github/spark/hooks'` rimanga (usato da `budgetPercentages`)
- [ ] Eseguire `grep useKV src/context/AppDataContext.tsx` → 1 sola voce attesa: `budget-percentages`

### Gate C

- [ ] Errori TypeScript nei consumer (C_consumer) sono **attesi** in questo punto — non bloccanti
- [ ] Nessun errore in `AppDataContext.tsx` stesso (`npx tsc --noEmit 2>&1 | grep AppDataContext`)

---

## Passo D — Aggiornare `src/hooks/use-visible-data.ts`

> Prerequisito: Passo C completato.
> File da modificare: `src/hooks/use-visible-data.ts`

- [ ] **D1** — Aggiungere import del hook di accesso da `UserSettingsContext`
- [ ] **D2** — Rimuovere `visibleCategories` e `dismissedAlerts` dalla destructuring di `useAppData()`
- [ ] **D3** — Aggiungere `const { visibleCategories, dismissedBudgetAlerts } = useUserSettingsContext()`
- [ ] **D4** — Rinominare `dismissedAlerts` → `dismissedBudgetAlerts` in tutti i riferimenti locali del hook
- [ ] **D5** — Verificare che la logica di calcolo `filteredGroupedAccounts`, `allCategoriesVisible`, `budgetAlerts` sia invariata (solo cambio nome variabile)

### Gate D

- [ ] `npx tsc --noEmit` → 0 errori in `use-visible-data.ts`
- [ ] Errori TypeScript residui in `DashboardTab.tsx`, `use-app-shortcuts.ts`, `App.tsx` sono ancora attesi — non bloccanti

---

## Passo E — Aggiornare consumer di toggle

> Prerequisito: Passo D completato.

### E1 — `src/components/DashboardTab.tsx`

- [ ] Rimuovere `toggleCategoryVisibility`, `toggleAllCategories` dalla destructuring di `useAppData()` (righe 32–33)
- [ ] Aggiungere import e destructuring: `const { visibleCategories, setVisibleCategories } = useUserSettingsContext()`
- [ ] Verificare/aggiungere import di `ACCOUNT_CATEGORIES` da `@/lib/constants`
- [ ] Implementare `handleToggleCategory(categoryId)`: calcola `newIds` e chiama `setVisibleCategories(newIds)` — con `.catch(console.error)` se la promise non è già gestita
- [ ] Implementare `handleToggleAll()`: calcola `newIds` (tutti gli id o `[]`) e chiama `setVisibleCategories(newIds)`
- [ ] Sostituire `onClick={toggleAllCategories}` → `onClick={handleToggleAll}` (riga 207)
- [ ] Sostituire `onClick={() => toggleCategoryVisibility(category.id)}` → `onClick={() => handleToggleCategory(category.id)}` (riga 234)

### E2 — `src/hooks/use-app-shortcuts.ts`

- [ ] Rimuovere `toggleCategoryVisibility`, `toggleAllCategories` dalla destructuring di `useAppData()` (righe 32–33)
- [ ] Aggiungere import e destructuring: `const { visibleCategories, setVisibleCategories } = useUserSettingsContext()`
- [ ] Verificare/aggiungere import di `ACCOUNT_CATEGORIES` da `@/lib/constants`
- [ ] Implementare logica toggle locale analoga a E1 per le scorciatoie da tastiera
- [ ] Sostituire ogni chiamata `toggleCategoryVisibility(...)` e `toggleAllCategories()` con le nuove implementazioni

### Gate E

- [ ] `npm run build` exit 0
- [ ] `npx tsc --noEmit` → 0 errori in `DashboardTab.tsx` e `use-app-shortcuts.ts`

---

## Passo F — Aggiornare `src/App.tsx`

> Prerequisito: Passo E completato.
> File da modificare: `src/App.tsx`

### F1 — Albero provider

- [ ] Aggiungere import: `import { UserSettingsProvider } from '@/context/UserSettingsContext'`
- [ ] Montare `UserSettingsProvider` tra `AppDataProvider` e `VisibleDataProvider` nell'albero React

### F2 — `handleDismissBudgetAlert` → `dismissBudgetAlert`

- [ ] Rimuovere `handleDismissBudgetAlert` dalla destructuring di `useAppData()` (riga 31 circa)
- [ ] Aggiungere `dismissBudgetAlert` dalla destructuring di `useUserSettingsContext()` (o `useUserSettings()` — usare il nome esportato scelto nel Passo B3)
- [ ] Sostituire `onDismiss={handleDismissBudgetAlert}` → `onDismiss={dismissBudgetAlert}` (riga 92 circa)

### F3 — Verifica gate

- [ ] Verificare a vista che i 4 gate di App.tsx siano nell'ordine corretto: `!isAuthReady` → `!isAuthenticated` → `needsOnboarding` → `!isDataReady`
- [ ] Nessun gate aggiuntivo per `!isSettingsReady` (non necessario per Decisione B + P29 §8.5)

### Gate F

- [ ] `npm run build` exit 0
- [ ] `npx tsc --noEmit` → 0 errori in `App.tsx`
- [ ] `npm run test:run` — errori attesi nel mock finché G non è completato

---

## Passo G — Aggiornare `src/test/smoke/test-utils.ts`

> Prerequisito: Passo F completato.
> File da modificare: `src/test/smoke/test-utils.ts`

### G1 — Aggiornare mock `AppDataContext`

- [ ] Rimuovere `toggleCategoryVisibility: vi.fn()` dal mock (riga 144)
- [ ] Rimuovere `toggleAllCategories: vi.fn()` dal mock (riga 145)
- [ ] Rimuovere `handleDismissBudgetAlert: vi.fn()` dal mock (riga 146)
- [ ] Verificare/rimuovere `visibleCategories`, `dismissedAlerts`, `setVisibleCategories`, `setDismissedAlerts` se presenti nel mock di `AppDataContext`

### G2 — Aggiungere mock `UserSettingsContext`

- [ ] Aggiungere mock di `@/context/UserSettingsContext` con:
  - `useUserSettingsContext` (o il nome esportato): restituisce `visibleCategories: ['banking', 'digital', 'savings', 'investments', 'private']`, `dismissedBudgetAlerts: []`, `setVisibleCategories: vi.fn().mockResolvedValue(undefined)`, `dismissBudgetAlert: vi.fn().mockResolvedValue(undefined)`, `resetDismissedAlerts: vi.fn().mockResolvedValue(undefined)`, `isSettingsReady: true`, `isSettingsLoading: false`, `settingsError: null`
  - `UserSettingsProvider`: componente passthrough (`({ children }) => children`)

### Gate G

- [ ] `npm run test:run` → test 01–04 passed
- [ ] Documentare esito test 05 (fallimento pre-esistente non correlato a P29)

---

## Gate finale H (= gate P29)

> Tutti i passi A–G devono essere completati prima di verificare questo gate.

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → test 01–04 passed
- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] `grep useKV src/context/AppDataContext.tsx` → 1 sola voce: `budget-percentages`
- [ ] `useUserSettingsContext()` espone gli 8 valori P29 §4: verificare a vista in `UserSettingsContext.tsx`
- [ ] Albero provider `App.tsx`: `AppDataProvider → UserSettingsProvider → VisibleDataProvider` — verificare a vista
- [ ] `use-visible-data.ts` legge da `useUserSettingsContext()` — verificare a vista
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto
