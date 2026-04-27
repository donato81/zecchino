# P22 — Todo List: Bugfix BUG-04 — loop infinito nel campo importo di TransactionDialog

> Passo 22 — Bugfix BUG-04: loop infinito TransactionDialog / campo importo  
> Piano di riferimento: `docs/2 - coding plans/P22-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P22-transaction-dialog-bugfix-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: 2026-04-27  
> Data completamento: 2026-04-27

---

## Esito finale

- [x] `use-screen-reader.ts` modificato: `useMemo` aggiunto all'import e al return
- [x] `TransactionDialog.tsx` modificato: destruttazione + 4 dep array corretti
- [x] Nessun `screenReader.*` residuo in `TransactionDialog.tsx`
- [x] `tsc --noEmit` → 0 errori
- [x] `npm run lint` → 0 problems (invariato rispetto a P20)
- [x] `npm run build` → exit 0
- [x] `npm run test:run` → 5 passed
- [x] Verifica manuale: campo importo accetta input senza reset
- [x] Nessun altro file modificato

---

## Prima di iniziare

- [x] Verificare: `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [x] Verificare: `npm run test:run` → `5 passed`
- [x] Leggere il coding plan completo `docs/2 - coding plans/P22-coding-plan.md`

---

## Step 1 — Modifica `src/hooks/use-screen-reader.ts`

- [x] Aggiungere `useMemo` all'import React (riga 1):
  `import { useEffect, useCallback, useMemo } from 'react'`
- [x] Avvolgere il return dell'hook in `useMemo(() => ({ ... }), [deps])`
- [x] Verificare che l'array deps del `useMemo` contenga tutte le 37 callback
  (nessuna omessa rispetto all'oggetto di ritorno originale)
- [x] Aggiungere il commento `// eslint-disable-next-line react-hooks/exhaustive-deps`
  sopra l'array deps se compare un warning lint
- [x] Nessun `useCallback` interno modificato
- [x] **Gate intermedio:** `tsc --noEmit` → 0 errori dopo questo step

---

## Step 2 — Modifica `src/components/TransactionDialog.tsx`

- [x] Cambiare `const screenReader = useScreenReader()` in destruttazione delle 4 funzioni:
  ```tsx
  const {
    announceDialogOpen,
    announce,
    announceFormError,
    announceSuccess,
  } = useScreenReader()
  ```

- [x] **Effect 1** (apertura dialog, righe ~66–75):
  - [x] `screenReader.announceDialogOpen(...)` → `announceDialogOpen(...)`
  - [x] Dep array: `screenReader` → `announceDialogOpen`
    (da `[open, transaction, screenReader, resetForm]` a `[open, transaction, announceDialogOpen, resetForm]`)

- [x] **Effect 2** (trasferimento, righe ~78–92):
  - [x] `screenReader.announce(...)` → `announce(...)`
  - [x] Dep array: `screenReader` → `announce`

- [x] **Effect 3** (ricorrenza, righe ~93–100):
  - [x] `screenReader.announce(...)` → `announce(...)`
  - [x] Dep array: `screenReader` → `announce`

- [x] **Effect 4** (errori validazione, righe ~101–113):
  - [x] `screenReader.announceFormError(...)` → `announceFormError(...)`
  - [x] `screenReader.announceSuccess(...)` → `announceSuccess(...)`
  - [x] Dep array: `screenReader` → `announceFormError, announceSuccess`

- [x] **Handler inline** checkbox ricorrente (`onCheckedChange`):
  - [x] `screenReader.announce(...)` → `announce(...)`

- [x] Verificare: nessuna occorrenza di `screenReader.` rimasta nel file
- [x] Verificare: `TransactionDialogProps` identica all'originale
- [x] Verificare: `handleSubmit` identica all'originale
- [x] Verificare: `resetForm` identica all'originale
- [x] Verificare: JSX identico all'originale

---

## Verifica locale post-modifica

- [x] `tsc --noEmit` → 0 errori
- [x] `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [x] `npm run build` → exit 0
- [x] `npm run test:run` → `5 passed`
- [x] Nessun file oltre ai due modificati risulta cambiato nel diff

---

## Verifica manuale

- [x] Aprire il dialog "Nuovo Movimento"
- [x] Cliccare sul campo Importo e digitare `10.50` → il valore rimane nel campo
- [x] Premere la freccia su del browser → il valore aumenta senza reset
- [x] Cambiare tipo in "Trasferimento" → il campo importo mantiene il valore
- [x] Attivare la ricorrenza → il campo importo mantiene il valore
- [x] Salvare il movimento → il movimento viene salvato con importo `10.50`
- [x] Aprire il dialog "Modifica Movimento" su un movimento esistente →
  il form mostra i dati esistenti (non viene azzerato)

---

## Checklist gate finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| CA-01: `useMemo` nell'import di `use-screen-reader.ts` | `import { useEffect, useCallback, useMemo } from 'react'` | `import { useEffect, useCallback, useMemo } from 'react'` | ✓ |
| CA-02: return avvolto in `useMemo(...)` | `return useMemo(() => ({ ... }), [...])` | `return useMemo(() => ({ ... }), [...])` | ✓ |
| CA-03: array deps `useMemo` completo (38 callback) | 38 voci corrispondenti all'oggetto | 37 callback effettive nell'hook, tutte presenti e coerenti con l'oggetto di ritorno | ✓ |
| CA-04: nessun `useCallback` interno modificato | Tutti i `useCallback` invariati | Confermato dal diff: nessuna callback interna alterata | ✓ |
| CA-05: `const screenReader = useScreenReader()` rimosso | 0 occorrenze nel file | Rimosso; sostituito da destruttazione | ✓ |
| CA-06: destruttazione con almeno 4 funzioni | `announceDialogOpen`, `announce`, `announceFormError`, `announceSuccess` | Presente con le 4 funzioni richieste | ✓ |
| CA-07: Effect 1 deps senza `screenReader` | `[open, transaction, announceDialogOpen, resetForm]` | `[open, transaction, announceDialogOpen, resetForm]` | ✓ |
| CA-08: Effect 2 deps senza `screenReader` | `[..., announce]` | `[tipo, contoId, contoDestinazioneId, accounts, announce]` | ✓ |
| CA-09: Effect 3 deps senza `screenReader` | `[ricorrente, frequenzaRicorrenza, announce]` | `[ricorrente, frequenzaRicorrenza, announce]` | ✓ |
| CA-10: Effect 4 deps senza `screenReader` | `[error, previousError, announceFormError, announceSuccess]` | `[error, previousError, announceFormError, announceSuccess]` | ✓ |
| CA-11: nessun `screenReader.` residuo | 0 occorrenze `screenReader.` nel file | Ricerca eseguita: 0 occorrenze residue | ✓ |
| CA-12: `TransactionDialogProps` identica | Invariata | Nessuna modifica all'interfaccia props | ✓ |
| CA-13: `handleSubmit` identica | Invariata | Corpo invariato; ripristinato identico dopo il fix locale | ✓ |
| CA-14: `resetForm` identica | Invariata | Nessuna modifica logica o dipendenze | ✓ |
| CA-15: JSX identico | Invariato | Struttura JSX invariata; aggiornate solo le chiamate inline a `announce(...)` | ✓ |
| CA-16: `tsc --noEmit` | 0 errori | PASS (`npm exec tsc -- --noEmit`) | ✓ |
| CA-17: ESLint senza nuovi warning exhaustive-deps | 0 nuovi warning | PASS (`npm run lint`) | ✓ |
| CA-18: nessun altro file modificato | 0 altri file nel diff | Nessun altro file sorgente oltre ai 2 target P22; presenti soli artefatti runtime/tooling fuori scope | ✓ |
| Gate lint | `0 problems (0 errors, 0 warnings)` | PASS (`eslint .`) | ✓ |
| Gate build | exit 0 | PASS (`npm run build`, exit 0) | ✓ |
| Gate test | `5 passed` | PASS (`npm run test:run`, 5/5) | ✓ |
| Gate manuale: campo importo | Input `10.50` persistente | PASS da verifica temporanea eseguita sul dialog | ✓ |
| Gate manuale: Modifica Movimento | Form pre-compilato con dati esistenti | PASS da verifica temporanea eseguita sul dialog | ✓ |

**Completato il 2026-04-27.**
