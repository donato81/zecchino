# P28 — Migrazione AppDataContext a Supabase

## 1. Intestazione

| Campo | Valore |
|---|---|
| Pacchetto | P28 — Migrazione AppDataContext a Supabase |
| Tipo intervento | Documento di design (sola lettura) |
| Branch | `refactoring-architettura` |
| Data | 28 aprile 2026 |
| Autore | Agent-Design |
| File modificati | Nessuno (solo creazione di questo documento) |
| Documenti di riferimento | [P24 — Architettura migrazione Supabase](./P24-architettura-migrazione-supabase.md), [P25 — Schema `impostazioni_utente` e campo `cifrato`](./P25-schema-impostazioni-utente-cifrato.md), [P26 — Strato di accesso dati Supabase](./P26-strato-accesso-dati-supabase.md), [P27 — Migrazione AuthContext a Supabase Auth](./P27-migrazione-authcontext-supabase.md), [src/context/AppDataContext.tsx](../../src/context/AppDataContext.tsx), [src/context/VisibleDataContext.tsx](../../src/context/VisibleDataContext.tsx), [src/lib/types.ts](../../src/lib/types.ts), [src/lib/constants.ts](../../src/lib/constants.ts) |
| Stato | Bozza — in attesa di validazione |

Questo documento è **vincolante** per tutti i design operativi successivi
(P29 in poi). Le decisioni qui contenute sono già state validate e non
vengono rimesse in discussione: i design successivi possono solo
dettagliarne l'implementazione, non cambiarne la sostanza.

---

## 2. Contesto

Questo blocco è il **cuore della migrazione dei dati dell'applicazione**.
[P24 §3](./P24-architettura-migrazione-supabase.md#3-fotografia-dello-stato-attuale)
identifica **5 chiavi di dominio** — `accounts`, `transactions`,
`categories`, `budgets`, `savings-goals` — che mappano 1:1 sulle 5
tabelle Supabase (`conti`, `transazioni`, `categorie`, `budget`,
`obiettivi_risparmio`). Queste chiavi sono oggi l'ossatura di
[`AppDataContext`](../../src/context/AppDataContext.tsx): senza di esse,
l'intera interfaccia utente non ha dati su cui lavorare.

[P24 §6 Blocco 4](./P24-architettura-migrazione-supabase.md#blocco-4--migrazione-dati-di-dominio-in-appdatacontext)
aveva lasciato tre punti aperti che questo documento chiude con
decisioni definitive:

- **Strategia di caricamento** (§5): caricare le 5 entità in parallelo o
  in sequenza per priorità visiva? (→ Decisione A)
- **Politica di loading state** (§6): un unico spinner globale o un flag
  di caricamento per ciascuna entità? (→ Decisione B)
- **Gestione errori parziali** (§7): blocco totale su qualsiasi errore o
  modalità degradata con i dati disponibili? (→ Decisione C)

La dipendenza critica verso il basso è duplice. Verso il **basso nello
stack**: `AppDataProvider` è montato **dentro** `AuthProvider` (P27); tutti
i repository chiamati da P28 iniettano `user.id` dalla sessione Supabase
attiva. Senza `isAuthenticated = true` il provider non deve nemmeno tentare
di caricare dati: la RLS restituirebbe 0 righe senza errori espliciti,
producendo uno stato vuoto che l'utente non saprebbe interpretare. Verso
il **basso nella pipeline**: `VisibleDataContext` e `use-visible-data` sono
costruiti interamente sui dati che `AppDataContext` espone. Un errore qui
rende l'app inutilizzabile anche se l'autenticazione (P27) funziona
perfettamente.

---

## 3. File coinvolti e loro trasformazione

### 3.1 `src/context/AppDataContext.tsx`

**Cosa fa oggi (stato Spark):**

- Dichiara otto chiamate `useKV`: le **5 di dominio** (`accounts`,
  `transactions`, `categories`, `budgets`, `savings-goals`) e tre
  ausiliarie (`visible-categories`, `dismissed-budget-alerts`,
  `budget-percentages`).
- Espone i 5 array di dati e i relativi **setter raw** (`setAccounts`,
  `setTransactions`, ecc.) nel tipo `AppDataContextValue`, usando la
  firma `ReturnType<typeof useKV<T>>[1]` — un setter che accetta
  un valore diretto o una funzione updater `(prev) => next`.
- Esegue al mount un `useEffect` che, se `safeCategories.length === 0`,
  inizializza le categorie con `DEFAULT_CATEGORIES` da `constants.ts`,
  generando `id` lato client tramite `generateId()`. È il **bootstrap
  automatico** delle categorie default.
- Contiene tutti gli handler di dominio: `handleSaveAccount`,
  `handleSaveTransaction`, `handleSaveBudget`, `handleSaveSavingsGoal`,
  `handleDeleteConfirm`, `handleExportCSV`, `toggleCategoryVisibility`,
  `toggleAllCategories`, `handleDismissBudgetAlert`, `handleViewBudget`.
- Contiene gli **stati di UI per i dialog** (transaction, delete, account,
  budget, savings goal, keyboard shortcuts): stati `useState` puri, non
  legati a storage.

**Cosa farà dopo la migrazione (stato Supabase):**

- Legge `user` da `useAuth()` (P27) come precondizione per il caricamento.
- Al login (quando `isAuthenticated` diventa `true`), lancia le 5 chiamate
  `getAll()` dei rispettivi repository P26 per popolare i 5 array di dominio.
- Espone la **superficie pubblica ridefinita** di §4: array di dati,
  flag `isLoading`, `error`, `isDataReady`, azioni `add*`/`update*`/`remove*`
  per ciascuna entità, `refreshAll()`.
- `visibleCategories` e `dismissedAlerts` rimangono temporaneamente in
  `AppDataContext` per non bloccare il Blocco 4; la loro migrazione a
  `useUserSettings()` è compito del **Blocco 5**.
- `budgetPercentages` rimane nel context ma migra da `useKV` a `useState`
  puro nel **Blocco 6** (non è dati di dominio, è cache di sessione —
  vedi [P24 §4.7](./P24-architettura-migrazione-supabase.md#47-preferenze-ui)).
- Gli **stati di UI per i dialog** rimangono come `useState` locali:
  non riguardano la persistenza e non cambiano.

**Cosa viene eliminato:**

- Tutte le 5 chiamate `useKV` di dominio e l'import da `@github/spark/hooks`
  (per la parte dominio; le altre `useKV` sopravvivono fino ai Blocchi 5 e 6).
- Il `useEffect` di bootstrap con `DEFAULT_CATEGORIES` (P24 §4.6):
  il seeding delle categorie avviene lato server tramite
  `seed_default_categories(user_id)` nel flusso di onboarding (Blocco 9).
- I setter raw `setAccounts`, `setTransactions`, `setCategories`,
  `setBudgets`, `setSavingsGoals` dalla superficie pubblica: sostituiti
  dalle azioni tipizzate di §4.
- L'import di `DEFAULT_CATEGORIES` da `constants.ts` (il riferimento
  non è più necessario dopo la rimozione del `useEffect`).
- La firma `ReturnType<typeof useKV<T>>[1]` dal tipo `AppDataContextValue`.

**Cosa viene aggiunto:**

- Chiamate ai 5 repository P26 (`conti.getAll()`, `transazioni.getAll()`,
  `categorie.getAll()`, `budget.getAll()`, `obiettivi-risparmio.getAll()`)
  avvolte in `try/catch` centralizzato (P26 Decisione A: throw al chiamante).
- Flag `isLoading: boolean`, `error: string | null`, `isDataReady: boolean`
  come `useState` locali.
- Azioni `add*`, `update*`, `remove*` per ciascuna entità (contratto in §9).
- `refreshAll(): void` per ricaricare tutti i dati manualmente.
- Logica di cleanup al logout: reset degli array a `[]` e dei flag allo stato
  iniziale quando `isAuthenticated` torna `false`.
- Deduplicazione del `useKV` parallelo in `CategoryManagement.tsx`
  (P24 R2, [P24 §3](./P24-architettura-migrazione-supabase.md#3-fotografia-dello-stato-attuale)):
  `CategoryManagement` smette di aprire un `useKV('categories', [])` proprio
  e legge i dati direttamente da `useAppData()` — risolto come parte della
  migrazione del Blocco 4.

---

### 3.2 `src/context/VisibleDataContext.tsx`

**Cosa fa oggi (stato Spark):**

- È un **thin wrapper** di sole 18 righe: crea il context, espone l'hook
  `useVisibleData()` e delega tutta la logica al hook
  [`use-visible-data.ts`](../../src/hooks/use-visible-data.ts).
- Non contiene nessuna chiamata `useKV` diretta.
- Non gestisce nessuno stato locale oltre al context provider.

**Cosa farà dopo la migrazione (stato Supabase):**

- Rimane **strutturalmente identico**: thin wrapper, nessuna logica propria.
- La fonte dei dati che `use-visible-data.ts` consuma cambia internamente
  (AppDataContext usa ora i repository Supabase invece di `useKV`), ma
  `VisibleDataContext.tsx` non percepisce né gestisce questo cambiamento:
  si limita a renderizzare il provider con il valore prodotto dal hook.

**Cosa viene eliminato:**

- Nulla: il file non ha dipendenze da `useKV`, da `@github/spark/hooks`
  o da nessun pattern Spark. Non richiede modifiche strutturali nel Blocco 4.

**Cosa viene aggiunto:**

- Nulla nel Blocco 4. Nel **Blocco 5**, quando `visibleCategories` migrerà
  da `AppDataContext` a `useUserSettings()`, `use-visible-data.ts` dovrà
  aggiornarsi per leggere da quella nuova fonte — ma `VisibleDataContext.tsx`
  resterà invariato anche in quel blocco.

---

### 3.3 `src/lib/constants.ts`

**Cosa fa oggi (stato Spark):**

- Esporta `DEFAULT_CATEGORIES`: un array di 18 oggetti `Omit<Category, 'id'>`
  con i valori predefiniti (Stipendio, Freelance, Spesa alimentare, ecc.)
  che `AppDataContext` usa nel `useEffect` di bootstrap per popolare
  `categories` al primo render se l'array è vuoto.
- Esporta `ACCOUNT_CATEGORIES` (5 gruppi con label, descrizione, tipi,
  colore, badge): usato da `use-visible-data.ts` per costruire
  `groupedAccounts` e `filteredGroupedAccounts`, e da `AppDataContext`
  per il valore iniziale di `visible-categories`.
- Esporta costanti di lookup (`ACCOUNT_TYPE_LABELS`, `ACCOUNT_TYPE_DESCRIPTIONS`,
  `ACCOUNT_TYPE_ICONS`, `ACCOUNT_TYPE_TO_CATEGORY`, `TRANSACTION_TYPE_LABELS`,
  `RECURRENCE_LABELS`): usate da componenti UI per etichette, icone e
  conversioni tipo → categoria.

**Cosa farà dopo la migrazione (stato Supabase):**

- `ACCOUNT_CATEGORIES` e tutte le costanti di lookup **rimangono invariate**:
  non sono legate a nessuno storage, sono costanti UI pure.
- `DEFAULT_CATEGORIES` **cessa di essere usata come bootstrap automatico**
  (P24 §4.6): il seeding delle categorie default per i nuovi utenti avviene
  tramite la funzione server-side `seed_default_categories(user_id)` invocata
  al completamento dell'onboarding (Blocco 9, tabella template con
  `user_id IS NULL`).

**Cosa viene eliminato:**

- Il **ruolo funzionale** di `DEFAULT_CATEGORIES` come fonte di bootstrap
  client-side: la costante non viene più importata da `AppDataContext.tsx`
  e il `useEffect` che la usa viene rimosso.
- `DEFAULT_CATEGORIES` **può sopravvivere fisicamente** nel file come
  riferimento per il seeding server-side (stesso set di nomi e tipi da
  usare come righe template), oppure essere rimossa del tutto se il Blocco 9
  gestisce i template direttamente a livello di schema SQL. La decisione
  finale è compito del coding plan del Blocco 4 e del design del Blocco 9.

**Cosa viene aggiunto:**

- Nulla nel Blocco 4. Le costanti esistenti sono sufficienti.

---

## 4. Superficie pubblica del nuovo AppDataContext

La tabella descrive l'intera interfaccia che `AppDataProvider` espone
tramite `useAppData()` dopo la migrazione. Non è un tipo TypeScript formale:
è il contratto funzionale vincolante per i Blocchi successivi.

Gli **stati UI dei dialog** (editingTransaction, showTransactionDialog,
deletingItem, showDeleteDialog, editingAccount, showAccountDialog,
showBudgetDialog, editingBudget, showSavingsGoalDialog,
editingSavingsGoal, showKeyboardHelp e i relativi setter) rimangono
nella superficie pubblica invariati: sono `useState` locali senza
dipendenze da storage e non sono oggetto di questo design.

| Nome | Tipo (descrittivo) | Descrizione funzionale | Note |
|---|---|---|---|
| `accounts` | Array di `Account` | Lista dei conti dell'utente, caricata da `conti.getAll()`. | Aggiornata dopo ogni operazione su Supabase confermata. Inizialmente `[]`. |
| `transactions` | Array di `Transaction` | Lista delle transazioni, da `transazioni.getAll()`. | Ordine di default: data decrescente. Inizialmente `[]`. |
| `categories` | Array di `Category` | Lista delle categorie (proprie dell'utente + template con `predefinita: true`), da `categorie.getAll()`. | Include le righe template read-only. Inizialmente `[]`. |
| `budgets` | Array di `Budget` | Lista dei budget, da `budget.getAll()`. | Inizialmente `[]`. |
| `savingsGoals` | Array di `SavingsGoal` | Lista degli obiettivi di risparmio, da `obiettivi-risparmio.getAll()`. | Inizialmente `[]`. |
| `isLoading` | Booleano | `true` durante il caricamento iniziale o durante `refreshAll()`. | Determina la visualizzazione dello spinner globale (Decisione B). Inizialmente `false`. |
| `error` | Stringa o `null` | Messaggio di errore se il caricamento (o un'azione) ha fallito. `null` se nessun errore. | Impostato quando almeno una delle 5 chiamate `getAll()` lancia `RepositoryError` (Decisione C). |
| `isDataReady` | Booleano | `true` dopo che tutti e 5 i `getAll()` hanno completato con successo almeno una volta nella sessione corrente. | Rimane `true` anche durante `refreshAll()` successivi: il dato precedente è ancora disponibile. Resettato a `false` al logout. |
| `addAccount(data)` | Azione asincrona | Chiama `conti.create(data)`, ottiene il record confermato dal DB, aggiunge a `accounts`. | In caso di errore: lancia, non modifica lo stato locale. |
| `updateAccount(id, data)` | Azione asincrona | Chiama `conti.update(id, data)`, sostituisce il record in `accounts`. | Solo dopo conferma DB. |
| `removeAccount(id)` | Azione asincrona | Chiama `conti.remove(id)`, rimuove da `accounts`. Rimuove anche le transazioni del conto da `transactions` (già gestito dal DB tramite CASCADE o logica applicativa). | Operazione con doppio effetto (conto + transazioni collegate). |
| `addTransaction(data)` | Azione asincrona | Chiama `transazioni.create(data)` **senza il campo `cifrato`** (P25 §4.3, P26 §7.2). Aggiunge a `transactions` il record restituito dal DB (che include il valore di `cifrato` calcolato dal trigger). | Il trigger `trg_sync_cifrato` (P25 §4.4) popola `cifrato` automaticamente. |
| `updateTransaction(id, data)` | Azione asincrona | Chiama `transazioni.update(id, data)` **senza il campo `cifrato`**. Sostituisce in `transactions`. | Idem: trigger gestisce `cifrato`. |
| `removeTransaction(id)` | Azione asincrona | Chiama `transazioni.remove(id)`, rimuove da `transactions`. | — |
| `addCategory(data)` | Azione asincrona | Chiama `categorie.create(data)`, aggiunge a `categories`. | Solo categorie dell'utente: RLS blocca la creazione di template. |
| `updateCategory(id, data)` | Azione asincrona | Chiama `categorie.update(id, data)`, sostituisce in `categories`. | Tentativo su template (`predefinita: true`) lancia `RepositoryError`. |
| `removeCategory(id)` | Azione asincrona | Chiama `categorie.remove(id)`, rimuove da `categories`. | Se la categoria è usata da transazioni esistenti, il DB lancia un errore FK: il context lo intercetta e lo traduce in messaggio visibile. |
| `addBudget(data)` | Azione asincrona | Chiama `budget.create(data)`, aggiunge a `budgets`. | — |
| `updateBudget(id, data)` | Azione asincrona | Chiama `budget.update(id, data)`, sostituisce in `budgets`. | — |
| `removeBudget(id)` | Azione asincrona | Chiama `budget.remove(id)`, rimuove da `budgets`. | — |
| `addSavingsGoal(data)` | Azione asincrona | Chiama `obiettivi-risparmio.create(data)`, aggiunge a `savingsGoals`. | — |
| `updateSavingsGoal(id, data)` | Azione asincrona | Chiama `obiettivi-risparmio.update(id, data)`, sostituisce in `savingsGoals`. | Per aggiornare solo il progresso (importoCorrente), usare `updateSavingsGoalProgress` — vedi §9. |
| `updateSavingsGoalProgress(id, importoCorrente)` | Azione asincrona | Chiama `obiettivi-risparmio.updateProgress(id, importoCorrente)` (P26 §7.5). Aggiorna `importoCorrente`, `completato`, `dataCompletamento`. | Atomica lato DB. Separata da `updateSavingsGoal` per chiarezza semantica. |
| `removeSavingsGoal(id)` | Azione asincrona | Chiama `obiettivi-risparmio.remove(id)`, rimuove da `savingsGoals`. | — |
| `refreshAll()` | Funzione | Rilancia le 5 chiamate `getAll()` e aggiorna tutti gli array. Durante l'esecuzione, `isLoading = true`. Se già in corso, è no-op. | Non resetta `isDataReady`: il dato precedente rimane visibile durante il refresh. |

---

## 5. Decisione A — Strategia di caricamento dati al login

### 5.1 Le due opzioni

**OPZIONE 1 — Caricamento parallelo**

Al login vengono lanciate contemporaneamente tutte e 5 le chiamate
`getAll()` dei repository. Il provider aspetta che tutte e 5 siano
completate prima di dichiarare `isDataReady = true` e rendere la
dashboard visibile.

**OPZIONE 2 — Caricamento sequenziale con priorità**

I dati vengono caricati in ordine di priorità visiva: prima `accounts`
(necessari per quasi ogni schermata), poi `categories` (necessarie per
mostrare le transazioni), poi `transactions`, poi `budgets`, poi
`savingsGoals`. La dashboard diventa parzialmente visibile appena
`accounts` e `categories` sono pronti, mentre gli altri dati arrivano
in background.

### 5.2 Analisi comparativa

| Dimensione | Opzione 1 — Parallelo | Opzione 2 — Sequenziale |
|---|---|---|
| **Velocità totale di caricamento** | **Più rapida**: il tempo totale è pari alla chiamata più lenta, non alla somma di tutte le chiamate. | Più lenta: il tempo totale è la somma delle 5 chiamate sequenziali. |
| **Velocità percepita dall'utente** | Neutra: l'utente vede uno spinner unico, poi la dashboard completa in un colpo solo. | Potenzialmente migliore: l'utente vede parti dell'UI riempirsi progressivamente — ma solo se i componenti supportano lo stato parziale. |
| **Complessità di implementazione** | **Bassa**: una singola operazione parallela, un unico blocco try/catch centralizzato. | Alta: orchestrazione dell'ordine di chiamata, stato intermedio per ciascuna entità, gestione dei componenti che ricevono dati parziali. |
| **Rischio di race condition tra i dati** | **Nullo**: tutti i dati arrivano insieme, nessuno stato intermedio incoerente. | **Presente**: tra la disponibilità di `categories` e quella di `transactions`, i componenti possono ricevere transazioni senza le categorie corrispondenti ancora caricate. |
| **Coerenza con no-realtime (P26 Decisione C)** | **Piena**: il modello "carica tutto una volta al login" è l'approccio naturale del no-realtime. Ogni successivo aggiornamento è esplicito (azione utente). | Parziale: la progressività implica una gestione di stati intermedi che si avvicina concettualmente al realtime senza averne i benefici. |

### 5.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Caricamento parallelo.**

Il caricamento parallelo è la scelta più coerente con l'intera architettura
stabilita da P24–P27. La **velocità totale** è superiore perché le 5 query
vengono eseguite contemporaneamente su Supabase: su una connessione mobile
tipica, la differenza rispetto al sequenziale può essere di centinaia di
millisecondi. La **semplicità di implementazione** riduce il rischio di
regressione durante la fase più delicata del progetto.

Il punto critico è l'eliminazione delle **race condition**: con il
sequenziale, esiste sempre una finestra temporale in cui `transactions`
sono caricate ma `categories` non ancora, oppure `budgets` esistono ma
`accounts` sono incompleti. Questi stati intermedi obbligano ogni componente
consumatore a difendersi da dati parziali, aggravando il carico su tutti
i Blocchi successivi.

L'Opzione 2 offre una percezione di velocità teoricamente migliore, ma
solo se i componenti UI implementano skeleton loader localizzati — uno sforzo
non banale su tutti i componenti esistenti (DashboardTab, TransactionsTab,
ReportsTab, ecc.) che oggi non gestiscono nessuno stato di caricamento. Questo
scopo sarebbe fuori dal perimetro di Blocco 4 e richiederebbe un intervento
coordinato su molti file, contrariamente al principio di minima modifica.

La scelta del parallelo è anche pienamente **coerente con P26 Decisione C**
(no realtime): il modello è "snapshot completo al login", non
"flusso progressivo".

---

## 6. Decisione B — Politica di loading state

### 6.1 Le due opzioni

**OPZIONE 1 — Spinner globale unico**

Un solo flag `isLoading` che è `true` finché almeno una delle 5 chiamate
non è completata. L'intera dashboard è bloccata da uno spinner centrale
fino al completamento di tutte le query.

**OPZIONE 2 — Loading state per entità**

Ogni entità ha il proprio flag `isLoading` (`isLoadingAccounts`,
`isLoadingTransactions`, ecc.). I componenti mostrano skeleton loader
o placeholder locali mentre aspettano i propri dati.

### 6.2 Analisi comparativa

| Dimensione | Opzione 1 — Spinner globale | Opzione 2 — Per entità |
|---|---|---|
| **Semplicità di implementazione** | **Alta**: un `useState<boolean>` e un blocco try/catch unico. | Bassa: 5 flag separati, da impostare e resettare individualmente, con logica di aggregazione per sapere quando il caricamento è "abbastanza completo". |
| **Esperienza utente percepita** | Neutra: l'utente attende brevemente (parallelo), poi vede tutto. | Potenzialmente migliore, ma solo se i componenti UI implementano skeleton loader specifici. |
| **Complessità dei componenti consumatori** | **Nulla**: i componenti non devono gestire nessuno stato di caricamento interno. Leggono i dati dal context sapendo che o sono vuoti (loading in corso) o sono completi (isDataReady). | Alta: ogni componente deve leggere il proprio flag e mostrare uno stato placeholder coerente — richiede modifiche a tutti i componenti consumatori. |
| **Coerenza con la Decisione A (parallelo)** | **Piena**: parallelo + spinner unico è l'abbinamento naturale. Una fase, un flag. | Parziale: i flag per entità sono più utili nel sequenziale, dove ogni entità ha un ciclo di vita distinto. Con il parallelo, tutti e 5 i flag cambiano quasi contemporaneamente. |
| **Impatto su componenti esistenti** | **Minimo**: nessun componente richiede modifiche per il loading state. Il gate `isDataReady` in `App.tsx` copre il caso. | **Elevato**: DashboardTab, TransactionsTab, ReportsTab e tutti i componenti figlio devono essere aggiornati per mostrare placeholder condizionali. |

### 6.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Spinner globale unico.**

La scelta è direttamente determinata dalla Decisione A: il caricamento
parallelo produce una **singola transizione di stato** (da "in caricamento"
a "pronto"), che si rappresenta naturalmente con un unico flag booleano.
Introdurre 5 flag separati per un caricamento che si risolve quasi
contemporaneamente è complessità senza beneficio.

L'impatto sui componenti esistenti è il fattore decisivo. Nessuno dei
componenti UI attuali (DashboardTab, TransactionsTab, ReportsTab,
AccountCard, BudgetDialog, ecc.) gestisce oggi un proprio stato di
caricamento perché con Spark i dati erano disponibili al primo render
(sincronismo KV). Richiedere a tutti questi componenti di implementare
skeleton loader nell'ambito del Blocco 4 espande enormemente il perimetro
dell'intervento e aumenta il rischio di regressioni visive e di
accessibilità.

Con lo spinner globale, il Blocco 4 è chirurgico: il provider gestisce
il caricamento internamente, il gate `!isDataReady` in `App.tsx` mostra
lo spinner, e i componenti non devono sapere nulla del processo.
Il flag `isDataReady` rimane `true` anche durante i `refreshAll()`
successivi, quindi solo il **primo caricamento** blocca l'UI — i refresh
successivi avvengono in background mentre i dati precedenti rimangono visibili.

---

## 7. Decisione C — Gestione errori parziali

### 7.1 Le due opzioni

**OPZIONE 1 — Blocco totale su qualsiasi errore**

Se anche una sola delle 5 chiamate `getAll()` fallisce, l'intera dashboard
non viene mostrata e l'utente vede un messaggio di errore con un pulsante
"Riprova". Tutte le 5 chiamate vengono rilanciate al click.

**OPZIONE 2 — Degraded mode (modalità degradata)**

Se una o più chiamate falliscono, l'app mostra comunque i dati che ha
caricato con successo. Le sezioni con errore mostrano un messaggio di
errore locale con un pulsante "Riprova" per quella specifica sezione.

### 7.2 Analisi comparativa

| Dimensione | Opzione 1 — Blocco totale | Opzione 2 — Degraded mode |
|---|---|---|
| **Semplicità di implementazione** | **Alta**: un unico blocco try/catch, un unico stato `error`. Se qualcosa fallisce, tutto si blocca. | Bassa: ogni entità ha il proprio stato di errore; i componenti devono gestire la presenza/assenza condizionale di dati parziali. |
| **Utilità per l'utente su connessioni instabili** | Limitata: l'intera dashboard rimane inaccessibile anche se 4 su 5 tabelle sono caricate. | Alta: l'utente può consultare i dati disponibili anche in caso di errore parziale. |
| **Rischio di stato incoerente** | **Nullo**: o tutti i dati sono presenti, o nessuno. Nessuna possibilità di visualizzare dati orfani. | **Elevato**: le 5 entità non sono indipendenti — `transactions` dipende da `accounts` (per mostrare il nome del conto) e da `categories` (per mostrare il nome della categoria); `budgets` dipende da `categories`. Un budget senza le categorie associate è parzialmente interpretabile. Una transazione senza il conto a cui appartiene produce importi orfani nella UI. |
| **Coerenza con P26 Decisione A (throw al chiamante)** | **Piena**: P26 Decisione A stabilisce che il repository lancia l'errore al chiamante. Il chiamante (AppDataContext) lo gestisce con un blocco centralizzato e una policy uniforme. | Parziale: richiede try/catch individuali per ogni repository, con logica differenziata per entità — aumenta la complessità di gestione degli errori nel context. |
| **Impatto su componenti che assumono dati sempre presenti** | **Minimo**: i componenti non ricevono mai dati parziali. Se `isDataReady = false`, la dashboard non è mostrata. | **Elevato**: ogni componente deve difendersi dall'assenza di dati correlati (es. `category?.nome ?? 'Categoria eliminata'` in ogni riga di transazione). |

### 7.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Blocco totale su qualsiasi errore.**

La motivazione determinante è la **dipendenza tra entità**. Le 5 entità
di dominio non sono dataset indipendenti:

- `transactions` dipende da `accounts` per mostrare il conto associato
  a ogni movimento, e da `categories` per mostrare la categoria.
- `budgets` dipende da `categories` per mostrare a quale categoria si
  riferisce il limite di spesa.
- `savingsGoals` può dipendere da `accounts` tramite il campo `contoAssociato`.

In modalità degradata, se `accounts` non è caricato ma `transactions` sì,
la UI mostrerebbe movimenti con conto mancante — un'inconsistenza che in
un'app di gestione finanziaria è fonte di confusione e potenzialmente di
errori decisionali. Il blocco totale **elimina alla radice** questa classe
di problemi.

La semplicità di implementazione è il secondo fattore: un unico stato `error`
con un unico pulsante "Riprova" copre tutti i casi con una singola logica
centralizzata, coerente con P26 Decisione A (errori lanciati al chiamante,
non assorbiti silenziosamente). Il "Riprova" rilancia tutte e 5 le chiamate
in parallelo (stessa strategia della Decisione A), garantendo coerenza nel
risultato.

Su connessioni instabili, la modalità degradata offrirebbe utilità — ma al
costo di rendere ogni singolo componente consumatore responsabile di
difendersi da dati incompleti, espandendo il perimetro di Blocco 4 ben oltre
il ragionevole. Il **Blocco 10** (offline read-only) affronterà la resilienza
alla connessione in modo strutturato.

---

## 8. Flusso di inizializzazione del provider

Di seguito il flusso completo che `AppDataProvider` esegue dal mount alla
dashboard visibile. Non contiene codice: è la specifica funzionale vincolante
per l'implementazione del Blocco 4.

1. **Precondizione — Sessione attiva**: `AppDataProvider` non avvia nessuna
   chiamata ai repository finché `isAuthenticated = false` (da `useAuth()`,
   P27). Il provider è montato dentro `AuthProvider`, quindi al primo render
   `isAuthenticated` potrebbe ancora essere `false` mentre `AuthContext`
   risolve la sessione. L'avvio del caricamento dati è condizionato
   all'evento di transizione `isAuthenticated: false → true`, non al
   semplice mount.

2. **Avvio del caricamento (Decisione A — parallelo)**: non appena
   `isAuthenticated` diventa `true`, il provider imposta `isLoading = true`
   e lancia in parallelo tutte e 5 le chiamate `getAll()` dei rispettivi
   repository P26: `conti.getAll()`, `transazioni.getAll()`,
   `categorie.getAll()`, `budget.getAll()`, `obiettivi-risparmio.getAll()`.
   Tutte e 5 devono tornare prima di procedere.

3. **Gestione del loading state (Decisione B — spinner globale)**: durante
   l'attesa, il flag `isLoading = true` è visibile a `App.tsx` e a tutti
   i componenti consumer. La dashboard non è mostrata: `App.tsx` mostra
   lo spinner di caricamento dati (distinto dallo spinner di `isAuthReady`
   di P27). Il flag `isDataReady` rimane `false`.

4. **Gestione degli errori (Decisione C — blocco totale)**: se almeno una
   delle 5 chiamate lancia un `RepositoryError` (P26 Decisione A),
   il provider imposta `error` con un messaggio descrittivo e `isLoading = false`.
   La dashboard non viene mostrata: `App.tsx` o un gate nel provider mostra
   la schermata di errore con il pulsante "Riprova". Il pulsante chiama
   `refreshAll()`.

5. **Transizione a `isDataReady = true`**: se tutte e 5 le chiamate
   completano senza errori, il provider popola i 5 array, imposta
   `isLoading = false`, `error = null` e `isDataReady = true`. Questo è
   l'unico momento in cui la dashboard diventa visibile per la prima volta
   nella sessione. Il flag `isDataReady` rimane `true` per tutta la durata
   della sessione (anche durante `refreshAll()` successivi: i dati precedenti
   restano visibili).

6. **Logout durante il caricamento**: se `isAuthenticated` torna `false`
   mentre le promise dei `getAll()` sono ancora in volo (es. l'utente clicca
   "Esci" o il timer di inattività di P27 scatta), il provider deve **ignorare
   le risposte** delle promise in volo tramite un flag di "richiesta stale"
   (es. un booleano o un AbortController per-sessione). Al completamento
   (o all'errore) delle promise stale, il provider non aggiorna lo stato.
   Parallelamente, il provider resetta immediatamente tutti gli array a `[]`
   e i flag a `isLoading = false`, `error = null`, `isDataReady = false`,
   svuotando così qualsiasi dato che fosse già arrivato parzialmente.

7. **`refreshAll()` durante un caricamento in corso**: se `refreshAll()`
   viene chiamato mentre `isLoading = true` (es. l'utente clicca "Riprova"
   due volte rapidamente), la chiamata è un **no-op** (guardia idempotente:
   `if (isLoading) return`). Questo evita richieste doppie e race condition
   tra due set di promise parallele. Solo quando `isLoading` ritorna `false`
   (successo o errore del caricamento in corso), un successivo `refreshAll()`
   avvierà un nuovo ciclo.

---

## 9. Comportamento dei setter (add, update, remove)

Il principio trasversale è la **conferma-prima-di-aggiornare**: lo stato
locale degli array viene modificato **solo dopo** che il repository ha
confermato l'operazione con successo. In caso di errore Supabase, lo stato
locale rimane invariato e il `RepositoryError` viene propagato al chiamante
(in genere un handler di dialog) che mostra il messaggio all'utente tramite
toast e screen reader. Nessun setter del context assorbe silenziosamente
gli errori (P26 Decisione A).

### 9.1 Entità `accounts`

| Setter | Operazione locale | Operazione Supabase | Errore Supabase | Note speciali |
|---|---|---|---|---|
| `addAccount(data)` | Aggiunge il record restituito dal DB a `accounts`. | `conti.create(data)` — `user_id` iniettato dal repository. | Lancia `RepositoryError`: nessuna modifica locale, toast di errore nel chiamante. | — |
| `updateAccount(id, data)` | Sostituisce il record aggiornato in `accounts`. | `conti.update(id, data)`. | Idem. | Se si modifica `isPrivato` di un conto, il trigger `trg_propagate_cifrato` (P25 §4.4) aggiorna `cifrato` su tutte le transazioni collegate — nessuna azione aggiuntiva richiesta lato client. |
| `removeAccount(id)` | Rimuove il conto da `accounts` e filtra `transactions` rimuovendo tutte le transazioni con `contoId = id` o `contoDestinazioneId = id`. | `conti.remove(id)` — il DB gestisce la CASCADE o vincoli FK. | Idem. | L'effetto doppio (conto + transazioni) su `transactions` deve essere applicato in modo atomico nello state locale per evitare flash di transazioni orfane. |

### 9.2 Entità `transactions`

| Setter | Operazione locale | Operazione Supabase | Errore Supabase | Note speciali |
|---|---|---|---|---|
| `addTransaction(data)` | Aggiunge il record restituito dal DB (con `cifrato` calcolato) a `transactions`. | `transazioni.create(data)` — il payload **non include `cifrato`** (P25 §4.3, P26 §7.2). Il trigger `trg_sync_cifrato` lo imposta prima che il record sia restituito. | Lancia `RepositoryError`: nessuna modifica locale. | Il `TransactionDialog` deve rimuovere il campo `cifrato: isPrivateTransaction` dal payload (riga 185 attuale — P24 §4.4). |
| `updateTransaction(id, data)` | Sostituisce il record aggiornato in `transactions`. | `transazioni.update(id, data)` — **`cifrato` escluso dal payload** (P26 §7.2). | Idem. | Idem: il trigger aggiorna `cifrato` se `conto_id` cambia. |
| `removeTransaction(id)` | Rimuove da `transactions`. | `transazioni.remove(id)`. | Idem. | — |

### 9.3 Entità `categories`

| Setter | Operazione locale | Operazione Supabase | Errore Supabase | Note speciali |
|---|---|---|---|---|
| `addCategory(data)` | Aggiunge il record confermato a `categories`. | `categorie.create(data)`. | Lancia `RepositoryError`. | RLS impedisce la creazione di template (`user_id IS NULL`): non possibile lato client. |
| `updateCategory(id, data)` | Sostituisce il record aggiornato. | `categorie.update(id, data)`. | `RepositoryError` se il record è un template o non appartiene all'utente. | — |
| `removeCategory(id)` | Rimuove da `categories` **solo dopo** successo DB. | `categorie.remove(id)`. | **Caso speciale FK**: se esistono transazioni con `categoria_id = id`, il DB restituisce un errore di vincolo referenziale. Il context intercetta questo caso specifico e imposta `error` con un messaggio esplicito: "Impossibile eliminare la categoria: è usata da movimenti esistenti. Riassegna prima i movimenti a un'altra categoria." Nessuna modifica locale. | Non va confuso con l'errore di RLS su template. Il caller (dialog di conferma eliminazione) deve gestire questa risposta mostrando istruzioni. |

### 9.4 Entità `budgets`

| Setter | Operazione locale | Operazione Supabase | Errore Supabase | Note speciali |
|---|---|---|---|---|
| `addBudget(data)` | Aggiunge il record confermato a `budgets`. | `budget.create(data)`. | Lancia `RepositoryError`. | — |
| `updateBudget(id, data)` | Sostituisce il record aggiornato. | `budget.update(id, data)`. | Idem. | — |
| `removeBudget(id)` | Rimuove da `budgets`. | `budget.remove(id)`. | Idem. | — |

### 9.5 Entità `savingsGoals`

| Setter | Operazione locale | Operazione Supabase | Errore Supabase | Note speciali |
|---|---|---|---|---|
| `addSavingsGoal(data)` | Aggiunge il record confermato a `savingsGoals`. | `obiettivi-risparmio.create(data)`. | Lancia `RepositoryError`. | — |
| `updateSavingsGoal(id, data)` | Sostituisce il record aggiornato. | `obiettivi-risparmio.update(id, data)`. | Idem. | Per aggiornamenti di **metadati** (nome, descrizione, importoTarget, date, contoAssociato, colore, icona). |
| `updateSavingsGoalProgress(id, importoCorrente)` | Sostituisce il record aggiornato (con `completato` e `dataCompletamento` eventualmente impostati). | `obiettivi-risparmio.updateProgress(id, importoCorrente)` (P26 §7.5) — atomica: imposta `importoCorrente` e, se `importoCorrente >= importoTarget`, imposta `completato = true` e `dataCompletamento = now()`. | Idem. | Usata da `handleAddFundsToGoal` e da qualsiasi azione che aggiorna il progresso. **Separata** da `updateSavingsGoal` per garantire l'atomicità della logica di completamento: usare `update` per il progresso rischierebbe di sovrascrivere `completato` in modo non sincronizzato con il DB. |
| `removeSavingsGoal(id)` | Rimuove da `savingsGoals`. | `obiettivi-risparmio.remove(id)`. | Idem. | — |

---

## 10. Relazione con VisibleDataContext

`VisibleDataContext` e il suo hook interno `use-visible-data.ts` non
richiedono modifiche strutturali nel Blocco 4. Le ragioni sono le seguenti.

**Cosa legge da AppDataContext (invariato):**
`use-visible-data.ts` consuma da `useAppData()` i campi `safeAccounts`,
`safeTransactions`, `safeBudgets`, `visibleCategories`, `dismissedAlerts`.
Tutti questi campi rimangono disponibili in `AppDataContext` dopo la
migrazione del Blocco 4: i 5 array di dominio ora vengono dai repository
Supabase invece che da `useKV`, ma la forma esposta dal context è identica
(array di `Account`, `Transaction`, ecc.). `visibleCategories` e
`dismissedAlerts` rimangono anch'essi in `AppDataContext` fino al Blocco 5.

**Come filtra i dati privati (invariato nella logica):**
La logica di filtraggio non cambia. `use-visible-data.ts` legge
`isPrivateUnlocked` da `useAuth()` (riga 29 attuale) e la condizione
`account.isPrivato && !isPrivateUnlocked` rimane l'unica fonte di filtraggio
dei conti privati (P24 §8). La sorgente di `isPrivateUnlocked` è già
migrata a Supabase Auth da P27 — `use-visible-data.ts` non percepisce questo
cambiamento perché chiama `useAuth()` che è lo stesso hook prima e dopo.

**Chiamate dirette a `useKV` da eliminare:**
`VisibleDataContext.tsx` e `use-visible-data.ts` **non contengono nessuna
chiamata diretta a `useKV`**. [P24 §3](./P24-architettura-migrazione-supabase.md#3-fotografia-dello-stato-attuale)
non li elenca tra i file con split-brain. La duplicazione delle categorie
è in `CategoryManagement.tsx` (P24 R2), non in VisibleDataContext.

**Modifiche strutturali necessarie:**
Nessuna nel Blocco 4. L'unica modifica futura che tocca indirettamente
questo layer è nel **Blocco 5**: quando `visibleCategories` migra da
`AppDataContext` a `useUserSettings()`, `use-visible-data.ts` dovrà
leggere quel valore dalla nuova fonte. Tuttavia, anche in quel caso,
`VisibleDataContext.tsx` resterà un thin wrapper invariato: cambierà solo
l'implementazione di `use-visible-data.ts`.

---

## 11. Impatto sui blocchi successivi

| Blocco P24 | Dipendenza da P28 | Note |
|---|---|---|
| **Blocco 5** — Preferenze UI | **Diretta**: al completamento del Blocco 4, `AppDataContext` espone ancora `visibleCategories` da `useKV`. Il Blocco 5 deve migrare questa voce (e `dismissedAlerts`) verso `useUserSettings()`, modificando `AppDataContext` per rimuovere le ultime due `useKV` di dominio che P28 lascia intatte per non allargare il perimetro. L'array `categories` (ora da Supabase) è necessario al Blocco 5 per le operazioni di preferenza sulle categorie visibili. | Il Blocco 5 ha una dipendenza soft da P28: tecnicamente può essere sviluppato prima che P28 sia in produzione, ma non può essere testato end-to-end senza i dati di dominio. |
| **Blocco 6** — Cache `budget-percentages` | **Diretta**: `budgetPercentages` rimane in `AppDataContext` come `useKV` dopo il Blocco 4. Il Blocco 6 sostituisce quella `useKV` con `useState` (o `localStorage` prefissato da `user.id` come da P24 §6 Blocco 6). La logica di `checkBudgetNotifications` resta invariata: legge `safeBudgets` e `budgetPercentages` che sono ancora nel context. | Il Blocco 6 è semplice e parzialmente indipendente: può essere eseguito dopo Blocco 4 senza dipendere da Blocco 5. |
| **Blocco 7** — DataManagement | **Indiretta**: il DataManagement migrato usa i repository P26 direttamente (non passa dal context) per l'export e l'import. Tuttavia, per l'export in-session, i dati di dominio già caricati in `AppDataContext` possono essere usati come fonte senza rileggere da Supabase. Il Blocco 7 non deve scrivere `cifrato` nei payload di import (P25 §4.3) — il trigger lo gestisce. | Nessuna modifica alla superficie di `AppDataContext` richiesta dal Blocco 7. |
| **Blocco 8** — PIN privato | **Indiretta**: il flusso PIN privato usa `isPrivateUnlocked` e `setIsPrivateUnlocked` da `AuthContext` (P27), non da `AppDataContext`. La migrazione del PIN privato non ha dipendenze dirette su P28. Il Blocco 8 beneficia indirettamente del fatto che `isDataReady = true` prima che l'utente possa interagire con `PinDialog`. | Nessuna dipendenza tecnica da P28. |
| **Blocco 9** — Onboarding | **Critica**: al completamento dell'onboarding (primo accesso), la funzione `seed_default_categories(user_id)` popola la tabella `categorie` su Supabase. Il successivo avvio di `AppDataProvider` (con il refresh dei dati dopo `needsOnboarding → false`) deve trovare le categorie già presenti su DB. Il trigger `trg_sync_cifrato` (P25 §4.4) deve essere attivo prima che `onboarding` crei il primo conto. P28 garantisce che `AppDataProvider` carichi correttamente ciò che il Blocco 9 ha inserito nel DB. | Blocco 9 dipende dalla corretta implementazione di P28: senza di essa, il provider mostrerebbe categorie vuote dopo l'onboarding. |
| **Blocco 10** — Decommissioning | **Positiva**: dopo che i Blocchi 4, 5 e 6 sono completati, `AppDataContext` non ha più nessuna dipendenza da `@github/spark/hooks`. Il decommissioning di Spark (rimozione del pacchetto da `package.json` e dei mock da `src/test/setup.ts`) è facilitato perché il perimetro delle chiamate `useKV` in `AppDataContext` sarà stato azzerato. P26 Decisione C (no realtime) rende anche il cleanup del context più semplice: nessun canale da chiudere. | Il Blocco 10 non può partire finché Blocchi 4, 5 e 6 non sono tutti completi. P28 è il primo tassello di questo percorso. |

---

## 12. Punti aperti residui

- **Strategia di cache locale tra sessioni** (P24 R13, P24 §6 Blocco 4
  punto aperto): P28 definisce che i repository leggono sempre da Supabase
  senza cache (P26 §9). La strategia di cache tra sessioni (service worker
  o localStorage con TTL per sola lettura offline) è rimandata al
  **Blocco 10**. Al Blocco 4, ogni avvio dell'app richiede una connessione
  attiva per il caricamento dati.

- **Migrazione di `visibleCategories` e `dismissedAlerts` da `useKV`**:
  queste due voci rimangono in `AppDataContext` come `useKV` dopo il
  Blocco 4 per non allargare il perimetro dell'intervento. La loro
  migrazione verso `useUserSettings()` e la tabella `notifiche` è
  compito del **Blocco 5**.

- **Migrazione di `budgetPercentages` da `useKV` a `useState`**:
  rimane in `AppDataContext` fino al **Blocco 6**. Non è dati di dominio
  (P24 §4.7): è cache di sessione e non deve andare su Supabase.

- **Destino definitivo di `DEFAULT_CATEGORIES` in `constants.ts`**:
  la costante viene decommissionata come meccanismo di bootstrap client-side
  nel Blocco 4, ma la sua rimozione fisica dal file (o il suo mantenimento
  come riferimento per il seeding server-side del Blocco 9) è una decisione
  implementativa che il coding plan del Blocco 4 e il design del **Blocco 9**
  devono chiudere esplicitamente.

---

## 13. Criteri di accettazione del documento

- [ ] Tutte le sezioni (1–13) sono presenti e non vuote.
- [ ] L'intestazione (§1) contiene la tabella completa con tutti i campi
      e il paragrafo vincolante.
- [ ] I 3 file coinvolti (§3) hanno per ciascuno: stato attuale, stato futuro,
      cosa eliminato, cosa aggiunto.
- [ ] `constants.ts` è trattato esplicitamente: `DEFAULT_CATEGORIES` è
      descritta come meccanismo di bootstrap automatico eliminato in accordo
      con P24 §4.6 — il seeding diventa server-side nel Blocco 9.
- [ ] La superficie pubblica (§4) include: tutti i 5 array di dati di dominio,
      il flag `isLoading`, il flag `error`, il flag `isDataReady`,
      tutti i setter `add*`/`update*`/`remove*` per le 5 entità (15 azioni),
      `updateSavingsGoalProgress`, `refreshAll()`.
- [ ] La Decisione A (§5) ha scelta **DEFINITIVA** dichiarata (Parallelo)
      con motivazione che cita: velocità totale, race condition, no-realtime.
- [ ] La Decisione B (§6) ha scelta **DEFINITIVA** dichiarata (Spinner globale)
      con motivazione coerente con la Decisione A.
- [ ] La Decisione C (§7) ha scelta **DEFINITIVA** dichiarata (Blocco totale)
      con motivazione che cita esplicitamente le dipendenze tra entità:
      `transactions` dipende da `accounts` e `categories`,
      `budgets` dipende da `categories`.
- [ ] Il flusso §8 copre tutti e 7 i punti: precondizione `isAuthenticated`,
      avvio parallelo, loading state, gestione errori, transizione a
      `isDataReady = true`, logout durante caricamento, `refreshAll()`
      concorrente.
- [ ] La §9 copre tutte e 5 le entità con tabella per ciascuna. La nota
      sul campo `cifrato` escluso dal payload (P25 §4.3, P26 §7.2) è presente
      in §9.2 per `transactions`. Il caso FK di `removeCategory` è trattato
      in §9.3. La distinzione tra `updateSavingsGoal` (metadati) e
      `updateSavingsGoalProgress` (P26 §7.5) è presente in §9.5.
- [ ] La §10 descrive: cosa VisibleDataContext legge da AppDataContext
      (invariato), la logica di filtraggio privato (invariata), l'assenza
      di chiamate dirette a `useKV` in VisibleDataContext, e l'assenza di
      modifiche strutturali necessarie nel Blocco 4.
- [ ] La §11 copre i blocchi da 5 a 10 con dipendenza e note.
- [ ] La §12 elenca i punti aperti residui post-P28 (cache locale,
      visibleCategories/dismissedAlerts, budgetPercentages, destino finale
      di DEFAULT_CATEGORIES).
- [ ] Nessuna contraddizione con P24, P25, P26, P27 rilevata.
- [ ] Tutti i link a file `src/` usano path relativi (`../../src/...`).
- [ ] Nessun frammento di codice TypeScript, JSX o SQL eseguibile
      in tutto il documento.

---

*Fine documento. Nessun file sorgente è stato modificato.*

*Messaggio di commit suggerito:*
`docs(design): creare P28 migrazione AppDataContext Supabase`
