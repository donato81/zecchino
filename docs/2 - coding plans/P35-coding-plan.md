# P35 — Coding Plan: Onboarding primo accesso Supabase

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P35 — Blocco 9 — Onboarding primo accesso Supabase
> Design di riferimento: `docs/1 - projects/P35-onboarding-primo-accesso-supabase.md`
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-03

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P35 — Onboarding primo accesso Supabase |
| **Tipo intervento** | Implementazione |
| **Branch** | `refactoring-architettura` |
| **Data** | 2026-05-03 |
| **File creati** | `src/components/OnboardingFlow.tsx` (implementazione completa) · `docs/5 - sql/P35-seed-default-categories.sql` |
| **File modificati** | `src/lib/supabase/types.ts` · `src/context/AuthContext.tsx` · `src/lib/supabase/repositories/categorie.ts` · `src/test/smoke/test-utils.ts` |
| **File invariati** | `src/App.tsx` (gate e import già presenti post-P27) |
| **Documenti di riferimento** | [P35 design](../1%20-%20projects/P35-onboarding-primo-accesso-supabase.md) · [P24](../1%20-%20projects/P24-architettura-migrazione-supabase.md) · [P26](../1%20-%20projects/P26-strato-accesso-dati-supabase.md) · [P27](../1%20-%20projects/P27-migrazione-authcontext-supabase.md) · [P28](../1%20-%20projects/P28-migrazione-appdatacontext-supabase.md) · [P33](../1%20-%20projects/P33-migrazione-categorymanagement-useappdata.md) · [P34](../1%20-%20projects/P34-migrazione-datamanagement-supabase.md) |

---

## §2 — Prerequisiti e stato attuale

### `src/App.tsx`

**Stato attuale (post-P27, pre-P35):** il gate `if (needsOnboarding) return <OnboardingFlow />` è già presente nella sequenza dei gate condizionali di `AppContent`, nella posizione corretta tra `!isAuthenticated` e `!isDataReady`. L'import `OnboardingFlow` da `@/components/OnboardingFlow` è già dichiarato. La sequenza completa dei gate corrisponde alla specifica di P35 §3.2 e §7.

**Cosa non cambia:** nessuna modifica a `App.tsx`. Il file è già allineato con la specifica di P35. Il piano non tocca questo file.

### `src/components/OnboardingFlow.tsx`

**Stato attuale:** file placeholder — la funzione esportata `OnboardingFlow` restituisce `null` senza alcuna logica. Creato durante P27 come stub per consentire la compilazione del gate in `App.tsx`.

**Stato dopo P35:** componente React completo con 6 passi (P35 §6), indicatore di avanzamento, navigazione avanti/indietro, logica di riprendibilità (PA-5), gestione errori inline e accessibilità da screen reader.

### `src/context/AuthContext.tsx`

**Stato attuale (post-P32):** la superficie pubblica esposta dall'interfaccia `AuthContextValue` include `needsOnboarding: boolean` ma non `completeOnboarding`. Il valore `needsOnboarding` è gestito da `useState` interno; `setNeedsOnboarding` non è nella superficie pubblica. Non esiste nessun meccanismo esterno per impostarlo a `false` una volta che l'onboarding è avviato.

**Stato dopo P35:** `AuthContextValue` espone `completeOnboarding: () => void`. La funzione viene implementata nel provider come setter locale di `needsOnboarding = false` senza effetti collaterali su Supabase (P35 §3.3, PA-6 §10).

### `src/lib/supabase/types.ts`

**Stato attuale:** `UserPreferences` ha esattamente 28 chiavi (P25 §3.1 Opzione 2). La chiave `onboarding_completed` non è presente. `updatePreference` è tipizzato con `chiave: keyof UserPreferences`: finché `onboarding_completed` non è nel tipo, il compilatore TypeScript rifiuta la chiamata `updatePreference('onboarding_completed', true)` da `OnboardingFlow` al passo 6.

**Stato dopo P35:** `UserPreferences` espone `onboarding_completed?: boolean` come 29ª chiave opzionale. La firma di `updatePreference` continua a funzionare senza modifiche al repository `impostazioni-utente.ts` (P35 §10 PA-4).

### `src/lib/supabase/repositories/categorie.ts`

**Stato attuale:** il repository espone `getAll()`, `create()`, `update()`, `remove()`. La funzione `create()` chiama sempre `getUid()` e inserisce la riga con `user_id: uid` — non è usabile per inserire categorie template con `user_id: null`. Non esiste nessuna funzione per il seed delle categorie template.

**Stato dopo P35:** il repository espone la nuova funzione `seedDefaultCategories()` che chiama la RPC Supabase `seed_default_categories()` (definita nel file SQL del passo C). La RPC è idempotente e opera con privilegi elevati (`SECURITY DEFINER`) per poter inserire righe con `user_id: null` al di là del vincolo RLS standard.

### `src/test/smoke/test-utils.ts`

**Stato attuale (post-P32):** `MockAuthState` include `isPrivateEnabled`, `unlockPrivate`, `lockPrivate`, `setPin`, `changePin`, `removePin`. Non include `completeOnboarding`. I test smoke esistenti non attivano il gate `needsOnboarding` (il mock imposta `needsOnboarding: false` per default).

**Stato dopo P35:** `MockAuthState` include `completeOnboarding` come no-op, per coerenza con il tipo `AuthContextValue`. Il valore di `needsOnboarding` nel mock rimane `false`: i 5 test smoke esistenti non attivano il flusso di onboarding e continuano a passare senza modifiche alla logica.

---

## §3 — Risoluzione PA-1: lista categorie template

**Decisione**: la lista esatta delle categorie template è quella già definita in `src/lib/constants.ts` nella costante `DEFAULT_CATEGORIES`. Questa costante è già presente nel codebase (mai utilizzata dalla migrazione P33 e identificata in P28 §12 come destinata al Blocco 9) e contiene 18 categorie con `predefinita: true`:

**Categorie entrata (6):** Stipendio, Freelance, Rimborso, Regalo, Rendita, Altro (entrata).

**Categorie uscita (12):** Spesa alimentare, Ristorante/Bar, Bollette, Affitto/Mutuo, Trasporti, Salute/Farmacia, Abbigliamento, Svago/Intrattenimento, Abbonamenti, Istruzione, Animali, Altro (uscita).

I campi `icona` e `colore` sono opzionali nello schema `categorie` (P35 §10 PA-1 · Schema §2) e non sono valorizzati in `DEFAULT_CATEGORIES`: il seed li inserisce come `null`, coerentemente con il comportamento attuale.

`DEFAULT_CATEGORIES` è importato da `@/lib/constants` nella funzione `seedDefaultCategories()` (passo D) come unica fonte di verità per i nomi e i tipi. Nessuna lista aggiuntiva viene definita.

---

## §4 — Risoluzione PA-2: comportamento passo 4 e idempotenza seed

**Errore di rete o Supabase al passo 4:** il passo 4 è **sempre bloccante**. Non esiste modalità degradata: le categorie template sono una precondizione strutturale per `CategoryManagement.tsx` (P33 §4) e per P34 Fronte A (P35 §5 Decisione A). Se la chiamata a `seedDefaultCategories()` fallisce, il componente mostra un messaggio di errore inline («Impossibile preparare le categorie, controlla la connessione.») con pulsante «Riprova». Il flusso non avanza al passo 5 finché il seed non ha avuto esito positivo.

**Idempotenza del seed:** la funzione RPC Supabase `seed_default_categories()` (passo C) utilizza come meccanismo di idempotenza un controllo preliminare server-side: prima di ogni INSERT controlla se una riga con lo stesso `nome`, `tipo` e `predefinita = true` già esiste con `user_id IS NULL`. In caso affermativo, salta l'inserimento. Questo pattern equivale a un `INSERT ... ON CONFLICT DO NOTHING` senza richiedere un vincolo `UNIQUE` dichiarato su `(nome, tipo)`. Ogni retry del passo 4 produce un'operazione idempotente: il risultato finale è identico indipendentemente da quante volte viene chiamata.

**Precondizione RLS:** la funzione RPC è definita con `SECURITY DEFINER` e viene eseguita con i permessi del proprietario della funzione (non dell'utente autenticato). Questo consente l'INSERT con `user_id: null` senza richiedere modifiche alle policy RLS esistenti della tabella `categorie`. La RLS di SELECT già consente ai client autenticati di leggere le righe con `user_id IS NULL` — questa policy rimane invariata.

---

## §5 — Risoluzione PA-3: lista valute supportate al passo 3

**Decisione:** la funzione `formatCurrency(amount, currency)` in `src/lib/helpers.ts` si basa su `Intl.NumberFormat` e non definisce nessuna lista di valute esplicita: accetta qualsiasi codice ISO 4217 valido. Il codebase usa esclusivamente `'EUR'` come valore costante hardcoded. L'unico vincolo applicabile è che le valute mostrate al passo 3 siano rappresentabili correttamente da `Intl.NumberFormat('it-IT', { style: 'currency', currency: codice })`.

La lista da mostrare nel menu di selezione del passo 3 è la seguente — scelta per copertura pragmatica degli utenti italiani e coerenza con l'unica valuta già in uso:

| Codice | Nome visualizzato |
|---|---|
| EUR | Euro |
| USD | Dollaro USA |
| GBP | Sterlina britannica |
| CHF | Franco svizzero |
| JPY | Yen giapponese |
| CAD | Dollaro canadese |
| AUD | Dollaro australiano |

Il valore pre-selezionato è `'EUR'` (default da P25 §3.4 e `impostazioni_utente.valuta_default`). Nessun'altra valuta viene aggiunta. La lista è una costante locale di `OnboardingFlow.tsx`, non un'esportazione condivisa.

---

## §6 — Risoluzione PA-4: flag `onboarding_completed` in `UserPreferences`

**Decisione:** il tipo `UserPreferences` in `src/lib/supabase/types.ts` non include `onboarding_completed`. La chiave è assente dal JSON di default P25 §3.4 (28 chiavi). P35 la aggiunge come 29ª chiave opzionale `onboarding_completed?: boolean`. La scelta di renderla opzionale (`?`) è coerente con la convenzione già in uso per le chiavi introdotte successivamente al JSON iniziale: la sua assenza nel record esistente equivale a `false` (onboarding non completato).

Nessuna `ALTER TABLE` è necessaria: JSONB di PostgreSQL accetta chiavi aggiuntive non presenti nel default. La funzione `updatePreference` esistente supporta pienamente l'aggiunta tramite merge JSONB chirurgico (commento in `impostazioni-utente.ts`). Il commento «Esattamente 28 chiavi» al di sopra dell'interfaccia va aggiornato a «29 chiavi» per mantenere coerenza documentale con P25 §3.1.

---

## §7 — Risoluzione PA-5: riprendibilità del flusso

**Decisione del proprietario (vincolante):** se l'utente chiude l'app durante l'onboarding e al login successivo `needsOnboarding = true`, il flusso riappare al passo 1 ma i campi dei passi già completati vengono pre-compilati con i valori già presenti su Supabase.

**Implementazione pratica:**
- Al mount di `OnboardingFlow`, vengono letti i valori dal record `impostazioni_utente` già disponibile tramite `useAuth().userSettings` (già caricato da `AuthContext` al bootstrap). Nessuna chiamata aggiuntiva ai repository.
- **Passo 2 (nome):** se `userSettings.nomeVisualizzato` è valorizzato (non `null`), il campo di testo viene pre-compilato con quel valore. L'utente può confermarlo o modificarlo.
- **Passo 3 (valuta):** se `userSettings.valutaDefault` è valorizzato, il menu viene pre-selezionato con quella valuta. Il default è `'EUR'` — presente sempre.
- **Passo 5 (conto):** se `AppDataContext.accounts` contiene almeno un conto al momento del mount (già caricato durante la sessione), il componente mostra un messaggio «Hai già un conto configurato» con opzione di saltare il passo o di aggiungerne un secondo. Il form non viene nascosto: l'utente può scegliere se aggiungere un altro conto o saltare.
- **Passo 4 (seed):** la funzione `seedDefaultCategories()` è idempotente (PA-2). Il passo viene rieseguito anche se il seed era già avvenuto. L'esito atteso è «Categorie pronte» senza errori.

---

## §8 — Risoluzione PA-6: funzione `completeOnboarding()`

**Decisione:** `completeOnboarding` è implementata nel provider `AuthContext` come funzione stabile (`useCallback`) che chiama `setNeedsOnboarding(false)`. Non effettua nessuna scrittura su Supabase: la scrittura di `preferences.onboarding_completed = true` è già stata eseguita da `OnboardingFlow` al passo 6 tramite `updatePreference`. `completeOnboarding` è idempotente: chiamarla più volte non ha effetti aggiuntivi (il setter React non provoca re-render se il valore è già `false`).

Il tipo `AuthContextValue` viene aggiornato con `completeOnboarding: () => void`. Nessun componente esistente dipende dall'immutabilità di `needsOnboarding` post-bootstrap: il valore è usato solo nel gate di `App.tsx` che smonta `OnboardingFlow` una volta completato il flusso.

---

## §9 — Schema riepilogativo delle operazioni

```
P35 — Onboarding primo accesso Supabase
│
├── Prerequisiti
│   ├── BL1: npm run build exit 0 (baseline)
│   ├── BL2: npm run test:run → 5/5 passed (baseline)
│   ├── BL3: tsc --noEmit → 0 errori (baseline)
│   ├── BL4: Verifica stato App.tsx (gate e import già presenti)
│   └── BL5: Verifica che UserPreferences non abbia ancora onboarding_completed
│
├── Passo A — types.ts: aggiunta onboarding_completed
│   ├── A1: aggiungere onboarding_completed?: boolean a UserPreferences
│   ├── A2: aggiornare il commento "28 chiavi" → "29 chiavi"
│   └── Gate A: tsc --noEmit 0 errori; build exit 0
│
├── Passo B — AuthContext.tsx: aggiunta completeOnboarding()
│   ├── B1: aggiungere completeOnboarding: () => void a AuthContextValue
│   ├── B2: implementare completeOnboarding nel provider come useCallback
│   ├── B3: aggiungere completeOnboarding al valore del context
│   └── Gate B: build exit 0; grep completeOnboarding in AuthContext.tsx presente
│
├── Passo C — SQL: RPC seed_default_categories
│   ├── C1: creare docs/5 - sql/P35-seed-default-categories.sql
│   │   (funzione SECURITY DEFINER; iterazione su 18 categorie DEFAULT_CATEGORIES;
│   │    controllo esistenza per nome+tipo+predefinita; INSERT con user_id: null)
│   ├── C2: applicare la SQL a Supabase tramite dashboard o CLI
│   └── Gate C: verifica in Supabase dashboard che la funzione esista
│
├── Passo D — categorie.ts: aggiunta seedDefaultCategories()
│   ├── D1: aggiungere la funzione seedDefaultCategories() al repository
│   │   (chiama supabase.rpc('seed_default_categories'); nessun parametro
│   │    perché la funzione legge auth.uid() internamente)
│   ├── D2: esportare la funzione
│   └── Gate D: build exit 0; tsc --noEmit 0 errori;
│       grep seedDefaultCategories in categorie.ts → presente
│
├── Passo E — test-utils.ts: aggiunta completeOnboarding al mock
│   ├── E1: aggiungere completeOnboarding come no-op a MockAuthState
│   └── Gate E: tsc --noEmit 0 errori; npm run test:run → 5/5 passed
│
└── Passo F — OnboardingFlow.tsx: implementazione completa
    ├── F1: struttura base — stato passo corrente, indicatore avanzamento,
    │       pulsanti Avanti/Indietro, aria-live="polite"
    ├── F2: Passo 1 — schermata benvenuto, pulsante Inizia, nessuna scrittura
    ├── F3: Passo 2 — campo nome, pre-compilazione da userSettings.nomeVisualizzato,
    │       chiamata updateField('nomeVisualizzato'), errore inline, retry
    ├── F4: Passo 3 — menu valuta, pre-selezione da userSettings.valutaDefault,
    │       lista 7 valute PA-3, chiamata updateField('valutaDefault'), errore inline
    ├── F5: Passo 4 — auto-seed all'ingresso, seedDefaultCategories(),
    │       spinner durante operazione, conferma + Avanti / errore + Riprova
    ├── F6: Passo 5 — form conto (nome, tipo, saldo iniziale), conti.create(),
    │       rilevamento conto esistente da AppDataContext.accounts (PA-5),
    │       pulsante Salta per ora
    ├── F7: Passo 6 — updatePreference('onboarding_completed', true),
    │       disabilita pulsante durante scrittura, poi refreshAll(), poi
    │       completeOnboarding(); gestione errore con retry sul flag
    ├── F8: accessibilità — annuncio screen reader a ogni transizione di passo,
    │       focus sul titolo del nuovo passo, aria-live per feedback operazioni,
    │       pulsante Indietro disabilitato al passo 1
    └── Gate F (= Gate finale): build exit 0; tsc --noEmit 0 errori;
        npm run test:run → 5/5 passed;
        grep "return null" OnboardingFlow.tsx → 0 risultati;
        grep completeOnboarding AuthContext.tsx → presente
```

---

## Piano operativo dettagliato

### Prerequisiti — Prima di scrivere codice

#### BL1 — Baseline build

```
npm run build
```

Atteso: exit 0. Se fallisce, fermarsi e investigare prima di procedere.

#### BL2 — Baseline test

```
npm run test:run
```

Atteso: 5/5 passed. Annotare il numero esatto.

#### BL3 — Baseline TypeScript

```
npx tsc --noEmit
```

Atteso: 0 errori.

#### BL4 — Verifica stato `App.tsx`

Verificare che il gate `if (needsOnboarding) return <OnboardingFlow />` sia già presente in `AppContent` e che l'import di `OnboardingFlow` sia già dichiarato. Se mancante, questo è un problema di precondizione — segnalare prima di procedere.

#### BL5 — Verifica assenza `onboarding_completed` in `UserPreferences`

Verificare che `UserPreferences` in `src/lib/supabase/types.ts` non contenga ancora `onboarding_completed`. Se presente, saltare il Passo A.

---

### Passo A — `src/lib/supabase/types.ts`: aggiunta `onboarding_completed`

**File modificato:** `src/lib/supabase/types.ts`

**Obiettivo:** abilitare la chiamata `updatePreference('onboarding_completed', true)` da `OnboardingFlow` al passo 6, che oggi fallirebbe per errore di tipo TypeScript.

#### A1 — Aggiungere la chiave opzionale

Aggiungere `onboarding_completed?: boolean` all'interfaccia `UserPreferences`, in fondo alla lista delle chiavi, dopo `talkback_manual_override`.

#### A2 — Aggiornare il commento

Aggiornare il commento sopra l'interfaccia da «Esattamente 28 chiavi — coerenti con P25 §3.1 Opzione 2» a «29 chiavi — 28 da P25 §3.1 Opzione 2 + onboarding_completed aggiunta da P35».

#### Gate A

- `npx tsc --noEmit` → 0 errori
- `npm run build` → exit 0

---

### Passo B — `src/context/AuthContext.tsx`: aggiunta `completeOnboarding()`

**File modificato:** `src/context/AuthContext.tsx`

**Obiettivo:** esporre `completeOnboarding()` come punto di contatto dichiarato tra `OnboardingFlow` e `AuthContext` (P35 §3.3 · PA-6 §10).

#### B1 — Aggiornare `AuthContextValue`

Aggiungere `completeOnboarding: () => void` all'interfaccia `AuthContextValue`, immediatamente dopo `needsOnboarding: boolean`.

#### B2 — Implementare la funzione nel provider

Nel corpo di `AuthProvider`, aggiungere una nuova funzione stabile (`useCallback`) che chiama `setNeedsOnboarding(false)`. La dipendenza di `useCallback` è il setter locale `setNeedsOnboarding`, che React garantisce essere stabile tra i render. La funzione non accede a Supabase, non legge nessuno stato esterno, non ha effetti collaterali.

#### B3 — Aggiungere al valore del context

Aggiungere `completeOnboarding` al valore restituito dal `useMemo` del context, dopo `needsOnboarding`.

#### Gate B

- `npm run build` → exit 0
- Verifica che `completeOnboarding` compaia nell'interfaccia `AuthContextValue` in `AuthContext.tsx`

---

### Passo C — SQL: RPC `seed_default_categories`

**File creato:** `docs/5 - sql/P35-seed-default-categories.sql`

**Obiettivo:** definire la funzione Supabase che inserisce in modo idempotente le 18 categorie template (da `src/lib/constants.ts` `DEFAULT_CATEGORIES`) con `user_id: null` e `predefinita: true`, senza richiedere modifiche alle policy RLS esistenti della tabella `categorie`.

#### C1 — Contenuto del file SQL

Il file SQL deve contenere:

1. La funzione `seed_default_categories()` con firma `RETURNS void` e attributo `SECURITY DEFINER`. Non prende parametri: usa `auth.uid()` per la validazione (verifica che l'utente sia autenticato), ma inserisce le righe con `user_id: null` per indicarne la natura di sistema.

2. Il corpo della funzione itera sulle 18 categorie di `DEFAULT_CATEGORIES`. Per ciascuna, controlla se una riga con lo stesso `nome`, `tipo` e `predefinita = true` esiste già con `user_id IS NULL`. Se non esiste, la inserisce.

3. Un `GRANT EXECUTE` sulla funzione per il ruolo `authenticated`, in modo che il client Supabase possa chiamarla tramite `supabase.rpc('seed_default_categories')`.

**Nota sul perimetro del file:** questo file è solo documentazione operativa per il deploy su Supabase. Non modifica lo schema della tabella `categorie` né aggiunge o altera vincoli esistenti.

#### C2 — Applicazione a Supabase

Applicare il file SQL alla dashboard di Supabase tramite SQL Editor, o tramite Supabase CLI se disponibile, prima del Passo F. Il Passo F richiede che la RPC esista sul database; senza di essa la chiamata `supabase.rpc('seed_default_categories')` del passo D restituirà un errore che il passo 4 di `OnboardingFlow` intercetta correttamente con il pulsante «Riprova».

#### Gate C

- Verificare in Supabase Dashboard (Functions o SQL Editor) che `seed_default_categories` esista e sia richiamabile da un utente autenticato.

---

### Passo D — `src/lib/supabase/repositories/categorie.ts`: aggiunta `seedDefaultCategories()`

**File modificato:** `src/lib/supabase/repositories/categorie.ts`

**Obiettivo:** esporre una funzione client-side che invoca la RPC `seed_default_categories` definita al Passo C. Il repository rimane l'unica interfaccia tra i componenti React e Supabase, coerentemente con l'architettura P26.

#### D1 — Aggiungere la funzione

Aggiungere in fondo al file la funzione esportata `seedDefaultCategories()`. La funzione:

- Chiama `supabase.rpc('seed_default_categories')` senza parametri aggiuntivi.
- Se la chiamata restituisce un errore, rilancia un `RepositoryError` con il messaggio dell'errore ricevuto, coerentemente con il pattern degli altri metodi del repository.
- Non restituisce dati (la RPC è `RETURNS void`): restituisce `Promise<void>`.

#### D2 — Export

La funzione viene esportata come named export, coerente con le altre funzioni del file.

#### Gate D

- `npx tsc --noEmit` → 0 errori
- `npm run build` → exit 0
- Verifica che `seedDefaultCategories` compaia tra gli export di `categorie.ts`

---

### Passo E — `src/test/smoke/test-utils.ts`: aggiornamento mock

**File modificato:** `src/test/smoke/test-utils.ts`

**Obiettivo:** mantenere la coerenza del tipo `MockAuthState` con la superficie pubblica aggiornata di `AuthContextValue`. I test esistenti non devono mostrare errori di tipo dopo l'aggiunta di `completeOnboarding` all'interfaccia.

#### E1 — Aggiungere `completeOnboarding` al mock

Aggiungere `completeOnboarding: () => {}` a `MockAuthState`, nella posizione corrispondente a quella nell'interfaccia `AuthContextValue` (dopo `needsOnboarding`). Il valore è una no-op: i test smoke esistenti non testano il flusso di onboarding e `needsOnboarding` rimane `false` nel mock.

#### Gate E

- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → 5/5 passed

---

### Passo F — `src/components/OnboardingFlow.tsx`: implementazione completa

**File modificato:** `src/components/OnboardingFlow.tsx`

**Obiettivo:** sostituire il placeholder (`return null`) con il componente completo a 6 passi come specificato in P35 §6.

**Dipendenze di import:**
- `useAuth` da `@/context/AuthContext` — per `user.id`, `userSettings`, `completeOnboarding`
- `useAppData` da `@/context/AppDataContext` — per `accounts` (rilevamento conto esistente al passo 5 · PA-5) e `refreshAll` (passo 6)
- `updateField`, `updatePreference` da `@/lib/supabase/repositories/impostazioni-utente` — passi 2, 3, 6
- `seedDefaultCategories` da `@/lib/supabase/repositories/categorie` — passo 4
- `create` da `@/lib/supabase/repositories/conti` — passo 5
- `toast` da `sonner` — feedback operazioni
- `useScreenReader` da `@/hooks/use-screen-reader` — annunci accessibilità
- Componenti UI (Button, Input, Select, Spinner, o equivalenti già usati nell'app)

**Struttura generale:**

Il componente gestisce un intero locale `currentStep: number` (da 1 a 6). Un indicatore di avanzamento visivo mostra «Passo N di 5» per i passi 1–5 (il passo 6 è il completamento automatico); l'indicatore è aggiornato con `aria-live="polite"` a ogni transizione. Un `useEffect` al montaggio (o al cambio di passo) gestisce il focus sul titolo del passo corrente per la navigazione da screen reader.

**Passo 1 — Benvenuto (F2):**

Schermata statica con titolo («Benvenuto in Zecchino»), descrizione dell'app e riepilogo dei passi che seguiranno. Nessuna scrittura su Supabase. Pulsante «Inizia» avanza a `currentStep = 2`. Il pulsante «Indietro» è disabilitato.

**Passo 2 — Nome visualizzato (F3):**

Stato locale `nomeValue` inizializzato con `userSettings?.nomeVisualizzato ?? ''` al primo render (pre-compilazione PA-5). Se vuoto, il componente suggerisce la parte locale dell'email di `user.email` come placeholder.

Alla conferma («Avanti»): chiama `updateField('nomeVisualizzato', nomeValue)`. Se la chiamata ha successo, avanza a `currentStep = 3`. Se fallisce, mostra un messaggio di errore inline con possibilità di riprovare; il campo mantiene il valore inserito senza cancellarlo. Il passo non avanza finché la scrittura non ha avuto esito positivo.

**Passo 3 — Valuta preferita (F4):**

Stato locale `valutaValue` inizializzato con `userSettings?.valutaDefault ?? 'EUR'` (pre-compilazione PA-5). Menu di selezione con i 7 codici valuta definiti in PA-3 (§5). Alla conferma: chiama `updateField('valutaDefault', valutaValue)`. Stesso meccanismo di errore inline del passo 2.

**Passo 4 — Seed categorie (F5):**

All'ingresso del passo (via `useEffect` che dipende da `currentStep`), avvia automaticamente `seedDefaultCategories()`. Mostra uno spinner durante l'operazione con messaggio «Stiamo preparando le categorie di spesa predefinite...» e una live region per screen reader. Al completamento con successo, mostra «Categorie pronte» e abilita il pulsante «Avanti». In caso di errore, mostra il messaggio di errore con pulsante «Riprova»: il pulsante chiama nuovamente `seedDefaultCategories()`. Il pulsante «Avanti» rimane disabilitato finché il seed non è completato con successo. Il passo è non saltabile.

**Passo 5 — Primo conto (F6):**

Al mount del passo, rileva se `accounts` da `useAppData()` contiene almeno un elemento (PA-5 riprendibilità). Se sì, mostra il messaggio «Hai già un conto configurato» con l'elenco dei conti esistenti e due opzioni: «Salta per ora» (avanza a `currentStep = 6`) o «Aggiungi un altro conto» (mostra il form).

Se `accounts` è vuoto, mostra direttamente il form con i campi minimi: nome del conto (input testuale), tipo del conto (select con i tipi da `ACCOUNT_TYPE_LABELS` di `constants.ts`), saldo iniziale (input numerico, default 0). Il tipo default è `'bancario'`. La valuta del conto è quella scelta al passo 3 (`valutaValue` portata in stato condiviso o derivata da `userSettings.valutaDefault` al momento del passo 5).

Alla conferma «Crea conto e continua»: chiama `conti.create(datiConto)`. In caso di errore, messaggio inline con retry. Il pulsante «Salta per ora» è sempre visibile, indipendentemente dallo stato del form.

**Passo 6 — Completamento (F7):**

Schermata di conferma («Tutto pronto! Benvenuto in Zecchino.») con riepilogo di quanto configurato. Pulsante «Inizia a usare Zecchino». Al click:

1. Il pulsante si disabilita con indicatore visivo (spinner inline).
2. Chiama `updatePreference('onboarding_completed', true)`. Se fallisce, mostra errore con retry; il pulsante torna abilitato.
3. Al successo: chiama `refreshAll()` da `useAppData()`. Il pulsante rimane disabilitato durante il refresh.
4. Al completamento di `refreshAll()`: chiama `completeOnboarding()` da `useAuth()`. `App.tsx` re-renderizza e mostra la dashboard.

**Accessibilità (F8):**

- Ogni transizione di passo aggiorna una `aria-live="polite"` region con il numero del passo corrente («Passo N di 5»).
- Al cambio di passo, il focus viene spostato sul titolo del nuovo passo (`h2`) tramite `useEffect` con `ref.current?.focus()`.
- Il pulsante «Indietro» al passo 1 ha `disabled` e `aria-disabled="true"`.
- Il pulsante «Inizia a usare Zecchino» al passo 6 ha `aria-busy="true"` durante le operazioni asincrone.
- I messaggi di errore inline hanno `role="alert"` per l'annuncio immediato agli screen reader.
- `soundSystem` e `hapticSystem` non sono usati nel flusso di onboarding (i feedback visivi e testuali sono sufficienti per questo flusso).

#### Gate F (Gate finale)

- `npm run build` → exit 0
- `npx tsc --noEmit` → 0 errori
- `npm run test:run` → 5/5 passed (i test esistenti non attivano il gate onboarding — `needsOnboarding: false` nel mock)
- Verifica che `return null` non compaia più come unico contenuto di `OnboardingFlow.tsx`
- Verifica che `completeOnboarding` sia presente nell'interfaccia `AuthContextValue`
- Verifica che `onboarding_completed` sia presente in `UserPreferences`
- Verifica che `seedDefaultCategories` sia presente tra gli export di `categorie.ts`
- `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## §10 — File invariati

| File / Area | Motivazione |
|---|---|
| `src/App.tsx` | Il gate `if (needsOnboarding) return <OnboardingFlow />` e l'import sono già presenti post-P27. |
| `src/lib/supabase/repositories/impostazioni-utente.ts` | `updateField` e `updatePreference` già supportano le chiamate dei passi 2, 3 e 6. Nessuna modifica necessaria. |
| `src/lib/constants.ts` | `DEFAULT_CATEGORIES` è già definita e usata come fonte per il seed (Passo C/D). Non modificata. |
| `src/lib/helpers.ts` | `formatCurrency` non ha una lista di valute interna; la lista PA-3 è locale a `OnboardingFlow.tsx`. |
| `src/context/AppDataContext.tsx` | `refreshAll()` e `accounts` sono già nella superficie pubblica post-P28. |
| `src/lib/supabase/repositories/conti.ts` | `create()` è già disponibile e usata al passo 5. |
| `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js` | Invariati. |
| `.github/**` | Protetto da `framework-guard.instructions.md`. |
