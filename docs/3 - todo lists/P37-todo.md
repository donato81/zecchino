# P37 — Todo: Correzioni Accessibilità WCAG 2.1 AA

> Pacchetto P37 — Correzioni Accessibilità WCAG 2.1 AA
> Piano di riferimento: `docs/2 - coding plans/P37-coding-plan.md`
> Report di riferimento: `docs/4 - reports/report-analisi-accessibilita-completa.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-05
> Completato: —

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [ ] |
| `npx tsc --noEmit` → 0 errori TypeScript | [ ] |
| `npm run test:run` → tutti i test passed | [ ] |
| `grep 'id="main-content"' src/components/OnboardingFlow.tsx` → 1 risultato | [ ] |
| `grep 'role="radiogroup"' src/components/AccountDialog.tsx` → 1 risultato | [ ] |
| `grep 'role="radiogroup"' src/components/BudgetDialog.tsx` → 1 risultato | [ ] |
| `grep 'nameInputRef' src/components/SavingsGoalDialog.tsx` → ≥ 2 risultati | [ ] |
| `grep 'role="progressbar"' src/components/BudgetProgressCard.tsx` → 1 risultato | [ ] |
| `grep 'role="progressbar"' src/components/BudgetForecastCard.tsx` → 1 risultato | [ ] |
| `grep 'role="progressbar"' src/components/BudgetHistoryChart.tsx` → ≥ 1 risultato | [ ] |
| `grep 'role="img"' src/components/MonthlyComparisonChart.tsx` → 1 risultato | [ ] |
| `grep 'aria-pressed' src/components/DashboardTab.tsx` → ≥ 1 risultato | [ ] |
| `grep 'aria-pressed' src/components/PeriodSelector.tsx` → ≥ 1 risultato | [ ] |
| `grep 'aria-hidden={!error}' src/components/TransactionDialog.tsx` → 1 risultato | [ ] |
| `grep 'aria-hidden={!error}' src/components/SecuritySettings.tsx` → 1 risultato | [ ] |
| `grep 'aria-hidden={!error}' src/components/PinDialog.tsx` → 1 risultato | [ ] |
| `git diff --name-only HEAD \| grep ".github"` → output vuoto | [ ] |
| Verifica manuale NVDA: barre di progresso budget annunciano il valore | [ ] |
| Verifica manuale NVDA: card tipo conto raggiungibili e leggibili | [ ] |
| Verifica manuale NVDA: filtri Dashboard con stato premuto/non premuto | [ ] |
| Verifica manuale NVDA: grafico Confronto Mensile ha descrizione testuale | [ ] |
| Verifica manuale NVDA: pulsanti periodo con stato premuto/non premuto | [ ] |
| Verifica manuale NVDA: onboarding navigabile con landmark main | [ ] |

---

## Prerequisiti — Prima di iniziare

> Non avviare la Fase 1 finché questi controlli non sono completati e documentati.

- [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P37-coding-plan.md`
- [ ] Verificare di essere sul branch `refactoring-architettura`:
  ```
  git branch --show-current
  ```

### BL1 — Baseline build

- [ ] `npm run build` → exit 0
  > Esito BL1 build: _

### BL2 — Baseline test

- [ ] `npm run test:run` → tutti i test passed — annotare il numero:
  > Esito BL2 test: _ / _ passed

### BL3 — Baseline TypeScript

- [ ] `npx tsc --noEmit` → 0 errori
  > Esito BL3 tsc: _

---

## FASE 1 — Navigazione e focus (critici)

> Prerequisito: BL1–BL3 verificati.

### Passo A — `src/components/OnboardingFlow.tsx`: wrapper `<main>`

> Perimetro: solo `OnboardingFlow.tsx`.

- [ ] **A1** — Sostituire il `<div>` radice con `<main id="main-content" aria-label="Configurazione iniziale Zecchino">`
- [ ] **A2** — Verificare che l'attributo `className` del precedente `<div>` radice sia conservato sul `<main>` (il layout non deve cambiare)

#### Gate A

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `grep 'id="main-content"' src/components/OnboardingFlow.tsx` → 1 risultato

---

### Passo B — `src/components/AccountDialog.tsx`: card tipo conto accessibili da tastiera

> Perimetro: solo `AccountDialog.tsx`.

- [ ] **B1** — Aggiungere `id="account-type-label"` alla `<Label>` "Tipo di Conto"
- [ ] **B2** — Aggiungere `role="radiogroup"` e `aria-labelledby="account-type-label"` al div contenitore della griglia tipo conto
- [ ] **B3** — Aggiungere a ogni `<Card>` del tipo conto: `role="radio"`, `aria-checked={selectedType === type.value}`, `tabIndex={selectedType === type.value ? 0 : -1}`
- [ ] **B4** — Aggiungere a ogni `<Card>` del tipo conto: `onKeyDown` che gestisce Enter e Space per selezionare il tipo
- [ ] **B5** — Aggiungere `aria-hidden="true"` all'icona `<Icon>` dentro ogni card tipo conto

#### Gate B

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → N/N passed (≥ BL2)
- [ ] `grep 'role="radiogroup"' src/components/AccountDialog.tsx` → 1 risultato
- [ ] `grep 'role="radio"' src/components/AccountDialog.tsx` → ≥ 1 risultato nel JSX
- [ ] `grep 'aria-checked' src/components/AccountDialog.tsx` → ≥ 1 risultato

---

### Passo C — `src/components/BudgetDialog.tsx`: card template accessibili da tastiera

> Perimetro: solo `BudgetDialog.tsx`.

- [ ] **C1** — Aggiungere `role="radiogroup"` e `aria-label="Modelli di budget predefiniti"` al div contenitore della griglia template
- [ ] **C2** — Aggiungere a ogni `<Card>` template: `role="radio"`, `aria-checked={selectedTemplate?.id === template.id}`, `tabIndex={selectedTemplate?.id === template.id ? 0 : -1}`
- [ ] **C3** — Aggiungere a ogni `<Card>` template: `onKeyDown` che gestisce Enter e Space per selezionare il template
- [ ] **C4** — Aggiungere `aria-hidden="true"` all'icona `<Icon>` dentro ogni card template

#### Gate C

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → N/N passed (≥ BL2)
- [ ] `grep 'role="radiogroup"' src/components/BudgetDialog.tsx` → 1 risultato
- [ ] `grep 'role="radio"' src/components/BudgetDialog.tsx` → ≥ 1 risultato nel JSX
- [ ] `grep 'aria-checked' src/components/BudgetDialog.tsx` → ≥ 1 risultato

---

### Passo D — `src/components/SavingsGoalDialog.tsx`: focus iniziale su "Nome Obiettivo"

> Perimetro: solo `SavingsGoalDialog.tsx`.

- [ ] **D1** — Aggiungere `import { useRef } from 'react'` (se non già presente)
- [ ] **D2** — Dichiarare `const nameInputRef = useRef<HTMLInputElement>(null)` nel corpo del componente
- [ ] **D3** — Aggiungere `ref={nameInputRef}` all'`<Input id="goal-name">`
- [ ] **D4** — Nel `useEffect` che gestisce l'apertura del dialog, aggiungere `setTimeout(() => { nameInputRef.current?.focus() }, 100)` con cleanup del timer
- [ ] **D5** — Aggiungere `screenReader.announceDialogOpen(dialogTitle)` nell'`useEffect` di apertura (per coerenza con TransactionDialog)

#### Gate D

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → N/N passed (≥ BL2)
- [ ] `grep 'nameInputRef' src/components/SavingsGoalDialog.tsx` → ≥ 2 risultati (dichiarazione + uso su Input)

---

### Gate Fase 1

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → N/N passed (≥ BL2)
- [ ] `grep 'id="main-content"' src/components/OnboardingFlow.tsx` → 1 risultato
- [ ] `grep 'role="radiogroup"' src/components/AccountDialog.tsx src/components/BudgetDialog.tsx` → 2 risultati
- [ ] `grep 'nameInputRef' src/components/SavingsGoalDialog.tsx` → ≥ 2 risultati
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## FASE 2 — Barre di progresso e grafici

> Prerequisito: Gate Fase 1 verificato.

### Passo E — `src/components/BudgetProgressCard.tsx`: `role="progressbar"`

> Perimetro: solo `BudgetProgressCard.tsx`.

- [ ] **E1** — Aggiungere al `<div>` esterno della barra (contenitore): `role="progressbar"`, `aria-valuenow={Math.min(Math.round(percentage), 100)}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label` descrittivo con nome budget e percentuale
- [ ] **E2** — Aggiungere `aria-hidden="true"` al `<div>` interno (la barra colorata che scala in width)

#### Gate E

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `grep 'role="progressbar"' src/components/BudgetProgressCard.tsx` → 1 risultato
- [ ] `grep 'aria-valuenow' src/components/BudgetProgressCard.tsx` → 1 risultato

---

### Passo F — `src/components/BudgetForecastCard.tsx`: `role="progressbar"`

> Perimetro: solo `BudgetForecastCard.tsx`.

- [ ] **F1** — Aggiungere al `<div>` esterno della barra proiezione: `role="progressbar"`, `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label="Proiezione budget: X% del target previsto a fine periodo"`
- [ ] **F2** — Aggiungere `aria-hidden="true"` al `<div>` interno (la barra colorata)

#### Gate F

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `grep 'role="progressbar"' src/components/BudgetForecastCard.tsx` → 1 risultato
- [ ] `grep 'aria-valuenow' src/components/BudgetForecastCard.tsx` → 1 risultato

---

### Passo G — `src/components/BudgetHistoryChart.tsx`: `role="progressbar"` sulle barre periodo

> Perimetro: solo `BudgetHistoryChart.tsx`.

- [ ] **G1** — Aggiungere al `<div>` esterno di ogni barra periodo (nel `.map()`): `role="progressbar"`, `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label` con periodo, percentuale, importo speso e budget
- [ ] **G2** — Aggiungere `aria-hidden="true"` al `<div>` interno (la barra colorata) e allo `<span>` con il testo percentuale sovrapposto
- [ ] **G3** — Aggiungere alle righe periodo cliccabili (div con `cursor-pointer`): `role="button"`, `tabIndex={0}`, `aria-label` contestuale, `onKeyDown` per Enter/Space

#### Gate G

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `grep 'role="progressbar"' src/components/BudgetHistoryChart.tsx` → ≥ 1 risultato nel JSX (probabilmente nel `.map()`)
- [ ] `grep 'aria-valuenow' src/components/BudgetHistoryChart.tsx` → ≥ 1 risultato

---

### Passo H — `src/components/MonthlyComparisonChart.tsx`: `role="img"` + `aria-label`

> Perimetro: solo `MonthlyComparisonChart.tsx`.

- [ ] **H1** — Costruire la variabile `chartAriaLabel` con i dati chiave: mese corrente (entrate, uscite), mese precedente (entrate, uscite)
- [ ] **H2** — Wrappare `<ResponsiveContainer>` in `<div role="img" aria-label={chartAriaLabel}>`
- [ ] **H3** — Aggiungere `aria-hidden="true"` alle icone `<ArrowUp>`, `<ArrowDown>`, `<Minus>` in `renderChangeIndicator()` (o funzione analoga)

#### Gate H

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `grep 'role="img"' src/components/MonthlyComparisonChart.tsx` → 1 risultato
- [ ] `grep 'chartAriaLabel\|aria-label' src/components/MonthlyComparisonChart.tsx` → ≥ 1 risultato descrittivo
- [ ] `grep 'aria-hidden="true"' src/components/MonthlyComparisonChart.tsx` → ≥ 3 risultati (icone trend)

---

### Gate Fase 2

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → N/N passed (≥ BL2)
- [ ] `grep 'role="progressbar"' src/components/BudgetProgressCard.tsx src/components/BudgetForecastCard.tsx src/components/BudgetHistoryChart.tsx` → ≥ 3 risultati totali
- [ ] `grep 'role="img"' src/components/MonthlyComparisonChart.tsx` → 1 risultato
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## FASE 3 — Stati interattivi mancanti

> Prerequisito: Gate Fase 2 verificato.

### Passo I — `src/components/DashboardTab.tsx`: `aria-pressed` filtri categoria

> Perimetro: solo `DashboardTab.tsx`. Aggiungere `aria-pressed` — nessun'altra modifica.

- [ ] **I1** — Individuare il componente/elemento dei pulsanti filtro categoria nel JSX
- [ ] **I2** — Aggiungere `aria-pressed={activeFilter === category.value}` (o nome variabile analogo) a ogni pulsante filtro

#### Gate I

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `grep 'aria-pressed' src/components/DashboardTab.tsx` → ≥ 1 risultato

---

### Passo J — `src/components/PeriodSelector.tsx`: `aria-pressed` pulsanti periodo

> Perimetro: solo `PeriodSelector.tsx`. Aggiungere `aria-pressed` — nessun'altra modifica.

- [ ] **J1** — Aggiungere `aria-pressed={value === period.value}` a ogni `<Button>` periodo

#### Gate J

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `grep 'aria-pressed' src/components/PeriodSelector.tsx` → ≥ 1 risultato

---

### Gate Fase 3

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → N/N passed (≥ BL2)
- [ ] `grep 'aria-pressed' src/components/DashboardTab.tsx src/components/PeriodSelector.tsx` → ≥ 2 risultati totali
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## FASE 4 — Anomalie minori

> Prerequisito: Gate Fase 3 verificato.

### Passo K — `src/components/AuthScreen.tsx`: aria-hidden logo "Z" + fix errore

> Perimetro: solo `AuthScreen.tsx`.

- [ ] **K1** — Aggiungere `aria-hidden="true"` al `<div>` del logo "Z"
- [ ] **K2** — Aggiungere `aria-hidden={!error}` all'`<p role="alert">` del messaggio di errore

#### Gate K

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `grep 'aria-hidden="true"' src/components/AuthScreen.tsx` → ≥ 1 risultato (logo Z)
- [ ] `grep 'aria-hidden={!error}' src/components/AuthScreen.tsx` → ≥ 1 risultato

---

### Passo L — `src/components/OnboardingFlow.tsx`: `aria-busy` sulla Card

> Perimetro: solo `OnboardingFlow.tsx`.

- [ ] **L1** — Calcolare `const isSaving = isSavingName || isSavingCurrency || isSavingAccount || isCompleting`
- [ ] **L2** — Aggiungere `aria-busy={isSaving}` alla `<Card>` principale del componente

#### Gate L

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `grep 'aria-busy' src/components/OnboardingFlow.tsx` → ≥ 1 risultato

---

### Passo M — `AppHeader.tsx` e componenti Gruppo 6: `aria-hidden` icone decorative

> Perimetro: i 9 file elencati. Solo aggiunta di `aria-hidden="true"` sulle icone identificate nel report.

#### AppHeader.tsx

- [ ] **M-AppHeader-1** — Aggiungere `aria-busy={isLoading}` all'`<header>` o alla region del saldo

#### AudioSettings.tsx

- [ ] **M-Audio-1** — `getVolumeIcon()`: aggiungere `aria-hidden="true"` a `<SpeakerSlash>`, `<SpeakerLow>`, `<SpeakerHigh>` (o nomi analoghi)

#### DisplaySettings.tsx

- [ ] **M-Display-1** — Aggiungere `aria-hidden="true"` a `<Eye>`, `<Monitor>`, `<TextAa>`, `<Palette>` nelle intestazioni di sottosezione

#### HapticSettings.tsx

- [ ] **M-Haptic-1** — Aggiungere `aria-hidden="true"` a `<Vibrate>` nell'intestazione della card e nei pulsanti test

#### ScreenReaderSettings.tsx

- [ ] **M-SR-1** — Aggiungere `aria-hidden="true"` a `<TextAa>` e `<SpeakerHigh>` nelle intestazioni

#### TalkBackSettings.tsx

- [ ] **M-TB-1** — In `getConfidenceBadge()`: aggiungere `aria-hidden="true"` a `<CheckCircle>`, `<WarningCircle>`, `<Info>`

#### CategoryManagement.tsx

- [ ] **M-Cat-1** — Aggiungere `aria-hidden="true"` a `<Tag>`, `<TrendUp>`, `<TrendDown>` nelle intestazioni di sezione (non nei pulsanti con aria-label)

#### BudgetComparisonCard.tsx

- [ ] **M-BCC-1** — In `getTrendIcon()` (o funzione analoga): aggiungere `aria-hidden="true"` a `<TrendUp>`, `<TrendDown>`, `<Equals>`

#### KeyboardShortcutsHelp.tsx

- [ ] **M-KSH-1** — Aggiungere `aria-hidden="true"` a `<Keyboard>` nel `<DialogTitle>`

#### Gate M

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] Spot check: `grep -n 'aria-hidden' src/components/AudioSettings.tsx` → ≥ 1 risultato nella funzione icona volume
- [ ] Spot check: `grep -n 'aria-hidden' src/components/TalkBackSettings.tsx` → ≥ 1 nuovo risultato nelle badge di confidenza

---

### Passo N — `TransactionDialog.tsx`, `SecuritySettings.tsx`, `PinDialog.tsx`: pattern errore in DOM

> Perimetro: i 3 file elencati.

- [ ] **N-TD-1** — `TransactionDialog.tsx`: convertire `{error && <p role="alert">...</p>}` in elemento fisso con `aria-hidden={!error}`
- [ ] **N-SS-1** — `SecuritySettings.tsx`: stessa conversione per il `<p role="alert">` nel dialog PIN interno
- [ ] **N-PD-1** — `PinDialog.tsx`: stessa conversione + aggiornare `aria-describedby` sull'`<Input>` per includere sempre `"pin-error"` (l'elemento è ora sempre nel DOM)

#### Gate N

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → N/N passed (≥ BL2)
- [ ] `grep 'aria-hidden={!error}' src/components/TransactionDialog.tsx` → 1 risultato
- [ ] `grep 'aria-hidden={!error}' src/components/SecuritySettings.tsx` → 1 risultato
- [ ] `grep 'aria-hidden={!error}' src/components/PinDialog.tsx` → 1 risultato

---

### Gate Fase 4 (= Gate finale P37)

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → N/N passed (≥ BL2)
- [ ] `grep 'aria-hidden="true"' src/components/AudioSettings.tsx src/components/DisplaySettings.tsx src/components/HapticSettings.tsx` → ≥ 1 risultato per file
- [ ] `grep 'aria-hidden={!error}' src/components/TransactionDialog.tsx src/components/SecuritySettings.tsx src/components/PinDialog.tsx` → 3 risultati
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## Verifiche manuali NVDA (Gate finale)

- [ ] Navigare con Tab nella schermata di onboarding → tutti i campi letti con etichetta; il tasto M naviga al landmark main
- [ ] Navigare su una barra di progresso budget → NVDA annuncia "Nome budget: X% del budget utilizzato, barra di avanzamento"
- [ ] Aprire `AccountDialog`, navigare con Tab fino alla griglia tipo conto → le card sono raggiungibili; NVDA legge "tipo, selezionato/non selezionato, radio button"; Invio/Spazio selezionano
- [ ] Navigare sui pulsanti filtro in DashboardTab → NVDA legge "Bancari, premuto/non premuto, pulsante"
- [ ] Navigare sul grafico "Confronto Mensile" in ReportsTab → NVDA legge la descrizione testuale con i dati dei due mesi
- [ ] Navigare sui pulsanti periodo in PeriodSelector → NVDA legge "Mese, premuto/non premuto, pulsante"
