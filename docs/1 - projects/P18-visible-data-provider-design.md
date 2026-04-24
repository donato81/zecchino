# P18 — VisibleDataProvider: fonte unica dei dati elaborati

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 18  
> Data: 24 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Il report diagnostico post-P13 (`docs/4 - reports/Diagnostic-Analysis-Post-P13.md`, §3.3 e §7 priorità 5) identifica un problema di lavoro duplicato causato dal fatto che il hook `src/hooks/use-visible-data.ts` viene invocato separatamente da più consumer. Il report classifica la risoluzione come **"Medio (prestazioni)"** nell'ordine di priorità del piano d'azione.

### 1.1 Verifica preliminare dei consumer attuali

Prima di scrivere questo documento, è stata eseguita una ricerca testuale (`grep useVisibleData src/**`) per determinare l'elenco preciso e aggiornato dei consumer. Il risultato ha superato la stima del report diagnostico (che indicava "almeno tre consumer"):

| Consumer | Percorso | Dati usati |
|---|---|---|
| Componente App interno | `src/App.tsx` | `budgetAlerts`, `totalBalance`, `visibleAccounts`, `visibleTransactions` |
| Hook shortcuts | `src/hooks/use-app-shortcuts.ts` | (da ispezionare in fase coding — destruttura il hook) |
| Intestazione app | `src/components/AppHeader.tsx` | `totalBalance`, `visibleAccounts` |
| Tab dashboard | `src/components/DashboardTab.tsx` | Quasi tutti i campi esposti |
| Overlay dialoghi | `src/components/DialogsOverlay.tsx` | (da ispezionare in fase coding — destruttura il hook) |
| Tab report | `src/components/ReportsTab.tsx` | Confermato con grep — il report lo indicava come "da verificare" |
| Tab movimenti | `src/components/TransactionsTab.tsx` | `visibleTransactions`, `visibleAccounts` |

**Il consumer `ReportsTab.tsx` è quindi confermato come attivo**, contrariamente all'indicazione "da verificare" del report.
Il totale dei consumer è **7**, non 3 come stimato nel report diagnostico. Due di essi sono hook (`use-app-shortcuts.ts`) o componenti di servizio (`DialogsOverlay.tsx`) che non appaiono nelle tab visibili all'utente ma ricalcolano comunque tutti i `useMemo` interni al hook a ogni render.

### 1.2 Il problema del lavoro duplicato

Il hook `src/hooks/use-visible-data.ts` contiene internamente cinque calcoli memizzati:

- **`visibleAccounts`** — filtro dei conti per stato di sblocco privacy
- **`visibleTransactions`** — filtro delle transazioni in base ai conti visibili
- **`totalBalance`** — somma calcolata tramite `getTotalBalance`
- **`recentTransactions`** — le ultime 10 transazioni ordinate per data
- **`groupedAccounts`** e **`filteredGroupedAccounts`** — raggruppamento per categoria
- **`budgetAlerts`** — alert generati comparando budget e transazioni

Ogni invocazione diretta del hook in uno dei 7 consumer esegue questi calcoli in modo **completamente indipendente dalle altre invocazioni**. Se `safeTransactions` conta N elementi, ogni invocazione esegue una scansione O(N). Con 7 consumer attivi, questa scansione viene ripetuta 7 volte nello stesso ciclo di render, producendo array separati in memoria.

L'effetto sul comportamento dell'app è duplice:

1. **Lavoro computazionale moltiplicato**: al cambio di qualsiasi dato sorgente (aggiunta di un movimento, modifica di un conto, sblocco del conto privato), tutti e 7 i consumer ricalcolano i propri `useMemo` in cascata, anche se il componente non visualizza i dati appena cambiati.

2. **Micro-rerender a cascata da riferimenti distinti**: anche quando i dati sorgente non cambiano, se un componente padre si re-renderizza e scatena una re-invocazione del hook in un consumer figlio, l'array restituito ha una nuova identità in memoria pur contenendo gli stessi elementi. Se quell'array viene passato come prop o confrontato da React per decidere se rieseguire un effetto, il sistema lo tratta come "cambiato" — scatenando render non necessari nei livelli sottostanti.

### 1.3 Cosa si ottiene con questo passo

Al termine del Passo 18, tutti i calcoli di `useVisibleData` vengono eseguiti **una sola volta per ciclo di render**, nel provider condiviso. I 7 consumer ricevono i dati già calcolati tramite il contesto, senza rieseguire nessun `useMemo` individualmente. I riferimenti agli array sono stabili finché i dati sorgente non cambiano, eliminando i micro-rerender a cascata da identità distinte.

Dal punto di vista dell'utente il comportamento dell'app è identico: stessi dati, stessi filtri, stesso ordine, stesse interazioni. Il guadagno è di qualità interna (riduzione del lavoro computazionale, maggiore stabilità dei riferimenti) e non introduce nessuna variazione percepibile.

---

## 2. Valutazione delle due opzioni architetturali

Il report diagnostico §3.3 indica due alternative possibili: promuovere `useVisibleData` a contesto dedicato (`VisibleDataProvider`), oppure memorizzare i risultati direttamente in `AppDataContext`. Entrambe risolvono il problema del lavoro duplicato; la scelta va fatta in base alla coerenza con l'architettura documentata.

### 2.1 Architettura di riferimento (§5.1 del report)

Il report diagnostico, nella sezione "Coerenza architetturale — BUONA", descrive la separazione in layer del progetto come segue:

> `lib/` (logica pura) → `hooks/` (logica con stato React) → `context/` (stato globale condiviso) → `components/` (UI) → `App.tsx` (composizione)

Questo layer architecture è il criterio di valutazione.

### 2.2 Opzione A — Nuovo `VisibleDataContext.tsx` (contesto dedicato)

Viene creato un nuovo file `src/context/VisibleDataContext.tsx` che definisce un provider `VisibleDataProvider` e un hook di accesso `useVisibleData`. Il hook attuale in `src/hooks/use-visible-data.ts` diventa l'implementazione interna usata solo dal provider. I consumer smettono di importare da `@/hooks/use-visible-data` e iniziano a importare da `@/context/VisibleDataContext`.

**Pro:**
- Rispetta esattamente il layer architecture: i dati calcolati (derivati da dati grezzi di `AppDataContext` + stato di `AuthContext`) vivono nel layer `context/` condiviso, il posto corretto per dati che devono essere disponibili globalmente senza ricalcolo.
- È coerente con il pattern già stabilito dal progetto: `AuthContext` gestisce lo stato di autenticazione, `AppDataContext` gestisce lo stato raw dei dati di dominio; `VisibleDataContext` gestisce la vista filtrata/elaborata di quei dati. Tre responsabilità distinte, tre contesti distinti.
- Il hook `useVisibleData` mantiene il nome pubblico identico: i consumer cambiano solo il percorso dell'import (`@/hooks/use-visible-data` → `@/context/VisibleDataContext`), non il nome della funzione chiamata.
- Il file `src/hooks/use-visible-data.ts` può rimanere come utility interna del provider, riducendo il rischio di regressioni: la logica non viene riscritta, solo incapsulata in un livello di indirezione.

**Contro:**
- Aggiunge un file al progetto (`VisibleDataContext.tsx`), portando i file in `context/` da 2 a 3.
- Il provider deve stare nell'albero dei provider in una posizione precisa (dentro `AppDataProvider` e `AuthProvider`): un posizionamento sbagliato causa un errore di dipendenza runtime.

### 2.3 Opzione B — Integrazione in `AppDataContext.tsx`

I calcoli di `useVisibleData` vengono aggiunti direttamente all'interno di `AppDataProvider`, che inizia a esporre anche `visibleAccounts`, `visibleTransactions`, `recentTransactions`, ecc. tramite il contesto `AppDataContext`.

**Pro:**
- Non introduce un file aggiuntivo.
- Un solo punto di accesso per tutti i dati dell'applicazione.

**Contro:**
- Viola il layer architecture: `AppDataContext` gestisce oggi lo stato raw (`safeAccounts`, `safeTransactions`, operazioni CRUD), non i dati derivati/calcolati. Mescolare le due responsabilità produce un context con una superficie troppo ampia e difficile da mantenere.
- Crea una dipendenza implicita tra `AppDataContext` e `AuthContext` che oggi non esiste. `useVisibleData` dipende da `isPrivateUnlocked`, fornito da `AuthContext`. Se la logica di `useVisibleData` venisse spostata in `AppDataContext`, questo context dovrebbe importare e usare `useAuth` — ma `AppDataProvider` e `AuthProvider` sono allo stesso livello nell'albero (entrambi wrappano `AppContent`). Introdurre questo collegamento non è semplice senza ristrutturare l'albero dei provider o creare una dipendenza circolare.
- Rende `AppDataContext` ancora più grande di quanto non sia già (il file ha già oltre 450 righe con interfaccia, provider e hook).
- Ogni futura modifica ai dati calcolati richiede di toccare un file centrale e critico che oggi gestisce persistenza, CRUD e notifiche — aumentando il rischio di regressioni.

### 2.4 Scelta: Opzione A

**Si sceglie l'Opzione A** — nuovo `VisibleDataContext.tsx` separato.

La motivazione principale è strutturale: `AppDataContext` non dipende da `AuthContext` nell'architettura attuale, e questo è corretto. I calcoli di `useVisibleData` dipendono da `isPrivateUnlocked` (AuthContext) e da `safeAccounts`/`safeTransactions` (AppDataContext): il luogo naturale per contenere qualcosa che dipende da entrambi è un terzo livello nell'albero dei provider, non uno dei due livelli esistenti che verrebbero così costretti a dipendere l'uno dall'altro.

L'Opzione B viene scartata perché introdurrebbe una dipendenza circolare implicita tra `AppDataContext` e `AuthContext`, violerebbe la separazione di responsabilità documentata nel report §5.1, e aumenterebbe il rischio di regressioni su un file centrale.

---

## 3. Perimetro della modifica

### 3.1 File da creare

| File | Descrizione |
|---|---|
| `src/context/VisibleDataContext.tsx` | Nuovo contesto, provider `VisibleDataProvider` e hook di accesso `useVisibleData` |

### 3.2 File da modificare

| File | Modifica specifica |
|---|---|
| `src/hooks/use-visible-data.ts` | Il file resta ma non viene più importato direttamente dai consumer; diventa implementazione interna del provider |
| `src/App.tsx` | Rimozione dell'import e della chiamata diretta a `useVisibleData`; aggiunta di `VisibleDataProvider` nell'albero di composizione |
| `src/components/AppHeader.tsx` | Sostituzione import `@/hooks/use-visible-data` con `@/context/VisibleDataContext` |
| `src/components/DashboardTab.tsx` | Sostituzione import `@/hooks/use-visible-data` con `@/context/VisibleDataContext` |
| `src/components/DialogsOverlay.tsx` | Sostituzione import `@/hooks/use-visible-data` con `@/context/VisibleDataContext` |
| `src/components/ReportsTab.tsx` | Sostituzione import `@/hooks/use-visible-data` con `@/context/VisibleDataContext` |
| `src/components/TransactionsTab.tsx` | Sostituzione import `@/hooks/use-visible-data` con `@/context/VisibleDataContext` |
| `src/hooks/use-app-shortcuts.ts` | Sostituzione import `@/hooks/use-visible-data` con `@/context/VisibleDataContext` |

### 3.3 File invariati

| File / Area | Motivazione |
|---|---|
| `src/context/AppDataContext.tsx` | Non coinvolto — per design (vedi §2.3) |
| `src/context/AuthContext.tsx` | Non coinvolto — consumato indirettamente tramite il provider |
| `src/lib/` (tutti i file) | Librerie pure — non coinvolte |
| `src/hooks/` (tutti gli altri hook) | Non invocano `useVisibleData` direttamente |
| `src/components/` (tutti gli altri componenti) | Non coinvolti — grep confermato |
| `eslint.config.js` | Invariato |
| `package.json`, `package-lock.json` | Invariati — nessuna dipendenza nuova |
| `tsconfig.json`, `vite.config.ts`, `tailwind.config.js` | Invariati |
| `.github/` | Protetto da `framework-guard.instructions.md` |
| `docs/` (file esistenti) | Non modificati in fase coding |

---

## 4. Dettaglio delle operazioni

### 4.1 `src/context/VisibleDataContext.tsx` (file nuovo)

#### Struttura del contesto

Il file definisce tre elementi principali:

**Il tipo del contesto** — identico al tipo `VisibleDataResult` già definito in `src/hooks/use-visible-data.ts`. Espone gli stessi campi: `visibleAccounts`, `visibleTransactions`, `hasPrivateAccount`, `privateAccount`, `totalBalance`, `recentTransactions`, `groupedAccounts`, `filteredGroupedAccounts`, `allCategoriesVisible`, `budgetAlerts`. Non vengono aggiunti campi nuovi.

**Il componente `VisibleDataProvider`** — wrappa i suoi `children` con il context provider. Internamente, chiama il hook `useVisibleData` (importato da `@/hooks/use-visible-data`) una volta sola e passa i risultati al valore del context. Nessun altro calcolo avviene in questo componente: è un wrapper puro.

**Il hook di accesso `useVisibleData`** — sostituisce il hook omonimo di `use-visible-data.ts` come punto di accesso per i consumer. Chiama `useContext` sul context creato nel file e lancia un errore descrittivo se il consumer si trova fuori dall'albero del provider. Il nome del hook è intenzionalmente identico a quello esistente: i consumer cambiano solo il percorso dell'import, non il nome della funzione.

#### Convenzione di naming

Il file segue esattamente la convenzione stabilita da `AppDataContext.tsx` e `AuthContext.tsx`:
- Il provider è un componente di nome `{Nome}Provider` (es. `AppDataProvider`, `AuthProvider`, `VisibleDataProvider`)
- Il hook di accesso è `use{Nome}` (es. `useAppData`, `useAuth`) — nel nostro caso, per mantenere il nome invariato per i consumer, si usa `useVisibleData`
- Export nomi: sia il provider che il hook vengono esportati nominalmente

#### Posizionamento nell'albero dei provider

`VisibleDataProvider` deve stare dentro `AppDataProvider` e dentro `AuthProvider`, perché il hook interno che chiama (`useVisibleData` da `use-visible-data.ts`) dipende da `useAppData` e da `useAuth`. Se il provider venisse posizionato fuori da questi due context, il runtime lancerebbe un errore al primo render.

La posizione corretta nell'albero è:

```
AuthProvider
  └── AppDataProvider
        └── VisibleDataProvider   ← qui
              └── AppContent
```

Questa struttura è conforme al layer architecture documentato nel report §5.1: `context/` (stato globale condiviso) avvolge `components/` (UI) tramite `App.tsx` (composizione).

`VisibleDataProvider` non dipende da nessun altro contesto oltre a `AppDataContext` e `AuthContext` già presenti, quindi non crea dipendenze circolari.

### 4.2 `src/hooks/use-visible-data.ts`

Il file viene **mantenuto senza modifiche alla logica interna**. Tutti i `useMemo`, i calcoli e il tipo `VisibleDataResult` restano invariati. Il file continua a esportare la funzione `useVisibleData` con la stessa firma.

La sola variazione è che la funzione diventa ad uso interno: viene importata esclusivamente da `src/context/VisibleDataContext.tsx` e da nessun altro file. I consumer che attualmente importano da `@/hooks/use-visible-data` migreranno a `@/context/VisibleDataContext`, ma il file sorgente non viene toccato.

**Motivazione per mantenere il file**: racchiudere la logica di calcolo nel hook permette di testarla o modificarla in isolamento senza toccare il file del context. La separazione "logica di calcolo" (`use-visible-data.ts`) / "distribuzione via context" (`VisibleDataContext.tsx`) è in linea con il principio di singola responsabilità e con il layer architecture del progetto (hook per logica con stato, context per distribuzione globale).

Non si valuta di eliminare il file o di fondere tutto in `VisibleDataContext.tsx` perché renderebbe il file del context più grande e meno facile da mantenere, senza nessun vantaggio funzionale.

### 4.3 `src/App.tsx`

In `App.tsx` avvengono due cambiamenti distinti:

**Aggiunta del provider nell'albero**: la funzione `App` attualmente compone l'albero come:
```
AuthProvider → AppDataProvider → AppContent
```
Dopo la modifica diventa:
```
AuthProvider → AppDataProvider → VisibleDataProvider → AppContent
```
`VisibleDataProvider` viene inserito tra `AppDataProvider` e `AppContent`, perché `AppContent` è il componente dove risiedono i consumer diretti del hook (`AppContent` chiama `useVisibleData` e monta `DashboardTab`, `TransactionsTab`, ecc.). Posizionare il provider immediatamente sopra il suo primo consumer è il punto corretto.

**Rimozione della chiamata diretta**: la funzione `AppContent` importa e chiama direttamente `useVisibleData` per ottenere `budgetAlerts`, `totalBalance`, `visibleAccounts`, `visibleTransactions`. Dopo la modifica, `AppContent` ottiene questi stessi valori tramite il hook `useVisibleData` importato da `@/context/VisibleDataContext` invece che da `@/hooks/use-visible-data`. L'import cambia, il nome del hook e i dati estratti rimangono identici. Nessun'altra parte di `App.tsx` viene toccata.

### 4.4 `src/components/AppHeader.tsx`

`AppHeader.tsx` usa `useVisibleData` per leggere `totalBalance` e `visibleAccounts`, che usa per visualizzare il saldo nella barra dell'intestazione e per contare i conti visibili. La modifica è minimale: la riga di import cambia da `@/hooks/use-visible-data` a `@/context/VisibleDataContext`. La destrutturazione e il rendering restano identici.

### 4.5 `src/components/DashboardTab.tsx`

`DashboardTab.tsx` è il consumer che usa più campi del hook. La modifica si limita alla sostituzione della riga di import. Tutti i campi destrutturati (`visibleAccounts`, `visibleTransactions`, `recentTransactions`, `groupedAccounts`, `filteredGroupedAccounts`, `allCategoriesVisible`, `budgetAlerts`) continuano a essere disponibili identici, perché il nuovo hook di contesto espone esattamente la stessa interfaccia. Nessuna logica di rendering cambia.

### 4.6 `src/components/TransactionsTab.tsx`

`TransactionsTab.tsx` usa `visibleTransactions` e `visibleAccounts`. Stessa sostituzione di import di DashboardTab. Nessun'altra modifica.

### 4.7 `src/components/ReportsTab.tsx`

`ReportsTab.tsx` — confermato dalla grep come consumer attivo. La modifica è identica: sostituzione del percorso di import. I campi destrutturati e la logica di rendering rimangono invariati.

### 4.8 `src/components/DialogsOverlay.tsx`

`DialogsOverlay.tsx` usa `useVisibleData` (confermato dalla grep, linee 3 e 69). Stessa sostituzione di import. Nessun'altra modifica.

### 4.9 `src/hooks/use-app-shortcuts.ts`

`use-app-shortcuts.ts` è un hook, non un componente. Usa `useVisibleData` per ottenere dati necessari alla gestione delle scorciatoie da tastiera (linee 4 e 48). Stessa sostituzione di import: `@/hooks/use-visible-data` → `@/context/VisibleDataContext`. Poiché l'hook viene chiamato dentro `AppContent` (che a sua volta è dentro `VisibleDataProvider`), la chiamata a `useContext` nel hook di accesso troverà correttamente il provider nell'albero.

---

## 5. Invarianza funzionale

Questa sezione dimostra in linguaggio naturale che il comportamento dell'app è identico prima e dopo la modifica.

**Stessi dati, stesso ordine, stessi filtri**: `VisibleDataContext.tsx` non riscrive nessun calcolo. Chiama `useVisibleData` da `use-visible-data.ts` — lo stesso hook che i consumer chiamavano direttamente. I `useMemo` con le stesse dipendenze producono gli stessi risultati. `visibleAccounts` è ancora il filtro dei conti per `isPrivateUnlocked`. `visibleTransactions` è ancora il filtro per id dei conti visibili. `recentTransactions` sono ancora le ultime 10 per data. `budgetAlerts` sono ancora gli alert generati dalla libreria `budget-alerts`.

**Stesso comportamento al cambio di dati**: quando l'utente aggiunge un movimento, `safeTransactions` in `AppDataContext` cambia. Questo scatena un re-render del provider `VisibleDataProvider`, che ricalcola i valori tramite `useVisibleData` (ora in un solo posto) e distribuisce i nuovi valori a tutti i consumer via context. Il risultato visivo — aggiornamento delle liste, del saldo, degli alert — è identico a prima.

**Stesso comportamento per il conto privato**: lo sblocco del conto privato (`isPrivateUnlocked` in `AuthContext`) si propaga al provider `VisibleDataProvider` (che chiama il hook interno che legge `isPrivateUnlocked`), che ricalcola `visibleAccounts` e distribuisce i nuovi valori. Nessuna differenza percepibile.

**Stesse interazioni utente**: le funzioni che mutano dati (`handleSaveTransaction`, `setShowTransactionDialog`, ecc.) sono tutte in `AppDataContext` e non vengono toccate. Le callback nelle tab, i pulsanti di modifica ed eliminazione, le scorciatoie da tastiera — tutto rimane invariato.

**Stabilità aggiuntiva dei riferimenti**: questo è l'unico cambiamento percepibile in termini di comportamento interno, e va nella direzione positiva. Prima della migrazione, due consumer che chiamavano `useVisibleData` ricevevano array con identità distinte. Dopo la migrazione, entrambi ricevono lo stesso riferimento dal context. Questo può ridurre (non aumentare) il numero di render dei componenti che usano questi array come dipendenze di `useMemo` o `useEffect`.

---

## 6. Criteri di verifica / Definition of Done

Tutte le condizioni seguenti devono essere soddisfatte prima di dichiarare il passo completato.

### 6.1 Build e tipo

- [ ] `npm run build` termina con exit code 0 e zero errori TypeScript
- [ ] `npx tsc -b --noCheck` termina senza output (zero errori di tipo)
- [ ] Nessun warning nuovo rispetto alla baseline di 55 warning post-P17

### 6.2 Lint

- [ ] `npm run lint` termina con exit code 0
- [ ] Il conteggio dei warning non supera la baseline post-P17 (55 warning)
- [ ] Nessun nuovo warning `react-hooks/exhaustive-deps` o `react-hooks/rules-of-hooks` introdotto dai file modificati

### 6.3 Verifica consumer migrati (grep di controllo)

- [ ] La grep `useVisibleData` in `src/components/` restituisce zero occorrenze di import da `@/hooks/use-visible-data`
- [ ] La grep `useVisibleData` in `src/hooks/` (escludendo `use-visible-data.ts` stesso) restituisce zero occorrenze di import da `@/hooks/use-visible-data`
- [ ] La grep `useVisibleData` in `src/App.tsx` mostra esclusivamente l'import da `@/context/VisibleDataContext` (o nessun import diretto, se la chiamata in `AppContent` viene mantenuta tramite il context)
- [ ] L'unico file che importa da `@/hooks/use-visible-data` è `src/context/VisibleDataContext.tsx`

### 6.4 Verifica provider nell'albero

- [ ] `src/App.tsx` contiene `<VisibleDataProvider>` annidato correttamente dentro `<AppDataProvider>` e `<AuthProvider>`
- [ ] Il file `src/context/VisibleDataContext.tsx` esiste e contiene le tre esportazioni attese: il context, `VisibleDataProvider`, `useVisibleData`

### 6.5 Verifica comportamento visivo (manuale)

- [ ] La tab Dashboard visualizza i conti, i movimenti recenti e il saldo totale identici a prima della modifica
- [ ] La tab Movimenti visualizza la lista completa con filtri e ordinamento invariati
- [ ] La tab Report visualizza i grafici e le statistiche invariati
- [ ] La barra dell'intestazione (`AppHeader`) mostra il saldo corretto
- [ ] Gli alert di budget appaiono nella `BudgetAlertBanner` (se presenti dati di test)
- [ ] Lo sblocco del conto privato aggiorna le tre tab in modo coerente (stessa visibilità di prima)
- [ ] I dialog di modifica transazione, conto e budget si aprono e funzionano normalmente (`DialogsOverlay` migrato correttamente)
- [ ] Le scorciatoie da tastiera gestite da `use-app-shortcuts.ts` funzionano normalmente

---

## 7. Rischi e avvertenze

### 7.1 Posizionamento errato del provider nell'albero

**Rischio**: se `VisibleDataProvider` viene inserito fuori da `AppDataProvider` o fuori da `AuthProvider`, il hook interno `useVisibleData` (da `use-visible-data.ts`) non trova i context di cui dipende e lancia un errore runtime del tipo `useAppData deve essere usato dentro AppDataProvider` o `useAuth deve essere usato dentro AuthProvider`.

**Come prevenirlo**: verificare visivamente in `App.tsx` che l'annidamento risultante sia `AuthProvider → AppDataProvider → VisibleDataProvider → AppContent`. L'ordine di apertura dei provider nell'albero JSX deve rispettare la catena di dipendenze.

**Come rilevarlo**: il browser mostra un errore nell'Error Boundary (`ErrorFallback.tsx`) al caricamento dell'app, prima di qualsiasi interazione utente. Il messaggio di errore è descrittivo e indica qual è il contesto mancante.

### 7.2 Consumer che usa campi non esposti dal contesto

**Rischio**: se durante la migrazione di un consumer si scopre che quel consumer accede a campi di `useVisibleData` che non sono inclusi nel tipo `VisibleDataResult` (o che nel tempo sono stati aggiunti al hook senza aggiornare il tipo), il TypeScript segnala un errore di tipo al momento della compilazione.

**Come gestirlo**: se un campo mancante viene scoperto in fase di coding, aggiungere quel campo al tipo `VisibleDataResult` in `use-visible-data.ts` e assicurarsi che il provider lo propaghi tramite il context. Non si tratta di un caso atteso (il tipo è esplicito e usato già oggi), ma è il rischio tipico in una migrazione.

### 7.3 Consumer che usa solo una parte dei campi esposti

**Rischio**: un consumer come `AppHeader.tsx` usa solo `totalBalance` e `visibleAccounts`, ma tramite il context riceve l'intero oggetto `VisibleDataResult`. Potrebbe sembrare inefficiente passare un oggetto grande per usarne solo due campi.

**Come gestirlo**: questo non è un problema e non va "ottimizzato" in questo passo. React Context è già efficiente per dati stabili: il re-render del consumer avviene solo quando il valore del context cambia, non quando cambia una singola proprietà. Il consumer usa la destrutturazione e ignora i campi che non gli servono. Un'eventuale ottimizzazione granulare con selettori (pattern `zustand`/`jotai`) appartiene a un passo futuro separato ed è fuori dal perimetro di P18. Il consumer **non deve** continuare a invocare il hook diretto solo perché usa pochi campi: va comunque migrato al contesto.

### 7.4 Rimozione della chiamata diretta rompe una variabile locale in un consumer

**Rischio**: un consumer potrebbe avere una variabile locale che dipende dalla chiamata `useVisibleData()` e che non è presente nella destrutturazione standard — per esempio un calcolo inline subito dopo la chiamata, o un riferimento alla funzione stessa (improbabile ma possibile).

**Come rilevarlo**: TypeScript segnala l'errore di tipo o di variabile non definita durante la compilazione. Il build fallisce in modo deterministico, non silenzioso.

**Come gestirlo**: verificare che tutti i campi destrutturati nel consumer corrispondano esattamente ai campi esposti dal context. Se un consumer fa calcoli su `useVisibleData()` prima di destrutturare, estrarre i calcoli nelle righe successive alla destrutturazione dal context.

---

## 8. Cosa NON fare in questo passo

- **Non aggiungere nuovi dati calcolati al provider**: `VisibleDataContext.tsx` espone esattamente gli stessi campi di `useVisibleData` esistente. Non aggiungere statistiche extra per `ReportsTab`, aggregazioni per `DashboardTab` o qualsiasi altro valore calcolato che non sia già presente nel hook attuale. Le estensioni dei dati calcolati appartengono a passi futuri dedicati.

- **Non modificare la logica di filtraggio in `use-visible-data.ts`**: le regole di filtraggio per `visibleAccounts` (basato su `isPrivateUnlocked`), `visibleTransactions` (basato su id dei conti visibili) e le altre elaborazioni restano invariate. Questo passo sposta la computazione, non la cambia.

- **Non toccare `AppDataContext.tsx`**: invariato per policy di questo passo (vedi §2.3 per la motivazione architetturale).

- **Non toccare `AuthContext.tsx`**: invariato. Il provider `VisibleDataProvider` consuma `AuthContext` indirettamente tramite il hook interno — non richiede nessuna modifica al context di autenticazione.

- **Non refactorizzare i componenti consumer oltre la sostituzione dell'import**: la sostituzione del percorso di import da `@/hooks/use-visible-data` a `@/context/VisibleDataContext` è l'unica modifica richiesta nei consumer. Non va aggiunto `useCallback`, non vanno spostate props, non va riorganizzata la struttura JSX.

- **Non eliminare `src/hooks/use-visible-data.ts`**: il file diventa implementazione interna, ma mantenerlo separato è una scelta architetturale (vedi §4.2). Eliminarlo in questo passo sarebbe una modifica di perimetro non necessaria che aumenta il rischio senza portare benefici.

- **Non fare push o commit**: questo passo è completato quando il coding plan e il todo sono aggiornati. Il commit appartiene al flusso gestito da Agent-Git con conferma esplicita dell'utente.

---

## 9. Schema visivo — albero dei provider prima e dopo

### Prima del Passo 18 (situazione attuale)

```
AuthProvider
  └── AppDataProvider
        └── AppContent
              │
              ├── AppContent chiama useVisibleData()  ──┐
              │                                          │
              ├── AppHeader                              │
              │     └── useVisibleData()  ──────────────┤
              │                                          │
              ├── use-app-shortcuts                      │
              │     └── useVisibleData()  ──────────────┤
              │                                          │  7 invocazioni
              ├── DashboardTab                           │  indipendenti
              │     └── useVisibleData()  ──────────────┤  → 7 ricalcoli
              │                                          │  → 7 set di
              ├── TransactionsTab                        │  riferimenti
              │     └── useVisibleData()  ──────────────┤  distinti
              │                                          │
              ├── ReportsTab                             │
              │     └── useVisibleData()  ──────────────┤
              │                                          │
              └── DialogsOverlay                         │
                    └── useVisibleData()  ───────────────┘
```

### Dopo il Passo 18

```
AuthProvider
  └── AppDataProvider
        └── VisibleDataProvider   ← unico punto di calcolo
              │     (chiama useVisibleData da use-visible-data.ts
              │      una sola volta per ciclo di render)
              │
              └── AppContent
                    │
                    ├── AppContent legge useVisibleData() dal context
                    │
                    ├── AppHeader
                    │     └── useVisibleData() → legge dal context
                    │
                    ├── use-app-shortcuts
                    │     └── useVisibleData() → legge dal context
                    │
                    ├── DashboardTab                      tutti leggono
                    │     └── useVisibleData() → context  gli stessi
                    │                                     riferimenti
                    ├── TransactionsTab                   in memoria
                    │     └── useVisibleData() → context
                    │
                    ├── ReportsTab
                    │     └── useVisibleData() → context
                    │
                    └── DialogsOverlay
                          └── useVisibleData() → context
```

**Flusso di dati (dopo)**:

```
AuthContext  ──────────────────────────────────────────────┐
(isPrivateUnlocked)                                        │
                                                           ▼
AppDataContext ─────────────────────────► VisibleDataProvider
(safeAccounts, safeTransactions,          │ (calcola una sola volta:
 safeBudgets, visibleCategories,          │  visibleAccounts
 dismissedAlerts)                         │  visibleTransactions
                                          │  totalBalance
                                          │  recentTransactions
                                          │  groupedAccounts
                                          │  budgetAlerts ...)
                                          │
                                          ▼
                              Tutti i consumer leggono
                              gli stessi valori dal context
```
