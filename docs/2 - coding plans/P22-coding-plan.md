# P22 — Coding Plan: Bugfix BUG-04 — loop infinito nel campo importo di TransactionDialog

> Documento operativo.  
> Fase: Plan → Code  
> Pacchetto: 22 — Nono passo post-refactoring  
> Design di riferimento: `docs/1 - projects/P22-transaction-dialog-bugfix-design.md`  
> Bug di riferimento: BUG-04 — `docs/4 - reports/report-diagnostico-bug-pre-merge.md`  
> Data: 2026-04-27

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P19, P20, P21.
- Questo passo è un **bugfix puro**: nessun refactoring, nessuna nuova feature.
- ⚠️ **Perimetro stretto:** solo due file sorgente vengono modificati: `src/hooks/use-screen-reader.ts` e `src/components/TransactionDialog.tsx`. Nessun altro file sorgente, di configurazione, di documentazione o framework SCF deve essere toccato.
- ⚠️ **Ordine obbligatorio delle modifiche:** prima `use-screen-reader.ts`, poi `TransactionDialog.tsx`. Questo permette di eseguire `tsc --noEmit` dopo il primo step e verificare l'assenza di regressioni prima di toccare il componente.
- ⚠️ **Le props di `TransactionDialogProps`**, la funzione `handleSubmit`, la funzione `resetForm` e tutto il JSX del componente rimangono identici all'originale. Non aggiungere, rimuovere o riposizionare elementi.
- ⚠️ Il file `src/lib/screen-reader.ts` (singleton) **non viene modificato**.
- ⚠️ I componenti `AuthContext`, `DashboardTab`, `TransactionsTab`, `CategoryManagement`, `SecuritySettings` e tutti gli altri consumer di `useScreenReader` non vengono toccati: beneficiano automaticamente della stabilizzazione introdotta nell'hook.

---

**File modificati:**

| Categoria | File | Tipo intervento |
|---|---|---|
| Hook | `src/hooks/use-screen-reader.ts` | Modifica (aggiunta `useMemo` all'import e al return) |
| Componente | `src/components/TransactionDialog.tsx` | Modifica (destruttazione hook + correzione 4 dep array) |

**File invariati:**

| File / Area | Motivazione |
|---|---|
| `src/lib/screen-reader.ts` | Singleton — la causa radice è nell'hook, non nella classe |
| `src/context/AuthContext.tsx` | Consumer di `useScreenReader` — beneficia automaticamente |
| `src/components/DashboardTab.tsx` | Consumer di `useScreenReader` — beneficia automaticamente |
| `src/components/TransactionsTab.tsx` | Consumer di `useScreenReader` — beneficia automaticamente |
| `src/components/CategoryManagement.tsx` | Consumer di `useScreenReader` — beneficia automaticamente |
| `src/components/SecuritySettings.tsx` | Consumer di `useScreenReader` — beneficia automaticamente |
| `src/components/AccountDialog.tsx` | Non coinvolto in BUG-04 |
| `src/components/BudgetDialog.tsx` | Non coinvolto in BUG-04 |
| `src/components/SavingsGoalDialog.tsx` | Non coinvolto in BUG-04 |
| `src/components/DialogsOverlay.tsx` | Non coinvolto in BUG-04 |
| `package.json` | Nessuna dipendenza aggiunta/rimossa |
| `vite.config.ts` | Invariato |
| `tsconfig.json` | Invariato |
| `vitest.config.ts` | Invariato |
| `eslint.config.js` | Invariato |
| `.github/instructions/` | Protetto da `framework-guard.instructions.md` |
| `.github/agents/` | Protetto da `framework-guard.instructions.md` |
| `.github/copilot-instructions.md` | Protetto da `framework-guard.instructions.md` |
| `.github/AGENTS.md` | Protetto da `framework-guard.instructions.md` |
| `.github/runtime/` | Protetto da `framework-guard.instructions.md` |
| `.github/skills/` | Protetto da `framework-guard.instructions.md` |
| `.github/prompts/` | Protetto da `framework-guard.instructions.md` |
| `.github/changelogs/` | Protetto da `framework-guard.instructions.md` |

---

## Schema riepilogativo delle operazioni

```
Passo 22 — Bugfix BUG-04: loop infinito campo importo TransactionDialog
│
├── Step 1: Modifica src/hooks/use-screen-reader.ts
│   │
│   ├── Aggiungere useMemo all'import React (riga 1)
│   │   Prima:  import { useEffect, useCallback } from 'react'
│   │   Dopo:   import { useEffect, useCallback, useMemo } from 'react'
│   │
│   ├── Avvolgere il return dell'hook in useMemo(() => ({ ... }), [deps])
│   │   Prima:  return { announce, announceNavigation, ... }
│   │   Dopo:   return useMemo(() => ({ announce, announceNavigation, ... }), [...deps])
│   │
│   └── Gate: tsc --noEmit → 0 errori
│
├── Step 2: Modifica src/components/TransactionDialog.tsx
│   │
│   ├── Cambiare dichiarazione da const screenReader = useScreenReader()
│   │   a destruttazione delle 4 funzioni necessarie:
│   │   const { announceDialogOpen, announce, announceFormError, announceSuccess } = useScreenReader()
│   │
│   ├── Effect 1 (apertura dialog, righe ~66–75):
│   │   - body: screenReader.announceDialogOpen(...) → announceDialogOpen(...)
│   │   - deps: [open, transaction, screenReader, resetForm] → [open, transaction, announceDialogOpen, resetForm]
│   │
│   ├── Effect 2 (trasferimento, righe ~78–92):
│   │   - body: screenReader.announce(...) → announce(...)
│   │   - deps: [..., screenReader] → [..., announce]
│   │
│   ├── Effect 3 (ricorrenza, righe ~93–100):
│   │   - body: screenReader.announce(...) → announce(...)
│   │   - deps: [ricorrente, frequenzaRicorrenza, screenReader] → [ricorrente, frequenzaRicorrenza, announce]
│   │
│   ├── Effect 4 (errori validazione, righe ~101–113):
│   │   - body: screenReader.announceFormError(...) → announceFormError(...)
│   │           screenReader.announceSuccess(...) → announceSuccess(...)
│   │   - deps: [error, previousError, screenReader] → [error, previousError, announceFormError, announceSuccess]
│   │
│   ├── Handler inline checkbox ricorrente:
│   │   - screenReader.announce(...) → announce(...) (necessario per TS dopo rimozione const screenReader)
│   │
│   └── Gate: tsc --noEmit → 0 errori, npm run lint → 0 warning
│
├── Step 3: Test locali
│   ├── npm run lint → 0 problems
│   ├── npm run build → exit 0
│   └── npm run test:run → 5 passed
│
└── Step 4: Verifica manuale (7 passi — sezione 9.4 del design)
    ├── Aprire dialog Nuovo Movimento
    ├── Digitare 10.50 nel campo Importo → valore rimane nel campo
    ├── Premere freccia su del browser → valore aumenta senza reset
    ├── Cambiare tipo in Trasferimento → campo importo mantiene il valore
    ├── Attivare la ricorrenza → campo importo mantiene il valore
    ├── Salvare il movimento → salvato con importo 10.50
    └── Aprire dialog Modifica Movimento → form mostra dati esistenti (non azzerato)
```

---

## Ambiguità verificate

Le seguenti ambiguità sono state **verificate sul repository reale** sul branch `refactoring-architettura` con lettura diretta dei file sorgente prima della stesura di questo piano.

---

### AI1 — Causa radice del loop

**Verifica eseguita:** lettura completa di `src/hooks/use-screen-reader.ts` e `src/components/TransactionDialog.tsx`

**Risultato:** `useScreenReader()` termina con un `return {}` di oggetto letterale senza `useMemo`. Le singole funzioni interne sono tutte stabili (`useCallback(fn, [])`), ma il contenitore oggetto ottiene un nuovo riferimento ad ogni render del componente chiamante. In `TransactionDialog.tsx` l'oggetto `screenReader` è incluso nei dep array di Effect 1 (riga 75), Effect 2 (riga 92), Effect 3 (riga 100), Effect 4 (riga 113). Al render causato da qualsiasi keystroke nell'input, React vede `screenReader` come "cambiato" e riesegue Effect 1, che chiama `resetForm()` → `setImporto('')` → re-render → loop.

---

### AI2 — Soluzione scelta: Alternativa C (A + B)

**Verifica eseguita:** analisi delle tre alternative nel design (Sezione 3)

**Risultato:** la soluzione adottata è **Alternativa C** (belt-and-suspenders):
- **A** — Modifica solo `TransactionDialog.tsx`: destructure funzioni individuali, aggiorna dep array
- **B** — Modifica solo `use-screen-reader.ts`: avvolge return con `useMemo`
- **C** (scelta) — Entrambe: risolve la causa radice nell'hook E rende il consumer idiomaticamente corretto

La sola Alternativa B risolve il bug, ma lascia dep array con `screenReader` (oggetto) che potrebbe re-introdurre il problema se il `useMemo` venisse rimosso in un futuro refactoring. La combinazione C è più robusta con costo minimo aggiuntivo.

---

### AI3 — Lista completa delle 4 funzioni da destruttare

**Verifica eseguita:** lettura dei 4 `useEffect` e degli handler inline in `TransactionDialog.tsx`

**Risultato:** le funzioni `useScreenReader` usate in `TransactionDialog.tsx` sono esattamente:

| Funzione | Usata in |
|---|---|
| `announceDialogOpen` | Effect 1 (body + deps) |
| `announce` | Effect 2 (body + deps), Effect 3 (body + deps), handler inline checkbox |
| `announceFormError` | Effect 4 (body + deps) |
| `announceSuccess` | Effect 4 (body + deps) |

Total: 4 funzioni distinte nella destruttazione.

---

### AI4 — Effetti secondari corretti dagli stessi dep array

**Verifica eseguita:** analisi degli Effect 2, 3, 4

**Risultato:** oltre al bug manifesto (Effect 1 → loop + reset), gli Effect 2, 3 e 4 hanno lo stesso problema strutturale (`screenReader` nelle deps): producono **annunci SR duplicati** ad ogni render invece che solo al cambiamento reale delle condizioni. Non causano loop visibili perché non chiamano `setState`, ma degradano l'esperienza per utenti AT. La correzione degli array di dipendenze in tutti e quattro gli effect risolve sia il bug manifesto sia questi effetti secondari in un unico passo.

---

### AI5 — Handler inline del checkbox ricorrente

**Verifica eseguita:** lettura del JSX del componente, sezione checkbox `id="transaction-recurring"`

**Risultato:** il callback `onCheckedChange` del checkbox contiene `screenReader.announce(...)`. Questa chiamata non è in un dep array e non produce loop. Tuttavia, dopo la rimozione di `const screenReader = useScreenReader()`, TypeScript segnalerebbe `screenReader` come variabile non definita. La chiamata va aggiornata a `announce(...)` per garantire la compilazione senza errori. Questa è una modifica necessaria per TS, non per correggere il bug.

---

### AI6 — `src/lib/screen-reader.ts` non va toccato

**Verifica eseguita:** lettura di `src/lib/screen-reader.ts`

**Risultato:** il file implementa la classe singleton `ScreenReaderAnnouncer` con le sue live region nel DOM. Non è un hook React; non ha problemi di riferimento. Il bug è interamente contenuto nel layer hook (`use-screen-reader.ts`) e nel consumer (`TransactionDialog.tsx`). Il singleton continua a funzionare esattamente come prima dopo il Passo 22.

---

## Piano operativo dettagliato

### Step 1 — Modifica `src/hooks/use-screen-reader.ts`

**File coinvolto:** `src/hooks/use-screen-reader.ts`  
**Righe interessate:** riga 1 (import), ultime righe del file (il `return`)

#### Modifica 1.1 — Import

**Prima (riga 1):**
```ts
import { useEffect, useCallback } from 'react'
```

**Dopo:**
```ts
import { useEffect, useCallback, useMemo } from 'react'
```

**Motivazione:** `useMemo` è necessario per avvolgere il valore di ritorno. Aggiungere all'import esistente senza creare un nuovo blocco di import.

#### Modifica 1.2 — Valore di ritorno

**Prima (attuale — codice buggy):**
```ts
return {
  announce,
  announceNavigation,
  announceAction,
  announceError,
  announceSuccess,
  announceCount,
  announceBalance,
  announceTransaction,
  announceDialogOpen,
  announceDialogClose,
  announceProgress,
  announceBudgetStatus,
  announceFocus,
  announceListNavigation,
  announceFilter,
  announceSort,
  announceAccountCreated,
  announceAccountDeleted,
  announceBudgetCreated,
  announceBudgetDeleted,
  announceSavingsGoalCreated,
  announceSavingsGoalProgress,
  announceSavingsGoalDeleted,
  announceVolumeChange,
  announcePresetApplied,
  announceTemplateSelected,
  announceFormError,
  announceFormFieldFilled,
  announceToggleState,
  announceCardAction,
  announceExport,
  announcePeriodChange,
  announceHelpOpened,
  announceHelpClosed,
  announcePrivateAccountLocked,
  announceDataCleared,
  announceImportComplete
}
```

**Dopo (corretto):**
```ts
return useMemo(() => ({
  announce,
  announceNavigation,
  announceAction,
  announceError,
  announceSuccess,
  announceCount,
  announceBalance,
  announceTransaction,
  announceDialogOpen,
  announceDialogClose,
  announceProgress,
  announceBudgetStatus,
  announceFocus,
  announceListNavigation,
  announceFilter,
  announceSort,
  announceAccountCreated,
  announceAccountDeleted,
  announceBudgetCreated,
  announceBudgetDeleted,
  announceSavingsGoalCreated,
  announceSavingsGoalProgress,
  announceSavingsGoalDeleted,
  announceVolumeChange,
  announcePresetApplied,
  announceTemplateSelected,
  announceFormError,
  announceFormFieldFilled,
  announceToggleState,
  announceCardAction,
  announceExport,
  announcePeriodChange,
  announceHelpOpened,
  announceHelpClosed,
  announcePrivateAccountLocked,
  announceDataCleared,
  announceImportComplete
// eslint-disable-next-line react-hooks/exhaustive-deps
}), [
  announce, announceNavigation, announceAction, announceError, announceSuccess,
  announceCount, announceBalance, announceTransaction, announceDialogOpen,
  announceDialogClose, announceProgress, announceBudgetStatus, announceFocus,
  announceListNavigation, announceFilter, announceSort, announceAccountCreated,
  announceAccountDeleted, announceBudgetCreated, announceBudgetDeleted,
  announceSavingsGoalCreated, announceSavingsGoalProgress, announceSavingsGoalDeleted,
  announceVolumeChange, announcePresetApplied, announceTemplateSelected,
  announceFormError, announceFormFieldFilled, announceToggleState,
  announceCardAction, announceExport, announcePeriodChange, announceHelpOpened,
  announceHelpClosed, announcePrivateAccountLocked, announceDataCleared,
  announceImportComplete
])
```

**Motivazione tecnica:** ogni singola funzione in deps è un `useCallback(fn, [])` — non cambia mai dopo il mount. Le deps del `useMemo` sono quindi tutte stabili; il memo calcola il suo valore una volta sola al mount e non si ricalcola mai, restituendo sempre lo stesso riferimento oggetto. Il commento `eslint-disable-next-line` è preventivo: alcuni linter con regole aggressive potrebbero segnalare l'array lungo, ma la configurazione attuale di P20 non lo fa — il commento può essere omesso se il gate lint passa senza.

**Gate intermedio:** dopo questa modifica, eseguire `tsc --noEmit` e verificare 0 errori prima di procedere allo Step 2.

---

### Step 2 — Modifica `src/components/TransactionDialog.tsx`

**File coinvolto:** `src/components/TransactionDialog.tsx`  
**Righe interessate:** riga ~35 (dichiarazione hook), righe ~66–113 (quattro `useEffect`), handler inline checkbox

#### Modifica 2.1 — Dichiarazione dell'hook

**Prima (riga ~35):**
```tsx
const screenReader = useScreenReader()
```

**Dopo:**
```tsx
const {
  announceDialogOpen,
  announce,
  announceFormError,
  announceSuccess,
} = useScreenReader()
```

**Motivazione:** destruttare le funzioni individuali al posto dell'oggetto rende gli array di dipendenze degli `useEffect` espliciti e corretti. Le singole funzioni sono `useCallback([], [])` — stabili per definizione — mentre l'oggetto contenitore non lo era.

#### Modifica 2.2 — Effect 1 (apertura dialog e reset form — il bug manifesto)

**Prima (righe 66–75 — codice buggy):**
```tsx
useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    const dialogTitle = transaction ? 'Modifica Movimento' : 'Nuovo Movimento'
    screenReader.announceDialogOpen(dialogTitle)
    if (!transaction) {
      resetForm()
      const timer = setTimeout(() => amountInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }
}, [open, transaction, screenReader, resetForm])
```

**Dopo:**
```tsx
useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    const dialogTitle = transaction ? 'Modifica Movimento' : 'Nuovo Movimento'
    announceDialogOpen(dialogTitle)
    if (!transaction) {
      resetForm()
      const timer = setTimeout(() => amountInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }
}, [open, transaction, announceDialogOpen, resetForm])
```

**Motivazione:** `screenReader` (oggetto instabile, nuovo riferimento ad ogni render) viene sostituito da `announceDialogOpen` (funzione stabile, `useCallback([], [])`). L'effect viene rieseguito solo quando `open` o `transaction` cambiano realmente — ossia all'apertura e alla chiusura del dialog, non ad ogni keystroke.

#### Modifica 2.3 — Effect 2 (annuncio trasferimento)

**Prima (righe 78–92):**
```tsx
useEffect(() => {
  if (tipo !== 'trasferimento') {
    setContoDestinazioneId('')
  } else if (tipo === 'trasferimento' && contoId && contoDestinazioneId) {
    const contoOrigine = accounts.find(a => a.id === contoId)
    const contoDestinazione = accounts.find(a => a.id === contoDestinazioneId)
    if (contoOrigine && contoDestinazione) {
      screenReader.announce(
        `Trasferimento da ${contoOrigine.nome} a ${contoDestinazione.nome}`,
        'polite'
      )
    }
  }
}, [tipo, contoId, contoDestinazioneId, accounts, screenReader])
```

**Dopo:**
```tsx
useEffect(() => {
  if (tipo !== 'trasferimento') {
    setContoDestinazioneId('')
  } else if (tipo === 'trasferimento' && contoId && contoDestinazioneId) {
    const contoOrigine = accounts.find(a => a.id === contoId)
    const contoDestinazione = accounts.find(a => a.id === contoDestinazioneId)
    if (contoOrigine && contoDestinazione) {
      announce(
        `Trasferimento da ${contoOrigine.nome} a ${contoDestinazione.nome}`,
        'polite'
      )
    }
  }
}, [tipo, contoId, contoDestinazioneId, accounts, announce])
```

#### Modifica 2.4 — Effect 3 (annuncio ricorrenza)

**Prima (righe 93–100):**
```tsx
useEffect(() => {
  if (ricorrente && frequenzaRicorrenza) {
    const frequenzaLabel = RECURRENCE_LABELS[frequenzaRicorrenza as RecurrenceFrequency]
    screenReader.announce(`Movimento ricorrente: ${frequenzaLabel}`, 'polite')
  }
}, [ricorrente, frequenzaRicorrenza, screenReader])
```

**Dopo:**
```tsx
useEffect(() => {
  if (ricorrente && frequenzaRicorrenza) {
    const frequenzaLabel = RECURRENCE_LABELS[frequenzaRicorrenza as RecurrenceFrequency]
    announce(`Movimento ricorrente: ${frequenzaLabel}`, 'polite')
  }
}, [ricorrente, frequenzaRicorrenza, announce])
```

#### Modifica 2.5 — Effect 4 (annuncio errori di validazione)

**Prima (righe 101–113):**
```tsx
useEffect(() => {
  if (error && error !== previousError) {
    const fieldMatch = error.match(/^(.*?)(è obbligatori[ao]|deve essere|seleziona)/i)
    const fieldName = fieldMatch ? fieldMatch[1].trim() : 'Campo'
    screenReader.announceFormError(fieldName, error)
    setPreviousError(error)
  } else if (!error && previousError) {
    screenReader.announceSuccess('Errore corretto')
    setPreviousError('')
  }
}, [error, previousError, screenReader])
```

**Dopo:**
```tsx
useEffect(() => {
  if (error && error !== previousError) {
    const fieldMatch = error.match(/^(.*?)(è obbligatori[ao]|deve essere|seleziona)/i)
    const fieldName = fieldMatch ? fieldMatch[1].trim() : 'Campo'
    announceFormError(fieldName, error)
    setPreviousError(error)
  } else if (!error && previousError) {
    announceSuccess('Errore corretto')
    setPreviousError('')
  }
}, [error, previousError, announceFormError, announceSuccess])
```

#### Modifica 2.6 — Handler inline checkbox ricorrente

Nel JSX, il callback `onCheckedChange` del `<Checkbox id="transaction-recurring">` contiene una chiamata `screenReader.announce(...)`. Dopo la rimozione di `const screenReader`, TypeScript segnalerebbe un errore. Aggiornare a `announce(...)`.

**Prima:**
```tsx
onCheckedChange={(checked) => {
  setRicorrente(checked as boolean)
  if (checked) {
    screenReader.announce('Ricorrenza attivata', 'polite')
  }
}}
```

**Dopo:**
```tsx
onCheckedChange={(checked) => {
  setRicorrente(checked as boolean)
  if (checked) {
    announce('Ricorrenza attivata', 'polite')
  }
}}
```

**Nota:** questa modifica non è necessaria per correggere il bug (l'handler non è in un dep array), ma è necessaria per compilare senza errori TypeScript dopo la rimozione di `const screenReader`.

**Gate finale:** eseguire `tsc --noEmit` → 0 errori, poi `npm run lint` → 0 warning.

---

## Tabella dei rischi

| Codice | Scenario | Probabilità | Impatto | Mitigazione |
|---|---|---|---|---|
| R1 | Array deps `useMemo` incompleto: una callback omessa → il `useMemo` si comporta come se non ci fosse, oggetto instabile residuo | Bassa (l'array è copiato dall'elenco dell'oggetto di ritorno) | Alto (bug non completamente risolto lato hook) | Verificare CA-03: contare le voci dell'array deps del `useMemo` e confrontarle con le proprietà dell'oggetto di ritorno — devono coincidere (38 totali) |
| R2 | Warning ESLint `react-hooks/exhaustive-deps` sul `useMemo` con array lungo | Molto bassa (la configurazione P20 non produce questo warning) | Basso | Aggiungere `// eslint-disable-next-line react-hooks/exhaustive-deps` sopra l'array deps se compare; già indicato nel design (Sezione 9.2) |
| R3 | Occorrenza `screenReader.*` residua nel JSX o negli handler inline dopo la rimozione di `const screenReader` → errore TypeScript in compilazione | Bassa (il gate `tsc --noEmit` la rileva immediatamente) | Alto (build rotto) | Eseguire `tsc --noEmit` dopo Step 2; cercare `screenReader` nel file — deve risultare 0 occorrenze |
| R4 | Regressione in modalità Modifica Movimento: `resetForm()` chiamato all'apertura quando `transaction` è definito | Molto bassa (la condizione `!transaction` non viene modificata) | Alto (form azzerato al posto dei dati esistenti) | Verificare punto 7 della verifica manuale: aprire dialog su un movimento esistente e confermare che i dati pre-compilati siano presenti |

---

## Criteri di uscita — Definition of Done

- [ ] **CA-01** — `use-screen-reader.ts` importa `useMemo` da `react`
- [ ] **CA-02** — Il `return` di `useScreenReader` è avvolto in `useMemo(...)`
- [ ] **CA-03** — L'array deps del `useMemo` include tutte le 38 callback dichiarate nell'hook (nessuna omessa rispetto all'oggetto di ritorno originale)
- [ ] **CA-04** — Nessun `useCallback` all'interno di `useScreenReader` è stato modificato
- [ ] **CA-05** — `TransactionDialog.tsx` non contiene più `const screenReader = useScreenReader()`
- [ ] **CA-06** — La destruttazione include almeno: `announceDialogOpen`, `announce`, `announceFormError`, `announceSuccess`
- [ ] **CA-07** — L'array di dipendenze di Effect 1 (apertura dialog) non contiene `screenReader`
- [ ] **CA-08** — L'array di dipendenze di Effect 2 (trasferimento) non contiene `screenReader`
- [ ] **CA-09** — L'array di dipendenze di Effect 3 (ricorrenza) non contiene `screenReader`
- [ ] **CA-10** — L'array di dipendenze di Effect 4 (errori) non contiene `screenReader`
- [ ] **CA-11** — Nessuna chiamata `screenReader.announce*` è rimasta nel file (né nei dep array, né nei body degli effect, né negli handler inline)
- [ ] **CA-12** — L'interfaccia di `TransactionDialogProps` è identica all'originale
- [ ] **CA-13** — La funzione `handleSubmit` è identica all'originale (nessuna riga modificata)
- [ ] **CA-14** — La funzione `resetForm` è identica all'originale
- [ ] **CA-15** — Il JSX ritornato dal componente è identico all'originale
- [ ] **CA-16** — TypeScript non riporta errori di tipo nei due file modificati (`tsc --noEmit`)
- [ ] **CA-17** — Il linter ESLint non riporta nuovi warning `react-hooks/exhaustive-deps` nei due file modificati
- [ ] **CA-18** — Nessun altro file nel repository è stato modificato
- [ ] **Gate lint** — `npm run lint` → `0 problems (0 errors, 0 warnings)` (invariato rispetto a P20)
- [ ] **Gate build** — `npm run build` → exit 0
- [ ] **Gate test** — `npm run test:run` → `5 passed`
- [ ] **Gate manuale** — campo importo accetta input `10.50` senza reset; dialog Modifica Movimento mostra dati esistenti
