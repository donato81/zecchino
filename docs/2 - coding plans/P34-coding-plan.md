# P34 — Coding Plan: Migrazione DataManagement a Supabase

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P34 — Blocco 7 — Migrazione DataManagement a Supabase
> Design di riferimento: `docs/1 - projects/P34-migrazione-datamanagement-supabase.md`
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-03

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P34 — Migrazione DataManagement a Supabase |
| **Tipo intervento** | Implementazione |
| **Branch** | `refactoring-architettura` |
| **Data** | 2026-05-03 |
| **File modificati** | `src/components/DataManagement.tsx` |
| **Documenti di riferimento** | [P34 design](../1%20-%20projects/P34-migrazione-datamanagement-supabase.md) · [P24](../1%20-%20projects/P24-architettura-migrazione-supabase.md) · [P26](../1%20-%20projects/P26-strato-accesso-dati-supabase.md) · [P28](../1%20-%20projects/P28-migrazione-appdatacontext-supabase.md) · [P29](../1%20-%20projects/P29-migrazione-usersettings-preferenze-ui.md) · [P33](../1%20-%20projects/P33-migrazione-categorymanagement-useappdata.md) |

---

## §2 — Prerequisiti e stato attuale

### Stato attuale di `DataManagement.tsx` post-P33

Il componente gestisce oggi backup e ripristino dei dati dell'applicazione tramite le API
dirette del runtime **Spark** (KV store proprietario GitHub Spark). I quattro accessi diretti
a `window.spark.kv.*` sono:

1. **`window.spark.kv.keys()`** in `handleExportData` — recupera la lista di tutte le chiavi
   presenti nel KV Spark.
2. **`window.spark.kv.get(key)`** in `handleExportData` — itera su ogni chiave e ne legge il valore
   per costruire il payload di export. Nessuna selezione: vengono lette indiscriminatamente
   tutte le chiavi, incluse quelle di sistema e quelle già migrate nei blocchi precedenti.
3. **`window.spark.kv.set(key, value)`** in `handleImportData` — itera su ogni coppia del file
   JSON e la scrive nel KV Spark. Nessun filtro: vengono scritte tutte le coppie presenti,
   incluse chiavi di preferenze, pin hash e categorie già migrate altrove.
4. **`window.location.reload()`** a fine `handleImportData` — ricarica la pagina per
   applicare i dati scritti nel KV.

Il componente **non importa** `useAppData()`, `useAuth()` né nessun repository da
`src/lib/supabase/`. Non usa `useKV` da `@github/spark/hooks`.

### Perché questo è il Rischio R7 di P24 §7

P24 §7 classifica `DataManagement.tsx` come **Rischio R7** dell'intera migrazione:
«`DataManagement` export/import oggi cicla su `window.spark.kv.keys()`. Romperà il backup
esistente.» Il rischio è duplice:

- **Dopo la migrazione, i dati di dominio sono su Supabase, non nel KV.** Un export che
  legge dal KV produrrà un file vuoto o parziale per gli utenti già migrati — il backup non
  includerà conti, transazioni, budget e obiettivi di risparmio.
- **Un import su `window.spark.kv.set()` non scrive su Supabase.** Il ripristino è
  silenziosamente non funzionante: i valori vengono scritti nel KV locale, non nelle tabelle
  PostgreSQL di Supabase.

### Prerequisiti verificabili prima di scrivere codice

- P28 completato: `useAppData()` espone `accounts`, `transactions`, `budgets`, `savingsGoals`,
  `isDataReady`, `refreshAll()` — superficie pubblica sufficiente per export e refreshAll
  post-import.
- P29 completato: `useUserSettings()` espone in lettura il flag `legacy_domain_migrated`
  dalla tabella `impostazioni_utente.preferences`.
- P26 completato: i repository `conti`, `transazioni`, `budget`, `obiettivi_risparmio`
  espongono `getAll()`, `create()`, `getById()`, `update()`, e il repository
  `impostazioni-utente` espone `updatePreference()` (P26 §7.6).
- P33 completato: le categorie personalizzate sono già su Supabase. Il flag
  `legacy_categories_migrated` è già in `preferences JSONB`. P34 non tocca le categorie.

---

## §3 — Risoluzione PA-1: approccio scelto per il remapping degli ID

### Il problema

I repository di P26 espongono `create(data)` con input `Omit<Entità, 'id'>`: l'ID è sempre
generato dal database tramite `gen_random_uuid()`. Quando i conti vengono inseriti su Supabase
dal KV Spark, il database assegna UUID nuovi — diversi dagli ID originali Spark. Le transazioni,
i budget e gli obiettivi nel KV Spark referenziano i conti tramite i loro ID originali Spark
(`conto_id`, `conto_destinazione_id`, `conto_id` nel budget). Se questi campi FK non vengono
aggiornati con i nuovi UUID Supabase prima dell'inserimento, le righe verranno rifiutate per
violazione FK.

### Approccio scelto: Approccio A — Remapping in memoria

**Non si modifica il contratto di P26.** Durante la Fase 2 della migrazione one-shot (Fronte A),
viene costruita in memoria una mappa `sparkId → supabaseId` per i conti al momento del loro
inserimento. Ogni chiamata a `conti.create(conto)` restituisce il record creato con il nuovo
UUID Supabase; la mappa viene aggiornata con la coppia `{ sparkId: conto.id (originale Spark)
→ supabaseId: record.id (nuovo UUID Supabase) }`. Prima di inserire transazioni, budget e
obiettivi, i campi FK in ciascun oggetto vengono riscritti usando la mappa.

**Come viene costruita e applicata la mappa:**

1. Prima dell'inserimento dei conti, si inizializza una struttura `Map<string, string>()` vuota
   chiamata `sparkToSupabaseIdMap`.
2. Per ogni conto nel KV Spark, si chiama `conti.create(datiConto)` (con i campi propri del conto,
   non l'ID originale). Al ritorno, si registra `sparkToSupabaseIdMap.set(idOriginaleSpark, record.id)`.
3. Prima di inserire un budget: se `budget.conto_id` è valorizzato, lo si rimappa tramite la mappa.
4. Prima di inserire un obiettivo: se `obiettivo.conto_associato` è valorizzato, lo si rimappa.
5. Prima di inserire una transazione: `transazione.conto_id` viene rimappato (obbligatorio);
   se `transazione.conto_destinazione_id` è valorizzato (trasferimento), viene rimappato anch'esso.
6. Se un ID Spark referenziato non è presente nella mappa (es. il conto ha fallito l'inserimento),
   l'entità dipendente viene aggiunta al report errori senza tentare l'inserimento.

**Motivazione:**
L'Approccio A non richiede alcuna modifica al contratto di P26 — è il principio di minima
intrusione. L'Approccio B (aggiungere `createWithId()` ai repository) avrebbe richiesto
modifiche a più file di P26 e alla RLS su Supabase, complicando la superficie di P26 per
un caso d'uso one-shot temporaneo (il Blocco 10 rimuoverà l'intero Fronte A).

---

## §4 — Risoluzione PA-2: comportamento del rilevamento quando Spark non è accessibile

La logica di rilevamento gestisce i tre scenari aperti identificati in P34 §11 (PA-2):

### Scenario 1 — `window.spark` disponibile ma `kv.keys()` restituisce errore di rete

Il blocco `try/catch` attorno alla lettura del KV cattura l'eccezione. Il pannello di migrazione
**non viene mostrato**. Viene mostrato un messaggio informativo inline:
«Connessione ai dati storici non riuscita. Riprova più tardi.»
Il flag `legacy_domain_migrated` **non viene impostato**. Al prossimo accesso alla schermata,
la logica di rilevamento viene rieseguita.

### Scenario 2 — `window.spark` disponibile e `kv.keys()` restituisce array vuoto

I dati Spark non esistono mai o sono già stati eliminati manualmente. Il componente
imposta `legacy_domain_migrated = true` direttamente tramite
`impostazioni-utente.updatePreference('legacy_domain_migrated', true)` **senza mostrare
il pannello di migrazione**. Questo evita che il pannello riappaia all'utente che non ha
mai avuto dati Spark (account creato dopo la distribuzione del Blocco 7).

### Scenario 3 — `window.spark` non definito

Il contesto di esecuzione non include il runtime Spark (browser con script bloccati, o
contesto post-decommissioning). Il componente imposta `legacy_domain_migrated = true`
direttamente **senza mostrare il pannello**. Stessa logica del Scenario 2: nessun dato
da migrare, flag impostato per prevenire futuri check.

> **Regola generale**: il pannello di migrazione viene mostrato solo se `window.spark`
> è accessibile E `kv.keys()` restituisce almeno una chiave tra le quattro entità di dominio
> (`accounts`, `transactions`, `budgets`, `savings-goals`). In tutti gli altri casi, il flag
> viene impostato direttamente (scenari 2 e 3) oppure viene mostrato un messaggio di retry
> (scenario 1).

---

## §5 — Risoluzione PA-3: versioning del file JSON

Il campo `meta.schema_version` nel file JSON esportato da Zecchino (Fronte B) segue questa
policy:

- **Valore iniziale:** `"1.0"` — versione introdotta in P34.
- **Compatibilità:** versioni con lo stesso numero major (es. `"1.0"`, `"1.1"`, `"1.2"`)
  sono **retrocompatibili** tra di loro: un file versione `1.x` può essere importato in
  qualsiasi versione dell'app che supporta major `1`. Versioni con major diverso (es. `"2.0"`)
  sono **incompatibili**: l'import viene bloccato con un messaggio esplicito all'utente.
- **Campo `app_version`:** incluso come stringa opzionale nel campo `meta` (es.
  `meta.app_version: "0.0.0"`) a scopo di debug. Non viene usato per la verifica di
  compatibilità. La sua assenza non blocca l'import.
- **Messaggio di errore in caso di versione incompatibile:**
  «Il file di backup non è compatibile con questa versione dell'app (versione file: X,
  versione supportata: 1.x). Esporta un nuovo backup dall'app corrente.»

**Implementazione del check major:**
All'import, si legge `meta.schema_version`, si estrae il numero major (caratteri prima del
primo `.`), e si confronta con il major supportato (`"1"`). Se sono diversi, l'import viene
bloccato prima di qualsiasi operazione su Supabase.

---

## §6 — Risoluzione PA-4: comportamento additivo dell'import

L'import del Fronte B è **additivo/aggiornante**, non sostitutivo.

- Le entità presenti su Supabase ma assenti nel file JSON **rimangono intatte**. Nessuna
  operazione `remove()` o `delete()` viene eseguita durante l'import, né per le entità
  assenti nel file né per nessun'altra entità.
- Il meccanismo upsert (Decisione B) crea le entità nuove e aggiorna quelle già presenti
  con i dati del file, ma non rimuove mai dati esistenti.

**Questo comportamento deve essere comunicato all'utente nel dialog di conferma pre-import:**
«Questa operazione creerà le entità non ancora presenti e aggiornerà quelle esistenti con i
dati del file di backup. I dati presenti nell'app ma non inclusi nel file non saranno
eliminati.»

---

## §7 — Risoluzione PA-5: pulizia del KV Spark dopo migrazione

Le chiavi `accounts`, `transactions`, `budgets`, `savings-goals` nel KV Spark **non vengono
cancellate** dopo il completamento della migrazione one-shot.

**Motivazione:** la pulizia del KV Spark è responsabilità del Blocco 10 (decommissioning
del runtime Spark), non del Blocco 7. Eseguire `window.spark.kv.delete(key)` per quattro
chiavi aumenta il perimetro di interazione con Spark in P34 per un beneficio basso (il flag
`legacy_domain_migrated = true` è già sufficiente a impedire che il pannello di migrazione
riappaia). Il Blocco 10, che ha la visione completa di tutte le chiavi residue da rimuovere,
è il contesto più appropriato per questa operazione.

**Effetto pratico:** dopo la migrazione riuscita, il flag `legacy_domain_migrated = true`
blocca il rilevamento e il pannello non viene più mostrato. I dati Spark originali rimangono
nel KV come copia passiva, senza impatto sull'applicazione.

---

## §8 — Risoluzione PA-6: precondizione Blocco 9 (seed categorie)

**Approccio scelto: alternativa 2 — gestione best-effort nel report di errore.**

Le transazioni con `categoria_id` valorizzato che non trovano la corrispondente categoria
su Supabase al momento dell'inserimento generano un errore FK. Questo errore viene
**registrato nel report degli errori** come entità da correggere manualmente (con un messaggio
che indica che la categoria associata non è disponibile su Supabase), ma il processo prosegue
con le entità successive (coerente con Decisione A — best-effort).

**Conseguenza sul flag:** il flag `legacy_domain_migrated` **non viene impostato a `true`**
se ci sono errori nel report, inclusi gli errori di FK su `categoria_id`. Il pannello di
migrazione rimane visibile, mostra il report degli errori, e permette all'utente di ritentare
la migrazione una volta che il Blocco 9 ha completato il seed delle categorie template su
Supabase.

**Motivazione:** scegliere l'alternativa 2 disaccoppia il Fronte A di P34 dall'ordine di
distribuzione del Blocco 9. P34 può essere distribuito prima del Blocco 9; gli utenti che
hanno transazioni con categorie personalizate incomplete su Supabase riceveranno un report
di errore esplicito anziché una migrazione silenziosamente incompleta. Il retry, una volta
completato il Blocco 9, è garantito dall'assenza del flag.

---

## §9 — Implementazione: Fronte A (migrazione one-shot)

**File modificato:** `src/components/DataManagement.tsx`

**Obiettivo:** aggiungere la logica di rilevamento dei dati Spark storici e il pannello di
migrazione one-shot condizionale; implementare il flusso completo di inserimento su Supabase
con remapping FK e report best-effort.

### Step A1 — Lettura del flag `legacy_domain_migrated` al mount

- Aggiungere `import { useUserSettings } from '@/hooks/use-user-settings'` (o il path
  corretto in base a P29).
- Destrutturare le impostazioni utente da `useUserSettings()` per accedere al flag
  `legacy_domain_migrated` all'interno di `preferences`.
- Inizializzare uno stato locale `migrationChecked: boolean` per tracciare il completamento
  del check iniziale (prevenire rendering multipli del pannello durante il check asincrono).

### Step A2 — Logica di rilevamento (condizioni doppie)

Il rilevamento avviene in un `useEffect` al mount del componente (o all'apertura della
schermata), eseguito una sola volta per sessione. La logica è:

1. Se `preferences.legacy_domain_migrated === true` → nessun check ulteriore, pannello
   nascosto. Uscita immediata.
2. Se `window.spark === undefined` → Scenario 3 di §4: impostare il flag, uscita.
3. Altrimenti: tentare `window.spark.kv.keys()` dentro un try/catch.
   - Errore di rete → Scenario 1 di §4: mostrare messaggio informativo, uscita senza flag.
   - Array vuoto → Scenario 2 di §4: impostare il flag, uscita senza pannello.
   - Array con almeno una chiave tra le quattro di dominio → mostrare pannello di migrazione.

### Step A3 — Implementazione dei tre scenari di PA-2

Vedi §4 di questo piano per la specifica dei tre scenari. L'implementazione segue la logica
descritta nel rilevamento di Step A2:

- Scenario 1: catch dell'eccezione di rete, impostazione stato `networkError: true` che
  condiziona la visualizzazione del messaggio informativo nel pannello.
- Scenario 2: `keys` restituisce array senza chiavi di dominio, chiamata diretta a
  `updatePreference('legacy_domain_migrated', true)`.
- Scenario 3: `window.spark === undefined`, stessa chiamata diretta.

### Step A4 — Pannello UI condizionale

Il pannello viene reso se e solo se il check di rilevamento ha confermato la presenza di
chiavi di dominio nel KV Spark. Il pannello contiene:

- Titolo e testo esplicativo: dati storici rilevati, migrazione facoltativa ma consigliata.
- Pulsante primario **«Avvia importazione storica»** — avvia il flusso di migrazione.
- Pulsante secondario **«Salta per ora»** — chiude il pannello per la sessione corrente
  senza impostare il flag (il pannello riappare al prossimo login).
- Annuncio screen reader (`screenReader.announce`) che descrive la disponibilità
  dell'operazione all'apertura del pannello.
- In caso di Scenario 1 (errore di rete): il pannello mostra il messaggio informativo
  «Connessione ai dati storici non riuscita. Riprova più tardi.» al posto dei pulsanti.

### Step A5 — Fase 1: lettura e validazione strutturale dei dati Spark

Al click di «Avvia importazione storica», inizia la Fase 1:

- Leggere le quattro chiavi dal KV Spark: `window.spark.kv.get('accounts')`,
  `window.spark.kv.get('transactions')`, `window.spark.kv.get('budgets')`,
  `window.spark.kv.get('savings-goals')`.
- Deserializzare ciascun valore e verificare che sia un array. Se non è un array o è
  `null/undefined`, trattarlo come array vuoto senza errore.
- Validare strutturalmente ogni elemento: verificare la presenza dei campi obbligatori
  (`id`, e i campi non-nullable noti dal tipo TypeScript). Entità con struttura non valida
  vengono aggiunte all'accumulatore di errori (Step A8) e saltate.
- Filtrare esplicitamente qualsiasi chiave non appartenente alle quattro entità di dominio
  (§12 di questo piano): le chiavi escluse vengono ignorate silenziosamente.

### Step A6 — Costruzione della mappa `sparkId → supabaseId` per i conti

Questo step è il cuore della risoluzione PA-1 (Approccio A — §3):

- Inizializzare `sparkToSupabaseIdMap: Map<string, string>` prima dell'inserimento dei conti.
- Per ogni conto valido letto dal KV Spark:
  - Salvare l'ID originale Spark (`conto.id`).
  - Costruire il payload di creazione escludendo l'`id` originale (il database genera il nuovo UUID).
  - Chiamare `conti.create(payload)`.
  - Se la chiamata ha successo: registrare `sparkToSupabaseIdMap.set(idOriginaleSpark, record.id)`.
  - Se la chiamata fallisce: accumulare l'errore (Step A8), non aggiungere alla mappa.

### Step A7 — Fase 2: inserimento nell'ordine FK corretto con remapping FK

Dopo l'inserimento dei conti (Step A6), si procede nell'ordine:

1. **Budget** — per ogni budget valido:
   - Se `budget.conto_id` è valorizzato, rimapparlo tramite `sparkToSupabaseIdMap.get(budget.conto_id)`.
   - Se l'ID rimappato non è in mappa (conto fallito o non presente), accumulare errore e saltare.
   - Se `budget.conto_id` è `null`/`undefined`, lasciarlo così (FK nullable).
   - Chiamare `budget.create(payload)`.

2. **Obiettivi di risparmio** — per ogni obiettivo valido:
   - Se `obiettivo.conto_associato` è valorizzato, rimapparlo tramite la mappa.
   - Stessa logica di gestione degli errori del budget.
   - Chiamare `obiettivi_risparmio.create(payload)`.

3. **Transazioni** — per ogni transazione valida:
   - `transazione.conto_id` è obbligatorio: rimapparlo tramite la mappa.
   - Se l'ID rimappato non è in mappa (conto fallito), accumulare errore e saltare.
   - Se `transazione.conto_destinazione_id` è valorizzato (trasferimento), rimapparlo.
   - Omettere il campo `cifrato` dal payload (campo derivato, §8 PA-6).
   - Chiamare `transazioni.create(payload)`.
   - Errori FK su `categoria_id` (PA-6, §8): accumulare nel report, non bloccare.

### Step A8 — Accumulatore degli errori best-effort

- Inizializzare un array `migrationErrors: Array<{ entity: string; id: string; message: string }>`.
- Ad ogni fallimento (validazione strutturale, chiamata al repository, FK non rimappabile):
  aggiungere un oggetto all'array con il tipo di entità, l'ID Spark originale (se disponibile)
  e il messaggio di errore.
- L'accumulatore non interrompe mai il ciclo di inserimento (Decisione A — best-effort).
- Al termine, `migrationErrors.length > 0` determina se il flag può essere impostato.

### Step A9 — Indicatore di avanzamento con live region aria-live

Il pannello include un elemento di progresso che descrive la fase corrente:

- Testo leggibile: «Importazione conti: N di M», «Importazione budget: N di M», ecc.
- L'elemento ha `aria-live="polite"` per aggiornamenti intermedi (non interrompono la
  lettura dello screen reader corrente).
- Al completamento finale e in caso di errori bloccanti: `aria-live="assertive"` per
  l'annuncio immediato del risultato.
- Il conteggio viene aggiornato ad ogni entità processata (successo o errore).

### Step A10 — Fase 4: completamento, impostazione del flag, refreshAll, toast

Al termine dell'inserimento di tutte le entità:

- **Nessun errore** (`migrationErrors.length === 0`):
  - Chiamare `impostazioni-utente.updatePreference('legacy_domain_migrated', true)`.
  - Chiamare `refreshAll()` da `useAppData()`.
  - Mostrare `toast.success(...)` con il conteggio delle entità migrate.
  - Nascondere il pannello di migrazione.
  - Annuncio screen reader con `announceSuccess`.
- **Uno o più errori** (`migrationErrors.length > 0`):
  - **Non** impostare il flag.
  - Mostrare il report degli errori nel pannello (entità non migrate, messaggi di errore).
  - Mostrare `toast.error(...)` o `toast.warning(...)` con il conteggio degli errori.
  - Pulsante «Riprova» per rieseguire la migrazione.
  - Annuncio screen reader con `announceError`.

---

## §10 — Implementazione: Fronte B (export/import Supabase)

**File modificato:** `src/components/DataManagement.tsx`

**Obiettivo:** riscrivere `handleExportData` e `handleImportData` eliminando tutti gli accessi
a `window.spark.kv.*` e sostituendo con lettura/scrittura tramite `useAppData()` e repository P26.

### Step B1 — Riscrittura di `handleExportData`: rimozione accessi KV

- Rimuovere `await window.spark.kv.keys()`.
- Rimuovere il ciclo `for (const key of allKeys)` con `window.spark.kv.get(key)`.
- Rimuovere la costruzione di `exportData: Record<string, unknown>`.
- Aggiungere `import { useAppData } from '@/context/AppDataContext'`.
- Destrutturare `{ accounts, transactions, budgets, savingsGoals }` da `useAppData()`.

### Step B2 — Costruzione del payload JSON con campo `meta`

L'oggetto JSON di export ha la struttura:

```
{
  meta: {
    schema_version: "1.0",
    exported_at: <ISO 8601 timestamp>,
    app_version: <stringa dalla versione dell'app — opzionale>
  },
  accounts: [...],
  transactions: [...],
  budgets: [...],
  savingsGoals: [...]
}
```

- `accounts`, `transactions`, `budgets`, `savingsGoals` sono gli array in memoria
  da `useAppData()` — nessuna chiamata diretta ai repository.
- `schema_version`: valore fisso `"1.0"` (prima versione del formato Supabase).
- `exported_at`: `new Date().toISOString()`.
- `app_version`: letta da una costante o da `package.json` se accessibile; altrimenti
  omessa o impostata a stringa vuota.

### Step B3 — Produzione del file e feedback

- Serializzare il payload con `JSON.stringify(payload, null, 2)`.
- Produrre il blob e scaricare il file con il pattern `zecchino-backup-YYYY-MM-DD.json`.
- Mostrare `toast.success(...)` con il nome del file e il conteggio totale delle entità
  (`accounts.length + transactions.length + budgets.length + savingsGoals.length`).
- Annuncio screen reader: nome del file e conteggio sintetico delle entità incluse.
- Chiamare `setShowExportConfirm(false)`.

### Step B4 — Riscrittura di `handleImportData`: rimozione accessi KV

- Rimuovere il ciclo `for (const [key, value] of Object.entries(data))` con
  `window.spark.kv.set(key, value)`.
- Rimuovere `window.location.reload()` e il `setTimeout` che la contiene.
- Aggiungere `import { useAuth } from '@/context/AuthContext'` (o il path corretto da P27),
  e destrutturare `user` per `user.id` necessario ai repository P26.
- Aggiungere import dei repository `conti`, `transazioni`, `budget`, `obiettivi_risparmio`
  da `src/lib/supabase/repositories/`.

### Step B5 — Lettura e validazione del file JSON (struttura base + schema_version)

- Leggere e parsare il file JSON. In caso di errore di parsing: `toast.error(...)`, uscita.
- Verificare la presenza dei campi `meta`, `accounts`, `transactions`, `budgets`,
  `savingsGoals`. Se uno o più mancano: `toast.error(...)` con messaggio esplicito, uscita.
- Leggere `meta.schema_version`. Se il campo non è presente: considerare compatibile
  (retrocompatibilità con file senza versione).
- Estrarre il major dalla versione: caratteri prima del primo `.`.
- Se il major è diverso da `"1"`: bloccare l'import e mostrare il messaggio:
  «Il file di backup non è compatibile con questa versione dell'app (versione file: X,
  versione supportata: 1.x). Esporta un nuovo backup dall'app corrente.»

### Step B6 — Ordine di scrittura FK corretto

Le entità vengono scritte nell'ordine imposto dai vincoli FK (identico al Fronte A — §4
del design):

1. Conti (`accounts`)
2. Budget (`budgets`)
3. Obiettivi di risparmio (`savingsGoals`)
4. Transazioni (`transactions`)

Per il Fronte B, gli ID nel file JSON sono UUID generati da Supabase in precedenti export
— quindi `getById(id)` funziona direttamente senza remapping (a differenza del Fronte A
dove gli ID erano UUID Spark). Non è necessaria la mappa `sparkToSupabaseIdMap`.

### Step B7 — Meccanismo upsert semantico (Decisione B)

Per ogni entità dell'array nel file JSON:

1. Chiamare `repository.getById(entity.id)`.
2. Se restituisce `null` o `undefined` (entità non esistente): chiamare `repository.create(payload)`.
3. Se restituisce un record (entità esistente): chiamare `repository.update(entity.id, payload)`.
4. Tenere un contatore separato per `create` e `update` per il report finale.
5. In caso di errore di `getById`, `create` o `update`: accumulare nel report (best-effort).

Questo meccanismo rende l'import idempotente: importare due volte lo stesso file non crea
duplicati.

### Step B8 — Gestione del campo `cifrato` nelle transazioni

Il campo `cifrato` è un valore derivato calcolato dal trigger database `trg_sync_cifrato`
(P25 §4.4) in base al campo `is_privato` del conto referenziato. Nel payload di
`create()` e `update()` del repository `transazioni`:

- Omettere esplicitamente il campo `cifrato` dal payload prima di passarlo al repository.
- Il valore presente nel file JSON di backup viene scartato senza errore.
- Il database ricalcola il valore corretto autonomamente.

### Step B9 — Accumulatore errori, avanzamento, report finale

- Stessa struttura dell'accumulatore del Fronte A (Step A8): array di oggetti con entità,
  ID e messaggio.
- Stessa live region `aria-live` per l'indicatore di avanzamento (Step A9).
- Report finale: conteggio di entità create, aggiornate e fallite.
- `refreshAll()` viene chiamato al termine **indipendentemente** dalla presenza di errori —
  per rendere visibili le entità effettivamente importate.
- `toast.success(...)` se nessun errore; `toast.warning(...)` o `toast.error(...)` in base
  alla gravità degli errori.

### Step B10 — Sostituzione di `window.location.reload()` con `refreshAll()`

- Rimuovere `setTimeout(() => { window.location.reload() }, 2000)`.
- Sostituire con chiamata a `refreshAll()` da `useAppData()` al termine dell'import.
- `refreshAll()` ricarica tutti i dati da Supabase senza ricaricare la pagina — esperienza
  utente fluida e senza interruzione della sessione.

---

## §11 — Eliminazioni obbligatorie

Lista completa di quanto deve essere rimosso da `DataManagement.tsx` a implementazione
completata. Nessuno di questi pattern deve rimanere nel file al termine di P34:

| Pattern da rimuovere | Contesto | Motivo |
|---|---|---|
| `window.spark.kv.keys()` | `handleExportData` | Sostituito da lettura in-memory da `useAppData()` |
| `window.spark.kv.get(key)` iterato su ogni chiave | `handleExportData` | Sostituito da `{ accounts, transactions, budgets, savingsGoals }` da `useAppData()` |
| `window.spark.kv.set(key, value)` iterato su ogni coppia | `handleImportData` | Sostituito da `repository.create()` e `repository.update()` per le 4 entità |
| `window.location.reload()` | `handleImportData` post-import | Sostituito da `refreshAll()` di AppDataContext |
| `setTimeout(() => { window.location.reload() }, 2000)` | `handleImportData` | Sostituito da `refreshAll()` |
| Export indiscriminato di tutte le chiavi KV | `handleExportData` | Sostituito da export selettivo delle 4 entità di dominio tramite `useAppData()` |

> **Unica eccezione ammessa:** il Fronte A (migrazione one-shot) accede a
> `window.spark.kv.*` **esclusivamente** per la lettura delle 4 chiavi di dominio
> (`accounts`, `transactions`, `budgets`, `savings-goals`) nel flusso di rilevamento
> e nella Fase 1 del processo di migrazione. Questo accesso è temporaneo ed è previsto
> fino al Blocco 10.

---

## §12 — Perimetro e chiavi escluse

Le seguenti chiavi KV Spark sono **fuori perimetro di P34** e devono essere **ignorate
silenziosamente** in tutti i flussi (Fronte A rilevamento, Fronte A Fase 1, Fronte B import):

| Chiave Spark KV | Motivo dell'esclusione | Riferimento |
|---|---|---|
| `categories` | Migrata da P33 Decisione B | [P33](../1%20-%20projects/P33-migrazione-categorymanagement-useappdata.md) |
| `private-pin-hash` | Migrata da P32 verso `impostazioni_utente.pin_privato_hash` | [P32](../1%20-%20projects/P32-migrazione-pin-privato-supabase.md) |
| `global-pin-hash` | Eliminata — autenticazione gestita da Supabase Auth (P27) | [P27](../1%20-%20projects/P27-migrazione-authcontext-supabase.md) |
| `display-*` (14 chiavi) | Migrate da P31 verso `impostazioni_utente.preferences` | [P31](../1%20-%20projects/P31-migrazione-preferenze-display-audio-screenreader.md) |
| `audio-enabled`, `audio-volume` | Migrate da P31 verso `preferences JSONB` | [P31](../1%20-%20projects/P31-migrazione-preferenze-display-audio-screenreader.md) |
| `sr-*` (11 chiavi) | Migrate da P31 verso `preferences JSONB` | [P31](../1%20-%20projects/P31-migrazione-preferenze-display-audio-screenreader.md) |
| `talkback-*` | Migrate da P31 (stessa logica delle chiavi `sr-*`) | [P31](../1%20-%20projects/P31-migrazione-preferenze-display-audio-screenreader.md) |
| `visible-categories` | Migrata da P29 verso `preferences.visible_categories` | [P29](../1%20-%20projects/P29-migrazione-usersettings-preferenze-ui.md) |
| `dismissed-budget-alerts` | Migrata da P29 verso tabella `notifiche` | [P29](../1%20-%20projects/P29-migrazione-usersettings-preferenze-ui.md) |
| `budget-percentages` | Resta `useState` client-side (P30) — nessuna tabella Supabase | [P30](../1%20-%20projects/P30-migrazione-budgetpercentages-usestate.md) |

**Regola generale:** qualsiasi chiave KV non appartenente all'insieme
`{ 'accounts', 'transactions', 'budgets', 'savings-goals' }` viene ignorata silenziosamente
nel Fronte A. Nel Fronte B (import), qualsiasi campo JSON non appartenente a
`{ meta, accounts, transactions, budgets, savingsGoals }` viene ignorato silenziosamente.

---

## §13 — Verifica finale

Checklist di accettazione. Tutti i criteri devono essere soddisfatti prima di considerare
P34 completato:

- [ ] Nessun accesso a `window.spark.kv.*` nel Fronte B (export/import normale):
      né in `handleExportData` né in `handleImportData` post-P34.
- [ ] Il Fronte A accede a `window.spark.kv.*` **solo** per la lettura delle 4 chiavi di
      dominio (`accounts`, `transactions`, `budgets`, `savings-goals`) nel flusso one-shot.
      Nessun altro accesso al KV Spark nel file `DataManagement.tsx`.
- [ ] L'export produce un file JSON valido con i dati in memoria da `useAppData()`,
      struttura `{ meta, accounts, transactions, budgets, savingsGoals }` e
      `meta.schema_version: "1.0"`.
- [ ] L'import scrive nell'ordine FK corretto: conti → budget → obiettivi di risparmio →
      transazioni. Nessun inserimento avviene prima che i conti siano stati processati.
- [ ] Il meccanismo upsert (`getById()` + `create()` o `update()`) non crea duplicati
      su import ripetuto dello stesso file JSON.
- [ ] Il campo `cifrato` non viene incluso nel payload di `create()` o `update()` del
      repository `transazioni` né nel Fronte A né nel Fronte B.
- [ ] Il flag `legacy_domain_migrated` viene impostato a `true` solo al completamento
      senza errori del Fronte A (`migrationErrors.length === 0`). In caso di errori
      parziali, il flag rimane `false`.
- [ ] `refreshAll()` di `useAppData()` sostituisce `window.location.reload()` in entrambi
      i flussi (Fronte A Step A10 e Fronte B Step B10).
- [ ] Il pannello di migrazione one-shot non è visibile agli utenti con flag
      `legacy_domain_migrated = true` già impostato.
- [ ] Nessuna chiave esclusa (§12) viene letta o scritta da questo componente nei flussi
      Fronte B. Nel Fronte A, le chiavi escluse vengono ignorate silenziosamente.
- [ ] `npm run build` exit 0.
- [ ] `npm run test:run` → tutti i test passed.
- [ ] `npm run lint` → 0 errori (5 warning pre-esistenti ammessi).
