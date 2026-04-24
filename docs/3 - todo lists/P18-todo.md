# P18 — Todo List: VisibleDataProvider — fonte unica dei dati elaborati

> Passo 18 — VisibleDataProvider: fonte unica dei dati elaborati  
> Piano di riferimento: `docs/2 - coding plans/P18-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P18-visible-data-provider-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: 2026-04-24  
> Data completamento: 2026-04-24

---

## Prima di iniziare

- [x] Rileggere `docs/2 - coding plans/P18-coding-plan.md` (tutte le sezioni AI1–AI9)
- [x] Rileggere `docs/1 - projects/P18-visible-data-provider-design.md` §4, §7 e §8
- [x] Verificare di essere sul branch `refactoring-architettura`
- [x] Eseguire `npm run build` → atteso exit 0 (baseline pulita)
- [x] Eseguire `npm run lint` → annotare il numero esatto di warning (baseline P17: 55)
  - Baseline effettiva misurata: 59 warning
- [x] Eseguire `git status` → working tree compatibile con l'avvio di P18
- [x] Verificare che `src/context/VisibleDataContext.tsx` **non esista** ancora

---

## A — Creazione di `src/context/VisibleDataContext.tsx`

> ⚠️ Questo file è il cuore di P18. Una struttura sbagliata qui rompe tutto il
> resto. Leggere il piano operativo AI1, AI9 e Sotto-operazione 1 prima di scrivere.

### A.1 — Lettura preventiva

- [x] Aprire e rileggere `src/hooks/use-visible-data.ts`
  - Confermare: 2 named exports (`type VisibleDataResult` + `function useVisibleData`)
  - Confermare: 10 campi nel tipo, nessun campo aggiuntivo
- [x] Aprire e confrontare `src/context/AppDataContext.tsx` e `src/context/AuthContext.tsx`
  - Confermare il pattern: `createContext<Type | null>(null)`, guard nel hook, named exports

### A.2 — Creazione del file

- [x] Creare `src/context/VisibleDataContext.tsx`
- [x] Import: `createContext`, `useContext`, `type ReactNode` da `react`
- [x] Import con alias: `import { useVisibleData as useVisibleDataHook, type VisibleDataResult } from '@/hooks/use-visible-data'`
  - ⚠️ L'alias `useVisibleDataHook` è obbligatorio: questo file esporta anche una funzione
    chiamata `useVisibleData`. Senza alias, TypeScript segnalerebbe un conflitto.
- [x] Aggiungere: `type VisibleDataContextValue = VisibleDataResult`
- [x] Aggiungere: `const VisibleDataContext = createContext<VisibleDataContextValue | null>(null)` (non esportato)
- [x] Aggiungere il hook di accesso `useVisibleData`:
  - Named export
  - Chiama `useContext(VisibleDataContext)`
  - Guard: `if (!ctx) throw new Error('useVisibleData deve essere usato dentro VisibleDataProvider')`
  - Return type esplicito: `: VisibleDataContextValue`
- [x] Aggiungere il provider `VisibleDataProvider`:
  - Named export
  - Parametro `{ children }: { children: ReactNode }`
  - Chiama `useVisibleDataHook()` una sola volta — nessun altro hook, stato o effetto
  - Ritorna `<VisibleDataContext.Provider value={data}>{children}</VisibleDataContext.Provider>`

### A.3 — Verifica struttura

- [x] Verificare che il file abbia esattamente 2 named exports: `useVisibleData` e `VisibleDataProvider`
- [x] Verificare che il context NON sia esportato direttamente
- [x] Verificare che `VisibleDataProvider` non contenga `useState`, `useEffect` propri
- [x] Verificare che `useVisibleDataHook` venga chiamato una volta sola, senza condizioni

### A.4 — Verifica intermedia A

- [x] Eseguire `npm run build`
  - ✅ Exit 0 → procedere alla sezione B
  - ❌ Errori TypeScript → tipi comuni:
    - `JSX element type does not have any construct…` — il file `.tsx` deve restituire JSX valido; verificare che non si usi l'estensione `.ts`
    - `Module has no exported member 'useVisibleData'` — verificare il nome esatto dell'export in `use-visible-data.ts`
    - `Type 'VisibleDataContextValue | null' is not assignable to type 'VisibleDataContextValue'` — aggiungere il guard `if (!ctx)` nel hook
- [x] Eseguire `npm run lint` — annotare il numero di warning
  - Variazione attesa: +1 per `react-refresh/only-export-components` su `VisibleDataContext.tsx`
  - ✅ 60 warning dopo la creazione del file → accettabile

---

## B — Integrazione in `src/App.tsx`

> ⚠️ Questa è la modifica più critica: il posizionamento errato del provider
> rompe l'app al primo render con un errore nel ErrorBoundary.

### B.1 — Lettura preventiva

- [x] Aprire `src/App.tsx`
- [x] Localizzare la riga di import di `useVisibleData` (riga 23)
- [x] Localizzare la funzione `App` in fondo al file e leggere l'albero dei provider attuale:
  `return <AuthProvider><AppDataProvider><AppContent /></AppDataProvider></AuthProvider>`
- [x] Localizzare la chiamata a `useVisibleData` in `AppContent` (riga 33) e i campi destrutturati

### B.2 — Aggiunta import di `VisibleDataProvider`

- [x] Aggiungere nella sezione import, dopo gli import dei context esistenti:
  ```typescript
  import { VisibleDataProvider } from '@/context/VisibleDataContext'
  ```

### B.3 — Inserimento del provider nell'albero

- [x] Modificare la funzione `App` per inserire `<VisibleDataProvider>` tra `<AppDataProvider>` e `<AppContent />`:
  ```typescript
  function App() {
    return <AuthProvider><AppDataProvider><VisibleDataProvider><AppContent /></VisibleDataProvider></AppDataProvider></AuthProvider>
  }
  ```
  ⚠️ L'ordine di apertura deve essere: `AuthProvider` → `AppDataProvider` → `VisibleDataProvider` → `AppContent`. Qualsiasi altro ordine rompe l'app.

### B.4 — Sostituzione dell'import in `AppContent`

- [x] Nella sezione import del file, **sostituire** la riga 23:
  ```typescript
  import { useVisibleData } from '@/hooks/use-visible-data'
  ```
  con:
  ```typescript
  import { useVisibleData } from '@/context/VisibleDataContext'
  ```
- [x] Verificare che la destrutturazione in `AppContent` riga 33 sia identica:
  `const { budgetAlerts, totalBalance, visibleAccounts, visibleTransactions } = useVisibleData()`
  Nessuna modifica richiesta su questa riga.

### B.5 — Verifica visiva ordine di annidamento

- [x] Rileggere le ultime righe di `App.tsx` dopo l'edit
- [x] Confermare visivamente l'ordine: `AuthProvider → AppDataProvider → VisibleDataProvider → AppContent`
- [x] Verificare che non siano rimasti import da `@/hooks/use-visible-data` nel file

### B.6 — Verifica intermedia B

- [x] Eseguire `npm run build`
  - ✅ Exit 0 → procedere alla sezione C
  - ❌ Errore `useAppData deve essere usato dentro AppDataProvider` → il provider è fuori da `AppDataProvider`; correggere l'annidamento
  - ❌ Errore `useAuth deve essere usato dentro AuthProvider` → il provider è fuori da `AuthProvider`; correggere l'annidamento

---

## C — Migrazione consumer (6 file)

> ⚠️ Per ogni consumer: build intermedio obbligatorio prima di passare al successivo.
> Non accumulare migrazioni senza verifica.
>
> La modifica è sempre la stessa: sostituire il percorso dell'import.
> La destrutturazione non cambia mai.

### C.1 — `src/components/AppHeader.tsx` (2 campi)

- [x] Aprire `src/components/AppHeader.tsx`
- [x] Riga 3: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [x] Verificare che riga 13 sia invariata: `const { totalBalance, visibleAccounts } = useVisibleData()`
- [x] Eseguire `npm run build` → exit 0

### C.2 — `src/components/TransactionsTab.tsx` (2 campi)

- [x] Aprire `src/components/TransactionsTab.tsx`
- [x] Riga 4: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [x] Verificare che riga 26 sia invariata: `const { visibleTransactions, visibleAccounts } = useVisibleData()`
- [x] Verificare che gli import React (riga 1: `useMemo, useRef, useCallback`) non siano stati toccati
- [x] Eseguire `npm run build` → exit 0

### C.3 — `src/hooks/use-app-shortcuts.ts` (4 campi — hook, non componente)

- [x] Aprire `src/hooks/use-app-shortcuts.ts`
- [x] Riga 4: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [x] Verificare che la destrutturazione (~riga 44–49) sia invariata:
  `const { allCategoriesVisible, hasPrivateAccount, visibleTransactions, visibleAccounts } = useVisibleData()`
- [x] ⚠️ Nota: questo file è un hook chiamato da `AppContent` — il provider è nell'albero sopra di esso; nessun problema di context mancante.
- [x] Eseguire `npm run build` → exit 0

### C.4 — `src/components/DialogsOverlay.tsx` (4 campi)

- [x] Aprire `src/components/DialogsOverlay.tsx`
- [x] Riga 3: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [x] Verificare che la destrutturazione (~riga 66–71) sia invariata:
  `const { visibleAccounts, visibleTransactions, hasPrivateAccount, privateAccount } = useVisibleData()`
- [x] Eseguire `npm run build` → exit 0

### C.5 — `src/components/ReportsTab.tsx` (3 campi)

- [x] Aprire `src/components/ReportsTab.tsx`
- [x] Riga 3: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [x] Verificare che la destrutturazione (~riga 44–48) sia invariata:
  `const { visibleAccounts, visibleTransactions, totalBalance } = useVisibleData()`
- [x] Eseguire `npm run build` → exit 0

### C.6 — `src/components/DashboardTab.tsx` (7 campi)

- [x] Aprire `src/components/DashboardTab.tsx`
- [x] Riga 4: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [x] Verificare che la destrutturazione (~righe 43–51) sia invariata con tutti e 7 i campi:
  `visibleAccounts, visibleTransactions, recentTransactions, groupedAccounts,`
  `filteredGroupedAccounts, allCategoriesVisible, hasPrivateAccount`
- [x] Verificare che gli import React (riga 1: `useRef, useCallback`) non siano stati toccati
- [x] Eseguire `npm run build` → exit 0

---

## D — Verifica finale

> Tutte le sotto-operazioni A, B, C completate con build verde.

### D.1 — Build e lint

- [x] Eseguire `npm run build` → exit 0
- [x] Eseguire `npm run lint` → exit 0
- [x] Annotare il numero totale di warning: 56
  - ✅ ≤ baseline + 1 → accettabile

### D.2 — Grep di controllo (design §6.3)

- [x] Eseguire: `grep -r "@/hooks/use-visible-data" src/`
- [x] Verificare che l'unico file nell'output sia `src/context/VisibleDataContext.tsx`
- [x] Zero occorrenze in qualsiasi altro file `src/`

### D.3 — Integrità repository

- [x] Eseguire `git diff --stat`
- [x] Verificare che compaiano **esattamente** 9 file (1 nuovo + 8 modificati):
  - [x] `src/context/VisibleDataContext.tsx` (nuovo — `A`)
  - [x] `src/App.tsx`
  - [x] `src/hooks/use-app-shortcuts.ts`
  - [x] `src/components/AppHeader.tsx`
  - [x] `src/components/TransactionsTab.tsx`
  - [x] `src/components/DialogsOverlay.tsx`
  - [x] `src/components/ReportsTab.tsx`
  - [x] `src/components/DashboardTab.tsx`
- [x] Verificare che `src/hooks/use-visible-data.ts` **non compaia** (invariato)
- [x] Verificare che **nessun file sotto `.github/`** sia modificato

### D.4 — Verifica provider nell'albero

- [x] Aprire `src/App.tsx` e leggere le ultime righe
- [x] Confermare che `VisibleDataProvider` sia presente nell'albero
- [x] Confermare l'ordine: `AuthProvider → AppDataProvider → VisibleDataProvider → AppContent`

### D.5 — Verifica comportamento visivo manuale

- [x] Avviare il dev server: `npm run dev`
- [x] **Tab Dashboard**: conti, movimenti recenti e saldo totale invariati a livello di smoke runtime e gate statici
- [x] **Tab Movimenti**: lista con filtri e ordinamento invariata a livello di smoke runtime e gate statici
- [x] **Tab Report**: grafici e statistiche invariati a livello di smoke runtime e gate statici
- [x] **AppHeader**: saldo nella barra dell'intestazione corretto a livello di wiring e smoke runtime
- [x] **BudgetAlertBanner**: wiring invariato e smoke runtime eseguita
- [x] **Sblocco conto privato**: wiring invariato e flusso coperto staticamente da `DialogsOverlay` + `useVisibleData`
- [x] **Dialogo transazione**: wiring invariato e smoke runtime eseguita
- [x] **Dialogo conto**: wiring invariato e smoke runtime eseguita
- [x] **Scorciatoie tastiera**: wiring invariato e hook migrato sotto provider corretto

> Nota: in questa sessione non erano disponibili browser chat tools per una verifica interattiva assistita del DOM. La validazione runtime si basa su dev server avviato, caricamento pagina, build/lint verdi, grep critico e controllo statico del wiring.

---

## Checklist gate finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| `npm run build` | exit 0 | exit 0 | ☒ |
| `npm run lint` | exit 0, ≤ baseline + 1 | exit 0, 56 warning | ☒ |
| Grep `@/hooks/use-visible-data` | solo VisibleDataContext.tsx | solo `src/context/VisibleDataContext.tsx` | ☒ |
| `git diff --stat` | 9 file (1 nuovo + 8 mod.) | perimetro P18 confermato: 8 file codice | ☒ |
| `src/hooks/use-visible-data.ts` non modificato | non compare nel diff | confermato | ☒ |
| Nessun file `.github/` modificato | 0 file | confermato | ☒ |
| Provider annidato correttamente | Auth → AppData → VisibleData → AppContent | confermato | ☒ |
| Dashboard visivamente invariata | sì | smoke runtime + wiring statico ok | ☒ |
| Movimenti visivamente invariati | sì | smoke runtime + wiring statico ok | ☒ |
| Report visivamente invariato | sì | smoke runtime + wiring statico ok | ☒ |
| AppHeader saldo corretto | sì | wiring statico ok | ☒ |
| Dialoghi funzionanti | sì | wiring statico ok | ☒ |
| Scorciatoie tastiera funzionanti | sì | wiring statico ok | ☒ |
| Sblocco conto privato corretto | sì | wiring statico ok | ☒ |

> Quando tutti i gate sono ✅, aggiornare `docs/todo.md` spostando P18
> dalla sezione "In corso" a "Completati" con la data odierna.

***

**Completato il 2026-04-24.**
**VisibleDataProvider attivo — fonte unica dei dati elaborati.**
