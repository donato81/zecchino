# P10 — Coding Plan: Estrazione `AppHeader`

> Documento operativo. Nessun file di codice sorgente viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 10 — Creazione di `src/components/AppHeader.tsx`  
> Design di riferimento: `docs/1 - projects/P10-AppHeader-design.md`  
> Data: 23 aprile 2026

---

## Note preliminari

- I numeri di riga indicati sono **approssimativi** (±5 righe) e vanno verificati nell'editor prima di ogni modifica. Sono stati ricavati dal codice reale post-P09 sul branch `refactoring-architettura`.
- Questo pacchetto si implementa in **tre passi distinti e sequenziali**: prima la modifica di `AppDataContext` e `App.tsx` per spostare lo stato `showKeyboardHelp`, poi la creazione del componente, infine la sostituzione del JSX in `App.tsx`. Ogni passo va verificato con `npx tsc --noEmit` prima di procedere al successivo.
- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P09.
- P10 è il passo più semplice della serie: un solo `useState` da spostare nel context, nessun `useMemo` da creare, nessuna ottimizzazione di performance, nessun handler di business da spostare.
- File non toccati in questo passo:

  | File | Motivo |
  |---|---|
  | `src/components/TransactionsTab.tsx` | Già estratto nel Passo 7; invariato |
  | `src/components/DashboardTab.tsx` | Già estratto nel Passo 8; invariato |
  | `src/components/ReportsTab.tsx` | Già estratto nel Passo 9; invariato |
  | `src/context/AuthContext.tsx` | `AppHeader` non usa `isAuthenticated`; invariato |
  | `src/hooks/use-visible-data.ts` | Già espone `totalBalance` e `visibleAccounts`; nessuna modifica necessaria |
  | `src/hooks/use-app-shortcuts.ts` | Shortcut globali invariate; `setShowKeyboardHelp` arriva dal context ma la firma dell'hook non cambia |
  | `src/components/KeyboardShortcutsHelp.tsx` | Rimane in `App.tsx`; invariato |
  | `src/components/FocusIndicator.tsx` | Rimane sibling di `AppHeader` nel JSX di `App.tsx`; invariato |
  | `src/lib/` | Tutti i file già stabili |
  | `docs/`, `.github/` | Invariati |

---

## Ambiguità rilevate

### AI1 — Posizione del nuovo `useState` nel corpo di `AppDataProvider`

**Situazione**: `AppDataProvider` ha già i 4 `useState` budget/savings aggiunti nel Passo 9 (righe 97–100). Il design specifica di aggiungere `showKeyboardHelp` dopo di essi.

**Decisione**: aggiungere `const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)` subito **dopo** la riga 100 (`editingSavingsGoal`) e **prima** della riga 102 (`handleAddFundsToGoal`). Questo rispetta il raggruppamento semantico: tutti gli `useState` di tipo dialog sono contigui.

### AI2 — `visibleAccounts` e `totalBalance` in `App.tsx` dopo l'estrazione

**Situazione**: `App.tsx` calcola localmente `visibleAccounts` (~riga 134) e `totalBalance` (~riga 151) tramite `useMemo`. Dopo l'estrazione, `AppHeader` userà `useVisibleData()` per gli stessi valori. Le due versioni coesistono senza conflitto.

**Decisione**: non rimuovere i `useMemo` locali di `App.tsx` in questo passo. `totalBalance` e `visibleAccounts` sono ancora usati nel `useEffect` di screen reader (~righe 158–185). La pulizia di `App.tsx` avverrà in passi successivi.

### AI3 — `formatCurrency` in `App.tsx` rimane necessario dopo l'estrazione

**Situazione**: `formatCurrency` è usato nell'header (righe 323 e 333, che vengono estratte) ma anche nel `useEffect` di screen reader (riga 172, 180) e nel toast del conto privato (riga 428). Questi usi rimangono in `App.tsx`.

**Decisione**: **non rimuovere** `formatCurrency` dall'import di `App.tsx` (riga 4). TypeScript non segnalerà errori; il controllo va fatto manualmente — ma la risposta è che `formatCurrency` resta necessario.

### AI4 — `Keyboard` da `@phosphor-icons/react` diventa inutilizzato dopo il Passo C

**Situazione**: `Keyboard` (riga 47 di `App.tsx`) è usato **solo** nell'header (riga 305). Dopo la rimozione del blocco JSX nel Passo C, diventa import inutilizzato.

**Decisione**: nel Passo C, rimuovere `Keyboard` dall'import Phosphor a riga 47. Le altre icone nella stessa riga (`Plus`, `LockOpen`, `ChartLine`, `List`, ecc.) rimangono necessarie per il codice residuo in `App.tsx`. Non rimuovere icone non verificate.

### AI5 — Variante del `TooltipContent` del saldo

**Situazione**: il design §3.2 documenta che la variante del `TooltipContent` è condizionale (`success` o `destructive`). Verifica sul JSX originale (riga 337 di `App.tsx`):

```tsx
<TooltipContent variant={totalBalance < 0 ? 'destructive' : 'success'}>
```

**Decisione**: preservare esattamente questa logica condizionale nel componente `AppHeader`. Non semplificare a variante fissa.

### AI6 — Nessun `Separator`, `Badge` o altri componenti UI nell'header

**Situazione**: il blocco `<header>…</header>` (righe 272–349 di `App.tsx`) è stato ispezionato. Contiene solo `Tooltip`, `TooltipContent`, `TooltipTrigger`, `Button` e l'icona `Keyboard`. Nessun altro componente UI esterno.

**Decisione**: importare solo i componenti documentati nel design §4. Nessun import speculativo.

---

## Rischi

### R1 — Classe `sticky top-0 z-10` da preservare — 🔴 Alto

Se la classe `sticky top-0 z-10` viene persa o modificata nell'elemento `<header>` durante la copia, l'header non sarà più sticky durante lo scroll.

**Mitigazione**: copiare il valore completo dell'attributo `className` dell'elemento `<header>` senza abbreviazioni. Verificare visualmente dopo il Passo C che l'header rimanga fisso durante lo scroll.

### R2 — Sequenza handler del pulsante scorciatoie — 🔴 Alto

L'handler del pulsante deve eseguire `soundSystem.play` e `hapticSystem.dialogOpen` **prima** di `setShowKeyboardHelp(true)`. Invertire l'ordine o omettere uno step è un bug silente.

**Mitigazione**: copiare l'handler esattamente dal JSX originale (righe 297–301 di `App.tsx`). Non riscrivere dall'interpretazione.

### R3 — `AppHeader` non deve ricevere props né avere `useState` — 🔴 Alto

Aggiungere props o stato locale al componente viola il pattern architetturale della serie e crea dipendenze non documentate.

**Mitigazione**: firma: `export function AppHeader()` senza parametri. Zero `useState` nel corpo.

### R4 — `AppHeader` non deve dipendere da `useAuth()` — 🟡 Medio

Il componente è renderizzato solo nel ramo autenticato di `App.tsx`. Non deve verificare `isAuthenticated` internamente; aggiungere questa dipendenza sarebbe ridondante e creerebbe un coupling non necessario.

**Mitigazione**: non importare `useAuth` in `AppHeader.tsx`. Nessuna chiamata a `isAuthenticated` nel componente.

### R5 — `FocusIndicator` rimane sibling — 🟡 Medio

`FocusIndicator` (riga 271 di `App.tsx`) deve restare un sibling diretto di `<AppHeader />` nel JSX di `App.tsx`. Includerlo dentro `AppHeader` cambierebbe il DOM e potrebbe alterare il comportamento del focus trap.

**Mitigazione**: dopo il Passo C, verificare che nel JSX di `App.tsx` la struttura sia:
```tsx
<FocusIndicator />
<AppHeader />
```
e non `<AppHeader>` contenente `<FocusIndicator>`.

### R6 — `role="status"` e `aria-live="polite"` da preservare — 🟡 Medio

Il `<div>` del saldo ha attributi di accessibilità obbligatori (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`). Se persi, gli screen reader non annunciano più gli aggiornamenti del saldo in tempo reale.

**Mitigazione**: copiare esattamente il blocco del `TooltipTrigger` del saldo dal JSX originale senza omettere attributi ARIA.

### R7 — Guard `!isMobile` e classe `hidden sm:inline-flex` entrambe da preservare — 🟢 Basso

La ridondanza tra la guard `{!isMobile && (…)}` e la classe `hidden sm:inline-flex` è intenzionale (design §3.3). Rimuovere uno dei due sarebbe un cambiamento di comportamento.

**Mitigazione**: preservare entrambi. Non "ottimizzare" la ridondanza.

### R8 — Nessuna regressione nei tab già estratti — 🟢 Basso

Il Passo 10 non tocca `TransactionsTab.tsx`, `DashboardTab.tsx`, `ReportsTab.tsx`. Le modifiche ad `AppDataContext` (aggiunta `showKeyboardHelp`) non alterano i valori già esposti.

**Mitigazione**: smoke test sui tre tab al termine del Passo C.

---

## Passo A — Modifica `src/context/AppDataContext.tsx` e `src/App.tsx`

### Rischio: 🟡 Medio
### Prerequisito: P01–P09 completati; branch `refactoring-architettura`

### A.1 Aggiornamento di `AppDataContextValue` (~riga 70)

Aggiungere **dopo** `handleAddFundsToGoal: (goal: SavingsGoal) => void` (~riga 70) e **prima** della chiusura `}` del tipo (~riga 72):

```ts
  // Dialog keyboard shortcuts
  showKeyboardHelp: boolean
  setShowKeyboardHelp: (v: boolean) => void
```

> ✔ Nessun nuovo import necessario in `AppDataContext.tsx` — `boolean` è primitivo TypeScript.

### A.2 Dichiarazione del `useState` in `AppDataProvider` (~riga 100)

Posizione: subito dopo `const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>(undefined)` (~riga 100), prima di `const handleAddFundsToGoal` (~riga 102):

```ts
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
```

> ✔ `useState` già importato in `AppDataContext.tsx` (riga 1). Nessuna modifica all'import.

### A.3 Aggiornamento del valore del Provider (~riga 441)

Aggiungere **dopo** `handleAddFundsToGoal,` (~riga 441) e **prima** della doppia chiusura `}}`:

```ts
        showKeyboardHelp,
        setShowKeyboardHelp,
```

### A.4 Aggiornamento destructuring `useAppData()` in `App.tsx` (~riga 110)

Aggiungere i nuovi campi dopo `handleAddFundsToGoal,` (~riga 110), prima di `} = useAppData()`:

```ts
    showKeyboardHelp,
    setShowKeyboardHelp,
```

### A.5 Rimozione dell'`useState` locale in `App.tsx` (~riga 123)

Rimuovere la riga:

```ts
const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
```

> ⚠️ Il `useState` importato da `react` in `App.tsx` (riga 1) rimane necessario per altri `useState` locali (`activeTab`, `previousTab`). Non rimuoverlo.

> ⚠️ Il passaggio `setShowKeyboardHelp` a `useAppShortcuts(...)` (~riga 233) rimane **invariato** — il setter arriva ora dal context ma la chiamata è identica.

> ⚠️ Il JSX `<KeyboardShortcutsHelp open={showKeyboardHelp} onClose={...}>` (~righe 501–503) rimane **invariato** — legge `showKeyboardHelp` dalla destructuring del context senza modifiche.

### Criterio di verifica — Passo A

- `npx tsc --noEmit` → zero errori TypeScript
- `useAppData()` espone `showKeyboardHelp` e `setShowKeyboardHelp`
- `App.tsx` non contiene più `const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)` come dichiarazione locale
- `App.tsx` contiene `showKeyboardHelp` e `setShowKeyboardHelp` nella destructuring `useAppData()` (~riga 110)
- Il blocco `useAppShortcuts({..., setShowKeyboardHelp, ...})` è invariato
- Il dialog `<KeyboardShortcutsHelp>` è invariato

---

## Passo B — Creazione `src/components/AppHeader.tsx`

### Rischio: 🔴 Alto (dipende dal Passo A completato)
### Prerequisito: Passo A verificato con `tsc --noEmit` a zero errori

### B.1 Import

```ts
import { useVisibleData } from '@/hooks/use-visible-data'
import { useAppData } from '@/context/AppDataContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatCurrency } from '@/lib/helpers'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Keyboard } from '@phosphor-icons/react'
```

> ✔ Import esatti: nessun import speculativo, nessun import da `useAuth` o da componenti `ui/card`, `Tabs`, `Badge`, `Separator`.

### B.2 Firma del componente

```ts
export function AppHeader() {
```

> ⚠️ Nessuna props: la firma non ha parametri né tipi.  
> ⚠️ Nessuno `useState` locale nel corpo del componente.

### B.3 Sorgenti dati

```ts
  const { setShowKeyboardHelp } = useAppData()
  const { totalBalance, visibleAccounts } = useVisibleData()
  const isMobile = useIsMobile()
```

> ✔ `useVisibleData()` già espone `totalBalance` e `visibleAccounts` (implementato nel Passo 5).  
> ✔ Non destructurare `showKeyboardHelp` da `useAppData()` — `AppHeader` non ha bisogno del valore corrente dello stato, solo del setter.

### B.4 JSX del componente

Copiare il blocco `<header>…</header>` da `src/App.tsx` righe **272–349** come `return (…)`.

Verifiche obbligatorie durante la copia:

| Attributo / logica | Riga originale in App.tsx | Note |
|---|---|---|
| `className="… sticky top-0 z-10 …"` sull'elemento `<header>` | 273 | ⚠️ **R1** — preservare completo |
| `role="banner"` e `aria-label` sull'elemento `<header>` | 274–275 | Preservare |
| `aria-hidden="true"` sulla `<span>` icona Z | 283 | Design §3.1 |
| `id="app-title"` sull'`<h1>` | 285 | Design §3.1 |
| Guard `{!isMobile && (…)}` sul pulsante `Keyboard` | 295 | ⚠️ **R7** |
| Classe `hidden sm:inline-flex` sul `<Button>` | 304 | ⚠️ **R7** — ridondanza intenzionale |
| Sequenza handler: `soundSystem → hapticSystem → setShowKeyboardHelp(true)` | 297–301 | ⚠️ **R2** |
| `role="status"`, `aria-live="polite"`, `aria-atomic="true"` sul `<div>` saldo | 319–322 | ⚠️ **R6** |
| `{isMobile ? 'Saldo' : 'Saldo Totale'}` nel testo etichetta | 325 | Design §3.2 |
| `totalBalance < 0 ? 'text-destructive …' : 'bg-gradient-to-r …'` | 330 | Design §3.2 |
| `visibleAccounts.length === 1 ? 'conto' : 'conti'` nel Tooltip | 341 | Design §3.2 — plurale italiano |
| `variant={totalBalance < 0 ? 'destructive' : 'success'}` nel `TooltipContent` | 337 | ⚠️ **AI5** — condizionale |

### Criterio di verifica — Passo B

- `npx tsc --noEmit` → zero errori TypeScript
- Il componente esiste come file ma `App.tsx` non è ancora stato modificato
- L'app compila e si comporta come prima (il nuovo file non è ancora importato)

---

## Passo C — Modifica `src/App.tsx`

### Rischio: 🟡 Medio (dipende dal Passo B completato)
### Prerequisito: Passo B verificato con `tsc --noEmit` a zero errori

### C.1 Aggiunta import

Aggiungere tra gli import dei componenti estratti (dopo `ReportsTab`, ~riga 40):

```ts
import { AppHeader } from '@/components/AppHeader'
```

### C.2 Rimozione del blocco JSX `<header>` (~righe 272–349)

Rimuovere l'intero blocco dalle righe 272 a 349 (78 righe):

```
<header
  className="border-b border-primary/30 bg-card/90 backdrop-blur-lg sticky top-0 z-10 shadow-lg shadow-primary/10"
  role="banner"
  …
</header>
```

### C.3 Sostituzione con `<AppHeader />`

Nella posizione esatta dove si trovava il blocco `<header>`:

```tsx
<AppHeader />
```

> ⚠️ Verificare che `<FocusIndicator />` (~riga 271) rimanga **immediatamente prima** di `<AppHeader />` nel JSX e non venga incluso dentro il componente.  
> ⚠️ Verificare che `<KeyboardShortcutsHelp>` rimanga nel JSX di `App.tsx` (non viene spostato in `AppHeader`).

### C.4 Rimozione dell'import `Keyboard` da `@phosphor-icons/react` (~riga 47)

Rimuovere `Keyboard` dall'elenco di import Phosphor. La riga attuale è:

```ts
import { Plus, LockOpen, ChartLine, List, Gear, Trash, PencilSimple, ArrowsLeftRight, Eye, EyeSlash, Keyboard, Target, Info, PiggyBank } from '@phosphor-icons/react'
```

Diventa (rimuovere solo `Keyboard,`):

```ts
import { Plus, LockOpen, ChartLine, List, Gear, Trash, PencilSimple, ArrowsLeftRight, Eye, EyeSlash, Target, Info, PiggyBank } from '@phosphor-icons/react'
```

> ✔ `formatCurrency` rimane necessario in `App.tsx` (usato nelle righe 172, 180, 428 — fuori dall'header estratto). Non rimuoverlo.  
> ✔ Le icone `Gear`, `Target`, `Info`, `PiggyBank` potrebbero essere già inutilizzate dopo P09, ma la loro pulizia non rientra nello scope di P10. Affidarsi a TypeScript se segnala errori.

### Criterio di verifica — Passo C

- `npx tsc --noEmit` → zero errori TypeScript
- `npm run build` → compilazione riuscita
- `App.tsx` non contiene il blocco `<header>…</header>` originale
- `App.tsx` contiene `<AppHeader />` nella posizione corretta
- `<FocusIndicator />` è sibling diretto di `<AppHeader />` nel DOM
- `<KeyboardShortcutsHelp>` è presente nel JSX di `App.tsx`
- L'import `Keyboard` è stato rimosso dalla riga 47 di `App.tsx`
- L'header è visivamente identico alla versione pre-estrazione
- L'header rimane sticky durante lo scroll

---

## Schema riepilogativo

| Passo | File | Operazione | Verifica |
|---|---|---|---|
| A | `AppDataContext.tsx` | +2 campi tipo; +1 `useState`; +2 voci nel value | `tsc --noEmit` |
| A | `App.tsx` | +2 voci destructuring; -1 `useState` locale | `tsc --noEmit` |
| B | `AppHeader.tsx` | Nuovo componente (header JSX copiato) | `tsc --noEmit` |
| C | `App.tsx` | +import `AppHeader`; -78 righe JSX; +`<AppHeader />`; -`Keyboard` import | `tsc --noEmit` + `npm run build` |

**Dimensione `App.tsx` attesa dopo P10**: da 522 righe a circa **445 righe** (−77 righe nette contando l'aggiunta di `<AppHeader />`).
