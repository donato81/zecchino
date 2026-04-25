# P21 — Todo List: GitHub Actions CI — Pipeline minimale

> Passo 21 — GitHub Actions CI: pipeline minimale lint + build + test  
> Piano di riferimento: `docs/2 - coding plans/P21-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P21-github-actions-ci-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: —  
> Data completamento: —

---

## Esito finale

- [ ] `.github/workflows/ci.yml` creato e presente nel repository
- [ ] Apertura PR verso `refactoring-architettura` → check "CI — Lint, Build, Test" visibile
- [ ] Tutti e tre gli step (lint, build, test) risultano verdi nel log CI
- [ ] Nessun file `src/**` modificato
- [ ] Nessun file `.github/instructions/**` o altro file SCF modificato

---

## Prima di iniziare

- [ ] Verificare: `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [ ] Verificare: `npm run test:run` → `5 passed`
- [ ] Leggere il coding plan completo `docs/2 - coding plans/P21-coding-plan.md`

---

## Creazione `.github/workflows/ci.yml`

- [ ] Creare la cartella `.github/workflows/` (non esiste — va creata)
- [ ] Creare il file `.github/workflows/ci.yml`
- [ ] Verificare: `name: CI — Lint, Build, Test`
- [ ] Verificare: trigger `pull_request` con `branches: [refactoring-architettura]`
- [ ] Verificare: tipi `opened`, `synchronize`, `reopened` tutti presenti
- [ ] Verificare: `runs-on: ubuntu-latest`
- [ ] Verificare: Step 1 — `actions/checkout@v4`
- [ ] Verificare: Step 2 — `actions/setup-node@v4` con `node-version: '20'` e `cache: 'npm'`
- [ ] Verificare: Step 3 — `run: npm ci`
- [ ] Verificare: Step 4 — `run: npm run lint`
- [ ] Verificare: Step 5 — `run: npm run build`
- [ ] Verificare: Step 6 — `run: npm run test:run`

---

## Verifica locale post-creazione

- [ ] `npm run lint` → `0 problems (0 errors, 0 warnings)` (invariato rispetto alla baseline P20)
- [ ] `npm run build` → exit 0 (invariato)
- [ ] `npm run test:run` → `5 passed` (invariato)
- [ ] Nessun file `src/**` modificato
- [ ] Nessun file protetto SCF modificato (`.github/instructions/`, `.github/agents/`, `.github/copilot-instructions.md`, `.github/AGENTS.md`, `.github/runtime/`, `.github/skills/`, `.github/prompts/`, `.github/changelogs/`)

---

## Verifica in GitHub Actions

- [ ] Aprire una PR verso `refactoring-architettura`
- [ ] Il workflow "CI — Lint, Build, Test" appare nella sezione Checks della PR
- [ ] Tutti e tre gli step risultano verdi (cerchio verde ✓)
- [ ] Log del lint: `0 problems (0 errors, 0 warnings)`
- [ ] Log dei test: `5 passed`

---

## Checklist gate finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| `.github/workflows/ci.yml` presente | File esistente | — | — |
| `name` workflow | `CI — Lint, Build, Test` | — | — |
| Trigger | `pull_request` su `refactoring-architettura` | — | — |
| Tipi trigger | `opened, synchronize, reopened` | — | — |
| Runner | `ubuntu-latest` | — | — |
| Node.js version | `20` | — | — |
| Cache npm | `cache: 'npm'` in setup-node | — | — |
| Step lint CI | verde ✓ | — | — |
| Step build CI | verde ✓ | — | — |
| Step test CI | verde ✓ (`5 passed`) | — | — |
| `npm run lint` locale | `0 problems` | — | — |
| `npm run build` locale | exit 0 | — | — |
| `npm run test:run` locale | `5 passed` | — | — |
| File `src/**` invariati | nessuna modifica | — | — |
| File SCF invariati | nessuna modifica | — | — |
