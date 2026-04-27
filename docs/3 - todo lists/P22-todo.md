# P22 — Todo List: Bugfix BUG-04 — loop infinito nel campo importo di TransactionDialog

> Passo 22 — Bugfix BUG-04: loop infinito TransactionDialog / campo importo  
> Piano di riferimento: `docs/2 - coding plans/P22-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P22-transaction-dialog-bugfix-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: —  
> Data completamento: —

---

## Esito finale

- [ ] `use-screen-reader.ts` modificato: `useMemo` aggiunto all'import e al return
- [ ] `TransactionDialog.tsx` modificato: destruttazione + 4 dep array corretti
- [ ] Nessun `screenReader.*` residuo in `TransactionDialog.tsx`
- [ ] `tsc --noEmit` → 0 errori
- [ ] `npm run lint` → 0 problems (invariato rispetto a P20)
- [ ] `npm run build` → exit 0
- [ ] `npm run test:run` → 5 passed
- [ ] Verifica manuale: campo importo accetta input senza reset
- [ ] Nessun altro file modificato

---

## Prima di iniziare

- [ ] Verificare: `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [ ] Verificare: `npm run test:run` → `5 passed`
- [ ] Leggere il coding plan completo `docs/2 - coding plans/P22-coding-plan.md`

---

## Step 1 — Modifica `src/hooks/use-screen-reader.ts`

- [ ] Aggiungere `useMemo` all'import React (riga 1):
  `import { useEffect, useCallback, useMemo } from 'react'`
- [ ] Avvolgere il return dell'hook in `useMemo(() => ({ ... }), [deps])`
- [ ] Verificare che l'array deps del `useMemo` contenga tutte le 38 callback
  (nessuna omessa rispetto all'oggetto di ritorno originale)
- [ ] Aggiungere il commento `// eslint-disable-next-line react-hooks/exhaustive-deps`
  sopra l'array deps se compare un warning lint
- [ ] Nessun `useCallback` interno modificato
- [ ] **Gate intermedio:** `tsc --noEmit` → 0 errori dopo questo step

---

## Step 2 — Modifica `src/components/TransactionDialog.tsx`

- [ ] Cambiare `const screenReader = useScreenReader()` in destruttazione delle 4 funzioni:
  ```tsx
  const {
    announceDialogOpen,
    announce,
    announceFormError,
    announceSuccess,
  } = useScreenReader()
  ```

- [ ] **Effect 1** (apertura dialog, righe ~66–75):
  - [ ] `screenReader.announceDialogOpen(...)` → `announceDialogOpen(...)`
  - [ ] Dep array: `screenReader` → `announceDialogOpen`
    (da `[open, transaction, screenReader, resetForm]` a `[open, transaction, announceDialogOpen, resetForm]`)

- [ ] **Effect 2** (trasferimento, righe ~78–92):
  - [ ] `screenReader.announce(...)` → `announce(...)`
  - [ ] Dep array: `screenReader` → `announce`

- [ ] **Effect 3** (ricorrenza, righe ~93–100):
  - [ ] `screenReader.announce(...)` → `announce(...)`
  - [ ] Dep array: `screenReader` → `announce`

- [ ] **Effect 4** (errori validazione, righe ~101–113):
  - [ ] `screenReader.announceFormError(...)` → `announceFormError(...)`
  - [ ] `screenReader.announceSuccess(...)` → `announceSuccess(...)`
  - [ ] Dep array: `screenReader` → `announceFormError, announceSuccess`

- [ ] **Handler inline** checkbox ricorrente (`onCheckedChange`):
  - [ ] `screenReader.announce(...)` → `announce(...)`

- [ ] Verificare: nessuna occorrenza di `screenReader.` rimasta nel file
- [ ] Verificare: `TransactionDialogProps` identica all'originale
- [ ] Verificare: `handleSubmit` identica all'originale
- [ ] Verificare: `resetForm` identica all'originale
- [ ] Verificare: JSX identico all'originale

---

## Verifica locale post-modifica

- [ ] `tsc --noEmit` → 0 errori
- [ ] `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [ ] `npm run build` → exit 0
- [ ] `npm run test:run` → `5 passed`
- [ ] Nessun file oltre ai due modificati risulta cambiato nel diff

---

## Verifica manuale

- [ ] Aprire il dialog "Nuovo Movimento"
- [ ] Cliccare sul campo Importo e digitare `10.50` → il valore rimane nel campo
- [ ] Premere la freccia su del browser → il valore aumenta senza reset
- [ ] Cambiare tipo in "Trasferimento" → il campo importo mantiene il valore
- [ ] Attivare la ricorrenza → il campo importo mantiene il valore
- [ ] Salvare il movimento → il movimento viene salvato con importo `10.50`
- [ ] Aprire il dialog "Modifica Movimento" su un movimento esistente →
  il form mostra i dati esistenti (non viene azzerato)

---

## Checklist gate finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| CA-01: `useMemo` nell'import di `use-screen-reader.ts` | `import { useEffect, useCallback, useMemo } from 'react'` | — | ☐ |
| CA-02: return avvolto in `useMemo(...)` | `return useMemo(() => ({ ... }), [...])` | — | ☐ |
| CA-03: array deps `useMemo` completo (38 callback) | 38 voci corrispondenti all'oggetto | — | ☐ |
| CA-04: nessun `useCallback` interno modificato | Tutti i `useCallback` invariati | — | ☐ |
| CA-05: `const screenReader = useScreenReader()` rimosso | 0 occorrenze nel file | — | ☐ |
| CA-06: destruttazione con almeno 4 funzioni | `announceDialogOpen`, `announce`, `announceFormError`, `announceSuccess` | — | ☐ |
| CA-07: Effect 1 deps senza `screenReader` | `[open, transaction, announceDialogOpen, resetForm]` | — | ☐ |
| CA-08: Effect 2 deps senza `screenReader` | `[..., announce]` | — | ☐ |
| CA-09: Effect 3 deps senza `screenReader` | `[ricorrente, frequenzaRicorrenza, announce]` | — | ☐ |
| CA-10: Effect 4 deps senza `screenReader` | `[error, previousError, announceFormError, announceSuccess]` | — | ☐ |
| CA-11: nessun `screenReader.` residuo | 0 occorrenze `screenReader.` nel file | — | ☐ |
| CA-12: `TransactionDialogProps` identica | Invariata | — | ☐ |
| CA-13: `handleSubmit` identica | Invariata | — | ☐ |
| CA-14: `resetForm` identica | Invariata | — | ☐ |
| CA-15: JSX identico | Invariato | — | ☐ |
| CA-16: `tsc --noEmit` | 0 errori | — | ☐ |
| CA-17: ESLint senza nuovi warning exhaustive-deps | 0 nuovi warning | — | ☐ |
| CA-18: nessun altro file modificato | 0 altri file nel diff | — | ☐ |
| Gate lint | `0 problems (0 errors, 0 warnings)` | — | ☐ |
| Gate build | exit 0 | — | ☐ |
| Gate test | `5 passed` | — | ☐ |
| Gate manuale: campo importo | Input `10.50` persistente | — | ☐ |
| Gate manuale: Modifica Movimento | Form pre-compilato con dati esistenti | — | ☐ |
