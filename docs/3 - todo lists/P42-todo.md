# P42 — Todo: Cleanup pre-migrazione React Native

> Pacchetto P42 — React Native Migration Cleanup
> Piano di riferimento: `docs/2 - coding plans/P42-coding-plan.md`
> Report di riferimento: `docs/4 - reports/report-analisi-migrazione-react-native.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-09
> Completato: —

---

## Esito finale

| Verifica | Stato |
|---|---|
| 103 file ELIMINA rimossi dal filesystem | [ ] |
| 40 pacchetti npm rimossi da `package.json` | [ ] |
| `npx tsc --noEmit` — nessun errore su file `src/lib/` TIENI | [ ] |
| `npm ls` — nessun pacchetto @radix-ui/* presente | [ ] |
| `git status` — nessun file VALUTA modificato | [ ] |
| `git diff --name-only HEAD \| grep ".github"` → output vuoto | [ ] |

---

## Prerequisiti — Prima di iniziare

> Non avviare la Fase 1 finché questi controlli non sono completati e documentati.

- [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P42-coding-plan.md`
- [ ] Leggere il report `docs/4 - reports/report-analisi-migrazione-react-native.md`
- [ ] Verificare di essere sul branch `refactoring-architettura`:
  ```
  git branch --show-current
  ```
- [ ] Capire la regola gate: errori tsc su file VALUTA sono ATTESI; errori su `src/lib/` TIENI NON sono attesi

### BL1 — Baseline TypeScript

- [ ] `npx tsc --noEmit` → documentare il numero N0 di errori prima di qualunque modifica
  > Esito BL1 tsc: N0 = ___ errori

### BL2 — Baseline file count

- [ ] Contare i file in `src/components/ui/`: dovrebbero essere 46
  ```
  Get-ChildItem src/components/ui/*.tsx | Measure-Object | Select-Object -ExpandProperty Count
  ```
  > Esito BL2: ___ file in ui/
- [ ] Contare i file in `src/components/` (escluso ui/): dovrebbero essere 36
  ```
  Get-ChildItem src/components/*.tsx | Measure-Object | Select-Object -ExpandProperty Count
  ```
  > Esito BL2: ___ file in components/

---

## FASE 1 — Intervento 1: `src/components/ui/` (46 file)

> Perimetro: solo `src/components/ui/*.tsx`. Non toccare nessun altro file.

### Passo 1 — Eliminazione file ui/

- [ ] **1.1** — Verificare l'elenco completo dei 46 file in `src/components/ui/` corrisponde a quello nel piano §5
- [ ] **1.2** — Eseguire la rimozione:
  ```bash
  git rm src/components/ui/*.tsx
  ```
- [ ] **1.3** — Verificare che la directory `src/components/ui/` sia ora vuota:
  ```
  Get-ChildItem src/components/ui/
  ```
  > Esito: directory vuota [ ]

#### Gate Fase 1

- [ ] `npx tsc --noEmit` → documentare errori
  > Esito Gate 1: ___ errori totali (N1)
- [ ] Verificare che nell'output errori NON compaia nessun file `src/lib/` o `src/lib/supabase/`
  > File TIENI in errore: nessuno [ ]

---

## FASE 2 — Intervento 2: `src/components/` (36 file)

> Perimetro: solo `src/components/*.tsx`. Non toccare file in subdirectory.

### Passo 2 — Eliminazione file components/

- [ ] **2.1** — Verificare l'elenco completo dei 36 file in `src/components/` corrisponde a quello nel piano §6
- [ ] **2.2** — Eseguire la rimozione:
  ```bash
  git rm src/components/*.tsx
  ```
- [ ] **2.3** — Verificare che nessun file `.tsx` rimanga in `src/components/` (solo la subdirectory vuota `ui/` è tollerata):
  ```
  Get-ChildItem src/components/ -File
  ```
  > Esito: nessun file .tsx [ ]
- [ ] **2.4** — Opzionale: rimuovere la directory `ui/` rimasta vuota:
  ```bash
  git rm -r src/components/ui/
  ```

#### Gate Fase 2

- [ ] `npx tsc --noEmit` → documentare errori
  > Esito Gate 2: ___ errori totali (N2, deve essere ≥ N1)
- [ ] Verificare che nell'output errori NON compaia nessun file `src/lib/`
  > File TIENI in errore: nessuno [ ]

---

## FASE 3 — Intervento 3: hook ELIMINA in `src/hooks/` (4 file)

> Perimetro: solo i 4 hook ELIMINA. NON toccare gli altri 8 hook classificati VALUTA.

### Passo 3 — Eliminazione hook ELIMINA

- [ ] **3.1** — Verificare che i seguenti hook esistano prima della rimozione:
  - [ ] `src/hooks/use-mobile.ts` esiste
  - [ ] `src/hooks/use-keyboard-shortcuts.ts` esiste
  - [ ] `src/hooks/use-app-shortcuts.ts` esiste
  - [ ] `src/hooks/use-list-navigation.ts` esiste
- [ ] **3.2** — Eseguire la rimozione (un comando per file per sicurezza):
  ```bash
  git rm src/hooks/use-mobile.ts
  git rm src/hooks/use-keyboard-shortcuts.ts
  git rm src/hooks/use-app-shortcuts.ts
  git rm src/hooks/use-list-navigation.ts
  ```
- [ ] **3.3** — Verificare che i seguenti hook VALUTA siano ancora presenti (NON eliminati):
  ```
  Get-ChildItem src/hooks/
  ```
  File attesi: `use-haptic.ts`, `use-online-status.ts`, `use-inactivity-timer.ts`, `use-screen-reader.ts`, `use-display-preferences.ts`, `use-user-settings.ts`, `use-visible-data.ts`, `use-talkback.ts`
  > Esito 3.3: 8 hook VALUTA ancora presenti [ ]

#### Gate Fase 3

- [ ] `npx tsc --noEmit` → documentare errori
  > Esito Gate 3: ___ errori totali (N3)
- [ ] Verificare che nell'output errori NON compaia nessun file `src/lib/`
  > File TIENI in errore: nessuno [ ]

---

## FASE 4 — Intervento 4: file radice `src/` (7 file)

> Perimetro: solo i 7 file elencati. `src/App.tsx` **non** va eliminato.

### Passo 4 — Eliminazione file radice

- [ ] **4.1** — Confermare che `src/App.tsx` NON è nell'elenco di eliminazione (è VALUTA — non toccarlo)
- [ ] **4.2** — Eseguire la rimozione:
  ```bash
  git rm src/main.tsx
  git rm src/ErrorFallback.tsx
  git rm src/index.css
  git rm src/main.css
  git rm src/styles/theme.css
  git rm src/lucide-react.d.ts
  git rm src/vite-end.d.ts
  ```
- [ ] **4.3** — Verificare che `src/App.tsx` sia ancora presente:
  ```
  Test-Path src/App.tsx
  ```
  > Esito 4.3: True [ ]
- [ ] **4.4** — Verificare che `src/styles/` sia ora vuota (solo `theme.css` era presente):
  ```
  Get-ChildItem src/styles/
  ```
  > Esito 4.4: directory vuota o da rimuovere [ ]

#### Gate Fase 4

- [ ] `npx tsc --noEmit` → documentare errori
  > Esito Gate 4: ___ errori totali (N4)
- [ ] Verificare che nell'output errori NON compaia nessun file `src/lib/`
  > File TIENI in errore: nessuno [ ]

---

## FASE 5 — Intervento 5: `src/lib/utils.ts` (1 file)

> Perimetro: solo `src/lib/utils.ts`. NON toccare altri file in `src/lib/`.

### Passo 5 — Eliminazione utils.ts

- [ ] **5.1** — Verificare che il file contenga solo la funzione `cn()` basata su `clsx` + `tailwind-merge`
- [ ] **5.2** — Verificare che nessun file TIENI importi `utils.ts`:
  ```
  Select-String -Path "src/lib/types.ts","src/lib/budget-history.ts","src/lib/budget-forecasting.ts" -Pattern "utils"
  ```
  > Esito 5.2: nessun match [ ]
- [ ] **5.3** — Eseguire la rimozione:
  ```bash
  git rm src/lib/utils.ts
  ```

#### Gate Fase 5

- [ ] `npx tsc --noEmit` → documentare errori
  > Esito Gate 5: ___ errori totali (N5)
- [ ] Verificare che nell'output errori NON compaia nessun file `src/lib/` (tranne per l'import rimosso di utils.ts da file VALUTA — atteso)
  > File TIENI in errore: nessuno [ ]

---

## FASE 6 — Intervento 6: `src/test/` (9 file)

> Perimetro: tutta la directory `src/test/`. Rimozione integrale.

### Passo 6 — Eliminazione directory test

- [ ] **6.1** — Verificare l'elenco completo dei file in `src/test/`:
  ```
  Get-ChildItem -Recurse src/test/ -File | Select-Object FullName
  ```
  File attesi (9): `setup.ts`, `smoke/01`, `smoke/02`, `smoke/03`, `smoke/04`, `smoke/05`, `smoke/test-utils.ts`, `unit/cache.test.ts`, `unit/use-online-status.test.ts`
  > Esito 6.1: ___ file trovati
- [ ] **6.2** — Eseguire la rimozione:
  ```bash
  git rm -r src/test/
  ```
- [ ] **6.3** — Verificare che la directory `src/test/` non esista più:
  ```
  Test-Path src/test/
  ```
  > Esito 6.3: False [ ]

#### Gate Fase 6

- [ ] `npx tsc --noEmit` → documentare errori
  > Esito Gate 6: ___ errori totali (N6, può diminuire rispetto a N5 se i test portavano errori)
- [ ] Verificare che nell'output errori NON compaia nessun file `src/lib/`
  > File TIENI in errore: nessuno [ ]

---

## FASE 7 — Intervento 7: dipendenze npm (40 pacchetti)

> **Prerequisito critico:** le Fasi 1–6 devono essere TUTTE completate prima di questa fase.

### Passo 7a — Rimozione dipendenze (dependencies)

- [ ] **7a.1** — Eseguire rimozione tutti i pacchetti @radix-ui e librerie web:
  ```bash
  npm uninstall \
    tailwind-merge clsx class-variance-authority recharts lucide-react \
    vaul cmdk embla-carousel-react input-otp react-resizable-panels next-themes \
    @radix-ui/colors \
    @radix-ui/react-accordion \
    @radix-ui/react-alert-dialog \
    @radix-ui/react-aspect-ratio \
    @radix-ui/react-avatar \
    @radix-ui/react-checkbox \
    @radix-ui/react-collapsible \
    @radix-ui/react-context-menu \
    @radix-ui/react-dialog \
    @radix-ui/react-dropdown-menu \
    @radix-ui/react-hover-card \
    @radix-ui/react-label \
    @radix-ui/react-menubar \
    @radix-ui/react-navigation-menu \
    @radix-ui/react-popover \
    @radix-ui/react-progress \
    @radix-ui/react-radio-group \
    @radix-ui/react-scroll-area \
    @radix-ui/react-select \
    @radix-ui/react-separator \
    @radix-ui/react-slider \
    @radix-ui/react-slot \
    @radix-ui/react-switch \
    @radix-ui/react-tabs \
    @radix-ui/react-toggle \
    @radix-ui/react-toggle-group \
    @radix-ui/react-tooltip
  ```
  > Esito 7a.1: npm uninstall exit 0 [ ]

### Passo 7b — Rimozione devDependencies testing

- [ ] **7b.1** — Eseguire rimozione dipendenze testing:
  ```bash
  npm uninstall --save-dev \
    @testing-library/react \
    @testing-library/jest-dom \
    @testing-library/user-event
  ```
  > Esito 7b.1: npm uninstall exit 0 [ ]

### Passo 7c — Verifica package.json

- [ ] **7c.1** — Aprire `package.json` e verificare che nessuna delle seguenti chiavi compaia in `dependencies` o `devDependencies`:
  - [ ] Nessun `@radix-ui/*`
  - [ ] `tailwind-merge` assente
  - [ ] `clsx` assente
  - [ ] `class-variance-authority` assente
  - [ ] `recharts` assente
  - [ ] `lucide-react` assente
  - [ ] `vaul`, `cmdk`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `next-themes` assenti
  - [ ] `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` assenti

#### Gate Fase 7

- [ ] `npm ls` → verifica che nessun `@radix-ui/*` compaia come dipendenza diretta
  > Esito Gate 7a: nessun @radix-ui diretto [ ]
- [ ] `npx tsc --noEmit` → errori residui su file VALUTA attesi; nessun errore su `src/lib/` TIENI
  > Esito Gate 7b: file TIENI in errore: nessuno [ ]

---

## Riepilogo conteggio file rimossi

| Fase | Target | File |
|---|---|---|
| FASE 1 | `src/components/ui/` | 46 |
| FASE 2 | `src/components/` | 36 |
| FASE 3 | `src/hooks/` (ELIMINA) | 4 |
| FASE 4 | `src/` (radice) | 7 |
| FASE 5 | `src/lib/utils.ts` | 1 |
| FASE 6 | `src/test/` | 9 |
| **TOTALE** | | **103** |
| FASE 7 | npm packages | 40 |
