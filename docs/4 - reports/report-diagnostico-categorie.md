# Report diagnostico — Mancato caricamento categorie nel form Nuovo Movimento

**Data:** 6 maggio 2026  
**Branch:** `refactoring-architettura`  
**Autore:** Agent-Analyze  
**Stato:** Sola lettura — nessuna modifica al codice

---

## 1. Mappa del flusso dati (passo per passo)

Il percorso completo dalla query Supabase al menu a tendina si articola in sette passi distinti.

### Passo 1 — `categorie.ts` `getAll()`

**File:** [src/lib/supabase/repositories/categorie.ts](../../src/lib/supabase/repositories/categorie.ts)

```ts
export async function getAll(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categorie')
    .select('*')
  if (error) throw new RepositoryError(error)
  return (data as DbCategory[]).map(toClient)
}
```

La query non applica nessun filtro esplicito lato client. Il commento nel file recita:

> *"La policy RLS deve consentire SELECT su `user_id IS NULL OR auth.uid() = user_id`."*

Il commento documenta un requisito che dipende interamente dalla configurazione del database.
La funzione **non verifica** se la risposta è un array vuoto: restituisce `[]` senza lanciare
eccezioni se Supabase risponde con zero righe.

---

### Passo 2 — `AppDataContext.tsx` — bootstrap al login

**File:** [src/context/AppDataContext.tsx](../../src/context/AppDataContext.tsx)

```ts
async function loadDomainSnapshot(): Promise<DomainSnapshot> {
  const [accounts, transactions, categories, budgets, savingsGoals] = await Promise.all([
    getAllConti(),
    getAllTransazioni(),
    getAllCategorie(),   // ← chiamata a getAll()
    getAllBudget(),
    getAllObiettivi(),
  ])
  return { accounts, transactions, categories, budgets, savingsGoals }
}
```

`loadDomainSnapshot` è chiamata all'interno di un `useEffect` vincolato a
`[isAuthenticated, user?.id]`. Il caricamento parte non appena `AuthContext`
imposta `isAuthenticated = true` **e** `user.id` è disponibile.

**Condizione di guardia:**

```ts
if (!isAuthenticated || !user?.id) {
  setCategories([])
  // ... reset degli altri array ...
  setIsDataReady(false)
  return
}
```

Nessun altro gate (es. `needsOnboarding`) blocca il caricamento: le categorie vengono
caricate immediatamente dopo il login, indipendentemente dall'avanzamento dell'onboarding.

---

### Passo 3 — Gestione del risultato di `loadDomainSnapshot`

Questo è il punto dove si manifesta il **fallimento silenzioso**.

```ts
try {
  const snapshot = await loadDomainSnapshot()
  if (cancelled) return
  applyDomainSnapshot(snapshot)
  setError(null)
  setIsLoading(false)
  setIsDataReady(true)
} catch {
  if (cancelled) return
  hydrateFromCache(user.id)
}
```

Se `getAllCategorie()` restituisce un array vuoto `[]` **senza errore** (che è il comportamento
normale di Supabase quando RLS filtra tutte le righe), il blocco `try` viene completato con
successo. Non viene lanciata nessuna eccezione. `setIsDataReady(true)` viene chiamata con
`categories = []`. L'utente non riceve nessun feedback visivo.

`applyDomainSnapshot` si limita a distribuire i valori del snapshot negli stati:

```ts
const applyDomainSnapshot = useCallback((snapshot: DomainSnapshot) => {
  setCategories(snapshot.categories)   // → imposta [] senza warning
  // ...
}, [])
```

---

### Passo 4 — `safeCategories` in `AppDataContext`

```ts
const safeCategories = useMemo(() => categories, [categories])
```

`safeCategories` è un alias trasparente di `categories`. Non applica nessun filtro,
nessun fallback, nessun default. Se `categories = []`, allora `safeCategories = []`.

---

### Passo 5 — `DialogsOverlay.tsx` → `TransactionDialog`

**File:** [src/components/DialogsOverlay.tsx](../../src/components/DialogsOverlay.tsx)

```tsx
const { safeCategories, ... } = useAppData()

<TransactionDialog
  ...
  categories={safeCategories}   // → propaga l'array vuoto
/>
```

`safeCategories` viene passata come prop `categories` a `TransactionDialog`.
Non esiste nessuna guardia che blocchi l'apertura del dialog quando le categorie sono vuote.

---

### Passo 6 — `TransactionDialog.tsx` — filtraggio per tipo

**File:** [src/components/TransactionDialog.tsx](../../src/components/TransactionDialog.tsx)

```ts
const filteredCategories = categories.filter(c =>
  tipo === 'trasferimento' ? false : c.tipo === tipo
)
```

Se `categories = []`, allora `filteredCategories = []` per qualsiasi valore di `tipo`.

Un `useEffect` tenta di selezionare automaticamente la prima categoria valida:

```ts
useEffect(() => {
  if (!categoriaId || !categories.find(c => c.id === categoriaId)) {
    const validCategories = categories.filter(c =>
      tipo === 'trasferimento' ? false : c.tipo === tipo
    )
    if (validCategories.length > 0) {
      setCategoriaId(validCategories[0].id)
    }
  }
}, [tipo, categoriaId, categories])
```

Con `validCategories = []`, la condizione `validCategories.length > 0` è falsa:
`setCategoriaId` non viene mai chiamata e `categoriaId` rimane stringa vuota.

---

### Passo 7 — Rendering del `Select` categorie

```tsx
<SelectContent>
  {filteredCategories.map(category => (
    <SelectItem key={category.id} value={category.id}>
      {category.nome}
    </SelectItem>
  ))}
</SelectContent>
```

Con `filteredCategories = []`, il ciclo `map` produce zero `SelectItem`.
Il menu a tendina è vuoto. Il placeholder "Seleziona una categoria" rimane visibile
ma nessuna opzione è selezionabile.

---

## 2. Punto di interruzione del flusso

**Il flusso si interrompe al Passo 1**, nella risposta di Supabase a `getAll()`.

Supabase risponde con `{ data: [], error: null }`. Questa risposta è tecnicamente corretta
dal punto di vista del protocollo (nessun errore di rete, nessuna violazione RLS che produca
un codice di errore), ma semanticamente errata: l'utente dovrebbe vedere le categorie.

Il flusso non "si rompe" in senso tecnico: ogni componente riceve esattamente il dato
che gli viene passato. Il problema è che il dato è vuoto e nessun punto del flusso
è equipaggiato per segnalare questa condizione come anomala.

---

## 3. Causa radice

Sono stati identificati due problemi distinti, entrambi necessari alla comprensione completa.

### 3.1 Causa radice primaria — Politica RLS incompleta su `categorie`

P24 §4.1 specifica la regola generica per tutte le tabelle Supabase:

> *"Row Level Security attiva su tutte le 11 tabelle con policy `auth.uid() = user_id`."*

Se questa policy è applicata alla tabella `categorie` senza eccezioni, allora:

| Tipo di riga | `user_id` | Condizione `auth.uid() = user_id` | Visibile? |
|---|---|---|---|
| Categoria dell'utente | `<UUID utente>` | `TRUE` | **Sì** |
| Categoria template (predefinita) | `NULL` | `NULL` (non TRUE) | **No** |

In PostgreSQL, il confronto `auth.uid() = NULL` produce `NULL`, non `TRUE`.
Tutte le righe con `user_id IS NULL` sono quindi invisibili alla query `SELECT *`
lanciata dal repository, nonostante siano fisicamente presenti nel database.

Questo spiega perché l'utente può verificare manualmente le categorie dalla dashboard
Supabase (che non applica RLS) ma non le vede nell'app.

La policy corretta per `categorie` deve essere:

```sql
(auth.uid() = user_id) OR (user_id IS NULL)
```

Il commento nel codice (`// La policy RLS deve consentire SELECT su user_id IS NULL OR auth.uid() = user_id`)
documenta questo requisito, ma non esiste nessun file SQL nei documenti di progetto
(`docs/5 - sql/`) che crei questa policy. La lacuna non è nel codice applicativo,
è nella configurazione del database.

### 3.2 Causa radice secondaria — Contraddizione tra schema e design

La documentazione dello schema (`docs/schema database supabase.md`) marca `user_id`
come campo obbligatorio (NOT NULL) nella tabella `categorie`:

> `user_id | UUID | ✅ | — | Riferimento a auth.users`

Ma P26 §3, P33 e il file SQL `docs/5 - sql/P35-seed-default-categories.sql` descrivono
(e implementano) categorie template con `user_id = NULL`:

```sql
INSERT INTO categorie (nome, tipo, predefinita, user_id, icona, colore)
VALUES (cat.nome, cat.tipo, TRUE, NULL, NULL, NULL);
```

Questa contraddizione produce due scenari alternativi, entrambi problematici:

**Scenario A — `user_id` è effettivamente NOT NULL nel DB reale:**
`seed_default_categories()` lancia un errore di constraint violation. `OnboardingFlow.tsx`
lo intercetta nel `catch`, mostra un messaggio di errore e blocca l'avanzamento al passo 5
(il pulsante "Avanti" rimane disabilitato finché `seedStatus !== 'done'`). L'utente deve
cliccare "Riprova". Se il retry fallisce ancora, l'onboarding è bloccato. Se l'utente
ha aggirato il blocco (es. ricarica della pagina con `nomeVisualizzato` già salvato),
arriva alla dashboard senza categorie.

**Scenario B — `user_id` è nullable nel DB reale (schema documentato errato):**
`seed_default_categories()` ha successo, le righe template esistono nel DB con `user_id = NULL`.
Ma la policy RLS (causa primaria) le rende invisibili all'app. L'onboarding sembra completarsi
correttamente ma le categorie non appaiono nel dropdown.

---

## 4. Gestione silenziosa degli errori

L'intera catena non produce nessun segnale diagnostico visibile all'utente.

### 4.1 Nel repository — risposta vuota non è un errore

```ts
export async function getAll(): Promise<Category[]> {
  const { data, error } = await supabase.from('categorie').select('*')
  if (error) throw new RepositoryError(error)  // ← solo errori Supabase espliciti
  return (data as DbCategory[]).map(toClient)   // ← [] è un risultato valido
}
```

Un array vuoto è tecnicamente un successo. Il repository non distingue tra
"nessuna categoria esiste" e "le categorie esistono ma RLS le ha filtrate".

### 4.2 In `AppDataContext` — catch silenzioso

Nel bootstrap `useEffect`:

```ts
} catch {
  if (cancelled) return
  hydrateFromCache(user.id)
}
```

Il blocco `catch` non ha parametro di errore (`catch` senza argomento). Qualsiasi eccezione
che emerge da `loadDomainSnapshot()` viene swallowed, poi si tenta il fallback dalla cache.
Se la cache è assente (primo login), il codice imposta `setError(OFFLINE_FIRST_ACCESS_MESSAGE)`
e `setIsDataReady(false)` — ma questo messaggio è generico e fuorviante (non c'è problema
di rete), e non compare se `getAll()` restituisce `[]` senza eccezione.

### 4.3 In `TransactionDialog` — nessuna guardia su array vuoto

Il dialog si apre, mostra il campo categoria con il placeholder "Seleziona una categoria"
e un menu a tendina vuoto. Non viene mostrato nessun messaggio di errore, nessun avviso,
nessuna indicazione che le categorie non siano disponibili. L'utente non ha modo di
capire se il problema è temporaneo (rete) o strutturale (mancata configurazione).

---

## 5. Divergenze rispetto alla documentazione P24–P37

### Divergenza 1 — Policy RLS su `categorie` non documentata come eccezione

**Documento:** P24 §4.1  
**Testo:** "Row Level Security attiva su tutte le 11 tabelle con policy `auth.uid() = user_id`."

P24 stabilisce una regola uniforme per tutte le tabelle. P26 §3 introduce il concetto
di righe template con `user_id = NULL` per `categorie`, ma non contiene una sezione
esplicita che dichiari "la policy RLS di `categorie` devia dalla regola generale di P24".
Il commento in `categorie.ts` riporta il requisito corretto ma nessun documento di progetto
tra P24 e P36 include il DDL SQL necessario per implementarlo.

**Risultato:** la speciale policy RLS per `categorie` non è mai stata creata nel database.

### Divergenza 2 — Schema `categorie.user_id` vs. design delle categorie template

**Documento:** `docs/schema database supabase.md` — `user_id` marcato come NOT NULL  
**Contraddizione:** P26 §3, P33 §2, P35 §2 e `P35-seed-default-categories.sql` — tutte
queste fonti descrivono e implementano categorie con `user_id = NULL`.

Il documento di schema non è stato aggiornato per riflettere la decisione architetturale
(introdotta in P26) che le categorie template abbiano `user_id IS NULL`.

### Divergenza 3 — File SQL per la policy RLS di `categorie` mai prodotto

Nei documenti di progetto esistono:
- `docs/5 - sql/P25-schema-impostazioni-utente.sql` — schema e RLS per `impostazioni_utente`
- `docs/5 - sql/P25-trigger-cifrato.sql`
- `docs/5 - sql/P35-seed-default-categories.sql` — seed delle categorie template

Non esiste nessun file SQL con la policy RLS dedicata alla tabella `categorie`, nonostante
P26 §3 descriva esplicitamente il comportamento atteso da quella policy.

---

## 6. Soluzioni possibili

Le soluzioni sono elencate dalla più mirata alla più strutturale.
Nessuna modifica viene applicata qui: il report è di sola lettura.

---

### Soluzione A — Aggiungere la policy RLS corretta su `categorie` (priorità alta)

**Tipo:** Correzione database (DDL SQL).  
**Perimetro:** Solo la tabella `categorie` su Supabase. Nessuna modifica al codice.

```sql
-- Da eseguire dalla Supabase Dashboard o via migration
DROP POLICY IF EXISTS "utente_select_proprie_categorie" ON categorie;

CREATE POLICY "utente_select_proprie_categorie"
  ON categorie
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id IS NULL   -- ← consente le righe template
  );
```

Le policy di INSERT/UPDATE/DELETE rimangono con `auth.uid() = user_id` (i template
sono read-only per design: la RLS blocca le scritture su `user_id IS NULL`).

**Pro:**
- Risolve direttamente la causa radice primaria.
- Zero modifiche al codice applicativo.
- Idempotente e sicuro da rieseguire.
- Coerente con l'intenzione di P26 §3 e con il commento in `categorie.ts`.

**Contro:**
- Non risolve la causa secondaria (contraddizione schema su `user_id NOT NULL`).
- Se il DB ha il vincolo NOT NULL su `user_id`, le categorie template non esistono ancora
  e questa policy, da sola, non è sufficiente: servirà prima la Soluzione B.

---

### Soluzione B — Rendere `user_id` nullable in `categorie` e/o ri-eseguire il seed (se necessario)

**Tipo:** Correzione database (DDL + riesecuzione RPC).  
**Perimetro:** Schema tabella `categorie` + riesecuzione di `seed_default_categories()`.

Se `user_id` ha un vincolo NOT NULL nel DB reale, è necessario rimuoverlo prima che
le categorie template possano essere inserite:

```sql
-- Verifica la presenza del vincolo NOT NULL reale
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'categorie' AND column_name = 'user_id';

-- Se is_nullable = 'NO', rimuovere il vincolo
ALTER TABLE categorie ALTER COLUMN user_id DROP NOT NULL;
```

Dopo aver rimosso il vincolo, rieseguire `seed_default_categories()` dal client autenticato
(o dalla Supabase Dashboard come utente autenticato con GRANT EXECUTE già applicato).

**Pro:**
- Risolve la causa secondaria (contraddizione schema).
- Allinea il DB reale alla decisione architetturale di P26/P33.
- Sblocca anche la possibilità di ripristino per utenti che hanno completato l'onboarding
  con seed fallito.

**Contro:**
- Richiede una modifica allo schema del DB in produzione.
- Non sufficiente da sola: serve anche la Soluzione A per rendere le righe visibili via RLS.

---

### Soluzione C — Architettura alternativa: categorie per-utente invece di template globali

**Tipo:** Modifica architetturale. Devia significativamente da P26.  
**Perimetro:** `seed_default_categories()` + schema `categorie` + policy RLS.

Invece di inserire categorie template con `user_id = NULL`, `seed_default_categories()`
inserisce 18 righe con `user_id = auth.uid()` e `predefinita = TRUE`. Ogni utente ha
la propria copia delle categorie di default, con `user_id` valorizzato. La policy RLS
rimane `auth.uid() = user_id` (invariata, come da P24 §4.1). Il vincolo NOT NULL
su `user_id` rimane valido.

**Pro:**
- Non richiede nessuna policy RLS speciale.
- Lo schema `user_id NOT NULL` rimane coerente.
- RLS standard funziona senza eccezioni.
- Più semplice da mantenere (nessuna riga "globale" con semantica speciale).

**Contro:**
- Devia dall'architettura decisa in P26 §3 e P33 §2 (che distinguono esplicitamente
  righe template da righe utente come caratteristica di design, non solo tecnica).
- La distinzione tra "predefinita condivisa" e "personalizzata dell'utente" diventa
  meno chiara: tutte le righe hanno `user_id` valorizzato.
- Richiede aggiornamento di `seed_default_categories()` (SQL) e revisione di P26/P33.
- Se in futuro si vuole aggiungere o modificare una categoria template per tutti gli utenti,
  occorre una migration che aggiorna tutte le righe `predefinita = TRUE` di ogni utente.

---

### Soluzione D — Aggiungere guardia visiva nel dialog per categorie vuote

**Tipo:** Mitigazione UX. Non risolve la causa radice.  
**Perimetro:** `TransactionDialog.tsx` — aggiunta di uno stato di errore visibile.

Se `filteredCategories.length === 0` e `tipo !== 'trasferimento'`, mostrare un avviso
inline nel campo categoria: *"Nessuna categoria disponibile. Verifica la connessione o
contatta il supporto."* Disabilitare il pulsante "Salva" in questa condizione.

**Pro:**
- Rende il problema visibile all'utente e diagnosticabile immediatamente.
- Non richiede modifiche al DB.
- Implementabile in pochi minuti come patch di emergenza mentre si lavora sulla causa radice.

**Contro:**
- Non risolve il problema: le categorie rimangono assenti, l'utente non può registrare movimenti.
- Dipende da un fix della causa radice per essere effettivamente utile.

---

## 7. Ordine di intervento consigliato

Per risolvere il problema nella sessione di test attuale, l'ordine minimo è:

1. **Verificare** se `user_id` è effettivamente NOT NULL nel DB reale
   (`SELECT is_nullable FROM information_schema.columns WHERE table_name = 'categorie' AND column_name = 'user_id'`).
2. **Se NOT NULL**: eseguire `ALTER TABLE categorie ALTER COLUMN user_id DROP NOT NULL` (Soluzione B).
3. **Verificare** se le categorie template esistono già
   (`SELECT COUNT(*) FROM categorie WHERE user_id IS NULL`).
4. **Se assenti**: rieseguire `seed_default_categories()` come utente autenticato.
5. **In ogni caso**: applicare la policy RLS corretta (Soluzione A) — questa è obbligatoria
   indipendentemente dagli altri passi.
6. **Opzionalmente**: applicare la Soluzione D come guardia di emergenza nel dialog,
   da mantenere fino a quando il flusso è completamente validato.

---

*Fine report — nessuna modifica al codice applicata.*
