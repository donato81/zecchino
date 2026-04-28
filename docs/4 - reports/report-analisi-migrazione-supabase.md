# Report Analisi Migrazione — da Spark a Supabase

**Data:** 28 aprile 2026
**Branch:** `refactoring-architettura`
**Tipo:** Sola lettura — analisi pre-migrazione
**Repository:** donato81/zecchino

---

## 0. Sintesi esecutiva

Sono state individuate **45 chiamate `useKV`** nei sorgenti applicativi e
**8 chiamate dirette `window.spark.kv.*`**. Le chiavi distinte coinvolte sono
**31**.

I dati persistenti si dividono in tre famiglie:

1. **Dati di dominio** (5 chiavi) — mappano 1:1 sulle 5 tabelle ereditate.
2. **Preferenze UI/A11y/Audio** (24 chiavi) — confluiscono tutte in
   `impostazioni_utente` (un record per utente, formato JSON o colonne).
3. **Sicurezza/PIN** (2 chiavi) — **vanno rimosse**: rimpiazzate da Supabase
   Auth.

Le 6 tabelle nuove (`notifiche`, `storico_accessi`, `tag`,
`allegati_transazioni`, `transazioni_ricorrenti`, e parte di
`impostazioni_utente`) **non hanno controparte attuale in `useKV`**: sono
funzionalità nuove o trasformazioni architetturali (es. `transazioni_ricorrenti`
oggi è un flag inline su `Transaction`).

Il punto più delicato è la **migrazione del modello di privacy**: oggi basato
su PIN locale + flag `cifrato`, domani su autenticazione Supabase + Row Level
Security. La logica del flag `cifrato` va ripensata, non solo trasportata.

---

## 1. Tabella riepilogativa

| Chiave Spark | Tipo | Tabella Supabase | File coinvolti | Complessità |
|---|---|---|---|---|
| `accounts` | `Account[]` | `conti` | [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L79) | Media |
| `transactions` | `Transaction[]` | `transazioni` | [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L80) | Complessa |
| `categories` | `Category[]` | `categorie` | [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L81), [src/components/CategoryManagement.tsx](src/components/CategoryManagement.tsx#L38) | Media |
| `budgets` | `Budget[]` | `budget` | [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L82) | Media |
| `savings-goals` | `SavingsGoal[]` | `obiettivi_risparmio` | [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L83) | Media |
| `visible-categories` | `string[]` | `impostazioni_utente` | [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L84) | Semplice |
| `dismissed-budget-alerts` | `string[]` | `impostazioni_utente` o `notifiche` | [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L88) | Semplice |
| `budget-percentages` | `Record<string,number>` | derivabile (cache) | [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx#L89) | Punto aperto |
| `global-pin-hash` | `string` | **DA RIMUOVERE** → Supabase Auth | [src/context/AuthContext.tsx](src/context/AuthContext.tsx#L38), [src/context/AuthContext.tsx](src/context/AuthContext.tsx#L52), [src/components/SecuritySettings.tsx](src/components/SecuritySettings.tsx#L27) | Complessa |
| `private-pin-hash` | `string` | **DA RIPENSARE** (vedi §5) | [src/context/AuthContext.tsx](src/context/AuthContext.tsx#L39), [src/components/SecuritySettings.tsx](src/components/SecuritySettings.tsx#L28) | Complessa |
| `audio-enabled` | `boolean` | `impostazioni_utente` | [src/components/AudioSettings.tsx](src/components/AudioSettings.tsx#L24), [src/lib/sound-system.ts](src/lib/sound-system.ts#L110) | Semplice |
| `audio-volume` | `number` | `impostazioni_utente` | [src/components/AudioSettings.tsx](src/components/AudioSettings.tsx#L25), [src/lib/sound-system.ts](src/lib/sound-system.ts#L111) | Semplice |
| `display-show-balances` | `boolean` | `impostazioni_utente` | [src/components/DisplaySettings.tsx](src/components/DisplaySettings.tsx#L17), [src/hooks/use-display-preferences.ts](src/hooks/use-display-preferences.ts#L19) | Semplice |
| `display-show-account-icons` | `boolean` | `impostazioni_utente` | DisplaySettings + use-display-preferences | Semplice |
| `display-compact-mode` | `boolean` | `impostazioni_utente` | DisplaySettings + use-display-preferences | Semplice |
| `display-show-categories` | `boolean` | `impostazioni_utente` | DisplaySettings + use-display-preferences | Semplice |
| `display-animations-enabled` | `boolean` | `impostazioni_utente` | DisplaySettings + use-display-preferences | Semplice |
| `display-font-size` | `number` | `impostazioni_utente` | DisplaySettings + use-display-preferences | Semplice |
| `display-currency-display` | `'symbol'\|'code'\|'full'` | `impostazioni_utente` | DisplaySettings + use-display-preferences | Semplice |
| `display-number-format` | `'standard'\|'compact'` | `impostazioni_utente` | DisplaySettings + use-display-preferences | Semplice |
| `display-high-contrast` | `boolean` | `impostazioni_utente` | DisplaySettings + use-display-preferences | Semplice |
| `display-show-percentages` | `boolean` | `impostazioni_utente` | DisplaySettings + use-display-preferences | Semplice |
| `display-show-transaction-icons` | `boolean` | `impostazioni_utente` | DisplaySettings + use-display-preferences | Semplice |
| `display-reduce-motion` | `boolean` | `impostazioni_utente` | DisplaySettings + use-display-preferences | Semplice |
| `sr-verbosity` | `'normale'\|...` | `impostazioni_utente` | [src/components/ScreenReaderSettings.tsx](src/components/ScreenReaderSettings.tsx#L49) | Semplice |
| `sr-announce-navigation` | `boolean` | `impostazioni_utente` | ScreenReaderSettings | Semplice |
| `sr-announce-filters` | `boolean` | `impostazioni_utente` | ScreenReaderSettings | Semplice |
| `sr-announce-form-changes` | `boolean` | `impostazioni_utente` | ScreenReaderSettings | Semplice |
| `sr-announce-shortcuts` | `boolean` | `impostazioni_utente` | ScreenReaderSettings | Semplice |
| `sr-announce-balance-changes` | `boolean` | `impostazioni_utente` | ScreenReaderSettings | Semplice |
| `sr-announce-budget-alerts` | `boolean` | `impostazioni_utente` | ScreenReaderSettings | Semplice |
| `sr-announce-progress` | `boolean` | `impostazioni_utente` | ScreenReaderSettings | Semplice |
| `sr-announce-focus-changes` | `boolean` | `impostazioni_utente` | ScreenReaderSettings | Semplice |
| `sr-announce-list-position` | `boolean` | `impostazioni_utente` | ScreenReaderSettings | Semplice |
| `sr-announce-delay` | `number` | `impostazioni_utente` | ScreenReaderSettings | Semplice |
| `sr-reduced-announcements` | `boolean` | `impostazioni_utente` | ScreenReaderSettings | Semplice |
| `talkback-adaptations` (key effettiva da verificare) | `TalkBackAdaptations` | `impostazioni_utente` | [src/hooks/use-talkback.ts](src/hooks/use-talkback.ts#L41) | Semplice |
| `talkback-manual-override` (key effettiva da verificare) | `boolean\|null` | `impostazioni_utente` | [src/hooks/use-talkback.ts](src/hooks/use-talkback.ts#L46) | Semplice |

> Nota: `HapticSettings.tsx` **non** usa `useKV`: lo stato è gestito
> internamente da `hapticSystem` (singleton). La sua persistenza va verificata
> a parte (probabile `localStorage` o nessuna). Vedi §"Punti aperti".

---

## 2. AppDataContext — analisi dettagliata

**File:** [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx)

**Cosa gestisce:** stato globale del dominio applicativo (conti, movimenti,
categorie, budget, obiettivi) più tre stati di preferenza/cache UI
(`visible-categories`, `dismissed-budget-alerts`, `budget-percentages`) e
tutti gli stati locali dei dialog (transazione, conto, budget, savingsGoal,
delete confirm, keyboard help).

**Chiamate `useKV`:** **8 totali**, righe 79–89.

| Chiave | Default |
|---|---|
| `accounts` | `[]` |
| `transactions` | `[]` |
| `categories` | `[]` |
| `budgets` | `[]` |
| `savings-goals` | `[]` |
| `visible-categories` | `ACCOUNT_CATEGORIES.map(c => c.id)` |
| `dismissed-budget-alerts` | `[]` |
| `budget-percentages` | `{}` |

**Consumatori principali (via `useAppData()`):**

- [src/components/DashboardTab.tsx](src/components/DashboardTab.tsx)
- [src/components/TransactionsTab.tsx](src/components/TransactionsTab.tsx)
- [src/components/ReportsTab.tsx](src/components/ReportsTab.tsx)
- [src/components/AccountCard.tsx](src/components/AccountCard.tsx)
- [src/components/AccountDialog.tsx](src/components/AccountDialog.tsx)
- [src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx)
- [src/components/BudgetDialog.tsx](src/components/BudgetDialog.tsx)
- [src/components/SavingsGoalDialog.tsx](src/components/SavingsGoalDialog.tsx)
- [src/components/DialogsOverlay.tsx](src/components/DialogsOverlay.tsx)
- [src/hooks/use-visible-data.ts](src/hooks/use-visible-data.ts) (pipeline derivata)

**Punti di attenzione architetturali:**

- `setAccounts/setTransactions/...` sono usate con la firma updater di `useKV`
  (`(current) => ...`); il rimpiazzo con un client Supabase deve mantenere
  questa firma per non ricablare tutti i call site (vedi `handleSaveAccount`,
  `handleSaveTransaction`).
- `checkBudgetNotifications` usa `budget-percentages` come **cache locale di
  delta**: su Supabase questo dato non ha senso lato server, andrebbe tenuto
  client-side (es. `useState` o `localStorage`) oppure derivato.
- `CategoryManagement.tsx` apre **una seconda istanza `useKV<Category[]>('categories', [])`**
  (riga 38) parallela a quella del context: dopo migrazione va deduplicata
  per evitare due subscription concorrenti e bug di sincronizzazione.

**Stima complessità migrazione:** **Media** sulla maggior parte delle chiavi,
**Complessa** su `transactions` per via dell'interazione con `cifrato`,
RLS e `transazioni_ricorrenti` (oggi flag inline `ricorrente +
frequenzaRicorrenza`, domani tabella separata).

---

## 3. AuthContext — analisi dettagliata

**File:** [src/context/AuthContext.tsx](src/context/AuthContext.tsx)

**Cosa gestisce:** ciclo di vita dell'autenticazione locale basata su due PIN
(globale + privato), stato `isAuthenticated`, `isPrivateUnlocked`,
`isSetupMode`, e visibilità dei due dialog PIN.

**Chiamate `useKV`:** **2**, righe 38–39.

| Chiave | Default | Tipo |
|---|---|---|
| `global-pin-hash` | `''` | `string` |
| `private-pin-hash` | `''` | `string` |

In aggiunta, riga 52 effettua una **lettura diretta**
`window.spark.kv.get('global-pin-hash')` durante il bootstrap per decidere se
entrare in setup mode prima del primo render (workaround a un bug noto di
inizializzazione di `useKV`).

**Consumatori (via `useAuth()`):**

- [src/components/AuthScreen.tsx](src/components/AuthScreen.tsx) — usa
  `showPinDialog`, `isSetupMode`, `handleGlobalPinSubmit`.
- [src/components/SecuritySettings.tsx](src/components/SecuritySettings.tsx) —
  legge entrambi gli hash (con `useKV` proprio, non via context).
- [src/hooks/use-visible-data.ts](src/hooks/use-visible-data.ts) — legge solo
  `isPrivateUnlocked`.
- [src/hooks/use-app-shortcuts.ts](src/hooks/use-app-shortcuts.ts) — legge
  `isAuthenticated`, `hasPrivateAccount`, `isPrivateUnlocked`.
- `App.tsx` / `DialogsOverlay.tsx` — gating render.

**Stima complessità migrazione:** **Complessa**. Vedi §5.

---

## 4. VisibleDataContext — analisi dettagliata

**File:** [src/context/VisibleDataContext.tsx](src/context/VisibleDataContext.tsx)

**Cosa gestisce:** è un wrapper sottile (≈18 righe) che incapsula
[src/hooks/use-visible-data.ts](src/hooks/use-visible-data.ts) e lo espone
via context. Fornisce: `visibleAccounts`, `visibleTransactions`,
`hasPrivateAccount`, `privateAccount`, `totalBalance`, `recentTransactions`,
`groupedAccounts`, `filteredGroupedAccounts`, `allCategoriesVisible`,
`budgetAlerts`.

**Chiamate `useKV`:** **0**. Tutto derivato da `AppDataContext` +
`AuthContext`.

**Stima complessità migrazione:** **Semplice** — non tocca lo storage.
Cambierà comportamento solo perché:

- `account.isPrivato` resterà significativo finché si manterrà la nozione di
  "conto privato sbloccabile";
- la logica `if (account.isPrivato && !isPrivateUnlocked) return false`
  (riga 34) andrà ripensata insieme alla sezione §5 e §6.

---

## 5. PIN e sicurezza — analisi separata

### Stato attuale

**File coinvolti:**

- [src/context/AuthContext.tsx](src/context/AuthContext.tsx) — provider
- [src/components/AuthScreen.tsx](src/components/AuthScreen.tsx) — schermata di
  login iniziale
- [src/components/PinDialog.tsx](src/components/PinDialog.tsx) — UI generica
  riusabile per inserimento PIN
- [src/components/SecuritySettings.tsx](src/components/SecuritySettings.tsx) —
  cambio PIN globale e privato dall'area impostazioni
- [src/lib/crypto.ts](src/lib/crypto.ts) — `hashPin`, `verifyPin`,
  `encryptData`, `decryptData` (Web Crypto SHA + AES-GCM)
- [src/hooks/use-app-shortcuts.ts](src/hooks/use-app-shortcuts.ts) — shortcut
  che richiedono PIN privato per agire sui conti privati

**Chiavi/variabili identificate:**

- `global-pin-hash` (KV) — hash del PIN d'accesso all'app
- `private-pin-hash` (KV) — hash del PIN per sbloccare i conti privati
- `isAuthenticated` (in-memory) — sessione utente corrente
- `isPrivateUnlocked` (in-memory) — sblocco temporaneo dei conti privati
- `isSetupMode` (in-memory) — primo avvio, nessun PIN globale ancora salvato

### Flussi attuali

**Bootstrap** (`AuthContext.useEffect` riga 49):
1. legge `global-pin-hash` direttamente con `window.spark.kv.get`;
2. se assente → `isSetupMode=true` (creazione PIN al primo accesso);
3. mostra `PinDialog` globale.

**Creazione PIN globale** (`handleGlobalPinSubmit`, setup mode):
hash → `setGlobalPinHash` → `isAuthenticated=true`.

**Verifica PIN globale** (`handleGlobalPinSubmit`, normale):
`verifyPin(pin, globalPinHash)` → `isAuthenticated=true`.

**Sblocco conto privato** (`handlePrivatePinSubmit`):
- se `privatePinHash` vuoto → crea hash e sblocca contestualmente;
- altrimenti `verifyPin(pin, privatePinHash)` → `isPrivateUnlocked=true`.

**Cambio PIN** (`SecuritySettings.tsx`): legge entrambi gli hash con `useKV`
proprio (duplicazione rispetto ad `AuthContext`), verifica il vecchio PIN,
salva il nuovo.

### Cosa va RIMOSSO completamente

- Le due chiavi `global-pin-hash` e `private-pin-hash` da `useKV`.
- La lettura diretta `window.spark.kv.get('global-pin-hash')` in
  `AuthContext.tsx` riga 52.
- `handleGlobalPinSubmit` (creazione + verifica PIN globale).
- L'intera schermata `AuthScreen.tsx` nella sua forma attuale (sostituita
  da una pagina login email/password).
- La sezione "Cambio PIN globale" di `SecuritySettings.tsx`.
- Il flag `isSetupMode` (Supabase Auth gestisce signup separatamente dal
  login).

### Cosa va REIMPLEMENTATO con Supabase Auth

- **Sessione utente**: `isAuthenticated` deriva da
  `supabase.auth.getSession()` / `onAuthStateChange`. Non più stato locale ma
  reattivo all'SDK.
- **Login/Signup**: nuova schermata con email + password (Magic Link
  opzionale).
- **Logout**: nuova azione `supabase.auth.signOut()`.
- **`AuthContext`** diventa un thin wrapper sull'auth client Supabase;
  superficie esposta cambia (`user`, `session`, `signIn`, `signUp`, `signOut`).

### Cosa va RIPENSATO (PIN privato)

Il PIN privato è una funzionalità **diversa** dall'autenticazione: è una
"seconda chiave" client-side per nascondere alcuni conti anche all'utente
loggato (es. utente che lascia il telefono incustodito).

Opzioni da valutare a livello prodotto **prima** della migrazione:

1. **Eliminarlo del tutto**: l'isolamento per utente è già garantito da RLS;
   il flag `isPrivato` perde senso.
2. **Mantenerlo come PIN locale (in `localStorage` cifrato)**: continua a
   funzionare lato client, indipendente da Supabase. Sostituisce solo lo
   storage di `private-pin-hash`.
3. **Spostarlo lato server**: nuova colonna in `impostazioni_utente`
   (`private_account_pin_hash`), verificato lato client; abilita
   sincronizzazione tra dispositivi ma richiede attenzione (l'hash transita
   via rete, quindi il bcrypt/argon2 è obbligatorio anziché lo SHA semplice
   attuale).

**Stima complessità:** **Massima** dell'intera migrazione. È l'unica area
dove serve una decisione di prodotto, non solo tecnica, prima di scrivere
codice.

---

## 6. Campo `cifrato` sulle transazioni — analisi e valutazione

### Definizione

[src/lib/types.ts](src/lib/types.ts#L30) — `Transaction.cifrato: boolean`
(obbligatorio, non opzionale).

### Dove viene scritto

Unico writer trovato:
[src/components/TransactionDialog.tsx](src/components/TransactionDialog.tsx#L185):

```ts
const account = accounts.find(a => a.id === contoId)
const isPrivateTransaction = account?.isPrivato || false
// ...
cifrato: isPrivateTransaction
```

→ Il flag `cifrato` è una **denormalizzazione di
`account.isPrivato`** al momento della creazione/modifica.

### Dove viene letto

`grep` esaustivo sui sorgenti **non rileva alcuna lettura** di
`transaction.cifrato` per filtrare/visualizzare/decifrare. La filtratura dei
movimenti privati avviene **interamente per `account.isPrivato`** in
[src/hooks/use-visible-data.ts](src/hooks/use-visible-data.ts#L33-L42)
(filtra i conti, e poi tiene solo le transazioni i cui `contoId` è in
`visibleAccounts`).

Nessuna chiamata a `encryptData`/`decryptData` di `lib/crypto.ts` viene
applicata al campo `descrizione` o `importo`.

**Conclusione:** oggi `cifrato` è un **flag morto** dal punto di vista
funzionale: viene scritto ma non letto. Il nome suggerisce cifratura
crittografica delle transazioni che **non avviene**: la "privacy" è solo
visibilità condizionata dal PIN privato.

### Cosa cambia con Supabase + RLS

Con RLS, la separazione per utente è automatica: ogni utente vede solo le
proprie righe di `transazioni` indipendentemente da qualunque flag
applicativo.

La distinzione "conto privato sbloccabile con secondo PIN" resta una scelta
di **UX intra-account**, non di sicurezza:

- L'utente è uno solo (Supabase Auth) → tutte le transazioni sono sue;
- Il filtro `account.isPrivato` può continuare a funzionare lato client
  esattamente come ora;
- Il campo `cifrato` su `transazioni` (Supabase) **non aggiunge sicurezza**:
  le righe sono comunque leggibili dal client autenticato. Serve solo se si
  vuole mantenere la denormalizzazione per query rapide
  (`WHERE cifrato = true`), ma è ridondante con `JOIN conti ON
  conto.is_privato`.

### Raccomandazione

- **Rimuovere `cifrato` dallo schema Supabase** se la tabella `transazioni` ha
  già un join verso `conti.is_privato`.
- In alternativa **lasciarlo come campo derivato** (vista o trigger), ma
  smettere di scriverlo dal client (eliminando la riga 185 di
  `TransactionDialog.tsx`).
- Se in futuro si vuole vera cifratura del campo `descrizione`/`importo`,
  va progettata da zero (chiave derivata dal PIN privato, mai inviata al
  server) — ma non è ciò che fa il codice attuale.

---

## 7. Lista ordinata per priorità di migrazione

1. **Decisione di prodotto sul PIN privato e sul flag `cifrato`** (§5, §6).
   Senza questa, l'`AuthContext` non può essere riscritto in modo coerente.
   *Output atteso:* documento di design 1 pagina che sceglie tra le 3 opzioni
   PIN privato e dichiara il destino del flag `cifrato`.

2. **Strato di accesso dati Supabase** (`src/lib/supabase.ts` + repository per
   tabella). Definire una API uniforme che restituisca lo stesso shape che
   oggi restituisce `useKV` (array + setter updater) per poter sostituire i
   call site uno a uno.

3. **Migrazione `AuthContext`** a Supabase Auth. Nuova `AuthScreen` con
   email/password. Rimozione `global-pin-hash`. Gestione sessione reattiva.
   *Bloccante per tutto il resto perché tutti i provider sono montati sotto
   `AuthProvider`.*

4. **Migrazione `AppDataContext` — chiavi di dominio** (`accounts`,
   `transactions`, `categories`, `budgets`, `savings-goals`).
   Sostituire `useKV` con hook custom (es. `useSupabaseTable`) che mantiene
   la stessa API di setter. Deduplicare `useKV<Category[]>` in
   `CategoryManagement.tsx`.

5. **Migrazione preferenze UI/A11y/Audio** (24 chiavi `display-*`, `sr-*`,
   `audio-*`, `talkback-*`, `visible-categories`, `dismissed-budget-alerts`).
   Confluiscono in `impostazioni_utente`. Conviene un unico hook
   `useUserSettings()` che carichi una sola volta e cachi in memoria; le
   write fanno upsert sul singolo campo. Toccare in parallelo:
   `DisplaySettings`, `ScreenReaderSettings`, `AudioSettings`,
   `use-display-preferences`, `use-talkback`, `sound-system.ts`.

6. **Cache `budget-percentages`**: decidere se mantenerla in `localStorage`
   (puro client) o ricalcolarla a ogni mount. Rimuoverla da Spark.

7. **Ridisegno `DataManagement.tsx`**: oggi fa
   `window.spark.kv.keys()/get()/set()` per export/import completo.
   Rifarlo come export/import via Supabase REST/RPC o via dump JSON
   per-tabella.

8. **PIN privato**: implementare la scelta fatta al punto 1 (tipicamente
   `localStorage` cifrato o colonna su `impostazioni_utente`).
   Adeguare `SecuritySettings`, `PinDialog`, `use-visible-data`,
   `use-app-shortcuts`.

9. **Decommissionamento `@github/spark/hooks`**: rimuovere import e
   dipendenza dal `package.json`. Aggiornare `src/test/setup.ts` (oggi
   mocka `useKV` con un `Map`).

10. **Funzionalità nuove abilitate dalle 6 tabelle nuove** (`notifiche`,
    `storico_accessi`, `tag`, `allegati_transazioni`,
    `transazioni_ricorrenti`): fuori scope migrazione, ma vanno schedulate
    come progetti separati una volta completati i punti 1–9.

---

## 8. Punti aperti e rischi

### Decisioni di prodotto bloccanti

- **PIN privato**: tre opzioni in §5, scelta non tecnica. Bloccante per
  punto 1 della roadmap.
- **Flag `cifrato`**: rimosso, derivato o mantenuto morto (§6).
- **Multi-utente vero o single-tenant?** Supabase Auth abilita più utenti.
  Resta da chiarire se l'app deve diventare multi-utente o restare
  monoutente con auth solo per portabilità tra device. Impatta RLS e UI.

### Rischi tecnici

- **API setter di `useKV`**: oggi tutti i call site usano la firma updater
  `set(prev => next)` con tolleranza al `prev` undefined. L'hook Supabase
  sostitutivo deve replicare questa semantica, altrimenti la regressione è
  diffusa e silenziosa.
- **Doppia sottoscrizione su `categories`**: `CategoryManagement.tsx` apre
  un `useKV` parallelo a quello del context. Migrando solo uno dei due si
  introduce uno split-brain.
- **`SecuritySettings.tsx`** apre la stessa coppia `useKV` di
  `AuthContext`. Stessa nota.
- **Bootstrap race condition**: `AuthContext` aggira un bug Spark con
  `window.spark.kv.get` diretto. Su Supabase la `getSession()` è
  asincrona allo stesso modo: serve replicare il pattern `isAuthReady` per
  evitare il flash della schermata sbagliata.
- **`HapticSettings.tsx`** non usa `useKV`: la persistenza passa per
  `hapticSystem` (singleton). Verificare se internamente usa
  `localStorage`, `useKV` o nulla — non emerge dai grep nei file applicativi.
- **`sound-system.ts`** (singleton) chiama `window.spark.kv.get/set`
  direttamente: non è un componente React, va riscritto per usare il nuovo
  client Supabase senza `useKV`. Attenzione a non introdurre import cicli.
- **`DataManagement` export/import**: rompe il backup esistente. Va deciso
  se fornire un migratore one-shot (JSON Spark → Supabase) per chi ha già
  dati locali.
- **`budget-percentages`** è una cache di stato di notifica (per evitare di
  rinotificare lo stesso superamento di soglia). Migrarla su Supabase
  sarebbe sbagliato (è stato per-device); decidere `localStorage` o
  ricalcolo.
- **`ricorrente` + `frequenzaRicorrenza` su `Transaction`** vs nuova tabella
  `transazioni_ricorrenti`: oggi sono campi inline, domani sono entità
  separate che generano transazioni. La migrazione dei dati esistenti
  richiede uno script di estrazione.
- **Nomi delle chiavi per `talkback-*`**: in `use-talkback.ts` la stringa
  letterale non era visibile nel grep parziale. Verificare nei sorgenti
  esatti prima della scrittura del migratore.

### Rischi di sicurezza

- L'attuale `hashPin` usa SHA-256 (vedi `src/lib/crypto.ts`). Per Supabase
  Auth non rilevante (gestisce lui le password). Per il PIN privato, se si
  sceglie di portarlo lato server, **SHA-256 puro è inadeguato**: usare
  bcrypt/argon2 server-side (Edge Function) o mantenerlo strettamente
  client-side.
- `encryptData/decryptData` in `lib/crypto.ts` esistono ma non sono
  attualmente invocati su `Transaction` (verificato via grep). Se si decide
  di introdurre cifratura reale dei movimenti privati va progettata ora,
  non dopo.

---

*Fine report. Nessun file sorgente è stato modificato.*
