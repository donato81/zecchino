# P29 — Migrazione useUserSettings e Preferenze UI

## 1. Intestazione

| Campo | Valore |
|---|---|
| Pacchetto | P29 — Migrazione useUserSettings e Preferenze UI |
| Tipo intervento | Documento di design (sola lettura) |
| Branch | `refactoring-architettura` |
| Data | 28 aprile 2026 |
| Autore | Agent-Design |
| File modificati | Nessuno (solo creazione di questo documento) |
| Documenti di riferimento | [P24 — Architettura migrazione Supabase](./P24-architettura-migrazione-supabase.md), [P25 — Schema `impostazioni_utente` e campo `cifrato`](./P25-schema-impostazioni-utente-cifrato.md), [P26 — Strato di accesso dati Supabase](./P26-strato-accesso-dati-supabase.md), [P27 — Migrazione AuthContext a Supabase Auth](./P27-migrazione-authcontext-supabase.md), [P28 — Migrazione AppDataContext a Supabase](./P28-migrazione-appdatacontext-supabase.md), [src/context/AppDataContext.tsx](../../src/context/AppDataContext.tsx), [src/hooks/use-visible-data.ts](../../src/hooks/use-visible-data.ts), [src/components/SecuritySettings.tsx](../../src/components/SecuritySettings.tsx), [src/components/CategoryManagement.tsx](../../src/components/CategoryManagement.tsx) |
| Stato | Bozza — in attesa di validazione |

Questo documento è **vincolante** per tutti i design operativi successivi
(P30 in poi). Le decisioni qui contenute sono già state validate e non
vengono rimesse in discussione: i design successivi possono solo
dettagliarne l'implementazione, non cambiarne la sostanza.

---

## 2. Contesto

Il Blocco 5 completa la migrazione delle ultime **due chiamate `useKV`**
rimaste in [`AppDataContext`](../../src/context/AppDataContext.tsx) dopo
il Blocco 4: `visible-categories` e `dismissed-budget-alerts`.
[P24 §4.7](./P24-architettura-migrazione-supabase.md#47-preferenze-ui)
stabilisce che queste chiavi confluiscono nella colonna `preferences JSONB`
della tabella `impostazioni_utente` — schema definitivo in
[P25 §3.4](./P25-schema-impostazioni-utente-cifrato.md#34-schema-risultante-della-tabella-impostazioni_utente).
[P28 §12](./P28-migrazione-appdatacontext-supabase.md#12-punti-aperti-residui)
ha documentato esplicitamente questa migrazione come punto aperto residuo
da risolvere nel Blocco 5.

Il veicolo tecnico è il nuovo hook `useUserSettings()`, progettato
in [P24 §4.7](./P24-architettura-migrazione-supabase.md#47-preferenze-ui)
come **unica fonte di verità per tutte le preferenze utente**. Le operazioni
di lettura e scrittura delle preferenze passano esclusivamente dal repository
`impostazioni-utente` di [P26 §7.6](./P26-strato-accesso-dati-supabase.md#76-repository-impostazioni-utente),
tramite i metodi `getOrCreate()` e `updatePreference()`.

La **rilevanza strategica** di P29 è duplice. Primo: dopo il completamento
di questo blocco, `AppDataContext` non contiene più nessuna dipendenza da
`@github/spark/hooks` per i dati di dominio e le preferenze UI — l'unica
`useKV` rimasta in quel file è `budget-percentages`, rimandata al Blocco 6
per ragioni già documentate in [P28 §3.1](./P28-migrazione-appdatacontext-supabase.md#31-srccontextappdatacontexttsx).
Secondo: `use-visible-data.ts` — il hook che alimenta l'intera UI visibile
dei conti — smette di dipendere da `AppDataContext` per le preferenze di
filtraggio e le legge direttamente da `useUserSettings()`, separando
nettamente la **logica di presentazione** dalla **gestione dello stato
dei dati di dominio**.

---

## 3. File coinvolti e loro trasformazione

### 3.1 `src/context/AppDataContext.tsx`

**Cosa fa oggi (stato Spark, dopo il Blocco 4):**

- Ha ancora due chiamate `useKV` attive (sopravvissute al Blocco 4 per
  scelta deliberata di P28 §3.1):
  - `useKV<string[]>('visible-categories', [...])` con valore iniziale
    costruito da `ACCOUNT_CATEGORIES.map(c => c.id)`.
  - `useKV<string[]>('dismissed-budget-alerts', [])`.
- Espone `visibleCategories`, `setVisibleCategories`, `dismissedAlerts`,
  `setDismissedAlerts` nel tipo `AppDataContextValue`.
- Espone gli handler che scrivono su queste chiavi: `toggleCategoryVisibility`,
  `toggleAllCategories`, `handleDismissBudgetAlert`.
- Mantiene ancora `budgetPercentages` come `useKV` (migrazione al Blocco 6).

**Cosa farà dopo la migrazione (stato Supabase):**

- Non contiene più nessun riferimento a `visible-categories` o
  `dismissed-budget-alerts`.
- Le due voci e i loro handler (`toggleCategoryVisibility`,
  `toggleAllCategories`, `handleDismissBudgetAlert`) **escono** da
  `AppDataContext` e diventano responsabilità di `useUserSettings()`.
- `AppDataContext` rimane il provider esclusivo dei **dati di dominio**
  (accounts, transactions, categories, budgets, savingsGoals) e delle
  UI state dei dialog: ruolo più pulito, senza commistione con le preferenze.
- `budgetPercentages` rimane come `useKV` temporaneamente (Blocco 6).

**Cosa viene eliminato:**

- Le due chiamate `useKV('visible-categories', ...)` e
  `useKV('dismissed-budget-alerts', [])`.
- Le voci `visibleCategories`, `setVisibleCategories`, `dismissedAlerts`,
  `setDismissedAlerts` dal tipo `AppDataContextValue` e dal valore del context.
- Gli handler `toggleCategoryVisibility`, `toggleAllCategories`,
  `handleDismissBudgetAlert`: migrano al nuovo hook o ai componenti
  che li invocano tramite `useUserSettings()`.
- L'import di `ACCOUNT_CATEGORIES` usato solo come valore iniziale di
  `visible-categories` (se non più necessario per altri scopi nel context).

**Cosa viene aggiunto:**

- Nessuna nuova dipendenza di storage: il context diventa più snello.
- Eventuale rimozione del secondo import da `@github/spark/hooks`
  se `budgetPercentages` è l'unica `useKV` rimasta — ma quella `useKV`
  sopravvive, quindi l'import rimane fino al Blocco 6.

---

### 3.2 `src/hooks/use-visible-data.ts`

**Cosa fa oggi (stato Spark, dopo il Blocco 4):**

- Chiama `useAppData()` e destructura da esso: `safeAccounts`,
  `safeTransactions`, `safeBudgets`, `visibleCategories`, `dismissedAlerts`.
- Usa `visibleCategories` per calcolare `filteredGroupedAccounts` e
  `allCategoriesVisible`.
- Usa `dismissedAlerts` per filtrare `budgetAlerts` (tramite
  `generateBudgetAlerts` + filtro per id non presenti in `dismissedAlerts`).
- Non contiene nessuna chiamata diretta a `useKV`.

**Cosa farà dopo la migrazione (stato Supabase):**

- Continua a chiamare `useAppData()` per i **dati di dominio**
  (`safeAccounts`, `safeTransactions`, `safeBudgets`).
- Aggiunge una chiamata a `useUserSettings()` per leggere `visibleCategories`
  e `dismissedBudgetAlerts`.
- La logica di calcolo di `filteredGroupedAccounts`, `allCategoriesVisible`
  e `budgetAlerts` rimane **identica**: cambia solo la sorgente degli input,
  non il modo in cui vengono utilizzati.
- Aggiunge la gestione del caso `isSettingsReady = false` tramite il default
  definito dalla Decisione B (§6).

**Cosa viene eliminato:**

- Il destructuring di `visibleCategories` e `dismissedAlerts` da `useAppData()`.

**Cosa viene aggiunto:**

- L'import di `useUserSettings` e il destructuring di `visibleCategories`,
  `dismissedBudgetAlerts`, `isSettingsReady` da esso.
- Logica di fallback per `isSettingsReady = false` (Decisione B).

---

### 3.3 `src/components/SecuritySettings.tsx`

**Cosa fa oggi (stato Spark):**

- Apre direttamente `useKV<string>('global-pin-hash', '')` e
  `useKV<string>('private-pin-hash', '')` — **split-brain** rispetto ad
  `AuthContext` (P24 R3, già pianificata la risoluzione in P27 §3.4).
- Gestisce l'intera UI per il cambio PIN globale e il cambio PIN privato:
  dialog con campo PIN attuale, nuovo PIN, conferma.
- Non ha nessun ruolo nelle preferenze UI (`visibleCategories`,
  `dismissedAlerts`): non è un componente che le legge né le scrive.

**Cosa farà dopo la migrazione (stato Supabase, dopo P27 e P29):**

- Dopo P27: le due `useKV` PIN sono già state rimosse, la sezione
  "Cambio PIN globale" è stata eliminata, la sezione "Sicurezza account"
  mostra l'email e il link di reset password. La logica PIN privato è
  rimandata al Blocco 8.
- Dopo P29: **nessuna modifica aggiuntiva** relativa alle preferenze UI.
  `SecuritySettings` non gestisce `visibleCategories` né
  `dismissedBudgetAlerts` — queste preferenze non sono proprietà della
  schermata Sicurezza ma della UX di navigazione dei conti.
- L'esposizione di un pannello "Impostazioni preferenze" (filtri categorie,
  alert) tramite `SecuritySettings` è **fuori scope del Blocco 5**:
  il componente designato a usare `useUserSettings()` per le preferenze
  di visibilità è il **pannello di navigazione laterale/filtri conti**
  già esistente (che oggi chiama `toggleCategoryVisibility` e
  `toggleAllCategories` da `AppDataContext`). `SecuritySettings` non cambia
  strutturalmente nel Blocco 5.

**Cosa viene eliminato:**

- Nulla nel Blocco 5: le modifiche rilevanti a questo file sono già
  avvenute in P27 (o avverranno in P27 e Blocco 8).

**Cosa viene aggiunto:**

- Nulla nel Blocco 5.

---

### 3.4 `src/components/CategoryManagement.tsx`

**Cosa fa oggi (stato Spark, prima del Blocco 4):**

- Apre `useKV<Category[]>('categories', [])` **in autonomia** (riga 38):
  questo è il **split-brain** documentato in P24 R2 —
  `CategoryManagement` e `AppDataContext` gestiscono la stessa chiave
  `categories` in parallelo con stati potenzialmente divergenti.
- Contiene tutta la logica locale di gestione categorie: CRUD dialog,
  validazione nomi duplicati, feedback screen reader.
- Non legge né scrive `visibleCategories`.

**Stato dopo il Blocco 4 (P28):**

- La **prima transizione** è già avvenuta: la chiamata `useKV('categories', [])`
  è stata rimossa. `CategoryManagement` ora legge e scrive le categorie
  tramite `useAppData()` — specificatamente tramite `categories` (array di
  lettura) e le azioni `addCategory`, `updateCategory`, `removeCategory`
  della superficie pubblica di P28 §4. Il split-brain è risolto.
- Non tocca ancora `visibleCategories`.

**Stato dopo il Blocco 5 (P29 — transizione definitiva):**

- La **seconda transizione**: `CategoryManagement` deve poter agire
  su `visibleCategories` per le operazioni di filtraggio. Attualmente
  (lato P28) il componente che gestisce il toggle visibilità categorie
  chiama `toggleCategoryVisibility` / `toggleAllCategories` da `AppDataContext`.
  Dopo P29 queste funzioni non esistono più in `AppDataContext`: il componente
  che le invoca deve chiamare `setVisibleCategories` o le azioni equivalenti
  da `useUserSettings()`.
- `CategoryManagement` in sé — il componente di **gestione CRUD delle
  categorie** — non gestisce la visibilità: quella è responsabilità del
  pannello filtri laterale (e del suo componente, non identificato come
  `CategoryManagement` nei sorgenti attuali). Se `CategoryManagement`
  non chiama `toggleCategoryVisibility`, non richiede modifiche nel Blocco 5.
- **Verifica dal sorgente attuale**: `CategoryManagement.tsx` non importa
  né usa `visibleCategories` o `toggleCategoryVisibility`. Il suo ruolo
  è esclusivamente il CRUD delle categorie. Non richiede modifiche nel
  Blocco 5 legate alle preferenze.

**Stato finale dopo P29:**

- Legge le categorie da `useAppData().categories` (post-Blocco 4).
- Chiama `addCategory`, `updateCategory`, `removeCategory` da `useAppData()`
  (post-Blocco 4).
- Non ha dipendenze da `useUserSettings()`: le categorie visibili sono
  una preferenza di navigazione, non di gestione CRUD.
- Non ha più nessuna dipendenza da `@github/spark/hooks`.

**Cosa viene eliminato nel Blocco 5 rispetto a oggi (pre-Blocco 4):**

- Già eliminato nel Blocco 4: `useKV<Category[]>('categories', [])` e
  l'import da `@github/spark/hooks`.

**Cosa viene aggiunto nel Blocco 5:**

- Nulla: il file raggiunge il suo stato finale già con il Blocco 4.

> **Nota**: il componente che oggi chiama `toggleCategoryVisibility` e
> `toggleAllCategories` (pannello filtri/sidebar dei conti) dovrà essere
> aggiornato nel Blocco 5 per chiamare `setVisibleCategories` da
> `useUserSettings()`. Questo componente non fa parte dei 4 file primari
> di P29 ma il suo aggiornamento è parte del perimetro del Blocco 5.

---

## 4. Superficie pubblica del nuovo `useUserSettings()`

La tabella descrive l'intera interfaccia che il hook `useUserSettings()`
espone ai componenti consumatori. Non è un tipo TypeScript formale: è il
contratto funzionale vincolante per i Blocchi successivi.

Il hook ha accesso al repository `impostazioni-utente` di
[P26 §7.6](./P26-strato-accesso-dati-supabase.md#76-repository-impostazioni-utente)
e non espone mai il record `UserSettings` diretto: espone valori derivati,
già tipizzati per i consumatori, con la stessa API dei precedenti `useKV`.

| Nome | Tipo (descrittivo) | Descrizione funzionale | Note |
|---|---|---|---|
| `visibleCategories` | Array di stringhe (id categoria) | Categorie di conto visibili nella sidebar/filtri. Letto dalla chiave `visible_category_ids` nel campo `preferences` JSONB di `impostazioni_utente` (P25 §3.4). | Usato da `use-visible-data.ts` per calcolare `filteredGroupedAccounts` e `allCategoriesVisible`. Valore di default durante il caricamento: vedi Decisione B. |
| `dismissedBudgetAlerts` | Array di stringhe (id budget) | Budget per cui l'alert di soglia è stato ignorato dall'utente. Letto dalla chiave `dismissed_budget_alert_ids` nel campo `preferences` JSONB. | Usato da `use-visible-data.ts` per filtrare `budgetAlerts`. Inizialmente `[]` se la chiave è assente (primo accesso). |
| `setVisibleCategories(ids)` | Funzione asincrona | Aggiorna `preferences.visible_category_ids` tramite `updatePreference('visible_category_ids', ids)` (P26 §7.6). | Chiamata dal pannello filtri categorie. Aggiornamento non ottimistico: stato locale aggiornato solo dopo conferma DB (vedi §8 punto 7). |
| `dismissBudgetAlert(budgetId)` | Funzione asincrona | Aggiunge `budgetId` all'array `dismissed_budget_alert_ids` e chiama `updatePreference`. | Chiamata dal componente `BudgetAlertBanner` o equivalente. Idem: non ottimistico. |
| `resetDismissedAlerts()` | Funzione asincrona | Svuota `dismissed_budget_alert_ids` impostandolo a `[]` e chiama `updatePreference`. | Potrebbe essere chiamata da una futura UI "Reimposta notifiche". Stessa politica non ottimistica. |
| `isSettingsReady` | Booleano | `true` dopo che `getOrCreate()` (o il record passato da `AuthProvider`) ha restituito i valori reali delle preferenze. | Usato da `use-visible-data.ts` per decidere quale valore di default usare (Decisione B). Resettato a `false` al logout. |
| `isSettingsLoading` | Booleano | `true` durante il caricamento iniziale (`getOrCreate()`) o durante l'esecuzione di qualsiasi `updatePreference()`. | Può essere usato da componenti di scrittura (es. toggle categoria) per disabilitare il controllo durante il salvataggio. Non usato da `use-visible-data.ts` che usa `isSettingsReady`. |
| `settingsError` | Stringa o `null` | Messaggio di errore se `getOrCreate()` o un `updatePreference()` hanno fallito. `null` in assenza di errori. | In caso di errore su `updatePreference()`, lo stato locale viene comunque ripristinato al valore precedente (rollback: l'aggiornamento non è ottimistico). |

---

## 5. Decisione A — Posizione di `useUserSettings()` nell'albero React

### 5.1 Le due opzioni

**OPZIONE 1 — `UserSettingsProvider` montato dentro `AuthProvider`,
fuori da `AppDataProvider`**

La gerarchia diventa:
`AuthProvider` → `UserSettingsProvider` → `AppDataProvider` → `VisibleDataProvider` → (UI).

`useUserSettings()` viene inizializzato non appena `isAuthenticated = true`,
in parallelo o subito dopo il caricamento dei dati di dominio di
`AppDataProvider`. Le preferenze sono disponibili potenzialmente prima
che `isDataReady = true`.

Tuttavia, `AuthProvider` già chiama `impostazioni-utente.getOrCreate()`
al bootstrap per determinare `needsOnboarding`
([P27 §2](./P27-migrazione-authcontext-supabase.md#2-contesto),
[P27 §3.1](./P27-migrazione-authcontext-supabase.md#31-srccontextauthcontexttsx)):
`UserSettingsProvider` monterebbe subito dopo e chiamerebbe `getOrCreate()`
una seconda volta sullo stesso record — duplicazione della chiamata.

**OPZIONE 2 — `UserSettingsProvider` montato dentro `AppDataProvider`**

La gerarchia diventa:
`AuthProvider` → `AppDataProvider` → `UserSettingsProvider` → `VisibleDataProvider` → (UI).

`useUserSettings()` viene inizializzato solo dopo che `AppDataProvider` è
montato (ma non necessariamente dopo `isDataReady = true` — può partire
subito al mount di `AppDataProvider`, che avviene non appena
`isAuthenticated = true`). Il caricamento delle preferenze avviene in
parallelo al caricamento dei dati di dominio.

In questa opzione, `AuthProvider` passa il record `UserSettings` già
caricato (il risultato di `getOrCreate()`) via context, e `UserSettingsProvider`
lo consuma senza fare una seconda chiamata a Supabase.

### 5.2 Analisi comparativa

| Dimensione | Opzione 1 — Dentro AuthProvider | Opzione 2 — Dentro AppDataProvider |
|---|---|---|
| **Disponibilità temporale delle preferenze** | Potenzialmente prima di `isDataReady`: le preferenze arrivano mentre i dati di dominio si caricano ancora. | Stessa velocità: il provider si monta contemporaneamente ad `AppDataProvider` e lancia `getOrCreate()` (o riceve il record già caricato) subito al mount. |
| **Rischio di bootstrap race con i dati di dominio** | **Presente**: preferenze disponibili prima dei dati può produrre stati come `visibleCategories` valorizzato ma `categories` ancora `[]`. `use-visible-data.ts` deve gestire entrambi i flag `isSettingsReady` e `isDataReady` in modo coerente. | **Ridotto**: il provider è figlio di `AppDataProvider`; anche se le preferenze arrivano prima di `isDataReady`, la gerarchia è più esplicita e il gate di `App.tsx` su `isDataReady` impedisce alla UI di vedere stati parziali. |
| **Semplicità dell'albero dei provider in App.tsx** | Media — `UserSettingsProvider` si inserisce tra `AuthProvider` e `AppDataProvider`, aumentando la profondità dell'albero. | **Alta** — `UserSettingsProvider` è figlio naturale di `AppDataProvider`, che è già figlio di `AuthProvider`. L'ordine rispecchia le dipendenze. |
| **Duplicazione di `getOrCreate()` tra `AuthProvider` e `UserSettingsProvider`** | **Presente**: `AuthProvider` chiama `getOrCreate()` per `needsOnboarding`; `UserSettingsProvider` chiamerebbe di nuovo la stessa funzione. Due query Supabase per lo stesso record. | **Evitabile**: `AuthProvider` carica il record e lo espone via context; `UserSettingsProvider` lo riceve già caricato e inizializza lo stato locale senza una seconda chiamata. |
| **Coerenza con `inactivityTimeout` già in `preferences` (P27 Decisione B)** | Piena — `UserSettingsProvider` vicino ad `AuthProvider` faciliterebbe la condivisione del valore del timeout. | **Piena** — il valore `session_timeout_minutes` è già caricato da `AuthProvider` tramite `getOrCreate()`: `UserSettingsProvider` lo riceve nel record passato, non ha bisogno di accedere ad `AuthProvider` per quella chiave. |

### 5.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 2 — `UserSettingsProvider` montato dentro
`AppDataProvider`.**

La motivazione determinante è l'**eliminazione della doppia chiamata a
`getOrCreate()`**. Questa funzione è già invocata da `AuthProvider` al
bootstrap per determinare `needsOnboarding` ([P27 §3.1](./P27-migrazione-authcontext-supabase.md#31-srccontextauthcontexttsx)).
Una seconda chiamata identica da `UserSettingsProvider` comporterebbe
una query Supabase ridondante sul record `impostazioni_utente` — record
che è unico per utente (UNIQUE su `user_id`, [P25 §3.4](./P25-schema-impostazioni-utente-cifrato.md#34-schema-risultante-della-tabella-impostazioni_utente))
e che non cambia tra le due chiamate in un arco temporale così breve.

La soluzione è che `AuthProvider` esponga il record `UserSettings` già
caricato nella sua superficie pubblica (o lo passi via un contesto separato
accessibile a `UserSettingsProvider`). `UserSettingsProvider` inizializza
il proprio stato locale da quel record senza toccare Supabase. Solo i
successivi `updatePreference()` richiedono chiamate al repository.

La gerarchia `AppDataProvider` → `UserSettingsProvider` rispecchia anche
la **dipendenza logica**: le preferenze di visibilità hanno senso solo in
presenza dei dati di dominio (non ha senso avere `visibleCategories`
valorizzato prima che `categories` esista). La posizione dentro
`AppDataProvider` rende questa dipendenza esplicita nell'albero, riducendo
il rischio di stati incoerenti descritti nell'Opzione 1.

L'Opzione 1 non porta nessun vantaggio reale in termini di velocità:
`getOrCreate()` è già eseguito da `AuthProvider`, quindi il record è
disponibile a prescindere da dove si monta `UserSettingsProvider`.

---

## 6. Decisione B — Valore di default durante il caricamento (bootstrap race)

### 6.1 Le due opzioni

**OPZIONE 1 — Default "tutto visibile"**

Mentre `isSettingsReady = false`, `visibleCategories` contiene tutti
gli id delle categorie disponibili in `ACCOUNT_CATEGORIES` (ovvero tutte
e 5 le categorie di tipo: banking, digital, savings, investments, private).
L'utente vede tutte le categorie durante il caricamento; quando
`isSettingsReady` diventa `true`, il valore si aggiorna a quello reale
salvato su Supabase.

**OPZIONE 2 — Default "aspetta" (array vuoto bloccante)**

Mentre `isSettingsReady = false`, `visibleCategories` è `[]`.
I componenti che lo consumano non mostrano nessun gruppo di conti.
Nessun flash di aggiornamento, ma l'interfaccia mostra una lista vuota
durante il breve periodo di caricamento.

### 6.2 Analisi comparativa

| Dimensione | Opzione 1 — Default "tutto visibile" | Opzione 2 — Default "aspetta" |
|---|---|---|
| **Rischio di flash visivo** | **Presente**: se l'utente ha nascosto alcune categorie, le vedrà brevemente apparse durante il caricamento, poi scomparire. Percettibile soprattutto su connessioni lente. | **Nullo**: la lista rimane vuota durante il caricamento; quando le preferenze arrivano, le categorie appaiono direttamente nella configurazione corretta. |
| **Esperienza utente durante il caricamento** | La lista sembra già completa; l'aggiornamento successivo può essere disorientante ("ho visto i miei conti, poi sono scomparsi"). | Lista vuota momentanea, accettabile se breve (< 1 s in condizioni normali). |
| **Semplicità di implementazione nei componenti consumatori** | **Alta**: i componenti ricevono sempre un array non vuoto, nessuna gestione del caso array-vuoto iniziale. | Media: i componenti devono gestire il caso in cui nessuna categoria è visibile — ma questo caso esiste anche quando l'utente le ha nascoste tutte, quindi non è un caso nuovo. |
| **Comportamento al primo accesso (preferenze non ancora salvate)** | `visible_category_ids` è `null` o assente nel JSONB → il default è "tutto visibile" (stesso dell'Opzione 1). Il comportamento al primo accesso e durante il caricamento è identico — **nessun flash**. | `visible_category_ids` è `null` → l'Opzione 2 mostrerebbe comunque una lista vuota momentanea anche al primo accesso, prima che `isSettingsReady = true` confermi che "tutto visibile" è il default corretto. |
| **Coerenza con il pattern `isDataReady` di P28** | **Meno coerente**: P28 Decisione B usa uno spinner che blocca l'UI finché i dati non sono pronti — non mostra stati parziali. L'Opzione 1 mostra un valore provvisorio potenzialmente scorretto. | **Coerente**: l'approccio di P28 è "o tutto pronto o niente". Una lista vuota durante l'attesa è analoga allo spinner globale — nessun dato parziale o potenzialmente sbagliato. |

### 6.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 2 — Default "aspetta" (array vuoto bloccante).**

La coerenza con il pattern di P28 è il fattore decisivo. P28 Decisione B
ha scelto lo spinner globale perché mostrare dati parziali (stati transitori
incoerenti) in un'app finanziaria è inaccettabile. Lo stesso principio si
applica alle preferenze: mostrare categorie che l'utente ha nascosto,
anche per pochi centesimi di secondo, è una violazione della sua scelta
esplicita che può produrre confusione ("perché vedo conti che ho nascosto?").

Il **flash visivo** dell'Opzione 1 non è un evento raro: avviene ad
ogni login, su qualsiasi connessione dove `UserSettingsProvider` impiega
anche solo 200 ms in più rispetto al rendering della UI. Con la Decisione A
(Opzione 2: `UserSettingsProvider` dentro `AppDataProvider`), le preferenze
vengono caricate in parallelo ai dati di dominio — ma `isDataReady`
diventa `true` prima che `isSettingsReady` sia necessariamente `true`.
Questo rende il flash più probabile che in scenari dove le due tempistiche
coincidono.

L'**array vuoto** durante l'attesa è accettabile perché:
1. La durata è brevissima (la seconda chiamata a `getOrCreate()` è
   già stata evitata — il record è passato da `AuthProvider`).
2. I componenti che consumano `visibleCategories` gestiscono già il caso
   array-vuoto (è la condizione "tutte le categorie nascoste").
3. Al **primo accesso** (nessuna preferenza salvata), `isSettingsReady`
   diventa `true` quasi immediatamente con il record default, e
   `visibleCategories` viene impostato a "tutto visibile" senza flash.

---

## 7. Decisione C — Preferenze orfane dopo eliminazione di categoria o budget

### 7.1 Le due opzioni

**OPZIONE 1 — Pulizia automatica sincrona**

Quando `removeCategory(id)` (P28 §9.3) o `removeBudget(id)` (P28 §9.4)
completano con successo, `AppDataContext` (o `useUserSettings()`, a seconda
dell'accoppiamento) rimuove automaticamente l'`id` da `visible_category_ids`
o da `dismissed_budget_alert_ids` e chiama `updatePreference()` per
sincronizzare su Supabase.

**OPZIONE 2 — Pulizia lazy al caricamento (filtraggio silenzioso)**

Gli id orfani vengono filtrati silenziosamente durante il rendering:
`filteredGroupedAccounts` in `use-visible-data.ts` già esclude i gruppi
senza conti; gli id di categorie eliminate in `visibleCategories` non
trovano corrispondenza in `ACCOUNT_CATEGORIES` e vengono ignorati.
La pulizia fisica del JSONB avviene solo al prossimo caricamento completo
o non avviene affatto (gli id orfani restano nel JSONB ma sono innocui).

### 7.2 Analisi comparativa

| Dimensione | Opzione 1 — Pulizia automatica sincrona | Opzione 2 — Pulizia lazy |
|---|---|---|
| **Pulizia del dato su Supabase** | Immediata: il JSONB rimane sempre coerente con l'elenco delle categorie/budget realmente esistenti. | Differita o assente: il JSONB può accumulare id di entità non più esistenti. |
| **Accoppiamento tra AppDataContext e useUserSettings** | **Elevato**: `removeCategory` in `AppDataContext` deve notificare `useUserSettings` della rimozione, oppure `useUserSettings` deve osservare i cambiamenti di `categories`/`budgets` — accoppiamento bidirezionale tra due context. | **Nullo**: i due context rimangono indipendenti. Nessun evento da propagare. |
| **Rischio di crescita illimitata del JSONB** | **Nullo**: ogni rimozione di entità pulisce la preferenza corrispondente. | **Presente ma contenuto**: le categorie e i budget eliminati non si accumulano rapidamente; in un'app personale, il numero di rimozioni nel tempo è tipicamente nell'ordine delle decine. Il JSONB è un campo di testo, non una tabella; la crescita è gestibile. |
| **Semplicità di implementazione** | Bassa — richiede un meccanismo di coordinazione tra context (callback, observer, o aggiunta di logica di cleanup nelle azioni `remove*` di P28). | **Alta**: nessuna modifica alle azioni `remove*` di P28, nessun accoppiamento aggiuntivo. |
| **Impatto sull'esperienza utente** | Nessuno percettibile: la pulizia avviene in background dopo una rimozione che l'utente ha già confermato. | **Nessuno percettibile**: gli id orfani non causano UI corrotta — i componenti li ignorano silenziosamente. L'utente non percepisce la differenza. |

### 7.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 2 — Pulizia lazy al caricamento
(filtraggio silenzioso).**

Il fattore decisivo è l'**accoppiamento tra context**. La Decisione A di
P29 ha già identificato come vantaggio chiave dell'Opzione 2 il fatto che
`UserSettingsProvider` è separato da `AppDataContext` e riceve il record
iniziale da `AuthProvider` senza query aggiuntive. Introdurre un meccanismo
di notifica `removeCategory → cleanupPreferences` rompe questa separazione,
creando una dipendenza bidirezionale tra `AppDataContext` e `useUserSettings()`
che complica significativamente l'implementazione e la testabilità dei Blocchi 4 e 5.

Il **rischio di crescita del JSONB** è reale ma trascurabile nel contesto
di un'app personale: l'utente medio elimina al massimo decine di categorie
nel corso dell'intera vita dell'account. Ogni id orfano è una stringa UUID
di 36 caratteri; centinaia di id orfani occuperebbero qualche KB nel JSONB
— irrilevante per le prestazioni di Supabase o del client.

Lato **UX**, l'Opzione 2 è trasparente: `filteredGroupedAccounts` in
`use-visible-data.ts` filtra già per gruppi con conti presenti; un id di
categoria eliminata in `visible_category_ids` punta a un `ACCOUNT_CATEGORIES`
che non include quella categoria (le categorie di visibilità sono le 5
categorie di tipo conto, non le categorie di transazione). Per
`dismissed_budget_alert_ids`, il filtraggio in `budgetAlerts` include
già il controllo `alerts.filter(a => !dismissedIds.includes(a.budgetId))` —
un id di budget eliminato semplicemente non trova corrispondenza nella
lista degli alert attivi e viene ignorato.

Una eventuale pulizia batch del JSONB (rimozione di tutti gli id orfani in
una sessione) può essere aggiunta come utility nel **Blocco 10**
(decommissioning e cleanup), senza accoppiare i context ora.

---

## 8. Flusso di inizializzazione di `useUserSettings()`

Il flusso descrive il ciclo di vita del hook dall'autenticazione alla
piena disponibilità delle preferenze. È funzionale: nessun codice.

1. **Precondizione — Record `UserSettings` disponibile da `AuthProvider`**:
   come stabilito dalla Decisione A, `useUserSettings()` non chiama
   `getOrCreate()` direttamente. Quando `isAuthenticated = true`,
   `AuthProvider` ha già eseguito `impostazioni-utente.getOrCreate()` per
   determinare `needsOnboarding` ([P27 §3.1](./P27-migrazione-authcontext-supabase.md#31-srccontextauthcontexttsx)).
   Il record `UserSettings` risultante è accessibile tramite il context
   di `AuthProvider` (o tramite una prop passata a `UserSettingsProvider`
   al momento del mount). `UserSettingsProvider` si monta immediatamente
   con quel record già disponibile.

2. **Inizializzazione dello stato locale**: `useUserSettings()` inizializza
   i propri valori leggendo il campo `preferences` del record ricevuto.
   Legge:
   - `preferences.visible_category_ids` → popola `visibleCategories`
     (o usa il default della Decisione B se `null`/assente).
   - `preferences.dismissed_budget_alert_ids` → popola `dismissedBudgetAlerts`
     (usa `[]` se `null`/assente — stesso default per primo accesso e
     caricamento).

3. **Parsing di `preferences.visible_category_ids`**:
   - Se il campo è `null`, assente, o array vuoto → `visibleCategories = []`
     e `isSettingsReady = false` fino a transizione descritta al punto 5.
     In realtà, la Decisione B stabilisce che l'array vuoto è il default
     valido durante l'attesa — ma poiché il record è già disponibile al
     mount, l'`isSettingsReady = false` è un istante transitorio
     immediatamente seguito dal punto 5.
   - Se il campo contiene valori → `visibleCategories` è popolato con
     quegli id.

4. **Parsing di `preferences.dismissed_budget_alert_ids`**:
   - Analogo: se `null` o assente → `dismissedBudgetAlerts = []`.
   - Se presente → `dismissedBudgetAlerts` è popolato con gli id.

5. **Transizione a `isSettingsReady = true`**: avviene non appena
   il parsing dello step 3 e 4 è completato (operazione sincrona sul record
   già in memoria). Poiché il record è passato da `AuthProvider` al mount
   di `UserSettingsProvider`, la transizione avviene nello stesso tick
   di rendering — `isSettingsReady` passa da `false` a `true`
   senza un ciclo asincrono visibile all'utente. Questo elimina il flash
   anche con la Decisione B (array vuoto bloccante): la finestra temporale
   "array vuoto" è inferiore a un frame.

6. **Comportamento al logout**: quando `isAuthenticated` torna `false`,
   `useUserSettings()` resetta tutti i valori allo stato iniziale:
   `visibleCategories = []`, `dismissedBudgetAlerts = []`,
   `isSettingsReady = false`, `settingsError = null`. Questo avviene
   in sincronia con il reset di `AppDataContext` (P28 §8 punto 6):
   entrambi i provider sono figli di `AuthProvider` e reagiscono
   all'evento di logout.

7. **Aggiornamento tramite `updatePreference()` — non ottimistico**:
   quando l'utente chiama `setVisibleCategories(ids)` o
   `dismissBudgetAlert(budgetId)`, il hook imposta `isSettingsLoading = true`
   e chiama `updatePreference(chiave, valore)` sul repository (P26 §7.6).
   **Lo stato locale non viene aggiornato prima della conferma DB**
   (non ottimistico). Alla risposta del repository:
   - Se successo: aggiorna il valore locale (`visibleCategories` o
     `dismissedBudgetAlerts`), imposta `isSettingsLoading = false`.
   - Se errore: non modifica il valore locale (stato rollback implicito
     perché non era mai cambiato), imposta `settingsError` con il messaggio
     e `isSettingsLoading = false`. Il repository lancia `RepositoryError`
     (P26 Decisione A): il hook lo cattura e lo traduce in `settingsError`.

   La scelta non-ottimistica è coerente con la strategia di P28 §9
   (conferma-prima-di-aggiornare): le preferenze non sono critiche come
   i dati finanziari, ma la coerenza del pattern nel progetto prevale
   sulla velocità percepita per una singola operazione di toggle.

---

## 9. Integrazione con `use-visible-data.ts`

Dopo P29, `use-visible-data.ts` subisce il seguente cambiamento nella
sorgente dei dati di preferenza:

**Da dove legge `visibleCategories` (nuovo):**

Il hook non legge più `visibleCategories` da `useAppData()`. Lo legge
da `useUserSettings()`. Il valore è `string[]` come prima; la logica di
calcolo di `filteredGroupedAccounts` e `allCategoriesVisible` rimane
**identica** — cambia solo la riga di destructuring di importazione.

**Da dove legge `dismissedAlerts` (nuovo):**

Analogamente, `dismissedAlerts` (ora rinominato `dismissedBudgetAlerts`
per coerenza con la superficie di `useUserSettings()`) viene letto da
`useUserSettings()` invece di `useAppData()`. La logica di filtraggio
in `budgetAlerts` rimane identica: `alerts.filter(a => !dismissedIds.includes(a.budgetId))`.

**La logica di filtraggio cambia?**

**No**: tutta la logica di derivazione (`visibleAccounts`, `visibleTransactions`,
`filteredGroupedAccounts`, `allCategoriesVisible`, `budgetAlerts`) è
implementata tramite `useMemo` con le stesse formule di oggi. Il cambio
di sorgente non altera i risultati: se `visibleCategories = ['banking', 'digital']`,
`filteredGroupedAccounts` conterrà gli stessi due gruppi indipendentemente
dal fatto che il valore venga da `useAppData()` o `useUserSettings()`.

**Come gestisce il caso `isSettingsReady = false`:**

Quando `isSettingsReady = false`, `visibleCategories` vale `[]` (Decisione B).
`use-visible-data.ts` non fa distinzione tra "categoria non visibile per
preferenza utente" e "categorie non ancora caricate" — in entrambi i casi
`filteredGroupedAccounts` è `[]`. Questo è **accettabile** perché:

- Il caso `isSettingsReady = false` dura pochissimo (il record è già in
  memoria dal bootstrap di `AuthProvider` — vedi §8 punto 5).
- Il gate `isDataReady` di P28 §8 impedisce alla dashboard di essere
  mostrata finché i dati di dominio non sono pronti. In quel momento
  `isSettingsReady` è già `true` (o lo diventa nello stesso tick).
- La doppia condizione "dati pronti AND preferenze pronte" non richiede
  logica aggiuntiva in `use-visible-data.ts`: è garantita strutturalmente
  dalla gerarchia dei provider (Decisione A).

`use-visible-data.ts` **non deve** distinguere tra i due casi: nessuna
logica aggiuntiva di guardia `if (!isSettingsReady) return defaultValue`.
Il valore di default (array vuoto) è già il valore corretto da mostrare
durante l'attesa, e la transizione a `isSettingsReady = true` è abbastanza
rapida da non richiedere uno stato intermedio esplicito nel hook.

---

## 10. Impatto sui blocchi successivi

| Blocco P24 | Dipendenza da P29 | Note |
|---|---|---|
| **Blocco 6** — Cache `budget-percentages` | **Indiretta**: dopo P29, `AppDataContext` ha ancora la `useKV('budget-percentages', {})` rimasta. Il Blocco 6 la rimuove e la sposta in `useState` (o `localStorage` per-`user.id`). Nessuna dipendenza tecnica da P29 per questa operazione. | Il Blocco 6 è il primo blocco in cui `AppDataContext` diventa completamente libero da `@github/spark/hooks`. P29 rimuove le ultime due `useKV` di preferenze; il Blocco 6 rimuove l'ultima (cache). |
| **Blocco 7** — DataManagement | **Indiretta**: l'export JSON deve includere `preferences.visible_category_ids` e `preferences.dismissed_budget_alert_ids` come parte del dump del record `impostazioni_utente`. Dopo P29, questi valori sono accessibili tramite `useUserSettings()` o direttamente dal repository. | L'import non deve sovrascrivere le preferenze senza conferma utente: un import che cambia `visibleCategories` silenziosamente sarebbe inaspettato. |
| **Blocco 8** — PIN privato | **Indiretta**: il PIN privato usa la colonna `pin_privato_hash` in `impostazioni_utente` — stessa tabella delle preferenze. Dopo P29, il repository `impostazioni-utente` è già usato e testato in produzione tramite `updatePreference()`. `updatePinHash()` (P26 §7.6) usa lo stesso pattern: il Blocco 8 beneficia dell'infrastruttura già stabile. | Nessuna dipendenza tecnica diretta su P29. Il Blocco 8 aggiunge `updatePinHash` allo stesso repository già usato da `useUserSettings()`. |
| **Blocco 9** — Onboarding | **Diretta**: al completamento dell'onboarding, `impostazioni-utente.getOrCreate()` crea il record con i default P25 §3.4, tra cui `preferences = {}`. `useUserSettings()` (già attivo dopo P29) riceverà il record aggiornato e inizializzerà `visibleCategories` e `dismissedBudgetAlerts` ai loro valori default (tutti visibili, nessun alert ignorato). Il Blocco 9 deve assicurarsi che `needsOnboarding = false` sia impostato **prima** che `UserSettingsProvider` inizializzi il proprio stato, altrimenti `preferences` potrebbe essere `{}` (vuoto) invece dei default onboarding. | L'ordine di inizializzazione tra `AuthProvider` → `UserSettingsProvider` deve garantire che il record `impostazioni_utente` sia completamente inizializzato prima che `UserSettingsProvider` legga le preferenze. |
| **Blocco 10** — Decommissioning | **Diretta e critica**: dopo P29, `AppDataContext` ha solo `budgetPercentages` come `useKV`. Dopo il Blocco 6, nessun file in `src/context/` o `src/hooks/` usa più `@github/spark/hooks`. Il decommissioning della dipendenza Spark è reso possibile dal Blocco 6 (che chiude la catena avviata dal Blocco 4 tramite P28). P29 è il penultimo tassello: la sua completezza è prerequisito diretto per il Blocco 10. | Il Blocco 10 non può rimuovere `@github/spark/hooks` da `package.json` fino a che Blocchi 4 (P28), 5 (P29), 6 e tutti gli altri file con `useKV` siano stati migrati. P29 elimina 2 delle 3 `useKV` rimaste in `AppDataContext` dopo P28. |

---

## 11. Punti aperti residui

- **Pannello filtri/sidebar categorie**: il componente che oggi chiama
  `toggleCategoryVisibility` e `toggleAllCategories` da `AppDataContext`
  (probabilmente un componente nella sidebar o nel pannello di navigazione
  dei conti, non identificato come file separato nella struttura attuale)
  dovrà essere aggiornato nel Blocco 5 per chiamare `setVisibleCategories`
  da `useUserSettings()`. Il coding plan del Blocco 5 deve identificare
  esattamente quale componente/componenti sono interessati e mapparli.

- **Chiave `session_timeout_minutes` in `preferences`**: P27 Decisione B
  stabilisce che il timeout di inattività è salvato in
  `preferences.session_timeout_minutes` (vedi
  [P27 §6.3](./P27-migrazione-authcontext-supabase.md)). Questa chiave
  vive nello stesso JSONB gestito da `useUserSettings()`, ma la sua
  lettura e scrittura avvengono da `AuthProvider` (tramite il repository
  `impostazioni-utente` direttamente). P29 non centralizza tutte le
  preferenze in `useUserSettings()` — solo `visible_category_ids` e
  `dismissed_budget_alert_ids`. Se in futuro si vuole che `useUserSettings()`
  gestisca anche `session_timeout_minutes`, sarà necessario coordinare
  le scritture con `AuthProvider`. Punto da chiarire nel Blocco 8 o nel
  design del hook completo previsto da P24 §4.7.

- **Migrazione delle altre 22 preferenze UI** (`display-*`, `sr-*`,
  `audio-*`, `talkback-*`): P24 §4.7 e P24 §6 Blocco 5 indicano che
  queste preferenze confluiscono in `impostazioni_utente.preferences` JSONB
  e sono gestite da `useUserSettings()`. Il perimetro di P29 copre solo
  `visible_category_ids` e `dismissed_budget_alert_ids`. Le 22+ preferenze
  Display/ScreenReader/Audio/TalkBack sono migrazione separata da pianificare
  nell'ambito del coding plan del Blocco 5 esteso — oppure come Blocco 5b
  separato se il perimetro è troppo ampio per un singolo ciclo.

- **Pulizia batch degli id orfani nel JSONB**: la Decisione C sceglie la
  pulizia lazy. Una utility di cleanup che rimuove id orfani da
  `visible_category_ids` e `dismissed_budget_alert_ids` all'avvio della
  sessione (confrontando con le categorie/budget effettivamente presenti)
  è utile ma non urgente. Da aggiungere nel **Blocco 10** come operazione
  di manutenzione post-decommissioning.

---

## 12. Criteri di accettazione del documento

- [ ] Tutte le sezioni (1–12) sono presenti e non vuote.
- [ ] L'intestazione (§1) contiene la tabella completa con tutti i campi
      e il paragrafo vincolante.
- [ ] I 4 file coinvolti (§3) hanno per ciascuno: stato attuale,
      stato futuro, cosa eliminato, cosa aggiunto.
- [ ] `AppDataContext.tsx` (§3.1) cita esplicitamente la rimozione delle
      ultime due `useKV` (`visible-categories` e `dismissed-budget-alerts`)
      e il fatto che `budgetPercentages` rimane fino al Blocco 6.
- [ ] `CategoryManagement.tsx` (§3.4) descrive la doppia transizione:
      Blocco 4 (categories da `useAppData`) e Blocco 5 (visibleCategories
      da `useUserSettings`), con lo stato finale del file dopo P29.
- [ ] La superficie pubblica (§4) include tutti e 8 i valori:
      `visibleCategories`, `dismissedBudgetAlerts`, `setVisibleCategories`,
      `dismissBudgetAlert`, `resetDismissedAlerts`, `isSettingsReady`,
      `isSettingsLoading`, `settingsError`.
- [ ] Le tre decisioni (A, B, C) hanno scelta **DEFINITIVA** dichiarata
      con motivazione.
- [ ] La Decisione A (§5) cita il rischio di doppia chiamata a `getOrCreate()`
      e la soluzione (record passato da `AuthProvider` a `UserSettingsProvider`
      senza seconda query Supabase).
- [ ] La Decisione B (§6) cita il comportamento al primo accesso
      (`preferences.visible_category_ids` null o assente) e il motivo
      per cui il flash è evitato nonostante l'Opzione 2 (array vuoto) sia
      scelta.
- [ ] La Decisione C (§7) cita il rischio di crescita illimitata del JSONB
      (riconosciuto ma contenuto) e l'accoppiamento tra context come
      motivazione principale per scegliere la pulizia lazy.
- [ ] Il flusso §8 copre tutti e 7 i punti: precondizione (record da
      `AuthProvider`), inizializzazione state locale, parsing
      `visible_category_ids`, parsing `dismissed_budget_alert_ids`,
      transizione a `isSettingsReady = true`, logout, `updatePreference()`
      non ottimistico.
- [ ] La §9 copre `use-visible-data.ts` con: nuova sorgente delle preferenze,
      invarianza della logica, gestione del caso `isSettingsReady = false`,
      e la motivazione per cui non serve distinzione esplicita tra i due
      stati di assenza dati.
- [ ] La §10 copre i blocchi da 6 a 10 con dipendenza e note.
- [ ] La §11 elenca i punti aperti residui (componente filtri, timeout
      inattività, 22 preferenze UI rimanenti, pulizia orfani).
- [ ] Nessuna contraddizione con P24, P25, P26, P27, P28 rilevata.
- [ ] Tutti i link a file `src/` usano path relativi (`../../src/...`).
- [ ] Nessun frammento di codice TypeScript, JSX o SQL eseguibile
      in tutto il documento.

---

*Fine documento. Nessun file sorgente è stato modificato.*

*Messaggio di commit suggerito:*
`docs(design): creare P29 migrazione useUserSettings preferenze UI`
