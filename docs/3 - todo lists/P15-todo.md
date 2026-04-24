# P15 — Todo List: Ripristino ESLint e configurazione accessibilità automatica

> Checklist operativa sequenziale per il Pacchetto 15 — Ripristino gate di qualità ESLint.  
> Coding Plan di riferimento: `docs/2 - coding plans/P15-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P15-eslint-setup-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [x] Leggere `docs/2 - coding plans/P15-coding-plan.md` per intero
- [x] ⚠️ **Questo passo NON modifica nessun file sotto `src/`** — solo tooling (un file di configurazione in root, una dipendenza)
- [x] ⚠️ **Nessuna verifica TypeScript richiesta** per modifiche a `src/` — il passo non tocca codice applicativo
- [x] ⚠️ **`.github/` è protetto** — non aprire, non modificare nulla sotto `.github/`
- [x] Verificare di essere sul branch `refactoring-architettura`
  ```
  git branch --show-current
  ```
  Atteso: `refactoring-architettura`
- [x] Eseguire `git status` per confermare lo stato iniziale del repository
- [x] ⚠️ **Baseline del punto di partenza**: eseguire `npm run lint` prima di iniziare per confermare il fallimento attuale
  ```
  npm run lint
  ```
  Atteso: errore immediato ("No eslint configuration file found" o simile) — conferma che il problema da risolvere è reale
- [x] Prendere nota delle ambiguità verificate nel coding plan:
  - [x] **AI1**: versione da installare è `6.10.2` (ultima stabile, supporta flat config)
  - [x] **AI2**: tutti i plugin ESLint già presenti (`eslint@9.28.0`, `typescript-eslint@8.x`, `react-hooks`, `react-refresh`, `@eslint/js`, `globals@16`); `eslint-plugin-jsx-a11y` assente; `"type": "module"` presente
  - [x] **AI3**: nessun file `.eslintrc.*` o `.eslintignore` presente — punto di partenza pulito
  - [x] **AI4**: script `"lint": "eslint ."` confermato, nessun flag extra
  - [x] **AI5**: Layer 0 con `ignores: ['dist/', 'node_modules/']` necessario — `dist/` non è escluso automaticamente da ESLint 9
  - [x] **AI6**: i due `<div onClick>` in `DashboardTab.tsx` (riga 327) e `TransactionsTab.tsx` (riga 119) produrranno i primi avvisi di jsx-a11y — segnalazioni corrette, non falsi positivi; non correggere in questo passo
- [x] Prendere nota dei rischi critici 🔴:
  - [x] **R1**: se il Layer 2 (`typescript-eslint`) non trova `tsconfig.json`, il lint fallisce con "Parsing error" — verificare nella Sotto-operazione 4 prima di concludere
  - [x] **R2**: se il log lint è dominato da centinaia di avvisi di un'unica regola, abbassare quella regola a `off` con commento TODO; mai disabilitare globalmente senza documentazione
  - [x] **R3**: `git status` finale non deve mostrare nessun file sotto `src/` come modificato

---

## Passo unico — Sotto-operazione 1: Installazione di `eslint-plugin-jsx-a11y`

> **⚠️ Pin esatto di versione**: usare `@6.10.2` senza caret `^` come prescritto dal design §3.7.  
> **⚠️ Solo questo pacchetto**: non installare `eslint-plugin-react` o altri plugin non previsti.

- [x] Installare il plugin con il comando esatto:
  ```
  npm install --save-dev eslint-plugin-jsx-a11y@6.10.2
  ```
- [x] Verificare che `package.json` riporti `"eslint-plugin-jsx-a11y": "6.10.2"` in `devDependencies` (senza caret)
- [x] Verificare che la cartella `node_modules/eslint-plugin-jsx-a11y/` esista

### Verifica intermedia 1

- [x] `package.json` → `devDependencies` contiene `eslint-plugin-jsx-a11y@6.10.2`
- [x] `node_modules/eslint-plugin-jsx-a11y/` esiste
- [x] `git status` mostra `package.json` e `package-lock.json` come modificati; nessun file sotto `src/`

---

## Passo unico — Sotto-operazione 2: Ricognizione pre-operativa

> **Eseguire dopo l'installazione, prima di creare `eslint.config.js`.**

- [x] Verificare branch:
  ```
  git branch --show-current
  ```
  Atteso: `refactoring-architettura`
- [x] Verificare `git status` → solo `package.json` e `package-lock.json` come modificati
- [x] ⚠️ Confermare assenza di file `.eslintrc.*` residui:
  ```
  Get-ChildItem -File | Where-Object { $_.Name -match "^\.eslintrc" -or $_.Name -eq ".eslintignore" }
  ```
  Atteso: nessun output
- [x] Confermare script `lint`:
  ```
  (Get-Content package.json | ConvertFrom-Json).scripts.lint
  ```
  Atteso: `eslint .`
- [x] Confermare `"type": "module"`:
  ```
  (Get-Content package.json | ConvertFrom-Json).type
  ```
  Atteso: `module`
- [x] Confermare che `eslint.config.js` non esiste ancora:
  ```
  Test-Path eslint.config.js
  ```
  Atteso: `False`

### Verifica intermedia 2

- [x] Branch `refactoring-architettura` confermato
- [x] Nessun file `.eslintrc.*` presente
- [x] Script `lint` = `eslint .` confermato
- [x] `"type": "module"` confermato
- [x] `eslint.config.js` ancora assente

---

## Passo unico — Sotto-operazione 3: Creazione di `eslint.config.js`

> ⚠️ **Formato ESModule obbligatorio**: `package.json` ha `"type": "module"` — usare `export default [...]`. Non usare `module.exports`.  
> ⚠️ **Solo flat config**: non creare file `.eslintrc.js`, `.eslintrc.json`, `.eslintignore`, `.eslintrc.cjs` di nessun tipo.  
> ⚠️ **5 layer nell'ordine prescritto**: Layer 0 → Layer 1 → Layer 2 → Layer 3 → Layer 4 → Layer 5.

### 3.1 — Layer 0: Ignores globali

- [x] Il primo oggetto dell'array dichiara `ignores: ['dist/', 'node_modules/']`
- [x] ⚠️ AI5 confermato: senza questo layer, ESLint analizza `dist/` producendo segnalazioni sul codice compilato

### 3.2 — Layer 1: `@eslint/js` recommended

- [x] Importare `js` da `@eslint/js`
- [x] Importare `globals` da `globals`
- [x] Applicare `js.configs.recommended` come spread
- [x] `files: ['**/*.{js,ts,tsx}']`
- [x] `languageOptions.globals` include `globals.browser` e `globals.es2020`

### 3.3 — Layer 2: `typescript-eslint` recommended

- [x] Importare `tseslint` da `typescript-eslint`
- [x] Applicare `tseslint.configs.recommended` come spread (o tramite `tseslint.config(...)`)
- [x] `files: ['src/**/*.{ts,tsx}']`
- [x] ⚠️ Includere `parserOptions.project: './tsconfig.json'` e `tsconfigRootDir: import.meta.dirname` per abilitare le regole con type information
- [x] ⚠️ R1: la configurazione corretta del parser è il punto più critico di questo layer — verificare nella Sotto-operazione 4

### 3.4 — Layer 3: `eslint-plugin-react-hooks` recommended

- [x] Importare `reactHooks` da `eslint-plugin-react-hooks`
- [x] `files: ['src/**/*.{ts,tsx}']`
- [x] Aggiungere il plugin sotto la chiave `react-hooks`
- [x] Regola `react-hooks/rules-of-hooks`: **`'warn'`** (Fase A)
- [x] Regola `react-hooks/exhaustive-deps`: **`'warn'`** (Fase A)

### 3.5 — Layer 4: `eslint-plugin-react-refresh`

- [x] Importare `reactRefresh` da `eslint-plugin-react-refresh`
- [x] `files: ['src/**/*.{ts,tsx}']`
- [x] Aggiungere il plugin sotto la chiave `react-refresh`
- [x] Regola `react-refresh/only-export-components`: **`['warn', { allowConstantExport: true }]`** (Fase A)

### 3.6 — Layer 5: `eslint-plugin-jsx-a11y` recommended

- [x] Importare `jsxA11y` da `eslint-plugin-jsx-a11y`
- [x] Usare `jsxA11y.flatConfigs.recommended` (non `jsxA11y.configs.recommended` — quest'ultimo è il vecchio formato pre-flat)
- [x] `files: ['src/**/*.{ts,tsx}']`
- [x] ⚠️ **Fase A**: tutte le regole del preset recommended devono essere in livello `warn`, non `error` — sovrascrivere il livello di tutte le regole del preset
- [x] AI6 confermato: le segnalazioni attese su `DashboardTab.tsx` e `TransactionsTab.tsx` sono corrette — non applicare `eslint-disable` in questo passo

### Verifica intermedia 3

- [x] `eslint.config.js` esiste nella root del progetto
- [x] Il file usa `export default [...]` (non `module.exports`)
- [x] Il file contiene almeno 6 oggetti nell'array (Layer 0 + Layer 1 + spread Layer 2 + Layer 3 + Layer 4 + Layer 5)
- [x] Nessun file `.eslintrc.*` di nessun tipo è presente nella root

---

## Passo unico — Sotto-operazione 4: Verifica funzionale

> ⚠️ **Gate del passo**: se `npm run lint` produce errori di configurazione, il passo non è completato. Correggere prima di procedere.

### 4.1 — Esecuzione `npm run lint`

- [x] Eseguire:
  ```
  npm run lint
  ```
- [x] ⚠️ Verificare che il processo si avvii (non "Cannot find module", non "invalid config")
- [x] ⚠️ R1: verificare che non ci siano "Parsing error: Cannot read file" o "tsconfig.json not found" → se presenti, correggere il percorso `project` nel Layer 2 prima di procedere
- [x] Verificare exit code = 0 (nessun errore bloccante):
  ```
  $LASTEXITCODE
  ```
  Atteso: `0`
- [x] Se exit code ≠ 0 per regole in modalità `error`: identificare la regola e abbassarla a `warn` nel layer corrispondente, poi rieseguire
- [x] ⚠️ R2: se il log mostra centinaia di avvisi dominati da una singola regola → abbassare quella regola a `off` con commento `// TODO P15-fase-B: rielaborare` nel file; documentare nella sezione Baseline del coding plan

### 4.2 — Documentazione baseline avvisi

- [x] ⚠️ **Documentare il conteggio degli avvisi** (almeno per regola) nella sezione "Baseline avvisi ESLint" del coding plan `docs/2 - coding plans/P15-coding-plan.md`
- [x] Il conteggio può essere approssimativo — non lasciarlo implicito (design §5.1 e §6)
- [x] Annotare in particolare:
  - [x] Avvisi `jsx-a11y/click-events-have-key-events` (attesi su `DashboardTab.tsx` e `TransactionsTab.tsx`)
  - [x] Avvisi `jsx-a11y/no-noninteractive-element-interactions` (stessi file)
  - [x] Avvisi `react-hooks/exhaustive-deps` (`App.tsx` e altri)

### 4.3 — Verifica `npm run build`

- [x] Eseguire:
  ```
  npm run build
  ```
  Atteso: build verde, come prima del passo. La creazione di `eslint.config.js` non deve influire sulla build Vite.

### 4.4 — Verifica `git status` finale

- [x] Eseguire:
  ```
  git status
  ```
- [x] ⚠️ R3: verificare che **nessun file sotto `src/`** appaia come modificato
- [x] I soli file attesi come nuovi/modificati:
  - `eslint.config.js` → `new file`
  - `package.json` → `modified`
  - `package-lock.json` → `modified`

---

## Verifica finale

### File e dipendenze

- [x] `eslint-plugin-jsx-a11y` presente in `devDependencies` di `package.json` alla versione `6.10.2`
- [x] `eslint.config.js` esiste nella root del progetto
- [x] `eslint.config.js` usa `export default [...]` (formato ESModule)
- [x] `eslint.config.js` contiene i 5 layer: ignores, `@eslint/js`, `typescript-eslint`, `react-hooks`, `react-refresh`, `jsx-a11y`

### Funzionalità

- [x] `npm run lint` si avvia senza errori di configurazione
- [x] `npm run lint` termina con exit code 0 (Fase A: solo warn, nessun errore bloccante)
- [x] Il conteggio degli avvisi baseline è documentato nel coding plan
- [x] `npm run build` passa

### Integrità repository

- [x] Nessun file sotto `src/` è stato modificato
- [x] `git status` mostra solo i 3 file attesi: `eslint.config.js` (new), `package.json` (modified), `package-lock.json` (modified)
- [x] Nessun file `.eslintrc.*` di nessun tipo presente nel repository

---

> **Nota finale**: i warning ESLint emersi (in particolare i due `<div onClick>` nelle tab di navigazione) sono segnalazioni corrette che documentano il bug §2 del report diagnostico. Non vanno corretti in questo passo. Vederli è il risultato atteso della Fase A. La Fase B — promozione a `error` graduale e correzione dei warning — appartiene a passi futuri dedicati.

***

**Completato il 2026-04-24.**
**Gate di qualità ESLint ripristinato — Fase A attiva.**
