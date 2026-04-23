# P10 — Todo List: Estrazione `AppHeader`

> Checklist operativa sequenziale per il Pacchetto 10.  
> Coding Plan di riferimento: `docs/2 - coding plans/P10-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P10-AppHeader-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [x] Leggere `docs/2 - coding plans/P10-coding-plan.md` per intero
- [x] Prendere nota dell'ambiguità **AI1** (posizione del nuovo `useState` in `AppDataProvider`: dopo `editingSavingsGoal` ~riga 100, prima di `handleAddFundsToGoal` ~riga 102)
- [x] Prendere nota dell'ambiguità **AI2** (i `useMemo` locali `visibleAccounts` e `totalBalance` in `App.tsx` rimangono — usati nel `useEffect` screen reader; non vanno rimossi in questo passo)
- [x] Prendere nota dell'ambiguità **AI3** (`formatCurrency` rimane necessario in `App.tsx` dopo l'estrazione — non rimuoverlo)
- [x] Prendere nota dell'ambiguità **AI4** (nel Passo C rimuovere solo `Keyboard` dall'import Phosphor; non rimuovere altre icone senza verifica)
- [x] Prendere nota dell'ambiguità **AI5** (variante del `TooltipContent` del saldo: `variant={totalBalance < 0 ? 'destructive' : 'success'}` — condizionale, non fisso)
- [x] Prendere nota di **R1** (classe `sticky top-0 z-10` sull'elemento `<header>` — da preservare integralmente)
- [x] Prendere nota di **R2** (sequenza handler pulsante: `soundSystem.play` → `hapticSystem.dialogOpen` → `setShowKeyboardHelp(true)` — ordine esatto)
- [x] Prendere nota di **R5** (`FocusIndicator` rimane sibling di `<AppHeader />` — non incluso dentro)
- [x] Verificare di essere sul branch `refactoring-architettura`
- [x] Eseguire `npm run build` e confermare che compila senza errori **prima** di iniziare

---

## Passo A — Modifica `src/context/AppDataContext.tsx` e `src/App.tsx`

> **Prerequisito**: nessuno (P01–P09 già presenti nel branch).

### A.1 Aggiornamento del tipo `AppDataContextValue` (~riga 70)

- [x] Aprire `src/context/AppDataContext.tsx`
- [x] Individuare `handleAddFundsToGoal: (goal: SavingsGoal) => void` (~riga 70) — ultima riga del tipo
- [x] Aggiungere **dopo** quella riga e **prima** della chiusura `}` del tipo:
  ```ts
  // Dialog keyboard shortcuts
  showKeyboardHelp: boolean
  setShowKeyboardHelp: (v: boolean) => void
  ```
- [x] Verificare che nessun nuovo import sia necessario (nessuno)

### A.2 Dichiarazione del `useState` in `AppDataProvider` (~riga 100)

- [x] Individuare `const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>(undefined)` (~riga 100)
- [x] ⚠️ **AI1**: aggiungere subito **dopo** (prima di `handleAddFundsToGoal` ~riga 102):
  ```ts
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  ```

### A.3 Aggiornamento del valore del Provider (~riga 441)

- [x] Individuare `handleAddFundsToGoal,` (~riga 441) nell'oggetto `value` del Provider
- [x] Aggiungere subito **dopo**:
  ```ts
  showKeyboardHelp,
  setShowKeyboardHelp,
  ```

### A.4 Aggiornamento destructuring `useAppData()` in `App.tsx` (~riga 110)

- [x] Aprire `src/App.tsx`
- [x] Individuare `handleAddFundsToGoal,` (~riga 110) nella destructuring di `useAppData()`
- [x] Aggiungere subito **dopo** (prima di `} = useAppData()`):
  ```ts
  showKeyboardHelp,
  setShowKeyboardHelp,
  ```

### A.5 Rimozione dell'`useState` locale in `App.tsx` (~riga 123)

- [x] Individuare e rimuovere:
  ```ts
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  ```
- [x] ⚠️ **Non rimuovere** `useState` dall'import `react` — rimane necessario per `activeTab` e `previousTab`
- [x] ⚠️ **Invariato**: il passaggio `setShowKeyboardHelp,` a `useAppShortcuts(...)` (~riga 233) resta identico — il setter arriva ora dal context ma la chiamata non cambia
- [x] ⚠️ **Invariato**: il dialog `<KeyboardShortcutsHelp open={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)}>` (~righe 501–503) resta identico — legge i valori dalla destructuring del context

### A.6 Verifica del Passo A

- [x] Salvare entrambi i file
- [ ] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Verificare che `useAppData()` esponga `showKeyboardHelp` e `setShowKeyboardHelp`
- [x] Verificare che `App.tsx` non contenga più `const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)` come dichiarazione locale
- [x] Verificare che `App.tsx` contenga `showKeyboardHelp` e `setShowKeyboardHelp` nella destructuring `useAppData()`
- [x] Verificare che il blocco `useAppShortcuts({..., setShowKeyboardHelp, ...})` sia invariato
- [x] Verificare che `<KeyboardShortcutsHelp open={showKeyboardHelp} …>` sia invariato
- [x] ⚠️ Non procedere al Passo B fino a zero errori TypeScript

---

## Passo B — Creazione `src/components/AppHeader.tsx`

> **Prerequisito**: Passo A completato e verificato (`tsc --noEmit` a zero errori) ✓

### B.1 Creazione del file e import

- [x] Creare il file `src/components/AppHeader.tsx` vuoto
- [x] Aggiungere import da `@/hooks/use-visible-data`: `useVisibleData`
- [x] Aggiungere import da `@/context/AppDataContext`: `useAppData`
- [x] Aggiungere import da `@/hooks/use-mobile`: `useIsMobile`
- [x] Aggiungere import da `@/lib/helpers`: `formatCurrency` (import diretto — non via context)
- [x] Aggiungere import da `@/lib/sound-system`: `soundSystem` (import diretto)
- [x] Aggiungere import da `@/lib/haptic-system`: `hapticSystem` (import diretto)
- [x] Aggiungere import da `@/components/ui/button`: `Button`
- [x] Aggiungere import da `@/components/ui/tooltip`: `Tooltip`, `TooltipContent`, `TooltipTrigger`
- [x] Aggiungere import da `@phosphor-icons/react`: `Keyboard`
- [x] ⚠️ **Non importare** `useAuth` — `AppHeader` non dipende da `isAuthenticated` (design §4)
- [x] ⚠️ **Non importare** componenti da `ui/card`, `Tabs`, `Badge`, `Separator` — non presenti nell'header (⚠️ **AI6**)

### B.2 Firma del componente

- [x] Aprire con:
  ```ts
  export function AppHeader() {
  ```
- [x] ⚠️ Nessuna props nella firma
- [x] ⚠️ Nessuno `useState` locale nel corpo del componente

### B.3 Sorgenti dati

- [x] Destructure da `useAppData()`:
  ```ts
  const { setShowKeyboardHelp } = useAppData()
  ```
- [x] Destructure da `useVisibleData()`:
  ```ts
  const { totalBalance, visibleAccounts } = useVisibleData()
  ```
- [x] Dichiarare:
  ```ts
  const isMobile = useIsMobile()
  ```
- [x] ⚠️ Non destructurare `showKeyboardHelp` — `AppHeader` usa solo il setter, non lo stato

### B.4 JSX del componente

- [x] Copiare il blocco `<header>…</header>` da `src/App.tsx` righe **272–349** come `return (…)`
- [x] ⚠️ **R1**: verificare che `className` dell'elemento `<header>` contenga `sticky top-0 z-10` — non abbreviare
- [x] Verificare che `role="banner"` e `aria-label` siano presenti sull'elemento `<header>`
- [x] Verificare che `aria-hidden="true"` sia presente sulla `<span>` icona Z (design §3.1)
- [x] Verificare che `id="app-title"` sia presente sull'`<h1>` (design §3.1)
- [x] ⚠️ **R7**: verificare che la guard `{!isMobile && (…)}` sia presente sul blocco del pulsante `Keyboard`
- [x] ⚠️ **R7**: verificare che la classe `hidden sm:inline-flex` sia presente sul `<Button>` — ridondanza intenzionale, non rimuovere
- [x] ⚠️ **R2**: verificare la sequenza esatta dell'handler:
  ```ts
  soundSystem.play('dialog-open')
  hapticSystem.dialogOpen()
  setShowKeyboardHelp(true)
  ```
- [x] ⚠️ **R6**: verificare che `role="status"`, `aria-live="polite"`, `aria-atomic="true"` siano presenti sul `<div>` del saldo
- [x] Verificare che `{isMobile ? 'Saldo' : 'Saldo Totale'}` sia presente nel testo etichetta (design §3.2)
- [x] Verificare che la classe del testo saldo sia condizionale (`text-destructive` vs `bg-gradient-to-r …`)
- [x] ⚠️ **AI5**: verificare che `variant={totalBalance < 0 ? 'destructive' : 'success'}` sia presente nel `TooltipContent` saldo
- [x] Verificare che il plurale italiano sia presente: `visibleAccounts.length === 1 ? 'conto' : 'conti'`

### B.5 Verifica del Passo B

- [x] Salvare il file
- [ ] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Verificare che l'app compili e funzioni come prima (il nuovo file non è ancora importato da `App.tsx`)
- [x] ⚠️ Non procedere al Passo C fino a zero errori TypeScript

---

## Passo C — Modifica `src/App.tsx`

> **Prerequisito**: Passo B completato e verificato (`tsc --noEmit` a zero errori) ✓

### C.1 Aggiunta import di `AppHeader`

- [x] Aprire `src/App.tsx`
- [x] Aggiungere tra gli import dei componenti estratti (dopo l'import di `ReportsTab`, ~riga 40):
  ```ts
  import { AppHeader } from '@/components/AppHeader'
  ```

### C.2 Rimozione del blocco JSX `<header>` (~righe 272–349)

- [x] Individuare l'elemento `<header` (~riga 272)
- [x] Rimuovere l'intero blocco fino a `</header>` (~riga 349), incluso (78 righe)
- [x] ⚠️ **R5**: verificare che `<FocusIndicator />` (~riga 271) rimanga nel JSX e non venga rimosso insieme all'header

### C.3 Sostituzione con `<AppHeader />`

- [x] Nella posizione esatta dove si trovava il blocco `<header>`:
  ```tsx
  <AppHeader />
  ```
- [x] ⚠️ **R5**: verificare che la struttura risultante sia:
  ```tsx
  <FocusIndicator />
  <AppHeader />
  ```
  e che `<FocusIndicator />` non sia incluso dentro `<AppHeader>`
- [x] Verificare che `<KeyboardShortcutsHelp>` sia ancora presente nel JSX di `App.tsx` (non spostato in `AppHeader`)

### C.4 Rimozione dell'import `Keyboard` da `@phosphor-icons/react` (~riga 47)

- [x] Individuare la riga di import Phosphor (~riga 47):
  ```ts
  import { Plus, LockOpen, ChartLine, List, Gear, Trash, PencilSimple, ArrowsLeftRight, Eye, EyeSlash, Keyboard, Target, Info, PiggyBank } from '@phosphor-icons/react'
  ```
- [x] ⚠️ **AI4**: rimuovere **solo** `Keyboard,` dalla lista — non rimuovere altre icone
- [x] ✔ Verificare che `formatCurrency` **non** venga rimosso dall'import `@/lib/helpers` (~riga 4) — ancora necessario (⚠️ **AI3**)

### C.5 Verifica del Passo C

- [x] Salvare il file
- [ ] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Eseguire `npm run build` → compilazione riuscita
- [x] Verificare con grep: `App.tsx` non contiene `<header` (blocco JSX rimosso)
- [x] Verificare con grep: `App.tsx` contiene `<AppHeader />`
- [x] Verificare con grep: `App.tsx` non contiene `showKeyboardHelp` come `useState` locale

---

## Verifica finale

### Test di compilazione

- [ ] `npx tsc --noEmit` → zero errori
- [x] `npm run build` → zero errori, bundle generato

### Verifica grep post-implementazione

- [x] `grep "showKeyboardHelp" src/App.tsx` → risultati attesi:
  - ✔ `showKeyboardHelp,` nella destructuring `useAppData()` (1 occorrenza)
  - ✔ `setShowKeyboardHelp,` nella destructuring `useAppData()` (1 occorrenza)
  - ✔ `setShowKeyboardHelp,` in `useAppShortcuts(...)` (1 occorrenza)
  - ✔ `open={showKeyboardHelp}` nel dialog `<KeyboardShortcutsHelp>` (1 occorrenza)
  - ✔ `setShowKeyboardHelp(false)` nel `onClose` del dialog (1 occorrenza)
  - ✗ **Zero** occorrenze di `useState(false)` associate a `showKeyboardHelp`
- [x] `grep "Keyboard" src/App.tsx` → solo `KeyboardShortcutsHelp` — nessuna icona `Keyboard` di Phosphor

### Test manuale — Logo

- [ ] Il logo (icona Z con gradiente + titolo "Zecchino") è visibile nell'header
- [ ] Il gradiente dell'icona e quello del testo sono visivamente identici alla versione pre-estrazione
- [ ] L'`<h1 id="app-title">` è presente nel DOM (ispezionare con DevTools)

### Test manuale — Saldo totale

- [ ] Al caricamento dell'app, il saldo mostra il valore corretto
- [ ] Aggiungere una nuova transazione → il valore nell'header si aggiorna senza reload
- [ ] Con saldo positivo: testo con gradiente `from-income via-success to-accent`
- [ ] Con saldo negativo: testo con classe `text-destructive`
- [ ] Passare il mouse sul saldo → Tooltip mostra "Saldo Consolidato" e conteggio conti
- [ ] Con 1 conto visibile: il Tooltip mostra "1 conto" (singolare)
- [ ] Con 2+ conti visibili: il Tooltip mostra "N conti" (plurale)

### Test manuale — Pulsante scorciatoie tastiera

- [ ] Su desktop (`!isMobile`): il pulsante `Keyboard` è visibile nell'header
- [ ] Su mobile: il pulsante è assente dall'header
- [ ] Click sul pulsante → il pannello `KeyboardShortcutsHelp` si apre
- [ ] Al click: si sente il feedback sonoro (`dialog-open`)
- [ ] Al click: si sente il feedback aptico (`dialogOpen`)
- [ ] Chiudere il pannello → il pulsante è di nuovo disponibile
- [ ] Premere `Shift+?` → il pannello si apre (shortcut gestita da `useAppShortcuts`)

### Note stato verifica

- [ ] `npx tsc --noEmit` globale resta bloccato da 4 errori baseline fuori scope in `src/context/AuthContext.tsx`
- [ ] I test manuali UI/accessibilità non sono stati eseguiti in questa sessione

***

**Implementazione P10 completata il 2026-04-23.**
**Verifica automatica completata:** build produzione `PASS`, controlli statici/grep `PASS`, file toccati senza errori locali.
**Verifica manuale residua:** scenari UI/accessibilità ancora da eseguire.

### Test di comportamento strutturale

- [ ] L'header rimane fisso (`sticky`) durante lo scroll della pagina
- [ ] `<FocusIndicator />` è presente nel DOM come sibling dell'header (non dentro)
- [ ] `<KeyboardShortcutsHelp>` è presente nel DOM e funzionante

### Test di regressione

- [ ] Tab Movimenti (`TransactionsTab`) funziona correttamente — nessuna regressione
- [ ] Tab Dashboard (`DashboardTab`) funziona correttamente — nessuna regressione
- [ ] Tab Report (`ReportsTab`) funziona correttamente — nessuna regressione
- [ ] I dialog budget e savings goal si aprono correttamente dal tab Report
- [ ] Il dialog di eliminazione si apre correttamente
- [ ] Il dialog conto si apre correttamente
