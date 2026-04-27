# Report Diagnostico Bug — Pre-Merge
**Data:** 27 aprile 2026  
**Branch:** `refactoring-architettura`  
**Analisi:** sola lettura — nessuna modifica al codice  
**Perimetro:** `src/context/`, `src/hooks/`, `src/components/`, `src/lib/`

---

## Indice
1. [Schede bug confermati](#1-schede-bug-confermati)
2. [Bug potenziali nelle aree non testate](#2-bug-potenziali-nelle-aree-non-testate)
3. [Sintesi esecutiva](#3-sintesi-esecutiva)

---

## 1. Schede Bug Confermati

---

### BUG-01 — Persistenza PIN (Blocco A2 + L1 + L2)

| Campo | Valore |
|---|---|
| **Severità** | Bloccante |
| **File** | `src/context/AuthContext.tsx` |
| **Riga** | 51–58 |
| **Stato** | Confermato |

#### Causa radice

`globalPinHash` è inizializzato tramite `useKV<string>('global-pin-hash', '')` da `@github/spark/hooks`. L'hook restituisce **in modo sincrono** il valore di default `''` prima che il dato persistente venga caricato in modo asincrono dal KV store.

Il `useEffect` responsabile dell'avvio del flusso di autenticazione ha **array di dipendenze vuoto `[]`**, quindi viene eseguito una sola volta al mount:

```tsx
// AuthContext.tsx — righe 51–58
useEffect(() => {
  if (!globalPinHash) {        // ← valuta '' (default sincrono), non il valore reale dal KV
    setIsSetupMode(true)        // ← sempre true anche dopo il primo avvio
    setShowPinDialog(true)
  } else {
    setShowPinDialog(true)
  }
}, [])
```

Al mount, `globalPinHash` vale `''` (il default dell'hook), che è **falsy**. La condizione `!globalPinHash` è sempre vera al primo render, quindi `isSetupMode` viene impostato a `true` anche quando l'utente aveva già configurato un PIN in sessioni precedenti. Quando il KV store carica il valore reale in modo asincrono, l'effect non si riesegue (deps `[]`).

#### Effetto osservato

Ad ogni refresh (F5) l'app presenta il dialog "Imposta PIN Globale" (setup mode) invece del dialog "Inserisci PIN" (login mode), come se fosse sempre il primo avvio.

#### Impatto

Accesso completamente bloccato dopo ogni refresh. Ogni invio del form in setup mode sovrascrive il PIN esistente nel KV store.

---

### BUG-02 — Pulsante Elimina Conto assente (Blocco B4)

| Campo | Valore |
|---|---|
| **Severità** | Bloccante |
| **File principale** | `src/components/AccountDialog.tsx` |
| **Riga** | 206–213 (DialogFooter) |
| **Coinvolto** | `src/components/DashboardTab.tsx` |
| **Stato** | Confermato |

#### Causa radice

`AccountDialog` espone solo due azioni nel footer: "Annulla" e "Salva Modifiche" / "Crea Conto". Non esiste un pulsante "Elimina" nella finestra di modifica conto.

```tsx
// AccountDialog.tsx — DialogFooter (righe 206–213)
<DialogFooter>
  <Button type="button" variant="outline" onClick={handleCancel}>
    Annulla
  </Button>
  <Button type="submit">
    {account ? 'Salva Modifiche' : 'Crea Conto'}
  </Button>
</DialogFooter>
// ← nessun Button "Elimina" / "Elimina Conto"
```

`AccountCard` in `DashboardTab.tsx` è un elemento cliccabile che apre `AccountDialog` ma non offre pulsanti inline di eliminazione. La lista "Movimenti Recenti" in DashboardTab importa `Trash` da `@phosphor-icons/react` e lo utilizza correttamente per i movimenti, ma **non** per i conti.

Il meccanismo di eliminazione (`handleDeleteConfirm`, `setDeletingItem`, `setShowDeleteDialog`) esiste completamente in `AppDataContext.tsx` (righe ~275–295) e funziona per tutti i tipi di entità — incluso `'account'` — ma **nessun elemento UI invoca** questi handler per i conti.

#### Effetto osservato

Non esiste alcun percorso UI per eliminare un conto. Il conto è immortale una volta creato.

#### Impatto

Funzionalità core mancante. Impossibile rimuovere conti errati o duplicati.

---

### BUG-03 — Conto Privato non bloccabile (Blocco C1 + C2)

| Campo | Valore |
|---|---|
| **Severità** | Degradante (alto) |
| **File principale** | `src/context/AuthContext.tsx` |
| **Riga** | 42–43 (`isPrivateUnlocked` state) |
| **Coinvolti** | `src/components/DashboardTab.tsx` (righe 158–186), `src/hooks/use-app-shortcuts.ts` (righe ~186–196) |
| **Stato** | Confermato |

#### Causa radice

`isPrivateUnlocked` è un semplice `useState(false)`. La funzione `setIsPrivateUnlocked(false)` non è mai chiamata da nessun handler, componente o shortcut dopo che il conto è stato sbloccato.

In `DashboardTab.tsx`, il pulsante "Sblocca Privato" viene renderizzato solo quando `!isPrivateUnlocked`:

```tsx
// DashboardTab.tsx — righe 158–186
{hasPrivateAccount && !isPrivateUnlocked && (
  <Button onClick={() => setShowPrivatePinDialog(true)}>
    Sblocca Privato
  </Button>
)}
// ← nessun branch per isPrivateUnlocked === true → nessun pulsante "Blocca"
```

Lo shortcut `Ctrl+U` in `use-app-shortcuts.ts` è condizionato a `!isPrivateUnlocked` e non ha un ramo per re-lock:

```ts
// use-app-shortcuts.ts — callback shortcut Ctrl+U
if (isAuthenticated && hasPrivateAccount && !isPrivateUnlocked) {
  setShowPrivatePinDialog(true)
}
// ← nessuna else branch per bloccare il conto quando isPrivateUnlocked === true
```

#### Effetto osservato

Una volta sbloccato, il conto privato rimane visibile per tutta la sessione. Non esiste un modo per tornare allo stato "bloccato" senza ricaricare la pagina (che però, per BUG-01, fa ripartire il setup PIN).

#### Impatto

Privacy compromessa: chiunque acceda al dispositivo durante una sessione attiva vede i dati del conto privato. Il blocco temporaneo è impossibile.

---

### BUG-04 — Crash nel dialog Nuovo Movimento (Blocco D2)

| Campo | Valore |
|---|---|
| **Severità** | Bloccante |
| **File** | `src/components/TransactionDialog.tsx` |
| **Riga critica** | 66–75 (useEffect con deps `[open, transaction, screenReader, resetForm]`) |
| **Causa secondaria** | `src/hooks/use-screen-reader.ts` (oggetto restituito non memoizzato) |
| **Stato** | Confermato |

#### Causa radice

`useScreenReader()` in `TransactionDialog.tsx` è chiamato a livello del componente:

```tsx
const screenReader = useScreenReader()
```

L'hook (`src/hooks/use-screen-reader.ts`) restituisce un **nuovo oggetto** ad ogni render del componente, nonostante le singole funzioni interne siano stabili (wrapped in `useCallback([], [])`). L'oggetto contenitore non è memoizzato con `useMemo`.

Questo oggetto è incluso nelle dipendenze di un `useEffect` che, quando `open === true` e `!transaction`, chiama `resetForm()`:

```tsx
// TransactionDialog.tsx — righe 66–75
useEffect(() => {
  if (open) {
    screenReader.announceDialogOpen(...)
    if (!transaction) {
      resetForm()                          // ← svuota tutti i campi, incluso importo
      const timer = setTimeout(() => amountInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }
}, [open, transaction, screenReader, resetForm])
//                      ^^^^^^^^^^^
//                      cambia ad ogni render → effect si riesegue ad ogni render
```

`resetForm` è a sua volta un `useCallback` che dipende da `[accounts, categories]`. Ogni volta che il componente ri-renderizza (ad es. perché l'utente digita un carattere nel campo importo), la catena è:

1. Utente digita → `setImporto(value)` → re-render
2. Re-render → `screenReader` è un nuovo oggetto
3. `useEffect` deps cambiano → effect in coda
4. Effect esegue `resetForm()` → `setImporto('')` → re-render
5. Goto 1

Il campo `importo` viene svuotato ad ogni singola interazione dell'utente, rendendo impossibile l'inserimento di valori.

**Nota:** lo stesso pattern (`screenReader` in deps) è presente anche in altri `useEffect` dentro `TransactionDialog` (righe 80–92 e 93–100) ma con condizioni diverse che limitano i danni.

#### Effetto osservato

Il campo "Importo" nel dialog Nuovo Movimento non accetta input: ogni carattere digitato viene immediatamente cancellato. Le frecce di incremento/decremento del browser per `type="number"` producono lo stesso effetto.

#### Impatto

Impossibile registrare qualsiasi tipo di movimento. Funzionalità core completamente non funzionante.

---

## 2. Bug Potenziali nelle Aree Non Testate

---

### POT-01 — Doppio stato per `categories` (CategoryManagement vs AppDataContext)

| Campo | Valore |
|---|---|
| **Severità** | Degradante |
| **File** | `src/components/CategoryManagement.tsx` (riga 27), `src/context/AppDataContext.tsx` (riga 77) |
| **Area** | Blocco I — Gestione Categorie |

`CategoryManagement` usa direttamente `useKV<Category[]>('categories', [])` invece di consumare il valore da `AppDataContext`. Entrambe le istanze puntano alla stessa chiave KV `'categories'`. Se `useKV` di Spark non ha un meccanismo pub/sub per sincronizzare tutte le istanze dello stesso hook sulla stessa chiave, le due copie di stato possono divergere durante la sessione.

**Scenario critico:** aggiungere/eliminare una categoria in CategoryManagement (ReportsTab) mentre il TransactionDialog è aperto → la categoria nuova potrebbe non comparire nelle select del dialog fino al prossimo render completo.

Inoltre, `AppDataContext` ha un `useEffect` che inizializza le categorie di default se `safeCategories.length === 0`. Se CategoryManagement svuota le categorie (es. eliminando l'ultima), questo effect si ri-attiverà reimpostando tutte le categorie di default, sovrascrivendo la modifica dell'utente.

---

### POT-02 — BudgetDialog: nessun feedback su validazione importo

| Campo | Valore |
|---|---|
| **Severità** | Degradante |
| **File** | `src/components/BudgetDialog.tsx` |
| **Riga** | ~96–99 (handleSubmit) |
| **Area** | Blocco F — Budget |

In `handleSubmit`, se l'importo non è valido (`isNaN(amount) || amount <= 0`), la funzione restituisce silenziosamente senza mostrare un messaggio di errore, senza toast, senza impostare un campo `error`:

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  const amount = parseFloat(importoTarget)
  if (isNaN(amount) || amount <= 0) {
    return  // ← silenzioso, nessun feedback
  }
  // ...
}
```

L'utente clicca "Salva" e non succede nulla, senza capire perché. Il campo nome ha la stessa assenza di validazione visibile (`.trim()` non mostrato).

---

### POT-03 — DataManagement: import JSON senza whitelist chiavi

| Campo | Valore |
|---|---|
| **Severità** | Bloccante (sicurezza) |
| **File** | `src/components/DataManagement.tsx` |
| **Riga** | ~76–83 (handleImportData) |
| **Area** | Blocco L — Gestione Dati |

`handleImportData` scrive **tutte** le chiavi del JSON importato nel KV store senza alcuna validazione:

```tsx
for (const [key, value] of Object.entries(data)) {
  await window.spark.kv.set(key, value)
}
```

Un file JSON malevolo può contenere `"global-pin-hash": "<hash-noto>"` e sovrascrivere l'hash del PIN globale, consentendo l'accesso non autorizzato alla prossima sessione. Stessa cosa per `"private-pin-hash"`. Non vi è nemmeno una whitelist delle chiavi ammesse né un controllo del formato dei valori.

---

### POT-04 — SecuritySettings: gestione duale del PIN hash (AuthContext vs KV locale)

| Campo | Valore |
|---|---|
| **Severità** | Degradante |
| **File** | `src/components/SecuritySettings.tsx` (riga 28–29) |
| **Area** | Blocco M — Impostazioni Sicurezza |

`SecuritySettings` usa le sue istanze di `useKV('global-pin-hash', '')` e `useKV('private-pin-hash', '')` indipendentemente da `AuthContext`, che ha le sue istanze sulle stesse chiavi. Se un utente cambia il PIN tramite SecuritySettings durante una sessione attiva, il valore `globalPinHash` in `AuthContext` potrebbe non aggiornarsi immediatamente (dipende dall'implementazione di pub/sub di `useKV`).

**Scenario:** l'utente cambia il PIN da "1234" a "9999" nelle Impostazioni. Se AuthContext non riceve il nuovo hash, al logout-login immediato verrebbe accettato ancora "1234" (vecchio hash in memoria). Il bug sarebbe temporaneo (fino al prossimo mount), ma in una sessione mono-tab potrebbe non manifestarsi mai in modo evidente.

---

### POT-05 — SavingsGoalDialog: importo corrente senza vincolo minimo

| Campo | Valore |
|---|---|
| **Severità** | Estetico / Dati corrotti |
| **File** | `src/components/SavingsGoalDialog.tsx` |
| **Area** | Blocco G — Obiettivi di Risparmio |

Il campo `importoCorrente` non ha vincoli `min="0"` né validazione server-side. Un valore negativo verrebbe salvato silenziosamente, creando un obiettivo con "risparmio corrente" negativo, che potrebbe causare percentuali di avanzamento negative nelle card di progresso.

---

### POT-06 — TransactionDialog: resetForm invocato su cambio accounts/categories

| Campo | Valore |
|---|---|
| **Severità** | Degradante |
| **File** | `src/components/TransactionDialog.tsx` |
| **Riga** | 54–63 (resetForm useCallback) |
| **Area** | Blocco D3-D6 — Tutte le operazioni su movimenti |

Correlato a BUG-04 ma distinto: `resetForm` ha `[accounts, categories]` come dipendenze. Se un account viene creato o modificato mentre il dialog è aperto (in una finestra con tab aperto su Dashboard e TransactionDialog aperto), `resetForm` cambia riferimento → l'effect lo esegue di nuovo → il form viene completamente azzerato perdendo la compilazione parziale dell'utente.

---

### POT-07 — TransactionDialog: campo categoria vuoto su tipo "trasferimento" 

| Campo | Valore |
|---|---|
| **Severità** | Estetico |
| **File** | `src/components/TransactionDialog.tsx` |
| **Riga** | 117–126 (useEffect su `[tipo, categoriaId, categories]`) |
| **Area** | Blocco D — Nuovo Movimento Trasferimento |

Quando `tipo === 'trasferimento'`, le categorie sono filtrate a 0 elementi (`filteredCategories` è `[]`). Il `useEffect` che auto-seleziona la prima categoria valida non trova categorie per i trasferimenti, lasciando `categoriaId` al valore precedente. La validazione in `handleSubmit` salta il check categoria per i trasferimenti, quindi non è un crash, ma `transaction.categoriaId` viene salvato con il valore stringa `''` (riga ~165: `categoriaId: tipo === 'trasferimento' ? '' : categoriaId`). Se in futuro si aggiunge filtraggio per categoria, i trasferimenti potrebbero comportarsi in modo inaspettato.

---

### POT-08 — ReportsTab: nessun pulsante Elimina per Obiettivi di Risparmio visibile

| Campo | Valore |
|---|---|
| **Severità** | Degradante |
| **File** | `src/components/ReportsTab.tsx` |
| **Area** | Blocco G — Obiettivi di Risparmio |

`ReportsTab` importa `setDeletingItem` e `setShowDeleteDialog` da AppDataContext e li passa alla `SavingsGoalCard`. Occorre verificare che `SavingsGoalCard` implementi il pulsante Elimina e lo colleghi correttamente — la struttura appare incompleta ma non è possibile confermarlo senza leggere `SavingsGoalCard.tsx`. Segnalato come rischio da verificare prima del merge.

---

## 3. Sintesi Esecutiva

### Conteggio

| Categoria | Numero |
|---|---|
| Bug confermati (da test manuale) | **4** |
| Bug potenziali (aree non testate) | **8** |
| **Totale** | **12** |

| Severità | Bug confermati | Bug potenziali |
|---|---|---|
| Bloccante | 3 (BUG-01, BUG-02, BUG-04) | 1 (POT-03) |
| Degradante | 1 (BUG-03) | 5 (POT-01, POT-02, POT-04, POT-05, POT-06) |
| Estetico / dati | — | 2 (POT-07, POT-08) |

### Ordine di Priorità di Correzione

**Sprint 1 — Critici (blocca il merge)**

1. **BUG-04** — `screenReader` rimosso dalle deps dell'useEffect in `TransactionDialog.tsx`. Impatta il 100% delle operazioni di inserimento movimenti.
2. **BUG-01** — Refactoring del flusso di inizializzazione auth in `AuthContext.tsx` per gestire correttamente il loading asincrono del KV store (stato `undefined` / `isLoading`).
3. **BUG-02** — Aggiunta pulsante "Elimina" in `AccountDialog.tsx` (edit mode) con hook su `setDeletingItem` + `setShowDeleteDialog`.
4. **POT-03** — Aggiunta whitelist chiavi in `DataManagement.handleImportData` per bloccare sovrascrittura di PIN hash via import.

**Sprint 2 — Importanti**

5. **BUG-03** — Aggiunta pulsante "Blocca Privato" in `DashboardTab.tsx` quando `isPrivateUnlocked === true` + ramo `else` nello shortcut `Ctrl+U`.
6. **POT-02** — Aggiunta gestione errore visibile in `BudgetDialog.handleSubmit` per importo non valido.
7. **POT-01** — Refactoring `CategoryManagement` per consumare `setCategories` da `AppDataContext` invece di `useKV` diretto.
8. **POT-06** — Separare `resetForm` dall'effect di apertura dialog in `TransactionDialog` per evitare reset involontario del form durante la compilazione.

**Sprint 3 — Minori / Da monitorare**

9. **POT-04** — Verifica comportamento pub/sub di `useKV` per `SecuritySettings`; eventuale centralizzazione hash PIN in AuthContext.
10. **POT-05** — Aggiunta `min="0"` e validazione al campo `importoCorrente` in `SavingsGoalDialog`.
11. **POT-07** — Valutazione se salvare `categoriaId` come `undefined` per i trasferimenti invece di stringa vuota.
12. **POT-08** — Verifica `SavingsGoalCard.tsx` per presenza/assenza pulsante Elimina.

---

*Report generato in sola lettura — nessuna modifica applicata al codice sorgente.*
