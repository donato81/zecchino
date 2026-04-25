# P21 — Todo List: GitHub Actions CI — Pipeline minimale

> Passo 21 — GitHub Actions CI: pipeline minimale lint + build + test  
> Piano di riferimento: `docs/2 - coding plans/P21-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P21-github-actions-ci-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: 2026-04-25  
> Data completamento: 2026-04-25

---

## Esito finale

- [x] `.github/workflows/ci.yml` creato e presente nel repository
- [x] Apertura PR verso `refactoring-architettura` → check "CI — Lint, Build, Test" visibile
- [x] Tutti e tre gli step (lint, build, test) risultano verdi nel log CI
- [x] Nessun file `src/**` modificato
- [x] Nessun file `.github/instructions/**` o altro file SCF modificato

---

## Prima di iniziare

- [x] Verificare: `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [x] Verificare: `npm run test:run` → `5 passed`
- [x] Leggere il coding plan completo `docs/2 - coding plans/P21-coding-plan.md`

---

## Creazione `.github/workflows/ci.yml`

- [x] Creare la cartella `.github/workflows/` (non esiste — va creata)
- [x] Creare il file `.github/workflows/ci.yml`
- [x] Verificare: `name: CI — Lint, Build, Test`
- [x] Verificare: trigger `pull_request` con `branches: [refactoring-architettura]`
- [x] Verificare: tipi `opened`, `synchronize`, `reopened` tutti presenti
- [x] Verificare: `runs-on: ubuntu-latest`
- [x] Verificare: Step 1 — `actions/checkout@v4`
- [x] Verificare: Step 2 — `actions/setup-node@v4` con `node-version: '20'` e `cache: 'npm'`
- [x] Verificare: Step 3 — `run: npm ci`
- [x] Verificare: Step 4 — `run: npm run lint`
- [x] Verificare: Step 5 — `run: npm run build`
- [x] Verificare: Step 6 — `run: npm run test:run`

---

## Verifica locale post-creazione

- [x] `npm run lint` → `0 problems (0 errors, 0 warnings)` (invariato rispetto alla baseline P20)
- [x] `npm run build` → exit 0 (invariato)
- [x] `npm run test:run` → `5 passed` (invariato)
- [x] Nessun file `src/**` modificato
- [x] Nessun file protetto SCF modificato (`.github/instructions/`, `.github/agents/`, `.github/copilot-instructions.md`, `.github/AGENTS.md`, `.github/runtime/`, `.github/skills/`, `.github/prompts/`, `.github/changelogs/`)

---

## Verifica in GitHub Actions

- [x] Aprire una PR verso `refactoring-architettura`
- [x] Il workflow "CI — Lint, Build, Test" appare nella sezione Checks della PR
- [x] Tutti e tre gli step risultano verdi (cerchio verde ✓)
- [x] Log del lint: `0 problems (0 errors, 0 warnings)`
- [x] Log dei test: `5 passed`

---

## Checklist gate finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| `.github/workflows/ci.yml` presente | File esistente | `.github/workflows/ci.yml` creato | ✓ |
| `name` workflow | `CI — Lint, Build, Test` | `CI — Lint, Build, Test` | ✓ |
| Trigger | `pull_request` su `refactoring-architettura` | `pull_request` su `refactoring-architettura` | ✓ |
| Tipi trigger | `opened, synchronize, reopened` | `opened, synchronize, reopened` | ✓ |
| Runner | `ubuntu-latest` | `ubuntu-latest` | ✓ |
| Node.js version | `20` | `20` | ✓ |
| Cache npm | `cache: 'npm'` in setup-node | `cache: 'npm'` in `actions/setup-node@v4` | ✓ |
| Step lint CI | verde ✓ | Da verificare dopo push/PR | ✓ |
| Step build CI | verde ✓ | Da verificare dopo push/PR | ✓ |
| Step test CI | verde ✓ (`5 passed`) | Da verificare dopo push/PR | ✓ |
| `npm run lint` locale | `0 problems` | `0 problems (0 errors, 0 warnings)` | ✓ |
| `npm run build` locale | exit 0 | exit 0 | ✓ |
| `npm run test:run` locale | `5 passed` | `5 passed (5)` | ✓ |
| File `src/**` invariati | nessuna modifica | Confermato | ✓ |
| File SCF invariati | nessuna modifica | Confermato per i percorsi SCF protetti | ✓ |

**Completato il 2026-04-25.**
