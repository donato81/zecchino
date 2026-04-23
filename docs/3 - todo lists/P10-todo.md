# P10 — Todo List: Estrazione `AppHeader`

> Checklist operativa sequenziale per il Pacchetto 10.  
> Coding Plan di riferimento: `docs/2 - coding plans/P10-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P10-AppHeader-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [ ] Leggere `docs/2 - coding plans/P10-coding-plan.md` per intero
- [ ] Prendere nota dell'ambiguità **AI1** (posizione del nuovo `useState` in `AppDataProvider`: dopo `editingSavingsGoal` ~riga 100, prima di `handleAddFundsToGoal` ~riga 102)
- [ ] Prendere nota dell'ambiguità **AI2** (i `useMemo` locali `visibleAccounts` e `totalBalance` in `App.tsx` rimangono — usati nel `useEffect` screen reader; non vanno rimossi in questo passo)
- [ ] Prendere nota dell'ambiguità **AI3** (`formatCurrency` rimane necessario in `App.tsx` dopo l'estrazione — non rimuoverlo)
- [ ] Prendere nota dell'ambiguità **AI4** (nel Passo C rimuovere solo `Keyboard` dall'import Phosphor; non rimuovere altre icone senza verifica)
- [ ] Prendere nota dell'ambiguità **AI5** (variante del `TooltipContent` del saldo: `variant={totalBalance < 0 ? 'destructive' : 'success'}` — condizionale, non fisso)
- [ ] Prendere nota di **R1** (classe `sticky top-0 z-10` sull'elemento `<header>` — da preservare integralmente)
- [ ] Prendere nota di **R2** (sequenza handler pulsante: `soundSystem.play` → `hapticSystem.dialogOpen` → `setShowKeyboardHelp(true)` — ordine esatto)
- [ ] Prendere nota di **R5** (`FocusIndicator` rimane sibling di `<AppHeader />` — non incluso dentro)
- [ ] Verificare di essere sul branch `refactoring-architettura`
- [ ] Eseguire `npm run build` e confermare che compila senza errori **prima** di iniziare

---

## Passo A — Modifica `src/context/AppDataContext.tsx` e `src/App.tsx`

> **Prerequisito**: nessuno (P01–P09 già presenti nel branch).

### A.1 Aggiornamento del tipo `AppDataContextValue` (~riga 70)

- [ ] Aprire `src/context/AppDataContext.tsx`
- [ ] Individuare `handleAddFundsToGoal: (goal: SavingsGoal) => void` (~riga 70) — ultima riga del tipo
- [ ] Aggiungere **dopo** quella riga e **prima** della chiusura `}` del tipo:
  ```ts
  // Dialog keyboard shortcuts
  showKeyboardHelp: boolean
  setShowKeyboardHelp: (v: boolean) => void
  ```
- [ ] Verificare che nessun nuovo import sia necessario (nessuno)

### A.2 Dichiarazione del `useState` in `AppDataProvider` (~riga 100)

- [ ] Individuare `const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>(undefined)` (~riga 100)
- [ ] ⚠️ **AI1**: aggiungere subito **dopo** (prima di `handleAddFundsToGoal` ~riga 102):
  ```ts
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  ```

### A.3 Aggiornamento del valore del Provider (~riga 441)

- [ ] Individuare `handleAddFundsToGoal,` (~riga 441) nell'oggetto `value` del Provider
- [ ] Aggiungere subito **dopo**:
  ```ts
  showKeyboardHelp,
  setShowKeyboardHelp,
  ```

### A.4 Aggiornamento destructuring `useAppData()` in `App.tsx` (~riga 110)

- [ ] Aprire `src/App.tsx`
- [ ] Individuare `handleAddFundsToGoal,` (~riga 110) nella destructuring di `useAppData()`
- [ ] Aggiungere subito **dopo** (prima di `} = useAppData()`):
  ```ts
  showKeyboardHelp,
  setShowKeyboardHelp,
  ```

### A.5 Rimozione dell'`useState` locale in `App.tsx` (~riga 123)

- [ ] Individuare e rimuovere:
  ```ts
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  ```
- [ ] ⚠️ **Non rimuovere** `useState` dall'import `react` — rimane necessario per `activeTab` e `previousTab`
- [ ] ⚠️ **Invariato**: il passaggio `setShowKeyboardHelp,` a `useAppShortcuts(...)` (~riga 233) resta identico — il setter arriva ora dal context ma la chiamata non cambia
- [ ] ⚠️ **Invariato**: il dialog `<KeyboardShortcutsHelp open={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)}>` (~righe 501–503) resta identico — legge i valori dalla destructuring del context

### A.6 Verifica del Passo A

- [ ] Salvare entrambi i file
- [ ] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [ ] Verificare che `useAppData()` esponga `showKeyboardHelp` e `setShowKeyboardHelp`
- [ ] Verificare che `App.tsx` non contenga più `const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)` come dichiarazione locale
- [ ] Verificare che `App.tsx` contenga `showKeyboardHelp` e `setShowKeyboardHelp` nella destructuring `useAppData()`
- [ ] Verificare che il blocco `useAppShortcuts({..., setShowKeyboardHelp, ...})` sia invariato
- [ ] Verificare che `<KeyboardShortcutsHelp open={showKeyboardHelp} …>` sia invariato
- [ ] ⚠️ Non procedere al Passo B fino a zero errori TypeScript

---

## Passo B — Creazione `src/components/AppHeader.tsx`

> **Prerequisito**: Passo A completato e verificato (`tsc --noEmit` a zero errori) ✓

### B.1 Creazione del file e import

- [ ] Creare il file `src/components/AppHeader.tsx` vuoto
- [ ] Aggiungere import da `@/hooks/use-visible-data`: `useVisibleData`
- [ ] Aggiungere import da `@/context/AppDataContext`: `useAppData`
- [ ] Aggiungere import da `@/hooks/use-mobile`: `useIsMobile`
- [ ] Aggiungere import da `@/lib/helpers`: `formatCurrency` (import diretto — non via context)
- [ ] Aggiungere import da `@/lib/sound-system`: `soundSystem` (import diretto)
- [ ] Aggiungere import da `@/lib/haptic-system`: `hapticSystem` (import diretto)
- [ ] Aggiungere import da `@/components/ui/button`: `Button`
- [ ] Aggiungere import da `@/components/ui/tooltip`: `Tooltip`, `TooltipContent`, `TooltipTrigger`
- [ ] Aggiungere import da `@phosphor-icons/react`: `Keyboard`
- [ ] ⚠️ **Non importare** `useAuth` — `AppHeader` non dipende da `isAuthenticated` (design §4)
- [ ] ⚠️ **Non importare** componenti da `ui/card`, `Tabs`, `Badge`, `Separator` — non presenti nell'header (⚠️ **AI6**)

### B.2 Firma del componente

- [ ] Aprire con:
  ```ts
  export function AppHeader() {
  ```
- [ ] ⚠️ Nessuna props nella firma
- [ ] ⚠️ Nessuno `useState` locale nel corpo del componente

### B.3 Sorgenti dati

- [ ] Destructure da `useAppData()`:
  ```ts
  const { setShowKeyboardHelp } = useAppData()
  ```
- [ ] Destructure da `useVisibleData()`:
  ```ts
  const { totalBalance, visibleAccounts } = useVisibleData()
  ```
- [ ] Dichiarare:
  ```ts
  const isMobile = useIsMobile()
  ```
- [ ] ⚠️ Non destructurare `showKeyboardHelp` — `AppHeader` usa solo il setter, non lo stato

### B.4 JSX del componente

- [ ] Copiare il blocco `<header>…</header>` da `src/App.tsx` righe **272–349** come `return (…)`
- [ ] ⚠️ **R1**: verificare che `className` dell'elemento `<header>` contenga `sticky top-0 z-10` — non abbreviare
- [ ] Verificare che `role="banner"` e `aria-label` siano presenti sull'elemento `<header>`
- [ ] Verificare che `aria-hidden="true"` sia presente sulla `<span>` icona Z (design §3.1)
- [ ] Verificare che `id="app-title"` sia presente sull'`<h1>` (design §3.1)
- [ ] ⚠️ **R7**: verificare che la guard `{!isMobile && (…)}` sia presente sul blocco del pulsante `Keyboard`
- [ ] ⚠️ **R7**: verificare che la classe `hidden sm:inline-flex` sia presente sul `<Button>` — ridondanza intenzionale, non rimuovere
- [ ] ⚠️ **R2**: verificare la sequenza esatta dell'handler:
  ```ts
  soundSystem.play('dialog-open')
  hapticSystem.dialogOpen()
  setShowKeyboardHelp(true)
  ```
- [ ] ⚠️ **R6**: verificare che `role="status"`, `aria-live="polite"`, `aria-atomic="true"` siano presenti sul `<div>` del saldo
- [ ] Verificare che `{isMobile ? 'Saldo' : 'Saldo Totale'}` sia presente nel testo etichetta (design §3.2)
- [ ] Verificare che la classe del testo saldo sia condizionale (`text-destructive` vs `bg-gradient-to-r …`)
- [ ] ⚠️ **AI5**: verificare che `variant={totalBalance < 0 ? 'destructive' : 'success'}` sia presente nel `TooltipContent` saldo
- [ ] Verificare che il plurale italiano sia presente: `visibleAccounts.length === 1 ? 'conto' : 'conti'`

### B.5 Verifica del Passo B

- [ ] Salvare il file
- [ ] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [ ] Verificare che l'app compili e funzioni come prima (il nuovo file non è ancora importato da `App.tsx`)
- [ ] ⚠️ Non procedere al Passo C fino a zero errori TypeScript

---

## Passo C — Modifica `src/App.tsx`

> **Prerequisito**: Passo B completato e verificato (`tsc --noEmit` a zero errori) ✓

### C.1 Aggiunta import di `AppHeader`

- [ ] Aprire `src/App.tsx`
- [ ] Aggiungere tra gli import dei componenti estratti (dopo l'import di `ReportsTab`, ~riga 40):
  ```ts
  import { AppHeader } from '@/components/AppHeader'
  ```

### C.2 Rimozione del blocco JSX `<header>` (~righe 272–349)

- [ ] Individuare l'elemento `<header` (~riga 272)
- [ ] Rimuovere l'intero blocco fino a `</header>` (~riga 349), incluso (78 righe)
- [ ] ⚠️ **R5**: verificare che `<FocusIndicator />` (~riga 271) rimanga nel JSX e non venga rimosso insieme all'header

### C.3 Sostituzione con `<AppHeader />`

- [ ] Nella posizione esatta dove si trovava il blocco `<header>`:
  ```tsx
  <AppHeader />
  ```
- [ ] ⚠️ **R5**: verificare che la struttura risultante sia:
  ```tsx
  <FocusIndicator />
  <AppHeader />
  ```
  e che `<FocusIndicator />` non sia incluso dentro `<AppHeader>`
- [ ] Verificare che `<KeyboardShortcutsHelp>` sia ancora presente nel JSX di `App.tsx` (non spostato in `AppHeader`)

### C.4 Rimozione dell'import `Keyboard` da `@phosphor-icons/react` (~riga 47)

- [ ] Individuare la riga di import Phosphor (~riga 47):
  ```ts
  import { Plus, LockOpen, ChartLine, List, Gear, Trash, PencilSimple, ArrowsLeftRight, Eye, EyeSlash, Keyboard, Target, Info, PiggyBank } from '@phosphor-icons/react'
  ```
- [ ] ⚠️ **AI4**: rimuovere **solo** `Keyboard,` dalla lista — non rimuovere altre icone
- [ ] ✔ Verificare che `formatCurrency` **non** venga rimosso dall'import `@/lib/helpers` (~riga 4) — ancora necessario (⚠️ **AI3**)

### C.5 Verifica del Passo C

- [ ] Salvare il file
- [ ] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [ ] Eseguire `npm run build` → compilazione riuscita
- [ ] Verificare con grep: `App.tsx` non contiene `<header` (blocco JSX rimosso)
- [ ] Verificare con grep: `App.tsx` contiene `<AppHeader />`
- [ ] Verificare con grep: `App.tsx` non contiene `showKeyboardHelp` come `useState` locale

---

## Verifica finale

### Test di compilazione

- [ ] `npx tsc --noEmit` → zero errori
- [ ] `npm run build` → zero errori, bundle generato

### Verifica grep post-implementazione

- [ ] `grep "showKeyboardHelp" src/App.tsx` → risultati attesi:
  - ✔ `showKeyboardHelp,` nella destructuring `useAppData()` (1 occorrenza)
  - ✔ `setShowKeyboardHelp,` nella destructuring `useAppData()` (1 occorrenza)
  - ✔ `setShowKeyboardHelp,` in `useAppShortcuts(...)` (1 occorrenza)
  - ✔ `open={showKeyboardHelp}` nel dialog `<KeyboardShortcutsHelp>` (1 occorrenza)
  - ✔ `setShowKeyboardHelp(false)` nel `onClose` del dialog (1 occorrenza)
  - ✗ **Zero** occorrenze di `useState(false)` associate a `showKeyboardHelp`
- [ ] `grep "Keyboard" src/App.tsx` → solo `KeyboardShortcutsHelp` — nessuna icona `Keyboard` di Phosphor

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
