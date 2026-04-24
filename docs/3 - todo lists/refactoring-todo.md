# Refactoring Todo — `src/App.tsx`

> Todo generale di avanzamento del refactoring.  
> Obiettivo: ridurre `src/App.tsx` da ~1812 righe a ~70 righe di sola composizione.  
> Ramo di lavoro: `refactoring-architettura`  
>  
> Legenda stati: `[x]` completato · `[~]` in lavorazione · `[ ]` da iniziare

---

## Panoramica passi

| Passo | File prodotto | Stato |
|---|---|---|
| 1 | `src/context/AppDataContext.tsx` — stato KV dati | [x] |
| 2 | `src/context/AuthContext.tsx` — stato autenticazione | [x] |
| 3 | `src/context/AppDataContext.tsx` — handler CRUD | [x] |
| 4 | `src/context/AuthContext.tsx` — handler PIN | [x] |
| 5 | `src/hooks/use-visible-data.ts` — valori derivati | [~] |
| 6 | `src/hooks/use-app-shortcuts.ts` — shortcut tastiera | [ ] |
| 7 | `src/components/TransactionsTab.tsx` — tab movimenti | [ ] |
| 8 | `src/components/DashboardTab.tsx` — tab dashboard | [ ] |
| 9 | `src/components/ReportsTab.tsx` — tab report | [ ] |
| 10 | `src/components/AppHeader.tsx` — header sticky | [ ] |
| 11 | `src/components/AuthScreen.tsx` — schermata login | [ ] |
| 12 | `src/components/DialogsOverlay.tsx` — dialog modali | [x] |
| 13 | `src/App.tsx` — refactor finale (133 righe, gate automatici PASS) | [~] |

---

## Dettaglio per passo

### Passi 1–4 — Context Split (completati)

- [x] Passo 1 — `AppDataContext`: stato KV dati e safe wrappers
- [x] Passo 2 — `AuthContext`: stato autenticazione e PIN
- [x] Passo 3 — `AppDataContext`: handler CRUD (handleSave*, handleDelete*, toggle*, handleExport*, handleDismiss*, handleViewBudget)
- [x] Passo 4 — `AuthContext`: handler PIN (handleGlobalPinSubmit, handlePrivatePinSubmit)

📄 Coding plan: `docs/2 - coding plans/P01-coding-plan.md`  
📄 Todo specifico: `docs/3 - todo lists/P01-todo.md`

---

### Passo 5 — Hook valori derivati (in lavorazione)

- [~] Aggiungere tipo `AccountGroup` a `src/lib/types.ts`
- [ ] Creare `src/hooks/use-visible-data.ts` con 10 `useMemo`
- [ ] Verifica: `tsc --noEmit` senza errori, app invariata

📄 Design: `docs/1 - projects/P05-use-visible-data-design.md`  
📄 Coding plan: `docs/2 - coding plans/P05-coding-plan.md`  
📄 Todo specifico: `docs/3 - todo lists/P05-todo.md`

---

### Passo 6 — Hook shortcut tastiera

- [ ] Creare `src/hooks/use-app-shortcuts.ts`
- [ ] Estrarre i 15 `KeyboardShortcut` e la chiamata `useKeyboardShortcuts` da `App.tsx`
- [ ] Verifica: tutte le scorciatoie funzionano

---

### Passo 7 — Estrazione `TransactionsTab`

- [ ] Creare `src/components/TransactionsTab.tsx`
- [ ] Spostare JSX `TabsContent value="transactions"` (~righe 1241–1385 di App.tsx)
- [ ] Verifica: tab movimenti, export CSV, navigazione da tastiera

---

### Passo 8 — Estrazione `DashboardTab`

- [x] P08 — Estrazione `DashboardTab` — completato 2026-04-23

---

### Passo 9 — Estrazione `ReportsTab`

- [~] Implementazione completata; validazione manuale UI/accessibilità in attesa
- [x] Creare `src/components/ReportsTab.tsx`
- [x] Spostare JSX `TabsContent value="reports"` da `App.tsx`
- [~] Verifica: gate automatici completati; restano da eseguire i controlli manuali su card statistiche, grafici, budget, obiettivi risparmio e impostazioni

---

### Passo 10 — Estrazione `AppHeader`

- [~] Implementazione completata; validazione manuale UI/accessibilità in attesa
- [x] Creare `src/components/AppHeader.tsx`
- [x] Spostare JSX header sticky da `App.tsx`
- [~] Verifica: build produzione e controlli statici completati; restano da eseguire i controlli manuali su saldo, tooltip e keyboard help

---

### Passo 11 — Estrazione `AuthScreen`

- [~] Implementazione completata; validazione manuale UI/accessibilità in attesa
- [x] Creare `src/components/AuthScreen.tsx`
- [x] Spostare JSX schermata login dal ramo `!isAuthenticated` di `App.tsx`
- [~] Verifica: build produzione e controlli statici completati; restano da eseguire i flussi PIN e i controlli manuali accessibilità in ambiente interattivo

---

### Passo 12 — Estrazione `DialogsOverlay`

- [x] P12 — Estrazione `DialogsOverlay` — completato 2026-04-23

---

### Passo 13 — Refactor finale `App.tsx`

- [x] Ridurre `App.tsx` a 133 righe di sola composizione
- [~] Verifica completa end-to-end: login, CRUD, navigazione, scorciatoie, export
- [x] `tsc --noEmit` senza errori
- [x] Misurare righe finali di `App.tsx` (133 righe, nel range 120–160 del piano P13)

**Gate automatici P13:** `tsc --noEmit` PASS, `npm run build` PASS, nessun `useMemo` e nessun `useListNavigation` residuo in `src/App.tsx`.

**Stato attuale:** implementazione completata il 2026-04-23; validazione funzionale interattiva ancora da eseguire manualmente in browser.

## Completati recenti

- [x] P14 — Pulizia root directory — completato 2026-04-24
