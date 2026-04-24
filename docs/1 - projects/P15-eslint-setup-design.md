# P15 — Ripristino ESLint e configurazione accessibilità automatica

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 15  
> Data: 24 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Al termine del Passo 14, la root directory è pulita e la documentazione è organizzata. Rimane aperto il problema classificato nel report diagnostico post-P13 (`docs/4 - reports/Diagnostic-Analysis-Post-P13.md`, §3.1 e §7 priorità 1) come **"BLOCCANTE per qualità"**: `npm run lint` fallisce immediatamente perché manca il file di configurazione `eslint.config.js`.

Tutte le librerie ESLint sono già installate nei `devDependencies` — `eslint@9`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@eslint/js`, `globals` — ma senza un file di configurazione ESLint non sa quali regole applicare né su quali file operare. Il processo si interrompe all'avvio.

**Cosa si ottiene con questo passo:**

- `npm run lint` torna a funzionare, ristabilendo il gate di qualità del codice.
- Le regole `react-hooks/exhaustive-deps` tornano attive, rendendo visibili eventuali effetti con dipendenze incomplete (problema già evidenziato in §3.1 del report).
- Viene introdotto il controllo automatico di accessibilità tramite `eslint-plugin-jsx-a11y`: ogni futuro commit può essere verificato automaticamente per assenza di elementi interattivi privi di etichetta, immagini senza `alt`, form senza label associata, e altri problemi rilevabili staticamente.
- Si formalizza una strategia graduale che non blocca lo sviluppo in corso: il codice esistente può avere segnalazioni pregresse, e queste devono essere visibili come avvisi ma non impedire il lavoro.

**Perché aggiungere jsx-a11y contestualmente:**  
Il plugin di accessibilità fa parte dello stesso dominio di `eslint.config.js`. Aggiungere la configurazione ESLint senza il controllo di accessibilità richiederebbe un secondo passo minimale a breve distanza. Zecchino ha una documentazione di accessibilità estesa (`docs/accessibility/`) e ha già investito in screen reader, TalkBack, haptic feedback: avere un gate automatico è coerente con quella priorità.

**Il comportamento dell'app rimane invariato**: questo passo tocca esclusivamente la configurazione dello strumento di linting, non il codice sotto `src/`.

---

## 2. Perimetro della modifica

### 2.1 File da creare

| File | Posizione | Descrizione |
|---|---|---|
| `eslint.config.js` | root del progetto | Configurazione ESLint in formato flat config (standard ESLint 9) |

### 2.2 Dipendenza da aggiungere

| Pacchetto | Tipo | Note |
|---|---|---|
| `eslint-plugin-jsx-a11y` | `devDependency` | Plugin per controllo automatico accessibilità JSX. Non ancora presente in `package.json`. Va installato prima della creazione di `eslint.config.js`. Vedere §3.6 per la nota sulla versione. |

### 2.3 File modificati indirettamente

| File | Modifica | Note |
|---|---|---|
| `package.json` | aggiunta dipendenza `eslint-plugin-jsx-a11y` in `devDependencies` | Effetto dell'installazione tramite package manager |
| `package-lock.json` | aggiornamento automatico | Effetto dell'installazione tramite package manager |

### 2.4 File non toccati

| File / Area | Categoria |
|---|---|
| Tutto `src/` | Codice applicativo — invariato |
| `vite.config.ts` | Configurazione tool |
| `tsconfig.json` | Configurazione TypeScript |
| `tailwind.config.js` | Configurazione stili |
| `package.json` — sezione `scripts` | Invariata: `"lint": "eslint ."` resta così com'è |
| `README.md`, `CHANGELOG.md` | Documentazione di progetto — non toccati in questo passo |
| `.github/` | Protetto da `framework-guard.instructions.md` |

---

## 3. Dettaglio delle operazioni

### 3.1 Il formato flat config di ESLint 9

ESLint 9 ha introdotto un nuovo sistema di configurazione chiamato **flat config**: invece del tradizionale `.eslintrc.js` (o `.eslintrc.json`), la configurazione risiede in `eslint.config.js` nella root del progetto ed esporta un array di oggetti di configurazione. Ogni oggetto nell'array può specificare i file a cui si applica, le variabili globali, il parser, i plugin e le regole. Gli oggetti si sovrappongono in ordine: quelli più tardi nell'array hanno precedenza su quelli precedenti.

Questa è la ragione per cui `npm run lint` fallisce oggi: `package.json` dichiara `"lint": "eslint ."`, che istruisce ESLint a coprire l'intera directory, ma ESLint 9 non trova `eslint.config.js` e si interrompe prima di cercare file da analizzare.

Il file da creare seguirà il formato flat config. Non verrà creato nessun file `.eslintrc.*` di nessun tipo.

### 3.2 Layer 1 — Regole JavaScript di base (`@eslint/js`)

`@eslint/js` è il pacchetto ufficiale ESLint che raccoglie le regole fondamentali per il linguaggio JavaScript. Nel flat config si usa la configurazione `js.configs.recommended`, che attiva un insieme consolidato di regole che rilevano problemi comuni: variabili usate prima di essere dichiarate, confronti incoerenti, uso di `eval`, costrutti sintatticamente ambigui, e simili.

Queste regole si applicano a tutto il progetto (`src/**`) come strato base. Sono regole mature e stabili: non sono sorgente di falsi positivi frequenti su codice moderno. Su Zecchino, che usa ESModule e TypeScript, molti controlli di questo layer vengono già gestiti dal compilatore TypeScript; il layer JS rimane utile per i file di configurazione JavaScript puri (come `vite.config.ts`, `tailwind.config.js`) e come garanzia di secondo livello.

### 3.3 Layer 2 — Regole TypeScript (`typescript-eslint`)

`typescript-eslint` estende ESLint con la comprensione del sistema di tipi TypeScript. Nel flat config si usa `tseslint.configs.recommended`, che è la configurazione raccomandata per l'uso quotidiano: include regole che segnalano `any` implicito, parametri di tipo errati, override non corretti, asserzioni di tipo inutili e simili.

Esiste una variante più severa, `tseslint.configs.strict`, che aggiunge regole aggiuntive come il divieto esplicito di `any` anche esplicito, o il divieto di asserzioni non-null. Questa variante non viene attivata in questo passo: il codice esistente di Zecchino è stato scritto senza un gate lint attivo e potrebbe contenere pattern che violano le regole strict. Attivare quella variante come errore bloccante potrebbe rendere il lint inutilizzabile da subito (vedi §4 sulla strategia di adozione).

`typescript-eslint` richiede che le opzioni del parser includano il riferimento al `tsconfig.json` di progetto: in questo modo le regole che necessitano informazioni di tipo (come `no-floating-promises` o `await-thenable`) possono accedere all'albero di tipo reale durante l'analisi.

### 3.4 Layer 3 — Regole React Hooks (`eslint-plugin-react-hooks`)

`eslint-plugin-react-hooks` controlla il corretto utilizzo delle regole dei React Hooks:

- **`react-hooks/rules-of-hooks`** — verifica che i hook siano chiamati solo in funzioni React e non dentro cicli, condizioni o funzioni nidificate.
- **`react-hooks/exhaustive-deps`** — verifica che i `useEffect`, `useCallback`, `useMemo` e hook simili dichiarino nell'array di dipendenze tutte le variabili usate nel body.

La seconda regola è quella più rilevante per Zecchino. Il report diagnostico (§3.1) cita esplicitamente che la mancanza di lint ha reso invisibili effetti con dipendenze incomplete, come l'`useEffect` in `App.tsx` che dichiara `screenReader` nell'array di dipendenze ma l'oggetto viene ricreato ad ogni render. Con il plugin attivo, questi pattern diventano segnalazioni visibili.

La configurazione raccomandata di questo plugin (`react-hooks/recommended`) attiva entrambe le regole come **warning** (avviso non bloccante). Questa è la scelta corretta per questo passo: le violazioni già presenti nel codice esistente diventano visibili senza bloccare il processo.

### 3.5 Layer 4 — Regole React Refresh (`eslint-plugin-react-refresh`)

`eslint-plugin-react-refresh` controlla che i componenti React vengano esportati in un modo compatibile con l'Hot Module Replacement di Vite. La regola principale è `react-refresh/only-export-components`: segnala i file che esportano sia componenti React sia valori non-componente, perché questo pattern causa il refresh dell'intera pagina invece del solo componente in fase di sviluppo.

Su Zecchino questo plugin è di utilità operativa durante lo sviluppo ma non ha impatto sulla qualità del codice in produzione. Viene attivato con la configurazione raccomandata del plugin, che include l'opzione `allowConstantExport: true` per gestire il pattern comune dove i file esportano costanti accanto ai componenti.

### 3.6 Layer 5 — Regole accessibilità (`eslint-plugin-jsx-a11y`)

`eslint-plugin-jsx-a11y` è il plugin standard de facto per il controllo statico dell'accessibilità in React. Analizza il JSX e segnala pattern che possono rendere l'interfaccia non utilizzabile da chi usa tecnologie assistive come screen reader (TalkBack su Android, VoiceOver su iOS e macOS).

**Cosa controlla:**

- **Immagini senza testo alternativo** (`alt-text`): ogni `<img>` deve avere un attributo `alt`. Le immagini decorative richiedono `alt=""` esplicito per comunicare agli screen reader di ignorarle.
- **Elementi interattivi privi di etichetta accessibile** (`interactive-supports-focus`, `label-has-associated-control`): bottoni, input, link e altri controlli devono avere un nome accessibile (testo visibile, `aria-label` o `aria-labelledby`).
- **Uso corretto di `role`** (`aria-roles`, `no-redundant-roles`): i valori ARIA attribuiti agli elementi devono essere valori di ruolo validi; i ruoli ridondanti (come `role="button"` su un `<button>`) vengono segnalati.
- **Attributi ARIA obbligatori per ruolo** (`aria-required-attrs`, `aria-proptypes`): un elemento con `role="checkbox"` deve avere `aria-checked`; i valori degli attributi ARIA devono essere del tipo corretto.
- **Elementi non interattivi con gestori di evento** (`no-noninteractive-element-interactions`, `click-events-have-key-events`): un `<div>` con `onClick` dovrebbe avere `role` e gestori da tastiera per essere utilizzabile senza mouse.
- **Navigabilità da tastiera** (`interactive-supports-focus`): gli elementi interattivi devono essere raggiungibili via tastiera (`tabIndex` appropriato).
- **Struttura heading** (`heading-has-content`): i tag `<h1>`–`<h6>` devono avere contenuto testuale.

**In relazione agli screen reader TalkBack e VoiceOver:**  
TalkBack (Android) e VoiceOver (iOS/macOS) leggono l'albero di accessibilità del DOM — che riflette attributi `role`, `aria-label`, `aria-labelledby`, `alt` e struttura semantica. `jsx-a11y` intercetta precisamente i problemi che causano buchi in quell'albero: un bottone senza etichetta viene letto da VoiceOver come "bottone" senza nome, rendendo impossibile capirne la funzione. Un'immagine informativa senza `alt` viene ignorata da TalkBack, perdendo informazione.

**Cosa NON copre (limiti intrinseci dell'analisi statica):**  
Il plugin non può rilevare i problemi dinamici di runtime. Il bug documentato in §2 del report — la navigazione con frecce che non sposta il focus DOM — non è rilevabile da jsx-a11y: il plugin vede JSX statico, non la sequenza di aggiornamenti di stato durante l'interazione. Allo stesso modo, `aria-activedescendant` mancante su un container lista non è rilevabile se il container è strutturalmente valido ma manca semantica dinamica. I test manuali con TalkBack/VoiceOver restano indispensabili per i problemi di navigazione e annuncio dinamico.

**Relazione con i componenti Radix UI:**  
Zecchino usa estensivamente i componenti Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-select`, etc.). Radix gestisce internamente gli attributi ARIA richiesti dai rispettivi ruoli: `role`, `aria-expanded`, `aria-controls`, `aria-selected`, `aria-haspopup` vengono iniettati automaticamente dal runtime Radix. Il plugin jsx-a11y analizza il JSX sorgente, non il DOM risultante: vede `<Dialog.Trigger>` come un componente opaco, non come un `<button>` con `role="button"` e `aria-haspopup="dialog"`. Questo significa che, in generale, **i componenti Radix non generano falsi positivi** da jsx-a11y — il plugin semplicemente non li espande. Falsi positivi potrebbero però emergere sui wrapper personalizzati attorno ai componenti Radix se quei wrapper usano `<div>` o `<span>` con gestori di click senza esporre un ruolo esplicito. Vedi §6.1 per la gestione di questa casistica.

### 3.7 Versione di `eslint-plugin-jsx-a11y` compatibile con ESLint 9

**Nota per chi esegue questo passo**: al momento della stesura di questo documento, la versione corrente stabile di `eslint-plugin-jsx-a11y` è nella serie 6.x (specificamente 6.10.x). Il plugin ha introdotto il supporto al formato flat config di ESLint 9 tramite la proprietà `flatConfigs` a partire dalla versione 6.8.0. Prima di installare, eseguire `npm info eslint-plugin-jsx-a11y versions` per verificare l'ultima versione compatibile con ESLint 9 e `globals@16`. Installare sempre la versione più recente nella serie 6.x disponibile al momento dell'esecuzione, con pin esatto (senza caret `^`) nella prima installazione, da aggiornare a `^` solo dopo aver verificato che non produca segnalazioni inattese.

---

## 4. Strategia di adozione delle regole

ESLint era assente dal progetto da tempo. Il codice di Zecchino è stato scritto e mantenuto senza un gate lint attivo. Attivare tutte le regole come **errori bloccanti** immediatamente potrebbe:

1. Produrre decine di segnalazioni sul codice esistente che bloccano `npm run lint` anche dopo la configurazione.
2. Rendere impossibile usare lint come gate per le modifiche future finché tutto il codice pregresso non è stato corretto.
3. Dare la falsa impressione che il progetto sia in cattivo stato anche per aspetti non critici.

La strategia proposta è **graduale e bifasica**:

### Fase A — Configurazione iniziale (questo passo, P15)

In questa fase, le regole vengono attivate al livello minimo che consente a `npm run lint` di girare senza produrre errori bloccanti sul codice esistente:

| Fonte | Configurazione applicata | Livello |
|---|---|---|
| `@eslint/js` | `recommended` | come da preset (error/warn) |
| `typescript-eslint` | `recommended` | come da preset (warn per la maggior parte) |
| `react-hooks` | `recommended` (entrambe le regole) | **warn** |
| `react-refresh` | `only-export-components` con `allowConstantExport: true` | **warn** |
| `jsx-a11y` | `recommended` | **warn** |

L'obiettivo della Fase A è che `npm run lint` si completi senza errori di exit code 1. Le segnalazioni appaiono come avvisi nel terminale ma non rompono il processo. Questo permette di usare lint come punto di riferimento senza interrompere il lavoro.

Se la configurazione `recommended` di `typescript-eslint` o `jsx-a11y` produce ancora errori bloccanti su codice esistente nonostante il livello `warn`, si può applicare un override mirato su file specifici usando la proprietà `ignores` del flat config, documentando il motivo come commento in linea. Non si disabilitano regole globalmente: si ignorano file specifici temporaneamente.

### Fase B — Rafforzamento progressivo (passi futuri)

Una volta che `npm run lint` gira verde in Fase A, il rafforzamento avviene in ordine di criticità:

1. `react-hooks/exhaustive-deps` → promosso a **error** per i nuovi file (le dipendenze mancanti negli hook sono bug reali, non solo stile).
2. `jsx-a11y/alt-text`, `jsx-a11y/label-has-associated-control` → promossi a **error** per i nuovi file.
3. `typescript-eslint/no-explicit-any` → **warn** globale, poi **error** graduale per modulo.
4. Eventuali regole strict di `typescript-eslint` valutate una per una.

Il Passo 15 non include la Fase B. La Fase B sarà oggetto di un passo successivo dedicato, quando si avrà visibilità completa sul numero di segnalazioni prodotte dalla Fase A.

---

## 5. Aggiornamenti consequenziali

### 5.1 Verifica post-configurazione

Dopo la creazione di `eslint.config.js` e l'installazione di `eslint-plugin-jsx-a11y`, si esegue `npm run lint` per verificare:

1. Che il processo si avvii senza errori di configurazione (ad esempio: plugin non trovato, opzione non valida, parser mancante).
2. Che l'exit code sia 0 (o che eventuali uscite con codice diverso da 0 siano dovute solo a regole in modalità `error`, non a errori di configurazione).
3. Che il numero di avvisi prodotti sia documentato come baseline per la Fase B.

Se `npm run lint` produce errori bloccanti su file esistenti nonostante la strategia `warn` della Fase A, procedere con l'override per file prima di concludere il passo (vedi §4).

### 5.2 Nessun aggiornamento a `README.md` o `CHANGELOG.md` in questo passo

La configurazione ESLint è un'operazione interna di tooling. Non richiede aggiornamenti alla documentazione utente in questo passo. Il `CHANGELOG.md` verrà aggiornato al termine del passo con voce nella sezione `[Unreleased]`.

---

## 6. Criteri di verifica / Definition of Done

- [ ] `eslint-plugin-jsx-a11y` è presente in `devDependencies` di `package.json`
- [ ] `eslint.config.js` esiste nella root del progetto
- [ ] `eslint.config.js` usa il formato flat config (array di oggetti esportato come default, nessun `module.exports`)
- [ ] `eslint.config.js` include i cinque layer descritti in §3: `@eslint/js`, `typescript-eslint`, `react-hooks`, `react-refresh`, `jsx-a11y`
- [ ] `npm run lint` si avvia senza errori di configurazione (non "cannot find module", non "invalid config")
- [ ] `npm run lint` termina con exit code 0 (nessun errore bloccante sul codice esistente)
- [ ] Il numero di avvisi prodotti è stato documentato (anche brevemente, come nota nel commit o in questo documento aggiornato)
- [ ] Nessun file sotto `src/` è stato modificato
- [ ] Nessun file di configurazione esistente (eccetto `package.json` e `package-lock.json`) è stato modificato
- [ ] `npm run build` continua a passare dopo le modifiche
- [ ] `git status` non mostra file modificati inattesi

---

## 7. Rischi e avvertenze

### 7.1 Falsi positivi da `jsx-a11y` su componenti Radix UI

Come descritto in §3.6, i componenti Radix UI come `<Dialog>`, `<Select>`, `<Tabs>`, `<DropdownMenu>` gestiscono internamente gli attributi ARIA e il plugin li vede come componenti opachi. In questo scenario il rischio di falsi positivi è basso: jsx-a11y non espande i componenti di libreria.

Il rischio reale riguarda i **componenti wrapper personalizzati** che avvolgono Radix. Se in `src/components/` esistono wrapper che espongono un `<div>` con `onClick` (come delegato verso il Radix trigger interno), jsx-a11y potrebbe segnalare l'assenza di `role` o `onKeyDown` sul `<div>`. In quel caso, l'azione corretta non è disabilitare la regola ma valutare se il `<div>` andrebbe sostituito con un `<button>` o se va aggiunto `role="button"` con gestori di tastiera appropriati.

Se durante la Fase A emergono falsi positivi strutturali irrisolvibili (es. pattern architetturali di Radix non riconoscibili staticamente), si usa `// eslint-disable-next-line jsx-a11y/<regola>` con commento motivazionale inline, non la disabilitazione globale della regola.

### 7.2 Regole TypeScript che rivelano problemi latenti

`typescript-eslint` recommended include regole come `@typescript-eslint/no-unused-vars` (variabili dichiarate ma non usate) e `@typescript-eslint/no-explicit-any`. Il report diagnostico (§3.6) nota già variabili destrutturate non usate in `DashboardTab.tsx`. Con il lint attivo, queste variabili diventano segnalazioni visibili.

Nella Fase A, queste regole sono in modalità `warn`, quindi non bloccano. Tuttavia, se il numero di segnalazioni è elevato, potrebbe essere utile affrontarle nel medesimo commit (o subito dopo) per non accumulare debito tecnico nel tracker degli avvisi lint.

### 7.3 `exhaustive-deps` su hook con oggetti instabili

Il report (§3.4) identifica che `screenReader` in `App.tsx` è un oggetto ricreato ad ogni render incluso nell'array di dipendenze di un `useEffect`. Con `react-hooks/exhaustive-deps` in modalità `warn`, questa segnalazione diventa visibile. Non è un falso positivo: è un bug reale. Il Passo 15 lo espone; risolverlo appartiene a un passo successivo dedicato agli hook.

### 7.4 Troppe segnalazioni che rendono il log lint inutilizzabile

Se il primo `npm run lint` produce centinaia di avvisi, il log diventa difficile da leggere e la sua utilità pratica diminuisce. In quel caso la strategia è:

1. Filtrare le segnalazioni per regola: `npm run lint -- --format json | node -e "..."` o usare un reporter alternativo.
2. Identificare se una singola regola è responsabile della maggior parte delle segnalazioni.
3. Decidere se abbassare temporaneamente quella regola da `warn` a `off` con un commento TODO fino a un passo dedicato di correzione.

Non si abbassa il livello di una regola in modo permanente senza documentazione esplicita del motivo.

---

## 8. Cosa NON fare in questo passo

- **Non modificare nessun file sotto `src/`**: il perimetro è la sola configurazione ESLint.
- **Non correggere i warning ESLint** emersi sul codice esistente: vederli è l'obiettivo della Fase A, correggerli appartiene a passi successivi.
- **Non attivare regole `strict` di `typescript-eslint`**: aumentano il rischio di segnalazioni bloccanti sul codice pregresso. Appartengono alla Fase B.
- **Non usare il formato `.eslintrc.js`** o `.eslintrc.json`: ESLint 9 usa il flat config come standard; usare il vecchio formato richiederebbe l'opzione `--flag unstable_config_lookup_from_file` e creerebbe ambiguità.
- **Non installare librerie non citate in questo documento**: in particolare, non installare `eslint-plugin-react` separatamente — `eslint-plugin-react-hooks` è già sufficiente per questo stack con React 19 e TypeScript.
- **Non toccare `.github/`**: i file del framework SCF sono protetti da `framework-guard.instructions.md`.
- **Non aggiornare le regole di ESLint nei file `src/` con commenti `eslint-disable`** su larga scala: i commenti di disable devono essere puntuali e motivati, non usati per mascherare la visione della situazione reale.
- **Non modificare `tsconfig.json`**: la configurazione TypeScript esistente è compatibile con `typescript-eslint` senza modifiche.
- **Non creare file `eslint.config.mjs` o `eslint.config.cjs`**: il progetto usa `"type": "module"` in `package.json`, quindi `eslint.config.js` è già trattato come ESModule. Un file `.mjs` sarebbe ridondante.

---

## 9. Schema della configurazione finale

### Layer sovrapposti nel flat config

```
eslint.config.js
│
├── [Layer 0 — Ignores globali]
│   └── Esclude `dist/`, `node_modules/`, eventuali file generati
│       (senza questa esclusione ESLint analizza la cartella dist)
│
├── [Layer 1 — JavaScript di base]
│   │  Fonte: @eslint/js
│   │  Target: tutti i file JS/TS del progetto
│   └── Regole: js.configs.recommended
│       ├── no-unused-vars, no-undef, eqeqeq, no-eval, ...
│       └── Variabili globali browser + ES2020
│
├── [Layer 2 — TypeScript]
│   │  Fonte: typescript-eslint
│   │  Target: src/**/*.{ts,tsx}
│   └── Regole: tseslint.configs.recommended
│       ├── @typescript-eslint/no-explicit-any (warn)
│       ├── @typescript-eslint/no-unused-vars (warn)
│       ├── @typescript-eslint/no-empty-function (warn)
│       └── ... (tutte le recommended)
│
├── [Layer 3 — React Hooks]
│   │  Fonte: eslint-plugin-react-hooks
│   │  Target: src/**/*.{ts,tsx}
│   └── Regole: recommended (warn)
│       ├── react-hooks/rules-of-hooks → verifica che i hook siano chiamati
│       │   solo in cima a funzioni React (non in loop o condizioni)
│       └── react-hooks/exhaustive-deps → verifica che le dipendenze di
│           useEffect/useCallback/useMemo siano complete
│
├── [Layer 4 — React Refresh]
│   │  Fonte: eslint-plugin-react-refresh
│   │  Target: src/**/*.{ts,tsx}
│   └── Regole: only-export-components (warn, allowConstantExport: true)
│       └── Garantisce compatibilità con HMR di Vite durante lo sviluppo
│
└── [Layer 5 — Accessibilità JSX]
    │  Fonte: eslint-plugin-jsx-a11y
    │  Target: src/**/*.{ts,tsx}
    └── Regole: flatConfigs.recommended (warn per tutte)
        ├── alt-text → immagini con testo alternativo
        ├── label-has-associated-control → input con label associata
        ├── interactive-supports-focus → controlli interattivi raggiungibili
        ├── click-events-have-key-events → onClick accompagnato da onKeyDown/onKeyPress
        ├── no-noninteractive-element-interactions → div/span senza role non hanno onClick
        ├── aria-roles → valori role validi per ARIA
        ├── aria-required-attrs → attributi ARIA obbligatori per ruolo presenti
        └── ... (tutte le recommended del plugin)
```

### Copertura per tecnologia assistiva

```
jsx-a11y layer 5
│
├── TalkBack (Android) ← rileva: img senza alt, input senza label,
│                         bottoni senza nome, role non validi
│
├── VoiceOver (iOS / macOS) ← rileva: stessi pattern + attributi ARIA
│                              obbligatori mancanti per ruolo
│
└── Navigazione tastiera ← rileva: elementi cliccabili non raggiungibili
                            con Tab, click senza gestori tastiera
                            (ma NON il bug focus DOM delle frecce — §2
                            del report — che è un problema dinamico)
```

### Cosa rimane fuori dallo scope automatico

```
Problemi NON rilevabili da jsx-a11y:
│
├── Bug navigazione frecce (§2 report diagnostico)
│   └── Causa: focus DOM non spostato dopo cambio stato React
│              → rilevabile solo con test manuale o Playwright
│
├── aria-activedescendant mancante sulle liste
│   └── Causa: struttura dinamica non analizzabile staticamente
│
├── Annunci aria-live non emessi al momento giusto
│   └── Causa: timing dipendente dal runtime
│
└── Comportamento Radix UI nel DOM risultante
    └── jsx-a11y vede il JSX sorgente, non il DOM espanso da Radix
```

---

— Fine documento —
