# P30 — Todo: Migrazione `budgetPercentages` a `useState`

> Pacchetto P30 — Blocco 6: rimozione ultima `useKV` da `AppDataContext.tsx`
> Piano di riferimento: `docs/2 - coding plans/P30-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P30-migrazione-budgetpercentages-usestate.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-03
> Completato: 2026-05-03

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [x] PASS |
| `npm run lint` → 0 errori; 5 warning pre-esistenti | [x] PASS |
| `npm run test:run` → tutti i test passed (5/5) | [x] PASS |
| `grep -rn "useKV" src/context/AppDataContext.tsx` → 0 risultati | [x] |
| `grep -rn "@github/spark/hooks" src/context/AppDataContext.tsx` → 0 risultati | [x] |
| `budgetPercentages` rimosso da `AppDataContextValue` | [x] RIMOSSO |
| `setBudgetPercentages({})` presente nel blocco logout | [x] PRESENTE |
| Nessun file in `src/lib/supabase/` modificato | [x] |
| `git diff --name-only HEAD \| grep ".github"` → output vuoto (nota: `.github/runtime/orchestrator-state.json` era già noto) | [x] |

---

## Prima di iniziare

> Non avviare il Passo A finché questi controlli non sono completati e documentati.

 - [x] Leggere integralmente il coding plan `docs/2 - coding plans/P30-coding-plan.md`
 - [x] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)

### BL0 — Baseline pre-P30

 - [x] `npm run build` → exit 0 (baseline pre-P30)
 - [x] `npm run lint` → 0 errori; 5 warning (baseline pre-P30)
 - [x] `npm run test:run` → tutti i test passed — annotare il numero esatto trovato:
   > Esito BL0 test: 5/5 passed

### BL1 — Verifica `useKV` in `AppDataContext.tsx`

 - [x] Eseguire `grep -n "useKV" src/context/AppDataContext.tsx` — annotare il risultato (riga e contesto):
   > Esito BL1:
   ```
   const [budgetPercentages, setBudgetPercentages] = sparkHooks.useKV<Record<string, number>>('budget-percentages', {})
   ```
   - Occorrenze baseline pre-fix: 1 (relativa a `budget-percentages`)
   - useKV residua post-fix: 0 (nessuna occorrenza di `useKV` in `AppDataContext.tsx`)

### BL2 — Ambiguità AI1: superficie pubblica del context

 - [x] Leggere l'interfaccia `AppDataContextValue` (o tipo equivalente) in `AppDataContext.tsx` per stabilire se `budgetPercentages` e `setBudgetPercentages` sono esposti — documentare l'esito:
   > Esito AI1:
   > - Stato iniziale (pre-fix): `budgetPercentages` e `setBudgetPercentages` erano esposti nella superficie pubblica del context (pre-migrazione).
   > - Stato finale (post-fix): `budgetPercentages` e `setBudgetPercentages` NON sono più esposti pubblicamente in `AppDataContextValue` (rimosso dall'interfaccia pubblica).

### BL3 — Ambiguità AI2: esclusione `dismissedBudgetAlerts`

 - [x] Confermare che `dismissedBudgetAlerts` è già in `useUserSettings()` dopo P29 — NON toccarlo in P30

---

## Passo A — Sostituzione `useKV` → `useState` in `AppDataContext.tsx`

> Prerequisito: BL0–BL3 completati e documentati.
> Perimetro: `src/context/AppDataContext.tsx` — unico file modificato.

### A1 — Sostituire la dichiarazione `useKV` con `useState`

 - [x] Sostituire `const [budgetPercentages, setBudgetPercentages] = useKV<Record<string, number>>('budget-percentages', {})` con `const [budgetPercentages, setBudgetPercentages] = useState<Record<string, number>>({})`

### A2 — Rimuovere `budgetPercentages` dall'interfaccia pubblica

 - [x] Rimuovere `budgetPercentages: Record<string, number>` da `AppDataContextValue` (esito AI1: rimosso)
 - [x] Rimuovere `setBudgetPercentages: ...` da `AppDataContextValue` (esito AI1: rimosso)

### A3 — Rimuovere dal valore del context

 - [x] Rimuovere `budgetPercentages` e `setBudgetPercentages` dal valore passato a `<AppDataContext.Provider value={...}>`

### A4 — Aggiungere reset al logout

 - [x] Aggiungere `setBudgetPercentages({})` nel blocco logout (`useEffect` su `isAuthenticated`), coerente con il pattern P27/P28/P29 (presente)

### A5 — Rimuovere l'import da `@github/spark/hooks`

 - [x] Verificare con `grep -n "@github/spark/hooks" src/context/AppDataContext.tsx` che `useKV` sia l'unica voce importata
 - [x] Rimuovere `import { useKV } from '@github/spark/hooks'` dal file (non presente post-fix)

### Gate intermedio A

 - [x] `npm run build` → exit 0 (PASS)
 - [x] `npm run lint` → 0 errori; 5 warning (PASS, warning pre-esistenti)
 - [x] `npm run test:run` → tutti i test passed (5/5) (PASS)
 - [x] `grep -rn "useKV" src/context/AppDataContext.tsx` → 0 risultati
 - [x] `grep -rn "@github/spark/hooks" src/context/AppDataContext.tsx` → 0 risultati

---

## Verifica finale

> Tutti i sotto-passi del Passo A devono essere completati prima di questa sezione.

 - [x] `npm run build` exit 0 — invariato rispetto alla baseline BL0 (PASS)
 - [x] `npm run lint` 0 errori; 5 warning — invariato rispetto alla baseline BL0 (PASS, warning pre-esistenti)
 - [x] Tutti i test passed — numero invariato rispetto alla baseline BL0 (5/5)
 - [x] `grep -rn "useKV" src/context/AppDataContext.tsx` → 0 risultati
 - [x] `grep -rn "@github/spark/hooks" src/context/AppDataContext.tsx` → 0 risultati
 - [x] `grep -rn "budgetPercentages" src/context/AppDataContext.tsx` → solo occorrenze `useState` (nessuna `useKV`)
 - [x] `budgetPercentages` non compare nell'interfaccia `AppDataContextValue`
 - [x] `setBudgetPercentages({})` presente nel blocco logout
 - [x] `checkBudgetNotifications` funziona invariata (nessuna modifica alla logica)
 - [x] Nessun file in `src/lib/supabase/` modificato
 - [x] Nessun file in `.github/` modificato (eccezione nota: `.github/runtime/orchestrator-state.json` preesistente)
 - [x] `dismissedBudgetAlerts` non toccato

---

## Checklist gate finale

| Gate | Atteso | Effettivo |
|---|---|---|
| `npm run build` | exit 0 | PASS |
| `npm run lint` | 0 errori; 5 warning | PASS |
| `npm run test:run` | tutti i test passed (5/5) | PASS |
| `grep -rn "useKV" src/context/AppDataContext.tsx` | 0 risultati | PASS |
| `grep -rn "@github/spark/hooks" src/context/AppDataContext.tsx` | 0 risultati | PASS |
| `budgetPercentages` rimosso da `AppDataContextValue` | rimosso | PASS |
| `setBudgetPercentages({})` nel blocco logout | presente | PASS |
| File `src/lib/supabase/**` modificati | 0 | PASS |
| `git diff --name-only HEAD \| grep ".github"` | output vuoto | PASS |
