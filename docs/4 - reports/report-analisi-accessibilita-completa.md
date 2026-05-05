# Report — Analisi accessibilità completa Zecchino

**Data:** 5 maggio 2026
**Branch:** refactoring-architettura
**Agente:** Agent-Analyze

---

## Riepilogo esecutivo

Sono stati analizzati 31 componenti distribuiti in 7 gruppi funzionali. L'infrastruttura di accessibilità di base (live region globale in `screen-reader.ts`, hook `useScreenReader`, `SkipLink`, `FocusIndicator`) è solida e corretta: le live region vengono create una volta nel DOM all'avvio e non sono mai smontate condizionalmente; lo skip link punta correttamente all'id `main-content` presente in `App.tsx`; i tab principali hanno `role="tablist"`, `aria-selected`, `aria-controls` e `aria-labelledby` su ogni pannello. Sono emerse tuttavia **12 anomalie critiche** e **22 anomalie minori** su 31 componenti. Le criticità più gravi riguardano: le card di selezione del tipo di conto in `AccountDialog.tsx` e i template in `BudgetDialog.tsx`, non raggiungibili da tastiera; le barre di progresso personalizzate in `BudgetProgressCard.tsx`, `BudgetForecastCard.tsx` e `BudgetHistoryChart.tsx`, prive di `role="progressbar"` e attributi ARIA corrispondenti (probabile causa del "vuoto" riportato dall'utente); l'assenza di `aria-pressed` sui pulsanti filtro categoria in `DashboardTab.tsx` e sui pulsanti periodo in `PeriodSelector.tsx`; e l'assenza di un `role="img"` con `aria-label` sul grafico a barre di `MonthlyComparisonChart.tsx`. Le impostazioni (Gruppo 6) mostrano solo anomalie minori legate a icone decorative senza `aria-hidden`.

---

## Punteggio per gruppo

| Gruppo | Componenti | Anomalie critiche | Anomalie minori |
|--------|-----------|-------------------|-----------------|
| Autenticazione e primo avvio | 2 | 1 | 3 |
| Struttura principale | 2 | 0 | 2 |
| Schermate principali | 3 | 2 | 2 |
| Card informative | 10 | 5 | 4 |
| Dialog | 6 | 3 | 4 |
| Impostazioni | 7 | 0 | 6 |
| Utilità | 1 | 0 | 0 |
| **TOTALE** | **31** | **11** | **21** |

---

## Analisi per componente

---

### AuthScreen.tsx

**Checklist:**
- A1 — ✅ Tutti i campi input hanno `<Label htmlFor="...">` associato: `htmlFor="login-email"`, `htmlFor="login-password"`, `htmlFor="signup-email"`, ecc.
- A2 — ✅ `role="main"` sul wrapper principale: `<div ... role="main" aria-label="Schermata di autenticazione Zecchino">`
- A3 — ❌ Il div logo `<div className="mx-auto flex h-14 w-14 ... text-2xl font-bold text-primary-foreground ...">Z</div>` non ha `aria-hidden="true"`. Il testo "Z" è decorativo (il titolo "Accedi a Zecchino" è leggibile a parte) ma verrà letto dallo screen reader come carattere isolato.
- A4 — N/A (nessun pulsante icon-only)
- B1 — ✅ `emailRef.current?.focus()` attivato con `window.setTimeout` a 350 ms ad ogni cambio di `panel` (riga `useEffect(() => { const timer = window.setTimeout(() => { emailRef.current?.focus() }, 350) }, [panel])`)
- B2 — N/A (schermata full-page, non modale; nessun focus trap necessario)
- B3 — ✅ Ordine naturale dei campi di form (email → password → submit → link secondari)
- B4 — ✅ Tutti gli elementi interattivi sono nativi `<Input>` e `<Button>`
- C1 — ✅ `screenReader.announce(...)` chiamato con `'assertive'` ad ogni cambio pannello: `goToPanel('signup')`, `goToPanel('login')`, `goToPanel('recovery')`
- C2 — ✅ Elemento errore sempre in DOM con `role="alert" aria-live="assertive" aria-atomic="true"`: `<p ... role="alert" aria-live="assertive" aria-atomic="true">{error}</p>`
- C3 — ✅ Elemento successo con `aria-live="polite" aria-atomic="true"`: `<p ... aria-live="polite" aria-atomic="true">{successMessage}</p>`
- C4 — ❌ L'elemento errore è sempre renderizzato nel DOM anche quando `error` è stringa vuota. Il browser può notificare lo screen reader con un annuncio vuoto se il testo viene azzerato (`setError('')`), causando annunci inattesi.
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — N/A
- E2 — ✅ `<Button ... disabled={isLoading} aria-busy={isLoading}>` sia per login sia per signup
- E3 — ✅ `<div className="space-y-4" aria-busy={isLoading}>` sul form container
- E4 — N/A

**Anomalie trovate:**
- **A3 minore:** Il div `<div ...>Z</div>` del logo non ha `aria-hidden="true"`. Lo screen reader legge "Z" come contenuto prima di leggere il titolo card "Accedi a Zecchino", creando ridondanza confusa.
- **C4 minore:** L'elemento `<p role="alert">` è sempre presente nel DOM con `{error}`. Quando `setError('')` viene chiamato per azzerare l'errore, il testo cambia da un valore a stringa vuota, rischiando annunci vuoti indesiderati.

---

### OnboardingFlow.tsx

**Checklist:**
- A1 — ✅ `<Label htmlFor="onboarding-name">`, `<Label htmlFor="onboarding-currency">`, `<Label htmlFor="account-name">`, `<Label htmlFor="initial-balance">` presenti nei rispettivi step
- A2 — ❌ Nessun landmark (`role="main"` o `<main>`) sul wrapper del flusso di onboarding. La Card non ha ruolo semantico; il contenuto risulta fuori da qualsiasi landmark nella struttura `AppContent` (che non monta il `<main id="main-content">` per `needsOnboarding`)
- A3 — N/A (nessuna icona decorativa rilevante nel flusso principale)
- A4 — N/A
- B1 — ✅ `titleRef.current?.focus()` chiamato ogni volta che `currentStep` cambia: `useEffect(() => { ... titleRef.current?.focus() }, [currentStep, screenReader])`
- B2 — N/A (non modale)
- B3 — ✅ Progressione lineare passo-passo
- B4 — ✅ Tutti i controlli sono nativi
- C1 — ✅ `screenReader.announceProgress(currentStep, TOTAL_STEPS, STEP_LABELS[currentStep - 1])` chiamato ad ogni cambio passo
- C2 — ✅ Errori presentati con `<p role="alert" className="text-sm text-destructive">{nameError}</p>` e analoghi
- C3 — N/A (annunci di successo passano per `screenReader.announceSuccess()` tramite live region globale)
- C4 — N/A (le live region sono quelle globali di `screen-reader.ts`, sempre presenti nel DOM)
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — N/A
- E2 — ✅ Button `disabled={isSavingName}`, `disabled={isSavingCurrency}`, ecc.
- E3 — ❌ Nessun `aria-busy` sul contenuto della Card durante i salvataggi (isSavingName, isSavingCurrency, isSavingAccount, isCompleting). Il cambio di testo del pulsante ("Salvataggio..." → "Avanti") non è sufficiente come indicatore di stato per i non vedenti.
- E4 — N/A

**Anomalie trovate:**
- **A2 critica:** L'intera schermata di onboarding è renderizzata direttamente in `App.tsx` senza un wrapper `<main>` o `role="main"`. Quando `needsOnboarding` è true, l'`AppContent` renderizza solo `<OnboardingFlow />` senza la struttura `<main id="main-content">`. Lo screen reader non può navigare a un landmark "main".
- **E3 minore:** Nessun `aria-busy` sul contenitore Card durante le operazioni asincrone di salvataggio (nome, valuta, conto). Lo stato di caricamento è comunicato solo visualmente (testo pulsante).
- **C4 minore:** Gli errori di passo (nameError, currencyError, ecc.) sono renderizzati condizionalmente con `{nameError ? <p role="alert">...</p> : null}`, quindi non sempre presenti nel DOM. Questo non viola C4 perché si usa la live region globale, ma la coerenza del pattern potrebbe essere migliorata.

---

### AppHeader.tsx

**Checklist:**
- A1 — ✅ Pulsante scorciatoie ha `aria-label` esaustivo: `aria-label="Mostra scorciatoie da tastiera. Apre finestra di dialogo con elenco comandi tastiera disponibili."`; saldo totale ha `aria-label={`Saldo totale: ${formatCurrency(totalBalance)}`}`
- A2 — ✅ `role="banner"` sull'`<header>`; `role="alert" aria-live="assertive"` sul banner offline; `role="region" aria-label="Informazioni saldo e azioni rapide"` sul contenitore destra
- A3 — ✅ `<span ... aria-hidden="true">Z</span>` nel logo; `<Keyboard ... aria-hidden="true" />` nella toolbar; `<WarningCircle ... aria-hidden="true" />` nel banner offline; `<ArrowCounterClockwise ... aria-hidden="true" />` nel pulsante aggiorna
- A4 — ✅ Il pulsante tastiera (icon-only) ha `aria-label` completo
- B1 — N/A
- B2 — N/A
- B3 — ✅ Ordine logico: logo → saldo totale → pulsante scorciatoie
- B4 — ✅ `<Button>` nativo
- C1 — N/A (non ha logica di annuncio propria; le modifiche del saldo vengono annunciate dal context)
- C2 — ✅ `role="alert" aria-live="assertive"` sul banner offline
- C3 — ✅ `role="status" aria-live="polite" aria-atomic="true"` sul display del saldo totale
- C4 — ✅ Banner offline presente solo quando offline; elemento saldo sempre presente
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — ✅ `aria-label={`Saldo totale: ${formatCurrency(totalBalance)}`}` comunica valore e contesto
- E1 — N/A
- E2 — ✅ `<Button ... disabled={isOffline || isLoading}>` sul pulsante Aggiorna
- E3 — ❌ Nessun `aria-busy` sull'header o sul suo container durante `isLoading`. Il pulsante "Aggiorna ora" è disabilitato ma l'header non comunica allo screen reader che un caricamento è in corso.
- E4 — N/A

**Anomalie trovate:**
- **E3 minore:** `isLoading` viene usato solo per disabilitare il pulsante, ma manca `aria-busy` sull'elemento `<header>` o sul container durante l'operazione di refresh.

---

### DialogsOverlay.tsx

**Checklist:**
- A1 — ✅ Tutti i dialog figlio gestiscono le proprie etichette; `AlertDialog` ha `<AlertDialogTitle>` e `<AlertDialogDescription>`
- A2 — ✅ `<AlertDialog>` usa `role="alertdialog"` internamente (Radix UI); i titoli identificano il dialog
- A3 — N/A
- A4 — N/A
- B1 — ❌ L'`AlertDialog` di conferma eliminazione non esegue un focus esplicito all'apertura; si affida al comportamento predefinito di Radix. Non è presente una chiamata a `screenReader.announceDialogOpen()` per questo dialog.
- B2 — ✅ Radix UI `AlertDialog` fornisce focus trap nativo
- B3 — ✅ Focus va su pulsante "Annulla" (default Radix)
- B4 — ✅ Pulsanti nativi
- C1 — ❌ Nessuna chiamata a `screenReader.announceDialogOpen()` per l'`AlertDialog` di conferma eliminazione. Quando `showDeleteDialog` diventa `true`, non viene emesso alcun annuncio esplicito oltre al cambio di visibilità del dialog.
- C2 — N/A (non ha messaggi di errore propri)
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **B1 minore:** L'`AlertDialog` di conferma eliminazione non ha una chiamata esplicita a `screenReader.announceDialogOpen()` all'apertura, a differenza degli altri dialog dell'app.
- **C1 minore:** Assenza di annuncio vocale esplicito quando il dialog di conferma eliminazione si apre.

---

### DashboardTab.tsx

**Checklist:**
- A1 — ✅ Pulsanti azione con `aria-label` dettagliati: `aria-label="Aggiungi nuovo movimento. Apre finestra di dialogo..."`, `aria-label="Aggiungi nuovo conto..."`, `aria-label="Sblocca conto privato..."`; pulsanti Modifica/Elimina nelle transazioni recenti con `aria-label="Modifica movimento"` e `aria-label="Elimina movimento"`
- A2 — ✅ `role="tabpanel" aria-labelledby="dashboard-tab"` sull'elemento radice; `role="group" aria-label="Azioni rapide conti e movimenti"` sul gruppo pulsanti; `role="button"` sulle righe transazione
- A3 — ✅ Icone in pulsanti azione con `aria-hidden="true"`; icone pulsanti Modifica/Elimina non hanno `aria-hidden` — ❌
- A4 — ✅ Tutti i pulsanti icon-only hanno `aria-label`
- B1 — N/A (tab, non schermata standalone)
- B2 — N/A
- B3 — ✅ Ordine logico: titolo → azioni → filtri → conti → movimenti recenti
- B4 — ✅ Rover tabindex sulle righe transazione (solo la focalizzata ha `tabIndex=0`, le altre `-1`)
- C1 — ✅ `screenReader.announceNavigation()` e `screenReader.announceCount()` chiamati in `App.tsx` al cambio tab verso Dashboard
- C2 — N/A
- C3 — N/A
- C4 — ✅ Live region globali sempre nel DOM
- D1 — N/A
- D2 — N/A
- D3 — ✅ Righe transazione con `role="button"` e `aria-label` completo con tipo, importo, data, conto
- D4 — ✅ `aria-label` include tipo (Entrata/Uscita/Trasferimento) e importo formattato
- E1 — ❌ I pulsanti filtro categoria (`Mostra tutto`, `Bancari`, `Digitali`, ecc.) mostrano stato attivo/inattivo solo visualmente (variant del pulsante) ma non hanno `aria-pressed` o `aria-selected`. Lo screen reader non comunica quale filtro è attivo.
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **E1 critica:** I pulsanti filtro categoria (toggle "Mostra tutto", "Bancari", "Digitali", "Risparmio", "Investimenti", "Privato") non hanno `aria-pressed`. Il loro stato attivo è comunicato solo attraverso il `variant` visivo del pulsante. Un utente non vedente non sa quali filtri sono attivi.
- **A3 minore:** `<PencilSimple size={18} />` e `<Trash size={18} />` all'interno dei pulsanti Modifica/Elimina nelle righe transazione non hanno `aria-hidden="true"`. Poiché il pulsante ha già `aria-label`, le icone vengono ignorate dallo screen reader per attributo di default, ma la presenza di testo alternativo potrebbe variare tra browser.

---

### TransactionsTab.tsx

**Checklist:**
- A1 — ✅ Pulsante "Esporta CSV" con `aria-label="Esporta movimenti in formato CSV. Scorciatoia: Control più E"`; pulsante "Nuovo Movimento" con `aria-label`; pulsanti Modifica/Elimina con `aria-label="Modifica movimento"` e `aria-label="Elimina movimento"`
- A2 — ✅ `role="tabpanel" aria-labelledby="transactions-tab"`; `role="group" aria-label="Azioni movimenti"`; `role="region" aria-label="Lista movimenti" aria-live="polite"`; `role="button"` su ogni riga transazione; `role="note"` sul badge istruzioni navigazione
- A3 — ✅ Icone azione nei pulsanti; `<PencilSimple>` e `<Trash>` non hanno `aria-hidden` — ❌ (stesso problema di DashboardTab)
- A4 — ✅ Tutti i pulsanti icon-only con `aria-label`
- B1 — N/A
- B2 — N/A
- B3 — ✅
- B4 — ✅ Rover tabindex (solo focalizzata con `tabIndex=0`)
- C1 — ✅ `screenReader.announceNavigation()` e `announceCount('movimenti', ...)` in App.tsx al cambio tab
- C2 — N/A
- C3 — N/A
- C4 — ✅
- D1 — N/A
- D2 — N/A
- D3 — ✅ Righe con `role="button"` e `aria-label` completo
- D4 — ✅ Importo incluso nel contesto dell'`aria-label`
- E1 — N/A
- E2 — N/A
- E3 — ❌ Nessun `aria-busy` sulla regione lista durante il caricamento dati
- E4 — N/A

**Anomalie trovate:**
- **E3 minore:** `role="region" aria-label="Lista movimenti"` non ha `aria-busy` durante eventuali aggiornamenti dati.
- **A3 minore:** `<PencilSimple size={18} />` e `<Trash size={18} />` nei pulsanti icon senza `aria-hidden`.

---

### ReportsTab.tsx

**Checklist:**
- A1 — ✅ Pulsanti "Nuovo Budget" e "Nuovo Obiettivo" hanno testo visibile; card statistiche con `aria-label` e `role="article"` o `data-focus-info`
- A2 — ✅ `role="tabpanel" aria-labelledby="reports-tab"`; `role="region" aria-label="Statistiche finanziarie principali"`; `role="article"` sulle card
- A3 — ✅ Icone decorative (`<Target>`, `<PiggyBank>`, `<Gear>`) nel corpo del testo non hanno `aria-hidden` — ❌
- A4 — N/A (tutti i pulsanti hanno testo visibile)
- B1 — N/A
- B2 — N/A
- B3 — ✅
- B4 — ✅
- C1 — ✅ Annuncio navigazione in App.tsx con totale entrate/uscite al cambio tab; `MonthlyComparisonChart` e le card sub-componenti gestiscono i propri annunci
- C2 — N/A
- C3 — N/A
- C4 — ✅
- D1 — N/A (barre di progresso nei sub-componenti)
- D2 — ❌ `<MonthlyComparisonChart>` non ha `role="img"` o `aria-label` sul grafico BarChart: il contenitore `<ResponsiveContainer>` è usato direttamente senza wrapper con `role="img"` e testo descrittivo. A differenza di `IncomeExpenseChart` che ha `<div role="img" aria-label={chartAriaLabel}>`, `MonthlyComparisonChart` non ha questo wrapper.
- D3 — ✅ Sezione "Dettaglio Conti" elenca conti con nome e saldo; `<BudgetProgressCard>` e altri hanno annotazioni ARIA proprie
- D4 — ✅ I valori numerici nelle card statistiche sono in `aria-label` con contesto
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **D2 critica:** `MonthlyComparisonChart` non ha un wrapper `<div role="img" aria-label="...">` attorno al `<ResponsiveContainer>/<BarChart>`. Il testo alternativo con dati numerici è presente nelle card di riepilogo testuale sopra il grafico, ma il grafico stesso non è identificabile dallo screen reader come immagine con descrizione.
- **A3 minore:** Icone `<Target size={24}>`, `<PiggyBank size={24}>`, `<Gear size={24}>` usate come decorazione nelle intestazioni di sezione non hanno `aria-hidden="true"`.

---

### AccountCard.tsx

**Checklist:**
- A1 — ✅ `aria-label={ariaLabel}` completo sul `<Card>`: `"${account.nome}, ${ACCOUNT_TYPE_LABELS[account.tipo]}, saldo ${formatCurrency(balance)}. Premi per aprire dettagli."` quando cliccabile
- A2 — ✅ `role={onClick ? 'button' : 'article'}` sul Card; `role="img" aria-label="Tipo conto: ..."` sul div icona tipo conto
- A3 — ✅ `<Icon ... aria-hidden="true" />` nell'icona tipo conto; div gradienti decorativi senza testo
- A4 — N/A (nessun pulsante icon-only standalone)
- B1 — N/A
- B2 — N/A
- B3 — ✅
- B4 — ✅ `tabIndex={onClick ? 0 : undefined}`; `onKeyDown` che gestisce Enter e Space
- C1 — N/A (la card è statica; gli annunci avvengono al clic attraverso il dialog sottostante)
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — ✅ `aria-roledescription="carta conto interattiva"` aiuta contestualizzare
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
Nessuna

---

### BudgetAlertBanner.tsx

**Checklist:**
- A1 — ✅ Pulsante "Chiudi notifica" con `aria-label="Chiudi notifica"`; pulsante "Visualizza Budget" ha testo visibile
- A2 — ✅ `role="region" aria-label="Avvisi budget" aria-live="polite"` sul wrapper; ogni Card con `role="alert" aria-live="assertive"` e `aria-label` descrittivo
- A3 — ✅ `<Warning ... aria-hidden="true" />`, `<TrendUp ... aria-hidden="true" />`, `<Target ... aria-hidden="true" />` su tutti i status icon; `<X size={14} />` nel pulsante Chiudi — il div icona container ha `aria-hidden="true"` esplicito
- A4 — ✅ Pulsante X ha `aria-label="Chiudi notifica"`
- B1 — N/A
- B2 — N/A
- B3 — ✅
- B4 — ✅
- C1 — ✅ `role="alert" aria-live="assertive"` su ogni card garantisce annuncio automatico all'apparizione
- C2 — ✅ `role="alert"` con `aria-live="assertive"` per `level === 'exceeded'`
- C3 — ✅ `role="region" aria-live="polite"` sul wrapper per avvisi non urgenti
- C4 — ✅ Il wrapper `role="region"` è sempre nel DOM quando il componente è montato (reso condizionalmente solo da `alerts.length === 0`)
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — ✅ `aria-label` su ogni Card include importo speso, target e remaining
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
Nessuna

---

### BudgetComparisonCard.tsx

**Checklist:**
- A1 — N/A (nessun elemento interattivo; le sezioni `cursor-help` sono tooltip, non pulsanti)
- A2 — ✅ Card con `<CardTitle>` e `<CardDescription>` identificative; `role` non esplicito (card di sola lettura)
- A3 — ❌ `{getTrendIcon()}` ritorna `<TrendUp>`, `<TrendDown>` o `<Equals>` senza `aria-hidden="true"`. I componenti icona di Phosphor non hanno aria-hidden di default. Lo screen reader potrebbe leggere l'icona SVG come elemento sconosciuto o saltarla, ma non è garantito.
- A4 — N/A
- B1 — N/A
- B2 — N/A
- B3 — N/A
- B4 — N/A (solo tooltip)
- C1 — N/A
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A (dati testuali presenti)
- D3 — N/A
- D4 — ✅ I valori monetari sono sempre accompagnati da etichette testuali ("Periodo Corrente", "Periodo Precedente", "Speso:", ecc.)
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **A3 minore:** `{getTrendIcon()}` restituisce icone (`<TrendUp>`, `<TrendDown>`, `<Equals>`) senza `aria-hidden="true"`. Queste icone sono puramente decorative (il testo `getTrendLabel()` le descrive verbalmente).

---

### BudgetForecastCard.tsx

**Checklist:**
- A1 — N/A (nessun elemento interattivo diretto; Badge con tooltip)
- A2 — ✅ Card con `<CardTitle>` e `<CardDescription>`
- A3 — ❌ `{forecast.willExceedBudget && <Warning size={18} weight="duotone" className="text-destructive" />}` senza `aria-hidden="true"`; `<ChartLine size={24} ...>` nel titolo senza `aria-hidden`; `<TrendUp>` e `<TrendDown>` nei div confronto storico senza `aria-hidden`
- A4 — N/A
- B1 — N/A
- B2 — N/A
- B3 — N/A
- B4 — N/A
- C1 — N/A
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — ❌ La barra di progresso "Proiezione vs Budget": `<div className="w-full bg-muted rounded-full h-2 overflow-hidden"><div ... style={{ width: `${Math.min(forecast.projectedPercentage, 100)}%` }} /></div>` non ha `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` né `aria-label`. Il valore percentuale è scritto testualmente sopra la barra ma non è collegato semanticamente.
- D2 — N/A
- D3 — N/A
- D4 — ✅ I valori numerici (giorni trascorsi, rimasti, medie) hanno etichette testuali
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **D1 critica:** Barra di progresso "Proiezione vs Budget" senza `role="progressbar"` né attributi `aria-value*`. Lo screen reader non annuncia il valore della barra e, se vi naviga tramite Tab, legge un elemento vuoto ("blank" o "vuoto").
- **A3 minore:** Icone `<Warning>`, `<ChartLine>`, `<TrendUp>`, `<TrendDown>`, `<CheckCircle>` prive di `aria-hidden="true"`.

---

### BudgetHistoryChart.tsx

**Checklist:**
- A1 — N/A (nessun elemento interattivo standalone; le righe periodo hanno tooltip)
- A2 — ✅ Card con `<CardTitle>` e `<CardDescription>`
- A3 — ❌ `{getTrendIcon()}` (TrendUp/TrendDown/Minus) senza `aria-hidden`; `<Target size={20}>` nel CardTitle senza `aria-hidden`
- A4 — N/A
- B1 — N/A
- B2 — N/A
- B3 — N/A
- B4 — N/A (righe periodo con `cursor-pointer` ma nessun `role`, `tabIndex` né `aria-label` — sono div clickable privi di ARIA)
- C1 — N/A
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — ❌ Barre periodo renderizzate come `<div className="relative w-full bg-muted rounded-full h-8 overflow-hidden">` senza `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. Il testo percentuale è sovrastampato sulla barra (`<span ... className="absolute inset-0 flex items-center ...">`) ma non è un `aria-label` né è associato alla barra.
- D2 — ✅ I dati storici sono leggibili attraverso il testo (label periodo, importo speso, Badge con percentuale)
- D3 — N/A
- D4 — ✅ Importi con etichette contestuali
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **D1 critica:** Le barre periodo sono `<div>` custom senza `role="progressbar"` né attributi ARIA. I div con `cursor-pointer` (riga periodo) non hanno `role`, `tabIndex` né `aria-label`, quindi non sono raggiungibili da tastiera né leggibili dallo screen reader come elementi interattivi.
- **A3 minore:** `<Target size={20}>` nel titolo, icone trend (TrendUp/TrendDown/Minus), `<Target>` nei Badge — nessuna ha `aria-hidden="true"`.

---

### BudgetProgressCard.tsx

**Checklist:**
- A1 — ✅ `aria-label` completo sulla Card con nome budget, periodo, scope, stato, speso, target, rimanente; pulsanti Modifica/Elimina con `aria-label`
- A2 — ✅ `role="article" aria-label={ariaLabel} aria-roledescription="carta budget"`; div status con `role="status"` e `aria-label`
- A3 — ❌ `{getStatusIcon()}` restituisce `<Warning>`, `<TrendUp>`, `<TrendDown>` o `<Target>` senza `aria-hidden="true"`; div gradienti decorativi con `aria-hidden="true"` ✅
- A4 — ✅ Pulsanti Modifica/Elimina con `aria-label`
- B1 — N/A
- B2 — N/A
- B3 — ✅
- B4 — ✅ Pulsanti Modifica/Elimina accessibili da tastiera
- C1 — N/A
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — ❌ `<div className="w-full bg-gradient-to-r from-muted ... h-4 overflow-hidden shadow-inner"><div className={...} style={{ width: `${Math.min(percentage, 100)}%` }} /></div>` — div progressbar senza `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`. Il valore percentuale è leggibile nel `aria-label` della Card, ma la barra in sé è muta.
- D2 — N/A
- D3 — N/A
- D4 — ✅ Card `aria-label` include "Speso X su Y"
- E1 — N/A
- E2 — ✅ `!budget.attivo && 'opacity-60'` — Badge "Inattivo" presente; nessun `aria-disabled` esplicito
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **D1 critica:** La barra di progresso centrale (larghezza CSS variabile) non ha `role="progressbar"` né `aria-valuenow/min/max/label`. Se uno screen reader naviga alla barra, la legge come elemento vuoto.
- **A3 minore:** `{getStatusIcon()}` — `<Warning>`, `<TrendUp>`, `<TrendDown>`, `<Target>` — senza `aria-hidden="true"`.

---

### SavingsGoalCard.tsx

**Checklist:**
- A1 — ✅ `aria-label={ariaLabel}` completo sulla Card: nome, stato, risparmiato, target, rimanente, scadenza; `aria-label="Modifica obiettivo"` e `aria-label="Elimina obiettivo"` sui pulsanti
- A2 — ✅ `role="article" aria-roledescription="carta obiettivo di risparmio"`; div icona con `role="img" aria-label="Icona obiettivo: ..."`; div stato scadenza con `role="status"`; regione proiezioni con `role="region"`
- A3 — ✅ `<Icon ... aria-hidden="true" />` dentro il div `role="img"` (anche senza aria-hidden l'icona è dentro un elemento `role="img"` che fornisce il testo alternativo); div gradienti decorativi con `aria-hidden="true"`
- A4 — ✅ Pulsanti Modifica/Elimina con `aria-label`
- B1 — N/A
- B2 — N/A
- B3 — ✅
- B4 — ✅
- C1 — N/A
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — ✅ `role="progressbar" aria-valuenow={Math.round(progress.percentage)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso obiettivo: X%"` sulla barra progresso
- D2 — N/A
- D3 — N/A
- D4 — ✅ `role="status" aria-label="Importo risparmiato: X"` sull'importo; status per proiezioni settimanali/mensili con `aria-label`
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
Nessuna

---

### IncomeExpenseChart.tsx

**Checklist:**
- A1 — N/A (nessun elemento interattivo fuori dai badge di riepilogo)
- A2 — ✅ `<Card role="region" aria-label={chartAriaLabel}>` con valore testuale completo (entrate totali, uscite totali, saldo netto per il periodo)
- A3 — N/A
- A4 — N/A
- B1 — N/A
- B2 — N/A
- B3 — N/A
- B4 — N/A
- C1 — N/A
- C2 — N/A
- C3 — ✅ `role="status" aria-live="polite"` sui badge di riepilogo
- C4 — N/A
- D1 — N/A
- D2 — ✅ `<div role="img" aria-label={chartAriaLabel}>` wrappa `<ResponsiveContainer>/<AreaChart>` fornendo un'alternativa testuale accessibile. Lo stato vuoto usa `role="status" aria-label="Nessun dato disponibile per il periodo selezionato"`.
- D3 — N/A
- D4 — ✅ Etichette entrate e uscite nel summary
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
Nessuna

---

### MonthlyComparisonChart.tsx

**Checklist:**
- A1 — N/A (nessun elemento interattivo)
- A2 — ✅ Card con `<CardTitle>` "Confronto Mensile" e `<CardDescription>` con i nomi dei mesi
- A3 — ✅ `<ArrowUp>`, `<ArrowDown>`, `<Minus>` in `renderChangeIndicator()` senza `aria-hidden` — ❌
- A4 — N/A
- B1 — N/A
- B2 — N/A
- B3 — N/A
- B4 — N/A
- C1 — N/A
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — ❌ `<ResponsiveContainer>/<BarChart>` usato direttamente senza un wrapper `<div role="img" aria-label="...">` con dati testuali. A differenza di `IncomeExpenseChart` che usa `<div role="img" aria-label={chartAriaLabel}>`, qui il grafico a barre non è accessibile come immagine con descrizione. I dati testuali (mese corrente, precedente) sono sopra il grafico ma non collegati a esso.
- D3 — N/A
- D4 — ✅ I tre blocchi (Entrate, Uscite, Saldo Netto) mostrano valori corrente e precedente con etichette
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **D2 critica:** Il `<BarChart>` in `<ResponsiveContainer>` non è wrapped in un `<div role="img" aria-label="...">` con descrizione dei dati. Lo screen reader non può interpretare il grafico a barre e non ha un'alternativa testuale associata al grafico stesso.
- **A3 minore:** `<ArrowUp size={16}>`, `<ArrowDown size={16}>`, `<Minus size={16}>` in `renderChangeIndicator()` senza `aria-hidden="true"`. Sono decorativi (il testo seguente li descrive).

---

### PeriodSelector.tsx

**Checklist:**
- A1 — N/A (testo visibile in tutti i pulsanti)
- A2 — N/A (gruppo di pulsanti senza struttura formale)
- A3 — N/A (nessuna icona)
- A4 — N/A
- B1 — N/A
- B2 — N/A
- B3 — ✅ Pulsanti in ordine logico
- B4 — ✅ Pulsanti `<Button>` nativi
- C1 — ✅ `screenReader.announcePeriodChange(periodLabel)` chiamato ad ogni selezione
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — ❌ I pulsanti periodo (Settimana, Mese, 3 Mesi, 6 Mesi, Anno) mostrano stato selezionato solo visivamente (`variant={value === period.value ? 'default' : 'outline'}`). Non hanno `aria-pressed` né `aria-current`. Lo screen reader non sa quale periodo è attivo.
- E2 — N/A
- E3 — N/A
- E4 — ❌ Stessa anomalia di E1: nessun `aria-pressed` né `aria-current` sul pulsante attivo

**Anomalie trovate:**
- **E1/E4 critica:** Nessun `aria-pressed` né `aria-current` sui pulsanti periodo. Il pulsante selezionato è distinguibile solo visivamente; uno screen reader non può determinare quale periodo è correntemente attivo.

---

### AccountDialog.tsx

**Checklist:**
- A1 — ✅ `<Label htmlFor="account-name">`, `<Label htmlFor="initial-balance">` con `<Input id="...">` corrispondenti; `<Label>Tipo di Conto</Label>` introduttivo alla griglia
- A2 — ✅ `aria-labelledby="account-dialog-title"` su `<DialogContent>`; Dialog usa `role="dialog"` internamente (Radix)
- A3 — ❌ Icone tipo conto (`<Icon size={28} weight="duotone">`) dentro ogni Card tipo non hanno `aria-hidden`; le Card stesse non hanno `role` né etichette ARIA
- A4 — ❌ Le Card di selezione tipo conto sono elementi interattivi (onClick per selezionare il tipo) ma senza `aria-label`, senza `role="radio"`, senza `aria-checked`
- B1 — ✅ `nameInputRef.current?.focus()` con `setTimeout` a 100 ms all'apertura del dialog
- B2 — ✅ Focus trap gestito da Radix UI `<Dialog>`
- B3 — ✅ nome → tipo conto → saldo iniziale → submit
- B4 — ❌ Le Card di selezione tipo conto sono `<div>` con `onClick` ma senza `tabIndex`, senza `role` interattivo, senza `onKeyDown`. Non sono raggiungibili da tastiera.
- C1 — ❌ Nessuna chiamata a `screenReader.announceDialogOpen()` in AccountDialog (a differenza di TransactionDialog)
- C2 — ✅ `<p className="..." role="alert">{error}</p>` renderizzato condizionalmente su errore
- C3 — N/A
- C4 — ❌ L'elemento errore `<p role="alert">{error}</p>` è renderizzato condizionalmente (`{error && ...}`), quindi non sempre presente nel DOM
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — ❌ Nessun `aria-checked` né `aria-selected` sulle Card tipo conto; la selezione attiva è indicata solo visivamente con `ring-2 ring-primary bg-primary/5`
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **A4+B4 critica:** Le Card di selezione tipo conto (bancario, prepagata, contanti, ecc.) sono `<Card onClick={...}>` senza `tabIndex`, `role="radio"`, `aria-checked`, né `onKeyDown`. Non sono raggiungibili da tastiera. Un utente che naviga con Tab non può selezionare il tipo di conto.
- **E1 critica:** `ring-2 ring-primary` indica visivamente il tipo selezionato, ma non c'è `aria-checked` né `aria-selected`. Lo screen reader non sa quale tipo è selezionato.
- **C1 minore:** Nessuna chiamata a `screenReader.announceDialogOpen()` all'apertura del dialog.

---

### BudgetDialog.tsx

**Checklist:**
- A1 — ✅ `<Label htmlFor="...">` per i campi form nel secondo step (nome, importo, tipo, categoria, ecc.)
- A2 — ✅ `<DialogContent>` usa Radix `role="dialog"` con `<DialogTitle>` e `<DialogDescription>`
- A3 — ❌ `<Icon size={24}>` nei template Card senza `aria-hidden`; `<Lightbulb>` senza `aria-hidden`
- A4 — ❌ Template Card cliccabili senza `aria-label`, senza `role`, senza `tabIndex`, senza keyboard handler
- B1 — ❌ Nessuna chiamata `focus()` esplicita all'apertura (solo `soundSystem.play('dialog-open')`); Radix UI mette il focus sul primo elemento focusabile, che potrebbe essere un pulsante "Annulla" e non il contenuto rilevante
- B2 — ✅ Focus trap Radix
- B3 — ✅
- B4 — ❌ Le Card template non sono raggiungibili da tastiera (stessa anomalia di AccountDialog)
- C1 — ❌ Nessuna chiamata `screenReader.announceDialogOpen()`
- C2 — N/A (nessun messaggio errore in BudgetDialog; submit con `parseFloat` silenzioso su errore)
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — N/A (RadioGroup per tipo budget nel secondo step: usa `<RadioGroupItem>` nativi ✅)
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **B4 critica:** Le Card template di budget (griglia nel primo step) sono `<Card onClick={...}>` senza `tabIndex`, `role="button"` né `onKeyDown`. Non raggiungibili da tastiera.
- **C1 minore:** Nessuna chiamata a `screenReader.announceDialogOpen()` all'apertura.
- **A3 minore:** `<Icon>` e `<Lightbulb>` senza `aria-hidden`.

---

### TransactionDialog.tsx

**Checklist:**
- A1 — ✅ `<Label htmlFor="transaction-date">`, `<Label htmlFor="...">` e `<RadioGroupItem>` con `<Label htmlFor="tipo-entrata">`, ecc. su tutti i campi
- A2 — ✅ `aria-labelledby="transaction-dialog-title"` su `<DialogContent>`
- A3 — N/A (RadioGroup usa testo, non icone)
- A4 — N/A
- B1 — ✅ `amountInputRef.current?.focus()` con `setTimeout` 100 ms all'apertura (solo per nuovi movimenti)
- B2 — ✅ Radix focus trap
- B3 — ✅ tipo → importo → conto → categoria → descrizione → ricorrenza → submit
- B4 — ✅ Tutti i controlli nativi (Input, Select, Checkbox, RadioGroup)
- C1 — ✅ `announceDialogOpen(dialogTitle)` chiamato in `useEffect` su `open`
- C2 — ✅ `useEffect` che chiama `announceFormError(fieldName, error)` quando l'errore cambia; elemento `<p role="alert">{error}</p>` condizionale
- C3 — N/A
- C4 — ❌ `{error && <p className="text-sm text-destructive" role="alert">{error}</p>}` è renderizzato condizionalmente. Quando l'errore viene azzerato, l'elemento scompare dal DOM. Gli annunci però passano anche per `announceFormError()` via live region globale.
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — ✅ `<RadioGroup>` con `<RadioGroupItem>` nativi per il tipo movimento; `<Checkbox>` nativo per ricorrente
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **C4 minore:** `<p role="alert">{error}</p>` renderizzato condizionalmente (`{error && ...}`). L'annuncio via live region globale (`announceFormError`) compensa, ma la coerenza dell'elemento fisso nel DOM è preferibile per alcuni screen reader.

---

### SavingsGoalDialog.tsx

**Checklist:**
- A1 — ✅ `<Label htmlFor="goal-name">`, `<Label htmlFor="goal-description">`, `<Label htmlFor="goal-target">`, `<Label htmlFor="goal-current">`, `<Label htmlFor="goal-deadline">`, `<Label htmlFor="goal-account">` su tutti i campi
- A2 — ✅ `<DialogContent>` con Radix `role="dialog"` e `<DialogTitle>` + `<DialogDescription>`
- A3 — ❌ `<Icon size={28}>` dentro ogni `<button>` del selettore icona ha `title={name}` ma nessun `aria-hidden`; l'icona viene esposta allo screen reader
- A4 — ❌ I pulsanti del selettore icona (`<button type="button" ... title={name}>`) usano solo `title={name}` come alternativa testuale. `title` non è annunciato da tutti gli screen reader su tutti i browser; manca `aria-label={name}`.
- B1 — ❌ Nessuna chiamata `focus()` esplicita all'apertura del dialog (solo `soundSystem.play('dialog-open')`). Radix posiziona il focus sul primo elemento focusabile, che è il primo pulsante icona nel selettore, non il campo nome.
- B2 — ✅ Radix focus trap
- B3 — ✅ icona → nome → descrizione → importo target → importo attuale → scadenza → conto → submit
- B4 — ✅ I pulsanti icona sono `<button>` e sono raggiungibili da Tab
- C1 — ❌ Nessuna chiamata `screenReader.announceDialogOpen()` all'apertura
- C2 — N/A (nessun messaggio errore esplicito nel JSX; il submit fallisce silenziosamente con `if (isNaN(targetAmount) || targetAmount <= 0) { return }`)
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **B1 critica:** All'apertura del dialog il focus va sul primo pulsante del selettore icona (comportamento default Radix), non sul campo "Nome Obiettivo" che è il primo campo significativo. Manca `focus()` esplicito sull'input nome.
- **A4 minore:** I pulsanti del selettore icona usano `title={name}` anziché `aria-label={name}`. L'attributo `title` non è sempre annunciato da NVDA.
- **C1 minore:** Nessuna chiamata `screenReader.announceDialogOpen()`.

---

### PinDialog.tsx

**Checklist:**
- A1 — ✅ `<Label htmlFor="pin">` e `<Input id="pin">`; `<Label htmlFor="confirm-pin">` e `<Input id="confirm-pin">` in modalità confirm
- A2 — ✅ `aria-labelledby="pin-dialog-title" aria-describedby="pin-dialog-description"` su `<DialogContent>`; `<DialogTitle id="pin-dialog-title">` e `<DialogDescription id="pin-dialog-description">` presenti
- A3 — ✅ `<LockKey>` nel titolo è dentro il testo — non ha `aria-hidden`; `<Eye>` e `<EyeSlash>` nei pulsanti toggle non hanno `aria-hidden` ma il pulsante ha già `aria-label` — minore
- A4 — ✅ Pulsante mostra/nascondi PIN con `aria-label={showPin ? 'Nascondi PIN' : 'Mostra PIN'}`
- B1 — ✅ `pinInputRef.current?.focus()` con `setTimeout` 100 ms all'apertura
- B2 — ✅ Radix focus trap
- B3 — ✅ PIN → (conferma PIN) → submit
- B4 — ✅
- C1 — N/A (nessuna chiamata `announceDialogOpen()`, ma il dialog si auto-annuncia via Radix)
- C2 — ✅ `<p id="pin-error" className="..." role="alert">{error}</p>` con `id` per `aria-describedby` e renderizzato condizionalmente
- C3 — N/A
- C4 — ❌ `{error && <p id="pin-error" role="alert">{error}</p>}` condizionale; `aria-describedby="pin-error"` sull'input referenzia un elemento che potrebbe non esistere nel DOM
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **C4 minore:** `aria-describedby={error ? 'pin-error' : undefined}` sull'`<Input>` è corretto (presente solo quando c'è errore), ma l'elemento `<p id="pin-error">` è renderizzato condizionalmente; il riferimento è coerente. Tuttavia `<LockKey>` nel `<DialogTitle>` non ha `aria-hidden="true"`.

---

### KeyboardShortcutsHelp.tsx

**Checklist:**
- A1 — N/A (contenuto solo di lettura con elenco scorciatoie)
- A2 — ✅ `<DialogContent>` con Radix `role="dialog"`; `<DialogTitle>` e `<DialogDescription>` presenti
- A3 — ❌ `<Keyboard size={24} weight="duotone" />` nel `<DialogTitle>` non ha `aria-hidden="true"`. Lo screen reader la legge come immagine senza nome prima del testo del titolo.
- A4 — N/A
- B1 — N/A (Radix auto-focus sul primo elemento)
- B2 — ✅ Radix focus trap
- B3 — ✅
- B4 — ✅
- C1 — ✅ `screenReader.announceHelpOpened()` chiamato in `useEffect` su `open`
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **A3 minore:** `<Keyboard size={24}>` in `<DialogTitle className="flex items-center gap-2">` senza `aria-hidden="true"`. Lo screen reader può leggere l'icona SVG prima del testo del titolo.

---

### AudioSettings.tsx

**Checklist:**
- A1 — ✅ `<Label htmlFor="audio-enabled">` + `<Switch id="audio-enabled">`; slider ha `<Label>` e `aria-label` indiretto tramite gruppo
- A2 — ✅ Card con `<CardTitle>` e `<CardDescription>`
- A3 — ❌ `{getVolumeIcon()}` nel `<CardTitle>` restituisce icone Speaker senza `aria-hidden`
- A4 — N/A (pulsanti preset con testo visibile)
- B1 — N/A
- B2 — N/A
- B3 — ✅
- B4 — ✅
- C1 — ✅ `screenReader.announceVolumeChange()`, `announceToggleState()`, `announcePresetApplied()` chiamati
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — ✅ `<Switch id="audio-enabled" checked={localEnabled} aria-label={...}>` comunica stato
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **A3 minore:** `{getVolumeIcon()}` nel `<CardTitle>` (SpeakerSlash, SpeakerLow, SpeakerHigh, SpeakerSimpleHigh) senza `aria-hidden="true"`. Il titolo è già "Impostazioni Audio".

---

### DisplaySettings.tsx

**Checklist:**
- A1 — ✅ Tutti gli Switch hanno `<Label htmlFor="...">` e `id` corrispondenti; ogni Switch ha `aria-label` descrittivo; Select hanno `<Label htmlFor="...">` e `id`
- A2 — ✅ Card con `<CardTitle>` e sezioni con `<h4>`
- A3 — ✅ Le icone `<Eye>`, `<Monitor>`, `<TextAa>`, `<Palette>` nelle intestazioni di sezione non hanno `aria-hidden` — ❌ minore
- A4 — N/A
- B1 — N/A
- B2 — N/A
- B3 — ✅
- B4 — ✅
- C1 — ✅ `screenReader.announceSuccess()` e `announce()` su ogni cambio impostazione
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — ✅ Tutti gli `<Switch checked={...} aria-label={...}>` comunicano stato
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **A3 minore:** Icone `<Eye>`, `<Monitor>`, `<TextAa>`, `<Palette>` nelle intestazioni di sottosezione senza `aria-hidden="true"`.

---

### HapticSettings.tsx

**Checklist:**
- A1 — ✅ `<Label htmlFor="haptic-enabled">` + `<Switch id="haptic-enabled" aria-label="Abilita o disabilita la vibrazione tattile">`; Slider con `aria-label="Regola l'intensità della vibrazione"` e `id="haptic-intensity"`
- A2 — ✅ Card con `<CardTitle>` e `<CardDescription>`
- A3 — ❌ `<Vibrate size={24}>` nella card header senza `aria-hidden`; `<Vibrate size={16}>` nei pulsanti test con testo visibile — non critico
- A4 — N/A
- B1 — N/A
- B2 — N/A
- B3 — ✅
- B4 — ✅
- C1 — N/A (annunci tramite `toast`, non `screenReader`)
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — ✅ `<Switch checked={enabled} aria-label={...}>` comunica stato
- E2 — ✅ `<Switch disabled={!isSupported}>` e pulsanti test con `disabled={!enabled || !isSupported}`
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **A3 minore:** `<Vibrate size={24}>` nell'intestazione della card senza `aria-hidden="true"`.

---

### ScreenReaderSettings.tsx

**Checklist:**
- A1 — ✅ `<RadioGroup value={verbosityLevel} onValueChange={...}>` con `<RadioGroupItem value="..." id="verbosity-...">` e `<Label htmlFor="verbosity-...">` per ogni opzione; `<Switch>` per ogni impostazione boolean con `id` e Label; Slider con Label
- A2 — ✅ Card con `<CardTitle>` e `<CardDescription>`
- A3 — ❌ `<TextAa size={20}>` nel `<CardTitle>` senza `aria-hidden`; `<SpeakerHigh>` senza `aria-hidden`
- A4 — N/A
- B1 — N/A
- B2 — N/A
- B3 — ✅
- B4 — ✅
- C1 — ✅ `screenReader.announce(...)` ad ogni cambio impostazione
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — ✅ `<RadioGroup>` con `<RadioGroupItem>` nativi; `<Switch checked={...}>` nativi
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **A3 minore:** `<TextAa size={20}>` e `<SpeakerHigh>` nel `<CardTitle>` senza `aria-hidden="true"`.

---

### SecuritySettings.tsx

**Checklist:**
- A1 — ✅ Label e input con `id` nei dialog interni; pulsanti con `data-focus-info` e testo visibile
- A2 — ✅ Dialog interno con `<DialogTitle>` e `<DialogDescription>`; Radix `role="dialog"`
- A3 — ✅ `<ShieldCheck>`, `<Key>`, `<Lock>`, `<Password>` nelle intestazioni senza `aria-hidden` — ❌ minore
- A4 — N/A
- B1 — ✅ `newPinRef.current?.focus()` in `useEffect` su `showPinDialog`
- B2 — ✅ Radix Dialog focus trap
- B3 — ✅
- B4 — ✅
- C1 — ✅ `screenReader.announce('Apertura dialog per gestione PIN privato', 'assertive')` in `handleOpenPinChange`
- C2 — ✅ `screenReader.announceError()` chiamato per errori; `<p className="text-sm text-destructive" role="alert">{error}</p>` condizionale
- C3 — N/A
- C4 — ❌ `{error && <p ... role="alert">{error}</p>}` condizionale nel dialog PIN; stesso pattern di AuthScreen
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — N/A
- E2 — ✅ `disabled={isProcessing}` su pulsante submit
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **A3 minore:** `<ShieldCheck>`, `<Key>`, `<Lock>`, `<Password>` nelle intestazioni di sezione senza `aria-hidden="true"`.
- **C4 minore:** `{error && <p role="alert">}` condizionale nel dialog PIN interno.

---

### TalkBackSettings.tsx

**Checklist:**
- A1 — ✅ `<Label htmlFor="talkback-enabled">` + `<Switch id="talkback-enabled" aria-label={...} aria-describedby="talkback-status-description">`; `<p id="talkback-status-description">` associato
- A2 — ✅ Card con `<CardTitle>` e `<CardDescription>`
- A3 — ✅ `<DeviceMobile size={24} aria-hidden="true" />` nel titolo ✅; icone nei Badge (`<CheckCircle>`, `<WarningCircle>`, `<Info>`) in `getConfidenceBadge()` senza `aria-hidden` — ❌
- A4 — N/A
- B1 — N/A
- B2 — N/A
- B3 — ✅
- B4 — ✅
- C1 — ✅ `screenReader.announceSuccess()` e `announceToggleState()` su ogni cambio
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — ✅ `<Switch checked={talkBackState.isEnabled} aria-label={...}>` comunica stato
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **A3 minore:** Icone `<CheckCircle>`, `<WarningCircle>`, `<Info>` nei Badge di confidenza (restituiti da `getConfidenceBadge()`) senza `aria-hidden="true"`.

---

### CategoryManagement.tsx

**Checklist:**
- A1 — ✅ `<Button aria-label="Modifica categoria ${category.nome}">` e `<Button aria-label="Elimina categoria ${category.nome}">` su ogni riga; nel dialog: `<Label htmlFor="category-name">`, `<Label htmlFor="category-type">`; pulsante "Nuova Categoria" con testo visibile
- A2 — ✅ `<Table>` con `<TableHeader>`, `<TableHead>`, `<TableBody>` semantici; Dialog con `<DialogTitle>` e `<DialogDescription>`; `AlertDialog` con titolo e descrizione
- A3 — ✅ `<Tag>`, `<Plus>`, `<PencilSimple>`, `<Trash>` nei pulsanti senza `aria-hidden` — ❌ minore; `<TrendUp>`, `<TrendDown>` nelle intestazioni senza `aria-hidden`
- A4 — N/A (pulsante "Nuova Categoria" ha testo)
- B1 — ✅ `categoryNameRef.current?.focus()` con `setTimeout` 100 ms all'apertura del dialog
- B2 — ✅ Radix Dialog e AlertDialog forniscono focus trap
- B3 — ✅
- B4 — ✅
- C1 — ✅ `screenReader.announce()` su apertura/chiusura dialog e su salvataggio/eliminazione
- C2 — ✅ `screenReader.announceError()` per errori; `<p role="alert">` condizionale nel dialog
- C3 — N/A
- C4 — ✅ Live region globali; `<p role="alert">` condizionale nel dialog categoria (stessa nota di altri componenti)
- D1 — N/A
- D2 — N/A
- D3 — ✅ `<Table>` con intestazioni (`<TableHead>`) e righe semantiche
- D4 — N/A
- E1 — N/A
- E2 — ✅ `disabled={category.predefinita}` sul pulsante Elimina per categorie predefinite
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **A3 minore:** Icone `<Tag>`, `<TrendUp>`, `<TrendDown>`, `<PencilSimple>`, `<Trash>` in pulsanti e intestazioni di sezione senza `aria-hidden="true"`. Nei pulsanti con `aria-label` l'effetto è mitigato, ma nelle intestazioni le icone decorative potrebbero essere lette.

---

### DataManagement.tsx

> **Nota:** File analizzato parzialmente per via della lunghezza (struttura validatori e logica import/export lette; JSX del card principale letto solo parzialmente).

**Checklist:**
- A1 — ✅ Pulsanti di export/import con testo visibile; `AlertDialog` con `<AlertDialogTitle>` e `<AlertDialogDescription>`
- A2 — ✅ `<AlertDialog>` Radix con `role="alertdialog"` interno; Card con `<CardTitle>` e `<CardDescription>`
- A3 — ❌ Icone (`<Database>`, `<DownloadSimple>`, `<UploadSimple>`, `<Heart>`, `<Code>`, `<ShieldCheck>`, `<GitBranch>`) nel corpo del componente senza `aria-hidden` verificato
- A4 — N/A
- B1 — N/A (AlertDialog Radix gestisce focus)
- B2 — ✅ Radix AlertDialog focus trap
- B3 — ✅
- B4 — ✅
- C1 — ✅ `screenReader.announceSuccess()` e `announceError()` sulle operazioni asincrone
- C2 — N/A
- C3 — N/A
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — N/A
- E2 — N/A
- E3 — N/A
- E4 — N/A

**Anomalie trovate:**
- **A3 minore (presunta):** Icone decorative nell'header della card e nelle sezioni informative probabilmente senza `aria-hidden`. Da verificare nel JSX del card non letto.

---

### LoadingSpinner.tsx

**Checklist:**
- A1 — N/A
- A2 — ✅ `role="status" aria-label="Caricamento in corso" aria-live="polite"` sul wrapper
- A3 — N/A (il div spinner è dentro `role="status"` che già ne fornisce il significato)
- A4 — N/A
- B1 — N/A
- B2 — N/A
- B3 — N/A
- B4 — N/A
- C1 — N/A
- C2 — N/A
- C3 — ✅ `aria-live="polite"` sul wrapper
- C4 — N/A
- D1 — N/A
- D2 — N/A
- D3 — N/A
- D4 — N/A
- E1 — N/A
- E2 — N/A
- E3 — ✅ `role="status"` con testo leggibile comunica lo stato di caricamento
- E4 — N/A

**Anomalie trovate:**
Nessuna

---

## Appendice — Infrastruttura accessibilità (read-only)

### screen-reader.ts
La classe `ScreenReaderAnnouncer` crea due `<div>` persistenti nel `document.body` (uno `role="status" aria-live="polite"`, uno `role="alert" aria-live="assertive"`) all'inizializzazione. L'istanza singleton `screenReader` è esportata e usata sia direttamente sia tramite `useScreenReader`. Il meccanismo di svuotamento-e-riempimento (`region.textContent = ''` + `setTimeout(() => region.textContent = message, 100)`) è corretto per forzare l'annuncio di messaggi identici ripetuti.

### LiveRegion.tsx
Il componente React monta un `<div role="..." aria-live="..." aria-atomic="true">` in linea nel DOM. A differenza delle live region globali in `screen-reader.ts`, questo componente viene smontato se il genitore viene rimosso dalla gerarchia. Non risulta usato direttamente nei componenti analizzati (le live region attive sono quelle globali di `screen-reader.ts`). La coesistenza di due meccanismi (globale e per-componente) è potenzialmente ridondante ma non dannosa.

### FocusIndicator.tsx
Ascolta `focusin`/`focusout`/`keydown`/`mousedown` globalmente. Mostra un tooltip visivo con il testo `data-focus-info` o `aria-label` dell'elemento focalizzato. Non ha impatto sull'albero ARIA ma migliora l'usabilità visiva durante la navigazione da tastiera.

### SkipLink.tsx
Il link `"Salta alla navigazione principale"` con `href="#main-content"` è presente e il target `<main id="main-content">` esiste in `App.tsx`. Il link usa `sr-only-focusable` per essere visibile solo a focus. Funziona correttamente quando l'utente è autenticato e vede `AppContent`. **Nota:** quando `needsOnboarding === true` o l'app mostra `<LoadingSpinner>`, il `#main-content` non esiste e lo skip link porta a una destinazione assente.
