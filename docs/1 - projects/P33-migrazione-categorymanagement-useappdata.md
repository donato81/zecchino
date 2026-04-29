# P33 — Migrazione CategoryManagement a useAppData()

---

## 1. Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P33 — Migrazione CategoryManagement a useAppData() |
| **Tipo intervento** | Documento di design (sola lettura) |
| **Branch** | `refactoring-architettura` |
| **Data** | 29 aprile 2026 |
| **Autore** | Agent-Design |
| **File modificati** | Nessuno |
| **Documenti di riferimento** | [P24](./P24-architettura-migrazione-supabase.md) · [P25](./P25-schema-impostazioni-utente-cifrato.md) · [P26](./P26-strato-accesso-dati-supabase.md) · [P27](./P27-migrazione-authcontext-supabase.md) · [P28](./P28-migrazione-appdatacontext-supabase.md) · [P29](./P29-migrazione-usersettings-preferenze-ui.md) · [P30](./P30-migrazione-budgetpercentages-usestate.md) · [P31](./P31-migrazione-preferenze-display-audio-screenreader.md) · [P32](./P32-migrazione-pin-privato-supabase.md) · [CategoryManagement.tsx](../../src/components/CategoryManagement.tsx) · [AppDataContext.tsx](../../src/context/AppDataContext.tsx) · [types.ts](../../src/lib/types.ts) · [constants.ts](../../src/lib/constants.ts) |
| **Stato** | Bozza — in attesa di validazione |

> **Questo documento è vincolante per tutti i design operativi successivi (P34 in poi).
> Le decisioni qui contenute sono già state validate e non vengono rimesse in discussione:
> i design successivi possono solo dettagliarne l'implementazione, non cambiarne la sostanza.**

---

## 2. Contesto

### Il split-brain R2 di P24 §3 e P28 §3.1

[P24 §3](./P24-architettura-migrazione-supabase.md) identifica il **Rischio R2** come una delle anomalie
architetturali più critiche della codebase Spark: [`CategoryManagement.tsx`](../../src/components/CategoryManagement.tsx)
e [`AppDataContext.tsx`](../../src/context/AppDataContext.tsx) aprono entrambi
`useKV('categories', [])` indipendentemente. Sono due lettori/scrittori della stessa chiave KV
che non si coordinano in nessun modo. In pratica: ogni volta che `AppDataContext` aggiorna la
lista delle categorie tramite il suo setter, `CategoryManagement.tsx` possiede una copia locale
dello stesso array, ottenuta dalla propria chiamata `useKV`. I due array possono divergere nel
momento in cui uno dei due viene aggiornato e l'altro non ha ancora ricevuto la notifica di
aggiornamento dal KV store. Questo schema è il **pattern di split-brain** documentato in P24:
due consumer indipendenti della stessa chiave KV, senza coordinamento esplicito.

[P28 §3.1](./P28-migrazione-appdatacontext-supabase.md) ha affrontato direttamente questo rischio
nel momento in cui ha ridisegnato `AppDataContext`: il paragrafo «Cosa viene aggiunto» di P28 §3.1
dichiara esplicitamente che «`CategoryManagement` smette di aprire un `useKV('categories', [])`
proprio e legge i dati direttamente da `useAppData()`». Tuttavia, quella risoluzione è descritta
come compito del **Blocco 4 di codifica**, non del design di P28. P28 §3.1 certifica la direzione
della risoluzione; P33 è il documento di design che la governa in modo vincolante.

### Perché P28 ha rimandato la risoluzione a P33

La scelta di P28 di rimandare la risoluzione del split-brain R2 di `CategoryManagement.tsx`
è strutturale, non tattica. P28 è il design del Blocco 4 per `AppDataContext`: il suo perimetro
naturale termina alla definizione della superficie pubblica del context e al comportamento dei
repository. Includere in P28 anche la trasformazione di `CategoryManagement.tsx` avrebbe
mescolato due unità di lavoro distinte nello stesso documento. P33 chiude quella pendenza con
un design autonomo, coerente con tutti i documenti P24–P32 che lo precedono.

### Stato attuale residuo

Dopo P32, rimane **1 chiamata `useKV` in un file di produzione** in tutto il codebase:
`useKV<Category[]>('categories', [])` alla riga 38 di [`CategoryManagement.tsx`](../../src/components/CategoryManagement.tsx).
Questa è l'unica dipendenza residua da `@github/spark/hooks` in `src/` (al di fuori del mock
in `src/test/setup.ts`, che non è codice di produzione). P32 §10 documenta esplicitamente
questo stato come precondizione di P33.

### Rilevanza strategica

P33 **chiude l'ultima `useKV` di produzione** in tutto il codebase. Dopo l'implementazione di P33,
nessun file `src/` (eccetto il mock di test) avrà più dipendenze da `@github/spark/hooks`.
Questo sblocca direttamente il **Blocco 10 — decommissioning Spark**: la rimozione di
`@github/spark/hooks` da `package.json` e il cleanup del mock da `src/test/setup.ts` non
possono avvenire finché `CategoryManagement.tsx` ha ancora la propria chiamata `useKV`.

### L'infrastruttura è già pronta

[P28 §4](./P28-migrazione-appdatacontext-supabase.md) ha già definito la superficie pubblica
completa di `AppDataContext`, che include esplicitamente:

- `categories` — array di `Category` (proprie dell'utente + template con `predefinita: true`),
  caricato da `categorie.getAll()` (P26 §7.3)
- `addCategory(data)` — crea una nuova categoria personalizzata su Supabase
- `updateCategory(id, data)` — aggiorna una categoria personalizzata
- `removeCategory(id)` — rimuove una categoria personalizzata, con gestione esplicita dell'errore
  FK (P28 §9.3)

`CategoryManagement.tsx` deve semplicemente smettere di gestirsi i dati autonomamente e delegare
interamente al context. Il repository `categorie` di [P26](./P26-strato-accesso-dati-supabase.md)
gestisce già la distinzione template/personali a livello di query e RLS server-side.

### La distinzione template/personali nel contesto di P33

Le categorie con `predefinita: true` e `user_id = NULL` nel DB (P26 §7.3) sono **read-only per
l'utente**: la RLS di Supabase blocca lato server qualsiasi `UPDATE` o `DELETE` su queste righe.
`CategoryManagement.tsx`, dopo P33, deve riflettere questo vincolo nella UI disabilitando i
controlli di modifica e di eliminazione per le righe template. La distinzione è già nel DB e non
deve essere ricreata lato client: il componente legge il campo `predefinita` da ogni elemento
dell'array `categories` e lo usa come unico criterio per l'abilitazione dei controlli.

---

## 3. File coinvolti e loro trasformazione

### 3.1 `src/components/CategoryManagement.tsx`

**Stato attuale (post-P32)**

Il componente usa `useKV<Category[]>('categories', [])` (riga 38) come unica fonte di dati per
le categorie. Il setter restituito da `useKV` viene usato direttamente in `handleSaveCategory`
(creazione e modifica) e in `handleDeleteCategory` (eliminazione) per aggiornare la lista
in modo sincrono e ottimistico — lo stato locale è scritto nel KV senza attendere alcuna
conferma asincrona.

Il componente distingue già visivamente le categorie template (`predefinita: true`) dalle
personalizzate: il bottone "Elimina" ha `disabled={category.predefinita}` per entrambe le
tabelle (entrate e uscite). Il bottone "Modifica" è invece abilitato per tutte le categorie,
incluse quelle template — coerente con la nota UI attuale «Le categorie predefinite possono
essere rinominate ma non eliminate». Questa policy sarà rivista dopo P33 (vedi «Aggiunto»
di seguito), poiché `updateCategory` su una categoria template lancia `RepositoryError`
(P28 §4, nota «Tentativo su template (`predefinita: true`) lancia `RepositoryError`»).

Il componente importa `useKV` da `@github/spark/hooks`. Non importa e non usa `useAppData()`.
La gestione degli errori si limita alla validazione locale (nome vuoto, nome duplicato):
non esiste nessuna gestione di errori asincroni di persistenza, perché il KV Spark non espone
vincoli referenziali.

**Stato dopo P33**

`CategoryManagement.tsx` diventa un **componente UI puro** che delegà interamente la
persistenza ad `AppDataContext`:

- Legge `categories` da `useAppData()` (P28 §4) invece di `useKV`. I dati sono già in
  memoria nel context: nessuna chiamata a Supabase origina direttamente dal componente.
- Chiama `addCategory(data)`, `updateCategory(id, data)`, `removeCategory(id)` da
  `useAppData()` in sostituzione delle scritture dirette sul KV.
- Usa `error` da `useAppData()` per rilevare l'errore FK su `removeCategory` e mostrarlo
  all'utente tramite toast (Decisione A).
- Disabilita i controlli di **modifica e di eliminazione** per le righe con `predefinita: true`
  (allineando il bottone "Modifica" al bottone "Elimina", entrambi `disabled` per i template):
  dopo P33, tentare `updateCategory` su un template produceva `RepositoryError` lato DB;
  la UI previene il tentativo a monte.

**Eliminato:**
- `useKV<Category[]>('categories', [])` (riga 38 — unica chiamata `useKV` residua nel file)
- Import di `useKV` da `@github/spark/hooks`
- Setter KV nelle funzioni `handleSaveCategory` e `handleDeleteCategory`
- Scritture ottimistiche dirette sulla lista locale: il componente non aggiorna `categories`
  direttamente in nessun caso

**Aggiunto:**
- Destructuring di `{ categories, addCategory, updateCategory, removeCategory, error }` da
  `useAppData()` (import da `@/context/AppDataContext` o percorso equivalente)
- Pattern asincrono in `handleSaveCategory` e `handleDeleteCategory`: chiamata all'azione del
  context, attesa della conferma, feedback tramite toast e screen reader solo dopo successo
- Gestione del `error` da `useAppData()` post-`removeCategory` per il caso FK (P28 §9.3):
  rilevazione del messaggio di errore specifico e presentazione tramite `toast.error` + annuncio
  screen reader (Decisione A)
- `disabled={category.predefinita}` anche sul bottone "Modifica" (allineamento al bottone
  "Elimina" che già aveva il flag; necessario perché `updateCategory` su template lancia
  `RepositoryError` — P28 §4)

**Dopo P33:** nessuna dipendenza da `@github/spark/hooks`. Questa è
**l'ultima eliminazione di `useKV` in un file di produzione** dell'intera applicazione.

---

### 3.2 `src/context/AppDataContext.tsx`

**Stato attuale (post-P28 design, pre-implementazione)**

[P28 §3.1](./P28-migrazione-appdatacontext-supabase.md) ha già stabilito che `AppDataContext`
è il writer esclusivo delle categorie e che la superficie pubblica del context (P28 §4) include
`categories`, `addCategory`, `updateCategory`, `removeCategory`. La risoluzione del split-brain
R2 di `CategoryManagement.tsx` è esplicitamente dichiarata come parte integrante del Blocco 4
di implementazione.

**Stato dopo P33**

Nessuna modifica strutturale ad `AppDataContext`. La superficie pubblica definita in P28 §4 è
già sufficiente per risolvere il split-brain R2: P33 certifica che nessuna voce aggiuntiva
è necessaria. Le azioni `addCategory`, `updateCategory`, `removeCategory` e l'array `categories`
sono esattamente ciò di cui `CategoryManagement.tsx` ha bisogno. Il comportamento di
`removeCategory` in caso di errore FK (P28 §9.3) è già specificato: il context imposta
`error` con un messaggio esplicito senza modificare lo stato locale.

**Eliminato:** Nulla da `AppDataContext` in P33.

**Aggiunto:** Nulla da `AppDataContext` in P33.

---

### 3.3 `src/lib/constants.ts`

**Stato attuale**

Esporta `DEFAULT_CATEGORIES` (array di `Omit<Category, 'id'>` con le 18 categorie predefinite),
usato oggi da `AppDataContext` nel `useEffect` di bootstrap automatico (P28 §3.1). Esporta
anche `ACCOUNT_CATEGORIES` e le costanti di lookup UI (`ACCOUNT_TYPE_LABELS`, ecc.), che
non sono toccate da P33.

**Relazione con P33**

[`CategoryManagement.tsx`](../../src/components/CategoryManagement.tsx) non importa e non usa
`DEFAULT_CATEGORIES` direttamente: legge le categorie dal proprio `useKV` locale, non da
`constants.ts`. P33 non introduce modifiche a `constants.ts`. Il destino finale di
`DEFAULT_CATEGORIES` — rimozione fisica o mantenimento come riferimento per il seeding
server-side del Blocco 9 — rimane il punto aperto documentato in [P28 §12](./P28-migrazione-appdatacontext-supabase.md):
la decisione è compito del coding plan del Blocco 4 e del design del Blocco 9, non di P33.

---

## 4. Natura della distinzione template/personali

Le categorie esposte da `AppDataContext` dopo la migrazione (P28 §4) sono un array misto: include
sia le categorie template (`predefinita: true`, `user_id = NULL` nel DB) sia le categorie
personalizzate dell'utente (`predefinita: false`, `user_id = ID utente autenticato`). Il metodo
`categorie.getAll()` di P26 §7.3 restituisce entrambe le famiglie in un'unica query (SELECT su
righe proprie + template con RLS che seleziona `user_id = auth.uid() OR predefinita = true`).

La distinzione tra le due famiglie è già codificata nel DB e non deve essere ricreata lato
client: `CategoryManagement.tsx` legge il campo `predefinita` da ogni elemento dell'array
e lo usa come unico criterio per decidere se abilitare i controlli di editing.

| Dimensione | Categorie template | Categorie personali |
|---|---|---|
| **Origine** | Inserite dalla funzione `seed_default_categories(user_id)` al completamento dell'onboarding (Blocco 9) | Create dall'utente tramite `addCategory()` in `CategoryManagement.tsx` |
| **Campo `predefinita`** | `true` | `false` |
| **Campo `user_id` nel DB** | `NULL` (P26 §7.3) | ID dell'utente autenticato |
| **Modificabilità** | Read-only: RLS blocca `UPDATE` e `DELETE` lato server | Modificabili: `updateCategory` e `removeCategory` disponibili |
| **Cosa restituisce `categorie.getAll()`** | Include entrambe (P26 §7.3: SELECT su righe proprie + template) | Include entrambe |
| **Controlli UI in `CategoryManagement.tsx` dopo P33** | Bottoni modifica e elimina disabilitati (`disabled={category.predefinita}`) | Bottoni modifica e elimina abilitati |
| **Errore su tentativo di modifica lato server** | `RepositoryError` RLS (P26 Decisione A) — non deve accadere se la UI disabilita i controlli | `RepositoryError` FK se usata da transazioni (P28 §9.3) |

Il campo `predefinita` è la **verità unica lato client** per questo discrimine. Non è necessario
confrontare `user_id` o ricorrere ad alcuna logica aggiuntiva: se `categoria.predefinita === true`,
la riga è read-only per l'utente e i controlli di editing devono essere disabilitati. Se
`categoria.predefinita === false`, la riga è gestibile dall'utente e i controlli sono abilitati.

Questa semplificazione è possibile perché la RLS di Supabase gestisce già il caso limite in
cui un utente riuscisse comunque a inviare una richiesta di modifica su un template: il server
la respinge con `RepositoryError`, indipendentemente da quanto fa la UI. La difesa UI è una
misura aggiuntiva di buona pratica (disabilita i controlli inutili, riduce la confusione
dell'utente), non l'unica linea di difesa.

---

## 5. Decisione A — Gestione errore FK su `removeCategory`

### 5.1 Il problema

Quando l'utente prova a eliminare una categoria che ha transazioni associate, `removeCategory(id)`
in `AppDataContext` chiama `categorie.remove(id)`, che fallisce con un errore di vincolo
referenziale (FK) restituito da Supabase. [P28 §9.3](./P28-migrazione-appdatacontext-supabase.md)
descrive questo caso: «il context intercetta questo caso specifico e imposta `error` con
un messaggio esplicito: "Impossibile eliminare la categoria: è usata da movimenti esistenti.
Riassegna prima i movimenti a un'altra categoria." Nessuna modifica locale.»

`CategoryManagement.tsx` deve rilevare questo `error` dopo la chiamata a `removeCategory(id)`
e mostrare il messaggio all'utente in modo comprensibile.

### 5.2 Le due opzioni

**OPZIONE 1 — Errore inline nel dialog di conferma eliminazione**

Dopo che l'utente ha cliccato il pulsante di conferma in `AlertDialog`, se `removeCategory`
fallisce con errore FK, il dialog rimane aperto e mostra il messaggio di errore specifico
inline, con un pulsante "Chiudi" per tornare alla lista.

**OPZIONE 2 — Errore come toast globale**

Dopo che `removeCategory` fallisce, il dialog si chiude (o si è già chiuso per effetto
del click sul pulsante di conferma) e un `toast.error` mostra il messaggio FK. L'utente
torna alla lista categorie.

### 5.3 Analisi comparativa

| Dimensione | Opzione 1 — Errore inline nel dialog | Opzione 2 — Toast globale |
|---|---|---|
| **Coerenza con il componente AlertDialog usato** | **Bassa**: `AlertDialogAction` di Radix UI chiude il dialog automaticamente al click — mantenere il dialog aperto dopo il fallimento richiede una ristrutturazione del componente (sostituzione di `AlertDialog` con un `Dialog` custom + gestione dello stato di errore). | **Alta**: il dialog si chiude come di consueto al click di "Elimina"; il toast appare sopra l'interfaccia senza richiedere modifiche alla struttura del dialog. |
| **Coerenza con il pattern feedback del componente** | Media: il `Dialog` (add/edit) usa errori inline tramite un blocco condizionale `{error && ...}` — quindi esiste un precedente. Ma quel pattern è per la validazione pre-invio, non per errori post-conferma. | **Alta**: tutte le azioni di scrittura riuscite in `CategoryManagement.tsx` usano `toast.success` + `screenReader.announceSuccess`. Usare `toast.error` per il fallimento è esattamente speculare al pattern di successo esistente. |
| **Complessità di implementazione** | **Alta**: richiede di sostituire `AlertDialog` con `Dialog` custom per controllare manualmente la chiusura, aggiungere uno stato locale di errore al dialog, e gestire il ciclo apertura/errore/chiusura. | **Bassa**: rilevare `error` da `useAppData()` dopo la chiamata e passarlo a `toast.error` è un'aggiunta minima che non richiede modifiche alla struttura del dialog esistente. |
| **Chiarezza del messaggio per l'utente** | Alta: l'errore appare nel contesto dell'azione che lo ha generato. | Buona: il toast è visibile e il messaggio FK è esplicito; l'utente sa cosa fare. Può essere potenziato con `screenReader.announceError` per l'accessibilità. |

### 5.4 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 2 — Toast globale.**

Il fattore determinante è la struttura del componente `AlertDialog` attualmente in uso in
[`CategoryManagement.tsx`](../../src/components/CategoryManagement.tsx). Il pulsante di
conferma usa `AlertDialogAction` di Radix UI, che chiude il dialog automaticamente al click:
non è possibile mantenere il dialog aperto dopo il click senza ristrutturare il componente,
sostituendo `AlertDialog` con un `Dialog` custom. Questa ristrutturazione espanderebbe il
perimetro di P33 oltre la risoluzione del split-brain R2 e introdurrebbe rischio di regressione
senza un beneficio proporzionale.

Il pattern `toast.error` è perfettamente coerente con il feedback esistente del componente:
`handleSaveCategory` usa `toast.success` per creazione e modifica riuscite,
`handleDeleteCategory` usa `toast.success` per eliminazione riuscita. Usare `toast.error`
con il messaggio FK di P28 §9.3 per l'eliminazione fallita è il pattern speculare naturale,
mantenendo l'intera logica di feedback sul medesimo canale (toast + screen reader), senza
duplicare strutture di errore o modificare il layout dei dialog.

---

## 6. Decisione B — Gestione della migrazione dati storici dal KV

### 6.1 Il problema

Gli utenti che usano l'app con Spark hanno categorie personalizzate salvate nel KV Spark
(`useKV('categories', [])`). Al primo accesso post-distribuzione di P33, se nessuna logica
di migrazione è presente, `AppDataContext` legge da Supabase tramite `categorie.getAll()`:
le categorie personalizzate non sono ancora lì (sono ancora nel KV locale) e l'array restituito
conterrà solo le categorie template (`predefinita: true`) inserite dal Blocco 9. L'utente
perderebbe tutte le categorie personalizzate create durante l'uso dell'app Spark.

Questo problema è distinto dalla migrazione delle preferenze (P31 Decisione C): le categorie
personalizzate sono **dati di dominio** (oggetti `Category` con `id`, `nome`, `tipo`,
`predefinita`), non preferenze scalari. Richiedono un trattamento specifico separato dalla
migrazione JSONB delle preferenze.

### 6.2 Le due opzioni

**OPZIONE 1 — Migrazione one-shot al primo accesso post-distribuzione (coordinata con Blocco 7)**

Al primo login post-distribuzione P33, se `categorie.getAll()` restituisce zero categorie con
`predefinita = false` e `user_id = ID utente` (nessuna categoria personalizzata su Supabase),
`AppDataContext` legge `useKV('categories', [])` dal Spark KV, filtra le categorie con
`predefinita: false` (quelle personalizzate dell'utente), e le scrive su Supabase tramite
`categorie.create()` per ciascuna. Al secondo login, le categorie personalizzate sono già
su Supabase e la logica di migrazione non viene rieseguita.

**OPZIONE 2 — Migrazione delegata interamente al Blocco 7 (DataManagement)**

Il DataManagement (Blocco 7) gestisce l'export/import di tutte le entità di dominio dal KV
a Supabase come flusso manuale avviato dall'utente. Le categorie personalizzate vengono
migrate insieme alle transazioni, ai conti, ai budget e agli obiettivi nel flusso generale
del Blocco 7.

### 6.3 Analisi comparativa

| Dimensione | Opzione 1 — Migrazione one-shot in AppDataContext | Opzione 2 — Delegata al Blocco 7 |
|---|---|---|
| **Trasparenza per l'utente** | **Automatica**: l'utente non deve fare nulla. Le categorie personalizzate appaiono immediatamente dopo la distribuzione, senza interruzione del workflow. | **Manuale**: l'utente deve avviare l'import dal DataManagement. Se non lo fa — o se non lo trova — perde le categorie personalizzate ("Mutuo", "Affitto", "Palestra") fino all'import esplicito. |
| **Coerenza con P31 Decisione C** | **Piena**: P31 Decisione C ha scelto la migrazione one-shot per le preferenze di accessibilità perché «resettarle ai default è equivalente a rimuovere temporaneamente l'accessibilità dell'app». Lo stesso principio si applica a categorie personalizzate: perderle interrompe la coerenza di tutti i report e budget associati. | **Parziale**: le preferenze vengono migrate automaticamente (P31), i dati di dominio no. Incoerenza percepita dall'utente che deve intraprendere un'azione manuale per recuperare le sue categorie. |
| **Complessità in AppDataContext** | Media: richiede logica di detection (zero categorie personalizzate su Supabase) + lettura dal KV + `create()` per ciascuna categoria personalizzata. Il flag di migrazione completata (`legacy_categories_migrated` in `preferences JSONB` — P25 §3.4) previene la riesecuzione. | Nulla in AppDataContext. |
| **Coordinamento con Blocco 7** | Leggero: il Blocco 7 deve escludere la chiave `categories` dalla sua migrazione batch (già gestita da P33). La lista delle chiavi escluse va documentata nel coding plan del Blocco 7. | Nessuno: il Blocco 7 gestisce tutto. |
| **Rischio di duplicati** | Presente se la migrazione one-shot e l'import manuale del Blocco 7 vengono entrambi eseguiti. La detection deve confrontare per nome e tipo, non solo per conteggio, per evitare duplicati. | Assente: il Blocco 7 gestisce internamente la deduplicazione. |

### 6.4 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Migrazione one-shot al primo accesso post-distribuzione.**

La scelta è diretta discendente di [P31 Decisione C](./P31-migrazione-preferenze-display-audio-screenreader.md):
P31 ha stabilito che **i dati personalizzati dell'utente non devono essere resettati
silenziosamente** al momento della migrazione. Lo stesso principio si applica con forza
ancora maggiore alle categorie personalizzate, che sono dati di dominio strutturali: ogni
transazione esistente è associata a una `categoria_id`, e ogni budget è associato a una
categoria. Se le categorie personalizzate venissero perse al primo login post-distribuzione,
tutti i report e tutti i budget associati perderebbero la loro categoria di riferimento —
un danno non estetico ma funzionale, direttamente visibile sull'uso principale dell'app.

L'Opzione 2 (Blocco 7) sposterebbe il peso della migrazione sull'utente: l'utente dovrebbe
scoprire da solo che deve eseguire un import dal DataManagement, capire come farlo, e farlo
prima di poter usare correttamente l'app migrata. Questa barriera è inaccettabile per la
stessa ragione per cui P31 ha rifiutato il reset delle preferenze di accessibilità.

La complessità aggiuntiva dell'Opzione 1 in `AppDataContext` è marginale: la detection
(zero categorie personalizzate su Supabase dopo `getAll()`) è una condizione semplice da
verificare, e la scrittura one-shot di un batch di categorie personalizzate riusa esattamente
lo stesso `categorie.create()` già disponibile in `AppDataContext`. I dettagli implementativi
del meccanismo esatto di detection e del flag `legacy_categories_migrated` sono documentati
come punto aperto nel §10, da risolvere nel coding plan del Blocco 4.

---

## 7. Flusso post-P33 di `CategoryManagement.tsx`

Di seguito il ciclo di vita completo del componente dopo la migrazione. Non contiene codice:
è la specifica funzionale vincolante per il coding plan del Blocco 4.

1. **Precondizione**: `isDataReady = true` in `AppDataContext` (P28 §8, punto 5).
   `CategoryManagement.tsx` è accessibile all'utente solo quando la dashboard è completamente
   caricata. Non deve gestire un proprio stato di loading per le categorie: l'array `categories`
   è già in memoria in `AppDataContext` al momento in cui il componente viene montato nell'uso
   normale. Il gate `!isDataReady` in `App.tsx` garantisce questa precondizione.

2. **Lettura delle categorie**: il componente ottiene da `useAppData()` i campi
   `categories`, `addCategory`, `updateCategory`, `removeCategory` e `error`. L'array `categories`
   include sia le template (`predefinita: true`) sia le personalizzate (`predefinita: false`).
   Nessuna chiamata a Supabase origina dal componente: i dati sono già in memoria nel context.
   La separazione in `incomeCategories` e `expenseCategories` per il rendering nelle due tabelle
   rimane invariata (filtro su `tipo`).

3. **Distinzione template/personalizzate nella UI**: per ogni categoria in `categories`, il
   componente controlla `categoria.predefinita`. Se `true`: i controlli di modifica e di
   eliminazione sono `disabled`. Se `false`: i controlli sono abilitati. Il bottone "Modifica"
   acquisisce lo stesso flag `disabled={category.predefinita}` che il bottone "Elimina" aveva
   già prima di P33 — allineamento necessario perché `updateCategory` su template lancia
   `RepositoryError` (P28 §4).

4. **Creazione categoria**: l'utente compila il form (nome, tipo) e conferma. Il componente
   chiama `addCategory(data)` in modo asincrono. Se la chiamata ha esito positivo, `AppDataContext`
   aggiorna `categories` e il componente si aggiorna di conseguenza tramite il re-render reattivo
   del context. Il feedback di successo (`toast.success`, `screenReader.announceSuccess`) viene
   emesso dopo la conferma. Se la chiamata fallisce: il context imposta `error` e il componente
   mostra il messaggio tramite `toast.error` + `screenReader.announceError`.

5. **Modifica categoria**: il componente chiama `updateCategory(id, data)` in modo asincrono.
   Pattern non ottimistico (P29 §8, punto 7): lo stato locale viene aggiornato solo dopo conferma
   da `AppDataContext`. Il componente non modifica `categories` direttamente. Il bottone "Modifica"
   è `disabled` per le categorie template: questa chiamata non verrà mai invocata su un template
   se la UI è corretta.

6. **Eliminazione categoria**: il componente mostra `AlertDialog` di conferma. Se l'utente
   conferma (`AlertDialogAction`), il dialog si chiude automaticamente (comportamento Radix UI)
   e il componente chiama `removeCategory(id)` in modo asincrono. Se la categoria è usata da
   transazioni, `AppDataContext` imposta `error` con il messaggio FK (P28 §9.3) senza modificare
   lo stato locale: il componente rileva `error` e lo mostra tramite `toast.error` +
   `screenReader.announceError` (Decisione A — Opzione 2).

7. **Stato `isLoading`**: P28 §4 definisce `isLoading` come `true` durante il caricamento
   iniziale e durante `refreshAll()`. Non è esplicitato se `isLoading` viene impostato a `true`
   anche durante le singole operazioni CRUD (`addCategory`, `updateCategory`, `removeCategory`).
   Il comportamento esatto — se il componente può usare `isLoading` per disabilitare i controlli
   durante un'operazione in corso, oppure deve gestire un proprio `useState` locale `isOperationPending`
   — è un punto aperto documentato nel §10, da chiarire nel coding plan del Blocco 4 in base
   all'implementazione effettiva di `AppDataContext`.

8. **Reset al logout**: `AppDataContext` resetta `categories` a `[]` e `error` a `null` al
   logout (P28 §8, punto 6). `CategoryManagement.tsx` non gestisce il reset: lo riceve
   automaticamente tramite il context, re-renderizzando con un array vuoto non appena
   `isAuthenticated` torna `false`.

---

## 8. Impatto sul decommissioning Spark (Blocco 10)

P32 §10 ha stabilito il conteggio residuo di chiamate `useKV` dopo la migrazione del PIN
privato. P33 elimina 1 chiamata nel file di produzione.

**Situazione prima di P33 (post-P32):**

| File | Chiamate `useKV` | Blocco di risoluzione |
|---|---|---|
| `src/components/CategoryManagement.tsx` | 1 (`categories`) | P33 (questo documento) |
| `src/test/setup.ts` | 1 (mock) | Blocco 10 |
| **Totale** | **2** | — |

**Situazione dopo P33 (1 chiamata eliminata da `CategoryManagement.tsx`):**

| File | Chiamate `useKV` dopo P33 | Blocco di risoluzione |
|---|---|---|
| `src/test/setup.ts` | 1 (mock) | Blocco 10 |
| **Totale residuo** | **1** | — |

**Nota strategica**: dopo P33, **nessun file di produzione in `src/`** contiene più chiamate
`useKV` o accessi a `@github/spark/hooks`. L'unica dipendenza residua dal pacchetto Spark è
il mock in `src/test/setup.ts`, che non è codice di produzione e viene rimosso nel Blocco 10.
Il Blocco 10 può partire immediatamente dopo l'implementazione di P33: rimuove
`@github/spark/hooks` da `package.json`, elimina il mock da `src/test/setup.ts`, e verifica
che nessun file `src/` abbia dipendenze residue da `@github/spark/hooks` o accessi diretti
a `window.spark.kv`.

---

## 9. Impatto sui blocchi successivi

| Blocco P24 | Dipendenza da P33 | Note |
|---|---|---|
| **Blocco 7 — DataManagement** | **Dipendente** | P33 Decisione B sceglie la migrazione one-shot in `AppDataContext` per le categorie personalizzate. Il Blocco 7 deve **escludere** la chiave `categories` dalla sua migrazione batch: le categorie personalizzate sono già migrate automaticamente da P33 al primo login post-distribuzione. Il coding plan del Blocco 7 deve documentare esplicitamente la lista delle chiavi KV escluse dalla migrazione manuale (almeno `categories`; vedi anche `private-pin-hash` esclusa da P32 §11). Se la migrazione one-shot di P33 è già avvenuta (flag `legacy_categories_migrated` impostato), il Blocco 7 deve verificare la presenza di questo flag prima di tentare un import di categorie, per prevenire duplicati. |
| **Blocco 9 — Onboarding** | **Dipendente** | La funzione `seed_default_categories(user_id)` (Blocco 9) popola la tabella `categorie` con righe `predefinita: true, user_id = NULL` al completamento dell'onboarding. Dopo P33, `CategoryManagement.tsx` legge queste righe tramite `categorie.getAll()` (P26 §7.3). Il seed deve essere completato prima che `CategoryManagement` sia accessibile: se l'utente completa l'onboarding e non vengono inserite le categorie template, il componente mostrerà solo le categorie personalizzate eventualmente migrate dall'Opzione 1 di Decisione B, senza le template predefinite. |
| **Blocco 10 — Decommissioning** | **Prerequisito diretto** | P33 elimina l'ultima `useKV` di produzione. Il Blocco 10 può partire dopo l'implementazione di P33: rimuove `@github/spark/hooks` da `package.json`, il mock da `src/test/setup.ts`, e verifica che nessun file `src/` abbia dipendenze residue. Senza P33 implementato, il tentativo di rimuovere `@github/spark/hooks` rompe la compilazione perché `CategoryManagement.tsx` importa ancora il pacchetto. P33 è la **precondizione diretta e necessaria** del Blocco 10. |

---

## 10. Punti aperti residui

- **Comportamento di `isLoading` durante operazioni singole (`addCategory`, `updateCategory`,
  `removeCategory`)**: [P28 §4](./P28-migrazione-appdatacontext-supabase.md) definisce `isLoading`
  come `true` durante il caricamento iniziale e durante `refreshAll()`. Non è esplicitato se
  `isLoading` viene impostato a `true` anche durante le singole operazioni CRUD. `CategoryManagement.tsx`
  deve sapere se può usare `isLoading` per disabilitare i controlli (es. disabilitare il bottone
  "Nuova Categoria" mentre `addCategory` è in corso), oppure se deve gestire un proprio `useState`
  locale `isOperationPending`. Il coding plan del Blocco 4 deve chiarire questo punto basandosi
  sull'implementazione effettiva di `AppDataContext` post-P28.

- **Meccanismo di detection per la migrazione one-shot delle categorie personalizzate
  (Decisione B)**: il criterio di rilevamento «zero categorie personalizzate con `user_id = utente`
  su Supabase» deve essere reso robusto. Un utente che ha cancellato volontariamente tutte le sue
  categorie personalizzate non deve scatenare una migrazione involontaria. Un approccio possibile
  è un flag `legacy_categories_migrated` nel campo `preferences JSONB` (P25 §3.4), da impostare
  a `true` al termine della migrazione one-shot. La detection diventerebbe: «se
  `legacy_categories_migrated` non è `true` in `preferences`, esegui la migrazione; dopo la
  migrazione, imposta il flag». Il meccanismo esatto — incluso il comportamento quando il KV Spark
  non è accessibile durante la migrazione one-shot — è un punto aperto da documentare e decidere
  nel coding plan del Blocco 4.

- **Destino finale di `DEFAULT_CATEGORIES` in `constants.ts`** (ereditato da [P28 §12](./P28-migrazione-appdatacontext-supabase.md)):
  dopo P33, `DEFAULT_CATEGORIES` non è più usata né da `CategoryManagement.tsx` (che legge da
  `useAppData()`) né da `AppDataContext` (che usa `categorie.getAll()` invece del bootstrap
  client-side). La costante è un artefatto del design Spark. Il coding plan del Blocco 4 deve
  decidere se rimuoverla fisicamente da [`constants.ts`](../../src/lib/constants.ts) o mantenerla
  come riferimento documentale per il seeding server-side del Blocco 9 (`seed_default_categories`
  deve usare gli stessi nomi e tipi delle categorie default oggi in `DEFAULT_CATEGORIES`).

- **Verifica di accessi diretti `window.spark.kv` residui dopo P33**: dopo P31, P32 e P33,
  l'analisi del sorgente deve verificare che nessun file `src/` (al di fuori di
  `DataManagement.tsx`, target del Blocco 7) usi ancora `window.spark.kv` direttamente per
  chiavi di produzione. Il coding plan del Blocco 10 deve eseguire questa verifica
  (grep su `window.spark.kv` in tutti i file `src/`) prima di procedere con il decommissioning
  del pacchetto.

---

## 11. Criteri di accettazione del documento

- [ ] Tutte le sezioni 1–11 sono presenti e non vuote.
- [ ] §1 ha intestazione completa con tutti i campi obbligatori e il paragrafo vincolante
      «P34 in poi» nella forma del blockquote.
- [ ] §2 cita esplicitamente il split-brain R2 di P24 §3 e P28 §3.1 come origine del problema
      e spiega il meccanismo (due consumer indipendenti della stessa chiave KV).
- [ ] §2 dichiara esplicitamente che P33 chiude l'ultima `useKV` di produzione.
- [ ] §2 certifica che l'infrastruttura è già pronta (P28 §4 è sufficiente).
- [ ] §3.1 copre `CategoryManagement.tsx` con: stato attuale (riga `useKV`, pattern sincrono,
      assenza di gestione errori asincroni), stato dopo P33 (consumer puro di `useAppData()`),
      cosa eliminato (incluso import da `@github/spark/hooks`), cosa aggiunto (inclusa gestione
      errore FK), conferma «nessuna dipendenza da `@github/spark/hooks` dopo P33».
- [ ] §3.1 documenta il cambiamento comportamentale sul bottone "Modifica" (da abilitato per
      template a `disabled={category.predefinita}`, allineato al bottone "Elimina").
- [ ] §3.2 dichiara esplicitamente che `AppDataContext` non richiede modifiche da P33 e che
      la superficie pubblica di P28 §4 è già sufficiente.
- [ ] §3.3 dichiara che P33 non modifica `constants.ts` e rimanda il destino di `DEFAULT_CATEGORIES`
      al punto aperto di P28 §12.
- [ ] §4 ha tabella comparativa template/personali con almeno 7 dimensioni e spiegazione in prosa
      del campo `predefinita` come unica verità lato client.
- [ ] Decisione A (§5) ha **scelta definitiva dichiarata in grassetto** (Opzione 2 — Toast globale)
      con motivazione che cita il comportamento di `AlertDialogAction` e il pattern `toast.success`
      esistente nel componente.
- [ ] Decisione B (§6) ha **scelta definitiva dichiarata in grassetto** (Opzione 1 — migrazione
      one-shot) con riferimento esplicito a P31 Decisione C e al principio di non perdita dei
      dati personalizzati.
- [ ] §7 ha tutti e 8 i punti del flusso, ciascuno non vuoto.
- [ ] §7 punto 6 descrive esplicitamente il comportamento di `AlertDialogAction` (chiusura
      automatica) e il flusso di gestione errore FK tramite toast (Decisione A).
- [ ] §8 aggiorna il conteggio da P32 §10: da 2 a 1 chiamata `useKV` residua dopo P33.
- [ ] §8 dichiara esplicitamente che dopo P33 nessun file di produzione in `src/` ha più `useKV`.
- [ ] §9 copre Blocco 7 (con nota sull'esclusione di `categories` dalla migrazione batch e
      coordinamento con il flag `legacy_categories_migrated`), Blocco 9 (seed template come
      precondizione), Blocco 10 (prerequisito diretto).
- [ ] §10 documenta almeno 4 punti aperti: `isLoading` durante CRUD, meccanismo di detection
      migrazione one-shot, destino `DEFAULT_CATEGORIES`, verifica accessi diretti `window.spark.kv`.
- [ ] Nessuna contraddizione con P24–P32 rilevata.
- [ ] Tutti i link a file `src/` usano path relativi (`../../src/...`).
- [ ] Nessun frammento TypeScript, JSX o SQL eseguibile in tutto il documento.

---

*Fine documento. Nessun file sorgente è stato modificato.*

*Messaggio di commit suggerito:*
`docs(design): creare P33 migrazione CategoryManagement a useAppData`
