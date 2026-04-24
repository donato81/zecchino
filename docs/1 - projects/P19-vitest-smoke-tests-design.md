# P19 — Introduzione Vitest e 5 smoke test

**Stato:** Bozza di design  
**Data:** 2026-04-24  
**Branch:** `refactoring-architettura`  
**Prerequisiti completati:** P14, P15, P16, P17, P18  
**Riferimento diagnostico:** `docs/4 - reports/Diagnostic-Analysis-Post-P13.md` §3.7, §7 priorità 8

---

## 1. Obiettivo e verifica dipendenze

### Il rischio documentato

Il progetto non dispone di nessun meccanismo di verifica automatica del comportamento. Tutte le 33 verifiche del piano P13 sono state eseguite manualmente, una volta, da un operatore umano. Ogni modifica futura al codice — che si tratti di nuove funzionalità, refactoring, pulizia di warning lint — viene eseguita senza rete di sicurezza: una regressione può passare inosservata fino a quando qualcuno non ci inciampa durante un utilizzo manuale.

I passi P14–P18 hanno già introdotto modifiche architetturali significative (separazione del context, migrazione di sette consumer). Ciascuno di questi passi ha potenzialmente rischiato di rompere flussi visibili all'utente. La verifica è avvenuta solo con `npm run build` (che rileva errori TypeScript, non comportamentali) e con un'ispezione visiva del dev server.

I 5 smoke test introdotti in P19 garantiscono:

| Comportamento verificato | Livello di copertura |
|---|---|
| L'app si monta senza errori | Avvio, rendering iniziale |
| L'autenticazione PIN funziona | Flusso d'accesso principale |
| La tab Dashboard mostra i titoli attesi | Navigazione, rendering post-auth |
| La tab Movimenti è raggiungibile e mostra i controlli | Navigazione tra tab, UI interattiva |
| Il conto privato è nascosto per default e sbloccabile | Logica privacy, PIN privato |

Non si tratta di test esaustivi: verificano che i percorsi principali dell'app non siano rotti dopo una modifica. La copertura si estende nei passi P20+ dedicati.

### Verifica dipendenze (risultati lettura `package.json`)

**File letto:** `package.json` — scripts, dependencies, devDependencies.

Il file contiene gli script: `dev`, `kill`, `build`, `lint`, `optimize`, `preview`. Non esiste nessuno script `test`. Le `devDependencies` comprendono: `@eslint/js`, `@tailwindcss/postcss`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react-swc`, `eslint`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `tailwindcss`, `typescript`, `typescript-eslint`, `vite`.

**Nessuna delle librerie di test è già presente** nel progetto, né tra le `dependencies` né tra le `devDependencies`. L'elenco completo delle librerie da aggiungere è riportato nella sezione 7.

---

## 2. Perché Vitest e non Jest

Vitest è la scelta naturale per un progetto costruito con Vite per ragioni concrete:

**Integrazione nativa con Vite.** Vitest è progettato per funzionare con la stessa pipeline di trasformazione dei moduli che usa Vite in fase di sviluppo. La configurazione degli alias di percorso (come `@/` che punta a `src/`), i plugin Vite, le impostazioni TypeScript: tutto viene condiviso o replicato facilmente, senza adattatori intermedi.

**Stessa semantica dei moduli.** Il progetto usa ESM (`"type": "module"` in `package.json`) e `import.meta.dirname` in `vite.config.ts`. Jest, nato in ambiente CommonJS, richiede trasformatori aggiuntivi (Babel o `ts-jest`) per gestire questa sintassi. Con Vitest non serve nessun trasformatore perché usa la stessa infrastruttura ESM di Vite.

**Il plugin `@vitejs/plugin-react-swc` è già una dipendenza.** Vitest usa questo plugin per trasformare i file `.tsx` durante i test, senza installare nulla di aggiuntivo.

**Velocità.** Vitest sfrutta la cache del bundler Vite ed è significativamente più veloce di Jest nell'avvio e nella riesecuzione dei test in watch mode.

**Nessuna configurazione conflittuale.** La configurazione di Vitest è separata in `vitest.config.ts` (un file nuovo, distinto da `vite.config.ts`), quindi non interferisce con il build system esistente.

---

## 3. Struttura del sistema di test

### Organizzazione delle cartelle

```
src/
  test/
    setup.ts                          ← setup globale, mock globali
    smoke/
      01-app-renders.test.tsx         ← Test 1: mount dell'app
      02-authentication.test.tsx      ← Test 2: flusso PIN
      03-dashboard-tab.test.tsx       ← Test 3: tab Dashboard
      04-transactions-tab.test.tsx    ← Test 4: tab Movimenti
      05-private-account.test.tsx     ← Test 5: conto privato
```

**Perché `src/test/` e non `src/__tests__/`?** La convenzione `__tests__/` è associata a Jest e tende a mescolare test con il codice sorgente. La cartella `src/test/` separa nettamente i test dal codice applicativo e rende esplicita la gerarchia: tutti i file sotto `src/test/` sono infrastruttura di test, non codice di produzione. La sottocartella `smoke/` distingue i test smoke da futuri test unitari o di integrazione che potranno essere aggiunti nella stessa cartella radice `test/`.

**Perché la numerazione `01-`, `02-`?** I file di test smoke seguono un ordine logico che rispecchia i flussi utente: prima l'avvio, poi l'autenticazione, poi le funzionalità post-login. La numerazione aiuta la leggibilità e stabilisce un ordine di lettura, anche se ciascun test è indipendente dagli altri.

### Ruolo di `setup.ts`

Il file `src/test/setup.ts` viene eseguito da Vitest prima di ogni file di test. Contiene:

- L'importazione di `@testing-library/jest-dom`, che estende le `expect()` di Vitest con i matcher DOM (come `toBeInTheDocument()`, `toBeVisible()`, `toHaveTextContent()`).
- La dichiarazione del mock globale per `@github/spark/hooks` (dettagli nella sezione 4).
- Eventuali mock globali aggiuntivi per librerie che non funzionano in ambiente jsdom (da valutare durante la fase di coding).

### Relazione tra file di test e file di codice

I test smoke non testano una singola funzione o un singolo componente in isolamento: testano il comportamento integrato dell'app montando `<App />` o componenti con tutti i loro provider. Ogni test file in `src/test/smoke/` dipende indirettamente da:

- `src/App.tsx` — struttura dei provider e routing condizionale (AuthScreen vs AppContent)
- `src/context/AuthContext.tsx` — logica PIN, stato `isAuthenticated`
- `src/context/AppDataContext.tsx` — dati conti, movimenti, categorie
- `src/context/VisibleDataContext.tsx` — dati filtrati per visibilità

---

## 4. Gestione dei mock e dei contesti

### 4.1 Il problema di `useKV`

Il progetto usa `useKV` da `@github/spark/hooks` come hook di persistenza. È importato in due context:

- `src/context/AuthContext.tsx` riga 2: `import { useKV } from '@github/spark/hooks'`  
  — usato per `global-pin-hash` e `private-pin-hash`
- `src/context/AppDataContext.tsx` riga 2: `import { useKV } from '@github/spark/hooks'`  
  — usato per `accounts`, `transactions`, `categories`, `budgets`, `savingsGoals`, `visibleCategories`, `dismissedAlerts`, `budgetPercentages`

Il pacchetto `@github/spark` richiede un runtime Spark (un ambiente di esecuzione specifico della piattaforma GitHub) per funzionare. In ambiente di test con jsdom, questo runtime non è disponibile. Se `@github/spark/hooks` viene importato senza essere mockato, il test fallisce immediatamente con un errore di modulo non trovato o di hook fuori contesto.

Il mock di `useKV` è quindi il blocco fondativo dell'intera strategia di test: senza di esso, nessun test può essere eseguito.

### 4.2 Strategia di mock per `useKV`

La strategia corretta è dichiarare un mock globale nel file `src/test/setup.ts` per l'intero modulo `@github/spark/hooks`. Il mock deve:

1. Ricevere una chiave (`key`) e un valore di default (`defaultValue`).
2. Restituire una coppia `[valore, setter]`, dove il valore è il `defaultValue` fornito e il setter è una funzione vuota (no-op) — o una funzione spia per i test che devono verificare che sia stata chiamata.
3. Non invocare mai il runtime Spark reale.

Questo approccio significa che in tutti i test, ogni chiamata a `useKV('accounts', [])` riceverà `[]` come valore (array vuoto, stato iniziale pulito). L'app si trova in uno stato di "primo avvio" senza dati persistiti, che è esattamente la condizione più robusta per smoke test: se l'app funziona con dati vuoti, funziona a prescindere dallo stato persisto.

**Posizionamento del mock:** il mock deve essere dichiarato in `src/test/setup.ts` affinché sia attivo per tutti i file di test. In Vitest, le chiamate `vi.mock()` sono "hoisted" (sollevate in cima al file di modulo), quindi anche se scritte nel setup, vengono applicate prima che qualsiasi file di test importi i propri moduli.

**Limitazione nota:** il setter è un no-op. Se un handler come `handleGlobalPinSubmit` chiama `setGlobalPinHash(hash)` (setter KV), questo non aggiorna il valore restituito dal mock. Tuttavia, `isAuthenticated` è uno stato React normale (`useState(false)`, non KV), quindi `setIsAuthenticated(true)` funziona correttamente. I test che verificano la visibilità del contenuto post-login si basano su `isAuthenticated`, non su `globalPinHash`, quindi questa limitazione non blocca nessuno dei 5 test.

### 4.3 Wrapping dei componenti

Tutti i 5 test renderizzano direttamente `<App />`, che contiene l'intera catena di provider definita in `src/App.tsx` riga 146:

```
<AuthProvider>
  <AppDataProvider>
    <VisibleDataProvider>
      <AppContent />
    </VisibleDataProvider>
  </AppDataProvider>
</AuthProvider>
```

Renderizzare `<App />` è preferibile a montare singoli componenti con provider wrappati manualmente per due motivi:
- Rispecchia il comportamento reale dell'app, che è l'obiettivo dei smoke test.
- Evita di duplicare la struttura dei provider in ogni file di test, rendendo i test più robusti rispetto a future modifiche all'albero dei provider.

Può essere utile creare una funzione di utilità condivisa `renderApp()` in `src/test/smoke/` (o direttamente in `setup.ts`) che chiama `render(<App />)` e restituisce le utility di Testing Library. Questo riduce la ripetizione nei 5 file di test.

### 4.4 Simulazione dell'autenticazione

**Meccanismo di autenticazione (risultati lettura `src/context/AuthContext.tsx`):**

`AuthContext` usa `useKV<string>('global-pin-hash', '')`. Con il mock descritto in §4.2, `globalPinHash` è sempre `''` (stringa vuota) all'inizio di ogni test.

Nel `useEffect` iniziale di `AuthProvider` (riga 53 di `AuthContext.tsx`):
```
if (!globalPinHash) {
  setIsSetupMode(true)   // → isSetupMode = true
  setShowPinDialog(true) // → il dialog PIN si apre
}
```
Con `globalPinHash = ''`, l'app entra in **modalità setup** a ogni test. Questo è il percorso più semplice per l'autenticazione nei test:

1. L'app monta e mostra il dialogo "Imposta PIN Globale" con due campi: "Nuovo PIN" e "Conferma PIN".
2. Il test inserisce lo stesso PIN in entrambi i campi (qualsiasi PIN ≥ 4 caratteri).
3. La funzione `handleGlobalPinSubmit` esegue `hashPin(pin)` (usa `crypto.subtle.digest`, disponibile in Node.js 15+ e in jsdom), poi chiama `setIsAuthenticated(true)` (stato React normale).
4. `isAuthenticated` diventa `true`, il componente `AppContent` prende il posto di `AuthScreen`, e la tab Dashboard è visibile.

L'hash del PIN viene calcolato correttamente anche in jsdom perché `crypto.subtle` è disponibile nel runtime Node.js. Non serve nessun mock per `src/lib/crypto.ts`.

Per i test 3, 4, 5 che richiedono autenticazione prima di verificare il contenuto, il test deve prima eseguire il flusso di setup PIN. Per evitare ripetizioni, una funzione di utilità `authenticateWithPin(screen, pin)` può essere definita in `src/test/smoke/` e riusata nei test che ne hanno bisogno.

---

## 5. Dettaglio dei 5 test

### 5.1 Test 1 — App si monta senza errori

**File:** `src/test/smoke/01-app-renders.test.tsx`

**Cosa verifica:** Che il rendering iniziale di `<App />` non generi eccezioni e che la schermata di autenticazione sia visibile all'utente non autenticato.

**Tipo di verifica:** Passiva (nessuna interazione utente).

**Selettori e elementi attesi:**

| Elemento | Selettore consigliato | Origine nel codice |
|---|---|---|
| Div contenitore auth | `getByRole('main', { name: /Schermata di autenticazione Zecchino/i })` | `AuthScreen.tsx` riga 12: `role="main"` con `aria-label` |
| Dialog PIN | `getByRole('dialog')` | `PinDialog.tsx`: `<Dialog open={true}>` |
| Titolo dialog | `getByText(/Imposta PIN Globale/i)` | `PinDialog.tsx`: `{title}` passato da `AuthScreen.tsx` in modalità setup |
| Descrizione | `getByText(/Crea un PIN per proteggere l'applicazione/i)` | `PinDialog.tsx`: `{description}` passato da `AuthScreen.tsx` |

**Cosa fare se un elemento non è trovato:** Se `getByRole('main', { name: /Schermata di autenticazione/i })` fallisce, il problema è probabile nel rendering del provider tree o nel mock di `useKV`. Verificare il messaggio di errore: "Unable to find an accessible element with the role 'main'" indica che il `<div role="main">` in `AuthScreen.tsx` non è stato renderizzato.

---

### 5.2 Test 2 — Autenticazione con PIN

**File:** `src/test/smoke/02-authentication.test.tsx`

**Cosa verifica:** Che il flusso di inserimento PIN funzioni end-to-end: dalla schermata di autenticazione al rendering della tab Dashboard.

**Tipo di verifica:** Interattiva (digitazione nei campi, click su pulsante).

**Flusso e selettori:**

| Passo | Azione | Selettore |
|---|---|---|
| 1 | Render `<App />` | — |
| 2 | Trovare il campo PIN | `getByLabelText(/Nuovo PIN/i)` — label "Nuovo PIN" con `htmlFor="pin"` in `PinDialog.tsx` |
| 3 | Digitare il PIN | `userEvent.type(campo, '1234')` |
| 4 | Trovare il campo conferma | `getByLabelText(/Conferma PIN/i)` — label "Conferma PIN" con `htmlFor="confirm-pin"` |
| 5 | Digitare il PIN di conferma | `userEvent.type(campo, '1234')` |
| 6 | Cliccare "Conferma" | `getByRole('button', { name: /Conferma/i })` e click |
| 7 | Verificare Dashboard visibile | `findByText(/I Tuoi Conti/i)` — heading h2 in `DashboardTab.tsx` riga 97 |

**Nota sul passo 7:** usare `findByText` (promise-based) invece di `getByText` per attendere il re-render asincrono causato dall'operazione `hashPin` (che usa `crypto.subtle.digest`, asincrona).

**Cosa fare se il passo 7 fallisce:** Se "I Tuoi Conti" non compare, `isAuthenticated` non è diventato `true`. Verificare che `handleGlobalPinSubmit` sia stato effettivamente chiamato (possibile problema con il form submit) e che `crypto.subtle.digest` sia disponibile nell'ambiente di test.

---

### 5.3 Test 3 — Dashboard tab: sezioni principali

**File:** `src/test/smoke/03-dashboard-tab.test.tsx`

**Cosa verifica:** Che, dopo l'autenticazione, la tab Dashboard mostri la sezione dei conti e quella dei movimenti recenti.

**Tipo di verifica:** Interattiva (flusso auth) + passiva (verifica headings).

**Prerequisito:** Eseguire prima il flusso di autenticazione (riutilizzare la funzione di utilità `authenticateWithPin`).

**Con dati vuoti (stato iniziale del mock):**

| Elemento atteso | Selettore | Testo/ruolo | Origine |
|---|---|---|---|
| Heading sezione conti | `getByRole('heading', { level: 2, name: /I Tuoi Conti/i })` | "I Tuoi Conti" | `DashboardTab.tsx` riga 97 |
| Stato vuoto conti | `getByText(/Nessun conto disponibile/i)` | testo in `<p>` | `DashboardTab.tsx` riga ~190 |
| Heading movimenti recenti | `getByRole('heading', { level: 3, name: /Movimenti Recenti/i })` | "Movimenti Recenti" | `DashboardTab.tsx` riga ~309 |
| Stato vuoto movimenti | `getByText(/Nessun movimento registrato/i)` | testo in `<p>` | `DashboardTab.tsx` riga ~316 |

**Razionale:** anche con dati vuoti, entrambe le sezioni sono strutturalmente presenti nel DOM. Il test verifica che la struttura principale sia intatta, indipendentemente dalla presenza di dati.

---

### 5.4 Test 4 — Transactions tab: lista e controlli

**File:** `src/test/smoke/04-transactions-tab.test.tsx`

**Cosa verifica:** Che la tab Movimenti sia raggiungibile e che i suoi elementi principali (heading, pulsante di aggiunta) siano presenti.

**Tipo di verifica:** Interattiva (auth + click su tab) + passiva (verifica heading e pulsante).

**Flusso e selettori:**

| Passo | Azione | Selettore |
|---|---|---|
| 1–6 | Autenticazione (come test 2) | `authenticateWithPin(...)` |
| 7 | Cliccare la tab "Movimenti" | `getByRole('tab', { name: /Movimenti/i })` e click |
| 8 | Verificare heading | `findByRole('heading', { level: 2, name: /Tutti i Movimenti/i })` — `TransactionsTab.tsx` riga ~75 |
| 9 | Verificare pulsante aggiunta | `getByRole('button', { name: /Aggiungi nuovo movimento/i })` — aria-label del `<Button>` in `TransactionsTab.tsx` riga ~88 |

**Nota sul passo 8:** `findByRole` (promise-based) è necessario perché Radix UI `TabsContent` monta il contenuto della tab al momento del click, non immediatamente. Il timeout di default di Testing Library (1000 ms) è sufficiente.

**Con dati vuoti:**
- La lista movimenti mostra il testo "Nessun movimento da visualizzare" (`TransactionsTab.tsx` riga ~112).
- Il pulsante "Nuovo Movimento" nell'header della tab è visibile (`TransactionsTab.tsx` riga ~88), distinto dal pulsante "Aggiungi Movimento" nell'empty state.

---

### 5.5 Test 5 — Conto privato: visibilità e sblocco

**File:** `src/test/smoke/05-private-account.test.tsx`

**Cosa verifica:** Che un conto privato sia nascosto per default dopo l'autenticazione globale, e che diventi visibile dopo l'inserimento del PIN privato.

**Tipo di verifica:** Interattiva (auth + mock override + click sblocco).

**Prerequisito dati:** Questo test richiede un account con `isPrivato: true` nella lista conti. Poiché il mock globale restituisce `[]` per `accounts`, il test 5 deve sovrascrivere il mock per la chiave `'accounts'` con un array contenente esattamente un account privato, con i campi richiesti dall'interfaccia `Account` (`src/lib/types.ts` righe 8–17):

| Campo | Valore di test |
|---|---|
| `id` | stringa univoca, es. `'test-priv-1'` |
| `nome` | `'Conto Segreto'` |
| `tipo` | `'privato'` (AccountType valido) |
| `saldoIniziale` | `0` |
| `valuta` | `'EUR'` |
| `isPrivato` | `true` |
| `dataCreazione` | `'2024-01-01'` |

**La logica di filtraggio (verificata in `src/hooks/use-visible-data.ts` riga 32):**
```
visibleAccounts = safeAccounts.filter(account => {
  if (account.isPrivato && !isPrivateUnlocked) return false
  return true
})
```
Con `isPrivateUnlocked = false` (default), `Conto Segreto` non è in `visibleAccounts`. Con `isPrivateUnlocked = true` (dopo sblocco), compare.

**`hasPrivateAccount` (riga 49):**
```
hasPrivateAccount = safeAccounts.some(account => account.isPrivato)
```
Questo usa `safeAccounts` (tutti gli account), non solo `visibleAccounts`. Quindi `hasPrivateAccount = true` anche quando il conto è nascosto, il che fa comparire il pulsante "Sblocca Privato" in `DashboardTab.tsx`.

**Flusso e selettori:**

| Passo | Azione | Selettore/Verifica |
|---|---|---|
| 1 | Override mock `useKV` per `'accounts'` | Restituisce `[accountPrivato]` invece di `[]` |
| 2–6 | Autenticazione globale | `authenticateWithPin(...)` |
| 7 | Verificare conto NON visibile | `expect(queryByText(/Conto Segreto/i)).not.toBeInTheDocument()` |
| 8 | Verificare pulsante sblocco presente | `getByRole('button', { name: /Sblocca conto privato/i })` — `DashboardTab.tsx` riga ~151 |
| 9 | Cliccare il pulsante | click |
| 10 | Inserire PIN privato nel dialogo | trovare il campo PIN nel nuovo dialog, digitare, confermare (stesso flusso PinDialog) |
| 11 | Verificare conto ORA visibile | `findByText(/Conto Segreto/i)` |

**Nota sul passo 10:** Il dialogo del PIN privato è gestito da `DialogsOverlay` (componente renderizzato in `AppContent`). Ha lo stesso markup di `PinDialog`. Il titolo sarà "Imposta PIN Privato" in modalità setup (nessun PIN privato ancora impostato). Il selettore per il campo sarà analogo a quello del test 2.

---

## 6. Configurazione `vitest.config.ts`

Il file `vitest.config.ts` deve essere creato in root del progetto, accanto a `vite.config.ts`. Non modifica né estende `vite.config.ts`: è un file separato e autonomo.

**Contenuto necessario del file:**

**Plugin:** solo `@vitejs/plugin-react-swc` (già in devDependencies), che permette a Vitest di trasformare i file `.tsx`. NON includere `sparkPlugin`, `tailwindcss`, `createIconImportProxy`: non sono necessari in ambiente di test e potrebbero causare errori se tentano di accedere a risorse non disponibili.

**Environment:** `jsdom` — simula il DOM del browser in Node.js. Necessario per qualsiasi test che usa `render()` di Testing Library, manipola il DOM, o verifica elementi UI.

**Setup files:** `['./src/test/setup.ts']` — percorso relativo al file di setup globale. Vitest esegue questo file prima di ogni file di test.

**Alias di percorso:** l'alias `@/` → `src/` deve essere replicato esattamente come in `vite.config.ts`. In `vite.config.ts` riga 7–9, l'alias è definito come:
```
resolve: {
  alias: { '@': resolve(projectRoot, 'src') }
}
```
dove `projectRoot = process.env.PROJECT_ROOT || import.meta.dirname`. In `vitest.config.ts`, si può usare `import.meta.dirname` direttamente (il file è nella root del progetto), oppure `path.resolve(import.meta.dirname, 'src')`.

**Globals:** opzionalmente `true`, per usare `describe`, `it`, `expect`, `vi` senza importarli in ogni file di test. Se abilitato, il compilatore TypeScript deve essere informato (vedi sezione 8).

**Include pattern:** per limitare l'esecuzione ai soli file di test, specificare il glob `src/test/**/*.test.{ts,tsx}`. Questo esclude file come `setup.ts` dall'esecuzione come test.

**Esclusione:** `node_modules` e `dist` devono essere esclusi (comportamento default di Vitest, ma esplicitare è buona pratica).

**Separazione da `vite.config.ts`:** la coesistenza di `vite.config.ts` e `vitest.config.ts` nella stessa cartella è supportata ufficialmente. Vitest rileva automaticamente `vitest.config.ts` quando viene eseguito; Vite continua a usare `vite.config.ts` per il build. Non interferiscono.

---

## 7. Modifiche a `package.json`

### Script da aggiungere

Nella sezione `scripts` aggiungere:

| Script | Comando | Utilizzo |
|---|---|---|
| `"test"` | `"vitest"` | Modalità watch per sviluppo: riesegue i test al salvataggio dei file |
| `"test:run"` | `"vitest run"` | Singola esecuzione, usato per CI e per la Definition of Done |

### Dipendenze da aggiungere a `devDependencies`

**Verifica:** nessuna delle seguenti è già presente nel file (confermato dalla lettura del `package.json`).

| Pacchetto | Versione consigliata | Motivo |
|---|---|---|
| `vitest` | `^3.0.0` | Test runner principale, compatibile con Vite 7.x |
| `@vitest/ui` | `^3.0.0` | Interfaccia web opzionale per visualizzare i risultati dei test |
| `@testing-library/react` | `^16.0.0` | Rendering e query di componenti React; v16 supporta React 19 |
| `@testing-library/jest-dom` | `^6.6.0` | Matcher DOM estesi per `expect()` (`toBeInTheDocument`, etc.) |
| `@testing-library/user-event` | `^14.5.0` | Simulazione realistica di input utente (digitazione, click) |
| `jsdom` | `^25.0.0` | Simulazione DOM in Node.js, richiesta dall'environment `jsdom` di Vitest |

**Note sulle versioni:**
- `@testing-library/react` v16+ richiede React 18+; il progetto usa React `^19.0.0`, quindi è compatibile.
- `@testing-library/user-event` v14 usa l'API `setup()` (invece di chiamate dirette), che è la best practice corrente per simulare interazioni utente realistiche.
- `jsdom` v25 è compatibile con Node.js 18+; verificare la versione Node.js attiva nel progetto.
- `@vitest/ui` è opzionale: può essere omesso se non si vuole l'interfaccia web.

---

## 8. `tsconfig.json` — analisi e decisione

### Stato attuale (risultati lettura `tsconfig.json`)

Il file corrente contiene:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    ...
  },
  "include": ["src"]
}
```

Non esiste nessun campo `types` in `compilerOptions`.

### Analisi

**Il campo `include: ["src"]` copre già `src/test/setup.ts`** e tutti i file in `src/test/smoke/`. Non è necessario aggiungere percorsi espliciti.

**Il problema dei tipi jest-dom:** Quando si scrive `expect(element).toBeInTheDocument()`, TypeScript segnala un errore se non conosce il tipo del metodo `toBeInTheDocument`. La libreria `@testing-library/jest-dom` estende l'interfaccia `Matchers` di Vitest/Jest tramite declaration merging, ma TypeScript deve sapere dove cercare queste estensioni.

Il metodo consigliato dalla documentazione ufficiale di `@testing-library/jest-dom` per Vitest è dichiarare l'importazione del modulo nel file di setup o aggiungere i tipi in `tsconfig.json`.

### Decisione

**Modificare `tsconfig.json`** aggiungendo `"types": ["@testing-library/jest-dom"]` al campo `compilerOptions`. Questa modifica:

- Applica le estensioni di tipo globalmente a tutti i file inclusi nel `tsconfig` (compresi i file di test).
- È la soluzione più pulita e meno invasiva rispetto a una direttiva `/// <reference>` che andrebbe aggiunta in ogni file di test.
- Non altera il comportamento di build per il codice di produzione: `@testing-library/jest-dom` è una `devDependency` e non viene inclusa nel bundle.

La modifica richiesta è minima: aggiungere un singolo campo `"types"` in `compilerOptions`. Questo è l'unico cambiamento necessario a `tsconfig.json`.

**Alternativa scartata:** usare `/// <reference types="@testing-library/jest-dom" />` in `setup.ts`. Funzionerebbe per il file di setup ma non garantisce che i matcher siano riconosciuti come tipi validi in tutti i file di test. La soluzione via `compilerOptions.types` è più robusta.

---

## 9. Invarianza del codice esistente

Nessun file in `src/` viene modificato da P19. I file di test leggono il codice esistente tramite import, senza alterarne la struttura, la logica o la firma delle funzioni.

L'unica aggiunta è `src/test/setup.ts` e i 5 file `src/test/smoke/*.test.tsx`: sono file nuovi, non modifiche a file esistenti.

Nessun `data-testid` viene aggiunto ai componenti. I selettori usati nei test si basano su:
- Ruoli ARIA già presenti (`role="main"`, `role="dialog"`, `role="tab"`, `role="tabpanel"`, `role="button"`, `role="heading"`).
- `aria-label` già presenti nei componenti esistenti.
- Testo visibile già presente nell'UI (`"I Tuoi Conti"`, `"Movimenti Recenti"`, `"Tutti i Movimenti"`, etc.).

Questo rende i test resilienti rispetto a future modifiche al layout CSS e alle classi Tailwind, che non incidono sulla semantica ARIA.

La baseline lint post-P18 è di 56 warning, 0 errori. L'aggiunta dei file di test non modifica i file sorgente, quindi la baseline non dovrebbe degradare. È possibile che i file di test stessi introducano warning ESLint (ad esempio per pattern unused o per `any` impliciti), che devono essere mantenuti sotto controllo nella fase di coding.

---

## 10. Criteri di verifica / Definition of Done

Il passo P19 è completato quando **tutte** le seguenti condizioni sono verificate:

- [ ] `npm run test:run` termina con exit code 0 e output "5 passed" (o equivalente Vitest).
- [ ] Tutti e 5 i test passano nel loro ordine naturale (`01`, `02`, `03`, `04`, `05`).
- [ ] Tutti e 5 i test passano anche eseguiti in ordine inverso (per verificare l'assenza di dipendenze inter-test).
- [ ] `npm run build` termina con exit code 0 (nessuna regressione TypeScript).
- [ ] `npm run lint` mostra ≤56 warning, 0 errori (nessuna regressione lint rispetto alla baseline post-P18).
- [ ] I 5 test passano su una macchina che non ha mai eseguito l'app in precedenza (nessuna dipendenza da stato persistito: `useKV` è mockato e restituisce valori vuoti).
- [ ] Nessun test dipende dall'esecuzione di un altro test (ogni test file può essere eseguito in isolamento con `vitest run src/test/smoke/0N-nome.test.tsx`).
- [ ] I file `vitest.config.ts` e `src/test/setup.ts` esistono con il contenuto corretto.
- [ ] La sezione `devDependencies` di `package.json` contiene i 5-6 pacchetti di test elencati in §7.
- [ ] La sezione `scripts` di `package.json` contiene `"test"` e `"test:run"`.

---

## 11. Rischi e avvertenze

### Rischio 1 — Mock di `useKV` non corretto

**Gravità: alta.** Se il mock di `@github/spark/hooks` non è configurato correttamente o non viene applicato prima del caricamento dei moduli, **tutti i 5 test falliscono** con un errore del tipo:
- `Error: Cannot find module '@github/spark/hooks'` — il pacchetto Spark non è disponibile in ambiente Node.js.
- O un errore di hook fuori contesto se il modulo viene caricato ma non trova il runtime Spark.

**Come identificarlo:** l'errore appare nella fase di setup del test (prima ancora che il corpo del test esegua). Il messaggio di errore menziona `@github/spark` o `useKV`.

**Come risolverlo:** verificare che:
1. Il mock sia dichiarato in `src/test/setup.ts` tramite `vi.mock('@github/spark/hooks', ...)`.
2. Il percorso del modulo nel mock corrisponda esattamente all'import nei file sorgente (`@github/spark/hooks`, non `@github/spark` o altro).
3. Il file `src/test/setup.ts` sia elencato nella proprietà `setupFiles` di `vitest.config.ts`.

### Rischio 2 — Autenticazione PIN con doppio campo (setup mode)

**Gravità: media.** Il test 2 richiede la compilazione di due campi (PIN + conferma PIN). Dimenticare il secondo campo o non attendere il re-render asincrono dopo il submit sono errori comuni.

**Come identificarlo:** `handleGlobalPinSubmit` controlla `pin !== confirmPin` in setup mode (`PinDialog.tsx` riga ~48). Se il campo di conferma non viene compilato, la funzione restituisce un errore senza autenticare.

**Come risolverlo:** assicurarsi che il test compili entrambi i campi con lo stesso valore e che usi `await userEvent.click(button)` (asincrono) per il submit, attendendo poi con `findBy*` il re-render.

### Rischio 3 — `crypto.subtle` non disponibile

**Gravità: bassa.** La funzione `hashPin` (in `src/lib/crypto.ts`) usa `crypto.subtle.digest`. In Node.js 15+ (e in qualsiasi ambiente jsdom moderno), `crypto.subtle` è disponibile globalmente. Se si usa una versione Node.js < 15, la funzione fallisce.

**Come identificarlo:** errore `TypeError: Cannot read properties of undefined (reading 'digest')` o simile.

**Come risolverlo:** aggiornare Node.js (≥18 LTS raccomandato) o aggiungere un polyfill per `crypto.subtle` nel setup di Vitest.

### Rischio 4 — recharts e canvas API

**Gravità: bassa per P19.** `recharts` (dipendenza del progetto) usa internamente canvas per alcuni grafici. jsdom non implementa canvas. Se un test renderizza un componente che usa recharts, il test può emettere warning o errori relativi a `HTMLCanvasElement`.

**P19 non monta la tab Report**, quindi questo rischio non si materializza nei 5 smoke test. Tuttavia, se in futuro si aggiungono test che toccano `ReportsTab`, sarà necessario mockare canvas con `jest-canvas-mock` o una soluzione equivalente.

**Come identificarlo:** warning del tipo `"Not implemented: HTMLCanvasElement.prototype.getContext"` nell'output del test.

### Rischio 5 — Test 5 e isolamento del mock per `accounts`

**Gravità: media.** Il test 5 richiede che il mock di `useKV` restituisca un array di accounts non vuoto (con un account privato). Se il mock per `accounts` viene dichiarato a livello globale in `setup.ts`, tutti gli altri test ricevono dati non vuoti e potrebbero avere comportamenti diversi da quelli attesi.

**Soluzione:** il mock personalizzato per `accounts` deve essere dichiarato solo nel file `05-private-account.test.tsx`, usando `vi.mocked(useKV).mockImplementation(...)` con ripristino al termine del test (`afterEach(() => vi.restoreAllMocks())`). In alternativa, strutturare il mock globale in modo che accetti un parametro di configurazione per test.

### Rischio 6 — Dialog del PIN privato (DialogsOverlay)

**Gravità: bassa.** Il test 5 deve interagire con il dialogo del PIN privato, che è renderizzato da `DialogsOverlay` (un componente a parte, non `AuthScreen`). La struttura del form è la stessa di `PinDialog`, ma potrebbe aprirsi in un portale DOM diverso. Testing Library cerca elementi nell'intero documento (inclusi i portali), quindi i selettori `getByLabelText` e `getByRole` dovrebbero funzionare. Se si verificano problemi, usare `within(document.body).getBy*` per cercare nell'intero documento.

---

## 12. Cosa NON fare in questo passo

- **Non modificare nessun file esistente in `src/`** (componenti, hook, context, lib). I test leggono il codice esistente senza alterarlo.
- **Non aggiungere `data-testid`** ai componenti. I selettori basati su ruoli ARIA e testo visibile sono sufficienti per i 5 smoke test e non richiedono modifiche al codice di produzione.
- **Non configurare GitHub Actions CI.** L'integrazione dei test nel ciclo CI/CD è prevista in P21. P19 si limita a rendere i test eseguibili in locale.
- **Non scrivere test unitari per le funzioni di `src/lib/`** (es. `hashPin`, `formatCurrency`, `getBudgetProgress`). I smoke test verificano comportamento integrato a livello di UI; i test unitari per la logica pura sono un passo separato, fuori dal perimetro di P19.
- **Non superare i 5 test definiti.** La copertura si estende in passi futuri. Aggiungere più test in P19 aumenterebbe il rischio di superare la DefinitionOfDone senza completare il set definito.
- **Non includere `sparkPlugin` e `tailwindcss` in `vitest.config.ts`.** Il plugin Spark richiede il runtime Spark, non disponibile in ambiente di test. Tailwind non è necessario per verificare la semantica DOM.
- **Non modificare `vite.config.ts`.** Rimane invariato.
- **Non mockare `src/lib/crypto.ts`.** La funzione `hashPin` usa `crypto.subtle` disponibile in Node.js; non ha bisogno di mock. Mockare crypto renderebbe il test 2 meno realistico.
- **Non usare `waitFor` con timeout elevati** per compensare problemi di mock. Se un elemento non appare entro il timeout di default di Testing Library (1000 ms), il problema è nella configurazione del mock o nel rendering, non nella velocità del test.
