# P30 — Migrazione `budgetPercentages` a `useState`

## 1. Intestazione

| Campo | Valore |
|---|---|
| Pacchetto | P30 — Migrazione `budgetPercentages` a `useState` |
| Tipo intervento | Documento di design (sola lettura) |
| Branch | `refactoring-architettura` |
| Data | 28 aprile 2026 |
| Autore | Agent-Design |
| File modificati | Nessuno (solo creazione di questo documento) |
| Documenti di riferimento | [P24 — Architettura migrazione Supabase](./P24-architettura-migrazione-supabase.md), [P25 — Schema `impostazioni_utente` e campo `cifrato`](./P25-schema-impostazioni-utente-cifrato.md), [P26 — Strato di accesso dati Supabase](./P26-strato-accesso-dati-supabase.md), [P27 — Migrazione AuthContext a Supabase Auth](./P27-migrazione-authcontext-supabase.md), [P28 — Migrazione AppDataContext a Supabase](./P28-migrazione-appdatacontext-supabase.md), [P29 — Migrazione useUserSettings e Preferenze UI](./P29-migrazione-usersettings-preferenze-ui.md), [src/context/AppDataContext.tsx](../../src/context/AppDataContext.tsx), [src/components/BudgetProgressCard.tsx](../../src/components/BudgetProgressCard.tsx) |
| Stato | Bozza — in attesa di validazione |

> **Nota sui file di riferimento:** il documento originale del task citava
> `src/hooks/use-budget-notifications.ts` e `src/components/BudgetTab.tsx`.
> Entrambi i file **non esistono** nel codebase attuale: la funzione
> `checkBudgetNotifications` è un handler interno di `AppDataContext.tsx`
> (riga 119) e non esiste una tab dedicata ai budget — i componenti budget
> sono `BudgetProgressCard.tsx`, `BudgetAlertBanner.tsx`,
> `BudgetComparisonCard.tsx`, `BudgetHistoryChart.tsx`, `BudgetForecastCard.tsx`,
> `BudgetDialog.tsx`. Nessuno di questi legge `budgetPercentages` dal context
> (confermato da ricerca nel sorgente).

Questo documento è **vincolante** per tutti i design operativi successivi
(P31 in poi). Le decisioni qui contenute sono già state validate e non
vengono rimesse in discussione: i design successivi possono solo
dettagliarne l'implementazione, non cambiarne la sostanza.

---

## 2. Contesto

Il Blocco 6 affronta l'ultima chiamata `useKV` rimasta in
[`AppDataContext.tsx`](../../src/context/AppDataContext.tsx) dopo il Blocco 5
(P29): `useKV<Record<string, number>>('budget-percentages', {})`.
[P24 §4.7](./P24-architettura-migrazione-supabase.md#47-preferenze-ui)
classifica esplicitamente `budget-percentages` come **cache di sessione**,
non come dato persistente né preferenza utente: il suo valore è derivato
da `budgets` e `transactions` (già in memoria) e non deve sopravvivere tra
sessioni — migrarlo su Supabase sarebbe una ridondanza senza beneficio e
una violazione della semantica del dato. [P24 §6 Blocco 6](./P24-architettura-migrazione-supabase.md#blocco-6--cache-budget-percentages-client-side)
stabilisce che la soluzione è `useState` (o `localStorage` con chiave
per-`user.id`) e che il file coinvolto è esclusivamente `AppDataContext.tsx`.

[P28 §3.1](./P28-migrazione-appdatacontext-supabase.md#31-srccontextappdatacontexttsx)
ha lasciato esplicitamente `budgetPercentages` come `useKV` dopo il Blocco 4,
con nota che il Blocco 6 la sostituisce. [P28 §12](./P28-migrazione-appdatacontext-supabase.md#12-punti-aperti-residui)
lo registra come punto aperto residuo. [P29 §10](./P29-migrazione-usersettings-preferenze-ui.md#10-impatto-sui-blocchi-successivi)
conferma che il Blocco 6 ha una dipendenza tecnica **solo** dal Blocco 4 (P28):
può essere sviluppato indipendentemente da P29.

La **rilevanza strategica** di P30 è netta: dopo questo blocco,
`AppDataContext` non contiene più **nessuna** dipendenza da
`@github/spark/hooks`. L'import da quel pacchetto può essere rimosso
completamente dal file. Questo traguardo è il prerequisito architetturale
che sblocca il **Blocco 10** (decommissioning di Spark dall'intera app):
nessun file di `src/context/` userà più `useKV`.

È fondamentale distinguere `budgetPercentages` da `dismissedBudgetAlerts`
(già migrato in P29): le due entità coabitano in `AppDataContext` ma hanno
**cicli di vita completamente diversi**. `dismissedBudgetAlerts` è una
scelta esplicita dell'utente che deve sopravvivere tra sessioni (→ Supabase).
`budgetPercentages` è una cache di calcolo derivata, ricostruibile in O(n)
dai dati di dominio già in memoria, semanticamente legata alla sessione
corrente (→ `useState`). Confonderle porterebbe a scelte architetturali errate
nei blocchi successivi.

---

## 3. File coinvolti e loro trasformazione

### 3.1 `src/context/AppDataContext.tsx`

**Cosa fa oggi (stato Spark, dopo P28 e P29):**

> Nota: la descrizione si riferisce allo stato del file dopo che i Blocchi 4
> e 5 sono stati implementati (P28 e P29), non allo stato attuale del sorgente.

- Mantiene **una sola chiamata `useKV`** ancora attiva:
  `useKV<Record<string, number>>('budget-percentages', {})`.
- `budgetPercentages` è esposto nel tipo `AppDataContextValue` come
  `budgetPercentages: Record<string, number>` con setter
  `setBudgetPercentages: ReturnType<typeof useKV<Record<string, number>>>[1]`.
- Contiene la funzione `checkBudgetNotifications(updatedTransactions)`:
  funzione **privata al provider** (non esposta nel context), chiamata da
  `handleSaveTransaction` ogni volta che viene salvata una transazione di
  tipo `uscita`. Questa funzione:
  - Legge `safeBudgets` e `budgetPercentages || {}` per confrontare la
    percentuale corrente con quella precedente.
  - Chiama `getBudgetProgress` per ogni budget attivo.
  - Emette toast di notifica solo quando viene superata una soglia (warning,
    critical, exceeded) che non era già stata superata nella sessione
    corrente (logica anti-duplicazione).
  - Aggiorna `budgetPercentages` tramite `setBudgetPercentages` per ogni
    budget processato, memorizzando la nuova percentuale.
- `budgetPercentages` e `setBudgetPercentages` sono esposti nel valore del
  context ma **nessun componente esterno li legge**: la ricerca nel sorgente
  (`grep budgetPercentages src/**`) ha restituito solo 9 corrispondenze,
  tutte in `AppDataContext.tsx`.
- L'import `import { useKV } from '@github/spark/hooks'` è ancora presente
  esclusivamente per questa ultima chiamata.

**Cosa farà dopo la migrazione (stato post-Blocco 6):**

- `useKV('budget-percentages', {})` è sostituita con `useState<Record<string, number>>({})`.
- `checkBudgetNotifications` rimane invariata come funzione privata del
  provider: legge e scrive `budgetPercentages` esattamente come prima,
  ma la fonte/destinazione è ora lo stato React locale.
- `budgetPercentages` e `setBudgetPercentages` vengono **rimossi dalla
  superficie pubblica** del context (`AppDataContextValue`): essendo usati
  solo internamente, la loro esposizione esterna era una perdita di
  incapsulamento senza beneficio per nessun consumatore.
- Al **logout** (`isAuthenticated → false`), `budgetPercentages` viene
  resettato a `{}` in sincronia con il reset degli altri stati in
  `AppDataContext` (Decisione B, §6).

**Cosa viene eliminato:**

- La chiamata `useKV<Record<string, number>>('budget-percentages', {})`.
- La voce `setBudgetPercentages: ReturnType<typeof useKV<Record<string, number>>>[1]`
  dal tipo `AppDataContextValue`.
- La voce `budgetPercentages: Record<string, number>` dal tipo
  `AppDataContextValue` (è stato locale, non esposto).
- La voce `budgetPercentages` e `setBudgetPercentages` dal valore del context
  (`AppDataContext.Provider value={...}`).
- **L'import `import { useKV } from '@github/spark/hooks'`**: questa è
  l'ultima chiamata `useKV` in `AppDataContext.tsx`. Dopo la sua rimozione,
  nessun'altra riga di questo file richiede il pacchetto Spark.
  **Questo è il traguardo architetturale del Blocco 6.**

**Cosa viene aggiunto:**

- La dichiarazione `useState<Record<string, number>>({})` per
  `budgetPercentages` (variabile locale al provider, non esposta nel context).
- Logica di reset al logout (useEffect che osserva `isAuthenticated`):
  quando `isAuthenticated` torna `false`, `setBudgetPercentages({})`.

---

### 3.2 Componenti budget (`BudgetProgressCard`, `BudgetAlertBanner`, ecc.)

> Questi file sono documentati per completezza ma **non richiedono modifiche
> nel Blocco 6**.

**Cosa fanno oggi:**

- `BudgetProgressCard.tsx`, `BudgetAlertBanner.tsx`, `BudgetComparisonCard.tsx`,
  `BudgetHistoryChart.tsx`, `BudgetForecastCard.tsx` leggono dati budget
  tramite `useAppData()` (oppure tramite `useVisibleData()` che a sua volta
  usa `useAppData()`). Nessuno di questi componenti legge o scrive
  `budgetPercentages` o `setBudgetPercentages`: queste voci non compaiono
  nel loro sorgente.

**Stato dopo il Blocco 6:**

- Nessun cambiamento: la rimozione di `budgetPercentages` e
  `setBudgetPercentages` dal tipo `AppDataContextValue` non causa errori
  di compilazione in nessuno di questi file perché nessuno le destructura.

**Cosa viene eliminato:**

- Nulla.

**Cosa viene aggiunto:**

- Nulla.

---

## 4. Natura di `budgetPercentages` — cache vs preferenza

### 4.1 Cos'è e come viene calcolato

`budgetPercentages` è un oggetto `Record<string, number>` che mappa
l'`id` di ogni budget attivo alla **percentuale di utilizzo più recente
calcolata in sessione** (valore tra 0 e 100+). Non è il valore attuale
della percentuale del budget (che può essere ricalcolato in qualsiasi
momento da `getBudgetProgress(budget, updatedTransactions)`) — è il
**valore precedente**, utilizzato dalla logica anti-duplicazione di
`checkBudgetNotifications` per sapere se una soglia (75%, 90%, 100%)
è già stata superata e notificata in questa sessione, evitando di
rinotificare ad ogni nuovo salvataggio di transazione.

Viene **scritto** esclusivamente da `checkBudgetNotifications()`,
funzione privata di `AppDataContext`, dopo ogni calcolo di
`getBudgetProgress` su ciascun budget attivo. Viene **letto** solo dalla
stessa funzione all'inizio del ciclo di verifica, per recuperare la
percentuale precedente su cui fare il confronto.

**Non esiste nessun componente esterno** che legge `budgetPercentages`
o che chiama `setBudgetPercentages`: la sua presenza nel tipo
`AppDataContextValue` è un'esposizione storica non intenzionale
(il dato era nella stessa struttura degli altri `useKV` e vi è confluito
per simmetria, non per necessità).

### 4.2 Perché non deve sopravvivere tra sessioni

Il valore contenuto in `budgetPercentages` è **completamente derivabile**
dai dati di dominio già in `AppDataContext`:

- `budgets` (caricati da Supabase dopo P28)
- `transactions` (caricati da Supabase dopo P28)

La funzione `getBudgetProgress(budget, transactions)` calcola la percentuale
corrente in O(n) dove n è il numero di transazioni nel periodo del budget.
Se `budgetPercentages` viene perso a fine sessione, il primo salvataggio
di transazione nella sessione successiva ripartirà con percentuali tutte
a 0 — il che significa che le soglie potrebbero essere notificate di nuovo
alla prima transazione. Questo comportamento è **accettabile**:
la notifica di soglia alla prima transazione di una sessione è meno
intrusiva di un dato obsoleto che rimane in storage indefinitamente, e
coerente con il significato semantico di "cache di sessione".

Persistere `budgetPercentages` su Supabase comporterebbe:
- Una scrittura su DB per ogni transazione di tipo `uscita` salvata.
- Contesa se l'utente ha più sessioni aperte in parallelo.
- Una tabella o colonna JSONB aggiuntiva senza valore a lungo termine.

Persistere `budgetPercentages` in `localStorage` comporterebbe:
- Stale data se l'utente aggiunge transazioni da un altro dispositivo
  (es. webapp su mobile mentre l'app desktop è aperta): la percentuale
  in localStorage del dispositivo A non rifletterebbe le transazioni
  aggiunte dal dispositivo B.
- La chiave prefissata da `user.id` (come suggerito da P24 §6 Blocco 6)
  risolverebbe il rischio multi-utente ma non il rischio multi-dispositivo.
- Il vantaggio reale (evitare una ri-notifica all'apertura della sessione
  successiva) non vale la complessità aggiuntiva.

### 4.3 Confronto esplicito con `dismissedBudgetAlerts`

| Dimensione | `budgetPercentages` | `dismissedBudgetAlerts` |
|---|---|---|
| **Ciclo di vita** | Per-sessione: ha senso solo mentre la sessione è attiva e i dati di dominio sono in memoria. | Persistente: l'utente ha esplicitamente scelto di ignorare un alert; quella scelta deve sopravvivere tra sessioni. |
| **Fonte del dato** | Derivato in O(n) da `budgets` e `transactions` già in memoria: è sempre ricalcolabile. | Scelta esplicita dell'utente, non derivabile da nessun calcolo: se si perde, l'alert ricompare inaspettatamente. |
| **Chi lo scrive** | Un handler interno (`checkBudgetNotifications`) — mai l'utente direttamente. | Una azione esplicita dell'utente ("Ignora questo alert"): l'azione ha un'intenzionalità che merita persistenza. |
| **Persistenza** | `useState` (perduto a fine sessione, a refresh, e al logout): appropriato. | Supabase via `useUserSettings()` (sopravvive a sessioni e dispositivi): appropriato. |
| **Motivazione del salvataggio** | Evitare notifiche duplicate nella stessa sessione (ottimizzazione UX di breve termine). | Onorare la scelta dell'utente di non essere disturbato da un alert specifico (intenzionalità di lungo termine). |
| **Effetto della perdita** | Una possibile ri-notifica alla prima transazione della sessione successiva. Accettabile. | Il banner dell'alert riappare come se l'utente non lo avesse mai ignorato. Inaccettabile. |

### 4.4 Perché `useState` e non `localStorage`

P24 §6 Blocco 6 lascia aperta la scelta tra `useState` (perde stato a
refresh) e `localStorage` con chiave per-`user.id` (persiste per-dispositivo).
P30 sceglie **`useState` puro** per i motivi seguenti:

- Il valore di `budgetPercentages` è strettamente legato ai dati di dominio
  presenti in memoria nella sessione corrente. Se l'app subisce un hard
  refresh, i dati di dominio vengono ricaricati da Supabase (P28);
  è corretto che anche la cache delle percentuali venga azzerata.
- `localStorage` con chiave per-`user.id` risolve solo il rischio
  multi-utente su stesso dispositivo — rischio già azzerato dal reset al
  logout (Decisione B). Non aggiunge protezione contro stale data
  multi-dispositivo (vedi §4.2).
- `useState` è la soluzione più semplice, più testabile e più coerente
  con il principio "non persistere ciò che è derivabile": nessuna
  sincronizzazione con storage esterno, nessun rischio di stale data.

---

## 5. Decisione A — Posizione di `budgetPercentages` dopo la migrazione

### 5.1 Le due opzioni

**OPZIONE 1 — Rimane in `AppDataContext` come `useState` puro**

`budgetPercentages` rimane dove è oggi — dentro `AppDataProvider` — ma
la chiamata `useKV` viene sostituita con `useState({})`. La variabile
diventa locale al provider e **non viene più esposta nel tipo
`AppDataContextValue`** (dato che nessun consumatore la legge dall'esterno).
`checkBudgetNotifications` continua a funzionare invariata come funzione
privata del provider.

**OPZIONE 2 — Migra in un hook dedicato fuori da `AppDataContext`
(es. `useBudgetCache()`)**

La logica di calcolo e aggiornamento delle percentuali viene estratta in
un hook autonomo `useBudgetCache()`, che incapsula `budgetPercentages`
come `useState` locale e espone solo `checkBudgetNotifications`. Questo
hook può essere montato come provider figlio o usato direttamente da
`AppDataProvider` tramite composizione.

### 5.2 Analisi comparativa

| Dimensione | Opzione 1 — Rimane in AppDataContext | Opzione 2 — Hook dedicato |
|---|---|---|
| **Semplicità di implementazione del Blocco 6** | **Massima**: una riga cambia (`useKV` → `useState`), più la rimozione dal tipo e dal valore del context. Zero nuovi file creati. | Media: richiede la creazione di un nuovo file `useBudgetCache.ts` e il refactoring di `checkBudgetNotifications` in quel file. |
| **Impatto sui componenti consumatori esistenti** | **Nullo**: nessun componente legge `budgetPercentages` o `setBudgetPercentages` dal context. La rimozione dal tipo `AppDataContextValue` non causa errori. | **Nullo**: stesso risultato, ma il percorso è più complesso. |
| **Coerenza con il principio di separazione delle responsabilità** | **Media**: `checkBudgetNotifications` è logica di dominio (calcola percentuali da budgets+transactions) mescolata con notifiche toast — è già un'anomalia in `AppDataContext`. L'Opzione 2 risolverebbe questa anomalia. | **Alta**: `useBudgetCache` separa la logica di cache dalla gestione dei dati di dominio. Architetturalmente più pulito. |
| **Rischio di regressione durante la migrazione** | **Basso**: modifica minimale, logica invariata. | **Medio**: il refactoring di `checkBudgetNotifications` in un file separato introduce dipendenze (accesso a `safeBudgets`, `formatCurrency`, `soundSystem`, `hapticSystem`, `screenReader`, `toast`) che devono essere passate come argomenti o iniettate — complessità non banale. |
| **Dimensione dell'intervento (file modificati)** | **1** (solo `AppDataContext.tsx`). | **2+** (nuovo `useBudgetCache.ts` + modifica `AppDataContext.tsx`). |

### 5.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — `budgetPercentages` rimane in `AppDataContext`
come `useState` puro, rimosso dalla superficie pubblica del context.**

L'obiettivo principale del Blocco 6 è rimuovere l'**ultima `useKV`**
da `AppDataContext` con il minimo rischio di regressione e il minimo
perimetro di modifica. L'Opzione 1 realizza questo obiettivo con una
modifica di **una riga** più la rimozione di due voci dal tipo del context.
È il cambiamento più piccolo possibile che produce il massimo risultato
architetturale (eliminazione dell'import da `@github/spark/hooks`).

L'Opzione 2 sarebbe architetturalmente più pulita — separare la logica
di notifica budget da `AppDataContext` è un obiettivo valido — ma richiede
un refactoring di `checkBudgetNotifications` che tocca dipendenze
(`safeBudgets`, `formatCurrency`, `soundSystem`, `hapticSystem`,
`screenReader`, `toast`) già ben integrate nel provider. Questo refactoring
non è urgente né necessario per il traguardo del Blocco 6: può essere
pianificato in un blocco successivo (es. Blocco 10 o un futuro P31
di refactoring architetturale) senza penalizzare la timeline di
decommissioning Spark.

La **rimozione dalla superficie pubblica** del context è parte integrante
della Decisione A: esporre `budgetPercentages` e `setBudgetPercentages`
nel tipo `AppDataContextValue` era un errore di incapsulamento (nessun
consumatore li legge). Il Blocco 6 è l'occasione giusta per correggere
questa imperfezione senza costi aggiuntivi.

---

## 6. Decisione B — Ciclo di vita della cache al logout e al refresh dei dati

### 6.1 Le due opzioni

**OPZIONE 1 — Reset completo al logout**

Quando `isAuthenticated` diventa `false` (logout esplicito o scadenza della
sessione inattività da [P27](./P27-migrazione-authcontext-supabase.md)),
`budgetPercentages` viene resettato a `{}`.
Al login successivo la cache riparte da zero.

**OPZIONE 2 — Reset solo al cambio utente**

`budgetPercentages` non viene resettato al logout se il dispositivo
appartiene a un singolo utente. Il valore rimane in memoria RAM fino al
successivo render del componente o alla chiusura della tab.
Il reset avviene solo quando cambia `user.id`.

### 6.2 Analisi comparativa

| Dimensione | Opzione 1 — Reset al logout | Opzione 2 — Reset al cambio utente |
|---|---|---|
| **Sicurezza** | **Nessun rischio**: al login successivo (anche di un altro utente sullo stesso dispositivo) la cache è vuota e si ricostruisce dai dati del nuovo utente. | **Rischio contenuto ma presente**: se un secondo utente accede su un dispositivo condiviso e i dati vengono caricati prima che il reset per `user.id` avvenga, potrebbe teoricamente vedere percentuali residue del primo utente per un singolo frame. |
| **Coerenza con il pattern di reset al logout di P27 e P28** | **Piena**: P27 §9.3 resetta `isPrivateUnlocked = false` al logout. P28 §8 punto 6 resetta tutti gli array di dominio a `[]` al logout. L'Opzione 1 è la scelta naturale per un dato con ciclo di vita di sessione. | **Parziale**: introduce un'eccezione al pattern stabilito senza giustificazione tecnica. |
| **Semplicità di implementazione** | **Alta**: un `useEffect` che osserva `isAuthenticated` (già disponibile tramite `useAuth()`) e chiama `setBudgetPercentages({})` quando torna `false`. | Alta ma leggermente più complessa: deve osservare `user.id` e confrontare con il valore precedente. |
| **Utilità pratica del valore persistito in RAM tra un logout e il login successivo** | **Nulla**: al login successivo i dati di dominio (`budgets`, `transactions`) vengono ricaricati da Supabase (P28 §8). Le percentuali calcolate nella sessione precedente su quei dati sono obsolete. | **Minima**: il valore in RAM tra un logout e il login dello stesso utente sarebbe aggiornato alla fine dell'ultima sessione — ma i dati di dominio saranno comunque ricaricati da Supabase, rendendo obsoleta la cache. |

### 6.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Reset completo al logout.**

La coerenza con i pattern stabiliti da P27 e P28 è l'argomento decisivo.
[P27 §9.3](./P27-migrazione-authcontext-supabase.md) stabilisce che al
logout `isPrivateUnlocked` viene resettato a `false`.
[P28 §8 punto 6](./P28-migrazione-appdatacontext-supabase.md#8-flusso-di-inizializzazione-del-provider)
stabilisce che al logout tutti gli array di dominio vengono resettati a `[]`.
P29 §8 punto 6 stabilisce che al logout `visibleCategories` e
`dismissedBudgetAlerts` vengono resettati a `[]`. Il pattern è uniforme:
**tutti i dati derivati dall'identità dell'utente vengono azzerati al logout**.
`budgetPercentages` non fa eccezione.

L'utilità pratica dell'Opzione 2 è nulla: la cache delle percentuali è
valida solo in relazione ai dati di dominio correnti. Dopo un logout, quei
dati vengono resettati da `AppDataContext`. Mantenere in RAM percentuali
calcolate su dati che non esistono più in memoria non ha senso semantico.

---

## 7. Decisione C — Momento del ricalcolo delle percentuali

### 7.1 Le due opzioni

**OPZIONE 1 — Ricalcolo su richiesta esplicita (pattern attuale)**

`budgetPercentages` viene aggiornato solo quando `checkBudgetNotifications`
viene chiamata esplicitamente — oggi avviene da `handleSaveTransaction`
quando `transaction.tipo === 'uscita'`. Nessun ricalcolo automatico avviene
al caricamento dei dati, alla modifica di un budget, o alla cancellazione
di una transazione.

**OPZIONE 2 — Ricalcolo reattivo ai dati**

`budgetPercentages` viene ricalcolato automaticamente ogni volta che
`safeBudgets` o `safeTransactions` cambiano, tramite un `useEffect` o
un `useMemo` che osserva le due dipendenze.
Il valore è sempre aggiornato senza bisogno di chiamate esplicite.

### 7.2 Analisi comparativa

| Dimensione | Opzione 1 — Ricalcolo esplicito | Opzione 2 — Ricalcolo reattivo |
|---|---|---|
| **Freschezza del dato in memoria** | **Non garantita**: se l'utente modifica un budget (importo target) o elimina una transazione, `budgetPercentages` non viene aggiornato automaticamente. La percentuale in cache rimane quella dell'ultima `checkBudgetNotifications`. | **Garantita**: qualsiasi modifica a `budgets` o `transactions` aggiorna immediatamente le percentuali in cache. |
| **Numero di ricalcoli non necessari** | **Nullo**: il ricalcolo avviene solo quando necessario (nuova transazione di uscita). | **Elevato**: ogni modifica a `safeTransactions` (anche una transazione di entrata o un trasferimento che non impatta i budget) e ogni modifica a `safeBudgets` trigger il ricalcolo. |
| **Coerenza con il pattern attuale di `AppDataContext`** | **Piena**: il codice esistente usa già il ricalcolo esplicito. La migrazione da `useKV` a `useState` non richiede nessuna modifica alla logica di trigger. | **Cambio di comportamento**: introduce un pattern reattivo dove oggi esiste un pattern esplicito. Richiede la riscrittura di `checkBudgetNotifications` o l'introduzione di un `useEffect` aggiuntivo. |
| **Semplicità di implementazione** | **Massima**: zero modifiche alla logica, solo sostituzione dello stato. | **Media**: richiede di definire quale subset di `safeBudgets`/`safeTransactions` è rilevante (solo transazioni di uscita nei periodi attivi), per evitare ricalcoli inutili. |
| **Impatto su componenti che dipendono da `budgetPercentages` per notifiche** | **Nullo**: nessun componente dipende da `budgetPercentages` direttamente (rimosso dalla superficie pubblica). Le notifiche toast continuano a essere emesse da `checkBudgetNotifications` come oggi. | **Potenziale degrado**: il ricalcolo reattivo aggiornerebbe la cache senza emettere notifiche. Per emettere notifiche bisognerebbe comunque mantenere il confronto esplicito — complicando la logica. |

### 7.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Ricalcolo su richiesta esplicita.**

Il Blocco 6 ha un obiettivo ben definito: **rimuovere `useKV` da
`AppDataContext`**. Modificare il pattern di ricalcolo di
`checkBudgetNotifications` sarebbe un refactoring ortogonale, non richiesto
dall'obiettivo e potenzialmente rischioso. L'Opzione 1 garantisce che il
comportamento dell'app rimanga **identico** prima e dopo il Blocco 6:
la logica di notifica viene preservata bit per bit; l'unica differenza è
il meccanismo di storage sottostante (`useKV` → `useState`).

Il fatto che `budgetPercentages` non sia aggiornato a ogni modifica dei
dati è una limitazione **già presente** nella versione Spark attuale. La
cache è già "stale" in quel senso — l'Opzione 2 migliorerebbe questo
aspetto, ma non è urgente per l'obiettivo del Blocco 6 e non richiede un
design separato. Se il comportamento "stale" diventa un problema reale,
può essere affrontato in un blocco successivo (es. Blocco 10) dopo che il
decommissioning Spark è completo.

---

## 8. Superficie pubblica di `budgetPercentages` dopo la migrazione

La tabella descrive lo stato di ogni voce rilevante nella superficie di
`AppDataContext` dopo il Blocco 6.

| Nome | Tipo (descrittivo) | Descrizione funzionale | Note |
|---|---|---|---|
| `budgetPercentages` | **Rimosso dalla superficie pubblica** | Variabile `useState` locale ad `AppDataProvider`. Non più accessibile tramite `useAppData()`. | Usato solo da `checkBudgetNotifications` (funzione privata del provider). Nessun consumatore esterno. |
| `setBudgetPercentages` | **Rimosso dalla superficie pubblica** | Setter del `useState` locale. Non più accessibile tramite `useAppData()`. | Chiamato solo da `checkBudgetNotifications`. |
| `handleDismissBudgetAlert` | **Migrato a `useUserSettings()` in P29** | Non più presente in `AppDataContext` dopo il Blocco 5 (P29). L'handler che aggiunge un `budgetId` a `dismissed_budget_alert_ids` è ora in `useUserSettings().dismissBudgetAlert(budgetId)`. | Il coding plan del Blocco 5 (P29) deve verificare tutti i consumer di `handleDismissBudgetAlert` nel codebase (es. `BudgetAlertBanner.tsx`) e aggiornarli per usare `useUserSettings()`. **Non è responsabilità del Blocco 6.** |
| `checkBudgetNotifications` | Funzione privata interna (invariata) | Legge `budgetPercentages` (locale) e `safeBudgets`, calcola percentuali, emette notifiche toast, aggiorna la cache. Rimane in `AppDataContext` come funzione privata del provider. | Chiamata da `handleSaveTransaction` quando `transaction.tipo === 'uscita'`. Non esposta nel context value. |

---

## 9. Impatto sul decommissioning Spark (Blocco 10)

P30 è il **prerequisito diretto e necessario** per avviare il Blocco 10
(decommissioning di `@github/spark/hooks` da `AppDataContext`). Ecco la
progressione completa delle chiamate `useKV` in `AppDataContext.tsx`:

**Stato originale (pre-P24):** 8 chiamate `useKV` attive in `AppDataContext`:

1. `useKV<Account[]>('accounts', [])` — dominio
2. `useKV<Transaction[]>('transactions', [])` — dominio
3. `useKV<Category[]>('categories', [])` — dominio
4. `useKV<Budget[]>('budgets', [])` — dominio
5. `useKV<SavingsGoal[]>('savings-goals', [])` — dominio
6. `useKV<string[]>('visible-categories', [...])` — preferenza UI
7. `useKV<string[]>('dismissed-budget-alerts', [])` — preferenza UI
8. `useKV<Record<string, number>>('budget-percentages', {})` — cache

**Dopo P28 (Blocco 4):** rimangono 3 `useKV` in `AppDataContext`:
- `visible-categories`, `dismissed-budget-alerts`, `budget-percentages`.

**Dopo P29 (Blocco 5):** rimane **1** `useKV` in `AppDataContext`:
- `budget-percentages`.

**Dopo P30 (Blocco 6):** rimangono **0** `useKV` in `AppDataContext`.
L'import `import { useKV } from '@github/spark/hooks'` può essere rimosso
da `AppDataContext.tsx`. Questo file — il cuore dell'app — è completamente
indipendente da Spark.

**File con `useKV` ancora attivi dopo P30** (non in `AppDataContext`):

| File | Chiamate `useKV` attive | Blocco di migrazione |
|---|---|---|
| `src/context/AuthContext.tsx` | 2 (`global-pin-hash`, `private-pin-hash`) | P27 (Blocco 3) |
| `src/components/SecuritySettings.tsx` | 2 (`global-pin-hash`, `private-pin-hash`) | P27 (Blocco 3) |
| `src/components/CategoryManagement.tsx` | 1 (`categories`) | P28 (Blocco 4) |
| `src/components/DisplaySettings.tsx` | 12 (`display-*`) | P29 Blocco 5 esteso / futuro P31 |
| `src/components/AudioSettings.tsx` | 2 (`audio-*`) | P29 Blocco 5 esteso / futuro P31 |
| `src/components/ScreenReaderSettings.tsx` | 10 (`sr-*`) | P29 Blocco 5 esteso / futuro P31 |
| `src/test/setup.ts` | 1 (mock di `useKV`) | Blocco 10 (cleanup test) |

> Nota: `AuthContext.tsx`, `SecuritySettings.tsx` e `CategoryManagement.tsx`
> sono già previsti come target di migrazione in P27 e P28. Al momento
> del Blocco 6, questi blocchi potrebbero essere già stati implementati.
> `DisplaySettings.tsx`, `AudioSettings.tsx` e `ScreenReaderSettings.tsx`
> coprono le **22+ preferenze UI** identificate come punto aperto residuo
> in [P29 §11](./P29-migrazione-usersettings-preferenze-ui.md#11-punti-aperti-residui):
> la loro migrazione verso `useUserSettings()` è oggetto di un blocco
> separato non ancora progettato.

**La relazione tra "AppDataContext libero da Spark" e "Blocco 10 può partire":**

Il Blocco 10 non può rimuovere `@github/spark/hooks` da `package.json`
finché **qualsiasi** file in `src/` importa da quel pacchetto. Il Blocco 10
è quindi abilitato solo quando tutti i file elencati nella tabella sopra
sono stati migrati. P30 rimuove la dipendenza da `AppDataContext.tsx` —
il file più critico e centrale dell'app. Tuttavia, la dipendenza da
`DisplaySettings.tsx`, `AudioSettings.tsx` e `ScreenReaderSettings.tsx`
rimane un blocco aperto (25+ `useKV` non ancora migrate) che deve essere
risolto prima o in parallelo al Blocco 10. L'allineamento esatto tra
questi blocchi deve essere definito nel piano del **Blocco 10**.

---

## 10. Impatto sui blocchi successivi

| Blocco P24 | Dipendenza da P30 | Note |
|---|---|---|
| **Blocco 7** — DataManagement | **Nessuna**: il migratore DataManagement legge da Supabase tramite i repository P26 (non dal context) e non usa `budgetPercentages`. L'unica relazione è che il Blocco 7 potrebbe importare i vecchi dati Spark che include la chiave `budget-percentages` nel KV store: quella chiave deve essere **ignorata** durante l'import (non va persistita su Supabase). | Il coding plan del Blocco 7 deve documentare esplicitamente che `budget-percentages` viene scartato dall'import. |
| **Blocco 8** — PIN privato | **Nessuna**: il PIN privato usa `impostazioni_utente.pin_privato_hash` (tabella Supabase) tramite il repository P26. Nessuna relazione con la cache budget. | P30 non modifica la struttura di `AuthProvider` o `SecuritySettings`. |
| **Blocco 9** — Onboarding | **Indiretta**: al completamento dell'onboarding, `AppDataProvider` carica i dati da Supabase (P28) inclusi i budget di default. La prima transazione di uscita dopo l'onboarding chiamerà `checkBudgetNotifications` con `budgetPercentages = {}` (stato iniziale, sia con `useKV` che con `useState`). Nessun cambiamento di comportamento. | P30 non impatta l'onboarding. |
| **Blocco 10** — Decommissioning | **Critica e diretta**: P30 è il prerequisito che rende possibile la rimozione dell'import da `@github/spark/hooks` in `AppDataContext.tsx`. Senza P30, il Blocco 10 non può dichiarare `AppDataContext` come file pulito da Spark. Il perimetro completo del Blocco 10 include anche la migrazione delle 25+ `useKV` in `DisplaySettings`, `AudioSettings`, `ScreenReaderSettings` (punto aperto P29 §11) e la rimozione del mock in `src/test/setup.ts`. P30 è necessario ma non sufficiente per completare il Blocco 10. | Vedere §9 per il conteggio completo dei file residui. |

---

## 11. Punti aperti residui

- **25+ chiamate `useKV` in componenti di impostazioni** (`DisplaySettings.tsx`,
  `AudioSettings.tsx`, `ScreenReaderSettings.tsx`): identificate in §9 come
  il principale blocco residuo tra P30 e il Blocco 10. La migrazione di
  queste preferenze verso `useUserSettings()` (P29 §11 "22+ preferenze UI
  rimanenti") deve essere pianificata in un design separato. Il Blocco 5
  esteso o un futuro P31 sono le sedi naturali. Fino a che questi file
  usano `useKV`, `@github/spark/hooks` non può essere rimosso dall'app.

- **Smaltimento della chiave `budget-percentages` dal KV store Spark**:
  alla prima sessione post-migrazione, il KV store Spark (se ancora
  accessibile) conterrà dati orfani per la chiave `budget-percentages`.
  Il Blocco 10 (decommissioning) deve includere una strategia per il cleanup
  di queste chiavi residue nel KV store, oppure accettare che vengano
  semplicemente abbandonate (non causano errori dopo la migrazione).

- **Ricalcolo reattivo di `checkBudgetNotifications`**: la Decisione C
  sceglie di mantenere il ricalcolo esplicito per minimizzare il rischio
  nel Blocco 6. Il miglioramento architetturale (ricalcolo reattivo, es.
  via `useEffect` su `[safeBudgets, safeTransactions]`) e la separazione
  della logica di notifica in un hook dedicato (Decisione A Opzione 2)
  rimangono obiettivi validi per un refactoring futuro. Da pianificare nel
  **Blocco 10** o in un blocco di cleanup post-decommissioning.

---

## 12. Criteri di accettazione del documento

- [ ] Tutte le sezioni (1–12) sono presenti e non vuote.
- [ ] L'intestazione (§1) contiene la tabella completa, il paragrafo
      vincolante, e la nota che spiega l'assenza di `use-budget-notifications.ts`
      e `BudgetTab.tsx` nel codebase.
- [ ] I file coinvolti (§3) hanno per ciascuno: stato attuale (post P28/P29),
      stato futuro, cosa eliminato, cosa aggiunto.
- [ ] `AppDataContext.tsx` (§3.1) cita esplicitamente la rimozione dell'import
      `import { useKV } from '@github/spark/hooks'` come traguardo del Blocco 6.
- [ ] La §4 contiene la tabella comparativa tra `budgetPercentages` (cache)
      e `dismissedBudgetAlerts` (preferenza) con almeno 6 dimensioni di
      confronto (ciclo di vita, fonte, chi scrive, persistenza, motivazione,
      effetto della perdita).
- [ ] La §4.4 motiva esplicitamente la scelta di `useState` rispetto a
      `localStorage` con chiave per-`user.id` (P24 §6 Blocco 6 lasciava
      aperta questa scelta).
- [ ] Le tre decisioni (A, B, C) hanno scelta **DEFINITIVA** dichiarata
      con motivazione.
- [ ] La Decisione A (§5) cita la rimozione dalla superficie pubblica del
      context come parte integrante della scelta (non solo la sostituzione
      `useKV` → `useState`).
- [ ] La Decisione B (§6) cita il pattern di reset al logout di P27 §9.3
      e P28 §8 punto 6, con confronto nella tabella.
- [ ] La Decisione C (§7) cita il comportamento attuale (ricalcolo esplicito
      in `handleSaveTransaction`) e lo preserva.
- [ ] La §8 copre: `budgetPercentages` (rimosso dalla superficie),
      `setBudgetPercentages` (rimosso), `handleDismissBudgetAlert` (migrato
      in P29 — non responsabilità di P30), `checkBudgetNotifications`
      (rimane come funzione privata invariata).
- [ ] La §9 è una sezione narrativa che conta le `useKV` prima e dopo ogni
      blocco (originale→P28→P29→P30) e identifica i file residui con
      `useKV` dopo P30 in una tabella con il blocco di migrazione atteso.
- [ ] La §10 copre i blocchi da 7 a 10 con dipendenza e note.
- [ ] Nessuna contraddizione con P24, P25, P26, P27, P28, P29 rilevata.
- [ ] Tutti i link a file `src/` usano path relativi (`../../src/...`).
- [ ] Nessun frammento di codice TypeScript, JSX o SQL eseguibile
      in tutto il documento.

---

*Fine documento. Nessun file sorgente è stato modificato.*

*Messaggio di commit suggerito:*
`docs(design): creare P30 migrazione budgetPercentages useState`
