# P10 — Estrazione `AppHeader` come componente autonomo

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 10 (corrispondente al Passo 10 del piano di refactoring)  
> Data: 23 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Al termine del Passo 9, tutti e tre i tab principali dell'applicazione sono stati estratti come componenti autonomi: `TransactionsTab` (P07), `DashboardTab` (P08), `ReportsTab` (P09). `App.tsx` conta attualmente **522 righe** e contiene ancora l'header sticky, la schermata di autenticazione, la navigazione tab e il layer dei dialog.

Il Passo 10 estrae il blocco JSX dell'header sticky (righe **272–349**, 78 righe) in un componente dedicato: `src/components/AppHeader.tsx`.

**Perché adesso**: l'header è un componente informativo e di navigazione. Non gestisce logica di business, non coordina stati di più entità e non ha dipendenze da tab o dialog. È il candidato più semplice dell'intera serie: nessun nuovo stato da spostare nei context (con l'unica eccezione documentata in §5), nessun problema di performance da risolvere, nessuna dipendenza circolare. Viene trattato dopo i tre tab proprio perché la sua leggerezza lo rende ideale come passo di chiusura prima dell'ultimo lavoro su App.tsx.

**Cosa cambia dopo questo passo**: `App.tsx` perde 77 righe nette e passa da 522 a circa **445 righe**. L'header sticky diventa un componente autonomo, autocontenuto e testabile isolatamente. Il file si avvicina all'obiettivo finale di ~70 righe di sola composizione.

**Cosa NON cambia**: il comportamento visibile dell'app è **identico** a prima. Nessun handler di business viene modificato: si sposta solo la struttura JSX.

---

## 2. Perimetro della modifica

### File creati

| Percorso | Scopo |
|---|---|
| `src/components/AppHeader.tsx` | Componente autonomo che incapsula l'header sticky dell'applicazione |

### File modificati

| Percorso | Modifica |
|---|---|
| `src/App.tsx` | Rimozione del blocco JSX `<header>…</header>` (righe 272–349, 78 righe); sostituzione con `<AppHeader />`; aggiunta import del componente; rimozione della dichiarazione locale `showKeyboardHelp` / `setShowKeyboardHelp` |
| `src/context/AppDataContext.tsx` | Aggiunta dello stato `showKeyboardHelp` / `setShowKeyboardHelp` (vedi §5) |

### File non toccati

| Percorso | Motivo |
|---|---|
| `src/context/AuthContext.tsx` | Invariato; `AppHeader` non necessita di `isAuthenticated` (viene renderizzato solo nel ramo autenticato) |
| `src/hooks/use-visible-data.ts` | Già espone `totalBalance` e `visibleAccounts`; nessuna modifica necessaria |
| `src/hooks/use-app-shortcuts.ts` | Dopo lo spostamento di `showKeyboardHelp` nel context, App.tsx leggerà `setShowKeyboardHelp` da `useAppData()` e lo passerà invariato all'hook |
| `src/components/TransactionsTab.tsx` | Già estratto nel Passo 7; invariato |
| `src/components/DashboardTab.tsx` | Già estratto nel Passo 8; invariato |
| `src/components/ReportsTab.tsx` | Già estratto nel Passo 9; invariato |
| `src/components/KeyboardShortcutsHelp.tsx` | Importato da App.tsx; continuerà a leggerlo dallo stesso contesto |
| `src/components/FocusIndicator.tsx` | Rimane sibling dell'header nel JSX di App.tsx; invariato |
| `docs/`, `.github/` | Invariati |

---

## 3. Struttura del componente

`AppHeader` non riceve props dall'esterno. Legge tutto direttamente dai context, dagli hook e dalle librerie. Il componente è composto da tre elementi distinti.

### 3.1 Elemento 1 — Logo

Il logo è composto da due parti inline, senza componenti esterni:

| Parte | Implementazione |
|---|---|
| Icona colorata | `<div>` con gradiente `from-primary via-secondary to-accent`; lettera **Z** in `<span>` |
| Titolo testuale | `<h1 id="app-title">` con testo "Zecchino" e gradiente CSS sul testo |

Nessuna interattività: il logo è puramente decorativo/identificativo. L'icona ha `aria-hidden="true"`; l'`<h1>` è il landmark testuale. Nessun componente esterno da importare per questo elemento.

### 3.2 Elemento 2 — Saldo totale

Il saldo totale è racchiuso in un `<Tooltip>` e funge da widget di stato live.

**Dati necessari**:

| Dato | Provenienza |
|---|---|
| `totalBalance` | `useVisibleData()` — già esposto dal hook |
| `visibleAccounts` | `useVisibleData()` — già esposto dal hook |
| `formatCurrency` | `@/lib/helpers` (import diretto) |
| `isMobile` | `useIsMobile()` |

**Struttura del Tooltip**:
- `TooltipTrigger`: `<div role="status" aria-live="polite">` con etichetta breve (`Saldo` su mobile, `Saldo Totale` su desktop) e il valore formattato
- `TooltipContent`: variante `success` o `destructive` in base al segno di `totalBalance`; testo "Saldo Consolidato" con sottotitolo che mostra il conteggio dei conti visibili (`visibleAccounts.length`) con plurale italiano corretto (`conto` / `conti`)

**Comportamento responsive**: `isMobile` influenza solo il testo dell'etichetta (`Saldo` vs `Saldo Totale`); il Tooltip appare in entrambi i casi.

**Componenti UI importati**: `Tooltip`, `TooltipContent`, `TooltipTrigger` da `@/components/ui/tooltip`.

### 3.3 Elemento 3 — Pulsante scorciatoie tastiera

Il pulsante è visibile **solo su desktop** (`!isMobile`), racchiuso in un `<Tooltip>`.

**Dati necessari**:

| Dato | Provenienza |
|---|---|
| `setShowKeyboardHelp` | `useAppData()` dopo lo spostamento in AppDataContext (vedi §5) |
| `isMobile` | `useIsMobile()` — condiziona il rendering del pulsante intero |
| `soundSystem` | `@/lib/sound-system` (import diretto) |
| `hapticSystem` | `@/lib/haptic-system` (import diretto) |

**Handler al click**:
1. `soundSystem.play('dialog-open')`
2. `hapticSystem.dialogOpen()`
3. `setShowKeyboardHelp(true)`

**Struttura del Tooltip**:
- `TooltipTrigger`: `<Button variant="ghost" size="icon">` con icona `<Keyboard size={20} weight="duotone">` (da `@phosphor-icons/react`)
- `TooltipContent`: variante `accent`; testo "Scorciatoie da Tastiera" con sottotitolo "Premi ? per visualizzare tutti i comandi"

**Nota sulla classe CSS**: il pulsante ha `className="hidden sm:inline-flex …"` — l'ulteriore `hidden sm:inline-flex` è ridondante con la guard `!isMobile` già presente nel codice JSX, ma va preservato esattamente per non alterare il comportamento visuale.

---

## 4. Dipendenze complete del componente

```
AppHeader
├── useVisibleData()
│   ├── totalBalance      → valore numerico del saldo
│   └── visibleAccounts   → array per conteggio nel Tooltip
├── useAppData()
│   └── setShowKeyboardHelp  → apre il pannello scorciatoie (dopo §5)
├── useIsMobile()
│   └── isMobile          → condiziona label saldo e visibilità pulsante
├── @/lib/helpers
│   └── formatCurrency    → formattazione valuta
├── @/lib/sound-system
│   └── soundSystem.play('dialog-open')
├── @/lib/haptic-system
│   └── hapticSystem.dialogOpen()
└── Componenti UI
    ├── Button              (@/components/ui/button)
    ├── Tooltip             (@/components/ui/tooltip)
    ├── TooltipContent      (@/components/ui/tooltip)
    ├── TooltipTrigger      (@/components/ui/tooltip)
    └── Keyboard            (@phosphor-icons/react)
```

`AppHeader` **non** dipende da:
- `useAuth()` — il componente è renderizzato solo nel ramo autenticato di App.tsx; non deve controllare `isAuthenticated` internamente
- Nessun componente della libreria `@/components/ui/card`, `Tabs`, `Badge`, ecc.
- Nessuno dei tre tab estratti

---

## 5. Gestione di `showKeyboardHelp`

**Stato attuale (verificato su `src/App.tsx` ramo `refactoring-architettura`)**: `showKeyboardHelp` è dichiarato come `useState` locale in `AppContent` alla riga **123**:

```ts
const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
```

Non è presente in `AppDataContext` (verificato su `src/context/AppDataContext.tsx`).

**Decisione: Opzione A — spostamento in `AppDataContext`**

Lo stato va spostato in `AppDataContext` seguendo il pattern già consolidato nei Passi 7–9. Motivazione: `showKeyboardHelp` è consumato da due punti distanti nell'albero (header e `KeyboardShortcutsHelp` in App.tsx) e condiviso con `useAppShortcuts`. La collocazione nel context elimina il prop drilling e rende il passo coerente con tutti i precedenti.

### Modifiche ad `AppDataContext.tsx`

**1. Aggiungere lo stato** nel corpo di `AppDataProvider`:

```ts
const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
```

**2. Aggiungere al tipo `AppDataContextValue`**:

```ts
// Dialog keyboard shortcuts
showKeyboardHelp: boolean
setShowKeyboardHelp: (v: boolean) => void
```

**3. Esporre nel valore del context** (nell'oggetto di valore restituito da `AppDataProvider`):

```ts
showKeyboardHelp,
setShowKeyboardHelp,
```

### Modifiche ad `App.tsx` conseguenti allo spostamento

- Rimuovere `const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)` (riga 123)
- Leggere `showKeyboardHelp` e `setShowKeyboardHelp` da `useAppData()` (già destrutturato nel componente)
- Il passaggio a `useAppShortcuts({ …, setShowKeyboardHelp, … })` rimane invariato

---

## 6. Stato locale del componente

`AppHeader` **non ha stato locale** (`useState`). Nessun dato è gestito internamente: tutto proviene da context e hook.

---

## 7. Rischi e avvertenze

| Rischio | Mitigazione |
|---|---|
| Il saldo non si aggiorna dopo una nuova transazione | Dipende dal corretto collegamento a `useVisibleData()`: se l'hook è usato direttamente, il rerender è garantito da React. Non introdurre memoizzazione su `totalBalance` nel componente. |
| Alterazione del Tooltip del saldo | Non modificare la logica: copiare esattamente il JSX da App.tsx, incluso il conteggio con plurale italiano |
| Alterazione del comportamento del pulsante scorciatoie | Copiare esattamente l'handler con la sequenza `soundSystem → hapticSystem → setShowKeyboardHelp` |
| `AppHeader` riceve props | Il componente non deve ricevere props. Tutte le dipendenze arrivano da context/hook |
| Regressioni nei tab estratti | I tre tab non dipendono dall'header; l'estrazione non li tocca |
| L'header perde la proprietà sticky | La classe CSS `sticky top-0 z-10` è nell'elemento `<header>`: va preservata esattamente nel nuovo componente |
| `KeyboardShortcutsHelp` smette di aprirsi | Garantito dallo spostamento di `showKeyboardHelp` nel context (§5); `App.tsx` continua a renderizzare il dialog leggendolo da `useAppData()` |

---

## 8. Criteri di verifica (definition of done)

### Logo

- [ ] Il logo (icona Z + titolo "Zecchino") è visibile nell'header dopo l'estrazione
- [ ] Il gradiente dell'icona e quello del testo sono visivamente identici alla versione pre-estrazione
- [ ] L'`<h1 id="app-title">` è presente nel DOM e riconosciuto dai screen reader come intestazione principale

### Saldo totale

- [ ] Al caricamento dell'app, il saldo mostra il valore corretto
- [ ] Dopo l'aggiunta di una nuova transazione, il valore nell'header si aggiorna senza reload
- [ ] Con `totalBalance < 0`, il testo del saldo è renderizzato con la classe `text-destructive`
- [ ] Il Tooltip al passaggio del mouse mostra il testo "Saldo Consolidato" e il conteggio corretto dei conti visibili
- [ ] Con un solo conto visibile, il Tooltip mostra "1 conto" (singolare)
- [ ] Con zero conti visibili, il saldo mostra `formatCurrency(0)` e il Tooltip mostra "0 conti"
- [ ] Il `div` del saldo ha `role="status"` e `aria-live="polite"` per gli aggiornamenti dinamici

### Pulsante scorciatoie tastiera

- [ ] Su desktop (`!isMobile`), il pulsante è visibile nell'header
- [ ] Su mobile, il pulsante è assente (guard `!isMobile` rispettata)
- [ ] Click sul pulsante: il pannello `KeyboardShortcutsHelp` si apre
- [ ] Al click: `soundSystem.play('dialog-open')` viene chiamato prima di `setShowKeyboardHelp(true)`
- [ ] Al click: `hapticSystem.dialogOpen()` viene chiamato prima di `setShowKeyboardHelp(true)`
- [ ] Chiudendo il pannello, il pulsante è di nuovo disponibile e cliccabile
- [ ] La shortcut globale `Shift+?` apre ancora il pannello (gestita da `useAppShortcuts`, non dall'header)

### Comportamento strutturale

- [ ] L'header rimane sticky (`sticky top-0 z-10`) durante lo scroll della pagina
- [ ] `FocusIndicator` rimane sibling dell'header nel DOM (non incluso dentro `AppHeader`)
- [ ] Nessuna regressione nel tab Movimenti (`TransactionsTab`)
- [ ] Nessuna regressione nel tab Dashboard (`DashboardTab`)
- [ ] Nessuna regressione nel tab Report (`ReportsTab`)
- [ ] `App.tsx` non contiene più dichiarazioni di `showKeyboardHelp` come `useState` locale
- [ ] `App.tsx` legge `showKeyboardHelp` e `setShowKeyboardHelp` da `useAppData()`
