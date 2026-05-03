# P30 — Todo: Migrazione `budgetPercentages` a `useState`

> Pacchetto P30 — Blocco 6: rimozione ultima `useKV` da `AppDataContext.tsx`
> Piano di riferimento: `docs/2 - coding plans/P30-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P30-migrazione-budgetpercentages-usestate.md`
> Branch: `refactoring-architettura`
> Data inizio: —
> Completato: —

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [ ] |
| `npm run lint` → 0 warning | [ ] |
| `npm run test:run` → tutti i test passed | [ ] |
| `grep -rn "useKV" src/context/AppDataContext.tsx` → 0 risultati | [ ] |
| `grep -rn "@github/spark/hooks" src/context/AppDataContext.tsx` → 0 risultati | [ ] |
| `budgetPercentages` rimosso da `AppDataContextValue` | [ ] |
| `setBudgetPercentages({})` presente nel blocco logout | [ ] |
| Nessun file in `src/lib/supabase/` modificato | [ ] |
| `git diff --name-only HEAD \| grep ".github"` → output vuoto | [ ] |

---

## Prima di iniziare

> Non avviare il Passo A finché questi controlli non sono completati e documentati.

 - [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P30-coding-plan.md`
 - [ ] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)

### BL0 — Baseline pre-P30

 - [ ] `npm run build` → exit 0 (baseline pre-P30)
 - [ ] `npm run lint` → 0 warning (baseline pre-P30)
 - [ ] `npm run test:run` → tutti i test passed — annotare il numero esatto trovato:
   > Esito BL0 test: ___

### BL1 — Verifica `useKV` in `AppDataContext.tsx`

 - [ ] Eseguire `grep -n "useKV" src/context/AppDataContext.tsx` — annotare il risultato (riga e contesto):
   > Esito BL1:
   ```
   ___
   ```

### BL2 — Ambiguità AI1: superficie pubblica del context

 - [ ] Leggere l'interfaccia `AppDataContextValue` (o tipo equivalente) in `AppDataContext.tsx` per stabilire se `budgetPercentages` e `setBudgetPercentages` sono esposti — documentare l'esito:
   > Esito AI1:
   > - `budgetPercentages` nell'interfaccia pubblica: ☐ Sì → da rimuovere  ☐ No → A2 è no-op
   > - `setBudgetPercentages` nell'interfaccia pubblica: ☐ Sì → da rimuovere  ☐ No → A2 è no-op

### BL3 — Ambiguità AI2: esclusione `dismissedBudgetAlerts`

 - [ ] Confermare che `dismissedBudgetAlerts` è già in `useUserSettings()` dopo P29 — NON toccarlo in P30

---

## Passo A — Sostituzione `useKV` → `useState` in `AppDataContext.tsx`

> Prerequisito: BL0–BL3 completati e documentati.
> Perimetro: `src/context/AppDataContext.tsx` — unico file modificato.

### A1 — Sostituire la dichiarazione `useKV` con `useState`

 - [ ] Sostituire `const [budgetPercentages, setBudgetPercentages] = useKV<Record<string, number>>('budget-percentages', {})` con `const [budgetPercentages, setBudgetPercentages] = useState<Record<string, number>>({})`

### A2 — Rimuovere `budgetPercentages` dall'interfaccia pubblica

 - [ ] Rimuovere `budgetPercentages: Record<string, number>` da `AppDataContextValue` (solo se esposto — esito AI1)
 - [ ] Rimuovere `setBudgetPercentages: ...` da `AppDataContextValue` (solo se esposto — esito AI1)

### A3 — Rimuovere dal valore del context

 - [ ] Rimuovere `budgetPercentages` e `setBudgetPercentages` dal valore passato a `<AppDataContext.Provider value={...}>`

### A4 — Aggiungere reset al logout

 - [ ] Aggiungere `setBudgetPercentages({})` nel blocco logout (`useEffect` su `isAuthenticated`), coerente con il pattern P27/P28/P29

### A5 — Rimuovere l'import da `@github/spark/hooks`

 - [ ] Verificare con `grep -n "@github/spark/hooks" src/context/AppDataContext.tsx` che `useKV` sia l'unica voce importata
 - [ ] Rimuovere `import { useKV } from '@github/spark/hooks'` dal file

### Gate intermedio A

 - [ ] `npm run build` → exit 0
 - [ ] `npm run lint` → 0 warning
 - [ ] `npm run test:run` → tutti i test passed — stesso numero annotato nella baseline BL0
 - [ ] `grep -rn "useKV" src/context/AppDataContext.tsx` → 0 risultati
 - [ ] `grep -rn "@github/spark/hooks" src/context/AppDataContext.tsx` → 0 risultati

---

## Verifica finale

> Tutti i sotto-passi del Passo A devono essere completati prima di questa sezione.

 - [ ] `npm run build` exit 0 — invariato rispetto alla baseline BL0
 - [ ] `npm run lint` 0 warning — invariato rispetto alla baseline BL0
 - [ ] Tutti i test passed — numero invariato rispetto alla baseline BL0
 - [ ] `grep -rn "useKV" src/context/AppDataContext.tsx` → 0 risultati
 - [ ] `grep -rn "@github/spark/hooks" src/context/AppDataContext.tsx` → 0 risultati
 - [ ] `grep -rn "budgetPercentages" src/context/AppDataContext.tsx` → solo occorrenze `useState` (nessuna `useKV`)
 - [ ] `budgetPercentages` non compare nell'interfaccia `AppDataContextValue`
 - [ ] `setBudgetPercentages({})` presente nel blocco logout
 - [ ] `checkBudgetNotifications` funziona invariata (nessuna modifica alla logica)
 - [ ] Nessun file in `src/lib/supabase/` modificato
 - [ ] Nessun file in `.github/` modificato
 - [ ] `dismissedBudgetAlerts` non toccato

---

## Checklist gate finale

| Gate | Atteso | Effettivo |
|---|---|---|
| `npm run build` | exit 0 | |
| `npm run lint` | 0 warning | |
| `npm run test:run` | tutti i test passed | |
| `grep -rn "useKV" src/context/AppDataContext.tsx` | 0 risultati | |
| `grep -rn "@github/spark/hooks" src/context/AppDataContext.tsx` | 0 risultati | |
| `budgetPercentages` rimosso da `AppDataContextValue` | rimosso | |
| `setBudgetPercentages({})` nel blocco logout | presente | |
| File `src/lib/supabase/**` modificati | 0 | |
| `git diff --name-only HEAD \| grep ".github"` | output vuoto | |
