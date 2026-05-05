# TODO Master — Zecchino

> Questo file coordina tutti i TODO specifici attivi nel progetto.
> Per i task di dettaglio, apri il file corrispondente in `docs/3 - todo lists/`.

## Come usare questo file

- Ogni riga rappresenta una **macro-attività** collegata a un file TODO specifico.
- Aggiorna lo stato qui quando il file specifico cambia fase.
- Non inserire task granulari in questo file: usa i file in `3 - todo lists/`.

## TODO attivi

| Feature / Sprint | File specifico | Stato | Priorità |
|---|---|---|---|
| P36 — Decommissioning Spark e cache offline read-only (Blocco 10: 10a rimozione @github/spark + 10b cache localStorage read-only) | `docs/3 - todo lists/P36-todo.md` | Validazione manuale residua | Alta |
| P37 — Correzioni Accessibilità WCAG 2.1 AA | `docs/3 - todo lists/P37-todo.md` | In corso | Alta |

---

## P37 — Correzioni Accessibilità WCAG 2.1 AA

**Data inserimento:** 2026-05-05
**Stato:** `[ ] In corso`
**Piano:** [docs/2 - coding plans/P37-coding-plan.md](2%20-%20coding%20plans/P37-coding-plan.md)
**Todo:** [docs/3 - todo lists/P37-todo.md](3%20-%20todo%20lists/P37-todo.md)
**Report analisi:** [docs/4 - reports/report-analisi-accessibilita-completa.md](4%20-%20reports/report-analisi-accessibilita-completa.md)

Correzioni ARIA derivate dall'analisi statica completa su 31 componenti (11 anomalie critiche, 21 minori). Tutte le correzioni usano attributi HTML/ARIA nativi e le API già presenti nel progetto — nessuna nuova dipendenza.

| Fase | Descrizione | Componenti |
|---|---|---|
| Fase 1 | Navigazione e focus — landmark `<main>`, griglia tipo conto e template budget accessibili da tastiera, focus iniziale dialogs | `OnboardingFlow.tsx`, `AccountDialog.tsx`, `BudgetDialog.tsx`, `SavingsGoalDialog.tsx` |
| Fase 2 | Barre di progresso e grafici — `role="progressbar"` con `aria-value*`, `role="img"` con `aria-label` descrittivo su grafici | `BudgetProgressCard.tsx`, `BudgetForecastCard.tsx`, `BudgetHistoryChart.tsx`, `MonthlyComparisonChart.tsx` |
| Fase 3 | Stati interattivi — `aria-pressed` su pulsanti toggle (filtri categoria, selezione periodo) | `DashboardTab.tsx`, `PeriodSelector.tsx` |
| Fase 4 | Anomalie minori — `aria-hidden` icone decorative, `aria-busy` su operazioni asincrone, pattern coerente messaggi errore in DOM | `AuthScreen.tsx`, `AppHeader.tsx`, e 11 altri componenti |

## TODO completati

| Feature / Sprint | File specifico | Completato il |
|---|---|---|
| P35 — Onboarding primo accesso Supabase [x] COMPLETATO (Blocco 9: OnboardingFlow completo, seed categorie via RPC, finalizzazione con onboarding_completed) | `docs/3 - todo lists/P35-todo.md` | 2026-05-04 |
| P32 — Migrazione PIN privato a Supabase [x] COMPLETATO (Blocco 8: bcrypt client-side, API definitiva AuthContext, rimozione dipendenze dirette in SecuritySettings) | `docs/3 - todo lists/P32-todo.md` | 2026-05-03 |
| P34 — Migrazione DataManagement a Supabase [x] COMPLETATO (Blocco 7: Fronte A one-shot Spark → Supabase + Fronte B export/import Supabase) | `docs/3 - todo lists/P34-todo.md` | 2026-05-03 |
| P27 — Migrazione AuthContext a Supabase Auth | `docs/3 - todo lists/P27-todo.md` | 2026-05-02 |
| P28 — Migrazione AppDataContext a Supabase | `docs/3 - todo lists/P28-todo.md` | 2026-05-02 |
| P33 — Migrazione CategoryManagement a useAppData() | `docs/3 - todo lists/P33-todo.md` | 2026-05-02 |
| P25 — Schema impostazioni_utente e campo cifrato | `docs/3 - todo lists/P25-todo.md` | 2026-05-01 |
| P29 — Migrazione useUserSettings e Preferenze UI | `docs/3 - todo lists/P29-todo.md` | 2026-05-03 |
| P31 — Migrazione UserPreferences SettingsTab (Display / Audio / Accessibilità) a Supabase | `docs/3 - todo lists/P31-todo.md` | 2026-05-03 |
| P30 — Migrazione `budgetPercentages` a `useState` [x] COMPLETATO (Blocco 6: rimossa l'ultima chiamata `useKV` da `AppDataContext.tsx`) | `docs/3 - todo lists/P30-todo.md` | 2026-05-03 |
| P26 — Strato di accesso dati Supabase | `docs/3 - todo lists/P26-todo.md` | 2026-05-01 |
| P24 — Architettura migrazione Spark→Supabase (documento di architettura, nessun file sorgente modificato) | — | 2026-04-28 |
| P23 — Bugfix BUG-01: bootstrap asincrono AuthContext + mock KV allineato | `docs/3 - todo lists/P23-todo.md` | 2026-04-28 |
| P22 — Bugfix BUG-04: loop infinito campo importo TransactionDialog | `docs/3 - todo lists/P22-todo.md` | 2026-04-27 |
| P21 — GitHub Actions CI: pipeline minimale | `docs/3 - todo lists/P21-todo.md` | 2026-04-25 |
| P20 — Lint Cleanup: azzeramento dei 56 warning ESLint | `docs/3 - todo lists/P20-todo.md` | 2026-04-25 |
| P19 — Introduzione Vitest e 5 smoke test | `docs/3 - todo lists/P19-todo.md` | 2026-04-24 |
| P18 — VisibleDataProvider fonte unica dati elaborati | `docs/3 - todo lists/P18-todo.md` | 2026-04-24 |
| Risoluzione P17 — fix navigazione frecce e accessibilità liste | `docs/3 - todo lists/P17-todo.md` | 2026-04-24 |
| Risoluzione P16 — vulnerabilità dipendenze | `docs/3 - todo lists/P16-todo.md` | 2026-04-24 |
| Ripristino P15 — ESLint e jsx-a11y | `docs/3 - todo lists/P15-todo.md` | 2026-04-24 |
| Pulizia P14 — root directory | `docs/3 - todo lists/P14-todo.md` | 2026-04-24 |
| Refactoring P13 — App.tsx finale | `docs/3 - todo lists/P13-todo.md` | 2026-04-23 |
| Refactoring P11 — AuthScreen | `docs/3 - todo lists/P11-todo.md` | 2026-04-23 |
| Refactoring P10 — AppHeader | `docs/3 - todo lists/P10-todo.md` | 2026-04-23 |
| Refactoring P09 — ReportsTab | `docs/3 - todo lists/P09-todo.md` | 2026-04-23 |
| Refactoring P08 — DashboardTab | `docs/3 - todo lists/P08-todo.md` | 2026-04-23 |
| Refactoring P07 — TransactionsTab | `docs/3 - todo lists/P07-todo.md` | 2026-04-23 |
| Refactoring P06 — use-app-shortcuts | docs/3 - todo lists/P06-todo.md | 2026-04-23 |
| Refactoring P05 — use-visible-data | `docs/3 - todo lists/P05-todo.md` | 2026-04-22 |
| Refactoring P01 — Context Split | `docs/3 - todo lists/P01-todo.md` | 2026-04-22 |

---

## Note operative

- **Nuovo TODO**: crea un file in `docs/3 - todo lists/todo-[nome].md`, poi aggiungi la riga nella tabella "attivi" qui sopra.
- **Chiusura TODO**: sposta la riga nella tabella "completati" con la data.
- **Blocco**: aggiungi `⚠️ BLOCKED` nella colonna Stato e spiega il motivo nel file specifico.
- **Prossimo passo di migrazione**: verificare la tabella "TODO attivi" per il prossimo pacchetto aperto.
