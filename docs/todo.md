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
| P25 — Schema impostazioni_utente e campo cifrato | `docs/3 - todo lists/P25-todo.md` | In corso — Code ✓ Validate ✓ | In attesa esecuzione SQL su Supabase | Alta (Blocco 1 — gatekeeper formale di tutti i blocchi successivi) |

## TODO completati

| Feature / Sprint | File specifico | Completato il |
|---|---|---|
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
