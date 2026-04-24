# P15 — Coding Plan: Ripristino ESLint e configurazione accessibilità automatica

> Documento operativo. Nessun file di codice sorgente viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 15 — **Secondo passo post-refactoring** — ripristino gate di qualità  
> Design di riferimento: `docs/1 - projects/P15-eslint-setup-design.md`  
> Data: 24 aprile 2026

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P14.
- Questo passo è **esclusivamente di tooling**: nessun file sotto `src/` viene toccato. Il comportamento dell'app è completamente invariato.
- **Un solo file creato**: `eslint.config.js` nella root del progetto.
- **Una sola dipendenza aggiunta**: `eslint-plugin-jsx-a11y` in `devDependencies`.
- **File modificati indirettamente**: `package.json` e `package-lock.json` — effetto dell'installazione tramite package manager, non modificati a mano.
- **Strategia di adozione**: P15 implementa la **Fase A** del design §4 — tutte le regole in modalità `warn`, nessun errore bloccante sul codice esistente. La Fase B (promozione progressiva a `error`) appartiene a passi futuri dedicati.
- `.github/` è protetto da `framework-guard.instructions.md`: nessuna operazione di questo passo lo tocca.
- **Nota importante**: questo passo non corregge i warning ESLint emersi sul codice esistente. Vederli è l'obiettivo della Fase A; correggerli appartiene a passi futuri.

### File che restano invariati

| File / Area | Categoria |
|---|---|
| Tutto `src/` | Codice applicativo — non toccato |
| `vite.config.ts` | Configurazione tool |
| `tsconfig.json` | Configurazione TypeScript |
| `tailwind.config.js` | Configurazione stili |
| `package.json` — sezione `scripts` | Invariata: `"lint": "eslint ."` resta così com'è |
| `components.json`, `theme.json`, `index.html` | Configurazione tool |
| `runtime.config.json`, `spark.meta.json` | Configurazione Spark |
| `README.md`, `CHANGELOG.md`, `SECURITY.md`, `LICENSE` | Documentazione standard repo |
| `.github/` | Protetto da `framework-guard.instructions.md` |

### Tabella riepilogativa

| Operazione | File | Note |
|---|---|---|
| Creato | `eslint.config.js` | Flat config ESLint 9, 5 layer |
| Dipendenza aggiunta | `eslint-plugin-jsx-a11y@6.10.2` | `devDependency` — installata via npm |
| Modificato indirettamente | `package.json` | Solo `devDependencies` aggiornato dall'installazione |
| Modificato indirettamente | `package-lock.json` | Aggiornamento automatico dell'installazione |
| Modificati sotto `src/` | — | **0 file** |

---

## Ambiguità rilevate

Le seguenti ambiguità sono state **verificate sul repository reale** sul branch `refactoring-architettura` prima della stesura di questo piano.

---

### AI1 — Versione corretta di `eslint-plugin-jsx-a11y`

**Verifica eseguita**: `npm info eslint-plugin-jsx-a11y versions --json` e `npm info eslint-plugin-jsx-a11y dist-tags`.

**Risultato**:

- `dist-tags.latest` = **`6.10.2`**
- Versioni della serie 6.x con supporto flat config (`flatConfigs`): 6.8.0, 6.9.0, 6.10.0, 6.10.1, 6.10.2
- La versione da installare è **`6.10.2`** — ultima stabile, supporta il formato flat config tramite la proprietà `flatConfigs` del plugin

**Compatibilità**: `globals@^16.0.0` è già presente nei `devDependencies` di `package.json`. `eslint-plugin-jsx-a11y@6.10.2` non ha dipendenze su `globals` direttamente — compatibilità confermata.

**Comando di installazione** (pin esatto, senza caret `^` come prescritto dal design §3.7):
```
npm install --save-dev eslint-plugin-jsx-a11y@6.10.2
```

---

### AI2 — Contenuto attuale di `package.json`: versioni e plugin presenti

**Verifica eseguita**: lettura di `package.json`.

**`devDependencies` rilevanti già presenti**:

| Pacchetto | Versione dichiarata |
|---|---|
| `eslint` | `^9.28.0` |
| `typescript-eslint` | `^8.38.0` |
| `eslint-plugin-react-hooks` | `^5.2.0` |
| `eslint-plugin-react-refresh` | `^0.4.19` |
| `@eslint/js` | `^9.21.0` |
| `globals` | `^16.0.0` |

**`eslint-plugin-jsx-a11y`**: **NON presente** nei `devDependencies` — da installare nella Sotto-operazione 1.

**`"type": "module"`**: **presente** in `package.json` → `eslint.config.js` verrà trattato come ESModule e dovrà usare la sintassi `export default [...]` (non `module.exports`). Vedi design §8.

---

### AI3 — File `.eslintrc.*` residui: assenti

**Verifica eseguita**: ricerca nella root e nelle sottocartelle di file con pattern `.eslintrc.*`, `.eslintignore`.

**Risultato**:

- Nessun file `.eslintrc.js`, `.eslintrc.json`, `.eslintrc.cjs`, `.eslintrc.yaml`, `.eslintrc.yml` trovato.
- Nessun file `.eslintignore` trovato.
- Nessun `eslint.config.js` o `eslint.config.mjs` trovato.

**Decisione**: punto di partenza pulito. Non è necessaria nessuna rimozione prima di creare `eslint.config.js`.

---

### AI4 — Script `lint` in `package.json`

**Verifica eseguita**: lettura della sezione `scripts` di `package.json`.

**Valore esatto**: `"lint": "eslint ."` — nessun flag aggiuntivo (`--ext`, `--max-warnings`, `--fix`, ecc.).

**Compatibilità**: `eslint .` con ESLint 9 flat config è il formato corretto. Nessuna modifica allo script è necessaria.

---

### AI5 — Layer `ignores` per `dist/` e `node_modules/`

**Verifica eseguita**: conferma assenza di `.eslintignore` (già in AI3) e verifica del comportamento di ESLint 9 senza un layer `ignores` esplicito.

**Risultato**: ESLint 9 esclude automaticamente `node_modules/` per default, ma **non esclude `dist/`**. Senza il Layer 0, ESLint analizzerebbe la cartella `dist/` (quando presente), producendo segnalazioni rumorose sul codice compilato. Il Layer 0 con `ignores: ['dist/']` è necessario.

**Decisione**: il Layer 0 va dichiarato come primo oggetto dell'array in `eslint.config.js`, come da design §9. Per chiarezza esplicita, includere anche `node_modules/` anche se già escluso di default.

---

### AI6 — Baseline degli avvisi attesi: wrapper con `<div onClick>`

**Verifica eseguita**: ricerca di `<div` con `onClick` (multi-riga) in `src/components/`.

**Risultato**: trovati **2 file** con il pattern, entrambi relativi al sistema di navigazione liste:

| File | Riga | Pattern | Note |
|---|---|---|---|
| `src/components/DashboardTab.tsx` | 327 | `<div onClick={() => recentTransactionsNav.setFocusedIndex(index)}>` | Nessun `role`, nessun `onKeyDown` — questo è il bug §2 del report diagnostico |
| `src/components/TransactionsTab.tsx` | 119 | `<div onClick={() => allTransactionsNav.setFocusedIndex(index)}>` | Stesso pattern |

**Segnalazioni attese da jsx-a11y** su questi due `<div>`:
- `jsx-a11y/click-events-have-key-events` — elemento cliccabile privo di gestore da tastiera
- `jsx-a11y/no-noninteractive-element-interactions` — elemento `div` non interattivo con handler

Queste sono **segnalazioni corrette** (non falsi positivi): il problema è stato già identificato nel report diagnostico §2 come bug di navigazione da tastiera. Nella Fase A vengono emesse come `warn` — non blocca il lavoro. La correzione appartiene a un passo dedicato successivo.

Nessun altro file in `src/components/` presenta `<div onClick>` o `<span onClick>`. I componenti Radix UI usati nel progetto non generano segnalazioni perché jsx-a11y li vede come componenti opachi (confermato — design §3.6).

---

## Rischi

### R1 — Errori di parsing da `typescript-eslint` — 🔴 Alto

Se il riferimento a `tsconfig.json` non è configurato correttamente nel parser di `typescript-eslint`, il lint fallisce con errori "Parsing error: Cannot read file" o "Parsing error: tsconfig.json not found" su tutti i file TypeScript. L'exit code sarebbe diverso da 0 con errori di configurazione, non avvisi.

**Mitigazione**: nella Sotto-operazione 3, il Layer 2 deve riferirsi al file `tsconfig.json` nella root tramite il campo `project` delle opzioni del parser (percorso relativo dalla root: `'./tsconfig.json'`). Nella Sotto-operazione 4, il primo `npm run lint` verifica immediatamente l'assenza di questi errori prima di considerare il passo concluso.

### R2 — Log lint inutilizzabile per eccessivo numero di avvisi — 🔴 Alto

Se il primo `npm run lint` produce un numero molto elevato di avvisi (centinaia o migliaia), il log diventa difficile da leggere e perde utilità come strumento di controllo.

**Mitigazione**: nella Sotto-operazione 4, se il numero di avvisi è superiore a ~50, filtrare per regola (`npm run lint -- --format json`) per identificare se una singola regola domina il log. Se una regola produce più del 70% degli avvisi, abbassarla temporaneamente a `off` con un commento `// TODO P15-fase-B: rielaborare` nel file, senza disabilitarla globalmente. Documentare la regola interessata nella sezione "Baseline avvisi ESLint" di questo documento.

### R3 — Modifica accidentale di file sotto `src/` — 🔴 Alto

P15 non deve toccare nessun file sotto `src/`. Qualsiasi modifica a `src/` invaliderebbe la premessa del passo.

**Mitigazione**: `git status` al termine delle operazioni — nessun file sotto `src/` deve apparire come modificato.

### R4 — Falsi positivi da jsx-a11y su wrapper Radix — 🟡 Medio

I componenti Radix UI nativi non generano falsi positivi (jsx-a11y li vede come opachi). I wrapper personalizzati intorno a Radix potrebbero farlo, ma la verifica AI6 ha identificato solo i due `<div onClick>` in `DashboardTab.tsx` e `TransactionsTab.tsx` — che sono segnalazioni corrette, non falsi positivi.

**Mitigazione**: se emergono segnalazioni su altri componenti non attesi, valutare caso per caso. Il `// eslint-disable-next-line jsx-a11y/<regola>` con commento motivazionale è la soluzione puntuale; mai disabilitazione globale della regola.

### R5 — `exhaustive-deps` rivela bug latenti in hook — 🟡 Medio

La regola `react-hooks/exhaustive-deps` segnalerà l'oggetto `screenReader` in `App.tsx` come dipendenza instabile (già identificato nel report §3.4). La segnalazione è corretta e verrà emessa come `warn`. Non è un falso positivo.

**Mitigazione**: non correggere queste segnalazioni in questo passo. Documentarne il conteggio nella baseline.

### R6 — `eslint-plugin-react` installato per errore — 🟢 Basso

Il plugin `eslint-plugin-react` (diverso da `eslint-plugin-react-hooks`) non è necessario con React 19 + TypeScript. Installarlo per errore non causa rotture ma aggiunge un plugin non necessario e potrebbe produrre avvisi aggiuntivi non previsti.

**Mitigazione**: il comando di installazione della Sotto-operazione 1 installa **solo** `eslint-plugin-jsx-a11y@6.10.2` — nessun altro pacchetto.

---

## Passo unico — Ripristino ESLint e configurazione accessibilità

### Rischio prevalente: 🔴 Alto (R1, R2)
### Prerequisito: P01–P14 completati; branch `refactoring-architettura`

---

### Schema riepilogativo

```
Passo 15 — Ripristino ESLint e configurazione accessibilità
│
├── Sotto-operazione 1 — Installazione dipendenza
│   └── npm install --save-dev eslint-plugin-jsx-a11y@6.10.2
│
├── Sotto-operazione 2 — Ricognizione pre-operativa
│   └── Verifica AI1–AI6 sul repository reale
│
├── Sotto-operazione 3 — Creazione eslint.config.js
│   ├── Layer 0 — ignores (dist/, node_modules/)
│   ├── Layer 1 — @eslint/js recommended
│   ├── Layer 2 — typescript-eslint recommended
│   ├── Layer 3 — eslint-plugin-react-hooks recommended (warn)
│   ├── Layer 4 — eslint-plugin-react-refresh (warn)
│   └── Layer 5 — eslint-plugin-jsx-a11y flatConfigs.recommended (warn)
│
└── Sotto-operazione 4 — Verifica funzionale
    ├── npm run lint → exit code 0, nessun errore di configurazione
    ├── Documentazione baseline avvisi
    └── npm run build → deve continuare a passare
```

---

### Sotto-operazione 1 — Installazione di `eslint-plugin-jsx-a11y`

> **Eseguire prima della ricognizione pre-operativa (AI1 è già verificata sopra).**

Installare il plugin con pin esatto di versione, come prescritto dal design §3.7:

```
npm install --save-dev eslint-plugin-jsx-a11y@6.10.2
```

> ⚠️ **Pin esatto**: usare `@6.10.2` senza caret `^`. La versione 6.10.2 è l'ultima stabile con supporto flat config confermato (AI1). Non installare la versione `^6.x.x` nella prima installazione.

> ⚠️ **Nessun altro pacchetto**: il comando installa **solo** `eslint-plugin-jsx-a11y`. Non aggiungere `eslint-plugin-react` o altri plugin non previsti.

Dopo l'installazione, verificare:
- `package.json` → sezione `devDependencies` contiene `"eslint-plugin-jsx-a11y": "6.10.2"` (senza caret)
- `node_modules/eslint-plugin-jsx-a11y/` esiste e contiene `index.js`

**Verifica intermedia 1**: `package.json` riporta `eslint-plugin-jsx-a11y` in `devDependencies`; la cartella `node_modules/eslint-plugin-jsx-a11y/` esiste.

---

### Sotto-operazione 2 — Ricognizione pre-operativa

> **Eseguire dopo l'installazione, prima di creare `eslint.config.js`.**

Verificare che il branch corrente sia `refactoring-architettura`:
```
git branch --show-current
```
Atteso: `refactoring-architettura`

Verificare lo stato git:
```
git status
```
Atteso: solo `package.json` e `package-lock.json` come modificati (dall'installazione della Sotto-operazione 1). Nessun file sotto `src/` modificato.

Confermare assenza di file `.eslintrc.*` residui (confermato in AI3 — verificare nuovamente se il repository ha avuto commit nel frattempo):
```
Get-ChildItem -File | Where-Object { $_.Name -match "^\.eslintrc" -or $_.Name -eq ".eslintignore" }
```
Atteso: nessun output.

Confermare script `lint` (confermato in AI4):
```
(Get-Content package.json | ConvertFrom-Json).scripts.lint
```
Atteso: `eslint .`

Confermare `"type": "module"` (confermato in AI2):
```
(Get-Content package.json | ConvertFrom-Json).type
```
Atteso: `module`

Confermare che `eslint.config.js` non esiste ancora:
```
Test-Path eslint.config.js
```
Atteso: `False`

> **Nota baseline wrapper Radix** (AI6 confermata): esistono due `<div onClick>` senza `role` in `DashboardTab.tsx` (riga 327) e `TransactionsTab.tsx` (riga 119). Questi produrranno le prime segnalazioni di `jsx-a11y` — sono segnalazioni corrette (bug noto dal report §2), non falsi positivi. Non vanno corretti in questo passo.

**Verifica intermedia 2**: branch corretto; `package.json` e `package-lock.json` modificati; nessun file `.eslintrc.*` presente; script `lint` confermato; `"type": "module"` confermato; `eslint.config.js` assente.

---

### Sotto-operazione 3 — Creazione di `eslint.config.js`

> ⚠️ **Formato ESModule obbligatorio**: `package.json` ha `"type": "module"` (AI2) — usare `export default [...]`. Non usare `module.exports`.  
> ⚠️ **Solo flat config**: non creare file `.eslintrc.js`, `.eslintrc.json`, `.eslintignore` di nessun tipo (design §8, AI3).

Creare il file `eslint.config.js` nella root del progetto con i **5 layer nell'ordine prescritto** dal design §9:

**Layer 0 — Ignores globali**

Il primo oggetto dell'array deve dichiarare i percorsi esclusi dall'analisi ESLint. Include `dist/` (non escluso automaticamente da ESLint 9 — AI5) e `node_modules/` (già escluso di default ma dichiarato per esplicitezza):

```
ignores: ['dist/', 'node_modules/']
```

**Layer 1 — JavaScript di base (`@eslint/js`)**

Applica `js.configs.recommended` a tutti i file JavaScript e TypeScript del progetto. Include la definizione delle variabili globali browser (per evitare segnalazioni su `window`, `document`, `navigator`, ecc.) e globali ES2020. Usa il modulo `globals` già installato per fornire i set di globali.

```
...js.configs.recommended,
files: ['**/*.{js,ts,tsx}'],
languageOptions: {
  globals: { ...globals.browser, ...globals.es2020 }
}
```

**Layer 2 — TypeScript (`typescript-eslint`)**

Applica `tseslint.configs.recommended` ai soli file TypeScript e TypeScript+JSX di `src/`. Include il riferimento al `tsconfig.json` nella root per abilitare le regole che richiedono informazioni di tipo:

```
...tseslint.configs.recommended,
files: ['src/**/*.{ts,tsx}'],
languageOptions: {
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: import.meta.dirname
  }
}
```

> ⚠️ **R1 — parsing errors**: se il riferimento a `tsconfig.json` non risolve correttamente, il lint fallirà con errori di parsing. La Sotto-operazione 4 verificherà immediatamente questo punto.

**Layer 3 — React Hooks (`eslint-plugin-react-hooks`)**

Applica le regole `react-hooks/rules-of-hooks` e `react-hooks/exhaustive-deps` ai file `src/**/*.{ts,tsx}`. In Fase A, entrambe le regole sono in modalità `warn` (non `error`):

```
files: ['src/**/*.{ts,tsx}'],
plugins: { 'react-hooks': reactHooks },
rules: {
  'react-hooks/rules-of-hooks': 'warn',
  'react-hooks/exhaustive-deps': 'warn'
}
```

**Layer 4 — React Refresh (`eslint-plugin-react-refresh`)**

Applica la regola `react-refresh/only-export-components` con l'opzione `allowConstantExport: true` per gestire il pattern comune dove i file esportano costanti accanto ai componenti:

```
files: ['src/**/*.{ts,tsx}'],
plugins: { 'react-refresh': reactRefresh },
rules: {
  'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
}
```

**Layer 5 — Accessibilità (`eslint-plugin-jsx-a11y`)**

Applica `jsxA11y.flatConfigs.recommended` ai file `src/**/*.{ts,tsx}`. In Fase A, tutte le regole del preset recommended sono mantenute al livello `warn` per evitare blocchi sul codice esistente:

```
...jsxA11y.flatConfigs.recommended,
files: ['src/**/*.{ts,tsx}'],
rules: {
  ...jsxA11y.flatConfigs.recommended.rules,
  // Fase A: tutte le regole recommended in warn (non error)
  ...Object.fromEntries(
    Object.keys(jsxA11y.flatConfigs.recommended.rules).map(rule => [rule, 'warn'])
  )
}
```

**Verifica intermedia 3**: `eslint.config.js` esiste nella root; usa `export default [...]`; contiene i 5 layer nell'ordine descritto; non esistono file `.eslintrc.*` di nessun tipo.

---

### Sotto-operazione 4 — Verifica funzionale

> **Questa è la verifica di gate: se `npm run lint` produce errori di configurazione, il passo non è completato.**

**4.1 — Prima esecuzione di `npm run lint`**

```
npm run lint
```

Verificare l'output:

| Condizione | Azione |
|---|---|
| Avvio normale, avvisi visibili, exit code 0 | ✓ Proseguire |
| "Cannot find module" / "Plugin not found" | 🔴 Correggere il nome del plugin nell'import di `eslint.config.js` |
| "Parsing error: Cannot read file" / "tsconfig.json not found" | 🔴 Correggere il percorso `project` nel Layer 2 (R1) |
| "Configuration for rule is invalid" | 🔴 Verificare la sintassi del Layer incriminato |
| Exit code ≠ 0 per segnalazioni di regole | 🟡 Alcune regole sono ancora in `error` — abbassare a `warn` (Fase A) |
| Nessun output / nessun file analizzato | 🟡 Verificare il pattern `files` del Layer 1 |

> ⚠️ Non è accettabile concludere il passo con errori di configurazione anche se il lint "gira in parte". Exit code 0 con avvisi è l'unico stato accettabile per la Fase A.

> ⚠️ Se il log lint è dominato da centinaia di avvisi di un'unica regola (R2): identificare la regola, abbassarla a `off` con commento `// TODO P15-fase-B` nel Layer corrispondente, documentare nella sezione "Baseline avvisi ESLint" qui sotto.

**4.2 — Verifica `npm run build`**

```
npm run build
```

Atteso: build verde, come prima del passo. La creazione di `eslint.config.js` non deve influire sulla build Vite.

**4.3 — Verifica `git status`**

```
git status
```

File attesi come modificati o nuovi:
- `eslint.config.js` → `new file`
- `package.json` → `modified`
- `package-lock.json` → `modified`

Nessun file sotto `src/` deve apparire come modificato (R3).

**Verifica finale**: `npm run lint` exit code 0; `npm run build` verde; `git status` mostra solo i 3 file attesi.

## Baseline avvisi ESLint

> **Sezione compilata durante l'esecuzione della Sotto-operazione 4 — 24 aprile 2026.**  
> Conteggio basato su `npm run lint -- --format json`. Esecuzione con exit code 0, 0 errori, 59 warning.

| Regola | File interessati | Conteggio avvisi | Note |
|---|---|---|---|
| `jsx-a11y/click-events-have-key-events` | `DashboardTab.tsx`, `TransactionsTab.tsx` | 2 | Bug noto — §2 report diagnostico. `<div onClick>` senza gestore tastiera |
| `jsx-a11y/no-static-element-interactions` | `DashboardTab.tsx`, `TransactionsTab.tsx` | 2 | Bug noto — §2 report diagnostico. (Il design citava `no-noninteractive-element-interactions`; la regola effettivamente attivata è `no-static-element-interactions`) |
| `react-hooks/exhaustive-deps` | `TransactionDialog.tsx`, `AuthContext.tsx`, `use-app-shortcuts.ts` | 3 | Dipendenze mancanti in useEffect/useMemo; oggetti instabili |
| `@typescript-eslint/no-explicit-any` | `DashboardTab.tsx`, `DataManagement.tsx`, `IncomeExpenseChart.tsx`, `MonthlyComparisonChart.tsx`, `SavingsGoalCard.tsx`, `TalkBackSettings.tsx`, `sound-system.ts` | 7 | Abbassato a `warn` in Layer 2 (Fase A) |
| `@typescript-eslint/no-unused-vars` | 14 file (~`AccountDialog`, `BudgetDialog`, `DisplaySettings` ×9, `IncomeExpenseChart`, `MonthlyComparisonChart`, `PeriodSelector`, `TransactionsTab`, `CategoryManagement`, `DataManagement`, `SecuritySettings`, `budget-forecasting`, `budget-history`, `helpers`, `screen-reader`) | 28 | Variabili/import non usati; abbassato a `warn` in Layer 2 (Fase A) |
| `react-refresh/only-export-components` | `ui/badge.tsx`, `ui/button.tsx`, `ui/form.tsx`, `ui/navigation-menu.tsx`, `ui/sidebar.tsx`, `ui/toggle.tsx`, `AppDataContext.tsx`, `AuthContext.tsx` | 8 | File che esportano costanti accanto ai componenti React |
| `jsx-a11y/no-autofocus` | `AccountDialog.tsx`, `CategoryManagement.tsx`, `PinDialog.tsx`, `SecuritySettings.tsx`, `TransactionDialog.tsx` | 5 | Prop `autoFocus` in dialog — corretto per focus management ma segnalato |
| `jsx-a11y/no-noninteractive-tabindex` | `AppHeader.tsx` | 1 | `tabIndex` su elemento non interattivo |
| `jsx-a11y/anchor-has-content` | `src/components/ui/pagination.tsx` | 1 | Anchor senza contenuto accessibile |
| `jsx-a11y/control-has-associated-label` | `DataManagement.tsx` | 1 | Controllo form senza label associata |
| `prefer-const` | `IncomeExpenseChart.tsx` | 1 | Abbassato a `warn` in Layer 2 (Fase A) — `let` che non viene riassegnato |
| **TOTALE** | — | **59** | **0 errori, 59 warning.** Nessuna regola supera la soglia 50. Nessuna regola abbassata a `off`. |

> Nota deviazione dal piano: la regola `jsx-a11y/no-noninteractive-element-interactions` citata nel design non è stata attivata dal plugin — la regola effettivamente scattata sui `<div onClick>` è `jsx-a11y/no-static-element-interactions`. Semantica equivalente, regola diversa (entrambe nel preset recommended di jsx-a11y).

> Nota configurazione: `vite.config.ts` è stato aggiunto al Layer 0 ignores per evitare parsing error TypeScript fuori da `src/`. Le regole `@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any` e `prefer-const` sono state abbassate esplicitamente a `warn` nel Layer 2 per rispettare la strategia Fase A (exit code 0 obbligatorio).

---

## Criteri di verifica / Definition of Done

- [ ] `eslint-plugin-jsx-a11y@6.10.2` presente in `devDependencies` di `package.json`
- [ ] `eslint.config.js` esiste nella root del progetto
- [ ] `eslint.config.js` usa `export default [...]` (formato ESModule)
- [ ] `eslint.config.js` contiene i 5 layer nell'ordine: Layer 0 ignores, Layer 1 `@eslint/js`, Layer 2 `typescript-eslint`, Layer 3 `react-hooks`, Layer 4 `react-refresh`, Layer 5 `jsx-a11y`
- [ ] `npm run lint` si avvia senza errori di configurazione
- [ ] `npm run lint` termina con exit code 0 (nessun errore bloccante)
- [ ] Il conteggio degli avvisi baseline è documentato nella sezione "Baseline avvisi ESLint"
- [ ] `npm run build` continua a passare
- [ ] Nessun file sotto `src/` è stato modificato
- [ ] `git status` mostra solo `eslint.config.js` (new), `package.json` e `package-lock.json` (modified)
