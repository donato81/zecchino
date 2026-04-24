# P18 — Todo List: VisibleDataProvider — fonte unica dei dati elaborati

> Passo 18 — VisibleDataProvider: fonte unica dei dati elaborati  
> Piano di riferimento: `docs/2 - coding plans/P18-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P18-visible-data-provider-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: 2026-04-24  
> Data completamento: —

---

## Prima di iniziare

- [ ] Rileggere `docs/2 - coding plans/P18-coding-plan.md` (tutte le sezioni AI1–AI9)
- [ ] Rileggere `docs/1 - projects/P18-visible-data-provider-design.md` §4, §7 e §8
- [ ] Verificare di essere sul branch `refactoring-architettura`
- [ ] Eseguire `npm run build` → atteso exit 0 (baseline pulita)
- [ ] Eseguire `npm run lint` → annotare il numero esatto di warning (baseline P17: 55)
  - Baseline effettiva misurata: ___________
- [ ] Eseguire `git status` → nessuna modifica in sospeso
- [ ] Verificare che `src/context/VisibleDataContext.tsx` **non esista** ancora

---

## A — Creazione di `src/context/VisibleDataContext.tsx`

> ⚠️ Questo file è il cuore di P18. Una struttura sbagliata qui rompe tutto il
> resto. Leggere il piano operativo AI1, AI9 e Sotto-operazione 1 prima di scrivere.

### A.1 — Lettura preventiva

- [ ] Aprire e rileggere `src/hooks/use-visible-data.ts`
  - Confermare: 2 named exports (`type VisibleDataResult` + `function useVisibleData`)
  - Confermare: 10 campi nel tipo, nessun campo aggiuntivo
- [ ] Aprire e confrontare `src/context/AppDataContext.tsx` e `src/context/AuthContext.tsx`
  - Confermare il pattern: `createContext<Type | null>(null)`, guard nel hook, named exports

### A.2 — Creazione del file

- [ ] Creare `src/context/VisibleDataContext.tsx`
- [ ] Import: `createContext`, `useContext`, `type ReactNode` da `react`
- [ ] Import con alias: `import { useVisibleData as useVisibleDataHook, type VisibleDataResult } from '@/hooks/use-visible-data'`
  - ⚠️ L'alias `useVisibleDataHook` è obbligatorio: questo file esporta anche una funzione
    chiamata `useVisibleData`. Senza alias, TypeScript segnalerebbe un conflitto.
- [ ] Aggiungere: `type VisibleDataContextValue = VisibleDataResult`
- [ ] Aggiungere: `const VisibleDataContext = createContext<VisibleDataContextValue | null>(null)` (non esportato)
- [ ] Aggiungere il hook di accesso `useVisibleData`:
  - Named export
  - Chiama `useContext(VisibleDataContext)`
  - Guard: `if (!ctx) throw new Error('useVisibleData deve essere usato dentro VisibleDataProvider')`
  - Return type esplicito: `: VisibleDataContextValue`
- [ ] Aggiungere il provider `VisibleDataProvider`:
  - Named export
  - Parametro `{ children }: { children: ReactNode }`
  - Chiama `useVisibleDataHook()` una sola volta — nessun altro hook, stato o effetto
  - Ritorna `<VisibleDataContext.Provider value={data}>{children}</VisibleDataContext.Provider>`

### A.3 — Verifica struttura

- [ ] Verificare che il file abbia esattamente 2 named exports: `useVisibleData` e `VisibleDataProvider`
- [ ] Verificare che il context NON sia esportato direttamente
- [ ] Verificare che `VisibleDataProvider` non contenga `useState`, `useEffect` propri
- [ ] Verificare che `useVisibleDataHook` venga chiamato una volta sola, senza condizioni

### A.4 — Verifica intermedia A

- [ ] Eseguire `npm run build`
  - ✅ Exit 0 → procedere alla sezione B
  - ❌ Errori TypeScript → tipi comuni:
    - `JSX element type does not have any construct…` — il file `.tsx` deve restituire JSX valido; verificare che non si usi l'estensione `.ts`
    - `Module has no exported member 'useVisibleData'` — verificare il nome esatto dell'export in `use-visible-data.ts`
    - `Type 'VisibleDataContextValue | null' is not assignable to type 'VisibleDataContextValue'` — aggiungere il guard `if (!ctx)` nel hook
- [ ] Eseguire `npm run lint` — annotare il numero di warning
  - Variazione attesa: +1 per `react-refresh/only-export-components` su `VisibleDataContext.tsx`
  - ✅ ≤ baseline + 1 → accettabile
  - ❌ Nuovi warning inattesi → analizzare prima di procedere

---

## B — Integrazione in `src/App.tsx`

> ⚠️ Questa è la modifica più critica: il posizionamento errato del provider
> rompe l'app al primo render con un errore nel ErrorBoundary.

### B.1 — Lettura preventiva

- [ ] Aprire `src/App.tsx`
- [ ] Localizzare la riga di import di `useVisibleData` (riga 23)
- [ ] Localizzare la funzione `App` in fondo al file e leggere l'albero dei provider attuale:
  `return <AuthProvider><AppDataProvider><AppContent /></AppDataProvider></AuthProvider>`
- [ ] Localizzare la chiamata a `useVisibleData` in `AppContent` (riga 33) e i campi destrutturati

### B.2 — Aggiunta import di `VisibleDataProvider`

- [ ] Aggiungere nella sezione import, dopo gli import dei context esistenti:
  ```typescript
  import { VisibleDataProvider } from '@/context/VisibleDataContext'
  ```

### B.3 — Inserimento del provider nell'albero

- [ ] Modificare la funzione `App` per inserire `<VisibleDataProvider>` tra `<AppDataProvider>` e `<AppContent />`:
  ```typescript
  function App() {
    return <AuthProvider><AppDataProvider><VisibleDataProvider><AppContent /></VisibleDataProvider></AppDataProvider></AuthProvider>
  }
  ```
  ⚠️ L'ordine di apertura deve essere: `AuthProvider` → `AppDataProvider` → `VisibleDataProvider` → `AppContent`. Qualsiasi altro ordine rompe l'app.

### B.4 — Sostituzione dell'import in `AppContent`

- [ ] Nella sezione import del file, **sostituire** la riga 23:
  ```typescript
  import { useVisibleData } from '@/hooks/use-visible-data'
  ```
  con:
  ```typescript
  import { useVisibleData } from '@/context/VisibleDataContext'
  ```
- [ ] Verificare che la destrutturazione in `AppContent` riga 33 sia identica:
  `const { budgetAlerts, totalBalance, visibleAccounts, visibleTransactions } = useVisibleData()`
  Nessuna modifica richiesta su questa riga.

### B.5 — Verifica visiva ordine di annidamento

- [ ] Rileggere le ultime righe di `App.tsx` dopo l'edit
- [ ] Confermare visivamente l'ordine: `AuthProvider → AppDataProvider → VisibleDataProvider → AppContent`
- [ ] Verificare che non siano rimasti import da `@/hooks/use-visible-data` nel file

### B.6 — Verifica intermedia B

- [ ] Eseguire `npm run build`
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

- [ ] Aprire `src/components/AppHeader.tsx`
- [ ] Riga 3: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [ ] Verificare che riga 13 sia invariata: `const { totalBalance, visibleAccounts } = useVisibleData()`
- [ ] Eseguire `npm run build` → exit 0

### C.2 — `src/components/TransactionsTab.tsx` (2 campi)

- [ ] Aprire `src/components/TransactionsTab.tsx`
- [ ] Riga 4: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [ ] Verificare che riga 26 sia invariata: `const { visibleTransactions, visibleAccounts } = useVisibleData()`
- [ ] Verificare che gli import React (riga 1: `useMemo, useRef, useCallback`) non siano stati toccati
- [ ] Eseguire `npm run build` → exit 0

### C.3 — `src/hooks/use-app-shortcuts.ts` (4 campi — hook, non componente)

- [ ] Aprire `src/hooks/use-app-shortcuts.ts`
- [ ] Riga 4: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [ ] Verificare che la destrutturazione (~riga 44–49) sia invariata:
  `const { allCategoriesVisible, hasPrivateAccount, visibleTransactions, visibleAccounts } = useVisibleData()`
- [ ] ⚠️ Nota: questo file è un hook chiamato da `AppContent` — il provider è nell'albero sopra di esso; nessun problema di context mancante.
- [ ] Eseguire `npm run build` → exit 0

### C.4 — `src/components/DialogsOverlay.tsx` (4 campi)

- [ ] Aprire `src/components/DialogsOverlay.tsx`
- [ ] Riga 3: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [ ] Verificare che la destrutturazione (~riga 66–71) sia invariata:
  `const { visibleAccounts, visibleTransactions, hasPrivateAccount, privateAccount } = useVisibleData()`
- [ ] Eseguire `npm run build` → exit 0

### C.5 — `src/components/ReportsTab.tsx` (3 campi)

- [ ] Aprire `src/components/ReportsTab.tsx`
- [ ] Riga 3: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [ ] Verificare che la destrutturazione (~riga 44–48) sia invariata:
  `const { visibleAccounts, visibleTransactions, totalBalance } = useVisibleData()`
- [ ] Eseguire `npm run build` → exit 0

### C.6 — `src/components/DashboardTab.tsx` (7 campi)

- [ ] Aprire `src/components/DashboardTab.tsx`
- [ ] Riga 4: sostituire `from '@/hooks/use-visible-data'` → `from '@/context/VisibleDataContext'`
- [ ] Verificare che la destrutturazione (~righe 43–51) sia invariata con tutti e 7 i campi:
  `visibleAccounts, visibleTransactions, recentTransactions, groupedAccounts,`
  `filteredGroupedAccounts, allCategoriesVisible, hasPrivateAccount`
- [ ] Verificare che gli import React (riga 1: `useRef, useCallback`) non siano stati toccati
- [ ] Eseguire `npm run build` → exit 0

---

## D — Verifica finale

> Tutte le sotto-operazioni A, B, C completate con build verde.

### D.1 — Build e lint

- [ ] Eseguire `npm run build` → exit 0
- [ ] Eseguire `npm run lint` → exit 0
- [ ] Annotare il numero totale di warning: ___________
  - ✅ ≤ baseline + 1 → accettabile (il +1 è `react-refresh/only-export-components` su VisibleDataContext.tsx)
  - ❌ Variazione maggiore → analizzare i nuovi warning prima di procedere

### D.2 — Grep di controllo (design §6.3)

- [ ] Eseguire: `grep -r "@/hooks/use-visible-data" src/`
- [ ] Verificare che l'unico file nell'output sia `src/context/VisibleDataContext.tsx`
- [ ] Zero occorrenze in qualsiasi altro file `src/`

### D.3 — Integrità repository

- [ ] Eseguire `git diff --stat`
- [ ] Verificare che compaiano **esattamente** 9 file (1 nuovo + 8 modificati):
  - [ ] `src/context/VisibleDataContext.tsx` (nuovo — `A`)
  - [ ] `src/App.tsx`
  - [ ] `src/hooks/use-app-shortcuts.ts`
  - [ ] `src/components/AppHeader.tsx`
  - [ ] `src/components/TransactionsTab.tsx`
  - [ ] `src/components/DialogsOverlay.tsx`
  - [ ] `src/components/ReportsTab.tsx`
  - [ ] `src/components/DashboardTab.tsx`
- [ ] Verificare che `src/hooks/use-visible-data.ts` **non compaia** (invariato)
- [ ] Verificare che **nessun file sotto `.github/`** sia modificato

### D.4 — Verifica provider nell'albero

- [ ] Aprire `src/App.tsx` e leggere le ultime righe
- [ ] Confermare che `VisibleDataProvider` sia presente nell'albero
- [ ] Confermare l'ordine: `AuthProvider → AppDataProvider → VisibleDataProvider → AppContent`

### D.5 — Verifica comportamento visivo manuale

- [ ] Avviare il dev server: `npm run dev`
- [ ] **Tab Dashboard**: conti, movimenti recenti e saldo totale visualizzati correttamente
- [ ] **Tab Movimenti**: lista con filtri e ordinamento invariata
- [ ] **Tab Report**: grafici e statistiche invariati
- [ ] **AppHeader**: saldo nella barra dell'intestazione corretto
- [ ] **BudgetAlertBanner**: banner appare se ci sono alert (o assente se nessun alert — comportamento invariato)
- [ ] **Sblocco conto privato**: attivare il pin e verificare che le tre tab si aggiornino mostrando il conto privato
- [ ] **Dialogo transazione**: aprire, compilare e salvare — verificare che funzioni normalmente
- [ ] **Dialogo conto**: aprire, modificare e salvare — verificare che funzioni normalmente
- [ ] **Scorciatoie tastiera**: Ctrl+D (Dashboard), Ctrl+T (Movimenti), Ctrl+R (Report) funzionano

---

## Checklist gate finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| `npm run build` | exit 0 | | ☐ |
| `npm run lint` | exit 0, ≤ baseline + 1 | | ☐ |
| Grep `@/hooks/use-visible-data` | solo VisibleDataContext.tsx | | ☐ |
| `git diff --stat` | 9 file (1 nuovo + 8 mod.) | | ☐ |
| `src/hooks/use-visible-data.ts` non modificato | non compare nel diff | | ☐ |
| Nessun file `.github/` modificato | 0 file | | ☐ |
| Provider annidato correttamente | Auth → AppData → VisibleData → AppContent | | ☐ |
| Dashboard visivamente invariata | sì | | ☐ |
| Movimenti visivamente invariati | sì | | ☐ |
| Report visivamente invariato | sì | | ☐ |
| AppHeader saldo corretto | sì | | ☐ |
| Dialoghi funzionanti | sì | | ☐ |
| Scorciatoie tastiera funzionanti | sì | | ☐ |
| Sblocco conto privato corretto | sì | | ☐ |

> Quando tutti i gate sono ✅, aggiornare `docs/todo.md` spostando P18
> dalla sezione "In corso" a "Completati" con la data odierna.
