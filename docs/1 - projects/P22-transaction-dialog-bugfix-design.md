# P22 — Bugfix BUG-04: loop infinito nel campo importo di `TransactionDialog`

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 22 (corrispondente al Passo 22 del piano di refactoring)  
> Bug di riferimento: BUG-04 — report `docs/4 - reports/report-diagnostico-bug-pre-merge.md`  
> Data: 27 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Intestazione

| Campo | Valore |
|---|---|
| **Bug ID** | BUG-04 |
| **Severità** | Bloccante |
| **Segnalato in** | `docs/4 - reports/report-diagnostico-bug-pre-merge.md` — Sezione 1 |
| **File principali coinvolti** | `src/components/TransactionDialog.tsx`, `src/hooks/use-screen-reader.ts` |
| **File di libreria correlato** | `src/lib/screen-reader.ts` (singleton, non modificato) |
| **Branch** | `refactoring-architettura` |
| **Data** | 27 aprile 2026 |
| **Tipo di intervento** | Bugfix — nessun refactoring, nessuna nuova feature |

---

## 2. Analisi della causa radice

### 2.1 Il problema in sintesi

Il campo "Importo" nel dialog "Nuovo Movimento" non accetta alcun input: ogni carattere digitato viene immediatamente cancellato. Le frecce browser di incremento/decremento per `<input type="number">` producono lo stesso effetto. La causa è un **loop di re-render continuo** originato da un'identità di oggetto instabile nel ritorno di `useScreenReader`.

### 2.2 Catena degli eventi

#### Passaggio 1 — `useScreenReader` restituisce un oggetto nuovo ad ogni render

In `src/hooks/use-screen-reader.ts`, l'hook termina con un `return` di un oggetto letterale:

```ts
// use-screen-reader.ts — fine dell'hook (attuale)
return {
  announce,
  announceNavigation,
  announceDialogOpen,
  // ... altri ~25 metodi
}
```

Le singole funzioni (`announce`, `announceDialogOpen`, ecc.) sono **stabili**: ognuna è avvolta in `useCallback(fn, [])` con array di dipendenze vuoto, quindi non cambia mai dopo il mount. Tuttavia, l'**oggetto letterale `{}`** che le contiene viene ricreato da zero ad ogni render del componente chiamante, producendo un nuovo riferimento ad ogni ciclo.

Non esiste nessun `useMemo` che stabilizzi l'identità dell'oggetto restituito.

#### Passaggio 2 — `screenReader` è incluso nelle dipendenze di un `useEffect` critico

In `src/components/TransactionDialog.tsx`, righe 66–75:

```tsx
// TransactionDialog.tsx — righe 66–75 (attuale — CODICE BUGGY)
useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    const dialogTitle = transaction ? 'Modifica Movimento' : 'Nuovo Movimento'
    screenReader.announceDialogOpen(dialogTitle)
    if (!transaction) {
      resetForm()                                               // ← azzera tutti i campi
      const timer = setTimeout(() => amountInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }
}, [open, transaction, screenReader, resetForm])
//                     ^^^^^^^^^^^
//                     nuovo oggetto ad ogni render → effect si riesegue ad ogni render
```

L'array di dipendenze include `screenReader`. Poiché `screenReader` è un nuovo oggetto ad ogni render, React interpreta la dipendenza come "cambiata" ad ogni ciclo e mette in coda l'esecuzione dell'effect.

#### Passaggio 3 — `resetForm` è instabile per propagazione

`resetForm` è definito con `useCallback([accounts, categories])`. Se `accounts` o `categories` cambiano referenza (ad es. perché il componente padre ri-renderizza), `resetForm` ottiene un nuovo riferimento. Questo è un fattore aggravante ma non la causa primaria: anche con `accounts` e `categories` statici, il loop si manifesta ugualmente perché `screenReader` cambia ad ogni render.

#### Passaggio 4 — Il loop

Quando l'utente digita nel campo importo:

1. `setImporto(value)` → re-render del componente
2. Re-render → `useScreenReader()` → nuovo oggetto `screenReader` (ref diversa)
3. React confronta le deps: `screenReader` è cambiato → effect in coda
4. Effect gira: condizione `open === true && !transaction` → chiama `resetForm()`
5. `resetForm()` → `setImporto('')` → re-render
6. Goto 1

Il campo appare sempre vuoto perché ogni keystroke viene immediatamente sovrascritto da `setImporto('')`.

### 2.3 Effetti secondari dello stesso difetto

Lo stesso pattern `screenReader` in array di dipendenze è presente in altri tre `useEffect` del componente:

| Effect | Riga | Funzione SR utilizzata | Conseguenza |
|---|---|---|---|
| Effect 1 (principale) | 66–75 | `announceDialogOpen` | **Loop + reset form** (il bug manifesto) |
| Effect 2 (transfer) | 78–92 | `announce` | Re-run inatteso ad ogni render quando il tipo è "trasferimento" |
| Effect 3 (ricorrenza) | 93–100 | `announce` | Re-run inatteso ad ogni render quando `ricorrente === true` |
| Effect 4 (errori) | 101–113 | `announceFormError`, `announceSuccess` | Re-run inatteso ad ogni render con errori attivi |

Solo Effect 1 produce il loop visibile perché `resetForm()` modifica lo stato e innesca un nuovo render. Gli altri tre producono annunci screen reader duplicati (l'annuncio viene inviato più volte alla live region), degradando l'esperienza per gli utenti AT senza però causare un crash visibile.

---

## 3. Decisione progettuale

### 3.1 Alternativa A — Rimuovere `screenReader` dai dep array in `TransactionDialog`

**Descrizione:** Modificare solo `TransactionDialog.tsx`. Destruttare dall'hook le singole funzioni necessarie a ciascun effect (es. `announceDialogOpen`, `announce`, `announceFormError`, `announceSuccess`) e passare quelle — anziché l'oggetto intero — come dipendenze.

```tsx
// Variante A — solo TransactionDialog.tsx
const { announceDialogOpen, announce, announceFormError, announceSuccess } = useScreenReader()

useEffect(() => {
  if (open) {
    soundSystem.play('dialog-open')
    announceDialogOpen(transaction ? 'Modifica Movimento' : 'Nuovo Movimento')
    if (!transaction) {
      resetForm()
      const timer = setTimeout(() => amountInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }
}, [open, transaction, announceDialogOpen, resetForm])
```

**Pro:**
- Tocca un solo file
- Cambiamento minimo e molto localizzato
- Le singole callback sono già stabili (`useCallback([], [])`), quindi le deps sono effettivamente stabili

**Contro:**
- Non risolve la causa radice: l'oggetto restituito da `useScreenReader` rimane instabile e potrebbe causare lo stesso problema in qualsiasi altro consumer futuro (o già esistente) che usi l'oggetto intero nelle deps
- Richiede attenzione a ogni future aggiunta di funzioni SR negli useEffect del componente

---

### 3.2 Alternativa B — Stabilizzare il valore di ritorno di `useScreenReader` con `useMemo`

**Descrizione:** Modificare `use-screen-reader.ts` per avvolgere il `return` con `useMemo`. Poiché tutte le funzioni interne sono già stabili (deps `[]`), il memo non viene mai ricalcolato dopo il mount: l'oggetto restituito ha una referenza stabile per tutta la vita del componente host.

```ts
// Variante B — solo use-screen-reader.ts
import { useEffect, useCallback, useMemo } from 'react'

// ... tutti i useCallback invariati ...

return useMemo(() => ({
  announce,
  announceNavigation,
  // ... tutti i metodi
}), [
  announce, announceNavigation, /* ... tutti i callback */
])
```

**Pro:**
- Risolve la causa radice nell'hook, non nel consumer
- Beneficia automaticamente **tutti** i componenti che usano `useScreenReader` (AuthContext, DashboardTab, TransactionsTab, CategoryManagement, SecuritySettings, ecc.)
- Non richiede modifiche a `TransactionDialog.tsx`
- Semanticamente corretto: le funzioni non cambiano mai, quindi l'oggetto non deve cambiare mai

**Contro:**
- L'array di dipendenze del `useMemo` è lungo (~25 callback): più verboso
- Tocca un file usato trasversalmente — rischio di regressione se qualche consumer dipende (erroneamente) dalla ricreazione dell'oggetto

---

### 3.3 Alternativa C — Combinazione A + B *(soluzione scelta)*

**Descrizione:** Applicare entrambe le modifiche:
1. In `use-screen-reader.ts` → `useMemo` sul `return` (risolve la causa radice)
2. In `TransactionDialog.tsx` → destruttare le singole funzioni e aggiornarle negli array di dipendenze (rende gli array espliciti, corretti e leggibili)

**Perché questa è la scelta corretta:**

La sola Alternativa B risolve il bug, ma lascia `TransactionDialog` con dep array che contengono `screenReader` (oggetto). Un futuro refactoring di `useScreenReader` che rimuovesse accidentalmente il `useMemo` rigenererebbe il bug. La sola Alternativa A risolve il bug nel componente ma non nell'hook, lasciando la trappola aperta per altri consumer.

La combinazione C è **belt-and-suspenders**: la causa radice è corretta nell'hook (B), e il consumer è scritto nel modo idiomaticamente corretto per React (A). Il risultato è un sistema più robusto e più facile da mantenere. Il costo è minimo: due file con modifiche chirurgiche.

**Questa è la soluzione adottata per il Passo 22.**

---

## 4. Modifiche a `use-screen-reader.ts`

### 4.1 Importazione

Aggiungere `useMemo` all'import di React:

**Prima (riga 1):**
```ts
import { useEffect, useCallback } from 'react'
```

**Dopo:**
```ts
import { useEffect, useCallback, useMemo } from 'react'
```

### 4.2 Corpo dell'hook — nessuna modifica

Tutte le dichiarazioni `useCallback` rimangono identiche. Nessuna funzione viene aggiunta, rimossa o modificata.

### 4.3 Valore di ritorno

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

**Perché questo stabilizza il riferimento:** ogni singola funzione in deps è un `useCallback(fn, [])` — non cambia mai dopo il mount. Le deps del `useMemo` sono quindi tutte stabili, il memo calcola il suo valore una volta sola al mount e non si ricalcola mai, restituendo sempre lo stesso oggetto.

### 4.4 Riepilogo modifiche a `use-screen-reader.ts`

| Tipo | Righe coinvolte | Descrizione |
|---|---|---|
| Modifica import | Riga 1 | Aggiungere `useMemo` all'import |
| Modifica return | Ultima sezione dell'hook | Avvolgere l'oggetto di ritorno in `useMemo(...)` |
| Nessuna altra modifica | — | Tutti i `useCallback` rimangono invariati |

---

## 5. Modifiche a `TransactionDialog.tsx`

### 5.1 Destruttazione delle funzioni necessarie

**Prima (riga 35):**
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

Le quattro funzioni coprono tutti gli usi di `screenReader` nei `useEffect` del componente. I metodi usati nei callback inline (es. negli handler del checkbox `ricorrente`) non sono in dep array, quindi non richiedono questo trattamento — ma usarli destruttati è comunque più esplicito.

### 5.2 Effect 1 — Apertura dialog e reset form (il bug manifesto)

**Prima (righe 66–75 — CODICE BUGGY):**
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

**Cosa cambia:** `screenReader` (oggetto instabile) → `announceDialogOpen` (funzione stabile). `announceDialogOpen` è un `useCallback([], [])` in `useScreenReader`, quindi la sua referenza non cambia mai dopo il mount.

**Effetto della correzione:** L'effect gira solo quando `open` o `transaction` cambiano realmente — ossia all'apertura e alla chiusura del dialog. Non si riesegue su ogni re-render causato dall'input utente.

### 5.3 Effect 2 — Annuncio trasferimento (effetto secondario)

**Prima (righe 78–92 — sottile regressione SR):**
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

**Cosa cambia:** `screenReader.announce(...)` → `announce(...)` nelle deps.

### 5.4 Effect 3 — Annuncio ricorrenza (effetto secondario)

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

### 5.5 Effect 4 — Annuncio errori di validazione (effetto secondario)

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

### 5.6 Chiamate inline — nessuna modifica nei dep array

Le chiamate a `screenReader.*` presenti all'interno di handler inline (non in `useEffect`) non necessitano di modifica strutturale, ma per coerenza con la destruttazione saranno aggiornate a usare le funzioni individuali:

| Posizione | Chiamata attuale | Dopo |
|---|---|---|
| Checkbox `ricorrente` — `onCheckedChange` | `screenReader.announce(...)` | `announce(...)` |

Queste chiamate non producono loop (non sono in dep array) ma devono essere allineate alla nuova dichiarazione `const { ... } = useScreenReader()` per evitare l'errore TypeScript "Property 'announce' does not exist on type 'void'" dopo la rimozione di `const screenReader`.

### 5.7 Riepilogo modifiche a `TransactionDialog.tsx`

| Tipo | Riga/i | Descrizione |
|---|---|---|
| Modifica dichiarazione | Riga 35 | `const screenReader = useScreenReader()` → destruttazione funzioni individuali |
| Modifica deps Effect 1 | Riga 75 | `screenReader` → `announceDialogOpen` |
| Modifica body Effect 1 | Riga 71 | `screenReader.announceDialogOpen(...)` → `announceDialogOpen(...)` |
| Modifica deps Effect 2 | Riga 92 | `screenReader` → `announce` |
| Modifica body Effect 2 | Riga 85 | `screenReader.announce(...)` → `announce(...)` |
| Modifica deps Effect 3 | Riga 100 | `screenReader` → `announce` |
| Modifica body Effect 3 | Riga 97 | `screenReader.announce(...)` → `announce(...)` |
| Modifica deps Effect 4 | Riga 113 | `screenReader` → `announceFormError, announceSuccess` |
| Modifica body Effect 4 | Righe 107, 110 | `screenReader.announceFormError(...)` → `announceFormError(...)`, `screenReader.announceSuccess(...)` → `announceSuccess(...)` |
| Modifica handler inline | Checkbox ricorrente | `screenReader.announce(...)` → `announce(...)` |
| **Nessuna altra modifica** | — | Props, validazione, handleSubmit, JSX: invariati |

---

## 6. Comportamento atteso dopo la correzione

1. **Campo importo funzionante:** l'utente può digitare liberamente nel campo importo (es. `10.50`). Il valore rimane nel campo senza essere azzerato tra un carattere e il successivo.
2. **Frecce browser funzionanti:** le frecce di incremento/decremento del browser su `<input type="number">` modificano correttamente il valore senza reset.
3. **Reset form all'apertura:** all'apertura del dialog (Nuovo Movimento), il form viene azzerato una sola volta, non ad ogni keystroke.
4. **Focus su importo all'apertura:** il focus viene spostato sul campo importo entro 100ms dall'apertura, come prima.
5. **Annunci SR corretti:** l'annuncio "Nuovo Movimento" o "Modifica Movimento" viene inviato allo screen reader una sola volta all'apertura del dialog.
6. **Annuncio trasferimento corretto:** quando l'utente seleziona tipo "Trasferimento" e sceglie entrambi i conti, l'annuncio `Trasferimento da X a Y` viene emesso una volta sola, non in loop.
7. **Annuncio ricorrenza corretto:** quando l'utente attiva la ricorrenza e seleziona la frequenza, l'annuncio viene emesso una volta sola.
8. **Annunci errore corretti:** gli errori di validazione vengono annunciati una sola volta al primo manifestarsi, non ad ogni re-render.
9. **Salvataggio movimento invariato:** tutti i percorsi di validazione e salvataggio (`handleSubmit`, `handleClose`, `onSave`) rimangono identici nel comportamento.

---

## 7. Comportamento invariato

Questa sezione elenca esplicitamente tutto ciò che **non deve cambiare** dopo il Passo 22:

| Aspetto | Note |
|---|---|
| **Props del componente** | `open`, `onClose`, `onSave`, `transaction`, `accounts`, `categories` — nessuna modifica |
| **Interfaccia pubblica di `useScreenReader`** | L'oggetto ritornato contiene le stesse proprietà di prima; i consumer esistenti non richiedono modifiche |
| **Logica di validazione** | `handleSubmit` non viene toccato |
| **Logica `resetForm`** | La funzione rimane identica; viene chiamata nelle stesse condizioni (apertura dialog nuovo, chiusura dialog) |
| **Struttura JSX** | Nessun elemento UI viene aggiunto, rimosso o riposizionato |
| **Funzionamento in modalità modifica** | Il dialog in modalità "Modifica Movimento" (`transaction !== undefined`) non chiamava `resetForm()` prima; non lo chiama nemmeno dopo |
| **Supporto screen reader** | Tutti gli annunci previsti continuano ad essere emessi; vengono emessi esattamente una volta per evento (miglioramento) |
| **Campi decimal con punto o virgola** | Il campo `<Input type="number">` con `step="0.01"` gestisce i separatori decimali a livello browser; la correzione non altera questo comportamento |
| **Funzionamento degli altri dialog** | `AccountDialog`, `BudgetDialog`, `SavingsGoalDialog`, `PinDialog` non vengono toccati |
| **`src/lib/screen-reader.ts`** | Il singleton `ScreenReaderAnnouncer` non viene modificato |

---

## 8. Criteri di accettazione

L'agente di implementazione verifica il proprio lavoro confrontando questo checklist al termine del Passo 22:

| # | Criterio | Verifica |
|---|---|---|
| CA-01 | `use-screen-reader.ts` importa `useMemo` da `react` | ☐ |
| CA-02 | Il `return` di `useScreenReader` è avvolto in `useMemo(...)` | ☐ |
| CA-03 | L'array deps del `useMemo` include tutte le callback dichiarate nell'hook (nessuna omessa) | ☐ |
| CA-04 | Nessun `useCallback` all'interno di `useScreenReader` è stato modificato | ☐ |
| CA-05 | `TransactionDialog.tsx` non contiene più `const screenReader = useScreenReader()` | ☐ |
| CA-06 | La destruttazione all'inizio del componente include almeno: `announceDialogOpen`, `announce`, `announceFormError`, `announceSuccess` | ☐ |
| CA-07 | L'array di dipendenze di Effect 1 (apertura dialog) non contiene `screenReader` | ☐ |
| CA-08 | L'array di dipendenze di Effect 2 (trasferimento) non contiene `screenReader` | ☐ |
| CA-09 | L'array di dipendenze di Effect 3 (ricorrenza) non contiene `screenReader` | ☐ |
| CA-10 | L'array di dipendenze di Effect 4 (errori) non contiene `screenReader` | ☐ |
| CA-11 | Nessuna chiamata `screenReader.announce*` è rimasta nel file (né nei dep array né nei body degli effect né negli handler inline) | ☐ |
| CA-12 | L'interfaccia di `TransactionDialogProps` è identica all'originale | ☐ |
| CA-13 | La funzione `handleSubmit` è identica all'originale (nessuna riga modificata) | ☐ |
| CA-14 | La funzione `resetForm` è identica all'originale | ☐ |
| CA-15 | Il JSX ritornato dal componente è identico all'originale | ☐ |
| CA-16 | TypeScript non riporta errori di tipo nei due file modificati (`tsc --noEmit`) | ☐ |
| CA-17 | Il linter ESLint non riporta nuovi warning `react-hooks/exhaustive-deps` nei due file modificati | ☐ |
| CA-18 | Nessun altro file nel repository è stato modificato | ☐ |

---

## 9. Note per l'agente di implementazione

### 9.1 Ordine suggerito delle modifiche

1. **Prima** modificare `use-screen-reader.ts`: aggiungere `useMemo` all'import e avvolgere il return. Questo è il cambiamento strutturale che stabilizza la causa radice.
2. **Poi** modificare `TransactionDialog.tsx`: cambiare la dichiarazione dell'hook da assegnazione oggetto a destruttazione, quindi aggiornare i quattro `useEffect`.

Questo ordine permette di eseguire `tsc --noEmit` dopo il primo step e verificare che non ci siano regressioni di tipo prima di toccare il componente.

### 9.2 Avvertenza sul commento `eslint-disable`

L'array di dipendenze del `useMemo` in `use-screen-reader.ts` è lungo (~35 voci). Alcuni linter configurati con regole aggressive potrebbero segnalare il `useMemo` come "inutile" se l'analisi statica non riconosce che le callback possono cambiare (anche se in pratica non cambiano mai). Se compare un warning `react-hooks/exhaustive-deps` o simile, valutare l'aggiunta di un commento mirato `// eslint-disable-next-line react-hooks/exhaustive-deps` sopra l'array deps — già indicato nel codice di riferimento alla Sezione 4.3.

### 9.3 Handler inline nel Checkbox

Nel JSX del componente, il callback `onCheckedChange` del `<Checkbox id="transaction-recurring">` contiene una chiamata `screenReader.announce(...)`. Questa chiamata deve essere aggiornata a `announce(...)` per coerenza con la nuova dichiarazione. Non è tecnicamente necessaria per correggere il bug (non è in un dep array), ma è necessaria per compilare senza errori TypeScript dopo che `const screenReader` viene rimosso.

### 9.4 Test manuale post-implementazione

Dopo la correzione, verificare manualmente:
1. Aprire il dialog Nuovo Movimento
2. Cliccare sul campo Importo
3. Digitare `10.50` — il valore deve rimanere visibile nel campo
4. Premere la freccia su del browser — il valore deve aumentare
5. Cambiare il tipo in "Trasferimento" — il campo importo deve mantenere il valore già inserito
6. Attivare la ricorrenza — il campo importo deve mantenere il valore
7. Salvare il movimento — deve essere salvato con importo `10.50`

### 9.5 Confronto con altri componenti che usano `useScreenReader`

Dopo il Passo 22, i componenti `AuthContext`, `DashboardTab`, `TransactionsTab`, `CategoryManagement`, `SecuritySettings` e altri consumatori di `useScreenReader` beneficeranno automaticamente della stabilizzazione dell'oggetto introdotta in `use-screen-reader.ts` senza richiedere modifiche. Nessuno di questi file va toccato in questo passo.

### 9.6 Nessun impatto sulle funzionalità SR

La modifica non altera il comportamento della classe `ScreenReaderAnnouncer` (`src/lib/screen-reader.ts`), che rimane un singleton con le sue live region. Gli annunci continuano a funzionare esattamente come prima; la differenza è che vengono emessi una sola volta per evento invece di ripetutamente.
