# P37 — Coding Plan: Correzioni Accessibilità WCAG 2.1 AA

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P37 — Correzioni Accessibilità WCAG 2.1 AA
> Report di riferimento: `docs/4 - reports/report-analisi-accessibilita-completa.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-05

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P37 — Correzioni Accessibilità WCAG 2.1 AA |
| **Tipo intervento** | Bugfix / Accessibilità |
| **Branch** | `refactoring-architettura` |
| **Data** | 2026-05-05 |
| **File modificati (Fase 1)** | `src/components/OnboardingFlow.tsx` · `src/components/AccountDialog.tsx` · `src/components/BudgetDialog.tsx` · `src/components/SavingsGoalDialog.tsx` |
| **File modificati (Fase 2)** | `src/components/BudgetProgressCard.tsx` · `src/components/BudgetForecastCard.tsx` · `src/components/BudgetHistoryChart.tsx` · `src/components/MonthlyComparisonChart.tsx` |
| **File modificati (Fase 3)** | `src/components/DashboardTab.tsx` · `src/components/PeriodSelector.tsx` |
| **File modificati (Fase 4)** | `src/components/AuthScreen.tsx` · `src/components/AppHeader.tsx` · `src/components/TransactionDialog.tsx` · `src/components/SecuritySettings.tsx` · `src/components/PinDialog.tsx` · `src/components/AudioSettings.tsx` · `src/components/DisplaySettings.tsx` · `src/components/HapticSettings.tsx` · `src/components/ScreenReaderSettings.tsx` · `src/components/TalkBackSettings.tsx` · `src/components/CategoryManagement.tsx` · `src/components/BudgetComparisonCard.tsx` · `src/components/KeyboardShortcutsHelp.tsx` |
| **Report di riferimento** | [report-analisi-accessibilita-completa.md](../4%20-%20reports/report-analisi-accessibilita-completa.md) |

---

## §2 — Prerequisiti e stato attuale

### Infrastruttura accessibilità esistente — DA NON TOCCARE

L'infrastruttura di base è già corretta e non deve essere modificata:

| Componente / File | Stato | Nota |
|---|---|---|
| `src/lib/screen-reader.ts` | ✅ Corretto | Live region polite + assertive create una volta nel `document.body`; meccanismo svuota-e-riempie con 100 ms setTimeout; singleton `screenReader` esportato |
| `src/hooks/use-screen-reader.ts` | ✅ Corretto | Hook React che wrappa il singleton; non deve essere modificato |
| `src/components/SkipLink.tsx` | ✅ Corretto | `href="#main-content"` punta correttamente al `<main id="main-content">` in `App.tsx` |
| `src/components/FocusIndicator.tsx` | ✅ Corretto | Legge `data-focus-info` > `aria-label` > `title` > `textContent`; solo in keyboard mode |
| `src/components/LiveRegion.tsx` | ✅ Corretto | Non usato nei componenti analizzati; non richiede modifiche |
| Tab principali in `App.tsx` | ✅ Corretto | `role="tablist"`, `aria-selected`, `aria-controls`, `aria-labelledby` su tutti i pannelli; struttura `<main id="main-content" role="main">` presente |

### Baseline obbligatoria — Da verificare PRIMA di qualsiasi modifica al codice

#### BL1 — Build di produzione

```bash
npm run build
```

Atteso: exit 0. Se fallisce, bloccarsi e investigare prima di procedere.

#### BL2 — Test automatici

```bash
npm run test:run
```

Atteso: tutti i test passed. Annotare il numero esatto (es. 5/5). Questo numero è il requisito di non-regressione per tutti i gate delle fasi.

> Esito BL2: _ / _ passed

#### BL3 — TypeScript

```bash
npx tsc --noEmit
```

Atteso: 0 errori.

---

## §3 — Ordine di esecuzione obbligatorio

### FASE 1 — Problemi critici di navigazione e focus

---

### Passo A — `src/components/OnboardingFlow.tsx`: wrapper `<main>` e landmark navigabile

**File modificato:** `src/components/OnboardingFlow.tsx`

**Stato attuale:**

L'intero flusso di onboarding è renderizzato da `App.tsx` direttamente, senza un wrapper `<main>`. Quando `needsOnboarding === true`, `AppContent` renderizza solo `<OnboardingFlow />` senza la struttura `<main id="main-content">` presente nel flusso normale. Di conseguenza lo skip link non ha una destinazione valida e lo screen reader non può navigare a un landmark "main".

Il componente attuale inizia con una `<div>` generica che wrappa la `<Card>`:

```tsx
return (
  <div className="min-h-screen flex items-center justify-center p-4 bg-background">
    ...
    <Card ...>
```

**Trasformazione richiesta:**

Sostituire il `<div>` radice con `<main>` con gli attributi corretti:

```tsx
return (
  <main
    id="main-content"
    className="min-h-screen flex items-center justify-center p-4 bg-background"
    aria-label="Configurazione iniziale Zecchino"
  >
    ...
    <Card ...>
```

**Stato finale atteso:** lo skip link "Salta alla navigazione principale" punta a un `<main id="main-content">` valido anche durante l'onboarding. Il landmark `main` è navigabile da NVDA con il tasto `M`.

**Gate A:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `grep 'id="main-content"' src/components/OnboardingFlow.tsx` → 1 risultato

---

### Passo B — `src/components/AccountDialog.tsx`: card tipo conto raggiungibili da tastiera

**File modificato:** `src/components/AccountDialog.tsx`

**Stato attuale:**

Le card di selezione del tipo di conto sono `<Card onClick={...}>` senza `role`, `tabIndex`, `aria-checked` né `onKeyDown`. Non sono raggiungibili da tastiera. Stato visivo attivo comunicato solo con `ring-2 ring-primary bg-primary/5`.

Esempio del codice attuale (ripetuto per ogni tipo di conto):

```tsx
<Card
  className={`cursor-pointer transition-all p-3 ... ${
    selectedType === type.value
      ? 'ring-2 ring-primary bg-primary/5'
      : 'hover:border-primary/50'
  }`}
  onClick={() => setSelectedType(type.value)}
>
  <div className="flex flex-col items-center gap-2 text-center">
    <Icon size={28} weight="duotone" />
    <span className="text-xs font-medium">{type.label}</span>
  </div>
</Card>
```

Il contenitore della griglia è:

```tsx
<div className="grid grid-cols-3 gap-2">
```

**Trasformazione richiesta:**

1. Aggiungere `role="radiogroup"` e `aria-labelledby` al contenitore griglia, collegandolo all'etichetta "Tipo di Conto" esistente. Aggiungere un `id` all'etichetta per il collegamento.

2. Convertire ogni `<Card>` cliccabile in un pulsante con semantica radio:

```tsx
{/* Contenitore */}
<div
  role="radiogroup"
  aria-labelledby="account-type-label"
  className="grid grid-cols-3 gap-2"
>

{/* Etichetta — aggiungere id */}
<Label id="account-type-label">Tipo di Conto *</Label>

{/* Ogni Card tipo */}
<Card
  role="radio"
  aria-checked={selectedType === type.value}
  tabIndex={selectedType === type.value ? 0 : -1}
  className={`cursor-pointer transition-all p-3 ... ${
    selectedType === type.value
      ? 'ring-2 ring-primary bg-primary/5'
      : 'hover:border-primary/50'
  }`}
  onClick={() => setSelectedType(type.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelectedType(type.value)
    }
  }}
>
  <div className="flex flex-col items-center gap-2 text-center">
    <Icon size={28} weight="duotone" aria-hidden="true" />
    <span className="text-xs font-medium">{type.label}</span>
  </div>
</Card>
```

**Nota sul tabIndex:** per un gruppo radio la pratica corretta è `tabIndex={0}` solo sull'elemento selezionato e `-1` su tutti gli altri (rover tabindex). Il focus si sposta con Tab entrando nel gruppo e con le frecce all'interno. Se la griglia ha 3 colonne e i tipi sono 6, l'implementazione con solo Enter/Space è accettabile come prima iterazione — il comportamento frecce può essere aggiunto in P38.

**Stato finale atteso:** ogni card tipo conto ha `role="radio"` e `aria-checked`. La griglia ha `role="radiogroup"`. Le card sono raggiungibili con Tab (la selezionata ha tabIndex=0) e selezionabili con Invio o Spazio. NVDA annuncia "Tipo conto, selezionato/non selezionato, radio button".

**Gate B:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → N/N passed (≥ BL2)
- `grep 'role="radio"' src/components/AccountDialog.tsx` → risultati (quanti tipi di conto sono definiti)
- `grep 'aria-checked' src/components/AccountDialog.tsx` → almeno 1 risultato
- `grep 'role="radiogroup"' src/components/AccountDialog.tsx` → 1 risultato

---

### Passo C — `src/components/BudgetDialog.tsx`: card template raggiungibili da tastiera

**File modificato:** `src/components/BudgetDialog.tsx`

**Stato attuale:**

Le card template nel primo step del dialog budget sono `<Card onClick={...}>` senza `role`, `tabIndex` né keyboard handler. Non sono raggiungibili da tastiera.

Codice attuale delle card template (struttura analoga a AccountDialog):

```tsx
<Card
  className={`cursor-pointer transition-all p-4 ... ${
    selectedTemplate?.id === template.id
      ? 'ring-2 ring-primary bg-primary/5'
      : 'hover:border-primary/50'
  }`}
  onClick={() => setSelectedTemplate(template)}
>
  <div className="flex items-start gap-3">
    <Icon size={24} weight="duotone" />
    ...
  </div>
</Card>
```

**Trasformazione richiesta:**

Stessa tecnica del Passo B. Aggiungere al contenitore della griglia template `role="radiogroup"` con `aria-label="Modelli di budget predefiniti"`. Convertire ogni Card in:

```tsx
<Card
  role="radio"
  aria-checked={selectedTemplate?.id === template.id}
  tabIndex={selectedTemplate?.id === template.id ? 0 : -1}
  className={`cursor-pointer transition-all p-4 ... ${...}`}
  onClick={() => setSelectedTemplate(template)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelectedTemplate(template)
    }
  }}
>
  <div className="flex items-start gap-3">
    <Icon size={24} weight="duotone" aria-hidden="true" />
    ...
  </div>
</Card>
```

**Stato finale atteso:** ogni card template ha `role="radio"` e `aria-checked`. Raggiungibili con Tab e selezionabili con Invio/Spazio.

**Gate C:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → N/N passed (≥ BL2)
- `grep 'role="radio"' src/components/BudgetDialog.tsx` → risultati
- `grep 'role="radiogroup"' src/components/BudgetDialog.tsx` → 1 risultato

---

### Passo D — `src/components/SavingsGoalDialog.tsx`: focus iniziale sul campo "Nome Obiettivo"

**File modificato:** `src/components/SavingsGoalDialog.tsx`

**Stato attuale:**

All'apertura del dialog il focus va sul primo pulsante del selettore icona (comportamento Radix default), non sul campo "Nome Obiettivo" che è il primo campo significativo. Non è presente una `ref` né una chiamata `focus()` esplicita. Il dialog ha solo `soundSystem.play('dialog-open')` in un `useEffect`.

**Trasformazione richiesta:**

1. Aggiungere una `ref` sull'input del nome:

```tsx
import { useRef } from 'react'

// All'interno del componente:
const nameInputRef = useRef<HTMLInputElement>(null)
```

2. Aggiungere `ref={nameInputRef}` sull'`<Input id="goal-name">`:

```tsx
<Input
  ref={nameInputRef}
  id="goal-name"
  value={nome}
  onChange={(e) => setNome(e.target.value)}
  ...
/>
```

3. Aggiungere l'effetto di focus all'apertura nel `useEffect` esistente (o creare un nuovo `useEffect` dedicato):

```tsx
useEffect(() => {
  if (isOpen) {
    soundSystem.play('dialog-open')
    // Focus sul campo nome dopo che il dialog è montato
    const timer = setTimeout(() => {
      nameInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }
}, [isOpen])
```

Se il prop di apertura del dialog non si chiama `isOpen`, usare il nome corretto (verificare la firma delle props del componente).

4. Aggiungere anche l'annuncio di apertura dialog per coerenza con gli altri dialog dell'app (come `TransactionDialog`):

```tsx
useEffect(() => {
  if (isOpen) {
    const dialogTitle = goal ? 'Modifica Obiettivo di Risparmio' : 'Nuovo Obiettivo di Risparmio'
    screenReader.announceDialogOpen(dialogTitle)
    ...
  }
}, [isOpen, goal])
```

**Nota:** verificare il nome preciso del metodo di annuncio usato negli altri dialog (`announceDialogOpen` in `TransactionDialog.tsx`).

**Stato finale atteso:** all'apertura del dialog, il focus è sull'input "Nome Obiettivo" (non sul primo pulsante icona). NVDA legge l'etichetta del campo e la descrizione del dialog.

**Gate D:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → N/N passed (≥ BL2)
- `grep 'nameInputRef' src/components/SavingsGoalDialog.tsx` → almeno 2 risultati (definizione + uso)

---

### Gate Fase 1

Prima di passare alla Fase 2, tutti i gate A–D devono essere verificati:

- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → N/N passed (≥ BL2)
- `grep 'id="main-content"' src/components/OnboardingFlow.tsx` → 1 risultato
- `grep 'role="radiogroup"' src/components/AccountDialog.tsx src/components/BudgetDialog.tsx` → 2 risultati (uno per file)
- `grep 'nameInputRef' src/components/SavingsGoalDialog.tsx` → ≥ 2 risultati
- `git diff --name-only HEAD | grep ".github"` → output vuoto

---

### FASE 2 — Barre di progresso e grafici

---

### Passo E — `src/components/BudgetProgressCard.tsx`: `role="progressbar"` sulla barra

**File modificato:** `src/components/BudgetProgressCard.tsx`

**Stato attuale:**

La barra di progresso principale è un `<div>` CSS con larghezza variabile, senza alcun attributo ARIA:

```tsx
<div className="w-full bg-gradient-to-r from-muted ... h-4 overflow-hidden shadow-inner">
  <div
    className={`h-full transition-all ${getProgressBarColor()}`}
    style={{ width: `${Math.min(percentage, 100)}%` }}
  />
</div>
```

Lo screen reader, quando naviga su questo elemento, legge "vuoto" o salta l'elemento. Il valore percentuale è incluso nell'`aria-label` della Card ma non è accessibile dalla barra stessa.

**Trasformazione richiesta:**

Aggiungere `role="progressbar"` e tutti gli attributi ARIA richiesti al `<div>` esterno della barra (il contenitore):

```tsx
<div
  role="progressbar"
  aria-valuenow={Math.min(Math.round(percentage), 100)}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`${budget.nome}: ${Math.min(Math.round(percentage), 100)}% del budget utilizzato`}
  className="w-full bg-gradient-to-r from-muted ... h-4 overflow-hidden shadow-inner"
>
  <div
    className={`h-full transition-all ${getProgressBarColor()}`}
    style={{ width: `${Math.min(percentage, 100)}%` }}
    aria-hidden="true"
  />
</div>
```

Il `<div>` interno (la barra colorata) deve avere `aria-hidden="true"` perché è puramente decorativo.

**Nota:** il valore `percentage` è già calcolato nel componente (es. `const percentage = (spent / budget.importoTarget) * 100`). Usare la stessa variabile. Se il budget è superato (>100%), `aria-valuenow` deve essere cappato a 100 (già gestito con `Math.min`).

**Stato finale atteso:** NVDA naviga sulla barra e annuncia "Nome budget: X% del budget utilizzato, barra di avanzamento". Il valore percentuale viene letto correttamente.

**Gate E:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `grep 'role="progressbar"' src/components/BudgetProgressCard.tsx` → 1 risultato
- `grep 'aria-valuenow' src/components/BudgetProgressCard.tsx` → 1 risultato

---

### Passo F — `src/components/BudgetForecastCard.tsx`: `role="progressbar"` sulla barra proiezione

**File modificato:** `src/components/BudgetForecastCard.tsx`

**Stato attuale:**

La barra di proiezione "Proiezione vs Budget" è:

```tsx
<div className="w-full bg-muted rounded-full h-2 overflow-hidden">
  <div
    className={...}
    style={{ width: `${Math.min(forecast.projectedPercentage, 100)}%` }}
  />
</div>
```

Nessun attributo ARIA. Il valore percentuale è scritto testualmente sopra la barra ma non è associato semanticamente ad essa.

**Trasformazione richiesta:**

```tsx
<div
  role="progressbar"
  aria-valuenow={Math.min(Math.round(forecast.projectedPercentage), 100)}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`Proiezione budget: ${Math.min(Math.round(forecast.projectedPercentage), 100)}% del target previsto a fine periodo`}
  className="w-full bg-muted rounded-full h-2 overflow-hidden"
>
  <div
    className={...}
    style={{ width: `${Math.min(forecast.projectedPercentage, 100)}%` }}
    aria-hidden="true"
  />
</div>
```

**Stato finale atteso:** NVDA legge la barra come "Proiezione budget: X% del target previsto a fine periodo, barra di avanzamento".

**Gate F:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `grep 'role="progressbar"' src/components/BudgetForecastCard.tsx` → 1 risultato
- `grep 'aria-valuenow' src/components/BudgetForecastCard.tsx` → 1 risultato

---

### Passo G — `src/components/BudgetHistoryChart.tsx`: `role="progressbar"` sulle barre periodo

**File modificato:** `src/components/BudgetHistoryChart.tsx`

**Stato attuale:**

Ogni barra del grafico storico è un `<div>` con larghezza proporzionale, con testo percentuale sovrapposto tramite `<span>` assoluto. Struttura attuale (ripetuta per ogni periodo storico):

```tsx
<div className="relative w-full bg-muted rounded-full h-8 overflow-hidden">
  <div
    className={...}
    style={{ width: `${Math.min(entry.percentage, 100)}%` }}
  />
  <span className="absolute inset-0 flex items-center justify-start pl-2 text-xs font-medium ...">
    {Math.round(entry.percentage)}%
  </span>
</div>
```

Nessun attributo ARIA sul div esterno. Le righe periodo hanno `cursor-pointer` con `onClick` ma senza `role`, `tabIndex` né `aria-label`.

**Trasformazione richiesta:**

1. Aggiungere `role="progressbar"` e attributi ARIA al `<div>` esterno di ogni barra:

```tsx
<div
  role="progressbar"
  aria-valuenow={Math.min(Math.round(entry.percentage), 100)}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`${entry.period}: ${Math.min(Math.round(entry.percentage), 100)}% del budget (${formatCurrency(entry.spent)} su ${formatCurrency(entry.budget)})`}
  className="relative w-full bg-muted rounded-full h-8 overflow-hidden"
>
  <div
    className={...}
    style={{ width: `${Math.min(entry.percentage, 100)}%` }}
    aria-hidden="true"
  />
  <span className="absolute inset-0 ..." aria-hidden="true">
    {Math.round(entry.percentage)}%
  </span>
</div>
```

Il `<span>` con il testo percentuale è reso ridondante dall'`aria-label` della barra, quindi va marcato con `aria-hidden="true"` per evitare duplicazioni.

2. Aggiungere accessibilità alle righe periodo cliccabili (se sono interattive):

```tsx
<div
  role="button"
  tabIndex={0}
  aria-label={`Periodo ${entry.period}: budget ${formatCurrency(entry.budget)}, speso ${formatCurrency(entry.spent)}`}
  onClick={() => { /* handler esistente */ }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      // Chiamare lo stesso handler dell'onClick
    }
  }}
  className="cursor-pointer ..."
>
```

**Stato finale atteso:** NVDA legge ogni barra storica come "MESE ANNO: X% del budget (€ Y su € Z), barra di avanzamento". Le righe cliccabili sono raggiungibili da tastiera.

**Gate G:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `grep 'role="progressbar"' src/components/BudgetHistoryChart.tsx` → ≥ 1 risultato nel template JSX (probabilmente in un `.map()`)
- `grep 'aria-valuenow' src/components/BudgetHistoryChart.tsx` → ≥ 1 risultato

---

### Passo H — `src/components/MonthlyComparisonChart.tsx`: `role="img"` + `aria-label` sul grafico

**File modificato:** `src/components/MonthlyComparisonChart.tsx`

**Stato attuale:**

Il grafico a barre è composto da un `<ResponsiveContainer>` con `<BarChart>` all'interno, usati direttamente senza un wrapper con semantica di immagine:

```tsx
<ResponsiveContainer width="100%" height={200}>
  <BarChart data={chartData} ...>
    ...
  </BarChart>
</ResponsiveContainer>
```

A differenza di `IncomeExpenseChart.tsx` (che usa `<div role="img" aria-label={chartAriaLabel}>` attorno a `<ResponsiveContainer>`), `MonthlyComparisonChart` non ha questo wrapper. Lo screen reader non può interpretare il grafico.

**Trasformazione richiesta:**

1. Costruire una stringa `aria-label` descrittiva con i dati chiave del grafico. Utilizzare i valori già calcolati nel componente (mese corrente, mese precedente, entrate, uscite):

```tsx
const chartAriaLabel = `Confronto mensile: ${currentMonthLabel} - Entrate ${formatCurrency(currentIncome)}, Uscite ${formatCurrency(currentExpenses)}. ${previousMonthLabel} - Entrate ${formatCurrency(previousIncome)}, Uscite ${formatCurrency(previousExpenses)}.`
```

I nomi delle variabili (`currentIncome`, `currentExpenses`, ecc.) vanno adattati in base alle variabili effettivamente presenti nel componente.

2. Wrappare `<ResponsiveContainer>` con un `<div>` con semantica immagine:

```tsx
<div
  role="img"
  aria-label={chartAriaLabel}
>
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={chartData} ...>
      ...
    </BarChart>
  </ResponsiveContainer>
</div>
```

3. Aggiungere `aria-hidden="true"` sulle icone trend (`<ArrowUp>`, `<ArrowDown>`, `<Minus>`) in `renderChangeIndicator()`:

```tsx
function renderChangeIndicator(change: number) {
  if (change > 0) return <ArrowUp size={16} aria-hidden="true" className="text-red-500" />
  if (change < 0) return <ArrowDown size={16} aria-hidden="true" className="text-green-500" />
  return <Minus size={16} aria-hidden="true" className="text-muted-foreground" />
}
```

**Stato finale atteso:** NVDA naviga al grafico e legge la descrizione testuale completa con i valori dei due mesi. Il `<div role="img">` è riconoscibile come un'immagine con testo alternativo.

**Gate H:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `grep 'role="img"' src/components/MonthlyComparisonChart.tsx` → 1 risultato
- `grep 'chartAriaLabel\|aria-label' src/components/MonthlyComparisonChart.tsx` → ≥ 1 risultato
- `grep 'aria-hidden="true"' src/components/MonthlyComparisonChart.tsx` → ≥ 3 risultati (le 3 icone trend)

---

### Gate Fase 2

Prima di passare alla Fase 3, tutti i gate E–H devono essere verificati:

- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → N/N passed (≥ BL2)
- `grep 'role="progressbar"' src/components/BudgetProgressCard.tsx src/components/BudgetForecastCard.tsx src/components/BudgetHistoryChart.tsx` → almeno 3 risultati totali
- `grep 'role="img"' src/components/MonthlyComparisonChart.tsx` → 1 risultato
- `git diff --name-only HEAD | grep ".github"` → output vuoto

---

### FASE 3 — Stati interattivi mancanti

---

### Passo I — `src/components/DashboardTab.tsx`: `aria-pressed` sui pulsanti filtro categoria

**File modificato:** `src/components/DashboardTab.tsx`

**Stato attuale:**

I pulsanti filtro categoria (es. "Mostra tutto", "Bancari", "Digitali", "Risparmio", "Investimenti", "Privato") mostrano lo stato attivo/inattivo solo attraverso il `variant` visivo del pulsante. Non hanno `aria-pressed`:

```tsx
<Button
  variant={selectedCategory === category.value ? 'default' : 'outline'}
  size="sm"
  onClick={() => setSelectedCategory(category.value)}
  className="..."
>
  {category.label}
</Button>
```

Uno screen reader non può determinare quale filtro è attivo.

**Trasformazione richiesta:**

Aggiungere `aria-pressed` a ogni pulsante filtro:

```tsx
<Button
  variant={selectedCategory === category.value ? 'default' : 'outline'}
  size="sm"
  aria-pressed={selectedCategory === category.value}
  onClick={() => setSelectedCategory(category.value)}
  className="..."
>
  {category.label}
</Button>
```

**Nota:** i valori dei filtri e il nome della variabile di stato (`selectedCategory` o analogo) vanno verificati nel codice effettivo del componente. Il principio è aggiungere `aria-pressed={activeFilter === filter.value}` su ogni pulsante.

**Stato finale atteso:** NVDA legge "Bancari, premuto/non premuto, pulsante" in base allo stato del filtro.

**Gate I:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `grep 'aria-pressed' src/components/DashboardTab.tsx` → ≥ 1 risultato (nel template dei pulsanti filtro)

---

### Passo J — `src/components/PeriodSelector.tsx`: `aria-pressed` sui pulsanti periodo

**File modificato:** `src/components/PeriodSelector.tsx`

**Stato attuale:**

I pulsanti periodo (Settimana, Mese, 3 Mesi, 6 Mesi, Anno) mostrano lo stato selezionato solo attraverso `variant={value === period.value ? 'default' : 'outline'}`. Non hanno `aria-pressed` né `aria-current`:

```tsx
<Button
  key={period.value}
  variant={value === period.value ? 'default' : 'outline'}
  size="sm"
  onClick={() => handleChange(period.value)}
  className="..."
>
  {period.label}
</Button>
```

**Trasformazione richiesta:**

```tsx
<Button
  key={period.value}
  variant={value === period.value ? 'default' : 'outline'}
  size="sm"
  aria-pressed={value === period.value}
  onClick={() => handleChange(period.value)}
  className="..."
>
  {period.label}
</Button>
```

**Stato finale atteso:** NVDA legge "Mese, premuto/non premuto, pulsante" per ogni pulsante periodo.

**Gate J:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `grep 'aria-pressed' src/components/PeriodSelector.tsx` → ≥ 1 risultato

---

### Gate Fase 3

Prima di passare alla Fase 4:

- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → N/N passed (≥ BL2)
- `grep 'aria-pressed' src/components/DashboardTab.tsx src/components/PeriodSelector.tsx` → ≥ 2 risultati totali
- `git diff --name-only HEAD | grep ".github"` → output vuoto

---

### FASE 4 — Anomalie minori (icone, messaggi di errore, aria-busy)

---

### Passo K — `src/components/AuthScreen.tsx`: `aria-hidden` logo "Z" e fix errore sempre in DOM

**File modificato:** `src/components/AuthScreen.tsx`

**Stato attuale — Anomalia K1 (logo "Z"):**

Il div del logo contiene il testo "Z" senza `aria-hidden`:

```tsx
<div className="mx-auto flex h-14 w-14 rounded-2xl ... text-2xl font-bold text-primary-foreground ...">
  Z
</div>
```

Lo screen reader legge "Z" come contenuto prima di leggere il titolo della card.

**Trasformazione K1:**

```tsx
<div
  className="mx-auto flex h-14 w-14 rounded-2xl ... text-2xl font-bold text-primary-foreground ..."
  aria-hidden="true"
>
  Z
</div>
```

**Stato attuale — Anomalia K2 (elemento errore sempre in DOM):**

L'elemento errore è sempre presente nel DOM, anche con testo vuoto:

```tsx
<p className="text-sm text-destructive" role="alert" aria-live="assertive" aria-atomic="true">
  {error}
</p>
```

Quando `setError('')` viene chiamato, il browser potrebbe notificare lo screen reader con un annuncio vuoto.

**Trasformazione K2:**

Convertire a rendering condizionale con elemento fisso nel DOM ma con `aria-atomic="true"` e svuotamento controllato — oppure, più semplice, mantenere l'elemento fisso nel DOM ma aggiungere `aria-hidden` dinamico quando il testo è vuoto:

```tsx
<p
  className="text-sm text-destructive"
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  aria-hidden={!error}
>
  {error}
</p>
```

Con `aria-hidden={!error}`, l'elemento non viene annunciato dallo screen reader quando è vuoto.

**Gate K:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `grep 'aria-hidden="true"' src/components/AuthScreen.tsx` → ≥ 1 risultato (logo Z)
- `grep 'aria-hidden={!error}' src/components/AuthScreen.tsx` → ≥ 1 risultato

---

### Passo L — `src/components/OnboardingFlow.tsx`: `aria-busy` sul contenitore Card

**File modificato:** `src/components/OnboardingFlow.tsx`

**Stato attuale:**

Il salvataggio asincrono di ogni step (nome, valuta, conto, completamento) è visualmente indicato solo dal testo del pulsante ("Salvataggio..." vs "Avanti"). Nessun `aria-busy` sul contenitore.

Le variabili di stato rilevanti sono: `isSavingName`, `isSavingCurrency`, `isSavingAccount`, `isCompleting`.

**Trasformazione richiesta:**

Aggiungere `aria-busy` sulla `<Card>` (o sul suo contenuto) che cambia in base allo stato di salvataggio corrente:

```tsx
const isSaving = isSavingName || isSavingCurrency || isSavingAccount || isCompleting

<Card
  className="w-full max-w-md shadow-2xl"
  aria-busy={isSaving}
>
```

**Stato finale atteso:** quando un salvataggio è in corso, NVDA riceve il segnale `aria-busy` che indica che il contenuto sta per cambiare.

**Gate L:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `grep 'aria-busy' src/components/OnboardingFlow.tsx` → ≥ 1 risultato

---

### Passo M — `AppHeader.tsx` e componenti Gruppo 6: `aria-hidden` sulle icone decorative

**File modificati:**
- `src/components/AppHeader.tsx`
- `src/components/AudioSettings.tsx`
- `src/components/DisplaySettings.tsx`
- `src/components/HapticSettings.tsx`
- `src/components/ScreenReaderSettings.tsx`
- `src/components/TalkBackSettings.tsx`
- `src/components/CategoryManagement.tsx`
- `src/components/BudgetComparisonCard.tsx`
- `src/components/KeyboardShortcutsHelp.tsx`

**Principio generale:**

Ogni icona `@phosphor-icons/react` che ha funzione puramente decorativa (affianca testo già leggibile, non veicola informazioni aggiuntive) deve avere `aria-hidden="true"`. Se l'icona è dentro un pulsante con `aria-label`, l'icona stessa è già resa irrilevante dall'`aria-label` del pulsante; tuttavia aggiungere `aria-hidden="true"` è comunque buona pratica per coerenza.

**Modifiche specifiche per file:**

#### AppHeader.tsx

Il pulsante "Aggiorna ora" ha `aria-busy` mancante durante `isLoading`. Aggiungere:

```tsx
<header ... aria-busy={isLoading}>
```

oppure, se meno invasivo, sull'area del saldo:

```tsx
<div role="region" aria-label="Informazioni saldo e azioni rapide" aria-busy={isLoading}>
```

#### AudioSettings.tsx

Icona del volume in `getVolumeIcon()` (SpeakerSlash, SpeakerLow, SpeakerHigh):

```tsx
// In getVolumeIcon():
return <SpeakerSlash size={24} weight="duotone" aria-hidden="true" />
// ... analoga per le altre icone
```

#### DisplaySettings.tsx

Icone decorative nelle intestazioni di sottosezione (`<Eye>`, `<Monitor>`, `<TextAa>`, `<Palette>`):

```tsx
<Eye size={18} weight="duotone" aria-hidden="true" />
<Monitor size={18} weight="duotone" aria-hidden="true" />
<TextAa size={18} weight="duotone" aria-hidden="true" />
<Palette size={18} weight="duotone" aria-hidden="true" />
```

#### HapticSettings.tsx

Icona `<Vibrate>` nell'intestazione della card e nei pulsanti di test:

```tsx
<Vibrate size={24} weight="duotone" aria-hidden="true" />
```

#### ScreenReaderSettings.tsx

`<TextAa>` e `<SpeakerHigh>` nelle intestazioni:

```tsx
<TextAa size={20} weight="duotone" aria-hidden="true" />
<SpeakerHigh size={20} weight="duotone" aria-hidden="true" />
```

#### TalkBackSettings.tsx

Icone nei Badge di confidenza (`<CheckCircle>`, `<WarningCircle>`, `<Info>`) in `getConfidenceBadge()`:

```tsx
<CheckCircle size={12} weight="fill" aria-hidden="true" />
<WarningCircle size={12} weight="fill" aria-hidden="true" />
<Info size={12} weight="fill" aria-hidden="true" />
```

#### CategoryManagement.tsx

Icone `<Tag>`, `<TrendUp>`, `<TrendDown>` nelle intestazioni di sezione:

```tsx
<Tag size={16} className="..." weight="duotone" aria-hidden="true" />
<TrendUp size={20} weight="duotone" className="text-income" aria-hidden="true" />
<TrendDown size={20} weight="duotone" className="text-expense" aria-hidden="true" />
```

#### BudgetComparisonCard.tsx

Icone trend in `getTrendIcon()` (`<TrendUp>`, `<TrendDown>`, `<Equals>`):

```tsx
// In getTrendIcon():
return <TrendUp size={16} weight="duotone" aria-hidden="true" />
// ... analoga per TrendDown e Equals
```

#### KeyboardShortcutsHelp.tsx

`<Keyboard>` nel `<DialogTitle>`:

```tsx
<Keyboard size={24} weight="duotone" aria-hidden="true" />
```

**Gate M:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- Verifica spot: `grep -n 'aria-hidden' src/components/AudioSettings.tsx` → almeno 1 risultato in `getVolumeIcon()`

---

### Passo N — `TransactionDialog.tsx`, `SecuritySettings.tsx`, `PinDialog.tsx`: pattern coerente messaggi errore

**File modificati:**
- `src/components/TransactionDialog.tsx`
- `src/components/SecuritySettings.tsx`
- `src/components/PinDialog.tsx`

**Stato attuale:**

Nei tre componenti il messaggio di errore è renderizzato condizionalmente con `{error && <p role="alert">...</p>}`. Questo significa che l'elemento non è sempre presente nel DOM. Alcuni screen reader preferiscono un elemento fisso con contenuto variabile per garantire l'annuncio.

`PinDialog.tsx` ha anche un `aria-describedby="pin-error"` sull'input che può referenziare un elemento assente dal DOM.

**Trasformazione richiesta:**

Per tutti e tre i componenti, convertire il rendering condizionale in elemento fisso con `aria-hidden` dinamico (stesso pattern del Passo K2):

```tsx
{/* TransactionDialog.tsx, SecuritySettings.tsx, PinDialog.tsx — pattern unificato */}
<p
  className="text-sm text-destructive"
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  aria-hidden={!error}
>
  {error}
</p>
```

Per `PinDialog.tsx`, aggiornare anche l'`aria-describedby` sull'input per essere sempre presente (l'elemento ha già un `id="pin-error"`):

```tsx
<Input
  id="pin"
  ...
  aria-describedby="pin-error pin-dialog-description"
/>

{/* L'elemento errore è sempre nel DOM */}
<p
  id="pin-error"
  className="text-sm text-destructive"
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  aria-hidden={!error}
>
  {error}
</p>
```

**Stato finale atteso:** i messaggi di errore sono sempre nel DOM, visibili allo screen reader solo quando hanno contenuto. `aria-describedby` non referenzia mai un elemento assente.

**Gate N:**
- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → N/N passed (≥ BL2)
- `grep 'aria-hidden={!error}' src/components/TransactionDialog.tsx src/components/SecuritySettings.tsx src/components/PinDialog.tsx` → 3 risultati

---

### Gate Fase 4

Verifica finale della Fase 4:

- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → N/N passed (≥ BL2)
- `grep 'aria-hidden="true"' src/components/AudioSettings.tsx src/components/DisplaySettings.tsx src/components/HapticSettings.tsx` → almeno 1 risultato per file
- `grep 'aria-hidden={!error}' src/components/TransactionDialog.tsx src/components/SecuritySettings.tsx src/components/PinDialog.tsx` → 3 risultati
- `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## §4 — File invariati

I seguenti componenti sono stati dichiarati corretti nel report di analisi e **non devono essere modificati**:

| File | Motivazione |
|---|---|
| `src/components/AccountCard.tsx` | A1, A2, A3, A4, B4 tutti corretti; `role="button"` o `role="article"` con `aria-label` completo |
| `src/components/BudgetAlertBanner.tsx` | A2, A3, C1, C2, C3 tutti corretti; live region nested analizzata e accettata |
| `src/components/SavingsGoalCard.tsx` | Unica card con `role="progressbar"` correttamente implementato; D1, D4 corretti |
| `src/components/IncomeExpenseChart.tsx` | D2 corretto con `<div role="img" aria-label={chartAriaLabel}>`; C3 con `role="status"` |
| `src/components/LoadingSpinner.tsx` | `role="status" aria-label="Caricamento in corso" aria-live="polite"` corretto |
| `src/lib/screen-reader.ts` | Infrastruttura live region corretta; singleton esportato |
| `src/hooks/use-screen-reader.ts` | Hook corretto; non modificare |
| `src/components/SkipLink.tsx` | `href="#main-content"` corretto; target presente in App.tsx |
| `src/components/FocusIndicator.tsx` | Implementazione corretta; non modificare |
| `src/App.tsx` (struttura tab) | `role="tablist"`, `aria-selected`, `aria-controls`, `<main id="main-content">` corretti |
| `src/components/TransactionsTab.tsx` | A1, A2, B4, C1, D3 corretti; solo anomalia minore A3 (icone) se necessario |

**Regola assoluta:** nessuna modifica opportunistica fuori dal perimetro dichiarato in §3. Un agente che modifica file non elencati nelle fasi 1–4 è fuori perimetro.

---

## §5 — Schema riepilogativo

```
P37 — Correzioni Accessibilità WCAG 2.1 AA
│
├── Baseline
│   ├── BL1: npm run build exit 0
│   ├── BL2: npm run test:run → N/N passed
│   └── BL3: npx tsc --noEmit → 0 errori
│
├── FASE 1 — Navigazione e focus (critici)
│   │
│   ├── Passo A: OnboardingFlow.tsx — wrapper <main id="main-content">
│   │   └── Gate A: build OK, grep main-content → 1 risultato
│   │
│   ├── Passo B: AccountDialog.tsx — card tipo conto come radio group
│   │   └── Gate B: build OK, role=radiogroup + role=radio + aria-checked
│   │
│   ├── Passo C: BudgetDialog.tsx — card template come radio group
│   │   └── Gate C: build OK, role=radiogroup + role=radio + aria-checked
│   │
│   ├── Passo D: SavingsGoalDialog.tsx — focus iniziale su input "Nome"
│   │   └── Gate D: build OK, nameInputRef presente
│   │
│   └── Gate Fase 1: build OK, tsc OK, test OK, grep collettivo
│
├── FASE 2 — Barre di progresso e grafici
│   │
│   ├── Passo E: BudgetProgressCard.tsx — role=progressbar + aria-value*
│   │   └── Gate E: build OK, grep progressbar → 1 risultato
│   │
│   ├── Passo F: BudgetForecastCard.tsx — role=progressbar + aria-value*
│   │   └── Gate F: build OK, grep progressbar → 1 risultato
│   │
│   ├── Passo G: BudgetHistoryChart.tsx — role=progressbar + aria-value*
│   │   └── Gate G: build OK, grep progressbar → ≥ 1 risultato
│   │
│   ├── Passo H: MonthlyComparisonChart.tsx — role=img + aria-label
│   │   └── Gate H: build OK, grep role=img → 1 risultato
│   │
│   └── Gate Fase 2: build OK, tsc OK, test OK, grep collettivo
│
├── FASE 3 — Stati interattivi mancanti
│   │
│   ├── Passo I: DashboardTab.tsx — aria-pressed filtri categoria
│   │   └── Gate I: build OK, grep aria-pressed → ≥ 1 risultato
│   │
│   ├── Passo J: PeriodSelector.tsx — aria-pressed pulsanti periodo
│   │   └── Gate J: build OK, grep aria-pressed → ≥ 1 risultato
│   │
│   └── Gate Fase 3: build OK, tsc OK, test OK
│
└── FASE 4 — Anomalie minori
    │
    ├── Passo K: AuthScreen.tsx — aria-hidden logo Z + fix errore in DOM
    │   └── Gate K: build OK, grep aria-hidden Z → 1 risultato
    │
    ├── Passo L: OnboardingFlow.tsx — aria-busy su Card
    │   └── Gate L: build OK, grep aria-busy → ≥ 1 risultato
    │
    ├── Passo M: AppHeader + 8 componenti Gruppo 6 — aria-hidden icone
    │   └── Gate M: build OK, spot grep per file
    │
    ├── Passo N: TransactionDialog + SecuritySettings + PinDialog — errori in DOM
    │   └── Gate N: build OK, grep aria-hidden={!error} → 3 risultati
    │
    └── Gate Fase 4 (= Gate finale P37): build OK, tsc OK, test OK,
        grep collettivo, verifiche manuali NVDA
```

---

## §6 — Criteri di accettazione finali (Gate P37)

### Verifiche automatiche

| Comando | Esito atteso |
|---|---|
| `npm run build` | exit 0 |
| `npx tsc --noEmit` | 0 errori TypeScript |
| `npm run test:run` | tutti i test passed (≥ BL2) |
| `git diff --name-only HEAD \| grep ".github"` | output vuoto |

### Verifiche manuali NVDA obbligatorie

| Scenario | Esito atteso |
|---|---|
| Navigare con Tab nella schermata di onboarding (primo accesso) | Tutti i campi vengono letti con etichetta; il landmark "main" è presente e navigabile con il tasto M |
| Navigare su una barra di progresso budget in ReportsTab | NVDA annuncia "Nome budget: X% del budget utilizzato, barra di avanzamento" |
| Navigare con Tab in AccountDialog e raggiungere la griglia tipo conto | Le card tipo conto sono raggiungibili con Tab, NVDA legge "tipo, selezionato/non selezionato, radio button"; premendo Invio o Spazio si seleziona il tipo |
| Navigare sui pulsanti filtro in DashboardTab | NVDA legge "Bancari, premuto/non premuto, pulsante" in base allo stato |
| Navigare sul grafico "Confronto Mensile" in ReportsTab | NVDA legge la descrizione testuale con i dati dei due mesi |
| Navigare sui pulsanti periodo in PeriodSelector | NVDA legge "Mese, premuto/non premuto, pulsante" |
