# P21 — Coding Plan: GitHub Actions CI — Pipeline minimale

> Documento operativo.  
> Fase: Plan → Code  
> Pacchetto: 21 — Ottavo passo post-refactoring  
> Design di riferimento: `docs/1 - projects/P21-github-actions-ci-design.md`  
> Data: 2026-04-25

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P19, P20.
- ⚠️ **Perimetro stretto:** un solo file da creare (`.github/workflows/ci.yml`). Nessun file sorgente, nessun file di configurazione npm/vite/ts modificato.
- ⚠️ **File protetti SCF:** i file sotto `.github/instructions/`, `.github/agents/`, `.github/copilot-instructions.md`, `.github/AGENTS.md`, `.github/runtime/`, `.github/skills/`, `.github/prompts/`, `.github/changelogs/` non devono essere toccati in nessun caso.
- ⚠️ **Trigger:** `pull_request` verso `refactoring-architettura` con tipi `opened`, `synchronize`, `reopened`. Non usare `push`. Non aggiungere `main` come branch di destinazione.
- ⚠️ **Action ufficiali soltanto:** `actions/checkout@v4` e `actions/setup-node@v4`. Nessuna action di terze parti.
- ⚠️ **Versione Node.js:** `20` (LTS). Cache npm tramite parametro `cache: 'npm'` in `actions/setup-node`.
- ⚠️ **Ordine obbligatorio degli step:** checkout → setup-node → `npm ci` → `npm run lint` → `npm run build` → `npm run test:run`. Non invertire: lint prima perché è il più veloce, test per ultimo perché è il più lento (fail fast).

**File creati:**

| Categoria | File | Note |
|---|---|---|
| Workflow | `.github/workflows/ci.yml` | Creato da zero, nuova cartella |

**File invariati:**

| File / Area | Motivazione |
|---|---|
| `src/**` (tutti i file sorgente) | Nessuna modifica al codice applicativo |
| `package.json` | Script già presenti: `lint`, `build`, `test:run` |
| `vite.config.ts` | Invariato |
| `tsconfig.json` | Invariato |
| `vitest.config.ts` | Invariato |
| `eslint.config.js` | Invariato |
| `.github/instructions/` | Protetto da `framework-guard.instructions.md` |
| `.github/agents/` | Protetto da `framework-guard.instructions.md` |
| `.github/copilot-instructions.md` | Protetto da `framework-guard.instructions.md` |
| `.github/AGENTS.md` | Protetto da `framework-guard.instructions.md` |
| `.github/AGENTS-master.md` | Protetto da `framework-guard.instructions.md` |
| `.github/runtime/` | Protetto da `framework-guard.instructions.md` |
| `.github/skills/` | Protetto da `framework-guard.instructions.md` |
| `.github/prompts/` | Protetto da `framework-guard.instructions.md` |
| `.github/changelogs/` | Protetto da `framework-guard.instructions.md` |
| `.github/dependabot.yml` | Invariato |

---

## Schema riepilogativo delle operazioni

```
Passo 21 — GitHub Actions CI: pipeline minimale
│
└── Crea .github/workflows/ci.yml [unica operazione]
    │
    ├── name: CI — Lint, Build, Test
    ├── on: pull_request
    │   ├── branches: [refactoring-architettura]
    │   └── types: [opened, synchronize, reopened]
    └── jobs.ci
        ├── runs-on: ubuntu-latest
        │
        ├── Step 1 — actions/checkout@v4
        │   └── Scarica il codice del branch sorgente della PR sul runner
        │
        ├── Step 2 — actions/setup-node@v4
        │   ├── node-version: '20'
        │   ├── cache: 'npm'
        │   └── Installa Node.js 20 LTS; popola/usa la cache ~/.npm
        │
        ├── Step 3 — npm ci
        │   └── Installa le dipendenze esatte da package-lock.json (deterministico)
        │
        ├── Step 4 — npm run lint
        │   ├── Comando: eslint .
        │   └── Verifica: 0 problems (0 errors, 0 warnings)
        │
        ├── Step 5 — npm run build
        │   ├── Comando: tsc -b --noCheck && vite build
        │   └── Verifica: bundle produzione generato senza errori import/vite
        │
        └── Step 6 — npm run test:run
            ├── Comando: vitest run
            └── Verifica: 5 passed (test smoke P19)
```

---

## Ambiguità verificate

Le seguenti ambiguità sono state **verificate sul repository reale** sul branch `refactoring-architettura` con lettura diretta dei file sorgente prima della stesura di questo piano.

---

### AI1 — Esistenza di `.github/workflows/`

**Verifica eseguita:** `list_dir .github` + `file_search .github/workflows/**`

**Risultato:** la cartella `.github/workflows/` non esiste nel repository. La lista della cartella `.github/` mostra: `agents/`, `instructions/`, `changelogs/`, `prompts/`, `runtime/`, `skills/`, più i file `AGENTS.md`, `AGENTS-master.md`, `copilot-instructions.md`, `dependabot.yml`, `project-profile.md`, `.scf-manifest.json`, `.scf-registry-cache.json`.

**Implicazione:** P21 crea la cartella `workflows/` e il file `ci.yml` entrambi da zero. Non ci sono conflitti con file esistenti.

---

### AI2 — Script npm disponibili

**Verifica eseguita:** lettura `package.json`

**Script confermati:**

| Nome script | Comando effettivo |
|---|---|
| `lint` | `eslint .` |
| `build` | `tsc -b --noCheck && vite build` |
| `test:run` | `vitest run` |

**Nota sul comando `build`:** usa `--noCheck` per saltare il typechecking TypeScript completo — comportamento deliberato già presente in locale. Il workflow invoca questo stesso comando.

**Nota sul campo `engines`:** assente in `package.json`. La versione Node.js viene dedotta dalle dipendenze (vedi AI3).

---

### AI3 — Versione Node.js dedotta dalle dipendenze

**Verifica eseguita:** lettura `package.json` → sezione `devDependencies`

**Dipendenze determinanti:**
- `vitest ^4.1.5` → richiede Node.js ≥ 18
- `vite ^7.3.2` → richiede Node.js ≥ 18

**Scelta:** Node.js **20 LTS**. Motivazione:
- Soddisfa il requisito ≥ 18 di tutte le dipendenze
- È l'LTS attuale con supporto garantito fino ad aprile 2028 (maintenance)
- `crypto.subtle` disponibile nativamente senza configurazione aggiuntiva
- Node.js 18 sarebbe compatibile ma entra in end-of-life maintenance nel 2025

---

### AI4 — Compatibilità CI dei test P19

**Verifica eseguita:** lettura `vitest.config.ts` + lettura completa `src/test/setup.ts`

**Risultati:**

| Aspetto | Verifica | Compatibile CI |
|---|---|---|
| Environment | `jsdom` — implementazione Node.js pura, nessun browser | ✓ |
| `@github/spark/hooks` | `vi.mock(...)` in setup.ts — runtime Spark non richiesto | ✓ |
| `window.spark.kv` | Mock `vi.fn()` in setup.ts — funziona in jsdom | ✓ |
| `AudioContext` / `webkitAudioContext` | Classi mock in setup.ts — sostituisce Web Audio API | ✓ |
| `window.matchMedia` | Mock in setup.ts — jsdom non la implementa | ✓ |
| `navigator.vibrate` | Mock vuoto in setup.ts | ✓ |
| `crypto.subtle` | Nativo in Node.js 20 senza config aggiuntiva | ✓ |
| Variabili d'ambiente | Nessuna richiesta da `vitest.config.ts` né da setup.ts | ✓ |
| Cleanup post-test | `afterEach(() => { cleanup(); resetTestKvStore() })` | ✓ |

**Conclusione:** i cinque test smoke di P19 girano senza modifiche in CI. Non è necessario aggiungere variabili d'ambiente, secrets, o step di configurazione aggiuntivi al workflow.

---

### AI5 — Compatibilità con framework-guard

**Verifica eseguita:** lettura `.github/instructions/framework-guard.instructions.md`

**Componenti SCF protetti** (non toccati da P21):

| Componente | Toccato in P21 |
|---|---|
| `.github/instructions/` | No |
| `.github/agents/` | No |
| `.github/copilot-instructions.md` | No |
| `.github/AGENTS.md` | No |
| `.github/runtime/` | No |
| `.github/skills/` | No |
| `.github/prompts/` | No |
| `.github/changelogs/` | No |

**Conclusione:** `.github/workflows/` non è un componente del framework SCF. La cartella è nuova e non esiste nel repository. La guardia è soddisfatta: la modifica è esplicita, intenzionale, e circoscritta a un file di infrastruttura applicativa.

---

## Piano operativo dettagliato

### Step 1 — Checkout del codice (`actions/checkout@v4`)

**Action:** `actions/checkout@v4`  
**Perché è il primo step:** il runner è una macchina virtuale vuota. Senza il checkout, nessun file del repository è disponibile sul runner. Questo step scarica il codice del branch sorgente della pull request.

**Nessun parametro aggiuntivo richiesto:** il checkout del branch HEAD della PR è il comportamento predefinito di `actions/checkout`.

---

### Step 2 — Setup Node.js (`actions/setup-node@v4`)

**Action:** `actions/setup-node@v4`  
**Parametri:**
- `node-version: '20'` — installa Node.js 20 LTS (vedi AI3)
- `cache: 'npm'` — abilita la cache npm integrata nell'action; salva e ripristina `~/.npm` tra i run. La cache viene invalidata automaticamente quando cambia `package-lock.json`.

**Perché viene prima di `npm ci`:** il runner Ubuntu non ha Node.js preinstallato nella versione richiesta. Questo step garantisce che la versione corretta sia disponibile prima di qualsiasi comando npm.

**Nota sulla cache:** il primo run popola la cache (lento, ~60–90 secondi per `npm ci`). I run successivi usano la cache (rapido, ~10–15 secondi). Non è necessario aggiungere un step separato `actions/cache`: il supporto è integrato in `actions/setup-node`.

---

### Step 3 — Installazione dipendenze (`npm ci`)

**Comando:** `npm ci`  
**Perché `npm ci` e non `npm install`:** `npm ci` usa esclusivamente `package-lock.json` come fonte di verità, non aggiorna il lockfile, cancella sempre `node_modules` prima di installare, e fallisce esplicitamente se `package-lock.json` non è sincronizzato con `package.json`. In CI questo comportamento deterministico è obbligatorio.

**Prerequisito:** `package-lock.json` deve essere committato nel repository. È già presente sul branch `refactoring-architettura`.

---

### Step 4 — Lint (`npm run lint`)

**Comando effettivo:** `eslint .`  
**Perché è il quarto step (primo controllo di qualità):** è il più veloce dei tre controlli (~5–10 secondi). Principio fail-fast: se il lint fallisce, il job si ferma senza sprecare tempo su build e test.

**Atteso in CI:** `0 problems (0 errors, 0 warnings)` — la baseline di P20.

**Cosa verifica:** regole ESLint 9 flat config (`eslint.config.js`), incluse le regole TypeScript, react-hooks, react-refresh e jsx-a11y.

---

### Step 5 — Build (`npm run build`)

**Comando effettivo:** `tsc -b --noCheck && vite build`  
**Perché è il quinto step (secondo controllo):** è più lento del lint (~15–30 secondi). Viene dopo il lint perché ha senso verificare la build solo su codice già validato sintatticamente.

**Cosa verifica:** risoluzione dei riferimenti TypeScript (senza typechecking completo), risoluzione di tutti gli import, bundling Vite senza errori di dipendenze circolari o import non trovati.

**Nota:** `--noCheck` è il flag deliberato del progetto. Il workflow non aggiunge `npx tsc --noEmit` come step separato (fuori perimetro di P21).

---

### Step 6 — Test (`npm run test:run`)

**Comando effettivo:** `vitest run`  
**Perché è il sesto step (ultimo):** è il più lento dei tre controlli. Viene per ultimo perché il costo di avvio di jsdom + Vitest è superiore agli altri step, e l'ordine fail-fast garantisce che si arrivi ai test solo se lint e build sono già verdi.

**Atteso in CI:** `5 passed` (i cinque test smoke di P19). Vedi AI4 per la compatibilità confermata dell'ambiente CI.

**Nessuna configurazione aggiuntiva:** `vitest.config.ts` già dichiarato nel repository viene letto automaticamente da `vitest run`.

---

## Contenuto del file `ci.yml`

Il file completo da creare in `.github/workflows/ci.yml`:

```yaml
name: CI — Lint, Build, Test

on:
  pull_request:
    branches: [refactoring-architettura]
    types: [opened, synchronize, reopened]

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Test
        run: npm run test:run
```

---

## Tabella dei rischi

| Codice | Scenario | Probabilità | Impatto | Mitigazione |
|---|---|---|---|---|
| R1 | Primo run lento: cache npm fredda — `npm ci` richiede 60–90 secondi anziché 10–15 | Alta (sempre al primo run) | Basso (rallentamento una tantum, non indica un problema) | Atteso e normale; i run successivi saranno rapidi. Non intervenire. |
| R2 | Build fallisce in CI ma funziona in locale: dipendenza non dichiarata o path case-sensitive (Linux case-sensitive, Windows case-insensitive) | Bassa | Alto (blocca la PR) | Leggere il log CI: mostra esattamente file e riga dell'errore. Aggiungere la dipendenza esplicita in `package.json` o correggere il casing del path. |
| R3 | Test falliscono in CI ma passano in locale: timeout, ordine esecuzione, API non mockata | Molto bassa (tutti i mock sono già in `src/test/setup.ts`) | Alto (blocca la PR) | Leggere il log CI: mostra il test fallito con messaggio di asserzione. Aggiungere il mock mancante in `src/test/setup.ts` o aumentare il timeout. |

---

## Criteri di uscita — Definition of Done

- [ ] Il file `.github/workflows/ci.yml` esiste nel repository sul branch `refactoring-architettura`
- [ ] Il file contiene: `name: CI — Lint, Build, Test`
- [ ] Il file contiene il trigger `pull_request` con `branches: [refactoring-architettura]` e `types: [opened, synchronize, reopened]`
- [ ] Il file contiene `runs-on: ubuntu-latest`
- [ ] Il file contiene esattamente sei step nell'ordine: checkout → setup-node → `npm ci` → `npm run lint` → `npm run build` → `npm run test:run`
- [ ] `npm run lint` in locale → `0 problems` (invariato rispetto alla baseline P20)
- [ ] `npm run build` in locale → exit 0 (invariato)
- [ ] `npm run test:run` in locale → `5 passed` (invariato)
- [ ] Aprire una PR verso `refactoring-architettura`: il check "CI — Lint, Build, Test" appare nella sezione Checks
- [ ] Tutti e tre gli step (lint, build, test) risultano verdi nel log CI della PR
- [ ] Nessun file `src/**` modificato
- [ ] Nessun file protetto SCF modificato
